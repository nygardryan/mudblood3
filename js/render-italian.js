/* Trenchworks: WW2 — Regio Esercito soldier renderer.
   A self-contained painter for the 'it' roster: M33 steel helmets in grigio-verde,
   Carcano carbines, plumed Bersaglieri, bustina-capped officers, Breda and Fiat
   machine guns, Brixia and 81mm mortars, the Lanciafiamme, and rimless-helmeted
   Folgore paratroopers. Dispatched from paintSoldierBody (render-soldier.js)
   whenever a.nation === 'it'.
   Part of a set of plain scripts sharing one global scope; load order in index.html. */
'use strict';

const IT_HELMET = '#6f7150';     // M33 grigio-verde steel
const IT_HELMET_DK = '#4e5036';
const IT_HELMET_LT = '#828463';
const IT_WOOD = '#6a5334';       // Carcano furniture
const IT_STEEL = '#2b2a22';
const IT_BLADE = '#c2c6cc';
const IT_BRASS = '#b09838';
const IT_PLUME = '#221f18';      // Bersaglieri capercaillie feathers

// ---- weapons -------------------------------------------------------------

// Carcano M91 carbine: a short bolt rifle. Folding bayonet when `bayonet`.
function drawCarcano(c, fx, fy, gunLen, bayonet) {
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const px = -fy, py = fx;
  // barrel
  c.strokeStyle = IT_STEEL;
  c.lineWidth = 2.1;
  c.beginPath(); c.moveTo(fx * 2, fy * 2); c.lineTo(tipX, tipY); c.stroke();
  // wooden stock over most of the length
  c.strokeStyle = IT_WOOD;
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(fx * 0.8 - px * 2.2, fy * 0.8 + py * 2.2);
  c.lineTo(fx * (gunLen * 0.66), fy * (gunLen * 0.66));
  c.stroke();
  // bolt handle jutting to the side
  c.strokeStyle = '#3a3830';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(fx * 3.6 + px * 0.4, fy * 3.6 + py * 0.4);
  c.lineTo(fx * 3.2 + px * 2.2, fy * 3.2 + py * 2.2);
  c.stroke();
  if (bayonet) {
    const bx = fx * (gunLen + 4.5), by = fy * (gunLen + 4.5);
    c.strokeStyle = IT_BLADE;
    c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(tipX, tipY); c.lineTo(bx, by); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(tipX, tipY); c.lineTo(bx, by); c.stroke();
  }
}

// scoped Carcano for the cecchino
function drawCarcanoSniper(c, fx, fy, gunLen, face) {
  drawCarcano(c, fx, fy, gunLen, false);
  const px = -fy, py = fx;
  const sX = fx * (gunLen * 0.44) - px * 1.7, sY = fy * (gunLen * 0.44) - py * 1.7;
  c.strokeStyle = '#1c1c16';
  c.lineWidth = 2.1;
  c.beginPath();
  c.moveTo(sX - fx * 2.3, sY - fy * 2.3);
  c.lineTo(sX + fx * 2.3, sY + fy * 2.3);
  c.stroke();
  c.fillStyle = '#0e0e0a';
  c.beginPath(); c.arc(sX + fx * 2.3, sY + fy * 2.3, 0.9, 0, 7); c.fill();
}

