/**
 * Applicerar ChatGPT-granskning av 27 v2-kandidatfrågor (2026-07-28).
 *
 * V2-frågor behöver INTE relevansfiltreringssteg — positionslänkarna är
 * redan korrekta från semantisk klustring. Skriptet:
 * 1. Uppdaterar questionText för ändrade frågor
 * 2. Sätter reviewStatus (APPROVED / NEEDS_REVIEW)
 * 3. Sätter weak=true för alla APPROVED-frågor med ≤2 relevanta partier
 * 4. Visar statistik
 */

import "dotenv/config";
import { createClient } from "../lib/createClient";

const prisma = createClient();

// ── Direktgodkännanden ────────────────────────────────────────────────────────
const DIRECT_APPROVE_IDS: string[] = [
  "cmrcfslke0002wsvh8dceifzb",
  "cmrcft0sc0006wsvhojr3jcj3",
  "cmrcft0sp0007wsvhkadiby5x",
  "cmrcftcr90008wsvhlpshtdvz",
  "cmrcftcrw0009wsvh611kpbkc",
  "cmrcftcs5000awsvhwn4gm4uf",
  "cmrcfu0um000bwsvh6hmp2aov",
  "cmrcfu0v4000cwsvhm98hw9nk",
  "cmrcfurlx000ewsvh7zfx34eo",
  "cmrcfurmk000fwsvh8357cptc",
  "cmrcfv701000gwsvh2tn60rx5",
  "cmrcfv70h000hwsvh5icv3zmq",
  "cmrcfv70q000iwsvhy5tz5bv1",
  "cmrcfvi7j000jwsvhnknobjdc",
  "cmrcfvi81000kwsvh8pq8valc",
  "cmrcfvi8e000lwsvh6pkz356n",
  "cmrcfwmbi000nwsvhqkxc1a0g",
  "cmrcfwmbs000owsvhs2epbk90",
  "cmrcfwuc6000qwsvhvqnhm4bx",
];

// ── Ändra och godkänn ─────────────────────────────────────────────────────────
const AMEND_AND_APPROVE: { id: string; questionText: string; reviewNote: string }[] = [
  {
    id: "cmrcfs97m0000wsvha4z8fp8t",
    questionText: "Bör rätten till uppehåll i Sverige kopplas till hårdare krav?",
    reviewNote: "ChatGPT 2026-07-28: breddad — V-positionen handlar om familjeåterförening, inte medborgarskap",
  },
  {
    id: "cmrcfs9830001wsvh19dpnb3i",
    questionText: "Bör integrationspolitiken ställa tydligare krav på svenska språket och självförsörjning?",
    reviewNote: "ChatGPT 2026-07-28: bättre språk och närmre KD/M-positionerna",
  },
  {
    id: "cmrcfslkv0003wsvhy5in0ruh",
    questionText: "Bör skattesystemet göras mer förmånligt för företagare, ägare och investeringar?",
    reviewNote: "ChatGPT 2026-07-28: KD-position handlar om delägarskap/personaloptioner, inte rena höginkomstskatter",
  },
  {
    id: "cmrcfsll80004wsvht7gwm7tf",
    questionText: "Bör staten ta en mer aktiv roll i investeringar, välfärdsfinansiering och grön omställning?",
    reviewNote: "ChatGPT 2026-07-28: konkretare och bättre täckt av V/MP-positionerna",
  },
  {
    id: "cmrcfwmb2000mwsvh4vx3zqup",
    questionText: "Bör hedersrelaterat våld bekämpas med särskilda rättsliga eller polisiära åtgärder?",
    reviewNote: "ChatGPT 2026-07-28: bredare formulering passar KD, L och MP bättre",
  },
];

// ── Ändra och sätt NEEDS_REVIEW ───────────────────────────────────────────────
const AMEND_AND_NEEDS_REVIEW: { id: string; questionText: string; reviewNote: string }[] = [
  {
    id: "cmrcft0rz0005wsvhahh1vqu9",
    questionText: "Bör fler poliser vara en central prioritering i kriminalpolitiken?",
    reviewNote: "ChatGPT 2026-07-28: NEEDS_REVIEW — sannolikt för okontroversiell, bara JA-positioner",
  },
  {
    id: "cmrcfu0vf000dwsvhf8d2yocr",
    questionText: "Bör Sverige prioritera en kraftig utbyggnad av fossilfri elproduktion?",
    reviewNote: "ChatGPT 2026-07-28: NEEDS_REVIEW — svag skiljelinje, båda relevanta partier är JA",
  },
  {
    id: "cmrcfwubr000pwsvh8tlpn9yk",
    questionText: "Bör ökad livsmedelsproduktion och självförsörjning prioriteras i landsbygdspolitiken?",
    reviewNote: "ChatGPT 2026-07-28: NEEDS_REVIEW — sannolikt för okontroversiell, bara JA-positioner",
  },
];

