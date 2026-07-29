# PROJECT CHECKPOINT — Valkompass
Uppdaterad: 2026-07-29  |  Commit: 9210a27

---

## Vad är detta?

En **svensk, källbaserad valkompass** för de 8 riksdagspartierna (S, M, SD, V, C, KD, L, MP).

Varje partiposition måste ha ett primärt källcitat från partiets officiella webbplats. AI-tolkning
separeras från faktacitaten. Positioner granskas manuellt av en människa innan de används i
valkompassen. Inga positioner fabriceras — om källan saknas markeras positionen NEEDS_REVIEW.

Stack: **Next.js 16 · Prisma 7 · SQLite · Tailwind · Zod · Cheerio · Claude API (claude-sonnet-4-6)**

---

## Databas — nuläge (2026-07-29)

| Modell | Antal |
|--------|-------|
| Partier | 8 |
| APPROVED positioner | **185** |
| APPROVED frågor | **51** |
| NEEDS_REVIEW frågor | **51** |
| REJECTED frågor | **8** (varav 4 pga dubblett) |
| PENDING frågor | **0** |

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

### APPROVED frågor — 51 st (klara för /kompass)

| Ämne | Frågor |
|------|--------|
| Skatter | 7 |
| Ekonomi | 6 |
| Jämställdhet | 6 |
| Lag och ordning | 6 |
| Energi | 5 |
| Jobb och arbetsmarknad | 5 |
| Klimat och miljö | 4 |
| Bostäder | 4 |
| Migration och integration | 3 |
| Landsbygd | 2 |
| EU och utrikespolitik | 1 |
| Försvar och säkerhet | 1 |
| Skola och utbildning | 1 |

**Starka frågor (3+ relevanta partier): 11**
**Svaga frågor (≤2 relevanta partier, weak=true): 40**

### Partitäckning i APPROVED frågor
| Parti | Frågor |
|-------|--------|
| M  | 22 |
| L  | 17 |
| KD | 15 |
| MP | 15 |
| S  | 13 |
| C  | 13 |
| V  | 12 |
| SD | 10 |

---

## Frågegenereringshistorik

### Fas 1 — v1 (2026-06-25, NEDLAGD)
- 72 frågor genererades från breda ämneskluster
- Problem: ALLA positioner i ett ämne länkades till ALLA frågor → irrelevanta kopplingar
- Relevansfiltrerats via Claude: 46 NEEDS_REVIEW kvar (bara 1 relevant parti → oanvändbara)

### Fas 2 — v2 (2026-07-08, APPROVED frågor kvar)
- Ny ansats: semantisk klustring av positioner PER ämne
- Varje fråga kopplas bara till positioner som ingår i klustret
- 46 APPROVED frågor efter ChatGPT-granskning

### Fas 3 — v3 (2026-07-28/29, AKTIV)
- Positionsaudit + ny semantisk klustring → 11 kandidatfrågor
- ChatGPT-granskning applicerad 2026-07-29
- 10 nya APPROVED frågor tillkom
- 4 v2-dubbletter avvisades (bygglov, bostadsfinansiering, klimat x2)
- Felvänt positionValue korrigerat för 3 frågor (MP migration, SD kriminalvård, SD klimat)
- Totalt: 51 APPROVED frågor

---

## Tekniska fixes i senaste session (2026-07-29)

### positionValue-arkitektur
- `QuestionPosition.questionPositionValue` = riktningskänsligt värde relativt frågetextens JA/NEJ
- `Position.positionValue` = partiets eget värde (kan vara positivt även när partiet är NEJ på frågan)
- **Fix:** `app/api/questions/route.ts` uppdaterades att returnera `questionPositionValue ?? positionValue`
- `app/api/score/route.ts` hade redan samma logik

### Korrigerade positionsvärden (via apply-review-questions-v3.ts)
| Fråga | Parti | Gammalt | Nytt |
|-------|-------|---------|------|
| Restriktiv asylpolitik | MP | null (+2 implicit) | -2 |
| Rehabilitering vs straff | SD | null (+2 implicit) | -2 |
| Klimatsatsningar offentliga resurser | SD | null (+2 implicit) | -2 |

### Borttagen koppling
- L:s position på skatterfrågan (omfördelning/klyftor) togs bort — inte direkt relevant

---

## Scoring-verifikation (Playwright, 2026-07-29)

| Test | Resultat |
|------|----------|
| S-profil: S=74%, SD=31% | ✅ korrekt riktning |
| S-profil: MP=79%, V=79% | ✅ rimligt (S-liknande positioner) |
| SD-profil: SD=77%, MP=37%, V=36% | ✅ korrekt riktning |
| importance=0 → questionsMatched=0 | ✅ nollade svar räknas inte |
| Inga dubbletter i frågetexter | ✅ |
| Exakt 1 bygglovsfråga | ✅ |
| SD=-2 på klimatfrågan via API | ✅ |
| MP=-2 på migrationsfrågan via API | ✅ |

---

## Dataflöde

