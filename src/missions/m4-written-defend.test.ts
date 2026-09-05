import { describe, expect, it } from 'vitest'
import mission from './m4-written-defend'
import { wordCount } from '../engine/graders/written'
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

describe('m4-written-defend mission', () => {
  it('has basic mission metadata matching the spec', () => {
    expect(mission.id).toBe('m4-written-defend')
    expect(mission.rung).toBe(4)
    expect(mission.order).toBe(7)
    expect(mission.mentorOnly).toBe(true)
    expect(mission.baseComp).toBe(0)
    expect(mission.parSeconds).toBe(300)
    expect(mission.title).toBe('Defend the range')
    expect(mission.task.kind).toBe('written')
  })

  it('has the specified prompt and word limit', () => {
    const t = task()
    expect(t.prompt).toBe('The CFO says your DCF range is too wide to be useful. Defend it in under 100 words.')
    expect(t.wordLimit).toBe(100)
  })

  it('has a rubric with exactly four items', () => {
    expect(task().rubric).toHaveLength(4)
  })

  it('rubric names WACC as the more sensitive input for this DCF', () => {
    // Verified independently: across the two-point band from WACC 7.3% to
    // 9.3% (holding g at 2%) enterprise value swings ~259,980; across the
    // two-point band from g 1% to 3% (holding WACC at 8.3%) it swings
    // ~204,963. WACC moves the answer more, so the rubric must say so.
    expect(task().rubric[2]).toMatch(/WACC/)
  })

  it('has a non-empty model answer under the 100-word limit', () => {
    const t = task()
    expect(t.modelAnswer.trim().length).toBeGreaterThan(0)
    expect(wordCount(t.modelAnswer)).toBeLessThan(100)
  })

  it('model answer cites a range that brackets Brickhouse market EV of $800,000k', () => {
    const t = task()
    expect(t.modelAnswer).toContain('$613,096k')
    expect(t.modelAnswer).toContain('$1,116,711k')
    expect(t.modelAnswer).toContain('$800,000k')
    expect(t.modelAnswer).toContain('$785,494k')
  })

  it('keeps the lesson body under 120 words', () => {
    expect(wordCount(mission.lesson.body)).toBeLessThan(120)
  })

  describe('grade (offline / pure)', () => {
    it('returns accuracy 0 and mentions Mentor mode', () => {
      const answer: Answer = { kind: 'written', text: 'A DCF is a range because inputs are estimates.' }
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
    it('a perfect answer (mentor score 10, nothing missed) grades to accuracy 1', async () => {
      const mentor = fakeMentor({
        score: 10,
        verdict: 'Airtight.',
        explanation: 'Inputs, sensitivity table, WACC as the swing factor, and a clear recommendation.',
        missed: [],
      })
      const answer: Answer = {
        kind: 'written',
        text: task().modelAnswer,
      }
      if (!mission.gradeAsync) throw new Error('expected gradeAsync to be defined')
      const result = await mission.gradeAsync(answer, mentor)
      expect(result.accuracy).toBe(1)
      expect(result.details?.every((d) => d.ok)).toBe(true)
    })

    it('an answer that never says which input dominates grades lower and names that item', async () => {
      const t = task()
      const mentor = fakeMentor({
        score: 6,
        verdict: 'Half a defence.',
        explanation: 'You explained the range is a sensitivity table but never said WACC moves it more than growth.',
        missed: [t.rubric[2]],
      })
      const answer: Answer = {
        kind: 'written',
        text: 'The range comes from a sensitivity table across WACC and growth, so it is not indecision. Recommend using the midpoint.',
      }
      if (!mission.gradeAsync) throw new Error('expected gradeAsync to be defined')
      const result = await mission.gradeAsync(answer, mentor)
      expect(result.accuracy).toBeCloseTo(0.6)
      expect(result.explanation).toMatch(/WACC/)
      const details = result.details!
      expect(details).toHaveLength(4)
      expect(details[2].ok).toBe(false)
      expect(details[2].note).toBe(t.rubric[2])
      const others = details.filter((_, i) => i !== 2)
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
      const answer: Answer = { kind: 'written', text: 'My defence of the range.' }
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
