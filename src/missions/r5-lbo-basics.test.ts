import { describe, expect, it } from 'vitest'
import mission, { computeLboOutcome, ebitdaPath } from './r5-lbo-basics'
import { BRICKHOUSE } from './companies'
import type { Answer, SliderTask } from '../engine/types'

const task = mission.task as SliderTask
const ENTRY_EBITDA = BRICKHOUSE.income.ebitda // 96,000
const ENTRY_EV = 800_000 // ~8.3x entry EBITDA, per the mission brief

describe('r5-lbo-basics mission', () => {
  it('is a slider task with two sliders plus a question, rung 5, order 1', () => {
    expect(mission.id).toBe('r5-lbo-basics')
    expect(mission.rung).toBe(5)
    expect(mission.order).toBe(1)
    expect(mission.baseComp).toBe(10_000)
    expect(mission.parSeconds).toBe(180)
    expect(task.kind).toBe('slider')
    expect(task.sliders).toHaveLength(2)
    expect(task.question).toBeDefined()
  })

  it('has unique slider ids', () => {
    const ids = task.sliders.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has slider bounds and answers matching the spec', () => {
    const leverage = task.sliders.find((s) => s.id === 'leverage')!
    const exit = task.sliders.find((s) => s.id === 'exit')!
    expect(leverage).toMatchObject({ min: 2, max: 7, step: 0.5, answer: 5.0, tolerance: 0.5, unit: 'x' })
    expect(exit).toMatchObject({ min: 6, max: 11, step: 0.1, answer: 8.3, tolerance: 0.3, unit: 'x' })
  })

  it('the embedded question correctId exists among its choices', () => {
    const question = task.question!
    expect(question.choices.some((c) => c.id === question.correctId)).toBe(true)
    expect(question.correctId).toBe('paydown')
    expect(question.weight).toBe(0.4)
  })

  // --- Model correctness -------------------------------------------------

  it('ebitdaPath compounds at 5% a year for 5 years', () => {
    const path = ebitdaPath(ENTRY_EBITDA, 0.05, 5)
    expect(path).toHaveLength(5)
    expect(path[0]).toBeCloseTo(ENTRY_EBITDA * 1.05, 6)
    expect(path[4]).toBeCloseTo(ENTRY_EBITDA * Math.pow(1.05, 5), 6)
  })

  it('computes the entry debt and equity check from leverage', () => {
    const outcome = computeLboOutcome(5.0, 8.3)
    // 5.0x * 96,000 = 480,000 debt; 800,000 - 480,000 = 320,000 equity in
    expect(outcome.debtEntry).toBeCloseTo(480_000, 6)
    expect(outcome.equityIn).toBeCloseTo(320_000, 6)
  })

  it('sweeps 60% of each year of (grown) EBITDA to debt paydown', () => {
    const path = ebitdaPath(ENTRY_EBITDA, 0.05, 5)
    const expectedPaydown = path.reduce((sum, e) => sum + 0.6 * e, 0)
    const outcome = computeLboOutcome(5.0, 8.3)
    expect(outcome.totalPaydown).toBeCloseTo(expectedPaydown, 6)
    expect(outcome.debtRemaining).toBeCloseTo(outcome.debtEntry - expectedPaydown, 6)
  })

  it('computes exit EV, equity out, and IRR at the answer sliders', () => {
    const outcome = computeLboOutcome(5.0, 8.3)
    // year-5 EBITDA ~= 122,523.03
    expect(outcome.exitEbitda).toBeCloseTo(96_000 * Math.pow(1.05, 5), 3)
    // exit EV = 8.3 * exitEbitda ~= 1,016,941
    expect(outcome.exitEV).toBeCloseTo(8.3 * outcome.exitEbitda, 3)
    expect(outcome.equityOut).toBeCloseTo(outcome.exitEV - outcome.debtRemaining, 3)
    const expectedIrr = Math.pow(outcome.equityOut / outcome.equityIn, 1 / 5) - 1
    expect(outcome.irr).toBeCloseTo(expectedIrr, 9)
    // sanity: this deal returns roughly 22% a year
    expect(outcome.irr).toBeCloseTo(0.2218, 3)
  })

  it('floors remaining debt at zero rather than going negative', () => {
    // Minimum leverage (2x) means little debt to begin with; paydown swamps it.
    const outcome = computeLboOutcome(2, 8.3)
    expect(outcome.debtRemaining).toBe(0)
  })

  it('debt paydown drives more of the value creation than growth or a flatter/richer exit multiple', () => {
    const outcome = computeLboOutcome(5.0, 8.3)
    const entryMultiple = ENTRY_EV / ENTRY_EBITDA
    const growthEffect = entryMultiple * (outcome.exitEbitda - ENTRY_EBITDA)
    const multipleEffect = (8.3 - entryMultiple) * outcome.exitEbitda
    const paydownEffect = outcome.totalPaydown
    const valueCreated = outcome.equityOut - outcome.equityIn
    // The three effects should reconcile to total value creation.
    expect(growthEffect + multipleEffect + paydownEffect).toBeCloseTo(valueCreated, 1)
    // Paydown is the largest single driver of return, which is why 'paydown' is correct.
    expect(paydownEffect).toBeGreaterThan(growthEffect)
    expect(paydownEffect).toBeGreaterThan(multipleEffect)
    expect(paydownEffect).toBeGreaterThan(0)
  })

  it('readouts recompute live from the slider values, not just the answer', () => {
    const values = { leverage: 5.0, exit: 8.3 }
    const debtEntry = task.readouts!.find((r) => r.id === 'debtEntry')!.compute(values)
    const equityIn = task.readouts!.find((r) => r.id === 'equityIn')!.compute(values)
    const equityOut = task.readouts!.find((r) => r.id === 'equityOut')!.compute(values)
    const irr = task.readouts!.find((r) => r.id === 'irr')!.compute(values)
    expect(debtEntry).toBeCloseTo(480_000, 6)
    expect(equityIn).toBeCloseTo(320_000, 6)
    expect(equityOut).toBeCloseTo(computeLboOutcome(5.0, 8.3).equityOut, 3)
    expect(irr).toBeCloseTo(22.18, 1) // readout reports IRR as a percentage number

    // And they move when the slider values move (different leverage).
    const otherDebtEntry = task.readouts!.find((r) => r.id === 'debtEntry')!.compute({ leverage: 3, exit: 8.3 })
    expect(otherDebtEntry).toBeCloseTo(3 * ENTRY_EBITDA, 6)
    expect(otherDebtEntry).not.toBeCloseTo(debtEntry, 0)
  })

  it('the chart compares equity in vs equity out and recomputes live', () => {
    const series = task.chart!.series({ leverage: 5.0, exit: 8.3 })
    expect(series).toHaveLength(2)
    const inSeries = series.find((s) => s.label === 'Equity in')!
    const outSeries = series.find((s) => s.label === 'Equity out')!
    expect(inSeries.value).toBeCloseTo(320_000, 6)
    expect(outSeries.value).toBeCloseTo(computeLboOutcome(5.0, 8.3).equityOut, 3)
  })

  // --- Grading -------------------------------------------------------------

  it('gives accuracy 1 and a full explanation for a perfect answer', () => {
    const answer: Answer = { kind: 'slider', values: { leverage: 5.0, exit: 8.3 }, choice: 'paydown' }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(1)
    expect(result.verdict.length).toBeGreaterThan(0)
    expect(result.explanation).toContain('480,000k')
    expect(result.explanation).toContain('exit enterprise value')
  })

  it('penalizes a wrong leverage alone and names the debt figure, not the exit line', () => {
    // leverage way off (2 vs 5.0, tolerance 0.5, error 3 > 2x tolerance -> score 0);
    // exit and the question both correct, isolating the miss to leverage.
    const answer: Answer = { kind: 'slider', values: { leverage: 2, exit: 8.3 }, choice: 'paydown' }
    const result = mission.grade(answer)
    // sliderAccuracy = (0 + 1) / 2 = 0.5; question correct at weight 0.4 -> 0.6*0.5 + 0.4*1 = 0.7
    expect(result.accuracy).toBeCloseTo(0.7, 6)
    expect(result.explanation).toContain('Leverage sets the debt')
    expect(result.explanation).toContain('480,000k')
    expect(result.explanation).not.toContain('exit enterprise value')
  })

  it('penalizes a wrong exit multiple alone and names the exit line, not the debt line', () => {
    // exit way off (6 vs 8.3, tolerance 0.3, error 2.3 > 2x tolerance -> score 0);
    // leverage and the question both correct, isolating the miss to exit.
    const answer: Answer = { kind: 'slider', values: { leverage: 5.0, exit: 6 }, choice: 'paydown' }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(0.7, 6)
    expect(result.explanation).toContain('exit enterprise value')
    expect(result.explanation).not.toContain('Leverage sets the debt')
  })

  it('penalizes a wrong question choice and explains why paydown drove the return', () => {
    const answer: Answer = { kind: 'slider', values: { leverage: 5.0, exit: 8.3 }, choice: 'multiple' }
    const result = mission.grade(answer)
    // sliders perfect (1.0) at weight 0.6, question wrong (0) at weight 0.4 -> 0.6
    expect(result.accuracy).toBeCloseTo(0.6, 6)
    expect(result.explanation).toContain('Debt paydown swept')
  })

  it('gives accuracy 0 when everything is wrong', () => {
    const answer: Answer = { kind: 'slider', values: { leverage: 2, exit: 6 }, choice: 'growth' }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(0)
    expect(result.explanation).toContain('480,000k')
    expect(result.explanation).toContain('exit enterprise value')
  })

  it('throws on a mismatched answer kind', () => {
    const wrongKind = { kind: 'balance', values: {} } as unknown as Answer
    expect(() => mission.grade(wrongKind)).toThrow()
  })

  it('keeps the lesson body under 120 words and defines its key terms', () => {
    const wordCount = mission.lesson.body.trim().split(/\s+/).length
    expect(wordCount).toBeLessThan(120)
    const lower = mission.lesson.body.toLowerCase()
    expect(lower).toContain('leveraged buyout')
    expect(lower).toContain('leverage')
    expect(lower).toContain('ebitda')
    expect(lower).toContain('debt')
    expect(lower).toContain('equity check')
    expect(lower).toContain('enterprise value')
    expect(lower).toContain('irr')
    expect(lower).toContain('internal rate of return')
  })
})
