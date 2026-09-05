import { describe, expect, it, vi } from 'vitest'
import { gradeBalance } from './balance'
import type { BalanceAnswer, BalanceTask } from '../types'

const noop = () => ({ verdict: 'v', explanation: 'e' })

function baseTask(overrides: Partial<BalanceTask> = {}): BalanceTask {
  return {
    kind: 'balance',
    prompt: 'Balance the sheet.',
    unit: '$k',
    sections: [
      {
        id: 'assets',
        label: 'Assets',
        role: 'cash',
        lines: [
          { id: 'cash', label: 'Cash', value: 100 },
          { id: 'inventory', label: 'Inventory', answer: 50, note: 'Inventory is what has not sold yet.' },
          { id: 'total-assets', label: 'Total assets', value: 150, total: true },
        ],
      },
      {
        id: 'liabilities-equity',
        label: 'Liabilities & Equity',
        role: 'debt',
        lines: [
          { id: 'debt', label: 'Debt', value: 60 },
          { id: 'equity', label: 'Equity', answer: 90 },
          { id: 'total-le', label: 'Total', value: 150, total: true },
        ],
      },
    ],
    ...overrides,
  }
}

function answer(values: Record<string, number | null>): BalanceAnswer {
  return { kind: 'balance', values }
}

describe('gradeBalance', () => {
  it('gives accuracy 1 and all-ok details when every blank is exactly right', () => {
    const task = baseTask()
    const result = gradeBalance(task, answer({ inventory: 50, equity: 90 }), noop)
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([
      { id: 'inventory', ok: true, note: 'Expected 50. Inventory is what has not sold yet.' },
      { id: 'equity', ok: true, note: 'Expected 90' },
    ])
  })

  it('marks a single wrong blank and scores 1/2', () => {
    const task = baseTask()
    const result = gradeBalance(task, answer({ inventory: 999, equity: 90 }), noop)
    expect(result.accuracy).toBe(0.5)
    expect(result.details).toEqual([
      { id: 'inventory', ok: false, note: 'Expected 50. Inventory is what has not sold yet.' },
      { id: 'equity', ok: true, note: 'Expected 90' },
    ])
  })

  it('accepts an answer within tolerance', () => {
    const task = baseTask({ tolerance: 2 })
    const result = gradeBalance(task, answer({ inventory: 51, equity: 88 }), noop)
    expect(result.accuracy).toBe(1)
  })

  it('rejects an answer outside tolerance', () => {
    const task = baseTask({ tolerance: 2 })
    const result = gradeBalance(task, answer({ inventory: 53, equity: 90 }), noop)
    expect(result.accuracy).toBe(0.5)
    expect(result.details.find((d) => d.id === 'inventory')?.ok).toBe(false)
  })

  it('counts null and missing submissions as wrong', () => {
    const task = baseTask()
    const result = gradeBalance(task, answer({ inventory: null }), noop)
    expect(result.accuracy).toBe(0)
    expect(result.details).toEqual([
      { id: 'inventory', ok: false, note: 'Expected 50. Inventory is what has not sold yet.' },
      { id: 'equity', ok: false, note: 'Expected 90' },
    ])
  })

  it('passes accuracy, wrongIds, and blanks to the explain callback', () => {
    const task = baseTask()
    const explain = vi.fn<typeof noop>(noop)
    gradeBalance(task, answer({ inventory: 999, equity: 90 }), explain)
    expect(explain).toHaveBeenCalledTimes(1)
    const arg = explain.mock.calls[0]![0]
    expect(arg.accuracy).toBe(0.5)
    expect(arg.wrongIds).toEqual(['inventory'])
    expect(arg.blanks).toEqual([
      { id: 'inventory', label: 'Inventory', expected: 50, got: 999 },
      { id: 'equity', label: 'Equity', expected: 90, got: 90 },
    ])
  })

  it('returns accuracy 1 for a task with no blanks, without calling explain', () => {
    const task = baseTask({
      sections: [
        {
          id: 'assets',
          label: 'Assets',
          lines: [{ id: 'cash', label: 'Cash', value: 100 }],
        },
      ],
    })
    const explain = vi.fn(noop)
    const result = gradeBalance(task, answer({}), explain)
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([])
    expect(explain).not.toHaveBeenCalled()
  })
})
