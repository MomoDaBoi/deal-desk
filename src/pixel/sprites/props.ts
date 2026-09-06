import type { Sprite } from '../sprite'

/**
 * Small props, signal bubbles, title-screen decor and the big logo. See
 * ./README.md for the authoring spec and ../palette.ts for the legend every
 * character below is drawn from. Matches the outline weight and shading of
 * ELEVATOR / WALL_TOP_DOOR / DESK in ./tiles.ts.
 *
 * Uses the same tiny internal grid-builder approach as tiles.ts (kept
 * private to this module since tiles.ts does not export its helpers) so
 * every row is guaranteed the same length and every frame the same size.
 */

type Grid = string[][]

function grid(w: number, h: number, fill: string): Grid {
  return Array.from({ length: h }, () => Array<string>(w).fill(fill))
}

function px(g: Grid, x: number, y: number, ch: string): void {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = ch
}

function rect(g: Grid, x: number, y: number, w: number, h: number, ch: string): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) px(g, xx, yy, ch)
  }
}

function hline(g: Grid, x: number, y: number, w: number, ch: string): void {
  rect(g, x, y, w, 1, ch)
}

function vline(g: Grid, x: number, y: number, h: number, ch: string): void {
  rect(g, x, y, 1, h, ch)
}

function outline(g: Grid, x: number, y: number, w: number, h: number, ch: string): void {
  hline(g, x, y, w, ch)
  hline(g, x, y + h - 1, w, ch)
  vline(g, x, y, h, ch)
  vline(g, x + w - 1, y, h, ch)
}

function filledCircle(g: Grid, cx: number, cy: number, halfWidths: number[], ch: string): void {
  const top = cy - Math.floor(halfWidths.length / 2)
  halfWidths.forEach((hw, i) => {
    if (hw >= 0) hline(g, cx - hw, top + i, hw * 2 + 1, ch)
  })
}

function toRows(g: Grid): string[] {
  return g.map((row) => row.join(''))
}

function sprite(name: string, g: Grid, frameTicks?: number): Sprite {
  const s: Sprite = { name, frames: [toRows(g)] }
  if (frameTicks !== undefined) s.frameTicks = frameTicks
  return s
}

function spriteFrames(name: string, gs: Grid[], frameTicks?: number): Sprite {
  const s: Sprite = { name, frames: gs.map(toRows) }
  if (frameTicks !== undefined) s.frameTicks = frameTicks
  return s
}

// ---------------------------------------------------------------------------
// ELEVATOR_OPEN — 32x32. Same outer frame + indicator as tiles.ts ELEVATOR,
// doors slid open revealing a dark interior with a lit ceiling strip and
// side rails.
// ---------------------------------------------------------------------------

function makeElevatorOpenGrid(): Grid {
  const g = grid(32, 32, '.')
  rect(g, 1, 1, 30, 30, 'I')
  outline(g, 1, 1, 30, 30, 'K')
  // open interior cavity (replaces the two sliding door panels)
  rect(g, 3, 3, 26, 26, 'J')
  outline(g, 3, 3, 26, 26, 'K')
  // ceiling light strip
  rect(g, 6, 5, 20, 2, 'j')
  outline(g, 6, 5, 20, 2, 'K')
  // side rails
  vline(g, 6, 10, 16, 'I')
  vline(g, 7, 10, 16, 'G')
  vline(g, 24, 10, 16, 'I')
  vline(g, 25, 10, 16, 'G')
  // floor indicator above the doors, lit — same as ELEVATOR's lit frame
  rect(g, 13, 0, 6, 3, 'K')
  px(g, 15, 1, 'a')
  px(g, 16, 1, 'a')
  return g
}
export const ELEVATOR_OPEN: Sprite = sprite('elevatorOpen', makeElevatorOpenGrid())

// ---------------------------------------------------------------------------
// WALL_TOP_DOOR_OPEN — 16x16, opaque wall tile. Same door frame as
// tiles.ts WALL_TOP_DOOR, but the panel is swung open: a dark doorway with
// the door itself seen edge-on as a thin strip on the left.
// ---------------------------------------------------------------------------

function wallBase(): Grid {
  const g = grid(16, 16, 'w') // rows 0-10 wall face
  hline(g, 0, 11, 16, 'x') // 1px trim
  hline(g, 0, 12, 16, 'K') // baseboard shadow top line
  rect(g, 0, 13, 16, 3, 'J') // baseboard shadow
  return g
}

function wallDoorOpenGrid(): Grid {
  const g = wallBase()
  rect(g, 3, 0, 10, 12, 'C')
  outline(g, 3, 0, 10, 12, 'd')
  rect(g, 4, 1, 8, 10, 'J')
  rect(g, 4, 1, 8, 3, 'K')
  vline(g, 4, 1, 10, 'c')
  return g
}
export const WALL_TOP_DOOR_OPEN: Sprite = sprite('wallTopDoorOpen', wallDoorOpenGrid())

