import { describe, expect, it } from 'vitest'
import mission from './r1-cash-flow-sort'
import type { Answer, SortTask } from '../engine/types'

function task(): SortTask {
  if (mission.task.kind !== 'sort') throw new Error('expected a sort task')
  return mission.task
}

function correctPlacements(): Record<string, string> {
  const placements: Record<string, string> = {}
  for (const item of task().items) placements[item.id] = item.bucketId
  return placements
}

describe('r1-cash-flow-sort mission', () => {
  it('gives accuracy 1 for a fully correct sort', () => {
    const answer: Answer = { kind: 'sort', placements: correctPlacements() }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(1)
    expect(result.verdict.length).toBeGreaterThan(0)
    expect(result.explanation.length).toBeGreaterThan(0)
  })

  it('scores 8/9 and explains depreciation when it is misfiled into investing', () => {
    const placements = correctPlacements()
    placements.depreciation = 'investing'
    const answer: Answer = { kind: 'sort', placements }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(8 / 9)
    expect(result.explanation).toContain('Depreciation')
    expect(result.explanation.toLowerCase()).toContain('operating')
    expect(result.explanation.toLowerCase()).toContain('non-cash')
  })

  it('explains the dividend line when it is misfiled into operating', () => {
    const placements = correctPlacements()
    placements.dividends = 'operating'
    const answer: Answer = { kind: 'sort', placements }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(8 / 9)
    expect(result.explanation).toContain('Dividends to founder')
    expect(result.explanation.toLowerCase()).toContain('financing')
  })

  it('gives a zero-accuracy explanation when nothing is placed', () => {
    const answer: Answer = { kind: 'sort', placements: {} }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(0)
    expect(result.explanation.length).toBeGreaterThan(0)
  })

  it('throws when given the wrong answer kind', () => {
    const badAnswer = { kind: 'order' } as unknown as Answer
    expect(() => mission.grade(badAnswer)).toThrow('wrong answer kind')
  })

  it('keeps the lesson body under 120 words', () => {
    const wordCount = mission.lesson.body.split(/\s+/).filter(Boolean).length
    expect(wordCount).toBeLessThan(120)
  })

  it('has unique bucket ids and unique item ids', () => {
    const t = task()
    const bucketIds = t.buckets.map((b) => b.id)
    const itemIds = t.items.map((i) => i.id)
    expect(new Set(bucketIds).size).toBe(bucketIds.length)
    expect(new Set(itemIds).size).toBe(itemIds.length)
  })

  it('has exactly the 9 specified items', () => {
    const t = task()
    expect(t.items).toHaveLength(9)
  })

  it('has every item bucketId pointing at a real bucket', () => {
    const t = task()
    const bucketIds = new Set(t.buckets.map((b) => b.id))
    for (const item of t.items) {
      expect(bucketIds.has(item.bucketId)).toBe(true)
    }
  })

  it('has basic mission metadata matching the spec', () => {
    expect(mission.id).toBe('r1-cash-flow-sort')
    expect(mission.rung).toBe(1)
    expect(mission.order).toBe(4)
    expect(mission.title).toBe('Follow the cash')
    expect(mission.baseComp).toBe(5_000)
    expect(mission.parSeconds).toBe(120)
    expect(mission.boss).toBeUndefined()
    expect(mission.task.kind).toBe('sort')
  })
})
