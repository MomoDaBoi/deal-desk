import { describe, expect, it } from 'vitest'
import { spriteHeight, spriteWidth, validateSprite } from '../sprite'
import {
  ICONS,
  ICON_COG,
  ICON_BACK,
  ICON_LOCK,
  ICON_CHECK,
  ICON_CROSS,
  ICON_MONEY_BAG,
  ICON_TROPHY,
  ICON_BRIEFCASE,
  ICON_COFFEE,
  ICON_CHART_UP,
  ICON_CHART_DOWN,
  ICON_CLOCK,
  ICON_STAR,
  ICON_PHONE,
  ICON_ENVELOPE,
  ICON_WARNING,
  ICON_GAVEL,
  ICON_BUILDING,
  ICON_HEART,
  ICON_TIE,
  ICON_FAX,
  ICON_DOC,
  ICON_CALC,
  ICON_HANDSHAKE,
  ICON_KEY,
  ICON_SOUND_ON,
  ICON_SOUND_OFF,
  ICON_SHARE,
  ICON_DOWNLOAD,
  ICON_UPLOAD,
  ICON_TRASH,
  ICON_SKULL,
  ICON_FIRE,
  ICON_BOSS,
  ICON_MENTOR,
  ICON_COIN,
  ICON_HOURGLASS,
  EMBLEM_BONUS,
  EMBLEM_REVIEW,
  EMBLEM_PROMOTION,
  EMBLEM_BOSS,
  EMBLEM_INTERVIEW,
  EMBLEM_DEAL,
  EMBLEM_SENT,
  EMBLEM_LOCKED,
  EMBLEM_CASH,
  DEAL_DESK_LOGO,
} from './icons'

const STATIC_ICONS = [
  ICON_COG,
  ICON_BACK,
  ICON_LOCK,
  ICON_CHECK,
  ICON_CROSS,
  ICON_MONEY_BAG,
  ICON_TROPHY,
  ICON_BRIEFCASE,
  ICON_COFFEE,
  ICON_CHART_UP,
  ICON_CHART_DOWN,
  ICON_CLOCK,
  ICON_STAR,
  ICON_PHONE,
  ICON_ENVELOPE,
  ICON_WARNING,
  ICON_GAVEL,
  ICON_BUILDING,
  ICON_HEART,
  ICON_TIE,
  ICON_FAX,
  ICON_DOC,
  ICON_CALC,
  ICON_HANDSHAKE,
  ICON_KEY,
  ICON_SOUND_ON,
  ICON_SOUND_OFF,
  ICON_SHARE,
  ICON_DOWNLOAD,
  ICON_UPLOAD,
  ICON_TRASH,
  ICON_SKULL,
  ICON_FIRE,
  ICON_BOSS,
  ICON_MENTOR,
]

const STATIC_EMBLEMS = [
  EMBLEM_REVIEW,
  EMBLEM_PROMOTION,
  EMBLEM_BOSS,
  EMBLEM_INTERVIEW,
  EMBLEM_DEAL,
  EMBLEM_LOCKED,
  EMBLEM_CASH,
]

describe('ICONS registry', () => {
  it('validates every sprite in the registry', () => {
    for (const [key, sprite] of Object.entries(ICONS)) {
      expect(() => validateSprite(sprite), `ICONS.${key} (${sprite.name})`).not.toThrow()
    }
  })

  it('contains every exported sprite, keyed by camelCase name', () => {
    const all = [
      ...STATIC_ICONS,
      ...STATIC_EMBLEMS,
      ICON_COIN,
      ICON_HOURGLASS,
      EMBLEM_BONUS,
      EMBLEM_SENT,
      DEAL_DESK_LOGO,
    ]
    const registered = new Set(Object.values(ICONS))
    for (const sprite of all) {
      expect(registered.has(sprite), `missing from ICONS: ${sprite.name}`).toBe(true)
    }
    expect(Object.keys(ICONS)).toHaveLength(all.length)
  })
})

describe('16x16 static icons', () => {
  it.each(STATIC_ICONS.map((s) => [s.name, s] as const))('%s is 16x16, single frame, valid', (_name, sprite) => {
    validateSprite(sprite)
    expect(spriteWidth(sprite)).toBe(16)
    expect(spriteHeight(sprite)).toBe(16)
    expect(sprite.frames).toHaveLength(1)
  })
})

describe('16x16 animated icons', () => {
  it('ICON_COIN has 4 frames at 16x16 with frameTicks 6', () => {
    validateSprite(ICON_COIN)
    expect(spriteWidth(ICON_COIN)).toBe(16)
    expect(spriteHeight(ICON_COIN)).toBe(16)
    expect(ICON_COIN.frames).toHaveLength(4)
    expect(ICON_COIN.frameTicks).toBe(6)
  })

  it('ICON_HOURGLASS has 2 frames at 16x16 with frameTicks 30', () => {
    validateSprite(ICON_HOURGLASS)
    expect(spriteWidth(ICON_HOURGLASS)).toBe(16)
    expect(spriteHeight(ICON_HOURGLASS)).toBe(16)
    expect(ICON_HOURGLASS.frames).toHaveLength(2)
    expect(ICON_HOURGLASS.frameTicks).toBe(30)
  })
})

describe('32x32 emblems', () => {
  it.each(STATIC_EMBLEMS.map((s) => [s.name, s] as const))('%s is 32x32, single frame, valid', (_name, sprite) => {
    validateSprite(sprite)
    expect(spriteWidth(sprite)).toBe(32)
    expect(spriteHeight(sprite)).toBe(32)
    expect(sprite.frames).toHaveLength(1)
  })

  it('EMBLEM_BONUS has 2 frames at 32x32 with frameTicks 10', () => {
    validateSprite(EMBLEM_BONUS)
    expect(spriteWidth(EMBLEM_BONUS)).toBe(32)
    expect(spriteHeight(EMBLEM_BONUS)).toBe(32)
    expect(EMBLEM_BONUS.frames).toHaveLength(2)
    expect(EMBLEM_BONUS.frameTicks).toBe(10)
  })

  it('EMBLEM_SENT has 2 frames at 32x32 with frameTicks 12', () => {
    validateSprite(EMBLEM_SENT)
    expect(spriteWidth(EMBLEM_SENT)).toBe(32)
    expect(spriteHeight(EMBLEM_SENT)).toBe(32)
    expect(EMBLEM_SENT.frames).toHaveLength(2)
    expect(EMBLEM_SENT.frameTicks).toBe(12)
  })
})

describe('logo', () => {
  it('DEAL_DESK_LOGO is 64x16, single frame, valid', () => {
    validateSprite(DEAL_DESK_LOGO)
    expect(spriteWidth(DEAL_DESK_LOGO)).toBe(64)
    expect(spriteHeight(DEAL_DESK_LOGO)).toBe(16)
    expect(DEAL_DESK_LOGO.frames).toHaveLength(1)
  })
})
