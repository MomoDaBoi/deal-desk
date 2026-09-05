# Deal Desk — project plan

The definitive plan. A future session should be able to read `CLAUDE.md`,
`TASKS.md`, and this file, and then build any remaining part of the game
without re-deriving anything. Everything here is a decision, not a
suggestion, unless it is filed under "Open questions".

Written for a strong engineer who knows no finance. Every finance term is
defined the first time it appears.

---

## (a) Vision and design principles

Deal Desk teaches investment banking from zero by making the player do the
work, not read about it. The player climbs Intern → Analyst → Associate →
VP → MD by completing missions. A mission is a hands-on mini-task with a
lesson card in front of it and an explanation behind it.

Principles, in priority order:

1. **A mission is 3–5 minutes.** One concept, one task, one explanation. A
   rung is 5–6 missions, so a rung is a 20-minute sit-down and a single
   mission is a phone-in-line bite. If a task design cannot be finished in
   five minutes on a phone, split it into two missions.
2. **Accuracy over speed.** Comp (the score, denominated in fake dollars) is
   `baseComp × accuracy`. Speed only ever adds a bonus of up to 20%, and only
   on a pass. A player who is slow and right always out-earns a player who is
   fast and wrong. This is deliberate: banking rewards being right.
3. **Satire never replaces the explanation.** Every `GradeResult` has a
   `verdict` (the joke, in the voice of a managing director who replies "pls
   fix" at 2am) and a separate `explanation` (the actual finance). The
   explanation is mandatory and must name the specific thing the player got
   wrong, not just restate the rule. See section (i).
4. **Standard mode is the product.** Standard mode is zero-AI, zero-backend,
   zero-cost, and shareable. Everything is graded locally by pure functions.
   Mentor mode is a personal extra: it needs the player's own Anthropic API
   key, unlocks written-answer missions and an "Ask the MD" button, and is
   completely invisible when no key is present (`useMentorMode()`).
5. **Phone first.** 44px minimum tap targets (`min-h-11`), primary action in
   the sticky `BottomBar`, tap-based interactions. Drag-and-drop is a
   Milestone 6 enhancement layered on top of tap, never a replacement.
6. **Every concept gets one chart, and the chart is the game board.** The
   player does not look at a waterfall chart; the player builds it. See
   section (e).

---

## (b) Architecture

### The Mission contract

`src/engine/types.ts` defines it. One file per mission in `src/missions/`,
default-exporting a `Mission`, registered with one line in
`src/missions/index.ts`. **Adding content never touches the engine.**

```ts
interface Mission {
  id: string           // slug, unique, e.g. 'r1-balance-sheet'
  rung: 1|2|3|4|5
  order: number        // position within the rung, 1-based
  title: string
  tagline: string      // one flavour line on the ladder
  baseComp: number     // fake dollars for a perfect, unhurried run
  parSeconds: number   // finishing under par earns the speed bonus
  boss?: boolean
  mentorOnly?: boolean // hidden unless an API key is present
  lesson: Lesson       // one visual, under 120 words
  task: Task           // discriminated union on `kind`
  grade: (answer: Answer) => GradeResult
}
```

`GradeResult` is `{ accuracy: 0..1, verdict, explanation, details? }`.
`details` is `{ id, ok, note? }[]` and drives the per-item marking on the
result screen.

Mission `grade` functions must be pure and must not import React or touch
`window`. They call a shared grader from `src/engine/graders.ts` and pass a
mission-specific `explain` callback, exactly as
`src/missions/r1-income-statement-order.ts` does. That callback is where the
satire and the concept-specific explanation live.

### The four task kinds that exist after this milestone

| kind | player does | answer shape | accuracy |
|---|---|---|---|
| `order` | tap two chips to swap them until the list is in the right order | `{ orderedIds: string[] }` | fraction of items in the exact correct slot |
| `sort` | tap an item, tap a bucket | `{ placements: Record<itemId, bucketId> }` | fraction of items in the correct bucket; unplaced counts wrong |
| `balance` | type numbers into blanks on a statement | `{ values: Record<lineId, number \| null> }` | fraction of blanks within `tolerance` of `answer`; blank counts wrong |
| `quiz` | tap one choice per question, optionally against a clock | `{ choices: Record<qId, choiceId \| null>, timedOut? }` | fraction of questions answered correctly; unanswered counts wrong |

`order` grades exact-slot, which means an adjacent swap costs two items.
That is intentional — order is the whole point of that task kind.

### The seven task kinds still planned

Each needs the four-step ritual in `CLAUDE.md` ("Adding a task kind"): types →
pure grader + tests → widget in `src/components/` → a `case` in
`MissionScreen`. Proposed shapes:

- **`slider`** — one or more sliders with a target value each. The player
  drags to hit a number. `{ kind: 'slider'; prompt; unit?; sliders: { id,
  label, min, max, step, answer, tolerance, role? }[] }`, answer
  `{ values: Record<id, number> }`. Accuracy = mean per-slider score, where a
  slider inside `tolerance` scores 1 and one inside `2 × tolerance` scores
  `1 - (err - tol) / tol`, so near-misses degrade smoothly. Used for control
  premiums, discount rates, five-year forecasts, LBO leverage.
- **`waterfall`** — the income statement as a bar chart the player assembles.
  The player types the value of each blank bar. `{ kind: 'waterfall'; prompt;
  unit; steps: { id, label, delta?, answer?, role, total? }[] }`. Graded like
  `balance`, rendered as the chart.
- **`bridge`** — a two-anchor waterfall: start at a known number, apply
  adjustments, land on a target. Used for the EV bridge and accretion/
  dilution. Same data as `waterfall` plus `start` and `end` anchors. Grading
  additionally checks that the bars actually reconcile to the end anchor, and
  that reconciliation is worth 25% of accuracy on its own.
- **`footballfield`** — the player sets the low and high end of several
  valuation ranges by dragging handles on horizontal bars.
  `{ kind: 'footballfield'; prompt; unit; axis: { min, max }; rows: { id,
  label, lowAnswer, highAnswer, tolerance, role }[] }`. Accuracy = mean over
  rows of the low/high hit rate.
- **`heatmap`** — a sensitivity table. The player fills blank cells and/or
  taps the cell matching a stated condition. `{ kind: 'heatmap'; prompt;
  rows: { id, label }[]; cols: { id, label }[]; cells: Record<'r:c', number>;
  blanks: string[]; tapAnswer?: string }`. Accuracy = fraction of blanks
  correct, with the tap counted as one more blank.
- **`written`** — free text, graded 1–10 by the API. **`mentorOnly: true`
  always.** `{ kind: 'written'; prompt; wordLimit; rubric: string[] }`.
  Grading is not pure here, so the mission additionally exposes
  `gradeAsync(answer, client)` and `MissionScreen` awaits it; the plain
  `grade` returns accuracy 0 with an explanation saying Mentor mode is
  required. **Do not weaken the signature of `grade` to accommodate this.**
- **`auction`** — a bidding round against three scripted bots. The player
  sets a bid with a slider across N rounds; bots respond from a deterministic
  policy seeded from the mission id, so a replay is reproducible. Accuracy is
  shaped: winning below the target's intrinsic value scores high, losing
  narrowly scores mid, winning above intrinsic value falls off steeply.

### Store layout

- `src/store/progress.ts` — key `deal-desk:progress`, versioned
  (`PROGRESS_VERSION`). Holds `best` (missionId → best total comp),
  `attempts`, `failStreak`, `bonusSeen`. Exportable and importable as
  validated JSON. **Never contains the API key.**
- `src/store/settings.ts` — key `deal-desk:settings`. Holds `apiKey`,
  `mentorEnabled`, `soundOn`. It has its own localStorage key precisely so it
  can never leak into a progress export. `useMentorMode()` is the only gate.
- `src/store/nav.ts` — screen state, no router. Four screens.

### Screen flow

`Ladder` (5 rungs, lock/unlock, comp bars, disclaimer footer) → `RungScreen`
(the missions in one rung) → `MissionScreen`. `MissionScreen` is the engine
loop and owns the phases: `lesson → task → result → (review | bonus | back)`.
`Settings` hangs off the header.

### How a mission file plugs in

1. Create `src/missions/<id>.ts`, default-export a `Mission`.
2. Add it to the array in `src/missions/index.ts`.
3. Create `src/missions/<id>.test.ts` asserting accuracy 1.0 for the
   canonical correct answer and below 1.0 for at least two perturbations.

That is the whole procedure. If a mission needs a task kind that does not
exist, do the four-step ritual first, in its own commit.

---

## (c) Fictional company bible

All figures are in **thousands of dollars ($k)** unless stated, fiscal year
2025. These numbers are the single source of truth: a mission must not invent
a different revenue for a company that already exists here. Put them in
`src/missions/companies.ts` as typed constants so the missions and the tests
read the same object.

### Rung 1 — Pucker Up Lemonade Co.

A regional lemonade-stand empire, 40 stands, run by an overconfident founder.

**Income statement** — what the company sold and what it cost, over a year:

| Line | $k |
|---|---|
| Revenue | 1,200 |
| Cost of goods sold (COGS) | 480 |
| Gross profit | 720 |
| Operating expenses | 420 |
| Operating profit (EBIT) | 300 |
| Interest expense | 30 |
| Taxes | 70 |
| Net income | 200 |

**Balance sheet** — what it owns and owes at one instant, end of year:

| Assets | $k | Liabilities & equity | $k |
|---|---|---|---|
| Cash | 150 | Accounts payable | 70 |
| Accounts receivable | 90 | Long-term debt | 330 |
| Inventory | 60 | **Total liabilities** | **400** |
| Property, plant & equipment | 500 | Shareholders equity | 400 |
| **Total assets** | **800** | **Total liabilities + equity** | **800** |

**Cash flow statement** — where cash actually moved:

| Line | $k |
|---|---|
| Net income | 200 |
| Depreciation | 40 |
| Change in working capital | +20 |
| **Cash from operations** | **260** |
| Purchase of new stands (capex) | −120 |
| **Cash from investing** | **−120** |
| Debt repayment | −60 |
| Dividends to founder | −40 |
| **Cash from financing** | **−100** |
| **Net change in cash** | **+40** (110 → 150) |

Derived facts Rung 1 missions may quote: gross margin 60.0%, EBIT margin
25.0%, net margin 16.7%, EBITDA = EBIT 300 + depreciation 40 = 340.

### Rung 2 — Ledgerly Inc. (SaaS)

Expense-report software sold by subscription. "SaaS" means software as a
service: customers pay a recurring fee instead of buying a licence, so
revenue is high-margin and repeatable.

| Line | FY2025 $k | FY2024 $k |
|---|---|---|
| Revenue | 80,000 | 64,000 |
| Cost of revenue (hosting, support) | 20,000 | 16,600 |
| **Gross profit** | **60,000** (75.0%) | 47,400 |
| Sales & marketing | 26,000 | |
| Research & development | 14,000 | |
| General & administrative | 8,000 | |
| Depreciation & amortisation (D&A) | 4,000 | |
| **Operating profit (EBIT)** | **8,000** (10.0%) | |
| Interest expense | 3,000 | |
| Taxes | 1,250 | |
| **Net income** | **3,750** (4.7%) | |

- **EBITDA** — earnings before interest, taxes, depreciation and
  amortisation — is EBIT 8,000 + D&A 4,000 = **12,000** (15.0% margin). It is
  a rough proxy for cash profit from operations, before financing choices.
- Revenue growth = 80,000 / 64,000 − 1 = **+25.0%**. Gross-profit growth =
  60,000 / 47,400 − 1 = **+26.6%**. Three-year revenue CAGR (compound annual
  growth rate) from 40,960 to 80,000 = **+25.0%** exactly.
- Cash 30,000; short-term debt 5,000; long-term debt 55,000; total debt
  60,000. **Net debt** = total debt − cash = **30,000**.
- Shares outstanding 25,000k; share price $14.80 → **market cap** (also
  called equity value) = **370,000**.
- **Enterprise value (EV)** = equity value + net debt = **400,000**.
- Multiples: EV/Revenue **5.0x**, EV/EBITDA **33.3x**, P/E **98.7x**. The
  absurd P/E (price-to-earnings, market cap ÷ net income) is a teaching
  point, not a bug: for a young, fast-growing software company net income is
  a rounding error and P/E is useless.

### Rung 3 — Brickhouse Industrial Corp. (industrial)

Makes loading-dock levellers and industrial doors. Nine plants.

Revenue 640,000 (FY2024: 600,000, **+6.7%**); COGS 448,000; gross profit
192,000 (30.0%); SG&A 96,000; D&A 32,000; **EBIT 64,000** (10.0%); **EBITDA
96,000** (15.0%); interest 18,000; taxes 11,500; **net income 34,500**.
Cash 40,000; total debt 260,000; **net debt 220,000**. Shares 40,000k at
$14.50 → market cap 580,000; **EV 800,000**. **EV/EBITDA 8.3x**, EV/Revenue
1.25x, P/E 16.8x.

### Rung 3 — Nan's Pantry Markets Inc. (retailer)

Regional grocery chain, 210 stores.

Revenue 2,400,000 (FY2024: 2,280,000, **+5.3%**); COGS 1,776,000; gross
profit 624,000 (26.0%); SG&A 480,000; D&A 72,000; **EBIT 72,000** (3.0%);
**EBITDA 144,000** (6.0%); interest 24,000; taxes 12,000; **net income
36,000**. Cash 60,000; total debt 360,000; **net debt 300,000**. Shares
60,000k at $11.80 → market cap 708,000; **EV 1,008,000**. **EV/EBITDA 7.0x**,
EV/Revenue 0.42x, P/E 19.7x. Thin margins are correct for grocery and are
themselves a lesson: never compare a grocer's margin to a software company's.

### Peer sets

A "peer set" (or "comp set") is the group of similar listed companies whose
valuation multiples you borrow to value your target.

**Industrials peers, for Brickhouse ($k):**

| Company | Revenue | EBITDA | margin | growth | Net debt | Mkt cap | EV | EV/EBITDA |
|---|---|---|---|---|---|---|---|---|
| Palisade Doors & Docks | 850,000 | 144,500 | 17.0% | +9% | 250,000 | 1,122,750 | 1,372,750 | **9.5x** |
| Dockwell Systems | 720,000 | 115,200 | 16.0% | +7% | 180,000 | 833,760 | 1,013,760 | **8.8x** |
| *Brickhouse (target)* | 640,000 | 96,000 | 15.0% | +6.7% | 220,000 | 580,000 | 800,000 | *8.3x* |
| Ironvale Components | 480,000 | 62,400 | 13.0% | +4% | 140,000 | 321,760 | 461,760 | **7.4x** |
| Marrow Fabrication | 300,000 | 30,000 | 10.0% | +1% | 90,000 | 96,000 | 186,000 | **6.2x** |

The pattern is the lesson: higher margin and higher growth earn a higher
multiple. Two deliberate traps must be excluded — **Halcyon Data Centres**
(EV/EBITDA 22.0x, a different industry with different economics) and
**Brickhouse Holdings Pty** (a private family firm one-twentieth the size,
with no share price, so no multiple exists at all).

**Grocery peers, for Nan's Pantry (EV/EBITDA):** Copperline Markets 7.4x,
Trestle Foods 6.8x, Verdant Grocers 6.2x. Traps: **Larkspur Beauty**
(specialty retail, 13.0x) and **Nan's Pantry Real Estate Trust** (the
landlord that owns the store buildings — a different asset entirely).

