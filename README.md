# pddl

A file-first podcast manager built with TypeScript and Bun/Node.js and designed for folks who like to manage and self-host the content they enjoy.


## Roadmap

- [x] Import an OPML feed of podcasts.
- [x] Download podcast feed and episodes.
- [x] Transcode episodes with FFMPEG.
- [x] Record (archive) list of downloaded episodes.
- [x] Update podcast feed file to point to local files.
- [x] Runs on Linux.
- [ ] Runs on Windows.
- [ ] Runs on OSX.
- [ ] Customizable folder names.
- [ ] Customizable file/episode names.
- [ ] Customizable log levels.


## Running

Run with `bun run index.ts`. Or generate a [single-file executable](https://bun.sh/docs/bundler/executables) with `bun build ./index.ts --compile --outfile bin/pddl`.


## Configuration

pddl uses [Bun environment variables](https://bun.sh/docs/runtime/env) for configuration. See [example.env](./example.env) for valid options.


## Serving

Any file server (Cady, NGINX, etc.) will work but if you want to enjoy life I suggest using Tailscale's awesome `serve` command. For example, `tailscale serve --bg --set-path podcasts /home/user/Public/podcasts`. See the [Tailscale Serve](https://tailscale.com/kb/1312/serve) docs for details.


## Aren't there enough of these? 🤨

There are now 😏 ... I've tried quite a few other options but none of them measured up to what I wanted. Most of them could do the downloading part and some could even handle naming but the only two I recall finding that regenerated the feeds so that I could serve the content were Podfetch and Podgrab but neither handled transcoding. So I built my own thing.
