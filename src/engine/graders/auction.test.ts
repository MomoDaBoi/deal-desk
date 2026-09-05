import { describe, expect, it } from 'vitest'
import type { AuctionAnswer, AuctionTask } from '../types'
import { gradeAuction, simulateAuction, snapToStep } from './auction'

const noJoke = () => ({ verdict: 'v', explanation: 'e' })

function makeTask(overrides: Partial<AuctionTask> = {}): AuctionTask {
  return {
    kind: 'auction',
    prompt: 'Win the auction without overpaying.',
    teaser: 'A tidy little business with a loyal customer base.',
    unit: '$',
    intrinsicValue: 1000,
    rounds: 3,
    bidMin: 0,
    bidMax: 2000,
    bidStep: 10,
    bots: [
      { id: 'strat', name: 'The Strategic', style: 'strategic', blurb: 'Pays for synergies.' },
      { id: 'sponsor', name: 'The Sponsor', style: 'sponsor', blurb: 'Disciplined on price.' },
      { id: 'yolo', name: 'The Overbidder', style: 'overbidder', blurb: 'Wants a trophy asset.' },
    ],
    ...overrides,
  }
}

describe('snapToStep', () => {
  it('snaps to the nearest step above min', () => {
    expect(snapToStep(103, 10, 0)).toBe(100)
    expect(snapToStep(107, 10, 0)).toBe(110)
    expect(snapToStep(1005, 10, 5)).toBe(1005)
  })
})

describe('simulateAuction bot policies', () => {
  const task = makeTask()

  it('round 1: strategic bids 0.90x IV, sponsor 0.85x IV, overbidder 0.95x IV', () => {
    const result = simulateAuction(task, [500])
    const round1 = result.rounds[0]
    const strat = round1.bots.find((b) => b.id === 'strat')
    const sponsor = round1.bots.find((b) => b.id === 'sponsor')
    const yolo = round1.bots.find((b) => b.id === 'yolo')
    expect(strat?.bid).toBe(900)
    expect(sponsor?.bid).toBe(850)
    expect(yolo?.bid).toBe(950)
  })

  it('round 1 leader is the player when the player bids highest', () => {
    const result = simulateAuction(task, [990])
    expect(result.rounds[0].leader).toEqual({ id: 'player', bid: 990 })
  })

  it('later rounds follow min(ceiling, prevHigh * followRate)', () => {
    // Round 1: player bids 990, beating strategic (900), sponsor (850), overbidder (950).
    // Standing high after round 1 = 990. Round 2's player bid (500) is at or below that
    // standing high, so it does not count as a bid this round (covered separately below) -
    // it has no bearing on the bot bids, which only look at the standing high.
    const result = simulateAuction(task, [990, 500])
    const round2 = result.rounds[1]
    const strat = round2.bots.find((b) => b.id === 'strat')
    const sponsor = round2.bots.find((b) => b.id === 'sponsor')
    const yolo = round2.bots.find((b) => b.id === 'yolo')
    // strategic ceiling = 1060, min(1060, 990*1.03=1019.7 -> snap to 1020)
    expect(strat?.bid).toBe(1020)
    // sponsor ceiling = 970; standing high 990 > ceiling 970 -> drops out
    expect(sponsor?.bid).toBeNull()
    // overbidder ceiling = 1250, min(1250, 990*1.08=1069.2 -> snap 1070)
    expect(yolo?.bid).toBe(1070)
  })

  it('a bot that drops out stays out for the rest of the auction', () => {
    const result = simulateAuction(task, [990, 500, 500])
    const round3 = result.rounds[2]
    const sponsor = round3.bots.find((b) => b.id === 'sponsor')
    expect(sponsor?.bid).toBeNull()
  })

  it('bids are snapped to bidStep and clamped to [bidMin, bidMax]', () => {
    const tightTask = makeTask({ bidMax: 920 })
    const result = simulateAuction(tightTask, [500])
    const strat = result.rounds[0].bots.find((b) => b.id === 'strat')
    // 0.90 * 1000 = 900, within range and step-aligned already.
    expect(strat?.bid).toBe(900)
    const yolo = result.rounds[0].bots.find((b) => b.id === 'yolo')
    // overbidder wants 950 but bidMax clamps it to 920.
    expect(yolo?.bid).toBe(920)
  })

  it('fewer bids than rounds means the player walked away and stays out', () => {
    const result = simulateAuction(task, [500])
    expect(result.rounds[0].playerBid).toBe(500)
    expect(result.rounds[1].playerBid).toBeNull()
    expect(result.rounds[2].playerBid).toBeNull()
    expect(result.playerLastBid).toBe(500)
  })

  it('ties go to a bot: the player must strictly beat the high bid', () => {
    // The overbidder bids 950 in round 1 (the round's high). Player also bids
    // 950 -> tie -> the bot keeps the lead.
    const result = simulateAuction(task, [950])
    expect(result.rounds[0].leader?.id).toBe('yolo')
  })

  it('a bid at or below the standing high does not count as a bid', () => {
    // Round 1: player leads at 990. Round 2: the player "bids" 990 again (a
    // tie with their own standing bid) and 900 (below it) - neither is a valid
    // bid, so both rounds record playerBid: null even though bids[] has values.
    const tie = simulateAuction(task, [990, 990])
    expect(tie.rounds[1].playerBid).toBeNull()
    const below = simulateAuction(task, [990, 900])
    expect(below.rounds[1].playerBid).toBeNull()
  })

  it('the standing high persists even through a round nobody bids, rather than resetting to zero', () => {
    // Round 1: player spikes to 1400, clearing every bot's ceiling (highest is
    // 1250) for every later round. Round 2: the player's 700 is at or below the
    // standing high (1400) so it is not a bid, and every bot is out - the round
    // has no leader. Round 3: if the standing high had incorrectly reset to 0,
    // 700 would now count as a valid bid; it must not.
    const result = simulateAuction(task, [1400, 700, 700])
    expect(result.rounds[1].leader).toBeNull()
    expect(result.rounds[2].playerBid).toBeNull()
    expect(result.winner).toBe('player')
    expect(result.winningBid).toBe(1400)
  })

  it('winner and winning price are the highest bid across the whole auction, not the last round with a leader', () => {
    // Ascending, honest bidding: each round's high is also the auction's high so far.
    const result = simulateAuction(task, [990, 1200, 1300])
    expect(result.winner).toBe('player')
    expect(result.winningBid).toBe(1300)
  })

  it('a spike-then-lowball no longer wins at the lowball price (the old exploit)', () => {
    // Round 2 spikes to 1400, clearing every bot (ceilings top out at 1250) for
    // good. Round 3's 700 is at or below the standing high (1400) so it is not
    // a bid. The true winning price is the spike, not the retraction.
    const result = simulateAuction(task, [700, 1400, 700])
    expect(result.winner).toBe('player')
    expect(result.winningBid).toBe(1400)
    expect(result.rounds[2].playerBid).toBeNull()
  })
})

