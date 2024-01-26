import type { FeedItem } from "./feed";
import { differenceInMinutes } from "date-fns";
import { getProgressBar } from "./cli";
import { cpus } from "node:os";

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

export const download = async (items: FeedItem[]) => {
    const progressBar = getProgressBar('Episodes');
    console.log('\n');
    progressBar.start(items.length, 0);
    const stopWatch = new Date();

    let downloaded = 0;
    let skipped = 0;

    await Promise.allSettled(
        items.map(async (item) => {
            if (await Bun.file(item.fileNamePath).exists()) {
                skipped++;
                progressBar.increment();
                return;
            }

            // console.log(`Downloading ${item.fileNamePath}`);
            const response = await fetch(item.url);
            await Bun.write(item.fileNamePath, response);
            downloaded++;
            progressBar.increment();
        })
    );
    progressBar.stop();
    console.log(`Downloaded ${downloaded} episodes in ${differenceInMinutes(new Date(), stopWatch)} min. Skipped ${skipped} items.\n`)
}

export const convert = async (
    items: FeedItem[],
    fileExt: string,
    ffmpegPath: string,
    ffmpegArgsString?: string
) => {
    const cpuCount = cpus().length;
    const threadLimit = Math.max(cpuCount - 1, 1);

    let ffmpegArgs = DEFAULT_FFMPEG_ARGS;
    let ffmpegArgString = ffmpegArgsString;
    if (ffmpegArgString != undefined && ffmpegArgString.length > 0) {
        ffmpegArgs = ffmpegArgString.split(' ');
    }

    const progressBar = getProgressBar('Episodes');
    console.log('\n');
    progressBar.start(items.length, 0);
    const stopWatch = new Date();

    let converted = 0;
    let itemCount = items.length;

    while (converted < itemCount) {
        await Promise.allSettled(
            items
                .slice(converted, threadLimit)
                .map(async (item) => {
                    setTimeout(() => {}, 500);
                    // console.log(`Converting ${item.fileNamePath} to ${fileExt}`);
                    // TODO: Add transcode.
                })
        );

        converted = Math.min(itemCount, converted + threadLimit);
        progressBar.setTotal(converted);
    }

    progressBar.stop();
    console.log(`Converted ${converted} episodes in ${differenceInMinutes(new Date(), stopWatch)} min.\n`)
}

