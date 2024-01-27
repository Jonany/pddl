import { cyan } from "ansi-colors";
import { SingleBar } from "cli-progress";
import { differenceInMilliseconds, formatDistance } from "date-fns";

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

export const displayDuration = (date: Date): string => {
    const now = new Date();
    const ms = differenceInMilliseconds(now, date);
    if (ms < 1000) {
        return `${ms}ms`;
    }
    if (ms < 4000) {
        return `${(ms/1000).toFixed(1)}s`
    }
    return formatDistance(date, now, { includeSeconds: true });
};