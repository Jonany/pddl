import { unlink } from "node:fs/promises";
import fastq from "fastq";
import type { queueAsPromised } from "fastq";
import { differenceInMinutes } from "date-fns";
import { getProgressBar } from "./cli";
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

export const download = async (items: FeedItem[]) => {
    const progressBar = getProgressBar('Episodes');
    progressBar.start(items.length, 0);
    const stopWatch = new Date();

    let downloaded = 0;
    let skipped = 0;

    await Promise.allSettled(
        items.map(async (item) => {
            if (await Bun.file(item.inputFilePath).exists()) {
                skipped++;
                progressBar.increment();
                return;
            }

            // console.log(`Downloading ${item.fileNamePath}`);
            const response = await fetch(item.url);
            await Bun.write(item.inputFilePath, response);
            downloaded++;
            progressBar.increment();
        })
    );
    progressBar.stop();
    console.log(`Downloaded ${downloaded} episodes in ${differenceInMinutes(new Date(), stopWatch)} min. Skipped ${skipped} items.\n`)
}

export const convert = async (
    items: FeedItem[],
    outputFileExt: string,
    ffmpegPath: string,
    workerLimit: number,
    ffmpegArgsString?: string
): Promise<SavedItem[]> => {
    let ffmpegArgs = DEFAULT_FFMPEG_ARGS;
    let ffmpegArgString = ffmpegArgsString;
    if (ffmpegArgString != undefined && ffmpegArgString.length > 0) {
        ffmpegArgs = ffmpegArgString.split(' ');
    }

    const progressBar = getProgressBar('Episodes');
    progressBar.start(items.length, 0);

    let saved: SavedItem[] = [];
    const asyncWorker = async (item: FeedItem): Promise<SavedItem> => {
        const input = Bun.file(item.inputFilePath);
        if (await input.exists()) {
            const outputFilePath = switchExt(item.inputFilePath, outputFileExt);

            const output = Bun.file(outputFilePath);
            if (!output.exists()) {
                const proc = Bun.spawn([
                    ffmpegPath,
                    '-i', item.inputFilePath,
                    ...ffmpegArgs,
                    outputFilePath,
                ]);

                await proc.exited;
                // TODO: Parameterize
                // await unlink(item.fileNamePath); //deletes the input file
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
    console.log(`Conversion complete.\n`);
    

    return saved;
}

const switchExt = (fileName: string, newExt: string): string => 
    `${fileName.substring(0, fileName.lastIndexOf('.'))}.${newExt.replaceAll('.', '')}`;