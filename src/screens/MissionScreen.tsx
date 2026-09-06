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
import { Dialog, type Expression } from '../components/Dialog'
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
import { LessonVisual } from '../components/LessonVisual'
import { AskMd } from '../components/AskMd'
import { MentorError } from '../lib/mentor-error'
import { loadMentor } from '../lib/mentor'
import { playSound } from '../lib/sounds'
import { Px } from '../pixel/Px'
import { PORTRAITS } from '../pixel/sprites/portraits'
import { useMusic } from '../lib/music'
import {
  EMBLEM_BONUS,
  EMBLEM_BOSS,
  EMBLEM_DEAL,
  EMBLEM_REVIEW,
  EMBLEM_SENT,
  ICON_CHECK,
  ICON_CLOCK,
  ICON_COIN,
  ICON_CROSS,
  ICON_WARNING,
} from '../pixel/sprites/icons'

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
  const goBack = useNav((s) => s.goBack)
  const recordAttempt = useProgress((s) => s.recordAttempt)
  const markBonusSeen = useProgress((s) => s.markBonusSeen)
  const mentor = useMentorMode()
  const [phase, setPhase] = useState<Phase>({ name: 'lesson' })
  useMusic(phase.name === 'bonus' ? 'bonus' : mission.boss ? 'boss' : 'office')
  const [seed, setSeed] = useState(() => Date.now())
  const startedAt = useRef<number>(0)
  const submitted = useRef(false)

  const task = mission.task
  const state = useTaskState(task, seed)

  function startTask() {
    // Peeking at the lesson mid-task must not reset the clock.
    if (startedAt.current === 0) startedAt.current = performance.now()
    submitted.current = false
    playSound('open')
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
    playSound(grade.accuracy === 1 ? 'perfect' : comp.passed ? 'pass' : 'fail')
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
      playSound('bonus')
      return setPhase({ name: 'bonus' })
    }
    goBack(mission.id)
  }

  const back = () => goBack(mission.id)
  const speaker = mission.boss ? 'The MD' : mission.rung >= 4 ? 'The MD' : 'Your VP'
  const speakerPortrait = PORTRAITS.md

  if (phase.name === 'lesson') {
    return (
      <Page title={mission.title} onBack={back}>
        <div className="flex items-center gap-2 mb-3">
          {mission.boss && <Px sprite={EMBLEM_BOSS} scale={1} />}
          <Eyebrow>
            {mission.boss ? 'Boss fight' : 'Briefing'} · {RUNG_TITLES[mission.rung]}
          </Eyebrow>
        </div>
        <h1 className="px-h1 mb-4 px-shadow">{mission.lesson.title}</h1>
        <Dialog portrait={speakerPortrait} expression={mission.boss ? 'annoyed' : 'neutral'} name={speaker} text={mission.lesson.body}>
          <div className="mt-2 border-t-2 border-dashed border-[#bfb39c] pt-2">
            <LessonBullets mission={mission} />
          </div>
        </Dialog>
        <div className="mt-4 flex items-center gap-3 text-sm text-muted">
          <span className="flex items-center gap-1">
            <Px sprite={ICON_CLOCK} scale={1} /> par {mission.parSeconds}s
          </span>
          <span className="flex items-center gap-1">
            <Px sprite={ICON_COIN} scale={1} /> {formatComp(mission.baseComp)}
          </span>
          <span className="ml-auto text-xs">
            {task.kind === 'quiz' && task.timeLimitSeconds ? `Hard limit ${task.timeLimitSeconds}s.` : 'Accuracy is the job. Speed is a bonus.'}
          </span>
        </div>
        <BottomBar>
          <Button className="flex-1" onClick={startTask}>
            {mission.boss ? 'Walk in' : 'Got it, start'}
          </Button>
        </BottomBar>
      </Page>
    )
  }

  if (phase.name === 'task') {
    const quizTimed = task.kind === 'quiz' && !!task.timeLimitSeconds
    return (
      <Page title={mission.title} onBack={back} right={quizTimed ? null : <Timer startedAt={startedAt.current} />}>
        <div className="px-box px-box-paper px-3 py-2 mb-4 text-base">
          <span className="px-eyebrow text-[#5b5670] block mb-1">The ask</span>
          {task.prompt}
        </div>
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
          {task.kind === 'multi' && state.multi.stageIndex > 0 ? (
            <Button variant="ghost" onClick={() => state.setMulti({ ...state.multi, stageIndex: state.multi.stageIndex - 1 })}>
              Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setPhase({ name: 'lesson' })}>
              Brief
            </Button>
          )}
          {task.kind === 'multi' && state.multi.stageIndex < task.stages.length - 1 ? (
            <Button className="flex-1" onClick={() => state.setMulti({ ...state.multi, stageIndex: state.multi.stageIndex + 1 })}>
              Next stage
            </Button>
          ) : (
            <Button className="flex-1" onClick={() => submit()}>
              Send it
            </Button>
          )}
        </BottomBar>
      </Page>
    )
  }

  if (phase.name === 'result') {
    const { grade, comp, newBest, elapsed } = phase
    const pct = Math.round(grade.accuracy * 100)
    const finale = comp.passed && mission.finale ? mission.finale : null
    const expression: Expression = grade.accuracy === 1 ? 'pleased' : comp.passed ? 'smug' : 'annoyed'
    return (
      <Page title={mission.title} onBack={back}>
        {finale ? (
          <div className="text-center mb-4 px-pop">
            <Px sprite={EMBLEM_DEAL} scale={3} className="px-float" />
            <Eyebrow className="mt-2">{finale.eyebrow}</Eyebrow>
            <h1 className="px-h1 mt-1 px-shadow">{finale.title}</h1>
            <p className="mt-2 text-muted">{finale.body}</p>
          </div>
        ) : (
          <Eyebrow className={`mb-2 ${comp.passed ? '' : '!text-cost'}`}>{comp.passed ? 'Result' : 'Result · fail'}</Eyebrow>
        )}
        <Dialog portrait={PORTRAITS.md} expression={expression} name="The MD" text={grade.verdict} className={comp.passed ? '' : 'px-shake'} />

        <Panel className="mt-3" tone="dark">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Accuracy" value={`${pct}%`} tone={grade.accuracy === 1 ? 'text-revenue' : comp.passed ? '' : 'text-cost'} />
            <Stat label="Time" value={`${Math.round(elapsed)}s`} tone={elapsed < mission.parSeconds ? 'text-cash' : 'text-muted'} />
            <CompStat value={comp.total} />
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
                  <span className="px-num text-[9px] text-muted w-4 text-right shrink-0 pt-1">{i + 1}</span>
                  <Px sprite={d.ok ? ICON_CHECK : ICON_CROSS} scale={1} className="mt-0.5" />
                  <span className="min-w-0">
                    <span>{labelFor(task, d.id)}</span>
                    {d.note && (!d.ok || task.kind === 'auction' || task.kind === 'multi') && (
                      <span className="block text-muted text-xs mt-0.5">{d.note}</span>
                    )}
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
            {comp.passed ? 'Continue' : 'Back to the floor'}
          </Button>
        </BottomBar>
      </Page>
    )
  }

  if (phase.name === 'grading') {
    return (
      <Page title={mission.title}>
        <div className="text-center mt-16 px-pop">
          <Px sprite={EMBLEM_SENT} scale={3} animate />
          <Eyebrow className="mt-3">Sent upstairs</Eyebrow>
          <h1 className="px-h1 mt-1">The MD is reading it.</h1>
          <p className="mt-2 text-muted">Usually a few seconds. Occasionally a few seconds and a sigh.</p>
        </div>
      </Page>
    )
  }

  if (phase.name === 'gradeError') {
    return (
      <Page title={mission.title} onBack={back}>
        <div className="flex items-center gap-2">
          <Px sprite={ICON_WARNING} scale={2} />
          <Eyebrow>No reply</Eyebrow>
        </div>
        <h1 className="px-h1 mt-2 text-cost">{phase.message}</h1>
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
        <div className="flex items-center gap-3 mb-3">
          <Px sprite={EMBLEM_REVIEW} scale={2} />
          <div>
            <Eyebrow>HR would like a word</Eyebrow>
            <h1 className="px-h2 mt-1 text-cost">{reviewLine(mission.id)}</h1>
          </div>
        </div>
        <Dialog
          portrait={PORTRAITS.hr}
          expression="annoyed"
          name="HR"
          text="Three misses in a row. Nobody is getting fired. Here is what went wrong, then the briefing again."
        />
        <Panel className="mt-4">
          <Eyebrow>Why</Eyebrow>
          <p className="mt-2 leading-relaxed">{phase.grade.explanation}</p>
        </Panel>
        <Panel className="mt-4" tone="paper">
          <div className="px-h2 mb-2">{mission.lesson.title}</div>
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
      <Confetti />
      <div className="text-center mt-8 relative px-pop">
        <Px sprite={EMBLEM_BONUS} scale={4} animate className="px-float" />
        <Eyebrow className="mt-3 !text-gold">Bonus season</Eyebrow>
        <h1 className="px-h1 mt-1 px-shadow">Perfect floor.</h1>
        <div className="mt-4 text-left">
          <Dialog portrait={PORTRAITS.md} expression="pleased" name="The MD" text={`Every ${RUNG_TITLES[mission.rung]} mission at full comp. ${bonusLine(mission.id)}`} />
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 px-num text-2xl text-revenue">
          <Px sprite={ICON_COIN} scale={2} animate />
          <CountUp value={st.earned} />
        </div>
      </div>
      <BottomBar>
        <Button variant="gold" className="flex-1" onClick={() => goBack(mission.id)}>
          Back to the floor
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
  const [auction, setAuction] = useState<{ bids: number[]; walked: boolean }>({ bids: [], walked: false })
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
    setAuction({ bids: [], walked: false })
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
        return { kind: 'auction', bids: auction.bids, walked: auction.walked }
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
  return <LessonVisual visual={mission.lesson.visual} />
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
      <div className={`px-num text-sm ${tone}`}>{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  )
}

/** Comp stat that counts up with a coin sound, like a score tally. */
function CompStat({ value }: { value: number }) {
  return (
    <div>
      <div className="px-num text-sm text-revenue flex items-center justify-center gap-1">
        <Px sprite={ICON_COIN} scale={1} animate />
        <CountUp value={value} />
      </div>
      <div className="text-xs text-muted mt-1">Comp</div>
    </div>
  )
}

function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const dur = 700
    let raf = 0
    let lastTick = -1
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      setN(Math.round(value * eased))
      const tick = Math.floor(t * 8)
      if (tick !== lastTick && t < 1 && value > 0) {
        lastTick = tick
        playSound('coin')
      }
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <span>{formatComp(n)}</span>
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        delay: `${(i % 9) * 0.25}s`,
        dur: `${2.2 + (i % 5) * 0.4}s`,
        color: ['#4fc46a', '#f2b632', '#4a7ad9', '#d94a4a', '#3bbfb0', '#f4f4f8'][i % 6],
      })),
    [],
  )
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden>
      {pieces.map((p, i) => (
        <span key={i} className="px-confetti" style={{ left: p.left, animationDelay: p.delay, animationDuration: p.dur, background: p.color }} />
      ))}
    </div>
  )
}

/** Reads the authoritative attempt clock so peeking at the brief does not reset it. */
function Timer({ startedAt }: { startedAt: number }) {
  const [t, setT] = useState(() => Math.floor((performance.now() - startedAt) / 1000))
  useEffect(() => {
    const id = setInterval(() => setT(Math.floor((performance.now() - startedAt) / 1000)), 250)
    return () => clearInterval(id)
  }, [startedAt])
  return (
    <span className="px-num text-[10px] text-muted tabular-nums flex items-center gap-1">
      <Px sprite={ICON_CLOCK} scale={1} />
      {t}s
    </span>
  )
}
