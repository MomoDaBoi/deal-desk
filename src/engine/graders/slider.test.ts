import { describe, expect, it, vi } from 'vitest'
import { formatSliderValue, gradeSlider } from './slider'
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

  it('formats a details note with step-derived decimals and a prefixed currency unit', () => {
    const t: SliderTask = {
      kind: 'slider',
      prompt: 'Set the offer price.',
      sliders: [
        { id: 'price', label: 'Offer price', min: 10, max: 20, step: 0.05, answer: 14.75, tolerance: 0.1, unit: '$' },
      ],
    }
    const result = gradeSlider(t, { kind: 'slider', values: { price: 12 } }, noop)
    expect(result.details).toEqual([{ id: 'price', ok: false, note: 'You set $12.00, answer $14.75' }])
  })

  it('rounds off floating-point drift in the note instead of printing raw precision', () => {
    const t: SliderTask = {
      kind: 'slider',
      prompt: 'Set the offer price.',
      sliders: [
        { id: 'price', label: 'Offer price', min: 10, max: 20, step: 0.05, answer: 14.75, tolerance: 0.1, unit: '$' },
      ],
    }
    // simulates the accumulated float error the +/- nudge buttons can produce
    const result = gradeSlider(t, { kind: 'slider', values: { price: 12.399999999999999 } }, noop)
    expect(result.details).toEqual([{ id: 'price', ok: false, note: 'You set $12.40, answer $14.75' }])
  })
})

describe('gradeSlider with an embedded question', () => {
  function taskWithQuestion(weight?: number): SliderTask {
    return {
      ...task(),
      question: {
        text: 'Why did the multiple compress?',
        choices: [
          { id: 'right', label: 'Rates rose' },
          { id: 'wrong', label: 'Revenue grew' },
        ],
        correctId: 'right',
        explanation: 'Higher rates compress multiples.',
        ...(weight === undefined ? {} : { weight }),
      },
    }
  }

  it('blends slider accuracy and the question at the default 0.4 weight', () => {
    const t = taskWithQuestion()
    // sliders exact (sliderAccuracy 1), question correct -> accuracy 1
    const result = gradeSlider(t, { kind: 'slider', values: { a: 50, b: 10 }, choice: 'right' }, noop)
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([
      { id: 'a', ok: true },
      { id: 'b', ok: true },
      { id: 'question', ok: true, note: 'Higher rates compress multiples.' },
    ])
  })

  it('penalises a wrong choice by the question weight', () => {
    const t = taskWithQuestion()
    const explain = vi.fn(noop)
    const result = gradeSlider(t, { kind: 'slider', values: { a: 50, b: 10 }, choice: 'wrong' }, explain)
    // sliderAccuracy 1, questionOk false -> accuracy = 0.6*1 + 0.4*0 = 0.6
    expect(result.accuracy).toBeCloseTo(0.6)
    const arg = explain.mock.calls[0]![0]
    expect(arg.questionOk).toBe(false)
    expect(arg.wrongIds).toEqual(['question'])
    expect(result.details).toContainEqual({ id: 'question', ok: false, note: 'Higher rates compress multiples.' })
  })

  it('treats a missing choice as wrong', () => {
    const t = taskWithQuestion()
    const result = gradeSlider(t, { kind: 'slider', values: { a: 50, b: 10 }, choice: null }, noop)
    expect(result.accuracy).toBeCloseTo(0.6)
    expect(result.details).toContainEqual({ id: 'question', ok: false, note: 'Higher rates compress multiples.' })
  })

  it('honours a custom weight', () => {
    const t = taskWithQuestion(0.5)
    // sliderAccuracy 1, question wrong -> accuracy = 0.5*1 + 0.5*0 = 0.5
    const result = gradeSlider(t, { kind: 'slider', values: { a: 50, b: 10 }, choice: 'wrong' }, noop)
    expect(result.accuracy).toBeCloseTo(0.5)
  })

  it('blends a non-perfect slider score with the question', () => {
    const t = taskWithQuestion()
    // slider a at 2x tolerance -> score 0, slider b exact -> score 1, sliderAccuracy 0.5
    const result = gradeSlider(t, { kind: 'slider', values: { a: 60, b: 10 }, choice: 'right' }, noop)
    // accuracy = 0.6*0.5 + 0.4*1 = 0.7
    expect(result.accuracy).toBeCloseTo(0.7)
  })

  it('passes questionOk through to explain even when null is impossible (question present)', () => {
    const t = taskWithQuestion()
    const explain = vi.fn(noop)
    gradeSlider(t, { kind: 'slider', values: { a: 50, b: 10 }, choice: 'right' }, explain)
    const arg = explain.mock.calls[0]![0]
    expect(arg.questionOk).toBe(true)
  })

  it('passes questionOk as null when there is no question', () => {
    const t = task()
    const explain = vi.fn(noop)
    gradeSlider(t, { kind: 'slider', values: { a: 50, b: 10 } }, explain)
    const arg = explain.mock.calls[0]![0]
    expect(arg.questionOk).toBeNull()
  })
})

describe('formatSliderValue', () => {
  it('derives decimal places from the step', () => {
    expect(formatSliderValue(14.75, { step: 0.05 })).toBe('14.75')
    expect(formatSliderValue(50, { step: 1 })).toBe('50')
    expect(formatSliderValue(8.2, { step: 0.1 })).toBe('8.2')
  })

  it('prefixes a currency unit', () => {
    expect(formatSliderValue(14.75, { step: 0.05, unit: '$' })).toBe('$14.75')
  })

  it('suffixes a multiplier or percent unit with no space', () => {
    expect(formatSliderValue(8.2, { step: 0.1, unit: 'x' })).toBe('8.2x')
    expect(formatSliderValue(25, { step: 1, unit: '%' })).toBe('25%')
  })

  it('suffixes any other unit with a leading space', () => {
    expect(formatSliderValue(5, { step: 1, unit: 'yrs' })).toBe('5 yrs')
  })
})
