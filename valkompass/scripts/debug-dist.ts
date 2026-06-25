import "dotenv/config";
import { createClient } from "../lib/createClient";
import { deduplicateForExport, CONFIDENCE_RANK } from "../lib/cleanup";
const prisma = createClient();

function isOfficial(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return ["sd.se","socialdemokraterna.se","vansterpartiet.se","kristdemokraterna.se",
            "liberalerna.se","centerpartiet.se","mp.se"].some(d => host === d || host.endsWith("." + d));
  } catch { return false; }
}
function isConcrete(q: string | null) {
  return /^(bör|ska|borde|skall|vill|kräver|behöver)\b/i.test(q ?? "");
}
function score(p: { confidence: string; sourceQuote: string; positionValue: number | null; conflictingSources: boolean }) {
  const c = CONFIDENCE_RANK[p.confidence] ?? 0;
  return c * 5 + Math.min((p.sourceQuote?.length ?? 0) / 80, 3) * 2 + (p.positionValue != null ? 1 : 0) - (p.conflictingSources ? 2 : 0);
}

async function main() {
  const all = await prisma.position.findMany({
    where: { reviewStatus: "PENDING", confidence: "HIGH", partyId: { notIn: ["moderaterna"] } },
    select: { id: true, partyId: true, specificQuestion: true, sourceQuote: true, positionValue: true, confidence: true, sourceUrl: true, conflictingSources: true },
  });
  const filtered = all.filter(p => isOfficial(p.sourceUrl) && isConcrete(p.specificQuestion));
  const scored = filtered.map(p => ({ ...p, score: score(p) })).sort((a, b) => b.score - a.score);
  const deduped = deduplicateForExport(scored);

  const dist: Record<string, number[]> = {};
  deduped.forEach((p, i) => { if (!dist[p.partyId]) dist[p.partyId] = []; dist[p.partyId].push(i + 1); });

  console.log("Deduplicerade positioner per parti:");
  const order = ["socialdemokraterna","vansterpartiet","kristdemokraterna","liberalerna","sverigedemokraterna","centerpartiet","miljopartiet"];
  for (const id of order) {
    const ranks = dist[id] ?? [];
    const inTop60 = ranks.filter(r => r <= 60).length;
    console.log(id.substring(0, 6).padEnd(8), "total:", ranks.length, " top60:", inTop60, " bästa:", ranks[0] ?? "-");
  }

  console.log("\nSD scores:");
  scored.filter(p => p.partyId === "sverigedemokraterna").forEach((p, i) =>
    console.log(" ", i + 1, "score=" + p.score.toFixed(1), p.specificQuestion?.slice(0, 70))
  );

  await prisma.$disconnect();
}
main().catch(console.error);
