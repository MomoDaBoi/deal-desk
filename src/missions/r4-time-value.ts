import type { Mission } from '../engine/types'
import { gradeSlider } from '../engine/graders/slider'
import { mdVerdict } from '../engine/voice'

/**
 * Rung 4, mission 1. The first mission of the VP rung: before any DCF
 * (discounted cash flow) makes sense, the player has to feel discounting
 * itself. A future dollar is worth less than a dollar today, and the further
 * out it sits, the harder it shrinks. This mission uses a plain, generic
 * $100 (no fictional company involved) so the arithmetic is the whole point.
 */

const FUTURE_VALUE = 100
const DISCOUNT_RATE_PCT = 10
const YEARS = [1, 3, 5] as const

/** PV = FV / (1 + r)^n. The one formula this whole mission exists to teach. */
function presentValue(futureValue: number, ratePct: number, years: number): number {
  return futureValue / Math.pow(1 + ratePct / 100, years)
}

/** Round to cents, matching how every other dollar figure in the game is shown. */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

const PV: Record<(typeof YEARS)[number], number> = {
  1: round2(presentValue(FUTURE_VALUE, DISCOUNT_RATE_PCT, 1)), // 90.91
  3: round2(presentValue(FUTURE_VALUE, DISCOUNT_RATE_PCT, 3)), // 75.13
  5: round2(presentValue(FUTURE_VALUE, DISCOUNT_RATE_PCT, 5)), // 62.09
}

const RATE_MULTIPLIER = (1 + DISCOUNT_RATE_PCT / 100).toFixed(2) // "1.10"

/** The division itself, spelled out, for a given horizon. */
function lineFor(years: (typeof YEARS)[number]): string {
  return `$${FUTURE_VALUE} in ${years} year${years === 1 ? '' : 's'}: $${FUTURE_VALUE} / ${RATE_MULTIPLIER}^${years} = $${PV[years].toFixed(2)}.`
}

const LINE_1 = lineFor(1)
const LINE_3 = lineFor(3)
const LINE_5 = lineFor(5)
const ALL_LINES = `${LINE_1} ${LINE_3} ${LINE_5}`

const SLIDER_ID_TO_YEARS: Record<string, (typeof YEARS)[number]> = {
  pv1: 1,
  pv3: 3,
  pv5: 5,
}

const mission: Mission = {
  id: 'r4-time-value',
  rung: 4,
  order: 1,
  title: 'A dollar tomorrow',
  tagline: 'The whole VP rung rests on this one idea.',
  baseComp: 8_000,
  parSeconds: 150,
  lesson: {
    title: 'The time value of money',
    body:
      "A dollar next year is worth less than a dollar today: invest today's dollar and it earns a return before next year arrives. That gap is the time value of money. Discounting compares cash from different years fairly — it shrinks a future dollar back to today's worth, using a discount rate (the return you'd otherwise earn, here 10%). The formula: PV = FV / (1 + r)^n — present value equals future value divided by one plus the rate, raised to the number of years, n. The farther out the cash sits, the harder it shrinks: $100 next year is worth $90.91 today; the same $100 in five years is worth only $62.09.",
    visual: {
      kind: 'bullets',
      items: [
        'Future value (FV): $100, discount rate (r): 10%',
        'PV = FV / (1 + r)^n',
        `1 year out: $${PV[1].toFixed(2)} · 3 years out: $${PV[3].toFixed(2)} · 5 years out: $${PV[5].toFixed(2)}`,
      ],
    },
  },
  task: {
    kind: 'slider',
    prompt:
      'Someone owes you $100, discounted at a 10% rate. Set the present value (PV) of that $100 for each horizon: paid in 1 year, in 3 years, and in 5 years.',
    sliders: [
      {
        id: 'pv1',
        label: 'PV of $100 in 1 year',
        min: 40,
        max: 100,
        step: 0.1,
        answer: PV[1],
        tolerance: 0.5,
        unit: '$',
        role: 'cash',
        hint: 'PV = FV / (1 + r)^n. $100 / 1.10^1.',
      },
      {
        id: 'pv3',
        label: 'PV of $100 in 3 years',
        min: 40,
        max: 100,
        step: 0.1,
        answer: PV[3],
        tolerance: 0.5,
        unit: '$',
        role: 'cash',
        hint: 'PV = FV / (1 + r)^n. $100 / 1.10^3 — compounded three times.',
      },
      {
        id: 'pv5',
        label: 'PV of $100 in 5 years',
        min: 40,
        max: 100,
        step: 0.1,
        answer: PV[5],
        tolerance: 0.5,
        unit: '$',
        role: 'cash',
        hint: 'PV = FV / (1 + r)^n. $100 / 1.10^5 — the longer the wait, the smaller the PV.',
      },
    ],
  },
  grade(answer) {
    if (answer.kind !== 'slider') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'slider') throw new Error('wrong task kind')
    return gradeSlider(mission.task, answer, ({ accuracy, wrongIds }) => {
      if (accuracy === 1) {
        return {
          verdict: 'Discounted to the penny. The time value of money bows to you.',
          explanation: `Every horizon landed exactly right. ${ALL_LINES}`,
        }
      }
      if (accuracy === 0) {
        return {
          verdict: mdVerdict(0, 'r4-time-value'),
          explanation: `None of the three landed. ${ALL_LINES}`,
        }
      }
      const missedLines = wrongIds
        .map((id) => SLIDER_ID_TO_YEARS[id])
        .filter((years): years is (typeof YEARS)[number] => years !== undefined)
        .map((years) => lineFor(years))
      return {
        verdict: mdVerdict(accuracy, 'r4-time-value'),
        explanation: missedLines.join(' '),
      }
    })
  },
}

export default mission
