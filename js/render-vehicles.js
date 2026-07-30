/* Trenchworks: WW2 — mobile vehicle drawing (tanks, jeeps, halftracks,
   landing craft, motorcycles) and their wreck stamps.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// A tank splits into two rigid rotations about its centre: the hull (tracks,
// plate, insignia — plus the fixed gun on a casemate) turns with the heading, the
// turret with its own bearing. Each is one canonical frame per type/nation, blitted
// rotated — hull by (hullAngle - home), turret always by a.turret — so no bucketing
// and just two sprites per tank type (sprite-cache.js). The screen-fixed shadow and
// the HUD overlays stay live.
const TANK_SPR = 92, TANK_SPR_A = 46;

function tankHullSprite(a) {
  const ext = SPRITES.get(tankHullSpriteId(a));
  if (ext) return ext;
  const us = (a.nation || a.side) === 'us';
  return sprite('tankhull' + a.type + (us ? 'u' : 'e'),
    TANK_SPR, TANK_SPR, TANK_SPR_A, TANK_SPR_A, (c) => paintTankHull(c, a));
}

function tankTurretSprite(a) {
  const ext = SPRITES.get(tankTurretSpriteId(a));
  if (ext) return ext;
  const us = (a.nation || a.side) === 'us';
  return sprite('tankturret' + a.type + (us ? 'u' : 'e'),
    TANK_SPR, TANK_SPR, TANK_SPR_A, TANK_SPR_A, (c) => paintTankTurret(c, a));
}

// Per-type hull painters. All three Regio Esercito vehicles have one (see the
// block below): a fourth Italian tank should get one too rather than fall onto
// the generic branch, which carries no Italian art any more.
const HULL_PAINTERS = {
  isemo: paintSemoventeHull,
  im13: paintM13Hull,
  il3: paintL3Hull,
};

function paintTankHull(c, a) {
  const own = HULL_PAINTERS[a.type];
  if (own) return own(c, a);
  const us = (a.nation || a.side) === 'us';
  const heavy = !!a.t.heavy;
  const light = !!a.t.light;
  const casemate = !!a.t.casemate;
  const hw = heavy ? 20 : light ? 14 : 17;
  const hh = heavy ? 17 : light ? 11 : 14;
  const trackW = heavy ? 9 : light ? 7 : 8;
  const trackOff = heavy ? 27 : light ? 20 : 24;
  // tracks
  for (const tx of [-trackOff, trackOff - trackW]) {
    c.fillStyle = '#26261f';
    c.fillRect(tx, -16, trackW, 32);
    c.fillStyle = 'rgba(122,120,106,0.22)';
    c.fillRect(tx, -16, trackW, 1.4);
    c.fillRect(tx, 14.6, trackW, 1.4);
    c.strokeStyle = 'rgba(0,0,0,0.5)';
    c.lineWidth = 0.8;
    for (let ty = -14; ty <= 14; ty += 4) { c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + trackW, ty); c.stroke(); }
  }
  // hull
  c.fillStyle = a.t.color;
  c.fillRect(-hw, -hh, hw * 2, hh * 2);
  c.fillStyle = 'rgba(255,255,255,0.10)';
  c.fillRect(-hw, -hh, hw * 2, 3);
  c.fillStyle = 'rgba(0,0,0,0.18)';
  c.fillRect(-hw, hh - 3, hw * 2, 3);
  c.strokeStyle = 'rgba(0,0,0,0.28)';
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(-hw + 2, -hh + 6); c.lineTo(hw - 2, -hh + 6); c.stroke();
  c.strokeStyle = us ? '#2f3b26' : '#2b2b25';
  c.lineWidth = 1.6;
  c.strokeRect(-hw, -hh, hw * 2, hh * 2);
  if (us) {
    // white US star on the hull
    c.strokeStyle = 'rgba(230,230,220,0.85)';
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI / 2 + i * (Math.PI * 4 / 5);
      const px = Math.cos(ang) * 5, py = 8 + Math.sin(ang) * 5;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
    c.stroke();
  } else if (a.nation === 'jp') {
    // Chi-Ha: a yellow ID stripe along the hull and a red hinomaru disc
    c.strokeStyle = 'rgba(212,190,80,0.8)';
    c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(-hw + 2, 0); c.lineTo(hw - 2, 0); c.stroke();
    c.fillStyle = '#b42a2a';
    c.beginPath(); c.arc(0, 8, 3, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 0.7;
    c.beginPath(); c.arc(0, 8, 3, 0, 7); c.stroke();
  }
  if (casemate) {
    // DOWN THE HULL'S OWN AXIS (+y), not along +x. This block used to be laid
    // out in paintTankTurret's frame — barrel along +x — while everything above
    // it here (tracks, plate, insignia) is drawn facing +y. A casemate has no
    // turret sprite: `casemate: true` means the gun is baked into the hull and
    // blitted at the HULL's heading, so a +x gun on a +y hull drove downfield
    // aiming permanently at 3 o'clock, straight across its own right track.
    // The Semovente was given its own painter (paintSemoventeHull below) rather
    // than inherit that; this is the same fix for everything still on the
    // shared branch. The sim was always right — a.turret aims at the target and
    // the muzzle flash is placed 26 units along it; only the art disagreed.
    //
    // Rotated, not redrawn: every extent is the old one with (x, y) -> (-y, x),
    // so the superstructure is still 28x10 and the gun still 18 long. The one
    // deliberate change is pulling the box back 3 (-4 -> -7), because the old
    // overhang past the hull edge was 7 against hw 17 and a bare rotation would
    // have made it 10 against hh 14 — same silhouette, same seat on the hull.
    c.fillStyle = heavy ? '#3a3a34' : '#44443b';
    c.fillRect(-5, -7, 10, 28);
    c.strokeStyle = '#2b2b25'; c.lineWidth = 1.2;
    c.strokeRect(-5, -7, 10, 28);
    // the lit edge stays on the local TOP of the block (the -y side), where the
    // hull's own highlight above is — both turn with the vehicle together
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(-5, -7, 10, 1.6);
    c.fillStyle = '#4c4c43';
    c.fillRect(-3, 17, 6, 18);
    c.fillStyle = '#26261f'; c.fillRect(-3.4, 34, 6.8, 2.4);
  }
}

// Per-type turret painters, as with the hulls. A casemate has no turret sprite
// at all, so only the two Italian vehicles that carry something on the ring are
// here — and the tankette's "turret" is a flame projector, not a gun.
const TURRET_PAINTERS = {
  im13: paintM13Turret,
  il3: paintL3Projector,
};

// turret at canonical bearing (barrel along +x); the blit applies a.turret
function paintTankTurret(c, a) {
  const own = TURRET_PAINTERS[a.type];
  if (own) return own(c, a);
  const us = (a.nation || a.side) === 'us';
  const jp = a.nation === 'jp';
  const heavy = !!a.t.heavy;
  const light = !!a.t.light;
  const tr = heavy ? 12 : light ? 8 : 10;
  c.fillStyle = us ? '#54634a' : jp ? '#57552f' : (heavy ? '#353530' : '#4c4c43');
  c.fillRect(6, -2.5, heavy ? 28 : light ? 19 : 24, heavy ? 6 : light ? 4 : 5);          // barrel
  c.fillStyle = '#26261f';
  c.fillRect(heavy ? 32 : 28, -3, 2.6, heavy ? 7 : 6);          // muzzle brake
  c.fillStyle = us ? '#5b6b50' : jp ? '#6d6a3c' : (heavy ? '#3a3a34' : '#525249');
  c.beginPath(); c.arc(0, 0, tr, 0, 7); c.fill();
  c.strokeStyle = us ? '#2f3b26' : '#2b2b25';
  c.lineWidth = 1.4;
  c.beginPath(); c.arc(0, 0, tr, 0, 7); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.16)';
  c.lineWidth = 1.4;
  c.beginPath(); c.arc(0, 0, tr - 2, Math.PI * 1.05, Math.PI * 1.75); c.stroke();
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.beginPath(); c.arc(-tr * 0.28, 0, tr * 0.32, 0, 7); c.fill();
  c.strokeStyle = us ? '#3a4630' : '#33332c';
  c.lineWidth = 0.8;
  c.beginPath(); c.arc(-tr * 0.28, 0, tr * 0.32, 0, 7); c.stroke();
}

/* ---- the Regio Esercito's armour: three vehicles, three silhouettes ------

   The faction fields three fighting vehicles and they must not read as ONE
   vehicle the player meets three times. Until this block they nearly did: only
   the Semovente had its own art, and the tankette and the M13/40 were literally
   the same drawing at two scales off the generic painter above — same rectangle,
   same turret disc, same barrel with the same muzzle brake, differing in width
   and in nothing else. That is the worst case in the game for it, because these
   three are the only armour that turns up on the SAME desert biome, in the same
   sand-and-green scheme, often in the same wave, and the three do completely
   different jobs: burn the line, break the line, shell the emplacements.

   What the three SHARE is the chassis grammar — running gear, riveted seams, the
   fender lip, the disruptive scheme, the squadron markings — because that is the
   family resemblance, and it lives in the helpers below so a fourth vehicle
   inherits it in four calls. What has to DIFFER is the furniture on top, and each
   one gets a single silhouette idea a player can name from across the field:
     - L3 Lf   TOWS A TRAILER — the only towed anything in the game, and the
               flame variant's actual defining feature. Half the width of the
               others, and no turret.
     - M13/40  HAS a turret and says so twice: a riveted collar ring the turret
               sits inside, and a long thin 47/32 tube with no muzzle brake, which
               is a different barrel from every German and American gun out there.
     - Semo    NO turret disc at all; one short fat dark gun hard off-centre.
   Each painter carries its own value ladder and the reasoning behind it.
   Canonical frame for all three: forward is +y, i.e. an enemy at home heading. */
