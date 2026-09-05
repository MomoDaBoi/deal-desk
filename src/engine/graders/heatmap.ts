import type { GradeResult, HeatmapAnswer, HeatmapTask } from '../types'

/** Human-readable "<row label>, <col label>" for a "rowId:colId" cell key. Falls back to the raw id half if the row/col is not found. */
function cellLabel(task: HeatmapTask, key: string): string {
  const [rowId, colId] = key.split(':')
  const row = task.rows.find((r) => r.id === rowId)
  const col = task.cols.find((c) => c.id === colId)
  return `${row?.label ?? rowId}, ${col?.label ?? colId}`
}

/**
 * Grade a sensitivity-heatmap task. `task.blanks` names the cell keys
 * ("rowId:colId") the player typed into; each is right when within
 * `task.tolerance ?? 0` of `task.cells[key]`, and a missing or null
 * submission always counts as wrong. If `task.tap` is set, tapping the
 * correct cell is one more item toward accuracy.
 *
 * accuracy = (blanks within tolerance + tap correct) / (blanks + (1 if tap)).
 */
export function gradeHeatmap(
  task: HeatmapTask,
  answer: HeatmapAnswer,
  explain: (ctx: {
    accuracy: number
    wrongIds: string[]
    blanks: { key: string; expected: number; got: number | null }[]
    tapOk: boolean | null
  }) => { verdict: string; explanation: string },
): GradeResult {
  const tolerance = task.tolerance ?? 0
  const unit = task.unit ?? ''

  const blanks = task.blanks.map((key) => ({
    key,
    expected: task.cells[key],
    got: answer.values[key] ?? null,
  }))

  const total = blanks.length + (task.tap ? 1 : 0)
  if (total === 0) {
    return { accuracy: 1, verdict: 'Nothing to fill in.', explanation: 'Empty task.', details: [] }
  }

  const blankDetails = blanks.map((b) => {
    const ok = b.got !== null && Math.abs(b.got - b.expected) <= tolerance
    return { id: b.key, ok, note: `Expected ${b.expected}${unit}` }
  })

  const tapOk: boolean | null = task.tap ? answer.tapped === task.tap.answer : null

  const details = [...blankDetails]
  if (task.tap) {
    details.push({ id: 'tap', ok: tapOk === true, note: `${task.tap.prompt} -> ${cellLabel(task, task.tap.answer)}` })
  }

  const right = blankDetails.filter((d) => d.ok).length + (tapOk ? 1 : 0)
  const accuracy = right / total
  const wrongIds = details.filter((d) => !d.ok).map((d) => d.id)

  const { verdict, explanation } = explain({ accuracy, wrongIds, blanks, tapOk })
  return { accuracy, verdict, explanation, details }
}
