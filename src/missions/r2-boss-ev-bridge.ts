import type { Mission } from '../engine/types'
import { gradeBridge } from '../engine/graders/bridge'
import { mdVerdict } from '../engine/voice'
import { LEDGERLY } from './companies'

/**
 * Rung 2 boss. Bridges Ledgerly's market cap (what shareholders own) to its
 * enterprise value (what the whole business is worth, debt included).
 * Figures come straight from the Rung 2 company bible (LEDGERLY).
 */
const MARKET_CAP = LEDGERLY.market!.marketCap
const ENTERPRISE_VALUE = LEDGERLY.market!.ev
const TOTAL_DEBT = LEDGERLY.balance!.totalDebt
const CASH = LEDGERLY.balance!.cash

const mission: Mission = {
  id: 'r2-boss-ev-bridge',
  rung: 2,
  order: 6,
  boss: true,
  title: 'The EV bridge',
  tagline: 'From what shareholders own to what the whole business costs to buy.',
  baseComp: 11_000,
  parSeconds: 180,
  lesson: {
    title: 'Equity value bridges to enterprise value',
    body:
      'Enterprise value (EV) is what it would cost to buy the whole business, debt included. Market cap (equity value) is just the value of the shares — what shareholders own. To get from equity value to EV, add debt, since buying the company means taking on what it owes. Subtract cash, since the buyer could use that cash to pay debt down immediately. Ledgerly’s market cap is $370,000k. It carries $60,000k of total debt (loans owed to lenders) and $30,000k of cash. It has no minority interest (a stake in a subsidiary owned by outsiders) and no preferred stock (a hybrid security paid before common shareholders). EV: $400,000k.',
    visual: {
      kind: 'bullets',
      items: [
        'Market cap (equity value): $370,000k',
        '+ Total debt, − Cash',
        '+ Minority interest, + Preferred stock (both zero here)',
        '= Enterprise value: $400,000k',
      ],
    },
  },
  task: {
    kind: 'bridge',
    prompt: 'Bridge Ledgerly from market cap to enterprise value. Fill in every adjustment bar.',
    unit: '$k',
    tolerance: 0,
    start: { label: 'Market cap (equity value)', value: MARKET_CAP, role: 'equity' },
    end: { label: 'Enterprise value', value: ENTERPRISE_VALUE, role: 'revenue' },
    adjustments: [
      { id: 'debt', label: 'Total debt', answer: TOTAL_DEBT, role: 'debt', hint: 'Lenders have a claim too' },
      { id: 'cash', label: 'Cash', answer: -CASH, role: 'cash', hint: 'Cash could pay debt down tomorrow' },
      { id: 'minority', label: 'Minority interest', answer: 0, role: 'neutral', hint: 'Ledgerly owns 100% of its subsidiaries' },
      { id: 'preferred', label: 'Preferred stock', answer: 0, role: 'neutral', hint: 'None issued' },
    ],
  },
  grade(answer) {
    if (answer.kind !== 'bridge') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'bridge') throw new Error('wrong task kind')
    return gradeBridge(mission.task, answer, ({ accuracy, wrongIds, sum }) => {
      if (accuracy === 1) {
        return {
          verdict: 'Bridge closes. Frame it, you will not see this again.',
          explanation:
            'Total debt is added because buying the whole company means taking on the $60,000k it owes lenders. Cash is subtracted because that $30,000k could pay debt down tomorrow, so a buyer effectively gets it back. Ledgerly owns 100% of its subsidiaries, so minority interest is 0, and it has issued no preferred stock, so that is 0 too. 370,000 + 60,000 − 30,000 + 0 + 0 = 400,000: the bars reconcile to the stated enterprise value.',
        }
      }
      if (accuracy === 0) {
        return {
          verdict: mdVerdict(accuracy, mission.id),
          explanation:
            'None of the bars landed. Total debt ($60,000k) is added because buying the company means taking on what it owes lenders. Cash ($30,000k) is subtracted because a buyer could use it to pay debt down immediately. Minority interest is 0 because Ledgerly owns 100% of its subsidiaries. Preferred stock is 0 because none has been issued. 370,000 + 60,000 − 30,000 + 0 + 0 = 400,000 — your bars do not reconcile to enterprise value.',
        }
      }
      const hints: string[] = []
      if (wrongIds.includes('debt'))
        hints.push(
          'Total debt should be +60,000: buying the whole company means taking on the debt it owes lenders, not ignoring it.',
        )
      if (wrongIds.includes('cash'))
        hints.push(
          'Cash should be −30,000: cash sitting on the balance sheet could pay debt down tomorrow, so it comes off the price of the business.',
        )
      if (wrongIds.includes('minority'))
        hints.push('Minority interest should be 0: Ledgerly owns 100% of its subsidiaries, so there is no outside stake to add.')
      if (wrongIds.includes('preferred'))
        hints.push('Preferred stock should be 0: Ledgerly has not issued any.')
      if (wrongIds.includes('reconcile')) {
        hints.push(
          `Separately: your bars sum to ${sum.toLocaleString('en-US')}, not the stated enterprise value of 400,000 — one of the adjustments above is off.`,
        )
      } else {
        hints.push('Separately, the bars do reconcile to 400,000 — the arithmetic just landed on the wrong line.')
      }
      return {
        verdict: mdVerdict(accuracy, mission.id),
        explanation: hints.join(' '),
      }
    })
  },
}

export default mission
