import { describe, expect, it } from 'vitest'
import { fmtCell, gradeHeatmap } from './heatmap'
import type { HeatmapAnswer, HeatmapTask } from '../types'

const noop = () => ({ verdict: 'v', explanation: 'e' })

function baseTask(overrides: Partial<HeatmapTask> = {}): HeatmapTask {
  return {
    kind: 'heatmap',
    prompt: 'Fill in the sensitivity table.',
    unit: '%',
    rows: [
      { id: 'wacc-8', label: '8%' },
      { id: 'wacc-10', label: '10%' },
    ],
    cols: [
      { id: 'g-2', label: '2%' },
      { id: 'g-3', label: '3%' },
    ],
    rowsLabel: 'WACC',
    colsLabel: 'Growth',
    cells: {
      'wacc-8:g-2': 100,
      'wacc-8:g-3': 120,
      'wacc-10:g-2': 80,
      'wacc-10:g-3': 90,
    },
    blanks: ['wacc-8:g-3', 'wacc-10:g-3'],
    ...overrides,
  }
}

function answer(values: Record<string, number | null>, tapped?: string | null): HeatmapAnswer {
  return { kind: 'heatmap', values, ...(tapped === undefined ? {} : { tapped }) }
}

describe('fmtCell', () => {
  it('renders a "$" unit as a prefix currency with two decimals', () => {
    expect(fmtCell(17.9, '$')).toBe('$17.90')
    expect(fmtCell(1234.5, '$')).toBe('$1,234.50')
  })

  it('keeps a "$" unit\'s remainder as a suffix after the prefixed number', () => {
    expect(fmtCell(480, '$k')).toBe('$480.00k')
  })

  it('renders a non-currency unit as a plain suffix', () => {
    expect(fmtCell(120, '%')).toBe('120%')
    expect(fmtCell(8.3, 'x')).toBe('8.3x')
    expect(fmtCell(90, '')).toBe('90')
  })
})

