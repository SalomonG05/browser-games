import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deduplicateForExport, normalizeUrl, CONFIDENCE_RANK } from "@/lib/cleanup";

// ── Question quality scoring (existing) ──────────────────────────────────────

const CONF_SCORE: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, UNKNOWN: 0 };

function questionQualityScore(positions: Array<{ positionValue: number | null; confidence: string; conflictingSources: boolean }>): number {
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

// ── Position quality scoring ──────────────────────────────────────────────────

function positionScore(p: {
  confidence: string;
  sourceQuote: string;
  positionValue: number | null;
  conflictingSources: boolean;
}): number {
  const confScore = CONFIDENCE_RANK[p.confidence] ?? 0;
  const quoteScore = Math.min(p.sourceQuote.length / 80, 3);
  const valueScore = p.positionValue !== null ? 1 : 0;
  const conflictPenalty = p.conflictingSources ? -2 : 0;
  return confScore * 5 + quoteScore * 2 + valueScore * 1 + conflictPenalty;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "positions";

  // ── Positions export ────────────────────────────────────────────────────────
  if (type === "positions") {
    const confidence      = searchParams.get("confidence") || undefined;
    const reviewStatus    = searchParams.get("reviewStatus") || undefined;
    const topic           = searchParams.get("topic") || undefined;
    const partyId         = searchParams.get("partyId") || undefined;
    const excludeDupes    = searchParams.get("excludeDuplicates") === "true";
    const onlyConcrete    = searchParams.get("onlyConcrete") === "true";
    const officialOnly    = searchParams.get("officialOnly") === "true";
    const maxCount        = parseInt(searchParams.get("maxCount") ?? "60", 10);

    let positions = await prisma.position.findMany({
      where: {
        ...(confidence    && { confidence }),
        ...(reviewStatus  && { reviewStatus }),
        ...(topic         && { topic }),
        ...(partyId       && { partyId }),
      },
      include: {
        party: { select: { name: true, shortName: true, website: true } },
        source: { select: { url: true, title: true, sourceType: true } },
      },
      orderBy: [{ topic: "asc" }, { partyId: "asc" }],
    });

    // "Bör"-filter: only concrete Bör/Ska questions
    if (onlyConcrete) {
      positions = positions.filter((p) =>
        /^(bör|ska|borde|skall)\s/i.test(p.specificQuestion.trim())
      );
    }

    // Official-only filter: sourceUrl must start with party website
    if (officialOnly) {
      positions = positions.filter((p) => {
        const posUrl   = normalizeUrl(p.sourceUrl);
        const siteUrl  = normalizeUrl(p.party.website);
        return posUrl.startsWith(siteUrl);
      });
    }

    // Deduplicate
    if (excludeDupes) {
      positions = deduplicateForExport(positions) as typeof positions;
    }

    // Sort by quality descending, then cap
    positions = positions
      .sort((a, b) => positionScore(b) - positionScore(a))
      .slice(0, maxCount);

    return NextResponse.json(positions);
  }

  // ── Questions export (unchanged) ────────────────────────────────────────────
  const reviewStatus = searchParams.get("reviewStatus") || undefined;
  const topic        = searchParams.get("topic") || undefined;
  const top40        = searchParams.get("top40") === "true";

  const questions = await prisma.question.findMany({
    where: {
      ...(reviewStatus && { reviewStatus }),
      ...(topic        && { topic }),
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
    return NextResponse.json(
      questions
        .map((q) => ({ q, score: questionQualityScore(q.positions.map((qp) => qp.position)) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 40)
        .map(({ q }) => q)
    );
  }

  return NextResponse.json(questions);
}
