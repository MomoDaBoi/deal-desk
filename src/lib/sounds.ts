import { useSettings } from '../store/settings'

/**
 * Tiny synthesized SFX via the Web Audio API. No audio files, no network,
 * no persistence. Every export is a no-op when sound is off or the API is
 * unavailable, and never throws (a sound glitch must never break a mission).
 */

type SoundKind = 'pass' | 'fail' | 'perfect' | 'bonus'

interface Note {
  /** Hz. */
  freq: number
  /** Seconds from the phrase start. */
  start: number
  /** Seconds. */
  duration: number
  type?: OscillatorType
}

let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (ctx) return ctx
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  return ctx
}

/** One short envelope-shaped tone: quick attack, exponential-ish decay. */
function playNote(audio: AudioContext, note: Note, peakGain: number) {
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = note.type ?? 'sine'
  osc.frequency.value = note.freq
  osc.connect(gain)
  gain.connect(audio.destination)

  const t0 = audio.currentTime + note.start
  const attack = Math.min(0.015, note.duration / 4)
  const t1 = t0 + attack
  const t2 = t0 + note.duration

  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(peakGain, t1)
  gain.gain.exponentialRampToValueAtTime(0.001, t2)

  osc.start(t0)
  osc.stop(t2 + 0.02)
}

const PEAK_GAIN = 0.15

const PHRASES: Record<SoundKind, Note[]> = {
  // Two rising notes: a quick affirming "up-tick".
  pass: [
    { freq: 440, start: 0, duration: 0.14, type: 'triangle' },
    { freq: 587, start: 0.13, duration: 0.2, type: 'triangle' },
  ],
  // One low buzz.
  fail: [{ freq: 110, start: 0, duration: 0.35, type: 'sawtooth' }],
  // Three-note arpeggio.
  perfect: [
    { freq: 523, start: 0, duration: 0.12, type: 'triangle' },
    { freq: 659, start: 0.1, duration: 0.12, type: 'triangle' },
    { freq: 784, start: 0.2, duration: 0.28, type: 'triangle' },
  ],
  // Short fanfare.
  bonus: [
    { freq: 392, start: 0, duration: 0.1, type: 'square' },
    { freq: 523, start: 0.09, duration: 0.1, type: 'square' },
    { freq: 659, start: 0.18, duration: 0.1, type: 'square' },
    { freq: 784, start: 0.27, duration: 0.3, type: 'square' },
  ],
}

export function playSound(kind: SoundKind): void {
  try {
    if (!useSettings.getState().soundOn) return
    const audio = getContext()
    if (!audio) return
    if (audio.state === 'suspended') {
      // Fire-and-forget: browsers gate audio on a user gesture, and by the
      // time this resolves the notes below have often already been
      // scheduled against audio.currentTime, which is fine either way.
      void audio.resume()
    }
    for (const note of PHRASES[kind]) playNote(audio, note, PEAK_GAIN)
  } catch {
    // Never let a sound glitch break the game.
  }
}
