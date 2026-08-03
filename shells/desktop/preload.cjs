/* Trenchworks: WW2 — Electron preload. The one bridge between the shell and
   the game core: exposing __TW_SHELL__ is what flips js/platform.js to
   PLATFORM.id === 'desktop'. The core never detects Electron itself. */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('__TW_SHELL__', {
  id: 'desktop',
  quit() { ipcRenderer.send('tw:quit'); },
  toggleFullscreen() { ipcRenderer.send('tw:fullscreen'); },
});
