import { useNav } from './store/nav'
import { missionById } from './missions'
import { Office } from './screens/Office'
import { MissionScreen } from './screens/MissionScreen'
import { Settings } from './screens/Settings'
import { SpriteSheet } from './screens/SpriteSheet'

export default function App() {
  const screen = useNav((s) => s.screen)
  // A short iris wipe on every screen change so transitions feel like a
  // console game rather than a web page swapping divs.
  const key = screen.name === 'mission' ? `mission:${screen.missionId}` : screen.name === 'rung' ? `rung:${screen.fromMission ?? screen.rung}` : screen.name
  return (
    <div key={key} className="h-full relative">
      <div className="px-iris pointer-events-none fixed inset-0 z-50" aria-hidden />
      <Screen screen={screen} />
    </div>
  )
}

function Screen({ screen }: { screen: ReturnType<typeof useNav.getState>['screen'] }) {
  switch (screen.name) {
    case 'ladder':
      return <Office />
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
