import type { GradeResult, OrderItem } from './types'

/**
 * Grade an ordering task. Accuracy = fraction of items in the exact
 * correct slot. Adjacent swaps therefore cost two items, which is
 * intentional: order is the whole point of the task.
 */
export function gradeOrder(
  correct: OrderItem[],
  orderedIds: string[],
  explain: (result: { accuracy: number; wrongIds: string[] }) => { verdict: string; explanation: string },
): GradeResult {
  const n = correct.length
  if (n === 0) {
    return { accuracy: 1, verdict: 'Nothing to order.', explanation: 'Empty task.', details: [] }
  }
  const details = correct.map((item, i) => ({ id: item.id, ok: orderedIds[i] === item.id }))
  const right = details.filter((d) => d.ok).length
  const accuracy = right / n
  const wrongIds = details.filter((d) => !d.ok).map((d) => d.id)
  const { verdict, explanation } = explain({ accuracy, wrongIds })
  return { accuracy, verdict, explanation, details }
}

/** Seeded shuffle (xorshift32). Never returns the input order for n > 1. */
export function shuffle<T>(items: T[], seed = Date.now()): T[] {
  const out = items.slice()
  let s = seed >>> 0 || 1
  const rand = () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  if (out.length > 1 && out.every((x, i) => x === items[i])) {
    const tmp = out[0]
    out[0] = out[1]
    out[1] = tmp
  }
  return out
}
