import "dotenv/config";
import { prisma } from "../lib/prisma";
import { crawlPage, discoverLinks } from "../lib/crawler";
import { SEED_URLS } from "../data/seed-urls";

/**
 * Crawlar en URL och följer interna länkar ett steg ned om sidan är för kort.
 * visited – globalt spår av URL:er som redan bearbetats i denna körning,
 *           förhindrar att cirkulära länkar skapar oändlig rekursion.
 * depth   – 0 = seed-URL, 1 = upptäckt länk (följs ej vidare)
 */
async function processUrl(
  url: string,
  partyId: string,
  sourceType: string,
  isPrimary: boolean,
  basePath: string,
  visited: Set<string>,
  depth = 0,
): Promise<{ ok: number; skipped: number; failed: number }> {
  if (visited.has(url)) return { ok: 0, skipped: 1, failed: 0 };
  visited.add(url);

  const indent = "  " + "  ".repeat(depth);
  process.stdout.write(`${indent}${partyId} — ${url} ... `);
  await new Promise((r) => setTimeout(r, 1200));

  const result = await crawlPage(url, partyId, sourceType, isPrimary);

  if (result.ok) {
    const changed = result.isNew || result.changed;
    console.log(changed ? `✓ ${result.isNew ? "NY" : "UPPDATERAD"} — "${result.title}" (${result.wordCount} ord)` : `= oförändrad (${result.wordCount} ord)`);
    return { ok: changed ? 1 : 0, skipped: changed ? 0 : 1, failed: 0 };
  }

  // Kort indexsida — följ interna länkar, men bara ett djup ned
  if (result.error === "page_too_short" && depth === 0) {
    console.log(`~ indexsida, letar interna länkar under ${basePath}...`);
    const links = await discoverLinks(url, basePath);
    const newLinks = links.filter((l) => !visited.has(l)).slice(0, 8);

    if (newLinks.length === 0) {
      console.log(`${indent}  → inga följbara nya länkar`);
      return { ok: 0, skipped: 0, failed: 1 };
    }

    let ok = 0, skipped = 0, failed = 0;
    for (const link of newLinks) {
      const sub = await processUrl(link, partyId, sourceType, isPrimary, basePath, visited, depth + 1);
      ok += sub.ok; skipped += sub.skipped; failed += sub.failed;
      await new Promise((r) => setTimeout(r, 1200));
    }
    return { ok, skipped, failed };
  }

  console.log(`✗ ${result.error}`);
  return { ok: 0, skipped: 0, failed: 1 };
}

async function main() {
  const args = process.argv.slice(2);
  const filterParty = args.find((a) => a.startsWith("--party="))?.split("=")[1];

  const sources = filterParty
    ? SEED_URLS.filter((s) => s.partyId === filterParty)
    : SEED_URLS;

  console.log(`Crawlar ${sources.length} seed-URL:er${filterParty ? ` för ${filterParty}` : ""}...\n`);

  const visited = new Set<string>();
  let totalOk = 0, totalSkipped = 0, totalFailed = 0;

  for (const source of sources) {
    const counts = await processUrl(
      source.url,
      source.partyId,
      source.sourceType,
      source.isPrimary,
      source.basePath,
      visited,
    );
    totalOk += counts.ok;
    totalSkipped += counts.skipped;
    totalFailed += counts.failed;
  }

  console.log(`\nKlar: ${totalOk} sparade, ${totalSkipped} oförändrade, ${totalFailed} misslyckade.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
