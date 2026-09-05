import { useEffect, useMemo, useRef, useState } from 'react'
import type { GradeResult, Mission, OrderItem } from '../engine/types'
import { RUNG_TITLES } from '../engine/types'
import { computeComp, formatComp, rungStatus, type CompBreakdown } from '../engine/scoring'
import { shuffle } from '../engine/graders'
import { missionsForRung } from '../missions'
import { useNav } from '../store/nav'
import { useProgress } from '../store/progress'
import { useMentorMode } from '../store/settings'
import { BottomBar, Button, Eyebrow, Page, Panel } from '../components/ui'
import { OrderTask } from '../components/OrderTask'

type Phase =
  | { name: 'lesson' }
  | { name: 'task' }
  | { name: 'result'; grade: GradeResult; comp: CompBreakdown; newBest: boolean; elapsed: number }
  | { name: 'review' }
  | { name: 'bonus' }

/**
 * Mission engine: lesson card -> task -> result -> (review | bonus | back).
 * Task rendering is dispatched on `mission.task.kind`. New kinds plug in here.
 */
export function MissionScreen({ mission }: { mission: Mission }) {
  const go = useNav((s) => s.go)
  const recordAttempt = useProgress((s) => s.recordAttempt)
  const markBonusSeen = useProgress((s) => s.markBonusSeen)
  const mentor = useMentorMode()

  const [phase, setPhase] = useState<Phase>({ name: 'lesson' })
  const [seed, setSeed] = useState(() => Date.now())
  const startedAt = useRef<number>(0)

  const shuffled = useMemo(() => shuffle(mission.task.items, seed), [mission, seed])
  const [order, setOrder] = useState<OrderItem[]>(shuffled)
  useEffect(() => setOrder(shuffled), [shuffled])

  function startTask() {
    startedAt.current = performance.now()
    setPhase({ name: 'task' })
  }

  function retry() {
    setSeed(Date.now())
    startTask()
  }

  function submit() {
    const elapsed = (performance.now() - startedAt.current) / 1000
    const grade = mission.grade({ kind: 'order', orderedIds: order.map((o) => o.id) })
    const comp = computeComp(mission, grade.accuracy, elapsed)
    const { newBest, needsReview } = recordAttempt({
      missionId: mission.id,
      accuracy: grade.accuracy,
      comp: comp.total,
      elapsedSeconds: elapsed,
    })
    if (needsReview) return setPhase({ name: 'review' })
    setPhase({ name: 'result', grade, comp, newBest, elapsed })
  }

  function finish() {
    // Bonus season fires the first time a rung goes perfect.
    const best = useProgress.getState().best
    const seen = useProgress.getState().bonusSeen
    const st = rungStatus(missionsForRung(mission.rung, mentor), best)
    if (st.perfect && !seen.includes(mission.rung)) {
      markBonusSeen(mission.rung)
      return setPhase({ name: 'bonus' })
    }
    go({ name: 'rung', rung: mission.rung })
  }

  const back = () => go({ name: 'rung', rung: mission.rung })

  if (phase.name === 'lesson') {
    return (
      <Page title={mission.title} onBack={back}>
        <Eyebrow>Lesson · {RUNG_TITLES[mission.rung]}</Eyebrow>
        <h1 className="text-2xl font-black mt-1 mb-4">{mission.lesson.title}</h1>
        <Panel>
          <p className="leading-relaxed">{mission.lesson.body}</p>
          {mission.lesson.visual?.kind === 'bullets' && (
            <ul className="mt-4 flex flex-col gap-2">
              {mission.lesson.visual.items.map((b, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="font-mono text-muted w-4 text-right">{i + 1}</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <p className="mt-4 text-sm text-muted">
          Par time {mission.parSeconds}s. Base comp {formatComp(mission.baseComp)}. Speed is a bonus, accuracy is the job.
        </p>
        <BottomBar>
          <Button className="flex-1" onClick={startTask}>
            Start the task
          </Button>
        </BottomBar>
      </Page>
    )
  }

  if (phase.name === 'task') {
    return (
      <Page title={mission.title} onBack={back} right={<Timer />}>
        <p className="mb-4 font-medium">{mission.task.prompt}</p>
        {mission.task.kind === 'order' && <OrderTask items={order} onChange={setOrder} />}
        <BottomBar>
          <Button variant="ghost" onClick={() => setPhase({ name: 'lesson' })}>
            Lesson
          </Button>
          <Button className="flex-1" onClick={submit}>
            Submit
          </Button>
        </BottomBar>
      </Page>
    )
  }

  if (phase.name === 'result') {
    const { grade, comp, newBest, elapsed } = phase
    const pct = Math.round(grade.accuracy * 100)
    return (
      <Page title={mission.title} onBack={back}>
        <Eyebrow>{comp.passed ? 'Result' : 'Result · fail'}</Eyebrow>
        <h1 className={`text-2xl font-black mt-1 ${comp.passed ? '' : 'text-cost'}`}>{grade.verdict}</h1>

        <Panel className="mt-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Accuracy" value={`${pct}%`} tone={grade.accuracy === 1 ? 'text-revenue' : comp.passed ? '' : 'text-cost'} />
            <Stat label="Time" value={`${Math.round(elapsed)}s`} tone={elapsed < mission.parSeconds ? 'text-cash' : 'text-muted'} />
            <Stat label="Comp" value={formatComp(comp.total)} tone="text-revenue" />
          </div>
          <div className="mt-3 text-xs text-muted text-center">
            {formatComp(comp.accuracyComp)} for accuracy
            {comp.speedBonus > 0 && <> + {formatComp(comp.speedBonus)} speed bonus</>}
            {newBest && <span className="text-debt"> · new best</span>}
          </div>
        </Panel>

        <Panel className="mt-3">
          <Eyebrow>Why</Eyebrow>
          <p className="mt-2 leading-relaxed">{grade.explanation}</p>
        </Panel>

        {grade.details && mission.task.kind === 'order' && (
          <Panel className="mt-3">
            <Eyebrow>Correct order</Eyebrow>
            <ol className="mt-2 flex flex-col gap-1.5">
              {mission.task.items.map((it, i) => {
                const d = grade.details!.find((x) => x.id === it.id)
                return (
                  <li key={it.id} className="flex gap-3 text-sm items-center">
                    <span className="font-mono text-muted w-4 text-right">{i + 1}</span>
                    <span className={d?.ok ? 'text-revenue' : 'text-cost'}>{d?.ok ? '✓' : '✗'}</span>
                    <span>{it.label}</span>
                  </li>
                )
              })}
            </ol>
          </Panel>
        )}

        {mentor && (
          <Panel className="mt-3 text-sm text-muted">
            <span className="text-debt font-semibold">Ask the MD</span> arrives in Milestone 4.
          </Panel>
        )}

        <BottomBar>
          <Button variant="ghost" onClick={retry}>
            Retry
          </Button>
          <Button className="flex-1" onClick={finish}>
            {comp.passed ? 'Continue' : 'Back to rung'}
          </Button>
        </BottomBar>
      </Page>
    )
  }

  if (phase.name === 'review') {
    return (
      <Page title="Performance review" onBack={back}>
        <Eyebrow>HR would like a word</Eyebrow>
        <h1 className="text-2xl font-black mt-1 text-cost">Three misses in a row.</h1>
        <p className="mt-2 text-muted">Nobody is getting fired. Read the lesson again, slowly this time, then have another go.</p>
        <Panel className="mt-4">
          <div className="font-bold mb-2">{mission.lesson.title}</div>
          <p className="leading-relaxed">{mission.lesson.body}</p>
        </Panel>
        <BottomBar>
          <Button variant="ghost" onClick={back}>
            Later
          </Button>
          <Button className="flex-1" onClick={retry}>
            Try again
          </Button>
        </BottomBar>
      </Page>
    )
  }

  // bonus
  const st = rungStatus(missionsForRung(mission.rung, mentor), useProgress.getState().best)
  return (
    <Page title="Bonus season">
      <div className="text-center mt-10">
        <div className="text-6xl">🍾</div>
        <Eyebrow>Bonus season</Eyebrow>
        <h1 className="text-3xl font-black mt-1">Perfect rung.</h1>
        <p className="mt-2 text-muted">
          Every {RUNG_TITLES[mission.rung]} mission at full comp. The MD said "ok" in Slack, which is the most anyone has ever gotten.
        </p>
        <div className="mt-6 font-mono text-3xl text-revenue">{formatComp(st.earned)}</div>
      </div>
      <BottomBar>
        <Button className="flex-1" onClick={() => go({ name: 'ladder' })}>
          Back to the ladder
        </Button>
      </BottomBar>
    </Page>
  )
}

function Stat({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className={`font-mono text-xl font-bold ${tone}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}

function Timer() {
  const [t, setT] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const id = setInterval(() => setT(Math.floor((performance.now() - start) / 1000)), 250)
    return () => clearInterval(id)
  }, [])
  return <span className="font-mono text-sm text-muted tabular-nums">{t}s</span>
}
