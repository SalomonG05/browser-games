import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [allPositions, parties] = await Promise.all([
    prisma.position.findMany({
      select: {
        id: true,
        partyId: true,
        topic: true,
        reviewStatus: true,
        sourceQuote: true,
        specificQuestion: true,
      },
    }),
    prisma.party.findMany({ select: { id: true, name: true, shortName: true } }),
  ]);

  // Status counts
  const byStatus: Record<string, number> = {};
  for (const p of allPositions) {
    byStatus[p.reviewStatus] = (byStatus[p.reviewStatus] ?? 0) + 1;
  }

  // Per-party counts (exclude rejected)
  const nonRejected = allPositions.filter((p) => p.reviewStatus !== "REJECTED");
  const partyCountMap: Record<string, number> = {};
  for (const p of nonRejected) {
    partyCountMap[p.partyId] = (partyCountMap[p.partyId] ?? 0) + 1;
  }
  const total = nonRejected.length;
  const partyIndex = Object.fromEntries(parties.map((p) => [p.id, p]));

  const byParty = Object.entries(partyCountMap)
    .map(([partyId, count]) => ({
      partyId,
      name: partyIndex[partyId]?.name ?? partyId,
      shortName: partyIndex[partyId]?.shortName ?? partyId,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Per-topic counts (exclude rejected)
  const topicCountMap: Record<string, number> = {};
  for (const p of nonRejected) {
    topicCountMap[p.topic] = (topicCountMap[p.topic] ?? 0) + 1;
  }
  const byTopic = Object.entries(topicCountMap)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count);

  // Rough duplicate estimate: same partyId + identical normalized quote
  const seen = new Set<string>();
  let duplicateEstimate = 0;
  for (let i = 0; i < allPositions.length; i++) {
    if (allPositions[i].reviewStatus === "REJECTED") continue;
    const a = allPositions[i];
    for (let j = i + 1; j < allPositions.length; j++) {
      if (allPositions[j].reviewStatus === "REJECTED") continue;
      const b = allPositions[j];
      if (a.partyId !== b.partyId) continue;
      if (seen.has(b.id)) continue;
      if (a.sourceQuote.toLowerCase().trim() === b.sourceQuote.toLowerCase().trim()) {
        seen.add(b.id);
        duplicateEstimate++;
      }
    }
  }

  // Balance warning
  let balanceWarning: string | null = null;
  if (byParty.length > 0 && total > 0) {
    const maxPct = byParty[0].pct;
    const minCount = Math.min(...byParty.map((p) => p.count));
    const maxCount = byParty[0].count;
    if (maxPct > 30) {
      balanceWarning = `${byParty[0].shortName} dominerar med ${maxPct}% av positionerna (${maxCount}/${total}). Valkompassen riskerar att bli skev om inte övriga partier balanseras upp.`;
    } else if (minCount > 0 && maxCount / minCount > 5) {
      balanceWarning = `Stor obalans: ${byParty[0].shortName} har ${maxCount} positioner, minst representerade parti har ${minCount}. Kör ny crawl för underrepresenterade partier.`;
    }
  }

  return NextResponse.json({ byStatus, byParty, byTopic, duplicateEstimate, balanceWarning });
}
