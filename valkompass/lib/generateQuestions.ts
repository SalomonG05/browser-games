import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type PositionGroup = {
  topic: string;
  specificQuestion: string;
  positions: Array<{ partyId: string; positionValue: number }>;
  stdDev: number;
};

function calcStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

async function neutralizeQuestion(question: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Formulera om följande fråga så att den är neutral och inte ledande.
Frågan ska börja med "Bör" eller "Ska". Svara med BARA frågetexten, inget annat.
Undvik värdeladdade ord som "äntligen", "slösa", "stoppa" etc.

Fråga: ${question}`,
      },
    ],
  });
  const content = msg.content[0];
  return content.type === "text" ? content.text.trim() : question;
}

export type GenerateResult = {
  created: number;
  skipped: number;
  details: string[];
};

export async function generateQuestions(): Promise<GenerateResult> {
  const approvedPositions = await prisma.position.findMany({
    where: {
      reviewStatus: "APPROVED",
      positionValue: { not: null },
    },
    select: { id: true, topic: true, specificQuestion: true, positionValue: true, partyId: true },
  });

  const groups = new Map<string, PositionGroup>();
  for (const pos of approvedPositions) {
    const key = `${pos.topic}|||${pos.specificQuestion}`;
    if (!groups.has(key)) {
      groups.set(key, { topic: pos.topic, specificQuestion: pos.specificQuestion, positions: [], stdDev: 0 });
    }
    groups.get(key)!.positions.push({ partyId: pos.partyId, positionValue: pos.positionValue! });
  }

  for (const group of groups.values()) {
    group.stdDev = calcStdDev(group.positions.map((p) => p.positionValue));
  }

  const candidates = [...groups.values()].filter(
    (g) => g.positions.length >= 2 && g.stdDev > 0.5
  );

  const result: GenerateResult = { created: 0, skipped: 0, details: [] };

  for (const candidate of candidates) {
    const existing = await prisma.question.findFirst({
      where: { topic: candidate.topic, questionText: candidate.specificQuestion },
    });
    if (existing) {
      result.skipped++;
      result.details.push(`Already exists: ${candidate.specificQuestion}`);
      continue;
    }

    const questionText = await neutralizeQuestion(candidate.specificQuestion);

    const question = await prisma.question.create({
      data: {
        topic: candidate.topic,
        questionText,
        description: `Baserad på ${candidate.positions.length} partipositioner. Standardavvikelse: ${candidate.stdDev.toFixed(2)}`,
        reviewStatus: "PENDING",
      },
    });

    const positionIds = await prisma.position.findMany({
      where: {
        reviewStatus: "APPROVED",
        topic: candidate.topic,
        specificQuestion: candidate.specificQuestion,
        positionValue: { not: null },
      },
      select: { id: true },
    });

    await prisma.questionPosition.createMany({
      data: positionIds.map((p) => ({ questionId: question.id, positionId: p.id })),
    });

    result.created++;
    result.details.push(`Created: "${questionText}" (${candidate.positions.length} parties, stddev=${candidate.stdDev.toFixed(2)})`);
  }

  return result;
}
