import { RUNG_SUBTITLES, RUNG_TITLES, type Rung } from '../engine/types'
import { formatComp, rungStatus } from '../engine/scoring'
import { missionsForRung } from '../missions'
import { useNav } from '../store/nav'
import { useProgress } from '../store/progress'
import { useMentorMode } from '../store/settings'
import { Eyebrow, Page } from '../components/ui'

export function RungScreen({ rung }: { rung: Rung }) {
  const go = useNav((s) => s.go)
  const best = useProgress((s) => s.best)
  const mentor = useMentorMode()
  const missions = missionsForRung(rung, mentor)
  const st = rungStatus(missions, best)

  return (
    <Page title={`Rung ${rung}: ${RUNG_TITLES[rung]}`} onBack={() => go({ name: 'ladder' })}>
      <div className="mb-5">
        <Eyebrow>{RUNG_SUBTITLES[rung]}</Eyebrow>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-xl">{formatComp(st.earned)}</span>
          <span className="text-muted text-sm">of {formatComp(st.possible)}</span>
          <span className={`ml-auto text-sm font-semibold ${st.passed ? 'text-revenue' : 'text-muted'}`}>
            {st.passed ? 'Passed' : `${Math.round(st.fraction * 100)}% · need 70%`}
          </span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-panel-2 overflow-hidden">
          <div className="h-full bg-revenue" style={{ width: `${Math.min(100, st.fraction * 100)}%` }} />
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {missions.map((m, i) => {
          const b = best[m.id] ?? 0
          const done = b >= m.baseComp
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => go({ name: 'mission', missionId: m.id })}
                className="w-full text-left rounded-2xl border border-line bg-panel p-4 hover:border-muted active:scale-[0.99] transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center font-bold ${done ? 'bg-revenue text-bg' : 'bg-panel-2 border border-line'}`}>
                    {m.boss ? '👔' : done ? '✓' : i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">
                      {m.title}
                      {m.boss && <span className="ml-2 text-xs text-cost">boss</span>}
                      {m.mentorOnly && <span className="ml-2 text-xs text-debt">mentor</span>}
                    </div>
                    <div className="text-sm text-muted">{m.tagline}</div>
                  </div>
                  <div className="text-right text-sm font-mono">
                    {b > 0 ? formatComp(b) : <span className="text-muted">{formatComp(m.baseComp)}</span>}
                  </div>
                </div>
              </button>
            </li>
          )
        })}
      </ol>

      {missions.length < 5 && (
        <p className="mt-6 text-sm text-muted text-center">More missions for this rung are on the way. Milestone 2.</p>
      )}
    </Page>
  )
}
