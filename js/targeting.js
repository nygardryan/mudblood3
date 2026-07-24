/* Trenchworks: WW2 — target selection & range/aura indicator overlays.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// the player can click an enemy to mark it as a focus target: any troop that
// could otherwise shoot it (in range, matches its own weapon's target filter)
// prefers it over its default pick, so a whole line concentrates fire on cue.
function focusPick(u, range, pred) {
  const f = G && G.focusTarget;
  if (!f || f.dead || f.y < 0 || f.chute > 0) return null;
  if (pred && !pred(f)) return null;
  if (dist2(u, f) > range * range) return null;
  return f;
}

function nearestEnemyInRange(u, range, pred) {
  const f = focusPick(u, range, pred);
  if (f) return f;
  let best = null, bd = range * range;
  for (const e of G.enemies) {
    if (e.dead || e.y < 0 || e.chute > 0) continue;
    if (pred && !pred(e)) continue;
    const d = dist2(u, e);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function firstEnemyInRange(u, range, pred) {
  const f = focusPick(u, range, pred);
  if (f) return f;
  const r2 = range * range;
  for (const e of G.enemies) {
    if (e.dead || e.y < 0 || e.chute > 0) continue;
    if (pred && !pred(e)) continue;
    if (dist2(u, e) <= r2) return e;
  }
  return null;
}

// tiered priority pick in ONE pass over G.enemies — equivalent to chaining
// nearestEnemyInRange(u, range, tier0) || nearestEnemyInRange(u, range, tier1)
// || ..., including the focus-fire override, without rescanning per tier
function tieredEnemyTarget(u, range, tiers) {
  const n = tiers.length;
  const best = new Array(n).fill(null);
  const bd = new Array(n).fill(range * range);
  for (const e of G.enemies) {
    if (e.dead || e.y < 0 || e.chute > 0) continue;
    const d2 = dist2(u, e);
    for (let i = 0; i < n; i++) {
      if (d2 < bd[i] && tiers[i](e)) { bd[i] = d2; best[i] = e; }
    }
  }
  const f = G && G.focusTarget;
  const focusOk = f && !f.dead && f.y >= 0 && !(f.chute > 0) &&
    dist2(u, f) <= range * range;
  for (let i = 0; i < n; i++) {
    if (focusOk && tiers[i](f)) return f;
    if (best[i]) return best[i];
  }
  return null;
}

// same single-pass tiered pick over G.units (enemy shooters; no focus fire)
function tieredUnitTarget(e, range, tiers) {
  const n = tiers.length;
  const best = new Array(n).fill(null);
  const bd = new Array(n).fill(range * range);
  for (const u of G.units) {
    if (u.dead || isCamouflaged(u)) continue;
    const d2 = dist2(e, u);
    for (let i = 0; i < n; i++) {
      if (d2 < bd[i] && tiers[i](u)) { bd[i] = d2; best[i] = u; }
    }
  }
  for (let i = 0; i < n; i++) if (best[i]) return best[i];
  return null;
}

function sniperTarget(u, range) {
  const f = focusPick(u, range, e => !e.t.tank);
  if (f) return f;
  let best = null, bp = -1, bd = Infinity;
  const r2 = range * range;
  for (const e of G.enemies) {
    if (e.dead || e.t.tank || e.y < 0 || e.chute > 0) continue;
    const d = dist2(u, e);
    if (d > r2) continue;
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

// Level the Barrels: the flak gun's ground-fire slice — a red wedge sharing the
// traverse but reaching only the short direct-fire range. Drawn over the steel
// air cone so the near band reads as "this arc also bites the ground."
function drawAAGroundCone(x, y, bearing, arc, range, alpha) {
  const a = alpha != null ? alpha : 0.35;
  const tipX = x + Math.cos(bearing) * range * 0.7;
  const tipY = y + Math.sin(bearing) * range * 0.7;
  const grad = ctx.createLinearGradient(x, y, tipX, tipY);
  grad.addColorStop(0, `rgba(230,70,60,${a * 0.5})`);
  grad.addColorStop(0.5, `rgba(200,45,40,${a * 0.32})`);
  grad.addColorStop(1, `rgba(150,25,25,${a * 0.08})`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, bearing - arc, bearing + arc);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(255,90,80,${Math.min(0.9, a * 1.25)})`;
  ctx.lineWidth = 1.35;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, bearing - arc, bearing + arc);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
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

// weapon reach overlay for selected units — scales with veterancy like combat range
function drawUnitWeaponRange(a, opts) {
  const t = a.t;
  const fog = fogMult();
  const alpha = opts && opts.alpha != null ? opts.alpha : 0.35;
  const bearing = opts && opts.bearing != null ? opts.bearing
    : a.turret != null ? a.turret : a.face;

  const empl = emplacementSpec(t);
  if (empl) {
    const arc = empl.arc + (a.rank || 0) * 0.05236;
    drawATGunRangeCone(a.x, a.y, -Math.PI / 2, arc, unitRange(a, t.range) * fog, alpha);
    // Level the Barrels: overlay the near wedge in red — that's the slice of
    // the traverse this flak gun can also drop onto ground infantry
    if (t.aagun && aaGroundFireEnabled()) {
      drawAAGroundCone(a.x, a.y, -Math.PI / 2, arc, AA_GROUND_RANGE * fog, alpha);
    }
    return;
  }
  if (t.fireCone) {
    // Flame Tank: paint the shorter, wider flame cone instead of the cannon arc
    const flame = tankFlame(a);
    if (flame) {
      drawFlameRangeCone(a.x, a.y, bearing, flame.arc, unitRange(a, flame.range) * fog, alpha);
    } else {
      drawFireCone(a.x, a.y, bearing, t.fireCone.arc, unitRange(a, t.range) * fog, alpha);
    }
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
  } else if (key === 'ammocrate') {
    drawOfficerAuraRing(x, y, AMMOCRATE_AURA, 0.45, true);
  }
}

function friendlyNearPoint(x, y, r, except) {
  const r2 = r * r;
  for (const u of G.units) {
    if (u.dead || u === except) continue;
    const dx = u.x - x, dy = u.y - y;
    if (dx * dx + dy * dy < r2) return true;
  }
  return false;
}

function nearestUnitInRange(e, range, pred) {
  let best = null, bd = range * range;
  for (const u of G.units) {
    if (u.dead || isCamouflaged(u)) continue;
    if (pred && !pred(u)) continue;
    const d = dist2(e, u);
    if (d < bd) { bd = d; best = u; }
  }
  // decoy scarecrows draw fire like any body on the field, unless this enemy
  // has already put rounds into one and seen through the ruse (damageDummy)
  for (const dm of G.dummies) {
    if (dm.hp <= 0 || (e.dummyBlind && e.dummyBlind.has(dm.id))) continue;
    if (pred && !pred(dm)) continue;
    const d = dist2(e, dm);
    if (d < bd) { bd = d; best = dm; }
  }
  return best;
}
