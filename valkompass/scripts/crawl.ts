import "dotenv/config";
import { prisma } from "../lib/prisma";
import { crawlPage, discoverLinks, normalizeUrl, shouldIgnoreUrl } from "../lib/crawler";
import { SEED_URLS } from "../data/seed-urls";

// ── Konfiguration ────────────────────────────────────────────────────────────

const FULL_LIMITS = {
  maxPagesPerParty: 10,
  maxDepth: 1,
  timeoutPerPageMs: 15000,
  maxTotalPages: 80,
  delayMs: 800,
};

const TEST_LIMITS = {
  maxPagesPerParty: 3,
  maxDepth: 1,
  timeoutPerPageMs: 10000,
  maxTotalPages: 6,
  delayMs: 300,
};

const TEST_MAX_PARTIES = 2;

// ── State ────────────────────────────────────────────────────────────────────

interface CrawlState {
  visited: Set<string>;           // normaliserade URL:er som redan besökts
  pagesPerParty: Map<string, number>;
  totalPages: number;
}

// ── Hjälpfunktioner ──────────────────────────────────────────────────────────

function tag(partyId: string) {
  return `[${partyId.slice(0, 2).toUpperCase()}]`;
}

function counters(partyId: string, state: CrawlState, limits: typeof FULL_LIMITS) {
  const p = state.pagesPerParty.get(partyId) ?? 0;
  return `(${p}/${limits.maxPagesPerParty}, ${state.totalPages}/${limits.maxTotalPages})`;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Kärn-crawl-funktion ──────────────────────────────────────────────────────

async function processUrl(
  url: string,
  partyId: string,
  sourceType: string,
  isPrimary: boolean,
  basePath: string,
  state: CrawlState,
  limits: typeof FULL_LIMITS,
  depth = 0,
): Promise<{ ok: number; skipped: number; failed: number }> {
  const norm = normalizeUrl(url);

  if (state.visited.has(norm)) {
    return { ok: 0, skipped: 1, failed: 0 };
  }

  // Kontrollera totalgräns
  if (state.totalPages >= limits.maxTotalPages) {
    if (depth === 0) {
      console.log(`  ${tag(partyId)} STOPP — totalgräns ${limits.maxTotalPages} sidor nådd, avslutar`);
    }
    return { ok: 0, skipped: 0, failed: 0 };
  }

  // Kontrollera per-parti-gräns
  const partyCount = state.pagesPerParty.get(partyId) ?? 0;
  if (partyCount >= limits.maxPagesPerParty) {
    if (depth === 0) {
      console.log(`  ${tag(partyId)} STOPP — partygräns ${limits.maxPagesPerParty} sidor nådd`);
    }
    return { ok: 0, skipped: 0, failed: 0 };
  }

  // Kontrollera ignore-regler
  const ignoreReason = shouldIgnoreUrl(norm);
  if (ignoreReason) {
    console.log(`  ${tag(partyId)} skip (${ignoreReason}) ${norm}`);
    state.visited.add(norm);
    return { ok: 0, skipped: 1, failed: 0 };
  }

  // Registrera sidan som besökt och räkna upp
  state.visited.add(norm);
  state.pagesPerParty.set(partyId, partyCount + 1);
  state.totalPages++;

  process.stdout.write(`  ${tag(partyId)} ${counters(partyId, state, limits)} ${norm} ... `);
  await delay(limits.delayMs);

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

  // Indexsida utan tillräckligt innehåll — följ interna länkar ett steg ned
  if (result.error === "page_too_short" && depth < limits.maxDepth) {
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
      if (state.totalPages >= limits.maxTotalPages) {
        console.log(`  ${tag(partyId)} STOPP — totalgräns ${limits.maxTotalPages} nådd under länkföljning`);
        break;
      }
      if ((state.pagesPerParty.get(partyId) ?? 0) >= limits.maxPagesPerParty) {
        console.log(`  ${tag(partyId)} STOPP — partygräns ${limits.maxPagesPerParty} nådd under länkföljning`);
        break;
      }
      const sub = await processUrl(link, partyId, sourceType, isPrimary, basePath, state, limits, depth + 1);
      ok += sub.ok; skipped += sub.skipped; failed += sub.failed;
    }
    return { ok, skipped, failed };
  }

  console.log(`✗ ${result.error}`);
  return { ok: 0, skipped: 0, failed: 1 };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes("--test");
  const filterParty = args.find((a) => a.startsWith("--party="))?.split("=")[1];

  const limits = isTest ? TEST_LIMITS : FULL_LIMITS;

  let sources = filterParty
    ? SEED_URLS.filter((s) => s.partyId === filterParty)
    : SEED_URLS;

  if (isTest) {
    // Välj de första TEST_MAX_PARTIES unika partierna
    const seenParties = new Set<string>();
    sources = sources.filter((s) => {
      if (seenParties.size >= TEST_MAX_PARTIES && !seenParties.has(s.partyId)) return false;
      seenParties.add(s.partyId);
      return true;
    });
  }

  const mode = isTest ? "TESTLÄGE" : "FULLKÖRNING";
  console.log(`Valkompass-crawl — ${mode}`);
  console.log(`Gränser: max ${limits.maxPagesPerParty} sidor/parti, max ${limits.maxTotalPages} totalt, djup ${limits.maxDepth}`);
  console.log(`Seed-URL:er: ${sources.length}${filterParty ? ` (parti: ${filterParty})` : ""}\n`);

  const state: CrawlState = {
    visited: new Set<string>(),
    pagesPerParty: new Map<string, number>(),
    totalPages: 0,
  };

  let totalOk = 0, totalSkipped = 0, totalFailed = 0;
  let lastParty = "";

  for (const source of sources) {
    if (state.totalPages >= limits.maxTotalPages) {
      console.log(`\nSTOPP — totalgräns ${limits.maxTotalPages} sidor nådd, hoppar kvarvarande seed-URL:er`);
      break;
    }

    if (source.partyId !== lastParty) {
      console.log(`\n── ${source.partyId} ─────────────────────────────────────────`);
      lastParty = source.partyId;
    }

    const counts = await processUrl(
      source.url,
      source.partyId,
      source.sourceType,
      source.isPrimary,
      source.basePath,
      state,
      limits,
    );
    totalOk += counts.ok;
    totalSkipped += counts.skipped;
    totalFailed += counts.failed;
  }

  console.log(`\n${"─".repeat(55)}`);
  console.log(`Klar: ${totalOk} sparade, ${totalSkipped} oförändrade/hoppade, ${totalFailed} misslyckade`);
  console.log(`Totalt hämtade sidor: ${state.totalPages}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
