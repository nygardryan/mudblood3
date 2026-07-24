/* Trenchworks: WW2 — shooting.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

function fogMult() { return G.fog > 0 ? 0.6 : 1; }

// Brave uniques: a shotgunner (Point Blank) or flamer (Trial by Fire) with an
// enemy inside his own weapon's reach stands and fires rather than diving — a
// prone man of either can't use his short-range weapon, so ducking would just
// let the enemy close. Player units only, and only the type the card is tied to.
function braveStandsFast(u) {
  if (u.side !== 'us' || !G.cardsOwned) return false;
  const t = u.t;
  if (t.shotgun && G.cardsOwned.has('pointblank')) {
    const slug = G.cardsOwned.has('rifledslugs');
    return !!nearestEnemyInRange(u, unitRange(u, t.shotgun.range) * (slug ? 1.6 : 1));
  }
  if (t.flame && G.cardsOwned.has('trialbyfire')) {
    return !!nearestEnemyInRange(u, unitRange(u, t.flame.range));
  }
  return false;
}

// infantry under fire hit the dirt: prone men can't shoot but dodge 60% of
// incoming rounds. Veterans get back up fast; green troops stay down a while.
function tryGoProne(u, chance) {
  if (!u || u.dead || !u.t || u.chute > 0) return;
  if (u.t.tank || u.t.vehicle || u.t.apc || u.t.bike || u.t.fixed) return;   // crews don't dive
  // Japanese infantry are fanatics: they never hit the dirt. Standing tall
  // costs them — but it means they never stall, they only close the distance.
  if (u.t.faction === 'jp') return;
  if (u.prone > 0 || u.proneCd > 0 || u.moveTo) return;          // running men keep running
  if (braveStandsFast(u)) return;                                // brave-card men hold their ground
  if (Math.random() >= chance) return;
  const rank = u.rank || 0;   // Germans carry no rank and eat dirt the longest
  u.prone = rand(2.5, 4.5) * (1 - rank * 0.15);
}

// cover is geometric now: rounds are physical (js/ballistics.js) and a wall
// only stops what actually crosses it. The old proximity-dodge coverBlock is
// gone; the watch tower's spotter dodge lives on in spotterDodge (ballistics).

// camo nest: allied infantry standing in its zone are invisible to enemy
// targeting until they open fire, then stay exposed for a few seconds after
// their last shot. Vehicles and fixed guns are too big to hide in one.
function camoNestAt(u) {
  for (const cn of G.camoNests) {
    if (cn.hp > 0 && dist2(cn, u) < CAMONEST_ZONE * CAMONEST_ZONE) return cn;
  }
  return null;
}

// isCamouflaged runs per enemy-vs-unit pair in targeting plus once per unit
// per draw, so the nest lookup rides the same 0.4s cache as the officer aura
// (G.buffFrame). camoExposed and nest HP stay live, so opening fire or losing
// the nest still reveals the man instantly.
function isCamouflaged(u) {
  if (u.side !== 'us' || u.dead || u.t.tank || u.t.vehicle || u.t.apc || u.t.bike || u.t.gunEmplacement) return false;
  if (u.camoExposed > 0) return false;
  const bf = G.buffFrame || 0;
  if (u._camoFrame !== bf) {
    u._camoFrame = bf;
    u._camoNest = camoNestAt(u);
  }
  const cn = u._camoNest;
  return !!(cn && cn.hp > 0);
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
  G.flashes.push({ x: mx, y: my, r: 6, ttl: 0.07, max: 0.07, kind: 'muzzle', angle: shooter.face });

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

  let hit = Math.random() < acc;
  let forced = false;
  if (cardHooks) {
    for (const fn of cardHooks.beforeShot) if (fn(shooter)) { hit = true; forced = true; }
    for (const fn of cardHooks.afterShot) fn(shooter, hit);
  }

  // The roll picks the AIM POINT; the round itself is a physical projectile
  // (js/ballistics.js) that flies there and hits whatever crosses it first —
  // cover walls, the ground, or any body on either side.
  const tp = actorProfile(target);
  let aim;
  if (hit) {
    aim = { x: target.x, y: target.y, z: tp.h * 0.55 };
  } else {
    // a missed round still goes SOMEWHERE: off to one side, and either short
    // into the dirt (or the sandbags) in front of the mark, or long over it
    const ang = shooter.face;
    const perpX = -Math.sin(ang), perpY = Math.cos(ang);
    const lat = rand(9, 24) * (Math.random() < 0.5 ? -1 : 1);
    if (Math.random() < 0.5) {
      const f = rand(0.75, 0.95);
      aim = {
        x: shooter.x + (target.x - shooter.x) * f + perpX * lat,
        y: shooter.y + (target.y - shooter.y) * f + perpY * lat,
        z: 0,
      };
    } else {
      aim = { x: target.x + perpX * lat, y: target.y + perpY * lat, z: tp.h + rand(4, 16) };
    }
    // a near miss is warning enough to hit the dirt
    tryGoProne(target, 0.4);
  }
  spawnBullet(shooter, target, t, {
    dmgMult: opts && opts.dmgMult, sureHit: forced,
  }, aim);
}

// generic weapon logic shared by both sides
function runWeapon(actor, target, dt, buffs) {
  const t = actor.t;
  const rofMult = buffs && buffs.rofMult ? buffs.rofMult : 1;
  actor.cd -= dt;
  if (actor.burstLeft > 0) {
    actor.burstTimer -= dt;
    if (actor.burstTimer <= 0) {
      // mid-burst a friend may wander into the line: swallow that round
      if (target && shotClear(actor, target)) fireShot(actor, target, buffs);
      actor.burstLeft--;
      // veteran automatic gunners hold tighter, faster bursts too
      actor.burstTimer = t.burstGap * rofMult;
    }
    return;
  }
  if (target && actor.cd <= 0) {
    // trigger discipline: nobody deliberately fires through his own men.
    // A blocked shooter holds and shops for another mark for a moment.
    if (!shotClear(actor, target)) { markShotBlocked(actor, target); return; }
    actor.cd = t.rof * rofMult * rand(0.85, 1.15);
    if (t.burst > 1) {
      actor.burstLeft = t.burst;
      actor.burstTimer = 0;
    } else {
      fireShot(actor, target, buffs);
    }
  }
}

// one tick of flame from `actor` toward its facing: burns EVERYTHING in the
// cone regardless of side — that's the deal you make with a flamethrower
// opts lets a non-flamer actor drive the stream: the Flame Tank passes its own
// flame spec, aims down the turret bearing, and offsets the nozzle to the
// barrel tip. Default behaviour (the M2 flamer) reads t.flame and faces face.
function flameSpray(actor, dt, opts) {
  const fl = (opts && opts.flame) || actor.t.flame;
  const bearing = (opts && opts.bearing !== undefined) ? opts.bearing : actor.face;
  const originDist = (opts && opts.originDist !== undefined) ? opts.originDist : actor.t.gun + 1.5;
  // fog shortens the stream the same way it shortens acquisition and the
  // drawn cone — otherwise men burn out past where the flame is rendered
  const range = unitRange(actor, fl.range) * fogMult();

  actor.flameT = 0.15;
  markCamoFired(actor);
  actor.flameSfx = (actor.flameSfx || 0) - dt;
  if (actor.flameSfx <= 0) { actor.flameSfx = 0.4; SFX.flame(); }

  const nx = actor.x + Math.cos(bearing) * originDist;
  const ny = actor.y + Math.sin(bearing) * originDist;
  if (Math.random() < 0.35) {
    G.flashes.push({ x: nx, y: ny, r: rand(5, 9), ttl: 0.06, max: 0.06 });
  }

  // roiling fire particles along the cone
  for (let i = 0; i < 9; i++) {
    const a = bearing + rand(-fl.arc, fl.arc) * 0.85;
    const d = rand(8, range * 0.95);
    const ttl = rand(0.12, 0.42);
    G.particles.push({
      x: actor.x + Math.cos(a) * d, y: actor.y + Math.sin(a) * d,
      vx: Math.cos(a) * rand(25, 75) + rand(-12, 12),
      vy: Math.sin(a) * rand(25, 75) - rand(10, 28),
      ttl, maxTtl: ttl, grav: -55, size: rand(2.5, 6),
      kind: 'flame', glow: rand(0.65, 1),
      color: pick(['#ffe070', '#ff9a2a', '#ffce4a', '#e05818', '#b83a10', '#3a3028']),
    });
  }
  // scorch the earth now and then
  if (Math.random() < 0.05) {
    const a = bearing + rand(-fl.arc, fl.arc) * 0.6;
    const d = rand(range * 0.4, range);
    gctx.fillStyle = 'rgba(30,26,18,0.28)';
    gctx.beginPath();
    gctx.ellipse(actor.x + Math.cos(a) * d, actor.y + Math.sin(a) * d,
      rand(4, 9), rand(3, 6), rand(0, 3), 0, 7);
    gctx.fill();
  }

  // a veteran keeps the stream on target: burn scales hard with rank
  const dps = fl.dps * (1 + (actor.rank || 0) * 0.35);
  const reach2 = (range + 8) * (range + 8);
  // Vampiric Flame: only the player's own flamer siphons, and only off actual
  // enemies — burning your own side for healing would reward friendly fire
  const vampiric = actor.side === 'us' && G.cardsOwned && G.cardsOwned.has('vampiricflame');
  const burn = (a2) => {
    if (a2 === actor || a2.dead) return;
    if (dist2(actor, a2) > reach2) return;
    if (Math.abs(angleDiff(Math.atan2(a2.y - actor.y, a2.x - actor.x), bearing)) > fl.arc) return;
    let dmg = dps * dt * rand(0.8, 1.2);
    if (a2.t.tank) dmg *= 0.6;
    // creditKill ignores German shooters, so passing actor is always safe
    if (a2.side === 'us') {
      damageUnit(a2, dmg, actor, 'flame');   // flame bypasses body/flak armor
    } else {
      damageEnemy(a2, dmg, actor);
      if (vampiric) actor.hp = Math.min(actor.maxhp, actor.hp + dmg * VAMPIRIC_FLAME_LIFESTEAL);
    }
    // men dive under the fire stream within a second or so
    tryGoProne(a2, 1.5 * dt);
  };
  for (const u of G.units) burn(u);
  for (const e of G.enemies) burn(e);
}

// pump-action buckshot: one blast, every enemy caught in the cone takes
// pellet damage scaled by distance and how centered they are in the spread
function fireShotgun(actor, buffs) {
  const sg = actor.t.shotgun;
  // Rifled Slugs: one solid slug instead of a buckshot pattern — far greater
  // reach, almost no spread, and it drives the full pellet count into whatever
  // it lines up on.
  const slug = actor.side === 'us' && G.cardsOwned && G.cardsOwned.has('rifledslugs');
  const range = unitRange(actor, sg.range) * fogMult() * (slug ? 1.6 : 1);
  const baseArc = slug ? sg.arc * 0.55 : sg.arc;
  const arc = baseArc * (1 + (buffs && buffs.accBonus ? buffs.accBonus * 0.25 : 0));
  const mx = actor.x + Math.cos(actor.face) * (actor.t.gun + 2);
  const my = actor.y + Math.sin(actor.face) * (actor.t.gun + 2);

  SFX.shotgun();
  markCamoFired(actor);
  actor.shotgunBlastT = 0.12;
  G.flashes.push({ x: mx, y: my, r: 11, ttl: 0.09, max: 0.09, kind: 'muzzle', angle: actor.face });
  const spreadMult = Math.max(0.4, 1 - (actor.rank || 0) * 0.08);
  if (slug) {
    // a single tight tracer punching out to full range
    G.tracers.push({
      x1: mx, y1: my,
      x2: actor.x + Math.cos(actor.face) * range, y2: actor.y + Math.sin(actor.face) * range,
      ttl: 0.08, life: 0.08, kind: 'buckshot',
    });
  } else {
    for (let i = 0; i < sg.pellets; i++) {
      const a = actor.face + rand(-sg.spread * spreadMult, sg.spread * spreadMult);
      const d = rand(25, range);
      G.tracers.push({
        x1: mx, y1: my,
        x2: actor.x + Math.cos(a) * d, y2: actor.y + Math.sin(a) * d,
        ttl: 0.07, life: 0.07, kind: 'buckshot',
      });
    }
  }
  for (let i = 0; i < 5; i++) {
    const a = actor.face + rand(-sg.spread * 0.6 * spreadMult, sg.spread * 0.6 * spreadMult);
    const ttl = rand(0.08, 0.2);
    G.particles.push({
      x: mx + Math.cos(a) * rand(4, 14), y: my + Math.sin(a) * rand(4, 14),
      vx: Math.cos(a) * rand(35, 70), vy: Math.sin(a) * rand(35, 70) - rand(5, 20),
      ttl, maxTtl: ttl, grav: 120, size: rand(1.2, 2.2),
      kind: 'smoke', color: pick(['#d8ccb0', '#c8b898', '#a89878', '#8a7a60']),
    });
  }
  G.particles.push({
    x: mx + Math.cos(actor.face) * 10, y: my + Math.sin(actor.face) * 10,
    vx: Math.cos(actor.face) * rand(30, 55), vy: Math.sin(actor.face) * rand(30, 55),
    ttl: 0.18, grav: 90, size: rand(1.5, 2.5), color: '#c8b898',
  });

  const rank = actor.rank || 0;
  // attackers (side 'de') hose defenders in G.units; friendlies hose G.enemies
  const foes = actor.side === 'de' ? G.units : G.enemies;
  const reach2 = (range + 8) * (range + 8);
  // buckshot is too short-lived to simulate per pellet, but walls still count:
  // a victim tucked behind cover the pattern can't clear is skipped, and the
  // wall eats one chip per blast
  const sgExempt = coverExemptFor(actor);
  const sgChipped = new Set();
  for (const e of foes) {
    if (e.dead || e.y < 0 || e.chute > 0 || isCamouflaged(e)) continue;
    const d2 = dist2(actor, e);
    if (d2 > reach2) continue;
    const d = Math.sqrt(d2);
    const ang = Math.atan2(e.y - actor.y, e.x - actor.x);
    const off = Math.abs(angleDiff(ang, actor.face));
    if (off > arc) continue;

    if (e.prone > 0 && Math.random() < PRONE_BULLET_DODGE) {
      G.particles.push({ x: e.x + rand(-6, 6), y: e.y + 4, vx: rand(-25, 25), vy: rand(-55, -20), ttl: 0.3, grav: 200, size: 1.3, color: '#6e6046' });
      continue;
    }
    const ep = actorProfile(e);
    const cv = coverHitAlong(mx, my, 5, e.x, e.y, ep.h * 0.55, sgExempt);
    if (cv) {
      if (!sgChipped.has(cv.obj)) {
        sgChipped.add(cv.obj);
        cv.obj.hp -= COVER_PROFILE[cv.key].chip[cv.tier];
        G.particles.push({ x: e.x, y: e.y + 6, vx: rand(-20, 20), vy: -40, ttl: 0.3, grav: 150, size: 1.5, color: '#b8a878' });
      }
      continue;
    }

    const centered = 1 - off / arc;
    // a slug barely bleeds off over distance and lands its whole mass on target;
    // buckshot loses half its punch at max range and only a few pellets connect
    const falloff = 1 - (d / range) * (slug ? 0.15 : 0.5);
    const pelletsHit = slug ? sg.pellets * 1.5 : Math.max(1, Math.round(centered * 2.5 + rand(0, sg.pellets * 0.35)));
    let dmg = sg.dmg * pelletsHit * falloff * (1 + rank * 0.09) * rand(0.9, 1.1);
    if (e.t.tank) dmg *= 0.06;
    else if (e.t.apc) dmg *= 0.2;
    if (e.side === 'us') damageUnit(e, dmg, actor, 'bullet');
    else damageEnemy(e, dmg, actor, 'bullet');
  }
}
