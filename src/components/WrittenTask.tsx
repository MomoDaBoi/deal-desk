import type { WrittenTask as WrittenTaskType } from '../engine/types'
import { wordCount } from '../engine/graders/written'

/**
 * Free-text widget for `written` tasks. The rubric is shown up front — it is
 * not secret, it tells the player what the MD is looking for — but
 * `modelAnswer` is never rendered anywhere in this file. Grading itself
 * happens elsewhere (`Mission.gradeAsync`, over the Mentor API); this widget
 * only collects the text and shows a live word counter against `wordLimit`.
 */

function WordCounter({ text, limit }: { text: string; limit: number }) {
  const count = wordCount(text)
  const over = count > limit
  return (
    <div className={`text-xs text-right tabular-nums ${over ? 'text-cost' : 'text-muted'}`}>
      {count} / {limit} words
    </div>
  )
}

function RubricList({ rubric }: { rubric: string[] }) {
  if (rubric.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-xs uppercase tracking-[0.14em] text-muted font-semibold">The MD will look for</div>
      <ul className="flex flex-col gap-1 text-sm text-ink/90">
        {rubric.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-muted shrink-0">•</span>
            <span className="min-w-0 break-words">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const TEXTAREA_CLASS =
  'min-h-40 w-full bg-panel-2 border border-line rounded-xl p-3 text-base text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ink disabled:opacity-60'

export function WrittenTask({
  task,
  value,
  onChange,
  disabled,
}: {
  task: WrittenTaskType
  value: { text: string; answers: Record<string, string> }
  onChange: (next: { text: string; answers: Record<string, string> }) => void
  disabled?: boolean
}) {
  if (!task.questions) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-lg font-bold text-ink">{task.prompt}</p>
        <textarea
          className={TEXTAREA_CLASS}
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          readOnly={disabled}
          disabled={disabled}
          placeholder="Type your answer..."
          aria-label={task.prompt}
        />
        <WordCounter text={value.text} limit={task.wordLimit} />
        <RubricList rubric={task.rubric} />
      </div>
    )
  }

  const questions = task.questions

  return (
    <div className="flex flex-col gap-3">
      <p className="text-lg font-bold text-ink">{task.prompt}</p>
      {questions.map((q, i) => {
        const text = value.answers[q.id] ?? ''
        return (
          <div key={q.id} className="flex flex-col gap-2 bg-panel border border-line rounded-2xl p-4">
            <div className="flex gap-2">
              <span className="text-muted font-semibold shrink-0">{i + 1}.</span>
              <p className="font-semibold text-ink min-w-0 break-words">{q.text}</p>
            </div>
            <textarea
              className={TEXTAREA_CLASS}
              value={text}
              onChange={(e) => onChange({ ...value, answers: { ...value.answers, [q.id]: e.target.value } })}
              readOnly={disabled}
              disabled={disabled}
              placeholder="Type your answer..."
              aria-label={q.text}
            />
            <WordCounter text={text} limit={task.wordLimit} />
            <RubricList rubric={q.rubric} />
          </div>
        )
      })}
    </div>
  )
}
