import { Cable, CircleAlert } from 'lucide-react'
import type { MidiController } from '../hooks/useMidi'

interface MidiPanelProps {
  midi: MidiController
}

export function MidiPanel({ midi }: MidiPanelProps) {
  if (!midi.supported) {
    return (
      <div className="midi-panel unavailable">
        <CircleAlert aria-hidden="true" />
        <span>MIDI unavailable</span>
      </div>
    )
  }

  return (
    <div className="midi-panel">
      <Cable aria-hidden="true" />
      {midi.status === 'ready' ? (
        <select
          value={midi.selectedInputId ?? ''}
          onChange={(event) => midi.selectInput(event.currentTarget.value)}
          aria-label="MIDI input"
        >
          {midi.inputs.length === 0 && <option value="">No MIDI inputs</option>}
          {midi.inputs.map((input) => (
            <option key={input.id} value={input.id}>
              {input.name}
            </option>
          ))}
        </select>
      ) : (
        <button type="button" className="secondary-action" onClick={midi.requestAccess}>
          Connect MIDI
        </button>
      )}
      <div className={`status-dot ${midi.status}`} aria-label={`MIDI status ${midi.status}`} />
    </div>
  )
}
