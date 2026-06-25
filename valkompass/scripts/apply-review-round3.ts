/**
 * Applicerar ChatGPT-granskning av runda 3-exporten (77 positioner, 2026-06-25).
 * Ändrar INTE sourceQuote eller sourceUrl.
 * Genererar INTE valkompassfrågor.
 */

import "dotenv/config";
import { createClient } from "../lib/createClient";

const prisma = createClient();

// ── Direktgodkännanden ────────────────────────────────────────────────────────
const DIRECT_APPROVE = [
  // S (10)
  "cmqtkush10004u8vhfl4nkysq",
  "cmqtkusgt0002u8vh4wv7cozy",
  "cmqtkzyol001xu8vho9zr1mz1",
  "cmqtkzgol001qu8vhogengv7k",
  "cmqtkvg680008u8vhlngm8yw2",
  "cmqtkwge3000tu8vhdfh120yg",
  "cmqtl0uly0029u8vhas35ufn0",
  "cmqtkyzc9001gu8vhy3youn5y",
  "cmqtkusgp0001u8vhn1y52wox",
  "cmqtkvvk7000ju8vhbc32tv2w",
  // V (11)
  "cmqtl3nbt0038u8vh6vwap6eb",
  "cmqtl6ovr004cu8vhxlcf7irt",
  "cmqtl5do8003wu8vhp76uax92",
  "cmqtl7883004fu8vh34zcok85",
  "cmqtl3z3x003fu8vhqa7w1pyj",
  "cmqtl1fxd002gu8vhdggky0oy",
  "cmqtl37sn0033u8vhdzemxcrg",
  "cmqtl4zac003qu8vhzoy0lbun",
  "cmqtl2k39002ru8vh7n9p87q5",
  "cmqtl1zdu002ku8vheozhrix9",
  "cmqtl5vu50042u8vhwq1emszp",
  // KD (9)
  "cmqtl8u6b0051u8vhrg3ae39g",
  "cmqtl8f38004vu8vh85ww13oc",
  "cmqtlblrh005uu8vhvztxct27",
  "cmqtlacmm005fu8vhezof6er8",
  "cmqtld3if006cu8vhf7lv87p0",
  "cmqtlblr9005su8vhm5i2j8jr",
  "cmqtld3hm0067u8vhgc6i03pv",
  "cmqtl8f31004tu8vhbfvbk0c3",
  "cmqtl8f3f004xu8vhpcqk7vfl",
  // L (10)
  "cmqtlla730094u8vh8mxtkv0t",
  "cmqtlku3i008tu8vhppu6cnfz",
  "cmqtlhzmi007xu8vhvrlkfdi2",
  "cmqtlfllt0075u8vha8et499o",
  "cmqtlglsg007hu8vhniwj6n6d",
  "cmqtlku43008yu8vhds5u630c",
  "cmqtlj16x008au8vhm381u7hy",
  "cmqtlh31a007ou8vhnfg87jim",
  "cmqtlfllq0074u8vhtf3d5bef",
  "cmqtlf3ux0070u8vh5hy1xgcm",
  // SD (7)
  "cmqtllusq0099u8vhaplvet4b",
  "cmqtlmpf2009lu8vh2mus4ocn",
  "cmqtllusw009bu8vhsa8n9nxy",
  "cmqtlmpe8009du8vh46eoyyil",
  "cmqtlmpel009gu8vhng42wmsp",
  "cmqtlmpeo009hu8vhhjo2fxpi",
  "cmqtlmpes009iu8vhpjuzcdng",
  // C (8)
  "cmqtlqqyn00b1u8vhzd1kp8ok",
  "cmqtlq9da00ayu8vhpmt12ung",
  "cmqtlo8r400a6u8vhcy0q9qhv",
  "cmqtlruc000beu8vh19xt97ud",
  "cmqtlor3800adu8vhtsga4gb7",
  "cmqtlraog00bbu8vhwiclyl7s",
  "cmqtls89s00bmu8vhncbzu6f6",
  "cmqtlq9cp00atu8vh1mmghzox",
  // MP (9)
  "cmqtlzb3j00e2u8vhq1k9se44",
  "cmqtlvzo500cvu8vh6j0wikal",
  "cmqtly8ak00dmu8vhn4jocqbn",
  "cmqtltovk00c5u8vh83emw3w1",
  "cmqtlxqnl00dfu8vhqsj1bctc",
  "cmqtltovb00c2u8vho4jagxjz",
  "cmqtlzxnb00eau8vh2399fmqn",
  "cmqtlwgz000czu8vhgrnboz70",
  "cmqtlvzo100cuu8vhokuih1ak",
];

