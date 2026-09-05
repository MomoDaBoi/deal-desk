/**
 * Core mission contract. Every file in src/missions exports one `Mission`.
 * Adding a mission = adding a file and registering it in src/missions/index.ts.
 */

export type Rung = 1 | 2 | 3 | 4 | 5

export const RUNG_TITLES: Record<Rung, string> = {
  1: 'Intern',
  2: 'Analyst',
  3: 'Associate',
  4: 'VP',
  5: 'MD',
}

export const RUNG_SUBTITLES: Record<Rung, string> = {
  1: 'Reading the statements',
  2: 'The numbers bankers care about',
  3: 'Valuation by comparison',
  4: 'Intrinsic value',
  5: 'Deals',
}

/** One-visual, under-120-word lesson card shown before the task. */
export interface Lesson {
  title: string
  /** Plain prose. Keep under 120 words. */
  body: string
  /** Optional visual hint rendered by the Lesson component. */
  visual?: { kind: 'bullets'; items: string[] } | { kind: 'none' }
}

/**
 * Task kinds. Shipped: order, sort, balance, quiz. Planned (see PLAN.md):
 * slider, waterfall, bridge, footballfield, heatmap, written, auction.
 */
export interface OrderTask {
  kind: 'order'
  prompt: string
  /** Items in their CORRECT order. The engine shuffles for display. */
  items: OrderItem[]
}

export interface OrderItem {
  id: string
  label: string
  /** Optional colour role for the chip. */
  role?: 'revenue' | 'cost' | 'debt' | 'equity' | 'cash' | 'neutral'
}

/** Colour role for chips, bars, and labels. Matches the theme tokens. */
export type Role = 'revenue' | 'cost' | 'debt' | 'equity' | 'cash' | 'neutral'

/**
 * Sort items into buckets (e.g. cash flow lines into operating / investing /
 * financing, or line items into the statement they live on).
 */
export interface SortTask {
  kind: 'sort'
  prompt: string
  buckets: { id: string; label: string; role?: Role; hint?: string }[]
  /** `bucketId` is the CORRECT bucket. The engine hides it from the player. */
  items: { id: string; label: string; bucketId: string; role?: Role }[]
}

/**
 * Fill in the blanks on a statement so it balances. Lines with `value` are
 * shown; lines with `answer` are blanks the player types into. A line may
 * carry a `formula` note used only in explanations.
 */
export interface BalanceTask {
  kind: 'balance'
  prompt: string
  /** Currency unit label shown next to inputs, e.g. "$k". */
  unit?: string
  /** Absolute tolerance for a blank to count as correct. Default 0. */
  tolerance?: number
  sections: {
    id: string
    label: string
    role?: Role
    lines: BalanceLine[]
  }[]
}

export interface BalanceLine {
  id: string
  label: string
  /** Shown value (known line). Omit for a blank. */
  value?: number
  /** Correct value for a blank. Present only when `value` is absent. */
  answer?: number
  /** Optional per-line explanation shown on the result screen. */
  note?: string
  /** Render as a subtotal/total row. */
  total?: boolean
}

/** Multiple choice, optionally timed. Boss fights use this. */
export interface QuizTask {
  kind: 'quiz'
  prompt: string
  /** Whole-quiz time limit. Omit for untimed. */
  timeLimitSeconds?: number
  questions: {
    id: string
    text: string
    choices: { id: string; label: string }[]
    correctId: string
    /** Why the correct answer is correct; shown on the result screen. */
    explanation: string
  }[]
}

export type Task = OrderTask | SortTask | BalanceTask | QuizTask

/** What the player submitted. Shape follows the task kind. */
export type OrderAnswer = { kind: 'order'; orderedIds: string[] }
/** itemId -> bucketId. Missing item = unplaced (counts as wrong). */
export type SortAnswer = { kind: 'sort'; placements: Record<string, string> }
/** lineId -> typed number. Missing or null = blank (counts as wrong). */
export type BalanceAnswer = { kind: 'balance'; values: Record<string, number | null> }
/** questionId -> choiceId. Missing or null = unanswered (counts as wrong). */
export type QuizAnswer = { kind: 'quiz'; choices: Record<string, string | null>; timedOut?: boolean }

export type Answer = OrderAnswer | SortAnswer | BalanceAnswer | QuizAnswer

export interface GradeResult {
  /** 0..1 accuracy. */
  accuracy: number
  /** Short verdict line in the MD's voice. */
  verdict: string
  /** The actual explanation. Jokes never replace this. */
  explanation: string
  /** Optional per-item feedback for the result screen. */
  details?: { id: string; ok: boolean; note?: string }[]
}

export interface Mission {
  id: string
  rung: Rung
  /** Position within the rung, 1-based. */
  order: number
  title: string
  /** Short flavour line under the title on the ladder. */
  tagline: string
  /** Base comp in fake dollars for a perfect, unhurried run. */
  baseComp: number
  /** Seconds. Finishing under par earns a speed bonus. */
  parSeconds: number
  boss?: boolean
  /** Requires Mentor mode (API key). Hidden in Standard mode. */
  mentorOnly?: boolean
  lesson: Lesson
  task: Task
  grade: (answer: Answer) => GradeResult
}
