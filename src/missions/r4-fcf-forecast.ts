import type { Mission } from '../engine/types'
import { gradeSlider } from '../engine/graders/slider'
import { mdVerdict } from '../engine/voice'
import { BRICKHOUSE } from './companies'

/**
 * Rung 4, mission 3. A DCF (discounted cash flow) is only as good as the
 * revenue growth path feeding it. The player sets five years of Brickhouse
 * Industrial revenue growth and watches the resulting unlevered free cash
 * flow (FCF) redraw live; the target is management's own five-year case.
 * Base revenue is Brickhouse's bible entry (src/missions/companies.ts) so
 * this mission's starting point can never drift from rung 3's numbers.
 *
 * FCF model (all percentages of that year's revenue unless noted):
 *   EBITDA margin      15%
 *   D&A                5% of revenue
 *   EBIT               EBITDA - D&A = 10% of revenue
 *   Tax                25% of EBIT
 *   Capex              5.5% of revenue
 *   Change in NWC      10% of the year-over-year revenue increase
 *   Unlevered FCF       EBIT x (1 - tax rate) + D&A - capex - change in NWC
 */

const BASE_REVENUE_K = BRICKHOUSE.income.revenue // 640,000, Brickhouse's current-year revenue
const EBITDA_MARGIN_PCT = 15
const DA_PCT_OF_REVENUE = 5
const TAX_RATE_PCT = 25
const CAPEX_PCT_OF_REVENUE = 5.5
const NWC_PCT_OF_REVENUE_INCREASE = 10

/** Management's five-year revenue growth case, the sliders' target. */
const MANAGEMENT_CASE: [number, number, number, number, number] = [6, 6, 5, 5, 4]

const YEAR_IDS = ['g1', 'g2', 'g3', 'g4', 'g5'] as const
type YearId = (typeof YEAR_IDS)[number]

/** Read the five growth-slider values out of a values record, in year order, defaulting a missing entry to 0. */
function growthValues(values: Record<string, number>): number[] {
  return YEAR_IDS.map((id) => values[id] ?? 0)
}

/** Revenue for each of the five forecast years, compounding off `BASE_REVENUE_K`. */
export function revenuePath(growthPcts: number[]): number[] {
  const path: number[] = []
  let prev = BASE_REVENUE_K
  for (const g of growthPcts) {
    const rev = prev * (1 + g / 100)
    path.push(rev)
    prev = rev
  }
  return path
}

/**
 * Unlevered free cash flow for each of the five forecast years, in $k.
 * EBIT is EBITDA minus D&A (10% of revenue given the margins above), taxed
 * at 25%, plus the D&A add-back, minus capex and the change in net working
 * capital (10% of that year's revenue increase over the prior year).
 */
export function fcfPath(growthPcts: number[]): number[] {
  const revenues = revenuePath(growthPcts)
  return revenues.map((rev, i) => {
    const prevRev = i === 0 ? BASE_REVENUE_K : revenues[i - 1]
    const ebitda = rev * (EBITDA_MARGIN_PCT / 100)
    const da = rev * (DA_PCT_OF_REVENUE / 100)
    const ebit = ebitda - da
    const nopat = ebit * (1 - TAX_RATE_PCT / 100)
    const capex = rev * (CAPEX_PCT_OF_REVENUE / 100)
    const dNwc = (NWC_PCT_OF_REVENUE_INCREASE / 100) * (rev - prevRev)
    return nopat + da - capex - dNwc
  })
}

const MANAGEMENT_FCF_K = fcfPath(MANAGEMENT_CASE)
const MANAGEMENT_FCF_ROUNDED = MANAGEMENT_FCF_K.map((v) => Math.round(v))

/**
 * The lesson's worked example: management's case (6% in year 1) missed by
 * one point (5% instead) with every later year unchanged. Growth compounds,
 * so a single early miss still drags down year-5 FCF even though nothing
 * about years 2-5 changed.
 */
