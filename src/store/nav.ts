import { create } from 'zustand'
import type { Rung } from '../engine/types'

/**
 * Screen state instead of a router: four screens. The hash is kept in sync
 * so a mission (or rung/settings) can be shared as a link, e.g.
 * `#/mission/r1-three-statements`, `#/rung/2`, `#/settings`. GitHub Pages
 * does not rewrite unknown paths, so real routing is out; the hash is
 * client-side only and never hits the server.
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

/** Build the hash for a screen. Ladder clears the hash entirely. */
function hashFor(screen: Screen): string {
  switch (screen.name) {
    case 'mission':
      return `#/mission/${encodeURIComponent(screen.missionId)}`
    case 'rung':
      return `#/rung/${screen.rung}`
    case 'settings':
      return '#/settings'
    case 'ladder':
      return ''
  }
}

/**
 * Parse `#/mission/<id>`, `#/rung/<n>`, or `#/settings` into a Screen.
 * Anything else (including no hash) falls back to the ladder. An unknown
 * mission id is passed through as-is: App.tsx's `missionById` lookup
 * already falls back to the ladder when the id isn't registered, and a
 * locked rung stays reachable by hash, which is fine for a game.
 */
function screenFromHash(hash: string): Screen {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)

  if (parts.length === 1 && parts[0] === 'settings') {
    return { name: 'settings' }
  }

  if (parts.length === 2 && parts[0] === 'rung') {
    const n = Number(parts[1])
    if (Number.isInteger(n) && n >= 1 && n <= 5) {
      return { name: 'rung', rung: n as Rung }
    }
  }

  if (parts.length === 2 && parts[0] === 'mission') {
    const id = decodeURIComponent(parts[1])
    if (id) return { name: 'mission', missionId: id }
  }

  return { name: 'ladder' }
}

function initialScreen(): Screen {
  if (typeof window === 'undefined') return { name: 'ladder' }
  return screenFromHash(window.location.hash)
}

export const useNav = create<NavState>()((set) => ({
  screen: initialScreen(),
  go: (screen) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0 })
      // Assigning location.hash directly scrolls to any matching element
      // id; replaceState swaps the URL without touching scroll position
      // or pushing a new history entry for every in-app navigation.
      const hash = hashFor(screen)
      const url = window.location.pathname + window.location.search + hash
      window.history.replaceState(null, '', url)
    }
    set({ screen })
  },
}))

// Back/forward button support: the browser changes the hash on its own
// (e.g. via history entries from a previous session or a manual edit),
// so mirror it into the store.
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    useNav.setState({ screen: screenFromHash(window.location.hash) })
  })
}
