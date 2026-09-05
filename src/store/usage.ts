import { create } from 'zustand'

/**
 * Session-only Mentor usage counter. Not persisted: it is a nudge, not
 * accounting. Reset on reload.
 */
interface UsageState {
  calls: number
  inputTokens: number
  outputTokens: number
  /** Estimated USD at the prices in src/lib/pricing.ts. */
  cost: number
  record: (u: { inputTokens: number; outputTokens: number; cost: number }) => void
  reset: () => void
}

export const useUsage = create<UsageState>()((set) => ({
  calls: 0,
  inputTokens: 0,
  outputTokens: 0,
  cost: 0,
  record: (u) =>
    set((s) => ({
      calls: s.calls + 1,
      inputTokens: s.inputTokens + u.inputTokens,
      outputTokens: s.outputTokens + u.outputTokens,
      cost: s.cost + u.cost,
    })),
  reset: () => set({ calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 }),
}))
