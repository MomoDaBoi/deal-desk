import type { Mission } from '../engine/types'
import { gradeHeatmap } from '../engine/graders/heatmap'
import { mdVerdict } from '../engine/voice'
import { BRICKHOUSE } from './companies'
import { fcfPath } from './r4-fcf-forecast'

/**
 * Rung 4, mission 5. A DCF (discounted cash flow) collapses onto a single
 * price only if you pretend WACC and terminal growth are known exactly.
 * They never are, so this mission builds a sensitivity table: the implied
 * Brickhouse Industrial share price across a 5x5 grid of WACC and terminal
 * growth, so the player reads a defensible range instead of quoting one
 * cell as gospel.
 *
 * The five-year free cash flow (FCF) path reuses `fcfPath` from
 * `r4-fcf-forecast.ts` (same pure function, same management growth case:
 * 6%, 6%, 5%, 5%, 4% off Brickhouse's $640,000k base revenue) so this
 * mission's cash flows can never drift from rung 4's earlier one. Net debt
 * ($220,000k) and shares (40,000k) are Brickhouse's bible entry
 * (src/missions/companies.ts).
 *
 * Per-cell model:
 *   PV of years 1-5 FCF   sum FCF_t / (1 + WACC)^t
 *   Terminal value (TV)   FCF_year5 x (1 + g) / (WACC - g)          [Gordon growth]
 *   PV of TV              TV / (1 + WACC)^5
 *   Enterprise value      PV of FCF + PV of TV
 *   Equity value          Enterprise value - net debt
 *   Share price           Equity value / shares outstanding
 */

const MANAGEMENT_CASE: readonly number[] = [6, 6, 5, 5, 4]
const NET_DEBT_K = BRICKHOUSE.market!.netDebt // 220,000
const SHARES_K = BRICKHOUSE.market!.sharesK // 40,000

const FCF_PATH_K = fcfPath(MANAGEMENT_CASE as number[]) // 5 years, $k
const YEAR5_FCF_K = FCF_PATH_K[4]

/** Sum of years 1-5 FCF discounted at `waccPct`, in $k. */
function pvExplicitFcf(waccPct: number): number {
  const w = waccPct / 100
  return FCF_PATH_K.reduce((sum, fcf, i) => sum + fcf / Math.pow(1 + w, i + 1), 0)
}

/** Gordon growth terminal value set at the end of year 5, in $k. */
function terminalValue(waccPct: number, growthPct: number): number {
  const w = waccPct / 100
  const g = growthPct / 100
  return (YEAR5_FCF_K * (1 + g)) / (w - g)
}

/** One sensitivity-table cell: the implied Brickhouse share price at this WACC and terminal growth. */
function impliedSharePrice(waccPct: number, growthPct: number): number {
  const pvFcf = pvExplicitFcf(waccPct)
  const pvTv = terminalValue(waccPct, growthPct) / Math.pow(1 + waccPct / 100, 5)
  const enterpriseValue = pvFcf + pvTv
  const equityValue = enterpriseValue - NET_DEBT_K
  const price = equityValue / SHARES_K
  return Math.round(price * 100) / 100
}

const WACC_ROWS_PCT = [7.3, 7.8, 8.3, 8.8, 9.3] as const
const GROWTH_COLS_PCT = [1.0, 1.5, 2.0, 2.5, 3.0] as const

const ROW_IDS = ['w1', 'w2', 'w3', 'w4', 'w5'] as const
const COL_IDS = ['g1', 'g2', 'g3', 'g4', 'g5'] as const

/** Every cell in the 5x5 grid, keyed "rowId:colId", built from the one pure model above. */
function buildCells(): Record<string, number> {
  const cells: Record<string, number> = {}
  ROW_IDS.forEach((rowId, i) => {
    COL_IDS.forEach((colId, j) => {
      cells[`${rowId}:${colId}`] = impliedSharePrice(WACC_ROWS_PCT[i], GROWTH_COLS_PCT[j])
    })
  })
  return cells
}

const CELLS = buildCells()

/** Centre cell: WACC 8.3%, terminal growth 2.0% — the base case the tap question targets. */
const CENTRE_KEY = 'w3:g3'
const CENTRE_PRICE = CELLS[CENTRE_KEY]

