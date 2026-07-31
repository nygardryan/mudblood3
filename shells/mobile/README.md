# Trenchworks: WW2 — mobile shell (Capacitor)

The game core lives at the repo root and is **never edited here**. `npm run sync`
stages it byte-identical into `www/` (gitignored) and runs `cap sync`, which
copies it into the native projects. `scripts/sync-www.mjs` exists only because
`cap sync` has no exclude support — its file list reads
`shells/file-manifest.json`, the single source also read by
`shells/desktop/electron-builder.cjs`'s `extraResources`.

The shell-specific behavior (durable-save mirror into Preferences, KeepAwake,
status bar, Android back button) lives in `js/platform.js` at the repo root —
the mobile branch only runs when Capacitor's native bridge is present.

## Building

Requires Node plus the native toolchains (neither is on the dev Linux box):

- **Android**: Android Studio (or SDK + JDK 17). Then:
  ```
  npm install
  npm run android          # sync + build + run on device/emulator
  ```
  or `npm run sync && npx cap open android` to build from Android Studio.
- **iOS**: a Mac with Xcode. `ios/` and its native config (below) are already
  in this repo — building only needs `pod install` (via `npx cap sync ios` or
  `npx cap open ios`). `npm run ios` or `npx cap open ios`.

## Native config (applied once per platform)

- **Android** (already applied in this repo):
  - `android/app/src/main/AndroidManifest.xml` — `android:screenOrientation="sensorLandscape"`
    on MainActivity (landscape-first game, locked at the OS level).
  - `android/app/src/main/res/values/styles.xml` — `android:windowFullscreen` on
    `AppTheme.NoActionBar` (status bar gone from the first frame).
- **iOS** (already applied in this repo):
  - Info.plist: `UISupportedInterfaceOrientations` = LandscapeLeft + LandscapeRight
    only (both iPhone and iPad sets).
  - Info.plist: `UIStatusBarHidden` = YES, `UIViewControllerBasedStatusBarAppearance` = NO.

## On-device checklist (run on first build of each platform)

1. Boot: attach devtools (Android: `chrome://inspect`; iOS: Safari Web Inspector).
   `PLATFORM.id === 'mobile'`, no console errors.
2. Drive the game's own harness: `TEST.start('endless','easy')`, `TEST.step(30)`,
   `TEST.save()`, `TEST.reset()`, `TEST.continue()` — resumes the same board.
3. **Durability drill** (the reason the Preferences mirror exists): with a run
   saved and cards/medals present, run `localStorage.clear()` in devtools, kill
   the app, relaunch. The run save, cards, leaderboards and campaign progress
   must reappear (restored from Preferences); settings may reset — accepted.
4. Rotation: device locked to landscape either way up; no portrait flash at launch.
5. Status bar hidden; safe-area padding present around notches (CSS already
   handles it — just confirm nothing sits under the cutout).
6. Screen stays awake through a minute of hands-off play (KeepAwake).
7. Android back button: pauses a live run; exits the app from the menu.
8. Audio: silent until first tap, then SFX + music play (gesture unlock —
   same behavior as the web).
9. Backgrounding: home-button out and back — music pauses/resumes
   (`visibilitychange` in js/music.js), sim resumes without a dt spike.
