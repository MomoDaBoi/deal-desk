import { useEffect, useRef, useState } from 'react'
import type { OrderItem } from '../engine/types'
import { ROLE_BG } from './ui'

/** Hold this long before a press becomes a drag, in ms. */
const HOLD_MS = 150
/** Pointer movement past this (px) before the hold timer fires cancels the hold. */
const MOVE_CANCEL_PX = 6

/**
 * Tap-to-swap reordering, plus a pointer drag-and-drop enhancement layered
 * on top. Tap one chip to pick it up, tap another to swap — that still
 * works exactly as before, as do the up/down arrows. Press and hold a chip
 * (~150ms) to lift it instead: dragging up or down over other chips
 * reorders the list live, and releasing commits the new order.
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
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOrder, setDragOrder] = useState<string[] | null>(null)

  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const holdTimerRef = useRef<number | null>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const movedRef = useRef(false)
  const isDraggingRef = useRef(false)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    return () => {
      if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current)
    }
  }, [])

  function clearHoldTimer() {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }

  function computeTargetIndex(order: string[], pointerY: number): number {
    for (let i = 0; i < order.length; i++) {
      const el = chipRefs.current.get(order[i])
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (pointerY < rect.top + rect.height / 2) return i
    }
    return order.length - 1
  }

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

  function handleClick(i: number) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    tap(i)
  }

  function handlePointerDown(id: string, e: React.PointerEvent<HTMLButtonElement>) {
    if (disabled) return
    if (activePointerIdRef.current !== null) return
    activePointerIdRef.current = e.pointerId
    startPosRef.current = { x: e.clientX, y: e.clientY }
    movedRef.current = false
    isDraggingRef.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
    clearHoldTimer()
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null
      isDraggingRef.current = true
      setHeld(null)
      setDragId(id)
      setDragOrder(items.map((it) => it.id))
    }, HOLD_MS)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (activePointerIdRef.current !== e.pointerId) return
    const dx = e.clientX - startPosRef.current.x
    const dy = e.clientY - startPosRef.current.y
    if (!isDraggingRef.current) {
      if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
        movedRef.current = true
        clearHoldTimer()
      }
      return
    }
    const draggingId = dragId
    if (draggingId === null) return
    setDragOrder((cur) => {
      if (!cur) return cur
      const from = cur.indexOf(draggingId)
      const to = computeTargetIndex(cur, e.clientY)
      if (from === -1 || to === from) return cur
      const next = cur.slice()
      next.splice(from, 1)
      next.splice(to, 0, draggingId)
      return next
    })
  }

  function endPointer(e: React.PointerEvent<HTMLButtonElement>, commit: boolean) {
    if (activePointerIdRef.current !== e.pointerId) return
    activePointerIdRef.current = null
    clearHoldTimer()
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      suppressClickRef.current = true
      if (commit && dragOrder) {
        const next = dragOrder
          .map((id) => items.find((it) => it.id === id))
          .filter((it): it is OrderItem => it !== undefined)
        onChange(next)
      }
      setDragId(null)
      setDragOrder(null)
    } else if (movedRef.current) {
      suppressClickRef.current = true
    }
    movedRef.current = false
  }

  const displayedItems = dragOrder
    ? dragOrder.map((id) => items.find((it) => it.id === id)).filter((it): it is OrderItem => it !== undefined)
    : items
  const dragging = dragId !== null

  return (
    <ol className="flex flex-col gap-2" aria-label="Reorder the items">
      {displayedItems.map((it, i) => {
        const isHeld = held === i
        const isDraggingThis = dragId === it.id
        return (
          <li key={it.id} className="flex items-stretch gap-2">
            <button
              type="button"
              ref={(el) => {
                if (el) chipRefs.current.set(it.id, el)
                else chipRefs.current.delete(it.id)
              }}
              onClick={() => handleClick(i)}
              onPointerDown={(e) => handlePointerDown(it.id, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => endPointer(e, true)}
              onPointerCancel={(e) => endPointer(e, false)}
              disabled={disabled}
              aria-pressed={isHeld}
              className={`flex-1 min-w-0 min-h-12 px-4 py-2 px-chip border-l-4 text-left font-medium flex flex-wrap items-center gap-x-3 gap-y-1 transition select-none
                ${ROLE_BG[it.role ?? 'neutral']}
                ${isHeld ? 'outline outline-3 outline-ink -outline-offset-3' : ''}
                ${isDraggingThis ? 'relative z-10 shadow-lg touch-none' : ''}
                ${held !== null && !isHeld ? 'opacity-90' : ''}`}
            >
              <span className="w-6 shrink-0 px-num text-xs text-muted">{i + 1}</span>
              <span className="min-w-0 break-words text-ink">{it.label}</span>
              {isHeld && <span className="ml-auto shrink-0 px-eyebrow text-muted">tap another to swap</span>}
            </button>
            <div className="flex flex-col gap-1 shrink-0">
              <button
                type="button"
                aria-label={`Move ${it.label} up`}
                onClick={() => move(i, i - 1)}
                disabled={disabled || dragging || i === 0}
                className="px-btn min-w-11 px-2 font-pixel text-[10px]"
              >
                ▲
              </button>
              <button
                type="button"
                aria-label={`Move ${it.label} down`}
                onClick={() => move(i, i + 1)}
                disabled={disabled || dragging || i === displayedItems.length - 1}
                className="px-btn min-w-11 px-2 font-pixel text-[10px]"
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
