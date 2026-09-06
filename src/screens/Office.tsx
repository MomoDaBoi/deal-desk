import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RUNG_SUBTITLES, RUNG_TITLES, type Mission, type Rung } from '../engine/types'
import { formatComp, rungStatus } from '../engine/scoring'
import { promotionLine } from '../engine/voice'
import { missionsForRung } from '../missions'
import { useNav } from '../store/nav'
import { useProgress } from '../store/progress'
import { useMentorMode } from '../store/settings'
import { OfficeCanvas } from '../office/OfficeCanvas'
import { OfficeWorld, quipFor, type MissionSlot, type WorldConfig, type WorldEvent } from '../office/world'
import { Button, Eyebrow, PixelBar, SettingsButton } from '../components/ui'
import { Dialog } from '../components/Dialog'
import { playSound } from '../lib/sounds'
import { ShareCard } from '../components/ShareCard'
import { Px } from '../pixel/Px'
import { DEAL_DESK_LOGO, EMBLEM_PROMOTION, ICON_BACK, ICON_BOSS, ICON_CHECK, ICON_COIN, ICON_DOC, ICON_LOCK, ICON_MENTOR, ICON_TROPHY } from '../pixel/sprites/icons'
import { PORTRAITS } from '../pixel/sprites/portraits'
import { useMusic } from '../lib/music'

const RUNGS: Rung[] = [1, 2, 3, 4, 5]
const OFFICE_KEY = 'deal-desk:office'

/** Highest floor the player has been welcomed to (cosmetic, never exported). */
function seenRung(): number {
  try {
    const raw = localStorage.getItem(OFFICE_KEY)
    const n = raw ? Number(JSON.parse(raw).seenRung) : 1
    return Number.isFinite(n) ? n : 1
  } catch {
    return 1
  }
}
function markSeenRung(r: number) {
  try {
    const raw = localStorage.getItem(OFFICE_KEY)
    const data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    localStorage.setItem(OFFICE_KEY, JSON.stringify({ ...data, seenRung: Math.max(r, seenRung()) }))
  } catch {
    // storage unavailable; the scene will simply replay next time
  }
}

/** Which mission slot each mission occupies: non-mentor in order, mentor at slot 6. */
function buildSlots(best: Record<string, number>, mentor: boolean): { slots: MissionSlot[]; byId: Map<string, Mission> } {
  const slots: MissionSlot[] = []
  const byId = new Map<string, Mission>()
  for (const r of RUNGS) {
    const ms = missionsForRung(r, mentor).slice().sort((a, b) => a.order - b.order)
    let i = 0
    for (const m of ms) {
      byId.set(m.id, m)
      const b = best[m.id] ?? 0
      const state = b >= m.baseComp ? 'perfect' : b > 0 ? 'passed' : 'todo'
      const slot = m.mentorOnly ? 6 : i++
      if (slot > 7) continue
      slots.push({ missionId: m.id, rung: r, slot, boss: !!m.boss, mentorOnly: !!m.mentorOnly, state })
    }
  }
  return { slots, byId }
}

interface Bubble {
  id: number
  text: string
  x: number
  y: number
}

/**
 * The office hub. Replaces the ladder and rung lists: the floor plan is the
 * menu. Tap a desk to walk to it; arriving opens the mission card.
 * `focusRung` (from a #/rung/n link) opens that floor's summary card.
 */
