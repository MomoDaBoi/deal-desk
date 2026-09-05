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
import r4TimeValue from './r4-time-value'
import r4Wacc from './r4-wacc'
import r4FcfForecast from './r4-fcf-forecast'
import r4TerminalValue from './r4-terminal-value'
import r4Sensitivity from './r4-sensitivity'
import r4BossRealDcf from './r4-boss-real-dcf'
import r5LboBasics from './r5-lbo-basics'
import r5SourcesUses from './r5-sources-uses'
import r5DebtStack from './r5-debt-stack'
import r5AccretionDilution from './r5-accretion-dilution'
import r5Auction from './r5-auction'
import r5Capstone from './r5-capstone'
import m4WrittenDefend from './m4-written-defend'
import m5MockInterview from './m5-mock-interview'

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
  r4TimeValue,
  r4Wacc,
  r4FcfForecast,
  r4TerminalValue,
  r4Sensitivity,
  r4BossRealDcf,
  r5LboBasics,
  r5SourcesUses,
  r5DebtStack,
  r5AccretionDilution,
  r5Auction,
  r5Capstone,
  m4WrittenDefend,
  m5MockInterview,
].sort((a, b) => a.rung - b.rung || a.order - b.order)

export function missionsForRung(rung: Rung, mentor: boolean): Mission[] {
  return MISSIONS.filter((m) => m.rung === rung && (mentor || !m.mentorOnly))
}

export function missionById(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id)
}
