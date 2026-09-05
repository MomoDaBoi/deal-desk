import { useEffect, useState } from 'react'
import type { AuctionTask as AuctionTaskType } from '../engine/types'
import { simulateAuction, snapToStep } from '../engine/graders/auction'
import { Eyebrow } from './ui'

/** A unit starting with "$" is a prefix currency (thousands-grouped) with the rest of the unit as a suffix, e.g. "$k" -> "$1,185,000k". Any other unit is a plain suffix. */
function formatUnit(n: number, unit?: string): string {
  const s = Math.round(n).toLocaleString('en-US')
  if (!unit) return s
  return unit.startsWith('$') ? `$${s}${unit.slice(1)}` : `${s} ${unit}`
}

export function AuctionTask({
  task,
  value,
  onChange,
  disabled,
}: {
  task: AuctionTaskType
  value: { bids: number[]; walked: boolean }
  onChange: (next: { bids: number[]; walked: boolean }) => void
  disabled?: boolean
}) {
  const walked = value.walked

  const bidsSoFar = value.bids.length
  const result = simulateAuction(task, value.bids)
  const completedRounds = result.rounds.slice(0, bidsSoFar)
  const isOver = walked || bidsSoFar >= task.rounds
  const currentRoundNumber = bidsSoFar + 1
  const prevRound = completedRounds[completedRounds.length - 1]
  const prevHigh = prevRound?.leader?.bid ?? 0

  // A bid must strictly exceed the standing high, so the slider's floor sits one step above it.
  const bidFloor = prevHigh > 0 ? Math.min(task.bidMax, prevHigh + task.bidStep) : task.bidMin
  const [currentBid, setCurrentBid] = useState(bidFloor)

  // Re-seed the slider to a sensible opening bid each time a new round starts.
  useEffect(() => {
    setCurrentBid(bidFloor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoundNumber])

  function nudge(dir: 1 | -1) {
    const raw = currentBid + dir * task.bidStep
    const snapped = snapToStep(raw, task.bidStep, task.bidMin)
    setCurrentBid(Math.min(task.bidMax, Math.max(bidFloor, snapped)))
  }

  function placeBid() {
    onChange({ bids: [...value.bids, currentBid], walked: false })
  }

  function walkAway() {
    onChange({ ...value, walked: true })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-panel border border-line rounded-2xl p-4 flex flex-col gap-2">
        <Eyebrow>Teaser</Eyebrow>
        <p className="text-ink text-sm leading-relaxed">{task.teaser}</p>
        <div className="flex flex-col gap-2 mt-2">
          {task.bots.map((bot) => (
            <div key={bot.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
              <span className="font-semibold text-ink shrink-0">{bot.name}</span>
              <span className="text-muted min-w-0 break-words">{bot.blurb}</span>
            </div>
          ))}
        </div>
      </div>

      {completedRounds.length > 0 && (
        <div className="bg-panel border border-line rounded-2xl overflow-hidden">
          <div className="px-4 py-2 border-b border-line text-xs font-semibold uppercase tracking-wide text-muted">Rounds so far</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-muted text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-2">Round</th>
                  <th className="text-right px-2 py-2">You</th>
                  {task.bots.map((bot) => (
                    <th key={bot.id} className="text-right px-2 py-2">
                      {bot.name}
                    </th>
                  ))}
                  <th className="text-right px-4 py-2">Leader</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {completedRounds.map((r) => {
                  const leaderName =
                    r.leader === null ? '—' : r.leader.id === 'player' ? 'You' : task.bots.find((b) => b.id === r.leader!.id)?.name ?? r.leader.id
                  return (
                    <tr key={r.round}>
                      <td className="px-4 py-2 text-ink font-semibold">{r.round}</td>
                      <td className="px-2 py-2 text-right font-mono text-ink">{r.playerBid === null ? 'out' : formatUnit(r.playerBid, task.unit)}</td>
                      {r.bots.map((b) => (
                        <td key={b.id} className="px-2 py-2 text-right font-mono text-ink">
                          {b.bid === null ? 'out' : formatUnit(b.bid, task.unit)}
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right font-mono text-revenue">{leaderName}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {walked && (
        <div className="bg-panel border border-line rounded-2xl p-4 text-center text-muted font-semibold">You walked away.</div>
      )}

      {isOver ? (
        <div className="bg-panel-2 border border-line rounded-2xl p-4 text-center text-ink font-semibold">Bidding closed. Tap Submit.</div>
      ) : (
        <div className="bg-panel border border-line rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <span className="text-ink font-semibold min-w-0">
              Round {currentRoundNumber} of {task.rounds}
            </span>
            <span className="font-mono text-xl sm:text-2xl text-ink tabular-nums shrink-0 whitespace-nowrap">
              {formatUnit(currentBid, task.unit)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Decrease bid"
              disabled={disabled}
              onClick={() => nudge(-1)}
              className="min-h-11 min-w-11 shrink-0 rounded-xl bg-panel-2 border border-line text-ink text-lg font-semibold disabled:opacity-40 active:scale-[0.98]"
            >
              −
            </button>
            <input
              type="range"
              aria-label="Bid amount"
              min={bidFloor}
              max={task.bidMax}
              step={task.bidStep}
              value={currentBid}
              disabled={disabled}
              onChange={(e) => setCurrentBid(Number(e.target.value))}
              style={{ accentColor: 'var(--color-equity)' }}
              className="h-11 flex-1 min-w-0 disabled:opacity-40"
            />
            <button
              type="button"
              aria-label="Increase bid"
              disabled={disabled}
              onClick={() => nudge(1)}
              className="min-h-11 min-w-11 shrink-0 rounded-xl bg-panel-2 border border-line text-ink text-lg font-semibold disabled:opacity-40 active:scale-[0.98]"
            >
              +
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-muted font-mono tabular-nums">
            <span className="truncate">{formatUnit(bidFloor, task.unit)}</span>
            <span className="truncate">{formatUnit(task.bidMax, task.unit)}</span>
          </div>

          <div className="flex flex-wrap gap-3 mt-1">
            <button
              type="button"
              disabled={disabled}
              onClick={placeBid}
              className="flex-1 basis-32 min-h-11 px-3 rounded-xl bg-revenue text-bg font-semibold disabled:opacity-40 active:scale-[0.98]"
            >
              Place bid
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={walkAway}
              className="flex-1 basis-32 min-h-11 px-3 rounded-xl bg-panel-2 border border-line text-ink font-semibold disabled:opacity-40 active:scale-[0.98]"
            >
              Walk away
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
