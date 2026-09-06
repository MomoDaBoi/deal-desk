import { useEffect, useState } from 'react'
import type { AuctionTask as AuctionTaskType } from '../engine/types'
import { simulateAuction, snapToStep } from '../engine/graders/auction'
import { Eyebrow, Button } from './ui'
import { Px } from '../pixel/Px'
import { PORTRAITS } from '../pixel/sprites/portraits'

/** Which portrait plays which bot seat, cycled if there are more than three bots. */
const BOT_PORTRAIT_KEYS = ['client', 'hr', 'md'] as const

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

  const lastRound = completedRounds[completedRounds.length - 1]

  return (
    <div className="flex flex-col gap-4">
      <div className="px-box p-4 flex flex-col gap-2">
        <Eyebrow>Teaser</Eyebrow>
        <p className="text-sm leading-relaxed">{task.teaser}</p>
      </div>

      {/* Bot bidders as small character cards: portrait smirks when standing
          high, scowls when outbid, stays neutral before the first round. */}
      <div className="flex flex-wrap gap-3">
        {task.bots.map((bot, i) => {
          const portraitKey = BOT_PORTRAIT_KEYS[i % BOT_PORTRAIT_KEYS.length]
          const portrait = PORTRAITS[portraitKey]
          const entry = lastRound?.bots.find((b) => b.id === bot.id)
          const isLeader = lastRound?.leader?.id === bot.id
          const expression: 'smug' | 'annoyed' | 'neutral' = !lastRound ? 'neutral' : isLeader ? 'smug' : 'annoyed'
          const bidText = !lastRound ? '—' : entry?.bid == null ? 'out' : formatUnit(entry.bid, task.unit)
          return (
            <div key={bot.id} className="px-box px-box-dark p-2 w-24 flex flex-col items-center gap-1">
              <Px sprite={portrait[expression]} scale={2} title={`${bot.name} (${bot.blurb})`} />
              <span className="px-eyebrow text-muted text-center truncate w-full">{bot.name}</span>
              <span className="font-pixel text-[10px] text-ink">{bidText}</span>
            </div>
          )
        })}
      </div>

      {completedRounds.length > 0 && (
        <div className="flex flex-col gap-2">
          <Eyebrow>Rounds so far</Eyebrow>
          {completedRounds.map((r) => {
            const leaderName =
              r.leader === null ? 'no one' : r.leader.id === 'player' ? 'You' : task.bots.find((b) => b.id === r.leader!.id)?.name ?? r.leader.id
            const youText = r.playerBid === null ? 'passed' : `bid ${formatUnit(r.playerBid, task.unit)}`
            const highText = r.leader === null ? '—' : formatUnit(r.leader.bid, task.unit)
            return (
              <div key={r.round} className="px-box px-box-paper px-3 py-2 text-sm">
                <span className="font-semibold">Round {r.round}:</span> You {youText}. High bid {highText} by {leaderName}.
              </div>
            )
          })}
        </div>
      )}

      {walked && <div className="px-box px-box-dark p-4 text-center px-eyebrow text-muted">You walked away.</div>}

      {isOver ? (
        <div className="px-box p-4 text-center px-h2">Bidding closed. Tap Submit.</div>
      ) : (
        <div className="px-box p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <span className="px-eyebrow text-muted">
              Round {currentRoundNumber} of {task.rounds}
            </span>
            <span className="font-pixel text-base text-ink px-num shrink-0 whitespace-nowrap">{formatUnit(currentBid, task.unit)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" aria-label="Decrease bid" disabled={disabled} onClick={() => nudge(-1)} className="min-w-11 px-2 shrink-0">
              −
            </Button>
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
              className="px-input h-11 flex-1 min-w-0 disabled:opacity-40"
            />
            <Button type="button" variant="ghost" aria-label="Increase bid" disabled={disabled} onClick={() => nudge(1)} className="min-w-11 px-2 shrink-0">
              +
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2 px-eyebrow text-muted px-num">
            <span className="truncate">{formatUnit(bidFloor, task.unit)}</span>
            <span className="truncate">{formatUnit(task.bidMax, task.unit)}</span>
          </div>

          <div className="flex flex-wrap gap-3 mt-1">
            <Button type="button" variant="primary" disabled={disabled} onClick={placeBid} className="flex-1 basis-32">
              Place bid
            </Button>
            <Button type="button" variant="danger" disabled={disabled} onClick={walkAway} className="flex-1 basis-32">
              Walk away
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
