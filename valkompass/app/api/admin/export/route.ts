import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CONF_SCORE: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, UNKNOWN: 0 };

function qualityScore(positions: Array<{ positionValue: number | null; confidence: string; conflictingSources: boolean }>): number {
  const values = positions.map((p) => p.positionValue).filter((v): v is number => v !== null);
  const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const stddev = values.length > 1
    ? Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length)
    : 0;
  const avgConf = positions.length > 0
    ? positions.reduce((a, p) => a + (CONF_SCORE[p.confidence] ?? 1), 0) / positions.length
    : 0;
  const conflicts = positions.filter((p) => p.conflictingSources).length;
  return positions.length * 15 + avgConf * 10 + stddev * 8 - conflicts * 5;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "questions";
  const reviewStatus = searchParams.get("reviewStatus") || undefined;
  const topic = searchParams.get("topic") || undefined;
  const partyId = searchParams.get("partyId") || undefined;
  const top40 = searchParams.get("top40") === "true";

  if (type === "positions") {
    const positions = await prisma.position.findMany({
      where: {
        ...(reviewStatus && { reviewStatus }),
        ...(topic && { topic }),
        ...(partyId && { partyId }),
      },
      include: {
        party: { select: { name: true, shortName: true } },
        source: { select: { url: true, title: true, sourceType: true } },
      },
      orderBy: [{ topic: "asc" }, { partyId: "asc" }],
    });
    return NextResponse.json(positions);
  }

  // type === "questions"
  const questions = await prisma.question.findMany({
    where: {
      ...(reviewStatus && { reviewStatus }),
      ...(topic && { topic }),
    },
    include: {
      positions: {
        include: {
          position: {
            select: {
              id: true,
              partyId: true,
              positionValue: true,
              summary: true,
              sourceQuote: true,
              sourceUrl: true,
              confidence: true,
              aiInterpretation: true,
              reviewStatus: true,
              conflictingSources: true,
              party: { select: { shortName: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ reviewStatus: "asc" }, { topic: "asc" }],
  });

  if (top40) {
    const scored = questions
      .map((q) => ({ q, score: qualityScore(q.positions.map((qp) => qp.position)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)
      .map(({ q }) => q);
    return NextResponse.json(scored);
  }

  return NextResponse.json(questions);
}
