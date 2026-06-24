import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateQuestionSchema = z.object({
  reviewStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  questionText: z.string().min(1).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = UpdateQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const question = await prisma.question.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(question);
}
