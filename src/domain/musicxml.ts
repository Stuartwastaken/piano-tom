import { strFromU8, unzipSync } from 'fflate'
import { formatPitchSet, type PracticeEvent } from './types'

interface RawPracticeEvent {
  measureIndex: number
  measureNumber: string
  beatZero: number
  durationBeats: number
  expectedMidiPitches: Set<number>
}

interface MeasureDuration {
  durationBeats: number
  fallbackBeats: number
}

export interface ParsedMusicXml {
  title: string
  events: PracticeEvent[]
  xml: string
}

const STEP_TO_SEMITONE: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

export async function readMusicXmlFile(file: File): Promise<ParsedMusicXml> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  const xml =
    extension === 'mxl'
      ? await extractXmlFromMxl(await file.arrayBuffer())
      : await file.text()

  const parsed = parseMusicXml(xml, stripExtension(file.name))
  return {
    ...parsed,
    xml,
  }
}

export function parseMusicXml(xml: string, fallbackTitle = 'Untitled score'): ParsedMusicXml {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  const parserError = firstDeep(document, 'parsererror')

  if (parserError) {
    throw new Error('The selected MusicXML file could not be parsed.')
  }

  const root = document.documentElement
  if (!root || !['score-partwise', 'score-timewise'].includes(root.localName)) {
    throw new Error('The selected file is not a supported MusicXML score.')
  }

  if (root.localName === 'score-timewise') {
    throw new Error('Timewise MusicXML is not supported in this MVP. Export as partwise MusicXML.')
  }

  const rawEvents = new Map<string, RawPracticeEvent>()
  const measureDurations = new Map<number, MeasureDuration>()
  const parts = children(root, 'part')

  for (const part of parts) {
    let divisions = 1
    let fallbackBeats = 4

    children(part, 'measure').forEach((measure, measureIndex) => {
      let cursorDivisions = 0
      let lastNoteStart = 0
      const measureNumber = measure.getAttribute('number') ?? `${measureIndex + 1}`
      const measureDuration = measureDurations.get(measureIndex) ?? {
        durationBeats: 0,
        fallbackBeats,
      }

      for (const element of Array.from(measure.children)) {
        if (element.localName === 'attributes') {
          const nextDivisions = numberFromText(childText(element, 'divisions'))
          divisions = nextDivisions > 0 ? nextDivisions : divisions
          fallbackBeats = readTimeSignatureBeats(element) ?? fallbackBeats
          measureDuration.fallbackBeats = fallbackBeats
          continue
        }

        if (element.localName === 'backup') {
          cursorDivisions = Math.max(0, cursorDivisions - durationDivisions(element))
          continue
        }

        if (element.localName === 'forward') {
          cursorDivisions += durationDivisions(element)
          measureDuration.durationBeats = Math.max(
            measureDuration.durationBeats,
            cursorDivisions / divisions,
          )
          continue
        }

        if (element.localName !== 'note' || child(element, 'grace')) {
          continue
        }

        const noteDuration = durationDivisions(element)
        const startsChord = Boolean(child(element, 'chord'))
        const noteStart = startsChord ? lastNoteStart : cursorDivisions

        if (!startsChord) {
          lastNoteStart = noteStart
        }

        const midiPitch = readMidiPitch(element)
        const isPlayableAttack = midiPitch !== null && !isTieContinuationOnly(element)

        if (isPlayableAttack) {
          const beatZero = noteStart / divisions
          const key = `${measureIndex}:${roundBeat(beatZero)}`
          const event =
            rawEvents.get(key) ??
            createRawEvent(measureIndex, measureNumber, beatZero, noteDuration / divisions)

          event.durationBeats = Math.max(event.durationBeats, noteDuration / divisions)
          event.expectedMidiPitches.add(midiPitch)
          rawEvents.set(key, event)
        }

        if (!startsChord) {
          cursorDivisions += noteDuration
        }

        measureDuration.durationBeats = Math.max(
          measureDuration.durationBeats,
          cursorDivisions / divisions,
        )
      }

      measureDurations.set(measureIndex, measureDuration)
    })
  }

  const measureOffsets = buildMeasureOffsets(measureDurations)
  const events = Array.from(rawEvents.values())
    .map((event) => toPracticeEvent(event, measureOffsets[event.measureIndex] ?? 0))
    .sort((a, b) => a.absoluteBeat - b.absoluteBeat || a.measureIndex - b.measureIndex)

  if (events.length === 0) {
    throw new Error('No playable pitched notes were found in this MusicXML file.')
  }

  return {
    title: readScoreTitle(document, fallbackTitle),
    events,
    xml,
  }
}

