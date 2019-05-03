
import * as util from 'util'
import * as logDriver from 'log-driver'
import { Logger, LoggerOptions } from '../types/logger'

export class ConsoleLogger implements Logger {

  private logger: typeof logDriver
  static LEVELS = ['silent', 'error', 'warn', 'info', 'debug']
  level?: string

  constructor (options?: LoggerOptions | string | number) {
    let opt: LoggerOptions = {}
    if (typeof options === 'number') {
      if (options < 0) {
        options = 0
      } else if (options > ConsoleLogger.LEVELS.length) {
        options = ConsoleLogger.LEVELS.length - 1
      }
      opt = { level: ConsoleLogger.LEVELS[options] }
    } else if (typeof options === 'string') {
      opt = { level: options }
    } else {
      opt = options || {}
    }
    if (opt.level) {
      this.level = opt.level
    }
    this.logger = logDriver({
      levels: ConsoleLogger.LEVELS,
      level: opt.level || 'debug'
    })
  }

  error (message: any, ...args: any[]): void {
    this.logger.error(util.format(message, ...args))
  }

  warn (message: any, ...args: any[]): void {
    this.logger.warn(util.format(message, ...args))
  }

  info (message: any, ...args: any[]): void {
    this.logger.info(util.format(message, ...args))
  }

  debug (message: any, ...args: any[]): void {
    this.logger.debug(util.format(message, ...args))
  }
}
