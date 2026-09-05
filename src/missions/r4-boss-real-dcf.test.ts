import { describe, expect, it } from 'vitest'
import type { SliderAnswer, QuizAnswer } from '../engine/types'
import { edgarByTicker, edgarCompanies, ebitda, netDebt, impliedMarketValue, type EdgarCompany } from '../lib/edgar'
import mission, {
  ANSWER,
  ANSWER_EV,
  BASE_FCF,
  COMPANY,
  CORRECT_QUESTION_ID,
  GROWTH_LINE,
  MARKET_EV,
  QUESTION_EXPLANATION,
  TG_LINE,
  WACC_LINE,
  impliedEnterpriseValue,
} from './r4-boss-real-dcf'

function task() {
  if (mission.task.kind !== 'slider') throw new Error('expected a slider task')
  return mission.task
}

describe('r4-boss-real-dcf: mission shape', () => {
  it('is a rung-4 boss slider mission with the specified base comp and par', () => {
    expect(mission.id).toBe('r4-boss-real-dcf')
    expect(mission.rung).toBe(4)
    expect(mission.order).toBe(6)
    expect(mission.boss).toBe(true)
    expect(mission.baseComp).toBe(17_000)
    expect(mission.parSeconds).toBe(300)
    expect(mission.task.kind).toBe('slider')
  })

  it('lesson body is under 120 words', () => {
    const wordCount = mission.lesson.body.trim().split(/\s+/).length
    expect(wordCount).toBeLessThan(120)
  })

  it('every id in the task is unique', () => {
    const t = task()
    const ids = [
      ...t.sliders.map((s) => s.id),
      ...(t.readouts ?? []).map((r) => r.id),
      ...(t.question ? t.question.choices.map((c) => c.id) : []),
    ]
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("the embedded question's correctId exists among its own choices", () => {
    const t = task()
    expect(t.question).toBeDefined()
    const choiceIds = t.question!.choices.map((c) => c.id)
    expect(choiceIds).toContain(t.question!.correctId)
  })

  it('sliders match the spec exactly (min/max/step/answer/tolerance/unit)', () => {
    const t = task()
    const growth = t.sliders.find((s) => s.id === 'growth')!
    expect(growth).toMatchObject({ min: 0, max: 10, step: 0.5, answer: 4, tolerance: 2, unit: '%' })

    const wacc = t.sliders.find((s) => s.id === 'wacc')!
    expect(wacc).toMatchObject({ min: 5, max: 12, step: 0.1, answer: 7.5, tolerance: 1.5, unit: '%' })

    const tg = t.sliders.find((s) => s.id === 'tg')!
    expect(tg).toMatchObject({ min: 0, max: 4, step: 0.25, answer: 2.5, tolerance: 1, unit: '%' })

    expect(t.question!.weight).toBe(0.4)
  })
})

describe('r4-boss-real-dcf: real EDGAR data', () => {
  it('selects a company with every field the model needs', () => {
    expect(COMPANY.revenue).not.toBeNull()
    expect(COMPANY.ebit).not.toBeNull()
    expect(COMPANY.da).not.toBeNull()
    expect(COMPANY.debt).not.toBeNull()
    expect(COMPANY.cash).not.toBeNull()
    expect(COMPANY.publicFloat).not.toBeNull()
  })

  it('prefers Coca-Cola (KO) when the snapshot has it with usable fields', () => {
    const ko = edgarByTicker('KO')
    const koUsable =
      ko !== undefined && ko.revenue !== null && ko.ebit !== null && ko.da !== null && ko.debt !== null && ko.cash !== null && ko.publicFloat !== null
    if (koUsable) {
      expect(COMPANY.ticker.toUpperCase()).toBe('KO')
    } else {
      // KO absent or missing a field: COMPANY must be the first usable fallback in snapshot order.
      function usable(c: EdgarCompany): boolean {
        return c.revenue !== null && c.ebit !== null && c.da !== null && c.debt !== null && c.cash !== null && c.publicFloat !== null
      }
      const expectedFallback = edgarCompanies().find(usable)
      expect(COMPANY.ticker).toBe(expectedFallback?.ticker ?? 'DEMO')
    }
  })

  it('BASE_FCF is EBITDA proxy (EBIT + D&A) times 0.55', () => {
    const ebitdaProxy = ebitda(COMPANY)!
    expect(BASE_FCF).toBeCloseTo(ebitdaProxy * 0.55, 6)
  })

  it('MARKET_EV is public float plus net debt', () => {
    const expected = impliedMarketValue(COMPANY)! + netDebt(COMPANY)!
    expect(MARKET_EV).toBeCloseTo(expected, 6)
  })
})

describe('r4-boss-real-dcf: DCF model', () => {
  it('discounts a flat (0% growth) FCF at a WACC with no terminal growth back to FCF / wacc, over 5 years', () => {
    // A textbook sanity check independent of the mission's own numbers:
    // with growth = 0 and tg = 0, this is a plain 5-year annuity plus a
    // no-growth perpetuity (FCF / wacc) discounted back 5 years.
    const fcf = 1_000
    const waccPct = 10
    const ev = impliedEnterpriseValue(fcf, 0, waccPct, 0)
    const waccRate = waccPct / 100
    let expectedPvFcf = 0
    for (let year = 1; year <= 5; year++) expectedPvFcf += fcf / Math.pow(1 + waccRate, year)
    const expectedTerminal = fcf / waccRate
    const expectedPvTerminal = expectedTerminal / Math.pow(1 + waccRate, 5)
    expect(ev).toBeCloseTo(expectedPvFcf + expectedPvTerminal, 6)
  })

  it('higher growth implies a higher enterprise value, all else equal', () => {
    const low = impliedEnterpriseValue(1_000, 1, 8, 2)
    const high = impliedEnterpriseValue(1_000, 8, 8, 2)
    expect(high).toBeGreaterThan(low)
  })

  it('higher WACC implies a lower enterprise value, all else equal', () => {
    const low = impliedEnterpriseValue(1_000, 4, 12, 2)
    const high = impliedEnterpriseValue(1_000, 4, 6, 2)
    expect(high).toBeGreaterThan(low)
  })

  it('ANSWER_EV matches impliedEnterpriseValue at the band midpoints (4% growth, 7.5% WACC, 2.5% terminal growth)', () => {
    const recomputed = impliedEnterpriseValue(BASE_FCF, ANSWER.growth, ANSWER.wacc, ANSWER.tg)
    expect(ANSWER_EV).toBeCloseTo(recomputed, 6)
  })
})

describe('r4-boss-real-dcf: correctId is computed from the real, live numbers', () => {
  it('re-derives the market-implied EV straight from the EDGAR snapshot and matches MARKET_EV', () => {
    const marketValue = impliedMarketValue(COMPANY)!
    const nd = netDebt(COMPANY)!
    expect(MARKET_EV).toBeCloseTo(marketValue + nd, 6)
  })

  it("the question's correctId reflects the DCF-at-band-midpoints vs the market-implied EV, using the 15% fair band", () => {
    const ratio = ANSWER_EV / MARKET_EV
    const expectedId = ratio > 1.15 ? 'high' : ratio < 0.85 ? 'low' : 'fair'
    expect(CORRECT_QUESTION_ID).toBe(expectedId)
    expect(task().question!.correctId).toBe(expectedId)
  })
})

describe('r4-boss-real-dcf: grading', () => {
  it('a perfect answer (all sliders at answer, question correct) scores accuracy 1', () => {
    const answer: SliderAnswer = {
      kind: 'slider',
      values: { growth: ANSWER.growth, wacc: ANSWER.wacc, tg: ANSWER.tg },
      choice: CORRECT_QUESTION_ID,
    }
    const result = mission.grade(answer)
    expect(result.accuracy).toBe(1)
  })

  it('a specific wrong slider (growth set to the far end of the range) lowers accuracy and the explanation names growth', () => {
    const t = task()
    const growthSlider = t.sliders.find((s) => s.id === 'growth')!
    // 0 is 4 away from the answer (4), which is 2x tolerance (2) -> scores 0.
    const answer: SliderAnswer = {
      kind: 'slider',
      values: { growth: growthSlider.min, wacc: ANSWER.wacc, tg: ANSWER.tg },
      choice: CORRECT_QUESTION_ID,
    }
    const result = mission.grade(answer)
    // sliderAccuracy = (0 + 1 + 1) / 3 = 0.6667; weighted with a correct question (weight 0.4):
    // 0.6 * 0.6667 + 0.4 * 1 = 0.8
    expect(result.accuracy).toBeCloseTo(0.8, 6)
    expect(result.explanation).toContain(GROWTH_LINE)
    expect(result.explanation).not.toContain(WACC_LINE)
    expect(result.explanation).not.toContain(TG_LINE)
    expect(result.explanation).not.toContain(QUESTION_EXPLANATION)
  })

  it('a wrong question choice lowers accuracy and the explanation includes the market-vs-DCF comparison', () => {
    const wrongChoice = task().question!.choices.map((c) => c.id).find((id) => id !== CORRECT_QUESTION_ID)!
    const answer: SliderAnswer = {
      kind: 'slider',
      values: { growth: ANSWER.growth, wacc: ANSWER.wacc, tg: ANSWER.tg },
      choice: wrongChoice,
    }
    const result = mission.grade(answer)
    expect(result.accuracy).toBeCloseTo(0.6, 6) // sliders perfect (1.0), question wrong: 0.6*1 + 0.4*0
    expect(result.explanation).toContain(QUESTION_EXPLANATION)
  })

  it('throws on a mismatched answer kind', () => {
    const wrongAnswer: QuizAnswer = { kind: 'quiz', choices: {} }
    expect(() => mission.grade(wrongAnswer)).toThrow()
  })
})
