import type { Mission } from '../engine/types'
import { gradeBalance } from '../engine/graders/balance'
import { mdVerdict } from '../engine/voice'
import { LEDGERLY, margin } from './companies'

const { revenue, grossProfit, ebitda, netIncome } = LEDGERLY.income

const grossMarginPct = margin(grossProfit, revenue)
const ebitdaMarginPct = margin(ebitda, revenue)
const netMarginPct = margin(netIncome, revenue)

/**
 * Rung 2, mission 2. Ledgerly's income statement, turned into ratios. Fixed
 * figures from the Rung 2 company bible (fiscal year 2025). Not a real
 * balance sheet — section ids avoid "asset"/"liab"/"equity" so the widget
 * does not render the balance meter.
 */
const mission: Mission = {
  id: 'r2-margins',
  rung: 2,
  order: 2,
  title: 'Margin call',
  tagline: 'A ratio only means something next to another ratio.',
  baseComp: 6_000,
  parSeconds: 150,
  lesson: {
    title: 'A margin is profit divided by revenue',
    body:
      'A margin is a slice of revenue expressed as a percentage: margin = profit ÷ revenue × 100. Gross margin uses gross profit, EBITDA margin uses EBITDA, net margin uses net income — same divisor, different profit line. On its own a margin means nothing; it only means something next to another company\'s margin in the same industry. A grocer running a 3% EBIT margin is healthy, because groceries are a low-margin, high-volume business. A software company running 3% is dying, because SaaS is supposed to keep most of every dollar it brings in.',
    visual: {
      kind: 'bars',
      unit: '$k',
      items: [
        { label: 'Revenue', value: revenue, role: 'revenue' },
        { label: 'Gross profit', value: grossProfit, role: 'revenue' },
        { label: 'EBITDA', value: ebitda, role: 'equity' },
        { label: 'Net income', value: netIncome, role: 'cash' },
      ],
    },
  },
  task: {
    kind: 'balance',
    prompt: "Ledgerly's income statement, in $k. Turn each profit line into a margin.",
    unit: '%',
    tolerance: 0.1,
    sections: [
      {
        id: 'inputs',
        label: 'Income statement ($k)',
        role: 'neutral',
        lines: [
          { id: 'revenue', label: 'Revenue', value: revenue, unit: '$k' },
          { id: 'gross-profit', label: 'Gross profit', value: grossProfit, unit: '$k' },
          { id: 'ebitda', label: 'EBITDA', value: ebitda, unit: '$k' },
          { id: 'net-income', label: 'Net income', value: netIncome, unit: '$k' },
        ],
      },
      {
        id: 'margins',
        label: 'Margins',
        role: 'neutral',
        lines: [
          {
            id: 'gross-margin',
            label: 'Gross margin',
            answer: grossMarginPct,
            note: 'Gross profit divided by revenue',
          },
          {
            id: 'ebitda-margin',
            label: 'EBITDA margin',
            answer: ebitdaMarginPct,
            note: 'EBITDA divided by revenue',
          },
          {
            id: 'net-margin',
            label: 'Net margin',
            answer: netMarginPct,
            note: 'Net income divided by revenue',
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
          explanation:
            `Gross margin is gross profit divided by revenue: ${grossProfit.toLocaleString('en-US')} ÷ ${revenue.toLocaleString('en-US')} = ${grossMarginPct}%. EBITDA margin is EBITDA divided by revenue: ${ebitda.toLocaleString('en-US')} ÷ ${revenue.toLocaleString('en-US')} = ${ebitdaMarginPct}%. Net margin is net income divided by revenue: ${netIncome.toLocaleString('en-US')} ÷ ${revenue.toLocaleString('en-US')} = ${netMarginPct}%. Every margin uses the same divisor, revenue, so they only ever compare against another company's margins in the same industry.`,
        }
      }
      if (accuracy === 0) {
        return {
          verdict: mdVerdict(accuracy, mission.id),
          explanation:
            `Nothing lined up. Gross margin is gross profit divided by revenue: ${grossProfit.toLocaleString('en-US')} ÷ ${revenue.toLocaleString('en-US')} = ${grossMarginPct}%. EBITDA margin is EBITDA divided by revenue: ${ebitda.toLocaleString('en-US')} ÷ ${revenue.toLocaleString('en-US')} = ${ebitdaMarginPct}%. Net margin is net income divided by revenue: ${netIncome.toLocaleString('en-US')} ÷ ${revenue.toLocaleString('en-US')} = ${netMarginPct}%. Every one of them divides by the same number: revenue.`,
        }
      }
      const hints: string[] = []
      if (wrongIds.includes('gross-margin'))
        hints.push(
          `Gross margin is gross profit divided by revenue: ${grossProfit.toLocaleString('en-US')} ÷ ${revenue.toLocaleString('en-US')} = ${grossMarginPct}%.`,
        )
      if (wrongIds.includes('ebitda-margin'))
        hints.push(
          `EBITDA margin is EBITDA divided by revenue: ${ebitda.toLocaleString('en-US')} ÷ ${revenue.toLocaleString('en-US')} = ${ebitdaMarginPct}%.`,
        )
      if (wrongIds.includes('net-margin'))
        hints.push(
          `Net margin is net income divided by revenue: ${netIncome.toLocaleString('en-US')} ÷ ${revenue.toLocaleString('en-US')} = ${netMarginPct}%.`,
        )
      hints.push('Same divisor every time, revenue, so a margin only means something next to a same-industry peer.')
      return {
        verdict: mdVerdict(accuracy, mission.id),
        explanation: hints.join(' '),
      }
    })
  },
}

export default mission
