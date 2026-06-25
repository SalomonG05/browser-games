/**
 * Runda 3 — ChatGPT-granskningsexport.
 *
 * Mål: varje parti ska nå 20 APPROVED positioner.
 * Max 12 nya positioner per parti, spridda över 14 sakområden.
 * Exkluderar redan APPROVED positioner och Moderaterna.
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "../lib/createClient";
import { deduplicateForExport, CONFIDENCE_RANK } from "../lib/cleanup";

const prisma = createClient();

const EXCLUDED_PARTIES = ["moderaterna"];
const PARTY_ORDER = [
  "socialdemokraterna", "vansterpartiet", "kristdemokraterna",
  "liberalerna", "sverigedemokraterna", "centerpartiet", "miljopartiet",
];
const MAX_PER_PARTY = 12;

// Mål: 20 APPROVED per parti — räknar ut hur många som behövs per parti
const APPROVED_TARGET = 20;

const OFFICIAL_DOMAINS = [
  "socialdemokraterna.se", "vansterpartiet.se", "kristdemokraterna.se",
  "liberalerna.se", "sd.se", "centerpartiet.se", "mp.se",
];

// De 14 målsatta sakområdena (user-spec) → db-topics
const TARGET_TOPICS: Record<string, string[]> = {
  "ekonomi":              ["ekonomi"],
  "skatter":              ["skatter"],
  "jobb":                 ["jobb"],
  "skola":                ["skola"],
  "vård":                 ["vård"],
  "klimat":               ["klimat"],
  "energi":               ["energi"],
  "migration/integration":["migration"],
  "lag och ordning":      ["lag_ordning"],
  "bostäder":             ["bostäder"],
  "försvar":              ["försvar"],
  "EU":                   ["eu"],
  "jämställdhet":         ["jämställdhet"],
  "socialförsäkring":     ["socialförsäkring"],
};

// Mappning db-topic → canonical label
const TOPIC_LABEL: Record<string, string> = {};
for (const [label, slugs] of Object.entries(TARGET_TOPICS)) {
  for (const s of slugs) TOPIC_LABEL[s] = label;
}

function isOfficialSource(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith("." + d));
  } catch { return false; }
}

function isConcrete(q: string | null): boolean {
  if (!q) return false;
  // Primär: börjar med Bör/Ska/Borde/Skall/Vill/Kräver/Behöver
  if (/^(bör|ska|borde|skall|vill|kräver|behöver)\b/i.test(q)) return true;
  // Sekundär: innehåller tydlig politisk riktning utan att vara slogan
  if (q.length < 30) return false;
  if (/^(Sverige är|Vi tror|För oss|Vår vision|Vi värnar)/i.test(q)) return false;
  return false; // strict mode — håll Bör/Ska-kravet
}

function posScore(p: {
  confidence: string;
  sourceQuote: string;
  positionValue: number | null;
  conflictingSources: boolean;
}): number {
  const c = CONFIDENCE_RANK[p.confidence] ?? 0;
  return c * 5
    + Math.min((p.sourceQuote?.length ?? 0) / 80, 3) * 2
    + (p.positionValue != null ? 1 : 0)
    - (p.conflictingSources ? 2 : 0);
}

/**
 * Väljer max N positioner med topic-spridning.
 * Prioriterar topics som matchar de 14 målsatta sakområdena.
 * Round-robin per topic-grupp, bäst score först inom varje grupp.
 */
