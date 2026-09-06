import type { Rung } from '../engine/types'
import { drawSprite, frameAt, mirror, spriteHeight, spriteWidth, type Sprite } from '../pixel/sprite'
import type { CharacterSet } from '../pixel/sprites/characters'
import { CHARACTERS } from '../pixel/sprites/characters'
import * as T from '../pixel/sprites/tiles'
import { ICON_BOSS, ICON_CHECK, ICON_DOC, ICON_MENTOR, ICON_TROPHY } from '../pixel/sprites/icons'
import { deskSlots, doorTiles, MAP_H, MAP_W, rungAtRow, SPAWN, TILE, WALL_UPPER, zoneDecor, zoneTop, type DeskSlot, type Furniture } from './map'
import { findPath, nearestWalkable, type Tile } from './pathfind'

export type SlotState = 'todo' | 'started' | 'passed' | 'perfect'

export interface MissionSlot {
  missionId: string
  rung: Rung
  /** Index into deskSlots(rung). */
  slot: number
  boss: boolean
  mentorOnly: boolean
  state: SlotState
}

export interface WorldConfig {
  slots: MissionSlot[]
  /** Which rungs the player may walk into. Rung 1 is always true. */
  unlocked: Record<Rung, boolean>
  /** Highest unlocked rung; the MD hangs around here. */
  currentRung: Rung
}

export type WorldEvent =
  | { kind: 'arrive'; missionId: string }
  | { kind: 'npc'; npc: string; x: number; y: number }
  | { kind: 'locked'; rung: Rung }
  | { kind: 'move' }

type Dir = 'down' | 'up' | 'left' | 'right'

interface Entity {
  id: string
  set: CharacterSet
  /** Pixel position of the tile the feet are on (top-left of tile), 1x. */
  px: number
  py: number
  tile: Tile
  dir: Dir
  path: Tile[]
  moving: boolean
  sitting: boolean
  /** Ticks until the NPC picks a new wander target. */
  idle: number
  /** Restrict wandering to this zone. */
  zone?: Rung
  /** Shows a bubble icon over the head for a while (ticks). */
  emote?: { sprite: Sprite; until: number }
  isPlayer?: boolean
}

const SPEED = 1.4
let savedPlayer: { tile: Tile; dir: Dir } | null = null

/** Remember where the player stood so returning from a mission does not teleport. */
export function rememberPlayerAt(tile: Tile, dir: Dir = 'down') {
  savedPlayer = { tile, dir }
}

function desksFor(slots: MissionSlot[], rung: Rung): { slot: DeskSlot; mission: MissionSlot | null }[] {
  const defs = deskSlots(rung)
  return defs.map((slot, i) => ({ slot, mission: slots.find((m) => m.rung === rung && m.slot === i) ?? null }))
}

const NPC_QUIPS: Record<string, string[]> = {
  md: ['pls fix.', 'Why is this not on my desk yet?', 'Is it bonus season? No. Get back to work.', 'I read your model. I have notes. All of them.'],
  hr: ['Remember: we are a family here.', 'Your performance review is... scheduled.', 'Have you done the compliance training?'],
  analystA: ['Third all-nighter this week. Living the dream.', 'The MD wants it in 12-point Garamond now.', 'Have you seen the printer? It hates me.'],
  analystB: ['Did you align the logos on page 47?', 'EBITDA is just a vibe, honestly.', 'Coffee machine is out again.'],
  associate: ['The client wants a football field by 9am.', 'Never trust a peer set you did not pick.', 'VP says "circle back". Again.'],
}

export function quipFor(npc: string, seed: number): string {
  const q = NPC_QUIPS[npc] ?? ['...']
  return q[seed % q.length]
}

/**
 * The office simulation. Owns entities, camera, and drawing. React only
 * talks to it through `configure`, `tap`, `tick`, `draw` and the event
 * callback, so the render loop never touches React state.
 */
