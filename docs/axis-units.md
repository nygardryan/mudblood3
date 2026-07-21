# Axis unit design guidelines

Two rules of thumb when adding or tuning German (`ENEMY_TYPES`) units in `js/game.js`.

---

## 1. Axis counterparts should be slightly *better* than Allied units

When there is a direct US/Axis pair, the German version is now a step **up** on paper — roughly a 10% edge. Endless income was cut hard for performance (far fewer units on the field), which made the opening trivially easy; giving the attackers a stat edge restores the pressure so the player's larger bankroll buys experimentation, not a free win. (This reverses the earlier "Axis are slightly worse" rule.)

### What to tune up

Compare against the matching entry in `UNIT_TYPES` and set the Axis unit to that stat **× 1.1 in the favorable direction**:

| Stat | Axis adjustment |
|------|-----------------|
| HP | ~10% higher (`× 1.1`) |
| Speed | ~10% faster (`× 1.1`) |
| Range | ~10% longer direct-fire range (`× 1.1`) |
| Damage / accuracy | Higher `dmg`, `acc`, or an extra burst round (`× 1.1`) |
| Rate of fire | Lower `rof` value = faster shots (`× 0.9`) |
| Specialist payloads | Give the shell/rocket/flame block the same 10% edge (more `dmg`/`dps`/radius, shorter cooldowns) |

Leave reward (`reward` on enemies) and spawn cost (`AXIS_PLACEABLES`) separate — those are economy knobs, not combat parity.

Axis-only types with no direct Allied pair (Stormtrooper, Kradschützen, halftrack, the tanks, the V2 battery) take a flat **+10% over their previous numbers** instead of rebasing onto an Allied unit.

### Examples in the codebase

| Allied | Axis | Notes |
|--------|------|-------|
| `rifleman` — 100 HP, 154 rng, 13 dmg, 0.55 acc, speed 42 | `erifle` — 110 HP, 169 rng, 14 dmg, 0.6 acc, speed 46 | Higher across the board |
| `bazooka` — 90 HP, speed 40 | `ebazooka` — 99 HP, speed 44 | Rocket block also +10% (132 dmg vs 120) |
| `mortarman` — 90 HP, speed 38 | `emortar` — 99 HP, speed 42 | Mortar block also +10% (83 dmg, 44 r) |
| `sniper` — 85 HP, 249 rng, 46 dmg, 0.72 acc | `esniper` — 94 HP, 274 rng, 51 dmg, 0.79 acc | Tougher and longer reach |
| `flamer` — 130 HP, 38 dps | `eflame` — 143 HP, 42 dps | More durable, slightly more burn |

Specialist blocks (`rocket`, `mortar`, `flame`, etc.) carry the same 10% edge as the trooper now, rather than mirroring the Allied numbers.

### Template for a new paired unit

```js
// UNIT_TYPES — Allied reference
bazooka: {
  name: 'Bazooka', hp: 90, range: 120, dmg: 8, acc: 0.45,
  rof: 1.0, speed: 40,
  rocket: { range: 363, cdMin: 7.4, cdMax: 10.1, r: 30, dmg: 120, speed: 380, armorMult: 2.75 },
},

// ENEMY_TYPES — Axis counterpart (~10% better trooper and weapon block)
ebazooka: {
  name: 'Panzerfaust', hp: 99, speed: 44, range: 132, dmg: 9, acc: 0.5,
  rof: 0.9, burst: 1, burstGap: 0, reward: 5,
  color: '#545648', gun: 5, sfx: 'pistol', priority: 4,
  rocket: { range: 399, cdMin: 6.7, cdMax: 9.1, r: 33, dmg: 132, speed: 380, armorMult: 3.0 },
},
```

---

## 2. Axis units should sometimes push forward even while engaging

Germans advance down the map. A unit with a target in range should **stand and fight by default**, but periodically **stop shooting and push** so long-range specialists and entrenched shooters still close distance over time. Fast assault troops (`speed >= 30`) may also **creep forward while firing**.

Do **not** call `advance()` every frame just because the sidearm is out of range while a rocket/mortar target exists — that makes Panzerfaust and mortar teams march constantly instead of using their primary weapon.

### Required state on every enemy

Initialized in `makeEnemy()`:

```js
pushT: 0, pushCd: rand(2, 5),
```

### Core helper — roll the push urge

