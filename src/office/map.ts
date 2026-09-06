import type { Rung } from '../engine/types'
import type { Sprite } from '../pixel/sprite'
import * as T from '../pixel/sprites/tiles'

/**
 * The office is one tall floor plan, 11 tiles wide, five zones stacked
 * from the intern bullpen at the bottom to the executive floor at the top.
 * Each zone is 9 rows: two rows of wall face (the north wall, seen from
 * the south like Game Dev Story) and seven rows of floor. A door in the
 * wall at column 5 leads north to the next rung's zone and is roped off
 * until that rung is unlocked.
 *
 * Zone rows, relative to the zone's top row:
 *   +0, +1  wall (the door sits in +0/+1 of the zone BELOW the one it opens onto)
 *   +2      chair row A (also tall decorations at x=0 and x=10)
 *   +3      desk row A
 *   +4      walkway
 *   +5      chair row B
 *   +6      desk row B
 *   +7      walkway
 *   +8      corridor; the door to the zone above is at (5, top-1)... see doorTiles
 */
export const TILE = 16
export const MAP_W = 11
export const ZONE_ROWS = 9
export const MAP_H = ZONE_ROWS * 5
export const DOOR_X = 5

export function zoneTop(rung: Rung): number {
  return (5 - rung) * ZONE_ROWS
}

export function rungAtRow(y: number): Rung {
  const r = 5 - Math.floor(y / ZONE_ROWS)
  return Math.max(1, Math.min(5, r)) as Rung
}

/** The two wall tiles that form the doorway north out of `rung`'s zone (into rung+1). */
export function doorTiles(rung: Rung): { x: number; y: number }[] {
  if (rung === 5) return []
  const top = zoneTop(rung)
  return [
    { x: DOOR_X, y: top },
    { x: DOOR_X, y: top + 1 },
  ]
}

/** Desk slot: top-left tile of a 2-wide desk; the chair is north of `chairX`. */
export interface DeskSlot {
  x: number
  y: number
  /** Column the chair sits in (usually x). */
  chairX: number
  /** Executive desk (3x2) for the capstone. */
  exec?: boolean
}

/**
 * Slots per zone in mission order. Desks sit at columns 1-2, 3-4, 6-7 and
 * 8-9 so column 5 stays a clear corridor under the door. Index 6 is
 * reserved for the mentor mission; index 7 is a spare. On the executive
 * floor the capstone (index 5) gets the big desk.
 */
export function deskSlots(rung: Rung): DeskSlot[] {
  const top = zoneTop(rung)
  const a = top + 3
  const b = top + 6
  if (rung === 5) {
    return [
      { x: 1, y: a, chairX: 1 },
      { x: 3, y: a, chairX: 3 },
      { x: 6, y: a, chairX: 6 },
      { x: 8, y: a, chairX: 8 },
      { x: 1, y: b, chairX: 1 },
      { x: 6, y: b, chairX: 7, exec: true },
      { x: 3, y: b, chairX: 3 },
    ]
  }
  return [
    { x: 1, y: a, chairX: 1 },
    { x: 3, y: a, chairX: 3 },
    { x: 6, y: a, chairX: 6 },
    { x: 8, y: a, chairX: 8 },
    { x: 1, y: b, chairX: 1 },
    { x: 3, y: b, chairX: 3 },
    { x: 6, y: b, chairX: 6 },
    { x: 8, y: b, chairX: 8 },
  ]
}

export interface Furniture {
  sprite: Sprite
  /** Top-left tile. */
  x: number
  y: number
  /** Rows (from the bottom of the sprite) that block walking. Default: all. */
  blockRows?: number
  /** Draw in the static wall layer (no y-sort), e.g. wall-mounted boards. */
  onWall?: boolean
}

export interface ZoneDecor {
  floor: (x: number, y: number) => Sprite
  /** Lower wall row tiles by column (defaults to plain WALL_TOP). */
  wallLower: Partial<Record<number, Sprite>>
  furniture: Furniture[]
}

const WALL_UPPER: Sprite = { name: 'wall-upper', frames: [Array.from({ length: 16 }, () => 'w'.repeat(16))] }
export { WALL_UPPER }

function rugSprite(rx: number, ry: number, w: number, h: number): Sprite {
  const n = ry === 0
  const s = ry === h - 1
  const wst = rx === 0
  const e = rx === w - 1
  if (n && wst) return T.FLOOR_RUG_CORNER_NW
  if (n && e) return T.FLOOR_RUG_CORNER_NE
  if (s && wst) return T.FLOOR_RUG_CORNER_SW
  if (s && e) return T.FLOOR_RUG_CORNER_SE
  if (n) return T.FLOOR_RUG_EDGE_N
  if (s) return T.FLOOR_RUG_EDGE_S
  if (wst) return T.FLOOR_RUG_EDGE_W
  if (e) return T.FLOOR_RUG_EDGE_E
  return T.FLOOR_RUG_CENTER
}

