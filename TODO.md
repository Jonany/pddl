# TODO


## Improve config experience

Libraries to try:
- https://www.npmjs.com/package/yargs
- https://www.npmjs.com/package/commander
- https://www.npmjs.com/package/rc
- https://www.npmjs.com/package/config-lite
- https://www.npmjs.com/package/convict


## Improve download speeds

[aria2c](https://aria2.github.io/manual/en/html/aria2c.html#options) looks like a really good option. It can use in input file with custom output names, do concurrent downloads, resume stopped downloads, and a bunch of other things. This will likely complicate the archiving process but there is an event hook for "download completed" that you can pass a command to. I could compile the archive step into a separate binary that it can call.