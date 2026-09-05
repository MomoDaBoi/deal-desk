/**
 * Pure XBRL companyfacts extraction. No DOM types, no fetch, no
 * localStorage — this file is imported by both `src/lib/edgar.ts` (the
 * browser/lib side) and copied by hand into `scripts/fetch-edgar.mjs` (a
 * plain Node script that cannot import .ts files). Keep the two in sync;
 * the script has a comment pointing back here.
 *
 * See PLAN.md section (h) for the endpoint shape, the tag priority lists,
 * and the "latest end, then latest filed within that end" rule.
 */

/** One reported value for an XBRL concept, as SEC companyfacts returns it. */
export interface XbrlFact {
  start?: string
  end: string
  val: number
  accn?: string
  fy?: number
  fp?: string
  form?: string
  filed?: string
  frame?: string
}

/** `facts.<taxonomy>.<tag>` in a companyfacts document. */
export interface XbrlConcept {
  label?: string
  description?: string
  units: Record<string, XbrlFact[]>
}

/** The shape of `GET .../companyfacts/CIK##########.json` that we read. */
export interface XbrlCompanyFacts {
  cik?: number
  entityName?: string
  facts?: {
    dei?: Record<string, XbrlConcept>
    'us-gaap'?: Record<string, XbrlConcept>
  }
}

/**
 * Pick the fact to use out of one concept's one unit's fact list: filter to
 * 10-K annual rows, take the latest `end`, and within that `end` take the
 * latest `filed` (the same period gets restated across filings).
 *
 * `requireFp` is true for ordinary financial-statement tags (`form ===
 * '10-K' && fp === 'FY'`). Pass `false` for `dei` cover-page facts (share
 * count, public float) — PLAN.md (h) calls these out separately because
 * their `fp` is not reliably `'FY'` even though they still ride along on
 * the annual filing, so only `form === '10-K'` is required.
 */
export function pickLatestFact(facts: XbrlFact[], requireFp: boolean): XbrlFact | null {
  const candidates = facts.filter((f) => f.form === '10-K' && (!requireFp || f.fp === 'FY'))
  if (candidates.length === 0) return null

  let best: XbrlFact | null = null
  for (const f of candidates) {
    if (!best) {
      best = f
      continue
    }
    if (f.end > best.end) {
      best = f
    } else if (f.end === best.end && (f.filed ?? '') > (best.filed ?? '')) {
      best = f
    }
  }
  return best
}

/**
 * Resolve one tag on one taxonomy to its latest 10-K value, trying every
 * unit the concept reports under (companyfacts keys facts by unit, e.g.
 * `USD` or `shares`, and we don't know which up front).
 */
export function pickLatestConceptValue(concept: XbrlConcept | undefined, requireFp: boolean): number | null {
  if (!concept?.units) return null
  let best: XbrlFact | null = null
  for (const unitFacts of Object.values(concept.units)) {
    const candidate = pickLatestFact(unitFacts, requireFp)
    if (!candidate) continue
    if (!best || candidate.end > best.end || (candidate.end === best.end && (candidate.filed ?? '') > (best.filed ?? ''))) {
      best = candidate
    }
  }
  return best ? best.val : null
}

/** Same as {@link pickLatestConceptValue} but also returns the fact used, for `fiscalYear`/`periodEnd`. */
export function pickLatestConceptFact(concept: XbrlConcept | undefined, requireFp: boolean): XbrlFact | null {
  if (!concept?.units) return null
  let best: XbrlFact | null = null
  for (const unitFacts of Object.values(concept.units)) {
    const candidate = pickLatestFact(unitFacts, requireFp)
    if (!candidate) continue
    if (!best || candidate.end > best.end || (candidate.end === best.end && (candidate.filed ?? '') > (best.filed ?? ''))) {
      best = candidate
    }
  }
  return best
}

/** Try a list of tags, in priority order, on one taxonomy; return the first that resolves. */
export function firstAvailable(
  taxonomyFacts: Record<string, XbrlConcept> | undefined,
  tags: string[],
  requireFp: boolean,
): number | null {
  if (!taxonomyFacts) return null
  for (const tag of tags) {
    const value = pickLatestConceptValue(taxonomyFacts[tag], requireFp)
    if (value !== null) return value
  }
  return null
}

