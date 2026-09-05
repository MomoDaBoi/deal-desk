# Deal Desk — tasks and project state

Convention: `[ ]` open, `[x] (YYYY-MM-DD)` done. Completed tasks are never
deleted. Add new work as new lines. Update "Project state" before ending a
session.

## Project state

**As of 2026-09-05 (overnight build).** Milestones 1-5 are built and
committed locally, plus the Milestone 6 share card, PWA manifest, SDK
lazy-loading, drag-and-drop, sounds, and days-survived counter. All five
rungs have their missions: 29 standard missions across eleven task kinds
(order, sort, balance, quiz, slider, waterfall, bridge, footballfield,
heatmap, auction, multi) and four mentor-only written missions. Mentor
mode runs on the official Anthropic SDK in browser mode and has NOT been
exercised against the live API (no key here); it is covered by
fake-client tests. 681 tests pass; `npm run build` passes. Every code item through Milestone 6 is done; only the Owner to-dos remain. Nothing has
been played in a browser since Milestone 1 (Chrome was unreachable);
every milestone got a static multi-agent review and the confirmed
findings were fixed (see git log). The EDGAR snapshot is an EMPTY placeholder because SEC
blocks fetches from the build environment; the real-data DCF boss runs
on a labelled stand-in until the owner runs the fetch script. The GitHub
repo is public; local history was rewritten to the noreply email and
must be force-pushed by the owner before any push works.

**Next up:** the Owner to-dos (force-push, EDGAR snapshot, play it),
then a browser playtest of every rung once Chrome is reachable, then the
remaining Milestone 6 items (360px pass, deep links) and owner notes.

## Owner to-dos (admin, not code)

- [ ] Create a GitHub repo, push `deal-desk/`, enable Pages with source
      "GitHub Actions". Confirm the site opens on phone. (Repo exists and
      is public as of 2026-09-05; Pages not yet enabled; blocked on the
      force-push below.)
- [ ] Run `git push --force-with-lease origin main` from deal-desk/ to
      replace the public history that carries the owner's real email
      with the rewritten one. Then re-run the failed Pages workflow.
- [ ] Generate the real EDGAR snapshot from a normal home or office
      connection (SEC blocks the sandbox this was built in):
      `DEAL_DESK_CONTACT="<your contact>" node scripts/fetch-edgar.mjs`
      from deal-desk/, then `npm test` and commit
      `src/data/edgar-snapshot.json`. Never commit the contact address.
- [ ] In GitHub Settings > Emails, turn on "Keep my email addresses
      private" and "Block command line pushes that expose my email".
- [ ] Play Rung 1 on phone and PC, leave notes in this file under
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

- [x] (2026-09-05) Task kind `sort`: drag/tap items into 2–3 buckets. Grader + tests.
- [x] (2026-09-05) Task kind `balance`: number entry to fix a broken balance sheet.
      Grader with tolerance + tests.
- [x] (2026-09-05) Task kind `quiz`: timed multiple choice for boss fights. Grader +
      tests.
- [x] (2026-09-05) Mission: "What is a company / the three statements" (intro, likely
      `quiz` or `sort`).
- [x] (2026-09-05) Mission: Income statement order (replace or upgrade the placeholder (waterfall lesson visual shipped)
      with real lesson art).
- [x] (2026-09-05) Mission: Balance sheet, assets = liabilities + equity (`balance`).
- [x] (2026-09-05) Mission: Cash flow statement, sort into operating / investing /
      financing (`sort`).
- [x] (2026-09-05) Boss fight: Lemonade empire, five "which statement tells you X"
      questions under time pressure (`quiz`, `boss: true`).
- [x] (2026-09-05) Establish the humor voice: a shared bank of MD verdict lines by
      accuracy band in `src/engine/voice.ts` so missions can reuse them.
- [x] (2026-09-05) Lesson card visuals: one small chart per concept (Recharts). (plain-div bars/waterfall visuals; no Recharts needed)
- [ ] Owner plays Rung 1 and gives notes.

