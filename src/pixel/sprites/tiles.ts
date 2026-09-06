import type { Sprite } from '../sprite'

/**
 * Office tile & furniture set for the top-down (slightly front-facing)
 * investment-bank office. See ./README.md for the authoring spec and
 * ../palette.ts for the legend every character below is drawn from.
 *
 * Sprites are built with a tiny internal grid builder rather than typed
 * out char-by-char: at these sizes (up to 48x32, several multi-frame) it
 * is the only reliable way to keep every row the same length and every
 * frame the same size, which `validateSprite` enforces.
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
// FLOOR TILES — 16x16, fully opaque, no outline, tile seamlessly.
// ---------------------------------------------------------------------------

const floorCarpetGrid = grid(16, 16, 'f')
px(floorCarpetGrid, 3, 4, 'F')
px(floorCarpetGrid, 10, 9, 'F')
px(floorCarpetGrid, 6, 13, 'F')
export const FLOOR_CARPET: Sprite = sprite('floorCarpet', floorCarpetGrid)

const floorCarpetAltGrid = grid(16, 16, 'f')
px(floorCarpetAltGrid, 12, 2, 'F')
px(floorCarpetAltGrid, 2, 10, 'F')
px(floorCarpetAltGrid, 8, 7, 'F')
export const FLOOR_CARPET_ALT: Sprite = sprite('floorCarpetAlt', floorCarpetAltGrid)

const floorBeigeGrid = grid(16, 16, 'm')
px(floorBeigeGrid, 4, 3, 'M')
px(floorBeigeGrid, 11, 8, 'M')
px(floorBeigeGrid, 7, 12, 'M')
export const FLOOR_BEIGE: Sprite = sprite('floorBeige', floorBeigeGrid)

const floorTileGrid = grid(16, 16, 'e')
hline(floorTileGrid, 0, 0, 16, 'E')
hline(floorTileGrid, 0, 8, 16, 'E')
vline(floorTileGrid, 0, 0, 16, 'E')
vline(floorTileGrid, 8, 0, 16, 'E')
export const FLOOR_TILE: Sprite = sprite('floorTile', floorTileGrid)

const floorWoodGrid = grid(16, 16, 'c')
hline(floorWoodGrid, 0, 0, 16, 'C')
hline(floorWoodGrid, 0, 4, 16, 'C')
hline(floorWoodGrid, 0, 8, 16, 'C')
hline(floorWoodGrid, 0, 12, 16, 'C')
px(floorWoodGrid, 5, 2, 'd')
px(floorWoodGrid, 12, 6, 'd')
px(floorWoodGrid, 9, 14, 'd')
export const FLOOR_WOOD: Sprite = sprite('floorWood', floorWoodGrid)

const floorMarbleGrid = grid(16, 16, 'i')
px(floorMarbleGrid, 3, 3, 'G')
px(floorMarbleGrid, 4, 4, 'G')
px(floorMarbleGrid, 5, 3, 'G')
px(floorMarbleGrid, 11, 10, 'G')
px(floorMarbleGrid, 12, 11, 'G')
export const FLOOR_MARBLE: Sprite = sprite('floorMarble', floorMarbleGrid)

function rugBase(): Grid {
  const g = grid(16, 16, 'R')
  px(g, 7, 6, 'r')
  px(g, 8, 6, 'r')
  px(g, 6, 7, 'r')
  px(g, 9, 7, 'r')
  px(g, 6, 8, 'r')
  px(g, 9, 8, 'r')
  px(g, 7, 9, 'r')
  px(g, 8, 9, 'r')
  return g
}

export const FLOOR_RUG_CENTER: Sprite = sprite('floorRugCenter', rugBase())

const rugEdgeNGrid = rugBase()
hline(rugEdgeNGrid, 0, 0, 16, 'a')
export const FLOOR_RUG_EDGE_N: Sprite = sprite('floorRugEdgeN', rugEdgeNGrid)

const rugEdgeSGrid = rugBase()
hline(rugEdgeSGrid, 0, 15, 16, 'a')
export const FLOOR_RUG_EDGE_S: Sprite = sprite('floorRugEdgeS', rugEdgeSGrid)

const rugEdgeEGrid = rugBase()
vline(rugEdgeEGrid, 15, 0, 16, 'a')
export const FLOOR_RUG_EDGE_E: Sprite = sprite('floorRugEdgeE', rugEdgeEGrid)

const rugEdgeWGrid = rugBase()
vline(rugEdgeWGrid, 0, 0, 16, 'a')
export const FLOOR_RUG_EDGE_W: Sprite = sprite('floorRugEdgeW', rugEdgeWGrid)

const rugCornerNwGrid = rugBase()
hline(rugCornerNwGrid, 0, 0, 16, 'a')
vline(rugCornerNwGrid, 0, 0, 16, 'a')
export const FLOOR_RUG_CORNER_NW: Sprite = sprite('floorRugCornerNw', rugCornerNwGrid)

const rugCornerNeGrid = rugBase()
hline(rugCornerNeGrid, 0, 0, 16, 'a')
vline(rugCornerNeGrid, 15, 0, 16, 'a')
export const FLOOR_RUG_CORNER_NE: Sprite = sprite('floorRugCornerNe', rugCornerNeGrid)

const rugCornerSwGrid = rugBase()
hline(rugCornerSwGrid, 0, 15, 16, 'a')
vline(rugCornerSwGrid, 0, 0, 16, 'a')
export const FLOOR_RUG_CORNER_SW: Sprite = sprite('floorRugCornerSw', rugCornerSwGrid)

const rugCornerSeGrid = rugBase()
hline(rugCornerSeGrid, 0, 15, 16, 'a')
vline(rugCornerSeGrid, 15, 0, 16, 'a')
export const FLOOR_RUG_CORNER_SE: Sprite = sprite('floorRugCornerSe', rugCornerSeGrid)

// ---------------------------------------------------------------------------
// WALL TILES — 16x16, opaque (except the SIDE edge tiles, which are mostly
// transparent by design so they can be laid over a floor edge).
// ---------------------------------------------------------------------------

function wallBase(): Grid {
  const g = grid(16, 16, 'w') // rows 0-10 wall face
  hline(g, 0, 11, 16, 'x') // 1px trim
  hline(g, 0, 12, 16, 'K') // baseboard shadow top line
  rect(g, 0, 13, 16, 3, 'J') // baseboard shadow
  return g
}

export const WALL_TOP: Sprite = sprite('wallTop', wallBase())

function wallWindowGrid(): Grid {
  const g = wallBase()
  outline(g, 3, 1, 10, 9, 'K')
  rect(g, 4, 2, 8, 7, 'Z')
  px(g, 5, 2, 'z')
  px(g, 6, 2, 'z')
  rect(g, 4, 5, 8, 4, 'J')
  px(g, 6, 6, 'j')
  px(g, 9, 5, 'j')
  px(g, 11, 7, 'j')
  return g
}
export const WALL_TOP_WINDOW: Sprite = sprite('wallTopWindow', wallWindowGrid())

function wallChartGrid(): Grid {
  const g = wallBase()
  outline(g, 3, 1, 10, 8, 'K')
  rect(g, 4, 2, 8, 6, 'W')
  px(g, 5, 6, 'v')
  px(g, 6, 5, 'v')
  px(g, 7, 4, 'v')
  px(g, 8, 3, 'v')
  px(g, 9, 2, 'v')
  return g
}
export const WALL_TOP_CHART: Sprite = sprite('wallTopChart', wallChartGrid())

function wallClockBase(): Grid {
  const g = wallBase()
  filledCircle(g, 8, 5, [1, 3, 4, 4, 4, 4, 4, 3, 1], 'I')
  filledCircle(g, 8, 5, [0, 2, 3, 3, 3, 3, 3, 2, 0], 'i')
  px(g, 8, 5, 'K')
  return g
}
const wallClockAGrid = wallClockBase()
vline(wallClockAGrid, 8, 2, 3, 'K')
hline(wallClockAGrid, 8, 5, 3, 'K')
const wallClockBGrid = wallClockBase()
vline(wallClockBGrid, 8, 3, 2, 'K')
px(wallClockBGrid, 9, 6, 'K')
px(wallClockBGrid, 10, 7, 'K')
export const WALL_TOP_CLOCK: Sprite = spriteFrames('wallTopClock', [wallClockAGrid, wallClockBGrid], 60)

function wallLogoGrid(): Grid {
  const g = wallBase()
  outline(g, 4, 2, 8, 7, 'K')
  rect(g, 5, 3, 6, 5, 'I')
  vline(g, 6, 4, 3, 'a')
  hline(g, 6, 4, 2, 'a')
  hline(g, 6, 6, 2, 'a')
  px(g, 7, 5, 'a')
  vline(g, 9, 4, 3, 'a')
  hline(g, 9, 4, 2, 'a')
  hline(g, 9, 6, 2, 'a')
  px(g, 10, 5, 'a')
  px(g, 6, 7, 'A')
  return g
}
export const WALL_TOP_LOGO: Sprite = sprite('wallTopLogo', wallLogoGrid())

function wallCertGrid(): Grid {
  const g = wallBase()
  outline(g, 3, 1, 10, 9, 'K')
  rect(g, 4, 2, 8, 7, 'W')
  hline(g, 5, 3, 6, 'G')
  hline(g, 5, 5, 6, 'G')
  hline(g, 5, 7, 4, 'G')
  px(g, 10, 8, 'a')
  px(g, 11, 8, 'a')
  px(g, 10, 9, 'A')
  return g
}
export const WALL_TOP_CERT: Sprite = sprite('wallTopCert', wallCertGrid())

function wallSideGrid(left: boolean): Grid {
  const g = grid(16, 16, '.')
  const x0 = left ? 0 : 12
  rect(g, x0, 0, 4, 12, 'x')
  rect(g, x0, 12, 4, 1, 'K')
  rect(g, x0, 13, 4, 3, 'J')
  return g
}
export const WALL_SIDE_L: Sprite = sprite('wallSideL', wallSideGrid(true))
export const WALL_SIDE_R: Sprite = sprite('wallSideR', wallSideGrid(false))

function wallDoorGrid(): Grid {
  const g = wallBase()
  rect(g, 3, 0, 10, 12, 'C')
  outline(g, 3, 0, 10, 12, 'd')
  rect(g, 4, 1, 8, 10, 'c')
  px(g, 10, 6, 'a')
  px(g, 10, 7, 'A')
  return g
}
export const WALL_TOP_DOOR: Sprite = sprite('wallTopDoor', wallDoorGrid())

// ---------------------------------------------------------------------------
// FURNITURE — K outline, transparent ('.') background, front-facing.
// ---------------------------------------------------------------------------

function makeDeskGrid(): Grid {
  const g = grid(32, 16, '.')
  rect(g, 1, 0, 30, 4, 'c')
  outline(g, 1, 0, 30, 4, 'K')
  rect(g, 1, 4, 30, 8, 'C')
  outline(g, 1, 4, 30, 8, 'K')
  rect(g, 2, 12, 3, 4, 'd')
  outline(g, 2, 12, 3, 4, 'K')
  rect(g, 27, 12, 3, 4, 'd')
  outline(g, 27, 12, 3, 4, 'K')
  rect(g, 4, 1, 4, 2, 'i')
  outline(g, 4, 1, 4, 2, 'K')
  return g
}
export const DESK: Sprite = sprite('desk', makeDeskGrid())

function monitorBaseGrid(on: boolean): Grid {
  const g = grid(16, 16, '.')
  outline(g, 1, 1, 14, 9, 'K')
  rect(g, 2, 2, 12, 7, on ? 'U' : 'k')
  if (on) hline(g, 2, 2, 12, 'j')
  rect(g, 6, 10, 4, 2, 'K')
  rect(g, 4, 12, 8, 2, 'K')
  return g
}
const monitorOnAGrid = monitorBaseGrid(true)
px(monitorOnAGrid, 4, 8, 'v')
px(monitorOnAGrid, 6, 7, 'v')
px(monitorOnAGrid, 8, 6, 'v')
px(monitorOnAGrid, 10, 5, 'v')
px(monitorOnAGrid, 11, 4, 'v')
const monitorOnBGrid = monitorBaseGrid(true)
px(monitorOnBGrid, 4, 7, 'v')
px(monitorOnBGrid, 6, 6, 'v')
px(monitorOnBGrid, 8, 5, 'v')
px(monitorOnBGrid, 10, 4, 'v')
export const MONITOR_ON: Sprite = spriteFrames('monitorOn', [monitorOnAGrid, monitorOnBGrid], 20)
export const MONITOR_OFF: Sprite = sprite('monitorOff', monitorBaseGrid(false))

function makeChairGrid(): Grid {
  const g = grid(16, 16, '.')
  rect(g, 3, 2, 10, 8, 'k')
  outline(g, 3, 2, 10, 8, 'K')
  rect(g, 4, 10, 8, 2, 'k')
  outline(g, 4, 10, 8, 2, 'K')
  rect(g, 7, 12, 2, 2, 'K')
  px(g, 3, 14, 'K')
  px(g, 6, 15, 'K')
  px(g, 9, 15, 'K')
  px(g, 12, 14, 'K')
  return g
}
export const CHAIR: Sprite = sprite('chair', makeChairGrid())

function makeChairLeatherGrid(): Grid {
  const g = grid(16, 16, '.')
  rect(g, 2, 1, 12, 9, 'R')
  outline(g, 2, 1, 12, 9, 'K')
  rect(g, 3, 2, 10, 7, 'r')
  rect(g, 4, 10, 8, 2, 'R')
  outline(g, 4, 10, 8, 2, 'K')
  rect(g, 7, 12, 2, 2, 'K')
  px(g, 3, 14, 'K')
  px(g, 6, 15, 'K')
  px(g, 9, 15, 'K')
  px(g, 12, 14, 'K')
  return g
}
export const CHAIR_LEATHER: Sprite = sprite('chairLeather', makeChairLeatherGrid())

function makeDeskExecGrid(): Grid {
  const g = grid(48, 32, '.')
  rect(g, 2, 0, 44, 8, 'C')
  outline(g, 2, 0, 44, 8, 'K')
  rect(g, 2, 8, 44, 16, 'd')
  outline(g, 2, 8, 44, 16, 'K')
  vline(g, 16, 9, 14, 'C')
  vline(g, 32, 9, 14, 'C')
  rect(g, 4, 24, 5, 6, 'd')
  outline(g, 4, 24, 5, 6, 'K')
  rect(g, 39, 24, 5, 6, 'd')
  outline(g, 39, 24, 5, 6, 'K')
  rect(g, 18, 2, 10, 3, 'a')
  outline(g, 18, 2, 10, 3, 'K')
  vline(g, 40, 2, 4, 'K')
  rect(g, 39, 0, 3, 2, 'j')
  return g
}
export const DESK_EXEC: Sprite = sprite('deskExec', makeDeskExecGrid())

function makePlantGrid(): Grid {
  const g = grid(16, 32, '.')
  rect(g, 4, 26, 8, 6, 'C')
  outline(g, 4, 26, 8, 6, 'K')
  hline(g, 4, 26, 8, 'd')
  rect(g, 3, 10, 10, 12, 'v')
  outline(g, 3, 10, 10, 12, 'K')
  rect(g, 3, 10, 4, 12, 'V')
  px(g, 6, 12, 'l')
  px(g, 9, 14, 'l')
  px(g, 7, 18, 'l')
  px(g, 10, 20, 'l')
  rect(g, 7, 22, 2, 4, 'V')
  return g
}
export const PLANT: Sprite = sprite('plant', makePlantGrid())

function makeWaterCoolerGrid(bubbleUp: boolean): Grid {
  const g = grid(16, 32, '.')
  rect(g, 3, 20, 10, 11, 'I')
  outline(g, 3, 20, 10, 11, 'K')
  rect(g, 4, 21, 8, 4, 'i')
  rect(g, 4, 2, 8, 18, 'Z')
  outline(g, 4, 2, 8, 18, 'K')
  rect(g, 5, 3, 6, 16, 'z')
  px(g, 8, bubbleUp ? 6 : 14, 'W')
  return g
}
export const WATER_COOLER: Sprite = spriteFrames(
  'waterCooler',
  [makeWaterCoolerGrid(false), makeWaterCoolerGrid(true)],
  30,
)

function makeCoffeeMachineGrid(steamHigh: boolean): Grid {
  const g = grid(16, 32, '.')
  rect(g, 3, 10, 10, 18, 'k')
  outline(g, 3, 10, 10, 18, 'K')
  rect(g, 4, 11, 8, 6, 'g')
  px(g, 5, 13, 'r')
  rect(g, 7, 16, 2, 3, 'K')
  rect(g, 6, 24, 4, 3, 'i')
  outline(g, 6, 24, 4, 3, 'K')
  if (steamHigh) {
    px(g, 7, 6, 'W')
    px(g, 8, 8, 'W')
    px(g, 9, 5, 'W')
  } else {
    px(g, 7, 9, 'W')
    px(g, 8, 11, 'W')
    px(g, 9, 8, 'W')
  }
  return g
}
export const COFFEE_MACHINE: Sprite = spriteFrames(
  'coffeeMachine',
  [makeCoffeeMachineGrid(false), makeCoffeeMachineGrid(true)],
  16,
)

function makePrinterGrid(paperOut: boolean): Grid {
  const g = grid(16, 16, '.')
  rect(g, 1, 4, 14, 9, 'I')
  outline(g, 1, 4, 14, 9, 'K')
  rect(g, 2, 5, 12, 4, 'i')
  rect(g, 3, 2, 10, 2, 'G')
  outline(g, 3, 2, 10, 2, 'K')
  if (paperOut) rect(g, 5, 12, 6, 2, 'G')
  return g
}
export const PRINTER: Sprite = spriteFrames('printer', [makePrinterGrid(false), makePrinterGrid(true)], 40)

function makeBookshelfGrid(): Grid {
  const g = grid(16, 32, '.')
  rect(g, 1, 1, 14, 30, 'C')
  outline(g, 1, 1, 14, 30, 'K')
  hline(g, 1, 8, 14, 'd')
  hline(g, 1, 16, 14, 'd')
  hline(g, 1, 24, 14, 'd')
  const rowsOfBooks: Array<{ y: number; h: number; colors: string[] }> = [
    { y: 2, h: 6, colors: ['r', 'u', 'v', 'a', 'q', 'r', 'u'] },
    { y: 9, h: 7, colors: ['u', 'v', 'a', 'q', 'r', 'u'] },
    { y: 17, h: 7, colors: ['v', 'a', 'q', 'r', 'u', 'v'] },
    { y: 25, h: 6, colors: ['a', 'q', 'r', 'u', 'v', 'a'] },
  ]
  for (const row of rowsOfBooks) {
    let x = 2
    for (const c of row.colors) {
      vline(g, x, row.y, row.h, c)
      x += 2
    }
  }
  return g
}
export const BOOKSHELF: Sprite = sprite('bookshelf', makeBookshelfGrid())

function makeFilingCabinetGrid(): Grid {
  const g = grid(16, 32, '.')
  rect(g, 2, 1, 12, 30, 'I')
  outline(g, 2, 1, 12, 30, 'K')
  for (let i = 0; i < 4; i++) {
    const y = 2 + i * 7
    rect(g, 3, y, 10, 6, 'G')
    outline(g, 3, y, 10, 6, 'K')
    rect(g, 7, y + 2, 2, 1, 'K')
  }
  return g
}
export const FILING_CABINET: Sprite = sprite('filingCabinet', makeFilingCabinetGrid())

function makeWhiteboardGrid(): Grid {
  const g = grid(32, 16, '.')
  rect(g, 1, 1, 30, 13, 'I')
  outline(g, 1, 1, 30, 13, 'K')
  rect(g, 2, 2, 28, 11, 'W')
  px(g, 5, 4, 'r')
  px(g, 6, 5, 'r')
  px(g, 7, 4, 'r')
  px(g, 8, 6, 'r')
  px(g, 9, 5, 'r')
  px(g, 15, 10, 'u')
  px(g, 17, 8, 'u')
  px(g, 19, 6, 'u')
  px(g, 21, 4, 'u')
  px(g, 20, 4, 'u')
  px(g, 21, 5, 'u')
  return g
}
export const WHITEBOARD: Sprite = sprite('whiteboard', makeWhiteboardGrid())

function makeTickerGrid(shift: number): Grid {
  const g = grid(48, 16, '.')
  rect(g, 1, 3, 46, 10, 'K')
  const innerX = 2
  const innerW = 44
  const points: Array<[number, number, string]> = [
    [2, 6, 'j'],
    [3, 6, 'j'],
    [2, 9, 'j'],
    [3, 9, 'j'],
    [8, 7, 'v'],
    [9, 7, 'v'],
    [8, 8, 'v'],
    [9, 8, 'v'],
    [14, 6, 'r'],
    [15, 6, 'r'],
    [14, 9, 'r'],
    [15, 9, 'r'],
    [20, 7, 'j'],
    [21, 7, 'j'],
    [26, 6, 'v'],
    [27, 6, 'v'],
    [32, 7, 'r'],
    [33, 7, 'r'],
    [38, 6, 'j'],
    [39, 6, 'j'],
  ]
  for (const [x, y, c] of points) {
    const nx = innerX + (((x - innerX - shift) % innerW) + innerW) % innerW
    px(g, nx, y, c)
  }
  return g
}
export const TICKER: Sprite = spriteFrames('ticker', [makeTickerGrid(0), makeTickerGrid(1), makeTickerGrid(2)], 6)

function makeVendingMachineGrid(): Grid {
  const g = grid(16, 32, '.')
  rect(g, 1, 1, 14, 30, 'r')
  outline(g, 1, 1, 14, 30, 'K')
  rect(g, 1, 1, 14, 2, 'R')
  rect(g, 2, 4, 12, 18, 'z')
  outline(g, 2, 4, 12, 18, 'K')
  const snackColors = ['a', 'u', 'v', 'a', 'u', 'v']
  let i = 0
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      px(g, 4 + col * 6, 7 + row * 5, snackColors[i % snackColors.length])
      i++
    }
  }
  rect(g, 5, 25, 6, 3, 'R')
  outline(g, 5, 25, 6, 3, 'K')
  return g
}
export const VENDING_MACHINE: Sprite = sprite('vendingMachine', makeVendingMachineGrid())

function makeElevatorGrid(lit: boolean): Grid {
  const g = grid(32, 32, '.')
  rect(g, 1, 1, 30, 30, 'I')
  outline(g, 1, 1, 30, 30, 'K')
  rect(g, 3, 3, 12, 26, 'G')
  outline(g, 3, 3, 12, 26, 'K')
  rect(g, 17, 3, 12, 26, 'G')
  outline(g, 17, 3, 12, 26, 'K')
  vline(g, 16, 3, 26, 'K')
  rect(g, 13, 0, 6, 3, 'K')
  px(g, 15, 1, lit ? 'a' : 'k')
  px(g, 16, 1, lit ? 'a' : 'k')
  return g
}
export const ELEVATOR: Sprite = spriteFrames('elevator', [makeElevatorGrid(true), makeElevatorGrid(false)], 45)

function makeRopeBarrierGrid(): Grid {
  const g = grid(16, 16, '.')
  rect(g, 1, 4, 3, 10, 'a')
  outline(g, 1, 4, 3, 10, 'K')
  px(g, 2, 4, 'A')
  rect(g, 12, 4, 3, 10, 'a')
  outline(g, 12, 4, 3, 10, 'K')
  px(g, 13, 4, 'A')
  hline(g, 4, 8, 8, 'r')
  px(g, 6, 9, 'r')
  px(g, 9, 9, 'r')
  return g
}
export const ROPE_BARRIER: Sprite = sprite('ropeBarrier', makeRopeBarrierGrid())

function makeLockSignGrid(): Grid {
  const g = grid(16, 16, '.')
  rect(g, 7, 8, 2, 8, 'i')
  outline(g, 7, 8, 2, 8, 'K')
  rect(g, 3, 2, 10, 7, 'i')
  outline(g, 3, 2, 10, 7, 'K')
  rect(g, 6, 4, 4, 3, 'a')
  outline(g, 6, 4, 4, 3, 'K')
  vline(g, 7, 3, 2, 'K')
  vline(g, 9, 3, 2, 'K')
  hline(g, 7, 3, 3, 'K')
  px(g, 8, 5, 'K')
  return g
}
export const LOCK_SIGN: Sprite = sprite('lockSign', makeLockSignGrid())

function makeTrophyCaseGrid(): Grid {
  const g = grid(32, 32, '.')
  rect(g, 1, 1, 30, 30, 'I')
  outline(g, 1, 1, 30, 30, 'K')
  rect(g, 3, 3, 26, 26, 'z')
  outline(g, 3, 3, 26, 26, 'K')
  hline(g, 3, 14, 26, 'I')
  hline(g, 3, 22, 26, 'I')
  for (const x of [7, 15, 23]) {
    rect(g, x, 8, 3, 5, 'a')
    outline(g, x, 8, 3, 5, 'K')
  }
  for (const x of [7, 15, 23]) {
    rect(g, x, 16, 3, 5, 'a')
    outline(g, x, 16, 3, 5, 'K')
  }
  for (const x of [7, 15, 23]) {
    rect(g, x, 24, 3, 4, 'a')
    outline(g, x, 24, 3, 4, 'K')
  }
  return g
}
export const TROPHY_CASE: Sprite = sprite('trophyCase', makeTrophyCaseGrid())

function makeSofaGrid(): Grid {
  const g = grid(32, 16, '.')
  rect(g, 1, 1, 30, 6, 'u')
  outline(g, 1, 1, 30, 6, 'K')
  rect(g, 1, 7, 30, 5, 'u')
  outline(g, 1, 7, 30, 5, 'K')
  vline(g, 11, 7, 5, 'f')
  vline(g, 21, 7, 5, 'f')
  rect(g, 3, 12, 2, 3, 'K')
  rect(g, 15, 12, 2, 3, 'K')
  rect(g, 27, 12, 2, 3, 'K')
  return g
}
export const SOFA: Sprite = sprite('sofa', makeSofaGrid())

function makeTrashCanGrid(): Grid {
  const g = grid(16, 16, '.')
  rect(g, 4, 5, 8, 10, 'g')
  outline(g, 4, 5, 8, 10, 'K')
  rect(g, 3, 4, 10, 2, 'I')
  outline(g, 3, 4, 10, 2, 'K')
  px(g, 6, 3, 'i')
  px(g, 7, 2, 'i')
  px(g, 9, 3, 'i')
  return g
}
export const TRASH_CAN: Sprite = sprite('trashCan', makeTrashCanGrid())

function makeFaxGrid(): Grid {
  const g = grid(16, 16, '.')
  rect(g, 2, 6, 12, 8, 'G')
  outline(g, 2, 6, 12, 8, 'K')
  rect(g, 3, 7, 10, 3, 'I')
  px(g, 12, 8, 'j')
  rect(g, 4, 4, 8, 2, 'I')
  outline(g, 4, 4, 8, 2, 'K')
  return g
}
export const FAX: Sprite = sprite('fax', makeFaxGrid())

function makeDoorMatGrid(): Grid {
  // Flat, no outline: a striped mat inset within the tile so the floor's
  // own colour still shows at the edges.
  const g = grid(16, 16, '.')
  rect(g, 2, 4, 12, 8, 'C')
  for (let y = 4; y < 12; y++) {
    if ((y - 4) % 2 === 0) hline(g, 2, y, 12, 'd')
  }
  return g
}
export const DOOR_MAT: Sprite = sprite('doorMat', makeDoorMatGrid())

function makePaperStackGrid(): Grid {
  const g = grid(16, 16, '.')
  rect(g, 3, 8, 10, 3, 'i')
  outline(g, 3, 8, 10, 3, 'K')
  rect(g, 4, 5, 9, 3, 'W')
  outline(g, 4, 5, 9, 3, 'K')
  rect(g, 3, 3, 8, 2, 'i')
  outline(g, 3, 3, 8, 2, 'K')
  hline(g, 3, 10, 10, 'G')
  hline(g, 4, 7, 9, 'G')
  return g
}
export const PAPER_STACK: Sprite = sprite('paperStack', makePaperStackGrid())

function makeShadowGrid(): Grid {
  // No outline: a soft dark ellipse under a character.
  const g = grid(16, 8, '.')
  rect(g, 4, 2, 8, 4, 'J')
  rect(g, 5, 1, 6, 1, 'J')
  rect(g, 5, 6, 6, 1, 'J')
  rect(g, 2, 3, 2, 2, 'J')
  rect(g, 12, 3, 2, 2, 'J')
  return g
}
export const SHADOW: Sprite = sprite('shadow', makeShadowGrid())

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const TILES: Record<string, Sprite> = {
  floorCarpet: FLOOR_CARPET,
  floorCarpetAlt: FLOOR_CARPET_ALT,
  floorBeige: FLOOR_BEIGE,
  floorTile: FLOOR_TILE,
  floorWood: FLOOR_WOOD,
  floorMarble: FLOOR_MARBLE,
  floorRugCenter: FLOOR_RUG_CENTER,
  floorRugEdgeN: FLOOR_RUG_EDGE_N,
  floorRugEdgeS: FLOOR_RUG_EDGE_S,
  floorRugEdgeE: FLOOR_RUG_EDGE_E,
  floorRugEdgeW: FLOOR_RUG_EDGE_W,
  floorRugCornerNw: FLOOR_RUG_CORNER_NW,
  floorRugCornerNe: FLOOR_RUG_CORNER_NE,
  floorRugCornerSw: FLOOR_RUG_CORNER_SW,
  floorRugCornerSe: FLOOR_RUG_CORNER_SE,
  wallTop: WALL_TOP,
  wallTopWindow: WALL_TOP_WINDOW,
  wallTopChart: WALL_TOP_CHART,
  wallTopClock: WALL_TOP_CLOCK,
  wallTopLogo: WALL_TOP_LOGO,
  wallTopCert: WALL_TOP_CERT,
  wallSideL: WALL_SIDE_L,
  wallSideR: WALL_SIDE_R,
  wallTopDoor: WALL_TOP_DOOR,
  desk: DESK,
  monitorOn: MONITOR_ON,
  monitorOff: MONITOR_OFF,
  chair: CHAIR,
  chairLeather: CHAIR_LEATHER,
  deskExec: DESK_EXEC,
  plant: PLANT,
  waterCooler: WATER_COOLER,
  coffeeMachine: COFFEE_MACHINE,
  printer: PRINTER,
  bookshelf: BOOKSHELF,
  filingCabinet: FILING_CABINET,
  whiteboard: WHITEBOARD,
  ticker: TICKER,
  vendingMachine: VENDING_MACHINE,
  elevator: ELEVATOR,
  ropeBarrier: ROPE_BARRIER,
  lockSign: LOCK_SIGN,
  trophyCase: TROPHY_CASE,
  sofa: SOFA,
  trashCan: TRASH_CAN,
  fax: FAX,
  doorMat: DOOR_MAT,
  paperStack: PAPER_STACK,
  shadow: SHADOW,
}
