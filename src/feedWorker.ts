import { compareAsc, compareDesc, parseISO } from "date-fns";
import Parser from "rss-parser";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { detox } from "./detox";
import { downloadItem, type DownloadItem, type ItemDownloadResult } from "./download";
import { DEFAULT_EPISODE_LIMIT, DEFAULT_EPISODE_OFFSET, getValueOrDefault, type FeedRequest, DEFAULT_OUTDIR, DEFAULT_DOWNLOAD_ORDER, DownloadOrder } from "./feed";
import { ArchiveItem } from "./archive";
import { DEFAULT_SERVE_TYPE, DEFAULT_SERVE_URL } from "./serve";


// prevents TS errors
declare var self: Worker;

self.onmessage = async (event: MessageEvent<FeedRequest>) => {
  const request = event.data;

  const parser = new Parser();
  const feed = await parser.parseURL(request.url);

  if (feed.title) {
    console.log(`'${feed.title}' starting...`);

    const outdir = request.outdir ?? DEFAULT_OUTDIR;
    const feedName = detox(feed.title);
    const feedFolder = `${outdir}/${feedName}`;

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
    const itemsToDownload: DownloadItem[] = feed.items
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
          title: item.title!,
          url: (item.enclosure?.url || item.link)!,
          date: typeof item.isoDate === 'undefined' ? defaultPubDate : parseISO(item.isoDate),
          guid: item.guid!,
        };
      })
      .sort((a, b) => (request.downloadOrder ?? DEFAULT_DOWNLOAD_ORDER) == DownloadOrder.OldestFirst
        ? compareAsc(a.date, b.date)
        : compareDesc(a.date, b.date)
      )
      .splice(offset, limit);

    // console.log(`'${feed.title}': Downloading ${itemsToDownload.length} items.`);
    // console.warn(`'${feed.title}': Skipping ${skippedItems} invalid items.`);

    const downloadResults = await Promise.allSettled(
      itemsToDownload.map(async (item): Promise<ItemDownloadResult> => {
        const result = await downloadItem({ ...item, feedTitle: feed.title ?? '', path: feedFolder });
        return result;
      })
    );

    const downloadedItems = downloadResults
      .filter(result => {
        if (result.status === 'fulfilled') {
          return true;
        }

        console.warn(`'${feed.title}' error: ${(result as PromiseRejectedResult).reason}`);
        return false;
      })
      .map(fulfilled => (fulfilled as PromiseFulfilledResult<ItemDownloadResult>).value)
      .filter(item => {
        if (item.skipped) {
        //   console.log(`'${feed.title}' episode '${item.title}' exists. Skipping...`);
          return false;
        }
        return true;
      })
      .filter(item => {
        // console.log(`'${feed.title}' episode '${item.title}' downloaded. Archiving...`);
        const archiveResult = ArchiveItem({
          archiveFileName,
          itemFileName: item.fileName,
          itemGuid: item.guid,
          itemUrl: item.url,
        });

        if (archiveResult.success) {
        //   console.log(`'${feed.title}' episode '${item.title}' archived.`);
          return true;
        }

        console.warn(`'${feed.title}' episode '${item.title}' failed to archive.`);
        return false;
      });

    // TODO: Rewrite to reference archive file instead of items downloaded. Also had a step to
    // validate the file exists to help prevent a bad feed.
    const archiveFileText = await Bun.file(archiveFileName).text();
    const feedItems = archiveFileText
      .split('\n')
      .map(line => line.split('|'));

    const original = await feedFile.text();
    const serveType = request.serveType ?? DEFAULT_SERVE_TYPE;
    const serveUrl = request.serveUrl ?? DEFAULT_SERVE_URL;
    let newFeedText = original.replaceAll('type="audio/.*"', `type="${serveType}"`);
    feedItems.forEach(item => {
      const fileName = item[0];
      const url = item[2];
      const newUrl = `${serveUrl}/${feedName}/${fileName}`;

      newFeedText = newFeedText.replace(url, newUrl);
    });

    Bun.write(feedFile, newFeedText);
  }

  postMessage({ title: feed.title });
};
