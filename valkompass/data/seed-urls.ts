/**
 * Crawl-URLs per parti.
 *
 * Skilj på:
 *   party.website  (data/parties.ts)  — partiets officiella startsida, används
 *                                       för presentation och länkning i UI:t.
 *   SeedUrl.url    (data/seed-urls.ts) — specifika sidor att crawla för att
 *                                       extrahera politiska ståndpunkter.
 *
 * En sida kan vara för kort för att innehålla ståndpunkter (t.ex. en indexsida
 * med bara rubriker). Crawlern följer i sådana fall interna länkar under samma
 * bassökväg (se basePath). Sätt basePath till den gemensamma prefixet för
 * politik-sidor på den domänen.
 */
export type SeedUrl = {
  partyId: string;
  url: string;
  /** Sökvägsprefix — crawlern följer interna länkar som börjar med detta */
  basePath: string;
  sourceType: string;
  isPrimary: boolean;
  description: string;
};

export const SEED_URLS: SeedUrl[] = [
  // ── Socialdemokraterna ────────────────────────────────────────────────────
  {
    partyId: "socialdemokraterna",
    url: "https://www.socialdemokraterna.se/var-politik",
    basePath: "/var-politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "Partiets politik — översikt",
  },
  {
    partyId: "socialdemokraterna",
    url: "https://www.socialdemokraterna.se/var-politik/a-till-o",
    basePath: "/var-politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "Politik A–Ö",
  },

  // ── Moderaterna ───────────────────────────────────────────────────────────
  {
    partyId: "moderaterna",
    url: "https://moderaterna.se/var-politik/",
    basePath: "/var-politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "Moderaternas politik",
  },

  // ── Sverigedemokraterna ───────────────────────────────────────────────────
  {
    partyId: "sverigedemokraterna",
    url: "https://sd.se/var-politik",
    basePath: "/var-politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "SD:s politik",
  },

  // ── Vänsterpartiet ────────────────────────────────────────────────────────
  {
    partyId: "vansterpartiet",
    url: "https://www.vansterpartiet.se/var-politik/",
    basePath: "/var-politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "Vänsterpartiets politik — översikt",
  },
  {
    partyId: "vansterpartiet",
    url: "https://www.vansterpartiet.se/var-politik/politik-a-o/",
    basePath: "/var-politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "Politik A–Ö",
  },

  // ── Centerpartiet ─────────────────────────────────────────────────────────
  {
    partyId: "centerpartiet",
    url: "https://www.centerpartiet.se/var-politik",
    basePath: "/var-politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "Centerpartiets politik",
  },

  // ── Kristdemokraterna ─────────────────────────────────────────────────────
  {
    partyId: "kristdemokraterna",
    url: "https://kristdemokraterna.se/var-politik",
    basePath: "/var-politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "KD:s politik — översikt",
  },
  {
    partyId: "kristdemokraterna",
    url: "https://kristdemokraterna.se/var-politik/politikomraden",
    basePath: "/var-politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "KD:s politikområden",
  },

  // ── Liberalerna ───────────────────────────────────────────────────────────
  {
    partyId: "liberalerna",
    url: "https://www.liberalerna.se/politik",
    basePath: "/politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "Liberalernas politik",
  },

  // ── Miljöpartiet ──────────────────────────────────────────────────────────
  {
    partyId: "miljopartiet",
    url: "https://www.mp.se/politik",
    basePath: "/politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "Miljöpartiets politik",
  },
];
