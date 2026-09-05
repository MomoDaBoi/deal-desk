# Deal Desk

A satirical browser game that teaches investment banking from zero. Climb
from Intern to MD by doing mini-deals, not quizzes: five rungs, 29
missions, eleven kinds of hands-on task (ordering, sorting, filling in a
balance sheet, timed quizzes, sliders, waterfalls, EV bridges, football
fields, sensitivity heatmaps, an auction against bots, and a capstone deal).

Standard mode is a static site with no AI, no backend, no cost. Mentor mode
(optional) uses your own Anthropic API key, stored only in your browser, to
grade written answers and let you "Ask the MD".

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
