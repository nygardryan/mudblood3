/* Trenchworks: WW2 — wind, drifting smoke, and the line of sight it steals.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html.

   The smokescreen event drops one canister on the field; the pot burns for most
   of the screen's life, coughing out puffs that ride the wind downwind, swell,
   and thin away. Every puff is BOTH the visible cloud and a line-of-sight
   blocker: smokeBlocksLOS() is consulted by every target pick in targeting.js,
   so a screen doesn't merely spoil aim — troops on either side of it simply
   cannot find each other until they're close enough to trip over one another. */
'use strict';

// ---- wind ------------------------------------------------------------------
// One vector per run. Only smoke rides it today, so it's rolled fresh in
// newGame() and nudged once per wave — a screen laid on wave 12 may blow the
// other way than the one on wave 11.
function rollWind() {
  return { dir: rand(0, Math.PI * 2), speed: rand(WIND_SPEED_MIN, WIND_SPEED_MAX) };
}

function shiftWindForWave() {
  if (!G || !G.wind) return;
  const turn = rand(-1, 1) * WIND_SHIFT_MAX * Math.PI * 2;
  G.wind.dir = normalizeAngle(G.wind.dir + turn);
}

function normalizeAngle(a) {
  const t = Math.PI * 2;
  return ((a % t) + t) % t;
}

// ---- the event --------------------------------------------------------------
// A smoke round arcs in like any other shell (kind 'smoke', so update.js plants
// a pot instead of exploding when the fuse runs out). The screen's total life is
// rolled here: the pot burns for all of it bar the tail the last puffs take to
// fade, so SMOKE_DUR_MIN..MAX is what the player actually experiences.
function triggerSmokescreen() {
  showBanner('SMOKE ROUND — SCREEN GOING UP');
  SFX.event();
  const x = rand(70, W - 70);
  const y = rand(H * 0.22, H * 0.78);
  const s = scheduleShell(x, y, SMOKE_ROUND_FLIGHT, 0, 0, false, null, 'smoke');
  const life = rand(SMOKE_DUR_MIN, SMOKE_DUR_MAX);
  s.burn = Math.max(4, life - SMOKE_PUFF_TTL);
  return s;
}

function plantSmokePot(x, y, burn) {
  const pot = { x, y, ttl: burn, max: burn, emit: 0 };
  G.smokePots.push(pot);
  // the canister cracks open and starts pumping at once — no gap where the
  // banner has fired but nothing is on the field yet
  for (let i = 0; i < 3; i++) emitSmokePuff(pot);
  for (let i = 0; i < 10; i++) {
    G.particles.push({
      x: x + rand(-4, 4), y: y + rand(-3, 3), vx: rand(-40, 40), vy: rand(-55, -10),
      ttl: rand(0.3, 0.7), grav: 60, size: rand(1.4, 2.8),
      color: pick(['#d8d6cc', '#b9b7ad', '#8f8d84']),
    });
  }
}

// how long the pot waits between puffs at this wind — chosen so consecutive
// puffs land SMOKE_EMIT_SPACING px apart however hard it's blowing, which is
// what keeps a fast-drifting plume a continuous screen instead of a dotted line
function smokeEmitInterval(speed) {
  return clamp(SMOKE_EMIT_SPACING / Math.max(speed, 1), SMOKE_EMIT_MIN, SMOKE_EMIT_MAX);
}

function emitSmokePuff(pot) {
  // the cap bounds both the draw cost and the LOS scan; oldest puff goes first,
  // which is the one furthest downwind and already thinning out
  if (G.smoke.length >= SMOKE_PUFF_CAP) G.smoke.shift();
  G.smoke.push({
    x: pot.x + rand(-6, 6), y: pot.y + rand(-6, 6),
    r: SMOKE_PUFF_R0, br: 0, a: 0,
    ttl: SMOKE_PUFF_TTL, max: SMOKE_PUFF_TTL,
    // this puff's share of the wind. Kept in a narrow band on purpose: let it
    // vary much and fast puffs outrun slow ones, tearing gaps in the plume that
    // troops can shoot straight through. `swirl` supplies the organic wander.
    drift: rand(0.92, 1.08),
    swirl: rand(-1, 1),             // slow cross-wind wander, so the plume isn't a ruler
    seed: rand(0, Math.PI * 2),
    spin: rand(-0.25, 0.25),
    variant: Math.random() < 0.5 ? 0 : 1,
  });
}

