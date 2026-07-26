/* Trenchworks: WW2 — The Horde renderer.
   A self-contained painter for the 'zo' roster: shamblers, runners, crawlers,
   infected hounds, brutes, spitters, bloaters, screamers, gun-toting revenants
   and the towering Abomination. Dispatched from paintSoldierBody (render-soldier.js)
   whenever a.nation === 'zo'. Same local-space contract as the other faction
   painters: the caller has translated to the unit; we draw around the origin and
   orient by a.face.
   Part of a set of plain scripts sharing one global scope; load order in index.html. */
'use strict';

const ZOM_SKIN = '#93a06a';     // sickly grey-green flesh
const ZOM_SKIN_DK = '#6c7748';
const ZOM_BONE = '#d0c8ac';     // exposed bone / skull
const ZOM_BLOOD = '#7c1a1c';    // old dried gore
const ZOM_BLOOD_WET = '#a52a24';
const ZOM_EYE = '#c8e86a';      // faint luminous eye
const ZOM_BILE = '#8fe06a';     // spitter/bloater rot green

// clawed hand: a small knot with three splayed fingers reaching outward
function drawClaw(c, x, y, ang, s) {
  c.strokeStyle = ZOM_SKIN_DK;
  c.lineWidth = 1;
  for (const off of [-0.5, 0, 0.5]) {
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(ang + off) * 2.4 * s, y + Math.sin(ang + off) * 2.4 * s);
    c.stroke();
  }
  c.fillStyle = ZOM_SKIN;
  c.beginPath(); c.arc(x, y, 1.1 * s, 0, 7); c.fill();
}

// two arms reaching forward toward the prey (the classic outstretched grope).
// `spread` widens the reach for lumbering types, `len` extends it for lungers.
function drawReachingArms(c, fx, fy, color, len, spread, s) {
  const px = -fy, py = fx;
  for (const side of [-1, 1]) {
    const sx = px * 3 * side, sy = py * 3 * side;                 // shoulder
    const hx = fx * len + px * spread * side, hy = fy * len + py * spread * side; // hand
    c.strokeStyle = color;
    c.lineWidth = 2.4 * s;
    c.beginPath();
    c.moveTo(sx, sy);
    c.quadraticCurveTo(fx * len * 0.5 + px * spread * 1.4 * side, fy * len * 0.5 + py * spread * 1.4 * side, hx, hy);
    c.stroke();
    drawClaw(c, hx, hy, Math.atan2(fy, fx), s);
  }
}

// a rotted head: greenish skull with a slack jaw, a smear of gore, one dim eye.
// `skull` exposes more bone (later-stage decay).
function drawZombieHead(c, fx, fy, r, skull) {
  const hx = fx * 1.5, hy = fy * 1.5;
  c.fillStyle = ZOM_SKIN;
  c.beginPath(); c.arc(hx, hy, r, 0, 7); c.fill();
  c.strokeStyle = ZOM_SKIN_DK; c.lineWidth = 0.8; c.stroke();
  if (skull) {
    // a patch of bare skull on the crown
    c.fillStyle = ZOM_BONE;
    c.beginPath(); c.arc(hx - fx * 0.6, hy - fy * 0.6, r * 0.55, 0, 7); c.fill();
  }
  // slack jaw hanging toward the prey
  c.fillStyle = ZOM_SKIN_DK;
  c.beginPath(); c.ellipse(hx + fx * r * 0.7, hy + fy * r * 0.7, r * 0.5, r * 0.4, Math.atan2(fy, fx), 0, 7); c.fill();
  // one luminous eye
  c.fillStyle = ZOM_EYE;
  const px = -fy, py = fx;
  c.beginPath(); c.arc(hx + px * r * 0.4, hy + py * r * 0.4, 0.9, 0, 7); c.fill();
  // gore smear at the mouth
  c.fillStyle = ZOM_BLOOD;
  c.beginPath(); c.arc(hx + fx * r * 0.8, hy + fy * r * 0.8, 1, 0, 7); c.fill();
}

// scattered wounds/gore on a torso ellipse
function drawGore(c, w, h, ang, n) {
  c.fillStyle = ZOM_BLOOD;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + 1.1;
    c.beginPath();
    c.arc(Math.cos(a) * w * 0.5, Math.sin(a) * h * 0.5, rand(0.6, 1.4), 0, 7);
    c.fill();
  }
}

