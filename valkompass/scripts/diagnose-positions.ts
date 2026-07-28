import "dotenv/config";
import { createClient } from "../lib/createClient";

const prisma = createClient();

const SUSPECT_QUESTION_IDS = [
  "cmqtot00y000vwwvhsh52ys2k",  // #11 vindkraft vs kärnkraft (MP dubbletter)
  "cmqtot3fm000wwwvhac1f6nne",  // #16 kärnvapen lagstiftning (MP/V = -2)
  "cmqtosgda0000wwvhlsqx1mil",  // #37 restriktiv invandringspolitik (MP = +2)
  "cmrcfs9830001wsvh19dpnb3i",  // #38 integrationskrav (M = -2)
  "cmrcfslkv0003wsvhy5in0ruh",  // #7 skattesystem gynnar ägare (S = +2)
];

async function main() {
  for (const qId of SUSPECT_QUESTION_IDS) {
    const q = await prisma.question.findUnique({
      where: { id: qId },
      include: {
        positions: {
          include: {
            position: {
              include: { party: { select: { shortName: true } } },
            },
          },
        },
      },
    });
    if (!q) { console.log(`HITTADES INTE: ${qId}\n`); continue; }

    console.log("═".repeat(80));
    console.log(`FRÅGA: "${q.questionText}"`);
    console.log(`ID: ${q.id}  |  Ämne: ${q.topic}`);
    console.log("─".repeat(80));

    for (const qp of q.positions) {
      const pos = qp.position;
      console.log(`\n  Parti: ${pos.party.shortName}  positionValue: ${pos.positionValue}`);
      console.log(`  Position-ID: ${pos.id}`);
      console.log(`  specificQuestion: "${pos.specificQuestion}"`);
      console.log(`  summary: "${pos.summary}"`);
      console.log(`  sourceQuote: "${pos.sourceQuote.slice(0, 200)}"`);
      console.log(`  sourceUrl: ${pos.sourceUrl}`);
      console.log(`  reviewStatus: ${pos.reviewStatus}`);
    }
    console.log();
  }

  // Kontrollera även alla frågor med dubbletter (samma parti > 1 gång)
  console.log("═".repeat(80));
  console.log("DUBBLETTER: Frågor med samma parti kopplade mer än en gång");
  console.log("═".repeat(80) + "\n");

  const allApproved = await prisma.question.findMany({
    where: { reviewStatus: "APPROVED" },
    include: {
      positions: {
        include: { position: { include: { party: { select: { shortName: true } } } } },
      },
    },
  });

  let dupCount = 0;
  for (const q of allApproved) {
    const partyPosMap: Record<string, Array<{ posId: string; value: number | null; specifik: string }>> = {};
    for (const qp of q.positions) {
      const sn = qp.position.party.shortName;
      if (!partyPosMap[sn]) partyPosMap[sn] = [];
      partyPosMap[sn].push({ posId: qp.positionId, value: qp.position.positionValue, specifik: qp.position.specificQuestion });
    }
    const dups = Object.entries(partyPosMap).filter(([, arr]) => arr.length > 1);
    if (dups.length > 0) {
      dupCount++;
      console.log(`  "${q.questionText.slice(0, 65)}"`);
      console.log(`  ID: ${q.id}`);
      for (const [party, arr] of dups) {
        for (const a of arr) {
          console.log(`    ${party}: posId=${a.posId.slice(-8)} val=${a.value} :: "${a.specifik.slice(0, 60)}"`);
        }
      }
      console.log();
    }
  }
  if (dupCount === 0) console.log("  Inga dubbletter hittades.\n");

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
