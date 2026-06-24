# Valkompass

Källbaserad, granskningsbar svensk valkompass. Next.js 16 + Prisma 7 + SQLite + Claude API.

## Kom igång

```bash
cp .env.example .env     # fyll i ANTHROPIC_API_KEY
npm install
npx prisma migrate dev
npm run seed             # 8 riksdagspartier
npm run crawl            # hämta partiernas webbsidor
npm run extract          # extrahera positioner med Claude
# gå till /admin och godkänn positioner
npm run generate-questions
npm run dev              # http://localhost:3000
```

## Viktiga filer

- `prisma/schema.prisma` — datamodell
- `lib/crawler.ts` — webbcrawler med hash-dedup
- `lib/extractPositions.ts` — Claude AI-extraktion
- `lib/generateQuestions.ts` — frågegenerering
- `lib/scoring.ts` — matchningsalgoritm
- `lib/sources.ts` — start-URLs per parti
- `app/admin/page.tsx` — granskningsvy
- `app/kompass/page.tsx` — användarflöde
- `app/resultat/page.tsx` — resultatsida

## Dataflöde

crawl → extract → admin (godkänn) → generate-questions → /kompass → /resultat

## Prisma

Genererad klient finns i `app/generated/prisma/client.ts`.
Import: `import { PrismaClient } from "@/app/generated/prisma/client"`.

## Miljövariabler

- `DATABASE_URL` — SQLite-fil, t.ex. `file:./dev.db`
- `ANTHROPIC_API_KEY` — nyckel för Claude API (används i extract + generate-questions)
