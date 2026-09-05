import { describe, expect, it, vi } from 'vitest'
import { gradeWaterfall } from './waterfall'
import type { WaterfallAnswer, WaterfallTask } from '../types'

const noop = () => ({ verdict: 'v', explanation: 'e' })

function baseTask(overrides: Partial<WaterfallTask> = {}): WaterfallTask {
  return {
    kind: 'waterfall',
    prompt: 'Build the waterfall.',
    unit: '$k',
    steps: [
      { id: 'revenue', label: 'Revenue', value: 100, total: true, role: 'revenue' },
      { id: 'cogs', label: 'COGS', value: -40, role: 'cost' },
      { id: 'gross-profit', label: 'Gross profit', answer: 60, total: true, note: 'Revenue minus COGS.' },
      { id: 'opex', label: 'Opex', value: -20, role: 'cost' },
      { id: 'ebit', label: 'EBIT', answer: 40, total: true },
    ],
    ...overrides,
  }
}

function answer(values: Record<string, number | null>): WaterfallAnswer {
  return { kind: 'waterfall', values }
}

describe('gradeWaterfall', () => {
  it('gives accuracy 1 and all-ok details when every blank is exactly right', () => {
    const task = baseTask()
    const result = gradeWaterfall(task, answer({ 'gross-profit': 60, ebit: 40 }), noop)
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([
      { id: 'gross-profit', ok: true, note: 'Expected 60. Revenue minus COGS.' },
      { id: 'ebit', ok: true, note: 'Expected 40' },
    ])
  })

  it('marks a single wrong blank and scores 1/2', () => {
    const task = baseTask()
    const result = gradeWaterfall(task, answer({ 'gross-profit': 999, ebit: 40 }), noop)
    expect(result.accuracy).toBe(0.5)
    expect(result.details).toEqual([
      { id: 'gross-profit', ok: false, note: 'Expected 60. Revenue minus COGS.' },
      { id: 'ebit', ok: true, note: 'Expected 40' },
    ])
  })

  it('accepts an answer within tolerance', () => {
    const task = baseTask({ tolerance: 2 })
    const result = gradeWaterfall(task, answer({ 'gross-profit': 61, ebit: 38 }), noop)
    expect(result.accuracy).toBe(1)
  })

  it('rejects an answer outside tolerance', () => {
    const task = baseTask({ tolerance: 2 })
    const result = gradeWaterfall(task, answer({ 'gross-profit': 63, ebit: 40 }), noop)
    expect(result.accuracy).toBe(0.5)
    expect(result.details.find((d) => d.id === 'gross-profit')?.ok).toBe(false)
  })

  it('counts null and missing submissions as wrong', () => {
    const task = baseTask()
    const result = gradeWaterfall(task, answer({ 'gross-profit': null }), noop)
    expect(result.accuracy).toBe(0)
    expect(result.details).toEqual([
      { id: 'gross-profit', ok: false, note: 'Expected 60. Revenue minus COGS.' },
      { id: 'ebit', ok: false, note: 'Expected 40' },
    ])
  })

  it('passes accuracy, wrongIds, and blanks to the explain callback', () => {
    const task = baseTask()
    const explain = vi.fn<typeof noop>(noop)
    gradeWaterfall(task, answer({ 'gross-profit': 999, ebit: 40 }), explain)
    expect(explain).toHaveBeenCalledTimes(1)
    const arg = explain.mock.calls[0]![0]
    expect(arg.accuracy).toBe(0.5)
    expect(arg.wrongIds).toEqual(['gross-profit'])
    expect(arg.blanks).toEqual([
      { id: 'gross-profit', label: 'Gross profit', expected: 60, got: 999 },
      { id: 'ebit', label: 'EBIT', expected: 40, got: 40 },
    ])
  })

  it('returns accuracy 1 for a task with no blanks, without calling explain', () => {
    const task = baseTask({
      steps: [{ id: 'revenue', label: 'Revenue', value: 100, total: true, role: 'revenue' }],
    })
    const explain = vi.fn(noop)
    const result = gradeWaterfall(task, answer({}), explain)
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([])
    expect(explain).not.toHaveBeenCalled()
  })
})
