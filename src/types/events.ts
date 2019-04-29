import { Listener } from './listener'
import { EventType } from './server'
import { FormatedLog } from './log-parser'
import { Alert } from './alert'
import { Metric } from './metric'

export interface Event {
  timestamp: Date
  result: EventResult
}

export interface EventLog extends Event {
  source: Listener
  line: string
  filepath: string,
  metric?: Metric
}

export interface FormatedEventLog extends Event {
  source: Listener
  log: FormatedLog,
  filepath: string
}

export interface MetricEvent extends Event {
  metric: Metric
}

export interface AlertEvent extends Event {
  alert: Alert
  active: boolean
  value: number
}

export type AnyEvent = EventLog | MetricEvent | FormatedEventLog | AlertEvent

export enum EventResult {
  UNKNOWN,
  ACK,
  RECORDED,
  INVALID
}

export interface EventHandler {
  onEvent (data: AnyEvent, type: EventType): Promise<EventResult>
}