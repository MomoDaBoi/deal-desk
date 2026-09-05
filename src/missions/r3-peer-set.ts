import type { Mission } from '../engine/types'
import { gradeSort } from '../engine/graders/sort'
import { mdVerdict } from '../engine/voice'
import { INDUSTRIAL_PEERS } from './companies'

/**
 * Rung 3, mission 3. Sort the candidate peer set for Brickhouse Industrial
 * Corp into the comp set (in) or out. Candidates and trap reasons come
 * straight from the company bible (`INDUSTRIAL_PEERS`), so this mission and
 * its test always agree with it.
 */

/** Stable, readable id from a peer name (no re-typing figures elsewhere). */
function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
}

const REAL_PEERS = INDUSTRIAL_PEERS.filter((p) => !p.trap)
const TRAP_PEERS = INDUSTRIAL_PEERS.filter((p) => p.trap)

/** Why each candidate belongs in, or stays out of, the comp set. */
const REASON: Record<string, string> = Object.fromEntries(
  INDUSTRIAL_PEERS.map((p) => [
    slug(p.name),
    p.trap ??
      `Same industrial-manufacturing business as Brickhouse Industrial, with a ${p.marginPct}% EBITDA margin, ${p.growthPct}% growth, and a real quoted multiple of ${p.evEbitda}x EV/EBITDA to comp against.`,
  ]),
)

const mission: Mission = {
  id: 'r3-peer-set',
  rung: 3,
  order: 3,
  title: 'Build the comp set',
  tagline: 'Same industry, similar size, listed, with data — or it does not belong.',
  baseComp: 7_000,
  parSeconds: 150,
  lesson: {
    title: 'Picking a peer set is half art',
    body:
      'A comparable company analysis (comps) values a business by looking at what similar public companies trade for. A true peer trades in the same industry as your target, is roughly similar in size and growth, and is publicly listed with real market data, so you can actually read a multiple off it. Brickhouse Industrial makes loading-dock levellers and industrial doors; genuine peers make similar things at similar scale. Two candidates look tempting but fail: one is a fast-growing data-centre operator with completely different economics, and the other is a private family firm with no share price, so no multiple exists to comp against. Sort out the traps before you value anything.',
    visual: {
      kind: 'bullets',
      items: ['Same industry', 'Similar size and growth', 'Publicly listed, with real market data'],
    },
  },
  task: {
    kind: 'sort',
    prompt: 'Brickhouse Industrial Corp. is being valued against a set of possible peers. Sort each candidate in or out of the comp set.',
    buckets: [
      { id: 'in', label: 'In the comp set', role: 'equity', hint: 'Same industry, similar size and growth, listed with real data.' },
      { id: 'out', label: 'Out', role: 'neutral', hint: 'Wrong industry, or no market multiple exists.' },
    ],
    items: [
      ...REAL_PEERS.map((p) => ({ id: slug(p.name), label: p.name, bucketId: 'in' })),
      ...TRAP_PEERS.map((p) => ({ id: slug(p.name), label: p.name, bucketId: 'out' })),
    ],
  },
  grade(answer) {
    if (answer.kind !== 'sort') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'sort') throw new Error('wrong task kind')
    return gradeSort(mission.task, answer, ({ accuracy, wrongIds }) => {
      if (accuracy === 1) {
        return {
          verdict: mdVerdict(1, 'r3-peer-set'),
          explanation:
            'The five industrials stay in and the two traps stay out. ' +
            [...REAL_PEERS, ...TRAP_PEERS].map((p) => `${p.name}: ${REASON[slug(p.name)]}`).join(' '),
        }
      }
      if (accuracy === 0) {
        return {
          verdict: mdVerdict(0, 'r3-peer-set'),
          explanation:
            'Not one candidate landed correctly. A peer only belongs in the comp set if it trades in the same industry, is roughly similar in size and growth, and is publicly listed with real market data. ' +
            [...REAL_PEERS, ...TRAP_PEERS].map((p) => `${p.name}: ${REASON[slug(p.name)]}`).join(' '),
        }
      }
      const verdict = mdVerdict(accuracy, 'r3-peer-set')
      const explanation =
        'A comp set only works when a peer trades in the same industry, is a similar size and growth rate, is publicly listed, and has real market data to read a multiple off. ' +
        wrongIds.map((id) => `${itemLabel(id)} belongs ${bucketLabel(id)}. ${REASON[id] ?? ''}`).join(' ')
      return { verdict, explanation }
    })
  },
}

function itemLabel(id: string): string {
  if (mission.task.kind !== 'sort') return id
  return mission.task.items.find((i) => i.id === id)?.label ?? id
}

function bucketLabel(id: string): string {
  if (mission.task.kind !== 'sort') return id
  const item = mission.task.items.find((i) => i.id === id)
  const bucket = mission.task.buckets.find((b) => b.id === item?.bucketId)
  return bucket ? `in ${bucket.label}` : item?.bucketId ?? id
}

export default mission
