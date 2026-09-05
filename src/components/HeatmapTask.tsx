import { Fragment } from 'react'
import type { HeatmapTask as HeatmapTaskType } from '../engine/types'
import { NumberField } from './BalanceTask'
import { fmtCell } from '../engine/graders/heatmap'

/**
 * Background for a known cell: a color-mix from cost (red, low values) to
 * revenue (green, high values), ranked against every other known cell in
 * the table, then blended at ~35% opacity over the panel-2 surface so the
 * grid reads as a heatmap without fighting the dark theme.
 */
function knownCellColor(value: number, min: number, max: number): string {
  const rank = max === min ? 0.5 : (value - min) / (max - min)
  const costPct = Math.round((1 - rank) * 100)
  const mixed = `color-mix(in oklab, var(--color-cost) ${costPct}%, var(--color-revenue))`
  return `color-mix(in oklab, ${mixed} 35%, var(--color-panel-2))`
}

export function HeatmapTask({
  task,
  value,
  onChange,
  disabled,
}: {
  task: HeatmapTaskType
  value: { values: Record<string, number | null>; tapped: string | null }
  onChange: (next: { values: Record<string, number | null>; tapped: string | null }) => void
  disabled?: boolean
}) {
  const unit = task.unit ?? ''

  function setBlank(key: string, n: number | null) {
    onChange({ ...value, values: { ...value.values, [key]: n } })
  }

  function handleTap(key: string) {
    if (!task.tap || disabled) return
    onChange({ ...value, tapped: key })
  }

  // Rank only the KNOWN cells for the color scale — blank answers never leak into it.
  const knownValues = Object.entries(task.cells)
    .filter(([key]) => !task.blanks.includes(key))
    .map(([, v]) => v)
  const min = knownValues.length ? Math.min(...knownValues) : 0
  const max = knownValues.length ? Math.max(...knownValues) : 0

  return (
    <div className="flex flex-col gap-3">
      {task.tap && (
        <div className="text-sm font-medium text-ink bg-panel-2 border border-line rounded-xl px-3 py-2">{task.tap.prompt}</div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
        <div className="grid w-max" style={{ gridTemplateColumns: `repeat(${task.cols.length + 1}, minmax(64px, 1fr))` }}>
          <div className="sticky left-0 z-10 min-h-11 min-w-16 flex items-center justify-center text-center text-[11px] leading-tight text-muted font-semibold bg-panel-2 border-b border-r border-line px-1">
            {task.rowsLabel} \ {task.colsLabel}
          </div>

          {task.cols.map((col) => (
            <div
              key={col.id}
              className="min-h-11 min-w-16 flex items-center justify-center text-xs font-semibold text-ink bg-panel-2 border-b border-line px-1 text-center"
            >
              {col.label}
            </div>
          ))}

          {task.rows.map((row) => (
            <Fragment key={row.id}>
              <div className="sticky left-0 z-10 min-h-11 min-w-16 flex items-center justify-center text-xs font-semibold text-ink bg-panel-2 border-r border-line px-1 text-center">
                {row.label}
              </div>

              {task.cols.map((col) => {
                const key = `${row.id}:${col.id}`
                const isBlank = task.blanks.includes(key)

                if (isBlank) {
                  return (
                    <div key={key} className="min-h-11 min-w-16 flex items-center justify-center border-b border-line px-1">
                      <NumberField
                        id={key}
                        value={value.values[key] ?? null}
                        onChange={(n) => setBlank(key, n)}
                        disabled={disabled}
                        ariaLabel={`${row.label}, ${col.label}`}
                        className="min-h-11 w-20 text-right font-mono bg-panel-2 border border-line rounded-lg px-2 text-ink disabled:opacity-60"
                      />
                    </div>
                  )
                }

                const cellValue = task.cells[key]
                const tapped = value.tapped === key
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleTap(key)}
                    aria-pressed={task.tap ? tapped : undefined}
                    aria-label={`${row.label}, ${col.label}: ${fmtCell(cellValue, unit)}`}
                    style={{ backgroundColor: knownCellColor(cellValue, min, max) }}
                    className={`min-h-11 min-w-16 flex items-center justify-center font-mono text-sm text-ink border-b border-line px-1 disabled:opacity-60 ${
                      tapped ? 'ring-2 ring-ink' : ''
                    }`}
                  >
                    {fmtCell(cellValue, unit)}
                  </button>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
