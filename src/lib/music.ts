import { useEffect } from 'react'
import { useSettings } from '../store/settings'

/**
 * Tiny synthesized chiptune sequencer via the Web Audio API. No audio files,
 * no network. Uses lookahead scheduling (a 25ms setInterval that schedules
 * ~100ms of audio ahead of the AudioContext clock) so timing stays stable
 * even if the JS timer jitters.
 *
 * Every exported control function is a no-op-on-failure: audio glitches
 * must never break the game.
 */

export type Track = 'office' | 'boss' | 'bonus'

type Voice = 'lead' | 'bass' | 'hat'

/** One step-sequencer note. `step` and `len` are in 16th-note grid units. */
export interface MusicNote {
  step: number
  /** MIDI note number. Ignored for the 'hat' voice (it's untuned noise). */
  note: number
  len: number
  voice: Voice
}

const STEPS_PER_BAR = 16

/** Bars per loop, and tempo, per track. */
const TRACK_BARS: Record<Track, number> = { office: 8, boss: 4, bonus: 4 }
const TEMPO: Record<Track, number> = { office: 112, boss: 140, bonus: 120 }

const MASTER_GAIN = 0.12

/** Total steps in one loop of a track. Pure — safe to unit test. */
export function trackLength(track: Track): number {
  return TRACK_BARS[track] * STEPS_PER_BAR
}

/** Seconds per 16th-note step at a track's tempo. Pure. */
export function stepSeconds(track: Track): number {
  return 60 / TEMPO[track] / 4
}

/** MIDI note number to frequency in Hz (A4 = 69 = 440Hz). Pure. */
export function midiToHz(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12)
}

/** Repeats a short cycle of notes to fill a longer track, offsetting steps. */
function repeatCycle(cycle: MusicNote[], cycleSteps: number, totalSteps: number): MusicNote[] {
  const out: MusicNote[] = []
  for (let offset = 0; offset < totalSteps; offset += cycleSteps) {
    for (const n of cycle) {
      if (offset + n.step < totalSteps) out.push({ ...n, step: offset + n.step })
    }
  }
  return out
}

// --- office: cheerful, bouncy loop. Square lead arpeggio over a I-V-vi-IV
// walking bass, noise hi-hat on every 8th note. 2-bar cycle x4 = 8 bars.
const OFFICE_CYCLE: MusicNote[] = [
  // Lead (square), bouncy staccato 8th-note arpeggio, bar 1.
  { step: 0, note: 72, len: 1, voice: 'lead' }, // C5
  { step: 2, note: 76, len: 1, voice: 'lead' }, // E5
  { step: 4, note: 79, len: 1, voice: 'lead' }, // G5
  { step: 6, note: 76, len: 1, voice: 'lead' }, // E5
  { step: 8, note: 77, len: 1, voice: 'lead' }, // F5
  { step: 10, note: 81, len: 1, voice: 'lead' }, // A5
  { step: 12, note: 79, len: 1, voice: 'lead' }, // G5
  { step: 14, note: 76, len: 1, voice: 'lead' }, // E5
  // Lead, bar 2 — answering phrase, held note at the end.
  { step: 16, note: 74, len: 1, voice: 'lead' }, // D5
  { step: 18, note: 77, len: 1, voice: 'lead' }, // F5
  { step: 20, note: 81, len: 1, voice: 'lead' }, // A5
  { step: 22, note: 77, len: 1, voice: 'lead' }, // F5
  { step: 24, note: 79, len: 1, voice: 'lead' }, // G5
  { step: 26, note: 83, len: 1, voice: 'lead' }, // B5
  { step: 28, note: 84, len: 3, voice: 'lead' }, // C6, held
  // Bass (triangle), walking quarter notes: I-V-vi-IV, twice.
  { step: 0, note: 48, len: 3, voice: 'bass' }, // C3
  { step: 4, note: 43, len: 3, voice: 'bass' }, // G2
  { step: 8, note: 45, len: 3, voice: 'bass' }, // A2
  { step: 12, note: 41, len: 3, voice: 'bass' }, // F2
  { step: 16, note: 48, len: 3, voice: 'bass' },
  { step: 20, note: 43, len: 3, voice: 'bass' },
  { step: 24, note: 45, len: 3, voice: 'bass' },
  { step: 28, note: 41, len: 3, voice: 'bass' },
  // Hi-hat noise burst on every 8th note (every 2 steps).
  ...Array.from({ length: 16 }, (_, i) => ({ step: i * 2, note: 0, len: 1, voice: 'hat' as const })),
]

