import { describe, expect, it } from 'vitest'
import { findPath, nearestWalkable } from './pathfind'

function grid(rows: string[]) {
  const width = rows[0].length
  const height = rows.length
  const walkable = (x: number, y: number) => rows[y][x] !== '#'
  return { width, height, walkable }
}

describe('findPath', () => {
  it('returns an empty path when already there', () => {
    const g = grid(['...'])
    expect(findPath(g.width, g.height, g.walkable, { x: 1, y: 0 }, { x: 1, y: 0 })).toEqual([])
  })
  it('finds a straight path excluding the start and including the goal', () => {
    const g = grid(['....'])
    expect(findPath(g.width, g.height, g.walkable, { x: 0, y: 0 }, { x: 3, y: 0 })).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ])
  })
  it('routes around walls with a shortest path', () => {
    const g = grid(['..#..', '..#..', '.....'])
    const p = findPath(g.width, g.height, g.walkable, { x: 0, y: 0 }, { x: 4, y: 0 })
    expect(p).not.toBeNull()
    expect(p!.length).toBe(8)
    expect(p![p!.length - 1]).toEqual({ x: 4, y: 0 })
    for (const t of p!) expect(g.walkable(t.x, t.y)).toBe(true)
  })
  it('returns null when the goal is blocked or unreachable', () => {
    const g = grid(['.#.'])
    expect(findPath(g.width, g.height, g.walkable, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull()
    expect(findPath(g.width, g.height, g.walkable, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull()
    expect(findPath(g.width, g.height, g.walkable, { x: 0, y: 0 }, { x: 9, y: 0 })).toBeNull()
  })
})

describe('nearestWalkable', () => {
  it('returns the tile itself when walkable', () => {
    const g = grid(['...'])
    expect(nearestWalkable(g.width, g.height, g.walkable, { x: 1, y: 0 })).toEqual({ x: 1, y: 0 })
  })
  it('finds the closest open neighbour of a blocked tile', () => {
    const g = grid(['###', '#.#', '###', '...'])
    expect(nearestWalkable(g.width, g.height, g.walkable, { x: 1, y: 2 })).toEqual({ x: 1, y: 1 })
    expect(nearestWalkable(g.width, g.height, g.walkable, { x: 0, y: 0 }, 1)).toBeNull()
  })
})
