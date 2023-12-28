import { differenceInSeconds } from "date-fns";
import type { Opml } from "./src/opml";

// TODO: Implement schedule loop

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
  
  for (const feed of feeds.body.outlines) {
    const worker = new Worker(workerURL);
  
    worker.postMessage({ url: feed.xml_url, });
    worker.onmessage = event => {
      console.log(`'${event.data}' finished in ${differenceInSeconds(new Date(), now)}s`);
      finishedFeedCount++;
      console.log(`${finishedFeedCount}/${feedTotal} workers finished`);
    };
  }
  
}
