/* Trenchworks: WW2 — static defense drawing (wire, sandbags, bunkers, mines,
   watchtowers, camo nests, ammo crates) and the drawDefenses dispatcher.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

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

