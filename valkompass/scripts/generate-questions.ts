import "dotenv/config";
import { prisma } from "../lib/prisma";
import { generateQuestions } from "../lib/generateQuestions";

async function main() {
  const approvedCount = await prisma.position.count({ where: { reviewStatus: "APPROVED" } });
  if (approvedCount === 0) {
    console.log("No approved positions found. Go to /admin and approve some positions first.");
    return;
  }
  console.log(`Found ${approvedCount} approved positions. Generating questions...\n`);

  const result = await generateQuestions();

  console.log(`Created: ${result.created} questions`);
  console.log(`Skipped (already exists): ${result.skipped}`);
  result.details.forEach((d) => console.log(`  ${d}`));

  if (result.created > 0) {
    console.log("\nNext: approve generated questions in /admin, then visit /kompass.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
