import { describe, expect, it } from 'vitest'
import mission from './r2-margins'
import type { BalanceAnswer, BalanceTask, QuizAnswer } from '../engine/types'

function values(overrides: Record<string, number | null> = {}): BalanceAnswer {
  return {
    kind: 'balance',
    values: {
      'gross-margin': 75.0,
      'ebitda-margin': 15.0,
      'net-margin': 4.7,
      ...overrides,
    },
  }
}

describe('r2-margins mission', () => {
  it('is a balance task, rung 2, order 2', () => {
    expect(mission.rung).toBe(2)
    expect(mission.order).toBe(2)
    expect(mission.baseComp).toBe(6_000)
    expect(mission.parSeconds).toBe(150)
    expect(mission.task.kind).toBe('balance')
  })

  it('uses section ids that will not trigger the balance-sheet meter', () => {
    const task = mission.task as BalanceTask
    for (const section of task.sections) {
      const id = section.id.toLowerCase()
      expect(id).not.toMatch(/asset|liab|equity/)
    }
  })

  it('has unique line ids across sections', () => {
    const task = mission.task as BalanceTask
    const ids = task.sections.flatMap((s) => s.lines.map((l) => l.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has known lines matching the Ledgerly bible', () => {
    const task = mission.task as BalanceTask
    const inputs = task.sections.find((s) => s.id === 'inputs')!
    const byId = Object.fromEntries(inputs.lines.map((l) => [l.id, l.value]))
    expect(byId.revenue).toBe(80_000)
    expect(byId['gross-profit']).toBe(60_000)
    expect(byId.ebitda).toBe(12_000)
    expect(byId['net-income']).toBe(3_750)
  })

  it('has the correct margin answers with tolerance 0.1 and % unit', () => {
    const task = mission.task as BalanceTask
    expect(task.unit).toBe('%')
    expect(task.tolerance).toBe(0.1)
    const margins = task.sections.find((s) => s.id === 'margins')!
    const byId = Object.fromEntries(margins.lines.map((l) => [l.id, l.answer]))
    expect(byId['gross-margin']).toBe(75.0)
    expect(byId['ebitda-margin']).toBe(15.0)
    expect(byId['net-margin']).toBe(4.7)
  })

  it('gives accuracy 1 for a perfect answer', () => {
    const result = mission.grade(values())
    expect(result.accuracy).toBe(1)
  })

  it('scores a wrong gross margin and names it in the explanation', () => {
    const result = mission.grade(values({ 'gross-margin': 50 }))
    expect(result.accuracy).toBeCloseTo(2 / 3)
    expect(result.explanation).toMatch(/Gross margin/)
    expect(result.explanation).toMatch(/75/)
  })

  it('scores a wrong EBITDA margin and names it in the explanation', () => {
    const result = mission.grade(values({ 'ebitda-margin': 20 }))
    expect(result.accuracy).toBeCloseTo(2 / 3)
    expect(result.explanation).toMatch(/EBITDA margin/)
    expect(result.explanation).toMatch(/15/)
  })

  it('scores a wrong net margin and names it in the explanation', () => {
    const result = mission.grade(values({ 'net-margin': 10 }))
    expect(result.accuracy).toBeCloseTo(2 / 3)
    expect(result.explanation).toMatch(/Net margin/)
    expect(result.explanation).toMatch(/4\.7/)
  })

  it('gives accuracy 0 when every blank is wrong, with a full explanation', () => {
    const result = mission.grade(values({ 'gross-margin': 0, 'ebitda-margin': 0, 'net-margin': 0 }))
    expect(result.accuracy).toBe(0)
    expect(result.explanation).toMatch(/Gross margin/)
    expect(result.explanation).toMatch(/EBITDA margin/)
    expect(result.explanation).toMatch(/Net margin/)
  })

  it('accepts an answer within the 0.1 tolerance band', () => {
    const result = mission.grade(values({ 'gross-margin': 75.05, 'net-margin': 4.65 }))
    expect(result.accuracy).toBe(1)
  })

  it('throws on a mismatched answer kind', () => {
    const wrongAnswer: QuizAnswer = { kind: 'quiz', choices: {} }
    expect(() => mission.grade(wrongAnswer)).toThrow()
  })

  it('keeps the lesson body under 120 words', () => {
    const wordCount = mission.lesson.body.trim().split(/\s+/).length
    expect(wordCount).toBeLessThan(120)
  })

  it('shows a bars visual matching the Ledgerly income statement', () => {
    const visual = mission.lesson.visual
    expect(visual?.kind).toBe('bars')
    if (visual?.kind !== 'bars') throw new Error('expected a bars visual')
    expect(visual.unit).toBe('$k')
    const byLabel = Object.fromEntries(visual.items.map((it) => [it.label, it.value]))
    expect(byLabel.Revenue).toBe(80_000)
    expect(byLabel['Gross profit']).toBe(60_000)
    expect(byLabel.EBITDA).toBe(12_000)
    expect(byLabel['Net income']).toBe(3_750)
  })
})
