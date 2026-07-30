/* Trenchworks: WW2 — shells, grenades, rockets & bombs.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

function scheduleShell(x, y, delay, r, dmg, big, by, kind) {
  const s = { x, y, timer: delay, dur: delay, r, dmg, big, by, kind };
  G.shells.push(s);
  return s;
}

function explode(x, y, r, dmg, big, by) {
  SFX.boom(big);
  addGroundMark({ type: 'crater', x, y, r, rot1: rand(0, 3), rot2: rand(0, 3) });
  addShake(big ? 7 : 3.5);

  // hot core flash plus a shockwave ring that outruns it
  G.flashes.push({ x, y, r: r * 1.15, ttl: 0.22, max: 0.22 });
  G.flashes.push({ x, y, r: r * (big ? 2.2 : 1.6), ttl: big ? 0.4 : 0.28, max: big ? 0.4 : 0.28, kind: 'ring' });

  for (let i = 0; i < 26; i++) {
    G.particles.push({
      x, y, vx: rand(-90, 90), vy: rand(-160, -20),
      ttl: rand(0.4, 1.1), grav: 220, size: rand(1.5, 3.5),
      color: pick(['#3c3325', '#57492f', '#6e6046', '#2a2318']),
    });
  }
  // fire licking up out of the blast center
  const fireN = big ? 16 : 8;
  for (let i = 0; i < fireN; i++) {
    G.particles.push({
      x: x + rand(-r * 0.15, r * 0.15), y: y + rand(-r * 0.1, r * 0.1),
      vx: rand(-25, 25), vy: rand(-100, -25),
      ttl: rand(0.15, 0.4), grav: -30, size: rand(1.8, big ? 4.5 : 3.2),
      kind: 'flame', color: pick(['#ffdf8a', '#ff9c3c', '#ff6a1e', '#fff2c0']),
    });
  }
  // smoke drifting up once the flash and fire have died down
  const smokeN = big ? 16 : 7;
  for (let i = 0; i < smokeN; i++) {
    const ttl = rand(0.6, big ? 1.6 : 1.0);
    G.particles.push({
      x: x + rand(-r * 0.25, r * 0.25), y: y + rand(-r * 0.15, r * 0.15),
      vx: rand(-16, 16), vy: rand(-60, -18),
      ttl, maxTtl: ttl, grav: -10, size: rand(3, big ? 7 : 5),
      kind: 'smoke', color: pick(['#3d362a', '#4e4536', '#57492f', '#2a2318']),
    });
  }

  const r2 = r * r;
  const hitArea = (e) => {
    const dx = e.x - x, dy = e.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 > r2) return 0;
    let hd = dmg * (1 - (Math.sqrt(d2) / r) * 0.7) * rand(0.8, 1.2);
    if (e.prone > 0) hd *= 0.5;   // flat on the ground, under most of the blast
    return hd;
  };
  // HE vs armor: anything that carries its own armorMult (bazooka rockets,
  // the V2 warhead) hits armored/wheeled targets far harder than it hits flesh
  const blastArmorMult = by && by.t && (by.t.rocket || by.t.v2) && (by.t.rocket || by.t.v2).armorMult;
  // The Yamato's hull is five actors sharing one HP pool — four belt sections
  // plus the hull core itself, which is the amidships hitbox — so a single shell
  // landing on her would otherwise be counted two to four times over. They are
  // all held back here and only the NEAREST takes the blast: nearest rather than
  // first-in-array so hitArea's distance falloff stays honest, and the core is in
  // the group because a shell amidships would otherwise hit the core AND the
  // section beside it (measured: 473 damage where 230 was correct).
  // Her turrets and gun tubs are deliberately NOT de-duped: they have their own
  // pools, which is what makes a shell that lands on a battery hurt twice.
  let belt = null, beltHd = 0, beltD2 = Infinity;
  for (const e of G.enemies) {
    if (e.chute > 0) continue;   // blast passes under the descending stick
    let hd = hitArea(e);
    if (hd > 0) {
      if (e.t.hullSection || e.t.ship) {
        const bdx = e.x - x, bdy = e.y - y, bd2 = bdx * bdx + bdy * bdy;
        if (bd2 < beltD2) { beltD2 = bd2; belt = e; beltHd = hd; }
        continue;
      }
      if (e.t.tank) {
        hd *= blastArmorMult != null ? blastArmorMult : 2.2;
      } else if ((e.t.vehicle || e.t.apc) && blastArmorMult != null) {
        hd *= blastArmorMult;
      } else if (e.t.blastResist) hd *= (1 - e.t.blastResist);
      damageEnemy(e, hd, by || { x, y }, 'blast');
    }
  }
  if (belt) {
    damageEnemy(belt, beltHd * (blastArmorMult != null ? blastArmorMult : 2.2),
      by || { x, y }, 'blast');
  }
  for (const u of G.units) {
    let hd = hitArea(u);
    if (hd > 0) {
      if (u.t.tank) {
        hd *= blastArmorMult != null ? blastArmorMult : 2.2;
      } else if ((u.t.vehicle || u.t.apc) && blastArmorMult != null) {
        hd *= blastArmorMult;
      } else if (u.t.blastResist) hd *= (1 - u.t.blastResist);
      if (G.cardsOwned && G.cardsOwned.has('shrapnelvest_' + u.type)) hd *= 0.7;
      // Sloped Armor: angled plate deflects enemy shells and rockets for half
      if (slopedArmorSoftens(u, by)) hd *= (1 - SLOPED_ARMOR_REDUCTION);
      // forward the firer, exactly like the enemy loop above: damageUnit reads
      // from.side to tell a German shell from a friendly one (the Escalation
      // damage modifier), and recapUnitLost credits the kill from it
      damageUnit(u, hd, by || { x, y }, 'blast');
    }
  }
  // Mines are immune to explosives — they only ever detonate when something
  // steps on them (see update.js), so a nearby blast never chains the field.
  // Blast Shelter: overhead cover shrugs the whole blast off every other
  // emplacement too — no HP lost.
  const blastShelter = G.cardsOwned && G.cardsOwned.has('blastshelter');
  if (!blastShelter) {
    const pt = { x, y };
    for (const s of G.sandbags) {
      if (dist2(s, pt) < r2) s.hp -= dmg * 0.8;
    }
    for (const d of G.dummies) {
      if (dist2(d, pt) < r2) d.hp -= dmg * 0.8;
    }
    for (const b of G.bunkers) {
      // reinforced concrete: blast does far less than it would to sandbags
      if (dist2(b, pt) < r2) b.hp -= dmg * 0.4;
    }
    for (const wt of G.watchtowers) {
      if (dist2(wt, pt) < r2) wt.hp -= dmg * 0.8;
    }
    for (const cn of G.camoNests) {
      // no concrete to absorb it — brush and dugout timber crack fast
      if (dist2(cn, pt) < r2) cn.hp -= dmg * CAMONEST_EXPLOSIVE_MULT;
    }
    for (const ac of G.ammoCrates) {
      // thin crate wood, and a blast can cook off what's stacked inside
      if (dist2(ac, pt) < r2) ac.hp -= dmg;
    }
    for (const wr of G.wires) {
      if (Math.abs(wr.x - x) < r + 35 && Math.abs(wr.y - y) < r) wr.hp -= dmg;
    }
  }
  // Regio Esercito field works — OUTSIDE the Blast Shelter guard on purpose.
  // That card is overhead cover the player buys for his own emplacements; letting
  // it shield enemy works would have it defending the very thing the player needs
  // artillery to break. Explosives are the main answer to a work, so this loop is
  // the primary counter-play, not an incidental splash.
  for (const w of G.itWorks) {
    if (dist2(w, { x, y }) < r2) w.hp -= dmg * (w.kind === 'bunker' ? 0.4 : 0.8);
  }
}

// Frag Grenades card: fling a ring of fragments out of a grenadier's blast.
// Each pellet is a short-lived traveling projectile (see the shrapnel loop in
// update.js) that penetrates bodies — it damages friend and foe alike, once
// per actor, then burns off at FRAG_SHRAPNEL_RANGE. `by` is credited for kills.
function spawnShrapnel(x, y, by) {
  for (let i = 0; i < FRAG_SHRAPNEL_COUNT; i++) {
    const a = rand(0, Math.PI * 2);
    const range = FRAG_SHRAPNEL_RANGE * rand(0.7, 1.1);
    G.shrapnel.push({
      x, y, sx: x, sy: y,
      vx: Math.cos(a) * FRAG_SHRAPNEL_SPEED,
      vy: Math.sin(a) * FRAG_SHRAPNEL_SPEED,
      dist: 0, maxDist: range,
      by, hit: null, done: false,
    });
  }
}

// gate for the Frag Grenades card, called wherever a grenade detonates: only a
// grenadier's own grenade sprays fragments, and only when the card is equipped.
function maybeFragShrapnel(g) {
  if (!g.by || g.by.type !== 'grenadier') return;
  if (!G.cardsOwned || !G.cardsOwned.has('fraggrenades')) return;
  spawnShrapnel(g.tx, g.ty, g.by);
}

// the V2 warhead's flight profile, shared by the renderer and the trail
// spawner: a hard boost climb off the pad, a high coast leg crossing most of
// the map, then a terminal dive that accelerates into the impact point.
// Returns ground track position, screen position, normalized altitude, an
// apparent scale (smaller at altitude), the heading of the on-screen motion,
// and which phase of flight it's in.
function v2FlightState(s) {
  const f = clamp(1 - s.timer / s.dur, 0, 1);
  const at = ff => {
    const gx = s.sx + (s.x - s.sx) * ff, gy = s.sy + (s.y - s.sy) * ff;
    let altN;
    if (ff < 0.35) altN = Math.pow(ff / 0.35, 1.8);            // boost: slow off the rail, accelerating climb
    else if (ff < 0.65) altN = 1;                              // coast: high and level
    else altN = Math.pow((1 - ff) / 0.35, 0.6);                // dive: free-fall, fastest right at impact
    return { gx, gy, altN, x: gx, y: gy - altN * V2_ROCKET_ARC };
  };
  const p = at(f);
  const q = at(Math.min(f + 0.01, 1));
  const phase = f < 0.35 ? 'boost' : f < 0.65 ? 'coast' : 'dive';
  return {
    f, phase, gx: p.gx, gy: p.gy, altN: p.altN, x: p.x, y: p.y,
    scale: 1.05 - p.altN * 0.5,
    heading: Math.atan2(q.y - p.y, q.x - p.x),
  };
}

// the V2's warhead lands like any other shell, but it's a much bigger event:
// a white-hot core, a dust shockwave slamming outward at ground level, and a
// tall churning smoke column climbing off the crater afterward
function explodeV2(x, y, r, dmg, by) {
  explode(x, y, r, dmg, true, by);
  addShake(13);
  G.flashes.push({ x, y, r: r * 1.9, ttl: 0.3, max: 0.3 });
  G.flashes.push({ x, y, r: r * 0.8, ttl: 0.6, max: 0.6 });
  addGroundMark({ type: 'crater', x, y, r: r * 1.4, rot1: rand(0, 3), rot2: rand(0, 3) });
  // ground-level dust shockwave — fast, flat, short-lived
  for (let i = 0; i < 36; i++) {
    const ang = rand(0, Math.PI * 2), sp = rand(240, 420);
    const ttl = rand(0.22, 0.42);
    G.particles.push({
      x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp * 0.6,
      ttl, maxTtl: ttl, grav: 0, size: rand(2.5, 5),
      kind: 'smoke', color: pick(['#cabfa4', '#a89a7e', '#8a7d64']),
    });
  }
  // fire core licking up out of the crater
  for (let i = 0; i < 14; i++) {
    G.particles.push({
      x: x + rand(-r * 0.2, r * 0.2), y: y + rand(-r * 0.15, r * 0.15),
      vx: rand(-30, 30), vy: rand(-90, -20),
      ttl: rand(0.2, 0.45), grav: -40, size: rand(2, 4.5),
      color: pick(['#ffdf8a', '#ff9c3c', '#ff6a1e', '#fff2c0']),
    });
  }
  // smoke column, rising slow and dark long after the flash is gone
  for (let i = 0; i < 30; i++) {
    const ttl = rand(1.1, 2.4);
    G.particles.push({
      x: x + rand(-r * 0.3, r * 0.3), y: y + rand(-r * 0.2, r * 0.2),
      vx: rand(-14, 14), vy: rand(-80, -25),
      ttl, maxTtl: ttl, grav: -12, size: rand(4, 9),
      kind: 'smoke', color: pick(['#2b261e', '#3d362a', '#4e4536', '#232019']),
    });
  }
}

// P-47 pass: roars in from behind the friendly line and hoses the field
// with eight .50 cals on its way out, walking fire up its flight path

function spawnTransportFlyby() {
  const dir = Math.random() < 0.5 ? 1 : -1;
  G.planes.push({
    role: 'flyby',
    transport: true,
    x: rand(70, W * 0.45),
    y: dir > 0 ? -90 : H + 90,
    vx: rand(-12, 12),
    vy: dir * rand(240, 320),
    sfxT: 0,
    flybyPlayed: false,
    done: false,
  });
}

function spawnStrafeRun(y) {
  const speed = 380;
  const startX = W + 70;
  SFX.planeFlyby();
  G.planes.push({
    role: 'strafe',
    x: startX, y, speed,
    drift: rand(-10, 10),
    gunT: 0.4, sfxT: 0, gunSfxT: 0,
    flybyPlayed: true,
    done: false,
  });
  // a stick of bombs timed to burst right as the plane passes overhead
  for (let i = 0; i < 2; i++) {
    const bx = 90 + i * 95;
    scheduleShell(bx, y + rand(-22, 22), (startX - bx) / speed + 0.12, 42, 90, false);
  }
}

function updatePlane(p, dt) {
  if (p.role === 'flyby') {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (!p.flybyPlayed) {
      p.flybyPlayed = true;
      SFX.planeFlyby();
    }
    p.sfxT -= dt;
    if (p.sfxT <= 0) { p.sfxT = 0.14; SFX.plane(); }
    if (p.vy > 0 && p.y > H + 100) p.done = true;
    if (p.vy < 0 && p.y < -100) p.done = true;
    return;
  }

  if (p.role === 'bomber') {
    updateBomber(p, dt);
    return;
  }

  if (p.role === 'kamikaze') {
    updateKamikaze(p, dt);
    return;
  }

  p.x -= p.speed * dt;
  p.y += p.drift * dt;

  p.sfxT -= dt;
  if (p.sfxT <= 0) { p.sfxT = 0.09; SFX.plane(); }

  // guns hold fire until the nose is past the trench line
  if (p.x < DEPLOY_X + 40 && p.x > 40) {
    p.gunT -= dt;
    while (p.gunT <= 0) {
      p.gunT += 0.035;
      // rounds strike well ahead of the aircraft
      const ix = p.x - rand(70, 150);
      const iy = p.y + rand(-16, 16);
      if (ix < 0) continue;

      G.tracers.push({ x1: p.x - 20, y1: p.y + rand(-4, 4), x2: ix, y2: iy, ttl: 0.07, life: 0.07 });
      G.particles.push({
        x: ix, y: iy, vx: rand(-25, 25), vy: rand(-70, -20),
        ttl: rand(0.2, 0.45), grav: 260, size: rand(1.2, 2.2),
        color: pick(['#6e6046', '#57492f', '#8a7a5a']),
      });

      p.gunSfxT = (p.gunSfxT || 0) - 0.035;
      if (p.gunSfxT <= 0) { p.gunSfxT = 0.09; SFX.hmg(); }

      for (const e of G.enemies) {
        if (e.dead) continue;
        if (dist(e, { x: ix, y: iy }) < 13) {
          let dmg = rand(14, 26);
          if (e.t.tank) dmg *= 0.15; // even .50 cal only chips a Panzer
          damageEnemy(e, dmg, { x: ix, y: iy }, 'bullet');
        }
      }
    }
  }

  if (p.x < -90) p.done = true;
}

// a bomber holds its heading and does not react to what's shooting at it: it
// flies the line it was given, bombs whatever it happens to pass over, and
// leaves. Everything interesting happens in the AA gun's arc, not up here.
function updateBomber(p, dt) {
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  // engine drone only while it's actually over the field
  if (p.x > -60) {
    p.sfxT -= dt;
    if (p.sfxT <= 0) { p.sfxT = 0.11; SFX.plane(); }
  }

  if (p.bombCd > 0) p.bombCd -= dt;

  // bays stay shut until it's actually over the field and something is under it
  if (p.bombCd <= 0 && p.x > -20 && p.x < W - 20) {
    let victim = null, best = p.attackR;
    for (const u of G.units) {
      if (u.dead || isCamouflaged(u)) continue;
      const d = dist(u, p);
      if (d < best) { best = d; victim = u; }
    }
    if (victim) dropBombStick(p, victim);
  }

  if (p.x > W + 90) p.done = true;
}

// the stick walks along the flight path from a badly-judged release point —
// they're aiming at your men, but a bomb sight at this altitude is a suggestion
function dropBombStick(p, victim) {
  const count = randi(p.bombsMin, p.bombsMax);
  p.bombCd = rand(2.6, 3.6);

  const heading = Math.atan2(p.vy, p.vx);
  const fx = Math.cos(heading), fy = Math.sin(heading);
  // aim error: the whole stick is displaced, so a miss misses as a group
  const aimX = victim.x + rand(-100, 100);
  const aimY = victim.y + rand(-100, 100);
  const spacing = rand(30, 42);
  // The synthetic firer detonateKamikaze builds, for exactly the same reason: the
  // ESCALATION damage modifier keys on from.side, and a bomb scheduled with a
  // bare null arrives at damageUnit as an unattributed {x,y} — so an air raid was
  // the one enemy attack in the game that rung IV did not touch. One object for
  // the whole stick; nothing downstream reads more than the side.
  const from = { x: p.x, y: p.y, side: 'de' };

  for (let i = 0; i < count; i++) {
    const bx = clamp(aimX + fx * (i - (count - 1) / 2) * spacing + rand(-35, 35), 14, W - 14);
    const by = clamp(aimY + fy * (i - (count - 1) / 2) * spacing + rand(-35, 35), 14, H - 14);
    // release-to-impact, staggered so the stick walks rather than landing flat
    const sh = scheduleShell(bx, by, rand(1.15, 1.45) + i * 0.14, p.bombR, p.bombDmg, p.bombBig, from, 'bomb');
    // where it left the bay, so the renderer can arc it down onto the marker
    // from behind the bomber rather than dropping it straight out of the sky
    sh.sx = p.x - fx * 26; sh.sy = p.y - fy * 26;
    sh.spin = rand(0, 7); sh.big = p.bombBig;
  }
}

// ---- kamikaze: the Japanese faction's air raid. A pilot picks a man at random
// and flies his aircraft into him. Unlike a bomber he is a single-use weapon
// with no bay and no attack radius — everything he can do to you happens at the
// end of one dive, and flak is the only thing between him and it.

// he stops correcting inside this and flies the line he already has. Outside it
// he tracks his man; inside it a defender who moves is left behind, and the
// pilot's own aiming error is all that's still deciding where the blast lands.
// Measured at wave 60: the median blast falls 20px off the nearest man and only
// 31% land inside 15px of him — precise, and never perfectly so.
const KAMI_COMMIT = 140;
const KAMI_TURN = 1.6;       // rad/s the dive can be steered — he can never snap onto a man
const KAMI_HIT = 10;         // px from the aim point that counts as impact

// a man at random, not the nearest — nowhere on the field is safe. The filter
// is the bombers' own: a smokescreen hides the ground from the ground, never
// from the air, so no LOS test belongs here.
function kamikazeAcquire(p) {
  const pool = [];
  for (const u of G.units) {
    if (u.dead || isCamouflaged(u)) continue;
    pool.push(u);
  }
  p.target = pool.length ? pick(pool) : null;
  // the aiming error he carries all the way down, rolled ONCE so the dive reads
  // as a steady pull off-centre rather than a frame-by-frame wobble
  p.offX = rand(-p.aim, p.aim);
  p.offY = rand(-p.aim, p.aim);
  if (!p.target) {
    // nobody left to hit, and he still has to come down somewhere
    p.aimX = clamp(rand(DEPLOY_X - 40, W - 40), 14, W - 14);
    p.aimY = clamp(rand(80, H - 80), 14, H - 14);
    p.locked = true;
  }
}

function updateKamikaze(p, dt) {
  // flak resolves EARLIER in the same frame than this loop does (burstFlak in
  // js/update.js, above the plane walk) and compaction only runs at the end of
  // it — so a plane the AA gun just broke is still in G.planes and would fly on
  // for one more tick. Without this it steers, drones and reaches its aim point
  // after it has already come down in pieces.
  if (p.done) return;

  // re-roll if his man dies or goes under a camo net before he commits. After
  // the lock the target ref is never read again, which is what keeps it safe
  // from compaction splicing the dead out from under us mid-frame.
  if (!p.locked && (!p.target || p.target.dead || isCamouflaged(p.target))) kamikazeAcquire(p);
  if (!p.locked && p.target) {
    p.aimX = clamp(p.target.x + p.offX, 14, W - 14);
    p.aimY = clamp(p.target.y + p.offY, 14, H - 14);
    if (dist(p, { x: p.aimX, y: p.aimY }) <= KAMI_COMMIT) p.locked = true;
  }

  // steer toward the aim point at a limited rate. vx/vy are written rather than
  // derived on demand: fireFlakBurst leads its shell on them and killPlane
  // throws the wreck along them.
  const want = Math.atan2(p.aimY - p.y, p.aimX - p.x);
  let head = Math.atan2(p.vy, p.vx);
  head += clamp(angleDiff(want, head), -KAMI_TURN * dt, KAMI_TURN * dt);
  p.vx = Math.cos(head) * p.speed;
  p.vy = Math.sin(head) * p.speed;

  p.x += p.vx * dt;
  p.y += p.vy * dt;

  // engine note, winding tighter as the dive steepens
  if (p.x > -40) {
    p.sfxT -= dt;
    if (p.sfxT <= 0) { p.sfxT = 0.11 - p.dive * 0.05; SFX.plane(); }
  }

  // 0..1 down the run from the entry point to the aim point. The renderer maps
  // it to the airframe's apparent size — see drawPlane.
  const span = p.aimX - p.entryX;
  p.dive = span > 1 ? clamp((p.x - p.entryX) / span, 0, 1) : 1;

  // a holed airframe streams the rest of the way down, so a plane the flak hit
  // but didn't break still reads as hit
  if (p.hp < p.maxhp * 0.5 && Math.random() < 0.5) {
    G.particles.push({
      x: p.x + rand(-3, 3), y: p.y + rand(-3, 3),
      vx: rand(-10, 10), vy: rand(-20, 5),
      ttl: rand(0.4, 0.9), grav: -8, size: rand(2, 4),
      color: pick(['#2b261e', '#3d362a', '#4e4536']),
    });
  }

  // impact: inside the hit radius, or the instant he flies past the point he
  // was aiming at — a dive that gets ahead of a running man buries itself in
  // the dirt beside him rather than turning around
  const dx = p.aimX - p.x, dy = p.aimY - p.y;
  if (dx * dx + dy * dy < KAMI_HIT * KAMI_HIT || dx * p.vx + dy * p.vy < 0) {
    detonateKamikaze(p);
    return;
  }

  if (p.x > W + 90) p.done = true;   // clean past the player's edge: gone, no blast
}

// the aircraft IS the warhead. The synthetic firer carries side 'de' so the
// blast is visible to the ESCALATION damage modifier, which keys on from.side —
// same reason detonateLunge builds one.
function detonateKamikaze(p) {
  if (p.done) return;
  p.done = true;
  explode(p.x, p.y, p.blastR, p.blastDmg, p.big, { x: p.x, y: p.y, side: 'de' });
}

// what a flak burst can reach: anything of the enemy's that is up in the air.
// One predicate rather than a role test at each site, so a new kind of aircraft
// can never be silently invisible to the AA gun.
function isFlakTarget(p) {
  return !p.done && (p.role === 'bomber' || p.role === 'kamikaze');
}

// a falling bomb's screen state: it tips out behind the bomber and tumbles
// down onto the target marker, its apparent altitude bleeding off toward zero
// at impact. Returns ground track, screen position, and normalized altitude.
function bombFlightState(s) {
  const f = clamp(1 - s.timer / s.dur, 0, 1);
  const gx = s.sx + (s.x - s.sx) * f;          // ground track walks to the marker
  const gy = s.sy + (s.y - s.sy) * f;
  const altN = Math.pow(1 - f, 1.5);           // free-fall: slow to lose height, then plummets
  return { f, gx, gy, altN, x: gx, y: gy - altN * BOMB_FALL_ARC };
}

// flak finds the airframe: it comes apart in the air and what's left of it
// hits the ground still carrying whatever it had aboard. A bomber's bomb bay is
// the default 46/70; a kamikaze brings its own reduced pair, because a warhead
// cooking off in a tumbling wreck is not the same as one driven into the dirt
// on purpose — and that shortfall, landing short of where it was aimed, is the
// AA gun's whole reward for getting there first.
// Note the explode() here deliberately forwards no firer: `by` is the friendly
// gun crew, and crediting them would run their on-kill card hooks against your
// own men. The plane itself is already credited by creditKill above.
function killPlane(p, by) {
  if (p.done) return;
  p.done = true;
  creditKill(by);
  SFX.boom(true);
  G.flashes.push({ x: p.x, y: p.y, r: 26, ttl: 0.25, max: 0.25 });
  for (let i = 0; i < 34; i++) {
    const ang = rand(0, Math.PI * 2);
    G.particles.push({
      x: p.x, y: p.y,
      vx: Math.cos(ang) * rand(30, 150), vy: Math.sin(ang) * rand(30, 150) + 40,
      ttl: rand(0.6, 1.5), grav: 190, size: rand(1.6, 4),
      color: pick(['#2a2318', '#4a3d28', '#6e6046', '#8a7a5a', '#1a1712']),
    });
  }
  // the wreck comes down south of where it was hit, still travelling
  const cx = clamp(p.x + p.vx * 0.5, 20, W - 20);
  const cy = clamp(p.y + p.vy * 0.55, 20, H - 20);
  explode(cx, cy, p.wreckR || 46, p.wreckDmg || 70, true);
}

// bombers are never seen, only their shadows: a twin-engine silhouette
// sweeping south across the ground, with the attack radius it will bomb inside
function drawBomberShadow(p) {
  const c = ctx;
  if (p.x < -55) return;

  c.save();
  c.translate(p.x, p.y);
  c.rotate(Math.atan2(p.vy, p.vx) - Math.PI / 2);

  // the radius it's hunting inside — faint, so it reads as a threat envelope
  // rather than a UI element
  c.strokeStyle = 'rgba(0,0,0,0.13)';
  c.lineWidth = 1;
  c.setLineDash([5, 7]);
  c.beginPath(); c.arc(0, 0, p.attackR, 0, 7); c.stroke();
  c.setLineDash([]);

  c.fillStyle = 'rgba(0,0,0,0.3)';
  // fuselage
  c.beginPath(); c.ellipse(0, 0, 7, 30, 0, 0, 7); c.fill();
  // wing
  c.beginPath(); c.ellipse(0, -3, 46, 9, 0, 0, 7); c.fill();
  // tailplane and fin
  c.beginPath(); c.ellipse(0, 24, 18, 5, 0, 0, 7); c.fill();
  // engine nacelles slung under the wing
  for (const ex of [-20, 20]) {
    c.beginPath(); c.ellipse(ex, -5, 5, 13, 0, 0, 7); c.fill();
  }
  // prop discs
  c.fillStyle = 'rgba(0,0,0,0.16)';
  for (const ex of [-20, 20]) {
    c.beginPath(); c.ellipse(ex, -17, 10, 2.5, 0, 0, 7); c.fill();
  }
  c.restore();
}

// A kamikaze is the one aircraft in the game that is SEEN. A bomber is only
// ever a shadow because it never comes below its cruise; a kamikaze arrives by
// flying all the way down to the dirt, and a dive you can't see coming isn't a
// dive you can step out from under. It is drawn through this same procedural
// airframe as the strafer and the transport rather than a copy of it — the only
// real deltas are a SIZE, a heading and the marking on the wings, so all three
// are parameters. Every field they key on is absent on the other two roles, so
// the art that shipped is untouched.
function drawPlane(p) {
  const c = ctx;
  if (p.role === 'bomber') { drawBomberShadow(p); return; }
  const flyby = p.role === 'flyby';
  const kami = p.role === 'kamikaze';
  const facing = flyby ? (p.vy > 0 ? 1 : -1) : 0;
  if (kami && p.x < -40) return;

  // apparent size. This camera looks straight down, so ALTITUDE IS DISTANCE
  // FROM THE LENS: a plane up at its entry height is nearer the viewer and
  // reads large, and it shrinks back toward its true ground-level size as it
  // drops onto the field. That recession is the altitude cue, and it's why a
  // kamikaze needs no ground shadow to be legible.
  const scale = kami ? p.size * (1.6 - 0.6 * (p.dive || 0)) : 1;

  // shadow racing along the ground — a kamikaze has none: it is its own
  // silhouette, and a shadow under a shrinking sprite reads as a second plane
  if (!kami) {
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.save();
    if (flyby) {
      c.translate(p.x, p.y + 28);
      c.beginPath(); c.ellipse(0, 0, 8, 26, 0, 0, 7); c.fill();
    } else {
      c.translate(p.x + 26, p.y + 34);
      c.beginPath(); c.ellipse(0, 0, 20, 9, 0, 0, 7); c.fill();
      c.beginPath(); c.ellipse(-2, 0, 5, 22, 0, 0, 7); c.fill();
    }
    c.restore();
  }

  c.save();
  c.translate(p.x, p.y);
  if (flyby) c.rotate(facing > 0 ? Math.PI : 0);
  // the strafer flies up-field (-x); the body below is authored nose -y
  else if (!kami) c.rotate(-Math.PI / 2);
  // the body below is drawn nose-toward -y; `atan2 + PI/2` turns that into the
  // heading it is actually flying, which for a dive is down-field
  else if (kami) c.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);
  if (scale !== 1) c.scale(scale, scale);

  // Imperial Army green over a lighter grey-green than the P-47 wears. The one
  // confusion that would be unforgivable is reading a diving kamikaze as your
  // own strafing run — the ROTATION is the primary tell (a strafer's nose is
  // pinned up-field, a kamikaze points wherever it is going), the palette and
  // the hinomaru back it up.
  const body = kami ? '#5a5f4e' : p.transport ? '#4a4840' : '#3f4a3a';
  const bodyLit = kami ? '#727661' : p.transport ? '#5c594e' : '#57654e';
  const bodyDark = kami ? '#3b4034' : p.transport ? '#33322c' : '#2a3227';
  const wing = kami ? '#646953' : p.transport ? '#535048' : '#46523f';
  const wingDark = kami ? '#474c3c' : p.transport ? '#403e37' : '#333c2e';

  // wings first, tapered and swept slightly toward the tail so they read as
  // aerofoils rather than blobs; drawn underneath the fuselage
  c.fillStyle = wing;
  c.beginPath();
  c.moveTo(0, -6);
  c.lineTo(30, 2);
  c.lineTo(26, 6);
  c.lineTo(3, 0);
  c.lineTo(-3, 0);
  c.lineTo(-26, 6);
  c.lineTo(-30, 2);
  c.closePath();
  c.fill();
  // trailing-edge shade so the wing has a lit leading edge and a dark rear
  c.fillStyle = wingDark;
  c.beginPath();
  c.moveTo(3, 0); c.lineTo(26, 6); c.lineTo(24, 8); c.lineTo(2, 2); c.closePath(); c.fill();
  c.beginPath();
  c.moveTo(-3, 0); c.lineTo(-26, 6); c.lineTo(-24, 8); c.lineTo(-2, 2); c.closePath(); c.fill();

  // fuselage, nose pointed up-field (or along flyby heading after rotate),
  // tapered to a point at the nose with a fuller aft section
  c.fillStyle = body;
  c.beginPath();
  c.moveTo(0, -22);
  c.quadraticCurveTo(5.5, -10, 5, 6);
  c.quadraticCurveTo(4.5, 15, 2, 19);
  c.lineTo(-2, 19);
  c.quadraticCurveTo(-4.5, 15, -5, 6);
  c.quadraticCurveTo(-5.5, -10, 0, -22);
  c.closePath();
  c.fill();
  // sunlit flank down one side of the fuselage
  c.fillStyle = bodyLit;
  c.beginPath();
  c.moveTo(0, -21);
  c.quadraticCurveTo(4.5, -10, 4, 5);
  c.quadraticCurveTo(3.6, 12, 1.8, 17);
  c.lineTo(0, 17);
  c.lineTo(0, -21);
  c.closePath();
  c.fill();
  // shaded underside
  c.fillStyle = bodyDark;
  c.beginPath();
  c.moveTo(0, 17); c.lineTo(2, 19); c.lineTo(-2, 19); c.closePath(); c.fill();

  // tailplane (horizontal stabilizer)
  c.fillStyle = wing;
  c.beginPath(); c.ellipse(0, 15, 11, 3.5, 0, 0, 7); c.fill();
  // vertical fin, swept back
  c.fillStyle = bodyDark;
  c.beginPath();
  c.moveTo(-1.5, 9);
  c.lineTo(1.5, 9);
  c.lineTo(4, 20);
  c.lineTo(-1, 20);
  c.closePath();
  c.fill();

  // engine cowling ring at the nose
  c.fillStyle = bodyDark;
  c.beginPath(); c.ellipse(0, -20, 3.6, 2, 0, 0, 7); c.fill();

  // canopy, with a small glint so it doesn't read as a flat dot
  c.fillStyle = '#161a14';
  c.beginPath(); c.ellipse(0, 2, 2.8, 6, 0, 0, 7); c.fill();
  c.fillStyle = 'rgba(190,210,220,0.5)';
  c.beginPath(); c.ellipse(-0.8, -1, 1, 3, 0, 0, 7); c.fill();

  // spinning prop disc, faint blur
  c.fillStyle = 'rgba(200,200,180,0.22)';
  c.beginPath(); c.ellipse(0, -21.5, 11, 2.5, 0, 0, 7); c.fill();
  c.strokeStyle = 'rgba(200,200,180,0.35)';
  c.lineWidth = 0.6;
  c.beginPath(); c.ellipse(0, -21.5, 11, 2.5, 0, 0, 7); c.stroke();

  // national markings: the hinomaru on a kamikaze, US roundels on a fighter
  // strafer, nothing at all on a transport
  if (kami) {
    for (const rx of [-20, 20]) {
      c.fillStyle = '#b42a2a';
      c.beginPath(); c.arc(rx, -2, 3, 0, 7); c.fill();
      c.strokeStyle = 'rgba(235,235,225,0.55)';
      c.lineWidth = 0.8;
      c.beginPath(); c.arc(rx, -2, 3, 0, 7); c.stroke();
    }
  } else if (!p.transport) {
    for (const rx of [-20, 20]) {
      c.fillStyle = 'rgba(230,230,220,0.95)';
      c.beginPath(); c.arc(rx, -2, 3.2, 0, 7); c.fill();
      c.fillStyle = 'rgba(50,70,95,0.9)';
      c.beginPath(); c.arc(rx, -2, 2.2, 0, 7); c.fill();
      c.fillStyle = 'rgba(150,60,50,0.85)';
      c.beginPath(); c.arc(rx, -2, 0.9, 0, 7); c.fill();
    }
  }

  // wing gun muzzle flashes while firing — a kamikaze isn't strafing, it's the
  // ordnance itself, so its guns stay quiet the whole way down
  if (!flyby && !kami && p.x < DEPLOY_X + 40 && p.x > 40) {
    c.fillStyle = 'rgba(255,220,120,0.9)';
    for (const gx of [-14, -8, 8, 14]) {
      if (Math.random() < 0.6) {
        c.beginPath(); c.arc(gx, -8 - rand(0, 3), rand(1, 2.2), 0, 7); c.fill();
      }
    }
  }
  c.restore();
}
