
concepts:

- a event is immutable after created, the only way to mutate it is to emit a new event
- an event handler
  - is a service that receive new event and do what he want with it
  - it can stop the packet from being broadcasted to an exporter
  - should not mutate an event
- listeners
  - is a service that get data from a specific place and generate event from that

The server is a central "bus" that dispatch new event to configured event handlers, if all event handlers are okay, the message is sent to the exporter.

possible amelioration:

- avoid use fs.watch that might not reliable: https://nodejs.org/dist/latest-v10.x/docs/api/fs.html#fs_availability
- alert producer doesnt have a time-limited bucket, it just assume one point is emited per second
- support multiple alerts per metric
- refactor cooldown logic to be simpler
- alerting: edge case possible where a metric is cooled down AND above threshold depending on both timerange
- add different kind of log parser
- be able to generate metrics from formatted log
- correctly handle shutdown of every listeners/handlers/exporters/parsers


note:

- the "cli" exporter has a lot of things hardcoded (name of metric for example) because it's only done for the purpose of the exercice, i didn't try to make it handle different metrics etc