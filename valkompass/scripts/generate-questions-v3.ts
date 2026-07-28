/**
 * Frågegenerering v3 — täckningsfokuserad, kvalitetsorienterad.
 *
 * Skillnader mot v2:
 *   - Ämnesprioritet: vård, socialförsäkring, skola, försvar, eu, migration
 *   - Prompt inkluderar befintliga APPROVED-frågor per ämne → undviker semantiska dubbletter
 *   - Prompt betonar 3+ partier och namnger undertäckta partier per ämne
 *   - Claude returnerar `importance`-fält; 2-partiersfrågor med importance=LOW filtreras bort
 *   - Max en position per parti per fråga (de-dup i post-processing)
 *   - Alla nya frågor sparas som PENDING med description="v3 kluster"
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import * as fs   from "fs";
import * as path from "path";
import { createClient } from "../lib/createClient";

const prisma    = createClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DELAY_MS          = 1500;
const JACCARD_THRESH    = 0.50;
const MIN_PARTIES       = 2;
const STRONG_PARTIES    = 3;

// HIGH priority = saknar frågor eller kraftigt undertäckt
// LOW priority  = redan bra täckning (genererar bara om starka kluster hittas)
const TARGET_TOPICS: { slug: string; label: string; priority: "HIGH" | "MED" | "LOW" }[] = [
  { slug: "vård",               label: "Vård och omsorg",              priority: "HIGH" },
  { slug: "socialförsäkring",   label: "Socialförsäkring och välfärd", priority: "HIGH" },
  { slug: "skola",              label: "Skola och utbildning",          priority: "HIGH" },
  { slug: "försvar",            label: "Försvar och säkerhet",          priority: "HIGH" },
  { slug: "eu",                 label: "EU och utrikespolitik",         priority: "HIGH" },
  { slug: "migration",          label: "Migration och integration",     priority: "MED"  },
  { slug: "lag_ordning",        label: "Lag och ordning",               priority: "MED"  },
  { slug: "jobb",               label: "Jobb och arbetsmarknad",        priority: "MED"  },
  { slug: "bostäder",           label: "Bostäder",                      priority: "LOW"  },
  { slug: "klimat",             label: "Klimat och miljö",              priority: "LOW"  },
  { slug: "ekonomi",            label: "Ekonomi",                       priority: "LOW"  },
  { slug: "skatter",            label: "Skatter",                       priority: "LOW"  },
  { slug: "energi",             label: "Energi",                        priority: "LOW"  },
  { slug: "jämställdhet",       label: "Jämställdhet",                  priority: "LOW"  },
  { slug: "landsbygd",          label: "Landsbygd",                     priority: "LOW"  },
];

// Partier med lägst täckning i APPROVED-frågor
const UNDER_COVERED = ["V", "SD", "C", "S", "MP"];

const PARTY_ORDER = [
  "socialdemokraterna","vansterpartiet","kristdemokraterna",
  "liberalerna","sverigedemokraterna","centerpartiet","miljopartiet","moderaterna",
];

type PositionRow = {
  id: string; partyId: string; shortName: string;
  specificQuestion: string; sourceQuote: string; positionValue: number | null;
};

type ClusterRaw = {
  question:         string;
  position_indices: number[];
  yes_leaning?:     string[];
  no_leaning?:      string[];
  importance:       "HIGH" | "MEDIUM" | "LOW";
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

async function clusterPositionsForTopic(
  topicLabel: string,
  positions:  PositionRow[],
  existingApprovedQs: string[],  // befintliga APPROVED-frågor för ämnet
  underCoveredPresent: string[], // undertäckta partier som FINNS i ämnet
): Promise<ClusterRaw[]> {

  const pList = positions.map((p, i) =>
    `[${i + 1}] ${p.shortName}: "${p.specificQuestion}"\n    Citat: "${p.sourceQuote.slice(0, 150).replace(/\n/g, " ")}"`
  ).join("\n\n");

  const existingBlock = existingApprovedQs.length > 0
    ? `\nBEFINTLIGA GODKÄNDA FRÅGOR I DETTA ÄMNE (undvik att skapa semantiska dubbletter):\n${existingApprovedQs.map((t, i) => `${i + 1}. "${t}"`).join("\n")}\n`
    : "";

  const underBlock = underCoveredPresent.length > 0
    ? `\nPARTIER SOM BEHÖVER MER TÄCKNING (prioritera kluster som inkluderar): ${underCoveredPresent.join(", ")}`
    : "";

  const prompt =
`Du bygger en valkompass för riksdagsvalet 2026.

Nedan finns godkända partipositioner om ämnet "${topicLabel}".
${existingBlock}${underBlock}

UPPGIFT: Identifiera SEMANTISKA KLUSTER — grupper av positioner som handlar om SAMMA politiska dimension, där partierna har TYDLIGT SKILDA ståndpunkter.

PRIORITERING AV KLUSTERSTYRKA:
• STARK fråga (importance=HIGH): Täcker 3 eller fler partier med klara åsiktsskillnader. Prioritera dessa.
• MEDEL fråga (importance=MEDIUM): 2 partier, men tydlig och viktig politisk skiljelinje.
• SVAG fråga (importance=LOW): 2 partier, otydlig eller trivial skiljelinje. Generera INTE dessa.

REGLER FÖR BRA FRÅGOR:
• Neutral "Bör/Ska"-fråga, max 15 ord
• Täcker positioner från MINST 2 partier (helst 3+)
• Partierna ska ha OLIKA sidor (inte trivial konsensus)
• Undvik frågor som liknar befintliga godkända frågor
• En positions-index får BARA finnas i ETT kluster

ABSTRAKTIONSNIVÅ:
• Inte för smal: "Bör ett specifikt centrum inrättas?" (bara 1 parti)
• Inte för bred: "Bör Sverige ha bra välfärd?" (alla eniga)
• Rätt: "Bör försvarsanslagen ökas kraftigt?" (SD, M, KD ja — V, MP skeptiska)

POSITIONER HANDLAR OM PARTIETS EGNA STÅNDPUNKT:
• En position "bör fler poliser anställas" = partiet säger JA på en sådan fråga
• En position "bör resurserna till rehabilitering utökas" = partiet föredrar alternativet

Returnera JSON-array. Varje objekt:
{
  "question": "Bör ...",
  "position_indices": [2, 5, 8],
  "yes_leaning": ["SD", "M"],
  "no_leaning": ["V", "MP"],
  "importance": "HIGH" | "MEDIUM" | "LOW",
  "reasoning": "..."
}

Om ämnet saknar meningsskillnader: returnera [].

Partipositioner:
${pList}

Returnera BARA en JSON-array.`;

  let raw = "";
  try {
    const msg = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 4000,
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

async function main() {
  const today = new Date().toISOString().slice(0, 10);

  const parties  = await prisma.party.findMany({ select: { id: true, shortName: true, name: true } });
  const partyMap = Object.fromEntries(parties.map(p => [p.id, p]));

  // Befintliga APPROVED-frågor (texter + per ämne)
  const existingApproved = await prisma.question.findMany({
    where:   { reviewStatus: "APPROVED" },
    select:  { questionText: true, topic: true },
  });
  const approvedTexts    = existingApproved.map(q => q.questionText);
  const approvedByTopic  = new Map<string, string[]>();
  for (const q of existingApproved) {
    if (!approvedByTopic.has(q.topic)) approvedByTopic.set(q.topic, []);
    approvedByTopic.get(q.topic)!.push(q.questionText);
  }

  console.log(`Befintliga APPROVED-frågor: ${approvedTexts.length}`);

  // Alla APPROVED positioner
  const allPos = await prisma.position.findMany({
    where:  { reviewStatus: "APPROVED" },
    select: { id: true, partyId: true, topic: true, specificQuestion: true, sourceQuote: true, positionValue: true },
  });
  console.log(`APPROVED positioner: ${allPos.length}\n`);

  const byTopic = new Map<string, PositionRow[]>();
  for (const p of allPos) {
    const row: PositionRow = {
      id: p.id, partyId: p.partyId,
      shortName:        partyMap[p.partyId]?.shortName ?? p.partyId,
      specificQuestion: p.specificQuestion,
      sourceQuote:      p.sourceQuote,
      positionValue:    p.positionValue,
    };
    if (!byTopic.has(p.topic)) byTopic.set(p.topic, []);
    byTopic.get(p.topic)!.push(row);
  }

  const usedTexts: string[] = [...approvedTexts];
  const usedPosIds = new Set<string>();

  type CreatedQuestion = {
    id: string; questionText: string; topic: string; topicLabel: string;
    partyIds: string[]; positionIds: string[];
    yesLeaning: string[]; noLeaning: string[];
    importance: string; reasoning: string; partyCount: number;
  };
  const allCreated: CreatedQuestion[] = [];
  const gapReport: { slug: string; label: string; reason: string }[] = [];

  let totalCreated = 0, totalSkipped = 0, totalDuplicates = 0, totalLowImportance = 0;

  console.log("═".repeat(75));
  console.log("GENERERAR v3-KANDIDATFRÅGOR");
  console.log("═".repeat(75) + "\n");

  for (const { slug, label, priority } of TARGET_TOPICS) {
    const positions     = byTopic.get(slug) ?? [];
    const existingQs    = approvedByTopic.get(slug) ?? [];
    const uniqueParties = [...new Set(positions.map(p => p.partyId))];

    // Material-check
    if (positions.length < 2) {
      gapReport.push({ slug, label, reason: `Inga/för få APPROVED positioner (${positions.length})` });
      console.log(`  [${priority}] [${slug.padEnd(18)}] ✗ hoppar — för få positioner (${positions.length})`);
      continue;
    }
    if (uniqueParties.length < MIN_PARTIES) {
      gapReport.push({ slug, label, reason: `Bara 1 parti med APPROVED positioner` });
      console.log(`  [${priority}] [${slug.padEnd(18)}] ✗ hoppar — bara 1 parti`);
      continue;
    }

    // Undertäckta partier som faktiskt FINNS i ämnet
    const partyShortNames  = positions.map(p => p.shortName);
    const underCoveredHere = UNDER_COVERED.filter(sn => partyShortNames.includes(sn));

    const existingNote = existingQs.length > 0 ? ` (${existingQs.length} befintliga)` : "";
    process.stdout.write(`  [${priority}] [${slug.padEnd(18)}] ${String(positions.length).padStart(3)} pos / ${uniqueParties.length}p${existingNote} → Claude... `);

    await delay(DELAY_MS);
    const clusters = await clusterPositionsForTopic(label, positions, existingQs, underCoveredHere);

    let topicCreated = 0, topicSkipped = 0, topicLow = 0;

    for (const cluster of clusters) {
      const qt = (cluster.question ?? "").trim();
      if (!qt || typeof qt !== "string") continue;
      if (!/^(bör|ska)\b/i.test(qt)) continue;
      if (qt.split(" ").length > 20) continue;

      const importance = (cluster.importance ?? "MEDIUM").toUpperCase();

      // Hämta klustrets positioner (exkludera redan använda)
      const clusterPositions = (cluster.position_indices ?? [])
        .filter(i => typeof i === "number" && i >= 1 && i <= positions.length)
        .map(i => positions[i - 1])
        .filter(p => !usedPosIds.has(p.id));

      // Max en position per parti
      const seenParties     = new Set<string>();
      const dedupedPositions = clusterPositions.filter(p => {
        if (seenParties.has(p.partyId)) return false;
        seenParties.add(p.partyId);
        return true;
      });

      const distinctParties = [...seenParties];
      if (distinctParties.length < MIN_PARTIES) {
        topicSkipped++;
        totalSkipped++;
        continue;
      }

      // Filtrera bort LOW importance
      if (importance === "LOW") {
        topicLow++;
        totalLowImportance++;
        continue;
      }

      // Filtrera 2-partiersfrågor på LOW-priority ämnen om inte MEDIUM+ importance
      if (priority === "LOW" && distinctParties.length < STRONG_PARTIES && importance !== "HIGH") {
        topicLow++;
        totalLowImportance++;
        continue;
      }

      // Dedup mot befintliga APPROVED + redan skapade
      if (usedTexts.some(t => jaccardSim(t, qt) > JACCARD_THRESH)) {
        totalDuplicates++;
        continue;
      }

      // Markera använda positions-ID:n
      for (const p of dedupedPositions) usedPosIds.add(p.id);

      // Skapa Question
      const question = await prisma.question.create({
        data: {
          topic:        slug,
          questionText: qt,
          description:  `v3 kluster · ${distinctParties.length} partier · ${importance} · ${label}`,
          reviewStatus: "PENDING",
        },
      });

      // Länka positioner
      for (const pos of dedupedPositions) {
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
        positionIds:  dedupedPositions.map(p => p.id),
        yesLeaning:   cluster.yes_leaning ?? [],
        noLeaning:    cluster.no_leaning  ?? [],
        importance,
        reasoning:    cluster.reasoning ?? "",
        partyCount:   distinctParties.length,
      });

      topicCreated++;
      totalCreated++;
    }

    const skipNote = topicSkipped > 0 ? ` (${topicSkipped} <2p)` : "";
    const lowNote  = topicLow    > 0 ? ` (${topicLow} LOW)` : "";
    console.log(`${String(topicCreated).padStart(2)} frågor${skipNote}${lowNote}`);
  }

  // ── Statistik ─────────────────────────────────────────────────────────────
  const strong = allCreated.filter(q => q.partyCount >= STRONG_PARTIES);
  const weak   = allCreated.filter(q => q.partyCount < STRONG_PARTIES);

  console.log("\n" + "═".repeat(75));
  console.log("STATISTIK — NYA PENDING-FRÅGOR (v3)");
  console.log("═".repeat(75));
  console.log(`\nTotalt skapade (PENDING):           ${totalCreated}`);
  console.log(`  ${STRONG_PARTIES}+ partier (starka):            ${strong.length}`);
  console.log(`  2 partier (svagare):              ${weak.length}`);
  console.log(`Hoppade (för få partier i kluster): ${totalSkipped}`);
  console.log(`Hoppade (LOW importance):           ${totalLowImportance}`);
  console.log(`Hoppade (duplikat mot APPROVED):    ${totalDuplicates}`);

  console.log("\nÄmnesfördelning (nya PENDING):");
  const topicDist: Record<string, number> = {};
  for (const q of allCreated) topicDist[q.topic] = (topicDist[q.topic] ?? 0) + 1;
  for (const { slug, label } of TARGET_TOPICS) {
    const n = topicDist[slug] ?? 0;
    if (n > 0) {
      const bar = "█".repeat(n);
      console.log(`  ${label.padEnd(36)} ${String(n).padStart(2)} ${bar}`);
    }
  }

  console.log("\nPartifördelning (frågor med relevant position):");
  const pCount: Record<string, number> = {};
  for (const q of allCreated) {
    for (const pId of q.partyIds) pCount[pId] = (pCount[pId] ?? 0) + 1;
  }
  for (const pId of PARTY_ORDER) {
    const n   = pCount[pId] ?? 0;
    if (n > 0) {
      const sn  = (partyMap[pId]?.shortName ?? pId).padEnd(4);
      const bar = "█".repeat(n);
      console.log(`  ${sn} ${String(n).padStart(3)} frågor  ${bar}`);
    }
  }

  if (gapReport.length > 0) {
    console.log("\nÄMNESLUCKOR (ej tillräckligt material för v3):");
    for (const g of gapReport) {
      console.log(`  ✗ ${g.label}: ${g.reason}`);
    }
  }

  if (weak.length > 0) {
    console.log(`\n2-partiersfrågor (kräver extra granskning):`);
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
  const outPath = path.join(outDir, `candidate-questions-v3-${today}.md`);

  const lines: string[] = [];
  lines.push(`# Kandidatfrågor v3 — Valkompass ${today}`);
  lines.push(`> **${totalCreated} kandidatfrågor · alla PENDING**`);
  lines.push(`> Genererade från ${allPos.length} APPROVED partipositioner.`);
  lines.push(`> Starka (≥3 partier): ${strong.length}  ·  Svagare (2 partier): ${weak.length}`);
  lines.push(`> Granska varje fråga. Godkänn inte automatiskt.`);
  lines.push("");

  lines.push("## Ämnesfördelning");
  lines.push("");
  for (const { slug, label } of TARGET_TOPICS) {
    const n = topicDist[slug] ?? 0;
    if (n > 0) lines.push(`- **${label}**: ${n}`);
  }
  lines.push("");

  if (gapReport.length > 0) {
    lines.push("## Ämnesluckor (inte tillräckligt material)");
    lines.push("");
    for (const g of gapReport) {
      lines.push(`- **${g.label}**: ${g.reason}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## Instruktion till ChatGPT");
  lines.push("");
  lines.push(`Du granskar ${totalCreated} kandidatfrågor (v3) för en källbaserad svensk valkompass.`);
  lines.push("Frågorna är genererade via semantisk klustring. Varje fråga är kopplad till");
  lines.push("DIREKT RELEVANTA partipositioner. Granska om:");
  lines.push("1. Frågan fångar en verklig politisk skiljelinje");
  lines.push("2. De listade partierna faktiskt har positioner relevanta för just denna fråga");
  lines.push("3. Positionsvärdet är rätt relativt FRÅGETEXTENS riktning (inte källpositionens)");
  lines.push("4. Abstraktionsnivån är rätt — konkret men täcker flera partiers positioner");
  lines.push("");
  lines.push("Svara för varje fråga med:");
  lines.push("- **GODKÄNN** — question_id");
  lines.push("- **ÄNDRA OCH GODKÄNN** — question_id, ny frågetext");
  lines.push("- **AVVISA** — question_id, orsak");
  lines.push("");
  lines.push("**Observera**: Kontrollera att positionsvärdet matchar frågans riktning.");
  lines.push("T.ex. om frågan är 'Bör X avskaffas?' och partiet är mot X → positionsvärde bör vara -2 (de stödjer avskaffande = JA), eller +2 (de är för X = NEJ).");
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
      const strength   = q.partyCount >= STRONG_PARTIES
        ? `✓ stark (${q.partyCount} partier)`
        : `⚠ svag (${q.partyCount} partier)`;

      lines.push(`### Fråga ${qNum} [${q.importance}] — ${strength}`);
      lines.push(`**question_id**: \`${q.id}\``);
      lines.push(`**frågetext**: ${q.questionText}`);
      lines.push(`**relevanta partier**: ${partyNames}`);
      if (q.yesLeaning.length > 0) lines.push(`**troligen JA**: ${q.yesLeaning.join(", ")}`);
      if (q.noLeaning.length  > 0) lines.push(`**troligen NEJ**: ${q.noLeaning.join(", ")}`);
      lines.push(`**motivering**: ${q.reasoning}`);
      lines.push("");

      lines.push("**Direkt relevanta partipositioner:**");
      const topicPositions  = byTopic.get(slug) ?? [];
      const clusterPos      = topicPositions.filter(p => q.positionIds.includes(p.id));
      for (const pos of clusterPos) {
        const side = q.yesLeaning.includes(pos.shortName) ? " [JA]"
                   : q.noLeaning.includes(pos.shortName)  ? " [NEJ]"
                   : "";
        lines.push(`- **${pos.shortName}**${side} (posval=${pos.positionValue ?? "?"}): ${pos.specificQuestion}`);
        lines.push(`  > "${pos.sourceQuote.slice(0, 200).replace(/\n/g, " ")}"`);
      }
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  lines.push(`*Slut — ${totalCreated} kandidatfrågor v3 · ${today}*`);
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");

  console.log(`\nMarkdown-export: ${outPath}`);
  console.log(`Rader: ${lines.length}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
