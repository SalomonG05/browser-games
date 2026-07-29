/**
 * Rensa dubblettfrågor efter v3-granskning (2026-07-29).
 *
 * Behållna: v3-versioner (bättre formulering, korrektare SD-positioner)
 * Avvisade: v2-versioner (överlappande partier, sämre formulering)
 */

import "dotenv/config";
import { createClient } from "../lib/createClient";

const prisma = createClient();

const REJECT_AS_DUPLICATE: { id: string; reason: string; keptId: string }[] = [
  {
    id: "cmrcfvi7j000jwsvhnknobjdc",
    reason: "Dubblett: samma partier (M, KD, C) som v3-version cq9gsw5k. v3 bredare formulering.",
    keptId: "cms52w7zh0006ocvhcq9gsw5k",
  },
  {
    id: "cmrcfvi81000kwsvh8pq8valc",
    reason: "Dubblett: samma partier (S, V) som v3-version ep68egks. v3 mer konkret (hyresrätter).",
    keptId: "cms52w7z30005ocvhep68egks",
  },
  {
    id: "cmrcftcr90008wsvhlpshtdvz",
    reason: "Dubblett mot v3-version 9xv58cbm. v2 har 5 partier (inkl. S) men v3 har korrekt SD=-2 och tydligare kostnadsargument.",
    keptId: "cms52wkqg0007ocvh9xv58cbm",
  },
  {
    id: "cmrcftcrw0009wsvh611kpbkc",
    reason: "Dubblett mot v3-version qkfnldb2. v2 har bara 2 partier (M, L, weak). v3 täcker 3 partier (M, S, L) och starkare formulering.",
    keptId: "cms52wkr20008ocvhqkfnldb2",
  },
];

const TOPIC_LABEL: Record<string, string> = {
  migration:        "Migration och integration",
  ekonomi:          "Ekonomi",
  lag_ordning:      "Lag och ordning",
  brottslighet:     "Lag och ordning",
  klimat:           "Klimat och miljö",
  skola:            "Skola och utbildning",
  energi:           "Energi",
  försvar:          "Försvar och säkerhet",
  skatter:          "Skatter",
  jobb:             "Jobb och arbetsmarknad",
  bostäder:         "Bostäder",
  socialförsäkring: "Socialförsäkring och välfärd",
  eu:               "EU och utrikespolitik",
  jämställdhet:     "Jämställdhet",
  landsbygd:        "Landsbygd",
  näringsliv:       "Näringsliv",
};

const PARTY_ORDER = [
  "socialdemokraterna", "vansterpartiet", "kristdemokraterna",
  "liberalerna", "sverigedemokraterna", "centerpartiet", "miljopartiet", "moderaterna",
];

