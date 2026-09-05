import { describe, expect, it } from 'vitest'
import mission from './r2-waterfall-ebitda'
import type { Answer } from '../engine/types'

const PERFECT: Record<string, number | null> = {
  'gross-profit': 60_000,
  ebitda: 12_000,
  ebit: 8_000,
  'net-income': 3_750,
}

describe('r2-waterfall-ebitda mission', () => {
  it('gives accuracy 1 for every correct blank', () => {
    const answer: Answer = { kind: 'waterfall', values: PERFECT }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(1)
    expect(result.verdict.length).toBeGreaterThan(0)
    expect(result.explanation.length).toBeGreaterThan(0)
  })

  it('scores 3/4 and explains EBITDA when it is wrong', () => {
    const answer: Answer = {
      kind: 'waterfall',
      values: { ...PERFECT, ebitda: 999 },
    }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(3 / 4)
    expect(result.explanation.toLowerCase()).toContain('ebitda')
    expect(result.explanation).toContain('12,000')
    expect(result.explanation).toContain('60,000')
  })

  it('scores 0 and explains every line when nothing is filled in', () => {
    const answer: Answer = {
      kind: 'waterfall',
      values: { 'gross-profit': null, ebitda: null, ebit: null, 'net-income': null },
    }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(0)
    expect(result.explanation.toLowerCase()).toContain('gross profit')
    expect(result.explanation.toLowerCase()).toContain('ebitda')
    expect(result.explanation).toContain('3,750')
  })

  it('throws when given the wrong answer kind', () => {
    const badAnswer = { kind: 'order' } as unknown as Answer
    expect(() => mission.grade(badAnswer)).toThrow('wrong answer kind')
  })

  it('keeps the lesson body under 120 words', () => {
    const wordCount = mission.lesson.body.trim().split(/\s+/).length
    expect(wordCount).toBeLessThan(120)
  })

  it('defines EBITDA in the lesson body', () => {
    expect(mission.lesson.body).toContain('EBITDA')
    expect(mission.lesson.body.toLowerCase()).toContain('earnings before interest')
  })

  it('has exactly four blanks and every step id unique', () => {
    if (mission.task.kind !== 'waterfall') throw new Error('expected a waterfall task')
    const blanks = mission.task.steps.filter((s) => s.value === undefined && s.answer !== undefined)
    expect(blanks).toHaveLength(4)

    const stepIds = mission.task.steps.map((s) => s.id)
    expect(new Set(stepIds).size).toBe(stepIds.length)
  })

  it('walks the arithmetic correctly top to bottom', () => {
    if (mission.task.kind !== 'waterfall') throw new Error('expected a waterfall task')
    const lineById = new Map(mission.task.steps.map((s) => [s.id, s.value ?? s.answer ?? 0]))
    const revenue = lineById.get('revenue') ?? 0
    const costOfRevenue = lineById.get('cost-of-revenue') ?? 0
    const grossProfit = lineById.get('gross-profit') ?? 0
    expect(revenue + costOfRevenue).toBe(grossProfit)

    const sga = lineById.get('sales-marketing') ?? 0
    const rnd = lineById.get('research-development') ?? 0
    const gna = lineById.get('general-admin') ?? 0
    const ebitda = lineById.get('ebitda') ?? 0
    expect(grossProfit + sga + rnd + gna).toBe(ebitda)

    const da = lineById.get('depreciation-amortisation') ?? 0
    const ebit = lineById.get('ebit') ?? 0
    expect(ebitda + da).toBe(ebit)

    const interest = lineById.get('interest-expense') ?? 0
    const taxes = lineById.get('taxes') ?? 0
    const netIncome = lineById.get('net-income') ?? 0
    expect(ebit + interest + taxes).toBe(netIncome)
  })

  it('matches the spec figures exactly', () => {
    if (mission.task.kind !== 'waterfall') throw new Error('expected a waterfall task')
    const lineById = new Map(mission.task.steps.map((s) => [s.id, s.value ?? s.answer ?? 0]))
    expect(lineById.get('revenue')).toBe(80_000)
    expect(lineById.get('cost-of-revenue')).toBe(-20_000)
    expect(lineById.get('gross-profit')).toBe(60_000)
    expect(lineById.get('sales-marketing')).toBe(-26_000)
    expect(lineById.get('research-development')).toBe(-14_000)
    expect(lineById.get('general-admin')).toBe(-8_000)
    expect(lineById.get('ebitda')).toBe(12_000)
    expect(lineById.get('depreciation-amortisation')).toBe(-4_000)
    expect(lineById.get('ebit')).toBe(8_000)
    expect(lineById.get('interest-expense')).toBe(-3_000)
    expect(lineById.get('taxes')).toBe(-1_250)
    expect(lineById.get('net-income')).toBe(3_750)
    expect(mission.rung).toBe(2)
    expect(mission.order).toBe(1)
    expect(mission.baseComp).toBe(6_000)
    expect(mission.parSeconds).toBe(150)
    expect(mission.task.unit).toBe('$k')
    expect(mission.task.tolerance).toBe(0)
  })
})