// ── Ändra och godkänn ─────────────────────────────────────────────────────────
const AMEND_AND_APPROVE: {
  id: string;
  specificQuestion?: string;
  positionValue?: number;
  topic?: string;
  reviewNote: string;
}[] = [
  // 1. S — energi/EU: fråga preciserad mot citatet
  {
    id: "cmqtkzyos001zu8vheleyz37h",
    specificQuestion: "Bör Sverige agera i EU för att sänka elpriserna för hushåll och företag?",
    positionValue: 2,
    reviewNote: "ChatGPT R3: fråga preciserad — citatet stödjer EU-åtgärder för elpriset, inte specifik frikoppling från gaspriser",
  },
  // 2. S — migration: position_value -1 → 2 (S stöder villkorade tillstånd = JA)
  {
    id: "cmqtkxqqi0013u8vh5b6cfsiz",
    positionValue: 2,
    reviewNote: "ChatGPT R3: position_value korrigerad -1 → 2 (S stödjer villkorade uppehållstillstånd = JA = 2)",
  },
  // 3. V — lag_ordning: frågan förtydligad till tydlig ja/nej
  {
    id: "cmqtl6ovk004au8vh3igyw6q3",
    specificQuestion: "Bör staten ta större ansvar för inslussningen av tidigare dömda i samhället?",
    positionValue: 2,
    reviewNote: "ChatGPT R3: frågan omformulerad till tydlig ja/nej (borttog 'och vem ska ansvara?')",
  },
  // 4. KD — EU: position_value 1 → 2 (tydligare ståndpunkt)
  {
    id: "cmqtl8f3b004wu8vhszg07mag",
    positionValue: 2,
    reviewNote: "ChatGPT R3: position_value justerad 1 → 2 (KD är tydligt för miniminivå-implementering)",
  },
  // 5. KD — vård/äldre: fråga preciserad mot citatet
  {
    id: "cmqtlej76006su8vhyd0y4tq5",
    specificQuestion: "Bör arbetsvillkoren för personal inom äldreomsorgen förbättras?",
    positionValue: 2,
    reviewNote: "ChatGPT R3: fråga förenklad — 'delade turer' ej stött av citatet, bredare formulering korrekt",
  },
  // 6. SD — integration: fråga neutraliserad och preciserad
  {
    id: "cmqs61j5r001w28vh2kig23gw",
    specificQuestion: "Bör integrationen ställa krav på svenska språket, självförsörjning och respekt för lagar och normer?",
    positionValue: 2,
    reviewNote: "ChatGPT R3: fråga omformulerad för att ligga närmare citatet",
  },
  // 7. L — klimat: fråga anpassad till citatet (innovation/frihandel i klimatomställning)
  {
    id: "cmqtlhh8c007vu8vhjhsi03rc",
    specificQuestion: "Bör innovation, entreprenörskap och frihandel användas som verktyg i klimatomställningen?",
    positionValue: 2,
    reviewNote: "ChatGPT R3: fråga omformulerad för att bättre matcha citatet",
  },
  // 8. L — topic ändrad + fråga: lag_ordning/socialtjänst
  {
    id: "cmqtlig1u0086u8vh7eapokmd",
    topic: "lag_ordning",
    specificQuestion: "Bör socialtjänsten få fler verktyg för att hjälpa unga i riskzonen innan de hamnar i kriminalitet?",
    positionValue: 2,
    reviewNote: "ChatGPT R3: topic ändrad socialförsäkring → lag_ordning; fråga omformulerad till socialtjänst/brottsprevention",
  },
  // 9. SD — migration: position_value -2 → 2
  {
    id: "cmqs2okbr0001pgvhfhinssph",
    positionValue: 2,
    reviewNote: "ChatGPT R3: position_value korrigerad -2 → 2 (SD stöder restriktiv invandringspolitik = JA = 2)",
  },
  // 10. SD — migration: position_value -2 → 2
  {
    id: "cmqtllusj0097u8vhx1qk5ere",
    positionValue: 2,
    reviewNote: "ChatGPT R3: position_value korrigerad -2 → 2 (SD stöder begränsad asyl/anhörig = JA = 2)",
  },
  // 11. MP — klimat/miljö: fråga preciserad mot citatet
  {
    id: "cmqtluf4y00c8u8vhtwuu1wol",
    specificQuestion: "Bör skyddsvärda land- och vattenområden få starkare och mer långsiktigt skydd?",
    positionValue: 2,
    reviewNote: "ChatGPT R3: fråga preciserad — '30 procent' ej stött av citatet, bredare formulering korrekt",
  },
];

