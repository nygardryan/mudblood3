/* Trenchworks: WW2 — demo build marker. Committed FALSE forever; the repo is
   always the full game. Demo builds flip this file to `true` at staging, never
   in the repo: shells/desktop/main.cjs serves a generated copy over tw:// when
   packaged as the demo, shells/mobile/scripts/sync-www.mjs overwrites the
   staged copy under TW_DEMO_BUILD=1, and scripts/stage-web-demo.mjs does the
   same for the web demo directory. Runtime code never reads this directly —
   it reads PLATFORM.isDemo (js/platform.js), which also honours ?demo=1 for
   in-browser testing, and gameplay gates go through demoActive() (js/demo.js). */
'use strict';
const TW_DEMO_BUILD = false;
