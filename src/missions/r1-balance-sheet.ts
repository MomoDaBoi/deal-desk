import type { Mission } from '../engine/types'
import { gradeBalance } from '../engine/graders/balance'
import { mdVerdict } from '../engine/voice'

/**
 * Rung 1, mission 3. Pucker Up Lemonade Co.'s balance sheet, smudged by an
 * intern. Fixed figures from the Rung 1 company bible (fiscal year 2025).
 */
const mission: Mission = {
  id: 'r1-balance-sheet',
  rung: 1,
  order: 3,
  title: 'Make it balance',
  tagline: 'Assets, liabilities, equity: two of the three are never enough on their own.',
  baseComp: 5_000,
  parSeconds: 150,
  lesson: {
    title: 'Assets = Liabilities + Equity',
    body:
      'Every balance sheet is one equation: Assets = Liabilities + Equity. Everything a company owns (assets) was paid for either with money it borrowed (liabilities) or money the owners put in and kept (equity). At year-end, Pucker Up Lemonade owns $800k across cash, receivables, inventory, and 40 lemonade stands. It owes $400k to suppliers and lenders. The remaining $400k is equity: the accounting residual, assets at their book value minus liabilities. It is not what a sale would fetch. The two sides must always match. Know any two of assets, liabilities, and equity, and the third is forced arithmetic, not a guess.',
    visual: {
      kind: 'bars',
      unit: '$k',
      items: [
        { label: 'Cash', value: 150, role: 'cash' },
        { label: 'Receivables', value: 90, role: 'cash' },
        { label: 'Inventory', value: 60, role: 'cash' },
        { label: 'PP&E', value: 500, role: 'revenue' },
        { label: 'Payables', value: 70, role: 'debt' },
        { label: 'Long-term debt', value: 330, role: 'debt' },
        { label: 'Equity', value: 400, role: 'equity' },
      ],
    },
  },
  task: {
    kind: 'balance',
    prompt: 'The intern spilled lemonade on the balance sheet. Fill in the smudged numbers.',
    unit: '$k',
    tolerance: 0,
    sections: [
      {
        id: 'assets',
        label: 'Assets',
        role: 'cash',
        lines: [
          { id: 'cash', label: 'Cash', value: 150 },
          { id: 'receivables', label: 'Accounts receivable', value: 90 },
          { id: 'inventory', label: 'Inventory', value: 60 },
          { id: 'ppe', label: 'Property, plant & equipment', value: 500 },
          { id: 'total-assets', label: 'Total assets', answer: 800, total: true },
        ],
      },
      {
        id: 'liabilities',
        label: 'Liabilities',
        role: 'debt',
        lines: [
          { id: 'payables', label: 'Accounts payable', value: 70 },
          { id: 'long-term-debt', label: 'Long-term debt', answer: 330, note: 'Total liabilities minus payables' },
          { id: 'total-liabilities', label: 'Total liabilities', value: 400, total: true },
        ],
      },
      {
        id: 'equity',
        label: 'Equity',
        role: 'equity',
        lines: [
          { id: 'shareholders-equity', label: "Shareholders' equity", answer: 400, note: 'Assets minus liabilities' },
          { id: 'total-liab-equity', label: 'Total liabilities + equity', value: 800, total: true },
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
            'Total assets is the sum of the four asset lines: 150 cash + 90 receivables + 60 inventory + 500 PP&E = 800. Long-term debt is total liabilities minus accounts payable: 400 − 70 = 330. Shareholders’ equity is total assets minus total liabilities: 800 − 400 = 400. Both sides land on 800, so the sheet balances.',
        }
      }
      if (accuracy === 0) {
        return {
          verdict: mdVerdict(accuracy, mission.id),
          explanation:
            'Nothing lined up. Total assets is the sum of the four asset lines: 150 cash + 90 receivables + 60 inventory + 500 PP&E = 800. Long-term debt is total liabilities minus accounts payable: 400 − 70 = 330. Shareholders’ equity is total assets minus total liabilities: 800 − 400 = 400. Both sides must land on the same number, 800, or the sheet does not balance.',
        }
      }
      const hints: string[] = []
      if (wrongIds.includes('total-assets'))
        hints.push(
          'Total assets is the sum of everything the company owns: 150 (cash, money already in the bank) + 90 (accounts receivable, money customers owe but have not paid yet) + 60 (inventory, unsold lemonade and cups) + 500 (property, plant & equipment, the stands and fixtures) = 800.',
        )
      if (wrongIds.includes('long-term-debt'))
        hints.push(
          'Long-term debt is total liabilities minus accounts payable (money owed to suppliers, due soon): 400 − 70 = 330.',
        )
      if (wrongIds.includes('shareholders-equity'))
        hints.push(
          "Shareholders' equity is total assets minus total liabilities: 800 − 400 = 400. It is the accounting residual — assets carried at book value, less what is owed — not the cash a sale of the business would put in the founder's pocket.",
        )
      hints.push('Total assets (800) must equal total liabilities plus equity (400 + 400 = 800), always.')
      return {
        verdict: mdVerdict(accuracy, mission.id),
        explanation: hints.join(' '),
      }
    })
  },
}

export default mission
