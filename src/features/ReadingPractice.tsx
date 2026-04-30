import { useEffect, useMemo, useState } from 'react'
import {
  READING_STAVES,
  assessReadingAnswer,
  createReadingPrompt,
  nextReadingStats,
  noteStaffPosition,
  type ReadingPrompt,
  type ReadingStaff,
  type ReadingStats,
} from '../domain/reading'
import { midiToNoteName } from '../domain/types'
import type { MidiController } from '../hooks/useMidi'

interface ReadingPracticeProps {
  midi: MidiController
}

const EMPTY_STATS: ReadingStats = {
  attempts: 0,
  correct: 0,
  recentMisses: [],
}

const STORAGE_KEY = 'piano-tom-reading-stats'

export function ReadingPractice({ midi }: ReadingPracticeProps) {
  const [staff, setStaff] = useState<ReadingStaff>('grand')
  const [prompt, setPrompt] = useState<ReadingPrompt>(() => createReadingPrompt('grand'))
  const [stats, setStats] = useState<ReadingStats>(() => readStats())
  const [lastAnswer, setLastAnswer] = useState<'correct' | 'wrong' | null>(null)

  useEffect(() => {
    setPrompt(createReadingPrompt(staff))
  }, [staff])

  useEffect(() => {
    const midiEvent = midi.lastEvent
    if (!midiEvent || midiEvent.type !== 'noteon') {
      return
    }

    const correct = assessReadingAnswer(prompt, midiEvent.pitch)
    const nextStats = nextReadingStats(stats, prompt, midiEvent.pitch)
    setStats(nextStats)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStats))
    setLastAnswer(correct ? 'correct' : 'wrong')
    window.setTimeout(() => {
      setPrompt(createReadingPrompt(staff))
      setLastAnswer(null)
    }, 250)
  }, [midi.lastEvent, prompt, staff, stats])

  const accuracy = useMemo(
    () => (stats.attempts ? Math.round((stats.correct / stats.attempts) * 100) : 0),
    [stats],
  )

  return (
    <section className="reading-view">
      <div className="practice-toolbar">
        <div>
          <h2>Reading</h2>
          <p>{stats.attempts} attempts · {accuracy}%</p>
        </div>
        <label>
          Staff
          <select value={staff} onChange={(event) => setStaff(event.currentTarget.value as ReadingStaff)}>
            {READING_STAVES.map((staffName) => (
              <option key={staffName} value={staffName}>
                {staffName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={`reading-stage ${lastAnswer ?? ''}`}>
        <ReadingStaff prompt={prompt} />
      </div>

      <div className="reading-meta">
        <div>
          <span>Target</span>
          <strong>{lastAnswer ? midiToNoteName(prompt.midiPitch) : 'Play note'}</strong>
        </div>
        <div>
          <span>Recent misses</span>
          <strong>{stats.recentMisses[0] ?? 'None'}</strong>
        </div>
      </div>
    </section>
  )
}

function ReadingStaff({ prompt }: { prompt: ReadingPrompt }) {
  const position = noteStaffPosition(prompt.midiPitch)
  const trebleVisible = prompt.staff !== 'bass' || position.staff === 'treble'
  const bassVisible = prompt.staff !== 'treble' || position.staff === 'bass'
  const trebleY = position.staff === 'treble' ? position.y : -100
  const bassY = position.staff === 'bass' ? position.y + 108 : -100

  return (
    <svg viewBox="0 0 560 260" role="img" aria-label="Reading prompt">
      {trebleVisible && <StaffLines top={34} />}
      {bassVisible && <StaffLines top={142} />}
      {prompt.staff === 'grand' && <path d="M80 38 C40 80 40 180 80 222" className="brace" />}
      {trebleVisible && <text x="108" y="88" className="clef">𝄞</text>}
      {bassVisible && <text x="112" y="188" className="clef bass">𝄢</text>}
      <ellipse
        cx="310"
        cy={position.staff === 'treble' ? trebleY : bassY}
        rx="20"
        ry="13"
        transform={`rotate(-18 310 ${position.staff === 'treble' ? trebleY : bassY})`}
        className="reading-note"
      />
    </svg>
  )
}

function StaffLines({ top }: { top: number }) {
  return (
    <g className="staff-lines">
      {[0, 1, 2, 3, 4].map((line) => (
        <line key={line} x1="96" x2="500" y1={top + line * 12} y2={top + line * 12} />
      ))}
    </g>
  )
}

function readStats(): ReadingStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...EMPTY_STATS, ...JSON.parse(raw) } : EMPTY_STATS
  } catch {
    return EMPTY_STATS
  }
}
