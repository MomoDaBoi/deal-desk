import type { Mission } from '../engine/types'
import { gradeFootballField } from '../engine/graders/footballfield'
import { mdVerdict } from '../engine/voice'
import { BRICKHOUSE } from './companies'

/**
 * Rung 3, mission 6 (boss). Value Brickhouse Industrial three separate
 * ways on one football-field axis, then defend one of them. Figures read
 * from the company bible (src/missions/companies.ts) so they can never
 * drift from PLAN.md section (c):
 *   EBITDA = 96,000 ($k), net debt = 220,000 ($k), shares = 40,000 (k).
 *
 * Comps range 7.4x-8.8x is the middle of the four genuine industrial
 * trading peers (Marrow Fabrication 6.2x, Ironvale Components 7.4x,
 * Dockwell Systems 8.8x, Palisade Doors & Docks 9.5x): drop the cheapest
 * and richest outliers and quote the pack in between, because that is what
 * a desk actually defends to a client — the middle of the pack, not the
 * extremes. Trading multiples, no control premium.
 * Precedents range 7.8x-9.6x is the industrial slice of the PRECEDENTS
 * list only (Marrow Fabrication/Palisade 7.8x low, Anchor Bay Dock
 * Equipment/Girder & Vale 9.6x high; Corbel Industrial Doors at 8.9x sits
 * inside that band) — whole-company acquisitions, so a control premium is
 * baked in. The two grocery precedents (Trestle Foods, Verdant Grocers) do
 * not belong in an industrial target's precedent range and are excluded.
 * Market range $12.10-$16.40 is the stated 52-week trading range, given
 * directly (no multiple applied).
 *
 * Per-share = (multiple x EBITDA - net debt) / shares:
 *   comps low:       (7.4 x 96,000 - 220,000) / 40,000 = 12.26
 *   comps high:      (8.8 x 96,000 - 220,000) / 40,000 = 15.62
 *   precedents low:  (7.8 x 96,000 - 220,000) / 40,000 = 13.22
 *   precedents high: (9.6 x 96,000 - 220,000) / 40,000 = 17.54
 * These match the spec exactly; no discrepancy to report.
 */

const EBITDA = BRICKHOUSE.income.ebitda
const NET_DEBT = BRICKHOUSE.market!.netDebt
const SHARES_K = BRICKHOUSE.market!.sharesK

/** Per-share equity value at a given EV/EBITDA multiple, per the bible above. */
function perShare(multiple: number): number {
  return Math.round(((multiple * EBITDA - NET_DEBT) / SHARES_K) * 100) / 100
}

