# Trenchworks: WW2

A WW2 squad-defense game built with plain HTML5 Canvas and vanilla JavaScript.
No frameworks, no build step.
Sound effects come from curated CC0 / open-licensed samples in `assets/sounds/`
(see attribution file there); a few cues still use lightweight WebAudio synthesis.

## Where it ships

One codebase, three targets, with the game itself never forked or copied
between them:

- **Web** — the repo root, exactly as described below. The dev/test surface,
  and playable as-is in any modern browser.
- **Desktop (Steam)** — `shells/desktop/`, an Electron wrapper that serves this
  same `index.html`/`js`/`css`/`assets` over a custom protocol, adds a
  fullscreen window and a Steamworks integration seam. See
  `shells/desktop/package.json` (`npm start`, `npm run dist`).
- **Mobile (iOS/Android)** — `shells/mobile/`, a Capacitor wrapper that stages
  the same files into a build folder for the native app. See
  `shells/mobile/README.md`.

The seam between the game and whichever shell it's running under is exactly
one file, `js/platform.js`, loaded before everything else — it tells the game
which shell it's in (or none, on the web) and gives it a couple of
shell-specific hooks (persistent storage, quit/fullscreen). Everything else in
`js/` doesn't know or care which target it's running on.

## How to run

Just open `index.html` in any modern browser (double-clicking it works), or serve
it locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

For automated or console-driven testing there is a small in-page harness on
`window.TEST` (`js/test-api.js`): validated game starts, free unit placement,
manual sim stepping (the frame loop freezes in hidden/automated tabs), and
JSON state snapshots. `TEST.help()` lists the API; `CLAUDE.md` documents the
workflow.

## Game modes

