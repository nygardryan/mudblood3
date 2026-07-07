# Mud & Blood — HTML5 Remake

A tribute to *Mud and Blood 2*, the classic Flash squad-defense game, rebuilt with
plain HTML5 Canvas and vanilla JavaScript. No Flash, no frameworks, no build step,
no external assets — even the sound effects are synthesized in the browser with
WebAudio.

## How to run

Just open `index.html` in any modern browser (double-clicking it works), or serve
it locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## How to play

France, 1944. Germans attack in endless waves from the top of the screen. Hold the
line as long as you can — if **7 Germans** slip past the bottom edge, your sector
collapses and it's game over. There is no victory, only a higher wave count.

- **Tactical Points (TP)** are your only currency. You earn them from kills, a slow
  trickle over time, and officers (+1 TP / 10 s each). Supply lines thin out as the
  battle drags on: all income shrinks ~1% per wave, dropping to a hard 10% floor
  from wave 90 on.
- Click a toolbar button (or press its **number key**), then click the field to
  deploy. Right-click or **Esc** cancels.
- Men and defenses can only be placed in the **lower half** (behind the trench line).
  Mortar and artillery strikes can be called anywhere.
- Left-click one of your soldiers to select him, then click open ground to move him.
  He can't shoot while running.

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
| Engineer | 14 | Repairs tanks and emplacements; fortifies nearby sandbags/wire (more HP, better effect). SMG, close range only. |
| Officer | 15 | Nearby men fire faster and straighter; generates TP. |
| Flamer | 13 | M2 flamethrower. Devastating cone of fire — burns friend and foe alike. |
| Jeep | 20 | Willys jeep with a .50 cal HMG. Fast, fires on the move, unarmored — engineer repairs it, medics can't. |
| Sherman | 50 | M4 tank. Alternates 75mm HE shells and coaxial MG bursts, even while driving. Medics **cannot** repair it. |
| Wire | 4 | Slows the advance until it wears out. |
| Sandbags | 5 | Soldiers behind them dodge half of incoming fire. |
| Minefield | 6 | Places 3 invisible mines. Hurts tanks badly. |
| Mortar | 8 | 3 shells on target. Friendly fire is very real. |
| Artillery | 16 | 16 heavy 105mm shells, wide spread. Indiscriminate. |

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

Random battlefield events keep you honest: enemy barrages (more shells, heavier
hits, and tighter salvos as waves climb), fog, strafing runs from a friendly P-47,
and the occasional fresh replacement wandering in.

## Files

- `index.html` — page, HUD, toolbar, overlays
- `css/style.css` — styling
- `js/audio.js` — WebAudio-synthesized sound effects
- `js/game.js` — all game logic and rendering
