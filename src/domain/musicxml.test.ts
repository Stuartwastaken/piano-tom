import { describe, expect, it } from 'vitest'
import { CHORD_MUSICXML, SIMPLE_MUSICXML } from '../test/fixtures'
import { parseMusicXml } from './musicxml'

describe('parseMusicXml', () => {
  it('extracts playable note events and title from MusicXML', () => {
    const parsed = parseMusicXml(SIMPLE_MUSICXML)

    expect(parsed.title).toBe('Simple Scale')
    expect(parsed.events).toHaveLength(5)
    expect(parsed.events[0]).toMatchObject({
      measureNumber: '1',
      beat: 1,
      expectedMidiPitches: [60],
      label: 'C4',
    })
    expect(parsed.events[4]).toMatchObject({
      measureNumber: '2',
      beat: 1,
      expectedMidiPitches: [67],
      label: 'G4',
    })
  })

  it('groups MusicXML chord notes into a single practice event', () => {
    const parsed = parseMusicXml(CHORD_MUSICXML)

    expect(parsed.events).toHaveLength(1)
    expect(parsed.events[0].expectedMidiPitches).toEqual([60, 64, 67])
    expect(parsed.events[0].label).toBe('C4 + E4 + G4')
  })
})