export class OfficeWorld {
  private cfg: WorldConfig
  private player: Entity
  private npcs: Entity[] = []
  private tick_ = 0
  private staticLayer: HTMLCanvasElement | null = null
  private blocked = new Uint8Array(MAP_W * MAP_H)
  private furniture: Furniture[] = []
  private desks: { rung: Rung; slot: DeskSlot; mission: MissionSlot | null }[] = []
  /** Camera top in 1x pixels. */
  camY = 0
  private pendingArrive: string | null = null
  private onEvent: (e: WorldEvent) => void
  /** Viewport height in 1x pixels; set by the canvas wrapper. */
  viewH = 200
  /** Last emote seed so quips rotate. */
  private quipSeed = 0

  constructor(cfg: WorldConfig, onEvent: (e: WorldEvent) => void) {
    this.cfg = cfg
    this.onEvent = onEvent
    const start = savedPlayer ?? { tile: SPAWN, dir: 'down' as Dir }
    this.player = this.makeEntity('player', CHARACTERS.player, start.tile, start.dir)
    this.player.isPlayer = true
    this.configure(cfg)
    this.camY = Math.max(0, this.player.py - this.viewH / 2)
  }

  private makeEntity(id: string, set: CharacterSet, tile: Tile, dir: Dir = 'down', zone?: Rung): Entity {
    return { id, set, px: tile.x * TILE, py: tile.y * TILE, tile: { ...tile }, dir, path: [], moving: false, sitting: false, idle: 60, zone }
  }

  configure(cfg: WorldConfig) {
    this.cfg = cfg
    this.blocked.fill(0)
    this.furniture = []
    this.desks = []
    this.staticLayer = null

    for (let rung = 1 as Rung; rung <= 5; rung = (rung + 1) as Rung) {
      const top = zoneTop(rung)
      // Walls block (door tiles are opened below).
      for (let x = 0; x < MAP_W; x++) {
        this.block(x, top)
        this.block(x, top + 1)
      }
      const decor = zoneDecor(rung)
      for (const f of decor.furniture) this.addFurniture(f)
      desksFor(cfg.slots, rung).forEach(({ slot, mission }, i) => {
        // Slots 0-5 always exist (spares get a coworker or sit empty);
        // the mentor/spare slots only appear when a mission occupies them.
        if (!mission && i >= 6) return
        const deskSprite = slot.exec ? T.DESK_EXEC : T.DESK
        this.addFurniture({ sprite: deskSprite, x: slot.x, y: slot.y })
        this.desks.push({ rung, slot, mission })
      })
      // Door north of this zone, into rung+1.
      if (rung < 5) {
        const open = cfg.unlocked[(rung + 1) as Rung]
        for (const d of doorTiles(rung)) if (open) this.unblock(d.x, d.y)
        if (!open) {
          // Drawn over the closed door in the wall row so the floor stays walkable.
          this.addFurniture({ sprite: T.ROPE_BARRIER, x: 5, y: top + 1 })
          this.addFurniture({ sprite: T.LOCK_SIGN, x: 4, y: top + 1 })
        }
      }
      // Locked zones are fully blocked.
      if (!cfg.unlocked[rung]) {
        for (let y = top; y < top + 9; y++) for (let x = 0; x < MAP_W; x++) this.block(x, y)
      }
    }
    // Player must stand somewhere walkable.
    if (this.isBlocked(this.player.tile.x, this.player.tile.y)) {
      const t = nearestWalkable(MAP_W, MAP_H, (x, y) => !this.isBlocked(x, y), this.player.tile, 6) ?? SPAWN
      this.player.tile = { ...t }
      this.player.px = t.x * TILE
      this.player.py = t.y * TILE
      this.player.path = []
    }
    this.spawnNpcs()
  }