// close-assault shotgun (Bersagliere): pump forend, magazine tube, wide choke.
// The forend slides back on the shot, read from shotgunBlastT.
function drawItShotgun(c, fx, fy, gunLen, blastT) {
  const px = -fy, py = fx;
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const pumpOff = (blastT > 0 ? clamp(blastT / 0.12, 0, 1) : 0) * 1.4;
  // barrel
  c.strokeStyle = '#26261e';
  c.lineWidth = 3.2;
  c.beginPath(); c.moveTo(fx * 2, fy * 2); c.lineTo(tipX, tipY); c.stroke();
  // wooden stock at the shoulder
  c.strokeStyle = '#4a3f2e';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(fx * 1.5 - px * 2.6, fy * 1.5 + py * 2.6);
  c.lineTo(fx * 1.5 + px * 2.2, fy * 1.5 - py * 2.2);
  c.stroke();
  // magazine tube slung under the barrel
  c.strokeStyle = '#3a3830';
  c.lineWidth = 1.7;
  c.beginPath();
  c.moveTo(fx * 2.5 + px * 1.5, fy * 2.5 - py * 1.5);
  c.lineTo(fx * (gunLen - 1.2) + px * 1.5, fy * (gunLen - 1.2) - py * 1.5);
  c.stroke();
  // pump forend, slides back on recoil
  const fX = fx * (gunLen * 0.4 - pumpOff), fY = fy * (gunLen * 0.4 - pumpOff);
  c.fillStyle = '#5a4a38';
  c.beginPath();
  c.moveTo(fX - px * 2, fY + py * 2);
  c.lineTo(fX + fx * 3.4, fY + fy * 3.4);
  c.lineTo(fX + px * 2, fY - py * 2);
  c.lineTo(fX - fx * 3.4, fY - fy * 3.4);
  c.closePath(); c.fill();
  c.strokeStyle = '#3a3028';
  c.lineWidth = 0.8;
  c.stroke();
  // wide choke at the muzzle
  c.fillStyle = '#22221a';
  c.beginPath(); c.arc(tipX, tipY, 1.5, 0, 7); c.fill();
}

// Beretta MAB 38: compact SMG, perforated jacket, wooden stock, bottom box mag
function drawMab(c, fx, fy, gunLen, face) {
  const px = -fy, py = fx;
  const tipX = fx * gunLen, tipY = fy * gunLen;
  c.strokeStyle = '#26261e';
  c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(fx * 2, fy * 2); c.lineTo(tipX, tipY); c.stroke();
  // perforated barrel jacket
  c.fillStyle = '#3a3830';
  for (let tt = 0.58; tt <= 0.92; tt += 0.11) {
    c.beginPath(); c.arc(fx * (gunLen * tt), fy * (gunLen * tt), 0.5, 0, 7); c.fill();
  }
  // wooden stock behind the grip
  c.strokeStyle = IT_WOOD;
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(fx * 0.6 - px * 2.4, fy * 0.6 + py * 2.4);
  c.lineTo(fx * 2, fy * 2);
  c.stroke();
  // straight box magazine hanging under the receiver
  const mX = fx * (gunLen * 0.36), mY = fy * (gunLen * 0.36);
  c.strokeStyle = '#2a2a1e';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(mX, mY);
  c.lineTo(mX + px * 3.4 + fx * 0.4, mY + py * 3.4 + fy * 0.4);
  c.stroke();
}

// Breda 30 light machine gun: fixed side magazine on the right, bipod
function drawBreda(c, fx, fy, gunLen, face) {
  const px = -fy, py = fx;
  const tipX = fx * gunLen, tipY = fy * gunLen;
  c.strokeStyle = '#26261e';
  c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(fx * 2, fy * 2); c.lineTo(tipX, tipY); c.stroke();
  // finned receiver
  c.strokeStyle = '#3a3830';
  c.lineWidth = 0.8;
  for (let tt = 0.24; tt <= 0.5; tt += 0.08) {
    const sx = fx * (gunLen * tt), sy = fy * (gunLen * tt);
    c.beginPath();
    c.moveTo(sx - px * 1.5, sy - py * 1.5);
    c.lineTo(sx + px * 1.5, sy + py * 1.5);
    c.stroke();
  }
  // the distinctive fixed magazine folded out to the right side
  const mX = fx * (gunLen * 0.4) + px * 2.4, mY = fy * (gunLen * 0.4) + py * 2.4;
  c.save();
  c.translate(mX, mY);
  c.rotate(face);
  c.fillStyle = '#3a3a2c';
  c.fillRect(-4, -1.1, 8, 2.2);
  c.strokeStyle = '#22221a';
  c.lineWidth = 0.6;
  c.strokeRect(-4, -1.1, 8, 2.2);
  c.restore();
  // wooden stock
  c.strokeStyle = IT_WOOD;
  c.lineWidth = 2.1;
  c.beginPath();
  c.moveTo(fx * 1 - px * 2.2, fy * 1 + py * 2.2);
  c.lineTo(fx * 2, fy * 2);
  c.stroke();
  // bipod at the muzzle
  c.strokeStyle = '#26261e';
  c.lineWidth = 1.1;
  for (const s of [-0.7, 0.7]) {
    c.beginPath();
    c.moveTo(fx * (gunLen - 1), fy * (gunLen - 1));
    c.lineTo(fx * (gunLen + 1) + Math.cos(face + s + 0.45) * 4, fy * (gunLen + 1) + Math.sin(face + s + 0.45) * 4);
    c.stroke();
  }
}

