import { describe, expect, it } from 'vitest'
import mission from './r3-precedents'
import type { Answer, SliderTask } from '../engine/types'

const task = mission.task as SliderTask

describe('r3-precedents mission', () => {
  it('is a slider task with two sliders, rung 3, order 4', () => {
    expect(mission.id).toBe('r3-precedents')
    expect(mission.rung).toBe(3)
    expect(mission.order).toBe(4)
    expect(mission.baseComp).toBe(7_000)
    expect(mission.parSeconds).toBe(150)
    expect(task.kind).toBe('slider')
    expect(task.sliders).toHaveLength(2)
  })

  it('recomputes the offer price and implied multiple from the company bible', () => {
    const offer = task.sliders.find((s) => s.id === 'offerPrice')!
    const multiple = task.sliders.find((s) => s.id === 'impliedMultiple')!
    // 11.80 x 1.25 = 14.75
    expect(offer.answer).toBeCloseTo(14.75, 5)
    expect(offer.tolerance).toBeCloseTo(0.1)
    // equity 60,000k x 14.75 = 885,000; + net debt 300,000 = EV 1,185,000; / EBITDA 144,000 = 8.2291..
    expect(multiple.answer).toBeCloseTo(8.2, 5)
    expect(multiple.tolerance).toBeCloseTo(0.15)
  })

  it('gives accuracy 1 and a full arithmetic explanation for a perfect answer', () => {
    const answer: Answer = { kind: 'slider', values: { offerPrice: 14.75, impliedMultiple: 8.2 } }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(1)
    expect(result.verdict.length).toBeGreaterThan(0)
    expect(result.explanation).toContain('14.75')
    expect(result.explanation).toContain('8.2x')
  })

  it('scores 0.5 and explains only the offer price when it alone is way off', () => {
    const answer: Answer = { kind: 'slider', values: { offerPrice: 13, impliedMultiple: 8.2 } }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(0.5)
    expect(result.explanation).toContain('control premium')
    expect(result.explanation).toContain('14.75')
    expect(result.explanation).not.toContain('8.2x')
  })

  it('scores 0.5 and explains only the implied multiple when it alone is way off', () => {
    const answer: Answer = { kind: 'slider', values: { offerPrice: 14.75, impliedMultiple: 6 } }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(0.5)
    expect(result.explanation).toContain('enterprise value')
    expect(result.explanation).toContain('8.2x')
    expect(result.explanation).not.toContain('control premium')
  })

  it('gives accuracy 0 and shows both lines of arithmetic when everything is way off', () => {
    const answer: Answer = { kind: 'slider', values: { offerPrice: 10, impliedMultiple: 12 } }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(0)
    expect(result.explanation).toContain('14.75')
    expect(result.explanation).toContain('8.2x')
  })

  it('throws on a mismatched answer kind', () => {
    const wrongKind = { kind: 'balance', values: {} } as unknown as Answer
    expect(() => mission.grade(wrongKind)).toThrow()
  })

  it('keeps the lesson body under 120 words and defines its key terms', () => {
    const wordCount = mission.lesson.body.trim().split(/\s+/).length
    expect(wordCount).toBeLessThan(120)
    const lower = mission.lesson.body.toLowerCase()
    expect(lower).toContain('control premium')
    expect(lower).toContain('precedent transaction')
    expect(lower).toContain('enterprise value')
    expect(lower).toContain('ebitda')
  })

  it('has unique slider ids', () => {
    const ids = task.sliders.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
