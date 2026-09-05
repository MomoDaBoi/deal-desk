import type { BalanceTask, Mission } from '../engine/types'
import { gradeBalance } from '../engine/graders/balance'
import { mdVerdict } from '../engine/voice'

/**
 * Rung 5, mission 2. The sources & uses table for a leveraged buyout. Uses
 * are what the money buys (purchase price + fees); sources are where the
 * money comes from (new debt, cash already on the balance sheet, and the
 * sponsor equity plug). The two sides must always tie, so the mission
 * grades two things: are the individual blanks right, and does the
 * player's own arithmetic actually tie sources to uses. All figures are in
 * $k, per PLAN.md section (d), row `r5-sources-uses`.
 */

const EBITDA = 96_000
const DEBT_MULTIPLE = 5.0
const PURCHASE_PRICE = 800_000
const CASH = 40_000
/** Anchor: total sources is given, so total uses must equal it for the deal to tie. */
const TOTAL_SOURCES = 830_000

/** New debt is sized as a multiple of EBITDA — the standard LBO debt-sizing convention. */
function computeNewDebt(ebitda: number, multiple: number): number {
  return ebitda * multiple
}

/** Total uses must tie to total sources — every dollar spent comes from somewhere. */
function computeTotalUses(totalSources: number): number {
  return totalSources
}

/** Fees are the plug between total uses and the purchase price. */
function computeFees(totalUses: number, purchasePrice: number): number {
  return totalUses - purchasePrice
}

/** Sponsor equity is the plug: whatever total sources needs beyond debt and cash. */
function computeSponsorEquity(totalSources: number, newDebt: number, cash: number): number {
  return totalSources - newDebt - cash
}

const NEW_DEBT = computeNewDebt(EBITDA, DEBT_MULTIPLE) // 480,000
const TOTAL_USES = computeTotalUses(TOTAL_SOURCES) // 830,000
const FEES = computeFees(TOTAL_USES, PURCHASE_PRICE) // 30,000
const SPONSOR_EQUITY = computeSponsorEquity(TOTAL_SOURCES, NEW_DEBT, CASH) // 310,000

const money = (n: number) => n.toLocaleString('en-US')

const NEW_DEBT_LINE = `New debt is sized at ${DEBT_MULTIPLE.toFixed(1)}x EBITDA: ${DEBT_MULTIPLE.toFixed(1)} × $${money(EBITDA)}k = $${money(NEW_DEBT)}k.`
const TOTAL_USES_LINE = `Total uses must tie to total sources: $${money(TOTAL_SOURCES)}k.`
const FEES_LINE = `Fees are the plug between total uses and the purchase price: $${money(TOTAL_USES)}k − $${money(PURCHASE_PRICE)}k = $${money(FEES)}k.`
const SPONSOR_EQUITY_LINE = `Sponsor equity is the plug: total sources $${money(TOTAL_SOURCES)}k − new debt $${money(NEW_DEBT)}k − cash $${money(CASH)}k = $${money(SPONSOR_EQUITY)}k.`

/**
 * Sum of the player's own typed source blanks plus known cash, vs. the sum
 * of the player's own typed uses blanks (purchase price plus their typed
 * fees) — not the typed total-uses line itself, so a wrong total-uses entry
 * can't confirm a tie the player's own uses column doesn't actually have.
 */
function tieCheck(values: Record<string, number | null>): { ok: boolean; sumSources: number; sumUses: number } {
  const newDebt = values['new-debt']
  const sponsorEquity = values['sponsor-equity']
  const fees = values['fees']
  const totalUses = values['total-uses']
  const sumSources = (newDebt ?? 0) + CASH + (sponsorEquity ?? 0)
  const sumUses = PURCHASE_PRICE + (fees ?? 0)
  const ok =
    newDebt != null &&
    sponsorEquity != null &&
    fees != null &&
    totalUses != null &&
    sumSources === sumUses &&
    totalUses === sumUses
  return { ok, sumSources, sumUses }
}

function tieLine(check: ReturnType<typeof tieCheck>): string {
  if (check.ok) return `Your sources ($${money(check.sumSources)}k) tie to your uses ($${money(check.sumUses)}k).`
  const diff = check.sumSources - check.sumUses
  const side = diff > 0 ? 'sources' : 'uses'
  return `Your sources ($${money(check.sumSources)}k) and uses ($${money(check.sumUses)}k) do not tie — ${side} is off by $${money(Math.abs(diff))}k.`
}

