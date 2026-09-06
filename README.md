# Deal Desk

A satirical browser game that teaches investment banking from zero. Climb
from Intern to MD by doing mini-deals, not quizzes: five rungs, 29
missions, eleven kinds of hands-on task (ordering, sorting, filling in a
balance sheet, timed quizzes, sliders, waterfalls, EV bridges, football
fields, sensitivity heatmaps, an auction against bots, and a capstone deal).

Standard mode is a static site with no AI, no backend, no cost. Mentor mode
(optional) uses your own Anthropic API key, stored only in your browser, to
grade written answers and let you "Ask the MD".

The game is a 16-bit pixel office in the spirit of Game Dev Story: you walk
a chibi banker around five floors (intern bullpen up to the executive
floor), tap a desk to sit down for a mission, and get graded by a talking
MD in an RPG dialog box. Every sprite is hand-drawn as a text grid in
`src/pixel/sprites/` and rendered to canvas at runtime; there are no image
files. Music and sound effects are synthesized with the Web Audio API and
are off by default.

Controls: tap the title card to clock in, then tap or click a desk to walk
to it; arrow keys or WASD nudge on a keyboard; the Floor button (or the
sidebar on a wide screen) lists each floor's missions if you would rather
not walk. Tap a coworker for gossip. `#/sprites` shows every sprite in the
game.

## Run locally

```
npm install
npm run dev             # http://localhost:5173
npm run dev -- --host   # also reachable from your phone on the same Wi-Fi
```

## Test and build

```
npm test
npm run build
npm run preview
```

## Real company data (Rung 4)

The real-data DCF boss reads `src/data/edgar-snapshot.json`, a snapshot of
SEC EDGAR company facts for ten large filers. The repo ships an empty
placeholder (the game falls back to a labelled stand-in company). To fill
it, run this from a normal internet connection, with a contact string the
SEC can reach you at, and never commit that contact string:

```
DEAL_DESK_CONTACT="you@example.com" node scripts/fetch-edgar.mjs
```

## Deploy

Push to `main` on GitHub with Pages enabled (source: GitHub Actions). The
workflow in `.github/workflows/deploy.yml` builds, tests, and publishes.

Working notes for Claude sessions live in `CLAUDE.md`, `TASKS.md`, and
`PLAN.md`.

Not investment advice.
