/**
 * The fictional company bible, typed. Source of truth: PLAN.md section (c),
 * "Fictional company bible". All figures are in thousands of dollars ($k)
 * unless a field says otherwise (share `price` is dollars per share).
 *
 * Missions must read numbers from here, never re-type them, so a mission and
 * its tests always agree with the bible.
 */

/** One year of the income statement. */
export interface IncomeStatement {
  revenue: number
  cogs: number
  grossProfit: number
  /** Total operating expenses, when the bible does not split them out. */
  opex?: number
  /** Sales & marketing (or the whole SG&A line, when not split further). */
  sga?: number
  /** Research & development. */
  rnd?: number
  /** General & administrative. */
  gna?: number
  /** Depreciation & amortisation. */
  da?: number
  /**
   * True when `da` is already folded into `opex`/`sga` above (Pucker Up's
   * income statement shows EBIT after D&A but never lists D&A as its own
   * line — it only surfaces on the cash flow statement). When true, EBIT
   * must NOT subtract `da` a second time; EBITDA still adds it back.
   */
  daEmbeddedInOpex?: boolean
  ebit: number
  ebitda: number
  interest: number
  taxes: number
  netIncome: number
}

/** Prior-year comparatives, only as far as the bible gives them. */
export interface PriorYear {
  revenue: number
  /** Omitted where the bible states prior-year revenue but not gross profit (Brickhouse, Nan's Pantry). */
  grossProfit?: number
}

/** A snapshot balance sheet. Only Pucker Up's bible entry is complete enough to check assets = liabilities + equity. */
export interface BalanceSheet {
  cash: number
  receivables?: number
  inventory?: number
  ppe?: number
  totalAssets?: number
  payables?: number
  shortTermDebt?: number
  longTermDebt?: number
  totalDebt: number
  totalLiabilities?: number
  equity?: number
}

/** Public-market data. Absent for Pucker Up, which the bible never prices. */
export interface MarketData {
  sharesK: number
  /** Dollars per share. */
  price: number
  marketCap: number
  netDebt: number
  ev: number
  evRevenue: number
  evEbitda: number
  pe: number
}

/** Pucker Up's cash flow statement (the only company the bible gives one for). */
export interface CashFlowStatement {
  netIncome: number
  depreciation: number
  changeInWorkingCapital: number
  cashFromOperations: number
  capex: number
  cashFromInvesting: number
  debtRepayment: number
  dividends: number
  cashFromFinancing: number
  netChangeInCash: number
  openingCash: number
  closingCash: number
}

export interface Company {
  name: string
  tagline: string
  fiscalYear: number
  income: IncomeStatement
  priorYear?: PriorYear
  balance?: BalanceSheet
  market?: MarketData
  cashFlow?: CashFlowStatement
}

/** A listed peer used for comp-set (comparable company) analysis. Fields are optional because the bible gives a full profile for industrial peers but only an EV/EBITDA multiple for grocery peers. */
export interface Peer {
  name: string
  revenue?: number
  ebitda?: number
  marginPct?: number
  growthPct?: number
  netDebt?: number
  marketCap?: number
  ev?: number
  evEbitda?: number
  /** Present only on deliberate trap entries: why this "peer" should be excluded from the comp set. */
  trap?: string
}

/** A precedent transaction: a past whole-company acquisition, priced for control. */
export interface Precedent {
  target: string
  acquirer: string
  year: number
  evEbitda: number
  premiumPct: number
}

// --- Pure helpers -----------------------------------------------------

/** Round to 1 decimal place. Used throughout for percentages and most multiples. */
function round1(x: number): number {
  return Math.round(x * 10) / 10
}

/** Margin as a percentage, e.g. margin(720, 1200) = 60.0. */
export function margin(part: number, whole: number): number {
  return round1((part / whole) * 100)
}

/** Period-over-period growth as a percentage, e.g. growth(80_000, 64_000) = 25.0. */
export function growth(now: number, prior: number): number {
  return round1((now / prior - 1) * 100)
}

/** Compound annual growth rate as a percentage over `years` periods. */
export function cagr(start: number, end: number, years: number): number {
  return round1((Math.pow(end / start, 1 / years) - 1) * 100)
}

/** Enterprise value from equity value (market cap) and net debt. */
export function evFromEquity(marketCap: number, netDebt: number): number {
  return marketCap + netDebt
}