**Precedent transactions** — past whole-company acquisitions. They price
*control*, so they run higher than trading multiples:

| Target | Acquirer | Year | EV/EBITDA | Premium over pre-deal share price |
|---|---|---|---|---|
| Trestle Foods | Copperline Markets | 2024 | 9.2x | 32% |
| Verdant Grocers | a private-equity sponsor | 2023 | 8.4x | 25% |
| Marrow Fabrication | Palisade Doors & Docks | 2025 | 7.8x | 21% |

---

## (d) Per-rung mission specs

`base` is `baseComp`, `par` is `parSeconds`. Every mission's `grade` returns
`accuracy` per the rule in its row; comp is then computed by
`src/engine/scoring.ts`, and a mission never computes comp itself.

### Rung 1 — Intern: reading the statements (total base 30,000)

| # | id | kind | lesson topic | task | graded | base | par | boss |
|---|---|---|---|---|---|---|---|---|
| 1 | `r1-three-statements` | sort | What a company is, and what each of the three statements is for | Sort 9 line items (Revenue, Cash, Net income, Inventory, Capex, Long-term debt, Dividends paid, COGS, Shareholders equity) into *Income statement / Balance sheet / Cash flow statement* | fraction of the 9 in the right bucket; the explanation covers why net income sits on the income statement but also *starts* the cash flow statement | 4,000 | 100 | |
| 2 | `r1-income-statement-order` | order | The income statement is a staircase down | Reassemble Pucker Up's 8 lines top to bottom (exists today; Milestone 2 upgrades the lesson visual to a small waterfall) | fraction of items in the exact correct slot | 5,000 | 90 | |
| 3 | `r1-balance-sheet` | balance | Assets = liabilities + equity, always | Pucker Up's balance sheet with 4 blanks: Total assets (800), Total liabilities (400), Shareholders equity (400), and Inventory (60) back-solved from the total. `unit: '$k'`, `tolerance: 0` | fraction of the 4 blanks exactly right; the explanation names which side failed to balance and by how much | 6,000 | 150 | |
| 4 | `r1-cash-flow-sort` | sort | Profit is an opinion, cash is a fact | Sort 8 Pucker Up cash items (net income, depreciation, change in working capital, purchase of new stands, debt repayment, dividends to founder, plus "sold an old stand for cash" → investing and "raised new equity from the founder's aunt" → financing) into *Operating / Investing / Financing* | fraction in the right bucket | 6,000 | 140 | |
| 5 | `r1-boss-lemonade` | quiz | Which statement answers which question | 5 questions on the full Pucker Up set, `timeLimitSeconds: 120`. E.g. "Which statement tells you whether the company can pay its suppliers next week?" (balance sheet: cash 150 against payables 70) and "Why did cash rise by only 40 when net income was 200?" (capex 120 + debt repayment 60 + dividends 40, partly offset by depreciation 40 and working capital 20) | fraction of the 5 correct; a timeout submits whatever is answered, unanswered counts wrong | 9,000 | 150 | ✅ |

