import { useEffect, useRef, useState } from 'react'
import type { BalanceLine, BalanceTask as BalanceTaskType } from '../engine/types'
import { ROLE_BG } from './ui'

/**
 * Fill-in-the-blanks balance sheet. Which statement area a section belongs
 * to (for the live balance meter below) is inferred from its `id` via a
 * case-insensitive substring match: an id containing "asset" is assets, one
 * containing "liab" is liabilities, one containing "equity" is equity. A
 * section matching none of these still renders normally but is left out of
 * the meter.
 */

function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

/** Accepts negatives and thousands separators. Empty input clears the blank. */
function parseInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const cleaned = trimmed.replace(/,/g, '')
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null
  const n = Number(cleaned)
  return Number.isNaN(n) ? null : n
}

/** Known lines use their fixed value; blanks use what the player has typed so far (0 if empty). */
function lineValue(line: BalanceLine, value: Record<string, number | null>): number {
  if (line.value !== undefined) return line.value
  return value[line.id] ?? 0
}

/** Characters that can ever appear while typing a valid number, including mid-edit states
 * like a lone "-", a trailing ".", or a thousands separator. Anything else is rejected. */
const IN_PROGRESS_NUMBER = /^-?[\d,]*\.?\d*$/

/**
 * Controlled numeric text input that keeps exactly what the player typed on screen,
 * even mid-edit (a bare "-", a trailing ".", digits not yet followed by more digits),
 * while still reporting the parsed number (or null) up to the parent on every change.
 * The visible text only resyncs to `value` when that value changes for a reason other
 * than this field's own last `onChange` call — e.g. the parent resetting the mission.
 */
export function NumberField({
  id,
  value,
  onChange,
  unit,
  disabled,
  ariaLabel,
  className,
}: {
  id: string
  value: number | null
  onChange: (n: number | null) => void
  unit?: string
  disabled?: boolean
  ariaLabel?: string
  className?: string
}) {
  const [text, setText] = useState(value === null || value === undefined ? '' : String(value))
  const lastEmitted = useRef(value)

  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value
      setText(value === null || value === undefined ? '' : String(value))
    }
  }, [value])

  function handleChange(raw: string) {
    if (!IN_PROGRESS_NUMBER.test(raw)) return
    setText(raw)
    const n = parseInput(raw)
    lastEmitted.current = n
    onChange(n)
  }

  const input = (
    <input
      id={id}
      inputMode="decimal"
      type="text"
      disabled={disabled}
      aria-label={ariaLabel}
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      className={className ?? 'px-input px-num w-28 max-w-full shrink-0 text-right disabled:opacity-60'}
    />
  )

  if (!unit) return input

  return (
    <span className="inline-flex items-center gap-1 shrink-0 max-w-full">
      {input}
      <span className="text-muted text-sm">{unit}</span>
    </span>
  )
}

export function BalanceTask({
  task,
  value,
  onChange,
  disabled,
}: {
  task: BalanceTaskType
  value: Record<string, number | null>
  onChange: (next: Record<string, number | null>) => void
  disabled?: boolean
}) {
  function setLine(id: string, n: number | null) {
    onChange({ ...value, [id]: n })
  }

  let assetsTotal = 0
  let liabTotal = 0
  let equityTotal = 0
  for (const section of task.sections) {
    const sectionTotal = section.lines.filter((l) => !l.total).reduce((sum, l) => sum + lineValue(l, value), 0)
    const id = section.id.toLowerCase()
    if (id.includes('asset')) assetsTotal += sectionTotal
    else if (id.includes('liab')) liabTotal += sectionTotal
    else if (id.includes('equity')) equityTotal += sectionTotal
  }
  const liabEquityTotal = liabTotal + equityTotal
  // Only a real balance sheet gets the meter; ratio drills (margins, growth) do not.
  const ids = task.sections.map((sec) => sec.id.toLowerCase())
  const isBalanceSheet = ids.some((id) => id.includes('asset')) && ids.some((id) => id.includes('liab') || id.includes('equity'))
  const denom = Math.max(Math.abs(assetsTotal), Math.abs(liabEquityTotal), 1)
  const assetsPct = Math.min(100, Math.max(0, (assetsTotal / denom) * 100))
  const liabPct = Math.min(100, Math.max(0, (liabTotal / denom) * 100))
  const equityPct = Math.min(100, Math.max(0, (equityTotal / denom) * 100))
  const diff = assetsTotal - liabEquityTotal
  const balanced = diff === 0

  return (
    <div className="flex flex-col gap-4">
      {task.sections.map((section) => (
        <div key={section.id} className="px-box px-box-paper overflow-hidden">
          <div className={`px-4 py-2 border-b-2 border-[#241f3a] px-eyebrow ${ROLE_BG[section.role ?? 'neutral']}`}>
            {section.label}
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 p-4">
            {section.lines.map((line) => {
              const isBlank = line.value === undefined && line.answer !== undefined
              const raw = value[line.id]
              const lineUnit = line.unit ?? task.unit
              const totalCls = line.total ? 'font-pixel text-[10px] pt-2 border-t-2 border-[#241f3a]' : ''
              return (
                <div key={line.id} className="contents">
                  <span className={`min-w-0 break-words self-center ${totalCls}`}>{line.label}</span>
                  <span className={`shrink-0 self-center ${totalCls}`}>
                    {isBlank ? (
                      <NumberField
                        id={line.id}
                        value={raw ?? null}
                        onChange={(n) => setLine(line.id, n)}
                        unit={lineUnit}
                        disabled={disabled}
                        ariaLabel={line.label}
                      />
                    ) : (
                      <span className="px-num shrink-0 whitespace-nowrap">
                        {formatNumber(line.value ?? 0)}
                        {lineUnit ? ` ${lineUnit}` : ''}
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {isBalanceSheet && (
      <div className="px-box px-box-dark p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="px-eyebrow text-muted shrink-0">Balance check</span>
          <span className={`font-pixel text-[10px] min-w-0 break-words ${balanced ? 'text-revenue' : 'text-cost'}`}>
            {balanced ? 'Balanced' : `Off by ${formatNumber(Math.abs(diff))}${task.unit ? ` ${task.unit}` : ''}`}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-3 bg-shade border-2 border-bg flex" aria-label="Assets">
            <div className="h-full bg-cash" style={{ width: `${assetsPct}%` }} />
          </div>
          <div className="h-3 bg-shade border-2 border-bg flex" aria-label="Liabilities and equity">
            <div className="h-full bg-debt" style={{ width: `${liabPct}%` }} />
            <div className="h-full bg-equity" style={{ width: `${equityPct}%` }} />
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