const IT_EDGE = '#242219';       // outline: the darkest step, shared with the track
const IT_TRACK = '#22221c';
const IT_FENDER = '#6f6b4b';     // the mudguard lip down a track's outer edge
const IT_CAMO = '#4a5133';       // the disruptive green over the sand base
const IT_DECK = '#4b4832';       // engine deck: the dark cap that makes the back the back
const IT_GUN = '#33322a';        // any tube, on any of the three: dark, so it cannot
                                 // be mistaken for a turret at distance
const IT_HATCH = '#5a5740';

// A riveted seam: dots along a segment, spaced to land on both ends. The one
// detail that says Italian rather than welded, and the tell shared with the
// Treno Armato.
function itRivets(c, x0, y0, x1, y1, step) {
  const dx = x1 - x0, dy = y1 - y0;
  const n = Math.max(1, Math.round(Math.hypot(dx, dy) / step));
  for (let i = 0; i <= n; i++) {
    c.beginPath();
    c.arc(x0 + dx * i / n, y0 + dy * i / n, 0.6, 0, 7);
    c.fill();
  }
}

// The running gear: a track pair with a forward drive sprocket and an aft idler,
// so the hull can't read as driving in reverse, plus the fender lip down the
// outer edge — the thing that separates the black track from the ground behind
// it. Shared by all three, and the M13/40 and the Semovente pass the SAME
// numbers because they really are the same chassis; the difference between those
// two is meant to be everything above the tracks, not the tracks.
function itRunningGear(c, off, w, hl, pitch) {
  for (const tx of [-off, off - w]) {
    c.fillStyle = IT_TRACK;
    c.fillRect(tx, -hl, w, hl * 2);
    c.fillStyle = 'rgba(140,136,118,0.22)';
    c.fillRect(tx, -hl, w, 1.3);
    c.fillRect(tx, hl - 1.3, w, 1.3);
    c.strokeStyle = 'rgba(0,0,0,0.5)';
    c.lineWidth = 0.8;
    for (let ty = -(hl - 2.5); ty <= hl - 2.5; ty += pitch) {
      c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + w, ty); c.stroke();
    }
    // Both wheels kept to thin rings at low alpha: drawn any heavier they stop
    // reading as running gear inside the track and become bolt heads on the hull
    // corners. Two of them rather than the sprocket alone, or the pair reads as
    // a set of eyes rather than wheels.
    c.strokeStyle = 'rgba(150,146,128,0.22)'; c.lineWidth = 0.9;
    c.beginPath(); c.arc(tx + w / 2, hl - 5.1, w * 0.31, 0, 7); c.stroke();
    c.beginPath(); c.arc(tx + w / 2, -(hl - 4.9), w * 0.26, 0, 7); c.stroke();
    c.fillStyle = IT_FENDER;
    c.fillRect(tx < 0 ? tx - 1.5 : tx + w, -hl, 1.5, hl * 2);
  }
}

// The squadron ID rectangle and the white cross. Both go on a dark backing pass
// first: each sits on lit plate somewhere on one of the three, and plain white
// on a lit sand slope vanishes. `s` scales the pair — the tankette is two thirds
// the size of the other two, and markings at full size on it stop being markings
// and become a feature. Pass rx null to place the cross alone, which is what
// that same lack of room asks for.
function itMarkings(c, rx, ry, cx, cy, s = 1) {
  if (rx != null) {
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.fillRect(rx - 0.4, ry - 0.4, 5.4 * s, 4 * s);
    c.fillStyle = '#a83028';
    c.fillRect(rx, ry, 4.6 * s, 3.2 * s);
  }
  for (const [w, col] of [[2.6 * s, 'rgba(0,0,0,0.45)'], [1.1 * s, 'rgba(238,238,226,0.9)']]) {
    c.strokeStyle = col; c.lineWidth = w;
    c.beginPath();
    c.moveTo(cx, cy - 2 * s); c.lineTo(cx, cy + 2 * s);
    c.moveTo(cx - 2 * s, cy); c.lineTo(cx + 2 * s, cy);
    c.stroke();
  }
}

/* ---- the Semovente 75/18 -------------------------------------------------

   The Regio Esercito's assault gun gets its own hull painter rather than the
   shared `casemate` branch above, because that branch USED TO lay its
   superstructure and gun along +x while the hull under it was drawn facing +y —
   so a casemate drove downfield with its gun aimed permanently at 3 o'clock.
   That branch has since been rotated onto the hull's axis (see the comment on
   it), so this painter is no longer a workaround for a broken shared path: it
   exists for the ART, which is the rest of this block. Either way the gun points
   where the vehicle points, which is the whole grammar of the type: no turret
   ring, so the crew aims by turning the tank.

   The vehicle is ~48×34px on screen, which buys about six features before it
   turns to mush — the first pass at this had bogies, a loader's hatch, a
   periscope, a roof Breda and a three-tone camo, and read as a crate with
   corner brackets. So it is built as a VALUE ladder instead, darkest to
   lightest: tracks and outline near-black, engine deck dark olive, casemate
   roof the lightest thing on the field piece, nose slope lighter still. That
   ladder alone says which end is the front.
   Three reads, in order:
     - NO turret circle. That one dark disc at the hull centre is what the eye
       uses to tell the M13/40 apart from this, so nothing round goes there.
     - A SHORT, FAT, DARK gun, hard off the centreline. The 75/18 is eighteen
       calibres — barely a metre of tube — so it is half the M13/40's barrel
       length and a quarter again as thick. Dark matters as much as stubby: the
       first pass drew the mantlet in light grey and it read as a turret at any
       distance. The gun is the only near-black mass forward of the deck.
     - The asymmetry it makes with the commander's cupola, which sits on the
       opposite side for exactly that reason.
   The green blotches over the sand base are the Regio Esercito's disruptive
   scheme, and they are there to keep the vehicle off the desert biome it drives
   on (see the ground note in CLAUDE.md).
   Canonical frame: forward is +y, i.e. an enemy at its home heading. */
const SEMO_MANTLET = '#403e33';

// The chassis plan, shared with the M13/40 that really shares this chassis: a
// full-width box with the nose corners cut off, so the front plate reads as
// sloped from above. Issued rather than cached as a Path2D so it can be re-run
// for the camo clip and the outline without the two drifting.
function itChassisPath(c) {
  c.beginPath();
  c.moveTo(-16, -16);
  c.lineTo(16, -16);
  c.lineTo(16, 9.5);
  c.lineTo(11, 16);
  c.lineTo(-11, 16);
  c.lineTo(-16, 9.5);
  c.closePath();
}

