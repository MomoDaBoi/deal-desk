# Sprite authoring spec

Every sprite in the game is a text grid in a `.ts` file under this folder.
No image files. Read `../palette.ts` first: each character in a grid is a
key from `PALETTE`, and `.` is transparent. Unknown characters fail the
`validateSprite` test.

## Style

Kairosoft / Game Dev Story. Bright, chunky, cheerful. Rules:

- Outline every character and piece of furniture in `K` (never pure black).
  Floor and wall tiles have no outline.
- One shade per hue: base colour plus ONE shadow colour (e.g. `s` skin with
  `S` shadow, `c` wood with `C`/`d`). No gradients, no dithering except on
  large flat floors where a sparse 2-pixel `M`-on-`m` pattern is fine.
- Chibi proportions for people: big head, tiny body. A character is
  **16 wide x 20 tall**, anchored at the bottom centre. Head is roughly the
  top 10 rows, body rows 10-17, feet rows 18-19. Leave column 0 and column
  15 mostly transparent so characters do not touch when adjacent.
- Faces: two `K` pixels for eyes, no nose, mouth only on portraits.
- Tiles are **16x16**. Furniture may be multiples of 16 in either direction
  (a desk is 32x16, a tall bookshelf 16x32). Top-left is the anchor.
- Portraits are **32x32**, head and shoulders, on a transparent background.
- Screens that are "on" use `j`/`U`; screens off use `k`.

## Formats

```ts
import type { Sprite } from '../sprite'

export const PLANT: Sprite = {
  name: 'plant',
  frames: [[
    '................',
    // 16 rows of 16 chars
  ]],
}
```

Character sets (`characters.ts`) export this shape:

```ts
export interface CharacterSet {
  name: string
  down: Sprite   // frames: [stand, walkA, walkB]  (facing the camera)
  up: Sprite     // frames: [stand, walkA, walkB]
  left: Sprite   // frames: [stand, walkA, walkB]; right is mirrored automatically
  sit: Sprite    // frames: [typingA, typingB], facing down, seated at a desk
}
```

Walk cycle: `stand` has both feet together; `walkA` left foot forward and
right arm forward; `walkB` the opposite. Bob the head one pixel down on
`walkA` and `walkB` compared with `stand` so the walk reads at 3x scale.

Portrait sets (`portraits.ts`):

```ts
export interface PortraitSet {
  name: string
  /** Same size frames; index 0 mouth closed, 1 mouth open. */
  neutral: Sprite
  pleased: Sprite
  annoyed: Sprite
  smug: Sprite
}
```

## Checklist before you finish

- Every row in every frame has the same length; every frame the same height.
- Only palette keys and `.` appear.
- Run `npx vitest run src/pixel` and fix anything it reports.
- Export everything from the module's index so the game can import it.