  private spawnNpcs() {
    const c = this.cfg
    const keep = new Map(this.npcs.map((n) => [n.id, n]))
    const want: { id: string; set: CharacterSet; zone: Rung; sitAt?: Tile }[] = []
    // MD roams the current floor; HR the intern floor; others fill unlocked floors.
    want.push({ id: 'md', set: CHARACTERS.md, zone: c.currentRung })
    want.push({ id: 'hr', set: CHARACTERS.hr, zone: 1 })
    if (c.unlocked[2]) want.push({ id: 'analystB', set: CHARACTERS.analystB, zone: 2 })
    if (c.unlocked[3]) want.push({ id: 'associate', set: CHARACTERS.associate, zone: 3 })
    // A seated coworker at the first spare desk of the intern floor.
    const spare = this.desks.find((d) => d.rung === 1 && !d.mission)
    want.push({ id: 'analystA', set: CHARACTERS.analystA, zone: 1, sitAt: spare ? { x: spare.slot.chairX, y: spare.slot.y - 1 } : undefined })

    this.npcs = want.map((w) => {
      const existing = keep.get(w.id)
      if (existing && existing.zone === w.zone && !this.isBlocked(existing.tile.x, existing.tile.y)) return existing
      const tile = w.sitAt ?? this.randomTileIn(w.zone) ?? SPAWN
      const e = this.makeEntity(w.id, w.set, tile, 'down', w.zone)
      if (w.sitAt) e.sitting = true
      e.idle = 30 + Math.floor(Math.random() * 120)
      return e
    })
  }

  private addFurniture(f: Furniture) {
    this.furniture.push(f)
    const w = Math.ceil(spriteWidth(f.sprite) / TILE)
    const h = Math.ceil(spriteHeight(f.sprite) / TILE)
    const rows = f.blockRows ?? h
    for (let dy = h - rows; dy < h; dy++) for (let dx = 0; dx < w; dx++) this.block(f.x + dx, f.y + dy)
  }

