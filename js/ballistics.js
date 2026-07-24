/* Trenchworks: WW2 — ballistics: physical projectiles with a height axis.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html.

   Every small-arms round and direct-fire shell is an entry in G.bullets flying
   a straight 3D line from muzzle to aim point at BULLET_SPEED-class velocity.
   Each tick the segment it swept is tested — in order of first contact —
   against the ground plane (z 0), the cover walls in COVER_PROFILE, and every
   body on the field regardless of side. The fire-time to-hit roll (fireShot)
   only chooses the aim point, so open-field accuracy is unchanged from the old
   hitscan model; what the round does on the way there is pure geometry. */
'use strict';

// first entry of segment (x1,y1)->(x2,y2) into the circle at (cx,cy), as a
// fraction t of the segment, or -1. A start inside the circle reports t 0.
function segCircleT(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1;
  const fx = x1 - cx, fy = y1 - cy;
  if (fx * fx + fy * fy <= r * r) return 0;
  const a = dx * dx + dy * dy;
  if (a === 0) return -1;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return -1;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return (t >= 0 && t <= 1) ? t : -1;
}

// slab test: first entry of the segment into the AABB centered (cx,cy) with
// half extents hx,hy, or -1. A start inside the box reports t 0.
function segAABBT(x1, y1, x2, y2, cx, cy, hx, hy) {
  const dx = x2 - x1, dy = y2 - y1;
  let t0 = 0, t1 = 1;
  for (const [p, d, c, h] of [[x1, dx, cx, hx], [y1, dy, cy, hy]]) {
    if (d === 0) {
      if (p < c - h || p > c + h) return -1;
    } else {
      let tA = (c - h - p) / d, tB = (c + h - p) / d;
      if (tA > tB) { const tmp = tA; tA = tB; tB = tmp; }
      if (tA > t0) t0 = tA;
      if (tB < t1) t1 = tB;
      if (t0 > t1) return -1;
    }
  }
  return t0;
}

// collision silhouette: 2D radius + height of the body standing at (x, y)
function actorProfile(a) {
  const t = a.t || {};
  if (t.tank) return { r: 16, h: 14 };
  if (t.apc) return { r: 14, h: 12 };
  if (t.v2) return { r: 14, h: 20 };
  if (t.vehicle || t.bike) return { r: 12, h: 10 };
  if (t.gunEmplacement) return { r: 10, h: 8 };
  if (t.big || t.boss) return { r: 9, h: 12 };
  if (t.hound) return { r: 6, h: 5 };
  if (t.crawler) return { r: 6, h: 3 };
  if (a.prone > 0) return { r: 7, h: 2.5 };
  return { r: 7, h: 9 };
}

function muzzleZ(shooter) {
  const t = shooter.t || {};
  if (t.tank) return 11;
  if (t.apc) return 12;
  if (t.vehicle || t.bike) return 10;
  return 6;
}

// cover objects whose parapet the shooter is standing at — his own wall never
// stops his fire (muzzle pokes over it), matching the old cover-use radii
function coverExemptFor(shooter) {
  let ex = null;
  for (const key in COVER_PROFILE) {
    const cp = COVER_PROFILE[key];
    const r2 = cp.fireOverR * cp.fireOverR;
    for (const o of G[key]) {
      if (o.hp > 0 && dist2(o, shooter) < r2) (ex || (ex = [])).push(o);
    }
  }
  return ex;
}

// earliest cover wall crossed by the 3D segment, honoring exemptions.
// Returns { t, obj, key, tier } or null. Bunker slit passes are NOT rolled
// here — the caller decides (bullets roll and remember, LOS checks treat the
// slit face as worth shooting at).
function coverHitAlong(x1, y1, z1, x2, y2, z2, exempt) {
  let best = null;
  for (const key in COVER_PROFILE) {
    const cp = COVER_PROFILE[key];
    for (const o of G[key]) {
      if (o.hp <= 0) continue;
      if (exempt && exempt.indexOf(o) !== -1) continue;
      const t = segAABBT(x1, y1, x2, y2, o.x, o.y, cp.hx, cp.hy);
      if (t < 0 || (best && t >= best.t)) continue;
      const tier = o.up2 ? 2 : o.up ? 1 : 0;
      if (z1 + (z2 - z1) * t >= cp.h[tier]) continue;   // clears the wall
      best = { t, obj: o, key, tier };
    }
  }
  return best;
}

// ---- spawning ---------------------------------------------------------------

function spawnBullet(shooter, target, t, opts, aim) {
  const mx = shooter.x + Math.cos(shooter.face) * (t.gun + 3);
  const my = shooter.y + Math.sin(shooter.face) * (t.gun + 3);
  const mz = muzzleZ(shooter);
  const dx = aim.x - mx, dy = aim.y - my, dz = aim.z - mz;
  const d3 = Math.hypot(dx, dy, dz) || 1;
  const sp = BULLET_SPEED / d3;
  G.bullets.push({
    x: mx, y: my, z: mz, px: mx, py: my, pz: mz,
    vx: dx * sp, vy: dy * sp, vz: dz * sp,
    dist: 0, maxDist: d3 + rand(60, 140),
    by: shooter, side: shooter.side, weapon: t,
    dmg: t.dmg * rand(0.75, 1.25) * (opts && opts.dmgMult ? opts.dmgMult : 1),
    target, sureHit: !!(opts && opts.sureHit), shell: null,
    fromBar: shooter.type === 'gunner',
    exempt: coverExemptFor(shooter), missed: null, done: false,
  });
}

