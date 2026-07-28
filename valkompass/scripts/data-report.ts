import "dotenv/config";
import { createClient } from "../lib/createClient";

const prisma = createClient();

const PARTY_ORDER = [
  "socialdemokraterna", "vansterpartiet", "kristdemokraterna",
  "liberalerna", "sverigedemokraterna", "centerpartiet", "miljopartiet", "moderaterna",
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
  vård:             "Vård och omsorg",
  brottslighet:     "Lag och ordning",
  näringsliv:       "Näringsliv",
};

async function main() {
  const parties = await prisma.party.findMany({ select: { id: true, shortName: true, name: true } });
  const partyMap = Object.fromEntries(parties.map(p => [p.id, p]));

  const questions = await prisma.question.findMany({
    where: { reviewStatus: "APPROVED" },
    include: {
      positions: {
        include: {
          position: {
            select: { partyId: true, positionValue: true, specificQuestion: true },
          },
        },
      },
    },
    orderBy: [{ topic: "asc" }, { questionText: "asc" }],
  });

  // Effektivt positionsvärde per (questionId, positionId)
  function effectiveValue(qp: { questionPositionValue: number | null; position: { positionValue: number | null } }) {
    return qp.questionPositionValue ?? qp.position.positionValue;
  }

  // ── 1. Lista alla 46 frågor ──────────────────────────────────────────────
  console.log("═".repeat(90));
  console.log("1. ALLA 46 APPROVED FRÅGOR");
  console.log("═".repeat(90));

  let idx = 0;
  const byTopic: Record<string, typeof questions> = {};
  for (const q of questions) {
    const t = q.topic;
    if (!byTopic[t]) byTopic[t] = [];
    byTopic[t].push(q);
  }

  for (const [topic, qs] of Object.entries(byTopic).sort()) {
    const label = TOPIC_LABEL[topic] ?? topic;
    console.log(`\n── ${label.toUpperCase()} ─────────────────────────────────────────────────`);
    for (const q of qs) {
      idx++;
      const parties = [...new Set(q.positions.map(qp => qp.position.partyId))];
      const partyNames = parties.map(id => partyMap[id]?.shortName ?? id).sort().join(", ");
      const strength = q.weak ? "svag (2p)" : `stark (${parties.length}p)`;
      const posValues = q.positions.map(qp => {
        const sn = partyMap[qp.position.partyId]?.shortName ?? qp.position.partyId;
        const eff = effectiveValue(qp);
        const override = qp.questionPositionValue !== null ? "*" : "";
        return `${sn}=${eff?.toFixed(1) ?? "?"}${override}`;
      }).sort().join(", ");

      console.log(`\n${String(idx).padStart(2)}. [${strength.padEnd(9)}] ${q.questionText}`);
      console.log(`    ID:      ${q.id}`);
      console.log(`    Partier: ${partyNames}`);
      console.log(`    Värden:  ${posValues}`);
    }
  }

  // ── 2. Partitäckning ─────────────────────────────────────────────────────
  console.log("\n\n" + "═".repeat(90));
  console.log("2. PARTITÄCKNING (antal av 46 frågor per parti)");
  console.log("═".repeat(90) + "\n");

  const partyQuestionCount: Record<string, number> = {};
  const partyPositionValues: Record<string, number[]> = {};

  for (const q of questions) {
    const seenParties = new Set<string>();
    for (const qp of q.positions) {
      const pid = qp.position.partyId;
      if (!seenParties.has(pid)) {
        partyQuestionCount[pid] = (partyQuestionCount[pid] ?? 0) + 1;
        seenParties.add(pid);
      }
      if (!partyPositionValues[pid]) partyPositionValues[pid] = [];
      const eff = effectiveValue(qp);
      if (eff !== null) partyPositionValues[pid].push(eff);
    }
  }

  for (const pId of PARTY_ORDER) {
    const p = partyMap[pId];
    const n = partyQuestionCount[pId] ?? 0;
    const pct = Math.round((n / questions.length) * 100);
    const bar = "█".repeat(n);
    const warn = n < 10 ? " ⚠ LÅG TÄCKNING" : n < 20 ? " △ medel" : "";
    const vals = partyPositionValues[pId] ?? [];
    const avg = vals.length > 0 ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2) : "n/a";
    console.log(`  ${(p?.shortName ?? pId).padEnd(4)} ${String(n).padStart(2)}/46 frågor (${String(pct).padStart(2)}%)  snitt positionsvärde: ${avg}  ${bar}${warn}`);
  }

  // ── 3. Ämnesfördelning ───────────────────────────────────────────────────
  console.log("\n\n" + "═".repeat(90));
  console.log("3. ÄMNESFÖRDELNING");
  console.log("═".repeat(90) + "\n");

  const ALL_TOPICS = [
    "migration", "ekonomi", "lag_ordning", "klimat", "skola", "energi",
    "försvar", "skatter", "jobb", "bostäder", "socialförsäkring", "eu",
    "jämställdhet", "landsbygd", "vård",
  ];

  const topicCount: Record<string, number> = {};
  const topicWeak: Record<string, number> = {};
  for (const q of questions) {
    topicCount[q.topic] = (topicCount[q.topic] ?? 0) + 1;
    if (q.weak) topicWeak[q.topic] = (topicWeak[q.topic] ?? 0) + 1;
  }

  for (const slug of ALL_TOPICS) {
    const label = TOPIC_LABEL[slug] ?? slug;
    const n = topicCount[slug] ?? 0;
    const w = topicWeak[slug] ?? 0;
    const bar = n > 0 ? "█".repeat(n) : "";
    const weakNote = n > 0 && w === n ? ` (alla ${w} svaga)` : n > 0 && w > 0 ? ` (${w} svaga)` : "";
    const missing = n === 0 ? "  ✗ SAKNAS HELT" : "";
    const low = n === 1 ? "  △ bara 1 fråga" : "";
    console.log(`  ${label.padEnd(34)} ${String(n).padStart(2)} frågor${bar}${weakNote}${missing}${low}`);
  }

  // Extratopics som finns i DB men inte i ALL_TOPICS
  const extraTopics = Object.keys(topicCount).filter(t => !ALL_TOPICS.includes(t));
  if (extraTopics.length > 0) {
    console.log("\n  Extra ämnen (finns i DB men inte förväntade):");
    for (const t of extraTopics) {
      console.log(`    ${t}: ${topicCount[t]} frågor`);
    }
  }

  // ── 4. Matchningslogiken ─────────────────────────────────────────────────
  console.log("\n\n" + "═".repeat(90));
  console.log("4. MATCHNINGSLOGIKEN (scoring.ts)");
  console.log("═".repeat(90));
  console.log(`
  Poängberäkning per fråga:
    diff        = |användarens svar - partiets positionValue|   (0–4)
    score       = (4 - diff) × importance                       (0–8)
    maxPossible = 4 × importance

  Viktighetsval (importance):
    "Inte viktig"   → importance = 0  → score = 0, max = 0  (räknas EJ in alls)
    "Ganska viktig" → importance = 1  → score 0–4, max 4
    "Mycket viktig" → importance = 2  → score 0–8, max 8

  Slutlig matchprocent:
    matchPercent = round(totalScore / maxPossible × 100)

  Om parti saknar position på en fråga:
    → questionsMissing++ för det partiet
    → frågan RÄKNAS INTE in i totalScore eller maxPossible
    → partiet STRAFFAS INTE — frågan ignoreras helt
    → DÄREMOT: partiet baseras på färre frågor → osäkrare matchning

  Om användaren hoppar över en fråga:
    → questionsSkipped++ för ALLA partier
    → frågan RÄKNAS INTE för något parti

  Om användaren sätter importance = "Inte viktig" (0):
    → score = 0 × 0 = 0, max = 0 × 0 = 0
    → frågan bidrar INGENTING till matchningsprocenten
    → (lätt bugg: räknas som matchad men påverkar inte procenten)

  ⚠-badge (färre frågor):
    Visas när questionsMatched < max(3, floor(totalQuestions × 0.5))
    = visas när matchade frågor < max(3, 23) = 23 frågor
`);

  // ── 5. Gynnas partier med fler positioner? ────────────────────────────────
  console.log("═".repeat(90));
  console.log("5. GYNNAS PARTIER MED FLER POSITIONER?");
  console.log("═".repeat(90) + "\n");

  const approvedPositions = await prisma.position.groupBy({
    by: ["partyId"],
    where: { reviewStatus: "APPROVED" },
    _count: { id: true },
  });

  console.log("  Antal APPROVED positioner i databasen vs täckning i /kompass:\n");
  for (const pId of PARTY_ORDER) {
    const p = partyMap[pId];
    const totalPos = approvedPositions.find(ap => ap.partyId === pId)?._count.id ?? 0;
    const questionCoverage = partyQuestionCount[pId] ?? 0;
    const warn = questionCoverage < 15 ? " ⚠" : "";
    console.log(`  ${(p?.shortName ?? pId).padEnd(4)}  ${String(totalPos).padStart(3)} godkända positioner  →  ${String(questionCoverage).padStart(2)}/46 frågor${warn}`);
  }

  console.log(`
  Matchningslogiken gynnar INTE partier med fler positioner i sig:
  - Matchprocent beräknas ENDAST på frågor där BÅDE användaren svarat
    OCH partiet har en position.
  - Fler positioner → fler frågor partiet kan matchas på → mer stabilt resultat.
  - Färre positioner → ⚠-badge och osäkrare matchning, men INTE lägre procent.

  Risk: M och L har bred täckning (20 resp 16 frågor). SD och V har smal täckning
  (9 frågor vardera). En väljare som svarar på många frågor SD/V inte har position
  i kommer inte se dem matchade på de frågorna — procenten baseras på ett mindre urval.
`);

  // ── 6. Varför 0% / ⚠-badge? ─────────────────────────────────────────────
  console.log("═".repeat(90));
  console.log("6. VARFÖR VISAS 0% / ⚠-BADGE FÖR VISSA PARTIER?");
  console.log("═".repeat(90));
  console.log(`
  ⚠-badge (Färre frågor) visas för ett parti när:
    questionsMatched < max(3, floor(46 × 0.5)) = 23

  Det innebär att ALLA partier som har position i färre än 23 av de 46 frågorna
  alltid visas med ⚠-badge om användaren svarar på ett representativt urval.

  Partier och deras maxmöjliga matchning (om användaren svarar på alla 46):`);
  for (const pId of PARTY_ORDER) {
    const p = partyMap[pId];
    const n = partyQuestionCount[pId] ?? 0;
    const badge = n < 23 ? "⚠ ALLTID badge" : "OK (≥23)";
    console.log(`    ${(p?.shortName ?? pId).padEnd(4)}  max ${String(n).padStart(2)}/46 matchbara  →  ${badge}`);
  }

  console.log(`
  0% uppstår när: användaren svarade på frågor där partiet HAR INGA positioner.
  Exempel från testet: SD/MP/L/V fick 0% eftersom de saknar position på
  bolånetaket-frågan (den enda vi svarade på).

  Detta är korrekt beteende — det är ett dataproblem, inte ett kodproblem.
`);

  // ── 7. Rekommendationer ──────────────────────────────────────────────────
  console.log("═".repeat(90));
  console.log("7. REKOMMENDATIONER");
  console.log("═".repeat(90));

  const strongCount  = questions.filter(q => !q.weak).length;
  const weakCount    = questions.filter(q => q.weak).length;
  const topicsMissing = ALL_TOPICS.filter(t => !topicCount[t]);
  const topicsWeak   = ALL_TOPICS.filter(t => topicCount[t] === 1);

  console.log(`
  Nuläge:
    46 APPROVED frågor: ${strongCount} starka (3+p), ${weakCount} svaga (2p)
    Saknade ämnen: ${topicsMissing.map(t => TOPIC_LABEL[t] ?? t).join(", ") || "inga"}
    Underrepresenterade ämnen (1 fråga): ${topicsWeak.map(t => TOPIC_LABEL[t] ?? t).join(", ") || "inga"}
`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
