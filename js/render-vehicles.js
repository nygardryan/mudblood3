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
  const us = (a.nation || a.side) === 'us';
  return sprite('tankhull' + a.type + (us ? 'u' : 'e'),
    TANK_SPR, TANK_SPR, TANK_SPR_A, TANK_SPR_A, (c) => paintTankHull(c, a));
}

function tankTurretSprite(a) {
  const us = (a.nation || a.side) === 'us';
  return sprite('tankturret' + a.type + (us ? 'u' : 'e'),
    TANK_SPR, TANK_SPR, TANK_SPR_A, TANK_SPR_A, (c) => paintTankTurret(c, a));
}

function paintTankHull(c, a) {
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
    c.fillStyle = heavy ? '#3a3a34' : '#44443b';
    c.fillRect(-4, -5, 28, 10);
    c.strokeStyle = '#2b2b25'; c.lineWidth = 1.2;
    c.strokeRect(-4, -5, 28, 10);
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(-4, -5, 28, 1.6);
    c.fillStyle = '#4c4c43';
    c.fillRect(20, -3, 18, 6);
    c.fillStyle = '#26261f'; c.fillRect(37, -3.4, 2.4, 6.8);
  }
}

// turret at canonical bearing (barrel along +x); the blit applies a.turret
function paintTankTurret(c, a) {
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

function drawTank(a) {
  const us = (a.nation || a.side) === 'us';
  const c = ctx;
  const heavy = !!a.t.heavy;
  // shadow (screen-fixed)
  c.save();
  c.translate(a.x, a.y);
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath(); c.ellipse(0, 4, heavy ? 30 : 26, heavy ? 21 : 18, 0, 0, 7); c.fill();
  c.restore();
  // hull, then turret — each a rigid rotation about the centre
  const hullRot = vehicleHullAngle(a) - vehicleHomeFace(a);
  blitSprite(c, tankHullSprite(a), a.x, a.y, hullRot, 1);
  if (!a.t.casemate) blitSprite(c, tankTurretSprite(a), a.x, a.y, a.turret, 1);

  if (a.hp < a.maxhp) {
    const f = clamp(a.hp / a.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(a.x - 22, a.y - 26, 44, 4);
    ctx.fillStyle = us ? '#7ec850' : '#c0562e';
    ctx.fillRect(a.x - 22, a.y - 26, 44 * f, 4);
  }

  // crew veterancy chevrons
  if (us && a.rank > 0) {
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 1;
    let sx = a.x - (a.rank * 5 - 2) / 2;
    const sy = a.y - 30;
    for (let i = 0; i < a.rank; i++) {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 1.5, sy - 2.5);
      ctx.lineTo(sx + 3, sy);
      ctx.stroke();
      sx += 5;
    }
  }

  if (us && G.selected.includes(a)) {
    drawUnitWeaponRange(a, { alpha: 0.3, bearing: a.turret });
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(a.x, a.y, 30, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    if (G.selected.length === 1) {
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.textAlign = 'center';
      const label = RANKS[a.rank].name + ' ' + a.t.name.toUpperCase() + ' \u2014 ' + a.xp + ' KILLS';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(label, a.x + 1, a.y + 41);
      ctx.fillStyle = '#ffe98a';
      ctx.fillText(label, a.x, a.y + 40);
    }
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
  const us = (a.nation || a.side) === 'us';
  return sprite('jeephull' + a.type + (us ? 'u' : 'e'),
    JEEP_SPR, JEEP_SPR, JEEP_SPR_A, JEEP_SPR_A, (c) => paintJeepHull(c, a));
}

function jeepGunSprite(a) {
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

  if (a.hp < a.maxhp) {
    const f = clamp(a.hp / a.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(a.x - 11, a.y - 19, 22, 3);
    ctx.fillStyle = us ? '#7ec850' : '#c0562e';
    ctx.fillRect(a.x - 11, a.y - 19, 22 * f, 3);
  }

  // crew chevrons / selection for our side
  if (us && a.rank > 0) {
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 1;
    let sx = a.x - (a.rank * 5 - 2) / 2;
    const sy = a.y - 23;
    for (let i = 0; i < a.rank; i++) {
      ctx.beginPath();
      ctx.moveTo(sx, sy); ctx.lineTo(sx + 1.5, sy - 2.5); ctx.lineTo(sx + 3, sy);
      ctx.stroke();
      sx += 5;
    }
  }
  if (us && G.selected.includes(a)) {
    drawUnitWeaponRange(a);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(a.x, a.y, 20, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    if (G.selected.length === 1) {
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.textAlign = 'center';
      const label = RANKS[a.rank].name + ' ' + a.t.name.toUpperCase() + ' \u2014 ' + a.xp + ' KILLS';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(label, a.x + 1, a.y + 31);
      ctx.fillStyle = '#ffe98a';
      ctx.fillText(label, a.x, a.y + 30);
    }
  }
}

function stampHalftrackWreck(a) {
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

function drawLandingCraft(c) {
  const ctx2 = ctx;
  ctx2.save();
  ctx2.translate(c.x, c.y);
  // shadow
  ctx2.fillStyle = 'rgba(0,0,0,0.22)';
  ctx2.beginPath(); ctx2.ellipse(0, 4, c.w / 2 - 4, c.h / 2 - 2, 0, 0, 7); ctx2.fill();
  // hull
  ctx2.fillStyle = '#5a5e52';
  ctx2.beginPath();
  ctx2.moveTo(-c.w / 2 + 4, -c.h / 2 + 2);
  ctx2.lineTo(c.w / 2 - 4, -c.h / 2 + 2);
  ctx2.lineTo(c.w / 2 - 2, c.h / 2 - 4);
  ctx2.lineTo(0, c.h / 2 + 2);
  ctx2.lineTo(-c.w / 2 + 2, c.h / 2 - 4);
  ctx2.closePath();
  ctx2.fill();
  ctx2.strokeStyle = '#3a3e36';
  ctx2.lineWidth = 1.2;
  ctx2.stroke();
  // deck well
  ctx2.fillStyle = '#6a6e60';
  ctx2.fillRect(-c.w / 2 + 10, -c.h / 2 + 6, c.w - 20, c.h - 16);
  // ramp (closed when waiting/approach; drops during ramp/done)
  const rampOpen = c.state === 'ramp' ? c.rampT : (c.state === 'done' ? 1 : 0);
  ctx2.save();
  ctx2.translate(0, c.h / 2 - 2);
  ctx2.rotate(rampOpen * 1.15);
  ctx2.fillStyle = '#7a7e70';
  ctx2.fillRect(-14, 0, 28, 16);
  ctx2.strokeStyle = '#4a4e46';
  ctx2.strokeRect(-14, 0, 28, 16);
  ctx2.restore();
  // bow gunwales
  ctx2.fillStyle = '#4a4e46';
  ctx2.fillRect(-c.w / 2 + 6, -c.h / 2 + 4, 4, c.h - 12);
  ctx2.fillRect(c.w / 2 - 10, -c.h / 2 + 4, 4, c.h - 12);
  ctx2.restore();
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

