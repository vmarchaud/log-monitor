
import { Exporter } from '../types/exporter'
import { EventResult, AlertEvent, AnyEvent, FormatedEventLog, MetricEvent, EventLog } from '../types/events'
import { EventType, Server, ConfigType } from '../types/server'
import { OppositeOperator, Alert } from '../types/alert'
import * as blessedContrib from 'blessed-contrib'
import * as blessed from 'blessed'
import { FormatedHTTPLog } from '../types/log-parser'


export class CLIExporter implements Exporter {

  private server: Server

  private screen: blessed.Widgets.Screen
  private alertBox: blessed.Widgets.ListElement
  private logBox: blessed.Widgets.ListElement
  // specific widgets for metrics
  private logVolume: blessedContrib.Widgets.GaugeElement
  private statusBars: blessedContrib.Widgets.BarElement
  // Data for widgets
  private statusCodeCounts: [ number, number, number, number ] = [ 0, 0, 0, 0 ]
  private logVolumeValue: number = 0
  private volumeAlert: Alert
  private volumeAlertName = 'log volume'

  private alertsConfig: Alert[]

  constructor (server: Server) {
    this.server = server
    this.alertsConfig = server.load(ConfigType.ALERTS) as Alert[]
    const alert = this.alertsConfig.find(alert => alert.metric === this.volumeAlertName)
    if (alert === undefined) {
      throw new Error(`Cannot find alert for log volume`)
    }
    this.volumeAlert = alert
    this.screen = blessed.screen({
      fastCSR: true
    })
    this.screen.title = 'Monitor Log Dashboard';
    this.logBox = blessedContrib.log({
      label: 'Logs',
      width: '70%',
      height: '80%',
      border: {
        type: 'line',
        fg: 1
      }
    })
    this.alertBox = blessed.list({
      label: 'Alerts',
      top: '70%',
      width: '70%',
      height: '30%',
      scrollable: true,
      border: {
        type: 'line',
        fg: 2
      }
    })
    this.logVolume = blessedContrib.gauge({
      label: 'Log volume Alert',
      left: '70%',
      width: '30%',
      height: '25%',
      stroke: 'green',
      fill: 'white',
      border: {
        type: 'line',
        fg: 3
      },
      percent: [ this.logVolumeValue ]
    })
    this.statusBars = blessedContrib.bar({
      label: 'Status Code Distribution',
      left: '70%',
      width: '30%',
      top: '25%',
      height: '25%',
      border: {
        type: 'line',
        fg: 4
      },
      barWidth: 4,
      barSpacing: 4,
      maxHeight: 9
    })
    this.screen.append(this.logBox)
    this.screen.append(this.alertBox)
    this.screen.append(this.statusBars)
    this.screen.append(this.logVolume)
    this.alertBox.focus()
    this.screen.render()

    this.screen.key(['escape', 'q', 'C-c'], _ => {
      this.screen.destroy()
      return process.exit(0)
    })

  
    // async refresh of the ui
    setInterval(() => {
      this.statusBars.setData({
        titles: [ '2XX', '3XX', '4XX', '5XX' ],
        data: this.statusCodeCounts
      })
      const percent = parseInt(((this.logVolumeValue / this.volumeAlert.threshold.value * 100).toFixed(2)), 10)
      this.logVolume.setPercent(percent)
      this.screen.render()
      this.logBox.setScrollPerc(100)
    }, 200);
  }

  async ingest(event: AnyEvent, type: EventType) {
    switch (type) {
      case EventType.ALERT: {
        event = event as AlertEvent
        const activeThreshold = `has been ${event.alert.threshold.operator} ${event.alert.threshold.value} for ${event.alert.threshold.timerange}sec`
        const oppositeOperator = OppositeOperator[event.alert.threshold.operator]
        const cooldownTrehsold = `has been ${oppositeOperator} ${event.alert.threshold.value} for ${event.alert.cooldown.timerange}sec`
        this.alertBox.add(`[${this.formatTimestamp(event.timestamp)}] Alert ${event.alert.name} is now ${event.active ? 'active' : 'inactive'}: value (${event.value.toFixed(1)}) ${event.active ? activeThreshold : cooldownTrehsold}`)
        break
      }
      case EventType.RAW_LOG: {
        event = event as EventLog
        this.logBox.add(`[${this.formatTimestamp(event.timestamp)}] ${event.line}`)
        break
      }
      case EventType.METRIC: {
        event = event as MetricEvent
        if (event.metric.name !== this.volumeAlertName) break
        this.logVolumeValue = event.metric.value  === undefined ? 0 : event.metric.value
        break
      }
      case EventType.FORMATED_LOG: {
        event = event as FormatedEventLog
        const parsed = event.log as FormatedHTTPLog
        // update status code data
        if (parsed.status >= 200 && parsed.status < 300) {
          this.statusCodeCounts[0] += 1
        } else if (parsed.status >= 300 && parsed.status < 400) {
          this.statusCodeCounts[1] += 1
        } else if (parsed.status >= 400 && parsed.status < 500) {
          this.statusCodeCounts[2] += 1
        } else if (parsed.status >= 500) {
          this.statusCodeCounts[3] += 1
        }
      }
    }
    return EventResult.RECORDED
  }

  private formatTimestamp (date: Date): string {
    return date.toLocaleString()
  }
}