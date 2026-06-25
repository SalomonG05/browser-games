/**
 * Applicerar ChatGPT-granskning av balanserad export 2026-06-25 (56 positioner).
 * VIKTIGT: Ändrar inte sourceQuote eller sourceUrl.
 * Genererar INTE valkompassfrågor.
 */

import "dotenv/config";
import { createClient } from "../lib/createClient";

const prisma = createClient();

// ── Direktgodkännanden ────────────────────────────────────────────────────────
const DIRECT_APPROVE = [
  // S (6 av 8 — 2 hanteras i ÄNDRA)
  "cmqtkyfr40019u8vhfzzljc2h",
  "cmqtkusgj0000u8vhml38fgd7",
  "cmqtkx106000wu8vhz8bcjoye",
  "cmqtl0uls0027u8vhoivd920i",
  "cmqtl0ulv0028u8vhpwqtlkz9",
  "cmqtkx10i0010u8vhcdqylql8",
  // V (7 av 8 — 1 hanteras i ÄNDRA)
  "cmqtl3nbp0037u8vhl0dbwu2m",
  "cmqtl4iyc003mu8vhqq5nyloz",
  "cmqtl5do4003vu8vhcohhjta2",
  "cmqtl787v004du8vhiac9zjub",
  "cmqtl3z3t003eu8vhyvltyscb",
  "cmqtl37sr0034u8vhgis39mz2",
  "cmqtl6ovc0048u8vh6hk35vmk",
  // KD (8 av 8)
  "cmqtl8u5y004yu8vhs01dmf4x",
  "cmqtl98q30056u8vh0z9siozk",
  "cmqtlblrk005vu8vh286zc5e0",
  "cmqtlb24v005nu8vhb668jnle",
  "cmqtlacn1005ju8vh7e2lttl0",
  "cmqtlb252005pu8vh4hv7whww",
  "cmqtl8f2u004ru8vhh8u6t3ut",
  "cmqtl9xdc005du8vhlssoqbhx",
  // L (8 av 8)
  "cmqtlk99s008ru8vhpf5xvabr",
  "cmqtlfllj0072u8vhy2km3sku",
  "cmqtlla6x0092u8vhair8uonb",
  "cmqtlhzms0080u8vhu3f9xs25",
  "cmqtlhzmp007zu8vhzitkjhri",
  "cmqtlgls5007eu8vh3g69er2d",
  "cmqtljf0o008fu8vh1v8rt65v",
  "cmqtlhh7t007ru8vh5fd19ig6",
  // SD (5 av 8 — 2 NEEDS_REVIEW, 1 ÄNDRA)
  "cmqs2okby0003pgvh9nsj9b55",
  "cmqtlluse0096u8vh3l41j20o",
  "cmqs2okce0008pgvh8akzzr1c",
  "cmqtllust009au8vh192cyoe1",
  "cmqtllusn0098u8vhplug35ct",
  // C (7 av 8 — 1 hanteras i ÄNDRA)
  "cmqtlrao900b9u8vhtnuf45td",
  "cmqtlt3m400bxu8vh123pip9c",
  "cmqtlt3lw00bvu8vh2dyrt5nv",
  "cmqtlt3m700byu8vhvmdhjm73",
  "cmqtlprq500apu8vh5cq5g0pd",
  "cmqtln86h009ou8vh8wmk2rn5",
  "cmqtls89o00blu8vh8fp5pju0",
  // MP (7 av 8 — 1 hanteras i ÄNDRA)
  "cmqtluf5g00cdu8vhfkid3amf",
  "cmqtly8b000dqu8vhr7fzgd52",
  "cmqtly8ae00dlu8vhh0p2f8ls",
  "cmqtluf5900cbu8vhsdmbxeqa",
  "cmqtlxqne00ddu8vhw7lqbjwu",
  "cmqtlzxne00ebu8vhi392pewr",
  "cmqtluf5500cau8vhor6uqqgm",
];

