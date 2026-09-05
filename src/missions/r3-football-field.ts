import type { Mission } from '../engine/types'
import { gradeFootballField } from '../engine/graders/footballfield'
import { mdVerdict } from '../engine/voice'
import { NANS_PANTRY } from './companies'

/**
 * Rung 3, mission 5. The football field chart: line up two valuation
 * ranges for Nan's Pantry Markets on one per-share axis. Figures read from
 * the company bible (src/missions/companies.ts) so they can never drift
 * from PLAN.md section (c):
 *   EBITDA = 144,000 ($k), net debt = 300,000 ($k), shares = 60,000 (k).
 *
 * Comps range 6.2x-7.4x is the genuine grocery peer set (Verdant 6.2x,
 * Trestle 6.8x, Copperline 7.4x). Precedents range 8.4x-9.2x is the two
 * grocery precedent deals (Verdant/PE sponsor 8.4x, Trestle/Copperline
 * 9.2x); the third precedent (Marrow Fabrication, an industrial deal) does
 * not belong in this comp set.
 *
 * Per-share = (multiple x EBITDA - net debt) / shares:
 *   comps low:  (6.2 x 144,000 - 300,000) / 60,000 = 9.88
 *   comps high: (7.4 x 144,000 - 300,000) / 60,000 = 12.76
 *   precedents low:  (8.4 x 144,000 - 300,000) / 60,000 = 15.16
 *   precedents high: (9.2 x 144,000 - 300,000) / 60,000 = 17.08
 * These match PLAN.md section (d) exactly; no discrepancy to report.
 */

const EBITDA = NANS_PANTRY.income.ebitda
const NET_DEBT = NANS_PANTRY.market!.netDebt
const SHARES_K = NANS_PANTRY.market!.sharesK

/** Per-share equity value at a given EV/EBITDA multiple, per the bible above. */
function perShare(multiple: number): number {
  return Math.round(((multiple * EBITDA - NET_DEBT) / SHARES_K) * 100) / 100
}

const COMPS_LOW_MULT = 6.2
const COMPS_HIGH_MULT = 7.4
const PRECEDENTS_LOW_MULT = 8.4
const PRECEDENTS_HIGH_MULT = 9.2

const COMPS_LOW = perShare(COMPS_LOW_MULT)
const COMPS_HIGH = perShare(COMPS_HIGH_MULT)
const PRECEDENTS_LOW = perShare(PRECEDENTS_LOW_MULT)
const PRECEDENTS_HIGH = perShare(PRECEDENTS_HIGH_MULT)

function arithmetic(multiple: number, result: number): string {
  const ev = multiple * EBITDA
  const equity = ev - NET_DEBT
  return `${multiple}x EBITDA ${EBITDA.toLocaleString('en-US')} = ${ev.toLocaleString('en-US')} enterprise value; minus net debt ${NET_DEBT.toLocaleString(
    'en-US',
  )} = ${equity.toLocaleString('en-US')} equity value; over ${SHARES_K.toLocaleString('en-US')}k shares = $${result.toFixed(2)}`
}

