# Deal Desk

A satirical browser game that teaches investment banking from zero. Climb
from Intern to MD by doing mini-deals, not quizzes.

Standard mode is a static site with no AI, no backend, no cost. Mentor mode
(optional) uses your own Anthropic API key, stored only in your browser.

## Run locally

```
npm install
npm run dev          # http://localhost:5173
npm run dev -- --host   # also reachable from your phone on the same Wi-Fi
```

## Test and build

```
npm test
npm run build
npm run preview
```

## Deploy

Push to `main` on GitHub with Pages enabled (source: GitHub Actions). The
workflow in `.github/workflows/deploy.yml` builds, tests, and publishes.

Working notes for Claude sessions live in `CLAUDE.md` and `TASKS.md`.

Not investment advice.
