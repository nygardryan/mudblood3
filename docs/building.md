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

### Running the DEMO on web

Add `?demo=1` to the URL. Nothing to build, nothing to stage:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000/?demo=1
```

That is the whole switch — `PLATFORM.isDemo` reads the query param, and every
restriction hangs off it (see [Demo builds](#demo-builds) below for what
changes). It works on any served copy, including a deployed full-game site, so
it is the quickest way to see or screenshot demo behavior. `TEST.demo()`
reports the live state and `TEST.demo(true|false|null)` flips it at runtime
without a reload.

> **Careful on a shared origin.** A browser keeps one localStorage per origin,
> so `http://localhost:8000/?demo=1` and `http://localhost:8000/` share medals,
> the card collection, the escalation ladder and the single run-save slot. The
> demo never *writes* a restriction down (it caps at read), and it will not
> resume or delete a Japanese/Horde/Italian save — but starting a demo run
> still goes through the normal ABANDON prompt and can overwrite the save slot,
> exactly as a full-game start would. **Ship the real web demo on its own
> origin** (see below), where the two can never touch.

To produce a deployable web demo:

```bash
node scripts/stage-web-demo.mjs
```

Stages `dist-web-demo/` (gitignored) from the same
[`shells/file-manifest.json`](../shells/file-manifest.json) subset, with
`js/demo-flag.js` flipped to `true` so the demo needs no URL param. Upload that
directory to the demo's **own** origin/subdomain.

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

## Demo builds

The demo is the **same file set with one flag flipped** — never a fork, never a
separate branch. It ships on Steam (a demo app attached to the store page) and
on Google Play (a separate free listing), plus a web build. **There is no iOS
demo**: Apple's App Review guidelines bar demo, trial and beta apps from the App
Store outright, so the iOS target is left alone entirely.

### The flag

`js/demo-flag.js` is committed as `const TW_DEMO_BUILD = false;` and **stays
false in the repo forever**. Each target flips it its own way at build/serve
time, so no build ever edits a tracked file:

| Target | How the flag is flipped |
|---|---|
| Web (testing) | `?demo=1` in the URL — no staging at all (the pitch screen shows on every load) |
| Web (deploy) | `node scripts/stage-web-demo.mjs` rewrites the staged copy in `dist-web-demo/` |
| Desktop | `main.cjs` *serves* a generated `true` copy over `tw://`, keyed on `TW_DEMO_BUILD=1` (dev) or the packaged `package.json`'s `twDemo` field |
| Mobile | `sync-www.mjs` overwrites the staged `www/js/demo-flag.js` under `TW_DEMO_BUILD=1` |

`js/platform.js` turns that into `PLATFORM.isDemo`, and `js/demo.js` is the one
module that decides what the demo restricts. See `CLAUDE.md` for the gating
rules; the short version is that **every restriction is applied at read**, so a
demo can never corrupt full-game progress that shares its storage.

### What the demo restricts

- **Germans only** — the endless faction roll is pinned (menu attract mode too),
  and the codex hides the other three armies' rosters.
- **A reduced shop** — 8 units, 3 defenses and the 2 strikes are buyable. The
  rest stay on the toolbar as dimmed, unclickable buttons carrying a **FULL
  GAME** banner.
- **A 17-card pool** in the card shop. Once it's collected, full-game cards
  appear in the offer slots behind a diagonal **FULL GAME ONLY** banner and
  can't be bought.
- **Escalation capped at rung III**; rungs IV–X show as FULL GAME in the dossier.
- **No DEV TOOLS section in Settings** — `#settings-dev-tools` is removed rather
  than hidden (`js/settings.js`). It is one of the two places that reached *past*
  the gate instead of through it: TESTING appends the three enemy rosters to the
  toolbar, so it grew JAPANESE/HORDE/ITALIAN tabs and every wave-100 boss;
  SANDBOX's unlimited TP undersells the economy; and CHANGELOG names the Yamato,
  the Progenitor, the Treno Armato and rungs VI and X, which the dossier
  deliberately withholds. Read-side like everything else here — the sandbox and
  testing difficulty tiers still exist (`TEST.start` uses them) and the
  `#changelog` overlay is untouched, only the way in is gone.
- **No EXPORT SPRITE PACK row** — the other one, removed the same way and in the
  same file. `spriteDefs()` walks `UNIT_TYPES`/`ENEMY_TYPES` by flag and the demo
  prunes neither, so the ZIP ships the three hidden rosters, all four wave-100
  bosses, the Alien Walker and the three hidden biome plates as PNGs, in a
  manifest naming each. A demo build has nowhere to install a pack either, so the
  row's only realizable output was that ZIP. ART OFF/ON stays (a demo can still
  ship with a pack baked in), and `TEST.exportSprites()` is untouched.
- No wave cap — demo runs are endless like the full game.

It also **opens on a value-proposition screen** every launch, over the menu, and
closes on one button (or Escape / Android back). Nothing is persisted and there
is deliberately no store link — the URL differs per shell, and the repo has no
outbound links at all. Every figure on it is derived from the sets above rather
than written down, so retuning the gate can't leave it advertising a build this
one isn't; `TEST.demoPitch(true)` raises it, in a full-game tab too.

### Building each demo target

```bash
# Web
node scripts/stage-web-demo.mjs            # → dist-web-demo/, deploy to its OWN origin

# Desktop / Steam demo depot
cd shells/desktop
npm run start:demo                         # dev run
npm run dist:demo                          # → dist-demo/, demo appId + product name
TW_SMOKE=1 TW_DEMO_BUILD=1 npx electron .  # headless demo smoke test

# Google Play demo listing
cd shells/mobile
npm run sync:demo                          # stage www/ with the flag flipped
npm run android:demo                       # dev run on a device
cd android && ./gradlew bundleDemoRelease   # → the .aab for the demo listing
```

Two things to remember:

- **The staged `www/` is whichever sync ran last.** A leftover demo staging
  will demo-ify the next *full* build. Run `npm run sync` to restore it.
- **The demo is a separate store product.** Its identity lives beside the full
  game's in [`shells/app-identity.cjs`](../shells/app-identity.cjs)
  (`DEMO_APP_ID` / `DEMO_APP_NAME` / `DEMO_PRODUCT_NAME_FS`). On Android the
  `demo` Gradle product flavor owns the `.demo` applicationId suffix — those two
  must stay in step. On Steam, register the demo as its own app in Steamworks
  and attach it to the main store page; its appid goes in the gitignored
  `steam_appid.txt` for dev launches.

---

## Quick reference

| Target | Directory | Install | Dev run | Production build |
|---|---|---|---|---|
| Web | repo root | — | `python3 -m http.server 8000` | copy repo root to a static host |
| Desktop | `shells/desktop/` | `npm install` | `npm start` | `npm run dist` |
| Android | `shells/mobile/` | `npm install` | `npm run android` | `npm run sync && npx cap open android` → build in Android Studio |
| iOS | `shells/mobile/` | `npm install` | `npm run ios` | `npm run sync && npx cap open ios` → archive in Xcode |
| Web **demo** | repo root | — | serve + `?demo=1` | `node scripts/stage-web-demo.mjs` → deploy `dist-web-demo/` |
| Desktop **demo** | `shells/desktop/` | `npm install` | `npm run start:demo` | `npm run dist:demo` |
| Android **demo** | `shells/mobile/` | `npm install` | `npm run android:demo` | `npm run sync:demo` → `./gradlew bundleDemoRelease` |
| iOS demo | — | — | — | **not shipped** (App Store bars demo apps) |
