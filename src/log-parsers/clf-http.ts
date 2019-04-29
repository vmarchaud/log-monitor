
import { LogParser, FormatedLog } from '../types/log-parser'
import * as moment from 'moment'

/**
 * Implement a simple parser that will read line produced in the CLF format
 * https://en.wikipedia.org/wiki/Common_Log_Format
 */
export class CLFHttpParser implements LogParser {

  private pattern = /^(\S+) (\S+) (\S+) \[([\w:/]+\s[+\-]\d{4})\] "(\S+)\s?(\S+)?\s?(\S+)?" (\d{3}|-) (\d+|-)/m

  async parse (line: string) {
    
    const result = this.pattern.exec(line)
    if (result === null) return null
    const [
      _line,
      remoteHost,
      _,
      authUser,
      date,
      method,
      path,
      protocol,
      status,
      size,
      referer,
      ua
    ] = result
    const formattedLog = {
      host: remoteHost,
      date: moment(date, 'D/MMM/YYYY:H:m:s Z').toDate(),
      path,
      method,
      status: parseInt(status, 10),
      size: parseInt(size, 10),
      referer,
      userAgent: ua
    } as FormatedLog
    return formattedLog
  }
}