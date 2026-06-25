/**
 * Visar statistik per parti och exporterar topp-60 för ChatGPT-granskning.
 * Exkluderar Moderaterna. Endast PENDING + HIGH + officiella källor.
 */

import "dotenv/config";
import { createClient } from "../lib/createClient";
import { CONFIDENCE_RANK, deduplicateForExport } from "../lib/cleanup";

const prisma = createClient();

const EXCLUDED_PARTIES = ["moderaterna"];
const PARTY_ORDER = ["socialdemokraterna", "vansterpartiet", "kristdemokraterna",
                     "liberalerna", "sverigedemokraterna", "centerpartiet", "miljopartiet"];

const OFFICIAL_DOMAINS = [
  "socialdemokraterna.se", "vansterpartiet.se", "kristdemokraterna.se",
  "liberalerna.se", "sd.se", "centerpartiet.se", "mp.se",
  "moderaterna.se", "sverigedemokraterna.se",
];

function isOfficialSource(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}

function isConcrete(text: string | null): boolean {
  if (!text) return false;
  const t = text.trim().toLowerCase();
  return /^(bör|ska|borde|skall|vill|kräver|behöver)\b/.test(t);
}

function positionScore(p: {
  confidence: string;
  sourceQuote: string;
  positionValue: number | null;
  conflictingSources: boolean;
}): number {
  const confScore  = CONFIDENCE_RANK[p.confidence] ?? 0;
  const quoteLen   = p.sourceQuote?.length ?? 0;
  const valueScore = p.positionValue != null ? 1 : 0;
  const conflict   = p.conflictingSources ? 2 : 0;
  return confScore * 5 + Math.min(quoteLen / 80, 3) * 2 + valueScore - conflict;
}

