/**
 * Applicerar ChatGPT-granskning av 11 v3-kandidatfrågor (2026-07-29).
 *
 * Hanterar tre saker utöver v2-scriptet:
 * 1. Uppdaterar questionText för ändrade frågor
 * 2. Korrigerar felvänt positionValue i QuestionPosition (relativt frågetextens riktning)
 * 3. Tar bort en QuestionPosition-koppling (L/skatter)
 * 4. Sätter reviewStatus (APPROVED / NEEDS_REVIEW)
 * 5. Sätter weak=true för APPROVED med ≤2 relevanta partier
 * 6. Visar statistik + dubblettvarningar
 */

import "dotenv/config";
import { createClient } from "../lib/createClient";

const prisma = createClient();

// ── GODKÄNN DIREKT ────────────────────────────────────────────────────────────
// Dessa kan redan vara APPROVED (v2). Om de är PENDING sätts de till APPROVED.
const DIRECT_APPROVE_IDS: string[] = [
  "cmrcfslke0002wsvh8dceifzb", // Bör regelkrångel och byråkrati för företag minskas?
  "cms52vrom0004ocvh2vemdfwh", // Bör grön industriomställning vara ett centralt verktyg för att skapa nya jobb?
  "cmrcfv701000gwsvh2tn60rx5", // Bör arbetsgivaravgifter eller anställningskostnader sänkas för att öka sysselsättningen?
];

// ── ÄNDRA OCH GODKÄNN ────────────────────────────────────────────────────────
const AMEND_AND_APPROVE: { id: string; questionText: string; reviewNote: string }[] = [
  {
    id: "cms52uuh20000ocvhjwetoogz",
    questionText: "Bör Sverige föra en mer restriktiv asyl- och anhöriginvandringspolitik?",
    reviewNote: "ChatGPT v3 2026-07-29: tydligare formulering — SD JA, V NEJ, MP NEJ",
  },
  {
    id: "cms52vg6o0002ocvhxgrkiult",
    questionText: "Bör kriminalvården prioritera rehabilitering framför hårdare straff?",
    reviewNote: "ChatGPT v3 2026-07-29: svag (2p), V JA +2, SD NEJ -2",
  },
  {
    id: "cms52vro20003ocvh90jvegtq",
    questionText: "Bör särskilda anställningsformer med lägre trösklar användas för att få fler i arbete?",
    reviewNote: "ChatGPT v3 2026-07-29: bredare formulering täcker KD nystartsjobb, L inträdesjobb, C studentmedarbetare",
  },
  {
    id: "cms52w7z30005ocvhep68egks",
    questionText: "Bör staten ta en aktiv roll i att finansiera och bygga fler hyresrätter?",
    reviewNote: "ChatGPT v3 2026-07-29: svag (2p), täcker V statligt byggbolag och S:s bredare bostadsansvar",
  },
  {
    id: "cms52w7zh0006ocvhcq9gsw5k",
    questionText: "Bör regler och processer för bygglov förenklas för att fler bostäder ska kunna byggas?",
    reviewNote: "ChatGPT v3 2026-07-29: bredare formulering täcker M överklaganderätt, KD och C förenklade bygglovsregler",
  },
  {
    id: "cms52wkqg0007ocvh9xv58cbm",
    questionText: "Bör Sverige prioritera ambitiösa klimatsatsningar även när de kräver offentliga resurser?",
    reviewNote: "ChatGPT v3 2026-07-29: MP JA +2, KD JA +1, L JA +1, SD NEJ -2",
  },
  {
    id: "cms52wkr20008ocvhqkfnldb2",
    questionText: "Bör EU föra en ambitiös klimatpolitik med höga utsläppsmål?",
    reviewNote: "ChatGPT v3 2026-07-29: S, L, M JA — ingen direkt NEJ-position men viktig EU-fråga",
  },
  {
    id: "cms52wz1m0009ocvhxkx1iexh",
    questionText: "Bör tillståndsprocesser och regler förenklas för att underlätta företagande och investeringar?",
    reviewNote: "ChatGPT v3 2026-07-29: svag (2p), bredare formulering täcker M miljöbalksreform och C allmänna företagsvillkor",
  },
  {
    id: "cms52xasq000aocvhqp9qroov",
    questionText: "Bör skattesystemet användas mer aktivt för att finansiera välfärd och utjämna ekonomiska klyftor?",
    reviewNote: "ChatGPT v3 2026-07-29: V JA +2, MP JA +2, M NEJ -2; L-koppling tas bort (ej direkt relevant)",
  },
];

