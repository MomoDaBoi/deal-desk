import { describe, expect, it } from 'vitest'
import mission from './r3-peer-set'
import type { Answer, SortTask } from '../engine/types'
import { INDUSTRIAL_PEERS } from './companies'

function task(): SortTask {
  if (mission.task.kind !== 'sort') throw new Error('expected a sort task')
  return mission.task
}

function correctPlacements(): Record<string, string> {
  const placements: Record<string, string> = {}
  for (const item of task().items) placements[item.id] = item.bucketId
  return placements
}

describe('r3-peer-set mission', () => {
  it('gives accuracy 1 for a fully correct sort', () => {
    const answer: Answer = { kind: 'sort', placements: correctPlacements() }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(1)
    expect(result.verdict.length).toBeGreaterThan(0)
    expect(result.explanation.length).toBeGreaterThan(0)
  })

  it('explains the Halcyon trap by name when it is misplaced into the comp set', () => {
    const placements = correctPlacements()
    placements['halcyon-data-centres'] = 'in'
    const answer: Answer = { kind: 'sort', placements }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(5 / 6)
    expect(result.explanation).toContain('Halcyon Data Centres')
    expect(result.explanation.toLowerCase()).toContain('different industry')
  })

  it('explains the Brickhouse Holdings Pty trap by name when it is misplaced into the comp set', () => {
    const placements = correctPlacements()
    placements['brickhouse-holdings-pty'] = 'in'
    const answer: Answer = { kind: 'sort', placements }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(5 / 6)
    expect(result.explanation).toContain('Brickhouse Holdings Pty')
    expect(result.explanation.toLowerCase()).toContain('private')
  })

  it('names a genuine peer when it is misplaced out of the comp set', () => {
    const placements = correctPlacements()
    placements['palisade-doors-and-docks'] = 'out'
    const answer: Answer = { kind: 'sort', placements }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(5 / 6)
    expect(result.explanation).toContain('Palisade Doors & Docks')
    expect(result.explanation.toLowerCase()).toContain('ebitda')
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

  it('has every item bucketId pointing at a real bucket', () => {
    const t = task()
    const bucketIds = new Set(t.buckets.map((b) => b.id))
    for (const item of t.items) {
      expect(bucketIds.has(item.bucketId)).toBe(true)
    }
  })

  it('has one item per entry of INDUSTRIAL_PEERS, split correctly by trap', () => {
    const t = task()
    expect(t.items).toHaveLength(INDUSTRIAL_PEERS.length)
    const inCount = t.items.filter((i) => i.bucketId === 'in').length
    const outCount = t.items.filter((i) => i.bucketId === 'out').length
    expect(inCount).toBe(INDUSTRIAL_PEERS.filter((p) => !p.trap).length)
    expect(outCount).toBe(INDUSTRIAL_PEERS.filter((p) => p.trap).length)
  })

  it('has basic mission metadata matching the spec', () => {
    expect(mission.id).toBe('r3-peer-set')
    expect(mission.rung).toBe(3)
    expect(mission.order).toBe(3)
    expect(mission.baseComp).toBe(7_000)
    expect(mission.parSeconds).toBe(150)
    expect(mission.boss).toBeUndefined()
    expect(mission.task.kind).toBe('sort')
  })
})
