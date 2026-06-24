import "dotenv/config";
import { prisma } from "../lib/prisma";
import { extractPositions } from "../lib/extractPositions";

async function main() {
  const args = process.argv.slice(2);
  const filterParty = args.find((a) => a.startsWith("--party="))?.split("=")[1];
  const filterSource = args.find((a) => a.startsWith("--source="))?.split("=")[1];

  const sources = await prisma.source.findMany({
    where: {
      ...(filterParty && { partyId: filterParty }),
      ...(filterSource && { id: filterSource }),
      positions: { none: {} },
    },
    include: { party: { select: { name: true } } },
  });

  if (sources.length === 0) {
    console.log("No sources to process. Run npm run crawl first.");
    return;
  }

  console.log(`Extracting positions from ${sources.length} sources...\n`);

  let totalSaved = 0, totalSkipped = 0;

  for (const source of sources) {
    console.log(`  [${source.party.name}] ${source.url}`);
    const result = await extractPositions(source.id);
    console.log(`    → saved: ${result.saved}, skipped: ${result.skipped}`);
    if (result.errors.length > 0) {
      result.errors.forEach((e) => console.log(`    ! ${e}`));
    }
    totalSaved += result.saved;
    totalSkipped += result.skipped;
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\nDone: ${totalSaved} positions saved, ${totalSkipped} skipped.`);
  console.log(`\nNext: visit http://localhost:3000/admin to review positions.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
