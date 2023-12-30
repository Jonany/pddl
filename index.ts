import { differenceInSeconds } from "date-fns";
import type { Opml } from "./src/opml";
import { type FeedResult, type FeedRequest, DownloadOrder } from "./src/feed";

// TODO: Implement schedule loop
// TODO: Implement RSS feed serving

// TODO: Accept feed options as external input
const defaultFeedOptions: FeedRequest = {
  url: '',
  episodeLimit: 10,
  episodeOffset: 0,
  downloadOrder: DownloadOrder.OldestFirst,
}

console.log('\n\nLoading OPML file');

// TODO: Implement OPML import in TypeScript/Bun
const proc = Bun.spawnSync(["lib/opml", "--file", "pods/feeds.opml", "--json"]);
const feedsJson = proc.stdout.toString();

if (feedsJson.length > 0) {
  const feeds: Opml = JSON.parse(feedsJson);

  const workerURL = new URL("src/feedWorker.ts", import.meta.url).href;
  const now = new Date();

  const feedTotal = feeds.body.outlines.length;
  let finishedFeedCount = 0;
  
  // TODO: Rework to a single download/transcode queue instead of splitting by podcast.
  // That will allow me to throttle more easily.
  // Also add an archive queue that processes after transcode instead of waiting. That way
  // if there is an issue, it will still record the successfully downloaded files.
  for (const feed of feeds.body.outlines) {
    const worker = new Worker(workerURL);
  
    worker.postMessage({ ...defaultFeedOptions, url: feed.xml_url, });
    worker.onmessage = (event: MessageEvent<FeedResult>) => {
      console.log(`'${event.data.title}' finished in ${differenceInSeconds(new Date(), now)}s`);
      finishedFeedCount++;
      console.log(`${finishedFeedCount}/${feedTotal} workers finished`);
    };
  }
  
}
