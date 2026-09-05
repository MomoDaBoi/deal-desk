import type { Mission } from '../engine/types'
import { gradeBridge } from '../engine/graders/bridge'
import { mdVerdict } from '../engine/voice'
import { BRICKHOUSE } from './companies'

/**
 * Rung 5, mission 4. Palisade Doors & Docks (the acquirer) buys Brickhouse
 * Industrial (the target, from the company bible — src/missions/companies.ts
 * / PLAN.md section (c)) half in cash funded by new debt, half in newly
 * issued stock. The bridge walks the acquirer's standalone EPS to the
 * combined company's pro-forma EPS through the four things a stock-and-cash
 * deal changes: the target's earnings, cost synergies, the after-tax
 * interest on the new debt, and the dilution from spreading the acquirer's
 * own earnings over more shares.
 *
 * All figures below are computed by the pure helpers, never hand-typed
 * twice, so the mission and its test can never drift apart.
 */

// --- Deal inputs (defined here; the acquirer has no entry in companies.ts) ---

const ACQUIRER_NET_INCOME = 90_000 // $k
const ACQUIRER_SHARES_K = 60_000
const ACQUIRER_EPS = 1.5 // 90,000 / 60,000

const TARGET_NET_INCOME = BRICKHOUSE.income.netIncome // 34,500 — from the bible, not re-typed

const NEW_DEBT = 400_000 // $k of new debt funding the cash half of the deal
const INTEREST_RATE_PCT = 6
const TAX_RATE_PCT = 25

const NEW_SHARES_ISSUED_K = 25_000 // stock half of the consideration
const SYNERGIES_AFTER_TAX = 12_000 // $k, already net of tax

// --- Pure model helpers (recomputed here, not copied from the spec) ---

/** Round to 2 decimal places (EPS-scale figures). */
function round2(x: number): number {
  return Math.round(x * 100) / 100
}

/** Interest on new acquisition debt, net of the tax shield. */
export function afterTaxInterest(debt: number, ratePct: number, taxRatePct: number): number {
  const pretax = debt * (ratePct / 100)
  return pretax * (1 - taxRatePct / 100)
}

/** Combined net income after adding the target, synergies, and the new interest expense. */
export function proFormaNetIncome(
  acquirerNetIncome: number,
  targetNetIncome: number,
  synergiesAfterTax: number,
  interestAfterTax: number,
): number {
  return acquirerNetIncome + targetNetIncome + synergiesAfterTax - interestAfterTax
}

/** Combined share count after issuing new shares for the stock half of the deal. */
export function proFormaShares(acquirerSharesK: number, newSharesK: number): number {
  return acquirerSharesK + newSharesK
}

/** Earnings per share: net income over shares (both in the same $k units). */
export function eps(netIncome: number, sharesK: number): number {
  return netIncome / sharesK
}

/** One dollar amount spread over the pro-forma share count, i.e. its EPS effect. */
function perShare(amount: number, proFormaSharesK: number): number {
  return amount / proFormaSharesK
}

// --- Computed deal numbers ---

const INTEREST_AFTER_TAX = afterTaxInterest(NEW_DEBT, INTEREST_RATE_PCT, TAX_RATE_PCT) // 18,000
const PRO_FORMA_NET_INCOME = proFormaNetIncome(
  ACQUIRER_NET_INCOME,
  TARGET_NET_INCOME,
  SYNERGIES_AFTER_TAX,
  INTEREST_AFTER_TAX,
) // 118,500
const PRO_FORMA_SHARES_K = proFormaShares(ACQUIRER_SHARES_K, NEW_SHARES_ISSUED_K) // 85,000
const PRO_FORMA_EPS = eps(PRO_FORMA_NET_INCOME, PRO_FORMA_SHARES_K) // 1.394117647058824 ($1.39)

// Per-share adjustment bars, each a dollar amount divided by the pro-forma
// share count, rounded to cents. Their unrounded sum reconciles start to end
// exactly (it's the same formula split into parts); the rounded figures used
// as answers land within the task's 0.01 tolerance of that exact number.
const TARGET_EARNINGS_PER_SHARE = round2(perShare(TARGET_NET_INCOME, PRO_FORMA_SHARES_K)) // +0.41
const SYNERGIES_PER_SHARE = round2(perShare(SYNERGIES_AFTER_TAX, PRO_FORMA_SHARES_K)) // +0.14
const INTEREST_PER_SHARE = round2(-perShare(INTEREST_AFTER_TAX, PRO_FORMA_SHARES_K)) // -0.21
/** Diluting the acquirer's own earnings over the enlarged share count: 90,000 / 85,000 - 1.50. */
const DILUTION_PER_SHARE = round2(perShare(ACQUIRER_NET_INCOME, PRO_FORMA_SHARES_K) - ACQUIRER_EPS) // -0.44

const money = (n: number) => n.toLocaleString('en-US')

const MATH_LINE = `Pro-forma net income is $${money(ACQUIRER_NET_INCOME)}k (Palisade) + $${money(TARGET_NET_INCOME)}k (Brickhouse) + $${money(SYNERGIES_AFTER_TAX)}k (synergies) − $${money(INTEREST_AFTER_TAX)}k (after-tax interest on the new debt) = $${money(PRO_FORMA_NET_INCOME)}k, over ${money(PRO_FORMA_SHARES_K)}k pro-forma shares (${money(ACQUIRER_SHARES_K)}k existing + ${money(NEW_SHARES_ISSUED_K)}k newly issued) = $${PRO_FORMA_EPS.toFixed(2)} pro-forma EPS.`

