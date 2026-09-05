import type { SliderTask as SliderTaskType } from '../engine/types'

/** Maps a colour role to the CSS variable used for the native range thumb/track accent. */
const ROLE_ACCENT: Record<string, string> = {
  revenue: 'var(--color-revenue)',
  cost: 'var(--color-cost)',
  debt: 'var(--color-debt)',
  equity: 'var(--color-equity)',
  cash: 'var(--color-cash)',
  neutral: 'var(--color-ink)',
}

function formatValue(n: number, step: number): string {
  const decimals = step < 1 ? 1 : 0
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function SliderTask({
  task,
  value,
  onChange,
  disabled,
}: {
  task: SliderTaskType
  value: Record<string, number>
  onChange: (next: Record<string, number>) => void
  disabled?: boolean
}) {
  function setSlider(id: string, n: number) {
    onChange({ ...value, [id]: n })
  }

  return (
    <div className="flex flex-col gap-5">
      {task.sliders.map((slider) => {
        const current = value[slider.id] ?? slider.min
        const accent = ROLE_ACCENT[slider.role ?? 'neutral']
        const unit = slider.unit ?? ''

        function nudge(dir: 1 | -1) {
          const next = Math.min(slider.max, Math.max(slider.min, current + dir * slider.step))
          setSlider(slider.id, next)
        }

        return (
          <div key={slider.id} className="bg-panel border border-line rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-ink font-semibold">{slider.label}</span>
                {slider.hint && <span className="text-xs text-muted">{slider.hint}</span>}
              </div>
              <span className="font-mono text-2xl text-ink tabular-nums">
                {formatValue(current, slider.step)}
                {unit}
              </span>
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
              <span>
                {formatValue(slider.min, slider.step)}
                {unit}
              </span>
              <span>
                {formatValue(slider.max, slider.step)}
                {unit}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
