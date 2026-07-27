/* Trenchworks: WW2 — the overlays every actor shares.

   A man, a Sherman and a 57mm are drawn by three different files, but they all
   wear the same four badges: a health bar, an armor/rot bar stacked on it, rank
   chevrons, and a selection ring with a caption under it. Those were copied out
   once per painter — four chevron loops, four rings, three captions, six bars —
   so a tweak to the house style had to be transcribed six times to actually
   become the house style. They live here now; the painters pass their own
   geometry, which is all that ever really differed.

   Part of a set of plain scripts sharing one global scope; load order is set in
   index.html. */
'use strict';

// a bar centred over an actor: black backing, coloured fill, `f` of it filled
function drawActorBar(a, dy, w, h, f, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(a.x - w / 2, a.y - dy, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(a.x - w / 2, a.y - dy, w * f, h);
}

// the house health ramp: green while he's fine, amber hurt, red about to go
function hpBarColor(f) {
  return f > 0.5 ? '#7ec850' : f > 0.25 ? '#e0b040' : '#d04030';
}

// Health bar — nothing is drawn until the thing has actually been hurt, so a
// fresh field isn't a wall of full bars. `color` defaults to the ramp; a site
// that reads its own way (an enemy hull is red whatever its health) passes a
// css string, or a function of the fill fraction for its own ramp.
function drawActorHpBar(a, dy, w, h, color) {
  if (a.hp >= a.maxhp) return;
  const f = clamp(a.hp / a.maxhp, 0, 1);
  const css = typeof color === 'function' ? color(f) : (color || hpBarColor(f));
  drawActorBar(a, dy, w, h, f, css);
}

// veterancy chevrons, centred over the actor and growing rightward
function drawRankChevrons(a, dy) {
  if (!(a.rank > 0)) return;
  ctx.strokeStyle = '#ffd94a';
  ctx.lineWidth = 1;
  let sx = a.x - (a.rank * 5 - 2) / 2;
  const sy = a.y - dy;
  for (let i = 0; i < a.rank; i++) {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + 1.5, sy - 2.5);
    ctx.lineTo(sx + 3, sy);
    ctx.stroke();
    sx += 5;
  }
}

// dashed ring around a selected actor — `r` is its own footprint
function drawSelectionRing(a, r) {
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, 7); ctx.stroke();
  ctx.setLineDash([]);
}

// "SGT SHERMAN — 12 KILLS" under a lone selection. Only ever with one thing
// selected: a caption per man across a whole squad is unreadable. Infantry
// deliberately don't get one — their record shows in the inspector panel.
function drawSelectionLabel(a, dy) {
  if (G.selected.length !== 1) return;
  ctx.font = 'bold 10px "Courier New", monospace';
  ctx.textAlign = 'center';
  const label = RANKS[a.rank].name + ' ' + a.t.name.toUpperCase() + ' — ' + a.xp + ' KILLS';
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillText(label, a.x + 1, a.y + dy + 1);
  ctx.fillStyle = '#ffe98a';
  ctx.fillText(label, a.x, a.y + dy);
}
