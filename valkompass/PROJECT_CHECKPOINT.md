# PROJECT CHECKPOINT — Valkompass
Uppdaterad: 2026-07-08

---

## Vad är detta?

En **svensk, källbaserad valkompass** för de 8 riksdagspartierna (S, M, SD, V, C, KD, L, MP).

Varje partiposition måste ha ett primärt källcitat från partiets officiella webbplats. AI-tolkning
separeras från faktacitaten. Positioner granskas manuellt av en människa innan de används i
valkompassen. Inga positioner fabriceras — om källan saknas markeras positionen NEEDS_REVIEW.

Stack: **Next.js 16 · Prisma 7 · SQLite · Tailwind · Zod · Cheerio · Claude API (claude-sonnet-4-6)**

---

## Databas — nuläge (2026-07-08)

| Modell | Antal |
|--------|-------|
| Partier | 8 |
| APPROVED positioner | **185** |
| APPROVED frågor | **22** |
| PENDING frågor (v2-kandidater) | **27** |
| NEEDS_REVIEW frågor | **46** |
| REJECTED frågor | **4** |

### APPROVED positioner per parti
| Parti | Godkända |
|-------|---------|
| Moderaterna | 47 |
| Socialdemokraterna | 20 |
| Vänsterpartiet | 20 |
| Kristdemokraterna | 20 |
| Liberalerna | 20 |
| Sverigedemokraterna | 20 |
| Centerpartiet | 19 |
| Miljöpartiet | 19 |
| **TOTALT** | **185** |

### APPROVED frågor — 22 st (klar för /kompass)

| Ämne | Frågor |
|------|--------|
| Migration och integration | 1 |
| Ekonomi | 2 |
| Lag och ordning | 3 |
| Klimat och miljö | 1 |
| Skola och utbildning | 1 |
| Energi | 3 |
| Försvar och säkerhet | 1 |
| Skatter | 4 |
| Jobb och arbetsmarknad | 0 |
| Bostäder | 1 |
| Socialförsäkring och välfärd | 0 |
| EU och utrikespolitik | 1 |
| Jämställdhet | 3 |
| Landsbygd | 1 |

Genomsnittligt antal relevanta partier per APPROVED fråga: **2.1**
(varav 1 fråga har 4 relevanta partier — kärnkraft)

---

## Frågegenereringshistorik

### Fas 1 — v1 (2026-06-25, NEDLAGD)
- 72 frågor genererades från breda ämneskluster
- Problem: ALLA positioner i ett ämne länkades till ALLA frågor i ämnet
- ChatGPT granskade och godkände/avvisade 72 frågor
- `scripts/apply-review-questions.ts` körd 2026-07-08:
  - Relevansfiltrade via Claude API: 776 irrelevanta links borttagna
  - Resultat: 22 APPROVED, 46 NEEDS_REVIEW, 4 REJECTED
  - De 46 NEEDS_REVIEW fick bara 1 relevant parti efter filtrering → oanvändbara

### Fas 2 — v2 (2026-07-08, PENDING CHATGPT-GRANSKNING)
- Ny ansats: semantisk klustring av positioner INNAN frågegenerering
- Varje fråga kopplas bara till positioner som faktiskt ingår i klustret
- `scripts/generate-questions-v2.ts` genererade 27 PENDING frågor
- Export klar: `exports/candidate-questions-v2-2026-07-08.md`

| Styrka | Antal | Detaljer |
|--------|-------|----------|
| Starka (≥3 partier) | 6 | Bl.a. klimat (5 partier), skatter (5 partier) |
| Svagare (2 partier) | 21 | Verkliga politiska splits men smal positonstäckning |
| Genomsnitt | 2.4 partier/fråga | |

**Ämnesfördelning v2 PENDING:** Migration (2), Ekonomi (3), Lag & ordning (3),
Klimat (3), Energi (3), Skatter (2), Jobb (3), Bostäder (3), Jämställdhet (3), Landsbygd (2)

**Ämnen med 0 v2-frågor (dataproblem):** Skola, Försvar, Vård, Socialförsäkring, EU

---

## Dataflöde

```
npm run crawl        → hämtar HTML från partiernas webbplatser → sparar i Source-tabellen
npm run extract      → skickar sources till Claude API → skapar Position-poster (PENDING)
/admin               → granska positioner manuellt → sätt APPROVED / REJECTED
npm run generate:questions-v2   → klustra positioner → skapa Question-poster (PENDING)
[ChatGPT-granskning av export]
scripts/apply-review-questions-v2.ts → applicera ChatGPT-beslut → APPROVED frågor
/admin → Valkompassfrågor → kontroll av godkända frågor
/kompass             → användaren svarar på frågorna
/resultat            → matchningsresultat med källtransparens
```

---

## Viktiga miljövariabler

Filen `.env` (aldrig committa):
```
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY="sk-ant-..."   ← HEMLIG, ALDRIG I GIT
```

---

## Starta projektet igen

```bash
cd valkompass
NODE_OPTIONS="--use-system-ca" npm run dev
# → http://localhost:3000
# → http://localhost:3000/admin
```

---

## Alla npm-scripts

