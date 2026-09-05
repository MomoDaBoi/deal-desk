import type { Mission } from '../engine/types'
import { gradeOrder } from '../engine/graders'

/** Rung 1, mission 2: reassemble the income statement top to bottom. */
const mission: Mission = {
  id: 'r1-income-statement-order',
  rung: 1,
  order: 2,
  title: 'Top to bottom',
  tagline: 'Put the income statement back in order before the MD notices.',
  baseComp: 5_000,
  parSeconds: 90,
  lesson: {
    title: 'The income statement is a staircase down',
    body:
      'An income statement starts with everything the company sold (revenue) and walks down, subtracting costs one group at a time, until only profit is left. Revenue minus the cost of making the product is gross profit. Take out the cost of running the business and you get operating profit. Pay the bank and the tax office, and what remains is net income. The order is the point: each line is the previous line minus something.',
    visual: {
      kind: 'waterfall',
      unit: '$k',
      items: [
        { label: 'Revenue', value: 1_200, total: true, role: 'revenue' },
        { label: 'COGS', value: -480, role: 'cost' },
        { label: 'Gross profit', value: 720, total: true, role: 'revenue' },
        { label: 'Opex', value: -420, role: 'cost' },
        { label: 'EBIT', value: 300, total: true, role: 'revenue' },
        { label: 'Interest', value: -30, role: 'debt' },
        { label: 'Taxes', value: -70, role: 'cost' },
        { label: 'Net income', value: 200, total: true, role: 'equity' },
      ],
    },
  },
  task: {
    kind: 'order',
    prompt: 'An intern dropped the income statement. Reassemble it, top to bottom.',
    items: [
      { id: 'revenue', label: 'Revenue', role: 'revenue' },
      { id: 'cogs', label: 'Cost of goods sold', role: 'cost' },
      { id: 'gross', label: 'Gross profit', role: 'revenue' },
      { id: 'opex', label: 'Operating expenses', role: 'cost' },
      { id: 'ebit', label: 'Operating profit (EBIT)', role: 'revenue' },
      { id: 'interest', label: 'Interest expense', role: 'debt' },
      { id: 'tax', label: 'Taxes', role: 'cost' },
      { id: 'net', label: 'Net income', role: 'equity' },
    ],
  },
  grade(answer) {
    if (answer.kind !== 'order') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'order') throw new Error('wrong task kind')
    return gradeOrder(mission.task.items, answer.orderedIds, ({ accuracy, wrongIds }) => {
      if (accuracy === 1) {
        return {
          verdict: 'Fine. Do not let it go to your head.',
          explanation:
            'You walked it correctly: revenue, minus cost of goods sold, gives gross profit. Minus operating expenses gives operating profit (EBIT). Minus interest and taxes gives net income. Every line is the one above it minus something.',
        }
      }
      const hints: string[] = []
      if (wrongIds.includes('revenue')) hints.push('Revenue is always the top line. Nothing comes before what customers paid.')
      if (wrongIds.includes('gross') || wrongIds.includes('cogs'))
        hints.push('Gross profit is revenue minus cost of goods sold, so COGS sits directly under revenue and gross profit directly under COGS.')
      if (wrongIds.includes('ebit') || wrongIds.includes('opex'))
        hints.push('Operating expenses (rent, salaries, marketing) come out of gross profit to give operating profit, also called EBIT.')
      if (wrongIds.includes('interest') || wrongIds.includes('tax'))
        hints.push('Lenders get paid before the tax office, so interest sits above taxes.')
      if (wrongIds.includes('net')) hints.push('Net income is the bottom line. Literally. Nothing goes below it.')
      const verdict =
        accuracy >= 0.75
          ? 'Close. "Close" is what we say at the deposition.'
          : accuracy >= 0.5
            ? 'pls fix.'
            : 'Did you assemble this with your eyes closed?'
      return {
        verdict,
        explanation:
          'The income statement runs: revenue, COGS, gross profit, operating expenses, operating profit (EBIT), interest, taxes, net income. ' +
          hints.join(' '),
      }
    })
  },
}

export default mission
