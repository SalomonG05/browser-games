import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PARTIES } from "../data/parties";

const url = process.env.DATABASE_URL!;
const dbPath = url.replace(/^file:/, "");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding parties...");
  for (const party of PARTIES) {
    await prisma.party.upsert({
      where: { id: party.id },
      update: { name: party.name, shortName: party.shortName, website: party.website, description: party.description },
      create: party,
    });
    console.log(`  ✓ ${party.name} (${party.shortName})`);
  }
  console.log(`\nSeeded ${PARTIES.length} parties.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
