/* Trenchworks: WW2 — the Yamato, an Imperial land battleship.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// She is drawn the way a tank is (js/render-vehicles.js): one canonical frame per
// piece, baked once and blitted rotated. The hull's canonical bow points along +x,
// so the blit rotation IS ship.heading with no home-face correction. Her turrets
// and gun tubs are separate bakes blitted at their own bearings.
//
// The one rule that keeps the art honest: every piece is blitted at the PART's own
// (p.x, p.y) — the same coordinates the sim hit-tests against — never at a second
// set of offsets computed here. If the drawing and the hitbox ever disagree, the
// player is being lied to about what they're shooting at.
//
// Every paint* function below must stay free of G reads: the codex builds a bare
// makeEnemy() with a stubbed-out G to shoot its portraits, so touching G.time or
// G.selected in here would throw the moment someone opened the codex.

// 124 not 108: the barrels reach x=53.4 and makeSprite clips anything outside the
// footprint, so a 54 half-extent was one bad tweak away from shearing the muzzles
const YAM_TUR_SPR = 124, YAM_TUR_SPR_A = 62;
const YAM_TUB_SPR = 36, YAM_TUB_SPR_A = 18;

// Imperial khaki, not battleship grey: the first pass painted her in naval grey
// and she read as an Allied ship parked on the field — nothing tied her to the
// Japanese roster. These sit alongside the Chi-Ha's #6d6a3c so she reads as the
// same army's kit, scaled up.
const YAM_STEEL = '#5b5a33';
const YAM_STEEL_DK = '#38381f';
// The deck runs a shade DARKER than the roster khaki on purpose: at #6a6840 she
// sat within a few points of the field's own olive and a 300px silhouette went
// half-camouflaged. A boss has to pop off the ground.
const YAM_DECK = '#5c5a33';
const YAM_TREAD = '#22231d';
const YAM_HINOMARU = '#b42a2a';
const YAM_BRASS = '#d4be50';

// ---- the hull ---------------------------------------------------------------
// Bow at +x, stern at -x. A battleship silhouette from above — tapered bow,
// transom stern, a pagoda-mast island amidships — set on the tracked chassis that
// makes the whole conceit land: she reads as a ship first and a vehicle second.
function paintYamatoHull(c, a) {
  const L = YAM_LEN / 2;            // 150
  const B = YAM_HALF_BEAM;          // 23
  const bow = L, shoulder = L - 46, stern = -L + 10;

  // Running gear, drawn first so the hull plating covers its inboard edge and the
  // treads read as peeking out from UNDER her. They have to stop short of both
  // ends: the first pass ran them past bow and stern and they read as railway
  // rails she was parked on rather than as tracks carrying her.
  const trkA = stern + 6, trkB = shoulder - 2;
  for (const s of [-1, 1]) {
    const ty = s * (B - 2);          // tucked under the hull edge
    const th = 10;
    c.fillStyle = YAM_TREAD;
    c.fillRect(trkA, ty, trkB - trkA, s * th);
    c.fillStyle = 'rgba(140,138,116,0.20)';
    c.fillRect(trkA, ty + (s > 0 ? th - 1.4 : -th), trkB - trkA, 1.4);
    c.strokeStyle = 'rgba(0,0,0,0.55)';
    c.lineWidth = 0.9;
    for (let x = trkA + 2; x <= trkB; x += 8) {
      c.beginPath(); c.moveTo(x, ty); c.lineTo(x, ty + s * th); c.stroke();
    }
    // drive sprockets at each end of the run, so the track has somewhere to turn
    c.fillStyle = '#2e2f27';
    for (const x of [trkA + 5, trkB - 5]) {
      c.beginPath(); c.arc(x, ty + s * (th - 4), 5.2, 0, 7); c.fill();
      c.strokeStyle = 'rgba(150,148,124,0.25)'; c.lineWidth = 1;
      c.beginPath(); c.arc(x, ty + s * (th - 4), 5.2, 0, 7); c.stroke();
    }
    c.fillStyle = '#2a2b23';
    for (let x = trkA + 20; x <= trkB - 14; x += 21) {
      c.beginPath(); c.arc(x, ty + s * (th - 3.5), 3.6, 0, 7); c.fill();
    }
  }

  // the hull proper: a closed taper from transom to bow point
  c.beginPath();
  c.moveTo(bow, 0);
  c.lineTo(shoulder, -B);
  c.lineTo(stern, -B);
  c.lineTo(stern - 8, -B * 0.72);
  c.lineTo(stern - 8, B * 0.72);
  c.lineTo(stern, B);
  c.lineTo(shoulder, B);
  c.closePath();
  c.fillStyle = YAM_DECK;
  c.fill();
  c.strokeStyle = '#242414';
  c.lineWidth = 2.6;      // a heavy rim is most of what separates her from the field
  c.stroke();

  // deck shading: lit along the port rail, shadowed to starboard, so the hull
  // reads as a solid with a top rather than a flat cutout
  c.fillStyle = 'rgba(255,255,255,0.09)';
  c.fillRect(stern, -B + 1.5, shoulder - stern, 4);
  c.fillStyle = 'rgba(0,0,0,0.16)';
  c.fillRect(stern, B - 5.5, shoulder - stern, 4);

  // deck planking / plate seams
  c.strokeStyle = 'rgba(0,0,0,0.14)';
  c.lineWidth = 0.7;
  for (let x = stern + 12; x < bow - 20; x += 17) {
    c.beginPath(); c.moveTo(x, -B + 3); c.lineTo(x, B - 3); c.stroke();
  }

  // barbette rings the batteries sit in, so the turrets look mounted rather than
  // dropped on. Positions come from the same constants the sim uses.
  for (const s of YAM_TURRET_S) {
    c.fillStyle = YAM_STEEL_DK;
    c.beginPath(); c.arc(s, 0, 16, 0, 7); c.fill();
    c.fillStyle = YAM_STEEL;
    c.beginPath(); c.arc(s, 0, 13.5, 0, 7); c.fill();
  }

  // sponson pads under the gun tubs, likewise from the sim's own offsets
  for (const s of YAM_MG_S) {
    for (const b of [-YAM_MG_B, YAM_MG_B]) {
      c.fillStyle = YAM_STEEL_DK;
      c.beginPath(); c.ellipse(s, b, 8, 6.5, 0, 0, 7); c.fill();
    }
  }

  // ---- the island: pagoda mast, funnel, secondary deckhouse
  c.fillStyle = YAM_STEEL;
  c.fillRect(-26, -15, 52, 30);
  c.strokeStyle = YAM_STEEL_DK; c.lineWidth = 1.4;
  c.strokeRect(-26, -15, 52, 30);
  c.fillStyle = 'rgba(255,255,255,0.10)';
  c.fillRect(-26, -15, 52, 3.5);

  // the funnel, raked and capped. A ring rather than a filled disc — a solid dark
  // blob read as a hole punched in the deck
  c.fillStyle = YAM_STEEL_DK;
  c.beginPath(); c.ellipse(-14, 0, 8.5, 11, 0, 0, 7); c.fill();
  c.fillStyle = '#6f6d48';
  c.beginPath(); c.ellipse(-14, 0, 6.4, 8.8, 0, 0, 7); c.fill();
  c.fillStyle = '#1b1c17';
  c.beginPath(); c.ellipse(-14, 0, 4, 6, 0, 0, 7); c.fill();

  // the pagoda tower — stepped tiers climbing to the fire-control top, which is
  // the one shape that says "Yamato" from directly overhead. Each tier steps
  // LIGHTER going up so it reads as height rather than as a dark well.
  c.fillStyle = YAM_STEEL_DK;
  c.beginPath(); c.ellipse(10, 0, 13, 13, 0, 0, 7); c.fill();
  c.fillStyle = '#5e5c35';
  c.beginPath(); c.ellipse(10.8, -0.8, 10, 10, 0, 0, 7); c.fill();
  c.fillStyle = '#74724a';
  c.beginPath(); c.ellipse(11.6, -1.6, 7, 7, 0, 0, 7); c.fill();
  c.fillStyle = '#8b8960';
  c.beginPath(); c.ellipse(12.4, -2.4, 4.2, 4.2, 0, 0, 7); c.fill();
  c.fillStyle = '#a8a67a';
  c.beginPath(); c.ellipse(13, -3, 2.2, 2.2, 0, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.8;
  c.beginPath(); c.ellipse(10, 0, 13, 13, 0, 0, 7); c.stroke();

  // rangefinder arms off the tower top
  c.strokeStyle = YAM_STEEL_DK; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(10, -9.5); c.lineTo(10, -13.5); c.stroke();
  c.beginPath(); c.moveTo(10, 9.5); c.lineTo(10, 13.5); c.stroke();

  // ---- markings: hinomaru on the forward deck, yellow ID stripe aft
  c.fillStyle = YAM_HINOMARU;
  c.beginPath(); c.arc(shoulder - 16, 0, 6.5, 0, 7); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 0.9;
  c.beginPath(); c.arc(shoulder - 16, 0, 6.5, 0, 7); c.stroke();
  c.strokeStyle = 'rgba(212,190,80,0.75)';
  c.lineWidth = 2.2;
  c.beginPath(); c.moveTo(stern + 6, 0); c.lineTo(stern + 26, 0); c.stroke();

  // anchor detail at the bow, and a jackstaff, to sell the front of the ship
  c.strokeStyle = YAM_STEEL_DK; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(bow - 8, -5); c.lineTo(bow - 16, -8); c.stroke();
  c.beginPath(); c.moveTo(bow - 8, 5); c.lineTo(bow - 16, 8); c.stroke();
  c.fillStyle = YAM_BRASS;
  c.beginPath(); c.arc(bow - 6, 0, 1.8, 0, 7); c.fill();
}

// ---- a main battery --------------------------------------------------------
// Canonical bearing points the guns along +x; the blit applies p.tur. Three
// barrels, because "three cannons per battery" has to be legible at game zoom —
// one fat barrel would read as a tank.
function paintYamatoTurret(c, a) {
  // Barrels first, so the gunhouse overlaps their roots. They run long — 44px
  // against an 24px house — because at the first pass's 34/28 the whole mount
  // read as a mushroom cap rather than as three guns sticking out of a battery.
  for (const off of [-6.6, 0, 6.6]) {
    c.fillStyle = YAM_STEEL_DK;
    c.fillRect(8, off - 2.4, 44, 4.8);
    c.fillStyle = 'rgba(190,186,150,0.22)';
    c.fillRect(8, off - 2.4, 44, 1.5);
    c.fillStyle = '#15160f';
    c.fillRect(50, off - 2.9, 3.4, 5.8);
  }
  // the gunhouse: a faceted box, wider than it is long, canted face forward
  c.beginPath();
  c.moveTo(11, -12.5);
  c.lineTo(13, -8);
  c.lineTo(13, 8);
  c.lineTo(11, 12.5);
  c.lineTo(-11, 10.5);
  c.lineTo(-13, 0);
  c.lineTo(-11, -10.5);
  c.closePath();
  c.fillStyle = YAM_STEEL;
  c.fill();
  c.strokeStyle = YAM_STEEL_DK;
  c.lineWidth = 1.6;
  c.stroke();
  // roof highlight and a shadow along the starboard cheek
  c.fillStyle = 'rgba(255,255,255,0.14)';
  c.beginPath(); c.moveTo(10, -11.5); c.lineTo(-10, -9.8); c.lineTo(-10, -5.5); c.lineTo(10, -7.5); c.closePath(); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.beginPath(); c.moveTo(10, 11.5); c.lineTo(-10, 9.8); c.lineTo(-10, 6); c.lineTo(10, 7.5); c.closePath(); c.fill();
  // rangefinder blisters out the turret cheeks
  c.fillStyle = YAM_STEEL_DK;
  c.beginPath(); c.arc(-3, -12.5, 2.6, 0, 7); c.fill();
  c.beginPath(); c.arc(-3, 12.5, 2.6, 0, 7); c.fill();
}

// ---- a gun tub -------------------------------------------------------------
// An open 25mm mount: the soft spot. Deliberately drawn as an exposed crew ring
// with no roof, so the one part of her a rifleman can kill LOOKS killable.
function paintYamatoTub(c, a) {
  c.fillStyle = YAM_STEEL_DK;
  c.beginPath(); c.arc(0, 0, 6.4, 0, 7); c.fill();
  c.fillStyle = '#6b6a3c';
  c.beginPath(); c.arc(0, 0, 4.8, 0, 7); c.fill();
  // twin barrels
  for (const off of [-1.7, 1.7]) {
    c.fillStyle = '#26261e';
    c.fillRect(4, off - 0.7, 11, 1.4);
  }
  // two crewmen's helmets in the tub, so it reads as manned
  c.fillStyle = '#5c5a30';
  c.beginPath(); c.arc(-1.6, -2.2, 1.7, 0, 7); c.fill();
  c.beginPath(); c.arc(-1.6, 2.2, 1.7, 0, 7); c.fill();
}

function yamatoHullSprite(a) {
  const ext = SPRITES.get('yamato_hull');
  if (ext) return ext;
  return sprite('yamhull', YAM_SPR_W, YAM_SPR_H, YAM_SPR_W / 2, YAM_SPR_H / 2,
    (c) => paintYamatoHull(c, a));
}
function yamatoTurretSprite(a) {
  const ext = SPRITES.get('yamato_turret');
  if (ext) return ext;
  return sprite('yamturret', YAM_TUR_SPR, YAM_TUR_SPR, YAM_TUR_SPR_A, YAM_TUR_SPR_A,
    (c) => paintYamatoTurret(c, a));
}
function yamatoTubSprite(a) {
  const ext = SPRITES.get('yamato_tub');
  if (ext) return ext;
  return sprite('yamtub', YAM_TUB_SPR, YAM_TUB_SPR, YAM_TUB_SPR_A, YAM_TUB_SPR_A,
    (c) => paintYamatoTub(c, a));
}

// a knocked-out mount: a scorched ring where the gun was, so the player can see
// what they've already silenced — and see damage control put it back
function drawYamatoWreckedPart(c, p, r) {
  c.save();
  c.translate(p.x, p.y);
  c.fillStyle = 'rgba(20,18,14,0.85)';
  c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
  c.strokeStyle = 'rgba(90,74,50,0.7)';
  c.lineWidth = 1.2;
  c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke();
  c.restore();
}

// ---- the live pass ---------------------------------------------------------
function drawYamato(a) {
  const c = ctx;

  // shadow: a long ellipse under the hull, turned with her
  c.save();
  c.translate(a.x, a.y);
  c.rotate(a.heading || 0);
  c.fillStyle = 'rgba(0,0,0,0.32)';
  c.beginPath(); c.ellipse(0, 6, YAM_LEN / 2 + 4, YAM_HALF_BEAM + 12, 0, 0, 7); c.fill();
  c.restore();

  blitSprite(c, yamatoHullSprite(a), a.x, a.y, a.heading || 0, 1);

  // gun tubs under the batteries in the stack, since a turret can traverse over one
  for (const p of (a.mounts || [])) {
    if (p.dead) { drawYamatoWreckedPart(c, p, 6.4); continue; }
    blitSprite(c, yamatoTubSprite(p), p.x, p.y, p.face || 0, 1);
  }
  for (const p of (a.turrets || [])) {
    if (p.dead) { drawYamatoWreckedPart(c, p, 13); continue; }
    blitSprite(c, yamatoTurretSprite(p), p.x, p.y, p.tur || 0, 1);
    // recoil bloom off the muzzles — p.fireT is decremented in updateYamato,
    // because parts never tick the normal cosmetic timers
    if (p.fireT > 0) {
      const k = clamp(p.fireT / 0.22, 0, 1);
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.tur || 0);
      c.fillStyle = `rgba(255,206,120,${k * 0.9})`;
      for (const off of [-6.4, 0, 6.4]) {
        c.beginPath(); c.arc(47, off, 4.2 * k, 0, 7); c.fill();
      }
      c.fillStyle = `rgba(120,110,96,${k * 0.35})`;
      c.beginPath(); c.arc(56, 0, 13 * k, 0, 7); c.fill();
      c.restore();
    }
  }

  drawYamatoOverlays(a);
}

// Her health is a headline, not a footnote — a bar as wide as she is, always on,
// plus a small bar over every mount so the player can read at a glance which guns
// are still in the fight. She is culled out of the normal enemy loop, so
// drawSoldierOverlays never runs on her and this is the only overlay she gets.
// The bar itself is drawBossHpBar (js/render-overlays.js), which every boss now
// shares — this one was the pattern for it.
function drawYamatoOverlays(a) {
  const c = ctx;
  // nothing while she rolls in: drawBossHpBar centres on a.x with no screen clamp,
  // so a 200px bar and its caption would hang off the edge with her. The ship
  // herself still draws in full — the bar arriving is the fight starting.
  if (a.entering) return;
  // ticks on the YAM_SEGMENTS boundaries, as on the mass and the train: each one
  // the fill retreats past sheds a third of the plate off her guns, and a player
  // who can't see the next one coming can't tell why they suddenly bite.
  const ticks = [];
  for (let i = 1; i < YAM_SEGMENTS; i++) ticks.push(i / YAM_SEGMENTS);
  drawBossHpBar(a, a.y - YAM_HALF_BEAM - 34, 200, 'YAMATO', ticks);

  // per-mount condition
  for (const p of (a.turrets || []).concat(a.mounts || [])) {
    drawBossPartBar(p, p.t.shipTurret ? 19 : 11, p.t.shipTurret ? 26 : 14);
  }

  if (G.selected.includes(a)) {
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.lineWidth = 1;
    c.setLineDash([5, 4]);
    c.save();
    c.translate(a.x, a.y);
    c.rotate(a.heading || 0);
    c.beginPath();
    c.rect(-YAM_LEN / 2 - 4, -YAM_HALF_BEAM - 10, YAM_LEN + 8, (YAM_HALF_BEAM + 10) * 2);
    c.stroke();
    c.restore();
    c.setLineDash([]);
  }
}

// Drawn in a pass of its own, BEFORE the general enemy loop, so escorting infantry
// always paints over her deck instead of vanishing beneath it. The cull margin has
// to cover half her length plus the overlay — the loop's own 64 would pop her off
// at the screen edge.
function drawYamatoPass() {
  for (const e of G.enemies) {
    if (!e.t.ship || e.dead) continue;
    if (!inView(e.x, e.y, YAM_LEN / 2 + 70)) continue;
    drawYamato(e);
  }
}
