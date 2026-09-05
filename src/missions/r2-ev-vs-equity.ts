import type { Mission } from '../engine/types'
import { gradeSort } from '../engine/graders/sort'
import { mdVerdict } from '../engine/voice'
import { LEDGERLY } from './companies'

/**
 * Rung 2. Sort eight claims into "true of enterprise value" or "true of
 * equity value" for Ledgerly Inc. Figures come straight from the Rung 2
 * company bible: equity value (market cap) $370,000k, net debt $30,000k,
 * enterprise value $400,000k (370,000 + 30,000).
 */
const EQUITY_VALUE = LEDGERLY.market!.marketCap
const NET_DEBT = LEDGERLY.market!.netDebt
const ENTERPRISE_VALUE = LEDGERLY.market!.ev

const REASON: Record<string, string> = {
  buyer_pays_whole:
    'Buying the whole business means paying off the shareholders and taking on the debt too — that combined price tag is enterprise value, not just the value of the shares.',
  share_price_times_shares:
    "Share price times shares outstanding is the stock market's price for the shares alone. That is equity value (market cap), before debt enters the picture.",
  left_for_shareholders:
    'Lenders get paid first; whatever is left over belongs to shareholders. That leftover slice is exactly equity value.',
  unaffected_by_financing:
    'Swap some of the debt for equity (or vice versa) and the business itself is unchanged, so enterprise value stays the same — equity value would move.',
  compare_to_ebitda:
    "EBITDA is a whole-business profit measure, before interest to lenders is even paid. It is compared to enterprise value, the whole-business price tag, not to equity value.",
  compare_to_net_income:
    'Net income is profit after lenders have already been paid their interest, so it belongs to shareholders alone. It is compared to equity value (the P/E ratio), not enterprise value.',
  ledgerly_370:
    `Ledgerly's equity value (market cap) is $${EQUITY_VALUE.toLocaleString('en-US')}k — the value of the shares alone, before adding debt.`,
  ledgerly_400:
    `Ledgerly's enterprise value is $${ENTERPRISE_VALUE.toLocaleString('en-US')}k: equity value $${EQUITY_VALUE.toLocaleString('en-US')}k + net debt $${NET_DEBT.toLocaleString('en-US')}k = $${ENTERPRISE_VALUE.toLocaleString('en-US')}k, the price of the whole business including debt.`,
}

const mission: Mission = {
  id: 'r2-ev-vs-equity',
  rung: 2,
  order: 5,
  title: 'Two price tags',
  tagline: 'Every company has a price for the shares and a price for the whole business. They are not the same number.',
  baseComp: 6_000,
  parSeconds: 120,
  lesson: {
    title: 'Enterprise value vs. equity value',
    body:
      'Every company has two price tags. Equity value (market cap) is what the stock market values the shares at: share price times shares outstanding — it is what shareholders own. Enterprise value (EV) is what it would cost to buy the whole business outright: the equity plus the debt you would take on, minus cash you could use to pay that debt down. Ledgerly’s equity value is $370,000k. Its net debt (debt minus cash) is $30,000k, so EV is $400,000k. Bankers compare EV to EBITDA — a whole-business profit measure — and equity value to net income, a shareholders-only measure, because numerator and denominator must cover the same slice of the business.',
    visual: {
      kind: 'bullets',
      items: [
        'Equity value (market cap): share price × shares outstanding',
        'Enterprise value: equity value + net debt',
        'Ledgerly: $370,000k equity + $30,000k net debt = $400,000k EV',
      ],
    },
  },
  task: {
    kind: 'sort',
    prompt: 'Sort each claim about Ledgerly into the value it actually describes.',
    buckets: [
      { id: 'ev', label: 'Enterprise value', role: 'debt', hint: 'The whole business, debt included.' },
      { id: 'equity', label: 'Equity value / market cap', role: 'equity', hint: 'Just the shares.' },
    ],
    items: [
      { id: 'buyer_pays_whole', label: 'What a buyer pays for the whole business, debt included', bucketId: 'ev', role: 'debt' },
      { id: 'share_price_times_shares', label: 'Share price times shares outstanding', bucketId: 'equity', role: 'equity' },
      { id: 'left_for_shareholders', label: 'What is left for shareholders after lenders are paid', bucketId: 'equity', role: 'equity' },
      { id: 'unaffected_by_financing', label: 'Unaffected by how the company is financed', bucketId: 'ev', role: 'debt' },
      { id: 'compare_to_ebitda', label: 'The number you compare to EBITDA', bucketId: 'ev', role: 'debt' },
      { id: 'compare_to_net_income', label: 'The number you compare to net income', bucketId: 'equity', role: 'equity' },
      { id: 'ledgerly_370', label: 'Ledgerly: 370,000', bucketId: 'equity', role: 'equity' },
      { id: 'ledgerly_400', label: 'Ledgerly: 400,000', bucketId: 'ev', role: 'debt' },
    ],
  },
  grade(answer) {
    if (answer.kind !== 'sort') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'sort') throw new Error('wrong task kind')
    return gradeSort(mission.task, answer, ({ accuracy, wrongIds }) => {
      const bridgeLine = `Remember the bridge: enterprise value = equity value + net debt (${EQUITY_VALUE.toLocaleString('en-US')} + ${NET_DEBT.toLocaleString('en-US')} = ${ENTERPRISE_VALUE.toLocaleString('en-US')}).`
      if (accuracy === 1) {
        return {
          verdict: mdVerdict(1, mission.id),
          explanation:
            `Every claim landed in the right value. Enterprise value is the whole-business price tag: what a buyer pays including debt, unaffected by the financing mix, and the number you compare to EBITDA. Equity value is the shareholders' slice: share price times shares outstanding, what is left after lenders are paid, and the number you compare to net income. ${bridgeLine}`,
        }
      }
      if (accuracy === 0) {
        return {
          verdict: mdVerdict(0, mission.id),
          explanation:
            `Nothing landed in the right bucket. ${bridgeLine} ` +
            wrongIds.map((id) => `"${itemLabel(id)}" is ${bucketLabel(id)}: ${REASON[id] ?? ''}`).join(' '),
        }
      }
      const explanation =
        wrongIds.map((id) => `"${itemLabel(id)}" is ${bucketLabel(id)}, not the other value: ${REASON[id] ?? ''}`).join(' ') +
        ' ' +
        bridgeLine
      return {
        verdict: mdVerdict(accuracy, mission.id),
        explanation,
      }
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
