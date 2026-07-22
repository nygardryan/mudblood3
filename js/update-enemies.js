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

  // still under canopy: drift down, sway in the wind, do nothing else
  if (e.chute > 0) {
    updateEnemyChute(e, dt);
    return;
  }
  if (e.onCraft) return;
  if (e.tutHold) return;   // tutorial: frozen in place until the script releases him

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
    runWeapon(e, target, dt, buffed ? { rofMult: 0.8 } : null);
    // stormtroopers keep pushing even under fire
    if (!command && e.t.speed >= 30 && dist2(e, target) > range * range * 0.25) {
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
  let speed = e.t.speed * (buffed ? 1.25 : 1);
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

function updateTank(e, dt) {
  // grind forward, slower than infantry, ignores wire — and fires on the move
  const spd = e.t.speed * (e.t.heavy ? 0.85 : 1);
  e.y += spd * dt;
  updateTankCombat(e, dt);
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