// ── NEEDS_REVIEW ──────────────────────────────────────────────────────────────
const NEEDS_REVIEW = [
  {
    id: "cmqtlprpz00anu8vh9x3smy0c",
    reviewNote: "ChatGPT R3: citatet 'Ett uselt förslag är fortfarande uselt med några undantag' stödjer inte tydligt lönegolv för arbetskraftsinvandring — behöver längre/mer explicit citat",
  },
  {
    id: "cmqtlv1gs00chu8vh5pfmdedw",
    reviewNote: "ChatGPT R3: citatet beskriver problemet (ojämlik vård) men visar inte den konkreta politiska åtgärden MP vill vidta — behöver bättre citat",
  },
];

const PARTY_ORDER = [
  "socialdemokraterna", "vansterpartiet", "kristdemokraterna",
  "liberalerna", "sverigedemokraterna", "centerpartiet", "miljopartiet", "moderaterna",
];

const TARGET_TOPICS = [
  "ekonomi", "skatter", "jobb", "skola", "vård", "klimat", "energi",
  "migration", "lag_ordning", "bostäder", "försvar", "eu", "jämställdhet", "socialförsäkring",
];

const TOPIC_LABEL: Record<string, string> = {
  ekonomi: "ekonomi", skatter: "skatter", jobb: "jobb", skola: "skola",
  vård: "vård", klimat: "klimat", energi: "energi",
  migration: "migration/integration", lag_ordning: "lag och ordning",
  bostäder: "bostäder", försvar: "försvar", eu: "EU",
  jämställdhet: "jämställdhet", socialförsäkring: "socialförsäkring",
};

