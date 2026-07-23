/* Trenchworks: WW2 — Imperial Japanese Army soldier renderer.
   A self-contained painter for the jp roster: Type 90 helmets, Arisaka rifles
   with long bayonets, banzai chargers, katana officers, knee mortars, Type 99
   LMGs, Type 100 flamethrowers and lunge-mine suicide men. Dispatched from
   paintSoldierBody (render-soldier.js) whenever a.nation === 'jp'.
   Part of a set of plain scripts sharing one global scope; load order in index.html. */
'use strict';

const JP_HELMET = '#6c6a3a';   // Type 90 khaki-painted steel
const JP_HELMET_DK = '#4c4a26';
const JP_STAR = '#d8c24a';     // brass star on the helmet front
const JP_WOOD = '#6b5334';     // Arisaka furniture
const JP_STEEL = '#2b2a22';
const JP_BLADE = '#c2c6cc';

// ---- weapons -------------------------------------------------------------

// Type 38/99 Arisaka: a long rifle capped by an even longer bayonet spike.
function drawArisaka(c, fx, fy, gunLen, bayonet) {
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const px = -fy, py = fx;
  // barrel
  c.strokeStyle = JP_STEEL;
  c.lineWidth = 2.1;
  c.beginPath(); c.moveTo(fx * 2, fy * 2); c.lineTo(tipX, tipY); c.stroke();
  // long wooden stock running most of the length
  c.strokeStyle = JP_WOOD;
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(fx * 0.8 - px * 2.4, fy * 0.8 + py * 2.4);
  c.lineTo(fx * (gunLen * 0.72), fy * (gunLen * 0.72));
  c.stroke();
  // upper handguard band
  c.strokeStyle = '#4a3c26';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(fx * (gunLen * 0.5) - px * 0.9, fy * (gunLen * 0.5) + py * 0.9);
  c.lineTo(fx * (gunLen * 0.5) + px * 0.9, fy * (gunLen * 0.5) - py * 0.9);
  c.stroke();
  // straight bolt handle jutting out to the side
  c.strokeStyle = '#3a3830';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(fx * 3.6 + px * 0.4, fy * 3.6 + py * 0.4);
  c.lineTo(fx * 3.2 + px * 2.4, fy * 3.2 + py * 2.4);
  c.stroke();
  if (bayonet) {
    const bx = fx * (gunLen + 6.5), by = fy * (gunLen + 6.5);
    c.strokeStyle = JP_BLADE;
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(tipX, tipY); c.lineTo(bx, by); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(tipX, tipY); c.lineTo(bx, by); c.stroke();
    // muzzle/bayonet lug
    c.fillStyle = '#1c1c16';
    c.beginPath(); c.arc(tipX, tipY, 1, 0, 7); c.fill();
  }
}

// shin gunto sabre held forward, slight curve — an officer's blade
function drawGunto(c, fx, fy, gunLen, face) {
  const px = -fy, py = fx;
  const gripX = fx * 2, gripY = fy * 2;
  // tsuka (grip) and guard
  c.strokeStyle = '#2a281f';
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(gripX, gripY); c.lineTo(fx * 4, fy * 4); c.stroke();
  c.strokeStyle = '#8a7a3a';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(fx * 4 - px * 1.6, fy * 4 - py * 1.6);
  c.lineTo(fx * 4 + px * 1.6, fy * 4 + py * 1.6);
  c.stroke();
  // curved blade
  const midX = fx * (gunLen * 0.7) + px * 1.2, midY = fy * (gunLen * 0.7) + py * 1.2;
  const tipX = fx * (gunLen + 3), tipY = fy * (gunLen + 3);
  c.strokeStyle = JP_BLADE;
  c.lineWidth = 1.7;
  c.beginPath();
  c.moveTo(fx * 4.5, fy * 4.5);
  c.quadraticCurveTo(midX, midY, tipX, tipY);
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.5)';
  c.lineWidth = 0.5;
  c.beginPath();
  c.moveTo(fx * 4.5, fy * 4.5);
  c.quadraticCurveTo(midX, midY, tipX, tipY);
  c.stroke();
}