const mission: Mission = {
  id: 'r3-football-field',
  rung: 3,
  order: 5,
  title: 'The football field',
  tagline: "Every valuation method gets a bar. The bars had better overlap.",
  baseComp: 9_000,
  parSeconds: 200,
  lesson: {
    title: 'One axis, every method',
    body:
      "A football field lines up every valuation method's price range on one axis, so you can see where they agree. Trading comps price Nan's Pantry off similar public companies' EV/EBITDA multiples — enterprise value (equity value plus net debt) divided by EBITDA (earnings before interest, taxes, depreciation and amortization). Precedent transactions apply the same math to past control buyouts, so they usually price higher, since buyers pay a premium to gain control. Either way: EV = multiple x EBITDA, minus net debt (total debt less cash) gives equity value, and equity value divided by shares outstanding gives the per-share price. Drag each range's low and high ends onto the axis below.",
    visual: {
      kind: 'bullets',
      items: [
        'Trading comps (grocery peers): 6.2x-7.4x EV/EBITDA',
        'Precedent transactions (past buyouts): 8.4x-9.2x EV/EBITDA',
        'Per share = (multiple x EBITDA - net debt) / shares',
      ],
    },
  },
  task: {
    kind: 'footballfield',
    prompt: "Set the low and high end of each valuation range for Nan's Pantry, in dollars per share.",
    unit: '$',
    axis: { min: 8, max: 20, step: 0.05 },
    rows: [
      {
        id: 'comps',
        label: 'Trading comps 6.2x–7.4x',
        lowAnswer: COMPS_LOW,
        highAnswer: COMPS_HIGH,
        tolerance: 0.25,
        role: 'equity',
        hint: 'EV = multiple x EBITDA 144,000; minus net debt 300,000; over 60,000k shares',
      },
      {
        id: 'precedents',
        label: 'Precedents 8.4x–9.2x',
        lowAnswer: PRECEDENTS_LOW,
        highAnswer: PRECEDENTS_HIGH,
        tolerance: 0.25,
        role: 'debt',
        hint: 'EV = multiple x EBITDA 144,000; minus net debt 300,000; over 60,000k shares',
      },
    ],
  },
  grade(answer) {
    if (answer.kind !== 'footballfield') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'footballfield') throw new Error('wrong task kind')
    return gradeFootballField(mission.task, answer, ({ accuracy, rows }) => {
      const comps = rows.find((r) => r.id === 'comps')
      const precedents = rows.find((r) => r.id === 'precedents')

      if (accuracy === 1) {
        return {
          verdict: 'Fine. Do not let it go to your head.',
          explanation: `Both bars land where the desk would defend them. Comps: low end ${arithmetic(COMPS_LOW_MULT, COMPS_LOW)}; high end ${arithmetic(
            COMPS_HIGH_MULT,
            COMPS_HIGH,
          )}. Precedents: low end ${arithmetic(PRECEDENTS_LOW_MULT, PRECEDENTS_LOW)}; high end ${arithmetic(
            PRECEDENTS_HIGH_MULT,
            PRECEDENTS_HIGH,
          )}. Precedents sit above comps because a buyer pays a premium for control.`,
        }
      }

      if (accuracy === 0) {
        return {
          verdict: 'Did you even open the file?',
          explanation: `Neither bar is close. The Trading comps row: low end ${arithmetic(COMPS_LOW_MULT, COMPS_LOW)}; high end ${arithmetic(
            COMPS_HIGH_MULT,
            COMPS_HIGH,
          )}. The Precedents row: low end ${arithmetic(PRECEDENTS_LOW_MULT, PRECEDENTS_LOW)}; high end ${arithmetic(
            PRECEDENTS_HIGH_MULT,
            PRECEDENTS_HIGH,
          )}.`,
        }
      }

      const hints: string[] = []
      if (comps && !comps.lowOk) hints.push(`Trading comps row, low end: ${arithmetic(COMPS_LOW_MULT, COMPS_LOW)}.`)
      if (comps && !comps.highOk) hints.push(`Trading comps row, high end: ${arithmetic(COMPS_HIGH_MULT, COMPS_HIGH)}.`)
      if (precedents && !precedents.lowOk) hints.push(`Precedents row, low end: ${arithmetic(PRECEDENTS_LOW_MULT, PRECEDENTS_LOW)}.`)
      if (precedents && !precedents.highOk) hints.push(`Precedents row, high end: ${arithmetic(PRECEDENTS_HIGH_MULT, PRECEDENTS_HIGH)}.`)
      hints.push('Precedents run above comps because a control premium is baked into every buyout multiple.')

      return {
        verdict: mdVerdict(accuracy, 'r3-football-field'),
        explanation: hints.join(' '),
      }
    })
  },
}

export default mission
