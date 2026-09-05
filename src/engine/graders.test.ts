import { describe, expect, it, vi } from 'vitest'
import { gradeOrder, shuffle } from './graders'
import type { OrderItem } from './types'

function items(ids: string[]): OrderItem[] {
  return ids.map((id) => ({ id, label: id }))
}

const noop = () => ({ verdict: 'v', explanation: 'e' })

describe('gradeOrder', () => {
  it('gives accuracy 1 and all-ok details when everything is in the correct slot', () => {
    const correct = items(['a', 'b', 'c'])
    const result = gradeOrder(correct, ['a', 'b', 'c'], noop)
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([
      { id: 'a', ok: true },
      { id: 'b', ok: true },
      { id: 'c', ok: true },
    ])
  })

  it('scores 6/8 for a single adjacent swap on 8 items', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const correct = items(ids)
    const submitted = ['a', 'b', 'c', 'e', 'd', 'f', 'g', 'h'] // swap d/e
    const result = gradeOrder(correct, submitted, noop)
    expect(result.accuracy).toBe(6 / 8)
  })

  it('scores 0 for a fully reversed 8-item list', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const correct = items(ids)
    const reversed = [...ids].reverse()
    const result = gradeOrder(correct, reversed, noop)
    expect(result.accuracy).toBe(0)
  })

  it('passes the correct wrongIds to the explain callback', () => {
    const correct = items(['a', 'b', 'c', 'd'])
    const submitted = ['a', 'c', 'b', 'd'] // b and c swapped
    const explain = vi.fn<typeof noop>(noop)
    gradeOrder(correct, submitted, explain)
    expect(explain).toHaveBeenCalledTimes(1)
    const arg = explain.mock.calls[0]![0]
    expect(arg.accuracy).toBe(0.5)
    expect(arg.wrongIds.sort()).toEqual(['b', 'c'])
  })

  it('returns accuracy 1 for an empty task without calling explain', () => {
    const explain = vi.fn(noop)
    const result = gradeOrder([], [], explain)
    expect(result.accuracy).toBe(1)
    expect(result.details).toEqual([])
    expect(explain).not.toHaveBeenCalled()
  })
})

describe('shuffle', () => {
  it('is deterministic for a given seed', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(shuffle(arr, 42)).toEqual(shuffle(arr, 42))
  })

  it('contains the same elements as the input', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8]
    const out = shuffle(arr, 7)
    expect(out.slice().sort()).toEqual(arr.slice().sort())
  })

  it('never returns the input order for length > 1, across many seeds', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8]
    for (let seed = 1; seed <= 200; seed++) {
      const out = shuffle(arr, seed)
      expect(out).not.toEqual(arr)
    }
  })

  it('handles length-1 and length-0 arrays', () => {
    expect(shuffle([], 1)).toEqual([])
    expect(shuffle([1], 1)).toEqual([1])
  })
})
