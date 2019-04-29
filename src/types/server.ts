import { AnyEvent, EventResult } from './events'
import { Logger } from './logger'
import { Alert } from './alert'
import { ListenerConfigEntry } from './listener'

export enum EventType {
  RAW_LOG = 'raw_log',
  FORMATED_LOG = 'formated_log',
  METRIC = 'metric',
  ALERT = 'alert'
}

export enum ConfigType {
  ALERTS,
  LISTENERS,
  SERVER
}

export enum ExporterType {
  CONSOLE = 'console'
}

export type ServerConfig = {
  logLevel?: number | string,
  exporter: string,
  produceMetricInternal: number
}

export interface Server {
  logger: Logger

  onEvent (data: AnyEvent, type: EventType): Promise<void>

  load (type: ConfigType): Alert[] | ListenerConfigEntry[] | ServerConfig
}