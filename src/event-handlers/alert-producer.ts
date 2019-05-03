
import { EventHandler, EventResult, MetricEvent, AlertEvent, AnyEvent } from '../types/events'
import { Server, EventType, ConfigType } from '../types/server'
import { Alert, AlertOperator } from '../types/alert'

export class AlertProducer implements EventHandler {

  private server: Server
  private alertsConfig: Alert[] = []
  private alertsBuckets: Map<string, number[]> = new Map()
  /**
   * Store the current state of alert to know if the alert was previously active
   * False value correspond to inactive state (alert hasn't been triggered in the past)
   * True correspond to an active state (alert was previously triggered, must check cooldown)
   */
  private alertsState: Map<string, boolean> = new Map()

  constructor (server: Server) {
    this.server = server
    this.alertsConfig = this.server.load(ConfigType.ALERTS) as Alert[]
  }

  async onEvent (data: AnyEvent, type: EventType) {
    if (type !== EventType.METRIC) return EventResult.ACK
    data = data as MetricEvent
    if (data.metric.value === undefined) return EventResult.ACK

    // find the alert option for the given metric, otherwise ignore the event
    const options = this.alertsConfig.find(alertConfig => {
      return alertConfig.metric === (data as MetricEvent).metric.name
    })
    if (options === undefined) return EventResult.ACK
    let bucket = this.alertsBuckets.get(options.metric)
    if (bucket === undefined) {
      bucket = []
      this.alertsBuckets.set(options.metric, bucket)
    }
    // add newest value
    bucket.push(data.metric.value || 0)
    // trim values above timerange
    const maxTimerange = options.cooldown.timerange > options.threshold.timerange
      ? options.cooldown.timerange : options.threshold.timerange
    const maximumValues = maxTimerange || 1
    bucket.splice(0, bucket.length - maximumValues)

    // if a timerange is configured, we will check that there is enough data
    if (bucket.length < options.threshold.timerange) {
      return EventResult.ACK
    }
    // compute average value of the alert timerange
    const average = bucket.reduce((agg, value, index) => {
      if (index >= options.threshold.timerange) return agg
      agg += value
      return agg
    }, 0) / options.threshold.timerange
    // compute the average for the cooldown period if the alert is active
    const averageCooldown = bucket.reduce((agg, value, index) => {
      if (index >= options.cooldown.timerange) return agg
      agg += value
      return agg
    }, 0) / options.cooldown.timerange

    const isAboveThreshold = this.isAboveThreshold(options, average)
    const isCooledDown = this.isCooledDown(options, averageCooldown)
    const currentState = this.alertsState.get(options.name) || false

    // if the threshold is crossed and it wasn't the case before, send alert
    const isAboveTresholdAndInactive = isAboveThreshold === true && currentState === false
    // if the value is under the threshold and it was above before, send alert
    const isUnderTresholdAndIActive = isCooledDown === true && currentState === true

    if (isUnderTresholdAndIActive || isAboveTresholdAndInactive) {
      const reason = isUnderTresholdAndIActive ? 'cooled-down' : 'above-threshold'
      this.server.logger.info(`Alert ${options.name} on metric ${options.metric}, new state: ${!currentState} because ${reason}`)
      const event = {
        timestamp: new Date(),
        active: !currentState,
        alert: options,
        value: average
      } as AlertEvent
      this.server.onEvent(event, EventType.ALERT).then().catch()
      this.alertsState.set(options.name, !currentState)
    }

    return EventResult.ACK
  }

  isAboveThreshold (options: Alert, average: number): boolean {
    switch (options.threshold.operator) {
      case AlertOperator.EQUAL: {
        return average === options.threshold.value
      }
      case AlertOperator.GREATER: {
        return average > options.threshold.value
      }
      case AlertOperator.LESS: {
        return average < options.threshold.value
      }
      case AlertOperator.NOT_EQUAL: {
        return average !== options.threshold.value
      }
    }
  }

  isCooledDown (options: Alert, average: number): boolean {
    switch (options.threshold.operator) {
      case AlertOperator.EQUAL: {
        return average !== options.threshold.value
      }
      case AlertOperator.GREATER: {
        return average < options.threshold.value
      }
      case AlertOperator.LESS: {
        return average > options.threshold.value
      }
      case AlertOperator.NOT_EQUAL: {
        return average === options.threshold.value
      }
    }
  }
}
