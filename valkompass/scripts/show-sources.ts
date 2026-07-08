import "dotenv/config";
import { createClient } from "../lib/createClient";

const prisma = createClient();

async function main() {
  const parties = [
    "socialdemokraterna", "vansterpartiet", "kristdemokraterna",
    "liberalerna", "sverigedemokraterna", "centerpartiet", "miljopartiet",
  ];

  for (const p of parties) {
    const srcs = await prisma.source.findMany({
      where: { partyId: p },
      select: { url: true, title: true },
      orderBy: { fetchedAt: "asc" },
    });
    console.log(`\n── ${p} (${srcs.length} crawlade sidor) ──`);
    srcs.forEach((s) => console.log(`  ${s.url}`));
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