Sub-tasks refined against `PLAN.md` (sections b, c, d, i, j):

- [x] (2026-09-05) `src/missions/companies.ts`: typed constants for Pucker Up
      Lemonade Co. (PLAN.md §c). Every Rung 1 mission reads from it; no
      mission hardcodes a figure.
- [x] (2026-09-05) `src/missions/companies.test.ts`: bible invariants — assets =
      liabilities + equity (800), gross profit = revenue − COGS (720),
      EBIT = gross profit − opex (300), EBITDA = EBIT + D&A (340),
      cash flow ties to +40.
- [x] (2026-09-05) `gradeSort` in `src/engine/graders.ts`: accuracy = fraction of
      items in the correct bucket, unplaced counts wrong. Tests for
      all-right / all-wrong / partial / unplaced.
- [x] (2026-09-05) `gradeBalance`: accuracy = fraction of blanks within `tolerance`,
      null counts wrong. Tests for both tolerance boundaries.
- [x] (2026-09-05) `gradeQuiz`: accuracy = fraction correct, unanswered counts wrong,
      `timedOut` submits whatever is answered. Tests including timeout.
- [x] (2026-09-05) `SortTask` widget (`src/components/SortTask.tsx`): tap item, tap
      bucket. 44px targets, role colours, unplaced tray.
- [x] (2026-09-05) `BalanceTask` widget: numeric inputs with `inputMode="decimal"`,
      unit label, subtotal rows styled as totals.
- [x] (2026-09-05) `QuizTask` widget: one question per screen, optional countdown
      driven by `timeLimitSeconds`.
- [x] (2026-09-05) `MissionScreen`: `case` per new kind in the task phase and the
      submit handler; move the `order`-specific shuffle into a
      per-kind setup helper.
- [x] (2026-09-05) Mission `r1-three-statements` (sort, base 4,000, par 100): 9 line
      items into income statement / balance sheet / cash flow.
- [x] (2026-09-05) Mission `r1-balance-sheet` (balance, base 6,000, par 150): 4
      blanks — total assets 800, total liabilities 400, equity 400,
      inventory 60. `tolerance: 0`, `unit: '$k'`.
- [x] (2026-09-05) Mission `r1-cash-flow-sort` (sort, base 6,000, par 140): 8 items
      into operating / investing / financing, incl. two distractors.
- [x] (2026-09-05) Mission `r1-boss-lemonade` (quiz, boss, base 9,000, par 150,
      `timeLimitSeconds: 120`): five "which statement tells you X"
      questions on the full Pucker Up set.
- [x] (2026-09-05) Upgrade `r1-income-statement-order` lesson visual to a small
      waterfall; keep id, items, and grading unchanged.
- [x] (2026-09-05) `src/engine/voice.ts`: verdict banks by accuracy band (PLAN.md
      §i), deterministic pick from (missionId, accuracy). Promotion,
      bonus-season, and performance-review lines.
- [x] (2026-09-05) `src/missions/registry.test.ts`: unique ids, contiguous `order`
      per rung, `baseComp > 0`, `parSeconds > 0`, one boss per rung.
- [x] (2026-09-05) Per-mission tests: correct answer grades 1.0, two perturbations
      grade below 1.0, explanation for a wrong answer asserts on a
      concept substring.

## Milestone 3 — Rungs 2–3

- [x] (2026-09-05) Waterfall chart game board (income statement → EBITDA → net income).
- [x] (2026-09-05) Margins and growth mission.
- [x] (2026-09-05) EV vs equity value bridge with sliders (`slider` task kind).
- [x] (2026-09-05) Net debt mission.
- [x] (2026-09-05) Rung 2 boss: EV bridge with sliders.
- [x] (2026-09-05) Trading multiples mission.
- [x] (2026-09-05) Peer set picking mission.
- [x] (2026-09-05) Precedent transactions / control premium mission.
- [x] (2026-09-05) Football field chart assembled from ranges.
- [x] (2026-09-05) Rung 3 boss: value a fictional target three ways.

