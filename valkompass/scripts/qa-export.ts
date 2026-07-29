import "dotenv/config";
import { createClient } from "../lib/createClient";

const prisma = createClient();

const TOPIC_LABEL: Record<string, string> = {
  migration: "Migration och integration", ekonomi: "Ekonomi",
  lag_ordning: "Lag och ordning", brottslighet: "Lag och ordning",
  klimat: "Klimat och miljö", skola: "Skola och utbildning",
  energi: "Energi", försvar: "Försvar och säkerhet",
  skatter: "Skatter", jobb: "Jobb och arbetsmarknad",
  bostäder: "Bostäder", socialförsäkring: "Socialförsäkring och välfärd",
  eu: "EU och utrikespolitik", jämställdhet: "Jämställdhet",
  landsbygd: "Landsbygd", näringsliv: "Näringsliv",
};

const PARTY_ORDER = [
  "socialdemokraterna","vansterpartiet","kristdemokraterna","liberalerna",
  "sverigedemokraterna","centerpartiet","miljopartiet","moderaterna",
];

async function main() {
  const parties = await prisma.party.findMany({ select: { id: true, shortName: true } });
  const partyMap = Object.fromEntries(parties.map(p => [p.id, p.shortName]));

  const qs = await prisma.question.findMany({
    where: { reviewStatus: "APPROVED" },
    include: {
      positions: {
        include: { position: { select: { partyId: true, specificQuestion: true } } },
      },
    },
    orderBy: [{ topic: "asc" }, { createdAt: "asc" }],
  });

  const all = await prisma.question.findMany({ select: { reviewStatus: true } });
  const countBy = (s: string) => all.filter(q => q.reviewStatus === s).length;

  console.log("# Valkompass — QA-export 2026-07-29\n");
  console.log(`## Övergripande statistik\n`);
  console.log(`- Frågor totalt:          ${all.length}`);
  console.log(`- APPROVED:               ${qs.length}`);
  console.log(`- NEEDS_REVIEW:           ${countBy("NEEDS_REVIEW")}`);
  console.log(`- REJECTED:               ${countBy("REJECTED")}`);
  console.log(`- PENDING:                ${countBy("PENDING")}`);

  const strong = qs.filter(q => !q.weak);
  const weak = qs.filter(q => q.weak);
  console.log(`\n- Starka (3+ partier):    ${strong.length}`);
  console.log(`- Svaga (≤2 partier):     ${weak.length}`);

  // Ämnesfördelning
  const topicCount: Record<string, number> = {};
  for (const q of qs) topicCount[q.topic] = (topicCount[q.topic] ?? 0) + 1;
  console.log(`\n## Ämnesfördelning — APPROVED\n`);
  for (const slug of Object.keys(topicCount).sort()) {
    const n = topicCount[slug];
    const label = TOPIC_LABEL[slug] ?? slug;
    console.log(`- ${label.padEnd(34)} ${n} ${"█".repeat(n)}`);
  }

  // Partitäckning
  const partyCoverage: Record<string, number> = {};
  for (const q of qs) {
    const ps = new Set(q.positions.map(qp => qp.position.partyId));
    for (const p of ps) partyCoverage[p] = (partyCoverage[p] ?? 0) + 1;
  }
  console.log(`\n## Partitäckning — APPROVED\n`);
  for (const pId of PARTY_ORDER) {
    const n = partyCoverage[pId] ?? 0;
    const name = partyMap[pId] ?? pId;
    console.log(`- ${name.padEnd(4)} ${String(n).padStart(2)} frågor  ${"█".repeat(n)}`);
  }

  // Frågelista
  console.log(`\n## Alla 51 APPROVED frågor\n`);
  console.log("| # | Ämne | Frågetext | Partier | Styrka |");
  console.log("|---|------|-----------|---------|--------|");
  let i = 1;
  for (const q of qs) {
    const label = TOPIC_LABEL[q.topic] ?? q.topic;
    const ps = [...new Set(q.positions.map(qp => partyMap[qp.position.partyId] ?? qp.position.partyId))];
    const pCount = new Set(q.positions.map(qp => qp.position.partyId)).size;
    const styrka = q.weak ? `svag (${pCount}p)` : `stark (${pCount}p)`;
    console.log(`| ${String(i).padStart(2)} | ${label} | ${q.questionText} | ${ps.join(", ")} | ${styrka} |`);
    i++;
  }

  // JSON för checkpoint
  console.log(`\n## question_ids för referens\n`);
  for (const q of qs) {
    const ps = [...new Set(q.positions.map(qp => partyMap[qp.position.partyId] ?? qp.position.partyId))];
    console.log(`${q.id}  [${ps.join(",")}]  ${q.weak ? "svag" : "stark"}  ${q.questionText}`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