async function main() {
  console.log("Dubblettrensning — REJECTED (ersatta av v3-versioner)\n");

  const parties = await prisma.party.findMany({ select: { id: true, shortName: true } });
  const partyMap = Object.fromEntries(parties.map(p => [p.id, p]));

  // ── Sätt REJECTED ─────────────────────────────────────────────────────────
  console.log("AVVISAR DUBBLETTER");
  console.log("─".repeat(60));
  for (const r of REJECT_AS_DUPLICATE) {
    const q = await prisma.question.findUnique({ where: { id: r.id }, select: { id: true, questionText: true, reviewStatus: true } });
    if (!q) {
      console.warn(`  ⚠ Hittade inte ${r.id.slice(-8)}`);
      continue;
    }
    await prisma.question.update({
      where: { id: r.id },
      data: { reviewStatus: "REJECTED", description: r.reason },
    });
    console.log(`  ✗ ${r.id.slice(-8)}: REJECTED`);
    console.log(`    Fråga:   "${q.questionText}"`);
    console.log(`    Behölls: ${r.keptId.slice(-8)}`);
    console.log(`    Orsak:   ${r.reason}`);
    console.log();
  }

  // ── Statistik ─────────────────────────────────────────────────────────────
  console.log("═".repeat(60));
  console.log("STATISTIK EFTER DUBBLETTRENSNING");
  console.log("═".repeat(60) + "\n");

  const allQs = await prisma.question.findMany({
    include: {
      positions: {
        include: { position: { select: { partyId: true } } },
      },
    },
  });

  const approved    = allQs.filter(q => q.reviewStatus === "APPROVED");
  const rejected    = allQs.filter(q => q.reviewStatus === "REJECTED");
  const needsRev    = allQs.filter(q => q.reviewStatus === "NEEDS_REVIEW");
  const pending     = allQs.filter(q => q.reviewStatus === "PENDING");
  const approvedWeak   = approved.filter(q => q.weak);
  const approvedStrong = approved.filter(q => !q.weak);

  console.log(`Frågor totalt:                    ${allQs.length}`);
  console.log(`APPROVED:                         ${approved.length}`);
  console.log(`  varav 3+ relevanta partier:     ${approvedStrong.length} (starka)`);
  console.log(`  varav ≤2 relevanta partier:     ${approvedWeak.length} (svaga, weak=true)`);
  console.log(`NEEDS_REVIEW:                     ${needsRev.length}`);
  console.log(`REJECTED:                         ${rejected.length}`);
  console.log(`PENDING:                          ${pending.length}`);
  console.log(`\nTotalt klara för /kompass:        ${approved.length}`);

  console.log("\n── Ämnesfördelning — APPROVED frågor ───────────────────────────");
  const topicCount: Record<string, number> = {};
  for (const q of approved) topicCount[q.topic] = (topicCount[q.topic] ?? 0) + 1;
  for (const slug of Object.keys(topicCount).sort()) {
    const n = topicCount[slug] ?? 0;
    const label = TOPIC_LABEL[slug] ?? slug;
    console.log(`  ${label.padEnd(34)} ${String(n).padStart(2)}  ${"█".repeat(n)}`);
  }

  console.log("\n── Partier representerade i APPROVED frågor ─────────────────────");
  const partyQCount: Record<string, number> = {};
  for (const q of approved) {
    const ps = new Set(q.positions.map(qp => qp.position.partyId));
    for (const p of ps) partyQCount[p] = (partyQCount[p] ?? 0) + 1;
  }
  for (const pId of PARTY_ORDER) {
    const p = partyMap[pId];
    const n = partyQCount[pId] ?? 0;
    console.log(`  ${(p?.shortName ?? pId).padEnd(4)} ${String(n).padStart(3)} frågor  ${"█".repeat(n)}`);
  }

  console.log("\n── REJECTED pga dubblett ────────────────────────────────────────");
  const dupRejected = rejected.filter(q => q.description?.includes("Dubblett"));
  for (const q of dupRejected) {
    console.log(`  ✗ ${q.id.slice(-8)}: ${q.questionText}`);
  }

  console.log("\n── Kvarvarande APPROVED klimat- och bostadsfrågor ───────────────");
  const klimatOchBostader = approved.filter(q =>
    q.topic === "klimat" || q.topic === "bostäder" ||
    q.questionText.toLowerCase().includes("klimat") ||
    q.questionText.toLowerCase().includes("bostäder") ||
    q.questionText.toLowerCase().includes("bygglov")
  );
  for (const q of klimatOchBostader) {
    const ps = [...new Set(q.positions.map(qp => partyMap[qp.position.partyId]?.shortName ?? qp.position.partyId))].join(", ");
    console.log(`  [${q.topic}] ${ps}: ${q.questionText}`);
  }

  console.log("\n⚠ Obs: Klimatsatsningar v2 (lpshtdvz) täckte S + SD, MP, KD, L (5 partier).");
  console.log("  v3 (9xv58cbm) täcker SD, MP, KD, L (4 partier). S saknas i v3.");
  console.log("  Rekommendation: Om S-täckning saknas på klimat-ämnet framöver →");
  console.log("  lägg till S-position till 9xv58cbm via /admin eller ny crawl.\n");

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
