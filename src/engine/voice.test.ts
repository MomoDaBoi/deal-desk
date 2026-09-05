import { describe, expect, it } from 'vitest'
import { bonusLine, mdVerdict, promotionLine, reviewLine, speedLine } from './voice'
import type { Rung } from './types'

const MAX_LEN = 90

/** Collect every distinct line a function returns across many salts. */
function sweep(fn: (salt: string) => string, count = 60): Set<string> {
  const out = new Set<string>()
  for (let i = 0; i < count; i++) out.add(fn(`salt-${i}`))
  return out
}

describe('mdVerdict', () => {
  it('picks from the perfect band at accuracy 1', () => {
    const lines = sweep((s) => mdVerdict(1, s))
    expect(lines.size).toBeGreaterThanOrEqual(3)
  })

  it('picks from the strong band at the 0.75 boundary', () => {
    const at = mdVerdict(0.75, 'boundary')
    const above = mdVerdict(0.9, 'boundary')
    const below = mdVerdict(1, 'boundary')
    // 0.75 and 0.9 share the "strong" band, 1 is a different band ("perfect")
    expect(at).toBe(above)
    expect(at).not.toBe(below)
  })

  it('picks from the pass band at the 0.5 boundary', () => {
    const at = mdVerdict(0.5, 'boundary')
    const above = mdVerdict(0.6, 'boundary')
    expect(at).toBe(above)
  })

  it('crosses from pass into fail just below the 0.5 boundary', () => {
    const pass = mdVerdict(0.5, 'boundary')
    const fail = mdVerdict(0.49, 'boundary')
    expect(fail).not.toBe(pass)
  })

  it('treats 0 as its own band, distinct from fail', () => {
    const zero = mdVerdict(0, 'boundary')
    const fail = mdVerdict(0.01, 'boundary')
    expect(zero).not.toBe(fail)
  })

  it('is deterministic: same accuracy band and salt always returns the same line', () => {
    for (const accuracy of [1, 0.9, 0.75, 0.6, 0.5, 0.3, 0.01, 0]) {
      const first = mdVerdict(accuracy, 'r1-income-statement-order')
      for (let i = 0; i < 5; i++) {
        expect(mdVerdict(accuracy, 'r1-income-statement-order')).toBe(first)
      }
    }
  })

  it('spreads across at least 3 distinct lines for 20 different salts, in every band', () => {
    const accuracies = [1, 0.8, 0.5, 0.2, 0]
    for (const accuracy of accuracies) {
      const seen = new Set<string>()
      for (let i = 0; i < 20; i++) seen.add(mdVerdict(accuracy, `mission-${accuracy}-${i}`))
      expect(seen.size).toBeGreaterThanOrEqual(3)
    }
  })

  it('every line in every band is under 90 characters', () => {
    const accuracies = [1, 0.8, 0.5, 0.2, 0]
    for (const accuracy of accuracies) {
      for (const line of sweep((s) => mdVerdict(accuracy, s))) {
        expect(line.length).toBeLessThan(MAX_LEN)
      }
    }
  })

  it('never leaks an explanation — the verdict stays a short headline', () => {
    // A loose smoke check: verdicts are single short sentences/fragments,
    // not multi-clause explanations. If this ever needs a semicolon or a
    // "because", it has drifted into explanation territory.
    for (const accuracy of [1, 0.8, 0.5, 0.2, 0]) {
      for (const line of sweep((s) => mdVerdict(accuracy, s))) {
        expect(line.toLowerCase()).not.toContain('because')
      }
    }
  })
})

describe('promotionLine', () => {
  const rungs: Rung[] = [1, 2, 3, 4, 5]

  it('returns a distinct line for every rung', () => {
    const lines = rungs.map((r) => promotionLine(r))
    expect(new Set(lines).size).toBe(rungs.length)
  })

  it('every promotion line is under 90 characters', () => {
    for (const r of rungs) {
      expect(promotionLine(r).length).toBeLessThan(MAX_LEN)
    }
  })

  it('is deterministic per rung', () => {
    for (const r of rungs) {
      expect(promotionLine(r)).toBe(promotionLine(r))
    }
  })
})

describe('bonusLine', () => {
  it('is deterministic for the same salt', () => {
    expect(bonusLine('r1')).toBe(bonusLine('r1'))
  })

  it('has at least 5 distinct lines available', () => {
    const lines = sweep(bonusLine, 60)
    expect(lines.size).toBeGreaterThanOrEqual(5)
  })

  it('every line is under 90 characters', () => {
    for (const line of sweep(bonusLine, 60)) {
      expect(line.length).toBeLessThan(MAX_LEN)
    }
  })
})

describe('reviewLine', () => {
  it('is deterministic for the same salt', () => {
    expect(reviewLine('r1-income-statement-order')).toBe(reviewLine('r1-income-statement-order'))
  })

  it('has at least 5 distinct lines available', () => {
    const lines = sweep(reviewLine, 60)
    expect(lines.size).toBeGreaterThanOrEqual(5)
  })

  it('every line is under 90 characters', () => {
    for (const line of sweep(reviewLine, 60)) {
      expect(line.length).toBeLessThan(MAX_LEN)
    }
  })
})

describe('speedLine', () => {
  it('returns a short, distinct line for each state', () => {
    const under = speedLine(true)
    const over = speedLine(false)
    expect(under).not.toBe(over)
    expect(under.length).toBeLessThan(MAX_LEN)
    expect(over.length).toBeLessThan(MAX_LEN)
  })

  it('is deterministic', () => {
    expect(speedLine(true)).toBe(speedLine(true))
    expect(speedLine(false)).toBe(speedLine(false))
  })
})
