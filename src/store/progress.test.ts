import { describe, expect, it } from 'vitest'
import { parseProgress, PROGRESS_VERSION } from './progress'

describe('parseProgress', () => {
  it('rejects non-JSON input', () => {
    const r = parseProgress('not json at all')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('That is not valid JSON.')
  })

  it('rejects a value that is not an object', () => {
    const r = parseProgress('42')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('Expected an object.')
  })

  it('rejects null', () => {
    const r = parseProgress('null')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('Expected an object.')
  })

  it('rejects an object missing the version field', () => {
    const r = parseProgress(JSON.stringify({ best: {} }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/version/i)
  })

  it('rejects a future save version', () => {
    const r = parseProgress(JSON.stringify({ version: PROGRESS_VERSION + 1, best: {} }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(new RegExp(`version ${PROGRESS_VERSION + 1}`))
  })

  it('rejects a malformed "best" field', () => {
    const missing = parseProgress(JSON.stringify({ version: 1 }))
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.error).toBe('Missing or malformed "best" field.')

    const wrongType = parseProgress(JSON.stringify({ version: 1, best: 'nope' }))
    expect(wrongType.ok).toBe(false)

    const nonNumberValues = parseProgress(JSON.stringify({ version: 1, best: { a: 'not a number' } }))
    expect(nonNumberValues.ok).toBe(false)

    const bestIsArray = parseProgress(JSON.stringify({ version: 1, best: [1, 2, 3] }))
    expect(bestIsArray.ok).toBe(false)
  })

  it('accepts a minimal valid object and fills in defaults', () => {
    const r = parseProgress(JSON.stringify({ version: 1, best: { a: 100 } }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.version).toBe(PROGRESS_VERSION)
    expect(r.data.best).toEqual({ a: 100 })
    expect(r.data.attempts).toEqual([])
    expect(r.data.failStreak).toEqual({})
    expect(r.data.bonusSeen).toEqual([])
    expect(typeof r.data.createdAt).toBe('string')
    expect(typeof r.data.updatedAt).toBe('string')
  })

  it('filters out malformed attempts, keeping valid ones', () => {
    const raw = {
      version: 1,
      best: {},
      attempts: [
        { missionId: 'a', accuracy: 1, comp: 1000, elapsedSeconds: 10, at: '2020-01-01T00:00:00.000Z' },
        { missionId: 'b', accuracy: 'not a number', comp: 1000 }, // malformed: accuracy not a number
        { accuracy: 1, comp: 1000 }, // malformed: missing missionId
        { missionId: 'c', accuracy: 0.5, comp: 500 }, // valid, minimal
        'garbage',
        null,
      ],
    }
    const r = parseProgress(JSON.stringify(raw))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.attempts).toHaveLength(2)
    expect(r.data.attempts.map((a) => a.missionId)).toEqual(['a', 'c'])
  })

  it('filters out invalid bonusSeen rungs', () => {
    const raw = { version: 1, best: {}, bonusSeen: [1, 2, 6, 'x', 3, 0, -1] }
    const r = parseProgress(JSON.stringify(raw))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.bonusSeen).toEqual([1, 2, 3])
  })

  it('keeps createdAt if present, and stamps a fresh updatedAt', () => {
    const createdAt = '2020-01-01T00:00:00.000Z'
    const r = parseProgress(JSON.stringify({ version: 1, best: {}, createdAt }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.createdAt).toBe(createdAt)
    expect(r.data.updatedAt).not.toBe(createdAt)
  })
})
