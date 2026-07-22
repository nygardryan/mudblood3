/* Trenchworks: WW2 — shells, grenades, rockets & bombs.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

function scheduleShell(x, y, delay, r, dmg, big, by, kind) {
  const s = { x, y, timer: delay, dur: delay, r, dmg, big, by, kind };
  G.shells.push(s);
  // arcing ordnance whistles on the way down — only shells with real airtime,
  // and only if it'll still be falling when the whistle would land (self-throttled)
  if (delay >= 0.6) SFX.whistle();
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
  for (const e of G.enemies) {
    if (e.chute > 0) continue;   // blast passes under the descending stick
    let hd = hitArea(e);
    if (hd > 0) {
      if (e.t.tank) {
        hd *= blastArmorMult != null ? blastArmorMult : 2.2;
      } else if ((e.t.vehicle || e.t.apc) && blastArmorMult != null) {
        hd *= blastArmorMult;
      } else if (e.t.blastResist) hd *= (1 - e.t.blastResist);
      damageEnemy(e, hd, by || { x, y });
    }
  }
  for (const u of G.units) {
    let hd = hitArea(u);
    if (hd > 0) {
      if (u.t.tank) {
        hd *= blastArmorMult != null ? blastArmorMult : 2.2;
      } else if ((u.t.vehicle || u.t.apc) && blastArmorMult != null) {
        hd *= blastArmorMult;
      } else if (u.t.blastResist) hd *= (1 - u.t.blastResist);
      if (G.cardsOwned && G.cardsOwned.has('flakarmor_' + u.type)) hd *= 0.7;
      damageUnit(u, hd, { x, y });
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
    x: dir > 0 ? -90 : W + 90,
    y: rand(70, H * 0.45),
    vx: dir * rand(240, 320),
    vy: rand(-12, 12),
    sfxT: 0,
    flybyPlayed: false,
    done: false,
  });
}

function spawnStrafeRun(x) {
  const speed = 380;
  const startY = H + 70;
  SFX.planeFlyby();
  G.planes.push({
    role: 'strafe',
    x, y: startY, speed,
    drift: rand(-10, 10),
    gunT: 0.4, sfxT: 0, gunSfxT: 0,
    flybyPlayed: true,
    done: false,
  });
  // a stick of bombs timed to burst right as the plane passes overhead
  for (let i = 0; i < 2; i++) {
    const by = 90 + i * 95;
    scheduleShell(x + rand(-22, 22), by, (startY - by) / speed + 0.12, 42, 90, false);
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
    if (p.vx > 0 && p.x > W + 100) p.done = true;
    if (p.vx < 0 && p.x < -100) p.done = true;
    return;
  }

  if (p.role === 'bomber') {
    updateBomber(p, dt);
    return;
  }

  p.y -= p.speed * dt;
  p.x += p.drift * dt;

  p.sfxT -= dt;
  if (p.sfxT <= 0) { p.sfxT = 0.09; SFX.plane(); }

  // guns hold fire until the nose is past the trench line
  if (p.y < DEPLOY_Y + 40 && p.y > 40) {
    p.gunT -= dt;
    while (p.gunT <= 0) {
      p.gunT += 0.035;
      // rounds strike well ahead of the aircraft
      const ix = p.x + rand(-16, 16);
      const iy = p.y - rand(70, 150);
      if (iy < 0) continue;

      G.tracers.push({ x1: p.x + rand(-4, 4), y1: p.y - 20, x2: ix, y2: iy, ttl: 0.07, life: 0.07 });
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
          damageEnemy(e, dmg, { x: ix, y: iy });
        }
      }
    }
  }

  if (p.y < -90) p.done = true;
}

// a bomber holds its heading and does not react to what's shooting at it: it
// flies the line it was given, bombs whatever it happens to pass over, and
// leaves. Everything interesting happens in the AA gun's arc, not up here.
function updateBomber(p, dt) {
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  // engine drone only while it's actually over the field
  if (p.y > -60) {
    p.sfxT -= dt;
    if (p.sfxT <= 0) { p.sfxT = 0.11; SFX.plane(); }
  }

  if (p.bombCd > 0) p.bombCd -= dt;

  // bays stay shut until it's actually over the field and something is under it
  if (p.bombCd <= 0 && p.y > -20 && p.y < H - 20) {
    let victim = null, best = p.attackR;
    for (const u of G.units) {
      if (u.dead || isCamouflaged(u)) continue;
      const d = dist(u, p);
      if (d < best) { best = d; victim = u; }
    }
    if (victim) dropBombStick(p, victim);
  }

  if (p.y > H + 90) p.done = true;
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

  for (let i = 0; i < count; i++) {
    const bx = clamp(aimX + fx * (i - (count - 1) / 2) * spacing + rand(-35, 35), 14, W - 14);
    const by = clamp(aimY + fy * (i - (count - 1) / 2) * spacing + rand(-35, 35), 14, H - 14);
    // release-to-impact, staggered so the stick walks rather than landing flat
    scheduleShell(bx, by, rand(1.15, 1.45) + i * 0.14, p.bombR, p.bombDmg, p.bombBig);
  }
}

// flak finds the airframe: it comes apart in the air and what's left of it
// hits the ground still carrying whatever was in the bomb bay
function killBomber(p, by) {
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
  explode(cx, cy, 46, 70, true);
}

// bombers are never seen, only their shadows: a twin-engine silhouette
// sweeping south across the ground, with the attack radius it will bomb inside
function drawBomberShadow(p) {
  const c = ctx;
  if (p.y < -55) return;

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

function drawPlane(p) {
  const c = ctx;
  if (p.role === 'bomber') { drawBomberShadow(p); return; }
  const flyby = p.role === 'flyby';
  const facing = flyby ? (p.vx > 0 ? 1 : -1) : 0;

  // shadow racing along the ground
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.save();
  if (flyby) {
    c.translate(p.x, p.y + 28);
    c.beginPath(); c.ellipse(0, 0, 26, 8, 0, 0, 7); c.fill();
  } else {
    c.translate(p.x + 26, p.y + 34);
    c.beginPath(); c.ellipse(0, 0, 9, 20, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(0, -2, 22, 5, 0, 0, 7); c.fill();
  }
  c.restore();

  c.save();
  c.translate(p.x, p.y);
  if (flyby) c.rotate(facing > 0 ? Math.PI / 2 : -Math.PI / 2);

  const body = p.transport ? '#4a4840' : '#3f4a3a';
  const bodyLit = p.transport ? '#5c594e' : '#57654e';
  const bodyDark = p.transport ? '#33322c' : '#2a3227';
  const wing = p.transport ? '#535048' : '#46523f';
  const wingDark = p.transport ? '#403e37' : '#333c2e';

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

  // US roundels on fighter strafers only — white ring, blue disc, red center
  if (!p.transport) {
    for (const rx of [-20, 20]) {
      c.fillStyle = 'rgba(230,230,220,0.95)';
      c.beginPath(); c.arc(rx, -2, 3.2, 0, 7); c.fill();
      c.fillStyle = 'rgba(50,70,95,0.9)';
      c.beginPath(); c.arc(rx, -2, 2.2, 0, 7); c.fill();
      c.fillStyle = 'rgba(150,60,50,0.85)';
      c.beginPath(); c.arc(rx, -2, 0.9, 0, 7); c.fill();
    }
  }

  // wing gun muzzle flashes while firing
  if (!flyby && p.y < DEPLOY_Y + 40 && p.y > 40) {
    c.fillStyle = 'rgba(255,220,120,0.9)';
    for (const gx of [-14, -8, 8, 14]) {
      if (Math.random() < 0.6) {
        c.beginPath(); c.arc(gx, -8 - rand(0, 3), rand(1, 2.2), 0, 7); c.fill();
      }
    }
  }
  c.restore();
}