function paintSemoventeHull(c, a) {
  itRunningGear(c, 23, 8, 16.5, 3.4);

  // --- hull ------------------------------------------------------------------
  itChassisPath(c);
  c.fillStyle = a.t.color;
  c.fill();

  // disruptive blotches, clipped so they can't bleed onto the tracks. Two, at a
  // third alpha, laid where nothing else lands: any denser and the vehicle goes
  // a flat drab next to the M13/40 it shares a chassis with, which is the one
  // comparison a player actually makes.
  c.save();
  itChassisPath(c);
  c.clip();
  c.fillStyle = IT_CAMO;
  c.globalAlpha = 0.34;
  c.beginPath(); c.ellipse(-12, 3.5, 6, 4.6, 0.55, 0, 7); c.fill();
  c.beginPath(); c.ellipse(6, -4, 7, 3.4, -0.35, 0, 7); c.fill();
  c.globalAlpha = 1;
  c.restore();

  // --- engine deck aft: the dark cap that makes the back the back ------------
  c.fillStyle = IT_DECK;
  c.fillRect(-16, -16, 32, 8.4);
  c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 0.9;
  for (let ly = -14.2; ly <= -9.4; ly += 1.6) {
    c.beginPath(); c.moveTo(-12.5, ly); c.lineTo(12.5, ly); c.stroke();
  }
  c.fillStyle = '#3b3928';
  c.fillRect(-14.6, -8.6, 3.4, 4.6);           // muffler down the right side
  c.fillStyle = 'rgba(126,78,42,0.5)';
  c.fillRect(-14.6, -8.6, 3.4, 1.8);

  // --- light: roof band, deck seam shadow, and the lit nose slope ------------
  c.fillStyle = 'rgba(255,255,255,0.12)';
  c.fillRect(-16, -7.6, 32, 2.2);
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.fillRect(-16, -7.6, 32, 0.9);
  c.fillStyle = 'rgba(255,255,255,0.15)';
  c.beginPath();
  c.moveTo(-16, 9.5); c.lineTo(16, 9.5); c.lineTo(11, 16); c.lineTo(-11, 16);
  c.closePath(); c.fill();

  itChassisPath(c);
  c.strokeStyle = IT_EDGE; c.lineWidth = 1.6;
  c.stroke();

  // riveted plate seams — the one detail that says Italian rather than welded
  c.fillStyle = 'rgba(0,0,0,0.45)';
  itRivets(c, -14, -5.6, -14, 8.4, 4.6);
  itRivets(c, 14, -5.6, 14, 8.4, 4.6);
  itRivets(c, -14.4, 9.5, 14.4, 9.5, 4.8);

  // --- commander's two-piece roof hatch, set opposite the gun so the pair
  // reads as an asymmetric casemate rather than a hull with a turret on the
  // nose. Square, not round: the mantlet ball has to be the ONLY circle on the
  // vehicle or the two of them read as a pair of small turrets -------------
  c.fillStyle = IT_HATCH;
  c.fillRect(4.4, -3.4, 8.6, 8.6);
  c.strokeStyle = IT_EDGE; c.lineWidth = 1.1;
  c.strokeRect(4.4, -3.4, 8.6, 8.6);
  c.strokeStyle = 'rgba(0,0,0,0.42)'; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(8.7, -3.4); c.lineTo(8.7, 5.2); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.12)';
  c.fillRect(4.4, -3.4, 8.6, 1.3);

  // --- markings: squadron rectangle back on the flank, cross on the lit nose --
  itMarkings(c, -15, 1, 9, 12.6);

  // --- 75/18: a ball mantlet seated in a square armored recess, hard over to
  // the driver's right. The recess is what stops the ball-plus-tube reading as
  // a lollipop stuck on the nose — it gives the gun a housing that belongs to
  // the front plate, and it is the shape the real vehicle has ----------------
  const gx = -7.5;
  c.fillStyle = SEMO_MANTLET;
  c.fillRect(gx - 6.2, 7.6, 12.4, 9);
  c.strokeStyle = IT_EDGE; c.lineWidth = 1.2;
  c.strokeRect(gx - 6.2, 7.6, 12.4, 9);
  c.fillStyle = 'rgba(255,255,255,0.10)';
  c.fillRect(gx - 6.2, 7.6, 12.4, 1.5);
  c.fillStyle = '#4e4b3e';                              // the ball itself
  c.beginPath(); c.arc(gx, 12.4, 4.4, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1;
  c.beginPath(); c.arc(gx, 12.4, 4.4, 0, 7); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 1.2;
  c.beginPath(); c.arc(gx, 12.4, 3, Math.PI * 1.12, Math.PI * 1.9); c.stroke();
  c.fillStyle = IT_GUN;                               // stub tube
  c.fillRect(gx - 2.9, 14, 5.8, 11.5);
  c.fillStyle = 'rgba(255,255,255,0.10)';
  c.fillRect(gx - 2.9, 14, 1.7, 11.5);
  c.fillStyle = '#1d1d17';                              // plain muzzle collar
  c.fillRect(gx - 3.6, 24.6, 7.2, 2.4);
}

/* ---- the M13/40 ----------------------------------------------------------

   Same chassis as the Semovente, deliberately — `itChassisPath` and the same
   running-gear numbers, because the two really were built on one hull and the
   player is meant to see that. Everything the eye can use to tell them apart is
   therefore above the tracks, and there are only three things doing that work:

     - THE RING. The Semovente's rule is that nothing round goes at its hull
       centre; this one answers it with two concentric circles there — a riveted
       collar the turret sits down inside, plus the turret itself. A turret disc
       alone was what the generic painter already gave it, and the ring is what
       makes it read as a turret rather than as a disc pasted on a box: it is
       still visible when the turret has traversed off the centreline, and it is
       the one feature that survives at 1×.
     - THE HULL MG, a square mount with two thin whiskers overhanging the nose,
       set on the driver's right — the mirror of where the Semovente's gun sits,
       so the two vehicles are asymmetric in OPPOSITE directions. Square and not
       a ball: the turret and its ring have to be the only circles here, or a
       third disc on the nose reads as a second small turret.
     - THE CAMO RUNS THE OTHER WAY. Three long blotches down the length against
       the Semovente's two across the beam. Same green, same alpha; the pattern's
       axis is doing the work, which is free at this size where a third colour
       would just be mud.

   Value ladder, darkest to lightest, and it is the same ladder as its cousin's
   because that ladder is what says which end is the front: tracks and outline
   near-black, engine deck dark olive, hull sand, front glacis lightest. What
   differs is the DECK PATTERN — a square cross-louvred grille between twin
   exhausts, against the Semovente's full-width louvres and one muffler. */
const M13_DECK_Y = -7.4;                 // the engine-deck seam
const M13_COLLAR_R = 12.4;
// where the collar ring meets that seam. Derived, not typed in, so moving the
// deck can't leave a hoop lying across the grille.
const M13_COLLAR_A = Math.asin(-M13_DECK_Y / M13_COLLAR_R);

// The turret's plan: a faceted box, narrow across the front plate and widest at
// the shoulders. Issued rather than cached so the fill, the camo clip and the
// outline can't drift apart.
function m13TurretPath(c) {
  c.beginPath();
  c.moveTo(11.4, -4.7);
  c.lineTo(11.4, 4.7);
  c.lineTo(3, 9.6);
  c.lineTo(-7.1, 7.8);
  c.lineTo(-11.8, 0);
  c.lineTo(-7.1, -7.8);
  c.lineTo(3, -9.6);
  c.closePath();
}

