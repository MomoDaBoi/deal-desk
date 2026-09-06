import { useRef, useState } from 'react'
import { useNav } from './store/nav'
import { missionById } from './missions'
import { Office } from './screens/Office'
import { MissionScreen } from './screens/MissionScreen'
import { Settings } from './screens/Settings'
import { SpriteSheet } from './screens/SpriteSheet'
import { Title, TITLE_SEEN_KEY } from './screens/Title'

function titleSeen(): boolean {
  try {
    return sessionStorage.getItem(TITLE_SEEN_KEY) === '1'
  } catch {
    return true
  }
}

export default function App() {
  const screen = useNav((s) => s.screen)
  const returnTo = useNav((s) => s.returnTo)
  const go = useNav((s) => s.go)
  // The title card shows once per browser session, and only when the app
  // opened on the office (a deep link into a mission skips it).
  const [showTitle, setShowTitle] = useState(() => screen.name === 'ladder' && !titleSeen())
  // One-shot: the elevator arrival plays only on the first office after the title.
  const arriveRef = useRef(false)

  if (showTitle) {
    const start = () => {
      try {
        sessionStorage.setItem(TITLE_SEEN_KEY, '1')
      } catch {
        // private mode: the title will simply show again next time
      }
      arriveRef.current = true
      setShowTitle(false)
    }
    return (
      <Title
        onStart={start}
        onSettings={() => {
          start()
          go({ name: 'settings' })
        }}
      />
    )
  }

  // A short iris wipe on every screen change so transitions feel like a
  // console game rather than a web page swapping divs.
  const key = screen.name === 'mission' ? `mission:${screen.missionId}` : screen.name === 'rung' ? `rung:${screen.rung}` : screen.name
  return (
    <div key={key} className="h-full relative">
      <div className="px-iris pointer-events-none fixed inset-0 z-50" aria-hidden />
      <Screen screen={screen} returnTo={returnTo} arriveRef={arriveRef} />
    </div>
  )
}

function Screen({ screen, returnTo, arriveRef }: { screen: ReturnType<typeof useNav.getState>['screen']; returnTo: string | null; arriveRef: React.MutableRefObject<boolean> }) {
  switch (screen.name) {
    case 'ladder': {
      const arrive = arriveRef.current
      arriveRef.current = false
      return <Office arrive={arrive} returnTo={returnTo ?? undefined} />
    }
    case 'rung':
      // A rung link opens the floor card; returning from a mission goes
      // through goBack, which lands on the office with `returnTo` set.
      return <Office key={`rung-${screen.rung}`} focusRung={screen.rung} returnTo={returnTo ?? screen.fromMission} />
    case 'mission': {
      const m = missionById(screen.missionId)
      if (!m) return <Office />
      // key forces a fresh engine per mission id
      return <MissionScreen key={m.id} mission={m} />
    }
    case 'settings':
      return <Settings />
    case 'sprites':
      return <SpriteSheet />
  }
}
