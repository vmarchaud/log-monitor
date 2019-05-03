
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
  // widgets for raw logs and alerts
  private alertBox: blessed.Widgets.ListElement
  private logBox: blessed.Widgets.ListElement
  // specific widgets for metrics
  private logVolume: blessedContrib.Widgets.GaugeElement
  private statusBars: blessedContrib.Widgets.BarElement
  private methodBars: blessedContrib.Widgets.BarElement
  private sectionsBars: blessedContrib.Widgets.BarElement
  // Data for widgets
  private statusCodeCounts: [ number, number, number, number ] = [ 0, 0, 0, 0 ]
  private logVolumeValue: number = 0
  private volumeAlert: Alert
  private volumeAlertName = 'log volume'
  private followAlerts = true
  private alertsConfig: Alert[]
  private methodCounts: [ number, number, number, number, number ] = [ 0, 0, 0, 0, 0 ]
  private sectionStats: Map<string, number> = new Map()

  constructor (server: Server) {
    this.server = server
    this.alertsConfig = this.server.load(ConfigType.ALERTS) as Alert[]
    const alert = this.alertsConfig.find(alert => alert.metric === this.volumeAlertName)
    if (alert === undefined) {
      throw new Error(`Cannot find alert for log volume`)
    }
    this.volumeAlert = alert
    this.screen = blessed.screen({
      fastCSR: true
    })
    this.screen.title = 'Monitor Log Dashboard'
    this.logBox = blessedContrib.log({
      label: 'Logs',
      width: '70%',
      height: '70%',
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
      },
      tags: true,
      style: {
        selected: {
          bg: 'blue',
          fg: 'white'
        }
      },
      alwaysScroll: true,
      scrollbar: {
        ch: ' ',
        style: {
          fg: 'blue'
        }
      }
    })
    this.logVolume = blessedContrib.gauge({
      label: 'Log volume',
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
    this.methodBars = blessedContrib.bar({
      label: 'Method Distribution',
      left: '70%',
      width: '30%',
      top: '50%',
      height: '25%',
      border: {
        type: 'line',
        fg: 4
      },
      barWidth: 4,
      barSpacing: 4,
      maxHeight: 9
    })
    this.sectionsBars = blessedContrib.bar({
      label: 'Most hit sections',
      left: '70%',
      width: '30%',
      top: '75%',
      height: '25%',
      border: {
        type: 'line',
        fg: 6
      },
      barWidth: 4,
      barSpacing: 4,
      maxHeight: 9
    })
    this.alertBox.focus()
    this.screen.append(this.alertBox)
    this.screen.append(this.logBox)
    this.screen.append(this.statusBars)
    this.screen.append(this.logVolume)
    this.screen.append(this.sectionsBars)
    this.screen.append(this.methodBars)
    this.screen.render()

    this.screen.key(['escape', 'q', 'C-c'], _ => {
      this.screen.destroy()
      return process.exit(0)
    })

    this.screen.key(['up', 'down'], (_, key) => {
      this.followAlerts = false
      if (key.name === 'up') {
        this.alertBox.up(1)
      } else {
        this.alertBox.down(1)
      }
    })

    // async refresh of the ui
    setInterval(() => {
      this.statusBars.setData({
        titles: [ '2XX', '3XX', '4XX', '5XX' ],
        data: this.statusCodeCounts
      })
      const percent = parseInt(((this.logVolumeValue / this.volumeAlert.threshold.value * 100).toFixed(2)), 10)
      this.logVolume.setPercent(percent)
      this.logBox.setScrollPerc(100)
      // compute the 5 highest section by hit count
      const mostHitsEntries = [...this.sectionStats].sort((a, b) => {
        return b[1] - a[1]
      }).slice(0, 4)
      this.sectionsBars.setData({
        titles: mostHitsEntries.map(entry => entry[0]),
        data: mostHitsEntries.map(entry => entry[1])
      })
      if (this.followAlerts === true) {
        this.alertBox.setScrollPerc(100)
      }
      this.methodBars.setData({
        titles: [ 'GET', 'POST', 'PUT', 'OPTS', 'DLET'],
        data: this.methodCounts
      })
      this.screen.render()
    }, 200)
  }

  async ingest (event: AnyEvent, type: EventType) {
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
        this.logVolumeValue = event.metric.value === undefined ? 0 : event.metric.value
        break
      }
      case EventType.FORMATED_LOG: {
        event = event as FormatedEventLog
        const parsed = event.log
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

        const sections = parsed.path.split('/')
        const section = sections.length > 1 ? sections[1] : undefined
        if (typeof section === 'string' && section.length > 0) {
          let hitCount = this.sectionStats.get(section) || 0
          this.sectionStats.set(section, hitCount + 1)
        }

        if (parsed.method === 'GET') {
          this.methodCounts[0] += 1
        } else if (parsed.method === 'POST') {
          this.methodCounts[1] += 1
        } else if (parsed.method === 'PUT') {
          this.methodCounts[2] += 1
        } else if (parsed.method === 'OPTIONS') {
          this.methodCounts[3] += 1
        } else if (parsed.method === 'DELETE') {
          this.methodCounts[4] += 1
        }
      }
    }
    return EventResult.RECORDED
  }

  private formatTimestamp (date: Date): string {
    return date.toLocaleString()
  }
}
