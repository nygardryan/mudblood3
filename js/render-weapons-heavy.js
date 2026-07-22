/* Trenchworks: WW2 — heavy & special weapons and kits (bazooka / flame / MG / sniper / mortar) + effects.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

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

// muzzle flash while the trench gun fires
function drawShotgunBlast(actor) {
  if (!actor.shotgunBlastT || actor.shotgunBlastT <= 0 || !actor.t.shotgun) return;
  const sg = actor.t.shotgun;
  const range = unitRange(actor, sg.range) * fogMult() * 0.38;
  const bearing = actor.face;
  const fx = Math.cos(bearing), fy = Math.sin(bearing);
  const nx = actor.x + fx * (actor.t.gun + 2);
  const ny = actor.y + fy * (actor.t.gun + 2);
  const alpha = clamp(actor.shotgunBlastT / 0.12, 0, 1);
  const tipX = nx + fx * range;
  const tipY = ny + fy * range;

  ctx.save();
  const grad = ctx.createLinearGradient(nx, ny, tipX, tipY);
  grad.addColorStop(0, `rgba(255,245,200,${0.7 * alpha})`);
  grad.addColorStop(0.35, `rgba(230,200,130,${0.45 * alpha})`);
  grad.addColorStop(1, 'rgba(140,120,90,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(nx, ny);
  ctx.arc(nx, ny, range, bearing - sg.arc * 0.72, bearing + sg.arc * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgba(255,230,160,${0.9 * alpha})`;
  ctx.beginPath(); ctx.arc(nx, ny, 3.2, 0, 7); ctx.fill();
  ctx.restore();
}

// 60mm mortar round — body, fuze, tail fins
function drawMortarRound(c, x, y, scale, rot) {
  scale = scale || 1;
  rot = rot != null ? rot : 0;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = '#3a4034';
  c.beginPath();
  c.ellipse(0, 0, 1.1 * scale, 2.4 * scale, 0, 0, 7);
  c.fill();
  c.strokeStyle = '#2a2e24';
  c.lineWidth = 0.55 * scale;
  c.stroke();
  c.fillStyle = '#c8a858';
  c.beginPath(); c.arc(0, -2.1 * scale, 0.75 * scale, 0, 7); c.fill();
  c.strokeStyle = '#5a5c48';
  c.lineWidth = 0.65 * scale;
  for (const off of [-0.55, 0, 0.55]) {
    c.beginPath();
    c.moveTo(off * scale, 1.8 * scale);
    c.lineTo(off * scale * 1.6, 3.4 * scale);
    c.stroke();
  }
  c.restore();
}

// M2 60mm mortar tube, baseplate, and bipod beside the crewman
function drawMortarTube(c, face, fx, fy, blastT) {
  const kick = blastT > 0 ? clamp(blastT / 0.18, 0, 1) : 0;
  const bx = -fx * 7.2 - fy * 2.8;
  const by = -fy * 7.2 + fx * 2.8;
  const tubeAng = face - 0.58 - kick * 0.12;
  const tubeLen = 10.5;
  const tx = bx + Math.cos(tubeAng) * tubeLen;
  const ty = by + Math.sin(tubeAng) * tubeLen;

  c.fillStyle = '#2f3328';
  c.beginPath(); c.ellipse(bx, by, 4.8, 3.1, face + 0.25, 0, 7); c.fill();
  c.strokeStyle = '#1e2018';
  c.lineWidth = 1;
  c.stroke();
  c.fillStyle = '#3a3c30';
  c.beginPath(); c.ellipse(bx, by, 2.8, 1.6, face + 0.25, 0, 7); c.fill();

  c.strokeStyle = '#5a5c42';
  c.lineWidth = 3.6;
  c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.stroke();
  c.strokeStyle = '#26261e';
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(bx + Math.cos(tubeAng) * 2, by + Math.sin(tubeAng) * 2);
  c.lineTo(tx, ty);
  c.stroke();

  const midX = bx + Math.cos(tubeAng) * 4.2;
  const midY = by + Math.sin(tubeAng) * 4.2;
  c.strokeStyle = '#4a4a3e';
  c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(midX, midY); c.lineTo(midX - fy * 4.5, midY + fx * 4.5); c.stroke();
  c.beginPath(); c.moveTo(midX, midY); c.lineTo(midX + fy * 3.5, midY - fx * 3.5); c.stroke();

  c.strokeStyle = '#3a3830';
  c.lineWidth = 2;
  c.beginPath(); c.arc(tx, ty, 1.9, 0, 7); c.stroke();
  c.fillStyle = '#1c1c16';
  c.beginPath(); c.arc(tx, ty, 0.9, 0, 7); c.fill();

  if (blastT > 0) {
    const alpha = clamp(blastT / 0.18, 0, 1);
    c.fillStyle = `rgba(255,225,150,${0.8 * alpha})`;
    c.beginPath(); c.arc(tx, ty, 2.2 + alpha * 2.5, 0, 7); c.fill();
    c.fillStyle = `rgba(255,160,60,${0.45 * alpha})`;
    c.beginPath(); c.arc(tx, ty, 4 + alpha * 3, 0, 7); c.fill();
  }
  return { tx, ty, bx, by };
}

// 8.1 cm Granatwerfer 34 — saddle yoke, wide baseplate, heavy bipod
function drawGranatwerferTube(c, face, fx, fy, blastT) {
  const kick = blastT > 0 ? clamp(blastT / 0.18, 0, 1) : 0;
  const bx = -fx * 7.5 - fy * 2.5;
  const by = -fy * 7.5 + fx * 2.5;
  const tubeAng = face - 0.55 - kick * 0.1;
  const tubeLen = 12.2;
  const tx = bx + Math.cos(tubeAng) * tubeLen;
  const ty = by + Math.sin(tubeAng) * tubeLen;

  c.fillStyle = '#2a2c24';
  c.beginPath(); c.ellipse(bx, by, 5.5, 3.4, face + 0.2, 0, 7); c.fill();
  c.strokeStyle = '#1a1c16';
  c.lineWidth = 1.1;
  c.stroke();
  c.fillStyle = '#3a3c32';
  c.beginPath(); c.ellipse(bx, by, 3.4, 1.9, face + 0.2, 0, 7); c.fill();
  c.strokeStyle = '#4a4c40';
  c.lineWidth = 0.75;
  c.beginPath();
  c.moveTo(bx - fy * 3.2, by + fx * 3.2);
  c.lineTo(bx + fy * 3.2, by - fx * 3.2);
  c.stroke();

  c.strokeStyle = '#4a4c42';
  c.lineWidth = 4.2;
  c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.stroke();
  c.strokeStyle = '#2e3028';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(bx + Math.cos(tubeAng) * 2.2, by + Math.sin(tubeAng) * 2.2);
  c.lineTo(tx, ty);
  c.stroke();

  const midX = bx + Math.cos(tubeAng) * 4.5;
  const midY = by + Math.sin(tubeAng) * 4.5;
  c.strokeStyle = '#3a3c34';
  c.lineWidth = 2.2;
  c.beginPath(); c.arc(midX, midY, 2.4, 0, 7); c.stroke();

  c.strokeStyle = '#3a3830';
  c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(midX, midY); c.lineTo(midX - fy * 5.2, midY + fx * 5.2); c.stroke();
  c.beginPath(); c.moveTo(midX, midY); c.lineTo(midX + fy * 4.2, midY - fx * 4.2); c.stroke();
  c.fillStyle = '#2a2820';
  c.beginPath(); c.arc(midX - fy * 5.2, midY + fx * 5.2, 1.1, 0, 7); c.fill();
  c.beginPath(); c.arc(midX + fy * 4.2, midY - fx * 4.2, 1.1, 0, 7); c.fill();

  c.strokeStyle = '#3a3830';
  c.lineWidth = 2.4;
  c.beginPath(); c.arc(tx, ty, 2.2, 0, 7); c.stroke();
  c.fillStyle = '#1c1c16';
  c.beginPath(); c.arc(tx, ty, 1.05, 0, 7); c.fill();

  c.strokeStyle = '#4a4840';
  c.lineWidth = 1.3;
  c.beginPath(); c.arc(bx - fx * 0.8, by - fy * 0.8, 1.4, 0, 7); c.stroke();

  if (blastT > 0) {
    const alpha = clamp(blastT / 0.18, 0, 1);
    c.fillStyle = `rgba(255,225,150,${0.85 * alpha})`;
    c.beginPath(); c.arc(tx, ty, 2.8 + alpha * 3, 0, 7); c.fill();
    c.fillStyle = `rgba(255,140,50,${0.5 * alpha})`;
    c.beginPath(); c.arc(tx, ty, 5 + alpha * 3.5, 0, 7); c.fill();
  }
  return { tx, ty, bx, by, midX, midY };
}

// 8.1 cm Wgr round — olive body, four tail fins, booster band
function drawGrw81Round(c, x, y, scale, rot) {
  scale = scale || 1;
  rot = rot != null ? rot : 0;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = '#4a4e3e';
  c.beginPath();
  c.ellipse(0, 0, 1.35 * scale, 2.8 * scale, 0, 0, 7);
  c.fill();
  c.strokeStyle = '#2a2e22';
  c.lineWidth = 0.6 * scale;
  c.stroke();
  c.fillStyle = '#6a6a58';
  c.fillRect(-0.9 * scale, -2.6 * scale, 1.8 * scale, 0.9 * scale);
  c.fillStyle = '#8a8878';
  c.beginPath(); c.arc(0, -2.9 * scale, 0.7 * scale, 0, 7); c.fill();
  c.strokeStyle = '#4a4a40';
  c.lineWidth = 0.7 * scale;
  for (let i = 0; i < 4; i++) {
    const ang = i * Math.PI / 2 + 0.2;
    c.beginPath();
    c.moveTo(Math.cos(ang) * 0.5 * scale, 2 * scale + Math.sin(ang) * 0.3 * scale);
    c.lineTo(Math.cos(ang) * 1.2 * scale, 3.6 * scale + Math.sin(ang) * 0.5 * scale);
    c.stroke();
  }
  c.restore();
}

function drawEmortarKit(c, fx, fy, face, tube) {
  c.fillStyle = '#4a4438';
  c.fillRect(tube.bx - 5, tube.by + 2.2, 6.2, 4.2);
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.85;
  c.strokeRect(tube.bx - 5, tube.by + 2.2, 6.2, 4.2);
  c.strokeStyle = '#6a6858';
  c.lineWidth = 0.55;
  c.beginPath(); c.moveTo(tube.bx - 4.5, tube.by + 3.8); c.lineTo(tube.bx + 0.5, tube.by + 3.8); c.stroke();
  c.strokeStyle = 'rgba(200,198,180,0.75)';
  c.lineWidth = 0.5;
  c.strokeRect(tube.bx - 4.5, tube.by + 2.7, 2.4, 1.5);
  drawGrw81Round(c, tube.bx - 3.5, tube.by + 3.4, 0.8, 0.15);
  drawGrw81Round(c, tube.bx - 1.2, tube.by + 3.6, 0.76, -0.1);
  drawGrw81Round(c, tube.bx + 0.5, tube.by + 3.2, 0.72, 0.35);
  c.strokeStyle = '#4a4840';
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(-6.5, -1.5); c.lineTo(-6.5, 3.5); c.lineTo(-4, 3.5); c.stroke();
  for (const off of [-5.8, -5.1, -4.4]) {
    drawGrw81Round(c, off, 1.2, 0.55, -0.3);
  }
  c.fillStyle = '#3a3c34';
  c.beginPath(); c.ellipse(fy * 3.2, -fx * 3.2, 2.2, 2.8, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2c24';
  c.lineWidth = 0.8;
  c.stroke();
  c.fillStyle = '#c8b898';
  c.beginPath(); c.ellipse(fy * 3.2, -fx * 3.2, 1.2, 1.5, face, 0, 7); c.fill();
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 0.45;
  for (let i = -2; i <= 2; i++) {
    c.beginPath();
    c.moveTo(fy * 3.2 + i * 0.4, -fx * 3.2 - 1);
    c.lineTo(fy * 3.2 + i * 0.4, -fx * 3.2 + 1);
    c.stroke();
  }
  c.strokeStyle = '#5a5a50';
  c.lineWidth = 1.3;
  c.beginPath(); c.moveTo(-fy * 4.5, fx * 4.5); c.lineTo(-fy * 5.8, fx * 5.8 + 1.5); c.stroke();
  c.fillStyle = '#6a5a42';
  c.fillRect(-0.8, 3.5, 1.5, 1.3);
}

// live flame jet while a flamethrower is spraying
function drawFlameStream(actor, opts) {
  const fl = (opts && opts.flame) || actor.t.flame;
  if (!actor.flameT || actor.flameT <= 0 || !fl) return;
  const range = unitRange(actor, fl.range) * fogMult();
  const bearing = (opts && opts.bearing !== undefined) ? opts.bearing : actor.face;
  const originDist = (opts && opts.originDist !== undefined) ? opts.originDist : actor.t.gun + 1.2;
  const fx = Math.cos(bearing), fy = Math.sin(bearing);
  const nx = actor.x + fx * originDist;
  const ny = actor.y + fy * originDist;
  const pulse = 0.82 + Math.sin(G.time * 22) * 0.18;
  const alpha = clamp(actor.flameT / 0.15, 0, 1) * pulse;
  const reach = range * (0.68 + Math.sin(G.time * 14) * 0.06);

  ctx.save();
  const tipX = nx + fx * reach * 0.75;
  const tipY = ny + fy * reach * 0.75;
  const grad = ctx.createLinearGradient(nx, ny, tipX, tipY);
  grad.addColorStop(0, `rgba(255,248,180,${0.72 * alpha})`);
  grad.addColorStop(0.25, `rgba(255,170,50,${0.55 * alpha})`);
  grad.addColorStop(0.55, `rgba(240,80,20,${0.35 * alpha})`);
  grad.addColorStop(1, 'rgba(60,25,10,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(nx, ny);
  ctx.arc(nx, ny, reach, bearing - fl.arc * 0.88, bearing + fl.arc * 0.88);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = `rgba(255,110,25,${0.14 * alpha})`;
  ctx.beginPath();
  ctx.moveTo(nx, ny);
  ctx.arc(nx, ny, reach * 1.05, bearing - fl.arc, bearing + fl.arc);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = '#fff8c8';
  ctx.beginPath(); ctx.arc(nx, ny, 2.8, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

