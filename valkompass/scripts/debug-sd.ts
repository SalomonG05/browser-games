import "dotenv/config";
import { createClient } from "../lib/createClient";
const prisma = createClient();
async function main() {
  const sdAll = await prisma.position.findMany({
    where: { partyId: "sverigedemokraterna", reviewStatus: "PENDING", confidence: "HIGH" },
    select: { specificQuestion: true, sourceUrl: true },
  });
  console.log("SD HIGH PENDING:", sdAll.length);
  console.log("\nSD source_urls:");
  const urls = [...new Set(sdAll.map(p => p.sourceUrl))];
  urls.forEach(u => console.log(" ", u));

  const OFFICIAL_DOMAINS = ["sd.se", "sverigedemokraterna.se"];
  const official = sdAll.filter(p => {
    try {
      const host = new URL(p.sourceUrl).hostname.replace(/^www\./, "");
      return OFFICIAL_DOMAINS.some(d => host === d || host.endsWith("." + d));
    } catch { return false; }
  });
  console.log("\nSD officiella:", official.length, "av", sdAll.length);
  await prisma.$disconnect();
}
main().catch(console.error);
