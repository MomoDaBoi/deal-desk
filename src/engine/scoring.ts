import type { Mission } from './types'

/** Rung pass threshold as a fraction of the rung's total base comp. */
export const PASS_THRESHOLD = 0.7
/** Max speed bonus as a fraction of base comp. */
export const SPEED_BONUS_MAX = 0.2
/** A mission attempt counts as a fail below this accuracy. */
export const FAIL_BELOW = 0.5
/** Consecutive fails that trigger a performance review. */
export const REVIEW_AFTER_FAILS = 3

export interface CompBreakdown {
  accuracyComp: number
  speedBonus: number
  total: number
  passed: boolean
}

/**
 * Comp for one attempt.
 * - accuracy (0..1) scales baseComp linearly.
 * - speed bonus only applies on a pass, scales linearly from 0 at par
 *   to SPEED_BONUS_MAX at half par or faster, and is itself scaled by accuracy.
 */
export function computeComp(
  mission: Pick<Mission, 'baseComp' | 'parSeconds'>,
  accuracy: number,
  elapsedSeconds: number,
): CompBreakdown {
  const acc = clamp(accuracy, 0, 1)
  const accuracyComp = Math.round(mission.baseComp * acc)
  const passed = acc >= FAIL_BELOW

  let speedBonus = 0
  if (passed && elapsedSeconds < mission.parSeconds) {
    const half = mission.parSeconds / 2
    const t = clamp((mission.parSeconds - elapsedSeconds) / (mission.parSeconds - half), 0, 1)
    speedBonus = Math.round(mission.baseComp * SPEED_BONUS_MAX * t * acc)
  }

  return { accuracyComp, speedBonus, total: accuracyComp + speedBonus, passed }
}

export interface RungStatus {
  earned: number
  possible: number
  fraction: number
  passed: boolean
  perfect: boolean
}

/**
 * Rung status from best comp per mission. `best` maps missionId -> best total comp.
 * `possible` counts base comp only, so a speed bonus can push fraction above 1.
 */
export function rungStatus(missions: Mission[], best: Record<string, number>): RungStatus {
  const possible = missions.reduce((s, m) => s + m.baseComp, 0)
  const earned = missions.reduce((s, m) => s + (best[m.id] ?? 0), 0)
  const fraction = possible === 0 ? 0 : earned / possible
  const perfect = missions.length > 0 && missions.every((m) => (best[m.id] ?? 0) >= m.baseComp)
  return { earned, possible, fraction, passed: possible > 0 && fraction >= PASS_THRESHOLD, perfect }
}

export function formatComp(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}
