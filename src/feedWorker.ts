import { differenceInMilliseconds, format } from "date-fns";
import Parser from "rss-parser";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { detox } from "./detox";

// prevents TS errors
declare var self: Worker;

self.onmessage = async (event: MessageEvent) => {
  const num = event.data.num;
  const url = event.data.url;
  const now = event.data.now;
  
  console.log(num, 'starting');

  const parser = new Parser();
  const feed = await parser.parseURL(url);

  if (feed.title) {
    const feedFolder = `/home/jonany/src/pddl/pods/${detox(feed.title)}`;

    if (!existsSync(feedFolder)) {
      mkdir(feedFolder);
    }

    for (const item of feed.items.slice(0, 2)) {

      if (item.title) {
        const pubDate: Date = new Date(Date.parse(item.isoDate ?? ''));
        const fileName = detox(`${format(pubDate, 'yyyy-MM-dd')}_${item.title}`);
        console.log(num, 'found item', fileName);

        const itemUrl = (item.enclosure?.url || item.link);

        if (itemUrl) {
          console.log(num, 'downloading item', itemUrl);
          const file = Bun.file(`${feedFolder}/${fileName}.mp3`);
          Bun.write(file, '');
          const response = await fetch(itemUrl, { method: "GET" });
          await Bun.write(file, response, { createPath: true, });

          // Bun.spawn(["mv", `${fileName}.mp3`, `${fileName}.ogg`], {
          //     cwd: feedFolder,
          //     onExit(proc, exitCode, signalCode, error) {
          //         console.log('done mv spawn');
          //     },
          // });
        }
      }
    }
  }

  console.log(event.data.num, 'ending', differenceInMilliseconds(new Date(), now));
  postMessage(feed.title);
};
