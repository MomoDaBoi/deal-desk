import type { Mission, OrderItem } from '../engine/types'
import { gradeOrder } from '../engine/graders'
import { mdVerdict } from '../engine/voice'

/**
 * Rung 5, mission 3. When a company can't pay everyone, the capital
 * structure decides who eats the loss first. This mission is the seniority
 * stack itself: six instruments, ordered by claim priority in a
 * liquidation, most senior (paid first, last to lose money) at the top.
 *
 * The order below IS the model. There is no external number to recompute —
 * seniority is a legal ranking, not an arithmetic one — so the "pure
 * helper" here is `rankOf`, which turns the canonical stack into a lookup
 * other logic (grading, tests) can check against instead of re-typing ids.
 */

/** Canonical seniority stack, most senior first. This array is the single source of truth for order. */
const SENIORITY_STACK: OrderItem[] = [
  { id: 'revolver', label: 'Revolver', role: 'cash' },
  { id: 'first-lien', label: 'First-lien term loan', role: 'debt' },
  { id: 'second-lien', label: 'Second-lien term loan', role: 'debt' },
  { id: 'senior-notes', label: 'Senior unsecured notes', role: 'debt' },
  { id: 'mezzanine', label: 'Mezzanine', role: 'debt' },
  { id: 'common-equity', label: 'Common equity', role: 'equity' },
]

/** Pure lookup: an instrument's rank in the stack (0 = paid first). Derived, never re-typed. */
function rankOf(id: string): number {
  const i = SENIORITY_STACK.findIndex((item) => item.id === id)
  if (i === -1) throw new Error(`unknown instrument id: ${id}`)
  return i
}

/** Sanity check the model itself is monotonic and has no duplicate ranks (used by the test file too). */
function isStrictlyOrdered(ids: string[]): boolean {
  return ids.every((id, i) => rankOf(id) === i)
}

const WHY: Record<string, string> = {
  revolver:
    'The revolver is a bank credit line, secured by (backed by a legal claim on) the company\'s current assets and drawn and repaid as cash needs change. Banks that fund it insist on being repaid first, so it sits at the very top.',
  'first-lien':
    'A first-lien term loan is secured debt with the first legal claim on the company\'s assets. "Lien" just means a registered claim: if the assets are sold to repay lenders, first-lien holders are paid out of that sale before anyone else with a claim on the same collateral.',
  'second-lien':
    'A second-lien term loan is secured by the same collateral as the first lien, but its claim is registered behind it: second-lien holders only see money from those assets after the first lien is repaid in full. Still secured, still ahead of anything unsecured.',
  'senior-notes':
    'Senior unsecured notes are bonds with no specific collateral behind them — "senior" here only means senior to other unsecured or subordinated debt, not senior to secured debt. That is the trap: the name says "senior," but secured lenders with a lien still get paid first.',
  mezzanine:
    'Mezzanine debt is subordinated: contractually last among the lenders, priced with a high interest rate (often plus warrants, the right to buy equity later) to compensate for that risk. It only gets paid after every other debt claim above it.',
  'common-equity':
    'Common equity holders are the owners, not lenders. They have no legal claim to a fixed repayment at all — they collect whatever is left over after every lender above them is repaid in full, which in a bad outcome can be nothing.',
}

const LESSON_BODY =
  "When a company can't pay everyone, the seniority stack decides who eats the loss first. Secured debt (a lien) has a registered legal claim on specific assets and gets repaid from selling them before unsecured creditors see a cent. Unsecured debt has a general claim on the company but no specific collateral. Within secured debt, a first lien beats a second lien on the same assets. Senior unsecured notes rank below secured debt despite the name \"senior\" — that word only compares them to other unsecured debt. Mezzanine is subordinated debt, paid after everything above it. Common equity, the owners' stake, is paid last, if anything is left."

const mission: Mission = {
  id: 'r5-debt-stack',
  rung: 5,
  order: 3,
  title: 'The seniority stack',
  tagline: 'Who gets paid first when the deal goes wrong.',
  baseComp: 11_000,
  parSeconds: 180,
  lesson: {
    title: 'Seniority: the order money comes back in',
    body: LESSON_BODY,
    visual: {
      kind: 'bullets',
      items: [
        'Secured debt (a lien) is repaid from specific collateral first',
        'A first lien beats a second lien on the same collateral',
        '"Senior unsecured" still loses to any secured lien',
        'Common equity is paid last, if anything is left',
      ],
    },
  },
  task: {
    kind: 'order',
    prompt:
      "A leveraged buyout just went sideways and the company is being liquidated. Stack these six claims in the order they get repaid, most senior (paid first) at the top.",
    items: SENIORITY_STACK,
  },
  grade(answer) {
    if (answer.kind !== 'order') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'order') throw new Error('wrong task kind')
    return gradeOrder(mission.task.items, answer.orderedIds, ({ accuracy, wrongIds }) => {
      if (accuracy === 1) {
        return {
          verdict: 'Fine. Do not let it go to your head.',
          explanation:
            'Correct stack, top to bottom: revolver, first-lien term loan, second-lien term loan, senior unsecured notes, mezzanine, common equity. ' +
            'Secured claims (revolver, both liens) are repaid from specific collateral before any unsecured claim; within the unsecured layer, notes outrank subordinated mezzanine; equity is paid last, if anything remains.',
        }
      }
      const misplaced = SENIORITY_STACK.filter((item) => wrongIds.includes(item.id)).map((item) => item.label)
      const explanations = wrongIds.map((id) => WHY[id]).filter((line): line is string => Boolean(line))
      const verdict =
        accuracy >= 0.75
          ? 'Close. "Close" is what we say at the deposition.'
          : accuracy >= 0.5
            ? mdVerdict(accuracy, 'r5-debt-stack')
            : 'This capital structure would not survive a real liquidation, and neither would you.'
      return {
        verdict,
        explanation:
          `Misplaced: ${misplaced.join(', ')}. Correct order top to bottom is revolver, first-lien term loan, second-lien term loan, senior unsecured notes, mezzanine, common equity. ` +
          explanations.join(' '),
      }
    })
  },
}

// Keep the model's internal consistency checked at module load, not just in tests.
if (!isStrictlyOrdered(SENIORITY_STACK.map((item) => item.id))) {
  throw new Error('r5-debt-stack: SENIORITY_STACK is not self-consistent with rankOf')
}

export default mission
