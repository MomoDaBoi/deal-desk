import type { Sprite } from '../sprite'

/**
 * Portraits: 32x32 head-and-shoulders busts, transparent background, K
 * outline, Kairosoft-style big head + expressive brows + visible mouth.
 * Frame 0 is mouth closed, frame 1 is mouth open (talking); only the mouth
 * region (rows 18-31) differs between the two frames of a given Sprite.
 *
 * The grids below are assembled from small column "spans" rather than
 * typed out row by row, which keeps every row exactly 32 characters wide
 * by construction (see `row`) and keeps hair/outline/shoulders byte-for-
 * byte identical across the two mouth frames of one expression.
 */

export interface PortraitSet {
  name: string
  /** Same size frames; index 0 mouth closed, 1 mouth open. */
  neutral: Sprite
  pleased: Sprite
  annoyed: Sprite
  smug: Sprite
}

const SIZE = 32

/** [fromCol, toCol, char] inclusive column range filled with one palette key. */
type Span = [number, number, string]

/** A patch overlays spans onto one row of an already-built grid. */
interface Patch {
  row: number
  spans: Span[]
}

/** Build one 32-wide row string from spans, transparent ('.') elsewhere. */
function row(spans: Span[]): string {
  const cells = new Array<string>(SIZE).fill('.')
  for (const [from, to, ch] of spans) {
    for (let i = from; i <= to; i++) cells[i] = ch
  }
  return cells.join('')
}

/** Apply patches onto a grid, overwriting only the given row/column cells. */
function withPatches(base: readonly string[], patches: readonly Patch[]): string[] {
  const out = base.slice()
  for (const p of patches) {
    const cells = out[p.row].split('')
    for (const [from, to, ch] of p.spans) {
      for (let i = from; i <= to; i++) cells[i] = ch
    }
    out[p.row] = cells.join('')
  }
  return out
}

/**
 * Shared face geometry for rows 9-22 (ears, eye sockets, cheeks, mouth
 * bed, chin, neck) parameterised only by skin tone. Brows/eyes/mouth are
 * overlaid on top per expression via patches.
 */
function faceRows(skin: string, skinShadow: string): Span[][] {
  const ear: Span[] = [
    [7, 7, 'K'],
    [8, 8, skinShadow],
    [9, 22, skin],
    [23, 23, skinShadow],
    [24, 24, 'K'],
  ]
  const cheek: Span[] = [
    [8, 8, 'K'],
    [9, 22, skin],
    [23, 23, 'K'],
  ]
  const mouthBedUpper: Span[] = [
    [9, 9, 'K'],
    [10, 21, skin],
    [22, 22, 'K'],
  ]
  const mouthBedLower: Span[] = [
    [10, 10, 'K'],
    [11, 20, skin],
    [21, 21, 'K'],
  ]
  const chin: Span[] = [
    [11, 11, 'K'],
    [12, 19, skinShadow],
    [20, 20, 'K'],
  ]
  const neck: Span[] = [
    [13, 13, 'K'],
    [14, 17, skin],
    [18, 18, 'K'],
  ]
  return [
    ear, ear, ear, ear, ear, ear, ear, ear, // rows 9-16
    cheek, cheek, // rows 17-18
    mouthBedUpper, // row 19
    mouthBedLower, // row 20
    chin, // row 21
    neck, // row 22
  ]
}

/** Assemble a full 32-row base grid: hair/forehead (0-8) + face (9-22) + body (23-31). */
function assemble(skin: string, skinShadow: string, top: Span[][], body: Span[][]): string[] {
  const face = faceRows(skin, skinShadow)
  return [...top, ...face, ...body].map(row)
}

// ---------------------------------------------------------------------
// Reusable brow / eye / mouth patch builders. Columns: left brow/eye
// 10-13 / 11-12, right brow/eye 18-21 / 19-20, mirrored about col 15/16.
// ---------------------------------------------------------------------

function browLevel(): Patch[] {
  return [{ row: 10, spans: [[10, 13, 'K'], [18, 21, 'K']] }]
}

function browUp(): Patch[] {
  return [{ row: 9, spans: [[10, 13, 'K'], [18, 21, 'K']] }]
}

