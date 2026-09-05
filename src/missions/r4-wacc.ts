import type { Mission } from '../engine/types'
import { gradeBalance } from '../engine/graders/balance'
import { mdVerdict } from '../engine/voice'
import { BRICKHOUSE } from './companies'

/**
 * Rung 4, mission 2. WACC (weighted average cost of capital) is the blended
 * rate a company pays for every dollar of money it uses, whether that
 * dollar came from shareholders or lenders. Figures reuse Brickhouse
 * Industrial's bible entry (src/missions/companies.ts): its market cap
 * doubles as "equity value" and its total debt as "debt" for the capital
 * structure weights, so the mission and the bible can never drift apart.
 */

const COST_OF_EQUITY_PCT = 10.0
const PRETAX_COST_OF_DEBT_PCT = 6.0
const TAX_RATE_PCT = 25
const EQUITY_VALUE = BRICKHOUSE.market!.marketCap // 580,000
const DEBT = BRICKHOUSE.balance!.totalDebt // 260,000

/** Round to 2 decimal places, the precision the answer blanks are graded to. */
function round2(x: number): number {
  return Math.round(x * 100) / 100
}

/** Pre-tax cost of debt, minus the tax shield: lenders' interest is tax-deductible. */
function afterTaxCostOfDebt(pretaxPct: number, taxRatePct: number): number {
  return round2(pretaxPct * (1 - taxRatePct / 100))
}

/** Capital-structure weight of one side of the balance sheet. */
function weight(part: number, whole: number): number {
  return part / whole
}

/** WACC = equity weight × cost of equity + debt weight × after-tax cost of debt. */
function wacc(costOfEquityPct: number, afterTaxDebtPct: number, equity: number, debt: number): number {
  const total = equity + debt
  return round2(weight(equity, total) * costOfEquityPct + weight(debt, total) * afterTaxDebtPct)
}

const AFTER_TAX_COST_OF_DEBT = afterTaxCostOfDebt(PRETAX_COST_OF_DEBT_PCT, TAX_RATE_PCT) // 4.5
const WACC_PCT = wacc(COST_OF_EQUITY_PCT, AFTER_TAX_COST_OF_DEBT, EQUITY_VALUE, DEBT) // 8.3
/** The common slip: blending in the pre-tax cost of debt and forgetting the tax shield entirely. */
const WACC_NO_TAX_SHIELD = wacc(COST_OF_EQUITY_PCT, PRETAX_COST_OF_DEBT_PCT, EQUITY_VALUE, DEBT) // 8.76

const money = (n: number) => n.toLocaleString('en-US')
const TOTAL_CAPITAL = EQUITY_VALUE + DEBT
const EQUITY_WEIGHT_PCT = round2(weight(EQUITY_VALUE, TOTAL_CAPITAL) * 100) // 69.05
const DEBT_WEIGHT_PCT = round2(weight(DEBT, TOTAL_CAPITAL) * 100) // 30.95

const AFTER_TAX_LINE = `After-tax cost of debt is the pre-tax rate times (1 − tax rate): ${PRETAX_COST_OF_DEBT_PCT.toFixed(1)}% × (1 − ${TAX_RATE_PCT}%) = ${AFTER_TAX_COST_OF_DEBT.toFixed(2)}%.`

const WACC_LINE = `WACC blends the two costs by how much of the $${money(TOTAL_CAPITAL)}k capital structure each provides: equity is $${money(EQUITY_VALUE)}k (${EQUITY_WEIGHT_PCT.toFixed(2)}%) and debt is $${money(DEBT)}k (${DEBT_WEIGHT_PCT.toFixed(2)}%). WACC = ${EQUITY_WEIGHT_PCT.toFixed(2)}% × ${COST_OF_EQUITY_PCT.toFixed(1)}% + ${DEBT_WEIGHT_PCT.toFixed(2)}% × ${AFTER_TAX_COST_OF_DEBT.toFixed(2)}% = ${WACC_PCT.toFixed(2)}%. Skip the tax shield and blend in the raw ${PRETAX_COST_OF_DEBT_PCT.toFixed(1)}% instead, and WACC comes out too high, at ${WACC_NO_TAX_SHIELD.toFixed(2)}%.`

