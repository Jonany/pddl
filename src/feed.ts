import { parseISO, compareAsc, compareDesc, format, differenceInSeconds } from "date-fns";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import Parser from "rss-parser";
import { detox } from "./detox";
import { getProgressBar } from "./cli";
import { DEFAULT_DOWNLOAD_ORDER, DEFAULT_EPISODE_LIMIT, DEFAULT_EPISODE_OFFSET, DEFAULT_OUTDIR, DownloadOrder } from "./options";

export interface FeedDownloadRequest {
    urls: string[];
    outdir: string;
    episodeLimit?: number;
    episodeOffset?: number;
    downloadOrder?: DownloadOrder;
};
export interface FeedItem {
    title: string;
    url: string;
    date: Date;
    guid: string;
    inputFilePath: string;
}

export const getValueOrDefault = (defaultVal: number, value?: number): number =>
    Math.max((value ?? defaultVal), defaultVal);

export const getFeedItems = async (request: FeedDownloadRequest): Promise<FeedItem[]> => {
    const parser = new Parser();
    const feedCount = request.urls.length;

    const progressBar = getProgressBar('Feeds');
    console.log('\n');
    progressBar.start(feedCount, 0);
    const stopWatch = new Date();

    let itemsToDownload: FeedItem[] = [];
    for (const feedUrl of request.urls) {
        const feed = await parser.parseURL(feedUrl);

        if (feed.title) {
            const feedName = detox(feed.title);
            const feedFolder = `${request.outdir ?? DEFAULT_OUTDIR}/${feedName}`;

            if (!existsSync(feedFolder)) {
                await mkdir(feedFolder, { recursive: true });
            }

            const feedFile = Bun.file(`${feedFolder}/feed.xml`);
            const response = await fetch(feedUrl);
            await Bun.write(feedFile, response);

            const limit = getValueOrDefault(DEFAULT_EPISODE_LIMIT, request.episodeLimit);
            const offset = getValueOrDefault(DEFAULT_EPISODE_OFFSET, request.episodeOffset);
            const defaultPubDate = new Date();

            const feedItems = feed.items
                // Remove invalid items
                .filter(item =>
                    (item.title ?? '').length > 1 &&
                    (item.enclosure?.url || item.link || '').length > 1 &&
                    (item.guid ?? '').length > 1
                )
                // Build needed data
                .map(item => {
                    const url = (item.enclosure?.url || item.link)!;
                    const date = typeof item.isoDate === 'undefined' ? defaultPubDate : parseISO(item.isoDate);
                    const ext = url.substring(url.lastIndexOf('.') + 1);
                    const fileName = detox(`${format(date, 'yyyy-MM-dd')}_${item.title}`);
                    const path = `${feedFolder}/${fileName}.${ext}`;
                    const result: FeedItem = {
                        title: item.title!,
                        url: url,
                        date: date,
                        guid: item.guid!,
                        inputFilePath: path,
                    };

                    return result;
                })
                .sort((a, b) => (request.downloadOrder ?? DEFAULT_DOWNLOAD_ORDER) == DownloadOrder.OldestFirst
                    ? compareAsc(a.date, b.date)
                    : compareDesc(a.date, b.date)
                )
                .splice(offset, limit);

            itemsToDownload = [...itemsToDownload, ...feedItems];
        }

        progressBar.increment();
    }

    progressBar.stop();
    console.log(`Downloaded ${feedCount} feeds in ${differenceInSeconds(new Date(), stopWatch)}s.\n`);

    return itemsToDownload;
}