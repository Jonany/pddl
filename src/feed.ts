export enum DownloadOrder {
    OldestFirst = 'asc',
    NewestFirst = 'desc',
};
export interface FeedRequest {
    url: string;
    ffmpegPath: string;
    outFileExt: string;
    ffmpegArgs?: string;
    outdir?: string;
    episodeLimit?: number;
    episodeOffset?: number;
    downloadOrder?: DownloadOrder;
    serveUrl?: string;
    serveType?: string;
};
export interface FeedResult {
    title: string;
};
export const getValueOrDefault = (defaultVal: number, value?: number): number =>
    Math.max((value ?? defaultVal), defaultVal);

export const DEFAULT_EPISODE_LIMIT: number = 1;
export const DEFAULT_EPISODE_OFFSET: number = 0;
export const DEFAULT_OUTDIR: string = 'podcasts';
export const DEFAULT_DOWNLOAD_ORDER: DownloadOrder = DownloadOrder.NewestFirst;