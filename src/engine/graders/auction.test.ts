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
    const result = simulateAuction(task, [960])
    expect(result.rounds[0].leader).toEqual({ id: 'player', bid: 960 })
  })

  it('two of the three bots have a walk-away ceiling below intrinsic value', () => {
    // Left alone, the room stops at the sponsor's 0.92x and the strategic's
    // 0.97x; only the overbidder is still bidding above intrinsic value.
    const result = simulateAuction(task, [])
    const bids = (r: number, id: string) => result.rounds[r].bots.find((b) => b.id === id)?.bid
    expect(bids(1, 'sponsor')).toBeNull() // ceiling 920, standing high 950
    expect(bids(2, 'strat')).toBeNull() // ceiling 970, standing high 1020
    expect(result.winner).toBe('yolo')
    expect(result.winningBid).toBe(1100)
  })

  it('later rounds follow min(ceiling, prevHigh * followRate), floored to the step so no bot bids through its ceiling', () => {
    // Round 1: player bids 960, beating strategic (900), sponsor (850), overbidder (950),
    // but staying under the 0.98x pre-emption threshold, so the room keeps bidding.
    // Standing high after round 1 = 960. Round 2's player bid (500) is at or below that
    // standing high, so it does not count as a bid this round - it has no bearing on the
    // bot bids, which only look at the standing high.
    const result = simulateAuction(task, [960, 500])
    const round2 = result.rounds[1]
    const strat = round2.bots.find((b) => b.id === 'strat')
    const sponsor = round2.bots.find((b) => b.id === 'sponsor')
    const yolo = round2.bots.find((b) => b.id === 'yolo')
    // strategic: min(ceiling 970, 960*1.03 = 988.8) = 970
    expect(strat?.bid).toBe(970)
    // sponsor ceiling = 920; standing high 960 > ceiling -> drops out
    expect(sponsor?.bid).toBeNull()
    // overbidder: min(ceiling 1250, 960*1.08 = 1036.8) -> floored to 1030
    expect(yolo?.bid).toBe(1030)
  })

  it('a bot that drops out stays out for the rest of the auction', () => {
    const result = simulateAuction(task, [960, 500, 500])
    const round3 = result.rounds[2]
    const sponsor = round3.bots.find((b) => b.id === 'sponsor')
    expect(sponsor?.bid).toBeNull()
    // The strategic is at its 970 ceiling and the standing high (1030) is past it.
    expect(round3.bots.find((b) => b.id === 'strat')?.bid).toBeNull()
  })

  it('a pre-emptive bid - taking the lead at >= 0.98x intrinsic value - clears the room for good', () => {
    const result = simulateAuction(task, [980])
    expect(result.rounds[0].leader).toEqual({ id: 'player', bid: 980 })
    for (const bot of result.rounds[1].bots) expect(bot.bid).toBeNull()
    for (const bot of result.rounds[2].bots) expect(bot.bid).toBeNull()
    expect(result.winner).toBe('player')
    expect(result.winningBid).toBe(980)
  })

  it('a lead below the pre-emption threshold does not clear the room', () => {
    const result = simulateAuction(task, [970])
    expect(result.rounds[0].leader).toEqual({ id: 'player', bid: 970 })
    expect(result.rounds[1].bots.find((b) => b.id === 'yolo')?.bid).toBe(1040)
    expect(result.winner).toBe('yolo')
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
    // Round 1: player leads at 960. Round 2: the player "bids" 960 again (a
    // tie with their own standing bid) and 900 (below it) - neither is a valid
    // bid, so both rounds record playerBid: null even though bids[] has values.
    const tie = simulateAuction(task, [960, 960])
    expect(tie.rounds[1].playerBid).toBeNull()
    const below = simulateAuction(task, [960, 900])
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
  // The overbidder's own opening bid compounds past intrinsic value within a
  // couple of rounds, so a single-round task isolates the shaping math
  // (winner/winningBid) from the multi-round escalation dynamics, which are
  // covered separately above.
  const oneRoundTask = makeTask({ rounds: 1 })

  it('winning at or below intrinsic value scores 1.0', () => {
    // Bots open at 900/850/950 in round 1; 960 beats all of them and is below IV (1000).
    const answer: AuctionAnswer = { kind: 'auction', bids: [960] }
    const result = gradeAuction(oneRoundTask, answer, noJoke)
    expect(result.accuracy).toBe(1)
  })

  it('a full-value pre-emptive bid wins at or below intrinsic value over the full three rounds', () => {
    // The top band has to be reachable against the shipped bot policy, not
    // just in a one-round toy: 980 clears the room and holds to the end.
    const answer: AuctionAnswer = { kind: 'auction', bids: [980] }
    const result = gradeAuction(task, answer, noJoke)
    expect(result.accuracy).toBe(1)
  })

  it('winning 5% over intrinsic value scores 0.85', () => {
    const answer: AuctionAnswer = { kind: 'auction', bids: [1050] }
    const result = gradeAuction(oneRoundTask, answer, noJoke)
    expect(result.accuracy).toBe(0.85)
  })

  it('winning ~10% over intrinsic value scores below a narrow loss', () => {
    // 1100 = 1.10 * IV, still beats every bot's round-1 ceiling (max 950).
    const answer: AuctionAnswer = { kind: 'auction', bids: [1100] }
    const result = gradeAuction(oneRoundTask, answer, noJoke)
    expect(result.accuracy).toBeCloseTo(0.55, 5)
    expect(result.accuracy).toBeLessThan(0.6)
  })

  it('losing to a room that ran past intrinsic value, with a last bid within 5% of it, scores 1.0', () => {
    // 960 leads round 1 but is under the pre-emption threshold, so the
    // overbidder keeps climbing and takes it at 1110. Refusing to follow it
    // above intrinsic value is the point of the mission.
    const answer: AuctionAnswer = { kind: 'auction', bids: [960] }
    const result = gradeAuction(task, answer, noJoke)
    expect(result.accuracy).toBe(1)
  })

  it('losing with a disciplined but early last bid (>= 0.9x IV) scores 0.6', () => {
    // 900 is 10% under intrinsic value: serious, but short of the player's own
    // number, so there was a deal here they did not take.
    const answer: AuctionAnswer = { kind: 'auction', bids: [900] }
    const result = gradeAuction(task, answer, noJoke)
    expect(result.accuracy).toBe(0.6)
  })

  it('losing after being willing to overpay scores 0.6, not full marks', () => {
    // Round 3: the player bids 1090 (9% over IV) and is outbid at 1100.
    const answer: AuctionAnswer = { kind: 'auction', bids: [800, 1000, 1090] }
    const result = gradeAuction(task, answer, noJoke)
    expect(result.winner).not.toBe('player')
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
