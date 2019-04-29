import { ListenerOptions, Listener } from "../types/listener"
import { Server, EventType } from "../types/server"
import { FSWatcher, watch, promises } from "fs"
import {EventResult, EventLog} from "../types/events"

export interface FileListenerOptions extends ListenerOptions {
  path: string
  readAllOnStart?: boolean
}

export interface WatchedPath {
  watcher: FSWatcher,
  /**
   * We will maintain our own offset of how much bytes we already read
   * in the file, it's possible to do that with the fileHandle
   * but in the future it might be easier to be able to know that
   */
  offset: number,
  handle: promises.FileHandle,
  options: FileListenerOptions
}

export class FileListener implements Listener {

  public name: 'file'

  /**
   * Define how much data we will read when a file change
   */
  private BUFFER_SIZE = 2048

  private server: Server
  /**
   * Store all the paths and their corresponding metadata
   */
  private paths: Map<string, WatchedPath> = new Map()

  constructor (server: Server) {
    this.server = server
    this.server.logger.info('enabling file listener')
  }

  async disable () {
    this.server.logger.info('disabling file listener')
    for (let [ path, meta ] of this.paths) {
      meta.watcher.close()
      meta.handle.close()
    }
  }

  getOnChange (filepath: string) {
    const listener = this
    return async function (type: string) {
      if (type !== 'change') return
      const watchedPath = listener.paths.get(filepath)
      if (watchedPath === undefined) return

      listener.server.logger.debug(`Receveid change event for path ${filepath}`)

      let data = ''
      let { handle, offset } = watchedPath
      const maxSize = listener.BUFFER_SIZE
      try {
        const buf = Buffer.alloc(maxSize)
        let tmp: { bytesRead: number, buffer: Buffer }
        /**
         * We don't know before reading how much bytes we'll need to read.
         * It will read {BUFFER_SIZE} bytes, if it was enough we can stop there.
         */
        while ((tmp = (await handle.read(buf, 0, maxSize, offset))).bytesRead > 0) {
          offset += tmp.bytesRead
          watchedPath.offset = offset
          data += buf.slice(0, tmp.bytesRead).toString()
        }
        watchedPath.offset = offset
        listener.server.logger.debug(`Read ${data.length} new bytes from path ${filepath}`)
        
        const lines = data.split('\n').filter(line => line.length > 0)
        // we will send each line independently for parsing
        for (let line of lines) {
          const event = {
            line,
            source: listener,
            filepath: filepath,
            timestamp: new Date(),
            result: EventResult.UNKNOWN
          } as EventLog
          listener.server.onEvent(event, EventType.RAW_LOG)
        }
      } catch (err) {
        return listener.server.logger.error(`Error while tailing (${filepath}): `, err)
      }
    }
  }

  async watch (options: FileListenerOptions) {
    if (typeof options.path !== 'string') {
      return this.server.logger.error(`Invalid path given to FileConsumer: `, options.path)
    }

    try {
      // get the current offset by reading the size of the file
      let offset = 0
      if (!options.readAllOnStart) {
        const stat = await promises.stat(options.path)
        offset = stat.size
      }
      // open a access to read the file
      const handle = await promises.open(options.path, 'r')
      // create the watcher for changes
      const watcher = watch(options.path, this.getOnChange(options.path))

      const watchedPath = {
        offset,
        watcher,
        handle,
        options
      } as WatchedPath
      this.paths.set(options.path, watchedPath)
      this.server.logger.info(`Now watching for new content on file ${options.path}`)
    } catch (err) {
      this.server.logger.error(`Failed to initialize watching file ${options.path}`, err)
    }
  }
}