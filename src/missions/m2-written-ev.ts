import type { Mission } from '../engine/types'
import { offlineWrittenGrade, mentorResultToGrade } from '../engine/graders/written'
import { LEDGERLY } from './companies'

/**
 * Rung 2, mentor-only. A free-text mission: explain EV vs. market cap to a
 * client in two sentences. Graded by the MD over the Anthropic API (see
 * `Mission.gradeAsync` and `MentorClient.gradeWritten`) — there is no local
 * rubric checker for prose, so the pure `grade()` always returns the
 * offline "Mentor mode required" result.
 *
 * Figures come straight from the Rung 2 company bible: Ledgerly's equity
 * value (market cap) $370,000k + net debt $30,000k = enterprise value
 * $400,000k.
 */
const EQUITY_VALUE = LEDGERLY.market!.marketCap
const NET_DEBT = LEDGERLY.market!.netDebt
const ENTERPRISE_VALUE = LEDGERLY.market!.ev

const mission: Mission = {
  id: 'm2-written-ev',
  rung: 2,
  order: 7,
  title: 'Explain it to the client',
  tagline: 'No jargon. The client is paying you to make this simple.',
  baseComp: 0,
  parSeconds: 240,
  mentorOnly: true,
  lesson: {
    title: 'Why clients ask this',
    body:
      'Clients ask this because two companies can look identical on market cap alone — same share price times shares outstanding — while carrying wildly different debt. Market cap only prices the equity slice; enterprise value (EV) prices the whole business: equity plus net debt (debt minus cash), which is what a buyer actually pays to take over operations, debt included. The one-line answer: EV is the only number that lets you compare businesses on equal footing, because it does not care how each one happens to be financed. Ledgerly’s market cap is $370,000k; add $30,000k of net debt and its EV is $400,000k — the real price tag.',
    visual: {
      kind: 'bullets',
      items: [
        'Market cap: share price × shares outstanding — the equity slice only',
        'Enterprise value: market cap + net debt — the whole business',
        'Ledgerly: $370,000k equity + $30,000k net debt = $400,000k EV',
      ],
    },
  },
  task: {
    kind: 'written',
    prompt:
      'Explain to a client in two sentences why enterprise value beats market cap for comparing companies.',
    wordLimit: 80,
    rubric: [
      'Mentions that enterprise value includes debt (and subtracts cash) so it reflects the whole business, not just the shares.',
      'Notes that market cap only reflects the equity slice of the company.',
      'States that two companies with different debt loads are only comparable on enterprise value, not market cap.',
      'Keeps it to two sentences a client would actually understand, not a wall of jargon.',
    ],
    modelAnswer:
      `Market cap only prices Ledgerly's shares — $${EQUITY_VALUE.toLocaleString('en-US')}k — while enterprise value adds the $${NET_DEBT.toLocaleString('en-US')}k of net debt a buyer would also take on, for a $${ENTERPRISE_VALUE.toLocaleString('en-US')}k price tag on the whole business. That matters because two companies can share the same market cap but carry very different debt loads, so enterprise value is the only apples-to-apples number to compare them on.`,
  },
  grade(answer) {
    if (answer.kind !== 'written') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'written') throw new Error('wrong task kind')
    return offlineWrittenGrade(mission.task)
  },
  async gradeAsync(answer, mentor) {
    if (answer.kind !== 'written') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'written') throw new Error('wrong task kind')
    const result = await mentor.gradeWritten({
      missionTitle: mission.title,
      question: mission.task.prompt,
      rubric: mission.task.rubric,
      modelAnswer: mission.task.modelAnswer,
      answer: answer.text,
      wordLimit: mission.task.wordLimit,
    })
    return mentorResultToGrade(mission.task, result)
  },
}

export default mission