/** Inner ends angled down (anger/annoyance); optional extra spans on row 11 (e.g. a frown crease). */
function browAngledDown(extra: Span[] = []): Patch[] {
  return [
    { row: 10, spans: [[10, 12, 'K'], [19, 21, 'K']] },
    { row: 11, spans: [[13, 13, 'K'], [18, 18, 'K'], ...extra] },
  ]
}

/** Inner ends raised (worry/concern) rather than down. */
function browConcerned(): Patch[] {
  return [
    { row: 10, spans: [[10, 12, 'K'], [19, 21, 'K']] },
    { row: 9, spans: [[13, 13, 'K'], [18, 18, 'K']] },
  ]
}

/** One brow raised higher than the other. */
function browSmug(raiseLeft: boolean): Patch[] {
  return raiseLeft
    ? [{ row: 9, spans: [[10, 13, 'K']] }, { row: 10, spans: [[18, 21, 'K']] }]
    : [{ row: 10, spans: [[10, 13, 'K']] }, { row: 9, spans: [[18, 21, 'K']] }]
}

function eyeNormal(): Patch[] {
  return [{ row: 12, spans: [[11, 12, 'K'], [19, 20, 'K']] }]
}

/** Bigger, rounder eyes (two rows tall) for a wide-eyed look. */
function eyeWide(): Patch[] {
  return [
    { row: 11, spans: [[11, 12, 'K'], [19, 20, 'K']] },
    { row: 12, spans: [[11, 12, 'K'], [19, 20, 'K']] },
  ]
}

/** Tired bags under the eyes. */
function eyeBags(): Patch[] {
  return [{ row: 13, spans: [[11, 12, 'k'], [19, 20, 'k']] }]
}

/** Glasses: K rings with U lenses, replacing plain eye pixels. */
function glasses(): Patch[] {
  return [
    { row: 11, spans: [[10, 13, 'K'], [18, 21, 'K']] },
    {
      row: 12,
      spans: [
        [10, 10, 'K'],
        [11, 12, 'U'],
        [13, 18, 'K'],
        [19, 20, 'U'],
        [21, 21, 'K'],
      ],
    },
  ]
}

interface MouthPatches {
  closed: Patch[]
  open: Patch[]
}

/** Flat, level mouth (neutral, or annoyed with a flat rather than curled mouth). */
function mouthFlat(): MouthPatches {
  return {
    closed: [{ row: 19, spans: [[14, 17, 'K']] }],
    open: [{ row: 20, spans: [[14, 17, 'k']] }],
  }
}

/** A K smile curve, corners up at row 19, dip at row 20. */
function mouthSmile(): MouthPatches {
  return {
    closed: [
      { row: 19, spans: [[13, 14, 'K'], [17, 18, 'K']] },
      { row: 20, spans: [[15, 16, 'K']] },
    ],
    open: [{ row: 20, spans: [[14, 17, 'k']] }],
  }
}

/** Half a smile, curled up to one side only. */
function mouthSmug(rightUp: boolean, wide = false): MouthPatches {
  const corner: Span = rightUp ? (wide ? [19, 20, 'K'] : [18, 19, 'K']) : wide ? [11, 12, 'K'] : [12, 13, 'K']
  const line: Span = rightUp ? (wide ? [12, 18, 'K'] : [13, 17, 'K']) : wide ? [13, 19, 'K'] : [14, 18, 'K']
  const lineOpen: Span = [line[0], line[1], 'k']
  return {
    closed: [{ row: 19, spans: [corner] }, { row: 20, spans: [line] }],
    open: [{ row: 20, spans: [lineOpen] }],
  }
}

interface ExpressionDef {
  brows: Patch[]
  mouth: MouthPatches
}

function buildExpression(name: string, base: readonly string[], def: ExpressionDef): Sprite {
  const withBrows = withPatches(base, def.brows)
  const closed = withPatches(withBrows, def.mouth.closed)
  const open = withPatches(closed, def.mouth.open)
  return { name, frameTicks: 6, frames: [closed, open] }
}

function buildSet(name: string, base: readonly string[], exprs: Record<'neutral' | 'pleased' | 'annoyed' | 'smug', ExpressionDef>): PortraitSet {
  return {
    name,
    neutral: buildExpression(`${name}-neutral`, base, exprs.neutral),
    pleased: buildExpression(`${name}-pleased`, base, exprs.pleased),
    annoyed: buildExpression(`${name}-annoyed`, base, exprs.annoyed),
    smug: buildExpression(`${name}-smug`, base, exprs.smug),
  }
}

