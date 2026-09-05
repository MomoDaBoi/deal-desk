import { describe, expect, it } from 'vitest'
import { computeComp, formatComp, rungStatus } from './scoring'
import type { Mission } from './types'

/** Minimal mission shape: computeComp only reads baseComp/parSeconds. */
function m(baseComp: number, parSeconds: number): Pick<Mission, 'baseComp' | 'parSeconds'> {
  return { baseComp, parSeconds }
}

/** Minimal mission shape: rungStatus only reads id/baseComp. */
function rm(id: string, baseComp: number): Mission {
  return { id, baseComp } as unknown as Mission
}

describe('computeComp', () => {
  it('perfect accuracy finished instantly earns base comp plus the max speed bonus', () => {
    const r = computeComp(m(1000, 100), 1, 0)
    expect(r.accuracyComp).toBe(1000)
    expect(r.speedBonus).toBe(200) // 1000 * 0.2 * 1 (t clamped to 1) * 1 (accuracy)
    expect(r.total).toBe(1200)
    expect(r.passed).toBe(true)
  })

  it('perfect accuracy finished exactly at par earns no speed bonus', () => {
    const r = computeComp(m(1000, 100), 1, 100)
    expect(r.speedBonus).toBe(0)
    expect(r.total).toBe(1000)
    expect(r.passed).toBe(true)
  })

  it('perfect accuracy at half par or faster earns the full 20% bonus', () => {
    const atHalf = computeComp(m(1000, 100), 1, 50)
    expect(atHalf.speedBonus).toBe(200)
    expect(atHalf.total).toBe(1200)

    const fasterThanHalf = computeComp(m(1000, 100), 1, 10)
    expect(fasterThanHalf.speedBonus).toBe(200)
    expect(fasterThanHalf.total).toBe(1200)
  })

  it('speed bonus is linear between par and half par', () => {
    // par=100, half=50, elapsed=75 is the midpoint -> t=0.5
    const r = computeComp(m(1000, 100), 1, 75)
    expect(r.speedBonus).toBe(100) // 1000 * 0.2 * 0.5 * 1
    expect(r.total).toBe(1100)
  })

  it('accuracy below the fail threshold does not pass and never earns a speed bonus, even finished instantly', () => {
    const r = computeComp(m(1000, 100), 0.4, 0)
    expect(r.passed).toBe(false)
    expect(r.accuracyComp).toBe(400)
    expect(r.speedBonus).toBe(0)
    expect(r.total).toBe(400)
  })

  it('accuracy is clamped above 1', () => {
    const r = computeComp(m(1000, 100), 1.5, 0)
    expect(r.accuracyComp).toBe(1000)
    expect(r.speedBonus).toBe(200)
    expect(r.total).toBe(1200)
    expect(r.passed).toBe(true)
  })

  it('accuracy is clamped below 0', () => {
    const r = computeComp(m(1000, 100), -0.5, 0)
    expect(r.accuracyComp).toBe(0)
    expect(r.speedBonus).toBe(0)
    expect(r.total).toBe(0)
    expect(r.passed).toBe(false)
  })

  it('speed bonus is scaled down by accuracy', () => {
    const r = computeComp(m(1000, 100), 0.8, 0)
    expect(r.accuracyComp).toBe(800)
    expect(r.speedBonus).toBe(160) // 1000 * 0.2 * 1 * 0.8
    expect(r.total).toBe(960)
    expect(r.passed).toBe(true)
  })

  it('accuracy exactly at the fail threshold still passes', () => {
    const r = computeComp(m(1000, 100), 0.5, 0)
    expect(r.passed).toBe(true)
  })
})

describe('rungStatus', () => {
  it('handles an empty mission list', () => {
    const r = rungStatus([], {})
    expect(r.possible).toBe(0)
    expect(r.earned).toBe(0)
    expect(r.fraction).toBe(0)
    expect(r.passed).toBe(false)
    expect(r.perfect).toBe(false)
  })

  it('passes at exactly the pass threshold', () => {
    const r = rungStatus([rm('a', 1000)], { a: 700 })
    expect(r.fraction).toBe(0.7)
    expect(r.passed).toBe(true)
  })

  it('fails just under the pass threshold', () => {
    const r = rungStatus([rm('a', 1000)], { a: 699 })
    expect(r.fraction).toBeCloseTo(0.699)
    expect(r.passed).toBe(false)
  })

  it('sets the perfect flag when every mission meets its base comp', () => {
    const missions = [rm('a', 1000), rm('b', 500)]
    expect(rungStatus(missions, { a: 1000, b: 500 }).perfect).toBe(true)
    // exceeding base comp (e.g. via speed bonus) still counts as perfect
    expect(rungStatus(missions, { a: 1200, b: 600 }).perfect).toBe(true)
    // falling short on any one mission breaks perfect
    expect(rungStatus(missions, { a: 1000, b: 499 }).perfect).toBe(false)
  })

  it('treats missing mission ids in best as 0', () => {
    const missions = [rm('a', 1000), rm('b', 1000)]
    const r = rungStatus(missions, { a: 1000 })
    expect(r.earned).toBe(1000)
    expect(r.possible).toBe(2000)
    expect(r.fraction).toBe(0.5)
    expect(r.perfect).toBe(false)
  })
})

describe('formatComp', () => {
  it('formats a whole dollar amount with thousands separators', () => {
    expect(formatComp(5000)).toBe('$5,000')
    expect(formatComp(1234567)).toBe('$1,234,567')
  })

  it('rounds fractional comp', () => {
    expect(formatComp(1234567.4)).toBe('$1,234,567')
    expect(formatComp(1234567.6)).toBe('$1,234,568')
  })

  it('formats zero', () => {
    expect(formatComp(0)).toBe('$0')
  })
})
