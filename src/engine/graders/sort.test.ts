import { describe, expect, it, vi } from 'vitest'
import { gradeSort } from './sort'
import type { SortTask } from '../types'

const noop = () => ({ verdict: 'v', explanation: 'e' })

function task(): SortTask {
  return {
    kind: 'sort',
    prompt: 'Sort the cash flow lines into their section.',
    buckets: [
      { id: 'operating', label: 'Operating' },
      { id: 'investing', label: 'Investing' },
      { id: 'financing', label: 'Financing' },
    ],
    items: [
      { id: 'depreciation', label: 'Depreciation', bucketId: 'operating' },
      { id: 'capex', label: 'Capital expenditures', bucketId: 'investing' },
      { id: 'dividends', label: 'Dividends paid', bucketId: 'financing' },
    ],
  }
}

describe('gradeSort', () => {
  it('gives accuracy 1 and all-ok details when everything is placed correctly', () => {
    const t = task()
    const result = gradeSort(
      t,
      { kind: 'sort', placements: { depreciation: 'operating', capex: 'investing', dividends: 'financing' } },
      noop,
    )
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([
      { id: 'depreciation', ok: true },
      { id: 'capex', ok: true },
      { id: 'dividends', ok: true },
    ])
  })

  it('scores 2/3 for one item placed in the wrong bucket', () => {
    const t = task()
    const result = gradeSort(
      t,
      { kind: 'sort', placements: { depreciation: 'operating', capex: 'financing', dividends: 'financing' } },
      noop,
    )
    expect(result.accuracy).toBeCloseTo(2 / 3)
    expect(result.details).toEqual([
      { id: 'depreciation', ok: true },
      { id: 'capex', ok: false, note: 'Belongs in Investing' },
      { id: 'dividends', ok: true },
    ])
  })

  it('scores 0 and lists every item as unplaced when nothing is placed', () => {
    const t = task()
    const explain = vi.fn(noop)
    const result = gradeSort(t, { kind: 'sort', placements: {} }, explain)
    expect(result.accuracy).toBe(0)
    expect(explain).toHaveBeenCalledTimes(1)
    const arg = explain.mock.calls[0]![0]
    expect(arg.unplacedIds.sort()).toEqual(['capex', 'depreciation', 'dividends'])
    expect(arg.wrongIds.sort()).toEqual(['capex', 'depreciation', 'dividends'])
  })

  it('counts an unplaced item as wrong in both wrongIds and unplacedIds alongside a misplaced one', () => {
    const t = task()
    const explain = vi.fn(noop)
    gradeSort(t, { kind: 'sort', placements: { depreciation: 'operating', capex: 'financing' } }, explain)
    const arg = explain.mock.calls[0]![0]
    expect(arg.accuracy).toBeCloseTo(1 / 3)
    expect(arg.unplacedIds).toEqual(['dividends'])
    expect(arg.wrongIds.sort()).toEqual(['capex', 'dividends'])
  })

  it('gives each wrong item a note pointing to the correct bucket label', () => {
    const t = task()
    const result = gradeSort(t, { kind: 'sort', placements: {} }, noop)
    expect(result.details).toEqual([
      { id: 'depreciation', ok: false, note: 'Belongs in Operating' },
      { id: 'capex', ok: false, note: 'Belongs in Investing' },
      { id: 'dividends', ok: false, note: 'Belongs in Financing' },
    ])
  })

  it('returns accuracy 1 for an empty task without calling explain', () => {
    const explain = vi.fn(noop)
    const t: SortTask = { kind: 'sort', prompt: 'p', buckets: [], items: [] }
    const result = gradeSort(t, { kind: 'sort', placements: {} }, explain)
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([])
    expect(explain).not.toHaveBeenCalled()
  })
})