// ---------------------------------------------------------------------
// MD: 60s, grey-white slicked-back hair, charcoal suit, gold tie, tiny
// cufflink.
// ---------------------------------------------------------------------

const MD_TOP: Span[][] = [
  [],
  [[12, 12, 'K'], [13, 18, 'o'], [19, 19, 'K']],
  [[9, 9, 'K'], [10, 21, 'o'], [22, 22, 'K']],
  [[8, 8, 'K'], [9, 22, 'o'], [23, 23, 'K']],
  [[7, 7, 'K'], [8, 9, 'o'], [10, 21, 's'], [22, 23, 'o'], [24, 24, 'K']],
  [[7, 7, 'K'], [8, 9, 'o'], [10, 21, 's'], [22, 23, 'o'], [24, 24, 'K']],
  [[7, 7, 'K'], [8, 8, 'o'], [9, 9, 'G'], [10, 21, 's'], [22, 22, 'G'], [23, 23, 'o'], [24, 24, 'K']],
  [[7, 7, 'K'], [8, 8, 'o'], [9, 9, 'G'], [10, 21, 's'], [22, 22, 'G'], [23, 23, 'o'], [24, 24, 'K']],
  [[7, 7, 'K'], [8, 8, 'o'], [9, 9, 'G'], [10, 21, 's'], [22, 22, 'G'], [23, 23, 'o'], [24, 24, 'K']],
]

const MD_BODY: Span[][] = [
  [[11, 11, 'K'], [12, 19, 'k'], [20, 20, 'K'], [13, 14, 'W'], [17, 18, 'W']],
  [[8, 8, 'K'], [9, 22, 'k'], [23, 23, 'K'], [12, 13, 'W'], [18, 19, 'W'], [15, 16, 'a']],
  [[5, 5, 'K'], [6, 25, 'k'], [26, 26, 'K'], [10, 11, 'W'], [20, 21, 'W'], [15, 16, 'a']],
  [[3, 3, 'K'], [4, 27, 'k'], [28, 28, 'K'], [15, 16, 'a']],
  [[1, 1, 'K'], [2, 29, 'k'], [30, 30, 'K'], [15, 16, 'a']],
  [[0, 2, 'K'], [3, 28, 'k'], [29, 31, 'K'], [15, 16, 'a']],
  [[0, 2, 'K'], [3, 28, 'k'], [29, 31, 'K'], [15, 16, 'a']],
  [[0, 2, 'K'], [3, 28, 'k'], [29, 31, 'K'], [15, 16, 'a'], [3, 6, 'W'], [25, 28, 'W']],
  [[0, 2, 'K'], [3, 28, 'k'], [29, 31, 'K'], [15, 16, 'a'], [3, 6, 'W'], [25, 28, 'W'], [4, 5, 'A'], [26, 27, 'A']],
]

const MD_BASE = assemble('s', 'S', MD_TOP, MD_BODY)

export const MD_PORTRAIT: PortraitSet = buildSet('md', MD_BASE, {
  neutral: { brows: [...eyeNormal(), ...browLevel()], mouth: mouthFlat() },
  pleased: { brows: [...eyeNormal(), ...browUp()], mouth: mouthSmile() },
  annoyed: { brows: [...eyeNormal(), ...browAngledDown([[14, 15, 'k']])], mouth: mouthFlat() },
  smug: { brows: [...eyeNormal(), ...browSmug(true)], mouth: mouthSmug(true) },
})

// ---------------------------------------------------------------------
// HR: neat brown hair, glasses, pink blazer, a fixed corporate smile
// (the mouth never changes; only brows/eyes do).
// ---------------------------------------------------------------------

