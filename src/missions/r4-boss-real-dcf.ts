import type { Mission, SliderTask } from '../engine/types'
import { gradeSlider } from '../engine/graders/slider'
import { mdVerdict } from '../engine/voice'
import { edgarByTicker, edgarCompanies, ebitda, netDebt, impliedMarketValue, fmtMoney, type EdgarCompany } from '../lib/edgar'

/**
 * Rung 4 boss fight. This is where the game stops making up companies: the
 * model runs on one real SEC filer's own numbers, pulled from the bundled
 * EDGAR snapshot (see src/lib/edgar.ts, PLAN.md section (h)). The player
 * builds a discounted cash flow (DCF) — 5 years of projected free cash flow
 * (FCF) plus a Gordon-growth terminal value, discounted at a weighted
 * average cost of capital (WACC) — then judges their own answer against
 * the market's implied value.
 *
 * Real filings are messy: not every filer reports every tag, so we prefer
 * Coca-Cola (KO) but fall back to the first snapshot company with every
 * field this mission needs, so the mission never crashes on missing data.
 */

/** True when a company has every field this mission's model needs. */
function usable(c: EdgarCompany): boolean {
  return c.revenue !== null && c.ebit !== null && c.da !== null && c.debt !== null && c.cash !== null && c.publicFloat !== null
}

/**
 * Stand-in used ONLY when no SEC snapshot has been generated yet (see
 * src/data/README.md). Figures are Brickhouse-scale fiction, in dollars,
 * and the mission copy says so.
 */
export const STAND_IN: EdgarCompany = {
  ticker: 'DEMO',
  cik: '0000000000',
  name: 'Brickhouse Industrial (stand-in, no SEC data loaded)',
  fiscalYear: null,
  periodEnd: null,
  revenue: 640_000_000,
  ebit: 64_000_000,
  da: 32_000_000,
  netIncome: 34_500_000,
  cash: 40_000_000,
  shortTermInvestments: 0,
  debt: 260_000_000,
  shares: 40_000_000,
  totalAssets: 900_000_000,
  equity: 400_000_000,
  publicFloat: 580_000_000,
}

function pickCompany(): EdgarCompany {
  const ko = edgarByTicker('KO')
  if (ko && usable(ko)) return ko
  return edgarCompanies().find(usable) ?? STAND_IN
}

/** True when the game is running on the stand-in rather than a real filing. */
export const USING_STAND_IN = pickCompany() === STAND_IN

function requireNumber(n: number | null, what: string): number {
  if (n === null) throw new Error(`r4-boss-real-dcf: ${what} is null for the selected company`)
  return n
}

export const COMPANY = pickCompany()

/** EBIT + D&A, the game's standing EBITDA proxy (see src/lib/edgar.ts). */
const EBITDA_PROXY = requireNumber(ebitda(COMPANY), 'ebitda')

/**
 * Filings don't hand you free cash flow directly. EBITDA × 0.55 is a rough
 * industry rule of thumb (roughly: strip out cash taxes, interest, and
 * reinvestment) — good enough for a first pass, not a substitute for a real
 * cash flow build.
 */
export const BASE_FCF = EBITDA_PROXY * 0.55

const COMPANY_NET_DEBT = requireNumber(netDebt(COMPANY), 'netDebt')
const COMPANY_MARKET_VALUE = requireNumber(impliedMarketValue(COMPANY), 'impliedMarketValue')

/** Market-implied enterprise value: public float value (a dollar proxy for market cap) plus net debt. */
export const MARKET_EV = COMPANY_MARKET_VALUE + COMPANY_NET_DEBT

/** One year's projected FCF at each of years 1-5, compounding at `growthPct`. */
export function fiveYearFcfSeries(baseFcf: number, growthPct: number): number[] {
  const series: number[] = []
  let fcf = baseFcf
  for (let year = 1; year <= 5; year++) {
    fcf = fcf * (1 + growthPct / 100)
    series.push(fcf)
  }
  return series
}

/**
 * Implied enterprise value: the sum of the present value of 5 years of FCF
 * (growing at `growthPct`, discounted at `waccPct`) plus the present value
 * of a Gordon-growth terminal value off year 5 (growing forever at
 * `tgPct`). `waccPct` must exceed `tgPct` — always true for this mission's
 * slider ranges (WACC 5-12%, terminal growth 0-4%).
 */
