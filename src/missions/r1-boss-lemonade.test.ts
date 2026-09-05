import { describe, expect, it } from 'vitest'
import mission from './r1-boss-lemonade'
import type { Answer, QuizTask } from '../engine/types'

const task = mission.task as QuizTask

const CORRECT_CHOICES: Record<string, string> = Object.fromEntries(
  task.questions.map((q) => [q.id, q.correctId]),
)

function answerWith(overrides: Record<string, string | null>, timedOut = false): Answer {
  return { kind: 'quiz', choices: { ...CORRECT_CHOICES, ...overrides }, timedOut }
}

describe('r1-boss-lemonade mission', () => {
  it('is a boss quiz with five questions, each with three choices', () => {
    expect(mission.id).toBe('r1-boss-lemonade')
    expect(mission.rung).toBe(1)
    expect(mission.boss).toBe(true)
    expect(task.kind).toBe('quiz')
    expect(task.timeLimitSeconds).toBe(90)
    expect(task.questions).toHaveLength(5)
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

  it('scores 4/5 and names the balance sheet when the debt question is missed', () => {
    const answer = answerWith({ 'q-debt': 'inc' })
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(4 / 5)
    expect(result.explanation.toLowerCase()).toContain('balance sheet')
    expect(result.explanation).toContain('330')
  })

  it('scores 4/5 and names the correct gross profit figure when the numeric question is missed', () => {
    const answer = answerWith({ 'q-grossprofit': '300' })
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(4 / 5)
    expect(result.explanation).toContain('720')
  })

  it('opens with a bank-call line when the quiz timed out', () => {
    const answer = answerWith({ 'q-cashgap': 'inc' }, true)
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(4 / 5)
    expect(result.explanation.toLowerCase()).toContain('bank call')
  })

  it('scores 0 for an all-wrong run and still explains every statement', () => {
    const allWrong: Record<string, string> = {}
    for (const q of task.questions) {
      allWrong[q.id] = q.choices.find((c) => c.id !== q.correctId)!.id
    }
    const result = mission.grade({ kind: 'quiz', choices: allWrong })
    expect(result.accuracy).toBe(0)
    expect(result.explanation.toLowerCase()).toContain('income statement')
    expect(result.explanation.toLowerCase()).toContain('balance sheet')
    expect(result.explanation.toLowerCase()).toContain('cash flow')
  })

  it('tells the player the clock ran out, not that every answer was wrong, on a nothing-answered timeout', () => {
    const result = mission.grade({ kind: 'quiz', choices: {}, timedOut: true })
    expect(result.accuracy).toBe(0)
    expect(result.verdict.toLowerCase()).toContain('time')
    expect(result.explanation.toLowerCase()).toContain('ran out')
    expect(result.explanation.toLowerCase()).not.toContain('every single one was wrong')
  })

  it('still uses the all-wrong copy when every question is answered and every answer is wrong, timeout or not', () => {
    const allWrong: Record<string, string> = {}
    for (const q of task.questions) {
      allWrong[q.id] = q.choices.find((c) => c.id !== q.correctId)!.id
    }
    const result = mission.grade({ kind: 'quiz', choices: allWrong, timedOut: true })
    expect(result.accuracy).toBe(0)
    expect(result.explanation.toLowerCase()).toContain('every single one was wrong')
  })

  it('throws when given the wrong answer kind', () => {
    const badAnswer = { kind: 'order' } as unknown as Answer
    expect(() => mission.grade(badAnswer)).toThrow('wrong answer kind')
  })

  it('has a lesson body under 120 words', () => {
    const wordCount = mission.lesson.body.trim().split(/\s+/).length
    expect(wordCount).toBeLessThan(120)
  })

  it('has unique question ids and correctId present among that question\'s choices', () => {
    const ids = task.questions.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const q of task.questions) {
      const choiceIds = q.choices.map((c) => c.id)
      expect(new Set(choiceIds).size).toBe(choiceIds.length)
      expect(choiceIds).toContain(q.correctId)
    }
  })
})