// a torn ribcage poking through the flesh (brute / abomination)
function drawRibs(c, fx, fy, s) {
  const px = -fy, py = fx;
  c.strokeStyle = ZOM_BONE;
  c.lineWidth = 0.8 * s;
  for (let i = -1; i <= 1; i++) {
    const cx = fx * i * 1.6, cy = fy * i * 1.6;
    c.beginPath();
    c.moveTo(cx - px * 2 * s, cy - py * 2 * s);
    c.lineTo(cx + px * 2 * s, cy + py * 2 * s);
    c.stroke();
  }
}

// ---- the infected war hound: a lean quadruped, nothing like the men ----
function paintZombieHound(c, a) {
  const fx = Math.cos(a.face), fy = Math.sin(a.face);
  const px = -fy, py = fx;
  const t = a.t;
  c.save();
  // shadow
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath(); c.ellipse(0, 3, 9, 3.5, 0, 0, 7); c.fill();
  // elongated body along the run axis
  c.fillStyle = t.color;
  c.beginPath(); c.ellipse(0, 0, 7.5, 3.4, a.face, 0, 7); c.fill();
  c.strokeStyle = ZOM_SKIN_DK; c.lineWidth = 0.9; c.stroke();
  // patchy exposed flank
  c.fillStyle = ZOM_BLOOD;
  c.beginPath(); c.arc(-fx * 1.5 + px * 1.2, -fy * 1.5 + py * 1.2, 1.5, 0, 7); c.fill();
  // four legs, mid-stride
  c.strokeStyle = ZOM_SKIN_DK; c.lineWidth = 1.4;
  for (const [along, side, kick] of [[3.5, 1, 0.5], [3.5, -1, -0.3], [-3.5, 1, -0.4], [-3.5, -1, 0.5]]) {
    const bx = fx * along + px * 2 * side, by = fy * along + py * 2 * side;
    c.beginPath();
    c.moveTo(bx, by);
    c.lineTo(bx + px * 2.4 * side + fx * kick, by + py * 2.4 * side + fy * kick);
    c.stroke();
  }
  // neck + snouted head lunging forward
  c.fillStyle = ZOM_SKIN;
  c.beginPath(); c.arc(fx * 8, fy * 8, 2.6, 0, 7); c.fill();
  c.fillStyle = ZOM_SKIN_DK;
  c.beginPath(); c.ellipse(fx * 10, fy * 10, 2.4, 1.4, a.face, 0, 7); c.fill();   // snout
  // bared teeth
  c.fillStyle = ZOM_BONE;
  c.beginPath(); c.arc(fx * 11, fy * 11, 0.7, 0, 7); c.fill();
  // luminous eye + ragged ear
  c.fillStyle = ZOM_EYE;
  c.beginPath(); c.arc(fx * 8.4 + px * 1.4, fy * 8.4 + py * 1.4, 0.8, 0, 7); c.fill();
  c.strokeStyle = ZOM_SKIN_DK; c.lineWidth = 1;
  c.beginPath(); c.moveTo(fx * 7 + px * 1.5, fy * 7 + py * 1.5); c.lineTo(fx * 6 + px * 3, fy * 6 + py * 3); c.stroke();
  // lashing tail
  c.beginPath(); c.moveTo(-fx * 6, -fy * 6); c.lineTo(-fx * 9 + px * 2, -fy * 9 + py * 2); c.stroke();
  c.restore();
}

