/**
 * Inventering av APPROVED positioner per ämne och parti.
 * Visar vad som finns att arbeta med inför v3-generering.
 */
import "dotenv/config";
import { createClient } from "../lib/createClient";

const prisma = createClient();

const PRIORITY_TOPICS = [
  { slug: "vård",               label: "Vård och omsorg" },
  { slug: "socialförsäkring",   label: "Socialförsäkring och välfärd" },
  { slug: "skola",              label: "Skola och utbildning" },
  { slug: "försvar",            label: "Försvar och säkerhet" },
  { slug: "eu",                 label: "EU och utrikespolitik" },
  { slug: "migration",          label: "Migration och integration" },
  { slug: "lag_ordning",        label: "Lag och ordning" },
  { slug: "ekonomi",            label: "Ekonomi" },
  { slug: "klimat",             label: "Klimat och miljö" },
  { slug: "energi",             label: "Energi" },
  { slug: "skatter",            label: "Skatter" },
  { slug: "jobb",               label: "Jobb och arbetsmarknad" },
  { slug: "bostäder",           label: "Bostäder" },
  { slug: "jämställdhet",       label: "Jämställdhet" },
  { slug: "landsbygd",          label: "Landsbygd" },
];

const PARTY_ORDER = [
  "socialdemokraterna","vansterpartiet","kristdemokraterna",
  "liberalerna","sverigedemokraterna","centerpartiet","miljopartiet","moderaterna",
];

async function main() {
  const parties  = await prisma.party.findMany({ select: { id: true, shortName: true } });
  const partyMap = Object.fromEntries(parties.map(p => [p.id, p]));

  // APPROVED positioner
  const allPos = await prisma.position.findMany({
    where:  { reviewStatus: "APPROVED" },
    select: { id: true, partyId: true, topic: true, specificQuestion: true, positionValue: true },
  });

  // Befintliga APPROVED frågor per ämne
  const approvedQs = await prisma.question.findMany({
    where:  { reviewStatus: "APPROVED" },
    select: {
      topic: true, questionText: true, weak: true,
      positions: { include: { position: { select: { partyId: true } } } },
    },
  });

  // Positioner redan länkade till APPROVED frågor
  const usedPosIds = new Set<string>();
  const approvedQByTopic: Record<string, { text: string; parties: string[] }[]> = {};
  for (const q of approvedQs) {
    const partyIds = [...new Set(q.positions.map(qp => qp.position.partyId))];
    if (!approvedQByTopic[q.topic]) approvedQByTopic[q.topic] = [];
    approvedQByTopic[q.topic].push({ text: q.questionText, parties: partyIds.map(id => partyMap[id]?.shortName ?? id) });
  }

  const byTopic = new Map<string, typeof allPos>();
  for (const p of allPos) {
    if (!byTopic.has(p.topic)) byTopic.set(p.topic, []);
    byTopic.get(p.topic)!.push(p);
  }

  console.log("═".repeat(80));
  console.log("INVENTERING — APPROVED positioner per ämne (inför v3-generering)");
  console.log("═".repeat(80));
  console.log(`\nTotalt ${allPos.length} APPROVED positioner, ${approvedQs.length} APPROVED frågor\n`);

  let canGenerate = 0, gapTopics = 0;

  for (const { slug, label } of PRIORITY_TOPICS) {
    const positions = byTopic.get(slug) ?? [];
    const existingQs = approvedQByTopic[slug] ?? [];
    const partySet = new Set(positions.map(p => p.partyId));
    const uniqueParties = [...partySet];

    const status =
      positions.length === 0   ? "✗ SAKNAR POSITIONER" :
      uniqueParties.length < 2 ? "⚠ BARA 1 PARTI" :
      positions.length < 3     ? "△ FÅ POSITIONER" : "✓";

    const isGap = positions.length < 3 || uniqueParties.length < 2;
    if (isGap) gapTopics++; else canGenerate++;

    const partyNames = uniqueParties.map(id => partyMap[id]?.shortName ?? id).sort().join(", ");
    const existingNote = existingQs.length > 0 ? ` [${existingQs.length} APPROVED frågor]` : " [inga APPROVED frågor]";

    console.log(`\n${status.padEnd(22)} ${label}${existingNote}`);
    if (positions.length > 0) {
      console.log(`   ${positions.length} positioner, ${uniqueParties.length} partier: ${partyNames}`);
    }

    // Visa varje partition per parti
    for (const pId of PARTY_ORDER) {
      if (!partySet.has(pId)) continue;
      const partyPos = positions.filter(p => p.partyId === pId);
      const sn = partyMap[pId]?.shortName ?? pId;
      for (const p of partyPos) {
        console.log(`   ${sn.padEnd(4)} val=${String(p.positionValue ?? "?").padStart(3)}: ${p.specificQuestion.slice(0, 70)}`);
      }
    }

    // Befintliga frågor
    if (existingQs.length > 0) {
      console.log(`   Befintliga APPROVED:`);
      for (const q of existingQs) {
        console.log(`     - ${q.text.slice(0, 75)}`);
        console.log(`       (${q.parties.join(", ")})`);
      }
    }
  }

  console.log("\n\n" + "═".repeat(80));
  console.log("SUMMARY");
  console.log("═".repeat(80));
  console.log(`\nÄmnen med tillräckligt material (≥3 pos, ≥2 partier): ${canGenerate}`);
  console.log(`Ämnesluckor (saknar material):                         ${gapTopics}`);
  console.log("\nPartifördelning (APPROVED positioner totalt):");
  for (const pId of PARTY_ORDER) {
    const total = allPos.filter(p => p.partyId === pId).length;
    const used  = approvedQs.filter(q =>
      q.positions.some(qp => qp.position.partyId === pId)
    ).length;
    const sn = (partyMap[pId]?.shortName ?? pId).padEnd(4);
    const bar = "█".repeat(total);
    console.log(`  ${sn} ${String(total).padStart(3)} positioner  →  ${String(used).padStart(2)} APPROVED frågor  ${bar}`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
