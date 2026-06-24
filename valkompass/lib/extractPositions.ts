import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";
import { ExtractedPositionSchema } from "./schemas";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Du är ett verktyg för politisk datainsamling. Din uppgift är att analysera officiellt politiskt källmaterial och extrahera partipositioner.

REGLER — läs noggrant:
1. Extrahera ENDAST positioner som har tydligt textstöd i det bifogade materialet.
2. Fyll INTE i luckor med din allmänna kunskap om partiet.
3. Varje position MÅSTE ha ett konkret källcitat — ett direkt citat ur texten (minst 10 ord).
4. Om citat saknas — skapa INGEN position.
5. Om texten är otydlig: sätt confidence = "LOW" och reviewStatus = "NEEDS_REVIEW".
6. Om du ser motstridiga signaler i texten: sätt conflictingSources = true.
7. positionValue är ett tal -2..+2 eller null om du inte kan avgöra med säkerhet.
   -2 = starkt emot, -1 = delvis emot, 0 = neutral/ingen tydlig åsikt, +1 = delvis för, +2 = starkt för
8. Returnera alltid giltig JSON — en array av positionsobjekt.
9. Skapa helst 3-10 tydliga positioner per källdokument, inte fler.

Tillåtna sakområden (topic): ekonomi, skatter, jobb, skola, vård, klimat, energi, migration, lag_ordning, bostäder, försvar, eu, landsbygd, jämställdhet, socialförsäkring.
Om du hittar ett tydligt politiskt ämne som inte passar i ovan: lägg det som topic och sätt reviewStatus = "NEEDS_REVIEW".

Returformat (JSON-array):
[
  {
    "topic": "energi",
    "specificQuestion": "Bör Sverige bygga ny kärnkraft?",
    "summary": "Partiet förespråkar utbyggnad av ny kärnkraft som en del av energiomställningen.",
    "positionValue": 2,
    "confidence": "HIGH",
    "sourceQuote": "Vi vill se nya kärnkraftverk byggas i Sverige för att säkra en fossilfri elförsörjning.",
    "aiInterpretation": "Texten uttrycker ett tydligt och positivt stöd för ny kärnkraft med argumentet om fossilfri el.",
    "reviewStatus": "PENDING",
    "conflictingSources": false
  }
]`;

export type ExtractResult = {
  saved: number;
  skipped: number;
  errors: string[];
};

export async function extractPositions(sourceId: string): Promise<ExtractResult> {
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    include: { party: true },
  });
  if (!source) throw new Error(`Source ${sourceId} not found`);

  const maxChars = 12000;
  const text = source.rawText.slice(0, maxChars);

  const userMessage = `Analysera följande text från ${source.party.name} (${source.party.shortName}).
Källa: ${source.url}
Hämtad: ${source.fetchedAt.toISOString().split("T")[0]}

TEXT:
${text}

Extrahera partipositioner som JSON-array enligt instruktionerna.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  let raw = content.text.trim();
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) raw = jsonMatch[1].trim();
  const arrayMatch = raw.match(/\[[\s\S]*\]/);
  if (arrayMatch) raw = arrayMatch[0];

  let parsed: unknown[];
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${raw.slice(0, 200)}`);
  }

  if (!Array.isArray(parsed)) throw new Error("Claude response is not an array");

  const result: ExtractResult = { saved: 0, skipped: 0, errors: [] };

  for (const item of parsed) {
    const validation = ExtractedPositionSchema.safeParse(item);
    if (!validation.success) {
      result.skipped++;
      result.errors.push(`Validation failed: ${validation.error.message}`);
      continue;
    }
    const p = validation.data;
    if (!p.sourceQuote || p.sourceQuote.trim().length < 10) {
      result.skipped++;
      result.errors.push(`Skipped: no source quote for "${p.specificQuestion}"`);
      continue;
    }

    await prisma.position.create({
      data: {
        partyId: source.partyId,
        sourceId: source.id,
        topic: p.topic,
        specificQuestion: p.specificQuestion,
        summary: p.summary,
        positionValue: p.positionValue,
        confidence: p.confidence,
        sourceQuote: p.sourceQuote,
        sourceUrl: source.url,
        aiInterpretation: p.aiInterpretation,
        reviewStatus: p.reviewStatus,
        conflictingSources: p.conflictingSources,
      },
    });
    result.saved++;
  }

  return result;
}