describe('gradeHeatmap', () => {
  it('gives accuracy 1 and all-ok details when every blank is exactly right', () => {
    const task = baseTask()
    const result = gradeHeatmap(task, answer({ 'wacc-8:g-3': 120, 'wacc-10:g-3': 90 }), noop)
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([
      { id: 'wacc-8:g-3', ok: true, note: 'Expected 120%' },
      { id: 'wacc-10:g-3', ok: true, note: 'Expected 90%' },
    ])
  })

  it('marks a single wrong blank and scores 1/2', () => {
    const task = baseTask()
    const result = gradeHeatmap(task, answer({ 'wacc-8:g-3': 999, 'wacc-10:g-3': 90 }), noop)
    expect(result.accuracy).toBe(0.5)
    expect(result.details).toEqual([
      { id: 'wacc-8:g-3', ok: false, note: 'Expected 120%' },
      { id: 'wacc-10:g-3', ok: true, note: 'Expected 90%' },
    ])
  })

  it('formats a "$" unit as prefix currency in the "Expected" note', () => {
    const task = baseTask({ unit: '$', cells: { ...baseTask().cells, 'wacc-8:g-3': 120.5 } })
    const result = gradeHeatmap(task, answer({ 'wacc-8:g-3': 0, 'wacc-10:g-3': 0 }), noop)
    expect(result.details).toContainEqual({ id: 'wacc-8:g-3', ok: false, note: 'Expected $120.50' })
  })

  it('accepts a value within tolerance', () => {
    const task = baseTask({ tolerance: 2 })
    const result = gradeHeatmap(task, answer({ 'wacc-8:g-3': 121.5, 'wacc-10:g-3': 88.5 }), noop)
    expect(result.accuracy).toBe(1)
    expect(result.details?.every((d) => d.ok)).toBe(true)
  })

  it('rejects a value outside tolerance', () => {
    const task = baseTask({ tolerance: 2 })
    const result = gradeHeatmap(task, answer({ 'wacc-8:g-3': 123.5, 'wacc-10:g-3': 90 }), noop)
    expect(result.accuracy).toBe(0.5)
    expect(result.details).toEqual([
      { id: 'wacc-8:g-3', ok: false, note: 'Expected 120%' },
      { id: 'wacc-10:g-3', ok: true, note: 'Expected 90%' },
    ])
  })

  it('treats a null submission as wrong', () => {
    const task = baseTask()
    const result = gradeHeatmap(task, answer({ 'wacc-8:g-3': null, 'wacc-10:g-3': 90 }), noop)
    expect(result.accuracy).toBe(0.5)
    expect(result.details).toEqual([
      { id: 'wacc-8:g-3', ok: false, note: 'Expected 120%' },
      { id: 'wacc-10:g-3', ok: true, note: 'Expected 90%' },
    ])
  })

  it('treats a missing submission as wrong', () => {
    const task = baseTask()
    const result = gradeHeatmap(task, answer({ 'wacc-10:g-3': 90 }), noop)
    expect(result.accuracy).toBe(0.5)
    expect(result.details?.[0]).toEqual({ id: 'wacc-8:g-3', ok: false, note: 'Expected 120%' })
  })

  it('counts a correct tap as one more item toward accuracy', () => {
    const task = baseTask({ tap: { prompt: 'Tap the cell with the highest implied value.', answer: 'wacc-8:g-3' } })
    const result = gradeHeatmap(
      task,
      answer({ 'wacc-8:g-3': 120, 'wacc-10:g-3': 90 }, 'wacc-8:g-3'),
      noop,
    )
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([
      { id: 'wacc-8:g-3', ok: true, note: 'Expected 120%' },
      { id: 'wacc-10:g-3', ok: true, note: 'Expected 90%' },
      { id: 'tap', ok: true, note: 'Tap the cell with the highest implied value. -> 8%, 3%' },
    ])
  })

  it('marks a wrong tap and scores accordingly', () => {
    const task = baseTask({ tap: { prompt: 'Tap the cell with the highest implied value.', answer: 'wacc-8:g-3' } })
    const result = gradeHeatmap(
      task,
      answer({ 'wacc-8:g-3': 120, 'wacc-10:g-3': 90 }, 'wacc-10:g-2'),
      noop,
    )
    expect(result.accuracy).toBeCloseTo(2 / 3)
    const tapDetail = result.details?.find((d) => d.id === 'tap')
    expect(tapDetail).toEqual({ id: 'tap', ok: false, note: 'Tap the cell with the highest implied value. -> 8%, 3%' })
    expect(result.details?.map((d) => d.id).includes('tap')).toBe(true)
  })

  it('treats a missing tap as wrong', () => {
    const task = baseTask({ tap: { prompt: 'Tap the cheapest cell.', answer: 'wacc-8:g-3' } })
    const result = gradeHeatmap(task, answer({ 'wacc-8:g-3': 120, 'wacc-10:g-3': 90 }), noop)
    expect(result.accuracy).toBeCloseTo(2 / 3)
    expect(result.details?.find((d) => d.id === 'tap')).toEqual({
      id: 'tap',
      ok: false,
      note: 'Tap the cheapest cell. -> 8%, 3%',
    })
  })

  it('ignores tap entirely when the task has no tap', () => {
    const task = baseTask()
    const result = gradeHeatmap(task, answer({ 'wacc-8:g-3': 120, 'wacc-10:g-3': 90 }, 'wacc-8:g-2'), noop)
    expect(result.accuracy).toBe(1)
    expect(result.details?.some((d) => d.id === 'tap')).toBe(false)
  })

  it('returns accuracy 1 without calling explain for an empty task', () => {
    let called = false
    const task = baseTask({ blanks: [] })
    const result = gradeHeatmap(task, answer({}), () => {
      called = true
      return { verdict: 'x', explanation: 'y' }
    })
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([])
    expect(called).toBe(false)
  })

  it('passes wrongIds and tapOk through to explain', () => {
    const task = baseTask({ tap: { prompt: 'Tap it.', answer: 'wacc-8:g-3' } })
    let seenWrongIds: string[] = []
    let seenTapOk: boolean | null = null
    gradeHeatmap(task, answer({ 'wacc-8:g-3': 1, 'wacc-10:g-3': 90 }, 'wrong-key'), (ctx) => {
      seenWrongIds = ctx.wrongIds
      seenTapOk = ctx.tapOk
      return { verdict: 'v', explanation: 'e' }
    })
    expect(seenWrongIds).toEqual(['wacc-8:g-3', 'tap'])
    expect(seenTapOk).toBe(false)
  })
})