// ---------------------------------------------------------------------------
// COFFEE_CUP — 8x8.
// ---------------------------------------------------------------------------

function makeCoffeeCupGrid(): Grid {
  const g = grid(8, 8, '.')
  outline(g, 1, 2, 5, 5, 'K')
  rect(g, 2, 3, 3, 1, 'W')
  rect(g, 2, 4, 3, 2, 'C')
  px(g, 6, 3, 'K')
  px(g, 6, 5, 'K')
  return g
}
export const COFFEE_CUP: Sprite = sprite('coffeeCup', makeCoffeeCupGrid())

// ---------------------------------------------------------------------------
// TROPHY_DESK — 16x16.
// ---------------------------------------------------------------------------

function makeTrophyDeskGrid(): Grid {
  const g = grid(16, 16, '.')
  rect(g, 4, 12, 8, 3, 'k')
  outline(g, 4, 12, 8, 3, 'K')
  rect(g, 7, 9, 2, 3, 'A')
  outline(g, 5, 3, 6, 6, 'K')
  rect(g, 6, 4, 4, 4, 'a')
  hline(g, 6, 3, 4, 'a')
  px(g, 6, 4, 'A')
  px(g, 9, 4, 'A')
  px(g, 4, 5, 'K')
  px(g, 4, 6, 'K')
  px(g, 11, 5, 'K')
  px(g, 11, 6, 'K')
  return g
}
export const TROPHY_DESK: Sprite = sprite('trophyDesk', makeTrophyDeskGrid())

// ---------------------------------------------------------------------------
// PAPERS_MESSY — 16x8, three overlapping sheets, edges only (no outline).
// ---------------------------------------------------------------------------

function makePapersMessyGrid(): Grid {
  const g = grid(16, 8, '.')
  // back sheet
  rect(g, 1, 2, 9, 5, 'i')
  hline(g, 1, 6, 9, 'G')
  vline(g, 9, 2, 5, 'G')
  // middle sheet
  rect(g, 4, 1, 9, 5, 'W')
  hline(g, 4, 5, 9, 'G')
  vline(g, 12, 1, 5, 'G')
  // front sheet
  rect(g, 6, 3, 9, 5, 'i')
  hline(g, 6, 7, 9, 'G')
  vline(g, 14, 3, 5, 'G')
  return g
}
export const PAPERS_MESSY: Sprite = sprite('papersMessy', makePapersMessyGrid())

// ---------------------------------------------------------------------------
// Speech bubbles — 16x16, shared base shape with a small tail bottom-left.
// ---------------------------------------------------------------------------

function bubbleBase(): Grid {
  const g = grid(16, 16, '.')
  rect(g, 1, 1, 14, 10, 'W')
  outline(g, 1, 1, 14, 10, 'K')
  px(g, 2, 11, 'K')
  px(g, 3, 11, 'W')
  px(g, 4, 11, 'K')
  px(g, 2, 12, 'K')
  px(g, 3, 12, 'K')
  return g
}

function makeBubbleExclaimGrid(): Grid {
  const g = bubbleBase()
  vline(g, 7, 3, 4, 'r')
  vline(g, 8, 3, 4, 'r')
  rect(g, 7, 8, 2, 1, 'r')
  return g
}
export const BUBBLE_EXCLAIM: Sprite = sprite('bubbleExclaim', makeBubbleExclaimGrid())

function makeBubbleQuestionGrid(): Grid {
  const g = bubbleBase()
  hline(g, 6, 3, 3, 'u')
  px(g, 9, 4, 'u')
  px(g, 8, 5, 'u')
  px(g, 7, 6, 'u')
  px(g, 7, 8, 'u')
  return g
}
export const BUBBLE_QUESTION: Sprite = sprite('bubbleQuestion', makeBubbleQuestionGrid())

function makeBubbleDotsGrid(step: number): Grid {
  const g = bubbleBase()
  const rows = step === 0 ? [6, 5, 6] : [5, 6, 5]
  rect(g, 4, rows[0], 2, 2, 'K')
  rect(g, 7, rows[1], 2, 2, 'K')
  rect(g, 10, rows[2], 2, 2, 'K')
  return g
}
export const BUBBLE_DOTS: Sprite = spriteFrames(
  'bubbleDots',
  [makeBubbleDotsGrid(0), makeBubbleDotsGrid(1)],
  12,
)

function makeBubbleHeartGrid(): Grid {
  const g = bubbleBase()
  rect(g, 5, 4, 2, 2, 'r')
  rect(g, 9, 4, 2, 2, 'r')
  rect(g, 4, 5, 8, 2, 'r')
  rect(g, 5, 7, 6, 1, 'r')
  rect(g, 7, 8, 2, 1, 'r')
  px(g, 6, 5, 'p')
  px(g, 10, 5, 'p')
  return g
}
export const BUBBLE_HEART: Sprite = sprite('bubbleHeart', makeBubbleHeartGrid())

