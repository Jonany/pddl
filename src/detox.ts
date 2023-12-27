import filenamify from "filenamify";
import slugify from "slugify";

// TODO: make this better
export const detox = (val: string) => slugify(
    filenamify(
        slugify(val, { replacement: '_', locale: 'en', trim: true, }),
        { replacement: '_', }
    ),
    { replacement: '_', locale: 'en', trim: true, }
);