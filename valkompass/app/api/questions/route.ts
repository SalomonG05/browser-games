import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const questions = await prisma.question.findMany({
    where: { reviewStatus: "APPROVED" },
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
            },
          },
        },
      },
    },
    orderBy: { topic: "asc" },
  });

  const formatted = questions.map((q) => ({
    id: q.id,
    topic: q.topic,
    questionText: q.questionText,
    description: q.description,
    weightingEnabled: q.weightingEnabled,
    positions: q.positions.map((qp) => qp.position),
  }));

  return NextResponse.json(formatted);
}
