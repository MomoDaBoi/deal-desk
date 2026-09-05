import type { Mission, MentorClient } from '../engine/types'
import { offlineWrittenGrade, mentorResultToGrade } from '../engine/graders/written'
import { INDUSTRIAL_PEERS } from './companies'

/**
 * Rung 3, mentor-only written mission. The player has just built the
 * Brickhouse comp set (see r3-peer-set.ts); now they have to defend it in
 * prose to a sceptical MD. Names and reasons come straight from the company
 * bible (`INDUSTRIAL_PEERS`) so this mission always agrees with it.
 */

const REAL_PEER_NAMES = INDUSTRIAL_PEERS.filter((p) => !p.trap).map((p) => p.name)
const HALCYON = INDUSTRIAL_PEERS.find((p) => p.name === 'Halcyon Data Centres')!
const BRICKHOUSE_HOLDINGS = INDUSTRIAL_PEERS.find((p) => p.name === 'Brickhouse Holdings Pty')!

const mission: Mission = {
  id: 'm3-written-peers',
  rung: 3,
  order: 7,
  title: 'Defend the comp set',
  tagline: 'The MD is sceptical of every peer set. Convince him yours holds up.',
  baseComp: 0,
  parSeconds: 300,
  mentorOnly: true,
  lesson: {
    title: 'A peer set is half art',
    body:
      'The screen for comparable companies is mechanical: same industry, similar size and growth, publicly listed with real market data. But defending the set out loud is the actual job — an MD will poke at every name and ask why it is in or out. Naming the peers is not enough; you have to say why the exclusions are wrong to include. A data-centre operator is not an industrial manufacturer no matter how close its ticker sits on a screener, and a private company has no share price to read a multiple off. State the logic once, cleanly, and the MD stops asking.',
    visual: {
      kind: 'bullets',
      items: ['Same industry', 'Similar size and growth', 'Listed, with real market data'],
    },
  },
  task: {
    kind: 'written',
    prompt:
      'In three bullets, defend your Brickhouse peer set to a sceptical MD: who is in, who is out, and why.',
    wordLimit: 120,
    rubric: [
      `Names the industrial peers (${REAL_PEER_NAMES.join(', ')}) as the ones in the comp set`,
      `Excludes Halcyon Data Centres for being a different industry (${HALCYON.trap})`,
      `Excludes Brickhouse Holdings Pty for being private with no multiple (${BRICKHOUSE_HOLDINGS.trap})`,
      'Explains the underlying logic: same industry, similar size and growth, publicly listed with real market data',
    ],
    modelAnswer:
      `In: Palisade Doors & Docks, Dockwell Systems, Ironvale Components, and Marrow Fabrication — all industrial manufacturers at a similar scale to Brickhouse, each with a real quoted EV/EBITDA multiple. ` +
      `Out: Halcyon Data Centres — a data-centre operator, not an industrial manufacturer, so its margin and growth profile do not transfer. ` +
      `Also out: Brickhouse Holdings Pty — a private family firm with no share price, so there is no market multiple to comp against.`,
  },
  grade(answer) {
    if (answer.kind !== 'written') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'written') throw new Error('wrong task kind')
    return offlineWrittenGrade(mission.task)
  },
  async gradeAsync(answer, mentor: MentorClient) {
    if (answer.kind !== 'written') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'written') throw new Error('wrong task kind')
    const task = mission.task
    const result = await mentor.gradeWritten({
      missionTitle: mission.title,
      question: task.prompt,
      rubric: task.rubric,
      modelAnswer: task.modelAnswer,
      answer: answer.text,
      wordLimit: task.wordLimit,
    })
    return mentorResultToGrade(task, result)
  },
}

export default mission
