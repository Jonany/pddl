import Parser from "rss-parser";
import { detox } from "./src/detox";

const parser = new Parser();
const feed = await parser.parseURL('https://feed.podbean.com/sermons.graceharbor.net/feed.xml');
console.log(feed.title, '|', feed.items.length);

for (const item of feed.items.slice(0, 2)) {
    console.log(item.title, item.pubDate);
    if (item.title) {
        const fileName = detox(item.title);
        console.log(fileName);

        const url = (item.enclosure?.url || item.link);

        if (url) {
            console.log(url);
            const file = Bun.file(`${fileName}.mp3`);
            
            console.log('fetching');
            const response = await fetch(url, { method: "GET" });
            
            console.log('write');
            await Bun.write(file, response, { createPath: true, });
            console.log('done write');
            
            console.log('before mv spawn');
            Bun.spawn(["mv", `${fileName}.mp3`, `${fileName}.ogg`], {
                onExit(proc, exitCode, signalCode, error) {
                    console.log('done mv spawn');
                },
            });
            console.log('after mv spawn');
        }
    }
}