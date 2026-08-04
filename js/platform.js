/* Trenchworks: WW2 — platform shim. Loaded BEFORE every other script (see
   index.html): the one place the game learns which shell it is running in.
   Part of a set of plain scripts sharing one global scope.

   Three shells, one core:
     web     — this file is inert no-ops; boot order is identical to a build
               of the game that predates it.
     desktop — the Electron preload exposes window.__TW_SHELL__ (quit,
               toggleFullscreen, storage). localStorage is a LevelDB under
               Electron's userData and a hard power cut can corrupt the whole
               origin, so the same four DURABLE keys are mirrored write-through
               into per-key files (userData/saves, written by the main
               process) and restored from there at this file's eval. The
               restore is one synchronous sendSync, so unlike mobile there is
               no boot gate: onReady still runs inline. See shells/desktop/.
     mobile  — Capacitor. localStorage stays the synchronous store the 27
               call sites expect, but iOS can evict WKWebView data under
               storage pressure, so the four DURABLE keys (the player's
               property: run save, cards/medals, leaderboards, campaign) are
               mirrored write-through into Capacitor Preferences
               (UserDefaults/SharedPreferences — survives eviction) and
               restored from there at boot, before the game reads anything.

   The contract with the rest of the code:
     PLATFORM.storage.get/set/remove  — synchronous, localStorage-backed;
       used by the durable stores only (save.js, cards.js, leaderboards.js,
       campaign.js). set returns false when the synchronous write failed
       (quota/unavailable) — writeRunSave keys SAVE FAILED off it. settings.js and sprites.js stay on raw localStorage on
       purpose: trivially re-creatable, and sprites.js reads at top-level
       module init, before any async hydration could complete.
     PLATFORM.onReady(fn) — synchronous-when-ready, NOT a promise: on web
       and desktop the callback runs inline, so script execution order is
       exactly what it was before this file existed. Only mobile defers,
       until the Preferences → localStorage restore has finished. main.js
       wraps its bootstrap tail in it.
     PLATFORM.quit()/toggleFullscreen() — shell delegates, no-ops on web and
       on iOS (Apple's HIG disallows an in-app quit control; App Review has
       rejected apps over it). quit() routes to the Electron preload on
       desktop, to Capacitor's App.exitApp() on Android.
     PLATFORM.isAndroid — Android specifically, not all of `isMobile`; the one
       thing that differs between the two mobile OSes so far is the quit
       button above, which iOS must never grow. */
'use strict';

