import { EventHandler, EventLog, EventResult } from '../types/events'
import { Server, EventType } from '../types/server'
import { LogParser, LogType } from '../types/log-parser'
import { CLFHttpParser } from '../log-parsers/clf-http'

export class LogEventHandler implements EventHandler {

  private server: Server
  private parser: LogParser

  constructor (server: Server) {
    this.server = server
    this.parser = new CLFHttpParser()
  }

  async onEvent (data: EventLog) {
    this.server.logger.debug('Handling new raw log event')
    const formatted = await this.parser.parse(data.line, LogType.CLF_HTTP)
    // fail to parse
    this.server.logger.debug('Failed to parse raw log event')
    if (formatted === null) return EventResult.INVALID
    const newEvent = {
      source: data.source,
      timestamp: data.timestamp,
      filepath: data.filepath,
      log: formatted,
      result: EventResult.ACK
    }
    this.server.logger.debug('Succesfully parsed raw log event, sending formated log event')
    this.server.onEvent(newEvent, EventType.FORMATED_LOG).then().catch()
    return EventResult.ACK
  }
}
