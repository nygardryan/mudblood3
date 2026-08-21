/* Trenchworks: WW2 — Capacitor config. .js instead of .json (both are valid
   Capacitor config formats) so appId/appName can come from
   shells/app-identity.cjs, the same source shells/desktop/electron-builder.cjs
   reads — see that file's header for why productName differs by a colon
   between the two shells. `cap sync` still writes the resolved JSON into the
   native projects (android/.../assets/capacitor.config.json,
   ios/.../capacitor.config.json) regardless of the source format.

   cordova.accessOrigins is NOT decoration: @capacitor/cli's autoGenerateConfig
   (dist/cordova.js) rewrites both platforms' config.xml from scratch on every
   `cap sync`/`cap update`, and falls back to `<access origin="*" />` — wide
   open to any host — whenever this array is empty. Editing the generated
   config.xml files directly doesn't stick; this is the one place that does. */
const { APP_ID, APP_NAME } = require('../app-identity.cjs');

/** @type {import('@capacitor/cli').CapacitorConfig} */
module.exports = {
  appId: APP_ID,
  appName: APP_NAME,
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#000000',
  },
  ios: {
    backgroundColor: '#000000',
  },
  cordova: {
    accessOrigins: ['https://localhost', 'capacitor://localhost'],
  },
};
