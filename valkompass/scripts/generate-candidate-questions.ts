/**
 * Genererar kandidatfrågor för valkompassgranskning.
 *
 * Arkitektur: Claude bedömer semantisk oenighet och genererar neutrala frågor.
 * positionValue-stdDev används INTE som filter — alla partipositioner är +1/+2
 * sett från partiets eget perspektiv. Istället litar vi på Claudes förmåga att
 * identifiera reella politiska skillnader utifrån frågetext och källcitat.
 *
 * Alla frågor sparas som PENDING och kräver manuell granskning.
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import * as fs   from "fs";
import * as path from "path";
import { createClient } from "../lib/createClient";

const prisma    = createClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_PER_TOPIC = 6;
const DELAY_MS      = 1300;

const TARGET_TOPICS = [
  { slug: "migration",        label: "Migration och integration" },
  { slug: "ekonomi",          label: "Ekonomi" },
  { slug: "lag_ordning",      label: "Lag och ordning" },
  { slug: "klimat",           label: "Klimat och miljö" },
  { slug: "skola",            label: "Skola och utbildning" },
  { slug: "energi",           label: "Energi" },
  { slug: "försvar",          label: "Försvar och säkerhet" },
  { slug: "skatter",          label: "Skatter" },
  { slug: "jobb",             label: "Jobb och arbetsmarknad" },
  { slug: "bostäder",         label: "Bostäder" },
  { slug: "vård",             label: "Vård och omsorg" },
  { slug: "socialförsäkring", label: "Socialförsäkring och välfärd" },
  { slug: "eu",               label: "EU och utrikespolitik" },
  { slug: "jämställdhet",     label: "Jämställdhet" },
  { slug: "landsbygd",        label: "Landsbygd" },
];

type PositionRow = {
  id: string; partyId: string; shortName: string;
  specificQuestion: string; positionValue: number | null; sourceQuote: string;
};

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function normalizeText(s: string) {
  return s.toLowerCase().replace(/[^a-zåäö0-9\s]/g, "").replace(/\s+/g, " ").trim();
}
function jaccardSim(a: string, b: string): number {
  const sA = new Set(normalizeText(a).split(" ").filter(w => w.length > 2));
  const sB = new Set(normalizeText(b).split(" ").filter(w => w.length > 2));
  const inter = [...sA].filter(w => sB.has(w)).length;
  const union = new Set([...sA, ...sB]).size;
  return union === 0 ? 0 : inter / union;
}

async function generateForTopic(
  topicLabel: string,
  positions:  PositionRow[],
): Promise<string[]> {
  // Numrerade positioner — inga CUIDs
  const formatted = positions.map((p, i) =>
    `[${i + 1}] ${p.shortName}: ${p.specificQuestion}\n    "${p.sourceQuote.slice(0, 180)}"`
  ).join("\n\n");

  const prompt =
`Du bygger en källbaserad svensk valkompass inför riksdagsvalet 2026.

Nedan finns godkända partipositioner om ämnet "${topicLabel}".

${formatted}

UPPGIFT: Generera upp till ${MAX_PER_TOPIC} neutrala valkompassfrågor.

Varje fråga ska:
• Börja med "Bör" eller "Ska" (max 15 ord, enkel svenska)
• Vara en genuin politisk skiljelinje — partier har VERKLIGT OLIKA syn
• Vara neutral, utan värdeladdade ord
• Gå att svara Ja/Nej/Vet ej av en genomsnittsväljare

Undvik:
• Frågor där alla partier i praktiken är eniga (t.ex. "Bör vi ha bra skolor?")
• Mer än en fråga om precis samma aspekt
• Teknisk eller byråkratisk terminologi

Returnera BARA en JSON-array med frågesträngar — inga kommentarer:
["Bör ...", "Ska ...", ...]

Om inga genuina meningsskillnader finns: returnera [].`;

  let raw = "";
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6", max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });
    raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  } catch (e) {
    console.error("    API-fel:", e);
    return [];
  }

  const match = raw.match(/\[[\s\S]*?\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch { return []; }
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);

  const partiesDb = await prisma.party.findMany({ select: { id: true, shortName: true } });
  const pName     = Object.fromEntries(partiesDb.map(p => [p.id, p.shortName]));
  const PARTY_ORDER = ["socialdemokraterna","vansterpartiet","kristdemokraterna",
                       "liberalerna","sverigedemokraterna","centerpartiet","miljopartiet","moderaterna"];

  // Hämta alla APPROVED positioner
  const allPos = await prisma.position.findMany({
    where:  { reviewStatus: "APPROVED" },
    select: { id: true, partyId: true, topic: true, specificQuestion: true,
              positionValue: true, sourceQuote: true },
  });
  console.log(`Hämtade ${allPos.length} APPROVED positioner.\n`);

  const byTopic = new Map<string, PositionRow[]>();
  for (const p of allPos) {
    if (!byTopic.has(p.topic)) byTopic.set(p.topic, []);
    byTopic.get(p.topic)!.push({ ...p, shortName: pName[p.partyId] ?? p.partyId });
  }

  const usedTexts: string[] = [];
  const allCreated: {
    questionId: string; questionText: string; topic: string;
    partyIds: string[]; posCount: number;
  }[] = [];

  let totalCreated = 0, totalSkipped = 0;

  console.log("═".repeat(66));
  console.log("GENERERAR KANDIDATFRÅGOR PER ÄMNE");
  console.log("═".repeat(66) + "\n");

  for (const { slug, label } of TARGET_TOPICS) {
    const positions = byTopic.get(slug) ?? [];
    if (positions.length < 2) {
      console.log(`  [${slug.padEnd(18)}] ${String(positions.length).padStart(3)} pos — hoppar`);
      continue;
    }

    const partyCount = new Set(positions.map(p => p.partyId)).size;
    if (partyCount < 2) {
      console.log(`  [${slug.padEnd(18)}] ${String(positions.length).padStart(3)} pos / ${partyCount} parti — hoppar`);
      continue;
    }

    process.stdout.write(`  [${slug.padEnd(18)}] ${String(positions.length).padStart(3)} pos, ${partyCount} partier → Claude... `);
    await delay(DELAY_MS);

    const questionTexts = await generateForTopic(label, positions);
    let topicCreated = 0;

    for (const qt of questionTexts) {
      if (!qt || typeof qt !== "string") continue;
      if (!/^(bör|ska)\b/i.test(qt.trim())) continue;  // måste börja rätt
      if (qt.split(" ").length > 20) continue;           // för lång

      if (usedTexts.some(t => jaccardSim(t, qt) > 0.60)) {
        totalSkipped++;
        continue;
      }

      const question = await prisma.question.create({
        data: {
          topic:        slug,
          questionText: qt.trim(),
          description:  `${partyCount} partier representerade · ${label}`,
          reviewStatus: "PENDING",
        },
      });

      // Länka ALLA positioner för detta topic — varje parti kan sedan svara på frågan
      for (const pos of positions) {
        await prisma.questionPosition.upsert({
          where:  { questionId_positionId: { questionId: question.id, positionId: pos.id } },
          create: { questionId: question.id, positionId: pos.id },
          update: {},
        });
      }

      usedTexts.push(qt.trim());
      allCreated.push({
        questionId:   question.id,
        questionText: qt.trim(),
        topic:        slug,
        partyIds:     [...new Set(positions.map(p => p.partyId))],
        posCount:     positions.length,
      });
      topicCreated++;
      totalCreated++;
    }

    console.log(`${String(topicCreated).padStart(2)} frågor`);
  }

  // ── Statistik ──────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(66));
  console.log("STATISTIK");
  console.log("═".repeat(66));
  console.log(`\nTotalt skapade:     ${totalCreated} kandidatfrågor (PENDING)`);
  console.log(`Hoppade (duplikat): ${totalSkipped}`);

  const topicDist: Record<string, number> = {};
  for (const q of allCreated) topicDist[q.topic] = (topicDist[q.topic] ?? 0) + 1;

  console.log("\nÄmnesfördelning:");
  for (const { slug, label } of TARGET_TOPICS) {
    const n = topicDist[slug] ?? 0;
    const bar = n > 0 ? " " + "█".repeat(n) : "";
    console.log(`  ${label.padEnd(36)} ${String(n).padStart(2)}${bar}`);
  }

  // Partiförekomst (alla partier i topic-positioner)
  const pCount: Record<string, number> = {};
  for (const q of allCreated) for (const p of q.partyIds) pCount[p] = (pCount[p] ?? 0) + 1;

  console.log("\nFrågor per parti (antal frågor där partiet har min. 1 position):");
  for (const pId of PARTY_ORDER) {
    const n   = pCount[pId] ?? 0;
    const bar = "█".repeat(n);
    console.log(`  ${(pName[pId] ?? pId).padEnd(22)} ${String(n).padStart(3)}  ${bar}`);
  }

  const avgP = allCreated.reduce((s, q) => s + q.partyIds.length, 0) / (allCreated.length || 1);
  console.log(`\nGenomsnittligt antal partier/fråga: ${avgP.toFixed(1)}`);

  const few = allCreated.filter(q => q.partyIds.length < 3).length;
  console.log(`Frågor med <3 partier:              ${few}  (bör granskas noga)`);
  console.log(`Frågor med ≥3 partier:              ${totalCreated - few}`);

  // ── Markdown-export ────────────────────────────────────────────────────────
  const outDir  = path.join(__dirname, "../exports");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `candidate-questions-${today}.md`);

  const lines: string[] = [];
  lines.push(`# Kandidatfrågor — Valkompass ${today}`);
  lines.push(`> **${totalCreated} kandidatfrågor · alla PENDING**`);
  lines.push(`> Genererade av Claude Sonnet 4.6 från ${allPos.length} APPROVED partipositioner.`);
  lines.push(`> Granska varje fråga. Godkänn inte automatiskt. Publika valkompassen genereras inte förrän frågor är APPROVED.`);
  lines.push("");

  lines.push("## Ämnesfördelning");
  lines.push("");
  for (const { slug, label } of TARGET_TOPICS) {
    const n = topicDist[slug] ?? 0;
    lines.push(n > 0 ? `- **${label}**: ${n}` : `- ~~${label}~~: 0 frågor`);
  }
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("## Instruktion till ChatGPT");
  lines.push("");
  lines.push(`Du granskar ${totalCreated} kandidatfrågor för en källbaserad svensk valkompass.`);
  lines.push("Frågorna ska vara neutrala, korta och fånga verkliga politiska skiljelinjer.");
  lines.push("");
  lines.push("Svara för varje fråga med ett av:");
  lines.push("- **GODKÄNN** — question_id");
  lines.push("- **ÄNDRA OCH GODKÄNN** — question_id, ny frågetext");
  lines.push("- **AVVISA** — question_id, orsak");
  lines.push("");
  lines.push("Undvik frågor om trivialiteter som alla partier är eniga om (t.ex. 'Bör Sverige ha bra skolor?').");
  lines.push("Prioritera frågor som verkligen skiljer partierna åt.");
  lines.push("");
  lines.push("---");
  lines.push("");

  const byTopicOut: Record<string, typeof allCreated> = {};
  for (const q of allCreated) { if (!byTopicOut[q.topic]) byTopicOut[q.topic] = []; byTopicOut[q.topic].push(q); }

  let qNum = 0;
  for (const { slug, label } of TARGET_TOPICS) {
    const qs = byTopicOut[slug];
    if (!qs?.length) continue;
    lines.push(`## ${label} (${qs.length})`);
    lines.push("");
    for (const q of qs) {
      qNum++;
      lines.push(`### Fråga ${qNum}`);
      lines.push(`**question_id**: \`${q.questionId}\``);
      lines.push(`**frågetext**: ${q.questionText}`);
      lines.push(`**partier med godkända positioner**: ${q.partyIds.map(p => pName[p] ?? p).join(", ")}`);
      lines.push("");
      // Visa partiernas faktiska frågor inom ämnet
      const topicPos = (byTopic.get(slug) ?? []).filter(p => q.partyIds.includes(p.partyId));
      for (const pos of topicPos) {
        lines.push(`- **${pos.shortName}**: ${pos.specificQuestion}`);
      }
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  lines.push(`*Slut — ${totalCreated} kandidatfrågor · ${today}*`);
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");

  console.log(`\nMarkdown-export: ${outPath}`);
  console.log(`Rader: ${lines.length}`);
  console.log("\nNästa steg:");
  console.log("  1. Skicka exports/candidate-questions-*.md till ChatGPT");
  console.log("  2. Applicera granskning med apply-review-questions.ts");

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