export function zoneDecor(rung: Rung): ZoneDecor {
  const top = zoneTop(rung)
  const corridor = top + 8
  switch (rung) {
    case 1:
      return {
        floor: (x, y) => ((x + y) % 2 === 0 ? T.FLOOR_TILE : T.FLOOR_TILE),
        wallLower: { 1: T.WALL_TOP_CLOCK, 3: T.WALL_TOP_CHART, 7: T.WALL_TOP_WINDOW, 8: T.WALL_TOP_WINDOW },
        furniture: [
          { sprite: T.ELEVATOR, x: 9, y: top, blockRows: 0, onWall: true },
          { sprite: T.DOOR_MAT, x: 9, y: top + 2, blockRows: 0 },
          { sprite: T.WATER_COOLER, x: 0, y: top + 1, blockRows: 1 },
          { sprite: T.PRINTER, x: 0, y: corridor },
          { sprite: T.TRASH_CAN, x: 10, y: top + 4 },
          { sprite: T.VENDING_MACHINE, x: 10, y: corridor - 1 },
          { sprite: T.PAPER_STACK, x: 3, y: top + 4 },
        ],
      }
    case 2:
      return {
        floor: (x, y) => ((x * 7 + y * 3) % 5 === 0 ? T.FLOOR_CARPET_ALT : T.FLOOR_CARPET),
        wallLower: { 2: T.WALL_TOP_WINDOW, 3: T.WALL_TOP_WINDOW, 8: T.WALL_TOP_CHART, 9: T.WALL_TOP_CLOCK },
        furniture: [
          { sprite: T.TICKER, x: 6, y: top, blockRows: 0, onWall: true },
          { sprite: T.WHITEBOARD, x: 0, y: top, blockRows: 0, onWall: true },
          { sprite: T.COFFEE_MACHINE, x: 0, y: top + 1, blockRows: 1 },
          { sprite: T.PLANT, x: 10, y: top + 1, blockRows: 1 },
          { sprite: T.FILING_CABINET, x: 0, y: corridor - 1 },
          { sprite: T.TRASH_CAN, x: 10, y: corridor },
        ],
      }
    case 3:
      return {
        floor: (x, y) => ((x * 3 + y) % 7 === 0 ? T.FLOOR_BEIGE : T.FLOOR_BEIGE),
        wallLower: { 1: T.WALL_TOP_CERT, 2: T.WALL_TOP_CHART, 7: T.WALL_TOP_WINDOW, 8: T.WALL_TOP_WINDOW, 9: T.WALL_TOP_WINDOW },
        furniture: [
          { sprite: T.WHITEBOARD, x: 3, y: top, blockRows: 0, onWall: true },
          { sprite: T.BOOKSHELF, x: 0, y: top + 1, blockRows: 1 },
          { sprite: T.PLANT, x: 10, y: top + 1, blockRows: 1 },
          { sprite: T.SOFA, x: 0, y: corridor, blockRows: 1 },
          { sprite: T.PRINTER, x: 10, y: corridor },
          { sprite: T.FAX, x: 10, y: top + 4 },
        ],
      }
    case 4:
      return {
        floor: () => T.FLOOR_WOOD,
        wallLower: { 0: T.WALL_TOP_WINDOW, 1: T.WALL_TOP_WINDOW, 2: T.WALL_TOP_WINDOW, 8: T.WALL_TOP_LOGO, 9: T.WALL_TOP_CLOCK },
        furniture: [
          { sprite: T.WHITEBOARD, x: 6, y: top, blockRows: 0, onWall: true },
          { sprite: T.PLANT, x: 0, y: top + 1, blockRows: 1 },
          { sprite: T.FILING_CABINET, x: 10, y: top + 1, blockRows: 1 },
          { sprite: T.WATER_COOLER, x: 0, y: corridor - 1 },
          { sprite: T.PLANT, x: 10, y: corridor - 1 },
          { sprite: T.PAPER_STACK, x: 3, y: top + 7 },
        ],
      }
    case 5: {
      const rugX = 6
      const rugY = top + 4
      const rugW = 5
      const rugH = 4
      return {
        floor: (x, y) => {
          if (x >= rugX && x < rugX + rugW && y >= rugY && y < rugY + rugH) return rugSprite(x - rugX, y - rugY, rugW, rugH)
          return T.FLOOR_MARBLE
        },
        wallLower: {
          0: T.WALL_TOP_WINDOW, 1: T.WALL_TOP_WINDOW, 2: T.WALL_TOP_WINDOW, 3: T.WALL_TOP_WINDOW,
          5: T.WALL_TOP_LOGO, 7: T.WALL_TOP_WINDOW, 8: T.WALL_TOP_WINDOW, 9: T.WALL_TOP_WINDOW, 10: T.WALL_TOP_WINDOW,
        },
        furniture: [
          { sprite: T.TROPHY_CASE, x: 9, y: top, blockRows: 1 },
          { sprite: T.BOOKSHELF, x: 0, y: top + 1, blockRows: 1 },
          { sprite: T.PLANT, x: 10, y: top + 4 },
          { sprite: T.SOFA, x: 0, y: corridor, blockRows: 1 },
          { sprite: T.PLANT, x: 3, y: corridor - 1 },
          { sprite: T.COFFEE_MACHINE, x: 10, y: corridor - 1 },
        ],
      }
    }
  }
}

/** Where a fresh player stands: in front of the elevator on the intern floor. */
export const SPAWN = { x: 5, y: zoneTop(1) + 4 }
/** Inside the intern-floor elevator; the arrival sequence walks from here to SPAWN. */
export const ELEVATOR_TILE = { x: 9, y: zoneTop(1) + 1 }
export const ELEVATOR_DRAW = { x: 9, y: zoneTop(1) }
