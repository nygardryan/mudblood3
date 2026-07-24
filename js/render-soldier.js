/* Trenchworks: WW2 — main standing-soldier renderer & overlays.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// World footprint of a cached soldier frame; the box comfortably holds the
// longest weapon (bazooka / Panzerfaust reach ~20 world units) swung to any
// facing, plus screen-fixed belt kit and shadow.
const SOLDIER_SPR = 48, SOLDIER_SPR_A = 24;
// Facing is snapped to this many directions for the sprite cache. A soldier's
// look is a pure function of type + facing (no walk cycle), and much of the kit
// is screen-fixed rather than face-relative, so a directional frame per bucket
// reproduces the live draw exactly; 48 keeps the gun's angular snap sub-pixel.
const SOLDIER_FACINGS = 48;

// Transient action poses read live timers that change every frame — draw those
// straight (uncached) so the animation still plays. Everything else is a steady
// pose that hits the cache.
function soldierCacheable(a) {
  return !(a.grenThrowT > 0 || a.mortarFireT > 0 || a.shotgunBlastT > 0 || a.flameT > 0 || a.slashT > 0);
}

// The cached directional frame for this soldier's type/nation/facing. Baked from
// whichever unit first needs it — all instances of a (type, facing) look
// identical — so the record is shared across the whole roster.
function soldierSprite(a) {
  const us = (a.nation || a.side) === 'us';
  const fb = ((Math.round(a.face / (Math.PI * 2) * SOLDIER_FACINGS) % SOLDIER_FACINGS)
    + SOLDIER_FACINGS) % SOLDIER_FACINGS;
  // only a medic's weapon presence depends on `armed`; nothing else does
  const armK = (a.type === 'medic' && !a.armed) ? 'n' : 'a';
  const key = a.type + (us ? 'u' : 'e') + fb + armK;
  return sprite(key, SOLDIER_SPR, SOLDIER_SPR, SOLDIER_SPR_A, SOLDIER_SPR_A, (c) => {
    const saved = a.face;
    a.face = fb / SOLDIER_FACINGS * (Math.PI * 2);   // bake at the bucket's exact angle
    paintSoldierBody(c, a);
    a.face = saved;
  });
}

function drawSoldier(a) {
  if (a.prone > 0) {
    drawProneSoldier(a);
    drawSoldierOverlays(a);
    return;
  }
  if (soldierCacheable(a)) {
    blitSprite(ctx, soldierSprite(a), a.x, a.y, 0, 1);
  } else {
    ctx.save();
    ctx.translate(a.x, a.y);
    paintSoldierBody(ctx, a);
    ctx.restore();
  }
  drawSoldierOverlays(a);
}

// Draws the body in local space (origin at the unit). Positioning is the caller's
// job: the live path translates, the sprite bake pre-translates the offscreen ctx.
function paintSoldierBody(c, a) {
  // the Imperial Japanese roster is drawn by its own self-contained painter —
  // distinct helmets, Arisakas, katanas, knee mortars and lunge charges
  if (a.nation === 'jp') { paintJapaneseSoldier(c, a); return; }
  // the Regio Esercito roster has its own painter — M33 helmets, Carcanos,
  // plumed Bersaglieri, bustina officers, Breda/Fiat guns and the Lanciafiamme
  if (a.nation === 'it') { paintItalianSoldier(c, a); return; }
  const type = a.type;
  const us = (a.nation || a.side) === 'us';
  const isSniper = type === 'sniper' || type === 'esniper';
  const isBar = type === 'gunner';
  const isEmg = type === 'emg';
  const isMG = isBar || isEmg;
  const isSMG = type === 'engineer' || type === 'esmg';
  const isShotgun = type === 'shotgunner';
  const isOfficer = type === 'officer' || type === 'eoff';
  const isGrenadier = type === 'grenadier' || type === 'egren';
  const isMortar = !!a.t.mortar;
  const isRifle = type === 'rifleman' || type === 'erifle';
  const fx = Math.cos(a.face), fy = Math.sin(a.face);
  c.save();

  // shadow
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath(); c.ellipse(0, 3, 8, 4, 0, 0, 7); c.fill();

  // ---- weapon: silhouette varies by class
  const gunLen = a.t.gun;
  if (type === 'eflame') {
    drawFlammenwerfer(c, fx, fy, gunLen, a.face, a.flameT > 0);
  } else if (type === 'flamer') {
    // M2 flamethrower wand — heat shield, grip, bell nozzle, fuel hose
    const tipX = fx * gunLen, tipY = fy * gunLen;
    c.strokeStyle = '#3a3830';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(fx * 2, fy * 2);
    c.lineTo(tipX, tipY);
    c.stroke();
    c.strokeStyle = '#26261e';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(fx * 2.4, fy * 2.4);
    c.lineTo(fx * (gunLen - 0.6), fy * (gunLen - 0.6));
    c.stroke();
    // vent slots on the heat shield
    c.strokeStyle = '#2e2c24';
    c.lineWidth = 0.8;
    for (let t = 0.32; t <= 0.78; t += 0.12) {
      const sx = fx * (gunLen * t), sy = fy * (gunLen * t);
      c.beginPath();
      c.moveTo(sx - fy * 1.8, sy + fx * 1.8);
      c.lineTo(sx + fy * 1.8, sy - fx * 1.8);
      c.stroke();
    }
    // pistol grip
    c.strokeStyle = '#4a3f32';
    c.lineWidth = 2.3;
    c.beginPath();
    c.moveTo(fx * 3.8 + fy * 1.4, fy * 3.8 - fx * 1.4);
    c.lineTo(fx * 3.8 + fy * 4.8, fy * 3.8 - fx * 4.8);
    c.stroke();
    // nozzle bell
    c.strokeStyle = '#5a4a38';
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(tipX - fy * 2.4, tipY + fx * 2.4);
    c.lineTo(tipX + fx * 2, tipY + fy * 2);
    c.lineTo(tipX + fy * 2.4, tipY - fx * 2.4);
    c.stroke();
    // hose from backpack tanks to the wand
    c.strokeStyle = '#2a2820';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-6, 0);
    c.quadraticCurveTo(-fy * 4 + fx * 1, fx * 4 + fy * 1, fx * 3.2, fy * 3.2);
    c.stroke();
    c.strokeStyle = '#1e1c18';
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(-6, 0);
    c.quadraticCurveTo(-fy * 4 + fx * 1, fx * 4 + fy * 1, fx * 3.2, fy * 3.2);
    c.stroke();
    // pilot flame at the nozzle
    const lit = a.flameT > 0;
    const nozX = tipX + fx * 1.4, nozY = tipY + fy * 1.4;
    if (lit) {
      c.shadowColor = '#ff6820';
      c.shadowBlur = 10;
      c.fillStyle = '#fff4b0';
      c.beginPath(); c.arc(nozX, nozY, 3, 0, 7); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = '#ff9a28';
      c.beginPath(); c.arc(nozX, nozY, 1.8, 0, 7); c.fill();
    } else {
      c.fillStyle = '#8a4020';
      c.beginPath(); c.arc(nozX, nozY, 1.5, 0, 7); c.fill();
      c.fillStyle = '#ff7020';
      c.beginPath(); c.arc(nozX, nozY, 0.75, 0, 7); c.fill();
    }
  } else if (isBar) {
    // M1918 BAR — long barrel, wooden stock, box mag, bipod, carry handle
    const tipX = fx * gunLen, tipY = fy * gunLen;
    c.strokeStyle = '#26261e';
    c.lineWidth = 2.8;
    c.beginPath();
    c.moveTo(fx * 2, fy * 2);
    c.lineTo(tipX, tipY);
    c.stroke();
    // wooden stock and pistol grip
    c.strokeStyle = '#4a3f2e';
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(fx * 1.1 - fy * 2.6, fy * 1.1 + fx * 2.6);
    c.lineTo(fx * 1.1 + fy * 2.4, fy * 1.1 - fx * 2.4);
    c.stroke();
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(fx * 3.2 + fy * 1.5, fy * 3.2 - fx * 1.5);
    c.lineTo(fx * 3.2 + fy * 4.2, fy * 3.2 - fx * 4.2);
    c.stroke();
    // gas tube along the top
    c.strokeStyle = '#3a3830';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(fx * 2.5 - fy * 0.9, fy * 2.5 + fx * 0.9);
    c.lineTo(fx * (gunLen - 1) - fy * 0.9, fy * (gunLen - 1) + fx * 0.9);
    c.stroke();
    // box magazine
    const magX = fx * (gunLen * 0.42), magY = fy * (gunLen * 0.42);
    c.fillStyle = '#2a2a1e';
    c.fillRect(magX - fy * 2.2 - 1.2, magY + fx * 2.2 - 1.5, fy * 4.4 + 2.4, -fx * 4.4 + 3);
    c.strokeStyle = '#1a1a14';
    c.lineWidth = 0.7;
    c.strokeRect(magX - fy * 2.2 - 1.2, magY + fx * 2.2 - 1.5, fy * 4.4 + 2.4, -fx * 4.4 + 3);
    c.fillStyle = '#c8a858';
    c.fillRect(magX - fy * 1.2 - 0.6, magY + fx * 1.2 - 2, fy * 2.4 + 1.2, -fx * 2.4 + 1.2);
    // carry handle
    c.strokeStyle = '#3a3a30';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(fx * (gunLen * 0.34) + fy * 1.3, fy * (gunLen * 0.34) - fx * 1.3, 1.6, 0, 7);
    c.stroke();
    // bipod legs
    c.strokeStyle = '#26261e';
    c.lineWidth = 1.4;
    for (const s of [-0.72, 0.72]) {
      c.beginPath();
      c.moveTo(fx * (gunLen - 0.5), fy * (gunLen - 0.5));
      c.lineTo(
        fx * (gunLen + 1.5) + Math.cos(a.face + s + 0.45) * 4,
        fy * (gunLen + 1.5) + Math.sin(a.face + s + 0.45) * 4,
      );
      c.stroke();
    }
    // flash hider
    c.strokeStyle = '#4a4038';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(tipX - fy * 1.6, tipY + fx * 1.6);
    c.lineTo(tipX + fy * 1.6, tipY - fx * 1.6);
    c.stroke();
    c.fillStyle = '#1c1c16';
    c.beginPath(); c.arc(tipX, tipY, 1.1, 0, 7); c.fill();
    // sling loop on the stock
    c.strokeStyle = '#6a5a40';
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(fx * 1.5 - fy * 3, fy * 1.5 + fx * 3);
    c.quadraticCurveTo(-fy * 2, fx * 2, fx * 2.5 + fy * 2, fy * 2.5 - fx * 2);
    c.stroke();
  } else if (isShotgun) {
    // M97 trench gun — long barrel, pump forend, wide choke, wooden stock
    const tipX = fx * gunLen, tipY = fy * gunLen;
    const pumpT = a.shotgunBlastT > 0 ? clamp(a.shotgunBlastT / 0.12, 0, 1) : 0;
    const pumpOff = pumpT * 1.4;
    c.strokeStyle = '#26261e';
    c.lineWidth = 3.4;
    c.beginPath();
    c.moveTo(fx * 2, fy * 2);
    c.lineTo(tipX, tipY);
    c.stroke();
    c.strokeStyle = '#4a3f2e';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(fx * 1.5 - fy * 2.6, fy * 1.5 + fx * 2.6);
    c.lineTo(fx * 1.5 + fy * 2.2, fy * 1.5 - fx * 2.2);
    c.stroke();
    // magazine tube under the barrel
    c.strokeStyle = '#3a3830';
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(fx * 2.5 + fy * 1.5, fy * 2.5 - fx * 1.5);
    c.lineTo(fx * (gunLen - 1.2) + fy * 1.5, fy * (gunLen - 1.2) - fx * 1.5);
    c.stroke();
    // pump forend — slides back on recoil
    const px = fx * (gunLen * 0.38 - pumpOff), py = fy * (gunLen * 0.38 - pumpOff);
    c.fillStyle = '#5a4a38';
    c.beginPath();
    c.moveTo(px - fy * 2.2, py + fx * 2.2);
    c.lineTo(px + fx * 3.8, py + fy * 3.8);
    c.lineTo(px + fy * 2.2, py - fx * 2.2);
    c.lineTo(px - fx * 3.8, py - fy * 3.8);
    c.closePath(); c.fill();
    c.strokeStyle = '#3a3028';
    c.lineWidth = 0.9;
    c.stroke();
    // vent rib along the barrel
    c.strokeStyle = '#3a3830';
    c.lineWidth = 0.7;
    for (let t = 0.55; t <= 0.92; t += 0.1) {
      const sx = fx * (gunLen * t), sy = fy * (gunLen * t);
      c.beginPath();
      c.moveTo(sx - fy * 1.4, sy + fx * 1.4);
      c.lineTo(sx + fy * 1.4, sy - fx * 1.4);
      c.stroke();
    }
    // wide muzzle choke
    c.strokeStyle = '#4a4038';
    c.lineWidth = 2.8;
    c.beginPath();
    c.moveTo(tipX - fy * 2.8, tipY + fx * 2.8);
    c.lineTo(tipX + fx * 1.5, tipY + fy * 1.5);
    c.lineTo(tipX + fy * 2.8, tipY - fx * 2.8);
    c.stroke();
    c.fillStyle = '#1c1c16';
    c.beginPath(); c.arc(tipX, tipY, 1.2, 0, 7); c.fill();
  } else if (isGrenadier && us) {
    // M1 carbine — short barrel, side mag, curved stock
    c.strokeStyle = '#26261e';
    c.lineWidth = 2.1;
    c.beginPath();
    c.moveTo(fx * 2, fy * 2);
    c.lineTo(fx * gunLen, fy * gunLen);
    c.stroke();
    c.strokeStyle = '#4a3f2e';
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(fx * 1.4 - fy * 2, fy * 1.4 + fx * 2);
    c.lineTo(fx * 1.4 + fy * 2, fy * 1.4 - fx * 2);
    c.stroke();
    c.fillStyle = '#2a2a1e';
    const magX = fx * (gunLen * 0.42), magY = fy * (gunLen * 0.42);
    c.fillRect(magX - fy * 1.6 - 0.9, magY + fx * 1.6 - 1.1, fy * 3.2 + 1.8, -fx * 3.2 + 2.2);
    c.strokeStyle = '#3a3a30';
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(fx * (gunLen * 0.55) + fy * 1.5, fy * (gunLen * 0.55) - fx * 1.5);
    c.lineTo(fx * (gunLen * 0.55) + fy * 3.2, fy * (gunLen * 0.55) - fx * 3.2);
    c.stroke();
    c.fillStyle = '#1c1c16';
    c.beginPath(); c.arc(fx * (gunLen - 0.5), fy * (gunLen - 0.5), 1, 0, 7); c.fill();
  } else if (type === 'egren') {
    drawKar98kGrenadier(c, fx, fy, gunLen, a.face);
  } else if (type === 'erifle') {
    drawKar98kRifleman(c, fx, fy, gunLen, a.face);
  } else if (isRifle) {
    drawM1Garand(c, fx, fy, gunLen, a.face);
  } else if (type === 'esniper') {
    drawKar98kSniper(c, fx, fy, gunLen, a.face);
  } else if (type === 'esmg') {
    drawMP40(c, fx, fy, gunLen, a.face);
  } else if (type === 'sniper') {
    drawScopedRifle(c, fx, fy, gunLen, a.face, true);
  } else if (type === 'emg') {
    drawMG42(c, fx, fy, gunLen, a.face);
  } else if (type === 'bazooka') {
    drawBazooka(c, fx, fy, a.face);
  } else if (type === 'ebazooka') {
    drawPanzerfaust(c, fx, fy, a.face);
  } else if (type === 'eoff') {
    drawSidearm(c, fx, fy, gunLen, a.face, false);
  } else if (type === 'officer' || isMortar) {
    drawSidearm(c, fx, fy, gunLen, a.face, us);
  } else if (type === 'medic' && !a.armed) {
    // an unarmed medic carries no weapon — draw nothing
  } else {
    c.strokeStyle = '#26261e';
    c.lineWidth = isSMG ? 2.6 : 2;
    c.beginPath();
    c.moveTo(fx * 2, fy * 2);
    c.lineTo(fx * gunLen, fy * gunLen);
    c.stroke();
  }
  if (type === 'engineer') {
    // M3 grease gun — box magazine hanging under the receiver
    c.strokeStyle = '#26261e';
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(fx * (a.t.gun * 0.55), fy * (a.t.gun * 0.55));
    c.lineTo(fx * (a.t.gun * 0.55) - fy * 3, fy * (a.t.gun * 0.55) + fx * 3);
    c.stroke();
  }

  // ---- body
  const isFlamer = !!a.t.flame;
  const bodyW = isShotgun ? 7.5 : isEmg ? 7.3 : isBar ? 7 : isFlamer ? 7.2 : isGrenadier ? 6.8 : isMortar ? 6.7 : isOfficer ? 6.6 : isRifle ? 6.4 : isSniper ? 6.2 : 6.5;
  const bodyH = isShotgun ? 5.8 : isEmg ? 4.7 : isBar ? 4.9 : isFlamer ? 5.4 : isGrenadier ? 5.2 : isMortar ? 5.1 : isOfficer ? 5.2 : isRifle ? 4.9 : isSniper ? 4.8 : 5;
  c.fillStyle = a.t.color;
  c.beginPath(); c.ellipse(0, 0, bodyW, bodyH, a.face, 0, 7); c.fill();
  c.strokeStyle = 'rgba(14,15,11,0.6)'; c.lineWidth = 1.1; c.stroke();
  if (isOfficer) {
    if (us) {
      c.fillStyle = '#5a6048';
      c.beginPath(); c.ellipse(fx * 0.8, fy * 0.8, bodyW - 0.8, bodyH - 0.4, a.face, 0, 7); c.fill();
      c.strokeStyle = '#7a8068';
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(-fy * 2.2, fx * 2.2);
      c.lineTo(fy * 2.2, -fx * 2.2);
      c.stroke();
    } else {
      c.fillStyle = '#4a4840';
      c.beginPath(); c.ellipse(fx * 0.8, fy * 0.8, bodyW - 0.8, bodyH - 0.4, a.face, 0, 7); c.fill();
      c.fillStyle = '#8a8880';
      c.beginPath(); c.ellipse(fx * 3.2, fy * 3.2, 2.2, 1.2, a.face, 0, 7); c.fill();
      c.beginPath(); c.ellipse(-fx * 3.2, fy * 3.2, 2.2, 1.2, a.face, 0, 7); c.fill();
      c.fillStyle = '#c8c8c0';
      c.fillRect(fx * 3.2 - 0.3, fy * 3.2 - 0.8, 0.6, 1.6);
      c.fillRect(-fx * 3.2 - 0.3, fy * 3.2 - 0.8, 0.6, 1.6);
      c.strokeStyle = '#6a6860';
      c.lineWidth = 0.65;
      c.beginPath();
      c.moveTo(-fy * 1.2, fx * 1.2 - 1);
      c.quadraticCurveTo(0, fx * 1.2 - 2, fy * 1.2, fx * 1.2 - 1);
      c.stroke();
      c.strokeStyle = '#5a5a52';
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(-fy * 2.2, fx * 2.2);
      c.lineTo(fy * 2.2, -fx * 2.2);
      c.stroke();
    }
  }
  if (isShotgun) {
    // steel chest plate, heavy pauldrons, riveted breastplate
    c.fillStyle = '#4a5245';
    c.beginPath(); c.ellipse(fx * 1.3, fy * 1.3, 6.2, 5.2, a.face, 0, 7); c.fill();
    c.strokeStyle = '#2e3328';
    c.lineWidth = 1.2;
    c.stroke();
    c.fillStyle = '#5a6450';
    c.beginPath(); c.ellipse(-fy * 5, fx * 5, 2.6, 3.2, a.face, 0, 7); c.fill();
    c.beginPath(); c.ellipse(fy * 5, -fx * 5, 2.6, 3.2, a.face, 0, 7); c.fill();
    c.fillStyle = '#3a4034';
    for (const [rx, ry] of [[fx * 0.5, fy * 0.5], [-fx * 1.2, -fy * 1.2], [fx * 2, fy * 2]]) {
      c.beginPath(); c.arc(rx, ry, 0.7, 0, 7); c.fill();
    }
    c.strokeStyle = '#6a6a58';
    c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(-fy * 2.5, fx * 2.5); c.lineTo(fy * 2.5, -fx * 2.5); c.stroke();
  }
  if (type === 'eflame') {
    // Flam Panzer — asbestos suit with segmented steel plates and scorch marks
    c.fillStyle = '#3a3834';
    c.beginPath(); c.ellipse(fx * 1.3, fy * 1.3, 6.4, 5.4, a.face, 0, 7); c.fill();
    c.strokeStyle = '#2a2824';
    c.lineWidth = 1;
    c.stroke();
    c.strokeStyle = '#5a5a50';
    c.lineWidth = 0.75;
    for (const off of [-1.6, 0, 1.6]) {
      c.beginPath();
      c.moveTo(-fy * 3.2 + off * fx * 0.25, fx * 3.2 + off * fy * 0.25);
      c.lineTo(fy * 2.4 + off * fx * 0.25, -fx * 2.4 + off * fy * 0.25);
      c.stroke();
    }
    c.fillStyle = '#4a4840';
    c.beginPath(); c.ellipse(fx * 0.6, fy * 0.6 - 3.2, 4.6, 2.1, a.face, 0, 7); c.fill();
    c.fillStyle = 'rgba(42,34,26,0.38)';
    c.beginPath(); c.ellipse(-fy * 4.6, fx * 4.6, 2.2, 2.8, a.face, 0, 7); c.fill();
    c.beginPath(); c.ellipse(fy * 4.6, -fx * 4.6, 2.2, 2.8, a.face, 0, 7); c.fill();
  } else if (type === 'flamer') {
    // flak vest — steel plate over the torso, heavier than a rifleman's kit
    c.fillStyle = '#4a4e42';
    c.beginPath(); c.ellipse(fx * 1.4, fy * 1.4, 6.2, 5.2, a.face, 0, 7); c.fill();
    c.strokeStyle = '#2a2e24';
    c.lineWidth = 1.1;
    c.stroke();
    c.fillStyle = '#5a5e50';
    c.beginPath(); c.ellipse(-fy * 4.8, fx * 4.8, 2.4, 3, a.face, 0, 7); c.fill();
    c.beginPath(); c.ellipse(fy * 4.8, -fx * 4.8, 2.4, 3, a.face, 0, 7); c.fill();
    c.strokeStyle = '#3a3e34';
    c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(-fy * 3, fx * 3); c.lineTo(fy * 3, -fx * 3); c.stroke();
  }
  if (type === 'emg') {
    // Hüftschützer belt apron and ammunition harness for the MG42 crew
    c.fillStyle = '#424038';
    c.beginPath(); c.ellipse(fx * 1.2, fy * 1.2, 6.5, 5.4, a.face, 0, 7); c.fill();
    c.strokeStyle = '#2e2c28';
    c.lineWidth = 0.9;
    c.stroke();
    c.strokeStyle = '#6a5a42';
    c.lineWidth = 1.35;
    c.beginPath();
    c.moveTo(-fy * 4.5 - fx * 1.2, fx * 4.5 - fy * 1.2);
    c.lineTo(fy * 4.5 - fx * 1.2, -fx * 4.5 - fy * 1.2);
    c.stroke();
    c.fillStyle = '#5a5a50';
    c.beginPath(); c.ellipse(-fy * 4.8, fx * 4.8, 2.4, 3, a.face, 0, 7); c.fill();
    c.beginPath(); c.ellipse(fy * 4.8, -fx * 4.8, 2.4, 3, a.face, 0, 7); c.fill();
    c.strokeStyle = '#3a3e34';
    c.lineWidth = 0.75;
    c.beginPath(); c.moveTo(-fy * 2.8, fx * 2.8); c.lineTo(fy * 2.8, -fx * 2.8); c.stroke();
  }
  if (type === 'sniper') {
    // ghillie scrim — burlap patches and grass tufts
    c.fillStyle = 'rgba(30,36,22,0.55)';
    for (const [px, py, rx, ry, rot] of [[-2, 1.5, 2.4, 1.5, 0.5], [2.5, -1, 2, 1.3, -0.7], [0.5, 3, 1.7, 1.1, 0.2],
      [-3.5, -0.5, 1.8, 1.2, 0.3], [3, 2.5, 1.6, 1, -0.4]]) {
      c.beginPath(); c.ellipse(px, py, rx, ry, rot, 0, 7); c.fill();
    }
    c.strokeStyle = 'rgba(45,55,30,0.65)';
    c.lineWidth = 0.8;
    for (const [sx, sy, ex, ey] of [[-4, 2, -5.5, 4], [3, -2, 4.5, -3.5], [-1, 4, 0.5, 5.5], [4, 1, 5, 2.5]]) {
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
    }
    // spotting binoculars on the chest
    c.fillStyle = '#2a2a22';
    c.fillRect(-fy * 3 - 2, fx * 3 - 1.2, 4, 2.6);
    c.strokeStyle = '#6a5a40';
    c.lineWidth = 0.8;
    c.strokeRect(-fy * 3 - 2, fx * 3 - 1.2, 4, 2.6);
    c.fillStyle = '#1a1a14';
    c.beginPath(); c.arc(-fy * 3 - 1.2, fx * 3, 0.85, 0, 7); c.fill();
    c.beginPath(); c.arc(-fy * 3 + 1.2, fx * 3, 0.85, 0, 7); c.fill();
    c.fillStyle = 'rgba(120,150,170,0.45)';
    c.beginPath(); c.arc(-fy * 3 - 1.2, fx * 3, 0.4, 0, 7); c.fill();
    c.beginPath(); c.arc(-fy * 3 + 1.2, fx * 3, 0.4, 0, 7); c.fill();
    // stripper clips on the belt
    c.fillStyle = '#c8a858';
    for (const off of [-3.5, 0, 3.5]) {
      c.fillRect(off - 0.6, 4.5, 1.2, 2.2);
    }
  }
  if (type === 'esniper') {
    drawEsniperKit(c, fx, fy, a.face);
  }
  if (isBar) {
    // ammo bandolier, spare BAR mags, and sling across the chest
    c.strokeStyle = '#8a7a48';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(-fy * 5.2 - fx * 2, fx * 5.2 - fy * 2);
    c.lineTo(fy * 5.2 - fx * 2, -fx * 5.2 - fy * 2);
    c.stroke();
    drawBARMag(c, -5, 3.5, 0.88, 0.3);
    drawBARMag(c, -2.2, 5.2, 0.85, -0.15);
    drawBARMag(c, 1.5, 4.8, 0.82, 0.5);
    c.fillStyle = '#2f3328';
    for (const off of [-4.5, -1.5, 1.5, 4.5]) {
      c.fillRect(off - 1.5, 4, 3, 2.4);
      c.strokeStyle = '#4a4a3e';
      c.lineWidth = 0.7;
      c.strokeRect(off - 1.5, 4, 3, 2.4);
    }
    c.strokeStyle = '#6a5a40';
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(-fy * 3.5, fx * 3.5);
    c.quadraticCurveTo(0, 5.5, fy * 3.5, -fx * 3.5);
    c.stroke();
  }
  if (type === 'esmg') {
    // assault smock and collar Litzen — close-quarters stormtrooper loadout
    c.fillStyle = '#3e3c34';
    c.beginPath(); c.ellipse(fx * 1.1, fy * 1.1, 6.8, 5.6, a.face, 0, 7); c.fill();
    c.strokeStyle = '#2e2c28';
    c.lineWidth = 0.85;
    c.stroke();
    c.fillStyle = '#4a4a42';
    c.beginPath(); c.ellipse(fx * 2.5, fy * 2.5, 1.7, 1.1, a.face, 0, 7); c.fill();
    c.beginPath(); c.ellipse(-fx * 2.5, fy * 2.5, 1.7, 1.1, a.face, 0, 7); c.fill();
    c.strokeStyle = '#b8261c';
    c.lineWidth = 0.85;
    c.beginPath();
    c.moveTo(-fy * 4.8, fx * 4.8 - 1.2);
    c.lineTo(-fy * 4.8, fx * 4.8 + 1.2);
    c.stroke();
  }
  if (type === 'erifle') {
    // collar Litzen tabs and tunic fold
    c.fillStyle = '#4a4a42';
    c.beginPath(); c.ellipse(fx * 2.5, fy * 2.5, 1.8, 1.2, a.face, 0, 7); c.fill();
    c.beginPath(); c.ellipse(-fx * 2.5, fy * 2.5, 1.8, 1.2, a.face, 0, 7); c.fill();
    c.strokeStyle = '#3a3a34';
    c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(-fy * 1.5, fx * 1.5); c.lineTo(fy * 1.5, -fx * 1.5); c.stroke();
  }
  if (type === 'erifle') {
    // loader's apron and heavy gloves for the GrW crew
    c.fillStyle = '#46443c';
    c.beginPath(); c.ellipse(fx * 1.2, fy * 1.2, 6.4, 5.4, a.face, 0, 7); c.fill();
    c.strokeStyle = '#2e2c28';
    c.lineWidth = 0.9;
    c.stroke();
    c.fillStyle = '#3a3830';
    c.beginPath(); c.ellipse(fx * 4.5, fy * 4.5, 1.8, 2.2, a.face, 0, 7); c.fill();
    c.beginPath(); c.ellipse(-fx * 3.5, fy * 3.5, 1.6, 2, a.face, 0, 7); c.fill();
  }
  if (type === 'egren') {
    // reinforced web vest and hazard cross — carries a heavy explosive load
    c.fillStyle = '#4a4e42';
    c.beginPath(); c.ellipse(fx * 1.2, fy * 1.2, 6.4, 5.4, a.face, 0, 7); c.fill();
    c.strokeStyle = '#2e3228';
    c.lineWidth = 1;
    c.stroke();
    c.strokeStyle = '#8a3830';
    c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(-fy * 2, fx * 2); c.lineTo(fy * 2, -fx * 2); c.stroke();
    c.beginPath(); c.moveTo(fy * 2, fx * 2); c.lineTo(-fy * 2, -fx * 2); c.stroke();
  }
  if (type === 'bazooka') {
    c.fillStyle = '#4a5245';
    c.beginPath(); c.ellipse(fx * 1.2, fy * 1.2, 6.5, 5.4, a.face, 0, 7); c.fill();
    c.strokeStyle = '#8a7a48';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(-fy * 4.8 - fx * 1.2, fx * 4.8 - fy * 1.2);
    c.lineTo(fy * 4.8 - fx * 1.2, -fx * 4.8 - fy * 1.2);
    c.stroke();
  }

  // ---- class kit
  if (type === 'rifleman') {
    drawRiflemanKit(c, fx, fy, a.face, true);
  }
  if (type === 'erifle') {
    drawErifleKit(c, fx, fy, a.face);
  }
  if (isShotgun) {
    // 12-gauge bandolier and shell loops on the belt
    c.strokeStyle = '#8a7a48';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(-fy * 5 - fx * 1.2, fx * 5 - fy * 1.2);
    c.lineTo(fy * 5 - fx * 1.2, -fx * 5 - fy * 1.2);
    c.stroke();
    drawShotgunShell(c, -5.2, 2.8, 0.9, 0.25);
    drawShotgunShell(c, -2.8, 4.5, 0.85, -0.15);
    drawShotgunShell(c, 0.2, 5.2, 0.82, 0.4);
    drawShotgunShell(c, 3.2, 4.2, 0.8, 0.65);
    c.fillStyle = '#3a4034';
    c.fillRect(-6.2, 4.5, 4.5, 2.8);
    c.strokeStyle = '#4a4a3e';
    c.lineWidth = 0.8;
    c.strokeRect(-6.2, 4.5, 4.5, 2.8);
    c.fillStyle = '#2f3328';
    c.fillRect(4.8, 3.8, 2.6, 2.2);
  }
  if (type === 'grenadier') {
    // M1 carbine bandolier and frags clipped to the harness
    c.strokeStyle = '#8a7a48';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(-fy * 4.5 - fx * 1.5, fx * 4.5 - fy * 1.5);
    c.lineTo(fy * 4.5 - fx * 1.5, -fx * 4.5 - fy * 1.5);
    c.stroke();
    c.fillStyle = '#3a4034';
    c.beginPath(); c.ellipse(-fy * 5.2, fx * 5.2, 2.4, 2.8, a.face, 0, 7); c.fill();
    c.beginPath(); c.ellipse(fy * 4.8, -fx * 4.8, 2.2, 2.5, a.face, 0, 7); c.fill();
    drawFragGrenade(c, -4.8, 3.2, 0.88, { rot: 0.35 });
    drawFragGrenade(c, -1.5, 5.2, 0.82, { rot: -0.2 });
    drawFragGrenade(c, 2.2, 4.6, 0.78, { rot: 0.55 });
    c.fillStyle = '#2f3328';
    c.fillRect(-5.8, 4.8, 3.2, 2.4);
    c.strokeStyle = '#4a4a3e';
    c.lineWidth = 0.8;
    c.strokeRect(-5.8, 4.8, 3.2, 2.4);
  }
  if (type === 'egren') {
    drawEgrenKit(c, fx, fy, a.face);
  }
  if (type === 'esmg') {
    drawEsmgKit(c, fx, fy, a.face);
  }
  if (type === 'emg') {
    drawEmgKit(c, fx, fy, a.face);
  }
  if (type === 'bazooka') drawBazookaKit(c, fx, fy, a.face);
  if (type === 'ebazooka') drawEbazookaKit(c, fx, fy, a.face);
  if (a.t.mortar && type === 'emortar') {
    const tube = drawGranatwerferTube(c, a.face, fx, fy, a.mortarFireT || 0);
    drawEmortarKit(c, fx, fy, a.face, tube);
  } else if (a.t.mortar) {
    const tube = drawMortarTube(c, a.face, fx, fy, a.mortarFireT || 0);
    // wooden ammo crate beside the baseplate
    c.fillStyle = '#5a4a38';
    c.fillRect(tube.bx - 4.5, tube.by + 2.5, 5.5, 3.8);
    c.strokeStyle = '#3a3028';
    c.lineWidth = 0.8;
    c.strokeRect(tube.bx - 4.5, tube.by + 2.5, 5.5, 3.8);
    c.strokeStyle = '#4a4030';
    c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(tube.bx - 4.5, tube.by + 4.4); c.lineTo(tube.bx + 1, tube.by + 4.4); c.stroke();
    drawMortarRound(c, tube.bx - 3.2, tube.by + 3.2, 0.75, 0.2);
    drawMortarRound(c, tube.bx - 1.5, tube.by + 3.5, 0.72, -0.15);
    drawMortarRound(c, tube.bx - 0.2, tube.by + 3.1, 0.7, 0.35);
    // shell carry bag on the chest
    c.fillStyle = '#3a4034';
    c.beginPath(); c.ellipse(fy * 3.5, -fx * 3.5, 2.8, 3.4, a.face, 0, 7); c.fill();
    c.strokeStyle = '#2a2e24';
    c.lineWidth = 0.9;
    c.stroke();
    drawMortarRound(c, fy * 3.2, -fx * 3.2, 0.65, a.face + 0.5);
    // range table / map board tucked under arm
    c.fillStyle = '#c8b898';
    c.fillRect(-fy * 4.8 - 2, fx * 4.8 - 1.5, 4, 3);
    c.strokeStyle = '#6a5a40';
    c.lineWidth = 0.6;
    c.strokeRect(-fy * 4.8 - 2, fx * 4.8 - 1.5, 4, 3);
    c.strokeStyle = '#8a7a58';
    c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(-fy * 4.8 - 1.5, fx * 4.8); c.lineTo(-fy * 4.8 + 1, fx * 4.8 + 1.2); c.stroke();
  }
  if (type === 'officer') {
    drawOfficerKit(c, fx, fy, a.face, true);
  }
  if (type === 'eoff') {
    drawEoffKit(c, fx, fy, a.face);
  }
  if (type === 'eflame') {
    drawEflameKit(c, fx, fy, a.face);
  } else if (type === 'flamer') {
    // twin fuel tanks on the back — metal cylinders, straps, warning stripe
    const tankX = -6.2;
    for (const [ty, fill, cap] of [[-2.2, '#7a4828', '#4a4038'], [2.8, '#3a3c30', '#323028']]) {
      c.fillStyle = fill;
      c.beginPath(); c.ellipse(tankX, ty, 2.3, 4, 0, 0, 7); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.4)';
      c.lineWidth = 0.9;
      c.beginPath(); c.ellipse(tankX, ty, 2.3, 4, 0, 0, 7); c.stroke();
      c.fillStyle = cap;
      c.beginPath(); c.ellipse(tankX, ty - 3.6, 1.6, 1.1, 0, 0, 7); c.fill();
    }
    c.strokeStyle = '#2a2820';
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(tankX - 2.5, -5.5); c.lineTo(tankX + 2.5, 5.5); c.stroke();
    c.beginPath(); c.moveTo(tankX + 2.5, -5.5); c.lineTo(tankX - 2.5, 5.5); c.stroke();
    c.fillStyle = '#e8c030';
    c.fillRect(tankX - 0.8, -1.2, 1.6, 4.8);
    c.strokeStyle = '#1a1814';
    c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(tankX - 2.3, 0); c.lineTo(-2, fy * 2); c.stroke();
  }

  // ---- headgear
  if (type === 'eoff') {
    drawEoffCap(c, fx, fy);
  } else if (type === 'officer') {
    drawOfficerCap(c, fx, fy, true);
  } else if (type === 'esniper') {
    // helmet with oak-leaf cover and foliage loops
    c.fillStyle = '#3f3f34';
    c.beginPath(); c.arc(0, -1, 4.0, 0, 7); c.fill();
    c.fillStyle = 'rgba(58,52,40,0.55)';
    for (let i = 0; i < 6; i++) {
      const ang = i * Math.PI / 3 + 0.15;
      c.beginPath();
      c.ellipse(Math.cos(ang) * 2.8, -1 + Math.sin(ang) * 2.8, 1.1, 1.6, ang, 0, 7);
      c.fill();
    }
    c.strokeStyle = 'rgba(72,64,48,0.65)';
    c.lineWidth = 0.65;
    for (let i = 0; i < 5; i++) {
      const ang = i * Math.PI / 2.5 + 0.3;
      c.beginPath();
      c.moveTo(Math.cos(ang) * 3, -1 + Math.sin(ang) * 3);
      c.lineTo(Math.cos(ang) * 4.5, -1 + Math.sin(ang) * 4.5);
      c.stroke();
    }
    const hx = -fx * 2.3, hy = -1 + fy * 2.3;
    c.strokeStyle = 'rgba(200,198,180,0.7)';
    c.lineWidth = 0.55;
    c.beginPath(); c.moveTo(hx - 1, hy); c.lineTo(hx + 1, hy); c.stroke();
    c.beginPath(); c.moveTo(hx, hy - 1); c.lineTo(hx, hy + 1); c.stroke();
  } else if (type === 'sniper') {
    // ghillie hood — dark scrim with leaf fringe
    c.fillStyle = '#2e3823';
    c.beginPath(); c.arc(0, -1, 4.0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(48,58,32,0.75)';
    c.lineWidth = 0.75;
    for (let i = 0; i < 8; i++) {
      const ang = i * Math.PI / 4 + 0.2;
      c.beginPath();
      c.moveTo(Math.cos(ang) * 3.2, -1 + Math.sin(ang) * 3.2);
      c.lineTo(Math.cos(ang) * 4.8, -1 + Math.sin(ang) * 4.8);
      c.stroke();
    }
    c.fillStyle = 'rgba(55,65,38,0.5)';
    c.beginPath(); c.ellipse(-fx * 2.5, -1 + fy * 2.5, 1.4, 1.8, a.face, 0, 7); c.fill();
  } else if (type === 'medic') {
    // white helmet with the red cross
    c.fillStyle = '#ddd8c8';
    c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)';
    c.lineWidth = 1;
    c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.stroke();
    c.fillStyle = '#b8261c';
    c.fillRect(-2.4, -1.7, 4.8, 1.4); c.fillRect(-0.7, -3.4, 1.4, 4.8);
  } else {
    c.fillStyle = us ? '#63804d' : '#5c626c';
    c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1;
    c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.stroke();
    if (type === 'grenadier') {
      // white assault stripe on the helmet back
      c.fillStyle = 'rgba(230,228,210,0.85)';
      c.beginPath(); c.arc(-fx * 2.8, -1 + fy * 2.8, 1.6, 0, 7); c.fill();
    }
    if (type === 'egren') {
      // white stick-grenade stencil on the helmet side
      const hx = -fx * 2.5, hy = -1 + fy * 2.5;
      c.strokeStyle = 'rgba(230,228,210,0.88)';
      c.lineWidth = 0.95;
      c.beginPath(); c.moveTo(hx, hy - 1.8); c.lineTo(hx, hy + 1.4); c.stroke();
      c.fillStyle = 'rgba(230,228,210,0.88)';
      c.beginPath(); c.arc(hx, hy - 2, 1.05, 0, 7); c.fill();
      c.strokeStyle = 'rgba(200,198,180,0.7)';
      c.lineWidth = 0.55;
      c.beginPath(); c.arc(hx, hy - 2, 1.05, 0, 7); c.stroke();
    }
    if (type === 'emg') {
      // white crossed cartridge belts — MG42 team stencil
      const mx = -fx * 2.35, my = -1 + fy * 2.35;
      c.strokeStyle = 'rgba(230,228,210,0.88)';
      c.lineWidth = 0.85;
      c.beginPath();
      c.moveTo(mx - 1.2, my - 1.2); c.lineTo(mx + 1.2, my + 1.2);
      c.moveTo(mx + 1.2, my - 1.2); c.lineTo(mx - 1.2, my + 1.2);
      c.stroke();
      c.beginPath();
      c.moveTo(mx - 0.8, my - 1.5); c.lineTo(mx - 0.8, my + 1.5);
      c.moveTo(mx + 0.8, my - 1.5); c.lineTo(mx + 0.8, my + 1.5);
      c.stroke();
    }
    if (type === 'eflame') {
      // orange flame stencil on the helmet — Flammenwerfer section
      const fx2 = -fx * 2.35, fy2 = -1 + fy * 2.35;
      c.fillStyle = 'rgba(255,120,40,0.9)';
      c.beginPath();
      c.moveTo(fx2 - 0.3, fy2 + 1.5);
      c.quadraticCurveTo(fx2 + 0.2, fy2 - 0.2, fx2 + 0.5, fy2 - 1.6);
      c.quadraticCurveTo(fx2 + 0.9, fy2 - 0.3, fx2 + 0.6, fy2 + 1.5);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(230,180,80,0.7)';
      c.lineWidth = 0.55;
      c.stroke();
    }
    if (type === 'esmg') {
      // white lightning bolt — assault stormtrooper stencil
      const lx = -fx * 2.4, ly = -1 + fy * 2.4;
      c.strokeStyle = 'rgba(230,228,210,0.9)';
      c.lineWidth = 1.05;
      c.beginPath();
      c.moveTo(lx - 0.4, ly - 1.8);
      c.lineTo(lx + 0.5, ly - 0.2);
      c.lineTo(lx - 0.1, ly - 0.2);
      c.lineTo(lx + 0.6, ly + 1.8);
      c.stroke();
      c.fillStyle = 'rgba(230,228,210,0.85)';
      c.beginPath(); c.arc(-fx * 2.8, -1 + fy * 2.8, 1.4, 0, 7); c.fill();
    }
    if (type === 'erifle') {
      // national shield decal and eagle on the helmet
      const sx = -fx * 2.2, sy = -1 + fy * 2.2;
      c.fillStyle = 'rgba(200,198,180,0.78)';
      c.beginPath(); c.ellipse(sx, sy, 1.05, 1.35, a.face, 0, 7); c.fill();
      c.strokeStyle = 'rgba(60,58,48,0.55)';
      c.lineWidth = 0.5;
      c.stroke();
      c.strokeStyle = 'rgba(50,48,40,0.72)';
      c.lineWidth = 0.65;
      c.beginPath();
      c.moveTo(sx - 0.6, sy - 0.8);
      c.quadraticCurveTo(sx + 0.2, sy - 1.4, sx + 0.9, sy - 0.5);
      c.stroke();
      c.beginPath();
      c.moveTo(sx - 0.3, sy - 0.6); c.lineTo(sx + 0.5, sy - 0.2); c.stroke();
    }
    if (isShotgun) {
      // steel chin strap — keeps the helmet on under recoil
      c.strokeStyle = '#4a4a40';
      c.lineWidth = 1.1;
      c.beginPath(); c.moveTo(-2.8, 1.5); c.lineTo(0, 3.8); c.lineTo(2.8, 1.5); c.stroke();
    }
    if (type === 'mortarman') {
      // red armband — mortar section identifier
      c.fillStyle = '#b8261c';
      c.beginPath(); c.ellipse(-fy * 4.2, fx * 4.2, 1.8, 2.4, a.face, 0, 7); c.fill();
    }
    if (type === 'emortar') {
      // white falling bomb stencil — Granatwerfer section
      const mx = -fx * 2.4, my = -1 + fy * 2.4;
      c.fillStyle = 'rgba(230,228,210,0.85)';
      c.beginPath(); c.arc(mx, my - 1.2, 0.9, 0, 7); c.fill();
      c.strokeStyle = 'rgba(230,228,210,0.85)';
      c.lineWidth = 0.85;
      c.beginPath(); c.moveTo(mx, my - 0.3); c.lineTo(mx, my + 1.6); c.stroke();
      c.beginPath();
      c.moveTo(mx - 0.7, my + 1.2); c.lineTo(mx, my + 1.8); c.lineTo(mx + 0.7, my + 1.2);
      c.stroke();
    }
    if (type === 'bazooka') {
      // white rocket stencil — bazooka section
      const rx = -fx * 2.35, ry = -1 + fy * 2.35;
      c.strokeStyle = 'rgba(230,228,210,0.9)';
      c.lineWidth = 0.95;
      c.beginPath();
      c.moveTo(rx - 0.3, ry + 1.2);
      c.lineTo(rx + 0.8, ry - 1.4);
      c.stroke();
      c.fillStyle = 'rgba(255,180,60,0.85)';
      c.beginPath(); c.arc(rx + 0.8, ry - 1.4, 0.55, 0, 7); c.fill();
    }
    if (type === 'ebazooka') {
      // white tank silhouette — Panzerfaust section
      const tx = -fx * 2.35, ty = -1 + fy * 2.35;
      c.strokeStyle = 'rgba(230,228,210,0.9)';
      c.lineWidth = 0.85;
      c.strokeRect(tx - 1.2, ty - 0.8, 2.4, 1.6);
      c.beginPath();
      c.moveTo(tx - 1.2, ty + 0.8); c.lineTo(tx - 1.8, ty + 1.4);
      c.moveTo(tx + 1.2, ty + 0.8); c.lineTo(tx + 1.8, ty + 1.4);
      c.stroke();
      c.beginPath();
      c.moveTo(tx - 0.5, ty - 0.8); c.lineTo(tx - 0.5, ty - 1.4);
      c.moveTo(tx + 0.5, ty - 0.8); c.lineTo(tx + 0.5, ty - 1.4);
      c.stroke();
    }
    if (isRifle) {
      c.strokeStyle = 'rgba(30,36,22,0.38)';
      c.lineWidth = 0.65;
      for (const off of [-2, 0, 2]) {
        c.beginPath(); c.arc(off, -1, 3.55, 0.18, 2.92); c.stroke();
      }
      c.strokeStyle = '#4a4a40';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(-2.7, 1.7); c.lineTo(0, 3.5); c.lineTo(2.7, 1.7); c.stroke();
    }
  }
  if (a.type === 'engineer') {
    // crossed-tools mark on the helmet
    c.strokeStyle = '#e8d98a';
    c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(-2.4, -3.4); c.lineTo(2.4, 1.4); c.stroke();
    c.beginPath(); c.moveTo(2.4, -3.4); c.lineTo(-2.4, 1.4); c.stroke();
  }
  if (isBar) {
    // helmet net, brass buckle, and cheek rest mark
    c.strokeStyle = 'rgba(30,36,22,0.45)';
    c.lineWidth = 0.7;
    for (const off of [-2.5, 0, 2.5]) {
      c.beginPath(); c.arc(off, -1, 3.6, 0.2, 2.9); c.stroke();
    }
    c.fillStyle = '#8a7a48';
    c.beginPath(); c.arc(fy * 3.2, -fx * 3.2, 1.2, 0, 7); c.fill();
    c.strokeStyle = '#5a4a38';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(-2.5, 0.5); c.lineTo(-3.5, 2.5); c.stroke();
  }
  if (type === 'emg') {
    // MG team y-straps and chin strap
    c.strokeStyle = '#3c3c33';
    c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(-2.8, -3.2); c.lineTo(0, 1.8); c.lineTo(2.8, -3.2); c.stroke();
    c.beginPath(); c.moveTo(-2.2, 2.2); c.lineTo(2.2, 2.2); c.stroke();
  }

  // wind-up pose while lobbing a grenade
  if (a.grenThrowT > 0) {
    const t = clamp(a.grenThrowT / 0.35, 0, 1);
    const arm = a.face - 0.55 + (1 - t) * 0.35;
    const ax = Math.cos(arm) * 5.5, ay = Math.sin(arm) * 5.5;
    c.strokeStyle = a.t.color;
    c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(ax, ay); c.stroke();
    if (type === 'egren') {
      drawStickGrenade(c, ax + Math.cos(arm) * 2.5, ay + Math.sin(arm) * 2.5, 0.9, arm + Math.PI / 2);
    } else {
      drawFragGrenade(c, ax + Math.cos(arm) * 2.2, ay + Math.sin(arm) * 2.2, 0.95, { rot: arm - 0.4 });
    }
  }
  // drop a round into the tube while firing
  if (a.mortarFireT > 0 && a.t.mortar) {
    const t = clamp(a.mortarFireT / 0.18, 0, 1);
    const arm = a.face - 0.35 - t * 0.5;
    const ax = Math.cos(arm) * 6, ay = Math.sin(arm) * 6;
    c.strokeStyle = a.t.color;
    c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(ax, ay); c.stroke();
    if (type === 'emortar') {
      drawGrw81Round(c, ax + Math.cos(arm) * 2, ay + Math.sin(arm) * 2, 0.9, arm + Math.PI / 2);
    } else {
      drawMortarRound(c, ax + Math.cos(arm) * 1.8, ay + Math.sin(arm) * 1.8, 0.85, arm + Math.PI / 2);
    }
  }

  c.restore();
}

// health bar, rank chevrons, selection ring: drawn whether standing or prone
function drawSoldierOverlays(a) {
  if (a._ghost) return;
  if (a.hp < a.maxhp) {
    const f = clamp(a.hp / a.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(a.x - 9, a.y - 13, 18, 3);
    ctx.fillStyle = f > 0.5 ? '#7ec850' : f > 0.25 ? '#e0b040' : '#d04030';
    ctx.fillRect(a.x - 9, a.y - 13, 18 * f, 3);
  }

  // Body/Flak Armor bars, stacked just above the HP bar, shown while armor holds
  if (a.bodyArmor > 0) {
    const f = clamp(a.bodyArmor / a.maxBodyArmor, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(a.x - 9, a.y - 16, 18, 2);
    ctx.fillStyle = '#8fb3d9';          ctx.fillRect(a.x - 9, a.y - 16, 18 * f, 2); // steel-blue = body armor
  }
  if (a.flakArmor > 0) {
    const f = clamp(a.flakArmor / a.maxFlakArmor, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(a.x - 9, a.y - 19, 18, 2);
    ctx.fillStyle = '#b7a94e';          ctx.fillRect(a.x - 9, a.y - 19, 18 * f, 2); // olive = flak armor
  }

  // rank chevrons for veterans (visual nation — US kit only)
  if ((a.nation || a.side) === 'us' && a.rank > 0) {
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 1;
    let sx = a.x - (a.rank * 5 - 2) / 2;
    const sy = a.y - 17;
    for (let i = 0; i < a.rank; i++) {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 1.5, sy - 2.5);
      ctx.lineTo(sx + 3, sy);
      ctx.stroke();
      sx += 5;
    }
  }

  // the hit-squad target is marked for death: pulsing gold ring + crosshair ticks
  if (a.vip) {
    const pulse = 15 + Math.sin(G.time * 4) * 2;
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(a.x, a.y, pulse, 0, 7); ctx.stroke();
    ctx.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.moveTo(a.x + dx * (pulse - 3), a.y + dy * (pulse - 3));
      ctx.lineTo(a.x + dx * (pulse + 4), a.y + dy * (pulse + 4));
    }
    ctx.stroke();
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd94a';
    ctx.fillText('TARGET', a.x, a.y - pulse - 5);
  }

  // selection ring
  if (G.selected.includes(a)) {
    drawUnitWeaponRange(a, { bearing: a.face });
    drawSpecialistRange(a);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(a.x, a.y, 12, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    // name/rank/kills now live in the single-selection info panel (inspector.js),
    // so the floating label under the unit is no longer drawn here
  }
}
