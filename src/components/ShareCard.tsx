import { useEffect, useMemo, useState } from 'react'
import { RUNG_TITLES, type Rung } from '../engine/types'
import { formatComp, rungStatus } from '../engine/scoring'
import { missionsForRung } from '../missions'
import { useProgress } from '../store/progress'
import { useMentorMode } from '../store/settings'
import { drawSprite, spriteHeight, spriteWidth } from '../pixel/sprite'
import { DEAL_DESK_LOGO, EMBLEM_PROMOTION, ICON_COIN, ICON_SHARE } from '../pixel/sprites/icons'
import { CHARACTERS } from '../pixel/sprites/characters'
import { Px } from '../pixel/Px'
import { Button } from './ui'

const RUNGS: Rung[] = [1, 2, 3, 4, 5]

/** Deterministic, satirical, one line per rung. */
const CAPTIONS: Record<Rung, string> = {
  1: 'Survived the coffee run.',
  2: 'Builds the model. Never gets the credit.',
  3: 'Fluent in comps and mild sarcasm.',
  4: 'Approves things nobody reads.',
  5: 'Takes credit for everything.',
}

const PIXEL_FONT = '"Press Start 2P", "Pixelify Sans", monospace'
const SANS_FONT = '"Pixelify Sans", ui-sans-serif, system-ui, sans-serif'
const CARD_SIZE = 1080

// Palette lifted from src/index.css so the card reads as the same world.
const COLOR_BG = '#1b1a2e'
const COLOR_PAPER = '#e5dccb'
const COLOR_PAPER_INK = '#241f3a'
const COLOR_REVENUE = '#4fc46a'
const COLOR_GOLD = '#f2b632'
const COLOR_MUTED = '#a7a9c4'

/** Subtle 8px pixel grid over the background, matching the page ground. */
function drawGrid(ctx: CanvasRenderingContext2D, size: number) {
  ctx.strokeStyle = 'rgba(255,255,255,0.035)'
  ctx.lineWidth = 1
  for (let x = 0; x <= size; x += 8) {
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, size)
    ctx.stroke()
  }
  for (let y = 0; y <= size; y += 8) {
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(size, y + 0.5)
    ctx.stroke()
  }
}

