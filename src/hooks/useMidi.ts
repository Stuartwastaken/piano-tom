import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MidiNoteEvent } from '../domain/types'

export interface MidiInputSummary {
  id: string
  name: string
  state: string
}

export interface MidiController {
  supported: boolean
  status: 'idle' | 'ready' | 'requesting' | 'denied' | 'unsupported'
  inputs: MidiInputSummary[]
  selectedInputId: string | null
  activePitches: number[]
  lastEvent: MidiNoteEvent | null
  requestAccess: () => Promise<void>
  selectInput: (inputId: string) => void
}

export function useMidi(): MidiController {
  const supported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator
  const [status, setStatus] = useState<MidiController['status']>(supported ? 'idle' : 'unsupported')
  const [access, setAccess] = useState<MIDIAccess | null>(null)
  const [inputs, setInputs] = useState<MidiInputSummary[]>([])
  const [selectedInputId, setSelectedInputId] = useState<string | null>(null)
  const [activePitches, setActivePitches] = useState<number[]>([])
  const [lastEvent, setLastEvent] = useState<MidiNoteEvent | null>(null)
  const selectedInputRef = useRef<MIDIInput | null>(null)

  const refreshInputs = useCallback((midiAccess: MIDIAccess) => {
    const nextInputs = Array.from(midiAccess.inputs.values()).map((input) => ({
      id: input.id,
      name: input.name || 'MIDI input',
      state: input.state,
    }))

    setInputs(nextInputs)
    setSelectedInputId((current) => current ?? nextInputs[0]?.id ?? null)
  }, [])

  const requestAccess = useCallback(async () => {
    if (!supported) {
      setStatus('unsupported')
      return
    }

    try {
      setStatus('requesting')
      const midiAccess = await navigator.requestMIDIAccess()
      midiAccess.onstatechange = () => refreshInputs(midiAccess)
      setAccess(midiAccess)
      refreshInputs(midiAccess)
      setStatus('ready')
    } catch {
      setStatus('denied')
    }
  }, [refreshInputs, supported])

  useEffect(() => {
    if (!access || !selectedInputId) {
      return undefined
    }

    const input = access.inputs.get(selectedInputId)
    if (!input) {
      return undefined
    }

    const handleMidiMessage = (message: MIDIMessageEvent) => {
      if (!message.data || message.data.length < 2) {
        return
      }

      const [statusByte, pitch, velocity = 0] = Array.from(message.data)
      const command = statusByte & 0xf0
      const isNoteOn = command === 0x90 && velocity > 0
      const isNoteOff = command === 0x80 || (command === 0x90 && velocity === 0)

      if (!isNoteOn && !isNoteOff) {
        return
      }

      const midiEvent: MidiNoteEvent = {
        pitch,
        velocity,
        timestamp: message.timeStamp,
        type: isNoteOn ? 'noteon' : 'noteoff',
        sourceId: input.id,
      }

      setLastEvent(midiEvent)
      setActivePitches((current) => {
        const next = new Set(current)
        if (midiEvent.type === 'noteon') {
          next.add(pitch)
        } else {
          next.delete(pitch)
        }

        return Array.from(next).sort((a, b) => a - b)
      })
    }

    if (selectedInputRef.current && selectedInputRef.current !== input) {
      selectedInputRef.current.onmidimessage = null
    }

    input.onmidimessage = handleMidiMessage
    selectedInputRef.current = input

    return () => {
      input.onmidimessage = null
    }
  }, [access, selectedInputId])

  const selectInput = useCallback((inputId: string) => {
    setSelectedInputId(inputId)
  }, [])

  return useMemo(
    () => ({
      supported,
      status,
      inputs,
      selectedInputId,
      activePitches,
      lastEvent,
      requestAccess,
      selectInput,
    }),
    [activePitches, inputs, lastEvent, requestAccess, selectInput, selectedInputId, status, supported],
  )
}
