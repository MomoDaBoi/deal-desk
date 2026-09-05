import { useEffect, useRef, useState } from 'react'
import type { QuizTask as QuizTaskType } from '../engine/types'

/**
 * One question at a time, tap-to-answer, auto-advance. Optional whole-quiz
 * countdown fires onTimeout exactly once. No drag, no external libs.
 */
export function QuizTask({
  task,
  value,
  onChange,
  onTimeout,
  disabled,
  startedAt,
}: {
  task: QuizTaskType
  value: Record<string, string | null>
  onChange: (next: Record<string, string | null>) => void
  onTimeout?: () => void
  disabled?: boolean
  /**
   * performance.now() timestamp for when this attempt began. When provided,
   * the countdown is derived from `limit - (now - startedAt) / 1000` on every
   * tick, so unmounting and remounting this widget (e.g. the player peeks at
   * the lesson) does not restart the clock. When absent, the clock starts
   * from this component's own mount time, as before.
   */
  startedAt?: number
}) {
  const questions = task.questions
  const [index, setIndex] = useState(0)
  const current = questions[index]

  const limit = task.timeLimitSeconds
  const [remaining, setRemaining] = useState(() => {
    if (!limit) return 0
    if (startedAt != null) return Math.max(0, limit - (performance.now() - startedAt) / 1000)
    return limit
  })
  const firedRef = useRef(false)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onTimeoutRef = useRef(onTimeout)
  useEffect(() => {
    onTimeoutRef.current = onTimeout
  })

  useEffect(() => {
    if (!limit || disabled) return
    const start = startedAt ?? performance.now()
    firedRef.current = false

    const tick = () => {
      const elapsed = (performance.now() - start) / 1000
      const left = Math.max(0, limit - elapsed)
      setRemaining(left)
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true
        onTimeoutRef.current?.()
      }
    }

    tick()
    if (firedRef.current) return
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [limit, disabled, startedAt])

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    }
  }, [])

  if (!current) return null

  function pick(choiceId: string) {
    if (disabled) return
    const next = { ...value, [current.id]: choiceId }
    onChange(next)
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    advanceTimer.current = setTimeout(() => {
      const nextUnanswered = questions.findIndex((q, i) => i > index && next[q.id] == null)
      if (nextUnanswered !== -1) {
        setIndex(nextUnanswered)
      } else if (index < questions.length - 1) {
        setIndex(index + 1)
      }
    }, 250)
  }

  const secs = Math.ceil(remaining)
  const mins = Math.floor(secs / 60)
  const rem = secs % 60
  const clock = `${mins}:${String(rem).padStart(2, '0')}`
  const urgent = limit !== undefined && remaining < 10
  const pct = limit ? Math.max(0, Math.min(100, (remaining / limit) * 100)) : 100

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted">
          Question {index + 1} of {questions.length}
        </span>
        {limit !== undefined && (
          <span className={`font-mono text-sm tabular-nums ${urgent ? 'text-cost' : 'text-muted'}`}>{clock}</span>
        )}
      </div>

      {limit !== undefined && (
        <div className="h-1 rounded-full bg-panel-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-200 ${urgent ? 'bg-cost' : 'bg-revenue'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <p className="text-lg font-bold text-ink">{current.text}</p>

      <div className="flex flex-col gap-2">
        {current.choices.map((choice) => {
          const selected = value[current.id] === choice.id
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => pick(choice.id)}
              disabled={disabled}
              aria-pressed={selected}
              className={`min-h-12 px-4 rounded-xl border text-left font-medium bg-panel-2 border-line text-ink transition
                ${selected ? 'border-ink ring-2 ring-ink' : ''}
                disabled:opacity-60`}
            >
              {choice.label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-center gap-2 pt-1">
        {questions.map((q, i) => {
          const answered = value[q.id] != null
          const isCurrent = i === index
          return (
            <button
              key={q.id}
              type="button"
              aria-label={`Go to question ${i + 1}`}
              aria-current={isCurrent}
              onClick={() => {
                if (disabled) return
                if (advanceTimer.current) {
                  clearTimeout(advanceTimer.current)
                  advanceTimer.current = null
                }
                setIndex(i)
              }}
              disabled={disabled}
              className="min-h-11 min-w-11 flex items-center justify-center"
            >
              <span
                className={`h-6 w-6 rounded-full text-[10px] font-mono flex items-center justify-center border transition
                  ${answered ? 'bg-revenue/25 border-revenue text-revenue' : 'bg-panel-2 border-line text-muted'}
                  ${isCurrent ? 'ring-2 ring-ink' : ''}`}
              >
                {i + 1}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
