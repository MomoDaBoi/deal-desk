import type { Mission } from '../engine/types'
import { gradeSlider } from '../engine/graders/slider'
import { mdVerdict } from '../engine/voice'
import { BRICKHOUSE } from './companies'

/**
 * Rung 5, mission 1. A leveraged buyout (LBO): buy Brickhouse mostly with
 * borrowed money, hold it, pay down the debt, sell it. The player sets how
 * much debt to use (leverage) and what multiple the exit sells at; the
 * model — hold period, EBITDA growth, debt paydown pace — lives entirely in
 * this file as pure functions so the test can recompute every number
 * independently. All dollar figures are in $k, the company bible's
 * convention (src/missions/companies.ts).
 */

const ENTRY_EBITDA = BRICKHOUSE.income.ebitda // 96,000
/** The deal's purchase price. ~8.3x entry EBITDA, per the mission brief. */
const ENTRY_EV = 800_000
const HOLD_YEARS = 5
/** EBITDA compounds at this rate every year of the hold. */
const EBITDA_GROWTH_PCT = 0.05
/** Share of each year's EBITDA swept to pay down debt (the rest funds capex, taxes, interest, etc. — not modelled here). */
const PAYDOWN_SHARE = 0.6

/** EBITDA for each year of the hold, compounding from entry. Index 0 is year 1, the last entry is the exit-year EBITDA. */
export function ebitdaPath(entryEbitda: number, growthPct: number, years: number): number[] {
  const path: number[] = []
  let ebitda = entryEbitda
  for (let year = 0; year < years; year++) {
    ebitda = ebitda * (1 + growthPct)
    path.push(ebitda)
  }
  return path
}

export interface LboOutcome {
  debtEntry: number
  equityIn: number
  totalPaydown: number
  /** Portion of totalPaydown actually applied to debt (capped at debtEntry). */
  usedPaydown: number
  /** Portion of totalPaydown left over once debt hits zero, banked as cash. */
  excessCash: number
  debtRemaining: number
  exitEbitda: number
  exitEV: number
  equityOut: number
  /** Annualized, as a fraction (0.221... not 22.1). */
  irr: number
}

/**
 * The whole LBO model. `leverageX` and `exitMultipleX` are the two things
 * the player controls; everything else is fixed by the constants above.
 * Debt entry = leverageX × entry EBITDA. Every hold year sweeps
 * `PAYDOWN_SHARE` of that year's (grown) EBITDA toward debt paydown; once
 * debt hits zero, the rest of the sweep just piles up as cash on the balance
 * sheet instead of vanishing. Exit EV = exitMultipleX × exit-year EBITDA.
 * Equity in is EV less debt at entry; equity out is exit EV less remaining
 * debt plus any banked cash. IRR is the 5-year annualized return.
 */
export function computeLboOutcome(leverageX: number, exitMultipleX: number): LboOutcome {
  const debtEntry = leverageX * ENTRY_EBITDA
  const equityIn = ENTRY_EV - debtEntry
  const path = ebitdaPath(ENTRY_EBITDA, EBITDA_GROWTH_PCT, HOLD_YEARS)
  const totalPaydown = path.reduce((sum, ebitda) => sum + PAYDOWN_SHARE * ebitda, 0)
  const usedPaydown = Math.min(debtEntry, totalPaydown)
  const excessCash = totalPaydown - usedPaydown
  const debtRemaining = debtEntry - usedPaydown
  const exitEbitda = path[path.length - 1]!
  const exitEV = exitMultipleX * exitEbitda
  const equityOut = exitEV - debtRemaining + excessCash
  const irr = equityIn > 0 ? Math.pow(equityOut / equityIn, 1 / HOLD_YEARS) - 1 : 0
  return { debtEntry, equityIn, totalPaydown, usedPaydown, excessCash, debtRemaining, exitEbitda, exitEV, equityOut, irr }
}

const LEVERAGE_ANSWER = 5.0
const EXIT_ANSWER = 8.3
const ANSWER = computeLboOutcome(LEVERAGE_ANSWER, EXIT_ANSWER)

const moneyK = (n: number) => `$${Math.round(n).toLocaleString('en-US')}k`
const pct = (n: number) => `${(n * 100).toFixed(1)}%`

const LEVERAGE_LINE = `Leverage sets the debt: ${LEVERAGE_ANSWER.toFixed(1)}x entry EBITDA of ${moneyK(ENTRY_EBITDA)} is ${moneyK(ANSWER.debtEntry)} of debt, leaving a ${moneyK(ANSWER.equityIn)} equity check (${moneyK(ENTRY_EV)} purchase price minus that debt).`

const EXIT_LINE = `The exit multiple sets the sale price: ${EXIT_ANSWER.toFixed(1)}x on year-5 EBITDA of ${moneyK(ANSWER.exitEbitda)} is a ${moneyK(ANSWER.exitEV)} exit enterprise value. After repaying the ${moneyK(ANSWER.debtRemaining)} of debt still outstanding, equity out is ${moneyK(ANSWER.equityOut)} — a ${pct(ANSWER.irr)} IRR over the ${HOLD_YEARS}-year hold.`

const QUESTION_LINE = `Debt paydown swept ${moneyK(ANSWER.usedPaydown)} off the balance sheet over the hold — more value than EBITDA growth added and far more than the flat exit multiple (which added nothing, since it matched the entry multiple). Paying down debt did most of the work.`

