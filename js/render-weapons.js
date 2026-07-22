/* Trenchworks: WW2 — light infantry weapons, grenades, kits & caps (rifle / grenadier / SMG).
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

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

