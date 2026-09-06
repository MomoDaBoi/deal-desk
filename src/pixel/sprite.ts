import { colorFor, TRANSPARENT } from './palette'

/**
 * A sprite is one or more frames of equal size. Each frame is an array of
 * strings (rows); each character is a key in `PALETTE`, or '.' for
 * transparent. Frames must all share the first frame's width and height.
 *
 * Rendering caches an offscreen canvas per (sprite, frame) at 1x and draws
 * it scaled with smoothing off, so a 16x20 character costs one drawImage.
 */
export interface Sprite {
  /** Human name, used in validation errors and debugging. */
  name: string
  /** Frames of rows. frames[0][0].length is the width; frames[0].length is the height. */
  frames: string[][]
  /** Ticks per frame when animating. Defaults to 8 (~7.5fps at 60Hz). */
  frameTicks?: number
}

export function spriteWidth(s: Sprite): number {
  return s.frames[0]?.[0]?.length ?? 0
}
export function spriteHeight(s: Sprite): number {
  return s.frames[0]?.length ?? 0
}

/** Throws with a precise message when a sprite is malformed. Used by tests. */
export function validateSprite(s: Sprite): void {
  if (!s.frames.length) throw new Error(`${s.name}: no frames`)
  const w = spriteWidth(s)
  const h = spriteHeight(s)
  if (w === 0 || h === 0) throw new Error(`${s.name}: empty frame`)
  s.frames.forEach((frame, fi) => {
    if (frame.length !== h) throw new Error(`${s.name}: frame ${fi} has ${frame.length} rows, expected ${h}`)
    frame.forEach((row, ri) => {
      if (row.length !== w) throw new Error(`${s.name}: frame ${fi} row ${ri} has ${row.length} cols, expected ${w}`)
      for (const ch of row) {
        if (ch !== TRANSPARENT && colorFor(ch) === null) {
          throw new Error(`${s.name}: frame ${fi} row ${ri} uses unknown palette key '${ch}'`)
        }
      }
    })
  })
}

/** Horizontal mirror of every frame, for right-facing walks drawn as left. */
export function mirror(s: Sprite, name = `${s.name}-mirrored`): Sprite {
  return { ...s, name, frames: s.frames.map((f) => f.map((row) => row.split('').reverse().join(''))) }
}

/** Overlay `top` onto `base` (same size); transparent pixels in `top` show `base`. */
export function compose(name: string, base: Sprite, top: Sprite, topFrame = 0): Sprite {
  const t = top.frames[topFrame]
  return {
    name,
    frameTicks: base.frameTicks,
    frames: base.frames.map((frame) =>
      frame.map((row, y) =>
        row
          .split('')
          .map((ch, x) => (t[y]?.[x] && t[y][x] !== TRANSPARENT ? t[y][x] : ch))
          .join(''),
      ),
    ),
  }
}

type Canvas2D = CanvasRenderingContext2D

const cache = new WeakMap<Sprite, Map<number, HTMLCanvasElement>>()

/** 1x offscreen render of one frame, cached. */
export function frameCanvas(s: Sprite, frame = 0): HTMLCanvasElement {
  let perSprite = cache.get(s)
  if (!perSprite) {
    perSprite = new Map()
    cache.set(s, perSprite)
  }
  const fi = ((frame % s.frames.length) + s.frames.length) % s.frames.length
  const hit = perSprite.get(fi)
  if (hit) return hit
  const w = spriteWidth(s)
  const h = spriteHeight(s)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  const rows = s.frames[fi]
  for (let y = 0; y < h; y++) {
    const row = rows[y]
    let x = 0
    while (x < w) {
      const ch = row[x]
      const color = colorFor(ch)
      if (!color) {
        x++
        continue
      }
      // Run-length fill: same colour across the row draws as one rect.
      let x2 = x + 1
      while (x2 < w && row[x2] === ch) x2++
      ctx.fillStyle = color
      ctx.fillRect(x, y, x2 - x, 1)
      x = x2
    }
  }
  perSprite.set(fi, c)
  return c
}

/** Draw a frame at (x, y) in *destination* pixels, scaled by `scale`. */
export function drawSprite(ctx: Canvas2D, s: Sprite, x: number, y: number, scale = 1, frame = 0): void {
  const c = frameCanvas(s, frame)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(c, Math.round(x), Math.round(y), c.width * scale, c.height * scale)
}

/** Data URL of one frame at 1x; use as a CSS background with image-rendering: pixelated. */
export function spriteDataUrl(s: Sprite, frame = 0): string {
  return frameCanvas(s, frame).toDataURL()
}

/** Which frame to show at a given tick for a looping animation. */
export function frameAt(s: Sprite, tick: number): number {
  const per = s.frameTicks ?? 8
  return Math.floor(tick / per) % s.frames.length
}