const mission: Mission = {
  id: 'r5-accretion-dilution',
  rung: 5,
  order: 4,
  title: 'Accretive or dilutive?',
  tagline: 'Does this deal help earnings per share, or just help the bankers?',
  baseComp: 12_000,
  parSeconds: 200,
  lesson: {
    title: 'One deal, one EPS number',
    body:
      "EPS (earnings per share) is net income divided by shares outstanding. A deal is accretive when it raises the acquirer's EPS and dilutive when it lowers it — those words describe the effect on that number, not whether the deal is good. Palisade buys Brickhouse half in cash (funded by new debt costing $18,000k after tax) and half in newly issued Palisade stock. Pro-forma net income is $90,000k + $34,500k + $12,000k synergies − $18,000k interest = $118,500k, spread across 85,000k shares. EPS moves from $1.50 to $1.39: Brickhouse's earnings and the synergies help, but the new interest and, most of all, spreading Palisade's own earnings over more shares (dilution) hurt more. Net effect: dilutive.",
    visual: {
      kind: 'bullets',
      items: [
        'Acquirer EPS: $1.50',
        '+ Target earnings $0.41, + Synergies $0.14',
        '− After-tax interest $0.21, − Share dilution $0.44',
        '= Pro-forma EPS: $1.39 (dilutive)',
      ],
    },
  },
  task: {
    kind: 'bridge',
    prompt: "Bridge Palisade's standalone EPS to the pro-forma EPS after buying Brickhouse. Fill in every adjustment bar.",
    unit: '$',
    tolerance: 0.01,
    start: { label: 'Acquirer EPS', value: ACQUIRER_EPS, role: 'equity' },
    end: { label: 'Pro-forma EPS', value: PRO_FORMA_EPS, role: 'equity' },
    adjustments: [
      {
        id: 'targetEarnings',
        label: 'Target earnings',
        answer: TARGET_EARNINGS_PER_SHARE,
        role: 'revenue',
        hint: "Brickhouse's own net income, spread over the pro-forma share count",
      },
      {
        id: 'synergies',
        label: 'Synergies',
        answer: SYNERGIES_PER_SHARE,
        role: 'revenue',
        hint: 'Cost savings from combining the two companies, after tax',
      },
      {
        id: 'interest',
        label: 'After-tax interest',
        answer: INTEREST_PER_SHARE,
        role: 'debt',
        hint: 'Interest on the new acquisition debt, net of the tax shield',
      },
      {
        id: 'dilution',
        label: 'Share dilution',
        answer: DILUTION_PER_SHARE,
        role: 'cost',
        hint: "Palisade's own earnings, now spread over more shares outstanding",
      },
    ],
  },
  grade(answer) {
    if (answer.kind !== 'bridge') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'bridge') throw new Error('wrong task kind')
    return gradeBridge(mission.task, answer, ({ accuracy, wrongIds, sum }) => {
      if (accuracy === 1) {
        return {
          verdict: 'Accretion math clean. The MD almost smiles.',
          explanation: `${MATH_LINE} EPS falls from $1.50 to $${PRO_FORMA_EPS.toFixed(2)} — this deal is dilutive.`,
        }
      }
      if (accuracy === 0) {
        return {
          verdict: mdVerdict(0, 'r5-accretion-dilution'),
          explanation: `None of the bars landed. Target earnings should be +$${TARGET_EARNINGS_PER_SHARE.toFixed(2)} (Brickhouse's net income spread over the pro-forma shares), synergies +$${SYNERGIES_PER_SHARE.toFixed(2)}, after-tax interest −$${Math.abs(INTEREST_PER_SHARE).toFixed(2)} (the new debt's cost, net of the tax shield), and share dilution −$${Math.abs(DILUTION_PER_SHARE).toFixed(2)} (Palisade's own earnings spread over more shares). ${MATH_LINE} EPS falls from $1.50 to $${PRO_FORMA_EPS.toFixed(2)} — dilutive.`,
        }
      }
      const hints: string[] = []
      if (wrongIds.includes('targetEarnings'))
        hints.push(`Target earnings should be +$${TARGET_EARNINGS_PER_SHARE.toFixed(2)}: Brickhouse's $${money(TARGET_NET_INCOME)}k net income spread over ${money(PRO_FORMA_SHARES_K)}k pro-forma shares.`)
      if (wrongIds.includes('synergies'))
        hints.push(`Synergies should be +$${SYNERGIES_PER_SHARE.toFixed(2)}: $${money(SYNERGIES_AFTER_TAX)}k of after-tax cost savings, spread the same way.`)
      if (wrongIds.includes('interest'))
        hints.push(`After-tax interest should be −$${Math.abs(INTEREST_PER_SHARE).toFixed(2)}: the new $${money(NEW_DEBT)}k of debt costs $${money(INTEREST_AFTER_TAX)}k a year after the tax shield.`)
      if (wrongIds.includes('dilution'))
        hints.push(`Share dilution should be −$${Math.abs(DILUTION_PER_SHARE).toFixed(2)}: Palisade's own $${money(ACQUIRER_NET_INCOME)}k of earnings, now spread over ${money(NEW_SHARES_ISSUED_K)}k more shares.`)
      if (wrongIds.includes('reconcile')) {
        hints.push(`Separately: your bars sum to $${sum.toFixed(2)}, not the pro-forma EPS of $${PRO_FORMA_EPS.toFixed(2)} — one of the adjustments above is off.`)
      } else {
        hints.push(`Separately, the bars do reconcile to $${PRO_FORMA_EPS.toFixed(2)} — the arithmetic just landed on the wrong line.`)
      }
      return {
        verdict: mdVerdict(accuracy, 'r5-accretion-dilution'),
        explanation: hints.join(' '),
      }
    })
  },
}

export default mission
