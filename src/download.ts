import { unlink } from "node:fs/promises";
import { switchExt } from "./utils";
import { detox } from "./detox";
import { format } from "date-fns";

const DEFAULT_FFMPEG_ARGS = [
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
};

export interface ItemDownloadRequest {
  itemTitle: string;
  itemUrl: string;
  itemGuid: string;
  itemDate: Date;
  feedTitle: string;
  path: string;
  overwrite?: boolean;
  ffmpegArgs?: string[];
};

export interface ItemDownloadResult {
  success: boolean;
  skipped: boolean;
  itemGuid: string;
  itemFileName: string;
  itemTitle: string;
};

export interface ItemInvalidDataResult {
  missingItemTitle?: boolean;
  missingItemUrl?: boolean;
};

export interface DownloadRequest {
  url: string;
  path: string;
  overwrite?: boolean;
  ffmpegArgs?: string[];
};

export interface DownloadResult {
  success: boolean;
  skipped?: boolean;
};

export const downloadItem = async (request: ItemDownloadRequest): Promise<ItemDownloadResult> => {
  console.log(`'${request.feedTitle}' episode '${request.itemTitle}' downloading...`);

  const fileName = detox(`${format(request.itemDate, 'yyyy-MM-dd')}_${request.itemTitle}`);
  const itemFileName = `${fileName}.ogg`;

  const downloadResult = await downloadAsOgg({ url: request.itemUrl, path: `${request.path}/${itemFileName}` });

  return {
    success: downloadResult.success,
    skipped: downloadResult.skipped ?? false,
    itemGuid: request.itemGuid,
    itemTitle: request.itemTitle,
    itemFileName,
  };
}

export const downloadAsOgg = async (request: DownloadRequest): Promise<DownloadResult> => {
  let ffmpegArgs = request.ffmpegArgs;
  if (ffmpegArgs == undefined || ffmpegArgs.length == 0) {
    ffmpegArgs = DEFAULT_FFMPEG_ARGS;
  }

  // TODO: Add option: 'overwrite'
  if (await Bun.file(request.path).exists()) {
    return { success: true, skipped: true };
  }
  const inputExt = request.url.substring(request.url.lastIndexOf('.') + 1);

  if (inputExt == 'm4a') {
    const input = switchExt(request.path, inputExt);
    const response = await fetch(request.url);
    await Bun.write(input, response);

    await transcodeFromFile({ inSource: input, inExt: inputExt, outFile: request.path, ffmpegArgs });
  } else {
    await transcodeFromPipe({ inSource: request.url, inExt: inputExt, outFile: request.path, ffmpegArgs });
  }

  return { success: true };
}

// TODO: Add detailed result object
const transcodeFromFile = async (request: TranscodeRequest) => {
  const proc = Bun.spawn(
    ['lib/ffmpeg',
      '-loglevel', 'warning',
      '-hide_banner',
      '-nostats',
      '-f', request.inExt,
      '-i', request.inSource,
      ...request.ffmpegArgs,
      '-f', 'ogg',
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
    ['lib/ffmpeg',
      '-loglevel', 'warning',
      '-hide_banner',
      '-nostats',
      '-f', request.inExt,
      '-i', 'pipe:0',
      ...request.ffmpegArgs,
      '-f', 'ogg',
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