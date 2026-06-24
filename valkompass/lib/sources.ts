export type PartySource = {
  partyId: string;
  url: string;
  sourceType: string;
  isPrimary: boolean;
  description: string;
};

export const PARTY_SOURCES: PartySource[] = [
  // Socialdemokraterna
  {
    partyId: "socialdemokraterna",
    url: "https://www.socialdemokraterna.se/var-politik/a-till-o",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "Politisk A-Ö",
  },
  {
    partyId: "socialdemokraterna",
    url: "https://www.socialdemokraterna.se/var-politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "Partiets politik",
  },
  // Moderaterna
  {
    partyId: "moderaterna",
    url: "https://moderaterna.se/politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "Moderaternas politik",
  },
  {
    partyId: "moderaterna",
    url: "https://moderaterna.se/politik/a-o",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "Politik A-Ö",
  },
  // Sverigedemokraterna
  {
    partyId: "sverigedemokraterna",
    url: "https://sd.se/var-politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "SD:s politik",
  },
  // Vänsterpartiet
  {
    partyId: "vansterpartiet",
    url: "https://www.vansterpartiet.se/politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "Vänsterpartiets politik",
  },
  // Centerpartiet
  {
    partyId: "centerpartiet",
    url: "https://www.centerpartiet.se/var-politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "Centerpartiets politik",
  },
  // Kristdemokraterna
  {
    partyId: "kristdemokraterna",
    url: "https://www.kristdemokraterna.se/var-politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "KD:s politik",
  },
  // Liberalerna
  {
    partyId: "liberalerna",
    url: "https://www.liberalerna.se/politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "Liberalernas politik",
  },
  // Miljöpartiet
  {
    partyId: "miljopartiet",
    url: "https://www.mp.se/politik",
    sourceType: "PARTY_WEBSITE",
    isPrimary: true,
    description: "Miljöpartiets politik",
  },
];
