export enum DownloadOrder {
    OldestFirst,
    NewestFirst,
};

export interface Options {
    archiveFile: string;
    downloadOrder: DownloadOrder;
    feedEpisodeLimit: number;
    feedEpisodeOffset: number;
    ffmpegArgs: string;
    ffmpegBinPath: string;
    deleteDownloaded: boolean;
    opmlFile: string;
    opmlBinPath: string;
    outdir: string;
    outFileExt: string;
    serveType: string;
    serveUrl: string;
    skipConvert: boolean;
    workerLimit: number;
}

const DEFAULT_ARCHIVE_FILE: string = 'archive.txt';
const DEFAULT_DOWNLOAD_ORDER: DownloadOrder = DownloadOrder.NewestFirst;
const DEFAULT_EPISODE_LIMIT: number = 2;
const DEFAULT_EPISODE_OFFSET: number = 0;
const DEFAULT_FFMPEG_ARGS: string = '-loglevel quiet -hide_banner -nostats -c:a libopus -b:a 24k -ar 24000 -ac 1 -fps_mode vfr -f ogg';
const DEFAULT_FFMPEG_BIN: string = 'lib/ffmpeg';
const DEFAULT_OPML_BIN: string = 'lib/opml';
const DEFAULT_OPML_FILE: string = 'feeds.opml';
const DEFAULT_OUTDIR: string = 'podcasts';
const DEFAULT_OUTFILE_EXT: string = 'ogg';
const DEFAULT_SERVE_TYPE: string = 'audio/ogg';
const DEFAULT_SERVE_URL: string = 'https://host.nope.ts.net/podcasts';
const DEFAULT_WORKER_LIMIT: number = 1;

/** 
* Returns options configured through the environment or defaults if no options are found.
*/
export const getOptions = (): Options => {
    const archiveFile = Bun.env.PDDL_ARCHIVE_FILE ?? DEFAULT_ARCHIVE_FILE;    

    let downloadOrder: DownloadOrder = DEFAULT_DOWNLOAD_ORDER;
    const envDownloadOrder = Bun.env.PDDL_DOWNLOAD_ORDER ?? '';
    switch (envDownloadOrder.toLowerCase()) {
        case 'asc':
            downloadOrder = DownloadOrder.NewestFirst;
            break;
        case 'desc':
            downloadOrder = DownloadOrder.OldestFirst;
            break;
    }

    let feedEpisodeLimit = DEFAULT_EPISODE_LIMIT;
    const envEpisodeLimit = Number.parseInt(Bun.env.PDDL_EPISODE_LIMIT ?? '');
    if (Number.isFinite(envEpisodeLimit) && envEpisodeLimit >= 0) {
        feedEpisodeLimit = envEpisodeLimit;
    }

    let feedEpisodeOffset = DEFAULT_EPISODE_OFFSET;
    const envEpisodeOffset = Number.parseInt(Bun.env.PDDL_EPISODE_OFFSET ?? '');
    if (Number.isFinite(envEpisodeOffset) && envEpisodeOffset > 0) {
        feedEpisodeOffset = envEpisodeOffset;
    }

    const opmlFile = Bun.env.PDDL_OPML_FILE ?? DEFAULT_OPML_FILE;    
    const ffmpegArgs = Bun.env.PDDL_FFMPEG_ARGS ?? DEFAULT_FFMPEG_ARGS;
    const ffmpegPath = Bun.env.PDDL_FFMPEG_BIN ?? DEFAULT_FFMPEG_BIN;
    const deleteDownloaded = Bun.env.PDDL_DELETE_DOWNLOADED !== 'false';
    const opmlBinPath = Bun.env.PDDL_OPML_BIN ?? DEFAULT_OPML_BIN;
    const outdir = Bun.env.PDDL_OUTDIR ?? DEFAULT_OUTDIR;

    let outFileExt = DEFAULT_OUTFILE_EXT;
    const envOutFileExt = Bun.env.PDDL_OUTFILE_EXT;
    if (envOutFileExt !== undefined && envOutFileExt.length > 1) {
        outFileExt = envOutFileExt;
    }
    
    const serveUrl = Bun.env.PDDL_SERVE_URL ?? DEFAULT_SERVE_URL;
    const serveType = Bun.env.PDDL_SERVE_TYPE ?? DEFAULT_SERVE_TYPE;

    const skipConvert = Bun.env.PDDL_SKIP_CONVERT === 'true';
    
    let workerLimit = DEFAULT_WORKER_LIMIT;
    const envWorkerLimit = Number.parseInt(Bun.env.PDDL_WORKER_LIMIT ?? '');
    if (Number.isFinite(envWorkerLimit) && envWorkerLimit > 0) {
        workerLimit = envWorkerLimit;
    }

    return {
        archiveFile: archiveFile,
        downloadOrder: downloadOrder,
        feedEpisodeLimit: feedEpisodeLimit,
        feedEpisodeOffset: feedEpisodeOffset,
        opmlFile: opmlFile,
        ffmpegArgs: ffmpegArgs,
        ffmpegBinPath: ffmpegPath,
        deleteDownloaded: deleteDownloaded,
        opmlBinPath: opmlBinPath,
        outdir: outdir,
        outFileExt: outFileExt,
        serveType: serveType,
        serveUrl: serveUrl,
        skipConvert: skipConvert,
        workerLimit: workerLimit,
    };
}