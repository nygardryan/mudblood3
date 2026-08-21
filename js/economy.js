/* Trenchworks: WW2 — TP economy.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// Two income streams. Steady income (the supply trickle and officer pay) is
// the backbone of the endless economy: it pays full rate so the player can
// always save toward big-ticket AT purchases, scaled only by difficulty.
// The trickle fires every TP_TRICKLE_INTERVAL seconds — kept deliberately
// generous so the player can afford to place extra units and experiment.
// Kill bounties carry the war-economy attrition, on top of the endless-wide
// 75% cut from the unit-count reduction pass. Campaign levels pay full rate
// either way. G.tp holds fractions; the HUD floors it.
const KILL_TP_MULT = 1.15;   // small across-the-board bump to kill bounties

// BOUNTY INCOME IS A HILL, and the hill is a property of the PRODUCT — this
// multiplier against the wave's own value, which is not flat and is not
// smooth. Bounties hold their rate through the first KILL_HOLD_WAVE waves, so
// income climbs with the waves themselves; past that seam the multiplier falls
// as an inverse power of depth, steeply enough to overtake the wave growth, so
// a deep run's bounty income decays toward nothing.
//
// KILL_HOLD_WAVE is 100 because that is `wavesPast99` (js/waves.js) — the seam
// where wave sizing, the vehicle share and the special-wave tables all start
// inflating. Holding full rate up to it and falling off past it is one
// decision made at one place, and it is why the crest lands where it does
// rather than where a hand-set peak wave would put it. Move that seam and the
// crest moves; do not write the crest down as a constant here.
//
// Measured over 200 trials/wave, mean of the four armies, ordinary waves
// (every 10th is a special and rides above the curve), assuming the player
// kills what spawns: ~10 TP/min at wave 10 climbing steadily to a ~55 TP/min
// crest around wave 127, then 22 at 200, 6.6 at 300, 2.8 at 400.
//
// What this replaced was an exponential with a 0.1 floor at wave 200, and the
// floor was the bug: past it the multiplier stopped moving while wave value
// kept climbing, so bounty income grew linearly with no ceiling — 45.6 TP/min
// at wave 200 against 64.8 at 300, still rising at 400. An inverse power has
// no floor to reach, which is the whole reason it is one.
const KILL_HOLD_WAVE = 100;
const KILL_HOLD_VALUE = 0.8;
const KILL_FALLOFF = 4.0;
// War Bonds: bounties pay a fifth more, and the late-war collapse is gentler
// (it cannot instead extend the HOLD — wave value inflates so fast past the
// seam that holding full rate 40 waves longer measured as a 3.5x crest)
const KILL_HOLD_VALUE_WARBONDS = 0.96;
const KILL_FALLOFF_WARBONDS = 3.4;

function killBountyMult(wave, warBonds) {
  const hold = warBonds ? KILL_HOLD_VALUE_WARBONDS : KILL_HOLD_VALUE;
  const falloff = warBonds ? KILL_FALLOFF_WARBONDS : KILL_FALLOFF;
  if (wave <= KILL_HOLD_WAVE) return hold;
  return hold * Math.pow(wave / KILL_HOLD_WAVE, -falloff);
}
function earnTP(amount, kind = 'kill') {
  let mult = kind === 'kill' ? KILL_TP_MULT : 1;
  if (G.mode === 'endless') {
    if (G.difficulty) mult *= G.difficulty.incomeMult;
    if (G.esc) mult *= G.esc.incomeMult;                 // Escalation II
    if (kind === 'kill') {
      mult *= killBountyMult(G.wave, G.cardsOwned && G.cardsOwned.has('warbonds'));
      mult *= 0.25;
      // Escalation IX zeroes bounties outright: income becomes a flat rate the
      // player cannot raise by fighting harder, only by keeping officers alive
      if (G.esc) mult *= G.esc.killIncome;
    }
  }
  G.tp += amount * mult;
  if (G.recap) G.recap.tpEarned += amount * mult;
}

function isSandbox() {
  return G && G.mode === 'endless' && G.difficulty && G.difficulty.sandbox;
}

function isTestingMode() {
  return G && G.mode === 'endless' && G.difficulty && G.difficulty.testing;
}

function canAffordTP(cost) {
  return isSandbox() || G.tp >= cost;
}

function spendTP(cost) {
  if (isSandbox()) return;
  G.tp -= cost;
  if (G.recap) G.recap.tpSpent += cost;
}

// War Surplus: the 25% cut is rounded up, so even a 3 TP rifleman still
// nets a real discount (ceil(3 * 0.25) = 1, not a wash from rounding the
// 75%-of-cost figure itself up to the original price)
function warSurplusCost(base) {
  return base - Math.ceil(base * 0.25);
}

// campaign levels can override toolbar costs so no single purchase type
// can cheese the mission; endless uses the base PLACEABLES prices.
function placeableCost(p) {
  const ov = G && G.level && G.level.costOverrides;
  const base = (ov && ov[p.key] != null) ? ov[p.key] : p.cost;
  if (G && G.cardsOwned && G.cardsOwned.has('costcut_' + p.key)) return warSurplusCost(base);
  return base;
}
