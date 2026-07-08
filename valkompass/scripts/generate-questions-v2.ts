/**
 * Frågegenerering v2 — semantisk klustring av positioner.
 *
 * Skillnad mot v1:
 *   V1: Generera frågor → länka ALLA positioner i ämnet till varje fråga.
 *   V2: Klustra positioner semantiskt → generera frågor PER KLUSTER → länka
 *       bara de positioner som faktiskt ingår i klustret.
 *
 * Resultat: frågorna kopplas bara till partier som faktiskt har en direkt
 * relevant position, inte till hela ämnesklustret.
 *
 * Alla nya frågor sparas som PENDING för ChatGPT-granskning.
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import * as fs   from "fs";
import * as path from "path";
import { createClient } from "../lib/createClient";

const prisma    = createClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DELAY_MS              = 1400;
const MIN_PARTIES_THRESHOLD = 2;
const STRONG_PARTIES        = 3;
const JACCARD_DEDUP_THRESH  = 0.55; // lite lägre än v1 (0.60) — fler ämnen, mer variation

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

const PARTY_ORDER = [
  "socialdemokraterna","vansterpartiet","kristdemokraterna",
  "liberalerna","sverigedemokraterna","centerpartiet","miljopartiet","moderaterna",
];

type PositionRow = {
  id: string; partyId: string; shortName: string;
  specificQuestion: string; sourceQuote: string;
};

type ClusterRaw = {
  question:         string;
  position_indices: number[];
  yes_leaning?:     string[];
  no_leaning?:      string[];
  reasoning:        string;
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

// ── Klustra positioner semantiskt för ett ämne ────────────────────────────────
async function clusterPositionsForTopic(
  topicLabel: string,
  positions:  PositionRow[],
): Promise<ClusterRaw[]> {
  const pList = positions.map((p, i) =>
    `[${i + 1}] ${p.shortName}: "${p.specificQuestion}"\n    Citat: "${p.sourceQuote.slice(0, 150).replace(/\n/g, " ")}"`
  ).join("\n\n");

  const prompt =
`Du bygger en valkompass för riksdagsvalet 2026.

Nedan finns godkända partipositioner om ämnet "${topicLabel}". Varje position representerar partiets ståndpunkt — ett partis position är alltid "för" sin egna politik.

UPPGIFT: Identifiera SEMANTISKA KLUSTER — grupper av positioner som handlar om SAMMA politiska dimension, alltså frågor där partierna faktiskt har tydligt skilda ståndpunkter.

VAD ÄR EN BRA POLITISK DIMENSION:
• En konkret politisk skiljelinje där partierna landar på OLIKA sidor (inte trivial konsensus)
• Täcker positioner från MINST 2 partier som DIREKT är relevanta
• Kan formuleras som neutral "Bör/Ska"-fråga (max 15 ord)
• Tillräckligt bred för att täcka flera liknande positioner, men inte så bred att den blir meningslös

ABSTRAKTIONSNIVÅ:
• Inte för smal: "Bör ett veterancentrum inrättas?" (om bara ett parti har exakt den positionen)
• Inte för bred: "Bör Sverige ha bra politik?" (alla eniga)
• Rätt: "Bör försvarsanslagen ökas kraftigt?" (om SD, M, KD säger ja och V/MP säger nej)

VIKTIGT — hur klustringsmatchning fungerar:
• En position om "restriktiv migrationspolitik" och en om "skärpta utvisningsregler" handlar om SAMMA dimension
• En position om "höjd kapitalskatt" och en om "sänkt kapitalskatt" är DIREKT kopplade till samma dimension (man är emot den andres policy)
• En position om "kärnkraft" och en om "vindkraft" kan vara på SAMMA energidimension om de speglar en politisk skiljelinje

Returnera JSON-array. Varje objekt:
{
  "question": "Bör ...",           // neutral fråga, max 15 ord, börjar med Bör/Ska
  "position_indices": [2, 5, 8],   // 1-baserade index ur listan nedan
  "yes_leaning": ["SD", "M"],      // partier vars position innebär JA på frågan (kan vara tom)
  "no_leaning": ["V", "MP"],       // partier vars position innebär NEJ på frågan (kan vara tom)
  "reasoning": "..."               // 1–2 meningar om varför dessa hör ihop
}

Regler:
• Varje positions-index får finnas i HÖGST ett kluster
• Positioner som inte passar in i något kluster — hoppa över dem
• Prioritera kluster med 3+ partier
• Om ämnet saknar meningsskillnader: returnera []
• Undvik att ha 10+ positioner i ett kluster — det är för brett

Partipositioner:
${pList}

Returnera BARA en JSON-array.`;

  let raw = "";
  try {
    const msg = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 3000,
      messages:   [{ role: "user", content: prompt }],
    });
    raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  } catch (e) {
    console.error("  API-fel:", e);
    return [];
  }

  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const today = new Date().toISOString().slice(0, 10);

  const parties  = await prisma.party.findMany({ select: { id: true, shortName: true, name: true } });
  const partyMap = Object.fromEntries(parties.map(p => [p.id, p]));

  // Hämta befintliga APPROVED-frågor för deduplikering
  const existingApproved = await prisma.question.findMany({
    where:  { reviewStatus: "APPROVED" },
    select: { questionText: true },
  });
  const approvedTexts = existingApproved.map(q => q.questionText);
  console.log(`Befintliga APPROVED-frågor (hoppas över vid duplikat): ${approvedTexts.length}`);

  // Hämta alla APPROVED positioner
  const allPos = await prisma.position.findMany({
    where:  { reviewStatus: "APPROVED" },
    select: {
      id: true, partyId: true, topic: true,
      specificQuestion: true, sourceQuote: true,
    },
  });
  console.log(`APPROVED positioner totalt: ${allPos.length}\n`);

  const byTopic = new Map<string, PositionRow[]>();
  for (const p of allPos) {
    const row: PositionRow = {
      id: p.id, partyId: p.partyId,
      shortName: partyMap[p.partyId]?.shortName ?? p.partyId,
      specificQuestion: p.specificQuestion,
      sourceQuote:      p.sourceQuote,
    };
    if (!byTopic.has(p.topic)) byTopic.set(p.topic, []);
    byTopic.get(p.topic)!.push(row);
  }

  const usedTexts: string[] = [...approvedTexts];
  const usedPosIds = new Set<string>(); // varje position ska bara ingå i ett kluster

  type CreatedQuestion = {
    id: string; questionText: string; topic: string; topicLabel: string;
    partyIds: string[]; positionIds: string[];
    yesLeaning: string[]; noLeaning: string[];
    reasoning: string; partyCount: number;
  };
  const allCreated: CreatedQuestion[] = [];

  let totalCreated = 0, totalSkipped = 0, totalDuplicates = 0;

  console.log("═".repeat(70));
  console.log("GENERERAR KANDIDATFRÅGOR FRÅN SEMANTISKA KLUSTER");
  console.log("═".repeat(70) + "\n");

  for (const { slug, label } of TARGET_TOPICS) {
    const positions = byTopic.get(slug) ?? [];
    if (positions.length < 2) {
      console.log(`  [${slug.padEnd(18)}] ${positions.length} pos — hoppar (för få positioner)`);
      continue;
    }
    const partyCount = new Set(positions.map(p => p.partyId)).size;
    if (partyCount < MIN_PARTIES_THRESHOLD) {
      console.log(`  [${slug.padEnd(18)}] ${positions.length} pos / ${partyCount} parti — hoppar`);
      continue;
    }

    process.stdout.write(`  [${slug.padEnd(18)}] ${String(positions.length).padStart(3)} pos, ${partyCount} partier → Claude... `);
    await delay(DELAY_MS);

    const clusters = await clusterPositionsForTopic(label, positions);

    let topicCreated = 0, topicSkipped = 0;

    for (const cluster of clusters) {
      const qt = (cluster.question ?? "").trim();
      if (!qt || typeof qt !== "string") continue;
      if (!/^(bör|ska)\b/i.test(qt)) continue;
      if (qt.split(" ").length > 20) continue;

      // Hämta de positioner som ingår i klustret
      const clusterPositions = (cluster.position_indices ?? [])
        .filter(i => typeof i === "number" && i >= 1 && i <= positions.length)
        .map(i => positions[i - 1])
        .filter(p => !usedPosIds.has(p.id)); // hoppa över redan använda

      const distinctParties = [...new Set(clusterPositions.map(p => p.partyId))];
      if (distinctParties.length < MIN_PARTIES_THRESHOLD) {
        topicSkipped++;
        totalSkipped++;
        continue;
      }

      // Kontrollera duplikat mot befintliga APPROVED + tidigare skapade
      if (usedTexts.some(t => jaccardSim(t, qt) > JACCARD_DEDUP_THRESH)) {
        totalDuplicates++;
        continue;
      }

      // Markera positions-ID:n som använda
      for (const p of clusterPositions) usedPosIds.add(p.id);

      // Skapa Question-post
      const question = await prisma.question.create({
        data: {
          topic:        slug,
          questionText: qt,
          description:  `v2 kluster · ${distinctParties.length} partier · ${label}`,
          reviewStatus: "PENDING",
        },
      });

      // Länka BARA klustrets positioner
      for (const pos of clusterPositions) {
        await prisma.questionPosition.upsert({
          where:  { questionId_positionId: { questionId: question.id, positionId: pos.id } },
          create: { questionId: question.id, positionId: pos.id },
          update: {},
        });
      }

      usedTexts.push(qt);
      allCreated.push({
        id:           question.id,
        questionText: qt,
        topic:        slug,
        topicLabel:   label,
        partyIds:     distinctParties,
        positionIds:  clusterPositions.map(p => p.id),
        yesLeaning:   cluster.yes_leaning ?? [],
        noLeaning:    cluster.no_leaning  ?? [],
        reasoning:    cluster.reasoning   ?? "",
        partyCount:   distinctParties.length,
      });

      topicCreated++;
      totalCreated++;
    }

    const topicLine = `${String(topicCreated).padStart(2)} frågor`;
    const skipLine  = topicSkipped > 0 ? ` (${topicSkipped} kluster hoppade — <2 partier)` : "";
    console.log(`${topicLine}${skipLine}`);
  }

  // ── Statistik ─────────────────────────────────────────────────────────────
  const strong = allCreated.filter(q => q.partyCount >= STRONG_PARTIES);
  const weak   = allCreated.filter(q => q.partyCount < STRONG_PARTIES);

  console.log("\n" + "═".repeat(70));
  console.log("STATISTIK");
  console.log("═".repeat(70));
  console.log(`\nTotalt skapade (PENDING):       ${totalCreated}`);
  console.log(`  med ${STRONG_PARTIES}+ partier (starka):       ${strong.length}`);
  console.log(`  med 2 partier (svagare):        ${weak.length}`);
  console.log(`Hoppade (för få partier i kluster): ${totalSkipped}`);
  console.log(`Hoppade (duplikat mot APPROVED):    ${totalDuplicates}`);

  console.log("\nÄmnesfördelning (nya PENDING):");
  const topicDist: Record<string, number> = {};
  for (const q of allCreated) topicDist[q.topic] = (topicDist[q.topic] ?? 0) + 1;
  for (const { slug, label } of TARGET_TOPICS) {
    const n = topicDist[slug] ?? 0;
    const bar = n > 0 ? " " + "█".repeat(n) : "";
    console.log(`  ${label.padEnd(36)} ${String(n).padStart(2)}${bar}`);
  }

  console.log("\nPartifördelning (frågor med relevant position):");
  const pCount: Record<string, number> = {};
  for (const q of allCreated) {
    for (const pId of q.partyIds) pCount[pId] = (pCount[pId] ?? 0) + 1;
  }
  for (const pId of PARTY_ORDER) {
    const n   = pCount[pId] ?? 0;
    const bar = "█".repeat(n);
    console.log(`  ${(partyMap[pId]?.shortName ?? pId).padEnd(4)} ${String(n).padStart(3)} frågor  ${bar}`);
  }

  if (weak.length > 0) {
    console.log(`\nFrågor med bara 2 relevanta partier (svagare — kräver noggrann granskning):`);
    for (const q of weak) {
      const ps = q.partyIds.map(p => partyMap[p]?.shortName ?? p).join(", ");
      console.log(`  [${ps}] ${q.questionText}`);
    }
  }

  const avgParties = allCreated.length > 0
    ? (allCreated.reduce((s, q) => s + q.partyCount, 0) / allCreated.length).toFixed(1)
    : "0";
  console.log(`\nGenomsnittligt antal partier/fråga: ${avgParties}`);

  // ── Markdown-export ────────────────────────────────────────────────────────
  const outDir  = path.join(__dirname, "../exports");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `candidate-questions-v2-${today}.md`);

  const lines: string[] = [];
  lines.push(`# Kandidatfrågor v2 — Valkompass ${today}`);
  lines.push(`> **${totalCreated} kandidatfrågor · alla PENDING**`);
  lines.push(`> Genererade av Claude Sonnet 4.6 från semantiska kluster av ${allPos.length} APPROVED partipositioner.`);
  lines.push(`> Starka frågor (≥3 partier): ${strong.length}  ·  Svagare (2 partier): ${weak.length}`);
  lines.push(`> Granska varje fråga. Godkänn inte automatiskt.`);
  lines.push("");

  lines.push("## Ämnesfördelning");
  lines.push("");
  for (const { slug, label } of TARGET_TOPICS) {
    const n = topicDist[slug] ?? 0;
    lines.push(n > 0 ? `- **${label}**: ${n}` : `- ~~${label}~~: 0`);
  }
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("## Instruktion till ChatGPT");
  lines.push("");
  lines.push(`Du granskar ${totalCreated} kandidatfrågor för en källbaserad svensk valkompass.`);
  lines.push("Frågorna är genererade via semantisk klustring — varje fråga är redan kopplad till");
  lines.push("DIREKT RELEVANTA partipositioner (inga ämneskluster). Granska om:");
  lines.push("1. Frågan fångar en verklig politisk skiljelinje");
  lines.push("2. De listade partierna faktiskt har positioner som är relevanta för just denna fråga");
  lines.push("3. Abstraktionsnivån är rätt — konkret men täcker flera partiers positioner");
  lines.push("");
  lines.push("Svara för varje fråga med ett av:");
  lines.push("- **GODKÄNN** — question_id");
  lines.push("- **ÄNDRA OCH GODKÄNN** — question_id, ny frågetext");
  lines.push("- **AVVISA** — question_id, orsak");
  lines.push("");
  lines.push("**Flagga som svag** (bör helst ha fler partier) om frågan bara har 2 relevanta partier.");
  lines.push("");
  lines.push("---");
  lines.push("");

  const byTopicOut: Record<string, CreatedQuestion[]> = {};
  for (const q of allCreated) {
    if (!byTopicOut[q.topic]) byTopicOut[q.topic] = [];
    byTopicOut[q.topic].push(q);
  }

  let qNum = 0;
  for (const { slug, label } of TARGET_TOPICS) {
    const qs = byTopicOut[slug];
    if (!qs?.length) continue;
    lines.push(`## ${label} (${qs.length})`);
    lines.push("");

    for (const q of qs) {
      qNum++;
      const partyNames = q.partyIds.map(p => partyMap[p]?.shortName ?? p).join(", ");
      const strength   = q.partyCount >= STRONG_PARTIES ? "✓ stark" : "⚠ svag (2 partier)";

      lines.push(`### Fråga ${qNum} — ${strength}`);
      lines.push(`**question_id**: \`${q.id}\``);
      lines.push(`**frågetext**: ${q.questionText}`);
      lines.push(`**relevanta partier**: ${partyNames} (${q.partyCount})`);
      if (q.yesLeaning.length > 0) lines.push(`**troligen JA**: ${q.yesLeaning.join(", ")}`);
      if (q.noLeaning.length  > 0) lines.push(`**troligen NEJ**: ${q.noLeaning.join(", ")}`);
      lines.push(`**motivering**: ${q.reasoning}`);
      lines.push("");

      // Visa varje relevant partiposition
      lines.push("**Direkt relevanta partipositioner:**");
      // Hämta positionerna från byTopic
      const topicPositions = byTopic.get(slug) ?? [];
      const clusterPos = topicPositions.filter(p => q.positionIds.includes(p.id));
      for (const pos of clusterPos) {
        const side = q.yesLeaning.includes(pos.shortName) ? " [JA]"
                   : q.noLeaning.includes(pos.shortName)  ? " [NEJ]"
                   : "";
        lines.push(`- **${pos.shortName}**${side}: ${pos.specificQuestion}`);
        lines.push(`  > "${pos.sourceQuote.slice(0, 200).replace(/\n/g, " ")}"`);
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

  // ── Befintliga APPROVED-frågor ─────────────────────────────────────────────
  console.log("\n── Befintliga APPROVED-frågor (oförändrade) ─────────────────────");
  const approvedQs = await prisma.question.findMany({
    where:   { reviewStatus: "APPROVED" },
    include: { positions: { include: { position: { select: { partyId: true } } } } },
  });
  console.log(`  ${approvedQs.length} frågor APPROVED sedan tidigare`);
  const approvedPartyDist: Record<string, number> = {};
  for (const q of approvedQs) {
    const ps = new Set(q.positions.map(qp => qp.position.partyId));
    for (const p of ps) approvedPartyDist[p] = (approvedPartyDist[p] ?? 0) + 1;
  }
  for (const pId of PARTY_ORDER) {
    const n = approvedPartyDist[pId] ?? 0;
    if (n > 0) console.log(`  ${(partyMap[pId]?.shortName ?? pId).padEnd(4)} ${n} frågor`);
  }

  console.log("\n── Nästa steg ───────────────────────────────────────────────────");
  console.log(`  1. Granska exports/candidate-questions-v2-${today}.md i ChatGPT`);
  console.log("  2. Applicera granskning med apply-review-questions-v2.ts");
  console.log("  3. Testa /kompass och /resultat");

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
