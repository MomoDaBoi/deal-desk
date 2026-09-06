import { useState } from 'react'
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
  const go = useNav((s) => s.go)
  // The title card shows once per browser session, and only when the app
  // opened on the office (a deep link into a mission skips it).
  const [showTitle, setShowTitle] = useState(() => screen.name === 'ladder' && !titleSeen())
  const [arriving, setArriving] = useState(false)

  if (showTitle) {
    const start = () => {
      try {
        sessionStorage.setItem(TITLE_SEEN_KEY, '1')
      } catch {
        // private mode: the title will simply show again next time
      }
      setArriving(true)
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
  const key = screen.name === 'mission' ? `mission:${screen.missionId}` : screen.name === 'rung' ? `rung:${screen.fromMission ?? screen.rung}` : screen.name
  return (
    <div key={key} className="h-full relative">
      <div className="px-iris pointer-events-none fixed inset-0 z-50" aria-hidden />
      <Screen screen={screen} arriving={arriving} />
    </div>
  )
}

function Screen({ screen, arriving }: { screen: ReturnType<typeof useNav.getState>['screen']; arriving: boolean }) {
  switch (screen.name) {
    case 'ladder':
      return <Office arrive={arriving} />
    case 'rung':
      // Coming back from a mission seats the player at that desk; a plain
      // rung link opens the floor card instead.
      return screen.fromMission ? <Office key={screen.fromMission} returnTo={screen.fromMission} /> : <Office key={`rung-${screen.rung}`} focusRung={screen.rung} />
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
