
export enum LogType {
  CLF_HTTP
}

export interface FormatedHTTPLog {
  host: string
  date: Date
  path: string
  method: string
  status: number
  size: number
  referer?: string
  userAgent?: string
}

export type FormatedLog = FormatedHTTPLog

export interface LogParser {
  parse (line: string, type: LogType.CLF_HTTP): Promise<FormatedHTTPLog | null>
}
