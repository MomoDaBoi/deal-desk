import { describe, expect, it } from 'vitest'
import mission from './r3-multiples'
import type { BalanceAnswer, BalanceTask, QuizAnswer } from '../engine/types'

function values(overrides: Record<string, number | null> = {}): BalanceAnswer {
  return {
    kind: 'balance',
    values: {
      'brickhouse-ev-ebitda': 8.3,
      'brickhouse-ev-revenue': 1.25,
      'brickhouse-pe': 16.8,
      'ledgerly-pe': 98.7,
      ...overrides,
    },
  }
}

describe('r3-multiples mission', () => {
  it('is a balance task, rung 3, order 1, with the right comp and par', () => {
    expect(mission.id).toBe('r3-multiples')
    expect(mission.rung).toBe(3)
    expect(mission.order).toBe(1)
    expect(mission.baseComp).toBe(7_000)
    expect(mission.parSeconds).toBe(160)
    expect(mission.task.kind).toBe('balance')
  })

  it('uses section ids that will not trigger the balance-sheet meter', () => {
    const task = mission.task as BalanceTask
    for (const section of task.sections) {
      const id = section.id.toLowerCase()
      expect(id).not.toMatch(/asset|liab|equity/)
    }
    expect(task.sections.map((s) => s.id)).toEqual(['inputs', 'multiples'])
  })

  it('has unique line ids across sections', () => {
    const task = mission.task as BalanceTask
    const ids = task.sections.flatMap((s) => s.lines.map((l) => l.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has known input lines matching the company bible', () => {
    const task = mission.task as BalanceTask
    const inputs = task.sections.find((s) => s.id === 'inputs')!
    const byId = Object.fromEntries(inputs.lines.map((l) => [l.id, l.value]))
    expect(byId['brickhouse-ev']).toBe(800_000)
    expect(byId['brickhouse-ebitda']).toBe(96_000)
    expect(byId['brickhouse-revenue']).toBe(640_000)
    expect(byId['brickhouse-market-cap']).toBe(580_000)
    expect(byId['brickhouse-net-income']).toBe(34_500)
    expect(byId['ledgerly-market-cap']).toBe(370_000)
    expect(byId['ledgerly-net-income']).toBe(3_750)
  })

  it('has the correct multiple answers with tolerance 0.1 and x unit', () => {
    const task = mission.task as BalanceTask
    expect(task.unit).toBe('x')
    expect(task.tolerance).toBe(0.1)
    const multiples = task.sections.find((s) => s.id === 'multiples')!
    const byId = Object.fromEntries(multiples.lines.map((l) => [l.id, l.answer]))
    expect(byId['brickhouse-ev-ebitda']).toBe(8.3)
    expect(byId['brickhouse-ev-revenue']).toBe(1.25)
    expect(byId['brickhouse-pe']).toBe(16.8)
    expect(byId['ledgerly-pe']).toBe(98.7)
  })

  it('gives accuracy 1 for a perfect answer', () => {
    const result = mission.grade(values())
    expect(result.accuracy).toBe(1)
    expect(result.verdict.length).toBeGreaterThan(0)
  })

  it('accepts an answer within the 0.1 tolerance band', () => {
    const result = mission.grade(values({ 'brickhouse-ev-ebitda': 8.35, 'ledgerly-pe': 98.65 }))
    expect(result.accuracy).toBe(1)
  })

  it('scores a wrong Brickhouse EV/EBITDA and names it in the explanation', () => {
    const result = mission.grade(values({ 'brickhouse-ev-ebitda': 6.0 }))
    expect(result.accuracy).toBeCloseTo(3 / 4)
    expect(result.explanation).toMatch(/EV\/EBITDA/)
    expect(result.explanation).toMatch(/8\.3/)
  })

  it('scores a wrong Brickhouse EV/Revenue and names it in the explanation', () => {
    const result = mission.grade(values({ 'brickhouse-ev-revenue': 2.0 }))
    expect(result.accuracy).toBeCloseTo(3 / 4)
    expect(result.explanation).toMatch(/EV\/Revenue/)
    expect(result.explanation).toMatch(/1\.25/)
  })

  it('scores a wrong Brickhouse P/E and names it in the explanation', () => {
    const result = mission.grade(values({ 'brickhouse-pe': 10.0 }))
    expect(result.accuracy).toBeCloseTo(3 / 4)
    expect(result.explanation).toMatch(/P\/E divides market cap/)
    expect(result.explanation).toMatch(/16\.8/)
  })

  it('scores a wrong Ledgerly P/E and calls out the absurd multiple in the explanation', () => {
    const result = mission.grade(values({ 'ledgerly-pe': 10.0 }))
    expect(result.accuracy).toBeCloseTo(3 / 4)
    expect(result.explanation).toMatch(/Ledgerly/)
    expect(result.explanation).toMatch(/98\.7/)
    expect(result.explanation.toLowerCase()).toMatch(/absurd/)
  })

  it('gives accuracy 0 when every blank is wrong, with a full explanation', () => {
    const result = mission.grade(
      values({ 'brickhouse-ev-ebitda': 0, 'brickhouse-ev-revenue': 0, 'brickhouse-pe': 0, 'ledgerly-pe': 0 }),
    )
    expect(result.accuracy).toBe(0)
    expect(result.explanation).toMatch(/EV\/EBITDA/)
    expect(result.explanation).toMatch(/EV\/Revenue/)
    expect(result.explanation).toMatch(/Brickhouse's? P\/E|P\/E divides market cap/)
    expect(result.explanation).toMatch(/Ledgerly/)
  })

  it('throws on a mismatched answer kind', () => {
    const wrongAnswer: QuizAnswer = { kind: 'quiz', choices: {} }
    expect(() => mission.grade(wrongAnswer)).toThrow()
  })

  it('keeps the lesson body under 120 words', () => {
    const wordCount = mission.lesson.body.trim().split(/\s+/).length
    expect(wordCount).toBeLessThan(120)
  })

  it('shows a bars visual of EV/EBITDA for the three bible companies', () => {
    const visual = mission.lesson.visual
    expect(visual?.kind).toBe('bars')
    if (visual?.kind !== 'bars') throw new Error('expected a bars visual')
    expect(visual.unit).toBe('x')
    const byLabel = Object.fromEntries(visual.items.map((it) => [it.label, it.value]))
    expect(byLabel.Ledgerly).toBe(33.3)
    expect(byLabel.Brickhouse).toBe(8.3)
    expect(byLabel["Nan's Pantry"]).toBe(7.0)
  })
})
