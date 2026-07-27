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
                                   // 'zo' (The Horde — undead), or 'it' (Regio Esercito).
                                   // omitted = random per run (1-in-4 each), UNLESS an
                                   // escalation rung is set — each rung pins a faction,
                                   // and this arg still overrides that pin.
                                   // state().enemyFaction reports it.
TEST.escalation()                  // report the ESCALATION ladder: {level, unlocked, faction, mods, active}
TEST.escalation(7)                 // UNLOCK + select rung 7 (the real unlock costs a boss kill
                                   // per rung). Writes the save — lands on the NEXT start().
TEST.deploy('gunner', 0.5, 0.75)   // FREE god-mode spawn; (0..1] coords = fractions of field
TEST.deploy('sandbags', 0.4, 0.7)  // deploys ANY placeable — defenses, supports, German test units
TEST.buy('gunner', 0.5, 0.75)      // REALISTIC purchase: charges TP, checks cap/placement, runs place()
TEST.step(30)                      // advance 30 sim-seconds (pumps update() manually), redraws
TEST.state()                       // {mode, phase, wave, tp, kills, breaches, units, enemies, ...}
TEST.roster()                      // per-actor detail {units,enemies}: type, pos, hp, rank, kills
TEST.catalog()                     // what's buyable now: {key,label,kind,cost,affordable,atCap}
TEST.costs()                       // {key: resolved TP cost} (honours difficulty/cards/overrides)
TEST.works()                       // Regio Esercito field works: kind, pos, hp, fortify tier, occ/cap
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

