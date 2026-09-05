import { describe, expect, it, vi } from 'vitest'
import { extractFields, pickLatestFact, type XbrlCompanyFacts, type XbrlFact } from './edgar-extract'
import { ebitda, evFromFloat, evToEbitda, fetchLiveCompany, fmtMoney, netDebt, type EdgarCompany, type LiveCompanyData } from './edgar'

function fact(partial: Partial<XbrlFact> & { end: string; val: number }): XbrlFact {
  return { form: '10-K', fp: 'FY', filed: partial.end, ...partial }
}

describe('pickLatestFact', () => {
  it('picks the latest `end` among 10-K FY rows', () => {
    const facts: XbrlFact[] = [
      fact({ end: '2022-12-31', val: 100, filed: '2023-01-15' }),
      fact({ end: '2023-12-31', val: 120, filed: '2024-01-15' }),
      fact({ end: '2021-12-31', val: 90, filed: '2022-01-15' }),
    ]
    expect(pickLatestFact(facts, true)?.val).toBe(120)
  })

  it('within the same `end`, picks the latest `filed` (a restated period)', () => {
    const facts: XbrlFact[] = [
      fact({ end: '2023-12-31', val: 120, filed: '2024-01-15' }),
      fact({ end: '2023-12-31', val: 121, filed: '2024-06-01' }), // restated in a later filing
    ]
    expect(pickLatestFact(facts, true)?.val).toBe(121)
  })

  it('ignores 10-Q rows and FY mismatches when requireFp is true', () => {
    const facts: XbrlFact[] = [
      fact({ end: '2023-09-30', val: 30, form: '10-Q', fp: 'Q3' }),
      fact({ end: '2023-12-31', val: 120, fp: 'Q4' }), // wrong fp
      fact({ end: '2022-12-31', val: 100 }), // valid
    ]
    expect(pickLatestFact(facts, true)?.val).toBe(100)
  })

  it('drops the fp filter when requireFp is false (dei cover-page facts)', () => {
    const facts: XbrlFact[] = [fact({ end: '2023-11-01', val: 1000, fp: 'FY' }), fact({ end: '2024-01-10', val: 1100, fp: undefined })]
    expect(pickLatestFact(facts, false)?.val).toBe(1100)
  })

  it('returns null when nothing matches', () => {
    const facts: XbrlFact[] = [fact({ end: '2023-12-31', val: 1, form: '10-Q', fp: 'Q1' })]
    expect(pickLatestFact(facts, true)).toBeNull()
  })
})