// direct-fire HE (tank cannon, AT gun, leveled 40mm): a fat slow bullet that
// explodes on WHATEVER ends its flight — cover wall, hull, dirt, or simply
// arriving where it was aimed
function fireDirectShell(shooter, tx, ty, spec) {
  const bearing = shooter.turret != null ? shooter.turret
    : Math.atan2(ty - shooter.y, tx - shooter.x);
  const mx = shooter.x + Math.cos(bearing) * 24;
  const my = shooter.y + Math.sin(bearing) * 24;
  const mz = shooter.t && shooter.t.gunEmplacement ? 6 : 12;
  const dx = tx - mx, dy = ty - my, dz = 2 - mz;
  const d3 = Math.hypot(dx, dy, dz) || 1;
  const sp = spec.speed / d3;
  G.bullets.push({
    x: mx, y: my, z: mz, px: mx, py: my, pz: mz,
    vx: dx * sp, vy: dy * sp, vz: dz * sp,
    dist: 0, maxDist: d3 + 20,
    by: shooter, side: shooter.side, weapon: shooter.t,
    dmg: 0, target: null, sureHit: false,
    shell: { r: spec.r, dmg: spec.dmg, big: !!spec.big },
    fromBar: false, exempt: coverExemptFor(shooter), missed: null, done: false,
  });
}

// ---- impact -----------------------------------------------------------------

// watch tower spotters call incoming fire: the old flat 10% dodge survives as
// concealment — the round is talked into the dirt at the victim's feet
function spotterDodge(victim) {
  if (victim.side !== 'us' || !victim.t || victim.t.tank || victim.t.vehicle) return false;
  for (const wt of G.watchtowers) {
    if (wt.hp > 0 && dist2(wt, victim) < WATCHTOWER_AURA * WATCHTOWER_AURA) {
      if (Math.random() < 0.1) { wt.hp -= 3; return true; }
    }
  }
  return false;
}

function resolveBulletHit(b, victim) {
  if (!b.sureHit && spotterDodge(victim)) {
    G.particles.push({ x: victim.x + rand(-6, 6), y: victim.y + 4, vx: rand(-25, 25), vy: rand(-55, -20), ttl: 0.3, grav: 200, size: 1.3, color: '#6e6046' });
    return;
  }
  let dmg = b.dmg;
  if (victim.t && victim.t.tank) dmg *= 0.04;   // rifle rounds ping off armor
  else if (victim.t && victim.t.apc) dmg *= 0.3; // halftrack plate shrugs off most of it
  dmg *= armorPiercingMult(b.by, victim);
  if (victim.isDummy || victim.side === 'us') damageUnit(victim, dmg, b.by, 'bullet');
  else damageEnemy(victim, dmg, b.by, 'bullet');
}

function bulletGroundPuff(x, y) {
  G.particles.push({ x, y, vx: rand(-15, 15), vy: rand(-50, -10), ttl: 0.25, grav: 200, size: 1.2, color: '#6e6046' });
}

function bulletCoverPuff(x, y) {
  G.particles.push({ x, y, vx: rand(-20, 20), vy: -40, ttl: 0.3, grav: 150, size: 1.5, color: '#b8a878' });
}

// ---- flight -----------------------------------------------------------------

