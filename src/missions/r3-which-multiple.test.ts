import { describe, expect, it } from 'vitest'
import mission from './r3-which-multiple'
import type { Answer, QuizTask } from '../engine/types'

const task = mission.task as QuizTask

const CORRECT_CHOICES: Record<string, string> = Object.fromEntries(
  task.questions.map((q) => [q.id, q.correctId]),
)

function answerWith(overrides: Record<string, string | null>): Answer {
  return { kind: 'quiz', choices: { ...CORRECT_CHOICES, ...overrides } }
}

describe('r3-which-multiple mission', () => {
  it('is an untimed quiz, rung 3, order 2, base 6000, par 120, six questions of three choices', () => {
    expect(mission.id).toBe('r3-which-multiple')
    expect(mission.rung).toBe(3)
    expect(mission.order).toBe(2)
    expect(mission.baseComp).toBe(6_000)
    expect(mission.parSeconds).toBe(120)
    expect(task.kind).toBe('quiz')
    expect(task.timeLimitSeconds).toBeUndefined()
    expect(task.questions).toHaveLength(6)
    for (const q of task.questions) {
      expect(q.choices).toHaveLength(3)
    }
  })

  it('gives accuracy 1 and a verdict + explanation for a perfect run', () => {
    const result = mission.grade(answerWith({}))
    expect(result.accuracy).toBe(1)
    expect(result.verdict.length).toBeGreaterThan(0)
    expect(result.explanation.length).toBeGreaterThan(0)
  })

  it('scores 5/6 and names EV/EBITDA when the debt-loaded grocers question is missed', () => {
    const result = mission.grade(answerWith({ 'q-debt-load': 'pe' }))
    expect(result.accuracy).toBeCloseTo(5 / 6)
    expect(result.explanation).toContain('EV/EBITDA')
  })

  it('scores 5/6 and names EV/Revenue when the unprofitable-growth question is missed', () => {
    const result = mission.grade(answerWith({ 'q-no-profit-growth': 'pe' }))
    expect(result.accuracy).toBeCloseTo(5 / 6)
    expect(result.explanation).toContain('EV/Revenue')
  })

  it('scores 5/6 and names P/E when the bank question is missed', () => {
    const result = mission.grade(answerWith({ 'q-bank': 'evebitda' }))
    expect(result.accuracy).toBeCloseTo(5 / 6)
    expect(result.explanation).toContain('P/E')
    expect(result.explanation.toLowerCase()).toContain('bank')
  })

  it('scores 5/6 and mentions depreciation when the depreciation-policy question is missed', () => {
    const result = mission.grade(answerWith({ 'q-depreciation': 'pe' }))
    expect(result.accuracy).toBeCloseTo(5 / 6)
    expect(result.explanation.toLowerCase()).toContain('depreciation')
  })

  it('scores 5/6 and mentions negative EBITDA when that question is missed', () => {
    const result = mission.grade(answerWith({ 'q-negative-ebitda': 'evebitda' }))
    expect(result.accuracy).toBeCloseTo(5 / 6)
    expect(result.explanation.toLowerCase()).toContain('negative')
  })

  it('scores 5/6 and mentions the utility when that question is missed', () => {
    const result = mission.grade(answerWith({ 'q-utility': 'evrev' }))
    expect(result.accuracy).toBeCloseTo(5 / 6)
    expect(result.explanation.toLowerCase()).toContain('utility')
  })

  it('scores 0 for an all-wrong run and still explains every situation', () => {
    const allWrong: Record<string, string> = {}
    for (const q of task.questions) {
      allWrong[q.id] = q.choices.find((c) => c.id !== q.correctId)!.id
    }
    const result = mission.grade({ kind: 'quiz', choices: allWrong })
    expect(result.accuracy).toBe(0)
    expect(result.explanation).toContain('EV/EBITDA')
    expect(result.explanation).toContain('EV/Revenue')
    expect(result.explanation).toContain('P/E')
  })

  it('throws when given the wrong answer kind', () => {
    const badAnswer = { kind: 'order' } as unknown as Answer
    expect(() => mission.grade(badAnswer)).toThrow('wrong answer kind')
  })

  it('has a lesson body under 120 words', () => {
    const wordCount = mission.lesson.body.trim().split(/\s+/).length
    expect(wordCount).toBeLessThan(120)
  })

  it('has unique question ids and each correctId present among that question\'s choices', () => {
    const ids = task.questions.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const q of task.questions) {
      const choiceIds = q.choices.map((c) => c.id)
      expect(new Set(choiceIds).size).toBe(choiceIds.length)
      expect(choiceIds).toContain(q.correctId)
    }
  })
})
