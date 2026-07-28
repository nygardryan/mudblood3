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
  // fireShotgun stamps this on whoever pulled the trigger, but only updateUnit
  // used to wind it back down — an enemy shotgunner (the Bersagliere) kept his
  // muzzle blast drawn forever and never read as idle again
  if (e.shotgunBlastT > 0) e.shotgunBlastT -= dt;

  // still under canopy: drift down, sway in the wind, do nothing else
  if (e.chute > 0) {
    updateEnemyChute(e, dt);
    return;
  }
  if (e.tutHold) return;   // tutorial: frozen in place until the script releases him

  // the boss runs his own state machine, and dispatching above the stun/prone
  // blocks is his immunity to both — he never even reads those timers
  if (e.t.germanBoss) { updateGermanBoss(e, dt); return; }
  // the Yamato likewise runs her own machine, and her parts run NOTHING: they're
  // positioned, aimed and fired entirely from updateYamato. The bare return is
  // load-bearing — parts carry tank:true, so falling through to the dispatch
  // below would hand them to updateTank, which drives them off the hull and then
  // throws in updateTankCombat on an mg spec they don't have.
  if (e.t.ship) { updateYamato(e, dt); return; }
  if (e.t.shipPart) return;
  // The Progenitor is the same shape of thing: its own machine, and its five pus
  // modules run NOTHING here — they're positioned and fired from updateProgenitor.
  // The bare return matters for the same reason as the ship parts', if for a
  // different weapon: a pod carries a `spit` spec, so falling through would hand
  // it to updateSpitter, which walks it off the boss on `advance` the moment
  // nothing is in bile range.
  if (e.t.hordeBoss) { updateProgenitor(e, dt); return; }
  if (e.t.bossPart) return;
  // And the Treno Armato: its own machine, its parts run NOTHING here — they're
  // positioned, aimed and fired entirely from updateWarTrain. The bare return is
  // load-bearing for the same reason as the ship's: the turret wagons and the
  // boxcar carry tank:true, so falling through would hand them to updateTank,
  // which drives them off the rails.
  if (e.t.itaBoss) { updateWarTrain(e, dt); return; }
  if (e.t.trainPart) return;
  // The Alien Walker is NOT one of the four above — it belongs to no faction
  // and killing it ends nothing — but it dispatches up here with them for the
  // same reason they do: sitting above the stun and prone blocks IS its
  // immunity to both. It has no parts, so there's no bare return to pair with.
  if (e.t.awalker) { updateAlienWalker(e, dt); return; }

  // Shell Shocked: dazed by a mortar hit — no shooting, no advancing, and it
  // overrides prone recovery so the daze runs its full second first
  if (e.stun > 0) {
    e.stun -= dt;
    abortPounce(e);   // swatted out of the air: drop where you are
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
      abortPounce(e);
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
  // A guastatore digs until his budget is spent, then falls THROUGH to the
  // standard ranged path below and fights like any rifleman for the rest of his
  // life — which is why 'fight' is a state he leaves the dispatch by, rather
  // than a combat routine duplicated in here.
  if (e.t.builder && e.buildState !== 'fight' && !command) { updateGuastatore(e, dt, buffed); return; }
  // A man heading for a work spends the frame walking; once he's in it he falls
  // THROUGH to the ordinary weapon path and fights from cover — so this is a
  // pre-step, not a dispatch. Placed after the special-behaviour hand-offs so a
  // tank or a charger can never be talked into standing in a trench.
  if (e.t.garrison && !command && updateGarrison(e, dt, buffed)) return;
  // same pre-step shape: he goes after the player's emplacements when there is
  // one worth a charge, and otherwise fights like any assault trooper
  if (e.t.demo && !command && updateArdito(e, dt, buffed)) return;
  // ...and the Portaferiti, who holds the frame whenever there's a casualty at
  // all — walking to it, or knelt over it. He is deliberately BELOW the garrison
  // pre-step, not above it: he carries no `garrison` flag at all, so the wounded
  // — who are wherever they fell — always win over cover.
  if (e.t.medic && !command && updateItalianMedic(e, dt, buffed)) return;
  // The Horde: the Spitter is a ranged biler; every other melee zombie claws and
  // bites (the Revenant has no `zombie` flag and falls through to the gun path).
  if (e.t.spit) { updateSpitter(e, dt, buffed, command); return; }
  if (e.t.zombie) { updateZombie(e, dt, buffed, command); return; }

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
            speed *= wr.up ? 0.0525 : 0.126;
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
    const ft = primaryUnitTarget(e, unitRange(e, e.t.flame.range) * fogMult());
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
    const st = primaryUnitTarget(e, unitRange(e, sg.range) * fogMult());
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

  const target = primaryUnitTarget(e, range);
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
        t: 0, dur: 1.0, sx: e.x, sy: e.y, by: e,
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
      const tx = mortarTarget.x + rand(-mt.scatter, mt.scatter);
      const ty = mortarTarget.y + rand(-mt.scatter, mt.scatter);
      // a few rounds in the rack are smoke, not HE: the shell carries no
      // charge and cracks into a burning pot on landing (update.js), blinding
      // whichever line the wind favors — the crew doesn't get to choose.
      if (Math.random() < MORTAR_SMOKE_CHANCE) {
        const s = scheduleShell(tx, ty, mt.flight, 0, 0, false, e, 'smoke');
        s.burn = rand(MORTAR_SMOKE_BURN_MIN, MORTAR_SMOKE_BURN_MAX);
      } else {
        scheduleShell(tx, ty, mt.flight, mt.r, mt.dmg, false, e);
      }
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
    runWeapon(e, target, dt, buffed ? { rofMult: 0.8 } : null);
    // fast assault troops keep pushing under fire — always closing the distance
    if (!command && e.t.speed >= 30 && !e.garrisoned && dist2(e, target) > range * range * 0.25) {
      advance(e, dt, buffed);
    }
  } else if (engageTarget) {
    // rocket/mortar range but outside the sidearm — hold and engage, push only on urge
    rollEnemyPushUrge(e, engageTarget, dt, command);
  } else if (!command && e.t.speed > 0 && !e.garrisoned) {
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
  // a man in a work never gets the urge to leave it — same idiom as a fixed
  // emplacement. Only the AVANTI order turns him out (see avantiCharge).
  if (command || !target || e.t.speed === 0 || e.garrisoned) return;
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
      speed *= wr.up2 ? 0.021 : wr.up ? 0.0525 : 0.126;
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
      speed *= wr.up2 ? 0.021 : wr.up ? 0.0525 : 0.126;
      wr.hp -= (wr.up2 ? 2 : wr.up ? 3 : 5) * dt;
      wireBite(e, dt);
      break;
    }
  }
  e.x = clamp(e.x + Math.cos(e.face) * speed * dt, 14, W - 14);
  e.y += Math.sin(e.face) * speed * dt;   // no top clamp — a charger can breach
}

// Would a leap from (x0,y0) to (x1,y1) cross a live wire band? The hound's pounce
// is the only movement in the game that could skip the drag clause above, and the
// drag is the ONLY thing barbed wire does to a melee zombie — so wire has to stop
// the leap outright or the Razor Wire card quietly stops mattering against the
// fastest thing the Horde fields. Sampled along the segment with the SAME band
// predicate the drag uses, rather than a proper slab test: a leap is ~110px at
// most, so this is a dozen cheap tests against a handful of wires, and the two
// checks agreeing exactly about where a band is matters more here than elegance.
function wireOnLeap(x0, y0, x1, y1) {
  const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8));
  for (const wr of G.wires) {
    if (wr.hp <= 0) continue;
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const sx = x0 + (x1 - x0) * f, sy = y0 + (y1 - y0) * f;
      if (Math.abs(sx - wr.x) < 40 && Math.abs(sy - wr.y) < 14) return true;
    }
  }
  return false;
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
  const target = primaryUnitTarget(e, 4000);
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

// ---- Regio Esercito: the dig ----------------------------------------------

// Per-faction bookkeeping, on its own slow tick. Runs from update() beside the
// officer-aura cache and for the same reason: this is whole-array work that
// nothing needs at frame resolution.
//
// G.itFrontY is the deepest live work, and it is the ONLY thing siting new ones
// reads — which is what makes the line creep forward instead of sprawling. It
// resets to IT_FRONT_Y_START when no works are left, so levelling the enemy line
// genuinely pushes them back to the top of the field rather than letting them
// resume at the depth they'd already won.
function updateItalians(dt) {
  if (enemyFaction() !== 'it' && !G.itWorks.length) return;
  // the charge runs EVERY frame, not on the tick — a 1.6s telegraph and a 7s
  // surge both need finer resolution than half-second bookkeeping
  updateAvanti(dt);
  G.itTick -= dt;
  if (G.itTick > 0) return;
  G.itTick = IT_TICK;
  let front = IT_FRONT_Y_START;
  for (const w of G.itWorks) {
    w.occ = 0;
    if (w.hp > 0 && w.y > front) front = w.y;
  }
  G.itFrontY = front;
  // Occupancy is RECOUNTED here rather than tracked by hand, and the works hold a
  // count rather than a list of men. compactInPlace splices dead actors out the
  // frame they fall, so a stored crew array would leak dead refs immediately —
  // this way a man's death releases his slot for free, within one tick.
  for (const e of G.enemies) {
    if (e.dead || !e.garrison) continue;
    if (e.garrison.hp <= 0) { releaseGarrison(e); continue; }
    e.garrison.occ++;
    e.garrison.mannedThisWave = true;   // read by decayItalianWorks: a work someone
  }                                     // held all wave is never abandoned
}

// Every work loses a little each wave, and one that nobody manned and that is
// already broken is abandoned outright. This is what keeps "the front creeps"
// literally true: without it the field just fills, because works only ever get
// added. With it the rear line rots while the manned front line holds, and the
// steady state over a long run is a moving BAND rather than a growing pile.
function decayItalianWorks() {
  for (const w of G.itWorks) {
    w.hp -= w.maxhp * IT_WAVE_DECAY;
    if (!w.mannedThisWave && w.hp < w.maxhp * IT_ABANDON_HP) w.hp = 0;
    w.mannedThisWave = false;
  }
}

// Somewhere to put the next work: a little further down the field than the
// deepest one already standing, near the man who'll dig it, clear of everything.
// Deliberately NOT placementValid/emplacementBox — those are written for the
// player's mouse and carry TP checks, the deploy line and an engineer-reach
// rule, none of which mean anything to an AI walking around in no-man's-land.
// The KIND is chosen here rather than at stake time so the clearance test below
// can use the box the work will actually occupy. They used to disagree: a site
// was cleared as a 40px disc and then staked as a 44x24 parapet.
function pickBuildSite(e) {
  for (let i = 0; i < 5; i++) {
    const y = clamp(G.itFrontY + rand(IT_CREEP_MIN, IT_CREEP_MAX), IT_WORK_MIN_Y, IT_WORK_MAX_Y);
    const x = clamp(e.x + rand(-40, 40), 40, W - 40);
    const kind = pick(e.t.builder.kinds);
    if (buildSiteClear(x, y, kind)) return { x, y, kind };
  }
  return null;
}

function buildSiteClear(x, y, kind) {
  const pt = { x, y };
  const s2 = IT_WORK_SPACING * IT_WORK_SPACING;
  for (const w of G.itWorks) if (dist2(w, pt) < s2) return false;
  // and keep off the player's own emplacements. forEachEmplacement walks the
  // Italian works too, but those were just checked at the tighter spacing.
  //
  // BOX vs BOX, not a flat radius, and that only started to matter once the depth
  // wall moved to DEPLOY_Y - IT_WORK_DEPLOY_MARGIN. The old rule rejected any site
  // within IT_SITE_CLEAR of an emplacement's CENTRE, which was fine while the
  // creep stopped at 182 — above FORWARD_Y the player has nothing to keep off of.
  // The creep now runs down through the mine and wire belt, where a flat radius is
  // wrong in both directions: it lets a work be staked half-inside a bunker
  // (hw 28 > 40 - 22), and it lets a single 6px MINE deny an 80px-wide band of
  // ground. A minefield would have walled the front off permanently — an invisible
  // construction barrier nobody designed, on top of mines already killing the
  // sappers who walk into them, which is the counterplay that was meant to be there.
  const nb = IT_WORK_KINDS[kind].box;
  let clear = true;
  forEachEmplacement((obj, key) => {
    if (!clear || obj.side === 'it') return;
    const ob = emplacementBox(key);
    if (Math.abs(obj.x - x) < nb.hw + ob.hw + IT_SITE_CLEAR &&
        Math.abs(obj.y - y) < nb.hh + ob.hh + IT_SITE_CLEAR) clear = false;
  });
  return clear;
}

