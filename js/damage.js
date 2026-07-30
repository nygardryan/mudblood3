/* Trenchworks: WW2 — damage & death.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

function bloodSplat(x, y, amount) {
  for (let i = 0; i < amount; i++) {
    G.particles.push({
      x, y, vx: rand(-70, 70), vy: rand(-90, 10),
      ttl: rand(0.25, 0.7), grav: 260, size: rand(1, 2.5),
      color: pick(['#7a1410', '#95201a', '#5c0e0a']),
    });
  }
  addGroundMark({
    type: 'blood',
    x: x + rand(-6, 6), y: y + rand(-4, 8),
    rx: rand(3, 9), ry: rand(2, 6), rot: rand(0, 3),
    color: `rgba(${randi(90, 130)},${randi(10, 22)},${randi(8, 16)},${rand(0.25, 0.5)})`,
  });
}

const CORPSE_TTL = 120; // bodies are carried off after two minutes
const GROUND_MARK_TTL = 120; // blood stains and blast craters fade after two minutes
// How long a mark's alpha ramp runs at the end of its life. Named because the
// decal layer's whole rebuild schedule is derived from it (js/render-decals.js):
// a mark is unchanging, and so needs no work at all, until it enters this window.
const GROUND_MARK_FADE = 8;

// Nominal world footprints the sprite art for each mark type is authored at, and
// what an instance scales off them. A mark rolls its own size, so a pack that
// stamped one fixed bitmap would read as wallpaper — the art is authored at the
// largest roll and blitted down to the instance's own radii.
const MARK_SPR_BLOOD_W = 18, MARK_SPR_BLOOD_H = 12;   // bloodSplat's largest rx/ry
const MARK_SPR_POOL_W = 48, MARK_SPR_POOL_H = 32;     // spawnCorpse's pool at r = 1
// A shell-sized blast. Chosen so the dish below comes out whole (55 × 42), and
// the exported PNG fills its box edge to edge rather than sitting in a margin.
const MARK_SPR_CRATER_R = 50;
// the dish drawGroundMark paints for a crater, as a fraction of the blast radius
const MARK_CRATER_KW = 1.1, MARK_CRATER_KH = 0.84;

function addGroundMark(mark) {
  const m = { ttl: GROUND_MARK_TTL, ...mark };
  G.groundMarks.push(m);
  // stamped into the decal layer the frame it is made, so a hit shows blood now
  // rather than on the layer's next rebuild pass
  stampDecal(m);
  return m;
}

function groundMarkSize(m) {
  if (m.type === 'blood') return { w: m.rx * 2, h: m.ry * 2 };
  if (m.type === 'bloodpool') {
    const s = m.r || 1;
    return { w: MARK_SPR_POOL_W * s, h: MARK_SPR_POOL_H * s };
  }
  return { w: m.r * MARK_CRATER_KW, h: m.r * MARK_CRATER_KH };   // crater
}

// A mark's art scales to the instance rather than blitting at the record's own
// footprint, so blitSprite (which is fixed-size by design) doesn't fit; the
// anchor is honoured proportionally so an off-centre authored splat still lands
// where the procedural one did.
function blitGroundMarkSprite(m, c, rec, alpha) {
  const { w, h } = groundMarkSize(m);
  const rot = m.type === 'crater' ? (m.rot1 || 0) : (m.rot || 0);
  c.save();
  c.globalAlpha *= alpha;
  c.translate(m.x, m.y);
  if (rot) c.rotate(rot);
  c.drawImage(rec.img, -rec.ax / rec.w * w, -rec.ay / rec.h * h, w, h);
  c.restore();
}

function drawGroundMark(m, c) {
  const alpha = clamp(m.ttl / GROUND_MARK_FADE, 0, 1);
  // A pack's mark is stamped into the decal layer once, exactly like the
  // procedural splat it replaces, so unlike every other sprite in the game this
  // one costs nothing per frame.
  const ext = SPRITES.get(groundMarkSpriteId(m));
  if (ext) { blitGroundMarkSprite(m, c, ext, alpha); return; }
  c.save();
  c.globalAlpha = alpha;
  if (m.type === 'blood') {
    c.fillStyle = m.color;
    c.beginPath();
    c.ellipse(m.x, m.y, m.rx, m.ry, m.rot, 0, 7);
    c.fill();
  } else if (m.type === 'bloodpool') {
    const s = m.r || 1;
    c.translate(m.x, m.y);
    c.rotate(m.rot);
    // diffuse outer halo where blood has soaked into the dirt
    c.fillStyle = 'rgba(74,14,10,0.28)';
    c.beginPath(); c.ellipse(0, 2, 16 * s, 10 * s, 0, 0, 7); c.fill();
    // irregular satellite blobs and a spatter finger
    c.fillStyle = m.color;
    if (m.blobs) {
      for (const b of m.blobs) {
        c.beginPath(); c.ellipse(b.dx, b.dy + 2, b.rx, b.ry, 0, 0, 7); c.fill();
      }
    }
    // main pool
    c.beginPath(); c.ellipse(0, 2, 13 * s, 8 * s, 0, 0, 7); c.fill();
    // dark, glossy core
    c.fillStyle = 'rgba(48,6,5,0.55)';
    c.beginPath(); c.ellipse(0, 2, 7 * s, 4.5 * s, 0, 0, 7); c.fill();
  } else if (m.type === 'crater') {
    c.translate(m.x, m.y);
    c.fillStyle = 'rgba(30,26,18,0.55)';
    c.beginPath(); c.ellipse(0, 0, m.r * 0.55, m.r * 0.42, m.rot1, 0, 7); c.fill();
    c.fillStyle = 'rgba(20,17,12,0.6)';
    c.beginPath(); c.ellipse(0, 0, m.r * 0.3, m.r * 0.22, m.rot2, 0, 7); c.fill();
  }
  c.restore();
}

function spawnCorpse(a) {
  addGroundMark({
    type: 'bloodpool', x: a.x, y: a.y, rot: rand(0, Math.PI * 2),
    color: `rgba(${randi(90, 120)},${randi(10, 20)},10,0.45)`,
    r: rand(0.85, 1.25),
    blobs: [
      { dx: rand(-14, -8), dy: rand(-5, 5), rx: rand(4, 7), ry: rand(3, 5) },
      { dx: rand(8, 14), dy: rand(-5, 5), rx: rand(3, 6), ry: rand(2, 4) },
    ],
  });
  const us = (a.nation || a.side) === 'us';
  const cp = {
    x: a.x, y: a.y, rot: rand(0, Math.PI * 2),
    side: a.side, nation: a.nation, ttl: CORPSE_TTL,
    // muted base tunic tint drawn from the living unit, darkened toward the dirt
    col: (a.t && a.t.color) || (us ? '#4f6a3a' : '#565d67'),
    // The Progenitor raises the dead straight off G.corpses, and by then the
    // actor is long gone — compactInPlace splices it out the same frame it falls.
    // reanimateAsUndead's light/heavy rule reads t.speed and maxhp, so it has to
    // be evaluated HERE, while they still exist, and carried on the record. One
    // boolean, one source of truth; an old corpse without it reads false and
    // shambles, which is the safe default.
    light: !!(a.t && (a.t.speed >= 34 || a.maxhp <= 90)),
    pose: randi(0, CORPSE_POSES.length - 1),
    // grab-bag of randoms; each pose reads whichever it needs
    arm1: rand(-0.9, -0.3), arm2: rand(0.3, 1.1),
    leg1: rand(-0.55, -0.15), leg2: rand(0.15, 0.5),
    twist: rand(-0.4, 0.4),      // head lolled off the torso axis
    curl: rand(0.6, 1.1),        // how tightly a fetal body is drawn up
    lean: rand(0, 1) < 0.5 ? 1 : -1, // which side a crumpled body folds to
    face: rand(0, 1) < 0.5 ? 1 : -1, // sprawled onto face or back
  };
  // dark-comedy dismemberment: sometimes a limb (or the head) is torn clean
  // off and cartwheels away, leaving a stumped body behind
  if ((a.gib || rand(0, 1) < 0.14)) {
    const parts = pick([['head'], ['legR'], ['armR'], ['head', 'armR'], ['legR', 'legL'], ['armR', 'legR']]);
    cp.missing = {};
    for (const p of parts) {
      cp.missing[p] = true;
      spawnGib(cp, p === 'head' ? 'head' : p[0] === 'l' ? 'leg' : 'arm', us);
    }
  }
  G.corpses.push(cp);
}

// mix a hex tunic colour toward a dark, muddy tone so the fallen read as drained
function muteColor(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mr = 34, mg = 30, mb = 24; // grave-dirt target
  return `rgb(${Math.round(r + (mr - r) * k)},${Math.round(g + (mg - g) * k)},${Math.round(b + (mb - b) * k)})`;
}

// --- shared corpse limb/head primitives (all drawn in body-local space) ---

// a limb as a rounded stroke ending in a boot or a bare hand
function corpseLimb(c, x0, y0, x1, y1, w, col, cap) {
  c.strokeStyle = col;
  c.lineWidth = w;
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  if (cap === 'boot') {
    c.fillStyle = '#241f18';
    c.beginPath(); c.ellipse(x1, y1, 1.9, 1.4, Math.atan2(y1 - y0, x1 - x0), 0, 7); c.fill();
  }
}

// head + helmet at (hx,hy); face>0 shows the pale face, else the helmet dome
function corpseHead(c, hx, hy, skin, helmet, face) {
  c.fillStyle = skin;
  c.beginPath(); c.arc(hx, hy, 2.7, 0, 7); c.fill();
  if (face > 0) {
    c.fillStyle = helmet;
    c.beginPath(); c.ellipse(hx + 1.5, hy - 2.6, 3, 2.1, 0.4, 0, 7); c.fill();
  } else {
    c.fillStyle = helmet;
    c.beginPath(); c.arc(hx, hy, 3.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(15,15,12,0.5)';
    c.lineWidth = 0.9;
    c.beginPath(); c.arc(hx, hy, 3.2, 0, 7); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.10)';
    c.beginPath(); c.arc(hx - 0.8, hy - 0.8, 1.4, 0, 7); c.fill();
  }
}

// torso ellipse with a spine highlight and a webbing/belt line
function corpseTorso(c, col, rx, ry) {
  c.fillStyle = muteColor(col, 0.32);
  c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 7); c.fill();
  c.fillStyle = muteColor(col, 0.18);
  c.beginPath(); c.ellipse(-0.5, -0.6, rx * 0.75, ry * 0.56, 0, 0, 7); c.fill();
  c.strokeStyle = 'rgba(20,18,14,0.5)';
  c.lineWidth = 1.1;
  c.beginPath(); c.moveTo(-rx * 0.45, -ry * 0.5); c.lineTo(-rx * 0.45, ry * 0.5); c.stroke();
}

function handDot(c, x, y, skin) {
  c.fillStyle = skin;
  c.beginPath(); c.arc(x, y, 1.4, 0, 7); c.fill();
}

// 0 — classic sprawl: legs trailing, arms outflung
function poseSprawl(c, cp, P) {
  const lx = -3;
  const l1y = Math.sin(cp.leg1) * 11 - 4, l2y = Math.sin(cp.leg2) * 11 + 4;
  corpseLimb(c, lx, 0, lx - 9, l1y, 3.2, P.limb, 'boot');
  corpseLimb(c, lx, 1, lx - 9, l2y, 3.2, P.limb, 'boot');
  const a1x = 2 + Math.cos(cp.arm1) * 8, a1y = Math.sin(cp.arm1) * 9 - 3;
  const a2x = 2 + Math.cos(cp.arm2) * 8, a2y = Math.sin(cp.arm2) * 9 + 3;
  corpseLimb(c, 2, 0, a1x, a1y, 2.8, P.tunic);
  corpseLimb(c, 2, 0, a2x, a2y, 2.8, P.tunic);
  handDot(c, a1x, a1y, P.skin); handDot(c, a2x, a2y, P.skin);
  corpseTorso(c, cp.col, 8.5, 4.6);
  corpseHead(c, 8, Math.sin(cp.twist) * 3, P.skin, P.helmet, cp.face);
}

// 1 — spread-eagle: all four limbs flung wide, on the back
function poseSpreadEagle(c, cp, P) {
  corpseLimb(c, -3, 0, -12, -7, 3.2, P.limb, 'boot');
  corpseLimb(c, -3, 0, -12, 7, 3.2, P.limb, 'boot');
  corpseLimb(c, 3, 0, 11, -8, 2.8, P.tunic);
  corpseLimb(c, 3, 0, 11, 8, 2.8, P.tunic);
  handDot(c, 11, -8, P.skin); handDot(c, 11, 8, P.skin);
  corpseTorso(c, cp.col, 8, 5);
  corpseHead(c, 9, Math.sin(cp.twist) * 2, P.skin, P.helmet, 1);
}

// 2 — face-down splat: arms reaching overhead, legs together
function poseFaceDown(c, cp, P) {
  corpseLimb(c, -3, -1.5, -11, -3, 3.2, P.limb, 'boot');
  corpseLimb(c, -3, 1.5, -11, 3, 3.2, P.limb, 'boot');
  corpseLimb(c, 4, 0, 13, -4 + cp.twist * 3, 2.8, P.tunic);
  corpseLimb(c, 4, 0, 13, 4 + cp.twist * 3, 2.8, P.tunic);
  handDot(c, 13, -4 + cp.twist * 3, P.skin); handDot(c, 13, 4 + cp.twist * 3, P.skin);
  corpseTorso(c, cp.col, 8, 4.4);
  corpseHead(c, 8.5, Math.sin(cp.twist) * 2, P.skin, P.helmet, -1);
}

// 3 — fetal curl: knees drawn up, arms tucked, head bowed
function poseFetal(c, cp, P) {
  const s = cp.lean; // curl direction
  corpseLimb(c, -2, s * 1, -6, s * (7 * cp.curl), 3.2, P.limb, 'boot');
  corpseLimb(c, -1, s * 2, -4, s * (9 * cp.curl), 3.2, P.limb, 'boot');
  corpseLimb(c, 3, s * 0.5, 6, s * (5 * cp.curl), 2.6, P.tunic);
  handDot(c, 6, s * (5 * cp.curl), P.skin);
  c.save();
  c.scale(1, 0.92);
  corpseTorso(c, cp.col, 7, 5.6);
  c.restore();
  corpseHead(c, 6.5, s * (4 * cp.curl), P.skin, P.helmet, cp.face);
}

// 4 — crumpled sideways: folded at the waist toward one side
function poseCrumpled(c, cp, P) {
  const s = cp.lean;
  corpseLimb(c, -4, 0, -11, -3, 3.2, P.limb, 'boot');
  corpseLimb(c, -4, 1, -9, s * 8, 3.2, P.limb, 'boot');
  corpseLimb(c, 2, 0, 3, s * 8, 2.8, P.tunic);          // arm folded under
  corpseLimb(c, 3, -1, 10, -5, 2.8, P.tunic);            // arm flung out
  handDot(c, 10, -5, P.skin); handDot(c, 3, s * 8, P.skin);
  c.save();
  c.rotate(s * 0.25);
  corpseTorso(c, cp.col, 8, 4.4);
  c.restore();
  corpseHead(c, 8, s * 1.5 + Math.sin(cp.twist) * 2, P.skin, P.helmet, cp.face);
}

// 5 — pitched forward: folded over, rear slightly up, arms beneath
function posePitchedForward(c, cp, P) {
  corpseLimb(c, -3, -3, -12, -6, 3.2, P.limb, 'boot');
  corpseLimb(c, -3, 3, -12, 6, 3.2, P.limb, 'boot');
  corpseLimb(c, 4, -1, 9, -2, 2.6, P.tunic);
  corpseLimb(c, 4, 1, 9, 2, 2.6, P.tunic);
  handDot(c, 9, -2, P.skin); handDot(c, 9, 2, P.skin);
  // hunched torso (bigger, rounder — the back arched up)
  c.fillStyle = muteColor(cp.col, 0.28);
  c.beginPath(); c.ellipse(0, 0, 8.5, 5.4, 0, 0, 7); c.fill();
  c.fillStyle = muteColor(cp.col, 0.1);
  c.beginPath(); c.ellipse(-0.5, -0.5, 6, 3.2, 0, 0, 7); c.fill();
  corpseHead(c, 9, Math.sin(cp.twist) * 2.5, P.skin, P.helmet, -1);
}

const CORPSE_POSES = [poseSprawl, poseSpreadEagle, poseFaceDown, poseFetal, poseCrumpled, posePitchedForward];

// a wet, gaping stump where a limb or head was torn off
function corpseStump(c, x, y, r) {
  c.fillStyle = '#3a0a08';
  c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  c.fillStyle = '#6e1410';
  c.beginPath(); c.arc(x, y, r * 0.55, 0, 7); c.fill();
}

// dismembered sprawl — same as poseSprawl but skips whatever cp.missing lists,
// leaving a bloody stump; the detached parts fly off as gibs
function poseDismembered(c, cp, P) {
  const m = cp.missing || {};
  const lx = -3;
  const l1y = Math.sin(cp.leg1) * 11 - 4, l2y = Math.sin(cp.leg2) * 11 + 4;
  if (m.legL) corpseStump(c, lx, 0, 2.2); else corpseLimb(c, lx, 0, lx - 9, l1y, 3.2, P.limb, 'boot');
  if (m.legR) corpseStump(c, lx, 1.5, 2.2); else corpseLimb(c, lx, 1, lx - 9, l2y, 3.2, P.limb, 'boot');
  const a1x = 2 + Math.cos(cp.arm1) * 8, a1y = Math.sin(cp.arm1) * 9 - 3;
  const a2x = 2 + Math.cos(cp.arm2) * 8, a2y = Math.sin(cp.arm2) * 9 + 3;
  if (m.armL) corpseStump(c, 2, -1, 1.9); else { corpseLimb(c, 2, 0, a1x, a1y, 2.8, P.tunic); handDot(c, a1x, a1y, P.skin); }
  if (m.armR) corpseStump(c, 2, 1, 1.9); else { corpseLimb(c, 2, 0, a2x, a2y, 2.8, P.tunic); handDot(c, a2x, a2y, P.skin); }
  corpseTorso(c, cp.col, 8.5, 4.6);
  if (m.head) corpseStump(c, 6, Math.sin(cp.twist) * 2, 2.4);
  else corpseHead(c, 8, Math.sin(cp.twist) * 3, P.skin, P.helmet, cp.face);
}

// launch a detached part outward from the death site
// Helmet colour for a body, by nation. It lives here because spawnGib and
// paintCorpse both need it and MUST agree — a man whose gibs don't match his
// own corpse reads as two different soldiers. The Wehrmacht blue-grey is the
// fallthrough, which is also what the Horde's reanimated Germans should wear.
function corpseHelmet(cp) {
  if ((cp.nation || cp.side) === 'us') return '#43503a';
  if (cp.nation === 'jp') return '#585630';
  if (cp.nation === 'it') return '#6f7150';   // M33 grigio-verde
  return '#464b53';
}

function spawnGib(cp, kind, us) {
  const ang = rand(0, Math.PI * 2), spd = rand(45, 95);
  G.gibs.push({
    kind, x: cp.x, y: cp.y, z: 3,
    vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd * 0.7, vz: rand(70, 130),
    rot: rand(0, 7), spin: rand(-14, 14),
    col: muteColor(cp.col, 0.32), limb: muteColor(cp.col, 0.5),
    skin: us ? '#9a7350' : '#9c7a58',
    helmet: corpseHelmet(cp),
    landed: false, trail: 0, ttl: CORPSE_TTL,
  });
}

function updateGib(g, dt) {
  g.ttl -= dt;
  if (g.landed) return;
  g.vz -= 340 * dt;                 // gravity on the vertical arc
  g.z += g.vz * dt;
  g.x += g.vx * dt;
  g.y += g.vy * dt;
  g.rot += g.spin * dt;
  // droplets flicked off while it tumbles through the air
  g.trail -= dt;
  if (g.trail <= 0) {
    g.trail = 0.03;
    G.particles.push({
      x: g.x, y: g.y - g.z, vx: rand(-30, 30), vy: rand(-40, 10),
      ttl: rand(0.2, 0.5), grav: 240, size: rand(1, 2),
      color: pick(['#7a1410', '#5c0e0a', '#95201a']),
    });
  }
  if (g.z <= 0) {
    g.z = 0; g.landed = true; g.vx = g.vy = g.spin = 0;
    // it lands with a splat and a small pool of its own
    addGroundMark({
      type: 'bloodpool', x: g.x, y: g.y, rot: rand(0, 7),
      color: `rgba(${randi(90, 120)},${randi(10, 20)},10,0.4)`, r: rand(0.4, 0.7),
    });
    bloodSplat(g.x, g.y, 4);
  }
}

function drawGib(g) {
  const alpha = clamp(g.ttl / 8, 0, 1);
  const c = ctx;
  c.save();
  c.globalAlpha = alpha;
  // shadow stays on the ground; the part itself lifts by z while airborne
  c.fillStyle = `rgba(0,0,0,${0.22 - Math.min(g.z, 40) / 260})`;
  c.beginPath(); c.ellipse(g.x, g.y, 3.5, 2, 0, 0, 7); c.fill();
  c.translate(g.x, g.y - g.z);
  c.rotate(g.rot);
  c.lineCap = 'round';
  if (g.kind === 'head') {
    corpseStump(c, -2.6, 0, 1.3);           // torn neck
    c.fillStyle = g.skin;
    c.beginPath(); c.arc(0, 0, 2.6, 0, 7); c.fill();
    c.fillStyle = g.helmet;
    c.beginPath(); c.arc(0.3, -0.3, 3, 0, 7); c.fill();
    c.strokeStyle = 'rgba(15,15,12,0.5)'; c.lineWidth = 0.8;
    c.beginPath(); c.arc(0.3, -0.3, 3, 0, 7); c.stroke();
  } else if (g.kind === 'leg') {
    c.strokeStyle = g.limb; c.lineWidth = 3.2;
    c.beginPath(); c.moveTo(-4, 0); c.lineTo(4, 0.5); c.stroke();
    c.fillStyle = '#241f18';
    c.beginPath(); c.ellipse(5, 0.5, 1.9, 1.4, 0, 0, 7); c.fill();
    corpseStump(c, -4, 0, 1.6);
  } else { // arm
    c.strokeStyle = g.col; c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(-3.5, 0); c.lineTo(3.5, 0.3); c.stroke();
    c.fillStyle = g.skin;
    c.beginPath(); c.arc(4, 0.3, 1.4, 0, 7); c.fill();
    corpseStump(c, -3.5, 0, 1.3);
  }
  c.restore();
}

// A corpse is fully static once it falls — pose, rotation, palette and any
// dismemberment are all fixed at spawn; only its fade alpha changes. So the body
// is traced once into a per-corpse bitmap and blitted every frame thereafter,
// with rotation and fade applied as a cheap transform. This is the same seam
// living units and, later, sprite-file art will draw through (sprite-cache.js).
// Footprint in world units, comfortably enclosing every pose's flung limbs.
const CORPSE_SPR_W = 40, CORPSE_SPR_H = 36, CORPSE_SPR_AX = 18, CORPSE_SPR_AY = 17;

// paint the body in local space (origin at the torso) — no translate/rotate/alpha
function paintCorpse(c, cp) {
  const us = (cp.nation || cp.side) === 'us';
  const P = {
    tunic: muteColor(cp.col, 0.32),
    limb: muteColor(cp.col, 0.5),
    skin: us ? '#9a7350' : '#9c7a58',
    helmet: corpseHelmet(cp),
  };
  c.lineCap = 'round';

  // soft ground shadow beneath the body
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.beginPath(); c.ellipse(0, 1.5, 11, 5.5, 0, 0, 7); c.fill();

  if (cp.missing) poseDismembered(c, cp, P);
  else (CORPSE_POSES[cp.pose] || poseSprawl)(c, cp, P);
}

function drawCorpse(cp) {
  const alpha = clamp(cp.ttl / 8, 0, 1); // fade out over the last seconds
  // A pack ships one body per army rather than a pose per type, so it is checked
  // before the per-corpse bake — that record carries the same density guard an
  // <img> can never satisfy.
  const ext = SPRITES.get(corpseSpriteId(cp));
  if (ext) { blitSprite(ctx, ext, cp.x, cp.y, cp.rot, alpha); return; }
  // (re)bake if missing or the display density changed under us
  if (!cp._sprite || cp._sprite.ss !== spriteSupersample()) {
    cp._sprite = makeSprite(CORPSE_SPR_W, CORPSE_SPR_H, CORPSE_SPR_AX, CORPSE_SPR_AY,
      (c) => paintCorpse(c, cp));
  }
  blitSprite(ctx, cp._sprite, cp.x, cp.y, cp.rot, alpha);
}

function stampWreck(e) {
  logGroundStamp('wreck', e.x, e.y);
  gctx.save();
  gctx.translate(e.x, e.y);
  gctx.fillStyle = '#2e2c26';
  gctx.fillRect(-20, -14, 40, 28);
  gctx.fillStyle = '#211f1a';
  gctx.beginPath(); gctx.arc(0, 0, 10, 0, 7); gctx.fill();
  gctx.restore();
}

function stampSandbagRubble(s) {
  logGroundStamp('sandbag', s.x, s.y);
  gctx.fillStyle = 'rgba(120,105,70,0.5)';
  gctx.beginPath();
  gctx.ellipse(s.x, s.y, 9, 20, 0, 0, 7);   // the wall stood across the advance
  gctx.fill();
}

// a shot-apart scarecrow leaves a scatter of straw and a snapped post
function stampDummyRubble(d) {
  logGroundStamp('dummy', d.x, d.y);
  gctx.strokeStyle = 'rgba(94,74,44,0.6)';
  gctx.lineWidth = 2;
  gctx.beginPath(); gctx.moveTo(d.x - 4, d.y + 4); gctx.lineTo(d.x + 3, d.y - 6); gctx.stroke();
  gctx.fillStyle = 'rgba(190,160,90,0.45)';
  for (let i = 0; i < 5; i++) {
    gctx.beginPath();
    gctx.ellipse(d.x + rand(-12, 12), d.y + rand(-6, 6), rand(2, 4), rand(1, 2.5), rand(0, 3), 0, 7);
    gctx.fill();
  }
}

// A broken Regio Esercito work. One stamp for all three kinds, scaled off the
// footprint — the ruin of a parapet and the ruin of a bunker read the same from
// above, and what matters is that the ground stays marked so the player can see
// where the enemy line used to run.
function stampItalianWorkRubble(w) {
  logGroundStamp('itwork', w.x, w.y, { kind: w.kind });
  const box = IT_WORK_KINDS[w.kind].box;
  gctx.fillStyle = w.kind === 'bunker' ? 'rgba(96,94,86,0.55)' : 'rgba(104,98,74,0.5)';
  gctx.beginPath();
  gctx.ellipse(w.x, w.y, box.hw * 0.9, box.hh * 0.75, 0, 0, 7);
  gctx.fill();
  gctx.fillStyle = 'rgba(74,70,58,0.5)';
  for (let i = 0; i < 5; i++) {
    gctx.beginPath();
    gctx.ellipse(w.x + rand(-box.hw, box.hw), w.y + rand(-box.hh * 0.7, box.hh * 0.7),
      rand(2.5, 6), rand(2, 4), rand(0, 3), 0, 7);
    gctx.fill();
  }
}

function stampBunkerRubble(b) {
  logGroundStamp('bunker', b.x, b.y);
  // shattered concrete slab plus scattered chunks
  gctx.fillStyle = 'rgba(105,102,92,0.6)';
  gctx.beginPath();
  gctx.ellipse(b.x, b.y, 12, 26, 0, 0, 7);   // the slab stood across the advance
  gctx.fill();
  gctx.fillStyle = 'rgba(80,78,70,0.55)';
  for (let i = 0; i < 6; i++) {
    gctx.beginPath();
    gctx.ellipse(b.x + rand(-9, 9), b.y + rand(-22, 22), rand(3, 7), rand(2, 5), rand(0, 3), 0, 7);
    gctx.fill();
  }
}

function stampWatchtowerRubble(t) {
  logGroundStamp('watchtower', t.x, t.y);
  // splintered timber frame collapsed in a heap
  gctx.fillStyle = 'rgba(80,66,44,0.55)';
  gctx.beginPath();
  gctx.ellipse(t.x, t.y, 18, 8, 0, 0, 7);
  gctx.fill();
  gctx.strokeStyle = 'rgba(60,48,30,0.6)';
  gctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const a = rand(0, Math.PI * 2), len = rand(8, 16);
    gctx.beginPath();
    gctx.moveTo(t.x, t.y);
    gctx.lineTo(t.x + Math.cos(a) * len, t.y + Math.sin(a) * len * 0.5);
    gctx.stroke();
  }
}

function stampCamoNestRubble(cn) {
  logGroundStamp('camonest', cn.x, cn.y);
  // scorched brush and torn netting
  gctx.fillStyle = 'rgba(45,42,30,0.55)';
  gctx.beginPath();
  gctx.ellipse(cn.x, cn.y, 11, 24, 0, 0, 7);   // the net stood across the advance
  gctx.fill();
  gctx.fillStyle = 'rgba(70,60,40,0.5)';
  for (let i = 0; i < 5; i++) {
    gctx.beginPath();
    gctx.ellipse(cn.x + rand(-8, 8), cn.y + rand(-18, 18), rand(3, 6), rand(2, 4), rand(0, 3), 0, 7);
    gctx.fill();
  }
}

function stampAmmoCrateRubble(t) {
  logGroundStamp('ammocrate', t.x, t.y);
  // shattered crates and scattered boards
  gctx.fillStyle = 'rgba(70,58,34,0.5)';
  gctx.beginPath();
  gctx.ellipse(t.x, t.y, 15, 8, 0, 0, 7);
  gctx.fill();
  gctx.strokeStyle = 'rgba(50,40,22,0.6)';
  gctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const a = rand(0, Math.PI * 2), len = rand(6, 13);
    gctx.beginPath();
    gctx.moveTo(t.x, t.y);
    gctx.lineTo(t.x + Math.cos(a) * len, t.y + Math.sin(a) * len * 0.5);
    gctx.stroke();
  }
}

// A hit on a decoy scarecrow. It takes the damage (no cover dodge, no death
// scream — it's straw and burlap), puffs a little debris, and then the shooter
// rolls to see through the ruse. A plain scarecrow fools a man for only so long
// (40% per hit he wises up); a fortified one wearing a helmet, or a hardened
// one in body armor, sells the disguise longer (30% / 20%). Once he's wise he
// permanently ignores THIS decoy and moves on to a real target.
// This is the SECOND gate. The first is dummyFools (js/targeting.js), which
// rolls once, for free, before a man ever aims: half of them never register a
// plain decoy at all. Only the ones it fooled reach this function — the two
// compose, and both record the result in the same dummyBlind Set.
function damageDummy(d, dmg, from, kind) {
  d.hp -= dmg;
  for (let i = 0; i < 3; i++) {
    G.particles.push({
      x: d.x + rand(-6, 6), y: d.y + rand(-14, 6), vx: rand(-30, 30), vy: rand(-50, -10),
      ttl: rand(0.2, 0.5), grav: 180, size: rand(1, 1.8),
      color: pick(['#c9a24a', '#b58a34', '#8a6f2c', '#e0c56a']),
    });
  }
  if (d.hp <= 0) { d.dead = true; return; }   // swept up by compactDefenses in update()
  // Ricochet (dummy unique): the round may come back off the decoy. Independent
  // of the see-through roll below — a man can eat his own bullet and still wise
  // up to the ruse in the same instant — and downstream of the death check, since
  // a decoy coming apart this instant deflects nothing.
  dummyRicochet(d, dmg, from, kind);
  // only an attributed direct attack from an enemy can see through the ruse
  if (from && from.t) {
    const seeThrough = DUMMY_SEE_THROUGH[emplacementTier(d)];
    if (Math.random() < seeThrough) {
      (from.dummyBlind || (from.dummyBlind = new Set())).add(d.id);
    }
  }
}

// a light metallic spark thrown off when body/flak armor eats a hit
function armorPing(u) {
  for (let i = 0; i < 3; i++) {
    G.particles.push({
      x: u.x + rand(-6, 6), y: u.y + rand(-10, 4), vx: rand(-45, 45), vy: rand(-70, -15),
      ttl: rand(0.12, 0.3), grav: 200, size: rand(1, 1.8),
      color: pick(['#d8e0ea', '#aab4c0', '#f0f2d8']),
    });
  }
}

function damageUnit(u, dmg, from, kind) {
  // `kind` is forwarded: Ricochet deflects bullets only, and this shunt is the
  // one place that knows what sort of attack reached the decoy.
  if (u.isDummy) return damageDummy(u, dmg, from, kind);
  // Escalation IV: every attack an enemy lands on your men, at the one point
  // they all funnel through. Every actor on the far side is side 'de' whatever
  // its nation, so this is a clean binary — and stray friendly blasts, which
  // arrive here with an American `from`, are untouched. Note explode() and the
  // shrapnel loop have to FORWARD their firer for this to see them; passing a
  // bare {x,y} (as they used to) makes a German shell indistinguishable from
  // a friendly one and silently skips the modifier.
  if (G.esc && from && from.side === 'de') dmg *= G.esc.enemyDmgMult;
  // Morphine Syrette: a freshly-patched man eats part of the hit. Sits here,
  // ahead of the armor pools, so the plate soaks a smaller blow too and the dose
  // is worth the same to an armored man as to a bare one. Side-blind on purpose
  // — a stray friendly shell hurts a drugged man less as well.
  if (u.medicGuard > 0) dmg *= 1 - MEDIC_GUARD_REDUCTION;
  const incoming = dmg;
  // Body/Flak Armor: the matching pool soaks damage before HP is touched.
  // Bullets chip Body Armor, explosions chip Flak Armor; a hit bigger than the
  // bar breaks it and the remainder spills through to HP. Flame and melee carry
  // no such `kind`, so they bypass both pools and strike HP directly.
  if (kind === 'bullet' && u.bodyArmor > 0) {
    const absorbed = Math.min(u.bodyArmor, dmg);
    u.bodyArmor -= absorbed; dmg -= absorbed;
    armorPing(u);
  } else if (kind === 'blast' && u.flakArmor > 0) {
    // HEAT Rounds, on the same terms as the enemy path: the jet is side-blind,
    // so a stray rocket of your own goes through your man's flak vest too.
    if (heatPierces(from, kind)) heatPierceSpark(u);
    else {
      const absorbed = Math.min(u.flakArmor, dmg);
      u.flakArmor -= absorbed; dmg -= absorbed;
      armorPing(u);
    }
  }
  if (dmg <= 0) {                            // fully soaked — no HP loss, no blood
    if (incoming >= 3) tryGoProne(u, 0.65);  // still flinch from being shot at
    return;
  }
  u.hp -= dmg;
  if (u.t.tank || u.t.vehicle || u.t.gunEmplacement) {
    G.particles.push({
      x: u.x + rand(-10, 10), y: u.y + rand(-10, 10), vx: 0, vy: -20,
      ttl: 0.4, grav: 0, size: 2, color: '#c8b872',
    });
  } else {
    bloodSplat(u.x, u.y, 3);
  }
  if (u.hp <= 0 && !u.dead) {
    const hooks = G.cardHooks && G.cardHooks[u.type];
    const saved = hooks && hooks.beforeDeath.length && hooks.beforeDeath.some(fn => fn(u));
    if (!saved) {
      u.dead = true;
      recapUnitLost(u, from);
      if (u.t.tank) {
        stampWreck(u);
        explode(u.x, u.y, 50, 60, true);
      } else if (u.t.vehicle) {
        stampJeepWreck(u);
        explode(u.x, u.y, 30, 45, false);
      } else if (u.t.gunEmplacement) {
        stampATGunWreck(u);
        explode(u.x, u.y, 26, 35, false);
      } else if (u.infected > 0) {
        // a man lost while infected doesn't stay down — he rises against his line
        reanimateAsUndead(u);
      } else {
        spawnCorpse(u);
        bloodSplat(u.x, u.y, 8);
        SFX.scream();
      }
      const si = G.selected.indexOf(u);
      if (si !== -1) G.selected.splice(si, 1);
      // last acts: cards that fire when the man goes down (Dead Man's Switch)
      if (hooks && hooks.onDeath.length) for (const fn of hooks.onDeath) fn(u);
    }
  }
  // taking real fire (bullets, shells) sends a man diving; flame's tiny
  // per-tick damage is handled in flameSpray with a time-scaled roll.
  // Keyed on `incoming` so an armored man still reacts to fire his plate ate.
  if (incoming >= 3) tryGoProne(u, 0.65);
}

function gainXP(u) {
  u.xp++;
  const next = RANKS[u.rank + 1];
  const rankMult = u.t.tank ? 2.5 : (u.t.rankMult || 1);
  const need = next && next.kills * rankMult;
  if (next && u.xp >= need) {
    u.rank++;
    const heal = 15 * (u.t.rankHealMult || 1);
    u.hp = Math.min(u.maxhp, u.hp + heal);   // a promotion is good for morale
    if (u.side === 'us') SFX.promote();
    G.texts.push({ x: u.x, y: u.y - 22, text: 'PROMOTED: ' + next.name, ttl: 2.4 });
  }
}

// testing-mode RANK UP ability: promotes a unit by exactly one grade,
// regardless of side. Germans are never given xp/rank fields on spawn (they
// don't earn kills), so those default to 0 the first time one is touched
// here — same as a fresh US recruit.
function rankUpUnit(u) {
  u.rank = u.rank || 0;
  u.xp = u.xp || 0;
  const next = RANKS[u.rank + 1];
  if (!next) return;
  u.rank++;
  const rankMult = u.t.tank ? 2.5 : (u.t.rankMult || 1);
  u.xp = Math.max(u.xp, next.kills * rankMult);
  const heal = 15 * (u.t.rankHealMult || 1);
  u.hp = Math.min(u.maxhp, u.hp + heal);
  SFX.promote();
  G.texts.push({ x: u.x, y: u.y - 22, text: 'PROMOTED: ' + next.name, ttl: 2.4 });
}

// testing-mode PURGE ability: instantly destroys every unit and emplacement
// — American and German alike — inside the radius. Routes kills through
// damageUnit/damageEnemy so tanks and vehicles still leave their proper
// wreck and secondary blast instead of just vanishing; emplacements and
// mines are dropped straight to 0/dead and swept up by the normal cleanup
// pass in update().
function purgeRadius(x, y, r) {
  const at = { x, y };
  for (const u of G.units) if (!u.dead && dist(u, at) < r) damageUnit(u, 99999, at);
  for (const e of G.enemies) if (!e.dead && dist(e, at) < r) damageEnemy(e, 99999, at);
  for (const s of G.sandbags) if (dist(s, at) < r) s.hp = 0;
  for (const b of G.bunkers) if (dist(b, at) < r) b.hp = 0;
  for (const wt of G.watchtowers) if (dist(wt, at) < r) wt.hp = 0;
  for (const cn of G.camoNests) if (dist(cn, at) < r) cn.hp = 0;
  for (const ac of G.ammoCrates) if (dist(ac, at) < r) ac.hp = 0;
  for (const d of G.dummies) if (dist(d, at) < r) d.hp = 0;
  for (const wr of G.wires) if (Math.abs(wr.x - x) < r + 35 && Math.abs(wr.y - y) < r) wr.hp = 0;
  for (const w of G.itWorks) if (dist(w, at) < r) w.hp = 0;
  for (const m of G.mines) if (!m.dead && dist(m, at) < r) m.dead = true;
}

function creditKill(u) {
  // only living friendly soldiers earn XP (explosions pass a plain {x,y})
  if (!u || u.side !== 'us' || u.dead) return;
  gainXP(u);
  // every kill in the game funnels through here with the true shooter, so
  // this is the one dispatch point for on-kill card effects
  const hooks = G.cardHooks && G.cardHooks[u.type];
  if (hooks) for (const fn of hooks.onKill) fn(u);
}

// The plate a multi-actor boss's CHILDREN wear, read off the parent's remaining
// health segments: one step of resistance per segment still intact behind the one
// being fought, so a whole boss's parts sit at 2 x 33% = 66%, one broken segment
// drops them to 33%, and on the last segment they are bare. It makes the PARENT
// the way in on all three — going for the guns first is the slow route, because a
// part's armor is the boss's own health.
//
// Derived from the parent's `phase` rather than stamped on the parts when a
// segment breaks, for the same reason the phase itself is polled instead of
// hooked in here: nothing has to remember to update it, and a part that was
// revived by damage control and one that has stood since the boss arrived read the
// same number. It is a MULTIPLIER and not an armor pool — a pool soaks a fixed
// amount once and is gone, while this is a standing property only the parent's own
// HP can strip (the same distinction ESCALATION rung VI turns on).
//
// Returns the fraction of incoming damage the part actually takes: 1 for anything
// that isn't a child, for a part with no parent (a stray TEST.deploy('ittur')),
// and for the Yamato's belt, which is FIVE ACTORS ON HER OWN POOL — plating that
// would just be plating her, and damageEnemy redirects it away below in any case.
function bossPartDamageMult(p) {
  const t = p.t;
  if (t.hullSection) return 1;
  if (t.shipPart) return partPlate(p.shipOf, YAM_SEGMENTS, YAM_PART_RESIST);
  if (t.bossPart) return partPlate(p.bossOf, PROG_SEGMENTS, PROG_POD_RESIST);
  if (t.trainPart) return partPlate(p.trainOf, TRAIN_SEGMENTS, TRAIN_PART_RESIST);
  return 1;
}

function partPlate(parent, segments, resist) {
  if (!parent) return 1;
  const intact = Math.max(0, segments - 1 - (parent.phase || 0));
  return Math.max(0, 1 - resist * intact);
}

// All a child actor's death does differently from its siblings': what the notice
// says and what it leaves behind. Everything else about the three — TP, credit,
// no kill count, no recap, no corpse, dropped from the selection — is shared, in
// damageEnemy below. The pod VENTS rather than explodes: the sac is full of the
// same infectious bile it was spitting, so bursting one at close range costs the
// man who did it. A wagon leaves a coupled hulk (syncTrainParts repositions dead
// parts on purpose), which is why its blast is the tub's and not the engine's.
const PART_DEATH = {
  ship: { text: 'KNOCKED OUT', burst: e => explode(e.x, e.y, 30, 40, false) },
  train: { text: 'KNOCKED OUT', burst: e => explode(e.x, e.y, 30, 40, false) },
  pod: {
    text: 'POD BURST', color: '#b6e88a',
    burst: e => {
      const sp = e.t.spit;
      if (sp) bileBurst(e.x, e.y, sp.r * 0.8, sp.dmg * 0.8, sp.infect, e);
    },
  },
};

function damageEnemy(e, dmg, from, kind) {
  if (e.chute > 0) return; // untouchable while the canopy is up
  // and likewise the Yamato's roll-in, hull and parts alike. The targeting gate
  // already stops anyone aiming at her; this catches the side-blind paths that
  // never aim at all — explode's splash reaching a belt section just off the edge.
  // Above the belt redirect below, or a hit on a jyhull would route straight past it.
  if (e.entering) return;
  // The Yamato's armor belt is five actors on ONE pool: a hit anywhere along it
  // is a hit on the ship. Doing this here rather than per-weapon means bullets,
  // blast, flame and melee all route correctly for free. Keyed on the type flag
  // so a stray TEST.deploy('jyhull') with no parent can't throw.
  if (e.t.hullSection && e.shipOf && !e.dead) return damageEnemy(e.shipOf, dmg, from, kind);
  // Every multi-actor boss's children are plated by their PARENT's condition —
  // see bossPartDamageMult. Scaled here, above the armor pools, so every source
  // (bullets, blast, flame, melee, the train's own crush) routes through it for
  // free, exactly as the belt redirect above does. It is a scale on the damage
  // and NOT a shared pool, so explode/flameSpray still need no de-dupe clause
  // for any of the three. Below the belt redirect on purpose: a hit on her armor
  // is a hit on HER, and must not be plated by her own health.
  dmg *= bossPartDamageMult(e);
  const incoming = dmg;
  // Body/Flak Armor (endless: some enemies spawn plated — see armorEnemy).
  // Bullets chip body armor, explosions chip flak; a hit bigger than the bar
  // breaks it and spills the remainder into HP. Flame/melee carry no kind and
  // bypass both pools, exactly as on the player's own armor.
  if (kind === 'bullet' && e.bodyArmor > 0) {
    const absorbed = Math.min(e.bodyArmor, dmg);
    e.bodyArmor -= absorbed; dmg -= absorbed;
    armorPing(e);
  } else if (kind === 'blast' && e.flakArmor > 0) {
    // HEAT Rounds: a bazooka's shaped charge holes the plate rather than
    // wearing it down — the pool is skipped whole and the vest is left on the
    // man, unchipped, for whatever lands on him next.
    if (heatPierces(from, kind)) heatPierceSpark(e);
    else {
      const absorbed = Math.min(e.flakArmor, dmg);
      e.flakArmor -= absorbed; dmg -= absorbed;
      armorPing(e);
    }
  }
  if (dmg <= 0) {                          // fully soaked — no wound, no blood
    if (incoming >= 3) tryGoProne(e, 0.65); // still flinch from being shot at
    return;
  }
  e.hp -= dmg;
  if (e.t.tank || e.t.vehicle || e.t.v2) {
    G.particles.push({
      x: e.x + rand(-10, 10), y: e.y + rand(-10, 10), vx: 0, vy: -20,
      ttl: 0.4, grav: 0, size: 2, color: '#c8b872',
    });
  } else {
    bloodSplat(e.x, e.y, 3);
  }
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    // A gun tub going quiet, a pus module bursting and a wagon knocked out are
    // all the SAME kind of event, and were three copies of it: TP and credit to
    // the shooter, but it is not a man — no kill count, no recap, no corpse. One
    // early return, so the vehicle chain below never has to be re-audited for
    // any of the three, and a fourth multi-actor boss is one row in PART_DEATH.
    if (isBossPart(e.t)) {
      earnTP(e.t.reward);
      creditKill(from);
      const d = PART_DEATH[e.t.shipPart ? 'ship' : e.t.bossPart ? 'pod' : 'train'];
      G.texts.push({ x: e.x, y: e.y - 20, text: d.text, ttl: 1.4, color: d.color });
      d.burst(e);
      const pi = G.selected.indexOf(e);
      if (pi !== -1) G.selected.splice(pi, 1);
      return;
    }
    G.kills++;
    earnTP(e.t.reward);
    creditKill(from);
    recapEnemyKilled(e, from);
    if (e.t.ship) {
      // she goes up all along her length. The parts are killed DIRECTLY and the
      // secondaries go through the shell queue rather than calling explode here:
      // explode -> damageEnemy -> this block -> explode would recurse.
      // `|| []` for the same reason the mass's pods carry it: parts are built by
      // initYamato on her first tick, so a hull killed before she has ever been
      // updated has no list at all — TEST.deploy('jyamato') followed straight by
      // damage is exactly that, and it used to throw here and abort the death.
      const shipParts = e.parts || [];
      for (let i = 0; i < shipParts.length; i++) {
        const p = shipParts[i];
        if (p.dead) continue;
        p.dead = true;
        scheduleShell(p.x, p.y, 0.12 + i * 0.16, 55, 60, true, null);
      }
      stampWreck(e);
      explode(e.x, e.y, 70, 90, true);
    } else if (e.t.hordeBoss) {
      // the mass comes apart. Its pods are killed DIRECTLY and their bile vented
      // by hand rather than by routing back through damageEnemy: this block IS
      // the enemy death path, so re-entering it would recurse. Same reasoning as
      // the ship above, and the reason neither uses explode() here.
      for (const p of (e.pods || [])) {
        if (p.dead) continue;
        p.dead = true;
        const sp = p.t.spit;
        if (sp) bileBurst(p.x, p.y, sp.r * 0.8, sp.dmg * 0.8, sp.infect, e);
      }
      bloodSplat(e.x, e.y, 30);
      addGroundMark({ type: 'crater', x: e.x, y: e.y, r: 46, rot1: rand(0, 3), rot2: rand(0, 3) });
      explode(e.x, e.y, 50, 40, true);
    } else if (e.t.itaBoss) {
      // the engine dies and the whole consist goes up along the rails. Parts are
      // killed DIRECTLY and the secondaries go through the shell queue — the
      // same recursion reasoning as the ship. Each wagon leaves its own wreck
      // decal, so a burnt train stays stamped on the field where it stopped.
      // `|| []` for the ship's reason: initWarTrain builds the consist lazily on
      // the first tick, so an engine killed before it has ever been updated has
      // no parts list — TEST.deploy('itrain') and immediate damage hit exactly
      // that, and the throw took bossVictory() down with it.
      const trainParts = e.parts || [];
      for (let i = 0; i < trainParts.length; i++) {
        const p = trainParts[i];
        // wreck decals for the armored wagons only — four crew posts would just
        // stamp one overlapping blob over the gun wagon's own. Stamped for the
        // ALREADY-dead ones too, above the skip: a wagon knocked out earlier is
        // drawn as a coupled hulk only while the consist is drawn at all, and
        // drawWarTrainPass drops the whole train the moment the engine dies — so
        // without this the stripped-consist death above would leave nothing on
        // the field but one engine wreck. They owe a decal, not a second blast.
        if (p.t.tank) stampWreck(p);
        if (p.dead) continue;
        p.dead = true;
        scheduleShell(p.x, p.y, 0.14 + i * 0.16, 45, 55, true, null);
      }
      stampWreck(e);
      explode(e.x, e.y, 60, 80, true);
    } else if (e.t.awalker) {
      // whatever is inside it goes up hard. Note it is deliberately absent from
      // the bossVictory() chain at the bottom of this block: the walker is an
      // easter egg, not a rung on the ESCALATION ladder — it just dies.
      stampWreck(e);
      explode(e.x, e.y, 75, 110, true);
    } else if (e.t.tank) {
      stampWreck(e);
      explode(e.x, e.y, 50, 60, true);
    } else if (e.t.bike) {
      // bike shot out from under the crew: it crashes with both men aboard
      stampBike(e, true);
      bloodSplat(e.x, e.y, 10);
    } else if (e.t.apc) {
      stampHalftrackWreck(e);
      explode(e.x, e.y, 38, 55, false);
    } else if (e.t.vehicle) {
      stampJeepWreck(e);
      explode(e.x, e.y, 30, 45, false);
    } else if (e.t.v2) {
      // the battery itself going up is a big secondary explosion — the
      // warhead and fuel still on the pad don't go quietly
      stampV2Wreck(e);
      explode(e.x, e.y, 65, 100, true);
    } else if (e.t.bloat) {
      // a Bloater vents its cloud of infectious rot instead of leaving a corpse
      bloaterBurst(e);
    } else {
      spawnCorpse(e);
      bloodSplat(e.x, e.y, 8);
      SFX.scream();
    }
    // hit-squad mode: drop the fallen man from the player's selection
    const si = G.selected.indexOf(e);
    if (si !== -1) G.selected.splice(si, 1);
    // the boss falling is a victory: freeze the field and offer the choice
    // to take the win or fight on (flow.js)
    if (isFinalBoss(e.t)) bossVictory();
  }
  if (dmg >= 3) tryGoProne(e, 0.65);
  // Shell Shocked: a surviving enemy hit by a mortarman is dazed for a beat
  maybeShellShock(e, from);
}
