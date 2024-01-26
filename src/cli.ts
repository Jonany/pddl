import { cyan } from "ansi-colors";
import { SingleBar } from "cli-progress";

export const startBar = (item: string, total: number, startAt: number = 0): SingleBar => {
    const bar = new SingleBar({
        format: `${cyan('{bar}')} {percentage}% {value}/{total} ${item}`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        barsize: 80,
    });
    bar.start(total, startAt);
    return bar;
};