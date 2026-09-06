import { describe, expect, it } from 'vitest'
import type { Sprite } from '../sprite'
import { spriteHeight, spriteWidth, validateSprite } from '../sprite'
import { ELEVATOR } from './tiles'
import {
  BUBBLE_COIN,
  BUBBLE_DOTS,
  BUBBLE_EXCLAIM,
  BUBBLE_HEART,
  BUBBLE_QUESTION,
  BUBBLE_ZZZ,
  CLOUD,
  COFFEE_CUP,
  CONFETTI,
  ELEVATOR_OPEN,
  LOGO_BIG,
  MOON,
  PAPERS_MESSY,
  PROPS,
  SKYLINE_A,
  SKYLINE_B,
  SKYLINE_C,
  SKYLINE_D,
  STAR_SMALL,
  TROPHY_DESK,
  WALL_TOP_DOOR_OPEN,
} from './props'

describe('PROPS', () => {
  it('every sprite validates', () => {
    for (const s of Object.values(PROPS)) {
      expect(() => validateSprite(s)).not.toThrow()
    }
  })

  const EXPECTED_SIZES: Record<string, { w: number; h: number }> = {
    elevatorOpen: { w: 32, h: 32 },
    wallTopDoorOpen: { w: 16, h: 16 },
    coffeeCup: { w: 8, h: 8 },
    trophyDesk: { w: 16, h: 16 },
    papersMessy: { w: 16, h: 8 },
    bubbleExclaim: { w: 16, h: 16 },
    bubbleQuestion: { w: 16, h: 16 },
    bubbleDots: { w: 16, h: 16 },
    bubbleHeart: { w: 16, h: 16 },
    bubbleZzz: { w: 16, h: 16 },
    bubbleCoin: { w: 16, h: 16 },
    skylineA: { w: 32, h: 48 },
    skylineB: { w: 32, h: 48 },
    skylineC: { w: 32, h: 48 },
    skylineD: { w: 32, h: 48 },
    cloud: { w: 24, h: 8 },
    moon: { w: 16, h: 16 },
    starSmall: { w: 3, h: 3 },
    confetti: { w: 4, h: 4 },
    logoBig: { w: 96, h: 24 },
  }

  it('every PROPS key is exported with the exact expected size', () => {
    expect(Object.keys(PROPS).sort()).toEqual(Object.keys(EXPECTED_SIZES).sort())
    for (const [key, sprite] of Object.entries(PROPS)) {
      const expected = EXPECTED_SIZES[key]
      expect(spriteWidth(sprite), `${key} width`).toBe(expected.w)
      expect(spriteHeight(sprite), `${key} height`).toBe(expected.h)
    }
  })

  it('BUBBLE_DOTS has 2 frames', () => {
    expect(BUBBLE_DOTS.frames.length).toBe(2)
    expect(BUBBLE_DOTS.frameTicks).toBe(12)
  })

  it('CONFETTI has 4 frames, each a distinct colour', () => {
    expect(CONFETTI.frames.length).toBe(4)
    const colours = CONFETTI.frames.map((frame) => frame.join('').split('').find((ch) => ch !== '.'))
    expect(new Set(colours).size).toBe(4)
  })

  it('ELEVATOR_OPEN keeps the same outer frame and lit indicator as ELEVATOR', () => {
    const litElevator = ELEVATOR.frames[0]
    const open = ELEVATOR_OPEN.frames[0]
    // Outer metal frame (row 1 and row 30) is identical.
    expect(open[1]).toBe(litElevator[1])
    expect(open[30]).toBe(litElevator[30])
    // Indicator band (rows 0-2) is identical, including the lit pixels.
    expect(open[0]).toBe(litElevator[0])
    expect(open[1].slice(13, 19)).toBe(litElevator[1].slice(13, 19))
    expect(open[2].slice(13, 19)).toBe(litElevator[2].slice(13, 19))
  })

  it('ELEVATOR_OPEN shows an open J interior instead of the two G door panels', () => {
    const open = ELEVATOR_OPEN.frames[0]
    // Where the closed elevator has its vertical door seam (col 16), the
    // open one is walkable dark interior, not a door panel.
    expect(open[16][16]).toBe('J')
    expect(open[16][8]).not.toBe('G')
  })

  it('WALL_TOP_DOOR_OPEN is fully opaque and shows a dark doorway with a c edge', () => {
    validateSprite(WALL_TOP_DOOR_OPEN)
    for (const row of WALL_TOP_DOOR_OPEN.frames[0]) {
      expect(row.includes('.')).toBe(false)
    }
    const rows = WALL_TOP_DOOR_OPEN.frames[0]
    expect(rows[6][4]).toBe('c')
    expect(['K', 'J']).toContain(rows[6][7])
  })

  it('COFFEE_CUP uses W cup, C coffee and a K outline', () => {
    const rows = COFFEE_CUP.frames[0]
    const chars = new Set(rows.join('').split(''))
    expect(chars.has('W')).toBe(true)
    expect(chars.has('C')).toBe(true)
    expect(chars.has('K')).toBe(true)
  })

  it('TROPHY_DESK sits on a k base', () => {
    const rows = TROPHY_DESK.frames[0]
    expect(rows[13].includes('k')).toBe(true)
  })

  it('PAPERS_MESSY has no full outline row of K (no bottom outline)', () => {
    const rows = PAPERS_MESSY.frames[0]
    const chars = new Set(rows.join('').split(''))
    expect(chars.has('K')).toBe(false)
    expect(chars.has('G')).toBe(true)
  })

  describe('speech bubbles', () => {
    const bubbles: Array<[string, Sprite, string]> = [
      ['exclaim', BUBBLE_EXCLAIM, 'r'],
      ['question', BUBBLE_QUESTION, 'u'],
      ['heart', BUBBLE_HEART, 'r'],
      ['zzz', BUBBLE_ZZZ, 'U'],
      ['coin', BUBBLE_COIN, 'a'],
    ]

    it.each(bubbles)('%s bubble has a W body, K outline, tail and content colour', (_name, sprite, contentColour) => {
      const rows = sprite.frames[0]
      const chars = new Set(rows.join('').split(''))
      expect(chars.has('W')).toBe(true)
      expect(chars.has('K')).toBe(true)
      expect(chars.has(contentColour)).toBe(true)
      // tail pixel bottom-left
      expect(rows[12][2]).toBe('K')
    })
  })

  describe('SKYLINE_*', () => {
    const cases: Array<[Sprite, number]> = [
      [SKYLINE_A, 48],
      [SKYLINE_B, 40],
      [SKYLINE_C, 32],
      [SKYLINE_D, 44],
    ]

    it.each(cases)('has the stated height of opaque rows at the bottom', (sprite, height) => {
      const rows = sprite.frames[0]
      const top = rows.length - height
      for (let y = top; y < rows.length; y++) {
        expect(rows[y].includes('.'), `row ${y} should be fully opaque`).toBe(false)
      }
    })

    it('SKYLINE_B has an antenna light poking above its roofline', () => {
      const rows = SKYLINE_B.frames[0]
      const top = rows.length - 40
      const above = rows.slice(0, top).join('')
      expect(above.includes('a')).toBe(true)
    })

    it('SKYLINE_D has a rooftop sign poking above its roofline', () => {
      const rows = SKYLINE_D.frames[0]
      const top = rows.length - 44
      const above = rows.slice(0, top).join('')
      expect(above.includes('t')).toBe(true)
    })

    it('all skylines use k/K body colour and j/U lit windows', () => {
      for (const [sprite] of cases) {
        const chars = new Set(sprite.frames[0].join('').split(''))
        expect(chars.has('k')).toBe(true)
        expect(chars.has('K')).toBe(true)
        expect(chars.has('J')).toBe(true)
        expect(chars.has('j') || chars.has('U')).toBe(true)
      }
    })
  })

  it('CLOUD has no K outline', () => {
    const chars = new Set(CLOUD.frames[0].join('').split(''))
    expect(chars.has('K')).toBe(false)
    expect(chars.has('W')).toBe(true)
    expect(chars.has('G')).toBe(true)
  })

  it('MOON has no K outline and is a crescent (J covers part of the j disc)', () => {
    const chars = new Set(MOON.frames[0].join('').split(''))
    expect(chars.has('K')).toBe(false)
    expect(chars.has('j')).toBe(true)
    expect(chars.has('J')).toBe(true)
  })

  it('STAR_SMALL is a plus shape', () => {
    expect(STAR_SMALL.frames[0]).toEqual(['.W.', 'WWW', '.W.'])
  })

  it('LOGO_BIG spells DEAL in W and DESK in v, centred with a K outline and drop shadow', () => {
    const rows = LOGO_BIG.frames[0]
    const chars = new Set(rows.join('').split(''))
    expect(chars.has('W')).toBe(true)
    expect(chars.has('v')).toBe(true)
    expect(chars.has('K')).toBe(true)
    // Roughly centred: no ink in the first/last 10 columns.
    const leftBand = rows.map((r) => r.slice(0, 10)).join('')
    const rightBand = rows.map((r) => r.slice(86)).join('')
    expect(leftBand.replace(/\./g, '').length).toBe(0)
    expect(rightBand.replace(/\./g, '').length).toBe(0)
  })
})
