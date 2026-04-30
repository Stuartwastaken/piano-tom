import { describe, expect, it } from 'vitest'
import { generateScaleEvents } from './scales'

describe('generateScaleEvents', () => {
  it('generates a C major up-down scale for the right hand', () => {
    const events = generateScaleEvents({
      key: 'C',
      mode: 'major',
      octaves: 1,
      direction: 'up-down',
      hands: 'right',
    })

    expect(events.map((event) => event.label)).toEqual([
      'C4',
      'D4',
      'E4',
      'F4',
      'G4',
      'A4',
      'B4',
      'C5',
      'B4',
      'A4',
      'G4',
      'F4',
      'E4',
      'D4',
      'C4',
    ])
  })

  it('generates octave-separated chord prompts for both hands', () => {
    const events = generateScaleEvents({
      key: 'G',
      mode: 'minor',
      octaves: 1,
      direction: 'up',
      hands: 'both',
    })

    expect(events[0].expectedMidiPitches).toEqual([55, 67])
    expect(events[0].label).toBe('G3 + G4')
  })
})
