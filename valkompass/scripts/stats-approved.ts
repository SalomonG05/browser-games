import "dotenv/config";
import { createClient } from "../lib/createClient";

const prisma = createClient();

async function main() {
  const parties = await prisma.party.findMany({
    select: { id: true, name: true, shortName: true },
  });

  const counts = await prisma.position.groupBy({
    by: ["partyId"],
    where: { reviewStatus: "APPROVED" },
    _count: { id: true },
  });

  const map = Object.fromEntries(counts.map((c) => [c.partyId, c._count.id]));
  const total = counts.reduce((s, c) => s + c._count.id, 0);
  const all = parties
    .map((p) => ({ ...p, n: map[p.id] ?? 0 }))
    .sort((a, b) => b.n - a.n);

  console.log("\nAPPROVED positioner per parti");
  console.log("═".repeat(52));
  for (const p of all) {
    const bar = "█".repeat(Math.round((p.n / (total || 1)) * 30));
    const pct = total ? ((p.n / total) * 100).toFixed(0).padStart(3) : "  0";
    const missing = p.n === 0 ? "  ← SAKNAS" : "";
    console.log(`${p.shortName.padEnd(5)} ${String(p.n).padStart(3)}  ${pct}%  ${bar}${missing}`);
  }
  console.log("─".repeat(52));
  console.log(`TOT    ${total}`);
  console.log();

  const missing = all.filter((p) => p.n === 0).map((p) => p.shortName);
  const weak    = all.filter((p) => p.n > 0 && p.n < 5).map((p) => `${p.shortName}(${p.n})`);

  if (missing.length) console.log(`Helt saknar APPROVED: ${missing.join(", ")}`);
  if (weak.length)    console.log(`Färre än 5 APPROVED:  ${weak.join(", ")}`);

  const maxShare = total ? (all[0].n / total) * 100 : 0;
  if (maxShare > 50) {
    console.log(`\n⚠  ${all[0].shortName} utgör ${maxShare.toFixed(0)}% av allt godkänt material.`);
    console.log("   Frågor genererade nu skulle mestadels spegla M:s positioner.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