// the nearest work that still wants work done on it — damaged first, then
// un-fortified. What a sapper does when there's nowhere new to dig.
function neediestWork(e) {
  let best = null, bestScore = Infinity;
  const r2 = IT_TEND_RANGE * IT_TEND_RANGE;
  for (const w of G.itWorks) {
    if (w.hp <= 0) continue;
    const d2 = dist2(e, w);
    if (d2 > r2) continue;
    const needsRepair = w.hp < w.maxhp;
    const needsTier = !w.up2;
    if (!needsRepair && !needsTier) continue;
    // repairing beats fortifying, so a damaged work outranks an intact one at
    // any distance inside the walk radius
    const score = d2 + (needsRepair ? 0 : 1e6);
    if (score < bestScore) { bestScore = score; best = w; }
  }
  return best;
}

function buildSparks(w) {
  if (Math.random() < 0.35) SFX.hammer();
  for (let i = 0; i < 3; i++) {
    G.particles.push({
      x: w.x + rand(-10, 10), y: w.y + rand(-6, 6), vx: rand(-22, 22), vy: rand(-40, -8),
      ttl: rand(0.15, 0.35), grav: 240, size: 1.3,
      color: pick(['#c8b872', '#a89878', '#8a7a60']),
    });
  }
}

// Guastatore: stake out a work, raise it, move on. When his budget is spent — or
// there's nowhere left to dig — he picks up his rifle for good.
const GUAST_REACH = 7;   // how close he stands to work on something
function updateGuastatore(e, dt, buffed) {
  if (!e.buildState) { e.buildState = 'seek'; e.buildsDone = 0; }

  if (e.buildState === 'seek') {
    if (e.buildsDone >= e.t.builder.per) { e.buildState = 'fight'; return; }
    // a fresh site if the field has room, otherwise improve what's already up —
    // so the line stops spreading and starts HARDENING once it hits the cap
    if (G.itWorks.length < IT_WORK_CAP) {
      e.siteCd = (e.siteCd == null ? 0 : e.siteCd) - dt;
      if (e.siteCd > 0) { advance(e, dt, buffed); return; }
      e.siteCd = rand(1, 2);
      const site = pickBuildSite(e);
      if (site) { e.buildSite = site; e.work = null; e.buildState = 'build'; return; }
    }
    const tend = neediestWork(e);
    if (tend) { e.work = tend; e.buildSite = null; e.buildState = 'build'; return; }
    e.buildState = 'fight';
    return;
  }

  // walk to the spot, then work on it
  const at = e.work || e.buildSite;
  if (!at || (e.work && e.work.hp <= 0)) { e.work = null; e.buildSite = null; e.buildState = 'seek'; return; }
  if (dist(e, at) > GUAST_REACH) {
    pursuePoint(e, at.x, at.y, e.t.speed * (buffed ? 1.15 : 1), dt);
    return;
  }
  // arrived at a fresh site: stake the work out at a fraction of its strength,
  // visible and shellable from the moment it appears
  if (!e.work) {
    // re-check clearance at the moment of staking, not just when the site was
    // chosen: two sappers can pick overlapping ground while both are still
    // walking to it, and only the first one there gets to keep it
    if (G.itWorks.length >= IT_WORK_CAP ||
        !buildSiteClear(e.buildSite.x, e.buildSite.y, e.buildSite.kind)) {
      e.buildSite = null;
      e.buildState = 'seek';
      return;
    }
    const w = makeItalianWork(e.buildSite.kind, e.buildSite.x, e.buildSite.y, IT_WORK_START_FRAC);
    G.itWorks.push(w);
    e.work = w;
    e.freshWork = true;
    e.buildSite = null;
    G.texts.push({ x: w.x, y: w.y - 16, text: 'SCAVANDO!', ttl: 1.4 });
  }
  e.face = Math.PI / 2;
  e.healTick = (e.healTick || 0) - dt;
  if (e.healTick > 0) return;
  e.healTick = 0.4;

  const w = e.work;
  if (w.hp < w.maxhp) {                       // raise it / patch it
    w.hp = Math.min(w.maxhp, w.hp + IT_BUILD_RATE);
    buildSparks(w);
    return;
  }
  // A work he raised himself is finished the moment it stands at full strength.
  // The fortification tiers are deliberately NOT part of building a new one:
  // otherwise every work on the field ends up at 1.5x HP and the whole line
  // inflates. Hardening is what he does with nowhere left to dig — see 'seek'.
  if (e.freshWork) {
    e.freshWork = false;
    e.work = null;
    e.buildsDone++;
    e.buildState = 'seek';
    return;
  }
  if (!w.up2) {                               // then push it up a fortification tier
    w.workProg += IT_FORTIFY_RATE;
    buildSparks(w);
    if (w.workProg >= 6) {
      w.workProg = 0;
      w.maxhp = Math.round(w.maxhp * 1.5);
      w.hp = w.maxhp;
      if (!w.up) { w.up = true; G.texts.push({ x: w.x, y: w.y - 16, text: 'RINFORZATO', ttl: 2.0 }); }
      else { w.up2 = true; G.texts.push({ x: w.x, y: w.y - 16, text: 'BLINDATO', ttl: 2.0 }); }
      e.work = null;
      e.buildsDone++;
      e.buildState = 'seek';
    }
    return;
  }
  e.work = null;
  e.buildsDone++;
  e.buildState = 'seek';
}

// ---- Regio Esercito: the Arditi demolition man ------------------------------

// the nearest thing of the player's worth blowing up. Mines are skipped — a
// satchel charge on a mine is a waste of a man — and so are the Italians' own
// works, which forEachEmplacement now walks alongside the player's.
function nearestPlayerEmplacement(e, maxD) {
  let best = null, bestD2 = maxD * maxD;
  forEachEmplacement((obj, key) => {
    if (key === 'mine' || obj.side === 'it' || !(obj.hp > 0)) return;
    const d2 = dist2(e, obj);
    if (d2 < bestD2) { bestD2 = d2; best = obj; }
  });
  return best;
}

// Returns TRUE if he spent the frame on demolition work. Like the garrison
// pre-step, falling through means "nothing to blow up right now" and he fights
// as an ordinary assault trooper.
function updateArdito(e, dt, buffed) {
  const d = e.t.demo;
  if (e.demoCd > 0) e.demoCd -= dt;
  // backing away from a charge he just set — the fuse is short and the blast
  // would take him with it otherwise
  if (e.demoBackT > 0) {
    e.demoBackT -= dt;
    const ang = Math.atan2(e.y - e.demoAwayY, e.x - e.demoAwayX);
    e.x = clamp(e.x + Math.cos(ang) * e.t.speed * dt, 14, W - 14);
    e.y += Math.sin(ang) * e.t.speed * dt;
    e.face = ang;
    return true;
  }
  if (e.demoCd > 0) return false;
  const target = nearestPlayerEmplacement(e, d.hunt);
  if (!target) return false;
  if (dist(e, target) > d.reach) {
    pursuePoint(e, target.x, target.y, e.t.speed * (buffed ? 1.15 : 1), dt);
    return true;
  }
  // plant it. A scheduled shell rather than an immediate explode(): it gives the
  // player a visible marker and time to walk men clear, and it lets the Arditi
  // live — explode() is side-blind, so an instant charge would kill him too.
  scheduleShell(target.x, target.y, d.fuse, d.r, d.dmg, true, e);
  G.texts.push({ x: e.x, y: e.y - 20, text: 'GUASTATORI!', ttl: 1.4 });
  SFX.hammer();
  e.demoCd = rand(d.cdMin, d.cdMax);
  e.demoAwayX = target.x;
  e.demoAwayY = target.y;
  e.demoBackT = d.fuse;
  return true;
}

// ---- Regio Esercito: the Portaferiti ----------------------------------------

// Returns TRUE while he is working — walking to a casualty, or knelt over one.
// FALSE with nothing to treat, and then he falls through and fights with his
// pistol like anyone else.
//
// The kneeling half has to be in here rather than falling through: a man who is
// merely in heal range and then handed to the ordinary path spends the frame
// ADVANCING on the player, walks out of his own heal range, comes back, and
// treats a patient at about half rate (measured 3 HP/s of a nominal 6, on a
// casualty that was itself walking). Holding station is also the readable thing
// — he stops in the open beside the man, which is the player's shot.
//
// isItalianFoot is doing real work in the scan: it already rejects armour and
// everything `fixed`, so a medic can never top up the Treno Armato's engine or
// one of its wagons, and no clause here has to remember they exist.
function updateItalianMedic(e, dt, buffed) {
  const m = e.t.medic;
  // one pass answers both questions: the worst-hit man he can already reach, and
  // the nearest one he can't. A man inside heal range is being treated, so he is
  // deliberately not a candidate to walk toward.
  let worst = null, worstFrac = 1;
  let near = null, nearD2 = m.seek * m.seek;
  const healR2 = m.range * m.range;
  for (const o of G.enemies) {
    if (o === e || !isItalianFoot(o) || o.hp >= o.maxhp) continue;
    const d2 = dist2(e, o);
    if (d2 < healR2) {
      const f = o.hp / o.maxhp;
      if (f < worstFrac) { worstFrac = f; worst = o; }
    } else if (d2 < nearD2) {
      nearD2 = d2; near = o;
    }
  }

  // ONE man per pulse, like the player's medic — the sustain is per-medic, so it
  // never scales with the size of the knot of men he's standing in.
  if (e.healTick > 0) e.healTick -= dt;
  else if (worst) {
    e.healTick = m.tick;
    worst.hp = Math.min(worst.maxhp, worst.hp + m.heal);
    G.particles.push({ x: worst.x + rand(-6, 6), y: worst.y - 10, vx: 0, vy: -18,
                       ttl: 0.5, grav: 0, size: 1.6, color: '#8fe08f' });
    // only when a man goes back to full — the shout is the player's cue that
    // something out there is undoing his fire, and which man to shoot for it
    if (worst.hp >= worst.maxhp) {
      G.texts.push({ x: e.x, y: e.y - 20, text: 'MEDICATO!', ttl: 1.3 });
    }
  }

  const patient = worst || near;
  if (!patient) return false;         // nothing to treat: he fights like anyone
  // He STAYS ON his man rather than stopping the moment the man is technically
  // in range. Everyone in this army is walking down the field at 24-34 px/s, so
  // a medic who halts at the edge of his own reach spends the fight being walked
  // out of it — measured 2.5 HP/s of a nominal 6 against a patient who was doing
  // nothing but advancing. Station is well inside the range so the treatment
  // survives both men drifting.
  if (dist2(e, patient) > IT_MEDIC_STATION * IT_MEDIC_STATION) {
    pursuePoint(e, patient.x, patient.y, e.t.speed * (buffed ? 1.15 : 1), dt);
  } else {
    e.face = Math.atan2(patient.y - e.y, patient.x - e.x);   // knelt over him
  }
  return true;                        // either way: no advance, no shooting
}

// ---- Regio Esercito: AVANTI SAVOIA -----------------------------------------

// Everyone the order applies to: foot troops of the faction, wherever they are.
// Armour drives its own fight, and `fixed` things can't charge by definition.
function isItalianFoot(e) {
  return !e.dead && e.t.faction === 'it' && !e.t.tank && !e.t.fixed && !(e.chute > 0);
}

