import type { GradeResult, SortAnswer, SortTask } from '../types'

/**
 * Grade a bucket-sort task. Accuracy = fraction of items placed in their
 * correct bucket. An item missing from `answer.placements` counts as wrong
 * (and unplaced): it never gets a free pass just because the player never
 * touched it.
 */
export function gradeSort(
  task: SortTask,
  answer: SortAnswer,
  explain: (ctx: { accuracy: number; wrongIds: string[]; unplacedIds: string[] }) => { verdict: string; explanation: string },
): GradeResult {
  const n = task.items.length
  if (n === 0) {
    return { accuracy: 1, verdict: 'Nothing to sort.', explanation: 'Empty task.', details: [] }
  }

  const bucketLabels = new Map(task.buckets.map((b) => [b.id, b.label]))
  const unplacedIds: string[] = []
  const wrongIds: string[] = []
  const details = task.items.map((item) => {
    const placed = answer.placements[item.id]
    if (placed === undefined) {
      unplacedIds.push(item.id)
      wrongIds.push(item.id)
      return { id: item.id, ok: false, note: `Belongs in ${bucketLabels.get(item.bucketId) ?? item.bucketId}` }
    }
    const ok = placed === item.bucketId
    if (!ok) {
      wrongIds.push(item.id)
      return { id: item.id, ok: false, note: `Belongs in ${bucketLabels.get(item.bucketId) ?? item.bucketId}` }
    }
    return { id: item.id, ok: true }
  })

  const right = details.filter((d) => d.ok).length
  const accuracy = right / n
  const { verdict, explanation } = explain({ accuracy, wrongIds, unplacedIds })
  return { accuracy, verdict, explanation, details }
}
