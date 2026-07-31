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

// An enemy officer winding up a command (officerCommand, js/update-enemies.js):
// the half of the telegraph that answers WHO, since the ground ring the order
// is drawn inside (drawOfficerCommandTelegraph, js/render.js) can easily have a
// dozen men standing in it and only one of them is worth shooting.
//
// It rides ABOVE every other bar an actor can wear — a Screamer can be carrying
// an HP bar and a rot bar already — and it is the one overlay in the game with
// a black keyline, because it has to be found FAST on ground of any value. The
// blink accelerates as the order forms: an urgency the player reads out of the
// corner of an eye without having to parse a bar. The bar under it is the exact
// time left, for the player who has already found him and is deciding whether
// there's room for one more burst.
const CMD_WARN_DY = 27;   // bar sits clear of the rot bar at 22
function drawCommandWarning(a) {
  const f = clamp(1 - a.cmdT / (a.cmdMax || OFFICER_CMD_WARN), 0, 1);
  const col = a.cmdColor || '#ffd15a';
  drawActorBar(a, CMD_WARN_DY, 18, 2, f, col);

  // warning triangle, growing and blinking faster as the order lands
  const s = 1 + f * 0.3;
  const blink = 0.55 + Math.abs(Math.sin(G.time * (5 + f * 16))) * 0.45;
  const cx = a.x;
  const by = a.y - CMD_WARN_DY - 2.5;     // sits on the bar
  const ty = by - 9.5 * s;
  ctx.globalAlpha = blink;
  ctx.beginPath();
  ctx.moveTo(cx, ty);
  ctx.lineTo(cx + 6 * s, by);
  ctx.lineTo(cx - 6 * s, by);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.fill();
  // the bang inside it: two dark rects rather than a glyph, which at 8px tall
  // renders as a smudge in any font
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(cx - 0.7, ty + 3.6 * s, 1.4, 3.4 * s);
  ctx.fillRect(cx - 0.7, by - 1.8, 1.4, 1.3);
  ctx.globalAlpha = 1;
}

// dashed ring around a selected actor — `r` is its own footprint
function drawSelectionRing(a, r) {
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, 7); ctx.stroke();
  ctx.setLineDash([]);
}

// ---- boss overlays ----------------------------------------------------------
// A boss's health is a headline, not a footnote, so unlike drawActorHpBar these
// are always on, wide and captioned. The Yamato set the house style and the
// other four had each drifted off it — tri-colour gapped segments on two, no
// tick marks on three, no caption at all on the German boss, the caption above
// the bar on some and below on others — so all five come through here now:
// black surround, one 5px bar on the same ramp, ticks so a long bar still reads
// as a fraction, and the name in 7px monospace 4px above it. Width is the only
// thing a caller varies, because a bar should be about as wide as the thing
// wearing it. `ticks` defaults to quarters; a boss whose pool breaks into
// phases passes its own boundaries, so the tick marks the resurrection.
const BOSS_BAR_TICKS = [0.25, 0.5, 0.75];

function drawBossHpBar(a, y, w, label, ticks) {
  const x0 = a.x - w / 2;
  const f = clamp(a.hp / a.maxhp, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(x0 - 1, y - 1, w + 2, 7);
  ctx.fillStyle = f > 0.5 ? '#c0562e' : f > 0.25 ? '#e0b040' : '#d04030';
  ctx.fillRect(x0, y, w * f, 5);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  for (const q of (ticks || BOSS_BAR_TICKS)) {
    ctx.beginPath(); ctx.moveTo(x0 + w * q, y); ctx.lineTo(x0 + w * q, y + 5); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(228,224,208,0.9)';
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, a.x, y - 4);
  ctx.textAlign = 'left';   // ctx.textAlign is global state, always put it back
}

// A plate row stacked under the main bar (the German boss's body/flak armor).
// Under, not over: the caption owns the space above the bar, and stacking there
// would move the name whenever a boss happened to be wearing armor.
function drawBossPlateBar(a, y, w, f, color) {
  const x0 = a.x - w / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x0, y, w, 2.2);
  ctx.fillStyle = color;             ctx.fillRect(x0, y, w * f, 2.2);
}

// The condition bar over a boss's child actors — turrets, gun tubs, pus sacs,
// wagons. The same idiom one size down, and like the ordinary actor bars it
// stays hidden until the part has actually been hurt, so an intact boss wears
// one bar rather than a constellation of them.
function drawBossPartBar(p, dy, w) {
  if (p.dead || p.hp >= p.maxhp) return;
  const f = clamp(p.hp / p.maxhp, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(p.x - w / 2, p.y - dy, w, 3);
  ctx.fillStyle = f > 0.4 ? '#c0562e' : '#d04030';
  ctx.fillRect(p.x - w / 2, p.y - dy, w * f, 3);
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
