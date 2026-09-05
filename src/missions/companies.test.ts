import { describe, expect, it } from 'vitest'
import {
  BRICKHOUSE,
  GROCERY_PEERS,
  INDUSTRIAL_PEERS,
  LEDGERLY,
  NANS_PANTRY,
  PRECEDENTS,
  PUCKER_UP,
  cagr,
  derived,
  evFromEquity,
  growth,
  margin,
  type Company,
  type IncomeStatement,
} from './companies'

/** Sum of whichever opex fields the bible gave for this company. */
function opexTotal(income: IncomeStatement): number {
  if (income.opex !== undefined) return income.opex
  return (income.sga ?? 0) + (income.rnd ?? 0) + (income.gna ?? 0)
}

/**
 * Shared income-statement identities every company must satisfy:
 * gross profit = revenue - cogs; EBIT = gross profit - opex - D&A (unless
 * D&A is already folded into opex, per `daEmbeddedInOpex`); EBITDA = EBIT +
 * D&A; net income = EBIT - interest - taxes.
 */
function checkIncomeIdentities(company: Company) {
  const i = company.income
  expect(i.grossProfit).toBe(i.revenue - i.cogs)
  const daForEbit = i.daEmbeddedInOpex ? 0 : (i.da ?? 0)
  expect(i.ebit).toBe(i.grossProfit - opexTotal(i) - daForEbit)
  expect(i.ebitda).toBe(i.ebit + (i.da ?? 0))
  expect(i.netIncome).toBe(i.ebit - i.interest - i.taxes)
}

describe('Pucker Up Lemonade Co.', () => {
  it('income statement identities hold', () => {
    checkIncomeIdentities(PUCKER_UP)
  })

  it('balance sheet balances: assets = liabilities + equity', () => {
    const b = PUCKER_UP.balance!
    const assets = b.receivables! + b.inventory! + b.ppe! + b.cash
    expect(assets).toBe(b.totalAssets)
    expect(b.payables! + b.longTermDebt!).toBe(b.totalLiabilities)
    expect(b.totalAssets).toBe(b.totalLiabilities! + b.equity!)
    expect(b.totalDebt).toBe(b.longTermDebt)
  })

  it('cash flow statement reconciles', () => {
    const cf = PUCKER_UP.cashFlow!
    expect(cf.cashFromOperations).toBe(cf.netIncome + cf.depreciation + cf.changeInWorkingCapital)
    expect(cf.cashFromInvesting).toBe(cf.capex)
    expect(cf.cashFromFinancing).toBe(cf.debtRepayment + cf.dividends)
    const netChange = cf.cashFromOperations + cf.cashFromInvesting + cf.cashFromFinancing
    expect(netChange).toBe(cf.netChangeInCash)
    expect(cf.openingCash + netChange).toBe(cf.closingCash)
    expect(cf.closingCash).toBe(PUCKER_UP.balance!.cash)
  })

  it('derived margins match the bible: gross 60.0%, EBIT 25.0%, net 16.7%', () => {
    const d = derived(PUCKER_UP)
    expect(d.grossMarginPct).toBe(60.0)
    expect(d.ebitMarginPct).toBe(25.0)
    expect(d.netMarginPct).toBe(16.7)
  })

  it('EBITDA = EBIT + depreciation = 340, per the bible note', () => {
    expect(PUCKER_UP.income.ebitda).toBe(340)
  })
})