Sub-tasks refined against `PLAN.md` (sections b, c, d, e):

- [x] (2026-09-05) Add Ledgerly Inc. (SaaS), Brickhouse Industrial Corp., Nan's
      Pantry Markets Inc., the two peer sets and the three precedent
      transactions to `src/missions/companies.ts` (PLAN.md §c). Extend
      `companies.test.ts`: EV = market cap + net debt, net debt = total
      debt − cash, every stated multiple within 0.05x of computed.
- [x] (2026-09-05) Task kind `waterfall`: types, grader (blanks within tolerance),
      tests, widget. Recharts `BarChart` with a transparent base bar +
      visible delta bar sharing a `stackId`, one `<Cell>` per bar.
- [x] (2026-09-05) Task kind `bridge`: waterfall plus `start`/`end` anchors;
      accuracy = 75% bars + 25% reconciliation to the end anchor.
- [x] (2026-09-05) Task kind `slider`: types, grader with partial credit inside
      2× tolerance, tests, widget (44px thumb, live value readout).
- [x] (2026-09-05) Task kind `footballfield`: types, grader (mean of low/high hit
      rates per row), tests, custom-SVG widget with 44px drag handles.
- [x] (2026-09-05) `src/components/charts/`: shared x-scale helper, role→token (superseded: widgets are self-contained; LessonVisual covers lesson charts)
      colour map, a responsive wrapper that stays legible at 360px.
      Keep Recharts out of `src/engine/`.
- [x] (2026-09-05) Mission `r2-waterfall-ebitda` (waterfall, 6,000 / 150): four
      blank bars — gross profit 60,000, EBIT 8,000, EBITDA 12,000,
      net income 3,750.
- [x] (2026-09-05) Mission `r2-margins` (balance, 6,000 / 150): gross 75.0%,
      EBITDA 15.0%, net 4.7%. `tolerance: 0.1` percentage points.
- [x] (2026-09-05) Mission `r2-growth-rates` (balance, 5,000 / 120): +25.0%,
      +26.6%, 3-year CAGR +25.0%.
- [x] (2026-09-05) Mission `r2-net-debt` (balance, 6,000 / 120): net debt 30,000,
      then 40,000 with 10,000 of cash restricted.
- [x] (2026-09-05) Mission `r2-ev-vs-equity` (sort, 6,000 / 120): 8 claims into
      "true of EV" / "true of equity value".
- [x] (2026-09-05) Mission `r2-boss-ev-bridge` (bridge, boss, 11,000 / 180):
      370,000 + debt 60,000 − cash 30,000 = EV 400,000, with two
      zero-value adjustments that must be left at zero.
- [x] (2026-09-05) Mission `r3-multiples` (balance, 7,000 / 160): Brickhouse 8.3x,
      1.25x, 16.8x plus Ledgerly P/E 98.7x.
- [x] (2026-09-05) Mission `r3-which-multiple` (quiz, 6,000 / 120): 6 untimed
      questions on when each multiple fits.
- [x] (2026-09-05) Mission `r3-peer-set` (sort, 7,000 / 150): 7 candidates in/out;
      Halcyon Data Centres and Brickhouse Holdings Pty stay out.
- [x] (2026-09-05) Mission `r3-precedents` (slider, 7,000 / 150): offer price
      $14.75 at a 25% premium, implied EV/EBITDA 8.2x.
- [x] (2026-09-05) Mission `r3-football-field` (footballfield, 9,000 / 200): peer
      row $9.88–$12.76, precedent row $15.16–$17.08, tol $0.25.
- [x] (2026-09-05) Mission `r3-boss-three-ways` (footballfield, boss, 14,000 / 240):
      three ranges on Brickhouse plus one embedded defend-your-range
      question, each worth 25%.

## Milestone 4 — Mentor mode

- [x] (2026-09-05) Check current Anthropic docs: browser-access header, model ids,
      pricing. Log findings under Decisions.