function makeBubbleZzzGrid(): Grid {
  const g = bubbleBase()
  hline(g, 6, 4, 5, 'U')
  px(g, 9, 5, 'U')
  px(g, 8, 6, 'U')
  px(g, 7, 7, 'U')
  hline(g, 6, 8, 5, 'U')
  return g
}
export const BUBBLE_ZZZ: Sprite = sprite('bubbleZzz', makeBubbleZzzGrid())

function makeBubbleCoinGrid(): Grid {
  const g = bubbleBase()
  outline(g, 6, 3, 5, 5, 'A')
  rect(g, 7, 4, 3, 3, 'a')
  px(g, 8, 4, 'A')
  px(g, 8, 6, 'A')
  return g
}
export const BUBBLE_COIN: Sprite = sprite('bubbleCoin', makeBubbleCoinGrid())

// ---------------------------------------------------------------------------
// SKYLINE_A..D — 32x48 night-city building silhouettes for a title screen.
// Fully opaque from the roofline down; transparent sky above it.
// ---------------------------------------------------------------------------

const SKYLINE_CANVAS_W = 32
const SKYLINE_CANVAS_H = 48

interface SkylineOptions {
  height: number
  shadowRight: boolean
  antenna?: boolean
  sign?: boolean
}

function makeSkylineGrid(opts: SkylineOptions): Grid {
  const w = SKYLINE_CANVAS_W
  const h = SKYLINE_CANVAS_H
  const g = grid(w, h, '.')
  const top = h - opts.height
  rect(g, 0, top, w, opts.height, 'k')
  outline(g, 0, top, w, opts.height, 'K')

  const shadowW = 8
  if (opts.shadowRight) {
    rect(g, w - shadowW, top + 1, shadowW - 1, opts.height - 2, 'J')
  } else {
    rect(g, 1, top + 1, shadowW - 1, opts.height - 2, 'J')
  }

  for (let wy = top + 3; wy < h - 3; wy += 4) {
    for (let wx = 4; wx < w - 4; wx += 5) {
      const lit = (wx + wy) % 7 < 4
      if (lit) px(g, wx, wy, (wx + wy) % 3 === 0 ? 'U' : 'j')
    }
  }

  if (opts.antenna) {
    const cx = Math.floor(w / 2)
    vline(g, cx, top - 4, 4, 'K')
    px(g, cx, top - 4, 'a')
  }

  if (opts.sign) {
    const sx = Math.floor(w / 2) - 5
    rect(g, sx, top - 3, 10, 3, 't')
    outline(g, sx, top - 3, 10, 3, 'K')
  }

  return g
}

export const SKYLINE_A: Sprite = sprite(
  'skylineA',
  makeSkylineGrid({ height: 48, shadowRight: true }),
)
export const SKYLINE_B: Sprite = sprite(
  'skylineB',
  makeSkylineGrid({ height: 40, shadowRight: false, antenna: true }),
)
export const SKYLINE_C: Sprite = sprite(
  'skylineC',
  makeSkylineGrid({ height: 32, shadowRight: true }),
)
export const SKYLINE_D: Sprite = sprite(
  'skylineD',
  makeSkylineGrid({ height: 44, shadowRight: false, sign: true }),
)

// ---------------------------------------------------------------------------
// CLOUD — 24x8, two lumps, no outline.
// ---------------------------------------------------------------------------

function makeCloudGrid(): Grid {
  const g = grid(24, 8, '.')
  rect(g, 2, 3, 10, 3, 'W')
  rect(g, 4, 1, 8, 3, 'W')
  rect(g, 12, 4, 9, 2, 'G')
  rect(g, 14, 2, 6, 3, 'G')
  return g
}
export const CLOUD: Sprite = sprite('cloud', makeCloudGrid())

// ---------------------------------------------------------------------------
// MOON — 16x16, crescent, no outline.
// ---------------------------------------------------------------------------

function makeMoonGrid(): Grid {
  const g = grid(16, 16, '.')
  filledCircle(g, 8, 8, [2, 4, 5, 6, 6, 6, 6, 5, 4, 2], 'j')
  filledCircle(g, 10, 7, [2, 3, 4, 4, 4, 4, 3, 2], 'J')
  px(g, 5, 4, 'W')
  px(g, 6, 5, 'W')
  return g
}
export const MOON: Sprite = sprite('moon', makeMoonGrid())

// ---------------------------------------------------------------------------
// STAR_SMALL — 3x3 plus shape.
// ---------------------------------------------------------------------------

