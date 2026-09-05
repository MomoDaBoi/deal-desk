import { describe, expect, it } from 'vitest'
import mission, { computeIntrinsicValue, overpayPct } from './r5-auction'
import type { Answer, AuctionTask } from '../engine/types'

const task = mission.task as AuctionTask

describe('r5-auction mission', () => {
  it('is an auction task, rung 5, order 5, with the spec constants', () => {
    expect(mission.id).toBe('r5-auction')
    expect(mission.rung).toBe(5)
    expect(mission.order).toBe(5)
    expect(mission.baseComp).toBe(14_000)
    expect(mission.parSeconds).toBe(240)
    expect(task.kind).toBe('auction')
    expect(task.rounds).toBe(3)
    expect(task.bidMin).toBe(800_000)
    expect(task.bidMax).toBe(1_600_000)
    expect(task.bidStep).toBe(10_000)
    expect(task.unit).toBe('$k')
  })

  it('prices intrinsic value on a control basis consistent with r3-precedents: a 25% premium over the trading price, plus net debt', () => {
    // 11.80 x 1.25 = 14.75 a share x 60,000k shares = 885,000k equity, + 300,000k net debt = 1,185,000k EV, ~8.2x EBITDA.
    expect(computeIntrinsicValue(11.8, 60_000, 25, 300_000)).toBe(1_185_000)
    expect(task.intrinsicValue).toBe(1_185_000)
  })

  it('computes overpay percentage relative to intrinsic value', () => {
    expect(overpayPct(1_008_000, 1_008_000)).toBe(0)
    expect(overpayPct(1_160_000, 1_008_000)).toBeCloseTo(15.079365, 5)
    expect(overpayPct(900_000, 1_008_000)).toBeCloseTo(-10.714286, 5)
  })

  it('states the key facts and hints at the control-vs-trading gap without naming a target multiple', () => {
    expect(task.teaser).toContain('210 stores')
    expect(task.teaser).toContain('$2,400,000k')
    expect(task.teaser).toContain('$144,000k')
    expect(task.teaser).toContain('$300,000k')
    expect(task.teaser).toMatch(/7\.0x/)
    expect(task.teaser).toMatch(/8\.4x-9\.2x/)
    expect(task.teaser).not.toContain('1,185,000')
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

  it('the old spike-then-lowball trick no longer wins at the lowball price', () => {
    // Spike round 2 above every bot's ceiling (the highest, the overbidder's, is
    // 1.25 x 1,185,000 = 1,481,250) to drive all three out, then try to retract
    // to a cheap bid in round 3. A bid at or below the standing high (1,500,000)
    // does not count as a bid, so the true winning price stays the spike, not
    // the retraction, and the room is graded as badly overpaid rather than won.
    const answer: Answer = { kind: 'auction', bids: [900_000, 1_500_000, 900_000] }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(0)
    expect(result.explanation).toContain('$1,500,000k')
    expect(result.explanation).not.toContain('$900,000k')
  })

  it('scores a specific overpaying win reached by honestly outbidding the room round after round', () => {
    // Round 1: 1,140,000 beats every bot's opening bid (highest is the overbidder at 1,130,000).
    // Round 2: bots escalate off that; the overbidder's follow bid reaches 1,230,000, so
    // 1,240,000 is needed to lead. Round 3: it escalates again to 1,340,000, so 1,350,000
    // is needed to stay ahead. The player wins at 1,350,000, which is 13.9% over the
    // 1,185,000 intrinsic value.
    const answer: Answer = { kind: 'auction', bids: [1_140_000, 1_240_000, 1_350_000] }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(0.493038, 5)
    expect(result.explanation).toContain('$1,350,000k')
    expect(result.explanation).toContain('$165,000k')
    expect(result.explanation).toContain('13.9%')
  })

  it('scores losing narrowly to the overbidder and explains that losing is fine', () => {
    // A single disciplined bid, 90.3% of intrinsic value, then walking away. The
    // overbidder keeps escalating without the player and takes it well above that.
    const answer: Answer = { kind: 'auction', bids: [1_070_000] }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(0.6)
    expect(result.explanation.toLowerCase()).toContain('halcyon holdings')
    expect(result.explanation.toLowerCase()).toContain('fine')
  })

  it('scores never bidding as accuracy 0 with an explanation of what the target was worth', () => {
    const answer: Answer = { kind: 'auction', bids: [] }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(0)
    expect(result.explanation).toContain('$1,185,000k')
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

  it('never prints the intrinsic value in the lesson visual', () => {
    const text = mission.lesson.visual && 'items' in mission.lesson.visual ? mission.lesson.visual.items.join(' ') : ''
    expect(text).not.toContain('1,185,000')
    expect(text).not.toMatch(/intrinsic value:\s*about/i)
  })
})