  private block(x: number, y: number) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return
    this.blocked[y * MAP_W + x] = 1
  }
  private unblock(x: number, y: number) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return
    this.blocked[y * MAP_W + x] = 0
  }
  isBlocked(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return true
    return this.blocked[y * MAP_W + x] === 1
  }

  private randomTileIn(rung: Rung): Tile | null {
    const top = zoneTop(rung)
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(Math.random() * MAP_W)
      const y = top + 2 + Math.floor(Math.random() * 7)
      if (!this.isBlocked(x, y) && !this.deskAtChair(x, y)) return { x, y }
    }
    return null
  }

  private deskAtChair(x: number, y: number) {
    return this.desks.find((d) => d.slot.chairX === x && d.slot.y - 1 === y) ?? null
  }

  private deskAt(x: number, y: number) {
    return this.desks.find((d) => {
      const w = d.slot.exec ? 3 : 2
      const h = d.slot.exec ? 2 : 1
      return x >= d.slot.x && x < d.slot.x + w && y >= d.slot.y && y < d.slot.y + h
    }) ?? this.deskAtChair(x, y)
  }

  get playerTile(): Tile {
    return this.player.tile
  }

  /** Screen-space (1x) position of the top of an entity, for DOM bubbles. */
  entityScreenPos(id: string): { x: number; y: number } | null {
    const e = id === 'player' ? this.player : this.npcs.find((n) => n.id === id)
    if (!e) return null
    return { x: e.px + TILE / 2, y: e.py - 6 - this.camY }
  }

  /** Walk to the chair of a mission's desk (used after finishing a mission). */
  seatPlayerAt(missionId: string) {
    const d = this.desks.find((x) => x.mission?.missionId === missionId)
    if (!d) return
    const t = { x: d.slot.chairX, y: d.slot.y - 1 }
    this.player.tile = { ...t }
    this.player.px = t.x * TILE
    this.player.py = t.y * TILE
    this.player.path = []
    this.player.sitting = true
    this.player.dir = 'down'
    this.camY = Math.max(0, this.player.py - this.viewH / 2)
  }

  /** Handle a tap at a tile. */
  tap(tile: Tile) {
    const p = this.player
    // NPC?
    const npc = this.npcs.find((n) => n.tile.x === tile.x && n.tile.y === tile.y)
    if (npc) {
      this.quipSeed++
      npc.emote = { sprite: ICON_DOC, until: this.tick_ + 90 }
      npc.dir = p.tile.y < npc.tile.y ? 'up' : p.tile.y > npc.tile.y ? 'down' : p.tile.x < npc.tile.x ? 'left' : 'right'
      const pos = this.entityScreenPos(npc.id)!
      this.onEvent({ kind: 'npc', npc: npc.id, x: pos.x, y: pos.y })
      return
    }
    const rung = rungAtRow(tile.y)
    if (!this.cfg.unlocked[rung]) {
      this.onEvent({ kind: 'locked', rung })
      return
    }
    // Rope barrier / door of a locked zone above?
    const top = zoneTop(rung)
    if (rung < 5 && !this.cfg.unlocked[(rung + 1) as Rung] && tile.y <= top + 1 && (tile.x === 4 || tile.x === 5)) {
      this.onEvent({ kind: 'locked', rung: (rung + 1) as Rung })
      return
    }
    const desk = this.deskAt(tile.x, tile.y)
    let goal: Tile | null
    if (desk) {
      goal = { x: desk.slot.chairX, y: desk.slot.y - 1 }
      this.pendingArrive = desk.mission?.missionId ?? null
    } else {
      goal = nearestWalkable(MAP_W, MAP_H, (x, y) => !this.isBlocked(x, y), tile, 2)
      this.pendingArrive = null
    }
    if (!goal) return
    const from = p.moving && p.path.length ? p.path[0] : p.tile
    const path = findPath(MAP_W, MAP_H, (x, y) => !this.isBlocked(x, y), from, goal)
    if (!path) return
    p.path = p.moving && p.path.length ? [p.path[0], ...path] : path
    p.sitting = false
    if (p.path.length === 0) this.arrive()
    this.onEvent({ kind: 'move' })
  }

  /** Keyboard nudge one tile in a direction. */
  nudge(dir: Dir) {
    const p = this.player
    if (p.moving) return
    const d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[dir]
    const t = { x: p.tile.x + d[0], y: p.tile.y + d[1] }
    p.dir = dir
    p.sitting = false
    if (this.isBlocked(t.x, t.y)) {
      const r = rungAtRow(t.y)
      if (!this.cfg.unlocked[r]) this.onEvent({ kind: 'locked', rung: r })
      return
    }
    p.path = [t]
    const desk = this.deskAtChair(t.x, t.y)
    this.pendingArrive = desk?.mission?.missionId ?? null
  }

  private arrive() {
    const p = this.player
    const desk = this.deskAtChair(p.tile.x, p.tile.y)
    if (desk) {
      p.sitting = true
      p.dir = 'down'
    }
    if (this.pendingArrive) {
      const id = this.pendingArrive
      this.pendingArrive = null
      rememberPlayerAt(p.tile, p.dir)
      this.onEvent({ kind: 'arrive', missionId: id })
    }
  }

  tick() {
    this.tick_++
    this.step(this.player, true)
    for (const n of this.npcs) this.wander(n)
    // Camera follows the player with a little lag; clamp to the map.
    const target = Math.max(0, Math.min(MAP_H * TILE - this.viewH, this.player.py - this.viewH / 2 + TILE))
    this.camY += (target - this.camY) * 0.12
    if (Math.abs(target - this.camY) < 0.3) this.camY = target
  }

  private wander(n: Entity) {
    if (n.sitting && n.path.length === 0) return
    if (n.path.length === 0) {
      if (n.idle-- > 0) return
      n.idle = 90 + Math.floor(Math.random() * 240)
      if (n.zone === undefined) return
      const t = this.randomTileIn(n.zone)
      if (!t) return
      const path = findPath(MAP_W, MAP_H, (x, y) => !this.isBlocked(x, y) && !this.occupiedByOther(x, y, n), n.tile, t)
      if (path && path.length < 14) n.path = path
      return
    }
    this.step(n, false)
  }

  private occupiedByOther(x: number, y: number, self: Entity) {
    if (this.player !== self && this.player.tile.x === x && this.player.tile.y === y) return true
    return this.npcs.some((o) => o !== self && o.tile.x === x && o.tile.y === y)
  }

  private step(e: Entity, isPlayer: boolean) {
    if (e.path.length === 0) {
      e.moving = false
      return
    }
    const next = e.path[0]
    if (isPlayer && this.isBlocked(next.x, next.y)) {
      e.path = []
      e.moving = false
      return
    }
    const tx = next.x * TILE
    const ty = next.y * TILE
    const dx = tx - e.px
    const dy = ty - e.py
    if (Math.abs(dx) > 0.01) e.dir = dx > 0 ? 'right' : 'left'
    else if (Math.abs(dy) > 0.01) e.dir = dy > 0 ? 'down' : 'up'
    const dist = Math.hypot(dx, dy)
    e.moving = true
    if (dist <= SPEED) {
      e.px = tx
      e.py = ty
      e.tile = { x: next.x, y: next.y }
      e.path.shift()
      if (e.path.length === 0) {
        e.moving = false
        if (isPlayer) this.arrive()
      }
    } else {
      e.px += (dx / dist) * SPEED
      e.py += (dy / dist) * SPEED
    }
  }

  private buildStatic(): HTMLCanvasElement {
    const c = document.createElement('canvas')
    c.width = MAP_W * TILE
    c.height = MAP_H * TILE
    const ctx = c.getContext('2d')!
    for (let rung = 1 as Rung; rung <= 5; rung = (rung + 1) as Rung) {
      const top = zoneTop(rung)
      const decor = zoneDecor(rung)
      for (let x = 0; x < MAP_W; x++) {
        drawSprite(ctx, WALL_UPPER, x * TILE, top * TILE)
        const lower = decor.wallLower[x] ?? T.WALL_TOP
        drawSprite(ctx, lower, x * TILE, (top + 1) * TILE)
        for (let y = top + 2; y < top + 9; y++) drawSprite(ctx, decor.floor(x, y), x * TILE, y * TILE)
      }
      if (rung < 5) {
        for (const d of doorTiles(rung)) drawSprite(ctx, d.y === top ? WALL_UPPER : T.WALL_TOP_DOOR, d.x * TILE, d.y * TILE)
      }
      for (const f of decor.furniture) if (f.onWall) drawSprite(ctx, f.sprite, f.x * TILE, f.y * TILE)
    }
    return c
  }

  /** Draw the world into a canvas at integer `scale`; the camera is applied here. */
  draw(ctx: CanvasRenderingContext2D, scale: number, viewW: number, viewH: number) {
    if (!this.staticLayer) this.staticLayer = this.buildStatic()
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#1b1a2e'
    ctx.fillRect(0, 0, viewW, viewH)
    const camY = Math.round(this.camY)
    const offX = Math.floor((viewW - MAP_W * TILE * scale) / 2)
    ctx.save()
    ctx.translate(offX, 0)
    ctx.drawImage(this.staticLayer, 0, camY, MAP_W * TILE, Math.ceil(viewH / scale), 0, 0, MAP_W * TILE * scale, Math.ceil(viewH / scale) * scale)

    // Dynamic layer: furniture, monitors, chairs, characters, y-sorted.
    type Item = { y: number; draw: () => void }
    const items: Item[] = []
    const t = this.tick_
    const visible = (py: number, h: number) => py + h >= camY && py <= camY + viewH / scale

    for (const f of this.furniture) {
      if (f.onWall) continue
      const h = spriteHeight(f.sprite)
      const py = f.y * TILE
      if (!visible(py, h)) continue
      const bottom = py + h
      items.push({ y: bottom, draw: () => drawSprite(ctx, f.sprite, f.x * TILE * scale, (py - camY) * scale, scale, frameAt(f.sprite, t)) })
    }
    for (const d of this.desks) {
      const chair = { x: d.slot.chairX, y: d.slot.y - 1 }
      const cpy = chair.y * TILE
      if (!visible(cpy, 40)) continue
      const chairSprite = d.rung === 5 ? T.CHAIR_LEATHER : T.CHAIR
      items.push({ y: cpy + TILE - 2, draw: () => drawSprite(ctx, chairSprite, chair.x * TILE * scale, (cpy - camY) * scale, scale) })
      // Monitor on the desk: on when the mission has been attempted.
      const m = d.mission
      const on = m ? m.state !== 'todo' : true
      const mon = on ? T.MONITOR_ON : T.MONITOR_OFF
      const mx = d.slot.x * TILE + (d.slot.exec ? 16 : 8)
      const my = d.slot.y * TILE - 9
      items.push({ y: d.slot.y * TILE + TILE + 1, draw: () => drawSprite(ctx, mon, mx * scale, (my - camY) * scale, scale, frameAt(mon, t)) })
      // Status icon floating above the desk.
      if (m) {
        const icon = m.state === 'perfect' ? ICON_TROPHY : m.state === 'passed' ? ICON_CHECK : m.mentorOnly ? ICON_MENTOR : m.boss ? ICON_BOSS : ICON_DOC
        const bob = m.state === 'todo' || m.state === 'started' ? Math.round(Math.sin(t / 12) * 2) : 0
        const ix = d.slot.x * TILE + (d.slot.exec ? 16 : 8)
        const iy = d.slot.y * TILE - 26 + bob
        items.push({ y: 1e6, draw: () => drawSprite(ctx, icon, ix * scale, (iy - camY) * scale, scale) })
      }
    }
    const all = [...this.npcs, this.player]
    for (const e of all) {
      if (!visible(e.py, 24)) continue
      items.push({ y: e.py + TILE + (e.sitting ? 3 : 0), draw: () => this.drawEntity(ctx, e, scale, camY, t) })
    }
    items.sort((a, b) => a.y - b.y)
    for (const it of items) it.draw()

    // Dim locked zones.
    for (let rung = 1 as Rung; rung <= 5; rung = (rung + 1) as Rung) {
      if (this.cfg.unlocked[rung]) continue
      const top = zoneTop(rung) * TILE
      ctx.fillStyle = 'rgba(12, 10, 30, 0.62)'
      ctx.fillRect(0, (top - camY) * scale, MAP_W * TILE * scale, 9 * TILE * scale)
    }
    ctx.restore()
  }

  private drawEntity(ctx: CanvasRenderingContext2D, e: Entity, scale: number, camY: number, t: number) {
    const sx = e.px * scale
    const baseY = e.py - camY
    if (!e.sitting) drawSprite(ctx, T.SHADOW, sx, (baseY + TILE - 6) * scale, scale)
    let sprite: Sprite
    let frame = 0
    if (e.sitting) {
      sprite = e.set.sit
      frame = frameAt(sprite, t + e.id.length * 7)
    } else {
      sprite = e.dir === 'right' ? this.mirrored(e.set) : e.set[e.dir === 'down' ? 'down' : e.dir === 'up' ? 'up' : 'left']
      if (e.moving) {
        const cycle = [1, 0, 2, 0]
        frame = cycle[Math.floor(t / 7) % 4]
      }
    }
    const h = spriteHeight(sprite)
    const dy = e.sitting ? 4 : 0
    drawSprite(ctx, sprite, sx, (baseY + TILE - h + dy) * scale, scale, frame)
    if (e.emote && e.emote.until > t) {
      const bob = Math.round(Math.sin(t / 6) * 1)
      drawSprite(ctx, e.emote.sprite, sx, (baseY - 20 + bob) * scale, scale)
    }
  }

  private mirrorCache = new WeakMap<CharacterSet, Sprite>()
  private mirrored(set: CharacterSet): Sprite {
    let m = this.mirrorCache.get(set)
    if (!m) {
      m = mirror(set.left)
      this.mirrorCache.set(set, m)
    }
    return m
  }

  /** Convert a canvas-space point (CSS px within the canvas) to a tile. */
  tileAt(cx: number, cy: number, scale: number, viewW: number): Tile {
    const offX = Math.floor((viewW - MAP_W * TILE * scale) / 2)
    const x = Math.floor((cx - offX) / (TILE * scale))
    const y = Math.floor((cy / scale + this.camY) / TILE)
    return { x, y }
  }

  /** Offset of the map's left edge inside the canvas, in CSS px. */
  offsetX(scale: number, viewW: number) {
    return Math.floor((viewW - MAP_W * TILE * scale) / 2)
  }
}