function makeStarSmallGrid(): Grid {
  const g = grid(3, 3, '.')
  px(g, 1, 0, 'W')
  px(g, 0, 1, 'W')
  px(g, 1, 1, 'W')
  px(g, 2, 1, 'W')
  px(g, 1, 2, 'W')
  return g
}
export const STAR_SMALL: Sprite = sprite('starSmall', makeStarSmallGrid())

// ---------------------------------------------------------------------------
// CONFETTI — 4x4, 4 frames, each a differently placed/coloured 2x2 block.
// ---------------------------------------------------------------------------

function makeConfettiGrid(x: number, y: number, ch: string): Grid {
  const g = grid(4, 4, '.')
  rect(g, x, y, 2, 2, ch)
  return g
}
export const CONFETTI: Sprite = spriteFrames(
  'confetti',
  [
    makeConfettiGrid(0, 0, 'v'),
    makeConfettiGrid(2, 0, 'a'),
    makeConfettiGrid(0, 2, 'u'),
    makeConfettiGrid(1, 1, 'r'),
  ],
  8,
)

// ---------------------------------------------------------------------------
// LOGO_BIG — 96x24. 'DEAL DESK' in a chunky 5x7 pixel font, 1px K outline
// around every letter, 1px K drop shadow offset (+1, +1).
// ---------------------------------------------------------------------------

type Bitmap5x7 = string[]

const FONT: Record<string, Bitmap5x7> = {
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
}

type Letter = keyof typeof FONT

function isFillLocal(bitmap: Bitmap5x7, bx: number, by: number): boolean {
  if (by < 0 || by > 6 || bx < 0 || bx > 4) return false
  return bitmap[by][bx] === '1'
}

function isInkLocal(bitmap: Bitmap5x7, bx: number, by: number): boolean {
  if (isFillLocal(bitmap, bx, by)) return true
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      if (isFillLocal(bitmap, bx + dx, by + dy)) return true
    }
  }
  return false
}

/**
 * Stamps one outlined, drop-shadowed glyph onto `g`. `ox, oy` is the
 * top-left of the glyph's 7x9 outline bounding box (1px outline margin
 * around the 5x7 letterform); the shadow pokes 1px further right/down.
 */
function stampGlyph(g: Grid, letter: Letter, ox: number, oy: number, fillColor: string): void {
  const bitmap = FONT[letter]
  for (let ly = -1; ly <= 7; ly++) {
    for (let lx = -1; lx <= 5; lx++) {
      if (isInkLocal(bitmap, lx, ly)) {
        px(g, ox + (lx + 1) + 1, oy + (ly + 1) + 1, 'K')
      }
    }
  }
  for (let ly = -1; ly <= 7; ly++) {
    for (let lx = -1; lx <= 5; lx++) {
      if (isInkLocal(bitmap, lx, ly) && !isFillLocal(bitmap, lx, ly)) {
        px(g, ox + (lx + 1), oy + (ly + 1), 'K')
      }
    }
  }
  for (let by = 0; by <= 6; by++) {
    for (let bx = 0; bx <= 4; bx++) {
      if (isFillLocal(bitmap, bx, by)) {
        px(g, ox + (bx + 1), oy + (by + 1), fillColor)
      }
    }
  }
}

function makeLogoBigGrid(): Grid {
  const g = grid(96, 24, '.')
  const oy = 7
  const boxW = 7
  const letterGap = 1
  const wordGap = 3
  let ox = 15

  const stampWord = (letters: Letter[], color: string): void => {
    for (const letter of letters) {
      stampGlyph(g, letter, ox, oy, color)
      ox += boxW + letterGap
    }
  }

  stampWord(['D', 'E', 'A', 'L'], 'W')
  ox += wordGap - letterGap
  stampWord(['D', 'E', 'S', 'K'], 'v')

  return g
}
export const LOGO_BIG: Sprite = sprite('logoBig', makeLogoBigGrid())

// ---------------------------------------------------------------------------

export const PROPS: Record<string, Sprite> = {
  elevatorOpen: ELEVATOR_OPEN,
  wallTopDoorOpen: WALL_TOP_DOOR_OPEN,
  coffeeCup: COFFEE_CUP,
  trophyDesk: TROPHY_DESK,
  papersMessy: PAPERS_MESSY,
  bubbleExclaim: BUBBLE_EXCLAIM,
  bubbleQuestion: BUBBLE_QUESTION,
  bubbleDots: BUBBLE_DOTS,
  bubbleHeart: BUBBLE_HEART,
  bubbleZzz: BUBBLE_ZZZ,
  bubbleCoin: BUBBLE_COIN,
  skylineA: SKYLINE_A,
  skylineB: SKYLINE_B,
  skylineC: SKYLINE_C,
  skylineD: SKYLINE_D,
  cloud: CLOUD,
  moon: MOON,
  starSmall: STAR_SMALL,
  confetti: CONFETTI,
  logoBig: LOGO_BIG,
}
