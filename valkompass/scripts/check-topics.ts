import "dotenv/config";
import { createClient } from "../lib/createClient";
const prisma = createClient();
async function main() {
  const topics = await prisma.position.findMany({
    where: { reviewStatus: "PENDING", confidence: "HIGH", partyId: { notIn: ["moderaterna"] } },
    select: { topic: true, partyId: true },
  });
  const byParty: Record<string, Set<string>> = {};
  for (const t of topics) {
    if (!byParty[t.partyId]) byParty[t.partyId] = new Set();
    byParty[t.partyId].add(t.topic);
  }
  const allTopics = [...new Set(topics.map(t => t.topic))].sort();
  console.log("Alla topics (pending/high, exkl M):", allTopics.join(", "));
  for (const [p, ts] of Object.entries(byParty)) {
    console.log(p.substring(0,6), [...ts].sort().join(", "));
  }
  await prisma.$disconnect();
}
main().catch(console.error);
