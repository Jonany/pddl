import { cyan } from "ansi-colors";
import { SingleBar } from "cli-progress";

export const getProgressBar = (item: string): SingleBar => new SingleBar({
    format: `${cyan('{bar}')} {percentage}% {value}/{total} ${item}`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
});