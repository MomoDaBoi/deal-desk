import { describe, expect, it } from 'vitest'
import mission from './r4-wacc'
import type { BalanceAnswer, BalanceTask } from '../engine/types'

function answer(values: Record<string, number | null>): BalanceAnswer {
  return { kind: 'balance', values }
}

describe('r4-wacc mission', () => {
  it('is a balance task at rung 4, order 2', () => {
    expect(mission.rung).toBe(4)
    expect(mission.order).toBe(2)
    expect(mission.task.kind).toBe('balance')
    expect(mission.baseComp).toBe(9_000)
    expect(mission.parSeconds).toBe(180)
  })

  it('computes after-tax cost of debt 4.50% and WACC 8.30%, tolerance 0.05', () => {
    const task = mission.task as BalanceTask
    expect(task.tolerance).toBe(0.05)
    const answersSection = task.sections.find((s) => s.id === 'answers')!
    const afterTax = answersSection.lines.find((l) => l.id === 'after-tax-cost-of-debt')!
    const wacc = answersSection.lines.find((l) => l.id === 'wacc')!
    expect(afterTax.answer).toBeCloseTo(4.5, 5)
    expect(wacc.answer).toBeCloseTo(8.3, 5)
  })

  it('shows the inputs from the spec: cost of equity 10%, pre-tax cost of debt 6%, tax 25%, equity 580,000, debt 260,000', () => {
    const task = mission.task as BalanceTask
    const inputs = task.sections.find((s) => s.id === 'inputs')!
    const byId = Object.fromEntries(inputs.lines.map((l) => [l.id, l.value]))
    expect(byId['cost-of-equity']).toBe(10.0)
    expect(byId['pretax-cost-of-debt']).toBe(6.0)
    expect(byId['tax-rate']).toBe(25)
    expect(byId['equity-value']).toBe(580_000)
    expect(byId['debt']).toBe(260_000)
  })

  it('gives accuracy 1 for a perfect answer', () => {
    const result = mission.grade(answer({ 'after-tax-cost-of-debt': 4.5, wacc: 8.3 }))
    expect(result.accuracy).toBe(1)
  })

  it('accepts values within the 0.05 tolerance', () => {
    const result = mission.grade(answer({ 'after-tax-cost-of-debt': 4.53, wacc: 8.27 }))
    expect(result.accuracy).toBe(1)
  })

  it('scores 0.5 and names WACC when the player forgets the tax shield entirely', () => {
    // Common slip: use the pre-tax cost of debt (6.0%) unadjusted for tax, so
    // after-tax cost of debt is typed right by coincidence but WACC is blended
    // off the wrong debt cost and lands at 8.76% instead of 8.30%.
    const result = mission.grade(answer({ 'after-tax-cost-of-debt': 4.5, wacc: 8.76 }))
    expect(result.accuracy).toBe(0.5)
    expect(result.explanation).toContain('WACC')
  })

  it('scores 0 when both blanks are missing', () => {
    const result = mission.grade(answer({}))
    expect(result.accuracy).toBe(0)
  })

  it('throws on the wrong answer kind', () => {
    expect(() => mission.grade({ kind: 'quiz', choices: {} })).toThrow()
  })

  it('keeps the lesson body under 120 words and defines every term', () => {
    const words = mission.lesson.body.trim().split(/\s+/)
    expect(words.length).toBeLessThan(120)
    const body = mission.lesson.body
    expect(body).toContain('WACC')
    expect(body).toMatch(/cost of equity/i)
    expect(body).toMatch(/cost of debt/i)
    expect(body).toMatch(/tax shield/i)
    expect(body).toMatch(/tax-deductible/i)
  })

  it('has unique line ids across the task', () => {
    const task = mission.task as BalanceTask
    const ids = task.sections.flatMap((s) => s.lines.map((l) => l.id))
    expect(new Set(ids).size).toBe(ids.length)
  })
})
