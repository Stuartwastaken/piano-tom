import { formatPitchSet, type PracticeEvent } from './types'

export const SCALE_KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab'] as const
export const SCALE_MODES = ['major', 'minor'] as const
export const SCALE_DIRECTIONS = ['up', 'down', 'up-down'] as const
export const SCALE_HANDS = ['right', 'left', 'both'] as const

export type ScaleKey = (typeof SCALE_KEYS)[number]
export type ScaleMode = (typeof SCALE_MODES)[number]
export type ScaleDirection = (typeof SCALE_DIRECTIONS)[number]
export type ScaleHands = (typeof SCALE_HANDS)[number]

export interface ScaleOptions {
  key: ScaleKey
  mode: ScaleMode
  octaves: number
  direction: ScaleDirection
  hands: ScaleHands
}

const KEY_TO_SEMITONE: Record<ScaleKey, number> = {
  C: 0,
  G: 7,
  D: 2,
  A: 9,
  E: 4,
  F: 5,
  Bb: 10,
  Eb: 3,
  Ab: 8,
}

const MODE_INTERVALS: Record<ScaleMode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
}

export function generateScaleEvents(options: ScaleOptions): PracticeEvent[] {
  const ascending = generateAscendingScale(options)
  const sequence =
    options.direction === 'down'
      ? [...ascending].reverse()
      : options.direction === 'up-down'
        ? [...ascending, ...ascending.slice(0, -1).reverse()]
        : ascending

  return sequence.map((pitches, index) => ({
    id: `scale-${index}`,
    measureIndex: Math.floor(index / 4),
    measureNumber: `${Math.floor(index / 4) + 1}`,
    beat: (index % 4) + 1,
    absoluteBeat: index,
    durationBeats: 1,
    expectedMidiPitches: pitches,
    label: formatPitchSet(pitches),
    anchorId: `scale-step-${index}`,
  }))
}

function generateAscendingScale(options: ScaleOptions): number[][] {
  const intervals = MODE_INTERVALS[options.mode]
  const root = KEY_TO_SEMITONE[options.key]
  const rightRoot = 60 + root
  const leftRoot = 48 + root
  const steps: number[][] = []

  for (let octave = 0; octave < options.octaves; octave += 1) {
    for (const interval of intervals) {
      steps.push(pitchesForHands(options.hands, leftRoot, rightRoot, octave * 12 + interval))
    }
  }

  steps.push(pitchesForHands(options.hands, leftRoot, rightRoot, options.octaves * 12))
  return steps
}

function pitchesForHands(hands: ScaleHands, leftRoot: number, rightRoot: number, offset: number): number[] {
  if (hands === 'left') {
    return [leftRoot + offset]
  }

  if (hands === 'both') {
    return [leftRoot + offset, rightRoot + offset]
  }

  return [rightRoot + offset]
}