function paintM13Hull(c, a) {
  itRunningGear(c, 23, 8, 16.5, 3.4);

  itChassisPath(c);
  c.fillStyle = a.t.color;
  c.fill();

  // disruptive blotches, clipped so they can't bleed onto the tracks, and laid
  // LENGTHWISE (see the header) where the deck and the ring don't cover them
  c.save();
  itChassisPath(c);
  c.clip();
  c.fillStyle = IT_CAMO;
  c.globalAlpha = 0.32;
  c.beginPath(); c.ellipse(-13, 2, 3.6, 8.4, 0.12, 0, 7); c.fill();
  c.beginPath(); c.ellipse(13.4, 0, 3.2, 7.6, -0.1, 0, 7); c.fill();
  c.beginPath(); c.ellipse(1, 13.4, 4.6, 2.4, 0, 0, 7); c.fill();
  c.globalAlpha = 1;
  c.restore();

  // --- engine deck aft, with the grille between two exhausts -----------------
  c.fillStyle = IT_DECK;
  c.fillRect(-16, -16, 32, 16 + M13_DECK_Y);
  c.fillStyle = '#413f2c';
  c.fillRect(-7, -14.8, 14, 6.4);                // the grille panel
  c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 0.8;
  for (let lx = -5.4; lx <= 5.4; lx += 2.7) {
    c.beginPath(); c.moveTo(lx, -14.4); c.lineTo(lx, -9); c.stroke();
  }
  c.beginPath(); c.moveTo(-7, -11.6); c.lineTo(7, -11.6); c.stroke();
  for (const ex of [-14.4, 11]) {                // twin exhausts, one per flank
    c.fillStyle = '#3b3928';
    c.fillRect(ex, -14.4, 3.4, 6);
    c.fillStyle = 'rgba(126,78,42,0.5)';
    c.fillRect(ex, -14.4, 3.4, 1.8);
  }

  // --- light: deck seam, then the lit glacis ---------------------------------
  c.fillStyle = 'rgba(255,255,255,0.12)';
  c.fillRect(-16, M13_DECK_Y, 32, 2);
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.fillRect(-16, M13_DECK_Y, 32, 0.9);
  c.fillStyle = 'rgba(255,255,255,0.15)';
  c.beginPath();
  c.moveTo(-16, 9.5); c.lineTo(16, 9.5); c.lineTo(11, 16); c.lineTo(-11, 16);
  c.closePath(); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(-15.6, 9.5); c.lineTo(15.6, 9.5); c.stroke();

  itChassisPath(c);
  c.strokeStyle = IT_EDGE; c.lineWidth = 1.6;
  c.stroke();

  // riveted seams: both flanks, the glacis step, and a ring of them round the
  // turret collar — this is the riveted one of the pair, so it gets the most
  c.fillStyle = 'rgba(0,0,0,0.45)';
  itRivets(c, -14, -5.6, -14, 8.4, 4.6);
  itRivets(c, 14, -5.6, 14, 8.4, 4.6);
  itRivets(c, -14.4, 9.5, 14.4, 9.5, 4.8);

  // --- the turret ring, scribed into the deck --------------------------------
  // A HAIRLINE and its rivets, nothing more. This started as a raised collar — a
  // light 3-unit band with a dark outer edge — and the M13/40's ring is nearly
  // the full width of the hull, so there was no room for a band that the turret
  // did not cover: what showed was two thick crescents either side of the turret
  // shoulders, reading as a moustache painted on the deck rather than as a ring.
  // The turret is made to read as RAISED by its own contact shadow instead (see
  // paintM13Turret); all this has to do is put a seam where the deck ends.
  // It stops where the engine-deck seam crosses it (M13_COLLAR_A, derived) — the
  // deck plate is behind the ring on the real vehicle, and a full circle here
  // would lay a hoop straight over the grille.
  const cr = M13_COLLAR_R, ca = M13_COLLAR_A;
  c.strokeStyle = 'rgba(0,0,0,0.34)'; c.lineWidth = 1.1;
  c.beginPath(); c.arc(0, 0, cr, -ca, Math.PI + ca); c.stroke();
  c.fillStyle = 'rgba(0,0,0,0.4)';
  for (let i = 0; i <= 8; i++) {
    const ang = -ca + (Math.PI + ca * 2) * i / 8;
    c.beginPath();
    c.arc(Math.cos(ang) * cr, Math.sin(ang) * cr, 0.6, 0, 7);
    c.fill();
  }

  // --- markings: squadron rectangle on the left flank, cross on the glacis ---
  itMarkings(c, -15.2, 2, -8, 12.6);

  // --- the driver's plate: a visor slit left of centre, twin Breda right.
  // Both are deliberately SMALL. The first pass gave the mount a 7.6 box and
  // 5.4-long tubes overhanging the nose, and at that size it read as a second
  // gun competing with the turret's — the hull MG is meant to be a detail that
  // says which side the driver sits on, not a weapon the eye has to resolve.
  c.fillStyle = '#2c2b22';
  c.fillRect(-5.6, 11.7, 5.2, 1.8);                   // visor slit
  c.fillStyle = 'rgba(255,255,255,0.10)';
  c.fillRect(-5.6, 11.7, 5.2, 0.6);
  c.fillStyle = SEMO_MANTLET;                          // the MG mount box
  c.fillRect(5, 10.2, 6.4, 5.4);
  c.strokeStyle = IT_EDGE; c.lineWidth = 1.1;
  c.strokeRect(5, 10.2, 6.4, 5.4);
  c.fillStyle = 'rgba(255,255,255,0.10)';
  c.fillRect(5, 10.2, 6.4, 1.2);
  c.fillStyle = IT_GUN;                                // two short tubes
  c.fillRect(6.4, 14.8, 1.3, 3.2);
  c.fillRect(8.8, 14.8, 1.3, 3.2);
}

/* The 47/32 turret. Not a disc: a faceted riveted box, narrow across the front
   plate and widest at the shoulders, which is the shape the real one has and
   also the one thing that reads as "not the German tank" when it has traversed.
   The barrel is the other half of that — LONG and THIN (22 units by 3 against
   the generic medium's 24 by 5) and with no muzzle brake at all, where every
   German and US gun on the field ends in a brake block. Canonical bearing:
   barrel along +x; the blit applies a.turret. */
function paintM13Turret(c, a) {
  // barrel first, so the mantlet laps over its root
  c.fillStyle = IT_GUN;
  c.fillRect(11, -1.5, 23, 3);
  c.fillStyle = 'rgba(255,255,255,0.10)';
  c.fillRect(11, -1.5, 23, 0.9);
  c.fillStyle = '#1d1d17';                       // plain collar, NOT a brake
  c.fillRect(32.6, -2.1, 1.8, 4.2);
  c.fillStyle = IT_GUN;                          // coaxial Breda beside it
  c.fillRect(10, 3.2, 8.4, 1.5);

  // A contact shadow first — the same outline, 12% bigger, in soft black. This is
  // what makes the turret sit ON the hull rather than in it, and it is a HALO
  // rather than an offset drop shadow on purpose: the sprite is blitted at the
  // turret's own bearing, so an offset shadow would swing round the vehicle as
  // the gun traversed and light the tank from a different side every second.
  c.save();
  c.scale(1.12, 1.12);
  m13TurretPath(c);
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.fill();
  c.restore();

  // faceted body. Its value has to clear the hull's by a real margin — at the
  // hull's own sand it vanished and left the outline drawing the whole turret.
  m13TurretPath(c);
  c.fillStyle = '#98925f';
  c.fill();
  c.save();
  m13TurretPath(c);
  c.clip();
  c.fillStyle = IT_CAMO;                         // one blotch, to tie it to the hull
  c.globalAlpha = 0.32;
  c.beginPath(); c.ellipse(-3.4, 3.8, 6.4, 3.4, 0.2, 0, 7); c.fill();
  c.globalAlpha = 1;
  c.fillStyle = 'rgba(255,255,255,0.14)';        // lit shoulder
  c.fillRect(-13, -10, 26, 3.2);
  c.fillStyle = 'rgba(0,0,0,0.16)';              // shaded skirt
  c.fillRect(-13, 7.2, 26, 3.4);
  c.restore();
  m13TurretPath(c);
  c.strokeStyle = IT_EDGE; c.lineWidth = 1.5;
  c.stroke();

  // mantlet: dark, and the only thing overlapping the front plate
  c.fillStyle = SEMO_MANTLET;
  c.fillRect(8.4, -3.5, 5.4, 7);
  c.strokeStyle = IT_EDGE; c.lineWidth = 1;
  c.strokeRect(8.4, -3.5, 5.4, 7);

  // rivets round the front plate and the two rear facets
  c.fillStyle = 'rgba(0,0,0,0.45)';
  itRivets(c, 2.4, -8.2, 2.4, 8.2, 4.1);
  itRivets(c, -6.7, -6.6, -10.4, 0, 3.6);
  itRivets(c, -6.7, 6.6, -10.4, 0, 3.6);

  // commander's hatch — the only circle up here, and offset, so the turret has
  // a left and a right at a glance
  c.fillStyle = IT_HATCH;
  c.beginPath(); c.arc(-4, -3.5, 3.2, 0, 7); c.fill();
  c.strokeStyle = IT_EDGE; c.lineWidth = 1;
  c.beginPath(); c.arc(-4, -3.5, 3.2, 0, 7); c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(-6.8, -4.8); c.lineTo(-1.2, -4.8); c.stroke();

  // rear stowage bin, so the back of the turret is unmistakably the back. Kept
  // LIGHTER than the engine deck it usually sits over: at the deck's own value it
  // dissolved into the grille and the turret lost its back.
  c.fillStyle = '#6d6849';
  c.fillRect(-14.4, -4.2, 3.4, 8.4);
  c.strokeStyle = IT_EDGE; c.lineWidth = 1;
  c.strokeRect(-14.4, -4.2, 3.4, 8.4);
  c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 0.7;
  for (const sy of [-1.4, 1.4]) {
    c.beginPath(); c.moveTo(-14.4, sy); c.lineTo(-11, sy); c.stroke();
  }
}