### Rung 2 — Analyst: the numbers bankers care about (total base 40,000)

All use **Ledgerly Inc.**

| # | id | kind | lesson topic | task | graded | base | par | boss |
|---|---|---|---|---|---|---|---|---|
| 1 | `r2-waterfall-ebitda` | waterfall | Revenue → gross profit → EBIT → EBITDA → net income | Build the waterfall: 5 bars given, 4 blank (gross profit 60,000; EBIT 8,000; EBITDA 12,000; net income 3,750) | fraction of blank bars within `tolerance: 0` | 6,000 | 150 | |
| 2 | `r2-margins` | balance | A margin is a ratio, and it is only comparable within an industry | Compute gross margin (75.0%), EBITDA margin (15.0%), net margin (4.7%) | fraction of 3 blanks within `tolerance: 0.1` percentage points | 6,000 | 150 | |
| 3 | `r2-growth-rates` | balance | Growth rate, and why the denominator is the *prior* year | Revenue growth (+25.0%), gross-profit growth (+26.6%), and the 3-year CAGR from 40,960 to 80,000 (+25.0%) | fraction of 3 blanks within `tolerance: 0.1` | 5,000 | 120 | |
| 4 | `r2-net-debt` | balance | Net debt, and why cash is subtracted | From total debt 60,000 and cash 30,000 produce net debt (30,000); then net debt if 10,000 of that cash is restricted (40,000) | fraction of 2 blanks exactly right | 6,000 | 120 | |
| 5 | `r2-ev-vs-equity` | sort | Enterprise value vs equity value | Sort 8 claims into *True of enterprise value / True of equity value* — e.g. "what a buyer pays for the whole business, debt included" → EV; "what the shareholders own" → equity | fraction in the right bucket | 6,000 | 120 | |
| 6 | `r2-boss-ev-bridge` | bridge | The bridge from market cap to enterprise value | Start at market cap 370,000, add total debt 60,000, subtract cash 30,000, land on EV 400,000. Two zero-value adjustments (minority interest, preferred stock) are present and must be left at zero | 75% fraction of adjustment bars correct, 25% whether the bars actually sum to the stated EV | 11,000 | 180 | ✅ |

