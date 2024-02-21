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
import type { Opml } from "./opml";

export interface FeedDownloadRequest {
    feeds: PodcastFeed[];
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

export interface PodcastFeed {
    name: string;
    xmlUrl: string;
}

export const getFeedUrls = async (opmlFile: string, opmlBinPath: string): Promise<PodcastFeed[]> => {
    const opmlFound = await Bun.file(opmlFile).exists();

    if (!opmlFound) {
        console.error(`\n**** Feed file ${opmlFile} does not exist ****\n`);
        return [];
    }

    console.log(`Using feed file ${opmlFile}\n`);
    const proc = Bun.spawnSync([opmlBinPath, "--file", opmlFile, "--json"]);
    const opmlJson = proc.stdout.toString();

    if (opmlJson.length == 0) {
        console.error('\n**** Feed file is empty ****\n');
        return [];
    }

    const opmlObj: Opml = JSON.parse(opmlJson);

    return opmlObj.body.outlines.map(o => ({ name: o.text, xmlUrl: o.xml_url }));
}


/** 
* Returns a list of podcast episodes.
*/
export const getFeedItems = async (request: FeedDownloadRequest): Promise<FeedItem[]> => {
    const parser = new Parser();
    const feedCount = request.feeds.length;

    const progressBar = startBar('Feeds downloaded', feedCount);
    const stopWatch = new Date();

    let itemsToDownload: FeedItem[] = [];
    for (const feed of request.feeds) {
        const feedFolder = `${request.outdir}/${detox(feed.name)}`;

        let feedObj;
        try {
            const response = await fetch(feed.xmlUrl);
            if (response.ok) {
                const xml = await response.text();
                feedObj = await parser.parseString(xml);

                await Bun.write(`${feedFolder}/feed.xml`, xml, { createPath: true, });
            }
        } catch (error) { }

        if (feedObj == undefined) {
            continue;
        }


        if (!existsSync(feedFolder)) {
            await mkdir(feedFolder, { recursive: true });
        }

        const defaultPubDate = new Date();

        const feedItems = feedObj.items
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
            .sort((a, b) => request.downloadOrder == DownloadOrder.OldestFirst
                ? compareAsc(a.date, b.date)
                : compareDesc(a.date, b.date)
            )
            .splice(request.episodeOffset, request.episodeLimit);

        itemsToDownload = [...itemsToDownload, ...feedItems];

        progressBar.increment();

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

    const progressBar = startBar('Feeds updated', feedFolders.length);
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

    const feedText = await task.file.text();
    const feedLines = feedText.split(EOL);

    // Doing items as the outer loop should result in the fewest iterations because
    // the number of items will always be less than the number of lines in the feed file.
    for (let x = 0; x < task.items.length; x++) {
        const item = task.items[x];

        for (let i = 0; i < feedLines.length; i++) {
            if (feedLines[i].includes(item.url)) {
                const fileSubpath = item.filePath.replace(`${feedFolder}${sep}`, '');
                const newLength = Bun.file(item.filePath).size;
                const newUrl = `${task.serveUrl}${sep}${feedName}${sep}${fileSubpath}`;

                feedLines[i] = feedLines[i]
                    .replace(item.url, newUrl)
                    .replace(/length="\d+"/gi, `length="${newLength}"`)
                    .replace(/type="audio\/.*"/gi, `type="${task.serveType}"`);

                break;
            }
        }
    }

    let newFeedText = feedLines.join(EOL);

    Bun.write(task.file, newFeedText);
}