/** Ratios a mission or its test can read off a Company, all consistently rounded. */
export interface DerivedRatios {
  grossMarginPct: number
  ebitMarginPct: number
  ebitdaMarginPct: number
  netMarginPct: number
  /** Only present when `priorYear` is given. */
  revenueGrowthPct?: number
  /**
   * Only present when `market` is given. Rounded to 2 decimals rather than
   * 1: Brickhouse's 1.25x and Nan's Pantry's 0.42x are the bible's exact
   * figures and a 1-decimal round would blur them to 1.3x / 0.4x. See
   * companies.test.ts and the task's `issues` note for the discrepancy this
   * resolves.
   */
  evRevenue?: number
  evEbitda?: number
  pe?: number
}

/** Derives the standard ratios for a company from its raw statement numbers. */
export function derived(company: Company): DerivedRatios {
  const { income, priorYear, market } = company
  const out: DerivedRatios = {
    grossMarginPct: margin(income.grossProfit, income.revenue),
    ebitMarginPct: margin(income.ebit, income.revenue),
    ebitdaMarginPct: margin(income.ebitda, income.revenue),
    netMarginPct: margin(income.netIncome, income.revenue),
  }
  if (priorYear) {
    out.revenueGrowthPct = growth(income.revenue, priorYear.revenue)
  }
  if (market) {
    out.evRevenue = Math.round((market.ev / income.revenue) * 100) / 100
    out.evEbitda = round1(market.ev / income.ebitda)
    out.pe = round1(market.marketCap / income.netIncome)
  }
  return out
}

// --- Rung 1: Pucker Up Lemonade Co. ------------------------------------

export const PUCKER_UP: Company = {
  name: 'Pucker Up Lemonade Co.',
  tagline: 'A regional lemonade-stand empire, 40 stands, run by an overconfident founder.',
  fiscalYear: 2025,
  income: {
    revenue: 1_200,
    cogs: 480,
    grossProfit: 720,
    opex: 420,
    da: 40,
    daEmbeddedInOpex: true,
    ebit: 300,
    ebitda: 340,
    interest: 30,
    taxes: 70,
    netIncome: 200,
  },
  balance: {
    cash: 150,
    receivables: 90,
    inventory: 60,
    ppe: 500,
    totalAssets: 800,
    payables: 70,
    longTermDebt: 330,
    totalDebt: 330,
    totalLiabilities: 400,
    equity: 400,
  },
  cashFlow: {
    netIncome: 200,
    depreciation: 40,
    changeInWorkingCapital: 20,
    cashFromOperations: 260,
    capex: -120,
    cashFromInvesting: -120,
    debtRepayment: -60,
    dividends: -40,
    cashFromFinancing: -100,
    netChangeInCash: 40,
    openingCash: 110,
    closingCash: 150,
  },
}

// --- Rung 2: Ledgerly Inc. (SaaS) ---------------------------------------

export const LEDGERLY: Company = {
  name: 'Ledgerly Inc.',
  tagline: 'Expense-report software sold by subscription.',
  fiscalYear: 2025,
  income: {
    revenue: 80_000,
    cogs: 20_000,
    grossProfit: 60_000,
    sga: 26_000,
    rnd: 14_000,
    gna: 8_000,
    da: 4_000,
    ebit: 8_000,
    ebitda: 12_000,
    interest: 3_000,
    taxes: 1_250,
    netIncome: 3_750,
  },
  priorYear: {
    revenue: 64_000,
    grossProfit: 47_400,
  },
  balance: {
    cash: 30_000,
    shortTermDebt: 5_000,
    longTermDebt: 55_000,
    totalDebt: 60_000,
  },
  market: {
    sharesK: 25_000,
    price: 14.8,
    marketCap: 370_000,
    netDebt: 30_000,
    ev: evFromEquity(370_000, 30_000),
    evRevenue: 5.0,
    evEbitda: 33.3,
    pe: 98.7,
  },
}

// --- Rung 3: Brickhouse Industrial Corp. --------------------------------

export const BRICKHOUSE: Company = {
  name: 'Brickhouse Industrial Corp.',
  tagline: 'Makes loading-dock levellers and industrial doors. Nine plants.',
  fiscalYear: 2025,
  income: {
    revenue: 640_000,
    cogs: 448_000,
    grossProfit: 192_000,
    sga: 96_000,
    da: 32_000,
    ebit: 64_000,
    ebitda: 96_000,
    interest: 18_000,
    taxes: 11_500,
    netIncome: 34_500,
  },
  priorYear: {
    revenue: 600_000,
  },
  balance: {
    cash: 40_000,
    totalDebt: 260_000,
  },
  market: {
    sharesK: 40_000,
    price: 14.5,
    marketCap: 580_000,
    netDebt: 220_000,
    ev: evFromEquity(580_000, 220_000),
    evRevenue: 1.25,
    evEbitda: 8.3,
    pe: 16.8,
  },
}

// --- Rung 3: Nan's Pantry Markets Inc. ----------------------------------

