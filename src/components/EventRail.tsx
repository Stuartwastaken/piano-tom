import type { PracticeEvent, PracticeResult } from '../domain/types'

interface EventRailProps {
  events: PracticeEvent[]
  activeIndex: number
  results: Record<string, PracticeResult>
}

export function EventRail({ events, activeIndex, results }: EventRailProps) {
  return (
    <div className="event-rail" aria-label="Practice events">
      {events.map((event, index) => {
        const result = results[event.id]
        const state = result?.status ?? (index === activeIndex ? 'active' : 'pending')

        return (
          <div
            key={event.id}
            className={`event-chip ${state}`}
            data-testid={`event-${index}`}
            aria-current={index === activeIndex ? 'step' : undefined}
          >
            <span>M{event.measureNumber}</span>
            <strong>{event.label}</strong>
          </div>
        )
      })}
    </div>
  )
}
