/**
 * Hjälpfunktioner för källhantering.
 *
 * Crawl-URL:er finns i data/seed-urls.ts.
 * Partiernas officiella hemsidor finns i data/parties.ts.
 */

/** Prioritetsordning för källtyper — lägre tal = högre trovärdighet */
const SOURCE_TYPE_PRIORITY: Record<string, number> = {
  MANIFESTO: 1,
  PARTY_PROGRAM: 2,
  PARTY_WEBSITE: 3,
  RIKSDAG: 4,
  AUTHORITY: 5,
  NEWS: 6,
};

export function getSourceTypePriority(sourceType: string): number {
  return SOURCE_TYPE_PRIORITY[sourceType] ?? 99;
}

/** Returnerar true om källtypen är en accepterad primärkälla för partipositioner */
export function isAcceptedPrimarySource(sourceType: string): boolean {
  return getSourceTypePriority(sourceType) <= 4;
}

/** Läsbar etikett för en källtyp */
export function sourceTypeLabel(sourceType: string): string {
  const labels: Record<string, string> = {
    MANIFESTO: "Valmanifest",
    PARTY_PROGRAM: "Partiprogram",
    PARTY_WEBSITE: "Partiets webbplats",
    RIKSDAG: "Riksdagsdokument",
    AUTHORITY: "Myndighet",
    NEWS: "Nyhetskälla",
  };
  return labels[sourceType] ?? sourceType;
}
