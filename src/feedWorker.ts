import { compareAsc, compareDesc, format } from "date-fns";
import Parser from "rss-parser";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { detox } from "./detox";
import { downloadAsOgg } from "./download";
import { DEFAULT_EPISODE_LIMIT, DEFAULT_EPISODE_OFFSET, getValueOrDefault, type FeedRequest, DEFAULT_OUTDIR, DEFAULT_DOWNLOAD_ORDER, DownloadOrder } from "./feed";

// prevents TS errors
declare var self: Worker;

self.onmessage = async (event: MessageEvent<FeedRequest>) => {
  const request = event.data;

  const parser = new Parser();
  const feed = await parser.parseURL(request.url);

  if (feed.title) {
    console.log(`'${feed.title}' starting...`);
    
    const outdir = request.outdir ?? DEFAULT_OUTDIR;
    const feedFolder = `${outdir}/${detox(feed.title)}`;

    if (!existsSync(feedFolder)) {
      await mkdir(feedFolder, { recursive: true });
    }

    const feedFile = Bun.file(`${feedFolder}/feed.xml`);
    const response = await fetch(request.url);
    await Bun.write(feedFile, response);

    const limit = getValueOrDefault(DEFAULT_EPISODE_LIMIT, request.episodeLimit);
    const offset = getValueOrDefault(DEFAULT_EPISODE_OFFSET, request.episodeOffset);

    const itemsToDownload = feed.items
      .sort((a, b) => (request.downloadOrder ?? DEFAULT_DOWNLOAD_ORDER) == DownloadOrder.OldestFirst
        ? compareAsc((a.isoDate ?? ''), (b.isoDate ?? ''))
        : compareDesc((a.isoDate ?? ''), (b.isoDate ?? ''))
      )
      .splice(offset, limit);
    
    for (const item of itemsToDownload) {
      if (item.title) {
        console.log(`'${feed.title}' episode '${item.title}' downloading...`);

        const pubDate: Date = new Date(Date.parse(item.isoDate ?? ''));
        const fileName = detox(`${format(pubDate, 'yyyy-MM-dd')}_${item.title}`);
        const itemUrl = (item.enclosure?.url || item.link);

        if (itemUrl) {
          const success = await downloadAsOgg(itemUrl, `${feedFolder}/${fileName}.ogg`);
        }
      }
    }
  }
  
  postMessage({ title: feed.title });
};