// ---- the main humanoid painter (everything but the hound) ----
function paintZombieSoldier(c, a) {
  if (a.t.hound) { paintZombieHound(c, a); return; }
  const t = a.t;
  const type = a.type;
  const fx = Math.cos(a.face), fy = Math.sin(a.face);
  const px = -fy, py = fx;
  const isBrute = type === 'zbrute';
  const isBoss = type === 'zabom';
  const isBloat = type === 'zbloater';
  const isSpit = type === 'zspitter';
  const isScream = type === 'zscreamer';
  const isCrawl = type === 'zcrawler';
  const isRev = type === 'zrevenant';
  const isRunner = type === 'zrunner';
  // scale: crawlers small, brutes big, the Abomination huge
  const s = isBoss ? 1.9 : isBrute ? 1.35 : isBloat ? 1.15 : isCrawl ? 0.72 : 1;
  c.save();

  // shadow, scaled to the mass
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath(); c.ellipse(0, 3 * s, 8 * s, 4 * s, 0, 0, 7); c.fill();

  // a crawler has no legs — it's the top half dragging itself, elongated backward
  if (isCrawl) {
    c.fillStyle = t.color;
    c.beginPath(); c.ellipse(-fx * 2, -fy * 2, 6, 3, a.face, 0, 7); c.fill();
    // trailing entrails
    c.strokeStyle = ZOM_BLOOD; c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(-fx * 4, -fy * 4);
    c.lineTo(-fx * 8 + px, -fy * 8 + py);
    c.stroke();
  }

  // ---- reaching arms (the melee mob gropes forward; the revenant holds a rifle)
  if (!isRev) {
    const len = (isRunner ? 9 : isCrawl ? 7 : 6.5) * (isBoss ? 1.5 : 1);
    const spread = isBrute || isBoss ? 4.5 : 3;
    drawReachingArms(c, fx, fy, isCrawl ? ZOM_SKIN_DK : t.color, len, spread, s);
  }

  // ---- revenant's Kar98, thrust ahead in dead hands
  if (isRev) {
    const gunLen = t.gun;
    const tipX = fx * gunLen, tipY = fy * gunLen;
    c.strokeStyle = '#2a2a20'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(fx * 2, fy * 2); c.lineTo(tipX, tipY); c.stroke();
    c.strokeStyle = '#5a4a2e'; c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(fx * 0.8 - px * 2, fy * 0.8 + py * 2);
    c.lineTo(fx * gunLen * 0.62, fy * gunLen * 0.62);
    c.stroke();
    // one dead arm slung along the stock
    c.strokeStyle = ZOM_SKIN; c.lineWidth = 2;
    c.beginPath(); c.moveTo(px * 3, py * 3); c.lineTo(fx * 5 + px * 1.5, fy * 5 + py * 1.5); c.stroke();
    drawClaw(c, fx * 5 + px * 1.5, fy * 5 + py * 1.5, a.face, 1);
  }

  // ---- torso: a hunched, rotted ellipse
  if (!isCrawl) {
    const bodyW = (isBoss ? 10 : isBrute ? 8.5 : isBloat ? 8.5 : 6.6) ;
    const bodyH = (isBoss ? 8 : isBrute ? 6.5 : isBloat ? 7.5 : 5);
    c.fillStyle = t.color;
    c.beginPath(); c.ellipse(0, 0, bodyW, bodyH, a.face, 0, 7); c.fill();
    c.strokeStyle = 'rgba(14,15,11,0.6)'; c.lineWidth = 1.1; c.stroke();
    drawGore(c, bodyW, bodyH, a.face, isBoss ? 7 : 4);
    if (isBrute || isBoss) drawRibs(c, fx, fy, s);
  }

  // ---- bloater: a taut, swollen gas-bag with boils, faintly pulsing
  if (isBloat) {
    const pulse = 1 + Math.sin((G.time || 0) * 3 + (a.wobble || 0)) * 0.06;
    c.fillStyle = ZOM_BILE;
    c.globalAlpha = 0.5;
    c.beginPath(); c.ellipse(0, 0, 8.5 * pulse, 7.5 * pulse, a.face, 0, 7); c.fill();
    c.globalAlpha = 1;
    // boils
    c.fillStyle = '#b6e88a';
    for (let i = 0; i < 5; i++) {
      const ang = i / 5 * Math.PI * 2;
      c.beginPath(); c.arc(Math.cos(ang) * 4, Math.sin(ang) * 3.5, rand(1, 1.8), 0, 7); c.fill();
    }
  }

  // ---- spitter: a distended bile sac at the throat, dribbling
  if (isSpit) {
    c.fillStyle = ZOM_BILE;
    c.beginPath(); c.ellipse(fx * 3, fy * 3, 3.2, 2.6, a.face, 0, 7); c.fill();
    c.strokeStyle = '#5f8f3a'; c.lineWidth = 0.8; c.stroke();
    // a drip if the maw is charging/open
    if (a.spitT > 0) {
      c.fillStyle = ZOM_BILE;
      c.beginPath(); c.arc(fx * 5.5, fy * 5.5, 1.4, 0, 7); c.fill();
    }
  }

  // ---- head (crawler & most humanoids). Later/uglier types show more skull.
  if (isBoss) {
    // the Abomination has a lolling, half-buried head plus a second fused skull
    drawZombieHead(c, fx, fy, 3.4, true);
    c.fillStyle = ZOM_BONE;
    c.beginPath(); c.arc(px * 4, py * 4, 2, 0, 7); c.fill();
  } else {
    drawZombieHead(c, fx, fy, isBrute ? 3 : isCrawl ? 2 : 2.4, isBrute || isScream || isRev);
  }

  // ---- screamer: a permanently gaping, blood-rimmed maw
  if (isScream) {
    c.strokeStyle = ZOM_BLOOD_WET; c.lineWidth = 1.2;
    c.beginPath(); c.arc(fx * 1.8, fy * 1.8, 2.6, 0, 7); c.stroke();
    c.fillStyle = '#2a1010';
    c.beginPath(); c.arc(fx * 1.8, fy * 1.8, 1.5, 0, 7); c.fill();
  }

  // ---- bite lunge flash: a quick forward snap when it mauls a defender
  if (a.slashT > 0) {
    const tp = clamp(a.slashT / 0.26, 0, 1);
    const reach = 9 * s;
    c.strokeStyle = `rgba(165,42,36,${0.7 * tp})`;
    c.lineWidth = 1.8;
    c.beginPath();
    c.arc(0, 0, reach, a.face - 0.6 * tp, a.face + 0.6 * tp);
    c.stroke();
  }

  c.restore();
}

