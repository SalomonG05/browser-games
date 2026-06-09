# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the games

No build step. Open any `index.html` directly in a browser:

```bash
start football/index.html
start tictactoe/index.html
```

There are no dependencies, no package manager, no bundler, and no test suite.

## Architecture

Each game is a **single self-contained HTML file** (`index.html` inside its folder). All CSS and JavaScript live inline in that one file — no external files are referenced.

### football/index.html

Canvas-based game using a `requestAnimationFrame` loop. Key globals:

- `F` — field geometry constants (position, size, center, penalty box dims)
- `G` — goal constants (mouth height/y-position, depth)
- `p1` / `p2` — player state objects (position, radius, speed, score, start coords)
- `ball` — ball state (position, velocity, friction)
- `keys` — flat map of currently held keyboard keys, polled each frame
- `state` — `'playing'` or `'goal'` (freezes physics during celebration)

Update order each frame: `updatePlayers → resolveCollision (×2) → updateBall → checkGoal`

Goals are drawn as orange crescent shapes using two same-direction arcs with `ctx.fill('evenodd')` — the inner arc cuts a hole in the outer D-shape to produce the peel effect.

### tictactoe/index.html

DOM-based (no canvas). State is a 9-element array (`board`) plus a `current` player string. All rendering is done by setting `.textContent` and `.className` on `.cell` div elements. Win detection iterates the `WINS` constant (8 line combinations).

## Git workflow

Push to GitHub (`SalomonG05/browser-games`) after every meaningful change:

```bash
git add <file>
git commit -m "Descriptive message"
git push
```
