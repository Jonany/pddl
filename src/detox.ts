import filenamify from "filenamify";
import slugify from "slugify";

// TODO: duplicate detox behavior
export const detox = (val: string) => slugify(
    filenamify(
        slugify(val, { replacement: '_', locale: 'en', trim: true, }),
        { replacement: '_', }
    ),
    { replacement: '_', locale: 'en', trim: true, }
);