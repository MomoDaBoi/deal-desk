import type { Mission } from '../engine/types'
import { gradeSlider } from '../engine/graders/slider'
import { mdVerdict } from '../engine/voice'
import { NANS_PANTRY } from './companies'

/**
 * Rung 3, mission 4. Precedent transactions price control, not a minority
 * stake, so a buyer pays a premium over the pre-deal trading price. The
 * player sets Nan's Pantry's offer price under a 25% control premium, then
 * the enterprise-value multiple that offer implies. Every figure below is
 * derived from the company bible (src/missions/companies.ts /
 * PLAN.md section (c)) so the mission and its numbers can never drift apart.
 */

const CONTROL_PREMIUM_PCT = 25
const SHARE_PRICE = NANS_PANTRY.market!.price // 11.80
const SHARES_K = NANS_PANTRY.market!.sharesK // 60,000
const NET_DEBT = NANS_PANTRY.market!.netDebt // 300,000
const EBITDA = NANS_PANTRY.income.ebitda // 144,000

/** 11.80 × 1.25 = 14.75. Rounded to cents in case of floating-point noise. */
const OFFER_PRICE = Math.round(SHARE_PRICE * (1 + CONTROL_PREMIUM_PCT / 100) * 100) / 100
const EQUITY_VALUE = SHARES_K * OFFER_PRICE // 885,000
const ENTERPRISE_VALUE = EQUITY_VALUE + NET_DEBT // 1,185,000
/** 1,185,000 / 144,000 = 8.229..., rounded to one decimal like every other multiple in the bible. */
const IMPLIED_MULTIPLE = Math.round((ENTERPRISE_VALUE / EBITDA) * 10) / 10

const money = (n: number) => n.toLocaleString('en-US')

const PREMIUM_MULTIPLIER = (1 + CONTROL_PREMIUM_PCT / 100).toFixed(2) // 1.25

const OFFER_LINE = `A ${CONTROL_PREMIUM_PCT}% control premium on Nan's Pantry's $${SHARE_PRICE.toFixed(2)} share price is $${SHARE_PRICE.toFixed(2)} × ${PREMIUM_MULTIPLIER} = $${OFFER_PRICE.toFixed(2)}.`

const MULTIPLE_LINE = `Equity value at that offer is ${money(SHARES_K)}k shares × $${OFFER_PRICE.toFixed(2)} = $${money(EQUITY_VALUE)}k. Add net debt of $${money(NET_DEBT)}k for an enterprise value of $${money(ENTERPRISE_VALUE)}k, then divide by EBITDA of $${money(EBITDA)}k to get ${IMPLIED_MULTIPLE}x.`

const mission: Mission = {
  id: 'r3-precedents',
  rung: 3,
  order: 4,
  title: 'Paying for control',
  tagline: 'Everyone wants a seat at the table. A buyer wants the whole table.',
  baseComp: 7_000,
  parSeconds: 150,
  lesson: {
    title: 'Precedents price control',
    body:
      "A precedent transaction is a past sale of an entire company — the buyer paid for control: the right to fire management, sell divisions, or merge operations. Control beats a few shares on an exchange, so buyers pay a control premium: the percentage above the pre-deal share price needed to buy every share. Nan's Pantry trades at $11.80; a 25% control premium makes the offer $14.75. Multiply by shares outstanding for equity value, add net debt for enterprise value (EV, the whole business including what it owes), divide by EBITDA (earnings before interest, taxes, depreciation and amortization) for the implied multiple. That is why precedents run above ordinary trading multiples.",
    visual: {
      kind: 'bullets',
      items: [
        "Nan's Pantry trades at $11.80 a share",
        'Control premium: 25% over that price',
        'Offer price = $11.80 × 1.25 = $14.75',
      ],
    },
  },
  task: {
    kind: 'slider',
    prompt:
      "A buyer wants to take Nan's Pantry Markets private and is willing to pay a 25% control premium over its $11.80 share price. Set the offer price, then the EV/EBITDA multiple that offer implies.",
    sliders: [
      {
        id: 'offerPrice',
        label: 'Offer price per share',
        min: 10,
        max: 20,
        step: 0.05,
        answer: OFFER_PRICE,
        tolerance: 0.1,
        unit: '$',
        role: 'equity',
        hint: "Nan's Pantry trades at $11.80. A 25% control premium is 25% more than that, per share.",
      },
      {
        id: 'impliedMultiple',
        label: 'Implied EV/EBITDA',
        min: 5,
        max: 12,
        step: 0.1,
        answer: IMPLIED_MULTIPLE,
        tolerance: 0.15,
        unit: 'x',
        role: 'neutral',
        hint: 'Equity value at the offer + net debt, over EBITDA',
      },
    ],
  },
  grade(answer) {
    if (answer.kind !== 'slider') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'slider') throw new Error('wrong task kind')
    return gradeSlider(mission.task, answer, ({ accuracy, wrongIds }) => {
      if (accuracy === 1) {
        return {
          verdict: 'Priced for control, to the penny. The MD is unsettled by your competence.',
          explanation: `${OFFER_LINE} ${MULTIPLE_LINE} Both sliders landed exactly where a buyer paying for control should.`,
        }
      }
      if (accuracy === 0) {
        return {
          verdict: mdVerdict(0, 'r3-precedents'),
          explanation: `Neither slider was close. ${OFFER_LINE} ${MULTIPLE_LINE}`,
        }
      }
      const parts: string[] = []
      if (wrongIds.includes('offerPrice')) parts.push(OFFER_LINE)
      if (wrongIds.includes('impliedMultiple')) parts.push(MULTIPLE_LINE)
      return {
        verdict: mdVerdict(accuracy, 'r3-precedents'),
        explanation: parts.join(' '),
      }
    })
  },
}

export default mission
