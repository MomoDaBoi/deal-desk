import type { Mission, MentorClient } from '../engine/types'
import { offlineWrittenGrade, mentorResultToGrade } from '../engine/graders/written'
import { BRICKHOUSE } from './companies'
import { fcfPath } from './r4-fcf-forecast'

/**
 * Rung 4, mentor-only. The player has just built a WACC × terminal-growth
 * sensitivity table for Brickhouse (see the Rung 4 heatmap mission); now the
 * CFO pushes back that the resulting DCF range is "too wide to be useful."
 * The defence is the actual skill — every real DCF is a range, and knowing
 * why is what separates an analyst from someone who plugged numbers into a
 * template.
 *
 * All figures below are computed here with pure DCF helpers, not re-typed
 * from PLAN.md, so this file and its tests always agree with each other.
 * The five-year free-cash-flow path reuses `fcfPath` from
 * `r4-fcf-forecast.ts` (management's case: 6%, 6%, 5%, 5%, 4% off
 * Brickhouse's $640,000k base revenue) — the same cash flows the rung-4
 * sensitivity table grades against, so this mission's numbers can never
 * drift from the grid the player just filled in. WACC (8.3%) and
 * Brickhouse's market enterprise value ($800,000k = $580,000k equity +
 * $220,000k net debt) come straight from the company bible in
 * `companies.ts`.
 */

/** Sum of `fcfs`, each discounted back at `wacc` from its own year (1-indexed). */
function presentValueOfFcfs(fcfs: number[], wacc: number): number {
  return fcfs.reduce((sum, fcf, i) => sum + fcf / Math.pow(1 + wacc, i + 1), 0)
}

/** Gordon-growth terminal value as of the final forecast year (not yet discounted to today). */
function terminalValue(finalYearFcf: number, wacc: number, g: number): number {
  return (finalYearFcf * (1 + g)) / (wacc - g)
}

/** Enterprise value: PV of the explicit FCFs plus the PV of the terminal value. */
function enterpriseValue(fcfs: number[], wacc: number, g: number): number {
  const n = fcfs.length
  return presentValueOfFcfs(fcfs, wacc) + terminalValue(fcfs[n - 1], wacc, g) / Math.pow(1 + wacc, n)
}

const FCF_PATH = fcfPath([6, 6, 5, 5, 4])
const BASE_WACC = 0.083
const BASE_G = 0.02
/** +/- 1 percentage point either side of base, the spread this mission's sensitivity table uses. */
const DELTA = 0.01

const BASE_EV = Math.round(enterpriseValue(FCF_PATH, BASE_WACC, BASE_G))
/** Conservative corner: highest WACC, lowest growth. */
const LOW_EV = Math.round(enterpriseValue(FCF_PATH, BASE_WACC + DELTA, BASE_G - DELTA))
/** Aggressive corner: lowest WACC, highest growth. */
const HIGH_EV = Math.round(enterpriseValue(FCF_PATH, BASE_WACC - DELTA, BASE_G + DELTA))

/** How much EV moves across a two-point WACC band (base -1pt to base +1pt), growth held at base. */
const WACC_SWING = Math.round(
  enterpriseValue(FCF_PATH, BASE_WACC - DELTA, BASE_G) - enterpriseValue(FCF_PATH, BASE_WACC + DELTA, BASE_G),
)
/** How much EV moves across a two-point growth band (base -1pt to base +1pt), WACC held at base. */
const GROWTH_SWING = Math.round(
  enterpriseValue(FCF_PATH, BASE_WACC, BASE_G + DELTA) - enterpriseValue(FCF_PATH, BASE_WACC, BASE_G - DELTA),
)
const MOST_SENSITIVE: 'WACC' | 'terminal growth' = WACC_SWING >= GROWTH_SWING ? 'WACC' : 'terminal growth'

const MARKET_EV = BRICKHOUSE.market!.ev

function fmt(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}k`
}

const mission: Mission = {
  id: 'm4-written-defend',
  rung: 4,
  order: 7,
  title: 'Defend the range',
  tagline: 'The CFO thinks a wide range means you have not made up your mind. Prove it is rigor.',
  baseComp: 0,
  parSeconds: 300,
  mentorOnly: true,
  lesson: {
    title: 'A range is not a shrug',
    body:
      "A discounted cash flow (DCF) discounts a company's future free cash flow back to today at the weighted average cost of capital (WACC) — the blended return debt and equity holders demand — then adds a terminal value, a single number standing in for every year after the forecast, which is usually most of the answer. WACC and the terminal growth rate (g, how fast cash flow grows forever after the forecast) are both estimates, not facts, so a single-point DCF is false precision. A sensitivity table reruns the DCF across a grid of WACC and g values and reports the resulting range — evidence of rigor, not indecision.",
    visual: {
      kind: 'bullets',
      items: [
        'DCF: discount future free cash flow at WACC, then add a terminal value',
        'WACC: the blended cost of debt and equity capital',
        'Terminal growth (g): the cash-flow growth rate assumed forever after the forecast',
        'Sensitivity table: reruns the DCF across a WACC x g grid instead of quoting one number',
      ],
    },
  },
  task: {
    kind: 'written',
    prompt: 'The CFO says your DCF range is too wide to be useful. Defend it in under 100 words.',
    wordLimit: 100,
    rubric: [
      'Explains that a DCF is only as good as its inputs (WACC and terminal growth), which are estimates, not facts',
      'Shows the range comes from a sensitivity table, not indecision',
      `States which single input moves the value most in this case (${MOST_SENSITIVE})`,
      'Ends with a recommendation the CFO can actually act on',
    ],
    modelAnswer:
      `A DCF is only as good as its inputs, and WACC and terminal growth are estimates, not facts, so a single-point answer would be false precision. The range comes from a sensitivity table: across WACC 7.3%-9.3% and growth 1%-3%, enterprise value spans ${fmt(LOW_EV)} to ${fmt(HIGH_EV)}, comfortably bracketing Brickhouse's own market EV of ${fmt(MARKET_EV)}. ${MOST_SENSITIVE} moves the answer more than the other input here — a two-point band (+/-1 point either side of base) moves value about ${fmt(WACC_SWING)} versus ${fmt(GROWTH_SWING)}. Recommendation: anchor on the ${fmt(BASE_EV)} base case and treat the market's price as fair, not cheap.`,
  },
  grade(answer) {
    if (answer.kind !== 'written') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'written') throw new Error('wrong task kind')
    return offlineWrittenGrade(mission.task)
  },
  async gradeAsync(answer, mentor: MentorClient) {
    if (answer.kind !== 'written') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'written') throw new Error('wrong task kind')
    const task = mission.task
    const result = await mentor.gradeWritten({
      missionTitle: mission.title,
      question: task.prompt,
      rubric: task.rubric,
      modelAnswer: task.modelAnswer,
      answer: answer.text,
      wordLimit: task.wordLimit,
    })
    return mentorResultToGrade(task, result)
  },
}

export default mission
