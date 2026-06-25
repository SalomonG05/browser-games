/**
 * Riktad crawl för S, V, KD, L, SD, C, MP.
 * Moderaterna är exkluderade (har tillräckligt med APPROVED-positioner).
 *
 * Använder verifierade direktlänkar till sakpolitiska sidor (inte indexsidor).
 * Max 15 sidor/parti, max 110 totalt.
 */

import "dotenv/config";
import { prisma } from "../lib/prisma";
import { crawlPage, discoverLinks, normalizeUrl, shouldIgnoreUrl } from "../lib/crawler";
import { TARGETED_SEED_URLS } from "../data/targeted-seed-urls";

const LIMITS = {
  maxPagesPerParty: 15,
  maxDepth:         1,
  timeoutPerPageMs: 15000,
  maxTotalPages:    110,
  delayMs:          1000,
};

interface CrawlState {
  visited:       Set<string>;
  pagesPerParty: Map<string, number>;
  totalPages:    number;
}

function tag(partyId: string) {
  return `[${partyId.slice(0, 2).toUpperCase()}]`;
}

function counters(partyId: string, state: CrawlState) {
  const p = state.pagesPerParty.get(partyId) ?? 0;
  return `(${p}/${LIMITS.maxPagesPerParty}, ${state.totalPages}/${LIMITS.maxTotalPages})`;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function processUrl(
  url: string,
  partyId: string,
  sourceType: string,
  isPrimary: boolean,
  basePath: string,
  state: CrawlState,
  depth = 0,
): Promise<{ ok: number; skipped: number; failed: number }> {
  const norm = normalizeUrl(url);

  if (state.visited.has(norm)) return { ok: 0, skipped: 1, failed: 0 };

  if (state.totalPages >= LIMITS.maxTotalPages) {
    if (depth === 0) console.log(`  ${tag(partyId)} STOPP — totalgräns ${LIMITS.maxTotalPages} nådd`);
    return { ok: 0, skipped: 0, failed: 0 };
  }

  const partyCount = state.pagesPerParty.get(partyId) ?? 0;
  if (partyCount >= LIMITS.maxPagesPerParty) {
    if (depth === 0) console.log(`  ${tag(partyId)} STOPP — partygräns ${LIMITS.maxPagesPerParty} nådd`);
    return { ok: 0, skipped: 0, failed: 0 };
  }

  const ignoreReason = shouldIgnoreUrl(norm);
  if (ignoreReason) {
    state.visited.add(norm);
    return { ok: 0, skipped: 1, failed: 0 };
  }

  state.visited.add(norm);
  state.pagesPerParty.set(partyId, partyCount + 1);
  state.totalPages++;

  process.stdout.write(`  ${tag(partyId)} ${counters(partyId, state)} ${norm} ... `);
  await delay(LIMITS.delayMs);

  const result = await crawlPage(url, partyId, sourceType, isPrimary);

  if (result.ok) {
    const changed = result.isNew || result.changed;
    console.log(
      changed
        ? `✓ ${result.isNew ? "NY" : "UPPDATERAD"} — "${result.title}" (${result.wordCount} ord)`
        : `= oförändrad (${result.wordCount} ord)`,
    );
    return { ok: changed ? 1 : 0, skipped: changed ? 0 : 1, failed: 0 };
  }

  if (result.error === "page_too_short" && depth < LIMITS.maxDepth) {
    console.log(`~ indexsida, letar politiska länkar under ${basePath}...`);
    const links = await discoverLinks(url, basePath);
    const newLinks = links.filter((l) => !state.visited.has(normalizeUrl(l)));

    if (newLinks.length === 0) {
      console.log(`    ${tag(partyId)} → inga nya följbara länkar`);
      return { ok: 0, skipped: 0, failed: 1 };
    }

    console.log(`    ${tag(partyId)} → hittade ${newLinks.length} länk(ar)`);
    let ok = 0, skipped = 0, failed = 0;

    for (const link of newLinks) {
      if (state.totalPages >= LIMITS.maxTotalPages) break;
      if ((state.pagesPerParty.get(partyId) ?? 0) >= LIMITS.maxPagesPerParty) break;
      const sub = await processUrl(link, partyId, sourceType, isPrimary, basePath, state, depth + 1);
      ok += sub.ok; skipped += sub.skipped; failed += sub.failed;
    }
    return { ok, skipped, failed };
  }

  console.log(`✗ ${result.error}`);
  return { ok: 0, skipped: 0, failed: 1 };
}

async function main() {
  const partyOrder = ["socialdemokraterna", "vansterpartiet", "kristdemokraterna",
                      "liberalerna", "sverigedemokraterna", "centerpartiet", "miljopartiet"];

  console.log("Valkompass — RIKTAD CRAWL (exkl. Moderaterna)");
  console.log(`Gränser: max ${LIMITS.maxPagesPerParty} sidor/parti, max ${LIMITS.maxTotalPages} totalt, djup ${LIMITS.maxDepth}`);
  console.log(`Seed-URL:er: ${TARGETED_SEED_URLS.length}\n`);

  const state: CrawlState = {
    visited:       new Set<string>(),
    pagesPerParty: new Map<string, number>(),
    totalPages:    0,
  };

  let totalOk = 0, totalSkipped = 0, totalFailed = 0;
  let lastParty = "";

  // Processa i prioritetsordning
  const sorted = [...TARGETED_SEED_URLS].sort(
    (a, b) => partyOrder.indexOf(a.partyId) - partyOrder.indexOf(b.partyId)
  );

  for (const source of sorted) {
    if (state.totalPages >= LIMITS.maxTotalPages) {
      console.log(`\nSTOPP — totalgräns ${LIMITS.maxTotalPages} nådd`);
      break;
    }

    if (source.partyId !== lastParty) {
      console.log(`\n── ${source.partyId} ──────────────────────────────────────────`);
      lastParty = source.partyId;
    }

    const counts = await processUrl(
      source.url, source.partyId, source.sourceType,
      source.isPrimary, source.basePath, state,
    );
    totalOk += counts.ok; totalSkipped += counts.skipped; totalFailed += counts.failed;
  }

  console.log(`\n${"─".repeat(58)}`);
  console.log(`Klar: ${totalOk} ny/uppdaterad, ${totalSkipped} oförändrad/hoppad, ${totalFailed} misslyckad`);
  console.log(`Totalt besökta: ${state.totalPages} sidor`);
  console.log("\nNästa steg: NODE_OPTIONS=\"--use-system-ca\" npm run extract");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