All infantry and vehicles that can shoot while stationary should use this:

```js
// discipline only goes so far: periodically stop shooting and push upfield
function rollEnemyPushUrge(e, target, dt, command) {
  if (command || !target) return;
  e.pushCd -= dt;
  if (e.pushCd <= 0) {
    e.pushCd = rand(3, 6);
    if (Math.random() < 0.4 && dist(e, target) > 70) {
      e.pushT = rand(1.2, 2.8);
    }
  }
}
```

### Execute the push burst (top of `updateEnemy`)

Before weapon logic, honor an active push — infantry use `advance()`, vehicles use their drive helper:

```js
} else if (e.pushT > 0) {
  // discipline only goes so far: every German periodically stops shooting and
  // pushes up the field, so long-range shooters eventually close the distance
  e.pushT -= dt;
  advance(e, dt, buffed);
  return;
}
```

### Standard infantry loop (riflemen, Panzerfaust, Granatwerfer, etc.)

Pattern at the end of `updateEnemy()`:

```js
const target = nearestUnitInRange(e, range);       // sidearm / direct-fire range
let rocketTarget = null;
let mortarTarget = null;

// ... fire grenades, rockets, mortars; assign rocketTarget / mortarTarget ...

const engageTarget = target || rocketTarget || mortarTarget;

if (target) {
  rollEnemyPushUrge(e, engageTarget, dt, command);
  runWeapon(e, target, dt, buffed ? { rofMult: 0.8 } : null);
  // stormtroopers keep pushing even under fire
  if (!command && e.t.speed >= 30 && dist(e, target) > range * 0.5) {
    advance(e, dt, buffed);
  }
} else if (engageTarget) {
  // rocket/mortar range but outside the sidearm — hold and engage, push only on urge
  rollEnemyPushUrge(e, engageTarget, dt, command);
} else if (!command) {
  advance(e, dt, buffed);
}
```

**Behavior summary:**

| Situation | Movement |
|-----------|----------|
| No target in any weapon range | Steady `advance()` |
| Sidearm target in range | Shoot; roll push urge; stormtroopers (`speed >= 30`) may also creep |
| Only rocket/mortar target (outside sidearm range) | Shoot heavy weapon; roll push urge only — **no** per-frame `advance()` |
| `pushT > 0` | Stop shooting, `advance()` for 1.2–2.8 s |

### Gun vehicles (Kübelwagen, unloaded halftrack)

Custom `update*` functions must still wire in the same urge + burst pattern:

```js
function updateEnemyJeep(e, dt) {
  const command = G.mode === 'hitsquad';
  if (e.pushT > 0) {
    e.pushT -= dt;
    driveEnemyVehicle(e, dt, 0.08, 8, true);
    return;
  }
  const target = nearestUnitInRange(e, unitRange(e, e.t.range) * fogMult());
  if (target) {
    rollEnemyPushUrge(e, target, dt, command);
    runWeapon(e, target, dt, null);
    return;
  }
  driveEnemyVehicle(e, dt, 0.08, 8, true);
}
```

### Exceptions

Some types intentionally use different movement rules:

- **Panzer IV** — always grinds forward in `updateTank()`.
- **Kradschützen** — races down the field in `updateBike()` until dismount.
- **Hit Squad** — player-issued `moveTo` only; no auto push (`command === true` skips urges).

When adding a new Axis type, either hook it into the patterns above or document why it is an exception.

---

## 3. Campaign-exclusive units (Axis campaign only)

These exist in `ENEMY_TYPES` and `AXIS_CAMPAIGN_EXTRA_ENTRIES` but are **not** added to `waveComposition()` endless spawns. They appear in the research tree when the player reaches the matching campaign level:

| Key | Name | Tier gate | RP cost | Notes |
|-----|------|-----------|---------|-------|
| `efall` | Fallschirmjäger | axis3 (Crete) | 25 | Elite infantry: `esmg`-like speed, `erifle`-like range |
| `estug` | StuG III | axis6 (Kursk) | 45 | `tank: true`, `casemate: true` — fixed gun, faster than Panzer IV |
| `etiger` | Tiger I | axis13 (Bastogne) | 90 | `tank: true`, `heavy: true` — slower, tougher, harder-hitting |

Use `drawTank()` branches for `casemate` and `heavy` when adding distinct visuals. Hook movement through `updateTank()` like Panzer IV.