const mission: Mission = {
  id: 'r4-wacc',
  rung: 4,
  order: 2,
  title: 'The price of money',
  tagline: 'Every dollar on the balance sheet has a cost. WACC is the average of all of them.',
  baseComp: 9_000,
  parSeconds: 180,
  lesson: {
    title: 'WACC: the blended rate a company pays for capital',
    body:
      'WACC (weighted average cost of capital) is the blended rate a company pays for every dollar it uses, whether it came from shareholders or lenders. Cost of equity is the return shareholders demand for the risk of owning the stock. Cost of debt is the interest rate lenders charge. Debt is cheaper than it looks: interest is tax-deductible, so part of it is subsidized by the tax shield — multiply the pre-tax cost of debt by (1 − tax rate) first. Then weight each cost by its share of total capital (equity value plus debt) and add them. Forget the tax shield and WACC comes out too high, understating value in every DCF built on it.',
    visual: {
      kind: 'bars',
      unit: '%',
      items: [
        { label: 'Cost of equity', value: COST_OF_EQUITY_PCT, role: 'equity' },
        { label: 'After-tax cost of debt', value: AFTER_TAX_COST_OF_DEBT, role: 'debt' },
        { label: 'WACC', value: WACC_PCT, role: 'neutral' },
      ],
    },
  },
  task: {
    kind: 'balance',
    prompt:
      "Brickhouse Industrial's capital structure and cost of capital. Apply the tax shield to debt, then blend both costs by their weight in the $840,000k capital structure.",
    unit: '%',
    tolerance: 0.05,
    sections: [
      {
        id: 'inputs',
        label: 'Inputs',
        role: 'neutral',
        lines: [
          { id: 'cost-of-equity', label: 'Cost of equity', value: COST_OF_EQUITY_PCT, unit: '%' },
          { id: 'pretax-cost-of-debt', label: 'Pre-tax cost of debt', value: PRETAX_COST_OF_DEBT_PCT, unit: '%' },
          { id: 'tax-rate', label: 'Tax rate', value: TAX_RATE_PCT, unit: '%' },
          { id: 'equity-value', label: 'Equity value', value: EQUITY_VALUE, unit: '$k' },
          { id: 'debt', label: 'Debt', value: DEBT, unit: '$k' },
        ],
      },
      {
        id: 'answers',
        label: 'Cost of capital',
        role: 'neutral',
        lines: [
          {
            id: 'after-tax-cost-of-debt',
            label: 'After-tax cost of debt',
            answer: AFTER_TAX_COST_OF_DEBT,
            note: 'Pre-tax cost of debt × (1 − tax rate)',
          },
          {
            id: 'wacc',
            label: 'WACC',
            answer: WACC_PCT,
            total: true,
            note: 'Equity weight × cost of equity + debt weight × after-tax cost of debt',
          },
        ],
      },
    ],
  },
  grade(answer) {
    if (answer.kind !== 'balance') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'balance') throw new Error('wrong task kind')
    return gradeBalance(mission.task, answer, ({ accuracy, wrongIds }) => {
      if (accuracy === 1) {
        return {
          verdict: mdVerdict(accuracy, mission.id),
          explanation: `${AFTER_TAX_LINE} ${WACC_LINE} Both blanks landed exactly on the price of Brickhouse's money.`,
        }
      }
      if (accuracy === 0) {
        return {
          verdict: mdVerdict(accuracy, mission.id),
          explanation: `Neither blank landed. ${AFTER_TAX_LINE} ${WACC_LINE}`,
        }
      }
      const hints: string[] = []
      if (wrongIds.includes('after-tax-cost-of-debt')) hints.push(AFTER_TAX_LINE)
      if (wrongIds.includes('wacc')) hints.push(WACC_LINE)
      return {
        verdict: mdVerdict(accuracy, mission.id),
        explanation: hints.join(' '),
      }
    })
  },
}

export default mission
