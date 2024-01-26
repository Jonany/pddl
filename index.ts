import { cpus } from "node:os";
import type { Opml } from "./src/opml";
import { convert, download } from "./src/save";
import { type FeedItem, getFeedItems } from "./src/feed";
import { DEFAULT_EPISODE_LIMIT, DEFAULT_EPISODE_OFFSET, DEFAULT_DOWNLOAD_ORDER, DEFAULT_OUTDIR } from "./src/options";

// TODO: Implement schedule loop

const options = {
  feedEpisodeLimit: DEFAULT_EPISODE_LIMIT,
  feedEpisodeOffset: DEFAULT_EPISODE_OFFSET,
  downloadOrder: DEFAULT_DOWNLOAD_ORDER,
  serveUrl: Bun.env.PDDL_SERVE_URL,
  serveType: Bun.env.PDDL_SERVE_TYPE,
  outdir: Bun.env.PDDL_OUTDIR ?? DEFAULT_OUTDIR,
  ffmpegPath: Bun.env.PDDL_FFMPEG_BIN ?? 'ffmpeg',
  ffmpegArgs: Bun.env.PDDL_FFMPEG_ARGS,
  outFileExt: 'ogg'
}

// TODO: Implement adjustable logging
console.log('\n\nLoading OPML file');

// TODO: Implement OPML import in TypeScript/Bun
const feedFile = Bun.env.PDDL_FEED_FILE ?? 'feeds.opml';
const feedFound = await Bun.file(feedFile).exists();

const opmlBinPath = Bun.env.PDDL_OPML_BIN ?? 'opml';

const episodeLimit = Number.parseInt(Bun.env.PDDL_EPISODE_LIMIT ?? '');
if (Number.isFinite(episodeLimit) && episodeLimit > 0) {
  options.feedEpisodeLimit = episodeLimit;
}

const episodeOffset = Number.parseInt(Bun.env.PDDL_EPISODE_OFFSET ?? '');
if (Number.isFinite(episodeOffset) && episodeOffset > 0) {
  options.feedEpisodeOffset = episodeOffset;
}

const outFileExt = Bun.env.PDDL_OUTFILE_EXT;
if (outFileExt !== undefined && outFileExt.length > 1) {
  options.outFileExt = outFileExt;
}

if (feedFound) {
  console.warn(`Using feed file ${feedFile}`);
  const proc = Bun.spawnSync([opmlBinPath, "--file", feedFile, "--json"]);
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

    // SERVE
  } else {
    console.warn('Feed file empty');
  }
} else {
  console.warn(`Feed file ${feedFile} does not exist`);
}
