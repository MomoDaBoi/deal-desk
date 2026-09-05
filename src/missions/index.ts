import type { Mission, Rung } from '../engine/types'
import r1ThreeStatements from './r1-three-statements'
import r1IncomeStatementOrder from './r1-income-statement-order'
import r1BalanceSheet from './r1-balance-sheet'
import r1CashFlowSort from './r1-cash-flow-sort'
import r1BossLemonade from './r1-boss-lemonade'

/** Register every mission here. Order within a rung comes from `mission.order`. */
export const MISSIONS: Mission[] = [
  r1ThreeStatements,
  r1IncomeStatementOrder,
  r1BalanceSheet,
  r1CashFlowSort,
  r1BossLemonade,
].sort((a, b) => a.rung - b.rung || a.order - b.order)

export function missionsForRung(rung: Rung, mentor: boolean): Mission[] {
  return MISSIONS.filter((m) => m.rung === rung && (mentor || !m.mentorOnly))
}

export function missionById(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id)
}
