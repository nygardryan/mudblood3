/* Trenchworks: WW2 — static emplacement drawing (AT gun, AA gun, V2 rail
   launcher and its rocket in flight) and their wreck stamps.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

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

