import type { Role, SliderTask as SliderTaskType } from '../engine/types'
import { formatSliderValue } from '../engine/graders/slider'
import { Panel } from './ui'

/** Maps a colour role to the CSS variable used for the native range thumb/track accent. */
const ROLE_ACCENT: Record<string, string> = {
  revenue: 'var(--color-revenue)',
  cost: 'var(--color-cost)',
  debt: 'var(--color-debt)',
  equity: 'var(--color-equity)',
  cash: 'var(--color-cash)',
  neutral: 'var(--color-ink)',
}

const ROLE_FILL: Record<Role, string> = {
  revenue: 'bg-revenue',
  cost: 'bg-cost',
  debt: 'bg-debt',
  equity: 'bg-equity',
  cash: 'bg-cash',
  neutral: 'bg-ink/50',
}

/**
 * Format a readout or chart value: same currency-prefix / suffix rule as
 * `formatSliderValue`, but with a fixed precision since readouts have no
 * `step` to derive one from — 1 decimal for "%" and "x", thousands
 * separators (no decimals) for "$", 1 decimal for anything else.
 */
function formatReadout(value: number, unit?: string): string {
  if (unit === '$') {
    const sign = value < 0 ? '-' : ''
    return `${sign}$${Math.abs(Math.round(value)).toLocaleString('en-US')}`
  }
  if (!unit) return value.toFixed(1)
  const sep = unit === 'x' || unit === '%' ? '' : ' '
  return `${value.toFixed(1)}${sep}${unit}`
}

export type SliderValue = { values: Record<string, number>; choice: string | null }

export function SliderTask({
  task,
  value,
  onChange,
  disabled,
}: {
  task: SliderTaskType
  value: { values: Record<string, number>; choice: string | null }
  onChange: (next: { values: Record<string, number>; choice: string | null }) => void
  disabled?: boolean
}) {
  function setSlider(id: string, n: number) {
    onChange({ ...value, values: { ...value.values, [id]: n } })
  }

  function pickChoice(id: string) {
    if (disabled) return
    onChange({ ...value, choice: id })
  }

  // Current slider values with every slider represented (missing = its min),
  // for readouts and the chart to compute against live.
  const currentValues: Record<string, number> = {}
  for (const slider of task.sliders) {
    currentValues[slider.id] = value.values[slider.id] ?? slider.min
  }

  return (
    <div className="flex flex-col gap-5">
      {task.sliders.map((slider) => {
        const current = value.values[slider.id] ?? slider.min
        const accent = ROLE_ACCENT[slider.role ?? 'neutral']

        function nudge(dir: 1 | -1) {
          const raw = current + dir * slider.step
          const snapped = slider.min + Math.round((raw - slider.min) / slider.step) * slider.step
          const next = Math.min(slider.max, Math.max(slider.min, Number(snapped.toFixed(6))))
          setSlider(slider.id, next)
        }

        return (
          <div key={slider.id} className="bg-panel border border-line rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-ink font-semibold">{slider.label}</span>
                {slider.hint && <span className="text-xs text-muted">{slider.hint}</span>}
              </div>
              <span className="font-mono text-2xl text-ink tabular-nums">{formatSliderValue(current, slider)}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Decrease ${slider.label}`}
                disabled={disabled}
                onClick={() => nudge(-1)}
                className="min-h-11 min-w-11 rounded-xl bg-panel-2 border border-line text-ink text-lg font-semibold disabled:opacity-40 active:scale-[0.98]"
              >
                −
              </button>
              <input
                type="range"
                aria-label={slider.label}
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={current}
                disabled={disabled}
                onChange={(e) => setSlider(slider.id, Number(e.target.value))}
                style={{ accentColor: accent }}
                className="h-11 flex-1 disabled:opacity-40"
              />
              <button
                type="button"
                aria-label={`Increase ${slider.label}`}
                disabled={disabled}
                onClick={() => nudge(1)}
                className="min-h-11 min-w-11 rounded-xl bg-panel-2 border border-line text-ink text-lg font-semibold disabled:opacity-40 active:scale-[0.98]"
              >
                +
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-muted font-mono">
              <span>{formatSliderValue(slider.min, slider)}</span>
              <span>{formatSliderValue(slider.max, slider)}</span>
            </div>
          </div>
        )
      })}

      {task.readouts && (
        <Panel className="flex flex-col gap-2">
          {task.readouts.map((readout) => (
            <div key={readout.id} className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted">{readout.label}</span>
              <span
                className="font-mono text-lg tabular-nums text-ink"
                style={readout.role ? { color: `var(--color-${readout.role})` } : undefined}
              >
                {formatReadout(readout.compute(currentValues), readout.unit)}
              </span>
            </div>
          ))}
        </Panel>
      )}

      {task.chart && (
        <Panel className="flex flex-col gap-3">
          <span className="text-sm text-muted font-semibold">{task.chart.label}</span>
          <div className="flex flex-col gap-2">
            {(() => {
              const series = task.chart.series(currentValues)
              const maxAbs = Math.max(1e-9, ...series.map((s) => Math.abs(s.value)))
              return series.map((s, i) => {
                const role = s.role ?? 'neutral'
                const widthPct = (Math.abs(s.value) / maxAbs) * 100
                return (
                  <div key={`${s.label}-${i}`} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>{s.label}</span>
                      <span className="font-mono text-ink">{formatReadout(s.value, task.chart!.unit)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-panel-2 overflow-hidden">
                      <div className={`h-full rounded-full ${ROLE_FILL[role]}`} style={{ width: `${widthPct}%` }} />
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </Panel>
      )}

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
