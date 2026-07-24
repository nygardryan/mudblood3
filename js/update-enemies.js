/* Trenchworks: WW2 — per-frame enemy unit logic.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// Razor Wire card: while a foot soldier is snagged in a strand of barbed wire,
// each frame has a small chance to tear light damage into him. Flag-only, read
// straight from G.cardsOwned like Blast Shelter. Applied wherever infantry drag
// through wire (the standard advance and the commando move path).
const RAZOR_WIRE_BITE_RATE = 0.4;   // expected bites per second in the wire
const RAZOR_WIRE_DMG = [3, 8];      // damage per bite (min, max)
const RAZOR_WIRE_MIN_HP_FRAC = 0.25; // barbs stop biting at/below this HP fraction
function wireBite(e, dt) {
  if (e.dead || !(G.cardsOwned && G.cardsOwned.has('razorwire'))) return;
  // the barbs only soften a man up — they can't finish him. Below a quarter
  // HP the cuts stop biting, so the wire alone can never cheese a kill.
  if (e.hp <= e.maxhp * RAZOR_WIRE_MIN_HP_FRAC) return;
  if (Math.random() < RAZOR_WIRE_BITE_RATE * dt) {
    damageEnemy(e, rand(RAZOR_WIRE_DMG[0], RAZOR_WIRE_DMG[1]), null);
  }
}

function enemyOfficerNear(e) {
  const officers = G.deOfficers || G.enemies;
  for (const o of officers) {
    if (o.dead || o === e) continue;
    if (!(o.t.aura || o.type === 'officer' || o.type === 'eoff')) continue;
    if (dist2(o, e) < 140 * 140) return true;
  }
  return false;
}

function updateEnemy(e, dt) {
  // cosmetic timers, formerly separate full-array passes in update()
  if (e.flameT > 0) e.flameT -= dt;
  if (e.grenThrowT > 0) e.grenThrowT -= dt;
  if (e.mortarFireT > 0) e.mortarFireT -= dt;
  if (e.v2FireT > 0) e.v2FireT -= dt;
  if (e.slashT > 0) e.slashT -= dt;          // banzai bayonet-swing animation
  if (e.chargeT > 0) e.chargeT -= dt;        // banzai-command speed surge

  // still under canopy: drift down, sway in the wind, do nothing else
  if (e.chute > 0) {
    updateEnemyChute(e, dt);
    return;
  }
  if (e.onCraft) return;
  if (e.tutHold) return;   // tutorial: frozen in place until the script releases him

  // Shell Shocked: dazed by a mortar hit — no shooting, no advancing, and it
  // overrides prone recovery so the daze runs its full second first
  if (e.stun > 0) {
    e.stun -= dt;
    return;
  }

  if (e.proneCd > 0) e.proneCd -= dt;
  if (e.prone > 0) {
    // a move order gets him up and running; otherwise he waits it out
    e.prone -= dt;
    if (e.prone <= 0 || e.moveTo) {
      e.prone = 0;
      e.proneCd = rand(4, 6);
    } else {
      return; // pinned: no shooting, no advancing
    }
  }

  const buffed = enemyOfficerNear(e);
  const range = unitRange(e, e.t.range) * fogMult();
  // hit-squad mode: the player commands the squad, so nobody advances on
  // his own — men move only on orders and fight from where they stand
  const command = G.mode === 'hitsquad';

  if (e.t.tank) { updateTank(e, dt); return; }
  if (e.t.bike) { updateBike(e, dt); return; }
  if (e.t.apc) { updateHalftrack(e, dt); return; }
  if (e.t.vehicle) { updateEnemyJeep(e, dt); return; }
  if (e.t.banzai) { updateBanzai(e, dt, buffed, command); return; }
  if (e.t.lunge) { updateLunge(e, dt, buffed, command); return; }
  // The Horde: the Spitter is a ranged biler; every other melee zombie claws and
  // bites (the Revenant has no `zombie` flag and falls through to the gun path).
  if (e.t.spit) { updateSpitter(e, dt, buffed, command); return; }
  if (e.t.zombie) { updateZombie(e, dt, buffed, command); return; }

  // Regio Esercito morale: a wavering regular breaks and falls back unless
  // something steadies him — an officer's aura (buffed) OR a nearby elite
  // (Bersagliere/Folgore), who act as roving morale anchors. `steadied` is read
  // by tryGoProne so a leaderless man also dives for cover more readily.
  if (e.t.wavers && !command) {
    const steady = buffed || italianSteadierNear(e);
    e.steadied = steady;
    if (updateItalianMorale(e, dt, steady)) return;   // currently routing: skip combat
  }

  // player-ordered movement: run to the marker, no shooting on the move
  if (command) {
    if (e.moveTo) {
      const d = dist(e, e.moveTo);
      if (d < 4) {
        e.moveTo = null;
      } else {
        e.face = Math.atan2(e.moveTo.y - e.y, e.moveTo.x - e.x);
        let speed = e.t.speed * (buffed ? 1.25 : 1);
        // barbed wire drags commandos just like everyone else
        for (const wr of G.wires) {
          if (wr.hp > 0 && Math.abs(e.x - wr.x) < 40 && Math.abs(e.y - wr.y) < 14) {
            speed *= wr.up ? 0.05 : 0.12;
            wr.hp -= (wr.up ? 3 : 5) * dt;
            wireBite(e, dt);
            break;
          }
        }
        e.x = clamp(e.x + Math.cos(e.face) * speed * dt, 14, W - 14);
        e.y = clamp(e.y + Math.sin(e.face) * speed * dt, 14, H - 14);
        return;
      }
    }
  } else if (e.pushT > 0) {
    // discipline only goes so far: every German periodically stops shooting and
    // pushes up the field, so long-range shooters eventually close the distance
    e.pushT -= dt;
    advance(e, dt, buffed);
    return;
  }

  if (e.t.flame) {
    const ft = nearestUnitInRange(e, unitRange(e, e.t.flame.range) * fogMult());
    if (ft) {
      rollEnemyPushUrge(e, ft, dt, command);
      e.face = Math.atan2(ft.y - e.y, ft.x - e.x);
      flameSpray(e, dt);
    } else if (!command) {
      advance(e, dt, buffed);
    }
    return;
  }

  if (e.t.shotgun) {
    const sg = e.t.shotgun;
    const st = nearestUnitInRange(e, unitRange(e, sg.range) * fogMult());
    if (st) {
      rollEnemyPushUrge(e, st, dt, command);
      e.face = Math.atan2(st.y - e.y, st.x - e.x);
    }
    e.cd -= dt;
    if (st && e.cd <= 0) {
      fireShotgun(e, { rofMult: 1, accBonus: 0, dmgMult: 1 });
      e.cd = e.t.rof * rand(0.85, 1.15);
    } else if (!st && !command) {
      advance(e, dt, buffed);
    }
    return;
  }

  // a Japanese officer periodically screams the charge order while he fights on
  if (e.t.banzaiCmd && !command) japBanzaiCommand(e, dt);
  // an Italian officer screams AVANTI! — rallies routers and surges the men near him
  if (e.t.avantiCmd && !command) italianAvantiCommand(e, dt);

  const target = nearestUnitInRange(e, range);
  let rocketTarget = null;
  let mortarTarget = null;

  // grenadier lobs grenades — no point scanning for a lob before the fuse hand
  // is free
  if (e.t.grenade) {
    e.grenCd -= dt;
    const gt = e.grenCd <= 0 ? nearestUnitInRange(e, 190) : null;
    if (gt && e.grenCd <= 0) {
      e.grenCd = rand(4.5, 6.5);
      e.grenThrowT = 0.35;
      G.grenades.push({
        x: e.x, y: e.y,
        tx: gt.x + rand(-14, 14), ty: gt.y + rand(-14, 14),
        t: 0, dur: 1.0, sx: e.x, sy: e.y,
        kind: 'stick',
      });
    }
  }

  if (e.t.rocket) {
    e.rocketCd -= dt;
    const rk = e.t.rocket;
    // the pick only matters when the tube is ready to fire, or when there's no
    // sidearm target and it decides whether to hold or advance — skip the scan
    // otherwise, and take all three priority tiers in a single pass
    if (e.rocketCd <= 0 || !target) {
      const rr = rk.range * fogMult();
      const safeR2 = (rk.r + 20) * (rk.r + 20);
      const safe = u => dist2(e, u) > safeR2;
      rocketTarget = tieredUnitTarget(e, rr, [
        u => u.t.tank && safe(u),
        u => (u.t.vehicle || u.t.gunEmplacement) && safe(u),
        safe,
      ]);
    }
    if (e.rocketCd <= 0 && rocketTarget) {
      e.rocketCd = rand(rk.cdMin, rk.cdMax);
      e.face = Math.atan2(rocketTarget.y - e.y, rocketTarget.x - e.x);
      SFX.rocket();
      const d = dist(e, rocketTarget);
      let scatter = 8 + d * 0.11;
      if (rocketTarget.t.tank) scatter *= 0.45;
      scatter = Math.max(6, scatter);
      const tx = rocketTarget.x + rand(-scatter, scatter), ty = rocketTarget.y + rand(-scatter, scatter);
      G.rockets.push({
        sx: e.x, sy: e.y, x: e.x, y: e.y, tx, ty,
        t: 0, dur: Math.max(dist(e, { x: tx, y: ty }) / rk.speed, 0.15),
        r: rk.r, dmg: rk.dmg, by: e,
        kind: 'rocket',
      });
    }
  }

  if (e.t.mortar) {
    e.mortCd -= dt;
    const mt = e.t.mortar;
    // same deal as the rocket: only scan when it can fire or has nothing else
    if (e.mortCd <= 0 || !target) {
      const mr = mt.range * fogMult();
      const min2 = mt.min * mt.min;
      mortarTarget = nearestUnitInRange(e, mr, u => dist2(e, u) > min2);
    }
    if (e.mortCd <= 0 && mortarTarget) {
      e.mortCd = rand(mt.cdMin, mt.cdMax);
      e.face = Math.atan2(mortarTarget.y - e.y, mortarTarget.x - e.x);
      e.mortarFireT = 0.18;
      G.flashes.push({ x: e.x, y: e.y - 6, r: 5, ttl: 0.07, max: 0.07 });
      scheduleShell(
        mortarTarget.x + rand(-mt.scatter, mt.scatter),
        mortarTarget.y + rand(-mt.scatter, mt.scatter),
        mt.flight, mt.r, mt.dmg, false, e);
    }
  }

  let v2Target = null;
  if (e.t.v2) {
    e.v2Cd -= dt;
    const vk = e.t.v2;
    // tanks first, then anything else on wheels, then whatever's left beyond
    // minimum range — a V2 battery has no reason to spare infantry, it's
    // just less interested in them than in armor. One pass, and only when
    // the battery can fire or has nothing else holding its attention.
    if (e.v2Cd <= 0 || !target) {
      const vr = vk.range * fogMult();
      const safeR2 = (vk.r + 60) * (vk.r + 60);
      const min2 = vk.min * vk.min;
      const safe = u => dist2(e, u) > safeR2;
      v2Target = tieredUnitTarget(e, vr, [
        u => u.t.tank && safe(u),
        u => (u.t.vehicle || u.t.gunEmplacement) && safe(u),
        u => dist2(e, u) > min2 && safe(u),
      ]);
    }
    if (e.v2Cd <= 0 && v2Target) {
      e.v2Cd = rand(vk.cdMin, vk.cdMax);
      e.face = Math.atan2(v2Target.y - e.y, v2Target.x - e.x);
      e.v2FireT = 1.1;
      fireV2Rocket(e, v2Target, vk);
    }
  }

  const engageTarget = target || rocketTarget || mortarTarget || v2Target;

  if (target) {
    rollEnemyPushUrge(e, engageTarget, dt, command);
    // the Breda 30 seizes up periodically — it can still reposition, just not fire
    if (!weaponJammed(e, dt)) runWeapon(e, target, dt, buffed ? { rofMult: 0.8 } : null);
    // fast assault troops keep pushing under fire; a Bersagliere `runner` never
    // stops to shoot from range at all — he's always closing the distance
    if (!command && (e.t.runner || (e.t.speed >= 30 && dist2(e, target) > range * range * 0.25))) {
      advance(e, dt, buffed);
    }
  } else if (engageTarget) {
    // rocket/mortar range but outside the sidearm — hold and engage, push only on urge
    rollEnemyPushUrge(e, engageTarget, dt, command);
  } else if (!command && e.t.speed > 0) {
    advance(e, dt, buffed);
  }
}

// the V2's launch: ignition flash at the rail, a smoke ring rolling out flat
// across the ground, and a scorched pad left behind — then the long, wildly
// scattered flight before the warhead comes down (see explodeV2)
function fireV2Rocket(e, target, vk) {
  SFX.rocket();
  G.flashes.push({ x: e.x, y: e.y + 6, r: 26, ttl: 0.35, max: 0.35 });
  addGroundMark({ type: 'crater', x: e.x, y: e.y + 8, r: 30, rot1: rand(0, 3), rot2: rand(0, 3) });
  // exhaust slams off the deflector and rolls outward along the ground
  for (let i = 0; i < 24; i++) {
    const ang = rand(0, Math.PI * 2), sp = rand(50, 150);
    const ttl = rand(0.5, 1.1);
    G.particles.push({
      x: e.x + rand(-4, 4), y: e.y + 6 + rand(-3, 3),
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp * 0.55,
      ttl, maxTtl: ttl, grav: -4, size: rand(3, 6),
      kind: 'smoke', color: pick(['#e8e2d2', '#cfc6b0', '#a89f8a', '#8a8478']),
    });
  }
  // a few hot embers kicked up in the flame
  for (let i = 0; i < 8; i++) {
    G.particles.push({
      x: e.x + rand(-5, 5), y: e.y + rand(0, 10),
      vx: rand(-30, 30), vy: rand(-70, -20),
      ttl: rand(0.2, 0.45), grav: 60, size: rand(1.5, 3),
      color: pick(['#ffdf8a', '#ff9c3c', '#fff2c0']),
    });
  }
  const d = dist(e, target);
  let scatter = vk.scatter + d * 0.14;
  if (target.t.tank) scatter *= 0.6;
  else if (target.t.vehicle || target.t.gunEmplacement) scatter *= 0.8;
  const tx = clamp(target.x + rand(-scatter, scatter), 20, W - 20);
  const ty = clamp(target.y + rand(-scatter, scatter), 20, H - 20);
  const s = scheduleShell(tx, ty, vk.flight, vk.r, vk.dmg, true, e, 'v2');
  s.sx = e.x; s.sy = e.y;   // launch point, so the warhead can be drawn flying in
}

// discipline only goes so far: periodically stop shooting and push upfield
function rollEnemyPushUrge(e, target, dt, command) {
  if (command || !target || e.t.speed === 0) return;   // fixed emplacements never push
  e.pushCd -= dt;
  if (e.pushCd <= 0) {
    e.pushCd = rand(3, 6);
    if (Math.random() < 0.4 && dist2(e, target) > 70 * 70) {
      e.pushT = rand(1.2, 2.8);
    }
  }
}

function advance(e, dt, buffed) {
  e.wobble += dt * 3;
  // a banzai-command surge drives men forward 40% faster until it wears off
  let speed = e.t.speed * (buffed ? 1.25 : 1) * (e.chargeT > 0 ? 1.4 : 1);
  // barbed wire drag; fortified wire grips harder and wears slower, hardened more still
  for (const wr of G.wires) {
    if (wr.hp > 0 && Math.abs(e.x - wr.x) < 40 && Math.abs(e.y - wr.y) < 14) {
      speed *= wr.up2 ? 0.02 : wr.up ? 0.05 : 0.12;
      wr.hp -= (wr.up2 ? 2 : wr.up ? 3 : 5) * dt;
      wireBite(e, dt);
      break;
    }
  }
  e.face = Math.PI / 2 + Math.sin(e.wobble) * 0.25;
  e.x += Math.cos(e.face) * speed * dt * 0.4;
  e.y += Math.sin(e.face) * speed * dt;
  e.x = clamp(e.x, 14, W - 14);
}

// ---- Imperial Japanese Army: banzai chargers, lunge mines, banzai command ----

// run flat-out at a chosen point, dragging through wire like anyone else. Unlike
// advance() this drives the full vector toward the target (both axes), so a
// charger makes a beeline instead of the shuffling zig-zag of a line trooper.
function pursuePoint(e, tx, ty, speed, dt) {
  e.face = Math.atan2(ty - e.y, tx - e.x);
  for (const wr of G.wires) {
    if (wr.hp > 0 && Math.abs(e.x - wr.x) < 40 && Math.abs(e.y - wr.y) < 14) {
      speed *= wr.up2 ? 0.02 : wr.up ? 0.05 : 0.12;
      wr.hp -= (wr.up2 ? 2 : wr.up ? 3 : 5) * dt;
      wireBite(e, dt);
      break;
    }
  }
  e.x = clamp(e.x + Math.cos(e.face) * speed * dt, 14, W - 14);
  e.y += Math.sin(e.face) * speed * dt;   // no top clamp — a charger can breach
}

// occasional battle-cry, throttled per man so a whole wave doesn't shriek at once
function banzaiYell(e, dt) {
  e.yellCd = (e.yellCd == null ? rand(0.5, 3) : e.yellCd) - dt;
  if (e.yellCd <= 0) { e.yellCd = rand(3, 6); SFX.scream(); }
}

// Banzai charger: no gun. Sprint at the nearest defender and cut him down with
// the bayonet at arm's reach, then move on to the next man. With nothing left
// to charge he keeps driving for the bottom edge like any other attacker.
const BANZAI_REACH = 15;
function updateBanzai(e, dt, buffed, command) {
  banzaiYell(e, dt);
  if (command) { if (e.moveTo) advance(e, dt, buffed); return; }
  const target = nearestUnitInRange(e, 4000);
  if (!target) { advance(e, dt, buffed); return; }
  const reach = BANZAI_REACH + (target.t.tank || target.t.vehicle ? 9 : 0);
  if (dist(e, target) > reach) {
    const speed = e.t.speed * (buffed ? 1.2 : 1) * (e.chargeT > 0 ? 1.2 : 1);
    pursuePoint(e, target.x, target.y, speed, dt);
    return;
  }
  e.face = Math.atan2(target.y - e.y, target.x - e.x);
  e.cd -= dt;
  if (e.cd <= 0) {
    e.cd = e.t.rof * rand(0.85, 1.15);
    meleeStrike(e, target);
  }
}

// a bayonet slash lands its blow instantly — no projectile, no dodge roll
function meleeStrike(e, target) {
  e.slashT = 0.24;
  SFX.rifle();
  G.flashes.push({ x: target.x, y: target.y, r: 5, ttl: 0.08, max: 0.08 });
  bloodSplat(target.x, target.y, 5);
  let dmg = e.t.dmg * rand(0.85, 1.15);
  if (target.t.tank) dmg *= 0.04;            // a blade does nothing to armor plate
  else if (target.t.apc || target.t.vehicle) dmg *= 0.3;
  damageUnit(target, dmg, e, 'melee');   // bayonet bypasses body/flak armor
}

// Lunge mine: a suicide anti-tank charge. Hunts armor and emplacements first,
// then any defender, sprints into contact and rams the pole charge home.
function updateLunge(e, dt, buffed, command) {
  if (command) { if (e.moveTo) advance(e, dt, buffed); return; }
  const target = nearestUnitInRange(e, 4000, u => u.t.tank || u.t.vehicle || u.t.apc || u.t.gunEmplacement)
    || nearestUnitInRange(e, 4000);
  if (!target) { advance(e, dt, buffed); return; }
  const reach = (target.t.tank ? 24 : target.t.vehicle || target.t.apc ? 20 : 16);
  if (dist(e, target) > reach) {
    const speed = e.t.speed * (buffed ? 1.15 : 1) * (e.chargeT > 0 ? 1.25 : 1);
    pursuePoint(e, target.x, target.y, speed, dt);
    return;
  }
  detonateLunge(e);
}

function detonateLunge(e) {
  if (e.dead) return;
  e.dead = true;   // vaporized by his own charge: no corpse, no reward
  const lu = e.t.lunge;
  // a synthetic shooter carries the armorMult so explode() treats this as the
  // shaped anti-armor charge it is, not a bag of HE
  const by = { x: e.x, y: e.y, t: { rocket: { armorMult: lu.armorMult } } };
  explode(e.x, e.y, lu.r, lu.dmg, true, by);
}

function isJapaneseInfantry(e) {
  return !e.dead && e.t.faction === 'jp' && !e.t.tank && !e.t.fixed;
}

// Banzai command: on a cooldown the officer hurls every Japanese soldier around
// him into a charge — a burst of forward speed (chargeT) plus the push urge, so
// a whole knot of men surges at the line at once.
const BANZAI_CMD_RADIUS = 150;
function japBanzaiCommand(e, dt) {
  e.banzaiCd = (e.banzaiCd == null ? rand(6, 12) : e.banzaiCd) - dt;
  if (e.banzaiCd > 0) return;
  e.banzaiCd = rand(12, 18);
  let roused = 0;
  const r2 = BANZAI_CMD_RADIUS * BANZAI_CMD_RADIUS;
  for (const o of G.enemies) {
    if (o === e || !isJapaneseInfantry(o) || o.chute > 0) continue;
    if (dist2(e, o) > r2) continue;
    o.chargeT = rand(2.2, 3.6);
    o.pushT = Math.max(o.pushT || 0, o.chargeT);
    roused++;
  }
  if (roused > 0) {
    SFX.scream();
    G.texts.push({ x: e.x, y: e.y - 24, text: 'BANZAI!', ttl: 1.6 });
  }
}

// ---- The Horde: bite & infection, spitters, bloaters, the screamer's frenzy ----

function isZombie(e) {
  return !e.dead && e.t.faction === 'zo' && !e.t.fixed;
}

// plant the infection in a defender: he rots on a countdown and, if a medic
// doesn't burn it out first, dies and rises against you. Bites, bile splash and
// bloater gas all funnel through here. Soldiers only — never metal, and never a
// man who's already turning.
function infectUnit(u) {
  if (!u || u.dead || u.infected > 0) return;
  if (u.t.tank || u.t.vehicle || u.t.apc || u.t.gunEmplacement) return;
  u.infected = rand(INFECT_TURN_MIN, INFECT_TURN_MAX);
  u.infectMax = u.infected;
  u.infectDot = INFECT_DOT_INTERVAL;
  G.texts.push({ x: u.x, y: u.y - 22, text: 'INFECTED!', ttl: 1.4, color: '#8fe06a' });
  for (let i = 0; i < 6; i++) {
    G.particles.push({
      x: u.x + rand(-5, 5), y: u.y + rand(-6, 4), vx: rand(-14, 14), vy: rand(-30, -6),
      ttl: rand(0.3, 0.7), grav: 20, size: rand(1.4, 2.6), color: pick(['#8fe06a', '#6fae44', '#b6e88a']),
    });
  }
}

// per-frame rot on an infected defender: he loses HP in ticks and, when the timer
// runs out, dies and rises. Returns true once he's turned (dead), so updateUnit
// stops working him this frame. Called from update-friendlies.js.
function tickInfection(u, dt) {
  u.infected -= dt;
  u.infectDot -= dt;
  if (u.infectDot <= 0) {
    u.infectDot = INFECT_DOT_INTERVAL;
    damageUnit(u, INFECT_DOT, null, null);   // the rot eats him; death here reanimates via damage.js
    if (u.dead) return true;
  }
  if (u.infected <= 0 && !u.dead) {
    reanimateAsUndead(u);   // fully turned, even with HP to spare
    return true;
  }
  return false;
}

// a man lost to the infection rises on the enemy side. Fast/light troops come
// back as runners, everyone else shambles. Used by the rot timer and by the death
// path in damage.js when an infected defender is killed by any cause.
function reanimateAsUndead(u) {
  const wasSelected = G.selected.indexOf(u);
  if (wasSelected !== -1) G.selected.splice(wasSelected, 1);
  u.dead = true;
  const light = u.t.speed >= 34 || u.maxhp <= 90;
  const z = makeEnemy(light ? 'zrunner' : 'zshambler', u.x, u.y);
  z.reanimated = true;
  G.enemies.push(z);
  bloodSplat(u.x, u.y, 8);
  for (let i = 0; i < 10; i++) {
    G.particles.push({
      x: u.x + rand(-6, 6), y: u.y + rand(-8, 4), vx: rand(-30, 30), vy: rand(-60, -10),
      ttl: rand(0.4, 0.9), grav: 40, size: rand(1.6, 3), color: pick(['#8fe06a', '#6fae44', '#c22030']),
    });
  }
  G.texts.push({ x: u.x, y: u.y - 24, text: 'RISEN!', ttl: 1.8, color: '#9fe06a' });
  SFX.scream();
}

// a groan, throttled per corpse so a whole horde doesn't moan in unison
function zombieGroan(e, dt) {
  e.yellCd = (e.yellCd == null ? rand(1, 6) : e.yellCd) - dt;
  if (e.yellCd <= 0) { e.yellCd = rand(5, 11); if (Math.random() < 0.5) SFX.scream(); }
}

// the bite: no gun, arm's-reach mauling. Bloaters don't bite — reaching a man
// makes them burst instead. Boss/brute strike heavy; anyone the bite doesn't kill
// may be infected.
const ZOMBIE_REACH = 15;
function updateZombie(e, dt, buffed, command) {
  zombieGroan(e, dt);
  if (e.t.frenzyCmd) zombieFrenzyCommand(e, dt);   // the screamer drives the pack
  if (command) { if (e.moveTo) advance(e, dt, buffed); return; }
  const target = nearestUnitInRange(e, 4000);
  if (!target) { advance(e, dt, buffed); return; }
  const reach = ZOMBIE_REACH + (e.t.boss ? 16 : e.t.big ? 8 : 0)
    + (target.t.tank || target.t.vehicle ? 9 : 0);
  if (dist(e, target) > reach) {
    const speed = e.t.speed * (buffed ? 1.2 : 1) * (e.chargeT > 0 ? 1.35 : 1);
    pursuePoint(e, target.x, target.y, speed, dt);
    return;
  }
  // a bloater that reaches the line goes off like the walking mine it is
  if (e.t.bloat) { bloaterBurst(e); return; }
  e.face = Math.atan2(target.y - e.y, target.x - e.x);
  e.cd -= dt;
  if (e.cd <= 0) {
    e.cd = e.t.rof * rand(0.85, 1.15);
    if (e.t.boss) {
      // the Abomination's blow sweeps everyone at arm's length, not just one man
      zombieBite(e, target);
      for (const u of G.units) {
        if (u.dead || u === target || dist2(e, u) > reach * reach) continue;
        zombieBite(e, u);
      }
    } else {
      zombieBite(e, target);
    }
  }
}

// one maul: instant, no projectile. Bypasses body/flak armor like any melee, does
// little to armor plate, and rolls the infection on a survivor.
function zombieBite(e, target) {
  e.slashT = 0.26;
  G.flashes.push({ x: target.x, y: target.y, r: 5, ttl: 0.08, max: 0.08 });
  bloodSplat(target.x, target.y, 6);
  let dmg = e.t.dmg * rand(0.85, 1.15);
  if (target.t.tank) dmg *= 0.04;
  else if (target.t.apc || target.t.vehicle) dmg *= 0.3;
  const soldier = !(target.t.tank || target.t.vehicle || target.t.apc || target.t.gunEmplacement);
  damageUnit(target, dmg, e, 'melee');
  // infect a survivor (a man killed outright reanimates via the death path anyway)
  if (soldier && !target.dead && Math.random() < (e.t.infect || 0)) infectUnit(target);
}

// Spitter: hangs back and lobs corrosive bile. Blind up close — if nothing sits in
// its window it just shambles forward with the rest of the dead.
function updateSpitter(e, dt, buffed, command) {
  zombieGroan(e, dt);
  const sp = e.t.spit;
  if (command) { if (e.moveTo) advance(e, dt, buffed); return; }
  const rng = unitRange(e, sp.range) * fogMult();
  const min2 = sp.min * sp.min;
  const target = nearestUnitInRange(e, rng, u => dist2(e, u) > min2);
  if (target) {
    rollEnemyPushUrge(e, target, dt, command);
    e.face = Math.atan2(target.y - e.y, target.x - e.x);
    e.spitCd = (e.spitCd == null ? rand(sp.cdMin, sp.cdMax) : e.spitCd) - dt;
    if (e.spitCd <= 0) {
      e.spitCd = rand(sp.cdMin, sp.cdMax);
      e.spitT = 0.3;
      fireBile(e, target, sp);
    }
  } else {
    advance(e, dt, buffed);
  }
}

function fireBile(e, target, sp) {
  const tx = target.x + rand(-sp.scatter, sp.scatter);
  const ty = target.y + rand(-sp.scatter, sp.scatter);
  const d = dist(e, { x: tx, y: ty });
  G.biles.push({
    sx: e.x, sy: e.y - 6, x: e.x, y: e.y - 6, tx, ty,
    t: 0, dur: Math.max(sp.flight * (0.6 + d / 260), 0.4),
    r: sp.r, dmg: sp.dmg, infect: sp.infect, by: e,
  });
  G.flashes.push({ x: e.x, y: e.y - 6, r: 4, ttl: 0.08, max: 0.08 });
}

// bile lands: a corrosive splash that burns everyone nearby (bypassing armor, like
// acid) and carries the infection through the spray to survivors.
function bileBurst(x, y, r, dmg, infect, by) {
  addGroundMark({ type: 'blood', x, y, r: r * 0.7, rot1: rand(0, 3), rot2: rand(0, 3) });
  for (let i = 0; i < 16; i++) {
    const ang = rand(0, Math.PI * 2), sp = rand(20, 90);
    G.particles.push({
      x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp * 0.6 - 20,
      ttl: rand(0.3, 0.8), grav: 80, size: rand(1.6, 3.4),
      color: pick(['#8fe06a', '#6fae44', '#4f7a2e', '#b6e88a']),
    });
  }
  const r2 = r * r;
  for (const u of G.units) {
    if (u.dead) continue;
    const d2 = dist2(u, { x, y });
    if (d2 > r2) continue;
    const falloff = 1 - Math.sqrt(d2) / r * 0.6;
    let hd = dmg * falloff * rand(0.8, 1.2);
    if (u.t.tank) hd *= 0.15; else if (u.t.vehicle || u.t.apc) hd *= 0.4;
    damageUnit(u, hd, by || { x, y }, null);   // corrosive: no armor kind, hits HP
    const soldier = !(u.t.tank || u.t.vehicle || u.t.apc || u.t.gunEmplacement);
    if (soldier && !u.dead && Math.random() < infect * falloff) infectUnit(u);
  }
}

// Bloater death: vents a cloud of infectious rot. Fires once whether it's shot
// down or reaches the line and bursts on contact.
function bloaterBurst(e) {
  if (e._burst) return;
  e._burst = true;
  e.dead = true;
  const b = e.t.bloat;
  SFX.boom(false);
  addShake(3);
  bloodSplat(e.x, e.y, 12);
  bileBurst(e.x, e.y, b.r, b.dmg, b.infect, e);
  // a lingering greenish smoke puff over the burst
  for (let i = 0; i < 14; i++) {
    const ttl = rand(0.6, 1.4);
    G.particles.push({
      x: e.x + rand(-b.r * 0.2, b.r * 0.2), y: e.y + rand(-b.r * 0.15, b.r * 0.15),
      vx: rand(-14, 14), vy: rand(-40, -10),
      ttl, maxTtl: ttl, grav: -8, size: rand(3, 6),
      kind: 'smoke', color: pick(['#4f6a34', '#3d5228', '#5f7a3e']),
    });
  }
}

// Frenzy scream: the screamer's answer to the horde having no discipline. On a
// cadence it hurls every nearby zombie into a sprint (chargeT) plus the push urge —
// mirror of the banzai command, but for the walking dead.
const FRENZY_CMD_RADIUS = 160;
function zombieFrenzyCommand(e, dt) {
  e.frenzyCd = (e.frenzyCd == null ? rand(6, 11) : e.frenzyCd) - dt;
  if (e.frenzyCd > 0) return;
  e.frenzyCd = rand(11, 17);
  let roused = 0;
  const r2 = FRENZY_CMD_RADIUS * FRENZY_CMD_RADIUS;
  for (const o of G.enemies) {
    if (o === e || !isZombie(o) || o.chute > 0) continue;
    if (dist2(e, o) > r2) continue;
    o.chargeT = rand(2.4, 3.8);
    o.pushT = Math.max(o.pushT || 0, o.chargeT);
    roused++;
  }
  if (roused > 0) {
    SFX.scream();
    G.texts.push({ x: e.x, y: e.y - 24, text: 'SKREEE!', ttl: 1.6, color: '#c8e08a' });
    // a visible shockwave ring rolling out from the shriek
    G.flashes.push({ x: e.x, y: e.y, r: FRENZY_CMD_RADIUS, ttl: 0.5, max: 0.5, kind: 'ring', color: '#b6e88a' });
  }
}

// ---- Regio Esercito: morale & wavering ----

// A wavering Italian regular breaks when no officer is near to steady him: he
// stops fighting and falls back up-field for a beat (routT). Being hurt makes a
// break far likelier. An officer's aura (buffed) prevents it outright and cuts
// short any rout already underway. Returns true while the man is routing, so the
// caller skips his combat logic this frame.
function updateItalianMorale(e, dt, buffed) {
  if (buffed) { e.routT = 0; return false; }   // an officer nearby steels him
  if (e.routT > 0) {
    e.routT -= dt;
    retreatUpfield(e, dt);
    return true;
  }
  e.moraleCd = (e.moraleCd == null ? rand(2, 4) : e.moraleCd) - dt;
  if (e.moraleCd > 0) return false;
  e.moraleCd = rand(3, 6);
  const hpFrac = e.hp / e.maxhp;
  // healthy men mostly hold; a hurt and leaderless one is very likely to run
  const chance = hpFrac < 0.4 ? 0.55 : hpFrac < 0.7 ? 0.30 : 0.10;
  if (Math.random() < chance) {
    e.routT = rand(1.1, 2.3);
    if (Math.random() < 0.5) G.texts.push({ x: e.x, y: e.y - 22, text: 'RITIRATA!', ttl: 1.2 });
  }
  return false;
}

// falls back toward the top edge, weapon down; clamped so he doesn't flee off
// the map — he rallies at the staging line and comes on again
function retreatUpfield(e, dt) {
  e.wobble += dt * 3;
  e.face = -Math.PI / 2 + Math.sin(e.wobble) * 0.3;   // faced up-field, the wrong way
  const speed = e.t.speed * 1.15;                       // a scared man moves quick
  e.x = clamp(e.x + Math.cos(e.face) * speed * dt * 0.3, 14, W - 14);
  e.y = Math.max(-20, e.y - speed * dt);
}

// an elite (Bersagliere / Folgore) within range steadies the wavering men around
// him even with no officer present — a roving morale anchor. Cheap linear scan,
// only run for a wavering man who has no officer aura already holding him.
const ITALIAN_STEADY_RADIUS = 120;
function italianSteadierNear(e) {
  const r2 = ITALIAN_STEADY_RADIUS * ITALIAN_STEADY_RADIUS;
  for (const o of G.enemies) {
    if (o.dead || o === e || !o.t.steadier || o.chute > 0) continue;
    if (dist2(o, e) < r2) return true;
  }
  return false;
}

// the finicky Breda 30: on a cadence its action seizes for a beat. While jammed
// the gun can't fire (the caller skips runWeapon) but the man may still move.
function weaponJammed(e, dt) {
  if (!e.t.jams) return false;
  if (e.jamT > 0) { e.jamT -= dt; return true; }
  e.jamCd = (e.jamCd == null ? rand(3, 6) : e.jamCd) - dt;
  if (e.jamCd <= 0) {
    e.jamCd = rand(4, 8);
    if (Math.random() < 0.5) {
      e.jamT = rand(1.1, 2.2);
      e.burstLeft = 0;   // drop any burst in progress
      G.texts.push({ x: e.x, y: e.y - 20, text: 'inceppato!', ttl: 1.0 });
      return true;
    }
  }
  return false;
}

// AVANTI SAVOIA! On a cooldown the officer rallies every Italian soldier around
// him: any man mid-rout snaps out of it, and the whole knot gets a forward surge
// (chargeT) plus the push urge — the officer's active counter to his own faction's
// brittle morale. Mirror of the Japanese banzai command.
const AVANTI_CMD_RADIUS = 150;
function italianAvantiCommand(e, dt) {
  e.avantiCd = (e.avantiCd == null ? rand(7, 13) : e.avantiCd) - dt;
  if (e.avantiCd > 0) return;
  e.avantiCd = rand(13, 19);
  let roused = 0;
  const r2 = AVANTI_CMD_RADIUS * AVANTI_CMD_RADIUS;
  for (const o of G.enemies) {
    if (o === e || o.dead || o.t.tank || o.t.fixed || o.chute > 0) continue;
    if (o.t.faction !== 'it') continue;
    if (dist2(e, o) > r2) continue;
    o.routT = 0;                              // rally anyone who was falling back
    o.chargeT = rand(2.2, 3.6);
    o.pushT = Math.max(o.pushT || 0, o.chargeT);
    roused++;
  }
  if (roused > 0) {
    SFX.scream();
    G.texts.push({ x: e.x, y: e.y - 24, text: 'AVANTI!', ttl: 1.6 });
  }
}

function updateTank(e, dt) {
  // grind forward, slower than infantry, ignores wire — and fires on the move.
  // A flame tankette is the exception: its weapon is point-blank, so it HALTS to
  // burn once a defender is inside flame reach instead of driving through the
  // line and out the bottom. It rolls on again the moment nothing's in range.
  if (e.t.tankFlame && flameTankHalts(e)) { updateTankCombat(e, dt); return; }
  const spd = e.t.speed * (e.t.heavy ? 0.85 : 1);
  e.y += spd * dt;
  updateTankCombat(e, dt);
}

// true when a defender sits inside ~90% of the flame tankette's reach — the cue
// to stop and spray rather than keep closing
function flameTankHalts(e) {
  const fl = e.t.tankFlame;
  const r = unitRange(e, fl.range) * fogMult() * 0.9;
  return !!nearestUnitInRange(e, r);
}

// ---- motorcycle & sidecar: races down the field, then the crew dismounts

const BIKE_CREW_POOL = ['erifle', 'erifle', 'esmg', 'esmg', 'egren', 'emg', 'eflame'];

function updateBike(e, dt) {
  // barbed wire ends the ride on the spot
  let hitWire = false;
  for (const wr of G.wires) {
    if (wr.hp > 0 && Math.abs(e.x - wr.x) < 40 && Math.abs(e.y - wr.y) < 16) {
      hitWire = true;
      wr.hp -= 30;
      break;
    }
  }

  // dismount at rifle range of the defenders; if nobody contests the ride,
  // it keeps going deep into the backfield before dropping the crew
  if (hitWire || nearestUnitInRange(e, 230 * fogMult()) || e.y > H - 60) {
    dismountBike(e);
    return;
  }

  e.x = clamp(e.x + Math.sin(e.y * 0.02) * 22 * dt, 20, W - 20);
  e.y += e.t.speed * dt;
}

// Kübelwagen: drives at the line, halts in HMG range and hoses the defenders
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

function driveEnemyVehicle(e, dt, wireDrag, wireDmg, wobble) {
  let speed = e.t.speed;
  for (const wr of G.wires) {
    if (wr.hp > 0 && Math.abs(e.x - wr.x) < 40 && Math.abs(e.y - wr.y) < 16) {
      speed *= wireDrag;
      wr.hp -= wireDmg * dt;
      break;
    }
  }
  if (wobble) e.x = clamp(e.x + Math.sin(e.y * 0.015) * 12 * dt, 20, W - 20);
  e.y += speed * dt;
  e.face = Math.PI / 2;
}

// Sd.Kfz. 251 halftrack: an armored bus for a full squad. At rifle distance
// of any defender it slams the brakes and the squad piles out at once.
// Afterward it fights on as a slow gun truck with its bow MG.

function updateHalftrack(e, dt) {
  if (!e.unloaded) {
    // rifle distance of a defender: halt and unload the whole squad
    if (nearestUnitInRange(e, 230 * fogMult())) {
      e.unloaded = true;
      for (let i = 0; i < 6; i++) {
        const crew = makeEnemy(pick(BIKE_CREW_POOL),
          clamp(e.x + rand(-28, 28), 14, W - 14), e.y + rand(-18, 14));
        crew.cd = rand(0.4, 1.2);   // a beat to shake out into line
        G.enemies.push(crew);
      }
      return;
    }
  } else {
    const command = G.mode === 'hitsquad';
    if (e.pushT > 0) {
      e.pushT -= dt;
      driveEnemyVehicle(e, dt, 0.2, 15, false);
      return;
    }
    const target = nearestUnitInRange(e, unitRange(e, e.t.range) * fogMult());
    if (target) {
      rollEnemyPushUrge(e, target, dt, command);
      runWeapon(e, target, dt, null);
      return;
    }
  }

  // drive on; wire slows it but the tracks chew through fast
  driveEnemyVehicle(e, dt, 0.2, 15, false);
}

function dismountBike(e) {
  e.dead = true;            // the vehicle leaves play; not a kill, no reward
  stampBike(e, false);
  // two-man crew, each a random trooper type
  for (const off of [-13, 13]) {
    const crew = makeEnemy(pick(BIKE_CREW_POOL),
      clamp(e.x + off, 14, W - 14), e.y + rand(-6, 6));
    crew.cd = rand(0.4, 1.0);   // a beat to shoulder their weapons
    G.enemies.push(crew);
  }
}

// parked (dismounted) or wrecked (shot up) bike left on the field.
// mirrors the live drawBike silhouette (bike left, sidecar right, nose +y)
// but drained of colour — dull olive when abandoned, charred when destroyed.
function stampBike(e, wrecked) {
  const g = gctx;
  g.save();
  g.translate(e.x, e.y);
  g.rotate(wrecked ? rand(-0.9, 0.9) : rand(-0.15, 0.15));

  const tire = wrecked ? '#1a1a16' : '#22221c';
  const metal = wrecked ? '#2f2d27' : '#474b44';
  const dark = wrecked ? '#211f1b' : '#33362f';

  // scorch halo blasted into the ground under a wreck
  if (wrecked) {
    g.globalAlpha = 0.5;
    g.fillStyle = '#161410';
    g.beginPath(); g.ellipse(1, 1, 15, 12, 0, 0, 7); g.fill();
  }

  g.globalAlpha = wrecked ? 0.92 : 0.85;

  // a stamped wheel: dark tire oval with a faint rim
  const wheel = (x, y) => {
    g.fillStyle = tire;
    g.beginPath(); g.ellipse(x, y, 2.3, 5.2, 0, 0, 7); g.fill();
    if (!wrecked) {
      g.strokeStyle = 'rgba(120,118,104,0.3)'; g.lineWidth = 0.8;
      g.beginPath(); g.ellipse(x, y, 1, 3.6, 0, 0, 7); g.stroke();
    }
  };

  // sidecar tub (pointed hull) + its wheel
  wheel(8.5, 3.5);
  g.fillStyle = metal;
  g.strokeStyle = dark; g.lineWidth = 1;
  g.beginPath();
  g.moveTo(4, -6); g.lineTo(9.5, -5.5);
  g.quadraticCurveTo(11, -1, 10, 4);
  g.quadraticCurveTo(9, 9, 6.5, 11);
  g.quadraticCurveTo(4.5, 9, 4, 4);
  g.closePath(); g.fill(); g.stroke();

  // bike: two wheels + fuel-tank frame
  wheel(-5, -9);
  // a wrecked bike loses its front wheel, knocked off to the side
  if (wrecked) { g.save(); g.translate(-11, 12); g.rotate(1.1); wheel(0, 0); g.restore(); }
  else wheel(-5, 10);
  g.fillStyle = metal;
  g.strokeStyle = dark; g.lineWidth = 1;
  g.beginPath();
  g.moveTo(-7, -6); g.lineTo(-3, -6);
  g.quadraticCurveTo(-2.3, 0, -3, 6);
  g.lineTo(-7, 6);
  g.quadraticCurveTo(-7.7, 0, -7, -6);
  g.closePath(); g.fill(); g.stroke();
  // boxer cylinder stubs
  g.fillStyle = dark;
  g.beginPath(); g.ellipse(-8.4, 0, 2, 2.6, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(-1.6, 0, 2, 2.6, 0, 0, 7); g.fill();

  // burnt-out detailing: soot smear + a couple of scattered debris flecks
  if (wrecked) {
    g.fillStyle = 'rgba(10,8,6,0.55)';
    g.beginPath(); g.ellipse(-4, -1, 5, 7, 0, 0, 7); g.fill();
    g.fillStyle = '#14120e';
    g.fillRect(2, -9, 2, 2);
    g.fillRect(-9, 8, 1.6, 1.6);
    g.fillRect(11, 6, 1.6, 1.6);
  }

  g.restore();
  g.globalAlpha = 1;
}