### Rung 3 — Associate: valuation by comparison (total base 50,000)

| # | id | kind | lesson topic | task | graded | base | par | boss |
|---|---|---|---|---|---|---|---|---|
| 1 | `r3-multiples` | balance | EV/EBITDA, EV/Revenue, P/E — what each divides by what | Compute all three for Brickhouse (8.3x, 1.25x, 16.8x) and P/E for Ledgerly (98.7x) | fraction of 4 blanks within `tolerance: 0.1` | 7,000 | 160 | |
| 2 | `r3-which-multiple` | quiz | When each multiple fits | 6 untimed questions, e.g. "Two grocers, identical operations, one is loaded with debt. Which multiple compares them fairly?" (EV/EBITDA — EV includes debt, P/E does not) | fraction of 6 correct | 6,000 | 120 | |
| 3 | `r3-peer-set` | sort | Picking a peer set is half art | Sort 7 candidates into *In the comp set / Out*. The 5 industrials go in; Halcyon Data Centres and Brickhouse Holdings Pty stay out | fraction correct; the explanation names the specific reason each trap fails | 7,000 | 150 | |
| 4 | `r3-precedents` | slider | Precedent transactions and the control premium | Given Nan's Pantry at $11.80 and a 25% premium, set the offer price ($14.75); then set the implied EV/EBITDA (8.2x, from equity 885,000 + net debt 300,000 = EV 1,185,000, ÷ EBITDA 144,000) | 2 sliders, partial credit inside 2× tolerance | 7,000 | 150 | |
| 5 | `r3-football-field` | footballfield | The football field chart | From the grocery peer range (6.2x–7.4x) and the precedent range (8.4x–9.2x), drag the low/high handles to the implied per-share values ($9.88–$12.76 and $15.16–$17.08) | mean over 2 rows of (low hit + high hit)/2, `tolerance: 0.25` per share | 9,000 | 200 | |
| 6 | `r3-boss-three-ways` | footballfield | Value one target three ways and land in a range | Value Brickhouse by trading comps, by precedents, and against a stated 52-week range; place all three bars, then answer one embedded question on which range you would actually defend | 3 rows at 25% each plus the embedded question at 25% | 14,000 | 240 | ✅ |

### Rung 4 — VP: intrinsic value, real data begins (total base 63,000)

| # | id | kind | lesson topic | task | graded | base | par | boss |
|---|---|---|---|---|---|---|---|---|
| 1 | `r4-time-value` | slider | A dollar next year is worth less than a dollar today | Discount 100 at 10% for 1, 3 and 5 years (90.9, 75.1, 62.1) | 3 sliders, `tolerance: 0.5` | 8,000 | 150 | |
| 2 | `r4-wacc` | balance | WACC, the blended rate a company pays for money | Cost of equity 10%, cost of debt 6%, tax 25%, equity 580,000, debt 260,000. Compute after-tax cost of debt (4.5%) and WACC (8.30%) | 2 blanks, `tolerance: 0.05` | 9,000 | 180 | |
| 3 | `r4-fcf-forecast` | slider | Free cash flow, and forecasting five years of it | Five growth sliders on Brickhouse revenue; the widget redraws the resulting free-cash-flow line live. Target is a stated management case | mean per-year hit rate with partial credit | 10,000 | 210 | |
| 4 | `r4-terminal-value` | balance | Terminal value is most of the answer, and that should worry you | Gordon growth: year-5 FCF 52,000, g = 2%, WACC = 8.3% → TV = 52,000 × 1.02 / 0.063 = **841,905**; then TV as a share of total EV | 2 blanks, tolerance 1% relative | 9,000 | 180 | |
| 5 | `r4-sensitivity` | heatmap | Sensitivity tables: never quote one number | A 5×5 WACC × terminal-growth grid with 6 blank cells, then tap the cell matching a stated share price | fraction of 6 blanks plus the tap, equally weighted | 10,000 | 200 | |
| 6 | `r4-boss-real-dcf` | slider | DCF a real company and compare it to its market cap | Pull one company from the EDGAR snapshot (section h), forecast five years, choose WACC and g, then judge whether the market is high, low, or about right. Defensible bands, not point answers | 60% model inputs inside the defensible bands, 40% the final judgement call | 17,000 | 300 | ✅ |

