import type { GradeResult, SliderAnswer, SliderTask } from '../types'

/**
 * Grade a slider task. Each slider scores 1 when the player's value is
 * within `tolerance` of the answer, degrading linearly to 0 at 2x
 * tolerance (and staying 0 beyond it). A missing value is treated as the
 * slider's `min`. accuracy = mean per-slider score.
 */
export function gradeSlider(
  task: SliderTask,
  answer: SliderAnswer,
  explain: (ctx: {
    accuracy: number
    wrongIds: string[]
    results: { id: string; label: string; expected: number; got: number; score: number }[]
  }) => { verdict: string; explanation: string },
): GradeResult {
  const sliders = task.sliders

  if (sliders.length === 0) {
    return { accuracy: 1, verdict: 'Nothing to set.', explanation: 'Empty task.', details: [] }
  }

  const results = sliders.map((slider) => {
    const got = answer.values[slider.id] ?? slider.min
    const err = Math.abs(got - slider.answer)
    const tolerance = slider.tolerance
    const score = err <= tolerance ? 1 : Math.max(0, 1 - (err - tolerance) / tolerance)
    return { id: slider.id, label: slider.label, expected: slider.answer, got, score, unit: slider.unit ?? '' }
  })

  const details = results.map((r) => {
    const ok = r.score === 1
    return {
      id: r.id,
      ok,
      ...(ok ? {} : { note: `You set ${r.got}${r.unit}, answer ${r.expected}${r.unit}` }),
    }
  })

  const accuracy = results.reduce((sum, r) => sum + r.score, 0) / results.length
  const wrongIds = details.filter((d) => !d.ok).map((d) => d.id)

  const { verdict, explanation } = explain({
    accuracy,
    wrongIds,
    results: results.map(({ id, label, expected, got, score }) => ({ id, label, expected, got, score })),
  })
  return { accuracy, verdict, explanation, details }
}
