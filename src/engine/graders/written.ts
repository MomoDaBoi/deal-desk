import type { GradeResult, WrittenTask } from '../types'

/**
 * Written tasks are graded by the MD over the API (see `Mission.gradeAsync`
 * and `MentorClient.gradeWritten`). Everything in this file is the pure,
 * offline-safe half: word counting/truncation used by the widget before a
 * submission goes out, the offline fallback shown when Mentor mode is off,
 * and the mapping from a Mentor API result into a `GradeResult`.
 */

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

/** Split on runs of whitespace, dropping empty tokens. */
function words(text: string): string[] {
  return text.trim().length === 0 ? [] : text.trim().split(/\s+/)
}

/** Number of words in `text`. Empty or whitespace-only text counts as 0. */
export function wordCount(text: string): number {
  return words(text).length
}

/** Truncate `text` to at most `limit` words, preserving original spacing between kept words. */
export function truncateWords(text: string, limit: number): string {
  const list = words(text)
  if (list.length <= limit) return text.trim()
  return list.slice(0, limit).join(' ')
}

/**
 * Offline fallback for a written task when Mentor mode is unavailable.
 * Written missions have no real offline grade — the honest answer is 0,
 * with an explanation of why and how to turn Mentor mode on. The rubric is
 * shown (unchecked) so the player still sees what would have been graded.
 */
export function offlineWrittenGrade(task: WrittenTask): GradeResult {
  return {
    accuracy: 0,
    verdict: 'Mentor mode required.',
    explanation:
      "Written missions are graded by the MD over the Anthropic API, not by a local rubric checker — free text needs a real reader. Turn on Mentor mode in Settings (paste an Anthropic API key and flip the toggle) to have this graded for real.",
    details: task.rubric.map((note, i) => ({ id: `r${i}`, ok: false, note })),
  }
}

function norm(s: string): string {
  return s.trim().toLowerCase()
}

/** True if `a` and `b` match exactly (case/whitespace-insensitive) or one contains the other. */
function fuzzyMatch(a: string, b: string): boolean {
  const na = norm(a)
  const nb = norm(b)
  if (na.length === 0 || nb.length === 0) return false
  if (na === nb) return true
  return na.includes(nb) || nb.includes(na)
}

/**
 * Map a Mentor API grading result onto a `GradeResult`. `score` (1..10) maps
 * to accuracy on a 0..1 scale, clamped in case the model wanders outside
 * range. Each rubric item is marked hit unless it shows up in `missed`
 * (matched loosely, since the model paraphrases rather than quoting).
 */
export function mentorResultToGrade(
  task: WrittenTask,
  r: { score: number; verdict: string; explanation: string; missed: string[] },
): GradeResult {
  const accuracy = clamp(r.score, 1, 10) / 10
  const details = task.rubric.map((note, i) => {
    const missed = r.missed.some((m) => fuzzyMatch(note, m))
    return { id: `r${i}`, ok: !missed, note }
  })
  return {
    accuracy,
    verdict: r.verdict,
    explanation: r.explanation,
    details,
  }
}