### Rung 5 — MD: deals (total base 80,000)

| # | id | kind | lesson topic | task | graded | base | par | boss |
|---|---|---|---|---|---|---|---|---|
| 1 | `r5-lbo-basics` | slider | Debt does the heavy lifting; returns come from paying it down | Buy Brickhouse at 8.3x (EV 800,000) with 400,000 of debt, hold 5 years, exit at 8.3x. Set leverage and exit multiple, read the resulting IRR | 2 sliders plus one read-off question | 10,000 | 180 | |
| 2 | `r5-sources-uses` | balance | Sources and uses must tie | Uses: purchase price 800,000 + fees 30,000 = 830,000. Sources: new debt 480,000 (5.0x EBITDA), sponsor equity 310,000, cash on the balance sheet 40,000. 4 blanks | 4 blanks exact, and the tie is checked separately and worth 25% | 11,000 | 200 | |
| 3 | `r5-debt-stack` | sort | Seniority: who gets paid first when it goes wrong | Place 6 instruments (revolver, first-lien term loan, second lien, senior notes, mezzanine, common equity) in seniority order | fraction in the right seniority slot | 11,000 | 180 | |
| 4 | `r5-accretion-dilution` | bridge | Does this deal add to earnings per share or not | Bridge acquirer EPS to pro-forma EPS through added interest, synergies, and newly issued shares | 75% bars, 25% reconciliation | 12,000 | 200 | |
| 5 | `r5-auction` | auction | Read a teaser, bid, win by not overpaying | Three rounds against three bots with distinct scripted policies: a strategic buyer, a disciplined sponsor, and one that always overbids | shaped — winning below intrinsic value ≈ 1.0, losing narrowly ≈ 0.6, winning above intrinsic value falls off steeply | 14,000 | 240 | |
| 6 | `r5-capstone` | multi (bridge → slider → quiz) | Run a deal end to end | Value it, structure it, bid, defend. Ends on a "closing dinner" screen | mean of the three stage accuracies | 22,000 | 420 | ✅ |

### Mentor-only missions

`mentorOnly: true`, `kind: 'written'`, hidden with no API key:
`m2-written-ev` (rung 2, "Explain to a client in two sentences why EV beats
market cap for comparing companies"), `m3-written-peers` (rung 3, "Defend
your peer set in three bullets"), `m4-written-defend` (rung 4, "Defend your
DCF range to a sceptical CFO"), `m5-mock-interview` (rung 5, five IB
technical questions). **Give every mentor-only mission `baseComp: 0`** until
the rung-threshold issue in section (l) is resolved, so turning Mentor mode
on cannot make a rung harder to pass.

---

## (e) Chart-as-game-board specs

Every chart is a game board: the player manipulates it, it is not decoration.
All colours come from theme tokens (`text-revenue`, `bg-cost/15`, …), never
raw hex. Every board must be legible at 360px wide.

| Board | Player manipulates | Implementation |
|---|---|---|
| **Waterfall** (income statement) | Types the value of each blank bar; the bar grows to match and the running total moves | Recharts `BarChart` with two `Bar`s sharing a `stackId`: an invisible base bar (`fill="transparent"`) plus a visible delta bar, one `<Cell>` per bar so each takes its own role colour. Recharts has no native waterfall; this is the standard trick |
| **Stacked bar** (balance sheet) | Types blanks; the two columns visibly fail to reach the same height until the sheet balances | Recharts `BarChart` with `layout="vertical"`, two categories ("Assets" and "Liabilities + equity"), one `Bar` per component with a `stackId` per side, and a `ReferenceLine` at total assets so the imbalance is obvious |
| **Flow** (cash flow) | Taps an item, taps one of three lanes | Custom SVG, not Recharts: three lanes (operating / investing / financing) with a cash bar on the right that updates as items land. Recharts' `Sankey` is unusable at phone width |
| **EV bridge** | Sets each adjustment bar | The same waterfall machinery, with `ReferenceLine`s at the start (market cap) and end (EV) anchors so a bridge that does not reconcile is visible |
| **Football field** | Drags a low and a high handle on each horizontal range bar | Custom SVG. The Recharts floating-bar trick works, but the handles need pointer events on individual bar ends, which is easier to own directly. One `<rect>` per range, a `<line>` for the current share price, a shared x-scale helper in `src/lib/scale.ts`. Handles get 44px hit areas even though they draw smaller |
| **Sensitivity heatmap** | Types blank cells, taps a cell to answer | A plain CSS grid of `<button>`s, no chart library. Cell background interpolates between `--color-cost` and `--color-revenue` by value rank via `color-mix(in oklab, …)`. Rows are WACC, columns are terminal growth |
| **Debt stack** | Sorts instruments by seniority | A flex column of blocks, height proportional to amount, `debt` amber darkening with seniority, with the equity block at the bottom in `equity` blue. Custom, no library |
| **Deal timeline** | Taps milestones into order | A horizontal SVG rail with milestone nodes; reuses the `order` grader and renders as a rail instead of a list |

Shared chart plumbing goes in `src/components/charts/`. Keep Recharts imports
out of `src/engine/` — the engine stays free of React and browser APIs.

---

## (f) Scoring and progression

Implemented in `src/engine/scoring.ts`. Documented here so nobody re-derives
it.