```
npm run crawl        → hämtar HTML från partiernas webbplatser → sparar i Source-tabellen
npm run extract      → skickar sources till Claude API → skapar Position-poster (PENDING)
/admin               → granska positioner manuellt → sätt APPROVED / REJECTED
npm run generate:questions-v3   → klustra positioner → skapa Question-poster (PENDING)
[ChatGPT-granskning av export]
scripts/apply-review-questions-v3.ts → applicera ChatGPT-beslut → APPROVED frågor
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
# → http://localhost:3000        (valkompass)
# → http://localhost:3000/admin  (admin: granska positioner och frågor)
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
| `generate:questions-v2` | `tsx scripts/generate-questions-v2.ts` | V2-frågegenerering |
| `generate:questions-v3` | `tsx scripts/generate-questions-v3.ts` | **V3-frågegenerering (aktiv)** |

---

## Viktigaste filer

| Fil | Syfte |
|-----|-------|
| `prisma/schema.prisma` | Datamodell — 7 tabeller |
| `data/seed-urls.ts` | Crawl-URL:er per parti |
| `lib/createClient.ts` | Prisma-klient för scripts |
| `lib/scoring.ts` | Matchningsalgoritm |
| `app/admin/page.tsx` | Adminvy: positioner, frågor, export |
| `app/api/questions/route.ts` | GET-API: returnerar questionPositionValue korrekt |
| `app/api/score/route.ts` | POST-API: beräknar matchning |
| `scripts/generate-questions-v3.ts` | **V3-frågegenerering — semantisk klustring** |
| `scripts/apply-review-questions-v3.ts` | Applicerade v3 ChatGPT-granskning |
| `scripts/playwright-verify.mjs` | Verification-script (kör mot körande server) |
| `.env` | Hemligheter (ALDRIG committa) |

---

## Kända begränsningar

### Blockerande för slutgiltig publik release
1. **Ämnesgap** — 0 APPROVED frågor inom Vård/Socialförsäkring; 1 fråga Skola/Försvar/EU
2. **M overtäckt** — M har 22 av 51 frågor (43%) vs SD 10 (20%). Kan ge skev matchning
3. **S saknas på klimatfrågan** — v3 klimatfrågan täcker SD/MP/KD/L men inte S

### Datakvalitet (acceptabla avvägningar)
4. M har 47 APPROVED positioner vs 19-20 för övriga — mer data men risk för bias
5. SD-crawl begränsad (SPA-webbplats) — täcker bara 20 positioner
6. 40 av 51 frågor är svaga (≤2 partier) — ger smalare matchningsprofil

### Tekniska
7. `NODE_OPTIONS="--use-system-ca"` krävs på denna maskin (Windows/proxy)
8. Dev-servern kan köra på port 3001 om 3000 är upptagen

---

## TODO — nästa steg i prioritetsordning

- [ ] **1. Täcka ämnesgap** — Vård, Socialförsäkring, Skola, Försvar, EU via riktad crawl
- [ ] **2. Lägga till S-position på klimatfrågan** — antingen ny crawl eller manuell /admin
- [ ] **3. Fundera på viktning av svaga frågor** — weak=true kan viktas lägre i scoring.ts
- [ ] **4. Balansera M-täckning** — ev. välj bort eller slå ihop M-tunga frågor
- [ ] **5. Produktionsdeploy** — Vercel, Railway eller liknande

---

## Tekniska antaganden

- **Prisma v7** kräver Driver Adapter (`PrismaBetterSqlite3`) — `new PrismaClient()` ensam fungerar inte
- **`lib/createClient.ts`** används i alla `scripts/*.ts` med relativa importer
- **`dotenv/config`** måste importeras *först* i scripts
- **QuestionPosition** composite PK: `@@id([questionId, positionId])`, upsert-nyckel: `questionId_positionId`
- **`questionPositionValue`** är riktningskänsligt (JA=+2, NEJ=−2); `positionValue` är partiets eget värde
- **`NODE_OPTIONS="--use-system-ca"`** krävs på denna maskin för alla npm/npx-kommandon
- **V3-frågor** skapas utan questionPositionValue — det sätts manuellt vid granskning vid behov

---

## Absolut att inte glömma

1. **ANTHROPIC_API_KEY i `.env` — aldrig i git**
2. **Ändra inte källcitat (sourceQuote) eller source_url** — de är faktabaserade
3. **Godkänn ingenting automatiskt** — kräver mänsklig/ChatGPT-granskning
4. **Frågor ska bara genereras från APPROVED positioner**
5. `NODE_OPTIONS="--use-system-ca"` krävs på denna maskin för alla npm/npx-kommandon

---

## Git-status vid checkpoint (2026-07-29)

Branch: `master` — synkad med origin/master  
Senaste commit: `9210a27 Apply ChatGPT v3 review: 10 new questions approved, positionValue fixes, dedup`

```
9210a27 Apply ChatGPT v3 review: 10 new questions approved, positionValue fixes, dedup
8d263dc Add v3 question generation: positions audit + 11 new candidates
32250ca Datakorrigering: positionsvärden, dubbletter, badge-logik och scoring
0a66411 Fix three UI bugs found during /kompass + /resultat testing
25584a5 Apply ChatGPT v2 question review: 46 APPROVED, weak flag added
```
