import { describe, expect, it } from 'vitest'
import mission from './r3-boss-three-ways'
import type { BalanceAnswer, FootballFieldAnswer, FootballFieldTask } from '../engine/types'

const task = mission.task as FootballFieldTask

function answer(ranges: FootballFieldAnswer['ranges'], choice: string | null = null): FootballFieldAnswer {
  return { kind: 'footballfield', ranges, choice }
}

const PERFECT_RANGES: FootballFieldAnswer['ranges'] = {
  comps: { low: 12.26, high: 15.62 },
  precedents: { low: 13.22, high: 17.54 },
  market: { low: 12.1, high: 16.4 },
}

describe('r3-boss-three-ways', () => {
  it('scores 1 on a perfect answer with the correct choice', () => {
    const result = mission.grade(answer(PERFECT_RANGES, 'precedents'))
    expect(result.accuracy).toBe(1)
  })

  it('scores 0 when every row is missing and the wrong choice is picked', () => {
    const result = mission.grade(answer({}, 'market'))
    expect(result.accuracy).toBe(0)
  })

  it('docks exactly the question weight (0.25) for a wrong choice with perfect rows, and names the miss', () => {
    const result = mission.grade(answer(PERFECT_RANGES, 'comps'))
    // rowsAccuracy = 1, questionOk = false, weight 0.25 -> accuracy = 0.75 * 1 + 0.25 * 0 = 0.75
    expect(result.accuracy).toBeCloseTo(0.75, 5)
    expect(result.explanation).toContain('On the question')
    expect(result.explanation).toContain('control premium')
  })

  it('docks only the precedents row and names it by name when comps and market are right', () => {
    const result = mission.grade(
      answer(
        {
          comps: { low: 12.26, high: 15.62 },
          precedents: { low: 20, high: 20 },
          market: { low: 12.1, high: 16.4 },
        },
        'precedents',
      ),
    )
    // 3 rows, precedents scores 0, others score 1 each -> rowsAccuracy = 2/3
    // accuracy = 0.75 * (2/3) + 0.25 * 1 = 0.75
    expect(result.accuracy).toBeCloseTo(0.75, 5)
    expect(result.explanation).toContain('Precedents row, low end')
    expect(result.explanation).toContain('Precedents row, high end')
    expect(result.explanation).not.toContain('Trading comps row')
    expect(result.explanation).not.toContain('52-week trading range row')
  })

  it('throws on a mismatched answer kind', () => {
    const wrongAnswer: BalanceAnswer = { kind: 'balance', values: {} }
    expect(() => mission.grade(wrongAnswer)).toThrow()
  })

  it('keeps the lesson body under 120 words', () => {
    const words = mission.lesson.body.trim().split(/\s+/)
    expect(words.length).toBeLessThan(120)
  })

  it('defines EBITDA, enterprise value, net debt, and control premium in the lesson', () => {
    const body = mission.lesson.body.toLowerCase()
    expect(body).toContain('ebitda')
    expect(body).toContain('enterprise value')
    expect(body).toContain('net debt')
    expect(body).toContain('control premium')
    expect(body).toContain('52-week')
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

  it('has an embedded question whose correctId exists in its own choices', () => {
    expect(task.question).toBeDefined()
    const question = task.question!
    expect(question.choices.some((c) => c.id === question.correctId)).toBe(true)
    const choiceIds = question.choices.map((c) => c.id)
    expect(new Set(choiceIds).size).toBe(choiceIds.length)
    expect(question.correctId).toBe('precedents')
    expect(question.weight).toBe(0.25)
  })

  it('matches the spec figures computed from the company bible', () => {
    const comps = task.rows.find((r) => r.id === 'comps')!
    const precedents = task.rows.find((r) => r.id === 'precedents')!
    const market = task.rows.find((r) => r.id === 'market')!
    expect(comps.lowAnswer).toBeCloseTo(12.26, 5)
    expect(comps.highAnswer).toBeCloseTo(15.62, 5)
    expect(comps.tolerance).toBe(0.3)
    expect(precedents.lowAnswer).toBeCloseTo(13.22, 5)
    expect(precedents.highAnswer).toBeCloseTo(17.54, 5)
    expect(precedents.tolerance).toBe(0.3)
    expect(market.lowAnswer).toBeCloseTo(12.1, 5)
    expect(market.highAnswer).toBeCloseTo(16.4, 5)
    expect(market.tolerance).toBe(0.1)
  })

  it('has the right mission metadata', () => {
    expect(mission.id).toBe('r3-boss-three-ways')
    expect(mission.rung).toBe(3)
    expect(mission.order).toBe(6)
    expect(mission.boss).toBe(true)
    expect(mission.baseComp).toBe(14_000)
    expect(mission.parSeconds).toBe(240)
    expect(task.axis).toEqual({ min: 8, max: 24, step: 0.05 })
    expect(task.unit).toBe('$')
  })
})