export const NANS_PANTRY: Company = {
  name: "Nan's Pantry Markets Inc.",
  tagline: 'Regional grocery chain, 210 stores.',
  fiscalYear: 2025,
  income: {
    revenue: 2_400_000,
    cogs: 1_776_000,
    grossProfit: 624_000,
    sga: 480_000,
    da: 72_000,
    ebit: 72_000,
    ebitda: 144_000,
    interest: 24_000,
    taxes: 12_000,
    netIncome: 36_000,
  },
  priorYear: {
    revenue: 2_280_000,
  },
  balance: {
    cash: 60_000,
    totalDebt: 360_000,
  },
  market: {
    sharesK: 60_000,
    price: 11.8,
    marketCap: 708_000,
    netDebt: 300_000,
    ev: evFromEquity(708_000, 300_000),
    evRevenue: 0.42,
    evEbitda: 7.0,
    pe: 19.7,
  },
}

// --- Peer sets -----------------------------------------------------------

/**
 * Industrials peer set for Brickhouse. Higher margin and higher growth earn
 * a higher EV/EBITDA multiple — that pattern is the lesson. Two deliberate
 * traps are included, flagged with `trap`, and must be excluded from the
 * comp set: a different industry (Halcyon) and a private company with no
 * market multiple at all (Brickhouse Holdings Pty).
 */
export const INDUSTRIAL_PEERS: Peer[] = [
  {
    name: 'Palisade Doors & Docks',
    revenue: 850_000,
    ebitda: 144_500,
    marginPct: 17.0,
    growthPct: 9,
    netDebt: 250_000,
    marketCap: 1_122_750,
    ev: evFromEquity(1_122_750, 250_000),
    evEbitda: 9.5,
  },
  {
    name: 'Dockwell Systems',
    revenue: 720_000,
    ebitda: 115_200,
    marginPct: 16.0,
    growthPct: 7,
    netDebt: 180_000,
    marketCap: 833_760,
    ev: evFromEquity(833_760, 180_000),
    evEbitda: 8.8,
  },
  {
    name: 'Ironvale Components',
    revenue: 480_000,
    ebitda: 62_400,
    marginPct: 13.0,
    growthPct: 4,
    netDebt: 140_000,
    marketCap: 321_760,
    ev: evFromEquity(321_760, 140_000),
    evEbitda: 7.4,
  },
  {
    name: 'Marrow Fabrication',
    revenue: 300_000,
    ebitda: 30_000,
    marginPct: 10.0,
    growthPct: 1,
    netDebt: 90_000,
    marketCap: 96_000,
    ev: evFromEquity(96_000, 90_000),
    evEbitda: 6.2,
  },
  {
    name: 'Halcyon Data Centres',
    evEbitda: 22.0,
    trap: 'Different industry (data centres, not industrial manufacturing) — different growth and margin economics, so its multiple does not transfer.',
  },
  {
    name: 'Brickhouse Holdings Pty',
    trap: 'A private family firm about one-twentieth the size of Brickhouse Industrial, with no share price — no market multiple exists to comp against.',
  },
]

/**
 * Grocery peer set for Nan's Pantry. The bible gives only the EV/EBITDA
 * multiple for the genuine peers. Two traps: a specialty retailer with a
 * much richer multiple, and the REIT landlord that owns the store buildings
 * (real estate, not a grocery operating business).
 */
export const GROCERY_PEERS: Peer[] = [
  { name: 'Copperline Markets', evEbitda: 7.4 },
  { name: 'Trestle Foods', evEbitda: 6.8 },
  { name: 'Verdant Grocers', evEbitda: 6.2 },
  {
    name: 'Larkspur Beauty',
    evEbitda: 13.0,
    trap: 'Specialty retail (beauty), not grocery — a structurally richer multiple that does not belong in a grocery comp set.',
  },
  {
    name: "Nan's Pantry Real Estate Trust",
    trap: 'The landlord REIT that owns the store buildings — a different asset entirely (real estate), not a grocery operating comp.',
  },
]

/**
 * Precedent transactions: past whole-company acquisitions. They price
 * control, so they run higher than trading multiples, and each carries a
 * premium (the percentage over the pre-deal share price the acquirer paid).
 */
export const PRECEDENTS: Precedent[] = [
  { target: 'Trestle Foods', acquirer: 'Copperline Markets', year: 2024, evEbitda: 9.2, premiumPct: 32 },
  { target: 'Verdant Grocers', acquirer: 'a private-equity sponsor', year: 2023, evEbitda: 8.4, premiumPct: 25 },
  { target: 'Marrow Fabrication', acquirer: 'Palisade Doors & Docks', year: 2025, evEbitda: 7.8, premiumPct: 21 },
]