describe('extractFields', () => {
  function fixture(): XbrlCompanyFacts {
    return {
      entityName: 'Fixture Corp',
      facts: {
        'us-gaap': {
          Revenues: { units: { USD: [fact({ end: '2023-12-31', val: 5_000_000, fy: 2023 })] } },
          OperatingIncomeLoss: { units: { USD: [fact({ end: '2023-12-31', val: 800_000, fy: 2023 })] } },
          DepreciationDepletionAndAmortization: { units: { USD: [fact({ end: '2023-12-31', val: 100_000 })] } },
          NetIncomeLoss: { units: { USD: [fact({ end: '2023-12-31', val: 500_000 })] } },
          CashAndCashEquivalentsAtCarryingValue: { units: { USD: [fact({ end: '2023-12-31', val: 1_200_000 })] } },
          LongTermDebtNoncurrent: { units: { USD: [fact({ end: '2023-12-31', val: 2_000_000 })] } },
          LongTermDebtCurrent: { units: { USD: [fact({ end: '2023-12-31', val: 300_000 })] } },
          Assets: { units: { USD: [fact({ end: '2023-12-31', val: 9_000_000 })] } },
          StockholdersEquity: { units: { USD: [fact({ end: '2023-12-31', val: 4_000_000 })] } },
        },
        dei: {
          EntityCommonStockSharesOutstanding: { units: { shares: [fact({ end: '2024-02-01', val: 10_000, fp: undefined })] } },
          EntityPublicFloat: { units: { USD: [fact({ end: '2023-06-30', val: 6_000_000, fp: undefined })] } },
        },
      },
    }
  }

  it('extracts every field and sums the two long-term-debt tags', () => {
    const result = extractFields(fixture())
    expect(result).toEqual({
      fiscalYear: 2023,
      periodEnd: '2023-12-31',
      revenue: 5_000_000,
      ebit: 800_000,
      da: 100_000,
      netIncome: 500_000,
      cash: 1_200_000,
      shortTermInvestments: null,
      debt: 2_300_000,
      shares: 10_000,
      totalAssets: 9_000_000,
      equity: 4_000_000,
      publicFloat: 6_000_000,
    })
  })

  it('falls back through the revenue tag priority list', () => {
    const doc = fixture()
    // RevenueFromContractWithCustomerExcludingAssessedTax is absent; only `Revenues` is present.
    expect(doc.facts?.['us-gaap']?.RevenueFromContractWithCustomerExcludingAssessedTax).toBeUndefined()
    expect(extractFields(doc).revenue).toBe(5_000_000)
  })

  it('falls back to LongTermDebt only when neither current nor noncurrent is reported', () => {
    const doc = fixture()
    delete doc.facts!['us-gaap']!.LongTermDebtNoncurrent
    delete doc.facts!['us-gaap']!.LongTermDebtCurrent
    doc.facts!['us-gaap']!.LongTermDebt = { units: { USD: [fact({ end: '2023-12-31', val: 1_500_000 })] } }
    expect(extractFields(doc).debt).toBe(1_500_000)
  })

  it('falls back from dei shares to the us-gaap tag when dei is absent', () => {
    const doc = fixture()
    delete doc.facts!.dei!.EntityCommonStockSharesOutstanding
    doc.facts!['us-gaap']!.CommonStockSharesOutstanding = { units: { shares: [fact({ end: '2023-12-31', val: 9_999 })] } }
    expect(extractFields(doc).shares).toBe(9_999)
  })

  it('returns null for every field that is entirely absent', () => {
    const result = extractFields({ facts: {} })
    expect(result).toEqual({
      fiscalYear: null,
      periodEnd: null,
      revenue: null,
      ebit: null,
      da: null,
      netIncome: null,
      cash: null,
      shortTermInvestments: null,
      debt: null,
      shares: null,
      totalAssets: null,
      equity: null,
      publicFloat: null,
    })
  })
})

describe('derived math', () => {
  const company: EdgarCompany = {
    ticker: 'FIX',
    cik: '0000000001',
    name: 'Fixture Corp',
    fiscalYear: 2023,
    periodEnd: '2023-12-31',
    revenue: 5_000_000,
    ebit: 800_000,
    da: 100_000,
    netIncome: 500_000,
    cash: 1_200_000,
    shortTermInvestments: 300_000,
    debt: 2_300_000,
    shares: 10_000,
    totalAssets: 9_000_000,
    equity: 4_000_000,
    publicFloat: 6_000_000,
  }

  it('ebitda is EBIT + D&A', () => {
    expect(ebitda(company)).toBe(900_000)
  })

  it('ebitda is null when either input is missing', () => {
    expect(ebitda({ ebit: null, da: 100 })).toBeNull()
    expect(ebitda({ ebit: 100, da: null })).toBeNull()
  })

  it('netDebt subtracts cash and short-term investments from debt', () => {
    expect(netDebt(company)).toBe(2_300_000 - 1_200_000 - 300_000)
  })

  it('netDebt treats a missing short-term-investments line as zero', () => {
    expect(netDebt({ ...company, shortTermInvestments: null })).toBe(2_300_000 - 1_200_000)
  })

  it('netDebt is null when debt or cash is not reported', () => {
    expect(netDebt({ ...company, debt: null })).toBeNull()
    expect(netDebt({ ...company, cash: null })).toBeNull()
  })

  it('evFromFloat adds public float and net debt', () => {
    const expectedNetDebt = 2_300_000 - 1_200_000 - 300_000
    expect(evFromFloat(company)).toBe(6_000_000 + expectedNetDebt)
  })

  it('evToEbitda divides EV by the EBITDA proxy', () => {
    const ev = evFromFloat(company)!
    expect(evToEbitda(company)).toBeCloseTo(ev / 900_000)
  })

  it('evToEbitda is null when EBITDA is unavailable', () => {
    expect(evToEbitda({ ...company, ebit: null })).toBeNull()
  })
})

