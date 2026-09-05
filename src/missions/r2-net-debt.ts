import type { Mission } from '../engine/types'
import { gradeBalance } from '../engine/graders/balance'
import { mdVerdict } from '../engine/voice'
import { LEDGERLY } from './companies'

/**
 * Rung 2, mission 4. Net debt for Ledgerly Inc., plus the twist that not
 * all cash is fair game against debt. Fixed figures from the Rung 2
 * company bible (fiscal year 2025).
 */
const { cash, shortTermDebt, longTermDebt, totalDebt } = LEDGERLY.balance!
const RESTRICTED = 10_000
const NET_DEBT = totalDebt - cash
const NET_DEBT_RESTRICTED = totalDebt - (cash - RESTRICTED)

const mission: Mission = {
  id: 'r2-net-debt',
  rung: 2,
  order: 4,
  title: 'Net debt',
  tagline: 'Debt minus the cash that could actually pay it off.',
  baseComp: 6_000,
  parSeconds: 120,
  lesson: {
    title: 'Net debt: what a company really owes',
    body:
      'Net debt = total debt − cash. A company sitting on cash could, in theory, wire it out tomorrow and retire that much debt, so bankers net the cash against the debt instead of looking at debt alone. Ledgerly owes $60,000k in total debt and holds $30,000k in cash, so its net debt is $30,000k. But restricted cash — cash set aside for a specific purpose, like an escrow or a covenant, that cannot be used to repay debt — does not count. If $10,000k of that cash is restricted, only $20,000k is left to offset debt, so net debt rises to $40,000k.',
    visual: {
      kind: 'bars',
      unit: '$k',
      items: [
        { label: 'Total debt', value: totalDebt, role: 'debt' },
        { label: 'Cash', value: cash, role: 'cash' },
        { label: 'Net debt', value: NET_DEBT, role: 'debt' },
      ],
    },
  },
  task: {
    kind: 'balance',
    prompt: "Ledgerly's treasurer wants net debt two ways. Fill in the blanks.",
    unit: '$k',
    tolerance: 0,
    sections: [
      {
        id: 'inputs',
        label: 'Inputs',
        role: 'debt',
        lines: [
          { id: 'short-term-debt', label: 'Short-term debt', value: shortTermDebt },
          { id: 'long-term-debt', label: 'Long-term debt', value: longTermDebt },
          { id: 'total-debt', label: 'Total debt', value: totalDebt, total: true },
          { id: 'cash', label: 'Cash', value: cash },
        ],
      },
      {
        id: 'netdebt',
        label: 'Net debt',
        role: 'cash',
        lines: [
          {
            id: 'net-debt',
            label: 'Net debt',
            answer: NET_DEBT,
            note: 'Total debt minus cash',
          },
          {
            id: 'net-debt-restricted',
            label: 'Net debt if $10,000k of cash is restricted (cannot be used to repay debt)',
            answer: NET_DEBT_RESTRICTED,
            note: 'Total debt minus the unrestricted cash left over',
          },
        ],
      },
    ],
  },
  grade(answer) {
    if (answer.kind !== 'balance') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'balance') throw new Error('wrong task kind')
    return gradeBalance(mission.task, answer, ({ accuracy, wrongIds, blanks }) => {
      const netDebtGot = blanks.find((b) => b.id === 'net-debt')?.got ?? null
      const signTrap = netDebtGot !== null && netDebtGot === totalDebt + cash

      if (accuracy === 1) {
        return {
          verdict: mdVerdict(accuracy, mission.id),
          explanation:
            `Net debt is total debt minus cash: ${totalDebt.toLocaleString()} − ${cash.toLocaleString()} = ${NET_DEBT.toLocaleString()}. With $10,000k of cash restricted, only ${(cash - RESTRICTED).toLocaleString()} is left to offset debt: ${totalDebt.toLocaleString()} − ${(cash - RESTRICTED).toLocaleString()} = ${NET_DEBT_RESTRICTED.toLocaleString()}.`,
        }
      }
      if (accuracy === 0) {
        return {
          verdict: mdVerdict(accuracy, mission.id),
          explanation:
            `Neither blank landed. Net debt is total debt minus cash, never plus: ${totalDebt.toLocaleString()} − ${cash.toLocaleString()} = ${NET_DEBT.toLocaleString()}. Restricted cash cannot be used to repay debt, so it drops out of the offset: with $10,000k restricted, only ${(cash - RESTRICTED).toLocaleString()} of cash still counts, giving ${totalDebt.toLocaleString()} − ${(cash - RESTRICTED).toLocaleString()} = ${NET_DEBT_RESTRICTED.toLocaleString()}.`,
        }
      }
      const hints: string[] = []
      if (wrongIds.includes('net-debt')) {
        if (signTrap) {
          hints.push(
            `Net debt subtracts cash, it does not add it: ${totalDebt.toLocaleString()} − ${cash.toLocaleString()} = ${NET_DEBT.toLocaleString()}, not ${totalDebt.toLocaleString()} + ${cash.toLocaleString()}. Cash offsets debt because it could repay it tomorrow.`,
          )
        } else {
          hints.push(
            `Net debt is total debt minus cash: ${totalDebt.toLocaleString()} − ${cash.toLocaleString()} = ${NET_DEBT.toLocaleString()}.`,
          )
        }
      }
      if (wrongIds.includes('net-debt-restricted'))
        hints.push(
          `Restricted cash cannot be used to repay debt, so it stays out of the offset. Only ${(cash - RESTRICTED).toLocaleString()} of the ${cash.toLocaleString()} cash is unrestricted, so net debt is ${totalDebt.toLocaleString()} − ${(cash - RESTRICTED).toLocaleString()} = ${NET_DEBT_RESTRICTED.toLocaleString()}.`,
        )
      return {
        verdict: mdVerdict(accuracy, mission.id),
        explanation: hints.join(' '),
      }
    })
  },
}

export default mission
