import { midiToNoteName } from './types'

export const READING_STAVES = ['treble', 'bass', 'grand'] as const
export type ReadingStaff = (typeof READING_STAVES)[number]

export interface ReadingPrompt {
  id: string
  midiPitch: number
  staff: ReadingStaff
}

export interface ReadingStats {
  attempts: number
  correct: number
  recentMisses: string[]
}

const TREBLE_RANGE = { min: 60, max: 84 }
const BASS_RANGE = { min: 36, max: 60 }

export function createReadingPrompt(
  staff: ReadingStaff,
  random: () => number = Math.random,
): ReadingPrompt {
  const range =
    staff === 'treble'
      ? TREBLE_RANGE
      : staff === 'bass'
        ? BASS_RANGE
        : random() > 0.5
          ? TREBLE_RANGE
          : BASS_RANGE

  const naturalPitches = naturalMidiPitches(range.min, range.max)
  const midiPitch = naturalPitches[Math.floor(random() * naturalPitches.length)]

  return {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${midiPitch}`,
    midiPitch,
    staff,
  }
}

export function assessReadingAnswer(prompt: ReadingPrompt, playedPitch: number): boolean {
  return prompt.midiPitch === playedPitch
}

export function nextReadingStats(
  stats: ReadingStats,
  prompt: ReadingPrompt,
  playedPitch: number,
): ReadingStats {
  const correct = assessReadingAnswer(prompt, playedPitch)
  const missLabel = `${midiToNoteName(prompt.midiPitch)} played ${midiToNoteName(playedPitch)}`

  return {
    attempts: stats.attempts + 1,
    correct: stats.correct + (correct ? 1 : 0),
    recentMisses: correct ? stats.recentMisses : [missLabel, ...stats.recentMisses].slice(0, 6),
  }
}

export function noteStaffPosition(midiPitch: number): { staff: 'treble' | 'bass'; y: number } {
  const staff = midiPitch >= 60 ? 'treble' : 'bass'
  const reference = staff === 'treble' ? 64 : 43
  const y = 92 - diatonicDistance(reference, midiPitch) * 6

  return { staff, y }
}

function naturalMidiPitches(min: number, max: number): number[] {
  const naturals = new Set([0, 2, 4, 5, 7, 9, 11])
  const pitches: number[] = []

  for (let pitch = min; pitch <= max; pitch += 1) {
    if (naturals.has(pitch % 12)) {
      pitches.push(pitch)
    }
  }

  return pitches
}

function diatonicDistance(fromMidi: number, toMidi: number): number {
  return diatonicIndex(toMidi) - diatonicIndex(fromMidi)
}

function diatonicIndex(midiPitch: number): number {
  const octave = Math.floor(midiPitch / 12) - 1
  const pitchClass = midiPitch % 12
  const stepIndex = pitchClassToStep(pitchClass)
  return octave * 7 + stepIndex
}

function pitchClassToStep(pitchClass: number): number {
  if (pitchClass <= 1) return 0
  if (pitchClass <= 3) return 1
  if (pitchClass === 4) return 2
  if (pitchClass <= 6) return 3
  if (pitchClass <= 8) return 4
  if (pitchClass <= 10) return 5
  return 6
}
