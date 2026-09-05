import { useEffect, useMemo, useRef, useState } from 'react'
import type { Answer, GradeResult, Mission, MultiAnswer, OrderItem, Task } from '../engine/types'
import { RUNG_TITLES } from '../engine/types'
import { computeComp, formatComp, rungStatus, type CompBreakdown } from '../engine/scoring'
import { shuffle } from '../engine/graders'
import { bonusLine, reviewLine } from '../engine/voice'
import { missionsForRung } from '../missions'
import { useNav } from '../store/nav'
import { useProgress } from '../store/progress'
import { useMentorMode } from '../store/settings'
import { BottomBar, Button, Eyebrow, Page, Panel } from '../components/ui'
import { OrderTask } from '../components/OrderTask'
import { SortTask } from '../components/SortTask'
import { BalanceTask } from '../components/BalanceTask'
import { QuizTask } from '../components/QuizTask'
import { SliderTask } from '../components/SliderTask'
import { WaterfallTask } from '../components/WaterfallTask'
import { BridgeTask } from '../components/BridgeTask'
import { FootballFieldTask } from '../components/FootballFieldTask'
import { WrittenTask } from '../components/WrittenTask'
import { HeatmapTask } from '../components/HeatmapTask'
import { AuctionTask } from '../components/AuctionTask'
import { MultiTask } from '../components/MultiTask'
import { AskMd } from '../components/AskMd'
import { MentorError } from '../lib/mentor-error'
import { loadMentor } from '../lib/mentor'

type Phase =
  | { name: 'lesson' }
  | { name: 'task' }
  | { name: 'result'; grade: GradeResult; comp: CompBreakdown; newBest: boolean; elapsed: number; answer: Answer }
  | { name: 'review'; grade: GradeResult }
  | { name: 'bonus' }
  | { name: 'grading' }
  | { name: 'gradeError'; message: string }

/**
 * Mission engine: lesson card -> task -> result -> (review | bonus | back).
 * Task rendering and answer assembly are dispatched on `mission.task.kind`.
 * To add a kind: add a widget, a state slot in `useTaskState`, a case in
 * `buildAnswer`, and a case in the task phase render.
 */