- **Endless** — the classic. Each run rolls its foe: you face the **Germans**,
  the **Imperial Japanese Army**, **The Horde** (the undead), or the
  **Regio Esercito**, attacking in endless waves from the left side of the screen. Hold
  the line as long as you can — if **8 enemies** slip past the right edge, your
  sector collapses and it's game over. There is no victory, only a higher wave count.
  - **The Japanese** field a wholly different 15-unit roster: Arisaka riflemen
    with long bayonets, SNLF SMG troopers, grenadiers, Nambu light and Type 92
    heavy machine guns, nest snipers, knee mortars and 81mm mortar teams, sword
    officers, Type 100 flamethrowers, and three tanks — the fast Ha-Go, the
    Chi-Ha, and the heavy Chi-Nu. Two threats are unique to them —
    **banzai chargers** who sprint in and bayonet your men (no ranged fire, so
    shoot them before they reach the line) and **lunge-mine** suicide men who
    ram your armor and emplacements and detonate on contact. Every Japanese
    soldier is a fanatic: they never go prone, they only close the distance, and
    an officer can scream a **banzai charge** that surges the men around him. He
    telegraphs it: a hazard mark blinks over his head and a ring swells out to
    the men he is about to rouse, and killing him before it lands cancels the
    order outright.
  - **The Horde** is the odd one out — not an army but a rising tide of the dead,
    and the only foe that grows itself out of *your* casualties. There's no armor
    and almost no gunfire; the whole faction is melee, and its signature is the
    **bite**. When a zombie mauls one of your men there's a chance it **infects**
    him — he keeps fighting, but rots on a timer, and if you don't cure him he dies
    and **rises as a zombie against your own line**. A single lost soldier can
    become a hole in the wall. The one hard counter is the **medic**: keep him near
    the line and he burns the infection out of the bitten before they turn.
  - **The Italians** are the only foe that **builds**. Their *Guastatori* assault
    sappers walk out into the open and throw up the same fortifications you can —
    sandbag parapets, bunkers, watch towers — each line a little further down the
    field than the last, and **they are still standing next wave**. The infantry
    then moves into them: a *Fante* behind a parapet is a different problem from a
    *Fante* in the open, a Fiat heavy machine gun in a bunker shrugs off rifle fire
    almost entirely, and a *Cecchino* up a hardened watch tower outranges most of
    your line. Left alone, the enemy front creeps down the map until it is sitting
    on your doorstep.
    - **Your rifles cannot touch a work.** The answer is explosives — grenadiers,
      bazookas, mortars, the Sherman, or a bought mortar/artillery strike. This is
      the one faction that makes you spend on *attack* instead of defence. (Rounds
      a work stops for its garrison do wear it down, so a rifle line grinds one
      away eventually — slowly, and at a price.)
    - Every so often the whole army stops shooting and comes out at once:
      **AVANTI SAVOIA!** A banner goes up, the line pours out of cover, and for the
      next few seconds nothing pins them. That short warning is your window to drop
      a mortar on a force that is still bunched up behind its own parapets. Their
      **Ufficiali** bring the charge sooner just by being alive — shoot the officers
      and you buy yourself digging time.
    - Two units mirror each other: the **Guastatore** builds their line forward,
      and the **Arditi** demolition man tears *yours* down, planting fused charges
      on your emplacements and walking away to do it again. Their armour is
      tankette-heavy and led by the **L3 Lf** — the only flame-throwing tank on any
      front — with M13/40 mediums and casemate Semoventi arriving late.
    - The **Portaferiti** is their stretcher-bearer, and the only Italian who will
      not fight from a work: he walks out to the worst-hit man near him and patches
      him back up, one at a time, until somebody shoots him. He carries a pistol
      and nothing else — shoot him first.
    - **Shamblers** are the slow, endless backbone; **runners**, **crawlers** and
      blazing-fast infected **hounds** swarm and close before you can thin them.
    - **Brutes** are swollen bruisers that soak lead and hit like a truck; the
      **Abomination** is the boss — a mound of fused corpses with enormous HP that
      flattens men and smashes emplacements, standing in for the armor no other
      threat brings.
    - The **Spitter** is the one ranged unit: it hangs back and lobs corrosive
      **bile** that burns and infects everyone in the splash. The **Bloater** is a
      walking mine — kill it at range or it bursts into a cloud of infectious rot.
    - The **Screamer** drives the pack: it enrages the dead around it and shrieks
      to hurl them into a sprint. Like every enemy officer it has to wind the
      order up first — a hazard mark over its head and a ring swelling out to
      the ground it will rouse — so there is a window to shoot it and stop the
      charge before it starts. The **Revenant** is a reanimated soldier still
      clutching a Kar98 — the horde's only gunman, a nasty surprise in a melee mob.
    - Every 10th wave is its own set-piece (a horde surge, a hound pack, a bile
      bombardment, or the Abomination itself), and the paradrop event becomes the
      **dead clawing up out of the ground behind your line**.
  Take the line straight away, or fight in **Sandbox** (in Settings, under Dev
  tools: unlimited TP, free purchases; **+1 / +5 / +10** HUD buttons or
  **] / Shift+] / Ctrl+]** to jump ahead and spawn later waves).
  - **Escalation (the difficulty ladder):** put the wave-100 boss down and you
    unlock **Escalation I**. Each of the ten rungs stacks a permanent modifier on
    top of every rung below it. The rung does **not** pick your enemy — every run
    at every rung still rolls its own army (never the same one twice running), so
    a modifier can land hard against one foe and barely register against another.
    In order: enemies **toughen faster**; **income
    drops a fifth** and the supply trickle slows; the **breather between waves
    disappears**; every enemy attack lands **10% harder**; you deploy with
    **nothing banked**; enemy **body armor doubles**; **events come 30% more
    often**; **waves stop spacing out**; **kills stop paying**; and finally the
    boss has to be put down **twice** before the run is won. Every rung also
    **pays better** — the medal payout climbs 10% a rung, from ×1.0 at the
    bottom to **×2.0 at Escalation X**. The arrows on the PLAY button step your
    rung one at a time, and **ALL 10** opens the full ladder — where the rung
    strip and the rows themselves jump straight to any rung you have earned.
  - **Medals & cards (roguelite meta-progression):** every 10th wave survived
    banks **medals** — wave 10 pays 1, wave 20 pays 2, and so on (a run to
    wave 46 earns 10 total), multiplied by your escalation's payout. Sandbox and
    Testing pay nothing. Between runs,
    spend them in the **CARDS** shop on the main menu, which also shows what you
    have banked: three cards are on
    offer at a time, and buying one reveals another. Cards are **permanent
    upgrades** to one unit type, active in every future Endless run. Commons
    exist for every type (e.g. **Frenzy** — a kill instantly reloads that
    unit's weapon); uniques belong to a single type (e.g. the sniper's
    **Crack Shot** — every miss guarantees his next shot connects).

## How to play

