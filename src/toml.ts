import { load } from 'js-toml';

export interface Config {
    fetch: Fetch
    convert: Convert
    archive: Archive
    serve: Serve
    podcasts: Podcast[]
}

export interface Fetch {
    outdir: string;
    opml_file: string;
    episode_limit: number;
    episode_offset: number;
    download_order: string;
    worker_limit: number;
    opml_bin: string;
}

export interface Convert {
    skip_convert: boolean;
    ffmpeg_bin: string;
    ffmpeg_args: string;
    outfile_ext: string;
    delete_downloaded: boolean;
}

export interface Archive {
    archive_file: string;
}

export interface Serve {
    serve_url: string;
    serve_type: string;
}

export interface Podcast {
    name: string | string[];
    fetch: Fetch;
    convert: Convert;
}


const toml = await Bun.file('/home/jonany/src/pddl/pddl.config.txt').text();

// const data: Config = load(toml) as Config;
const data: any = load(toml);
console.log(data, data.podcasts);

