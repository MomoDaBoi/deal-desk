import { useMemo, useState } from 'react'
import { RUNG_TITLES, type Rung } from '../engine/types'
import { formatComp, rungStatus } from '../engine/scoring'
import { missionsForRung } from '../missions'
import { useProgress } from '../store/progress'
import { useMentorMode } from '../store/settings'
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

const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const CARD_SIZE = 1080

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawCard(ctx: CanvasRenderingContext2D, opts: { rung: Rung; passedCount: number; totalComp: number }) {
  const size = CARD_SIZE
  ctx.clearRect(0, 0, size, size)

  // Background
  ctx.fillStyle = '#0b0f17'
  ctx.fillRect(0, 0, size, size)

  ctx.textBaseline = 'alphabetic'

  // Wordmark: "Deal" in ink, "Desk" in revenue green.
  ctx.font = `900 64px ${FONT_STACK}`
  const dealText = 'Deal'
  const deskText = 'Desk'
  const dealWidth = ctx.measureText(dealText).width
  const deskWidth = ctx.measureText(deskText).width
  const startX = size / 2 - (dealWidth + deskWidth) / 2
  ctx.textAlign = 'left'
  ctx.fillStyle = '#e6edf7'
  ctx.fillText(dealText, startX, 150)
  ctx.fillStyle = '#22c55e'
  ctx.fillText(deskText, startX + dealWidth, 150)

  ctx.textAlign = 'center'

  // Title
  ctx.fillStyle = '#e6edf7'
  ctx.font = `800 88px ${FONT_STACK}`
  ctx.fillText(RUNG_TITLES[opts.rung], size / 2, 300)

  // Lifetime comp
  ctx.font = `700 32px ${FONT_STACK}`
  ctx.fillStyle = '#8b98ad'
  ctx.fillText('LIFETIME COMP', size / 2, 400)

  ctx.font = `800 96px ${FONT_STACK}`
  ctx.fillStyle = '#22c55e'
  ctx.fillText(formatComp(opts.totalComp), size / 2, 510)

  // Rung squares row (passed rungs out of 5)
  const square = 64
  const gap = 24
  const rowWidth = square * 5 + gap * 4
  let sx = size / 2 - rowWidth / 2
  const sy = 590
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < opts.passedCount ? '#22c55e' : '#263145'
    roundRectPath(ctx, sx, sy, square, square, 12)
    ctx.fill()
    sx += square + gap
  }

  // Caption
  ctx.font = `600 38px ${FONT_STACK}`
  ctx.fillStyle = '#e6edf7'
  ctx.fillText(CAPTIONS[opts.rung], size / 2, 780)

  // Footer
  ctx.font = `500 26px ${FONT_STACK}`
  ctx.fillStyle = '#8b98ad'
  ctx.fillText('A game, not investment advice.', size / 2, 1020)
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
    drawCard(ctx, opts)
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Could not render the image.'))
    }, 'image/png')
  })
}

/** Reads the progress store; no props. Draws and shares a satirical, personal-data-free score card. */
export function ShareCard() {
  const best = useProgress((s) => s.best)
  const mentor = useMentorMode()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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
        a.click()
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
        {busy ? 'Rendering…' : 'Share'}
      </Button>
      {error && <p className="text-xs text-cost">{error}</p>}
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Deal Desk share card preview"
          className="h-[120px] w-[120px] rounded-lg border border-line object-cover"
        />
      )}
    </div>
  )
}
