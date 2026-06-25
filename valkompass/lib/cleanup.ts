import { prisma } from "@/lib/prisma";

type PositionRow = {
  id: string;
  partyId: string;
  specificQuestion: string;
  sourceQuote: string;
  sourceUrl: string;
  confidence: string;
  positionValue: number | null;
  reviewStatus: string;
  party: { website: string };
};

const CONFIDENCE_RANK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, UNKNOWN: 0 };

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    u.pathname = u.pathname.replace(/\/+$/, "");
    return u.toString().toLowerCase();
  } catch {
    return url.toLowerCase().replace(/[?#].*$/, "").replace(/\/+$/, "");
  }
}

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[^a-zåäö0-9\s]/gi, " ").replace(/\s+/g, " ").trim();
}

function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeText(a).split(" ").filter((w) => w.length > 2));
  const wordsB = new Set(normalizeText(b).split(" ").filter((w) => w.length > 2));
  if (wordsA.size < 2 || wordsB.size < 2) return 0;
  const intersection = [...wordsA].filter((w) => wordsB.has(w));
  if (intersection.length < 3) return 0;
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection.length / union;
}

function pickBetter(a: PositionRow, b: PositionRow): PositionRow {
  const ca = CONFIDENCE_RANK[a.confidence] ?? 0;
  const cb = CONFIDENCE_RANK[b.confidence] ?? 0;
  if (ca !== cb) return ca > cb ? a : b;
  if (a.sourceQuote.length !== b.sourceQuote.length) {
    return a.sourceQuote.length > b.sourceQuote.length ? a : b;
  }
  if (a.reviewStatus === "PENDING" && b.reviewStatus !== "PENDING") return a;
  if (b.reviewStatus === "PENDING" && a.reviewStatus !== "PENDING") return b;
  return a;
}

const SLOGAN_PATTERNS = [
  "tror på",
  "värnar om",
  "värnar ",
  "vi vill se ett",
  "vi tror",
  "strävar efter",
  "grundläggande värde",
  "grundläggande princip",
  "vår politik bygger",
  "vi är övertygade",
  "vi tror på",
  "ett samhälle där",
  "en politik som",
];

const WEAK_STARTERS = [
  "vad är ",
  "vilken roll ",
  "prioriterar ",
  "kan svenska",
  "kan vi ",
  "hur ser ",
  "varför ",
];

function isSlogan(quote: string): boolean {
  const lower = quote.toLowerCase();
  return SLOGAN_PATTERNS.some((s) => lower.includes(s));
}

function isWeakQuestion(q: string): boolean {
  const lower = q.toLowerCase().trim();
  return WEAK_STARTERS.some((s) => lower.startsWith(s));
}

export type CleanupResult = {
  duplicatesRemoved: number;
  flaggedNeedsReview: number;
  markedReady: number;
};

export async function runCleanup(): Promise<CleanupResult> {
  // ── 1. Deduplicate ────────────────────────────────────────────────────────
  const positions = await prisma.position.findMany({
    where: { reviewStatus: { notIn: ["APPROVED", "REJECTED"] } },
    include: { party: { select: { website: true } } },
  });

  const toDelete = new Set<string>();

  for (let i = 0; i < positions.length; i++) {
    if (toDelete.has(positions[i].id)) continue;
    for (let j = i + 1; j < positions.length; j++) {
      if (toDelete.has(positions[j].id)) continue;
      const a = positions[i];
      const b = positions[j];
      if (a.partyId !== b.partyId) continue;

      const sameQuote = normalizeText(a.sourceQuote) === normalizeText(b.sourceQuote);
      const similarQuestion = jaccardSimilarity(a.specificQuestion, b.specificQuestion) >= 0.65;

      if (sameQuote || similarQuestion) {
        const keep = pickBetter(a, b);
        toDelete.add(keep.id === a.id ? b.id : a.id);
      }
    }
  }

  let duplicatesRemoved = 0;
  for (const id of toDelete) {
    // Safety: never delete if linked to a question
    const refs = await prisma.questionPosition.count({ where: { positionId: id } });
    if (refs === 0) {
      await prisma.position.delete({ where: { id } });
      duplicatesRemoved++;
    }
  }

  // ── 2. Auto-flag NEEDS_REVIEW (only PENDING) ──────────────────────────────
  const pendingForReview = await prisma.position.findMany({
    where: { reviewStatus: "PENDING" },
    include: { party: { select: { website: true } } },
  });

  let flaggedNeedsReview = 0;

  for (const pos of pendingForReview) {
    const normalizedUrl = normalizeUrl(pos.sourceUrl);
    const isReportUrl =
      normalizedUrl.includes("/rapporter-och-dokument") ||
      normalizedUrl.includes("/rapporter/") ||
      normalizedUrl.includes("/rapport-");
    const quoteLooksLikeTitle = pos.sourceQuote.length < 80 && !pos.sourceQuote.includes(". ");

    const needsReview =
      pos.confidence === "LOW" ||
      pos.confidence === "MEDIUM" ||
      pos.sourceQuote.length < 60 ||
      (isReportUrl && quoteLooksLikeTitle) ||
      isWeakQuestion(pos.specificQuestion) ||
      isSlogan(pos.sourceQuote);

    if (needsReview) {
      await prisma.position.update({
        where: { id: pos.id },
        data: { reviewStatus: "NEEDS_REVIEW" },
      });
      flaggedNeedsReview++;
    }
  }

  // ── 3. Mark READY_FOR_APPROVAL (remaining PENDING only) ───────────────────
  const stillPending = await prisma.position.findMany({
    where: { reviewStatus: "PENDING" },
    include: { party: { select: { website: true } } },
  });

  let markedReady = 0;

  for (const pos of stillPending) {
    const partyWebsite = normalizeUrl(pos.party.website);
    const posUrl = normalizeUrl(pos.sourceUrl);
    const isOfficialSite = posUrl.startsWith(partyWebsite);
    const isConcreteQuestion = /^(bör|ska|borde|skall)\s/i.test(pos.specificQuestion.trim());

    if (
      pos.confidence === "HIGH" &&
      pos.sourceQuote.length > 60 &&
      pos.positionValue !== null &&
      isOfficialSite &&
      isConcreteQuestion
    ) {
      await prisma.position.update({
        where: { id: pos.id },
        data: { reviewStatus: "READY_FOR_APPROVAL" },
      });
      markedReady++;
    }
  }

  return { duplicatesRemoved, flaggedNeedsReview, markedReady };
}