describe('gradeAuction shaping', () => {
  const task = makeTask()
  // The overbidder's own opening bid compounds well past intrinsic value
  // within a couple of rounds, so a single-round task isolates the shaping
  // math (winner/winningBid) from the multi-round escalation dynamics,
  // which are covered separately above.
  const oneRoundTask = makeTask({ rounds: 1 })

  it('winning at or below intrinsic value scores 1.0', () => {
    // Bots open at 900/850/950 in round 1; 960 beats all of them and is below IV (1000).
    const answer: AuctionAnswer = { kind: 'auction', bids: [960] }
    const result = gradeAuction(oneRoundTask, answer, noJoke)
    expect(result.accuracy).toBe(1)
  })

  it('winning ~10% over intrinsic value scores ~0.65', () => {
    // 1100 = 1.10 * IV, still beats every bot's round-1 ceiling (max 950).
    const answer: AuctionAnswer = { kind: 'auction', bids: [1100] }
    const result = gradeAuction(oneRoundTask, answer, noJoke)
    expect(result.accuracy).toBeCloseTo(0.65, 5)
  })

  it('losing with a disciplined last bid (>= 0.9x IV) scores 0.6', () => {
    // A single disciplined opening bid, then walking away. The overbidder's
    // ceiling (1250) guarantees it eventually outbids an absent player.
    const answer: AuctionAnswer = { kind: 'auction', bids: [900] }
    const result = gradeAuction(task, answer, noJoke)
    expect(result.accuracy).toBe(0.6)
  })

  it('losing after bidding well below intrinsic value scores 0.3', () => {
    const answer: AuctionAnswer = { kind: 'auction', bids: [100] }
    const result = gradeAuction(task, answer, noJoke)
    expect(result.accuracy).toBe(0.3)
  })

  it('never bidding scores 0', () => {
    const answer: AuctionAnswer = { kind: 'auction', bids: [] }
    const result = gradeAuction(task, answer, noJoke)
    expect(result.accuracy).toBe(0)
  })

  it('produces one detail per round plus an outcome detail', () => {
    const answer: AuctionAnswer = { kind: 'auction', bids: [990, 1200, 1300] }
    const result = gradeAuction(task, answer, noJoke)
    expect(result.details?.map((d) => d.id)).toEqual(['round1', 'round2', 'round3', 'outcome'])
    expect(result.details?.every((d) => d.ok !== undefined)).toBe(true)
  })

  it('a round the player passed is not ok but still produces a note', () => {
    const answer: AuctionAnswer = { kind: 'auction', bids: [990] }
    const result = gradeAuction(task, answer, noJoke)
    const round2 = result.details?.find((d) => d.id === 'round2')
    expect(round2?.ok).toBe(false)
    expect(round2?.note).toMatch(/passed/)
  })

  it('a round with an invalid (not-strictly-higher) bid also reads as passed', () => {
    const answer: AuctionAnswer = { kind: 'auction', bids: [990, 900] }
    const result = gradeAuction(task, answer, noJoke)
    const round2 = result.details?.find((d) => d.id === 'round2')
    expect(round2?.ok).toBe(false)
    expect(round2?.note).toMatch(/passed/)
  })

  it('renders a "$k"-style unit as a prefix with the scale suffixed, e.g. "$1,000k"', () => {
    const kTask = makeTask({ unit: '$k', intrinsicValue: 1_185_000, bidMin: 800_000, bidMax: 1_600_000, bidStep: 10_000 })
    const answer: AuctionAnswer = { kind: 'auction', bids: [1_140_000] }
    const result = gradeAuction({ ...kTask, rounds: 1 }, answer, noJoke)
    const round1 = result.details?.find((d) => d.id === 'round1')
    expect(round1?.note).toContain('$1,140,000k')
  })
})
