import { useMemo } from 'react'
import type { Role, WaterfallStep, WaterfallTask as WaterfallTaskType } from '../engine/types'

/**
 * Income statement as a bar chart the player fills in. Steps run left to
 * right; a `total` step draws a bar from 0 to its (absolute) value, other
 * steps draw a floating bar from the running total to the new running
 * total. The running total is computed left to right using known values
 * for shown steps and whatever the player has typed so far for blanks (0
 * while empty). A blank with nothing typed yet draws as a dashed outline
 * instead of a filled bar, so it reads as "missing" rather than "zero".
 */

const ROLE_BAR: Record<Role, string> = {
  revenue: 'bg-revenue',
  cost: 'bg-cost',
  debt: 'bg-debt',
  equity: 'bg-equity',
  cash: 'bg-cash',
  neutral: 'bg-muted',
}

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

interface StepDraw {
  step: WaterfallStep
  isBlank: boolean
  /** True when the step has a number to draw (known, or a blank the player has typed). */
  filled: boolean
  /** The value used for drawing: absolute for a total, signed delta otherwise. */
  displayValue: number
  barFrom: number
  barTo: number
}

/** Left-to-right pass computing each step's bar and the running total that feeds the next step. */
function buildDraws(task: WaterfallTaskType, value: Record<string, number | null>): StepDraw[] {
  let running = 0
  const draws: StepDraw[] = []
  for (const step of task.steps) {
    const isBlank = step.value === undefined && step.answer !== undefined
    const typed = isBlank ? (value[step.id] ?? null) : null
    const filled = !isBlank || typed !== null
    const amount = isBlank ? (typed ?? 0) : (step.value ?? 0)

    if (step.total) {
      draws.push({ step, isBlank, filled, displayValue: amount, barFrom: 0, barTo: amount })
      running = amount
    } else {
      const barFrom = running
      const barTo = running + amount
      draws.push({ step, isBlank, filled, displayValue: amount, barFrom, barTo })
      running = barTo
    }
  }
  return draws
}

export function WaterfallTask({
  task,
  value,
  onChange,
  disabled,
}: {
  task: WaterfallTaskType
  value: Record<string, number | null>
  onChange: (next: Record<string, number | null>) => void
  disabled?: boolean
}) {
  const draws = useMemo(() => buildDraws(task, value), [task, value])

  const edges = draws.flatMap((d) => [d.barFrom, d.barTo])
  const domainMin = Math.min(0, ...edges)
  const domainMax = Math.max(0, ...edges)
  const range = Math.max(1, domainMax - domainMin)

  /** % from the top of the chart area for a given data value. */
  function pct(v: number): number {
    return ((domainMax - v) / range) * 100
  }

  function setValue(id: string, n: number | null) {
    onChange({ ...value, [id]: n })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto bg-panel border border-line rounded-2xl p-3">
        <div className="relative flex items-stretch gap-2 h-56" style={{ minWidth: `${draws.length * 64}px` }}>
          <div className="absolute left-0 right-0 border-t border-line/60" style={{ top: `${pct(0)}%` }} />
          {draws.map((d) => {
            const roleClass = d.step.role ? ROLE_BAR[d.step.role] : d.step.total || d.displayValue >= 0 ? ROLE_BAR.revenue : ROLE_BAR.cost
            const missing = d.isBlank && !d.filled
            const top = pct(Math.max(d.barFrom, d.barTo))
            const height = Math.max((Math.abs(d.barTo - d.barFrom) / range) * 100, 2)
            return (
              <div key={d.step.id} className="flex flex-col items-center min-w-[56px] w-14 shrink-0">
                <div className="relative flex-1 w-full">
                  <span
                    className="absolute left-1/2 -translate-x-1/2 -translate-y-full font-mono text-xs text-ink whitespace-nowrap"
                    style={{ top: `calc(${top}% - 4px)` }}
                  >
                    {missing ? '?' : formatNumber(d.displayValue)}
                  </span>
                  <div
                    className={`absolute left-1 right-1 rounded-t-sm ${missing ? 'border-2 border-dashed border-muted bg-transparent' : roleClass}`}
                    style={{ top: `${top}%`, height: `${height}%` }}
                  />
                </div>
                <span className="mt-1 text-[10px] leading-tight text-muted text-center break-words w-full">{d.step.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {task.steps.map((step) => {
          const isBlank = step.value === undefined && step.answer !== undefined
          const raw = value[step.id]
          return (
            <div key={step.id} className="flex items-center justify-between gap-3 bg-panel border border-line rounded-xl px-4 py-2">
              <span className="text-ink text-sm">{step.label}</span>
              {isBlank ? (
                <div className="flex items-center gap-2">
                  <input
                    inputMode="decimal"
                    type="text"
                    disabled={disabled}
                    value={raw === null || raw === undefined ? '' : String(raw)}
                    onChange={(e) => setValue(step.id, parseInput(e.target.value))}
                    className="min-h-11 w-32 text-right font-mono bg-panel-2 border border-line rounded-lg px-2 text-ink disabled:opacity-60"
                  />
                  {task.unit && <span className="text-xs text-muted font-mono">{task.unit}</span>}
                </div>
              ) : (
                <span className="font-mono text-ink text-sm">
                  {formatNumber(step.value ?? 0)}
                  {task.unit ? ` ${task.unit}` : ''}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