/** Try a list of tags and return the underlying fact (for period metadata), not just the value. */
export function firstAvailableFact(
  taxonomyFacts: Record<string, XbrlConcept> | undefined,
  tags: string[],
  requireFp: boolean,
): XbrlFact | null {
  if (!taxonomyFacts) return null
  for (const tag of tags) {
    const fact = pickLatestConceptFact(taxonomyFacts[tag], requireFp)
    if (fact) return fact
  }
  return null
}

/** Tag priority lists from PLAN.md section (h). */
export const TAGS = {
  revenue: ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet'],
  ebit: ['OperatingIncomeLoss'],
  da: ['DepreciationDepletionAndAmortization', 'DepreciationAmortizationAndAccretionNet', 'DepreciationAndAmortization'],
  netIncome: ['NetIncomeLoss'],
  cash: ['CashAndCashEquivalentsAtCarryingValue'],
  shortTermInvestments: ['ShortTermInvestments'],
  debtNoncurrent: ['LongTermDebtNoncurrent'],
  debtCurrent: ['LongTermDebtCurrent'],
  debtFallback: ['LongTermDebt'],
  sharesDei: ['EntityCommonStockSharesOutstanding'],
  sharesGaap: ['CommonStockSharesOutstanding'],
  totalAssets: ['Assets'],
  equity: ['StockholdersEquity'],
  publicFloat: ['EntityPublicFloat'],
} as const

/** The ~15 fields the game reads per company. Every field is `number | null`. */
export interface ExtractedFields {
  fiscalYear: number | null
  periodEnd: string | null
  revenue: number | null
  ebit: number | null
  da: number | null
  netIncome: number | null
  cash: number | null
  shortTermInvestments: number | null
  debt: number | null
  shares: number | null
  totalAssets: number | null
  equity: number | null
  publicFloat: number | null
}

/**
 * Extract every field this game cares about from one companyfacts
 * document. Debt sums `LongTermDebtNoncurrent + LongTermDebtCurrent` when
 * either is present, falling back to `LongTermDebt` only when neither is
 * reported. `fiscalYear`/`periodEnd` come from whichever of
 * revenue/ebit/netIncome resolved first (in that order) — the most
 * reliable anchor for "the annual period this snapshot represents".
 */
export function extractFields(doc: XbrlCompanyFacts): ExtractedFields {
  const gaap = doc.facts?.['us-gaap']
  const dei = doc.facts?.dei

  const revenue = firstAvailable(gaap, [...TAGS.revenue], true)
  const ebit = firstAvailable(gaap, [...TAGS.ebit], true)
  const da = firstAvailable(gaap, [...TAGS.da], true)
  const netIncome = firstAvailable(gaap, [...TAGS.netIncome], true)
  const cash = firstAvailable(gaap, [...TAGS.cash], true)
  const shortTermInvestments = firstAvailable(gaap, [...TAGS.shortTermInvestments], true)

  const debtNoncurrent = firstAvailable(gaap, [...TAGS.debtNoncurrent], true)
  const debtCurrent = firstAvailable(gaap, [...TAGS.debtCurrent], true)
  const debt =
    debtNoncurrent !== null || debtCurrent !== null
      ? (debtNoncurrent ?? 0) + (debtCurrent ?? 0)
      : firstAvailable(gaap, [...TAGS.debtFallback], true)

  const sharesDei = firstAvailable(dei, [...TAGS.sharesDei], false)
  const shares = sharesDei !== null ? sharesDei : firstAvailable(gaap, [...TAGS.sharesGaap], true)

  const totalAssets = firstAvailable(gaap, [...TAGS.totalAssets], true)
  const equity = firstAvailable(gaap, [...TAGS.equity], true)
  const publicFloat = firstAvailable(dei, [...TAGS.publicFloat], false)

  const anchor =
    firstAvailableFact(gaap, [...TAGS.revenue], true) ??
    firstAvailableFact(gaap, [...TAGS.ebit], true) ??
    firstAvailableFact(gaap, [...TAGS.netIncome], true)

  return {
    fiscalYear: anchor?.fy ?? null,
    periodEnd: anchor?.end ?? null,
    revenue,
    ebit,
    da,
    netIncome,
    cash,
    shortTermInvestments,
    debt,
    shares,
    totalAssets,
    equity,
    publicFloat,
  }
}
