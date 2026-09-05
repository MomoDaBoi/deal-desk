import { describe, expect, it, vi } from 'vitest'
import { AuthenticationError, RateLimitError, APIConnectionError } from '@anthropic-ai/sdk'
import { createMentor, MentorError, MODELS } from './anthropic'
import { PRICES, PRICING_CHECKED_ON, estimateCallCost, estimateCost, formatUsd } from './pricing'
import { askPrompt, gradePrompt } from './prompts'

/** A fake `messages` surface. Any method left unspecified is a no-op mock
 * that fails the test loudly if the code under test calls it unexpectedly. */
function fakeMessages(overrides: {
  parse?: (params: Record<string, unknown>) => Promise<unknown>
  stream?: (params: Record<string, unknown>) => unknown
  create?: (params: Record<string, unknown>) => Promise<unknown>
} = {}) {
  return {
    parse: overrides.parse ?? vi.fn(),
    stream: overrides.stream ?? vi.fn(),
    create: overrides.create ?? vi.fn(),
  }
}

const GRADE_ARGS = {
  missionTitle: 'Explain EV',
  question: 'Why does EV beat market cap for comparing companies?',
  rubric: ['mentions debt', 'mentions cash'],
  modelAnswer: 'EV includes debt and nets out cash; market cap does not.',
  answer: 'EV nets debt and cash so it prices the whole business.',
  wordLimit: 40,
}

describe('pricing arithmetic', () => {
  it('estimateCost combines input and output token cost at the table prices', () => {
    const cost = estimateCost('claude-sonnet-5', { inputTokens: 1_000_000, outputTokens: 1_000_000 })
    expect(cost).toBeCloseTo(PRICES['claude-sonnet-5'].inputPerM + PRICES['claude-sonnet-5'].outputPerM, 10)
  })

  it('estimateCost is zero for zero usage', () => {
    expect(estimateCost('claude-opus-5', { inputTokens: 0, outputTokens: 0 })).toBe(0)
  })

  it('estimateCallCost prices the worst case: every max_tokens output token used', () => {
    const cost = estimateCallCost('claude-haiku-4-5', 2000, 700)
    const expected = (2000 / 1e6) * PRICES['claude-haiku-4-5'].inputPerM + (700 / 1e6) * PRICES['claude-haiku-4-5'].outputPerM
    expect(cost).toBeCloseTo(expected, 10)
  })

  it('formatUsd renders zero, sub-cent, and normal amounts', () => {
    expect(formatUsd(0)).toBe('$0.00')
    expect(formatUsd(0.004)).toBe('<$0.01')
    expect(formatUsd(0.02)).toBe('$0.02')
    expect(formatUsd(1.2345)).toBe('$1.23')
  })

  it('records the date the prices were last checked', () => {
    expect(PRICING_CHECKED_ON).toBe('2026-09-05')
  })
})

describe('prompt builders', () => {
  it('gradePrompt carries the rubric, the model answer, the player answer, and the word limit', () => {
    const { system, user } = gradePrompt(GRADE_ARGS)
    for (const item of GRADE_ARGS.rubric) {
      expect(user).toContain(item)
    }
    expect(user).toContain(GRADE_ARGS.modelAnswer)
    expect(user).toContain(GRADE_ARGS.answer)
    expect(system).toContain(String(GRADE_ARGS.wordLimit))
  })

  it("askPrompt carries the mission's lesson, explanation, and the player's question, no markdown", () => {
    const { system, user } = askPrompt({
      missionTitle: 'Explain EV',
      lesson: 'EV is what a buyer pays for the whole business.',
      explanation: 'Market cap misses debt and cash.',
      question: 'Why not just use market cap?',
    })
    expect(user).toContain('EV is what a buyer pays for the whole business.')
    expect(user).toContain('Market cap misses debt and cash.')
    expect(user).toContain('Why not just use market cap?')
    expect(system.toLowerCase()).toContain('markdown')
  })
})

describe('MODELS', () => {
  it('lists the three mentor models in order', () => {
    expect(MODELS.map((m) => m.id)).toEqual(['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5'])
    expect(MODELS.every((m) => m.label.length > 0 && m.blurb.length > 0)).toBe(true)
  })
})