async function main() {
  const parties = await prisma.party.findMany({ select: { id: true, name: true, shortName: true } });

  // ── 1. Sources ──────────────────────────────────────────────────────────────
  const sourcesTotal = await prisma.source.count();
  console.log(`\n${"═".repeat(60)}`);
  console.log("VALKOMPASS — STATISTIKRAPPORT EFTER RIKTAD CRAWL");
  console.log(`${"═".repeat(60)}`);
  console.log(`\nTotalt antal crawlade sidor i databasen: ${sourcesTotal}`);

  // ── 2. Positions per status per party ───────────────────────────────────────
  const statuses = ["APPROVED", "PENDING", "NEEDS_REVIEW", "REJECTED", "READY_FOR_APPROVAL", "NEEDS_MORE_SOURCE"];
  const allGroups = await prisma.position.groupBy({
    by: ["partyId", "reviewStatus"],
    _count: { id: true },
  });

  type Row = { id: string; name: string; shortName: string } & Record<string, number>;
  const rows: Row[] = parties.map((p) => {
    const r: Row = { ...p } as Row;
    for (const s of statuses) r[s] = 0;
    return r;
  });

  for (const g of allGroups) {
    const row = rows.find((r) => r.id === g.partyId);
    if (row) row[g.reviewStatus] = (row[g.reviewStatus] ?? 0) + g._count.id;
  }

  console.log("\n── Positioner per parti och status ──────────────────────────────");
  console.log("Parti      APPR  PEND  NR    READT REJTD  TOT");
  console.log("─".repeat(52));

  const included = [...rows]
    .sort((a, b) => {
      const ai = PARTY_ORDER.indexOf(a.id);
      const bi = PARTY_ORDER.indexOf(b.id);
      if (ai !== -1 && bi !== -1) return ai - bi;
      return ai === -1 ? 1 : -1;
    });

  let totAp = 0, totPe = 0, totNr = 0, totRd = 0, totRj = 0;
  for (const r of included) {
    const ap = r["APPROVED"] ?? 0;
    const pe = r["PENDING"] ?? 0;
    const nr = r["NEEDS_REVIEW"] ?? 0;
    const rd = r["READY_FOR_APPROVAL"] ?? 0;
    const rj = r["REJECTED"] ?? 0;
    const tot = ap + pe + nr + rd + rj + (r["NEEDS_MORE_SOURCE"] ?? 0);
    const excl = EXCLUDED_PARTIES.includes(r.id) ? " (exkl.)" : "";
    console.log(
      r.shortName.padEnd(10) +
      String(ap).padStart(5) +
      String(pe).padStart(6) +
      String(nr).padStart(6) +
      String(rd).padStart(6) +
      String(rj).padStart(6) +
      String(tot).padStart(6) +
      excl,
    );
    totAp += ap; totPe += pe; totNr += nr; totRd += rd; totRj += rj;
  }
  console.log("─".repeat(52));
  const grandTot = totAp + totPe + totNr + totRd + totRj;
  console.log("TOTALT    " +
    String(totAp).padStart(5) + String(totPe).padStart(6) +
    String(totNr).padStart(6) + String(totRd).padStart(6) +
    String(totRj).padStart(6) + String(grandTot).padStart(6));

  // ── 3. HIGH confidence PENDING per party ────────────────────────────────────
  const highPending = await prisma.position.groupBy({
    by: ["partyId"],
    where: { reviewStatus: "PENDING", confidence: "HIGH" },
    _count: { id: true },
  });
  const hpMap = Object.fromEntries(highPending.map((c) => [c.partyId, c._count.id]));

  console.log("\n── HIGH-confidence PENDING per parti ────────────────────────────");
  for (const pId of PARTY_ORDER) {
    const p = parties.find((x) => x.id === pId);
    if (!p) continue;
    const n = hpMap[pId] ?? 0;
    const bar = "▓".repeat(Math.min(n, 30));
    const flag = n >= 8 ? "  ✓ bra" : n >= 5 ? "  ~ ok" : n > 0 ? "  ⚠ lite" : "  ✗ SAKNAS";
    console.log(`  ${p.shortName.padEnd(5)} ${String(n).padStart(3)}  ${bar}${flag}`);
  }

  // ── 4. Bedömning ─────────────────────────────────────────────────────────────
  console.log("\n── Partibedömning ───────────────────────────────────────────────");
  for (const pId of PARTY_ORDER) {
    const p = parties.find((x) => x.id === pId);
    if (!p) continue;
    const hp = hpMap[pId] ?? 0;
    const r = rows.find((x) => x.id === pId)!;
    const ap = r["APPROVED"] ?? 0;
    if (ap + hp >= 8) {
      console.log(`  ${p.shortName}: ✓ tillräckligt (${ap} godkända + ${hp} HIGH pending)`);
    } else if (ap + hp >= 5) {
      console.log(`  ${p.shortName}: ~ gränsfall (${ap} godkända + ${hp} HIGH pending)`);
    } else {
      console.log(`  ${p.shortName}: ✗ underpresenterat (${ap} godkända + ${hp} HIGH pending)`);
    }
  }

  // ── 5. Export för ChatGPT-granskning ─────────────────────────────────────────
  console.log("\n\n" + "═".repeat(60));
  console.log("EXPORT FÖR CHATGPT-GRANSKNING — topp 60 (exkl. M)");
  console.log("═".repeat(60));
  console.log("Filter: PENDING + HIGH + officiella källor + konkreta frågor");
  console.log("─".repeat(60));

  const candidates = await prisma.position.findMany({
    where: {
      reviewStatus: "PENDING",
      confidence:   "HIGH",
      partyId:      { notIn: EXCLUDED_PARTIES },
    },
    select: {
      id: true, partyId: true, topic: true, summary: true,
      specificQuestion: true, positionValue: true, confidence: true,
      sourceQuote: true, sourceUrl: true, aiInterpretation: true,
      conflictingSources: true,
    },
  });

  // Filtrera officiella + konkreta
  const filtered = candidates
    .filter((p) => isOfficialSource(p.sourceUrl))
    .filter((p) => isConcrete(p.specificQuestion));

  // Sortera efter score
  const scored = filtered
    .map((p) => ({ ...p, score: positionScore({ confidence: p.confidence, sourceQuote: p.sourceQuote, positionValue: p.positionValue, conflictingSources: p.conflictingSources }) }))
    .sort((a, b) => b.score - a.score);

  // Deduplicate in-memory
  const deduped = deduplicateForExport(scored);
  const top60   = deduped.slice(0, 60);

  console.log(`\nKandidater: ${candidates.length}  → officiella: ${filtered.length}  → dedup: ${deduped.length}  → export: ${top60.length}\n`);

  // Distribution per party
  const dist: Record<string, number> = {};
  for (const p of top60) dist[p.partyId] = (dist[p.partyId] ?? 0) + 1;
  console.log("Fördelning per parti i exporten:");
  for (const pId of PARTY_ORDER) {
    const p = parties.find((x) => x.id === pId);
    if (!p) continue;
    const n = dist[pId] ?? 0;
    if (n > 0) console.log(`  ${p.shortName.padEnd(5)} ${n}`);
  }

  console.log("\n" + "─".repeat(60));
  console.log("MARKDOWN-EXPORT (kopiera till ChatGPT)");
  console.log("─".repeat(60) + "\n");

  for (let i = 0; i < top60.length; i++) {
    const p = top60[i];
    const party = parties.find((x) => x.id === p.partyId);
    console.log(`### Position ${i + 1}`);
    console.log(`**position_id**: ${p.id}`);
    console.log(`**parti**: ${party?.name ?? p.partyId}`);
    console.log(`**ämne**: ${p.topic}`);
    console.log(`**fråga**: ${p.specificQuestion ?? p.summary}`);
    console.log(`**position_value**: ${p.positionValue ?? "(saknas)"}`);
    console.log(`**confidence**: ${p.confidence}`);
    console.log(`**källcitat**: "${p.sourceQuote}"`);
    console.log(`**source_url**: ${p.sourceUrl}`);
    if (p.aiInterpretation) console.log(`**ai_tolkning**: ${p.aiInterpretation}`);
    console.log();
  }

  console.log("─".repeat(60));
  console.log(`Totalt: ${top60.length} positioner exporterade.`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