// --- boss: tense minor-key loop. Pounding root-note bass with a Phrygian
// half-step, syncopated dissonant lead stabs. 2-bar cycle x2 = 4 bars.
const BOSS_CYCLE: MusicNote[] = [
  // Bass (triangle), pounding 8th notes on A2, dipping to Bb2 for tension.
  { step: 0, note: 45, len: 1, voice: 'bass' },
  { step: 2, note: 45, len: 1, voice: 'bass' },
  { step: 4, note: 45, len: 1, voice: 'bass' },
  { step: 6, note: 45, len: 1, voice: 'bass' },
  { step: 8, note: 45, len: 1, voice: 'bass' },
  { step: 10, note: 45, len: 1, voice: 'bass' },
  { step: 12, note: 45, len: 1, voice: 'bass' },
  { step: 14, note: 46, len: 1, voice: 'bass' }, // Bb2, Phrygian bite
  { step: 16, note: 45, len: 1, voice: 'bass' },
  { step: 18, note: 45, len: 1, voice: 'bass' },
  { step: 20, note: 45, len: 1, voice: 'bass' },
  { step: 22, note: 45, len: 1, voice: 'bass' },
  { step: 24, note: 45, len: 1, voice: 'bass' },
  { step: 26, note: 45, len: 1, voice: 'bass' },
  { step: 28, note: 45, len: 1, voice: 'bass' },
  { step: 30, note: 46, len: 1, voice: 'bass' },
  // Lead (square), off-beat dissonant stabs — tritone-ish against the bass.
  { step: 3, note: 74, len: 2, voice: 'lead' }, // D5
  { step: 7, note: 75, len: 2, voice: 'lead' }, // Eb5
  { step: 11, note: 74, len: 2, voice: 'lead' },
  { step: 15, note: 70, len: 2, voice: 'lead' }, // Bb4
  { step: 19, note: 76, len: 2, voice: 'lead' }, // E5, a step up: rising tension
  { step: 23, note: 77, len: 2, voice: 'lead' }, // F5
  { step: 27, note: 76, len: 2, voice: 'lead' },
  { step: 31, note: 70, len: 2, voice: 'lead' },
]

// --- bonus: a short triumphant fanfare that loops slowly. The motif sits in
// the first two bars; the rest of the loop is silence before it repeats.
const BONUS_NOTES: MusicNote[] = [
  { step: 0, note: 48, len: 14, voice: 'bass' }, // C3 pad under the fanfare
  { step: 0, note: 67, len: 3, voice: 'lead' }, // G4
  { step: 4, note: 72, len: 3, voice: 'lead' }, // C5
  { step: 8, note: 76, len: 3, voice: 'lead' }, // E5
  { step: 12, note: 79, len: 8, voice: 'lead' }, // G5, held triumphantly
]

const TRACKS: Record<Track, MusicNote[]> = {
  office: repeatCycle(OFFICE_CYCLE, 32, trackLength('office')),
  boss: repeatCycle(BOSS_CYCLE, 32, trackLength('boss')),
  bonus: BONUS_NOTES,
}

// --- Web Audio plumbing -----------------------------------------------

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null

let currentTrack: Track | null = null
let currentStep = 0
let nextStepTime = 0
let schedulerTimer: number | null = null
let pendingUnlock: (() => void) | null = null

const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_S = 0.1

function ensureContext(): AudioContext | null {
  if (ctx) return ctx
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  masterGain = ctx.createGain()
  masterGain.gain.value = MASTER_GAIN
  masterGain.connect(ctx.destination)
  return ctx
}

function ensureNoiseBuffer(audio: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === audio.sampleRate) return noiseBuffer
  const length = Math.max(1, Math.floor(audio.sampleRate * 0.05))
  const buffer = audio.createBuffer(1, length, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  noiseBuffer = buffer
  return buffer
}

