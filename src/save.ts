import { unlink } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import fastq from "fastq";
import type { queueAsPromised } from "fastq";
import { displayDuration, startBar } from "./cli";
import type { FeedItem } from "./feed";

const DEFAULT_FFMPEG_ARGS = [
    '-loglevel', 'quiet',
    '-hide_banner',
    '-nostats',
    '-c:a', 'libopus',
    '-b:a', '24k',
    '-ar', '24000',
    '-ac', '1',
    '-fps_mode', 'vfr',
    '-f', 'ogg',
];

export interface SavedItem extends FeedItem {
    outputFilePath: string;
}

export const download = async (items: FeedItem[], workerLimit: number) => {
    const progressBar = startBar('Episodes', items.length);
    const stopWatch = new Date();

    let downloaded = 0;
    let skipped = 0;

    const q: queueAsPromised<FeedItem> = fastq.promise(async (item) => {
        const file = Bun.file(item.inputFilePath);
        if (await file.exists()) {
            skipped++;
            progressBar.increment();
            return;
        }

        try {
            const stream = createWriteStream(item.inputFilePath);
            const { body } = await fetch(item.url);

            if (body !== null) {
                await finished(Readable.fromWeb(body, { highWaterMark: 1024 * 1024 }).pipe(stream));
            }
            downloaded++;
            progressBar.increment();
        } catch (error) { }
    }, workerLimit * 2);

    // Running a Durstenfeld shuffle on these items in an 
    // attempt to reduce the possibility of rate limiting
    // by podcast hosts.
    const sortedItems = durstenfeldShuffle(items);
    await Promise.allSettled(sortedItems.map(async (i) => await q.push(i)));

    progressBar.stop();
    console.log(
        `Downloaded ${downloaded} episodes in ${displayDuration(stopWatch)}. Skipped ${skipped} items.\n`
    );
}

export const convert = async (
    items: FeedItem[],
    outputFileExt: string,
    ffmpegPath: string,
    workerLimit: number,
    deleteDownloaded: boolean,
    ffmpegArgsString?: string
): Promise<SavedItem[]> => {
    let ffmpegArgs = DEFAULT_FFMPEG_ARGS;
    let ffmpegArgString = ffmpegArgsString;
    if (ffmpegArgString != undefined && ffmpegArgString.length > 0) {
        ffmpegArgs = ffmpegArgString.split(' ');
    }

    const stopWatch = new Date();
    const progressBar = startBar('Episodes', items.length);

    let saved: SavedItem[] = [];
    let converted = 0;

    const asyncWorker = async (item: FeedItem): Promise<SavedItem> => {
        const input = Bun.file(item.inputFilePath);
        if (await input.exists()) {
            const outputFilePath = switchExt(item.inputFilePath, outputFileExt);

            const output = Bun.file(outputFilePath);
            const outputExists = await output.exists();
            if (!outputExists) {
                const proc = Bun.spawn([
                    ffmpegPath,
                    '-i', item.inputFilePath,
                    ...ffmpegArgs,
                    outputFilePath,
                ]);

                await proc.exited;
                converted++;

                if (deleteDownloaded) {
                    await unlink(item.inputFilePath);
                }
            }

            progressBar.increment();
            return {
                ...item,
                outputFilePath: outputFilePath,
            };
        }

        progressBar.increment();
        return {
            ...item,
            outputFilePath: item.inputFilePath,
        };
    }

    const q: queueAsPromised<FeedItem, SavedItem> = fastq.promise(asyncWorker, workerLimit);

    await Promise.allSettled(items.map(async (i) => {
        const r = await q.push(i);
        saved = [...saved, r];
        return r;
    }));
    progressBar.stop();
    console.log(`Converted ${converted} episodes in ${displayDuration(stopWatch)}. Skipped ${saved.length - converted} items.\n`);


    return saved;
}

const switchExt = (fileName: string, newExt: string): string =>
    `${fileName.substring(0, fileName.lastIndexOf('.'))}.${newExt.replaceAll('.', '')}`;

// Cred goes to a comment under https://stackoverflow.com/a/12646864
const durstenfeldShuffle = <T>(array: T[]): T[] => { 
    const arrayCopy = [...array];
    
    for (let i = arrayCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arrayCopy[i], arrayCopy[j]] = [arrayCopy[j], arrayCopy[i]];
    }
    return arrayCopy;
}