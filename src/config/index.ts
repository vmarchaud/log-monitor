
import * as rawAlerts from './alerts.json'
import * as serverConfig from './server.json'
import * as rawListeners from './listeners.json'

import { Alert } from '../types/alert.js'
import { ServerConfig } from '../types/server.js'
import { ListenerConfigEntry } from '../types/listener.js'

export const alerts = rawAlerts as Alert[]
export const config = serverConfig as ServerConfig
export const listeners = rawListeners as ListenerConfigEntry[]
