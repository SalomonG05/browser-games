# Valkompass — Kvalitetsrapport (QA)
Datum: 2026-07-29  |  Version: Första fungerande version  |  Commit: 9210a27

---

## Sammanfattning

Valkompassen är funktionell och verifierad. 51 APPROVED frågor täcker 13 av 15 ämnen med
korrekt riktning på positionsvärden. Scoring ger förväntade resultat för S-profil och SD-profil.
Kända begränsningar: M overtäckt, svagare täckning för SD/V/S, 2 ämnesgap.

**Status: Fungerande MVP — inte redo för publik release utan ytterligare datatäckning.**

---

## 1. Frågestatistik

| Kategori | Antal |
|----------|-------|
| Frågor i databasen totalt | 110 |
| APPROVED (klara för /kompass) | **51** |
| NEEDS_REVIEW | 51 |
| REJECTED (varav 4 dubblett) | 8 |
| PENDING | 0 |

| Frågestyrka | Antal | Andel |
|-------------|-------|-------|
| Starka (3+ relevanta partier) | 11 | 22% |
| Svaga (≤2 relevanta partier) | 40 | 78% |

### Starka frågor (11 st)
| Frågetext | Partier | Antal |
|-----------|---------|-------|
| Bör skatterna på arbete och pension sänkas? | M, KD, L, SD, C | 5 |
| Bör Sverige bygga ny kärnkraft med statligt stöd? | L, SD, C, MP | 4 |
| Bör Sverige prioritera ambitiösa klimatsatsningar även när de kräver offentliga resurser? | SD, MP, KD, L | 4 |
| Bör regler och processer för bygglov förenklas för att fler bostäder ska kunna byggas? | M, KD, C | 3 |
| Bör regelkrångel och byråkrati för företag minskas? | C, M, KD | 3 |
| Bör arbetsgivaravgifter eller anställningskostnader sänkas för att öka sysselsättningen? | C, KD, L | 3 |
| Bör särskilda anställningsformer med lägre trösklar användas för att få fler i arbete? | KD, L, C | 3 |
| Bör hedersrelaterat våld bekämpas med särskilda rättsliga eller polisiära åtgärder? | KD, L, MP | 3 |
| Bör EU föra en ambitiös klimatpolitik med höga utsläppsmål? | M, S, L | 3 |
| Bör Sverige föra en mer restriktiv asyl- och anhöriginvandringspolitik? | SD, V, MP | 3 |
| Bör skattesystemet användas mer aktivt för att finansiera välfärd och utjämna ekonomiska klyftor? | M, V, MP | 3 |

---

## 2. Ämnesfördelning

| Ämne | Frågor | Starka | Svaga | Kommentar |
|------|--------|--------|-------|-----------|
| Skatter | 7 | 2 | 5 | God täckning, bred spridning |
| Ekonomi | 6 | 1 | 5 | Tre höger-frågor, tre vänster-frågor |
| Jämställdhet | 6 | 1 | 5 | KD/L-tunga |
| Lag och ordning | 6 | 0 | 6 | Inga starka — alla 2-partierfrågor |
| Energi | 5 | 1 | 4 | Kärnkraftsfrågan stark (4 partier) |
| Jobb och arbetsmarknad | 5 | 2 | 3 | Bra spridning |
| Klimat och miljö | 4 | 2 | 2 | S saknas på klimatfrågan |
| Bostäder | 4 | 1 | 3 | Tydlig höger/vänster-delning |
| Migration | 3 | 1 | 2 | Stark migrationsfråga (3 partier) |
| Landsbygd | 2 | 0 | 2 | Tunn — C/M-dominerat |
| EU och utrikespolitik | 1 | 0 | 1 | **GAP: behöver fler frågor** |
| Försvar och säkerhet | 1 | 0 | 1 | **GAP: behöver fler frågor** |
| Skola och utbildning | 1 | 0 | 1 | **GAP: behöver fler frågor** |
| Vård och omsorg | 0 | 0 | 0 | **KRITISKT GAP** |
| Socialförsäkring | 0 | 0 | 0 | **KRITISKT GAP** |

---

## 3. Partitäckning

| Parti | Frågor | Andel av 51 | Kommentar |
|-------|--------|-------------|-----------|
| M  | 22 | 43% | Overtäckt — risk för M-bias |
| L  | 17 | 33% | God täckning |
| KD | 15 | 29% | God täckning |
| MP | 15 | 29% | God täckning |
| S  | 13 | 25% | Acceptabel — men S saknas på klimat |
| C  | 13 | 25% | Acceptabel |
| V  | 12 | 24% | Låg täckning |
| SD | 10 | 20% | Lägst — SPA-webbplats begränsar crawl |

