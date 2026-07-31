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
const {
  APP_ID, PRODUCT_NAME_FS, DEMO_APP_ID, DEMO_APP_NAME, DEMO_PRODUCT_NAME_FS,
} = require('../app-identity.cjs');

// TW_DEMO_BUILD=1 npm run dist:demo — same files, demo identity. The flag the
// game reads is NOT staged: main.cjs serves a generated js/demo-flag.js over
// tw:// when the packaged package.json carries `twDemo` (extraMetadata below).
const DEMO = process.env.TW_DEMO_BUILD === '1';

const { entries, excludeSuffixes } = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'file-manifest.json'), 'utf8'),
);

const filter = [
  ...entries.map((e) => (e.type === 'dir' ? `${e.path}/**` : e.path)),
  ...excludeSuffixes.map((suf) => `!**/*${suf}`),
];

module.exports = {
  appId: DEMO ? DEMO_APP_ID : APP_ID,
  productName: DEMO ? DEMO_PRODUCT_NAME_FS : PRODUCT_NAME_FS,
  directories: {
    output: DEMO ? 'dist-demo' : 'dist',   // never clobber the full build
    buildResources: 'build',
  },
  // twDemo rides the asar's package.json — how a PACKAGED demo knows itself
  // (env vars don't survive into a shipped app). Display name keeps the colon.
  ...(DEMO ? { extraMetadata: { twDemo: true, productName: DEMO_APP_NAME } } : {}),
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
