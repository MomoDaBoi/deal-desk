import type { Answer, BridgeAnswer, GradeResult, Mission, MultiAnswer, QuizAnswer, SliderAnswer } from '../engine/types'
import { gradeBridge } from '../engine/graders/bridge'
import { gradeSlider } from '../engine/graders/slider'
import { gradeQuiz } from '../engine/graders/quiz'
import { gradeMulti } from '../engine/graders/multi'
import { mdVerdict } from '../engine/voice'
import { BRICKHOUSE } from './companies'

/**
 * Rung 5 boss, the capstone. Run one deal end to end on Brickhouse
 * Industrial: value it (bridge market cap to undisturbed EV), structure it
 * (set the leverage and the equity cheque that fund the buyout at the
 * OFFER price), then defend it (three untimed judgement questions). Every
 * figure is recomputed here from the company bible
 * (src/missions/companies.ts) with pure helpers, so this file can never
 * silently drift from PLAN.md section (c) or (d).
 *
 * Stage 1 - value: MARKET_CAP 580,000 -> undisturbed ENTERPRISE_VALUE
 * 800,000, bridged by +TOTAL_DEBT, -CASH, +0 minority interest, +0
 * preferred stock. That undisturbed EV is the starting point, not what the
 * buyout pays.
 * Stage 2 - structure: a 25% control premium on the $14.50 share price
 * ($18.125 exactly) lifts the deal to PURCHASE_EQUITY 725,000 and, with
 * NET_DEBT of 220,000 already on the balance sheet, PURCHASE_EV 945,000.
 * That is the number the buyout actually funds: leverage of 5.0x EBITDA
 * raises DEBT_RAISED 480,000, and the remaining EQUITY_CHEQUE is 465,000.
 * Stage 3 - defend: three untimed questions on why EV (not market cap) is
 * the right base to lever, why 5.0x (not the top of the range) fits a
 * cyclical industrial, and what a 25% control premium implies for the
 * offer price off Brickhouse's $14.50 share price ($18.13, rounded).
 */

const MARKET_CAP = BRICKHOUSE.market!.marketCap // 580,000
const TOTAL_DEBT = BRICKHOUSE.balance!.totalDebt // 260,000
const CASH = BRICKHOUSE.balance!.cash // 40,000
const EBITDA = BRICKHOUSE.income.ebitda // 96,000
const SHARE_PRICE = BRICKHOUSE.market!.price // 14.50
const SHARES_K = BRICKHOUSE.market!.sharesK // 40,000
const NET_DEBT = BRICKHOUSE.market!.netDebt // 220,000 (total debt - cash)

/** Bridge: equity value + debt - cash + minority interest + preferred stock. */
function enterpriseValue(marketCap: number, totalDebt: number, cash: number, minorityInterest: number, preferred: number): number {
  return marketCap + totalDebt - cash + minorityInterest + preferred
}

// The undisturbed EV: where the market prices Brickhouse today, before any
// takeover premium. This is stage 1's bridge target, not what the buyout
// pays for the company.
const ENTERPRISE_VALUE = enterpriseValue(MARKET_CAP, TOTAL_DEBT, CASH, 0, 0) // 800,000

/** Debt a buyout raises at a given leverage multiple of EBITDA. */
function debtRaised(leverageX: number, ebitda: number): number {
  return leverageX * ebitda
}

/** The equity cheque needed to close the gap between EV and the debt raised. */
function equityCheque(ev: number, debt: number): number {
  return ev - debt
}

/** Offer price implied by a control premium over the pre-deal share price (exact, unrounded). */
function offerPriceAtPremium(sharePrice: number, premiumPct: number): number {
  return sharePrice * (1 + premiumPct / 100)
}

const CONTROL_PREMIUM_PCT = 25
const OFFER_PRICE_EXACT = offerPriceAtPremium(SHARE_PRICE, CONTROL_PREMIUM_PCT) // 18.125
const OFFER_PRICE = Math.round(OFFER_PRICE_EXACT * 100) / 100 // 18.13, for display

