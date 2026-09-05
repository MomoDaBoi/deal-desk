import type { BridgeAnswer, BridgeTask, GradeResult } from '../types'

/**
 * Grade a two-anchor bridge task. Every adjustment is a blank; a missing or
 * null submission counts as wrong (and as 0 toward the running sum).
 *
 * accuracy = 0.75 * (adjustments within `task.tolerance ?? 0`) / (total
 * adjustments) + 0.25 * (start + sum(adjustments) reconciles to end, within
 * the same tolerance).
 */
export function gradeBridge(
  task: BridgeTask,
  answer: BridgeAnswer,
  explain: (ctx: {
    accuracy: number
    wrongIds: string[]
    reconciled: boolean
    sum: number
    blanks: { id: string; label: string; expected: number; got: number | null }[]
  }) => { verdict: string; explanation: string },
): GradeResult {
  const tolerance = task.tolerance ?? 0

  const blanks = task.adjustments.map((a) => ({
    id: a.id,
    label: a.label,
    expected: a.answer,
    got: answer.values[a.id] ?? null,
  }))

  const adjustmentDetails = blanks.map((b, i) => {
    const adj = task.adjustments[i]
    const ok = b.got !== null && Math.abs(b.got - b.expected) <= tolerance
    const parts = [`Expected ${b.expected}`]
    if (adj?.hint) parts.push(adj.hint)
    if (adj?.note) parts.push(adj.note)
    return { id: b.id, ok, note: parts.join('. ') }
  })

  const correctCount = adjustmentDetails.filter((d) => d.ok).length
  const correctFraction = blanks.length === 0 ? 1 : correctCount / blanks.length

  const sum = task.start.value + blanks.reduce((s, b) => s + (b.got ?? 0), 0)
  const reconciled = Math.abs(sum - task.end.value) <= tolerance

  const accuracy = 0.75 * correctFraction + 0.25 * (reconciled ? 1 : 0)

  const wrongIds = adjustmentDetails.filter((d) => !d.ok).map((d) => d.id)
  if (!reconciled) wrongIds.push('reconcile')

  const details = [
    ...adjustmentDetails,
    { id: 'reconcile', ok: reconciled, note: `Your bars sum to ${sum}; target is ${task.end.value}` },
  ]

  const { verdict, explanation } = explain({ accuracy, wrongIds, reconciled, sum, blanks })
  return { accuracy, verdict, explanation, details }
}