const PLATFORM = (() => {
  const shell = window.__TW_SHELL__ || null;
  const capacitor = (window.Capacitor && window.Capacitor.isNativePlatform &&
                     window.Capacitor.isNativePlatform()) ? window.Capacitor : null;
  const id = shell ? 'desktop' : (capacitor ? 'mobile' : 'web');

  // The saves that are the player's property — everything else can be lost.
  // Spelled out as literals because this file loads FIRST: the four constants
  // that own these keys don't exist yet, and the restore below needs the list
  // synchronously. checkDurableKeys() below reconciles the two once the rest of
  // the scripts have loaded.
  const DURABLE_KEYS = ['twRunSave', 'endlessCards', 'endlessLeaderboard', 'campaignProgress'];
  const MIRROR_PREFIX = 'tw:';   // namespaced inside Preferences, keys stay bare in localStorage
  // hard ceiling on the mobile restore — see the gate comment at the boot block
  const BOOT_GATE_MS = 3000;

  let ready = !capacitor;        // web/desktop are ready the moment this script runs
  let queue = [];

  function onReady(fn) {
    if (ready) fn();
    else queue.push(fn);
  }

  // idempotent: both the restore finishing and the watchdog firing call it, and
  // whichever loses must be a no-op rather than run the bootstrap twice
  function openGate() {
    if (ready) return;
    ready = true;
    const fns = queue; queue = [];
    for (const fn of fns) fn();
  }

  // Renaming a key constant without touching DURABLE_KEYS above would retire
  // that store's durability silently — no throw, no missing function, just a
  // mirror that stops being written and an eviction that takes the save with
  // it. Nothing else would ever say so, hence the check. DOMContentLoaded
  // because every script tag is above it, so all four constants are live by
  // then (and `typeof` on a name that was renamed away reads 'undefined'
  // rather than throwing).
  //
  // This only catches a RENAME of one of the four known stores — it cannot
  // discover a fifth durable store that was added and never wired in here,
  // since it has no way to enumerate `*_KEY` constants it wasn't told the
  // name of (this file is a classic script, not a module, so there's no
  // scope to reflect over). A new durable store needs BOTH DURABLE_KEYS
  // above AND the `live` list below edited by hand.
  function checkDurableKeys() {
    const live = [
      typeof RUN_SAVE_KEY, typeof ENDLESS_CARDS_KEY,
      typeof LEADERBOARD_KEY, typeof PROGRESS_KEY,
    ].every((t) => t === 'string')
      ? [RUN_SAVE_KEY, ENDLESS_CARDS_KEY, LEADERBOARD_KEY, PROGRESS_KEY]
      : null;
    if (!live || live.some((k) => !DURABLE_KEYS.includes(k))) {
      console.error('PLATFORM.DURABLE_KEYS is out of step with the store key ' +
        'constants — the mobile durability mirror will not cover: ' +
        (live ? live.filter((k) => !DURABLE_KEYS.includes(k)).join(', ') : '(a key constant is missing)'));
    }
  }
  document.addEventListener('DOMContentLoaded', checkDurableKeys);

  function prefs() {
    return capacitor && capacitor.Plugins && capacitor.Plugins.Preferences || null;
  }

  // fire-and-forget durability mirror — never awaited, never throws into the
  // sim. Serialized per key: two saves in quick succession must land in the
  // mirror in write order, or an eviction could restore the older blob.
  // (On desktop the per-key serialization lives in the main process — see
  // shells/desktop/main.cjs — so the routing here stays fire-and-forget too.)
  const mirrorTail = Object.create(null);
  function mirror(key, value) {
    if (!DURABLE_KEYS.includes(key)) return;
    if (shell && shell.storage) {
      // a failed IPC send is a durability gap, not an error — same stance as
      // the Preferences chain below
      try { shell.storage.write(key, value); } catch (err) { /* gap */ }
      return;
    }
    if (!capacitor) return;
    const p = prefs();
    if (!p) return;
    const run = () => value === null
      ? p.remove({ key: MIRROR_PREFIX + key })
      : p.set({ key: MIRROR_PREFIX + key, value });
    // a failed mirror write is a durability gap, not an error — and must not
    // wedge the chain, hence run on both settle paths
    mirrorTail[key] = (mirrorTail[key] || Promise.resolve()).then(run, run);
    mirrorTail[key].catch(() => {});
  }

  const storage = {
    get(key) {
      try { return localStorage.getItem(key); } catch (err) { return null; }
    },
    set(key, value) {
      // report the synchronous write honestly — save.js refuses to exit a run
      // whose blob never landed (quota, storage unavailable).
      let ok = true;
      try { localStorage.setItem(key, value); } catch (err) { ok = false; }
      // Mirror ONLY what localStorage actually holds. The restore prefers
      // localStorage on the grounds that a write-through mirror can never be
      // fresher — and mirroring a value localStorage REJECTED is precisely
      // what breaks that: the newer blob would sit in Preferences, unreachable
      // behind the stale one the restore keeps choosing. Nothing is lost by
      // skipping it, because the player was told SAVE FAILED either way and
      // the run they're still in is the newer state.
      if (ok) mirror(key, value);
      return ok;
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (err) { /* unavailable */ }
      mirror(key, null);
    },
  };

  // ---- desktop boot: restore the file mirror, synchronously -----------------
  // The desktop analog of the mobile restore below, minus the gate: the
  // preload's readAllSync is one ipcRenderer.sendSync, so the restore
  // completes right here at eval — before any other script has even parsed —
  // and onReady keeps its inline, boot-order-identical-to-web promise. Same
  // preference rule as mobile: localStorage wins when present, because writes
  // are write-through and the mirror can never be fresher.
  if (shell && shell.storage) {
    let vals = {};
    try { vals = shell.storage.readAllSync() || {}; } catch (err) { /* mirror unreadable — boot memoryless */ }
    for (const key of DURABLE_KEYS) {
      try {
        if (localStorage.getItem(key) !== null) continue;
        const v = vals[key];
        if (typeof v === 'string') localStorage.setItem(key, v);
      } catch (err) { /* a key that can't be restored is just absent */ }
    }
  }

  // ---- mobile boot: restore, then release the bootstrap ---------------------
  if (capacitor) {
    // THE GATE MUST OPEN, and `finally` alone does not promise that: it runs
    // when the body settles or throws, never when an await simply hangs. A
    // native bridge call that never comes back would leave `ready` false
    // forever — and main.js's whole bootstrap (menu, layout, the frame loop)
    // is behind this gate, so that is a black screen with no recovery and no
    // error anywhere. The watchdog is the only thing that makes the promise
    // above true; the restore is a durability nicety and boots without it.
    const watchdog = setTimeout(openGate, BOOT_GATE_MS);
    (async () => {
      try {
        const p = prefs();
        if (p) {
          for (const key of DURABLE_KEYS) {
            try {
              // localStorage wins when present — writes are write-through, so it
              // is at least as fresh; the mirror only matters after an eviction
              if (localStorage.getItem(key) !== null) continue;
              const { value } = await p.get({ key: MIRROR_PREFIX + key });
              // A restore that lands after the watchdog already booted the game
              // is DROPPED: refreshMenu has read storage and decided there is no
              // save, and writing one in behind that menu is a save the player
              // cannot see and a CONTINUE card that never appeared. The mirror
              // keeps the blob for the next launch, which is the honest outcome.
              if (value != null && !ready) localStorage.setItem(key, value);
            } catch (err) { /* a key that can't be restored is just absent */ }
          }
        }
        const plugins = capacitor.Plugins || {};
        // the app IS the game — keep the screen on while it's foregrounded
        if (plugins.KeepAwake) plugins.KeepAwake.keepAwake().catch(() => {});
        if (plugins.StatusBar) plugins.StatusBar.hide().catch(() => {});
        if (plugins.App) {
          // Android back: the core owns the semantics — handleAndroidBack
          // (js/flow.js) pauses a live run, closes the top menu layer, resumes
          // from pause; false only at the main-menu root, the one place back
          // may exit the app. The typeof guard keeps a boot where the core
          // failed to load exitable at all.
          plugins.App.addListener('backButton', () => {
            if (typeof handleAndroidBack === 'function' && handleAndroidBack()) return;
            plugins.App.exitApp();
          });
          // Backgrounding is the last JS the app may ever run — the OS can
          // kill it from there with no further notice. The core owns the
          // semantics (handleAppBackground, js/save.js: pause + autosave
          // through the ordinary writeRunSave path, gated on saveableRun);
          // same typeof guard as backButton so a boot where the core failed
          // to load never throws inside a native listener.
          plugins.App.addListener('appStateChange', ({ isActive }) => {
            if (!isActive && typeof handleAppBackground === 'function') handleAppBackground();
          });
        }
      } finally {
        // a failed shell nicety (plugin missing, bridge quirk) degrades that
        // nicety, never blanks the whole app
        clearTimeout(watchdog);
        openGate();
      }
    })();
  }

  // Android only, never iOS: Apple's HIG explicitly disallows an in-app quit
  // control (the OS owns app lifecycle, and App Review has rejected apps over
  // it), where Android has no such restriction and `App.exitApp()` is the
  // documented way to back a menu quit button with one.
  const isAndroid = !!capacitor && capacitor.getPlatform && capacitor.getPlatform() === 'android';

  return {
    id,
    isDesktop: id === 'desktop',
    isMobile: id === 'mobile',
    isWeb: id === 'web',
    isAndroid,
    // Demo build marker (js/demo-flag.js, flipped true only by demo build
    // steps) OR the ?demo=1 test param. The typeof guard means a staging bug
    // that drops demo-flag.js degrades to the full game, never a boot crash.
    isDemo: (typeof TW_DEMO_BUILD !== 'undefined' && TW_DEMO_BUILD) ||
            /[?&]demo=1(&|$)/.test(location.search),
    onReady,
    storage,
    quit() {
      if (shell && shell.quit) { shell.quit(); return; }
      const App = isAndroid && capacitor.Plugins && capacitor.Plugins.App;
      if (App && App.exitApp) App.exitApp();
    },
    toggleFullscreen() { if (shell && shell.toggleFullscreen) shell.toggleFullscreen(); },
  };
})();