// Type 99 LMG: long finned barrel, curved top-mounted magazine, bipod
function drawType99Lmg(c, fx, fy, gunLen, face) {
  const px = -fy, py = fx;
  const tipX = fx * gunLen, tipY = fy * gunLen;
  c.strokeStyle = '#26261e';
  c.lineWidth = 2.6;
  c.beginPath(); c.moveTo(fx * 2, fy * 2); c.lineTo(tipX, tipY); c.stroke();
  // cooling fins near the breech
  c.strokeStyle = '#3a3830';
  c.lineWidth = 0.8;
  for (let tt = 0.25; tt <= 0.55; tt += 0.08) {
    const sx = fx * (gunLen * tt), sy = fy * (gunLen * tt);
    c.beginPath();
    c.moveTo(sx - px * 1.6, sy - py * 1.6);
    c.lineTo(sx + px * 1.6, sy + py * 1.6);
    c.stroke();
  }
  // curved top magazine rising off the receiver
  const mX = fx * (gunLen * 0.36), mY = fy * (gunLen * 0.36);
  c.fillStyle = '#3a3a2c';
  c.beginPath();
  c.moveTo(mX - px * 0.9, mY - py * 0.9);
  c.quadraticCurveTo(mX - px * 4 - fx * 1.5, mY - py * 4 - fy * 1.5, mX - px * 5.5, mY - py * 5.5);
  c.lineTo(mX - px * 4.4 + fx * 1.6, mY - py * 4.4 + fy * 1.6);
  c.quadraticCurveTo(mX - px * 2.5 + fx * 1, mY - py * 2.5 + fy * 1, mX + px * 0.6, mY + py * 0.6);
  c.closePath(); c.fill();
  c.strokeStyle = '#22221a';
  c.lineWidth = 0.6;
  c.stroke();
  // wooden stock
  c.strokeStyle = JP_WOOD;
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(fx * 1 - px * 2.4, fy * 1 + py * 2.4);
  c.lineTo(fx * 2, fy * 2);
  c.stroke();
  // bipod at the muzzle
  c.strokeStyle = '#26261e';
  c.lineWidth = 1.2;
  for (const s of [-0.7, 0.7]) {
    c.beginPath();
    c.moveTo(fx * (gunLen - 1), fy * (gunLen - 1));
    c.lineTo(fx * (gunLen + 1) + Math.cos(face + s + 0.45) * 4, fy * (gunLen + 1) + Math.sin(face + s + 0.45) * 4);
    c.stroke();
  }
}

// scoped Arisaka for the nest sniper
function drawArisakaSniper(c, fx, fy, gunLen, face) {
  drawArisaka(c, fx, fy, gunLen, false);
  const px = -fy, py = fx;
  // scope offset to the left (Type 97 mount)
  const sX = fx * (gunLen * 0.42) - px * 1.8, sY = fy * (gunLen * 0.42) - py * 1.8;
  c.strokeStyle = '#1c1c16';
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(sX - fx * 2.4, sY - fy * 2.4);
  c.lineTo(sX + fx * 2.4, sY + fy * 2.4);
  c.stroke();
  c.fillStyle = '#0e0e0a';
  c.beginPath(); c.arc(sX + fx * 2.4, sY + fy * 2.4, 0.9, 0, 7); c.fill();
}

// Type 100 flamethrower wand + pilot flame
function drawType100Flamer(c, fx, fy, gunLen, face, lit) {
  const tipX = fx * gunLen, tipY = fy * gunLen;
  c.strokeStyle = '#3a3830';
  c.lineWidth = 3.4;
  c.beginPath(); c.moveTo(fx * 2, fy * 2); c.lineTo(tipX, tipY); c.stroke();
  c.strokeStyle = '#26261e';
  c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(fx * 2.4, fy * 2.4); c.lineTo(fx * (gunLen - 0.6), fy * (gunLen - 0.6)); c.stroke();
  // pistol grip
  c.strokeStyle = '#4a3f32';
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(fx * 3.8 + fy * 1.4, fy * 3.8 - fx * 1.4);
  c.lineTo(fx * 3.8 + fy * 4.6, fy * 3.8 - fx * 4.6);
  c.stroke();
  // nozzle bell
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(tipX - fy * 2.2, tipY + fx * 2.2);
  c.lineTo(tipX + fx * 1.6, tipY + fy * 1.6);
  c.lineTo(tipX + fy * 2.2, tipY - fx * 2.2);
  c.stroke();
  // fuel hose to the backpack
  c.strokeStyle = '#2a2820';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-6, 0);
  c.quadraticCurveTo(-fy * 4 + fx, fx * 4 + fy, fx * 3.2, fy * 3.2);
  c.stroke();
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
    c.beginPath(); c.arc(nozX, nozY, 1.4, 0, 7); c.fill();
  }
}

