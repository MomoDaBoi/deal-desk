import { describe, expect, it, vi } from 'vitest'
import { gradeMulti } from './multi'
import type { Answer, GradeResult, MultiAnswer, MultiTask } from '../types'

type StageAnswer = Exclude<Answer, MultiAnswer>

const noop = () => ({ verdict: 'v', explanation: 'e' })

/** A stage grader that always returns the same accuracy and verdict. */
function fixed(accuracy: number, verdict: string): (a: Answer) => GradeResult {
  return () => ({ accuracy, verdict, explanation: `explanation for ${verdict}` })
}

function baseTask(overrides: Partial<MultiTask> = {}): MultiTask {
  return {
    kind: 'multi',
    prompt: 'Run the deal end to end.',
    stages: [
      {
        id: 'value',
        title: 'Value',
        intro: 'Bridge market cap to enterprise value.',
        task: {
          kind: 'bridge',
          prompt: 'Bridge it.',
          start: { label: 'Market cap', value: 100 },
          end: { label: 'Enterprise value', value: 130 },
          adjustments: [{ id: 'debt', label: 'Debt', answer: 30 }],
        },
      },
      {
        id: 'structure',
        title: 'Structure',
        task: {
          kind: 'slider',
          prompt: 'Set the leverage.',
          sliders: [{ id: 'lev', label: 'Leverage', min: 0, max: 6, step: 0.5, answer: 5, tolerance: 0.5 }],
        },
      },
      {
        id: 'defend',
        title: 'Defend',
        task: {
          kind: 'quiz',
          prompt: 'Defend the price.',
          questions: [
            {
              id: 'q1',
              text: 'Why does EV beat market cap here?',
              choices: [
                { id: 'a', label: 'It includes net debt' },
                { id: 'b', label: 'It is bigger' },
              ],
              correctId: 'a',
              explanation: 'EV covers the whole capital structure.',
            },
          ],
        },
      },
    ],
    ...overrides,
  }
}

const bridgeAnswer: StageAnswer = { kind: 'bridge', values: { debt: 30 } }
const sliderAnswer: StageAnswer = { kind: 'slider', values: { lev: 5 }, choice: null }
const quizAnswer: StageAnswer = { kind: 'quiz', choices: { q1: 'a' }, timedOut: false }

function answer(answers: MultiAnswer['answers']): MultiAnswer {
  return { kind: 'multi', answers }
}

const allStages = answer({
  value: bridgeAnswer,
  structure: sliderAnswer,
  defend: quizAnswer,
})

