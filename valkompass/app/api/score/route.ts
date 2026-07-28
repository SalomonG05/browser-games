import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreAnswers } from "@/lib/scoring";
import { ScoreRequestSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = ScoreRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const questionIds = parsed.data.answers.map((a) => a.questionId);

  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds }, reviewStatus: "APPROVED" },
    include: {
      positions: {
        include: {
          position: {
            select: {
              partyId: true,
              positionValue: true,
              sourceUrl: true,
              sourceQuote: true,
              summary: true,
              reviewStatus: true,
            },
          },
        },
      },
    },
  });

  const formattedQuestions = questions.map((q) => ({
    id: q.id,
    topic: q.topic,
    questionText: q.questionText,
    positions: q.positions
      .filter((qp) => qp.position.reviewStatus === "APPROVED" && (qp.questionPositionValue ?? qp.position.positionValue) !== null)
      .map((qp) => ({
        partyId: qp.position.partyId,
        positionValue: (qp.questionPositionValue ?? qp.position.positionValue) as number,
        sourceUrl: qp.position.sourceUrl,
        sourceQuote: qp.position.sourceQuote,
        summary: qp.position.summary,
      })),
  }));

  const scores = scoreAnswers(parsed.data.answers, formattedQuestions);

  const parties = await prisma.party.findMany();
  const partyMap = new Map(parties.map((p) => [p.id, p]));

  const enriched = scores.map((score) => ({
    ...score,
    party: partyMap.get(score.partyId) ?? {
      id: score.partyId,
      name: score.partyId,
      shortName: "?",
      website: "",
    },
  }));

  return NextResponse.json({ scores: enriched, totalQuestions: questions.length });
}
