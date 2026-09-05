import type { Mission } from '../engine/types'
import { gradeQuiz } from '../engine/graders/quiz'
import { mdVerdict } from '../engine/voice'
import { BRICKHOUSE, LEDGERLY, NANS_PANTRY } from './companies'

const MISSION_ID = 'r3-which-multiple'

/**
 * Rung 3, mission 2. Three multiples, three situations where two of them
 * quietly break. No new arithmetic — the skill is picking the ratio that
 * still means something for the company in front of you.
 */
const CHOICES = [
  { id: 'evebitda', label: 'EV / EBITDA' },
  { id: 'evrev', label: 'EV / Revenue' },
  { id: 'pe', label: 'P/E' },
]

const QUESTIONS = [
  {
    id: 'q-debt-load',
    text: `Two grocers post identical revenue, margins, and store counts. One financed its rollout with heavy debt (like ${NANS_PANTRY.name}, carrying $${(NANS_PANTRY.balance!.totalDebt / 1000).toFixed(0)}m of debt); the other has almost none. Which multiple still compares their operating performance fairly?`,
    choices: CHOICES,
    correctId: 'evebitda',
    explanation:
      'EV/EBITDA divides enterprise value (equity plus debt) by EBITDA, a line that sits above interest expense. The debt-loaded grocer\'s bigger interest bill never touches either number, so its EV/EBITDA still lines up with a debt-free twin — the way multiple debt levels can all trade near the same multiple.',
  },
  {
    id: 'q-no-profit-growth',
    text: `A software company is growing revenue 25% a year — like ${LEDGERLY.name}, up from $64,000k to $80,000k — but has barely any profit yet. Which multiple can you actually use to value it?`,
    choices: CHOICES,
    correctId: 'evrev',
    explanation:
      "With earnings this thin, P/E and EV/EBITDA both blow up into a meaningless multiple — Ledgerly's own P/E is 98.7x on almost no net income. EV/Revenue skips profitability entirely and prices the one line that is still large and still growing.",
  },
  {
    id: 'q-bank',
    text: 'A mature bank holds hundreds of billions in deposits and loans — debt is the raw material of the business, not leverage layered on top of it. Which multiple is standard for valuing it?',
    choices: CHOICES,
    correctId: 'pe',
    explanation:
      "EV/EBITDA and EV/Revenue both add debt into enterprise value, but a bank's debt (deposits, borrowings) is inventory, not financing — netting it out breaks the ratio. P/E, priced off net income after interest, is what banks are actually valued on.",
  },
  {
    id: 'q-depreciation',
    text: `Two industrial peers post the same EBIT margin, but one depreciates its equipment fast and the other slow, so their D&A lines differ sharply — ${BRICKHOUSE.name} alone books $${((BRICKHOUSE.income.da ?? 0) / 1000).toFixed(0)}m of it a year. Which multiple removes that accounting noise?`,
    choices: CHOICES,
    correctId: 'evebitda',
    explanation:
      'EBITDA adds depreciation and amortization back before you ever divide, so a faster or slower depreciation schedule — an accounting choice, not an operating difference — no longer moves the multiple. EBIT or net income would still carry the distortion straight through.',
  },
  {
    id: 'q-negative-ebitda',
    text: 'A biotech burns cash and posts negative EBITDA this year. Which multiple can still be computed and actually compared to peers?',
    choices: CHOICES,
    correctId: 'evrev',
    explanation:
      "Dividing by a negative EBITDA (or a negative net income) hands you a negative multiple that means nothing next to a peer's positive one. Revenue is almost always positive, so EV/Revenue is the ratio left standing.",
  },
  {
    id: 'q-utility',
    text: 'A widely held electric utility pays a steady dividend, carries a stable, regulated level of debt year after year, and posts predictable earnings. Which multiple is standard for comparing it to peer utilities?',
    choices: CHOICES,
    correctId: 'pe',
    explanation:
      'When leverage is stable and regulated across the whole peer set, there is no debt distortion left for EV/EBITDA to fix. P/E — priced per share, the way dividend investors actually read the stock — is the standard yardstick here.',
  },
]

const mission: Mission = {
  id: MISSION_ID,
  rung: 3,
  order: 2,
  title: 'When each multiple fits',
  tagline: 'Three ratios, three failure modes. Pick the one that still means something.',
  baseComp: 6_000,
  parSeconds: 120,
  lesson: {
    title: 'EV/EBITDA vs. EV/Revenue vs. P/E',
    body:
      'A comp multiple only works if it measures like against like. Enterprise value (EV, market cap plus net debt — what it costs to buy the whole company) divided by EBITDA (earnings before interest, taxes, depreciation & amortization) or by revenue ignores capital structure entirely, so it compares companies fairly no matter how much debt each carries. P/E (market cap ÷ net income) sits below the interest line, so it only compares companies with similar leverage. EBITDA also strips out depreciation policy; revenue survives even when profit does not. Brickhouse trades at 8.3x EV/EBITDA, Nan\'s Pantry at 7.0x, Ledgerly at 5.0x EV/Revenue. Pick the ratio the numbers underneath can still support.',
    visual: {
      kind: 'bullets',
      items: [
        'EV/EBITDA: debt-neutral, depreciation-neutral — the default for comparing operating businesses',
        'EV/Revenue: works even with no profit or negative EBITDA',
        'P/E: only comparable across similar capital structures (banks, stable utilities)',
      ],
    },
  },
  task: {
    kind: 'quiz',
    prompt: 'Six situations. Pick the multiple that still tells you something true in each one.',
    questions: QUESTIONS,
  },
  grade(answer) {
    if (answer.kind !== 'quiz') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'quiz') throw new Error('wrong task kind')
    return gradeQuiz(mission.task, answer, ({ accuracy, wrongIds }) => {
      if (accuracy === 1) {
        return {
          verdict: 'Six for six. You know which ratio to reach for.',
          explanation:
            'Debt-loaded comps and depreciation mismatches both wash out under EV/EBITDA. Unprofitable growth and negative EBITDA both need EV/Revenue instead. Banks and stable utilities are the two cases where P/E is actually the right tool. That is the whole map.',
        }
      }
      if (accuracy === 0) {
        return {
          verdict: 'Zero for six. Every multiple picked was the wrong one.',
          explanation:
            'None of these landed, so the short version: EV/EBITDA is debt-neutral and depreciation-neutral, so it is the default for comparing operating businesses on different balance sheets. EV/Revenue is the fallback when profit is thin, absent, or negative. P/E only holds up when capital structure is stable and simple across the peer set — banks and regulated utilities. ' +
            QUESTIONS.map((q) => q.explanation).join(' '),
        }
      }
      const missed = QUESTIONS.filter((q) => wrongIds.includes(q.id))
      const lines = missed.map((q) => `"${q.text}" ${q.explanation}`)
      return {
        verdict: mdVerdict(accuracy, MISSION_ID),
        explanation: 'Here is what went sideways: ' + lines.join(' '),
      }
    })
  },
}

export default mission
