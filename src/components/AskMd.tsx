import { useState } from 'react'
import type { GradeResult, Mission } from '../engine/types'
import { MentorError } from '../lib/mentor-error'
import { loadMentor } from '../lib/mentor'
import { useMentorMode } from '../store/settings'
import { formatUsd } from '../lib/pricing'
import { useUsage } from '../store/usage'
import { Button } from './ui'

type Status = 'idle' | 'streaming' | 'done' | 'error'

interface QaPair {
  q: string
  a: string
}

/**
 * "Ask the MD" — a free-text follow-up box shown under a graded written
 * mission. Renders nothing in Standard mode (no API key). Sends only the
 * latest question plus mission context to the model, never the running
 * transcript, to keep each call cheap.
 */
export function AskMd({ mission, grade }: { mission: Mission; grade: GradeResult }) {
  const mentorOn = useMentorMode()

  const [question, setQuestion] = useState('')
  const [lastQuestion, setLastQuestion] = useState('')
  const [pairs, setPairs] = useState<QaPair[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [streamingText, setStreamingText] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [lastCost, setLastCost] = useState<number | null>(null)

  if (!mentorOn) return null

  async function ask(q: string) {
    const trimmed = q.trim()
    if (!trimmed || status === 'streaming') return
    setLastQuestion(trimmed)
    setStatus('streaming')
    setStreamingText('')
    setErrorMsg('')

    // Usage delta, not a total: the store accumulates across the whole
    // session, so we snapshot before/after to show the cost of THIS call.
    const before = useUsage.getState().cost
    try {
      const mentor = await loadMentor()
      if (!mentor) throw new MentorError('auth', 'No key saved. Add one in Settings.')
      const result = await mentor.ask(
        {
          missionTitle: mission.title,
          lesson: mission.lesson.body,
          explanation: grade.explanation,
          question: trimmed,
        },
        (delta) => setStreamingText((t) => t + delta),
      )
      const after = useUsage.getState().cost
      setLastCost(after - before)
      setPairs((prev) => [...prev, { q: trimmed, a: result.text }].slice(-3))
      setQuestion('')
      setStatus('done')
    } catch (err) {
      setErrorMsg(err instanceof MentorError ? err.message : 'Something went wrong asking the MD.')
      setStatus('error')
    }
  }

  function handleSend() {
    void ask(question)
  }

  function handleRetry() {
    void ask(lastQuestion)
  }

  const sending = status === 'streaming'

  return (
    <div className="mt-4">
      <div className="bg-panel border border-line rounded-2xl p-4 flex flex-col gap-3">
        <div className="text-xs uppercase tracking-[0.18em] font-semibold text-debt">Ask the MD</div>

        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend()
            }}
            placeholder="Why does interest come before tax?"
            disabled={sending}
            className="flex-1 min-w-0 min-h-11 rounded-xl bg-panel-2 border border-line px-3 text-ink placeholder:text-muted disabled:opacity-60"
          />
          <Button className="shrink-0" onClick={handleSend} disabled={sending || !question.trim()}>
            Send
          </Button>
        </div>

        {sending && (
          <div className="space-y-1">
            <div className="text-sm font-semibold text-ink break-words">{lastQuestion}</div>
            <div className="text-sm text-muted italic">The MD is typing…</div>
            {streamingText && (
              <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-ink">{streamingText}</div>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-2">
            <div className="text-sm text-cost break-words">{errorMsg}</div>
            <Button variant="danger" onClick={handleRetry}>
              Retry
            </Button>
          </div>
        )}

        {pairs.length > 0 && !sending && (
          <div className="flex flex-col gap-3 border-t border-line pt-3">
            {[...pairs].reverse().map((p, i) => (
              <div key={pairs.length - i} className="space-y-1">
                <div className="text-sm font-semibold text-ink break-words">{p.q}</div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-ink/90">{p.a}</div>
                {i === 0 && status === 'done' && lastCost !== null && (
                  <div className="text-xs text-muted">about {formatUsd(lastCost)}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {pairs.length === 0 && status === 'idle' && (
        <div className="text-xs text-muted mt-2">
          Answers cost a fraction of a cent to a few cents each on your key.
        </div>
      )}
    </div>
  )
}
