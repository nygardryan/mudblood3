# Trenchworks: WW2 — agent notes

WW2 squad-defense game, landscape-first: enemies stage LEFT of the field
(`x < 0`) and march down-field at +x onto the player's trench at `DEPLOY_X`
(502); a breach is `x > W`. `x` is the DEPTH axis, `y` the lateral; the field
is `W=880 x H=406` — cut to exactly 19.5:9 so the mobile cover-zoom default
fills a modern phone with little or no lateral crop (it shipped at H=460,
sized for the old contain/letterbox default, and cover then cropped ~12% of
the lateral axis); see the comment on `W`/`H` in constants.js for why the fix
was an H cut and not a W stretch, and for the desktop letterbox trade. `DEPLOY_X`/`FORWARD_X` (502/251) have since moved twice from
their first landscape values (380/207) — first out to even thirds, then the
deploy zone widened again on purpose to ~43% of the field (up from an even
33%), taking the other 10 points evenly off the enemy-approach and
no-man's-land zones; see the comment on `DEPLOY_X` in constants.js for the
rationale and for why every boss/weapon-range calibration below moves with
it each time. Screen-relative visuals (particles, fake-Z arcs, floating
text, shadows at +y, HP bars at -y) still treat screen-up as up — never axis-swap
those. Plain HTML5 Canvas + vanilla JS, **no build step, no
package.json, no test framework**. Scripts in `js/` share one global scope and
load in dependency order via `index.html` (`main.js` second-to-last,
`test-api.js` last). See README.md for gameplay and the per-file map.

## Running it

Serve statically — `.claude/launch.json` already defines a `static-server`
config (python3 http.server). Use the preview/browser tooling, not Bash.

## Shells — desktop (Steam) and mobile

The web version at the repo root IS the game; `shells/desktop/` (Electron, for
Steam) and `shells/mobile/` (Capacitor) are wrappers that ship the SAME files.
**Nothing is ever copied or forked into a shell** — build-time staging only.
The one seam is `js/platform.js`, loaded before every other script:
`PLATFORM.id` (`'web'`/`'desktop'`/`'mobile'`), `PLATFORM.storage` (used by the
four durable stores — `twRunSave`/`endlessCards`/`endlessLeaderboard`/
`campaignProgress` — mirrored into Capacitor Preferences on mobile because iOS
can evict WKWebView storage; `settings.js` and `sprites.js` stay on raw
localStorage ON PURPOSE: trivially re-creatable, and sprites reads at top-level
init before any async restore could land), and `PLATFORM.onReady` (synchronous-
when-ready — `main.js`'s bootstrap tail runs inside it; on web/desktop it runs
inline, so web boot order is exactly pre-shim). On the web every PLATFORM
member is an inert no-op — the shim must stay free when no shell is present,
the same rule ESCALATION rung 0 follows. Electron serves the root over the
privileged `tw://` scheme because the core `fetch()`es its audio and sprite
manifest and Chromium blocks fetch on `file://` — never `loadFile()`.
`TW_SMOKE=1 npx electron .` (in `shells/desktop`) boots hidden, proves the
tw:// fetch path plus a save/continue cycle, prints one JSON line and exits.
The staged file subset is spelled out twice — `electron-builder.yml`
`extraResources` and `shells/mobile/scripts/sync-www.mjs` — a new root-level
file or asset dir the game reads must be added to BOTH. Two settings controls
are runtime-gated the same way and both NEVER CREATE the control rather than
hiding it (this sheet has no generic `.hidden` rule): the desktop-only
QUIT/FULLSCREEN section on `PLATFORM.isDesktop`, and the sprite-pack EXPORT
row, which `PLATFORM.isMobile` removes because its `<a download>` on a `blob:`
URL is a no-op in both mobile webviews — it would bake all 183 drawables and
silently produce nothing.

**`PLATFORM.onReady` is gated by a WATCHDOG, and that is not belt-and-braces.**
Mobile defers the whole bootstrap — menu, layout, the frame loop — behind the
Preferences restore, so a bridge call that never SETTLES is a black screen with
no error and no recovery. `finally` does not cover that case (it runs when the
body settles or throws, never when an await hangs), so `BOOT_GATE_MS` opens the
gate regardless and `openGate()` is idempotent. A restore that lands *after*
the watchdog fired is DROPPED on purpose: `refreshMenu` has already read
storage and decided there is no save, and writing one in behind that menu is a
save the player can't see. The mirror keeps it for the next launch.

The mirror's contract is "a copy of what localStorage holds", which is what
lets the restore prefer localStorage unconditionally — so `storage.set` mirrors
ONLY when the synchronous write succeeded. Mirroring a value localStorage
rejected on quota would strand the fresher blob in Preferences behind the stale
one the restore keeps choosing. `DURABLE_KEYS` has to be string literals
(platform.js loads first, before the four key constants exist), so
`checkDurableKeys` reconciles it with them on `DOMContentLoaded` — a renamed
key would otherwise retire that store's durability with no error anywhere.

**Fonts are bundled, not fetched** (`css/fonts.css` + `assets/fonts/`, generated
by `.claude/vendor-fonts.mjs`): the three `fonts.googleapis.com` `@import`s were
the game's only runtime network dependency, and a Steam offline launch or an
airplane-mode phone fell back to system fonts. latin AND latin-ext are kept —
the leaderboard name field is free text, and a latin-only bundle drops an
accented name onto a system font mid-word. Each family's LICENSE is vendored
beside its woff2 and ships in both bundles; bundling the binaries is what makes
that notice a redistribution requirement where hot-linking was compliant by
construction. Six families are OFL, Special Elite is Apache-2.0 — the script
probes upstream for each rather than assuming, and throws rather than shipping
a font it found no license for.

## Testing — use `window.TEST`

**Do not try to test this game visually or via the DOM.** Known environment
gotchas, discovered the hard way:

- **Screenshots time out** — the continuous rAF render loop keeps the
  compositor busy, so screenshot capture never settles.
- **The accessibility tree is blind** — all gameplay is canvas pixels;
  `read_page` sees ~2 of the ~70 real buttons and none of the game.
- **The game loop is frozen under automation** — hidden tabs throttle
  `requestAnimationFrame` to a standstill, so after starting a game,
  `G.time` never advances on its own.

The in-page harness `js/test-api.js` (global `TEST`) packages the workarounds.
Drive it via JS execution in the game tab; every call returns plain JSON.

```js
TEST.help()                        // API + valid level ids / difficulties / unit & enemy keys + buyableNow
TEST.start('endless', 'easy')      // validated start — THROWS on bad ids
                                   // (bare startGame() silently falls back to endless!)
TEST.start('endless','easy','jp')  // 3rd arg pins the endless enemy faction roll:
                                   // 'de' (Wehrmacht), 'jp' (Imperial Japanese Army),
                                   // 'zo' (The Horde — undead), or 'it' (Regio Esercito).
                                   // omitted = rolled per run at EVERY escalation rung
                                   // (rollEnemyFaction, js/state.js — uniform except that
                                   // it never repeats the previous run's army).
                                   // state().enemyFaction reports it.
TEST.escalation()                  // report the ESCALATION ladder: {level, unlocked, mods, active}
TEST.escalation(7)                 // UNLOCK + select rung 7 (the real unlock costs a boss kill
                                   // per rung). Writes the save — lands on the NEXT start().
TEST.deploy('gunner', 0.75, 0.5)   // FREE god-mode spawn; (0..1] coords = fractions of field
                                   // (x = depth toward the player's right-side trench, y = lateral)
TEST.deploy('sandbags', 0.7, 0.4)  // deploys ANY placeable — defenses, supports, German test units
TEST.buy('gunner', 0.75, 0.5)      // REALISTIC purchase: charges TP, checks cap/placement, runs place()
TEST.step(30)                      // advance 30 sim-seconds (pumps update() manually), redraws
TEST.state()                       // {mode, phase, wave, tp, kills, breaches, units, enemies, ...}
TEST.roster()                      // per-actor detail {units,enemies}: type, pos, hp, rank, kills
TEST.catalog()                     // what's buyable now: {key,label,kind,cost,affordable,atCap}
TEST.costs()                       // {key: resolved TP cost} (honours difficulty/cards/overrides)
TEST.works()                       // Regio Esercito field works: kind, pos, hp, fortify tier, occ/cap
TEST.inspect(x, y)                 // hover blurb for whatever is at a point: name, hp, rank, stats,
                                   // desc. Actors first (units beat enemies only by distance), then
                                   // the emplacement under them — {kind:'emplacement', key, tier}
TEST.terrain()                     // ground art for the running biome: which of the two plates the
                                   // pack HAS vs which the baked field was actually painted from
TEST.event('smokescreen')          // fire a random event on demand, ignoring its wave gate
TEST.setTP(100) / TEST.addTP(20)   // script TP for a scenario
TEST.autoplay({ seconds: 240 })    // autonomous endless player: spends+steps, returns {over,waves,log}
TEST.stepUntil(g => g.kills > 0, 60)
TEST.spawnEnemy('panzer', 0.1, 0.5)  // defense modes only (staging is negative x)
TEST.reset()                       // back to main menu
```

**`deploy` (free) vs `buy` (real).** `deploy` is a permissive setup primitive:
no TP, no placement rules, and it now spawns *any* placeable — units, defenses
(`sandbags`/`bunker`/`wire`/`mine`/…), support strikes (`mortar`/`artillery`),
and the German test roster. `buy` models the actual player action: it resolves
the item from the live toolbar, charges TP via the real `place()` path (card
hooks, officer cap, radial placement fallback and all), and reports
`{tpBefore, tpAfter, spent}`. Reach for `buy` when the question is how the
economy/difficulty *feels*; use `deploy` to force a board state. Both route
creation through the game's own `applyPlacement()` (in `js/input.js`), so a
harness placement can never drift from a toolbar placement.

