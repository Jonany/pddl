import { unlink } from "node:fs/promises";
import { switchExt } from "./utils";
import { detox } from "./detox";
import { format } from "date-fns";

const DEFAULT_FFMPEG_ARGS = [
  '-loglevel', 'quiet',
  '-hide_banner',
  '-nostats',
  '-c:a', 'libopus',
  '-b:a', '24k',
  '-ar', '24000',
  '-ac', '1',
  '-fps_mode', 'vfr',
  '-f', 'ogg',
];

interface TranscodeRequest {
  inSource: string;
  inExt: string;
  outFile: string;
  ffmpegArgs: string[];
  ffmpegPath: string;
};

export interface DownloadItem {
  title: string;
  url: string;
  date: Date;
  guid: string;
};

export interface ItemDownloadRequest extends DownloadItem {
  feedTitle: string;
  path: string;
  ffmpegPath: string;
  fileExt: string;
  overwrite?: boolean;
  ffmpegArgs?: string;
};

export interface ItemDownloadResult {
  success: boolean;
  skipped: boolean;
  guid: string;
  fileName: string;
  title: string;
  url: string;
};

export interface ItemInvalidDataResult {
  missingItemTitle?: boolean;
  missingItemUrl?: boolean;
};

export interface DownloadRequest {
  url: string;
  path: string;
  overwrite?: boolean;
  ffmpegArgs?: string;
  ffmpegPath: string;
};

export interface DownloadResult {
  success: boolean;
  skipped?: boolean;
};

export const downloadItem = async (request: ItemDownloadRequest): Promise<ItemDownloadResult> => {
  //   console.log(`'${request.feedTitle}' episode '${request.title}' downloading...`);
  const fileName = detox(`${format(request.date, 'yyyy-MM-dd')}_${request.title}`);
  const itemFileName = `${fileName}.${request.fileExt.replaceAll('.', '')}`;
  const path = `${request.path}/${itemFileName}`;
  const url = request.url;

  let ffmpegArgs = DEFAULT_FFMPEG_ARGS;
  let ffmpegArgString = request.ffmpegArgs;
  if (ffmpegArgString != undefined && ffmpegArgString.length > 0) {
    ffmpegArgs = ffmpegArgString.split(' ');
  }

  // TODO: Add option: 'overwrite'
  if (await Bun.file(path).exists()) {
    return {
      success: true,
      skipped: true,
      guid: request.guid,
      title: request.title,
      fileName: itemFileName,
      url: request.url,
    };
  }
  const inputExt = url.substring(url.lastIndexOf('.') + 1);

  if (inputExt == 'm4a') {
    const input = switchExt(path, inputExt);
    const response = await fetch(url);
    await Bun.write(input, response);

    await transcodeFromFile({
      inSource: input,
      inExt: inputExt,
      outFile: path,
      ffmpegArgs,
      ffmpegPath: request.ffmpegPath,
    });
  } else {
    await transcodeFromPipe({
      inSource: request.url,
      inExt: inputExt,
      outFile: path,
      ffmpegArgs,
      ffmpegPath: request.ffmpegPath,
    });
  }

  return {
    success: true,
    skipped: false,
    guid: request.guid,
    title: request.title,
    fileName: itemFileName,
    url: request.url,
  };
}

// TODO: Add detailed result object
const transcodeFromFile = async (request: TranscodeRequest) => {
  const proc = Bun.spawn(
    [request.ffmpegPath,
      '-f', request.inExt,
      '-i', request.inSource,
    ...request.ffmpegArgs,
    request.outFile,
    ],
  );

  await new Response(proc.stdout).text();
  await unlink(request.inSource); //deletes the input file
}

// TODO: Add detailed result object
const transcodeFromPipe = async (request: TranscodeRequest) => {
  const response = await fetch(request.inSource);

  // TODO: Add retry
  if (!response.ok) {
    console.error('Fetch failed');
    return;
  }

  const proc = Bun.spawn(
    [request.ffmpegPath,
      '-f', request.inExt,
      '-i', 'pipe:0',
    ...request.ffmpegArgs,
    request.outFile,
    ],
    { stdin: 'pipe', },
  );

  if (response.body) {
    for await (const chunk of response.body) {
      proc.stdin.write(chunk);
      proc.stdin.flush();
    }
  }

  proc.stdin.end();
}