**Idealvärde:** Alla partier borde ha 15–25 frågor. Nuläge: M=22 vs SD=10 — faktorn 2,2× är hög.

---

## 4. positionValue-korrekthet

### Verifierade korrekta värden
| Fråga | Parti | Värde | Korrekthet |
|-------|-------|-------|------------|
| Restriktiv asylpolitik | SD | +2 | ✅ SD = JA |
| Restriktiv asylpolitik | V | −2 | ✅ V = NEJ |
| Restriktiv asylpolitik | MP | −2 | ✅ MP = NEJ (fixat 2026-07-29) |
| Klimatsatsningar/offentliga resurser | SD | −2 | ✅ SD = NEJ (fixat 2026-07-29) |
| Klimatsatsningar/offentliga resurser | MP | +2 | ✅ MP = JA |
| Rehabilitering vs straff | V | +2 | ✅ V = JA |
| Rehabilitering vs straff | SD | −2 | ✅ SD = NEJ (fixat 2026-07-29) |
| Skatter/klyftor | V | +2 | ✅ V = JA |
| Skatter/klyftor | MP | +2 | ✅ MP = JA |
| Skatter/klyftor | M | −2 | ✅ M = NEJ |

### API-arkitektur
- `GET /api/questions` returnerar `questionPositionValue ?? position.positionValue`
- `POST /api/score` använder samma fallback-logik
- Fixat 2026-07-29 — tidigare läste GET-routen bara `position.positionValue`

---

## 5. Scoring — verifierade resultat

### S-profil (JA klimat/välfärd/hyresrätter, NEJ restriktiv migration)
| Parti | Matchprocent | Matchade frågor |
|-------|-------------|----------------|
| MP | 79% | 15 |
| V | 79% | 12 |
| S | 74% | 13 |
| L | 59% | 17 |
| KD | 55% | 15 |
| C | 48% | 13 |
| M | 45% | 22 |
| SD | 31% | 10 |

Observation: MP och V rankas marginellt högre än S. Det speglar att positionerna för MP/V
matchar S-väljarens svar lite bättre — korrekt beteende, inte en bugg.

### SD-profil (JA hårdare straff/restriktiv migration, NEJ klimatsatsningar)
| Parti | Matchprocent |
|-------|-------------|
| SD | 77% |
| M | 55% |
| C | 54% |
| S | 48% |
| L | 44% |
| KD | 44% |
| MP | 37% |
| V | 36% |

### Kantfall
| Test | Resultat |
|------|----------|
| importance=0 → räknas ej | ✅ questionsMatched=0 |
| Hoppad fråga → räknas ej | ✅ (skipped=true) |
| Parti utan position på fråga → räknas ej | ✅ (questionsMissing++) |

---

## 6. Vad fungerar

- ✅ /kompass visar 51 frågor i ordning, progress-indikator fungerar
- ✅ Svarsalternativ −2 till +2, viktning 0/1/2 (Inte viktig / Ganska / Mycket)
- ✅ /resultat visar rangordnade partier med matchprocent
- ✅ Källtransparens: varje partis position visas med källcitat och URL
- ✅ Ämnesuppdelning i /resultat (topic breakdown per parti)
- ✅ Badge: "Mycket begränsat underlag" (<5 matchade frågor), "Begränsat underlag" (<10)
- ✅ positionValue-riktning korrekt för alla granskade nyckelpositioner
- ✅ importance=0 ger ingen matchningspoäng
- ✅ Inga dubbletter bland APPROVED frågor

---

## 7. Kända begränsningar

### Blocker för slutgiltig publik valkompass
| # | Begränsning | Allvarlighet | Lösning |
|---|-------------|-------------|---------|
| 1 | 0 frågor om Vård/omsorg | Hög | Riktad crawl mot 1177/partiernas vårdpolitik |
| 2 | 0 frågor om Socialförsäkring | Hög | Riktad crawl |
| 3 | 1 fråga om Skola/Försvar/EU | Medium | Riktad crawl eller manuell position |
| 4 | M täcker 43% av frågorna | Medium | Välj bort M-exklusiva frågor, eller lägg till fler andra |
| 5 | S saknas på klimatfrågan | Låg | Lägg till S-position via /admin |

