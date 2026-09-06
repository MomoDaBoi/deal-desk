/**
 * Grid pathfinding for the office. Pure: no DOM, no React, so it is
 * testable. 4-neighbour BFS on a boolean walkability grid; returns the
 * list of tiles from the start (exclusive) to the goal (inclusive), or
 * null when the goal is unreachable. Grids are small (11 x ~45) so BFS is
 * plenty and always yields a shortest path.
 */
export interface Tile {
  x: number
  y: number
}

export type Walkable = (x: number, y: number) => boolean

export function findPath(width: number, height: number, walkable: Walkable, from: Tile, to: Tile): Tile[] | null {
  if (from.x === to.x && from.y === to.y) return []
  if (to.x < 0 || to.y < 0 || to.x >= width || to.y >= height) return null
  if (!walkable(to.x, to.y)) return null
  const key = (x: number, y: number) => y * width + x
  const prev = new Int32Array(width * height).fill(-1)
  const seen = new Uint8Array(width * height)
  const queue: number[] = [key(from.x, from.y)]
  seen[key(from.x, from.y)] = 1
  const dirs = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ]
  let head = 0
  while (head < queue.length) {
    const cur = queue[head++]
    const cx = cur % width
    const cy = (cur - cx) / width
    if (cx === to.x && cy === to.y) {
      const path: Tile[] = []
      let k = cur
      while (k !== key(from.x, from.y)) {
        const x = k % width
        path.push({ x, y: (k - x) / width })
        k = prev[k]
      }
      return path.reverse()
    }
    for (const [dx, dy] of dirs) {
      const nx = cx + dx
      const ny = cy + dy
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      const nk = key(nx, ny)
      if (seen[nk] || !walkable(nx, ny)) continue
      seen[nk] = 1
      prev[nk] = cur
      queue.push(nk)
    }
  }
  return null
}

/** Nearest walkable tile to `to` (Manhattan), used when a tap lands on furniture. */
export function nearestWalkable(width: number, height: number, walkable: Walkable, to: Tile, maxRadius = 3): Tile | null {
  if (walkable(to.x, to.y)) return to
  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dy) !== r) continue
        const x = to.x + dx
        const y = to.y + dy
        if (x < 0 || y < 0 || x >= width || y >= height) continue
        if (walkable(x, y)) return { x, y }
      }
    }
  }
  return null
}