// ---- The Progenitor: the wave-100 boss -------------------------------------
// Drawn in a pass of its own rather than through paintZombieSoldier, for three
// reasons that are all load-bearing:
//   1. that path runs through soldierSprite, which bakes into a 48px box with a
//      24-unit half-extent (SOLDIER_SPR). A mass this size would be clipped, and
//      the box can't grow without re-baking every soldier in the game.
//   2. the body breathes on a live timer, which would force a permanent
//      soldierCacheable exclusion and drop it out of the cache anyway.
//   3. the tendrils have to be drawn between the core and its pods as ONE figure,
//      and escorting horde should paint OVER the mass — exactly the reason the
//      Yamato has a pass of her own.

const PROG_BODY_R = 26;         // core radius the lobes are hung off
const PROG_SKIN = '#4a5834';    // the mass: darker and greyer than a walking corpse
const PROG_SKIN_DK = '#36422a'; // alternating lobe shade — without it the body reads as one flat disc
const PROG_SKIN_LT = '#5c6c40';
const PROG_PUS = '#c8d86a';     // the sacs: swollen, jaundiced, lit from within

// PURE: local space, origin at the core, reads nothing but the actor's own
// fields. The codex portrait calls this directly, where a bare makeEnemy() has no
// .pods to draw tendrils to — same contract as paintYamatoHull.
function paintProgenitorBody(c, a) {
  const breathe = 1 + Math.sin((G ? G.time : 0) * 1.6 + (a.wobble || 0)) * 0.045;
  const fx = Math.cos(a.face), fy = Math.sin(a.face);
  const px = -fy, py = fx;        // the perpendicular, for the ribcage below

  c.save();
  c.scale(breathe, breathe);

  // groping limbs first, so the mass paints over the shoulders
  drawReachingArms(c, fx, fy, ZOM_SKIN_DK, PROG_BODY_R * 0.95, 9, 2.4);

  // the mass: a core ellipse with a ring of lobes fused onto it, so the
  // silhouette reads as bodies melted together rather than as a circle. The
  // lobes are drawn in ALTERNATING shades and NOT painted over by the core, or
  // the whole thing flattens into one green disc with a fringe.
  for (let i = 0; i < 7; i++) {
    const ang = i / 7 * Math.PI * 2 + 0.4;
    const d = PROG_BODY_R * 0.58;
    c.fillStyle = i % 2 ? PROG_SKIN : PROG_SKIN_DK;
    c.beginPath();
    c.ellipse(Math.cos(ang) * d, Math.sin(ang) * d * 0.85,
      PROG_BODY_R * 0.62, PROG_BODY_R * 0.54, ang, 0, 7);
    c.fill();
  }
  c.fillStyle = PROG_SKIN;
  c.beginPath();
  c.ellipse(0, 0, PROG_BODY_R * 0.82, PROG_BODY_R * 0.7, 0, 0, 7);
  c.fill();

  // a slick highlight over the crown so the thing reads as wet
  c.fillStyle = PROG_SKIN_LT;
  c.beginPath();
  c.ellipse(-PROG_BODY_R * 0.18, -PROG_BODY_R * 0.26, PROG_BODY_R * 0.42, PROG_BODY_R * 0.24, -0.4, 0, 7);
  c.fill();

  drawGore(c, PROG_BODY_R * 1.6, PROG_BODY_R * 1.4, 0, 14);

  // Ribcage, drawn here rather than via drawRibs(): that helper spaces its three
  // strokes 1.6px apart and scales only the LINE WIDTH, so at the scale this body
  // needs the strokes merge into a solid white slab. Same idea, spacing scaled too.
  c.strokeStyle = ZOM_BONE;
  c.lineWidth = 1.4;
  c.globalAlpha = 0.75;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const along = (i - 1) * 5.5;
      c.beginPath();
      c.moveTo(fx * along + px * 3 * side, fy * along + py * 3 * side);
      c.lineTo(fx * along + px * 10 * side, fy * along + py * 10 * side);
      c.stroke();
    }
  }
  c.globalAlpha = 1;

  // half-swallowed faces around the rim — the men it has already eaten, still in
  // there. This is the whole read of the design, so they ring the full body and
  // each gets a dark socket behind it so it doesn't vanish into the flesh.
  for (let i = 0; i < 5; i++) {
    const ang = i / 5 * Math.PI * 2 + 0.9;
    const d = PROG_BODY_R * 0.72;
    const hx = Math.cos(ang) * d, hy = Math.sin(ang) * d * 0.85;
    c.fillStyle = 'rgba(20,26,14,0.55)';
    c.beginPath(); c.ellipse(hx, hy, 6, 5.2, ang, 0, 7); c.fill();
    c.save();
    c.translate(hx, hy);
    drawZombieHead(c, Math.cos(ang), Math.sin(ang), 4.2, i % 2 === 0);
    c.restore();
  }

  // the maw: a wet gash on the leading edge, where men go in
  c.fillStyle = '#25120f';
  c.beginPath();
  c.ellipse(fx * PROG_BODY_R * 0.72, fy * PROG_BODY_R * 0.72, 7.5, 5, a.face, 0, 7);
  c.fill();
  c.fillStyle = ZOM_BONE;              // teeth around the rim
  for (let i = -2; i <= 2; i++) {
    const ta = a.face + i * 0.34;
    c.beginPath();
    c.arc(fx * PROG_BODY_R * 0.72 + Math.cos(ta) * 5.5,
      fy * PROG_BODY_R * 0.72 + Math.sin(ta) * 4, 1.1, 0, 7);
    c.fill();
  }
  c.fillStyle = ZOM_BLOOD_WET;
  c.beginPath();
  c.arc(fx * PROG_BODY_R * 0.9, fy * PROG_BODY_R * 0.9, 2.2, 0, 7);
  c.fill();

  c.restore();
}

