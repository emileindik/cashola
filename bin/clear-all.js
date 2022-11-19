#! /usr/bin/env node
const clearAllSync = require('../dist/index').clearAllSync;
const configure = require('../dist/index').configure;

const [,, storageDir] = process.argv;

if (storageDir) {
    configure({ storageDir });
}
clearAllSync();