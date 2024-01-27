import { EOL } from "node:os";
import type { SavedItem } from "./save";

const SEPARATOR: string = '|';

export interface ArchivedItem {
    filePath: string;
    guid: string;
    url: string;
}

export const archive = async (items: SavedItem[], archiveFile: string) => {
    if (items.length === 0) {
        return;
    }
    
    const file = Bun.file(archiveFile);
    const fileExists = await file.exists();
    const text: string = fileExists ? await file.text() : '';
    const fileLines: string[] = text.split(EOL);

    const lines = items.map(i => `${i.outputFilePath}${SEPARATOR}${i.guid}${SEPARATOR}${i.url}`);

    const newText: string = [...new Set([...fileLines, ...lines])].join(EOL);

    await Bun.write(file, newText.replace(EOL, ''));

    console.log('Archiving complete.\n');
};

export const getArchived = async (archiveFile: string): Promise<ArchivedItem[]> => {
    const file = Bun.file(archiveFile);
    const fileExists = await file.exists();
    const text: string = fileExists ? await file.text() : '';

    if (text === '') {
        return [];
    }

    return text
        .split(EOL)
        .map(line => {
            const itemArr = line.split(SEPARATOR);
            return {
                filePath: itemArr[0],
                guid: itemArr[1],
                url: itemArr[2]
            }
        });
}
