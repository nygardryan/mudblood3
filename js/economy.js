/* Mud & Blood — TP economy.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// Two income streams, one shared attrition curve. Every endless TP source —
// kill bounties, the supply trickle, and officer pay — decays on the same
// smooth war-economy curve, hitting the 10% floor by wave 120. The decay is
// the run-killer: enemy volume grows roughly linearly forever, but income
// shrinks exponentially, so the exponential always wins and no standing army
// outlasts its supply line. That also makes it safe to pay kills at a real
// rate (a 50% cut, not pocket change) — extra enemies can never snowball
// into runaway money because the curve crushes the bounty faster than the
// wave count can grow it. Campaign levels pay full rate; G.tp holds
// fractions and the HUD floors it.
const KILL_TP_MULT = 1.15;   // small across-the-board bump to kill bounties
const KILL_CUT = 0.5;        // kills pay half rate — real money, not the backbone
const INCOME_DECAY_FLOOR_WAVE = 120;
const INCOME_DECAY_RATE = Math.pow(0.1, 1 / INCOME_DECAY_FLOOR_WAVE);
// War Bonds stretches the same curve out to wave 200 instead of 120
const INCOME_DECAY_FLOOR_WAVE_WARBONDS = 200;
const INCOME_DECAY_RATE_WARBONDS = Math.pow(0.1, 1 / INCOME_DECAY_FLOOR_WAVE_WARBONDS);

// the war-economy attrition multiplier for the current wave: 1.0 early,
// sliding to a hard 0.1 floor at the floor wave
function endlessAttrition() {
  const warBonds = G.cardsOwned && G.cardsOwned.has('warbonds');
  const floorWave = warBonds ? INCOME_DECAY_FLOOR_WAVE_WARBONDS : INCOME_DECAY_FLOOR_WAVE;
  const rate = warBonds ? INCOME_DECAY_RATE_WARBONDS : INCOME_DECAY_RATE;
  return G.wave >= floorWave ? 0.1 : Math.max(0.1, Math.pow(rate, G.wave));
}

function earnTP(amount, kind = 'kill') {
  let mult = kind === 'kill' ? KILL_TP_MULT : 1;
  if (G.mode === 'endless') {
    mult *= 2;   // endless-wide income doubling, applies to all sources (kill/steady)
    if (G.difficulty) mult *= G.difficulty.incomeMult;
    mult *= endlessAttrition();
    if (kind === 'kill') mult *= KILL_CUT;
  }
  G.tp += amount * mult;
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
  if (!isSandbox()) G.tp -= cost;
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

