# Dirt & Iron — HTML5 Squad Defense

A WWII squad-defense game built with plain HTML5 Canvas and vanilla JavaScript.
No Flash, no frameworks, no build step.
Sound effects come from curated CC0 / open-licensed samples in `assets/sounds/`
(see attribution file there); a few cues still use lightweight WebAudio synthesis.

## How to run

Just open `index.html` in any modern browser (double-clicking it works), or serve
it locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Game modes

- **Endless** — the classic. Germans attack in endless waves from the top of the
  screen. Hold the line as long as you can — if **7 Germans** slip past the bottom
  edge, your sector collapses and it's game over. There is no victory, only a
  higher wave count. Pick a difficulty before you deploy:
  **Sandbox** (unlimited TP, free purchases; **+1 / +5 / +10** HUD buttons or **] / Shift+] / Ctrl+]** to jump ahead and spawn later waves), **Easy** (full income — the default),
  **Medium** (66% income from kills, trickle, and officers), or **Hard** (33%
  income). Wave attrition still applies on Easy, Medium, and Hard.
  - **Medals & cards (roguelite meta-progression):** every 10th wave survived
    banks **medals** — wave 10 pays 1, wave 20 pays 2, and so on (a run to
    wave 46 earns 10 total). Sandbox and Testing pay nothing. Between runs,
    spend them in the **CARDS** shop on the Endless menu: three cards are on
    offer at a time, and buying one reveals another. Cards are **permanent
    upgrades** to one unit type, active in every future Endless run. Commons
    exist for every type (e.g. **Frenzy** — a kill instantly reloads that
    unit's weapon); uniques belong to a single type (e.g. the sniper's
    **Crack Shot** — every miss guarantees his next shot connects).
- **Allied Campaign — 6 levels** — American battles from Normandy to the Bulge.
  Levels unlock in order; progress is saved in your browser.
  - **Omaha Beach → Carentan → Operation Cobra → Nijmegen → Hürtgen → Bastogne**
  - Assault missions (levels 1–5): spend **TP** each wave to deploy US troops in
    the top strip (or on **landing craft** at Omaha), hit **START WAVE**, and
    push south. Win by getting enough men **past the bottom edge** or wiping
    every German defender; lose if you run out of waves. Unused TP does **not**
    carry over.
  - **D-Day (Omaha):** deploy only on Higgins-boat decks. On START the craft
    motor ashore, drop their ramps, and German beach defenses open fire.
  - **Bastogne (finale):** defend against **12 scripted German waves**. 7
    breaches and the crossroads falls.
- **Axis Campaign — 13 levels** — a tour of famous German offensives from Poland
  1939 to the Ardennes 1944. Levels unlock in order; progress is saved in your
  browser. Between battles, spend **Research Points (RP)** in the **Research**
  screen to permanently unlock unit types (rifle, stormtrooper, and grenadier are
  free starters). Each wave then gives you **TP** to deploy individuals from your
  researched roster in the top strip — hit **START WAVE** and the assault steps
  off. Unused TP does **not** carry over. Win by getting enough men **past the
  bottom edge** (5–7) or wiping every defender; lose if you run out of waves.
  - **Mokra → Sedan → Crete → Brest → Kasserine → Kursk → Cassino → Belarus →
    Hürtgen → Aachen → Arnhem → St. Vith → Bastogne** — each briefing shows a
    map of Europe with the attack arrow.
  - **Earn RP** on first victory per mission (20 RP at Mokra up to 116 at
    Bastogne, plus bonuses for wiping defenders or saving waves). Re-clearing
    missions awards nothing.
  - **Campaign-exclusive units** appear in research at Crete (Fallschirmjäger),
    Kursk (StuG III), and Bastogne (Tiger I).
- **Commando Campaign — Level 1: Hit Squad** — a separate direct-control campaign.
  You command a fixed six-man squad (officer, sniper, MG gunner, two stormtroopers,
  a grenadier) exactly like US soldiers: click or drag-select, then click ground to
  move. Nobody advances without orders. Your men are hand-picked veterans — tougher,
  deadlier, and longer-armed than line infantry — but six guns cannot win a stand-up
  fight against the whole detail. **Kill the marked US officer** at the bottom of
  the map within **5 minutes**. The direct approach is wired and mined; the flanks are
  thin — work around the line and let the sniper finish the job from range. Lose if
  the clock runs out or the whole squad dies. No TP, no purchases — the six men are
  all you get. Completion is tracked locally like the Axis campaign.

## How to play

France, 1944. Pick a mode from the main menu.

- **Tactical Points (TP)** are your only currency. You earn them from kills, **+1 TP
  every 8 s**, and living officers (**+1 TP / 30 s** each — up to **3 TP** for a
  max-rank officer; **5 officers** max on the field). In Endless, supply lines thin
  out as the battle drags on: all income shrinks ~1% per wave, dropping to a hard
  10% floor from wave 90 on. Campaign levels pay full rate.
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
- In the **Axis campaign** there is no selecting or ordering: during each build
  phase, place units in the top strip, then hit **START WAVE** to launch the assault.
  The toolbar is your whole command.

