import type { Answer, BridgeAnswer, MultiAnswer, MultiTask as MultiTaskType, QuizAnswer, SliderAnswer } from '../engine/types'
import { BridgeTask } from './BridgeTask'
import { SliderTask, type SliderValue } from './SliderTask'
import { QuizTask } from './QuizTask'

/**
 * The capstone: several ordinary tasks played one after another. This widget
 * owns nothing about grading — it walks the player through the stages and
 * reports the built stage `Answer`s up to the mission screen.
 *
 * `value.answers` is the parent's copy (stage id -> that stage's Answer) and
 * `value.stageIndex` is which stage is on screen. The nested widgets speak
 * their own value shapes, which happen to line up with (or unpack cleanly
 * from) the stored Answer shapes, so each stage's widget value is derived
 * straight from `value.answers[stage.id]` on every render — there is no
 * local widget state here. That is what makes the "peek at the lesson"
 * unmount/remount safe: the parent (MissionScreen) owns `value`, so nothing
 * is lost when this component's subtree is torn down and rebuilt.
 *
 * Stage navigation lives in the mission screen's sticky bottom bar; the
 * progress pills here are tap targets only for jumping back to an already
 * completed stage (never forward, since a stage's Answer must exist first).
 */

type StageAnswer = Exclude<Answer, MultiAnswer>

export type MultiValue = {
  answers: Record<string, StageAnswer>
  stageIndex: number
}

/** Bridge widget state: adjustmentId -> typed number (null while blank). */
function asBridgeState(answer: StageAnswer | undefined): Record<string, number | null> {
  return answer?.kind === 'bridge' ? (answer as BridgeAnswer).values : {}
}

/** Slider widget state: every slider's value plus the embedded question's choice. */
function asSliderState(answer: StageAnswer | undefined): SliderValue {
  return answer?.kind === 'slider'
    ? { values: (answer as SliderAnswer).values, choice: (answer as SliderAnswer).choice ?? null }
    : { values: {}, choice: null }
}

/** Quiz widget state: questionId -> chosen choice id (null while unanswered). */
function asQuizState(answer: StageAnswer | undefined): Record<string, string | null> {
  return answer?.kind === 'quiz' ? (answer as QuizAnswer).choices : {}
}

export function MultiTask({
  task,
  value,
  onChange,
  disabled,
}: {
  task: MultiTaskType
  value: MultiValue
  onChange: (next: MultiValue) => void
  disabled?: boolean
}) {
  const stages = task.stages
  if (stages.length === 0) return null

  const index = Math.max(0, Math.min(stages.length - 1, value.stageIndex))
  const stage = stages[index]
  const stageTask = stage.task
  const currentAnswer = value.answers[stage.id]

  /** Store the Answer the grader will see. */
  function commit(stageId: string, built: StageAnswer) {
    onChange({ ...value, answers: { ...value.answers, [stageId]: built } })
  }

  function goto(next: number) {
    onChange({ ...value, stageIndex: Math.max(0, Math.min(stages.length - 1, next)) })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Progress pills: "1 Value / 2 Structure / 3 Defend". Tapping a
          completed stage's pill jumps back to it; the current stage and any
          not-yet-reached stage are not tap targets. */}
      <ol className="flex flex-wrap items-center gap-1.5">
        {stages.map((s, i) => {
          const done = value.answers[s.id] !== undefined
          const current = i === index
          const canJump = done && !current
          const look = current
            ? 'bg-panel-2 border-ink text-ink'
            : done
              ? 'bg-revenue/15 border-revenue/50 text-revenue'
              : 'bg-panel border-line text-muted'
          const pill = (
            <span
              className="font-mono tabular-nums opacity-70 shrink-0"
              aria-hidden={true}
            >
              {i + 1}
            </span>
          )
          return (
            <li key={s.id} aria-current={current ? 'step' : undefined} className="min-w-0 max-w-full">
              {canJump ? (
                <button
                  type="button"
                  onClick={() => goto(i)}
                  disabled={disabled}
                  className={`flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${look}`}
                >
                  {pill}
                  <span className="truncate">{s.title}</span>
                </button>
              ) : (
                <span className={`flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${look}`}>
                  {pill}
                  <span className="truncate">{s.title}</span>
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {/* Current stage */}
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold text-ink break-words">{stage.title}</h3>
        {stage.intro && <p className="text-sm text-muted break-words">{stage.intro}</p>}
      </div>

      {stageTask.kind === 'bridge' ? (
        <BridgeTask
          task={stageTask}
          value={asBridgeState(currentAnswer)}
          onChange={(next) => commit(stage.id, { kind: 'bridge', values: next })}
          disabled={disabled}
        />
      ) : stageTask.kind === 'slider' ? (
        <SliderTask
          task={stageTask}
          value={asSliderState(currentAnswer)}
          onChange={(next) => commit(stage.id, { kind: 'slider', values: next.values, choice: next.choice })}
          disabled={disabled}
        />
      ) : stageTask.kind === 'quiz' ? (
        // Capstone stages are never on the clock: no onTimeout is passed, so
        // the player can think the whole way through the deal.
        <QuizTask
          task={stageTask}
          value={asQuizState(currentAnswer)}
          onChange={(next) => commit(stage.id, { kind: 'quiz', choices: next, timedOut: false })}
          disabled={disabled}
        />
      ) : (
        <p className="text-cost text-sm font-semibold">Unsupported stage kind</p>
      )}
    </div>
  )
}