export function Office({ focusRung, returnTo, arrive = false }: { focusRung?: Rung; returnTo?: string; arrive?: boolean }) {
  const go = useNav((s) => s.go)
  const best = useProgress((s) => s.best)
  const attempts = useProgress((s) => s.attempts)
  const mentor = useMentorMode()
  useMusic('office')

  const { slots, byId } = useMemo(() => buildSlots(best, mentor), [best, mentor])
  const status = useMemo(
    () => Object.fromEntries(RUNGS.map((r) => [r, rungStatus(missionsForRung(r, mentor), best)])) as Record<Rung, ReturnType<typeof rungStatus>>,
    [best, mentor],
  )
  const unlocked = useMemo(() => {
    const u = { 1: true, 2: false, 3: false, 4: false, 5: false } as Record<Rung, boolean>
    for (const r of RUNGS) if (r > 1) u[r] = status[(r - 1) as Rung].passed
    return u
  }, [status])
  const currentRung = (RUNGS.slice().reverse().find((r) => unlocked[r]) ?? 1) as Rung
  const totalComp = Object.values(best).reduce((a, b) => a + b, 0)
  const daysSurvived = new Set(attempts.map((a) => a.at.slice(0, 10))).size

  const [card, setCard] = useState<{ kind: 'mission'; mission: Mission } | { kind: 'rung'; rung: Rung } | null>(
    focusRung ? { kind: 'rung', rung: focusRung } : null,
  )
  const [toast, setToast] = useState<{ text: string; icon: 'lock' | 'doc' } | null>(null)
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const [layout, setLayout] = useState({ scale: 2, offX: 0 })
  // Promotion scene: the first time a new floor is open, the MD says so.
  const [promo, setPromo] = useState<Rung | null>(() => {
    if (currentRung <= seenRung()) return null
    return currentRung
  })
  // "+$comp" that floats up from the desk when returning from a pass.
  const [fly, setFly] = useState<{ comp: number; x: number; y: number } | null>(null)
  const quipCounter = useRef(0)

  const onEvent = useCallback(
    (e: WorldEvent) => {
      if (e.kind === 'arrive') {
        const m = byId.get(e.missionId)
        if (m) setCard({ kind: 'mission', mission: m })
      } else if (e.kind === 'locked') {
        const need = RUNG_TITLES[(e.rung - 1) as Rung]
        setToast({ text: `${RUNG_TITLES[e.rung]} floor is locked. Pass the ${need} floor at 70% comp first.`, icon: 'lock' })
      } else if (e.kind === 'npc') {
        quipCounter.current++
        setBubble({ id: quipCounter.current, text: quipFor(e.npc, quipCounter.current), x: e.x, y: e.y })
      } else if (e.kind === 'move') {
        setCard(null)
        setToast(null)
      } else if (e.kind === 'arrived') {
        setToast({ text: 'Welcome to the intern floor. Tap a desk to sit down, or tap a coworker.', icon: 'doc' })
      }
    },
    [byId],
  )

  const cfg: WorldConfig = useMemo(() => ({ slots, unlocked, currentRung }), [slots, unlocked, currentRung])
  // Built once per mount (useState keeps one instance under StrictMode).
  const [world] = useState(() => {
    const w = new OfficeWorld(cfg, onEvent, { arrive: arrive && !returnTo })
    if (returnTo) w.seatPlayerAt(returnTo)
    return w
  })
  const clearReturnTo = useNav((s) => s.clearReturnTo)
  useEffect(() => {
    if (returnTo) clearReturnTo()
  }, [returnTo, clearReturnTo])
  useEffect(() => world.configure(cfg), [world, cfg])
  useEffect(() => world.setOnEvent(onEvent), [world, onEvent])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(id)
  }, [toast])
  useEffect(() => {
    if (!bubble) return
    const id = setTimeout(() => setBubble(null), 2600)
    return () => clearTimeout(id)
  }, [bubble])

  const onScale = useCallback((scale: number, offX: number) => setLayout({ scale, offX }), [])

  useEffect(() => {
    if (!returnTo) return
    const last = attempts[attempts.length - 1]
    if (!last || last.missionId !== returnTo || last.comp <= 0) return
    if (Date.now() - new Date(last.at).getTime() > 60_000) return
    // Wait one frame so the camera has snapped to the desk.
    const id = window.setTimeout(() => {
      const pos = world.entityScreenPos('player')
      if (pos) setFly({ comp: last.comp, x: pos.x, y: pos.y })
      playSound('coin')
    }, 120)
    const clear = window.setTimeout(() => setFly(null), 2400)
    return () => {
      clearTimeout(id)
      clearTimeout(clear)
    }
    // Only on mount: attempts is stable for the life of this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const promoPlayed = useRef(false)
  useEffect(() => {
    if (promo && !promoPlayed.current) {
      promoPlayed.current = true
      playSound('promote')
    }
  }, [promo])

  // First visit of the day: a small "Day N" toast (cosmetic, local only).
  useEffect(() => {
    if (arrive || returnTo || focusRung) return
    const today = new Date().toISOString().slice(0, 10)
    try {
      const raw = localStorage.getItem(OFFICE_KEY)
      const data = raw ? (JSON.parse(raw) as { seenRung?: number; lastDay?: string }) : {}
      if (data.lastDay === today) return
      localStorage.setItem(OFFICE_KEY, JSON.stringify({ ...data, lastDay: today }))
      if (daysSurvived > 0) setToast({ text: `Day ${daysSurvived + 1} at the desk. The coffee machine is still broken.`, icon: 'doc' })
    } catch {
      // storage unavailable
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      <header className="shrink-0 z-10 bg-bg/95 border-b-[3px] border-line-hi">
        <div className="mx-auto max-w-3xl px-3 h-14 flex items-center gap-3">
          <Px sprite={DEAL_DESK_LOGO} scale={2} title="Deal Desk" />
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-num text-[10px] text-gold" title="Lifetime comp">
              <Px sprite={ICON_COIN} scale={1} animate />
              {formatComp(totalComp)}
            </div>
            {mentor && <Px sprite={ICON_MENTOR} scale={1} title="Mentor mode on" />}
            <SettingsButton onClick={() => go({ name: 'settings' })} />
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
      <aside className="hidden lg:flex w-80 shrink-0 flex-col gap-3 p-3 border-r-[3px] border-line-hi overflow-y-auto">
        <div className="px-box p-3">
          <Eyebrow>{RUNG_TITLES[currentRung]} floor · {RUNG_SUBTITLES[currentRung]}</Eyebrow>
          <div className="mt-2 flex items-center gap-2 px-num text-[9px]">
            <span>{formatComp(status[currentRung].earned)}</span>
            <span className="text-muted">of {formatComp(status[currentRung].possible)}</span>
            <span className={`ml-auto ${status[currentRung].passed ? 'text-revenue' : 'text-muted'}`}>
              {status[currentRung].passed ? 'Passed' : `${Math.round(status[currentRung].fraction * 100)}%`}
            </span>
          </div>
          <PixelBar fraction={status[currentRung].fraction} className="mt-2" gold={status[currentRung].perfect} />
          <Roster missions={missionsForRung(currentRung, mentor)} best={best} onPick={(id) => world.walkToMission(id)} />
        </div>
        <div className="px-box px-box-dark p-3 text-xs text-muted">
          <Eyebrow>Floors</Eyebrow>
          <ol className="mt-2 flex flex-col gap-1">
            {RUNGS.slice().reverse().map((r) => (
              <li key={r}>
                <button type="button" onClick={() => setCard({ kind: 'rung', rung: r })} className="w-full min-h-11 flex items-center gap-2 px-1 hover:bg-panel-2">
                  <Px sprite={status[r].perfect ? ICON_TROPHY : status[r].passed ? ICON_CHECK : unlocked[r] ? ICON_DOC : ICON_LOCK} scale={1} />
                  <span className={unlocked[r] ? 'text-ink' : ''}>{RUNG_TITLES[r]}</span>
                  <span className="ml-auto px-num text-[8px]">{formatComp(status[r].earned)}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-3">Arrow keys or WASD also walk. Tap a coworker for gossip.</p>
        </div>
      </aside>
      <div className="relative flex-1 min-h-0 min-w-0">
        <OfficeCanvas world={world} onScale={onScale} inputLocked={card !== null || promo !== null} />

        {/* Floor label, follows the player's zone. */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="px-box px-box-dark px-3 py-1.5 text-center">
            <Eyebrow>{RUNG_TITLES[currentRung]} floor</Eyebrow>
            <div className="text-xs text-muted">
              {daysSurvived > 0 ? `${daysSurvived} ${daysSurvived === 1 ? 'day' : 'days'} survived` : 'Tap a desk to start'}
            </div>
          </div>
        </div>

        {bubble && (
          <div
            key={bubble.id}
            className="absolute pointer-events-none px-pop z-10"
            style={{ left: layout.offX + bubble.x * layout.scale, top: bubble.y * layout.scale, transform: 'translate(-50%, -100%)' }}
          >
            <div className="px-box px-box-paper px-2 py-1 text-sm max-w-[14rem] whitespace-normal">{bubble.text}</div>
          </div>
        )}

        {fly && (
          <div
            className="absolute pointer-events-none z-10 px-num text-[11px] text-revenue px-shadow px-fly"
            style={{ left: layout.offX + fly.x * layout.scale, top: fly.y * layout.scale, transform: 'translate(-50%, -100%)' }}
          >
            +{formatComp(fly.comp)}
          </div>
        )}

        {promo && (
          <div className="absolute inset-0 z-30 bg-bg/60 flex items-end sm:items-center justify-center p-3">
            <div className="px-box p-4 max-w-md w-full px-pop">
              <div className="flex items-center gap-3">
                <Px sprite={EMBLEM_PROMOTION} scale={2} className="px-float" />
                <div>
                  <Eyebrow className="!text-gold">Promotion</Eyebrow>
                  <div className="px-h1">{RUNG_TITLES[promo]}</div>
                </div>
              </div>
              <div className="mt-3">
                <Dialog portrait={PORTRAITS.md} expression="pleased" name="The MD" text={`${promotionLine((promo - 1) as Rung)} The ${RUNG_TITLES[promo]} floor is open. Take the stairs; the elevator is for clients.`} />
              </div>
              <Button
                className="w-full mt-3"
                variant="gold"
                onClick={() => {
                  markSeenRung(promo)
                  setPromo(null)
                }}
              >
                Take the stairs
              </Button>
            </div>
          </div>
        )}

        {toast && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(92%,26rem)] px-rise">
            <div className="px-box px-box-dark px-3 py-2 text-sm flex items-center gap-2">
              <Px sprite={toast.icon === 'lock' ? ICON_LOCK : ICON_DOC} scale={2} />
              <span>{toast.text}</span>
            </div>
          </div>
        )}

        {card?.kind === 'mission' && (
          <MissionCard mission={card.mission} best={best[card.mission.id] ?? 0} onClose={() => setCard(null)} onStart={() => go({ name: 'mission', missionId: card.mission.id })} />
        )}
        {card?.kind === 'rung' && (
          <RungCard
            rung={card.rung}
            status={status[card.rung]}
            unlocked={unlocked[card.rung]}
            missions={missionsForRung(card.rung, mentor)}
            best={best}
            onRung={(r) => setCard({ kind: 'rung', rung: r })}
            onClose={() => setCard(null)}
            onPick={(id) => {
              setCard(null)
              world.walkToMission(id)
            }}
          />
        )}
      </div>
      </div>

      <footer className="shrink-0 border-t-[3px] border-line-hi bg-bg/95">
        <div className="mx-auto max-w-3xl px-3 py-2 flex items-center gap-3 lg:hidden">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted min-w-0">
              <span className="px-eyebrow truncate">{RUNG_TITLES[currentRung]}</span>
              <span className="px-num text-[9px] text-ink ml-auto whitespace-nowrap">
                {formatComp(status[currentRung].earned)} / {formatComp(status[currentRung].possible)}
              </span>
            </div>
            <PixelBar fraction={status[currentRung].fraction} className="mt-1" gold={status[currentRung].perfect} />
          </div>
          <Button variant="ghost" className="px-3 shrink-0" onClick={() => setCard({ kind: 'rung', rung: currentRung })}>
            Floor
          </Button>
        </div>
        <p className="text-[10px] text-muted/70 text-center pb-[max(0.25rem,env(safe-area-inset-bottom))] px-3">
          A game, not investment advice.
        </p>
      </footer>
    </div>
  )
}

/** Mission list for a floor; picking one walks the player to its desk. */
function Roster({ missions, best, onPick }: { missions: Mission[]; best: Record<string, number>; onPick: (missionId: string) => void }) {
  return (
    <ol className="mt-3 flex flex-col gap-1.5">
      {missions.map((m) => {
        const b = best[m.id] ?? 0
        return (
          <li key={m.id}>
            <button type="button" onClick={() => onPick(m.id)} className="w-full text-left px-chip bg-panel-2 border-l-4 border-l-line-hi min-h-11 px-3 py-1.5 flex items-center gap-2">
              <Px sprite={stateIcon(m, b)} scale={1} />
              <span className="min-w-0 flex-1 truncate text-sm">{m.title}</span>
              <span className="px-num text-[9px] text-muted shrink-0">{b > 0 ? formatComp(b) : formatComp(m.baseComp)}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function stateIcon(m: Mission, best: number) {
  if (best >= m.baseComp) return ICON_TROPHY
  if (best > 0) return ICON_CHECK
  if (m.mentorOnly) return ICON_MENTOR
  if (m.boss) return ICON_BOSS
  return ICON_DOC
}

function MissionCard({ mission, best, onClose, onStart }: { mission: Mission; best: number; onClose: () => void; onStart: () => void }) {
  const portrait = mission.boss ? PORTRAITS.md.annoyed : mission.mentorOnly ? PORTRAITS.md.smug : PORTRAITS.hr.pleased
  return (
    <div className="absolute inset-x-0 bottom-0 p-3 px-rise z-20">
      <div className="px-box px-box-paper mx-auto max-w-md p-3">
        <div className="flex gap-3">
          <div className="shrink-0 px-box px-box-dark p-1">
            <Px sprite={portrait} scale={2} animate />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Px sprite={stateIcon(mission, best)} scale={1} />
              <Eyebrow className="!text-[#5b5670]">
                {mission.boss ? 'Boss fight' : mission.mentorOnly ? 'Mentor mission' : `Mission ${mission.order}`} · {RUNG_TITLES[mission.rung]}
              </Eyebrow>
            </div>
            <div className="px-h2 mt-1 leading-snug">{mission.title}</div>
            <p className="text-sm mt-1 text-[#3b3650]">{mission.tagline}</p>
            <div className="text-xs mt-2 px-num text-[9px] text-[#5b5670]">
              {best > 0 ? `Best ${formatComp(best)} of ${formatComp(mission.baseComp)}` : `Worth ${formatComp(mission.baseComp)}`} · par {mission.parSeconds}s
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Not now
          </Button>
          <Button className="flex-1" onClick={onStart}>
            {best > 0 ? 'Sit down again' : mission.boss ? 'Walk in' : 'Sit down'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function RungCard({
  rung,
  status,
  unlocked,
  missions,
  best,
  onRung,
  onClose,
  onPick,
}: {
  rung: Rung
  status: ReturnType<typeof rungStatus>
  unlocked: boolean
  missions: Mission[]
  best: Record<string, number>
  onRung: (rung: Rung) => void
  onClose: () => void
  onPick: (missionId: string) => void
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 p-3 px-rise z-20">
      <div className="px-box mx-auto max-w-md p-4 max-h-[70vh] overflow-y-auto">
        <Eyebrow>{unlocked ? 'Floor' : 'Locked floor'} · {RUNG_SUBTITLES[rung]}</Eyebrow>
        <div className="flex items-center gap-2 mt-1">
          <button type="button" className="px-btn min-w-11 px-2" aria-label="Floor below" disabled={rung <= 1} onClick={() => onRung((rung - 1) as Rung)}>
            <Px sprite={ICON_BACK} scale={1} className="-rotate-90" />
          </button>
          <div className="px-h1 flex-1 text-center">{RUNG_TITLES[rung]}</div>
          <button type="button" className="px-btn min-w-11 px-2" aria-label="Floor above" disabled={rung >= 5} onClick={() => onRung((rung + 1) as Rung)}>
            <Px sprite={ICON_BACK} scale={1} className="rotate-90" />
          </button>
        </div>
        <p className="text-sm text-muted mt-1">
          {unlocked ? (rung > 1 ? promotionLine((rung - 1) as Rung) : 'Everyone starts here. Nobody remembers your name yet.') : `Pass the ${RUNG_TITLES[(rung - 1) as Rung]} floor at 70% comp to get the key card.`}
        </p>
        <div className="mt-3 flex items-center gap-2 px-num text-[10px]">
          <span>{formatComp(status.earned)}</span>
          <span className="text-muted">of {formatComp(status.possible)}</span>
          <span className={`ml-auto ${status.passed ? 'text-revenue' : 'text-muted'}`}>{status.passed ? (status.perfect ? 'Bonus season' : 'Passed') : `${Math.round(status.fraction * 100)}% · need 70%`}</span>
        </div>
        <PixelBar fraction={status.fraction} className="mt-2" gold={status.perfect} />
        {unlocked && <Roster missions={missions} best={best} onPick={onPick} />}
        <div className="mt-3 flex gap-2">
          <ShareCard />
          <Button className="flex-1" onClick={onClose}>
            Back to the floor
          </Button>
        </div>
      </div>
    </div>
  )
}