describe('gradeWritten', () => {
  it('maps parsed_output into a GradeResult and reports usage cost', async () => {
    const parse = vi.fn().mockResolvedValue({
      stop_reason: 'end_turn',
      usage: { input_tokens: 500, output_tokens: 200 },
      parsed_output: { score: 8, verdict: 'Fine.', explanation: 'EV includes debt.', missed: ['mentions cash'] },
    })
    const usageEvents: { model: string; inputTokens: number; outputTokens: number; cost: number }[] = []
    const mentor = createMentor({
      apiKey: 'sk-ant-test-key',
      model: 'claude-sonnet-5',
      onUsage: (u) => usageEvents.push(u),
      client: { messages: fakeMessages({ parse }) },
    })

    const result = await mentor.gradeWritten(GRADE_ARGS)

    expect(result).toEqual({ score: 8, verdict: 'Fine.', explanation: 'EV includes debt.', missed: ['mentions cash'] })
    expect(usageEvents).toEqual([
      { model: 'claude-sonnet-5', inputTokens: 500, outputTokens: 200, cost: estimateCost('claude-sonnet-5', { inputTokens: 500, outputTokens: 200 }) },
    ])
    const sentParams = parse.mock.calls[0][0] as { max_tokens: number; output_config: { effort?: string } }
    expect(sentParams.max_tokens).toBe(700)
    expect(sentParams.output_config.effort).toBe('low')
  })

  it('omits the effort param on Haiku, which does not support it', async () => {
    const parse = vi.fn().mockResolvedValue({
      stop_reason: 'end_turn',
      usage: { input_tokens: 1, output_tokens: 1 },
      parsed_output: { score: 5, verdict: 'v', explanation: 'e', missed: [] },
    })
    const mentor = createMentor({ apiKey: 'k', model: 'claude-haiku-4-5', client: { messages: fakeMessages({ parse }) } })

    await mentor.gradeWritten(GRADE_ARGS)

    const sentParams = parse.mock.calls[0][0] as { output_config: { effort?: string } }
    expect(sentParams.output_config.effort).toBeUndefined()
  })

  it("truncates the player's answer to wordLimit before it is sent", async () => {
    const parse = vi.fn().mockResolvedValue({
      stop_reason: 'end_turn',
      usage: { input_tokens: 1, output_tokens: 1 },
      parsed_output: { score: 5, verdict: 'v', explanation: 'e', missed: [] },
    })
    const mentor = createMentor({ apiKey: 'k', model: 'claude-sonnet-5', client: { messages: fakeMessages({ parse }) } })
    const longAnswer = Array.from({ length: 50 }, (_, i) => `word${i}`).join(' ')

    await mentor.gradeWritten({ ...GRADE_ARGS, answer: longAnswer, wordLimit: 10 })

    const sentParams = parse.mock.calls[0][0] as { messages: { content: string }[] }
    const sentText = sentParams.messages[0].content
    expect(sentText).toContain('word9')
    expect(sentText).not.toContain('word10')
  })

  it('maps a refusal stop_reason to a refusal MentorError', async () => {
    const parse = vi.fn().mockResolvedValue({ stop_reason: 'refusal', usage: { input_tokens: 1, output_tokens: 1 }, parsed_output: null })
    const mentor = createMentor({ apiKey: 'k', model: 'claude-sonnet-5', client: { messages: fakeMessages({ parse }) } })

    await expect(mentor.gradeWritten(GRADE_ARGS)).rejects.toMatchObject({ kind: 'refusal', message: 'The MD declined to answer that one.' })
  })

  it('maps an unparseable response to an "other" MentorError', async () => {
    const parse = vi.fn().mockResolvedValue({ stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 }, parsed_output: null })
    const mentor = createMentor({ apiKey: 'k', model: 'claude-sonnet-5', client: { messages: fakeMessages({ parse }) } })

    await expect(mentor.gradeWritten(GRADE_ARGS)).rejects.toMatchObject({ kind: 'other' })
  })
})

describe('ask', () => {
  it('forwards streamed text deltas as they arrive and resolves the concatenated text', async () => {
    const handlers: Record<string, (delta: string) => void> = {}
    const stream = {
      on: (event: string, handler: (delta: string) => void) => {
        handlers[event] = handler
        return stream
      },
      finalMessage: vi.fn(async () => {
        handlers.text?.('Hello')
        handlers.text?.(' there.')
        return { stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 20 } }
      }),
    }
    const usageEvents: { model: string; inputTokens: number; outputTokens: number; cost: number }[] = []
    const mentor = createMentor({
      apiKey: 'k',
      model: 'claude-haiku-4-5',
      onUsage: (u) => usageEvents.push(u),
      client: { messages: fakeMessages({ stream: () => stream }) },
    })
    const seen: string[] = []

    const result = await mentor.ask({ missionTitle: 'm', lesson: 'l', explanation: 'e', question: 'why?' }, (d) => seen.push(d))

    expect(result.text).toBe('Hello there.')
    expect(seen).toEqual(['Hello', ' there.'])
    expect(usageEvents).toEqual([
      { model: 'claude-haiku-4-5', inputTokens: 10, outputTokens: 20, cost: estimateCost('claude-haiku-4-5', { inputTokens: 10, outputTokens: 20 }) },
    ])
  })

  it('maps a refusal stop_reason from a streamed answer too', async () => {
    const stream = {
      on: () => stream,
      finalMessage: vi.fn(async () => ({ stop_reason: 'refusal', usage: { input_tokens: 1, output_tokens: 1 } })),
    }
    const mentor = createMentor({ apiKey: 'k', model: 'claude-haiku-4-5', client: { messages: fakeMessages({ stream: () => stream }) } })

    await expect(mentor.ask({ missionTitle: 'm', lesson: 'l', explanation: 'e', question: 'q' })).rejects.toMatchObject({ kind: 'refusal' })
  })
})

