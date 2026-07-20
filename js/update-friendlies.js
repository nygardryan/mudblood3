/* Mud & Blood — per-frame friendly unit logic.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

function officerBuff(u) {
  const officers = G.usOfficers || G.units;
  for (const o of officers) {
    if (o.dead || o === u) continue;
    if (!(o.type === 'officer' || o.type === 'eoff' || o.t.aura)) continue;
    if (dist(o, u) < OFFICER_AURA) {
      // a veteran officer drives his men harder
      return { rofMult: 0.75 - (o.rank || 0) * 0.03, accBonus: 0.18 + (o.rank || 0) * 0.04 };
    }
  }
  return null;
}

// officer aura + veterancy: each rank is 8% faster, 8% straighter and 4%
// harder-hitting — a MSG puts out roughly 3.5x the fire of a green private
function unitBuffs(u) {
  if (u._buffsFrame === G.buffFrame) return u._buffs;
  const b = { rofMult: 1, accBonus: 0, dmgMult: 1 };
  const ob = officerBuff(u);
  if (ob) { b.rofMult *= ob.rofMult; b.accBonus += ob.accBonus; }
  if (u.rank > 0) {
    b.rofMult *= 1 - u.rank * 0.08;
    b.accBonus += u.rank * 0.08;
    b.dmgMult *= 1 + u.rank * 0.04;
  }
  u._buffs = b;
  u._buffsFrame = G.buffFrame;
  return b;
}

// veterans hustle: each rank moves 4% quicker, so a MSG covers ground 24% faster
function unitSpeed(u) {
  return u.t.speed * (1 + (u.rank || 0) * 0.04);
}

// close-range specialists stretch their reach hardest as they rank up
function unitRangeRankRate(type) {
  return (type === 'shotgunner' || type === 'engineer' || type === 'officer' || type === 'flamer')
    ? 0.05 : 0.01;
}

// a watch tower's raised vantage extends the sightline of nearby riflemen —
// but a mortar crew fires indirect and blind, so the tower does nothing for them.
// an engineer-fortified tower (t.up) sees further and boosts the effect further.
function watchtowerRangeMult(u) {
  if (u.side !== 'us' || u.t.mortar || !G.watchtowers.length) return 1;
  let mult = 1;
  for (const wt of G.watchtowers) {
    if (dist(wt, u) < WATCHTOWER_AURA) {
      const wtMult = wt.up ? WATCHTOWER_RANGE_MULT_UPGRADED : WATCHTOWER_RANGE_MULT;
      if (wtMult > mult) mult = wtMult;
    }
  }
  return mult;
}

function unitRangeMult(u) {
  const rank = u.rank || 0;
  let mult = rank <= 0 ? 1 : 1 + rank * unitRangeRankRate(u.type);
  mult *= watchtowerRangeMult(u);
  return mult;
}

function unitRange(u, base) {
  return base * unitRangeMult(u);
}

function updateUnit(u, dt) {
  if (u.proneCd > 0) u.proneCd -= dt;
  if (u.prone > 0) {
    // a move order gets him up and running; otherwise he waits it out
    u.prone -= dt;
    if (u.prone <= 0 || u.moveTo) {
      u.prone = 0;
      u.proneCd = rand(4, 6);
    } else {
      return; // pinned: no shooting, no grenades, no field work
    }
  }

  // the staked guns traverse and shoot, but never move
  if (u.t.atgun) {
    u.moveTo = null;
    updateATGun(u, dt);
    return;
  }
  if (u.t.aagun) {
    u.moveTo = null;
    updateAAGun(u, dt);
    return;
  }

  // a tank crew drives and fights at the same time
  if (u.t.tank) {
    if (u.moveTo) {
      const d = dist(u, u.moveTo);
      if (d < 4) {
        u.moveTo = null;
        u.face = vehicleHomeFace(u);
      } else {
        u.face = Math.atan2(u.moveTo.y - u.y, u.moveTo.x - u.x);
        const sp = unitSpeed(u);
        u.x += Math.cos(u.face) * sp * dt;
        u.y += Math.sin(u.face) * sp * dt;
      }
    }
    updateTankCombat(u, dt);
    return;
  }

  // the jeep's gunner keeps the .50 talking while the driver drives
  if (u.t.vehicle) {
    if (u.moveTo) {
      const d = dist(u, u.moveTo);
      if (d < 4) {
        u.moveTo = null;
        u.face = vehicleHomeFace(u);
      } else {
        const ang = Math.atan2(u.moveTo.y - u.y, u.moveTo.x - u.x);
        const sp = unitSpeed(u);
        u.x += Math.cos(ang) * sp * dt;
        u.y += Math.sin(ang) * sp * dt;
      }
    }
    const vt = nearestEnemyInRange(u, unitRange(u, u.t.range) * fogMult());
    runWeapon(u, vt, dt, unitBuffs(u));
    return;
  }

  if (u.moveTo) {
    const d = dist(u, u.moveTo);
    if (d < 4) {
      u.moveTo = null;
    } else {
      u.face = Math.atan2(u.moveTo.y - u.y, u.moveTo.x - u.x);
      const sp = unitSpeed(u);
      u.x += Math.cos(u.face) * sp * dt;
      u.y += Math.sin(u.face) * sp * dt;
      return; // no shooting while running
    }
  }

  if (u.t.flame) {
    const ft = nearestEnemyInRange(u, unitRange(u, u.t.flame.range) * fogMult());
    if (ft) {
      u.face = Math.atan2(ft.y - u.y, ft.x - u.x);
      flameSpray(u, dt);
    }
    return;
  }

  if (u.t.shotgun) {
    const sg = u.t.shotgun;
    const st = nearestEnemyInRange(u, unitRange(u, sg.range) * fogMult());
    const buffs = unitBuffs(u);
    if (st) u.face = Math.atan2(st.y - u.y, st.x - u.x);
    u.cd -= dt;
    if (st && u.cd <= 0) {
      fireShotgun(u, buffs);
      const cycle = u.t.rof * buffs.rofMult * rand(0.85, 1.15);
      if (G.cardsOwned && G.cardsOwned.has('extendedtube')) {
        u.shellsLeft = (u.shellsLeft == null ? EXTENDED_TUBE_SHELLS : u.shellsLeft) - 1;
        if (u.shellsLeft <= 0) { u.cd = cycle * 3; u.shellsLeft = EXTENDED_TUBE_SHELLS; }
        else u.cd = cycle * 0.25;
      } else {
        u.cd = cycle;
      }
    }
    return;
  }

  const buffs = unitBuffs(u);
  const range = unitRange(u, u.t.range) * fogMult();
  let target;
  if (u.type === 'sniper') target = sniperTarget(u, range);
  else target = nearestEnemyInRange(u, range);
  runWeapon(u, target, dt, buffs);

  if (u.t.grenade) {
    // quick reflexes: a live German stick grenade landed close enough to
    // scoop up and heave back before the fuse runs out. Grenades already
    // caught, or thrown by a friendly (kind 'frag'), are never eligible.
    for (const g of G.grenades) {
      if (g.by || g.caught || !g.landed || g.fuse < 0.6) continue;
      if (dist(u, { x: g.tx, y: g.ty }) > GRENADE_CATCH_RANGE) continue;
      g.caught = true;
      g.by = u;
      g.landed = false;
      g.t = 0;
      g.dur = 0.6;
      g.sx = u.x; g.sy = u.y;
      const back = nearestEnemyInRange(u, 260 * fogMult());
      const rx = back ? back.x : g.tx, ry = back ? back.y : g.ty - 160;
      const sc = 16;
      g.tx = rx + rand(-sc, sc);
      g.ty = ry + rand(-sc, sc);
      u.grenThrowT = 0.35;
      markCamoFired(u);
      SFX.grenadeToss();
      G.texts.push({ x: u.x, y: u.y - 18, text: 'THROWN BACK!', ttl: 1.6 });
      break;
    }

    u.grenCd -= dt;
    if (u.grenCd <= 0) {
      // never inside his own blast, never onto a danger-close buddy
      const gt = nearestEnemyInRange(u, 200 * (1 + (u.rank || 0) * 0.10) * fogMult(), e => dist(u, e) > 60);
      if (gt && !friendlyNearPoint(gt.x, gt.y, 55, u)) {
        // grenades are a rare, heavy punch — the carbine does the daily work.
        // Veterans throw more often, tighter and harder.
        u.grenCd = rand(9.6, 13.9) * (1 - u.rank * 0.08);
        u.grenThrowT = 0.35;
        markCamoFired(u);
        SFX.grenadeToss();
        const sc = 12 * (1 - u.rank * 0.08);
        G.grenades.push({
          x: u.x, y: u.y,
          tx: gt.x + rand(-sc, sc), ty: gt.y + rand(-sc, sc),
          t: 0, dur: 1.0, sx: u.x, sy: u.y, by: u,
          kind: 'frag',
          r: 46, dmg: 115 * (1 + u.rank * 0.05),
        });
      }
    }
  }

  if (u.t.rocket) {
    u.rocketCd -= dt;
    if (u.rocketCd <= 0) {
      const rk = u.t.rocket;
      const rr = unitRange(u, rk.range) * fogMult();
      // tanks first, then soft vehicles, infantry only when there is nothing
      // on wheels; never inside his own blast
      const safe = e => dist(u, e) > rk.r + 20;
      const rt = nearestEnemyInRange(u, rr, e => e.t.tank && safe(e)) ||
                 nearestEnemyInRange(u, rr, e => (e.t.vehicle || e.t.bike) && safe(e)) ||
                 nearestEnemyInRange(u, rr, safe);
      if (rt && !friendlyNearPoint(rt.x, rt.y, 40, u)) {
        // a veteran crew reloads faster and walks his shots in
        u.rocketCd = rand(rk.cdMin, rk.cdMax) * (1 - u.rank * 0.08);
        u.face = Math.atan2(rt.y - u.y, rt.x - u.x);
        markCamoFired(u);
        SFX.rocket();
        // rockets scatter badly with distance; a tank is a big, slow target
        const d = dist(u, rt);
        let scatter = 8 + d * 0.11;
        if (rt.t.tank) scatter *= 0.45;
        scatter = Math.max(6, scatter * (1 - u.rank * 0.08));
        const tx = rt.x + rand(-scatter, scatter), ty = rt.y + rand(-scatter, scatter);
        G.rockets.push({
          sx: u.x, sy: u.y, x: u.x, y: u.y, tx, ty,
          t: 0, dur: Math.max(dist(u, { x: tx, y: ty }) / rk.speed, 0.15),
          r: rk.r, dmg: rk.dmg * (1 + u.rank * 0.04), by: u,
          kind: 'rocket',
        });
      }
    }
  }

  if (u.t.mortar) {
    u.mortCd -= dt;
    if (u.mortCd <= 0) {
      const mt = u.t.mortar;
      const mr = unitRange(u, mt.range) * fogMult();
      const target = firstEnemyInRange(u, mr, e => dist(u, e) > mt.min);
      if (target && !friendlyNearPoint(target.x, target.y, 55, u)) {
        // veteran crews drop rounds faster, tighter and heavier
        u.mortCd = rand(mt.cdMin, mt.cdMax) * (1 - u.rank * 0.08);
        u.face = Math.atan2(target.y - u.y, target.x - u.x);
        u.mortarFireT = 0.18;
        markCamoFired(u);
        G.flashes.push({ x: u.x, y: u.y - 6, r: 5, ttl: 0.07, max: 0.07 });
        const sc = mt.scatter * (1 - u.rank * 0.08);
        scheduleShell(target.x + rand(-sc, sc), target.y + rand(-sc, sc),
          mt.flight, mt.r, mt.dmg * (1 + u.rank * 0.05), false, u);
      }
    }
  }

  if (u.type === 'medic') {
    u.healTick -= dt;
    if (u.healTick <= 0) {
      u.healTick = 0.4;
      let worst = null, frac = 1;
      for (const a of G.units) {
        // no field-dressing machines: medics treat men, not metal
        if (a.dead || a === u || a.t.tank || a.t.vehicle || a.t.gunEmplacement || a.hp >= a.maxhp) continue;
        if (dist(u, a) < MEDIC_RANGE) {
          const f = a.hp / a.maxhp;
          if (f < frac) { frac = f; worst = a; }
        }
      }
      if (worst) {
        // experienced medics work far faster — a MSG patches at ~3.4x the rate
        const amt = Math.min(worst.maxhp - worst.hp, 3 + u.rank * 1.2);
        worst.hp += amt;
        u.healed += amt;
        // 1 XP per 150 HP patched up — a slow road to sergeant
        if (u.healed >= 150) { u.healed -= 150; gainXP(u); }
        G.particles.push({ x: worst.x + rand(-6, 6), y: worst.y - 10, vx: 0, vy: -18, ttl: 0.5, grav: 0, size: 1.6, color: '#8fe08f' });
      }
    }
  }

  if (u.type === 'engineer') updateEngineer(u, dt);
}

// engineer work, one job at a time: repair emplacements, then repair
// damaged vehicles (slowly), then fortify an intact emplacement he's
// standing next to
function updateEngineer(u, dt) {
  u.healTick -= dt;
  if (u.healTick > 0) return;
  u.healTick = 0.4;
  const R = ENGINEER_RANGE;
  const repairMult = (G.cardsOwned && G.cardsOwned.has('greasemonkey')) ? 2 : 1;

  const sparks = (x, y) => {
    if (Math.random() < 0.5) SFX.hammer();
    for (let i = 0; i < 3; i++) {
      G.particles.push({
        x: x + rand(-8, 8), y: y + rand(-6, 6), vx: rand(-25, 25), vy: rand(-45, -10),
        ttl: rand(0.15, 0.35), grav: 240, size: 1.4,
        color: pick(['#ffd94a', '#ffefa0', '#c8b872']),
      });
    }
  };
  const credit = (amt) => {
    u.healed += amt;
    if (u.healed >= 150) { u.healed -= 150; gainXP(u); }
  };

  // 1) restack damaged sandbags / patch bunker concrete / restring damaged wire / brace the watch tower
  let emp = null, empFrac = 1;
  for (const s of [...G.sandbags, ...G.bunkers, ...G.wires, ...G.watchtowers, ...G.camoNests]) {
    if (s.hp >= s.maxhp || dist(u, s) > R) continue;
    const f = s.hp / s.maxhp;
    if (f < empFrac) { empFrac = f; emp = s; }
  }
  if (emp) {
    const amt = Math.min(emp.maxhp - emp.hp, (8 + u.rank * 2.7) * repairMult);
    emp.hp += amt;
    credit(amt * 0.5);
    sparks(emp.x, emp.y);
    return;
  }

  // 1.5) failing that, wrench on the most damaged vehicle or AT gun in range.
  // Armor and gun barrels are slow going by hand and barely teach a man
  // anything next to fortification work — a jeep, Sherman, or 57mm is
  // patched at a crawl.
  let veh = null, vehFrac = 1;
  for (const a of G.units) {
    if (a.dead || a === u || !(a.t.tank || a.t.vehicle || a.t.gunEmplacement) || a.hp >= a.maxhp) continue;
    if (dist(u, a) > R) continue;
    const f = a.hp / a.maxhp;
    if (f < vehFrac) { vehFrac = f; veh = a; }
  }
  if (veh) {
    const amt = Math.min(veh.maxhp - veh.hp, (0.25 + u.rank * 0.075) * 1.5 * repairMult);
    veh.hp += amt;
    credit(amt * 0.15);
    sparks(veh.x, veh.y);
    return;
  }

  // 2) fortify the nearest intact, un-upgraded emplacement (~6 s of work)
  let target = null, td = R;
  for (const s of [...G.sandbags, ...G.bunkers, ...G.wires, ...G.watchtowers, ...G.camoNests]) {
    if (s.up) continue;
    const d = dist(u, s);
    if (d < td) { td = d; target = s; }
  }
  if (target) {
    target.workProg += 0.4 * (1 + u.rank * 0.35);
    sparks(target.x, target.y);
    if (target.workProg >= 6) {
      target.up = true;
      // camo nests get double HP once fortified; everything else gets 1.5x
      target.maxhp = Math.round(target.maxhp * (target.fortifyMult || 1.5));
      target.hp = target.maxhp;
      gainXP(u); gainXP(u); // a fortification is worth two points of pride
      G.texts.push({ x: target.x, y: target.y - 16, text: 'FORTIFIED', ttl: 2.2 });
    }
  }
}

// ---- 57mm anti-tank gun: a dug-in direct-fire piece. It only answers to
// vehicles, and only inside the traverse cone its trails allow.
function updateATGun(u, dt) {
  const spec = u.t.atgun;
  const range = unitRange(u, u.t.range) * fogMult();
  const HOME = -Math.PI / 2;   // staked facing the German end of the field
  const arc = spec.arc + (u.rank || 0) * 0.05236;  // +3° per rank
  const inCone = e => inFireCone(u, e, HOME, arc);

  u.cd -= dt;

  // armor is the priority; soft vehicles after. Infantry is not this gun's job.
  const target =
    nearestEnemyInRange(u, range, e => e.t.tank && inCone(e)) ||
    nearestEnemyInRange(u, range, e => (e.t.vehicle || e.t.bike || e.t.v2) && inCone(e));

  if (!target) {
    // crank the tube back to center
    u.turret += clamp(angleDiff(HOME, u.turret), -0.7 * dt, 0.7 * dt);
    u.face = u.turret;
    return;
  }

  const want = Math.atan2(target.y - u.y, target.x - u.x);
  const diff = angleDiff(want, u.turret);
  u.turret += clamp(diff, -0.9 * dt, 0.9 * dt);
  u.face = u.turret;
  if (u.cd > 0 || Math.abs(diff) > 0.17) return;

  SFX.boom(false);
  u.atgunFireT = 0.16;
  G.flashes.push({
    x: u.x + Math.cos(u.turret) * 24, y: u.y + Math.sin(u.turret) * 24,
    r: 8, ttl: 0.07, max: 0.07,
  });
  // recoil kicks dust off the trails
  for (let i = 0; i < 4; i++) {
    G.particles.push({
      x: u.x + rand(-8, 8), y: u.y + rand(-4, 6), vx: rand(-30, 30), vy: rand(-40, -10),
      ttl: rand(0.2, 0.4), grav: 200, size: rand(1.2, 2.2),
      color: pick(['#6e6046', '#57492f', '#8a7a5a']),
    });
  }
  // AP shells drift at range; armor is a forgiving target but this isn't a laser
  const d = dist(u, target);
  let scatter = (24 + d * 0.11) * (1 - u.rank * 0.08);
  if (target.t.tank) scatter *= 0.80;
  else scatter *= 0.90;
  scatter = Math.max(11, scatter * 0.8 * (spec.scatterMult || 1));
  scheduleShell(
    target.x + rand(-scatter, scatter), target.y + rand(-scatter, scatter),
    0.45, spec.r, spec.shellDmg * (1 + u.rank * 0.06), false, u);
  u.cd = u.t.rof * (1 - u.rank * 0.08) * rand(0.85, 1.15);
}

// ---- 40mm anti-aircraft gun: the same staked mount as the 57mm, but the
// barrels only elevate. It answers to bombers first and to paratroopers still
// hanging under canopy second, and it cannot touch anything on the ground.
// Nothing it fires is guaranteed to connect: it throws a fused shell at where
// it thinks the target will be, and the burst hits whatever is actually there.
function updateAAGun(u, dt) {
  const spec = u.t.aagun;
  const range = unitRange(u, u.t.range) * fogMult();
  const HOME = -Math.PI / 2;   // staked facing north, where the raids come from
  const arc = spec.arc + (u.rank || 0) * 0.05236;  // +3° per rank, same as the AT gun
  const inRange = t => dist(u, t) <= range && inFireCone(u, t, HOME, arc);

  u.cd -= dt;

  // bombers are the reason this gun exists; a descending stick is a target of
  // opportunity while the raid isn't up
  let target = null, best = Infinity;
  for (const p of G.planes) {
    if (p.done || p.role !== 'bomber') continue;
    const d = dist(u, p);
    if (d < best && inRange(p)) { best = d; target = p; }
  }
  if (!target) {
    for (const e of G.enemies) {
      if (e.dead || !(e.chute > 0)) continue;
      const d = dist(u, e);
      if (d < best && inRange(e)) { best = d; target = e; }
    }
  }

  if (!target) {
    // barrels crank back to center
    u.turret += clamp(angleDiff(HOME, u.turret), -0.9 * dt, 0.9 * dt);
    u.face = u.turret;
    return;
  }

  const want = Math.atan2(target.y - u.y, target.x - u.x);
  const diff = angleDiff(want, u.turret);
  // a flak mount traverses faster than an AT gun — it has to
  u.turret += clamp(diff, -1.5 * dt, 1.5 * dt);
  u.face = u.turret;
  if (u.cd > 0 || Math.abs(diff) > 0.2) return;

  fireFlakBurst(u, target, spec, best);
  u.cd = u.t.rof * (1 - (u.rank || 0) * 0.08) * rand(0.85, 1.15);
}

function fireFlakBurst(u, target, spec, d) {
  SFX.boom(false);
  u.atgunFireT = 0.16;
  const mx = u.x + Math.cos(u.turret) * 20, my = u.y + Math.sin(u.turret) * 20;
  G.flashes.push({ x: mx, y: my, r: 7, ttl: 0.07, max: 0.07 });

  // lead the target over the shell's time of flight; a chuted man isn't going
  // anywhere, a bomber very much is
  const flight = Math.max(0.12, d / spec.shellSpeed);
  const tvx = target.vx || 0, tvy = target.vy || 0;
  // gunnery error grows with range and tightens with rank, but never vanishes
  const scatter = Math.max(9, (spec.scatter + d * 0.06) * (1 - (u.rank || 0) * 0.08));

  G.flak.push({
    x: target.x + tvx * flight + rand(-scatter, scatter),
    y: target.y + tvy * flight + rand(-scatter, scatter),
    sx: mx, sy: my,
    timer: flight, dur: flight,
    hitR: spec.hitR, dmg: spec.planeDmg,
    by: u, done: false,
  });
}

// the fuse runs out and the shell throws a ball of steel wherever it happens
// to be. Anything airborne inside that ball takes it — including chutes, which
// ground ordnance passes harmlessly underneath.
function burstFlak(f) {
  SFX.boom(false);
  G.flashes.push({ x: f.x, y: f.y, r: f.hitR * 0.8, ttl: 0.18, max: 0.18 });
  for (let i = 0; i < 12; i++) {
    const ang = rand(0, Math.PI * 2);
    G.particles.push({
      x: f.x, y: f.y,
      vx: Math.cos(ang) * rand(20, 90), vy: Math.sin(ang) * rand(20, 90),
      ttl: rand(0.5, 1.2), grav: 12, size: rand(1.4, 3),
      color: pick(['#4a4a44', '#6a6a62', '#8c8c84', '#2e2e2a']),
    });
  }

  for (const p of G.planes) {
    if (p.done || p.role !== 'bomber') continue;
    if (dist(p, f) > f.hitR) continue;
    p.hp -= f.dmg * rand(0.8, 1.2);
    for (let i = 0; i < 6; i++) {
      G.particles.push({
        x: p.x + rand(-8, 8), y: p.y + rand(-8, 8),
        vx: rand(-20, 20), vy: rand(-10, 30),
        ttl: rand(0.4, 0.9), grav: 40, size: rand(1.2, 2.4),
        color: pick(['#2a2318', '#4a3d28', '#6e6046']),
      });
    }
    if (p.hp <= 0) killBomber(p, f.by);
  }

  for (const e of G.enemies) {
    if (e.dead || !(e.chute > 0)) continue;
    if (dist(e, f) > f.hitR) continue;
    flakHitChute(e, f.by);
  }
}

// a man on silk has nothing to hide behind: a flak burst that finds him is
// almost always the end of it. This deliberately bypasses damageEnemy's chute
// guard — AA fire is the only thing on the field allowed through it.
function flakHitChute(e, by) {
  // occasionally he only catches a fragment and rides the rest of the way down
  if (Math.random() < 0.12) {
    e.hp -= rand(15, 30);
    bloodSplat(e.x, e.y, 4);
    if (e.hp > 0) return;
  }
  e.hp = 0;
  e.dead = true;
  e.chute = 0;   // canopy is gone; stop drawing him as a man still descending
  if (!isAssaultMode() && G.mode !== 'hitsquad') {
    G.kills++;
    earnTP(e.t.reward);
  }
  creditKill(by);
  bloodSplat(e.x, e.y, 10);
  spawnCorpse(e);
  // the collapsed canopy drifts down after him
  for (let i = 0; i < 9; i++) {
    G.particles.push({
      x: e.x + rand(-9, 9), y: e.y - rand(4, 16),
      vx: rand(-22, 22), vy: rand(10, 45),
      ttl: rand(0.9, 1.8), grav: -6, size: rand(1.8, 3.6),
      color: pick(['#c9c19a', '#b0a888', '#8a8668']),
    });
  }
  const si = G.selected.indexOf(e);
  if (si !== -1) G.selected.splice(si, 1);
}

// ---- shared tank gunnery: both sides alternate the main gun and coaxial MG,
// and keep shooting while the hull is moving

const TANK_SWAP_RELOAD = 2.0; // seconds between the cannon and the coax

function tankTargets(a) {
  const fog = fogMult();
  const cannonRange = unitRange(a, a.t.range) * fog;
  const mgRange = unitRange(a, a.t.mg.range) * fog;
  const cone = a.t.fireCone;
  const inCone = e => !cone || inFireCone(a, e, a.turret, cone.arc);
  if (a.side === 'us') {
    return {
      // enemy armor is the cannon's priority target, inside the turret arc
      cannon: nearestEnemyInRange(a, cannonRange, e => e.t.tank && inCone(e)) ||
              nearestEnemyInRange(a, cannonRange, inCone),
      mg: nearestEnemyInRange(a, mgRange, e => !e.t.tank && inCone(e)),
    };
  }
  return {
    cannon: nearestUnitInRange(a, cannonRange, inCone),
    mg: nearestUnitInRange(a, mgRange, u2 => !u2.t.tank && inCone(u2)),
  };
}

// one fixed beat between the two weapons: whatever just fired, the crew needs
// two seconds before the other one speaks. A veteran Sherman crew shaves it.
function tankReload(a) {
  return TANK_SWAP_RELOAD * (1 - (a.rank || 0) * 0.08);
}

function updateTankCombat(a, dt) {
  if (!a.wpn) a.wpn = 'cannon';
  a.cd -= dt;
  const mgSpec = a.t.mg;
  const TURRET_TRACK = 0.18; // rad/s — glacial traverse onto new targets
  const TURRET_HOME = 0.14;

  // an MG burst in progress finishes before anything else
  if (a.burstLeft > 0) {
    a.burstTimer -= dt;
    if (a.burstTimer <= 0) {
      const cone = a.t.fireCone;
      const inCone = t => !cone || inFireCone(a, t, a.turret, cone.arc);
      if (a.mgTarget && !a.mgTarget.dead && inCone(a.mgTarget)) {
        // a veteran crew keeps the coax on target too
        const r = a.rank || 0;
        fireShot(a, a.mgTarget, { weapon: mgSpec, accBonus: r * 0.08, dmgMult: 1 + r * 0.04 });
      }
      a.burstLeft--;
      a.burstTimer = mgSpec.burstGap;
      if (a.burstLeft <= 0) {
        a.wpn = 'cannon';
        a.cd = tankReload(a);
      }
    }
    return;
  }

  const targets = tankTargets(a);
  // nothing for the weapon whose turn it is: the other one may take the shot,
  // but only once the swap reload has run out — the turn never gets skipped
  // early, so the tank can't lean on the cannon alone
  if (!targets[a.wpn] && a.cd <= 0) {
    const other = a.wpn === 'cannon' ? 'mg' : 'cannon';
    if (targets[other]) a.wpn = other;
  }
  const target = targets[a.wpn];
  // mid-reload the turret still follows whatever is out there, so the swap
  // isn't spent traversing from the parked heading
  const aim = target || targets[a.wpn === 'cannon' ? 'mg' : 'cannon'];

  if (!aim) {
    // park the turret facing the enemy side of the field
    const home = a.side === 'us' ? -Math.PI / 2 : Math.PI / 2;
    a.turret += clamp(angleDiff(home, a.turret), -TURRET_HOME * dt, TURRET_HOME * dt);
    return;
  }

  const want = Math.atan2(aim.y - a.y, aim.x - a.x);
  const diff = angleDiff(want, a.turret);
  a.turret += clamp(diff, -TURRET_TRACK * dt, TURRET_TRACK * dt);
  if (!target || a.cd > 0 || Math.abs(diff) > 0.15) return;

  if (a.wpn === 'cannon') {
    SFX.boom(false);
    G.flashes.push({
      x: a.x + Math.cos(a.turret) * 26, y: a.y + Math.sin(a.turret) * 26,
      r: 9, ttl: 0.08, max: 0.08,
    });
    const d = dist(a, target);
    // a veteran gunner lays shells on the mark and hits harder
    const scatter = Math.max(18, 16 + d * 0.055) * (1 - (a.rank || 0) * 0.08);
    scheduleShell(target.x + rand(-scatter, scatter), target.y + rand(-scatter, scatter),
      0.7, 45, a.t.shellDmg * (1 + (a.rank || 0) * 0.06), false, a);
    a.wpn = 'mg';
    a.cd = tankReload(a);
  } else {
    a.burstLeft = mgSpec.burst;
    a.burstTimer = 0;
    a.mgTarget = target;
  }
}
