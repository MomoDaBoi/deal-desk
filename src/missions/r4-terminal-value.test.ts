import { describe, expect, it } from 'vitest'
import mission from './r4-terminal-value'
import type { Answer, BalanceTask } from '../engine/types'

const task = mission.task as BalanceTask

describe('r4-terminal-value mission', () => {
  it('is a balance task, rung 4, order 4, with base 9,000 and par 180', () => {
    expect(mission.id).toBe('r4-terminal-value')
    expect(mission.rung).toBe(4)
    expect(mission.order).toBe(4)
    expect(mission.baseComp).toBe(9_000)
    expect(mission.parSeconds).toBe(180)
    expect(task.kind).toBe('balance')
    expect(task.unit).toBe('$k')
    expect(task.tolerance).toBe(1_000)
  })

  it('shows the given inputs and has exactly two blanks: terminal value and its PV', () => {
    const allLines = task.sections.flatMap((s) => s.lines)
    const blanks = allLines.filter((l) => l.value === undefined && l.answer !== undefined)
    expect(blanks.map((l) => l.id).sort()).toEqual(['pv-terminal-value', 'terminal-value'])

    const fcf = allLines.find((l) => l.id === 'year5-fcf')!
    expect(fcf.value).toBe(52_000)
    const growth = allLines.find((l) => l.id === 'terminal-growth')!
    expect(growth.value).toBe(2.0)
    const wacc = allLines.find((l) => l.id === 'wacc')!
    expect(wacc.value).toBe(8.3)
    const pvExplicit = allLines.find((l) => l.id === 'pv-explicit-fcf')!
    expect(pvExplicit.value).toBe(200_000)
  })

  it('recomputes terminal value and its present value from the Gordon growth model', () => {
    const allLines = task.sections.flatMap((s) => s.lines)
    const tv = allLines.find((l) => l.id === 'terminal-value')!
    const pvTv = allLines.find((l) => l.id === 'pv-terminal-value')!
    // 52,000 x 1.02 / (0.083 - 0.02) = 841,904.76... -> 841,905
    expect(tv.answer).toBe(841_905)
    // 841,904.76 / 1.083^5 = 565,093.98... -> 565,094
    expect(pvTv.answer).toBe(565_094)
  })

  it('gives accuracy 1 and an explanation naming both figures and the EV share for a perfect answer', () => {
    const answer: Answer = { kind: 'balance', values: { 'terminal-value': 841_905, 'pv-terminal-value': 565_094 } }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(1)
    expect(result.verdict.length).toBeGreaterThan(0)
    expect(result.explanation).toContain('841,905')
    expect(result.explanation).toContain('565,094')
    expect(result.explanation).toContain('73.9%')
  })

  it('scores 0.5 and explains only the terminal value when it alone is wrong', () => {
    const answer: Answer = { kind: 'balance', values: { 'terminal-value': 900_000, 'pv-terminal-value': 565_094 } }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(0.5)
    expect(result.explanation).toContain('841,905')
    expect(result.explanation).toContain('WACC minus growth')
  })

  it('scores 0.5 and explains only the PV of terminal value when it alone is wrong', () => {
    const answer: Answer = { kind: 'balance', values: { 'terminal-value': 841_905, 'pv-terminal-value': 600_000 } }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(0.5)
    expect(result.explanation).toContain('565,094')
    expect(result.explanation).toContain('1.083^5')
  })

  it('gives accuracy 0 when both blanks are way off', () => {
    const answer: Answer = { kind: 'balance', values: { 'terminal-value': 0, 'pv-terminal-value': 0 } }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(0)
    expect(result.explanation).toContain('841,905')
    expect(result.explanation).toContain('565,094')
  })

  it('throws on a mismatched answer kind', () => {
    const wrongKind = { kind: 'slider', values: {} } as unknown as Answer
    expect(() => mission.grade(wrongKind)).toThrow()
  })

  it('keeps the lesson body under 120 words and defines its key terms', () => {
    const wordCount = mission.lesson.body.trim().split(/\s+/).length
    expect(wordCount).toBeLessThan(120)
    const lower = mission.lesson.body.toLowerCase()
    expect(lower).toContain('terminal value')
    expect(lower).toContain('free cash flow')
    expect(lower).toContain('wacc')
    expect(lower).toContain('gordon growth')
  })

  it('has unique line ids across all sections', () => {
    const ids = task.sections.flatMap((s) => s.lines.map((l) => l.id))
    expect(new Set(ids).size).toBe(ids.length)
  })
})
