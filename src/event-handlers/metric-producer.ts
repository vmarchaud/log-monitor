import { EventHandler, EventResult, EventLog, MetricEvent } from '../types/events'
import { Server, EventType, ConfigType, ServerConfig } from '../types/server'
import { Metric, MetricType, getMetricConstructor } from '../types/metric'
import { ListenerConfigEntry } from '../types/listener'
import { FileListenerOptions } from '../listeners/file-listener'

interface InternalMetric extends Metric {
  instance: any
  value: number
}

export class MetricProducer implements EventHandler {

  private server: Server
  private metrics: Map<string, InternalMetric> = new Map()
  private listenersConfig: ListenerConfigEntry[]
  private config: ServerConfig
  private emitMetricsInterval: NodeJS.Timer

  constructor (server: Server) {
    this.server = server
    this.listenersConfig = this.server.load(ConfigType.LISTENERS) as ListenerConfigEntry[]
    this.config = this.server.load(ConfigType.SERVER) as ServerConfig
    this.emitMetricsInterval = setInterval(this.emitMetrics.bind(this), this.config.produceMetricInternal)
    this.server.logger.debug(`Metric Producer listening for new event`)
  }

  async onEvent (data: EventLog, type: EventType) {
    if (type !== EventType.RAW_LOG) return EventResult.ACK

    // find the configuration of the listener to know if we need to compute a metric
    // from the event
    const config = this.listenersConfig
      .filter(listenerConfig => listenerConfig.listener === 'file')
      .find((listenerConfig) => {
        const options = listenerConfig.options as FileListenerOptions
        return options.path === data.filepath
      })
    if (config === undefined || config.options.metric === undefined) {
      return EventResult.ACK
    }
    let metric = this.metrics.get(config.options.metric.name)
    if (metric === undefined) {
      this.server.logger.debug(`Found listener entry '${data.source.name}' that produce metric ${config.options.metric}, creating`)
      const Constructor = getMetricConstructor(config.options.metric.type)
      metric = {
        instance: new Constructor(),
        ...config.options.metric
      } as InternalMetric
      this.metrics.set(config.options.metric.name, metric)
    }

    this.server.logger.debug(`Updating metric ${config.options.metric.name} with new event`)
    switch (metric.type) {
      case MetricType.METER: {
        metric.instance.mark()
        break
      }
    }

    return EventResult.ACK
  }

  async emitMetrics () {
    if (this.metrics.size > 0) {
      this.server.logger.debug(`Metric Producer is going to emit ${this.metrics.size} metrics`)
    }
    for (let metric of this.metrics.values()) {

      let value = NaN
      switch (metric.type) {
        case MetricType.METER: {
          value = metric.instance.toJSON().currentRate
          break
        }
        default: {
          // if cannot find a correct value, we ignore the metric
          continue
        }
      }
      const event = {
        timestamp: new Date(),
        metric: {
          name: metric.name,
          type: metric.type,
          value,
          unit: metric.unit
        }
      } as MetricEvent
      this.server.onEvent(event, EventType.METRIC).then().catch()
    }
  }
}