const COMPS_LOW_MULT = 7.4
const COMPS_HIGH_MULT = 8.8
const PRECEDENTS_LOW_MULT = 7.8
const PRECEDENTS_HIGH_MULT = 9.6
const MARKET_LOW = 12.1
const MARKET_HIGH = 16.4

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
  id: 'r3-boss-three-ways',
  rung: 3,
  order: 6,
  title: 'Three ways to the same target',
  tagline: 'Three methods, three ranges, one client waiting for a number.',
  baseComp: 14_000,
  parSeconds: 240,
  boss: true,
  lesson: {
    title: 'Every method prices something different',
    body:
      "A football field chart lines up several valuation ranges for the same company. Each multiplies EBITDA (operating profit before interest, tax, depreciation, and amortization) by a multiple for enterprise value (EV, the price for the whole business), subtracts net debt (debt minus cash) for equity value, then divides by shares outstanding for a price per share. Trading comps use multiples for similar public peers today — quote the pack's middle, not the extremes. Precedents use multiples from same-industry deals, so they carry a control premium: the extra a buyer pays to take control. The 52-week range is just where the stock traded. Selling the whole company? Defend the precedent range — it is the only one priced for control.",
    visual: {
      kind: 'bullets',
      items: [
        `Comps 7.4x–8.8x EBITDA (96,000) → EV 710,400–844,800 − net debt 220,000 → $${COMPS_LOW.toFixed(2)}–$${COMPS_HIGH.toFixed(2)}/share (the middle of the four industrial peers, extremes dropped)`,
        `Precedents 7.8x–9.6x EBITDA → EV 748,800–921,600 − net debt → $${PRECEDENTS_LOW.toFixed(2)}–$${PRECEDENTS_HIGH.toFixed(2)}/share (industrial deals only)`,
        `52-week range: $${MARKET_LOW.toFixed(2)}–$${MARKET_HIGH.toFixed(2)}/share, straight off the tape, no math`,
      ],
    },
  },
  task: {
    kind: 'footballfield',
    prompt:
      "Brickhouse Industrial's board is deciding whether to sell the whole company. Its stock has traded between $12.10 and $16.40 over the last 52 weeks — set that range first, then work out the comps and precedent ranges from the multiples below. Finish by picking the range you would actually defend to the client.",
    unit: '$',
    axis: { min: 8, max: 24, step: 0.05 },
    rows: [
      {
        id: 'comps',
        label: 'Trading comps 7.4x–8.8x',
        lowAnswer: COMPS_LOW,
        highAnswer: COMPS_HIGH,
        tolerance: 0.3,
        role: 'equity',
        hint: 'Ironvale Components (7.4x) to Dockwell Systems (8.8x) — the middle of the four industrial peers, Marrow Fabrication (6.2x) and Palisade Doors & Docks (9.5x) dropped as the extremes: EV = multiple x EBITDA 96,000; minus net debt 220,000; over 40,000k shares',
      },
      {
        id: 'precedents',
        label: 'Precedents 7.8x–9.6x',
        lowAnswer: PRECEDENTS_LOW,
        highAnswer: PRECEDENTS_HIGH,
        tolerance: 0.3,
        role: 'debt',
        hint: 'Industrial whole-company acquisitions only (Marrow Fabrication/Palisade 7.8x to Anchor Bay Dock Equipment/Girder & Vale 9.6x) — the grocery precedents do not price an industrial target: EV = multiple x EBITDA 96,000; minus net debt 220,000; over 40,000k shares',
      },
      {
        id: 'market',
        label: '52-week trading range',
        lowAnswer: MARKET_LOW,
        highAnswer: MARKET_HIGH,
        tolerance: 0.1,
        role: 'cash',
        hint: 'Given directly in the prompt: $12.10–$16.40, no calculation needed',
      },
    ],
    question: {
      text: 'Your client is selling the whole company. Which range would you actually defend to them as your valuation?',
      choices: [
        { id: 'comps', label: 'Trading comps: it is what the market pays for peers today' },
        { id: 'precedents', label: 'Precedents: control deals are the closest thing to this deal' },
        { id: 'market', label: 'The 52-week range: the market is always right' },
      ],
      correctId: 'precedents',
      explanation:
        'Precedents price whole-company acquisitions of industrial businesses like Brickhouse — the same kind of deal your client is doing, where a buyer pays for control, not just a minority stake. That control premium (the extra a buyer pays over the trading price to take over and run the target) is baked into the 7.8x–9.6x range, which is why it is the range you would defend to a client selling the whole company, and why it sits above the 7.4x–8.8x trading comps range. Trading comps price minority stakes with no control premium, and the 52-week range just reflects where the stock happened to trade, not what a buyer would pay for control.',
      weight: 0.25,
    },
  },
  grade(answer) {
    if (answer.kind !== 'footballfield') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'footballfield') throw new Error('wrong task kind')
    return gradeFootballField(mission.task, answer, ({ accuracy, rows, questionOk }) => {
      const comps = rows.find((r) => r.id === 'comps')
      const precedents = rows.find((r) => r.id === 'precedents')
      const market = rows.find((r) => r.id === 'market')
      const questionExplanation = mission.task.kind === 'footballfield' ? mission.task.question!.explanation : ''

      if (accuracy === 1) {
        return {
          verdict: 'Fine. Do not let it go to your head.',
          explanation: `All three bars land where the desk would defend them. Comps: low end ${arithmetic(COMPS_LOW_MULT, COMPS_LOW)}; high end ${arithmetic(
            COMPS_HIGH_MULT,
            COMPS_HIGH,
          )}. Precedents: low end ${arithmetic(PRECEDENTS_LOW_MULT, PRECEDENTS_LOW)}; high end ${arithmetic(
            PRECEDENTS_HIGH_MULT,
            PRECEDENTS_HIGH,
          )}. The 52-week range is simply $${MARKET_LOW.toFixed(2)}–$${MARKET_HIGH.toFixed(2)}, straight off the tape. ${questionExplanation}`,
        }
      }

      if (accuracy === 0) {
        return {
          verdict: 'Did you even open the file?',
          explanation: `None of the three bars are close, and the wrong range got picked too. Trading comps row: low end ${arithmetic(
            COMPS_LOW_MULT,
            COMPS_LOW,
          )}; high end ${arithmetic(COMPS_HIGH_MULT, COMPS_HIGH)}. Precedents row: low end ${arithmetic(
            PRECEDENTS_LOW_MULT,
            PRECEDENTS_LOW,
          )}; high end ${arithmetic(PRECEDENTS_HIGH_MULT, PRECEDENTS_HIGH)}. 52-week trading range row: this one is given directly in the prompt, $${MARKET_LOW.toFixed(
            2,
          )}–$${MARKET_HIGH.toFixed(2)}, no calculation needed. ${questionExplanation}`,
        }
      }

      const hints: string[] = []
      if (comps && !comps.lowOk) hints.push(`Trading comps row, low end: ${arithmetic(COMPS_LOW_MULT, COMPS_LOW)}.`)
      if (comps && !comps.highOk) hints.push(`Trading comps row, high end: ${arithmetic(COMPS_HIGH_MULT, COMPS_HIGH)}.`)
      if (precedents && !precedents.lowOk) hints.push(`Precedents row, low end: ${arithmetic(PRECEDENTS_LOW_MULT, PRECEDENTS_LOW)}.`)
      if (precedents && !precedents.highOk) hints.push(`Precedents row, high end: ${arithmetic(PRECEDENTS_HIGH_MULT, PRECEDENTS_HIGH)}.`)
      if (market && !market.lowOk)
        hints.push(`52-week trading range row, low end: given directly in the prompt as $${MARKET_LOW.toFixed(2)}, no calculation needed.`)
      if (market && !market.highOk)
        hints.push(`52-week trading range row, high end: given directly in the prompt as $${MARKET_HIGH.toFixed(2)}, no calculation needed.`)
      if (questionOk === false) hints.push(`On the question: ${questionExplanation}`)

      return {
        verdict: mdVerdict(accuracy, 'r3-boss-three-ways'),
        explanation: hints.join(' '),
      }
    })
  },
}

export default mission
