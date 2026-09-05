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
  /** Per-line unit override (e.g. a $k input line inside a % drill). */
  unit?: string
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

/**
 * One or more sliders, each with a target. Accuracy per slider: 1 inside
 * `tolerance`, degrading linearly to 0 at 2x tolerance. Mean across sliders.
 */
export interface SliderTask {
  kind: 'slider'
  prompt: string
  sliders: {
    id: string
    label: string
    min: number
    max: number
    step: number
    answer: number
    tolerance: number
    /** Display unit, e.g. "$", "x", "%". Rendered next to the value. */
    unit?: string
    role?: Role
    hint?: string
  }[]
}

/**
 * The income statement as a bar chart the player fills in. Steps run top to
 * bottom. A `total` step shows the running total (absolute value); other
 * steps are signed deltas. Known steps carry `value`; blanks carry `answer`.
 * Graded like `balance`: fraction of blanks within `tolerance`.
 */
export interface WaterfallTask {
  kind: 'waterfall'
  prompt: string
  unit?: string
  tolerance?: number
  steps: WaterfallStep[]
}

export interface WaterfallStep {
  id: string
  label: string
  role?: Role
  /** Known value: absolute for totals, signed delta otherwise. */
  value?: number
  /** Correct value for a blank (same sign convention as `value`). */
  answer?: number
  total?: boolean
  note?: string
}

/**
 * Two-anchor bridge: start at a known number, apply adjustments, land on a
 * known target. Every adjustment is a blank (some correct answers are 0).
 * Accuracy = 0.75 * fraction of adjustments within tolerance
 *          + 0.25 * (start + sum(adjustments) reconciles to end).
 */
export interface BridgeTask {
  kind: 'bridge'
  prompt: string
  unit?: string
  tolerance?: number
  start: { label: string; value: number; role?: Role }
  end: { label: string; value: number; role?: Role }
  adjustments: { id: string; label: string; answer: number; role?: Role; hint?: string; note?: string }[]
}

/**
 * Football field: the player sets the low and high end of valuation ranges.
 * Accuracy = mean over rows of (lowHit + highHit) / 2, where a hit is within
 * `tolerance`. If `question` is present it takes `question.weight` (default
 * 0.25) of the accuracy and the rows share the rest.
 */
export interface FootballFieldTask {
  kind: 'footballfield'
  prompt: string
  unit?: string
  axis: { min: number; max: number; step: number }
  rows: { id: string; label: string; lowAnswer: number; highAnswer: number; tolerance: number; role?: Role; hint?: string; note?: string }[]
  question?: {
    text: string
    choices: { id: string; label: string }[]
    correctId: string
    explanation: string
    weight?: number
  }
}

/**
 * Free text graded by the MD over the API. Missions of this kind are always
 * mentorOnly. The pure grade() returns accuracy 0 with a "Mentor mode
 * required" explanation; the real grading happens in Mission.gradeAsync.
 */
export interface WrittenTask {
  kind: 'written'
  prompt: string
  /** Client-side truncation limit before the answer is sent. */
  wordLimit: number
  /** Scoring criteria shown to the grader (and, after grading, to the player). */
  rubric: string[]
  /** A model answer the grader compares against. Never shown before grading. */
  modelAnswer: string
  /** Optional list of questions for multi-turn formats like the mock interview. */
  questions?: { id: string; text: string; rubric: string[]; modelAnswer: string }[]
}

export type Task = OrderTask | SortTask | BalanceTask | QuizTask | SliderTask | WaterfallTask | BridgeTask | FootballFieldTask | WrittenTask

/** What the player submitted. Shape follows the task kind. */
export type OrderAnswer = { kind: 'order'; orderedIds: string[] }
/** itemId -> bucketId. Missing item = unplaced (counts as wrong). */
export type SortAnswer = { kind: 'sort'; placements: Record<string, string> }
/** lineId -> typed number. Missing or null = blank (counts as wrong). */
export type BalanceAnswer = { kind: 'balance'; values: Record<string, number | null> }
/** questionId -> choiceId. Missing or null = unanswered (counts as wrong). */
export type QuizAnswer = { kind: 'quiz'; choices: Record<string, string | null>; timedOut?: boolean }

/** sliderId -> value. Missing = treated as the slider's min (wrong). */
export type SliderAnswer = { kind: 'slider'; values: Record<string, number> }
/** stepId -> typed number for blanks. */
export type WaterfallAnswer = { kind: 'waterfall'; values: Record<string, number | null> }
/** adjustmentId -> typed number. Missing = null (wrong). */
export type BridgeAnswer = { kind: 'bridge'; values: Record<string, number | null> }
/** rowId -> {low, high}; `choice` answers the embedded question if any. */
export type FootballFieldAnswer = {
  kind: 'footballfield'
  ranges: Record<string, { low: number; high: number }>
  choice?: string | null
}

/** Free text. For multi-question tasks, `answers` maps questionId -> text. */
export type WrittenAnswer = { kind: 'written'; text: string; answers?: Record<string, string> }

export type Answer =
  | WrittenAnswer
  | OrderAnswer
  | SortAnswer
  | BalanceAnswer
  | QuizAnswer
  | SliderAnswer
  | WaterfallAnswer
  | BridgeAnswer
  | FootballFieldAnswer

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
  /**
   * Async grading over the Mentor API. Only written missions define it.
   * `mentor` is created by src/lib/anthropic.ts from the player's key.
   */
  gradeAsync?: (answer: Answer, mentor: MentorClient) => Promise<GradeResult>
}

/**
 * The surface a written mission needs from the API client. Kept here so the
 * engine folder never imports the SDK. Implemented in src/lib/anthropic.ts.
 */
export interface MentorClient {
  gradeWritten(input: {
    missionTitle: string
    question: string
    rubric: string[]
    modelAnswer: string
    answer: string
    wordLimit: number
  }): Promise<{ score: number; verdict: string; explanation: string; missed: string[] }>
}