- `computeComp(mission, accuracy, elapsedSeconds)` returns
  `{ accuracyComp, speedBonus, total, passed }`.
- `accuracyComp = round(baseComp × clamp(accuracy, 0, 1))`.
- The speed bonus applies **only on a pass**, scales linearly from 0 at par
  to `SPEED_BONUS_MAX` (0.20) at half par or faster, and is itself multiplied
  by accuracy — so you cannot farm bonus by rushing a wrong answer.
- `FAIL_BELOW = 0.5`: an attempt under 50% accuracy is a fail.
- `REVIEW_AFTER_FAILS = 3`: three consecutive fails on one mission routes to
  the performance review screen, which re-teaches the concept.
- `rungStatus(missions, best)` sums best-ever comp per mission against the
  sum of `baseComp`. `PASS_THRESHOLD = 0.7` unlocks the next rung. `perfect`
  requires every mission at or above full base comp and fires "bonus season"
  once per rung, tracked by `bonusSeen`.

Planned tweaks, not yet implemented — do not do them silently:

1. Exclude `mentorOnly` missions from `rungStatus.possible`. See (l).
2. A "days survived" counter on the ladder, derived from the distinct attempt
   dates already in `progress.attempts`. Cosmetic, Milestone 6.
3. Partial credit inside 2× tolerance for `slider` and `footballfield`, so
   near-misses degrade smoothly instead of snapping to zero.

---

## (g) Mentor mode design

**Everything in this section must be re-checked against current Anthropic
docs at implementation time.** The exact browser-access header name, the
model ids, and the per-token prices all change. What follows is the design,
plus the values as of 2026-09 — not a promise.

### The call

`src/lib/anthropic.ts`, a minimal client, no SDK, `fetch` only:

- `POST https://api.anthropic.com/v1/messages`.
- Headers: `x-api-key` (the key from localStorage), `anthropic-version:
  2023-06-01`, `content-type: application/json`, and the direct-browser-access
  header, currently `anthropic-dangerous-direct-browser-access: true`.
  **Verify that header name in the docs before writing the call** — without
  it the browser request is rejected by CORS.
- The key is read from `useSettings.getState().apiKey` at call time. It is
  never stored anywhere else, never logged, never included in a progress
  export, and never sent to any host but `api.anthropic.com`. No code path
  may serialise it. Add an assertion in the client that the request URL's
  host is exactly `api.anthropic.com`.

### Model choice policy

- Default `claude-opus-5` — best judgement for grading a written answer;
  currently $5 per million input tokens and $25 per million output tokens.
- Settings offers a cheaper option, currently `claude-haiku-4-5` ($1 / $5 per
  million), for "Ask the MD" follow-ups where the answer is short.
- Never hardcode a date-suffixed model id, and keep every id in one constant
  so a future session changes it in one place.
- Use adaptive thinking (`thinking: { type: "adaptive" }`) with
  `output_config: { effort: "low" }` for grading: the task is short and
  well-specified, and low effort keeps both cost and latency down.

### Prompt templates (outline)

Three templates in `src/lib/prompts.ts`, each a function returning a
`{ system, user }` pair. All three request JSON back via
`output_config.format` so the UI never parses prose.

1. **Grade a written answer, 1–10.** System: "You are a managing director at
   an investment bank grading a junior's written answer. You are terse,
   funny, and never cruel about the person — only about the work. You always
   explain the actual finance." Then the mission's `rubric` array as the
   scoring criteria, a model answer, and a hard instruction that
   `explanation` must stand alone as a correct finance explanation even if
   `verdict` were deleted. Output schema `{ score: 1..10, verdict: string,
   explanation: string, missed: string[] }`. The engine maps
   `accuracy = score / 10`.
2. **Ask the MD.** Takes the mission id, the player's answer, the local
   `explanation`, and the player's follow-up question. Returns
   `{ answer: string }`, roughly 200 words, same voice.
3. **Mock interview.** Five IB technical questions, one turn each, keeping
   the running transcript. Returns per question `{ score, verdict,
   explanation }`, plus a final `{ overall, wouldHire: boolean, note }`.

### Cost guardrails

- `max_tokens: 700` for grading, `500` for Ask the MD, `600` per interview
  turn. Hard caps, not suggestions.
- Truncate the player's written answer to the mission's `wordLimit` client
  side, before sending.
- Settings shows a **per-call cost estimate** computed from a small table in
  `src/lib/pricing.ts`: `(estimatedInputTokens / 1e6 × inputPrice) +
  (maxTokens / 1e6 × outputPrice)`, rendered as "about $0.02 per graded
  answer at current prices". The table carries a `checkedOn` date that
  Settings displays, so a stale number is visibly stale.
- A session counter in Settings: calls made this session and running
  estimated spend. Resets on reload; it is a nudge, not accounting.
- A 401 or 403 shows "That key did not work" and does not retry. A 429 shows
  "Rate limited. The MD is in a meeting" and does not retry automatically.

---

## (h) EDGAR integration design

SEC EDGAR publishes every US filer's XBRL facts for free, with no API key.

### Endpoint shape (verified)

`GET https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json`, with the
CIK zero-padded to 10 digits. The response is:

```
{ cik: 320193, entityName: "Apple Inc.",
  facts: {
    "dei":     { EntityCommonStockSharesOutstanding: { units: { shares: [...] } },
                 EntityPublicFloat: { units: { USD: [...] } } },
    "us-gaap": { OperatingIncomeLoss: { label, description,
                   units: { USD: [ { start, end, val, accn, fy, fp, form, filed, frame } ] } },
                 ... } } }
```

Each fact value carries `form` (`10-K`, `10-Q`), `fp` (`FY`, `Q1`…), `fy`,
`start`/`end`, and `filed`. **Filter to `form === '10-K' && fp === 'FY'` and
take the row with the latest `end`.** The same period is restated across
filings, so prefer the latest `filed` within a period too. Ticker → CIK comes
from `https://www.sec.gov/files/company_tickers.json`.

### Tag mapping

