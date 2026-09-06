import { describe, expect, it } from 'vitest'
import type { Rung } from '../engine/types'
import { deskSlots, MAP_H, MAP_W, SPAWN, zoneTop } from './map'
import { findPath } from './pathfind'
import { OfficeWorld, type MissionSlot, type WorldConfig } from './world'

const RUNGS: Rung[] = [1, 2, 3, 4, 5]

function slotsFor(unlockedUpTo: Rung, mentor = true): MissionSlot[] {
  const out: MissionSlot[] = []
  for (const r of RUNGS) {
    const n = r === 1 ? 5 : 6
    for (let i = 0; i < n; i++) out.push({ missionId: `${r}-${i}`, rung: r, slot: i, boss: i === n - 1, mentorOnly: false, state: 'todo' })
    if (mentor && r > 1) out.push({ missionId: `${r}-m`, rung: r, slot: 6, boss: false, mentorOnly: true, state: 'todo' })
  }
  return out.filter((s) => s.rung <= unlockedUpTo)
}

function cfg(unlockedUpTo: Rung): WorldConfig {
  const unlocked = { 1: true, 2: false, 3: false, 4: false, 5: false } as Record<Rung, boolean>
  for (const r of RUNGS) unlocked[r] = r <= unlockedUpTo
  return { slots: slotsFor(unlockedUpTo), unlocked, currentRung: unlockedUpTo }
}

describe('OfficeWorld layout', () => {
  it('keeps every mission chair reachable from the spawn point on every unlock level', () => {
    for (const upTo of RUNGS) {
      const world = new OfficeWorld(cfg(upTo), () => {})
      const walk = (x: number, y: number) => !world.isBlocked(x, y)
      for (const s of cfg(upTo).slots) {
        const slot = deskSlots(s.rung)[s.slot]
        const chair = { x: slot.chairX, y: slot.y - 1 }
        const path = findPath(MAP_W, MAP_H, walk, SPAWN, chair)
        expect(path, `rung ${s.rung} slot ${s.slot} unreachable with rungs <= ${upTo} unlocked`).not.toBeNull()
      }
    }
  })

  it('blocks locked floors and their doors', () => {
    const world = new OfficeWorld(cfg(1), () => {})
    const top2 = zoneTop(2)
    expect(world.isBlocked(5, top2 + 4)).toBe(true)
    // Door out of rung 1 (north wall of zone 1) is shut while rung 2 is locked.
    const top1 = zoneTop(1)
    expect(world.isBlocked(5, top1)).toBe(true)
    expect(world.isBlocked(5, top1 + 1)).toBe(true)
    const open = new OfficeWorld(cfg(2), () => {})
    expect(open.isBlocked(5, top1)).toBe(false)
    expect(open.isBlocked(5, top1 + 1)).toBe(false)
  })

  it('tapping a locked floor reports the lock instead of walking', () => {
    const events: string[] = []
    const world = new OfficeWorld(cfg(1), (e) => events.push(e.kind))
    world.tap({ x: 5, y: zoneTop(2) + 4 })
    expect(events).toEqual(['locked'])
  })

  it('the elevator arrival walks the player from the elevator to spawn and then unlocks input', () => {
    const events: string[] = []
    const world = new OfficeWorld(cfg(1), (e) => events.push(e.kind), { arrive: true })
    world.viewH = 200
    expect(world.arriving).toBe(true)
    for (let i = 0; i < 3000 && world.arriving; i++) world.tick()
    expect(world.arriving).toBe(false)
    expect(events).toContain('arrived')
    expect(world.playerTile).toEqual(SPAWN)
  })

  it('a tap during the arrival skips the cutscene and is then handled', () => {
    const events: string[] = []
    const world = new OfficeWorld(cfg(1), (e) => events.push(e.kind), { arrive: true })
    world.viewH = 200
    world.tick()
    world.tap({ x: 1, y: zoneTop(1) + 3 })
    expect(world.arriving).toBe(false)
    expect(events[0]).toBe('arrived')
    expect(events).toContain('move')
    expect(world.playerTile).toEqual(SPAWN)
  })

  it('tapping the desk you are already seated at opens its card without a move event', () => {
    const events: string[] = []
    const world = new OfficeWorld(cfg(1), (e) => events.push(e.kind === 'arrive' ? `arrive:${e.missionId}` : e.kind))
    world.seatPlayerAt('1-1')
    const slot = deskSlots(1)[1]
    world.tap({ x: slot.x, y: slot.y })
    expect(events).toEqual(['arrive:1-1'])
  })

  it('sitting at a boss desk fires the mission after the MD walks over (or times out)', () => {
    const events: string[] = []
    const world = new OfficeWorld(cfg(1), (e) => events.push(e.kind === 'arrive' ? `arrive:${e.missionId}` : e.kind))
    const boss = deskSlots(1)[4] // rung 1 has 5 missions; the boss is index 4
    world.tap({ x: boss.x, y: boss.y })
    let ticksToArrive = 0
    for (let i = 0; i < 4000 && !events.some((e) => e.startsWith('arrive')); i++) {
      world.tick()
      ticksToArrive++
    }
    expect(events).toContain('arrive:1-4')
    expect(ticksToArrive).toBeLessThan(4000)
  })

  it('tapping a desk paths to its chair and arriving fires the mission', () => {
    const events: string[] = []
    const world = new OfficeWorld(cfg(1), (e) => events.push(e.kind === 'arrive' ? `arrive:${e.missionId}` : e.kind))
    const slot = deskSlots(1)[0]
    world.tap({ x: slot.x, y: slot.y })
    for (let i = 0; i < 2000 && !events.some((e) => e.startsWith('arrive')); i++) world.tick()
    expect(events).toContain('arrive:1-0')
    expect(world.playerTile).toEqual({ x: slot.chairX, y: slot.y - 1 })
  })
})