**Der Schlächter** (`eboss`) is the German final boss: a dark-haired revolver
man who takes the field every 100th German wave (`spawnGermanBoss` hook at the
top of `spawnSpecialWave` in `js/waves.js`; replaces that wave's themed
special, and each return is `w/100 ×` HP). 3150 HP (`noRamp:true` exempts him
from `enemyHpRamp`), self-plated body+flak armor, and a three-state AI
(`updateGermanBoss` in `js/update-enemies.js`): advance down one of five
`BOSS_LANES` firing 6 revolver shots (190 dmg; `revolver.armorDmg` = flat 490
vs anything armored — see `fireShot`), retreat to `BOSS_BACKLINE_X` (on-field,
so artillery can punish the refit), refill armor and call two DISTINCT
reinforcement plays (`bossCallReinforcements`: smokescreen/airraid via
`runEvent`, paradrop, vehicle column, human wave), then advance again down a
lane ≥ 2 indices away. Immune to prone/suppression (`t.boss` checks in
`tryGoProne`/`suppress`) and stun (dispatch order + `maybeShellShock`); can
never breach (`BOSS_SAFE_X` clamp). Killing him fires `bossVictory()`
(`js/flow.js`): the sim pauses under a `#boss-victory` overlay offering FIGHT
ON (run continues, boss returns at the next ×100) or END RUN — VICTORY (full
`endRun(true, …)` recap). **That overlay is shared with the Yamato** — its title
and copy come from `bossVictoryCopy()`, keyed on `G.enemyFaction`, so anything
added there needs wording for both. Tuning in the `BOSS_` block in `js/constants.js`;
art is `paintGermanBoss` (`js/render-soldier.js`) + `drawRevolver`
(`js/render-weapons.js`); wide always-on bars via `drawBossOverlays`, which like
every other boss's overlay is now just a call to the shared `drawBossHpBar` /
`drawBossPartBar` in `js/render-overlays.js` — the Yamato's look (one 5px bar in a
black surround, tick marks, the name in 7px monospace above it) is the house style
for all five, so a fifth boss gets it by passing a width and a caption. He is drawn
as nothing but an OVERSIZED INFANTRYMAN: an officer's body ellipse, a standard
head, and the rifleman's own belt kit (`drawErifleKit`), all pushed through one
uniform `BOSS_SPRITE_SCALE` (1.35×) — his `gun:14` exists so the barrel clears
the scaled coat. Every attempt to make him look important by adding GIRTH
instead of size (a 1.45× scale, a rear coat-flare ellipse, a wide pale collar
crescent, shoulder boards) read as a dark blob rather than a man, because they
widened him without lengthening him. Change the scale, never the local ratios.
`deploy('eboss', …)` works (he's in `TESTING_GERMAN_PLACEABLES`) and his state
lives on the enemy object: `bossState`/`shots`/`lane`/`laneY`/`rallyT`.

The **Imperial Japanese Army** is the alternate endless foe (`faction:'jp'` in
`ENEMY_TYPES`, 15 line keys: `jrifle`/`jbanzai`/`jsmg`/`jgren`/`jlmg`/`jhmg`/`jsniper`/
`jknee`/`jmortar`/`jlunge`/`joff`/`jflame`/`jhago`/`jtank`/`jchinu`, plus the boss
and her parts below). `deploy` spawns any of them (they're in
`TESTING_JAPANESE_PLACEABLES`); wave spawning routes through `japWaveComposition`
and `JP_SPECIAL_WAVES` when `G.enemyFaction === 'jp'`. Japanese infantry are
fanatics (never prone — see `tryGoProne`); `jbanzai` is a melee charger and
`jlunge` a suicide anti-tank unit, both with their own AI in `js/update-enemies.js`.
Their art lives in `js/render-japanese.js` (`paintJapaneseSoldier`).

The **Yamato** (`jyamato`) is the Japanese wave-100 boss — a land battleship on
treads, arriving every 100th JP wave (`spawnJapaneseBoss`, hooked in
`spawnSpecialWave` beside the German one). Alone among the bosses she is staged off
a **FLANK** (the top or bottom edge) rather than off the enemy end, and **rolls
in** to `YAM_Y_MARGIN` (`yamatoRollIn`), inert and untouchable until she gets
there — no guns, no landing party, no clamps, via one early-out in
`updateYamato`. She has to be, because the staging strip is held off the field by
an `x < 0` test in every scan and a 300px hull lying broadside-on does not fit in
it. `entering` (stamped on the hull AND all ten parts, cleared together on
arrival) is what stands in for that gate — **nothing anywhere in this game gates
on `y`**, so without it her stern would be shootable while off-screen.

That term now lives in **`inTheFight(a)`** (`js/helpers.js`), the one predicate for
"alive and actually on the field": `dead`, `x < 0` (staging strip), `chute > 0`
(canopy still up) and `entering`. It was extracted because the rule had GROWN
twice and each addition — `chute` for paradrops, `entering` for her — cost a hand
sweep of the sixteen sites that spelled it out across targeting/shooting/input/
update/cards, and one of them (`maybeOfficerFireMission`) was still carrying only
two of the four terms in a stale form. A fifth term should be one edit. Verified
identical to the expressions it replaced over all 180 combinations of those four
fields. The **three faction rosters** (`isJapaneseInfantry`, `isItalianFoot`,
`isZombie` in `js/update-enemies.js`) were the last hand-rolled copies, and had
drifted apart exactly as predicted: `isItalianFoot` folded `chute` IN while the
other two left it out and made their one caller append `|| o.chute > 0` by hand,
and none of the three carried the staging test, so all three reached into the staging
strip. Measured to wave 24: staging men counted in 20% of sampled seconds, worst
7 of 13, flipping `italianForce`'s `IT_AVANTI_PRESSURE_FORCE` gate in 7 of them —
so the AVANTI clock accelerated on a force that had not arrived. They take
`inTheFight` now; keep the `!t.tank`/`!t.fixed` terms, which are theirs.
`damageEnemy` keeps its own early-outs on `entering`/`chute` — that is the
backstop, not the gate, and the scans still have to hold: an actor admitted to a
scan it cannot hurt burns the pick (the Alien Walker's once-per-sweep `Set` is
where that bites). Sites that invert the rule on purpose keep their own
predicates: AA fire hunts `chute > 0` because that is exactly what it shoots, and
`explode`'s blast passes UNDER a descending stick. She is the **first of
two multi-hitbox actors** (the Progenitor below is the other), and that is the thing to understand
before touching her: every other
actor here is a bare `(x,y)` point — there is no `r`/`w`/`h` field anywhere in
`UNIT_TYPES`/`ENEMY_TYPES`, and the size ternaries in input/inspector/mines are
never read by the combat sim. So she is a **parent actor plus ten child part
actors, all real entries in `G.enemies`**, repositioned from her `x`/`y`/`heading`
every tick by `syncYamatoParts`. Parts are still points, so targeting, `fireShot`,
`explode`, mouse-pick, focus-fire and the inspector all work on her unchanged.
- `jyhull` ×4 — armor-belt hitboxes. Pure hitboxes: `damageEnemy` **redirects** them
  into the hull's pool at the top of the function. The hull core is itself the
  amidships hitbox, which is why there's no belt section at `sOff 0`.
- `jyturret` ×2 — triple batteries, own HP, each picking its own target and laying
  its own bearing (`p.tur`, absolute world angle, clamped to a wedge off the beam).
- `jymg` ×4 — gun tubs, own HP, **not** `tank`, so small arms work on them. Only the
  two on the engaged broadside fire; `YAM_MG_B` (their abeam offset) is a mechanic,
  not decoration — every scan picks by raw distance, so that offset is the only
  reason riflemen shoot crews instead of pinging the ×0.04 belt.

Two damage paths had to be de-duped or one hit counted 3-5× (`explode`'s enemy loop,
and `flameSpray`, whose ×0.6 tank floor made one veteran flamer the best
anti-battleship weapon in the game at ~120 dps — now ×0.06 vs the belt, so flamers
strip her tubs instead). She's driven entirely from `updateYamato`; parts get a bare
`return` in `updateEnemy`, because `tank:true` would otherwise route them to
`updateTank` and throw. Abilities: an SNLF landing party (the fight's economy — her
escorts pay for the artillery that kills her) and damage control, which revives one
knocked-out part and **must re-`push` it into `G.enemies`**. Her batteries and tubs
are also PLATED by her own health (`YAM_SEGMENTS`/`YAM_PART_RESIST`) — see the
shared `bossPartDamageMult` rule below the train. Tuning is the `YAM_`
block in `js/constants.js`; art is `js/render-yamato.js` (`drawYamatoPass` runs
before the enemy loop so escorts paint over her deck). Note `TEST.state().enemies`
total and HP are **inflated by her parts** — 11 actors, and the belt mirrors her pool.

**The Horde** is the third endless foe (`faction:'zo'` in `ENEMY_TYPES`, 12 keys:
`zshambler`/`zrunner`/`zcrawler`/`zhound`/`zbrute`/`zspitter`/`zbloater`/
`zscreamer`/`zrevenant`/`zabom`, plus the boss and its pods below) — the only foe
that isn't a national army, and
the only one built around **infection** rather than a discipline mechanic. Most of
the roster is melee (`zombie:true`, routed to `updateZombie` in
`js/update-enemies.js`), and a bite (`zombieBite`) rolls the type's `infect`
chance to plant the infection in a defender. An infected man (`u.infected` timer,
`u.infectMax`) rots via `tickInfection` (in update-enemies, called from
`updateUnit`), losing HP in ticks; if he isn't cured he dies and **reanimates**
on the enemy side (`reanimateAsUndead` → a `zrunner`/`zshambler`). Reanimation is
also triggered from the death path in `js/damage.js` (`damageUnit`, when
`u.infected > 0 && G.enemyFaction === 'zo'`). A **medic** is the hard counter —
`cureNearestInfected` (in `js/update-friendlies.js`) burns the infection timer
down faster than it climbs and saves the man. Tuning: `INFECT_TURN_MIN/MAX`,
`INFECT_DOT`, `INFECT_DOT_INTERVAL`, `INFECT_CURE_PER_SEC` in `js/constants.js`.
There's no armor and almost no ranged fire. **Nothing suppresses the dead.** The
beaten-zone pin skips them outright (the `faction === 'zo'` return in `suppress`,
`js/shooting.js` — a single BAR used to freeze the whole pack solid), and the
near-miss flinch in `tryGoProne` is scaled down to a stagger by
`ZOM_PRONE_CHANCE_MULT`/`ZOM_PRONE_TIME_MULT`. That half is deliberately a
SCALAR and not a `jp`-style exemption: prone is worth 60% dodge, so exempting
them outright would make the Horde relentless *and* easier to shoot, and only
the relentlessness is wanted. Measured with 8 gunners on a 14-shambler board,
interleaved A/B: ~23% → ~7% of the pack down at any moment; per flinch roll,
0.65 → 0.097 chance and 3.5s → 1.2s. Signature units:
- `zspitter` — the one ranged threat: a `spit` spec lobs a corrosive **bile** glob
  (`fireBile` → `G.biles`, updated in `js/update.js`, burst by `bileBurst`) that
  damages AND infects in a splash. Blind up close (shambles if you get inside `min`).
- `zbloater` — `bloat` spec: bursts on death OR on reaching the line
  (`bloaterBurst`, `e._burst` guard) into a cloud of infectious rot (`bileBurst`).
  A walking mine — hooked in `damageEnemy` (damage.js) and in `updateZombie`.
- `zscreamer` — the horde's "officer": `aura:true` (speeds nearby dead via the
  normal `enemyOfficerNear`/`buffed` path) + `frenzyCmd:true` → the shared
  `officerCommand` clock (see **Enemy officer commands** below) hurls nearby
  zombies into a `chargeT` sprint (mirror of the banzai/avanti command).
- `zrevenant` — the ONLY gunman: no `zombie` flag, so it falls through to the
  standard ranged path (Kar98, poor `acc`). Its bullets wound but don't infect.
- `zabom` (Abomination) — `boss:true`: enormous HP standing in for armor; its bite
  sweeps every defender at reach and near-certainly infects. Rare, late.
