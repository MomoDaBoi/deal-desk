import { describe, expect, it } from 'vitest'
import { gradeFootballField } from './footballfield'
import type { FootballFieldAnswer, FootballFieldTask } from '../types'

const noop = () => ({ verdict: 'v', explanation: 'e' })

function baseTask(overrides: Partial<FootballFieldTask> = {}): FootballFieldTask {
  return {
    kind: 'footballfield',
    prompt: 'Set the ranges.',
    unit: '$',
    axis: { min: 0, max: 20, step: 0.5 },
    rows: [
      { id: 'comps', label: 'Trading comps', lowAnswer: 8, highAnswer: 12, tolerance: 0.5 },
      { id: 'precedents', label: 'Precedent deals', lowAnswer: 10, highAnswer: 15, tolerance: 0.5, note: 'Precedents skew high.' },
    ],
    ...overrides,
  }
}

function answer(ranges: Record<string, { low: number; high: number }>, choice: string | null = null): FootballFieldAnswer {
  return { kind: 'footballfield', ranges, choice }
}

describe('gradeFootballField', () => {
  it('scores 1 and marks every row ok when every end is hit', () => {
    const task = baseTask()
    const result = gradeFootballField(
      task,
      answer({ comps: { low: 8, high: 12 }, precedents: { low: 10, high: 15 } }),
      noop,
    )
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([
      { id: 'comps', ok: true, note: 'Answer 8–12, you set 8–12' },
      { id: 'precedents', ok: true, note: 'Answer 10–15, you set 10–15. Precedents skew high.' },
    ])
  })

  it('scores 0.75 overall when one end of one row is missed and the other row is perfect', () => {
    const task = baseTask()
    const result = gradeFootballField(
      task,
      answer({ comps: { low: 8, high: 20 }, precedents: { low: 10, high: 15 } }),
      noop,
    )
    expect(result.accuracy).toBe(0.75)
    expect(result.details[0]).toEqual({ id: 'comps', ok: false, note: 'Answer 8–12, you set 8–20' })
  })

  it('scores a missing row as 0 and marks it wrong', () => {
    const task = baseTask()
    const result = gradeFootballField(task, answer({ comps: { low: 8, high: 12 } }), noop)
    expect(result.accuracy).toBe(0.5)
    const wrong = result.details.find((d) => d.id === 'precedents')
    expect(wrong).toEqual({ id: 'precedents', ok: false, note: 'Answer 10–15, you set nothing. Precedents skew high.' })
  })

  it('weights the embedded question at the default 25% and shares 75% across rows', () => {
    const task = baseTask({
      question: {
        text: 'Which range would you defend?',
        choices: [
          { id: 'a', label: 'Comps' },
          { id: 'b', label: 'Precedents' },
        ],
        correctId: 'b',
        explanation: 'Precedents reflect actual control premiums paid.',
      },
    })
    let wrongIds: string[] = []
    const result = gradeFootballField(
      task,
      answer({ comps: { low: 8, high: 12 }, precedents: { low: 10, high: 15 } }, 'a'),
      (ctx) => {
        wrongIds = ctx.wrongIds
        return noop()
      },
    )
    // rowsAccuracy = 1, question wrong -> accuracy = 0.75 * 1 + 0.25 * 0 = 0.75
    expect(result.accuracy).toBe(0.75)
    expect(wrongIds).toEqual(['question'])
    expect(result.details.at(-1)).toEqual({
      id: 'question',
      ok: false,
      note: 'Precedents reflect actual control premiums paid.',
    })
  })

  it('honours a custom question weight', () => {
    const task = baseTask({
      question: {
        text: 'Which range would you defend?',
        choices: [
          { id: 'a', label: 'Comps' },
          { id: 'b', label: 'Precedents' },
        ],
        correctId: 'b',
        explanation: 'Precedents reflect actual control premiums paid.',
        weight: 0.5,
      },
    })
    let wrongIds: string[] = []
    const result = gradeFootballField(
      task,
      answer({ comps: { low: 8, high: 12 }, precedents: { low: 10, high: 15 } }, 'b'),
      (ctx) => {
        wrongIds = ctx.wrongIds
        return noop()
      },
    )
    // rowsAccuracy = 1, question correct -> accuracy = 0.5 * 1 + 0.5 * 1 = 1
    expect(result.accuracy).toBe(1)
    expect(wrongIds).toEqual([])
  })

  it('includes "question" in wrongIds when the question is unanswered', () => {
    const task = baseTask({
      question: {
        text: 'Which range would you defend?',
        choices: [
          { id: 'a', label: 'Comps' },
          { id: 'b', label: 'Precedents' },
        ],
        correctId: 'b',
        explanation: 'Precedents reflect actual control premiums paid.',
      },
    })
    let wrongIds: string[] = []
    const result = gradeFootballField(
      task,
      answer({ comps: { low: 8, high: 12 }, precedents: { low: 10, high: 15 } }, null),
      (ctx) => {
        wrongIds = ctx.wrongIds
        return noop()
      },
    )
    expect(wrongIds).toEqual(['question'])
    expect(result.accuracy).toBe(0.75)
  })

  it('passes rows, wrongIds and questionOk through to explain', () => {
    const task = baseTask({
      question: {
        text: 'Which range would you defend?',
        choices: [
          { id: 'a', label: 'Comps' },
          { id: 'b', label: 'Precedents' },
        ],
        correctId: 'b',
        explanation: 'Precedents reflect actual control premiums paid.',
      },
    })
    let captured: unknown
    gradeFootballField(
      task,
      answer({ comps: { low: 8, high: 20 }, precedents: { low: 10, high: 15 } }, 'b'),
      (ctx) => {
        captured = ctx
        return { verdict: 'v', explanation: 'e' }
      },
    )
    expect(captured).toEqual({
      accuracy: (1 - 0.25) * ((0.5 + 1) / 2) + 0.25 * 1,
      wrongIds: ['comps'],
      rows: [
        { id: 'comps', label: 'Trading comps', lowOk: true, highOk: false, low: 8, high: 20 },
        { id: 'precedents', label: 'Precedent deals', lowOk: true, highOk: true, low: 10, high: 15 },
      ],
      questionOk: true,
    })
  })

  it('returns accuracy 1 with no details when there are no rows and no question', () => {
    const task = baseTask({ rows: [] })
    const result = gradeFootballField(task, answer({}), noop)
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([])
  })
})
