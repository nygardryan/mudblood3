/* Trenchworks: WW2 — hover inspector.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// Point at anything on the field — a hostile, one of your own, or an
// emplacement either is standing on — and get its name, condition, and the same
// blurb the codex carries, without leaving the fight.
//
// Hovering is mouse-only, so touch reaches the same panel three other ways, one
// per kind of subject: a long-press pins an ENEMY (nothing else can target one),
// tapping your OWN man selects him and the selection panel below says the same
// things, and tapping an EMPLACEMENT pins it. The last is the only one that had
// to be added — and it pins rather than selects, because an emplacement is not
// an actor and G.selected holds nothing else.
//
// The panel is drawn in canvas pixels, but the canvas-to-screen scale differs
// wildly between platforms: on desktop a fixed 540px world canvas is stretched
// up to fill the window (so pixels bloat), while on mobile the canvas is sized
// in device pixels (so a bigger panel is needed to stay legible). One fixed size
// can't serve both — the touch build wants the large box, desktop the compact
// one. Sizes are kept as named fields so the box-height math (drawInfoPanel) and
// the per-line text offsets stay in lockstep when they're tuned.
const HOVER_METRICS_TOUCH = {
  panelW: 384, pad: 13,
  titleFont: 'bold 19px "Courier New", monospace', titleLH: 23,
  statFont: '17px "Courier New", monospace', statLH: 19,
  descFont: '18px "Courier New", monospace', descLH: 22,
  descGap: 7,
};
const HOVER_METRICS_DESKTOP = {
  panelW: 182, pad: 6,
  titleFont: 'bold 9px "Courier New", monospace', titleLH: 11,
  statFont: '8px "Courier New", monospace', statLH: 9,
  descFont: '8px "Courier New", monospace', descLH: 11,
  descGap: 4,
};
const hoverMetrics = () => touchUI() ? HOVER_METRICS_TOUCH : HOVER_METRICS_DESKTOP;

// whoever is shooting at the player: the enemy roster
function hostileRoster() {
  if (!G) return [];
  return G.enemies;
}

// same click targets selection uses — vehicles and tanks are bigger
function actorHitRadius(a) {
  // 34 for the Yamato: her hitboxes are 62px apart, and 26 would leave gaps
  // between them that the hover would fall straight through
  if (a.t.shipPart || a.t.ship) return 34;
  // the Progenitor's mass is ~26px of body; its sacs are small and ring it, so
  // they get a tight radius or they'd swallow every click meant for the core
  if (a.t.hordeBoss) return 30;
  if (a.t.bossPart) return 12;
  // gun posts tight (they ride 22px off the wagon centreline), wagons tank-sized
  if (a.t.trainMg) return 10;
  if (a.t.itaBoss || a.t.trainPart) return 26;
  // the walker is tank-sized across the hull and stands on legs well clear of it
  if (a.t.awalker) return 30;
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

// nearest of the player's own under a point. Same radii the hostile pick uses,
// so a Sherman is as easy to point at on either side.
function friendlyAt(x, y) {
  if (!G) return null;
  let best = null, bestD = Infinity;
  for (const u of commandRoster()) {
    if (u.dead) continue;
    const d = dist(u, { x, y });
    if (d < actorHitRadius(u) && d < bestD) { best = u; bestD = d; }
  }
  return best;
}

// ---- Emplacements ----------------------------------------------------------
// An emplacement is not an actor. It lives in a per-kind array as a bare
// {x, y, hp, maxhp, up, up2} record with no `t` and no `type`, so none of what
// the panel reads off a soldier is there — and its KIND is nothing but the
// array it sits in. forEachEmplacement/emplacementBox (js/input.js) already
// resolve exactly that for the placement overlap test, so the hover walks the
// same pass rather than keeping a second table of footprints that could drift
// from the one placement actually honours.
//
// The pick is a BOX test, not a radius: most emplacements are wide, shallow
// rectangles (a wire belt is 68x16 world units), and a circle big enough to
// cover the ends of one would swallow everything sitting beside it.
//
// The panel needs a kind alongside the record, so the pick returns a small
// wrapper — `emp` marks it, and x/y are copied because an emplacement never
// moves, which is also what lets a touch pin hold one across frames.
//
// The wrapper is NEVER put in G.selected. Every consumer of that array reads
// `u.t` / issues move orders, so an emplacement in there would throw, and the
// marquee is what keeps it clean by construction: it filters commandRoster()
// (G.units), which an emplacement is not in and cannot get into. A tap on one
// pins the panel instead (handleCanvasTap).
function emplacementAt(x, y, slop = 0) {
  if (!G) return null;
  let best = null, bestD = Infinity;
  forEachEmplacement((o, key) => {
    if (o.hp <= 0) return;   // blown this frame, not yet compacted out of its array
    const b = emplacementBox(key);
    if (Math.abs(o.x - x) > b.hw + slop || Math.abs(o.y - y) > b.hh + slop) return;
    const d = Math.hypot(o.x - x, o.y - y);
    if (d < bestD) { bestD = d; best = { emp: true, o, key, x: o.x, y: o.y }; }
  });
  return best;
}

// Italian field works share their kind keys with the player's own defenses
// (sandbags/bunker/watchtower), so side is what tells the two apart everywhere
// below — makeItalianWork stamps side:'it', a player defense has none.
const emplacementIsEnemy = w => w.o.side === 'it';

// enemy works get their own copy: what matters about one is that rifles can't
// touch it, which is the opposite of everything the player's own pieces say
const IT_WORK_INFO = {
  sandbags: 'Enemy parapet. The men behind it dodge half your fire and the wall takes the round instead. Rifles cannot target it — explosives can.',
  bunker: 'Enemy pillbox. The garrison dodges three rounds in four from behind it. Rifles cannot target it; shellfire and satchels can.',
  watchtower: 'Enemy lookout. The man up it shoots a quarter further than he otherwise would. Frail, and worth shelling ahead of the bunker beside it.',
};

function emplacementName(w) {
  if (emplacementIsEnemy(w)) return ('ITALIAN ' + IT_WORK_KINDS[w.key].label).toUpperCase();
  const p = PLACEABLES.find(pl => pl.key === w.key);
  return (p ? p.label : w.key).toUpperCase();
}

function emplacementDesc(w) {
  if (emplacementIsEnemy(w)) return IT_WORK_INFO[w.key] || '';
  const p = PLACEABLES.find(pl => pl.key === w.key);
  return p ? p.desc : '';
}

function emplacementTier(o) {
  return o.up2 ? 2 : o.up ? 1 : 0;
}

// What the piece is worth right now. The player's own pieces read their per-tier
// numbers straight off the codex's FORT_TIERS table (js/codex.js) so the hover
// and the codex page can never quote different figures; the HP row there is
// static text, and is skipped in favour of the live bar.
function emplacementStats(w) {
  const o = w.o, tier = emplacementTier(o);
  const parts = [];
  if (o.maxhp) parts.push(`${Math.max(0, Math.ceil(o.hp))}/${o.maxhp} HP`);

  if (emplacementIsEnemy(w)) {
    const k = IT_WORK_KINDS[w.key];
    parts.push(FORT_TIER_META[tier].name);
    parts.push(`${Math.round(k.dodge[tier] * 100)}% DODGE`);
    if (k.rangeMult) parts.push(`+${Math.round((k.rangeMult[tier] - 1) * 100)}% RANGE`);
    parts.push(`${o.occ}/${o.cap} MANNED`);
    return parts;
  }

  if (w.key === 'mine') { parts.push('ARMED'); return parts; }

  const spec = FORT_TIERS[w.key];
  if (spec) {
    parts.push(FORT_TIER_META[tier].name);
    for (const row of spec.rows) {
      if (row.label === 'HP') continue;
      parts.push(`${row.label} ${row.v[tier]}`.toUpperCase());
    }
  }
  // an engineer part-way through a tier: the bar the player can't otherwise see
  if (o.workProg > 0) parts.push(`FORTIFYING ${Math.round(o.workProg / 6 * 100)}%`);
  return parts;
}

// a pinned panel outlives its subject: a man dies, an emplacement is blown flat
// and spliced out of its array (compactDefenses), a mine is spent
function inspectAlive(a) {
  if (!a.emp) return !a.dead;
  return a.key === 'mine' ? !a.o.dead : a.o.hp > 0;
}

// Everything under a point that the panel can describe, in priority order: a
// hostile, then one of the player's own, then the ground either is standing on.
// Men beat the emplacement they are manning — cover is only ever used by
// crowding troops onto it, so the piece is almost always under somebody, and it
// is the man the player is pointing at.
function inspectableAt(x, y, slop = 0) {
  return hostileAt(x, y) || friendlyAt(x, y) || emplacementAt(x, y, slop);
}

// how far past its own footprint a tap will still find an emplacement. Small
// and FIXED rather than the 1.35x touchHitRadius gives an actor: the pieces are
// wide (a wire belt is 68 across), so a proportional pad would reach a third of
// the way to the next one.
const EMP_TAP_SLOP = 8;

function findHoverActor() {
  // touch has no cursor: the panel is driven by a long-press pin instead
  if (touchInspect) {
    if (!inspectAlive(touchInspect)) touchInspect = null;
    return touchInspect;
  }
  if (!G || !mouse.inside || placing || touchUI()) return null;
  if (drag && drag.active) return null;
  return inspectableAt(mouse.x, mouse.y);
}

function hoverStats(a, own = false) {
  const t = a.t;
  const parts = [`${Math.max(0, Math.ceil(a.hp))}/${a.maxhp} HP`];
  // player-controlled troops carry a rank and a tally (medics/engineers earn
  // their stripes on support work, everyone else on kills) — mirrors the
  // floating selection label
  if ((a.nation || a.side) === 'us' && RANKS && RANKS[a.rank]) {
    parts.push(RANKS[a.rank].name.toUpperCase());
    parts.push(`${a.xp} ${a.type === 'medic' || a.type === 'engineer' ? 'XP' : 'KILLS'}`);
  }
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
  if (t.atgun && canisterShotEnabled()) parts.push('CANISTER');
  if (t.aagun) parts.push('FLAK');
  if (t.tank) parts.push(t.heavy ? 'HEAVY ARMOR' : 'ARMOR');
  else if (t.vehicle) parts.push('VEHICLE');
  // a boss part's plate is its PARENT's health (bossPartDamageMult), so it has to
  // be readable on the part — otherwise the segment that strips it is invisible.
  // Keyed on the mult rather than the part flags, so a fifth boss needs nothing here.
  const plate = Math.round((1 - bossPartDamageMult(a)) * 100);
  if (plate > 0) parts.push(`${plate}% RESIST`);
  if (t.aura) parts.push('AURA');
  if (t.fixed) parts.push('IMMOBILE');
  // reward is the bounty an attacker collects for killing this unit — only
  // meaningful when it's a target, not the player's own selected trooper
  if (t.reward && !own) parts.push(`+${t.reward} TP`);
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

// dashed reticle on the man under the cursor, drawn in world space. An
// emplacement gets the box it was actually picked by rather than a circle, so
// the outline reads as the piece and not as a man standing on it.
function drawHoverHighlight() {
  if (!hoverActor) return;
  ctx.strokeStyle = 'rgba(255,217,74,0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  if (hoverActor.emp) {
    const b = emplacementBox(hoverActor.key);
    ctx.rect(hoverActor.x - b.hw, hoverActor.y - b.hh, b.hw * 2, b.hh * 2);
  } else {
    ctx.arc(hoverActor.x, hoverActor.y, actorHitRadius(hoverActor) - 2, 0, 7);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

// the hover/long-press panel and the single-selected-ally panel share this box;
// pass whichever subject should be described — an actor, or the emplacement
// wrapper emplacementAt returns
function drawInfoPanel(a, own = false) {
  if (!a) return;
  const m = hoverMetrics();
  const desc = a.emp ? emplacementDesc(a) : (a.t.desc || ENEMY_INFO[a.type] || '');
  const innerW = m.panelW - m.pad * 2;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.font = m.statFont;
  const statLines = wrapCanvasText(a.emp ? emplacementStats(a) : hoverStats(a, own), innerW, ' · ');
  ctx.font = m.descFont;
  const descLines = desc ? wrapCanvasText(desc.split(/\s+/), innerW) : [];

  const h = m.pad * 2 + m.titleLH + statLines.length * m.statLH
    + (descLines.length ? m.descGap + descLines.length * m.descLH : 0);

  // the actor's position in canvas pixels — draw() has already unwound its
  // camera transform by the time we get here
  const s = viewTransformActive() ? viewScale() : 1;
  const px = viewTransformActive() ? (a.x - viewCam.x) * s : a.x;
  const py = viewTransformActive() ? (a.y - viewCam.y) * s : a.y;

  let x = px + 18;
  if (x + m.panelW > canvas.width - 4) x = px - 18 - m.panelW;
  x = clamp(x, 4, Math.max(4, canvas.width - m.panelW - 4));
  const y = clamp(py - h / 2, 4, Math.max(4, canvas.height - h - 4));

  // near-opaque: at 0.30 the battlefield read straight through the panel and the
  // text looked as washed out as the ground behind it
  ctx.fillStyle = 'rgba(16,16,10,0.94)';
  ctx.fillRect(x, y, m.panelW, h);
  ctx.strokeStyle = '#4a4836';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, m.panelW - 1, h - 1);

  let ty = y + m.pad;
  ctx.font = m.titleFont;
  ctx.fillStyle = '#ffd94a';
  ctx.fillText(a.emp ? emplacementName(a) : (a.t.name || a.type).toUpperCase(), x + m.pad, ty);
  ty += m.titleLH;

  ctx.font = m.statFont;
  ctx.fillStyle = '#8a8668';
  for (const l of statLines) { ctx.fillText(l, x + m.pad, ty); ty += m.statLH; }

  if (descLines.length) {
    ty += m.descGap;
    ctx.font = m.descFont;
    ctx.fillStyle = '#d8d2b8';
    for (const l of descLines) { ctx.fillText(l, x + m.pad, ty); ty += m.descLH; }
  }
  ctx.restore();
}

function drawHoverPanel() {
  // whatever is being inspected takes priority; otherwise a lone selected ally
  // gets the same info box (only when exactly one is selected, so a squad stays
  // uncluttered)
  if (hoverActor) {
    // the bounty line is what an ATTACKER collects, so it's suppressed on the
    // player's own — an emplacement has no reward either way
    drawInfoPanel(hoverActor, !hoverActor.emp && (hoverActor.side === 'us' || hoverActor.nation === 'us'));
    return;
  }
  if (!G || placing) return;
  if (G.selected.length === 1) drawInfoPanel(G.selected[0], true);
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
  if (!G || !G.selected.length || placing) return;
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
  if (!G) return;
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
  if (!G || !G.selected.length || placing || !mouse.inside) return;
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
  const buf = ghostBuffer('unit|' + p.kind + '|' + p.key, valid, () => {
    const a = makeUnit(p.key, 0, 0);
    a._ghost = true;
    drawPlacementActor(a);
  });
  blitGhostBuffer(buf, x, y);
}

function drawPlacementDefenseGhost(key, x, y, valid) {
  const buf = ghostBuffer('def|' + key, valid, () => {
    if (key === 'wire') drawWire({ x: 0, y: 0, up: false });
    else if (key === 'sandbags') drawSandbag({ x: 0, y: 0, up: false });
    else if (key === 'dummy') drawDummy({ x: 0, y: 0, up: false, up2: false });
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

  if (p.key === 'bodyarmor' || p.key === 'flakarmor') {
    // single-target reticle: ring the man who'd get the armor (red X if none)
    const target = nearestArmorableUnit(x, y);
    const col = p.key === 'bodyarmor' ? '#8fb3d9' : '#b7a94e';
    ctx.lineWidth = 1.5;
    if (target) {
      ctx.strokeStyle = col;
      ctx.beginPath(); ctx.arc(target.x, target.y, 15, 0, 7); ctx.stroke();
    } else {
      ctx.strokeStyle = '#d04030';
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 8); ctx.lineTo(x + 8, y + 8);
      ctx.moveTo(x + 8, y - 8); ctx.lineTo(x - 8, y + 8);
      ctx.stroke();
    }
  } else if (p.kind === 'support') {
    ctx.strokeStyle = valid
      ? (p.key === 'rankup' ? '#7fe0a0' : p.key === 'purge' ? '#ff3b3b' : '#ffd94a')
      : '#d04030';
    ctx.lineWidth = 1.5;
    const r = p.key === 'artillery' ? 95
      : p.key === 'rankup' ? RANKUP_RADIUS : p.key === 'purge' ? PURGE_RADIUS : 55;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10);
    ctx.stroke();
  } else {
    // shade the invalid zone
    ctx.fillStyle = 'rgba(200,50,40,0.12)';
    ctx.fillRect(0, 0, W, placementMinY(p));
    // engineers extend the build zone forward: carve green pockets into the red
    // for each engineer's radius, between the forward line and the deploy limit
    if (p.kind === 'defense' && placementMinY(p) > FORWARD_Y) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, FORWARD_Y, W, placementMinY(p) - FORWARD_Y);
      ctx.clip();
      ctx.fillStyle = 'rgba(90,180,110,0.20)';
      for (const u of G.units) {
        if (u.dead || u.type !== 'engineer' || u.side !== 'us') continue;
        ctx.beginPath(); ctx.arc(u.x, u.y, ENGINEER_RANGE, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
    const ghostPositions = p.key === 'mine' ? minefieldPositions(x, y) : [{ x, y }];
    for (const pos of ghostPositions) {
      if (p.kind === 'unit') {
        drawPlacementUnitGhost(p, pos.x, pos.y, valid);
      } else if (p.kind === 'defense') {
        drawPlacementDefenseGhost(p.key, pos.x, pos.y, valid);
        drawDefenseRangeIndicator(p.key, pos.x, pos.y);
      } else if (p.kind === 'itwork') {
        // an enemy work previews as the fortification it is — workKind indexes
        // the same geometry the player's own emplacement ghost uses
        drawPlacementDefenseGhost(p.workKind, pos.x, pos.y, valid);
      }
    }
    const ut = UNIT_TYPES[p.key];
    if (ut && emplacementSpec(ut)) {
      const full = ut.range * fogMult();
      drawATGunRangeCone(x, y, -Math.PI / 2, emplacementSpec(ut).arc, full, 0.45);
      // preview the red ground-fire wedge when Level the Barrels is deployed
      if (ut.aagun && aaGroundFireEnabled()) {
        drawAAGroundCone(x, y, -Math.PI / 2, emplacementSpec(ut).arc, AA_GROUND_RANGE * fogMult(), 0.45);
      }
      // and the canister band when Canister Shot is. A ghost has no rank, so
      // both numbers come off the raw type — same as the AP cone above it.
      if (ut.atgun && canisterShotEnabled()) {
        drawBuckshotCone(x, y, -Math.PI / 2, Math.max(emplacementSpec(ut).arc, CANISTER_ARC),
          full * CANISTER_RANGE_FRAC, 0.45);
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
