import type { Mission } from '../engine/types'
import { gradeBalance } from '../engine/graders/balance'
import { LEDGERLY, cagr, growth } from './companies'

/**
 * Rung 2, mission 3. Ledgerly Inc.'s growth rates: year-over-year growth for
 * revenue and gross profit, plus a 3-year revenue CAGR. Fixed figures from
 * the Rung 2 company bible (fiscal year 2025), except `REVENUE_3YR_AGO`,
 * which the bible does not carry — it is a scripted third data point chosen
 * so the CAGR resolves cleanly (40,960 × 1.25^3 = 80,000).
 */

const REVENUE_2025 = LEDGERLY.income.revenue // 80,000
const REVENUE_2024 = LEDGERLY.priorYear!.revenue // 64,000
const GROSS_PROFIT_2025 = LEDGERLY.income.grossProfit // 60,000
const GROSS_PROFIT_2024 = LEDGERLY.priorYear!.grossProfit! // 47,400
const REVENUE_3YR_AGO = 40_960 // FY2022, not in the bible — see note above

const REVENUE_GROWTH = growth(REVENUE_2025, REVENUE_2024) // 25.0
const GROSS_PROFIT_GROWTH = growth(GROSS_PROFIT_2025, GROSS_PROFIT_2024) // 26.6
const REVENUE_CAGR = cagr(REVENUE_3YR_AGO, REVENUE_2025, 3) // 25.0