- `zhound` — `hound:true`: a quadruped, drawn by its own `paintZombieHound` branch.
  It also carries the game's only `pounce` spec, a leap that closes the last
  stretch in one bound (`houndPounce`, a pre-step inside `updateZombie` in the
  `updateGarrison` shape). Three things about it are the design, not detail.
  **It stays a GROUND actor for the whole flight** — `x`/`y` interpolate along
  the ground and the height is `pounceArc`, a render-only scalar the painter
  subtracts from y, exactly how the Spitter's bile glob fakes one. There is no z
  on any actor here, and the one airborne state that does exist, `chute > 0`, is
  ~15 guards scattered through targeting, shooting, damage and update; staying
  grounded keeps the hound shootable, minable and inspectable mid-leap for
  nothing. A pounce is a burst of speed, not an invulnerability window.
  **Wire GROUNDS it** (`wireOnLeap`, beside `pursuePoint`): the drag clause in
  `pursuePoint` is the only thing barbed wire does to a melee zombie, so a leap
  that hurdled a band would quietly retire wire and the Razor Wire card against
  the fastest thing the Horde fields. The test samples the leap line with the
  *same* band predicate the drag uses — the two agreeing about where a band is
  matters more than a tidier slab test. Measured: on open ground it launches at
  60px and lands at 13, inside the 15 bite reach; with a band on the line it
  never leaves the dirt and takes the ×0.126 drag as before.
  It is a **pure gap-closer** — nothing lands on touchdown, so the ordinary
  reach/cooldown bite takes over on the next frame with no impact code anywhere
  (measured balance-neutral, n=8/side interleaved: every delta inside 1 sd).
  Two holes it fell into first, both about state that outlives a frame: the
  committed flight is stepped ABOVE `updateZombie`'s target check, or a hound
  whose man dies mid-leap falls to `advance()` and walks on frozen at full arc
  forever; and `abortPounce` collapses it in `updateEnemy`'s stun and prone
  blocks, which return above every dispatch and would otherwise leave it hanging
  in the air. `soldierCacheable` gets `pounceT` (the sprite cache keys on facing
  with no slot for a pose), and `paintZombieHound` stays PURE — every airborne
  term is scaled by `arc / lift`, so an actor that has never leapt bakes
  pixel-identically for the codex portrait and the exporter (verified 0 diff).
`deploy` spawns any of them (they're in `TESTING_ZOMBIE_PLACEABLES`); wave spawning
routes through `zomWaveComposition` and `ZOM_SPECIAL_WAVES` when
`G.enemyFaction === 'zo'`, and the paradrop event becomes "the dead rise behind you"
(`triggerHordeRising` in `js/events.js`). Their art lives in `js/render-zombie.js`
(`paintZombieSoldier`). Infected defenders get a green overlay/rot bar in
`drawSoldierOverlays` (`js/render-soldier.js`).

**The Progenitor** (`zprogen`) is the Horde's wave-100 boss — a crawling slab of
flesh, arriving every 100th `'zo'` wave (`spawnHordeBoss`, hooked in
`spawnSpecialWave` beside the other two, `w/100 ×` HP on each return). It is the
**second multi-actor boss**, reusing the Yamato's parent+parts pattern: a core plus
five `zpod` "pus module" children, all real entries in `G.enemies`, repositioned
every tick by `syncProgenitorPods`. **The difference from her is the thing to get
right, and it is easy to get backwards:** her armor belt is *five actors sharing one
HP pool*, which is why `explode` de-dupes it and `flameSpray` floors it at ×0.06 —
both fixes are about a SHARED POOL, not about parts. **Every `zpod` owns its HP**
(like her turrets and tubs, which are deliberately *not* de-duped), so neither file
needed a clause for this boss, and adding one would be a bug. If the core melts too
fast, move `PROG_HP` — never the flame multiplier. The sacs are PLATED by the core's
health (`PROG_POD_RESIST`), which is a scale and not a pool and so changes none of
that — see the shared `bossPartDamageMult` rule below the train.

Flags are split rather than reusing hers: **`hordeBoss`** = "killing this ends the
fight" (mirror of `germanBoss`/`japBoss`; read in `damageEnemy`'s `bossVictory()`
call; now read via `isFinalBoss`), **`bossPart`** = the child-actor flag (the
`shipPart` equivalent, kept separate so her nine touchpoints keep meaning what
their comments say — the sites that want all three ask `isBossPart` /
`isMultiActorBoss` instead; see the shared-predicate note below the train). Pods also
carry `fixed` (prone exemption + keeps them out of `isZombie`, so a Screamer can't
rouse a sac) and deliberately carry **no `zombie` flag** — that would route them to
`updateZombie` before dispatch reached `updateProgenitor`, and it is what the +15%
melee-horde HP pass keys on. All AI is `updateProgenitor` (`js/update-enemies.js`);
pods get a bare `return` in `updateEnemy`, because they carry a `spit` spec and
would otherwise be handed to `updateSpitter`, which walks them off the boss.

Four abilities: it crawls at `PROG_SPEED` 7 (**the one hard promise of the fight —
the player can always walk away from it**, which is why `updateProgenitor` reads
`e.chargeT` never, even though a Screamer will set it); **devours** any non-armored
defender in reach via `damageUnit(u, 99999, e, null)` rather than `u.dead = true`,
so card `beforeDeath` saves / the recap / the corpse / the infected short-circuit
all still run (armor isn't food — it gets `zombieBite`'d instead); **births** 5-20
zombies every 9-11s, sized against a ceiling that climbs with the boss's *return
count* (`specialWaveMult` is deliberately NOT used — it only ever shrinks with wave
depth, and pinned every brood to exactly 5); and a **resurrection** on each health
segment break. Tuning is the `PROG_` block in `js/constants.js`; art is
`js/render-zombie.js` (`paintProgenitorBody` is PURE, for the codex portrait;
`drawProgenitorPass` runs before the enemy loop so the brood paints over the mass).

Its HP is **one pool ticked into three phases** (`PROG_SEGMENTS`), polled in
`updateProgenitor` rather than hooked into `damageEnemy` — so it is robust to every
damage source without auditing any of them. The poll is a `while`, not an `if`: one
big hit can empty two segments and each crossing owes its own resurrection (the
double-fire is self-limiting, since the first pass consumes every corpse in radius).
`progenitorResurrection` reads **`G.corpses`** — the only surviving record of the
dead, since `compactInPlace` splices actors out the frame they fall — and raises
**both sides**, the player's fallen men included. That needed one new field:
`spawnCorpse` now stamps `light:`, because `reanimateAsUndead`'s light/heavy rule
reads `t.speed`/`maxhp`, which are gone by the time a corpse is raised. Note
`TEST.state().enemies` counts and HP totals are **inflated by parts** here as with
the Yamato — 6 actors per Progenitor.

**Enemy officer commands are TELEGRAPHED, on one shared clock.** The two officer
abilities that fire rather than radiate — the Japanese officer's banzai order
(`banzaiCmd`) and the Screamer's frenzy shriek (`frenzyCmd`) — were two copies of
the same function landing the frame their cooldown lapsed. Killing the officer
first is the whole counter-play to an officer, and there is no killing a thing
that gives no notice: the order and the sprinting men arrived together. Both now
run through `officerCommand` + the `OFFICER_COMMANDS` table
(`js/update-enemies.js`), where the cooldown opens a WIND-UP (`OFFICER_CMD_WARN`,
2.6s, on `e.cmdT`) and the shout lands only if he is still alive at the end of
it. Cancelling costs nothing anywhere — a dead officer is spliced out of
`G.enemies` the frame he falls and his telegraph goes with him. Tuning is the
officer-command block in `js/constants.js` (which is also where the two radii
live now); `TEST.roster()` reports `cmdWarn`/`cmdCd` per officer.

Four things about it:
- **A telegraph must never resolve into nothing**, or the player learns to ignore
  the next one. The wind-up opens only when there is someone in radius to rouse;
  an officer standing alone re-checks on `OFFICER_CMD_RECHECK` rather than
  burning a full cooldown. The pre-telegraph code fired into an empty radius and
  swallowed the result — invisible then, a lie once it was drawn.
- **The state is generic and lives on the officer** (`cmdT`/`cmdMax`/`cmdR` plus
  the label and colour), never keyed off his type, so both renderers know nothing
  about factions and a third officer costs one `OFFICER_COMMANDS` row and no
  render work. It rides the run save for free (`SAVE_STRIP` is by exclusion) and
  resolves correctly after a resume.
- **The mark is three answers, deliberately split.** WHERE is a dashed ring at the
  order's own radius; WHEN is a bright ring swelling out of him that reaches that
  edge exactly as the order lands — the same grammar as the V2's contracting ring,
  and the shout's own shockwave continues it outward from where it stopped
  (`drawOfficerCommandTelegraph`, `js/render.js`, drawn on the ground under the
  troops so the men inside the circle stay legible). WHO is a black-keylined
  hazard badge over his head that blinks faster as the order forms
  (`drawCommandWarning`, `js/render-overlays.js`) — a circle with a dozen men in
  it does not say which one to shoot. The inspector's `ORDER FORMING` chip keys
  on `a.cmdT`, so it needs nothing for a third officer either.
- **A wind-up interrupted by a stun or a pin FREEZES rather than resetting**, since
  both call sites sit below those blocks in `updateEnemy`. That is the honest
  read — the order is still coming, you bought time — and is worth not "fixing".

**Smoke blocks target acquisition, not just aim.** The smokescreen event
(`js/smoke.js`) drops a canister that burns 20-60s, spitting puffs that ride
`G.wind` (one vector per run, veered up to `WIND_SHIFT_MAX` of a full turn per
wave by `shiftWindForWave` in `spawnWave`). Every puff in `G.smoke` is both the
drawn cloud and a line-of-sight blocker: `smokeBlocksLOS(a, b)` sums how much
smoke lies *on the sight line* (the chord each puff cuts out of the segment,
overlaps double-counted) and blocks once that passes `SMOKE_SEE_THROUGH` (26px,
how deep a man sees into murk). Every target pick in `js/targeting.js` consults
it. Note it is a smoke DEPTH, not a distance between the two men — a flat
distance exemption was tried first and was wrong: at 46px it let two men buried
in the same bank shoot each other, which reads in-game as "they're firing
through the smoke". Depth keeps contact fighting working (men in contact have
almost no smoke between them) without that hole. The scans read `smokeOnField()` once
and only test candidates that would otherwise win, and `G.smokeBox` (a bbox over
the blocking puffs, rebuilt each frame in `updateSmoke`) rejects distant sight
lines — measured ~1.07→1.62 ms/frame in the worst case (52 puffs, max wind) on a
40v150 board, and free when no smoke is up.

Two invariants hold the screen together; both were bugs before they were rules.
A puff's blocking radius is `r * a` (its own density) and the renderer blits at
exactly that radius — so smoke can never look solid while blocking nothing, or
vice versa. And the pot emits by DISTANCE (`smokeEmitInterval` keeps puffs
`SMOKE_EMIT_SPACING` px apart at any wind) with `drift` jitter held to a narrow
band — otherwise a fast wind stretches the plume into a dotted line and troops
shoot clean through the gaps (measured 15% of the plume body before this). Air paths are deliberately NOT blocked: bombers and AA pick
targets with their own scans, since smoke screens the ground, not the sky.