/* ---- the L3 Lf tankette ---------------------------------------------------

   The flame tankette, and the one Italian vehicle that is NOT on the medium
   chassis: two thirds the length of the other two and 33 units across against
   their 49, which is most of the job on its own — but only if the player can see
   that it is a different vehicle rather than the same vehicle further away, and
   scale alone can never say that. So it gets the two things neither cousin has:

     - IT TOWS A TRAILER. Nothing else in the game tows anything, and the towed
       500-litre armoured fuel bowser is what the real L3 Lf *is* — the flame gun
       is fed from behind because the tankette is too small to carry the fuel.
       Two wheels, a drawbar and a pair of hoses running forward over the engine
       deck to the projector, so the silhouette is a small box with a tail: an
       outline no other actor on the field has, at any range. It rides at the
       REAR, which for an enemy is up-screen, so it trails the way a tow should,
       and it is what the HP bar in drawTank has to dodge (see there).
     - NO TURRET AND NO GUN. The projector on the ring is a squat box and a short
       tapered nozzle — dark, stubby, and reaching out to just about the 18 units
       where drawFlameStream starts its spray, so the flame leaves the nozzle
       instead of the middle of the hull. Nothing round anywhere on the vehicle.

   Value ladder as with the other two, but with one extra step it needs because
   it is small: tracks near-black, engine deck dark olive at the REAR, hull sand,
   and then the raised crew box — the L3's real defining shape, a stepped body
   with the fighting compartment sitting proud of the deck — lighter again, with
   the front plate lightest. Four values in 25 units of length is what stops it
   reading as a plain little rectangle. One camo blotch, not two: at this size a
   second one is just a darker vehicle. */
const L3_TRAILER = '#54513a';
// how far aft the trailer's centre rides. Read by drawTank too, for its shadow.
const L3_TOW_S = 21.7;

// the tankette's plan: a short box, nose corners cut like its cousins' so the
// family read survives, but proportionally much narrower
function l3BodyPath(c) {
  c.beginPath();
  c.moveTo(-10, -12.5);
  c.lineTo(10, -12.5);
  c.lineTo(10, 8);
  c.lineTo(6.5, 12.5);
  c.lineTo(-6.5, 12.5);
  c.lineTo(-10, 8);
  c.closePath();
}

function paintL3Hull(c, a) {
  itRunningGear(c, 15, 6, 12.5, 3);

  // --- the towed fuel bowser. Drawn first, and it sits clear of the body, so
  // nothing here overlaps the vehicle itself.
  // It is deliberately NARROWER than the hull and short. The first pass had it
  // 14 wide against the hull's 20 with a full-width red band across it, and the
  // trailer then read as the vehicle and the tankette as its cab — a tow has to
  // be plainly smaller than the thing towing it, and the band has to be a hazard
  // marking rather than the brightest thing on the field piece.
  c.fillStyle = '#2b2a22';                        // drawbar
  c.fillRect(-1.2, -16.4, 2.4, 5);
  for (const wx of [-6.8, 4.8]) {                // two small road wheels
    c.fillStyle = '#26261e';
    c.beginPath(); c.ellipse(wx + 1, -21.4, 1.7, 2.8, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(150,146,128,0.22)';
    c.fillRect(wx, -22.9, 2, 0.8);
  }
  c.fillStyle = L3_TRAILER;
  c.fillRect(-5.6, -26.2, 11.2, 9.8);
  c.strokeStyle = IT_EDGE; c.lineWidth = 1.2;
  c.strokeRect(-5.6, -26.2, 11.2, 9.8);
  c.fillStyle = 'rgba(255,255,255,0.12)';        // lit top of the bowser
  c.fillRect(-5.6, -26.2, 11.2, 1.5);
  c.fillStyle = 'rgba(0,0,0,0.4)';               // hazard band, on a dark backing
  c.fillRect(-5.6, -22.4, 11.2, 2.2);
  c.fillStyle = 'rgba(150,52,42,0.75)';
  c.fillRect(-5.6, -22, 11.2, 1.4);
  c.fillStyle = 'rgba(0,0,0,0.45)';
  itRivets(c, -4.2, -25, -4.2, -17.6, 3.7);
  itRivets(c, 4.2, -25, 4.2, -17.6, 3.7);

  // --- hull ------------------------------------------------------------------
  l3BodyPath(c);
  c.fillStyle = a.t.color;
  c.fill();

  c.save();
  l3BodyPath(c);
  c.clip();
  c.fillStyle = IT_CAMO;
  c.globalAlpha = 0.32;
  c.beginPath(); c.ellipse(-6.4, 0, 4.2, 6.4, 0.3, 0, 7); c.fill();
  c.globalAlpha = 1;
  c.restore();

  // --- engine deck aft. Plain: no louvres. On a body this small the three lines
  // the Semovente's deck carries turn the whole aft half into hatching, and the
  // deck's job here is to be the dark value at the back, not a panel of detail.
  c.fillStyle = IT_DECK;
  c.fillRect(-10, -12.5, 20, 6.4);
  c.fillStyle = '#3b3928';                       // muffler down the left flank
  c.fillRect(-9, -11.6, 2.6, 4.2);
  c.fillStyle = 'rgba(126,78,42,0.5)';
  c.fillRect(-9, -11.6, 2.6, 1.4);

  // --- the raised crew compartment: the L3's own shape, and the third value
  // step. Drawn as a STEP and not as a box — a lighter plate, a lit edge along
  // its aft face and a shadow cast back onto the deck, with NO outline. Outlined,
  // it became a box inside the hull box, and since the projector mount covers its
  // middle all that was left of it was a pale rectangular frame round the mount.
  // A step has no far edge to draw, so nothing can frame anything.
  c.fillStyle = '#8f8a61';
  c.fillRect(-7.4, -4.4, 14.8, 13.2);
  c.fillStyle = 'rgba(255,255,255,0.14)';        // lit edge, aft
  c.fillRect(-7.4, -4.4, 14.8, 1.6);
  c.fillStyle = 'rgba(0,0,0,0.26)';              // its shadow onto the deck
  c.fillRect(-7.4, -6.1, 14.8, 1.7);
  // the crew hatch, hard over to the driver's side: the projector mount covers
  // the middle of the step at every bearing, so anything here has to live at the
  // edge or it is only ever half visible
  c.fillStyle = IT_HATCH;
  c.fillRect(-7, -2.4, 4, 4.4);
  c.strokeStyle = 'rgba(0,0,0,0.42)'; c.lineWidth = 0.9;
  c.strokeRect(-7, -2.4, 4, 4.4);

  // --- the fuel hoses: bowser to projector, over the deck and the crew box.
  // They live on the HULL and not on the rotating projector sprite, so they stay
  // plugged into the bowser whichever way the nozzle is pointing --------------
  c.strokeStyle = '#2e2c24'; c.lineWidth = 1.1;
  for (const hx of [-1.6, 1.2]) {
    c.beginPath();
    c.moveTo(hx, -16);
    c.quadraticCurveTo(hx + 1.8, -9, hx + 1.4, 0.4);
    c.stroke();
  }

  l3BodyPath(c);
  c.strokeStyle = IT_EDGE; c.lineWidth = 1.6;
  c.stroke();

  // --- markings: the cross alone, three quarters size. There is no clear plate
  // left for the squadron rectangle once the crew box is on, and two markings on
  // a vehicle this size stop reading as markings.
  itMarkings(c, null, 0, -5.4, 10.4, 0.75);
}

/* The flame projector on the tankette's ring. Read against paintM13Turret and
   the generic turret this is a deliberate NEGATIVE of a gun: no disc, no long
   tube, no muzzle brake — a squat armoured box and a tapered nozzle that stops
   at 18, which is the originDist drawFlameStream sprays from, so the fire starts
   at the nozzle mouth. The scorched collar at the tip is the only warm colour on
   any of the three vehicles, and it is what names the thing before it fires.
   Canonical bearing: nozzle along +x; the blit applies a.turret. */
function paintL3Projector(c, a) {
  c.fillStyle = SEMO_MANTLET;                    // the mount box on the ring
  c.fillRect(-3.6, -3.4, 8, 6.8);
  c.strokeStyle = IT_EDGE; c.lineWidth = 1.1;
  c.strokeRect(-3.6, -3.4, 8, 6.8);
  c.fillStyle = 'rgba(255,255,255,0.12)';
  c.fillRect(-3.6, -3.4, 8, 1.3);
  c.fillStyle = 'rgba(0,0,0,0.4)';               // the two fuel unions, aft
  c.fillRect(-2.9, -1.8, 1.8, 3.6);

  c.fillStyle = IT_GUN;                          // tapered nozzle
  c.beginPath();
  c.moveTo(4.2, -2.6);
  c.lineTo(15.4, -1.5);
  c.lineTo(15.4, 1.5);
  c.lineTo(4.2, 2.6);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.10)';
  c.fillRect(4.2, -2.6, 11.2, 0.8);
  c.fillStyle = '#241f18';                       // scorched muzzle collar
  c.fillRect(15.2, -2.2, 2.6, 4.4);
  c.fillStyle = 'rgba(150,70,26,0.5)';
  c.fillRect(16.4, -2.2, 1.4, 4.4);
}

