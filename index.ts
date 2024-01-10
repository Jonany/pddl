import { differenceInSeconds } from "date-fns";
import type { Opml } from "./src/opml";
import { type FeedResult, type FeedRequest, DownloadOrder } from "./src/feed";

// TODO: Implement schedule loop
// TODO: Implement RSS feed serving

const defaultFeedOptions: FeedRequest = {
  url: '',
  episodeLimit: 999,
  episodeOffset: 0,
  downloadOrder: DownloadOrder.NewestFirst,
  serveUrl: Bun.env.PDDL_SERVE_URL,
  serveType: Bun.env.PDDL_SERVE_TYPE,
  outdir: Bun.env.PDDL_OUTDIR,
}

// TODO: Implement adjustable logging
console.log('\n\nLoading OPML file');

// TODO: Implement OPML import in TypeScript/Bun
const feedFile = Bun.env.PDDL_FEED_FILE ?? 'feeds.opml';
const feedFound = await Bun.file(feedFile).exists();

if (feedFound) {
  console.warn(`Using feed file ${feedFile}`);
  const proc = Bun.spawnSync(["lib/opml", "--file", feedFile, "--json"]);
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

      worker.postMessage({ ...defaultFeedOptions, url: feed.xml_url, });
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