function pickWithTopicSpread<T extends { topic: string; score: number }>(
  positions: T[],
  maxN: number,
): T[] {
  // Gruppa per topic, sortera bäst-först
  const byTopic = new Map<string, T[]>();
  for (const p of positions) {
    if (!byTopic.has(p.topic)) byTopic.set(p.topic, []);
    byTopic.get(p.topic)!.push(p);
  }
  for (const arr of byTopic.values()) arr.sort((a, b) => b.score - a.score);

  // Sortera topics: prioritera de 14 målsatta (i TARGET_TOPICS-ordning), sedan övriga
  const targetSlugs = new Set(Object.values(TARGET_TOPICS).flat());
  const prioritized = [
    ...[...byTopic.keys()].filter(t => targetSlugs.has(t)).sort(),
    ...[...byTopic.keys()].filter(t => !targetSlugs.has(t)).sort(),
  ];

  const result: T[] = [];
  let round = 0;
  outer: while (result.length < maxN) {
    let anyLeft = false;
    for (const topic of prioritized) {
      const arr = byTopic.get(topic)!;
      if (arr.length > round) {
        anyLeft = true;
        result.push(arr[round]);
        if (result.length >= maxN) break outer;
      }
    }
    if (!anyLeft) break;
    round++;
  }
  return result;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const outDir = path.join(__dirname, "../exports");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `chatgpt-review-${today}-round3.md`);

  const parties = await prisma.party.findMany({ select: { id: true, name: true, shortName: true } });
  const partyMap = Object.fromEntries(parties.map((p) => [p.id, p]));

  // Nuvarande APPROVED-antal per parti
  const approvedGroups = await prisma.position.groupBy({
    by: ["partyId"],
    where: { reviewStatus: "APPROVED" },
    _count: { id: true },
  });
  const approvedMap = Object.fromEntries(approvedGroups.map((c) => [c.partyId, c._count.id]));

  // Hämta alla kandidater: PENDING + HIGH + ej EXCLUDED
  const candidates = await prisma.position.findMany({
    where: {
      reviewStatus: "PENDING",
      confidence:   "HIGH",
      partyId:      { notIn: EXCLUDED_PARTIES },
    },
    select: {
      id: true, partyId: true, topic: true,
      specificQuestion: true, summary: true,
      positionValue: true, confidence: true,
      sourceQuote: true, sourceUrl: true,
      aiInterpretation: true, conflictingSources: true,
    },
  });

  // Filtrera officiella + konkreta
  const filtered = candidates
    .filter(p => isOfficialSource(p.sourceUrl))
    .filter(p => isConcrete(p.specificQuestion));

  // Score + global dedup
  const scored = filtered
    .map(p => ({ ...p, score: posScore(p) }))
    .sort((a, b) => b.score - a.score);
  const deduped = deduplicateForExport(scored);

  // ── Missing-topics-rapport ────────────────────────────────────────────────
  console.log("\n" + "═".repeat(66));
  console.log("MISSING-TOPICS-RAPPORT (PENDING/HIGH, exkl. M)");
  console.log("═".repeat(66));

  const allTargetTopics = Object.keys(TARGET_TOPICS);
  const topicsByParty: Record<string, Set<string>> = {};
  for (const p of deduped) {
    if (!topicsByParty[p.partyId]) topicsByParty[p.partyId] = new Set();
    topicsByParty[p.partyId].add(p.topic);
  }

  for (const pId of PARTY_ORDER) {
    const p = partyMap[pId];
    const available = topicsByParty[pId] ?? new Set();
    const currentApproved = approvedMap[pId] ?? 0;
    const needed = Math.max(0, APPROVED_TARGET - currentApproved);

    const coveredLabels = allTargetTopics.filter(label =>
      TARGET_TOPICS[label].some(slug => available.has(slug))
    );
    const missingLabels = allTargetTopics.filter(label =>
      !TARGET_TOPICS[label].some(slug => available.has(slug))
    );

    console.log(`\n  ${p?.shortName ?? pId} (${currentApproved} APPROVED → behöver ${needed} mer för att nå 20)`);
    console.log(`  Täcker: ${coveredLabels.length}/14 sakområden`);
    if (missingLabels.length > 0) {
      console.log(`  Saknar: ${missingLabels.join(", ")}`);
    } else {
      console.log(`  Saknar: — (full täckning i PENDING-materialet)`);
    }
    if (needed > MAX_PER_PARTY) {
      console.log(`  ⚠  Behöver ${needed} men exporterar max ${MAX_PER_PARTY} — ytterligare granskning krävs`);
    }
  }
  console.log("\n" + "─".repeat(66));

  // ── Välj positioner per parti ─────────────────────────────────────────────
  const selected: typeof deduped = [];
  const partyStats: {
    id: string; shortName: string; currentApproved: number;
    count: number; topics: string[]; missingTopics: string[];
  }[] = [];

  for (const pId of PARTY_ORDER) {
    const currentApproved = approvedMap[pId] ?? 0;
    const needed   = Math.max(0, APPROVED_TARGET - currentApproved);
    const pickN    = Math.min(needed, MAX_PER_PARTY);
    const partyPos = deduped.filter(p => p.partyId === pId);
    const picked   = pickWithTopicSpread(partyPos, pickN);

    selected.push(...picked);

    const coveredTopics  = [...new Set(picked.map(p => TOPIC_LABEL[p.topic] ?? p.topic))];
    const missingLabels  = allTargetTopics.filter(label =>
      !TARGET_TOPICS[label].some(slug => (topicsByParty[pId] ?? new Set()).has(slug))
    );

    partyStats.push({
      id: pId,
      shortName:      partyMap[pId]?.shortName ?? pId,
      currentApproved,
      count:          picked.length,
      topics:         coveredTopics,
      missingTopics:  missingLabels,
    });
  }

  // ── Bygg markdown-export ──────────────────────────────────────────────────
  const lines: string[] = [];

  lines.push(`# ChatGPT-granskning — Valkompass ${today} (runda 3)`);
  lines.push(`> Mål: 20 APPROVED per parti. Max ${MAX_PER_PARTY} nya per parti, ${selected.length} totalt.`);
  lines.push(`> Filter: PENDING · HIGH confidence · officiella partikällor · konkreta Bör/Ska-frågor · deduplicerat.`);
  lines.push(`> **Moderaterna är exkluderade** (har redan 47 godkända positioner).`);
  lines.push(`> **Generera INTE valkompassfrågor ännu** — detta är granskningssteg 3.`);
  lines.push("");
  lines.push("## Partiöversikt");
  lines.push("");
  lines.push("| Parti | Nu APPROVED | I export | Behöver efter runda 3 | Saknar topics |");
  lines.push("|-------|------------|----------|----------------------|---------------|");

  for (const s of partyStats) {
    const afterRound = s.currentApproved + s.count;
    const stillNeeds = Math.max(0, APPROVED_TARGET - afterRound);
    const missingStr = s.missingTopics.length > 0 ? s.missingTopics.join(", ") : "—";
    lines.push(`| **${s.shortName}** | ${s.currentApproved} | ${s.count} | ${stillNeeds > 0 ? stillNeeds + " (runda 4?)" : "✓ mål nått om alla godkänns"} | ${missingStr} |`);
  }
  lines.push(`| **TOTALT** | **${partyStats.reduce((s, p) => s + p.currentApproved, 0)}** | **${selected.length}** | | |`);
  lines.push("");
  lines.push("## Sakområden täckta i exporten per parti");
  lines.push("");
  for (const s of partyStats) {
    lines.push(`- **${s.shortName}**: ${s.topics.join(", ")}`);
    if (s.missingTopics.length > 0) {
      lines.push(`  - *Saknar i PENDING-materialet: ${s.missingTopics.join(", ")}*`);
    }
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Instruktion till ChatGPT");
  lines.push("");
  lines.push(`Du är expert på svensk politik och källgranskning. Nedan finns ${selected.length} partipositioner`);
  lines.push("extraherade från officiella partisidor. Granska varje position och svara med ett av:");
  lines.push("");
  lines.push("- **GODKÄNN** — position_id, kort motivering");
  lines.push("- **ÄNDRA OCH GODKÄNN** — position_id, ny fråga och/eller nytt position_value (ändra INTE källcitat eller source_url)");
  lines.push("- **AVVISA** — position_id, orsak (t.ex. slogan, för vag, ej partiets ståndpunkt)");
  lines.push("- **NEEDS_REVIEW** — position_id, vad som behöver klargöras");
  lines.push("");
  lines.push("Bedöm om källcitatet faktiskt stöder frågan och position_value. Flagga slogans, vaga principer och dubblettteman.");
  lines.push("");
  lines.push("---");
  lines.push("");

  // Positioner per parti
  let posNum = 0;
  for (const pId of PARTY_ORDER) {
    const partyPositions = selected.filter(p => p.partyId === pId);
    if (partyPositions.length === 0) continue;
    const p    = partyMap[pId];
    const stat = partyStats.find(s => s.id === pId)!;

    lines.push(`## ${p?.name ?? pId} (${partyPositions.length} positioner — nu ${stat.currentApproved} APPROVED)`);
    lines.push("");

    for (const pos of partyPositions) {
      posNum++;
      const topicLabel = TOPIC_LABEL[pos.topic] ?? pos.topic;
      lines.push(`### Position ${posNum} — ${p?.shortName ?? pId} · ${topicLabel}`);
      lines.push(`**position_id**: \`${pos.id}\``);
      lines.push(`**ämne**: ${topicLabel} (${pos.topic})`);
      lines.push(`**fråga**: ${pos.specificQuestion ?? pos.summary}`);
      lines.push(`**position_value**: ${pos.positionValue ?? "(saknas)"}`);
      lines.push(`**confidence**: ${pos.confidence}`);
      lines.push(`**källcitat**: "${pos.sourceQuote}"`);
      lines.push(`**source_url**: ${pos.sourceUrl}`);
      if (pos.aiInterpretation) lines.push(`**ai_tolkning**: ${pos.aiInterpretation}`);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  lines.push(`*Slut på export — ${selected.length} positioner från ${partyStats.filter(s => s.count > 0).length} partier.*`);
  lines.push(`*Datum: ${today} · Runda 3 · Nästa mål: 20 APPROVED per parti.*`);

  const content = lines.join("\n");
  fs.writeFileSync(outPath, content, "utf8");

  // ── Konsolsammanfattning ──────────────────────────────────────────────────
  console.log("\n" + "═".repeat(66));
  console.log("EXPORT RUNDA 3 KLAR");
  console.log("═".repeat(66));
  console.log(`\nFil: ${outPath}`);
  console.log(`Rader: ${lines.length}  |  Positioner: ${selected.length}`);
  console.log("\nFördelning:");
  console.log("  Parti   Nu    Export  Efter  Saknar topics");
  console.log("  " + "─".repeat(62));
  for (const s of partyStats) {
    const after = s.currentApproved + s.count;
    const flag  = after >= APPROVED_TARGET ? " ✓" : ` (behöver ${APPROVED_TARGET - after} till)`;
    const miss  = s.missingTopics.length > 0 ? s.missingTopics.slice(0, 3).join(", ") + (s.missingTopics.length > 3 ? "…" : "") : "—";
    console.log(`  ${s.shortName.padEnd(6)} ${String(s.currentApproved).padStart(3)}  →  ${String(s.count).padStart(2)} pos  →  ${String(after).padStart(2)}${flag.padEnd(22)} | ${miss}`);
  }
  console.log(`\n  Totalt: ${selected.length} positioner att granska`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
