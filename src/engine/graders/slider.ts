import type { GradeResult, SliderAnswer, SliderTask } from '../types'

type SliderConfig = SliderTask['sliders'][number]

function decimalsOf(step: number): number {
  const s = String(step)
  const i = s.indexOf('.')
  return i === -1 ? 0 : s.length - i - 1
}

/**
 * Format a slider value using the precision implied by the slider's own
 * `step` (so a 0.05 step shows two decimals, not the one-size-fits-all
 * rounding a naive threshold gives). Currency renders as a prefix
 * ("$14.75"); every other unit renders as a suffix ("8.2x", "25.0%").
 */
export function formatSliderValue(value: number, slider: Pick<SliderConfig, 'step' | 'unit'>): string {
  const decimals = decimalsOf(slider.step)
  const s = value.toFixed(decimals)
  const unit = slider.unit ?? ''
  if (!unit) return s
  if (unit === '$') return `$${s}`
  const sep = unit === 'x' || unit === '%' ? '' : ' '
  return `${s}${sep}${unit}`
}

/**
 * Grade a slider task. Each slider scores 1 when the player's value is
 * within `tolerance` of the answer, degrading linearly to 0 at 2x
 * tolerance (and staying 0 beyond it). A missing value is treated as the
 * slider's `min`. sliderAccuracy = mean per-slider score.
 *
 * If `task.question` is present it takes `question.weight` (default 0.4)
 * of the overall accuracy and the sliders share the rest; otherwise
 * accuracy is just sliderAccuracy (byte-for-byte the pre-question shape).
 */
export function gradeSlider(
  task: SliderTask,
  answer: SliderAnswer,
  explain: (ctx: {
    accuracy: number
    wrongIds: string[]
    results: { id: string; label: string; expected: number; got: number; score: number }[]
    questionOk: boolean | null
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
    return { id: slider.id, label: slider.label, expected: slider.answer, got, score, step: slider.step, unit: slider.unit ?? '' }
  })

  const details = results.map((r) => {
    const ok = r.score === 1
    return {
      id: r.id,
      ok,
      ...(ok
        ? {}
        : {
            note: `You set ${formatSliderValue(r.got, r)}, answer ${formatSliderValue(r.expected, r)}`,
          }),
    }
  })

  const sliderAccuracy = results.reduce((sum, r) => sum + r.score, 0) / results.length
  const wrongIds = details.filter((d) => !d.ok).map((d) => d.id)

  const question = task.question
  let questionOk: boolean | null = null
  let accuracy = sliderAccuracy
  if (question) {
    questionOk = answer.choice === question.correctId
    const w = question.weight ?? 0.4
    accuracy = (1 - w) * sliderAccuracy + w * (questionOk ? 1 : 0)
    if (!questionOk) wrongIds.push('question')
    details.push({ id: 'question', ok: questionOk, note: question.explanation })
  }

  const { verdict, explanation } = explain({
    accuracy,
    wrongIds,
    results: results.map(({ id, label, expected, got, score }) => ({ id, label, expected, got, score })),
    questionOk,
  })
  return { accuracy, verdict, explanation, details }
}
