import type { Mission, MentorClient, WrittenAnswer, WrittenTask } from '../engine/types'
import { offlineWrittenGrade } from '../engine/graders/written'

/**
 * Rung 5, mentor-only. The mock interview: five classic IB technical
 * questions, one turn each, graded independently by the MD over the
 * Anthropic API (see `Mission.gradeAsync` and `MentorClient.gradeWritten`).
 * There is no local rubric checker for prose, so the pure `grade()` always
 * returns the offline "Mentor mode required" result — `task.rubric` is set
 * to the five question texts so that fallback still has something to list.
 *
 * This mission never computes comp or valuation numbers; `baseComp` is 0
 * per PLAN.md section (d) so turning Mentor mode on cannot make Rung 5
 * harder to pass. The only "math" here is averaging five 1-10 scores into
 * an accuracy, done with the pure helpers below.
 */

interface InterviewQuestion {
  id: string
  text: string
  rubric: string[]
  modelAnswer: string
}

const QUESTIONS: InterviewQuestion[] = [
  {
    id: 'q1',
    text: 'Walk me through the three financial statements.',
    rubric: [
      'Starts with the income statement: revenue down to net income over a period.',
      'Says net income flows into the cash flow statement, where non-cash add-backs (like depreciation) and working capital changes turn it into cash from operations only — capex sits in investing, and debt and dividends in financing.',
      'Says the balance sheet is a snapshot: ending cash from the cash flow statement rolls onto it, and net income (less dividends) rolls into retained earnings.',
    ],
    modelAnswer:
      'Income statement (revenue to net income) feeds the cash flow statement, whose ending cash and retained-earnings change roll onto the balance sheet.',
  },
  {
    id: 'q2',
    text: 'If depreciation goes up by $10, walk me through how that flows through the three statements.',
    rubric: [
      'Income statement: EBIT (and pre-tax income) falls by the full $10.',
      'Because depreciation is tax-deductible, net income falls by only $10 x (1 - tax rate), not the full $10.',
      'Cash flow statement: net income is down, but depreciation is a non-cash add-back, so cash from operations actually rises by $10 x tax rate; on the balance sheet, cash rises by that amount, PP&E falls by $10, and equity falls by the after-tax hit to net income.',
    ],
    modelAnswer:
      'EBIT falls $10, net income falls $10 x (1 - tax rate), cash rises by $10 x tax rate, PP&E falls $10, and the balance sheet still balances.',
  },
  {
    id: 'q3',
    text: "What's the difference between enterprise value and equity value?",
    rubric: [
      'Equity value (market cap) prices only the shares outstanding.',
      'Enterprise value (EV) prices the whole operating business: EV = equity value + total debt (and preferred/minority interest) - cash.',
      'States why it matters: EV is capital-structure-neutral, so it is the right number for comparing companies that carry different amounts of debt.',
    ],
    modelAnswer:
      'Equity value prices the shares alone; enterprise value adds debt and subtracts cash to price the whole business, which is what makes it comparable across capital structures.',
  },
  {
    id: 'q4',
    text: 'When would you use EV/Revenue instead of EV/EBITDA?',
    rubric: [
      "Use EV/Revenue when EBITDA is negative or too small to be a meaningful denominator.",
      'Notes the tradeoff: EV/Revenue ignores cost structure and margin, so it is a cruder multiple than EV/EBITDA.',
      'Gives a concrete example, such as an early-stage or high-growth company (e.g. software) still burning cash.',
    ],
    modelAnswer:
      'When EBITDA is negative or negligible, such as an early-stage, high-growth company, where revenue is the only meaningful denominator left.',
  },
  {
    id: 'q5',
    text: 'Walk me through a DCF.',
    rubric: [
      'Projects unlevered free cash flow for an explicit forecast period (e.g. five years).',
      'Discounts those cash flows and a terminal value back to the present using a discount rate (WACC, the weighted average cost of capital).',
      'Sums the discounted cash flows and discounted terminal value to get enterprise value, then bridges to equity value (and per-share, if asked).',
    ],
    modelAnswer:
      'Project unlevered free cash flow for five years, discount it and a terminal value back at WACC, sum for enterprise value, then bridge to equity value.',
  },
]

