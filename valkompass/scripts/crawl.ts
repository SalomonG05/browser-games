import "dotenv/config";
import { prisma } from "../lib/prisma";
import { crawlPage } from "../lib/crawler";
import { PARTY_SOURCES } from "../lib/sources";

async function main() {
  const args = process.argv.slice(2);
  const filterParty = args.find((a) => a.startsWith("--party="))?.split("=")[1];

  const sources = filterParty
    ? PARTY_SOURCES.filter((s) => s.partyId === filterParty)
    : PARTY_SOURCES;

  console.log(`Crawling ${sources.length} URLs${filterParty ? ` for ${filterParty}` : ""}...\n`);

  let ok = 0, skipped = 0, failed = 0;

  for (const source of sources) {
    process.stdout.write(`  ${source.partyId} — ${source.url} ... `);
    await new Promise((r) => setTimeout(r, 1500));

    const result = await crawlPage(source.url, source.partyId, source.sourceType, source.isPrimary);
    if (!result.ok) {
      console.log(`✗ ${result.error}`);
      failed++;
    } else if (!result.isNew && !result.changed) {
      console.log(`= unchanged (${result.wordCount} words)`);
      skipped++;
    } else {
      const flag = result.isNew ? "NEW" : "UPDATED";
      console.log(`✓ ${flag} — "${result.title}" (${result.wordCount} words) → ${result.sourceId}`);
      ok++;
    }
  }

  console.log(`\nDone: ${ok} saved, ${skipped} unchanged, ${failed} failed.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
