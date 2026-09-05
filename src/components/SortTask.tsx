import { useState, type ReactNode } from 'react'
import type { SortTask as SortTaskShape } from '../engine/types'
import { ROLE_BG } from './ui'

type SortItem = SortTaskShape['items'][number]

/**
 * Tap-to-place bucket sorting. Tap a chip in the tray (or in a bucket) to
 * pick it up, then tap a bucket to drop it there, or tap the tray to send a
 * held chip back. Chips are real `<button>`s so Enter/Space works for free;
 * the tray and bucket drop-zones are non-button containers (so a chip
 * button never ends up nested inside another button) that still act as tap
 * targets via a click handler and, for keyboard users, their own
 * role="button" affordance.
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

  const tray = items.filter((it) => value[it.id] === undefined)
  const byBucket = (bucketId: string) => items.filter((it) => value[it.id] === bucketId)

  function pickUp(id: string) {
    if (disabled) return
    setHeld((cur) => (cur === id ? null : id))
  }

  function dropInBucket(bucketId: string) {
    if (disabled || held === null) return
    onChange({ ...value, [held]: bucketId })
    setHeld(null)
  }

  function returnToTray() {
    if (disabled || held === null) return
    const next = { ...value }
    delete next[held]
    onChange(next)
    setHeld(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-xs uppercase tracking-[0.14em] text-muted font-semibold mb-2">In tray</div>
        <DropZone
          onDrop={returnToTray}
          active={held !== null}
          disabled={disabled}
          label="Return held item to tray"
          className="border-dashed"
        >
          {tray.length === 0 && held === null && <span className="text-sm text-muted px-1">All placed.</span>}
          {held !== null && tray.length === 0 && <span className="text-sm text-muted px-1">Tap to return here</span>}
          {tray.map((it) => (
            <Chip key={it.id} item={it} held={held === it.id} disabled={disabled} onClick={() => pickUp(it.id)} />
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
              disabled={disabled}
              label={`Place in ${bucket.label}`}
              className={ROLE_BG[bucket.role ?? 'neutral']}
            >
              <div className="w-full">
                <div className="font-semibold">{bucket.label}</div>
                {bucket.hint && <div className="text-xs text-muted font-normal">{bucket.hint}</div>}
              </div>
              <div className="flex flex-wrap gap-2 min-h-11 w-full">
                {bucketItems.length === 0 && <span className="text-xs text-muted font-normal">Empty</span>}
                {bucketItems.map((it) => (
                  <Chip key={it.id} item={it} held={held === it.id} disabled={disabled} onClick={() => pickUp(it.id)} />
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
 */
function DropZone({
  onDrop,
  active,
  disabled,
  label,
  className = '',
  children,
}: {
  onDrop: () => void
  active: boolean
  disabled?: boolean
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div
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
        ${active ? 'ring-2 ring-ink/40 cursor-pointer' : ''}`}
    >
      {children}
    </div>
  )
}

function Chip({
  item,
  held,
  disabled,
  onClick,
}: {
  item: SortItem
  held: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      disabled={disabled}
      aria-pressed={held}
      className={`inline-flex items-center min-h-11 px-3 rounded-lg border text-sm font-medium transition select-none
        ${ROLE_BG[item.role ?? 'neutral']}
        ${held ? 'ring-2 ring-ink scale-[1.04] shadow-lg' : ''}`}
    >
      {item.label}
    </button>
  )
}