describe('Ledgerly Inc.', () => {
  it('income statement identities hold', () => {
    checkIncomeIdentities(LEDGERLY)
  })

  it('margins match the bible: gross 75.0%, EBIT 10.0%, EBITDA 15.0%, net 4.7%', () => {
    const d = derived(LEDGERLY)
    expect(d.grossMarginPct).toBe(75.0)
    expect(d.ebitMarginPct).toBe(10.0)
    expect(d.ebitdaMarginPct).toBe(15.0)
    expect(d.netMarginPct).toBe(4.7)
  })

  it('revenue growth is +25.0% and gross-profit growth is +26.6%', () => {
    expect(growth(LEDGERLY.income.revenue, LEDGERLY.priorYear!.revenue)).toBe(25.0)
    expect(growth(LEDGERLY.income.grossProfit, LEDGERLY.priorYear!.grossProfit!)).toBe(26.6)
  })

  it('3-year revenue CAGR from 40,960 to 80,000 is +25.0%', () => {
    expect(cagr(40_960, LEDGERLY.income.revenue, 3)).toBe(25.0)
  })

  it('net debt, EV, and multiples match the bible', () => {
    const b = LEDGERLY.balance!
    const m = LEDGERLY.market!
    expect(b.totalDebt - b.cash).toBe(m.netDebt)
    expect(evFromEquity(m.marketCap, m.netDebt)).toBe(m.ev)
    expect(m.marketCap).toBe(m.sharesK * m.price)
    const d = derived(LEDGERLY)
    expect(d.evRevenue).toBe(5.0)
    expect(d.evEbitda).toBe(33.3)
    expect(d.pe).toBe(98.7)
    expect(m.evRevenue).toBe(5.0)
    expect(m.evEbitda).toBe(33.3)
    expect(m.pe).toBe(98.7)
  })
})

describe('Brickhouse Industrial Corp.', () => {
  it('income statement identities hold', () => {
    checkIncomeIdentities(BRICKHOUSE)
  })

  it('margins match the bible: gross 30.0%, EBIT 10.0%, EBITDA 15.0%', () => {
    const d = derived(BRICKHOUSE)
    expect(d.grossMarginPct).toBe(30.0)
    expect(d.ebitMarginPct).toBe(10.0)
    expect(d.ebitdaMarginPct).toBe(15.0)
  })

  it('revenue growth is +6.7%', () => {
    expect(growth(BRICKHOUSE.income.revenue, BRICKHOUSE.priorYear!.revenue)).toBe(6.7)
  })

  it('net debt, EV, and multiples match the bible: 8.3x / 1.25x / 16.8x', () => {
    const b = BRICKHOUSE.balance!
    const m = BRICKHOUSE.market!
    expect(b.totalDebt - b.cash).toBe(m.netDebt)
    expect(evFromEquity(m.marketCap, m.netDebt)).toBe(m.ev)
    expect(m.marketCap).toBe(m.sharesK * m.price)
    const d = derived(BRICKHOUSE)
    expect(d.evEbitda).toBe(8.3)
    expect(d.evRevenue).toBe(1.25)
    expect(d.pe).toBe(16.8)
    expect(m.evEbitda).toBe(8.3)
    expect(m.evRevenue).toBe(1.25)
    expect(m.pe).toBe(16.8)
  })
})

describe("Nan's Pantry Markets Inc.", () => {
  it('income statement identities hold', () => {
    checkIncomeIdentities(NANS_PANTRY)
  })

  it('margins match the bible: gross 26.0%, EBIT 3.0%, EBITDA 6.0%', () => {
    const d = derived(NANS_PANTRY)
    expect(d.grossMarginPct).toBe(26.0)
    expect(d.ebitMarginPct).toBe(3.0)
    expect(d.ebitdaMarginPct).toBe(6.0)
  })

  it('revenue growth is +5.3%', () => {
    expect(growth(NANS_PANTRY.income.revenue, NANS_PANTRY.priorYear!.revenue)).toBe(5.3)
  })

  it('net debt, EV, and multiples match the bible: 7.0x / 0.42x / 19.7x', () => {
    const b = NANS_PANTRY.balance!
    const m = NANS_PANTRY.market!
    expect(b.totalDebt - b.cash).toBe(m.netDebt)
    expect(evFromEquity(m.marketCap, m.netDebt)).toBe(m.ev)
    expect(m.marketCap).toBe(m.sharesK * m.price)
    const d = derived(NANS_PANTRY)
    expect(d.evEbitda).toBe(7.0)
    expect(d.evRevenue).toBe(0.42)
    expect(d.pe).toBe(19.7)
    expect(m.evEbitda).toBe(7.0)
    expect(m.evRevenue).toBe(0.42)
    expect(m.pe).toBe(19.7)
  })
})