// ── NEEDS_REVIEW ─────────────────────────────────────────────────────────────
const NEEDS_REVIEW_IDS: string[] = [
  "cms52uuhp0001ocvh7zv2na1m", // Bör Sverige underlätta arbetskraftsinvandring? — SD-position otydlig
];

// ── POSITIONSVÄRDE-KORRIGERINGAR ─────────────────────────────────────────────
// Format: { questionId, partyId, newValue }  — partyId används för att hitta rätt QuestionPosition
const POSITION_VALUE_FIXES: { questionId: string; partyId: string; newValue: number }[] = [
  // Fråga: restriktiv asyl/anhöriginvandring — MP är NEJ (-2), stod som +2
  { questionId: "cms52uuh20000ocvhjwetoogz", partyId: "miljopartiet", newValue: -2 },
  // Fråga: rehabilitering vs hårdare straff — SD är NEJ (-2), stod som +2
  { questionId: "cms52vg6o0002ocvhxgrkiult", partyId: "sverigedemokraterna", newValue: -2 },
  // Fråga: klimatsatsningar — SD är NEJ (-2), stod som +2
  { questionId: "cms52wkqg0007ocvh9xv58cbm", partyId: "sverigedemokraterna", newValue: -2 },
];

// ── TA BORT POSITION-KOPPLING ─────────────────────────────────────────────────
// L-kopplingen till skatterfrågan är otydlig — L:s position handlar om tillväxtinriktad skattereform,
// inte direkt om omfördelning. ChatGPT rekommenderar borttagning.
const REMOVE_POSITION_LINKS: { questionId: string; partyId: string }[] = [
  { questionId: "cms52xasq000aocvhqp9qroov", partyId: "liberalerna" },
];

