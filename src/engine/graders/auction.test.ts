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
    // prevHigh after round 1 = 990.
    // Round 2: player passes (walks away is not tested here; instead bids low again to keep bots alive).
    const result = simulateAuction(task, [990, 500])
    const round2 = result.rounds[1]
    const strat = round2.bots.find((b) => b.id === 'strat')
    const sponsor = round2.bots.find((b) => b.id === 'sponsor')
    const yolo = round2.bots.find((b) => b.id === 'yolo')
    // strategic ceiling = 1060, min(1060, 990*1.03=1019.7 -> snap to 1020)
    expect(strat?.bid).toBe(1020)
    // sponsor ceiling = 970; prevHigh 990 > ceiling 970 -> drops out
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

  it('winner is the highest bid in the last round that has any bid', () => {
    const result = simulateAuction(task, [990, 1200, 1300])
    expect(result.winner).toBe('player')
    expect(result.winningBid).toBe(1300)
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
    // Overbidder's ceiling (1250) guarantees it eventually outbids a disciplined player.
    const answer: AuctionAnswer = { kind: 'auction', bids: [900, 950, 950] }
    const result = gradeAuction(task, answer, noJoke)
    expect(result.accuracy).toBe(0.6)
  })

  it('losing after bidding well below intrinsic value scores 0.3', () => {
    const answer: AuctionAnswer = { kind: 'auction', bids: [100, 100, 100] }
    const result = gradeAuction(task, answer, noJoke)
    expect(result.accuracy).toBe(0.3)
  })

  it('never bidding scores 0', () => {
    const answer: AuctionAnswer = { kind: 'auction', bids: [] }
    const result = gradeAuction(task, answer, noJoke)
    expect(result.accuracy).toBe(0)
  })

  it('produces one detail per round plus an outcome detail', () => {
    const answer: AuctionAnswer = { kind: 'auction', bids: [990, 1000, 1000] }
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
})