async function extractXmlFromMxl(buffer: ArrayBuffer): Promise<string> {
  const entries = unzipSync(new Uint8Array(buffer))
  const container = entries['META-INF/container.xml']
  let rootPath: string | undefined

  if (container) {
    const containerXml = strFromU8(container)
    const containerDocument = new DOMParser().parseFromString(containerXml, 'application/xml')
    rootPath = firstDeep(containerDocument, 'rootfile')?.getAttribute('full-path') ?? undefined
  }

  const xmlEntryName =
    rootPath ??
    Object.keys(entries).find(
      (entryName) => entryName.toLowerCase().endsWith('.xml') && !entryName.startsWith('META-INF/'),
    )

  if (!xmlEntryName || !entries[xmlEntryName]) {
    throw new Error('The selected MXL archive does not contain a MusicXML score.')
  }

  return strFromU8(entries[xmlEntryName])
}

function createRawEvent(
  measureIndex: number,
  measureNumber: string,
  beatZero: number,
  durationBeats: number,
): RawPracticeEvent {
  return {
    measureIndex,
    measureNumber,
    beatZero,
    durationBeats,
    expectedMidiPitches: new Set<number>(),
  }
}

function toPracticeEvent(event: RawPracticeEvent, measureOffset: number): PracticeEvent {
  const expectedMidiPitches = Array.from(event.expectedMidiPitches).sort((a, b) => a - b)
  const beat = event.beatZero + 1
  const roundedBeat = roundBeat(beat)

  return {
    id: `m${event.measureIndex + 1}-b${roundBeat(event.beatZero)}`,
    measureIndex: event.measureIndex,
    measureNumber: event.measureNumber,
    beat: roundedBeat,
    absoluteBeat: measureOffset + event.beatZero,
    durationBeats: event.durationBeats || 1,
    expectedMidiPitches,
    label: formatPitchSet(expectedMidiPitches),
    anchorId: `measure-${event.measureIndex + 1}-beat-${roundBeat(event.beatZero)}`,
  }
}

function buildMeasureOffsets(measureDurations: Map<number, MeasureDuration>): number[] {
  const highestMeasureIndex = Math.max(...measureDurations.keys(), 0)
  const offsets: number[] = []
  let runningBeat = 0

  for (let index = 0; index <= highestMeasureIndex; index += 1) {
    offsets[index] = runningBeat
    const duration = measureDurations.get(index)
    runningBeat += Math.max(duration?.durationBeats ?? 0, duration?.fallbackBeats ?? 4, 1)
  }

  return offsets
}

function readMidiPitch(noteElement: Element): number | null {
  if (child(noteElement, 'rest')) {
    return null
  }

  const pitch = child(noteElement, 'pitch')
  if (!pitch) {
    return null
  }

  const step = childText(pitch, 'step')?.trim().toUpperCase()
  const octave = numberFromText(childText(pitch, 'octave'))

  if (!step || STEP_TO_SEMITONE[step] === undefined || !Number.isFinite(octave)) {
    return null
  }

  const alter = numberFromText(childText(pitch, 'alter'))
  return (octave + 1) * 12 + STEP_TO_SEMITONE[step] + alter
}

function isTieContinuationOnly(noteElement: Element): boolean {
  const ties = children(noteElement, 'tie').map((tie) => tie.getAttribute('type'))
  return ties.includes('stop') && !ties.includes('start')
}

function readTimeSignatureBeats(attributes: Element): number | null {
  const time = child(attributes, 'time')
  if (!time) {
    return null
  }

  const beats = numberFromText(childText(time, 'beats'))
  const beatType = numberFromText(childText(time, 'beat-type'))

  if (beats <= 0 || beatType <= 0) {
    return null
  }

  return beats * (4 / beatType)
}

function readScoreTitle(document: Document, fallbackTitle: string): string {
  return (
    textFromFirstDeep(document, 'movement-title') ??
    textFromFirstDeep(document, 'work-title') ??
    textFromFirstDeep(document, 'credit-words') ??
    fallbackTitle
  ).trim()
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '')
}

function durationDivisions(element: Element): number {
  return Math.max(0, numberFromText(childText(element, 'duration')))
}

function numberFromText(value: string | null | undefined): number {
  if (!value) {
    return 0
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function roundBeat(value: number): number {
  return Math.round(value * 1000) / 1000
}

function child(element: Element, localName: string): Element | null {
  return children(element, localName)[0] ?? null
}

function children(element: Element, localName: string): Element[] {
  return Array.from(element.children).filter((candidate) => candidate.localName === localName)
}

function childText(element: Element, localName: string): string | null {
  return child(element, localName)?.textContent ?? null
}

function firstDeep(root: Document | Element, localName: string): Element | null {
  return (
    Array.from(root.getElementsByTagName('*')).find((element) => element.localName === localName) ??
    null
  )
}

function textFromFirstDeep(root: Document | Element, localName: string): string | null {
  const text = firstDeep(root, localName)?.textContent?.trim()
  return text ? text : null
}
