import { describe, expect, it } from 'vitest'
import mission, { fcfPath, revenuePath } from './r4-fcf-forecast'
import type { Answer, SliderTask } from '../engine/types'

const task = mission.task as SliderTask

function answer(values: Record<string, number>): Answer {
  return { kind: 'slider', values }
}

const MANAGEMENT_CASE = [6, 6, 5, 5, 4]

describe('r4-fcf-forecast mission', () => {
  it('is a slider task at rung 4, order 3, with the spec base/par', () => {
    expect(mission.id).toBe('r4-fcf-forecast')
    expect(mission.rung).toBe(4)
    expect(mission.order).toBe(3)
    expect(mission.baseComp).toBe(10_000)
    expect(mission.parSeconds).toBe(210)
    expect(task.kind).toBe('slider')
    expect(task.sliders).toHaveLength(5)
  })

  it('has five growth sliders 0-12%, step 0.5, tolerance 0.5, targeting the management case', () => {
    const ids = task.sliders.map((s) => s.id)
    expect(ids).toEqual(['g1', 'g2', 'g3', 'g4', 'g5'])
    task.sliders.forEach((s, i) => {
      expect(s.min).toBe(0)
      expect(s.max).toBe(12)
      expect(s.step).toBe(0.5)
      expect(s.tolerance).toBe(0.5)
      expect(s.unit).toBe('%')
      expect(s.answer).toBe(MANAGEMENT_CASE[i])
    })
  })

  it('has unique slider ids and unique readout ids', () => {
    const sliderIds = task.sliders.map((s) => s.id)
    expect(new Set(sliderIds).size).toBe(sliderIds.length)
    const readoutIds = task.readouts!.map((r) => r.id)
    expect(new Set(readoutIds).size).toBe(readoutIds.length)
    expect(readoutIds).toHaveLength(5)
  })

  it('has no embedded question (nothing to validate a correctId against)', () => {
    expect(task.question).toBeUndefined()
  })

  // Revenue path for the management case: 640,000 compounding at 6/6/5/5/4%.
  it('computes the management-case revenue path off Brickhouse\'s $640,000k base', () => {
    const revenues = revenuePath(MANAGEMENT_CASE)
    expect(revenues[0]).toBeCloseTo(678_400, 4)
    expect(revenues[1]).toBeCloseTo(719_104, 4)
    expect(revenues[2]).toBeCloseTo(755_059.2, 4)
    expect(revenues[3]).toBeCloseTo(792_812.16, 4)
    expect(revenues[4]).toBeCloseTo(824_524.6464, 4)
  })

  // FCF = EBIT x (1 - 25%) + D&A - capex - dNWC, with EBIT = 10% of revenue
  // (15% EBITDA margin - 5% D&A), capex 5.5% of revenue, dNWC 10% of the
  // revenue increase. Verified by hand against the spec's model.
  it('computes the management-case FCF path from the spec model', () => {
    const fcf = fcfPath(MANAGEMENT_CASE)
    expect(fcf[0]).toBeCloseTo(43_648, 2)
    expect(fcf[1]).toBeCloseTo(46_266.88, 2)
    expect(fcf[2]).toBeCloseTo(49_258.624, 2)
    expect(fcf[3]).toBeCloseTo(51_721.5552, 2)
    expect(fcf[4]).toBeCloseTo(54_545.476608, 2)
  })

  it('wires the readouts to the FCF model, matching fcfPath for the management case', () => {
    const values = { g1: 6, g2: 6, g3: 5, g4: 5, g5: 4 }
    const expected = fcfPath(MANAGEMENT_CASE)
    task.readouts!.forEach((r, i) => {
      expect(r.compute(values)).toBeCloseTo(expected[i], 6)
      expect(r.unit).toBe('$k')
    })
  })

  it('wires the chart to five years of FCF', () => {
    const values = { g1: 6, g2: 6, g3: 5, g4: 5, g5: 4 }
    const series = task.chart!.series(values)
    expect(series).toHaveLength(5)
    const expected = fcfPath(MANAGEMENT_CASE)
    series.forEach((s, i) => expect(s.value).toBeCloseTo(expected[i], 6))
  })

  it('gives accuracy 1 for the perfect management-case answer', () => {
    const result = mission.grade(answer({ g1: 6, g2: 6, g3: 5, g4: 5, g5: 4 }))
    expect(result.accuracy).toBe(1)
    expect(result.explanation).toContain('Every year matched the case exactly.')
  })

  it('scores 0.8 and names year 3 when only that slider misses by 2 points', () => {
    // Year 3 set to 7% instead of 5% -> error 2.0, tolerance 0.5 -> that
    // slider scores 0; the other four score 1. Mean = 4/5 = 0.8.
    const result = mission.grade(answer({ g1: 6, g2: 6, g3: 7, g4: 5, g5: 4 }))
    expect(result.accuracy).toBeCloseTo(0.8, 5)
    expect(result.explanation).toContain('Year 3')
    expect(result.explanation).toContain('7.0%')
    expect(result.explanation).toContain("management's case is 5.0%")
    expect(result.explanation).not.toContain('Year 1 growth: you set')
  })

  it('no longer gives full credit for a flat 5% path (a single-point miss now scores 0 on that slider)', () => {
    // Flat 5.0% every year vs management's 6/6/5/5/4: years 1, 2 and 5 miss
    // by exactly 1 point. With tolerance 0.5 that exceeds the tolerance, so
    // those three sliders score 0 and only years 3-4 (exact matches) score
    // 1. Mean = 2/5 = 0.4 - nowhere near the full credit tolerance 1.0 used
    // to hand out for the same flat path the mission's own sensitivity
    // explanation warns is wrong.
    const result = mission.grade(answer({ g1: 5, g2: 5, g3: 5, g4: 5, g5: 5 }))
    expect(result.accuracy).toBeCloseTo(0.4, 5)
    expect(result.accuracy).toBeLessThan(1)
  })

  it('gives accuracy 0 and lists every year when the player leaves every slider at its minimum', () => {
    const result = mission.grade(answer({ g1: 0, g2: 0, g3: 0, g4: 0, g5: 0 }))
    expect(result.accuracy).toBe(0)
    ;['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'].forEach((label) => {
      expect(result.explanation).toContain(label)
    })
  })

  it('always states the year-5 impact of a 1-point growth miss', () => {
    const perfect = mission.grade(answer({ g1: 6, g2: 6, g3: 5, g4: 5, g5: 4 }))
    expect(perfect.explanation).toMatch(/year 1 alone by a single point/)
    expect(perfect.explanation).toContain('year-5 FCF')
  })

  it('throws on the wrong answer kind', () => {
    expect(() => mission.grade({ kind: 'balance', values: {} })).toThrow()
  })

  it('keeps the lesson body under 120 words and defines every term', () => {
    const body = mission.lesson.body
    const words = body.trim().split(/\s+/)
    expect(words.length).toBeLessThan(120)
    expect(body).toMatch(/free cash flow/i)
    expect(body).toMatch(/EBIT/)
    expect(body).toMatch(/D&A/)
    expect(body).toMatch(/depreciation and amortization/i)
    expect(body).toMatch(/capex/i)
    expect(body).toMatch(/net working capital/i)
  })
})
