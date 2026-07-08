# Mud & Blood — HTML5 Remake

A tribute to *Mud and Blood 2*, the classic Flash squad-defense game, rebuilt with
plain HTML5 Canvas and vanilla JavaScript. No Flash, no frameworks, no build step.
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
- **Allied Campaign — Level 1: Hold the Line** — survive **12 scripted waves**,
  ramping from rifle squads to a halftrack-led final assault. Wipe out the last
  wave and the sector is yours. 7 breaches still lose it. No income attrition and
  no random events — the assault plan is fixed.
- **Axis Campaign — Level 1: Break the Line** — the tables turn. You start with
  **30 TP** against a dug-in American line. Most units cost the same as Endless,
  but the ones that could break through alone (riflemen, stormtroopers, bikes,
  etc.) are priced up. Combined arms — softening fire, infantry, and breach
  units together — is the way through. Get **7 men past the bottom edge** within
  **6 minutes** to win. US reinforcements arrive at the 3-minute mark.
- **Axis Campaign — Level 2: Hit Squad** — a commando mission with direct
  control. You command a fixed six-man squad (officer, sniper, MG gunner, two
  stormtroopers, a grenadier) exactly like US soldiers: click or drag-select,
  then click ground to move. Nobody advances without orders. Your men are
  hand-picked veterans — tougher, deadlier, and longer-armed than line
  infantry — but six guns cannot win a stand-up fight against the whole
  detail. **Kill the marked US officer** at the bottom of the map within
  **5 minutes**. The direct approach is wired and mined; the flanks are thin —
  work around the line and let the sniper finish the job from range. Lose if
  the clock runs out or the whole squad dies. No TP, no purchases — the six
  men are all you get.

## How to play

France, 1944. Pick a mode from the main menu.

- **Tactical Points (TP)** are your only currency. You earn them from kills, a slow
  trickle over time, and officers (+1 TP / 10 s each). In Endless, supply lines thin
  out as the battle drags on: all income shrinks ~1% per wave, dropping to a hard
  10% floor from wave 90 on. Campaign levels pay full rate.
- Click a toolbar button (or press its **number key**), then click the field to
  deploy. Right-click or **Esc** cancels placement.
- Press **Esc** or the **PAUSE** button in the HUD to open the pause menu mid-game;
  choose **Resume** to return to the fight.
- Men and defenses can only be placed in the **lower half** (behind the trench line).
  Mortar and artillery strikes can be called anywhere.
- Left-click one of your soldiers to select him, then click open ground to move him.
  He can't shoot while running.
- Drag a box over several soldiers to select the whole group; a move order spreads
  them into a tight formation around the target instead of piling everyone on one spot.
- In the **Axis campaign** there is no selecting or ordering: place a unit in the top
  strip and its attack instincts take over. The toolbar is your whole command.

### Your arsenal

| Item | TP | Notes |
|---|---|---|
| Rifleman | 3 | M1 Garand. Cheap, reliable backbone. |
| Gunner | 7 | BAR. Long-range automatic bursts. |
| Grenadier | 8 | Outranges the rifleman by 50%; lobs a devastating frag every 11–16 s. |
| Shotgunner | 9 | M97 trench gun and body armor. High HP; buckshot shreds every enemy in the cone up close. |
| Bazooka | 11 | M1A1 rocket launcher. Prioritizes armor. Scatters badly at range; veterans aim better. |
| Mortarman | 14 | Portable 60mm mortar. Long-range indirect fire, blind inside 220px. |
| Sniper | 10 | Sees the whole field, prioritizes officers, snipers, MGs. |
| Medic | 12 | Heals nearby wounded over time. |
| Engineer | 14 | Repairs emplacements; fortifies nearby sandbags/bunkers/wire (more HP, better effect). SMG, close range only. |
| Officer | 15 | Nearby men fire faster and straighter; generates TP. |
| Flamer | 13 | M2 flamethrower and flak vest. Devastating cone of fire — burns friend and foe alike. |
| Jeep | 30 | Willys jeep with a .50 cal HMG. Fast, fires on the move, unarmored — no field repairs. |
| Sherman | 50 | M4 tank. Alternates 75mm HE shells and coaxial MG bursts, even while driving. Medics **cannot** repair it. |
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
stronger aura and brings in up to 3 TP per tick. Medics rank up by healing
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
their men harder, the rare sniper — and from wave 15 on, the occasional
**Panzer IV**. From wave 7, watch for **motorcycle sidecar teams** that race
down the field and drop a two-man crew (random types) at rifle range. Shoot
the bike early and the crew dies with it; barbed wire ends the ride instantly.
From wave 8 the **Kübelwagen** gun car may roll in — it halts at range and
hoses your line with an MG42 until someone deals with it.
From wave 11 the **Sd.Kfz. 251 halftrack** hauls a full squad forward: it
dumps six troopers the moment it reaches rifle distance of your line, then
keeps fighting as an armored gun truck. Kill the bus early, before it delivers.
Small arms bounce off armor; use mines, mortars, or artillery.

Every **10th wave** is a themed set-piece assault, and they rotate:
Blitzkrieg (a swarm of motorcycles), Fallschirmjäger Assault (a mass paradrop
behind your line), Sturmangriff (a human wave across the whole field),
Panzerkeil (an armor column with an infantry screen), and Nebelsturm (an attack
rolling in under fog with snipers and MGs). Each theme comes back bigger and
meaner every time it cycles around — but you get a short breather afterward.

Random battlefield events keep you honest: enemy barrages (more shells, heavier
hits, and tighter salvos as waves climb), fog, strafing runs from a friendly P-47,
and the occasional fresh replacement wandering in.

## Files

- `index.html` — page, HUD, toolbar, overlays
- `css/style.css` — styling
- `assets/sounds/` — open-licensed OGG sound effects (+ `ATTRIBUTION.md`)
- `js/audio.js` — sample playback with WebAudio synthesis fallback
- `js/game.js` — all game logic and rendering
