import { describe, expect, it } from 'vitest'
import mission, { computeIntrinsicValue, overpayPct } from './r5-auction'
import type { Answer, AuctionTask } from '../engine/types'

const task = mission.task as AuctionTask

/**
 * Bid sequences below are pre-computed against the bot policy in
 * src/engine/graders/auction.ts (fixed, shared, and not owned by this
 * file). Because a bot's round-2+ bid is `min(ceiling, prevHigh *
 * followRate)` with every followRate > 1, the going price crosses this
 * auction's $1,008,000k intrinsic value by round 2 as soon as anyone leads
 * with a realistic bid — so the only way to WIN at or under intrinsic value
 * is to spike a bid past every bot's ceiling (>$1,260,000k, the
 * overbidder's 1.25x) in a middle round, which permanently drops all three
 * bots, then bid low in the final round: only that last round's leader sets
 * the winning price. That is exactly what `PERFECT_BIDS` does.
 */
const PERFECT_BIDS = [900_000, 1_270_000, 900_000]
const OVERPAID_BIDS = [900_000, 1_270_000, 1_160_000]

describe('r5-auction mission', () => {
  it('is an auction task, rung 5, order 5, with the spec constants', () => {
    expect(mission.id).toBe('r5-auction')
    expect(mission.rung).toBe(5)
    expect(mission.order).toBe(5)
    expect(mission.baseComp).toBe(14_000)
    expect(mission.parSeconds).toBe(240)
    expect(task.kind).toBe('auction')
    expect(task.rounds).toBe(3)
    expect(task.bidMin).toBe(700_000)
    expect(task.bidMax).toBe(1_400_000)
    expect(task.bidStep).toBe(10_000)
    expect(task.unit).toBe('$k')
  })

  it('recomputes intrinsic value at 7.0x EBITDA from the company bible', () => {
    // Nan's Pantry EBITDA is 144,000; 7.0x that is 1,008,000.
    expect(computeIntrinsicValue(144_000, 7.0)).toBe(1_008_000)
    expect(task.intrinsicValue).toBe(1_008_000)
  })

  it('computes overpay percentage relative to intrinsic value', () => {
    expect(overpayPct(1_008_000, 1_008_000)).toBe(0)
    expect(overpayPct(1_160_000, 1_008_000)).toBeCloseTo(15.079365, 5)
    expect(overpayPct(900_000, 1_008_000)).toBeCloseTo(-10.714286, 5)
  })

  it('states the key facts and the grocery multiple range in the teaser', () => {
    expect(task.teaser).toContain('210 stores')
    expect(task.teaser).toContain('$2,400,000k')
    expect(task.teaser).toContain('$144,000k')
    expect(task.teaser).toContain('$300,000k')
    expect(task.teaser).toMatch(/6\.0x-7\.5x/)
  })

  it('has three bots with the spec names, styles, and non-empty blurbs', () => {
    expect(task.bots).toHaveLength(3)
    const byId = Object.fromEntries(task.bots.map((b) => [b.id, b]))
    expect(byId.strategic).toMatchObject({ name: 'Copperline Markets', style: 'strategic' })
    expect(byId.sponsor).toMatchObject({ name: 'Trestle Capital', style: 'sponsor' })
    expect(byId.overbidder).toMatchObject({ name: 'Halcyon Holdings', style: 'overbidder' })
    for (const bot of task.bots) {
      expect(bot.blurb.length).toBeGreaterThan(10)
    }
  })

  it('has unique bot ids', () => {
    const ids = task.bots.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives accuracy 1 for a winning bid at or below intrinsic value', () => {
    const answer: Answer = { kind: 'auction', bids: PERFECT_BIDS }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(1)
    expect(result.verdict.length).toBeGreaterThan(0)
    expect(result.explanation).toContain('$900,000k')
    expect(result.explanation).toContain('$1,008,000k')
  })

  it('scores a specific overpaying win and names the overpay in $k and as a percentage', () => {
    const answer: Answer = { kind: 'auction', bids: OVERPAID_BIDS }
    const result = mission.grade(answer)
    // Won at 1,160,000 against 1,008,000 intrinsic value: overpaid by 152,000, 15.1%.
    expect(result.accuracy).toBeCloseTo(0.446825, 5)
    expect(result.explanation).toContain('$1,160,000k')
    expect(result.explanation).toContain('$152,000k')
    expect(result.explanation).toContain('15.1%')
  })

  it('scores losing narrowly to the overbidder and explains that losing is fine', () => {
    const answer: Answer = { kind: 'auction', bids: [1_000_000, 1_050_000, 1_150_000] }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(0.6)
    expect(result.explanation.toLowerCase()).toContain('halcyon holdings')
    expect(result.explanation.toLowerCase()).toContain('fine')
  })

  it('scores never bidding as accuracy 0 with an explanation of what the target was worth', () => {
    const answer: Answer = { kind: 'auction', bids: [] }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(0)
    expect(result.explanation).toContain('$1,008,000k')
  })

  it('throws on a mismatched answer kind', () => {
    const wrongKind = { kind: 'slider', values: {} } as unknown as Answer
    expect(() => mission.grade(wrongKind)).toThrow()
  })

  it('keeps the lesson body under 120 words and defines its key terms', () => {
    const wordCount = mission.lesson.body.trim().split(/\s+/).length
    expect(wordCount).toBeLessThan(120)
    const lower = mission.lesson.body.toLowerCase()
    expect(lower).toContain('teaser')
    expect(lower).toContain('intrinsic value')
    expect(lower).toContain("winner's curse")
    expect(lower).toContain('walking away')
  })
})
