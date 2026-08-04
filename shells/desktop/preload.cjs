/* Trenchworks: WW2 — Electron preload. The one bridge between the shell and
   the game core: exposing __TW_SHELL__ is what flips js/platform.js to
   PLATFORM.id === 'desktop'. The core never detects Electron itself. */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('__TW_SHELL__', {
  id: 'desktop',
  quit() { ipcRenderer.send('tw:quit'); },
  toggleFullscreen() { ipcRenderer.send('tw:fullscreen'); },
  // Durability mirror for the four durable stores — desktop's analog of the
  // mobile Preferences mirror (see js/platform.js and main.cjs's handlers).
  storage: {
    // one sendSync at js/platform.js eval: synchronous so the restore lands
    // before any script reads storage and onReady stays inline on desktop
    readAllSync() {
      try { return ipcRenderer.sendSync('tw:mirror-read-all') || {}; } catch (err) { return {}; }
    },
    // fire-and-forget; the main process serializes writes per key.
    // value === null deletes the key's mirror file.
    write(key, value) { ipcRenderer.send('tw:mirror-write', key, value); },
  },
});
