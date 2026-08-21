/* Trenchworks: WW2 — Electron shell (see also preload.cjs).
   The game core is NOT copied here: in dev the tw:// protocol serves the repo
   root two directories up; packaged builds carry the same files under
   resources/app (electron-builder.cjs extraResources). tw:// rather than
   win.loadFile() because the core fetch()es its audio and sprite manifest
   (js/audio.js, js/sprites.js) and Chromium blocks fetch on file://. */
'use strict';

const { app, BrowserWindow, protocol, ipcMain, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// Steam's overlay injects into the GPU process; these two switches are the
// known-good Electron configuration for it. Harmless without Steam.
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('disable-direct-composition');

// Must run before app 'ready'. supportFetchAPI is the whole point (see top).
protocol.registerSchemesAsPrivileged([
  { scheme: 'tw', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

// dev: the repo root. packaged: the same subset under resources/app.
const WEB_ROOT = app.isPackaged
  ? path.join(process.resourcesPath, 'app')
  : path.resolve(__dirname, '..', '..');

// Demo build: TW_DEMO_BUILD=1 for dev launches; packaged demo builds carry
// `twDemo` in the asar's package.json (electron-builder.cjs extraMetadata).
// The repo's js/demo-flag.js stays false forever — handleTw serves a generated
// `true` copy instead, so the demo ships the exact same file set.
const DEMO = process.env.TW_DEMO_BUILD === '1' ||
  (() => { try { return !!require('./package.json').twDemo; } catch { return false; } })();

// The app name derives the userData path — where Chromium keeps the game's
// localStorage AND where the save mirror below lives. Electron takes it from
// package.json's productName, which keeps the display colon ("Trenchworks:
// WW2") — and a colon is illegal in a Windows directory name, so on the one
// platform Steam mostly ships to, %APPDATA%\Trenchworks: WW2 is not a path
// that can exist and nothing persists. The FS-safe form is exactly the
// productName with the colon stripped (shells/app-identity.cjs
// PRODUCT_NAME_FS / DEMO_PRODUCT_NAME_FS — that file is NOT in the asar, the
// `files:` list packs only this directory, hence derived rather than
// required). Must run before 'ready': the path is fixed on first use, and
// changing this string after release relocates userData and orphans every
// player's save.
app.setName(String((() => {
  try { return require('./package.json').productName; } catch { return null; }
})() || 'Trenchworks WW2').replace(/:/g, ''));

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.md': 'text/markdown', '.txt': 'text/plain',
  '.woff2': 'font/woff2',
};

function handleTw(request) {
  const url = new URL(request.url);          // tw://app/<path>
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  // the one served-not-read path: a demo build flips the flag file in flight
  if (DEMO && rel === '/js/demo-flag.js') {
    return new Response("'use strict';\nconst TW_DEMO_BUILD = true;\n",
      { headers: { 'content-type': 'text/javascript' } });
  }
  const file = path.normalize(path.join(WEB_ROOT, rel));
  // traversal guard: nothing outside the web root is servable
  if (!file.startsWith(WEB_ROOT + path.sep)) {
    return new Response('forbidden', { status: 403 });
  }
  return fs.promises.readFile(file).then(
    (buf) => new Response(buf, {
      headers: { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' },
    }),
    // missing files are normal for the core (sprite packs, optional SFX fall
    // back to synthesis) — a 404, never a crash
    () => new Response('not found', { status: 404 }),
  );
}

// Steamworks seam: initializes when launched through Steam (or, for a dev
// launch outside Steam, with a steam_appid.txt in THIS directory — the SDK
// searches the working directory; it's gitignored, and 480 is Valve's test
// app id until the real one is assigned). Silently absent otherwise.
// Nothing in the game core calls this yet — achievements/cloud hook in here.
let steamworks = null;
function initSteam() {
  try {
    const sw = require('steamworks.js');
    steamworks = sw.init();                  // reads steam_appid.txt / Steam env
    if (sw.electronEnableSteamOverlay) sw.electronEnableSteamOverlay();
  } catch (err) {
    steamworks = null;                       // not running under Steam — fine
  }
}

let win = null;

// TW_SMOKE=1 electron . — boots the game in a hidden window, proves the tw://
// fetch path plus the whole save durability loop through the game's own TEST
// harness: save → mirror file lands → localStorage wiped raw → reload →
// platform.js restores from the mirror → continue resumes. Prints one JSON
// line and exits (0 on pass). A dev/CI affordance; inert in normal launches.
const SMOKE = !!process.env.TW_SMOKE;

function runSmoke() {
  // a smoke run that never loads must still exit — CI hangs are worse than reds
  setTimeout(() => { console.error('SMOKE TIMEOUT'); app.exit(2); }, 60000);
  const smokeFail = (err) => { console.error('SMOKE FAIL ' + err); app.exit(1); };
  win.webContents.once('did-finish-load', async () => {
    try {
      const p1 = await win.webContents.executeJavaScript(`(async () => {
        const sfx = await fetch('assets/sounds/rifle_1.ogg');
        // the bundled webfonts (css/fonts.css) are how the game stays offline —
        // a miss here means the typography silently falls back to system fonts
        const font = await fetch('assets/fonts/oswald-400.woff2');
        // ...and the licence has to be in the bundle beside it: shipping the
        // binaries is what makes the notice a redistribution requirement
        const licence = await fetch('assets/fonts/oswald-LICENSE.txt');
        const manifest = await fetch('assets/sprites/manifest.json').then(r => r.status, e => 'threw');
        const demoBuild = ${DEMO};
        // demo: start UNPINNED so the faction pin itself is what's proven, and
        // prove a locked purchase is refused through the real place() path
        TEST.start('endless', 'easy', demoBuild ? undefined : 'de');
        const faction = TEST.state().enemyFaction;
        let demoOk = true;
        if (demoBuild) {
          const flagSrc = await fetch('js/demo-flag.js').then(r => r.text());
          const lockedBuy = TEST.buy('gunner', 0.75, 0.5);
          demoOk = PLATFORM.isDemo === true && faction === 'de' &&
                   flagSrc.includes('TW_DEMO_BUILD = true') &&
                   lockedBuy.ok === false && lockedBuy.demoLocked === true;
        }
        TEST.step(10);
        const saved = TEST.save().ok;
        TEST.reset();
        // the mirror write is fire-and-forget IPC + async fs — poll until the
        // file reads back EQUAL to the blob just saved. Equality, not mere
        // existence: a stale mirror left by a crashed earlier smoke would
        // otherwise pass the poll before this run's write ever landed.
        const savedBlob = localStorage.getItem('twRunSave');
        let mirrored = false;
        for (let i = 0; i < 100 && !mirrored; i++) {
          mirrored = __TW_SHELL__.storage.readAllSync().twRunSave === savedBlob;
          if (!mirrored) await new Promise((res) => setTimeout(res, 50));
        }
        // raw removeItem, NOT PLATFORM.storage.remove — the point is to fake
        // an evicted/corrupted localStorage while the mirror file survives
        localStorage.removeItem('twRunSave');
        return { ok: !!(window.__TW_SHELL__ && PLATFORM.id === 'desktop' && sfx.ok && font.ok &&
                        licence.ok && saved && mirrored && demoOk),
                 platform: PLATFORM.id, demo: PLATFORM.isDemo, demoOk, faction,
                 sfxStatus: sfx.status, fontStatus: font.status,
                 licenceStatus: licence.status, manifestStatus: manifest, saved, mirrored };
      })()`, true);
      // phase 2: reload — js/platform.js must restore the wiped blob from the
      // mirror before the menu reads storage, and the save must then resume
      win.webContents.once('did-finish-load', async () => {
        try {
          const p2 = await win.webContents.executeJavaScript(`(async () => {
            const restored = !!TEST.hasSave();
            // .resumed, not .ok — TEST.continue() reports ok:true even when the
            // resume was discarded; resumed is the bit that proves the cycle
            const resumed = TEST.continue().resumed;
            TEST.reset();
            // and the delete path: a remove must take the mirror file with it,
            // or a finished run's save resurrects at the next boot's restore
            PLATFORM.storage.remove('twRunSave');
            let mirrorCleared = false;
            for (let i = 0; i < 100 && !mirrorCleared; i++) {
              const m = __TW_SHELL__.storage.readAllSync();
              mirrorCleared = !('twRunSave' in m);
              if (!mirrorCleared) await new Promise((res) => setTimeout(res, 50));
            }
            return { restored, resumed, mirrorCleared };
          })()`, true);
          const r = { ...p1, ...p2,
            ok: !!(p1 && p1.ok && p2.restored && p2.resumed && p2.mirrorCleared) };
          console.log('SMOKE ' + JSON.stringify(r));
          app.exit(r.ok ? 0 : 1);
        } catch (err) { smokeFail(err); }
      });
      win.webContents.reload();
    } catch (err) { smokeFail(err); }
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 600,
    show: !SMOKE,
    fullscreen: !SMOKE,                      // Steam expectation; F11/Alt+Enter toggles
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  // a shipped game never navigates: Chromium's default for a file DROPPED on
  // the window is to navigate to it, replacing the game mid-run — and there is
  // no autosave to catch that. The game has no window.open/anchors either, so
  // denying popups outright costs nothing.
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('tw://')) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const f11 = input.key === 'F11';
    const altEnter = input.alt && input.key === 'Enter';
    if (f11 || altEnter) {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
  win.loadURL('tw://app/index.html');
  if (SMOKE) runSmoke();
}

ipcMain.on('tw:quit', () => app.quit());
ipcMain.on('tw:fullscreen', () => {
  if (win && !win.isDestroyed()) win.setFullScreen(!win.isFullScreen());
});

// ---- durability mirror (see js/platform.js) --------------------------------
// Desktop's analog of the mobile Preferences mirror: Chromium's localStorage
// is a LevelDB under userData, and a hard power cut mid-compaction can take
// the whole origin — every store at once, no second copy. The four durable
// keys are mirrored write-through into one plain file per key under
// userData/saves, and restored (localStorage wins when present) at
// js/platform.js eval. Plain per-key files on purpose: they're what Steam
// Auto-Cloud can track when cloud saves hook in, and a player hunting a save
// to back up can find them.
const KEY_RE = /^[A-Za-z0-9_-]+$/;         // defense in depth — the renderer only sends DURABLE_KEYS
const mirrorDir = () => path.join(app.getPath('userData'), 'saves');
const mirrorFile = (key) => path.join(mirrorDir(), key + '.json');

// Serialized per key, exactly like platform.js's Preferences chain: two saves
// in quick succession must land in write order, or a restore could hand back
// the older blob. A failed write is a durability gap, not an error — the
// synchronous localStorage write already succeeded (platform.js mirrors only
// then), so the chain runs on both settle paths and never throws upward.
const mirrorTail = Object.create(null);
ipcMain.on('tw:mirror-write', (event, key, value) => {
  if (typeof key !== 'string' || !KEY_RE.test(key)) return;
  if (value !== null && typeof value !== 'string') return;
  const file = mirrorFile(key);
  const run = value === null
    ? () => fs.promises.rm(file, { force: true })
    : async () => {
        // tmp + rename so a crash mid-write leaves the previous mirror intact
        // rather than a truncated one — the whole point of a second copy
        await fs.promises.mkdir(mirrorDir(), { recursive: true });
        const tmp = file + '.tmp';
        await fs.promises.writeFile(tmp, value, 'utf8');
        await fs.promises.rename(tmp, file);
      };
  mirrorTail[key] = (mirrorTail[key] || Promise.resolve()).then(run, run);
  mirrorTail[key].catch(() => {});
});

// Synchronous on purpose: the preload calls this once, at js/platform.js eval,
// so the restore finishes before any script reads storage and desktop's
// onReady stays inline — no mobile-style boot gate, no watchdog.
ipcMain.on('tw:mirror-read-all', (event) => {
  const out = {};
  try {
    for (const f of fs.readdirSync(mirrorDir())) {
      if (!f.endsWith('.json')) continue;
      const key = f.slice(0, -'.json'.length);
      if (!KEY_RE.test(key)) continue;
      try { out[key] = fs.readFileSync(path.join(mirrorDir(), f), 'utf8'); } catch (err) { /* one unreadable mirror is just absent */ }
    }
  } catch (err) { /* no mirror dir yet — first launch */ }
  event.returnValue = out;
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  app.whenReady().then(() => {
    // the default menu ships live accelerators — Ctrl+R would reload away an
    // unsaved run, Ctrl+W closes the game, Ctrl+Shift+I opens devtools. A
    // shipped game has no menu; F11/Alt+Enter are handled above.
    Menu.setApplicationMenu(null);
    protocol.handle('tw', handleTw);
    initSteam();
    createWindow();
  });
  // a game quits when its window closes, macOS included
  app.on('window-all-closed', () => app.quit());
}
