import { differenceInMilliseconds } from "date-fns";
import type { Opml } from "./src/opml";

console.log('\n\nLoading OPML file');

const proc = Bun.spawnSync(["opml", "--file", "feeds.opml", "--json"]);
const feedsJson = proc.stdout.toString();

if (feedsJson.length > 0) {
  const feeds: Opml = JSON.parse(feedsJson);

  const workerURL = new URL("src/feedWorker.ts", import.meta.url).href;
  const now = new Date();

  for (const [idx, feed] of feeds.body.outlines.entries()) {
    const worker = new Worker(workerURL);
  
    worker.postMessage({ num: idx, url: feed.xml_url, now: now });
    worker.onmessage = event => {
      console.log(idx, 'finished in', differenceInMilliseconds(new Date(), now), event.data);
    };
  }
  
}
