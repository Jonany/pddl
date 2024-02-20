// NOTE: Part of testing integration with aria2c.

import { removeFromBatchFile } from "./batch";

if (Bun.argv.length !== 5) {
    console.error(`Missing args from aria2c. Expected 3 args. Got ${Bun.argv.length - 2}.`);
}
const fileCount = Bun.argv[3];
const filePath = Bun.argv[4];

console.log(`\nHandling download complete for ${fileCount} file: ${filePath}`);

await removeFromBatchFile(filePath, '/home/jonany/src/pddl/pods');