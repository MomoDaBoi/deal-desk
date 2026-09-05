import { describe, expect, it } from 'vitest'
import mission from './r1-three-statements'
import type { Answer, SortTask } from '../engine/types'

const task = mission.task as SortTask

const CORRECT_PLACEMENTS: Record<string, string> = Object.fromEntries(
  task.items.map((item) => [item.id, item.bucketId]),
)

describe('r1-three-statements mission', () => {
  it('gives accuracy 1 for every item filed on its correct statement', () => {
    const answer: Answer = { kind: 'sort', placements: CORRECT_PLACEMENTS }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(1)
    expect(result.verdict.length).toBeGreaterThan(0)
    expect(result.explanation.length).toBeGreaterThan(0)
  })

  it('mentions net income lives on the income statement and also opens the cash flow statement', () => {
    const answer: Answer = { kind: 'sort', placements: CORRECT_PLACEMENTS }
    const result = mission.grade(answer)
    expect(result.explanation.toLowerCase()).toContain('net income')
    expect(result.explanation.toLowerCase()).toContain('cash flow statement')
  })

  it('scores 8/9 and names the misfiled item plus its statement when cash is put on the income statement', () => {
    const placements = { ...CORRECT_PLACEMENTS, cash: 'income' }
    const answer: Answer = { kind: 'sort', placements }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(8 / 9)
    expect(result.explanation).toContain('Cash')
    expect(result.explanation.toLowerCase()).toContain('balance sheet')
    expect(result.verdict.length).toBeGreaterThan(0)
  })

  it('scores 0 and gives the zero-band verdict when every item is misplaced', () => {
    // Rotate every item into a statement that is not its correct one.
    const rotate: Record<string, string> = { income: 'balance', balance: 'cashflow', cashflow: 'income' }
    const placements: Record<string, string> = {}
    for (const item of task.items) placements[item.id] = rotate[item.bucketId]
    const answer: Answer = { kind: 'sort', placements }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(0)
    expect(result.explanation).toContain('Revenue')
  })

  it('throws when given the wrong answer kind', () => {
    const badAnswer = { kind: 'quiz' } as unknown as Answer
    expect(() => mission.grade(badAnswer)).toThrow('wrong answer kind')
  })

  it('keeps the lesson body under 120 words', () => {
    const wordCount = mission.lesson.body.trim().split(/\s+/).length
    expect(wordCount).toBeLessThan(120)
  })

  it('has unique item ids and unique bucket ids, each item pointing at a real bucket', () => {
    const bucketIds = task.buckets.map((b) => b.id)
    expect(new Set(bucketIds).size).toBe(bucketIds.length)

    const itemIds = task.items.map((i) => i.id)
    expect(new Set(itemIds).size).toBe(itemIds.length)

    for (const item of task.items) {
      expect(bucketIds).toContain(item.bucketId)
    }
  })

  it('has exactly nine items, three per bucket', () => {
    expect(task.items).toHaveLength(9)
    for (const bucket of task.buckets) {
      const count = task.items.filter((i) => i.bucketId === bucket.id).length
      expect(count).toBe(3)
    }
  })
})
