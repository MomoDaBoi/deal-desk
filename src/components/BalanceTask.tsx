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
  const denom = Math.max(Math.abs(assetsTotal), Math.abs(liabEquityTotal), 1)
  const assetsPct = Math.min(100, Math.max(0, (assetsTotal / denom) * 100))
  const liabPct = Math.min(100, Math.max(0, (liabTotal / denom) * 100))
  const equityPct = Math.min(100, Math.max(0, (equityTotal / denom) * 100))
  const diff = assetsTotal - liabEquityTotal
  const balanced = diff === 0

  return (
    <div className="flex flex-col gap-4">
      {task.sections.map((section) => (
        <div key={section.id} className="bg-panel border border-line rounded-2xl overflow-hidden">
          <div className={`px-4 py-2 border-b text-xs font-semibold uppercase tracking-wide ${ROLE_BG[section.role ?? 'neutral']}`}>
            {section.label}
          </div>
          <div className="flex flex-col divide-y divide-line">
            {section.lines.map((line) => {
              const isBlank = line.value === undefined && line.answer !== undefined
              const raw = value[line.id]
              return (
                <div
                  key={line.id}
                  className={`flex items-center justify-between gap-3 px-4 py-2 ${line.total ? 'font-bold border-t-2 border-line' : ''}`}
                >
                  <span className="text-ink">{line.label}</span>
                  {isBlank ? (
                    <input
                      inputMode="decimal"
                      type="text"
                      disabled={disabled}
                      value={raw === null || raw === undefined ? '' : String(raw)}
                      onChange={(e) => setLine(line.id, parseInput(e.target.value))}
                      className="min-h-11 w-28 text-right font-mono bg-panel-2 border border-line rounded-lg px-2 text-ink disabled:opacity-60"
                    />
                  ) : (
                    <span className="font-mono text-ink">
                      {formatNumber(line.value ?? 0)}
                      {task.unit ? ` ${task.unit}` : ''}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div className="bg-panel border border-line rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted font-semibold">Balance check</span>
          <span className={`text-sm font-semibold ${balanced ? 'text-revenue' : 'text-cost'}`}>
            {balanced ? 'Balanced' : `Off by ${formatNumber(Math.abs(diff))}${task.unit ? ` ${task.unit}` : ''}`}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-3 rounded-full bg-panel-2 overflow-hidden flex" aria-label="Assets">
            <div className="h-full bg-cash" style={{ width: `${assetsPct}%` }} />
          </div>
          <div className="h-3 rounded-full bg-panel-2 overflow-hidden flex" aria-label="Liabilities and equity">
            <div className="h-full bg-debt" style={{ width: `${liabPct}%` }} />
            <div className="h-full bg-equity" style={{ width: `${equityPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
