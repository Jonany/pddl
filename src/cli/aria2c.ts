const proc = Bun.spawn([
    'aria2c',
    '-j', '4',
    '--on-download-complete', 'bin/onDownloadComplete',
    '-i', '/home/jonany/src/pddl/pods/batch.txt',
    '--auto-file-renaming=false',
    '-d', '/'
]);

console.log('started aria2c');

await proc.exited;

console.log('completed aria2c');