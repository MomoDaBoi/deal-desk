import { describe, expect, it, vi } from 'vitest'
import { gradeSlider } from './slider'
import type { SliderTask } from '../types'

const noop = () => ({ verdict: 'v', explanation: 'e' })

function task(): SliderTask {
  return {
    kind: 'slider',
    prompt: 'Set the discount rate.',
    sliders: [
      { id: 'a', label: 'Slider A', min: 0, max: 100, step: 1, answer: 50, tolerance: 5, unit: '%' },
      { id: 'b', label: 'Slider B', min: 0, max: 20, step: 0.5, answer: 10, tolerance: 2, unit: 'x' },
    ],
  }
}

describe('gradeSlider', () => {
  it('scores 1 for an exact hit', () => {
    const t = task()
    const result = gradeSlider(t, { kind: 'slider', values: { a: 50, b: 10 } }, noop)
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([
      { id: 'a', ok: true },
      { id: 'b', ok: true },
    ])
  })

  it('scores 1 within tolerance', () => {
    const t = task()
    const result = gradeSlider(t, { kind: 'slider', values: { a: 54, b: 10 } }, noop)
    expect(result.details).toEqual([
      { id: 'a', ok: true },
      { id: 'b', ok: true },
    ])
    expect(result.accuracy).toBe(1)
  })

  it('scores 0.5 at 1.5x tolerance', () => {
    const t = task()
    // slider a: tolerance 5, 1.5x tolerance = 7.5 error -> got = 57.5
    const explain = vi.fn(noop)
    const result = gradeSlider(t, { kind: 'slider', values: { a: 57.5, b: 10 } }, explain)
    const arg = explain.mock.calls[0]![0]
    const aResult = arg.results.find((r) => r.id === 'a')!
    expect(aResult.score).toBeCloseTo(0.5)
    expect(result.accuracy).toBeCloseTo((0.5 + 1) / 2)
  })

  it('scores 0 at exactly 2x tolerance', () => {
    const t = task()
    // slider a: tolerance 5, 2x tolerance = 10 error -> got = 60
    const result = gradeSlider(t, { kind: 'slider', values: { a: 60, b: 10 } }, noop)
    const details = result.details!
    expect(details.find((d) => d.id === 'a')!.ok).toBe(false)
  })

  it('scores 0 beyond 2x tolerance (never negative)', () => {
    const t = task()
    const explain = vi.fn(noop)
    gradeSlider(t, { kind: 'slider', values: { a: 90, b: 10 } }, explain)
    const arg = explain.mock.calls[0]![0]
    const aResult = arg.results.find((r) => r.id === 'a')!
    expect(aResult.score).toBe(0)
  })

  it('treats a missing value as the slider minimum', () => {
    const t = task()
    const explain = vi.fn(noop)
    gradeSlider(t, { kind: 'slider', values: { b: 10 } }, explain)
    const arg = explain.mock.calls[0]![0]
    const aResult = arg.results.find((r) => r.id === 'a')!
    expect(aResult.got).toBe(0) // slider a's min
    expect(aResult.score).toBe(0) // 50 error, way beyond 2x tolerance of 5
  })

  it('takes the mean across sliders', () => {
    const t = task()
    // a exact (score 1), b missing -> got = 0, error 10, tolerance 2 -> beyond 2x, score 0
    const result = gradeSlider(t, { kind: 'slider', values: { a: 50 } }, noop)
    expect(result.accuracy).toBeCloseTo(0.5)
  })

  it('gives a details note with formatted values and unit for a miss', () => {
    const t = task()
    const result = gradeSlider(t, { kind: 'slider', values: { a: 90, b: 10 } }, noop)
    const details = result.details!
    expect(details.find((d) => d.id === 'a')).toEqual({
      id: 'a',
      ok: false,
      note: 'You set 90%, answer 50%',
    })
  })

  it('returns accuracy 1 for an empty task without calling explain', () => {
    const explain = vi.fn(noop)
    const t: SliderTask = { kind: 'slider', prompt: 'p', sliders: [] }
    const result = gradeSlider(t, { kind: 'slider', values: {} }, explain)
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([])
    expect(explain).not.toHaveBeenCalled()
  })

  it('collects wrongIds for every slider scoring below 1', () => {
    const t = task()
    const explain = vi.fn(noop)
    gradeSlider(t, { kind: 'slider', values: { a: 90, b: 10 } }, explain)
    const arg = explain.mock.calls[0]![0]
    expect(arg.wrongIds).toEqual(['a'])
  })
})
