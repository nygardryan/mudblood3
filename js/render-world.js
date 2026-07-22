/* Trenchworks: WW2 — vehicle, emplacement & defense drawing.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

function drawTank(a) {
  const us = (a.nation || a.side) === 'us';
  const c = ctx;
  const home = vehicleHomeFace(a);
  const hullAng = vehicleHullAngle(a);
  const hullRot = hullAng - home;
  const heavy = !!a.t.heavy;
  const casemate = !!a.t.casemate;
  const hw = heavy ? 20 : 17;
  const hh = heavy ? 17 : 14;
  const trackW = heavy ? 9 : 8;
  const trackOff = heavy ? 27 : 24;
  c.save();
  c.translate(a.x, a.y);
  // shadow
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath(); c.ellipse(0, 4, heavy ? 30 : 26, heavy ? 21 : 18, 0, 0, 7); c.fill();
  if (a.moveTo) c.rotate(hullRot);
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
  } else {
    // turret — compensate for hull rotation so barrel stays at world bearing a.turret
    c.rotate(a.turret - hullAng + home);
    const tr = heavy ? 12 : 10;
    c.fillStyle = us ? '#54634a' : (heavy ? '#353530' : '#4c4c43');
    c.fillRect(6, -2.5, heavy ? 28 : 24, heavy ? 6 : 5);          // barrel
    c.fillStyle = '#26261f';
    c.fillRect(heavy ? 32 : 28, -3, 2.6, heavy ? 7 : 6);          // muzzle brake
    c.fillStyle = us ? '#5b6b50' : (heavy ? '#3a3a34' : '#525249');
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
  c.restore();

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

function stampATGunWreck(a) {
  gctx.save();
  gctx.translate(a.x, a.y);
  gctx.rotate(rand(-0.6, 0.6));
  gctx.fillStyle = '#3a4034';
  gctx.beginPath();
  gctx.moveTo(-10, -4); gctx.lineTo(8, -8); gctx.lineTo(10, 2); gctx.lineTo(-8, 4);
  gctx.closePath(); gctx.fill();
  gctx.strokeStyle = '#2a2820';
  gctx.lineWidth = 4;
  gctx.beginPath(); gctx.moveTo(2, 0); gctx.quadraticCurveTo(12, -6, 18, -14); gctx.stroke();
  gctx.fillStyle = '#211f1a';
  gctx.beginPath(); gctx.ellipse(-9, 5, 3.5, 5, 0.3, 0, 7); gctx.fill();
  gctx.beginPath(); gctx.ellipse(9, 4, 3.5, 5, -0.2, 0, 7); gctx.fill();
  gctx.strokeStyle = '#2f3a29';
  gctx.lineWidth = 2.5;
  gctx.beginPath(); gctx.moveTo(-2, 4); gctx.lineTo(-12, 14); gctx.stroke();
  gctx.beginPath(); gctx.moveTo(2, 4); gctx.lineTo(11, 13); gctx.stroke();
  gctx.restore();
}

// burnt-out crawler: scorched hull between the tracks — one thrown clear —
// with the launch rail blown off its turntable and folded across the wreck
function stampV2Wreck(a) {
  gctx.save();
  gctx.translate(a.x, a.y);
  gctx.rotate(rand(-0.25, 0.25));
  gctx.fillStyle = 'rgba(20,17,12,0.4)';
  gctx.beginPath(); gctx.ellipse(0, 2, 27, 20, 0, 0, 7); gctx.fill();
  gctx.fillStyle = '#2a2922';
  gctx.fillRect(-19, -20, 8, 40);
  gctx.save();
  gctx.translate(17, 7);
  gctx.rotate(0.5);
  gctx.fillRect(-4, -18, 8, 36);
  gctx.restore();
  // gutted hull, burnt through amidships
  gctx.fillStyle = '#3a382f';
  gctx.beginPath();
  gctx.moveTo(-12, -19); gctx.lineTo(10, -21); gctx.lineTo(13, 14); gctx.lineTo(-9, 20); gctx.lineTo(-14, 4);
  gctx.closePath(); gctx.fill();
  gctx.strokeStyle = '#1c1c16';
  gctx.lineWidth = 1.2;
  gctx.stroke();
  gctx.fillStyle = '#15130f';
  gctx.beginPath(); gctx.ellipse(-1, 0, 6.5, 5, 0.4, 0, 7); gctx.fill();
  // the rail, snapped and folded over the hull
  gctx.strokeStyle = '#615d4c';
  gctx.lineWidth = 2.6;
  gctx.beginPath(); gctx.moveTo(-8, 24); gctx.lineTo(2, 2); gctx.lineTo(22, -10); gctx.stroke();
  gctx.strokeStyle = '#1c1c16';
  gctx.lineWidth = 0.8;
  gctx.beginPath(); gctx.moveTo(-8, 24); gctx.lineTo(2, 2); gctx.lineTo(22, -10); gctx.stroke();
  gctx.restore();
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

function drawJeep(a) {
  const us = (a.nation || a.side) === 'us';
  const c = ctx;
  const home = vehicleHomeFace(a);
  const hullAng = vehicleHullAngle(a);
  const hullRot = hullAng - home;
  c.save();
  c.translate(a.x, a.y);

  c.fillStyle = 'rgba(0,0,0,0.28)';
  c.beginPath(); c.ellipse(0, 4, 12, 15, 0, 0, 7); c.fill();

  c.rotate(hullRot);

  for (const [wx, wy] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) {
    drawJeepWheel(c, wx, wy);
  }

  drawJeepBody(c, a.t.color, us);

  c.rotate(a.face - hullAng + home);
  drawVehicleHMG(c, a.t.gun, us);
  c.fillStyle = us ? '#63804d' : '#5c626c';
  c.beginPath(); c.ellipse(-5.5, 0, 3.6, 4.8, 0, 0, 7); c.fill();
  c.fillStyle = us ? '#4a5a3f' : '#525244';
  c.beginPath(); c.ellipse(-5.5, 0, 3, 4, 0, 0, 7); c.fill();
  c.beginPath(); c.arc(-5.5, -2.8, 2.9, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = 0.85;
  c.beginPath(); c.arc(-5.5, -2.8, 2.9, 0, 7); c.stroke();
  c.restore();

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

function drawATGun(a) {
  const c = ctx;
  const recoil = a.atgunFireT > 0 ? clamp(a.atgunFireT / 0.16, 0, 1) : 0;
  const kick = recoil * 5;
  c.save();
  c.translate(a.x, a.y);

  c.fillStyle = 'rgba(0,0,0,0.28)';
  c.beginPath(); c.ellipse(0, 5, 18, 11, 0, 0, 7); c.fill();

  c.rotate(a.turret + Math.PI / 2);

  c.strokeStyle = '#3d4a34';
  c.lineWidth = 3.2;
  c.beginPath(); c.moveTo(-2.5, 5); c.lineTo(-13, 18); c.stroke();
  c.beginPath(); c.moveTo(2.5, 5); c.lineTo(13, 18); c.stroke();
  c.strokeStyle = '#2e3828';
  c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(-2, 7); c.lineTo(-11, 17); c.stroke();
  c.beginPath(); c.moveTo(2, 7); c.lineTo(11, 17); c.stroke();
  c.fillStyle = '#2f3a29';
  c.fillRect(-14, 16, 6, 4);
  c.fillRect(8, 16, 6, 4);
  c.strokeStyle = '#243020';
  c.lineWidth = 0.8;
  c.strokeRect(-14, 16, 6, 4);
  c.strokeRect(8, 16, 6, 4);
  c.fillStyle = '#4a4038';
  c.fillRect(-12, 19, 1.2, 3);
  c.fillRect(10, 19, 1.2, 3);

  for (const wx of [-10, 10]) {
    c.fillStyle = '#26261e';
    c.beginPath(); c.ellipse(wx, 2, 3.5, 5.5, 0, 0, 7); c.fill();
    c.strokeStyle = '#3a3830';
    c.lineWidth = 1.1;
    c.stroke();
    c.fillStyle = '#4a4038';
    c.beginPath(); c.arc(wx, 2, 2, 0, 7); c.fill();
    c.strokeStyle = '#2a2820';
    c.lineWidth = 0.7;
    for (let i = 0; i < 6; i++) {
      const ang = i * Math.PI / 3;
      c.beginPath();
      c.moveTo(wx, 2);
      c.lineTo(wx + Math.cos(ang) * 2, 2 + Math.sin(ang) * 2);
      c.stroke();
    }
  }

  c.fillStyle = '#5a4a38';
  c.fillRect(8, 6, 6, 4.5);
  c.strokeStyle = '#3a3028';
  c.lineWidth = 0.7;
  c.strokeRect(8, 6, 6, 4.5);
  c.fillStyle = '#c8a858';
  c.fillRect(9.2, 7.2, 1.4, 2.2);
  c.fillRect(11.2, 7.2, 1.4, 2.2);
  c.fillStyle = '#ffd94a';
  c.fillRect(9.5, 8.5, 3.2, 0.9);

  c.fillStyle = a.t.color;
  c.fillRect(-5, 0, 10, 9);
  c.strokeStyle = '#39462f';
  c.lineWidth = 1;
  c.strokeRect(-5, 0, 10, 9);
  c.fillStyle = '#3a4832';
  c.beginPath(); c.arc(0, 4, 2.8, 0, 7); c.fill();

  c.fillStyle = '#54634a';
  c.strokeStyle = '#39462f';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(-12, 0);
  c.lineTo(-4, -7 + kick * 0.3);
  c.lineTo(4, -7 + kick * 0.3);
  c.lineTo(12, 0);
  c.lineTo(12, 3);
  c.lineTo(-12, 3);
  c.closePath();
  c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.10)';
  c.fillRect(-11, -6 + kick * 0.3, 22, 1.6);
  c.fillStyle = '#ffd94a';
  c.fillRect(-2, -4 + kick * 0.3, 4, 1.2);
  c.fillStyle = 'rgba(30,36,22,0.35)';
  for (const [rx, ry] of [[-8, 0.5], [0, -2], [8, 0.5], [-4, 1.5], [4, 1.5]]) {
    c.beginPath(); c.arc(rx, ry + kick * 0.3, 0.55, 0, 7); c.fill();
  }

  const bTop = -24 + kick;
  c.fillStyle = '#3a3830';
  c.fillRect(-2, bTop, 4, 20);
  c.strokeStyle = '#26261e';
  c.lineWidth = 0.8;
  c.strokeRect(-2, bTop, 4, 20);
  c.fillStyle = '#4c5a42';
  c.fillRect(-3, bTop - 1, 6, 4);
  c.fillStyle = '#2a2820';
  c.beginPath(); c.arc(0, bTop + 3, 2.2, 0, 7); c.fill();
  c.fillStyle = '#4a4038';
  c.fillRect(-2.5, bTop - 4, 5, 3.5);
  c.strokeStyle = '#3a3830';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(-2.8, bTop - 2); c.lineTo(-2.8, bTop - 5);
  c.moveTo(2.8, bTop - 2); c.lineTo(2.8, bTop - 5);
  c.stroke();
  if (recoil > 0.2) {
    c.shadowColor = '#ff9040';
    c.shadowBlur = 8;
    c.fillStyle = `rgba(255,200,120,${recoil * 0.85})`;
    c.beginPath(); c.arc(0, bTop - 3, 3.5 * recoil, 0, 7); c.fill();
    c.shadowBlur = 0;
  }

  c.restore();

  const bx = a.x - Math.cos(a.turret) * 12;
  const by = a.y - Math.sin(a.turret) * 12;
  const fx = Math.cos(a.turret), fy = Math.sin(a.turret);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(bx + 1, by + 3, 5, 2.5, a.turret, 0, 7); ctx.fill();
  ctx.fillStyle = a.t.color;
  ctx.beginPath(); ctx.ellipse(bx, by, 4.2, 5.2, a.turret, 0, 7); ctx.fill();
  ctx.strokeStyle = '#4a4a3e';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + fx * 7, by + fy * 7);
  ctx.stroke();
  ctx.fillStyle = '#63804d';
  ctx.beginPath(); ctx.arc(bx - fy * 2.5, by + fx * 2.5 - 1, 3.4, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.arc(bx - fy * 2.5, by + fx * 2.5 - 1, 3.4, 0, 7); ctx.stroke();

  if (a.hp < a.maxhp) {
    const f = clamp(a.hp / a.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(a.x - 14, a.y - 24, 28, 3.5);
    ctx.fillStyle = '#7ec850';
    ctx.fillRect(a.x - 14, a.y - 24, 28 * f, 3.5);
  }

  // crew veterancy chevrons
  if (a.rank > 0) {
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 1;
    let sx = a.x - (a.rank * 5 - 2) / 2;
    const sy = a.y - 28;
    for (let i = 0; i < a.rank; i++) {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 1.5, sy - 2.5);
      ctx.lineTo(sx + 3, sy);
      ctx.stroke();
      sx += 5;
    }
  }

  if (G.selected.includes(a)) {
    drawUnitWeaponRange(a, { alpha: 0.3 });
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(a.x, a.y, 22, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    if (G.selected.length === 1) {
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.textAlign = 'center';
      const label = RANKS[a.rank].name + ' ' + a.t.name.toUpperCase() + ' \u2014 ' + a.xp + ' KILLS';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(label, a.x + 1, a.y + 35);
      ctx.fillStyle = '#ffe98a';
      ctx.fillText(label, a.x, a.y + 34);
    }
  }
}

// 40mm Bofors on a cruciform outrigger base: four staked legs, a pedestal, and
// twin barrels that sit high. Seen from above the tubes are foreshortened —
// they're pointing up at something, not across the field like the 57mm.
function drawAAGun(a) {
  const c = ctx;
  const recoil = a.atgunFireT > 0 ? clamp(a.atgunFireT / 0.16, 0, 1) : 0;
  const kick = recoil * 4;
  c.save();
  c.translate(a.x, a.y);

  c.fillStyle = 'rgba(0,0,0,0.28)';
  c.beginPath(); c.ellipse(0, 5, 18, 12, 0, 0, 7); c.fill();

  // cruciform outriggers stay fixed to the ground; only the mount above rotates
  c.strokeStyle = '#3d4a34';
  c.lineWidth = 3;
  for (const ang of [0.6, 2.54, 3.74, 5.68]) {
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(Math.cos(ang) * 17, Math.sin(ang) * 13);
    c.stroke();
  }
  c.fillStyle = '#2f3a29';
  for (const ang of [0.6, 2.54, 3.74, 5.68]) {
    const fx2 = Math.cos(ang) * 17, fy2 = Math.sin(ang) * 13;
    c.beginPath(); c.ellipse(fx2, fy2, 3.4, 2.6, 0, 0, 7); c.fill();
  }

  c.rotate(a.turret + Math.PI / 2);

  // turntable and pedestal
  c.fillStyle = '#3a4832';
  c.beginPath(); c.arc(0, 0, 9.5, 0, 7); c.fill();
  c.strokeStyle = '#2a3624';
  c.lineWidth = 1;
  c.beginPath(); c.arc(0, 0, 9.5, 0, 7); c.stroke();

  // gunner's seats either side of the mount
  c.fillStyle = '#4a4038';
  c.beginPath(); c.arc(-8, 5, 2.6, 0, 7); c.fill();
  c.beginPath(); c.arc(8, 5, 2.6, 0, 7); c.fill();

  // receiver housing
  c.fillStyle = a.t.color;
  c.fillRect(-6, -2, 12, 10);
  c.strokeStyle = '#39462f';
  c.lineWidth = 1;
  c.strokeRect(-6, -2, 12, 10);
  c.fillStyle = 'rgba(255,255,255,0.10)';
  c.fillRect(-6, -2, 12, 1.6);

  // ammo clips standing in the loader's rack
  c.fillStyle = '#c8a858';
  c.fillRect(-4.5, 6.5, 2, 4);
  c.fillRect(-1, 6.5, 2, 4);
  c.fillRect(2.5, 6.5, 2, 4);

  // twin barrels, elevated: short and stubby from directly overhead
  const bTop = -15 + kick;
  c.fillStyle = '#3a3830';
  c.strokeStyle = '#26261e';
  c.lineWidth = 0.8;
  for (const bxo of [-3.2, 3.2]) {
    c.fillRect(bxo - 1.5, bTop, 3, 16);
    c.strokeRect(bxo - 1.5, bTop, 3, 16);
    c.fillStyle = 'rgba(162,160,142,0.35)'; c.fillRect(bxo - 1.5, bTop, 1, 16);
    // flash hider at the muzzle
    c.fillStyle = '#4a4038';
    c.fillRect(bxo - 2.1, bTop - 2.5, 4.2, 3);
    c.fillStyle = '#3a3830';
  }
  // barrel clamp
  c.fillStyle = '#4c5a42';
  c.fillRect(-6, bTop + 5, 12, 3);

  if (recoil > 0.15) {
    c.shadowColor = '#ff9040';
    c.shadowBlur = 9;
    for (const bxo of [-3.2, 3.2]) {
      c.fillStyle = `rgba(255,210,130,${recoil * 0.9})`;
      c.beginPath(); c.arc(bxo, bTop - 3, 3.2 * recoil, 0, 7); c.fill();
    }
    c.shadowBlur = 0;
  }

  c.restore();

  // loader crouched at the rear of the mount, feeding clips
  const bx = a.x - Math.cos(a.turret) * 13;
  const by = a.y - Math.sin(a.turret) * 13;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(bx + 1, by + 3, 5, 2.5, a.turret, 0, 7); ctx.fill();
  ctx.fillStyle = a.t.color;
  ctx.beginPath(); ctx.ellipse(bx, by, 4.2, 5.2, a.turret, 0, 7); ctx.fill();
  ctx.fillStyle = '#63804d';
  ctx.beginPath(); ctx.arc(bx, by - 1, 3.4, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.arc(bx, by - 1, 3.4, 0, 7); ctx.stroke();

  if (a.hp < a.maxhp) {
    const f = clamp(a.hp / a.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(a.x - 14, a.y - 24, 28, 3.5);
    ctx.fillStyle = '#7ec850';
    ctx.fillRect(a.x - 14, a.y - 24, 28 * f, 3.5);
  }

  if (a.rank > 0) {
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 1;
    let sx = a.x - (a.rank * 5 - 2) / 2;
    const sy = a.y - 28;
    for (let i = 0; i < a.rank; i++) {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 1.5, sy - 2.5);
      ctx.lineTo(sx + 3, sy);
      ctx.stroke();
      sx += 5;
    }
  }

  if (G.selected.includes(a)) {
    drawUnitWeaponRange(a, { alpha: 0.3 });
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(a.x, a.y, 22, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    if (G.selected.length === 1) {
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.textAlign = 'center';
      const label = RANKS[a.rank].name + ' ' + a.t.name.toUpperCase() + ' — ' + a.xp + ' KILLS';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(label, a.x + 1, a.y + 35);
      ctx.fillStyle = '#ffe98a';
      ctx.fillText(label, a.x, a.y + 34);
    }
  }
}

// Tracked rail launcher: a squat armored crawler with a turntable amidships
// carrying the A20 flat on an open lattice rail, blast deflector at the tail.
// The rail trains toward the last firing solution; the round is craned on
// over the few seconds before each launch window, so an empty rail means the
// crew is still reloading.
function drawV2Launcher(a) {
  const c = ctx;
  const fireT = a.v2FireT || 0;
  c.save();
  c.translate(a.x, a.y);

  // shadow
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath(); c.ellipse(0, 6, 24, 18, 0, 0, 7); c.fill();

  // tracks
  c.fillStyle = '#23221c';
  c.fillRect(-19, -22, 8, 44);
  c.fillRect(11, -22, 8, 44);
  c.strokeStyle = '#35342c';
  c.lineWidth = 1;
  for (let ty = -19; ty <= 19; ty += 6) {
    c.beginPath(); c.moveTo(-18, ty); c.lineTo(-12, ty); c.stroke();
    c.beginPath(); c.moveTo(12, ty); c.lineTo(18, ty); c.stroke();
  }

  // armored deck
  c.fillStyle = a.t.color;
  c.beginPath();
  c.moveTo(-12, -21); c.lineTo(12, -21); c.lineTo(14, -10);
  c.lineTo(14, 16); c.lineTo(10, 22); c.lineTo(-10, 22); c.lineTo(-14, 16); c.lineTo(-14, -10);
  c.closePath(); c.fill();
  c.strokeStyle = '#2a2a22';
  c.lineWidth = 1.2;
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.08)';
  c.fillRect(-12, -21, 24, 2.2);
  // engine grille aft, crew hatch forward
  c.strokeStyle = '#33362e';
  c.lineWidth = 1;
  for (let gy2 = -18; gy2 <= -12; gy2 += 3) {
    c.beginPath(); c.moveTo(-9, gy2); c.lineTo(9, gy2); c.stroke();
  }
  c.fillStyle = '#383b32';
  c.beginPath(); c.arc(-8, 16, 3.4, 0, 7); c.fill();
  c.strokeStyle = '#23231c';
  c.stroke();

  // turntable and rail, trained on the firing solution
  c.save();
  c.rotate(a.face != null ? a.face : Math.PI / 2);

  c.fillStyle = '#3a3d33';
  c.beginPath(); c.arc(0, 0, 9, 0, 7); c.fill();
  c.strokeStyle = '#23231c';
  c.lineWidth = 1.2;
  c.stroke();

  // blast deflector at the rail's tail
  c.fillStyle = '#2c2b24';
  c.beginPath();
  c.moveTo(-17, -6); c.lineTo(-22, -8); c.lineTo(-22, 8); c.lineTo(-17, 6);
  c.closePath(); c.fill();
  c.strokeStyle = '#1c1c16';
  c.lineWidth = 1;
  c.stroke();

  // open lattice rail
  c.strokeStyle = '#6a675a';
  c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(-16, -3); c.lineTo(26, -3); c.stroke();
  c.beginPath(); c.moveTo(-16, 3); c.lineTo(26, 3); c.stroke();
  c.strokeStyle = '#4a483e';
  c.lineWidth = 1;
  for (let rx = -14; rx <= 24; rx += 7) {
    c.beginPath(); c.moveTo(rx, -3); c.lineTo(rx, 3); c.stroke();
  }

  // the round on the rail — craned on from the tail as the crew reloads
  const loadP = fireT > 0 ? 0 : (a.v2Cd == null ? 1 : clamp((8 - a.v2Cd) / 3, 0, 1));
  if (loadP > 0) {
    const off = (1 - loadP) * -12;
    c.globalAlpha = 0.35 + loadP * 0.65;
    c.translate(off, 0);
    // tail fins
    c.fillStyle = '#33362c';
    c.beginPath(); c.moveTo(-13, -4); c.lineTo(-18, -7.5); c.lineTo(-13, -1.5); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-13, 4); c.lineTo(-18, 7.5); c.lineTo(-13, 1.5); c.closePath(); c.fill();
    // bare rolled-steel body with an olive service band amidships
    c.fillStyle = '#8f8878';
    c.fillRect(-14, -4.2, 32, 8.4);
    c.fillStyle = 'rgba(30,28,22,0.25)';
    c.fillRect(-14, 0.8, 32, 3.4);
    c.strokeStyle = '#1c1c16';
    c.lineWidth = 1;
    c.strokeRect(-14, -4.2, 32, 8.4);
    c.fillStyle = a.t.color;
    c.fillRect(-2, -4.2, 6, 8.4);
    // nose cone
    c.fillStyle = '#23231c';
    c.beginPath(); c.moveTo(18, -4.2); c.lineTo(28, 0); c.lineTo(18, 4.2); c.closePath(); c.fill();
    c.translate(-off, 0);
    c.globalAlpha = 1;
  }

  // through the launch window the flame jet hammers back off the deflector;
  // the round itself is airborne and drawn by drawV2RocketInFlight
  if (fireT > 0) {
    const k = clamp(fireT / 1.1, 0, 1);
    c.shadowColor = '#ff9040';
    c.shadowBlur = 14;
    c.fillStyle = `rgba(255,220,140,${0.8 * k})`;
    c.beginPath();
    c.moveTo(4, -3);
    c.lineTo(-24 - k * 10, -7 - k * 4);
    c.lineTo(-20 - k * 8, 0);
    c.lineTo(-24 - k * 10, 7 + k * 4);
    c.lineTo(4, 3);
    c.closePath(); c.fill();
    c.fillStyle = `rgba(255,130,50,${0.45 * k})`;
    c.beginPath(); c.arc(-6, 0, 8 + k * 8, 0, 7); c.fill();
    c.shadowBlur = 0;
  }

  c.restore();
  c.restore();

  if (a.hp < a.maxhp) {
    const f = clamp(a.hp / a.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(a.x - 22, a.y - 34, 44, 4.5);
    ctx.fillStyle = f > 0.5 ? '#c0562e' : '#8a2a20';
    ctx.fillRect(a.x - 22, a.y - 34, 44 * f, 4.5);
  }
}

// the V2 warhead in flight, in three acts: a boost climb off the rail under a
// hard flame, a high glinting coast leg crossing the map, then a dark
// terminal dive that swells and heats up as it comes down on the marker
function drawV2RocketInFlight(s) {
  const c = ctx;
  const st = v2FlightState(s);

  // ground shadow only near the ground, sharpening as it closes
  if (st.altN < 0.85) {
    const g = 1 - st.altN;
    c.fillStyle = `rgba(0,0,0,${0.06 + g * 0.14})`;
    c.beginPath(); c.ellipse(st.gx, st.gy, 2.5 + g * 4, 1.8 + g * 2, 0, 0, 7); c.fill();
  }

  // at cruise altitude it's barely a speck — a glint riding its contrail
  if (st.phase === 'coast') {
    c.fillStyle = 'rgba(240,236,220,0.9)';
    c.beginPath(); c.arc(st.x, st.y, 1.6, 0, 7); c.fill();
    c.fillStyle = 'rgba(240,236,220,0.35)';
    c.beginPath(); c.arc(st.x, st.y, 3.2, 0, 7); c.fill();
    return;
  }

  c.save();
  c.translate(st.x, st.y);
  c.rotate(st.heading);
  c.scale(st.scale, st.scale);

  const dive = st.phase === 'dive';
  if (dive) {
    // motor spent, skin heating up on the way down
    c.shadowColor = '#ff6a30';
    c.shadowBlur = 8;
    c.fillStyle = 'rgba(255,110,50,0.55)';
    c.beginPath(); c.arc(9, 0, 3, 0, 7); c.fill();
    c.shadowBlur = 0;
  } else {
    // motor burning: long ragged flame off the tail
    c.shadowColor = '#ff9040';
    c.shadowBlur = 10;
    c.fillStyle = 'rgba(255,215,130,0.9)';
    c.beginPath();
    c.moveTo(-8, -2.2);
    c.lineTo(-15 - Math.random() * 6, 0);
    c.lineTo(-8, 2.2);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,130,50,0.5)';
    c.beginPath(); c.arc(-9, 0, 4 + Math.random() * 2, 0, 7); c.fill();
    c.shadowBlur = 0;
  }

  // airframe, matching the round on the launcher's rail; darker silhouette
  // in the dive, seen bottom-up against the sky
  c.fillStyle = dive ? '#26251f' : '#33362c';
  c.beginPath(); c.moveTo(-8, -2.2); c.lineTo(-11.5, -5); c.lineTo(-8, -0.8); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-8, 2.2); c.lineTo(-11.5, 5); c.lineTo(-8, 0.8); c.closePath(); c.fill();
  c.fillStyle = dive ? '#4e4b40' : '#9a9280';
  c.fillRect(-8, -2.4, 17, 4.8);
  c.fillStyle = dive ? '#33362c' : '#42463c';
  c.fillRect(0, -2.4, 3.5, 4.8);
  c.fillStyle = dive ? '#161610' : '#23231c';
  c.beginPath(); c.moveTo(9, -2.4); c.lineTo(14.5, 0); c.lineTo(9, 2.4); c.closePath(); c.fill();

  c.restore();
}

function drawHalftrack(e) {
  const c = ctx;
  c.save();
  c.translate(e.x, e.y);

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

  if (e.hp < e.maxhp) {
    const f = clamp(e.hp / e.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - 14, e.y - 24, 28, 3.5);
    ctx.fillStyle = '#c0562e';
    ctx.fillRect(e.x - 14, e.y - 24, 28 * f, 3.5);
  }
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

function drawBike(e) {
  const c = ctx;
  const lean = Math.sin(e.y * 0.02) * 0.12; // matches the weave
  c.save();
  c.translate(e.x, e.y);
  c.rotate(lean);
  // shadow
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath(); c.ellipse(1, 3, 10, 7, 0, 0, 7); c.fill();
  // wheels
  c.fillStyle = '#22221c';
  c.fillRect(-5.5, -11, 5, 4);
  c.fillRect(-5.5, 7, 5, 4);
  c.fillRect(3.5, 4, 5, 3);
  c.fillStyle = 'rgba(110,108,96,0.35)';
  c.fillRect(-5.5, -11, 5, 1);
  c.fillRect(-5.5, 7, 5, 1);
  // frame and sidecar
  c.fillStyle = e.t.color;
  c.fillRect(-5, -10, 4, 20);
  c.fillRect(3, -5, 6, 11);
  c.fillStyle = 'rgba(255,255,255,0.10)';
  c.fillRect(-5, -10, 4, 1.6);
  c.fillRect(3, -5, 6, 1.4);
  c.strokeStyle = '#2b2b25';
  c.lineWidth = 1.1;
  c.strokeRect(3, -5, 6, 11);
  c.strokeRect(-5, -10, 4, 20);
  // rider and passenger helmets
  c.fillStyle = '#5c626c';
  c.beginPath(); c.arc(-3, -1, 3, 0, 7); c.fill();
  c.beginPath(); c.arc(6, -1, 2.6, 0, 7); c.fill();
  c.restore();

  if (e.hp < e.maxhp) {
    const f = clamp(e.hp / e.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - 10, e.y - 17, 20, 3);
    ctx.fillStyle = '#c0562e';
    ctx.fillRect(e.x - 10, e.y - 17, 20 * f, 3);
  }
}

function drawWire(wr) {
  ctx.save();
  ctx.translate(wr.x, wr.y);
  ctx.strokeStyle = '#2c2820';
  ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(-34, 5); ctx.lineTo(-30, -7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(34, 5); ctx.lineTo(30, -7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, -7); ctx.stroke();
  ctx.strokeStyle = 'rgba(150,146,124,0.95)';
  ctx.lineWidth = 1.1;
  // fortified wire carries an extra strand; hardened wire another still
  const strands = wr.up2 ? [-10, -8, -5, -1, 3] : wr.up ? [-8, -5, -1, 3] : [-5, -1, 3];
  for (const yy of strands) {
    ctx.beginPath();
    ctx.moveTo(-32, yy);
    for (let x = -32; x <= 32; x += 4) ctx.lineTo(x, yy + ((x / 4) % 2 ? 1.6 : -1.6));
    ctx.stroke();
  }
  ctx.restore();
}

function drawSandbag(s) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(0, 4, 24, 9, 0, 0, 7); ctx.fill();
  // fortified bags get a third row on top
  const rows = s.up ? 3 : 2;
  for (let r = 0; r < rows; r++) {
    for (let i = -1.5; i <= 1.5; i++) {
      ctx.fillStyle = r ? '#a89566' : '#977f52';
      ctx.strokeStyle = '#4f4229';
      ctx.lineWidth = 1.1;
      const bx = i * 12 + (r % 2 ? 6 : 0), by = -r * 6;
      if (Math.abs(bx) > 20 || (r === 2 && Math.abs(bx) > 14)) continue;
      ctx.beginPath();
      ctx.ellipse(bx, by, 7, 4, 0, 0, 7);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(216,198,150,0.55)';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(bx - 1, by - 1.1, 4.6, 2, 0, 3.55, 5.9); ctx.stroke();
      ctx.strokeStyle = 'rgba(66,54,30,0.45)';
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(bx - 4.6, by + 0.5); ctx.lineTo(bx + 4.6, by + 0.5); ctx.stroke();
    }
  }
  // hardened bags gain a plank-and-stake revetment holding the wall
  if (s.up2) {
    ctx.strokeStyle = '#5a4a30';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-22, 6); ctx.lineTo(-22, -14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(22, 6); ctx.lineTo(22, -14); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-22, -12); ctx.lineTo(22, -12); ctx.stroke();
  }
  ctx.restore();
}

function drawDecorSandbag(cx, cy, rx, ry) {
  ctx.fillStyle = '#8a7a50';
  ctx.strokeStyle = '#6e6040';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, 7);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90,78,48,0.55)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.55, cy);
  ctx.lineTo(cx + rx * 0.55, cy);
  ctx.stroke();
}

function drawBunker(b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  if (b.up) {
    // breastwork bags sit in front; bunker draws on top
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.beginPath(); ctx.ellipse(0, -16, 14, 4, 0, 0, 7); ctx.fill();
    drawDecorSandbag(-9, -15, 7, 4);
    drawDecorSandbag(9, -15, 7, 4);
  }
  // drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 5, 30, 11, 0, 0, 7); ctx.fill();
  // concrete slab body
  ctx.fillStyle = b.up ? '#8d8b80' : '#7f7d72';
  ctx.strokeStyle = '#33322c';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-28, 8);
  ctx.lineTo(-28, -6);
  ctx.quadraticCurveTo(-28, -14, -18, -14);
  ctx.lineTo(18, -14);
  ctx.quadraticCurveTo(28, -14, 28, -6);
  ctx.lineTo(28, 8);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // roof highlight
  ctx.fillStyle = b.up ? '#b0ac9d' : '#9f9d8a';
  ctx.beginPath();
  ctx.moveTo(-24, -2);
  ctx.lineTo(-24, -6);
  ctx.quadraticCurveTo(-24, -11, -17, -11);
  ctx.lineTo(17, -11);
  ctx.quadraticCurveTo(24, -11, 24, -6);
  ctx.lineTo(24, -2);
  ctx.closePath();
  ctx.fill();
  // firing slit facing the German line
  ctx.fillStyle = '#191712';
  ctx.fillRect(-16, -9, 32, 4);
  ctx.fillStyle = 'rgba(184,180,164,0.5)';
  ctx.fillRect(-16, -5.2, 32, 1);
  // fortified bunkers get steel plating over the slit corners
  if (b.up) {
    ctx.fillStyle = '#5a5850';
    ctx.fillRect(-20, -10, 5, 6);
    ctx.fillRect(15, -10, 5, 6);
  }
  // hardened bunkers add a full steel lintel band above the slit
  if (b.up2) {
    ctx.fillStyle = '#6d6b62';
    ctx.fillRect(-20, -13, 40, 3);
    ctx.fillStyle = '#48463f';
    for (let rx = -18; rx <= 16; rx += 8) ctx.fillRect(rx, -13, 2, 3);
  }
  // battle damage: cracks appear as the concrete wears down
  const f = b.hp / b.maxhp;
  if (f < 0.66) {
    ctx.strokeStyle = 'rgba(30,28,22,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-12, -14); ctx.lineTo(-8, -4); ctx.lineTo(-11, 4); ctx.stroke();
  }
  if (f < 0.33) {
    ctx.strokeStyle = 'rgba(30,28,22,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(14, -14); ctx.lineTo(10, -2); ctx.lineTo(16, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-18, 2); ctx.stroke();
  }
  ctx.restore();
}

function drawMine(m) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(m.x, m.y + 2, 6, 3, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#3a372b';
  ctx.beginPath(); ctx.arc(m.x, m.y, 5, 0, 7); ctx.fill();
  ctx.strokeStyle = '#1b190f'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(m.x, m.y, 5, 0, 7); ctx.stroke();
  ctx.fillStyle = '#635b46';
  ctx.beginPath(); ctx.arc(m.x, m.y, 2, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(150,142,110,0.5)'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.arc(m.x - 1, m.y - 1, 3, 3.4, 5.6); ctx.stroke();
}

function drawWatchtower(t) {
  ctx.save();
  ctx.translate(t.x, t.y);
  // drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 3, 15, 13, 0, 0, 7); ctx.fill();
  // four corner legs peeking out from under the platform, seen from above
  ctx.fillStyle = '#4a3c26';
  for (const [lx, ly] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
    ctx.beginPath(); ctx.arc(lx, ly, 2.6, 0, 7); ctx.fill();
  }
  // cross-bracing
  ctx.strokeStyle = '#4a3c26';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-12, -12); ctx.lineTo(12, 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12, -12); ctx.lineTo(-12, 12); ctx.stroke();
  // fortified towers get a braced perimeter; hardened towers a second outer ring
  if (t.up) {
    ctx.strokeStyle = '#6b5636';
    ctx.lineWidth = 2;
    ctx.strokeRect(-12, -12, 24, 24);
  }
  if (t.up2) {
    ctx.strokeStyle = '#7d6640';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-15, -15, 30, 30);
  }
  // square lookout platform roof, viewed straight down
  ctx.fillStyle = '#77612f';
  ctx.strokeStyle = '#2a2114';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.rect(-9, -9, 18, 18); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(38,30,16,0.5)';
  ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-3, -9); ctx.lineTo(-3, 9); ctx.moveTo(3, -9); ctx.lineTo(3, 9); ctx.stroke();
  // roof ridge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-9, -9); ctx.lineTo(9, 9); ctx.stroke();
  // lookout figure, seen from above
  ctx.fillStyle = '#3a3428';
  ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, 7); ctx.fill();
  // battle damage: the frame splinters as it takes hits
  const f = t.hp / t.maxhp;
  if (f < 0.66) {
    ctx.strokeStyle = 'rgba(30,24,14,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-2, 3); ctx.stroke();
  }
  if (f < 0.33) {
    ctx.strokeStyle = 'rgba(30,24,14,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(3, 6); ctx.stroke();
  }
  ctx.restore();
}

function drawCamoNest(cn) {
  ctx.save();
  ctx.translate(cn.x, cn.y);
  // drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(0, 5, 30, 11, 0, 0, 7); ctx.fill();
  // layered foliage clump: dark base -> mid body -> lit crown
  const tuft = (x, y, r) => {
    ctx.fillStyle = '#33472a';
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#4c6234';
    ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.25, r * 0.72, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(124,152,82,0.85)';
    ctx.beginPath(); ctx.arc(x - r * 0.34, y - r * 0.42, r * 0.34, 0, 7); ctx.fill();
  };
  // dug-in earthwork, same footprint as the bunker slab
  ctx.fillStyle = '#454d34';
  ctx.strokeStyle = '#2c3123';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-28, 8);
  ctx.lineTo(-28, -6);
  ctx.quadraticCurveTo(-28, -14, -18, -14);
  ctx.lineTo(18, -14);
  ctx.quadraticCurveTo(28, -14, 28, -6);
  ctx.lineTo(28, 8);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // raised-lip highlight along the parapet + dug shade at the base
  ctx.fillStyle = 'rgba(120,132,86,0.28)';
  ctx.fillRect(-24, -13.5, 44, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(-27, 5.5, 54, 2.5);
  // scrim netting lattice over the top — two-tone weave for depth
  ctx.strokeStyle = 'rgba(30,38,20,0.6)';
  ctx.lineWidth = 1.4;
  for (let i = -20; i <= 20; i += 8) {
    ctx.beginPath(); ctx.moveTo(i, -13); ctx.lineTo(i + 10, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, 7); ctx.lineTo(i + 10, -13); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(96,108,68,0.55)';
  ctx.lineWidth = 0.7;
  for (let i = -20; i <= 20; i += 8) {
    ctx.beginPath(); ctx.moveTo(i - 0.8, -13); ctx.lineTo(i + 9.2, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i - 0.8, 7); ctx.lineTo(i + 9.2, -13); ctx.stroke();
  }
  // foliage tufts break up the outline, fuller cover along the crest
  for (const [fx, fy, fr] of [[-23, -11, 5.5], [-14, -14, 5], [-4, -15, 6], [7, -14, 5.5], [16, -13, 5], [23, -9, 4.5], [-25, -1, 4.5], [25, 0, 4.5], [-18, 4, 4], [17, 4, 4]]) tuft(fx, fy, fr);
  // fortified nests dig in deeper: a denser net weave and thicker brush
  if (cn.up) {
    ctx.strokeStyle = 'rgba(40,48,28,0.75)';
    ctx.lineWidth = 1;
    for (let i = -22; i <= 22; i += 5) {
      ctx.beginPath(); ctx.moveTo(i, -13); ctx.lineTo(i + 6, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i, 7); ctx.lineTo(i + 6, -13); ctx.stroke();
    }
    for (const [fx, fy, fr] of [[-14, -16, 5], [4, -17, 5], [18, -14, 4], [-26, -4, 4], [26, -3, 4]]) tuft(fx, fy, fr);
  }
  // hardened nests pile on a darker overgrowth crown
  if (cn.up2) {
    for (const [fx, fy, fr] of [[-20, -18, 5.5], [-6, -20, 5.5], [10, -19, 5.5], [22, -16, 4.5]]) tuft(fx, fy, fr);
  }
  // firing slit, screened by brush
  ctx.fillStyle = '#161810';
  ctx.fillRect(-16, -9, 32, 4);
  // battle damage: the earthworks crack and the brush burns off
  const f = cn.hp / cn.maxhp;
  if (f < 0.66) {
    ctx.strokeStyle = 'rgba(20,18,12,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-12, -14); ctx.lineTo(-8, -4); ctx.lineTo(-11, 4); ctx.stroke();
  }
  if (f < 0.33) {
    ctx.strokeStyle = 'rgba(20,18,12,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(14, -14); ctx.lineTo(10, -2); ctx.lineTo(16, 6); ctx.stroke();
  }
  ctx.restore();
}

// a stack of ammunition crates, seen from above: a few wooden boxes with
// stenciled bands. Fortified stacks add a box and a strap; hardened ones get a
// tarp corner. Splinters spread as it takes hits.
function drawAmmoCrate(t) {
  ctx.save();
  ctx.translate(t.x, t.y);
  // drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 4, 16, 9, 0, 0, 7); ctx.fill();

  // each crate lid, drawn back-to-front so the front boxes overlap
  const box = (bx, by, w, h) => {
    ctx.fillStyle = '#7c6335';
    ctx.strokeStyle = '#2e2410';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.rect(bx - w / 2, by - h / 2, w, h); ctx.fill(); ctx.stroke();
    // stenciled band + slat line
    ctx.strokeStyle = 'rgba(210,190,120,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx - w / 2 + 2, by); ctx.lineTo(bx + w / 2 - 2, by); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.moveTo(bx - w / 2, by - h / 2); ctx.lineTo(bx + w / 2, by - h / 2); ctx.stroke();
  };
  box(-6, -5, 15, 12);
  box(7, -3, 14, 11);
  // fortified stacks pile on an extra crate
  if (t.up) box(-2, 6, 16, 12);
  else box(0, 5, 15, 11);

  // hardened stacks get a lashed tarp corner
  if (t.up2) {
    ctx.fillStyle = 'rgba(60,66,44,0.75)';
    ctx.beginPath();
    ctx.moveTo(-13, -10); ctx.lineTo(1, -12); ctx.lineTo(-4, -2); ctx.closePath();
    ctx.fill();
  }

  // battle damage: boards splinter loose as it's shot up
  const f = t.hp / t.maxhp;
  if (f < 0.66) {
    ctx.strokeStyle = 'rgba(30,24,14,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-11, -8); ctx.lineTo(-4, -1); ctx.stroke();
  }
  if (f < 0.33) {
    ctx.strokeStyle = 'rgba(30,24,14,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(11, -6); ctx.lineTo(4, 3); ctx.stroke();
  }
  ctx.restore();
}

function drawDefenses() {
  for (const wr of G.wires) drawWire(wr);
  for (const s of G.sandbags) drawSandbag(s);
  for (const b of G.bunkers) drawBunker(b);
  for (const t of G.watchtowers) drawWatchtower(t);
  for (const cn of G.camoNests) drawCamoNest(cn);
  for (const ac of G.ammoCrates) drawAmmoCrate(ac);
  for (const m of G.mines) drawMine(m);
}
