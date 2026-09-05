import type { Mission } from '../engine/types'
import { gradeAuction } from '../engine/graders/auction'
import { mdVerdict } from '../engine/voice'
import { NANS_PANTRY } from './companies'

/**
 * Rung 5, mission 5. A live auction for Nan's Pantry Markets against three
 * scripted bots (src/engine/graders/auction.ts owns the bot policy and the
 * shaped scoring curve; this file only supplies the deal and the copy).
 * Every number below is derived from the company bible
 * (src/missions/companies.ts) with a pure helper so the test can recompute
 * it independently. All dollar figures are in $k, the bible's convention.
 */

const REVENUE = NANS_PANTRY.income.revenue // 2,400,000
const EBITDA = NANS_PANTRY.income.ebitda // 144,000
const SHARE_PRICE = NANS_PANTRY.market!.price // 11.80
const SHARES_K = NANS_PANTRY.market!.sharesK // 60,000
const NET_DEBT = NANS_PANTRY.market!.netDebt // 300,000
const TRADING_MULTIPLE = NANS_PANTRY.market!.evEbitda // 7.0
const STORE_COUNT = 210
const CONTROL_PREMIUM_PCT = 25

/**
 * A disciplined buyer here is pricing the whole company, which means paying
 * for control the same way r3-precedents does for this exact target: a 25%
 * premium over the $11.80 trading price, times shares out, plus net debt.
 * That is 8.2x EBITDA — above the 7.0x the shares trade at, because control
 * is not the same thing as a quote. The one number the auction never shows
 * the player.
 */
export function computeIntrinsicValue(sharePrice: number, sharesK: number, premiumPct: number, netDebt: number): number {
  const offerPrice = Math.round(sharePrice * (1 + premiumPct / 100) * 100) / 100
  return sharesK * offerPrice + netDebt
}

/** How much a winning bid ran over intrinsic value, as a percentage of it. Positive means overpaid. */
export function overpayPct(winningBid: number, intrinsic: number): number {
  return ((winningBid - intrinsic) / intrinsic) * 100
}

const INTRINSIC_VALUE = computeIntrinsicValue(SHARE_PRICE, SHARES_K, CONTROL_PREMIUM_PCT, NET_DEBT) // 1,185,000
const INTRINSIC_MULTIPLE = Math.round((INTRINSIC_VALUE / EBITDA) * 10) / 10 // 8.2
const OFFER_PRICE = Math.round(SHARE_PRICE * (1 + CONTROL_PREMIUM_PCT / 100) * 100) / 100 // 14.75
const EQUITY_VALUE = INTRINSIC_VALUE - NET_DEBT // 885,000

const moneyK = (n: number) => `$${Math.round(n).toLocaleString('en-US')}k`
const pct = (n: number) => `${n.toFixed(1)}%`

const TEASER = `Nan's Pantry Markets Inc. runs ${STORE_COUNT} stores and pulled in ${moneyK(REVENUE)} of revenue last year. EBITDA (earnings before interest, taxes, depreciation and amortization) came in at ${moneyK(EBITDA)} — thin, but typical for grocery. Net debt sits at ${moneyK(NET_DEBT)}, mostly from a store-refresh program the board approved without asking to see the payback math. The shares trade around ${TRADING_MULTIPLE.toFixed(1)}x EBITDA, but recent whole-company grocery deals have cleared at 8.4x-9.2x — a buyer paying for control pays more than a stock quote. Three bidders are circling, and only one of them is pricing this like a takeover.`

const IV_LINE = `Nan's Pantry is worth about ${moneyK(INTRINSIC_VALUE)} to a disciplined buyer paying for control — a 25% premium over its $${SHARE_PRICE.toFixed(2)} share price is $${OFFER_PRICE.toFixed(2)} a share (${moneyK(EQUITY_VALUE)} of equity), plus ${moneyK(NET_DEBT)} of net debt, about ${INTRINSIC_MULTIPLE.toFixed(1)}x its ${moneyK(EBITDA)} EBITDA.`

const BOTS = [
  {
    id: 'strategic',
    name: 'Copperline Markets',
    style: 'strategic' as const,
    blurb: 'A rival grocery chain. Sees route synergies and a bigger buying network, and will pay a bit extra to lock them in.',
  },
  {
    id: 'sponsor',
    name: 'Trestle Capital',
    style: 'sponsor' as const,
    blurb: 'A private-equity sponsor underwriting to a hard number. Disciplined, and the first to walk when the price outruns the model.',
  },
  {
    id: 'overbidder',
    name: 'Halcyon Holdings',
    style: 'overbidder' as const,
    blurb: 'A conglomerate whose CEO wants a grocery chain in the annual report. Price is not really the point.',
  },
]

