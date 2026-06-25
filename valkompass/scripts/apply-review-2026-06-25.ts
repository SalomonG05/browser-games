import "dotenv/config";
import { createClient } from "../lib/createClient";

const prisma = createClient();

// ── 1. Direktgodkännanden (48 + 1 från særskild kontroll) ─────────────────────

const DIRECT_APPROVE = [
  "cmqs5wdrl000928vh1x6juyb1",
  "cmqs2v1ld0028pgvhl302lrd5",
  "cmqs5zwzi001e28vhj76ly0qe",
  "cmqs5z9st001928vhdkaq8q0k",
  "cmqs5z9sc001428vh8xcyd6b2",
  "cmqs5wvs3000e28vhlr30k649",
  "cmqs2s6fv0018pgvhwk5uyxqq",
  "cmqs2r4cw000tpgvh631ru7v9",
  "cmqs5wvru000b28vh8carek5z",
  "cmqs2t9wp001jpgvhx5zemv50",
  "cmqs2twax001qpgvhvjmv1ng8",
  "cmqs2s6fr0017pgvhppfmxvia",
  "cmqs5z9s5001228vh3mlwcmdx",
  "cmqs2s6fo0016pgvh247o7dhb",
  "cmqs2okc10004pgvh0ewwd0z2",
  "cmqs2uhfe0023pgvhz44r5m00",
  "cmqs2s6fl0015pgvhbcp2im00",
  "cmqs2po7y000fpgvhylzakpaf",
  "cmqs2r4d6000wpgvhag0mn72d",
  "cmqs2r4cl000qpgvhu6f4ync3",
  "cmqs2twbf001upgvhxcphc2qi",
  "cmqs2rlob000ypgvhu237ubya",
  "cmqs2r4d3000vpgvhk900b0a0",
  "cmqs2p0ki0009pgvhbdzlqpqf",
  "cmqs60hed001l28vh41qbtoyj",
  "cmqs2t9xa001ppgvh70faphma",
  "cmqs2r4d0000upgvh1sw3j04z",
  "cmqs2uhet001ypgvh8u2ixnlu",
  "cmqs2t9x7001opgvh2vqrhe5j",
  "cmqs2uhfa0022pgvhhmh7fzhq",
  "cmqs613ql001u28vh4rldvz8o",
  "cmqs2p0l5000dpgvh7siwbeym",
  "cmqs2s6fz0019pgvhexj5x9ev",
  "cmqs2r4ct000spgvhfr6mdml8",
  "cmqs2v1lm002bpgvhejkrq6is",
  "cmqs2t9wx001lpgvhy7ce34m9",
  "cmqs5zwzt001h28vhquxqzswo",
  "cmqs2p0ku000apgvh3idol6tc",
  "cmqs2uhf30020pgvh4aatvaf7",
  "cmqs2t9x4001npgvhixqrmove",
  "cmqs2twbn001wpgvhx0ijd5qb",
  "cmqs5z9sn001728vh3uide01p",
  "cmqs613qe001s28vhz3cyb0po",
  "cmqs613qh001t28vhpi1rr3w7",
  "cmqs2v1la0027pgvhuwgn7xvh",
  "cmqs2uhez001zpgvh1nyc8zgc",
  "cmqs2okbu0002pgvhq5ldwszb",
  "cmqs2uhf70021pgvh2kdki1p3",
  // Særskild kontroll — föredragen kopia som behöver godkännas
  "cmqs60he7001j28vhu0oge948",
];

// ── 2. Ändra + godkänn ────────────────────────────────────────────────────────

const AMEND_AND_APPROVE: Array<{
  id: string;
  specificQuestion: string;
  positionValue: number;
  topic?: string;
  note: string;
}> = [
  {
    id: "cmqs2twbq001xpgvhedqolt9i",
    topic: "skola",
    specificQuestion: "Bör förskolan fokusera mer på svenska språket i utsatta områden?",
    positionValue: 2,
    note: "topic ändrat migration→skola, issue preciserad",
  },
  {
    id: "cmqs2okcb0007pgvhxx69nis3",
    specificQuestion: "Bör kortare vårdköer och bättre äldreomsorg prioriteras i välfärdspolitiken?",
    positionValue: 2,
    note: "issue preciserad",
  },
  {
    id: "cmqs2sqc5001dpgvhgznkfd8w",
    specificQuestion: "Bör EU:s klimatpolitik utformas så att klimatsatsningar går hand i hand med ekonomisk tillväxt?",
    positionValue: 2,
    note: "issue omformulerad, position_value +1→+2",
  },
  {
    id: "cmqs2okc80006pgvhycpeqvg2",
    specificQuestion: "Bör Sverige införa euron?",
    positionValue: -2,
    note: "issue förtydligad (euro-fråga isolerad)",
  },
  {
    id: "cmqs2p0l8000epgvhehlnmrdr",
    specificQuestion: "Bör Sverige prioritera bättre villkor för företagande?",
    positionValue: 2,
    note: "issue preciserad",
  },
  {
    id: "cmqs2twb3001rpgvhqxfcf3z1",
    specificQuestion: "Bör kommuner erbjuda språkförskola från tre års ålder för barn med svag svenska?",
    positionValue: 2,
    note: "issue korrigerad: erbjuda (ej obligatorisk) — citatet säger erbjuda",
  },
  {
    id: "cmqs2uhfh0024pgvhs97rrosz",
    specificQuestion: "Bör drivmedelspolitiken ta särskild hänsyn till personer som är beroende av bilen utanför storstäderna?",
    positionValue: 2,
    note: "issue bredare — fokus landsbygdsberoende (ej dubblett av drivmedelsskatt)",
  },
];