export function MissionScreen({ mission }: { mission: Mission }) {
  const go = useNav((s) => s.go)
  const recordAttempt = useProgress((s) => s.recordAttempt)
  const markBonusSeen = useProgress((s) => s.markBonusSeen)
  const mentor = useMentorMode()

  const [phase, setPhase] = useState<Phase>({ name: 'lesson' })
  const [seed, setSeed] = useState(() => Date.now())
  const startedAt = useRef<number>(0)
  const submitted = useRef(false)

  const task = mission.task
  const state = useTaskState(task, seed)

  function startTask() {
    // Peeking at the lesson mid-task must not reset the clock.
    if (startedAt.current === 0) startedAt.current = performance.now()
    submitted.current = false
    setPhase({ name: 'task' })
  }

  function retry() {
    setSeed(Date.now())
    state.reset()
    startedAt.current = 0
    startTask()
  }

  function submit(opts: { timedOut?: boolean } = {}) {
    if (submitted.current) return
    submitted.current = true
    const elapsed = (performance.now() - startedAt.current) / 1000
    const answer = state.buildAnswer(opts.timedOut ?? false)
    const gradeAsync = mission.gradeAsync
    if (gradeAsync && mentor) {
      setPhase({ name: 'grading' })
      loadMentor()
        .then((client) => {
          if (!client) throw new MentorError('auth', 'No key saved. Add one in Settings.')
          return gradeAsync(answer, client)
        })
        .then((grade) => finishGrade(grade, elapsed, answer))
        .catch((e: unknown) => {
          submitted.current = false
          const message = e instanceof MentorError ? e.message : 'The MD did not answer. Try again.'
          setPhase({ name: 'gradeError', message })
        })
      return
    }
    finishGrade(mission.grade(answer), elapsed, answer)
  }

  function finishGrade(grade: GradeResult, elapsed: number, answer: Answer) {
    const comp = computeComp(mission, grade.accuracy, elapsed)
    const { newBest, needsReview } = recordAttempt({
      missionId: mission.id,
      accuracy: grade.accuracy,
      comp: comp.total,
      elapsedSeconds: elapsed,
    })
    if (needsReview) return setPhase({ name: 'review', grade })
    setPhase({ name: 'result', grade, comp, newBest, elapsed, answer })
  }

  function finish() {
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
        <Eyebrow>
          {mission.boss ? 'Boss fight' : 'Lesson'} · {RUNG_TITLES[mission.rung]}
        </Eyebrow>
        <h1 className="text-2xl font-black mt-1 mb-4">{mission.lesson.title}</h1>
        <Panel>
          <p className="leading-relaxed">{mission.lesson.body}</p>
          <LessonBullets mission={mission} />
        </Panel>
        <p className="mt-4 text-sm text-muted">
          Par time {mission.parSeconds}s. Base comp {formatComp(mission.baseComp)}.
          {task.kind === 'quiz' && task.timeLimitSeconds ? ` Hard limit ${task.timeLimitSeconds}s.` : ' Speed is a bonus, accuracy is the job.'}
        </p>
        <BottomBar>
          <Button className="flex-1" onClick={startTask}>
            {mission.boss ? 'Walk in' : 'Start the task'}
          </Button>
        </BottomBar>
      </Page>
    )
  }

  if (phase.name === 'task') {
    const quizTimed = task.kind === 'quiz' && !!task.timeLimitSeconds
    return (
      <Page title={mission.title} onBack={back} right={quizTimed ? null : <Timer />}>
        <p className="mb-4 font-medium">{task.prompt}</p>
        {task.kind === 'order' && <OrderTask items={state.order} onChange={state.setOrder} />}
        {task.kind === 'sort' && <SortTask task={task} items={state.sortItems} value={state.sort} onChange={state.setSort} />}
        {task.kind === 'balance' && <BalanceTask task={task} value={state.balance} onChange={state.setBalance} />}
        {task.kind === 'quiz' && (
          <QuizTask
            task={task}
            value={state.quiz}
            onChange={state.setQuiz}
            onTimeout={() => submit({ timedOut: true })}
            startedAt={startedAt.current}
          />
        )}
        {task.kind === 'slider' && <SliderTask task={task} value={state.slider} onChange={state.setSlider} />}
        {task.kind === 'waterfall' && <WaterfallTask task={task} value={state.waterfall} onChange={state.setWaterfall} />}
        {task.kind === 'bridge' && <BridgeTask task={task} value={state.bridge} onChange={state.setBridge} />}
        {task.kind === 'footballfield' && <FootballFieldTask task={task} value={state.ff} onChange={state.setFf} />}
        {task.kind === 'written' && <WrittenTask task={task} value={state.written} onChange={state.setWritten} />}
        {task.kind === 'heatmap' && <HeatmapTask task={task} value={state.heatmap} onChange={state.setHeatmap} />}
        {task.kind === 'auction' && <AuctionTask task={task} value={state.auction} onChange={state.setAuction} />}
        {task.kind === 'multi' && <MultiTask task={task} value={state.multi} onChange={state.setMulti} />}
        <BottomBar>
          <Button variant="ghost" onClick={() => setPhase({ name: 'lesson' })}>
            Lesson
          </Button>
          <Button className="flex-1" onClick={() => submit()}>
            Submit
          </Button>
        </BottomBar>
      </Page>
    )
  }

  if (phase.name === 'result') {
    const { grade, comp, newBest, elapsed } = phase
    const pct = Math.round(grade.accuracy * 100)
    const finale = comp.passed && mission.finale ? mission.finale : null
    return (
      <Page title={mission.title} onBack={back}>
        {finale ? (
          <div className="text-center mb-4">
            <div className="text-6xl">{finale.emoji ?? '🥂'}</div>
            <Eyebrow>{finale.eyebrow}</Eyebrow>
            <h1 className="text-3xl font-black mt-1">{finale.title}</h1>
            <p className="mt-2 text-muted">{finale.body}</p>
            <p className="mt-3 font-semibold">{grade.verdict}</p>
          </div>
        ) : (
          <>
            <Eyebrow>{comp.passed ? 'Result' : 'Result · fail'}</Eyebrow>
            <h1 className={`text-2xl font-black mt-1 ${comp.passed ? '' : 'text-cost'}`}>{grade.verdict}</h1>
          </>
        )}

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

        {grade.details && grade.details.length > 0 && (
          <Panel className="mt-3">
            <Eyebrow>{detailsTitle(task)}</Eyebrow>
            <ol className="mt-2 flex flex-col gap-2">
              {grade.details.map((d, i) => (
                <li key={d.id} className="flex gap-3 text-sm items-start">
                  <span className="font-mono text-muted w-4 text-right shrink-0">{i + 1}</span>
                  <span className={`shrink-0 ${d.ok ? 'text-revenue' : 'text-cost'}`}>{d.ok ? '✓' : '✗'}</span>
                  <span className="min-w-0">
                    <span>{labelFor(task, d.id)}</span>
                    {!d.ok && d.note && <span className="block text-muted text-xs mt-0.5">{d.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        )}

        {mentor && <div className="mt-3"><AskMd mission={mission} grade={grade} /></div>}

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

  if (phase.name === 'grading') {
    return (
      <Page title={mission.title}>
        <div className="text-center mt-16">
          <div className="text-5xl">📠</div>
          <Eyebrow>Sent upstairs</Eyebrow>
          <h1 className="text-2xl font-black mt-1">The MD is reading it.</h1>
          <p className="mt-2 text-muted">Usually a few seconds. Occasionally a few seconds and a sigh.</p>
        </div>
      </Page>
    )
  }

  if (phase.name === 'gradeError') {
    return (
      <Page title={mission.title} onBack={back}>
        <Eyebrow>No reply</Eyebrow>
        <h1 className="text-2xl font-black mt-1 text-cost">{phase.message}</h1>
        <p className="mt-2 text-muted">Your answer is still here. Check the key in Settings if this keeps happening.</p>
        <BottomBar>
          <Button variant="ghost" onClick={() => go({ name: 'settings' })}>
            Settings
          </Button>
          <Button className="flex-1" onClick={() => { setPhase({ name: 'task' }) }}>
            Back to my answer
          </Button>
        </BottomBar>
      </Page>
    )
  }

  if (phase.name === 'review') {
    return (
      <Page title="Performance review" onBack={back}>
        <Eyebrow>HR would like a word</Eyebrow>
        <h1 className="text-2xl font-black mt-1 text-cost">{reviewLine(mission.id)}</h1>
        <p className="mt-2 text-muted">Three misses in a row. Nobody is getting fired. Here is what went wrong, then the lesson again.</p>
        <Panel className="mt-4">
          <Eyebrow>Why</Eyebrow>
          <p className="mt-2 leading-relaxed">{phase.grade.explanation}</p>
        </Panel>
        <Panel className="mt-4">
          <div className="font-bold mb-2">{mission.lesson.title}</div>
          <p className="leading-relaxed">{mission.lesson.body}</p>
          <LessonBullets mission={mission} />
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
          Every {RUNG_TITLES[mission.rung]} mission at full comp. {bonusLine(mission.id)}
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

/** Per-kind answer state. One hook so the screen stays kind-agnostic. */
function useTaskState(task: Task, seed: number) {
  const orderShuffled = useMemo(() => shuffle(task.kind === 'order' ? task.items : [], seed), [task, seed])
  const sortItems = useMemo(() => shuffle(task.kind === 'sort' ? task.items : [], seed), [task, seed])

  const [order, setOrder] = useState<OrderItem[]>(orderShuffled)
  const [sort, setSort] = useState<Record<string, string>>({})
  const [balance, setBalance] = useState<Record<string, number | null>>({})
  const [quiz, setQuiz] = useState<Record<string, string | null>>({})
  const [slider, setSlider] = useState<{ values: Record<string, number>; choice: string | null }>({ values: {}, choice: null })
  const [waterfall, setWaterfall] = useState<Record<string, number | null>>({})
  const [bridge, setBridge] = useState<Record<string, number | null>>({})
  const [ff, setFf] = useState<{ ranges: Record<string, { low: number; high: number }>; choice: string | null }>({ ranges: {}, choice: null })
  const [written, setWritten] = useState<{ text: string; answers: Record<string, string> }>({ text: '', answers: {} })
  const [heatmap, setHeatmap] = useState<{ values: Record<string, number | null>; tapped: string | null }>({ values: {}, tapped: null })
  const [auction, setAuction] = useState<{ bids: number[] }>({ bids: [] })
  const [multi, setMulti] = useState<{ answers: Record<string, Exclude<Answer, MultiAnswer>>; stageIndex: number }>({ answers: {}, stageIndex: 0 })

  useEffect(() => setOrder(orderShuffled), [orderShuffled])

  function reset() {
    setSort({})
    setBalance({})
    setQuiz({})
    setSlider({ values: {}, choice: null })
    setWaterfall({})
    setBridge({})
    setFf({ ranges: {}, choice: null })
    setWritten({ text: '', answers: {} })
    setHeatmap({ values: {}, tapped: null })
    setAuction({ bids: [] })
    setMulti({ answers: {}, stageIndex: 0 })
  }

  function buildAnswer(timedOut: boolean): Answer {
    switch (task.kind) {
      case 'order':
        return { kind: 'order', orderedIds: order.map((o) => o.id) }
      case 'sort':
        return { kind: 'sort', placements: sort }
      case 'balance':
        return { kind: 'balance', values: balance }
      case 'quiz':
        return { kind: 'quiz', choices: quiz, timedOut }
      case 'slider':
        return { kind: 'slider', values: slider.values, choice: slider.choice }
      case 'waterfall':
        return { kind: 'waterfall', values: waterfall }
      case 'bridge':
        return { kind: 'bridge', values: bridge }
      case 'footballfield':
        return { kind: 'footballfield', ranges: ff.ranges, choice: ff.choice }
      case 'written':
        return { kind: 'written', text: written.text, answers: written.answers }
      case 'heatmap':
        return { kind: 'heatmap', values: heatmap.values, tapped: heatmap.tapped }
      case 'auction':
        return { kind: 'auction', bids: auction.bids }
      case 'multi':
        return { kind: 'multi', answers: multi.answers }
    }
  }

  return {
    order, setOrder, sortItems, sort, setSort, balance, setBalance, quiz, setQuiz,
    slider, setSlider, waterfall, setWaterfall, bridge, setBridge, ff, setFf, written, setWritten,
    heatmap, setHeatmap, auction, setAuction, multi, setMulti,
    reset, buildAnswer,
  }
}

function LessonBullets({ mission }: { mission: Mission }) {
  const v = mission.lesson.visual
  if (!v || v.kind !== 'bullets') return null
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {v.items.map((b, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="font-mono text-muted w-4 text-right shrink-0">{i + 1}</span>
          <span>{b}</span>
        </li>
      ))}
    </ul>
  )
}

function labelFor(task: Task, id: string): string {
  switch (task.kind) {
    case 'order':
    case 'sort':
      return task.items.find((i) => i.id === id)?.label ?? id
    case 'balance':
      for (const s of task.sections) {
        const l = s.lines.find((x) => x.id === id)
        if (l) return l.label
      }
      return id
    case 'quiz':
      return task.questions.find((q) => q.id === id)?.text ?? id
    case 'slider':
      return id === 'question' ? (task.question?.text ?? id) : (task.sliders.find((x) => x.id === id)?.label ?? id)
    case 'waterfall':
      return task.steps.find((x) => x.id === id)?.label ?? id
    case 'bridge':
      return id === 'reconcile' ? `Bars reconcile to ${task.end.label}` : (task.adjustments.find((x) => x.id === id)?.label ?? id)
    case 'footballfield':
      return id === 'question' ? (task.question?.text ?? id) : (task.rows.find((x) => x.id === id)?.label ?? id)
    case 'written':
      return task.questions?.find((q) => q.id === id)?.text ?? id
    case 'heatmap': {
      if (id === 'tap') return task.tap?.prompt ?? id
      const [r, c] = id.split(':')
      const row = task.rows.find((x) => x.id === r)?.label ?? r
      const col = task.cols.find((x) => x.id === c)?.label ?? c
      return `${task.rowsLabel} ${row}, ${task.colsLabel} ${col}`
    }
    case 'auction':
      return id === 'outcome' ? 'Outcome' : `Round ${id.replace('round', '')}`
    case 'multi':
      return task.stages.find((x) => x.id === id)?.title ?? id
  }
}

function detailsTitle(task: Task): string {
  switch (task.kind) {
    case 'order':
      return 'Correct order'
    case 'sort':
      return 'Where things belong'
    case 'balance':
      return 'The blanks'
    case 'quiz':
      return 'Question by question'
    case 'slider':
      return 'Where the dials landed'
    case 'waterfall':
      return 'The bars'
    case 'bridge':
      return 'The bridge'
    case 'footballfield':
      return 'The ranges'
    case 'written':
      return 'What the MD marked'
    case 'heatmap':
      return 'The cells'
    case 'auction':
      return 'Round by round'
    case 'multi':
      return 'Stage by stage'
  }
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
