import type { Mission } from '../engine/types'
import { gradeSort } from '../engine/graders/sort'
import { mdVerdict } from '../engine/voice'

/**
 * Rung 1. Sort Pucker Up's fiscal 2025 cash flow lines into the section of
 * the cash flow statement they actually belong in: operating, investing, or
 * financing. See DEAL_DESK_BRIEF.md / the Rung 1 company bible for the
 * underlying figures.
 */

const REASON: Record<string, string> = {
  net_income:
    'Net income is where operating cash flow starts. The income statement already calculated it as a profit; the cash flow statement adjusts that number for non-cash items, it does not recompute it somewhere else.',
  depreciation:
    'Depreciation is a non-cash expense — it already reduced net income on the income statement, but no cash actually left the building, so operating adds it back.',
  working_capital:
    'The change in working capital (cash tied up or freed up by unpaid customer bills, inventory, and unpaid supplier bills) is a day-to-day timing effect, so it is an operating adjustment.',
  supplier_cash:
    'Cash paid to lemon suppliers buys the ingredient that goes straight into what Pucker Up sells today — a day-to-day operating cost, not a long-term investment or a financing flow.',
  capex_stands:
    'Buying new stands is capital expenditure: spending cash on a long-lived asset the business will use for years. That is exactly what investing tracks.',
  van_sale:
    'Selling an old delivery van is disposing of a long-lived asset. The cash it brings in sits in investing, right alongside the cash spent buying new ones.',
  debt_repayment:
    'Repaying debt sends cash back to a lender. That is a financing flow, not a cost of running the stands.',
  dividends:
    'A dividend is cash paid out to an owner, not an expense of the business. Money moving between the company and its owners is exactly what financing tracks.',
  new_loan:
    'A new bank loan brings cash in from a lender — financing, the mirror image of repaying one.',
}

const mission: Mission = {
  id: 'r1-cash-flow-sort',
  rung: 1,
  order: 4,
  title: 'Follow the cash',
  tagline: "Sort Pucker Up's cash into the three drawers before the MD asks where it went.",
  baseComp: 5_000,
  parSeconds: 120,
  lesson: {
    title: 'Three drawers for the cash',
    body:
      "Pucker Up's cash flow statement sorts every dollar into three drawers. Operating is cash from running the stands day to day: start at net income, add back non-cash charges like depreciation, and adjust for working capital swings (unpaid bills, unsold inventory). Investing is cash spent on or earned from long-lived stuff — new stands, equipment, whole businesses. Financing is cash moving between the company and its lenders or owners: loans taken out or repaid, dividends paid out. The same dollar amount can sit in any drawer — what matters is what the cash was actually for, not whether it was a plus or a minus.",
    visual: {
      kind: 'bullets',
      items: [
        'Is it the day job? Operating — net income, depreciation, working capital.',
        'Is it a long-lived asset? Investing — new stands, equipment, acquisitions.',
        'Is it a lender or an owner? Financing — loans, repayments, dividends.',
      ],
    },
  },
  task: {
    kind: 'sort',
    prompt: "Sort Pucker Up's fiscal 2025 cash flow lines into the section they belong in.",
    buckets: [
      { id: 'operating', label: 'Operating', role: 'cash', hint: 'Cash from running the stands, day to day.' },
      { id: 'investing', label: 'Investing', role: 'neutral', hint: 'Buying or selling long-lived stuff.' },
      { id: 'financing', label: 'Financing', role: 'debt', hint: 'Money to and from lenders and owners.' },
    ],
    items: [
      { id: 'net_income', label: 'Net income', bucketId: 'operating', role: 'cash' },
      { id: 'depreciation', label: 'Depreciation', bucketId: 'operating', role: 'cash' },
      { id: 'working_capital', label: 'Change in working capital', bucketId: 'operating', role: 'cash' },
      { id: 'supplier_cash', label: 'Cash paid to lemon suppliers', bucketId: 'operating', role: 'cost' },
      { id: 'capex_stands', label: 'Purchase of new stands', bucketId: 'investing', role: 'cost' },
      { id: 'van_sale', label: 'Sale of an old delivery van', bucketId: 'investing', role: 'cash' },
      { id: 'debt_repayment', label: 'Debt repayment', bucketId: 'financing', role: 'debt' },
      { id: 'dividends', label: 'Dividends to founder', bucketId: 'financing', role: 'equity' },
      { id: 'new_loan', label: 'New bank loan', bucketId: 'financing', role: 'debt' },
    ],
  },
  grade(answer) {
    if (answer.kind !== 'sort') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'sort') throw new Error('wrong task kind')
    return gradeSort(mission.task, answer, ({ accuracy, wrongIds }) => {
      if (accuracy === 1) {
        return {
          verdict: 'Every dollar in its drawer. The MD is suspicious of you now.',
          explanation:
            'You sorted it exactly right. Operating (net income of 200, plus depreciation of 40 added back, plus the 20 working-capital swing, minus cash paid to suppliers) nets to cash from operations of 260. Investing is negative 120: buying new stands costs cash up front, partly offset by selling the old van. Financing nets to negative 100: borrowing, repaying debt, and paying the founder his dividend. Three drawers, one honest cash balance.',
        }
      }
      if (accuracy === 0) {
        return {
          verdict: mdVerdict(0, 'r1-cash-flow-sort'),
          explanation:
            "Not one line landed in its drawer. Operating is cash from the day-to-day business (net income, depreciation added back, working capital, cash paid to suppliers). Investing is cash spent on or earned from long-lived assets (new stands, the old van). Financing is cash to and from lenders and owners (the bank loan, debt repayment, the founder's dividend). " +
            wrongIds.map((id) => `${itemLabel(id)}: ${REASON[id] ?? ''}`).join(' '),
        }
      }
      const verdict = mdVerdict(accuracy, 'r1-cash-flow-sort')
      const explanation =
        'A cash flow statement has exactly three sections: operating (the day-to-day business), investing (buying or selling long-lived assets), and financing (money to and from lenders and owners). ' +
        wrongIds.map((id) => `${itemLabel(id)} belongs in ${bucketLabel(id)}. ${REASON[id] ?? ''}`).join(' ')
      return { verdict, explanation }
    })
  },
}

function itemLabel(id: string): string {
  if (mission.task.kind !== 'sort') return id
  return mission.task.items.find((i) => i.id === id)?.label ?? id
}

function bucketLabel(id: string): string {
  if (mission.task.kind !== 'sort') return id
  const item = mission.task.items.find((i) => i.id === id)
  const bucket = mission.task.buckets.find((b) => b.id === item?.bucketId)
  return bucket?.label ?? item?.bucketId ?? id
}

export default mission
