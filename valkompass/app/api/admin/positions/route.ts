import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const partyId = searchParams.get("partyId") ?? undefined;
  const topic = searchParams.get("topic") ?? undefined;
  const reviewStatus = searchParams.get("reviewStatus") ?? undefined;

  const positions = await prisma.position.findMany({
    where: {
      ...(partyId && { partyId }),
      ...(topic && { topic }),
      ...(reviewStatus && { reviewStatus }),
    },
    include: {
      party: { select: { name: true, shortName: true } },
      source: { select: { url: true, title: true, fetchedAt: true, sourceType: true } },
    },
    orderBy: [{ reviewStatus: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(positions);
}
