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
  | { name: 'rung'; rung: Rung; fromMission?: string }
  | { name: 'mission'; missionId: string }
  | { name: 'settings' }
  | { name: 'sprites' }

interface NavState {
  screen: Screen
  /** Mission the player just left; the office seats them at its desk. Not part of the URL. */
  returnTo: string | null
  go: (s: Screen) => void
  /**
   * Leave the current screen for the office. Pops history when this app
   * pushed the current entry (so the phone back gesture stays sane),
   * otherwise navigates to the office directly.
   */
  goBack: (fromMission?: string) => void
  clearReturnTo: () => void
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
    case 'sprites':
      return '#/sprites'
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
  if (parts.length === 1 && parts[0] === 'sprites') {
    return { name: 'sprites' }
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
  returnTo: null,
  go: (screen) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0 })
      // Assigning location.hash directly scrolls to any matching element
      // id; pushState changes the URL without scrolling and gives the phone
      // back gesture something to return to (the office) instead of exiting.
      // The pushed state carries the app's own depth so goBack can tell an
      // entry it created from the one the player arrived on.
      const hash = hashFor(screen)
      const url = window.location.pathname + window.location.search + hash
      if (window.location.hash !== hash) {
        const depth = (window.history.state?.d as number | undefined) ?? 0
        window.history.pushState({ d: depth + 1 }, '', url)
      }
    }
    set({ screen })
  },
  goBack: (fromMission) => {
    set({ returnTo: fromMission ?? null })
    if (typeof window !== 'undefined' && ((window.history.state?.d as number | undefined) ?? 0) > 0) {
      window.history.back()
      return
    }
    useNav.getState().go({ name: 'ladder' })
  },
  clearReturnTo: () => set({ returnTo: null }),
}))

// Back/forward support: popstate covers pushState entries, hashchange
// covers a hand-edited hash. Both just mirror the URL into the store.
if (typeof window !== 'undefined') {
  const sync = () => useNav.setState({ screen: screenFromHash(window.location.hash) })
  window.addEventListener('popstate', sync)
  window.addEventListener('hashchange', sync)
}
