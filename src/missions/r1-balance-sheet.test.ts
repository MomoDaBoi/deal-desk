import { describe, expect, it } from 'vitest'
import mission from './r1-balance-sheet'
import type { Answer } from '../engine/types'

const PERFECT: Record<string, number | null> = {
  'total-assets': 800,
  'long-term-debt': 330,
  'shareholders-equity': 400,
}

describe('r1-balance-sheet mission', () => {
  it('gives accuracy 1 for every correct blank', () => {
    const answer: Answer = { kind: 'balance', values: PERFECT }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(1)
    expect(result.verdict.length).toBeGreaterThan(0)
    expect(result.explanation.length).toBeGreaterThan(0)
  })

  it('scores 2/3 and explains long-term debt when it is wrong', () => {
    const answer: Answer = {
      kind: 'balance',
      values: { ...PERFECT, 'long-term-debt': 999 },
    }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(2 / 3)
    expect(result.explanation.toLowerCase()).toContain('long-term debt')
    expect(result.explanation).toContain('70')
    expect(result.explanation).toContain('330')
  })

  it('scores 0 and explains every line when nothing is filled in', () => {
    const answer: Answer = {
      kind: 'balance',
      values: { 'total-assets': null, 'long-term-debt': null, 'shareholders-equity': null },
    }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(0)
    expect(result.explanation.toLowerCase()).toContain('total assets')
    expect(result.explanation.toLowerCase()).toContain('shareholders')
  })

  it('throws when given the wrong answer kind', () => {
    const badAnswer = { kind: 'order' } as unknown as Answer
    expect(() => mission.grade(badAnswer)).toThrow('wrong answer kind')
  })

  it('keeps the lesson body under 120 words', () => {
    const wordCount = mission.lesson.body.trim().split(/\s+/).length
    expect(wordCount).toBeLessThan(120)
  })

  it('has exactly three blanks and every line id unique', () => {
    if (mission.task.kind !== 'balance') throw new Error('expected a balance task')
    const allLines = mission.task.sections.flatMap((s) => s.lines)
    const blanks = allLines.filter((l) => l.value === undefined && l.answer !== undefined)
    expect(blanks).toHaveLength(3)

    const sectionIds = mission.task.sections.map((s) => s.id)
    expect(new Set(sectionIds).size).toBe(sectionIds.length)

    const lineIds = allLines.map((l) => l.id)
    expect(new Set(lineIds).size).toBe(lineIds.length)
  })

  it('balances: total assets equals total liabilities plus equity', () => {
    if (mission.task.kind !== 'balance') throw new Error('expected a balance task')
    const lineById = new Map(mission.task.sections.flatMap((s) => s.lines).map((l) => [l.id, l.value ?? l.answer ?? 0]))
    expect(lineById.get('total-assets')).toBe(800)
    expect(lineById.get('total-liab-equity')).toBe(800)
    expect((lineById.get('payables') ?? 0) + (lineById.get('long-term-debt') ?? 0)).toBe(lineById.get('total-liabilities'))
    expect(lineById.get('total-liabilities')).toBe(400)
    expect(lineById.get('shareholders-equity')).toBe(400)
  })
})
