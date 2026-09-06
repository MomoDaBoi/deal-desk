/**
 * The one shared palette for every sprite and tile in the game. Sprites are
 * text grids where each character is a key in this legend and '.' means
 * transparent. Keeping a single legend (rather than a palette per sprite)
 * is what makes hand-drawn art from many authors read as one style.
 *
 * Style target: Kairosoft / Game Dev Story. Saturated, warm, chunky, a
 * dark blue-purple outline (K) rather than pure black, and one shade of
 * shadow per hue rather than smooth gradients.
 */
export const PALETTE = {
  K: '#1b1a2e', // outline, deep blue-black
  k: '#3b3a56', // dark grey-purple (deep shadow, monitors off)
  g: '#6d6f8f', // grey
  G: '#a7a9c4', // light grey
  W: '#f4f4f8', // white
  s: '#f5c9a2', // skin light
  S: '#c98a5a', // skin light, shadow
  b: '#a06a3f', // skin brown
  B: '#5a3826', // skin brown, shadow
  h: '#2b1d16', // hair, near black
  H: '#7a4a2a', // hair brown
  y: '#e8c060', // hair blond
  o: '#d0cfe0', // hair grey / white
  r: '#d94a4a', // red
  R: '#8c2b2b', // dark red
  p: '#f08aa8', // pink
  n: '#2e3a8c', // navy suit
  N: '#1c2461', // navy dark
  u: '#4a7ad9', // blue
  U: '#8ec5ff', // light blue
  t: '#3bbfb0', // teal
  T: '#1f7f78', // teal dark
  v: '#4fc46a', // green
  V: '#2a7f43', // dark green
  l: '#9be07f', // light green
  a: '#f2b632', // amber / gold
  A: '#b57a12', // dark amber
  O: '#f08a2e', // orange
  c: '#c8944e', // wood light
  C: '#8b5a2b', // wood
  d: '#5a3818', // wood dark
  m: '#d9c9a6', // floor beige
  M: '#bfa982', // floor beige dark
  f: '#506b9c', // carpet blue
  F: '#3b5079', // carpet blue dark
  e: '#b8bcc9', // floor tile light
  E: '#979bab', // floor tile dark
  w: '#e5dccb', // wall
  x: '#bfb39c', // wall trim / shadow
  z: '#a9dcf5', // glass
  Z: '#6fb3dc', // glass dark
  q: '#8a5ac7', // purple
  Q: '#5b3a8c', // dark purple
  i: '#dfe3ea', // metal light / paper
  I: '#8f96a5', // metal dark
  j: '#ffe9a8', // highlight yellow (lamps, screens on)
  J: '#241f3a', // very dark purple (night windows, shadows under furniture)
} as const

export type PaletteKey = keyof typeof PALETTE

/** Transparent marker in sprite grids. */
export const TRANSPARENT = '.'

export function colorFor(ch: string): string | null {
  if (ch === TRANSPARENT || ch === ' ') return null
  return (PALETTE as Record<string, string>)[ch] ?? null
}
