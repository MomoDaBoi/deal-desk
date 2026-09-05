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
      'The income statement is the one built to answer this: it runs revenue down to net income over the whole year. Net income was $200, so yes, we profited.',
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
      'The balance sheet is a snapshot of what you own and owe on one specific day, not a whole year of activity. It lists long-term debt of $330 — the amount actually owed to lenders right now.',
  },
  {
    id: 'q-cashgap',
    text: 'Why did cash go up only $40 when profit was $200? Which statement answers that?',
    choices: [
      { id: 'inc', label: 'Income statement' },
      { id: 'bal', label: 'Balance sheet' },
      { id: 'cf', label: 'Cash flow statement' },
    ],
    correctId: 'cf',
    explanation:
      'Only the cash flow statement reconciles profit to actual cash. It adds back non-cash depreciation ($40) and a working-capital swing ($20) for $260 of operating cash, then subtracts $120 of capex and $100 of debt repayment plus dividends — netting to +$40.',
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
      'Gross profit is revenue minus cost of goods sold: $1,200 minus $480 is $720. $300 is operating profit (EBIT, after operating expenses too) and $200 is net income (after interest and tax as well) — later stops on the same staircase down.',
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
      'This compares two numbers at the same moment, which is exactly what the balance sheet holds: cash of $150 against long-term debt of $330. We are $180 short, so no, not without selling something or refinancing.',
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
  parSeconds: 90,
  lesson: {
    title: 'Three statements, three jobs',
    body:
      'The income statement tells you if you made money this year. The balance sheet tells you what you own and owe on one specific day. The cash flow statement tells you why cash moved, even when it does not match profit. The boss round is just matching the question to the statement built to answer it — no new math. Here is all of Pucker Up, in one place, before the clock starts.',
    visual: {
      kind: 'bullets',
      items: [
        'Income statement: Revenue $1,200 − COGS $480 = Gross profit $720. − Opex $420 = EBIT $300. − Interest $30 − Tax $70 = Net income $200.',
        'Balance sheet: Cash $150 + AR $90 + Inventory $60 + PP&E $500 = Assets $800. Payables $70 + Long-term debt $330 = Liabilities $400. + Equity $400 = $800.',
        'Cash flow: Net income $200 + Depreciation $40 + Working capital $20 = Operating $260. Capex −$120. Debt repayment −$60, dividends −$40 = Financing −$100. Net change +$40 (cash $110 → $150).',
      ],
    },
  },
  task: {
    kind: 'quiz',
    prompt:
      "Founder, phone against her shoulder: \"Bank's calling in ten minutes and I will not sound like an idiot on this call. Five questions. Tell me which statement has the answer, or just the number. Go.\"",
    timeLimitSeconds: 90,
    questions: QUESTIONS,
  },
  grade(answer) {
    if (answer.kind !== 'quiz') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'quiz') throw new Error('wrong task kind')
    return gradeQuiz(mission.task, answer, ({ accuracy, wrongIds, timedOut }) => {
      if (accuracy === 1) {
        return {
          verdict: "Perfect. Tell her to breathe — for once, that's earned.",
          explanation:
            'Clean sweep. Income statement for "did we profit," balance sheet for "what do we own and owe right now," cash flow statement for "why did cash move differently from profit." Match the question to the statement built to answer it, every time, and the bank call goes fine.',
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
        ? "The clock hit zero and the founder picked up the bank call without you — she guessed from memory. Here is what she got wrong: "
        : 'Here is what went sideways: '

      return {
        verdict: mdVerdict(accuracy, MISSION_ID),
        explanation: prefix + lines.join(' '),
      }
    })
  },
}

export default mission
