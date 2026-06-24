import { NextResponse } from "next/server";
import { generateQuestions } from "@/lib/generateQuestions";

export async function POST() {
  const result = await generateQuestions();
  return NextResponse.json(result);
}
