import type { Mission } from '../engine/types'
import { gradeSort } from '../engine/graders/sort'
import { mdVerdict } from '../engine/voice'

/**
 * Rung 1. Sort Pucker Up's fiscal 2025 cash flow lines into the section of
 * the cash flow statement they actually belong in: operating, investing, or
 * financing. Six lines are the company's real FY2025 statement (indirect
 * method); two are clearly-labelled hypotheticals used only to test the
 * sorting rule. See DEAL_DESK_BRIEF.md / the Rung 1 company bible for the
 * underlying figures.
 */

const REASON: Record<string, string> = {
  net_income:
    'Net income is where operating cash flow starts. The income statement already calculated it as a profit; the cash flow statement adjusts that number for non-cash items, it does not recompute it somewhere else.',
  depreciation:
    'Depreciation is a non-cash expense — it already reduced net income on the income statement, but no cash actually left the building, so operating adds it back.',
  working_capital:
    'The change in working capital (cash tied up or freed up by unpaid customer bills, inventory, and unpaid supplier bills) is a day-to-day timing effect, so it is an operating adjustment.',
  capex_stands:
    'Buying new stands is capital expenditure: spending cash on a long-lived asset the business will use for years. That is exactly what investing tracks.',
  debt_repayment:
    'Repaying debt sends cash back to a lender. That is a financing flow, not a cost of running the stands.',
  dividends:
    'A dividend is cash paid out to an owner, not an expense of the business. Money moving between the company and its owners is exactly what financing tracks.',
  hyp_loan:
    "A new bank loan brings cash in from a lender — financing, the mirror image of repaying one. Pucker Up did not actually take out this loan in FY2025; it is a hypothetical to test the sorting rule, not a real line on this year's statement.",
  hyp_van_sale:
    "Selling an old delivery van is disposing of a long-lived asset, so any cash it brings in sits in investing, right alongside cash spent buying new ones. Pucker Up did not actually sell a van in FY2025; it is a hypothetical to test the sorting rule, not a real line on this year's statement.",
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
      kind: 'waterfall',
      unit: '$k',
      items: [
        { label: 'Net income', value: 200, total: true, role: 'equity' },
        { label: 'Depreciation', value: 40, role: 'cash' },
        { label: 'Working capital', value: 20, role: 'cash' },
        { label: 'Cash from ops', value: 260, total: true, role: 'cash' },
        { label: 'Capex', value: -120, role: 'cost' },
        { label: 'Debt repayment', value: -60, role: 'debt' },
        { label: 'Dividends', value: -40, role: 'equity' },
        { label: 'Net change in cash', value: 40, total: true, role: 'cash' },
      ],
    },
  },
  task: {
    kind: 'sort',
    prompt:
      "Six of these lines are Pucker Up's real fiscal 2025 cash flow statement. Two are hypotheticals the founder is curious about — sort every line into the section it belongs in either way.",
    buckets: [
      { id: 'operating', label: 'Operating', role: 'cash', hint: 'Cash from running the stands, day to day.' },
      { id: 'investing', label: 'Investing', role: 'neutral', hint: 'Buying or selling long-lived stuff.' },
      { id: 'financing', label: 'Financing', role: 'debt', hint: 'Money to and from lenders and owners.' },
    ],
    items: [
      { id: 'net_income', label: 'Net income', bucketId: 'operating', role: 'cash' },
      { id: 'depreciation', label: 'Depreciation', bucketId: 'operating', role: 'cash' },
      { id: 'working_capital', label: 'Change in working capital', bucketId: 'operating', role: 'cash' },
      { id: 'capex_stands', label: 'Purchase of new stands', bucketId: 'investing', role: 'cost' },
      { id: 'debt_repayment', label: 'Debt repayment', bucketId: 'financing', role: 'debt' },
      { id: 'dividends', label: 'Dividends to the founder', bucketId: 'financing', role: 'equity' },
      { id: 'hyp_loan', label: 'Suppose the company also took out a new bank loan', bucketId: 'financing', role: 'debt' },
      { id: 'hyp_van_sale', label: 'Suppose the company also sold an old delivery van', bucketId: 'investing', role: 'cash' },
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
            "You sorted it exactly right. Operating is the day job: net income of 200, plus depreciation of 40 added back because no cash left the building, plus the 20 working-capital swing, nets to cash from operations of 260. Investing is negative 120: buying new stands is the only real investing line this year. Financing nets to negative 100: repaying debt cost 60 and the founder's dividend cost another 40. The hypothetical loan and van sale never happened this year — they still belong in their drawers, but they are not part of these totals.",
        }
      }
      if (accuracy === 0) {
        return {
          verdict: mdVerdict(0, 'r1-cash-flow-sort'),
          explanation:
            "Not one line landed in its drawer. Operating is cash from the day-to-day business (net income, depreciation added back, working capital). Investing is cash spent on or earned from long-lived assets (new stands, and the hypothetical van). Financing is cash to and from lenders and owners (debt repayment, the founder's dividend, and the hypothetical loan). " +
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
