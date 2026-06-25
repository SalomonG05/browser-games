# PROJECT CHECKPOINT — Valkompass
Uppdaterad: 2026-06-25

---

## Vad är detta?

En **svensk, källbaserad valkompass** för de 8 riksdagspartierna (S, M, SD, V, C, KD, L, MP).

Varje partiposition måste ha ett primärt källcitat från partiets officiella webbplats. AI-tolkning
separeras från faktacitaten. Positioner granskas manuellt av en människa innan de används i
valkompassen. Inga positioner fabriceras — om källan saknas markeras positionen NEEDS_REVIEW.

Stack: **Next.js 16 · Prisma 7 · SQLite · Tailwind · Zod · Cheerio · Claude API (claude-sonnet-4-6)**

---

## Databas — nuläge (2026-06-25)

| Modell | Antal |
|--------|-------|
| Partier | 8 |
| APPROVED positioner | **185** |
| PENDING kandidatfrågor | **72** |
| APPROVED frågor | **0** |

### APPROVED positioner per parti
| Parti | Godkända | Notering |
|-------|---------|----------|
| Moderaterna | 47 | Ej med i 7-partiexport (kraftigt överrepresenterade) |
| Socialdemokraterna | 20 | ✓ Klart |
| Vänsterpartiet | 20 | ✓ Klart |
| Kristdemokraterna | 20 | ✓ Klart |
| Liberalerna | 20 | ✓ Klart |
| Sverigedemokraterna | 20 | ✓ Klart |
| Centerpartiet | 19 | Saknar 1 (jobb-ämnet svagt) |
| Miljöpartiet | 19 | Saknar 1 (jobb-ämnet svagt) |
| **TOTALT** | **185** | |

### Granskningsrundor som körts
| Runda | Export | Positioner | Resultat |
|-------|--------|------------|---------|
| Batch 1 | `chatgpt-review-2026-06-25.md` | 60 | ~60 godkända |
| Batch 2 (balanced) | `chatgpt-review-2026-06-25-balanced.md` | 56 | 48 direkt + 7 ändringar + 2 NEEDS_REVIEW |
| Runda 3 | `round3-export-2026-06-25.md` | 77 | 64 direkt + 11 ändringar + 2 NEEDS_REVIEW |
| **Totalt** | | **185 APPROVED** | |

---

## Kandidatfråge-export (nästa steg)

**Fil:** `exports/candidate-questions-2026-06-25.md`
**Antal:** 72 kandidatfrågor · alla PENDING · väntar på ChatGPT-granskning

### Ämnesfördelning (72 frågor)
| Ämne | Frågor |
|------|--------|
| Migration och integration | 6 |
| Ekonomi | 6 |
| Lag och ordning | 6 |
| Klimat och miljö | 6 |
| Skola och utbildning | 6 |
| Energi | 6 |
| Försvar och säkerhet | 6 |
| Skatter | 6 |
| Jobb och arbetsmarknad | 4 |
| Bostäder | 5 |
| Socialförsäkring och välfärd | 5 |
| EU och utrikespolitik | 4 |
| Jämställdhet | 4 |
| Vård och omsorg | 0 (för få partier med APPROVED positioner) |
| Landsbygd | 0 (ingen data) |

---

## Dataflöde

```
npm run crawl        → hämtar HTML från partiernas webbplatser → sparar i Source-tabellen
npm run extract      → skickar sources till Claude API → skapar Position-poster (PENDING)
/admin               → granska positioner manuellt → sätt APPROVED / REJECTED
npm run generate-questions → skapar Question-poster från APPROVED positioner
/admin → Valkompassfrågor → godkänn frågor
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

`.env.example` är committad med platshållare. Kopiera den:
```bash
cp .env.example .env
# Fyll i ANTHROPIC_API_KEY
```

---

## Starta projektet igen

```bash
cd valkompass

# Installera beroenden (om ny maskin)
NODE_OPTIONS="--use-system-ca" npm install