// ── HJÄLPFUNKTIONER ───────────────────────────────────────────────────────────
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

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Applicerar ChatGPT-granskning av v3-kandidatfrågor (2026-07-29)...\n");
  console.log(`Direktgodkänner:         ${DIRECT_APPROVE_IDS.length}`);
  console.log(`Ändrar+godkänner:        ${AMEND_AND_APPROVE.length}`);
  console.log(`NEEDS_REVIEW:            ${NEEDS_REVIEW_IDS.length}`);
  console.log(`Positionsvärdesfix:      ${POSITION_VALUE_FIXES.length}`);
  console.log(`Tar bort pos-kopplingar: ${REMOVE_POSITION_LINKS.length}\n`);

  // Verifiera IDs
  const allIds = [
    ...DIRECT_APPROVE_IDS,
    ...AMEND_AND_APPROVE.map(a => a.id),
    ...NEEDS_REVIEW_IDS,
  ];
  const found = await prisma.question.findMany({
    where: { id: { in: allIds } },
    select: { id: true, questionText: true, reviewStatus: true },
  });
  if (found.length !== allIds.length) {
    const foundSet = new Set(found.map(q => q.id));
    const missing = allIds.filter(id => !foundSet.has(id));
    console.warn(`⚠ Hittade inte ${missing.length} fråge-ID:n:`);
    for (const id of missing) console.warn(`  ${id}`);
    console.warn("Fortsätter med de som hittades.\n");
  }

  // ── STEG 1: Uppdatera frågetext ──────────────────────────────────────────
  console.log("STEG 1 — UPPDATERA FRÅGETEXT");
  console.log("─".repeat(60));
  for (const a of AMEND_AND_APPROVE) {
    await prisma.question.update({
      where: { id: a.id },
      data: { questionText: a.questionText, description: a.reviewNote },
    });
    console.log(`  ✓ ${a.id.slice(-8)} → "${a.questionText.slice(0, 55)}"`);
  }
  console.log();

  // ── STEG 2: Korrigera positionsvärden ────────────────────────────────────
  console.log("STEG 2 — KORRIGERA POSITIONSVÄRDEN");
  console.log("─".repeat(60));
  for (const fix of POSITION_VALUE_FIXES) {
    // Hitta position(er) för detta parti kopplade till frågan
    const qp = await prisma.questionPosition.findMany({
      where: { questionId: fix.questionId },
      include: { position: { select: { partyId: true } } },
    });
    const toFix = qp.filter(r => r.position.partyId === fix.partyId);
    if (toFix.length === 0) {
      console.warn(`  ⚠ Ingen QuestionPosition hittad: fråga ${fix.questionId.slice(-8)} parti ${fix.partyId}`);
      continue;
    }
    for (const r of toFix) {
      await prisma.questionPosition.update({
        where: { questionId_positionId: { questionId: fix.questionId, positionId: r.positionId } },
        data: { questionPositionValue: fix.newValue },
      });
      console.log(`  ✓ ${fix.questionId.slice(-8)} ${fix.partyId.padEnd(20)} ${r.questionPositionValue} → ${fix.newValue}`);
    }
  }
  console.log();

  // ── STEG 3: Ta bort positionskopplingar ──────────────────────────────────
  console.log("STEG 3 — TA BORT POSITIONSKOPPLINGAR");
  console.log("─".repeat(60));
  for (const link of REMOVE_POSITION_LINKS) {
    const qps = await prisma.questionPosition.findMany({
      where: { questionId: link.questionId },
      include: { position: { select: { partyId: true } } },
    });
    const toRemove = qps.filter(r => r.position.partyId === link.partyId);
    if (toRemove.length === 0) {
      console.warn(`  ⚠ Ingen koppling hittad: fråga ${link.questionId.slice(-8)} parti ${link.partyId}`);
      continue;
    }
    for (const r of toRemove) {
      await prisma.questionPosition.delete({
        where: { questionId_positionId: { questionId: link.questionId, positionId: r.positionId } },
      });
      console.log(`  ✓ Tog bort: ${link.questionId.slice(-8)} ↔ ${link.partyId}`);
    }
  }
  console.log();

  // ── STEG 4: Sätt APPROVED ────────────────────────────────────────────────
  console.log("STEG 4 — SÄTT APPROVED");
  console.log("─".repeat(60));
  const approveIds = [...DIRECT_APPROVE_IDS, ...AMEND_AND_APPROVE.map(a => a.id)];

  // Direktgodkännanden — sätt bara om de är PENDING (de kan redan vara APPROVED från v2)
  for (const id of DIRECT_APPROVE_IDS) {
    const q = found.find(f => f.id === id);
    if (!q) continue;
    if (q.reviewStatus === "APPROVED") {
      console.log(`  ✓ ${id.slice(-8)} redan APPROVED — behåller`);
    } else {
      await prisma.question.update({
        where: { id },
        data: { reviewStatus: "APPROVED", description: "ChatGPT v3 2026-07-29: godkänd utan ändringar" },
      });
      console.log(`  ✓ ${id.slice(-8)} → APPROVED`);
    }
  }

  for (const a of AMEND_AND_APPROVE) {
    await prisma.question.update({
      where: { id: a.id },
      data: { reviewStatus: "APPROVED" },
    });
    console.log(`  ✓ ${a.id.slice(-8)} → APPROVED`);
  }
  console.log(`\n  Totalt: ${approveIds.length} frågor satta/behållna som APPROVED\n`);

  // ── STEG 5: Sätt NEEDS_REVIEW ─────────────────────────────────────────────
  console.log("STEG 5 — SÄTT NEEDS_REVIEW");
  console.log("─".repeat(60));
  for (const id of NEEDS_REVIEW_IDS) {
    await prisma.question.update({
      where: { id },
      data: { reviewStatus: "NEEDS_REVIEW", description: "ChatGPT v3 2026-07-29: SD-position otydlig för arbetskraftsinvandring" },
    });
    console.log(`  ⚠ ${id.slice(-8)} → NEEDS_REVIEW`);
  }
  console.log();

  // ── STEG 6: Sätt weak=true för APPROVED med ≤2 partier ───────────────────
  console.log("STEG 6 — FLAGGA SVAGA FRÅGOR (weak=true)");
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
    await prisma.question.update({ where: { id: q.id }, data: { weak: isWeak } });
    if (isWeak) {
      weakCount++;
      console.log(`  weak [${partyCount}p] ${q.questionText.slice(0, 55)}`);
    } else {
      strongCount++;
    }
  }
  console.log(`\n  ✓ ${weakCount} svaga (weak=true), ${strongCount} starka (weak=false)\n`);

  // ── STATISTIK ─────────────────────────────────────────────────────────────
  console.log("═".repeat(60));
  console.log("SLUTSTATISTIK");
  console.log("═".repeat(60) + "\n");

  const parties = await prisma.party.findMany({ select: { id: true, shortName: true } });
  const partyMap = Object.fromEntries(parties.map(p => [p.id, p]));

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

  // V3-frågor (ny status i detta körning)
  const v3Ids = new Set([...DIRECT_APPROVE_IDS, ...AMEND_AND_APPROVE.map(a => a.id)]);
  const v3Approved = approved.filter(q => v3Ids.has(q.id));

  console.log(`Frågor totalt:                    ${allQs.length}`);
  console.log(`APPROVED:                         ${approved.length}`);
  console.log(`  varav nytt godkända via v3:     ${v3Approved.length}`);
  console.log(`  varav 3+ relevanta partier:     ${approvedStrong.length} (starka)`);
  console.log(`  varav ≤2 relevanta partier:     ${approvedWeak.length} (svaga, weak=true)`);
  console.log(`NEEDS_REVIEW:                     ${needsRev.length}`);
  console.log(`REJECTED:                         ${rejected.length}`);
  console.log(`PENDING (ej rörda):               ${pending.length}`);
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

  if (approvedWeak.length > 0) {
    console.log("\n── Svaga APPROVED-frågor (weak=true, ≤2 partier) ───────────────");
    for (const q of approvedWeak) {
      const ps = [...new Set(q.positions.map(qp => partyMap[qp.position.partyId]?.shortName ?? qp.position.partyId))].join(", ");
      console.log(`  [${new Set(q.positions.map(qp => qp.position.partyId)).size}p: ${ps}] ${q.questionText}`);
    }
  }

  // ── Dubblettkontroll ──────────────────────────────────────────────────────
  console.log("\n── Dubblettkontroll — APPROVED frågor ───────────────────────────");
  const bygglovsFrågor = approved.filter(q =>
    q.questionText.toLowerCase().includes("bygglov") ||
    q.questionText.toLowerCase().includes("bygga") ||
    q.questionText.toLowerCase().includes("bostäder")
  );
  if (bygglovsFrågor.length > 1) {
    console.log(`  ⚠ ${bygglovsFrågor.length} bostads/bygglovsfrågor — kolla manuellt:`);
    for (const q of bygglovsFrågor) console.log(`    ${q.id.slice(-8)}: ${q.questionText}`);
  } else {
    console.log("  ✓ Inga uppenbara bygglovsdubblett");
  }

  const klimatFrågor = approved.filter(q =>
    q.topic === "klimat" ||
    q.questionText.toLowerCase().includes("klimat")
  );
  if (klimatFrågor.length > 2) {
    console.log(`  ⚠ ${klimatFrågor.length} klimatfrågor — kolla manuellt:`);
    for (const q of klimatFrågor) console.log(`    ${q.id.slice(-8)}: ${q.questionText}`);
  } else {
    console.log("  ✓ Inga uppenbara klimatdubblett");
  }

  console.log("\n── Avslutande kontroll ───────────────────────────────────────────");
  console.log(`  ✓ ${approved.length} APPROVED-frågor klara för /kompass`);
  console.log(`  ✓ ${approvedStrong.length} starka (3+ partier), ${approvedWeak.length} svaga (≤2 partier)`);
  console.log(`  ✓ ${v3Approved.length} nya frågor godkända via v3-granskning`);
  console.log("  Nästa steg:");
  console.log("    1. Starta servern och testa /kompass + /resultat");
  console.log("    2. Fundera på viktning av svaga frågor i lib/scoring.ts");

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
