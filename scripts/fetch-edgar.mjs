#!/usr/bin/env node
/**
 * Build-time snapshot fetcher for the EDGAR integration. Run by hand, not
 * in CI — see PLAN.md section (h) for why (SEC's companyfacts endpoint has
 * no CORS, so a static site cannot fetch it live; this script bundles a
 * snapshot into src/data/edgar-snapshot.json instead).
 *
 * Usage:
 *   DEAL_DESK_CONTACT="<contact address>" node scripts/fetch-edgar.mjs
 *
 * DEAL_DESK_CONTACT must be a real way to reach the requester (SEC's fair
 * access policy requires a descriptive User-Agent with contact info). It
 * is read from the environment only — never hardcode it, never commit it.
 *
 * Node 20+, ESM, no dependencies (uses the global `fetch`).
 */

// ---------------------------------------------------------------------
// Extraction logic below is a hand-copied, plain-JS mirror of
// src/lib/edgar-extract.ts. This script cannot import .ts files (it runs
// under plain Node, not the Vite/TS toolchain), so the two are kept in
// sync by hand. If you change one, change the other. Only the language
// differs; the algorithm must not.
// ---------------------------------------------------------------------

/** @param {Array<any>} facts @param {boolean} requireFp */
function pickLatestFact(facts, requireFp) {
  const candidates = facts.filter((f) => f.form === '10-K' && (!requireFp || f.fp === 'FY'))
  if (candidates.length === 0) return null
  let best = null
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

/** @param {any} concept @param {boolean} requireFp */
function pickLatestConceptFact(concept, requireFp) {
  if (!concept?.units) return null
  let best = null
  for (const unitFacts of Object.values(concept.units)) {
    const candidate = pickLatestFact(unitFacts, requireFp)
    if (!candidate) continue
    if (!best || candidate.end > best.end || (candidate.end === best.end && (candidate.filed ?? '') > (best.filed ?? ''))) {
      best = candidate
    }
  }
  return best
}

/** @param {any} concept @param {boolean} requireFp */
function pickLatestConceptValue(concept, requireFp) {
  const fact = pickLatestConceptFact(concept, requireFp)
  return fact ? fact.val : null
}

/** @param {Record<string, any> | undefined} taxonomyFacts @param {string[]} tags @param {boolean} requireFp */
function firstAvailable(taxonomyFacts, tags, requireFp) {
  if (!taxonomyFacts) return null
  for (const tag of tags) {
    const value = pickLatestConceptValue(taxonomyFacts[tag], requireFp)
    if (value !== null) return value
  }
  return null
}

/** @param {Record<string, any> | undefined} taxonomyFacts @param {string[]} tags @param {boolean} requireFp */
function firstAvailableFact(taxonomyFacts, tags, requireFp) {
  if (!taxonomyFacts) return null
  for (const tag of tags) {
    const fact = pickLatestConceptFact(taxonomyFacts[tag], requireFp)
    if (fact) return fact
  }
  return null
}

const TAGS = {
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
}

/** @param {any} doc */
function extractFields(doc) {
  const gaap = doc.facts?.['us-gaap']
  const dei = doc.facts?.dei

  const revenue = firstAvailable(gaap, TAGS.revenue, true)
  const ebit = firstAvailable(gaap, TAGS.ebit, true)
  const da = firstAvailable(gaap, TAGS.da, true)
  const netIncome = firstAvailable(gaap, TAGS.netIncome, true)
  const cash = firstAvailable(gaap, TAGS.cash, true)
  const shortTermInvestments = firstAvailable(gaap, TAGS.shortTermInvestments, true)

  const debtNoncurrent = firstAvailable(gaap, TAGS.debtNoncurrent, true)
  const debtCurrent = firstAvailable(gaap, TAGS.debtCurrent, true)
  const debt =
    debtNoncurrent !== null || debtCurrent !== null
      ? (debtNoncurrent ?? 0) + (debtCurrent ?? 0)
      : firstAvailable(gaap, TAGS.debtFallback, true)

  const sharesDei = firstAvailable(dei, TAGS.sharesDei, false)
  const shares = sharesDei !== null ? sharesDei : firstAvailable(gaap, TAGS.sharesGaap, true)

  const totalAssets = firstAvailable(gaap, TAGS.totalAssets, true)
  const equity = firstAvailable(gaap, TAGS.equity, true)
  const publicFloat = firstAvailable(dei, TAGS.publicFloat, false)

  const anchor =
    firstAvailableFact(gaap, TAGS.revenue, true) ??
    firstAvailableFact(gaap, TAGS.ebit, true) ??
    firstAvailableFact(gaap, TAGS.netIncome, true)

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

// ---------------------------------------------------------------------
// End of copied extraction logic.
// ---------------------------------------------------------------------

/** Curated ticker list, CIKs verified against SEC. PLAN.md section (h). */
const COMPANIES = [
  { ticker: 'AAPL', cik: '0000320193', name: 'Apple Inc.' },
  { ticker: 'MSFT', cik: '0000789019', name: 'Microsoft Corp' },
  { ticker: 'KO', cik: '0000021344', name: 'Coca-Cola Co' },
  { ticker: 'PEP', cik: '0000077476', name: 'PepsiCo Inc' },
  { ticker: 'PG', cik: '0000080424', name: 'Procter & Gamble Co' },
  { ticker: 'COST', cik: '0000909832', name: 'Costco Wholesale Corp' },
  { ticker: 'HD', cik: '0000354950', name: 'Home Depot, Inc.' },
  { ticker: 'CAT', cik: '0000018230', name: 'Caterpillar Inc' },
  { ticker: 'DE', cik: '0000315189', name: 'Deere & Co' },
  { ticker: 'UNP', cik: '0000100885', name: 'Union Pacific Corp' },
]

const PAUSE_MS = 150

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fmtCompact(n) {
  if (n === null || n === undefined) return 'n/a'
  const abs = Math.abs(n)
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  return String(n)
}

async function main() {
  const contact = process.env.DEAL_DESK_CONTACT
  if (!contact) {
    console.error(
      'DEAL_DESK_CONTACT is not set. SEC requires a descriptive User-Agent with contact info.\n' +
        'Run: DEAL_DESK_CONTACT="<contact address>" node scripts/fetch-edgar.mjs',
    )
    process.exit(1)
  }

  const userAgent = `deal-desk (${contact})`
  const results = []

  for (const company of COMPANIES) {
    const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${company.cik}.json`
    let res
    try {
      res = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept-Encoding': 'gzip, deflate',
        },
      })
    } catch (err) {
      throw new Error(`Network error fetching ${company.ticker} (${url}): ${err instanceof Error ? err.message : String(err)}`)
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} fetching ${company.ticker} (${url})`)
    }

    const doc = await res.json()
    const fields = extractFields(doc)

    results.push({
      ticker: company.ticker,
      cik: company.cik,
      name: company.name,
      ...fields,
    })

    console.log(
      `${company.ticker.padEnd(5)} FY${fields.fiscalYear ?? '?'} (${fields.periodEnd ?? '?'})  ` +
        `revenue=${fmtCompact(fields.revenue)} ebit=${fmtCompact(fields.ebit)} da=${fmtCompact(fields.da)} ` +
        `netIncome=${fmtCompact(fields.netIncome)} cash=${fmtCompact(fields.cash)} debt=${fmtCompact(fields.debt)} ` +
        `shares=${fmtCompact(fields.shares)} publicFloat=${fmtCompact(fields.publicFloat)}`,
    )

    await sleep(PAUSE_MS)
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    source: 'SEC EDGAR companyfacts',
    note: 'EBITDA is EBIT + D&A, a proxy',
    companies: results,
  }

  const outPath = new URL('../src/data/edgar-snapshot.json', import.meta.url)
  const json = JSON.stringify(snapshot, null, 2)
  const { writeFile } = await import('node:fs/promises')
  await writeFile(outPath, json + '\n', 'utf-8')

  const sizeKb = (Buffer.byteLength(json, 'utf-8') / 1024).toFixed(1)
  console.log(`\nWrote src/data/edgar-snapshot.json (${sizeKb} KB)`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