# Starta dev-server
NODE_OPTIONS="--use-system-ca" npm run dev
# → http://localhost:3000
```

Om databasen saknas (ny maskin):
```bash
NODE_OPTIONS="--use-system-ca" npx prisma migrate dev
NODE_OPTIONS="--use-system-ca" npm run seed
NODE_OPTIONS="--use-system-ca" npm run crawl
NODE_OPTIONS="--use-system-ca" npm run extract
# Gå till /admin och godkänn positioner
NODE_OPTIONS="--use-system-ca" npm run generate-questions
```

> **OBS:** `NODE_OPTIONS="--use-system-ca"` krävs på denna maskin (Windows, proxy) för att
> npm/npx ska kunna verifiera TLS-certifikat. Lägg gärna till det som prefix på alla kommandon.

---

## Alla npm-scripts

| Script | Kommando | Beskrivning |
|--------|----------|-------------|
| `dev` | `next dev` | Startar Next.js dev-server på port 3000 |
| `build` | `next build` | Bygger för produktion |
| `start` | `next start` | Startar produktionsserver |
| `seed` | `tsx prisma/seed.ts` | Sår 8 riksdagspartier i databasen |
| `crawl` | `tsx scripts/crawl.ts` | Crawlar alla seed-URL:er, max 10 sidor/parti |
| `crawl:test` | `tsx scripts/crawl.ts --test` | Crawlar 2 partier × 3 sidor (~15 sek, röktest) |
| `crawl:targeted` | `tsx scripts/crawl-targeted.ts` | Riktad crawl per parti (specifika URL:er) |
| `extract` | `tsx scripts/extract.ts` | Extraherar positioner från crawlade sources via Claude API |
| `export:balanced` | `tsx scripts/export-balanced.ts` | 8-per-parti ChatGPT-export med topic-spread |
| `export:round3` | `tsx scripts/export-round3.ts` | Runda 3 export (mål 20 APPROVED/parti) |
| `generate:candidates` | `tsx scripts/generate-candidate-questions.ts` | Genererar PENDING kandidatfrågor |
| `generate-questions` | `tsx scripts/generate-questions.ts` | Genererar slutliga frågor från APPROVED positioner |

---

## Viktigaste filer

| Fil | Syfte |
|-----|-------|
| `prisma/schema.prisma` | Datamodell — 7 tabeller |
| `data/seed-urls.ts` | Crawl-URL:er per parti med basePath |
| `lib/createClient.ts` | Prisma-klient för scripts (relativa importer) |
| `lib/scoring.ts` | Matchningsalgoritm |
| `app/admin/page.tsx` | Adminvy: positioner, frågor, export |
| `scripts/export-balanced.ts` | ChatGPT-export batch 2 (8/parti, topic-spread) |
| `scripts/export-round3.ts` | ChatGPT-export runda 3 (mål 20 APPROVED/parti) |
| `scripts/apply-review-2026-06-25-batch2.ts` | Applicerade batch 2-granskning |
| `scripts/apply-review-round3.ts` | Applicerade runda 3-granskning |
| `scripts/generate-candidate-questions.ts` | Skapar 72 PENDING kandidatfrågor |
| `scripts/cleanup-pending-questions.ts` | Rensar alla PENDING-frågor + positionslänkar |
| `exports/candidate-questions-2026-06-25.md` | **← SKICKA DENNA TILL CHATGPT** |
| `.env` | Hemligheter (ALDRIG committa) |
| `.env.example` | Mall utan hemligheter (committad) |

---

## Kända problem och brister

### Kvarstår (blockerar slutgiltig valkompass)
1. **Inga godkända frågor** — 72 PENDING behöver ChatGPT-granskning → kan inte köra `/kompass` meningsfullt
2. **Vård-gap** — 0 frågor inom Vård & omsorg (för få partier har APPROVED positioner i ämnet)
3. **Landsbygd-gap** — 0 frågor (ingen data crawlad)

### Datakvalitet (acceptabla avvägningar)
4. **SD-crawl begränsad** — SD:s SPA-baserade webbplats gav bara 2 sidor; SD nådde 20 APPROVED via maximering
5. **C och MP har 19 (ej 20)** APPROVED — saknar 1 inom jobb; acceptabelt för MVP
6. **Moderaterna uteslutna** från 7-partiexporterna men finns i databasen (47 APPROVED)

### Tekniska anmärkningar
7. **positionValue ≈ +1/+2 för alla** — alla partier har +1/+2 på sina egna positioner, stdDev ≈ 0
8. **SD positions sign** — SD:s migrationspolitik korrigerades till +2 (stödjer egna restriktioner)

---

## TODO — nästa steg i prioritetsordning

- [ ] **1. Skicka `exports/candidate-questions-2026-06-25.md` till ChatGPT**
      — be ChatGPT granska varje fråga: GODKÄNN / ÄNDRA OCH GODKÄNN / AVVISA
- [ ] **2. Skapa `scripts/apply-review-questions.ts`** och applicera ChatGPT-granskning
      — godkända frågor → APPROVED, avvisade → REJECTED, ändrade → uppdatera text + APPROVED
- [ ] **3. Testa `/kompass`** — svara på alla frågor som testväljare
- [ ] **4. Testa `/resultat`** — verifiera matchningsprocent och källlänkar
- [ ] **5. Validera `lib/scoring.ts`** — kontrollera att M inte gynnas av fler positioner
- [ ] **6. (Framtid) Vård-gap** — ny crawl av fler partiers hälsosidor om vård-frågor saknas
- [ ] **7. (Framtid) Lägg till Moderaterna** i balanserad position-export (nu uteslutna)

---

## Tekniska antaganden

- **Prisma v7** kräver Driver Adapter (`PrismaBetterSqlite3`) — `new PrismaClient()` ensam fungerar inte
- **`lib/createClient.ts`** används i alla `scripts/*.ts` med relativa importer (ej `@/`-alias)
- **`dotenv/config`** måste importeras *först* i scripts
- **`skipDuplicates`** stöds ej i Prisma 7/SQLite — använd `upsert`-loop
- **positionValue** är alltid +1/+2 för egna positioner — stdDev ≈ 0, fungerar ej som filter
- **`QuestionPosition`** composite PK: `@@id([questionId, positionId])`, upsert-nyckel: `questionId_positionId`
- **SD positionValues**: SD:s migrationspolitik = +2 (SD stödjer sina egna restriktioner)
- **NODE_OPTIONS="--use-system-ca"** krävs på denna maskin för alla npm/npx-kommandon

---

## Absolut att inte glömma

1. **ANTHROPIC_API_KEY i `.env` — aldrig i git** (`.gitignore` skyddar, men dubbelkolla)
2. **Ändra inte källcitat (sourceQuote) eller source_url** — de är faktabaserade
3. **Godkänn ingenting automatiskt** — kräver mänsklig/ChatGPT-granskning
4. **Frågor ska bara genereras från APPROVED positioner**
5. `NODE_OPTIONS="--use-system-ca"` krävs på denna maskin för alla npm/npx-kommandon
6. Prisma-migrationer: kör `npx prisma migrate dev` om schema ändrats, inte bara `generate`
7. Dev-servern kan råka köra på port 3001 om 3000 är upptagen — kolla terminalen

---

## Starta om projektet

```bash
# Starta dev-server
NODE_OPTIONS="--use-system-ca" npm run dev
# → http://localhost:3000
# → http://localhost:3000/admin (adminvy)

# Se kandidatfrågorna som ska granskas
# exports/candidate-questions-2026-06-25.md
```

---

## Git-status vid checkpoint (2026-06-25)

Branch: `master` — **synkad med origin/master**

Senaste commits:
```
3ad1d27 Generate 72 candidate questions for valkompass review
2d64949 Add export tab in admin for ChatGPT review
7aee5eb Add crawl limits, URL filtering, progress logging, and test mode
```

Ospårade filer:
- `valkompass/PROJECT_CHECKPOINT.md` (denna fil)

---

## Checkpoint klar

**Nästa steg är att granska kandidatfråge-exporten med ChatGPT.**

Öppna `exports/candidate-questions-2026-06-25.md` och klistra in i ChatGPT.

**Generera inte slutlig valkompass innan frågorna är granskade.**
