import { describe, expect, it } from 'vitest'
import { spriteHeight, spriteWidth, validateSprite, type Sprite } from '../sprite'
import {
  CLIENT_PORTRAIT,
  HR_PORTRAIT,
  INTERN_PORTRAIT,
  MD_PORTRAIT,
  PORTRAITS,
  type PortraitSet,
} from './portraits'

const SETS: Record<string, PortraitSet> = {
  md: MD_PORTRAIT,
  hr: HR_PORTRAIT,
  intern: INTERN_PORTRAIT,
  client: CLIENT_PORTRAIT,
}

const EXPRESSIONS = ['neutral', 'pleased', 'annoyed', 'smug'] as const

/** Rows where frame 0 (mouth closed) and frame 1 (mouth open) may differ. */
const MOUTH_ROW_START = 18
const MOUTH_ROW_END = 31

function countDiffRows(a: string[], b: string[]): number {
  let count = 0
  for (let r = 0; r < a.length; r++) {
    if (a[r] !== b[r]) count++
  }
  return count
}

describe('portraits', () => {
  it('PORTRAITS exposes exactly md, hr, intern, client', () => {
    expect(Object.keys(PORTRAITS).sort()).toEqual(['client', 'hr', 'intern', 'md'])
    expect(PORTRAITS.md).toBe(MD_PORTRAIT)
    expect(PORTRAITS.hr).toBe(HR_PORTRAIT)
    expect(PORTRAITS.intern).toBe(INTERN_PORTRAIT)
    expect(PORTRAITS.client).toBe(CLIENT_PORTRAIT)
  })

  for (const [setName, set] of Object.entries(SETS)) {
    describe(setName, () => {
      for (const expr of EXPRESSIONS) {
        const sprite: Sprite = set[expr]

        it(`${expr} validates`, () => {
          expect(() => validateSprite(sprite)).not.toThrow()
        })

        it(`${expr} is 32x32`, () => {
          expect(spriteWidth(sprite)).toBe(32)
          expect(spriteHeight(sprite)).toBe(32)
        })

        it(`${expr} has exactly 2 frames`, () => {
          expect(sprite.frames.length).toBe(2)
        })

        it(`${expr} frames 0 and 1 differ only within rows 18-31, and in at most 4 rows`, () => {
          const [closed, open] = sprite.frames

          for (let r = 0; r < MOUTH_ROW_START; r++) {
            expect(closed[r], `row ${r} should be identical between mouth-closed and mouth-open frames`).toBe(open[r])
          }

          let diffsOutsideAllowedRange = 0
          for (let r = MOUTH_ROW_END + 1; r < closed.length; r++) {
            if (closed[r] !== open[r]) diffsOutsideAllowedRange++
          }
          expect(diffsOutsideAllowedRange).toBe(0)

          const diffCount = countDiffRows(closed, open)
          expect(diffCount).toBeGreaterThan(0)
          expect(diffCount).toBeLessThanOrEqual(4)
        })
      }

      it('neutral, pleased, annoyed and smug share identical hair/outline/shoulder rows (0-8 and 23-31)', () => {
        const rowsToCheck = [
          ...Array.from({ length: 9 }, (_, i) => i), // 0-8 hair
          ...Array.from({ length: 9 }, (_, i) => 23 + i), // 23-31 shoulders
        ]
        const base = set.neutral.frames[0]
        for (const other of [set.pleased, set.annoyed, set.smug]) {
          const frame = other.frames[0]
          for (const r of rowsToCheck) {
            expect(frame[r], `row ${r} should match neutral's`).toBe(base[r])
          }
        }
      })
    })
  }
})