// ── Ändra och godkänn ─────────────────────────────────────────────────────────
const AMEND_AND_APPROVE: {
  id: string;
  specificQuestion?: string;
  positionValue?: number;
  reviewStatus: string;
  reviewNote?: string;
}[] = [
  // 1. S — EU/Israel: position_value -1 → 2 (partiet är FÖR frysning = positiv position)
  {
    id: "cmqtl0um5002bu8vhp0l623di",
    positionValue: 2,
    reviewStatus: "APPROVED",
    reviewNote: "ChatGPT: position_value korrigerad från -1 till 2 (partiet stödjer frysning = JA = 2)",
  },
  // 2. S — jobb/industri: förtydligad fråga
  {
    id: "cmqtkx10f000zu8vhrhpq8uym",
    specificQuestion: "Bör Sverige prioritera nyindustrialisering för att skapa fler industrijobb och ökad tillväxt?",
    positionValue: 2,
    reviewStatus: "APPROVED",
    reviewNote: "ChatGPT: frågan förtydligad för att bättre matcha källtexten",
  },
  // 3. V — utrikespolitik: förtydligad fråga
  {
    id: "cmqtl788g004ju8vhlvo33igc",
    specificQuestion: "Bör svensk utrikespolitik prioritera kvinnors frigörelse och global social rättvisa?",
    positionValue: 2,
    reviewStatus: "APPROVED",
    reviewNote: "ChatGPT: frågan omformulerad för att bättre matcha källtexten",
  },
  // 4. SD — klimat: fråga och värde justerat (ineffektiva satsningar, inte alla)
  {
    id: "cmqs2okc40005pgvhlor1oobk",
    specificQuestion: "Bör Sverige undvika klimatpolitiska satsningar som bedöms vara ineffektiva?",
    positionValue: 2,
    reviewStatus: "APPROVED",
    reviewNote: "ChatGPT: frågan preciserad — citatet kritiserar ineffektiva satsningar, inte klimatpolitik i allmänhet",
  },
  // 5. SD — migration: position_value -2 → 2 (SD är FÖR begränsning)
  {
    id: "cmqtlmpee009eu8vhwa0538pl",
    positionValue: 2,
    reviewStatus: "APPROVED",
    reviewNote: "ChatGPT: position_value korrigerad från -2 till 2 (SD stödjer begränsad migration = JA = 2)",
  },
  // 6. C — försvar: fråga omformulerad, status NEEDS_REVIEW (bred uppgörelse, ej partiskiljande)
  {
    id: "cmqtlrucd00biu8vh109fzmdu",
    specificQuestion: "Bör Sverige stödja den breda försvarsuppgörelsen om historiskt stora försvarssatsningar?",
    positionValue: 2,
    reviewStatus: "NEEDS_REVIEW",
    reviewNote: "ChatGPT: bygger på bred riksdagsuppgörelse, ej tydligt partiskiljande — kräver ytterligare granskning",
  },
  // 7. MP — jobb/migration: position_value 1 → 2
  {
    id: "cmqtlwgzs00d5u8vhfg3zbnky",
    positionValue: 2,
    reviewStatus: "APPROVED",
    reviewNote: "ChatGPT: position_value justerad från 1 till 2 (partiet stödjer villkorad arbetskraftsinvandring starkt)",
  },
];

// ── Sätt NEEDS_REVIEW ─────────────────────────────────────────────────────────
const NEEDS_REVIEW: { id: string; reviewNote: string }[] = [
  {
    id: "cmqtlmpeh009fu8vhxihgymdd",
    reviewNote: "ChatGPT: positionen om ny kärnkraft är sannolikt korrekt men källan är Tidöavtalet (ej ren SD-programsida) — godkänn om SD:s eget material bekräftar",
  },
  // cmqtlrucd00biu8vh109fzmdu hanteras redan i AMEND_AND_APPROVE ovan
];

