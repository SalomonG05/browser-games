/**
 * Datafix 2026-07-28:
 * 1. Sätter questionPositionValue för positioner vars värde är inverterat
 *    relativt den slutliga frågans riktning.
 * 2. Tar bort duplicerade QuestionPosition-rader (samma parti, samma fråga).
 * 3. Tar bort felkopplade positioner som inte handlar om frågans ämne.
 */

import "dotenv/config";
import { createClient } from "../lib/createClient";

const prisma = createClient();

async function main() {
  console.log("Datafix 2026-07-28 — positionsvärden och dubbletter\n");

  // ── Fix 1: #16 "Bör Sverige lagstifta mot kärnvapen?" ────────────────────
  // V och MP har positionValue=-2 relativt "Bör kärnvapen TILLÅTAS?" (de svarar nej).
  // Relativt "Bör Sverige LAGSTIFTA MOT kärnvapen?" ska de vara +2 (de stödjer lagstiftningen).
  console.log("Fix 1 — #16 kärnvapen: V och MP +2 (stödjer lagstiftning mot kärnvapen)");
  await prisma.questionPosition.update({
    where: {
      questionId_positionId: {
        questionId: "cmqtot3fm000wwwvhac1f6nne",
        positionId: "cmqtl7883004fu8vh34zcok85",  // V
      },
    },
    data: { questionPositionValue: 2 },
  });
  await prisma.questionPosition.update({
    where: {
      questionId_positionId: {
        questionId: "cmqtot3fm000wwwvhac1f6nne",
        positionId: "cmqtlxqnl00dfu8vhqsj1bctc",  // MP
      },
    },
    data: { questionPositionValue: 2 },
  });
  console.log("  ✓ V: -2 → +2, MP: -2 → +2\n");

  // ── Fix 2: #37 "Bör Sverige föra en mer restriktiv invandringspolitik?" ──
  // MP:s position handlar om en human asylpolitik — det MOTSÄTTER sig en mer
  // restriktiv politik. Ta bort länken (MP ska inte synas på denna fråga).
  console.log("Fix 2 — #37 restriktiv invandring: ta bort MP-länk (stödjer human asylpolitik, inte restriktiv)");
  await prisma.questionPosition.delete({
    where: {
      questionId_positionId: {
        questionId: "cmqtosgda0000wwvhlsqx1mil",
        positionId: "cmqtlwgz000czu8vhgrnboz70",  // MP human asylpolitik
      },
    },
  });
  console.log("  ✓ MP borttagen från fråga #37\n");

  // ── Fix 3: #38 "Bör integrationspolitiken ställa tydligare krav..." ──────
  // M har positionValue=-2 relativt "Bör förskolan ha krav på modersmålsutveckling?"
  // (M svarar nej = ta bort modersmålskravet). Relativt "ställa krav på SVENSKA"
  // är M:s position +2 (M vill fokusera på svenska, inte modersmål).
  console.log("Fix 3 — #38 integrationskrav: M -2 → +2 (M stödjer krav på svenska)");
  await prisma.questionPosition.update({
    where: {
      questionId_positionId: {
        questionId: "cmrcfs9830001wsvh19dpnb3i",
        positionId: "cmqs5z9sc001428vh8xcyd6b2",  // M modersmål/svenska
      },
    },
    data: { questionPositionValue: 2 },
  });
  console.log("  ✓ M: -2 → +2\n");

  // ── Fix 4: #7 "Bör skattesystemet göras mer förmånligt för ägare...?" ────
  // S har två positioner, båda med positionValue=+2:
  //   (a) "prioritera investeringar för alla framför skattesänkningar för rikaste"
  //   (b) "inför bankskatt"
  // Relativt frågan "gynnsammare skattesystem för ägare/investerare" är S:s svar -2.
  // Ta bort bankskatt-länken (irrelevant för frågan).
  // Sätt questionPositionValue=-2 på investerings-länken (S MOTSÄTTER sig frågan).
  console.log("Fix 4 — #7 skattesystem: S -2 (S motsätter sig förmåner för kapitalägare) + ta bort bankskatt-länk");
  await prisma.questionPosition.update({
    where: {
      questionId_positionId: {
        questionId: "cmrcfslkv0003wsvhy5in0ruh",
        positionId: "cmqtkusgj0000u8vhml38fgd7",  // S investering/tillväxt för alla
      },
    },
    data: { questionPositionValue: -2 },
  });
  await prisma.questionPosition.delete({
    where: {
      questionId_positionId: {
        questionId: "cmrcfslkv0003wsvhy5in0ruh",
        positionId: "cmqtkusgt0002u8vh4wv7cozy",  // S bankskatt (irrelevant)
      },
    },
  });
  console.log("  ✓ S (investering): +2 → -2 via questionPositionValue");
  console.log("  ✓ S (bankskatt): borttagen\n");

  // ── Fix 5: #11 "Bör Sverige prioritera vindkraft framför kärnkraft?" ──────
  // C länkad via "utöka utsläppsfri energi" med val=+2, men C stödjer BÅDE vindkraft
  // OCH kärnkraft — C prioriterar INTE vindkraft FRAMFÖR kärnkraft. C=-2 korrekt.
  // MP har två länkar: kärnkraft(val=-2) och vindkraft(val=+2).
  //   - kärnkraft-länken: MP svarar -2 till "Bör Sverige bygga ny kärnkraft?" vilket
  //     relativt "prioritera vindkraft FRAMFÖR kärnkraft" faktiskt mappar till +2.
  //     Men vi har redan vindkraft-länken med +2, så ta bort kärnkraft-länken.
  //   - vindkraft-länken: val=+2, MP stödjer vindkraft. Korrekt.
  console.log("Fix 5 — #11 vindkraft vs kärnkraft:");
  // Sätt C till -2 (C vill inte prioritera vindkraft ÖVER kärnkraft, C vill ha båda)
  await prisma.questionPosition.update({
    where: {
      questionId_positionId: {
        questionId: "cmqtot00y000vwwvhsh52ys2k",
        positionId: "cmqs2p0ki0009pgvhbdzlqpqf",  // C "utsläppsfri energi"
      },
    },
    data: { questionPositionValue: -2 },
  });
  console.log("  ✓ C: +2 → -2 (C stödjer BÅDE vindkraft och kärnkraft, inte prioritering)");
  // Ta bort MP kärnkraft-länken (dubbletter med inverterad logik — vindkraft-länken räcker)
  await prisma.questionPosition.delete({
    where: {
      questionId_positionId: {
        questionId: "cmqtot00y000vwwvhsh52ys2k",
        positionId: "cmqtly8ae00dlu8vhh0p2f8ls",  // MP "bygga ny kärnkraft" (-2)
      },
    },
  });
  console.log("  ✓ MP kärnkraft-länk (-2) borttagen (vindkraft-länk +2 kvarstår)\n");

  // ── Fix 6: Rensa dubbletter ────────────────────────────────────────────────
  // För alla frågor med samma parti kopplat mer än en gång: behåll den mest
  // direkta positionen (lägst alphab. positionId = vanligtvis äldst/enklast),
  // ta bort övriga.
  console.log("Fix 6 — Rensa dubbletter (behåll en position per parti per fråga):");

  const KEEP_FIRST: { questionId: string; keepId: string; removeIds: string[]; note: string }[] = [
    {
      questionId: "cmqtosgda0000wwvhlsqx1mil",
      keepId:    "cmqs2okbr0001pgvhfhinssph",
      removeIds: ["cmqtllusj0097u8vhx1qk5ere", "cmqtlmpee009eu8vhwa0538pl", "cmqtlmpes009iu8vhpjuzcdng"],
      note: "SD i #37: behåller exakt matchande fråga, tar bort 3 duplicerade",
    },
    {
      questionId: "cmqtoskh30009wwvhkxl9ji49",
      keepId:    "cmqs2s6fr0017pgvhppfmxvia",
      removeIds: ["cmqs2s6fv0018pgvhwk5uyxqq"],
      note: "M i #6: behåller regelkrångel-position, tar bort miljöbalken",
    },
    {
      questionId: "cmqtoszzl000uwwvhfsoqgys8",
      keepId:    "cmqtl5do4003vu8vhcohhjta2",
      removeIds: ["cmqtl5do8003wu8vhp76uax92"],
      note: "V i #14: behåller direktare infra-position",
    },
    {
      questionId: "cmqtot6x20011wwvhbvgllz2f",
      keepId:    "cmqs2okc10004pgvh0ewwd0z2",
      removeIds: ["cmqtllust009au8vh192cyoe1"],
      note: "SD i #42: behåller drivmedels-specifika, tar bort bred skatte-position",
    },
    {
      questionId: "cmrcfslke0002wsvh8dceifzb",
      keepId:    "cmqs2p0l8000epgvhehlnmrdr",
      removeIds: ["cmqtlq9da00ayu8vhpmt12ung"],
      note: "C i #5: behåller direktare företagskvalitet-position",
    },
    {
      questionId: "cmrcfsll80004wsvht7gwm7tf",
      keepId:    "cmqtlvzo500cvu8vh6j0wikal",
      removeIds: ["cmqtly8b000dqu8vhr7fzgd52"],
      note: "MP i #9: behåller finanspolitik/investering, tar bort energiomställning",
    },
    {
      questionId: "cmrcft0sc0006wsvhojr3jcj3",
      keepId:    "cmqs2t9wp001jpgvhx5zemv50",
      removeIds: ["cmqs2t9xa001ppgvh70faphma"],
      note: "M i #31: behåller verktyg-position, tar bort föräldraansvar",
    },
    {
      questionId: "cmrcfu0um000bwsvh6hmp2aov",
      keepId:    "cmqtl5do4003vu8vhcohhjta2",
      removeIds: ["cmqtl5do8003wu8vhp76uax92"],
      note: "V i #13: behåller statlig ägroll, tar bort elnätexpansion",
    },
    {
      questionId: "cmrcfv70q000iwsvhy5tz5bv1",
      keepId:    "cmqtkvg680008u8vhlngm8yw2",
      removeIds: ["cmqtkx10f000zu8vhrhpq8uym"],
      note: "S i #19: behåller sysselsättning/investering, tar bort nyindustrialisering",
    },
    {
      questionId: "cmrcfvi7j000jwsvhnknobjdc",
      keepId:    "cmqs2r4cl000qpgvhu6f4ync3",
      removeIds: ["cmqs2r4ct000spgvhfr6mdml8"],
      note: "M i #2: behåller bygglov-position, tar bort överklagande",
    },
    {
      questionId: "cmrcfvi81000kwsvh8pq8valc",
      keepId:    "cmqtl3nbp0037u8vhl0dbwu2m",
      removeIds: ["cmqtl3nbt0038u8vh6vwap6eb"],
      note: "V i #3: behåller aktiv bostadsroll, tar bort statligt byggbolag",
    },
  ];

  for (const fix of KEEP_FIRST) {
    let removed = 0;
    for (const removeId of fix.removeIds) {
      try {
        await prisma.questionPosition.delete({
          where: {
            questionId_positionId: {
              questionId: fix.questionId,
              positionId: removeId,
            },
          },
        });
        removed++;
      } catch {
        // Kan redan vara borttagen
      }
    }
    console.log(`  ✓ ${fix.note} (${removed} borttagna)`);
  }

  console.log("\nDatafix klar.\n");

  // ── Kontrollera resultat ──────────────────────────────────────────────────
  const allApproved = await prisma.question.findMany({
    where: { reviewStatus: "APPROVED" },
    include: {
      positions: {
        include: { position: { include: { party: { select: { shortName: true } } } } },
      },
    },
  });

  let dupCount = 0;
  for (const q of allApproved) {
    const partyCounts: Record<string, number> = {};
    for (const qp of q.positions) {
      const sn = qp.position.party.shortName;
      partyCounts[sn] = (partyCounts[sn] ?? 0) + 1;
    }
    const remaining = Object.entries(partyCounts).filter(([, n]) => n > 1);
    if (remaining.length > 0) {
      dupCount++;
      console.log(`  ⚠ Kvarstående duplikat i "${q.questionText.slice(0, 60)}"`);
      for (const [p, n] of remaining) console.log(`    ${p}: ${n} poster`);
    }
  }
  if (dupCount === 0) console.log("✓ Inga kvarstående dubbletter.");

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
