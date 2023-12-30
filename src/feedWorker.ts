import { compareAsc, compareDesc, format, parseISO } from "date-fns";
import Parser from "rss-parser";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { detox } from "./detox";
import { downloadItem, type DownloadResult, type ItemDownloadResult, type ItemInvalidDataResult } from "./download";
import { DEFAULT_EPISODE_LIMIT, DEFAULT_EPISODE_OFFSET, getValueOrDefault, type FeedRequest, DEFAULT_OUTDIR, DEFAULT_DOWNLOAD_ORDER, DownloadOrder } from "./feed";
import { ArchiveItem } from "./archive";

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
    const archiveFileName = `${feedFolder}/archive.txt`;

    const limit = getValueOrDefault(DEFAULT_EPISODE_LIMIT, request.episodeLimit);
    const offset = getValueOrDefault(DEFAULT_EPISODE_OFFSET, request.episodeOffset);
    const defaultPubDate = new Date();

    let skippedItems = 0;
    const itemsToDownload = feed.items
      // Remove invalid items
      .filter(item => {
        const valid =
          (item.title ?? '').length > 1 &&
          (item.enclosure?.url || item.link || '').length > 1 &&
          (item.guid ?? '').length > 1;

        if (!valid) {
          skippedItems++;
        }

        return valid;
      })
      // Build needed data
      .map(item => {
        return {
          itemTitle: item.title!,
          itemUrl: (item.enclosure?.url || item.link)!,
          itemDate: typeof item.isoDate === 'undefined' ? defaultPubDate : parseISO(item.isoDate),
          itemGuid: item.guid!,
        };
      })
      .sort((a, b) => (request.downloadOrder ?? DEFAULT_DOWNLOAD_ORDER) == DownloadOrder.OldestFirst
        ? compareAsc(a.itemDate, b.itemDate)
        : compareDesc(a.itemDate, b.itemDate)
      )
      .splice(offset, limit);

    console.log(`'${feed.title}': Downloading ${itemsToDownload.length} items.`);
    console.log(`'${feed.title}': Skipping ${skippedItems} invalid items.`);

    const downloadResults = await Promise.allSettled(
      itemsToDownload.map(async (item): Promise<ItemDownloadResult> => {
        const result = await downloadItem({ ...item, feedTitle: feed.title ?? '', path: feedFolder });
        return result;
      })
    );

    downloadResults.map(result => {
      if (result.status === 'fulfilled') {
        const success = (result as PromiseFulfilledResult<ItemDownloadResult>).value;

        if (success.skipped) {
          console.log(`'${feed.title}' episode '${success.itemTitle}' exists. Skipping...`);
        } else {
          console.log(`'${feed.title}' episode '${success.itemTitle}' downloaded. Archiving...`);
          const archiveResult = ArchiveItem({
            archiveFileName,
            itemFileName: success.itemFileName,
            itemGuid: success.itemGuid,
          });

          if (archiveResult.success) {
            console.log(`'${feed.title}' episode '${success.itemTitle}' Archived.`);
          }
        }
      } else {
        const failed = (result as PromiseRejectedResult).reason;
        console.log(`'${feed.title}' error: ${failed}`);
      }
    });
  }

  postMessage({ title: feed.title });
};
