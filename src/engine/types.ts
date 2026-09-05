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
 * Task kinds. Milestone 1 ships `order` only; later kinds are
 * `sort` (buckets), `balance` (number entry), `slider`, `quiz`, `written`.
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

export type Task = OrderTask

/** What the player submitted. Shape follows the task kind. */
export type Answer = { kind: 'order'; orderedIds: string[] }

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
