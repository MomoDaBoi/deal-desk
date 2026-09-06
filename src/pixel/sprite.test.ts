import { describe, expect, it } from 'vitest'
import { compose, mirror, spriteHeight, spriteWidth, validateSprite, type Sprite } from './sprite'

const ok: Sprite = { name: 'ok', frames: [['.K.', 'KsK', '.K.'], ['K.K', '.s.', 'K.K']] }

describe('validateSprite', () => {
  it('accepts a well-formed sprite', () => {
    expect(() => validateSprite(ok)).not.toThrow()
    expect(spriteWidth(ok)).toBe(3)
    expect(spriteHeight(ok)).toBe(3)
  })
  it('rejects ragged rows', () => {
    expect(() => validateSprite({ name: 'bad', frames: [['.K.', 'Ks']] })).toThrow(/row 1 has 2 cols/)
  })
  it('rejects frames of a different height', () => {
    expect(() => validateSprite({ name: 'bad', frames: [['.K.'], ['.K.', '.K.']] })).toThrow(/frame 1 has 2 rows/)
  })
  it('rejects unknown palette keys', () => {
    expect(() => validateSprite({ name: 'bad', frames: [['.?.']] })).toThrow(/unknown palette key/)
  })
  it('mirrors every frame horizontally', () => {
    const m = mirror({ name: 'm', frames: [['Ks.', 'K..']] })
    expect(m.frames[0]).toEqual(['.sK', '..K'])
  })
  it('composes an overlay onto a base', () => {
    const c = compose('c', ok, { name: 'hat', frames: [['aaa', '...', '...']] })
    expect(c.frames[0][0]).toBe('aaa')
    expect(c.frames[1][1]).toBe('.s.')
  })
})
