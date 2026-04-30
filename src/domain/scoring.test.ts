import { describe, expect, it } from 'vitest'
import { DEFAULT_PRACTICE_SETTINGS, type MidiNoteEvent, type PracticeEvent } from './types'
import { evaluatePracticeInput, shouldMarkMissed } from './scoring'

const EVENT: PracticeEvent = {
  id: 'event-1',
  measureIndex: 0,
  measureNumber: '1',
  beat: 1,
  absoluteBeat: 0,
  durationBeats: 1,
  expectedMidiPitches: [60, 64],
  label: 'C4 + E4',
  anchorId: 'event-1',
}

function noteOn(pitch: number, timestamp = 0): MidiNoteEvent {
  return { pitch, velocity: 96, timestamp, type: 'noteon' }
}

describe('evaluatePracticeInput', () => {
  it('waits for all notes in a chord before advancing', () => {
    const first = evaluatePracticeInput(EVENT, [], noteOn(60), DEFAULT_PRACTICE_SETTINGS, {
      enabled: false,
      expectedAtMs: 0,
      nowMs: 0,
    })

    expect(first.status).toBe('partial')
    expect(first.shouldAdvance).toBe(false)

    const second = evaluatePracticeInput(EVENT, first.playedPitches, noteOn(64), DEFAULT_PRACTICE_SETTINGS, {
      enabled: false,
      expectedAtMs: 0,
      nowMs: 0,
    })

    expect(second.status).toBe('correct')
    expect(second.shouldAdvance).toBe(true)
  })

  it('marks wrong pitches red without advancing', () => {
    const result = evaluatePracticeInput(EVENT, [], noteOn(61), DEFAULT_PRACTICE_SETTINGS, {
      enabled: false,
      expectedAtMs: 0,
      nowMs: 0,
    })

    expect(result.status).toBe('wrong')
    expect(result.shouldAdvance).toBe(false)
  })

  it('marks late correct notes wrong and advances in timed mode', () => {
    const result = evaluatePracticeInput(EVENT, [60], noteOn(64), DEFAULT_PRACTICE_SETTINGS, {
      enabled: true,
      expectedAtMs: 0,
      nowMs: 500,
    })

    expect(result.status).toBe('wrong')
    expect(result.shouldAdvance).toBe(true)
  })
})

describe('shouldMarkMissed', () => {
  it('uses tempo and tolerance to mark missed timed events', () => {
    expect(shouldMarkMissed(EVENT, DEFAULT_PRACTICE_SETTINGS, 100)).toBe(false)
    expect(shouldMarkMissed(EVENT, DEFAULT_PRACTICE_SETTINGS, 300)).toBe(true)
  })
})
