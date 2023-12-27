export const detox = (val: string): string => {
  return val
    .replace(
      /[\u0001-\u0009\u000a-\u000f\u0010-\u0019\u001a-\u001f\u007f\u0020-\u0022\u0024\u0027\u002a\u002f\u003a-\u003c\u003e\u003f\u0040\u005c\u0060\u007c]/g,
      '_'
    )
    .replace(
      /[\u0028\u0029\u005b\u005d\u007b\u007d]/g,
      '-'
    )
    .replace(/(\-|_){2,}/g, '$1');
};