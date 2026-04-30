import { describe, expect, it } from 'vitest'
import { assessReadingAnswer, createReadingPrompt, nextReadingStats } from './reading'

describe('reading practice helpers', () => {
  it('creates natural-note prompts within the selected staff range', () => {
    const prompt = createReadingPrompt('treble', () => 0)

    expect(prompt.midiPitch).toBe(60)
    expect(prompt.staff).toBe('treble')
  })

  it('tracks correct attempts and recent misses', () => {
    const prompt = { id: 'p1', midiPitch: 60, staff: 'treble' as const }

    expect(assessReadingAnswer(prompt, 60)).toBe(true)

    const stats = nextReadingStats({ attempts: 0, correct: 0, recentMisses: [] }, prompt, 61)
    expect(stats.attempts).toBe(1)
    expect(stats.correct).toBe(0)
    expect(stats.recentMisses[0]).toBe('C4 played C#4')
  })
})