// one pus module: a swollen sac that lights up as it charges a bile glob
function drawProgenitorPod(c, p) {
  const swell = p.spitT > 0 ? 1 + clamp(p.spitT / 0.3, 0, 1) * 0.28 : 1;
  c.save();
  c.translate(p.x, p.y);
  c.scale(swell, swell);
  c.fillStyle = PROG_PUS;
  c.beginPath(); c.ellipse(0, 0, 7.5, 6.5, 0, 0, 7); c.fill();
  c.strokeStyle = ZOM_SKIN_DK; c.lineWidth = 1; c.stroke();
  // veining
  c.strokeStyle = 'rgba(90,110,50,0.65)'; c.lineWidth = 0.7;
  for (const va of [0.5, 2.1, 3.9, 5.4]) {
    c.beginPath();
    c.moveTo(Math.cos(va) * 2, Math.sin(va) * 2);
    c.lineTo(Math.cos(va) * 6.5, Math.sin(va) * 5.5);
    c.stroke();
  }
  // the aperture, facing whatever it last aimed at
  const f = p.face || Math.PI / 2;
  c.fillStyle = '#3d5228';
  c.beginPath(); c.ellipse(Math.cos(f) * 4, Math.sin(f) * 3.4, 2.4, 2, f, 0, 7); c.fill();
  if (p.spitT > 0) {
    c.fillStyle = `rgba(143,224,106,${0.5 + clamp(p.spitT / 0.3, 0, 1) * 0.45})`;
    c.beginPath(); c.arc(Math.cos(f) * 5, Math.sin(f) * 4.2, 2.6, 0, 7); c.fill();
  }
  c.restore();
}

