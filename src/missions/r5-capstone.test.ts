import { describe, expect, it } from 'vitest'
import mission from './r5-capstone'
import type { Answer, BridgeTask, MultiTask, QuizTask, SliderTask } from '../engine/types'

const task = mission.task as MultiTask
const valueTask = task.stages[0].task as BridgeTask
const structureTask = task.stages[1].task as SliderTask
const defendTask = task.stages[2].task as QuizTask

const PERFECT_ANSWER: Answer = {
  kind: 'multi',
  answers: {
    value: { kind: 'bridge', values: { debt: 260_000, cash: -40_000, minority: 0, preferred: 0 } },
    structure: { kind: 'slider', values: { leverage: 5.0, equityCheque: 465_000 } },
    defend: {
      kind: 'quiz',
      choices: { whyEv: 'wholeBusiness', whyLeverage: 'cyclical', whyPremium: 'correct' },
    },
  },
}

describe('r5-capstone mission', () => {
  it('matches the required mission metadata', () => {
    expect(mission.id).toBe('r5-capstone')
    expect(mission.rung).toBe(5)
    expect(mission.order).toBe(6)
    expect(mission.boss).toBe(true)
    expect(mission.baseComp).toBe(22_000)
    expect(mission.parSeconds).toBe(420)
    expect(task.kind).toBe('multi')
    expect(task.stages).toHaveLength(3)
  })

  it('has the closing-dinner finale', () => {
    expect(mission.finale).toBeDefined()
    expect(mission.finale!.eyebrow).toBe('Closing dinner')
    expect(mission.finale!.title).toBe('The deal closed.')
    expect(mission.finale!.emoji).toBe('🍽️')
    const sentenceCount = mission.finale!.body.trim().split(/(?<=[.!?])\s+/).length
    expect(sentenceCount).toBe(2)
    expect(mission.finale!.body.toLowerCase()).toContain('steak')
    expect(mission.finale!.body.toLowerCase()).toContain('deal toy')
    expect(mission.finale!.body.toLowerCase()).toContain('md')
  })

  it('recomputes the value-stage bridge from the company bible: 580,000 -> 800,000', () => {
    expect(valueTask.kind).toBe('bridge')
    expect(valueTask.start.value).toBe(580_000)
    expect(valueTask.end.value).toBe(800_000)
    const ids = valueTask.adjustments.map((a) => a.id)
    expect(ids).toEqual(['debt', 'cash', 'minority', 'preferred'])
    expect(new Set(ids).size).toBe(ids.length)
    expect(valueTask.adjustments.find((a) => a.id === 'debt')!.answer).toBe(260_000)
    expect(valueTask.adjustments.find((a) => a.id === 'cash')!.answer).toBe(-40_000)
    expect(valueTask.adjustments.find((a) => a.id === 'minority')!.answer).toBe(0)
    expect(valueTask.adjustments.find((a) => a.id === 'preferred')!.answer).toBe(0)
    const sum = valueTask.start.value + valueTask.adjustments.reduce((s, a) => s + a.answer, 0)
    expect(sum).toBe(valueTask.end.value)
  })

  it('recomputes the structure-stage sliders at the offer EV: 5.0x leverage, 465,000 equity cheque', () => {
    expect(structureTask.kind).toBe('slider')
    const leverage = structureTask.sliders.find((s) => s.id === 'leverage')!
    const equity = structureTask.sliders.find((s) => s.id === 'equityCheque')!
    expect(leverage.min).toBe(2)
    expect(leverage.max).toBe(7)
    expect(leverage.step).toBe(0.5)
    expect(leverage.answer).toBe(5.0)
    expect(leverage.tolerance).toBe(0.5)
    expect(leverage.unit).toBe('x')
    expect(equity.min).toBe(300_000)
    expect(equity.max).toBe(700_000)
    expect(equity.step).toBe(10_000)
    expect(equity.answer).toBe(465_000)
    expect(equity.tolerance).toBe(30_000)
    // Offer EV: $14.50 x 1.25 = $18.125 x 40,000 shares = 725,000 equity
    // + 220,000 net debt = 945,000 offer EV.
    // 945,000 - debt (5.0 x 96,000 = 480,000) = 465,000
    const offerEquity = 14.5 * 1.25 * 40_000
    const offerEv = offerEquity + 220_000
    expect(offerEquity).toBe(725_000)
    expect(offerEv).toBe(945_000)
    expect(equity.answer).toBe(offerEv - 5.0 * 96_000)
    expect(structureTask.readouts).toBeDefined()
    expect(structureTask.readouts!.length).toBeGreaterThanOrEqual(2)
    const debtReadout = structureTask.readouts!.find((r) => r.id === 'debtRaised')!
    expect(debtReadout.compute({ leverage: 5.0 })).toBe(480_000)
    const equityReadout = structureTask.readouts!.find((r) => r.id === 'equityImplied')!
    expect(equityReadout.compute({ leverage: 5.0 })).toBe(465_000)
  })

  it('has three untimed defend questions with valid correctIds and unique ids', () => {
    expect(defendTask.kind).toBe('quiz')
    expect(defendTask.timeLimitSeconds).toBeUndefined()
    expect(defendTask.questions).toHaveLength(3)
    const ids = defendTask.questions.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const q of defendTask.questions) {
      expect(q.choices.some((c) => c.id === q.correctId)).toBe(true)
      const choiceIds = q.choices.map((c) => c.id)
      expect(new Set(choiceIds).size).toBe(choiceIds.length)
    }
  })

  it('the control-premium question implies $18.13 from a $14.50 share price at 25%', () => {
    const q = defendTask.questions.find((q) => q.id === 'whyPremium')!
    const correctChoice = q.choices.find((c) => c.id === q.correctId)!
    expect(correctChoice.label).toContain('18.13')
  })

  it('gives accuracy 1 for a perfect run across all three stages', () => {
    const result = mission.grade(PERFECT_ANSWER)
    expect(result.accuracy).toBe(1)
    expect(result.verdict.length).toBeGreaterThan(0)
    expect(result.explanation.length).toBeGreaterThan(0)
    // explanation lists each stage
    expect(result.explanation).toContain('Value it')
    expect(result.explanation).toContain('Structure it')
    expect(result.explanation).toContain('Defend it')
  })

  it('docks accuracy and names the wrong item when the value stage debt bar is wrong', () => {
    const answer: Answer = {
      kind: 'multi',
      answers: {
        ...PERFECT_ANSWER.answers,
        value: { kind: 'bridge', values: { debt: 0, cash: -40_000, minority: 0, preferred: 0 } },
      },
    }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeLessThan(1)
    // 3 of 4 stage-1 blanks correct, does not reconcile -> stage accuracy 0.75*(3/4)
    expect(result.explanation).toContain('Value it')
    expect(result.explanation).toContain('260,000')
  })

  it('docks accuracy and names leverage when the structure-stage leverage slider is off', () => {
    const answer: Answer = {
      kind: 'multi',
      answers: {
        ...PERFECT_ANSWER.answers,
        structure: { kind: 'slider', values: { leverage: 2, equityCheque: 465_000 } },
      },
    }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeLessThan(1)
    expect(result.explanation).toContain('Structure it')
    expect(result.explanation).toContain('480,000')
  })

  it('docks accuracy and includes the leverage explanation when the leverage question is answered wrong', () => {
    const answer: Answer = {
      kind: 'multi',
      answers: {
        ...PERFECT_ANSWER.answers,
        defend: {
          kind: 'quiz',
          choices: { whyEv: 'wholeBusiness', whyLeverage: 'cheaperDebt', whyPremium: 'correct' },
        },
      },
    }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeLessThan(1)
    expect(result.explanation.toLowerCase()).toContain('cyclical')
  })

  it('scores each stage 0 when nothing is attempted', () => {
    const answer: Answer = { kind: 'multi', answers: {} }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(0)
  })

  it('throws when given the wrong answer kind', () => {
    const badAnswer = { kind: 'balance', values: {} } as unknown as Answer
    expect(() => mission.grade(badAnswer)).toThrow('wrong answer kind')
  })

  it('keeps the lesson body under 120 words and defines its terms', () => {
    const wordCount = mission.lesson.body.trim().split(/\s+/).length
    expect(wordCount).toBeLessThan(120)
    expect(mission.lesson.body).toContain('enterprise value')
    expect(mission.lesson.body).toContain('EBITDA')
    expect(mission.lesson.body).toContain('control premium')
  })

  it('has unique stage ids', () => {
    const ids = task.stages.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(['value', 'structure', 'defend'])
  })
})
