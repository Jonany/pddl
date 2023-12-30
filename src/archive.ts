import { appendFileSync } from "node:fs";

export interface ArchiveRequest {
  archiveFileName: string;
  itemFileName: string;
  itemGuid: string;
};

export interface ArchiveResult {
  success: boolean;
}

export const ArchiveItem = (request: ArchiveRequest): ArchiveResult => {
  try {
    // TODO: Prevent empty first line
    appendFileSync(request.archiveFileName, `\n${request.itemFileName}|${request.itemGuid}`);
    return { success: true, };
  } catch (error) {
    console.error(error);
    return { success: false, };
  }
}