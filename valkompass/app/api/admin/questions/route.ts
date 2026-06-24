import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const questions = await prisma.question.findMany({
    include: {
      positions: {
        include: {
          position: {
            select: { partyId: true, positionValue: true, party: { select: { shortName: true } } },
          },
        },
      },
    },
    orderBy: [{ reviewStatus: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(questions);
}