function updateBullets(dt) {
  for (const b of G.bullets) {
    if (b.done) continue;

    // Crack Shot: a called sure round — it ignores everything on the way and
    // homes onto its mark, exactly the guarantee the card sells
    if (b.sureHit) {
      const tg = b.target;
      if (!tg || tg.dead) { b.done = true; continue; }
      const dx = tg.x - b.x, dy = tg.y - b.y;
      const d = Math.hypot(dx, dy);
      const step = BULLET_SPEED * dt;
      if (d <= step) { resolveBulletHit(b, tg); b.done = true; continue; }
      b.px = b.x; b.py = b.y; b.pz = b.z;
      b.vx = dx / d * BULLET_SPEED; b.vy = dy / d * BULLET_SPEED;
      b.x += b.vx * dt; b.y += b.vy * dt;
      continue;
    }

    b.px = b.x; b.py = b.y; b.pz = b.z;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    const step = Math.hypot(b.x - b.px, b.y - b.py, b.z - b.pz);
    b.dist += step;

    // sweep the segment this tick covered; a threaded bunker slit re-runs the
    // sweep with that bunker exempted (it happens at most once or twice)
    let guard = 4;
    while (guard-- > 0 && !b.done) {
      // ground
      let tHit = Infinity, hitKind = null, hitObj = null;
      if (b.pz > 0 && b.z <= 0) { tHit = b.pz / (b.pz - b.z); hitKind = 'ground'; }
      else if (b.pz <= 0 && b.z <= 0) { tHit = 0; hitKind = 'ground'; }

      // cover walls
      const cv = coverHitAlong(b.px, b.py, b.pz, b.x, b.y, b.z, b.exempt);
      if (cv && cv.t < tHit) { tHit = cv.t; hitKind = 'cover'; hitObj = cv; }

      // bodies — either side; the round doesn't care whose it is
      const midX = (b.px + b.x) / 2, midY = (b.py + b.y) / 2;
      const reach = step / 2 + 24;
      const sweep = (list) => {
        for (const a of list) {
          if (a === b.by || a.dead || a.chute > 0 || a.y < 0) continue;
          if (a.isDummy && a.hp <= 0) continue;
          if (b.missed && b.missed.has(a)) continue;
          const ddx = a.x - midX, ddy = a.y - midY;
          if (ddx * ddx + ddy * ddy > reach * reach) continue;
          const p = actorProfile(a);
          const r = p.r + (a === b.target ? BULLET_INTENT_R_BONUS : 0);
          const t = segCircleT(b.px, b.py, b.x, b.y, a.x, a.y, r);
          if (t < 0 || t >= tHit) continue;
          const zAt = b.pz + (b.z - b.pz) * t;
          if (zAt < 0 || zAt > p.h) continue;
          // a prone silhouette is barely there: flat per-round dodge, rolled
          // once per bullet-and-man, and remembered so it can't re-roll
          if (!b.shell && a.prone > 0 && Math.random() < PRONE_BULLET_DODGE) {
            (b.missed || (b.missed = new Set())).add(a);
            bulletGroundPuff(a.x + rand(-6, 6), a.y + 4);
            continue;
          }
          tHit = t; hitKind = 'actor'; hitObj = a;
        }
      };
      sweep(G.units);
      sweep(G.enemies);
      sweep(G.dummies);

      if (hitKind === 'cover' && hitObj.key === 'bunkers' && b.vy > 0
          && Math.random() < BUNKER_SLIT_PASS[hitObj.tier]) {
        // threaded the firing slit — fly on, and never re-test this bunker
        (b.exempt || (b.exempt = [])).push(hitObj.obj);
        continue;
      }

      if (hitKind === 'ground') {
        b.done = true;
        bulletGroundPuff(b.px + (b.x - b.px) * tHit, b.py + (b.y - b.py) * tHit);
        if (b.shell) explode(b.px + (b.x - b.px) * tHit, b.py + (b.y - b.py) * tHit,
          b.shell.r, b.shell.dmg, b.shell.big, b.by);
      } else if (hitKind === 'cover') {
        b.done = true;
        const hx = b.px + (b.x - b.px) * tHit, hy = b.py + (b.y - b.py) * tHit;
        if (b.shell) {
          explode(hx, hy, b.shell.r, b.shell.dmg, b.shell.big, b.by);
        } else {
          const cp = COVER_PROFILE[hitObj.key];
          hitObj.obj.hp -= cp.chip[hitObj.tier];
          bulletCoverPuff(hx, hy);
        }
      } else if (hitKind === 'actor') {
        b.done = true;
        if (b.shell) explode(hitObj.x, hitObj.y, b.shell.r, b.shell.dmg, b.shell.big, b.by);
        else resolveBulletHit(b, hitObj);
      }
      break;
    }
    if (b.done) continue;

    // spent, or gone off the field
    if (b.dist >= b.maxDist || b.x < -20 || b.x > W + 20 || b.y < -40 || b.y > H + 40) {
      b.done = true;
      // a spent direct-fire shell still lands SOMEWHERE
      if (b.shell) explode(b.x, b.y, b.shell.r, b.shell.dmg, b.shell.big, b.by);
    }
  }
}

// ---- AI trigger discipline ----------------------------------------------------

// true when the fire line from shooter to target crosses no living, standing
// friend. Cover is NOT checked: shooting into a wall is a legitimate choice —
// it chips the wall down — but shooting through your own man is not.
function shotClear(shooter, target) {
  const friends = shooter.side === 'us' ? G.units : G.enemies;
  const mz = muzzleZ(shooter);
  const tp = actorProfile(target);
  const tz = tp.h * 0.55;
  const x1 = shooter.x, y1 = shooter.y, x2 = target.x, y2 = target.y;
  for (const f of friends) {
    if (f === shooter || f === target || f.dead || f.prone > 0 || f.chute > 0 || f.y < 0) continue;
    const p = actorProfile(f);
    const t = segCircleT(x1, y1, x2, y2, f.x, f.y, p.r);
    if (t < 0) continue;
    const zAt = mz + (tz - mz) * t;
    if (zAt >= 0 && zAt <= p.h) return false;
  }
  return true;
}

// a blocked shooter holds fire and shops for a different mark for a moment
function markShotBlocked(actor, target) {
  actor._losSkip = target;
  actor._losSkipUntil = G.time + LOS_SKIP_TTL;
  actor._tgt = null;
  actor._tgtUntil = 0;
  actor.cd = Math.max(actor.cd, 0.25);
}