**FOG is the other half of the weather** (`js/fog.js`), and unlike smoke it is
purely a look plus one scalar: `fogMult()` (`js/shooting.js`) cuts every
acquisition range to 60% while `G.fog` runs, and there is no per-puff geometry
and nothing to block. The renderer is three tiling cloud layers composed on
their own buffer and blitted once — they DRIFT on `G.wind`, the same vector the
smokescreen rides, at different fractions of it and sheared a few degrees off
it so they churn against each other rather than sliding as one; and the bank is
near-solid at the enemy end of the field thinning to `FOG_DEPTH_NEAR` over the
player's own trench, so the ground he is shooting at dissolves while the men he
is commanding stay legible. It does **not** sweep in across the field — that
shipped first, with the front rolling down out of the enemy's treeline, and was
cut deliberately; it fades up in place over `FOG_FADE_IN`. Four things are
load-bearing:
- **`G.fogAge` counts UP beside the countdown**, and is why there is a new save
  scalar. `G.fog` alone cannot tell a bank that has just arrived from one about
  to lift, and the two `nebel`/`infiltrate` special waves stack more fog onto a
  screen already standing (`Math.max`), so any "how long has it been up" figure
  derived from the countdown would jump under them and re-run the fade-in on a
  settled bank. An age doesn't. It also means a run saved under fog resumes
  mid-bank rather than fading in again.
- **The layer is composed at `FOG_LAYER_DIV` of field resolution.** The six
  full-field fills that build it are the whole cost of the effect: +26.6 ms a
  frame at 1:1 under software rasterization, +1.0 ms at a quarter, and the two
  are indistinguishable side by side because there is nothing on the layer but
  soft gradients. Nothing else in the renderer may copy this.
- **The wisp tiles are cut against the wind, not rotated per frame.** The wind
  only turns between waves, so a bank bakes once and stands, and every frame is
  an axis-aligned fill per layer instead of one covering the field's diagonal.
  The stretch along the drift is most of what separates fog from a mottle — a
  field of round blobs reads as camouflage, the same trap the biomes hit.
- **The drift phase runs off the bank's own age, never `G.time`.** A speed
  factor (the settling gust) applied to a `G.time` phase shifts the pattern by
  the whole run's length the instant the factor changes.

The **Regio Esercito** is the fourth endless foe (`faction:'it'` in `ENEMY_TYPES`,
17 keys) and the only one that **builds**. It shipped once before and was cut for
being dull — its mechanic was *morale*, men who broke and ran, the only
SUBTRACTIVE faction gimmick in the game. Don't reintroduce it. The replacement is
additive: engineers erect the same fortifications the player can, out in
no-man's-land; the infantry garrisons them and fights from cover; the works
**persist between waves** so the enemy front creeps permanently down the field;
and periodically the whole force pours back out of them. The pulse is
**dig in → grind → all-in charge → rebuild further forward**, and it is the only
faction that erodes the player's GROUND rather than his ranks.

**Their works are `G.itWorks`, deliberately NOT the player's defense arrays.**
This is the single most important thing to understand before touching them. Every
player-side consumer of `G.sandbags`/`G.bunkers`/`G.watchtowers` walks the array
with no notion of a side — `updateEngineer`'s repair and fortify passes,
`watchtowerRangeMult`, `engineerRepairCount`, the Blast Shelter card in `explode`
— so sharing the arrays would silently have a US engineer hardening an Italian
bunker or an enemy tower extending your riflemen's range. A separate array cannot
leak: forgetting a site means the works don't participate in something, never that
the player buffs the enemy. One array with a `kind` tag rather than three, because
works need whole-collection passes (draw, cover, compaction, garrison claim, cap).
`forEachDefense` (`js/helpers.js`) is untouched on purpose. Tuning is the `IT_`
block in `js/constants.js`; `IT_WORK_KINDS` holds per-kind HP/cap/cover/box.

**Rifles cannot target a work.** Player scans walk only `G.enemies`, so the answer
to a work is explosives (`explode` is side-blind — grenadier, bazooka, mortarman,
Sherman, mortar/artillery strikes all reach them with no special code), plus the
chip a work takes every time `italianCoverBlock` stops a round for its garrison.
That is what makes the faction demand OFFENSIVE spend, which no other foe does.
The `G.itWorks` loop in `explode` sits deliberately **outside** the Blast Shelter
guard — that card is the player's overhead cover and must not protect enemy works.

Four independent limits stop the front running away, and each guards a different
failure: `IT_WORK_MAX_X`, `IT_WORK_CAP`, `IT_BUILDS_PER_MAN`, and per-wave decay
in `decayItalianWorks`.

`IT_WORK_MAX_X` is the **depth wall**, and it is `DEPLOY_X - IT_WORK_DEPLOY_MARGIN`
(472) — the creep runs *through* `FORWARD_X` and stops just short of the player's
trench, so a long run ends with the Regio Esercito dug in on his doorstep. What the
wall guards is only the player's **build pocket**: `forEachEmplacement` walks
`G.itWorks`, so a work inside the pocket is ground he can no longer put a bunker on.
At 472 the deepest work bottoms out at 487 and his shallowest defense (`placementMinX`'s
`DEPLOY_X + 12`) tops out at 502 — 15px clear with no box overlap anywhere, and every
sampled spot behind his line still buildable (this 15px is a property of `IT_WORK_DEPLOY_MARGIN`
and the two box half-widths alone, so it holds for any `DEPLOY_X` — verified unchanged
across both zone rebalances so far, see the note on `DEPLOY_X` in constants.js). Below
~27 of margin the two start denying each other ground. The rate limit is not the wall
but the walk: `IT_FRONT_X_START` (64, unmoved — it's anchored near the enemy's own
edge, not the deploy line) is now ~408 short of the wall, so the creep takes
noticeably more waves to reach it than the wave-11 figure measured against the
original 620-wide field; carpet the forward zone in mines and it takes even
longer while the belt is consumed getting there.

That mine interaction is why `buildSiteClear` tests **box vs box** (plus
`IT_SITE_CLEAR` as a gap) rather than the flat centre-radius it used while the wall sat
short of `FORWARD_X`, where the player has nothing to keep off of. A radius is wrong in
both directions once the creep enters his ground: it let a work be staked half-inside a
bunker, and it let one 6px mine deny an 80px band — a minefield would have been an
invisible permanent construction wall, on top of mines already killing the sappers who
walk into them, which is the counterplay that was meant to be there. `pickBuildSite`
therefore picks the work's KIND at site time and carries it on `e.buildSite`, so the
site is cleared against the box it will actually occupy.

Signature units and behaviours:
- `iguast` (Guastatore) — `builder`. `updateGuastatore` runs seek → build → fight;
  once his budget is spent he leaves the dispatch by state and falls THROUGH to the
  ordinary rifle path, so combat isn't duplicated. He raises a new work at base
  strength and only FORTIFIES when there's nowhere left to dig, which is what stops
  every work on the field inflating to 1.5× HP.
