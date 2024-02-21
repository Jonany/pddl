import { download, type SavedItem } from "./src/download";
import { type FeedItem, getFeedItems, updateFeeds, getFeedUrls } from "./src/feed";
import { getOptions, type Options } from "./src/options";
import { archive, getArchived, type ArchivedItem } from "./src/archive";
import { convert } from "./src/convert";


const options: Options = getOptions();

// FETCH
const feedUrls: string[] = await getFeedUrls(options.opmlFile, options.opmlBinPath);
const feedItems: FeedItem[] = await getFeedItems({
    urls: feedUrls,
    outdir: options.outdir,
    downloadOrder: options.downloadOrder,
    episodeLimit: options.feedEpisodeLimit,
    episodeOffset: options.feedEpisodeOffset,
});

// DOWNLOAD
let archivedItems: ArchivedItem[] = await getArchived(options.archiveFile);
const archivedItemGuids: string[] = archivedItems.map(a => a.guid);
const toDownload: FeedItem[] = feedItems.filter(d => !archivedItemGuids.includes(d.guid));
await download(toDownload, options.workerLimit);

// CONVERT
let savedItems: SavedItem[] = [];
if (options.skipConvert) {
    console.log('Skipping convert step.\n');
    savedItems = toDownload.map(i => ({...i, outputFilePath: i.inputFilePath }));
} else {
    savedItems = await convert(
        toDownload,
        options.outFileExt,
        options.ffmpegBinPath,
        options.workerLimit,
        options.deleteDownloaded,
        options.ffmpegArgs,
    );
}

// ARCHIVE
await archive(savedItems, options.archiveFile);

// SERVE
archivedItems = await getArchived(options.archiveFile);
await updateFeeds(archivedItems, options.serveUrl, options.serveType, options.workerLimit);
