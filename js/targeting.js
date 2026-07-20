/* Mud & Blood — target selection.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// the player can click an enemy to mark it as a focus target: any troop that
// could otherwise shoot it (in range, matches its own weapon's target filter)
// prefers it over its default pick, so a whole line concentrates fire on cue.
function focusPick(u, range, pred) {
  const f = G && G.focusTarget;
  if (!f || f.dead || f.y < 0 || f.chute > 0) return null;
  if (pred && !pred(f)) return null;
  if (dist(u, f) > range) return null;
  return f;
}

function nearestEnemyInRange(u, range, pred) {
  const f = focusPick(u, range, pred);
  if (f) return f;
  let best = null, bd = range;
  for (const e of G.enemies) {
    if (e.dead || e.y < 0 || e.chute > 0) continue;
    if (pred && !pred(e)) continue;
    const d = dist(u, e);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function firstEnemyInRange(u, range, pred) {
  const f = focusPick(u, range, pred);
  if (f) return f;
  for (const e of G.enemies) {
    if (e.dead || e.y < 0 || e.chute > 0) continue;
    if (pred && !pred(e)) continue;
    if (dist(u, e) <= range) return e;
  }
  return null;
}

function sniperTarget(u, range) {
  const f = focusPick(u, range, e => !e.t.tank);
  if (f) return f;
  let best = null, bp = -1, bd = Infinity;
  for (const e of G.enemies) {
    if (e.dead || e.t.tank || e.y < 0 || e.chute > 0) continue;
    const d = dist(u, e);
    if (d > range) continue;
    if (e.t.priority > bp || (e.t.priority === bp && d < bd)) {
      bp = e.t.priority; bd = d; best = e;
    }
  }
  return best;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function vehicleHomeFace(a) {
  return a.side === 'us' ? -Math.PI / 2 : Math.PI / 2;
}

function vehicleHullAngle(a) {
  const home = vehicleHomeFace(a);
  return a.moveTo
    ? Math.atan2(a.moveTo.y - a.y, a.moveTo.x - a.x)
    : home;
}

function inFireCone(shooter, target, bearing, arc) {
  return Math.abs(angleDiff(Math.atan2(target.y - shooter.y, target.x - shooter.x), bearing)) <= arc;
}

function drawFireCone(x, y, bearing, arc, range, alpha) {
  ctx.strokeStyle = `rgba(255,255,255,${alpha != null ? alpha : 0.35})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, bearing - arc, bearing + arc);
  ctx.closePath();
  ctx.stroke();
}

// anti-tank traverse wedge — steel fill, bright arc edges
function drawATGunRangeCone(x, y, bearing, arc, range, alpha) {
  const a = alpha != null ? alpha : 0.35;
  const tipX = x + Math.cos(bearing) * range * 0.7;
  const tipY = y + Math.sin(bearing) * range * 0.7;
  const grad = ctx.createLinearGradient(x, y, tipX, tipY);
  grad.addColorStop(0, `rgba(200,210,230,${a * 0.48})`);
  grad.addColorStop(0.45, `rgba(160,175,200,${a * 0.3})`);
  grad.addColorStop(1, `rgba(80,90,110,${a * 0.07})`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, bearing - arc, bearing + arc);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(230,238,255,${Math.min(0.92, a * 1.25)})`;
  ctx.lineWidth = 1.35;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, bearing - arc, bearing + arc);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.88, a * 1.15)})`;
  ctx.lineWidth = 1;
  for (const ang of [bearing - arc, bearing + arc]) {
    const ox = x + Math.cos(ang) * range;
    const oy = y + Math.sin(ang) * range;
    const tx = Math.cos(ang + Math.PI / 2);
    const ty = Math.sin(ang + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(ox - tx * 5, oy - ty * 5);
    ctx.lineTo(ox + tx * 5, oy + ty * 5);
    ctx.stroke();
  }
}

// warm wedge for flamethrower reach — selection overlay and placement ghost
function drawFlameRangeCone(x, y, bearing, arc, range, alpha) {
  const a = alpha != null ? alpha : 0.35;
  const tipX = x + Math.cos(bearing) * range * 0.65;
  const tipY = y + Math.sin(bearing) * range * 0.65;
  const grad = ctx.createLinearGradient(x, y, tipX, tipY);
  grad.addColorStop(0, `rgba(255,210,90,${a * 0.55})`);
  grad.addColorStop(0.45, `rgba(255,120,30,${a * 0.35})`);
  grad.addColorStop(1, `rgba(180,50,15,${a * 0.08})`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, bearing - arc, bearing + arc);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(255,180,60,${a * 0.85})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
}

// buckshot spread wedge — selection overlay and placement ghost
function drawBuckshotCone(x, y, bearing, arc, range, alpha) {
  const a = alpha != null ? alpha : 0.35;
  const tipX = x + Math.cos(bearing) * range * 0.58;
  const tipY = y + Math.sin(bearing) * range * 0.58;
  const grad = ctx.createLinearGradient(x, y, tipX, tipY);
  grad.addColorStop(0, `rgba(210,200,170,${a * 0.52})`);
  grad.addColorStop(0.45, `rgba(170,160,130,${a * 0.32})`);
  grad.addColorStop(1, `rgba(90,85,70,${a * 0.07})`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, bearing - arc, bearing + arc);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(230,220,190,${a * 0.8})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, bearing - arc, bearing + arc);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
}

// long-range sight line — bright reticle ring with crosshair ticks
function drawSniperRangeRing(x, y, range, alpha) {
  const a = alpha != null ? alpha : 0.45;
  ctx.fillStyle = `rgba(210, 225, 255, ${a * 0.12})`;
  ctx.beginPath(); ctx.arc(x, y, range, 0, 7); ctx.fill();
  ctx.strokeStyle = `rgba(235, 245, 255, ${Math.min(0.92, a * 1.35)})`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([10, 5]);
  ctx.beginPath(); ctx.arc(x, y, range, 0, 7); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.95, a * 1.5)})`;
  ctx.lineWidth = 1.15;
  for (let i = 0; i < 8; i++) {
    const ang = i * Math.PI / 4;
    const ox = x + Math.cos(ang) * range;
    const oy = y + Math.sin(ang) * range;
    const tx = Math.cos(ang + Math.PI / 2);
    const ty = Math.sin(ang + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(ox - tx * 6, oy - ty * 6);
    ctx.lineTo(ox + tx * 6, oy + ty * 6);
    ctx.stroke();
  }
  ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.85, a * 1.25)})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y);
  ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7);
  ctx.stroke();
  ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.9, a * 1.4)})`;
  ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill();
}

// muzzle flash while the trench gun fires
function drawShotgunBlast(actor) {
  if (!actor.shotgunBlastT || actor.shotgunBlastT <= 0 || !actor.t.shotgun) return;
  const sg = actor.t.shotgun;
  const range = unitRange(actor, sg.range) * fogMult() * 0.38;
  const bearing = actor.face;
  const fx = Math.cos(bearing), fy = Math.sin(bearing);
  const nx = actor.x + fx * (actor.t.gun + 2);
  const ny = actor.y + fy * (actor.t.gun + 2);
  const alpha = clamp(actor.shotgunBlastT / 0.12, 0, 1);
  const tipX = nx + fx * range;
  const tipY = ny + fy * range;

  ctx.save();
  const grad = ctx.createLinearGradient(nx, ny, tipX, tipY);
  grad.addColorStop(0, `rgba(255,245,200,${0.7 * alpha})`);
  grad.addColorStop(0.35, `rgba(230,200,130,${0.45 * alpha})`);
  grad.addColorStop(1, 'rgba(140,120,90,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(nx, ny);
  ctx.arc(nx, ny, range, bearing - sg.arc * 0.72, bearing + sg.arc * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgba(255,230,160,${0.9 * alpha})`;
  ctx.beginPath(); ctx.arc(nx, ny, 3.2, 0, 7); ctx.fill();
  ctx.restore();
}

// indirect-fire annulus — max range ring plus inner dead zone
function drawMortarRangeRing(x, y, minR, maxR, alpha) {
  const a = alpha != null ? alpha : 0.35;
  ctx.fillStyle = `rgba(130,140,110,${a * 0.14})`;
  ctx.beginPath(); ctx.arc(x, y, maxR, 0, 7); ctx.fill();
  ctx.strokeStyle = `rgba(190,200,160,${a * 0.78})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.arc(x, y, maxR, 0, 7); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = `rgba(200,75,55,${a * 0.1})`;
  ctx.beginPath(); ctx.arc(x, y, minR, 0, 7); ctx.fill();
  ctx.strokeStyle = `rgba(210,90,65,${a * 0.7})`;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.arc(x, y, minR, 0, 7); ctx.stroke();
  ctx.setLineDash([]);
}

// 60mm mortar round — body, fuze, tail fins
function drawMortarRound(c, x, y, scale, rot) {
  scale = scale || 1;
  rot = rot != null ? rot : 0;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = '#3a4034';
  c.beginPath();
  c.ellipse(0, 0, 1.1 * scale, 2.4 * scale, 0, 0, 7);
  c.fill();
  c.strokeStyle = '#2a2e24';
  c.lineWidth = 0.55 * scale;
  c.stroke();
  c.fillStyle = '#c8a858';
  c.beginPath(); c.arc(0, -2.1 * scale, 0.75 * scale, 0, 7); c.fill();
  c.strokeStyle = '#5a5c48';
  c.lineWidth = 0.65 * scale;
  for (const off of [-0.55, 0, 0.55]) {
    c.beginPath();
    c.moveTo(off * scale, 1.8 * scale);
    c.lineTo(off * scale * 1.6, 3.4 * scale);
    c.stroke();
  }
  c.restore();
}

// M2 60mm mortar tube, baseplate, and bipod beside the crewman
function drawMortarTube(c, face, fx, fy, blastT) {
  const kick = blastT > 0 ? clamp(blastT / 0.18, 0, 1) : 0;
  const bx = -fx * 7.2 - fy * 2.8;
  const by = -fy * 7.2 + fx * 2.8;
  const tubeAng = face - 0.58 - kick * 0.12;
  const tubeLen = 10.5;
  const tx = bx + Math.cos(tubeAng) * tubeLen;
  const ty = by + Math.sin(tubeAng) * tubeLen;

  c.fillStyle = '#2f3328';
  c.beginPath(); c.ellipse(bx, by, 4.8, 3.1, face + 0.25, 0, 7); c.fill();
  c.strokeStyle = '#1e2018';
  c.lineWidth = 1;
  c.stroke();
  c.fillStyle = '#3a3c30';
  c.beginPath(); c.ellipse(bx, by, 2.8, 1.6, face + 0.25, 0, 7); c.fill();

  c.strokeStyle = '#5a5c42';
  c.lineWidth = 3.6;
  c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.stroke();
  c.strokeStyle = '#26261e';
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(bx + Math.cos(tubeAng) * 2, by + Math.sin(tubeAng) * 2);
  c.lineTo(tx, ty);
  c.stroke();

  const midX = bx + Math.cos(tubeAng) * 4.2;
  const midY = by + Math.sin(tubeAng) * 4.2;
  c.strokeStyle = '#4a4a3e';
  c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(midX, midY); c.lineTo(midX - fy * 4.5, midY + fx * 4.5); c.stroke();
  c.beginPath(); c.moveTo(midX, midY); c.lineTo(midX + fy * 3.5, midY - fx * 3.5); c.stroke();

  c.strokeStyle = '#3a3830';
  c.lineWidth = 2;
  c.beginPath(); c.arc(tx, ty, 1.9, 0, 7); c.stroke();
  c.fillStyle = '#1c1c16';
  c.beginPath(); c.arc(tx, ty, 0.9, 0, 7); c.fill();

  if (blastT > 0) {
    const alpha = clamp(blastT / 0.18, 0, 1);
    c.fillStyle = `rgba(255,225,150,${0.8 * alpha})`;
    c.beginPath(); c.arc(tx, ty, 2.2 + alpha * 2.5, 0, 7); c.fill();
    c.fillStyle = `rgba(255,160,60,${0.45 * alpha})`;
    c.beginPath(); c.arc(tx, ty, 4 + alpha * 3, 0, 7); c.fill();
  }
  return { tx, ty, bx, by };
}

// 8.1 cm Granatwerfer 34 — saddle yoke, wide baseplate, heavy bipod
function drawGranatwerferTube(c, face, fx, fy, blastT) {
  const kick = blastT > 0 ? clamp(blastT / 0.18, 0, 1) : 0;
  const bx = -fx * 7.5 - fy * 2.5;
  const by = -fy * 7.5 + fx * 2.5;
  const tubeAng = face - 0.55 - kick * 0.1;
  const tubeLen = 12.2;
  const tx = bx + Math.cos(tubeAng) * tubeLen;
  const ty = by + Math.sin(tubeAng) * tubeLen;

  c.fillStyle = '#2a2c24';
  c.beginPath(); c.ellipse(bx, by, 5.5, 3.4, face + 0.2, 0, 7); c.fill();
  c.strokeStyle = '#1a1c16';
  c.lineWidth = 1.1;
  c.stroke();
  c.fillStyle = '#3a3c32';
  c.beginPath(); c.ellipse(bx, by, 3.4, 1.9, face + 0.2, 0, 7); c.fill();
  c.strokeStyle = '#4a4c40';
  c.lineWidth = 0.75;
  c.beginPath();
  c.moveTo(bx - fy * 3.2, by + fx * 3.2);
  c.lineTo(bx + fy * 3.2, by - fx * 3.2);
  c.stroke();

  c.strokeStyle = '#4a4c42';
  c.lineWidth = 4.2;
  c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.stroke();
  c.strokeStyle = '#2e3028';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(bx + Math.cos(tubeAng) * 2.2, by + Math.sin(tubeAng) * 2.2);
  c.lineTo(tx, ty);
  c.stroke();

  const midX = bx + Math.cos(tubeAng) * 4.5;
  const midY = by + Math.sin(tubeAng) * 4.5;
  c.strokeStyle = '#3a3c34';
  c.lineWidth = 2.2;
  c.beginPath(); c.arc(midX, midY, 2.4, 0, 7); c.stroke();

  c.strokeStyle = '#3a3830';
  c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(midX, midY); c.lineTo(midX - fy * 5.2, midY + fx * 5.2); c.stroke();
  c.beginPath(); c.moveTo(midX, midY); c.lineTo(midX + fy * 4.2, midY - fx * 4.2); c.stroke();
  c.fillStyle = '#2a2820';
  c.beginPath(); c.arc(midX - fy * 5.2, midY + fx * 5.2, 1.1, 0, 7); c.fill();
  c.beginPath(); c.arc(midX + fy * 4.2, midY - fx * 4.2, 1.1, 0, 7); c.fill();

  c.strokeStyle = '#3a3830';
  c.lineWidth = 2.4;
  c.beginPath(); c.arc(tx, ty, 2.2, 0, 7); c.stroke();
  c.fillStyle = '#1c1c16';
  c.beginPath(); c.arc(tx, ty, 1.05, 0, 7); c.fill();

  c.strokeStyle = '#4a4840';
  c.lineWidth = 1.3;
  c.beginPath(); c.arc(bx - fx * 0.8, by - fy * 0.8, 1.4, 0, 7); c.stroke();

  if (blastT > 0) {
    const alpha = clamp(blastT / 0.18, 0, 1);
    c.fillStyle = `rgba(255,225,150,${0.85 * alpha})`;
    c.beginPath(); c.arc(tx, ty, 2.8 + alpha * 3, 0, 7); c.fill();
    c.fillStyle = `rgba(255,140,50,${0.5 * alpha})`;
    c.beginPath(); c.arc(tx, ty, 5 + alpha * 3.5, 0, 7); c.fill();
  }
  return { tx, ty, bx, by, midX, midY };
}

// 8.1 cm Wgr round — olive body, four tail fins, booster band
function drawGrw81Round(c, x, y, scale, rot) {
  scale = scale || 1;
  rot = rot != null ? rot : 0;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = '#4a4e3e';
  c.beginPath();
  c.ellipse(0, 0, 1.35 * scale, 2.8 * scale, 0, 0, 7);
  c.fill();
  c.strokeStyle = '#2a2e22';
  c.lineWidth = 0.6 * scale;
  c.stroke();
  c.fillStyle = '#6a6a58';
  c.fillRect(-0.9 * scale, -2.6 * scale, 1.8 * scale, 0.9 * scale);
  c.fillStyle = '#8a8878';
  c.beginPath(); c.arc(0, -2.9 * scale, 0.7 * scale, 0, 7); c.fill();
  c.strokeStyle = '#4a4a40';
  c.lineWidth = 0.7 * scale;
  for (let i = 0; i < 4; i++) {
    const ang = i * Math.PI / 2 + 0.2;
    c.beginPath();
    c.moveTo(Math.cos(ang) * 0.5 * scale, 2 * scale + Math.sin(ang) * 0.3 * scale);
    c.lineTo(Math.cos(ang) * 1.2 * scale, 3.6 * scale + Math.sin(ang) * 0.5 * scale);
    c.stroke();
  }
  c.restore();
}

function drawEmortarKit(c, fx, fy, face, tube) {
  c.fillStyle = '#4a4438';
  c.fillRect(tube.bx - 5, tube.by + 2.2, 6.2, 4.2);
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.85;
  c.strokeRect(tube.bx - 5, tube.by + 2.2, 6.2, 4.2);
  c.strokeStyle = '#6a6858';
  c.lineWidth = 0.55;
  c.beginPath(); c.moveTo(tube.bx - 4.5, tube.by + 3.8); c.lineTo(tube.bx + 0.5, tube.by + 3.8); c.stroke();
  c.strokeStyle = 'rgba(200,198,180,0.75)';
  c.lineWidth = 0.5;
  c.strokeRect(tube.bx - 4.5, tube.by + 2.7, 2.4, 1.5);
  drawGrw81Round(c, tube.bx - 3.5, tube.by + 3.4, 0.8, 0.15);
  drawGrw81Round(c, tube.bx - 1.2, tube.by + 3.6, 0.76, -0.1);
  drawGrw81Round(c, tube.bx + 0.5, tube.by + 3.2, 0.72, 0.35);
  c.strokeStyle = '#4a4840';
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(-6.5, -1.5); c.lineTo(-6.5, 3.5); c.lineTo(-4, 3.5); c.stroke();
  for (const off of [-5.8, -5.1, -4.4]) {
    drawGrw81Round(c, off, 1.2, 0.55, -0.3);
  }
  c.fillStyle = '#3a3c34';
  c.beginPath(); c.ellipse(fy * 3.2, -fx * 3.2, 2.2, 2.8, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2c24';
  c.lineWidth = 0.8;
  c.stroke();
  c.fillStyle = '#c8b898';
  c.beginPath(); c.ellipse(fy * 3.2, -fx * 3.2, 1.2, 1.5, face, 0, 7); c.fill();
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 0.45;
  for (let i = -2; i <= 2; i++) {
    c.beginPath();
    c.moveTo(fy * 3.2 + i * 0.4, -fx * 3.2 - 1);
    c.lineTo(fy * 3.2 + i * 0.4, -fx * 3.2 + 1);
    c.stroke();
  }
  c.strokeStyle = '#5a5a50';
  c.lineWidth = 1.3;
  c.beginPath(); c.moveTo(-fy * 4.5, fx * 4.5); c.lineTo(-fy * 5.8, fx * 5.8 + 1.5); c.stroke();
  c.fillStyle = '#6a5a42';
  c.fillRect(-0.8, 3.5, 1.5, 1.3);
}

// live flame jet while a flamethrower is spraying
function drawFlameStream(actor) {
  if (!actor.flameT || actor.flameT <= 0 || !actor.t.flame) return;
  const fl = actor.t.flame;
  const range = unitRange(actor, fl.range) * fogMult();
  const bearing = actor.face;
  const fx = Math.cos(bearing), fy = Math.sin(bearing);
  const nx = actor.x + fx * (actor.t.gun + 1.2);
  const ny = actor.y + fy * (actor.t.gun + 1.2);
  const pulse = 0.82 + Math.sin(G.time * 22) * 0.18;
  const alpha = clamp(actor.flameT / 0.15, 0, 1) * pulse;
  const reach = range * (0.68 + Math.sin(G.time * 14) * 0.06);

  ctx.save();
  const tipX = nx + fx * reach * 0.75;
  const tipY = ny + fy * reach * 0.75;
  const grad = ctx.createLinearGradient(nx, ny, tipX, tipY);
  grad.addColorStop(0, `rgba(255,248,180,${0.72 * alpha})`);
  grad.addColorStop(0.25, `rgba(255,170,50,${0.55 * alpha})`);
  grad.addColorStop(0.55, `rgba(240,80,20,${0.35 * alpha})`);
  grad.addColorStop(1, 'rgba(60,25,10,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(nx, ny);
  ctx.arc(nx, ny, reach, bearing - fl.arc * 0.88, bearing + fl.arc * 0.88);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = `rgba(255,110,25,${0.14 * alpha})`;
  ctx.beginPath();
  ctx.moveTo(nx, ny);
  ctx.arc(nx, ny, reach * 1.05, bearing - fl.arc, bearing + fl.arc);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = '#fff8c8';
  ctx.beginPath(); ctx.arc(nx, ny, 2.8, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// weapon reach overlay for selected units — scales with veterancy like combat range
function drawUnitWeaponRange(a, opts) {
  const t = a.t;
  const fog = fogMult();
  const alpha = opts && opts.alpha != null ? opts.alpha : 0.35;
  const bearing = opts && opts.bearing != null ? opts.bearing
    : a.turret != null ? a.turret : a.face;

  const empl = emplacementSpec(t);
  if (empl) {
    drawATGunRangeCone(a.x, a.y, -Math.PI / 2, empl.arc + (a.rank || 0) * 0.05236, unitRange(a, t.range) * fog, alpha);
    return;
  }
  if (t.fireCone) {
    drawFireCone(a.x, a.y, bearing, t.fireCone.arc, unitRange(a, t.range) * fog, alpha);
    return;
  }
  if (t.flame) {
    drawFlameRangeCone(a.x, a.y, bearing, t.flame.arc, unitRange(a, t.flame.range) * fog, alpha);
    return;
  }
  if (t.shotgun) {
    drawBuckshotCone(a.x, a.y, bearing, t.shotgun.arc * Math.max(0.4, 1 - (a.rank || 0) * 0.08), unitRange(a, t.shotgun.range) * fog, alpha);
    return;
  }
  if (t.mortar) {
    drawMortarRangeRing(a.x, a.y, unitRange(a, t.mortar.min) * fog, unitRange(a, t.mortar.range) * fog, alpha);
    return;
  }
  if (t.sfx === 'sniper' && t.range > 200) {
    drawSniperRangeRing(a.x, a.y, unitRange(a, t.range) * fog, alpha);
    return;
  }

  let r = t.range;
  if (t.rocket) r = t.rocket.range;
  if (r <= 0) return;

  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(a.x, a.y, unitRange(a, r) * fog, 0, 7); ctx.stroke();
}

// command aura — soft fill, dashed ring, inward chevrons
function drawOfficerAuraRing(x, y, range, alpha, us) {
  const a = alpha != null ? alpha : 0.45;
  const rgb = us ? [100, 160, 230] : [190, 130, 95];
  ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.14})`;
  ctx.beginPath(); ctx.arc(x, y, range, 0, 7); ctx.fill();
  ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.78})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([7, 5]);
  ctx.beginPath(); ctx.arc(x, y, range, 0, 7); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.9})`;
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const ang = i * Math.PI / 4;
    const ox = x + Math.cos(ang) * range;
    const oy = y + Math.sin(ang) * range;
    const ix = x + Math.cos(ang) * (range - 10);
    const iy = y + Math.sin(ang) * (range - 10);
    const tx = Math.cos(ang + Math.PI / 2);
    const ty = Math.sin(ang + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(ox - tx * 4, oy - ty * 4);
    ctx.lineTo(ix, iy);
    ctx.lineTo(ox + tx * 4, oy + ty * 4);
    ctx.stroke();
  }
}

function drawSpecialistRangeAt(x, y, type, side) {
  if (type === 'medic') {
    ctx.strokeStyle = 'rgba(120,210,100,0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(x, y, MEDIC_RANGE, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
  } else if (type === 'engineer') {
    ctx.strokeStyle = 'rgba(230,190,70,0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(x, y, ENGINEER_RANGE, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
  } else if (type === 'officer' || type === 'eoff') {
    const r = type === 'eoff' ? 84 : OFFICER_AURA;
    drawOfficerAuraRing(x, y, r, 0.45, type === 'officer' || side === 'us');
  }
}

function drawSpecialistRange(a) {
  drawSpecialistRangeAt(a.x, a.y, a.type, a.side);
}

// dashed area-of-effect indicator for defense-kind placement ghosts —
// cover radius for bunker/sandbags, blast radius for mines, slow zone for wire
function drawDefenseRangeIndicator(key, x, y) {
  if (key === 'bunker' || key === 'sandbags' || key === 'camonest') {
    const r = key === 'sandbags' ? 26 : CAMONEST_ZONE;
    ctx.strokeStyle = key === 'camonest' ? 'rgba(150,190,110,0.5)' : 'rgba(120,175,235,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
  } else if (key === 'mine') {
    ctx.strokeStyle = 'rgba(220,90,50,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(x, y, 44, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
  } else if (key === 'wire') {
    ctx.strokeStyle = 'rgba(220,190,90,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(x - 40, y - 14, 80, 28);
    ctx.setLineDash([]);
  } else if (key === 'watchtower') {
    drawOfficerAuraRing(x, y, WATCHTOWER_AURA, 0.45, true);
  }
}

// one tick of flame from `actor` toward its facing: burns EVERYTHING in the
// cone regardless of side — that's the deal you make with a flamethrower
function flameSpray(actor, dt) {
  const fl = actor.t.flame;
  // fog shortens the stream the same way it shortens acquisition and the
  // drawn cone — otherwise men burn out past where the flame is rendered
  const range = unitRange(actor, fl.range) * fogMult();

  actor.flameT = 0.15;
  markCamoFired(actor);
  actor.flameSfx = (actor.flameSfx || 0) - dt;
  if (actor.flameSfx <= 0) { actor.flameSfx = 0.4; SFX.flame(); }

  const nx = actor.x + Math.cos(actor.face) * (actor.t.gun + 1.5);
  const ny = actor.y + Math.sin(actor.face) * (actor.t.gun + 1.5);
  if (Math.random() < 0.35) {
    G.flashes.push({ x: nx, y: ny, r: rand(5, 9), ttl: 0.06, max: 0.06 });
  }

  // roiling fire particles along the cone
  for (let i = 0; i < 9; i++) {
    const a = actor.face + rand(-fl.arc, fl.arc) * 0.85;
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
    const a = actor.face + rand(-fl.arc, fl.arc) * 0.6;
    const d = rand(range * 0.4, range);
    gctx.fillStyle = 'rgba(30,26,18,0.28)';
    gctx.beginPath();
    gctx.ellipse(actor.x + Math.cos(a) * d, actor.y + Math.sin(a) * d,
      rand(4, 9), rand(3, 6), rand(0, 3), 0, 7);
    gctx.fill();
  }

  // a veteran keeps the stream on target: burn scales hard with rank
  const dps = fl.dps * (1 + (actor.rank || 0) * 0.35);
  const burn = (a2) => {
    if (a2 === actor || a2.dead) return;
    const d = dist(actor, a2);
    if (d > range + 8) return;
    if (Math.abs(angleDiff(Math.atan2(a2.y - actor.y, a2.x - actor.x), actor.face)) > fl.arc) return;
    let dmg = dps * dt * rand(0.8, 1.2);
    if (a2.t.tank) dmg *= 0.6;
    // creditKill ignores German shooters, so passing actor is always safe
    if (a2.side === 'us') damageUnit(a2, dmg, actor);
    else damageEnemy(a2, dmg, actor);
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
  const baseArc = slug ? sg.arc * 0.28 : sg.arc;
  const arc = baseArc * (1 + (buffs && buffs.accBonus ? buffs.accBonus * 0.25 : 0));
  const mx = actor.x + Math.cos(actor.face) * (actor.t.gun + 2);
  const my = actor.y + Math.sin(actor.face) * (actor.t.gun + 2);

  SFX.shotgun();
  markCamoFired(actor);
  actor.shotgunBlastT = 0.12;
  G.flashes.push({ x: mx, y: my, r: 10, ttl: 0.08, max: 0.08 });
  const spreadMult = Math.max(0.4, 1 - (actor.rank || 0) * 0.08);
  if (slug) {
    // a single tight tracer punching out to full range
    G.tracers.push({
      x1: mx, y1: my,
      x2: actor.x + Math.cos(actor.face) * range, y2: actor.y + Math.sin(actor.face) * range,
      ttl: 0.06, kind: 'buckshot',
    });
  } else {
    for (let i = 0; i < sg.pellets; i++) {
      const a = actor.face + rand(-sg.spread * spreadMult, sg.spread * spreadMult);
      const d = rand(25, range);
      G.tracers.push({
        x1: mx, y1: my,
        x2: actor.x + Math.cos(a) * d, y2: actor.y + Math.sin(a) * d,
        ttl: 0.05, kind: 'buckshot',
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
  for (const e of foes) {
    if (e.dead || e.y < 0 || e.chute > 0 || isCamouflaged(e)) continue;
    const d = dist(actor, e);
    if (d > range + 8) continue;
    const ang = Math.atan2(e.y - actor.y, e.x - actor.x);
    const off = Math.abs(angleDiff(ang, actor.face));
    if (off > arc) continue;

    if (e.prone > 0 && Math.random() < 0.6) {
      G.particles.push({ x: e.x + rand(-6, 6), y: e.y + 4, vx: rand(-25, 25), vy: rand(-55, -20), ttl: 0.3, grav: 200, size: 1.3, color: '#6e6046' });
      continue;
    }
    if (coverBlock(e)) {
      G.particles.push({ x: e.x, y: e.y + 6, vx: rand(-20, 20), vy: -40, ttl: 0.3, grav: 150, size: 1.5, color: '#b8a878' });
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
    if (e.side === 'us') damageUnit(e, dmg, actor);
    else damageEnemy(e, dmg, actor);
  }
}

function friendlyNearPoint(x, y, r, except) {
  for (const u of G.units) {
    if (!u.dead && u !== except && dist(u, { x, y }) < r) return true;
  }
  return false;
}

function nearestUnitInRange(e, range, pred) {
  let best = null, bd = range;
  for (const u of G.units) {
    if (u.dead || isCamouflaged(u)) continue;
    if (pred && !pred(u)) continue;
    const d = dist(e, u);
    if (d < bd) { bd = d; best = u; }
  }
  return best;
}
