import { Event, EventResult } from './events'
import { EventType } from './server'

export interface Exporter {
  ingest (event: Event, type: EventType): Promise<EventResult>
}
