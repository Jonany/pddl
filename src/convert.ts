import { unlink } from "node:fs/promises";
import fastq, { type queueAsPromised } from "fastq";
import { startBar, displayDuration } from "./cli";
import type { FeedItem } from "./feed";
import type { SavedItem } from "./download";

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
    console.log(`Converted ${converted} episodes in ${displayDuration(stopWatch)}. Skipped ${saved.length - converted} already converted items.\n`);


    return saved;
}

const switchExt = (fileName: string, newExt: string): string =>
    `${fileName.substring(0, fileName.lastIndexOf('.'))}.${newExt.replaceAll('.', '')}`;