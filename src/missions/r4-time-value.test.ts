import { describe, expect, it } from 'vitest'
import mission from './r4-time-value'
import type { Answer, SliderTask } from '../engine/types'

const task = mission.task as SliderTask

const PV1 = 90.91
const PV3 = 75.13
const PV5 = 62.09

describe('r4-time-value mission', () => {
  it('is a slider task, rung 4, order 1, with base comp 8,000 and par 150s', () => {
    expect(mission.id).toBe('r4-time-value')
    expect(mission.rung).toBe(4)
    expect(mission.order).toBe(1)
    expect(mission.baseComp).toBe(8_000)
    expect(mission.parSeconds).toBe(150)
    expect(task.kind).toBe('slider')
    expect(task.sliders).toHaveLength(3)
  })

  it('recomputes PV = FV / (1+r)^n for 1, 3 and 5 years at 10%', () => {
    const pv1 = task.sliders.find((s) => s.id === 'pv1')!
    const pv3 = task.sliders.find((s) => s.id === 'pv3')!
    const pv5 = task.sliders.find((s) => s.id === 'pv5')!
    // 100 / 1.1^1 = 90.909... -> 90.91
    expect(pv1.answer).toBeCloseTo(PV1, 5)
    // 100 / 1.1^3 = 75.131... -> 75.13
    expect(pv3.answer).toBeCloseTo(PV3, 5)
    // 100 / 1.1^5 = 62.092... -> 62.09
    expect(pv5.answer).toBeCloseTo(PV5, 5)
  })

  it('gives every slider the spec unit, range, step and tolerance', () => {
    for (const id of ['pv1', 'pv3', 'pv5']) {
      const slider = task.sliders.find((s) => s.id === id)!
      expect(slider.unit).toBe('$')
      expect(slider.min).toBe(40)
      expect(slider.max).toBe(100)
      expect(slider.step).toBeCloseTo(0.1)
      expect(slider.tolerance).toBeCloseTo(0.5)
      expect(slider.hint).toBeTruthy()
      expect(slider.hint!.length).toBeGreaterThan(0)
    }
  })

  it('has no readouts (spec: readouts none)', () => {
    expect(task.readouts).toBeUndefined()
  })

  it('gives accuracy 1 and a full explanation for a perfect answer', () => {
    const answer: Answer = { kind: 'slider', values: { pv1: PV1, pv3: PV3, pv5: PV5 } }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(1)
    expect(result.verdict.length).toBeGreaterThan(0)
    expect(result.explanation).toContain('90.91')
    expect(result.explanation).toContain('75.13')
    expect(result.explanation).toContain('62.09')
  })

  it('scores partial credit and names only the missed slider (pv1 way off)', () => {
    const answer: Answer = { kind: 'slider', values: { pv1: 50, pv3: PV3, pv5: PV5 } }
    const result = mission.grade(answer)
    // pv1 err = 40.91 >> 2x tolerance (1.0) -> score 0; pv3, pv5 score 1 each.
    expect(result.accuracy).toBeCloseTo(2 / 3, 5)
    expect(result.explanation).toContain('1 year')
    expect(result.explanation).toContain('90.91')
    expect(result.explanation).not.toContain('3 years')
    expect(result.explanation).not.toContain('5 years')
  })

  it('scores partial credit and names only the missed slider (pv5 way off)', () => {
    const answer: Answer = { kind: 'slider', values: { pv1: PV1, pv3: PV3, pv5: 40 } }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(2 / 3, 5)
    expect(result.explanation).toContain('5 years')
    expect(result.explanation).toContain('62.09')
    expect(result.explanation).not.toContain('1 year')
    expect(result.explanation).not.toContain('3 years')
  })

  it('gives accuracy 0 and shows every division when everything is way off', () => {
    const answer: Answer = { kind: 'slider', values: { pv1: 40, pv3: 40, pv5: 40 } }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(0)
    expect(result.explanation).toContain('90.91')
    expect(result.explanation).toContain('75.13')
    expect(result.explanation).toContain('62.09')
  })

  it('throws on a mismatched answer kind', () => {
    const wrongKind = { kind: 'balance', values: {} } as unknown as Answer
    expect(() => mission.grade(wrongKind)).toThrow()
  })

  it('keeps the lesson body under 120 words and defines its key terms', () => {
    const wordCount = mission.lesson.body.trim().split(/\s+/).length
    expect(wordCount).toBeLessThan(120)
    const lower = mission.lesson.body.toLowerCase()
    expect(lower).toContain('time value of money')
    expect(lower).toContain('discount')
    expect(lower).toContain('present value')
    expect(lower).toContain('pv = fv / (1 + r)^n')
  })

  it('has unique slider ids', () => {
    const ids = task.sliders.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