const HR_TOP: Span[][] = [
  [],
  [[13, 13, 'K'], [14, 17, 'H'], [18, 18, 'K']],
  [[10, 10, 'K'], [11, 20, 'H'], [21, 21, 'K']],
  [[8, 8, 'K'], [9, 22, 'H'], [23, 23, 'K']],
  [[7, 7, 'K'], [8, 10, 'H'], [11, 20, 's'], [21, 23, 'H'], [24, 24, 'K']],
  [[7, 7, 'K'], [8, 10, 'H'], [11, 20, 's'], [21, 23, 'H'], [24, 24, 'K']],
  [[7, 7, 'K'], [8, 9, 'H'], [10, 21, 's'], [22, 23, 'H'], [24, 24, 'K']],
  [[7, 7, 'K'], [8, 9, 'H'], [10, 21, 's'], [22, 23, 'H'], [24, 24, 'K']],
  [[7, 7, 'K'], [8, 8, 'H'], [9, 22, 's'], [23, 23, 'H'], [24, 24, 'K']],
]

const HR_BODY: Span[][] = [
  [[11, 11, 'K'], [12, 19, 'p'], [20, 20, 'K'], [15, 16, 'W']],
  [[8, 8, 'K'], [9, 22, 'p'], [23, 23, 'K'], [14, 17, 'W']],
  [[5, 5, 'K'], [6, 25, 'p'], [26, 26, 'K']],
  [[3, 3, 'K'], [4, 27, 'p'], [28, 28, 'K']],
  [[1, 1, 'K'], [2, 29, 'p'], [30, 30, 'K'], [15, 16, 'K']],
  [[0, 2, 'K'], [3, 28, 'p'], [29, 31, 'K']],
  [[0, 2, 'K'], [3, 28, 'p'], [29, 31, 'K']],
  [[0, 2, 'K'], [3, 28, 'p'], [29, 31, 'K']],
  [[0, 2, 'K'], [3, 28, 'p'], [29, 31, 'K']],
]

const HR_BASE = assemble('s', 'S', HR_TOP, HR_BODY)

export const HR_PORTRAIT: PortraitSet = buildSet('hr', HR_BASE, {
  neutral: { brows: [...glasses(), ...browLevel()], mouth: mouthSmile() },
  pleased: { brows: [...glasses(), ...browUp()], mouth: mouthSmile() },
  annoyed: { brows: [...glasses(), ...browConcerned()], mouth: mouthSmile() },
  smug: { brows: [...glasses(), ...browSmug(true)], mouth: mouthSmile() },
})

// ---------------------------------------------------------------------
// Intern (the player): messy brown hair, navy suit, crooked red tie,
// wide eyes; annoyed is tired with bags under the eyes.
// ---------------------------------------------------------------------

const INTERN_TOP: Span[][] = [
  [],
  [[11, 11, 'K'], [12, 13, 'H'], [14, 14, 'K'], [17, 17, 'K'], [18, 20, 'H'], [21, 21, 'K']],
  [[9, 9, 'K'], [10, 21, 'H'], [22, 22, 'K']],
  [[8, 8, 'K'], [9, 22, 'H'], [23, 23, 'K']],
  [[7, 7, 'K'], [8, 9, 'H'], [10, 21, 's'], [22, 23, 'H'], [24, 24, 'K'], [14, 15, 'H']],
  [[7, 7, 'K'], [8, 9, 'H'], [10, 21, 's'], [22, 23, 'H'], [24, 24, 'K'], [14, 15, 'H']],
  [[7, 7, 'K'], [8, 8, 'H'], [9, 22, 's'], [23, 23, 'H'], [24, 24, 'K']],
  [[7, 7, 'K'], [8, 8, 'H'], [9, 22, 's'], [23, 23, 'H'], [24, 24, 'K']],
  [[7, 7, 'K'], [8, 8, 'H'], [9, 22, 's'], [23, 23, 'H'], [24, 24, 'K']],
]

const INTERN_BODY: Span[][] = [
  [[11, 11, 'K'], [12, 19, 'n'], [20, 20, 'K'], [13, 14, 'W'], [17, 18, 'W']],
  [[8, 8, 'K'], [9, 22, 'n'], [23, 23, 'K'], [12, 13, 'W'], [18, 19, 'W'], [15, 16, 'r']],
  [[5, 5, 'K'], [6, 25, 'n'], [26, 26, 'K'], [10, 11, 'W'], [20, 21, 'W'], [16, 17, 'r']],
  [[3, 3, 'K'], [4, 27, 'n'], [28, 28, 'K'], [14, 15, 'r']],
  [[1, 1, 'K'], [2, 29, 'n'], [30, 30, 'K'], [16, 17, 'r']],
  [[0, 2, 'N'], [3, 28, 'n'], [29, 31, 'N'], [15, 16, 'r']],
  [[0, 2, 'N'], [3, 28, 'n'], [29, 31, 'N'], [16, 17, 'r']],
  [[0, 2, 'N'], [3, 28, 'n'], [29, 31, 'N'], [15, 16, 'r']],
  [[0, 2, 'N'], [3, 28, 'n'], [29, 31, 'N'], [16, 17, 'r']],
]

