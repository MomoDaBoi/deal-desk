import { useEffect, useRef } from 'react'
import { drawSprite, frameAt, spriteHeight, spriteWidth, type Sprite } from './sprite'

/**
 * A sprite as an inline element. `scale` is integer pixels per art pixel.
 * When `animate` is set the frames loop using the sprite's frameTicks.
 * Pass `frame` to pin a specific frame (e.g. a portrait expression).
 */
export function Px({
  sprite,
  scale = 3,
  frame,
  animate = false,
  className = '',
  title,
}: {
  sprite: Sprite
  scale?: number
  frame?: number
  animate?: boolean
  className?: string
  title?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const w = spriteWidth(sprite) * scale
  const h = spriteHeight(sprite) * scale

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    let tick = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawSprite(ctx, sprite, 0, 0, scale, frame ?? (animate ? frameAt(sprite, tick) : 0))
    }
    draw()
    if (animate && frame === undefined && sprite.frames.length > 1) {
      const loop = () => {
        tick++
        if (tick % (sprite.frameTicks ?? 8) === 0) draw()
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }
    return () => cancelAnimationFrame(raf)
  }, [sprite, scale, frame, animate])

  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      className={`inline-block align-middle shrink-0 ${className}`}
      style={{ width: w, height: h, imageRendering: 'pixelated' }}
      role="img"
      aria-label={title ?? sprite.name}
    />
  )
}
