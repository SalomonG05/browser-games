import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdatePositionSchema } from "@/lib/schemas";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = UpdatePositionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const position = await prisma.position.update({
    where: { id },
    data: {
      ...parsed.data,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(position);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const position = await prisma.position.findUnique({
    where: { id },
    include: {
      party: true,
      source: true,
    },
  });
  if (!position) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(position);
}
