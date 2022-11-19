#! /usr/bin/env node
const clearSync = require('../dist/index').clearSync;
const configure = require('../dist/index').configure;

const [,, key, storageDir] = process.argv;

if (!key) {
    throw new Error('Must provide key as arg. "npm run clear -- <key>"');
}

if (storageDir) {
    configure({ storageDir });
}
clearSync(key);