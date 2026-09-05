import { describe, expect, it } from 'vitest'
import mission from './r1-income-statement-order'
import type { Answer } from '../engine/types'

const CORRECT_ORDER = ['revenue', 'cogs', 'gross', 'opex', 'ebit', 'interest', 'tax', 'net']

describe('r1-income-statement-order mission', () => {
  it('gives accuracy 1 and a verdict for the correct order', () => {
    const answer: Answer = { kind: 'order', orderedIds: CORRECT_ORDER }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(1)
    expect(result.verdict.length).toBeGreaterThan(0)
    expect(result.explanation.length).toBeGreaterThan(0)
  })

  it('scores 6/8 and explains interest when interest and tax are swapped', () => {
    const swapped = ['revenue', 'cogs', 'gross', 'opex', 'ebit', 'tax', 'interest', 'net']
    const answer: Answer = { kind: 'order', orderedIds: swapped }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(6 / 8)
    expect(result.explanation.toLowerCase()).toContain('interest')
  })

  it('throws when given the wrong answer kind', () => {
    const badAnswer = { kind: 'quiz' } as unknown as Answer
    expect(() => mission.grade(badAnswer)).toThrow('wrong answer kind')
  })

  it('has a waterfall lesson visual that reconciles to net income', () => {
    const visual = mission.lesson.visual
    if (!visual || visual.kind !== 'waterfall') throw new Error('expected a waterfall visual')
    const net = visual.items.find((i) => i.label === 'Net income')
    expect(net?.value).toBe(200)
    expect(net?.total).toBe(true)
    expect(visual.items.find((i) => i.label === 'Revenue')?.value).toBe(1_200)
  })
})
