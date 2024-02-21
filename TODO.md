# TODO


## Improve config experience

Libraries to try:
- https://www.npmjs.com/package/yargs
- https://www.npmjs.com/package/commander
- https://www.npmjs.com/package/rc
- https://www.npmjs.com/package/config-lite
- https://www.npmjs.com/package/convict


## Improve download speeds

- Optimization testing: There is an initial lag for at least 30 seconds. Then it picks up to about 10 MiB/s and falls and rises to that level. The disk usage is bursty and the memory usage is ~300 MB  which makes me think it isn't flushing very often. Setting the highWaterMark didn't seem to help that. I'm considering pulling in a util like aria2c for this. aria2c not only seems faster but it also manages partial downloads.
- [aria2c](https://aria2.github.io/manual/en/html/aria2c.html#options) looks like a really good option. It can use in input file with custom output names, do concurrent downloads, resume stopped downloads, and a bunch of other things. This will likely complicate the archiving process but there is an event hook for "download completed" that you can pass a command to. I could compile the archive step into a separate binary that it can call.


## Miscellaneous

- Download podcast cover picture.
- Implement OPML import in TypeScript/Bun.
- Implement schedule loop.
- Implement adjustable logging.
- Consolidate CLI related side-effects to index. This should allow for easier handling of where logs/process are printed.
- Improve retry handling and error reporting for fetching feeds and episodes.
- Include metadata in feed item object so that it can be written to the audio file and or a separate metadata file.
- Include feed file index in feed item object to shorten find and replace operation time.
- Consider isolating all side effect code into separate functions to make testing easier.