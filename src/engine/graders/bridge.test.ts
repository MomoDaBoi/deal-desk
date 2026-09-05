import { describe, expect, it } from 'vitest'
import { gradeBridge } from './bridge'
import type { BridgeAnswer, BridgeTask } from '../types'

const noop = () => ({ verdict: 'v', explanation: 'e' })

function baseTask(overrides: Partial<BridgeTask> = {}): BridgeTask {
  return {
    kind: 'bridge',
    prompt: 'Bridge market cap to enterprise value.',
    unit: '$k',
    start: { label: 'Market cap', value: 370_000, role: 'equity' },
    end: { label: 'Enterprise value', value: 400_000, role: 'revenue' },
    adjustments: [
      { id: 'debt', label: 'Total debt', answer: 60_000, role: 'debt' },
      { id: 'cash', label: 'Cash', answer: -30_000, role: 'cash', hint: 'Cash reduces EV.', note: 'Subtract cash and equivalents.' },
      { id: 'minority', label: 'Minority interest', answer: 0, role: 'neutral' },
    ],
    ...overrides,
  }
}

function answer(values: Record<string, number | null>): BridgeAnswer {
  return { kind: 'bridge', values }
}

describe('gradeBridge', () => {
  it('gives accuracy 1 and full ok details when every adjustment is exact and it reconciles', () => {
    const task = baseTask()
    const result = gradeBridge(task, answer({ debt: 60_000, cash: -30_000, minority: 0 }), noop)
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([
      { id: 'debt', ok: true, note: 'Expected 60000' },
      { id: 'cash', ok: true, note: 'Expected -30000. Cash reduces EV.. Subtract cash and equivalents.' },
      { id: 'minority', ok: true, note: 'Expected 0' },
      { id: 'reconcile', ok: true, note: 'Your bars sum to 400000; target is 400000' },
    ])
  })

  it('drops both correctFraction and reconciliation when one sign is flipped', () => {
    const task = baseTask()
    const result = gradeBridge(task, answer({ debt: 60_000, cash: 30_000, minority: 0 }), noop)
    // 2/3 adjustments right, and sum = 370000 + 60000 + 30000 + 0 = 460000, off target
    expect(result.accuracy).toBeCloseTo(0.75 * (2 / 3) + 0.25 * 0)
    const cashDetail = result.details?.find((d) => d.id === 'cash')
    expect(cashDetail?.ok).toBe(false)
    const reconcileDetail = result.details?.find((d) => d.id === 'reconcile')
    expect(reconcileDetail?.ok).toBe(false)
    expect(reconcileDetail?.note).toBe('Your bars sum to 460000; target is 400000')
  })

  it('gives 0.25 accuracy when every bar is wrong but the swapped values still reconcile', () => {
    const task = baseTask()
    // Every adjustment is off from its expected value, but the offsets cancel: net sum still lands on end.
    const result = gradeBridge(task, answer({ debt: 70_000, cash: -40_100, minority: 100 }), noop)
    expect(result.accuracy).toBe(0.25)
    expect(result.details?.find((d) => d.id === 'debt')?.ok).toBe(false)
    expect(result.details?.find((d) => d.id === 'cash')?.ok).toBe(false)
    expect(result.details?.find((d) => d.id === 'minority')?.ok).toBe(false)
    expect(result.details?.find((d) => d.id === 'reconcile')?.ok).toBe(true)
  })

  it('treats null and missing submissions as wrong and as 0 in the sum', () => {
    const task = baseTask()
    const result = gradeBridge(task, answer({ debt: 60_000, cash: null }), noop)
    expect(result.details?.find((d) => d.id === 'cash')?.ok).toBe(false)
    expect(result.details?.find((d) => d.id === 'minority')?.ok).toBe(false)
    // sum = 370000 + 60000 + 0 + 0 = 430000
    expect(result.details?.find((d) => d.id === 'reconcile')?.note).toBe('Your bars sum to 430000; target is 400000')
    expect(result.accuracy).toBeCloseTo(0.75 * (1 / 3) + 0.25 * 0)
  })

  it('accepts values within tolerance for both correctness and reconciliation', () => {
    const task = baseTask({ tolerance: 500 })
    const result = gradeBridge(task, answer({ debt: 60_300, cash: -30_300, minority: 0 }), noop)
    expect(result.details?.every((d) => d.ok)).toBe(true)
    expect(result.accuracy).toBe(1)
  })

  it('rejects values just outside tolerance', () => {
    const task = baseTask({ tolerance: 100 })
    const result = gradeBridge(task, answer({ debt: 60_200, cash: -30_000, minority: 0 }), noop)
    expect(result.details?.find((d) => d.id === 'debt')?.ok).toBe(false)
  })

  it('passes accuracy, wrongIds, reconciled, sum, and blanks through to explain', () => {
    const task = baseTask()
    let seen: { accuracy: number; wrongIds: string[]; reconciled: boolean; sum: number; blanks: unknown[] } | undefined
    gradeBridge(task, answer({ debt: 60_000, cash: -30_000, minority: 0 }), (ctx) => {
      seen = ctx
      return { verdict: 'v', explanation: 'e' }
    })
    expect(seen?.accuracy).toBe(1)
    expect(seen?.wrongIds).toEqual([])
    expect(seen?.reconciled).toBe(true)
    expect(seen?.sum).toBe(400_000)
    expect(seen?.blanks).toHaveLength(3)
  })

  it('adds "reconcile" to wrongIds only when off target', () => {
    const task = baseTask()
    const off = gradeBridge(task, answer({ debt: 0, cash: 0, minority: 0 }), noop)
    expect(off.details?.find((d) => d.id === 'reconcile')?.ok).toBe(false)
  })
})
