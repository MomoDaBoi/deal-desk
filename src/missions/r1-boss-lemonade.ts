import type { Mission } from '../engine/types'
import { gradeQuiz } from '../engine/graders/quiz'
import { mdVerdict } from '../engine/voice'

const MISSION_ID = 'r1-boss-lemonade'

/**
 * Rung 1 boss fight. All three Pucker Up statements are "known" going in
 * (see the lesson visual) — the skill being tested is matching the right
 * question to the statement built to answer it, fast.
 */
const QUESTIONS = [
  {
    id: 'q-profit',
    text: 'Did we make a profit this year? Which statement answers that?',
    choices: [
      { id: 'inc', label: 'Income statement' },
      { id: 'bal', label: 'Balance sheet' },
      { id: 'cf', label: 'Cash flow statement' },
    ],
    correctId: 'inc',
    explanation:
      'The income statement is the one built to answer this: it runs revenue down to net income over the whole year. Net income was $200k, so yes, we profited.',
  },
  {
    id: 'q-debt',
    text: 'How much do we owe the bank right now? Which statement answers that?',
    choices: [
      { id: 'inc', label: 'Income statement' },
      { id: 'bal', label: 'Balance sheet' },
      { id: 'cf', label: 'Cash flow statement' },
    ],
    correctId: 'bal',
    explanation:
      'The balance sheet is a snapshot of what you own and owe on one specific day, not a whole year of activity. It lists long-term debt of $330k — the amount actually owed to lenders right now.',
  },
  {
    id: 'q-cashgap',
    text: 'Why did cash go up only $40k when profit was $200k? Which statement answers that?',
    choices: [
      { id: 'inc', label: 'Income statement' },
      { id: 'bal', label: 'Balance sheet' },
      { id: 'cf', label: 'Cash flow statement' },
    ],
    correctId: 'cf',
    explanation:
      'Only the cash flow statement reconciles profit to actual cash. It adds back the non-cash depreciation ($40k, already buried inside the $420k opex line) and a working-capital swing ($20k) for $260k of operating cash, then subtracts $120k of capex and $100k of debt repayment plus dividends — netting to +$40k.',
  },
  {
    id: 'q-grossprofit',
    text: 'What was our gross profit — revenue left after the direct cost of making the lemonade, before any other expenses?',
    choices: [
      { id: '720', label: '$720k' },
      { id: '300', label: '$300k' },
      { id: '200', label: '$200k' },
    ],
    correctId: '720',
    explanation:
      'Gross profit is revenue minus cost of goods sold: $1,200k minus $480k is $720k. $300k is operating profit (EBIT, after operating expenses too) and $200k is net income (after interest and tax as well) — later stops on the same staircase down.',
  },
  {
    id: 'q-payoffdebt',
    text: 'Could we pay off all our debt with the cash we have today? Which statement answers that?',
    choices: [
      { id: 'inc', label: 'Income statement' },
      { id: 'bal', label: 'Balance sheet' },
      { id: 'cf', label: 'Cash flow statement' },
    ],
    correctId: 'bal',
    explanation:
      'This compares two numbers at the same moment, which is exactly what the balance sheet holds: cash of $150k against long-term debt of $330k. We are $180k short, so no, not without selling something or refinancing.',
  },
]

const mission: Mission = {
  id: MISSION_ID,
  rung: 1,
  order: 5,
  boss: true,
  title: 'Boss fight: the lemonade empire',
  tagline: "The founder wants answers before the bank call. All three statements, no time to flip back.",
  baseComp: 10_000,
  parSeconds: 75,
  lesson: {
    title: 'Three statements, three jobs',
    body:
      'All figures below are in thousands of dollars ($k). The income statement tells you if you made money this year. The balance sheet tells you what you own and owe on one specific day. The cash flow statement tells you why cash moved, even when it does not match profit. The boss round is just matching the question to the statement built to answer it — no new math. Here is all of Pucker Up, in one place, before the clock starts.',
    visual: {
      kind: 'bullets',
      items: [
        'Income statement: Revenue $1,200k − COGS $480k = Gross profit $720k. − Opex $420k (includes $40k depreciation) = EBIT $300k. − Interest $30k − Tax $70k = Net income $200k.',
        'Balance sheet: Cash $150k + AR $90k + Inventory $60k + PP&E $500k = Assets $800k. Payables $70k + Long-term debt $330k = Liabilities $400k. + Equity $400k = $800k.',
        'Cash flow: Net income $200k + Depreciation $40k + Working capital $20k = Operating $260k. Capex −$120k. Debt repayment −$60k, dividends −$40k = Financing −$100k. Net change +$40k (cash $110k → $150k).',
      ],
    },
  },
  task: {
    kind: 'quiz',
    prompt:
      "Founder, phone against their shoulder: \"Bank's calling in ten minutes and I will not sound like an idiot on this call. Five questions. Tell me which statement has the answer, or just the number. Go.\"",
    timeLimitSeconds: 90,
    questions: QUESTIONS,
  },
  grade(answer) {
    if (answer.kind !== 'quiz') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'quiz') throw new Error('wrong task kind')
    return gradeQuiz(mission.task, answer, ({ accuracy, wrongIds, unansweredIds, timedOut }) => {
      if (accuracy === 1) {
        return {
          verdict: "Perfect. Tell them to breathe — for once, that's earned.",
          explanation:
            'Clean sweep. Income statement for "did we profit," balance sheet for "what do we own and owe right now," cash flow statement for "why did cash move differently from profit." Match the question to the statement built to answer it, every time, and the bank call goes fine.',
        }
      }
      if (timedOut && unansweredIds.length === QUESTIONS.length) {
        return {
          verdict: "Time's up. The clock beat you before you beat the quiz — nothing here was graded on finance.",
          explanation:
            "The clock ran out before any answer was recorded, so nothing was locked in and nothing was actually wrong — you simply ran out of time. Here's the whole picture again so the next attempt is faster, not just righter: the income statement covers the year (profit), the balance sheet covers one day (what's owned and owed), and the cash flow statement explains the gap between the two. " +
            QUESTIONS.map((q) => q.explanation).join(' '),
        }
      }
      if (accuracy === 0) {
        return {
          verdict: 'Zero for five. The founder is now on hold with the bank and with you.',
          explanation:
            "Every single one was wrong, so here's the whole picture again: the income statement covers the year (profit), the balance sheet covers one day (what's owned and owed), and the cash flow statement explains the gap between the two. " +
            QUESTIONS.map((q) => q.explanation).join(' '),
        }
      }

      const missed = QUESTIONS.filter((q) => wrongIds.includes(q.id))
      const lines = missed.map((q) => `"${q.text}" ${q.explanation}`)
      const prefix = timedOut
        ? "The clock hit zero and the founder picked up the bank call without you — they guessed from memory. Here is what they got wrong: "
        : 'Here is what went sideways: '

      return {
        verdict: mdVerdict(accuracy, MISSION_ID),
        explanation: prefix + lines.join(' '),
      }
    })
  },
}

export default mission
