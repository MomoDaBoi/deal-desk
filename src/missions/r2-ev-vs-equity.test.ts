import { describe, expect, it } from 'vitest'
import mission from './r2-ev-vs-equity'
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

describe('r2-ev-vs-equity mission', () => {
  it('gives accuracy 1 for a fully correct sort', () => {
    const answer: Answer = { kind: 'sort', placements: correctPlacements() }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(1)
    expect(result.verdict.length).toBeGreaterThan(0)
    expect(result.explanation.length).toBeGreaterThan(0)
  })

  it('scores 7/8 and explains Ledgerly: 370,000 when misfiled into enterprise value', () => {
    const placements = correctPlacements()
    placements.ledgerly_370 = 'ev'
    const answer: Answer = { kind: 'sort', placements }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(7 / 8)
    expect(result.explanation).toContain('Ledgerly: 370,000')
    expect(result.explanation.toLowerCase()).toContain('equity value')
  })

  it('scores 7/8 and explains "the number you compare to EBITDA" when misfiled into equity value', () => {
    const placements = correctPlacements()
    placements.compare_to_ebitda = 'equity'
    const answer: Answer = { kind: 'sort', placements }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(7 / 8)
    expect(result.explanation).toContain('The number you compare to EBITDA')
    expect(result.explanation.toLowerCase()).toContain('enterprise value')
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

  it('has exactly the 8 specified items, 4 in each bucket', () => {
    const t = task()
    expect(t.items).toHaveLength(8)
    expect(t.items.filter((i) => i.bucketId === 'ev')).toHaveLength(4)
    expect(t.items.filter((i) => i.bucketId === 'equity')).toHaveLength(4)
  })

  it('has every item bucketId pointing at a real bucket', () => {
    const t = task()
    const bucketIds = new Set(t.buckets.map((b) => b.id))
    for (const item of t.items) {
      expect(bucketIds.has(item.bucketId)).toBe(true)
    }
  })

  it('shows a bars visual of market cap, net debt, and enterprise value', () => {
    const visual = mission.lesson.visual
    expect(visual?.kind).toBe('bars')
    if (visual?.kind !== 'bars') throw new Error('expected a bars visual')
    expect(visual.unit).toBe('$k')
    const byLabel = Object.fromEntries(visual.items.map((it) => [it.label, it.value]))
    expect(byLabel['Market cap']).toBe(370_000)
    expect(byLabel['Net debt']).toBe(30_000)
    expect(byLabel['Enterprise value']).toBe(400_000)
  })

  it('has basic mission metadata matching the spec', () => {
    expect(mission.id).toBe('r2-ev-vs-equity')
    expect(mission.rung).toBe(2)
    expect(mission.order).toBe(5)
    expect(mission.baseComp).toBe(6_000)
    expect(mission.parSeconds).toBe(120)
    expect(mission.boss).toBeUndefined()
    expect(mission.task.kind).toBe('sort')
  })
})