function drawTank(a) {
  const us = (a.nation || a.side) === 'us';
  const c = ctx;
  const heavy = !!a.t.heavy;
  // The tankette is the one tank whose footprint isn't the house medium's: two
  // thirds the length, and a towed trailer out behind it. So it gets its own
  // shadow and its own HP bar geometry — a 44-wide bar over a 33-wide vehicle
  // reads as belonging to something else, and at the medium's 26 the bar would
  // sit ON the trailer, which is up-screen of the hull for an enemy.
  const tow = a.type === 'il3';
  const hullRot = vehicleHullAngle(a) - vehicleHomeFace(a);
  // shadow (screen-fixed, hence outside the rotated blit)
  c.save();
  c.translate(a.x, a.y);
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath();
  c.ellipse(0, 4, heavy ? 30 : tow ? 19 : 26, heavy ? 21 : tow ? 15 : 18, 0, 0, 7);
  if (tow) {
    // a second patch under the tow, placed through the hull's own rotation so it
    // tracks the trailer. One path and ONE fill: two overlapping fills at this
    // alpha leave a visibly darker crescent between the vehicle and its trailer.
    const tx = L3_TOW_S * Math.sin(hullRot), ty = 4 - L3_TOW_S * Math.cos(hullRot);
    c.moveTo(tx + 9.5, ty);
    c.ellipse(tx, ty, 9.5, 8, 0, 0, 7);
  }
  c.fill();
  c.restore();
  // hull, then turret — each a rigid rotation about the centre
  blitSprite(c, tankHullSprite(a), a.x, a.y, hullRot, 1);
  if (!a.t.casemate) blitSprite(c, tankTurretSprite(a), a.x, a.y, a.turret, 1);

  drawActorHpBar(a, tow ? 34 : 26, tow ? 32 : 44, 4, us ? '#7ec850' : '#c0562e');

  // crew veterancy chevrons
  if (us) drawRankChevrons(a, 30);

  if (us && G.selected.includes(a)) {
    drawUnitWeaponRange(a, { alpha: 0.3, bearing: a.turret });
    drawSelectionRing(a, 30);
    drawSelectionLabel(a, 40);
  }
}

function drawJeepWheel(c, x, y) {
  c.fillStyle = '#26261e';
  c.beginPath(); c.ellipse(x, y, 3.2, 5.8, 0, 0, 7); c.fill();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 1;
  c.stroke();
  c.fillStyle = '#4a4038';
  c.beginPath(); c.arc(x, y, 1.8, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  for (let i = 0; i < 4; i++) {
    const ang = i * Math.PI / 2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(ang) * 1.5, y + Math.sin(ang) * 1.5);
    c.stroke();
  }
}

function drawVehicleHMG(c, gunLen, us) {
  c.fillStyle = '#3a3830';
  c.beginPath(); c.arc(0, 0, 2.8, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 1;
  c.stroke();
  c.strokeStyle = '#26261e';
  c.lineWidth = us ? 2.8 : 2.5;
  c.beginPath(); c.moveTo(2.5, 0); c.lineTo(gunLen + 2, 0); c.stroke();
  if (us) {
    c.fillStyle = '#2a2a1e';
    c.fillRect(2.5 + gunLen * 0.22, -3, 8, 4.5);
    c.fillStyle = '#4a4038';
    c.fillRect(gunLen - 0.5, -2.5, 4.5, 5);
    c.strokeStyle = '#3a3830';
    c.lineWidth = 0.8;
    for (let t = 0.28; t <= 0.62; t += 0.12) {
      const sx = 2.5 + gunLen * t;
      c.beginPath(); c.moveTo(sx, -2); c.lineTo(sx, 2); c.stroke();
    }
  } else {
    c.strokeStyle = '#3a3830';
    c.lineWidth = 0.85;
    for (let t = 0.2; t <= 0.72; t += 0.14) {
      const sx = 2.5 + gunLen * t;
      c.beginPath(); c.moveTo(sx, -2.2); c.lineTo(sx, 2.2); c.stroke();
    }
    c.fillStyle = '#3a3828';
    c.beginPath(); c.arc(-2, 1.5, 2.2, 0, 7); c.fill();
  }
  c.fillStyle = '#3a4034';
  c.fillRect(-3.5, 2.8, 5, 3.2);
  c.strokeStyle = '#4a4a3e';
  c.lineWidth = 0.7;
  c.strokeRect(-3.5, 2.8, 5, 3.2);
}

function drawJeepBody(c, color, us) {
  const front = us ? -1 : 1;
  for (const sx of [-1, 1]) {
    c.fillStyle = color;
    c.beginPath(); c.ellipse(sx * 9, front * 9, 3.5, 5.5, 0, 0, 7); c.fill();
    c.strokeStyle = us ? '#39462f' : '#3c3c32';
    c.lineWidth = 0.9;
    c.stroke();
  }
  if (us) {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(-6, front * 12); c.lineTo(6, front * 12);
    c.lineTo(7, front * 4); c.lineTo(-7, front * 4);
    c.closePath(); c.fill();
    c.fillRect(-7, front * 2, 14, 12);
    c.strokeStyle = '#39462f';
    c.lineWidth = 1.2;
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.10)';
    c.fillRect(-6.5, front * 11.5, 13, 2);
    c.strokeStyle = '#2e3828';
    c.lineWidth = 0.7;
    for (let i = -2; i <= 2; i++) {
      c.beginPath(); c.moveTo(i * 1.5, front * 11.5); c.lineTo(i * 1.5, front * 9); c.stroke();
    }
    c.fillStyle = 'rgba(20,22,18,0.52)';
    c.fillRect(-5, front * 3 - 1, 10, 2.2);
    c.strokeStyle = '#4a4038';
    c.lineWidth = 0.8;
    c.strokeRect(-5, front * 3 - 1, 10, 2.2);
    c.fillStyle = '#26261e';
    c.beginPath(); c.arc(0, -front * 10, 3.5, 0, 7); c.fill();
    c.strokeStyle = '#3a3830';
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = '#4a4038';
    c.beginPath(); c.arc(0, -front * 10, 1.5, 0, 7); c.fill();
    c.strokeStyle = 'rgba(230,230,220,0.85)';
    c.lineWidth = 0.9;
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI / 2 + i * (Math.PI * 4 / 5);
      const px = Math.cos(ang) * 3.5, py = front * 7 + Math.sin(ang) * 3.5;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath(); c.stroke();
    c.strokeStyle = '#4a4038';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(-8, front * 12.5); c.lineTo(8, front * 12.5); c.stroke();
    c.fillStyle = us ? '#63804d' : '#5c626c';
    c.beginPath(); c.arc(-3.5, front * 6, 2.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 0.8;
    c.stroke();
  } else {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(-8, front * 13);
    c.quadraticCurveTo(-9, front * 8, -8, front * 2);
    c.lineTo(-8, -front * 10);
    c.lineTo(8, -front * 10);
    c.lineTo(8, front * 2);
    c.quadraticCurveTo(9, front * 8, 8, front * 13);
    c.closePath(); c.fill();
    c.strokeStyle = '#2b2b25';
    c.lineWidth = 1.4;
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.10)';
    c.fillRect(-7, -front * 9, 14, 2.2);
    c.strokeStyle = 'rgba(0,0,0,0.3)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(-8, front * 2); c.lineTo(-8, -front * 6); c.stroke();
    c.beginPath(); c.moveTo(8, front * 2); c.lineTo(8, -front * 6); c.stroke();
    c.strokeStyle = '#4a4a40';
    c.lineWidth = 1.1;
    for (const bx of [-5, 0, 5]) {
      c.beginPath();
      c.moveTo(bx, front * 3);
      c.quadraticCurveTo(bx, front * 0.5, bx + (bx > 0 ? 2 : bx < 0 ? -2 : 0), front * 1);
      c.stroke();
    }
    c.fillStyle = '#3a3a32';
    c.beginPath(); c.arc(0, front * 12, 2.5, 0, 7); c.fill();
    c.fillStyle = '#5c626c';
    c.beginPath(); c.arc(-3.5, front * 5, 2.2, 0, 7); c.fill();
    c.beginPath(); c.arc(3.5, front * 5, 2.2, 0, 7); c.fill();
  }
}

