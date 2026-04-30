import { FileMusic, Pause, RotateCcw, SlidersHorizontal, Sparkles, Timer, TimerOff } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EventRail } from '../components/EventRail'
import { PdfReferenceViewer } from '../components/PdfReferenceViewer'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { parseMusicXml, readMusicXmlFile, type ParsedMusicXml } from '../domain/musicxml'
import { beatMs, evaluatePracticeInput, shouldMarkMissed } from '../domain/scoring'
import {
  DEFAULT_PRACTICE_SETTINGS,
  midiToNoteName,
  type ImportedPiece,
  type PracticeEvent,
  type PracticeResult,
  type PracticeSettings,
} from '../domain/types'
import type { MidiController } from '../hooks/useMidi'

interface PracticeViewProps {
  piece: ImportedPiece | null
  midi: MidiController
  onUpdatePiece: (piece: ImportedPiece) => Promise<void>
}

interface ParsedState {
  parsed: ParsedMusicXml | null
  error: string | null
}

export function PracticeView({ piece, midi, onUpdatePiece }: PracticeViewProps) {
  const parsedState = useMemo<ParsedState>(() => {
    if (!piece?.musicXml) {
      return { parsed: null, error: null }
    }

    try {
      return { parsed: parseMusicXml(piece.musicXml, piece.title), error: null }
    } catch (error) {
      return {
        parsed: null,
        error: error instanceof Error ? error.message : 'Unable to parse MusicXML.',
      }
    }
  }, [piece])

  const events = useMemo(() => parsedState.parsed?.events ?? [], [parsedState.parsed])
  const [settings, setSettings] = useState<PracticeSettings>(piece?.settings ?? DEFAULT_PRACTICE_SETTINGS)
  const [activeIndex, setActiveIndex] = useState(0)
  const [results, setResults] = useState<Record<string, PracticeResult>>({})
  const [playedPitches, setPlayedPitches] = useState<number[]>([])
  const [running, setRunning] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [attachError, setAttachError] = useState<string | null>(null)
  const [attaching, setAttaching] = useState(false)
  const startedAtRef = useRef<number>(0)

  useEffect(() => {
    setSettings(piece?.settings ?? DEFAULT_PRACTICE_SETTINGS)
    setActiveIndex(0)
    setResults({})
    setPlayedPitches([])
    setRunning(false)
    setElapsedMs(0)
    setAttachError(null)
  }, [piece?.id, piece?.settings])

  const handleAttachMusicXml = useCallback(
    async (file: File | null) => {
      if (!piece || !file) {
        return
      }

      setAttaching(true)
      setAttachError(null)

      try {
        const nextParsed = await readMusicXmlFile(file)
        await onUpdatePiece({
          ...piece,
          musicXml: nextParsed.xml,
          musicXmlFileName: file.name,
          eventCount: nextParsed.events.length,
        })
      } catch (error) {
        setAttachError(error instanceof Error ? error.message : 'Unable to attach MusicXML.')
      } finally {
        setAttaching(false)
      }
    },
    [onUpdatePiece, piece],
  )

  useEffect(() => {
    if (!running || !settings.timingEnabled) {
      return undefined
    }

    const interval = window.setInterval(() => {
      const nextElapsed = performance.now() - startedAtRef.current
      setElapsedMs(nextElapsed)

      const activeEvent = events[activeIndex]
      if (activeEvent && shouldMarkMissed(activeEvent, settings, nextElapsed)) {
        setResults((current) => ({
          ...current,
          [activeEvent.id]: {
            status: 'missed',
            atMs: nextElapsed,
            playedPitches: [],
          },
        }))
        advance(activeIndex, events, settings, setActiveIndex)
      }
    }, 50)

    return () => window.clearInterval(interval)
  }, [activeIndex, events, running, settings])

  useEffect(() => {
    const midiEvent = midi.lastEvent
    const activeEvent = events[activeIndex]

    if (!midiEvent || !activeEvent || !running) {
      return
    }

    const expectedAtMs = activeEvent.absoluteBeat * beatMs(settings.tempo)
    const evaluation = evaluatePracticeInput(activeEvent, playedPitches, midiEvent, settings, {
      enabled: settings.timingEnabled,
      expectedAtMs,
      nowMs: settings.timingEnabled ? elapsedMs : expectedAtMs,
    })

    if (evaluation.status === 'ignored') {
      return
    }

    setPlayedPitches(evaluation.playedPitches)

    const resultStatus =
      evaluation.status === 'correct' || evaluation.status === 'wrong' ? evaluation.status : null

    if (resultStatus) {
      setResults((current) => ({
        ...current,
        [activeEvent.id]: {
          status: resultStatus,
          atMs: elapsedMs,
          playedPitches: evaluation.playedPitches,
        },
      }))
    }

    if (evaluation.shouldAdvance) {
      setPlayedPitches([])
      advance(activeIndex, events, settings, setActiveIndex)
    }
  }, [activeIndex, elapsedMs, events, midi.lastEvent, playedPitches, running, settings])

  const start = useCallback(() => {
    if (settings.timingEnabled) {
      startedAtRef.current = performance.now() - elapsedMs
    }
    setRunning(true)
  }, [elapsedMs, settings.timingEnabled])

  const pause = useCallback(() => {
    setRunning(false)
  }, [])

  const restart = useCallback(() => {
    setActiveIndex(loopStartIndex(events, settings))
    setResults({})
    setPlayedPitches([])
    setElapsedMs(0)
    startedAtRef.current = performance.now()
    setRunning(false)
  }, [events, settings])

  if (!piece) {
    return (
      <section className="workspace-empty">
        <h2>Practice</h2>
        <p>Select a saved piece from the library.</p>
      </section>
    )
  }

  if (!piece.musicXml || parsedState.error || !parsedState.parsed) {
    return (
      <section className="practice-view">
        <div className="practice-toolbar">
          <div>
            <h2>{piece.title}</h2>
            <p>{piece.pdfFileName ?? 'Reference score'}</p>
          </div>
          <label className="primary-action file-action">
            <FileMusic aria-hidden="true" />
            {attaching ? 'Reading score' : 'Attach MusicXML'}
            <input
              type="file"
              accept=".musicxml,.xml,.mxl,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml"
              onChange={(event) => {
                void handleAttachMusicXml(event.currentTarget.files?.[0] ?? null)
                event.currentTarget.value = ''
              }}
              data-testid="attach-musicxml-input"
            />
          </label>
        </div>

        <div className="prep-grid">
          <section className="prep-panel">
            <div className="prep-kicker">
              <Sparkles aria-hidden="true" />
              Reference mode
            </div>
            <h3>Ready for score prep</h3>
            <p>
              The PDF is preserved for reading. Interactive green/red feedback unlocks when a
              matching MusicXML or MXL export is attached.
            </p>
            {parsedState.error && <div className="notice error">{parsedState.error}</div>}
            {attachError && <div className="notice error">{attachError}</div>}
            <div className="prep-steps">
              <span>1 PDF loaded</span>
              <span className={piece.musicXml ? 'complete' : ''}>2 MusicXML attached</span>
              <span className={piece.musicXml ? 'complete' : ''}>3 MIDI practice ready</span>
            </div>
          </section>

          <PdfReferenceViewer pdf={piece.pdf} title={piece.title} />
        </div>
      </section>
    )
  }

  const activeEvent = events[activeIndex]

  return (
    <section className="practice-view">
      <div className="practice-toolbar">
        <div>
          <h2>{piece.title}</h2>
          <p>
            {activeEvent
              ? `Measure ${activeEvent.measureNumber} · ${activeEvent.label}`
              : 'Practice complete'}
          </p>
        </div>

        <div className="toolbar-actions">
          <button type="button" className="primary-action" onClick={running ? pause : start}>
            {running ? <Pause aria-hidden="true" /> : <Timer aria-hidden="true" />}
            {running ? 'Pause' : 'Start'}
          </button>
          <button type="button" className="secondary-action" onClick={restart}>
            <RotateCcw aria-hidden="true" />
            Restart
          </button>
        </div>
      </div>

      <div className="settings-row" aria-label="Practice settings">
        <label>
          <SlidersHorizontal aria-hidden="true" />
          Tempo
          <input
            type="number"
            min="30"
            max="220"
            value={settings.tempo}
            onChange={(event) =>
              setSettings((current) => ({ ...current, tempo: Number(event.currentTarget.value) }))
            }
          />
        </label>
        <label>
          {settings.timingEnabled ? <Timer aria-hidden="true" /> : <TimerOff aria-hidden="true" />}
          Timing
          <input
            type="checkbox"
            checked={settings.timingEnabled}
            onChange={(event) =>
              setSettings((current) => ({ ...current, timingEnabled: event.currentTarget.checked }))
            }
          />
        </label>
        <label>
          Tolerance
          <input
            type="number"
            min="50"
            step="25"
            value={settings.toleranceMs}
            onChange={(event) =>
              setSettings((current) => ({ ...current, toleranceMs: Number(event.currentTarget.value) }))
            }
          />
        </label>
        <label>
          Loop from
          <input
            type="number"
            min="1"
            value={settings.loopStartMeasure}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                loopStartMeasure: Number(event.currentTarget.value),
              }))
            }
          />
        </label>
        <label>
          Loop to
          <input
            type="number"
            min="1"
            value={settings.loopEndMeasure ?? ''}
            placeholder="End"
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                loopEndMeasure: event.currentTarget.value ? Number(event.currentTarget.value) : null,
              }))
            }
          />
        </label>
        <label>
          Auto-scroll
          <input
            type="checkbox"
            checked={settings.autoScroll}
            onChange={(event) =>
              setSettings((current) => ({ ...current, autoScroll: event.currentTarget.checked }))
            }
          />
        </label>
      </div>

      <ScoreDisplay
        musicXml={piece.musicXml}
        events={events}
        activeIndex={activeIndex}
        results={results}
        autoScroll={settings.autoScroll}
      />

      <div className="practice-footer">
        <EventRail events={events} activeIndex={activeIndex} results={results} />
        <div className="midi-monitor">
          {midi.activePitches.length ? midi.activePitches.map(midiToNoteName).join(' · ') : 'No notes held'}
        </div>
      </div>
    </section>
  )
}

function advance(
  activeIndex: number,
  events: PracticeEvent[],
  settings: PracticeSettings,
  setActiveIndex: (index: number) => void,
) {
  const endIndex = loopEndIndex(events, settings)
  const startIndex = loopStartIndex(events, settings)
  const nextIndex = activeIndex + 1

  setActiveIndex(nextIndex > endIndex ? startIndex : Math.min(nextIndex, events.length - 1))
}

function loopStartIndex(events: PracticeEvent[], settings: PracticeSettings): number {
  const index = events.findIndex((event) => Number(event.measureNumber) >= settings.loopStartMeasure)
  return index >= 0 ? index : 0
}

function loopEndIndex(events: PracticeEvent[], settings: PracticeSettings): number {
  if (!settings.loopEndMeasure) {
    return events.length - 1
  }

  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (Number(events[index].measureNumber) <= settings.loopEndMeasure) {
      return index
    }
  }

  return events.length - 1
}