export function impliedEnterpriseValue(baseFcf: number, growthPct: number, waccPct: number, tgPct: number): number {
  const fcfs = fiveYearFcfSeries(baseFcf, growthPct)
  const waccRate = waccPct / 100
  const tgRate = tgPct / 100
  let pvOfFcfs = 0
  for (let i = 0; i < fcfs.length; i++) {
    const year = i + 1
    pvOfFcfs += fcfs[i] / Math.pow(1 + waccRate, year)
  }
  const fcf5 = fcfs[4]
  const terminalValue = (fcf5 * (1 + tgRate)) / (waccRate - tgRate)
  const pvOfTerminalValue = terminalValue / Math.pow(1 + waccRate, 5)
  return pvOfFcfs + pvOfTerminalValue
}

/** The "textbook" slider settings this mission's sliders (not the judgement question) grade against. */
export const ANSWER = { growth: 4, wacc: 7.5, tg: 2.5 }

/** Implied EV at the textbook answer settings — reference figure for the lesson, not what the judgement question is graded against (see `judgeVsMarket`, used live in `grade()` on the player's own slider values). */
export const ANSWER_EV = impliedEnterpriseValue(BASE_FCF, ANSWER.growth, ANSWER.wacc, ANSWER.tg)

/**
 * Judge an implied enterprise value against the market-implied EV using a
 * 15%-either-way "fair" band. Used live in `grade()` against the player's
 * own submitted DCF, so the readout on screen (which always shows the
 * player's own implied EV vs the market) and the graded verdict always
 * agree — never against a fixed textbook assumption.
 */
export function judgeVsMarket(impliedEv: number): { correctId: 'high' | 'low' | 'fair'; verdictWord: string; explanation: string } {
  const ratio = impliedEv / MARKET_EV
  const correctId: 'high' | 'low' | 'fair' = ratio > 1.15 ? 'high' : ratio < 0.85 ? 'low' : 'fair'
  const verdictWord = correctId === 'fair' ? 'roughly in line with' : correctId === 'high' ? 'higher than' : 'lower than'
  const explanation = `Your DCF implies ${fmtMoney(impliedEv, '$auto')} of enterprise value for ${COMPANY.name}. The market's implied EV (public float value plus net debt) is ${fmtMoney(MARKET_EV, '$auto')} — that makes your DCF ${verdictWord} the market.`
  return { correctId, verdictWord, explanation }
}

export const GROWTH_LINE = `Analysts pencil in modest growth for a mature company like ${COMPANY.name} — around 4% annual FCF growth, not a startup's hockey stick.`
export const WACC_LINE = `A WACC near 7.5% fits a large, stable, investment-grade filer like ${COMPANY.name}: the bigger and steadier the cash flows, the cheaper the blended cost of debt and equity.`
export const TG_LINE = `Terminal growth around 2.5% tracks long-run economic growth — no company can out-grow the whole economy forever, so the "forever" rate stays modest.`

/** The textbook judgement, computed from ANSWER_EV. Only used to seed the static task's `question.correctId`/`explanation` — `grade()` always re-derives both from the player's own answer. */
const TEXTBOOK_JUDGEMENT = judgeVsMarket(ANSWER_EV)
export const CORRECT_QUESTION_ID = TEXTBOOK_JUDGEMENT.correctId
export const QUESTION_EXPLANATION = TEXTBOOK_JUDGEMENT.explanation

