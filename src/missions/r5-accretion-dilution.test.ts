import { describe, expect, it } from 'vitest'
import mission, {
  afterTaxInterest,
  eps,
  proFormaNetIncome,
  proFormaShares,
} from './r5-accretion-dilution'
import type { Answer } from '../engine/types'

const PERFECT: Record<string, number | null> = {
  targetEarnings: 0.41,
  synergies: 0.14,
  interest: -0.21,
  dilution: -0.44,
}

describe('r5-accretion-dilution model helpers', () => {
  it('computes after-tax interest on the new acquisition debt', () => {
    expect(afterTaxInterest(400_000, 6, 25)).toBe(18_000)
  })

  it('computes pro-forma net income from acquirer, target, synergies, and interest', () => {
    expect(proFormaNetIncome(90_000, 34_500, 12_000, 18_000)).toBe(118_500)
  })

  it('computes pro-forma shares from acquirer shares plus newly issued shares', () => {
    expect(proFormaShares(60_000, 25_000)).toBe(85_000)
  })

  it('computes pro-forma EPS as net income over shares', () => {
    expect(eps(118_500, 85_000)).toBeCloseTo(1.394117647, 6)
  })
})

describe('r5-accretion-dilution mission', () => {
  it('gives accuracy 1 for the correct bridge', () => {
    const answer: Answer = { kind: 'bridge', values: PERFECT }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(1)
    expect(result.verdict.length).toBeGreaterThan(0)
    expect(result.explanation.length).toBeGreaterThan(0)
  })

  it('docks accuracy and names after-tax interest when only that bar is wrong', () => {
    const answer: Answer = { kind: 'bridge', values: { ...PERFECT, interest: 0 } }
    const result = mission.grade(answer)
    // 3 of 4 correct; sum = 1.50 + 0.41 + 0.14 + 0 - 0.44 = 1.61, which does not
    // reconcile to the pro-forma EPS of ~1.394.
    expect(result.accuracy).toBeCloseTo(0.75 * (3 / 4) + 0.25 * 0, 6)
    expect(result.explanation.toLowerCase()).toContain('after-tax interest')
    expect(result.explanation).toContain('18,000')
  })

  it('names target earnings and dilution when both are wrong', () => {
    const answer: Answer = {
      kind: 'bridge',
      values: { ...PERFECT, targetEarnings: 0, dilution: 0 },
    }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(0.75 * (2 / 4) + 0.25 * 0, 6)
    expect(result.explanation.toLowerCase()).toContain('target earnings')
    expect(result.explanation.toLowerCase()).toContain('share dilution')
  })

  it('scores 0 and explains every bar when nothing is filled in', () => {
    const answer: Answer = { kind: 'bridge', values: {} }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(0)
    expect(result.explanation.toLowerCase()).toContain('target earnings')
    expect(result.explanation.toLowerCase()).toContain('synergies')
    expect(result.explanation.toLowerCase()).toContain('after-tax interest')
    expect(result.explanation.toLowerCase()).toContain('share dilution')
  })

  it('throws when given the wrong answer kind', () => {
    const badAnswer = { kind: 'balance', values: {} } as unknown as Answer
    expect(() => mission.grade(badAnswer)).toThrow('wrong answer kind')
  })

  it('keeps the lesson body under 120 words', () => {
    const wordCount = mission.lesson.body.trim().split(/\s+/).length
    expect(wordCount).toBeLessThan(120)
  })

  it('has the four adjustments in spec order with unique ids, and the task reconciles within tolerance', () => {
    if (mission.task.kind !== 'bridge') throw new Error('expected a bridge task')
    const ids = mission.task.adjustments.map((a) => a.id)
    expect(ids).toEqual(['targetEarnings', 'synergies', 'interest', 'dilution'])
    expect(new Set(ids).size).toBe(ids.length)

    expect(mission.task.start.value).toBeCloseTo(1.5, 6)
    expect(mission.task.end.value).toBeCloseTo(1.394117647, 6)

    const sum =
      mission.task.start.value + mission.task.adjustments.reduce((s, a) => s + a.answer, 0)
    expect(Math.abs(sum - mission.task.end.value)).toBeLessThanOrEqual(mission.task.tolerance ?? 0)
  })

  it('has the rounded adjustment figures stated in the spec', () => {
    if (mission.task.kind !== 'bridge') throw new Error('expected a bridge task')
    const byId = Object.fromEntries(mission.task.adjustments.map((a) => [a.id, a.answer]))
    expect(byId.targetEarnings).toBeCloseTo(0.41, 2)
    expect(byId.synergies).toBeCloseTo(0.14, 2)
    expect(byId.interest).toBeCloseTo(-0.21, 2)
    expect(byId.dilution).toBeCloseTo(-0.44, 2)
  })

  it('matches the required mission metadata', () => {
    expect(mission.id).toBe('r5-accretion-dilution')
    expect(mission.rung).toBe(5)
    expect(mission.order).toBe(4)
    expect(mission.baseComp).toBe(12_000)
    expect(mission.parSeconds).toBe(200)
    if (mission.task.kind !== 'bridge') throw new Error('expected a bridge task')
    expect(mission.task.unit).toBe('$')
    expect(mission.task.tolerance).toBe(0.01)
  })
})
