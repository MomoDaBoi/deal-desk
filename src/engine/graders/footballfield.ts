import type { FootballFieldAnswer, FootballFieldTask, GradeResult } from '../types'

/**
 * Grade a football-field task: the player sets a low/high valuation range
 * per row, plus an optional embedded multiple-choice question.
 *
 * Row score = (lowHit + highHit) / 2, where a hit means the submitted end is
 * within `row.tolerance` of the matching answer end. A row missing entirely
 * from `answer.ranges` scores 0 (both ends wrong). rowsAccuracy is the mean
 * row score across all rows (1 if there are no rows).
 *
 * If `task.question` is present it takes `question.weight` (default 0.25)
 * of the overall accuracy and the rows share the rest; otherwise accuracy is
 * just rowsAccuracy.
 */
export function gradeFootballField(
  task: FootballFieldTask,
  answer: FootballFieldAnswer,
  explain: (ctx: {
    accuracy: number
    wrongIds: string[]
    rows: { id: string; label: string; lowOk: boolean; highOk: boolean; low: number | null; high: number | null }[]
    questionOk: boolean | null
  }) => { verdict: string; explanation: string },
): GradeResult {
  const rowResults = task.rows.map((row) => {
    const got = answer.ranges[row.id]
    const low = got ? got.low : null
    const high = got ? got.high : null
    const lowOk = low !== null && Math.abs(low - row.lowAnswer) <= row.tolerance
    const highOk = high !== null && Math.abs(high - row.highAnswer) <= row.tolerance
    return { id: row.id, label: row.label, lowOk, highOk, low, high, score: (Number(lowOk) + Number(highOk)) / 2 }
  })

  const rowsAccuracy = rowResults.length === 0 ? 1 : rowResults.reduce((sum, r) => sum + r.score, 0) / rowResults.length

  const question = task.question
  let questionOk: boolean | null = null
  let accuracy = rowsAccuracy
  if (question) {
    questionOk = answer.choice === question.correctId
    const w = question.weight ?? 0.25
    accuracy = (1 - w) * rowsAccuracy + w * (questionOk ? 1 : 0)
  }

  const wrongIds = rowResults.filter((r) => !r.lowOk || !r.highOk).map((r) => r.id)
  if (question && !questionOk) wrongIds.push('question')

  const details = rowResults.map((r) => {
    const row = task.rows.find((t) => t.id === r.id)
    const setStr = r.low === null || r.high === null ? 'nothing' : `${r.low}–${r.high}`
    const base = `Answer ${row?.lowAnswer}–${row?.highAnswer}, you set ${setStr}`
    return { id: r.id, ok: r.lowOk && r.highOk, note: row?.note ? `${base}. ${row.note}` : base }
  })
  if (question) {
    details.push({ id: 'question', ok: questionOk === true, note: question.explanation })
  }

  const { verdict, explanation } = explain({
    accuracy,
    wrongIds,
    rows: rowResults.map(({ id, label, lowOk, highOk, low, high }) => ({ id, label, lowOk, highOk, low, high })),
    questionOk,
  })

  return { accuracy, verdict, explanation, details }
}
