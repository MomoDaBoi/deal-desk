import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { SortTask as SortTaskShape } from '../engine/types'
import { ROLE_BG } from './ui'

type SortItem = SortTaskShape['items'][number]

/** Hold this long before a press becomes a drag, in ms. */
const HOLD_MS = 150
/** Pointer movement past this (px) before the hold timer fires cancels the hold. */
const MOVE_CANCEL_PX = 6
/** Id used for the tray drop zone in the pointer hit-test map. */
const TRAY_ZONE = 'tray'

/**
 * Tap-to-place bucket sorting, plus a pointer drag-and-drop enhancement
 * layered on top. Tap a chip in the tray (or in a bucket) to pick it up,
 * then tap a bucket to drop it there, or tap the tray to send a held chip
 * back — that still works exactly as before. Press and hold a chip
 * (~150ms) to lift it instead: dragging it over a bucket highlights that
 * bucket, and releasing over a bucket (or the tray) places it there.
 * Chips are real `<button>`s so Enter/Space works for free; the tray and
 * bucket drop-zones are non-button containers (so a chip button never ends
 * up nested inside another button) that still act as tap targets via a
 * click handler and, for keyboard users, their own role="button" affordance.
 */
export function SortTask({
  task,
  items,
  value,
  onChange,
  disabled,
}: {
  task: SortTaskShape
  items: SortTaskShape['items']
  value: Record<string, string>
  onChange: (next: Record<string, string>) => void
  disabled?: boolean
}) {
  const [held, setHeld] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [hoverZone, setHoverZone] = useState<string | null>(null)

  const zoneRefs = useRef<Map<string, HTMLDivElement>>(new Map())
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

  const tray = items.filter((it) => value[it.id] === undefined)
  const byBucket = (bucketId: string) => items.filter((it) => value[it.id] === bucketId)

  function registerZone(id: string, el: HTMLDivElement | null) {
    if (el) zoneRefs.current.set(id, el)
    else zoneRefs.current.delete(id)
  }

  function zoneAt(x: number, y: number): string | null {
    for (const [id, el] of zoneRefs.current) {
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id
    }
    return null
  }

  function placeItem(id: string, bucketId: string | null) {
    if (disabled) return
    if (bucketId === null) {
      const next = { ...value }
      delete next[id]
      onChange(next)
    } else {
      onChange({ ...value, [id]: bucketId })
    }
  }

  function pickUp(id: string) {
    if (disabled) return
    setHeld((cur) => (cur === id ? null : id))
  }

  function dropInBucket(bucketId: string) {
    if (disabled || held === null) return
    placeItem(held, bucketId)
    setHeld(null)
  }

  function returnToTray() {
    if (disabled || held === null) return
    placeItem(held, null)
    setHeld(null)
  }

  function handleChipClick(id: string) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    pickUp(id)
  }

  function clearHoldTimer() {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
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
      setHoverZone(zoneAt(e.clientX, e.clientY))
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
    setHoverZone(zoneAt(e.clientX, e.clientY))
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
      const draggedId = dragId
      if (commit && draggedId !== null) {
        const zone = zoneAt(e.clientX, e.clientY)
        if (zone === TRAY_ZONE) placeItem(draggedId, null)
        else if (zone !== null) placeItem(draggedId, zone)
      }
      setDragId(null)
      setHoverZone(null)
    } else if (movedRef.current) {
      suppressClickRef.current = true
    }
    movedRef.current = false
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-xs uppercase tracking-[0.14em] text-muted font-semibold mb-2">In tray</div>
        <DropZone
          onDrop={returnToTray}
          active={held !== null}
          hovered={dragId !== null && hoverZone === TRAY_ZONE}
          disabled={disabled}
          label="Return held item to tray"
          className="border-dashed"
          zoneRef={(el) => registerZone(TRAY_ZONE, el)}
        >
          {tray.length === 0 && held === null && <span className="text-sm text-muted px-1">All placed.</span>}
          {held !== null && tray.length === 0 && <span className="text-sm text-muted px-1">Tap to return here</span>}
          {tray.map((it) => (
            <Chip
              key={it.id}
              item={it}
              held={held === it.id}
              dragging={dragId === it.id}
              disabled={disabled}
              onClick={() => handleChipClick(it.id)}
              onPointerDown={(e) => handlePointerDown(it.id, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => endPointer(e, true)}
              onPointerCancel={(e) => endPointer(e, false)}
            />
          ))}
        </DropZone>
      </div>

      {held !== null && <div className="text-center text-sm text-muted animate-pulse">Tap a bucket to place it</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-flow-col sm:auto-cols-fr">
        {task.buckets.map((bucket) => {
          const bucketItems = byBucket(bucket.id)
          return (
            <DropZone
              key={bucket.id}
              onDrop={() => dropInBucket(bucket.id)}
              active={held !== null}
              hovered={dragId !== null && hoverZone === bucket.id}
              disabled={disabled}
              label={`Place in ${bucket.label}`}
              className={ROLE_BG[bucket.role ?? 'neutral']}
              zoneRef={(el) => registerZone(bucket.id, el)}
            >
              <div className="w-full">
                <div className="font-semibold">{bucket.label}</div>
                {bucket.hint && <div className="text-xs text-muted font-normal">{bucket.hint}</div>}
              </div>
              <div className="flex flex-wrap gap-2 min-h-11 w-full">
                {bucketItems.length === 0 && <span className="text-xs text-muted font-normal">Empty</span>}
                {bucketItems.map((it) => (
                  <Chip
                    key={it.id}
                    item={it}
                    held={held === it.id}
                    dragging={dragId === it.id}
                    disabled={disabled}
                    onClick={() => handleChipClick(it.id)}
                    onPointerDown={(e) => handlePointerDown(it.id, e)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={(e) => endPointer(e, true)}
                    onPointerCancel={(e) => endPointer(e, false)}
                  />
                ))}
              </div>
            </DropZone>
          )
        })}
      </div>
    </div>
  )
}

/**
 * A tap target for dropping a held chip. Not a native `<button>` — it holds
 * chip `<button>`s as children, and a button cannot contain a button — but
 * it is still reachable and operable from the keyboard via role="button".
 * `hovered` highlights it while a pointer drag is over it.
 */
function DropZone({
  onDrop,
  active,
  hovered,
  disabled,
  label,
  className = '',
  zoneRef,
  children,
}: {
  onDrop: () => void
  active: boolean
  hovered?: boolean
  disabled?: boolean
  label: string
  className?: string
  zoneRef?: (el: HTMLDivElement | null) => void
  children: ReactNode
}) {
  return (
    <div
      ref={zoneRef}
      role="button"
      tabIndex={disabled || !active ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled || !active}
      onClick={onDrop}
      onKeyDown={(e) => {
        if (disabled || !active) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onDrop()
        }
      }}
      className={`min-h-11 w-full text-left rounded-xl border p-3 flex flex-col flex-wrap gap-2 items-start transition
        ${className}
        ${active ? 'ring-2 ring-ink/40 cursor-pointer' : ''}
        ${hovered ? 'ring-2 ring-ink' : ''}`}
    >
      {children}
    </div>
  )
}

function Chip({
  item,
  held,
  dragging,
  disabled,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  item: SortItem
  held: boolean
  dragging?: boolean
  disabled?: boolean
  onClick: () => void
  onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void
  onPointerMove?: (e: React.PointerEvent<HTMLButtonElement>) => void
  onPointerUp?: (e: React.PointerEvent<HTMLButtonElement>) => void
  onPointerCancel?: (e: React.PointerEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      disabled={disabled}
      aria-pressed={held}
      className={`inline-flex items-center min-h-11 px-3 rounded-lg border text-sm font-medium transition select-none
        ${ROLE_BG[item.role ?? 'neutral']}
        ${held ? 'ring-2 ring-ink scale-[1.04] shadow-lg' : ''}
        ${dragging ? 'relative z-10 scale-105 shadow-lg touch-none' : ''}`}
    >
      {item.label}
    </button>
  )
}
