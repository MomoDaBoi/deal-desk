import { describe, expect, it } from 'vitest'
import mission from './m2-written-ev'
import type { MentorClient, OrderAnswer, WrittenAnswer, WrittenTask } from '../engine/types'

describe('m2-written-ev', () => {
  it('is a mentor-only written task', () => {
    expect(mission.task.kind).toBe('written')
    expect(mission.mentorOnly).toBe(true)
  })

  it('rubric has 4 items', () => {
    const task = mission.task as WrittenTask
    expect(task.rubric).toHaveLength(4)
  })

  it('modelAnswer is non-empty', () => {
    const task = mission.task as WrittenTask
    expect(task.modelAnswer.trim().length).toBeGreaterThan(0)
  })

  it('lesson body is under 120 words', () => {
    const wordCount = mission.lesson.body.split(/\s+/).filter(Boolean).length
    expect(wordCount).toBeLessThan(120)
  })

  it('grade() returns accuracy 0 and mentions Mentor mode (offline fallback)', () => {
    const answer: WrittenAnswer = { kind: 'written', text: 'Enterprise value includes debt.' }
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
    const fakeMentor: MentorClient = {
      gradeWritten: async () => ({ score: 10, verdict: 'x', explanation: 'x', missed: [] }),
    }
    await expect(mission.gradeAsync!(wrongAnswer, fakeMentor)).rejects.toThrow()
  })

  it('gradeAsync maps a fake mentor result (score 8, one missed rubric item) to accuracy 0.8', async () => {
    const task = mission.task as WrittenTask
    const answer: WrittenAnswer = {
      kind: 'written',
      text: 'Enterprise value adds debt and subtracts cash so it prices the whole business, while market cap only prices the shares.',
    }
    const fakeMentor: MentorClient = {
      gradeWritten: async (input) => {
        expect(input.missionTitle).toBe(mission.title)
        expect(input.question).toBe(task.prompt)
        expect(input.rubric).toEqual(task.rubric)
        expect(input.modelAnswer).toBe(task.modelAnswer)
        expect(input.answer).toBe(answer.text)
        expect(input.wordLimit).toBe(task.wordLimit)
        return {
          score: 8,
          verdict: 'Close.',
          explanation: 'Good, but you never said the two companies could differ only in debt.',
          missed: [task.rubric[1]],
        }
      },
    }
    const result = await mission.gradeAsync!(answer, fakeMentor)
    expect(result.accuracy).toBeCloseTo(0.8)
    expect(result.details).toBeDefined()
    const missedDetail = result.details!.find((d) => d.note === task.rubric[1])
    expect(missedDetail?.ok).toBe(false)
    const otherDetails = result.details!.filter((d) => d.note !== task.rubric[1])
    expect(otherDetails.every((d) => d.ok)).toBe(true)
  })
})
