export enum DownloadOrder {
    OldestFirst = 'asc',
    NewestFirst = 'desc',
};

export const DEFAULT_SERVE_URL = 'https://host.nope.ts.net';
export const DEFAULT_SERVE_TYPE = 'audio/ogg';

export const DEFAULT_EPISODE_LIMIT: number = 1;
export const DEFAULT_EPISODE_OFFSET: number = 0;
export const DEFAULT_OUTDIR: string = 'podcasts';
export const DEFAULT_DOWNLOAD_ORDER: DownloadOrder = DownloadOrder.NewestFirst;