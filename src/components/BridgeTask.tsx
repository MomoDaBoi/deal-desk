import type { BridgeTask as BridgeTaskType, Role } from '../engine/types'
import { NumberField } from './BalanceTask'

/**
 * Two-anchor bridge: a start bar, one row per adjustment (input + a floating
 * bar showing where the running total lands), and a final row comparing the
 * live running total against the target end anchor. Stacked vertically so
 * it reads on a phone.
 */

const SOLID_BG: Record<Role, string> = {
  revenue: 'bg-revenue',
  cost: 'bg-cost',
  debt: 'bg-debt',
  equity: 'bg-equity',
  cash: 'bg-cash',
  neutral: 'bg-panel-2',
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

/** Position on the [0, scale] track as a clamped percentage. */
function pct(v: number, scale: number): number {
  return Math.max(0, Math.min(100, (v / scale) * 100))
}

export function BridgeTask({
  task,
  value,
  onChange,
  disabled,
}: {
  task: BridgeTaskType
  value: Record<string, number | null>
  onChange: (next: Record<string, number | null>) => void
  disabled?: boolean
}) {
  function setAdjustment(id: string, n: number | null) {
    onChange({ ...value, [id]: n })
  }

  const unit = task.unit ? ` ${task.unit}` : ''

  // Running totals: totals[0] = start, totals[i+1] = after adjustment i (unfilled = 0).
  const totals: number[] = [task.start.value]
  for (const adj of task.adjustments) {
    const got = value[adj.id] ?? 0
    totals.push(totals[totals.length - 1] + got)
  }
  const runningTotal = totals[totals.length - 1]

  const scale = Math.max(Math.abs(task.start.value), Math.abs(task.end.value), ...totals.map(Math.abs), 1)

  const tolerance = task.tolerance ?? 0
  const diff = runningTotal - task.end.value
  const reconciled = Math.abs(diff) <= tolerance
  const anyBlank = task.adjustments.some((a) => (value[a.id] ?? null) === null)

  return (
    <div className="flex flex-col gap-4">
      {/* Start anchor */}
      <div className="px-box p-4 flex flex-col gap-2">
        <span className="px-eyebrow text-muted">{task.start.label}</span>
        <div className="h-4 bg-shade border-2 border-bg overflow-hidden">
          <div className={`h-full ${SOLID_BG[task.start.role ?? 'equity']}`} style={{ width: `${pct(task.start.value, scale)}%` }} />
        </div>
        <span className="px-num text-[11px] text-ink">
          {formatNumber(task.start.value)}
          {unit}
        </span>
      </div>

      {/* Adjustments */}
      {task.adjustments.map((adj, i) => {
        const prevTotal = totals[i]
        const newTotal = totals[i + 1]
        const got = value[adj.id] ?? null
        const delta = got ?? 0
        const positive = delta >= 0
        const left = Math.min(pct(prevTotal, scale), pct(newTotal, scale))
        const width = Math.abs(pct(newTotal, scale) - pct(prevTotal, scale))
        return (
          <div key={adj.id} className="px-box p-4 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="flex flex-col min-w-0">
                <span className="text-ink text-sm font-semibold break-words">{adj.label}</span>
                {adj.hint && <span className="text-muted text-xs break-words">{adj.hint}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={disabled || got === null}
                  onClick={() => setAdjustment(adj.id, got === null ? null : -got)}
                  aria-label={`Flip sign for ${adj.label}`}
                  className="min-w-11 min-h-11 shrink-0 flex items-center justify-center px-num text-ink bg-panel-2 border-2 border-line disabled:opacity-60"
                >
                  {positive ? '+' : '−'}
                </button>
                <div className="w-28 max-w-full shrink-0">
                  <NumberField
                    id={adj.id}
                    value={got}
                    onChange={(n) => setAdjustment(adj.id, n)}
                    ariaLabel={adj.label}
                    disabled={disabled}
                    className="px-input w-full text-right px-num text-[11px]"
                  />
                </div>
              </div>
            </div>
            <div className="relative h-4 bg-shade border-2 border-bg overflow-hidden">
              <div
                className={`absolute inset-y-0 ${positive ? 'bg-debt' : 'bg-cash'}`}
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            </div>
          </div>
        )
      })}

      {/* Reconciliation */}
      <div className="px-box p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="px-eyebrow text-muted min-w-0 break-words">{task.end.label}</span>
          <span className={`text-sm font-semibold min-w-0 break-words ${anyBlank ? 'text-muted' : reconciled ? 'text-revenue' : 'text-cost'}`}>
            {anyBlank ? 'Fill in every bar' : reconciled ? 'Reconciled' : `Off by ${formatNumber(Math.abs(diff))}${unit}`}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-4 bg-shade border-2 border-bg overflow-hidden" aria-label="Running total">
            <div
              className={`h-full ${SOLID_BG[task.end.role ?? 'equity']}`}
              style={{ width: `${pct(runningTotal, scale)}%` }}
            />
          </div>
          <div className="h-4 bg-shade border-2 border-bg overflow-hidden" aria-label="Target">
            <div
              className={`h-full opacity-40 border-2 border-dashed border-ink ${SOLID_BG[task.end.role ?? 'equity']}`}
              style={{ width: `${pct(task.end.value, scale)}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 px-num text-[11px] text-ink">
          <span>
            {formatNumber(runningTotal)}
            {unit}
          </span>
          <span className="text-muted">
            target {formatNumber(task.end.value)}
            {unit}
          </span>
        </div>
      </div>
    </div>
  )
}
