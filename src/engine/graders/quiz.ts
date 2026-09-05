import type { GradeResult, QuizAnswer, QuizTask } from '../types'

/**
 * Grade a quiz task. Accuracy = correct answers / total questions.
 * A missing or null choice counts as wrong and lands in unansweredIds
 * (which is always a subset of wrongIds).
 */
export function gradeQuiz(
  task: QuizTask,
  answer: QuizAnswer,
  explain: (ctx: { accuracy: number; wrongIds: string[]; unansweredIds: string[]; timedOut: boolean }) => {
    verdict: string
    explanation: string
  },
): GradeResult {
  const n = task.questions.length
  if (n === 0) {
    return { accuracy: 1, verdict: 'Nothing to answer.', explanation: 'Empty task.', details: [] }
  }

  const details = task.questions.map((q) => {
    const chosen = answer.choices[q.id] ?? null
    const ok = chosen === q.correctId
    return { id: q.id, ok, note: ok ? undefined : q.explanation, chosen }
  })

  const right = details.filter((d) => d.ok).length
  const accuracy = right / n
  const wrongIds = details.filter((d) => !d.ok).map((d) => d.id)
  const unansweredIds = details.filter((d) => d.chosen === null).map((d) => d.id)
  const timedOut = answer.timedOut ?? false

  const { verdict, explanation } = explain({ accuracy, wrongIds, unansweredIds, timedOut })

  return {
    accuracy,
    verdict,
    explanation,
    details: details.map(({ id, ok, note }) => ({ id, ok, note })),
  }
}
