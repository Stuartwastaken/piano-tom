import { useEffect, useRef, useState } from 'react'
import { OpenSheetMusicDisplay, type ColoringOptions, type IOSMDOptions } from 'opensheetmusicdisplay'
import type { PracticeEvent, PracticeResult } from '../domain/types'

interface ScoreDisplayProps {
  musicXml: string
  events: PracticeEvent[]
  activeIndex: number
  results: Record<string, PracticeResult>
  autoScroll: boolean
}

const NOTE_COLORING: ColoringOptions = {
  applyToNoteheads: true,
  applyToStem: true,
  applyToBeams: true,
  applyToFlag: true,
  applyToLedgerLines: true,
  applyToModifiers: true,
  applyToTies: true,
}

const OSMD_OPTIONS: IOSMDOptions = {
  backend: 'svg',
  autoResize: true,
  drawTitle: true,
  followCursor: false,
  drawingParameters: 'compacttight',
}

export function ScoreDisplay({
  musicXml,
  events,
  activeIndex,
  results,
  autoScroll,
}: ScoreDisplayProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null)
  const [renderState, setRenderState] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    let cancelled = false
    const host = hostRef.current

    if (!host) {
      return undefined
    }

    host.innerHTML = ''
    setRenderState('loading')

    const osmd = new OpenSheetMusicDisplay(host, OSMD_OPTIONS)
    osmd.setLogLevel('error')
    osmdRef.current = osmd

    osmd
      .load(musicXml)
      .then(() => {
        if (cancelled) {
          return
        }

        osmd.render()
        osmd.cursor.show()
        setRenderState('ready')
      })
      .catch(() => {
        if (!cancelled) {
          setRenderState('failed')
        }
      })

    return () => {
      cancelled = true
      osmd.clear()
      host.innerHTML = ''
      osmdRef.current = null
    }
  }, [musicXml])

  useEffect(() => {
    const osmd = osmdRef.current

    if (!osmd || renderState !== 'ready' || events.length === 0) {
      return
    }

    colorCursorNotes(osmd, events, activeIndex, results)
    moveCursor(osmd, activeIndex)

    if (autoScroll) {
      osmd.cursor.cursorElement.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [activeIndex, autoScroll, events, renderState, results])

  return (
    <div className="score-shell">
      {renderState === 'loading' && <div className="score-state">Rendering score</div>}
      {renderState === 'failed' && <div className="score-state error">Unable to render this score</div>}
      <div ref={hostRef} className="score-host" data-testid="score-host" />
    </div>
  )
}

function colorCursorNotes(
  osmd: OpenSheetMusicDisplay,
  events: PracticeEvent[],
  activeIndex: number,
  results: Record<string, PracticeResult>,
) {
  osmd.cursor.reset()

  events.forEach((event, index) => {
    const result = results[event.id]
    const color =
      result?.status === 'correct'
        ? '#15803d'
        : result
          ? '#dc2626'
          : index === activeIndex
            ? '#2563eb'
            : '#111827'

    try {
      osmd.cursor.GNotesUnderCursor().forEach((note) => {
        note.setColor(color, NOTE_COLORING)
      })
      osmd.cursor.next()
    } catch {
      // Some MusicXML cursor positions have no graphical note; the event rail remains authoritative.
    }
  })
}

function moveCursor(osmd: OpenSheetMusicDisplay, activeIndex: number) {
  osmd.cursor.reset()

  for (let index = 0; index < activeIndex; index += 1) {
    try {
      osmd.cursor.next()
    } catch {
      break
    }
  }

  osmd.cursor.show()
  osmd.cursor.update()
}
