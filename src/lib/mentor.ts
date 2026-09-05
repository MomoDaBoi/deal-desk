import type { Mentor } from './anthropic'

/**
 * Lazy entry point for Mentor mode. The Anthropic SDK is only downloaded
 * when a player with a key actually uses a Mentor feature, so Standard
 * mode stays a small static bundle.
 */
export async function loadMentor(): Promise<Mentor | null> {
  const mod = await import('./anthropic')
  return mod.mentorFromSettings()
}