const mission: Mission = {
  id: 'r4-boss-real-dcf',
  rung: 4,
  order: 6,
  boss: true,
  title: `The real DCF: ${COMPANY.name}`,
  tagline: USING_STAND_IN ? 'A stand-in until the SEC snapshot is generated.' : 'No more made-up companies. This one filed with the SEC.',
  baseComp: 17_000,
  parSeconds: 300,
  lesson: {
    title: 'Real data begins',
    body: `Every mission so far used a fictional company. This one runs on ${USING_STAND_IN ? 'a stand-in until the SEC snapshot is generated' : `${COMPANY.name}'s real SEC filing`}. A discounted cash flow (DCF) projects free cash flow (FCF: cash left after running and reinvesting) five years out and discounts it at the weighted average cost of capital (WACC: the blended return lenders and shareholders demand). Filings do not report FCF, so EBITDA times 0.55 stands in. That proxy strips interest, so discounting at WACC gives enterprise value, not equity: subtract net debt before comparing with market cap. Terminal growth is the FCF growth assumed forever after year five. Public float value stands in for market cap. A defensible band beats a point answer.`,
    visual: {
      kind: 'bullets',
      items: [
        USING_STAND_IN ? `${COMPANY.name} — placeholder figures until the snapshot is generated` : `${COMPANY.name}, straight from its SEC filing`,
        'EBITDA × 0.55 ≈ a rough stand-in for free cash flow',
        'Public float value (shares held outside insiders, at market) ≈ a rough stand-in for market cap',
        'The discounted total is enterprise value — take off net debt before comparing with market cap',
        'A defensible band beats a confident point answer',
      ],
    },
  },
  task: {
    kind: 'slider',
    prompt: `Build a 5-year DCF for ${COMPANY.name}. Set the annual FCF growth rate, the discount rate (WACC), and the terminal growth rate, then judge your answer against the market.`,
    sliders: [
      {
        id: 'growth',
        label: '5-year FCF growth',
        min: 0,
        max: 10,
        step: 0.5,
        answer: ANSWER.growth,
        tolerance: 2,
        unit: '%',
        role: 'revenue',
        hint: 'How fast free cash flow grows each of the next 5 years.',
      },
      {
        id: 'wacc',
        label: 'WACC (discount rate)',
        min: 5,
        max: 12,
        step: 0.1,
        answer: ANSWER.wacc,
        tolerance: 1.5,
        unit: '%',
        role: 'debt',
        hint: 'The blended return debt and equity holders require — used to discount future cash back to today.',
      },
      {
        id: 'tg',
        label: 'Terminal growth',
        min: 0,
        max: 4,
        step: 0.25,
        answer: ANSWER.tg,
        tolerance: 1,
        unit: '%',
        role: 'neutral',
        hint: 'The FCF growth rate assumed forever after year 5.',
      },
    ],
    readouts: [
      {
        id: 'impliedEV',
        label: `Implied EV, ${COMPANY.ticker}`,
        unit: '$B',
        role: 'equity',
        compute: (values) => impliedEnterpriseValue(BASE_FCF, values.growth, values.wacc, values.tg) / 1e9,
      },
      {
        id: 'marketEV',
        label: 'Market value (public float value) + net debt',
        unit: '$B',
        role: 'cash',
        compute: () => MARKET_EV / 1e9,
      },
    ],
    question: {
      text: 'Versus the market, your DCF says the shares are...',
      choices: [
        { id: 'high', label: 'Undervalued — your DCF value comes in higher than the market' },
        { id: 'low', label: 'Overvalued — your DCF value comes in lower than the market' },
        { id: 'fair', label: 'Fairly valued — your DCF lands within a reasonable band of the market' },
      ],
      correctId: CORRECT_QUESTION_ID,
      explanation: QUESTION_EXPLANATION,
      weight: 0.4,
    },
  },
  grade(answer) {
    if (answer.kind !== 'slider') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'slider') throw new Error('wrong task kind')
    const t = mission.task
    // Grade the judgement question against the DCF the player actually
    // built, not the fixed textbook assumptions — the on-screen readouts
    // always show the player's own implied EV vs the market, so the
    // "correct" choice must track that same number or the two contradict
    // each other (see PLAN.md / review notes on this mission).
    const growth = answer.values.growth ?? t.sliders.find((s) => s.id === 'growth')!.min
    const wacc = answer.values.wacc ?? t.sliders.find((s) => s.id === 'wacc')!.min
    const tg = answer.values.tg ?? t.sliders.find((s) => s.id === 'tg')!.min
    const playerEV = impliedEnterpriseValue(BASE_FCF, growth, wacc, tg)
    const judged = judgeVsMarket(playerEV)
    const gradedTask: SliderTask = { ...t, question: { ...t.question!, correctId: judged.correctId, explanation: judged.explanation } }
    return gradeSlider(gradedTask, answer, ({ accuracy, wrongIds }) => {
      if (accuracy === 1) {
        return {
          verdict: "Real filings, real discipline. The MD checks the tie-out twice and still can't fault it.",
          explanation: `${GROWTH_LINE} ${WACC_LINE} ${TG_LINE} ${judged.explanation}`,
        }
      }
      if (accuracy === 0) {
        return {
          verdict: mdVerdict(0, 'r4-boss-real-dcf'),
          explanation: `${GROWTH_LINE} ${WACC_LINE} ${TG_LINE} ${judged.explanation}`,
        }
      }
      const parts: string[] = []
      if (wrongIds.includes('growth')) parts.push(GROWTH_LINE)
      if (wrongIds.includes('wacc')) parts.push(WACC_LINE)
      if (wrongIds.includes('tg')) parts.push(TG_LINE)
      if (wrongIds.includes('question')) parts.push(judged.explanation)
      return {
        verdict: mdVerdict(accuracy, 'r4-boss-real-dcf'),
        explanation: parts.join(' '),
      }
    })
  },
}

export default mission