The **Regio Esercito** is the fourth endless foe (`faction:'it'` in `ENEMY_TYPES`,
16 keys) and the only one that **builds**. It shipped once before and was cut for
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
failure: `IT_WORK_MAX_Y` (the depth wall — the creep stops short of `FORWARD_Y`
and can never enter the player's build pocket), `IT_WORK_CAP`, `IT_BUILDS_PER_MAN`,
and per-wave decay in `decayItalianWorks`. Measured: 60 waves of pure digging
pressure with no player interference plateaus at 12 works from wave 10 onward.

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
- `il3` (L3 Lf) — the only flame-throwing armour anywhere, via the `tankFlame`
  spec. Note its acquisition in `tankTargets` is deliberately **not** cone-gated:
  a tankette closes to ~90px, where its own lateral drift swings the target outside
  a 0.30 arc, and the turret only traverses toward a target it can't see until it
  has traversed — it deadlocked, halted at 91px doing nothing, until that was fixed.

Wave spawning routes through `itaWaveComposition` and `ITA_SPECIAL_WAVES`; the
roster splits into DIGGERS (garrison the works) and CHARGERS (exist for the surge),
and the charger share climbs from 0% at wave 5 to ~47% by wave 45. Art is
`js/render-italian.js` (`paintItalianSoldier`), whose variant dispatch is keyed on
silhouettes via the `IT_ART` map, so a new type that looks like an existing one
costs one line. `TEST.works()` and `TEST.state().it` are the inspection surface.

The **Treno Armato** (`itrain`) is the Italian wave-100 boss — an armored war
train (`spawnItalianBoss`, hooked in `spawnSpecialWave` beside the other three,
`w/100 ×` HP on each return). It rolls straight down a rail lane (`e.laneX`,
drawn ahead of it all the way to the stop — the telegraph) and **parks at
`TRAIN_STOP_Y`**; it never breaches (skip in update.js's breach loop, like the
ship and the mass). The **third multi-actor boss**, on the Progenitor's HP rule,
which is the thing to get right: an engine parent (`itaBoss` — the whole boss
pool, killing it fires `bossVictory()`) plus seven `trainPart` children that
**each own their HP** — two `ittur` turret wagons (Yamato-battery clones firing
`scheduleShell`, traverse wedge off straight-down so they can't fire back up
their own train), one `itwag` infantry boxcar (unloads `TRAIN_DROP_POOL` squads
on a cadence — the fight's economy, killing it stops the tap), and four `itmg`
gun posts on the gun wagon, two per side at `±TRAIN_MG_B` (NOT `tank`, so small
arms have a job; the flatcar itself is scenery, not an actor). No shared pool
anywhere → no de-dupe clause in `explode`/`flameSpray`, and adding one would be
a bug. No damage control: dead wagons stay COUPLED as hulks (`syncTrainParts`
repositions dead parts on purpose, unlike hers). One pool drawn as
`TRAIN_SEGMENTS` (3) bars, polled with a `while` in `updateWarTrain`; each
break runs `trainSoundsCharge`, which arms the SAME `G.itCharge` signed clock
the ambient AVANTI runs (telegraph included) rather than firing a charge of its
own, and pushes `G.itAvantiCd` back so the field doesn't owe a second charge
right after. It crushes the player's emplacements on its lane while rolling
(`trainCrush` — `G.itWorks` deliberately spared). The wagons carry `tank:true`,
so the `trainPart` bare return in `updateEnemy` is load-bearing (updateTank
would drive them off the rails). Tuning is the `TRAIN_` block in
`js/constants.js`; art is `js/render-train.js` (`paintTrainEngine` is PURE, for
the codex portrait; `drawWarTrainPass` runs before the enemy loop).
`deploy('itrain', …)` works — parts are built lazily by `initWarTrain` on the
first tick — and `TEST.state().enemies` counts/HP are inflated by parts here
too: 8 actors per train. `BOSS_COPY` (`js/flow.js`) has an `'it'` row — one
table keyed on faction holding the victory title, the stats sentence's two
variable halves (what fell, and its pronoun) and the Escalation-X "not done
yet" banner; `de` remains the unguarded fallback for any FIFTH faction.

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
  REACH instead: standing at y 92–128 it sits outside rifleman (154), gunner
  (179), grenadier (231) and bazooka (243) range, so the artillery answer falls
  out of geometry for free while a player who walks men up to `FORWARD_Y` can
  close and trade. If it dies too fast the lever is `AW_STAND_Y_MIN`, never an
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
off-screen. Negative y above the top edge is valid *staging* for `spawnEnemy`
(enemies march in from there), so it isn't flagged; for defenders it is.

To fast-forward a whole difficulty read, `autoplay` runs a scaling default build
(pass a `plan: (G) => [{type,x,y},...]` for a custom one) — it pumps the sim like
`step`, so it returns immediately with a per-interval `log`, no wall-clock wait.

The only modes are **endless** and the three **tutorial** lessons
(`tutorial1`/`2`/`3`), which are just `endless`-mode levels with a scripted intro.
There are no attacker/campaign modes — your men always live in `G.units`, the foe
in `G.enemies`. Endless difficulty is `easy` plus the ESCALATION ladder below;
`sandbox`/`testing` are the unlimited-TP tiers. **`medium` and `hard` still exist
in `ENDLESS_DIFFICULTIES` but left the menu** — keep them, `TEST.start` and the
banked leaderboard boards are keyed on those ids.

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
- **Each rung PINS the enemy faction**, cycling `de`/`jp`/`zo`/`it`, so a climb is
  "prove it against every army" — without that, rung VI's doubled plate is brutal
  against the Regio Esercito and literally nothing against the Horde, which wears
  none. `G_forceFaction` (TEST) still wins over the pin.
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

The menu (`#esc-block` in `index.html`) is three surfaces: a **rung strip** of
eleven chips (every earned rung one tap away), a **readout** pairing the rung
with what it PAYS, and `#esc-dossier`, holding all ten modifiers — the ten
`ee-card`s that used to sit under the stepper moved in there because at rung X
they pushed the deploy button a screen and a half down a panel whose only job is
to start a run. `pickEscalation` is the single write path for the selection
(strip and both arrows).

**`#esc-block` is always on screen and its PLAY button IS the deploy control for
endless** — that is why there is no TAKE THE LINE mode card any more and
`OTHER MODES` is just sandbox/testing. At rung 0 the block reads as a clean
sector with the ladder locked ahead of it, which is the teaser. Rung 0 has no
numeral, so any copy naming the rung you must beat has to drop the `ON —`
(`buildEscalationUI`'s next-line and the dossier's locked rows both branch on
it). Unlike the card shop and the leaderboards, the dossier **layers over**
`#endless-select` rather than swapping it out (z-index 11 over 10, own scrim, own
fade) — it's a reference sheet you consult mid-decision. It closes on ✕, on a
backdrop click (`e.target` check, so a row click still expands), and on Escape,
which it claims first in `js/input.js`'s handler via `escDossierOpen()`.

Two CSS notes: everything in the panel measures in `cqi` off a container
declared on `#endless-select .mm`, because an overlay lives inside the scaled
`#stage` and `vw`/`@media` there read the WINDOW, not the ~576px the panel gets
(same trap the After-Action Report documents); and every selector for a
`<button>` is prefixed `#endless-select` / `#esc-dossier` to outrank
`.overlay button`, which repaints every overlay button gold.

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

The exporter renders all **172** drawables to transparent PNGs at `EXPORT_SS` 4 px/world
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

Useful internals when TEST isn't enough: game state is the global `G`
(`js/state.js:105` for its shape), `update(dt)` steps the sim, `draw()`
renders, level catalog is `LEVELS`, unit catalogs are `UNIT_TYPES` /
`ENEMY_TYPES` (internal keys, not README display names).
