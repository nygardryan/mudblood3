/* Trenchworks: WW2 — desktop packaging. The game core is pulled from the repo
   root at BUILD time (extraResources), never vendored into this directory —
   main.cjs serves resources/app over tw:// exactly as it serves the repo root
   in dev. Build with: npm run dist

   The shipped file subset lives in shells/file-manifest.json — the single
   list shared with shells/mobile/scripts/sync-www.mjs. Edit that file, not
   this one.

   appId/productName come from shells/app-identity.cjs — the same source
   shells/mobile/capacitor.config.js reads. productName here is the
   FS-safe variant (no colon — see that file); desktop/package.json's own
   productName field keeps the display form and is inert for builds
   (electron-builder prefers this file's), so it's worth keeping in step by
   eye even though it isn't machine-checked. */
'use strict';

const { readFileSync } = require('node:fs');
const path = require('node:path');
const { APP_ID, PRODUCT_NAME_FS } = require('../app-identity.cjs');

const { entries, excludeSuffixes } = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'file-manifest.json'), 'utf8'),
);

const filter = [
  ...entries.map((e) => (e.type === 'dir' ? `${e.path}/**` : e.path)),
  ...excludeSuffixes.map((suf) => `!**/*${suf}`),
];

module.exports = {
  appId: APP_ID,
  productName: PRODUCT_NAME_FS,
  directories: {
    output: 'dist',
    buildResources: 'build',
  },
  // the shell itself (asar)
  files: ['main.cjs', 'preload.cjs', 'package.json'],
  // the game core — same subset shells/mobile/scripts/sync-www.mjs ships to mobile
  extraResources: [
    { from: '../../', to: 'app', filter },
  ],
  win: { target: 'nsis' },
  mac: {
    target: ['dmg', 'zip'],
    category: 'public.app-category.games',
  },
  linux: {
    target: ['AppImage', 'tar.gz'],
    category: 'Game',
  },
};
