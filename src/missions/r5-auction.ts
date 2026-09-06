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
    title: "Bid your number, then stop",
    body:
      "A teaser is the one-page summary a banker sends buyers before an auction — enough to spark interest, never enough to price the deal for you. Do that yourself. Intrinsic value is what the target is worth to a disciplined buyer paying for control, and it is a ceiling, not a target. Two outcomes score full marks. Bid your number early and decisively: a credible full-value bid usually ends a process before it becomes a war. Or let the room run past your number and stop — walking away costs nothing. Winning above your number costs plenty, because the high bidder is usually the one who guessed most wrong. That is the winner's curse.",
    visual: {
      kind: 'bullets',
      items: [
        "Nan's Pantry: 210 stores, $144,000k EBITDA, $300,000k net debt",
        'Shares trade at 7.0x EBITDA — a quote for a sliver, not a price for the whole company',
        'Control math: 7.0x EBITDA, strip net debt, add a 25% premium, put net debt back',
        'Bid that number once and mean it; above it, let the room have it',
      ],
    },
  },
  task: {
    kind: 'auction',
    prompt:
      "Read the teaser, work out what Nan's Pantry is worth, then bid across three rounds. Take it at or under your number, or let the room have it above yours — both are wins. Winning it by overpaying is not.",
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
            explanation: `You won at ${moneyK(result.winningBid as number)}, ${pct(Math.abs(under))} under the ${moneyK(INTRINSIC_VALUE)} intrinsic value (${INTRINSIC_MULTIPLE.toFixed(1)}x Nan's Pantry's ${moneyK(EBITDA)} EBITDA). A full-value bid, made early and meant, ends a process: Copperline and Trestle were capped below you and Halcyon had nothing left to prove.`,
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
        case 'walked-away': {
          const over = overpayPct(result.winningBid as number, INTRINSIC_VALUE)
          return {
            verdict: 'You let it go. The MD says nothing, which from him is applause.',
            explanation: `You stopped at ${moneyK(result.playerLastBid as number)} and let ${winnerName(result.winner)} have it at ${moneyK(result.winningBid as number)}, ${pct(over)} over the ${moneyK(INTRINSIC_VALUE)} intrinsic value. That is a win. You bid your number, the room bid past it, and the winner's curse landed on someone else's balance sheet.`,
          }
        }
        case 'lost-narrowly': {
          const last = result.playerLastBid as number
          const gap = overpayPct(last, INTRINSIC_VALUE)
          if (gap < 0) {
            return {
              verdict: mdVerdict(accuracy, 'r5-auction'),
              explanation: `You lost to ${winnerName(result.winner)} at ${moneyK(result.winningBid as number)} after topping out at ${moneyK(last)}, ${pct(Math.abs(gap))} under the ${moneyK(INTRINSIC_VALUE)} intrinsic value. Losing is fine here — but you stopped short of your own number, so this was a business you could have owned at a price that worked.`,
            }
          }
          return {
            verdict: mdVerdict(accuracy, 'r5-auction'),
            explanation: `You lost to ${winnerName(result.winner)} at ${moneyK(result.winningBid as number)}, but your last bid of ${moneyK(last)} was already ${pct(gap)} over the ${moneyK(INTRINSIC_VALUE)} intrinsic value. Being outbid saved you money; it is not the same as bidding well. You were willing to overpay and someone simply wanted it more.`,
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
