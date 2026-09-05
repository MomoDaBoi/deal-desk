import { useState } from 'react'
import type { OrderItem } from '../engine/types'
import { ROLE_BG } from './ui'

/**
 * Tap-to-swap reordering. Tap one chip to pick it up, tap another to swap.
 * Up/down arrows also work. Drag comes later; tap is the thumb-safe default.
 */
export function OrderTask({
  items,
  onChange,
  disabled,
}: {
  items: OrderItem[]
  onChange: (next: OrderItem[]) => void
  disabled?: boolean
}) {
  const [held, setHeld] = useState<number | null>(null)

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return
    const next = items.slice()
    const [it] = next.splice(from, 1)
    next.splice(to, 0, it)
    onChange(next)
  }

  function swap(a: number, b: number) {
    const next = items.slice()
    const tmp = next[a]
    next[a] = next[b]
    next[b] = tmp
    onChange(next)
  }

  function tap(i: number) {
    if (disabled) return
    if (held === null) return setHeld(i)
    if (held === i) return setHeld(null)
    swap(held, i)
    setHeld(null)
  }

  return (
    <ol className="flex flex-col gap-2" aria-label="Reorder the items">
      {items.map((it, i) => {
        const isHeld = held === i
        return (
          <li key={it.id} className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => tap(i)}
              disabled={disabled}
              aria-pressed={isHeld}
              className={`flex-1 min-h-12 px-4 rounded-xl border text-left font-medium flex items-center gap-3 transition
                ${ROLE_BG[it.role ?? 'neutral']}
                ${isHeld ? 'ring-2 ring-ink scale-[1.02] shadow-lg' : ''}
                ${held !== null && !isHeld ? 'opacity-90' : ''}`}
            >
              <span className="w-6 text-xs font-mono text-muted tabular-nums">{i + 1}</span>
              <span className="text-ink">{it.label}</span>
              {isHeld && <span className="ml-auto text-xs text-muted">tap another to swap</span>}
            </button>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                aria-label={`Move ${it.label} up`}
                onClick={() => move(i, i - 1)}
                disabled={disabled || i === 0}
                className="min-h-11 min-w-11 rounded-lg bg-panel-2 border border-line text-muted disabled:opacity-25 active:bg-line"
              >
                ▲
              </button>
              <button
                type="button"
                aria-label={`Move ${it.label} down`}
                onClick={() => move(i, i + 1)}
                disabled={disabled || i === items.length - 1}
                className="min-h-11 min-w-11 rounded-lg bg-panel-2 border border-line text-muted disabled:opacity-25 active:bg-line"
              >
                ▼
              </button>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