async function main() {
  console.log("Applicerar ChatGPT-granskning (balanserad export 2026-06-25)...\n");

  // 1. Direktgodkännanden
  const approveResult = await prisma.position.updateMany({
    where: { id: { in: DIRECT_APPROVE } },
    data: {
      reviewStatus: "APPROVED",
      reviewNote: "ChatGPT-godkänd 2026-06-25 (balanserad export)",
    },
  });
  console.log(`✓ Direktgodkända:       ${approveResult.count} positioner`);

  // 2. Ändra och godkänn
  let amendCount = 0;
  for (const a of AMEND_AND_APPROVE) {
    const data: Record<string, unknown> = {
      reviewStatus: a.reviewStatus,
      reviewNote:   a.reviewNote ?? null,
    };
    if (a.specificQuestion !== undefined) data.specificQuestion = a.specificQuestion;
    if (a.positionValue    !== undefined) data.positionValue    = a.positionValue;
    await prisma.position.update({ where: { id: a.id }, data });
    amendCount++;
  }
  console.log(`✓ Ändrade och godkända: ${amendCount} positioner`);

  // 3. Sätt NEEDS_REVIEW
  let nrCount = 0;
  for (const nr of NEEDS_REVIEW) {
    await prisma.position.update({
      where: { id: nr.id },
      data:  { reviewStatus: "NEEDS_REVIEW", reviewNote: nr.reviewNote },
    });
    nrCount++;
  }
  console.log(`✓ Satta till NEEDS_REVIEW: ${nrCount} positioner`);

  // ── Statistik ──────────────────────────────────────────────────────────────
  const parties = await prisma.party.findMany({ select: { id: true, name: true, shortName: true } });
  const PARTY_ORDER = [
    "socialdemokraterna", "vansterpartiet", "kristdemokraterna",
    "liberalerna", "sverigedemokraterna", "centerpartiet", "miljopartiet", "moderaterna",
  ];

  const approved = await prisma.position.groupBy({
    by: ["partyId"],
    where: { reviewStatus: "APPROVED" },
    _count: { id: true },
  });
  const highPending = await prisma.position.groupBy({
    by: ["partyId"],
    where: { reviewStatus: "PENDING", confidence: "HIGH" },
    _count: { id: true },
  });
  const allStatuses = await prisma.position.groupBy({
    by: ["partyId", "reviewStatus"],
    _count: { id: true },
  });

  const apMap = Object.fromEntries(approved.map((c) => [c.partyId, c._count.id]));
  const hpMap = Object.fromEntries(highPending.map((c) => [c.partyId, c._count.id]));

  const statusMap: Record<string, Record<string, number>> = {};
  for (const g of allStatuses) {
    if (!statusMap[g.partyId]) statusMap[g.partyId] = {};
    statusMap[g.partyId][g.reviewStatus] = g._count.id;
  }

  const totalApproved = approved.reduce((s, c) => s + c._count.id, 0);

  console.log("\n" + "═".repeat(62));
  console.log("STATISTIK EFTER GRANSKNING");
  console.log("═".repeat(62));

  console.log("\n── APPROVED per parti ───────────────────────────────────────");
  for (const pId of PARTY_ORDER) {
    const p = parties.find((x) => x.id === pId);
    if (!p) continue;
    const n   = apMap[pId] ?? 0;
    const bar = "█".repeat(Math.min(n, 40));
    const pct = totalApproved ? ((n / totalApproved) * 100).toFixed(0) + "%" : "0%";
    const flag = pId === "moderaterna" ? " (referens)" : n >= 8 ? " ✓" : n >= 5 ? " ~" : n > 0 ? " ⚠" : " ✗ SAKNAS";
    console.log(`  ${p.shortName.padEnd(5)} ${String(n).padStart(3)}  ${pct.padStart(4)}  ${bar}${flag}`);
  }
  console.log(`\n  TOTALT: ${totalApproved} APPROVED`);

  console.log("\n── HIGH/PENDING per parti (återstår för nästa granskning) ──");
  console.log("  Parti  HIGH/PEND  NR    TOT-PEND");
  console.log("  " + "─".repeat(36));
  for (const pId of PARTY_ORDER) {
    if (pId === "moderaterna") continue;
    const p  = parties.find((x) => x.id === pId);
    if (!p) continue;
    const hp = hpMap[pId] ?? 0;
    const nr = statusMap[pId]?.["NEEDS_REVIEW"] ?? 0;
    const pe = statusMap[pId]?.["PENDING"] ?? 0;
    console.log(`  ${p.shortName.padEnd(6)} ${String(hp).padStart(9)} ${String(nr).padStart(5)} ${String(pe).padStart(9)}`);
  }

  console.log("\n── Rekommendation ───────────────────────────────────────────");

  const minApproved = Math.min(...PARTY_ORDER.filter(p => p !== "moderaterna").map(p => apMap[p] ?? 0));
  const maxApproved = Math.max(...PARTY_ORDER.filter(p => p !== "moderaterna").map(p => apMap[p] ?? 0));
  const mApproved   = apMap["moderaterna"] ?? 0;

  console.log(`  Moderaterna (referens):  ${mApproved} APPROVED`);
  console.log(`  Lägst (exkl. M):         ${minApproved} APPROVED`);
  console.log(`  Högst (exkl. M):         ${maxApproved} APPROVED`);

  if (minApproved >= 5 && totalApproved >= 50) {
    console.log("\n  ✓ Materialet bedöms tillräckligt för en FÖRSTA FRÅGEGENERERING.");
    console.log("    Alla 7 granskade partier har ≥5 APPROVED-positioner.");
    console.log("    Totalt " + totalApproved + " APPROVED ger god täckning för kompassfrågorna.");
    console.log("\n    Rekommendation: kör granskning av ytterligare en omgång ELLER");
    console.log("    generera ett första utkast av frågor och granska dem separat.");
  } else if (minApproved >= 3) {
    console.log("\n  ~ En tredje granskningsomgång rekommenderas (≥1 parti under 5).");
    console.log("    ELLER godkänn ett urval ur PENDING direkt i admin-UI:t.");
  } else {
    console.log("\n  ✗ Minst ett parti saknar tillräckligt material — tredje omgång krävs.");
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
