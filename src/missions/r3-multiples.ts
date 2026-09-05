import type { Mission } from '../engine/types'
import { gradeBalance } from '../engine/graders/balance'
import { mdVerdict } from '../engine/voice'
import { BRICKHOUSE, LEDGERLY, NANS_PANTRY, derived } from './companies'

/**
 * Rung 3, mission 1. A multiple is just a price divided by a performance
 * number — the lesson is which price pairs with which performance number.
 * Enterprise value (EV, the whole business, debt included) pairs with
 * EBITDA or revenue, both pre-debt figures every financier has a claim on.
 * Market cap (equity value, just the shares) pairs with net income, the
 * profit left over for shareholders after lenders are paid. All figures
 * come from the Rung 2/3 company bible so the mission and its numbers can
 * never drift apart. Not a real balance sheet — section ids avoid
 * "asset"/"liab"/"equity" so the widget does not render the balance meter.
 */

const MISSION_ID = 'r3-multiples'

const BH_EV = BRICKHOUSE.market!.ev // 800,000
const BH_EBITDA = BRICKHOUSE.income.ebitda // 96,000
const BH_REVENUE = BRICKHOUSE.income.revenue // 640,000
const BH_MARKET_CAP = BRICKHOUSE.market!.marketCap // 580,000
const BH_NET_INCOME = BRICKHOUSE.income.netIncome // 34,500
const LD_MARKET_CAP = LEDGERLY.market!.marketCap // 370,000
const LD_NET_INCOME = LEDGERLY.income.netIncome // 3,750

const bhRatios = derived(BRICKHOUSE)
const ldRatios = derived(LEDGERLY)
const npRatios = derived(NANS_PANTRY)

/** 800,000 / 96,000 = 8.3x */
const BH_EV_EBITDA = bhRatios.evEbitda!
/** 800,000 / 640,000 = 1.25x */
const BH_EV_REVENUE = bhRatios.evRevenue!
/** 580,000 / 34,500 = 16.8x */
const BH_PE = bhRatios.pe!
/** 370,000 / 3,750 = 98.7x */
const LD_PE = ldRatios.pe!
/** Ledgerly EV/EBITDA: 400,000 / 12,000 = 33.3x */
const LD_EV_EBITDA = ldRatios.evEbitda!
/** Nan's Pantry EV/EBITDA: 1,008,000 / 144,000 = 7.0x */
const NP_EV_EBITDA = npRatios.evEbitda!

const money = (n: number) => n.toLocaleString('en-US')

const EV_EBITDA_LINE = `EV/EBITDA divides enterprise value by EBITDA, both figures every financier (lenders included) has a claim on: ${money(BH_EV)} ÷ ${money(BH_EBITDA)} = ${BH_EV_EBITDA}x.`
const EV_REVENUE_LINE = `EV/Revenue divides enterprise value by revenue, the same pairing logic one level up the income statement: ${money(BH_EV)} ÷ ${money(BH_REVENUE)} = ${BH_EV_REVENUE}x.`
const BH_PE_LINE = `P/E divides market cap (equity value, not EV) by net income, since net income is already after interest was paid to lenders: ${money(BH_MARKET_CAP)} ÷ ${money(BH_NET_INCOME)} = ${BH_PE}x.`
const LD_GROSS_MARGIN_PCT = Math.round((LEDGERLY.income.grossProfit / LEDGERLY.income.revenue) * 100)
const LD_PE_LINE = `Ledgerly's P/E is the same equity-value-over-net-income divide: ${money(LD_MARKET_CAP)} ÷ ${money(LD_NET_INCOME)} = ${LD_PE}x. That number looks absurd because it is: a ${LD_GROSS_MARGIN_PCT}% gross-margin business whose net income line is thin — interest of ${money(LEDGERLY.income.interest)} and D&A of ${money(LEDGERLY.income.da ?? 0)} leave only ${money(LD_NET_INCOME)} of an ${money(LEDGERLY.income.ebit)} EBIT — so the P/E says almost nothing. This is the case where you reach for EV/EBITDA or EV/Revenue instead.`

