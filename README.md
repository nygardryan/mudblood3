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
| Rifleman | 4 | M1 Garand. Cheap, reliable backbone. |
| Gunner | 7 | BAR. Long-range automatic bursts. |
| Grenadier | 8 | Outranges the rifleman by 50%; lobs a devastating frag every 11–16 s. |
| Bazooka | 11 | M1A1 rocket launcher. Prioritizes armor. Scatters badly at range; veterans aim better. |
| Mortarman | 14 | Portable 60mm mortar. Long-range indirect fire, blind inside 160px. |
| Sniper | 10 | Sees the whole field, prioritizes officers, snipers, MGs. |
| Medic | 12 | Heals nearby wounded over time. |
| Officer | 15 | Nearby men fire faster and straighter; generates TP. |
| Flamer | 13 | M2 flamethrower. Devastating cone of fire — burns friend and foe alike. |
| Sherman | 40 | M4 tank. Alternates 75mm HE shells and coaxial MG bursts, even while driving. Medics **cannot** repair it. |
| Wire | 4 | Slows the advance until it wears out. |
| Sandbags | 5 | Soldiers behind them dodge half of incoming fire. |
| Mine | 6 | Invisible to Germans. Hurts tanks badly. |
| Mortar | 8 | 3 shells on target. Friendly fire is very real. |
| Artillery | 16 | 8 heavy 105mm shells, wide spread. Indiscriminate. |

### Promotions

Every soldier earns experience for his kills and climbs the ranks:
**PVT → PFC → CPL → SGT → SSG → SFC → MSG** (at 2 / 5 / 9 / 14 / 20 / 27 kills).
Each rank makes him fire 5% faster and 6% more accurately, and the promotion
itself patches him up a little. Medics rank up by healing instead — 1 XP per
150 HP restored, a slow road — and work slightly faster with each rank.
Veterans wear gold chevrons over their heads —
select a soldier to see his rank and kill count. Protect your sergeants; a
veteran is worth more than anything you can buy.

### What's coming at you

Riflemen at first, then stormtroopers, grenadiers, MG teams, flamethrowers who
burn anything in front of them (including their own men), officers who drive
their men harder, the rare sniper — and from wave 15 on, the occasional
**Panzer IV**.
Small arms bounce off its armor; use mines, mortars, or artillery.

Random battlefield events keep you honest: enemy barrages, fog, strafing runs from
a friendly P-47, and the occasional fresh replacement wandering in.

## Files

- `index.html` — page, HUD, toolbar, overlays
- `css/style.css` — styling
- `js/audio.js` — WebAudio-synthesized sound effects
- `js/game.js` — all game logic and rendering
