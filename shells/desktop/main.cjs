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
// fetch path and a save/continue cycle through the game's own TEST harness,
// prints one JSON line and exits (0 on pass). A dev/CI affordance; inert in
// normal launches.
const SMOKE = !!process.env.TW_SMOKE;

function runSmoke() {
  // a smoke run that never loads must still exit — CI hangs are worse than reds
  setTimeout(() => { console.error('SMOKE TIMEOUT'); app.exit(2); }, 60000);
  win.webContents.once('did-finish-load', async () => {
    try {
      const r = await win.webContents.executeJavaScript(`(async () => {
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
        // .resumed, not .ok — TEST.continue() reports ok:true even when the
        // resume was discarded; resumed is the bit that proves the cycle
        const resumed = TEST.continue().resumed;
        TEST.reset();
        return { ok: !!(window.__TW_SHELL__ && PLATFORM.id === 'desktop' && sfx.ok && font.ok &&
                        licence.ok && saved && resumed && demoOk),
                 platform: PLATFORM.id, demo: PLATFORM.isDemo, demoOk, faction,
                 sfxStatus: sfx.status, fontStatus: font.status,
                 licenceStatus: licence.status, manifestStatus: manifest, saved, resumed };
      })()`, true);
      console.log('SMOKE ' + JSON.stringify(r));
      app.exit(r && r.ok ? 0 : 1);
    } catch (err) {
      console.error('SMOKE FAIL ' + err);
      app.exit(1);
    }
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
