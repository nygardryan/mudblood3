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

// ---- who is even in the fight ----
// An actor is engageable when it is alive AND actually on the field: not still
// in the staging strip left of the enemy edge (`x < 0`), not hanging under a
// canopy (`chute > 0`), and not rolling in from a flank (`entering` — the Yamato,
// whose x is on-field while her y is hundreds of pixels off the top or bottom
// edge, since nothing in this game gates on y).
//
// Those four terms are ONE rule, and it was written out by hand at sixteen sites
// across targeting, shooting, input, update and cards. It is extracted because
// the rule has GROWN twice, and each time cost a hand sweep of every copy:
// `chute` when paradrops went in, `entering` when the Yamato did. The comment in
// maybeOfficerFireMission (js/cards.js) states the hazard outright — a scan
// that is hand-rolled rather than routed through targeting.js "has to carry them
// itself" — and the measurements recorded there are what a missed copy costs:
// eleven Yamato actors and three descending sticks admitted by that one scan and
// by no other, every fire mission spent shelling something damageEnemy would
// early-return on. A fifth term should now be one edit, not a scavenger hunt.
//
// Deliberately NOT the same thing as "can be damaged". Several sites take this
// gate and then add their own term (a tank filter, camouflage, the Alien Walker
// exempting other walkers), and several others reject it entirely on purpose:
// AA fire hunts `chute > 0` precisely because that is what it shoots, and blast
// passes UNDER a descending stick. Those keep their own predicates.
function inTheFight(a) {
  return !!a && !a.dead && !(a.x < 0) && !a.entering && !(a.chute > 0);
}

// ---- multi-actor bosses ----
// The Yamato, the Progenitor and the Treno Armato are each a parent actor plus
// child part actors, all real entries in G.enemies. Their flags are deliberately
// kept SEPARATE per boss (shipPart / bossPart / trainPart — see CLAUDE.md), so
// that a site which genuinely cares about one boss says so. But most sites care
// about the CATEGORY, and were spelling all three out: the standard-draw skip in
// render.js, the breach loop in update.js, the shell-shock skip in cards.js, the
// part-death branch in damage.js. Four lists to keep in step, and a fourth such
// boss would have had to find every one of them.
//
// isFinalBoss is the other half: "killing this ends the fight" — the four
// faction-boss flags damageEnemy keys bossVictory() on. Note the Alien Walker
// carries boss:true but is in NEITHER set, on purpose: it dies without ending
// anything, or a wave-667 farm would hand out ESCALATION rungs.
function isBossPart(t) {
  return !!(t && (t.shipPart || t.bossPart || t.trainPart));
}

function isFinalBoss(t) {
  return !!(t && (t.germanBoss || t.japBoss || t.hordeBoss || t.itaBoss));
}

// Every actor belonging to one of the three multi-actor bosses — the parent AND
// its children. The two sites that want this both want it for the same reason
// (the boss is handled WHOLE, elsewhere): the standard-draw skip in render.js,
// because each has its own draw pass that paints parent and parts together, and
// the breach loop in update.js, where the point is that one regressed clamp must
// not breach eleven, six or nine times in a frame. Der Schlächter and the Alien
// Walker are deliberately outside it — a single actor each, drawn and breached
// (or not) by the ordinary paths.
function isMultiActorBoss(t) {
  return !!(t && (isBossPart(t) || t.ship || t.hordeBoss || t.itaBoss));
}

// How close a click, tap or hover has to land to pick this actor — and, at
// actorHitRadius(a) - 2, the ring the inspector draws around what it picked.
//
// ONE table, because there used to be two: this one and a near-copy inlined in
// enemyAtWorld (js/input.js), which had drifted. The Alien Walker was the tell —
// the hover ring was drawn at 28px while the focus-fire tap still wanted 14, so
// the player aimed inside a ring the tap couldn't see. The others disagreed the
// other way (the tap knew a V2 battery and a motorcycle were bigger than a man;
// the hover didn't). Order matters: apc before vehicle, and the boss flags above
// everything, since parts carry tank:true.
function actorHitRadius(a) {
  const t = a.t;
  // 34 for the Yamato: her hitboxes are 62px apart, and 26 would leave gaps
  // between them that a click would fall straight through
  if (t.shipPart || t.ship) return 34;
  // the Progenitor's mass is ~26px of body; its sacs are small and ring it, so
  // they get a tight radius or they'd swallow every click meant for the core
  if (t.hordeBoss) return 30;
  if (t.bossPart) return 12;
  // gun posts tight (they ride 22px off the wagon centreline), wagons tank-sized
  if (t.trainMg) return 10;
  if (t.itaBoss || t.trainPart) return 26;
  // the walker is tank-sized across the hull and stands on legs well clear of it
  if (t.awalker) return 30;
  if (t.tank) return 26;
  if (t.v2) return 24;                  // a rocket battery is a wide emplacement
  if (t.apc) return 22;
  if (t.vehicle || t.bike) return 20;
  if (t.gunEmplacement) return 18;      // player-side AT/AA guns
  return 14;
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

// Which fortification tier a piece is standing at: 0 base, 1 fortified, 2
// hardened. The read side of applyFortifyTier below, and it lives beside it for
// that reason — every per-tier table in the game (cover radii, dodge odds, wire
// drag, tower reach, camo reveal) is indexed by this and half a dozen sites used
// to spell the ternary out by hand.
function emplacementTier(o) {
  return o.up2 ? 2 : o.up ? 1 : 0;
}

// ---- veterancy curves ----
// A rank has to be worth the same thing wherever it is read, and these are the
// four curves that were NOT already saying so — the ones for weapons that skip
// unitBuffs' rofMult and set their own numbers. Between them they replaced ~20
// hand-written copies of `1 - rank * 0.08` and three of `+ rank * 0.05236`.
//
// Two of the four exist for a sharper reason than tidiness: the AIM OVERLAY
// re-derived them. drawUnitWeaponRange (js/targeting.js) drew the traverse cone
// and the buckshot cone from its own copies of the formulas that updateATGun /
// updateAAGun / fireShotgun fire by, so a tuning pass on either could leave the
// drawn cone quietly describing a gun the player doesn't have. That is the same
// failure actorHitRadius above was extracted to end, where the hover ring and
// the focus-fire tap had already drifted apart on the Alien Walker.

// Reload/cycle time, for the weapons that set a cooldown directly.
function rankCdMult(a) {
  return 1 - (a.rank || 0) * RANK_ROF_RATE;
}

// A veteran walks his shells onto the point. Callers keep their own floor —
// what counts as close enough differs per weapon — so this stays unclamped,
// like rankCdMult. Neither needs a guard: MAX_RANK is 6, so the worst either
// returns is 1 - 0.48.
function rankScatterMult(a) {
  return 1 - (a.rank || 0) * RANK_SCATTER_RATE;
}

// Buckshot patterns tighten with rank, down to RANK_SPREAD_FLOOR. Shared by the
// pellets that fly (fireShotgun) and the cone that's drawn (drawUnitWeaponRange).
function rankSpreadMult(a) {
  return Math.max(RANK_SPREAD_FLOOR, 1 - (a.rank || 0) * RANK_SPREAD_RATE);
}

// How wide an emplaced gun can swing: its staked trails allow a fixed wedge and
// a veteran crew works them wider. Returns 0 for anything that isn't an
// emplacement, since the overlay asks before it knows.
function emplacementArc(a) {
  const spec = emplacementSpec(a.t);
  return spec ? spec.arc + (a.rank || 0) * RANK_ARC_RATE : 0;
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
