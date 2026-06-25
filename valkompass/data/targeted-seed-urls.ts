/**
 * Riktade seed-URL:er för de sju underrepresenterade partierna.
 * Moderaterna är exkluderade — de har redan tillräckligt med APPROVED-positioner.
 *
 * URL:erna är verifierade via manuell inspektion av partiernas webbplatser 2026-06-25.
 * Varje URL pekar direkt på en sakpolitisk innehållssida, inte på en indexsida.
 */

import type { SeedUrl } from "./seed-urls";

export const TARGETED_SEED_URLS: SeedUrl[] = [

  // ── Socialdemokraterna ───────────────────────────────────────────────────────
  // Alla 12 sidor under /var-politik/a-till-o/
  ...[
    ["ekonomi",                     "Ekonomi"],
    ["jobb-och-arbetsmarknad",      "Jobb och arbetsmarknad"],
    ["skola-och-utbildning",        "Skola och utbildning"],
    ["sjukvard-halsa-och-omvard",   "Sjukvård, hälsa och omsorg"],
    ["klimat-och-miljo",            "Klimat och miljö"],
    ["invandring-och-integration",  "Invandring och integration"],
    ["bostader-och-infrastruktur",  "Bostäder och infrastruktur"],
    ["brottsbekampning-och-trygghet","Brottsbekämpning och trygghet"],
    ["forsvar-och-beredskap",       "Försvar och beredskap"],
    ["energi",                      "Energi"],
    ["socialtjanst-och-stod",       "Socialtjänst och stöd"],
    ["utrikespolitik",              "Utrikespolitik"],
  ].map(([slug, desc]) => ({
    partyId: "socialdemokraterna",
    url: `https://www.socialdemokraterna.se/var-politik/a-till-o/${slug}`,
    basePath: "/var-politik/a-till-o",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: desc as string,
  })),

  // ── Vänsterpartiet ───────────────────────────────────────────────────────────
  // 13 sakpolitiska ämnessidor under /var-politik/politik-a-o/
  ...[
    ["sjukvard",                    "Sjukvård"],
    ["skolan",                      "Skolan"],
    ["skattepolitik",               "Skattepolitik"],
    ["klimat",                      "Klimat"],
    ["bostader",                    "Bostäder"],
    ["arbetsmarknad",               "Arbetsmarknad"],
    ["valfard",                     "Välfärd"],
    ["flyktingpolitik",             "Flyktingpolitik"],
    ["energi",                      "Energi"],
    ["pension",                     "Pension"],
    ["kriminalitet-och-kriminalvard","Kriminalitet och kriminalvård"],
    ["forsvaret",                   "Försvaret"],
    ["aldreomsorg",                 "Äldreomsorg"],
  ].map(([slug, desc]) => ({
    partyId: "vansterpartiet",
    url: `https://www.vansterpartiet.se/var-politik/politik-a-o/${slug}/`,
    basePath: "/var-politik/politik-a-o",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: desc as string,
  })),

  // ── Kristdemokraterna ────────────────────────────────────────────────────────
  // 11 politikområdessidor — verifierade URL:er (ej den tomma indexsidan)
  ...[
    ["arbete--foretagande",         "Arbete och företagande"],
    ["bostad",                      "Bostad"],
    ["ekonomi--skatter",            "Ekonomi och skatter"],
    ["familj",                      "Familj"],
    ["forsvar",                     "Försvar"],
    ["migration-och-integration",   "Migration och integration"],
    ["miljo--energi",               "Miljö och energi"],
    ["skola--utbildning",           "Skola och utbildning"],
    ["trygghet",                    "Trygghet"],
    ["vard--omsorg",                "Vård och omsorg"],
    ["aldre",                       "Äldre"],
  ].map(([slug, desc]) => ({
    partyId: "kristdemokraterna",
    url: `https://kristdemokraterna.se/var-politik/politikomraden/${slug}`,
    basePath: "/var-politik/politikomraden",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: desc as string,
  })),

  // ── Liberalerna ──────────────────────────────────────────────────────────────
  // 14 ämnessidor under /politik/ — verifierade från den kompletta A-Ö-listan
  ...[
    ["skola",                       "Skolan"],
    ["ekonomi",                     "Ekonomi"],
    ["sjukvard",                    "Sjukvård"],
    ["integration",                 "Integration"],
    ["invandring",                  "Invandring"],
    ["klimatet",                    "Klimatet"],
    ["forsvar",                     "Försvar"],
    ["gangkriminalitet",            "Gängkriminalitet"],
    ["kriminalvard",                "Kriminalvård"],
    ["pensioner",                   "Pensioner"],
    ["polisen",                     "Polisen"],
    ["aldreomsorg",                 "Äldreomsorg"],
    ["europeiska-unionen",          "Europeiska unionen"],
    ["karnkraft",                   "Kärnkraft"],
  ].map(([slug, desc]) => ({
    partyId: "liberalerna",
    url: `https://www.liberalerna.se/politik/${slug}`,
    basePath: "/politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: desc as string,
  })),

  // ── Sverigedemokraterna ──────────────────────────────────────────────────────
  // SD:s webbplats är SPA-baserad; de enda texttäta sakpolitiksidorna är dessa två
  {
    partyId: "sverigedemokraterna",
    url: "https://sd.se/vad-vi-vill/sverige-pa-vag/",
    basePath: "/vad-vi-vill",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "SD:s samlade politiska program",
  },
  {
    partyId: "sverigedemokraterna",
    url: "https://sd.se/tidoavtalet/",
    basePath: "/",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "Tidöavtalet — SD:s regeringsöverenskommelse",
  },

  // ── Centerpartiet ────────────────────────────────────────────────────────────
  // OBS: C:s policy är under /centerpartiets-politik/ — INTE /var-politik/
  // Verifierat 2026-06-25
  ...[
    ["jobb",                        "Jobb"],
    ["klimat",                      "Klimat"],
    ["ekonomi-och-skatter",         "Ekonomi och skatter"],
    ["utbildning",                  "Utbildning"],
    ["vard-och-omsorg",             "Vård och omsorg"],
    ["integration-och-migration",   "Integration och migration"],
    ["foretagande",                 "Företagande"],
    ["bostader",                    "Bostäder"],
    ["landsbygd",                   "Landsbygd"],
    ["forsvar",                     "Försvar"],
    ["lag-och-ratt",                "Lag och rätt"],
    ["trygghetssystem",             "Trygghetssystem"],
    ["energi",                      "Energi"],
  ].map(([slug, desc]) => ({
    partyId: "centerpartiet",
    url: `https://www.centerpartiet.se/centerpartiets-politik/centerpartiets-politik-a-o/${slug}`,
    basePath: "/centerpartiets-politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: desc as string,
  })),

  // ── Miljöpartiet ─────────────────────────────────────────────────────────────
  // 12 ämnessidor under /politik/ — verifierade från MP:s A-Ö
  ...[
    ["klimat",                                  "Klimat"],
    ["miljo",                                   "Miljö"],
    ["halso-och-sjukvard",                      "Hälso- och sjukvård"],
    ["skola",                                   "Skola"],
    ["gron-ekonomi",                            "Grön ekonomi"],
    ["migration-och-lika-ratt",                 "Migration och lika rätt"],
    ["bostader",                                "Bostäder"],
    ["forsvar-och-sakerhet",                    "Försvar och säkerhet"],
    ["energi",                                  "Energi"],
    ["aldreomsorg",                             "Äldreomsorg"],
    ["socialforsakringar-och-ekonomisk-trygghet","Socialförsäkringar och ekonomisk trygghet"],
    ["brottsbekampning-och-forebyggande",       "Brottsbekämpning och förebyggande"],
  ].map(([slug, desc]) => ({
    partyId: "miljopartiet",
    url: `https://www.mp.se/politik/${slug}/`,
    basePath: "/politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: desc as string,
  })),
];
