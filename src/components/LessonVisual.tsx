import type { LessonVisual as Visual, Role } from '../engine/types'

const ROLE_BG: Record<Role, string> = {
  revenue: 'bg-revenue',
  cost: 'bg-cost',
  debt: 'bg-debt',
  equity: 'bg-equity',
  cash: 'bg-cash',
  neutral: 'bg-muted',
}

function fmt(n: number, unit?: string): string {
  const abs = Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 1 })
  const sign = n < 0 ? '-' : ''
  if (!unit) return sign + abs
  if (unit.startsWith('$')) return `${sign}$${abs}${unit.slice(1)}`
  return `${sign}${abs}${unit}`
}

/** Renders a lesson card's visual: numbered bullets, a bar row, or a compact waterfall. */
export function LessonVisual({ visual }: { visual?: Visual }) {
  if (!visual || visual.kind === 'none') return null

  if (visual.kind === 'bullets') {
    return (
      <ul className="mt-4 flex flex-col gap-2">
        {visual.items.map((b, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="font-mono text-muted w-4 text-right shrink-0">{i + 1}</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (visual.kind === 'bars') {
    const max = Math.max(1, ...visual.items.map((it) => Math.abs(it.value)))
    return (
      <div className="mt-4 flex flex-col gap-2">
        {visual.items.map((it, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-28 shrink-0 truncate text-muted">{it.label}</span>
            <div className="flex-1 h-4 rounded bg-panel-2 overflow-hidden">
              <div className={`h-full ${ROLE_BG[it.role ?? 'neutral']}`} style={{ width: `${(Math.abs(it.value) / max) * 100}%` }} />
            </div>
            <span className="w-20 shrink-0 text-right font-mono text-xs">{fmt(it.value, visual.unit)}</span>
          </div>
        ))}
      </div>
    )
  }

  // waterfall: totals are absolute, others are signed deltas on a running total
  let running = 0
  const rows = visual.items.map((it) => {
    const start = it.total ? 0 : running
    running = it.total ? it.value : running + it.value
    const end = it.total ? it.value : running
    return { ...it, lo: Math.min(start, end), hi: Math.max(start, end) }
  })
  const max = Math.max(1, ...rows.map((r) => r.hi))
  return (
    <div className="mt-4 flex flex-col gap-1.5">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0 truncate text-muted">{r.label}</span>
          <div className="relative flex-1 h-4 rounded bg-panel-2 overflow-hidden">
            <div
              className={`absolute top-0 h-full ${r.total ? ROLE_BG[r.role ?? 'equity'] : ROLE_BG[r.role ?? (r.value < 0 ? 'cost' : 'revenue')]}`}
              style={{ left: `${(r.lo / max) * 100}%`, width: `${Math.max(1, ((r.hi - r.lo) / max) * 100)}%` }}
            />
          </div>
          <span className={`w-20 shrink-0 text-right font-mono text-xs ${r.total ? 'font-bold' : ''}`}>{fmt(r.value, visual.unit)}</span>
        </div>
      ))}
    </div>
  )
}
