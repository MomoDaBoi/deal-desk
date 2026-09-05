import { describe, expect, it } from 'vitest'
import mission from './r2-boss-ev-bridge'
import type { Answer } from '../engine/types'

const PERFECT: Record<string, number | null> = {
  debt: 60_000,
  cash: -30_000,
  minority: 0,
  preferred: 0,
}

describe('r2-boss-ev-bridge mission', () => {
  it('gives accuracy 1 for the correct bridge', () => {
    const answer: Answer = { kind: 'bridge', values: PERFECT }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(1)
    expect(result.verdict.length).toBeGreaterThan(0)
    expect(result.explanation.length).toBeGreaterThan(0)
  })

  it('docks accuracy and names the debt bar when total debt is wrong but still reconciles', () => {
    // debt flipped to -60,000 and cash flipped to +30,000: 2 of 4 bars wrong,
    // but the sum still lands on 400,000 (370,000 - 60,000 + 30,000 + 0 + 0 = 340,000... )
    // Use a case that keeps reconciliation simple: only debt wrong, sum off by 120,000.
    const answer: Answer = { kind: 'bridge', values: { ...PERFECT, debt: -60_000 } }
    const result = mission.grade(answer)
    // 3 of 4 adjustments correct, and it does not reconcile (sum = 370,000 - 60,000 - 30,000 = 280,000)
    expect(result.accuracy).toBeCloseTo(0.75 * (3 / 4) + 0.25 * 0)
    expect(result.explanation.toLowerCase()).toContain('total debt')
    expect(result.explanation).toContain('60,000')
  })

  it('names cash and notes reconciliation separately when only cash is wrong and it does not reconcile', () => {
    const answer: Answer = { kind: 'bridge', values: { ...PERFECT, cash: 30_000 } }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(0.75 * (3 / 4) + 0.25 * 0)
    expect(result.explanation.toLowerCase()).toContain('cash')
    expect(result.explanation).toContain('460,000')
  })

  it('scores 0 and explains every bar when nothing is filled in', () => {
    const answer: Answer = { kind: 'bridge', values: {} }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(0)
    expect(result.explanation.toLowerCase()).toContain('total debt')
    expect(result.explanation.toLowerCase()).toContain('cash')
    expect(result.explanation.toLowerCase()).toContain('minority')
    expect(result.explanation.toLowerCase()).toContain('preferred')
  })

  it('throws when given the wrong answer kind', () => {
    const badAnswer = { kind: 'balance', values: {} } as unknown as Answer
    expect(() => mission.grade(badAnswer)).toThrow('wrong answer kind')
  })

  it('keeps the lesson body under 120 words', () => {
    const wordCount = mission.lesson.body.trim().split(/\s+/).length
    expect(wordCount).toBeLessThan(120)
  })

  it('has the four adjustments in spec order with unique ids, and the task reconciles', () => {
    if (mission.task.kind !== 'bridge') throw new Error('expected a bridge task')
    const ids = mission.task.adjustments.map((a) => a.id)
    expect(ids).toEqual(['debt', 'cash', 'minority', 'preferred'])
    expect(new Set(ids).size).toBe(ids.length)

    expect(mission.task.start.value).toBe(370_000)
    expect(mission.task.end.value).toBe(400_000)
    const sum =
      mission.task.start.value + mission.task.adjustments.reduce((s, a) => s + a.answer, 0)
    expect(sum).toBe(mission.task.end.value)
  })

  it('matches the required mission metadata', () => {
    expect(mission.id).toBe('r2-boss-ev-bridge')
    expect(mission.rung).toBe(2)
    expect(mission.order).toBe(6)
    expect(mission.boss).toBe(true)
    expect(mission.baseComp).toBe(11_000)
    expect(mission.parSeconds).toBe(180)
    if (mission.task.kind !== 'bridge') throw new Error('expected a bridge task')
    expect(mission.task.unit).toBe('$k')
    expect(mission.task.tolerance).toBe(0)
  })
})
