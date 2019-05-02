
import { Exporter } from '../types/exporter'
import { EventResult, AlertEvent, AnyEvent, FormatedEventLog, MetricEvent } from '../types/events'
import { EventType } from '../types/server'
import { OppositeOperator } from '../types/alert'

export class ConsoleExporter implements Exporter {

  async ingest(event: AnyEvent, type: EventType) {
    switch (type) {
      case EventType.ALERT: {
        event = event as AlertEvent
        const activeThreshold = `has been ${event.alert.threshold.operator} ${event.alert.threshold.value} for ${event.alert.threshold.timerange}sec`
        const oppositeOperator = OppositeOperator[event.alert.threshold.operator]
        const cooldownTrehsold = `has been ${oppositeOperator} ${event.alert.threshold.value} for ${event.alert.cooldown.timerange}sec`
        console.log(`[${this.formatTimestamp(event.timestamp)}] Alert ${event.alert.name} is now ${event.active ? 'active' : 'inactive'}: value (${event.value.toFixed(1)}) ${event.active ? activeThreshold : cooldownTrehsold}`)
        break
      }
      case EventType.FORMATED_LOG: {
        event = event as FormatedEventLog
        console.log(`[${this.formatTimestamp(event.timestamp)}] New formatted log from ${event.filepath}: ${JSON.stringify(event.log)}`)
        break
      }
      case EventType.METRIC: {
        event = event as MetricEvent
        console.log(`[${this.formatTimestamp(event.timestamp)}] Metric ${event.metric.name} is now equal ${event.metric.value}`)
        break
      }
    }
    return EventResult.RECORDED
  }

  private formatTimestamp (date: Date): string {
    return date.toLocaleString()
  }
}