// Fiat-Revelli M35: water-cooled jacket, side ammo box, forward tripod
function drawFiatHmg(c, fx, fy, gunLen, face) {
  const px = -fy, py = fx;
  const tipX = fx * gunLen, tipY = fy * gunLen;
  // fat water jacket
  c.strokeStyle = '#33342a';
  c.lineWidth = 3.4;
  c.beginPath(); c.moveTo(fx * 2, fy * 2); c.lineTo(fx * (gunLen * 0.82), fy * (gunLen * 0.82)); c.stroke();
  c.strokeStyle = '#26261e';
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(fx * (gunLen * 0.8), fy * (gunLen * 0.8)); c.lineTo(tipX, tipY); c.stroke();
  // jacket seams
  c.strokeStyle = 'rgba(90,92,74,0.5)';
  c.lineWidth = 0.7;
  for (let tt = 0.2; tt <= 0.72; tt += 0.1) {
    const sx = fx * (gunLen * tt), sy = fy * (gunLen * tt);
    c.beginPath();
    c.moveTo(sx - px * 1.9, sy - py * 1.9);
    c.lineTo(sx + px * 1.9, sy + py * 1.9);
    c.stroke();
  }
  // side ammo box
  const fX = fx * (gunLen * 0.36) + px * 3, fY = fy * (gunLen * 0.36) + py * 3;
  c.save();
  c.translate(fX, fY);
  c.rotate(face);
  c.fillStyle = '#4a4a38';
  c.fillRect(-3, -1.6, 6, 3.2);
  c.strokeStyle = '#22221a';
  c.lineWidth = 0.6;
  c.strokeRect(-3, -1.6, 6, 3.2);
  c.restore();
  // spade grips at the rear
  c.strokeStyle = '#4a3f32';
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(fx * 1 - px * 2.4, fy * 1 + py * 2.4);
  c.lineTo(fx * 1 + px * 2.4, fy * 1 - py * 2.4);
  c.stroke();
  // forward tripod
  c.strokeStyle = '#2b2a22';
  c.lineWidth = 1.4;
  for (const s of [-0.85, 0, 0.85]) {
    c.beginPath();
    c.moveTo(fx * (gunLen - 2), fy * (gunLen - 2));
    c.lineTo(fx * (gunLen + 1) + Math.cos(face + s + 0.5) * 5, fy * (gunLen + 1) + Math.sin(face + s + 0.5) * 5);
    c.stroke();
  }
}

