import { describe, expect, it } from 'vitest'
import mission from './r2-growth-rates'
import type { BalanceAnswer, BalanceTask, QuizAnswer } from '../engine/types'

function values(overrides: Record<string, number | null> = {}): BalanceAnswer {
  return {
    kind: 'balance',
    values: {
      'revenue-growth': 25.0,
      'gross-profit-growth': 26.6,
      'revenue-cagr': 25.0,
      ...overrides,
    },
  }
}

describe('r2-growth-rates mission', () => {
  it('is a balance task, rung 2, order 3', () => {
    expect(mission.rung).toBe(2)
    expect(mission.order).toBe(3)
    expect(mission.baseComp).toBe(5_000)
    expect(mission.parSeconds).toBe(120)
    expect(mission.task.kind).toBe('balance')
  })

  it('uses section ids that will not trigger the balance-sheet meter', () => {
    const task = mission.task as BalanceTask
    for (const section of task.sections) {
      const id = section.id.toLowerCase()
      expect(id).not.toMatch(/asset|liab|equity/)
    }
  })

  it('has unique section and line ids', () => {
    const task = mission.task as BalanceTask
    const sectionIds = task.sections.map((s) => s.id)
    expect(new Set(sectionIds).size).toBe(sectionIds.length)
    const lineIds = task.sections.flatMap((s) => s.lines.map((l) => l.id))
    expect(new Set(lineIds).size).toBe(lineIds.length)
  })

  it('has known lines matching the Ledgerly bible', () => {
    const task = mission.task as BalanceTask
    const inputs = task.sections.find((s) => s.id === 'inputs')!
    const byId = Object.fromEntries(inputs.lines.map((l) => [l.id, l.value]))
    expect(byId['revenue-2025']).toBe(80_000)
    expect(byId['revenue-2024']).toBe(64_000)
    expect(byId['gross-profit-2025']).toBe(60_000)
    expect(byId['gross-profit-2024']).toBe(47_400)
    expect(byId['revenue-3yr-ago']).toBe(40_960)
  })

  it('has the correct growth answers with tolerance 0.1 and % unit', () => {
    const task = mission.task as BalanceTask
    expect(task.unit).toBe('%')
    expect(task.tolerance).toBe(0.1)
    const growth = task.sections.find((s) => s.id === 'growth')!
    const byId = Object.fromEntries(growth.lines.map((l) => [l.id, l.answer]))
    expect(byId['revenue-growth']).toBe(25.0)
    expect(byId['gross-profit-growth']).toBeCloseTo(26.6, 1)
    expect(byId['revenue-cagr']).toBe(25.0)
  })

  it('gives accuracy 1 for a perfect answer', () => {
    const result = mission.grade(values())
    expect(result.accuracy).toBe(1)
  })

  it('accepts an answer within the 0.1 tolerance band', () => {
    const result = mission.grade(values({ 'revenue-growth': 25.05, 'revenue-cagr': 24.95 }))
    expect(result.accuracy).toBe(1)
  })

  it('scores a wrong revenue growth and names it in the explanation', () => {
    // Classic mistake: dividing by the current year instead of the prior year.
    const result = mission.grade(values({ 'revenue-growth': 20.0 }))
    expect(result.accuracy).toBeCloseTo(2 / 3)
    expect(result.explanation).toMatch(/Revenue growth/)
    expect(result.explanation).toMatch(/25/)
  })

  it('scores a wrong gross profit growth and names it in the explanation', () => {
    const result = mission.grade(values({ 'gross-profit-growth': 20.0 }))
    expect(result.accuracy).toBeCloseTo(2 / 3)
    expect(result.explanation).toMatch(/Gross profit growth/)
    expect(result.explanation).toMatch(/26\.6/)
  })

  it('scores a wrong CAGR and names it in the explanation', () => {
    const result = mission.grade(values({ 'revenue-cagr': 40.0 }))
    expect(result.accuracy).toBeCloseTo(2 / 3)
    expect(result.explanation).toMatch(/CAGR/)
    expect(result.explanation).toMatch(/25/)
  })

  it('gives accuracy 0 when every blank is wrong, with a full explanation', () => {
    const result = mission.grade(values({ 'revenue-growth': 0, 'gross-profit-growth': 0, 'revenue-cagr': 0 }))
    expect(result.accuracy).toBe(0)
    expect(result.explanation).toMatch(/Revenue growth/)
    expect(result.explanation).toMatch(/Gross profit growth/)
    expect(result.explanation).toMatch(/CAGR/)
  })

  it('throws on a mismatched answer kind', () => {
    const wrongAnswer: QuizAnswer = { kind: 'quiz', choices: {} }
    expect(() => mission.grade(wrongAnswer)).toThrow()
  })

  it('keeps the lesson body under 120 words', () => {
    const wordCount = mission.lesson.body.trim().split(/\s+/).length
    expect(wordCount).toBeLessThan(120)
  })
})
