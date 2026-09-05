import { useNav } from './store/nav'
import { missionById } from './missions'
import { Ladder } from './screens/Ladder'
import { RungScreen } from './screens/RungScreen'
import { MissionScreen } from './screens/MissionScreen'
import { Settings } from './screens/Settings'

export default function App() {
  const screen = useNav((s) => s.screen)

  switch (screen.name) {
    case 'ladder':
      return <Ladder />
    case 'rung':
      return <RungScreen rung={screen.rung} />
    case 'mission': {
      const m = missionById(screen.missionId)
      if (!m) return <Ladder />
      // key forces a fresh engine per mission id
      return <MissionScreen key={m.id} mission={m} />
    }
    case 'settings':
      return <Settings />
  }
}
