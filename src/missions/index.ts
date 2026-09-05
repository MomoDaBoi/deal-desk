import type { Mission, Rung } from '../engine/types'
import r1ThreeStatements from './r1-three-statements'
import r1IncomeStatementOrder from './r1-income-statement-order'
import r1BalanceSheet from './r1-balance-sheet'
import r1CashFlowSort from './r1-cash-flow-sort'
import r1BossLemonade from './r1-boss-lemonade'
import r2WaterfallEbitda from './r2-waterfall-ebitda'
import r2Margins from './r2-margins'
import r2GrowthRates from './r2-growth-rates'
import r2NetDebt from './r2-net-debt'
import r2EvVsEquity from './r2-ev-vs-equity'
import r2BossEvBridge from './r2-boss-ev-bridge'
import r3Multiples from './r3-multiples'
import r3WhichMultiple from './r3-which-multiple'
import r3PeerSet from './r3-peer-set'
import r3Precedents from './r3-precedents'
import r3FootballField from './r3-football-field'
import r3BossThreeWays from './r3-boss-three-ways'
import m2WrittenEv from './m2-written-ev'
import m3WrittenPeers from './m3-written-peers'

/** Register every mission here. Order within a rung comes from `mission.order`. */
export const MISSIONS: Mission[] = [
  r1ThreeStatements,
  r1IncomeStatementOrder,
  r1BalanceSheet,
  r1CashFlowSort,
  r1BossLemonade,
  r2WaterfallEbitda,
  r2Margins,
  r2GrowthRates,
  r2NetDebt,
  r2EvVsEquity,
  r2BossEvBridge,
  r3Multiples,
  r3WhichMultiple,
  r3PeerSet,
  r3Precedents,
  r3FootballField,
  r3BossThreeWays,
  m2WrittenEv,
  m3WrittenPeers,
].sort((a, b) => a.rung - b.rung || a.order - b.order)

export function missionsForRung(rung: Rung, mentor: boolean): Mission[] {
  return MISSIONS.filter((m) => m.rung === rung && (mentor || !m.mentorOnly))
}

export function missionById(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id)
}