// ── 3. Avvisa / markera ───────────────────────────────────────────────────────

const REJECT: string[] = [
  "cmqs2v1l60026pgvhb7jvro6n", // dubblett av cmqs60he7001j28vhu0oge948
  "cmqs2v1lg0029pgvhszttbrn5", // dubblett av cmqs60hed001l28vh41qbtoyj
  "cmqs5wdrb000628vhxkx5dp1u", // dubblett av cmqs2r4d0000upgvh1sw3j04z
];

const NEEDS_REVIEW: string[] = [
  "cmqs60he2001i28vh28evdmfw", // allmän värdegrundsposition, ej konkret policy
];

// ── Kör uppdateringar ─────────────────────────────────────────────────────────

async function main() {
  let approved = 0;
  let amended = 0;
  let rejected = 0;
  let needsReview = 0;
  const errors: string[] = [];

  // Direktgodkännanden
  for (const id of DIRECT_APPROVE) {
    try {
      const existing = await prisma.position.findUnique({ where: { id }, select: { reviewStatus: true } });
      if (!existing) { errors.push(`NOT FOUND: ${id}`); continue; }
      if (existing.reviewStatus === "APPROVED") { approved++; continue; }
      await prisma.position.update({ where: { id }, data: { reviewStatus: "APPROVED" } });
      approved++;
    } catch (e) {
      errors.push(`ERROR ${id}: ${e}`);
    }
  }

  // Ändra + godkänn
  for (const item of AMEND_AND_APPROVE) {
    try {
      const existing = await prisma.position.findUnique({ where: { id: item.id }, select: { id: true } });
      if (!existing) { errors.push(`NOT FOUND: ${item.id}`); continue; }
      await prisma.position.update({
        where: { id: item.id },
        data: {
          specificQuestion: item.specificQuestion,
          positionValue:    item.positionValue,
          ...(item.topic && { topic: item.topic }),
          reviewStatus:     "APPROVED",
          reviewNote:       item.note,
        },
      });
      amended++;
    } catch (e) {
      errors.push(`ERROR ${item.id}: ${e}`);
    }
  }

  // Avvisa
  for (const id of REJECT) {
    try {
      const existing = await prisma.position.findUnique({ where: { id }, select: { reviewStatus: true } });
      if (!existing) { errors.push(`NOT FOUND: ${id}`); continue; }
      await prisma.position.update({ where: { id }, data: { reviewStatus: "REJECTED", reviewNote: "dubblett — se apply-review-2026-06-25" } });
      rejected++;
    } catch (e) {
      errors.push(`ERROR ${id}: ${e}`);
    }
  }

  // Needs review
  for (const id of NEEDS_REVIEW) {
    try {
      const existing = await prisma.position.findUnique({ where: { id }, select: { reviewStatus: true } });
      if (!existing) { errors.push(`NOT FOUND: ${id}`); continue; }
      await prisma.position.update({ where: { id }, data: { reviewStatus: "NEEDS_REVIEW", reviewNote: "allmän värdegrundsposition, ej konkret policy" } });
      needsReview++;
    } catch (e) {
      errors.push(`ERROR ${id}: ${e}`);
    }
  }

  // ── Sammanfattning ──────────────────────────────────────────────────────────

  const totalApproved = await prisma.position.count({ where: { reviewStatus: "APPROVED" } });
  const totalPending  = await prisma.position.count({ where: { reviewStatus: "PENDING" } });
  const totalRejected = await prisma.position.count({ where: { reviewStatus: "REJECTED" } });
  const totalNR       = await prisma.position.count({ where: { reviewStatus: "NEEDS_REVIEW" } });
  const totalReady    = await prisma.position.count({ where: { reviewStatus: "READY_FOR_APPROVAL" } });

  const partyBreakdown = await prisma.position.groupBy({
    by: ["partyId"],
    where: { reviewStatus: "APPROVED" },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  Granskning 2026-06-25 — sammanfattning");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Direktgodkännanden i detta körning : ${approved}`);
  console.log(`  Ändrade och godkända               : ${amended}`);
  console.log(`  Avvisade (REJECTED)                : ${rejected}`);
  console.log(`  Markerade NEEDS_REVIEW             : ${needsReview}`);
  console.log("───────────────────────────────────────────────────────");
  console.log(`  Totalt APPROVED i databasen        : ${totalApproved}`);
  console.log(`  Totalt PENDING                     : ${totalPending}`);
  console.log(`  Totalt REJECTED                    : ${totalRejected}`);
  console.log(`  Totalt NEEDS_REVIEW                : ${totalNR}`);
  console.log(`  Totalt READY_FOR_APPROVAL          : ${totalReady}`);
  console.log("───────────────────────────────────────────────────────");
  console.log("  Godkända positioner per parti:");
  for (const p of partyBreakdown) {
    console.log(`    ${p.partyId.padEnd(24)} ${p._count.id}`);
  }

  if (errors.length > 0) {
    console.log("───────────────────────────────────────────────────────");
    console.log("  FEL:");
    for (const e of errors) console.log(`    ${e}`);
  }

  console.log("═══════════════════════════════════════════════════════");
  console.log("\n⚠  PÅMINNELSE: Materialet är fortfarande Moderaterna-tungt.");
  console.log("   Innan valkompassen är balanserad behövs fler godkända");
  console.log("   positioner från: S, SD, V, C, KD, L och MP.");
  console.log("   Kör 'npm run crawl' med fler seed-URL:er för dessa partier,");
  console.log("   sedan 'npm run extract' och granska nya positioner.\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
