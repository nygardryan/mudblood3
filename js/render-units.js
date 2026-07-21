/* Dirt & Iron — soldier, kit & weapon drawing.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// device pixels per world unit to back the ground bitmap with. The ground is a
// W×H world-space layer composited under the camera zoom; on mobile that zoom
// upscales it, so we render it at enough real pixels to stay crisp at the
// resting (cover) zoom. Pinching in further softens it gracefully. Desktop
// draws 1:1, and the factor is capped to bound the bitmap's memory.
function groundRenderScale() {
  if (!mobileViewActive()) return 1;
  const displayDensity = canvas.width * coverZoom() / W;
  return clamp(Math.ceil(displayDensity), 1, 4);
}

function paintGround(level) {
  // (re)size the ground bitmap for the current display density, then pre-scale
  // the context so all world-coordinate drawing — here and the runtime wrecks,
  // craters and blood painted into gctx later — lands at the higher resolution
  const scale = groundRenderScale();
  groundCanvas.width = Math.round(W * scale);
  groundCanvas.height = Math.round(H * scale);
  gctx.setTransform(scale, 0, 0, scale, 0, 0);
  // base mud/grass field, painted once per game
  gctx.fillStyle = '#5c5a3f';
  gctx.fillRect(0, 0, W, H);
  if (level && level.landingCraft) {
    gctx.fillStyle = '#2a4a6a';
    gctx.fillRect(0, 0, W, BEACH_Y - 8);
    gctx.fillStyle = '#8a7f5c';
    gctx.fillRect(0, BEACH_Y - 8, W, 52);
    for (let i = 0; i < 120; i++) {
      gctx.fillStyle = 'rgba(110,100,72,0.35)';
      gctx.beginPath();
      gctx.ellipse(rand(0, W), rand(BEACH_Y - 6, BEACH_Y + 40), rand(3, 10), rand(2, 5), rand(0, 3), 0, 7);
      gctx.fill();
    }
  }
  for (let i = 0; i < 700; i++) {
    gctx.fillStyle = pick([
      'rgba(90,88,60,0.25)', 'rgba(78,76,52,0.25)', 'rgba(104,100,66,0.2)',
      'rgba(70,66,46,0.22)', 'rgba(96,94,58,0.18)',
    ]);
    gctx.beginPath();
    gctx.ellipse(rand(0, W), rand(0, H), rand(4, 18), rand(3, 10), rand(0, 3), 0, 7);
    gctx.fill();
  }
  // grass tufts
  for (let i = 0; i < 240; i++) {
    gctx.strokeStyle = 'rgba(84,96,50,0.6)';
    gctx.lineWidth = 1;
    const x = rand(0, W), y = rand(0, H);
    gctx.beginPath();
    gctx.moveTo(x, y);
    gctx.lineTo(x + rand(-2, 2), y - rand(2, 5));
    gctx.stroke();
  }
  // the trench line marking your deploy zone
  gctx.fillStyle = 'rgba(46,42,28,0.85)';
  gctx.fillRect(0, DEPLOY_Y - 3, W, 14);
  gctx.fillStyle = 'rgba(30,27,18,0.9)';
  gctx.fillRect(0, DEPLOY_Y, W, 7);
  for (let x = 8; x < W; x += 26) {
    gctx.fillStyle = 'rgba(74,60,38,0.9)';
    gctx.fillRect(x, DEPLOY_Y - 5, 12, 4);
  }
}

// a man flat in the dirt: long low silhouette, rifle grounded beside him
function drawProneSoldier(a) {
  const c = ctx;
  const us = (a.nation || a.side) === 'us';
  const isBar = a.type === 'gunner';
  const isEmg = a.type === 'emg';
  const isMG = isBar || isEmg;
  c.save();
  c.translate(a.x, a.y);
  c.rotate(a.face);
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
    c.fillStyle = '#61615a';
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
    c.fillStyle = '#61615a';
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
    c.fillStyle = '#61615a';
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
    c.fillStyle = '#61615a';
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
    c.fillStyle = '#5b6b4a';
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
    c.fillStyle = a.type === 'medic' ? '#ddd8c8' : us ? '#5b6b4a' : '#61615a';
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
function drawParatrooper(e) {
  const c = ctx;
  const p = clamp(e.chute / (e.chuteMax || 3), 0, 1);   // 1 = high, 0 = touchdown
  const wob = e.sway || 0;
  const wobX = Math.cos(wob) * p * 2.2;
  const wobY = Math.sin(wob * 1.3) * p * 1.4;

  // ground shadow sharpens and locks onto the touchdown point as he comes down
  c.fillStyle = `rgba(0,0,0,${0.08 + (1 - p) * 0.17})`;
  c.beginPath(); c.ellipse(e.x, e.y + 1, 4 + (1 - p) * 5, 3 + (1 - p) * 4, 0, 0, 7); c.fill();

  c.save();
  c.translate(e.x + wobX, e.y + wobY);

  const canopyR = 4.5 + p * 10.5;
  const canopyA = 0.3 + p * 0.6;
  const n = 8;

  // shroud lines: spokes from the jumper up to the canopy skirt
  c.strokeStyle = `rgba(60,58,48,${0.15 + canopyA * 0.4})`;
  c.lineWidth = 0.6;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + wob * 0.15;
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
    const ang = (i / n) * Math.PI * 2 + wob * 0.15;
    c.beginPath();
    c.moveTo(Math.cos(ang) * canopyR * 0.3, Math.sin(ang) * canopyR * 0.3);
    c.lineTo(Math.cos(ang) * canopyR, Math.sin(ang) * canopyR);
    c.stroke();
  }

  // the jumper below, seen from above: shoulders and helmet sharpening into focus as he drops
  c.globalAlpha = 0.35 + (1 - p) * 0.65;
  c.fillStyle = e.t.color;
  c.beginPath(); c.ellipse(0, 0.5, 3.3, 4, 0, 0, 7); c.fill();
  c.fillStyle = '#5a5a4c';
  c.beginPath(); c.arc(0, -0.5, 2.6, 0, 7); c.fill();
  c.globalAlpha = 1;

  c.restore();
}

// M2 fragmentation grenade — segmented body, spoon lever, pin ring
function drawFragGrenade(c, x, y, scale, opts) {
  scale = scale || 1;
  const ground = opts && opts.ground;
  const rot = opts && opts.rot != null ? opts.rot : 0;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = '#2a3228';
  c.beginPath(); c.arc(0, 0, 2.2 * scale, 0, 7); c.fill();
  c.strokeStyle = '#1a1e16';
  c.lineWidth = 0.65 * scale;
  for (let i = 0; i < 6; i++) {
    const ang = i * Math.PI / 3;
    c.beginPath();
    c.moveTo(Math.cos(ang) * 1.1 * scale, Math.sin(ang) * 1.1 * scale);
    c.lineTo(Math.cos(ang) * 2.1 * scale, Math.sin(ang) * 2.1 * scale);
    c.stroke();
  }
  if (!ground) {
    c.fillStyle = '#4a4a3e';
    c.fillRect(-0.55 * scale, -3.3 * scale, 1.1 * scale, 1.5 * scale);
    c.strokeStyle = '#8a7a48';
    c.lineWidth = 0.95 * scale;
    c.beginPath();
    c.arc(0, -3.9 * scale, 1.15 * scale, Math.PI * 0.12, Math.PI * 0.88);
    c.stroke();
    c.strokeStyle = '#c8b868';
    c.lineWidth = 0.55 * scale;
    c.beginPath(); c.arc(1.35 * scale, -3.6 * scale, 0.55 * scale, 0, 7); c.stroke();
  }
  c.restore();
}

// Stielhandgranate — steel can, porcelain cap, red warning band, wooden handle
function drawStickGrenade(c, x, y, scale, rot) {
  scale = scale || 1;
  rot = rot != null ? rot : 0;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.strokeStyle = '#6b5330';
  c.lineWidth = 1.55 * scale;
  c.beginPath(); c.moveTo(0, 0.5 * scale); c.lineTo(0, 6.2 * scale); c.stroke();
  c.strokeStyle = '#5a4828';
  c.lineWidth = 0.55 * scale;
  c.beginPath(); c.moveTo(-0.45 * scale, 1.2 * scale); c.lineTo(-0.45 * scale, 5.8 * scale); c.stroke();
  c.fillStyle = '#33332a';
  c.beginPath(); c.arc(0, -0.6 * scale, 2.05 * scale, 0, 7); c.fill();
  c.strokeStyle = '#1e1e18';
  c.lineWidth = 0.75 * scale;
  c.beginPath(); c.arc(0, -0.6 * scale, 2.05 * scale, 0, 7); c.stroke();
  c.fillStyle = '#c8c4b8';
  c.beginPath(); c.arc(0, -1.35 * scale, 1.45 * scale, Math.PI, 0); c.fill();
  c.strokeStyle = '#9a9690';
  c.lineWidth = 0.45 * scale;
  c.beginPath(); c.arc(0, -1.35 * scale, 1.45 * scale, Math.PI, 0); c.stroke();
  c.fillStyle = '#4a4a40';
  c.fillRect(-0.85 * scale, -2.7 * scale, 1.7 * scale, 1.15 * scale);
  c.strokeStyle = '#8a3028';
  c.lineWidth = 1.15 * scale;
  c.beginPath(); c.moveTo(0, 2.6 * scale); c.lineTo(0, 4.1 * scale); c.stroke();
  c.strokeStyle = '#4a4038';
  c.lineWidth = 0.5 * scale;
  c.beginPath(); c.arc(1.15 * scale, -2.4 * scale, 0.6 * scale, 0, 7); c.stroke();
  c.restore();
}

function drawGrenadeProjectile(g, x, y) {
  const spin = g.landed ? 0 : g.t * 9;
  if (g.kind === 'stick') {
    drawStickGrenade(ctx, x, y, 1.05, -Math.PI / 2 + spin * 0.3);
  } else {
    drawFragGrenade(ctx, x, y, 1.05, { rot: spin });
  }
  if (g.landed) {
    const blink = Math.sin(g.fuse * (14 - g.fuse * 2)) > 0;
    if (blink) {
      ctx.fillStyle = '#ff5a2a';
      ctx.beginPath(); ctx.arc(x, y - 4, 1.3, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,140,40,0.35)';
      ctx.beginPath(); ctx.arc(x, y - 4, 2.8, 0, 7); ctx.fill();
    }
  }
}

// 12-gauge shell on a bandolier loop
function drawShotgunShell(c, x, y, scale, rot) {
  scale = scale || 1;
  rot = rot != null ? rot : 0;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = '#8a3828';
  c.fillRect(-0.75 * scale, -2.1 * scale, 1.5 * scale, 2.6 * scale);
  c.fillStyle = '#c8a858';
  c.fillRect(-0.6 * scale, -2.4 * scale, 1.2 * scale, 0.95 * scale);
  c.strokeStyle = '#5a3020';
  c.lineWidth = 0.45 * scale;
  c.strokeRect(-0.75 * scale, -2.1 * scale, 1.5 * scale, 2.6 * scale);
  c.restore();
}

// BAR box magazine for bandolier loops
function drawBARMag(c, x, y, scale, rot) {
  scale = scale || 1;
  rot = rot != null ? rot : 0;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = '#2a2a1e';
  c.fillRect(-1.1 * scale, -1.8 * scale, 2.2 * scale, 3.6 * scale);
  c.strokeStyle = '#1a1a14';
  c.lineWidth = 0.5 * scale;
  c.strokeRect(-1.1 * scale, -1.8 * scale, 2.2 * scale, 3.6 * scale);
  c.fillStyle = '#c8a858';
  c.fillRect(-0.7 * scale, -2 * scale, 1.4 * scale, 0.7 * scale);
  c.restore();
}

// scoped bolt-action rifle — Springfield (US) or Gewehr 98 (Axis)
// M1911 (US) or Walther P38 (Axis) — officers and mortar crew sidearms
function drawSidearm(c, fx, fy, gunLen, face, us) {
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const px = -fy, py = fx;
  if (us) {
    c.strokeStyle = '#26261e';
    c.lineWidth = 1.85;
    c.beginPath();
    c.moveTo(fx * 2, fy * 2);
    c.lineTo(tipX, tipY);
    c.stroke();
    c.strokeStyle = '#3a3830';
    c.lineWidth = 2.3;
    c.beginPath();
    c.moveTo(fx * 2.1 + px * 0.7, fy * 2.1 + py * 0.7);
    c.lineTo(tipX + px * 0.55, tipY + py * 0.55);
    c.stroke();
    c.fillStyle = '#4a4038';
    c.beginPath();
    c.moveTo(fx * 3.2 + px * 1.5, fy * 3.2 + py * 1.5);
    c.lineTo(fx * 3.5 + px * 3.4, fy * 3.5 + py * 3.4);
    c.lineTo(fx * 2.7 + px * 3.1, fy * 2.7 + py * 3.1);
    c.lineTo(fx * 2.9 + px * 1.3, fy * 2.9 + py * 1.3);
    c.closePath(); c.fill();
    c.strokeStyle = '#3a3830';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(fx * 3.4 + px * 2.1, fy * 3.4 + py * 2.1, 1.35, face - 0.75, face + 0.55);
    c.stroke();
    c.fillStyle = '#2a2820';
    c.beginPath(); c.arc(fx * 2.5 + px * 0.5, fy * 2.5 + py * 0.5, 0.55, 0, 7); c.fill();
    c.fillStyle = '#1c1c16';
    c.beginPath(); c.arc(tipX, tipY, 0.85, 0, 7); c.fill();
  } else {
    c.strokeStyle = '#26261e';
    c.lineWidth = 1.75;
    c.beginPath();
    c.moveTo(fx * 2, fy * 2);
    c.lineTo(tipX, tipY);
    c.stroke();
    c.strokeStyle = '#3a3830';
    c.lineWidth = 2.1;
    c.beginPath();
    c.moveTo(fx * 2.2 + px * 0.55, fy * 2.2 + py * 0.55);
    c.lineTo(tipX + px * 0.45, tipY + py * 0.45);
    c.stroke();
    c.fillStyle = '#4a4038';
    c.beginPath();
    c.moveTo(fx * 3 + px * 1.4, fy * 3 + py * 1.4);
    c.lineTo(fx * 3.3 + px * 3.2, fy * 3.3 + py * 3.2);
    c.lineTo(fx * 2.6 + px * 2.9, fy * 2.6 + py * 2.9);
    c.lineTo(fx * 2.8 + px * 1.2, fy * 2.8 + py * 1.2);
    c.closePath(); c.fill();
    c.fillStyle = '#5a5a52';
    c.beginPath();
    c.moveTo(fx * 2.4 - px * 0.5, fy * 2.4 - py * 0.5);
    c.lineTo(fx * 2.8 - px * 0.3, fy * 2.8 - py * 0.3);
    c.lineTo(fx * 2.6 - px * 0.8, fy * 2.6 - py * 0.8);
    c.closePath(); c.fill();
    c.strokeStyle = '#3a3830';
    c.lineWidth = 0.95;
    c.beginPath();
    c.arc(fx * 3.2 + px * 1.9, fy * 3.2 + py * 1.9, 1.2, face - 0.7, face + 0.45);
    c.stroke();
    c.fillStyle = '#1c1c16';
    c.beginPath(); c.arc(tipX, tipY, 0.8, 0, 7); c.fill();
  }
}

function drawOfficerCap(c, fx, fy, us) {
  c.fillStyle = us ? '#3f4a2e' : '#4a4840';
  c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = 0.9;
  c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.stroke();
  c.fillStyle = us ? '#2f3824' : '#8a2820';
  c.fillRect(-4.1, 0.2, 8.2, 2);
  c.fillStyle = 'rgba(0,0,0,0.48)';
  c.beginPath();
  c.ellipse(fx * 3.5, -1 + fy * 3.5, 3.1, 1.55, Math.atan2(fy, fx), 0, 7);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.28)';
  c.lineWidth = 0.75;
  c.beginPath();
  c.ellipse(fx * 3.5, -1 + fy * 3.5, 3.1, 1.55, Math.atan2(fy, fx), 0, 7);
  c.stroke();
  if (us) {
    c.fillStyle = '#ffd94a';
    c.beginPath(); c.arc(0, -1.2, 1.7, 0, 7); c.fill();
    c.fillStyle = '#2a3820';
    c.fillRect(-0.55, -2.4, 1.1, 2.2);
    c.fillRect(-1.3, -0.6, 2.6, 0.55);
  } else {
    c.strokeStyle = '#c8c8c0';
    c.lineWidth = 1.15;
    c.beginPath(); c.arc(0, -1.3, 1.65, 0.35, 6); c.stroke();
    c.fillStyle = '#e8e0c0';
    c.beginPath(); c.arc(0, -1.3, 0.75, 0, 7); c.fill();
    c.fillStyle = '#2a2820';
    c.beginPath(); c.arc(0, -1.3, 0.35, 0, 7); c.fill();
  }
  c.strokeStyle = '#3a3028';
  c.lineWidth = 0.85;
  c.beginPath();
  c.moveTo(-3.4, 0.8);
  c.lineTo(-fx * 2.8, -1 + fy * 2.8);
  c.lineTo(3.4, 0.8);
  c.stroke();
}

// Schirmmütze peaked cap — silver cord, cockade, and oak leaves
function drawEoffCap(c, fx, fy) {
  c.fillStyle = '#4a4840';
  c.beginPath(); c.arc(0, -1.2, 4.0, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = 0.85;
  c.beginPath(); c.arc(0, -1.2, 4.0, 0, 7); c.stroke();
  c.fillStyle = '#8a2820';
  c.fillRect(-4.1, -0.2, 8.2, 1.8);
  c.fillStyle = '#3a3834';
  c.fillRect(-3.8, 0.6, 7.6, 2.2);
  c.fillStyle = 'rgba(0,0,0,0.5)';
  c.beginPath();
  c.ellipse(fx * 3.8, -1 + fy * 3.8, 3.4, 1.7, Math.atan2(fy, fx), 0, 7);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.28)';
  c.lineWidth = 0.7;
  c.beginPath();
  c.ellipse(fx * 3.8, -1 + fy * 3.8, 3.4, 1.7, Math.atan2(fy, fx), 0, 7);
  c.stroke();
  c.strokeStyle = '#c8c8c0';
  c.lineWidth = 0.85;
  c.beginPath();
  c.moveTo(-3.2, 0.3); c.quadraticCurveTo(0, 2.3, 3.2, 0.3); c.stroke();
  const cx = -fx * 1.8, cy = -1.2 + fy * 1.8;
  c.fillStyle = '#e8e0c0';
  c.beginPath(); c.arc(cx, cy, 0.85, 0, 7); c.fill();
  c.fillStyle = '#8a2820';
  c.beginPath(); c.arc(cx, cy, 0.45, 0, 7); c.fill();
  c.strokeStyle = '#c8c8c0';
  c.lineWidth = 1.15;
  c.beginPath(); c.arc(0, -1.4, 1.7, 0.2, 6); c.stroke();
  c.fillStyle = '#e8e0c0';
  c.beginPath(); c.arc(0, -1.4, 0.7, 0, 7); c.fill();
  c.fillStyle = '#2a2820';
  c.beginPath(); c.arc(0, -1.4, 0.32, 0, 7); c.fill();
  c.strokeStyle = '#3a3028';
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(-3.4, 0.9); c.lineTo(-fx * 2.8, -1 + fy * 2.8); c.lineTo(3.4, 0.9); c.stroke();
}

function drawEoffKit(c, fx, fy, face) {
  c.strokeStyle = '#6a5a42';
  c.lineWidth = 1.75;
  c.beginPath();
  c.moveTo(-fy * 4.8 - fx * 2.8, fx * 4.8 - fy * 2.8);
  c.lineTo(fy * 4.8 - fx * 2.8, -fx * 4.8 - fy * 2.8);
  c.stroke();
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(-5.5, 4.2); c.lineTo(5.5, 4.2); c.stroke();
  c.fillStyle = '#8a8a80';
  c.fillRect(-1.8, 3.4, 3.6, 2.2);
  c.strokeStyle = '#4a4030';
  c.lineWidth = 0.7;
  c.strokeRect(-1.8, 3.4, 3.6, 2.2);
  const rx = -fy * 1.8, ry = fx * 1.8;
  c.fillStyle = '#2a2820';
  c.fillRect(rx - 0.6, ry - 1.5, 1.2, 3);
  c.fillStyle = '#e8e0c0';
  c.beginPath(); c.arc(rx, ry, 0.65, 0, 7); c.fill();
  c.fillStyle = '#2a2820';
  c.fillRect(rx - 0.25, ry - 0.2, 0.5, 1.4);
  c.fillRect(rx - 0.7, ry + 0.1, 1.4, 0.5);
  c.fillStyle = '#3a3428';
  c.beginPath(); c.ellipse(-fy * 5.8, fx * 5.8, 2.3, 2.9, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.85;
  c.stroke();
  c.fillStyle = '#c8b898';
  c.fillRect(fy * 4.2 - 2, -fx * 4.2 - 2.2, 3.8, 4.8);
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 0.65;
  c.strokeRect(fy * 4.2 - 2, -fx * 4.2 - 2.2, 3.8, 4.8);
  c.strokeStyle = '#8a7a58';
  c.lineWidth = 0.5;
  c.beginPath();
  c.moveTo(fy * 4.2 - 1.4, -fx * 4.2 + 0.2);
  c.lineTo(fy * 4.2 + 1.2, -fx * 4.2 + 1.5);
  c.stroke();
  c.fillStyle = '#2a2a22';
  c.fillRect(-fy * 3.2 - 2.2, fx * 3.2 - 1.3, 4.4, 2.8);
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 0.75;
  c.strokeRect(-fy * 3.2 - 2.2, fx * 3.2 - 1.3, 4.4, 2.8);
  c.fillStyle = '#1a1a14';
  c.beginPath(); c.arc(-fy * 3.2 - 1.3, fx * 3.2, 0.9, 0, 7); c.fill();
  c.beginPath(); c.arc(-fy * 3.2 + 1.3, fx * 3.2, 0.9, 0, 7); c.fill();
  c.fillStyle = 'rgba(120,130,110,0.42)';
  c.beginPath(); c.arc(-fy * 3.2 - 1.3, fx * 3.2, 0.42, 0, 7); c.fill();
  c.beginPath(); c.arc(-fy * 3.2 + 1.3, fx * 3.2, 0.42, 0, 7); c.fill();
  c.strokeStyle = '#8a8880';
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(fy * 3.5, -fx * 3.5); c.lineTo(fy * 5.2, -fx * 5.2 + 0.5); c.stroke();
  c.fillStyle = '#3a3428';
  c.beginPath(); c.ellipse(fy * 5.4, -fx * 5.4 + 0.5, 0.8, 1.4, face + 0.6, 0, 7); c.fill();
  c.fillStyle = '#6a5a42';
  c.fillRect(fy * 4.8 - 0.4, -fx * 4.8 - 0.3, 0.8, 1.8);
  c.strokeStyle = '#8a7a58';
  c.lineWidth = 0.65;
  c.beginPath();
  c.moveTo(-fy * 2.5, fx * 2.5);
  c.quadraticCurveTo(-fy * 1.5, fx * 1.5 + 2, fy * 1, -fx * 1);
  c.stroke();
  c.fillStyle = '#6a5a48';
  c.beginPath(); c.ellipse(fy * 1.2, -fx * 1.2, 0.7, 1.1, face, 0, 7); c.fill();
}

function drawOfficerKit(c, fx, fy, face, us) {
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 1.75;
  c.beginPath();
  c.moveTo(-fy * 4.8 - fx * 2.8, fx * 4.8 - fy * 2.8);
  c.lineTo(fy * 4.8 - fx * 2.8, -fx * 4.8 - fy * 2.8);
  c.stroke();
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(-5.5, 4.2); c.lineTo(5.5, 4.2); c.stroke();
  c.fillStyle = us ? '#c8a858' : '#8a8a80';
  c.fillRect(-1.6, 3.4, 3.2, 2.2);
  c.strokeStyle = '#4a4030';
  c.lineWidth = 0.7;
  c.strokeRect(-1.6, 3.4, 3.2, 2.2);
  c.fillStyle = '#3a3028';
  c.beginPath(); c.ellipse(-fy * 5.8, fx * 5.8, 2.3, 2.9, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.85;
  c.stroke();
  c.fillStyle = '#c8b898';
  c.fillRect(fy * 4.2 - 2, -fx * 4.2 - 2.2, 3.8, 4.8);
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 0.65;
  c.strokeRect(fy * 4.2 - 2, -fx * 4.2 - 2.2, 3.8, 4.8);
  c.strokeStyle = '#8a7a58';
  c.lineWidth = 0.5;
  c.beginPath();
  c.moveTo(fy * 4.2 - 1.4, -fx * 4.2 + 0.2);
  c.lineTo(fy * 4.2 + 1.2, -fx * 4.2 + 1.5);
  c.stroke();
  c.fillStyle = '#2a2a22';
  c.fillRect(-fy * 3.2 - 2.2, fx * 3.2 - 1.3, 4.4, 2.8);
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 0.75;
  c.strokeRect(-fy * 3.2 - 2.2, fx * 3.2 - 1.3, 4.4, 2.8);
  c.fillStyle = '#1a1a14';
  c.beginPath(); c.arc(-fy * 3.2 - 1.3, fx * 3.2, 0.9, 0, 7); c.fill();
  c.beginPath(); c.arc(-fy * 3.2 + 1.3, fx * 3.2, 0.9, 0, 7); c.fill();
  c.fillStyle = 'rgba(120,150,170,0.42)';
  c.beginPath(); c.arc(-fy * 3.2 - 1.3, fx * 3.2, 0.42, 0, 7); c.fill();
  c.beginPath(); c.arc(-fy * 3.2 + 1.3, fx * 3.2, 0.42, 0, 7); c.fill();
  c.fillStyle = '#ffd94a';
  c.beginPath(); c.arc(fy * 2.5, -fx * 2.5, 0.85, 0, 7); c.fill();
  c.strokeStyle = '#3a3028';
  c.lineWidth = 0.6;
  c.beginPath(); c.arc(fy * 2.5, -fx * 2.5, 0.85, 0, 7); c.stroke();
}

function drawM1Garand(c, fx, fy, gunLen, face) {
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const px = -fy, py = fx;
  c.strokeStyle = '#26261e';
  c.lineWidth = 2.25;
  c.beginPath();
  c.moveTo(fx * 2, fy * 2);
  c.lineTo(tipX, tipY);
  c.stroke();
  c.strokeStyle = '#4a3f2e';
  c.lineWidth = 2.45;
  c.beginPath();
  c.moveTo(fx * 1.05 - px * 2.6, fy * 1.05 + py * 2.6);
  c.lineTo(fx * 1.05 + px * 2.4, fy * 1.05 - py * 2.4);
  c.stroke();
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 1.65;
  c.beginPath();
  c.moveTo(fx * 2.4 + px * 1.15, fy * 2.4 + py * 1.15);
  c.lineTo(fx * (gunLen * 0.8) + px * 1.15, fy * (gunLen * 0.8) + py * 1.15);
  c.stroke();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 1.05;
  c.beginPath();
  c.moveTo(fx * 2.6 - px * 0.85, fy * 2.6 - py * 0.85);
  c.lineTo(fx * (gunLen * 0.74) - px * 0.85, fy * (gunLen * 0.74) - py * 0.85);
  c.stroke();
  c.fillStyle = '#c8a858';
  c.beginPath();
  c.moveTo(fx * 3.1 - px * 0.55, fy * 3.1 - py * 0.55);
  c.lineTo(fx * 3.9 - px * 0.55, fy * 3.9 - py * 0.55);
  c.lineTo(fx * 3.9 + px * 0.55, fy * 3.9 + py * 0.55);
  c.lineTo(fx * 3.1 + px * 0.55, fy * 3.1 + py * 0.55);
  c.closePath(); c.fill();
  c.strokeStyle = '#8a7a48';
  c.lineWidth = 0.55;
  c.stroke();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 0.95;
  c.beginPath();
  c.arc(fx * 3.4 + px * 1.75, fy * 3.4 + py * 1.75, 1.15, face - 0.65, face + 0.55);
  c.stroke();
  c.strokeStyle = '#4a4038';
  c.lineWidth = 1.15;
  c.beginPath();
  c.moveTo(tipX - px * 1.6, tipY - py * 1.6);
  c.lineTo(tipX + px * 0.45, tipY + py * 0.45);
  c.stroke();
  c.fillStyle = '#1c1c16';
  c.beginPath(); c.arc(tipX, tipY, 0.95, 0, 7); c.fill();
}

function drawKar98k(c, fx, fy, gunLen, face, stickGrenade) {
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const px = -fy, py = fx;
  c.strokeStyle = '#26261e';
  c.lineWidth = 2.25;
  c.beginPath();
  c.moveTo(fx * 2, fy * 2);
  c.lineTo(tipX, tipY);
  c.stroke();
  c.strokeStyle = '#4a3f2e';
  c.lineWidth = 2.35;
  c.beginPath();
  c.moveTo(fx * 1.15 - px * 2.5, fy * 1.15 + py * 2.5);
  c.lineTo(fx * 1.15 + px * 2, fy * 1.15 - py * 2);
  c.stroke();
  c.fillStyle = '#3a3a30';
  c.beginPath();
  c.moveTo(fx * (gunLen - 1.4) - px * 0.85, fy * (gunLen - 1.4) + py * 0.85);
  c.lineTo(fx * (gunLen + 0.55) - px * 0.55, fy * (gunLen + 0.55) + py * 0.55);
  c.lineTo(fx * (gunLen + 0.55) + px * 0.55, fy * (gunLen + 0.55) - py * 0.55);
  c.lineTo(fx * (gunLen - 1.4) + px * 0.85, fy * (gunLen - 1.4) - py * 0.85);
  c.closePath(); c.fill();
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 1.55;
  c.beginPath();
  c.moveTo(fx * 2.2 + px * 1.05, fy * 2.2 + py * 1.05);
  c.lineTo(fx * (gunLen * 0.82) + px * 1.05, fy * (gunLen * 0.82) + py * 1.05);
  c.stroke();
  c.fillStyle = '#2a2a22';
  c.beginPath();
  c.arc(fx * 3.8 + px * 1.4, fy * 3.8 + py * 1.4, 0.85, 0, 7);
  c.fill();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 0.95;
  c.beginPath();
  c.arc(fx * 3.3 + px * 1.65, fy * 3.3 + py * 1.65, 1.05, face - 0.6, face + 0.5);
  c.stroke();
  c.strokeStyle = '#4a4038';
  c.lineWidth = 1.25;
  c.beginPath();
  c.moveTo(tipX - px * 1.35, tipY - py * 1.35);
  c.lineTo(tipX + px * 1.35, tipY + py * 1.35);
  c.stroke();
  c.fillStyle = '#1c1c16';
  c.beginPath(); c.arc(tipX, tipY, 0.9, 0, 7); c.fill();
  if (stickGrenade) {
    drawStickGrenade(c, fx * 1.8 + py * 3.5, fy * 1.8 - px * 3.5, 0.72, face + 0.55);
  }
}

// Kar98k with hooded sight and sling — standard Wehrmacht rifleman loadout
function drawKar98kRifleman(c, fx, fy, gunLen, face) {
  drawKar98k(c, fx, fy, gunLen, face, false);
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const px = -fy, py = fx;
  c.fillStyle = '#3a3830';
  c.beginPath(); c.arc(tipX + fx * 0.35, tipY + fy * 0.35, 1.05, 0, 7); c.fill();
  c.fillStyle = '#2a2820';
  c.beginPath();
  c.moveTo(tipX - px * 0.75, tipY - py * 0.75);
  c.lineTo(tipX + fx * 0.85 - px * 1.15, tipY + fy * 0.85 - py * 1.15);
  c.lineTo(tipX + fx * 0.85 + px * 0.45, tipY + fy * 0.85 + py * 0.45);
  c.closePath(); c.fill();
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(fx * 1.1 - px * 2.3, fy * 1.1 + py * 2.3);
  c.quadraticCurveTo(-px * 1.8, py * 1.8, fx * (gunLen * 0.62) + px * 1.1, fy * (gunLen * 0.62) + py * 1.1);
  c.stroke();
  c.strokeStyle = '#6a5a42';
  c.lineWidth = 0.55;
  c.beginPath(); c.arc(fx * 1.1 - px * 2.3, fy * 1.1 + py * 2.3, 0.55, 0, 7); c.stroke();
}

function drawStripperClip(c, x, y, scale, rot) {
  scale = scale || 1;
  rot = rot != null ? rot : 0;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = '#c8a858';
  c.fillRect(-0.5 * scale, -1.8 * scale, 1 * scale, 3.6 * scale);
  c.strokeStyle = '#8a7a48';
  c.lineWidth = 0.4 * scale;
  c.strokeRect(-0.5 * scale, -1.8 * scale, 1 * scale, 3.6 * scale);
  for (let i = -1; i <= 1; i++) {
    c.fillStyle = '#a08838';
    c.fillRect(-0.35 * scale, i * 0.85 * scale - 0.3 * scale, 0.7 * scale, 0.45 * scale);
  }
  c.restore();
}

function drawErifleKit(c, fx, fy, face) {
  c.strokeStyle = '#3c3c33';
  c.lineWidth = 1.3;
  c.beginPath(); c.moveTo(-3, -3.2); c.lineTo(0, 2); c.lineTo(3, -3.2); c.stroke();
  c.strokeStyle = '#6a5a42';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(-fy * 4.4 - fx * 1, fx * 4.4 - fy * 1);
  c.lineTo(fy * 4.4 - fx * 1, -fx * 4.4 - fy * 1);
  c.stroke();
  c.strokeStyle = '#4a4038';
  c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(-6, 4); c.lineTo(6, 4); c.stroke();
  c.fillStyle = '#6a5a42';
  c.fillRect(-0.7, 3.4, 1.4, 1.2);
  for (const off of [-4.2, 4.2]) {
    c.fillStyle = '#3a3428';
    c.fillRect(off - 1.5, 3.5, 3, 2.8);
    c.strokeStyle = '#2a2820';
    c.lineWidth = 0.7;
    c.strokeRect(off - 1.5, 3.5, 3, 2.8);
    c.fillStyle = '#4a4038';
    c.beginPath(); c.arc(off, 4.2, 0.55, 0, 7); c.fill();
    drawStripperClip(c, off, 4.5, 0.55, 0);
  }
  c.fillStyle = '#5a5a48';
  c.beginPath(); c.ellipse(fy * 5.2, -fx * 5.2, 2.2, 2.8, face, 0, 7); c.fill();
  c.strokeStyle = '#3a3a30';
  c.lineWidth = 0.75;
  c.stroke();
  c.strokeStyle = '#4a4038';
  c.lineWidth = 0.9;
  c.beginPath();
  c.moveTo(fy * 5.2 - 1, -fx * 5.2 - 1.8);
  c.lineTo(fy * 5.2 + 1, -fx * 5.2 + 1.8);
  c.stroke();
  c.fillStyle = '#4a4a40';
  c.beginPath(); c.ellipse(-fy * 5.4, fx * 5.4, 1.5, 2.2, face, 0, 7); c.fill();
  c.fillStyle = '#6a5a42';
  c.beginPath(); c.ellipse(-fy * 5.4, fx * 5.4 - 1.8, 1.1, 0.7, face, 0, 7); c.fill();
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(-fy * 5.4, fx * 5.4 - 2.5);
  c.lineTo(-fy * 4.2, fx * 4.2 - 1);
  c.stroke();
  c.fillStyle = '#3a3a32';
  c.beginPath(); c.ellipse(-fy * 4.8, fx * 4.8, 2, 2.6, face + 0.3, 0, 7); c.fill();
  c.strokeStyle = '#2a2a24';
  c.lineWidth = 0.85;
  c.stroke();
  c.fillStyle = '#4a4a40';
  c.beginPath(); c.ellipse(-fy * 4.8, fx * 4.8 - 2, 1.3, 0.8, face + 0.3, 0, 7); c.fill();
  c.strokeStyle = '#4a4038';
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(fy * 2.5, -fx * 2.5);
  c.lineTo(fy * 4.8, -fx * 4.8 + 1.5);
  c.stroke();
  c.fillStyle = '#3a3428';
  c.beginPath(); c.ellipse(fy * 5.5, -fx * 5.5 + 1.2, 0.7, 1.2, face + 0.5, 0, 7); c.fill();
}

// Kar98k with Schiessbecher rifle-grenade discharger — the Axis grenadier's signature
function drawKar98kGrenadier(c, fx, fy, gunLen, face) {
  drawKar98k(c, fx, fy, gunLen, face, false);
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const px = -fy, py = fx;
  c.strokeStyle = '#4a4840';
  c.lineWidth = 1.85;
  c.beginPath();
  c.moveTo(tipX - px * 1.7, tipY - py * 1.7);
  c.lineTo(tipX + fx * 2.6 - px * 2.1, tipY + fy * 2.6 - py * 2.1);
  c.lineTo(tipX + fx * 2.6 + px * 2.1, tipY + fy * 2.6 + py * 2.1);
  c.lineTo(tipX + px * 1.7, tipY + py * 1.7);
  c.closePath(); c.stroke();
  c.fillStyle = '#3a3830';
  c.beginPath();
  c.moveTo(tipX - px * 1.4, tipY - py * 1.4);
  c.lineTo(tipX + fx * 2.1 - px * 1.7, tipY + fy * 2.1 - py * 1.7);
  c.lineTo(tipX + fx * 2.1 + px * 1.7, tipY + fy * 2.1 + py * 1.7);
  c.lineTo(tipX + px * 1.4, tipY + py * 1.4);
  c.closePath(); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  for (let i = -1; i <= 1; i++) {
    const vx = tipX + fx * 1.3 + px * i * 0.85;
    const vy = tipY + fy * 1.3 + py * i * 0.85;
    c.beginPath();
    c.moveTo(vx - px * 0.45, vy - py * 0.45);
    c.lineTo(vx + px * 0.45, vy + py * 0.45);
    c.stroke();
  }
  c.fillStyle = '#2a2a22';
  c.beginPath();
  c.arc(tipX + fx * 1.8, tipY + fy * 1.8, 1.1, 0, 7);
  c.fill();
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 0.8;
  c.beginPath();
  c.arc(tipX + fx * 1.8, tipY + fy * 1.8, 1.1, 0, 7);
  c.stroke();
}

function drawEgrenKit(c, fx, fy, face) {
  c.strokeStyle = '#4a4438';
  c.lineWidth = 1.35;
  c.beginPath(); c.moveTo(-3.2, -3.5); c.lineTo(0, 2.2); c.lineTo(3.2, -3.5); c.stroke();
  c.strokeStyle = '#7a6848';
  c.lineWidth = 1.55;
  c.beginPath();
  c.moveTo(-fy * 5.5 - fx * 1.8, fx * 5.5 - fy * 1.8);
  c.lineTo(fy * 5.5 - fx * 1.8, -fx * 5.5 - fy * 1.8);
  c.stroke();
  c.fillStyle = '#4a4a3c';
  c.beginPath(); c.ellipse(fy * 5.2, -fx * 5.2, 2.8, 3.6, face, 0, 7); c.fill();
  c.strokeStyle = '#3a3a30';
  c.lineWidth = 0.85;
  c.stroke();
  drawStickGrenade(c, fy * 5.2 - 0.8, -fx * 5.2 - 1.5, 0.62, face - 0.2);
  drawStickGrenade(c, fy * 5.2 + 1.2, -fx * 5.2 + 0.5, 0.58, face + 0.35);
  drawStickGrenade(c, -6.2, 2.2, 0.88, face - 0.4);
  drawStickGrenade(c, -4, 5.2, 0.8, face + 0.1);
  drawStickGrenade(c, -0.8, 5.8, 0.76, face + 0.45);
  drawStickGrenade(c, 3.5, 4.8, 0.72, face + 0.75);
  c.strokeStyle = '#3c3830';
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(-6, 4.2); c.lineTo(6, 4.2); c.stroke();
  c.fillStyle = '#6a5a42';
  c.fillRect(-0.8, 3.5, 1.6, 1.4);
  c.fillStyle = '#3a3428';
  c.beginPath(); c.ellipse(-fy * 4.5, fx * 4.5, 1.6, 2.4, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.7;
  c.stroke();
  c.fillStyle = '#4a4a40';
  c.fillRect(-5.5, 3.8, 2.4, 2.2);
  c.fillRect(4.2, 3.8, 2.4, 2.2);
  c.strokeStyle = '#2a2e24';
  c.lineWidth = 0.65;
  c.strokeRect(-5.5, 3.8, 2.4, 2.2);
  c.strokeRect(4.2, 3.8, 2.4, 2.2);
}

function drawMP40Mag(c, x, y, scale, rot) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(scale, scale);
  c.fillStyle = '#3a3830';
  c.fillRect(-1.1, -2.4, 2.2, 4.8);
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  c.strokeRect(-1.1, -2.4, 2.2, 4.8);
  c.strokeStyle = '#4a4840';
  c.lineWidth = 0.45;
  for (const sy of [-1.4, -0.4, 0.6]) {
    c.beginPath(); c.moveTo(-0.85, sy); c.lineTo(0.85, sy); c.stroke();
  }
  c.fillStyle = '#2a2820';
  c.fillRect(-0.55, 2.2, 1.1, 0.55);
  c.restore();
}

// MP40 — perforated shroud, side mag, wire folding stock
function drawMP40(c, fx, fy, gunLen, face) {
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const px = -fy, py = fx;
  c.strokeStyle = '#26261e';
  c.lineWidth = 2.35;
  c.beginPath();
  c.moveTo(fx * 2, fy * 2);
  c.lineTo(tipX, tipY);
  c.stroke();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 0.75;
  for (let t = 0.22; t <= 0.88; t += 0.11) {
    const sx = fx * (gunLen * t), sy = fy * (gunLen * t);
    c.beginPath();
    c.moveTo(sx - px * 1.45, sy - py * 1.45);
    c.lineTo(sx + px * 1.45, sy + py * 1.45);
    c.stroke();
  }
  c.strokeStyle = '#4a4038';
  c.lineWidth = 1.85;
  c.beginPath();
  c.moveTo(fx * 2.2 + px * 1.35, fy * 2.2 + py * 1.35);
  c.lineTo(fx * (gunLen * 0.72) + px * 1.35, fy * (gunLen * 0.72) + py * 1.35);
  c.stroke();
  c.fillStyle = '#3a3830';
  c.beginPath();
  c.moveTo(fx * 2.8 - px * 1.55, fy * 2.8 - py * 1.55);
  c.lineTo(fx * 2.8 - px * 3.35, fy * 2.8 - py * 3.35);
  c.lineTo(fx * 3.6 - px * 3.35, fy * 3.6 - py * 3.35);
  c.lineTo(fx * 3.6 - px * 1.55, fy * 3.6 - py * 1.55);
  c.closePath(); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  c.stroke();
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 1.55;
  c.beginPath();
  c.moveTo(fx * 2.1 + px * 1.85, fy * 2.1 + py * 1.85);
  c.lineTo(fx * 2.1 + px * 4.2, fy * 2.1 + py * 4.2);
  c.stroke();
  c.strokeStyle = '#4a4038';
  c.lineWidth = 1.15;
  c.beginPath();
  c.moveTo(fx * 2.1 + px * 4.2, fy * 2.1 + py * 4.2);
  c.lineTo(fx * 0.4 + px * 4.2, fy * 0.4 + py * 4.2);
  c.stroke();
  c.beginPath();
  c.moveTo(fx * 0.4 + px * 4.2, fy * 0.4 + py * 4.2);
  c.lineTo(fx * 0.4 + px * 2.4, fy * 0.4 + py * 2.4);
  c.stroke();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 0.95;
  c.beginPath();
  c.arc(fx * 2.5 + px * 2.15, fy * 2.5 + py * 2.15, 1.05, face - 0.55, face + 0.45);
  c.stroke();
  c.fillStyle = '#1c1c16';
  c.beginPath(); c.arc(tipX, tipY, 0.85, 0, 7); c.fill();
}

function drawEsmgKit(c, fx, fy, face) {
  c.strokeStyle = '#3c3c33';
  c.lineWidth = 1.35;
  c.beginPath(); c.moveTo(-3.2, -3.5); c.lineTo(0, 2.2); c.lineTo(3.2, -3.5); c.stroke();
  c.strokeStyle = '#6a5a42';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(-fy * 4.8 - fx * 1.2, fx * 4.8 - fy * 1.2);
  c.lineTo(fy * 4.8 - fx * 1.2, -fx * 4.8 - fy * 1.2);
  c.stroke();
  c.fillStyle = '#4a4a3c';
  c.beginPath(); c.ellipse(fy * 4.5, -fx * 4.5, 2.6, 3.2, face, 0, 7); c.fill();
  c.strokeStyle = '#3a3a30';
  c.lineWidth = 0.8;
  c.stroke();
  drawMP40Mag(c, fy * 4.2, -fx * 4.2 - 1.2, 0.58, face - 0.15);
  drawMP40Mag(c, fy * 4.2 + 1.4, -fx * 4.2 + 0.6, 0.54, face + 0.25);
  for (const off of [-4.5, 4.5]) {
    c.fillStyle = '#3a3428';
    c.fillRect(off - 1.4, 3.6, 2.8, 2.6);
    c.strokeStyle = '#2a2820';
    c.lineWidth = 0.65;
    c.strokeRect(off - 1.4, 3.6, 2.8, 2.6);
    drawMP40Mag(c, off, 4.4, 0.52, 0);
  }
  drawStickGrenade(c, -fy * 5.2, fx * 5.2, 0.72, face + 0.55);
  drawStickGrenade(c, fy * 3.2, -fx * 3.2 + 1.5, 0.65, face - 0.35);
  c.strokeStyle = '#3c3830';
  c.lineWidth = 1.45;
  c.beginPath(); c.moveTo(-6, 4.2); c.lineTo(6, 4.2); c.stroke();
  c.fillStyle = '#6a5a42';
  c.fillRect(-0.8, 3.5, 1.6, 1.4);
  c.fillStyle = '#3a3428';
  c.beginPath(); c.ellipse(-fy * 4.8, fx * 4.8, 1.5, 2.2, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.7;
  c.stroke();
  c.fillStyle = '#4a4a40';
  c.fillRect(-5.8, 3.8, 2.2, 2);
  c.strokeStyle = '#2a2e24';
  c.lineWidth = 0.6;
  c.strokeRect(-5.8, 3.8, 2.2, 2);
}

// M1A1 bazooka — shoulder-mounted tube with grips, wire sight, and flare ring
function drawBazooka(c, fx, fy, face) {
  const px = -fy, py = fx;
  const shoulderX = fx * 2.5 + px * 2.2;
  const shoulderY = fy * 2.5 + py * 2.2;
  const tubeLen = 14;
  const tipX = shoulderX + fx * tubeLen;
  const tipY = shoulderY + fy * tubeLen;

  c.strokeStyle = '#4a4038';
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(shoulderX - fx * 2.8, shoulderY - fy * 2.8);
  c.lineTo(shoulderX - fx * 5.5 - px * 1.2, shoulderY - fy * 5.5 - py * 1.2);
  c.stroke();
  c.fillStyle = '#3a3830';
  c.beginPath();
  c.ellipse(shoulderX - fx * 4 + px * 0.5, shoulderY - fy * 4 + py * 0.5, 1.8, 2.2, face, 0, 7);
  c.fill();

  c.strokeStyle = '#4a5240';
  c.lineWidth = 5.2;
  c.beginPath();
  c.moveTo(shoulderX, shoulderY);
  c.lineTo(tipX, tipY);
  c.stroke();
  c.strokeStyle = '#3a4034';
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(shoulderX + fx * 1.5, shoulderY + fy * 1.5);
  c.lineTo(tipX - fx * 0.8, tipY - fy * 0.8);
  c.stroke();

  const grip1X = shoulderX + fx * 10;
  const grip1Y = shoulderY + fy * 10;
  c.strokeStyle = '#3a4034';
  c.lineWidth = 2.1;
  c.beginPath();
  c.moveTo(grip1X + px * 2.8, grip1Y + py * 2.8);
  c.lineTo(grip1X + px * 4.5, grip1Y + py * 4.5);
  c.stroke();
  const grip2X = shoulderX + fx * 5.5;
  const grip2Y = shoulderY + fy * 5.5;
  c.beginPath();
  c.moveTo(grip2X + px * 2.2, grip2Y + py * 2.2);
  c.lineTo(grip2X + px * 4, grip2Y + py * 4);
  c.stroke();

  c.strokeStyle = '#5a5c48';
  c.lineWidth = 1.3;
  const sightX = shoulderX + fx * 8;
  const sightY = shoulderY + fy * 8;
  c.beginPath();
  c.moveTo(sightX - px * 0.5, sightY - py * 0.5);
  c.lineTo(sightX - px * 0.5 - fx * 1.8, sightY - py * 0.5 - fy * 1.8);
  c.stroke();
  c.beginPath();
  c.moveTo(sightX + px * 0.8, sightY + py * 0.8);
  c.lineTo(sightX + px * 0.8 - fx * 1.2, sightY + py * 0.8 - fy * 1.2);
  c.stroke();
  c.beginPath();
  c.moveTo(sightX - px * 0.5 - fx * 1.8, sightY - py * 0.5 - fy * 1.8);
  c.lineTo(sightX + px * 0.8 - fx * 1.2, sightY + py * 0.8 - fy * 1.2);
  c.stroke();

  c.strokeStyle = '#5a5c48';
  c.lineWidth = 2.6;
  c.beginPath();
  c.moveTo(tipX - px * 2.2, tipY - py * 2.2);
  c.lineTo(tipX + fx * 0.5, tipY + fy * 0.5);
  c.lineTo(tipX + px * 2.2, tipY + py * 2.2);
  c.stroke();
  c.fillStyle = '#1c1c16';
  c.beginPath(); c.arc(tipX, tipY, 1.4, 0, 7); c.fill();
}

// Panzerfaust 60 — short tube, oversized warhead, flip-up sight
function drawPanzerfaust(c, fx, fy, face) {
  const px = -fy, py = fx;
  const shoulderX = fx * 2.5 + px * 2.2;
  const shoulderY = fy * 2.5 + py * 2.2;
  const tubeLen = 10;
  const tipX = shoulderX + fx * tubeLen;
  const tipY = shoulderY + fy * tubeLen;

  c.strokeStyle = '#5a4a38';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(shoulderX - fx * 2, shoulderY - fy * 2);
  c.lineTo(shoulderX - fx * 4.2 - px * 0.8, shoulderY - fy * 4.2 - py * 0.8);
  c.stroke();

  c.strokeStyle = '#4a4c42';
  c.lineWidth = 3.6;
  c.beginPath();
  c.moveTo(shoulderX, shoulderY);
  c.lineTo(tipX, tipY);
  c.stroke();
  c.strokeStyle = '#3a3c34';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(shoulderX + fx * 1, shoulderY + fy * 1);
  c.lineTo(tipX - fx * 0.5, tipY - fy * 0.5);
  c.stroke();

  const headX = tipX + fx * 2.2;
  const headY = tipY + fy * 2.2;
  c.fillStyle = '#4a4a42';
  c.beginPath();
  c.ellipse(headX, headY, 2.8, 4.2, face, 0, 7);
  c.fill();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 0.9;
  c.stroke();
  c.fillStyle = '#3a3830';
  c.beginPath();
  c.ellipse(headX + fx * 2.5, headY + fy * 2.5, 1.6, 2.4, face, 0, 7);
  c.fill();

  c.strokeStyle = '#5a5c48';
  c.lineWidth = 1.1;
  const sightX = shoulderX + fx * 5.5;
  const sightY = shoulderY + fy * 5.5;
  c.beginPath();
  c.moveTo(sightX - px * 0.4, sightY - py * 0.4);
  c.lineTo(sightX - px * 0.4 - fx * 1.4, sightY - py * 0.4 - fy * 1.4);
  c.stroke();
  c.beginPath();
  c.moveTo(sightX + px * 0.6, sightY + py * 0.6);
  c.lineTo(sightX + px * 0.6 - fx * 1, sightY + py * 0.6 - fy * 1);
  c.stroke();

  const gripX = shoulderX + fx * 4.5;
  const gripY = shoulderY + fy * 4.5;
  c.strokeStyle = '#3a3830';
  c.lineWidth = 1.85;
  c.beginPath();
  c.moveTo(gripX + px * 2, gripY + py * 2);
  c.lineTo(gripX + px * 3.6, gripY + py * 3.6);
  c.stroke();
}

function drawSpareRocketTube(c, x1, y1, x2, y2) {
  c.strokeStyle = '#5a5c42';
  c.lineWidth = 2.6;
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.fillStyle = '#1c1c16';
  c.beginPath(); c.arc(x2, y2, 1.4, 0, 7); c.fill();
}

function drawBazookaKit(c, fx, fy, face) {
  c.strokeStyle = '#8a7a48';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(-fy * 5.2 - fx * 1.2, fx * 5.2 - fy * 1.2);
  c.lineTo(fy * 5.2 - fx * 1.2, -fx * 5.2 - fy * 1.2);
  c.stroke();
  drawSpareRocketTube(c, -8, -4, 8, -6.5);
  c.strokeStyle = '#4a4a40';
  c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(-4, -5); c.lineTo(4, -5.8); c.stroke();
  c.fillStyle = '#3a4034';
  c.beginPath(); c.ellipse(-fy * 5, fx * 5, 2.4, 3, face, 0, 7); c.fill();
  c.strokeStyle = '#4a4a3e';
  c.lineWidth = 0.75;
  c.stroke();
  c.fillStyle = '#3a3428';
  c.beginPath(); c.ellipse(fy * 4.2, -fx * 4.2, 1.5, 2.2, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  c.stroke();
  c.fillStyle = '#2a2820';
  c.fillRect(-fy * 3.8 - 0.5, fx * 3.8 - 1.2, 1, 2.4);
}

function drawEbazookaKit(c, fx, fy, face) {
  c.fillStyle = '#46443c';
  c.beginPath(); c.ellipse(fx * 1.2, fy * 1.2, 6.4, 5.4, face, 0, 7); c.fill();
  c.strokeStyle = '#2e2c28';
  c.lineWidth = 0.9;
  c.stroke();
  c.fillStyle = '#4a4a42';
  c.beginPath(); c.ellipse(fx * 2.5, fy * 2.5, 1.8, 1.2, face, 0, 7); c.fill();
  c.beginPath(); c.ellipse(-fx * 2.5, fy * 2.5, 1.8, 1.2, face, 0, 7); c.fill();
  c.strokeStyle = '#6a5a42';
  c.lineWidth = 1.35;
  c.beginPath();
  c.moveTo(-fy * 5.5 - fx * 1.5, fx * 5.5 - fy * 1.5);
  c.lineTo(fy * 4.5 - fx * 1.5, -fx * 4.5 - fy * 1.5);
  c.stroke();
  c.beginPath();
  c.moveTo(-fy * 4.5 + fx * 1.5, fx * 4.5 + fy * 1.5);
  c.lineTo(fy * 5.5 + fx * 1.5, -fx * 5.5 + fy * 1.5);
  c.stroke();
  drawSpareRocketTube(c, -7.5, -3.5, 7, -7);
  drawSpareRocketTube(c, -6.5, 3.5, 6.5, 7);
  c.fillStyle = '#4a4a42';
  c.beginPath(); c.arc(7, -7, 1.8, 0, 7); c.fill();
  c.beginPath(); c.arc(6.5, 7, 1.6, 0, 7); c.fill();
  drawStickGrenade(c, fy * 4.2, -fx * 4.2, 0.68, face + 0.35);
  c.strokeStyle = '#3c3830';
  c.lineWidth = 1.45;
  c.beginPath(); c.moveTo(-6, 4.2); c.lineTo(6, 4.2); c.stroke();
  c.fillStyle = '#6a5a42';
  c.fillRect(-0.8, 3.5, 1.6, 1.4);
  c.fillStyle = '#3a3428';
  c.beginPath(); c.ellipse(-fy * 4.8, fx * 4.8, 1.5, 2.2, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.7;
  c.stroke();
}

// Flammenwerfer 41 lance — rifle stock, thin lance tube, igniter box, funnel nozzle
function drawFlammenwerfer(c, fx, fy, gunLen, face, lit) {
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const px = -fy, py = fx;
  c.strokeStyle = '#4a4030';
  c.lineWidth = 2.15;
  c.beginPath();
  c.moveTo(fx * 1.1 - px * 2.5, fy * 1.1 - py * 2.5);
  c.lineTo(fx * 2.6 - px * 2.2, fy * 2.6 - py * 2.2);
  c.stroke();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 2.65;
  c.beginPath();
  c.moveTo(fx * 2.4, fy * 2.4);
  c.lineTo(tipX, tipY);
  c.stroke();
  c.strokeStyle = '#2e2c24';
  c.lineWidth = 0.8;
  for (let t = 0.32; t <= 0.82; t += 0.14) {
    const sx = fx * (gunLen * t), sy = fy * (gunLen * t);
    c.beginPath();
    c.moveTo(sx - px * 1.05, sy - py * 1.05);
    c.lineTo(sx + px * 1.05, sy + py * 1.05);
    c.stroke();
  }
  const ignX = fx * (gunLen * 0.58), ignY = fy * (gunLen * 0.58);
  c.fillStyle = '#3a3830';
  c.beginPath();
  c.moveTo(ignX - px * 1.5 - fx * 0.8, ignY - py * 1.5 - fy * 0.8);
  c.lineTo(ignX + px * 1.5 - fx * 0.8, ignY + py * 1.5 - fy * 0.8);
  c.lineTo(ignX + px * 1.5 + fx * 0.8, ignY + py * 1.5 + fy * 0.8);
  c.lineTo(ignX - px * 1.5 + fx * 0.8, ignY - py * 1.5 + fy * 0.8);
  c.closePath(); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  c.stroke();
  c.strokeStyle = '#4a3f32';
  c.lineWidth = 1.85;
  c.beginPath();
  c.moveTo(fx * 3 + px * 1.35, fy * 3 + py * 1.35);
  c.lineTo(fx * 3 + px * 3.2, fy * 3 + py * 3.2);
  c.stroke();
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 2.35;
  c.beginPath();
  c.moveTo(tipX - px * 2.1, tipY - py * 2.1);
  c.lineTo(tipX + fx * 1.6, tipY + fy * 1.6);
  c.lineTo(tipX + px * 2.1, tipY + py * 2.1);
  c.stroke();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 1.85;
  c.beginPath();
  c.moveTo(-6, 0);
  c.quadraticCurveTo(-fy * 3.5 + fx * 0.8, fx * 3.5 + fy * 0.8, fx * 2.8, fy * 2.8);
  c.stroke();
  c.strokeStyle = '#1e1c18';
  c.lineWidth = 0.85;
  c.beginPath();
  c.moveTo(-6, 0);
  c.quadraticCurveTo(-fy * 3.5 + fx * 0.8, fx * 3.5 + fy * 0.8, fx * 2.8, fy * 2.8);
  c.stroke();
  const nozX = tipX + fx * 1.3, nozY = tipY + fy * 1.3;
  if (lit) {
    c.shadowColor = '#ff6820';
    c.shadowBlur = 10;
    c.fillStyle = '#fff4b0';
    c.beginPath(); c.arc(nozX, nozY, 2.8, 0, 7); c.fill();
    c.shadowBlur = 0;
    c.fillStyle = '#ff9a28';
    c.beginPath(); c.arc(nozX, nozY, 1.6, 0, 7); c.fill();
  } else {
    c.fillStyle = '#8a4020';
    c.beginPath(); c.arc(nozX, nozY, 1.35, 0, 7); c.fill();
    c.fillStyle = '#ff7020';
    c.beginPath(); c.arc(nozX, nozY, 0.65, 0, 7); c.fill();
  }
}

function drawEflameKit(c, fx, fy, face) {
  const tankX = -6.4;
  for (const ty of [-2.6, 2.6]) {
    c.fillStyle = '#6a6a58';
    c.beginPath(); c.ellipse(tankX, ty, 4.1, 2.15, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.42)';
    c.lineWidth = 0.85;
    c.stroke();
    c.fillStyle = '#5a5a4e';
    c.beginPath(); c.ellipse(tankX - 3.6, ty, 0.75, 1.1, 0, 0, 7); c.fill();
    c.strokeStyle = '#b8261c';
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(tankX - 1.8, ty - 0.35);
    c.lineTo(tankX + 0.4, ty - 0.35);
    c.lineTo(tankX + 0.4, ty + 0.35);
    c.lineTo(tankX - 1.8, ty + 0.35);
    c.stroke();
  }
  c.fillStyle = '#4a4a42';
  c.beginPath(); c.ellipse(tankX + 0.8, 0, 1.8, 1.35, 0, 0, 7); c.fill();
  c.strokeStyle = '#3a3a34';
  c.lineWidth = 0.75;
  c.stroke();
  c.strokeStyle = '#3c3830';
  c.lineWidth = 1.45;
  c.beginPath(); c.moveTo(tankX - 2.5, -5.2); c.lineTo(tankX + 2.5, 5.2); c.stroke();
  c.beginPath(); c.moveTo(tankX + 2.5, -5.2); c.lineTo(tankX - 2.5, 5.2); c.stroke();
  c.strokeStyle = '#4a4038';
  c.lineWidth = 1.15;
  c.beginPath();
  c.moveTo(tankX - 1.5, -4.5);
  c.quadraticCurveTo(-2, fy * 2.5, fx * 2.8, fy * 2.8);
  c.stroke();
  c.fillStyle = '#3a3830';
  c.beginPath(); c.ellipse(fy * 3.8, -fx * 3.8, 1.5, 2.1, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  c.stroke();
  c.fillStyle = '#4a4840';
  c.fillRect(fy * 3.4 - 0.9, -fx * 3.4 - 0.7, 1.8, 1.4);
  c.strokeStyle = '#6a5a42';
  c.lineWidth = 0.55;
  c.beginPath(); c.moveTo(fy * 3.4, -fx * 3.4); c.lineTo(fy * 4.2, -fx * 4.2 + 0.8); c.stroke();
  c.fillStyle = '#3a3428';
  c.beginPath(); c.ellipse(-fy * 4.6, fx * 4.6, 1.4, 2, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  c.stroke();
  c.fillStyle = '#5a5a50';
  c.beginPath(); c.ellipse(fx * 4.2, fy * 4.2, 1.6, 2.2, face, 0, 7); c.fill();
  c.beginPath(); c.ellipse(-fx * 3.8, fy * 3.8, 1.5, 2.1, face, 0, 7); c.fill();
  c.strokeStyle = '#4a4840';
  c.lineWidth = 0.6;
  c.beginPath();
  c.arc(fy * 5.2, -fx * 5.2, 1.1, face - 0.4, face + 0.9);
  c.stroke();
}

function drawMG42BeltLink(c, x, y, scale, rot) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(scale, scale);
  c.fillStyle = '#6a5a38';
  for (let i = 0; i < 3; i++) {
    const lx = i * 1.5 - 1.5;
    c.beginPath();
    c.moveTo(lx - 0.45, -0.35);
    c.lineTo(lx + 0.45, -0.35);
    c.lineTo(lx + 0.55, 0.35);
    c.lineTo(lx - 0.35, 0.35);
    c.closePath(); c.fill();
    c.strokeStyle = '#4a4030';
    c.lineWidth = 0.45;
    c.stroke();
    c.fillStyle = '#c8a858';
    c.beginPath(); c.arc(lx, 0, 0.22, 0, 7); c.fill();
    c.fillStyle = '#6a5a38';
  }
  c.restore();
}

// MG42 — ventilated barrel jacket, belt feed, Lafette bipod, booster muzzle
function drawMG42(c, fx, fy, gunLen, face) {
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const px = -fy, py = fx;
  c.strokeStyle = '#26261e';
  c.lineWidth = 3.15;
  c.beginPath();
  c.moveTo(fx * 2, fy * 2);
  c.lineTo(tipX, tipY);
  c.stroke();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 0.72;
  for (let t = 0.18; t <= 0.88; t += 0.07) {
    const sx = fx * (gunLen * t), sy = fy * (gunLen * t);
    c.beginPath();
    c.moveTo(sx - px * 1.55, sy - py * 1.55);
    c.lineTo(sx + px * 1.55, sy + py * 1.55);
    c.stroke();
  }
  c.strokeStyle = '#4a4030';
  c.lineWidth = 1.95;
  c.beginPath();
  c.moveTo(fx * 1.15 - px * 2.4, fy * 1.15 - py * 2.4);
  c.lineTo(fx * 2.4 - px * 2.2, fy * 2.4 - py * 2.2);
  c.stroke();
  c.strokeStyle = '#4a3f32';
  c.lineWidth = 1.85;
  c.beginPath();
  c.moveTo(fx * 3.1 + px * 1.45, fy * 3.1 + py * 1.45);
  c.lineTo(fx * 3.1 + px * 3.8, fy * 3.1 + py * 3.8);
  c.stroke();
  c.strokeStyle = '#6b5a38';
  c.lineWidth = 1.25;
  c.beginPath();
  c.moveTo(-fy * 7.2, fx * 7.2);
  c.quadraticCurveTo(fx * 2 - fy * 3.2, fy * 2 + fx * 3.2, fx * 3.1, fy * 3.1);
  c.stroke();
  c.fillStyle = '#3a3828';
  c.beginPath(); c.arc(-fy * 6.2, fx * 6.2, 2.15, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  c.stroke();
  drawMG42BeltLink(c, -fy * 5.8, fx * 5.8, 0.55, face + 0.4);
  c.strokeStyle = '#26261e';
  c.lineWidth = 1.25;
  for (const ang of [-0.85, 0, 0.85]) {
    c.beginPath();
    c.moveTo(tipX, tipY);
    c.lineTo(
      tipX + Math.cos(face + ang + 0.38) * 5.2,
      tipY + Math.sin(face + ang + 0.38) * 5.2,
    );
    c.stroke();
  }
  c.strokeStyle = '#4a4038';
  c.lineWidth = 2.15;
  c.beginPath();
  c.moveTo(tipX - px * 1.75, tipY - py * 1.75);
  c.lineTo(tipX + px * 0.55, tipY + py * 0.55);
  c.stroke();
  c.fillStyle = '#1c1c16';
  c.beginPath(); c.arc(tipX, tipY, 1.05, 0, 7); c.fill();
}

function drawEmgKit(c, fx, fy, face) {
  c.strokeStyle = '#3c3c33';
  c.lineWidth = 1.35;
  c.beginPath(); c.moveTo(-3.2, -3.5); c.lineTo(0, 2.2); c.lineTo(3.2, -3.5); c.stroke();
  c.fillStyle = '#4a4a3c';
  c.beginPath(); c.ellipse(-fy * 5.4, fx * 5.4, 3.1, 3.8, face, 0, 7); c.fill();
  c.strokeStyle = '#3a3a30';
  c.lineWidth = 0.85;
  c.stroke();
  c.strokeStyle = '#5a5a48';
  c.lineWidth = 0.75;
  c.beginPath();
  c.moveTo(-fy * 5.4 - 1.2, fx * 5.4 - 1.5);
  c.lineTo(-fy * 5.4 + 1.2, fx * 5.4 + 1.5);
  c.stroke();
  c.fillStyle = '#6a5a42';
  c.fillRect(-fy * 5.4 - 0.6, fx * 5.4 - 2.2, 1.2, 1.4);
  c.strokeStyle = '#6a5a42';
  c.lineWidth = 1.45;
  c.beginPath();
  c.moveTo(-fy * 5 - fx * 1.4, fx * 5 - fy * 1.4);
  c.lineTo(fy * 4.8 - fx * 1.4, -fx * 4.8 - fy * 1.4);
  c.stroke();
  drawMG42BeltLink(c, -fy * 4.2, fx * 4.2, 0.62, face - 0.2);
  drawMG42BeltLink(c, fy * 3.5, -fx * 3.5, 0.58, face + 0.45);
  drawMG42BeltLink(c, -2.5, 4.8, 0.54, 0.15);
  c.strokeStyle = '#4a4840';
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(-fy * 4.5, fx * 4.5);
  c.lineTo(fy * 3.8, -fx * 3.8 + 1.5);
  c.stroke();
  c.fillStyle = '#3a3830';
  c.beginPath();
  c.moveTo(fy * 3.2, -fx * 3.2 + 1.2);
  c.lineTo(fy * 4.8, -fx * 4.8 + 0.5);
  c.lineTo(fy * 4.5, -fx * 4.5 + 2.2);
  c.closePath(); c.fill();
  c.fillStyle = '#3a3428';
  c.beginPath(); c.ellipse(-fy * 4.6, fx * 4.6, 1.5, 2.2, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.7;
  c.stroke();
  c.fillStyle = '#4a4a40';
  c.fillRect(4.2, 3.8, 2.4, 2.2);
  c.strokeStyle = '#2a2e24';
  c.lineWidth = 0.6;
  c.strokeRect(4.2, 3.8, 2.4, 2.2);
  c.fillStyle = '#3a3830';
  c.fillRect(-6, 3.8, 2.8, 2.4);
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  c.strokeRect(-6, 3.8, 2.8, 2.4);
}

function drawRiflemanKit(c, fx, fy, face, us) {
  c.strokeStyle = '#8a7a48';
  c.lineWidth = 1.45;
  c.beginPath();
  c.moveTo(-fy * 4.6 - fx * 1.1, fx * 4.6 - fy * 1.1);
  c.lineTo(fy * 4.6 - fx * 1.1, -fx * 4.6 - fy * 1.1);
  c.stroke();
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 1.85;
  c.beginPath(); c.moveTo(-5.5, 4.1); c.lineTo(5.5, 4.1); c.stroke();
  for (const off of [-4.2, -1.4, 1.4, 4.2]) {
    c.fillStyle = us ? '#3a4034' : '#4a4a40';
    c.fillRect(off - 1.35, 3.7, 2.7, 2.5);
    c.strokeStyle = '#2a2e24';
    c.lineWidth = 0.65;
    c.strokeRect(off - 1.35, 3.7, 2.7, 2.5);
    if (us) {
      c.fillStyle = '#c8a858';
      c.fillRect(off - 0.9, 4.1, 0.55, 1.2);
      c.fillRect(off + 0.35, 4.1, 0.55, 1.2);
    }
  }
  c.fillStyle = us ? '#4a5245' : '#5a5a50';
  c.beginPath(); c.ellipse(-fy * 5.6, fx * 5.6, 1.85, 2.35, face, 0, 7); c.fill();
  c.strokeStyle = '#3a4034';
  c.lineWidth = 0.75;
  c.stroke();
  c.fillStyle = us ? '#6a5a40' : '#4a4a40';
  c.beginPath(); c.arc(-fy * 5.6, fx * 5.6, 0.55, 0, 7); c.fill();
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 1.25;
  c.beginPath();
  c.moveTo(fy * 5.1, -fx * 5.1);
  c.lineTo(fy * 6.4, -fx * 6.4);
  c.stroke();
  c.fillStyle = '#5a4a38';
  c.beginPath(); c.arc(fy * 6.4, -fx * 6.4, 0.75, 0, 7); c.fill();
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 1.15;
  c.beginPath();
  c.moveTo(-fy * 3.2, fx * 3.2);
  c.quadraticCurveTo(0, 5.8, fy * 3.2, -fx * 3.2);
  c.stroke();
}

function drawScopedRifle(c, fx, fy, gunLen, face, us) {
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const perpX = -fy, perpY = fx;
  c.strokeStyle = '#26261e';
  c.lineWidth = 1.7;
  c.beginPath();
  c.moveTo(fx * 2, fy * 2);
  c.lineTo(tipX, tipY);
  c.stroke();
  c.strokeStyle = us ? '#4a3f2e' : '#5a4a38';
  c.lineWidth = 2.1;
  c.beginPath();
  c.moveTo(fx * 1.1 - fy * 2.5, fy * 1.1 + fx * 2.5);
  c.lineTo(fx * 1.1 + fy * 2.2, fy * 1.1 - fx * 2.2);
  c.stroke();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(fx * 4.2 + fy * 1.6, fy * 4.2 - fx * 1.6);
  c.lineTo(fx * 5.4 + fy * 2.6, fy * 5.4 - fx * 2.6);
  c.stroke();
  const scBaseX = fx * (gunLen * 0.44) + perpX * 2.1;
  const scBaseY = fy * (gunLen * 0.44) + perpY * 2.1;
  c.strokeStyle = '#1a1a14';
  c.lineWidth = 2.3;
  c.beginPath();
  c.moveTo(scBaseX, scBaseY);
  c.lineTo(scBaseX + fx * 4.2, scBaseY + fy * 4.2);
  c.stroke();
  c.fillStyle = '#2a2a22';
  c.beginPath(); c.arc(scBaseX + fx * 4.4, scBaseY + fy * 4.4, 1.25, 0, 7); c.fill();
  c.beginPath(); c.arc(scBaseX - fx * 0.6, scBaseY - fy * 0.6, 0.95, 0, 7); c.fill();
  c.fillStyle = us ? 'rgba(130,170,190,0.5)' : 'rgba(150,150,140,0.42)';
  c.beginPath(); c.arc(scBaseX + fx * 3.8, scBaseY + fy * 3.8, 0.55, 0, 7); c.fill();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 0.85;
  for (const t of [0.32, 0.5]) {
    const mx = fx * (gunLen * t), my = fy * (gunLen * t);
    c.beginPath();
    c.moveTo(mx, my);
    c.lineTo(mx + perpX * 1.9, my + perpY * 1.9);
    c.stroke();
  }
  c.strokeStyle = '#4a4038';
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(tipX - fy * 1.1, tipY + fx * 1.1);
  c.lineTo(tipX + fy * 1.1, tipY - fx * 1.1);
  c.stroke();
  c.strokeStyle = '#26261e';
  c.lineWidth = 1.15;
  const bipX = fx * (gunLen * 0.7), bipY = fy * (gunLen * 0.7);
  for (const s of [0.85, -0.85]) {
    c.beginPath();
    c.moveTo(bipX, bipY);
    c.lineTo(bipX + Math.cos(face + s) * 3.8, bipY + Math.sin(face + s) * 3.8);
    c.stroke();
  }
}

// Kar98k with ZF39 high-mount scope — the German sniper's signature
function drawKar98kSniper(c, fx, fy, gunLen, face) {
  drawKar98k(c, fx, fy, gunLen, face, false);
  const px = -fy, py = fx;
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const scBaseX = fx * (gunLen * 0.38) + px * 2.4;
  const scBaseY = fy * (gunLen * 0.38) + py * 2.4;
  c.fillStyle = '#3a3830';
  c.beginPath();
  c.moveTo(scBaseX - px * 0.55, scBaseY - py * 0.55);
  c.lineTo(scBaseX + fx * 0.85 + px * 0.45, scBaseY + fy * 0.85 + py * 0.45);
  c.lineTo(scBaseX + fx * 0.85 - px * 0.45, scBaseY + fy * 0.85 - py * 0.45);
  c.closePath(); c.fill();
  c.strokeStyle = '#1a1a14';
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(scBaseX, scBaseY);
  c.lineTo(scBaseX + fx * 5.2, scBaseY + fy * 5.2);
  c.stroke();
  c.fillStyle = '#2a2a22';
  c.beginPath(); c.arc(scBaseX + fx * 5.4, scBaseY + fy * 5.4, 1.35, 0, 7); c.fill();
  c.beginPath(); c.arc(scBaseX - fx * 0.45, scBaseY - fy * 0.45, 1.05, 0, 7); c.fill();
  c.fillStyle = 'rgba(140,150,130,0.45)';
  c.beginPath(); c.arc(scBaseX + fx * 4.6, scBaseY + fy * 4.6, 0.6, 0, 7); c.fill();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 0.75;
  c.beginPath();
  c.moveTo(scBaseX + fx * 2.2 + px * 0.35, scBaseY + fy * 2.2 + py * 0.35);
  c.lineTo(scBaseX + fx * 3.8 + px * 0.35, scBaseY + fy * 3.8 + py * 0.35);
  c.stroke();
  c.fillStyle = '#4a3f32';
  c.beginPath(); c.ellipse(fx * 2.8 + px * 1.8, fy * 2.8 + py * 1.8, 1.2, 2, face, 0, 7); c.fill();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 1.15;
  const bipX = fx * (gunLen * 0.74), bipY = fy * (gunLen * 0.74);
  c.beginPath(); c.moveTo(bipX, bipY); c.lineTo(bipX + px * 2.6, bipY + py * 2.6); c.stroke();
  c.fillStyle = '#3a3830';
  c.beginPath(); c.arc(tipX + fx * 0.3, tipY + fy * 0.3, 0.95, 0, 7); c.fill();
}

function drawEsniperKit(c, fx, fy, face) {
  c.fillStyle = 'rgba(42,38,28,0.55)';
  for (const [px, py, rx, ry, rot] of [[-2.5, 1.2, 2.6, 1.6, 0.4], [2.8, -0.8, 2.2, 1.4, -0.6], [0, 3.2, 1.9, 1.2, 0.15],
    [-3.8, -0.8, 1.7, 1.1, 0.25], [3.5, 2.2, 1.5, 1, -0.35]]) {
    c.beginPath(); c.ellipse(px, py, rx, ry, rot, 0, 7); c.fill();
  }
  c.fillStyle = 'rgba(58,52,40,0.45)';
  c.beginPath(); c.ellipse(0, 0, 6.5, 5.5, face, 0, 7); c.fill();
  c.strokeStyle = 'rgba(72,64,48,0.6)';
  c.lineWidth = 0.75;
  for (const [sx, sy, ex, ey] of [[-4.5, 1.5, -6, 3.5], [3.5, -1.5, 5, -2.5], [-1.5, 4.5, 0, 6], [4.5, 0.5, 5.5, 2]]) {
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
  }
  c.strokeStyle = '#4a4840';
  c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(-fy * 3.2, fx * 3.2); c.lineTo(-fy * 4.5, fx * 4.5); c.stroke();
  c.beginPath(); c.moveTo(-fy * 3.2, fx * 3.2); c.lineTo(-fy * 2.2, fx * 2.2 + 2); c.stroke();
  c.fillStyle = '#2a2a22';
  c.beginPath(); c.arc(-fy * 4.5, fx * 4.5, 1.1, 0, 7); c.fill();
  c.fillStyle = 'rgba(120,130,110,0.4)';
  c.beginPath(); c.arc(-fy * 4.5, fx * 4.5, 0.45, 0, 7); c.fill();
  c.fillStyle = '#3a3428';
  c.fillRect(-6.5, -1.5, 3.2, 4.5);
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.7;
  c.strokeRect(-6.5, -1.5, 3.2, 4.5);
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 0.9;
  c.beginPath(); c.moveTo(-6.5, 0.5); c.lineTo(-3.3, 0.5); c.stroke();
  for (const off of [-4, 4]) {
    c.fillStyle = '#3a3428';
    c.fillRect(off - 1.4, 3.6, 2.8, 2.5);
    c.strokeStyle = '#2a2820';
    c.lineWidth = 0.65;
    c.strokeRect(off - 1.4, 3.6, 2.8, 2.5);
    drawStripperClip(c, off, 4.5, 0.52, 0);
  }
  c.fillStyle = '#4a4438';
  c.beginPath(); c.ellipse(fy * 4.8, -fx * 4.8, 1.8, 2.4, face, 0, 7); c.fill();
  c.fillStyle = '#c8b898';
  c.beginPath(); c.ellipse(fy * 4.8, -fx * 4.8, 1.1, 1.4, face, 0, 7); c.fill();
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 0.55;
  c.beginPath(); c.moveTo(fy * 4.3, -fx * 4.3); c.lineTo(fy * 5.2, -fx * 5.2 + 0.8); c.stroke();
}

function drawSoldier(a) {
  if (a.prone > 0) {
    drawProneSoldier(a);
    drawSoldierOverlays(a);
    return;
  }
  const c = ctx;
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
  c.translate(a.x, a.y);

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
    c.fillStyle = us ? '#5b6b4a' : '#61615a';
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

  drawSoldierOverlays(a);
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
    if (G.selected.length === 1) {
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      // German kit carries no rank or kill tally on the label
      const label = (a.nation || a.side) === 'us'
        ? RANKS[a.rank].name + ' ' + a.t.name.toUpperCase() + ' \u2014 ' +
          (a.type === 'medic' || a.type === 'engineer' ? a.xp + ' XP' : a.xp + ' KILLS')
        : a.t.name.toUpperCase();
      ctx.fillText(label, a.x + 1, a.y + 23);
      ctx.fillStyle = '#ffe98a';
      ctx.fillText(label, a.x, a.y + 22);
    }
  }
}
