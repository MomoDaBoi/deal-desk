import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Rung } from '../engine/types'
import { REVIEW_AFTER_FAILS } from '../engine/scoring'

export const PROGRESS_KEY = 'deal-desk:progress'
export const PROGRESS_VERSION = 1

export interface AttemptRecord {
  missionId: string
  accuracy: number
  comp: number
  elapsedSeconds: number
  at: string // ISO
}

/** The exportable part of progress. Never contains the API key. */
export interface ProgressData {
  version: number
  /** Best total comp per mission id. */
  best: Record<string, number>
  /** Last N attempts, newest last. */
  attempts: AttemptRecord[]
  /** Consecutive fails per mission id. Reset on pass. */
  failStreak: Record<string, number>
  /** Rungs whose "bonus season" screen was already shown. */
  bonusSeen: Rung[]
  createdAt: string
  updatedAt: string
}

interface ProgressState extends ProgressData {
  recordAttempt: (a: Omit<AttemptRecord, 'at'>) => { newBest: boolean; needsReview: boolean }
  markBonusSeen: (rung: Rung) => void
  clearFailStreak: (missionId: string) => void
  exportJSON: () => string
  importJSON: (raw: string) => { ok: true } | { ok: false; error: string }
  reset: () => void
}

const MAX_ATTEMPTS = 200

function fresh(): ProgressData {
  const now = new Date().toISOString()
  return {
    version: PROGRESS_VERSION,
    best: {},
    attempts: [],
    failStreak: {},
    bonusSeen: [],
    createdAt: now,
    updatedAt: now,
  }
}

function pickData(s: ProgressData): ProgressData {
  return {
    version: s.version,
    best: s.best,
    attempts: s.attempts,
    failStreak: s.failStreak,
    bonusSeen: s.bonusSeen,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }
}

/** Validate an imported blob. Strict enough to reject garbage, loose enough to accept older versions. */
export function parseProgress(raw: string): { ok: true; data: ProgressData } | { ok: false; error: string } {
  let obj: unknown
  try {
    obj = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'That is not valid JSON.' }
  }
  if (!obj || typeof obj !== 'object') return { ok: false, error: 'Expected an object.' }
  const o = obj as Record<string, unknown>
  if (typeof o.version !== 'number') return { ok: false, error: 'Missing version field. Is this a Deal Desk save?' }
  if (o.version > PROGRESS_VERSION) return { ok: false, error: `Save is version ${o.version}; this build reads up to ${PROGRESS_VERSION}.` }
  const best = isRecordOfNumbers(o.best) ? o.best : null
  if (!best) return { ok: false, error: 'Missing or malformed "best" field.' }
  const attempts = Array.isArray(o.attempts) ? (o.attempts as AttemptRecord[]).filter(isAttempt) : []
  const failStreak = isRecordOfNumbers(o.failStreak) ? o.failStreak : {}
  const bonusSeen = Array.isArray(o.bonusSeen) ? (o.bonusSeen.filter((r) => [1, 2, 3, 4, 5].includes(r as number)) as Rung[]) : []
  const now = new Date().toISOString()
  return {
    ok: true,
    data: {
      version: PROGRESS_VERSION,
      best,
      attempts,
      failStreak,
      bonusSeen,
      createdAt: typeof o.createdAt === 'string' ? o.createdAt : now,
      updatedAt: now,
    },
  }
}

function isRecordOfNumbers(v: unknown): v is Record<string, number> {
  return !!v && typeof v === 'object' && !Array.isArray(v) && Object.values(v as object).every((n) => typeof n === 'number')
}

function isAttempt(a: unknown): a is AttemptRecord {
  if (!a || typeof a !== 'object') return false
  const o = a as Record<string, unknown>
  return typeof o.missionId === 'string' && typeof o.accuracy === 'number' && typeof o.comp === 'number'
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...fresh(),

      recordAttempt(a) {
        const s = get()
        const prevBest = s.best[a.missionId] ?? 0
        const newBest = a.comp > prevBest
        const passed = a.accuracy >= 0.5
        const streak = passed ? 0 : (s.failStreak[a.missionId] ?? 0) + 1
        const needsReview = !passed && streak >= REVIEW_AFTER_FAILS
        set({
          best: newBest ? { ...s.best, [a.missionId]: a.comp } : s.best,
          attempts: [...s.attempts, { ...a, at: new Date().toISOString() }].slice(-MAX_ATTEMPTS),
          failStreak: { ...s.failStreak, [a.missionId]: needsReview ? 0 : streak },
          updatedAt: new Date().toISOString(),
        })
        return { newBest, needsReview }
      },

      markBonusSeen(rung) {
        const s = get()
        if (s.bonusSeen.includes(rung)) return
        set({ bonusSeen: [...s.bonusSeen, rung] })
      },

      clearFailStreak(missionId) {
        set((s) => ({ failStreak: { ...s.failStreak, [missionId]: 0 } }))
      },

      exportJSON() {
        return JSON.stringify(pickData(get()), null, 2)
      },

      importJSON(raw) {
        const r = parseProgress(raw)
        if (!r.ok) return r
        set(r.data)
        return { ok: true }
      },

      reset() {
        set(fresh())
      },
    }),
    {
      name: PROGRESS_KEY,
      version: PROGRESS_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => pickData(s),
    },
  ),
)
