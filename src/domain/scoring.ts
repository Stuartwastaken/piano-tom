import type { MidiNoteEvent, PracticeEvent, PracticeResultStatus, PracticeSettings } from './types'

export interface PracticeInputEvaluation {
  status: PracticeResultStatus | 'partial' | 'ignored'
  playedPitches: number[]
  shouldAdvance: boolean
  message: string
}

export interface TimingContext {
  enabled: boolean
  expectedAtMs: number
  nowMs: number
}

export function evaluatePracticeInput(
  event: PracticeEvent,
  alreadyPlayedPitches: number[],
  midiEvent: MidiNoteEvent,
  settings: PracticeSettings,
  timing: TimingContext,
): PracticeInputEvaluation {
  if (midiEvent.type !== 'noteon') {
    return {
      status: 'ignored',
      playedPitches: alreadyPlayedPitches,
      shouldAdvance: false,
      message: 'Ignored note-off',
    }
  }

  if (!event.expectedMidiPitches.includes(midiEvent.pitch)) {
    return {
      status: 'wrong',
      playedPitches: alreadyPlayedPitches,
      shouldAdvance: false,
      message: 'Wrong pitch',
    }
  }

  const playedPitches = uniqueSorted([...alreadyPlayedPitches, midiEvent.pitch])
  const complete = event.expectedMidiPitches.every((pitch) => playedPitches.includes(pitch))

  if (!complete) {
    return {
      status: 'partial',
      playedPitches,
      shouldAdvance: false,
      message: 'Chord partially matched',
    }
  }

  if (settings.timingEnabled && timing.enabled) {
    const delta = timing.nowMs - timing.expectedAtMs

    if (delta < -settings.toleranceMs) {
      return {
        status: 'wrong',
        playedPitches,
        shouldAdvance: false,
        message: 'Too early',
      }
    }

    if (delta > settings.toleranceMs) {
      return {
        status: 'wrong',
        playedPitches,
        shouldAdvance: true,
        message: 'Too late',
      }
    }
  }

  return {
    status: 'correct',
    playedPitches,
    shouldAdvance: true,
    message: 'Correct',
  }
}

export function shouldMarkMissed(
  event: PracticeEvent,
  settings: PracticeSettings,
  elapsedMs: number,
): boolean {
  if (!settings.timingEnabled) {
    return false
  }

  return elapsedMs > event.absoluteBeat * beatMs(settings.tempo) + settings.toleranceMs
}

export function beatMs(tempo: number): number {
  return 60_000 / Math.max(20, tempo)
}

export function uniqueSorted(values: number[]): number[] {
  return Array.from(new Set(values)).sort((a, b) => a - b)
}
