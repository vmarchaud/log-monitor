
export enum AlertOperator {
  GREATER = '>',
  LESS = '<',
  EQUAL = '=',
  NOT_EQUAL = '!='
}

export const OppositeOperator = {
  '>': AlertOperator.LESS,
  '<': AlertOperator.GREATER,
  '=': AlertOperator.NOT_EQUAL,
  '!=': AlertOperator.EQUAL
}

export interface Alert {
  name: string
  metric: string
  threshold: {
    value: number
    operator: AlertOperator
    timerange: number
  }
  /**
   * After how much time we need to send another event
   * to tell that the past alert isn't active anymore
   */
  cooldown: {
    timerange: number
  }
}
