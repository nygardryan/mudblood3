/* Mud & Blood — vehicle, emplacement & defense drawing.
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
  c.fillStyle = '#2f2f28';
  c.fillRect(-trackOff, -16, trackW, 32);
  c.fillRect(trackOff - trackW, -16, trackW, 32);
  // hull
  c.fillStyle = a.t.color;
  c.fillRect(-hw, -hh, hw * 2, hh * 2);
  c.strokeStyle = us ? '#39462f' : '#3a3a32';
  c.lineWidth = 1.5;
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
    c.fillStyle = '#3e3e36';
    c.fillRect(-4, -5, 28, 10);
    c.fillRect(20, -3, 18, 6);
  } else {
    // turret — compensate for hull rotation so barrel stays at world bearing a.turret
    c.rotate(a.turret - hullAng + home);
    c.fillStyle = us ? '#54634a' : (heavy ? '#353530' : '#4c4c43');
    c.fillRect(6, -2.5, heavy ? 28 : 24, heavy ? 6 : 5);          // barrel
    c.beginPath(); c.arc(0, 0, heavy ? 12 : 10, 0, 7); c.fill();
    c.strokeStyle = us ? '#39462f' : '#33332c';
    c.beginPath(); c.arc(0, 0, heavy ? 12 : 10, 0, 7); c.stroke();
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

function stampV2Wreck(a) {
  gctx.save();
  gctx.translate(a.x, a.y);
  gctx.fillStyle = '#2e2c26';
  gctx.fillRect(-22, -10, 44, 22);
  gctx.strokeStyle = '#1c1c16';
  gctx.lineWidth = 1.2;
  gctx.strokeRect(-22, -10, 44, 22);
  // snapped, scorched missile body lying across the wreckage
  gctx.strokeStyle = '#3a3830';
  gctx.lineWidth = 5;
  gctx.beginPath(); gctx.moveTo(-24, 6); gctx.lineTo(20, -8); gctx.stroke();
  gctx.strokeStyle = '#1c1c16';
  gctx.lineWidth = 1.4;
  gctx.beginPath(); gctx.moveTo(-24, 6); gctx.lineTo(20, -8); gctx.stroke();
  gctx.fillStyle = '#211f1a';
  gctx.beginPath(); gctx.arc(-6, 0, 9, 0, 7); gctx.fill();
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
    c.fillStyle = us ? '#5b6b4a' : '#61615a';
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
    c.strokeStyle = '#3c3c32';
    c.lineWidth = 1.2;
    c.stroke();
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
    c.fillStyle = '#61615a';
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
  c.fillStyle = us ? '#5b6b4a' : '#61615a';
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
  ctx.fillStyle = '#5b6b4a';
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
  ctx.fillStyle = '#5b6b4a';
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

// Meillerwagen-style erector trailer: a flatbed truck (cab, chassis, six
// wheels) with the A20 raised upright on its cradle at the back — dark olive
// body, red/white recognition checker under the nose, four tail fins. During
// the ~1.1s launch window the missile itself vanishes into an ignition glow.
function drawV2Launcher(a) {
  const c = ctx;
  const fireT = a.v2FireT || 0;
  const launching = fireT > 0.55;
  c.save();
  c.translate(a.x, a.y);

  c.fillStyle = 'rgba(0,0,0,0.32)';
  c.beginPath(); c.ellipse(0, 14, 26, 16, 0, 0, 7); c.fill();

  // truck wheels — three pairs down the chassis
  c.fillStyle = '#201f1a';
  for (const wy of [-16, 4, 20]) {
    c.beginPath(); c.ellipse(-11, wy, 4, 5.5, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(11, wy, 4, 5.5, 0, 0, 7); c.fill();
  }
  c.fillStyle = '#3a3830';
  for (const wy of [-16, 4, 20]) {
    c.beginPath(); c.arc(-11, wy, 1.8, 0, 7); c.fill();
    c.beginPath(); c.arc(11, wy, 1.8, 0, 7); c.fill();
  }

  // flatbed chassis
  c.fillStyle = '#3a3a30';
  c.fillRect(-9, -6, 18, 32);
  c.strokeStyle = '#20201a';
  c.lineWidth = 1.2;
  c.strokeRect(-9, -6, 18, 32);
  // cradle bracing the missile against the bed
  c.strokeStyle = '#26261e';
  c.lineWidth = 2.2;
  c.beginPath(); c.moveTo(-7, 20); c.lineTo(-5, -30); c.stroke();
  c.beginPath(); c.moveTo(7, 20); c.lineTo(5, -30); c.stroke();

  // cab up front, ahead of the bed
  c.fillStyle = a.t.color;
  c.fillRect(-8, -22, 16, 17);
  c.strokeStyle = '#2a2a22';
  c.lineWidth = 1;
  c.strokeRect(-8, -22, 16, 17);
  c.fillStyle = 'rgba(150,170,180,0.55)';
  c.fillRect(-6, -19, 12, 5);
  c.fillStyle = '#242018';
  c.fillRect(-8, -7, 16, 2.5);

  if (!launching) {
    const bodyTop = -58, bodyBot = 20, bw = 6.4;
    c.fillStyle = a.t.color;
    c.fillRect(-bw, bodyTop + 8, bw * 2, bodyBot - bodyTop - 8);
    c.strokeStyle = '#1c1c16';
    c.lineWidth = 1;
    c.strokeRect(-bw, bodyTop + 8, bw * 2, bodyBot - bodyTop - 8);
    // recognition checker band
    c.fillStyle = '#8a2a20';
    c.fillRect(-bw, bodyTop + 8, bw, 7);
    c.fillRect(0, bodyTop + 15, bw, 7);
    c.fillStyle = '#d8d0c0';
    c.fillRect(0, bodyTop + 8, bw, 7);
    c.fillRect(-bw, bodyTop + 15, bw, 7);
    // nose cone
    c.fillStyle = '#2a2a22';
    c.beginPath();
    c.moveTo(-bw, bodyTop + 8);
    c.lineTo(0, bodyTop - 10);
    c.lineTo(bw, bodyTop + 8);
    c.closePath();
    c.fill();
    c.stroke();
    // tail fins, resting just above the cradle base
    c.fillStyle = '#242420';
    c.beginPath(); c.moveTo(-bw, bodyBot - 6); c.lineTo(-bw - 8, bodyBot + 2); c.lineTo(-bw, bodyBot - 2); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(bw, bodyBot - 6); c.lineTo(bw + 8, bodyBot + 2); c.lineTo(bw, bodyBot - 2); c.closePath(); c.fill();
  }

  // ignition glow through the launch window
  if (fireT > 0) {
    const a2 = clamp(fireT / 1.1, 0, 1);
    c.shadowColor = '#ff9040';
    c.shadowBlur = 16;
    c.fillStyle = `rgba(255,200,110,${0.85 * a2})`;
    c.beginPath(); c.arc(0, 18, 6 + a2 * 10, 0, 7); c.fill();
    c.fillStyle = `rgba(255,120,40,${0.5 * a2})`;
    c.beginPath(); c.arc(0, 18, 12 + a2 * 16, 0, 7); c.fill();
    c.shadowBlur = 0;
  }

  c.restore();

  if (a.hp < a.maxhp) {
    const f = clamp(a.hp / a.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(a.x - 24, a.y - 72, 48, 4.5);
    ctx.fillStyle = f > 0.5 ? '#c0562e' : '#8a2a20';
    ctx.fillRect(a.x - 24, a.y - 72, 48 * f, 4.5);
  }
}

// the V2 warhead in flight: climbs away from the battery, arcs over, then
// dives on the target — visibly closing the distance the whole time instead
// of just teleporting a warning reticle onto the impact point
function drawV2RocketInFlight(s) {
  const c = ctx;
  const f = clamp(1 - s.timer / s.dur, 0, 1);
  const gx = s.sx + (s.x - s.sx) * f, gy = s.sy + (s.y - s.sy) * f;
  const vertPhase = Math.cos(f * Math.PI);      // +1 climbing off the pad, 0 at apex, -1 diving in
  const alt = Math.sin(f * Math.PI) * V2_ROCKET_ARC;
  const rx = gx, ry = gy - alt;
  const groundAngle = Math.atan2(s.y - s.sy, s.x - s.sx);
  const nose = groundAngle - vertPhase * 0.8;

  // ground shadow tracks straight beneath it, sharpest at launch and impact
  c.fillStyle = `rgba(0,0,0,${0.05 + (1 - alt / V2_ROCKET_ARC) * 0.12})`;
  c.beginPath(); c.ellipse(gx, gy, 3 + (1 - alt / V2_ROCKET_ARC) * 3, 2, 0, 0, 7); c.fill();

  c.save();
  c.translate(rx, ry);
  c.rotate(nose);

  // exhaust flame trailing the tail
  c.shadowColor = '#ff9040';
  c.shadowBlur = 8;
  c.fillStyle = 'rgba(255,160,70,0.85)';
  c.beginPath(); c.moveTo(-6.5, -2); c.lineTo(-12 - Math.random() * 4, 0); c.lineTo(-6.5, 2); c.closePath(); c.fill();
  c.shadowBlur = 0;

  // body, nose cone, fins — same palette as the launcher's payload
  c.fillStyle = '#3a3a30';
  c.fillRect(-6.5, -2, 11, 4);
  c.fillStyle = '#8a2a20';
  c.fillRect(-1, -2, 3, 1.6);
  c.fillStyle = '#d8d0c0';
  c.fillRect(-1, 0.4, 3, 1.6);
  c.fillStyle = '#2a2a22';
  c.beginPath(); c.moveTo(4.5, -2); c.lineTo(9.5, 0); c.lineTo(4.5, 2); c.closePath(); c.fill();
  c.fillStyle = '#242420';
  c.beginPath(); c.moveTo(-6.5, -2); c.lineTo(-10.5, -4.5); c.lineTo(-6.5, -0.8); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-6.5, 2); c.lineTo(-10.5, 4.5); c.lineTo(-6.5, 0.8); c.closePath(); c.fill();

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
  c.fillStyle = '#2f2f28';
  c.fillRect(-12, -16, 5, 18);
  c.fillRect(7, -16, 5, 18);
  c.fillStyle = '#26251f';
  c.fillRect(-11, 8, 4, 7);
  c.fillRect(7, 8, 4, 7);

  // angular armored hull, tapering toward the nose
  c.fillStyle = e.t.color;
  c.beginPath();
  c.moveTo(-9, -17); c.lineTo(9, -17);
  c.lineTo(10, 4); c.lineTo(6, 16); c.lineTo(-6, 16); c.lineTo(-10, 4);
  c.closePath(); c.fill();
  c.strokeStyle = '#3a3a32';
  c.lineWidth = 1.2;
  c.stroke();
  // engine deck seam at the nose
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.moveTo(-8, 7); c.lineTo(8, 7); c.stroke();

  // open troop bay; helmets visible until the squad piles out
  c.fillStyle = '#3c3c33';
  c.fillRect(-7, -15, 14, 16);
  if (!e.unloaded) {
    c.fillStyle = '#61615a';
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
  c.fillStyle = '#61615a';
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
  c.fillStyle = '#26251f';
  c.fillRect(-5.5, -11, 5, 4);
  c.fillRect(-5.5, 7, 5, 4);
  c.fillRect(3.5, 4, 5, 3);
  // frame and sidecar
  c.fillStyle = e.t.color;
  c.fillRect(-5, -10, 4, 20);
  c.fillRect(3, -5, 6, 11);
  c.strokeStyle = '#3a3a30';
  c.lineWidth = 1;
  c.strokeRect(3, -5, 6, 11);
  // rider and passenger helmets
  c.fillStyle = '#61615a';
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
  ctx.strokeStyle = '#4b4438';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-34, 5); ctx.lineTo(-30, -7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(34, 5); ctx.lineTo(30, -7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, -7); ctx.stroke();
  ctx.strokeStyle = 'rgba(60,58,50,0.9)';
  ctx.lineWidth = 1;
  // fortified wire carries an extra strand
  const strands = wr.up ? [-8, -5, -1, 3] : [-5, -1, 3];
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
      ctx.fillStyle = r ? '#9a8a5e' : '#8a7a50';
      ctx.strokeStyle = '#6e6040';
      ctx.lineWidth = 1;
      const bx = i * 12 + (r % 2 ? 6 : 0), by = -r * 6;
      if (Math.abs(bx) > 20 || (r === 2 && Math.abs(bx) > 14)) continue;
      ctx.beginPath();
      ctx.ellipse(bx, by, 7, 4, 0, 0, 7);
      ctx.fill(); ctx.stroke();
    }
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
  ctx.strokeStyle = '#4e4c44';
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
  // roof highlight
  ctx.fillStyle = b.up ? '#a09e92' : '#93917f';
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
  ctx.fillStyle = '#1e1c16';
  ctx.fillRect(-16, -9, 32, 4);
  // fortified bunkers get steel plating over the slit corners
  if (b.up) {
    ctx.fillStyle = '#5a5850';
    ctx.fillRect(-20, -10, 5, 6);
    ctx.fillRect(15, -10, 5, 6);
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
  ctx.fillStyle = '#38352a';
  ctx.beginPath(); ctx.arc(m.x, m.y, 5, 0, 7); ctx.fill();
  ctx.fillStyle = '#565040';
  ctx.beginPath(); ctx.arc(m.x, m.y, 2, 0, 7); ctx.fill();
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
  // fortified towers get a braced perimeter
  if (t.up) {
    ctx.strokeStyle = '#6b5636';
    ctx.lineWidth = 2;
    ctx.strokeRect(-12, -12, 24, 24);
  }
  // square lookout platform roof, viewed straight down
  ctx.fillStyle = '#6b5636';
  ctx.strokeStyle = '#3d3220';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.rect(-9, -9, 18, 18); ctx.fill(); ctx.stroke();
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
  // dug-in earthwork, same footprint as the bunker slab
  ctx.fillStyle = '#4a5138';
  ctx.strokeStyle = '#33392a';
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
  // scrim netting lattice over the top
  ctx.strokeStyle = 'rgba(60,68,42,0.7)';
  ctx.lineWidth = 1;
  for (let i = -20; i <= 20; i += 8) {
    ctx.beginPath(); ctx.moveTo(i, -13); ctx.lineTo(i + 10, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, 7); ctx.lineTo(i + 10, -13); ctx.stroke();
  }
  // foliage tufts break up the outline
  ctx.fillStyle = '#5c6b42';
  for (const [fx, fy, fr] of [[-20, -12, 5], [-4, -15, 6], [12, -13, 5], [22, -8, 4], [-24, 2, 4], [24, 3, 4]]) {
    ctx.beginPath(); ctx.arc(fx, fy, fr, 0, 7); ctx.fill();
  }
  // fortified nests dig in deeper: a denser net weave and thicker brush
  if (cn.up) {
    ctx.strokeStyle = 'rgba(40,48,28,0.75)';
    ctx.lineWidth = 1;
    for (let i = -22; i <= 22; i += 5) {
      ctx.beginPath(); ctx.moveTo(i, -13); ctx.lineTo(i + 6, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i, 7); ctx.lineTo(i + 6, -13); ctx.stroke();
    }
    ctx.fillStyle = '#465a34';
    for (const [fx, fy, fr] of [[-14, -16, 5], [4, -17, 5], [18, -14, 4], [-26, -4, 4], [26, -3, 4]]) {
      ctx.beginPath(); ctx.arc(fx, fy, fr, 0, 7); ctx.fill();
    }
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

function drawDefenses() {
  for (const wr of G.wires) drawWire(wr);
  for (const s of G.sandbags) drawSandbag(s);
  for (const b of G.bunkers) drawBunker(b);
  for (const t of G.watchtowers) drawWatchtower(t);
  for (const cn of G.camoNests) drawCamoNest(cn);
  for (const m of G.mines) drawMine(m);
}
