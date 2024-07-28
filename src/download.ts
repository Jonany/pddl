import fastq from "fastq";
import type { queueAsPromised } from "fastq";
import { displayDuration, startBar } from "./cli";
import type { FeedItem } from "./feed";

export interface SavedItem extends FeedItem {
    outputFilePath: string;
}

export const download = async (items: FeedItem[], workerLimit: number) => {
    const progressBar = startBar('Episodes downloaded', items.length);
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
            const result = await fetch(item.url);
            await Bun.write(item.inputFilePath, result);

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
        `Downloaded ${downloaded} episodes in ${displayDuration(stopWatch)}. Skipped ${skipped} already downloaded items.\n`
    );
}

// Cred goes to a comment under https://stackoverflow.com/a/12646864
const durstenfeldShuffle = <T>(array: T[]): T[] => { 
    const arrayCopy = [...array];
    
    for (let i = arrayCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arrayCopy[i], arrayCopy[j]] = [arrayCopy[j], arrayCopy[i]];
    }
    return arrayCopy;
}