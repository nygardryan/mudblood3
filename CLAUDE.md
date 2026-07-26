# Trenchworks: WW2 — agent notes

WW2 squad-defense game. Plain HTML5 Canvas + vanilla JS, **no build step, no
package.json, no test framework**. Scripts in `js/` share one global scope and
load in dependency order via `index.html` (`main.js` second-to-last,
`test-api.js` last). See README.md for gameplay and the per-file map.

## Running it

Serve statically — `.claude/launch.json` already defines a `static-server`
config (python3 http.server). Use the preview/browser tooling, not Bash.

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
                                   // or 'zo' (The Horde — undead).
                                   // omitted = random per run (1-in-3 each).
                                   // state().enemyFaction reports it.
TEST.deploy('gunner', 0.5, 0.75)   // FREE god-mode spawn; (0..1] coords = fractions of field
TEST.deploy('sandbags', 0.4, 0.7)  // deploys ANY placeable — defenses, supports, German test units
TEST.buy('gunner', 0.5, 0.75)      // REALISTIC purchase: charges TP, checks cap/placement, runs place()
TEST.step(30)                      // advance 30 sim-seconds (pumps update() manually), redraws
TEST.state()                       // {mode, phase, wave, tp, kills, breaches, units, enemies, ...}
TEST.roster()                      // per-actor detail {units,enemies}: type, pos, hp, rank, kills
TEST.catalog()                     // what's buyable now: {key,label,kind,cost,affordable,atCap}
TEST.costs()                       // {key: resolved TP cost} (honours difficulty/cards/overrides)
TEST.inspect(x, y)                 // hover blurb for the actor at a point: name, hp, rank, stats, desc
TEST.event('smokescreen')          // fire a random event on demand, ignoring its wave gate
TEST.setTP(100) / TEST.addTP(20)   // script TP for a scenario
TEST.autoplay({ seconds: 240 })    // autonomous endless player: spends+steps, returns {over,waves,log}
TEST.stepUntil(g => g.kills > 0, 60)
TEST.spawnEnemy('panzer', 0.5, 0.1)  // defense modes only
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
vs anything armored — see `fireShot`), retreat to `BOSS_BACKLINE_Y` (on-field,
so artillery can punish the refit), refill armor and call two DISTINCT
reinforcement plays (`bossCallReinforcements`: smokescreen/airraid via
`runEvent`, paradrop, vehicle column, human wave), then advance again down a
lane ≥ 2 indices away. Immune to prone/suppression (`t.boss` checks in
`tryGoProne`/`suppress`) and stun (dispatch order + `maybeShellShock`); can
never breach (`BOSS_SAFE_Y` clamp). Killing him fires `bossVictory()`
(`js/flow.js`): the sim pauses under a `#boss-victory` overlay offering FIGHT
ON (run continues, boss returns at the next ×100) or END RUN — VICTORY (full
`endRun(true, …)` recap). **That overlay is shared with the Yamato** — its title
and copy come from `bossVictoryCopy()`, keyed on `G.enemyFaction`, so anything
added there needs wording for both. Tuning in the `BOSS_` block in `js/constants.js`;
art is `paintGermanBoss` (`js/render-soldier.js`) + `drawRevolver`
(`js/render-weapons.js`); wide always-on bars via `drawBossOverlays`. He is drawn
as nothing but an OVERSIZED INFANTRYMAN: an officer's body ellipse, a standard
head, and the rifleman's own belt kit (`drawErifleKit`), all pushed through one
uniform `BOSS_SPRITE_SCALE` (1.35×) — his `gun:14` exists so the barrel clears
the scaled coat. Every attempt to make him look important by adding GIRTH
instead of size (a 1.45× scale, a rear coat-flare ellipse, a wide pale collar
crescent, shoulder boards) read as a dark blob rather than a man, because they
widened him without lengthening him. Change the scale, never the local ratios.
`deploy('eboss', …)` works (he's in `TESTING_GERMAN_PLACEABLES`) and his state
lives on the enemy object: `bossState`/`shots`/`lane`/`laneX`/`rallyT`.

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
`spawnSpecialWave` beside the German one). She is the **first of two multi-hitbox
actors** (the Progenitor below is the other), and that is the thing to understand
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
knocked-out part and **must re-`push` it into `G.enemies`**. Tuning is the `YAM_`
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
There's no armor and almost no ranged fire; signature units:
- `zspitter` — the one ranged threat: a `spit` spec lobs a corrosive **bile** glob
  (`fireBile` → `G.biles`, updated in `js/update.js`, burst by `bileBurst`) that
  damages AND infects in a splash. Blind up close (shambles if you get inside `min`).
- `zbloater` — `bloat` spec: bursts on death OR on reaching the line
  (`bloaterBurst`, `e._burst` guard) into a cloud of infectious rot (`bileBurst`).
  A walking mine — hooked in `damageEnemy` (damage.js) and in `updateZombie`.
- `zscreamer` — the horde's "officer": `aura:true` (speeds nearby dead via the
  normal `enemyOfficerNear`/`buffed` path) + `frenzyCmd:true` → `zombieFrenzyCommand`
  hurls nearby zombies into a `chargeT` sprint (mirror of the banzai/avanti command).
- `zrevenant` — the ONLY gunman: no `zombie` flag, so it falls through to the
  standard ranged path (Kar98, poor `acc`). Its bullets wound but don't infect.
- `zabom` (Abomination) — `boss:true`: enormous HP standing in for armor; its bite
  sweeps every defender at reach and near-certainly infects. Rare, late.
- `zhound` — `hound:true`: a quadruped, drawn by its own `paintZombieHound` branch.
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
fast, move `PROG_HP` — never the flame multiplier.

Flags are split rather than reusing hers: **`hordeBoss`** = "killing this ends the
fight" (mirror of `germanBoss`/`japBoss`; read in `damageEnemy`'s `bossVictory()`
call), **`bossPart`** = the child-actor flag (the `shipPart` equivalent, kept
separate so her nine touchpoints keep meaning what their comments say). Pods also
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

Its HP is **one pool drawn as three bars** (`PROG_SEGMENTS`), polled in
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

`deploy`/`spawnEnemy` accept off-field coords (they don't block) but return
`offField: true` with a `warning` when a positional placement lands outside the
playable field — check it so a typo'd coordinate doesn't silently sit a unit
off-screen. Negative y above the top edge is valid *staging* for `spawnEnemy`
(enemies march in from there), so it isn't flagged; for defenders it is.

To fast-forward a whole difficulty read, `autoplay` runs a scaling default build
(pass a `plan: (G) => [{type,x,y},...]` for a custom one) — it pumps the sim like
`step`, so it returns immediately with a per-interval `log`, no wall-clock wait.

The only modes are **endless** (with its `easy`/`medium`/`hard`/`sandbox`/`testing`
difficulties) and the three **tutorial** lessons (`tutorial1`/`2`/`3`), which are
just `endless`-mode levels with a scripted intro. There are no attacker/campaign
modes — your men always live in `G.units`, the foe in `G.enemies`.

Useful internals when TEST isn't enough: game state is the global `G`
(`js/state.js:105` for its shape), `update(dt)` steps the sim, `draw()`
renders, level catalog is `LEVELS`, unit catalogs are `UNIT_TYPES` /
`ENEMY_TYPES` (internal keys, not README display names).