const task: BalanceTask = {
  kind: 'balance',
  prompt:
    "Fill in the LBO sources & uses table for the deal. Every dollar spent has to come from somewhere — both sides must tie to $830,000k.",
  unit: '$k',
  tolerance: 0,
  sections: [
    {
      id: 'uses',
      label: 'Uses',
      role: 'cost',
      lines: [
        { id: 'purchase-price', label: 'Purchase price', value: PURCHASE_PRICE },
        { id: 'fees', label: 'Transaction fees', answer: FEES, note: 'Total uses minus purchase price' },
        { id: 'total-uses', label: 'Total uses', answer: TOTAL_USES, total: true, note: 'Must tie to total sources' },
      ],
    },
    {
      id: 'sources',
      label: 'Sources',
      role: 'debt',
      lines: [
        {
          id: 'new-debt',
          label: 'New debt (5.0x EBITDA of $96,000k)',
          answer: NEW_DEBT,
          note: '5.0x EBITDA of $96,000k',
        },
        { id: 'cash', label: 'Cash on the balance sheet', value: CASH },
        { id: 'sponsor-equity', label: 'Sponsor equity', answer: SPONSOR_EQUITY, note: 'The plug: total sources minus debt minus cash' },
        { id: 'total-sources', label: 'Total sources', value: TOTAL_SOURCES, total: true },
      ],
    },
  ],
}

const mission: Mission = {
  id: 'r5-sources-uses',
  rung: 5,
  order: 2,
  title: 'Sources and uses',
  tagline: 'Every dollar spent has to come from somewhere.',
  baseComp: 11_000,
  parSeconds: 200,
  lesson: {
    title: 'Sources and uses must tie',
    body:
      "A sources & uses table is a deal's one-page ledger of where money goes and comes from. Uses: the purchase price (what the buyer pays the seller) plus fees (legal, advisory, financing costs). Sources: new debt, usually sized as a multiple of EBITDA (earnings before interest, taxes, depreciation and amortization — a proxy for the cash flow lenders will lend against); cash already on the balance sheet; and sponsor equity, the private-equity buyer's own cash and the plug that makes both sides match. Total sources must always equal total uses — every dollar spent came from somewhere. Size the debt first, then solve for the equity plug last.",
    visual: {
      kind: 'bullets',
      items: [
        'Uses: purchase price + fees',
        'Sources: new debt + cash + sponsor equity',
        'Both sides must tie to the same total',
      ],
    },
  },
  task,
  grade(answer) {
    if (answer.kind !== 'balance') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'balance') throw new Error('wrong task kind')
    const balanceTask = mission.task

    let balanceAccuracy = 0
    let wrongIds: string[] = []
    gradeBalance(balanceTask, answer, (ctx) => {
      balanceAccuracy = ctx.accuracy
      wrongIds = ctx.wrongIds
      return { verdict: '', explanation: '' }
    })

    const check = tieCheck(answer.values)
    const tieScore = check.ok ? 1 : 0
    const accuracy = 0.75 * balanceAccuracy + 0.25 * tieScore

    if (balanceAccuracy === 1 && check.ok) {
      return {
        accuracy: 1,
        verdict: mdVerdict(1, mission.id),
        explanation: `${NEW_DEBT_LINE} ${TOTAL_USES_LINE} ${FEES_LINE} ${SPONSOR_EQUITY_LINE} ${tieLine(check)}`,
      }
    }

    if (balanceAccuracy === 0) {
      return {
        accuracy,
        verdict: mdVerdict(accuracy, mission.id),
        explanation: `Nothing lined up. ${NEW_DEBT_LINE} ${TOTAL_USES_LINE} ${FEES_LINE} ${SPONSOR_EQUITY_LINE} ${tieLine(check)}`,
      }
    }

    const hints: string[] = []
    if (wrongIds.includes('new-debt')) hints.push(NEW_DEBT_LINE)
    if (wrongIds.includes('total-uses')) hints.push(TOTAL_USES_LINE)
    if (wrongIds.includes('fees')) hints.push(FEES_LINE)
    if (wrongIds.includes('sponsor-equity')) hints.push(SPONSOR_EQUITY_LINE)
    hints.push(tieLine(check))

    return {
      accuracy,
      verdict: mdVerdict(accuracy, mission.id),
      explanation: hints.join(' '),
    }
  },
}

export default mission