/** Bot display name for a winner id, or "you" / "no one" for the player / an empty room. */
function winnerName(winner: string | null): string {
  if (winner === null) return 'no one'
  if (winner === 'player') return 'you'
  return BOTS.find((b) => b.id === winner)?.name ?? winner
}

const mission: Mission = {
  id: 'r5-auction',
  rung: 5,
  order: 5,
  title: 'The auction',
  tagline: "Three bidders, one grocery chain, and a room full of people about to overpay.",
  baseComp: 14_000,
  parSeconds: 240,
  lesson: {
    title: "Read the teaser, don't chase the room",
    body:
      "A teaser is the one-page summary of a target a banker sends to buyers before an auction — enough to spark interest, not enough to price the deal precisely. Every bidder estimates intrinsic value: what the business is genuinely worth to a disciplined buyer. Because several buyers bid against each other, the highest bidder wins — and the highest bidder is often the one who guessed most wrong. That gap is the winner's curse: winning proves you valued it above everyone else in the room, not that you were right. Walking away once the price runs past your number is not losing. It means refusing to own a business at a price it cannot support.",
    visual: {
      kind: 'bullets',
      items: [
        "Nan's Pantry: 210 stores, $144,000k EBITDA",
        'Shares trade around 7.0x EBITDA; grocery control deals have cleared at 8.4x-9.2x',
        'Multiply EBITDA by the control range yourself — that is your ceiling',
      ],
    },
  },
  task: {
    kind: 'auction',
    prompt:
      "Read the teaser, then bid for Nan's Pantry Markets across three rounds. Win it cheap, win it fair, or walk away — just don't win it by overpaying.",
    teaser: TEASER,
    unit: '$k',
    intrinsicValue: INTRINSIC_VALUE,
    rounds: 3,
    bidMin: 800_000,
    bidMax: 1_600_000,
    bidStep: 10_000,
    bots: BOTS,
  },
  grade(answer) {
    if (answer.kind !== 'auction') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'auction') throw new Error('wrong task kind')
    return gradeAuction(mission.task, answer, ({ accuracy, result, overpaidBy, band }) => {
      switch (band) {
        case 'won-below': {
          const under = overpayPct(result.winningBid as number, INTRINSIC_VALUE)
          return {
            verdict: 'Bought it under value. The MD checks the number twice and still cannot find the catch.',
            explanation: `You won at ${moneyK(result.winningBid as number)}, ${pct(Math.abs(under))} under the ${moneyK(INTRINSIC_VALUE)} intrinsic value (${INTRINSIC_MULTIPLE.toFixed(1)}x Nan's Pantry's ${moneyK(EBITDA)} EBITDA). Everyone else in the room was chasing a headline; you had a number and stuck to it.`,
          }
        }
        case 'won-fair': {
          const over = overpayPct(result.winningBid as number, INTRINSIC_VALUE)
          return {
            verdict: mdVerdict(accuracy, 'r5-auction'),
            explanation: `You won at ${moneyK(result.winningBid as number)}, ${pct(over)} over the ${moneyK(INTRINSIC_VALUE)} intrinsic value. A few points over is close enough to call fair — the winner's curse gets expensive well past this, not right here.`,
          }
        }
        case 'overpaid': {
          const overPct = overpayPct(result.winningBid as number, INTRINSIC_VALUE)
          return {
            verdict: mdVerdict(accuracy, 'r5-auction'),
            explanation: `You won at ${moneyK(result.winningBid as number)} — ${moneyK(overpaidBy)} over the ${moneyK(INTRINSIC_VALUE)} intrinsic value, ${pct(overPct)} too much. That is the winner's curse in one line: winning an auction only proves you valued Nan's Pantry higher than Copperline, Trestle, and Halcyon. It does not prove you were right.`,
          }
        }
        case 'lost-narrowly': {
          return {
            verdict: mdVerdict(accuracy, 'r5-auction'),
            explanation: `You lost, but your last bid of ${moneyK(result.playerLastBid as number)} stayed within 10% of the ${moneyK(INTRINSIC_VALUE)} intrinsic value. Losing to ${winnerName(result.winner)} here is fine — a buyer chasing a trophy asset, not a return, just paid more than the business is worth. That is now their problem, not yours.`,
          }
        }
        case 'lost-badly': {
          return {
            verdict: mdVerdict(accuracy, 'r5-auction'),
            explanation: `You lost after topping out at ${moneyK(result.playerLastBid as number)}, well under the ${moneyK(INTRINSIC_VALUE)} intrinsic value. There was room to bid higher and still land under fair value — this one slipped away too early, not too expensively.`,
          }
        }
        case 'never-bid':
        default: {
          return {
            verdict: mdVerdict(0, 'r5-auction'),
            explanation: `You walked before placing a single bid. ${IV_LINE} Worth at least testing the room with an opening bid before folding — a teaser this clean deserved one round of interest.`,
          }
        }
      }
    })
  },
}

export default mission
