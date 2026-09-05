import type { FootballFieldTask as FootballFieldTaskType, Role } from '../engine/types'

/**
 * Football field: one horizontal range bar per row, with two stacked native
 * range sliders (Low / High) beneath it. Dragging Low past High pushes High
 * up to match (and vice versa), so low <= high always. An optional embedded
 * question renders after the rows as a set of full-width choice buttons.
 */

const ROLE_FILL: Record<Role, string> = {
  revenue: 'bg-revenue',
  cost: 'bg-cost',
  debt: 'bg-debt',
  equity: 'bg-equity',
  cash: 'bg-cash',
  neutral: 'bg-ink/50',
}

const ROLE_VAR: Record<Role, string> = {
  revenue: 'var(--color-revenue)',
  cost: 'var(--color-cost)',
  debt: 'var(--color-debt)',
  equity: 'var(--color-equity)',
  cash: 'var(--color-cash)',
  neutral: 'var(--color-ink)',
}

function decimalsOf(step: number): number {
  const s = String(step)
  const i = s.indexOf('.')
  return i === -1 ? 0 : s.length - i - 1
}

function formatValue(n: number, decimals: number, unit?: string): string {
  const num = n.toFixed(decimals)
  return unit ? `${num} ${unit}` : num
}

export function FootballFieldTask({
  task,
  value,
  onChange,
  disabled,
}: {
  task: FootballFieldTaskType
  value: { ranges: Record<string, { low: number; high: number }>; choice: string | null }
  onChange: (next: { ranges: Record<string, { low: number; high: number }>; choice: string | null }) => void
  disabled?: boolean
}) {
  const { axis } = task
  const span = axis.max - axis.min || 1
  const decimals = decimalsOf(axis.step)

  function rangeFor(id: string): { low: number; high: number } {
    return value.ranges[id] ?? { low: axis.min, high: axis.min }
  }

  function setLow(id: string, low: number) {
    if (disabled) return
    const cur = rangeFor(id)
    const high = Math.max(cur.high, low)
    onChange({ ...value, ranges: { ...value.ranges, [id]: { low, high } } })
  }

  function setHigh(id: string, high: number) {
    if (disabled) return
    const cur = rangeFor(id)
    const low = Math.min(cur.low, high)
    onChange({ ...value, ranges: { ...value.ranges, [id]: { low, high } } })
  }

  function pickChoice(id: string) {
    if (disabled) return
    onChange({ ...value, choice: id })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between px-1 text-xs font-mono text-muted">
        <span>{formatValue(axis.min, decimals, task.unit)}</span>
        <span>{formatValue(axis.max, decimals, task.unit)}</span>
      </div>

      <div className="flex flex-col gap-5">
        {task.rows.map((row) => {
          const { low, high } = rangeFor(row.id)
          const role = row.role ?? 'neutral'
          const leftPct = ((low - axis.min) / span) * 100
          const widthPct = ((high - low) / span) * 100
          const accent = ROLE_VAR[role]

          return (
            <div key={row.id} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-ink font-semibold">{row.label}</span>
              </div>
              {row.hint && <p className="text-xs text-muted">{row.hint}</p>}

              <div className="relative h-3 rounded-full bg-panel-2 overflow-hidden">
                <div
                  className={`absolute top-0 h-full rounded-full ${ROLE_FILL[role]}`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                />
              </div>

              <div className="flex flex-col gap-3 pt-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-muted font-semibold">Low</span>
                    <span className="font-mono text-sm text-ink">{formatValue(low, decimals, task.unit)}</span>
                  </div>
                  <input
                    type="range"
                    aria-label={`${row.label} low`}
                    min={axis.min}
                    max={axis.max}
                    step={axis.step}
                    value={low}
                    disabled={disabled}
                    onChange={(e) => setLow(row.id, Number(e.target.value))}
                    className="w-full min-h-11 disabled:opacity-60"
                    style={{ accentColor: accent }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-muted font-semibold">High</span>
                    <span className="font-mono text-sm text-ink">{formatValue(high, decimals, task.unit)}</span>
                  </div>
                  <input
                    type="range"
                    aria-label={`${row.label} high`}
                    min={axis.min}
                    max={axis.max}
                    step={axis.step}
                    value={high}
                    disabled={disabled}
                    onChange={(e) => setHigh(row.id, Number(e.target.value))}
                    className="w-full min-h-11 disabled:opacity-60"
                    style={{ accentColor: accent }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {task.question && (
        <div className="bg-panel border border-line rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-ink font-semibold">{task.question.text}</p>
          <div className="flex flex-col gap-2">
            {task.question.choices.map((choice) => {
              const selected = value.choice === choice.id
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => pickChoice(choice.id)}
                  disabled={disabled}
                  aria-pressed={selected}
                  className={`min-h-12 px-4 rounded-xl border text-left font-medium bg-panel-2 border-line text-ink transition
                    ${selected ? 'border-ink ring-2 ring-ink' : ''}
                    disabled:opacity-60`}
                >
                  {choice.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