const mission: Mission = {
  id: MISSION_ID,
  rung: 3,
  order: 1,
  title: 'What divides what',
  tagline: 'A multiple is a price over a performance number. Match the wrong pair and it lies to you.',
  baseComp: 7_000,
  parSeconds: 160,
  lesson: {
    title: 'A multiple is price divided by performance',
    body:
      'A multiple is a price divided by a performance number: multiple = price ÷ performance. The trick is pairing the right price with the right performance number. Enterprise value (EV, the whole business, debt included) pairs with EBITDA or revenue, since both belong to everyone who financed the company, lenders included. Market cap (equity value, just the shares) pairs with net income, the profit left for shareholders once lenders are paid. Mix them — EV over net income, say — and debt gets counted twice: once inside EV, once by ignoring that net income already paid interest. Brickhouse: EV/EBITDA 8.3x, EV/Revenue 1.25x, P/E 16.8x. Ledgerly: P/E 98.7x, absurd on its face, because its profit is razor-thin.',
    visual: {
      kind: 'bars',
      unit: 'x',
      items: [
        { label: 'Ledgerly', value: LD_EV_EBITDA, role: 'neutral' },
        { label: 'Brickhouse', value: BH_EV_EBITDA, role: 'neutral' },
        { label: "Nan's Pantry", value: NP_EV_EBITDA, role: 'neutral' },
      ],
    },
  },
  task: {
    kind: 'balance',
    prompt: 'Turn Brickhouse and Ledgerly into the multiples that describe them.',
    unit: 'x',
    tolerance: 0.1,
    sections: [
      {
        id: 'inputs',
        label: 'Inputs ($k)',
        role: 'neutral',
        lines: [
          { id: 'brickhouse-ev', label: 'Brickhouse enterprise value', value: BH_EV, unit: '$k' },
          { id: 'brickhouse-ebitda', label: 'Brickhouse EBITDA', value: BH_EBITDA, unit: '$k' },
          { id: 'brickhouse-revenue', label: 'Brickhouse revenue', value: BH_REVENUE, unit: '$k' },
          { id: 'brickhouse-market-cap', label: 'Brickhouse market cap', value: BH_MARKET_CAP, unit: '$k' },
          { id: 'brickhouse-net-income', label: 'Brickhouse net income', value: BH_NET_INCOME, unit: '$k' },
          { id: 'ledgerly-market-cap', label: 'Ledgerly market cap', value: LD_MARKET_CAP, unit: '$k' },
          { id: 'ledgerly-net-income', label: 'Ledgerly net income', value: LD_NET_INCOME, unit: '$k' },
        ],
      },
      {
        id: 'multiples',
        label: 'Multiples',
        role: 'neutral',
        lines: [
          {
            id: 'brickhouse-ev-ebitda',
            label: 'Brickhouse EV/EBITDA',
            answer: BH_EV_EBITDA,
            note: 'Enterprise value divided by EBITDA',
          },
          {
            id: 'brickhouse-ev-revenue',
            label: 'Brickhouse EV/Revenue',
            answer: BH_EV_REVENUE,
            note: 'Enterprise value divided by revenue',
          },
          {
            id: 'brickhouse-pe',
            label: 'Brickhouse P/E',
            answer: BH_PE,
            note: 'Market cap divided by net income',
          },
          {
            id: 'ledgerly-pe',
            label: 'Ledgerly P/E',
            answer: LD_PE,
            note: 'Market cap divided by net income',
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
          verdict: 'Every multiple paired with the right denominator. The MD has nothing left to redline.',
          explanation: `${EV_EBITDA_LINE} ${EV_REVENUE_LINE} ${BH_PE_LINE} ${LD_PE_LINE}`,
        }
      }
      if (accuracy === 0) {
        return {
          verdict: mdVerdict(0, MISSION_ID),
          explanation: `Nothing lined up. ${EV_EBITDA_LINE} ${EV_REVENUE_LINE} ${BH_PE_LINE} ${LD_PE_LINE}`,
        }
      }
      const hints: string[] = []
      if (wrongIds.includes('brickhouse-ev-ebitda')) hints.push(EV_EBITDA_LINE)
      if (wrongIds.includes('brickhouse-ev-revenue')) hints.push(EV_REVENUE_LINE)
      if (wrongIds.includes('brickhouse-pe')) hints.push(BH_PE_LINE)
      if (wrongIds.includes('ledgerly-pe')) hints.push(LD_PE_LINE)
      hints.push('EV pairs with EBITDA or revenue; market cap pairs with net income. Crossing the pair either double-counts debt or ignores it.')
      return {
        verdict: mdVerdict(accuracy, MISSION_ID),
        explanation: hints.join(' '),
      }
    })
  },
}

export default mission