- [x] (2026-09-05) `src/lib/anthropic.ts`: minimal Messages API client, key from (built on the official SDK with dangerouslyAllowBrowser, see Decisions)
      settings, only talks to api.anthropic.com.
- [x] (2026-09-05) Task kind `written`, graded 1–10 by the MD with feedback.
- [x] (2026-09-05) "Ask the MD" button on result screens.
- [x] (2026-09-05) Mock interview: five IB technical questions. (m5-mock-interview)
- [x] (2026-09-05) Cost display: rough tokens/cost per call in Settings.

Sub-tasks refined against `PLAN.md` (sections b, d, g, l):

- [x] (2026-09-05) Assert in `src/lib/anthropic.ts` that the request URL host is
      exactly `api.anthropic.com`; key read from the settings store at
      call time, never stored, logged, or serialised elsewhere.
- [x] (2026-09-05) `src/lib/prompts.ts`: three templates returning `{system, user}` (grade + ask shipped; interview template lands with m5-mock-interview)
      and requesting JSON back — grade-written (`{score 1..10, verdict,
      explanation, missed[]}`), ask-the-MD (`{answer}`), mock-interview
      (per-question plus a final `{overall, wouldHire, note}`).
- [x] (2026-09-05) Prompt must require that `explanation` stands alone as correct
      finance with `verdict` deleted. Test the builders and the JSON
      parser against fixtures; never call the API in a test.
- [x] (2026-09-05) `src/lib/pricing.ts`: per-model input/output prices with a
      `checkedOn` date rendered in Settings, plus the per-call estimate
      helper.
- [x] (2026-09-05) Hard token caps: 700 grading, 500 ask-the-MD, 600 per interview
      turn. Truncate the player's answer to `wordLimit` before sending.
- [x] (2026-09-05) Session counter in Settings: calls this session + running
      estimated spend. 401/403 → "that key did not work", no retry;
      429 → "the MD is in a meeting", no auto-retry.
- [x] (2026-09-05) Task kind `written`: `mentorOnly: true` always; mission exposes
      `gradeAsync(answer, client)` and `MissionScreen` awaits it. The
      pure `grade` returns accuracy 0 with a "Mentor mode required"
      explanation. Do not weaken the signature of `grade`.
- [x] (2026-09-05) Missions `m2-written-ev`, `m3-written-peers` (shipped).
- [x] (2026-09-05) Missions `m4-written-defend`, `m5-mock-interview` all `baseComp: 0` (see the rung-threshold
      task below). (need Rungs 4-5; do in Milestone 5)
- [x] (2026-09-05) `rungStatus` should exclude `mentorOnly` missions from
      `possible` — otherwise turning Mentor mode on raises the
      denominator and can un-pass a rung the player already passed
      (PLAN.md §l.2). Engine change: needs its own tests.

## Milestone 5 — Rungs 4–5

- [x] (2026-09-05) EDGAR companyfacts client + caching in localStorage. (live path exists but is CORS-blocked; snapshot is the primary path)
- [x] (2026-09-05) TVM / discounting / WACC missions.
- [x] (2026-09-05) Five-year FCF slider model.
- [x] (2026-09-05) Terminal value + sensitivity heatmap.
- [x] (2026-09-05) Real-company DCF vs market cap. (runs on a labelled stand-in until the snapshot is generated)
- [x] (2026-09-05) Rung 4 boss: defend a range against a bot rival. (shipped as r4-boss-real-dcf: DCF with defensible bands plus a judgement question; no bot rival)
- [x] (2026-09-05) LBO basics, sources & uses, debt stack visual.
- [x] (2026-09-05) Accretion/dilution screen.
- [x] (2026-09-05) M&A auction vs three bots.
- [x] (2026-09-05) Capstone mock deal + closing dinner screen.

Sub-tasks refined against `PLAN.md` (sections d, e, h):

