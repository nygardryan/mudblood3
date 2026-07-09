# Axis unit design guidelines

Two rules of thumb when adding or tuning German (`ENEMY_TYPES`) units in `js/game.js`.

---

## 1. Axis counterparts should be slightly worse than Allied units

When there is a direct US/Axis pair, the German version should generally be a step down on paper. The player buys and commands Allied troops; Axis attackers are spawned in waves or purchased in the Axis campaign, so a small stat edge keeps defense fair without making Germans feel like cardboard.

### What to tune down

Compare against the matching entry in `UNIT_TYPES` and shave one or more of:

| Stat | Typical Axis adjustment |
|------|-------------------------|
| HP | ~10–25% lower |
| Speed | Slower (especially infantry) |
| Range | Shorter direct-fire range |
| Damage / accuracy | Lower `dmg`, `acc`, or fewer burst rounds |
| Rate of fire | Higher `rof` value = slower shots |
| Specialist payloads | Same weapon profile is fine; trim HP/speed on the carrier |

Leave reward (`reward` on enemies) and spawn cost (`AXIS_PLACEABLES`) separate — those are economy knobs, not combat parity.

### Examples in the codebase

| Allied | Axis | Notes |
|--------|------|-------|
| `rifleman` — 100 HP, 230 rng, 13 dmg, 0.55 acc, speed 42 | `erifle` — 60 HP, 210 rng, 10 dmg, 0.42 acc, speed 22 | Lower across the board |
| `bazooka` — 90 HP, speed 40 | `ebazooka` — 75 HP, speed 20 | Same rocket block; weaker trooper |
| `mortarman` — 90 HP, speed 38 | `emortar` — 75 HP, speed 18 | Same mortar block; weaker trooper |
| `sniper` — 85 HP, 372 rng, 46 dmg, 0.72 acc | `esniper` — 55 HP, 312 rng, 39 dmg, 0.66 acc | Weaker and shorter reach |
| `flamer` — 130 HP, 38 dps | `eflame` — 85 HP, 34 dps | Less durable, slightly less burn |

Specialist blocks (`rocket`, `mortar`, `flame`, etc.) can mirror the Allied numbers when the weapon itself is the same class; differentiate on the soldier carrying it.

### Template for a new paired unit

```js
// UNIT_TYPES — Allied reference
bazooka: {
  name: 'Bazooka', hp: 90, range: 120, dmg: 8, acc: 0.45,
  rof: 1.0, speed: 40,
  rocket: { range: 363, cdMin: 7.4, cdMax: 10.1, r: 30, dmg: 120, speed: 380, armorMult: 2.75 },
},

// ENEMY_TYPES — Axis counterpart (slightly worse trooper, same weapon class)
ebazooka: {
  name: 'Panzerfaust', hp: 75, speed: 20, range: 120, dmg: 8, acc: 0.45,
  rof: 1.0, burst: 1, burstGap: 0, reward: 5,
  color: '#545648', gun: 5, sfx: 'pistol', priority: 4,
  rocket: { range: 363, cdMin: 7.4, cdMax: 10.1, r: 30, dmg: 120, speed: 380, armorMult: 2.75 },
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
