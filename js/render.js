/* Trenchworks: WW2 — scene composition (main draw).
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// visible world rect while the camera transform is active (mobile zoom /
// tutorial cam) — anything outside it can skip its draw entirely
let cullOn = false, cullX0 = 0, cullY0 = 0, cullX1 = 0, cullY1 = 0;

function inView(x, y, m) {
  return !cullOn || (x >= cullX0 - m && x <= cullX1 + m && y >= cullY0 - m && y <= cullY1 + m);
}

function draw() {
  hoverActor = findHoverActor();
  ctx.save();
  cullOn = false;
  if (viewTransformActive()) {
    // any part of the view outside the world would otherwise keep last frame's pixels
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const s = viewScale();
    ctx.scale(s, s);
    ctx.translate(-viewCam.x, -viewCam.y);
    cullOn = true;
    cullX0 = viewCam.x; cullY0 = viewCam.y;
    cullX1 = viewCam.x + canvas.width / s;
    cullY1 = viewCam.y + canvas.height / s;
  }
  // the bitmap is backed at groundRenderScale× density; map it into W×H world space
  ctx.drawImage(groundCanvas, 0, 0, W, H);
  for (const m of G.groundMarks) {
    if (inView(m.x, m.y, 100)) drawGroundMark(m, ctx);
  }

  drawForwardLine();

  for (const cp of G.corpses) {
    if (inView(cp.x, cp.y, 30)) drawCorpse(cp);
  }

  drawDefenses();

  if (G.landingCraft && G.landingCraft.length) {
    for (const craft of G.landingCraft) drawLandingCraft(craft);
  }

  // shell target markers
  for (const s of G.shells) {
    if (s.kind === 'v2') {
      // the V2's telegraph: its blast footprint drawn faint on the ground,
      // with a bright ring contracting onto it — the warhead hits the moment
      // the rings meet, so the long flight reads as time to clear the area
      const f = clamp(1 - s.timer / s.dur, 0, 1);
      ctx.strokeStyle = 'rgba(190,45,25,0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(190,45,25,0.07)';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
      const cr = s.r + (1 - f) * s.r * 1.8;
      ctx.strokeStyle = `rgba(255,120,40,${0.35 + f * 0.55})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, cr, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,120,40,0.9)';
      ctx.beginPath(); ctx.arc(s.x, s.y, 2.2, 0, 7); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(200,60,40,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(s.x, s.y, 6 + Math.sin(G.time * 10) * 2, 0, 7); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s.x - 9, s.y); ctx.lineTo(s.x + 9, s.y);
      ctx.moveTo(s.x, s.y - 9); ctx.lineTo(s.x, s.y + 9);
      ctx.stroke();
    }
  }

  // rockets in flight
  for (const r of G.rockets) {
    const ang = Math.atan2(r.ty - r.sy, r.tx - r.sx);
    ctx.strokeStyle = '#2e2c24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(r.x - Math.cos(ang) * 5, r.y - Math.sin(ang) * 5);
    ctx.lineTo(r.x + Math.cos(ang) * 5, r.y + Math.sin(ang) * 5);
    ctx.stroke();
    ctx.fillStyle = '#ffca5a';
    ctx.beginPath();
    ctx.arc(r.x - Math.cos(ang) * 6, r.y - Math.sin(ang) * 6, 2, 0, 7);
    ctx.fill();
  }

  // grenades in flight (arc via fake height), then resting on the ground
  for (const g of G.grenades) {
    if (g.landed) {
      drawGrenadeProjectile(g, g.tx, g.ty);
    } else {
      const f = g.t / g.dur;
      const x = g.sx + (g.tx - g.sx) * f;
      const y = g.sy + (g.ty - g.sy) * f - Math.sin(f * Math.PI) * 34;
      drawGrenadeProjectile(g, x, y);
    }
  }

  for (const e of G.enemies) {
    if (!inView(e.x, e.y, 64)) continue;   // canopy/hull margin
    if (e.chute > 0) drawParatrooper(e);
    else if (e.t.tank) drawTank(e);
    else if (e.t.bike) drawBike(e);
    else if (e.t.apc) drawHalftrack(e);
    else if (e.t.vehicle) drawJeep(e);
    else if (e.t.v2) drawV2Launcher(e);
    else drawSoldier(e);
  }

  // focus-fire reticle: a spinning red bracket over the marked enemy
  if (G.focusTarget && !G.focusTarget.dead && G.focusTarget.y >= 0) {
    const f = G.focusTarget;
    const r = (f.t.tank || f.t.apc) ? 22 : f.t.vehicle || f.t.v2 ? 18 : 12;
    const spin = G.time * 1.8;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(spin);
    ctx.strokeStyle = 'rgba(255,50,40,0.9)';
    ctx.lineWidth = 1.6;
    for (let q = 0; q < 4; q++) {
      const a = q * Math.PI / 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, a + 0.35, a + Math.PI / 2 - 0.35);
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const u of G.units) {
    if (!inView(u.x, u.y, 64)) continue;
    const hidden = isCamouflaged(u);
    if (hidden) { ctx.save(); ctx.globalAlpha *= 0.4; }
    if (u.t.tank) drawTank(u);
    else if (u.t.atgun) drawATGun(u);
    else if (u.t.aagun) drawAAGun(u);
    else if (u.t.vehicle) drawJeep(u);
    else drawSoldier(u);
    if (hidden) ctx.restore();
  }

  for (const e of G.enemies) {
    if (!e.dead && e.t.flame && e.flameT > 0) drawFlameStream(e);
  }
  for (const u of G.units) {
    if (!u.dead && u.t.flame && u.flameT > 0) drawFlameStream(u);
  }
  for (const u of G.units) {
    if (!u.dead && u.t.shotgun && u.shotgunBlastT > 0) drawShotgunBlast(u);
  }

  // tracers
  ctx.lineWidth = 1.2;
  for (const tr of G.tracers) {
    if (cullOn && (Math.max(tr.x1, tr.x2) < cullX0 || Math.min(tr.x1, tr.x2) > cullX1 ||
                   Math.max(tr.y1, tr.y2) < cullY0 || Math.min(tr.y1, tr.y2) > cullY1)) continue;
    if (tr.kind === 'buckshot') {
      ctx.strokeStyle = 'rgba(220,200,150,0.75)';
      ctx.lineWidth = 2.2;
    } else if (tr.fromBar) {
      ctx.strokeStyle = 'rgba(255,230,160,0.85)';
      ctx.lineWidth = 1.6;
    } else {
      ctx.strokeStyle = 'rgba(255,235,170,0.8)';
      ctx.lineWidth = 1.2;
    }
    ctx.beginPath(); ctx.moveTo(tr.x1, tr.y1); ctx.lineTo(tr.x2, tr.y2); ctx.stroke();
  }

  // particles
  for (const p of G.particles) {
    if (!inView(p.x, p.y, 12)) continue;
    if (p.kind === 'flame') {
      const life = p.maxTtl ? p.ttl / p.maxTtl : clamp(p.ttl / 0.3, 0, 1);
      const r = p.size * (0.75 + (1 - life) * 0.45);
      ctx.globalAlpha = life * (p.glow || 0.85);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, '#fff8c8');
      g.addColorStop(0.4, p.color);
      g.addColorStop(1, 'rgba(40,18,8,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
    } else if (p.kind === 'smoke') {
      const life = p.maxTtl ? p.ttl / p.maxTtl : clamp(p.ttl / 0.15, 0, 1);
      ctx.globalAlpha = life * 0.65;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.1 - life * 0.3), 0, 7); ctx.fill();
    } else {
      ctx.globalAlpha = 1;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
  ctx.globalAlpha = 1;

  // explosion flashes
  for (const f of G.flashes) {
    const a = f.ttl / f.max;
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = '#fff0b4';
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.35, 0, 7); ctx.fill();
    ctx.globalAlpha = a * 0.55;
    ctx.fillStyle = '#ff8c28';
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.7, 0, 7); ctx.fill();
    ctx.globalAlpha = a * 0.25;
    ctx.fillStyle = '#ff5014';
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // V2 warheads in flight — airborne, so drawn above every ground effect
  for (const s of G.shells) {
    if (s.kind === 'v2' && s.sx != null) drawV2RocketInFlight(s);
  }

  // AA shells climbing toward their fuse point
  for (const f of G.flak) {
    if (f.done) continue;
    const prog = clamp(1 - f.timer / f.dur, 0, 1);
    const x = f.sx + (f.x - f.sx) * prog;
    const y = f.sy + (f.y - f.sy) * prog;
    const tailX = f.sx + (f.x - f.sx) * Math.max(0, prog - 0.12);
    const tailY = f.sy + (f.y - f.sy) * Math.max(0, prog - 0.12);
    ctx.strokeStyle = 'rgba(255,214,130,0.8)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,190,0.95)';
    ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill();
  }

  // aircraft overhead, above every ground effect
  for (const p of G.planes) drawPlane(p);

  // floating notices
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.textAlign = 'center';
  for (const tx of G.texts) {
    const a = clamp(tx.ttl / 0.5, 0, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.75 * a})`;
    ctx.fillText(tx.text, tx.x + 1, tx.y + 1);
    ctx.fillStyle = `rgba(255,217,74,${a})`;
    ctx.fillText(tx.text, tx.x, tx.y);
  }

  // fog overlay
  if (G.fog > 0) {
    const a = clamp(G.fog / 4, 0, 1) * 0.35;
    ctx.fillStyle = `rgba(190,195,185,${a})`;
    ctx.fillRect(0, 0, W, H);
  }

  drawTutorialHighlights();
  drawMoveDestinations();
  drawMoveRestrictedZone();
  drawMoveCursorPreview();
  drawPlacementGhost();
  drawDragBox();
  drawHoverHighlight();
  ctx.restore();

  // the info panel sits in screen pixels so it stays legible under camera zoom
  drawHoverPanel();
}

// pulsing ring around whatever the tutorial wants clicked next
function drawTutorialHighlights() {
  const T = G && G.tutorial;
  if (!T || T.done) return;
  // build guide: the highlighted zone a step wants the player to place inside
  if (T.placeZone) {
    const z = T.placeZone;
    const a = 0.12 + Math.sin(G.time * 4) * 0.05;
    ctx.fillStyle = `rgba(255,217,74,${a})`;
    ctx.fillRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0);
    ctx.strokeStyle = 'rgba(255,217,74,0.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0);
    ctx.setLineDash([]);
  }
  // threat call-outs: red crosshair rings around the enemies to watch
  if (T.ringTargets) {
    const r = 18 + Math.sin(G.time * 5) * 3;
    ctx.strokeStyle = 'rgba(255,90,70,0.95)';
    ctx.lineWidth = 2.5;
    for (const e of T.ringTargets) {
      if (!e || e.dead) continue;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, 7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(e.x - r - 4, e.y); ctx.lineTo(e.x - r + 2, e.y);
      ctx.moveTo(e.x + r - 2, e.y); ctx.lineTo(e.x + r + 4, e.y);
      ctx.moveTo(e.x, e.y - r - 4); ctx.lineTo(e.x, e.y - r + 2);
      ctx.moveTo(e.x, e.y + r - 2); ctx.lineTo(e.x, e.y + r + 4);
      ctx.stroke();
    }
  }
  // Tutorial 1's yellow "click here" ring for the select/move lessons
  let target = null, r0 = 0;
  if (T.step === 'select' && T.rifle && !T.rifle.dead) { target = T.rifle; r0 = 16; }
  else if (T.step === 'moveToBunker') { target = T.bunker; r0 = 30; }
  if (target) {
    const pulse = r0 + Math.sin(G.time * 5) * 3;
    ctx.strokeStyle = 'rgba(255,217,74,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(target.x, target.y, pulse, 0, 7);
    ctx.stroke();
  }
}
