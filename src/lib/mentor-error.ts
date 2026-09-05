/**
 * Player-facing Mentor error. Lives in its own module so screens can check
 * `instanceof MentorError` without pulling the Anthropic SDK into the main
 * bundle; the SDK-backed client in ./anthropic.ts is loaded on demand.
 */
export class MentorError extends Error {
  kind: 'auth' | 'ratelimit' | 'network' | 'refusal' | 'other'
  constructor(kind: MentorError['kind'], message: string) {
    super(message)
    this.name = 'MentorError'
    this.kind = kind
  }
}
