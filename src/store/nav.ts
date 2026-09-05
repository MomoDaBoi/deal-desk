import { create } from 'zustand'
import type { Rung } from '../engine/types'

/**
 * Screen state instead of a router: four screens, no deep links needed,
 * and GitHub Pages does not rewrite unknown paths.
 */
export type Screen =
  | { name: 'ladder' }
  | { name: 'rung'; rung: Rung }
  | { name: 'mission'; missionId: string }
  | { name: 'settings' }

interface NavState {
  screen: Screen
  go: (s: Screen) => void
}

export const useNav = create<NavState>()((set) => ({
  screen: { name: 'ladder' },
  go: (screen) => {
    window.scrollTo({ top: 0 })
    set({ screen })
  },
}))
