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

const HUD_INTERVAL = 0.1;
const AURA_CACHE_INTERVAL = 0.4;
const PARTICLE_CAP = 250;

function compactInPlace(arr, keep) {
  let w = 0;
  for (let i = 0; i < arr.length; i++) {
    if (keep(arr[i])) arr[w++] = arr[i];
  }
  arr.length = w;
}

// visit every defense emplacement without building a throwaway merged array
function forEachDefense(fn) {
  for (const s of G.sandbags) fn(s);
  for (const b of G.bunkers) fn(b);
  for (const w of G.wires) fn(w);
  for (const t of G.watchtowers) fn(t);
  for (const c of G.camoNests) fn(c);
}

function compactDefenses(arr, onDestroy) {
  let w = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].hp > 0) arr[w++] = arr[i];
    else onDestroy(arr[i]);
  }
  arr.length = w;
}

const officerCount = () => {
  if (isAssaultMode()) {
    return G.enemies.filter(e => !e.dead && (e.type === 'officer' || e.type === 'eoff')).length;
  }
  // count live officers directly — G.usOfficers is a 0.4s aura cache that lags
  // behind fresh placements, which would let a placement burst slip past the cap
  return G ? G.units.filter(u => !u.dead && u.type === 'officer').length : 0;
};

const officerLimit = () => (G && G.cardsOwned && G.cardsOwned.has('officercorps')) ? 10 : MAX_OFFICERS;
