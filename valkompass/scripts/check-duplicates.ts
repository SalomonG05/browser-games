import "dotenv/config";
import { createClient } from "../lib/createClient";

const prisma = createClient();

const CHECK_IDS = [
  "lpshtdvz", // Bör Sverige prioritera ambitiösa klimatsatsningar och klimatmål?
  "9xv58cbm", // Bör Sverige prioritera ambitiösa klimatsatsningar även när de kräver offentliga resurser?
  "611kpbkc", // Bör EU ha en ambitiös gemensam klimatpolitik kombinerad med tillväxt?
  "qkfnldb2", // Bör EU föra en ambitiös klimatpolitik med höga utsläppsmål?
  "nknobjdc", // Bör byråkratin och reglerna kring bygglov förenklas?
  "cq9gsw5k", // Bör regler och processer för bygglov förenklas för att fler bostäder ska kunna byggas?
  "8pq8valc", // Bör staten ta en aktiv roll och finansiera bostadsbyggande direkt?
  "ep68egks", // Bör staten ta en aktiv roll i att finansiera och bygga fler hyresrätter?
];

async function main() {
  const parties = await prisma.party.findMany({ select: { id: true, shortName: true } });
  const partyMap = Object.fromEntries(parties.map(p => [p.id, p.shortName]));

  const qs = await prisma.question.findMany({
    where: { id: { in: CHECK_IDS.map(s => { const q = s.length === 8 ? s : s; return s; }) } },
    include: {
      positions: {
        include: {
          position: { select: { partyId: true, specificQuestion: true } },
        },
      },
    },
  });

  // Match suffix IDs
  const allQs = await prisma.question.findMany({
    where: { reviewStatus: "APPROVED" },
    include: {
      positions: {
        include: {
          position: { select: { partyId: true, specificQuestion: true } },
        },
      },
    },
  });

  const targets = allQs.filter(q => CHECK_IDS.some(suffix => q.id.endsWith(suffix)));

  for (const q of targets) {
    const partySet = [...new Set(q.positions.map(qp => partyMap[qp.position.partyId] ?? qp.position.partyId))];
    const vals = q.positions.map(qp => `${partyMap[qp.position.partyId]}=${qp.questionPositionValue ?? "(pos.val)"}`);
    console.log(`\n${"─".repeat(70)}`);
    console.log(`ID:      ${q.id}`);
    console.log(`Fråga:   ${q.questionText}`);
    console.log(`Partier: ${partySet.join(", ")}`);
    console.log(`Värden:  ${vals.join(", ")}`);
    console.log(`Status:  ${q.reviewStatus} | weak=${q.weak}`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
