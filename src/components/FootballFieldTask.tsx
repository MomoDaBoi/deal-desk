import type { FootballFieldTask as FootballFieldTaskType, Role } from '../engine/types'

/**
 * Football field: one horizontal range bar per row, with two stacked native
 * range sliders (Low / High) beneath it. Dragging Low past High pushes High
 * up to match (and vice versa), so low <= high always. An optional embedded
 * question renders after the rows as a set of full-width choice buttons.
 */

const ROLE_VAR: Record<Role, string> = {
  revenue: 'var(--color-revenue)',
  cost: 'var(--color-cost)',
  debt: 'var(--color-debt)',
  equity: 'var(--color-equity)',
  cash: 'var(--color-cash)',
  neutral: 'var(--color-ink)',
}

/** Hex values for the SVG `fill`/`stroke` props, which cannot take a Tailwind class. */
const ROLE_HEX: Record<Role, string> = {
  revenue: '#4fc46a',
  cost: '#d94a4a',
  debt: '#f2b632',
  equity: '#4a7ad9',
  cash: '#3bbfb0',
  neutral: '#a7a9c4',
}

const OUTLINE = '#1b1a2e'

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

  function snapToGrid(n: number): number {
    const factor = Math.pow(10, decimals)
    return Math.round(n * factor) / factor
  }

  function clampToAxis(n: number): number {
    return Math.min(axis.max, Math.max(axis.min, n))
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
      <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted">
        <span className="truncate">{formatValue(axis.min, decimals, task.unit)}</span>
        <span className="truncate">{formatValue(axis.max, decimals, task.unit)}</span>
      </div>

      <div className="flex flex-col gap-5">
        {task.rows.map((row) => {
          const { low, high } = rangeFor(row.id)
          const role = row.role ?? 'neutral'
          const leftPct = ((low - axis.min) / span) * 100
          const widthPct = ((high - low) / span) * 100
          const accent = ROLE_VAR[role]
          const hex = ROLE_HEX[role]

          return (
            <div key={row.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-ink font-semibold min-w-0 break-words">{row.label}</span>
              </div>
              {row.hint && <p className="text-xs text-muted break-words">{row.hint}</p>}

              {/* Range as a flat pixel rect, with 12px square markers at the low/high edges. */}
              <div className="relative h-4">
                <svg
                  viewBox="0 0 100 16"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full"
                  aria-hidden="true"
                >
                  <rect x={0} y={2} width={100} height={12} fill="#14132a" />
                  <rect
                    x={leftPct}
                    y={2}
                    width={Math.max(widthPct, 0.6)}
                    height={12}
                    fill={hex}
                    stroke={OUTLINE}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <div
                  className="absolute top-1/2 w-3 h-3 border-2"
                  style={{ left: `${leftPct}%`, transform: 'translate(-50%, -50%)', background: accent, borderColor: OUTLINE }}
                  aria-hidden="true"
                />
                <div
                  className="absolute top-1/2 w-3 h-3 border-2"
                  style={{ left: `${leftPct + widthPct}%`, transform: 'translate(-50%, -50%)', background: accent, borderColor: OUTLINE }}
                  aria-hidden="true"
                />
              </div>

              <div className="flex flex-col gap-3 pt-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="px-eyebrow text-muted shrink-0">Low</span>
                    <span className="font-pixel text-[9px] text-ink shrink-0 whitespace-nowrap">
                      {formatValue(low, decimals, task.unit)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Decrease ${row.label} low`}
                      disabled={disabled}
                      onClick={() => setLow(row.id, clampToAxis(snapToGrid(low - axis.step)))}
                      className="min-h-11 min-w-11 shrink-0 bg-panel-2 border-2 border-line text-ink text-lg font-semibold disabled:opacity-40 active:scale-[0.98]"
                    >
                      −
                    </button>
                    <input
                      type="range"
                      aria-label={`${row.label} low`}
                      min={axis.min}
                      max={axis.max}
                      step={axis.step}
                      value={low}
                      disabled={disabled}
                      onChange={(e) => setLow(row.id, Number(e.target.value))}
                      className="min-h-11 flex-1 min-w-0 disabled:opacity-60"
                      style={{ accentColor: accent }}
                    />
                    <button
                      type="button"
                      aria-label={`Increase ${row.label} low`}
                      disabled={disabled}
                      onClick={() => setLow(row.id, clampToAxis(snapToGrid(low + axis.step)))}
                      className="min-h-11 min-w-11 shrink-0 bg-panel-2 border-2 border-line text-ink text-lg font-semibold disabled:opacity-40 active:scale-[0.98]"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="px-eyebrow text-muted shrink-0">High</span>
                    <span className="font-pixel text-[9px] text-ink shrink-0 whitespace-nowrap">
                      {formatValue(high, decimals, task.unit)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Decrease ${row.label} high`}
                      disabled={disabled}
                      onClick={() => setHigh(row.id, clampToAxis(snapToGrid(high - axis.step)))}
                      className="min-h-11 min-w-11 shrink-0 bg-panel-2 border-2 border-line text-ink text-lg font-semibold disabled:opacity-40 active:scale-[0.98]"
                    >
                      −
                    </button>
                    <input
                      type="range"
                      aria-label={`${row.label} high`}
                      min={axis.min}
                      max={axis.max}
                      step={axis.step}
                      value={high}
                      disabled={disabled}
                      onChange={(e) => setHigh(row.id, Number(e.target.value))}
                      className="min-h-11 flex-1 min-w-0 disabled:opacity-60"
                      style={{ accentColor: accent }}
                    />
                    <button
                      type="button"
                      aria-label={`Increase ${row.label} high`}
                      disabled={disabled}
                      onClick={() => setHigh(row.id, clampToAxis(snapToGrid(high + axis.step)))}
                      className="min-h-11 min-w-11 shrink-0 bg-panel-2 border-2 border-line text-ink text-lg font-semibold disabled:opacity-40 active:scale-[0.98]"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {task.question && (
        <div className="px-box p-4 flex flex-col gap-3">
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
                  className={`w-full min-h-12 px-4 py-2 px-chip border-l-4 text-left font-medium break-words bg-panel-2 text-ink transition
                    ${selected ? 'bg-equity/30 border-l-equity' : 'border-l-line'}
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