describe('fmtMoney', () => {
  it('renders "not reported" for null', () => {
    expect(fmtMoney(null)).toBe('not reported')
    expect(fmtMoney(null, '$M')).toBe('not reported')
  })

  it('renders a comma-grouped dollar amount by default', () => {
    expect(fmtMoney(1_234_567)).toBe('$1,234,567')
  })

  it('scales to millions', () => {
    expect(fmtMoney(5_500_000, '$M')).toBe('$5.5M')
  })

  it('scales to billions', () => {
    expect(fmtMoney(6_000_000_000, '$B')).toBe('$6.0B')
  })
})

describe('fetchLiveCompany', () => {
  function fakeStorage() {
    const store = new Map<string, string>()
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
    }
  }

  function fakeCompanyFacts(val: number): XbrlCompanyFacts {
    return {
      entityName: 'Live Corp',
      facts: {
        'us-gaap': { OperatingIncomeLoss: { units: { USD: [fact({ end: '2023-12-31', val })] } } },
      },
    }
  }

  it('fetches, extracts, and caches on a cold cache', async () => {
    const storage = fakeStorage()
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(fakeCompanyFacts(700)), { status: 200 }))

    const result = await fetchLiveCompany('320193', fetchImpl as unknown as typeof fetch, storage)

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(result?.ebit).toBe(700)
    expect(result?.cik).toBe('0000320193')
    expect(storage.getItem('deal-desk:edgar:0000320193')).not.toBeNull()
  })

  it('serves from cache without refetching within the 7-day TTL', async () => {
    const storage = fakeStorage()
    const cached: LiveCompanyData = {
      cik: '0000320193',
      name: 'Live Corp',
      fiscalYear: 2023,
      periodEnd: '2023-12-31',
      revenue: null,
      ebit: 700,
      da: null,
      netIncome: null,
      cash: null,
      shortTermInvestments: null,
      debt: null,
      shares: null,
      totalAssets: null,
      equity: null,
      publicFloat: null,
    }
    storage.setItem('deal-desk:edgar:0000320193', JSON.stringify({ fetchedAt: Date.now(), ttlMs: 7 * 24 * 60 * 60 * 1000, data: cached }))
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(fakeCompanyFacts(999)), { status: 200 }))

    const result = await fetchLiveCompany('0000320193', fetchImpl as unknown as typeof fetch, storage)

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(result?.ebit).toBe(700)
  })

  it('refetches once the cache entry is older than its TTL', async () => {
    const storage = fakeStorage()
    const stale: LiveCompanyData = {
      cik: '0000320193',
      name: 'Live Corp',
      fiscalYear: 2022,
      periodEnd: '2022-12-31',
      revenue: null,
      ebit: 1,
      da: null,
      netIncome: null,
      cash: null,
      shortTermInvestments: null,
      debt: null,
      shares: null,
      totalAssets: null,
      equity: null,
      publicFloat: null,
    }
    const eightDaysMs = 8 * 24 * 60 * 60 * 1000
    storage.setItem(
      'deal-desk:edgar:0000320193',
      JSON.stringify({ fetchedAt: Date.now() - eightDaysMs, ttlMs: 7 * 24 * 60 * 60 * 1000, data: stale }),
    )
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(fakeCompanyFacts(2), ), { status: 200 }))

    const result = await fetchLiveCompany('0000320193', fetchImpl as unknown as typeof fetch, storage)

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(result?.ebit).toBe(2)
  })

  it('falls through to a refetch when the cached JSON is corrupt', async () => {
    const storage = fakeStorage()
    storage.setItem('deal-desk:edgar:0000320193', '{not json')
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(fakeCompanyFacts(5)), { status: 200 }))

    const result = await fetchLiveCompany('0000320193', fetchImpl as unknown as typeof fetch, storage)

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(result?.ebit).toBe(5)
  })

  it('returns null on a non-OK response', async () => {
    const storage = fakeStorage()
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 403 }))

    const result = await fetchLiveCompany('0000320193', fetchImpl as unknown as typeof fetch, storage)

    expect(result).toBeNull()
  })
})