France, 1944. The main menu is one screen and **PLAY** is the whole of it — there
is no mode to pick. The arrows at either end of the PLAY button step the
[Escalation](#game-modes) rung it deploys at, and **ALL 10** opens the ladder,
where any rung you have earned is one tap away. **RESUME** appears above it when
you have a saved run. Sandbox and Testing live in **SETTINGS**, under Dev tools.

- **Tactical Points (TP)** are your only currency. You earn them from kills, **+1 TP
  every 3 s**, and living officers (**+1 TP / 30 s** each — up to **3 TP** for a
  max-rank officer; **5 officers** max on the field). The supply trickle and officer
  pay hold their rate all run; it is the **kill bounties** that thin out, decaying
  smoothly per wave to a hard 10% floor by wave 200 (the War Bonds card stretches
  that curve to wave 400).
- Open **Units**, **Abilities**, or **Emplacements** on the left toolbar, pick an
  item (each shows its hotkey), then click the field to deploy. Right-click or
  **Esc** cancels placement.
- **Hover the mouse over any enemy** to read his name, current HP, weapon stats,
  and what he does — the same blurb the codex carries, without leaving the fight.
  (Mouse only; there is no hovering on touch.)
- Press **Esc** or the **PAUSE** button in the HUD to open the pause menu mid-game;
  choose **Resume** to return to the fight. The **speed** button cycles **0.5× / 1×
  / 2× / 3×**. **CODEX** (main menu or pause) lists every unit, defense, enemy, event,
  and sound; **SETTINGS** adjusts toolbar size and master volume.
- Men and most defenses deploy **behind the trench line** (the lower ~40% of the
  field). **Wire** and **minefields** can go as far forward as the no-man's-land
  line (top third). Mortar and artillery strikes can be called anywhere. Move orders
  can send soldiers up to that forward line.
- Left-click one of your soldiers to select him, then click open ground to move him.
  He can't shoot while running.
- Drag a box over several soldiers to select the whole group; a move order spreads
  them into a tight formation around the target instead of piling everyone on one spot.

### Your arsenal

| Item | TP | Notes |
|---|---|---|
| Rifleman | 3 | M1 Garand. Cheap, reliable backbone. |
| Gunner | 9 | BAR. Long-range automatic bursts. |
| Grenadier | 7 | Outranges the rifleman by 50%; lobs a devastating frag every ~10–14 s. |
| Shotgunner | 5 | M97 trench gun and body armor. High HP; buckshot shreds every enemy in the cone up close. |
| Bazooka | 13 | M1A1 rocket launcher. Prioritizes armor. Scatters badly at range; veterans aim better. |
| Mortarman | 11 | Portable 60mm mortar. Long-range indirect fire, blind inside 118px. |
| Sniper | 10 | The longest reach of any infantryman; prioritizes officers, snipers, MGs. |
| Medic | 12 | Heals nearby wounded over time. |
| Engineer | 14 | Repairs emplacements; fortifies nearby sandbags/bunkers/wire (more HP, better effect). SMG, close range only. |
| Officer | 15 | Nearby men fire faster and straighter; generates TP. |
| Flamer | 7 | M2 flamethrower and flak vest. Devastating cone of fire — burns friend and foe alike. |
| Jeep | 26 | Willys jeep with a .50 cal HMG. Fast, fires on the move, unarmored — no field repairs. |
| Sherman | 50 | M4 tank. Alternates 75mm HE shells and coaxial MG bursts, even while driving. Medics **cannot** repair it. |
| AT Gun | 21 | 57mm anti-tank gun. Immobile once placed; only fires on vehicles inside its forward cone. Direct-fire AP shells wreck armor. |
| AA Gun | 21 | 40mm Bofors. Immobile; elevated barrels engage aircraft and descending paratroopers only. |
| Wire | 3 | Slows the advance until it wears out. |
| Sandbags | 4 | Soldiers behind them dodge half of incoming fire. |
| Bunker | 15 | Concrete pillbox with ~3x sandbag HP. Soldiers inside dodge 75% of incoming fire; shrugs off shellfire. |
| Watch Tower | 10 | Wooden lookout. +25% range for nearby soldiers (+35% fortified, +50% hardened). Frail. |
| Camo Nest | 4 | Concealed position. Hidden until it fires, then exposed 3 s after the last shot (less when fortified). Weak to explosives. |
| Ammo Crate | 8 | Nearby soldiers fire and reload 10% faster (+20% fortified, +30% hardened). Frail. |
| Dummy | 8 | Straw decoy. Enemies waste fire on it; each hit is a 40% chance they see the ruse (lower when fortified). |
| Minefield | 6 | Places 5 invisible mines. Hurts tanks badly. |
| Mortar Strike | 5 | 6 shells on target. Friendly fire is very real. |
| Artillery Strike | 12 | 16 heavy 105mm shells, wide spread. Indiscriminate. |
| Body Armor | 2 | Plate carrier for one infantryman. Its own bar soaks bullet damage until it breaks. |
| Flak Armor | 2 | Flak vest for one infantryman. Its own bar soaks explosion damage until it breaks. |

### Promotions

Every soldier earns experience for his kills and climbs the ranks:
**PVT → PFC → CPL → SGT → SSG → SFC → MSG** (at 2 / 5 / 9 / 14 / 20 / 27 kills).
Veterancy bites hard: each rank makes a man fire 8% faster, 8% more accurately
and 4% harder-hitting, and the promotion itself patches him up a little. A
max-rank soldier is roughly **3–4x** the fighter a green private is, and
specialists scale their trade too — bazookas and mortars reload faster and land
tighter and heavier, grenadiers throw more often, flamethrowers burn far hotter,
Sherman crews reload and shoot straighter, and a veteran officer casts a
stronger aura and brings in up to 3 TP every 30 s. Medics rank up by healing
instead — 1 XP per 150 HP restored, a slow road — and a MSG medic patches men
at over three times the rate. The engineer earns XP the same way through
repairs, plus a bonus for each fortification he completes, and works about 3x
faster at the top.
Veterans wear gold chevrons over their heads —
select a soldier to see his rank and kill count. Protect your sergeants; a
veteran is worth more than anything you can buy.

### What's coming at you

Riflemen at first, then stormtroopers (wave 4), grenadiers (7), MG teams (9),
flamethrowers who burn anything in front of them including their own men (11),
officers who drive their men harder (12), and snipers from wave 13 on. From
wave 9, watch for **motorcycle sidecar teams** that race down the field and drop
a two-man crew (random types) at rifle range. Shoot the bike early and the crew
dies with it; barbed wire ends the ride instantly. From wave 13 the
**Kübelwagen** gun car may roll in — it halts at range and hoses your line with
an MG42 until someone deals with it. From wave 14 the **Sd.Kfz. 251 halftrack**
hauls a full squad forward: it dumps six troopers the moment it reaches rifle
distance of your line, then keeps fighting as an armored gun truck. Kill the bus
early, before it delivers. From wave 30 on, the occasional **Panzer IV** grinds
in; from wave 32, **Granatwerfer mortar teams**; from wave 45, **Panzerfaust**
carriers. Small arms bounce off armor; use mines, mortars, or artillery. Past
wave 100 the assault mechanizes — a growing share of every wave rolls in on
wheels and tracks — and from wave 140 a **V2 battery** may set up, one at a time.

Every **10th wave** is a themed set-piece assault, and they rotate:
Blitzkrieg (a swarm of motorcycles), Fallschirmjäger Assault (a mass paradrop
behind your line), Sturmangriff (a human wave across the whole field),
Panzerkeil (an armor column with an infantry screen), and Nebelsturm (an attack
rolling in under fog with snipers and MGs). Each theme comes back bigger and
meaner every time it cycles around — but you get a short breather afterward.

Random battlefield events keep you honest (Endless only, from wave 3 on): enemy
barrages from wave 4 (more shells, heavier hits, and tighter salvos as waves
climb), fog, **Fallschirmjäger** paradrops from wave 6, strafing runs from a
friendly P-47 from wave 8, and the occasional fresh replacement wandering in.

A **smokescreen** can also drop on you: a smoke round lands somewhere on the
field and burns for 20-60 seconds, throwing off a plume that rides the wind.
Smoke doesn't just spoil aim — it takes the target away. Nobody can shoot at
what they can't see, and a man only sees a little way into the murk: with a bank
of smoke between them, two soldiers stay blind to each other even at close
quarters, and only find each other once they're near enough that there's barely
any smoke left in between. A screen can smother your firing line or cover an
advance straight into it. The wind blows a fixed direction all run but backs or veers a little
every wave, so where the plume ends up is never quite the same twice; a small
arrow at the top-left shows which way it's carrying while smoke is on the field.

### Mobile / touch

On phones and tablets the field scales to fill the screen. **Drag** to pan,
**pinch** or **double-tap** to zoom, and tap **MAP** to reset the view. Tap a
soldier to select him, tap ground to move; **DESELECT** and **SHOP** appear when
men are selected. The purchase toolbar works the same way — tap a category, then
an item, then the field. Hold on the field to cancel placement.

## Files

- `index.html` — page, HUD, toolbar, overlays
- `css/style.css` — styling
- `assets/sounds/` — open-licensed OGG sound effects (+ `ATTRIBUTION.md`)
- `js/audio.js` — sample playback with WebAudio synthesis fallback
- `js/music.js` — music playback
- `docs/axis-units.md` — design notes for tuning German unit stats and AI

The game code lives in `js/` as plain scripts sharing one global scope; they
load in dependency order via `index.html` (`js/platform.js` first, definitions
next, `main.js` third-to-last, then `export-sprites.js`, `test-api.js` last):

- `js/platform.js` — the shell seam: which of web/desktop/mobile the game is
  running under, and its storage/quit/fullscreen hooks
- `js/constants.js` — tuning constants & placeable catalog
- `js/levels.js` — level definitions
- `js/helpers.js` — small shared helpers
- `js/state.js` — canvas setup & global game state
- `js/economy.js` — TP economy
- `js/waves.js` — waves & spawning
- `js/events.js` — random events
- `js/smoke.js` — wind, the smokescreen event & the line of sight it blocks
- `js/ordnance.js` — shells, grenades, rockets & bombs
- `js/damage.js` — damage & death
- `js/shooting.js` — shooting
- `js/targeting.js` — target selection & range/aura indicator overlays
- `js/update-friendlies.js` — per-frame friendly unit logic
- `js/update-enemies.js` — per-frame enemy unit logic
- `js/tutorial.js` — tutorial scripts
- `js/update.js` — main update loop
- `js/sprite-cache.js` — the baked-sprite cache every painter draws through
- `js/sprites.js` — sprite packs: loading an artist's PNGs over the procedural art
- `js/render-overlays.js` — the badges every actor wears: health/armor bars, rank chevrons, selection ring & caption
- `js/render-ground.js` — the per-faction terrain baked once per run
- `js/render-decals.js` — the ground decal layer: blood & craters stamped into one bitmap instead of redrawn each frame
- `js/render-soldier-poses.js` — the shared soldier body/limb poses
- `js/render-weapons.js` — small arms & sidearm drawing
- `js/render-weapons-heavy.js` — the heavy kit: BARs, bazookas, flamethrowers, MGs, mortars
- `js/render-soldier.js` — soldier & kit assembly
- `js/render-japanese.js` — the Imperial Japanese Army soldier renderer
- `js/render-zombie.js` — The Horde (undead) renderer, including the Progenitor
- `js/render-italian.js` — the Regio Esercito soldier renderer
- `js/render-vehicles.js` — vehicle & tank drawing
- `js/render-emplacements.js` — AT/AA guns and the Italian field works
- `js/render-defenses.js` — sandbags, bunkers, wire, towers & the rest
- `js/render-yamato.js` — the Yamato land battleship
- `js/render-train.js` — the Treno Armato armored train
- `js/render-alien-walker.js` — the wave-666 tripod and its walk cycle
- `js/render.js` — scene composition (main draw)
- `js/camera.js` — view camera: mobile pan/zoom/pinch, world<->screen transforms
- `js/inspector.js` — hover inspector
- `js/hud.js` — HUD / DOM panels
- `js/input.js` — placement & pointer/keyboard input
- `js/codex.js` — codex
- `js/cards.js` — endless cards & battle plans
- `js/escalation.js` — the endless difficulty ladder (modifiers, unlock, menu UI)
- `js/campaign.js` — tutorial progress
- `js/leaderboards.js` — endless leaderboards
- `js/settings.js` — settings
- `js/changelog.js` — the in-game changelog
- `js/recap.js` — post-game After-Action Report (per-run stat tracking + recap screen)
- `js/flow.js` — menus & game flow
- `js/main.js` — event wiring, frame loop & bootstrap
- `js/export-sprites.js` — bakes every drawable to PNGs + a manifest (a sprite-pack starter kit)
- `js/test-api.js` — `window.TEST` console/automation harness (inert during play)

`shells/desktop/` and `shells/mobile/` are the Steam and app-store wrappers
described in [Where it ships](#where-it-ships) above — each has its own
`package.json`/tooling and stages or serves this same code rather than
duplicating any of it.
