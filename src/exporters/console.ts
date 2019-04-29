
import {Exporter} from '../types/exporter'
import {Event, EventResult} from '../types/events'
import {EventType} from '../types/server'
import * as blessed from 'blessed'
import * as contrib from 'blessed-contrib'

export class ConsoleExporter implements Exporter {
  public buffer: Event[] = []
  private screen: blessed.Widgets.Screen

  constructor() {
    
  }

  async ingest(event: Event, type: EventType) {
    if (type !== EventType.ALERT) return EventResult.RECORDED
    console.log(type, event)
    return EventResult.RECORDED
  }
}