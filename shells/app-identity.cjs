/* Trenchworks: WW2 — shared app identity for the two shell build configs.
   Single source for appId/name so a rebrand or store relist is one edit
   instead of a hand sweep of electron-builder.cjs, capacitor.config.js and
   desktop/package.json's productName — same idea as file-manifest.json
   applied to the shipped file set, one level up. CommonJS on purpose: both
   consumers load it with a plain `require`, and this project carries no
   TypeScript or bundler anywhere else.

   APP_NAME and PRODUCT_NAME_FS deliberately differ by one character: colons
   are illegal in Windows filenames, and electron-builder derives installer
   artifact names (the NSIS .exe, the DMG volume) from productName. Losing
   the colon there is not a typo to "fix" — do that and a Windows build
   either fails or silently mangles the installer name. APP_NAME (the
   in-OS/display name — Capacitor's appName, package.json's own
   productName) keeps the colon; only electron-builder reads the FS-safe
   variant. */
'use strict';

module.exports = {
  APP_ID: 'com.nygardryan.trenchworks',
  APP_NAME: 'Trenchworks: WW2',
  PRODUCT_NAME_FS: 'Trenchworks WW2',
};