describe('helper functions', () => {
  it('margin() computes a rounded percentage', () => {
    expect(margin(720, 1_200)).toBe(60.0)
  })

  it('growth() computes a rounded period-over-period percentage', () => {
    expect(growth(80_000, 64_000)).toBe(25.0)
  })

  it('cagr() computes a rounded compound annual growth rate', () => {
    expect(cagr(100, 195.3125, 3)).toBe(25.0)
  })

  it('evFromEquity() adds net debt to market cap', () => {
    expect(evFromEquity(370_000, 30_000)).toBe(400_000)
  })
})

describe('industrial peer set (Brickhouse)', () => {
  it('every non-trap peer\'s EV/EBITDA reconciles from its own EV and EBITDA', () => {
    for (const peer of INDUSTRIAL_PEERS) {
      if (peer.trap) continue
      expect(peer.ev).toBe(evFromEquity(peer.marketCap!, peer.netDebt!))
      expect(Math.round((peer.ev! / peer.ebitda!) * 10) / 10).toBe(peer.evEbitda)
      expect(margin(peer.ebitda!, peer.revenue!)).toBe(peer.marginPct)
    }
  })

  it('higher margin and growth line up with a higher EV/EBITDA multiple', () => {
    const byMultiple = [...INDUSTRIAL_PEERS.filter((p) => !p.trap)].sort((a, b) => a.evEbitda! - b.evEbitda!)
    for (let i = 1; i < byMultiple.length; i++) {
      expect(byMultiple[i].marginPct!).toBeGreaterThanOrEqual(byMultiple[i - 1].marginPct!)
      expect(byMultiple[i].growthPct!).toBeGreaterThanOrEqual(byMultiple[i - 1].growthPct!)
    }
  })

  it('flags exactly two traps, each with a reason', () => {
    const traps = INDUSTRIAL_PEERS.filter((p) => p.trap)
    expect(traps.map((t) => t.name)).toEqual(['Halcyon Data Centres', 'Brickhouse Holdings Pty'])
    for (const t of traps) expect(t.trap!.length).toBeGreaterThan(0)
  })
})

describe('grocery peer set (Nan\'s Pantry)', () => {
  it('flags exactly two traps, each with a reason', () => {
    const traps = GROCERY_PEERS.filter((p) => p.trap)
    expect(traps.map((t) => t.name)).toEqual(['Larkspur Beauty', "Nan's Pantry Real Estate Trust"])
    for (const t of traps) expect(t.trap!.length).toBeGreaterThan(0)
  })

  it('genuine peer multiples match the bible', () => {
    const byName = Object.fromEntries(GROCERY_PEERS.filter((p) => !p.trap).map((p) => [p.name, p.evEbitda]))
    expect(byName['Copperline Markets']).toBe(7.4)
    expect(byName['Trestle Foods']).toBe(6.8)
    expect(byName['Verdant Grocers']).toBe(6.2)
  })
})

describe('precedent transactions', () => {
  it('match the bible', () => {
    expect(PRECEDENTS).toEqual([
      { target: 'Trestle Foods', acquirer: 'Copperline Markets', year: 2024, evEbitda: 9.2, premiumPct: 32 },
      { target: 'Verdant Grocers', acquirer: 'a private-equity sponsor', year: 2023, evEbitda: 8.4, premiumPct: 25 },
      { target: 'Marrow Fabrication', acquirer: 'Palisade Doors & Docks', year: 2025, evEbitda: 7.8, premiumPct: 21 },
    ])
  })

  it('run higher than the corresponding trading multiples (precedents price control)', () => {
    // Trestle Foods trades at 6.8x but was acquired at 9.2x; Verdant Grocers
    // trades at 6.2x but was acquired at 8.4x; Marrow Fabrication trades (as
    // an industrial peer) at 6.2x but was acquired at 7.8x.
    const trestleTrading = GROCERY_PEERS.find((p) => p.name === 'Trestle Foods')!.evEbitda!
    const verdantTrading = GROCERY_PEERS.find((p) => p.name === 'Verdant Grocers')!.evEbitda!
    const marrowTrading = INDUSTRIAL_PEERS.find((p) => p.name === 'Marrow Fabrication')!.evEbitda!
    expect(PRECEDENTS[0].evEbitda).toBeGreaterThan(trestleTrading)
    expect(PRECEDENTS[1].evEbitda).toBeGreaterThan(verdantTrading)
    expect(PRECEDENTS[2].evEbitda).toBeGreaterThan(marrowTrading)
  })
})
