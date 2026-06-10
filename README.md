# Browser Games

Two-player browser games — no installation, no dependencies. Just open an HTML file and play.

## Games

### Football
**File:** `football/index.html`

Two-player football game on a canvas field. Push the ball into the opponent's goal. Scores a celebration with confetti and the message **"LÄTT SOM EN PLÄTT"** on every goal.

| Player | Controls |
|--------|----------|
| Zlatan (red) | W A S D |
| Salomon (blue) | Arrow keys |

---

### Tic Tac Toe
**File:** `tictactoe/index.html`

Classic two-player Tic Tac Toe. Tracks wins and ties across rounds.

| Player | Symbol |
|--------|--------|
| Player 1 | X |
| Player 2 | O |

---

## How to Play

1. Clone or download this repo
2. Open any game's `index.html` directly in a browser — no server needed
3. Play!

---

## FM Face Generator

**Location:** `player-face-generator/`

A Football Manager-style fictional player portrait generator powered by AI. Describe a player and the app generates a realistic face portrait.

### Requirements

- Node.js 18 or higher

### Setup

```bash
cd player-face-generator
npm install
cp .env.example .env
# Edit .env to set IMAGE_PROVIDER and any required keys
npm run dev
```

Open http://localhost:3000 in your browser.

### Image providers

Set `IMAGE_PROVIDER` in your `.env` file to switch providers:

| Provider | Cost | Transparent background | Quality |
|---|---|---|---|
| `openai` (default) | Pay-per-use | Yes — PNG with alpha channel | High |
| `pollinations` | Free (rate-limited) | No — white background | Medium |

#### OpenAI

Set `OPENAI_API_KEY` in `.env`. Uses `gpt-image-1` at 1024×1024 with a transparent background.

#### Pollinations

No key required. Optionally set `POLLINATIONS_API_KEY` for higher rate limits. Uses the Flux model at 256×256. Backgrounds will be white, not transparent — the checkerboard pattern in the UI will be covered.

### Known limitations (Pollinations)

- No transparent background. Images are opaque (white bg) and not suitable as FM facepacks without post-processing.
- Free tier is IP-rate-limited (~a few requests per minute). If you get errors, wait a moment and retry.
- No SLA — it's a free community service and can be unavailable occasionally.
