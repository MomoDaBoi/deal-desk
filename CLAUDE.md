# Deal Desk — instructions for Claude

Satirical browser game that teaches investment banking from zero. The owner
makes idea and admin decisions; Claude writes all the code. Read this file,
then `TASKS.md`, at the start of every session. The full product brief is
`../DEAL_DESK_BRIEF.md` (one folder up). Read it when a task touches
curriculum, tone, or the two game modes.

## Session ritual (do this every time)

1. Read `TASKS.md`. It is the source of truth for project state and what to
   do next. Never start work that is not on it without adding it first.
2. Work on the first unchecked task in the current milestone unless the
   owner says otherwise.
3. When a task is done and verified (`npm test` and `npm run build` pass),
   mark it `[x]` in `TASKS.md` and add the date. **Never delete or rewrite
   completed tasks.** They are the project history and let a fresh session
   orient in one read.
4. If you discover work that needs doing, add it as a new `[ ]` line under
   the right milestone (or under "Backlog"). If you decide something the
   brief left open, log it under "Decisions" in `TASKS.md` with a date.
5. Update the "Project state" block at the top of `TASKS.md` before ending a
   session so the next one knows where things stand.

## Privacy rules (non-negotiable, the repo is PUBLIC)

The repo at github.com/MomoDaBoi/deal-desk is public. Nothing personal
about the owner may ever land in it. Every session must follow these:

- **Never commit secrets or personal data.** No API keys, tokens, `.env`
  files, email addresses, phone numbers, real names beyond the GitHub
  handle, local IP addresses, machine names, or absolute local paths
  (`C:\Users\...`) in code, docs, comments, commit messages, or TASKS.md.
  Refer to the owner as "the owner" in docs.
- **Commit identity is the GitHub noreply address**, set in this repo's
  local git config (`git config user.email` shows
  `...@users.noreply.github.com`). Never set a real email. If a commit
  ever shows a real address, stop and tell the owner before pushing.
- **The Anthropic API key exists only in the player's browser
  localStorage** (`deal-desk:settings`). It is never written to a file,
  never logged, never included in the progress export, never sent
  anywhere but `api.anthropic.com`. No code path may serialise it.
- **Game save exports are the owner's play history.** They match
  `deal-desk-save-*.json` and are gitignored. Never commit one, even as a
  test fixture; make synthetic fixtures instead.
- `.gitignore` has a "Privacy" block. Extend it when adding any new file
  type that could hold personal data. Never remove entries from it.
- GitHub secret scanning and push protection are enabled on the repo. If
  a push is rejected for a detected secret, do not bypass it; remove the
  secret and tell the owner.
- Before every push, run `git grep -n -i "@gmail\|192\.168\|C:\\\\Users"`
  (or an equivalent) on the tree and confirm it comes back empty.
- Screenshots or logs pasted into docs must be checked for the above
  before committing.

## Stack and layout

- Vite + React 19 + TypeScript, Tailwind v4 (via `@tailwindcss/vite`,
  theme tokens live in `src/index.css`), Zustand for state, Recharts for
  charts, Vitest for tests. No router: screens are a Zustand state
  (`src/store/nav.ts`).
- `src/engine/` — mission contract (`types.ts`), pure scoring
  (`scoring.ts`), pure graders (`graders.ts`). Keep this folder free of
  React and browser APIs so it stays testable.
- `src/missions/` — one file per mission exporting a `Mission`, registered
  in `src/missions/index.ts`. Adding a mission = adding a file + one line
  in the registry. Do not touch the engine to add content.
- `src/store/` — `progress.ts` (exportable save, versioned),
  `settings.ts` (API key + toggles, its own localStorage key, never
  exported), `nav.ts`.
- `src/screens/` — Ladder, RungScreen, MissionScreen (the engine loop:
  lesson → task → result → review/bonus), Settings.
- `src/components/` — small shared UI. Task widgets (e.g. `OrderTask`) go
  here, one per task kind.

## Hard rules from the brief

- **Standard mode must stay zero-AI, zero-backend, zero-cost.** Anything
  that needs the API key is gated by `useMentorMode()` and must be
  invisible when no key is present.
- The API key lives only in localStorage under `deal-desk:settings`, is
  never written into the progress export, and is only ever sent to
  `api.anthropic.com`. Before writing any API call, check current
  Anthropic docs for the browser-access header, model ids, and pricing.
- Static site only. No server, no login, no database.
- Phone first: 44px minimum tap targets, primary action in the sticky
  `BottomBar`, tap-based interactions before drag.
- Tone: banker-culture satire in verdicts and copy, but every wrong answer
  gets a real explanation. Jokes never replace the explanation.
- Colours: revenue green, cost red, debt amber, equity blue, cash teal.
  Use the theme tokens (`text-revenue`, `bg-cost/15`, ...), never raw hex
  in components. Dark theme only.
- Rungs 1–3 use fictional companies. Rungs 4–5 pull real data from SEC
  EDGAR `companyfacts` (no key). Footer carries the "not investment
  advice" line once.
- Tests only for grading logic and financial math. No UI tests.

## Scoring rules (implemented in `src/engine/scoring.ts`)

- Comp = baseComp × accuracy, plus up to 20% speed bonus on a pass when
  under par (full bonus at half par or faster).
- Accuracy under 50% is a fail. Three consecutive fails on one mission
  triggers the performance review screen.
- A rung passes at 70% of its total base comp. Perfect rung (every mission
  at full base comp) shows "bonus season" once.

## Commands

```
npm run dev        # local dev server (add --host to test on phone)
npm test           # vitest, run once
npm run build      # tsc + vite build, must pass before marking a task done
npm run preview    # serve the production build locally
```

## Adding a task kind (the one engine change that is allowed)

1. Add the task and answer shapes to the unions in `src/engine/types.ts`.
2. Add a pure grader to `src/engine/graders.ts` with tests.
3. Add a widget in `src/components/` and a `case` in `MissionScreen`'s task
   phase and submit handler.
4. Write the first mission that uses it.

## Deploy

GitHub Pages via `.github/workflows/deploy.yml` on push to `main`. The
workflow sets `BASE_PATH=/<repo>/`. On Vercel no env is needed. The repo
needs Pages enabled with source "GitHub Actions" once (owner does this).
