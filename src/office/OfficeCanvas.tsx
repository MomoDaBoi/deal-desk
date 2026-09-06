import { useEffect, useRef } from 'react'
import { MAP_W, TILE } from './map'
import type { OfficeWorld } from './world'

/** Integer pixel scale that fits the map width and shows enough rows. */
export function pickScale(w: number, h: number): number {
  const byW = Math.floor(w / (MAP_W * TILE))
  const byH = Math.floor(h / (14 * TILE))
  return Math.max(2, Math.min(5, byW, byH))
}

/**
 * Fills its parent. Runs the rAF loop, resizes with the container, and
 * turns pointer taps and arrow keys into world calls. All mutable state
 * stays on the world instance; React never re-renders for movement.
 */
export function OfficeCanvas({ world, onScale }: { world: OfficeWorld; onScale?: (scale: number, offX: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const scaleRef = useRef(2)
  const downRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const lastTapRef = useRef(0)

  function tap(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
    lastTapRef.current = performance.now()
    const rect = canvas.getBoundingClientRect()
    world.tap(world.tileAt(clientX - rect.left, clientY - rect.top, scaleRef.current, canvas.width))
  }

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const parent = canvas.parentElement!
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      const w = Math.max(160, Math.floor(parent.clientWidth))
      const h = Math.max(160, Math.floor(parent.clientHeight))
      canvas.width = w
      canvas.height = h
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const s = pickScale(w, h)
      scaleRef.current = s
      world.viewH = h / s
      onScale?.(s, world.offsetX(s, w))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(parent)

    let raf = 0
    let last = performance.now()
    let acc = 0
    const loop = (now: number) => {
      // Fixed 60Hz simulation regardless of display refresh.
      acc += Math.min(100, now - last)
      last = now
      while (acc >= 1000 / 60) {
        world.tick()
        acc -= 1000 / 60
      }
      world.draw(ctx, scaleRef.current, canvas.width, canvas.height)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const keys = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const map: Record<string, 'up' | 'down' | 'left' | 'right'> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
      }
      const dir = map[e.key]
      if (!dir) return
      e.preventDefault()
      world.nudge(dir)
    }
    window.addEventListener('keydown', keys)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('keydown', keys)
    }
  }, [world, onScale])

  return (
    <canvas
      ref={ref}
      className="block touch-none select-none"
      style={{ imageRendering: 'pixelated' }}
      onPointerDown={(e) => {
        downRef.current = { x: e.clientX, y: e.clientY, t: performance.now() }
      }}
      onPointerUp={(e) => {
        const d = downRef.current
        downRef.current = null
        if (!d) return
        // A drag (scroll attempt) is not a tap.
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12 || performance.now() - d.t > 600) return
        tap(e.currentTarget, e.clientX, e.clientY)
      }}
      onClick={(e) => {
        // Fallback for inputs that deliver click without a matching
        // pointer pair (some automation and assistive tech).
        if (performance.now() - lastTapRef.current < 400) return
        tap(e.currentTarget, e.clientX, e.clientY)
      }}
    />
  )
}