/** Mean of a list of scores. Empty input returns 0 rather than NaN. */
function meanScore(scores: number[]): number {
  if (scores.length === 0) return 0
  return scores.reduce((sum, s) => sum + s, 0) / scores.length
}

/** Clamp to the 1-10 range the Mentor API contract promises, in case a score wanders outside it. */
function clampScore(score: number): number {
  return Math.min(10, Math.max(1, score))
}

/** Mean score (1-10) mapped to 0..1 accuracy. */
function accuracyFromScores(scores: number[]): number {
  return meanScore(scores.map(clampScore)) / 10
}

/** Hire / no-hire one-liner. 0.7 is the same pass threshold the mission's accuracy uses everywhere else in the app. */
function hireVerdict(accuracy: number): string {
  return accuracy >= 0.7
    ? 'We would like to extend an offer. Do not read the fine print.'
    : 'We will keep your CV on file.'
}

const mission: Mission = {
  id: 'm5-mock-interview',
  rung: 5,
  order: 7,
  title: 'Mock interview',
  tagline: 'Five questions. No notes. The MD is timing you.',
  baseComp: 0,
  parSeconds: 600,
  mentorOnly: true,
  lesson: {
    title: 'How technicals get asked',
    body:
      "A mock interview tests whether you can explain the mechanics under pressure, not just recite a number. Every technical follows a structure the interviewer expects: name the steps first, then walk them in order. For the three financial statements (income statement, balance sheet, cash flow statement), that means top to bottom, one flowing into the next. For a DCF (discounted cash flow, valuing a business off the cash it will generate), name each step before diving into one. Enterprise value (EV, the whole business's price tag) and equity value (the shares alone) get mixed up constantly — always say which you mean. Five questions, 120 words each. Brevity is a feature, not a shortcut.",
    visual: {
      kind: 'bullets',
      items: [
        'Name the structure before you dive into the detail',
        'Say which value you mean: enterprise or equity',
        'Five questions, ~120 words each — no rambling',
      ],
    },
  },
  task: {
    kind: 'written',
    prompt: 'Answer all five technical questions as if this were a real interview.',
    wordLimit: 120,
    rubric: QUESTIONS.map((q) => q.text),
    modelAnswer: 'Each question below is graded on its own three-item rubric and model answer.',
    questions: QUESTIONS.map((q) => ({ id: q.id, text: q.text, rubric: q.rubric, modelAnswer: q.modelAnswer })),
  },
  grade(answer) {
    if (answer.kind !== 'written') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'written') throw new Error('wrong task kind')
    return offlineWrittenGrade(mission.task)
  },
  async gradeAsync(answer, mentor: MentorClient) {
    if (answer.kind !== 'written') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'written') throw new Error('wrong task kind')
    const task = mission.task as WrittenTask
    const written = answer as WrittenAnswer

    const results: { id: string; score: number; explanation: string }[] = []
    // Sequential by spec: each question is its own graded interview turn, not a batch.
    for (const q of QUESTIONS) {
      const r = await mentor.gradeWritten({
        missionTitle: mission.title,
        question: q.text,
        rubric: q.rubric,
        modelAnswer: q.modelAnswer,
        answer: written.answers?.[q.id] ?? '',
        wordLimit: task.wordLimit,
      })
      results.push({ id: q.id, score: r.score, explanation: r.explanation })
    }

    const scores = results.map((r) => r.score)
    const accuracy = accuracyFromScores(scores)

    return {
      accuracy,
      verdict: hireVerdict(accuracy),
      explanation: results.map((r, i) => `Q${i + 1}: ${r.explanation}`).join(' '),
      details: results.map((r) => ({ id: r.id, ok: clampScore(r.score) >= 7, note: r.explanation })),
    }
  },
}

export default mission
