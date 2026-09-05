import { describe, expect, it } from 'vitest'
import mission from './r3-football-field'
import type { BalanceAnswer, FootballFieldAnswer, FootballFieldTask } from '../engine/types'

const task = mission.task as FootballFieldTask

function answer(ranges: FootballFieldAnswer['ranges']): FootballFieldAnswer {
  return { kind: 'footballfield', ranges }
}

describe('r3-football-field', () => {
  it('scores 1 on a perfect answer', () => {
    const result = mission.grade(
      answer({
        comps: { low: 9.88, high: 12.76 },
        precedents: { low: 15.16, high: 17.08 },
      }),
    )
    expect(result.accuracy).toBe(1)
  })

  it('scores 0.75 and explains the missed comps high end by name', () => {
    // comps low right, comps high wrong (way off); precedents both right.
    const result = mission.grade(
      answer({
        comps: { low: 9.88, high: 20 },
        precedents: { low: 15.16, high: 17.08 },
      }),
    )
    // comps row score = (1 + 0) / 2 = 0.5, precedents row score = 1 -> mean = 0.75
    expect(result.accuracy).toBeCloseTo(0.75, 5)
    expect(result.explanation).toContain('Trading comps row, high end')
    expect(result.explanation).not.toContain('Trading comps row, low end')
    expect(result.explanation).not.toContain('Precedents row')
  })

  it('throws on a mismatched answer kind', () => {
    const wrongAnswer: BalanceAnswer = { kind: 'balance', values: {} }
    expect(() => mission.grade(wrongAnswer)).toThrow()
  })

  it('keeps the lesson body under 120 words', () => {
    const words = mission.lesson.body.trim().split(/\s+/)
    expect(words.length).toBeLessThan(120)
  })

  it('defines football field, EV/EBITDA, and precedent transactions in the lesson', () => {
    const body = mission.lesson.body.toLowerCase()
    expect(body).toContain('football field')
    expect(body).toContain('ev/ebitda')
    expect(body).toContain('enterprise value')
    expect(body).toContain('precedent transactions')
    expect(body).toContain('net debt')
  })

  it('has unique row ids', () => {
    const ids = task.rows.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has low < high on every row', () => {
    for (const row of task.rows) {
      expect(row.lowAnswer).toBeLessThan(row.highAnswer)
    }
  })

  it('has no embedded question', () => {
    expect(task.question).toBeUndefined()
  })

  it('matches the spec figures from the company bible', () => {
    const comps = task.rows.find((r) => r.id === 'comps')!
    const precedents = task.rows.find((r) => r.id === 'precedents')!
    expect(comps.lowAnswer).toBeCloseTo(9.88, 5)
    expect(comps.highAnswer).toBeCloseTo(12.76, 5)
    expect(comps.tolerance).toBe(0.25)
    expect(precedents.lowAnswer).toBeCloseTo(15.16, 5)
    expect(precedents.highAnswer).toBeCloseTo(17.08, 5)
    expect(precedents.tolerance).toBe(0.25)
  })

  it('has the right mission metadata', () => {
    expect(mission.id).toBe('r3-football-field')
    expect(mission.rung).toBe(3)
    expect(mission.order).toBe(5)
    expect(mission.baseComp).toBe(9_000)
    expect(mission.parSeconds).toBe(200)
    expect(task.axis).toEqual({ min: 8, max: 20, step: 0.05 })
    expect(task.unit).toBe('$')
  })
})