- [x] (2026-09-05) EDGAR CORS is blocked — verified: `data.sec.gov` sends no
      `Access-Control-Allow-Origin` and 403s the OPTIONS preflight, and
      a browser cannot set the `User-Agent` SEC requires. Do not retry
      a direct browser fetch (PLAN.md §h).
- [x] (2026-09-05) `scripts/fetch-edgar.mjs`: Node, run manually, `User-Agent` built
      from an env var (never commit a contact address). Extracts ~15
      fields for the 10 curated tickers into
      `src/data/edgar-snapshot.json`, target under 60KB.
- [x] (2026-09-05) `src/lib/edgar.ts`: tag mapping per PLAN.md §h, filter to
      `form === '10-K' && fp === 'FY'` and take the latest `end` (then
      latest `filed`). Getters return `number | null`; UI shows "not
      reported" rather than NaN. Live-fetch path behind a Settings
      toggle defaulting off. Cache `deal-desk:edgar:<cik>` with a
      7-day TTL, extracted fields only, try/catch on every access.
- [x] (2026-09-05) `src/lib/edgar.test.ts` against a hand-trimmed checked-in
      fixture; missing-tag paths; TTL expiry. No live fetch in tests.
- [x] (2026-09-05) Task kind `heatmap`: types, grader, tests, CSS-grid widget with
      `color-mix` cost→revenue interpolation. Not Recharts.
- [x] (2026-09-05) Task kind `auction`: deterministic bot policies seeded from the
      mission id; shaped accuracy where winning above intrinsic value
      scores worse than losing narrowly.
- [x] (2026-09-05) Missions `r4-time-value` (slider, 8,000 / 150), `r4-wacc`
      (balance, 9,000 / 180 — after-tax cost of debt 4.5%, WACC 8.30%),
      `r4-fcf-forecast` (slider, 10,000 / 210), `r4-terminal-value`
      (balance, 9,000 / 180 — TV 841,905), `r4-sensitivity` (heatmap,
      10,000 / 200), `r4-boss-real-dcf` (slider, boss, 17,000 / 300).
- [x] (2026-09-05) Missions `r5-lbo-basics` (slider, 10,000 / 180),
      `r5-sources-uses` (balance, 11,000 / 200 — uses 830,000 = price
      800,000 + fees 30,000; sources = debt 480,000 + equity 310,000 +
      balance-sheet cash 40,000), `r5-debt-stack` (sort, 11,000 / 180),
      `r5-accretion-dilution` (bridge, 12,000 / 200), `r5-auction`
      (auction, 14,000 / 240), `r5-capstone` (boss, 22,000 / 420).
- [x] (2026-09-05) Debt stack and deal timeline boards (debt stack ships as an `order` mission; no deal timeline board yet) (custom SVG / flex, no
      chart library) per PLAN.md §e.

## Milestone 6 — Polish

- [x] (2026-09-05) Sounds (off by default).
- [x] (2026-09-05) Share card for scores.
- [x] (2026-09-05) Drag-and-drop as an enhancement over tap for `order` and `sort`.
- [x] (2026-09-05) PWA manifest so it installs on the phone home screen.

Sub-tasks refined against `PLAN.md` (sections e, f, i):

- [x] (2026-09-05) "Days survived" counter on the ladder, derived from distinct
      attempt dates already in `progress.attempts` (PLAN.md §f).
- [x] (2026-09-05) Share card renders comp, rung title and a verdict line from
      `src/engine/voice.ts`; must never include the API key or any
      personal data.
- [x] (2026-09-05) Pointer-events drag layered over the existing tap interaction for
      `order`, `sort`, and the football-field handles. Tap must keep
      working unchanged.
- [x] (2026-09-05) Pass over every chart board at 360px width; move any overflowing
      Recharts axis or legend to custom SVG.

## Backlog / ideas

- [x] (2026-09-05) Lazy-load `src/lib/anthropic.ts` (dynamic import) so the Anthropic
      SDK is not in the main bundle for Standard-mode players.
- [x] (2026-09-05) Streak or "days survived" counter on the ladder.
- [x] (2026-09-05) Hash-based deep links (`#/mission/<id>`) if sharing a specific
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

