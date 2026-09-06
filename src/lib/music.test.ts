import { describe, expect, it } from 'vitest'
import { midiToHz, stepSeconds, trackLength } from './music'

describe('midiToHz', () => {
  it('A4 (69) is 440Hz', () => {
    expect(midiToHz(69)).toBeCloseTo(440, 5)
  })

  it('one octave up doubles frequency', () => {
    expect(midiToHz(81)).toBeCloseTo(880, 5)
  })

  it('one octave down halves frequency', () => {
    expect(midiToHz(57)).toBeCloseTo(220, 5)
  })

  it('middle C (60) is about 261.63Hz', () => {
    expect(midiToHz(60)).toBeCloseTo(261.6255653, 5)
  })
})

describe('trackLength', () => {
  it('office is 8 bars of 16 steps', () => {
    expect(trackLength('office')).toBe(128)
  })

  it('boss is 4 bars of 16 steps', () => {
    expect(trackLength('boss')).toBe(64)
  })

  it('bonus is 4 bars of 16 steps', () => {
    expect(trackLength('bonus')).toBe(64)
  })
})

describe('stepSeconds', () => {
  it('is positive and shrinks as tempo increases', () => {
    expect(stepSeconds('office')).toBeGreaterThan(0)
    // boss (140 BPM) is faster than office (112 BPM), so its steps are shorter.
    expect(stepSeconds('boss')).toBeLessThan(stepSeconds('office'))
  })

  it('office steps are 60 / 112 / 4 seconds', () => {
    expect(stepSeconds('office')).toBeCloseTo(60 / 112 / 4, 10)
  })
})
