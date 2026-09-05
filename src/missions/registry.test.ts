import { describe, expect, it } from 'vitest'
import { MISSIONS, missionsForRung } from './index'
import type { Rung } from '../engine/types'

describe('mission registry', () => {
  it('has unique ids', () => {
    const ids = MISSIONS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has contiguous order per rung starting at 1', () => {
    for (const rung of [1, 2, 3, 4, 5] as Rung[]) {
      const orders = missionsForRung(rung, true).map((m) => m.order)
      expect(orders).toEqual(orders.map((_, i) => i + 1))
    }
  })

  it('has positive comp and par on every mission', () => {
    for (const m of MISSIONS) {
      expect(m.baseComp, m.id).toBeGreaterThan(0)
      expect(m.parSeconds, m.id).toBeGreaterThan(0)
    }
  })

  it('has at most one boss per rung, and the boss is last', () => {
    for (const rung of [1, 2, 3, 4, 5] as Rung[]) {
      const ms = missionsForRung(rung, true)
      const bosses = ms.filter((m) => m.boss)
      expect(bosses.length).toBeLessThanOrEqual(1)
      if (bosses.length === 1) expect(ms[ms.length - 1].id).toBe(bosses[0].id)
    }
  })

  it('keeps every lesson body under 120 words', () => {
    for (const m of MISSIONS) {
      const words = m.lesson.body.trim().split(/\s+/).length
      expect(words, m.id).toBeLessThan(120)
    }
  })

  it('hides mentor-only missions in standard mode', () => {
    for (const m of missionsForRung(1, false)) expect(m.mentorOnly).toBeFalsy()
  })
})