// The buyout pays a premium for control, not the undisturbed price — so it
// funds the OFFER enterprise value, not the 800,000 from stage 1.
const PURCHASE_EQUITY = OFFER_PRICE_EXACT * SHARES_K // 725,000
const PURCHASE_EV = PURCHASE_EQUITY + NET_DEBT // 945,000

const LEVERAGE_X = 5.0
const DEBT_RAISED = debtRaised(LEVERAGE_X, EBITDA) // 480,000
const EQUITY_CHEQUE = equityCheque(PURCHASE_EV, DEBT_RAISED) // 465,000

const money = (n: number) => n.toLocaleString('en-US')

const VALUE_LINE = `Bridge: market cap ${money(MARKET_CAP)} + total debt ${money(TOTAL_DEBT)} - cash ${money(
  CASH,
)} + 0 minority interest + 0 preferred stock = undisturbed enterprise value ${money(ENTERPRISE_VALUE)}.`

const STRUCTURE_LINE = `A 25% control premium on the $${SHARE_PRICE.toFixed(2)} share price lifts the deal to purchase equity ${money(
  PURCHASE_EQUITY,
)} + net debt ${money(NET_DEBT)} = offer enterprise value ${money(
  PURCHASE_EV,
)}, above the undisturbed ${money(ENTERPRISE_VALUE)}. At ${LEVERAGE_X.toFixed(1)}x EBITDA (${money(
  EBITDA,
)}), the buyout raises ${money(DEBT_RAISED)} of debt. The remaining ${money(EQUITY_CHEQUE)} of the ${money(
  PURCHASE_EV,
)} purchase price has to come from the equity cheque: ${money(PURCHASE_EV)} - ${money(DEBT_RAISED)} = ${money(EQUITY_CHEQUE)}.`

const DEFEND_EV_EXPLANATION =
  'A buyout buys the whole business, debt and all — the lender and the equity sponsor together are funding enterprise value, not just the shares. Market cap only prices the equity slice; levering off it would understate how much the deal actually costs and how much debt the business needs to carry.'

const DEFEND_LEVERAGE_EXPLANATION =
  'Brickhouse makes loading-dock levellers and industrial doors — a cyclical, capital-intensive business whose EBITDA can fall sharply in a downturn. Debt payments do not shrink when a recession hits, so lenders and sponsors cap leverage below the top of the range (7.0x) to keep interest and principal serviceable through a downturn. 5.0x leaves that cushion; 7.0x does not.'

const DEFEND_PREMIUM_EXPLANATION = `A 25% control premium is 25% more than the pre-deal share price, because taking control (the right to fire management, sell divisions, or merge operations) is worth more than a few shares on an exchange. $${SHARE_PRICE.toFixed(
  2,
)} x 1.25 = $${OFFER_PRICE.toFixed(2)}.`

