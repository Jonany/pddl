import { cpus } from "node:os";
import type { Opml } from "./src/opml";
import { convert, download } from "./src/save";
import { type FeedItem, getFeedItems } from "./src/feed";
import { getOptions } from "./src/options";
import { archive } from "./src/archive";

// TODO: Implement schedule loop
// TODO: Implement adjustable logging
console.log('\n\nLoading OPML file');

const options = getOptions();
// TODO: Implement OPML import in TypeScript/Bun
const feedFound = await Bun.file(options.feedFile).exists();

if (feedFound) {
  console.log(`Using feed file ${options.feedFile}\n`);
  const proc = Bun.spawnSync([options.opmlPath, "--file", options.feedFile, "--json"]);
  const feedsJson = proc.stdout.toString();

  if (feedsJson.length > 0) {
    const feeds: Opml = JSON.parse(feedsJson);

    // FETCH
    const feedUrls = feeds.body.outlines.map(o => o.xml_url);
    const itemsToDownload: FeedItem[] = await getFeedItems({
      urls: feedUrls,
      outdir: options.outdir,
      downloadOrder: options.downloadOrder,
      episodeLimit: options.feedEpisodeLimit,
      episodeOffset: options.feedEpisodeOffset,
    });

    // SAVE
    await download(itemsToDownload);

    // Convert
    const cpuCount = cpus().length;
    const threadLimit = Math.max(cpuCount - 1, 1);
    const savedItems = await convert(
      itemsToDownload,
      options.outFileExt,
      options.ffmpegPath,
      threadLimit,
      options.ffmpegArgs,
    );
    await archive(savedItems, threadLimit);

    // SERVE
    // TODO: Transform feed files.
  } else {
    console.warn('Feed file empty');
  }
} else {
  console.warn(`Feed file ${options.feedFile} does not exist`);
}
