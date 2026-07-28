import "dotenv/config";
import { createClient } from "../lib/createClient";
const prisma = createClient();

async function run() {
  await prisma.question.update({
    where: { id: "cmqtosgda0000wwvhlsqx1mil" },
    data: {
      reviewStatus: "NEEDS_REVIEW",
      description: "Datafix 2026-07-28: MP-länk borttagen (felkoppling), nu bara 1 parti (SD) — behöver omarbetas",
    },
  });
  console.log("✓ #37 satt till NEEDS_REVIEW");

  const qs = await prisma.question.findMany({
    where: { reviewStatus: "APPROVED" },
    include: { positions: { include: { position: { select: { partyId: true } } } } },
  });
  let changed = 0;
  for (const q of qs) {
    const partyCount = new Set(q.positions.map(qp => qp.position.partyId)).size;
    const shouldBeWeak = partyCount <= 2;
    if (shouldBeWeak !== q.weak) {
      await prisma.question.update({ where: { id: q.id }, data: { weak: shouldBeWeak } });
      changed++;
    }
  }
  console.log(`✓ weak-flaggor omräknade, ${changed} ändrade`);

  const total = await prisma.question.count({ where: { reviewStatus: "APPROVED" } });
  const weak  = await prisma.question.count({ where: { reviewStatus: "APPROVED", weak: true } });
  console.log(`APPROVED: ${total}, starka: ${total - weak}, svaga: ${weak}`);

  await prisma.$disconnect();
}

run().catch(console.error);
