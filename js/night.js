/* Trenchworks: WW2 — the night event and the flares that answer it.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html.

   Night collapses acquisition to NIGHT_SIGHT_RANGE: past that a man is
   invisible to targeting, full stop, unless a flare's glow reaches him or his
   own muzzle flash just gave him away. Flares are cheap on purpose — a handful
   of live glows at once, box-cached exactly like smoke's puffs, so a scan
   rejects distant sight lines with one bbox check instead of walking every
   flare. */
'use strict';

// The guard every hot targeting loop reads ONCE before testing candidates,
// mirroring smokeOnField().
function nightActive() {
  return G.night > 0;
}

function plantFlare(x, y, dur) {
  if (G.flares.length >= FLARE_CAP) G.flares.shift();
  G.flares.push({ x, y, ttl: dur, max: dur, r: FLARE_RADIUS, a: 1 });
  SFX.event();
  for (let i = 0; i < 10; i++) {
    G.particles.push({
      x: x + rand(-3, 3), y: y + rand(-3, 3), vx: rand(-30, 30), vy: rand(-70, -20),
      ttl: rand(0.3, 0.6), grav: 60, size: rand(1, 2),
      color: pick(['#fff2b0', '#ffd873', '#ffb347']),
    });
  }
}

function updateFlares(dt) {
  if (!G.flares.length) { G.flareBox = null; return; }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of G.flares) {
    f.ttl -= dt;
    // holds bright, then eases out over the last second so it doesn't blink off
    f.a = Math.min(1, f.ttl / 1.0);
    if (f.a > 0) {
      if (f.x - f.r < x0) x0 = f.x - f.r;
      if (f.y - f.r < y0) y0 = f.y - f.r;
      if (f.x + f.r > x1) x1 = f.x + f.r;
      if (f.y + f.r > y1) y1 = f.y + f.r;
    }
  }
  G.flareBox = x1 >= x0 ? { x0, y0, x1, y1 } : null;
}

// True when there's too little light between `a` and `b` for `a` to make `b`
// out. Only `b`'s position matters (unlike smokeBlocksLOS, which sums smoke
// ON the segment) — a flare lights a patch of ground, not a sightline, and a
// man close enough needs no light at all.
function nightBlocksSight(a, b) {
  if (G.night <= 0) return false;
  const dx = b.x - a.x, dy = b.y - a.y;
  if (dx * dx + dy * dy <= NIGHT_SIGHT_RANGE * NIGHT_SIGHT_RANGE) return false;
  if (b.nightRevealT > 0) return false;
  const box = G.flareBox;
  if (!box) return true;
  if (b.x < box.x0 || b.x > box.x1 || b.y < box.y0 || b.y > box.y1) return true;
  for (const f of G.flares) {
    if (f.a <= 0) continue;
    const fx = b.x - f.x, fy = b.y - f.y;
    if (fx * fx + fy * fy <= f.r * f.r) return false;
  }
  return true;
}

function drawFlares() {
  if (!G.flares.length) return;
  for (const f of G.flares) {
    if (f.a <= 0 || !inView(f.x, f.y, f.r + 20)) continue;
    const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
    g.addColorStop(0, `rgba(255,240,190,${0.55 * f.a})`);
    g.addColorStop(0.4, `rgba(255,210,120,${0.28 * f.a})`);
    g.addColorStop(1, 'rgba(255,180,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
    // the bright point source itself, floating a little above the ground
    ctx.fillStyle = `rgba(255,250,220,${0.9 * f.a})`;
    ctx.beginPath(); ctx.arc(f.x, f.y - 6, 2, 0, 7); ctx.fill();
  }
}