const TOPIC_LABEL: Record<string, string> = {
  migration:        "Migration och integration",
  ekonomi:          "Ekonomi",
  lag_ordning:      "Lag och ordning",
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
  brottslighet:     "Lag och ordning",
  näringsliv:       "Näringsliv",
};

const PARTY_ORDER = [
  "socialdemokraterna", "vansterpartiet", "kristdemokraterna",
  "liberalerna", "sverigedemokraterna", "centerpartiet", "miljopartiet", "moderaterna",
];

async function main() {
  console.log("Applicerar ChatGPT-granskning av v2-kandidatfrågor (2026-07-28)...\n");
  console.log(`Direktgodkänner:    ${DIRECT_APPROVE_IDS.length}`);
  console.log(`Ändrar+godkänner:   ${AMEND_AND_APPROVE.length}`);
  console.log(`Ändrar+NEEDS_REVIEW:${AMEND_AND_NEEDS_REVIEW.length}\n`);

  const allIds = [
    ...DIRECT_APPROVE_IDS,
    ...AMEND_AND_APPROVE.map(a => a.id),
    ...AMEND_AND_NEEDS_REVIEW.map(a => a.id),
  ];

  // Verifiera att alla ID:n finns i databasen
  const found = await prisma.question.findMany({
    where: { id: { in: allIds } },
    select: { id: true, questionText: true },
  });
  if (found.length !== allIds.length) {
    const foundSet = new Set(found.map(q => q.id));
    const missing = allIds.filter(id => !foundSet.has(id));
    console.warn(`⚠ Hittade inte ${missing.length} fråge-ID:n:`);
    for (const id of missing) console.warn(`  ${id}`);
    console.warn("Fortsätter med de som hittades.\n");
  }

  // ── Steg 1: Uppdatera questionText och reviewNote för ändrade frågor ─────
  console.log("STEG 1 — UPPDATERA FRÅGETEXT");
  console.log("─".repeat(60));

  for (const a of [...AMEND_AND_APPROVE, ...AMEND_AND_NEEDS_REVIEW]) {
    await prisma.question.update({
      where: { id: a.id },
      data:  { questionText: a.questionText, description: a.reviewNote },
    });
    console.log(`  ✓ ${a.id.slice(-8)} → "${a.questionText.slice(0, 55)}"`);
  }
  console.log();

  // ── Steg 2: Sätt APPROVED ────────────────────────────────────────────────
  console.log("STEG 2 — SÄTT APPROVED");
  console.log("─".repeat(60));

  const approveIds = [
    ...DIRECT_APPROVE_IDS,
    ...AMEND_AND_APPROVE.map(a => a.id),
  ];

  await prisma.question.updateMany({
    where: { id: { in: DIRECT_APPROVE_IDS } },
    data:  { reviewStatus: "APPROVED", description: "ChatGPT-godkänd 2026-07-28 (v2)" },
  });

  for (const a of AMEND_AND_APPROVE) {
    await prisma.question.update({
      where: { id: a.id },
      data:  { reviewStatus: "APPROVED" },
    });
  }
  console.log(`  ✓ ${approveIds.length} frågor satta till APPROVED\n`);

  // ── Steg 3: Sätt NEEDS_REVIEW ─────────────────────────────────────────────
  console.log("STEG 3 — SÄTT NEEDS_REVIEW");
  console.log("─".repeat(60));

  for (const a of AMEND_AND_NEEDS_REVIEW) {
    await prisma.question.update({
      where: { id: a.id },
      data:  { reviewStatus: "NEEDS_REVIEW" },
    });
    console.log(`  ⚠ ${a.id.slice(-8)} → NEEDS_REVIEW`);
  }
  console.log();

  // ── Steg 4: Sätt weak=true för APPROVED med ≤2 relevanta partier ─────────
  console.log("STEG 4 — FLAGGA SVAGA FRÅGOR (weak=true)");
  console.log("─".repeat(60));

  const allApproved = await prisma.question.findMany({
    where: { reviewStatus: "APPROVED" },
    include: {
      positions: {
        include: { position: { select: { partyId: true } } },
      },
    },
  });

  let weakCount = 0;
  let strongCount = 0;
  for (const q of allApproved) {
    const partyCount = new Set(q.positions.map(qp => qp.position.partyId)).size;
    const isWeak = partyCount <= 2;
    await prisma.question.update({
      where: { id: q.id },
      data:  { weak: isWeak },
    });
    if (isWeak) {
      weakCount++;
      console.log(`  weak [${partyCount} parti${partyCount === 1 ? "" : "er"}] ${q.questionText.slice(0, 55)}`);
    } else {
      strongCount++;
    }
  }
  console.log(`\n  ✓ ${weakCount} svaga (weak=true), ${strongCount} starka (weak=false)\n`);

  // ── Statistik ─────────────────────────────────────────────────────────────
  console.log("═".repeat(60));
  console.log("SLUTSTATISTIK");
  console.log("═".repeat(60) + "\n");

  const parties = await prisma.party.findMany({ select: { id: true, shortName: true } });
  const partyMap = Object.fromEntries(parties.map(p => [p.id, p]));

  const allQsWithPos = await prisma.question.findMany({
    include: {
      positions: {
        include: { position: { select: { partyId: true } } },
      },
    },
  });

  const approved    = allQsWithPos.filter(q => q.reviewStatus === "APPROVED");
  const rejected    = allQsWithPos.filter(q => q.reviewStatus === "REJECTED");
  const needsRev    = allQsWithPos.filter(q => q.reviewStatus === "NEEDS_REVIEW");
  const pending     = allQsWithPos.filter(q => q.reviewStatus === "PENDING");

  const approvedWeak   = approved.filter(q => q.weak);
  const approvedStrong = approved.filter(q => !q.weak);

  console.log(`Frågor totalt:              ${allQsWithPos.length}`);
  console.log(`APPROVED:                   ${approved.length}`);
  console.log(`  varav 3+ relevanta partier: ${approvedStrong.length}`);
  console.log(`  varav 2 relevanta partier:  ${approvedWeak.length}  (weak=true)`);
  console.log(`NEEDS_REVIEW:               ${needsRev.length}`);
  console.log(`REJECTED:                   ${rejected.length}`);
  console.log(`PENDING (ej rört):          ${pending.length}`);
  console.log(`\nTotalt klara för /kompass:  ${approved.length}`);

  console.log("\n── Ämnesfördelning — APPROVED frågor ───────────────────────────");
  const topicCount: Record<string, number> = {};
  for (const q of approved) topicCount[q.topic] = (topicCount[q.topic] ?? 0) + 1;

  const allTopics = Object.keys(topicCount).sort();
  for (const slug of allTopics) {
    const n = topicCount[slug] ?? 0;
    const label = TOPIC_LABEL[slug] ?? slug;
    const bar = "█".repeat(n);
    console.log(`  ${label.padEnd(34)} ${String(n).padStart(2)}  ${bar}`);
  }

  console.log("\n── Partier representerade i APPROVED frågor ─────────────────────");
  const partyQCount: Record<string, number> = {};
  for (const q of approved) {
    const ps = new Set(q.positions.map(qp => qp.position.partyId));
    for (const p of ps) partyQCount[p] = (partyQCount[p] ?? 0) + 1;
  }
  for (const pId of PARTY_ORDER) {
    const p   = partyMap[pId];
    const n   = partyQCount[pId] ?? 0;
    const bar = "█".repeat(n);
    console.log(`  ${(p?.shortName ?? pId).padEnd(4)} ${String(n).padStart(3)} frågor  ${bar}`);
  }

  if (approvedWeak.length > 0) {
    console.log("\n── Svaga APPROVED-frågor (weak=true, 2 relevanta partier) ───────");
    for (const q of approvedWeak) {
      const n = new Set(q.positions.map(qp => qp.position.partyId)).size;
      const parties = [...new Set(q.positions.map(qp => partyMap[qp.position.partyId]?.shortName ?? qp.position.partyId))].join(", ");
      console.log(`  [${n}p ${parties}] ${q.questionText}`);
    }
  }

  console.log("\n── Avslutande kontroll ───────────────────────────────────────────");
  console.log(`  ✓ ${approved.length} APPROVED-frågor klara för /kompass.`);
  console.log(`  ✓ Av dessa är ${approvedStrong.length} starka (3+ partier) och ${approvedWeak.length} svaga (2 partier).`);
  console.log("  Nästa steg:");
  console.log("    1. Kontrollera ämnesfördelning och partitäckning ovan");
  console.log("    2. Testa /kompass och /resultat");

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
