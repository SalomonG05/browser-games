/**
 * Applicerar ChatGPT-granskning av 72 kandidatfrågor (2026-07-08).
 *
 * Steg:
 * 1. Relevansfiltrera QuestionPosition-länkar via Claude API (per ämneskluster)
 * 2. Applicera ChatGPT-beslut: APPROVED / text-ändring / REJECTED
 * 3. Sätt NEEDS_REVIEW om < 2 relevanta partier efter filtrering
 * 4. Visa statistik
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "../lib/createClient";

const prisma    = createClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DELAY_MS              = 1200;
const MIN_PARTIES_THRESHOLD = 2;

// ── Direktgodkännanden (50 frågor) ───────────────────────────────────────────
const DIRECT_APPROVE_IDS: string[] = [
  "cmqtosgda0000wwvhlsqx1mil",
  "cmqtosgel0001wwvh77ykxiel",
  "cmqtosgfs0002wwvh05mvc3e8",
  "cmqtosgje0005wwvhp0am31fh",
  "cmqtosond000bwwvhsg18jagj",
  "cmqtosop9000cwwvhfq893611",
  "cmqtosor7000dwwvhgenz5fr0",
  "cmqtosot1000ewwvhx1xmcaxo",
  "cmqtosout000fwwvh7wyw2784",
  "cmqtosowj000gwwvhlv5l6npr",
  "cmqtosstw000iwwvhqtj6h3jt",
  "cmqtosswi000kwwvh88wvikjz",
  "cmqtoswkq000nwwvhvuproyo7",
  "cmqtoswls000owwvh5jslrxwa",
  "cmqtoswnv000qwwvht7vojtoh",
  "cmqtoszws000swwvh0govge8j",
  "cmqtoszy7000twwvhcrhy6ni8",
  "cmqtoszzl000uwwvhfsoqgys8",
  "cmqtot00y000vwwvhsh52ys2k",
  "cmqtot3fm000wwwvhac1f6nne",
  "cmqtot3gw000xwwvh4t52ebh7",
  "cmqtot3i3000ywwvhini3hytz",
  "cmqtot3j9000zwwvhllga3482",
  "cmqtot6x20011wwvhbvgllz2f",
  "cmqtot6yl0012wwvhrucm74nd",
  "cmqtot6zx0013wwvhtjfv2idq",
  "cmqtot71a0014wwvh0mxm0pj6",
  "cmqtot72l0015wwvhbfaazfmu",
  "cmqtot73y0016wwvhkgohss2d",
  "cmqtotbog0017wwvh0035njn1",
  "cmqtotbpx0018wwvhuht89rv7",
  "cmqtotbra0019wwvhwx7zw7ao",
  "cmqtotbso001awwvhfy0vtuxm",
  "cmqtotbu1001bwwvhpayvf74c",
  "cmqtotbvd001cwwvh0mm6unjc",
  "cmqtotg1i001dwwvhilfdh3fd",
  "cmqtotg33001ewwvhkkpo4h0t",
  "cmqtotg4k001fwwvhbuy58vr1",
  "cmqtotg62001gwwvhk71b5l70",
  "cmqtotg9a001iwwvh21v7mdsj",
  "cmqtotl5j001jwwvhd5w39uhk",
  "cmqtotoy1001mwwvhtfj58994",
  "cmqtotozc001nwwvhql4o2nh4",
  "cmqtotp1q001pwwvhp3hs9fie",
  "cmqtotseu001swwvhr8il3qbr",
  "cmqtotsg9001twwvhsqe3l1qv",
  "cmqtotshm001uwwvh4tcl535f",
  "cmqtotv86001wwwvhja4vaszg",
  "cmqtotv91001xwwvhewlqnj0l",
  "cmqtotval001zwwvhy4pce0nb",
];

// ── Ändra och godkänn (18 frågor) ────────────────────────────────────────────
const AMEND_AND_APPROVE: { id: string; questionText: string; reviewNote: string }[] = [
  {
    id:           "cmqtosgh50003wwvhncf89zfw",
    questionText: "Bör förskolan prioritera svenska språket framför stöd för modersmålsutveckling?",
    reviewNote:   "ChatGPT 2026-07-08: formulering preciserad — 'enbart' ersatt med 'prioritera framför'",
  },
  {
    id:           "cmqtoskci0006wwvh3y6fj2x5",
    questionText: "Bör skattesänkningar för höginkomsttagare prioriteras?",
    reviewNote:   "ChatGPT 2026-07-08: omformulerad till tydlig prioriteringsfråga",
  },
  {
    id:           "cmqtoskfi0008wwvh7dr89f3n",
    questionText: "Bör staten ta en aktiv roll i att samordna klimatomställningen och energiomställningen?",
    reviewNote:   "ChatGPT 2026-07-08: breddad till klimat+energi för att täcka grön ekonomi",
  },
  {
    id:           "cmqtoskh30009wwvhkxl9ji49",
    questionText: "Bör regler och administration för företag förenklas?",
    reviewNote:   "ChatGPT 2026-07-08: neutralare och enklare formulering",
  },
  {
    id:           "cmqtoskik000awwvhe89fv4ug",
    questionText: "Bör Sverige införa ett mål om att fler ska försörja sig själva genom arbete?",
    reviewNote:   "ChatGPT 2026-07-08: begripligare formulering för väljare",
  },
  {
    id:           "cmqtosssi000hwwvhqd8fzjw0",
    questionText: "Bör mer skyddsvärd skogsmark skyddas från avverkning?",
    reviewNote:   "ChatGPT 2026-07-08: mer precis och mindre kategorisk",
  },
  {
    id:           "cmqtoswjm000mwwvhnkwj3kpp",
    questionText: "Bör förskolan i huvudsak vara skärmfri?",
    reviewNote:   "ChatGPT 2026-07-08: förenklat till kärnan i den politiska skiljelinjen",
  },
  {
    id:           "cmqtoswmu000pwwvh79oxclqi",
    questionText: "Bör kommuner erbjuda språkförskola för barn med svag svenska?",
    reviewNote:   "ChatGPT 2026-07-08: 'särskild' borttaget för enklare läsning",
  },
  {
    id:           "cmqtoswoy000rwwvhxr73tm1e",
    questionText: "Bör förskolan ha mätbara mål för barns språkutveckling?",
    reviewNote:   "ChatGPT 2026-07-08: kortad och tydliggjord",
  },
  {
    id:           "cmqtot3kg0010wwvhud9wsuur",
    questionText: "Bör Sverige inrätta ett särskilt veterancentrum för soldater efter internationella insatser?",
    reviewNote:   "ChatGPT 2026-07-08: omformulerad för tydlighet; sätts till NEEDS_REVIEW om färre än 2 relevanta partier",
  },
  {
    id:           "cmqtotg7p001hwwvhi74ey5d2",
    questionText: "Bör bostadsbidraget höjas för hushåll med svag ekonomi?",
    reviewNote:   "ChatGPT 2026-07-08: mer konkret och definierat målgrupp",
  },
  {
    id:           "cmqtotl66001kwwvh23iqn629",
    questionText: "Bör barn till föräldrar med långvarigt bidragsberoende få utökad tillgång till förskola?",
    reviewNote:   "ChatGPT 2026-07-08: tydligare och närmre positionen",
  },
  {
    id:           "cmqtotl6j001lwwvhaczsgbsj",
    questionText: "Bör inkomstpensionerna höjas?",
    reviewNote:   "ChatGPT 2026-07-08: förenklad — teknisk formulering om '90-talets löfte' borttagen",
  },
  {
    id:           "cmqtotp0k001owwvh906ai8pe",
    questionText: "Bör EU frysa associationsavtalet med Israel med anledning av kriget i Gaza?",
    reviewNote:   "ChatGPT 2026-07-08: bättre svenska ('till följd av' → 'med anledning av')",
  },
  {
    id:           "cmqtotp2x001qwwvhh55x3szw",
    questionText: "Bör EU skärpa reglerna för farliga kemikalier?",
    reviewNote:   "ChatGPT 2026-07-08: förenklat ('lagstiftningen' → 'reglerna')",
  },
  {
    id:           "cmqtotp43001rwwvh9lctbl1h",
    questionText: "Bör Sverige ha större nationellt självbestämmande över rovdjurspolitiken?",
    reviewNote:   "ChatGPT 2026-07-08: enklare och mer direkt",
  },
  {
    id:           "cmqtotsiy001vwwvh5oqaj1s0",
    questionText: "Bör polisen ha en särskild enhet mot tvångsäktenskap?",
    reviewNote:   "ChatGPT 2026-07-08: förenklat ('inrättas' → 'ha')",
  },
  {
    id:           "cmqtotv9u001ywwvhjh9a94qj",
    questionText: "Bör formellt skydd av privat skog bygga på frivillighet?",
    reviewNote:   "ChatGPT 2026-07-08: mer juridiskt/politiskt korrekt formulering",
  },
];

// ── Avvisade (4 frågor) ───────────────────────────────────────────────────────
const REJECT_IDS: string[] = [
  "cmqtosgic0004wwvh0y2ncbhi",  // transitcenter — för smal, främst SD
  "cmqtoske20007wwvhm2lefk2c",  // bankskatt — för smal, främst S
  "cmqtossv8000jwwvhta1b55wq",  // industrifiske Östersjön — för smal, främst S
  "cmqtossxw000lwwvhuhdm9sd0",  // PFAS-förbud — för smal, främst MP
];

const AMEND_MAP = new Map(AMEND_AND_APPROVE.map(a => [a.id, a]));
const TO_FILTER_IDS = new Set([...DIRECT_APPROVE_IDS, ...AMEND_AND_APPROVE.map(a => a.id)]);

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
};

const PARTY_ORDER = [
  "socialdemokraterna", "vansterpartiet", "kristdemokraterna",
  "liberalerna", "sverigedemokraterna", "centerpartiet", "miljopartiet", "moderaterna",
];

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── Relevansfiltrera ett ämneskluster ─────────────────────────────────────────
async function filterRelevanceForTopic(
  questions: Array<{ id: string; effectiveText: string }>,
  positions: Array<{ id: string; partyShortName: string; specificQuestion: string }>,
): Promise<Map<string, Set<string>>> {
  const fallback = new Map<string, Set<string>>();
  for (const q of questions) fallback.set(q.id, new Set(positions.map(p => p.id)));

  if (questions.length === 0 || positions.length === 0) return fallback;

  const qLines = questions.map((q, i) =>
    `Q${i + 1} [id:${q.id}]: "${q.effectiveText}"`
  ).join("\n");
  const pLines = positions.map((p, i) =>
    `P${i + 1} | ${p.partyShortName}: "${p.specificQuestion}"`
  ).join("\n");

  const prompt =
`Du utvärderar relevansen hos partipositioner för specifika valkompassfrågor.

En position är RELEVANT för en fråga om partiets ståndpunkt i positionen DIREKT besvarar eller är nära kopplad till det frågan handlar om — dvs. positionen hjälper väljaren att förstå om partiet är för eller emot det frågan gäller.

En position är INTE relevant om den visserligen tillhör samma politikområde men handlar om en ANNAN aspekt (t.ex. en fråga om försörjningskrav ska INTE kopplas till en position om modersmålsundervisning, även om båda är under "migration").

Returnera BARA ett JSON-objekt. Nycklar = fråge-ID (exakt som angivet), värden = array av P-nummer för relevanta positioner.
Exempel: {"cmqabc": [1, 3], "cmqdef": [2, 4, 5]}

Frågor:
${qLines}

Partipositioner:
${pLines}

Returnera BARA JSON.`;

  let raw = "";
  try {
    const msg = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 2000,
      messages:   [{ role: "user", content: prompt }],
    });
    raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  } catch (e) {
    console.error("    API-fel, behåller alla positioner som fallback:", e);
    return fallback;
  }

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    console.error("    Kunde inte parsa JSON — fallback");
    return fallback;
  }

  const result = new Map<string, Set<string>>();
  try {
    const parsed = JSON.parse(match[0]) as Record<string, number[]>;
    for (const q of questions) {
      const indices = parsed[q.id] ?? [];
      const rel = new Set<string>();
      for (const idx of indices) {
        if (idx >= 1 && idx <= positions.length) rel.add(positions[idx - 1].id);
      }
      result.set(q.id, rel);
    }
  } catch {
    console.error("    JSON-parsningsfel — fallback");
    return fallback;
  }

  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Applicerar ChatGPT-granskning av kandidatfrågor (2026-07-08)...\n");
  console.log(`Direktgodkänner: ${DIRECT_APPROVE_IDS.length}`);
  console.log(`Ändrar+godkänner: ${AMEND_AND_APPROVE.length}`);
  console.log(`Avvisar: ${REJECT_IDS.length}`);
  console.log(`Relevansfiltrar: ${TO_FILTER_IDS.size} frågor\n`);

  // Hämta partier
  const parties  = await prisma.party.findMany({ select: { id: true, shortName: true, name: true } });
  const partyMap = Object.fromEntries(parties.map(p => [p.id, p]));

  // Hämta alla frågor som ska bearbetas (inkl. rejected för fullständig statistik)
  const allIds = [...TO_FILTER_IDS, ...REJECT_IDS];
  const questions = await prisma.question.findMany({
    where:   { id: { in: allIds } },
    include: {
      positions: {
        include: {
          position: {
            select: { id: true, partyId: true, specificQuestion: true },
          },
        },
      },
    },
  });

  if (questions.length !== allIds.length) {
    const found = new Set(questions.map(q => q.id));
    const missing = allIds.filter(id => !found.has(id));
    console.warn(`⚠ Hittade inte ${missing.length} fråge-ID:n:`);
    for (const id of missing) console.warn(`  ${id}`);
  }

  // ── Steg 1: Relevansfiltrera per ämne ────────────────────────────────────
  console.log("═".repeat(68));
  console.log("STEG 1 — RELEVANSFILTRERA POSITIONER PER ÄMNE");
  console.log("═".repeat(68) + "\n");

  const toFilter = questions.filter(q => TO_FILTER_IDS.has(q.id));

  // Grupper per topic
  const byTopic = new Map<string, typeof toFilter>();
  for (const q of toFilter) {
    if (!byTopic.has(q.topic)) byTopic.set(q.topic, []);
    byTopic.get(q.topic)!.push(q);
  }

  // Relevansresultat: questionId → Set<positionId>
  const relevanceMap = new Map<string, Set<string>>();

  for (const [topic, topicQs] of byTopic) {
    // Samla unika positioner för detta ämne
    const posMap = new Map<string, { id: string; partyShortName: string; specificQuestion: string }>();
    for (const q of topicQs) {
      for (const qp of q.positions) {
        if (!posMap.has(qp.position.id)) {
          posMap.set(qp.position.id, {
            id:               qp.position.id,
            partyShortName:   partyMap[qp.position.partyId]?.shortName ?? qp.position.partyId,
            specificQuestion: qp.position.specificQuestion,
          });
        }
      }
    }

    const posArr = [...posMap.values()];
    // Använd ändrad text för de frågor som ska ändras
    const qArr = topicQs.map(q => ({
      id:           q.id,
      effectiveText: AMEND_MAP.get(q.id)?.questionText ?? q.questionText,
    }));

    const label = TOPIC_LABEL[topic] ?? topic;
    console.log(`[${label}] — ${qArr.length} frågor, ${posArr.length} positioner → Claude...`);
    await delay(DELAY_MS);

    const topicResult = await filterRelevanceForTopic(qArr, posArr);
    for (const [qId, posIds] of topicResult) relevanceMap.set(qId, posIds);

    // Summering per fråga
    for (const q of qArr) {
      const relPos = relevanceMap.get(q.id) ?? new Set();
      const parties = new Set(
        topicQs
          .find(tq => tq.id === q.id)!
          .positions
          .filter(qp => relPos.has(qp.positionId))
          .map(qp => qp.position.partyId)
      );
      const status = parties.size < MIN_PARTIES_THRESHOLD
        ? `⚠ ${parties.size} parti${parties.size === 1 ? "" : "er"} — → NEEDS_REVIEW`
        : `✓ ${parties.size} partier`;
      console.log(`  ${q.effectiveText.slice(0, 55).padEnd(55)} ${relPos.size}/${posArr.length} pos  ${status}`);
    }
    console.log();
  }

  // ── Steg 2: Ta bort irrelevanta QuestionPosition-länkar ──────────────────
  console.log("STEG 2 — UPPDATERA QuestionPosition-TABELLEN");
  console.log("─".repeat(68));

  let removedLinks = 0, keptLinks = 0;
  for (const q of toFilter) {
    const relevantIds = relevanceMap.get(q.id) ?? new Set();
    for (const qp of q.positions) {
      if (!relevantIds.has(qp.positionId)) {
        await prisma.questionPosition.delete({
          where: { questionId_positionId: { questionId: q.id, positionId: qp.positionId } },
        });
        removedLinks++;
      } else {
        keptLinks++;
      }
    }
  }
  console.log(`✓ Borttagna irrelevanta positionslänkar: ${removedLinks}`);
  console.log(`✓ Kvarvarande relevanta positionslänkar: ${keptLinks}\n`);

  // ── Steg 3: Uppdatera questionText för AMEND-frågor ──────────────────────
  console.log("STEG 3 — UPPDATERA FRÅGETEXT (ÄNDRA OCH GODKÄNN)");
  console.log("─".repeat(68));

  for (const a of AMEND_AND_APPROVE) {
    await prisma.question.update({
      where: { id: a.id },
      data:  { questionText: a.questionText },
    });
  }
  console.log(`✓ Uppdaterade frågetext för ${AMEND_AND_APPROVE.length} frågor\n`);

  // ── Steg 4: Hämta uppdaterade partitalräkningar per fråga ────────────────
  const updatedQs = await prisma.question.findMany({
    where:   { id: { in: [...TO_FILTER_IDS] } },
    include: {
      positions: {
        include: { position: { select: { partyId: true } } },
      },
    },
  });

  // ── Steg 5: Sätt slutliga statusar ───────────────────────────────────────
  console.log("STEG 4 — SÄTT SLUTLIG STATUS PER FRÅGA");
  console.log("─".repeat(68));

  let approvedCount   = 0;
  let needsReviewCount = 0;
  const needsReviewList: { id: string; questionText: string; partyCount: number }[] = [];

  for (const q of updatedQs) {
    const distinctParties = new Set(q.positions.map(qp => qp.position.partyId)).size;

    if (distinctParties < MIN_PARTIES_THRESHOLD) {
      await prisma.question.update({
        where: { id: q.id },
        data:  {
          reviewStatus: "NEEDS_REVIEW",
          description:  `Relevansfiltrad: ${distinctParties} relevant parti${distinctParties === 1 ? "" : "er"} — behöver komplettering`,
        },
      });
      needsReviewCount++;
      needsReviewList.push({ id: q.id, questionText: q.questionText, partyCount: distinctParties });
    } else {
      const amendEntry = AMEND_MAP.get(q.id);
      await prisma.question.update({
        where: { id: q.id },
        data:  {
          reviewStatus: "APPROVED",
          description:  amendEntry
            ? amendEntry.reviewNote
            : `ChatGPT-godkänd 2026-07-08 · ${distinctParties} partier`,
        },
      });
      approvedCount++;
    }
  }

  // ── Steg 6: Avvisa REJECTED ───────────────────────────────────────────────
  const rejectResult = await prisma.question.updateMany({
    where: { id: { in: REJECT_IDS } },
    data:  { reviewStatus: "REJECTED" },
  });

  console.log(`✓ APPROVED:      ${approvedCount}`);
  console.log(`✓ NEEDS_REVIEW:  ${needsReviewCount}`);
  console.log(`✓ REJECTED:      ${rejectResult.count}`);
  console.log(`  Totalt bearbetat: ${approvedCount + needsReviewCount + rejectResult.count}\n`);

  if (needsReviewList.length > 0) {
    console.log("Frågor satta till NEEDS_REVIEW (för få partier efter filtrering):");
    for (const q of needsReviewList) {
      console.log(`  [${q.partyCount} parti${q.partyCount === 1 ? "" : "er"}] ${q.questionText.slice(0, 70)}`);
      console.log(`        id: ${q.id}`);
    }
    console.log();
  }

  // ── Statistik ─────────────────────────────────────────────────────────────
  console.log("═".repeat(68));
  console.log("SLUTSTATISTIK");
  console.log("═".repeat(68) + "\n");

  // Hämta alla frågor med positioner för statistik
  const allQsWithPos = await prisma.question.findMany({
    include: {
      positions: {
        include: { position: { select: { partyId: true } } },
      },
    },
  });

  const approved  = allQsWithPos.filter(q => q.reviewStatus === "APPROVED");
  const rejected  = allQsWithPos.filter(q => q.reviewStatus === "REJECTED");
  const needsRev  = allQsWithPos.filter(q => q.reviewStatus === "NEEDS_REVIEW");
  const pending   = allQsWithPos.filter(q => q.reviewStatus === "PENDING");

  console.log(`Frågor totalt:       ${allQsWithPos.length}`);
  console.log(`APPROVED:            ${approved.length}`);
  console.log(`REJECTED:            ${rejected.length}`);
  console.log(`NEEDS_REVIEW:        ${needsRev.length}`);
  console.log(`PENDING (ej rört):   ${pending.length}`);

  // Ämnesfördelning bland APPROVED
  console.log("\n── Ämnesfördelning — APPROVED frågor ───────────────────────────");
  const topicCount: Record<string, number> = {};
  for (const q of approved) topicCount[q.topic] = (topicCount[q.topic] ?? 0) + 1;

  const orderedTopics = Object.entries(TOPIC_LABEL);
  for (const [slug, label] of orderedTopics) {
    const n = topicCount[slug] ?? 0;
    const bar = n > 0 ? " " + "█".repeat(n) : "";
    console.log(`  ${label.padEnd(34)} ${String(n).padStart(2)}${bar}`);
  }

  // Antal relevanta partier per APPROVED fråga
  const partyCounts = approved.map(q => new Set(q.positions.map(qp => qp.position.partyId)).size);
  const avgParties  = partyCounts.length > 0
    ? (partyCounts.reduce((s, n) => s + n, 0) / partyCounts.length).toFixed(1)
    : "0";

  console.log(`\n── Relevanta partier per APPROVED fråga ─────────────────────────`);
  console.log(`  Genomsnitt: ${avgParties} partier/fråga`);

  const dist: Record<number, number> = {};
  for (const n of partyCounts) dist[n] = (dist[n] ?? 0) + 1;
  for (const n of Object.keys(dist).map(Number).sort((a, b) => a - b)) {
    const bar = "█".repeat(dist[n]);
    console.log(`  ${n} partier: ${String(dist[n]).padStart(2)} frågor  ${bar}`);
  }

  const fewParties = approved.filter(q =>
    new Set(q.positions.map(qp => qp.position.partyId)).size <= 2
  );
  if (fewParties.length > 0) {
    console.log(`\n  Frågor med ≤ 2 relevanta partier (bör granskas noga):`);
    for (const q of fewParties) {
      const n = new Set(q.positions.map(qp => qp.position.partyId)).size;
      console.log(`    [${n} parti${n === 1 ? "" : "er"}] ${q.questionText}`);
    }
  }

  // Partiförekomst bland APPROVED frågor
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

  console.log("\n── Avslutande kontroll ───────────────────────────────────────────");
  if (approved.length === 0) {
    console.log("  ✗ Inga APPROVED-frågor! Något gick fel.");
  } else {
    console.log(`  ✓ ${approved.length} APPROVED-frågor klara för /kompass.`);
    console.log("  ⚠  Kör statistikgenomgång ovan innan /kompass öppnas för publik.");
    console.log("  Nästa steg:");
    console.log("    1. Kontrollera ämnesfördelning och partitäckning ovan");
    console.log("    2. Granska NEEDS_REVIEW-frågorna manuellt i /admin");
    console.log("    3. Testa /kompass och /resultat");
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
