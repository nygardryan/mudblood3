/* Mud & Blood — shooting.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

function fogMult() { return G.fog > 0 ? 0.6 : 1; }

// infantry under fire hit the dirt: prone men can't shoot but dodge 60% of
// incoming rounds. Veterans get back up fast; green troops stay down a while.
function tryGoProne(u, chance) {
  if (!u || u.dead || !u.t || u.chute > 0) return;
  if (u.t.tank || u.t.vehicle || u.t.apc || u.t.bike || u.t.fixed) return;   // crews don't dive
  if (u.prone > 0 || u.proneCd > 0 || u.moveTo) return;          // running men keep running
  if (Math.random() >= chance) return;
  const rank = u.rank || 0;   // Germans carry no rank and eat dirt the longest
  u.prone = rand(2.5, 4.5) * (1 - rank * 0.15);
}

function coverBlock(target) {
  // friendly units near sandbags dodge some incoming fire (vehicles don't duck)
  if (target.side !== 'us' || target.t.tank || target.t.vehicle) return false;
  // bunker walls first: they stop more fire and barely notice small arms
  for (const b of G.bunkers) {
    if (b.hp > 0 && dist(b, target) < (b.up2 ? 38 : b.up ? 34 : 30)) {
      if (Math.random() < (b.up2 ? 0.92 : b.up ? 0.85 : 0.75)) { b.hp -= b.up ? 1 : 2; return true; }
    }
  }
  for (const s of G.sandbags) {
    // fortified bags stop more and shrug off hits better; hardened, more still
    if (s.hp > 0 && dist(s, target) < (s.up2 ? 33 : s.up ? 30 : 26)) {
      if (Math.random() < (s.up2 ? 0.78 : s.up ? 0.65 : 0.5)) { s.hp -= s.up2 ? 2 : s.up ? 3 : 4; return true; }
    }
  }
  // watch tower: spotters call out incoming fire, a flat 10% dodge for anyone under it
  for (const wt of G.watchtowers) {
    if (wt.hp > 0 && dist(wt, target) < WATCHTOWER_AURA) {
      if (Math.random() < 0.1) { wt.hp -= 3; return true; }
    }
  }
  return false;
}

// camo nest: allied infantry standing in its zone are invisible to enemy
// targeting until they open fire, then stay exposed for a few seconds after
// their last shot. Vehicles and fixed guns are too big to hide in one.
function camoNestAt(u) {
  for (const cn of G.camoNests) {
    if (cn.hp > 0 && dist(cn, u) < CAMONEST_ZONE) return cn;
  }
  return null;
}

function isCamouflaged(u) {
  if (u.side !== 'us' || u.dead || u.t.tank || u.t.vehicle || u.t.apc || u.t.bike || u.t.gunEmplacement) return false;
  if (u.camoExposed > 0) return false;
  return !!camoNestAt(u);
}

function markCamoFired(u) {
  if (u.side !== 'us') return;
  const cn = camoNestAt(u);
  if (cn) u.camoExposed = cn.up2 ? CAMONEST_REVEAL_HARDENED
    : cn.up ? CAMONEST_REVEAL_FORTIFIED : CAMONEST_REVEAL;
}

function fireShot(shooter, target, opts) {
  // opts.weapon substitutes different gun stats (e.g. a tank's coaxial MG)
  const t = (opts && opts.weapon) || shooter.t;
  shooter.face = Math.atan2(target.y - shooter.y, target.x - shooter.x);
  markCamoFired(shooter);
  const mx = shooter.x + Math.cos(shooter.face) * (t.gun + 3);
  const my = shooter.y + Math.sin(shooter.face) * (t.gun + 3);
  SFX[t.sfx]();
  G.flashes.push({ x: mx, y: my, r: 5, ttl: 0.05, max: 0.05 });

  let acc = t.acc * (opts && opts.accBonus ? 1 + opts.accBonus : 1);
  const d = dist(shooter, target);
  acc *= clamp(1.15 - d / (unitRange(shooter, t.range) * 1.6), 0.35, 1);

  // card hooks (US shooters in endless only): Zeroed In lifts the base to-hit
  // before the roll; beforeShot may force a hit; afterShot sees the final
  // result. A lifted roll (accMult) still rolls prone-dodge and cover below —
  // it models the shooter's aim, not a promise. A beforeShot-forced hit is a
  // called sure shot (Crack Shot): it connects for real, so it skips the
  // prone-dodge and cover rolls that would otherwise eat the guaranteed round.
  const cardHooks = shooter.side === 'us' && G.cardHooks ? G.cardHooks[shooter.type] : null;
  if (cardHooks && cardHooks.accMult !== 1) acc = Math.min(0.98, acc * cardHooks.accMult);

  let hx = target.x, hy = target.y;
  let hit = Math.random() < acc;
  let forced = false;
  if (cardHooks) {
    for (const fn of cardHooks.beforeShot) if (fn(shooter)) { hit = true; forced = true; }
    for (const fn of cardHooks.afterShot) fn(shooter, hit);
  }
  if (!hit) { hx += rand(-22, 22); hy += rand(-16, 22); }

  G.tracers.push({
    x1: mx, y1: my, x2: hx, y2: hy, ttl: 0.06,
    fromBar: shooter.type === 'gunner',
  });

  if (hit) {
    // a prone man is a small target: 60% of rounds kick dirt over him.
    // Rolled separately from sandbag cover, so the two stack multiplicatively.
    // A forced sure shot (Crack Shot) ignores both — it is guaranteed to land.
    if (!forced && target.prone > 0 && Math.random() < 0.6) {
      G.particles.push({ x: hx + rand(-6, 6), y: hy + 4, vx: rand(-25, 25), vy: rand(-55, -20), ttl: 0.3, grav: 200, size: 1.3, color: '#6e6046' });
      return;
    }
    if (!forced && coverBlock(target)) {
      G.particles.push({ x: hx, y: hy + 6, vx: rand(-20, 20), vy: -40, ttl: 0.3, grav: 150, size: 1.5, color: '#b8a878' });
      return;
    }
    let dmg = t.dmg * rand(0.75, 1.25) * (opts && opts.dmgMult ? opts.dmgMult : 1);
    if (target.t && target.t.tank) dmg *= 0.04;   // rifle rounds ping off armor
    else if (target.t && target.t.apc) dmg *= 0.3; // halftrack plate shrugs off most of it
    if (target.side === 'us') damageUnit(target, dmg, shooter);
    else damageEnemy(target, dmg, shooter);
  } else {
    G.particles.push({ x: hx, y: hy, vx: rand(-15, 15), vy: rand(-50, -10), ttl: 0.25, grav: 200, size: 1.2, color: '#6e6046' });
    // a near miss is warning enough to hit the dirt
    tryGoProne(target, 0.4);
  }
}

// generic weapon logic shared by both sides
function runWeapon(actor, target, dt, buffs) {
  const t = actor.t;
  const rofMult = buffs && buffs.rofMult ? buffs.rofMult : 1;
  actor.cd -= dt;
  if (actor.burstLeft > 0) {
    actor.burstTimer -= dt;
    if (actor.burstTimer <= 0) {
      if (target) fireShot(actor, target, buffs);
      actor.burstLeft--;
      // veteran automatic gunners hold tighter, faster bursts too
      actor.burstTimer = t.burstGap * rofMult;
    }
    return;
  }
  if (target && actor.cd <= 0) {
    actor.cd = t.rof * rofMult * rand(0.85, 1.15);
    if (t.burst > 1) {
      actor.burstLeft = t.burst;
      actor.burstTimer = 0;
    } else {
      fireShot(actor, target, buffs);
    }
  }
}
