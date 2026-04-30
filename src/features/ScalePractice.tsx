import { RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EventRail } from '../components/EventRail'
import {
  SCALE_DIRECTIONS,
  SCALE_HANDS,
  SCALE_KEYS,
  SCALE_MODES,
  generateScaleEvents,
  type ScaleDirection,
  type ScaleHands,
  type ScaleKey,
  type ScaleMode,
} from '../domain/scales'
import { evaluatePracticeInput } from '../domain/scoring'
import {
  DEFAULT_PRACTICE_SETTINGS,
  type PracticeResult,
  type PracticeSettings,
} from '../domain/types'
import type { MidiController } from '../hooks/useMidi'

interface ScalePracticeProps {
  midi: MidiController
}

export function ScalePractice({ midi }: ScalePracticeProps) {
  const [keyName, setKeyName] = useState<ScaleKey>('C')
  const [mode, setMode] = useState<ScaleMode>('major')
  const [octaves, setOctaves] = useState(1)
  const [direction, setDirection] = useState<ScaleDirection>('up-down')
  const [hands, setHands] = useState<ScaleHands>('right')
  const [activeIndex, setActiveIndex] = useState(0)
  const [playedPitches, setPlayedPitches] = useState<number[]>([])
  const [results, setResults] = useState<Record<string, PracticeResult>>({})

  const events = useMemo(
    () => generateScaleEvents({ key: keyName, mode, octaves, direction, hands }),
    [direction, hands, keyName, mode, octaves],
  )

  const settings: PracticeSettings = useMemo(
    () => ({ ...DEFAULT_PRACTICE_SETTINGS, timingEnabled: false }),
    [],
  )

  useEffect(() => {
    const midiEvent = midi.lastEvent
    const activeEvent = events[activeIndex]

    if (!midiEvent || !activeEvent) {
      return
    }

    const evaluation = evaluatePracticeInput(activeEvent, playedPitches, midiEvent, settings, {
      enabled: false,
      expectedAtMs: 0,
      nowMs: 0,
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
          atMs: performance.now(),
          playedPitches: evaluation.playedPitches,
        },
      }))
    }

    if (evaluation.shouldAdvance) {
      setPlayedPitches([])
      setActiveIndex((current) => Math.min(current + 1, events.length - 1))
    }
  }, [activeIndex, events, midi.lastEvent, playedPitches, settings])

  const reset = () => {
    setActiveIndex(0)
    setPlayedPitches([])
    setResults({})
  }

  return (
    <section className="scale-view">
      <div className="practice-toolbar">
        <div>
          <h2>Scales</h2>
          <p>{events[activeIndex]?.label}</p>
        </div>
        <button type="button" className="secondary-action" onClick={reset}>
          <RotateCcw aria-hidden="true" />
          Restart
        </button>
      </div>

      <div className="settings-row">
        <label>
          Key
          <select value={keyName} onChange={(event) => setKeyName(event.currentTarget.value as ScaleKey)}>
            {SCALE_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mode
          <select value={mode} onChange={(event) => setMode(event.currentTarget.value as ScaleMode)}>
            {SCALE_MODES.map((scaleMode) => (
              <option key={scaleMode} value={scaleMode}>
                {scaleMode}
              </option>
            ))}
          </select>
        </label>
        <label>
          Octaves
          <input
            type="number"
            min="1"
            max="4"
            value={octaves}
            onChange={(event) => setOctaves(Number(event.currentTarget.value))}
          />
        </label>
        <label>
          Direction
          <select
            value={direction}
            onChange={(event) => setDirection(event.currentTarget.value as ScaleDirection)}
          >
            {SCALE_DIRECTIONS.map((scaleDirection) => (
              <option key={scaleDirection} value={scaleDirection}>
                {scaleDirection}
              </option>
            ))}
          </select>
        </label>
        <label>
          Hands
          <select value={hands} onChange={(event) => setHands(event.currentTarget.value as ScaleHands)}>
            {SCALE_HANDS.map((handMode) => (
              <option key={handMode} value={handMode}>
                {handMode}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="scale-lane">
        <EventRail events={events} activeIndex={activeIndex} results={results} />
      </div>
    </section>
  )
}
