import { RUNG_SUBTITLES, RUNG_TITLES, type Rung } from '../engine/types'
import { formatComp, rungStatus } from '../engine/scoring'
import { missionsForRung } from '../missions'
import { useNav } from '../store/nav'
import { useProgress } from '../store/progress'
import { useMentorMode } from '../store/settings'
import { Eyebrow, Page, Panel } from '../components/ui'

const RUNGS: Rung[] = [5, 4, 3, 2, 1]

export function Ladder() {
  const go = useNav((s) => s.go)
  const best = useProgress((s) => s.best)
  const mentor = useMentorMode()

  const status = Object.fromEntries(RUNGS.map((r) => [r, rungStatus(missionsForRung(r, mentor), best)])) as Record<
    Rung,
    ReturnType<typeof rungStatus>
  >
  const totalComp = Object.values(best).reduce((a, b) => a + b, 0)

  function unlocked(r: Rung): boolean {
    if (r === 1) return true
    return status[(r - 1) as Rung].passed
  }
  const currentRung = RUNGS.slice().reverse().find((r) => unlocked(r) && !status[r].passed) ?? 5

  return (
    <Page
      right={
        <>
          {mentor && <span className="text-xs font-semibold text-debt border border-debt/40 rounded-full px-2 py-0.5">Mentor</span>}
          <button onClick={() => go({ name: 'settings' })} aria-label="Settings" className="min-h-11 min-w-11 rounded-lg text-muted hover:text-ink text-xl">
            ⚙
          </button>
        </>
      }
    >
      <div className="mb-6">
        <Eyebrow>Career ladder</Eyebrow>
        <h1 className="text-2xl font-black mt-1">
          You are {RUNG_TITLES[currentRung] === 'Intern' ? 'an' : 'a'} <span className="text-revenue">{RUNG_TITLES[currentRung]}</span>.
        </h1>
        <p className="text-muted mt-1">
          Lifetime comp: <span className="font-mono text-ink">{formatComp(totalComp)}</span>. Survive the year to get promoted.
        </p>
      </div>

      <ol className="flex flex-col gap-3">
        {RUNGS.map((r) => {
          const st = status[r]
          const open = unlocked(r)
          const missions = missionsForRung(r, mentor)
          const empty = missions.length === 0
          return (
            <li key={r}>
              <button
                type="button"
                disabled={!open || empty}
                onClick={() => go({ name: 'rung', rung: r })}
                className={`w-full text-left rounded-2xl border p-4 transition
                  ${open && !empty ? 'bg-panel border-line hover:border-muted active:scale-[0.99]' : 'bg-panel/40 border-line/60 opacity-60'}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-black
                      ${st.passed ? 'bg-revenue text-bg' : open ? 'bg-panel-2 text-ink border border-line' : 'bg-panel-2 text-muted'}`}
                  >
                    {st.passed ? '✓' : open ? r : '🔒'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold flex items-center gap-2">
                      {RUNG_TITLES[r]}
                      {st.perfect && <span className="text-xs text-debt">bonus</span>}
                    </div>
                    <div className="text-sm text-muted truncate">{RUNG_SUBTITLES[r]}</div>
                  </div>
                  <div className="text-right text-sm">
                    {empty ? (
                      <span className="text-muted">coming soon</span>
                    ) : (
                      <>
                        <div className="font-mono">{formatComp(st.earned)}</div>
                        <div className="text-muted text-xs">of {formatComp(st.possible)}</div>
                      </>
                    )}
                  </div>
                </div>
                {!empty && (
                  <div className="mt-3 h-1.5 rounded-full bg-panel-2 overflow-hidden">
                    <div className="h-full bg-revenue" style={{ width: `${Math.min(100, st.fraction * 100)}%` }} />
                  </div>
                )}
              </button>
            </li>
          )
        })}
      </ol>

      <Panel className="mt-6 text-sm text-muted">
        Pass a rung at 70% comp to unlock the next one. Perfect rung = bonus season.
      </Panel>

      <footer className="mt-8 text-xs text-muted/70 text-center">
        A game, not investment advice. Nothing here is a recommendation to buy, sell, or do anything with money.
      </footer>
    </Page>
  )
}
