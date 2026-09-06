import { useEffect, useRef } from 'react'
import { drawSprite, frameAt, mirror, spriteHeight, spriteWidth } from '../pixel/sprite'
import { CHARACTERS } from '../pixel/sprites/characters'
import { CLOUD, LOGO_BIG, MOON, SKYLINE_A, SKYLINE_B, SKYLINE_C, SKYLINE_D, STAR_SMALL } from '../pixel/sprites/props'
import { ICON_COG } from '../pixel/sprites/icons'
import { Px } from '../pixel/Px'
import { useMusic } from '../lib/music'
import { playSound } from '../lib/sounds'

export const TITLE_SEEN_KEY = 'deal-desk:title-seen'

/** Seeded pseudo-random so the sky is the same every visit. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const SKYLINE = [SKYLINE_A, SKYLINE_C, SKYLINE_B, SKYLINE_D, SKYLINE_C, SKYLINE_A, SKYLINE_D, SKYLINE_B]

/**
 * Title card: night skyline, drifting clouds, the intern walking to work,
 * and a blinking prompt. Shown once per browser session before the office.
 */
export function Title({ onStart, onSettings }: { onStart: () => void; onSettings: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useMusic('office')

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const parent = canvas.parentElement!
    const ctx = canvas.getContext('2d')!
    const rand = rng(7)
    const stars = Array.from({ length: 60 }, () => ({ x: rand(), y: rand() * 0.55, phase: Math.floor(rand() * 60) }))
    const clouds = Array.from({ length: 4 }, (_, i) => ({ x: rand(), y: 0.12 + i * 0.09, speed: 0.05 + rand() * 0.05 }))
    const walker = CHARACTERS.player
    const walkerRight = mirror(walker.left)
    let raf = 0
    let t = 0
    let walkerX = -40
    let dir = 1

    const draw = () => {
      const w = Math.floor(parent.clientWidth)
      const h = Math.floor(parent.clientHeight)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      const s = Math.max(2, Math.min(5, Math.floor(w / 240)))
      ctx.imageSmoothingEnabled = false
      // Sky bands.
      const bands = ['#14132a', '#1b1a2e', '#241f3a', '#2e2a4d']
      bands.forEach((c, i) => {
        ctx.fillStyle = c
        ctx.fillRect(0, (h * i) / 4, w, h / 4 + 1)
      })
      // Stars twinkle on a slow cycle.
      for (const st of stars) {
        if (((t + st.phase) >> 5) % 3 === 0) continue
        drawSprite(ctx, STAR_SMALL, st.x * w, st.y * h, s)
      }
      drawSprite(ctx, MOON, w - 24 * s - 16, 16, s)
      for (const c of clouds) {
        c.x += c.speed / w
        if (c.x > 1.1) c.x = -0.15
        drawSprite(ctx, CLOUD, c.x * w, c.y * h, s)
      }
      // Skyline along the bottom, tiled.
      const groundY = h - 20 * s
      const slice = spriteWidth(SKYLINE_A) * s
      const n = Math.ceil(w / slice) + 1
      for (let i = 0; i < n; i++) {
        const b = SKYLINE[i % SKYLINE.length]
        drawSprite(ctx, b, i * slice, groundY - spriteHeight(b) * s, s)
      }
      // Street.
      ctx.fillStyle = '#3b3a56'
      ctx.fillRect(0, groundY, w, 20 * s)
      ctx.fillStyle = '#1b1a2e'
      ctx.fillRect(0, groundY, w, 2 * s)
      for (let x = 0; x < w; x += 12 * s) ctx.fillRect(x, groundY + 10 * s, 6 * s, s)
      // The intern, late for work, walking across.
      walkerX += dir * 0.7 * s
      if (walkerX > w + 40) {
        dir = -1
        walkerX = w + 40
      } else if (walkerX < -40) {
        dir = 1
        walkerX = -40
      }
      const sprite = dir > 0 ? walkerRight : walker.left
      const cycle = [1, 0, 2, 0]
      drawSprite(ctx, sprite, walkerX, groundY - 18 * s, s, cycle[Math.floor(t / 7) % 4])
      // Logo.
      const lw = spriteWidth(LOGO_BIG)
      const ls = Math.max(2, Math.min(6, Math.floor((w * 0.8) / lw)))
      const bob = Math.round(Math.sin(t / 30) * 2) * ls
      drawSprite(ctx, LOGO_BIG, Math.floor((w - lw * ls) / 2), Math.floor(h * 0.22) + bob, ls, frameAt(LOGO_BIG, t))
      t++
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      className="h-full relative overflow-hidden select-none cursor-pointer"
      onClick={() => {
        playSound('open')
        onStart()
      }}
      role="button"
      aria-label="Start"
    >
      <canvas ref={ref} className="block w-full h-full" style={{ imageRendering: 'pixelated' }} />
      <div className="absolute inset-x-0 top-[46%] text-center pointer-events-none">
        <p className="px-eyebrow text-ink/90 px-shadow">Investment banking, from intern to MD</p>
      </div>
      <div className="absolute inset-x-0 top-[57%] text-center pointer-events-none">
        <span className="px-h2 px-shadow text-gold px-caret">Tap to clock in</span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onSettings()
        }}
        aria-label="Settings"
        className="absolute top-3 right-3 px-btn min-w-11 px-2"
      >
        <Px sprite={ICON_COG} scale={2} title="Settings" />
      </button>
      <p className="absolute bottom-2 inset-x-0 text-center text-[10px] text-muted/70 pointer-events-none">A game, not investment advice.</p>
    </div>
  )
}