const mission: Mission = {
  id: 'r2-growth-rates',
  rung: 2,
  order: 3,
  title: 'Growth rates',
  tagline: 'This year over last year, minus one. Never the other way round.',
  baseComp: 5_000,
  parSeconds: 120,
  lesson: {
    title: 'This year ÷ last year, minus one',
    body:
      'A growth rate compares two periods: (this year ÷ last year) − 1, as a percent. The denominator is always the prior year — the base you grew from. Divide by this year instead and the answer shrinks and lies. Ledgerly grew revenue from $64,000k (FY2024) to $80,000k (FY2025), a real 25% climb. CAGR (compound annual growth rate) answers a longer question: what single, constant yearly rate — compounding, meaning each year builds on the prior year’s already-grown total, not the original number — carries $40,960k in FY2022 to $80,000k in FY2025 across three years?',
    visual: {
      kind: 'bullets',
      items: [
        'Revenue: $64,000k (FY2024) → $80,000k (FY2025)',
        'Gross profit: $47,400k (FY2024) → $60,000k (FY2025)',
        'Revenue three years ago: $40,960k',
      ],
    },
  },
  task: {
    kind: 'balance',
    prompt: 'Fill in Ledgerly’s growth rates from the figures above.',
    unit: '%',
    tolerance: 0.1,
    sections: [
      {
        id: 'inputs',
        label: 'Income statement',
        role: 'revenue',
        lines: [
          { id: 'revenue-2024', label: 'Revenue, FY2024', value: REVENUE_2024 },
          { id: 'revenue-2025', label: 'Revenue, FY2025', value: REVENUE_2025 },
          { id: 'gross-profit-2024', label: 'Gross profit, FY2024', value: GROSS_PROFIT_2024 },
          { id: 'gross-profit-2025', label: 'Gross profit, FY2025', value: GROSS_PROFIT_2025 },
          { id: 'revenue-3yr-ago', label: 'Revenue, FY2022 (three years ago)', value: REVENUE_3YR_AGO },
        ],
      },
      {
        id: 'growth',
        label: 'Growth rates',
        role: 'revenue',
        lines: [
          {
            id: 'revenue-growth',
            label: 'Revenue growth, FY2024 → FY2025',
            answer: REVENUE_GROWTH,
            note: 'FY2025 ÷ FY2024 − 1',
          },
          {
            id: 'gross-profit-growth',
            label: 'Gross profit growth, FY2024 → FY2025',
            answer: GROSS_PROFIT_GROWTH,
            note: 'FY2025 ÷ FY2024 − 1',
          },
          {
            id: 'revenue-cagr',
            label: '3-year revenue CAGR, FY2022 → FY2025',
            answer: REVENUE_CAGR,
            note: '(FY2025 ÷ FY2022)^(1/3) − 1',
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
          verdict: 'Fine. Do not let it go to your head.',
          explanation:
            `Revenue growth is FY2025 ÷ FY2024 − 1: ${REVENUE_2025.toLocaleString()} ÷ ${REVENUE_2024.toLocaleString()} − 1 = 1.25 − 1 = ${REVENUE_GROWTH}%. Gross profit growth is the same formula on gross profit: ${GROSS_PROFIT_2025.toLocaleString()} ÷ ${GROSS_PROFIT_2024.toLocaleString()} − 1 ≈ 1.2658 − 1 = ${GROSS_PROFIT_GROWTH}%. The 3-year CAGR compounds from the oldest year: (${REVENUE_2025.toLocaleString()} ÷ ${REVENUE_3YR_AGO.toLocaleString()})^(1/3) − 1 = 1.953125^(1/3) − 1 = 1.25 − 1 = ${REVENUE_CAGR}%. Every denominator is the earlier year.`,
        }
      }
      if (accuracy === 0) {
        return {
          verdict: 'Did you even open the file?',
          explanation:
            `Nothing lined up. Revenue growth is FY2025 ÷ FY2024 − 1: ${REVENUE_2025.toLocaleString()} ÷ ${REVENUE_2024.toLocaleString()} − 1 = ${REVENUE_GROWTH}%. Gross profit growth is ${GROSS_PROFIT_2025.toLocaleString()} ÷ ${GROSS_PROFIT_2024.toLocaleString()} − 1 = ${GROSS_PROFIT_GROWTH}%. The 3-year CAGR is (${REVENUE_2025.toLocaleString()} ÷ ${REVENUE_3YR_AGO.toLocaleString()})^(1/3) − 1 = ${REVENUE_CAGR}%. In every case the denominator is the OLDER year — the base you grew from, not the year you ended up in.`,
        }
      }
      const hints: string[] = []
      if (wrongIds.includes('revenue-growth'))
        hints.push(
          `Revenue growth divides by the prior year: ${REVENUE_2025.toLocaleString()} ÷ ${REVENUE_2024.toLocaleString()} − 1 = ${REVENUE_GROWTH}%. The classic mistake is dividing by the current year instead — (${REVENUE_2025.toLocaleString()} − ${REVENUE_2024.toLocaleString()}) ÷ ${REVENUE_2025.toLocaleString()} gives a wrong, smaller 20.0%.`,
        )
      if (wrongIds.includes('gross-profit-growth'))
        hints.push(
          `Gross profit growth is the same formula on gross profit, not revenue: ${GROSS_PROFIT_2025.toLocaleString()} ÷ ${GROSS_PROFIT_2024.toLocaleString()} − 1 ≈ ${GROSS_PROFIT_GROWTH}%.`,
        )
      if (wrongIds.includes('revenue-cagr'))
        hints.push(
          `The 3-year CAGR is not simple growth divided by three years — it compounds: (${REVENUE_2025.toLocaleString()} ÷ ${REVENUE_3YR_AGO.toLocaleString()})^(1/3) − 1 = 1.953125^(1/3) − 1 = ${REVENUE_CAGR}%, the constant yearly rate that gets from ${REVENUE_3YR_AGO.toLocaleString()} to ${REVENUE_2025.toLocaleString()} in three compounding steps.`,
        )
      hints.push('Every growth rate here divides by the earlier year — the base you grew from, never the year you landed on.')
      const verdict =
        accuracy >= 0.75
          ? 'Close. "Close" is what we say at the deposition.'
          : accuracy >= 0.5
            ? 'pls fix.'
            : 'This is not going in the pitch book.'
      return {
        verdict,
        explanation: hints.join(' '),
      }
    })
  },
}

export default mission
