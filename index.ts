import { download } from "./src/download";
import { type FeedItem, getFeedItems, updateFeeds, getFeedsUrls } from "./src/feed";
import { getOptions } from "./src/options";
import { archive, getArchived } from "./src/archive";
import { convert } from "./src/convert";


const options = getOptions();

// FETCH
const feedUrls = await getFeedsUrls(options.opmlFile, options.opmlPath);
const feedItems: FeedItem[] = await getFeedItems({
    urls: feedUrls,
    outdir: options.outdir,
    downloadOrder: options.downloadOrder,
    episodeLimit: options.feedEpisodeLimit,
    episodeOffset: options.feedEpisodeOffset,
});

// DOWNLOAD
let archivedItems = await getArchived(options.archiveFile);
const archivedItemGuids = archivedItems.map(a => a.guid);
const toDownload = feedItems.filter(d => !archivedItemGuids.includes(d.guid));
await download(toDownload, options.workerLimit);

// CONVERT
const savedItems = await convert(
    toDownload,
    options.outFileExt,
    options.ffmpegPath,
    options.workerLimit,
    options.deleteDownloaded,
    options.ffmpegArgs,
);

// ARCHIVE
await archive(savedItems, options.archiveFile);

// SERVE
archivedItems = await getArchived(options.archiveFile);
await updateFeeds(archivedItems, options.serveUrl, options.serveType, options.workerLimit);
