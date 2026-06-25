import "dotenv/config";
import { createClient } from "../lib/createClient";
const prisma = createClient();
async function main() {
  const qs = await prisma.question.findMany({ where: { reviewStatus: "PENDING" }, select: { id: true } });
  if (qs.length === 0) { console.log("Inga PENDING-frågor att rensa."); return; }
  for (const q of qs) await prisma.questionPosition.deleteMany({ where: { questionId: q.id } });
  const del = await prisma.question.deleteMany({ where: { reviewStatus: "PENDING" } });
  console.log(`Raderade ${del.count} PENDING-frågor.`);
  await prisma.$disconnect();
}
main().catch(console.error);