function drawProgenitor(a) {
  const c = ctx;
  // ground shadow, sized to the whole footprint
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath();
  c.ellipse(a.x + 3, a.y + 5, PROG_BODY_R * 1.05, PROG_BODY_R * 0.62, 0, 0, 7);
  c.fill();

  // tendrils out to each live sac, drawn before the body so they read as rooted
  c.strokeStyle = ZOM_SKIN_DK;
  c.lineWidth = 3.4;
  for (const p of (a.pods || [])) {
    if (p.dead) continue;
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.quadraticCurveTo((a.x + p.x) / 2 + 4, (a.y + p.y) / 2, p.x, p.y);
    c.stroke();
  }

  c.save();
  c.translate(a.x, a.y);
  paintProgenitorBody(c, a);
  c.restore();

  for (const p of (a.pods || [])) {
    if (!p.dead) drawProgenitorPod(c, p);
  }

  drawProgenitorOverlays(a);
}

// ONE HP pool, drawn as PROG_SEGMENTS separate bars with gaps between them rather
// than one bar with tick marks: an emptied segment has to read as GONE, because
// each one that empties buys a resurrection and the player needs to see the next
// one coming. Segment i fills from its own i/n..(i+1)/n slice of the pool, so they
// drain right to left. It is culled out of the normal enemy loop, so
// drawSoldierOverlays never runs on it and this is the only overlay it gets.
function drawProgenitorOverlays(a) {
  const c = ctx;
  const bw = 110, gap = 3;
  const segW = (bw - gap * (PROG_SEGMENTS - 1)) / PROG_SEGMENTS;
  const x0 = a.x - bw / 2, y0 = a.y - PROG_BODY_R - 20;
  const f = clamp(a.hp / a.maxhp, 0, 1);
  for (let i = 0; i < PROG_SEGMENTS; i++) {
    const lo = i / PROG_SEGMENTS, hi = (i + 1) / PROG_SEGMENTS;
    const segF = clamp((f - lo) / (hi - lo), 0, 1);
    const sx = x0 + i * (segW + gap);
    c.fillStyle = 'rgba(0,0,0,0.62)';
    c.fillRect(sx - 1, y0 - 1, segW + 2, 7);
    c.fillStyle = i === 0 ? '#d04030' : i === 1 ? '#c07a2e' : '#7ea24a';
    c.fillRect(sx, y0, segW * segF, 5);
  }
  c.fillStyle = 'rgba(228,224,208,0.9)';
  c.font = '7px monospace';
  c.textAlign = 'center';
  c.fillText('THE PROGENITOR', a.x, y0 - 4);
  c.textAlign = 'left';

  // per-sac condition, so the player can read which modules are still spitting
  for (const p of (a.pods || [])) {
    if (p.dead || p.hp >= p.maxhp) continue;
    const pf = clamp(p.hp / p.maxhp, 0, 1);
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(p.x - 7, p.y - 12, 14, 3);
    c.fillStyle = pf > 0.4 ? '#c8d86a' : '#d04030';
    c.fillRect(p.x - 7, p.y - 12, 14 * pf, 3);
  }

  if (G.selected.includes(a)) {
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.lineWidth = 1;
    c.setLineDash([5, 4]);
    c.beginPath(); c.arc(a.x, a.y, PROG_POD_R + 12, 0, 7); c.stroke();
    c.setLineDash([]);
  }
}

// Its own pass, BEFORE the general enemy loop, so the brood it just birthed
// paints over the mass instead of vanishing beneath it. The cull margin covers
// the pod fan plus the overlay — the loop's own 64 would pop it at the edge.
function drawProgenitorPass() {
  for (const e of G.enemies) {
    if (!e.t.hordeBoss || e.dead) continue;
    if (!inView(e.x, e.y, PROG_BODY_R + PROG_POD_R + 60)) continue;
    drawProgenitor(e);
  }
}