function updateSmoke(dt) {
  if (!G.smokePots.length && !G.smoke.length) { G.smokeBox = null; return; }
  const wind = G.wind;
  const wx = Math.cos(wind.dir), wy = Math.sin(wind.dir);
  const cx = Math.cos(wind.dir + Math.PI / 2), cy = Math.sin(wind.dir + Math.PI / 2);

  for (const pot of G.smokePots) {
    pot.ttl -= dt;
    pot.emit -= dt;
    const gap = smokeEmitInterval(wind.speed);
    while (pot.emit <= 0 && pot.ttl > 0) {
      pot.emit += gap;
      emitSmokePuff(pot);
    }
    if (pot.ttl > 0 && Math.random() < 0.7) {
      G.particles.push({
        x: pot.x + rand(-3, 3), y: pot.y + rand(-2, 2),
        vx: wx * wind.speed * 0.6 + rand(-8, 8), vy: wy * wind.speed * 0.6 + rand(-14, -2),
        ttl: rand(0.4, 0.8), grav: -8, size: rand(2, 4),
        kind: 'smoke', color: pick(['#e6e4da', '#cbc9bf', '#a9a79e']),
      });
    }
  }

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of G.smoke) {
    s.ttl -= dt;
    const age = 1 - s.ttl / s.max;                 // 0 fresh -> 1 spent
    // a puff swells fast out of the pot, then keeps creeping wider as it thins
    s.r = SMOKE_PUFF_R0 + (SMOKE_PUFF_R - SMOKE_PUFF_R0) * Math.min(1, age * 2.4);
    // blooms in under a second, holds, then fades out over the back half
    s.a = Math.min(1, (s.max - s.ttl) / 0.7) * Math.min(1, s.ttl / (s.max * 0.5));
    const sp = wind.speed * s.drift;
    s.x += (wx * sp + cx * s.swirl * SMOKE_SWIRL) * dt;
    s.y += (wy * sp + cy * s.swirl * SMOKE_SWIRL) * dt;
    // What screens is what's dense: the blocking radius scales straight off the
    // puff's own density, so a thinning puff shields a smaller and smaller core
    // rather than falling off a cliff at some threshold. Because the renderer
    // blits at this same radius, "thin enough to see through" and "drawn thin"
    // are the same number — a puff can never look solid while blocking nothing.
    s.br = s.r * s.a;
    if (s.br > 0) {
      if (s.x - s.br < x0) x0 = s.x - s.br;
      if (s.y - s.br < y0) y0 = s.y - s.br;
      if (s.x + s.br > x1) x1 = s.x + s.br;
      if (s.y + s.br > y1) y1 = s.y + s.br;
    }
  }
  // the bbox over every blocking puff — the one cheap reject that keeps the
  // per-candidate LOS test off the hot path for sight lines nowhere near the cloud
  G.smokeBox = x1 >= x0 ? { x0, y0, x1, y1 } : null;
}

// ---- line of sight ----------------------------------------------------------
// True when there's too much smoke between two actors to make each other out.
// Target acquisition (targeting.js) refuses a pick this rejects, so a screen
// stops the fight rather than merely degrading it.
//
// What matters is how much smoke lies ON the sight line, not how far apart the
// two are. A man can see SMOKE_SEE_THROUGH px deep into the murk: less than that
// between them and they're visible, more and they're not. That's what keeps
// melee and point-blank fire working — men in contact have barely any smoke
// between them however thick the bank they're standing in — while (unlike a flat
// distance exemption) two men buried deep in the same cloud stay blind to each
// other even at close quarters. Overlapping puffs deliberately double-count:
// denser smoke is less see-through.
function smokeBlocksLOS(a, b) {
  const box = G.smokeBox;
  if (!box) return false;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  // the smoke on a sight line can never be deeper than the line itself, so
  // anyone this close is visible without touching the puff list
  if (len2 <= SMOKE_SEE_THROUGH * SMOKE_SEE_THROUGH) return false;
  if ((a.x < box.x0 && b.x < box.x0) || (a.x > box.x1 && b.x > box.x1) ||
      (a.y < box.y0 && b.y < box.y0) || (a.y > box.y1 && b.y > box.y1)) return false;
  const len = Math.sqrt(len2);
  const puffs = G.smoke;
  let depth = 0;
  for (let i = 0; i < puffs.length; i++) {
    const s = puffs[i];
    const r = s.br;
    if (r <= 0) continue;
    // where the puff centre projects onto the line, and how far off it sits
    const t = ((s.x - a.x) * dx + (s.y - a.y) * dy) / len2;
    const px = a.x + dx * t - s.x, py = a.y + dy * t - s.y;
    const perp2 = px * px + py * py;
    if (perp2 >= r * r) continue;
    // the chord this puff cuts out of the segment, clipped to the two men
    const half = Math.sqrt(r * r - perp2) / len;
    const t0 = t - half < 0 ? 0 : t - half;
    const t1 = t + half > 1 ? 1 : t + half;
    if (t1 <= t0) continue;
    depth += (t1 - t0) * len;
    if (depth >= SMOKE_SEE_THROUGH) return true;
  }
  return false;
}

