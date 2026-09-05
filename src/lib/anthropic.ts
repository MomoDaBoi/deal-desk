/**
 * The Mentor: a thin wrapper around the Anthropic SDK. This is the only file
 * in the game allowed to import `@anthropic-ai/sdk`. The API key lives only
 * in `useSettings` (localStorage, its own key) and is read here at call
 * time; it is never logged, never put in an error message, and every
 * request is guarded to go only to `api.anthropic.com`.
 *
 * Re-checked against current Anthropic docs on 2026-09-05 (see PLAN.md
 * section g and TASKS.md "Decisions" for what was verified).
 */

import Anthropic, {
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
  APIConnectionError,
  APIError,
} from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import type { MentorClient } from '../engine/types'
import { useSettings } from '../store/settings'
import type { MentorModel } from '../store/settings'
import { useUsage } from '../store/usage'
import { estimateCost } from './pricing'
import { gradePrompt, askPrompt, type AskPromptInput } from './prompts'

export type { MentorModel } from '../store/settings'

/** Model picker copy for Settings. */
export { MODELS } from './pricing'

/** Haiku 4.5 has no adaptive-thinking / effort knob; sending it errors. */
function supportsEffort(model: MentorModel): boolean {
  return model === 'claude-opus-5' || model === 'claude-sonnet-5'
}

export { MentorError } from './mentor-error'
import { MentorError } from './mentor-error'

/** Strip the literal key out of any text before it can reach an error message. */
function redact(message: string, apiKey: string): string {
  if (!apiKey) return message
  return message.split(apiKey).join('[redacted]')
}

function mapError(err: unknown, apiKey: string): MentorError {
  if (err instanceof MentorError) return err
  if (err instanceof AuthenticationError || err instanceof PermissionDeniedError) {
    return new MentorError('auth', 'That key did not work.')
  }
  if (err instanceof RateLimitError) {
    return new MentorError('ratelimit', 'Rate limited. The MD is in a meeting.')
  }
  if (err instanceof APIConnectionError) {
    return new MentorError('network', 'Could not reach the MD. Check your connection.')
  }
  if (err instanceof APIError) {
    return new MentorError('other', redact(err.message, apiKey))
  }
  if (err instanceof Error) {
    return new MentorError('other', redact(err.message, apiKey))
  }
  return new MentorError('other', 'Something went wrong talking to the MD.')
}

/** Truncates to `wordLimit` whitespace-delimited words. Runs before every send. */
function truncateToWordLimit(text: string, wordLimit: number): string {
  const trimmed = text.trim()
  const words = trimmed.length === 0 ? [] : trimmed.split(/\s+/)
  if (words.length <= wordLimit) return trimmed
  return words.slice(0, wordLimit).join(' ')
}

/** Shape of a completed (non-streaming-final) message, real or faked in tests. */
interface MentorMessageLike {
  stop_reason: string | null
  usage: { input_tokens: number; output_tokens: number }
  parsed_output?: unknown
}

/** Minimal surface of a `client.messages.stream(...)` handle. */
interface MentorStreamLike {
  on(event: 'text', handler: (delta: string) => void): unknown
  finalMessage(): Promise<MentorMessageLike>
}

/** The minimal client surface this module needs. A real `Anthropic` instance
 * satisfies it; tests pass an object literal instead. */
interface MentorHttpClient {
  baseURL?: string
  messages: {
    parse(params: Record<string, unknown>): Promise<MentorMessageLike>
    stream(params: Record<string, unknown>): MentorStreamLike
    create(params: Record<string, unknown>): Promise<MentorMessageLike>
  }
}

/**
 * Refuses to let a request through if the client is not pointed at
 * api.anthropic.com. A fake test client with no `baseURL` skips the check —
 * this guard exists to catch a misconfigured *real* client, not to police
 * test doubles.
 */
function assertSafeHost(client: MentorHttpClient): void {
  if (client.baseURL === undefined) return
  let hostname: string
  try {
    hostname = new URL(client.baseURL).hostname
  } catch {
    throw new Error('Mentor client has an unparseable base URL.')
  }
  if (hostname !== 'api.anthropic.com') {
    throw new Error('Refusing to send a Mentor request to a non-Anthropic host.')
  }
}

const GRADE_SCHEMA = z.object({
  score: z.number().int().min(1).max(10),
  verdict: z.string(),
  explanation: z.string(),
  missed: z.array(z.string()),
})

