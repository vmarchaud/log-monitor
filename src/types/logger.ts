
export type LogFunction = (message: any, ...args: any[]) => void

export interface Logger {
  level?: string

  error: LogFunction
  warn: LogFunction
  info: LogFunction
  debug: LogFunction
}

export interface LoggerOptions {
  level?: string
}
