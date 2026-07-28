import "dotenv/config";
import { createClient } from "../lib/createClient";
const prisma = createClient();

const QUESTION_IDS = [
  "cmqtosgda0000wwvhlsqx1mil",
  "cmqtoskh30009wwvhkxl9ji49",
  "cmqtoszzl000uwwvhfsoqgys8",
  "cmqtot6x20011wwvhbvgllz2f",
  "cmrcfslke0002wsvh8dceifzb",
  "cmrcfsll80004wsvht7gwm7tf",
  "cmrcft0sc0006wsvhojr3jcj3",
  "cmrcfu0um000bwsvh6hmp2aov",
  "cmrcfv70q000iwsvhy5tz5bv1",
  "cmrcfvi7j000jwsvhnknobjdc",
  "cmrcfvi81000kwsvh8pq8valc",
  "cmqtot00y000vwwvhsh52ys2k",
  "cmrcfslkv0003wsvhy5in0ruh",
];

async function run() {
  const qs = await prisma.question.findMany({
    where: { id: { in: QUESTION_IDS } },
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

  for (const q of qs) {
    const partyMap: Record<string, Array<{ posId: string; spec: string }>> = {};
    for (const qp of q.positions) {
      const sn = qp.position.party.shortName;
      if (!partyMap[sn]) partyMap[sn] = [];
      partyMap[sn].push({ posId: qp.positionId, spec: qp.position.specificQuestion });
    }
    const dups = Object.entries(partyMap).filter(([, arr]) => arr.length > 1);
    if (dups.length > 0) {
      console.log(`\n${q.id}`);
      console.log(`"${q.questionText.slice(0, 65)}"`);
      for (const [party, arr] of dups) {
        for (const a of arr) {
          console.log(`  ${party} ${a.posId}  "${a.spec.slice(0, 55)}"`);
        }
      }
    }
  }
  await prisma.$disconnect();
}

run().catch(console.error);