const MISSED_YEAR1_CASE: [number, number, number, number, number] = [5, 6, 5, 5, 4]
const MISSED_YEAR1_FCF_K = fcfPath(MISSED_YEAR1_CASE)
const YEAR5_DELTA_K = Math.round(MANAGEMENT_FCF_K[4] - MISSED_YEAR1_FCF_K[4])

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}k`

const YEAR_LABELS: Record<YearId, string> = {
  g1: 'Year 1',
  g2: 'Year 2',
  g3: 'Year 3',
  g4: 'Year 4',
  g5: 'Year 5',
}

const MANAGEMENT_LINE = `Management's case grows revenue ${MANAGEMENT_CASE.map((g) => `${g.toFixed(1)}%`).join(', ')} over five years off a $${BASE_REVENUE_K.toLocaleString('en-US')}k base, turning into free cash flow of ${MANAGEMENT_FCF_ROUNDED.map((v) => money(v)).join(', ')} in years 1 through 5.`

const SENSITIVITY_LINE = `Growth compounds: miss year 1 alone by a single point (5.0% instead of 6.0%) with every later year unchanged, and year-5 FCF still falls from ${money(MANAGEMENT_FCF_K[4])} to ${money(MISSED_YEAR1_FCF_K[4])} — about ${money(YEAR5_DELTA_K)} lower — because every later year compounds off a smaller base.`

const mission: Mission = {
  id: 'r4-fcf-forecast',
  rung: 4,
  order: 3,
  title: 'Forecasting the cash',
  tagline: 'Five growth assumptions in, five years of free cash flow out.',
  baseComp: 10_000,
  parSeconds: 210,
  lesson: {
    title: 'Free cash flow: what is left after running and reinvesting',
    body:
      "Free cash flow (FCF) is the cash a business generates after running operations and reinvesting in itself — the cash actually available to lenders and shareholders. Start from EBIT (earnings before interest and taxes), apply the tax rate to get after-tax operating profit, add back D&A (depreciation and amortization, a non-cash expense), then subtract capex (cash spent on plant and equipment) and the increase in net working capital (NWC: cash tied up funding more receivables and inventory as revenue grows). Every driver scales off revenue, so the growth rate you set each year compounds through the whole five-year forecast — an early miss never stays contained to one year.",
    visual: {
      kind: 'bullets',
      items: [
        `Base revenue: $${BASE_REVENUE_K.toLocaleString('en-US')}k, EBITDA margin 15%`,
        'FCF = EBIT x (1 - tax) + D&A - capex - change in NWC',
        "Management's case: 6%, 6%, 5%, 5%, 4% revenue growth",
      ],
    },
  },
  task: {
    kind: 'slider',
    prompt:
      "Set Brickhouse Industrial's revenue growth for each of the next five years to match management's case, and watch the free-cash-flow forecast redraw as you go.",
    sliders: YEAR_IDS.map((id, i) => ({
      id,
      label: `${YEAR_LABELS[id]} revenue growth`,
      min: 0,
      max: 12,
      step: 0.5,
      answer: MANAGEMENT_CASE[i],
      tolerance: 0.5,
      unit: '%',
      role: 'revenue',
    })),
    readouts: YEAR_IDS.map((id, i) => ({
      id: `fcf${i + 1}`,
      label: `${YEAR_LABELS[id]} FCF`,
      unit: '$k',
      role: 'cash',
      compute: (values: Record<string, number>) => fcfPath(growthValues(values))[i],
    })),
    chart: {
      label: 'Free cash flow by year',
      unit: '$k',
      series: (values: Record<string, number>) =>
        fcfPath(growthValues(values)).map((fcf, i) => ({ label: YEAR_LABELS[YEAR_IDS[i]], value: fcf, role: 'cash' as const })),
    },
  },
  grade(answer) {
    if (answer.kind !== 'slider') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'slider') throw new Error('wrong task kind')
    return gradeSlider(mission.task, answer, ({ accuracy, wrongIds, results }) => {
      const wrongLines = results
        .filter((r) => wrongIds.includes(r.id))
        .map(
          (r) =>
            `${YEAR_LABELS[r.id as YearId]} growth: you set ${r.got.toFixed(1)}%, management's case is ${r.expected.toFixed(1)}%.`,
        )
      const parts = [MANAGEMENT_LINE]
      if (wrongLines.length > 0) {
        parts.push(...wrongLines)
      } else {
        parts.push('Every year matched the case exactly.')
      }
      parts.push(SENSITIVITY_LINE)
      return {
        verdict: mdVerdict(accuracy, mission.id),
        explanation: parts.join(' '),
      }
    })
  },
}

export default mission
