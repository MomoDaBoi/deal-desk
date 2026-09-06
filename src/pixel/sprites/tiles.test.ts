import { describe, expect, it } from 'vitest'
import { spriteHeight, spriteWidth, validateSprite } from '../sprite'
import { TILES } from './tiles'

// Tiles that must tile seamlessly / opaquely: floor tiles and most wall
// tiles. WALL_SIDE_L / WALL_SIDE_R are deliberately mostly transparent
// (a thin wall edge over a shadow, meant to overlay a floor tile), so they
// are excluded from the "no transparency" check.
const OPAQUE_KEYS = [
  'floorCarpet',
  'floorCarpetAlt',
  'floorBeige',
  'floorTile',
  'floorWood',
  'floorMarble',
  'floorRugCenter',
  'floorRugEdgeN',
  'floorRugEdgeS',
  'floorRugEdgeE',
  'floorRugEdgeW',
  'floorRugCornerNw',
  'floorRugCornerNe',
  'floorRugCornerSw',
  'floorRugCornerSe',
  'wallTop',
  'wallTopWindow',
  'wallTopChart',
  'wallTopClock',
  'wallTopLogo',
  'wallTopCert',
  'wallTopDoor',
]

const TRANSPARENT_EXCEPTIONS = ['wallSideL', 'wallSideR']

const EXPECTED_SIZES: Record<string, { w: number; h: number }> = {
  // Floor & wall tiles default to 16x16; overridden below where different.
  desk: { w: 32, h: 16 },
  monitorOn: { w: 16, h: 16 },
  monitorOff: { w: 16, h: 16 },
  chair: { w: 16, h: 16 },
  chairLeather: { w: 16, h: 16 },
  deskExec: { w: 48, h: 32 },
  plant: { w: 16, h: 32 },
  waterCooler: { w: 16, h: 32 },
  coffeeMachine: { w: 16, h: 32 },
  printer: { w: 16, h: 16 },
  bookshelf: { w: 16, h: 32 },
  filingCabinet: { w: 16, h: 32 },
  whiteboard: { w: 32, h: 16 },
  ticker: { w: 48, h: 16 },
  vendingMachine: { w: 16, h: 32 },
  elevator: { w: 32, h: 32 },
  ropeBarrier: { w: 16, h: 16 },
  lockSign: { w: 16, h: 16 },
  trophyCase: { w: 32, h: 32 },
  sofa: { w: 32, h: 16 },
  trashCan: { w: 16, h: 16 },
  fax: { w: 16, h: 16 },
  doorMat: { w: 16, h: 16 },
  paperStack: { w: 16, h: 16 },
  shadow: { w: 16, h: 8 },
}

const EXPECTED_FRAMES: Record<string, number> = {
  monitorOn: 2,
  waterCooler: 2,
  coffeeMachine: 2,
  printer: 2,
  ticker: 3,
  elevator: 2,
  wallTopClock: 2,
}

const EXPECTED_FRAME_TICKS: Record<string, number> = {
  monitorOn: 20,
  waterCooler: 30,
  coffeeMachine: 16,
  printer: 40,
  ticker: 6,
  elevator: 45,
  wallTopClock: 60,
}

// Furniture must be outlined in K and have a transparent background, except
// the two sprites the spec explicitly calls out as flat / no outline.
const NO_OUTLINE_EXCEPTIONS = ['doorMat', 'shadow']
const FURNITURE_KEYS = Object.keys(TILES).filter((k) => !OPAQUE_KEYS.includes(k) && !TRANSPARENT_EXCEPTIONS.includes(k))

describe('TILES registry', () => {
  it('validates every sprite in TILES', () => {
    for (const [key, s] of Object.entries(TILES)) {
      expect(() => validateSprite(s), key).not.toThrow()
    }
  })

  it('has the exact size specified for every named sprite', () => {
    for (const [key, s] of Object.entries(TILES)) {
      const expected = EXPECTED_SIZES[key] ?? { w: 16, h: 16 }
      expect(spriteWidth(s), `${key} width`).toBe(expected.w)
      expect(spriteHeight(s), `${key} height`).toBe(expected.h)
    }
  })

  it('has no transparent pixels in floor and wall tiles (except the side-edge tiles)', () => {
    for (const key of OPAQUE_KEYS) {
      const s = TILES[key]
      expect(s, key).toBeDefined()
      for (const frame of s.frames) {
        for (const row of frame) {
          expect(row.includes('.'), `${key} contains '.'`).toBe(false)
        }
      }
    }
  })

  it('WALL_SIDE_L and WALL_SIDE_R are mostly transparent by design', () => {
    for (const key of TRANSPARENT_EXCEPTIONS) {
      const s = TILES[key]
      expect(s, key).toBeDefined()
      const hasTransparent = s.frames[0].some((row) => row.includes('.'))
      expect(hasTransparent, `${key} should contain transparent pixels`).toBe(true)
    }
  })

  it('has the stated frame counts for animated sprites', () => {
    for (const [key, count] of Object.entries(EXPECTED_FRAMES)) {
      const s = TILES[key]
      expect(s, key).toBeDefined()
      expect(s.frames.length, `${key} frame count`).toBe(count)
    }
  })

  it('non-animated sprites have exactly one frame', () => {
    for (const [key, s] of Object.entries(TILES)) {
      if (key in EXPECTED_FRAMES) continue
      expect(s.frames.length, `${key} frame count`).toBe(1)
    }
  })

  it('has the stated frameTicks for animated sprites', () => {
    for (const [key, ticks] of Object.entries(EXPECTED_FRAME_TICKS)) {
      const s = TILES[key]
      expect(s, key).toBeDefined()
      expect(s.frameTicks, `${key} frameTicks`).toBe(ticks)
    }
  })

  it('keeps identical frame size across all frames of a sprite', () => {
    for (const [key, s] of Object.entries(TILES)) {
      const w = spriteWidth(s)
      const h = spriteHeight(s)
      for (const frame of s.frames) {
        expect(frame.length, `${key} frame height`).toBe(h)
        for (const row of frame) {
          expect(row.length, `${key} row width`).toBe(w)
        }
      }
    }
  })

  it('furniture is outlined in K and has a transparent background', () => {
    for (const key of FURNITURE_KEYS) {
      const s = TILES[key]
      const flat = s.frames[0].join('')
      if (!NO_OUTLINE_EXCEPTIONS.includes(key)) {
        expect(flat.includes('K'), `${key} should use K outline`).toBe(true)
      }
      expect(flat.includes('.'), `${key} should have a transparent background`).toBe(true)
    }
  })
})
