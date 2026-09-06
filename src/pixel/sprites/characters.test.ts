import { describe, expect, it } from 'vitest'
import { spriteHeight, spriteWidth, validateSprite, type Sprite } from '../sprite'
import {
  ANALYST_A,
  ANALYST_B,
  ASSOCIATE,
  CHARACTERS,
  HR,
  MD,
  PLAYER,
  type CharacterSet,
} from './characters'

const ALL_SETS: Record<string, CharacterSet> = {
  PLAYER,
  MD,
  ANALYST_A,
  ANALYST_B,
  ASSOCIATE,
  HR,
}

describe('character sprites', () => {
  for (const [setName, set] of Object.entries(ALL_SETS)) {
    describe(setName, () => {
      const directional: Array<[string, Sprite]> = [
        ['down', set.down],
        ['up', set.up],
        ['left', set.left],
      ]
      for (const [dirName, sprite] of directional) {
        it(`${dirName} is a valid 16x20 sprite with 3 frames`, () => {
          expect(() => validateSprite(sprite)).not.toThrow()
          expect(spriteWidth(sprite)).toBe(16)
          expect(spriteHeight(sprite)).toBe(20)
          expect(sprite.frames).toHaveLength(3)
        })
      }

      it('sit is a valid 16x20 sprite with 2 frames', () => {
        expect(() => validateSprite(set.sit)).not.toThrow()
        expect(spriteWidth(set.sit)).toBe(16)
        expect(spriteHeight(set.sit)).toBe(20)
        expect(set.sit.frames).toHaveLength(2)
      })

      it('has a non-empty name', () => {
        expect(set.name.length).toBeGreaterThan(0)
      })
    })
  }

  it('CHARACTERS is keyed by lowercased name', () => {
    expect(Object.keys(CHARACTERS).sort()).toEqual(
      ['analystA', 'analystB', 'associate', 'hr', 'md', 'player'].sort(),
    )
    expect(CHARACTERS.player).toBe(PLAYER)
    expect(CHARACTERS.md).toBe(MD)
    expect(CHARACTERS.analystA).toBe(ANALYST_A)
    expect(CHARACTERS.analystB).toBe(ANALYST_B)
    expect(CHARACTERS.associate).toBe(ASSOCIATE)
    expect(CHARACTERS.hr).toBe(HR)
  })

  it('walk sprites use frameTicks 8 and sit sprites use frameTicks 14', () => {
    for (const set of Object.values(ALL_SETS)) {
      expect(set.down.frameTicks).toBe(8)
      expect(set.up.frameTicks).toBe(8)
      expect(set.left.frameTicks).toBe(8)
      expect(set.sit.frameTicks).toBe(14)
    }
  })
})
