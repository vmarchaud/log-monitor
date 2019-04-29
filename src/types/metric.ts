
import { Meter } from 'measured-core'

export enum MetricType {
  METER = 'meter'
}

export interface Metric {
  name: string
  unit: string
  value?: number
  type: MetricType
}

export const getMetricConstructor = (type: MetricType) => {
  switch (type) {
    case MetricType.METER: {
      return Meter
    }
  }
}