// Type 99 lunge mine: a long pole tipped with a conical shaped charge
function drawLungeMine(c, fx, fy, gunLen) {
  const px = -fy, py = fx;
  // wooden pole
  c.strokeStyle = '#5a4a30';
  c.lineWidth = 2.1;
  c.beginPath(); c.moveTo(fx * 2, fy * 2); c.lineTo(fx * gunLen, fy * gunLen); c.stroke();
  // conical charge head
  const hx = fx * gunLen, hy = fy * gunLen;
  c.fillStyle = '#3a3a34';
  c.beginPath();
  c.moveTo(hx - px * 2.6, hy - py * 2.6);
  c.lineTo(fx * (gunLen + 5), fy * (gunLen + 5));
  c.lineTo(hx + px * 2.6, hy + py * 2.6);
  c.closePath(); c.fill();
  c.strokeStyle = '#22221e';
  c.lineWidth = 0.7;
  c.stroke();
  // hazard band
  c.strokeStyle = '#c8b038';
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(hx - px * 2.2, hy - py * 2.2);
  c.lineTo(hx + px * 2.2, hy + py * 2.2);
  c.stroke();
}

// small Type 89 discharger braced beside the crouching man's foot
function drawKneeMortar(c, fx, fy, fireT) {
  // aim up-field: a short stubby tube on a curved baseplate near the feet
  const bx = -3.5, by = 4.5;
  c.save();
  c.translate(bx, by);
  c.rotate(-0.6);
  // baseplate spade
  c.fillStyle = '#3a3830';
  c.beginPath(); c.ellipse(0, 3.2, 3, 1.4, 0, 0, 7); c.fill();
  // tube
  c.fillStyle = '#4a4a40';
  c.fillRect(-1.4, -5.5, 2.8, 9);
  c.strokeStyle = '#26261e';
  c.lineWidth = 0.7;
  c.strokeRect(-1.4, -5.5, 2.8, 9);
  c.fillStyle = '#2a2a22';
  c.fillRect(-1.4, -6, 2.8, 1.2);
  if (fireT > 0) {
    c.fillStyle = '#ffe08a';
    c.beginPath(); c.arc(0, -6, 2.4 * clamp(fireT / 0.18, 0, 1), 0, 7); c.fill();
  }
  c.restore();
}

// ---- headgear ------------------------------------------------------------

function drawJpHelmet(c, fx, fy, star) {
  c.fillStyle = JP_HELMET;
  c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = 1;
  c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.stroke();
  // net-tie ridge
  c.strokeStyle = JP_HELMET_DK;
  c.lineWidth = 0.7;
  c.beginPath(); c.arc(0, -1, 3.4, 0.2, 2.94); c.stroke();
  if (star) {
    // brass star on the front (toward facing)
    const sx = fx * 2.4, sy = -1 + fy * 2.4;
    c.fillStyle = JP_STAR;
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI / 2 + i * (Math.PI * 4 / 5);
      const rx = sx + Math.cos(ang) * 1.5, ry = sy + Math.sin(ang) * 1.5;
      if (i === 0) c.moveTo(rx, ry); else c.lineTo(rx, ry);
    }
    c.closePath(); c.fill();
  }
}

// white hachimaki headband with a red rising-sun disc — the banzai charger
function drawHachimaki(c, fx, fy) {
  c.fillStyle = '#c9a878';    // bare head / cloth cap
  c.beginPath(); c.arc(0, -1, 3.9, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.3)';
  c.lineWidth = 0.8;
  c.beginPath(); c.arc(0, -1, 3.9, 0, 7); c.stroke();
  // white band across the brow
  c.strokeStyle = '#eae6da';
  c.lineWidth = 2.1;
  const px = -fy, py = fx;
  c.beginPath();
  c.moveTo(fx * 1.4 - px * 3.6, -1 + fy * 1.4 - py * 3.6);
  c.lineTo(fx * 1.4 + px * 3.6, -1 + fy * 1.4 + py * 3.6);
  c.stroke();
  // red disc, front-center
  c.fillStyle = '#c22030';
  c.beginPath(); c.arc(fx * 1.8, -1 + fy * 1.8, 1, 0, 7); c.fill();
  // trailing knot tails at the back
  c.strokeStyle = '#eae6da';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-fx * 3.4, -1 - fy * 3.4);
  c.lineTo(-fx * 5.4 - py * 1.2, -1 - fy * 5.4 + px * 1.2);
  c.moveTo(-fx * 3.4, -1 - fy * 3.4);
  c.lineTo(-fx * 5.4 + py * 1.2, -1 - fy * 5.4 - px * 1.2);
  c.stroke();
}

