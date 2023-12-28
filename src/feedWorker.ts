import { format } from "date-fns";
import Parser from "rss-parser";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { detox } from "./detox";
import { streamToFfmpeg } from "./stream";

// prevents TS errors
declare var self: Worker;

self.onmessage = async (event: MessageEvent) => {
  const url = event.data.url;

  const parser = new Parser();
  const feed = await parser.parseURL(url);

  if (feed.title) {
    console.log(`'${feed.title}' starting...`);
    
    // TODO: Add option: 'outdir'
    const feedFolder = `/home/jonany/src/pddl/pods/${detox(feed.title)}`;

    if (!existsSync(feedFolder)) {
      await mkdir(feedFolder, { recursive: true });
    }

    // TODO: Add option: 'limit'
    for (const item of feed.items.slice(0, 2)) {
      if (item.title) {
        console.log(`'${feed.title}' episode '${item.title}' downloading...`);

        const pubDate: Date = new Date(Date.parse(item.isoDate ?? ''));
        const fileName = detox(`${format(pubDate, 'yyyy-MM-dd')}_${item.title}`);
        const itemUrl = (item.enclosure?.url || item.link);

        if (itemUrl) {
          const success = await streamToFfmpeg(itemUrl, `${feedFolder}/${fileName}.ogg`);
        }
      }
    }
  }
  
  postMessage(feed.title);
};
