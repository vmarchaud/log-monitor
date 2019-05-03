
import { AlertProducer } from "../alert-producer";
import { Alert, AlertOperator } from "../../types/alert"
import * as assert from 'assert'
import { MetricEvent, EventResult, EventLog, AlertEvent } from "../../types/events"
import { MetricType } from "../../types/metric"
import { EventType, Server } from "../../types/server"
import { ConsoleLogger } from "../../loggers/console-logger"

const ServerMock = {
  load: type => {
    return [] as Alert[]
  },
  logger: new ConsoleLogger('debug'),
  async onEvent () {
    return
  }
} as Server

describe('Alert Producer Spec', () => {
  let alertProducer: AlertProducer

  it('should instanciate alert producer', () => {
    alertProducer = new AlertProducer(ServerMock)
  })

  it('should ACK a metric', async () => {
    const event = {
      metric: {
        name: 'toto',
        unit: 'any',
        type: MetricType.METER,
        value: 0
      }
    } as MetricEvent
    const result = await alertProducer.onEvent(event, EventType.METRIC)
    assert(result === EventResult.ACK)
  })

  it('should ACK any other events', async () => {
    const event = {
      line: 'line',
      filepath: ''
    } as EventLog
    const result = await alertProducer.onEvent(event, EventType.RAW_LOG)
    assert(result === EventResult.ACK)
  })

  it('should register an alert', async () => {
    const originalLoad = ServerMock.load
    let loaded: boolean = false
    ServerMock.load = () => {
      loaded = true
      return [
        {
          name: 'test alert',
          metric: 'test metric',
          threshold: {
            value: 2,
            timerange: 3,
            operator: AlertOperator.GREATER
          },
          cooldown: {
            timerange: 3
          }
        }
      ] as Alert[]
    }
    alertProducer = new AlertProducer(ServerMock)
    // @ts-ignore
    // forced to ignore the warning, ts doesn't see that the loaded variable
    // can be true at some point
    assert(loaded === true, 'should have loaded our custom alert')
    ServerMock.load = originalLoad
  })

  it('should store values for the alert', async () => {
    const event = {
      metric: {
        name: 'test metric',
        unit: 'any',
        type: MetricType.METER,
        value: 0
      }
    } as MetricEvent
    const result = await alertProducer.onEvent(event, EventType.METRIC)
    assert(result === EventResult.ACK, 'should have ack the metric')
    // @ts-ignore
    // accessing a private property
    const buckets = alertProducer.alertsBuckets
    let bucket = buckets.get('test metric')
    assert(bucket !== undefined, 'should have stored the metric')
    // force the type because ts doesnt handle assertions
    bucket = bucket as number[]
    assert(bucket.length === 1, 'should have stored a value')
    const value = bucket[0]
    assert(value === 0, 'should have stored the correct value')
  })

  it('should not trigger any alert', (done) => {
    const originalOnEvent = ServerMock.onEvent
    ServerMock.onEvent = async (event: AlertEvent, type: EventType) => {
      return done(new Error('should not receive any alert event'))
    }
    let event = {
      metric: {
        name: 'test metric',
        unit: 'any',
        type: MetricType.METER,
        value: 1
      }
    } as MetricEvent
    // send some event
    for (let i = 0; i < 5; i++) {
      alertProducer.onEvent(event, EventType.METRIC)
    }
    setTimeout(_ => {
      ServerMock.onEvent = originalOnEvent
      return done()
    }, 200)
  })

  it('should trigger an above threshold alert', (done) => {
    const originalOnEvent = ServerMock.onEvent
    ServerMock.onEvent = async (event: AlertEvent, type: EventType) => {
      assert(type === EventType.ALERT, 'should be an alert event')
      assert(event.active === true, 'alert should be active')
      // avg should be (5 + 1 + 1) / 3
      assert(event.value === (5 + 1 + 1) / 3)
      assert(event.value > event.alert.threshold.value)
      ServerMock.onEvent = originalOnEvent
      return done()
    }
    let event = {
      metric: {
        name: 'test metric',
        unit: 'any',
        type: MetricType.METER,
        value: 5
      }
    } as MetricEvent
    alertProducer.onEvent(event, EventType.METRIC)
  })

  it('should not trigger any alert because avg is still above threshold', (done) => {
    const originalOnEvent = ServerMock.onEvent
    ServerMock.onEvent = async (event: AlertEvent, type: EventType) => {
      return done(new Error('should not receive any alert event'))
    }
    let event = {
      metric: {
        name: 'test metric',
        unit: 'any',
        type: MetricType.METER,
        value: 5
      }
    } as MetricEvent
    // send some event
    alertProducer.onEvent(event, EventType.METRIC)
    setTimeout(_ => {
      ServerMock.onEvent = originalOnEvent
      return done()
    }, 200)
  })

  it('should trigger an inactive alert', (done) => {
    const originalOnEvent = ServerMock.onEvent
    ServerMock.onEvent = async (event: AlertEvent, type: EventType) => {
      assert(type === EventType.ALERT, 'should be an alert event')
      assert(event.active === false, 'alert should be inactive')
      // avg should be (5 + 0 + 0) / 3
      assert(event.value === (5 + 0 + 0) / 3)
      assert(event.value < event.alert.threshold.value)
      ServerMock.onEvent = originalOnEvent
      return done()
    }
    let event = {
      metric: {
        name: 'test metric',
        unit: 'any',
        type: MetricType.METER,
        value: 0
      }
    } as MetricEvent
    alertProducer.onEvent(event, EventType.METRIC)
    alertProducer.onEvent(event, EventType.METRIC)
  })

  it('should not trigger any alert because avg is still under threshold', (done) => {
    const originalOnEvent = ServerMock.onEvent
    ServerMock.onEvent = async (event: AlertEvent, type: EventType) => {
      return done(new Error('should not receive any alert event'))
    }
    let event = {
      metric: {
        name: 'test metric',
        unit: 'any',
        type: MetricType.METER,
        value: 0
      }
    } as MetricEvent
    // send some event
    alertProducer.onEvent(event, EventType.METRIC)
    setTimeout(_ => {
      ServerMock.onEvent = originalOnEvent
      return done()
    }, 200)
  })

  it('should trigger an above threshold alert again', (done) => {
    const originalOnEvent = ServerMock.onEvent
    ServerMock.onEvent = async (event: AlertEvent, type: EventType) => {
      assert(type === EventType.ALERT, 'should be an alert event')
      assert(event.active === true, 'alert should be active')
      // avg should be (5 + 5 + 0) / 3
      assert(event.value === (5 + 5 + 0) / 3)
      assert(event.value > event.alert.threshold.value)
      ServerMock.onEvent = originalOnEvent
      return done()
    }
    let event = {
      metric: {
        name: 'test metric',
        unit: 'any',
        type: MetricType.METER,
        value: 5
      }
    } as MetricEvent
    alertProducer.onEvent(event, EventType.METRIC)
    alertProducer.onEvent(event, EventType.METRIC)
  })
})