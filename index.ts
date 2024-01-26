import { differenceInSeconds } from "date-fns";
import type { Opml } from "./src/opml";
import { type FeedResult, type FeedRequest, DEFAULT_EPISODE_LIMIT, DEFAULT_EPISODE_OFFSET, DEFAULT_DOWNLOAD_ORDER } from "./src/feed";

// TODO: Implement schedule loop

const defaultFeedOptions: FeedRequest = {
  url: '',
  episodeLimit: DEFAULT_EPISODE_LIMIT,
  episodeOffset: DEFAULT_EPISODE_OFFSET,
  downloadOrder: DEFAULT_DOWNLOAD_ORDER,
  serveUrl: Bun.env.PDDL_SERVE_URL,
  serveType: Bun.env.PDDL_SERVE_TYPE,
  outdir: Bun.env.PDDL_OUTDIR,
  ffmpegPath: Bun.env.PDDL_FFMPEG_BIN ?? 'ffmpeg',
  ffmpegArgs: Bun.env.PDDL_FFMPEG_ARGS,
  outFileExt: 'ogg'
}

// TODO: Implement adjustable logging
console.log('\n\nLoading OPML file');

// TODO: Implement OPML import in TypeScript/Bun
const feedFile = Bun.env.PDDL_FEED_FILE ?? 'feeds.opml';
const feedFound = await Bun.file(feedFile).exists();

const opmlBinPath = Bun.env.PDDL_OPML_BIN ?? 'opml';

const episodeLimit = Number.parseInt(Bun.env.PDDL_EPISODE_LIMIT ?? '');
if (Number.isFinite(episodeLimit) && episodeLimit > 0) {
  defaultFeedOptions.episodeLimit = episodeLimit;
}

const episodeOffset = Number.parseInt(Bun.env.PDDL_EPISODE_OFFSET ?? '');
if (Number.isFinite(episodeOffset) && episodeOffset > 0) {
  defaultFeedOptions.episodeOffset = episodeOffset;
}

const outFileExt = Bun.env.PDDL_OUTFILE_EXT;
if (outFileExt !== undefined && outFileExt.length > 1) {
  defaultFeedOptions.outFileExt = outFileExt;
}

if (feedFound) {
  console.warn(`Using feed file ${feedFile}`);
  const proc = Bun.spawnSync([opmlBinPath, "--file", feedFile, "--json"]);
  const feedsJson = proc.stdout.toString();

  if (feedsJson.length > 0) {
    const feeds: Opml = JSON.parse(feedsJson);

    const workerURL = new URL("src/feedWorker.ts", import.meta.url).href;
    const now = new Date();

    const feedTotal = feeds.body.outlines.length;
    let finishedFeedCount = 0;

    // TODO: Rework to a single download/transcode queue instead of splitting by podcast.
    // That will allow me to throttle more easily.
    for (const feed of feeds.body.outlines) {
      const worker = new Worker(workerURL);
      const request: FeedRequest = { 
        ...defaultFeedOptions,
        url: feed.xml_url,
      };
      worker.postMessage(request);
      worker.onmessage = (event: MessageEvent<FeedResult>) => {
        console.log(`'${event.data.title}' finished in ${differenceInSeconds(new Date(), now)}s`);
        finishedFeedCount++;
        console.log(`${finishedFeedCount}/${feedTotal} workers finished`);
        worker.terminate();
      };
    }
  } else {
    console.warn('Feed file empty');
  }
} else {
  console.warn(`Feed file ${feedFile} does not exist`);
}
