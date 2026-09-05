import { describe, expect, it } from 'vitest'
import mission from './r4-sensitivity'
import type { Answer, HeatmapTask } from '../engine/types'

const task = mission.task as HeatmapTask

describe('r4-sensitivity mission', () => {
  it('is a heatmap task, rung 4, order 5, with base 10,000 and par 200', () => {
    expect(mission.id).toBe('r4-sensitivity')
    expect(mission.rung).toBe(4)
    expect(mission.order).toBe(5)
    expect(mission.baseComp).toBe(10_000)
    expect(mission.parSeconds).toBe(200)
    expect(task.kind).toBe('heatmap')
    expect(task.unit).toBe('$')
    expect(task.tolerance).toBe(0.05)
  })

  it('has the specified 5x5 grid of WACC rows and terminal-growth columns', () => {
    expect(task.rows.map((r) => r.label)).toEqual(['7.3%', '7.8%', '8.3%', '8.8%', '9.3%'])
    expect(task.cols.map((c) => c.label)).toEqual(['1.0%', '1.5%', '2.0%', '2.5%', '3.0%'])
    expect(task.rowsLabel).toBe('WACC')
    expect(task.colsLabel).toBe('Terminal growth')
    expect(Object.keys(task.cells).length).toBe(25)
  })

  it('has exactly six blanks, none of them the centre cell', () => {
    expect(task.blanks.length).toBe(6)
    expect(new Set(task.blanks).size).toBe(6)
    expect(task.blanks).not.toContain('w3:g3')
    for (const key of task.blanks) {
      expect(task.cells[key]).toBeTypeOf('number')
    }
  })

  it('taps the centre cell (WACC 8.3%, growth 2.0%) and states its price in the prompt', () => {
    expect(task.tap?.answer).toBe('w3:g3')
    const centre = task.cells['w3:g3']
    expect(task.tap?.prompt).toContain(`$${centre.toFixed(2)}`)
    // Sanity: the DCF's base case should land near Brickhouse's actual $14.50 trading price.
    expect(centre).toBeGreaterThan(10)
    expect(centre).toBeLessThan(20)
  })

  it('increasing WACC lowers the price and increasing terminal growth raises it (monotonic grid)', () => {
    const byRow = task.rows.map((r) => task.cols.map((c) => task.cells[`${r.id}:${c.id}`]))
    // Each row: price rises left to right (growth increasing).
    for (const row of byRow) {
      for (let j = 1; j < row.length; j++) expect(row[j]).toBeGreaterThan(row[j - 1])
    }
    // Each column: price falls top to bottom (WACC increasing).
    for (let j = 0; j < task.cols.length; j++) {
      for (let i = 1; i < task.rows.length; i++) {
        expect(byRow[i][j]).toBeLessThan(byRow[i - 1][j])
      }
    }
  })

  it('has unique row ids, column ids, and cell keys', () => {
    expect(new Set(task.rows.map((r) => r.id)).size).toBe(task.rows.length)
    expect(new Set(task.cols.map((c) => c.id)).size).toBe(task.cols.length)
    expect(new Set(Object.keys(task.cells)).size).toBe(Object.keys(task.cells).length)
  })

  it('gives accuracy 1 for a perfect answer, explaining the worked centre cell', () => {
    const values: Record<string, number | null> = {}
    for (const key of task.blanks) values[key] = task.cells[key]
    const answer: Answer = { kind: 'heatmap', values, tapped: 'w3:g3' }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(1)
    expect(result.verdict.length).toBeGreaterThan(0)
    expect(result.explanation).toContain('WACC')
    expect(result.explanation).toContain(task.cells['w3:g3'].toFixed(2))
  })

  it('scores less than 1 and names the wrong cell when one blank is off and the tap misses', () => {
    const values: Record<string, number | null> = {}
    for (const key of task.blanks) values[key] = task.cells[key]
    values['w1:g1'] = 0 // deliberately wrong
    const answer: Answer = { kind: 'heatmap', values, tapped: 'w1:g1' } // wrong tap too
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(5 / 7)
    expect(result.explanation).toContain('WACC 7.3%, growth 1.0%')
    expect(result.explanation).toContain(task.cells['w1:g1'].toFixed(2))
  })

  it('gives accuracy 0 when every blank is wrong and there is no tap', () => {
    const values: Record<string, number | null> = {}
    for (const key of task.blanks) values[key] = 0
    const answer: Answer = { kind: 'heatmap', values, tapped: null }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(0)
  })

  it('throws on a mismatched answer kind', () => {
    const wrongKind = { kind: 'balance', values: {} } as unknown as Answer
    expect(() => mission.grade(wrongKind)).toThrow()
  })

  it('keeps the lesson body under 120 words and defines WACC and terminal growth', () => {
    const wordCount = mission.lesson.body.trim().split(/\s+/).length
    expect(wordCount).toBeLessThan(120)
    const lower = mission.lesson.body.toLowerCase()
    expect(lower).toContain('wacc')
    expect(lower).toContain('terminal growth')
    expect(lower).toContain('discounted cash flow')
    expect(lower).toContain('sensitivity table')
  })
})
