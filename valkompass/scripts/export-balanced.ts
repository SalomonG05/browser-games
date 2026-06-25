/**
 * Balanserad ChatGPT-granskningsexport.
 * Max 8 positioner per parti, spridda över olika sakområden.
 * Exkluderar Moderaterna. PENDING + HIGH + officiella källor + konkreta frågor.
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
const MAX_PER_PARTY = 8;

const OFFICIAL_DOMAINS = [
  "socialdemokraterna.se", "vansterpartiet.se", "kristdemokraterna.se",
  "liberalerna.se", "sd.se", "centerpartiet.se", "mp.se",
];

function isOfficialSource(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith("." + d));
  } catch { return false; }
}

function isConcrete(q: string | null): boolean {
  return /^(bör|ska|borde|skall|vill|kräver|behöver)\b/i.test(q ?? "");
}

function posScore(p: { confidence: string; sourceQuote: string; positionValue: number | null; conflictingSources: boolean }): number {
  const c = CONFIDENCE_RANK[p.confidence] ?? 0;
  return c * 5 + Math.min((p.sourceQuote?.length ?? 0) / 80, 3) * 2
    + (p.positionValue != null ? 1 : 0) - (p.conflictingSources ? 2 : 0);
}

/**
 * Väljer max N positioner per parti med topic-spridning.
 * Algoritm: round-robin över ämnesgrupper — tar bästa poäng från varje ämne
 * tills N nås eller alla ämnen är tömda.
 */
function pickWithTopicSpread<T extends { topic: string; score: number }>(positions: T[], maxN: number): T[] {
  // Gruppa per topic, sortera varje grupp bäst-först
  const byTopic = new Map<string, T[]>();
  for (const p of positions) {
    if (!byTopic.has(p.topic)) byTopic.set(p.topic, []);
    byTopic.get(p.topic)!.push(p);
  }
  for (const arr of byTopic.values()) arr.sort((a, b) => b.score - a.score);

  // Round-robin: ta 1 per topic i varje runda tills maxN nås
  const result: T[] = [];
  const topics = [...byTopic.keys()].sort();
  let round = 0;
  outer: while (result.length < maxN) {
    let anyLeft = false;
    for (const topic of topics) {
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
  const outPath = path.join(outDir, `chatgpt-review-${today}-balanced.md`);

  const parties = await prisma.party.findMany({ select: { id: true, name: true, shortName: true } });
  const partyMap = Object.fromEntries(parties.map((p) => [p.id, p]));

  // Hämta alla kandidater
  const candidates = await prisma.position.findMany({
    where: {
      reviewStatus: "PENDING",
      confidence:   "HIGH",
      partyId:      { notIn: EXCLUDED_PARTIES },
    },
    select: {
      id: true, partyId: true, topic: true, specificQuestion: true,
      summary: true, positionValue: true, confidence: true,
      sourceQuote: true, sourceUrl: true, aiInterpretation: true,
      conflictingSources: true,
    },
  });

  // Filtrera officiella + konkreta
  const filtered = candidates
    .filter((p) => isOfficialSource(p.sourceUrl))
    .filter((p) => isConcrete(p.specificQuestion));

  // Score + dedup globalt (tar bort exakta dubletter och Jaccard-liknande)
  const scored = filtered
    .map((p) => ({ ...p, score: posScore(p) }))
    .sort((a, b) => b.score - a.score);
  const deduped = deduplicateForExport(scored);

  // Per parti: välj top MAX_PER_PARTY med topic-spridning
  const selected: typeof deduped = [];
  const partyStats: { id: string; name: string; count: number; topics: string[] }[] = [];

  for (const partyId of PARTY_ORDER) {
    const partyPositions = deduped.filter((p) => p.partyId === partyId);
    const picked = pickWithTopicSpread(partyPositions, MAX_PER_PARTY);
    selected.push(...picked);
    partyStats.push({
      id:     partyId,
      name:   partyMap[partyId]?.shortName ?? partyId,
      count:  picked.length,
      topics: [...new Set(picked.map((p) => p.topic))],
    });
  }

  // ── Bygg markdown ────────────────────────────────────────────────────────────
  const lines: string[] = [];

  lines.push(`# ChatGPT-granskning — Valkompass ${today}`);
  lines.push(`> Balanserad export: max ${MAX_PER_PARTY} positioner per parti, ${selected.length} totalt.`);
  lines.push(`> Filter: PENDING · HIGH confidence · officiella partikällor · konkreta "Bör"-frågor · deduplicerat.`);
  lines.push(`> **Moderaterna är exkluderade** (har redan 47 godkända positioner).`);
  lines.push(`> Generera INTE valkompassfrågor ännu — detta är granskningssteg 2.`);
  lines.push("");
  lines.push("## Partifördelning");
  lines.push("");
  lines.push("| Parti | Positioner | Ämnen täckta |");
  lines.push("|-------|-----------|--------------|");
  for (const s of partyStats) {
    lines.push(`| **${s.name}** | ${s.count} | ${s.topics.join(", ")} |`);
  }
  lines.push(`| **TOTALT** | **${selected.length}** | |`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Instruktion till ChatGPT");
  lines.push("");
  lines.push(`Du är expert på svensk politik och källgranskning. Nedan finns ${selected.length} partipositioner`);
  lines.push("extraherade från officiella partisidor. Granska varje position och svara med ett av:");
  lines.push("");
  lines.push("- **GODKÄNN** — position_id, kort motivering");
  lines.push("- **ÄNDRA OCH GODKÄNN** — position_id, nytt issue/position_value (ändra inte källcitat eller source_url)");
  lines.push("- **AVVISA** — position_id, orsak (t.ex. slogan, för vag, ej partiets ståndpunkt)");
  lines.push("- **NEEDS_REVIEW** — position_id, vad som behöver klargöras");
  lines.push("");
  lines.push("Bedöm om källcitatet faktiskt stöder frågan och position_value. Flagga slogans och vaga principer.");
  lines.push("");
  lines.push("---");
  lines.push("");

  // Positioner grupperade per parti
  let posNum = 0;
  for (const partyId of PARTY_ORDER) {
    const partyPositions = selected.filter((p) => p.partyId === partyId);
    if (partyPositions.length === 0) continue;
    const p = partyMap[partyId];
    lines.push(`## ${p?.name ?? partyId} (${partyPositions.length} positioner)`);
    lines.push("");
    for (const pos of partyPositions) {
      posNum++;
      lines.push(`### Position ${posNum} — ${p?.shortName ?? partyId}`);
      lines.push(`**position_id**: \`${pos.id}\``);
      lines.push(`**ämne**: ${pos.topic}`);
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

  lines.push(`*Slut på export — ${selected.length} positioner från ${partyStats.length} partier.*`);

  const content = lines.join("\n");
  fs.writeFileSync(outPath, content, "utf8");

  // ── Konsolsammanfattning ──────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(62));
  console.log("BALANSERAD CHATGPT-EXPORT KLAR");
  console.log("═".repeat(62));
  console.log(`\nFil: ${outPath}`);
  console.log(`Rader: ${lines.length}  |  Positioner: ${selected.length}`);
  console.log("\nFördelning per parti:");
  for (const s of partyStats) {
    const bar = "█".repeat(s.count);
    console.log(`  ${s.name.padEnd(5)} ${String(s.count).padStart(2)}  ${bar}  [${s.topics.join(", ")}]`);
  }
  console.log("\nFil sparad. Kopiera innehållet till ChatGPT för granskning.");
  console.log("Alternativt: gå till /admin → Export-fliken för att exportera via UI.");

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
