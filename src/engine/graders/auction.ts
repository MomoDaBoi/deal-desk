import type { AuctionAnswer, AuctionTask, GradeResult } from '../types'

/**
 * Snap a value to the nearest step above `min`, then clamp back into
 * whatever range the caller enforces separately. Shared by the simulator
 * (bot bids) and the widget (slider readout).
 */
export function snapToStep(value: number, step: number, min: number): number {
  if (step <= 0) return value
  return min + Math.round((value - min) / step) * step
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

type BotStyle = AuctionTask['bots'][number]['style']

/** Ceiling and bid-shaping constants per bot style. All bids scale off `intrinsicValue`. */
const POLICY: Record<BotStyle, { ceiling: number; open: number; followRate: number }> = {
  strategic: { ceiling: 1.06, open: 0.9, followRate: 1.03 },
  sponsor: { ceiling: 0.97, open: 0.85, followRate: 1.02 },
  overbidder: { ceiling: 1.25, open: 0.95, followRate: 1.08 },
}

function botBid(style: BotStyle, iv: number, round: number, prevHigh: number, task: AuctionTask): number | null {
  const policy = POLICY[style]
  const ceiling = policy.ceiling * iv
  if (round > 1 && prevHigh > ceiling) return null
  const raw = round === 1 ? policy.open * iv : Math.min(ceiling, prevHigh * policy.followRate)
  const snapped = snapToStep(raw, task.bidStep, task.bidMin)
  return clamp(snapped, task.bidMin, task.bidMax)
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
 * ceiling drops out (bids `null`) for good.
 *
 * The winner and winning price are the highest bid placed at any point in
 * the whole auction, not whichever bid happened to lead the final round —
 * a bidder cannot un-win by later declining to bid. Ties go to a bot.
 */
export function simulateAuction(task: AuctionTask, bids: number[]): AuctionSimResult {
  const iv = task.intrinsicValue
  const rounds: AuctionRoundResult[] = []
  let standingHigh = 0
  const botsOut = new Set<string>()
  let playerOut = false

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
      const bid = botBid(bot.style, iv, r, standingHigh, task)
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
    }
  }

  const playerRounds = rounds.filter((r) => r.playerBid !== null)
  const playerLastBid = playerRounds.length > 0 ? playerRounds[playerRounds.length - 1].playerBid : null

  return { rounds, winner, winningBid: winner === null ? null : winningBid, playerLastBid }
}

export type AuctionBand = 'won-below' | 'won-fair' | 'overpaid' | 'lost-narrowly' | 'lost-badly' | 'never-bid'

function shapeAccuracy(task: AuctionTask, result: AuctionSimResult): { accuracy: number; overpaidBy: number; band: AuctionBand } {
  const iv = task.intrinsicValue
  const won = result.winner === 'player'

  if (won) {
    const b = result.winningBid as number
    if (b <= iv) return { accuracy: 1, overpaidBy: 0, band: 'won-below' }
    if (b <= 1.05 * iv) return { accuracy: 0.85, overpaidBy: b - iv, band: 'won-fair' }
    const over = 0.85 - 4 * ((b - 1.05 * iv) / iv)
    return { accuracy: Math.max(0, over), overpaidBy: b - iv, band: 'overpaid' }
  }

  if (result.playerLastBid === null) {
    return { accuracy: 0, overpaidBy: 0, band: 'never-bid' }
  }
  if (result.playerLastBid >= 0.9 * iv) {
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
 * and shaping the result: winning at or below intrinsic value scores 1,
 * winning up to 5% over scores 0.85, winning further above falls off
 * steeply, losing with a disciplined last bid (>= 90% of intrinsic value)
 * scores 0.6, losing after bidding well below scores 0.3, never bidding
 * scores 0. Pure: no randomness, no I/O.
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
