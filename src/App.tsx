import { useNav } from './store/nav'
import { missionById } from './missions'
import { Office } from './screens/Office'
import { MissionScreen } from './screens/MissionScreen'
import { Settings } from './screens/Settings'
import { SpriteSheet } from './screens/SpriteSheet'

export default function App() {
  const screen = useNav((s) => s.screen)

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
