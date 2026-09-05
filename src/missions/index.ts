import type { Mission, Rung } from '../engine/types'
import r1IncomeStatementOrder from './r1-income-statement-order'

/** Register every mission here. Order within a rung comes from `mission.order`. */
export const MISSIONS: Mission[] = [r1IncomeStatementOrder].sort(
  (a, b) => a.rung - b.rung || a.order - b.order,
)

export function missionsForRung(rung: Rung, mentor: boolean): Mission[] {
  return MISSIONS.filter((m) => m.rung === rung && (mentor || !m.mentorOnly))
}

export function missionById(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id)
}