export interface Mentor extends MentorClient {
  ask(
    input: { missionTitle: string; lesson: string; explanation: string; playerContext?: string; question: string },
    onText?: (delta: string) => void,
  ): Promise<{ text: string }>
  testKey(): Promise<{ ok: true } | { ok: false; error: string }>
  model: MentorModel
}

export function createMentor(opts: {
  apiKey: string
  model: MentorModel
  onUsage?: (u: { model: MentorModel; inputTokens: number; outputTokens: number; cost: number }) => void
  client?: unknown
}): Mentor {
  const http: MentorHttpClient =
    (opts.client as MentorHttpClient | undefined) ??
    (new Anthropic({ apiKey: opts.apiKey, dangerouslyAllowBrowser: true, maxRetries: 0 }) as unknown as MentorHttpClient)

  function reportUsage(usage: { input_tokens: number; output_tokens: number }): void {
    const inputTokens = usage.input_tokens
    const outputTokens = usage.output_tokens
    const cost = estimateCost(opts.model, { inputTokens, outputTokens })
    opts.onUsage?.({ model: opts.model, inputTokens, outputTokens, cost })
  }

  async function gradeWritten(input: {
    missionTitle: string
    question: string
    rubric: string[]
    modelAnswer: string
    answer: string
    wordLimit: number
  }): Promise<{ score: number; verdict: string; explanation: string; missed: string[] }> {
    assertSafeHost(http)
    const answer = truncateToWordLimit(input.answer, input.wordLimit)
    const { system, user } = gradePrompt({
      missionTitle: input.missionTitle,
      question: input.question,
      rubric: input.rubric,
      modelAnswer: input.modelAnswer,
      answer,
      wordLimit: input.wordLimit,
    })
    try {
      const message = await http.messages.parse({
        model: opts.model,
        max_tokens: 700,
        system,
        messages: [{ role: 'user', content: user }],
        output_config: {
          ...(supportsEffort(opts.model) ? { effort: 'low' } : {}),
          format: zodOutputFormat(GRADE_SCHEMA),
        },
      })
      reportUsage(message.usage)
      if (message.stop_reason === 'refusal') {
        throw new MentorError('refusal', 'The MD declined to answer that one.')
      }
      const parsed = message.parsed_output as z.infer<typeof GRADE_SCHEMA> | null | undefined
      if (!parsed) {
        throw new MentorError('other', 'The MD sent back something unreadable. Try again.')
      }
      return { score: parsed.score, verdict: parsed.verdict, explanation: parsed.explanation, missed: parsed.missed }
    } catch (err) {
      throw mapError(err, opts.apiKey)
    }
  }

  async function ask(
    input: AskPromptInput,
    onText?: (delta: string) => void,
  ): Promise<{ text: string }> {
    assertSafeHost(http)
    const { system, user } = askPrompt(input)
    try {
      const stream = http.messages.stream({
        model: opts.model,
        max_tokens: 500,
        system,
        messages: [{ role: 'user', content: user }],
      })
      let text = ''
      stream.on('text', (delta) => {
        text += delta
        onText?.(delta)
      })
      const final = await stream.finalMessage()
      reportUsage(final.usage)
      if (final.stop_reason === 'refusal') {
        throw new MentorError('refusal', 'The MD declined to answer that one.')
      }
      return { text }
    } catch (err) {
      throw mapError(err, opts.apiKey)
    }
  }

  async function testKey(): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      assertSafeHost(http)
      const result = await http.messages.create({
        model: opts.model,
        max_tokens: 16,
        messages: [{ role: 'user', content: 'Reply with the single word ok' }],
      })
      reportUsage(result.usage)
      if (result.stop_reason === 'refusal') {
        return { ok: false, error: 'The MD declined to answer that one.' }
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: mapError(err, opts.apiKey).message }
    }
  }

  return { gradeWritten, ask, testKey, model: opts.model }
}

/**
 * The one function screens call. Wires usage reporting to the usage store
 * and returns `null` when there is no key, so callers never construct a
 * Mentor by hand.
 */
export function mentorFromSettings(): Mentor | null {
  const { apiKey, model } = useSettings.getState()
  if (!apiKey) return null
  return createMentor({
    apiKey,
    model,
    onUsage: (u) => useUsage.getState().record({ inputTokens: u.inputTokens, outputTokens: u.outputTokens, cost: u.cost }),
  })
}
