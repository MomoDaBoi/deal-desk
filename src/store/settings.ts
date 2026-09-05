import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Settings live in their OWN localStorage key so the API key is never
 * part of a progress export. The key is only ever sent to api.anthropic.com
 * (Milestone 4). In Milestone 1 nothing reads it except the Settings screen.
 */
export const SETTINGS_KEY = 'deal-desk:settings'

interface SettingsState {
  apiKey: string
  /** Player-chosen. Only honoured when an API key is present. */
  mentorEnabled: boolean
  soundOn: boolean
  setApiKey: (k: string) => void
  setMentorEnabled: (v: boolean) => void
  setSoundOn: (v: boolean) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: '',
      mentorEnabled: true,
      soundOn: false,
      setApiKey: (apiKey) => set({ apiKey: apiKey.trim() }),
      setMentorEnabled: (mentorEnabled) => set({ mentorEnabled }),
      setSoundOn: (soundOn) => set({ soundOn }),
    }),
    { name: SETTINGS_KEY, storage: createJSONStorage(() => localStorage) },
  ),
)

/** The single source of truth for "is Mentor mode on". */
export function useMentorMode(): boolean {
  return useSettings((s) => s.apiKey.length > 0 && s.mentorEnabled)
}

export function looksLikeAnthropicKey(k: string): boolean {
  return /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(k.trim())
}
