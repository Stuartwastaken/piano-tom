interface MIDIMessageEvent extends Event {
  readonly data: Uint8Array
  readonly timeStamp: number
}

interface MIDIPort {
  readonly id: string
  readonly name: string | null
  readonly state: string
}

interface MIDIInput extends MIDIPort {
  onmidimessage: ((event: MIDIMessageEvent) => void) | null
}

type MIDIInputMap = Map<string, MIDIInput>

interface MIDIConnectionEvent extends Event {
  readonly port: MIDIPort
}

interface MIDIAccess extends EventTarget {
  readonly inputs: MIDIInputMap
  onstatechange: ((event: MIDIConnectionEvent) => void) | null
}

interface Navigator {
  requestMIDIAccess(): Promise<MIDIAccess>
}
