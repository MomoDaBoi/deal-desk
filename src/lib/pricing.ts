/**
 * Mentor pricing table. Re-check these numbers against current Anthropic
 * docs whenever this file is touched; `PRICING_CHECKED_ON` exists precisely
 * so a stale table is visibly stale in Settings.
 */

import type { MentorModel } from '../store/settings'

/** Models the Mentor may use, with the labels Settings shows. */
export const MODELS: { id: MentorModel; label: string; blurb: string }[] = [
  { id: 'claude-opus-5', label: 'Opus 5', blurb: 'best grader' },
  { id: 'claude-sonnet-5', label: 'Sonnet 5', blurb: 'cheaper, still sharp' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5', blurb: 'cheapest, fine for Ask the MD' },
]

export const PRICING_CHECKED_ON = '2026-09-05'

/** USD per million tokens, at `PRICING_CHECKED_ON`. */
export const PRICES: Record<MentorModel, { inputPerM: number; outputPerM: number }> = {
  'claude-opus-5': { inputPerM: 5, outputPerM: 25 },
  'claude-sonnet-5': { inputPerM: 2, outputPerM: 10 },
  'claude-haiku-4-5': { inputPerM: 1, outputPerM: 5 },
}

/** USD cost of an actual completed call, from its reported token usage. */
export function estimateCost(model: MentorModel, usage: { inputTokens: number; outputTokens: number }): number {
  const price = PRICES[model]
  return (usage.inputTokens / 1e6) * price.inputPerM + (usage.outputTokens / 1e6) * price.outputPerM
}

/**
 * Upper-bound cost estimate for a call before it is made, from an estimated
 * input size and the call's `max_tokens` cap (worst case: the model uses
 * every output token it is allowed).
 */
export function estimateCallCost(model: MentorModel, estInputTokens: number, maxOutputTokens: number): number {
  return estimateCost(model, { inputTokens: estInputTokens, outputTokens: maxOutputTokens })
}

/** "$0.02", or "<$0.01" for anything under a cent. */
export function formatUsd(n: number): string {
  if (n <= 0) return '$0.00'
  if (n < 0.01) return '<$0.01'
  return `$${n.toFixed(2)}`
}