// one pass for both numbers the trigger needs
function italianForce() {
  let force = 0, officers = 0;
  for (const e of G.enemies) {
    if (!isItalianFoot(e)) continue;
    force++;
    if (e.t.avantiUrge) officers++;
  }
  return { force, officers };
}

function updateAvanti(dt) {
  if (G.itCharge > 0) {                       // surge running
    G.itCharge -= dt;
    if (G.itCharge <= 0) {
      G.itCharge = 0;
      G.itAvantiCd = rand(IT_AVANTI_CD_MIN, IT_AVANTI_CD_MAX);
    }
    return;
  }
  if (G.itCharge < 0) {                       // telegraphed, winding up
    G.itCharge += dt;
    if (G.itCharge >= 0) { G.itCharge = IT_AVANTI_DUR; avantiCharge(); }
    return;
  }
  if (G.wave < IT_AVANTI_MIN_WAVE) return;
  if (G.time - G.itLastAvanti < IT_AVANTI_MIN_GAP) return;
  const { force, officers } = italianForce();
  if (force < IT_AVANTI_MIN_FORCE) return;
  // Everything that hurries the order does it by running ONE clock faster, never
  // by firing outright. An early version let pressure trigger directly, and
  // because the front sits at the depth wall permanently once it gets there, that
  // condition is always true — so every charge fired the instant IT_AVANTI_MIN_GAP
  // expired and the safety floor silently became the cadence (measured: 30.0s,
  // 30.0s, 30.0s). A rate keeps the tuning in the tuning constants.
  //
  // The officer's whole job in this faction is this multiplier: he doesn't rally
  // anybody, he brings the charge sooner, so killing officers buys digging time.
  let rate = 1 + IT_AVANTI_OFFICER_URGE * Math.min(officers, 2);
  // ...and a big force that has dug as far forward as it is allowed to has
  // nothing left to do but come out.
  if (G.itFrontY >= IT_WORK_MAX_Y - 6 && force >= IT_AVANTI_PRESSURE_FORCE) {
    rate += IT_AVANTI_PRESSURE_URGE;
  }
  G.itAvantiCd -= dt * rate;
  if (G.itAvantiCd <= 0) startAvanti();
}

function startAvanti() {
  G.itCharge = -IT_AVANTI_TELEGRAPH;
  G.itLastAvanti = G.time;
  showBanner('AVANTI SAVOIA! — THEY COME OUT OF THE WORKS');
  SFX.event();
  // ragged, staggered shouts rather than one synchronised flash
  for (const e of G.enemies) {
    if (!isItalianFoot(e) || Math.random() > 0.45) continue;
    G.texts.push({ x: e.x, y: e.y - 22, text: 'AVANTI!', ttl: 1.3 + Math.random() * 0.6 });
  }
}

// The order lands: every man drops what he's doing and goes. Emptying the works
// is the point — the image of the faction is the line pouring out of cover at
// once — and garCd is what stops a man ducking straight back into the parapet he
// just left while the surge is still running.
function avantiCharge() {
  SFX.scream();
  for (const e of G.enemies) {
    if (!isItalianFoot(e)) continue;
    if (e.garrison) e.garrison.occ = Math.max(0, e.garrison.occ - 1);
    e.garrison = null;
    e.garrisoned = false;
    e.garSlot = 0;
    e.garCd = IT_AVANTI_DUR + rand(1, 3);
    e.chargeT = IT_AVANTI_DUR;                        // x1.4 speed in advance()
    e.pushT = Math.max(e.pushT || 0, IT_AVANTI_DUR);  // and forced forward, ignoring targets
    if (e.t.builder) e.buildState = 'fight';          // sappers drop their tools for good
  }
}

// ---- Regio Esercito: manning the works -------------------------------------

// Where a man stands to man a work: on the NORTH face, so the work itself ends
// up between him and the player's line. Slots fan out sideways so a bunker's
// three men don't stack in one spot.
function garrisonPoint(w, slot) {
  const spread = (slot - (w.cap - 1) / 2) * GARRISON_SLOT_W;
  return { x: clamp(w.x + spread, 14, W - 14), y: w.y - GARRISON_STANDOFF };
}

function releaseGarrison(e) {
  e.garrison = null;
  e.garrisoned = false;
  e.garSlot = 0;
  e.garCd = rand(1.5, 3);
}

// Pick a work to move into. The `w.y < e.y - GARRISON_BACKSTEP` rejection is
// load-bearing: without it men drift back up-field into the works behind them and
// the whole force stops advancing. He'll duck back a little into cover, not retreat.
function claimWork(e) {
  let best = null, bestScore = Infinity;
  const prefer = e.t.garrisonPrefer;
  for (const w of G.itWorks) {
    if (w.hp <= 0 || w.occ >= w.cap) continue;
    if (w.y < e.y - GARRISON_BACKSTEP) continue;
    // scores are squared distances, so the 0.6 preference weight is 0.36 here
    const score = dist2(e, w) * (prefer && w.kind === prefer ? 0.36 : 1);
    if (score < bestScore) { bestScore = score; best = w; }
  }
  return best;
}