const mission: Mission = {
  id: 'r5-capstone',
  rung: 5,
  order: 6,
  boss: true,
  title: 'Run the deal',
  tagline: 'Value it, structure it, defend it. This is the whole job in one sitting.',
  baseComp: 22_000,
  parSeconds: 420,
  finale: {
    eyebrow: 'Closing dinner',
    title: 'The deal closed.',
    body:
      'The steak arrives before the term sheet ink is dry, and someone sets a lucite deal toy on the table like a trophy for arithmetic. The MD raises a glass and takes full credit for a model he never opened.',
    emoji: '🍽️',
  },
  lesson: {
    title: 'A deal is value, then structure, then defense',
    body:
      "Every deal runs the same three steps. Value it: bridge equity value (market cap, what shareholders own) to enterprise value (EV, the whole business's price) by adding debt and subtracting cash — a buyer takes on what the company owes and gets to use what it holds. Structure it: a control premium — extra paid over trading price for control — lifts the undisturbed EV to the offer EV the buyout actually funds, split between debt (leverage, a multiple of EBITDA, profit before interest, tax, depreciation and amortization) and the equity cheque (the sponsor's own cash). Defend it: explain those choices. Brickhouse Industrial is the target throughout.",
    visual: {
      kind: 'bullets',
      items: [
        `Value it: market cap ${money(MARKET_CAP)} -> undisturbed EV ${money(ENTERPRISE_VALUE)}`,
        `Structure it: 25% premium -> offer EV ${money(PURCHASE_EV)}, funded by ${LEVERAGE_X.toFixed(1)}x EBITDA debt + equity cheque`,
        'Defend it: why EV, why that leverage, what a control premium buys',
      ],
    },
  },
  task: {
    kind: 'multi',
    prompt: "Run the Brickhouse Industrial buyout from valuation to term sheet to defense.",
    stages: [
      {
        id: 'value',
        title: 'Value it',
        intro: "Bridge Brickhouse's undisturbed market cap to its enterprise value, before any takeover premium.",
        task: {
          kind: 'bridge',
          prompt: 'Bridge Brickhouse from market cap to enterprise value. Fill in every adjustment bar.',
          unit: '$k',
          tolerance: 0,
          start: { label: 'Market cap (equity value)', value: MARKET_CAP, role: 'equity' },
          end: { label: 'Enterprise value', value: ENTERPRISE_VALUE, role: 'revenue' },
          adjustments: [
            { id: 'debt', label: 'Total debt', answer: TOTAL_DEBT, role: 'debt', hint: 'Lenders have a claim too' },
            { id: 'cash', label: 'Cash', answer: -CASH, role: 'cash', hint: 'Cash could pay debt down tomorrow' },
            { id: 'minority', label: 'Minority interest', answer: 0, role: 'neutral', hint: 'Brickhouse owns 100% of its subsidiaries' },
            { id: 'preferred', label: 'Preferred stock', answer: 0, role: 'neutral', hint: 'None issued' },
          ],
        },
      },
      {
        id: 'structure',
        title: 'Structure it',
        intro: `A 25% control premium lifts the offer to enterprise value ${money(
          PURCHASE_EV,
        )} (purchase equity ${money(PURCHASE_EQUITY)} + net debt ${money(
          NET_DEBT,
        )}) — set the leverage and the equity cheque that fund that offer, not the undisturbed ${money(ENTERPRISE_VALUE)}.`,
        task: {
          kind: 'slider',
          prompt:
            "Size the debt (as a multiple of EBITDA) and the equity cheque that, together, fund the offer enterprise value implied by a 25% control premium.",
          sliders: [
            {
              id: 'leverage',
              label: 'Leverage',
              min: 2,
              max: 7,
              step: 0.5,
              answer: LEVERAGE_X,
              tolerance: 0.5,
              unit: 'x',
              role: 'debt',
              hint: "Cyclical industrials carry less debt than the top of the range can technically support",
            },
            {
              id: 'equityCheque',
              label: 'Equity cheque',
              min: 300_000,
              max: 700_000,
              step: 10_000,
              answer: EQUITY_CHEQUE,
              tolerance: 30_000,
              unit: '$k',
              role: 'equity',
              hint: 'Offer enterprise value minus the debt raised',
            },
          ],
          readouts: [
            {
              id: 'debtRaised',
              label: 'Debt raised',
              unit: '$k',
              role: 'debt',
              compute: (values) => debtRaised(values.leverage ?? 0, EBITDA),
            },
            {
              id: 'equityImplied',
              label: 'Equity implied by that debt',
              unit: '$k',
              role: 'equity',
              compute: (values) => equityCheque(PURCHASE_EV, debtRaised(values.leverage ?? 0, EBITDA)),
            },
          ],
        },
      },
      {
        id: 'defend',
        title: 'Defend it',
        intro: 'No clock here. Explain the choices you just made.',
        task: {
          kind: 'quiz',
          prompt: 'Defend the deal.',
          questions: [
            {
              id: 'whyEv',
              text: "Why lever Brickhouse's enterprise value instead of just its market cap?",
              choices: [
                { id: 'equityOnly', label: 'Market cap already reflects everything a buyer needs to pay' },
                { id: 'wholeBusiness', label: 'A buyout funds the whole business, debt included, which is what EV prices' },
                { id: 'alwaysHigher', label: 'EV is always the bigger number, so it is the safer one to use' },
                { id: 'dailyPrice', label: "Market cap moves every day, so it is too unstable to lever off" },
              ],
              correctId: 'wholeBusiness',
              explanation: DEFEND_EV_EXPLANATION,
            },
            {
              id: 'whyLeverage',
              text: 'Why cap leverage at 5.0x EBITDA rather than the 7.0x top of the range for Brickhouse?',
              choices: [
                { id: 'cheaperDebt', label: 'Debt is always cheaper than equity, so more leverage is always better' },
                { id: 'cyclical', label: "Brickhouse's industrial, cyclical earnings need a cushion so debt stays serviceable in a downturn" },
                { id: 'hardCap', label: 'No lender will ever underwrite more than 5.0x for any company' },
                { id: 'taxRate', label: "5.0x happens to match Brickhouse's tax rate" },
              ],
              correctId: 'cyclical',
              explanation: DEFEND_LEVERAGE_EXPLANATION,
            },
            {
              id: 'whyPremium',
              text: "Brickhouse trades at $14.50 a share. A buyer offers a 25% control premium. What offer price does that imply?",
              choices: [
                { id: 'noPremium', label: '$14.50' },
                { id: 'tooLow', label: '$16.68' },
                { id: 'correct', label: '$18.13' },
                { id: 'tooHigh', label: '$21.75' },
              ],
              correctId: 'correct',
              explanation: DEFEND_PREMIUM_EXPLANATION,
            },
          ],
        },
      },
    ],
  },
  grade(answer) {
    if (answer.kind !== 'multi') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'multi') throw new Error('wrong task kind')
    const task = mission.task
    const valueTask = task.stages[0].task
    const structureTask = task.stages[1].task
    const defendTask = task.stages[2].task
    if (valueTask.kind !== 'bridge' || structureTask.kind !== 'slider' || defendTask.kind !== 'quiz') {
      throw new Error('wrong task kind')
    }

    // Every stage grader stashes its own explanation here so the top-level
    // explain callback (which only sees accuracy/verdict per stage) can
    // still list each stage's real reasoning, not just its banker line.
    const stageExplanations: Record<string, string> = {}

    const stageGraders: Record<string, (a: Answer) => GradeResult> = {
      value: (a) => {
        if (a.kind !== 'bridge') throw new Error('wrong answer kind')
        const result = gradeBridge(valueTask, a as BridgeAnswer, ({ accuracy }) => ({
          verdict: mdVerdict(accuracy, 'r5-capstone:value'),
          explanation: VALUE_LINE,
        }))
        stageExplanations.value = result.explanation
        return result
      },
      structure: (a) => {
        if (a.kind !== 'slider') throw new Error('wrong answer kind')
        const result = gradeSlider(structureTask, a as SliderAnswer, ({ accuracy }) => ({
          verdict: mdVerdict(accuracy, 'r5-capstone:structure'),
          explanation: STRUCTURE_LINE,
        }))
        stageExplanations.structure = result.explanation
        return result
      },
      defend: (a) => {
        if (a.kind !== 'quiz') throw new Error('wrong answer kind')
        const result = gradeQuiz(defendTask, a as QuizAnswer, ({ accuracy, wrongIds }) => {
          const explanations = defendTask.questions.filter((q) => wrongIds.includes(q.id)).map((q) => q.explanation)
          return {
            verdict: mdVerdict(accuracy, 'r5-capstone:defend'),
            explanation: explanations.length > 0 ? explanations.join(' ') : 'Every defense holds up.',
          }
        })
        stageExplanations.defend = result.explanation
        return result
      },
    }

    return gradeMulti(task, answer as MultiAnswer, stageGraders, ({ accuracy, stages }) => {
      const explanation = stages
        .map((s) => `${s.title} (${Math.round(s.accuracy * 100)}%): ${stageExplanations[s.id] ?? s.verdict}`)
        .join(' ')
      return {
        verdict: mdVerdict(accuracy, mission.id),
        explanation,
      }
    })
  },
}

export default mission
