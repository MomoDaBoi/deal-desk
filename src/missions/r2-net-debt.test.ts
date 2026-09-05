import { describe, expect, it } from 'vitest'
import mission from './r2-net-debt'
import type { BalanceAnswer, BalanceTask, OrderAnswer } from '../engine/types'

describe('r2-net-debt', () => {
  it('is a balance task with unique line ids and unique section ids', () => {
    expect(mission.task.kind).toBe('balance')
    const task = mission.task as BalanceTask
    const sectionIds = task.sections.map((s) => s.id)
    expect(new Set(sectionIds).size).toBe(sectionIds.length)
    const lineIds = task.sections.flatMap((s) => s.lines.map((l) => l.id))
    expect(new Set(lineIds).size).toBe(lineIds.length)
  })

  it('section ids avoid balance-sheet meter triggers', () => {
    const task = mission.task as BalanceTask
    for (const section of task.sections) {
      const id = section.id.toLowerCase()
      expect(id.includes('asset')).toBe(false)
      expect(id.includes('liab')).toBe(false)
      expect(id.includes('equity')).toBe(false)
    }
  })

  it('lesson body is under 120 words', () => {
    const wordCount = mission.lesson.body.split(/\s+/).filter(Boolean).length
    expect(wordCount).toBeLessThan(120)
  })

  it('scores a perfect answer as accuracy 1', () => {
    const answer: BalanceAnswer = {
      kind: 'balance',
      values: { 'net-debt': 30_000, 'net-debt-restricted': 40_000 },
    }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(1)
  })

  it('scores one wrong blank (net debt) at accuracy 0.5 and names it', () => {
    const answer: BalanceAnswer = {
      kind: 'balance',
      values: { 'net-debt': 25_000, 'net-debt-restricted': 40_000 },
    }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(0.5)
    expect(result.explanation).toMatch(/net debt/i)
  })

  it('scores the other wrong blank (restricted net debt) at accuracy 0.5 and names restricted cash', () => {
    const answer: BalanceAnswer = {
      kind: 'balance',
      values: { 'net-debt': 30_000, 'net-debt-restricted': 30_000 },
    }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(0.5)
    expect(result.explanation).toMatch(/restricted/i)
  })

  it('catches the sign trap of adding cash instead of subtracting it', () => {
    const answer: BalanceAnswer = {
      kind: 'balance',
      values: { 'net-debt': 90_000, 'net-debt-restricted': 40_000 },
    }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(0.5)
    expect(result.explanation).toMatch(/subtract|not add|does not add/i)
  })

  it('scores a fully wrong answer as accuracy 0', () => {
    const answer: BalanceAnswer = {
      kind: 'balance',
      values: { 'net-debt': 0, 'net-debt-restricted': 0 },
    }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(0)
  })

  it('throws on a mismatched answer kind', () => {
    const wrongAnswer: OrderAnswer = { kind: 'order', orderedIds: [] }
    expect(() => mission.grade(wrongAnswer)).toThrow()
  })
})
