## how to use

#### docker

I've built an image with everything already built, you only need to run to see the UI:
```
docker run -it vmarchaud/log-monitor cli
```

Note that you will of course need to expose configure it by sharing some paths:
- `/usr/src/app/build/config/alerts.json` is the file used configure alerts
- `/usr/src/app/build/config/listeners.json` is the file used to configure where to look for logs
- `/usr/src/app/build/config/alerts.json` is the file for common configuration like the logLevel

And of course you need to mount a file if you want to configure the server to read in a file.

#### re-build yourself

If you want to run it in development, i advise to directly use `ts-node` with `yarn dev` but one could still built it to get javascript output with `yarn build`, the entrypoint to run would be then in `build/entrypoint.js`.

## How it's working

I've implemented two different exporters:
- cli (the one that implement the instruction requirements)
- console (it will just output everything as log to stdout)

You can also give the `--debug` flag that will toggle more information about the inner working of the server. Note that you should not run the `cli` exporter with the debug flag.
If you want to run the unit tests, you can use `yarn test`.

## Implementation details


#### Concepts:

- a event is immutable after created, the only way to mutate it is to emit a new event
- an event handler:
  - is a service that receive new event and do what he want with it
  - it can stop the packet from being broadcasted to an exporter
  - should not mutate an event
- listeners:
  - is a service that get data from a specific place and generate event from that
- exporters:
  - is a service that take all the data from the server and do something with it, either by putting on a screen or sending it to a remote endpoint

The server is a central "bus" that dispatch new event to configured event handlers, if all event handlers are okay, the message is sent to the exporter.

#### Possible improvements:

- avoid use fs.watch that might not reliable: https://nodejs.org/dist/latest-v10.x/docs/api/fs.html#fs_availability
- alert producer doesnt have a time-limited bucket, it just assume one point is emited per second
- support multiple alerts per metric
- refactor cooldown logic to be simpler
- alerting: edge case possible where a metric is cooled down AND above threshold depending on both timerange
- add different kind of log parser
- be able to generate metrics from formatted log
- correctly handle shutdown of every listeners/handlers/exporters/parsers
- validate configuration format (only casted to typescript right now)

## Notes:

- the "cli" exporter has a lot of things hardcoded (name of metric for example) because it's only done for the purpose of the exercice, i didn't try to make it handle different metrics etc