| Concept | XBRL tags, in priority order |
|---|---|
| Revenue | `RevenueFromContractWithCustomerExcludingAssessedTax` → `Revenues` → `SalesRevenueNet` |
| EBIT | `OperatingIncomeLoss` |
| D&A | `DepreciationDepletionAndAmortization` → `DepreciationAmortizationAndAccretionNet` → `DepreciationAndAmortization` |
| **EBITDA proxy** | EBIT + D&A. This is a proxy, not a reported figure — say so in the UI |
| Net income | `NetIncomeLoss` |
| Cash | `CashAndCashEquivalentsAtCarryingValue`, plus `ShortTermInvestments` where present |
| Debt | `LongTermDebtNoncurrent` + `LongTermDebtCurrent`, falling back to `LongTermDebt` |
| **Net debt** | debt − cash |
| Shares | `dei:EntityCommonStockSharesOutstanding` (the cover-page count) → `CommonStockSharesOutstanding` |
| Total assets / equity | `Assets`, `StockholdersEquity` |

Tag coverage varies by filer. Every getter must return `number | null`, and
the UI must degrade to "not reported" rather than render `NaN`.

### Caching

`src/lib/edgar.ts` caches per CIK in localStorage under
`deal-desk:edgar:<cik>` as `{ fetchedAt, ttlMs, data }` with a **7-day TTL** —
this is annual data, there is no reason to refetch daily. Cache only the ~15
extracted fields, never the whole companyfacts document: Apple's is several
megabytes and would blow the localStorage quota. Wrap every read and write in
try/catch and fall through to a refetch on any failure.

### The User-Agent requirement

SEC requires a descriptive `User-Agent` identifying the requester. **A
browser will not let JavaScript set `User-Agent`** — `fetch` silently drops
it. Which leads to the next point.

### CORS: verified blocked

Checked directly against
`https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json`:

- A `GET` carrying an `Origin` header returns `200` but **no
  `Access-Control-Allow-Origin` response header**.
- An `OPTIONS` preflight returns **`403 Forbidden`**.

A browser will therefore block the response. **A static site cannot fetch
EDGAR directly from the page.** Plan accordingly; do not spend a session
rediscovering this.

**Fallback plan — and this is the primary plan, not the backup:** bundle a
snapshot. A build-time Node script `scripts/fetch-edgar.mjs`, run manually
rather than in CI, fetches companyfacts for the ten tickers below with a
proper `User-Agent`, extracts only the ~15 fields per company, and writes
`src/data/edgar-snapshot.json` (target: under 60KB). The game reads the
snapshot. `src/lib/edgar.ts` keeps the live-fetch path behind a Settings
toggle that defaults to off, so that if a CORS-friendly route ever appears
the code is already there. Regenerating the snapshot is an owner-run command,
logged in `TASKS.md` with a date.

The script's `User-Agent` takes a project string plus a contact address read
from an environment variable at run time. **Never commit a contact address to
the repo.**

### Curated ticker list (CIKs verified against SEC)

Chosen for stable, forecastable cash flows — the companies a DCF actually
works on.

| Ticker | CIK | Company | Why it is here |
|---|---|---|---|
| AAPL | 0000320193 | Apple Inc. | Everyone knows it; huge net cash makes the EV bridge vivid |
| MSFT | 0000789019 | Microsoft Corp | Software margins, for contrast |
| KO | 0000021344 | Coca-Cola Co | The textbook stable-growth DCF |
| PEP | 0000077476 | PepsiCo Inc | The natural peer for KO |
| PG | 0000080424 | Procter & Gamble Co | Consumer staples: low growth, low volatility |
| COST | 0000909832 | Costco Wholesale Corp | Retail, thin margins, a real peer for Nan's Pantry |
| HD | 0000354950 | Home Depot, Inc. | Retail with leverage |
| CAT | 0000018230 | Caterpillar Inc | Industrial and cyclical, a peer for Brickhouse |
| DE | 0000315189 | Deere & Co | The industrial peer for CAT |
| UNP | 0000100885 | Union Pacific Corp | Capital-intensive, high D&A — makes EBITDA vs net income obvious |

---

## (i) Voice and tone guide

The MD is a managing director who is sharp, impatient, funny, and — this is
the load-bearing part — **actually teaching**. He mocks the work, never the
person. He never gloats and never comments on anyone's worth. The `verdict`
field carries the joke; the `explanation` field carries the finance and must
survive on its own with the joke deleted.

Verdict lines by accuracy band. Put them in `src/engine/voice.ts` as arrays
and pick deterministically from `(missionId, accuracy)` so replaying the same
result gives the same line.

**100%, perfect:**

1. "Fine. Do not let it go to your head."
2. "Correct. I'll tell nobody."
3. "That's the first thing today that didn't need fixing."
4. "Good. Now do it forty more times before Monday."

**85–99%, strong:**

5. "Nearly. 'Nearly' is a word I use in meetings I later regret."
6. "Close enough that I'd send it. Not close enough that I'd sign it."
7. "One line off. In a live deal, that line is the deal."

**70–84%, passing:**

8. "It's directionally right, which is banker for wrong in one place."
9. "The client wouldn't notice. I did."
10. "Fix it and resend. I'm still awake."

**50–69%, scraping a pass:**

11. "pls fix."
12. "This is a first draft wearing a final draft's clothes."
13. "You've built something. It just isn't this."

**Below 50%, a fail:**

14. "Did you assemble this with your eyes closed?"
15. "Delete this and start again from the lesson card."
16. "I've seen this exact mistake print in a pitch book. We do not discuss it."
17. "Nothing in here balances, including my patience."

**Timed out on a boss fight:**

18. "The clock beat you. The clock always beats you. Be faster."

Promotion, bonus, and review lines:

1. **Rung passed:** "Congratulations. You survive another year. The reward is more work."
2. **Bonus season (a perfect rung):** "Bonus season. Numbers are down across the street, so enjoy this quietly."
3. **Promotion to the next rung:** "You're an Analyst now. Nobody will tell you what changed. Nothing did."
4. **Performance review (three fails):** "Sit down. This isn't a firing, it's a re-teaching. Read this properly and go again."
5. **Capstone, the closing dinner:** "The deal closed. There's a dinner. You'll be at the far end of the table, and that's fine — you got here."

