import { Metric } from "./metric"

export enum ListenerType {
  FILE = 'file'
}

export type ListenerConfigEntry = {
  listener: ListenerType,
  options: ListenerOptions
}

export interface ListenerOptions {
  metric?: Metric
}

export interface Listener {
  name: string

  disable (): void
  watch (options: ListenerOptions): Promise<void>
}