// The guard every hot targeting loop reads ONCE before scanning, so a clear day
// costs a single truthiness check instead of a call per candidate.
function smokeOnField() {
  return !!(G && G.smokeBox);
}

// ---- drawing ----------------------------------------------------------------
// One puff is a bitmap baked at a nominal 64-unit radius and blitted scaled —
// billowy enough to sell up close, and far cheaper than re-tracing a stack of
// radial gradients for every puff every frame. The lobes reach ~62 of the 64
// so the art nearly fills its box; SMOKE_SPRITE_FIT then maps that onto the
// blocking radius, keeping what the player sees and what screens him in step.
const SMOKE_LOBES = [
  [[0, 0, 51], [-24, -15, 36], [22, -20, 33], [-20, 21, 34], [21, 20, 38], [0, -33, 27], [-36, 3, 26]],
  [[3, 2, 50], [-27, 12, 38], [26, 15, 35], [-15, -24, 36], [18, -26, 32], [36, -3, 24], [-3, 35, 29]],
];

function smokePuffSprite(variant) {
  return sprite('smokepuff' + variant, 128, 128, 64, 64, (c) => {
    for (const [ox, oy, lr] of SMOKE_LOBES[variant]) {
      const g = c.createRadialGradient(ox, oy, 0, ox, oy, lr);
      g.addColorStop(0, 'rgba(226,225,216,0.62)');
      g.addColorStop(0.55, 'rgba(200,199,190,0.4)');
      g.addColorStop(1, 'rgba(170,169,160,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(ox, oy, lr, 0, 7); c.fill();
    }
  });
}

function drawSmoke() {
  if (!G.smoke.length && !G.smokePots.length) return;
  for (const pot of G.smokePots) {
    if (pot.ttl <= 0 || !inView(pot.x, pot.y, 12)) continue;
    // the canister itself: a stubby cylinder still venting
    ctx.fillStyle = '#5a5c4c';
    ctx.fillRect(pot.x - 2.5, pot.y - 4, 5, 8);
    ctx.fillStyle = '#8a8c78';
    ctx.fillRect(pot.x - 2.5, pot.y - 4, 5, 2);
  }
  for (const s of G.smoke) {
    if (s.br < 1 || !inView(s.x, s.y, s.r + 20)) continue;
    const rec = smokePuffSprite(s.variant);
    // drawn to the radius that actually blocks, so "it looks covered" and
    // "they can't see through it" mean the same thing
    const d = s.br * SMOKE_SPRITE_FIT;
    ctx.save();
    ctx.globalAlpha = s.a * SMOKE_ALPHA;
    ctx.translate(s.x, s.y);
    ctx.rotate(s.seed + G.time * s.spin);
    ctx.drawImage(rec.img, -d / 2, -d / 2, d, d);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  drawWindVane();
}

// while a screen is up, the wind is suddenly tactical information — show which
// way it's carrying, since the plume's whole path follows this one arrow
function drawWindVane() {
  const wind = G.wind;
  if (!wind) return;
  const x = 30, y = 26, len = 15;
  const dx = Math.cos(wind.dir), dy = Math.sin(wind.dir);
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = '#d8d6cc';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - dx * len, y - dy * len);
  ctx.lineTo(x + dx * len, y + dy * len);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + dx * len, y + dy * len);
  ctx.lineTo(x + dx * (len - 7) - dy * 4.5, y + dy * (len - 7) + dx * 4.5);
  ctx.lineTo(x + dx * (len - 7) + dy * 4.5, y + dy * (len - 7) - dx * 4.5);
  ctx.closePath();
  ctx.fillStyle = '#d8d6cc';
  ctx.fill();
  ctx.font = 'bold 8px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('WIND', x, y + 30);
  ctx.restore();
}
