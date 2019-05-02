
import { ServerMonitor } from './server'
import {ServerConfig} from './types/server';
import * as exporters from './exporters'

const [
  bin,
  filename,
  exporter
] = process.argv

const availablesExporters = Object.keys(exporters)

if (availablesExporters.includes(exporter) === false) {
  console.error(`You need to specify the exporter to use, available:`, availablesExporters)
  process.exit(1)
}

const config = {
  logLevel: process.argv.includes('--debug') ? 'debug' : 'silent',
  exporter: exporter
} as ServerConfig

// run the server
new ServerMonitor(config)