# Valkompass

En källbaserad och granskningsbar svensk valkompass. Varje partiposition är kopplad till en verifierbar primärkälla — partiets officiella webbplats, valmanifest eller partiprogram.

## Krav

- Node.js 18+
- En Anthropic API-nyckel (för AI-extraktion och frågegenerering)

## Installation

```bash
cd valkompass
npm install
cp .env.example .env
# Öppna .env och fyll i din ANTHROPIC_API_KEY
```

## Starta databasen

```bash
npx prisma migrate dev    # Skapar dev.db med alla tabeller
npm run seed              # Lägger till 8 riksdagspartier
```

## Datainsamling

### 1. Crawla partiernas webbsidor
```bash
npm run crawl                          # Alla partier
npm run crawl -- --party=moderaterna   # Bara ett parti
```

### 2. Extrahera partipositioner med Claude
```bash
npm run extract                        # Alla crawlade sidor
npm run extract -- --party=moderaterna # Bara ett parti
```

### 3. Granska positioner i adminvyn
```bash
npm run dev
# Gå till http://localhost:3000/admin
# Granska och godkänn/avvisa positioner
```

**Viktig regel:** Endast positioner med `reviewStatus = APPROVED` används i valkompassen.

### 4. Generera valkompassfrågor
```bash
npm run generate-questions
# Skapar frågor där minst 2 partier har godkända, skilda positioner
```

## Starta appen

```bash
npm run dev
# http://localhost:3000
```

## Sidor

| Sida | Beskrivning |
|------|-------------|
| `/` | Startsida med förklaring |
| `/kompass` | Gör valkompassen (kräver godkända frågor) |
| `/resultat` | Matchningsresultat med källhänvisningar |
| `/admin` | Granska positioner och frågor |

## API-endpoints

| Endpoint | Metod | Beskrivning |
|----------|-------|-------------|
| `/api/parties` | GET | Hämta alla partier |
| `/api/questions` | GET | Hämta godkända frågor |
| `/api/crawl` | POST | Crawla en URL |
| `/api/extract` | POST | Extrahera positioner från en källa |
| `/api/questions/generate` | POST | Generera frågor |
| `/api/score` | POST | Beräkna matchning |
| `/api/admin/positions` | GET | Hämta positioner (med filter) |
| `/api/admin/positions/[id]` | PATCH | Uppdatera en position |

## Dataflöde

```
crawl → extract → admin (godkänn) → generate-questions → /kompass → /resultat
```

## Transparensprinciper

1. **Källcitat**: Varje position har ett direkt citat ur källmaterialet
2. **AI-tolkning separeras**: AI:ns tolkning visas separat från citat och källa
3. **Granskningsstatus**: Positioner märks PENDING tills en människa godkänt dem
4. **Okänd position**: Om citat saknas skapas ingen position
5. **Matchningsinfo**: Resultatsidan visar exakt hur många frågor som räknades

## Granskningsstatusar

| Status | Betydelse |
|--------|-----------|
| PENDING | Nyskapad, ej granskad |
| APPROVED | Godkänd av människa, används i valkompassen |
| REJECTED | Avvisad (fel, vilseledande eller otydlig) |
| NEEDS_MORE_SOURCE | Behöver bättre källstöd |
| NEEDS_REVIEW | AI är osäker, kräver extra granskning |

## Teknisk stack

- **Frontend/Backend**: Next.js 16 App Router + TypeScript
- **Databas**: SQLite via Prisma 7 + better-sqlite3
- **AI-extraktion**: Anthropic Claude (claude-sonnet-4-6)
- **Scraping**: fetch + Cheerio
- **Validering**: Zod
- **Styling**: Tailwind CSS

## Miljövariabler

| Variabel | Beskrivning |
|----------|-------------|
| `DATABASE_URL` | SQLite-sökväg, t.ex. `file:./dev.db` |
| `ANTHROPIC_API_KEY` | Nyckel för Claude API |

## Projektstruktur

```
valkompass/
├── app/                    Next.js App Router sidor och API-routes
│   ├── page.tsx            Startsida
│   ├── kompass/page.tsx    Valkompassflöde
│   ├── resultat/page.tsx   Resultatsida
│   ├── admin/page.tsx      Adminvy
│   └── api/                API-routes
├── lib/                    Hjälpfunktioner
│   ├── prisma.ts           Prisma-singleton
│   ├── crawler.ts          Webbcrawler
│   ├── extractPositions.ts Claude AI-extraktion
│   ├── generateQuestions.ts Frågegenerering
│   ├── scoring.ts          Matchningsalgoritm
│   ├── schemas.ts          Zod-valideringsscheman
│   └── sources.ts          Start-URLs per parti
├── data/parties.ts         Partidata (8 riksdagspartier)
├── scripts/                CLI-scripts
│   ├── crawl.ts            Kör crawling
│   ├── extract.ts          Kör AI-extraktion
│   └── generate-questions.ts Generera frågor
└── prisma/
    ├── schema.prisma       Datamodell
    └── seed.ts             Lägg till partier
```