/** Greedy word-wrap using the context's current font. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function drawCard(ctx: CanvasRenderingContext2D, opts: { rung: Rung; passedCount: number; totalComp: number }) {
  const size = CARD_SIZE
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, size, size)

  // Background + pixel grid.
  ctx.fillStyle = COLOR_BG
  ctx.fillRect(0, 0, size, size)
  drawGrid(ctx, size)

  ctx.textBaseline = 'alphabetic'

  // Logo, 8x scale, centred at the top.
  const logoScale = 8
  const logoW = spriteWidth(DEAL_DESK_LOGO) * logoScale
  drawSprite(ctx, DEAL_DESK_LOGO, (size - logoW) / 2, 40, logoScale, 0)

  // Dialog box: cream fill, dark 12px border, on the right.
  const dialogX = 300
  const dialogY = 230
  const dialogW = size - dialogX - 60
  const dialogH = 560
  const border = 12
  ctx.fillStyle = COLOR_PAPER_INK
  ctx.fillRect(dialogX, dialogY, dialogW, dialogH)
  ctx.fillStyle = COLOR_PAPER
  ctx.fillRect(dialogX + border, dialogY + border, dialogW - border * 2, dialogH - border * 2)

  const padX = 40
  const innerW = dialogW - padX * 2
  let cursorY = dialogY + border + 70

  // Rung title, pixel font.
  ctx.textAlign = 'left'
  ctx.fillStyle = COLOR_PAPER_INK
  ctx.font = `56px ${PIXEL_FONT}`
  ctx.fillText(RUNG_TITLES[opts.rung].toUpperCase(), dialogX + padX, cursorY)
  cursorY += 40

  // Divider.
  ctx.fillStyle = COLOR_PAPER_INK
  ctx.fillRect(dialogX + padX, cursorY, innerW, 4)
  cursorY += 56

  // Caption, sans font, word-wrapped.
  ctx.font = `32px ${SANS_FONT}`
  const captionLines = wrapText(ctx, CAPTIONS[opts.rung], innerW)
  for (const line of captionLines) {
    ctx.fillText(line, dialogX + padX, cursorY)
    cursorY += 44
  }
  cursorY += 30

  // Rung progress pips (segmented pixel bar, 5 cells).
  const pipW = 60
  const pipH = 24
  const pipGap = 10
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < opts.passedCount ? COLOR_REVENUE : '#bfb39c'
    ctx.fillRect(dialogX + padX + i * (pipW + pipGap), cursorY, pipW, pipH)
  }
  cursorY += pipH + 56

  // Lifetime comp, coin icon beside the number.
  ctx.font = `20px ${PIXEL_FONT}`
  ctx.fillStyle = '#5b5670'
  ctx.fillText('LIFETIME COMP', dialogX + padX, cursorY)
  cursorY += 30
  const coinScale = 6
  const coinH = spriteHeight(ICON_COIN) * coinScale
  drawSprite(ctx, ICON_COIN, dialogX + padX, cursorY, coinScale, 0)
  ctx.font = `44px ${PIXEL_FONT}`
  ctx.fillStyle = COLOR_GOLD
  ctx.textBaseline = 'middle'
  ctx.fillText(formatComp(opts.totalComp), dialogX + padX + spriteWidth(ICON_COIN) * coinScale + 20, cursorY + coinH / 2)
  ctx.textBaseline = 'alphabetic'

  // Player sprite, 10x scale, on the left, vertically centred on the dialog.
  const charScale = 10
  const charSprite = CHARACTERS.player.down
  const charH = spriteHeight(charSprite) * charScale
  drawSprite(ctx, charSprite, 90, dialogY + dialogH / 2 - charH / 2, charScale, 0)

  // Promotion emblem, 6x scale, tucked in the bottom-right corner.
  const emblemScale = 6
  const emblemW = spriteWidth(EMBLEM_PROMOTION) * emblemScale
  const emblemH = spriteHeight(EMBLEM_PROMOTION) * emblemScale
  drawSprite(ctx, EMBLEM_PROMOTION, size - emblemW - 40, size - emblemH - 40, emblemScale, 0)

  // Footer.
  ctx.textAlign = 'center'
  ctx.font = `18px ${SANS_FONT}`
  ctx.fillStyle = COLOR_MUTED
  ctx.fillText('A game, not investment advice.', size / 2, size - 20)
}

function renderCardBlob(opts: { rung: Rung; passedCount: number; totalComp: number }): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = CARD_SIZE
    canvas.height = CARD_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Canvas is not supported here.'))
      return
    }
    // Wait for the pixel + sans webfonts to be ready so the title and
    // caption do not fall back to a system font on first paint. If a font
    // never loads, the font stack's own fallback (monospace / sans-serif)
    // still renders something legible.
    document.fonts.ready
      .catch(() => undefined)
      .then(() => {
        drawCard(ctx, opts)
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Could not render the image.'))
        }, 'image/png')
      })
  })
}

/** Reads the progress store; no props. Draws and shares a satirical, personal-data-free score card. */
export function ShareCard() {
  const best = useProgress((s) => s.best)
  const mentor = useMentorMode()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const { currentRung, passedCount, totalComp } = useMemo(() => {
    const status = Object.fromEntries(
      RUNGS.map((r) => [r, rungStatus(missionsForRung(r, mentor), best)]),
    ) as Record<Rung, ReturnType<typeof rungStatus>>
    function unlocked(r: Rung): boolean {
      if (r === 1) return true
      return status[(r - 1) as Rung].passed
    }
    const current = RUNGS.slice()
      .reverse()
      .find((r) => unlocked(r) && !status[r].passed) ?? 5
    const passed = RUNGS.filter((r) => status[r].passed).length
    const total = Object.values(best).reduce((a, b) => a + b, 0)
    return { currentRung: current, passedCount: passed, totalComp: total }
  }, [best, mentor])

  async function handleShare() {
    setError(null)
    setBusy(true)
    try {
      const blob = await renderCardBlob({ rung: currentRung, passedCount, totalComp })
      const url = URL.createObjectURL(blob)
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      const file = new File([blob], 'deal-desk.png', { type: 'image/png' })
      const text = `I'm ${RUNG_TITLES[currentRung]} at Deal Desk.`
      const canShareFiles = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
      if (canShareFiles && navigator.share) {
        await navigator.share({ files: [file], title: 'Deal Desk', text })
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = 'deal-desk.png'
        document.body.appendChild(a)
        a.click()
        a.remove()
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        // Player closed the share sheet. Not an error.
      } else {
        setError('Could not share that. Try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button type="button" variant="ghost" onClick={handleShare} disabled={busy}>
        <Px sprite={ICON_SHARE} scale={2} />
        {busy ? 'Rendering…' : 'Share'}
      </Button>
      {error && <p className="text-xs text-cost">{error}</p>}
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Deal Desk share card preview"
          className="h-[120px] w-[120px] border-[3px] border-line-hi object-cover"
        />
      )}
    </div>
  )
}
