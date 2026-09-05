import { describe, it, expect } from 'vitest'
import mission from './r5-debt-stack'

function ids(): string[] {
  if (mission.task.kind !== 'order') throw new Error('expected order task')
  return mission.task.items.map((i) => i.id)
}

describe('r5-debt-stack mission shape', () => {
  it('is rung 5, order 3, base 11000, par 180', () => {
    expect(mission.rung).toBe(5)
    expect(mission.order).toBe(3)
    expect(mission.baseComp).toBe(11_000)
    expect(mission.parSeconds).toBe(180)
  })

  it('is an order task with 6 items in the specified seniority sequence', () => {
    if (mission.task.kind !== 'order') throw new Error('expected order task')
    expect(mission.task.items).toHaveLength(6)
    expect(ids()).toEqual([
      'revolver',
      'first-lien',
      'second-lien',
      'senior-notes',
      'mezzanine',
      'common-equity',
    ])
  })

  it('has unique item ids', () => {
    const all = ids()
    expect(new Set(all).size).toBe(all.length)
  })

  it('assigns roles per spec: debt for the middle four, cash for the revolver, equity for common equity', () => {
    if (mission.task.kind !== 'order') throw new Error('expected order task')
    const byId = Object.fromEntries(mission.task.items.map((i) => [i.id, i.role]))
    expect(byId['revolver']).toBe('cash')
    expect(byId['first-lien']).toBe('debt')
    expect(byId['second-lien']).toBe('debt')
    expect(byId['senior-notes']).toBe('debt')
    expect(byId['mezzanine']).toBe('debt')
    expect(byId['common-equity']).toBe('equity')
  })

  it('lesson body is under 120 words and defines every instrument', () => {
    const words = mission.lesson.body.trim().split(/\s+/)
    expect(words.length).toBeLessThan(120)
    const body = mission.lesson.body.toLowerCase()
    expect(body).toContain('secured')
    expect(body).toContain('lien')
    expect(body).toContain('unsecured')
    expect(body).toContain('mezzanine')
    expect(body).toContain('equity')
  })

  it('has no embedded quiz question (order task), so no correctId to validate', () => {
    if (mission.task.kind !== 'order') throw new Error('expected order task')
    expect('question' in mission.task).toBe(false)
  })
})

describe('r5-debt-stack grading', () => {
  it('scores 1 and names the full stack on a perfect answer', () => {
    const result = mission.grade({ kind: 'order', orderedIds: ids() })
    expect(result.accuracy).toBe(1)
    expect(result.explanation).toContain('revolver')
    expect(result.explanation).toContain('common equity')
  })

  it('scores partial credit and names the misplaced instruments on the classic "senior unsecured" trap', () => {
    // Swap second-lien and senior-notes: a real trap, since "senior" in the
    // name tempts players to rank it above the second lien despite the
    // second lien being secured collateral and thus senior in practice.
    const wrong = ['revolver', 'first-lien', 'senior-notes', 'second-lien', 'mezzanine', 'common-equity']
    const result = mission.grade({ kind: 'order', orderedIds: wrong })
    expect(result.accuracy).toBeCloseTo(4 / 6, 10)
    expect(result.explanation).toContain('Second-lien term loan')
    expect(result.explanation).toContain('Senior unsecured notes')
  })

  it('scores 0 accuracy on a fully reversed stack (equity paid first is about as wrong as it gets)', () => {
    const reversed = ids().slice().reverse()
    const result = mission.grade({ kind: 'order', orderedIds: reversed })
    expect(result.accuracy).toBe(0)
  })

  it('throws on a mismatched answer kind', () => {
    expect(() => mission.grade({ kind: 'slider', values: {} })).toThrow()
  })
})