// Returns TRUE if the man spent his frame getting to his work (so the caller
// skips combat), FALSE if he's either stationed — in which case he falls through
// and fights from cover like anyone else — or has nowhere to go.
function updateGarrison(e, dt, buffed) {
  if (e.garrison && e.garrison.hp <= 0) releaseGarrison(e);
  if (!e.garrison) {
    e.garrisoned = false;
    if (!G.itWorks.length) return false;
    e.garCd = (e.garCd == null ? 0 : e.garCd) - dt;
    if (e.garCd > 0) return false;
    e.garCd = rand(1.5, 3);
    const w = claimWork(e);
    if (!w) return false;
    e.garrison = w;
    e.garSlot = w.occ;
    w.occ++;            // optimistic; the works tick recounts it from scratch
  }
  const gp = garrisonPoint(e.garrison, e.garSlot);
  if (dist2(e, gp) > GARRISON_REACH * GARRISON_REACH) {
    e.garrisoned = false;
    pursuePoint(e, gp.x, gp.y, e.t.speed * (buffed ? 1.15 : 1), dt);
    return true;
  }
  e.x = gp.x;
  e.y = gp.y;
  e.garrisoned = true;
  return false;
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

// ---- Der Schlächter: the German final boss's advance/retreat/rally cycle ----
// Tuning lives in the BOSS_ block in constants.js. The cycle: walk down a lane
// firing six revolver shots, jog back to the backline, refit armor + call in
// two reinforcement plays, then advance again down a DIFFERENT lane so each
// pass hits another stretch of the player's defenses.

// lazy init on the first update tick, so both the wave-100 spawn hook and a
// bare TEST.deploy('eboss', ...) produce a fully working boss
function initGermanBoss(e) {
  e.bossInit = true;
  e.bossState = 'advance';
  e.shots = BOSS_REVOLVER_SHOTS;
  // open in the lane nearest wherever he walked on
  e.lane = 0;
  for (let i = 1; i < BOSS_LANES.length; i++) {
    if (Math.abs(BOSS_LANES[i] * W - e.x) < Math.abs(BOSS_LANES[e.lane] * W - e.x)) e.lane = i;
  }
  e.laneX = BOSS_LANES[e.lane] * W;
  e.loiterT = 0;
  e.bodyArmor = e.maxBodyArmor = BOSS_BODY_ARMOR * escArmorMult();
  e.flakArmor = e.maxFlakArmor = BOSS_FLAK_ARMOR * escArmorMult();
}

// next advance corridor: any lane at least 2 indices away (every lane has >= 2
// such candidates), so consecutive passes always hit a different part of the line
function nextBossLane(e) {
  const cands = [];
  for (let i = 0; i < BOSS_LANES.length; i++) if (Math.abs(i - e.lane) >= 2) cands.push(i);
  e.lane = pick(cands);
  e.laneX = BOSS_LANES[e.lane] * W;
}

function updateGermanBoss(e, dt) {
  if (!e.bossInit) initGermanBoss(e);
  const t = e.t;
  e.cd -= dt;

  if (e.bossState === 'advance') {
    const range = unitRange(e, t.range) * fogMult();
    const target = primaryUnitTarget(e, range);
    if (target) {
      e.loiterT = 0;
      e.face = Math.atan2(target.y - e.y, target.x - e.x);
      // an executioner works close: keep walking in while firing. His aim no
      // longer needs it (the revolver ignores the range falloff — see fireShot),
      // but closing is what puts him past the line's cover and prone dodges,
      // and it's the only reason he ever comes within reach of a bazooka.
      if (dist2(e, target) > range * range * 0.3 && e.y < BOSS_SAFE_Y) {
        pursuePoint(e, target.x, target.y, t.speed, dt);
        e.y = Math.min(e.y, BOSS_SAFE_Y);
        e.face = Math.atan2(target.y - e.y, target.x - e.x);
      }
      if (e.cd <= 0 && e.shots > 0) {
        fireShot(e, target, null);
        e.shots--;
        e.cd = t.rof * rand(0.9, 1.1);
        if (e.shots <= 0) { e.bossState = 'retreat'; nextBossLane(e); }
      }
    } else if (e.y < BOSS_ENGAGE_Y) {
      pursuePoint(e, e.laneX, BOSS_ENGAGE_Y, t.speed, dt);
      // pursuePoint has no bottom clamp (chargers breach) — the boss never does
      e.y = Math.min(e.y, BOSS_SAFE_Y);
    } else {
      // at the engage line with rounds left and nothing visible (smoke, a dead
      // lane): give it a beat, then fall back anyway — he can't soft-lock
      e.loiterT += dt;
      if (e.loiterT >= BOSS_LOITER_TIME) {
        e.loiterT = 0;
        e.bossState = 'retreat';
        nextBossLane(e);
      }
    }
    return;
  }

  if (e.bossState === 'retreat') {
    // back turned, holding fire, headed for the NEXT lane's backline slot —
    // this walk is the punish window
    pursuePoint(e, e.laneX, BOSS_BACKLINE_Y, t.speed * BOSS_RETREAT_SPEED_MULT, dt);
    if (dist(e, { x: e.laneX, y: BOSS_BACKLINE_Y }) < 8) {
      e.bossState = 'rally';
      e.rallyT = BOSS_RALLY_TIME;
      e.face = Math.PI / 2;
      bossRefit(e);
      bossCallReinforcements();
    }
    return;
  }

  // rally: stand at the backline while the call goes out
  e.rallyT -= dt;
  if (e.rallyT <= 0) e.bossState = 'advance';
}

function bossRefit(e) {
  e.shots = BOSS_REVOLVER_SHOTS;
  e.bodyArmor = e.maxBodyArmor = BOSS_BODY_ARMOR * escArmorMult();
  e.flakArmor = e.maxFlakArmor = BOSS_FLAK_ARMOR * escArmorMult();
  G.texts.push({ x: e.x, y: e.y - 26, text: 'REFIT', ttl: 1.4 });
}

// two DISTINCT plays per rally, drawn from five: the two beneficial random
// events (smokescreen, bombing raid), a paradrop, a vehicle column, a human
// wave. runEvent ignores wave gating and brings its own banner/SFX; the two
// bespoke spawns are cut-down takes on the panzerkeil/sturm special waves.
const BOSS_CALLS = ['smokescreen', 'airraid', 'paradrop', 'vehicles', 'humanwave'];
function bossCallReinforcements() {
  const bag = BOSS_CALLS.slice();
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  for (const call of bag.slice(0, 2)) bossReinforce(call);
}

function bossReinforce(call) {
  const w = G.wave;
  if (call === 'smokescreen') { runEvent('smokescreen', w); return; }
  if (call === 'airraid') { runEvent('airraid', w); return; }
  if (call === 'paradrop') { triggerParadrop(); return; }
  const tier = Math.max(1, w / 10), m = specialWaveMult(tier);
  if (call === 'vehicles') {
    showBanner('DER SCHLÄCHTER CALLS THE PANZER RESERVE!');
    SFX.event();
    const cx = rand(180, W - 180);
    const panzers = Math.max(1, Math.floor(m * tier / 4));
    for (let i = 0; i < panzers; i++) spawnEnemyAt('panzer', cx + rand(-120, 120), -40 - i * 150);
    const tracks = Math.max(1, Math.floor(m * tier / 5));
    for (let i = 0; i < tracks; i++) spawnEnemyAt('ehalftrack', cx + rand(-160, 160), -110 - i * 130);
    spawnEnemyAt('ejeep', cx + rand(-200, 200), -70);
    return;
  }
  // humanwave — a field-wide line of shock infantry behind an officer
  showBanner('DER SCHLÄCHTER ORDERS THE STURMANGRIFF!');
  SFX.event();
  const count = Math.floor(m * (6 + tier));
  for (let i = 0; i < count; i++) {
    const x = (W / (count + 1)) * (i + 1) + rand(-25, 25);
    const roll = Math.random();
    spawnEnemyAt(roll < 0.5 ? 'esmg' : roll < 0.65 ? 'eflame' : 'erifle', x, rand(-90, -20));
  }
  spawnEnemyAt('eoff', rand(120, W - 120), rand(-130, -90));
}

// ---- The Yamato: an Imperial land battleship -------------------------------
// Tuning lives in the YAM_ block in constants.js. She is a PARENT hull actor
// plus eleven child part actors, all real entries in G.enemies: five armor-belt
// sections (pure hitboxes, redirecting into the hull's pool), two triple main
// batteries and four gun tubs (each with its own HP, each hunting its own
// target). Part world positions are recomputed from the hull every tick, so the
// art and the hitboxes can never drift apart.
//
// The parts are driven ONLY from updateYamato — updateEnemy gives them a bare
// return. That isn't tidiness: they carry tank:true, so reaching the normal
// dispatch would hand them to updateTank, which drives them off the hull and
// then throws in updateTankCombat on a t.mg they don't have.

// lazy init on the first update tick, so both the wave-100 hook and a bare
// TEST.deploy('jyamato', ...) produce a whole working ship
function initYamato(e) {
  e.yamInit = true;
  e.phase = 0;                  // health segments broken so far (0..YAM_SEGMENTS-1)
  // A hull spawned outside the patrol margin is ROLLING IN, and which side it was
  // spawned on is the whole of the entry state — so the wave hook and a bare
  // TEST.deploy('jyamato', 0.05, 0.32) run one identical code path, the way the
  // Progenitor's and the train's lazy init already do. Heading is the entry
  // direction while she comes on, so she arrives flat and broadside-on with
  // nothing to turn; spawned inside the margin she just picks a side as before.
  const off = e.x < YAM_X_MARGIN ? 1 : e.x > W - YAM_X_MARGIN ? -1 : 0;
  e.entering = off !== 0;
  e.entryDir = off;
  e.heading = off ? (off > 0 ? 0 : Math.PI) : pick([0, Math.PI]);  // broadside-on from the off
  e.legT = rand(YAM_LEG_MIN, YAM_LEG_MAX);
  e.wantHeading = e.heading;
  e.landCd = rand(YAM_LAND_CD_MIN, YAM_LAND_CD_MAX);
  e.repairCd = rand(YAM_REPAIR_CD_MIN, YAM_REPAIR_CD_MAX);
  e.parts = [];

  const addPart = (type, sOff, bOff) => {
    const p = makeEnemy(type, e.x, e.y, 'jp');
    p.sOff = sOff; p.bOff = bOff;
    p.shipOf = e;
    p.fireT = 0;
    p.tur = e.heading;
    // the gate is stamped on the parts too: every scan reads the actor it is
    // looking at, and ten of the eleven hitboxes are parts
    p.entering = e.entering;
    e.parts.push(p);
    G.enemies.push(p);
    return p;
  };

  for (const s of YAM_BELT_S) addPart('jyhull', s, 0);
  e.turrets = YAM_TURRET_S.map(s => addPart('jyturret', s, 0));
  e.mounts = [];
  for (const s of YAM_MG_S) {
    for (const b of [-YAM_MG_B, YAM_MG_B]) {
      const p = addPart('jymg', s, b);
      // lay the tub on its own beam up front. updateYamatoMount normally does this
      // on the first tick, but it doesn't run during the roll-in, and the renderer
      // blits at `p.face || 0` — so she'd come on with every tub stowed fore-and-aft.
      p.face = e.heading + Math.sign(b) * Math.PI / 2;
      e.mounts.push(p);
    }
  }
  syncYamatoParts(e);
}

// which broadside faces the player. cos(heading) is held away from 0 by
// YAM_LEG_ANGLE precisely so this sign is never ambiguous mid-leg.
function yamatoPlayerSide(e) {
  return Math.cos(e.heading) >= 0 ? 1 : -1;
}

// the one place part positions are computed. Everything else — the AI, the
// renderer, every hit test — reads p.x/p.y, so there is no second source of
// truth to fall out of step.
function syncYamatoParts(e) {
  const ch = Math.cos(e.heading), sh = Math.sin(e.heading);
  for (const p of e.parts) {
    if (p.dead) continue;
    p.x = e.x + ch * p.sOff - sh * p.bOff;
    p.y = e.y + sh * p.sOff + ch * p.bOff;
    // the belt sections share the hull's pool, so mirror it: their own hp is
    // never decremented (damageEnemy redirects), and without this the inspector,
    // TEST.roster() and TEST.inspect() would all report a full bar on a dying ship
    if (p.t.hullSection) { p.hp = e.hp; p.maxhp = e.maxhp; }
  }
}

// A triple 18.1" battery. Picks its own target, lays its own bearing, and rolls
// out three shells rather than one crack — the ripple is what reads as a battery
// firing instead of a big tank. Modelled on the tank cannon in updateTankCombat:
// no accuracy roll, just distance-scaled scatter into the shell queue.
function updateYamatoTurret(ship, p, dt) {
  p.fireT = Math.max(0, p.fireT - dt);
  p.cd -= dt;
  const side = yamatoPlayerSide(ship);
  const beam = ship.heading + side * Math.PI / 2;
  // a battery cannot fire through its own superstructure: the traverse is a
  // wedge either side of the engaged beam, so she has to come about to bring the
  // guns onto anything behind her
  const range = unitRange(p, p.t.range) * fogMult();
  const target = tieredUnitTarget(p, range, [
    u => u.t.tank || u.t.gunEmplacement,      // armor and staked guns first
    u => !!u.t.sup || u.type === 'mortarman',  // then the crews that hurt her
    () => true,
  ]);
  if (target && Math.abs(angleDiff(Math.atan2(target.y - p.y, target.x - p.x), beam)) <= YAM_TURRET_ARC) {
    const want = Math.atan2(target.y - p.y, target.x - p.x);
    p.tur += clamp(angleDiff(want, p.tur), -YAM_TURRET_TRACK * dt, YAM_TURRET_TRACK * dt);
    if (p.cd <= 0 && Math.abs(angleDiff(want, p.tur)) <= YAM_TURRET_FIRE_TOL) {
      SFX.boom(true);
      p.fireT = 0.22;
      const d = dist(p, target);
      const scatter = Math.max(20, YAM_SHELL_SCATTER + d * 0.05);
      for (let i = 0; i < YAM_SHELL_COUNT; i++) {
        scheduleShell(target.x + rand(-scatter, scatter), target.y + rand(-scatter, scatter),
          YAM_SHELL_FLIGHT + i * YAM_SHELL_GAP, YAM_SHELL_R, YAM_SHELL_DMG, true, p);
      }
      p.cd = YAM_TURRET_ROF * rand(0.9, 1.1);
    }
  } else {
    // nothing it can bear on: creep back to the beam so it's laid ready
    p.tur += clamp(angleDiff(beam, p.tur), -YAM_TURRET_TRACK * dt, YAM_TURRET_TRACK * dt);
  }
  // hard clamp, so a hull turning under the mount can never walk it round
  p.tur = beam + clamp(angleDiff(p.tur, beam), -YAM_TURRET_ARC, YAM_TURRET_ARC);
}

// An open 25mm tub on a sponson. Only the two mounts on the engaged broadside can
// see anything — that's what "two guns a side" is for. Driven through runWeapon
// rather than fireShot so it gets bursts AND suppressArea pinning for free.
function updateYamatoMount(ship, p, dt) {
  const side = yamatoPlayerSide(ship);
  const bearing = ship.heading + Math.sign(p.bOff) * Math.PI / 2;
  const engaged = Math.sign(p.bOff) === side;
  const range = unitRange(p, p.t.range) * fogMult();
  const target = engaged
    ? nearestUnitInRange(p, range, u => inFireCone(p, u, bearing, YAM_MG_ARC))
    : null;
  runWeapon(p, target, dt, null);
  // fireShot owns .face while there's a target — overwriting it after the shot
  // would snap the tub's art back off whatever it just fired at
  if (!target) {
    p.face = p.face == null ? bearing : p.face + clamp(angleDiff(bearing, p.face), -1.2 * dt, 1.2 * dt);
  }
}

// Pick the next leg. She runs mostly lateral, but angles a leg up or down often
// enough that the range to the player's line keeps changing. Reversing takes
// ~12s at YAM_TURN_RATE, and that long swing — guns trailing off the beam — is
// her punish window, the same role the eboss's retreat walk plays.
function nextYamatoLeg(e) {
  e.legT = rand(YAM_LEG_MIN, YAM_LEG_MAX);
  // reverse if she's run out of room, otherwise usually hold course
  const nearEdge = e.x < YAM_X_MARGIN + 30 || e.x > W - YAM_X_MARGIN - 30;
  let base = Math.cos(e.heading) >= 0 ? 0 : Math.PI;
  if (nearEdge) base = e.x < W / 2 ? 0 : Math.PI;
  else if (Math.random() < 0.3) base = base === 0 ? Math.PI : 0;
  // a diagonal, biased toward whichever keeps her inside the patrol band
  let tilt = 0;
  if (Math.random() < 0.55) {
    tilt = rand(0.2, YAM_LEG_ANGLE);
    const wantDown = e.y < (YAM_Y_MIN + YAM_Y_MAX) / 2;
    // +y is toward the player; sin(heading) drives her y, and heading π flips it
    if (!wantDown) tilt = -tilt;
    if (base === Math.PI) tilt = -tilt;
  }
  e.wantHeading = base + tilt;
}

// The arrival. She drives straight along her beam from off the edge to the patrol
// margin, at a fixed heading and y — there is no turn, so neither clamp in
// updateYamato has anything to do and both are skipped along with everything else
// (see the early-out there). She is inert and untouchable the whole way: the
// `entering` flag on her and every part is what keeps her out of the targeting
// scans, which gate on y < 0 and have no notion of x at all.
function yamatoRollIn(e, dt) {
  const goal = e.entryDir > 0 ? YAM_X_MARGIN : W - YAM_X_MARGIN;
  const left = Math.abs(goal - e.x);
  const speed = YAM_SPEED + (YAM_ENTRY_SPEED - YAM_SPEED) * clamp(left / YAM_ENTRY_EASE, 0, 1);
  e.x += e.entryDir * speed * dt;
  if (e.entryDir > 0 ? e.x >= goal : e.x <= goal) {
    e.x = goal;
    e.entering = false;
    for (const p of e.parts) p.entering = false;
    // she lands ON the margin, so nextYamatoLeg reads nearEdge and turns her
    // inward — she can never be handed a leg that walks straight back off
    nextYamatoLeg(e);
  }
  syncYamatoParts(e);
}

// Her signature play, and the fight's whole economy: the ramps come down and
// naval infantry pour out along both flanks. Killing escorts is what pays for the
// artillery that actually kills her — small arms can't touch the belt, so without
// this the fight would have no funding loop at all.
function yamatoLandingParty(e) {
  showBanner('YAMATO PUTS THE NAVAL INFANTRY ASHORE!');
  SFX.event();
  const tier = Math.max(1, G.wave / 10);
  const count = Math.floor(specialWaveMult(tier) * YAM_LAND_MULT);
  const ch = Math.cos(e.heading), sh = Math.sin(e.heading);
  for (let i = 0; i < count; i++) {
    // spill out of the hull along the keel, alternating sides
    const s = rand(-YAM_LEN / 2, YAM_LEN / 2);
    const b = (i % 2 ? 1 : -1) * rand(YAM_HALF_BEAM + 6, YAM_HALF_BEAM + 22);
    const x = e.x + ch * s - sh * b;
    const y = e.y + sh * s + ch * b;
    // spawnEnemyAt clamps x and plates them like any other troops
    spawnEnemyAt(pick(YAM_LAND_POOL), x, clamp(y, 20, YAM_SAFE_Y + 30));
  }
}

// Damage control. Brings ONE knocked-out part back, part-worn, so stripping her
// guns is a race rather than a one-time solve. The re-push is not optional:
// compactInPlace physically drops dead actors out of G.enemies, and every
// targeting scan iterates that array — a revived part left out of it would fire
// and draw while being impossible to shoot back at.
function yamatoDamageControl(e) {
  const gone = e.parts.filter(p => p.dead);
  if (!gone.length) return false;
  const p = pick(gone);
  p.dead = false;
  p.hp = Math.max(1, Math.round(p.maxhp * YAM_REPAIR_FRAC));
  p.cd = rand(1, 3);
  p.burstLeft = 0; p.burstTimer = 0;
  G.enemies.push(p);
  G.texts.push({ x: p.x, y: p.y - 22, text: 'DAMAGE CONTROL', ttl: 1.6 });
  return true;
}

function updateYamato(e, dt) {
  if (!e.yamInit) initYamato(e);
  // Still rolling in. This one return is what keeps the whole fight out of the
  // arrival — the phase poll, both ability clocks, the leg logic, both clamps and
  // both gun loops. Symmetric with her being untargetable: she can't shoot either.
  if (e.entering) { yamatoRollIn(e, dt); return; }

  // ONE HP pool ticked into YAM_SEGMENTS phases — the mass's and the train's poll,
  // verbatim, and here for one reason only: the phase is the plate her batteries
  // and tubs wear (bossPartDamageMult). No ability hangs off a break, so this is
  // the whole of it. Polled rather than hooked into damageEnemy so it is robust to
  // every damage source, and a WHILE because one big hit can empty two segments.
  // Note her belt feeds this pool, so the sections the player is most likely to be
  // shooting are what strips their own escorts' armor.
  while (e.phase < YAM_SEGMENTS - 1
      && e.hp <= e.maxhp * (1 - (e.phase + 1) / YAM_SEGMENTS)) e.phase++;

  e.landCd -= dt;
  if (e.landCd <= 0) {
    e.landCd = rand(YAM_LAND_CD_MIN, YAM_LAND_CD_MAX);
    yamatoLandingParty(e);
  }
  e.repairCd -= dt;
  if (e.repairCd <= 0) {
    // only spend the cooldown when there was actually something to fix, so the
    // first thing the player knocks out doesn't sit there for a full cycle
    if (yamatoDamageControl(e)) e.repairCd = rand(YAM_REPAIR_CD_MIN, YAM_REPAIR_CD_MAX);
    else e.repairCd = 2;
  }

  // ease onto the leg's heading, then drive it
  e.legT -= dt;
  if (e.legT <= 0) nextYamatoLeg(e);
  e.heading += clamp(angleDiff(e.wantHeading, e.heading), -YAM_TURN_RATE * dt, YAM_TURN_RATE * dt);
  e.x += Math.cos(e.heading) * YAM_SPEED * dt;
  e.y += Math.sin(e.heading) * YAM_SPEED * dt;
  // She is a gun platform, not a breacher. YAM_SAFE_Y bounds every PART, so the
  // centre clamp has to back off by however much of the hull's length is
  // currently pointing down-field — clamping the centre alone let her stern swing
  // to y=364. The effect is that she can only push to YAM_Y_MAX while lying flat
  // and has to pull back as she angles. The x clamp keeps every part on screen:
  // targeting scans reject y < 0 but never x, so a bow off the edge would be
  // shootable and invisible. The roll-in is exempt from that clamp — it drives her
  // from off the edge to this very margin — and the reason it can be is that the
  // `entering` flag closes exactly the hole this clamp otherwise guards.
  const yReach = Math.abs(Math.sin(e.heading)) * Math.max(...YAM_BELT_S.map(Math.abs))
    + Math.abs(Math.cos(e.heading)) * YAM_MG_B;
  e.x = clamp(e.x, YAM_X_MARGIN, W - YAM_X_MARGIN);
  e.y = clamp(e.y, YAM_Y_MIN, Math.min(YAM_Y_MAX, YAM_SAFE_Y - yReach));
  // turned around at the edge or pinned on the band, end the leg early so she
  // doesn't grind along a clamp for its full duration
  if ((e.x <= YAM_X_MARGIN || e.x >= W - YAM_X_MARGIN) && e.legT > 0.5) e.legT = 0.5;

  syncYamatoParts(e);
  for (const p of e.turrets) if (!p.dead) updateYamatoTurret(e, p, dt);
  for (const p of e.mounts) if (!p.dead) updateYamatoMount(e, p, dt);
}

// ---- Regio Esercito: the Treno Armato --------------------------------------

// Build the consist. Same parent+parts pattern as the ship and the mass, and the
// Progenitor's HP rule: every part owns its pool — nothing here mirrors or
// redirects into the engine, so damage.js needs no clause for it.
function initWarTrain(e) {
  e.trainInit = true;
  e.phase = 0;                  // health segments broken so far (0..TRAIN_SEGMENTS-1)
  e.laneX = clamp(e.x, TRAIN_LANE_MARGIN, W - TRAIN_LANE_MARGIN);
  e.x = e.laneX;
  e.face = Math.PI / 2;
  e.parts = [];

  const addPart = (type, sOff, bOff) => {
    const p = makeEnemy(type, e.laneX + (bOff || 0), e.y + sOff, 'it');
    p.sOff = sOff; p.bOff = bOff || 0;
    p.trainOf = e;
    p.fireT = 0;
    p.tur = Math.PI / 2;
    e.parts.push(p);
    // BOTH lists, always: e.parts is what drives and draws it, G.enemies is what
    // makes it shootable (same trap the pods document).
    G.enemies.push(p);
    return p;
  };

  e.turrets = TRAIN_TURRET_S.map(s => addPart('ittur', s, 0));
  e.wagon = addPart('itwag', TRAIN_WAGON_S, 0);
  e.wagon.dropCd = rand(4, 7);   // the first squad comes out early, as the train arrives
  e.mounts = [];
  for (const s of [TRAIN_GUNWAGON_S + TRAIN_MG_S, TRAIN_GUNWAGON_S - TRAIN_MG_S]) {
    for (const b of [-TRAIN_MG_B, TRAIN_MG_B]) e.mounts.push(addPart('itmg', s, b));
  }
  // the howitzer on the tail. makeEnemy seeds cd: rand(0.5, 1.5), which would have
  // it fire the instant it clears the top edge — roll it a real reload instead.
  e.arty = addPart('itarty', TRAIN_ARTY_S, 0);
  e.arty.cd = rand(TRAIN_ARTY_CD_MIN, TRAIN_ARTY_CD_MAX);
  syncTrainParts(e);
}

// the one place part positions are computed (the syncYamatoParts rule). Dead
// wagons are repositioned too, unlike hers: there is no damage control here, so
// a knocked-out wagon is a burnt hulk that stays COUPLED and rides the rest of
// the way down the rails — the renderer draws it from e.parts at this position.
function syncTrainParts(e) {
  for (const p of e.parts) {
    p.x = e.laneX + p.bOff;
    p.y = e.y + p.sOff;
  }
}

// A turret wagon. Modelled on the Yamato battery: picks its own target, lays its
// own bearing, distance-scaled scatter into the shell queue. The traverse wedge
// is centred straight down-field — it can swing onto almost anything except back
// up its own train.
function updateTrainTurret(train, p, dt) {
  p.fireT = Math.max(0, p.fireT - dt);
  p.cd -= dt;
  const down = Math.PI / 2;
  const range = unitRange(p, p.t.range) * fogMult();
  const target = tieredUnitTarget(p, range, [
    u => u.t.tank || u.t.gunEmplacement,       // armor and staked guns first
    u => !!u.t.sup || u.type === 'mortarman',  // then the crews that hurt it
    () => true,
  ]);
  if (target && Math.abs(angleDiff(Math.atan2(target.y - p.y, target.x - p.x), down)) <= TRAIN_TURRET_ARC) {
    const want = Math.atan2(target.y - p.y, target.x - p.x);
    p.tur += clamp(angleDiff(want, p.tur), -TRAIN_TURRET_TRACK * dt, TRAIN_TURRET_TRACK * dt);
    if (p.cd <= 0 && Math.abs(angleDiff(want, p.tur)) <= TRAIN_TURRET_FIRE_TOL) {
      SFX.boom(true);
      p.fireT = 0.22;
      const d = dist(p, target);
      const scatter = Math.max(18, TRAIN_SHELL_SCATTER + d * 0.05);
      scheduleShell(target.x + rand(-scatter, scatter), target.y + rand(-scatter, scatter),
        TRAIN_SHELL_FLIGHT, TRAIN_SHELL_R, TRAIN_SHELL_DMG, true, p);
      p.cd = TRAIN_TURRET_ROF * rand(0.9, 1.1);
    }
  } else {
    // nothing it can bear on: creep back to straight ahead, laid ready
    p.tur += clamp(angleDiff(down, p.tur), -TRAIN_TURRET_TRACK * dt, TRAIN_TURRET_TRACK * dt);
  }
  p.tur = down + clamp(angleDiff(p.tur, down), -TRAIN_TURRET_ARC, TRAIN_TURRET_ARC);
}

// The howitzer on the tail — the train's REACH, and the reason the player can't
// simply back off once it parks. Laid and clamped exactly like a turret wagon
// (same wedge, so it can't shell its own consist), but its shell is the opposite
// character: slow, wide and loose. Two things follow from that and are the whole
// design of the piece:
//   - it has a DEAD ZONE. Every tier below carries the min-range predicate, not
//     just the first, or a rifleman standing on the coupling would still be shot
//     at by tier 3. That zone is what the 389 reach is sold against.
//   - it hunts what a 2.2s arcing shell can actually HIT. Staked guns first (they
//     cannot walk out of the impact, and they're the counter-battery threat),
//     then the crews that outrange it, then anything.
function updateTrainArty(train, p, dt) {
  p.fireT = Math.max(0, p.fireT - dt);
  p.cd -= dt;
  const down = Math.PI / 2;
  const range = unitRange(p, p.t.range) * fogMult();
  const min2 = TRAIN_ARTY_MIN * TRAIN_ARTY_MIN;
  const far = u => dist2(p, u) > min2;
  const target = tieredUnitTarget(p, range, [
    u => far(u) && !!u.t.gunEmplacement,
    u => far(u) && (u.type === 'mortarman' || u.type === 'bazooka' || !!u.t.sup),
    far,
  ]);
  if (target && Math.abs(angleDiff(Math.atan2(target.y - p.y, target.x - p.x), down)) <= TRAIN_TURRET_ARC) {
    const want = Math.atan2(target.y - p.y, target.x - p.x);
    p.tur += clamp(angleDiff(want, p.tur), -TRAIN_ARTY_TRACK * dt, TRAIN_ARTY_TRACK * dt);
    if (p.cd <= 0 && Math.abs(angleDiff(want, p.tur)) <= TRAIN_TURRET_FIRE_TOL) {
      SFX.boom(true);
      addShake(2);
      p.fireT = TRAIN_ARTY_FIRE_T;
      const d = dist(p, target);
      const scatter = Math.max(24, TRAIN_ARTY_SCATTER + d * 0.06);
      // `by = p`, never a bare {x,y}: ESCALATION rung IV keys the enemy damage
      // modifier on the firer's side, and explode forwards whatever it is given.
      scheduleShell(target.x + rand(-scatter, scatter), target.y + rand(-scatter, scatter),
        TRAIN_ARTY_FLIGHT, TRAIN_ARTY_R, TRAIN_ARTY_DMG, true, p);
      p.cd = rand(TRAIN_ARTY_CD_MIN, TRAIN_ARTY_CD_MAX);
    }
  } else {
    p.tur += clamp(angleDiff(down, p.tur), -TRAIN_ARTY_TRACK * dt, TRAIN_ARTY_TRACK * dt);
  }
  p.tur = down + clamp(angleDiff(p.tur, down), -TRAIN_TURRET_ARC, TRAIN_TURRET_ARC);
}

// An open gun post on the gun wagon: each of the four covers its own side.
// Driven through runWeapon rather than fireShot so it gets bursts AND
// suppressArea pinning for free (the updateYamatoMount rule).
function updateTrainMount(train, p, dt) {
  const bearing = p.bOff > 0 ? 0 : Math.PI;
  const range = unitRange(p, p.t.range) * fogMult();
  const target = nearestUnitInRange(p, range, u => inFireCone(p, u, bearing, YAM_MG_ARC));
  runWeapon(p, target, dt, null);
  // fireShot owns .face while there's a target — overwriting it after the shot
  // would snap the crew's art back off whatever it just fired at
  if (!target) {
    p.face = p.face == null ? bearing : p.face + clamp(angleDiff(bearing, p.face), -1.2 * dt, 1.2 * dt);
  }
}

// The infantry wagon's play, and the fight's whole economy — the same role the
// Yamato's landing parties fill: small arms can't touch the engine, so the
// squads spilling out beside the track are what pay for the artillery that can.
function trainDisembark(e, wag) {
  showBanner('THE TRENO ARMATO UNLOADS ITS FANTERIA!');
  SFX.event();
  wag.dropT = 0.9;              // render tell: the boxcar doors stand open
  const tier = Math.max(1, G.wave / 10);
  const count = Math.max(4, Math.floor(specialWaveMult(tier) * TRAIN_DROP_MULT));
  for (let i = 0; i < count; i++) {
    // spill out both doors, alternating sides of the track
    const side = i % 2 ? 1 : -1;
    const x = wag.x + side * rand(18, 34);
    const y = wag.y + rand(-16, 16);
    spawnEnemyAt(pick(TRAIN_DROP_POOL), x, clamp(y, 20, H - 60));
  }
}

// A health segment breaks and the whole army answers. This is the train's bond
// with its faction: it doesn't fire the charge itself, it arms the SAME signed
// clock the ambient AVANTI machinery runs (updateAvanti), so the telegraph, the
// suppression immunity and the surge all come from one code path. The ambient
// cooldown is pushed back so the field doesn't owe a second charge right after.
function trainSoundsCharge(e) {
  showBanner('THE TRENO ARMATO SOUNDS THE CHARGE — AVANTI!');
  SFX.event();
  addShake(4);
  G.itLastAvanti = G.time;
  G.itAvantiCd = rand(IT_AVANTI_CD_MIN, IT_AVANTI_CD_MAX);
  if (G.itCharge > 0) {
    // a surge is already running: the whistle renews it rather than queueing one
    G.itCharge = IT_AVANTI_DUR;
    avantiCharge();
  } else if (G.itCharge === 0) {
    G.itCharge = -IT_AVANTI_TELEGRAPH;
  }
  // (telegraph already winding up: leave it — the charge is coming anyway)
  for (const en of G.enemies) {
    if (!isItalianFoot(en) || Math.random() > 0.45) continue;
    G.texts.push({ x: en.x, y: en.y - 22, text: 'AVANTI!', ttl: 1.3 + Math.random() * 0.6 });
  }
  // armor plate shearing off the engine
  for (let i = 0; i < 14; i++) {
    G.particles.push({
      x: e.x + rand(-14, 14), y: e.y + rand(-20, 20),
      vx: rand(-70, 70), vy: rand(-90, -20),
      ttl: rand(0.3, 0.7), grav: 200, size: rand(1.5, 3),
      color: pick(['#c8b872', '#8a8468', '#57492f']),
    });
  }
}

// Anything the player built on the rails is kindling under the wheels. Only runs
// while the train is actually rolling, and only against the player's arrays —
// G.itWorks is deliberately spared, or the boss would grind up its own line's
// cover on the way down.
function trainCrush(e, dt) {
  const chew = (o) => {
    if (Math.abs(o.x - e.laneX) > TRAIN_CRUSH_R) return;
    for (const p of e.parts) {
      if (Math.abs(o.y - p.y) < TRAIN_CRUSH_R + 6) {
        o.hp -= TRAIN_CRUSH_DPS * dt;
        if (Math.random() < 0.15) buildSparks(o);
        return;
      }
    }
    if (Math.abs(o.y - e.y) < TRAIN_CRUSH_R + 6) o.hp -= TRAIN_CRUSH_DPS * dt;
  };
  for (const s of G.sandbags) chew(s);
  for (const b of G.bunkers) chew(b);
  for (const wt of G.watchtowers) chew(wt);
  for (const cn of G.camoNests) chew(cn);
  for (const ac of G.ammoCrates) chew(ac);
  for (const d of G.dummies) chew(d);
  // wire is a wide belt, not a point: crush the strand wherever the track crosses
  // it. Centred on the MIDPOINT of the consist and measured off TRAIN_TAIL_S, so
  // lengthening the train can't leave the tail rolling over uncut wire.
  for (const wr of G.wires) {
    if (Math.abs(wr.x - e.laneX) < 35 + TRAIN_CRUSH_R
        && Math.abs(wr.y - e.y - TRAIN_TAIL_S / 2) < -TRAIN_TAIL_S / 2 + 22) {
      wr.hp -= TRAIN_CRUSH_DPS * dt;
    }
  }
}

function updateWarTrain(e, dt) {
  if (!e.trainInit) initWarTrain(e);

  // ONE HP pool drawn as TRAIN_SEGMENTS bars — the Progenitor's poll, verbatim:
  // polled here rather than hooked into damageEnemy so it's robust to every
  // damage source, and a WHILE because one big hit can empty two segments and
  // each crossing owes its own charge. The phase guard stops at the last
  // segment: emptying THAT one is death, not an ability.
  while (e.phase < TRAIN_SEGMENTS - 1
      && e.hp <= e.maxhp * (1 - (e.phase + 1) / TRAIN_SEGMENTS)) {
    e.phase++;
    trainSoundsCharge(e);
  }

  // roll south down the lane until the buffer hits TRAIN_STOP_Y, then park.
  // The stop — not a clamp fighting an AI, an actual terminus — is why the
  // breach loop in update.js skips the whole consist: parked at H-70 the engine
  // sits past nothing, but a regressed constant would end the run in one frame.
  if (e.y < TRAIN_STOP_Y) {
    e.y = Math.min(TRAIN_STOP_Y, e.y + TRAIN_SPEED * dt);
    trainCrush(e, dt);
    // stack smoke while under way
    if (Math.random() < 0.4) {
      const ttl = rand(0.8, 1.6);
      G.particles.push({
        x: e.x + rand(-3, 3), y: e.y + 14, vx: rand(-8, 8), vy: rand(-34, -16),
        ttl, maxTtl: ttl, grav: -12, size: rand(3, 6),
        kind: 'smoke', color: pick(['#3d362a', '#4e4536', '#2a2318']),
      });
    }
  }
  e.x = e.laneX;
  syncTrainParts(e);

  // the boxcar unloads on a cadence, but only once it's actually on the field —
  // squads spawning above the top edge would just be a silent trickle
  const wag = e.wagon;
  if (wag && !wag.dead) {
    if (wag.dropT > 0) wag.dropT -= dt;
    if (wag.y > 30) {
      wag.dropCd -= dt;
      if (wag.dropCd <= 0) {
        wag.dropCd = rand(TRAIN_DROP_CD_MIN, TRAIN_DROP_CD_MAX);
        trainDisembark(e, wag);
      }
    }
  }

  // guns come alive as each wagon clears the top edge (targeting scans skip
  // y < 0, so firing from staging would be shooting from behind glass)
  for (const p of e.turrets) if (!p.dead && p.y > 10) updateTrainTurret(e, p, dt);
  for (const p of e.mounts) if (!p.dead && p.y > 10) updateTrainMount(e, p, dt);
  // the howitzer is on the tail, so it is the LAST gun to come into action —
  // roughly half way down the roll-in. The long gun arriving last is the tell.
  if (e.arty && !e.arty.dead && e.arty.y > 10) updateTrainArty(e, e.arty, dt);
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
  // A leap already in the air is COMMITTED and needs no target to finish, so it
  // has to be stepped above the checks below — a hound whose man died mid-flight
  // would otherwise fall to advance() and walk on frozen at full arc, never
  // landing and never re-entering the sprite cache.
  if (e.pounceT > 0) { houndPounce(e, dt, null, 0); return; }
  if (command) { if (e.moveTo) advance(e, dt, buffed); return; }
  const target = primaryUnitTarget(e, 4000);
  if (!target) { advance(e, dt, buffed); return; }
  const reach = ZOMBIE_REACH + (e.t.boss ? 16 : e.t.big ? 8 : 0)
    + (target.t.tank || target.t.vehicle ? 9 : 0);
  // the hound leaps the last stretch instead of running it — a pre-step, so a
  // grounded one falls straight through to the pursuit below
  if (e.t.pounce && houndPounce(e, dt, target, reach)) return;
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

// Stun and prone return from the TOP of updateEnemy, above every dispatch, so a
// hound caught mid-leap would otherwise hang in the air until the daze wore off.
// Collapsing the arc there is all it takes — x/y are valid ground coords at every
// point of the lerp, so it just drops where it is. Called from those two blocks
// rather than edited into the shared tryGoProne/maybeShellShock setters, which
// have no business knowing what a pounce is.
function abortPounce(e) {
  if (e.pounceT > 0) { e.pounceT = 0; e.pounceArc = 0; }
}

// The Infected Hound's leap: it closes the last stretch of ground in one bound
// instead of running it. Shaped as a PRE-STEP like updateGarrison/updateArdito —
// it returns true only while the leap owns the frame, so a hound on cooldown or
// out of the distance window falls straight through to the ordinary pursuit.
// `target` is only read to DECIDE a leap, so the mid-flight call site above
// passes null: once launched, the arc is committed to a fixed landing point.
//
// It is purely a gap-closer. The landing point is chosen just inside bite reach,
// so touchdown needs no impact code of its own: the next frame the ordinary
// reach/cooldown bite above takes over with no special case anywhere.
//
// x/y stay on the GROUND for the whole flight — the height is `pounceArc`, a
// render-only scalar the painter subtracts from y, exactly the way the Spitter's
// bile glob (the only other arc in the game) fakes one. There is no z anywhere in
// this engine, and the single airborne state that does exist, `chute > 0`, is
// ~15 guards scattered through targeting, shooting, damage and update. Staying a
// ground actor keeps the hound shootable, minable, wire-able and inspectable
// mid-leap for nothing. A pounce is a burst of speed, not an invulnerability
// window — which is also why nothing here touches its HP or armor.
function houndPounce(e, dt, target, reach) {
  const p = e.t.pounce;
  // `!(x > 0)` rather than `x <= 0`: pounceT is undefined until the first leap
  // (the fields are seeded lazily), and `undefined <= 0` is false — which would
  // send a fresh hound straight into the flight maths and NaN its position.
  if (!(e.pounceT > 0)) {
    // grounded: recharge. Seeded lazily on first read, the way the spitter's
    // spitCd is, so makeEnemy doesn't grow a field every enemy in the game
    // would then carry.
    e.pounceCd = (e.pounceCd == null ? rand(p.cdMin, p.cdMax) : e.pounceCd) - dt;
    if (e.pounceCd > 0) return false;
    const d = dist(e, target);
    if (d < p.min || d > p.range) return false;
    const a = Math.atan2(target.y - e.y, target.x - e.x);
    const hop = Math.max(0, d - Math.max(0, reach - 2));   // stop just inside reach
    const tx = clamp(e.x + Math.cos(a) * hop, 14, W - 14);
    const ty = e.y + Math.sin(a) * hop;
    // wire on the line — or a hound already snagged in a band — grounds the leap
    if (wireOnLeap(e.x, e.y, tx, ty)) return false;
    e.psx = e.x; e.psy = e.y;
    e.ptx = tx; e.pty = ty;
    // the duration is COPIED rather than read off the spec each frame, so retuning
    // p.dur from the console mid-flight can't renormalize a leap already underway
    e.pounceDur = p.dur;
    e.pounceT = p.dur;
    e.face = a;
    // and then FALL THROUGH: the leap moves on the frame it launches, not the one
    // after. Returning here instead costs a stationary frame at full arc 0, which
    // reads as the dog hitching before it jumps.
  }
  // in the air: ride the stored launch → landing line
  e.pounceT -= dt;
  const f = clamp(1 - e.pounceT / e.pounceDur, 0, 1);
  e.x = e.psx + (e.ptx - e.psx) * f;
  e.y = e.psy + (e.pty - e.psy) * f;
  e.pounceArc = Math.sin(f * Math.PI) * p.lift;
  if (e.pounceT <= 0) {
    e.pounceT = 0;
    e.pounceArc = 0;
    e.pounceCd = rand(p.cdMin, p.cdMax);
  }
  return true;
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
  addGroundMark({ type: 'crater', x, y, r: r * 0.7, rot1: rand(0, 3), rot2: rand(0, 3) });
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

// ---- The Progenitor: the Horde's wave-100 boss ------------------------------
// Tuning lives in the PROG_ block in constants.js. It is a CORE actor plus five
// child pod actors, all real entries in G.enemies, repositioned from the core
// every tick — the pattern the Yamato introduced, with one deliberate difference
// spelled out in that constants block: her belt is five actors on ONE pool,
// while every pod here owns its HP. That is why nothing in explode() or
// flameSpray needed a clause for this boss.
//
// The pods are driven ONLY from here — updateEnemy gives them a bare return,
// because they carry a `spit` spec and would otherwise be handed to
// updateSpitter, which walks them off the boss the moment bile range is empty.

// lazy init on the first update tick, so the wave-100 hook and a bare
// TEST.deploy('zprogen', ...) build an identical boss down the same code path
function initProgenitor(e) {
  e.progInit = true;
  e.phase = 0;                  // health segments broken so far (0..PROG_SEGMENTS-1)
  e.pods = [];
  e.spawnCd = rand(PROG_SPAWN_CD_MIN, PROG_SPAWN_CD_MAX);
  e.devourCd = 0;
  for (const ang of PROG_POD_ANGLES) {
    const p = makeEnemy('zpod', e.x, e.y, 'zo');
    p.pOff = ang;
    p.bossOf = e;
    p.spitCd = rand(PROG_POD_SPIT.cdMin, PROG_POD_SPIT.cdMax);
    e.pods.push(p);
    // BOTH lists, always: e.pods is what drives and draws it, G.enemies is what
    // makes it shootable. A pod in only the first would spit bile from an
    // invulnerable sac.
    G.enemies.push(p);
  }
  syncProgenitorPods(e);
}

// the single source of truth for pod positions. World-frame fan, NOT rotated by
// e.face: every PROG_POD_ANGLES entry has sin > 0, so the sacs always sit on the
// down-field side between the mass and the player's line, which is what makes
// raw-distance target scans pick them first (see the PROG_POD_R comment).
function syncProgenitorPods(e) {
  for (const p of e.pods) {
    // compactInPlace splices dead actors out of G.enemies while e.pods keeps the
    // stale reference — same trap the Yamato's part sync steps around
    if (p.dead) continue;
    p.x = e.x + Math.cos(p.pOff) * PROG_POD_R;
    p.y = e.y + Math.sin(p.pOff) * PROG_POD_R;
  }
}

// a pod is a Spitter that can't walk: same spec, same fireBile, same bileBurst
// off G.biles in update.js. No min range — the sacs are the boss's close defence
// as much as its artillery.
function updateProgenitorPod(boss, p, dt) {
  const sp = p.t.spit;
  const target = nearestUnitInRange(p, unitRange(p, sp.range) * fogMult());
  if (!target) return;
  p.face = Math.atan2(target.y - p.y, target.x - p.x);
  p.spitCd -= dt;
  if (p.spitCd <= 0) {
    p.spitCd = rand(sp.cdMin, sp.cdMax);
    p.spitT = 0.3;              // render tell: the sac swells before it lets go
    fireBile(p, target, sp);
  }
}

// the mass splits open and vomits a brood of PROG_SPAWN_MIN..PROG_SPAWN_MAX.
//
// The size is drawn against a ceiling that climbs with the boss's RETURN COUNT
// (G.wave / PROG_WAVE_INTERVAL — 1 at wave 100, 2 at 200), which is the only
// thing about a boss that actually escalates; its HP scales on the same number.
// specialWaveMult is deliberately NOT used here even though both other bosses
// reach for it: it is a per-batch spawn DAMPER that only ever shrinks with wave
// depth (0.78 -> 0.60 floor), so multiplying a small base by it pinned every
// brood to exactly PROG_SPAWN_MIN forever, at every wave and every difficulty.
function progenitorBirth(e) {
  const ret = clamp(G.wave / PROG_WAVE_INTERVAL, 1, 4);
  const peak = clamp(Math.round(12 + (PROG_SPAWN_MAX - 12) * ((ret - 1) / 3)),
    PROG_SPAWN_MIN, PROG_SPAWN_MAX);
  const n = randi(PROG_SPAWN_MIN, peak);
  showBanner('THE PROGENITOR SPLITS OPEN!');
  SFX.scream();
  addShake(3);
  for (let i = 0; i < n; i++) {
    spawnEnemyAt(pick(PROG_SPAWN_POOL), e.x + rand(-34, 34),
      clamp(e.y + rand(-20, 26), 20, PROG_SAFE_Y));
  }
  // afterbirth: a wet spray around the split
  for (let i = 0; i < 18; i++) {
    const ang = rand(0, Math.PI * 2), s = rand(30, 110);
    G.particles.push({
      x: e.x, y: e.y, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s * 0.6 - 24,
      ttl: rand(0.4, 0.9), grav: 90, size: rand(2, 4),
      color: pick(['#8fe06a', '#6fae44', '#7a2020', '#a33']),
    });
  }
}

// contact is a swallow, not a bite. Routed through damageUnit rather than setting
// u.dead so the whole death path still runs — card beforeDeath saves, the recap,
// the selection splice, the corpse, and the infected short-circuit that sends a
// bitten man to reanimateAsUndead instead. purgeRadius already kills this way.
// The corpse matters twice over: it is what the next segment break raises.
// It heals the boss NOTHING — e.hp is never touched here, by design.
function progenitorDevour(e, u) {
  u.gib = true;               // spawnCorpse reads this and tears the body up
  G.texts.push({ x: u.x, y: u.y - 22, text: 'DEVOURED', ttl: 1.5, color: '#c8402c' });
  bloodSplat(u.x, u.y, 16);
  addShake(3);
  SFX.scream();
  for (let i = 0; i < 12; i++) {
    const ang = rand(0, Math.PI * 2), s = rand(20, 80);
    G.particles.push({
      x: u.x, y: u.y, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s * 0.6 - 20,
      ttl: rand(0.3, 0.7), grav: 90, size: rand(1.8, 3.4),
      color: pick(['#7a2020', '#a33', '#c22030']),
    });
  }
  damageUnit(u, PROG_DEVOUR_DMG, e, null);   // null kind: bypasses body/flak armor
}

// a segment breaks and the field stands back up. G.corpses is the ONLY surviving
// record of the dead — the actors themselves were spliced out of G.units/G.enemies
// by compactInPlace the frame they fell — so this reads the corpse list directly.
// It deliberately does NOT filter on side or nation: the horde's own dead and the
// player's fallen men rise alike, which is the whole point of the ability.
//
// Note what never reaches G.corpses and so can never be raised: an infected
// defender (damage.js short-circuits him into reanimateAsUndead), a Bloater, and
// anything with an engine. So the pool is honestly "men who died clean", and this
// scales with how bloody the fight has been rather than with the kill count.
function progenitorResurrection(e) {
  showBanner('THE PROGENITOR CALLS THE DEAD BACK UP!');
  SFX.event();
  addShake(6);
  G.flashes.push({ x: e.x, y: e.y, r: PROG_RAISE_R, ttl: 0.7, max: 0.7,
    kind: 'ring', color: '#8fe06a' });
  const r2 = PROG_RAISE_R * PROG_RAISE_R;
  let risen = 0;
  for (const cp of G.corpses) {
    if (risen >= PROG_RAISE_CAP) break;
    if (cp.ttl <= 0) continue;
    const dx = cp.x - e.x, dy = cp.y - e.y;
    if (dx * dx + dy * dy > r2) continue;
    cp.ttl = 0;                 // consumed; update.js sweeps it. Nothing rises twice.
    // makeEnemy + push, not spawnEnemyAt: risen dead don't get a fresh armor roll.
    // Mirrors reanimateAsUndead, including its light/heavy rule — evaluated back
    // in spawnCorpse while the man's type still existed, and carried on cp.light.
    const z = makeEnemy(cp.light ? 'zrunner' : 'zshambler', cp.x, cp.y);
    z.reanimated = true;
    G.enemies.push(z);
    risen++;
    addGroundMark({ type: 'crater', x: cp.x, y: cp.y, r: 9, rot1: rand(0, 3), rot2: rand(0, 3) });
    for (let i = 0; i < 6; i++) {
      G.particles.push({
        x: cp.x + rand(-5, 5), y: cp.y + rand(-5, 5), vx: rand(-24, 24), vy: rand(-50, -12),
        ttl: rand(0.4, 0.9), grav: 60, size: rand(1.6, 3),
        color: pick(['#8fe06a', '#6fae44', '#5a4a32']),
      });
    }
  }
  G.texts.push({ x: e.x, y: e.y - 34, text: 'RISEN ×' + risen, ttl: 2.2, color: '#9fe06a' });
}

function updateProgenitor(e, dt) {
  if (!e.progInit) initProgenitor(e);
  zombieGroan(e, dt);

  // ONE HP pool drawn as PROG_SEGMENTS bars. Polled here rather than hooked into
  // damageEnemy, so this is robust to every damage source — bullet, blast, flame,
  // melee, shrapnel, mines — without auditing any of them; the one-frame delay is
  // invisible. A WHILE, not an IF: a single big hit can empty more than one
  // segment and each crossing owes its own resurrection. The double-fire is
  // self-limiting — the first pass sets every corpse in radius to ttl 0, so the
  // second finds an empty field and raises nothing. The phase guard stops at the
  // last segment: emptying THAT one is death, not an ability.
  while (e.phase < PROG_SEGMENTS - 1
      && e.hp <= e.maxhp * (1 - (e.phase + 1) / PROG_SEGMENTS)) {
    e.phase++;
    progenitorResurrection(e);
  }

  e.spawnCd -= dt;
  if (e.spawnCd <= 0) {
    e.spawnCd = rand(PROG_SPAWN_CD_MIN, PROG_SPAWN_CD_MAX);
    progenitorBirth(e);
  }

  if (e.devourCd > 0) e.devourCd -= dt;

  // It swallows men, not machines: a blob digesting a Sherman would read as a bug,
  // and damageUnit(tank, 99999) would run stampWreck + explode. Armor isn't immune,
  // it just isn't food — anything armored in reach gets mauled instead.
  const edible = (u) => !(u.t.tank || u.t.vehicle || u.t.apc || u.t.gunEmplacement);
  // the throttled scan: this runs every frame, so never nearestUnitInRange here
  const target = primaryUnitTarget(e, 4000);
  if (!target) {
    advance(e, dt, false);
  } else if (dist(e, target) > PROG_DEVOUR_REACH) {
    // NOTE: e.chargeT is deliberately never read. A Screamer's frenzy will still
    // set it on the core (it has no `fixed` flag, so isZombie accepts it), and
    // honouring it would let the boss sprint — which breaks the one hard promise
    // of this fight, that a player can always walk away from it.
    pursuePoint(e, target.x, target.y, PROG_SPEED, dt);
  } else if (e.devourCd <= 0) {
    e.devourCd = PROG_DEVOUR_CD;
    e.face = Math.atan2(target.y - e.y, target.x - e.x);
    e.slashT = 0.3;
    if (edible(target)) progenitorDevour(e, target);
    else zombieBite(e, target);
  }

  // pursuePoint has no bottom clamp (chargers breach) — this thing never does
  e.y = Math.min(e.y, PROG_SAFE_Y);
  e.x = clamp(e.x, 20, W - 20);

  syncProgenitorPods(e);
  for (const p of e.pods) {
    if (!p.dead) updateProgenitorPod(e, p, dt);
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
  const target = primaryUnitTarget(e, unitRange(e, e.t.range) * fogMult());
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

// ---- The Alien Walker: stride, telegraph, sweep ---------------------------
// Tuning lives in the AW_ block in constants.js. The cycle: pace laterally in a
// band across the top of the field, plant, telegraph an aiming line for
// AW_CHARGE_T, then swing a laser lance through AW_SWEEP_ARC over two seconds.
// Anything the beam crosses eats AW_SWEEP_DMG exactly once — men, emplacements,
// mines, and the enemy's own troops, because this thing is on nobody's side.
//
// It is NOT one of the four faction bosses and killing it ends nothing; see the
// header on the AW_ block. It never advances past its band, so it can never
// breach, which is why (like Der Schlächter, the other single-actor boss) it
// needs no entry in update.js's breach-loop skip list.

function initAlienWalker(e) {
  e.awPhase = 'idle';
  e.awT = rand(1.4, 2.6);        // it doesn't fire the instant it clears the edge
  e.awFrom = e.awTo = e.awAng = e.awPrev = Math.PI / 2;
  e.awDir = 1;
  e.awHit = new Set();
  e.awStandY = rand(AW_STAND_Y_MIN, AW_STAND_Y_MAX);
  e.awLane = Math.random() < 0.5 ? 1 : -1;
  e.walkT = Math.random();       // so two of them never march in lockstep
}

// One tick of movement, returning the PIXELS COVERED — the gait phase is
// advanced by distance, not by time, and that is the whole trick behind planted
// feet (see awLeg in render-alien-walker.js). It never closes on the player: it
// walks down into its standing band, then paces sideways between sweeps and
// stands dead still to fire, so the legs are on display exactly while the
// player is safe to watch them.
function awStep(e, dt) {
  if (e.awPhase !== 'idle') return 0;          // planted while charging and firing
  const x0 = e.x, y0 = e.y;
  if (e.y < e.awStandY) {
    e.y = Math.min(e.awStandY, e.y + AW_APPROACH_SPEED * dt);
  } else {
    if (e.x < 60 || e.x > W - 60) e.awLane = -e.awLane;
    e.x += e.awLane * AW_PATROL_SPEED * dt;
  }
  return Math.hypot(e.x - x0, e.y - y0);
}

// Lay the arc for the coming sweep. At 2.4 rad the centring barely changes WHAT
// gets caught; what it changes is where the telegraph line points, so the
// charge-up reads as "it has seen your line" instead of a fixed rake. Dummies
// count at full weight through forEachDefense — a decoy line drags the aim,
// which is the only counterplay to this that doesn't cost men.
function awBeginCharge(e) {
  e.awPhase = 'charge';
  e.awT = AW_CHARGE_T;
  let sx = 0, sy = 0, n = 0;
  for (const u of G.units) if (!u.dead) { sx += u.x; sy += u.y; n++; }
  forEachDefense(o => { if (o.hp > 0) { sx += o.x; sy += o.y; n++; } });
  const centre = n ? Math.atan2(sy / n - e.y, sx / n - e.x) : Math.PI / 2;
  e.awDir = Math.random() < 0.5 ? 1 : -1;
  e.awFrom = centre - e.awDir * AW_SWEEP_ARC / 2;
  e.awTo = centre + e.awDir * AW_SWEEP_ARC / 2;
  e.awAng = e.awPrev = e.awFrom;
}

// Is (x, y) inside the wedge the beam swept since last tick? See the AW_ block
// for why this is an angular wedge and not a point-to-segment test. The pad is
// a physical half-width turned into an angle at this point's own radius, so it
// matches the drawn beam everywhere and blows up down by the feet.
function awInWedge(e, x, y) {
  const dx = x - e.x, dy = y - e.y;
  const r = Math.hypot(dx, dy);
  if (r > AW_BEAM_RANGE) return false;
  const pad = AW_BEAM_HALFW / Math.max(r, AW_BEAM_MIN_R);
  const bear = Math.atan2(dy, dx);
  return angleDiff(bear, e.awPrev) * e.awDir >= -pad
      && angleDiff(bear, e.awAng) * e.awDir <= pad;
}

// scorch and spatter where the lance lands
function awSlag(x, y) {
  for (let i = 0; i < 3; i++) {
    G.particles.push({
      x: x + rand(-4, 4), y: y + rand(-4, 4), vx: rand(-30, 30), vy: rand(-55, -10),
      ttl: rand(0.18, 0.4), grav: 200, size: 1.4,
      color: pick(['#bdf6ff', '#7fe6d8', '#e8fff4']),
    });
  }
}

function awBeamTick(e) {
  const hit = e.awHit;
  // The once-per-sweep promise. The Set lives on the WALKER, not as a token
  // stamped on each victim: the spawn roll can put several on the field at
  // once, and a per-actor stamp is per-actor rather than per-(actor, walker) —
  // walker B would overwrite A's stamp and A would charge the same man twice
  // inside one sweep. It also works unchanged for sandbags, wire and works,
  // none of which have a spare field to thread a lifecycle through.
  //
  // Everything is its own key EXCEPT the Yamato's armor belt, which is five
  // actors — four sections plus the hull core, which is the amidships hitbox —
  // sharing ONE HP pool. damageEnemy redirects a section into the ship, so
  // keying them one apiece charges that pool once per section the lance crosses:
  // measured 1600 off a single sweep where 800 was correct, with only the core
  // and one section aligned, and up to 5x broadside-on. Keying the whole belt on
  // the ship is what makes it one THING for the sweep, which is the promise the
  // Set exists to keep. Same shared-pool reasoning as explode()'s belt hold-back
  // and flameSpray's floor — and, like both of those, it is the pool and not the
  // parts that earns the clause: her turrets and gun tubs, the Progenitor's sacs
  // and the train's wagons all own their HP and stay keyed one apiece, so a lance
  // that crosses two batteries is meant to hurt twice.
  const key = (o) => (o.t && o.t.hullSection && o.shipOf) || o;
  const cut = (o) => {
    const k = key(o);
    if (hit.has(k) || !awInWedge(e, o.x, o.y)) return false;
    hit.add(k);
    return true;
  };

  // `from` is the walker itself and never a bare {x,y}: damageUnit reads
  // from.side === 'de' for the Escalation IV modifier, which is exactly the bug
  // explode() used to have. No `kind` on either side — the lance bypasses body
  // and flak pools the way flame and melee do; routing it as 'blast' would let
  // a 60-point flak vest eat a slice of an 800-damage death ray.
  for (const u of G.units) {
    if (!u.dead && cut(u)) { damageUnit(u, AW_SWEEP_DMG, e); awSlag(u.x, u.y); }
  }
  // Side-blind: it burns the Wehrmacht, the Imperial Army, the dead and the
  // Regio Esercito with equal indifference. Other walkers are the one
  // exemption — two spawned together would delete each other before either
  // finished a sweep and the mechanic would never land in front of the player.
  for (const en of G.enemies) {
    if (en.dead || en.t.awalker) continue;
    if (cut(en)) { damageEnemy(en, AW_SWEEP_DMG, e); awSlag(en.x, en.y); }
  }

  // Emplacements. compactDefenses (update.js) reaps these and stamps the rubble
  // decal, so knocking the hp down is the whole job. G.itWorks is in the list
  // for the same reason the enemy loop above is: side-blind means side-blind.
  const raze = (o) => { if (o.hp > 0 && cut(o)) { o.hp -= AW_SWEEP_DMG; awSlag(o.x, o.y); } };
  for (const s of G.sandbags) raze(s);
  for (const b of G.bunkers) raze(b);
  for (const wt of G.watchtowers) raze(wt);
  for (const cn of G.camoNests) raze(cn);
  for (const ac of G.ammoCrates) raze(ac);
  for (const d of G.dummies) raze(d);
  for (const iw of G.itWorks) raze(iw);

  // Wire is a ~70px belt, not a point: a beam crossing the middle of a strand
  // has to cut it. Same reason trainCrush handles G.wires separately and
  // purgeRadius widens its x test.
  for (const wr of G.wires) {
    if (wr.hp <= 0 || hit.has(wr)) continue;
    if (!awInWedge(e, wr.x - AW_WIRE_HALFW, wr.y)
      && !awInWedge(e, wr.x, wr.y)
      && !awInWedge(e, wr.x + AW_WIRE_HALFW, wr.y)) continue;
    hit.add(wr);
    wr.hp -= AW_SWEEP_DMG;
    awSlag(wr.x, wr.y);
  }

  // Mines carry no hp — damage.js kills them by flag. They COOK OFF rather than
  // detonate: a chain of real explode() calls along the beam would re-damage
  // actors this same function has already charged and break the once-per-sweep
  // promise from the inside. m.dead is its own guard, so no Set entry needed.
  for (const m of G.mines) {
    if (m.dead || !awInWedge(e, m.x, m.y)) continue;
    m.dead = true;
    G.flashes.push({ x: m.x, y: m.y, r: 9, ttl: 0.14, max: 0.14 });
  }
}

function updateAlienWalker(e, dt) {
  if (e.awPhase === undefined) initAlienWalker(e);

  // phase advanced by DISTANCE MOVED, not dt — see awStep. The % 1 also keeps
  // the accumulator from losing float precision over a thousand-wave run.
  e.walkT = (e.walkT + awStep(e, dt) / AW_STRIDE) % 1;

  if (e.awPhase === 'idle') {
    e.awT -= dt;
    if (e.awT <= 0) awBeginCharge(e);
  } else if (e.awPhase === 'charge') {
    e.awT -= dt;
    if (e.awT <= 0) {
      e.awPhase = 'sweep';
      e.awT = AW_SWEEP_T;
      // Open on a ZERO-WIDTH wedge at the bearing that was telegraphed. Without
      // this the first tick's wedge spans the gap from the last sweep's stale
      // angle and scythes half the map for free before the beam is even drawn.
      e.awAng = e.awPrev = e.awFrom;
      e.awHit.clear();
      SFX.event();
    }
  } else {
    e.awT -= dt;
    e.awPrev = e.awAng;
    // p is CLAMPED so the closing tick terminates exactly on awTo — unclamped,
    // a short final frame drops the tail of the arc and the last few degrees of
    // the sweep are cosmetic only.
    const p = clamp(1 - e.awT / AW_SWEEP_T, 0, 1);
    e.awAng = e.awFrom + (e.awTo - e.awFrom) * p;
    awBeamTick(e);
    if (e.awT <= 0) {
      e.awPhase = 'idle';
      e.awT = rand(AW_CD_MIN, AW_CD_MAX);
      e.awHit.clear();   // drop the refs; compactInPlace has already spliced
                         // the fallen out of G.units and G.enemies
    }
  }

  // e.face is deliberately never driven from the beam: the hull holds its
  // walking heading and the emitter tracks awAng on its own, or the whole body
  // pirouettes mid-sweep and the gait comes apart.
  e.y = clamp(e.y, AW_STAND_Y_MIN, AW_STAND_Y_MAX);
  e.x = clamp(e.x, 40, W - 40);
}