// Lanciafiamme wand + pilot flame (mirrors the M2/Type100 wand form)
function drawItFlamer(c, fx, fy, gunLen, face, lit) {
  const tipX = fx * gunLen, tipY = fy * gunLen;
  c.strokeStyle = '#3a3830';
  c.lineWidth = 3.2;
  c.beginPath(); c.moveTo(fx * 2, fy * 2); c.lineTo(tipX, tipY); c.stroke();
  c.strokeStyle = '#26261e';
  c.lineWidth = 1.3;
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
  c.moveTo(tipX - fy * 2.1, tipY + fx * 2.1);
  c.lineTo(tipX + fx * 1.5, tipY + fy * 1.5);
  c.lineTo(tipX + fy * 2.1, tipY - fx * 2.1);
  c.stroke();
  // fuel hose to the pack
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

// twin fuel tanks for the flamethrower
function drawItFlamerTanks(c) {
  const tankX = -6.2;
  for (const [ty, fill] of [[-2.2, '#5a5c3a'], [2.8, '#3a3c26']]) {
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

// Brixia Model 35: a stubby light mortar braced by the crouching man's foot
function drawBrixiaTube(c, fx, fy, fireT) {
  const bx = -3.5, by = 4.5;
  c.save();
  c.translate(bx, by);
  c.rotate(-0.6);
  c.fillStyle = '#3a3830';
  c.beginPath(); c.ellipse(0, 3.2, 3, 1.4, 0, 0, 7); c.fill();
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

// Mortaio da 81 on a bipod, planted beside the crew
function drawMortaioTube(c, fireT) {
  c.save();
  c.translate(-4.2, 3);
  c.rotate(-0.7);
  c.fillStyle = '#3a3830';
  c.beginPath(); c.ellipse(0, 5, 4, 1.7, 0, 0, 7); c.fill();
  c.fillStyle = '#4a4a40';
  c.fillRect(-1.7, -8, 3.4, 13);
  c.strokeStyle = '#26261e';
  c.lineWidth = 0.8;
  c.strokeRect(-1.7, -8, 3.4, 13);
  c.fillStyle = '#2a2a22';
  c.fillRect(-1.7, -8.6, 3.4, 1.3);
  c.strokeStyle = '#2b2a22';
  c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(0, -3); c.lineTo(-4.5, 6); c.moveTo(0, -3); c.lineTo(4.5, 6); c.stroke();
  if (fireT > 0) {
    c.fillStyle = '#ffe08a';
    c.beginPath(); c.arc(0, -9, 3 * clamp(fireT / 0.18, 0, 1), 0, 7); c.fill();
  }
  c.restore();
}

// ---- headgear ------------------------------------------------------------

// M33 helmet: rounded steel dome with a small forward brim
function drawM33Helmet(c, fx, fy, badge) {
  c.fillStyle = IT_HELMET;
  c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = 1;
  c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.stroke();
  // subtle crown highlight
  c.strokeStyle = IT_HELMET_LT;
  c.lineWidth = 0.7;
  c.beginPath(); c.arc(0, -1, 3.3, Math.PI * 1.05, Math.PI * 1.7); c.stroke();
  // small forward brim toward facing
  c.fillStyle = IT_HELMET_DK;
  c.beginPath();
  c.ellipse(fx * 3.6, -1 + fy * 3.6, 2, 1.1, Math.atan2(fy, fx), 0, 7);
  c.fill();
  if (badge) {
    // painted regimental patch, front-center
    c.fillStyle = '#7a2a24';
    c.beginPath(); c.arc(fx * 2.2, -1 + fy * 2.2, 0.9, 0, 7); c.fill();
  }
}

// Bersaglieri: M33 helmet with a cascade of black capercaillie feathers off the
// right side — the piumetto, their unmistakable mark
function drawBersagliereHelmet(c, fx, fy) {
  drawM33Helmet(c, fx, fy, false);
  const px = -fy, py = fx;   // to the man's right
  const rootX = px * 3.4, rootY = -1 + py * 3.4;
  c.strokeStyle = IT_PLUME;
  c.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    const spread = (i - 2) * 0.26;
    const len = 6.5 - Math.abs(i - 2) * 0.7;
    const ang = Math.atan2(py, px) + 0.5 + spread;   // sweep back and out
    c.beginPath();
    c.moveTo(rootX, rootY);
    c.quadraticCurveTo(
      rootX + Math.cos(ang) * len * 0.6 - fx * 1.4,
      rootY + Math.sin(ang) * len * 0.6 - fy * 1.4,
      rootX + Math.cos(ang) * len - fx * 2.4,
      rootY + Math.sin(ang) * len - fy * 2.4);
    c.stroke();
  }
  // a glossy fleck on the plume base
  c.fillStyle = 'rgba(120,118,104,0.5)';
  c.beginPath(); c.arc(rootX, rootY, 0.9, 0, 7); c.fill();
}

// officer's bustina — a soft side cap
function drawBustina(c, fx, fy) {
  c.fillStyle = '#5f6142';
  c.beginPath();
  c.ellipse(0, -1, 4.2, 3.2, 0, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = 0.9;
  c.beginPath(); c.ellipse(0, -1, 4.2, 3.2, 0, 0, 7); c.stroke();
  // fold crease across the cap
  c.strokeStyle = IT_HELMET_DK;
  c.lineWidth = 0.8;
  const px = -fy, py = fx;
  c.beginPath();
  c.moveTo(-px * 3.4, -1 - py * 3.4);
  c.lineTo(px * 3.4, -1 + py * 3.4);
  c.stroke();
  // gold rank pip toward the front
  c.fillStyle = '#d8c24a';
  c.beginPath(); c.arc(fx * 2.4, -1 + fy * 2.4, 0.8, 0, 7); c.fill();
}

// Folgore paratrooper: a rimless dark bowl helmet
function drawFolgoreHelmet(c, fx, fy) {
  c.fillStyle = '#565a40';
  c.beginPath(); c.arc(0, -1, 4, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.4)';
  c.lineWidth = 1.1;
  c.beginPath(); c.arc(0, -1, 4, 0, 7); c.stroke();
  // chin-strap band
  c.strokeStyle = '#33342a';
  c.lineWidth = 0.8;
  c.beginPath(); c.arc(0, -1, 3.4, 0.3, 2.84); c.stroke();
  c.strokeStyle = IT_HELMET_LT;
  c.lineWidth = 0.6;
  c.beginPath(); c.arc(0, -1, 3.1, Math.PI * 1.1, Math.PI * 1.6); c.stroke();
}

// ---- kit -----------------------------------------------------------------

// standard grigio-verde webbing: cross belt and front pouches
function drawItWebbing(c, fx, fy, face) {
  c.strokeStyle = '#4a3e28';
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(-fy * 4.4 - fx * 1, fx * 4.4 - fy * 1);
  c.lineTo(fy * 4.4 - fx * 1, -fx * 4.4 - fy * 1);
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

// ---- main painter --------------------------------------------------------

function paintItalianSoldier(c, a) {
  const type = a.type;
  const t = a.t;
  const gunLen = t.gun;
  const fx = Math.cos(a.face), fy = Math.sin(a.face);
  const isBreda = type === 'ibreda';
  const isFiat = type === 'ifiat';
  const isMab = type === 'imab';
  const isGren = type === 'igren';
  const isOfficer = type === 'iuff';
  const isBersa = type === 'ibersa';
  const isFolgore = type === 'ifolgore';
  const isFlamer = type === 'iflame';
  const isTube = type === 'ibrixia' || type === 'imortaio';
  c.save();

  // shadow
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath(); c.ellipse(0, 3, 8, 4, 0, 0, 7); c.fill();

  // ---- weapon
  if (isBersa) {
    drawItShotgun(c, fx, fy, gunLen, a.shotgunBlastT || 0);
  } else if (type === 'irifle' || isFolgore || isGren) {
    drawCarcano(c, fx, fy, gunLen, type === 'irifle');   // only the line rifle fixes a bayonet
  } else if (type === 'icecc') {
    drawCarcanoSniper(c, fx, fy, gunLen, a.face);
  } else if (isBreda) {
    drawBreda(c, fx, fy, gunLen, a.face);
  } else if (isFiat) {
    drawFiatHmg(c, fx, fy, gunLen, a.face);
  } else if (isMab) {
    drawMab(c, fx, fy, gunLen, a.face);
  } else if (isFlamer) {
    drawItFlamer(c, fx, fy, gunLen, a.face, a.flameT > 0);
  } else if (isOfficer) {
    // Beretta pistol held forward
    c.strokeStyle = IT_STEEL;
    c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(fx * 2, fy * 2); c.lineTo(fx * gunLen, fy * gunLen); c.stroke();
  } else if (isTube) {
    // sidearm carbine — the tube itself is drawn beside the feet as kit
    c.strokeStyle = IT_STEEL;
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(fx * 2, fy * 2); c.lineTo(fx * gunLen, fy * gunLen); c.stroke();
  }

  // ---- body
  const bodyW = isBreda || isFiat ? 7.2 : isFlamer ? 7 : 6.6;
  const bodyH = isBreda || isFiat ? 5 : isFlamer ? 5.3 : 5;
  c.fillStyle = t.color;
  c.beginPath(); c.ellipse(0, 0, bodyW, bodyH, a.face, 0, 7); c.fill();
  c.strokeStyle = 'rgba(14,15,11,0.6)';
  c.lineWidth = 1.1;
  c.stroke();

  // ---- torso kit
  if (isFlamer) {
    c.fillStyle = '#4a4830';
    c.beginPath(); c.ellipse(fx * 1.3, fy * 1.3, 6, 5, a.face, 0, 7); c.fill();
    c.strokeStyle = '#2a2a1e';
    c.lineWidth = 1;
    c.stroke();
    drawItFlamerTanks(c);
  } else if (isOfficer) {
    // sash across the chest and a holstered pistol at the hip
    c.strokeStyle = '#c8b45a';
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(-fy * 4.6 - fx * 1.4, fx * 4.6 - fy * 1.4);
    c.lineTo(fy * 4.6 + fx * 1.4, -fx * 4.6 + fy * 1.4);
    c.stroke();
    c.fillStyle = '#3a3222';
    c.beginPath(); c.ellipse(-fy * 4.4, fx * 4.4, 1.5, 2.1, a.face, 0, 7); c.fill();
    // map/binocular case at the front
    c.fillStyle = '#4a4028';
    c.fillRect(-1.2, 3.4, 2.4, 2.2);
  } else if (isBersa) {
    // light assault order — a single bandolier
    c.strokeStyle = '#4a3e28';
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(-fy * 4.4 - fx * 1, fx * 4.4 - fy * 1);
    c.lineTo(fy * 4.4 - fx * 1, -fx * 4.4 - fy * 1);
    c.stroke();
    // a slung ammo bandolier the other way
    c.strokeStyle = '#3a3222';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-fy * 4.2 + fx * 1.4, fx * 4.2 + fy * 1.4);
    c.lineTo(fy * 4.2 + fx * 1.4, -fx * 4.2 + fy * 1.4);
    c.stroke();
  } else if (type === 'ibrixia') {
    drawItWebbing(c, fx, fy, a.face);
    drawBrixiaTube(c, fx, fy, a.mortarFireT || 0);
  } else if (type === 'imortaio') {
    drawItWebbing(c, fx, fy, a.face);
    drawMortaioTube(c, a.mortarFireT || 0);
  } else if (isGren || isFolgore) {
    drawItWebbing(c, fx, fy, a.face);
    // SRCM "red devil" frags clipped to the chest harness
    for (const [gx, gy, s] of [[-fy * 4.4, fx * 4.4, 0.8], [fy * 3.8, -fx * 3.8, 0.75]]) {
      drawFragGrenade(c, gx, gy, s, { rot: a.face });
    }
  } else {
    drawItWebbing(c, fx, fy, a.face);
  }

  // ---- headgear
  if (isOfficer) drawBustina(c, fx, fy);
  else if (isBersa) drawBersagliereHelmet(c, fx, fy);
  else if (isFolgore) drawFolgoreHelmet(c, fx, fy);
  else if (type === 'icecc') {
    drawM33Helmet(c, fx, fy, false);
    // foliage loops tucked into the helmet
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
    drawM33Helmet(c, fx, fy, true);
  }

  // ---- grenadier wind-up: cocked arm and a frag in hand
  if (a.grenThrowT > 0) {
    const gt = clamp(a.grenThrowT / 0.35, 0, 1);
    const arm = a.face - 0.55 + (1 - gt) * 0.35;
    const ax = Math.cos(arm) * 5.5, ay = Math.sin(arm) * 5.5;
    c.strokeStyle = t.color;
    c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(ax, ay); c.stroke();
    drawFragGrenade(c, ax + Math.cos(arm) * 2.2, ay + Math.sin(arm) * 2.2, 0.95, { rot: arm - 0.4 });
  }

  c.restore();
}