// officer's peaked field cap
function drawJpCap(c, fx, fy) {
  c.fillStyle = '#5f5d33';
  c.beginPath(); c.arc(0, -1, 4, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = 0.9;
  c.beginPath(); c.arc(0, -1, 4, 0, 7); c.stroke();
  // red band and peak toward the front
  c.strokeStyle = '#a83028';
  c.lineWidth = 1.3;
  const px = -fy, py = fx;
  c.beginPath();
  c.moveTo(fx * 1 - px * 3.4, -1 + fy * 1 - py * 3.4);
  c.lineTo(fx * 1 + px * 3.4, -1 + fy * 1 + py * 3.4);
  c.stroke();
  c.fillStyle = '#3a3822';
  c.beginPath();
  c.ellipse(fx * 3.6, -1 + fy * 3.6, 2, 1, fx !== 0 ? Math.atan2(fy, fx) : 0, 0, 7);
  c.fill();
  // star badge
  c.fillStyle = JP_STAR;
  c.beginPath(); c.arc(fx * 2.4, -1 + fy * 2.4, 0.85, 0, 7); c.fill();
}

// ---- kit -----------------------------------------------------------------

// standard IJA webbing: cross belts and front ammo pouches
function drawJpWebbing(c, fx, fy, face) {
  c.strokeStyle = '#4a3e28';
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(-fy * 4.4 - fx * 1, fx * 4.4 - fy * 1);
  c.lineTo(fy * 4.4 - fx * 1, -fx * 4.4 - fy * 1);
  c.stroke();
  c.beginPath();
  c.moveTo(-fy * 4.4 + fx * 1, fx * 4.4 + fy * 1);
  c.lineTo(fy * 4.4 + fx * 1, -fx * 4.4 + fy * 1);
  c.stroke();
  // belt line
  c.strokeStyle = '#3a3222';
  c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(-5.5, 4); c.lineTo(5.5, 4); c.stroke();
  // two front pouches
  c.fillStyle = '#4a4028';
  for (const off of [-2.4, 2.4]) {
    c.fillRect(off - 1.3, 3.3, 2.6, 2.4);
    c.strokeStyle = '#2a2418';
    c.lineWidth = 0.6;
    c.strokeRect(off - 1.3, 3.3, 2.6, 2.4);
  }
}

// twin fuel tanks for the flamethrower
function drawJpFlamerTanks(c) {
  const tankX = -6.2;
  for (const [ty, fill] of [[-2.2, '#6a5a2a'], [2.8, '#3a3c26']]) {
    c.fillStyle = fill;
    c.beginPath(); c.ellipse(tankX, ty, 2.3, 4, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.4)';
    c.lineWidth = 0.9;
    c.beginPath(); c.ellipse(tankX, ty, 2.3, 4, 0, 0, 7); c.stroke();
  }
  c.strokeStyle = '#2a2820';
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(tankX - 2.5, -5.5); c.lineTo(tankX + 2.5, 5.5); c.stroke();
}

// ---- main painter --------------------------------------------------------

function paintJapaneseSoldier(c, a) {
  const type = a.type;
  const t = a.t;
  const gunLen = t.gun;
  const fx = Math.cos(a.face), fy = Math.sin(a.face);
  const isLmg = type === 'jlmg';
  const isOfficer = type === 'joff';
  const isBanzai = type === 'jbanzai';
  const isFlamer = type === 'jflame';
  c.save();

  // shadow
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath(); c.ellipse(0, 3, 8, 4, 0, 0, 7); c.fill();

  // ---- weapon
  if (type === 'jbanzai' || type === 'jrifle') {
    drawArisaka(c, fx, fy, gunLen, true);
  } else if (type === 'jsniper') {
    drawArisakaSniper(c, fx, fy, gunLen, a.face);
  } else if (isLmg) {
    drawType99Lmg(c, fx, fy, gunLen, a.face);
  } else if (isFlamer) {
    drawType100Flamer(c, fx, fy, gunLen, a.face, a.flameT > 0);
  } else if (type === 'jlunge') {
    drawLungeMine(c, fx, fy, gunLen);
  } else if (isOfficer) {
    drawGunto(c, fx, fy, gunLen, a.face);
  } else if (type === 'jknee') {
    // sidearm carbine plus the discharger braced by the feet
    c.strokeStyle = JP_STEEL;
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(fx * 2, fy * 2); c.lineTo(fx * gunLen, fy * gunLen); c.stroke();
  }

  // ---- body
  const bodyW = isLmg ? 7.2 : isFlamer ? 7 : isBanzai ? 6.6 : 6.6;
  const bodyH = isLmg ? 5 : isFlamer ? 5.3 : 5;
  c.fillStyle = t.color;
  c.beginPath(); c.ellipse(0, 0, bodyW, bodyH, a.face, 0, 7); c.fill();
  c.strokeStyle = 'rgba(14,15,11,0.6)';
  c.lineWidth = 1.1;
  c.stroke();

  // ---- torso kit
  if (isFlamer) {
    // asbestos apron over the chest
    c.fillStyle = '#4a4830';
    c.beginPath(); c.ellipse(fx * 1.3, fy * 1.3, 6, 5, a.face, 0, 7); c.fill();
    c.strokeStyle = '#2a2a1e';
    c.lineWidth = 1;
    c.stroke();
    drawJpFlamerTanks(c);
  } else if (isOfficer) {
    // officer's sash and a holstered pistol at the hip
    c.strokeStyle = '#b8a44a';
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(-fy * 4.6 - fx * 1.4, fx * 4.6 - fy * 1.4);
    c.lineTo(fy * 4.6 + fx * 1.4, -fx * 4.6 + fy * 1.4);
    c.stroke();
    c.fillStyle = '#3a3222';
    c.beginPath(); c.ellipse(-fy * 4.4, fx * 4.4, 1.5, 2.1, a.face, 0, 7); c.fill();
    // scabbard slung on the left
    c.strokeStyle = '#2a281f';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(-fy * 3.5 - fx * 2, fx * 3.5 - fy * 2);
    c.lineTo(-fy * 6.5 - fx * 4, fx * 6.5 - fy * 4);
    c.stroke();
  } else if (isBanzai) {
    // light marching order — a single bandolier, a rising-sun flag on the back
    c.strokeStyle = '#4a3e28';
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(-fy * 4.4 - fx * 1, fx * 4.4 - fy * 1);
    c.lineTo(fy * 4.4 - fx * 1, -fx * 4.4 - fy * 1);
    c.stroke();
    // flag staff and cloth trailing off the pack, behind the man
    const bxr = -fx * 5.5, byr = -fy * 5.5;
    c.strokeStyle = '#6a5334';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(-fx * 3, -fy * 3); c.lineTo(bxr - fx * 3, byr - fy * 3); c.stroke();
    c.fillStyle = '#eae6da';
    c.beginPath();
    c.moveTo(bxr, byr);
    c.lineTo(bxr - fy * 3.2, byr + fx * 3.2);
    c.lineTo(bxr - fx * 2.4 - fy * 3.2, byr - fy * 2.4 + fx * 3.2);
    c.lineTo(bxr - fx * 2.4, byr - fy * 2.4);
    c.closePath(); c.fill();
    c.fillStyle = '#c22030';
    c.beginPath(); c.arc(bxr - fy * 1.4 - fx * 1, byr + fx * 1.4 - fy * 1, 1, 0, 7); c.fill();
  } else if (type === 'jknee') {
    drawJpWebbing(c, fx, fy, a.face);
    drawKneeMortar(c, fx, fy, a.mortarFireT || 0);
  } else {
    drawJpWebbing(c, fx, fy, a.face);
  }

  // ---- headgear
  if (isOfficer) drawJpCap(c, fx, fy);
  else if (isBanzai) drawHachimaki(c, fx, fy);
  else if (type === 'jsniper') {
    drawJpHelmet(c, fx, fy, false);
    // foliage loops tucked into the helmet band
    c.strokeStyle = 'rgba(72,90,40,0.75)';
    c.lineWidth = 0.7;
    for (let i = 0; i < 5; i++) {
      const ang = i * Math.PI / 2.5 + 0.3;
      c.beginPath();
      c.moveTo(Math.cos(ang) * 3, -1 + Math.sin(ang) * 3);
      c.lineTo(Math.cos(ang) * 4.6, -1 + Math.sin(ang) * 4.6);
      c.stroke();
    }
  } else {
    drawJpHelmet(c, fx, fy, true);
  }

  // ---- banzai bayonet-thrust flash
  if (a.slashT > 0) {
    const tp = clamp(a.slashT / 0.24, 0, 1);
    const reach = gunLen + 8;
    c.strokeStyle = `rgba(255,255,255,${0.7 * tp})`;
    c.lineWidth = 1.6;
    c.beginPath();
    c.arc(0, 0, reach, a.face - 0.5 * tp, a.face + 0.5 * tp);
    c.stroke();
  }

  c.restore();
}