const mission: Mission = {
  id: 'r5-lbo-basics',
  rung: 5,
  order: 1,
  title: 'The buyout',
  tagline: 'Buy it with someone else’s money. Sell it with the debt gone.',
  baseComp: 10_000,
  parSeconds: 180,
  lesson: {
    title: 'How an LBO makes money',
    body:
      "A leveraged buyout (LBO) buys a company mostly with borrowed money (debt), plus a smaller slice of cash — the equity check. Debt is sized as a multiple of EBITDA (earnings before interest, taxes, depreciation and amortization): that multiple is the leverage. Each hold year, cash flow pays down some debt, shrinking what is owed. At the end, the buyer sells at an exit multiple of that year's EBITDA — the exit enterprise value (EV, the whole business, debt included). Equity out is exit EV minus remaining debt; IRR (internal rate of return, the annualized return on the equity check) measures the payoff. Paying down debt usually drives more gain than a fancier exit price.",
    visual: {
      kind: 'bullets',
      items: [
        'Buy Brickhouse for $800,000k, mostly with debt',
        'Debt shrinks every year the company holds it',
        'Sell later for exit multiple x that year’s EBITDA',
      ],
    },
  },
  task: {
    kind: 'slider',
    prompt:
      "Buy Brickhouse Industrial for $800,000k enterprise value (about 8.3x its $96,000k EBITDA). Set the leverage — debt as a multiple of EBITDA — and the multiple you expect to exit at 5 years later.",
    sliders: [
      {
        id: 'leverage',
        label: 'Leverage',
        min: 2,
        max: 7,
        step: 0.5,
        answer: LEVERAGE_ANSWER,
        tolerance: 0.5,
        unit: 'x',
        role: 'debt',
        hint: 'Debt as a multiple of entry EBITDA ($96,000k). More leverage = less equity in, more debt to pay down.',
      },
      {
        id: 'exit',
        label: 'Exit multiple',
        min: 6,
        max: 11,
        step: 0.1,
        answer: EXIT_ANSWER,
        tolerance: 0.3,
        unit: 'x',
        role: 'equity',
        hint: 'What a buyer pays for Brickhouse’s EBITDA in 5 years, applied to that year’s (grown) EBITDA.',
      },
    ],
    readouts: [
      {
        id: 'debtEntry',
        label: 'Debt at entry ($k)',
        unit: '$',
        role: 'debt',
        compute: (values) => computeLboOutcome(values.leverage ?? LEVERAGE_ANSWER, values.exit ?? EXIT_ANSWER).debtEntry,
      },
      {
        id: 'equityIn',
        label: 'Equity in ($k)',
        unit: '$',
        role: 'equity',
        compute: (values) => computeLboOutcome(values.leverage ?? LEVERAGE_ANSWER, values.exit ?? EXIT_ANSWER).equityIn,
      },
      {
        id: 'equityOut',
        label: 'Equity out ($k)',
        unit: '$',
        role: 'cash',
        compute: (values) => computeLboOutcome(values.leverage ?? LEVERAGE_ANSWER, values.exit ?? EXIT_ANSWER).equityOut,
      },
      {
        id: 'irr',
        label: 'IRR (%)',
        unit: '%',
        role: 'revenue',
        compute: (values) => computeLboOutcome(values.leverage ?? LEVERAGE_ANSWER, values.exit ?? EXIT_ANSWER).irr * 100,
      },
    ],
    chart: {
      label: 'Equity in vs equity out ($k)',
      unit: '$',
      series: (values) => {
        const outcome = computeLboOutcome(values.leverage ?? LEVERAGE_ANSWER, values.exit ?? EXIT_ANSWER)
        return [
          { label: 'Equity in', value: outcome.equityIn, role: 'equity' },
          { label: 'Equity out', value: outcome.equityOut, role: 'cash' },
        ]
      },
    },
    question: {
      text: 'Where did most of the return come from?',
      choices: [
        { id: 'paydown', label: 'Paying down the debt' },
        { id: 'multiple', label: 'A higher exit multiple' },
        { id: 'growth', label: 'EBITDA growth' },
      ],
      correctId: 'paydown',
      explanation: QUESTION_LINE,
      weight: 0.4,
    },
  },
  grade(answer) {
    if (answer.kind !== 'slider') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'slider') throw new Error('wrong task kind')
    return gradeSlider(mission.task, answer, ({ accuracy, wrongIds }) => {
      if (accuracy === 1) {
        return {
          verdict: 'Levered it up, paid it down, cashed out. The MD is begrudgingly impressed.',
          explanation: `${LEVERAGE_LINE} ${EXIT_LINE} ${QUESTION_LINE}`,
        }
      }
      if (accuracy === 0) {
        return {
          verdict: mdVerdict(0, 'r5-lbo-basics'),
          explanation: `Nothing here lines up. ${LEVERAGE_LINE} ${EXIT_LINE} ${QUESTION_LINE}`,
        }
      }
      const parts: string[] = []
      if (wrongIds.includes('leverage')) parts.push(LEVERAGE_LINE)
      if (wrongIds.includes('exit')) parts.push(EXIT_LINE)
      if (wrongIds.includes('question')) parts.push(QUESTION_LINE)
      return {
        verdict: mdVerdict(accuracy, 'r5-lbo-basics'),
        explanation: parts.join(' '),
      }
    })
  },
}

export default mission
