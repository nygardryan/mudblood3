/* Trenchworks: WW2 — small shared helpers.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// plain sqrt beats Math.hypot by 2-4x and game coordinates never overflow it
const dist = (a, b) => {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};
// squared distance for range checks: compare against r*r and skip the sqrt
const dist2 = (a, b) => {
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy;
};
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// screen shake: explosions bump the amplitude up, update() decays it —
// simultaneous blasts take the strongest kick rather than stacking.
// shakeScale is the user's Settings slider (0-1), declared in settings.js
function addShake(amount) {
  G.shake = Math.max(G.shake || 0, amount * shakeScale);
}

function compactInPlace(arr, keep) {
  let w = 0;
  for (let i = 0; i < arr.length; i++) {
    if (keep(arr[i])) arr[w++] = arr[i];
  }
  arr.length = w;
}

// "not a man on his feet": armour, soft-skinned vehicles and trail-staked guns.
// The three cover emplacements — bunker, sandbags, watch tower — are for
// INFANTRY only, so every benefit they hand out tests this: coverBlock's dodge,
// watchtowerRangeMult's reach, and the Forward Observer card's sector. A crew
// buttoned into a hull doesn't duck behind a parapet, and nobody serving a gun
// whose trails are staked into the ground climbs a ladder to see further. It
// spells out the same flag list the camo nest already rejects (isCamouflaged),
// for the same reason and with the same answer, rather than each site keeping
// its own — coverBlock's was short two flags and the tower's two more.
function isVehicleOrGun(a) {
  const t = a && a.t;
  return !!(t && (t.tank || t.vehicle || t.apc || t.bike || t.gunEmplacement));
}

// visit every defense emplacement without building a throwaway merged array
function forEachDefense(fn) {
  for (const s of G.sandbags) fn(s);
  for (const b of G.bunkers) fn(b);
  for (const w of G.wires) fn(w);
  for (const t of G.watchtowers) fn(t);
  for (const c of G.camoNests) fn(c);
  for (const a of G.ammoCrates) fn(a);
  for (const d of G.dummies) fn(d);
}

// Push one emplacement up a fortification tier and report which tier it landed
// on (1 = fortified, 2 = hardened). The ONLY place the tier math lives: the
// engineer's ~6s of work and the Pre-Hardened card's free tier at placement
// both come through here, so a piece can never be worth more built by one route
// than the other. The dummy gains a flat fortifyAdd per tier, camo nests double
// per tier, everything else takes the 1.5x.
function applyFortifyTier(s) {
  if (s.fortifyAdd) s.maxhp += s.fortifyAdd;
  else s.maxhp = Math.round(s.maxhp * (s.fortifyMult || 1.5));
  s.hp = s.maxhp;
  if (!s.up) { s.up = true; return 1; }
  s.up2 = true;
  return 2;
}

function compactDefenses(arr, onDestroy) {
  let w = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].hp > 0) arr[w++] = arr[i];
    else onDestroy(arr[i]);
  }
  arr.length = w;
}
