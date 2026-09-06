import type { AuctionAnswer, AuctionTask, GradeResult } from '../types'

/**
 * Snap a value to the nearest step above `min`, then clamp back into
 * whatever range the caller enforces separately. Used by the widget for the
 * slider readout and by the simulator for the player's submitted bid.
 */
export function snapToStep(value: number, step: number, min: number): number {
  if (step <= 0) return value
  return min + Math.round((value - min) / step) * step
}

/**
 * Snap *down* to a step above `min`. Bot bids use this so a bot can never
 * end up bidding through its own walk-away ceiling just because the ceiling
 * happens to fall between two steps.
 */
function floorToStep(value: number, step: number, min: number): number {
  if (step <= 0) return value
  return min + Math.floor((value - min) / step) * step
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

type BotStyle = AuctionTask['bots'][number]['style']

/**
 * Ceiling and bid-shaping constants per bot style. All bids scale off
 * `intrinsicValue`.
 *
 * Two of the three bots walk away *below* intrinsic value: the sponsor is
 * underwriting to a model (0.92x) and the strategic has a board-approved cap
 * just under fair value (0.97x). Only the overbidder chases past intrinsic
 * value (1.25x) - it is the bidder that catches the winner's curse, and the
 * reason a disciplined player is eventually asked to walk.
 */
const POLICY: Record<BotStyle, { ceiling: number; open: number; followRate: number }> = {
  strategic: { ceiling: 0.97, open: 0.9, followRate: 1.03 },
  sponsor: { ceiling: 0.92, open: 0.85, followRate: 1.02 },
  overbidder: { ceiling: 1.25, open: 0.95, followRate: 1.08 },
}

/**
 * A pre-emptive bid. When the player takes the lead in a round at or above
 * this share of intrinsic value, every bot stands down for the rest of the
 * auction: a credible full-value bid ends a process before it turns into a
 * war, which is how pre-emptive bids work in real M&A.
 *
 * This is the deterministic path on which a disciplined player can win at or
 * below intrinsic value. It is not a cheat code - the winning price is still
 * whatever the player bid, so pre-empting *above* intrinsic value is graded
 * as overpaying like any other overpayment.
 */
export const PREEMPT_AT = 0.98

/**
 * One bot's bid for a round, or `null` if it is out for good: either the
 * standing high is already past its ceiling, or the most it will pay can no
 * longer beat the standing high.
 */
function botBid(style: BotStyle, iv: number, round: number, prevHigh: number, task: AuctionTask): number | null {
  const policy = POLICY[style]
  const ceiling = policy.ceiling * iv
  if (round > 1 && prevHigh > ceiling) return null
  const raw = round === 1 ? policy.open * iv : Math.min(ceiling, prevHigh * policy.followRate)
  const bid = clamp(floorToStep(raw, task.bidStep, task.bidMin), task.bidMin, task.bidMax)
  if (round > 1 && bid <= prevHigh) return null
  return bid
}

export interface AuctionRoundResult {
  round: number
  playerBid: number | null
  bots: { id: string; name: string; bid: number | null }[]
  leader: { id: string; bid: number } | null
}

export interface AuctionSimResult {
  rounds: AuctionRoundResult[]
  winner: string | null
  winningBid: number | null
  playerLastBid: number | null
}

/**
 * Replay an auction from the player's submitted bids. Bot policies are pure
 * functions of the task and the standing high bid (which includes the
 * player and never falls), so the same `bids` array always replays
 * identically.
 *
 * A bid must strictly exceed the standing high going into that round; one
 * that does not (at or below it) counts as no bid for that round, exactly
 * like a pass, rather than as a valid-but-losing bid. The standing high
 * itself only ever rises: a round nobody wins does not erase it. The player
 * is out for every later round once `bids` runs shorter than the current
 * round (they walked away). A bot that sees the standing high above its
 * ceiling drops out (bids `null`) for good, and so does every bot once the
 * player lands a pre-emptive bid (see PREEMPT_AT).
 *
 * The winner and winning price are the highest bid placed at any point in
 * the whole auction, not whichever bid happened to lead the final round -
 * a bidder cannot un-win by later declining to bid. Ties go to a bot.
 */
export function simulateAuction(task: AuctionTask, bids: number[]): AuctionSimResult {
  const iv = task.intrinsicValue
  const rounds: AuctionRoundResult[] = []
  let standingHigh = 0
  const botsOut = new Set<string>()
  let playerOut = false
  let preempted = false

  let winner: string | null = null
  let winningBid = 0

  for (let r = 1; r <= task.rounds; r++) {
    if (!playerOut && bids[r - 1] === undefined) playerOut = true
    let playerBid: number | null = null
    if (!playerOut) {
      const submitted = clamp(snapToStep(bids[r - 1], task.bidStep, task.bidMin), task.bidMin, task.bidMax)
      // A bid at or below the standing high does not count as a bid this round.
      playerBid = submitted > standingHigh ? submitted : null
    }

    const botBids = task.bots.map((bot) => {
      if (botsOut.has(bot.id)) return { id: bot.id, name: bot.name, bid: null }
      const bid = preempted ? null : botBid(bot.style, iv, r, standingHigh, task)
      if (bid === null) botsOut.add(bot.id)
      return { id: bot.id, name: bot.name, bid }
    })

    let leader: { id: string; bid: number } | null = null
    for (const b of botBids) {
      if (b.bid !== null && (leader === null || b.bid > leader.bid)) leader = { id: b.id, bid: b.bid }
    }
    // Ties go to a bot: the player must bid strictly higher to lead.
    if (playerBid !== null && (leader === null || playerBid > leader.bid)) leader = { id: 'player', bid: playerBid }

    rounds.push({ round: r, playerBid, bots: botBids, leader })

    if (leader !== null) {
      standingHigh = Math.max(standingHigh, leader.bid)
      // Highest bid across the whole auction wins; a tie keeps a standing bot ahead of the player.
      if (leader.bid > winningBid || (leader.bid === winningBid && leader.id !== 'player')) {
        winningBid = leader.bid
        winner = leader.id
      }
      // A full-value bid that takes the lead pre-empts the rest of the room.
      if (leader.id === 'player' && leader.bid >= PREEMPT_AT * iv) preempted = true
    }
  }

  const playerRounds = rounds.filter((r) => r.playerBid !== null)
  const playerLastBid = playerRounds.length > 0 ? playerRounds[playerRounds.length - 1].playerBid : null

  return { rounds, winner, winningBid: winner === null ? null : winningBid, playerLastBid }
}

export type AuctionBand = 'won-below' | 'won-fair' | 'overpaid' | 'walked-away' | 'lost-narrowly' | 'lost-badly' | 'never-bid'

/** Half-width of the band around intrinsic value that counts as bidding "at your number", either side. */
const AT_YOUR_NUMBER = 0.05
/** A losing last bid at least this share of intrinsic value still counts as having competed. */
const SERIOUS_BID = 0.9
/** Accuracy lost per 1x of intrinsic value paid above the fair band. */
const OVERPAY_SLOPE = 6

function shapeAccuracy(task: AuctionTask, result: AuctionSimResult): { accuracy: number; overpaidBy: number; band: AuctionBand } {
  const iv = task.intrinsicValue
  const won = result.winner === 'player'

  if (won) {
    const b = result.winningBid as number
    if (b <= iv) return { accuracy: 1, overpaidBy: 0, band: 'won-below' }
    if (b <= (1 + AT_YOUR_NUMBER) * iv) return { accuracy: 0.85, overpaidBy: b - iv, band: 'won-fair' }
    const over = 0.85 - OVERPAY_SLOPE * ((b - (1 + AT_YOUR_NUMBER) * iv) / iv)
    return { accuracy: Math.max(0, over), overpaidBy: b - iv, band: 'overpaid' }
  }

  const last = result.playerLastBid
  if (last === null) {
    return { accuracy: 0, overpaidBy: 0, band: 'never-bid' }
  }
  // The room finished above intrinsic value and the player's last bid stood
  // at their number (inside the fair band, either side): they held the line
  // and let someone else buy the winner's curse. In M&A that is the win.
  const roomOverpaid = result.winningBid !== null && result.winningBid > iv
  if (roomOverpaid && last >= (1 - AT_YOUR_NUMBER) * iv && last <= (1 + AT_YOUR_NUMBER) * iv) {
    return { accuracy: 1, overpaidBy: 0, band: 'walked-away' }
  }
  if (last >= SERIOUS_BID * iv) {
    return { accuracy: 0.6, overpaidBy: 0, band: 'lost-narrowly' }
  }
  return { accuracy: 0.3, overpaidBy: 0, band: 'lost-badly' }
}

/** A unit starting with "$" is a prefix currency (thousands-grouped) with the rest of the unit as a suffix, e.g. "$k" -> "$1,185,000k". Any other unit is a plain suffix. */
function fmtMoney(n: number, unit?: string): string {
  const s = Math.round(n).toLocaleString('en-US')
  if (!unit) return s
  if (unit.startsWith('$')) return `$${s}${unit.slice(1)}`
  return `${s} ${unit}`
}

/**
 * Grade an auction task by replaying `answer.bids` through `simulateAuction`
 * and shaping the result. Not overpaying is the skill, so there are two ways
 * to score full marks: winning at or below intrinsic value, and losing to a
 * room that finished above intrinsic value while your own last bid stood
 * within 5% of it. Winning up to 5% over scores 0.85 and falls off steeply
 * from there - a win more than ~11% over intrinsic value scores below a
 * narrow loss. Losing with a serious but early last bid (>= 90% of intrinsic
 * value) scores 0.6, losing after bidding below that 0.3, never bidding 0.
 * Pure: no randomness, no I/O.
 */
export function gradeAuction(
  task: AuctionTask,
  answer: AuctionAnswer,
  explain: (ctx: {
    accuracy: number
    result: AuctionSimResult
    overpaidBy: number
    band: AuctionBand
  }) => { verdict: string; explanation: string },
): GradeResult {
  const result = simulateAuction(task, answer.bids)
  const { accuracy, overpaidBy, band } = shapeAccuracy(task, result)

  const details: { id: string; ok: boolean; note?: string }[] = result.rounds.map((r) => {
    const ok = r.playerBid !== null
    const leaderName = r.leader === null ? 'no one' : r.leader.id === 'player' ? 'you' : task.bots.find((b) => b.id === r.leader!.id)?.name ?? r.leader.id
    const bidText = ok ? fmtMoney(r.playerBid as number, task.unit) : 'passed'
    const highText = r.leader === null ? 'n/a' : fmtMoney(r.leader.bid, task.unit)
    return {
      id: `round${r.round}`,
      ok,
      note: ok ? `You bid ${bidText}; high bid ${highText} by ${leaderName}` : `You passed; high bid ${highText} by ${leaderName}`,
    }
  })

  const outcomeOk = accuracy >= 0.6
  const { verdict, explanation } = explain({ accuracy, result, overpaidBy, band })
  details.push({ id: 'outcome', ok: outcomeOk, note: explanation })

  return { accuracy, verdict, explanation, details }
}
