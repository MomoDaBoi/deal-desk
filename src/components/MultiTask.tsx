import { useState } from 'react'
import type { Answer, MultiAnswer, MultiTask as MultiTaskType } from '../engine/types'
import { BridgeTask } from './BridgeTask'
import { SliderTask, type SliderValue } from './SliderTask'
import { QuizTask } from './QuizTask'
import { Button } from './ui'

/**
 * The capstone: several ordinary tasks played one after another. This widget
 * owns nothing about grading — it walks the player through the stages, keeps
 * each stage widget's own state so stepping back and forth never loses work,
 * and reports the built stage `Answer`s up to the mission screen.
 *
 * `value.answers` is the parent's copy (stage id -> that stage's Answer) and
 * `value.stageIndex` is which stage is on screen. The nested widgets speak
 * their own value shapes, so those live in this component's state and are
 * translated into Answers on every change.
 */

type StageAnswer = Exclude<Answer, MultiAnswer>

export type MultiValue = {
  answers: Record<string, StageAnswer>
  stageIndex: number
}

/** Bridge widget state: adjustmentId -> typed number (null while blank). */
function asBridgeState(state: unknown): Record<string, number | null> {
  return typeof state === 'object' && state !== null ? (state as Record<string, number | null>) : {}
}

/** Slider widget state: every slider's value plus the embedded question's choice. */
function asSliderState(state: unknown): SliderValue {
  return typeof state === 'object' && state !== null && 'values' in state
    ? (state as SliderValue)
    : { values: {}, choice: null }
}

/** Quiz widget state: questionId -> chosen choice id (null while unanswered). */
function asQuizState(state: unknown): Record<string, string | null> {
  return typeof state === 'object' && state !== null ? (state as Record<string, string | null>) : {}
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
  // Widget-shaped state per stage, initialised lazily the first time a stage
  // is touched. Keyed by stage id so reordering stages cannot cross wires.
  const [widgetState, setWidgetState] = useState<Record<string, unknown>>({})

  const stages = task.stages
  if (stages.length === 0) return null

  const index = Math.max(0, Math.min(stages.length - 1, value.stageIndex))
  const stage = stages[index]
  const stageTask = stage.task
  const isLast = index === stages.length - 1

  /** Store the widget's own shape and the Answer the grader will see. */
  function commit(stageId: string, widget: unknown, built: StageAnswer) {
    setWidgetState((prev) => ({ ...prev, [stageId]: widget }))
    onChange({ ...value, answers: { ...value.answers, [stageId]: built } })
  }

  function goto(next: number) {
    onChange({ ...value, stageIndex: Math.max(0, Math.min(stages.length - 1, next)) })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Progress pills: "1 Value / 2 Structure / 3 Defend" */}
      <ol className="flex flex-wrap items-center gap-1.5">
        {stages.map((s, i) => {
          const done = value.answers[s.id] !== undefined
          const current = i === index
          const look = current
            ? 'bg-panel-2 border-ink text-ink'
            : done
              ? 'bg-revenue/15 border-revenue/50 text-revenue'
              : 'bg-panel border-line text-muted'
          return (
            <li
              key={s.id}
              aria-current={current ? 'step' : undefined}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${look}`}
            >
              <span className="font-mono tabular-nums opacity-70">{i + 1}</span>
              <span className="truncate">{s.title}</span>
            </li>
          )
        })}
      </ol>

      {/* Current stage */}
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold text-ink">{stage.title}</h3>
        {stage.intro && <p className="text-sm text-muted">{stage.intro}</p>}
      </div>

      {stageTask.kind === 'bridge' ? (
        <BridgeTask
          task={stageTask}
          value={asBridgeState(widgetState[stage.id])}
          onChange={(next) => commit(stage.id, next, { kind: 'bridge', values: next })}
          disabled={disabled}
        />
      ) : stageTask.kind === 'slider' ? (
        <SliderTask
          task={stageTask}
          value={asSliderState(widgetState[stage.id])}
          onChange={(next) => commit(stage.id, next, { kind: 'slider', values: next.values, choice: next.choice })}
          disabled={disabled}
        />
      ) : stageTask.kind === 'quiz' ? (
        // Capstone stages are never on the clock: no onTimeout is passed, so
        // the player can think the whole way through the deal.
        <QuizTask
          task={stageTask}
          value={asQuizState(widgetState[stage.id])}
          onChange={(next) => commit(stage.id, next, { kind: 'quiz', choices: next, timedOut: false })}
          disabled={disabled}
        />
      ) : (
        <p className="text-cost text-sm font-semibold">Unsupported stage kind</p>
      )}

      {/* Stage navigation */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => goto(index - 1)} disabled={disabled || index === 0}>
          Back
        </Button>
        {isLast ? (
          <span className="text-sm text-muted text-right">All stages done. Tap Submit.</span>
        ) : (
          <Button className="min-h-11" onClick={() => goto(index + 1)} disabled={disabled}>
            Next stage
          </Button>
        )}
      </div>
    </div>
  )
}
