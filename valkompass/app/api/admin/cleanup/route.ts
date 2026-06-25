import { NextResponse } from "next/server";
import { runCleanup } from "@/lib/cleanup";

export async function POST() {
  try {
    const result = await runCleanup();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
