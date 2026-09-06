import { describe, expect, it } from 'vitest'
import mission, { computeIntrinsicValue, overpayPct } from './r5-auction'
import type { Answer, AuctionTask } from '../engine/types'

const task = mission.task as AuctionTask
const IV = 1_185_000

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
    expect(task.intrinsicValue).toBe(IV)
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

  it('a disciplined player who bids up to (but not over) intrinsic value wins it and scores 1.0', () => {
    // Round 1 opens at 1,060,000 (Copperline) / 1,000,000 (Trestle) / 1,120,000
    // (Halcyon). A single bid of 1,170,000 - 1.3% under the 1,185,000 intrinsic
    // value and above the 0.98x pre-emption threshold - takes the lead and ends
    // the process: both disciplined bidders are capped below it and Halcyon
    // stands down rather than fight a full-value bid.
    const answer: Answer = { kind: 'auction', bids: [1_170_000] }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(1)
    expect(result.explanation).toContain('$1,170,000k')
    expect(result.explanation).toContain('1.3%')
    expect(result.explanation).toContain('under')
  })

  it('every opening bid from 1,130,000 to 1,180,000 scores full marks', () => {
    // The top band is not a knife edge: any opening bid that beats Halcyon's
    // 1,120,000 and stays at or under intrinsic value scores full marks, either
    // by winning outright or by holding the line while the room runs past it.
    for (let bid = 1_130_000; bid <= 1_180_000; bid += 10_000) {
      const result = mission.grade({ kind: 'auction', bids: [bid] } as Answer)
      expect(result.accuracy).toBe(1)
    }
  })

  it('walking away once the room passes intrinsic value scores full marks', () => {
    // 1,130,000 leads round 1 without pre-empting the room, so Halcyon comes
    // back at 1,220,000 - already over intrinsic value. The player walks. The
    // auction finishes at 1,310,000, 10.5% over, on somebody else's ticket.
    const answer: Answer = { kind: 'auction', bids: [1_130_000] }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeGreaterThanOrEqual(0.85)
    expect(result.accuracy).toBe(1)
    expect(result.explanation).toContain('$1,130,000k')
    expect(result.explanation).toContain('Halcyon Holdings')
    expect(result.explanation).toContain('$1,310,000k')
  })

  it('chasing the room above 1.10x intrinsic value scores below a narrow loss', () => {
    // The player bids under the room twice, then takes it in round 3 at
    // 1,310,000 - 10.5% over intrinsic value, and above the 1,303,500 that
    // 1.10x works out to. Winning like that is worse than losing narrowly (0.6).
    const answer: Answer = { kind: 'auction', bids: [1_100_000, 1_190_000, 1_310_000] }
    const result = mission.grade(answer)
    expect(1_310_000).toBeGreaterThan(1.1 * IV)
    expect(result.accuracy).toBeCloseTo(0.517089, 5)
    expect(result.accuracy).toBeLessThan(0.6)
    expect(result.explanation).toContain('$1,310,000k')
    expect(result.explanation).toContain('$125,000k')
    expect(result.explanation).toContain('10.5%')
  })

  it('the old spike-then-lowball trick no longer wins at the lowball price', () => {
    // Spike round 2 to 1,500,000 to clear the room, then try to retract to a
    // cheap bid in round 3. A bid at or below the standing high does not count
    // as a bid, so the true winning price stays the spike, not the retraction,
    // and the room is graded as badly overpaid rather than won.
    const answer: Answer = { kind: 'auction', bids: [900_000, 1_500_000, 900_000] }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(0)
    expect(result.explanation).toContain('$1,500,000k')
    expect(result.explanation).not.toContain('$900,000k')
  })

  it('scores stopping short of intrinsic value as a narrow loss, and says the deal was there', () => {
    // A single bid at 90.3% of intrinsic value, then walking away while the
    // price was still under fair value. Halcyon keeps climbing and takes it.
    const answer: Answer = { kind: 'auction', bids: [1_070_000] }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(0.6)
    expect(result.explanation).toContain('Halcyon Holdings')
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

  it('tells the player the truth about what wins: bid your number, or let it go', () => {
    const lower = mission.lesson.body.toLowerCase()
    expect(lower).toContain('full marks')
    expect(mission.task.prompt.toLowerCase()).toContain('both are wins')
  })

  it('never prints the intrinsic value in the lesson visual', () => {
    const text = mission.lesson.visual && 'items' in mission.lesson.visual ? mission.lesson.visual.items.join(' ') : ''
    expect(text).not.toContain('1,185,000')
    expect(text).not.toMatch(/intrinsic value:\s*about/i)
  })
})
