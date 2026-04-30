export type PracticeResultStatus = 'correct' | 'wrong' | 'missed'

export interface PracticeSettings {
  timingEnabled: boolean
  tempo: number
  toleranceMs: number
  autoScroll: boolean
  loopStartMeasure: number
  loopEndMeasure: number | null
}

export interface ImportedPiece {
  id: string
  title: string
  createdAt: string
  musicXml: string
  musicXmlFileName: string
  pdf?: Blob
  pdfFileName?: string
  pdfThumbnail?: string
  settings: PracticeSettings
  eventCount: number
}

export interface PracticeEvent {
  id: string
  measureIndex: number
  measureNumber: string
  beat: number
  absoluteBeat: number
  durationBeats: number
  expectedMidiPitches: number[]
  label: string
  anchorId: string
}

export interface MidiNoteEvent {
  pitch: number
  velocity: number
  timestamp: number
  type: 'noteon' | 'noteoff'
  sourceId?: string
}

export interface PracticeResult {
  status: PracticeResultStatus
  atMs: number
  playedPitches: number[]
}

export const DEFAULT_PRACTICE_SETTINGS: PracticeSettings = {
  timingEnabled: true,
  tempo: 84,
  toleranceMs: 250,
  autoScroll: true,
  loopStartMeasure: 1,
  loopEndMeasure: null,
}

export const NOTE_NAMES_SHARP = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  return `${NOTE_NAMES_SHARP[midi % 12]}${octave}`
}

export function formatPitchSet(pitches: number[]): string {
  return pitches.map(midiToNoteName).join(' + ')
}