describe('testKey', () => {
  it('sends a tiny request and reports ok on success', async () => {
    const create = vi.fn().mockResolvedValue({ stop_reason: 'end_turn', usage: { input_tokens: 5, output_tokens: 1 } })
    const mentor = createMentor({ apiKey: 'k', model: 'claude-haiku-4-5', client: { messages: fakeMessages({ create }) } })

    const result = await mentor.testKey()

    expect(result).toEqual({ ok: true })
    expect(create.mock.calls[0][0]).toMatchObject({ max_tokens: 16 })
  })

  it('maps a failed test call to ok:false with the mapped message', async () => {
    const create = vi.fn().mockRejectedValue(new AuthenticationError(401, undefined, 'invalid x-api-key', new Headers()))
    const mentor = createMentor({ apiKey: 'k', model: 'claude-haiku-4-5', client: { messages: fakeMessages({ create }) } })

    const result = await mentor.testKey()

    expect(result).toEqual({ ok: false, error: 'That key did not work.' })
  })
})

describe('error mapping', () => {
  it('maps a 401 AuthenticationError to the "key did not work" message', async () => {
    const parse = vi.fn().mockRejectedValue(new AuthenticationError(401, undefined, 'invalid x-api-key', new Headers()))
    const mentor = createMentor({ apiKey: 'k', model: 'claude-opus-5', client: { messages: fakeMessages({ parse }) } })

    await expect(mentor.gradeWritten(GRADE_ARGS)).rejects.toMatchObject({ kind: 'auth', message: 'That key did not work.' })
  })

  it('maps a 429 RateLimitError to the "in a meeting" message', async () => {
    const parse = vi.fn().mockRejectedValue(new RateLimitError(429, undefined, 'rate limited', new Headers()))
    const mentor = createMentor({ apiKey: 'k', model: 'claude-opus-5', client: { messages: fakeMessages({ parse }) } })

    await expect(mentor.gradeWritten(GRADE_ARGS)).rejects.toMatchObject({ kind: 'ratelimit', message: 'Rate limited. The MD is in a meeting.' })
  })

  it('maps an APIConnectionError to the "could not reach" message', async () => {
    const parse = vi.fn().mockRejectedValue(new APIConnectionError({ message: 'fetch failed' }))
    const mentor = createMentor({ apiKey: 'k', model: 'claude-opus-5', client: { messages: fakeMessages({ parse }) } })

    await expect(mentor.gradeWritten(GRADE_ARGS)).rejects.toMatchObject({ kind: 'network', message: 'Could not reach the MD. Check your connection.' })
  })

  it('never lets the API key reach a "other" error message', async () => {
    const key = 'sk-ant-super-secret-value-do-not-leak'
    const parse = vi.fn().mockRejectedValue(new Error(`request failed while using ${key}`))
    const mentor = createMentor({ apiKey: key, model: 'claude-opus-5', client: { messages: fakeMessages({ parse }) } })

    let caught: unknown
    try {
      await mentor.gradeWritten(GRADE_ARGS)
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(MentorError)
    expect((caught as MentorError).kind).toBe('other')
    expect((caught as MentorError).message).not.toContain(key)
  })
})

describe('host guard', () => {
  it('refuses to send any request when the client is not pointed at api.anthropic.com', async () => {
    const parse = vi.fn()
    const mentor = createMentor({
      apiKey: 'k',
      model: 'claude-sonnet-5',
      client: { baseURL: 'https://evil.example.com', messages: fakeMessages({ parse }) },
    })

    await expect(mentor.gradeWritten(GRADE_ARGS)).rejects.toThrow()
    expect(parse).not.toHaveBeenCalled()
  })
})
