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
const NET_DEBT = NANS_PANTRY.market!.netDebt // 300,000
const STORE_COUNT = 210

/** Grocery trades at 6.0x-7.5x EBITDA (src/missions/companies.ts GROCERY_PEERS); 7.0x is the fair-value pick a disciplined buyer underwrites to. */
const INTRINSIC_MULTIPLE = 7.0

/** Enterprise value at a given multiple of EBITDA. The one number the auction never shows the player. */
export function computeIntrinsicValue(ebitda: number, multiple: number): number {
  return ebitda * multiple
}

/** How much a winning bid ran over intrinsic value, as a percentage of it. Positive means overpaid. */
export function overpayPct(winningBid: number, intrinsic: number): number {
  return ((winningBid - intrinsic) / intrinsic) * 100
}

const INTRINSIC_VALUE = computeIntrinsicValue(EBITDA, INTRINSIC_MULTIPLE) // 1,008,000

const moneyK = (n: number) => `$${Math.round(n).toLocaleString('en-US')}k`
const pct = (n: number) => `${n.toFixed(1)}%`

const TEASER = `Nan's Pantry Markets Inc. runs ${STORE_COUNT} stores and pulled in ${moneyK(REVENUE)} of revenue last year. EBITDA (earnings before interest, taxes, depreciation and amortization) came in at ${moneyK(EBITDA)} — thin, but typical for grocery. Net debt sits at ${moneyK(NET_DEBT)}, mostly from a store-refresh program the board approved without asking to see the payback math. Grocery chains like this trade at 6.0x-7.5x EBITDA in the market, so know your ceiling before you raise a paddle. Three bidders are circling, and only one of them is pricing this like a grocery chain.`

const IV_LINE = `Nan's Pantry is worth about ${moneyK(INTRINSIC_VALUE)} to a disciplined buyer — ${INTRINSIC_MULTIPLE.toFixed(1)}x its ${moneyK(EBITDA)} EBITDA, the middle of grocery's 6.0x-7.5x trading range.`

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
        'Grocery trades at 6.0x-7.5x EBITDA',
        'Intrinsic value: about $1,008,000k',
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
    bidMin: 700_000,
    bidMax: 1_400_000,
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
