/* Trenchworks: WW2 — the Treno Armato, the Regio Esercito's armored war train.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// The train is drawn the way the Yamato is: its own pass, before the enemy loop,
// and every piece is drawn at the PART's own (p.x, p.y) — the same coordinates
// the sim hit-tests against — never at a second set of offsets computed here.
// Unlike her there is no sprite baking: the consist is axis-aligned rectangles
// rolling straight down, and only the two turrets ever rotate.
//
// paintTrainEngine must stay free of G reads: the codex builds a bare makeEnemy()
// with a stubbed-out G to shoot its portrait (the paintYamatoHull rule).

// Italian olive-khaki, keyed beside the roster's armor (im13 #847f5c, isemo
// #787454) so the train reads as the same army's kit scaled up, not a stray
// grey ironclad. The rails and running gear go near-black so the wagons pop.
const TRN_STEEL = '#7b7657';
const TRN_STEEL_DK = '#5b573d';
const TRN_PANEL = '#6b6749';
const TRN_EDGE = '#28261a';
const TRN_RAIL = '#33322a';
const TRN_SLEEPER = '#3e372a';
const TRN_GEAR = '#26261e';
const TRN_HALF_W = 14;              // wagon half-width; the rails run at ±9

// the rail line, laid the whole way down the lane: it is the boss's telegraph —
// the player can read exactly where the train will roll and where it will stop
function drawTrainRails(laneX) {
  const c = ctx;
  const y0 = -10, y1 = TRAIN_STOP_Y + 30;
  c.fillStyle = TRN_SLEEPER;
  for (let y = y0; y < y1; y += 13) c.fillRect(laneX - 12, y, 24, 3);
  c.strokeStyle = TRN_RAIL;
  c.lineWidth = 2.2;
  for (const s of [-9, 9]) {
    c.beginPath(); c.moveTo(laneX + s, y0); c.lineTo(laneX + s, y1); c.stroke();
  }
}

// running gear shared by every wagon: two bogies of flanged wheels riding the rails
function paintTrainBogies(c, halfLen) {
  c.fillStyle = TRN_GEAR;
  for (const end of [-1, 1]) {
    const by = end * (halfLen - 7);
    for (const s of [-1, 1]) {
      c.fillRect(s * 9 - 2.6, by - 6, 5.2, 12);
    }
    // axle bar tying the pair together
    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.fillRect(-11, by - 1.2, 22, 2.4);
    c.fillStyle = TRN_GEAR;
  }
}

// an armored wagon body: plated slab with a lighter roof line and rivet seams
function paintTrainBody(c, halfLen, roof) {
  c.fillStyle = TRN_STEEL;
  c.fillRect(-TRN_HALF_W, -halfLen, TRN_HALF_W * 2, halfLen * 2);
  c.strokeStyle = TRN_EDGE;
  c.lineWidth = 1.2;
  c.strokeRect(-TRN_HALF_W, -halfLen, TRN_HALF_W * 2, halfLen * 2);
  if (roof) {
    c.fillStyle = TRN_PANEL;
    c.fillRect(-TRN_HALF_W + 3.5, -halfLen + 4, TRN_HALF_W * 2 - 7, halfLen * 2 - 8);
  }
  // panel seams
  c.strokeStyle = 'rgba(0,0,0,0.3)';
  c.lineWidth = 0.8;
  for (const fy of [-0.33, 0.33]) {
    c.beginPath();
    c.moveTo(-TRN_HALF_W + 1.5, halfLen * 2 * fy);
    c.lineTo(TRN_HALF_W - 1.5, halfLen * 2 * fy);
    c.stroke();
  }
}

// a knocked-out wagon: a charred hulk that stays coupled and rides on
function paintWreckedWagon(c, halfLen) {
  c.fillStyle = '#33312a';
  c.fillRect(-TRN_HALF_W, -halfLen, TRN_HALF_W * 2, halfLen * 2);
  c.strokeStyle = '#1c1b14';
  c.lineWidth = 1.2;
  c.strokeRect(-TRN_HALF_W, -halfLen, TRN_HALF_W * 2, halfLen * 2);
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.beginPath(); c.ellipse(0, 0, TRN_HALF_W - 4, halfLen * 0.5, 0, 0, 7); c.fill();
  // torn plating
  c.strokeStyle = 'rgba(150,140,110,0.25)';
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(-8, -halfLen * 0.5); c.lineTo(6, halfLen * 0.3); c.stroke();
  c.beginPath(); c.moveTo(7, -halfLen * 0.4); c.lineTo(-4, halfLen * 0.55); c.stroke();
}

// ---- the engine -------------------------------------------------------------
// PURE (codex rule). Facing down: the cowcatcher at +y leads toward the player.
function paintTrainEngine(c, a) {
  const HL = 24;                     // half-length
  paintTrainBogies(c, HL);
  // cowcatcher wedge out front
  c.fillStyle = TRN_STEEL_DK;
  c.beginPath();
  c.moveTo(-TRN_HALF_W + 2, HL - 2);
  c.lineTo(0, HL + 8);
  c.lineTo(TRN_HALF_W - 2, HL - 2);
  c.closePath();
  c.fill();
  c.strokeStyle = TRN_EDGE; c.lineWidth = 1; c.stroke();
  paintTrainBody(c, HL, false);
  // the boiler: a long rounded barrel down the middle, cab at the rear
  c.fillStyle = TRN_PANEL;
  c.beginPath();
  c.moveTo(-8, HL - 6);
  c.lineTo(-8, -HL + 16);
  c.arc(0, -HL + 16, 8, Math.PI, 0);
  c.lineTo(8, HL - 6);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.9; c.stroke();
  // boiler bands
  for (const fy of [HL - 14, 2, -HL + 22]) {
    c.strokeStyle = 'rgba(0,0,0,0.3)';
    c.beginPath(); c.moveTo(-8, fy); c.lineTo(8, fy); c.stroke();
  }
  // smokestack near the front of the boiler
  c.fillStyle = TRN_GEAR;
  c.beginPath(); c.arc(0, HL - 13, 4.6, 0, 7); c.fill();
  c.fillStyle = '#111109';
  c.beginPath(); c.arc(0, HL - 13, 2.6, 0, 7); c.fill();
  // armored cab at the rear, vision slit forward
  c.fillStyle = TRN_STEEL_DK;
  c.fillRect(-TRN_HALF_W + 2, -HL + 2, TRN_HALF_W * 2 - 4, 12);
  c.strokeStyle = TRN_EDGE; c.lineWidth = 1;
  c.strokeRect(-TRN_HALF_W + 2, -HL + 2, TRN_HALF_W * 2 - 4, 12);
  c.fillStyle = '#15140d';
  c.fillRect(-6, -HL + 11, 12, 1.8);
}

// ---- the turret wagon ---------------------------------------------------------
// The turret in its own frame, gun out along +x of the laid bearing — a rigid
// rotation, so a sprite pack replaces it with one image. The muzzle flash is
// live (it reads p.fireT every frame) and stays outside.
function paintTrainTurret(c, p) {
  c.fillStyle = TRN_STEEL_DK;
  c.beginPath(); c.arc(0, 0, 9.5, 0, 7); c.fill();
  c.strokeStyle = TRN_EDGE; c.lineWidth = 1.1; c.stroke();
  c.fillStyle = TRN_GEAR;
  c.fillRect(6, -2, 20, 4);          // the gun, out along +x of the laid bearing
  c.fillRect(24, -2.8, 3.5, 5.6);    // muzzle brake
  c.fillStyle = TRN_PANEL;
  c.beginPath(); c.arc(-2, 0, 4, 0, 7); c.fill();   // cupola
}

function drawTrainTurretWagon(p) {
  const c = ctx;
  const HL = 20;
  if (p.dead) {
    const extW = SPRITES.get('train_wagon_wrecked');
    if (extW) { blitSprite(c, extW, p.x, p.y, 0, 1); return; }
    c.save();
    c.translate(p.x, p.y);
    paintWreckedWagon(c, HL);
    c.restore();
    return;
  }
  const ext = SPRITES.get('train_wagon_turret');
  if (ext) {
    blitSprite(c, ext, p.x, p.y, 0, 1);
  } else {
    c.save();
    c.translate(p.x, p.y);
    paintTrainBogies(c, HL);
    paintTrainBody(c, HL, true);
    c.restore();
  }
  // the turret, at its own laid bearing
  const bearing = p.tur || Math.PI / 2;
  const extT = SPRITES.get('train_turret');
  if (extT) {
    blitSprite(c, extT, p.x, p.y, bearing, 1);
  } else {
    c.save();
    c.translate(p.x, p.y);
    c.rotate(bearing);
    paintTrainTurret(c, p);
    c.restore();
  }
  if (p.fireT > 0) {
    c.save();
    c.translate(p.x, p.y);
    c.rotate(bearing);
    c.fillStyle = `rgba(255,214,120,${clamp(p.fireT / 0.22, 0, 1)})`;
    c.beginPath(); c.arc(29, 0, 6, 0, 7); c.fill();
    c.restore();
  }
}

// ---- the infantry wagon --------------------------------------------------------
// Doors open while a squad disembarks, so the wagon ships as two states — the
// same split the halftrack makes between loaded and unloaded.
function paintTrainInfantryWagon(c, open) {
  const HL = 20;
  paintTrainBogies(c, HL);
  paintTrainBody(c, HL, true);
  // roof ridge planks
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(0, -HL + 4); c.lineTo(0, HL - 4); c.stroke();
  // side doors — swung open and spilling shadow while a squad disembarks
  for (const s of [-1, 1]) {
    if (open) {
      c.fillStyle = '#15140d';
      c.fillRect(s * TRN_HALF_W - (s > 0 ? 2.5 : 0), -7, 2.5, 14);
      c.fillStyle = TRN_STEEL_DK;
      c.fillRect(s * (TRN_HALF_W + 2) - (s > 0 ? 1.5 : 0), -9, 1.5, 8);
    } else {
      c.fillStyle = TRN_STEEL_DK;
      c.fillRect(s * TRN_HALF_W - (s > 0 ? 3 : 0), -7, 3, 14);
    }
  }
}

function drawTrainInfantryWagon(p) {
  const c = ctx;
  const HL = 20;
  if (p.dead) {
    const extW = SPRITES.get('train_wagon_wrecked');
    if (extW) { blitSprite(c, extW, p.x, p.y, 0, 1); return; }
    c.save();
    c.translate(p.x, p.y);
    paintWreckedWagon(c, HL);
    c.restore();
    return;
  }
  const open = p.dropT > 0;
  const ext = SPRITES.get('train_wagon_infantry' + (open ? '_open' : ''));
  if (ext) { blitSprite(c, ext, p.x, p.y, 0, 1); return; }
  c.save();
  c.translate(p.x, p.y);
  paintTrainInfantryWagon(c, open);
  c.restore();
}

// ---- the gun wagon --------------------------------------------------------------
// The flatcar itself is scenery: the four gun POSTS are the actors, and each crew
// is drawn at its own p.x/p.y facing whatever it last fired at.
function paintTrainGunWagon(c) {
  const HL = 20;
  paintTrainBogies(c, HL);
  // low flatcar deck with a sandbag parapet all round
  c.fillStyle = TRN_PANEL;
  c.fillRect(-TRN_HALF_W, -HL, TRN_HALF_W * 2, HL * 2);
  c.strokeStyle = TRN_EDGE; c.lineWidth = 1.2;
  c.strokeRect(-TRN_HALF_W, -HL, TRN_HALF_W * 2, HL * 2);
  c.fillStyle = '#8a7a52';
  for (let y = -HL + 3; y < HL - 2; y += 6) {
    for (const s of [-1, 1]) {
      c.beginPath(); c.ellipse(s * (TRN_HALF_W - 2.5), y, 3.4, 2.4, 0, 0, 7); c.fill();
    }
  }
}

function drawTrainGunWagon(e) {
  const c = ctx;
  const wx = e.laneX, wy = e.y + TRAIN_GUNWAGON_S;
  const ext = SPRITES.get('train_wagon_gun');
  if (ext) {
    blitSprite(c, ext, wx, wy, 0, 1);
  } else {
    c.save();
    c.translate(wx, wy);
    paintTrainGunWagon(c);
    c.restore();
  }

  for (const p of e.mounts) {
    if (p.dead) continue;
    const f = p.face == null ? (p.bOff > 0 ? 0 : Math.PI) : p.face;
    c.save();
    c.translate(p.x, p.y);
    // pintle MG first, so the gunner reads as crouched behind it
    c.save();
    c.rotate(f);
    c.fillStyle = TRN_GEAR;
    c.fillRect(2, -1.1, 10, 2.2);
    c.restore();
    // the gunner: Italian olive with the roster's khaki helmet
    c.fillStyle = '#6b6f52';
    c.beginPath(); c.ellipse(0, 0, 4, 3.2, f, 0, 7); c.fill();
    c.fillStyle = '#7d8060';
    c.beginPath(); c.arc(0, 0, 2.4, 0, 7); c.fill();
    c.restore();
  }
}

// ---- the artillery wagon --------------------------------------------------------
// The tail car. It has to read as the LONG gun at a glance — the player's answer
// to it is different from the turrets' — so the tell is length, never bulk: a
// barrel half again as long as a turret's over a car body that is otherwise the
// same slab. The wagon gets a turntable ring and recoil spades at both ends so
// it doesn't just look like a boxcar with a stick on it.
function paintTrainArtyWagon(c) {
  const HL = 20;
  paintTrainBogies(c, HL);
  paintTrainBody(c, HL, false);
  // recoil spades braced against the deck at each end, taking the shock
  c.fillStyle = TRN_STEEL_DK;
  for (const end of [-1, 1]) {
    c.fillRect(-TRN_HALF_W + 2, end * (HL - 6) - 2.5, TRN_HALF_W * 2 - 4, 5);
  }
  c.strokeStyle = TRN_EDGE;
  c.lineWidth = 0.9;
  for (const end of [-1, 1]) {
    c.strokeRect(-TRN_HALF_W + 2, end * (HL - 6) - 2.5, TRN_HALF_W * 2 - 4, 5);
  }
  // the turntable the piece traverses on
  c.fillStyle = TRN_PANEL;
  c.beginPath(); c.arc(0, 0, 11.5, 0, 7); c.fill();
  c.strokeStyle = TRN_EDGE; c.lineWidth = 1.1; c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.28)';
  c.lineWidth = 0.8;
  c.beginPath(); c.arc(0, 0, 8, 0, 7); c.stroke();
}

// The piece in its own frame, gun out along +x of the laid bearing — the same
// rigid rotation the turret uses, so a sprite pack replaces it with one image.
// `recoil` (0..1) slides the whole barrel back along -x; it is passed rather than
// read off the actor so this stays PURE for the codex and the exporter.
function paintTrainArtyGun(c, recoil) {
  const back = (recoil || 0) * 5;
  // counterweighted breech behind the trunnion
  c.fillStyle = TRN_STEEL_DK;
  c.beginPath(); c.ellipse(-5 - back * 0.4, 0, 7.5, 6, 0, 0, 7); c.fill();
  c.strokeStyle = TRN_EDGE; c.lineWidth = 1.1; c.stroke();
  // the barrel: out to 39, against the turret's 27. LENGTH is the tell that this
  // is the long gun — keep the flash small enough that the silhouette says it.
  c.fillStyle = TRN_GEAR;
  c.fillRect(4 - back, -2.4, 32, 4.8);
  c.fillRect(35 - back, -3.4, 4, 6.8);     // muzzle brake
  // recuperator sleeve over the chase
  c.fillStyle = TRN_STEEL_DK;
  c.fillRect(5 - back, -3.6, 11, 7.2);
  c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 0.8;
  c.strokeRect(5 - back, -3.6, 11, 7.2);
  // the shield, bolted to the cradle and NOT sliding with the barrel
  c.fillStyle = TRN_PANEL;
  c.beginPath();
  c.moveTo(2, -8.5); c.lineTo(6, -7); c.lineTo(6, 7); c.lineTo(2, 8.5);
  c.closePath(); c.fill();
  c.strokeStyle = TRN_EDGE; c.lineWidth = 1; c.stroke();
}

function drawTrainArtyWagon(p) {
  const c = ctx;
  const HL = 20;
  if (p.dead) {
    const extW = SPRITES.get('train_wagon_wrecked');
    if (extW) { blitSprite(c, extW, p.x, p.y, 0, 1); return; }
    c.save();
    c.translate(p.x, p.y);
    paintWreckedWagon(c, HL);
    c.restore();
    return;
  }
  const ext = SPRITES.get('train_wagon_arty');
  if (ext) {
    blitSprite(c, ext, p.x, p.y, 0, 1);
  } else {
    c.save();
    c.translate(p.x, p.y);
    paintTrainArtyWagon(c);
    c.restore();
  }
  const bearing = p.tur || Math.PI / 2;
  const recoil = clamp((p.fireT || 0) / TRAIN_ARTY_FIRE_T, 0, 1);
  const extG = SPRITES.get('train_arty_gun');
  if (extG) {
    // a pack ships one image, so the recoil slide goes with the procedural art —
    // the same trade every other sprite makes (animation for authored pixels)
    blitSprite(c, extG, p.x, p.y, bearing, 1);
  } else {
    c.save();
    c.translate(p.x, p.y);
    c.rotate(bearing);
    paintTrainArtyGun(c, recoil);
    c.restore();
  }
  if (p.fireT > 0) {
    c.save();
    c.translate(p.x, p.y);
    c.rotate(bearing);
    c.fillStyle = `rgba(255,224,150,${recoil})`;
    c.beginPath(); c.arc(43, 0, 6.5, 0, 7); c.fill();
    c.restore();
  }
}

// ---- overlays ---------------------------------------------------------------
// ONE HP pool, the Progenitor's overlay verbatim — which is to say the Yamato's
// drawBossHpBar with its ticks moved onto the TRAIN_SEGMENTS phase boundaries,
// since each one the fill retreats past sounds an AVANTI and the player needs to
// see the next one coming. The bar sits SOUTH of the engine — the train comes at
// the player nose-first, so that's the face of it they're always looking at —
// far enough out that the caption above it clears the cowcatcher.
function drawWarTrainOverlays(a) {
  const c = ctx;
  const ticks = [];
  for (let i = 1; i < TRAIN_SEGMENTS; i++) ticks.push(i / TRAIN_SEGMENTS);
  drawBossHpBar(a, a.y + 46, 110, 'TRENO ARMATO', ticks);

  // per-wagon condition, so the player can read which guns are still in the fight
  for (const p of (a.parts || [])) drawBossPartBar(p, 16, p.t.trainMg ? 10 : 22);

  if (G.selected.includes(a)) {
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.lineWidth = 1;
    c.setLineDash([5, 4]);
    c.strokeRect(a.laneX - TRN_HALF_W - 8, a.y + TRAIN_TAIL_S - 28,
      (TRN_HALF_W + 8) * 2, -TRAIN_TAIL_S + 62);
    c.setLineDash([]);
  }
}

function drawWarTrain(e) {
  const c = ctx;
  drawTrainRails(e.laneX);
  // one long ground shadow under the whole consist, measured off the tail so a
  // longer train can't outrun its own shadow
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.fillRect(e.laneX - TRN_HALF_W - 2, e.y + TRAIN_TAIL_S - 22, (TRN_HALF_W + 2) * 2, -TRAIN_TAIL_S + 52);
  // couplings between wagons, drawn under the bodies: one per gap, so the count
  // is however many cars trail the engine
  c.fillStyle = TRN_GEAR;
  const cars = Math.round(-TRAIN_TAIL_S / TRAIN_SPACING);
  for (let i = 0; i < cars; i++) {
    c.fillRect(e.laneX - 2.2, e.y - TRAIN_SPACING * (i + 1) + 18, 4.4, 12);
  }
  // rear to front, so each wagon's cowl paints over the coupling behind it
  if (e.arty) drawTrainArtyWagon(e.arty);
  drawTrainTurretWagon(e.turrets[1]);
  drawTrainGunWagon(e);
  drawTrainInfantryWagon(e.wagon);
  drawTrainTurretWagon(e.turrets[0]);
  const extE = SPRITES.get('train_engine');
  if (extE) {
    blitSprite(c, extE, e.x, e.y, 0, 1);
  } else {
    c.save();
    c.translate(e.x, e.y);
    paintTrainEngine(c, e);
    c.restore();
  }
  drawWarTrainOverlays(e);
}

// Its own pass, BEFORE the general enemy loop, so the fanteria it unloads paint
// over the wagons instead of vanishing beneath them. The cull margin covers the
// whole consist — the loop's own 64 would pop the rear turret at the edge.
function drawWarTrainPass() {
  for (const e of G.enemies) {
    if (!e.t.itaBoss || e.dead || !e.trainInit) continue;
    if (!inView(e.laneX, e.y + TRAIN_TAIL_S / 2, -TRAIN_TAIL_S / 2 + 90)) continue;
    drawWarTrain(e);
  }
}