function stampJeepWreck(a) {
  logGroundStamp('jeep', a.x, a.y);
  gctx.save();
  gctx.translate(a.x, a.y);
  gctx.rotate(rand(-0.5, 0.5));
  gctx.fillStyle = '#33322a';
  gctx.beginPath();
  gctx.moveTo(-8, -10); gctx.lineTo(8, -12); gctx.lineTo(9, 8); gctx.lineTo(-9, 10);
  gctx.closePath(); gctx.fill();
  gctx.strokeStyle = '#26261e';
  gctx.lineWidth = 3;
  gctx.beginPath(); gctx.moveTo(2, 0); gctx.lineTo(14, rand(-4, 4)); gctx.stroke();
  gctx.fillStyle = '#211f1a';
  gctx.beginPath(); gctx.ellipse(-8, -6, 3, 5, 0.2, 0, 7); gctx.fill();
  gctx.beginPath(); gctx.ellipse(8, 6, 3, 5, -0.15, 0, 7); gctx.fill();
  gctx.fillStyle = 'rgba(40,30,20,0.35)';
  gctx.beginPath(); gctx.arc(0, 0, 5, 0, 7); gctx.fill();
  gctx.restore();
}

// A jeep is two rigid rotations about its centre, like a tank: the hull (wheels +
// body) turns with the heading, the pintle MG and its gunner with a.face. One hull
// frame and one gun frame per type/nation, blitted rotated.
const JEEP_SPR = 44, JEEP_SPR_A = 22;

function jeepHullSprite(a) {
  const ext = SPRITES.get(jeepHullSpriteId(a));
  if (ext) return ext;
  const us = (a.nation || a.side) === 'us';
  return sprite('jeephull' + a.type + (us ? 'u' : 'e'),
    JEEP_SPR, JEEP_SPR, JEEP_SPR_A, JEEP_SPR_A, (c) => paintJeepHull(c, a));
}

function jeepGunSprite(a) {
  const ext = SPRITES.get(jeepGunSpriteId(a));
  if (ext) return ext;
  const us = (a.nation || a.side) === 'us';
  return sprite('jeepgun' + a.type + (us ? 'u' : 'e'),
    JEEP_SPR, JEEP_SPR, JEEP_SPR_A, JEEP_SPR_A, (c) => paintJeepGun(c, a));
}

function paintJeepHull(c, a) {
  const us = (a.nation || a.side) === 'us';
  for (const [wx, wy] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) {
    drawJeepWheel(c, wx, wy);
  }
  drawJeepBody(c, a.t.color, us);
}

// pintle MG + gunner at canonical bearing (barrel along +x); the blit applies a.face
function paintJeepGun(c, a) {
  const us = (a.nation || a.side) === 'us';
  drawVehicleHMG(c, a.t.gun, us);
  c.fillStyle = us ? '#63804d' : '#5c626c';
  c.beginPath(); c.ellipse(-5.5, 0, 3.6, 4.8, 0, 0, 7); c.fill();
  c.fillStyle = us ? '#4a5a3f' : '#525244';
  c.beginPath(); c.ellipse(-5.5, 0, 3, 4, 0, 0, 7); c.fill();
  c.beginPath(); c.arc(-5.5, -2.8, 2.9, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = 0.85;
  c.beginPath(); c.arc(-5.5, -2.8, 2.9, 0, 7); c.stroke();
}

// Bazooka Rider card: a rocket gunner belted into the front-right seat. He sits
// square in the hull (seat offset rotates with the heading) but swings his tube
// onto a.jbazFace — whatever the rocket code last locked, independent of the
// .50's swing. A short muzzle flash fires off a.jbazFlash.
function drawJeepBazookaRider(a) {
  const c = ctx;
  const hf = vehicleHullAngle(a);
  const fwd = hf, right = hf + Math.PI / 2;
  // seat: forward of centre and off to the right of the driver
  const sx = a.x + Math.cos(fwd) * 2.5 + Math.cos(right) * 4.5;
  const sy = a.y + Math.sin(fwd) * 2.5 + Math.sin(right) * 4.5;
  const face = a.jbazFace != null ? a.jbazFace : hf;
  // launch tube across his shoulder, trained on the target
  c.save();
  c.translate(sx, sy);
  c.rotate(face);
  c.fillStyle = '#3f4a34';
  c.fillRect(-6, -1.6, 18, 3.2);
  c.strokeStyle = 'rgba(0,0,0,0.4)';
  c.lineWidth = 0.7;
  c.strokeRect(-6, -1.6, 18, 3.2);
  c.fillStyle = '#2b3325';
  c.beginPath(); c.arc(12, 0, 2.1, 0, 7); c.fill();   // muzzle bell
  if (a.jbazFlash > 0) {
    c.fillStyle = 'rgba(255,150,40,0.85)';
    c.beginPath(); c.arc(15, 0, 3.4, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,225,150,0.9)';
    c.beginPath(); c.arc(14, 0, 1.8, 0, 7); c.fill();
  }
  c.restore();
  // seated soldier: shoulders then helmet, drawn over the tube's near end
  c.fillStyle = '#5c6b45';
  c.beginPath(); c.ellipse(sx, sy, 3.2, 3.8, 0, 0, 7); c.fill();
  c.fillStyle = '#47552f';
  c.beginPath(); c.arc(sx, sy, 2.4, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = 0.7;
  c.stroke();
}

function drawJeep(a) {
  const us = (a.nation || a.side) === 'us';
  const c = ctx;
  // shadow (screen-fixed)
  c.save();
  c.translate(a.x, a.y);
  c.fillStyle = 'rgba(0,0,0,0.28)';
  c.beginPath(); c.ellipse(0, 4, 12, 15, 0, 0, 7); c.fill();
  c.restore();
  const hullRot = vehicleHullAngle(a) - vehicleHomeFace(a);
  blitSprite(c, jeepHullSprite(a), a.x, a.y, hullRot, 1);
  if (a.type === 'jeep' && jeepHasBazookaRider()) drawJeepBazookaRider(a);
  blitSprite(c, jeepGunSprite(a), a.x, a.y, a.face, 1);

  drawActorHpBar(a, 19, 22, 3, us ? '#7ec850' : '#c0562e');

  // crew chevrons / selection for our side
  if (us) drawRankChevrons(a, 23);
  if (us && G.selected.includes(a)) {
    drawUnitWeaponRange(a);
    drawSelectionRing(a, 20);
    drawSelectionLabel(a, 30);
  }
}

function stampHalftrackWreck(a) {
  logGroundStamp('halftrack', a.x, a.y);
  gctx.save();
  gctx.translate(a.x, a.y);
  gctx.rotate(rand(-0.4, 0.4));
  gctx.fillStyle = '#33322a';
  gctx.fillRect(-10, -17, 20, 34);
  gctx.fillStyle = '#211f1a';
  gctx.beginPath(); gctx.arc(0, -4, 6, 0, 7); gctx.fill();
  gctx.fillRect(-13, -16, 4, 16);
  gctx.fillRect(9, -16, 4, 16);
  gctx.restore();
}

// A halftrack's hull is screen-fixed (it only drives downfield) while its bow MG
// swivels with e.face, so it isn't a single rigid rotation — the whole body is
// baked per face bucket and per unloaded state, then blitted upright.
const HALFTRACK_SPR = 48, HALFTRACK_SPR_A = 24, HALFTRACK_FACINGS = 32;

function halftrackSprite(e) {
  // a pack ships one body per load state; the bow MG's swivel is procedural
  const ext = SPRITES.get(halftrackSpriteId(e));
  if (ext) return ext;
  const us = (e.nation || e.side) === 'us';
  const fb = faceBucket(e.face, HALFTRACK_FACINGS);
  return sprite('halftrack' + e.type + (us ? 'u' : 'e') + (e.unloaded ? 'U' : 'L') + fb,
    HALFTRACK_SPR, HALFTRACK_SPR, HALFTRACK_SPR_A, HALFTRACK_SPR_A, (c) => {
      const sv = e.face;
      e.face = fb / HALFTRACK_FACINGS * (Math.PI * 2);
      paintHalftrackBody(c, e);
      e.face = sv;
    });
}

function drawHalftrack(e) {
  blitSprite(ctx, halftrackSprite(e), e.x, e.y, 0, 1);

  if (e.hp < e.maxhp) {
    const f = clamp(e.hp / e.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - 14, e.y - 24, 28, 3.5);
    ctx.fillStyle = '#c0562e';
    ctx.fillRect(e.x - 14, e.y - 24, 28 * f, 3.5);
  }
}

// draws the halftrack body in local space (origin at the vehicle centre)
function paintHalftrackBody(c, e) {
  c.save();

  // shadow
  c.fillStyle = 'rgba(0,0,0,0.28)';
  c.beginPath(); c.ellipse(0, 4, 14, 19, 0, 0, 7); c.fill();

  // rear tracks (the back half) and front wheels — it drives downfield
  for (const tx of [-12, 7]) {
    c.fillStyle = '#26261f';
    c.fillRect(tx, -16, 5, 18);
    c.fillStyle = 'rgba(120,118,104,0.22)';
    c.fillRect(tx, -16, 5, 1.2);
    c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 0.7;
    for (let ty = -14; ty <= 0; ty += 3) { c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + 5, ty); c.stroke(); }
  }
  c.fillStyle = '#22221c';
  c.fillRect(-11, 8, 4, 7);
  c.fillRect(7, 8, 4, 7);

  // angular armored hull, tapering toward the nose
  c.fillStyle = e.t.color;
  c.beginPath();
  c.moveTo(-9, -17); c.lineTo(9, -17);
  c.lineTo(10, 4); c.lineTo(6, 16); c.lineTo(-6, 16); c.lineTo(-10, 4);
  c.closePath(); c.fill();
  c.strokeStyle = '#2b2b25';
  c.lineWidth = 1.4;
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.09)';
  c.fillRect(-9, -17, 18, 2.4);
  // engine deck seam at the nose
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.moveTo(-8, 7); c.lineTo(8, 7); c.stroke();

  // open troop bay; helmets visible until the squad piles out
  c.fillStyle = '#34342c';
  c.fillRect(-7, -15, 14, 16);
  c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 0.9;
  c.strokeRect(-7, -15, 14, 16);
  if (!e.unloaded) {
    c.fillStyle = '#5c626c';
    for (const [hx, hy] of [[-3.5, -11], [3.5, -11], [-3.5, -5], [3.5, -5], [0, -8]]) {
      c.beginPath(); c.arc(hx, hy, 2.4, 0, 7); c.fill();
    }
  }

  // bow MG and gunner
  c.rotate(e.face);
  c.strokeStyle = '#1c1c16';
  c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(4, 0); c.lineTo(e.t.gun + 4, 0); c.stroke();
  c.rotate(-e.face);
  c.fillStyle = '#5c626c';
  c.beginPath(); c.arc(0, 2.5, 2.8, 0, 7); c.fill();
  c.restore();
}

