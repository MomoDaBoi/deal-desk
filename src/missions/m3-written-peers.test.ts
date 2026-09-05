import { describe, expect, it } from 'vitest'
import mission from './m3-written-peers'
import type { Answer, MentorClient, WrittenTask } from '../engine/types'

function task(): WrittenTask {
  if (mission.task.kind !== 'written') throw new Error('expected a written task')
  return mission.task
}

function fakeMentor(result: { score: number; verdict: string; explanation: string; missed: string[] }): MentorClient {
  return {
    gradeWritten: async () => result,
  }
}

describe('m3-written-peers mission', () => {
  it('has basic mission metadata matching the spec', () => {
    expect(mission.id).toBe('m3-written-peers')
    expect(mission.rung).toBe(3)
    expect(mission.order).toBe(7)
    expect(mission.mentorOnly).toBe(true)
    expect(mission.baseComp).toBe(0)
    expect(mission.parSeconds).toBe(300)
    expect(mission.title).toBe('Defend the comp set')
    expect(mission.task.kind).toBe('written')
  })

  it('has the specified prompt and word limit', () => {
    const t = task()
    expect(t.prompt).toBe(
      'In three bullets, defend your Brickhouse peer set to a sceptical MD: who is in, who is out, and why.',
    )
    expect(t.wordLimit).toBe(120)
  })

  it('has a rubric with exactly four items', () => {
    expect(task().rubric).toHaveLength(4)
  })

  it('has a non-empty model answer', () => {
    expect(task().modelAnswer.trim().length).toBeGreaterThan(0)
  })

  it('keeps the lesson body under 120 words', () => {
    const wordCount = mission.lesson.body.split(/\s+/).filter(Boolean).length
    expect(wordCount).toBeLessThan(120)
  })

  describe('grade (offline / pure)', () => {
    it('returns accuracy 0 and mentions Mentor mode', () => {
      const answer: Answer = { kind: 'written', text: 'Some answer.' }
      const result = mission.grade(answer)
      expect(result.accuracy).toBe(0)
      expect(result.explanation.toLowerCase()).toContain('mentor mode')
    })

    it('throws when given the wrong answer kind', () => {
      const badAnswer = { kind: 'order' } as unknown as Answer
      expect(() => mission.grade(badAnswer)).toThrow('wrong answer kind')
    })
  })

  describe('gradeAsync (mentor)', () => {
    it('maps a mentor score of 8 to accuracy 0.8', async () => {
      const mentor = fakeMentor({ score: 8, verdict: 'Solid.', explanation: 'Mostly right.', missed: [] })
      const answer: Answer = { kind: 'written', text: 'My defence of the comp set.' }
      if (!mission.gradeAsync) throw new Error('expected gradeAsync to be defined')
      const result = await mission.gradeAsync(answer, mentor)
      expect(result.accuracy).toBeCloseTo(0.8)
      expect(result.verdict).toBe('Solid.')
      expect(result.explanation).toBe('Mostly right.')
    })

    it('marks the missed rubric item as not ok, and the rest ok', async () => {
      const t = task()
      const mentor = fakeMentor({
        score: 8,
        verdict: 'Solid.',
        explanation: 'Mostly right.',
        missed: [t.rubric[1]],
      })
      const answer: Answer = { kind: 'written', text: 'My defence of the comp set.' }
      if (!mission.gradeAsync) throw new Error('expected gradeAsync to be defined')
      const result = await mission.gradeAsync(answer, mentor)
      expect(result.details).toBeDefined()
      const details = result.details!
      expect(details).toHaveLength(4)
      expect(details[1].ok).toBe(false)
      expect(details[1].note).toBe(t.rubric[1])
      const others = details.filter((_, i) => i !== 1)
      expect(others.every((d) => d.ok)).toBe(true)
    })

    it('throws when given the wrong answer kind', async () => {
      const mentor = fakeMentor({ score: 8, verdict: 'v', explanation: 'e', missed: [] })
      const badAnswer = { kind: 'order' } as unknown as Answer
      if (!mission.gradeAsync) throw new Error('expected gradeAsync to be defined')
      await expect(mission.gradeAsync(badAnswer, mentor)).rejects.toThrow('wrong answer kind')
    })

    it('passes the mission prompt, rubric, model answer, word limit and answer text to the mentor', async () => {
      let captured: Parameters<MentorClient['gradeWritten']>[0] | undefined
      const mentor: MentorClient = {
        gradeWritten: async (input) => {
          captured = input
          return { score: 5, verdict: 'v', explanation: 'e', missed: [] }
        },
      }
      const answer: Answer = { kind: 'written', text: 'My defence of the comp set.' }
      if (!mission.gradeAsync) throw new Error('expected gradeAsync to be defined')
      await mission.gradeAsync(answer, mentor)
      const t = task()
      expect(captured).toBeDefined()
      expect(captured!.missionTitle).toBe(mission.title)
      expect(captured!.question).toBe(t.prompt)
      expect(captured!.rubric).toEqual(t.rubric)
      expect(captured!.modelAnswer).toBe(t.modelAnswer)
      expect(captured!.answer).toBe(answer.text)
      expect(captured!.wordLimit).toBe(t.wordLimit)
    })
  })
})