/** Schedules one voice's note at an absolute AudioContext time. */
function playVoice(audio: AudioContext, out: GainNode, voice: Voice, note: number, time: number, duration: number) {
  if (voice === 'hat') {
    const src = audio.createBufferSource()
    src.buffer = ensureNoiseBuffer(audio)
    const filter = audio.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 6000
    const gain = audio.createGain()
    src.connect(filter)
    filter.connect(gain)
    gain.connect(out)
    const end = time + Math.min(duration, 0.06)
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(1, time + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.001, end)
    src.start(time)
    src.stop(end + 0.01)
    return
  }

  const osc = audio.createOscillator()
  osc.type = voice === 'bass' ? 'triangle' : 'square'
  osc.frequency.value = midiToHz(note)
  const gain = audio.createGain()
  osc.connect(gain)
  gain.connect(out)

  const peak = voice === 'bass' ? 0.9 : 0.5
  const attack = Math.min(0.01, duration / 4)
  gain.gain.setValueAtTime(0, time)
  gain.gain.linearRampToValueAtTime(peak, time + attack)
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration)
  osc.start(time)
  osc.stop(time + duration + 0.02)
}

function scheduleStep(audio: AudioContext, out: GainNode, track: Track, step: number, time: number) {
  const dur = stepSeconds(track)
  for (const n of TRACKS[track]) {
    if (n.step !== step) continue
    playVoice(audio, out, n.voice, n.note, time, n.len * dur)
  }
}

function schedulerTick() {
  const audio = ctx
  const out = masterGain
  if (!audio || !out || !currentTrack) return
  // A background tab throttles timers to ~1s while the audio clock keeps
  // running; without a resync every missed step would fire at once.
  if (nextStepTime < audio.currentTime) {
    nextStepTime = audio.currentTime + 0.05
    currentStep = 0
  }
  while (nextStepTime < audio.currentTime + SCHEDULE_AHEAD_S) {
    scheduleStep(audio, out, currentTrack, currentStep, nextStepTime)
    nextStepTime += stepSeconds(currentTrack)
    currentStep = (currentStep + 1) % trackLength(currentTrack)
  }
}

function startScheduler() {
  if (schedulerTimer != null) return
  const audio = ctx
  if (!audio) return
  currentStep = 0
  nextStepTime = audio.currentTime + 0.05
  schedulerTimer = window.setInterval(schedulerTick, LOOKAHEAD_MS)
}

function clearUnlock() {
  if (!pendingUnlock) return
  window.removeEventListener('pointerdown', pendingUnlock)
  window.removeEventListener('keydown', pendingUnlock)
  pendingUnlock = null
}

/** Browsers suspend new AudioContexts until a user gesture. Defer start. */
function armUnlock(audio: AudioContext) {
  if (pendingUnlock) return
  const handler = () => {
    clearUnlock()
    void audio.resume().then(() => {
      if (currentTrack) startScheduler()
    })
  }
  pendingUnlock = handler
  window.addEventListener('pointerdown', handler)
  window.addEventListener('keydown', handler)
}

/** Starts (or switches to) a looping track. Safe to call repeatedly. */
export function startMusic(track: Track): void {
  try {
    const changed = currentTrack !== track
    currentTrack = track
    if (changed && schedulerTimer != null) currentStep = 0
    const audio = ensureContext()
    if (!audio) return
    if (audio.state === 'suspended') {
      armUnlock(audio)
      return
    }
    startScheduler()
  } catch {
    // Never let a music glitch break the game.
  }
}

/** Stops the scheduler. Notes already scheduled finish naturally. */
export function stopMusic(): void {
  try {
    currentTrack = null
    clearUnlock()
    if (schedulerTimer != null) {
      window.clearInterval(schedulerTimer)
      schedulerTimer = null
    }
  } catch {
    // ignore
  }
}

/** Switches the loop that plays, without touching the audio graph. */
export function setMusicTrack(track: Track): void {
  try {
    if (schedulerTimer != null || pendingUnlock != null) {
      if (currentTrack !== track) currentStep = 0
      currentTrack = track
      return
    }
    startMusic(track)
  } catch {
    // ignore
  }
}

/**
 * Starts `track` on mount when the music setting is on, and stops it on
 * unmount or when the setting turns off. Handles the autoplay policy via
 * startMusic's own deferred-unlock behaviour.
 */
export function useMusic(track: Track): void {
  const musicOn = useSettings((s) => s.musicOn)
  useEffect(() => {
    if (!musicOn) {
      stopMusic()
      return
    }
    // Switch rather than stop/start so screen changes do not restart the
    // loop from bar one. Consumers count so the last one to leave stops it.
    consumers++
    setMusicTrack(track)
    return () => {
      consumers--
      // Defer: the next screen's effect runs right after this cleanup and
      // takes the loop over without a gap.
      window.setTimeout(() => {
        if (consumers <= 0) stopMusic()
      }, 50)
    }
  }, [track, musicOn])
}

let consumers = 0
