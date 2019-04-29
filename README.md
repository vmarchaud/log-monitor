
concepts:

 a event is immutable after created, if formated is needed then it will need 2 packet

possible amelioration:

- avoid use fs.watch that might not reliable: https://nodejs.org/dist/latest-v10.x/docs/api/fs.html#fs_availability
- alert producer doesnt have a time-limited bucket, it just assume one point is emited per second
- support multiple alerts per metric
- refactor cooldown logic to be simpler
- alerting: edge case possible where a metric is cooled down AND above threshold depending on both timerange