### Datakvalitet
| # | Begränsning | Kommentar |
|---|-------------|-----------|
| 6 | 78% svaga frågor (2 partier) | Ger smalare matchningsprofil |
| 7 | SD-crawl begränsad (SPA-webbplats) | 20 positioner — lägst av alla partier |
| 8 | M har 47 positioner vs 19-20 för andra | Reflekterar mer data, inte nödvändigtvis bias |
| 9 | questionPositionValue saknas på äldre frågor | Faller tillbaka på position.positionValue — fungerar men bör sättas explicit |

### Scoring
| # | Begränsning | Kommentar |
|---|-------------|-----------|
| 10 | Svaga frågor väger lika som starka | weak=true är flaggat men används inte i viktning ännu |
| 11 | Diff-baserad scoring (|svar − posval|) | Linjärt — ger inte extra poäng för exakt match |

---

## 8. Vad bör förbättras

### Prioritet 1 (blockerar publik release)
- Täcka Vård, Socialförsäkring, Skola, Försvar, EU med minst 2–3 frågor vardera
- Balansera M-dominansen (22 frågor) mot SD (10) och V (12)

### Prioritet 2 (förbättrar kvalitet)
- Lägg till S-position på klimatfrågan (9xv58cbm)
- Implementera viktning av weak=true i scoring.ts (t.ex. weight=0.5 för svaga frågor)
- Lägg till explicit questionPositionValue för äldre v1/v2-frågor där position.positionValue kan vara missledande

### Prioritet 3 (later / nice-to-have)
- Produktionsdeploy (Vercel/Railway)
- Spara sessiondata i databasen (UserSession/UserAnswer) i stället för sessionStorage
- Dela resultat-URL med vänner

---

## 9. Alla 51 APPROVED frågor