- `garrison:true` types — `updateGarrison` is a pre-step, not a dispatch: it
  returns true only while a man is walking to his work, so a stationed man falls
  through and fights from cover. Works hold a recounted `occ` COUNT, never a list
  of men — `compactInPlace` splices the dead out the frame they fall, so a stored
  crew array would leak dead refs. Death therefore frees a slot for free.
  `italianCoverBlock` is O(1) (the garrison link already answers "which work is in
  front of him"), and `italianTowerRangeMult` mirrors the player's tower bonus, so
  a `icecc` in a hardened tower reaches 300.
- **AVANTI** (`updateAvanti`/`avantiCharge`) — wave-level, not a radius command
  like banzai/frenzy. `G.itCharge` is ONE SIGNED CLOCK: negative counts up through
  the telegraph, positive counts down through the surge, 0 is idle. **Nothing
  fires the order; officers and depth-wall pressure only make the clock run
  faster.** An earlier version let pressure trigger directly and, because the front
  sits at the wall permanently once it gets there, every charge fired the instant
  the safety floor expired — the floor silently became the cadence (measured 30.0s,
  30.0s, 30.0s). Keep the acceleration sum modest for the same reason. The charge
  grants suppression immunity only (`js/shooting.js`); prone is deliberately NOT
  exempted, so rifles still matter against it.
- `iardito` (Arditi) — the mirror of the sapper: hunts the PLAYER's emplacements
  and plants a charge. It's a `scheduleShell` on a fuse, not an immediate
  `explode`, because explode is side-blind and would kill him too; the fuse is also
  the player's warning to walk men clear.
- `imed` (Portaferiti) — the only healer any enemy army fields, and a THIRD
  pre-step of the same shape (`updateItalianMedic`). Unlike the other two it holds
  the frame whenever there is a casualty at all, walking OR knelt: a medic who
  merely stands in heal range and falls through to the ordinary path spends the
  frame advancing on the player, walks out of his own reach, and treats at half
  rate (measured 2.5 HP/s of a nominal 6, against a patient doing nothing but
  advancing) — hence `IT_MEDIC_STATION`, well inside `IT_MEDIC_RANGE`, so he tucks
  in beside his man and drifts with him. He deliberately carries NO `garrison`
  flag: the wounded are wherever they fell, so treating one takes him back out of
  cover, and that exposure is the counter-play. The patient scan is
  `isItalianFoot`, which is load-bearing — it already rejects armour and
  everything `fixed`, so no medic can ever top up the Treno Armato's engine or a
  wagon, and no clause here has to remember they exist. One man per pulse, like
  the player's, so the sustain never scales with the size of the knot around him.
- `il3` (L3 Lf) — the only flame-throwing armour anywhere, via the `tankFlame`
  spec. Note its acquisition in `tankTargets` is deliberately **not** cone-gated:
  a tankette closes to ~90px, where its own lateral drift swings the target outside
  a 0.30 arc, and the turret only traverses toward a target it can't see until it
  has traversed — it deadlocked, halted at 91px doing nothing, until that was fixed.

Wave spawning routes through `itaWaveComposition` and `ITA_SPECIAL_WAVES`; the
roster splits into DIGGERS (garrison the works) and CHARGERS (exist for the surge),
and the charger share climbs from 0% at wave 5 to ~47% by wave 45. Sappers, the
officer and the medic ride OUTSIDE that pool as trickles, for the same reason: a
wave carrying two of them should be a wave that felt different, not a wave that
was smaller (~0.2 medics/wave, matching the officer's rate). Art is
`js/render-italian.js` (`paintItalianSoldier`), whose variant dispatch is keyed on
silhouettes via the `IT_ART` map, so a new type that looks like an existing one
costs one line. `TEST.works()` and `TEST.state().it` are the inspection surface.

**All three Italian vehicles have their OWN painters**, dispatched off `a.type`
through the `HULL_PAINTERS` / `TURRET_PAINTERS` maps at the top of
`paintTankHull`/`paintTankTurret` (`js/render-vehicles.js`) — so a fourth Italian
tank must be given one rather than left on the generic branch, which no longer
carries any Italian art at all (its `nation === 'it'` insignia branches were dead
once the third painter landed and were removed). The reason all three needed one
is the reason to keep them: every other tank in the game IS the generic painter —
one rectangle, one turret disc, one braked barrel — so `il3` and `im13` were
*literally the same drawing at two scales*, and they are the only armour that
turns up on the same desert biome in the same sand-and-green scheme, often in the
same wave. What is shared is the chassis grammar and it lives in four helpers
(`itRunningGear`, `itRivets`, `itMarkings`, `itChassisPath`); what differs is the
furniture on top, and each vehicle gets ONE silhouette idea:
- `isemo` — no turret disc anywhere, one short fat dark gun hard off-centre.
- `im13` — the same chassis (`itChassisPath` and the same running-gear numbers,
  deliberately: they were one hull), answering the Semovente's "nothing round at
  the hull centre" with a turret plus a ring scribed round it, and a long thin
  47/32 with **no muzzle brake** where every German and US gun ends in a block.
- `il3` — **tows a trailer**. Nothing else in the game tows anything, and the
  bowser is what the flame variant is; it is also the only tank whose footprint
  isn't the house medium's, so `drawTank` carries a `tow` branch for its smaller
  shadow (plus a second patch under the trailer) and its own HP-bar geometry — at
  the medium's `dy` the bar lands ON the trailer, which is up-screen of an enemy.
`casemate: true` still means "no turret sprite, gun baked into the hull", so
`isemo` exports one PNG (`tank_isemo_hull`, no `_turret`) and a pack ships one
image; the shared `casemate` branch it used to run through has since been rotated
onto the hull's axis, so `estug` is correct on it and this is art, not a
workaround. The consequence is that a casemate's drawn gun follows the HULL while
the sim aims with `a.turret` — they agree in the ordinary case (both point
downfield) and the muzzle flash sits 26 units along `a.turret`, where that barrel
ends. `il3` is deliberately NOT a casemate for the same reason inverted: its
"turret" sprite is the flame projector, so the nozzle mouth tracks `e.turret` and
ends at 18, which is `drawFlameStream`'s `originDist`.
Five things carry the read at this size, each learned by getting it wrong:
- It is a **VALUE ladder**, not a pile of features (tracks and outline
  near-black, engine deck dark olive, hull sand, front plate lightest — plus the
  tankette's raised crew step, a fourth value it needs because it is small). The
  Semovente's first pass had bogies, a loader's hatch, a periscope, a roof Breda
  and three-tone camo, and read as a crate with corner brackets.
- **Every tube is dark.** In light grey a gun reads as a turret at any distance,
  which is the one thing a casemate must not do.
- **Count the circles.** One vehicle's circles have to mean one thing: the
  Semovente's mantlet ball is its only one (hence a square cupola), and the
  M13/40's are the turret and its ring, concentric, which is why its hull MG is a
  square mount and not a ball.
- **A raised thing needs a shadow, not an outline.** The M13/40's turret at the
  hull's own value vanished and left its outline drawing the whole turret; it
  reads as raised now off a 12% contact HALO (a halo and not an offset drop
  shadow, because the sprite is blitted at the gun's bearing and an offset would
  swing the light round the tank as it traversed). The tankette's crew
  compartment is a STEP for the same reason — outlined, it was a box inside the
  hull box, and since the projector covers its middle all that showed was a pale
  frame round the mount.
- **Nothing may out-shout the vehicle.** The tankette's bowser started 14 wide
  against a 20-wide hull with a full-width red band and read as the vehicle, with
  the tankette as its cab; a tow must be plainly smaller than what tows it, and
  the band is a hazard marking, not the brightest thing on the field piece.
Verify with `TEST.spriteRoundtrip('tank_il3_hull' | 'tank_il3_turret' |
'tank_im13_hull' | 'tank_im13_turret' | 'tank_isemo_hull')` — all five land at
`meanChannelDiff` ≤ 0.18, and the trailer and the 47/32 both fit the 92-unit box.

The **Treno Armato** (`itrain`) is the Italian wave-100 boss — an armored war
train (`spawnItalianBoss`, hooked in `spawnSpecialWave` beside the other three,
`w/100 ×` HP on each return). It rolls straight down a rail lane (`e.laneY`,
drawn ahead of it all the way to the stop — the telegraph) and **parks at
`TRAIN_STOP_X`**; it never breaches (skip in update.js's breach loop, like the
ship and the mass). The **third multi-actor boss**, on the Progenitor's HP rule,
which is the thing to get right: an engine parent (`itaBoss` — the whole boss
pool, killing it fires `bossVictory()`) plus eight `trainPart` children that
**each own their HP** — two `ittur` turret wagons (Yamato-battery clones firing
`scheduleShell`, traverse wedge off straight-down so they can't fire back up
their own train), one `itwag` infantry boxcar (unloads `TRAIN_DROP_POOL` squads
on a cadence — the fight's economy, killing it stops the tap), four `itmg`
gun posts on the gun wagon, two per side at `±TRAIN_MG_B` (NOT `tank`, so small
arms have a job; the flatcar itself is scenery, not an actor), and one `itarty`
howitzer wagon on the tail. No shared pool
anywhere → no de-dupe clause in `explode`/`flameSpray`, and adding one would be
a bug. No damage control: dead wagons stay COUPLED as hulks (`syncTrainParts`
repositions dead parts on purpose, unlike hers). It is also the one boss with a
**second way to die**: strip every wagon and the engine dies with them, polled at
the top of `updateWarTrain` (the phase poll's reasoning — every damage source
reaches it for free) and routed back through `damageEnemy` so the ordinary boss
death path runs, `bossVictory()` included. That is a stall-breaker, not a
shortcut: the wagons are PLATED by the engine's health, so stripping all eight at
phase 0 costs ~55k against its 26k pool, and it only pays for a player who has
already broken segments the ordinary way. Its one knock-on is the wreck stamps —
the death cascade in `damage.js` now stamps armored wagons ABOVE its `p.dead`
skip, because `drawWarTrainPass` drops the whole consist the instant the engine
dies and wagons killed earlier would otherwise leave nothing but an engine wreck.
One pool ticked into
`TRAIN_SEGMENTS` (3) phases, polled with a `while` in `updateWarTrain`; each
break runs `trainSoundsCharge`, which arms the SAME `G.itCharge` signed clock
the ambient AVANTI runs (telegraph included) rather than firing a charge of its
own, and pushes `G.itAvantiCd` back so the field doesn't owe a second charge
right after. The phase is also the wagons' **plate** — see the shared
`bossPartDamageMult` rule below. It crushes the player's emplacements on its lane while rolling
(`trainCrush` — `G.itWorks` deliberately spared). The wagons carry `tank:true`,
so the `trainPart` bare return in `updateEnemy` is load-bearing (updateTank
would drive them off the rails).

`itarty` is the consist's **REACH**, and the reason it exists is a hole the other
guns left: everything else on the train tops out at 290 (`ittur`) or 240 (`itmg`),
all of which the player outranges from his own trench, so a parked train could be
ground down with nothing coming back. It reaches `TRAIN_ARTY_RANGE` 389 — a quarter
short of the player's AT gun (519) — on the bazooka's own `rand(7.4, 10.1)` clock.
Two things about `updateTrainArty` are the design and not decoration. It is
deliberately **not** a third flat-shooting turret: long flight, wide blast, loose
scatter, so the shell is something the player watches land and can walk out from
under. And it has a **dead zone** (`TRAIN_ARTY_MIN`) that every targeting tier
carries, not just the first — put it on tier 1 only and a rifleman standing on the
coupling is still shelled by tier 3, which is exactly the counterplay the 389 reach
is sold against. It shares the turret's wedge and fire tolerance on purpose (it must
not be able to shell its own consist either), and passes `by = p` into
`scheduleShell` because ESCALATION rung IV keys on the firer. Being on the tail it
is the LAST gun to clear the enemy edge, so it opens up about half way down the
roll-in.

Adding it is also the worked example of what lengthening the train costs. Almost
everything is generic over `e.parts` (`syncTrainParts`, `trainCrush`'s `chew`, the
death cascade in `damage.js`, the part-bar loop, the codex roster filter), but four
sites in `js/render-train.js` and one in `trainCrush` measured the consist as a
hardcoded `TRAIN_SPACING * 4` — the ground shadow, the coupling count, the selection
box, the cull margin, and the wire-crush belt. They all read **`TRAIN_TAIL_S`** now
(the rearmost offset), so a seventh car is one constant, not a scavenger hunt.

Tuning is the `TRAIN_` block in
`js/constants.js`; art is `js/render-train.js` (`paintTrainEngine` and
`paintTrainArtyWagon`/`paintTrainArtyGun` are PURE, for the codex portrait and the
exporter; `drawWarTrainPass` runs before the enemy loop). The howitzer's tell is
LENGTH, never bulk — a 34px barrel against the turret's 24 over the same car body.
`deploy('itrain', …)` works — parts are built lazily by `initWarTrain` on the
first tick — and `TEST.state().enemies` counts/HP are inflated by parts here
too: 9 actors per train. `BOSS_COPY` (`js/flow.js`) has an `'it'` row — one
table keyed on faction holding the victory title, the stats sentence's two
variable halves (what fell, and its pronoun) and the Escalation-X "not done
yet" banner; `de` remains the unguarded fallback for any FIFTH faction.

**All three multi-actor bosses PLATE their children off the parent's health**, via
`bossPartDamageMult` (`js/damage.js`, called once at the top of `damageEnemy`). A
part takes one step of damage resistance per health segment still intact *behind*
the one being fought: **66% at full health, 33% after the first break, none on the
last segment**. `TRAIN_PART_RESIST` / `YAM_PART_RESIST` / `PROG_POD_RESIST` are all
0.33 against 3 segments; a fifth boss is one row in that function plus its two
constants, and the inspector line (`hoverStats`) and the bar's tick marks come for
free. Five things about it, four of which are the reason it is written this way:
- **It makes the PARENT the way in.** Going for the guns first is now the slow
  route, since a part's armor is the boss's own health. That is the whole point of
  the mechanic, and it is why the numbers are identical on all three: a player who
  learns it on one boss has learned it on the others.
- **It is a MULTIPLIER, not an armor pool** — the same distinction ESCALATION rung
  VI turns on. A pool soaks a fixed amount once and is gone; this is a standing
  property only the parent's own HP can strip. Being a scale rather than a shared
  pool is also why none of the three owes `explode`/`flameSpray` a de-dupe clause.
- **It is derived from the parent's `phase`, never stamped on the parts.** Same
  reasoning as the phase polls themselves: nothing has to remember to update it,
  and a part the Yamato's damage control just revived reads the same number as one
  that has stood since she arrived.
- **The Yamato's belt is exempt, for free.** `damageEnemy` redirects a `hullSection`
  into her own pool *above* this hook, so a hit on her armor is a hit on HER,
  undiminished — plating it would just be plating her, and would make the pool that
  drives every part's plate the one thing that couldn't be reached. `hullSection`
  takes an early return in `bossPartDamageMult` anyway, because the inspector calls
  it on whatever the mouse is over.
- **She needed the phase inventing.** The mass and the train were already ticked
  into segments because a break fires an ability (resurrection, AVANTI); her
  `YAM_SEGMENTS` poll in `updateYamato` has nothing in it but `e.phase++`, and her
  HP bar grew the tick marks the other two already had. A break that changes how
  hard her guns are to kill and shows the player nothing is just a difficulty spike
  with no tell.

**The three part flags stay separate; the questions ASKED of them are shared.**
`shipPart`/`bossPart`/`trainPart` are deliberately not one flag — a site that
genuinely cares about one boss has to be able to say so, which is what keeps her
nine touchpoints meaning what their comments say. But most sites care about the
CATEGORY, and were spelling all three out — four parallel lists to keep in step,
and a fourth such boss would have had to find every one of them. So
`js/helpers.js` carries the predicates:
- **`isBossPart(t)`** — any of the three child flags. The armor-vest skip in
  `waves.js`, the shell-shock skip and a card guard in `cards.js`, the part-death
  branch in `damage.js`, the exporter's "handled with their parent" skip, and the
  codex roster filter.
- **`isFinalBoss(t)`** — "killing this ends the fight": the four faction-boss
  flags `damageEnemy` keys `bossVictory()` on. A fifth faction boss is one row.
- **`isMultiActorBoss(t)`** — parent AND children, for the two sites that handle
  a boss WHOLE: the standard-draw skip in `render.js` (each has its own pass) and
  the breach loop in `update.js` (one regressed clamp must not breach eleven, six
  or nine times in a frame). Der Schlächter and the Alien Walker are outside it on
  purpose — a single actor each, drawn and breached by the ordinary paths.

The Alien Walker is in **neither** of the last two despite `boss:true`, which it
buys only for the `armorEnemy` skip and the prone/suppression exemptions.

Three more shared reads live beside them, each extracted after the duplicate
copies had already drifted:
- **`actorHitRadius(a)`** — how close a click, tap or hover has to land, and (at
  `-2`) the ring the inspector draws. There were two tables, and the walker was
  the tell: the hover ring drew at 28px while the focus-fire tap still wanted 14,
  so the player aimed inside a ring the tap couldn't see. Order matters — `apc`
  before `vehicle`, and the boss flags above everything, since parts carry `tank`.
- **`emplacementTier(o)`** — `up2 ? 2 : up ? 1 : 0`, the index into every per-tier
  table. Those tables are now tables rather than nested ternaries
  (`BUNKER_COVER_DODGE`/`BUNKER_COVER_CHIP`, `SANDBAG_COVER_DODGE`/
  `SANDBAG_COVER_CHIP`, `WIRE_DRAG`/`WIRE_WEAR`,
  `WATCHTOWER_RANGE_MULT_TIERS`, `AMMOCRATE_ROF_MULT_TIERS`,
  `CAMONEST_REVEAL_TIERS`, `DUMMY_SEE_THROUGH`), so a wall's whole per-tier story
  reads in one place — and the deliberate flat spots stay visible (a bunker chips
  the same 1 hp fortified or hardened, where sandbags keep improving).
- **the veterancy curves** — `rankCdMult`, `rankScatterMult`, `rankSpreadMult`,
  `emplacementArc`, off `RANK_ROF_RATE`/`RANK_SCATTER_RATE`/`RANK_SPREAD_RATE`/
  `RANK_ARC_RATE`. These cover the weapons that skip `unitBuffs` and set their own
  numbers. Two exist for a sharper reason than tidiness: `drawUnitWeaponRange`
  (`js/targeting.js`) drew the traverse cone and the buckshot cone from its own
  copies of the formulas `updateATGun`/`updateAAGun`/`fireShotgun` fire by, so a
  tuning pass could leave the drawn cone describing a gun the player doesn't have.
  The rates are kept as four constants even though three read 0.08 today — they
  are different promises, and folding them together would let a reload tuning pass
  silently retighten every mortar and every buckshot cone in the game.

The codex's veterancy panel now **derives** its percentages from those rates
rather than restating them, which is what had already gone wrong: a cycle-time
curve is not its own reciprocal, so the "Rate of fire" row advertised +48% at max
rank where the real gain is ≈1.9× (the interval shrinks to `1 - 0.08*6 = 0.52`).
Five other rows describing the very same curve had it right, which is the only
reason the error was visible.

The **Alien Walker** (`awalker`) is the easter egg that ends a run that won't end
— a striding tripod that walks out of the treeline at wave 666 and sweeps a laser
lance across the field. It is the only enemy that is **not a faction's**: no
`faction` field, `G.enemyFaction` is never consulted, and it turns up against all
four armies. Wave 666 spawns exactly one; from 667 a linear per-wave roll
(`awChance`/`spawnAlienWalkers` in `js/waves.js`, called at the **top of
`launchWave`, above the `%10` early return** so a boss wave is not a free pass)
can produce 0, 1 or several — measured E[n] 0.36 at 667, 0.45 at 700, 0.78 at 800,
1.61 at 1000 with `AW_ALIVE_CAP` (3) concurrent. It is a **single actor**: the
parent+parts pattern exists to give a 10,000 HP target several things worth
shooting, and 3000 doesn't need it. Tuning is the `AW_` block in
`js/constants.js`; AI is `updateAlienWalker` (`js/update-enemies.js`); art is
`js/render-alien-walker.js`.

Four things about it that are load-bearing:
- **The beam's hit test is the angular WEDGE swept since last tick, never a
  point-to-segment test.** `dt` is hard-clamped to 0.05 (`main.js`; the
  `gameSpeed` loop sub-steps and `TEST.DT` is 0.05), so at 1.2 rad/s the lance
  advances 0.06 rad — a **31.6px tangential jump at the 527px tip**, which any
  drawable half-width steps clean over. Consecutive wedges share a boundary
  exactly (`awPrev = awAng` before advancing), so nothing falls between them.
  `awInWedge`'s pad is a **physical half-width converted to an angle at the
  actor's own radius**: it matches the drawn beam everywhere, and down by the
  feet it opens to ~0.7 rad, where the sweep's tangential speed is only ~12px/s
  and a running man could otherwise stay ahead of it for the whole two seconds.
- **The once-per-sweep `Set` lives on the WALKER, not as a token on the victim.**
  Several can be on the field at once, and a per-actor stamp is per-actor rather
  than per-(actor, walker) — B overwrites A's stamp and A charges the same man
  twice inside one sweep. The Set also covers sandbags, wire and works, none of
  which have a spare field. Entering `sweep` must reset `awAng = awPrev = awFrom`
  or the opening tick's wedge spans the gap from the last sweep's stale angle and
  scythes half the map for free; the sweep progress `p` must be **clamped** or a
  short final frame drops the tail of the arc.
- **It deliberately does NOT carry `tank`.** At ×0.04 vs small arms, 3000 HP is
  ~937 seconds against a rifle line and 3.4 shells for an AT battery —
  simultaneously impossible and trivial, one answer, no decision. It is hard to
  REACH instead: standing at x 214–250 it sits outside rifleman (154), gunner
  (179), grenadier (231) and bazooka (243) range, so the artillery answer falls
  out of geometry for free while a player who walks men up to `FORWARD_X` can
  close and trade. If it dies too fast the lever is `AW_STAND_X_MIN`, never an
  armor multiplier. `noRamp` is mandatory for the same reason it is on the
  bosses — the ramp is capped out by wave 666 and 3000 would ship as 9000.
- **Killing it fires no `bossVictory()`.** `boss:true` is bought only for the
  `armorEnemy` skip and the prone/suppression exemptions; `damage.js` keys the
  victory on the four faction flags, so the walker just dies. Do not add it to
  that chain — a wave-667 farm would hand out ESCALATION rungs.

Its gait is the **first walk cycle in the engine** (everything else that
"animates" is a countdown timer; the zombie hound's legs are a static pose). Two
rules make it read as walking rather than wiggling, both in `awLeg`: the phase is
advanced by **distance moved**, not `dt`, and during stance the foot slides
backward in body coords by exactly the ground covered — stance is `AW_DUTY` of the
cycle against `AW_DUTY × AW_STRIDE` of ground, so they cancel and the foot is
motionless in world space by arithmetic rather than by tuning. There is no sine in
the stance; a sine there is what makes every attempt at this look like a table
jiggling its legs. Three legs at phases 1/3 apart with duty 2/3 puts exactly one
foot in the air at all times. The knee is two-bone IK with the elbow solution
**forced backward by sign** (`base + bend * fwd`) so it can never flip mid-stride.
`paintAlienWalker` is PURE (codex portrait), so the phase reads off `a.walkT || 0`
and never `G.time`. Proportions were wrong once in an instructive way: a squat
hull with 33px of leg reach rendered as a **flying saucer** — a walker has to be
mostly LEG, and the emitter had to move out onto a stalk because a bloom at the
hull centre erased the whole sprite every time it fired.

**Each faction fights on its own ground.** `GROUND_BIOMES` in `js/render-ground.js`
keys a terrain off `G.enemyFaction` — `de` Western Front mud, `jp` Pacific volcanic
ash, `zo` blighted dead earth, `it` North African desert. It is resolved ONCE, in
`paintGround`, which `newGame` calls immediately after setting `G.enemyFaction`, and
baked into `groundCanvas`; nothing on the hot path knows a biome exists. Every
non-endless mode reports `'de'`, so tutorials and campaigns keep the field they were
authored against. A biome is a base fill, the mottle stirred into it, a `detail()`
pass, and the deploy trench's colours — pure decoration, and blood/craters
(`js/damage.js`) are translucent, so they sit correctly on any base.

A biome is also the one thing an artist can replace **on its own**, via two ids per
faction in the sprite pack: `terrain_<f>` (the whole field, stretched to W×H) and
`terrain_<f>_trench` (the deploy strip, laid over it at `TRENCH_SPR_X`). Two plates
rather than one because they're separately useful — repaint the field and keep the
engine's trench, or cut a hand-drawn trench through procedural ground. `paintGround`
asks `SPRITES.get` per layer and falls through to `paintBiomeField`/`paintBiomeTrench`,
which exist as separate functions only so the exporter can bake the same pass onto its
own canvas. Both plates and the fallthrough are proved by `TEST.terrain()`.

The ground is the ONE piece of pack art baked once per run rather than blitted per
frame, and that is the whole difficulty: wrecks, blast scorch and blown emplacements
are stamped into `groundCanvas` as the fight goes on and are recorded **nowhere else**,
so a repaint costs the run its own history. Hence `refreshGroundArt(force)` telling its
two callers apart — a pack finishing its *load* is not something the player did and
repaints only while `G.time === 0` (exact, not conservative: every one of those stamps
needs combat to have happened), while flipping ART OFF/ON is a deliberate act whose
point is to re-render and forces through. Either way the state compare runs FIRST, so a
pack with no ground art in it — the common case — never reshuffles a procedural field
or costs a wreck. The terrain plates are also the only defs the exporter renders at
`EXPORT_TERRAIN_SS` (2) rather than `EXPORT_SS`: an 880×460 field at 4 px/unit is a
3520×1840 sheet of noise, four times over. They're the only `random: true` defs too —
`spriteRoundtrip` flags rather than suppresses that, since its diff is meaningless
against a pass that re-scatters its own mottle on every call.

Two things that were learned by drawing them wrong, and that a fifth faction will hit:
- **The ground must not share the player's hue AND value.** `jp` shipped first as a
  dark jungle green and camouflaged the player's own olive-drab troops; picking your
  men out is the whole game. It is ashen grey now, with the green kept in the scrub
  scattered on top. Check a new biome with troops on it, not bare.
- **Broad soft ellipses read as CAMOUFLAGE, not as terrain**, because they're the
  same shape family as the mottle, only bigger — the eye groups them. Tried at 0.3
  and 0.1 alpha for `jp` canopy shade and removed both times; below ~0.08 they stop
  existing at all. Large-scale variation has to come from a different *shape*
  (the desert's ripples, the blight's fissures), never from a bigger blob.

`deploy`/`spawnEnemy` accept off-field coords (they don't block) but return
`offField: true` with a `warning` when a positional placement lands outside the
playable field — check it so a typo'd coordinate doesn't silently sit a unit
off-screen. Negative x left of the enemy edge is valid *staging* for `spawnEnemy`
(enemies march in from there), so it isn't flagged; for defenders it is.

To fast-forward a whole difficulty read, `autoplay` runs a scaling default build
(pass a `plan: (G) => [{type,x,y},...]` for a custom one) — it pumps the sim like
`step`, so it returns immediately with a per-interval `log`, no wall-clock wait.

The only modes are **endless** and the three **tutorial** lessons
(`tutorial1`/`2`/`3`), which are just `endless`-mode levels with a scripted intro.
There are no attacker/campaign modes — your men always live in `G.units`, the foe
in `G.enemies`. Endless difficulty is `easy` plus the ESCALATION ladder below;
`sandbox`/`testing` are the unlimited-TP tiers. **`medium` and `hard` still exist
in `ENDLESS_DIFFICULTIES` but left the menu** — keep them, `TEST.start` is keyed
on those ids.

The **LEADERBOARDS are keyed on the RUNG**, one board per rung (`js/leaderboards.js`,
`endlessLeaderboard` v2, top 10 each). The three difficulty boards were a relic: two
of the tabs recorded a run nobody could start any more, while every real run landed
on the third. A board holds one rung, so entries inside it compare on **wave alone**
(the old esc-then-wave comparator is gone) and no rung is printed on a row — the
header names the board. Recording is gated on `medalsEligible()` reused verbatim,
the same test the rung unlock and the medal payout use. The v1 blob **migrates
rather than being discarded**: every entry re-homes onto the board its own `esc`
field names, medium/hard ones included — those tiers were harder than the rung they
land on, so the migration UNDER-credits them and can never invent a score a rung
didn't earn. The picker is the escalation menu's own rung strip (shared `.esc-rung`
styling; `#leaderboard-strip` declares its own `esc` container so the `cqi` units
measure the strip and not the window). An unearned rung is inert **unless its board
holds entries** — `TEST.escalation()` and the migration can both bank a score on a
rung this save no longer counts as earned, and a record must stay readable.

**ESCALATION** (`js/escalation.js`) is the endless difficulty ladder: ten rungs,
each ADDING one permanent modifier on top of every rung below it, unlocked one at
a time by putting the wave-100 boss down. The whole ladder is ONE flat object of
scalars (`defaultEscMods`), stamped on `G.esc` at the top of `newGame` *before*
the state literal — the literal reads it for the opening TP and two timer seeds.
**At rung 0 every field is its identity value**, which is the point: no hook site
takes a branch, so sandbox, testing, tutorials and campaigns are provably
untouched. That is why modifiers are scalars and not callbacks — a callback has
to run *somewhere*, and there is no somewhere that is free when the feature is
off. Rungs, and the one hook each owns:
`I` HP ramp ×1.5 (`enemyHpRamp`) · `II` income ×0.8 + trickle +1s (`earnTP`,
`update.js`) · `III` no `WAVE_BREATHER` · `IV` enemy damage ×1.1 (`damageUnit`) ·
`V` no starting TP · `VI` enemy armor pools ×2 (`armorEnemy` + the two boss
sites) · `VII` events ×1.3 (`update.js` event timer) · `VIII` spawn floor 7→5 ·
`IX` no kill bounty · `X` the boss must die TWICE (`G.bossKills` vs
`esc.bossKills`, checked at the top of `bossVictory`).

Alongside the ten rungs runs the **pay modifier**, `esc.medalMult` — +10% medal
payout per rung, ×1.0 at 0 up to ×2.0 at X, hooked in `awardWaveMedals`
(`js/cards.js`). It is deliberately NOT an eleventh rung: it is continuous, so
it is derived from the level in `buildEscMods` the way `faction` is, not applied
by an entry's `apply()`. The payout is `Math.max(base, Math.round(base * mult))`
— floored at the base rate, because ten percent of the wave-10 medal is not a
medal and a rung must never pay LESS than no rung.

Three things about it that are easy to get wrong:
- **The rung does NOT pick the enemy** — every run at every rung rolls it, in
  `rollEnemyFaction` (`js/state.js`), and `G.esc` carries no `faction` field. It
  shipped pinned one army per rung ("prove it against every army") and was
  un-pinned deliberately: a rung is cleared only by a wave-100 boss kill, so a
  hard rung is dozens of attempts, and a pin made every one of them the same army
  on the same ground. The price is that a modifier now lands unevenly by roll —
  rung VI's doubled plate is brutal against the Regio Esercito and literally
  nothing against the Horde, which wears none — and that is accepted. The roll's
  one rule is **no back-to-back repeat** (`G_lastFaction`, a per-session global,
  not the save blob: it exists to space out a run of attempts). `G_forceFaction`
  (TEST) still wins over both, and does not disturb the rotation.
- **Armor is a soak pool, not a reduction fraction** — `damageUnit`/`damageEnemy`
  subtract it 1:1 until it breaks, then spill the remainder into HP. So rung VI
  doubles the POOL at spawn. Halving incoming damage instead would also halve the
  spillover and keep helping after the plate broke; it is a different, much
  stronger effect. Same reasoning as the Yamato's belt.
- **`explode()` used to discard its firer**, passing a bare `{x,y}` to `damageUnit`
  where the enemy loop beside it passes `by || {x,y}`. Rung IV keys on
  `from.side === 'de'`, so that made every enemy shell, mortar, rocket, mine and
  bomb silently skip the modifier. Both that and the shrapnel loop in `update.js`
  now forward `by`. If a new damage path is added, it must forward its attacker
  or it is invisible to rung IV.

The rung and the highest unlocked rung ride the existing `endlessCards`
localStorage blob (`escalation`/`escUnlocked`), normalized in `loadEndlessCards`
with **no version bump** — additive fields are exactly what that normalizer
backfills. The unlock is gated on `medalsEligible()` reused verbatim, so a boss
can't be farmed for rungs in sandbox. Drive it with `TEST.escalation(n)`, which
unlocks as well as selects, because the real unlock costs a wave-100 boss kill
per rung.

**THE MENU IS ONE SCREEN** (`#intro`). There is no `#endless-select` — it was
deleted, along with the ENDLESS mode card that reached it. A game with one mode
does not need a mode picker, so the front page IS the deploy screen: the title
marquee owns the top, `.fm-deploy` owns the bottom, and nothing competes. The
word "endless" appears nowhere in the UI; the wave counter is the only progress
language. `#intro` is also the return screen for every secondary menu, so
`cardShopReturnScreen` / `leaderboardReturnScreen` and the abandon prompt all
name it.

`#esc-deploy` is the **welded slab** — ONE control with `#esc-prev` / `#esc-next`
(EASIER / HARDER) recessed into its ends, sharing its orange body and its single
drop-shadow. Broken into three separate chips the arrows read as their own
destinations; welded, they read as adjusting the thing they sit inside. The rung
it will deploy at is printed INSIDE the button (`#esc-level` + `#esc-mult`), so
the control states what it does. Under it, `.fm-status` is one line: the modifier
this rung just added, how far up the ladder you have earned, and the way into all
ten. Under that, the footer chips — CARDS (carrying the **only** medal count in
the game's UI, because the count belongs on the thing you spend it in),
LEADERBOARDS, CODEX, SETTINGS, and TUTORIAL. **SANDBOX, TESTING and CHANGELOG
moved into Settings** under a DEV TOOLS heading: sitting next to the only real
mode was making them read as modes. `openEndlessLoadout`/`openAbandonConfirm`
therefore take a `fromScreen` — the two dev buttons swap `#settings` out, not
`#intro`.

`refreshMenu()` (`js/flow.js`) rebuilds everything the front page reads from
storage — the save slot, the rung, the medal count — and is called from
`returnToMenu` and once at boot. It owns the **first-launch promotion**: on a
save with no run, no medals and `bestWaveEver() === 0`, TUTORIAL is moved out of
the chip row into the empty RESUME slot. All three signals, not just the save
slot, because clearing a save is something a returning player does constantly.

**The rung strip moved INTO `#esc-dossier`, and the dossier's rows became
selectable with it.** The slab's arrows walk one rung, so a IX→II drop is seven
presses without a strip — and that is exactly the move a player stuck on a rung
makes. What the front page gains by not carrying eleven chips is the whole point
of the redesign, so the strip lives where you go to READ the ladder, since
reading it is when you decide where to stand on it. A row's side says `SET ▸`
rather than `AVAILABLE` for that reason. `pickEscalation` is still the single
write path (arrows, strip and rows), and it **repaints** the dossier
(`refreshEscDossierStates`) rather than rebuilding it — a rebuild would
`innerHTML` the rows out from under the finger that just tapped one, collapsing
the briefing the same tap opened. Nothing on that screen can change the SHAPE of
the list, so only classes and labels can differ. Rung 0 has no numeral, so any
copy naming the rung you must beat drops the `ON —` (`escDossierSubText` and the
dossier's locked rows both branch on it). Unlike the card shop and the
leaderboards, the dossier **layers over** the menu rather than swapping it out
(z-index 11 over 10, own scrim, own fade). It closes on ✕, on a backdrop click
(`e.target` check, so a row click still selects), and on Escape, which it claims
first in `js/input.js`'s handler via `escDossierOpen()`.

Three CSS notes. Everything measures in `cqi` off a container declared on
`#intro .fm`, because an overlay lives inside the scaled `#stage` and
`vw`/`@media` there read the WINDOW, not the ~600px the panel gets (same trap the
After-Action Report documents) — there are no breakpoints on this screen at all,
just clamps between a phone value and a desktop one. Every selector for a
`<button>` is prefixed `#intro` / `#esc-dossier` to outrank `.overlay button`,
which repaints every overlay button gold. And this sheet has **no generic
`.hidden` rule** — every hide is spelled out per element, which is why
`#intro .fm-resume.hidden` exists: the card it replaced never had one, so
`refreshContinueUI` had been adding a class that did nothing and CONTINUE sat on
the menu offering a saved run that did not exist.

**ATTRACT MODE** (`js/attract.js`) is the live demo behind the menu, which is why
`#intro` is the one menu screen that is NOT opaque (`.fm-scrim` carries the
gradient instead). It drives the real sim — same `update()`, same `draw()`, same
waves — but **deliberately never sets `running`**, so `isPlaying()` stays false
and the HUD, toolbar, tipbar, speed/pause buttons, canvas handlers and hotkeys
all stay inert with no guards of their own. The frame loop runs it instead of the
`playing` branch; that is the only place `running` is worked around. The run
chrome still had to be hidden, because it sits *below* the overlay layer and now
shows THROUGH it — one `#stage:has(> #intro:not(.hidden))` rule in the CSS.

Its containment is the part to preserve: the demo is a real endless run and will
bank medals, unlock rungs, take leaderboard scores and reach `endRun`, which
**deletes the player's single-slot save**. Three guards, two of which are one
predicate — `medalsEligible()` returns false (already the gate on all three of
medals, the rung unlock and score recording), `endRun` early-outs into
`restartAttract()` ABOVE its `clearRunSave()`, and `bossVictory` early-outs.
Nothing in `attract.js` writes localStorage, and that is the invariant. Verified
over 1500 sim-seconds to wave 63 with three collapses: medals, `escUnlocked`, the
save slot and every board byte-identical, and no overlay ever shown. It is built
to be **removable** — six `// ATTRACT` call sites and the removal recipe are in
the file's header comment.

**The GROUND DECAL LAYER** (`js/render-decals.js`) is why the frame no longer grows
with the run. `G.groundMarks` is uncapped, accrues ~30 marks/s in a sustained fight
and holds each for `GROUND_MARK_TTL` (120 s), so a 12-minute endless run reaches
~1,500 decals — and drawing them per frame took `draw()` from 0.5 ms at wave 2 to
26 ms at wave 62, tracking the count almost exactly. Each mark is only one or two
ellipse fills: the cost was the ~2,500 separate draw CALLS (70% of everything the
frame issued), which is also why the sprite migration could not fix it — a per-mark
blit trades one ellipse for one `drawImage` and measured SLOWER. Marks are now
stamped ONCE into an offscreen bitmap sized to `groundCanvas` and blitted whole
right after it, so the per-mark cull is gone too (the camera clips the blit the same
way). Measured 36 → 2.7 ms on a 1,767-mark board, and the layer's contents are
pixel-identical to the old loop (`meanChannelDiff` 0).

Three things hold it together:
- **A new mark stamps the frame it is made** (`stampDecal`, off `addGroundMark`), or
  a hit stops drawing blood until the next rebuild.
- **Fading and expiry can only be applied by REDRAWING**, since a canvas cannot
  un-draw one stamp. So the rebuild is **double-buffered and PROGRESSIVE** —
  `DECAL_PASS_BUDGET` (150) marks per frame into a back canvas, swapped in when it
  completes. A whole rebuild is ~6 ms at 1,500 marks, and dropping that into one
  frame twice a second is a worse artefact than the cost being removed: a dropped
  frame, on a cadence. Measured overhead of a pass frame: +0.5 ms.
- **The pass then SLEEPS until the oldest mark starts to fade**, because
  `alpha = clamp(ttl / GROUND_MARK_FADE, 0, 1)` holds at 1.0 for 112 of a mark's
  120 s and nothing on the layer can change before then. That assumes a mark's ttl
  only ever decays, which `addGroundMark` guarantees by defaulting every mark to
  `GROUND_MARK_TTL` — but that field is spread from the caller's object and so is
  overridable, and `stampDecal` pulls the horizon in for anything asking for a
  shorter life. Without that guard a short-lived mark sits on the layer for the
  ~112 s until the horizon lapses.

The pass walks a **snapshot** of `G.groundMarks`, not the live array: `updateDecals()`
runs at the end of `update()` *after* compaction, which splices expired marks out
mid-pass, and walking a shifting array by index would skip marks. The layer carries
the same `ss` density stamp `sprite()` and `drawCorpse` use, and rebuilds
SYNCHRONOUSLY on a density change (mobile zoom) rather than progressively, so a pinch
never shows a half-built field. It is also the one thing in the renderer holding BAKED
pixels rather than redrawing, so it cannot notice art changing under it — `SPRITES`
calls `invalidateDecals()` when a pack finishes its async load, is toggled, or is
registered/unregistered.

Marks are the one place sprite art is **free**: a pack's PNG is stamped once per mark,
exactly like the splat it replaces, so it costs nothing per frame. Three ids cover the
whole ground layer (`mark_blood`/`mark_bloodpool`/`mark_crater` via
`groundMarkSpriteId`), because a mark's variation is its SIZE and ANGLE rather than its
art — `blitGroundMarkSprite` scales the record to the instance's own radii
(`groundMarkSize`), so a pack keeps the variety instead of tiling one stamp. Authored
at the `MARK_SPR_*` nominal footprints (18×12, 48×32, 55×42 world units).

**SPRITE PACKS** (`js/sprites.js` + `js/export-sprites.js`) are the seam for replacing
the procedural art with an artist's PNGs. `js/sprite-cache.js` was always written for
this — a sprite record is `{img, w, h, ax, ay}` and `img` is anything `drawImage`
accepts — and it needed **no changes**, because of the one rule that holds the feature
together: **every call site asks `SPRITES.get(id)` FIRST and returns before it reaches
`sprite()`.** That cache re-bakes any record whose `ss` doesn't match the current
supersample (and `drawCorpse` carries the same guard per corpse); an `<img>` has one
fixed resolution and would be re-baked forever. Check-first also means that with no pack
installed the running code is what ran before the feature existed — `get()` returns null
off an empty Map. Missing is normal: no `assets/sprites/manifest.json`, a half-finished
pack, one deleted PNG — each falls through to the procedural art silently, the contract
`js/audio.js` gives a missing `.ogg`.

**Facing is never in an id.** The procedural soldier bakes 48 directional frames because
much of a man's belt kit is screen-fixed rather than face-relative; a pack ships ONE
image and `drawSoldier` blits it at `rot = a.face`, which also skips the live
transient-pose branch (`soldierCacheable`). Same collapse for the halftrack's 32 buckets
and the canopy's 32 descent frames. So a pack trades animation for art: the walk cycle,
the MG swivel, the Progenitor's breathing, throw poses, AT recoil, train doors and
per-corpse poses all freeze. Effects (muzzle flashes, tracers, flame, smoke) are separate
layers and unaffected. Art is authored in the **same local frame its painter draws in**,
so the rotation each site already passes is the rotation the sprite wants; the manifest
records that per sprite, plus `gunTip` (the type's `gun`, where rounds actually spawn —
sprites don't change it, so a barrel must end there).

The exporter renders all **183** drawables to transparent PNGs at `EXPORT_SS` 4 px/world
unit and ships them as one ZIP with the manifest the loader reads (`TEST.exportSprites()`,
or the Artwork section in settings). Three things about it:
- **`SPRITES.suspend()` wraps every bake.** Some recipes call the game's own `draw*`
  functions, so exporting on top of an installed pack would otherwise re-encode that pack.
- **`toDataURL`, never `toBlob`** — toBlob returns through a task callback, and a
  background tab throttles those to ~1/sec, which turned a 1-second export into minutes.
- `spriteDefs()` walks `UNIT_TYPES`/`ENEMY_TYPES` by flag rather than listing keys, so a
  new type exports without anyone remembering this file exists. Boxes are the live bake
  constants (`SOLDIER_SPR` etc.) so a repainted PNG lands on the same pixels; bosses need
  a wider one (`paintGermanBoss` scales by `BOSS_SPRITE_SCALE`).

Two extractions this needed, both verified pixel-identical: `paintATGun` /
`paintAAGunBase` / `paintAAGunMount` out of `drawATGun`/`drawAAGun`, and
`paintTrainTurret` / `paintTrainInfantryWagon` / `paintTrainGunWagon` out of the train
wagons. Screen-fixed shadows stay OUTSIDE rotated blits (vehicles, the guns) and are
baked INTO unrotated ones (soldiers, defenses) — and the two gun crews stay procedural,
because a crewman's head carries a screen-fixed lift that doesn't rotate with the
carriage. `DEFENSE_SPRITE_TIERS` (sprites.js) is what keeps the draw guard and the
exporter asking for the same filename: a kind that has one look (a mine, the camo nest's
ground layer) must not be looked up under three tier names. Verify with
`TEST.spriteRoundtrip(id)` — it bakes, encodes, reloads and diffs; single-digit
`meanChannelDiff` is resampling, tens mean a wrong anchor or a clipped box.

**The RUN SAVE** (`js/save.js`) is the single-slot save/continue: SAVE AND EXIT on the
pause menu (endless only — `pauseGame` hides it for tutorials, which also carry live
actor refs in `G.tutorial` that must never reach a save), CONTINUE on the main menu
(`refreshContinueUI` toggles the card off `readRunSave()`). It is a **whitelist
serializer, never `JSON.stringify(G)`**: the boss parent/part links are true cycles
(stringify throws), every actor's `t` is a shared type record, and the Sets
(`cardsOwned`, `dummyBlind`, `awHit`, `recap.usedNames`) plus a corpse's baked
`_sprite` all round-trip as poison. Cross-refs are saved as indices into a **union
list** (`G.enemies` in order, then dead boss parts that survive only in a parent's
`parts`/`pods`) and re-linked on load with object identity restored — `e.parts[n]`
IS `G.enemies[m]` again. `SAVE_STRIP` is an explicit list, NOT an underscore rule:
`e._burst` (the bloater's died-once guard) is load-bearing and rides. Projectile `by`
survives as a ref or a `{side,x,y,type}` stub because ESCALATION rung IV keys on
`by.side`. Corruption stance mirrors `loadEndlessCards`: parse under try/catch,
blanket-discard on version mismatch (`RUN_SAVE_VERSION`), and `deserializeRun` builds
into a local `g` and THROWS on any structural failure (unknown type key, out-of-range
index, orphaned or duplicated `isBossPart`, malformed `itWorks` row — those are indexed
by garrison links, so they're strict, not filtered) — `G` is assigned only after every
check passes, and a discarded save just means no CONTINUE card, silently. **The
strict/tolerant split is the thing to get right, and it was wrong once:** `reqArr` fails
on any state-bearing field that isn't an array and on a missing `scalars` block, because
the tolerant `arr()`/`num()` defaults meant `run.enemies = {}` resumed a wave-40 board
with no enemies and a deleted `scalars` resumed it at wave 0 — *worse* outcomes than
ditching, which is the whole promise. `serializeRun` always writes every one of those
fields, so requiring them is free. Tolerance is only for genuinely optional per-actor
data (card ids, stamp records, `dummySeen`/`dummyBlind`). The slot is deleted in
`endRun` (guarded on `G.level.id === 'endless'`, so a tutorial death spares an
endless save) and by the `#abandon-confirm` prompt gating `openEndlessLoadout` — the
one choke point for every menu-driven endless start. The resume path reuses
`enterField` (extracted from `startGame`'s tail — keep them one path) and runs
`paintGround → replayGroundStamps → resetDecals` in newGame's order. Baked wreck art
survives via `G.groundStamps`: all 13 `stamp*` writers log `{k,x,y}` through
`logGroundStamp` (capped 1000; a `replayingStamps` guard stops replay re-logging),
which also lets `refreshGroundArt`'s forced repaint keep the run's history now. **A
field added to the `newGame` literal or a new actor ref needs a look at js/save.js**
— and possibly a version bump, which is the escape hatch. Drive it with
`TEST.save()` / `TEST.continue()` / `TEST.hasSave()`.

Useful internals when TEST isn't enough: game state is the global `G`
(`js/state.js:105` for its shape), `update(dt)` steps the sim, `draw()`
renders, level catalog is `LEVELS`, unit catalogs are `UNIT_TYPES` /
`ENEMY_TYPES` (internal keys, not README display names).
