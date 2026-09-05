import { describe, expect, it, vi } from 'vitest'
import { gradeQuiz } from './quiz'
import type { QuizAnswer, QuizTask } from '../types'

function makeTask(overrides: Partial<QuizTask> = {}): QuizTask {
  return {
    kind: 'quiz',
    prompt: 'Boss fight',
    questions: [
      {
        id: 'q1',
        text: 'What is EBIT?',
        choices: [
          { id: 'a', label: 'Earnings before interest and tax' },
          { id: 'b', label: 'Earnings before ice cream and tacos' },
        ],
        correctId: 'a',
        explanation: 'EBIT is operating profit: earnings before interest and tax.',
      },
      {
        id: 'q2',
        text: 'What is COGS?',
        choices: [
          { id: 'a', label: 'Cost of goods sold' },
          { id: 'b', label: 'Cost of golf shoes' },
        ],
        correctId: 'a',
        explanation: 'COGS is the direct cost of producing what was sold.',
      },
      {
        id: 'q3',
        text: 'What is net income?',
        choices: [
          { id: 'a', label: 'The top line' },
          { id: 'b', label: 'The bottom line' },
        ],
        correctId: 'b',
        explanation: 'Net income is the bottom line, after interest and tax.',
      },
    ],
    ...overrides,
  }
}

const noop = () => ({ verdict: 'v', explanation: 'e' })

describe('gradeQuiz', () => {
  it('gives accuracy 1 and all-ok, note-free details when every answer is correct', () => {
    const task = makeTask()
    const answer: QuizAnswer = { kind: 'quiz', choices: { q1: 'a', q2: 'a', q3: 'b' } }
    const result = gradeQuiz(task, answer, noop)
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([
      { id: 'q1', ok: true, note: undefined },
      { id: 'q2', ok: true, note: undefined },
      { id: 'q3', ok: true, note: undefined },
    ])
  })

  it('marks one wrong answer and includes its explanation as the note', () => {
    const task = makeTask()
    const answer: QuizAnswer = { kind: 'quiz', choices: { q1: 'b', q2: 'a', q3: 'b' } }
    const result = gradeQuiz(task, answer, noop)
    expect(result.accuracy).toBeCloseTo(2 / 3)
    expect(result.details).toEqual([
      { id: 'q1', ok: false, note: 'EBIT is operating profit: earnings before interest and tax.' },
      { id: 'q2', ok: true, note: undefined },
      { id: 'q3', ok: true, note: undefined },
    ])
  })

  it('counts a missing or null choice as wrong and reports it in unansweredIds and wrongIds', () => {
    const task = makeTask()
    const answer: QuizAnswer = { kind: 'quiz', choices: { q1: 'a', q2: null, q3: 'b' } } // q3 answered, q2 explicit null; q1 present. Missing entirely also covered below.
    const explain = vi.fn(noop)
    const result = gradeQuiz(task, answer, explain)
    expect(result.accuracy).toBeCloseTo(2 / 3)
    expect(result.details.find((d) => d.id === 'q2')).toEqual({
      id: 'q2',
      ok: false,
      note: 'COGS is the direct cost of producing what was sold.',
    })
    const ctx = explain.mock.calls[0]![0]
    expect(ctx.unansweredIds).toEqual(['q2'])
    expect(ctx.wrongIds).toEqual(['q2'])
  })

  it('treats a question missing from choices entirely as unanswered and wrong', () => {
    const task = makeTask()
    const answer: QuizAnswer = { kind: 'quiz', choices: { q1: 'a', q3: 'b' } } // q2 absent
    const explain = vi.fn(noop)
    const result = gradeQuiz(task, answer, explain)
    expect(result.accuracy).toBeCloseTo(2 / 3)
    const ctx = explain.mock.calls[0]![0]
    expect(ctx.unansweredIds).toEqual(['q2'])
    expect(ctx.wrongIds).toEqual(['q2'])
  })

  it('passes timedOut through to explain', () => {
    const task = makeTask()
    const answer: QuizAnswer = { kind: 'quiz', choices: { q1: 'a', q2: 'a', q3: 'b' }, timedOut: true }
    const explain = vi.fn(noop)
    gradeQuiz(task, answer, explain)
    expect(explain.mock.calls[0]![0].timedOut).toBe(true)
  })

  it('defaults timedOut to false when absent', () => {
    const task = makeTask()
    const answer: QuizAnswer = { kind: 'quiz', choices: { q1: 'a', q2: 'a', q3: 'b' } }
    const explain = vi.fn(noop)
    gradeQuiz(task, answer, explain)
    expect(explain.mock.calls[0]![0].timedOut).toBe(false)
  })

  it('returns accuracy 1 for an empty question list without calling explain', () => {
    const task = makeTask({ questions: [] })
    const answer: QuizAnswer = { kind: 'quiz', choices: {} }
    const explain = vi.fn(noop)
    const result = gradeQuiz(task, answer, explain)
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([])
    expect(explain).not.toHaveBeenCalled()
  })

  it('uses the verdict and explanation returned by explain', () => {
    const task = makeTask()
    const answer: QuizAnswer = { kind: 'quiz', choices: { q1: 'a', q2: 'a', q3: 'b' } }
    const result = gradeQuiz(task, answer, () => ({ verdict: 'Bonus secured.', explanation: 'Clean sweep.' }))
    expect(result.verdict).toBe('Bonus secured.')
    expect(result.explanation).toBe('Clean sweep.')
  })
})
