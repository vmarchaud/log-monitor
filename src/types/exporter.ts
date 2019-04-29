import { Event, EventResult } from "./events"
import { EventType } from "./server"

export interface Exporter {
  buffer: Event[]

  ingest (event: Event, type: EventType): Promise<EventResult>
}