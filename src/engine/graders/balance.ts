import type { BalanceAnswer, BalanceLine, BalanceTask, GradeResult } from '../types'

/**
 * Grade a balance-sheet fill-in-the-blanks task. A "blank" is any line with
 * `answer` defined and `value` undefined; every other line is shown to the
 * player as known and does not count toward accuracy.
 *
 * accuracy = (blanks within `task.tolerance ?? 0` of the correct answer) /
 * (total blanks). A missing or null submission always counts as wrong.
 */
export function gradeBalance(
  task: BalanceTask,
  answer: BalanceAnswer,
  explain: (ctx: {
    accuracy: number
    wrongIds: string[]
    blanks: { id: string; label: string; expected: number; got: number | null }[]
  }) => { verdict: string; explanation: string },
): GradeResult {
  const blankLines: BalanceLine[] = task.sections.flatMap((s) => s.lines).filter((l) => l.value === undefined && l.answer !== undefined)

  if (blankLines.length === 0) {
    return { accuracy: 1, verdict: 'Nothing to fill in.', explanation: 'Empty task.', details: [] }
  }

  const tolerance = task.tolerance ?? 0
  const blanks = blankLines.map((line) => ({
    id: line.id,
    label: line.label,
    expected: line.answer as number,
    got: answer.values[line.id] ?? null,
  }))

  const details = blanks.map((b, i) => {
    const ok = b.got !== null && Math.abs(b.got - b.expected) <= tolerance
    const line = blankLines[i]
    const note = line?.note ? `Expected ${b.expected}. ${line.note}` : `Expected ${b.expected}`
    return { id: b.id, ok, note }
  })

  const right = details.filter((d) => d.ok).length
  const accuracy = right / blanks.length
  const wrongIds = details.filter((d) => !d.ok).map((d) => d.id)

  const { verdict, explanation } = explain({ accuracy, wrongIds, blanks })
  return { accuracy, verdict, explanation, details }
}
