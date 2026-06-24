import { NextRequest, NextResponse } from "next/server";
import { crawlPage } from "@/lib/crawler";
import { CrawlRequestSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = CrawlRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const result = await crawlPage(parsed.data.url, parsed.data.partyId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, url: result.url }, { status: 422 });
  }
  return NextResponse.json(result);
}