async function main() {
  console.log("Applicerar ChatGPT-granskning runda 3 (2026-06-25)...\n");

  // 1. Direktgodkännanden
  const approveResult = await prisma.position.updateMany({
    where: { id: { in: DIRECT_APPROVE } },
    data: {
      reviewStatus: "APPROVED",
      reviewNote: "ChatGPT-godkänd 2026-06-25 (runda 3)",
    },
  });
  console.log(`✓ Direktgodkända:          ${approveResult.count} positioner`);

  // 2. Ändra och godkänn
  let amendOk = 0, amendFail = 0;
  for (const a of AMEND_AND_APPROVE) {
    const data: Record<string, unknown> = {
      reviewStatus: "APPROVED",
      reviewNote:   a.reviewNote,
    };
    if (a.specificQuestion !== undefined) data.specificQuestion = a.specificQuestion;
    if (a.positionValue    !== undefined) data.positionValue    = a.positionValue;
    if (a.topic            !== undefined) data.topic            = a.topic;
    try {
      await prisma.position.update({ where: { id: a.id }, data });
      amendOk++;
    } catch (e: unknown) {
      console.error(`  ✗ Kunde inte uppdatera ${a.id}: ${e instanceof Error ? e.message : e}`);
      amendFail++;
    }
  }
  console.log(`✓ Ändrade och godkända:    ${amendOk} positioner${amendFail ? ` (${amendFail} misslyckades)` : ""}`);

  // 3. NEEDS_REVIEW
  let nrOk = 0;
  for (const nr of NEEDS_REVIEW) {
    await prisma.position.update({
      where: { id: nr.id },
      data:  { reviewStatus: "NEEDS_REVIEW", reviewNote: nr.reviewNote },
    });
    nrOk++;
  }
  console.log(`✓ Satta till NEEDS_REVIEW: ${nrOk} positioner`);

  // ── Statistik ──────────────────────────────────────────────────────────────
  const parties   = await prisma.party.findMany({ select: { id: true, name: true, shortName: true } });
  const partyMap  = Object.fromEntries(parties.map(p => [p.id, p]));

  const approved  = await prisma.position.groupBy({
    by: ["partyId"],
    where: { reviewStatus: "APPROVED" },
    _count: { id: true },
  });

  const apMap     = Object.fromEntries(approved.map(c => [c.partyId, c._count.id]));
  const total     = approved.reduce((s, c) => s + c._count.id, 0);

  // Topic coverage per party (from APPROVED positions)
  const approvedPos = await prisma.position.findMany({
    where:  { reviewStatus: "APPROVED", partyId: { notIn: ["moderaterna"] } },
    select: { partyId: true, topic: true },
  });
  const coverageMap: Record<string, Set<string>> = {};
  for (const p of approvedPos) {
    if (!coverageMap[p.partyId]) coverageMap[p.partyId] = new Set();
    coverageMap[p.partyId].add(p.topic);
  }

  // Remaining HIGH/PENDING
  const pending = await prisma.position.groupBy({
    by: ["partyId"],
    where: { reviewStatus: "PENDING", confidence: "HIGH", partyId: { notIn: ["moderaterna"] } },
    _count: { id: true },
  });
  const peMap = Object.fromEntries(pending.map(c => [c.partyId, c._count.id]));

  console.log("\n" + "═".repeat(68));
  console.log("STATISTIK EFTER RUNDA 3");
  console.log("═".repeat(68));

  // APPROVED per party
  console.log("\n── APPROVED per parti ───────────────────────────────────────────");
  console.log("  Parti  APPROVED  Mål 20  Täcker topics  Saknar topics");
  console.log("  " + "─".repeat(64));

  const TARGET = 20;
  let allReady = true;

  for (const pId of PARTY_ORDER) {
    const p    = partyMap[pId];
    const n    = apMap[pId] ?? 0;
    const flag = pId === "moderaterna"
      ? "(referens)"
      : n >= TARGET ? "✓" : `✗ (saknar ${TARGET - n})`;

    if (pId !== "moderaterna" && n < TARGET) allReady = false;

    if (pId === "moderaterna") {
      console.log(`  ${p.shortName.padEnd(6)} ${String(n).padStart(8)}  ${flag}`);
      continue;
    }

    const covered = coverageMap[pId] ?? new Set();
    const covCount = TARGET_TOPICS.filter(t => covered.has(t)).length;
    const missing  = TARGET_TOPICS.filter(t => !covered.has(t));
    const missStr  = missing.length > 0
      ? missing.map(t => TOPIC_LABEL[t] ?? t).join(", ")
      : "—";

    console.log(
      `  ${p.shortName.padEnd(6)} ${String(n).padStart(8)}  ${flag.padEnd(12)} ${String(covCount).padStart(2)}/14 täckta  saknar: ${missStr}`
    );
  }

  console.log(`\n  TOTALT: ${total} APPROVED`);

  // Remaining HIGH/PENDING
  console.log("\n── Kvarvarande HIGH/PENDING (exkl. M) ──────────────────────────");
  for (const pId of PARTY_ORDER.filter(p => p !== "moderaterna")) {
    const p  = partyMap[pId];
    const hp = peMap[pId] ?? 0;
    const ap = apMap[pId] ?? 0;
    const bar = "░".repeat(Math.min(hp, 30));
    console.log(`  ${p.shortName.padEnd(5)} ${String(hp).padStart(4)} HIGH/PENDING kvar  (${ap} APPROVED)  ${bar}`);
  }

  // Rekommendation
  console.log("\n── Rekommendation ───────────────────────────────────────────────");

  const nonM       = PARTY_ORDER.filter(p => p !== "moderaterna");
  const minAp      = Math.min(...nonM.map(p => apMap[p] ?? 0));
  const maxAp      = Math.max(...nonM.map(p => apMap[p] ?? 0));
  const mAp        = apMap["moderaterna"] ?? 0;
  const ratio      = minAp > 0 ? (mAp / minAp).toFixed(1) : "∞";

  console.log(`  M (referens): ${mAp} APPROVED`);
  console.log(`  Lägst exkl. M: ${minAp} | Högst exkl. M: ${maxAp} | M/lägst: ${ratio}×`);
  console.log();

  if (allReady) {
    console.log("  ✓ ALLA 7 PARTIER HAR NÅT MÅLET 20 APPROVED.");
    console.log();
    console.log("  Materialet är tillräckligt för en balanserad frågegenerering.");
    console.log(`  M har ${mAp} vs lägst ${minAp} för övriga — ratio ${ratio}× (acceptabelt om <3×).`);
    if (mAp / minAp > 3) {
      console.log("  ⚠  M är mer än 3× övriga — frågorna riskerar att spegla M:s positioner");
      console.log("     mer än de andra. Överväg ytterligare en granskningsrunda.");
    } else {
      console.log("  Frågegenerering kan köras när du är redo.");
      console.log("  Kör: NODE_OPTIONS=\"--use-system-ca\" npm run generate-questions");
    }
  } else {
    const under = nonM.filter(p => (apMap[p] ?? 0) < TARGET);
    console.log(`  ✗ Partier under ${TARGET} APPROVED: ${under.map(p => partyMap[p]?.shortName).join(", ")}`);
    console.log("  Ytterligare granskningsrunda rekommenderas.");
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
