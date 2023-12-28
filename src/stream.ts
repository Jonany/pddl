import { unlink } from "node:fs/promises";

export const streamToFfmpeg = async (
  url: string,
  outputPath: string
): Promise<boolean> => {
  // TODO: Add option: 'overwrite'
  if (await Bun.file(outputPath).exists()) {
    return true;
  }
  const inputExt = url.substring(url.lastIndexOf('.')).replaceAll('.', '')

  if (inputExt == 'm4a') {
    const input = outputPath.replace('.ogg', `.${inputExt}`);
    const response = await fetch(url);
    await Bun.write(input, response);

    await transcodeFromFile(input, inputExt, outputPath);
  } else {
    await transcodeFromPipe(url, inputExt, outputPath);
  }

  return true;
}

const transcodeFromFile = async (inFile: string, inExt: string, outFile: string) => {
  const proc = Bun.spawn(
    ['ffmpeg',
      '-loglevel', 'warning',
      '-hide_banner',
      '-nostats',
      '-f', inExt,
      '-i', inFile,
      '-c:a', 'libopus',
      '-b:a', '24k',
      '-ar', '24000',
      '-ac', '1',
      '-fps_mode', 'vfr',
      '-f', 'ogg',
      outFile,
    ],
  );

  await new Response(proc.stdout).text();
  await unlink(inFile); //deletes the input file
}

const transcodeFromPipe = async (inUrl: string, inExt: string, outFile: string) => {
  const response = await fetch(inUrl);

  if (!response.ok) {
    console.error('Fetch failed');
    return;
  }

  const proc = Bun.spawn(
    ['ffmpeg',
      '-loglevel', 'warning',
      '-hide_banner',
      '-nostats',
      '-f', inExt,
      '-i', 'pipe:0',
      '-c:a', 'libopus',
      '-b:a', '24k',
      '-ar', '24000',
      '-ac', '1',
      '-fps_mode', 'vfr',
      '-f', 'ogg',
      outFile,
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