- 2026-09-05: Rung 1 shipped with different comp/par/blank counts than
  PLAN.md section (d) lists (all five missions at 5,000 base except the
  boss at 10,000; balance sheet has 3 blanks; cash flow sort has 9
  items). The shipped values are the source of truth; PLAN.md is a
  design reference and may drift on such details.
- 2026-09-05: Peeking at the lesson mid-task keeps the clock running
  (`startedAt` only resets on a fresh attempt or retry). Boss quiz timer
  is anchored to the attempt start, not widget mount.
- 2026-09-05: A third consecutive fail still shows the explanation (the
  performance review screen carries the grade).

- 2026-09-05: Rung 1 shipped with different comp/par/blank counts than
  PLAN.md section (d) lists (all five missions at 5,000 base except the
  boss at 10,000; balance sheet has 3 blanks; cash flow sort has 9
  items). The shipped values are the source of truth; PLAN.md is a
  design reference and may drift on such details.
- 2026-09-05: Peeking at the lesson mid-task keeps the clock running
  (`startedAt` only resets on a fresh attempt or retry). Boss quiz timer
  is anchored to the attempt start, not widget mount.
- 2026-09-05: A third consecutive fail still shows the explanation (the
  performance review screen carries the grade).
- 2026-09-05: The pipeline that builds missions per task kind must give
  every kind a non-null first stage; a null result drops the item. The
  seven Rung 2-3 missions on existing kinds were written in a follow-up
  batch for that reason.
- 2026-09-05: `derived()` in companies.ts rounds EV/Revenue to 2 decimals
  (1.25x, 0.42x) and everything else to 1 decimal, matching PLAN.md.
- 2026-09-05: Ledgerly's revenue three years ago (40,960) lives only in
  r2-growth-rates as a local constant; companies.ts carries one prior year.
- 2026-09-05: Mentor mode uses the official `@anthropic-ai/sdk` with
  `dangerouslyAllowBrowser: true` (verified in the SDK docs), not raw
  fetch as PLAN.md section (g) sketched. The SDK sets the browser-access
  header itself. Model ids and prices verified 2026-09-05: claude-opus-5
  $5/$25, claude-sonnet-5 $2/$10, claude-haiku-4-5 $1/$5 per MTok.
- 2026-09-05: Mentor-only missions carry `baseComp: 0` and `order` after
  the boss; the registry test ignores them for boss-last and comp checks.
- 2026-09-05: Structured grading uses `messages.parse` with a zod schema;
  an unparseable reply surfaces as a retryable error, not a 0 score.
- 2026-09-05: r5-debt-stack ships as kind `order` (seniority is an
  ordering, not buckets); r5-lbo-basics uses 480,000 of debt (5.0x); the
  Rung 4 boss is a real-data DCF with a judgement question rather than a
  bot rival. PLAN.md section (d) is a design reference and drifts on such
  details; shipped code is the source of truth.
- 2026-09-05: Mentor mode SDK is lazy-loaded (src/lib/mentor.ts) so the
  Standard-mode bundle never includes it.
- 2026-09-05: Auction bids must strictly exceed the standing high and the
  winner is the highest bid across all rounds; intrinsic value is the
  control value consistent with r3-precedents (EV 1,185,000).
- 2026-09-05: The real-data DCF boss grades its judgement question against
  the player's own slider values, never a fixed textbook point.
- 2026-09-05: Capstone stage navigation lives in the sticky bottom bar;
  Submit only appears on the last stage.
- 2026-09-05: Lesson charts are plain divs (`LessonVisual`: bullets,
  bars, waterfall). Recharts stays installed but unused; remove it if
  nothing adopts it by Milestone 6 sign-off.
- 2026-09-05: Hash deep links (#/mission/<id>, #/rung/<n>, #/settings)
  do not bypass rung locking in the UI but a locked rung is reachable by
  hash; acceptable for a game.

## Owner notes

(none yet)