const INTERN_BASE = assemble('s', 'S', INTERN_TOP, INTERN_BODY)

export const INTERN_PORTRAIT: PortraitSet = buildSet('intern', INTERN_BASE, {
  neutral: { brows: [...eyeWide(), ...browLevel()], mouth: mouthFlat() },
  pleased: { brows: [...eyeWide(), ...browUp()], mouth: mouthSmile() },
  annoyed: { brows: [...eyeWide(), ...browAngledDown(), ...eyeBags()], mouth: mouthFlat() },
  smug: { brows: [...eyeWide(), ...browSmug(true)], mouth: mouthSmug(true) },
})

// ---------------------------------------------------------------------
// Client: tech-founder CEO, brown skin, dark hair, green polo, no tie;
// smug is very smug (a wide, one-sided smirk).
// ---------------------------------------------------------------------

const CLIENT_TOP: Span[][] = [
  [],
  [[13, 13, 'K'], [14, 17, 'h'], [18, 18, 'K']],
  [[10, 10, 'K'], [11, 20, 'h'], [21, 21, 'K']],
  [[9, 9, 'K'], [10, 21, 'h'], [22, 22, 'K']],
  [[7, 7, 'K'], [8, 9, 'h'], [10, 21, 'b'], [22, 23, 'h'], [24, 24, 'K']],
  [[7, 7, 'K'], [8, 9, 'h'], [10, 21, 'b'], [22, 23, 'h'], [24, 24, 'K']],
  [[7, 7, 'K'], [8, 8, 'h'], [9, 22, 'b'], [23, 23, 'h'], [24, 24, 'K']],
  [[7, 7, 'K'], [8, 8, 'h'], [9, 22, 'b'], [23, 23, 'h'], [24, 24, 'K']],
  [[7, 7, 'K'], [8, 8, 'h'], [9, 22, 'b'], [23, 23, 'h'], [24, 24, 'K']],
]

const CLIENT_BODY: Span[][] = [
  [[11, 11, 'K'], [12, 19, 'v'], [20, 20, 'K'], [14, 14, 'V'], [17, 17, 'V']],
  [[8, 8, 'K'], [9, 22, 'v'], [23, 23, 'K'], [13, 13, 'V'], [18, 18, 'V']],
  [[5, 5, 'K'], [6, 25, 'v'], [26, 26, 'K']],
  [[3, 3, 'K'], [4, 27, 'v'], [28, 28, 'K']],
  [[1, 1, 'K'], [2, 29, 'v'], [30, 30, 'K']],
  [[0, 2, 'V'], [3, 28, 'v'], [29, 31, 'V']],
  [[0, 2, 'V'], [3, 28, 'v'], [29, 31, 'V']],
  [[0, 2, 'V'], [3, 28, 'v'], [29, 31, 'V']],
  [[0, 2, 'V'], [3, 28, 'v'], [29, 31, 'V']],
]

const CLIENT_BASE = assemble('b', 'B', CLIENT_TOP, CLIENT_BODY)

export const CLIENT_PORTRAIT: PortraitSet = buildSet('client', CLIENT_BASE, {
  neutral: { brows: [...eyeNormal(), ...browLevel()], mouth: mouthFlat() },
  pleased: { brows: [...eyeNormal(), ...browUp()], mouth: mouthSmile() },
  annoyed: { brows: [...eyeNormal(), ...browAngledDown()], mouth: mouthFlat() },
  smug: { brows: [...eyeNormal(), ...browSmug(true)], mouth: mouthSmug(true, true) },
})

export const PORTRAITS: Record<string, PortraitSet> = {
  md: MD_PORTRAIT,
  hr: HR_PORTRAIT,
  intern: INTERN_PORTRAIT,
  client: CLIENT_PORTRAIT,
}
