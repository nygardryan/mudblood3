/* Trenchworks: WW2 — static defense drawing (wire, sandbags, bunkers, mines,
   watchtowers, camo nests, ammo crates) and the drawDefenses dispatcher.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

function drawWire(wr) {
  const ext = SPRITES.get(defenseSpriteId('wire', wr.up, wr.up2));
  // walls stand ACROSS the enemy's advance: the procedural art is authored in
  // the old wide frame and turned upright by the rotate below. Pack art is
  // exported already-upright (the exporter runs this same painter), so it
  // blits unrotated.
  if (ext) { blitSprite(ctx, ext, wr.x, wr.y, 0, 1); return; }
  ctx.save();
  ctx.translate(wr.x, wr.y);
  ctx.rotate(-Math.PI / 2);
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
  const ext = SPRITES.get(defenseSpriteId('sandbags', s.up, s.up2));
  if (ext) { blitSprite(ctx, ext, s.x, s.y, 0, 1); return; }
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(-Math.PI / 2);
  // The shadow's SIZE rides the rotation correctly — it tracks the wall, which
  // is the point of drawing it in here. Its OFFSET must not: the sun is screen-
  // fixed like every other shadow in the game (soldiers, vehicles, the mine two
  // functions down), and an offset authored as local +y came out of the flip
  // falling sideways, up-field, instead of down-screen. rotate(-PI/2) maps local
  // (x, y) to screen (y, -x), so a local -x IS a screen +y. Same trick in
  // drawBunker and drawCamoNestBase.
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(-4, 0, 24, 9, 0, 0, 7); ctx.fill();
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
  const ext = SPRITES.get(defenseSpriteId('bunker', b.up, b.up2));
  if (ext) { blitSprite(ctx, ext, b.x, b.y, 0, 1); return; }
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(-Math.PI / 2);
  if (b.up) {
    // breastwork bags sit in front; bunker draws on top. Their shadow sits under
    // them and 2px down-SCREEN (local -x — see the note in drawSandbag).
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.beginPath(); ctx.ellipse(-2, -15, 14, 4, 0, 0, 7); ctx.fill();
    drawDecorSandbag(-9, -15, 7, 4);
    drawDecorSandbag(9, -15, 7, 4);
  }
  // drop shadow — offset down-screen (local -x), not up-field
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(-5, 0, 30, 11, 0, 0, 7); ctx.fill();
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
  const ext = SPRITES.get(defenseSpriteId('mine'));
  if (ext) { blitSprite(ctx, ext, m.x, m.y, 0, 1); return; }
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
  const ext = SPRITES.get(defenseSpriteId('watchtower', t.up, t.up2));
  if (ext) { blitSprite(ctx, ext, t.x, t.y, 0, 1); return; }
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

// Camo nest, reworked as a raised tan scrim net. It's drawn in two layers so it
// can straddle the men it shelters: drawCamoNestBase lays the ground shadow and
// the support stakes *under* the units (in drawDefenses), while
// drawCamoNestCanopy paints the gappy overhead netting *over* them in a later
// pass (see render.js) — so a sheltered soldier shows through the holes in the
// weave. drawCamoNest stacks both for the static codex / placement previews.

// the drape outline: an irregular, gently scalloped blob ~ the concealment zone
const CAMONET_EDGE = [
  [-32, -4], [-24, -13], [-12, -15], [0, -16], [13, -15], [24, -12], [32, -3],
  [30, 6], [20, 11], [8, 13], [-6, 13], [-19, 11], [-29, 7]
];

function drawCamoNestBase(cn) {
  const ext = SPRITES.get(defenseSpriteId('camonest_base', cn.up, cn.up2));
  if (ext) { blitSprite(ctx, ext, cn.x, cn.y, 0, 1); return; }
  ctx.save();
  ctx.translate(cn.x, cn.y);
  ctx.rotate(-Math.PI / 2);
  // soft ground shadow of the raised net — the gap under it sells the overhead
  // read, so its offset has to be down-SCREEN (local -x — see drawSandbag)
  ctx.fillStyle = 'rgba(0,0,0,0.20)';
  ctx.beginPath(); ctx.ellipse(-7, 0, 30, 11, 0, 0, 7); ctx.fill();
  // support stakes the net is lashed to, driven in around the rim. Kept sparse
  // so they don't occlude a man standing under the canopy.
  const stake = (x, y, lean) => {
    ctx.strokeStyle = '#5f4d30';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + lean, y - 9); ctx.stroke();
    ctx.strokeStyle = 'rgba(196,176,124,0.5)';
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + lean, y - 9); ctx.stroke();
  };
  for (const [sx, sy, sl] of [[-29, 8, -2], [-12, 12, -1.5], [12, 12, 1.5], [29, 8, 2], [0, -13, 0]]) stake(sx, sy, sl);
  ctx.restore();
}

function drawCamoNestCanopy(cn) {
  const ext = SPRITES.get(defenseSpriteId('camonest_canopy', cn.up, cn.up2));
  if (ext) { blitSprite(ctx, ext, cn.x, cn.y, 0, 1); return; }
  ctx.save();
  ctx.translate(cn.x, cn.y);
  ctx.rotate(-Math.PI / 2);
  const f = cn.hp / cn.maxhp;
  const edge = CAMONET_EDGE;
  // the net sags toward the ground as it's shot up
  const droop = f < 0.33 ? 4 : f < 0.66 ? 2 : 0;

  // clip to the drape so the weave stays inside the net's silhouette
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(edge[0][0], edge[0][1] + droop);
  for (let i = 1; i < edge.length; i++) ctx.lineTo(edge[i][0], edge[i][1] + droop);
  ctx.closePath();
  ctx.clip();

  // the weave: two diagonal families of tan strands, wide open cells between
  // them so the man underneath reads clearly. Cell spacing tightens on
  // fortified nests. Shadow strands first, lit strands offset a hair on top —
  // two-tone depth.
  const step = cn.up ? 9 : 12;
  ctx.strokeStyle = 'rgba(120,104,68,0.5)';
  ctx.lineWidth = 1.3;
  for (let i = -44; i <= 40; i += step) {
    ctx.beginPath(); ctx.moveTo(i, -20 + droop); ctx.lineTo(i + 30, 16 + droop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i + 30, -20 + droop); ctx.lineTo(i, 16 + droop); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(206,188,138,0.55)';
  ctx.lineWidth = 0.8;
  for (let i = -44; i <= 40; i += step) {
    ctx.beginPath(); ctx.moveTo(i - 0.8, -21 + droop); ctx.lineTo(i + 29.2, 15 + droop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i + 29.2, -21 + droop); ctx.lineTo(i - 0.8, 15 + droop); ctx.stroke();
  }

  // knots where the strands cross
  ctx.fillStyle = 'rgba(150,132,88,0.7)';
  let row = 0;
  for (let gy = -14; gy <= 12; gy += step, row++) {
    for (let gx = -30; gx <= 30; gx += step) {
      ctx.beginPath(); ctx.arc(gx + (row & 1 ? step / 2 : 0), gy + droop, 0.8, 0, 7); ctx.fill();
    }
  }

  // sparse garnish: faded scrim rags woven in to break up the outline
  const rag = (x, y, s, rot) => {
    ctx.save(); ctx.translate(x, y + droop); ctx.rotate(rot);
    ctx.fillStyle = 'rgba(150,140,95,0.5)';
    ctx.beginPath();
    ctx.moveTo(-s, -s * 0.5); ctx.lineTo(s * 0.6, -s * 0.7);
    ctx.lineTo(s, s * 0.4); ctx.lineTo(-s * 0.5, s * 0.7);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  const rags = [[-18, -6, 4, 0.3], [6, -9, 4.5, -0.4], [20, 2, 3.5, 0.6], [-8, 7, 4, -0.2]];
  if (cn.up) { rags.push([-24, 3, 3.5, 0.5], [14, -12, 3.5, -0.5]); }
  for (const [rx, ry, rs, rr] of rags) rag(rx, ry, rs, rr);

  // hardened nests pile on an extra, darker weave layer
  if (cn.up2) {
    ctx.strokeStyle = 'rgba(96,82,52,0.5)';
    ctx.lineWidth = 1.6;
    for (let i = -44; i <= 40; i += 8) {
      ctx.beginPath(); ctx.moveTo(i, -20 + droop); ctx.lineTo(i + 30, 16 + droop); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i + 30, -20 + droop); ctx.lineTo(i, 16 + droop); ctx.stroke();
    }
  }

  // battle damage: blown holes with snapped, curling strand stubs at the rim
  if (f < 0.66) {
    ctx.strokeStyle = 'rgba(90,78,50,0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(-9, -2); ctx.lineTo(-13, 3); ctx.lineTo(-7, 5); ctx.stroke();
  }
  if (f < 0.33) {
    ctx.strokeStyle = 'rgba(90,78,50,0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(10, -9); ctx.lineTo(7, -1); ctx.lineTo(13, 2); ctx.lineTo(8, 7); ctx.stroke();
  }
  ctx.restore();   // drop the clip

  // frayed, scalloped rim with little hanging strand stubs past the edge
  ctx.strokeStyle = 'rgba(182,164,118,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(edge[0][0], edge[0][1] + droop);
  for (let i = 1; i < edge.length; i++) ctx.lineTo(edge[i][0], edge[i][1] + droop);
  ctx.closePath(); ctx.stroke();
  ctx.strokeStyle = 'rgba(150,132,88,0.55)';
  ctx.lineWidth = 0.8;
  for (const [ex, ey] of edge) {
    ctx.beginPath(); ctx.moveTo(ex, ey + droop); ctx.lineTo(ex + (ex > 0 ? 1.5 : -1.5), ey + droop + 2.5); ctx.stroke();
  }
  ctx.restore();
}

// full stack for the static previews (codex, placement ghost) — no unit under it
function drawCamoNest(cn) {
  drawCamoNestBase(cn);
  drawCamoNestCanopy(cn);
}

// a stack of ammunition crates, seen from above: a few wooden boxes with
// stenciled bands. Fortified stacks add a box and a strap; hardened ones get a
// tarp corner. Splinters spread as it takes hits.
function drawAmmoCrate(t) {
  const ext = SPRITES.get(defenseSpriteId('ammocrate', t.up, t.up2));
  if (ext) { blitSprite(ctx, ext, t.x, t.y, 0, 1); return; }
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

// A decoy scarecrow, drawn top-down at the same footprint as an infantryman:
// a straw-stuffed torso in a ragged GI jacket with arms lashed out on a
// cross-bar and a burlap sack head. Fortifying it (up) claps an M1 helmet on so
// it reads like a real soldier from above; hardening it (up2) straps a flak
// vest over the torso. Both disguises make enemies waste more fire before they
// wise up. It has no facing, so it's drawn axis-aligned (arms east-west).
function drawDummy(d) {
  const ext = SPRITES.get(defenseSpriteId('dummy', d.up, d.up2));
  if (ext) { blitSprite(ctx, ext, d.x, d.y, 0, 1); return; }
  const c = ctx;
  c.save();
  c.translate(d.x, d.y);

  // ground shadow — matches an infantryman's (ellipse at 0,3 sized 8x4)
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath(); c.ellipse(0, 3, 8, 4, 0, 0, 7); c.fill();

  // outstretched arms: the cross-bar the scarecrow is lashed to, straw at the cuffs
  c.strokeStyle = '#6b512f';
  c.lineWidth = 2.2;
  c.beginPath(); c.moveTo(-8.5, 0.5); c.lineTo(8.5, 0.5); c.stroke();
  c.strokeStyle = '#c9a24a';
  c.lineWidth = 0.9;
  for (const sx of [-8.5, 8.5]) {
    const dir = sx < 0 ? -1 : 1;
    for (let i = -1; i <= 1; i++) {
      c.beginPath(); c.moveTo(sx, 0.5); c.lineTo(sx + dir * 2.6, 0.5 + i * 1.8); c.stroke();
    }
  }

  // torso — a ragged jacket, same body ellipse a rifleman carries (6.4 x 4.9)
  c.fillStyle = d.up2 ? '#4c5531' : '#5f6a3a';
  c.beginPath(); c.ellipse(0, 0, 6.4, 4.9, 0, 0, 7); c.fill();
  c.strokeStyle = 'rgba(14,15,11,0.6)'; c.lineWidth = 1.1; c.stroke();
  // straw poking out of the hem
  c.strokeStyle = '#c9a24a'; c.lineWidth = 0.9;
  for (const [ox, oy] of [[-2.4, 4.2], [0, 4.7], [2.4, 4.2]]) {
    c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox, oy + 1.7); c.stroke();
  }

  // hardened: a flak vest plate strapped over the torso
  if (d.up2) {
    c.fillStyle = '#726b4a'; c.strokeStyle = '#2f2c1e'; c.lineWidth = 1;
    c.beginPath(); c.ellipse(0, 0.3, 4.5, 3.6, 0, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(0, -3); c.lineTo(0, 3.7); c.stroke();
  }

  // burlap sack head, seen straight down: the crown of the sack, no face —
  // same head circle a soldier gets (r 4.2 at 0,-1)
  c.fillStyle = '#c8b48a'; c.strokeStyle = '#8a7654'; c.lineWidth = 1;
  c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.fill(); c.stroke();
  // the gathered, tied-off top of the sack puckers into a little knot at center
  c.strokeStyle = 'rgba(120,101,70,0.6)'; c.lineWidth = 0.7;
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    c.beginPath(); c.moveTo(Math.cos(a) * 1.4, -1 + Math.sin(a) * 1.4);
    c.lineTo(Math.cos(a) * 3.6, -1 + Math.sin(a) * 3.6); c.stroke();
  }
  c.fillStyle = '#9a8256';
  c.beginPath(); c.arc(0, -1, 1.3, 0, 7); c.fill();
  c.strokeStyle = '#6f5c3c'; c.lineWidth = 0.6;
  c.beginPath(); c.arc(0, -1, 1.3, 0, 7); c.stroke();

  // fortified: an M1 helmet over the sack head — the same green dome the GIs wear
  if (d.up) {
    c.fillStyle = '#63804d';
    c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1;
    c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.beginPath(); c.arc(-1.3, -2.2, 1.5, 0, 7); c.fill();
  }

  c.restore();
}

// A Regio Esercito field work. Same geometry as the player's equivalent — it IS
// the same fortification, just dug by the other side — recoloured cool and grey
// against the player's warm tan, and staked with a tricolore so the two can never
// be confused at a glance.
//
// The tint is BAKED, not applied live. `ctx.filter` layers per drawing operation,
// and these routines issue dozens each: filtering them in place measured 2.3 ms
// per work, i.e. 56 ms/frame at the 24-work cap — the game at 14 fps. Baking each
// variant once into an offscreen canvas and blitting drops that to a single
// drawImage. Same trick, same `ctx`-swap, as ghostBuffer in js/inspector.js.
const IT_WORK_BUF_HALF = 40;   // world-space half-extent; the widest work is the bunker at 28
const IT_WORK_BUF_SS = 3;      // supersample so the bitmap stays crisp when zoomed in
// Cool, pale concrete-grey against the player's warm tan. Brightness above 1 is
// the important part: an earlier pass darkened these to 0.78 to separate them
// from the player's works, and it separated them from the GROUND too — olive-brown
// structures on olive-brown dirt read as terrain, not as fortifications. Lift them
// off the background first, then distinguish them from the player's second.
const IT_WORK_TINT = 'saturate(0.3) brightness(1.14)';
const _itWorkBufCache = new Map();

// only the fields the three draw routines actually read: the fortify tiers, and
// the damage-crack thresholds in drawBunker/drawWatchtower (0.66 / 0.33)
function italianWorkBuffer(w) {
  const tier = w.hp < w.maxhp * 0.33 ? 2 : w.hp < w.maxhp * 0.66 ? 1 : 0;
  const key = w.kind + '|' + (w.up ? 1 : 0) + (w.up2 ? 1 : 0) + tier;
  let buf = _itWorkBufCache.get(key);
  if (buf) return buf;
  const px = IT_WORK_BUF_HALF * 2 * IT_WORK_BUF_SS;
  buf = document.createElement('canvas');
  buf.width = px;
  buf.height = px;
  const octx = buf.getContext('2d');
  octx.scale(IT_WORK_BUF_SS, IT_WORK_BUF_SS);
  octx.translate(IT_WORK_BUF_HALF, IT_WORK_BUF_HALF);
  octx.filter = IT_WORK_TINT;
  // a stand-in at the origin carrying the same visual state as the real work
  const proxy = { x: 0, y: 0, up: w.up, up2: w.up2,
    hp: tier === 2 ? 1 : tier === 1 ? 50 : 100, maxhp: 100 };
  const prevCtx = ctx;
  ctx = octx;
  try {
    if (w.kind === 'sandbags') drawSandbag(proxy);
    else if (w.kind === 'bunker') drawBunker(proxy);
    else drawWatchtower(proxy);
  } finally { ctx = prevCtx; }
  _itWorkBufCache.set(key, buf);
  return buf;
}

function drawItalianWork(w) {
  const buf = italianWorkBuffer(w);
  ctx.drawImage(buf, w.x - IT_WORK_BUF_HALF, w.y - IT_WORK_BUF_HALF,
    IT_WORK_BUF_HALF * 2, IT_WORK_BUF_HALF * 2);
  // the stake is drawn live and UNfiltered — the tricolore has to keep its real
  // colours to do its job, and it's three fillRects
  drawItalianWorkStake(w);
}

// the tricolore stake driven in beside a finished work — green/white/red, and the
// one mark that reads instantly as "this one is theirs"
function drawItalianWorkStake(w) {
  const box = IT_WORK_KINDS[w.kind].box;
  const sx = w.x - box.hw + 2, sy = w.y + box.hh - 2;
  ctx.save();
  // a dark post so the flag reads against both the pale bunker and dark ground
  ctx.strokeStyle = '#241f16';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 13); ctx.stroke();
  const cols = ['#2f7d3f', '#ece8d8', '#c02a22'];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = cols[i];
    ctx.fillRect(sx + 1, sy - 13 + i * 2.7, 7, 2.7);
  }
  ctx.strokeStyle = 'rgba(20,18,12,0.6)';
  ctx.lineWidth = 0.7;
  ctx.strokeRect(sx + 1, sy - 13, 7, 8.1);
  ctx.restore();
}

function drawDefenses() {
  for (const wr of G.wires) drawWire(wr);
  for (const s of G.sandbags) drawSandbag(s);
  for (const b of G.bunkers) drawBunker(b);
  for (const t of G.watchtowers) drawWatchtower(t);
  for (const w of G.itWorks) drawItalianWork(w);
  for (const cn of G.camoNests) drawCamoNestBase(cn);
  for (const ac of G.ammoCrates) drawAmmoCrate(ac);
  for (const dm of G.dummies) drawDummy(dm);
  for (const m of G.mines) drawMine(m);
}

