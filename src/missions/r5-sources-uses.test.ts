import { describe, expect, it } from 'vitest'
import mission from './r5-sources-uses'
import type { Answer, BalanceTask } from '../engine/types'

const task = mission.task as BalanceTask

const PERFECT: Record<string, number | null> = {
  fees: 30_000,
  'total-uses': 830_000,
  'new-debt': 480_000,
  'sponsor-equity': 310_000,
}

describe('r5-sources-uses mission', () => {
  it('is a balance task, rung 5, order 2, with the spec numbers', () => {
    expect(mission.id).toBe('r5-sources-uses')
    expect(mission.rung).toBe(5)
    expect(mission.order).toBe(2)
    expect(mission.baseComp).toBe(11_000)
    expect(mission.parSeconds).toBe(200)
    expect(task.kind).toBe('balance')
    expect(task.unit).toBe('$k')
    expect(task.tolerance).toBe(0)
  })

  it('has the four blanks the spec calls for, each with the right answer', () => {
    const lines = task.sections.flatMap((s) => s.lines)
    const blanks = lines.filter((l) => l.value === undefined && l.answer !== undefined)
    expect(blanks).toHaveLength(4)

    const byId = new Map(lines.map((l) => [l.id, l]))
    expect(byId.get('purchase-price')?.value).toBe(800_000)
    expect(byId.get('fees')?.answer).toBe(30_000)
    expect(byId.get('total-uses')?.answer).toBe(830_000)
    expect(byId.get('new-debt')?.answer).toBe(480_000)
    expect(byId.get('cash')?.value).toBe(40_000)
    expect(byId.get('sponsor-equity')?.answer).toBe(310_000)
    expect(byId.get('total-sources')?.value).toBe(830_000)
  })

  it('ties: uses equal sources at every known/answer figure', () => {
    const lines = task.sections.flatMap((s) => s.lines)
    const byId = new Map(lines.map((l) => [l.id, l.value ?? l.answer ?? 0]))
    expect((byId.get('purchase-price') ?? 0) + (byId.get('fees') ?? 0)).toBe(byId.get('total-uses'))
    expect((byId.get('new-debt') ?? 0) + (byId.get('cash') ?? 0) + (byId.get('sponsor-equity') ?? 0)).toBe(
      byId.get('total-sources'),
    )
    expect(byId.get('total-uses')).toBe(byId.get('total-sources'))
  })

  it('gives accuracy 1 for a perfect, tying answer', () => {
    const answer: Answer = { kind: 'balance', values: PERFECT }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(1)
    expect(result.verdict.length).toBeGreaterThan(0)
    expect(result.explanation.length).toBeGreaterThan(0)
  })

  it('scores 0.75 x 3/4 blanks + 0.25 x 0 (broken tie) when new debt is wrong, and names new debt', () => {
    const answer: Answer = {
      kind: 'balance',
      values: { ...PERFECT, 'new-debt': 999_999 },
    }
    const result = mission.grade(answer)
    // 3/4 blanks right (0.75 weight) + tie broken because new-debt feeds the sources sum (0 x 0.25 weight)
    expect(result.accuracy).toBeCloseTo(0.75 * (3 / 4) + 0.25 * 0)
    expect(result.explanation.toLowerCase()).toContain('new debt')
    expect(result.explanation).toContain('480,000')
  })

  it('scores 0 and mentions every blank when nothing is filled in', () => {
    const answer: Answer = {
      kind: 'balance',
      values: { fees: null, 'total-uses': null, 'new-debt': null, 'sponsor-equity': null },
    }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(0)
    expect(result.explanation.toLowerCase()).toContain('new debt')
    expect(result.explanation.toLowerCase()).toContain('sponsor equity')
  })

  it('penalises a tie break even when all four blanks are individually correct-looking but inconsistent', () => {
    // All blanks filled with values that are individually plausible but do not sum to the typed total uses.
    const answer: Answer = {
      kind: 'balance',
      values: { fees: 30_000, 'total-uses': 830_000, 'new-debt': 480_000, 'sponsor-equity': 999 },
    }
    const result = mission.grade(answer)
    // sponsor-equity is wrong (3/4 blanks) and breaks the tie (480,000 + 40,000 + 999 !== 830,000)
    expect(result.accuracy).toBeCloseTo(0.75 * (3 / 4) + 0.25 * 0)
    expect(result.explanation.toLowerCase()).toContain('tie')
  })

  it('throws when given the wrong answer kind', () => {
    const badAnswer = { kind: 'order' } as unknown as Answer
    expect(() => mission.grade(badAnswer)).toThrow('wrong answer kind')
  })

  it('keeps the lesson body under 120 words', () => {
    const wordCount = mission.lesson.body.trim().split(/\s+/).length
    expect(wordCount).toBeLessThan(120)
  })

  it('has unique section and line ids', () => {
    const sectionIds = task.sections.map((s) => s.id)
    expect(new Set(sectionIds).size).toBe(sectionIds.length)
    const lineIds = task.sections.flatMap((s) => s.lines.map((l) => l.id))
    expect(new Set(lineIds).size).toBe(lineIds.length)
  })
})
