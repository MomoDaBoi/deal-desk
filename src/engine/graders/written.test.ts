import { describe, expect, it } from 'vitest'
import { mentorResultToGrade, offlineWrittenGrade, truncateWords, wordCount } from './written'
import type { WrittenTask } from '../types'

function baseTask(overrides: Partial<WrittenTask> = {}): WrittenTask {
  return {
    kind: 'written',
    prompt: 'Explain why working capital matters.',
    wordLimit: 60,
    rubric: ['Mentions the cash conversion cycle', 'Gives a concrete example', 'Notes the impact on liquidity'],
    modelAnswer: 'Working capital ties up cash between paying suppliers and collecting from customers...',
    ...overrides,
  }
}

describe('wordCount', () => {
  it('counts words separated by single spaces', () => {
    expect(wordCount('one two three')).toBe(3)
  })

  it('collapses runs of whitespace, including newlines and tabs', () => {
    expect(wordCount('one   two\n\nthree\tfour')).toBe(4)
  })

  it('returns 0 for an empty string', () => {
    expect(wordCount('')).toBe(0)
  })

  it('returns 0 for whitespace-only text', () => {
    expect(wordCount('   \n\t  ')).toBe(0)
  })

  it('trims leading and trailing whitespace before counting', () => {
    expect(wordCount('  hello world  ')).toBe(2)
  })
})

describe('truncateWords', () => {
  it('returns the text unchanged (trimmed) when under the limit', () => {
    expect(truncateWords('one two three', 5)).toBe('one two three')
  })

  it('returns the text unchanged when exactly at the limit', () => {
    expect(truncateWords('one two three', 3)).toBe('one two three')
  })

  it('truncates to exactly `limit` words when over the limit', () => {
    expect(truncateWords('one two three four five', 3)).toBe('one two three')
  })

  it('handles a limit of 0 by returning an empty string', () => {
    expect(truncateWords('one two three', 0)).toBe('')
  })

  it('collapses irregular whitespace in the kept words', () => {
    expect(truncateWords('one   two\nthree   four', 2)).toBe('one two')
  })

  it('trims an under-limit empty/whitespace string to empty', () => {
    expect(truncateWords('   ', 10)).toBe('')
  })
})

describe('offlineWrittenGrade', () => {
  it('returns zero accuracy with the mentor-required verdict', () => {
    const g = offlineWrittenGrade(baseTask())
    expect(g.accuracy).toBe(0)
    expect(g.verdict).toBe('Mentor mode required.')
  })

  it('explanation tells the player about Mentor mode and Settings', () => {
    const g = offlineWrittenGrade(baseTask())
    expect(g.explanation.toLowerCase()).toContain('mentor mode')
    expect(g.explanation.toLowerCase()).toContain('settings')
  })

  it('produces one unchecked detail per rubric item, in order', () => {
    const task = baseTask()
    const g = offlineWrittenGrade(task)
    expect(g.details).toEqual([
      { id: 'r0', ok: false, note: task.rubric[0] },
      { id: 'r1', ok: false, note: task.rubric[1] },
      { id: 'r2', ok: false, note: task.rubric[2] },
    ])
  })

  it('handles an empty rubric', () => {
    const g = offlineWrittenGrade(baseTask({ rubric: [] }))
    expect(g.details).toEqual([])
  })
})

describe('mentorResultToGrade', () => {
  it('maps score 10 to accuracy 1', () => {
    const g = mentorResultToGrade(baseTask(), { score: 10, verdict: 'v', explanation: 'e', missed: [] })
    expect(g.accuracy).toBe(1)
  })

  it('maps score 5 to accuracy 0.5', () => {
    const g = mentorResultToGrade(baseTask(), { score: 5, verdict: 'v', explanation: 'e', missed: [] })
    expect(g.accuracy).toBe(0.5)
  })

  it('maps score 1 to accuracy 0.1', () => {
    const g = mentorResultToGrade(baseTask(), { score: 1, verdict: 'v', explanation: 'e', missed: [] })
    expect(g.accuracy).toBeCloseTo(0.1)
  })

  it('clamps a score above 10 down to 10 (accuracy 1)', () => {
    const g = mentorResultToGrade(baseTask(), { score: 15, verdict: 'v', explanation: 'e', missed: [] })
    expect(g.accuracy).toBe(1)
  })

  it('clamps a score below 1 up to 1 (accuracy 0.1)', () => {
    const g = mentorResultToGrade(baseTask(), { score: 0, verdict: 'v', explanation: 'e', missed: [] })
    expect(g.accuracy).toBeCloseTo(0.1)
  })

  it('carries the verdict and explanation through verbatim', () => {
    const g = mentorResultToGrade(baseTask(), {
      score: 7,
      verdict: 'Passable.',
      explanation: 'You got the cycle right but skipped liquidity.',
      missed: [],
    })
    expect(g.verdict).toBe('Passable.')
    expect(g.explanation).toBe('You got the cycle right but skipped liquidity.')
  })

  it('marks a rubric item ok:false on an exact (case/trim-insensitive) match in missed', () => {
    const task = baseTask()
    const g = mentorResultToGrade(task, {
      score: 6,
      verdict: 'v',
      explanation: 'e',
      missed: ['  MENTIONS THE CASH CONVERSION CYCLE  '],
    })
    expect(g.details).toEqual([
      { id: 'r0', ok: false, note: task.rubric[0] },
      { id: 'r1', ok: true, note: task.rubric[1] },
      { id: 'r2', ok: true, note: task.rubric[2] },
    ])
  })

  it('marks a rubric item ok:false when a missed string is a substring of the rubric text', () => {
    const task = baseTask()
    const g = mentorResultToGrade(task, { score: 6, verdict: 'v', explanation: 'e', missed: ['concrete example'] })
    expect(g.details[1]).toEqual({ id: 'r1', ok: false, note: task.rubric[1] })
  })

  it('marks a rubric item ok:false when the rubric text is a substring of a missed string', () => {
    const task = baseTask()
    const g = mentorResultToGrade(task, {
      score: 6,
      verdict: 'v',
      explanation: 'e',
      missed: ['Notes the impact on liquidity, and did not connect it to the runway discussion'],
    })
    expect(g.details[2]).toEqual({ id: 'r2', ok: false, note: task.rubric[2] })
  })

  it('marks everything ok:true when missed is empty', () => {
    const task = baseTask()
    const g = mentorResultToGrade(task, { score: 9, verdict: 'v', explanation: 'e', missed: [] })
    expect(g.details?.every((d) => d.ok)).toBe(true)
  })

  it('does not match on empty strings in missed', () => {
    const task = baseTask()
    const g = mentorResultToGrade(task, { score: 6, verdict: 'v', explanation: 'e', missed: ['', '   '] })
    expect(g.details?.every((d) => d.ok)).toBe(true)
  })
})
