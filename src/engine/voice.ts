/**
 * The MD's voice bank. Deterministic, salt-picked one-liners that missions
 * hang on top of `GradeResult.verdict`. The joke is the headline; the real
 * explanation always lives in `GradeResult.explanation`, written by the
 * mission itself. Never put the "why" here.
 *
 * Determinism: every line is picked from a fixed-size array with a small
 * string hash of a caller-supplied `salt` (typically the mission id, plus
 * whatever else the caller wants to vary on). No `Math.random`, no `Date`.
 */

import type { Rung } from './types'

/** djb2 string hash. Cheap, stable across runs, good enough spread for line-picking. */
function hashString(input: string): number {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33 + input.charCodeAt(i)) >>> 0
  }
  return hash >>> 0
}

function pick(lines: readonly string[], salt: string): string {
  return lines[hashString(salt) % lines.length]
}

type Band = 'perfect' | 'strong' | 'pass' | 'fail' | 'zero'

function bandFor(accuracy: number): Band {
  if (accuracy >= 1) return 'perfect'
  if (accuracy >= 0.75) return 'strong'
  if (accuracy >= 0.5) return 'pass'
  if (accuracy > 0) return 'fail'
  return 'zero'
}

const PERFECT_LINES = [
  'Fine. Do not let it go to your head.',
  'Correct. The bonus pool thanks you.',
  "Nailed it. Don't tell the MD, he'll find something else to fix.",
  "Perfect. Frame it, you won't see this again.",
  'Clean work. Almost suspiciously clean.',
  'Flawless. Even compliance is impressed, and compliance is never impressed.',
  "That's a keeper for the pitch deck.",
  'Textbook. Literally, this belongs in a textbook.',
  'Zero redlines. The MD is confused and, against his will, proud.',
  "Ship it. No 'pls fix' required.",
] as const

const STRONG_LINES = [
  "Close. 'Close' is what we say at the deposition.",
  'Almost there. So was Lehman.',
  'Solid, but the MD found one thing. There is always one thing.',
  'Good enough for a Friday 5pm draft.',
  'Nearly clean. One redline stands between you and bonus season.',
  'Strong work. One typo from a term sheet.',
  'Respectable. Not comps-worthy yet, but respectable.',
  'Almost a clean set of comps. Almost.',
  "One 'per my last email' away from perfect.",
  'Good. The associate only had to fix a little.',
] as const

const PASS_LINES = [
  'pls fix.',
  'Passable. Barely. Like most of this industry.',
  'It works. Nobody said it works well.',
  'You cleared the bar. The bar is on the floor.',
  'Mediocre, but mediocre closes deals too.',
  'This survives due diligence. Barely.',
  "Send it back. Actually, just send it, we're out of time.",
  'Not great, not a wire to the wrong account either.',
  'The MD will sigh, then approve it anyway.',
  'Middling. Very on-brand for this desk.',
] as const

const FAIL_LINES = [
  'Did you assemble this with your eyes closed?',
  'This is not going in the pitch book.',
  "Let's take this offline. Far offline.",
  'The MD read this at 2am and is not happy.',
  "I've seen this exact mistake print in a pitch book. We do not discuss it.",
  'This needs a full redline, not a fix.',
  "That's not comps, that's chaos.",
  'You have discovered a new way to be wrong.',
  'The deal toy on the shelf is judging you right now.',
  'This would not survive one question from the MD.',
] as const

const ZERO_LINES = [
  'Did you even open the file?',
  'This is a blank page with extra steps.',
  'The MD wants to see you. Now.',
  'Delete this and start again from the lesson card.',
  'Not one thing here is right. Impressive, in a way.',
  'This is the reason performance reviews exist.',
  'Somewhere, a compliance officer just felt a chill.',
  'You have achieved a perfect score. The wrong kind.',
  'Nothing in here balances, including my patience.',
  'Total wipeout. HR has been notified. (Kidding. Mostly.)',
] as const

const BAND_LINES: Record<Band, readonly string[]> = {
  perfect: PERFECT_LINES,
  strong: STRONG_LINES,
  pass: PASS_LINES,
  fail: FAIL_LINES,
  zero: ZERO_LINES,
}

/**
 * Deterministic MD verdict line for a graded attempt. Same `accuracy` band
 * and same `salt` (pass the mission id, optionally suffixed) always returns
 * the same line; different salts spread across the band's lines. This is
 * the headline only — missions supply the real explanation separately.
 */
export function mdVerdict(accuracy: number, salt: string): string {
  const band = bandFor(accuracy)
  return pick(BAND_LINES[band], `${band}:${salt}`)
}

const PROMOTION_LINES: Record<Rung, string> = {
  1: "You survived Year One. Congratulations, you're an Analyst now.",
  2: 'Promoted to Associate. Nicer chair, same hours.',
  3: 'Promoted to VP. Now you send the 2am emails instead of reading them.',
  4: 'Promoted to Managing Director. Try to remember what sleep felt like.',
  5: "No rung above this one. You're an MD until the next reorg.",
}

/**
 * One line per rung, framed as surviving another year on the desk. Screens
 * wire this into the rung-clear moment; this module only owns the copy.
 */
export function promotionLine(rung: Rung): string {
  return PROMOTION_LINES[rung]
}

const BONUS_LINES = [
  'Bonus season. The pool is smaller than the rumors, bigger than your hopes.',
  'Bonuses are out. Someone is crying in the stairwell right now.',
  "It's bonus season. HR sent a calendar invite instead of a number.",
  'The bonus pool has been allocated. Ask no further questions.',
  "Bonus szn: where 'strong year' means 'we did not lose money'.",
  "Numbers are in. The MD calls it 'a good year, relatively'.",
  'Bonus day. Champagne for some, an updated LinkedIn for others.',
  "The bonus spreadsheet got 'accidentally' shared with everyone.",
] as const

/**
 * Bonus-season one-liner. Deterministic per salt. Callers pass the mission
 * or rung id as salt; this module only owns the copy, not where it's shown.
 */
export function bonusLine(salt: string): string {
  return pick(BONUS_LINES, `bonus:${salt}`)
}

const REVIEW_LINES = [
  'Performance review time. Bring a strong deck and a stronger alibi.',
  'Three strikes. HR would like a word, and a calendar hold.',
  "Time for the sit-down. The MD has 'concerns' and a list.",
  "Review time. The feedback is 'needs improvement,' as always.",
  'You have earned a performance review. Not the good kind.',
  "The MD wants to 'chat.' Nobody has ever survived a good 'chat.'",
  'Three misses in a row. Time to revisit the fundamentals.',
  'Performance review unlocked. Not the achievement you frame.',
] as const

/**
 * Performance-review one-liner, shown after consecutive fails. This module
 * only owns the copy; callers pass the mission id as salt.
 */
export function reviewLine(salt: string): string {
  return pick(REVIEW_LINES, `review:${salt}`)
}

/**
 * Short speed-bonus flavour line. Only two states, so no salt needed. This
 * module only owns the copy; callers decide where it's shown.
 */
export function speedLine(underPar: boolean): string {
  return underPar
    ? 'Under par. The MD almost looks impressed.'
    : 'Over par. Hope the analysis was worth the wait.'
}
