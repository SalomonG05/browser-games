# CLAUDE.md — legal-ai-extension

Chrome Extension (Manifest V3) för juridisk AI-rättning och granskning av juridiska texter.

## Köra / ladda in extensionen

Inget byggesteg. Ladda in direkt i Chrome:

1. Öppna `chrome://extensions`
2. Aktivera **Utvecklarläge** (toggle uppe till höger)
3. Klicka **Ladda okomprimerat** och välj mappen `legal-ai-extension/`
4. Klicka på extension-ikonen i verktygsfältet för att öppna sidopanelen

## Arkitektur

Alla filer är platta i `legal-ai-extension/` — inga undermappar.

### Filer

| Fil | Roll |
|-----|------|
| `manifest.json` | MV3-konfiguration. Permissions: `sidePanel`, `storage`, `tabs` |
| `background.js` | Service worker — öppnar sidopanelen när användaren klickar på ikonen |
| `content.js` | Injiceras på alla sidor. Svarar på `GET_SELECTION` och `GET_PAGE_TEXT` via `chrome.runtime.onMessage` |
| `sidepanel.html` | Huvud-UI. Laddar `demo-data.js` och `sidepanel.js` |
| `sidepanel.css` | All styling — dark theme, cards, pills, modal, matrix, source chips |
| `sidepanel.js` | All logik. Se sektioner nedan |
| `demo-data.js` | `SOURCES`-register + `getDemoResponse(area, mode)` med hårdkodad demodata |

### sidepanel.js — nyckelflöde

1. **Textinmatning** — användaren klistrar in text i textarea, eller hämtar via `fetchFromPage()` som skickar meddelande till `content.js`
2. **Formulär** — rättsområde-pills (`selectedArea`) + lägesväxlare (`selectedMode`)
3. **Submit** → `simulateProgress()` (animerad progressbar) → `getDemoResponse()` (byt ut mot riktigt API-anrop här) → `renderResult()`
4. **Rendering** — `renderGradeCard()` + sektion-builders: `appendSourceListSection`, `appendMatrixSection`, `appendTextSection`, `appendSourcesUsedSection`
5. **Modal** — källchips och källkort öppnar en bottom-sheet med utdrag och demolänk

### demo-data.js — datastruktur

```js
SOURCES = { 'source-id': { id, label, type, demoUrl, excerpt } }
// type: 'statute' | 'case' | 'forarbete' | 'doktrin' | 'svarsmall' | 'qura'

getDemoResponse(area, mode) // returnerar:
// { grade, score, overallAssessment, strengths[], weaknesses[],
//   missingStatutes[], missingCases[], missingDoctrine[],
//   assessmentMatrix[], improvedDisposition, modelAnswer, sourcesUsed[] }
```

## Rättsområden och lägen

- **Rättsområden:** `avtalsrätt`, `associationsrätt`, `statsrätt`, `straffrätt`
- **Lägen:** `tentarättning` (betyg VG/G/U + poäng), `vanligjuridiskgranskning` (ingen betygsättning)

## Koppla in riktigt AI-anrop

I `sidepanel.js` rad ~193:

```js
// ── Replace getDemoResponse() with a real API call in production ──
const result = getDemoResponse(selectedArea, selectedMode);
// ─────────────────────────────────────────────────────────────────
```

Ersätt `getDemoResponse(...)` med ett fetch-anrop till Anthropic API (eller ett eget backend). Skicka `selectedText`, `selectedArea` och `selectedMode` som input.
