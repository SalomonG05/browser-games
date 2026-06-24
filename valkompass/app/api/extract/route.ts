import { NextRequest, NextResponse } from "next/server";
import { extractPositions } from "@/lib/extractPositions";
import { ExtractRequestSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = ExtractRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const result = await extractPositions(parsed.data.sourceId);
  return NextResponse.json(result);
}
