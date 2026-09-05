import type { Mission } from '../engine/types'
import { gradeBalance } from '../engine/graders/balance'
import { mdVerdict } from '../engine/voice'

/**
 * Rung 4, mission 4. A five-year DCF (discounted cash flow) never forecasts
 * forever: after year 5 it assumes free cash flow (FCF, cash left after
 * running and reinvesting in the business) grows at a constant rate for the
 * rest of time. That assumption collapses into one number, the terminal
 * value, via the Gordon growth model. This mission's inputs are a generic
 * illustrative DCF (not one of the fictional companies in companies.ts) —
 * PLAN.md section (d) specifies the raw figures directly.
 */

const YEAR5_FCF_K = 52_000 // $k, forecast year-5 free cash flow
const TERMINAL_GROWTH_PCT = 2.0 // % forever after year 5
const WACC_PCT = 8.3 // % discount rate
const PV_EXPLICIT_FCF_K = 200_000 // $k, PV of years 1-5 FCF (given, not graded)

/**
 * Gordon growth terminal value, set at the end of year 5:
 * TV = FCF_year5 x (1 + g) / (WACC - g).
 */
function terminalValue(fcf5K: number, growthPct: number, waccPct: number): number {
  const g = growthPct / 100
  const wacc = waccPct / 100
  return (fcf5K * (1 + g)) / (wacc - g)
}

/** Discount a value sitting `years` out back to today at `waccPct`. */
function presentValue(futureValueK: number, waccPct: number, years: number): number {
  return futureValueK / Math.pow(1 + waccPct / 100, years)
}

const rawTV = terminalValue(YEAR5_FCF_K, TERMINAL_GROWTH_PCT, WACC_PCT)
const rawPvTv = presentValue(rawTV, WACC_PCT, 5)

/** 52,000 x 1.02 / 0.063 = 841,904.76..., rounded to the nearest $k. */
const TERMINAL_VALUE_K = Math.round(rawTV)
/**
 * 841,904.76 / 1.083^5 = 565,093.98..., rounded to the nearest $k. The
 * mission brief guessed "565,7xx" without carrying full precision through
 * 1.083^5; the precise figure is 565,094 — used here and noted in TASKS.md.
 */
const PV_TERMINAL_VALUE_K = Math.round(rawPvTv)

const ENTERPRISE_VALUE_K = PV_EXPLICIT_FCF_K + PV_TERMINAL_VALUE_K
/** PV of terminal value as a share of total enterprise value, one decimal. */
const TV_SHARE_PCT = Math.round((PV_TERMINAL_VALUE_K / ENTERPRISE_VALUE_K) * 1000) / 10

const money = (n: number) => `$${n.toLocaleString('en-US')}k`

const TV_LINE = `Terminal value is next year's FCF over WACC minus growth: ${money(YEAR5_FCF_K)} x 1.02 / (8.3% - 2.0%) = ${money(YEAR5_FCF_K)} x 1.02 / 6.3% = ${money(TERMINAL_VALUE_K)}.`

const PV_TV_LINE = `Discount that back 5 years at WACC: ${money(TERMINAL_VALUE_K)} / 1.083^5 = ${money(PV_TERMINAL_VALUE_K)}.`

const SHARE_LINE = `Enterprise value is the PV of years 1-5 FCF (${money(PV_EXPLICIT_FCF_K)}) plus the PV of terminal value (${money(PV_TERMINAL_VALUE_K)}) = ${money(ENTERPRISE_VALUE_K)}. Terminal value alone is ${TV_SHARE_PCT}% of that.`

const mission: Mission = {
  id: 'r4-terminal-value',
  rung: 4,
  order: 4,
  title: 'The tail that wags the DCF',
  tagline: 'Five years of careful forecasting, then one guess about forever.',
  baseComp: 9_000,
  parSeconds: 180,
  lesson: {
    title: 'The Gordon growth model',
    body:
      "A discounted cash flow (DCF) values a company by its future free cash flow (FCF, cash left after running and reinvesting), discounted back to today. Nobody forecasts forever, so after five years the model assumes FCF grows at one constant rate forever — the Gordon growth model. Terminal value = next year's FCF divided by (WACC minus growth rate); WACC (weighted average cost of capital, the blended rate a company pays for its money) is the discount rate. That number then gets discounted back to today like any other cash flow. It usually towers over the five forecast years before it — often 60-80% of the whole DCF, a guess about growth decades out.",
    visual: {
      kind: 'bullets',
      items: [
        'Year-5 FCF: $52,000k, growing at 2.0% forever after',
        `Terminal value: ${money(TERMINAL_VALUE_K)}`,
        `Its present value: ${money(PV_TERMINAL_VALUE_K)}, ${TV_SHARE_PCT}% of enterprise value`,
      ],
    },
  },
  task: {
    kind: 'balance',
    prompt:
      'A five-year DCF just ran out of explicit forecast. Apply the Gordon growth model to find what happens after year 5, then discount it back to today.',
    unit: '$k',
    tolerance: 1_000,
    sections: [
      {
        id: 'inputs',
        label: 'DCF inputs',
        role: 'neutral',
        lines: [
          { id: 'year5-fcf', label: 'Year-5 free cash flow', value: YEAR5_FCF_K, unit: '$k' },
          { id: 'terminal-growth', label: 'Terminal growth rate', value: TERMINAL_GROWTH_PCT, unit: '%' },
          { id: 'wacc', label: 'WACC', value: WACC_PCT, unit: '%' },
          { id: 'pv-explicit-fcf', label: 'PV of years 1-5 FCF', value: PV_EXPLICIT_FCF_K, unit: '$k' },
        ],
      },
      {
        id: 'terminal-value-section',
        label: 'Terminal value',
        role: 'neutral',
        lines: [
          {
            id: 'terminal-value',
            label: 'Terminal value (at year 5)',
            answer: TERMINAL_VALUE_K,
            note: "Year-5 FCF x (1 + growth) / (WACC - growth)",
          },
          {
            id: 'pv-terminal-value',
            label: 'PV of terminal value (today)',
            answer: PV_TERMINAL_VALUE_K,
            note: 'Terminal value discounted back 5 years at WACC',
          },
        ],
      },
    ],
  },
  grade(answer) {
    if (answer.kind !== 'balance') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'balance') throw new Error('wrong task kind')
    return gradeBalance(mission.task, answer, ({ accuracy, wrongIds }) => {
      if (accuracy === 1) {
        return {
          verdict: mdVerdict(accuracy, mission.id),
          explanation: `${TV_LINE} ${PV_TV_LINE} ${SHARE_LINE}`,
        }
      }
      if (accuracy === 0) {
        return {
          verdict: mdVerdict(accuracy, mission.id),
          explanation: `Neither blank landed. ${TV_LINE} ${PV_TV_LINE} ${SHARE_LINE}`,
        }
      }
      const hints: string[] = []
      if (wrongIds.includes('terminal-value')) hints.push(TV_LINE)
      if (wrongIds.includes('pv-terminal-value')) hints.push(PV_TV_LINE)
      hints.push(SHARE_LINE)
      return {
        verdict: mdVerdict(accuracy, mission.id),
        explanation: hints.join(' '),
      }
    })
  },
}

export default mission
