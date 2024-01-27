import { dirname, } from "node:path";
import { EOL } from "node:os";
import type { SavedItem } from "./save";
import type { BunFile } from "bun";
import fastq, { type queueAsPromised } from "fastq";
import { startBar } from "./cli";

interface ArchiveTask {
    file: BunFile;
    lines: string[];
}

const archiveEpisodes = async (task: ArchiveTask) => {
    const fileExists = await task.file.exists();
    const text: string = fileExists ? await task.file.text() : '';
    const fileLines: string[] = text.split(EOL);
    const newText: string = [...new Set([...fileLines, ...task.lines])].join(EOL);
    
    await Bun.write(task.file, newText.replace(EOL, ''));
}

export const archive = async (items: SavedItem[], workerLimit: number = 1) => {
    const folderNames = [...new Set(items.map(i => dirname(i.outputFilePath)))];

    const progressBar = startBar('Episodes', items.length);

    const q: queueAsPromised<ArchiveTask> = fastq.promise(archiveEpisodes, workerLimit);
    await Promise.allSettled(folderNames.map(async (f) => {
        const lines = items
            .filter(i => i.outputFilePath.startsWith(f))
            .map(i => `${i.outputFilePath}|${i.guid}|${i.url}`);

        const archiveFile = Bun.file(`${f}/archive.txt`);
        await q.push({ file: archiveFile, lines: lines });
        progressBar.increment(lines.length);
    }));

    progressBar.stop();
    console.log('Archiving complete.\n');
}