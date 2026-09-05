import type { Answer, GradeResult, MultiAnswer, MultiTask } from '../types'

/** Result stood in for a stage the player never submitted an answer for. */
const NOT_ATTEMPTED: GradeResult = {
  accuracy: 0,
  verdict: 'Not attempted.',
  explanation: 'You left this stage blank, so it scores zero.',
}

/** Result stood in for a stage the mission forgot to supply a grader for. */
const NO_GRADER: GradeResult = {
  accuracy: 0,
  verdict: 'Ungraded stage.',
  explanation: 'This stage has no grader wired up, so it scores zero.',
}

/**
 * Grade a multi-stage capstone. Every stage is graded by the mission's own
 * stage grader (keyed by stage id); the capstone's accuracy is the plain
 * mean of the stage accuracies, so a stage cannot be skipped for free — a
 * missing stage answer scores 0 and still counts in the mean.
 *
 * `details` carries one row per stage, `ok` at the 70% pass mark used
 * everywhere else in the game, and the stage grader's own verdict as the
 * note so the result screen can show what went wrong stage by stage.
 *
 * Pure: no clock, no randomness. The stage graders are supplied by the
 * caller, which keeps this file free of every other grader's imports.
 */
export function gradeMulti(
  task: MultiTask,
  answer: MultiAnswer,
  stageGraders: Record<string, (a: Answer) => GradeResult>,
  explain: (ctx: {
    accuracy: number
    stages: { id: string; title: string; accuracy: number; verdict: string }[]
  }) => { verdict: string; explanation: string },
): GradeResult {
  const stages = task.stages

  if (stages.length === 0) {
    return { accuracy: 1, verdict: 'Nothing to run.', explanation: 'Empty task.', details: [] }
  }

  const results = stages.map((stage) => {
    const submitted = answer.answers[stage.id]
    const grader = stageGraders[stage.id]
    const result = submitted === undefined ? NOT_ATTEMPTED : grader === undefined ? NO_GRADER : grader(submitted)
    return { id: stage.id, title: stage.title, accuracy: result.accuracy, verdict: result.verdict }
  })

  const accuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length

  const details = results.map((r) => ({
    id: r.id,
    ok: r.accuracy >= 0.7,
    note: `${Math.round(r.accuracy * 100)}% - ${r.verdict}`,
  }))

  const { verdict, explanation } = explain({ accuracy, stages: results })
  return { accuracy, verdict, explanation, details }
}