/** Six blanks spread across the grid's corners and two off-centre midpoints, never the centre cell. */
const BLANKS = ['w1:g1', 'w1:g5', 'w5:g1', 'w5:g5', 'w2:g3', 'w4:g3'] as const

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}k`

const WORKED_CELL_LINE = `Take the centre cell: WACC ${WACC_ROWS_PCT[2].toFixed(1)}%, terminal growth ${GROWTH_COLS_PCT[2].toFixed(1)}%. Discount years 1-5 free cash flow (ending at ${money(YEAR5_FCF_K)} in year 5) back at ${WACC_ROWS_PCT[2].toFixed(1)}% and add the Gordon-growth terminal value — year-5 FCF x 1.02 / (8.3% - 2.0%) — also discounted back 5 years. Subtract net debt (${money(NET_DEBT_K)}) and divide by ${(SHARES_K / 1000).toLocaleString('en-US')}M shares: $${CENTRE_PRICE.toFixed(2)} a share.`

const RANGE_LINE = `Across the grid the price ranges from $${Math.min(...Object.values(CELLS)).toFixed(2)} (highest WACC, lowest growth) to $${Math.max(...Object.values(CELLS)).toFixed(2)} (lowest WACC, highest growth) — that spread is the real answer, not any single cell.`

function cellLabel(key: string): string {
  const [rowId, colId] = key.split(':')
  const rowIdx = ROW_IDS.indexOf(rowId as (typeof ROW_IDS)[number])
  const colIdx = COL_IDS.indexOf(colId as (typeof COL_IDS)[number])
  return `WACC ${WACC_ROWS_PCT[rowIdx].toFixed(1)}%, growth ${GROWTH_COLS_PCT[colIdx].toFixed(1)}%`
}

const mission: Mission = {
  id: 'r4-sensitivity',
  rung: 4,
  order: 5,
  title: 'Never quote one number',
  tagline: 'The DCF gives a price. The sensitivity table gives the truth.',
  baseComp: 10_000,
  parSeconds: 200,
  lesson: {
    title: 'Sensitivity tables: never trust one number',
    body:
      'A DCF (discounted cash flow) turns two assumptions into one price: WACC (weighted average cost of capital, the discount rate applied to future cash flow) and terminal growth (the constant rate free cash flow is assumed to grow forever after the forecast ends). Nudge either input half a point and the implied share price swings by dollars, not cents. A sensitivity table reruns the same DCF across a grid of WACC and terminal-growth pairs, so the whole range is visible at once instead of one output quoted as if it were exact. Read it as a range worth defending, not a single answer to memorize.',
    visual: {
      kind: 'bullets',
      items: [
        'WACC rows: 7.3% to 9.3%, terminal growth columns: 1.0% to 3.0%',
        'Half a point of WACC moves the implied price by dollars, not cents',
        'Every cell is the same DCF, just a different guess about the discount rate and the tail',
      ],
    },
  },
  task: {
    kind: 'heatmap',
    prompt:
      "Fill in Brickhouse Industrial's implied share price at each blank WACC/terminal-growth pair, then tap the cell nearest the base case.",
    unit: '$',
    tolerance: 0.05,
    rowsLabel: 'WACC',
    colsLabel: 'Terminal growth',
    rows: ROW_IDS.map((id, i) => ({ id, label: `${WACC_ROWS_PCT[i].toFixed(1)}%` })),
    cols: COL_IDS.map((id, j) => ({ id, label: `${GROWTH_COLS_PCT[j].toFixed(1)}%` })),
    cells: CELLS,
    blanks: [...BLANKS],
    tap: {
      prompt: `Tap the cell that matches a share price of about $${CENTRE_PRICE.toFixed(2)}.`,
      answer: CENTRE_KEY,
    },
  },
  grade(answer) {
    if (answer.kind !== 'heatmap') throw new Error('wrong answer kind')
    if (mission.task.kind !== 'heatmap') throw new Error('wrong task kind')
    return gradeHeatmap(mission.task, answer, ({ accuracy, wrongIds, blanks, tapOk }) => {
      if (accuracy === 1) {
        return {
          verdict: mdVerdict(accuracy, mission.id),
          explanation: `Every cell landed. ${WORKED_CELL_LINE} ${RANGE_LINE}`,
        }
      }
      const wrongBlankLines = blanks
        .filter((b) => wrongIds.includes(b.key))
        .map((b) => `${cellLabel(b.key)}: expected $${b.expected.toFixed(2)}.`)
      const parts = [WORKED_CELL_LINE]
      if (wrongBlankLines.length > 0) parts.push(...wrongBlankLines)
      if (tapOk === false) parts.push(`The base case is the centre cell (${cellLabel(CENTRE_KEY)}) at $${CENTRE_PRICE.toFixed(2)}.`)
      parts.push(RANGE_LINE)
      return {
        verdict: mdVerdict(accuracy, mission.id),
        explanation: parts.join(' '),
      }
    })
  },
}

export default mission