| Script | Kommando | Beskrivning |
|--------|----------|-------------|
| `dev` | `next dev` | Startar Next.js dev-server på port 3000 |
| `build` | `next build` | Bygger för produktion |
| `seed` | `tsx prisma/seed.ts` | Sår 8 riksdagspartier i databasen |
| `crawl` | `tsx scripts/crawl.ts` | Crawlar alla seed-URL:er, max 10 sidor/parti |
| `crawl:test` | `tsx scripts/crawl.ts --test` | Crawlar 2 partier × 3 sidor (~15 sek, röktest) |
| `crawl:targeted` | `tsx scripts/crawl-targeted.ts` | Riktad crawl per parti (specifika URL:er) |
| `extract` | `tsx scripts/extract.ts` | Extraherar positioner från crawlade sources |
| `export:balanced` | `tsx scripts/export-balanced.ts` | ChatGPT-export positioner (8/parti) |
| `export:round3` | `tsx scripts/export-round3.ts` | Runda 3 export positioner |
| `generate:candidates` | `tsx scripts/generate-candidate-questions.ts` | V1-frågegenerering (nedlagd) |
| `generate:questions-v2` | `tsx scripts/generate-questions-v2.ts` | **V2-frågegenerering (aktiv)** |
| `apply:review-questions` | `tsx scripts/apply-review-questions.ts` | Applicerar ChatGPT-granskning av v1-frågor |
| `generate-questions` | `tsx scripts/generate-questions.ts` | Slutlig frågegenerering från APPROVED |

---

## Viktigaste filer

| Fil | Syfte |
|-----|-------|
| `prisma/schema.prisma` | Datamodell — 7 tabeller |
| `data/seed-urls.ts` | Crawl-URL:er per parti |
| `lib/createClient.ts` | Prisma-klient för scripts |
| `lib/scoring.ts` | Matchningsalgoritm |
| `app/admin/page.tsx` | Adminvy: positioner, frågor, export |
| `scripts/generate-questions-v2.ts` | **V2-frågegenerering — semantisk klustring** |
| `scripts/apply-review-questions.ts` | Applicerade v1 ChatGPT-granskning |
| `exports/candidate-questions-v2-2026-07-08.md` | **← SKICKA TILL CHATGPT** |
| `.env` | Hemligheter (ALDRIG committa) |

---

## Kända problem och brister

### Blockerar slutgiltig valkompass
1. **27 PENDING frågor** väntar på ChatGPT-granskning → behöver `apply-review-questions-v2.ts`
2. **Ämnesgap** — 0 frågor inom Vård, Socialförsäkring; 1 svag fråga inom Skola/Försvar/EU
3. **Genomsnitt 2.1 partier/fråga** bland APPROVED — idealet är 3+

### Datakvalitet (acceptabla avvägningar)
4. M har 47 APPROVED positioner vs 19-20 för övriga — representerar mer data men riskerar bias
5. SD-crawl begränsad (SPA-webbplats) — täcker bara 20 positioner
6. C och MP har 19 (ej 20) APPROVED — acceptabelt för MVP

### Tekniska anmärkningar
7. V1-ansatsen (koppla ALLA topic-positioner) visade sig felaktig — V2 fixar detta
8. positionValue ≈ +1/+2 för alla — stdDev ≈ 0, oanvändbart som filter
9. `NODE_OPTIONS="--use-system-ca"` krävs på denna maskin för alla npm/npx-kommandon

---

## TODO — nästa steg i prioritetsordning

- [ ] **1. Skicka `exports/candidate-questions-v2-2026-07-08.md` till ChatGPT**
      — be ChatGPT granska: GODKÄNN / ÄNDRA OCH GODKÄNN / AVVISA per fråga
- [ ] **2. Skapa `scripts/apply-review-questions-v2.ts`** och applicera granskning
- [ ] **3. Kontrollera statistik** — ämnesfördelning, partitäckning, antal APPROVED frågor
- [ ] **4. Testa `/kompass`** — svara på alla frågor som testväljare
- [ ] **5. Testa `/resultat`** — verifiera matchningsprocent och källlänkar
- [ ] **6. (Framtid) Täcka ämnesgap** — Skola, Försvar, EU, Vård via ny riktad crawl

---

## Tekniska antaganden

- **Prisma v7** kräver Driver Adapter (`PrismaBetterSqlite3`) — `new PrismaClient()` ensam fungerar inte
- **`lib/createClient.ts`** används i alla `scripts/*.ts` med relativa importer
- **`dotenv/config`** måste importeras *först* i scripts
- **QuestionPosition** composite PK: `@@id([questionId, positionId])`, upsert-nyckel: `questionId_positionId`
- **`NODE_OPTIONS="--use-system-ca"`** krävs på denna maskin för alla npm/npx-kommandon
- **V2-frågor** har redan korrekta QuestionPosition-länkar — inget relevansfiltreringssteg behövs

---

## Absolut att inte glömma

1. **ANTHROPIC_API_KEY i `.env` — aldrig i git**
2. **Ändra inte källcitat (sourceQuote) eller source_url** — de är faktabaserade
3. **Godkänn ingenting automatiskt** — kräver mänsklig/ChatGPT-granskning
4. **Frågor ska bara genereras från APPROVED positioner**
5. `NODE_OPTIONS="--use-system-ca"` krävs på denna maskin för alla npm/npx-kommandon
6. Dev-servern kan råka köra på port 3001 om 3000 är upptagen — kolla terminalen

---

## Git-status vid checkpoint (2026-07-08)

Branch: `master` — synkad med origin/master

Senaste commits:
```
65175d0 Add semantic-clustering question generator v2 and candidate export
a05afbb Apply ChatGPT question review: relevance-filter positions and set statuses
f59cfca Add project checkpoint documenting 185 APPROVED positions and 72 candidate questions
```
