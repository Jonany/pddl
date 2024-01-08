export enum DownloadOrder {
    OldestFirst = 'asc',
    NewestFirst = 'desc',
};
export interface FeedRequest {
    url: string;
    outdir?: string;
    episodeLimit?: number;
    episodeOffset?: number;
    downloadOrder?: DownloadOrder;
};
export interface FeedResult {
    title: string;
};
export const getValueOrDefault = (defaultVal: number, value?: number): number =>
    Math.max((value ?? defaultVal), defaultVal);

export const DEFAULT_EPISODE_LIMIT: number = 1;
export const DEFAULT_EPISODE_OFFSET: number = 0;
export const DEFAULT_OUTDIR: string = '/home/jonany/Public/podcasts';
export const DEFAULT_DOWNLOAD_ORDER: DownloadOrder = DownloadOrder.NewestFirst;