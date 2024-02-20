// NOTE: Part of testing integration with aria2c.

import { EOL } from 'node:os';
import { join, normalize } from 'node:path';
import { writeFile } from 'node:fs/promises';

const BATCH_FILE_NAME: string = 'batch.txt';

export interface BatchItem {
    url: string;
    path: string;
}

export const addToBatchFile = async (items: BatchItem[], outputPath: string): Promise<void> => {
    const batchFile = Bun.file(join(outputPath, BATCH_FILE_NAME));
    const batchText = items
        .map(i => `${i.url}${EOL}\tout=${i.path}`)
        .join(EOL);
    await Bun.write(batchFile, batchText);
}

export const removeFromBatchFile = async (itemPath: string, outputPath: string): Promise<void> => {
    const batchFile = Bun.file(join(outputPath, BATCH_FILE_NAME));
    console.log(`\nLooking for batch file: ${batchFile.name ?? ''}`)

    if (await batchFile.exists()) {
        console.log('found batch file');

        const batchText = await batchFile.text();
        console.log('found batch text');
        let newText = batchText;
        const batchLines = batchText.split(EOL);
        console.log('batch lines', batchLines.length, normalize(itemPath));
        let pathIndex = 0;
        // Paths are only listed every other line, starting with the second line (i = 1).
        for (let i = 1; i < batchLines.length;) {
            console.log('batch line', i, `'${batchLines[i]}'`);
            if (batchLines[i].indexOf(normalize(itemPath)) > -1) {
                pathIndex = i;
                console.log('found path');
                break;
            }

            i += 2;
        }

        if (pathIndex === 0) {
            console.log('not found path');
            return;
        }

        // This item is first in the file.
        if (pathIndex === 1) {
            console.log('first line');
            const newLines = batchLines.slice(pathIndex + 1);
            console.log('first line', newLines);
            newText = newLines.join(EOL);
            console.log('first line', `'${newText}'`);
        }

        // Since the path is always under the url, it will never be line 0.
        if (pathIndex > 1) {
            console.log('not first line');
            newText = [
                ...batchLines.slice(0, pathIndex - 2),
                ...batchLines.slice(pathIndex + 1),
            ].join(EOL);
        }

        try {
            await writeFile(batchFile.name ?? '', newText);
        } catch (err) {
            console.log(err);
        }
        // Bun apparently won't write an empty string to a file.
        // Can either use the node writeFile or just remove the file entirely.
        // await Bun.write(batchFile, newText);
    }
}

export const downloadBatch = async (workerLimit: number, outputPath: string): Promise<void> => {
    const proc = Bun.spawn([
        'aria2c',
        '-j', workerLimit.toString(),
        // '--on-download-complete', 'bin/onDownloadComplete',
        '-i', outputPath + '/batch.txt',
        '--auto-file-renaming=false',
        '-d', '/'
    ]);

    console.log('aria2c started');

    await proc.exited;

    console.log('aria2c completed');
}