---

## (j) Testing strategy

Vitest, run once with `npm test`. **Tests cover grading logic and financial
math only. No UI tests**, per the brief.

- `src/engine/scoring.test.ts` — comp, the speed-bonus boundaries (at par, at
  half par, past half par), the fail threshold, and the rung pass/perfect
  edges.
- `src/engine/graders.test.ts` — one `describe` block per grader. Every
  grader needs: all-correct → 1.0; all-wrong → 0.0; partial → the exact
  fraction; empty or missing input counts wrong rather than crashing; and for
  `balance`, tolerance boundaries on both sides.
- `src/missions/<id>.test.ts` — one per mission. The canonical correct answer
  grades 1.0; at least two perturbations grade below 1.0; and the explanation
  for a specific wrong answer mentions the specific concept (assert on a
  substring). That last assertion is what stops the satire from eating the
  teaching.
- `src/missions/registry.test.ts` — invariants across `MISSIONS`: ids unique
  and matching `^(r[1-5]|m[2-5])-`; `order` contiguous from 1 within each
  rung; `baseComp > 0` for every non-mentor mission; `parSeconds > 0`; at
  most one `boss` per rung; every `mentorOnly` mission has
  `kind: 'written'`.
- `src/missions/companies.test.ts` — the company bible is internally
  consistent: assets = liabilities + equity; gross profit = revenue − COGS;
  EBIT = gross profit − opex; EBITDA = EBIT + D&A; net debt = total debt −
  cash; EV = market cap + net debt; and every stated multiple equals its
  computed value to within 0.05x. This is the test that catches a mission
  quoting a number that contradicts the bible.
- `src/lib/edgar.test.ts` — tag extraction against a small checked-in
  fixture (a hand-trimmed companyfacts, never a live fetch); missing-tag
  paths return `null`; cache TTL expiry.
- Mentor mode — test the prompt builders and the JSON response parser against
  fixtures. **Never make a live API call in a test.**

`npx tsc -b` must pass before any task is marked done. Tests are excluded
from `tsc -b` via `tsconfig.app.json`; Vitest type-checks them.

---

## (k) Deployment

GitHub Pages via `.github/workflows/deploy.yml` on push to `main`. The
workflow sets `BASE_PATH=/<repo>/` and `vite.config.ts` reads it, so the same
build works on Vercel (where no env var is needed) and locally. Pages must be
enabled once with source "GitHub Actions" — an owner to-do.

Because there is no router and no server, there are no rewrite rules to get
wrong. If deep links are ever wanted, use hash routes (`#/mission/<id>`), not
paths.

Run the privacy grep from `CLAUDE.md` before every push — personal addresses,
private IP ranges, and absolute local paths must come back empty.

---

## (l) Risks and open questions

1. **EDGAR CORS is blocked (verified, section h).** Handled by the bundled
   snapshot. The real risk is a future session burning a day rediscovering
   it, which this document exists to prevent.
2. **`mentorOnly` missions inflate the rung denominator.** `rungStatus` sums
   `baseComp` over `missionsForRung(rung, mentor)`, so switching Mentor mode
   on raises `possible` and can un-pass a rung the player already passed.
   Two fixes: give mentor missions `baseComp: 0` (content-only, do this now),
   or change `rungStatus` to skip `mentorOnly` (an engine change, needs its
   own task and its own tests). **Do the content fix now; log the engine fix
   as a task.**
3. **Anthropic header names, model ids, and pricing drift.** Section (g) is a
   snapshot. The implementation task must begin by re-reading the docs and
   logging what it found under "Decisions" in `TASKS.md` with a date.
4. **Written grading is non-deterministic**, so `Mission.grade` cannot be
   pure for `written`. The `gradeAsync` split in section (b) preserves the
   engine's purity guarantee for every other kind. Do not weaken the
   signature of `grade`.
5. **Recharts on a 360px screen.** Axis labels and legends overflow. Budget
   real time for it, and prefer custom SVG for the football field, debt
   stack, flow, and heatmap.
6. **Open: how much partial credit is right for sliders?** The 2× tolerance
   ramp in (b) is a guess. Revisit after the owner plays Rung 4.
7. **Open: the auction scoring curve.** Winning by overpaying must score
   worse than losing, but not so much worse that the mission feels
   unwinnable. Needs playtesting.
8. **Open: does the capstone need its own task kind,** or can it be three
   chained missions? Chaining is cheaper. Decide at Milestone 5.

---

## (m) Roadmap

**Milestone 2 — Rung 1 complete.** Task kinds `sort`, `balance`, `quiz`
(grader plus tests each) → `src/missions/companies.ts` with Pucker Up →
`src/engine/voice.ts` → the five Rung 1 missions in curriculum order →
lesson-card visuals → the owner plays it and gives notes.

**Milestone 3 — Rungs 2–3.** Task kinds `waterfall`, `bridge`, `slider`,
`footballfield` → Ledgerly, Brickhouse, Nan's Pantry and the peer sets added
to `companies.ts` → the six Rung 2 missions → the six Rung 3 missions →
`src/components/charts/` shared plumbing.

**Milestone 4 — Mentor mode.** Re-check the docs and log the findings →
`src/lib/anthropic.ts`, `src/lib/prompts.ts`, `src/lib/pricing.ts` → task
kind `written` with `gradeAsync` → Ask the MD on result screens → the mock
interview → the cost display and session counter in Settings.

**Milestone 5 — Rungs 4–5.** `scripts/fetch-edgar.mjs` plus the snapshot plus
`src/lib/edgar.ts` → task kinds `heatmap` and `auction` → the six Rung 4
missions → the six Rung 5 missions → the closing-dinner screen.

**Milestone 6 — Polish.** Sounds, off by default → the share card →
drag-and-drop layered over tap for `order` and `sort` → PWA manifest → the
days-survived counter.

Order of work inside a milestone is always the same: the task kind first
(types → grader → tests → widget → `MissionScreen` case), then the missions
that use it; company data before any mission that quotes it; the boss fight
last.
