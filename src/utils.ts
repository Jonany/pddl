export const switchExt = (fileName: string, newExt: string): string => 
    fileName.substring(0, fileName.lastIndexOf('.')) + 
    newExt.startsWith('.') ? newExt : '.' + newExt;