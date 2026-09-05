import type { Mission } from '../engine/types'
import { gradeSort } from '../engine/graders/sort'
import { mdVerdict } from '../engine/voice'

/**
 * Rung 1, mission 1. Before any single statement, the player has to know
 * that there are three of them and what each one is FOR: income statement
 * (performance over a period), balance sheet (a snapshot at a moment),
 * cash flow statement (where cash actually moved). Figures are the Rung 1
 * company bible: Pucker Up Lemonade Co., FY2025, $ thousands.
 */

interface ItemMeta {
  id: string
  label: string
  bucketId: 'income' | 'balance' | 'cashflow'
  role: 'revenue' | 'cost' | 'debt' | 'equity' | 'cash'
  /** Why this line lives on that statement. Plain English, terms defined. */
  detail: string
}

const ITEMS: ItemMeta[] = [
  {
    id: 'revenue',
    label: 'Revenue',
    bucketId: 'income',
    role: 'revenue',
    detail:
      'Revenue is money earned from selling lemonade during the year, so it belongs on the income statement, which measures performance over a period.',
  },
  {
    id: 'opex',
    label: 'Operating expenses',
    bucketId: 'income',
    role: 'cost',
    detail:
      'Operating expenses are the costs of running the stands during the year (staff, rent, cups), so they belong on the income statement with revenue.',
  },
  {
    id: 'netincome',
    label: 'Net income',
    bucketId: 'income',
    role: 'equity',
    detail:
      "Net income is the profit left after every cost for the year, the last line of the income statement. It also opens the cash flow statement as a starting point, but net income is not cash: the cash flow statement adjusts it because profit on paper and cash in the bank are not the same thing.",
  },
  {
    id: 'cash',
    label: 'Cash',
    bucketId: 'balance',
    role: 'cash',
    detail:
      'Cash is what the company is holding at the exact moment the year ends, so it belongs on the balance sheet, which is a snapshot of what a company owns and owes, not a record of what happened during the year.',
  },
  {
    id: 'ltdebt',
    label: 'Long-term debt',
    bucketId: 'balance',
    role: 'debt',
    detail:
      'Long-term debt is what the company still owes the bank at year-end, a snapshot amount, so it belongs on the balance sheet, not the income statement.',
  },
  {
    id: 'equity',
    label: "Shareholders' equity",
    bucketId: 'balance',
    role: 'equity',
    detail:
      "Shareholders' equity is the founder's stake in the company at that same moment (assets minus liabilities), so it sits on the balance sheet alongside cash and debt.",
  },
  {
    id: 'cfo',
    label: 'Cash from operations',
    bucketId: 'cashflow',
    role: 'cash',
    detail:
      'Cash from operations is the actual cash that moved in and out from running the stands during the year, which is exactly what the cash flow statement tracks.',
  },
  {
    id: 'capex',
    label: 'Purchase of new stands',
    bucketId: 'cashflow',
    role: 'cost',
    detail:
      'Buying new stands is cash going out the door during the year to invest in growth, so it belongs on the cash flow statement as investing activity, not as an expense on the income statement.',
  },
  {
    id: 'dividends',
    label: 'Dividends to founder',
    bucketId: 'cashflow',
    role: 'equity',
    detail:
      'Dividends to the founder are cash paid out during the year, a financing movement on the cash flow statement, not a cost on the income statement.',
  },
]

const ITEM_BY_ID = new Map(ITEMS.map((it) => [it.id, it]))

function buildExplanation(wrongIds: string[]): string {
  const names = wrongIds.map((id) => ITEM_BY_ID.get(id)?.label ?? id).join(', ')
  const details = wrongIds.map((id) => ITEM_BY_ID.get(id)?.detail).filter(Boolean).join(' ')
  return (
    `You misfiled: ${names}. ${details} ` +
    'Keep the three questions straight: the income statement covers a period (did we make money), the balance sheet is a snapshot (what do we own and owe right now), and the cash flow statement tracks cash movement (where did cash actually go). ' +
    'Net income lives on the income statement AND is the first line of the cash flow statement, but from there it gets adjusted, because profit and cash are not the same number.'
  )
}

const mission: Mission = {
  id: 'r1-three-statements',
  rung: 1,
  order: 1,
  title: 'Three statements, one company',
  tagline: 'One founder, three reports, zero agreement on what "money" means.',
  baseComp: 5_000,
  parSeconds: 120,
  lesson: {
    title: 'The three reports the founder sends the bank',
    body:
      "Pucker Up Lemonade Co. runs 40 stands and one overconfident founder. Every quarter she sends the bank three reports, and each answers a different question. The income statement asks: did we make money this period? The balance sheet asks: what do we own and owe right now, at this exact moment? The cash flow statement asks: where did cash actually move? A company can show a profit on paper and still run out of cash, because net income is not the same thing as cash in the bank. Learn what each statement is for before you learn what sits on it.",
    visual: {
      kind: 'bullets',
      items: [
        'Income statement: did we make money this period?',
        'Balance sheet: what do we own and owe right now?',
        'Cash flow statement: where did cash actually move?',
      ],
    },
  },
  task: {
    kind: 'sort',
    prompt: "The founder emailed nine line items with no labels. File each one onto the statement it belongs on.",
    buckets: [
      { id: 'income', label: 'Income statement', role: 'revenue', hint: 'Did we make money this period?' },
      { id: 'balance', label: 'Balance sheet', role: 'equity', hint: 'What do we own and owe right now?' },
      { id: 'cashflow', label: 'Cash flow statement', role: 'cash', hint: 'Where did cash actually move?' },
    ],
    items: ITEMS.map(({ id, label, bucketId, role }) => ({ id, label, bucketId, role })),
  },
  grade(answer) {
    if (answer.kind !== 'sort') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'sort') throw new Error('wrong task kind')
    return gradeSort(mission.task, answer, ({ accuracy, wrongIds }) => {
      if (accuracy === 1) {
        return {
          verdict: 'Filed correctly. The MD is stunned into total silence.',
          explanation:
            "Income statement: revenue, operating expenses, and net income measure performance over the year, did the lemonade business make money. Balance sheet: cash, long-term debt, and shareholders' equity are a snapshot of what the company owns and owes at year-end. Cash flow statement: cash from operations, the purchase of new stands, and dividends to the founder track where cash actually moved. The one overlap to remember: net income is the last line of the income statement AND the first line the cash flow statement starts from, it just gets adjusted from there, because profit on paper is not the same as cash in the bank.",
        }
      }
      if (accuracy === 0) {
        return {
          verdict: 'Every single line, wrong. That is a skill in itself.',
          explanation: buildExplanation(wrongIds),
        }
      }
      return {
        verdict: mdVerdict(accuracy, mission.id),
        explanation: buildExplanation(wrongIds),
      }
    })
  },
}

export default mission
