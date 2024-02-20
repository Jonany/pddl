import { parseISO, compareAsc, compareDesc, format } from "date-fns";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, sep } from "node:path";
import { EOL } from "node:os";
import Parser from "rss-parser";
import type { queueAsPromised } from "fastq";
import fastq from "fastq";
import type { BunFile } from "bun";
import { detox } from "./detox";
import { displayDuration, startBar } from "./cli";
import { DownloadOrder } from "./options";
import type { ArchivedItem } from "./archive";

export interface FeedDownloadRequest {
    urls: string[];
    outdir: string;
    episodeLimit: number;
    episodeOffset: number;
    downloadOrder: DownloadOrder;
};
export interface FeedItem {
    title: string;
    url: string;
    date: Date;
    guid: string;
    inputFilePath: string;
}

export const getFeedItems = async (request: FeedDownloadRequest): Promise<FeedItem[]> => {
    const parser = new Parser();
    const feedCount = request.urls.length;

    const progressBar = startBar('Feeds', feedCount);
    const stopWatch = new Date();

    let itemsToDownload: FeedItem[] = [];
    for (const feedUrl of request.urls) {
        let feed;
        try {
            const response = await fetch(feedUrl);
            if (response.ok) {
                const xml = await response.text();
                feed = await parser.parseString(xml);
            }
        } catch (error) { }

        if (feed?.title) {
            const feedName = detox(feed.title);
            const feedFolder = `${request.outdir}/${feedName}`;

            if (!existsSync(feedFolder)) {
                await mkdir(feedFolder, { recursive: true });
            }

            const feedFile = Bun.file(`${feedFolder}/feed.xml`);
            const response = await fetch(feedUrl);
            await Bun.write(feedFile, response);

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
                .sort((a, b) => (request.downloadOrder) == DownloadOrder.OldestFirst
                    ? compareAsc(a.date, b.date)
                    : compareDesc(a.date, b.date)
                )
                .splice(request.episodeOffset, request.episodeLimit);

            itemsToDownload = [...itemsToDownload, ...feedItems];
            
            progressBar.increment();
        }

    }

    progressBar.stop();
    console.log(`Downloaded ${feedCount} feeds in ${displayDuration(stopWatch)}.\n`);

    return itemsToDownload;
}

export const updateFeeds = async (
    items: ArchivedItem[],
    serveUrl: string,
    serveType: string,
    workerLimit: number = 1,
) => {
    const q: queueAsPromised<UpdateFeedTask> = fastq.promise(updateFeed, workerLimit);
    const feedFolders: string[] = [...new Set(items.map(i => dirname(i.filePath)))];

    const progressBar = startBar('Feeds', feedFolders.length);
    const stopWatch = new Date();

    await Promise.allSettled(feedFolders.map(async (f) => {
        const file = Bun.file(`${f}/feed.xml`);
        const exists = await file.exists();
        if (!exists) { return; }

        await q.push({
            file: file,
            items: items.filter(i => i.filePath.startsWith(f)),
            serveUrl: serveUrl,
            serveType: serveType,
        });
        progressBar.increment();
    }));

    progressBar.stop();
    console.log(`Updated ${feedFolders.length} feeds in ${displayDuration(stopWatch)}.\n`);
}

interface UpdateFeedTask {
    file: BunFile;
    items: ArchivedItem[];
    serveUrl: string;
    serveType: string;
}

const updateFeed = async (task: UpdateFeedTask) => {
    const feedFolder = dirname(task.file.name!);
    const feedName = basename(feedFolder);

    const original = await task.file.text();
    const lines = original.split(EOL);
    
    const findType = /type="audio\/.*"/gi;
    const findLength = /length="\d+"/gi;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let foundUrl: string | undefined = undefined;
        let newUrl: string | undefined = undefined;
        let newLength: number | undefined = undefined;

        for (let x = 0; x < task.items.length; x++) {
            const item = task.items[x];
            if (line.includes(item.url)) {
                foundUrl = item.url;
                const fileSubpath = item.filePath.replace(`${feedFolder}${sep}`, '');
                newUrl = `${task.serveUrl}${sep}${feedName}${sep}${fileSubpath}`;
                newLength = Bun.file(item.filePath).size;
            }
        }

        if (foundUrl && newUrl && newLength) {
            lines[i] = line
                .replace(foundUrl, newUrl)
                .replace(findLength, `length="${newLength}"`)
                .replace(findType, `type="${task.serveType}"`);
        }
        foundUrl = undefined;
        newUrl = undefined;
        newLength = undefined;
    }

    let newFeedText = lines.join(EOL);

    Bun.write(task.file, newFeedText);
}
