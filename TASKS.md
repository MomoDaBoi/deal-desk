# Deal Desk — tasks and project state

Convention: `[ ]` open, `[x] (YYYY-MM-DD)` done. Completed tasks are never
deleted. Add new work as new lines. Update "Project state" before ending a
session.

## Project state

**As of 2026-09-05.** Milestone 1 (skeleton) is built and runs locally.
Not yet pushed to GitHub or deployed; the owner needs to create the repo
and enable Pages (see "Owner to-dos"). One placeholder mission exists
(`r1-income-statement-order`). No Mentor-mode API calls exist yet; the
key slot and gating logic are in place. 39 tests pass. `npm run build`
passes.

**Next up:** Milestone 2, Rung 1 content. Start by adding the `sort`
(bucket) and `balance` (number entry) task kinds, then the Rung 1
missions in curriculum order, then the boss fight (needs a `quiz` kind
with a timer).

## Owner to-dos (admin, not code)

- [ ] Create a GitHub repo, push `deal-desk/`, enable Pages with source
      "GitHub Actions". Confirm the site opens on phone.
- [ ] Play Milestone 1 on phone and PC, leave notes in this file under
      "Owner notes".

## Milestone 1 — Skeleton

- [x] (2026-09-05) Scaffold Vite + React + TS, Tailwind v4, Zustand,
      Recharts, Vitest.
- [x] (2026-09-05) Engine types: `Mission`, `Lesson`, `Task` union
      (`order` only so far), `GradeResult`.
- [x] (2026-09-05) Pure scoring: comp, speed bonus, rung pass/perfect.
- [x] (2026-09-05) Pure grader for `order` tasks + seeded shuffle.
- [x] (2026-09-05) Progress store with localStorage persist, versioned
      export/import JSON with validation, reset.
- [x] (2026-09-05) Settings store: API key (own key, never exported),
      mentor toggle, sound toggle. `useMentorMode()` gate.
- [x] (2026-09-05) Screens: Ladder (5 rungs, lock/unlock, comp bars,
      footer disclaimer), RungScreen, MissionScreen (lesson → task →
      result → performance review / bonus season), Settings.
- [x] (2026-09-05) `OrderTask` widget: tap-to-swap + up/down arrows,
      thumb-sized.
- [x] (2026-09-05) Placeholder mission: income statement ordering with
      per-item explanations.
- [x] (2026-09-05) Vitest suite for scoring, graders, progress parsing,
      placeholder mission (39 tests).
- [x] (2026-09-05) GitHub Pages workflow (`.github/workflows/deploy.yml`),
      `BASE_PATH`-aware Vite config.
- [x] (2026-09-05) `CLAUDE.md`, `TASKS.md`, `README.md`.
- [ ] Deployed and opened on the owner's phone (blocked on owner to-dos).

## Milestone 2 — Rung 1 complete

- [ ] Task kind `sort`: drag/tap items into 2–3 buckets. Grader + tests.
- [ ] Task kind `balance`: number entry to fix a broken balance sheet.
      Grader with tolerance + tests.
- [ ] Task kind `quiz`: timed multiple choice for boss fights. Grader +
      tests.
- [ ] Mission: "What is a company / the three statements" (intro, likely
      `quiz` or `sort`).
- [ ] Mission: Income statement order (replace or upgrade the placeholder
      with real lesson art).
- [ ] Mission: Balance sheet, assets = liabilities + equity (`balance`).
- [ ] Mission: Cash flow statement, sort into operating / investing /
      financing (`sort`).
- [ ] Boss fight: Lemonade empire, five "which statement tells you X"
      questions under time pressure (`quiz`, `boss: true`).
- [ ] Establish the humor voice: a shared bank of MD verdict lines by
      accuracy band in `src/engine/voice.ts` so missions can reuse them.
- [ ] Lesson card visuals: one small chart per concept (Recharts).
- [ ] Owner plays Rung 1 and gives notes.

## Milestone 3 — Rungs 2–3

- [ ] Waterfall chart game board (income statement → EBITDA → net income).
- [ ] Margins and growth mission.
- [ ] EV vs equity value bridge with sliders (`slider` task kind).
- [ ] Net debt mission.
- [ ] Rung 2 boss: EV bridge with sliders.
- [ ] Trading multiples mission.
- [ ] Peer set picking mission.
- [ ] Precedent transactions / control premium mission.
- [ ] Football field chart assembled from ranges.
- [ ] Rung 3 boss: value a fictional target three ways.

## Milestone 4 — Mentor mode

- [ ] Check current Anthropic docs: browser-access header, model ids,
      pricing. Log findings under Decisions.
- [ ] `src/lib/anthropic.ts`: minimal Messages API client, key from
      settings, only talks to api.anthropic.com.
- [ ] Task kind `written`, graded 1–10 by the MD with feedback.
- [ ] "Ask the MD" button on result screens.
- [ ] Mock interview: five IB technical questions.
- [ ] Cost display: rough tokens/cost per call in Settings.

## Milestone 5 — Rungs 4–5

- [ ] EDGAR companyfacts client + caching in localStorage.
- [ ] TVM / discounting / WACC missions.
- [ ] Five-year FCF slider model.
- [ ] Terminal value + sensitivity heatmap.
- [ ] Real-company DCF vs market cap.
- [ ] Rung 4 boss: defend a range against a bot rival.
- [ ] LBO basics, sources & uses, debt stack visual.
- [ ] Accretion/dilution screen.
- [ ] M&A auction vs three bots.
- [ ] Capstone mock deal + closing dinner screen.

## Milestone 6 — Polish

- [ ] Sounds (off by default).
- [ ] Share card for scores.
- [ ] Drag-and-drop as an enhancement over tap for `order` and `sort`.
- [ ] PWA manifest so it installs on the phone home screen.

## Backlog / ideas

- [ ] Streak or "days survived" counter on the ladder.
- [ ] Hash-based deep links (`#/mission/<id>`) if sharing a specific
      mission ever matters.

## Decisions (brief left these open)

- 2026-09-05: No router. Screens are Zustand state. GitHub Pages does not
  rewrite paths and the app has four screens.
- 2026-09-05: Deploy target is GitHub Pages via Actions. `BASE_PATH` env
  makes the same build work on Vercel.
- 2026-09-05: Save format is versioned JSON under `deal-desk:progress`.
  Settings (incl. API key) under `deal-desk:settings`, never exported.
- 2026-09-05: Scoring: comp = base × accuracy, +20% max speed bonus on a
  pass under par (full at half par). Fail < 50%. Three consecutive fails
  = performance review. Rung passes at 70% of base comp. Perfect rung =
  bonus season, shown once.
- 2026-09-05: Reordering is tap-to-swap plus arrows first; drag is a
  Milestone 6 enhancement. Tap is more reliable with a thumb.
- 2026-09-05: Dark theme only, hardcoded.
- 2026-09-05: Tests excluded from `tsc -b` (tsconfig.app.json); Vitest
  handles them.

## Owner notes

(none yet)
