import type { Opml } from "./src/opml";
import { download } from "./src/download";
import { type FeedItem, getFeedItems, updateFeeds } from "./src/feed";
import { getOptions } from "./src/options";
import { archive, getArchived } from "./src/archive";
import { convert } from "./src/convert";

console.log('\n\nLoading OPML file');

const options = getOptions();
const opmlFound = await Bun.file(options.opmlFile).exists();

if (opmlFound) {
    console.log(`Using feed file ${options.opmlFile}\n`);
    const proc = Bun.spawnSync([options.opmlPath, "--file", options.opmlFile, "--json"]);
    const feedsJson = proc.stdout.toString();

    if (feedsJson.length > 0) {
        const feeds: Opml = JSON.parse(feedsJson);

        // FETCH
        const feedUrls = feeds.body.outlines.map(o => o.xml_url);
        const feedItems: FeedItem[] = await getFeedItems({
            urls: feedUrls,
            outdir: options.outdir,
            downloadOrder: options.downloadOrder,
            episodeLimit: options.feedEpisodeLimit,
            episodeOffset: options.feedEpisodeOffset,
        });

        // SAVE
        let archivedItems = await getArchived(options.archiveFile);
        const archivedItemGuids = archivedItems.map(a => a.guid);
        const toDownload = feedItems.filter(d => !archivedItemGuids.includes(d.guid));
        await download(toDownload, options.workerLimit);

        // Convert
        const savedItems = await convert(
            toDownload,
            options.outFileExt,
            options.ffmpegPath,
            options.workerLimit,
            options.deleteDownloaded,
            options.ffmpegArgs,
        );
        await archive(savedItems, options.archiveFile);

        // SERVE
        archivedItems = await getArchived(options.archiveFile);
        await updateFeeds(archivedItems, options.serveUrl, options.serveType, options.workerLimit);
    } else {
        console.warn('Feed file empty');
    }
} else {
    console.warn(`Feed file ${options.opmlFile} does not exist`);
}
