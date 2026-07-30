/* Trenchworks: WW2 — target selection & range/aura indicator overlays.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// ---- smoke and sight -------------------------------------------------------
// A smokescreen (js/smoke.js) doesn't just spoil aim — it takes the target away.
// Every pick below refuses a candidate whose sight line runs through the cloud,
// so two sides separated by a screen simply stop fighting until one blunders
// inside SMOKE_SEE_THROUGH of the other. The scans read smokeOnField() ONCE and
// only test candidates that would otherwise win, keeping a clear day free.

// ---- who is even in the fight ----------------------------------------------
// Every scan below admits only inTheFight(e) (js/helpers.js): alive, out of the
// staging strip above the top edge, canopy already shed, and not mid roll-in.
// That last term is the Yamato's: she is 300px long and comes on from the SIDE,
// so the y < 0 staging gate can't hold her — and nothing here, or anywhere else
// in the game, gates on x. Without it her stern would be shootable while off the
// edge and invisible. It is stamped on the hull and all ten parts, and cleared
// together when she reaches YAM_X_MARGIN (yamatoRollIn, js/update-enemies.js).

// the player can click an enemy to mark it as a focus target: any troop that
// could otherwise shoot it (in range, matches its own weapon's target filter)
// prefers it over its default pick, so a whole line concentrates fire on cue.
function focusPick(u, range, pred) {
  const f = G && G.focusTarget;
  if (!inTheFight(f)) return null;
  if (pred && !pred(f)) return null;
  if (dist2(u, f) > range * range) return null;
  // a marked enemy is still an order, not x-ray vision: smoke voids it
  if (smokeBlocksLOS(u, f)) return null;
  return f;
}

function nearestEnemyInRange(u, range, pred) {
  const f = focusPick(u, range, pred);
  if (f) return f;
  const sm = smokeOnField();
  let best = null, bd = range * range;
  for (const e of G.enemies) {
    if (!inTheFight(e)) continue;
    if (pred && !pred(e)) continue;
    const d = dist2(u, e);
    // the smoke test runs only on a candidate that would take the lead, and
    // leaves bd alone when it fails, so a farther *visible* enemy still wins
    if (d < bd && !(sm && smokeBlocksLOS(u, e))) { bd = d; best = e; }
  }
  return best;
}

function firstEnemyInRange(u, range, pred) {
  const f = focusPick(u, range, pred);
  if (f) return f;
  const sm = smokeOnField();
  const r2 = range * range;
  for (const e of G.enemies) {
    if (!inTheFight(e)) continue;
    if (pred && !pred(e)) continue;
    if (dist2(u, e) <= r2 && !(sm && smokeBlocksLOS(u, e))) return e;
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
  const sm = smokeOnField();
  for (const e of G.enemies) {
    if (!inTheFight(e)) continue;
    const d2 = dist2(u, e);
    let vis = -1;   // this candidate's sight line: -1 untested, 0 smoked out, 1 clear
    for (let i = 0; i < n; i++) {
      if (d2 < bd[i] && tiers[i](e)) {
        if (sm) {
          if (vis < 0) vis = smokeBlocksLOS(u, e) ? 0 : 1;
          if (!vis) break;
        }
        bd[i] = d2; best[i] = e;
      }
    }
  }
  const f = G && G.focusTarget;
  const focusOk = inTheFight(f) &&
    dist2(u, f) <= range * range && !smokeBlocksLOS(u, f);
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
  const sm = smokeOnField();
  for (const u of G.units) {
    if (u.dead || isCamouflaged(u)) continue;
    const d2 = dist2(e, u);
    let vis = -1;
    for (let i = 0; i < n; i++) {
      if (d2 < bd[i] && tiers[i](u)) {
        if (sm) {
          if (vis < 0) vis = smokeBlocksLOS(e, u) ? 0 : 1;
          if (!vis) break;
        }
        bd[i] = d2; best[i] = u;
      }
    }
  }
  for (let i = 0; i < n; i++) if (best[i]) return best[i];
  return null;
}

function sniperTarget(u, range) {
  const f = focusPick(u, range, e => !e.t.tank);
  if (f) return f;
  const sm = smokeOnField();
  let best = null, bp = -1, bd = Infinity;
  const r2 = range * range;
  for (const e of G.enemies) {
    if (!inTheFight(e) || e.t.tank) continue;
    const d = dist2(u, e);
    if (d > r2) continue;
    if (e.t.priority > bp || (e.t.priority === bp && d < bd)) {
      if (sm && smokeBlocksLOS(u, e)) continue;
      bp = e.t.priority; bd = d; best = e;
    }
  }
  return best;
}

// ---- retarget throttle -----------------------------------------------------
// A shooter's main-weapon pick barely changes frame to frame, yet the scan was
// the single most-run cost in the sim. These wrappers hold last frame's target
// for a short window and only revalidate it cheaply (still alive, still in range,
// still eligible); a full rescan runs only when the window lapses or the held
// target drops out. Measured ~2x faster at ~30 units/60 enemies, ~8x at 60/150.
// Grenades/rockets/mortars are already gated by multi-second cooldowns, so only
// the every-frame primary scans route through here.
//
// A spatial grid was also tried here and REVERTED: at this game's actor counts
// (low hundreds) a tight linear dist2 scan beats a grid at every scale — see the
// targeting-perf project note. The win is cutting scan *frequency*, not asymptotics.
const RETARGET_INTERVAL = 0.12;   // seconds a held target is reused before a rescan

function primaryEnemyTarget(u, range) {
  // focus fire is a live player command — always honoured this frame, uncached
  const focus = focusPick(u, range, null);
  if (focus) return focus;
  const c = u._tgt;
  if (c && u._tgtUntil > G.time && inTheFight(c)
      && dist2(u, c) <= range * range && !smokeBlocksLOS(u, c)) {
    return c;
  }
  // cache miss: full scan (focus already handled above)
  const sm = smokeOnField();
  let best = null, bd = range * range;
  for (const e of G.enemies) {
    if (!inTheFight(e)) continue;
    const d = dist2(u, e);
    if (d < bd && !(sm && smokeBlocksLOS(u, e))) { bd = d; best = e; }
  }
  u._tgt = best;
  u._tgtUntil = G.time + RETARGET_INTERVAL;
  return best;
}

// held target for an enemy shooter/charger vs the player's units, dummies
// included (they exist to draw fire). Revalidation mirrors nearestUnitInRange's
// eligibility so a cached pick can never be one the fresh scan would reject.
function stillTargetableUnit(e, c, r2) {
  if (!c) return false;
  if (smokeBlocksLOS(e, c)) return false;
  if (c.isDummy) {
    return c.hp > 0 && !(e.dummyBlind && e.dummyBlind.has(c.id)) && dist2(e, c) <= r2;
  }
  return !c.dead && !isCamouflaged(c) && dist2(e, c) <= r2;
}

function primaryUnitTarget(e, range) {
  if (e._tgtUntil > G.time && stillTargetableUnit(e, e._tgt, range * range)) return e._tgt;
  const t = nearestUnitInRange(e, range);
  e._tgt = t;
  e._tgtUntil = G.time + RETARGET_INTERVAL;
  return t;
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

/* ---- range wedges ----

   Every weapon cone on the field is one shape in a different palette: a
   gradient laid down the bearing, a dashed arc edge, and — on the traversing
   guns — a tick across each shoulder. They were five hand-copied arc paths,
   which is how the flamer's edge ended up stroking whatever path happened to
   be left over from its own fill. One painter, one spec per weapon.           */

