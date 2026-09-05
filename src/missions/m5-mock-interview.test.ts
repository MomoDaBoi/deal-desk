import { describe, expect, it } from 'vitest'
import mission from './m5-mock-interview'
import type { MentorClient, OrderAnswer, WrittenAnswer, WrittenTask } from '../engine/types'

const task = mission.task as WrittenTask

/** A fake mentor that returns a fixed score/explanation per question id, defaulting to 10 (perfect). */
function fakeMentor(overrides: Record<string, { score: number; explanation?: string }> = {}): MentorClient {
  return {
    gradeWritten: async (input) => {
      const q = task.questions!.find((q) => q.text === input.question)!
      const o = overrides[q.id]
      const score = o?.score ?? 10
      return {
        score,
        verdict: score >= 7 ? 'Hire' : 'Pass',
        explanation: o?.explanation ?? `${q.id} looked clean.`,
        missed: [],
      }
    },
  }
}

describe('m5-mock-interview', () => {
  it('is a mentor-only, rung 5 written mission with the spec shape', () => {
    expect(mission.id).toBe('m5-mock-interview')
    expect(mission.rung).toBe(5)
    expect(mission.order).toBe(7)
    expect(mission.mentorOnly).toBe(true)
    expect(mission.baseComp).toBe(0)
    expect(mission.parSeconds).toBe(600)
    expect(task.kind).toBe('written')
    expect(task.wordLimit).toBe(120)
  })

  it('has five questions with ids q1..q5, each with a 3-item rubric and a modelAnswer', () => {
    expect(task.questions).toHaveLength(5)
    const ids = task.questions!.map((q) => q.id)
    expect(ids).toEqual(['q1', 'q2', 'q3', 'q4', 'q5'])
    expect(new Set(ids).size).toBe(5)
    for (const q of task.questions!) {
      expect(q.rubric).toHaveLength(3)
      expect(q.modelAnswer.trim().length).toBeGreaterThan(0)
      expect(q.text.trim().length).toBeGreaterThan(0)
    }
  })

  it('task.rubric is the five question texts, in order, for the offline fallback', () => {
    expect(task.rubric).toEqual(task.questions!.map((q) => q.text))
  })

  it('lesson body is under 120 words', () => {
    const wordCount = mission.lesson.body.split(/\s+/).filter(Boolean).length
    expect(wordCount).toBeLessThan(120)
  })

  it('grade() (offline, no Mentor mode) returns accuracy 0 and mentions Mentor mode', () => {
    const answer: WrittenAnswer = { kind: 'written', text: '', answers: {} }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(0)
    expect(result.verdict + result.explanation).toMatch(/mentor mode/i)
  })

  it('grade() throws on a mismatched answer kind', () => {
    const wrongAnswer: OrderAnswer = { kind: 'order', orderedIds: ['a', 'b'] }
    expect(() => mission.grade(wrongAnswer)).toThrow()
  })

  it('gradeAsync throws on a mismatched answer kind', async () => {
    const wrongAnswer: OrderAnswer = { kind: 'order', orderedIds: ['a', 'b'] }
    await expect(mission.gradeAsync!(wrongAnswer, fakeMentor())).rejects.toThrow()
  })

  it('calls mentor.gradeWritten once per question, sequentially, with that question\'s own rubric/modelAnswer', async () => {
    const seen: string[] = []
    const answer: WrittenAnswer = {
      kind: 'written',
      text: '',
      answers: Object.fromEntries(task.questions!.map((q) => [q.id, `my answer to ${q.id}`])),
    }
    const mentor: MentorClient = {
      gradeWritten: async (input) => {
        seen.push(input.question)
        const q = task.questions!.find((q) => q.text === input.question)!
        expect(input.missionTitle).toBe(mission.title)
        expect(input.rubric).toEqual(q.rubric)
        expect(input.modelAnswer).toBe(q.modelAnswer)
        expect(input.answer).toBe(`my answer to ${q.id}`)
        expect(input.wordLimit).toBe(task.wordLimit)
        return { score: 10, verdict: 'Hire', explanation: `${q.id} ok`, missed: [] }
      },
    }
    await mission.gradeAsync!(answer, mentor)
    expect(seen).toEqual(task.questions!.map((q) => q.text))
  })

  it('falls back to an empty string for an unanswered question', async () => {
    const answer: WrittenAnswer = { kind: 'written', text: '', answers: {} }
    let sawEmpty = false
    const mentor: MentorClient = {
      gradeWritten: async (input) => {
        if (input.answer === '') sawEmpty = true
        return { score: 10, verdict: 'Hire', explanation: 'fine', missed: [] }
      },
    }
    await mission.gradeAsync!(answer, mentor)
    expect(sawEmpty).toBe(true)
  })

  it('a perfect answer (score 10 on all five) scores accuracy 1 and a hire verdict', async () => {
    const answer: WrittenAnswer = {
      kind: 'written',
      text: '',
      answers: Object.fromEntries(task.questions!.map((q) => [q.id, 'a great answer'])),
    }
    const result = await mission.gradeAsync!(answer, fakeMentor())
    expect(result.accuracy).toBe(1)
    expect(result.verdict).toBe('We would like to extend an offer. Do not read the fine print.')
    expect(result.details).toHaveLength(5)
    expect(result.details!.every((d) => d.ok)).toBe(true)
  })

  it('one specific wrong answer (q3 scores 4, the rest score 10) drags accuracy to 0.88 and names q3 in the explanation', async () => {
    const answer: WrittenAnswer = {
      kind: 'written',
      text: '',
      answers: Object.fromEntries(task.questions!.map((q) => [q.id, 'an answer'])),
    }
    const mentor = fakeMentor({
      q3: { score: 4, explanation: 'Confused enterprise value with equity value.' },
    })
    const result = await mission.gradeAsync!(answer, mentor)
    // mean([10,10,4,10,10]) / 10 = 44/5/10 = 0.88
    expect(result.accuracy).toBeCloseTo(0.88, 5)
    expect(result.verdict).toBe('We would like to extend an offer. Do not read the fine print.')
    expect(result.explanation).toMatch(/Confused enterprise value with equity value/)
    const q3Detail = result.details!.find((d) => d.id === 'q3')!
    expect(q3Detail.ok).toBe(false)
    expect(q3Detail.note).toMatch(/Confused enterprise value with equity value/)
  })

  it('low scores across the board fall below the 0.7 hire threshold', async () => {
    const answer: WrittenAnswer = {
      kind: 'written',
      text: '',
      answers: Object.fromEntries(task.questions!.map((q) => [q.id, 'weak answer'])),
    }
    const mentor = fakeMentor({
      q1: { score: 3 },
      q2: { score: 3 },
      q3: { score: 3 },
      q4: { score: 3 },
      q5: { score: 3 },
    })
    const result = await mission.gradeAsync!(answer, mentor)
    expect(result.accuracy).toBeCloseTo(0.3, 5)
    expect(result.verdict).toBe('We will keep your CV on file.')
    expect(result.details!.every((d) => !d.ok)).toBe(true)
  })
})
