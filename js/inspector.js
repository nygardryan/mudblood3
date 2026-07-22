/* Trenchworks: WW2 — hover inspector.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// Point at anything hostile and get its name, condition, and the same blurb the
// codex carries — without leaving the fight. Mouse only; there is no hovering
// on touch.
const HOVER_PANEL_W = 196;
const HOVER_PAD = 7;

// whoever is shooting at the player: he runs the attackers (G.enemies) in the
// assault campaigns and in hit-squad, and the defenders (G.units) in endless
function hostileRoster() {
  if (!G) return [];
  return (isAssaultMode() || G.mode === 'hitsquad') ? G.units : G.enemies;
}

// same click targets selection uses — vehicles and tanks are bigger
function actorHitRadius(a) {
  return a.t.tank ? 26 : a.t.vehicle ? 20 : a.t.gunEmplacement ? 18 : 14;
}

// nearest hostile whose hit radius covers a world point, or null. Shared by the
// mouse hover and the mobile long-press inspector.
function hostileAt(x, y) {
  if (!G) return null;
  let best = null, bestD = Infinity;
  for (const a of hostileRoster()) {
    if (a.dead) continue;
    const d = dist(a, { x, y });
    if (d < actorHitRadius(a) && d < bestD) { best = a; bestD = d; }
  }
  return best;
}

// nearest hostile within maxR of a point, ignoring per-actor hit radius. The
// mobile inspect long-press uses this so a fingertip only has to land *near* a
// small, moving enemy, not dead on it.
function nearestHostile(x, y, maxR) {
  if (!G) return null;
  let best = null, bestD = maxR;
  for (const a of hostileRoster()) {
    if (a.dead) continue;
    const d = dist(a, { x, y });
    if (d < bestD) { best = a; bestD = d; }
  }
  return best;
}

function findHoverActor() {
  // touch has no cursor: the panel is driven by a long-press pin instead
  if (touchInspect) {
    if (touchInspect.dead) touchInspect = null;
    return touchInspect;
  }
  if (!G || !mouse.inside || placing || touchUI()) return null;
  if (drag && drag.active) return null;
  return hostileAt(mouse.x, mouse.y);
}

function hoverStats(a) {
  const t = a.t;
  const parts = [`${Math.max(0, Math.ceil(a.hp))}/${a.maxhp} HP`];
  // Flame Tank reads as a flamethrower, not a cannon: no shell, shorter reach
  const flameTank = t.tank ? tankFlame(a) : null;
  if (flameTank) parts.push('FLAME');
  else if (t.shellDmg) parts.push(`${t.shellDmg} SHELL`);
  else if (t.dmg > 0) parts.push(`${t.dmg} DMG`);
  if (t.range > 0) parts.push(`${Math.round(flameTank ? flameTank.range : t.range)} RNG`);
  if (t.flame) parts.push('FLAME');
  if (t.grenade) parts.push('GRENADES');
  if (t.rocket) parts.push('ROCKET');
  if (t.mortar) parts.push('MORTAR');
  if (t.v2) parts.push('V2 ROCKET');
  if (t.atgun) parts.push('AP SHELL');
  if (t.aagun) parts.push('FLAK');
  if (t.tank) parts.push(t.heavy ? 'HEAVY ARMOR' : 'ARMOR');
  else if (t.vehicle) parts.push('VEHICLE');
  if (t.aura) parts.push('AURA');
  if (t.fixed) parts.push('IMMOBILE');
  if (t.reward) parts.push(`+${t.reward} TP`);
  return parts;
}

// greedy wrap of `parts` into lines, against whatever font is set on ctx. Stats
// pass their segments so a line never breaks inside one ("+4" / "TP"); prose
// passes its words.
function wrapCanvasText(parts, maxW, sep = ' ') {
  const lines = [];
  let line = '';
  for (const part of parts) {
    if (!part) continue;
    const next = line ? line + sep + part : part;
    if (line && ctx.measureText(next).width > maxW) { lines.push(line); line = part; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// dashed reticle on the man under the cursor, drawn in world space
function drawHoverHighlight() {
  if (!hoverActor) return;
  ctx.strokeStyle = 'rgba(255,217,74,0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.arc(hoverActor.x, hoverActor.y, actorHitRadius(hoverActor) - 2, 0, 7);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawHoverPanel() {
  const a = hoverActor;
  if (!a) return;
  const desc = a.t.desc || ENEMY_INFO[a.type] || '';
  const innerW = HOVER_PANEL_W - HOVER_PAD * 2;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.font = '8px "Courier New", monospace';
  const statLines = wrapCanvasText(hoverStats(a), innerW, ' · ');
  ctx.font = '9px "Courier New", monospace';
  const descLines = desc ? wrapCanvasText(desc.split(/\s+/), innerW) : [];

  const h = HOVER_PAD * 2 + 11 + statLines.length * 10
    + (descLines.length ? 4 + descLines.length * 11 : 0);

  // the actor's position in canvas pixels — draw() has already unwound its
  // camera transform by the time we get here
  const s = viewTransformActive() ? viewScale() : 1;
  const px = viewTransformActive() ? (a.x - viewCam.x) * s : a.x;
  const py = viewTransformActive() ? (a.y - viewCam.y) * s : a.y;

  let x = px + 18;
  if (x + HOVER_PANEL_W > canvas.width - 4) x = px - 18 - HOVER_PANEL_W;
  x = clamp(x, 4, Math.max(4, canvas.width - HOVER_PANEL_W - 4));
  const y = clamp(py - h / 2, 4, Math.max(4, canvas.height - h - 4));

  ctx.fillStyle = 'rgba(20,20,12,0.94)';
  ctx.fillRect(x, y, HOVER_PANEL_W, h);
  ctx.strokeStyle = '#4a4836';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, HOVER_PANEL_W - 1, h - 1);

  let ty = y + HOVER_PAD;
  ctx.font = 'bold 10px "Courier New", monospace';
  ctx.fillStyle = '#ffd94a';
  ctx.fillText((a.t.name || a.type).toUpperCase(), x + HOVER_PAD, ty);
  ty += 11;

  ctx.font = '8px "Courier New", monospace';
  ctx.fillStyle = '#8a8668';
  for (const l of statLines) { ctx.fillText(l, x + HOVER_PAD, ty); ty += 10; }

  if (descLines.length) {
    ty += 4;
    ctx.font = '9px "Courier New", monospace';
    ctx.fillStyle = '#d8d2b8';
    for (const l of descLines) { ctx.fillText(l, x + HOVER_PAD, ty); ty += 11; }
  }
  ctx.restore();
}

function drawDragBox() {
  if (!drag || !drag.active) return;
  const x = Math.min(drag.x0, drag.x1), y = Math.min(drag.y0, drag.y1);
  const w = Math.abs(drag.x1 - drag.x0), h = Math.abs(drag.y1 - drag.y0);
  ctx.fillStyle = 'rgba(180,220,140,0.10)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(220,240,190,0.85)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
}

function drawForwardLine() {
  if (!showForwardLine()) return;
  const y = FORWARD_Y;
  ctx.strokeStyle = 'rgba(110,100,75,0.55)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(W, y);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let x = 18; x < W; x += 36) {
    const off = ((x / 36) | 0) % 2 ? -2 : 2;
    const sy = y + off;
    ctx.fillStyle = 'rgba(90,72,48,0.85)';
    ctx.fillRect(x - 1, sy - 5, 2, 6);
    ctx.fillStyle = 'rgba(74,58,38,0.9)';
    ctx.fillRect(x - 3, sy - 6, 6, 2);
  }
  ctx.font = '9px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText('FORWARD LINE', 10, y - 6);
  ctx.fillStyle = 'rgba(200,190,150,0.55)';
  ctx.fillText('FORWARD LINE', 9, y - 7);
}

// red tint for zones where move orders cannot be issued (matches placement ghost style)
function drawMoveRestrictedZone() {
  if (!G || !G.selected.length || placing || isAssaultMode()) return;
  if (!G.selected.some(u => !u.t.fixed)) return;

  const minY = moveOrderMinY();
  const maxY = H - 14;
  ctx.fillStyle = 'rgba(200,50,40,0.12)';
  if (minY > 0) ctx.fillRect(0, 0, W, minY);
  ctx.fillRect(0, maxY, W, H - maxY);
  ctx.fillRect(0, minY, 16, maxY - minY);
  ctx.fillRect(W - 16, minY, 16, maxY - minY);
}

function drawMoveDestinations() {
  if (!G || isAssaultMode()) return;
  for (const u of commandRoster()) {
    if (u.dead || !u.moveTo) continue;
    const dest = u.moveTo;
    const pulse = 0.35 + Math.sin(G.time * 3) * 0.12;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = 'rgba(180,220,255,0.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(dest.x, dest.y, 10, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(180,220,255,0.08)';
    ctx.beginPath(); ctx.arc(dest.x, dest.y, 10, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawMoveCursorPreview() {
  if (!G || !G.selected.length || placing || !mouse.inside || isAssaultMode()) return;
  if (!canReceiveMoveOrders()) return;
  const x = mouse.x, y = mouse.y;
  const valid = moveOrderValid(x, y);
  const r = touchUI() ? 13 : 9;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = valid ? 'rgba(120,200,90,0.8)' : 'rgba(210,70,50,0.8)';
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
}

// The placement ghost is tinted with a chained canvas filter (grayscale, plus a
// red wash when the spot is invalid). ctx.filter is very expensive on mobile
// GPUs, and re-running it on every animation frame while the ghost follows the
// finger tanked the framerate. Instead we bake each ghost sprite through the
// filter into an offscreen canvas once, then blit that cached bitmap each frame.
const GHOST_BUF_HALF = 72;   // world-space half-extent the buffer covers (fits the largest tank)
const GHOST_BUF_SS = 3;      // supersample so the bitmap stays crisp when zoomed in
const _ghostBufCache = new Map();

function clearGhostBufCache() {
  _ghostBufCache.clear();
}

// Render `drawFn` (which draws a sprite at world origin 0,0 via the shared draw
// routines) through the ghost filter into a cached offscreen canvas, keyed by
// sprite identity + validity. Baked at full alpha; the caller's globalAlpha
// applies the ghost's translucency at blit time.
function ghostBuffer(key, valid, drawFn) {
  const cacheKey = key + '|' + (valid ? 1 : 0);
  let buf = _ghostBufCache.get(cacheKey);
  if (buf) return buf;
  const px = GHOST_BUF_HALF * 2 * GHOST_BUF_SS;
  buf = document.createElement('canvas');
  buf.width = px;
  buf.height = px;
  const octx = buf.getContext('2d');
  octx.scale(GHOST_BUF_SS, GHOST_BUF_SS);
  octx.translate(GHOST_BUF_HALF, GHOST_BUF_HALF);   // sprite origin -> buffer centre
  octx.filter = valid ? 'grayscale(1)' : 'grayscale(1) sepia(1) hue-rotate(320deg) saturate(5)';
  // the shared draw routines all render through the module-global `ctx`, so
  // point it at the offscreen context for the duration of the bake
  const prevCtx = ctx;
  ctx = octx;
  try { drawFn(); } finally { ctx = prevCtx; }
  _ghostBufCache.set(cacheKey, buf);
  return buf;
}

function blitGhostBuffer(buf, x, y) {
  ctx.drawImage(buf, x - GHOST_BUF_HALF, y - GHOST_BUF_HALF, GHOST_BUF_HALF * 2, GHOST_BUF_HALF * 2);
}

function drawPlacementActor(a) {
  if (a.t.tank) drawTank(a);
  else if (a.t.atgun) drawATGun(a);
  else if (a.t.aagun) drawAAGun(a);
  else if (a.t.bike) drawBike(a);
  else if (a.t.apc) drawHalftrack(a);
  else if (a.t.vehicle) drawJeep(a);
  else drawSoldier(a);
}

function drawPlacementUnitGhost(p, x, y, valid) {
  const nation = p.kind === 'aunit' ? levelAttackerNation(G.level) : '';
  const buf = ghostBuffer('unit|' + p.kind + '|' + p.key + '|' + nation, valid, () => {
    const a = p.kind === 'aunit'
      ? makeAttacker(nation, p.key, 0, 0)
      : p.kind === 'eunit' ? makeEnemy(p.key, 0, 0)
      : p.kind === 'eparadrop' ? makeEnemy('erifle', 0, 0)
      : makeUnit(p.key, 0, 0);
    a._ghost = true;
    drawPlacementActor(a);
  });
  blitGhostBuffer(buf, x, y);
}

function drawPlacementDefenseGhost(key, x, y, valid) {
  const buf = ghostBuffer('def|' + key, valid, () => {
    if (key === 'wire') drawWire({ x: 0, y: 0, up: false });
    else if (key === 'sandbags') drawSandbag({ x: 0, y: 0, up: false });
    else if (key === 'bunker') drawBunker({ x: 0, y: 0, up: false, hp: BUNKER_HP, maxhp: BUNKER_HP });
    else if (key === 'watchtower') drawWatchtower({ x: 0, y: 0, up: false, hp: WATCHTOWER_HP, maxhp: WATCHTOWER_HP });
    else if (key === 'camonest') drawCamoNest({ x: 0, y: 0, up: false, hp: CAMONEST_HP, maxhp: CAMONEST_HP });
    else if (key === 'ammocrate') drawAmmoCrate({ x: 0, y: 0, up: false, hp: AMMOCRATE_HP, maxhp: AMMOCRATE_HP });
    else if (key === 'mine') drawMine({ x: 0, y: 0, dead: false });
  });
  blitGhostBuffer(buf, x, y);
}

function drawPlacementGhost() {
  if (!placing || !mouse.inside) return;
  const p = placing;
  const x = mouse.x, y = mouse.y;
  const valid = placementValid(p, x, y);
  ctx.globalAlpha = 0.55;

  if (p.kind === 'support') {
    ctx.strokeStyle = valid
      ? (p.key === 'rankup' ? '#7fe0a0' : p.key === 'purge' ? '#ff3b3b' : '#ffd94a')
      : '#d04030';
    ctx.lineWidth = 1.5;
    const r = p.key === 'artillery' ? 95 : p.key === 'ebarrage' ? 85
      : p.key === 'rankup' ? RANKUP_RADIUS : p.key === 'purge' ? PURGE_RADIUS : 55;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10);
    ctx.stroke();
  } else if (p.kind === 'aunit' || p.kind === 'eunit' || p.kind === 'eparadrop') {
    if (G.level && G.level.landingCraft) {
      ctx.fillStyle = 'rgba(200,50,40,0.12)';
      ctx.fillRect(0, BEACH_Y, W, H - BEACH_Y);
      for (const craft of G.landingCraft) {
        if (craft.state === 'done') continue;
        ctx.fillStyle = 'rgba(80,160,220,0.18)';
        ctx.fillRect(craft.x - craft.w / 2, craft.y - craft.h / 2, craft.w, craft.h);
      }
    } else {
      const maxDeployY = assaultDeployMaxY(p);
      ctx.fillStyle = 'rgba(200,50,40,0.12)';
      ctx.fillRect(0, maxDeployY, W, H - maxDeployY);
    }
    drawPlacementUnitGhost(p, x, y, valid);
    const et = attackerTypeStats(p);
    const face = p.kind === 'aunit' ? Math.PI / 2 : Math.PI / 2;
    if (et && et.fireCone) {
      drawFireCone(x, y, face, et.fireCone.arc, et.range * fogMult(), 0.35);
    } else if (et && et.flame) {
      drawFlameRangeCone(x, y, face, et.flame.arc, et.flame.range * fogMult(), 0.35);
    } else if (et && et.mortar) {
      drawMortarRangeRing(x, y, et.mortar.min * fogMult(), et.mortar.range * fogMult(), 0.35);
    } else if (et && et.sfx === 'sniper' && et.range > 200) {
      drawSniperRangeRing(x, y, et.range * fogMult(), 0.5);
    } else if (et) {
      let r = et.range;
      if (et.rocket) r = et.rocket.range;
      if (r > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, r * fogMult(), 0, 7); ctx.stroke();
      }
    }
    drawSpecialistRangeAt(x, y, p.kind === 'eparadrop' ? 'erifle' : p.key, p.kind === 'aunit' ? 'us' : 'de');
  } else {
    // shade the invalid zone
    ctx.fillStyle = 'rgba(200,50,40,0.12)';
    ctx.fillRect(0, 0, W, placementMinY(p));
    const ghostPositions = p.key === 'mine' ? minefieldPositions(x, y) : [{ x, y }];
    for (const pos of ghostPositions) {
      if (p.kind === 'unit') {
        drawPlacementUnitGhost(p, pos.x, pos.y, valid);
      } else if (p.kind === 'defense') {
        drawPlacementDefenseGhost(p.key, pos.x, pos.y, valid);
        drawDefenseRangeIndicator(p.key, pos.x, pos.y);
      }
    }
    const ut = UNIT_TYPES[p.key];
    if (ut && emplacementSpec(ut)) {
      drawATGunRangeCone(x, y, -Math.PI / 2, emplacementSpec(ut).arc, ut.range * fogMult(), 0.45);
      // preview the red ground-fire wedge when Level the Barrels is deployed
      if (ut.aagun && aaGroundFireEnabled()) {
        drawAAGroundCone(x, y, -Math.PI / 2, emplacementSpec(ut).arc, AA_GROUND_RANGE * fogMult(), 0.45);
      }
    } else if (ut && ut.fireCone) {
      drawFireCone(x, y, -Math.PI / 2, ut.fireCone.arc, ut.range * fogMult(), 0.35);
    } else if (ut && ut.flame) {
      drawFlameRangeCone(x, y, -Math.PI / 2, ut.flame.arc, ut.flame.range * fogMult(), 0.35);
    } else if (ut && ut.shotgun) {
      drawBuckshotCone(x, y, -Math.PI / 2, ut.shotgun.arc, ut.shotgun.range * fogMult(), 0.35);
    } else if (ut && ut.mortar) {
      drawMortarRangeRing(x, y, ut.mortar.min * fogMult(), ut.mortar.range * fogMult(), 0.35);
    } else if (ut && ut.sfx === 'sniper' && ut.range > 200) {
      drawSniperRangeRing(x, y, ut.range * fogMult(), 0.5);
    } else if (ut) {
      // show the reach of his main weapon, not the sidearm
      let r = ut.range;
      if (ut.rocket) r = ut.rocket.range;
      if (ut.shotgun) r = ut.shotgun.range;
      // Standard Issue trades a support unit's sidearm for the M1's longer reach
      if (riflemanSwapActive(p.key)) r = UNIT_TYPES.rifleman.range;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, r * fogMult(), 0, 7); ctx.stroke();
    }
    if (p.kind === 'unit') drawSpecialistRangeAt(x, y, p.key);
  }
  ctx.globalAlpha = 1;
}
