/* Trenchworks: WW2 — prone & paratrooper soldier poses.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// a man flat in the dirt: long low silhouette, rifle grounded beside him
// A prone body is a rigid rotation about the unit — everything, shadow included,
// is drawn inside one rotate(a.face) — so one canonical frame per type/nation/armed
// rotates to any facing exactly at blit (sprite-cache.js); no facing buckets.
const PRONE_SPR = 52, PRONE_SPR_A = 26;

function proneSprite(a) {
  const us = (a.nation || a.side) === 'us';
  const armK = (a.type === 'medic' && !a.armed) ? 'n' : 'a';   // only a medic's weapon depends on `armed`
  return sprite('prone' + a.type + (us ? 'u' : 'e') + armK,
    PRONE_SPR, PRONE_SPR, PRONE_SPR_A, PRONE_SPR_A, (c) => paintProneBody(c, a));
}

function drawProneSoldier(a) {
  blitSprite(ctx, proneSprite(a), a.x, a.y, a.face, 1);
}

// draws the prone body in local space (origin at the unit); the caller/bake handles
// positioning and the a.face rotation
function paintProneBody(c, a) {
  const us = (a.nation || a.side) === 'us';
  const isBar = a.type === 'gunner';
  const isEmg = a.type === 'emg';
  const isMG = isBar || isEmg;
  c.save();
  // ground shadow
  c.fillStyle = 'rgba(0,0,0,0.2)';
  c.beginPath(); c.ellipse(-1, 1.5, isMG ? 11.5 : 10.5, 4, 0, 0, 7); c.fill();
  const gunX = 3 + a.t.gun * 0.82;
  const isGren = a.type === 'grenadier' || a.type === 'egren';
  const isShot = a.type === 'shotgunner';
  const isSniper = a.type === 'sniper' || a.type === 'esniper';
  const isOfficer = a.type === 'officer' || a.type === 'eoff';
  const isRifle = a.type === 'rifleman' || a.type === 'erifle';
  // weapon laid out beside him, not shouldered
  if (a.type === 'eoff') {
    c.save();
    c.translate(3, 2.8);
    drawSidearm(c, 1, 0, gunX - 3, 0, false);
    c.restore();
  } else if (a.type === 'officer') {
    c.save();
    c.translate(3, 2.8);
    drawSidearm(c, 1, 0, gunX - 3, 0, true);
    c.restore();
  } else if (a.type === 'erifle') {
    c.save();
    c.translate(3, 2.8);
    drawKar98kRifleman(c, 1, 0, gunX - 3, 0);
    c.restore();
  } else if (isRifle) {
    c.save();
    c.translate(3, 2.8);
    drawM1Garand(c, 1, 0, gunX - 3, 0);
    c.restore();
  } else if (isGren && a.type === 'egren') {
    c.save();
    c.translate(3, 2.8);
    drawKar98kGrenadier(c, 1, 0, gunX - 3, 0);
    c.restore();
  } else if (a.type === 'esmg') {
    c.save();
    c.translate(3, 2.8);
    drawMP40(c, 1, 0, gunX - 3, 0);
    c.restore();
  } else if (a.type === 'eflame') {
    c.save();
    c.translate(3, 2.8);
    drawFlammenwerfer(c, 1, 0, gunX - 3, 0, false);
    c.restore();
  } else if (a.type === 'emg') {
    c.save();
    c.translate(3, 2.8);
    drawMG42(c, 1, 0, gunX - 3, 0);
    c.restore();
  } else if (a.type === 'bazooka') {
    c.save();
    c.translate(3, 2.8);
    drawBazooka(c, 1, 0, 0);
    c.restore();
    c.strokeStyle = '#4a4038';
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(2.5, 3.5); c.lineTo(2.5, 5.5); c.lineTo(3.8, 5.5); c.stroke();
  } else if (a.type === 'ebazooka') {
    c.save();
    c.translate(3, 2.8);
    drawPanzerfaust(c, 1, 0, 0);
    c.restore();
    c.fillStyle = '#4a4a42';
    c.beginPath(); c.arc(gunX + 1.5, 2.2, 1.6, 0, 7); c.fill();
  } else if (a.type === 'medic' && !a.armed) {
    // an unarmed medic carries no weapon — draw nothing
  } else if (!isSniper) {
    c.strokeStyle = '#26261e';
    c.lineWidth = isEmg ? 2.6 : isBar ? 2.2 : isShot ? 2.8 : isGren ? 2 : 1.8;
    c.beginPath(); c.moveTo(3, 2.8); c.lineTo(gunX, 2.8); c.stroke();
  }
  if (isBar) {
    c.strokeStyle = '#4a3f2e';
    c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(2.5, 3.5); c.lineTo(2.5, 5.5); c.lineTo(3.8, 5.5); c.stroke();
    c.fillStyle = '#2a2a1e';
    c.fillRect(3 + a.t.gun * 0.32, 3.5, 3.4, 2.6);
    c.strokeStyle = '#26261e';
    c.lineWidth = 1.2;
    for (const dy of [5, 6.5]) {
      c.beginPath(); c.moveTo(gunX - 1.2, 2.8); c.lineTo(gunX - 0.3, dy); c.stroke();
    }
    drawBARMag(c, -2.5, 1.8, 0.7, 0.25);
    drawBARMag(c, -0.8, 2.8, 0.65, -0.2);
  }
  if (a.type === 'emg') {
    c.fillStyle = '#424038';
    c.beginPath(); c.ellipse(0, 0, 5.9, 3.2, 0, 0, 7); c.fill();
    c.fillStyle = '#4a4a3c';
    c.beginPath(); c.ellipse(-5.2, 2.8, 2.6, 3.2, 0.3, 0, 7); c.fill();
    drawMG42BeltLink(c, -3.5, 3.5, 0.52, 0.2);
    drawMG42BeltLink(c, 1.5, 4.2, 0.48, -0.15);
    c.strokeStyle = '#4a4840';
    c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(-4.5, 1.5); c.lineTo(2.5, 4.5); c.stroke();
    c.fillStyle = '#3a3428';
    c.beginPath(); c.ellipse(4.2, 2.5, 1.4, 2, 0.35, 0, 7); c.fill();
    c.fillStyle = '#3a3830';
    c.fillRect(-6.2, 3.5, 2.6, 2.2);
  }
  if (a.type === 'grenadier') {
    c.fillStyle = '#2a2a1e';
    c.fillRect(3 + a.t.gun * 0.28, 3.5, 2.5, 2.1);
  }
  if (a.type === 'egren') {
    c.fillStyle = '#3a3830';
    c.beginPath();
    c.moveTo(gunX + 0.2, 2); c.lineTo(gunX + 2.8, 1.6);
    c.lineTo(gunX + 2.5, 2.6); c.lineTo(gunX + 0.4, 2.8);
    c.closePath(); c.fill();
    c.fillStyle = '#2a2a22';
    c.beginPath(); c.arc(gunX + 1.8, 1.9, 0.85, 0, 7); c.fill();
  }
  if (isShot) {
    c.strokeStyle = '#4a3f2e';
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(3.5, 4.2); c.lineTo(gunX - 1, 4.2); c.stroke();
    c.fillStyle = '#5a4a38';
    c.fillRect(3 + a.t.gun * 0.28, 3.2, 3.5, 2);
    c.strokeStyle = '#4a4038';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(gunX - 0.5, 1.8); c.lineTo(gunX + 0.5, 4.2);
    c.lineTo(gunX + 1.8, 1.8);
    c.stroke();
  }
  if (a.type === 'esniper') {
    c.save();
    c.translate(3, 2.8);
    drawKar98kSniper(c, 1, 0, gunX - 3, 0);
    c.restore();
    c.strokeStyle = '#26261e';
    c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(gunX - 1, 2.8); c.lineTo(gunX + 0.2, 5.5); c.stroke();
    c.beginPath(); c.moveTo(gunX - 1, 2.8); c.lineTo(gunX + 0.2, 0.2); c.stroke();
  } else if (a.type === 'sniper') {
    c.save();
    c.translate(3, 2.8);
    drawScopedRifle(c, 1, 0, gunX - 3, 0, true);
    c.restore();
    c.strokeStyle = '#26261e';
    c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(gunX - 1, 2.8); c.lineTo(gunX + 0.2, 5.5); c.stroke();
    c.beginPath(); c.moveTo(gunX - 1, 2.8); c.lineTo(gunX + 0.2, 0.2); c.stroke();
  }
  // legs trailing behind
  c.strokeStyle = a.t.color;
  c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(-4, 0); c.lineTo(-10, -1.8); c.stroke();
  c.beginPath(); c.moveTo(-4, 0); c.lineTo(-10, 1.8); c.stroke();
  // torso stretched along the facing
  c.fillStyle = a.t.color;
  c.beginPath(); c.ellipse(-1, 0, isMG ? 7.2 : isShot ? 7 : isBar ? 7 : isSniper ? 6.8 : isOfficer ? 6.6 : isRifle ? 6.4 : 6.5, isMG ? 3.4 : isShot ? 3.5 : isBar ? 3.3 : isSniper ? 3.1 : isOfficer ? 3.3 : isRifle ? 3.05 : 3.2, 0, 0, 7); c.fill();
  c.strokeStyle = 'rgba(14,15,11,0.55)'; c.lineWidth = 1; c.stroke();
  if (isRifle) {
    if (us) {
      c.fillStyle = '#3a4034';
      c.fillRect(-5.2, 2.8, 2.4, 2.2);
      c.fillRect(-1.8, 3.2, 2.4, 2.2);
      c.fillRect(1.6, 3.2, 2.4, 2.2);
      c.fillStyle = '#4a5245';
      c.beginPath(); c.ellipse(-3.8, 1.6, 1.6, 2, 0.35, 0, 7); c.fill();
    } else {
      c.fillStyle = '#3a3428';
      c.fillRect(-5, 3, 2.6, 2.4);
      c.fillRect(2.4, 3, 2.6, 2.4);
      c.fillStyle = '#3a3a32';
      c.beginPath(); c.ellipse(-4.2, 1.2, 1.8, 2.4, 0.35, 0, 7); c.fill();
      c.fillStyle = '#5a5a48';
      c.beginPath(); c.ellipse(4.5, 1.8, 1.6, 2.2, 0.35, 0, 7); c.fill();
    }
  }
  if (a.type === 'eoff') {
    c.fillStyle = '#4a4840';
    c.beginPath(); c.ellipse(0, 0, 5.8, 2.9, 0, 0, 7); c.fill();
    c.fillStyle = '#8a8880';
    c.beginPath(); c.ellipse(2.8, -0.8, 1.4, 0.8, 0.3, 0, 7); c.fill();
    c.beginPath(); c.ellipse(2.8, 0.8, 1.4, 0.8, 0.3, 0, 7); c.fill();
    c.fillStyle = '#3a3428';
    c.beginPath(); c.ellipse(-3.5, 1.8, 1.8, 2.2, 0.35, 0, 7); c.fill();
    c.fillStyle = '#c8b898';
    c.fillRect(2.2, -1.5, 2.8, 3.5);
    c.strokeStyle = '#8a8880';
    c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(3.5, 1.5); c.lineTo(4.8, 3.2); c.stroke();
    c.fillStyle = '#6a5a42';
    c.fillRect(4.5, 2.8, 0.7, 1.5);
  } else if (a.type === 'officer') {
    c.fillStyle = '#5a6048';
    c.beginPath(); c.ellipse(0, 0, 5.8, 2.9, 0, 0, 7); c.fill();
    c.strokeStyle = '#6a5a40';
    c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(-3, -1.2); c.lineTo(2.5, 2.2); c.stroke();
    c.fillStyle = '#3a3028';
    c.beginPath(); c.ellipse(-3.5, 1.8, 1.8, 2.2, 0.35, 0, 7); c.fill();
    c.fillStyle = '#c8b898';
    c.fillRect(2.2, -1.5, 2.8, 3.5);
  }
  if (a.type === 'esniper') {
    c.fillStyle = 'rgba(42,38,28,0.5)';
    c.beginPath(); c.ellipse(0, 0, 5.8, 2.9, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(72,64,48,0.55)';
    c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(-2.5, 0.8); c.lineTo(-4, 2.5); c.stroke();
    c.beginPath(); c.moveTo(2, -0.8); c.lineTo(3.5, -2.2); c.stroke();
    c.fillStyle = '#3a3428';
    c.fillRect(-6, -0.5, 2.5, 3.5);
    drawStripperClip(c, -4.5, 2.5, 0.48, 0.2);
  } else if (a.type === 'sniper') {
    c.fillStyle = 'rgba(30,36,22,0.5)';
    c.beginPath(); c.ellipse(0, 0, 5.5, 2.8, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(45,55,30,0.6)';
    c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(-2, 1); c.lineTo(-3.5, 2.5); c.stroke();
    c.beginPath(); c.moveTo(1.5, -0.5); c.lineTo(3, -2); c.stroke();
  }
  if (isShot) {
    c.fillStyle = '#4a5245';
    c.beginPath(); c.ellipse(0.5, 0, 5.5, 3.2, 0, 0, 7); c.fill();
    drawShotgunShell(c, -3, 1.5, 0.7, 0.3);
    drawShotgunShell(c, -1, 2.5, 0.65, -0.2);
  }
  if (isBar) {
    c.fillStyle = '#4a5245';
    c.beginPath(); c.ellipse(0, 0, 5.8, 3, 0, 0, 7); c.fill();
    c.strokeStyle = '#8a7a48';
    c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-3, -1.5); c.lineTo(2, 2.5); c.stroke();
  }
  // headgear at the head end
  if (a.type === 'eoff') {
    c.save();
    c.translate(5, 0);
    drawEoffCap(c, 1, 0);
    c.restore();
  } else if (a.type === 'officer') {
    c.save();
    c.translate(5, 0);
    drawOfficerCap(c, 1, 0, true);
    c.restore();
  } else if (a.type === 'esniper') {
    c.fillStyle = '#3f3f34';
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.fill();
    c.fillStyle = 'rgba(58,52,40,0.55)';
    for (let i = 0; i < 5; i++) {
      const ang = i * Math.PI / 2.5 + 0.2;
      c.beginPath();
      c.ellipse(5 + Math.cos(ang) * 2.5, Math.sin(ang) * 2.5, 0.9, 1.3, ang, 0, 7);
      c.fill();
    }
    c.strokeStyle = 'rgba(200,198,180,0.65)';
    c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(4.2, -0.5); c.lineTo(5.8, -0.5); c.stroke();
    c.beginPath(); c.moveTo(5, -1.2); c.lineTo(5, 0.2); c.stroke();
  } else if (a.type === 'sniper') {
    c.fillStyle = '#2e3823';
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(48,58,32,0.7)';
    c.lineWidth = 0.65;
    for (let i = 0; i < 6; i++) {
      const ang = i * Math.PI / 3;
      c.beginPath();
      c.moveTo(5 + Math.cos(ang) * 2.8, Math.sin(ang) * 2.8);
      c.lineTo(5 + Math.cos(ang) * 4, Math.sin(ang) * 4);
      c.stroke();
    }
  } else if (a.type === 'erifle') {
    c.fillStyle = '#5c626c';
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1;
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(30,36,22,0.38)';
    c.lineWidth = 0.6;
    for (const off of [-1.5, 0, 1.5]) {
      c.beginPath(); c.arc(5 + off, 0, 2.7, 0.2, 2.9); c.stroke();
    }
    c.fillStyle = 'rgba(200,198,180,0.78)';
    c.beginPath(); c.ellipse(3.5, -1.2, 0.85, 1.1, 0.3, 0, 7); c.fill();
    c.strokeStyle = 'rgba(50,48,40,0.72)';
    c.lineWidth = 0.55;
    c.beginPath();
    c.moveTo(3.1, -1.6); c.quadraticCurveTo(3.6, -2.2, 4.2, -1.5); c.stroke();
  } else if (a.type === 'esmg') {
    c.fillStyle = '#5c626c';
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1;
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(230,228,210,0.9)';
    c.lineWidth = 0.85;
    c.beginPath();
    c.moveTo(4.4, -1.6); c.lineTo(5.2, -0.2); c.lineTo(4.7, -0.2); c.lineTo(5.4, 1.6); c.stroke();
    c.fillStyle = 'rgba(230,228,210,0.85)';
    c.beginPath(); c.arc(3.2, -1.2, 1.1, 0, 7); c.fill();
  } else if (a.type === 'eflame') {
    c.fillStyle = '#5c626c';
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1;
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.stroke();
    c.fillStyle = 'rgba(255,120,40,0.88)';
    c.beginPath();
    c.moveTo(4.2, 1.2);
    c.quadraticCurveTo(4.8, -0.8, 5.4, -1.8);
    c.quadraticCurveTo(5.8, -0.4, 5.5, 1.4);
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(230,180,80,0.75)';
    c.lineWidth = 0.55;
    c.stroke();
  } else if (a.type === 'emg') {
    c.fillStyle = '#5c626c';
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1;
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(230,228,210,0.88)';
    c.lineWidth = 0.75;
    c.beginPath();
    c.moveTo(3.8, -0.5); c.lineTo(5.8, -0.5);
    c.moveTo(3.8, 0.5); c.lineTo(5.8, 0.5);
    c.moveTo(4.2, -1.2); c.lineTo(4.2, 1.2);
    c.stroke();
    c.beginPath();
    c.moveTo(4.5, -1.5); c.lineTo(5.5, 1.5);
    c.moveTo(5.5, -1.5); c.lineTo(4.5, 1.5);
    c.stroke();
  } else if (isRifle) {
    c.fillStyle = '#63804d';
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1;
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(30,36,22,0.38)';
    c.lineWidth = 0.6;
    for (const off of [-1.5, 0, 1.5]) {
      c.beginPath(); c.arc(5 + off, 0, 2.7, 0.2, 2.9); c.stroke();
    }
  } else {
    c.fillStyle = a.type === 'medic' ? '#ddd8c8' : us ? '#63804d' : '#5c626c';
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1;
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.stroke();
  }
  if (a.type === 'eflame') {
    c.fillStyle = '#3a3834';
    c.beginPath(); c.ellipse(0, 0, 5.9, 3.3, 0, 0, 7); c.fill();
    c.strokeStyle = '#5a5a50';
    c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(-2.5, -1.2); c.lineTo(2.5, 1.2); c.stroke();
    c.beginPath(); c.moveTo(-2.5, 1.2); c.lineTo(2.5, -1.2); c.stroke();
    c.fillStyle = '#6a6a58';
    c.beginPath(); c.ellipse(-5.5, -1.8, 3.6, 1.7, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(-5.5, 1.8, 3.6, 1.7, 0, 0, 7); c.fill();
    c.fillStyle = '#4a4a42';
    c.beginPath(); c.ellipse(-4.8, 0, 1.5, 1.1, 0, 0, 7); c.fill();
    c.strokeStyle = '#2a2820';
    c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(3, 2.8); c.quadraticCurveTo(-1.5, 1.2, -4.5, 0.2); c.stroke();
    c.fillStyle = '#3a3830';
    c.beginPath(); c.ellipse(3.5, 2.5, 1.2, 1.6, 0.35, 0, 7); c.fill();
  } else if (a.type === 'flamer') {
    c.fillStyle = '#7a4828';
    c.beginPath(); c.ellipse(-5.5, 0, 2.2, 3.8, 0, 0, 7); c.fill();
    c.fillStyle = '#3a3c30';
    c.beginPath(); c.ellipse(-5.5, 3.5, 2.2, 3.5, 0, 0, 7); c.fill();
    c.strokeStyle = '#2a2820';
    c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(3, 2.8); c.quadraticCurveTo(-1, 1.5, -4, 0.5); c.stroke();
  }
  if (a.type === 'grenadier') {
    drawFragGrenade(c, -3.5, 1.2, 0.75, { rot: 0.2 });
    drawFragGrenade(c, -1, 2.8, 0.7, { rot: -0.3 });
  }
  if (a.type === 'egren') {
    drawStickGrenade(c, -5.2, 0.2, 0.78, 0.35);
    drawStickGrenade(c, -2.5, 2.2, 0.72, 0.85);
    drawStickGrenade(c, 0.8, 1.5, 0.68, 1.1);
    c.fillStyle = '#4a4a3c';
    c.beginPath(); c.ellipse(-5.5, 3.2, 2.4, 2.8, 0.3, 0, 7); c.fill();
    c.strokeStyle = '#8a3830';
    c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(-1.5, 0.5); c.lineTo(1.5, 3.5); c.stroke();
    c.beginPath(); c.moveTo(1.5, 0.5); c.lineTo(-1.5, 3.5); c.stroke();
  }
  if (a.type === 'esmg') {
    c.fillStyle = '#3e3c34';
    c.beginPath(); c.ellipse(0, 0, 5.6, 3.1, 0, 0, 7); c.fill();
    drawMP40Mag(c, -4.8, 2.8, 0.55, 0.25);
    drawMP40Mag(c, 2.8, 3.5, 0.52, -0.15);
    drawStickGrenade(c, -5.5, 0.5, 0.7, 0.4);
    c.fillStyle = '#3a3428';
    c.beginPath(); c.ellipse(4.2, 2.2, 1.4, 2, 0.35, 0, 7); c.fill();
    c.fillStyle = '#b8261c';
    c.beginPath(); c.ellipse(2.5, 1.2, 1.2, 1.6, 0.3, 0, 7); c.fill();
  }
  if (a.type === 'erifle') {
    c.fillStyle = '#3a3a32';
    c.beginPath(); c.ellipse(-4.5, 1.2, 1.6, 2.2, 0.35, 0, 7); c.fill();
    c.fillStyle = '#5a5a48';
    c.beginPath(); c.ellipse(4.2, 2.2, 1.5, 2, 0.35, 0, 7); c.fill();
    drawStripperClip(c, -5, 3.5, 0.5, 0.2);
    drawStripperClip(c, 2.8, 3.5, 0.48, -0.1);
    c.strokeStyle = '#4a4038';
    c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(1.5, 2.5); c.lineTo(3.8, 4.2); c.stroke();
  }
  if (a.t.mortar && a.type === 'emortar') {
    c.fillStyle = '#2a2c24';
    c.beginPath(); c.ellipse(-5.2, 1.5, 4.5, 2.8, 0.3, 0, 7); c.fill();
    c.strokeStyle = '#4a4c42';
    c.lineWidth = 3.2;
    c.beginPath(); c.moveTo(-5.2, 1.5); c.lineTo(2.5, -4.5); c.stroke();
    c.strokeStyle = '#3a3c34';
    c.lineWidth = 1.4;
    c.beginPath(); c.arc(-1.5, -0.5, 1.8, 0, 7); c.stroke();
    c.fillStyle = '#4a4438';
    c.fillRect(-7.8, 2.5, 5, 3.5);
    drawGrw81Round(c, -6.8, 3.6, 0.68, 0.25);
    drawGrw81Round(c, -5.2, 3.9, 0.64, -0.1);
    drawGrw81Round(c, -3.8, 2.8, 0.6, 0.4);
    c.fillStyle = '#3a3c34';
    c.beginPath(); c.ellipse(2.5, 1.2, 1.6, 2.2, 0.35, 0, 7); c.fill();
  } else if (a.t.mortar) {
    c.fillStyle = '#2f3328';
    c.beginPath(); c.ellipse(-5, 1.5, 4, 2.5, 0.3, 0, 7); c.fill();
    c.strokeStyle = '#5a5c42';
    c.lineWidth = 2.8;
    c.beginPath(); c.moveTo(-5, 1.5); c.lineTo(2, -4); c.stroke();
    c.fillStyle = '#5a4a38';
    c.fillRect(-7.5, 2.5, 4.5, 3);
    drawMortarRound(c, -6.5, 3.5, 0.65, 0.25);
    drawMortarRound(c, -5, 3.8, 0.62, -0.1);
  }
  if (a.type === 'bazooka') {
    drawSpareRocketTube(c, -7.5, -2.5, 5, -5.5);
    c.fillStyle = '#3a3428';
    c.beginPath(); c.ellipse(2.5, 1.8, 1.5, 2, 0.35, 0, 7); c.fill();
  }
  if (a.type === 'ebazooka') {
    drawSpareRocketTube(c, -7, -2, 4.5, -5);
    drawSpareRocketTube(c, -6.5, 2.5, 5, 5.5);
    c.fillStyle = '#4a4a42';
    c.beginPath(); c.arc(4.5, -5, 1.4, 0, 7); c.fill();
    c.beginPath(); c.arc(5, 5.5, 1.2, 0, 7); c.fill();
    drawStickGrenade(c, -4.5, 3.5, 0.62, 0.2);
  }
  c.restore();
}

// a Fallschirmjäger under canopy, seen from directly above: a paneled
// disc overhead that shrinks and fades as the chute timer burns down,
// revealing the jumper beneath as he nears touchdown
// The canopy — a radially symmetric paneled disc — is a pure function of the
// descent fraction p (its radius and fade) and is identical for every jumper type,
// so it's cached as one small set of frames bucketed by p and blitted with the
// sway spin applied as rotation (the pattern is symmetric, so that's exact). The
// jumper beneath is tiny, type-coloured and must stay upright, so it's drawn live.
const CANOPY_SPR = 34, CANOPY_SPR_A = 17, CANOPY_P_BUCKETS = 32;

function canopySprite(p) {
  const pb = clamp(Math.round(p * CANOPY_P_BUCKETS), 0, CANOPY_P_BUCKETS);
  return sprite('canopy' + pb, CANOPY_SPR, CANOPY_SPR, CANOPY_SPR_A, CANOPY_SPR_A,
    (c) => paintCanopy(c, pb / CANOPY_P_BUCKETS));
}

// the canopy at descent fraction p, drawn at canonical bearing (sway applied at blit)
function paintCanopy(c, p) {
  const canopyR = 4.5 + p * 10.5;
  const canopyA = 0.3 + p * 0.6;
  const n = 8;
  // shroud lines: spokes from the jumper up to the canopy skirt
  c.strokeStyle = `rgba(60,58,48,${0.15 + canopyA * 0.4})`;
  c.lineWidth = 0.6;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(Math.cos(ang) * canopyR, Math.sin(ang) * canopyR);
    c.stroke();
  }
  // canopy: a paneled disc directly overhead
  c.fillStyle = `rgba(139,133,112,${canopyA})`;
  c.beginPath(); c.arc(0, 0, canopyR, 0, 7); c.fill();
  c.strokeStyle = `rgba(50,48,38,${canopyA * 0.6})`;
  c.lineWidth = 0.8;
  c.beginPath(); c.arc(0, 0, canopyR, 0, 7); c.stroke();
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    c.beginPath();
    c.moveTo(Math.cos(ang) * canopyR * 0.3, Math.sin(ang) * canopyR * 0.3);
    c.lineTo(Math.cos(ang) * canopyR, Math.sin(ang) * canopyR);
    c.stroke();
  }
}

function drawParatrooper(e) {
  const c = ctx;
  const p = clamp(e.chute / (e.chuteMax || 3), 0, 1);   // 1 = high, 0 = touchdown
  const wob = e.sway || 0;
  const wobX = Math.cos(wob) * p * 2.2;
  const wobY = Math.sin(wob * 1.3) * p * 1.4;

  // ground shadow sharpens and locks onto the touchdown point as he comes down
  c.fillStyle = `rgba(0,0,0,${0.08 + (1 - p) * 0.17})`;
  c.beginPath(); c.ellipse(e.x, e.y + 1, 4 + (1 - p) * 5, 3 + (1 - p) * 4, 0, 0, 7); c.fill();

  // canopy overhead — cached by descent fraction, spun to the sway bearing
  blitSprite(c, canopySprite(p), e.x + wobX, e.y + wobY, wob * 0.15, 1);

  // the jumper below, seen from above: shoulders and helmet, sharpening as he drops
  c.save();
  c.translate(e.x + wobX, e.y + wobY);
  c.globalAlpha = 0.35 + (1 - p) * 0.65;
  c.fillStyle = e.t.color;
  c.beginPath(); c.ellipse(0, 0.5, 3.3, 4, 0, 0, 7); c.fill();
  c.fillStyle = '#5a5a4c';
  c.beginPath(); c.arc(0, -0.5, 2.6, 0, 7); c.fill();
  c.restore();
}