// a bike tire seen from above: narrow dark oval with a rim highlight,
// plus a body-coloured fender arching over its leading half
function drawBikeWheel(c, x, y, body) {
  c.fillStyle = '#1d1d18';
  c.beginPath(); c.ellipse(x, y, 2.3, 5.2, 0, 0, 7); c.fill();
  c.strokeStyle = 'rgba(120,118,104,0.4)';
  c.lineWidth = 0.8;
  c.beginPath(); c.ellipse(x, y, 1, 3.6, 0, 0, 7); c.stroke();
  c.fillStyle = body;
  c.strokeStyle = '#2b2e33';
  c.lineWidth = 0.8;
  c.beginPath(); c.ellipse(x, y - 3, 3.1, 3.4, 0, Math.PI, 2 * Math.PI); c.fill(); c.stroke();
}

// The whole bike rig is drawn inside one rotate(lean) — a rigid rotation — so one
// canonical frame per type/nation covers every lean angle, rotated at blit.
const BIKE_SPR = 42, BIKE_SPR_A = 21;

function bikeSprite(e) {
  const ext = SPRITES.get(bikeSpriteId(e));
  if (ext) return ext;
  const us = (e.nation || e.side) === 'us';
  return sprite('bike' + e.type + (us ? 'u' : 'e'),
    BIKE_SPR, BIKE_SPR, BIKE_SPR_A, BIKE_SPR_A, (c) => paintBikeBody(c, e));
}

function drawBike(e) {
  const lean = Math.sin(e.y * 0.02) * 0.12; // matches the weave
  blitSprite(ctx, bikeSprite(e), e.x, e.y, lean, 1);

  if (e.hp < e.maxhp) {
    const f = clamp(e.hp / e.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - 10, e.y - 17, 20, 3);
    ctx.fillStyle = '#c0562e';
    ctx.fillRect(e.x - 10, e.y - 17, 20 * f, 3);
  }
}

// draws the bike rig in local space (origin at the vehicle centre)
function paintBikeBody(c, e) {
  const body = e.t.color;
  const dark = '#3d4249';
  const helmet = '#565c66';
  c.save();

  // ground shadow under the whole rig
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.beginPath(); c.ellipse(1.5, 3, 12, 8, 0, 0, 7); c.fill();

  // --- sidecar (right side): mounting struts, torpedo tub, passenger, MG34 ---
  c.strokeStyle = dark;
  c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(-2, -4); c.lineTo(3, -3); c.stroke();
  c.beginPath(); c.moveTo(-2, 6); c.lineTo(3, 6); c.stroke();
  drawBikeWheel(c, 8.5, 3.5, body);
  // pointed boat-hull tub
  c.fillStyle = body;
  c.strokeStyle = '#2b2e33';
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(4, -6);
  c.lineTo(9.5, -5.5);
  c.quadraticCurveTo(11, -1, 10, 4);
  c.quadraticCurveTo(9, 9, 6.5, 11);           // pointed nose
  c.quadraticCurveTo(4.5, 9, 4, 4);
  c.closePath(); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.12)';
  c.beginPath();
  c.moveTo(4.4, -5); c.lineTo(9, -4.6);
  c.quadraticCurveTo(10, -1, 9.4, 2);
  c.lineTo(5, 1); c.closePath(); c.fill();
  // passenger: shoulders + helmet, hunched forward
  c.fillStyle = dark;
  c.beginPath(); c.ellipse(7, -1, 3, 3.4, 0, 0, 7); c.fill();
  c.fillStyle = helmet;
  c.beginPath(); c.arc(7, 0.5, 2.6, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.14)';
  c.beginPath(); c.arc(7, -0.3, 1.2, 0, 7); c.fill();
  // MG34 clamped to the tub, barrel forward
  c.strokeStyle = '#23231d';
  c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(9, 6); c.lineTo(9.5, 16); c.stroke();
  c.strokeStyle = '#45443a';
  c.lineWidth = 0.7;
  for (let t = 8; t <= 14; t += 2) { c.beginPath(); c.moveTo(8.4, t); c.lineTo(9.8, t); c.stroke(); }
  c.fillStyle = '#2c2c24';
  c.fillRect(8, 4.5, 3, 3);

  // --- motorcycle (left side) ---
  drawBikeWheel(c, -5, -9, body);              // rear wheel
  drawBikeWheel(c, -5, 10, body);              // front wheel
  // boxer engine cylinders poking out each side
  c.fillStyle = dark;
  c.strokeStyle = '#2b2e33';
  c.lineWidth = 0.8;
  c.beginPath(); c.ellipse(-8.4, 0, 2, 2.6, 0, 0, 7); c.fill(); c.stroke();
  c.beginPath(); c.ellipse(-1.6, 0, 2, 2.6, 0, 0, 7); c.fill(); c.stroke();
  // frame: fuel tank + seat spine
  c.fillStyle = body;
  c.strokeStyle = '#2b2e33';
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(-7, -6); c.lineTo(-3, -6);
  c.quadraticCurveTo(-2.3, 0, -3, 6);
  c.lineTo(-7, 6);
  c.quadraticCurveTo(-7.7, 0, -7, -6);
  c.closePath(); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.14)';   // fuel-tank sheen
  c.beginPath(); c.ellipse(-5, 1.5, 1.6, 3, 0, 0, 7); c.fill();
  // handlebars near the front
  c.strokeStyle = '#23231d';
  c.lineWidth = 1.3;
  c.beginPath(); c.moveTo(-9, 6.5); c.lineTo(-1, 6.5); c.stroke();
  // headlight nacelle at the nose
  c.fillStyle = '#c9c3a8';
  c.beginPath(); c.arc(-5, 8.5, 1.5, 0, 7); c.fill();
  c.strokeStyle = '#2b2e33'; c.lineWidth = 0.7; c.stroke();
  // rider: torso hunched over the tank + helmet + arms to the bars
  c.strokeStyle = dark;
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(-5, 3); c.lineTo(-8.5, 6); c.stroke();
  c.beginPath(); c.moveTo(-5, 3); c.lineTo(-1.5, 6); c.stroke();
  c.fillStyle = dark;
  c.beginPath(); c.ellipse(-5, -1, 3.2, 4, 0, 0, 7); c.fill();
  c.fillStyle = helmet;
  c.beginPath(); c.arc(-5, 1.5, 2.8, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.16)';
  c.beginPath(); c.arc(-5, 0.7, 1.3, 0, 7); c.fill();
  c.restore();
}