### Your arsenal

| Item | TP | Notes |
|---|---|---|
| Rifleman | 3 | M1 Garand. Cheap, reliable backbone. |
| Gunner | 9 | BAR. Long-range automatic bursts. |
| Grenadier | 7 | Outranges the rifleman by 50%; lobs a devastating frag every ~10–14 s. |
| Shotgunner | 5 | M97 trench gun and body armor. High HP; buckshot shreds every enemy in the cone up close. |
| Bazooka | 12 | M1A1 rocket launcher. Prioritizes armor. Scatters badly at range; veterans aim better. |
| Mortarman | 14 | Portable 60mm mortar. Long-range indirect fire, blind inside 220px. |
| Sniper | 10 | Sees the whole field, prioritizes officers, snipers, MGs. |
| Medic | 12 | Heals nearby wounded over time. |
| Engineer | 14 | Repairs emplacements; fortifies nearby sandbags/bunkers/wire (more HP, better effect). SMG, close range only. |
| Officer | 15 | Nearby men fire faster and straighter; generates TP. |
| Flamer | 7 | M2 flamethrower and flak vest. Devastating cone of fire — burns friend and foe alike. |
| Jeep | 30 | Willys jeep with a .50 cal HMG. Fast, fires on the move, unarmored — no field repairs. |
| Sherman | 80 | M4 tank. Alternates 75mm HE shells and coaxial MG bursts, even while driving. Medics **cannot** repair it. |
| AT Gun | 40 | 57mm anti-tank gun. Immobile once placed; only fires on vehicles inside its forward cone. Direct-fire AP shells wreck armor. |
| Wire | 4 | Slows the advance until it wears out. |
| Sandbags | 5 | Soldiers behind them dodge half of incoming fire. |
| Bunker | 15 | Concrete pillbox with 10x sandbag HP. Soldiers inside dodge 75% of incoming fire; shrugs off shellfire. |
| Minefield | 6 | Places 3 invisible mines. Hurts tanks badly. |
| Mortar Strike | 8 | 6 shells on target. Friendly fire is very real. |
| Artillery Strike | 16 | 16 heavy 105mm shells, wide spread. Indiscriminate. |

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

Riflemen at first, then stormtroopers, grenadiers, MG teams, flamethrowers who
burn anything in front of them (including their own men), officers who drive
their men harder, and snipers from wave 14 on. From wave 9, watch for
**motorcycle sidecar teams** that race down the field and drop a two-man crew
(random types) at rifle range. Shoot the bike early and the crew dies with it;
barbed wire ends the ride instantly. From wave 16 the **Kübelwagen** gun car may
roll in — it halts at range and hoses your line with an MG42 until someone
deals with it. From wave 18 the **Sd.Kfz. 251 halftrack** hauls a full squad
forward: it dumps six troopers the moment it reaches rifle distance of your
line, then keeps fighting as an armored gun truck. Kill the bus early, before
it delivers. From wave 25 on, the occasional **Panzer IV** grinds in; from
wave 60, **mortar teams**; from wave 80, **Panzerfaust** carriers. Small arms
bounce off armor; use mines, mortars, or artillery.

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
- `docs/axis-units.md` — design notes for tuning German unit stats and AI

The game code lives in `js/` as plain scripts sharing one global scope; they
load in dependency order via `index.html` (definitions first, `main.js` last):

- `js/constants.js` — tuning constants & placeable catalog
- `js/levels.js` — level definitions
- `js/helpers.js` — small shared helpers
- `js/state.js` — canvas setup & global game state
- `js/economy.js` — TP economy
- `js/waves.js` — waves & spawning
- `js/events.js` — random events
- `js/ordnance.js` — shells, grenades, rockets & bombs
- `js/damage.js` — damage & death
- `js/shooting.js` — shooting
- `js/targeting.js` — target selection
- `js/update-friendlies.js` — per-frame friendly unit logic
- `js/update-enemies.js` — per-frame enemy unit logic
- `js/tutorial.js` — tutorial scripts
- `js/update.js` — main update loop
- `js/render-units.js` — soldier, kit & weapon drawing
- `js/render-world.js` — vehicle, emplacement & defense drawing
- `js/render.js` — scene composition (main draw)
- `js/inspector.js` — hover inspector
- `js/hud.js` — HUD / DOM panels
- `js/input.js` — placement & pointer/keyboard input
- `js/codex.js` — codex
- `js/cards.js` — endless cards & battle plans
- `js/research.js` — axis research
- `js/campaign.js` — campaign progress
- `js/leaderboards.js` — endless leaderboards
- `js/settings.js` — settings
- `js/flow.js` — menus, briefings & game flow
- `js/main.js` — event wiring, frame loop & bootstrap
