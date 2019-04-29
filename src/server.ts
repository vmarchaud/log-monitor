
import { Server, EventType, ConfigType, ServerConfig } from './types/server'
import { EventHandler, AnyEvent, EventResult } from './types/events'
import { LogEventHandler } from './event-handlers/log'
import { Listener, ListenerConfigEntry, ListenerType } from './types/listener'
import { ConsoleLogger } from './loggers/console-logger'
import { FileListener } from './listeners/file-listener'
import { Exporter } from './types/exporter'
import { alerts, listeners, config } from './config'
import { AlertProducer } from './event-handlers/alert-producer'
import { MetricProducer } from './event-handlers/metric-producer'
import * as exporters from './exporters'

export class ServerMonitor implements Server {

  private eventHandlers: Map<EventType, EventHandler[]> = new Map()
  /**
   * Store all enabled listeners to be able to disable them
   *  when we shutdown the server
   */
  private listeners: Map<ListenerType, Listener> = new Map()
  private exporter: Exporter

  private config: ServerConfig
  
  public logger = new ConsoleLogger(config.logLevel || 'debug')

  constructor () {
    this.logger.info(`Loading confing`)
    // create exporter
    if (exporters[config.exporter] === undefined) {
      throw new Error(`Undefined exporter configured: ${config.exporter}`)
    }
    const Exporter = exporters[config.exporter]
    this.exporter = new Exporter() as Exporter
    this.logger.info(`Loaded ${config.exporter} exporter`)

    this.logger.info('Registering event handlers')
    this.eventHandlers.set(EventType.RAW_LOG, [
      new LogEventHandler(this),
      new MetricProducer(this)
    ])
    this.eventHandlers.set(EventType.METRIC, [
      new AlertProducer(this)
    ])
    this.logger.info('Registering availables listeners')
    this.listeners.set(ListenerType.FILE, new FileListener(this))
    // load the listeners config
    this.logger.info('Loading listeners from config file')
    const listenersConfig = this.load(ConfigType.LISTENERS) as ListenerConfigEntry[]
    for (let listenerConfig of listenersConfig) {
      const listener = this.listeners.get(listenerConfig.listener)
      if (listener === undefined) {
        this.logger.error(`Failed to load alert with listener ${listenerConfig.listener}`)
        continue
      }
      listener.watch(listenerConfig.options)
    }
    this.logger.info(`Successfully loaded ${listenersConfig.length} listener config`)
    this.logger.info(`Server ready`)
  }

  async onEvent (data: AnyEvent, type: EventType) {
    this.logger.debug(`New root event ${type}`)

    let handlers = this.eventHandlers.get(type)
    if (handlers === undefined) handlers = []

    const results = await Promise.all(handlers.map(handler => {
      return handler.onEvent(data, type)
    }))
    // if all the downstreams handler have validated the packet, we can broadcast it
    if (results.every(result => result === EventResult.ACK)) {
      this.logger.debug(`Packet ${type} has been handled, broadcasting ...`)
      this.exporter.ingest(data, type)
    }
  }

  load (type: ConfigType) {
    switch (type) {
      case ConfigType.ALERTS: {
        return alerts
      }
      case ConfigType.LISTENERS: {
        return listeners
      }
      case ConfigType.SERVER: {
        return config
      }
    }
  }

}