| # | Ämne | Frågetext | Partier | Styrka |
|---|------|-----------|---------|--------|
|  1 | Bostäder | Bör bolånetaket höjas så att man kan låna mer vid bostadsköp? | M, C | svag (2p) |
|  2 | Bostäder | Bör trösklar och kreditrestriktioner för bostadsköpare lättas? | M, C | svag (2p) |
|  3 | Bostäder | Bör staten ta en aktiv roll i att finansiera och bygga fler hyresrätter? | S, V | svag (2p) |
|  4 | Bostäder | Bör regler och processer för bygglov förenklas för att fler bostäder ska kunna byggas? | M, KD, C | stark (3p) |
|  5 | Ekonomi | Bör staten ta en aktiv roll i att samordna klimatomställningen och energiomställningen? | L, MP | svag (2p) |
|  6 | Ekonomi | Bör regler och administration för företag förenklas? | M, KD | svag (2p) |
|  7 | Ekonomi | Bör regelkrångel och byråkrati för företag minskas? | C, M, KD | stark (3p) |
|  8 | Ekonomi | Bör skattesystemet göras mer förmånligt för företagare, ägare och investeringar? | S, KD | svag (2p) |
|  9 | Ekonomi | Bör staten ta en mer aktiv roll i investeringar, välfärdsfinansiering och grön omställning? | V, MP | svag (2p) |
| 10 | Ekonomi | Bör tillståndsprocesser och regler förenklas för att underlätta företagande och investeringar? | C, M | svag (2p) |
| 11 | Energi | Bör Sverige bygga ny kärnkraft med statligt stöd? | L, SD, C, MP | stark (4p) |
| 12 | Energi | Bör staten ta ett större ansvar över elinfrastrukturen? | S, V | svag (2p) |
| 13 | Energi | Bör Sverige prioritera vindkraft och solkraft framför kärnkraft? | C, MP | svag (2p) |
| 14 | Energi | Bör staten ta en aktiv ägarroll i elinfrastruktur och energisystemet? | S, V | svag (2p) |
| 15 | Energi | Bör det kommunala vetot mot vindkraft behållas? | KD, MP | svag (2p) |
| 16 | EU och utrikespolitik | Bör Sverige införa euron som valuta? | SD, L | svag (2p) |
| 17 | Försvar och säkerhet | Bör Sverige lagstifta mot kärnvapen på svenskt territorium? | V, MP | svag (2p) |
| 18 | Jobb och arbetsmarknad | Bör arbetsgivaravgifter eller anställningskostnader sänkas för att öka sysselsättningen? | C, KD, L | stark (3p) |
| 19 | Jobb och arbetsmarknad | Bör arbetsrätten göras mer flexibel till förmån för arbetsgivare? | L, C | svag (2p) |
| 20 | Jobb och arbetsmarknad | Bör staten investera i välfärd och industri för att aktivt skapa fler jobb? | S, MP | svag (2p) |
| 21 | Jobb och arbetsmarknad | Bör särskilda anställningsformer med lägre trösklar användas för att få fler i arbete? | KD, L, C | stark (3p) |
| 22 | Jobb och arbetsmarknad | Bör grön industriomställning vara ett centralt verktyg för att skapa nya jobb? | S, MP | svag (2p) |
| 23 | Jämställdhet | Bör Sverige föra en feministisk utrikespolitik? | S, V | svag (2p) |
| 24 | Jämställdhet | Bör premiepensionen delas automatiskt mellan makar? | KD, L | svag (2p) |
| 25 | Jämställdhet | Bör polisen ha en särskild enhet mot tvångsäktenskap? | KD, L | svag (2p) |
| 26 | Jämställdhet | Bör hedersrelaterat våld bekämpas med särskilda rättsliga eller polisiära åtgärder? | KD, L, MP | stark (3p) |
| 27 | Jämställdhet | Bör pensionssystemet reformeras för att ge kvinnor mer jämställda pensioner? | KD, L | svag (2p) |
| 28 | Jämställdhet | Bör vården satsa särskilt på forskning och behandling kopplad till kvinnors hälsa? | M, S | svag (2p) |
| 29 | Klimat och miljö | Bör mer skyddsvärd skogsmark skyddas från avverkning? | M, MP | svag (2p) |
| 30 | Klimat och miljö | Bör skyddad mark och biologisk mångfald utökas? | M, MP | svag (2p) |
| 31 | Klimat och miljö | Bör Sverige prioritera ambitiösa klimatsatsningar även när de kräver offentliga resurser? | SD, MP, KD, L | stark (4p) |
| 32 | Klimat och miljö | Bör EU föra en ambitiös klimatpolitik med höga utsläppsmål? | M, S, L | stark (3p) |
| 33 | Lag och ordning | Bör deltagande i kriminella gäng förbjudas i lag? | M, S | svag (2p) |
| 34 | Lag och ordning | Bör socialtjänsten kunna tvinga unga i riskzonen att delta i insatser? | M, L | svag (2p) |
| 35 | Lag och ordning | Ska ansvaret för unga grova brottslingar flyttas från socialtjänsten till kriminalvården? | L, SD | svag (2p) |
| 36 | Lag och ordning | Bör socialtjänsten få fler verktyg för att förebygga ungdomskriminalitet? | M, L | svag (2p) |
| 37 | Lag och ordning | Bör straff för unga lagöverträdare skärpas och ungdomsrabatter avskaffas? | L, SD | svag (2p) |
| 38 | Lag och ordning | Bör kriminalvården prioritera rehabilitering framför hårdare straff? | V, SD | svag (2p) |
| 39 | Landsbygd | Bör Sverige öka sin livsmedelsproduktion och självförsörjningsgrad? | C, M | svag (2p) |
| 40 | Landsbygd | Bör regelbördan och byråkratin för jordbruket minskas? | SD, M | svag (2p) |
| 41 | Migration och integration | Bör rätten till uppehåll i Sverige kopplas till hårdare krav? | S, V | svag (2p) |
| 42 | Migration och integration | Bör integrationspolitiken ställa tydligare krav på svenska språket och självförsörjning? | M, KD | svag (2p) |
| 43 | Migration och integration | Bör Sverige föra en mer restriktiv asyl- och anhöriginvandringspolitik? | SD, V, MP | stark (3p) |
| 44 | Skatter | Bör skatten på drivmedel sänkas? | SD, M | svag (2p) |
| 45 | Skatter | Bör bolagsskatten sänkas för att stärka företagens konkurrenskraft? | M, C | svag (2p) |
| 46 | Skatter | Bör sparande på ISK göras skattefritt upp till ett visst belopp? | M, S | svag (2p) |
| 47 | Skatter | Bör skatterna höjas för att finansiera välfärden? | M, V | svag (2p) |
| 48 | Skatter | Bör skatterna på arbete och pension sänkas? | M, KD, L, SD, C | stark (5p) |
| 49 | Skatter | Bör kapitalinkomster och stora förmögenheter beskattas högre? | V, MP | svag (2p) |
| 50 | Skatter | Bör skattesystemet användas mer aktivt för att finansiera välfärd och utjämna ekonomiska klyftor? | M, V, MP | stark (3p) |
| 51 | Skola och utbildning | Bör yrkesutbildningar och vuxenutbildning byggas ut kraftigt? | S, KD | svag (2p) |
