import type { GradeResult, WaterfallAnswer, WaterfallStep, WaterfallTask } from '../types'

/**
 * Grade an income-statement waterfall fill-in-the-blanks task. A "blank" is
 * any step with `answer` defined and `value` undefined; every other step is
 * shown to the player as known and does not count toward accuracy.
 *
 * accuracy = (blanks within `task.tolerance ?? 0` of the correct answer) /
 * (total blanks). A missing or null submission always counts as wrong.
 */
export function gradeWaterfall(
  task: WaterfallTask,
  answer: WaterfallAnswer,
  explain: (ctx: {
    accuracy: number
    wrongIds: string[]
    blanks: { id: string; label: string; expected: number; got: number | null }[]
  }) => { verdict: string; explanation: string },
): GradeResult {
  const blankSteps: WaterfallStep[] = task.steps.filter((s) => s.value === undefined && s.answer !== undefined)

  if (blankSteps.length === 0) {
    return { accuracy: 1, verdict: 'Nothing to fill in.', explanation: 'Empty task.', details: [] }
  }

  const tolerance = task.tolerance ?? 0
  const blanks = blankSteps.map((step) => ({
    id: step.id,
    label: step.label,
    expected: step.answer as number,
    got: answer.values[step.id] ?? null,
  }))

  const details = blanks.map((b, i) => {
    const ok = b.got !== null && Math.abs(b.got - b.expected) <= tolerance
    const step = blankSteps[i]
    const note = step?.note ? `Expected ${b.expected}. ${step.note}` : `Expected ${b.expected}`
    return { id: b.id, ok, note }
  })

  const right = details.filter((d) => d.ok).length
  const accuracy = right / blanks.length
  const wrongIds = details.filter((d) => !d.ok).map((d) => d.id)

  const { verdict, explanation } = explain({ accuracy, wrongIds, blanks })
  return { accuracy, verdict, explanation, details }
}