function coneWedgePath(x, y, bearing, arc, range) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, bearing - arc, bearing + arc);
  ctx.closePath();
}

// a short bar laid across the sight line out at `range` — the shoulder ticks
// on a traverse wedge, and the compass ticks on the sniper's ring
function strokeRadialTick(x, y, ang, range, len) {
  const ox = x + Math.cos(ang) * range;
  const oy = y + Math.sin(ang) * range;
  const tx = Math.cos(ang + Math.PI / 2);
  const ty = Math.sin(ang + Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(ox - tx * len, oy - ty * len);
  ctx.lineTo(ox + tx * len, oy + ty * len);
  ctx.stroke();
}

// spec: { tip, fill: [[stop, css], ...], stroke, width, dash, ticks: {color, len} }
// — `tip` is how far down the bearing the gradient runs out, as a fraction of
// range; every field is optional, so a bare outline is just { stroke }.
function drawRangeCone(x, y, bearing, arc, range, spec) {
  if (spec.fill) {
    const tipX = x + Math.cos(bearing) * range * spec.tip;
    const tipY = y + Math.sin(bearing) * range * spec.tip;
    const grad = ctx.createLinearGradient(x, y, tipX, tipY);
    for (const [stop, css] of spec.fill) grad.addColorStop(stop, css);
    ctx.fillStyle = grad;
    coneWedgePath(x, y, bearing, arc, range);
    ctx.fill();
  }
  if (spec.stroke) {
    ctx.strokeStyle = spec.stroke;
    ctx.lineWidth = spec.width != null ? spec.width : 1;
    if (spec.dash) ctx.setLineDash(spec.dash);
    coneWedgePath(x, y, bearing, arc, range);
    ctx.stroke();
    if (spec.dash) ctx.setLineDash([]);
  }
  if (spec.ticks) {
    ctx.strokeStyle = spec.ticks.color;
    ctx.lineWidth = 1;
    for (const ang of [bearing - arc, bearing + arc]) {
      strokeRadialTick(x, y, ang, range, spec.ticks.len);
    }
  }
}

function drawFireCone(x, y, bearing, arc, range, alpha) {
  drawRangeCone(x, y, bearing, arc, range, {
    stroke: `rgba(255,255,255,${alpha != null ? alpha : 0.35})`,
  });
}

// anti-tank traverse wedge — steel fill, bright arc edges
function drawATGunRangeCone(x, y, bearing, arc, range, alpha) {
  const a = alpha != null ? alpha : 0.35;
  drawRangeCone(x, y, bearing, arc, range, {
    tip: 0.7,
    fill: [
      [0, `rgba(200,210,230,${a * 0.48})`],
      [0.45, `rgba(160,175,200,${a * 0.3})`],
      [1, `rgba(80,90,110,${a * 0.07})`],
    ],
    stroke: `rgba(230,238,255,${Math.min(0.92, a * 1.25)})`,
    width: 1.35,
    dash: [7, 5],
    ticks: { color: `rgba(255,255,255,${Math.min(0.88, a * 1.15)})`, len: 5 },
  });
}

// Level the Barrels: the flak gun's ground-fire slice — a red wedge sharing the
// traverse but reaching only the short direct-fire range. Drawn over the steel
// air cone so the near band reads as "this arc also bites the ground."
function drawAAGroundCone(x, y, bearing, arc, range, alpha) {
  const a = alpha != null ? alpha : 0.35;
  drawRangeCone(x, y, bearing, arc, range, {
    tip: 0.7,
    fill: [
      [0, `rgba(230,70,60,${a * 0.5})`],
      [0.5, `rgba(200,45,40,${a * 0.32})`],
      [1, `rgba(150,25,25,${a * 0.08})`],
    ],
    stroke: `rgba(255,90,80,${Math.min(0.9, a * 1.25)})`,
    width: 1.35,
    dash: [6, 4],
  });
}

// warm wedge for flamethrower reach — selection overlay and placement ghost
function drawFlameRangeCone(x, y, bearing, arc, range, alpha) {
  const a = alpha != null ? alpha : 0.35;
  drawRangeCone(x, y, bearing, arc, range, {
    tip: 0.65,
    fill: [
      [0, `rgba(255,210,90,${a * 0.55})`],
      [0.45, `rgba(255,120,30,${a * 0.35})`],
      [1, `rgba(180,50,15,${a * 0.08})`],
    ],
    stroke: `rgba(255,180,60,${a * 0.85})`,
    dash: [5, 4],
  });
}

// buckshot spread wedge — selection overlay and placement ghost. Shared: the
// trench gun's own reach, and the AT gun's canister band under Canister Shot.
function drawBuckshotCone(x, y, bearing, arc, range, alpha) {
  const a = alpha != null ? alpha : 0.35;
  drawRangeCone(x, y, bearing, arc, range, {
    tip: 0.58,
    fill: [
      [0, `rgba(210,200,170,${a * 0.52})`],
      [0.45, `rgba(170,160,130,${a * 0.32})`],
      [1, `rgba(90,85,70,${a * 0.07})`],
    ],
    stroke: `rgba(230,220,190,${a * 0.8})`,
    dash: [4, 5],
  });
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
  for (let i = 0; i < 8; i++) strokeRadialTick(x, y, i * Math.PI / 4, range, 6);
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
    const arc = emplacementArc(a);
    const full = unitRange(a, t.range) * fog;
    drawATGunRangeCone(a.x, a.y, -Math.PI / 2, arc, full, alpha);
    // Level the Barrels: overlay the near wedge in red — that's the slice of
    // the traverse this flak gun can also drop onto ground infantry
    if (t.aagun && aaGroundFireEnabled()) {
      drawAAGroundCone(a.x, a.y, -Math.PI / 2, arc, AA_GROUND_RANGE * fog, alpha);
    }
    // Canister Shot: the same idea in buckshot cream. The band is a fraction of
    // the AP reach just computed, so rank, a tower and Rangefinders move both at
    // once. The wedge takes the WIDER of the traverse and the pattern: a green
    // gun's tin opens past its own trails, and a MSG gun's trails open past the
    // tin — drawing only one of the two would lie in one direction or the other.
    if (t.atgun && canisterShotEnabled()) {
      drawBuckshotCone(a.x, a.y, -Math.PI / 2, Math.max(arc, CANISTER_ARC),
        full * CANISTER_RANGE_FRAC, alpha);
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
    drawBuckshotCone(a.x, a.y, bearing, t.shotgun.arc * rankSpreadMult(a),
      unitRange(a, t.shotgun.range) * fog, alpha);
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

// dashed area-of-effect indicator for an emplacement — cover radius for
// bunker/sandbags, blast radius for mines, slow zone for wire. Drawn both under
// the placement ghost (where the piece has no tier yet, hence the 0 default) and
// under the hover inspector, where `tier` is the piece's live fortification so
// the ring the player is shown is the reach he actually has.
//
// Returns whether anything was drawn: a decoy has no zone (it IS the effect —
// enemies shoot at it), so the inspector needs to know to fall back to the
// footprint box rather than highlight nothing.
function drawDefenseRangeIndicator(key, x, y, tier = 0) {
  if (key === 'bunker' || key === 'sandbags' || key === 'camonest') {
    const r = key === 'sandbags' ? SANDBAG_COVER_R[tier]
      : key === 'bunker' ? BUNKER_COVER_R[tier] : CAMONEST_ZONE;
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
    // Forward Observer draws the tower's second, much wider footprint: the
    // sector the spotter watches, painted fainter and UNDER the range aura so
    // the two read as one piece. Only while the card is in the plan — without
    // it the tower has no such reach. G is null when the codex opens this from
    // the main menu, hence the guard.
    if (G && G.cardsOwned && G.cardsOwned.has('forwardobserver')) {
      drawOfficerAuraRing(x, y, WATCHTOWER_SPOT_R[tier], 0.22, true);
    }
    drawOfficerAuraRing(x, y, WATCHTOWER_AURA, 0.45, true);
  } else if (key === 'ammocrate') {
    drawOfficerAuraRing(x, y, AMMOCRATE_AURA, 0.45, true);
  } else {
    return false;
  }
  return true;
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

// Does this decoy fool this enemy at all? Rolled ONCE per (enemy, decoy) pair,
// the first time the decoy would actually win his pick, and memoized — a roll
// per scan would flicker the decision several times a second and would break
// stillTargetableUnit's rule that a cached pick can never be one the fresh scan
// would reject. An ignore is written into the same dummyBlind Set the
// see-through roll uses, so both causes are read by one test at the top of the
// loop below and the cached-target path needs no new check. Reaching here with
// the pair already rolled therefore means he was fooled: dummyBlind was checked
// two lines up. Fortifying does NOT re-roll a man already on the field — the
// better disguise works on whoever arrives next.
function dummyFools(e, dm) {
  const seen = e.dummySeen || (e.dummySeen = new Set());
  if (seen.has(dm.id)) return true;
  seen.add(dm.id);
  if (Math.random() >= DUMMY_IGNORE_CHANCE[emplacementTier(dm)]) return true;
  (e.dummyBlind || (e.dummyBlind = new Set())).add(dm.id);
  return false;
}

function nearestUnitInRange(e, range, pred) {
  const sm = smokeOnField();
  let best = null, bd = range * range;
  for (const u of G.units) {
    if (u.dead || isCamouflaged(u)) continue;
    if (pred && !pred(u)) continue;
    const d = dist2(e, u);
    if (d < bd && !(sm && smokeBlocksLOS(e, u))) { bd = d; best = u; }
  }
  // decoy scarecrows draw fire like any body on the field, unless this enemy
  // never fell for it (dummyFools) or has already put rounds into one and seen
  // through the ruse (damageDummy) — dummyBlind records both. The roll sits in
  // the winning branch on purpose: a decoy that loses the distance race was
  // never something he was choosing between, and testing there keeps the cost
  // of this loop exactly what it was. Order matters too — a decoy he cannot see
  // through smoke goes unrolled, so he gets his look when the smoke clears.
  for (const dm of G.dummies) {
    if (dm.hp <= 0 || (e.dummyBlind && e.dummyBlind.has(dm.id))) continue;
    if (pred && !pred(dm)) continue;
    const d = dist2(e, dm);
    if (d < bd && !(sm && smokeBlocksLOS(e, dm)) && dummyFools(e, dm)) { bd = d; best = dm; }
  }
  return best;
}
