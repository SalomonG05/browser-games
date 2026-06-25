import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const result = await prisma.position.updateMany({
      where: { reviewStatus: "READY_FOR_APPROVAL" },
      data: { reviewStatus: "APPROVED" },
    });
    return NextResponse.json({ approved: result.count });
  } catch (error) {
    console.error("Approve ready error:", error);
    return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
  }
}
