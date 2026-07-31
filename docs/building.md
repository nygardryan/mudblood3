# Building Trenchworks: WW2

One codebase, four targets. The game itself (`index.html`, `js/`, `css/`,
`assets/`) is never copied or forked into a shell — see the top-level
[README.md](../README.md) and `CLAUDE.md` for the shell architecture and the
`js/platform.js` seam. This doc is the practical "how do I get a build out"
reference for each target; see `shells/desktop/` and `shells/mobile/` for the
shell code itself.

The shipped file subset for both native shells is defined **once**, in
[`shells/file-manifest.json`](../shells/file-manifest.json) — a new root-level
file or asset directory the game reads needs to be added there, not in either
shell's build config.

---

## Web

No build step. The repo root **is** the game.

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Any static file server works — just serve the repo root over HTTP(S), not
`file://` (the game `fetch()`es its audio and sprite manifest, which browsers
block on `file://`). For local dev with cache-busting, `.claude/serve-nocache.py`
(wired up as the `static-server` launch config) serves the same root without
caching stale `js/`.

Deployment is just uploading the repo root (minus `shells/`, `docs/`, `.claude/`)
to any static host — no server-side logic, no environment variables, no API
keys.

---

## Desktop (Steam / Electron)

Directory: `shells/desktop/`. Wraps the same files in an Electron window,
served over a privileged `tw://` scheme (not `loadFile()` — see the header
comment in `main.cjs` for why plain `file://` doesn't work here).

### Prerequisites

- Node.js (any version compatible with Electron 33; the dev box runs Node 22)
- On Linux, the usual Electron build dependencies for your distro if packaging
  `AppImage`/`.deb`-style output

### Run in dev

```bash
cd shells/desktop
npm install
npm start
```

This launches Electron pointed at the repo root two directories up — no
staging, no copy step. Edits to the game core are picked up on relaunch.

### Smoke test (headless, no window)

```bash
cd shells/desktop
TW_SMOKE=1 npx electron .
```

Boots hidden, proves the `tw://` fetch path plus a save/continue cycle, prints
one JSON line, and exits. Useful for CI or a quick sanity check without
opening a window.

### Package a distributable build

```bash
cd shells/desktop
npm install
npm run dist
```

Runs `electron-builder`, which stages the game core into `extraResources`
(filtered by `shells/file-manifest.json`) and produces installers under
`shells/desktop/dist/`:

- **Windows** — NSIS installer (`.exe`)
- **macOS** — `.dmg` and `.zip`
- **Linux** — `AppImage` and `.tar.gz`

electron-builder cross-builds some combinations but not all (e.g. producing a
signed `.dmg` generally requires building on macOS). Run on the target OS for
best results, especially for macOS/Windows code signing.

App identity (bundle id, product name) comes from
[`shells/app-identity.cjs`](../shells/app-identity.cjs) — edit that one file
for a rebrand, not `electron-builder.cjs` or `package.json` directly (see that
file's header comment for why the product name differs by one character
between shells).

`steam_appid.txt` (gitignored, `480` = Spacewar test app id locally) and the
optional `steamworks.js` dependency are the Steam integration seam — swap the
app id for the real one before a Steam-bound build.

### Icon / build resources

`shells/desktop/build/icon.png` is read by electron-builder for the app icon
across platforms.

---

## Mobile (iOS / Android via Capacitor)

Directory: `shells/mobile/`. The game core is staged byte-identical into the
gitignored `www/` folder by `scripts/sync-www.mjs` (reading the same
`shells/file-manifest.json`), then copied into the native projects by
`cap sync`. Native `android/` and `ios/` projects are already checked into
this repo with the required orientation/status-bar config applied — see
[`shells/mobile/README.md`](../shells/mobile/README.md) for the exact
manifest/plist settings and the on-device checklist to run after any first
build on a platform.

### Prerequisites

- Node.js
- **Android**: Android Studio (or the Android SDK + JDK 17 standalone)
- **iOS**: a Mac with Xcode and CocoaPods (`pod install` runs automatically
  via `cap sync ios`)

### Install dependencies

```bash
cd shells/mobile
npm install
```

### Android

```bash
npm run android          # sync (stage + cap sync) + build + run on device/emulator
```

or, to build from Android Studio instead:

```bash
npm run sync
npx cap open android
```

### iOS (Mac only)

```bash
npm run ios
```

or:

```bash
npm run sync
npx cap open ios
```

### Just re-staging without building

```bash
npm run sync
```

Runs `scripts/sync-www.mjs` (stages the game core into `www/`) then
`npx cap sync` (copies `www/` into both native projects and regenerates their
Capacitor config). Run this any time the game core changes and before opening
either native IDE directly.

### App identity

Same shared source as desktop: [`shells/app-identity.cjs`](../shells/app-identity.cjs),
read by `capacitor.config.js`. `cap sync`/`cap update` also rewrite each
platform's `config.xml` from `capacitor.config.js`'s `cordova.accessOrigins` —
edit that array, not the generated `config.xml` files, if origins ever need to
change.

### On-device checklist

Run through the 9-point checklist in
[`shells/mobile/README.md`](../shells/mobile/README.md#on-device-checklist-run-on-first-build-of-each-platform)
on the first build of each platform — it covers the Preferences-storage
durability drill, orientation lock, status bar, keep-awake, back button, audio
unlock, and backgrounding behavior that don't show up in a quick glance.

---

## Quick reference

| Target | Directory | Install | Dev run | Production build |
|---|---|---|---|---|
| Web | repo root | — | `python3 -m http.server 8000` | copy repo root to a static host |
| Desktop | `shells/desktop/` | `npm install` | `npm start` | `npm run dist` |
| Android | `shells/mobile/` | `npm install` | `npm run android` | `npm run sync && npx cap open android` → build in Android Studio |
| iOS | `shells/mobile/` | `npm install` | `npm run ios` | `npm run sync && npx cap open ios` → archive in Xcode |