describe('gradeMulti', () => {
  it('returns the mean of the stage accuracies', () => {
    const graders = {
      value: fixed(1, 'Clean.'),
      structure: fixed(0.5, 'Passable.'),
      defend: fixed(0, 'Wipeout.'),
    }
    const result = gradeMulti(baseTask(), allStages, graders, noop)
    expect(result.accuracy).toBeCloseTo((1 + 0.5 + 0) / 3)
  })

  it('gives accuracy 1 only when every stage is perfect', () => {
    const graders = {
      value: fixed(1, 'Clean.'),
      structure: fixed(1, 'Clean.'),
      defend: fixed(1, 'Clean.'),
    }
    const result = gradeMulti(baseTask(), allStages, graders, noop)
    expect(result.accuracy).toBe(1)
    expect(result.details?.every((d) => d.ok)).toBe(true)
  })

  it('scores a missing stage answer as 0 and still counts it in the mean', () => {
    const graders = {
      value: fixed(1, 'Clean.'),
      structure: fixed(1, 'Clean.'),
      defend: fixed(1, 'Clean.'),
    }
    const partial = answer({ value: bridgeAnswer, structure: sliderAnswer })
    const result = gradeMulti(baseTask(), partial, graders, noop)
    expect(result.accuracy).toBeCloseTo(2 / 3)
    const defend = result.details?.find((d) => d.id === 'defend')
    expect(defend?.ok).toBe(false)
    expect(defend?.note).toBe('0% - Not attempted.')
  })

  it('never calls the grader for a stage with no submitted answer', () => {
    const defend = vi.fn(fixed(1, 'Clean.'))
    const graders = { value: fixed(1, 'Clean.'), structure: fixed(1, 'Clean.'), defend }
    gradeMulti(baseTask(), answer({ value: bridgeAnswer }), graders, noop)
    expect(defend).not.toHaveBeenCalled()
  })

  it('passes each stage its own answer to its own grader', () => {
    const value = vi.fn(fixed(1, 'Clean.'))
    const structure = vi.fn(fixed(1, 'Clean.'))
    const defend = vi.fn(fixed(1, 'Clean.'))
    gradeMulti(baseTask(), allStages, { value, structure, defend }, noop)
    expect(value).toHaveBeenCalledWith(bridgeAnswer)
    expect(structure).toHaveBeenCalledWith(sliderAnswer)
    expect(defend).toHaveBeenCalledWith(quizAnswer)
  })

  it('marks a detail ok at exactly 70% and not just below it', () => {
    const graders = {
      value: fixed(0.7, 'Just cleared it.'),
      structure: fixed(0.699, 'Just missed it.'),
      defend: fixed(0.71, 'Fine.'),
    }
    const result = gradeMulti(baseTask(), allStages, graders, noop)
    expect(result.details?.map((d) => d.ok)).toEqual([true, false, true])
  })

  it('writes rounded percent plus the stage verdict into each detail note', () => {
    const graders = {
      value: fixed(1, 'Clean work.'),
      structure: fixed(2 / 3, 'pls fix.'),
      defend: fixed(0.5, 'Passable. Barely.'),
    }
    const result = gradeMulti(baseTask(), allStages, graders, noop)
    expect(result.details).toEqual([
      { id: 'value', ok: true, note: '100% - Clean work.' },
      { id: 'structure', ok: false, note: '67% - pls fix.' },
      { id: 'defend', ok: false, note: '50% - Passable. Barely.' },
    ])
  })

  it('hands explain the overall accuracy and one entry per stage, in order', () => {
    const explain = vi.fn(() => ({ verdict: 'V', explanation: 'E' }))
    const graders = {
      value: fixed(1, 'Clean.'),
      structure: fixed(0.5, 'Passable.'),
      defend: fixed(0, 'Wipeout.'),
    }
    const result = gradeMulti(baseTask(), allStages, graders, explain)
    expect(explain).toHaveBeenCalledTimes(1)
    expect(explain).toHaveBeenCalledWith({
      accuracy: (1 + 0.5 + 0) / 3,
      stages: [
        { id: 'value', title: 'Value', accuracy: 1, verdict: 'Clean.' },
        { id: 'structure', title: 'Structure', accuracy: 0.5, verdict: 'Passable.' },
        { id: 'defend', title: 'Defend', accuracy: 0, verdict: 'Wipeout.' },
      ],
    })
    expect(result.verdict).toBe('V')
    expect(result.explanation).toBe('E')
  })

  it('reports a missing stage to explain as a zero-accuracy stage, not a dropped one', () => {
    const explain = vi.fn(() => ({ verdict: 'V', explanation: 'E' }))
    const graders = { value: fixed(1, 'Clean.'), structure: fixed(1, 'Clean.'), defend: fixed(1, 'Clean.') }
    gradeMulti(baseTask(), answer({ value: bridgeAnswer }), graders, explain)
    expect(explain).toHaveBeenCalledWith({
      accuracy: 1 / 3,
      stages: [
        { id: 'value', title: 'Value', accuracy: 1, verdict: 'Clean.' },
        { id: 'structure', title: 'Structure', accuracy: 0, verdict: 'Not attempted.' },
        { id: 'defend', title: 'Defend', accuracy: 0, verdict: 'Not attempted.' },
      ],
    })
  })

  it('scores a stage with no wired grader as 0 rather than throwing', () => {
    const result = gradeMulti(baseTask(), allStages, { value: fixed(1, 'Clean.') }, noop)
    expect(result.accuracy).toBeCloseTo(1 / 3)
    expect(result.details?.find((d) => d.id === 'defend')?.note).toBe('0% - Ungraded stage.')
  })

  it('is pure: the same inputs give the same result and the answer is not mutated', () => {
    const graders = { value: fixed(0.4, 'A'), structure: fixed(0.6, 'B'), defend: fixed(0.8, 'C') }
    const submitted = answer({ value: bridgeAnswer, structure: sliderAnswer, defend: quizAnswer })
    const first = gradeMulti(baseTask(), submitted, graders, noop)
    const second = gradeMulti(baseTask(), submitted, graders, noop)
    expect(first).toEqual(second)
    expect(Object.keys(submitted.answers)).toEqual(['value', 'structure', 'defend'])
  })

  it('returns a full-marks empty result for a task with no stages', () => {
    const result = gradeMulti(baseTask({ stages: [] }), answer({}), {}, noop)
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([])
  })
})
