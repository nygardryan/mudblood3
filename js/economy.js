/* Trenchworks: WW2 — TP economy.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// Two income streams. Steady income (the supply trickle and officer pay) is
// the backbone of the endless economy: it pays full rate so the player can
// always save toward big-ticket AT purchases, scaled only by difficulty.
// The trickle fires every TP_TRICKLE_INTERVAL seconds — kept deliberately
// generous so the player can afford to place extra units and experiment.
// Kill bounties are pocket change by design — they carry the war-economy
// attrition (a smooth decay that reaches the 10% floor by wave 200) plus
// the endless-wide 75% cut from the unit-count reduction pass. Campaign
// levels pay full rate either way. G.tp holds fractions; the HUD floors it.
const KILL_TP_MULT = 1.15;   // small across-the-board bump to kill bounties
const KILL_DECAY_FLOOR_WAVE = 200;
const KILL_DECAY_RATE = Math.pow(0.1, 1 / KILL_DECAY_FLOOR_WAVE);
// War Bonds stretches the same curve out to wave 400 instead of 200
const KILL_DECAY_FLOOR_WAVE_WARBONDS = 400;
const KILL_DECAY_RATE_WARBONDS = Math.pow(0.1, 1 / KILL_DECAY_FLOOR_WAVE_WARBONDS);
function earnTP(amount, kind = 'kill') {
  let mult = kind === 'kill' ? KILL_TP_MULT : 1;
  if (G.mode === 'endless') {
    if (G.difficulty) mult *= G.difficulty.incomeMult;
    if (kind === 'kill') {
      const warBonds = G.cardsOwned && G.cardsOwned.has('warbonds');
      const floorWave = warBonds ? KILL_DECAY_FLOOR_WAVE_WARBONDS : KILL_DECAY_FLOOR_WAVE;
      const rate = warBonds ? KILL_DECAY_RATE_WARBONDS : KILL_DECAY_RATE;
      mult *= G.wave >= floorWave ? 0.1 : Math.max(0.1, Math.pow(rate, G.wave));
      mult *= 0.25;
    }
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

// endless catch-up mechanic: every 5 TP worth of allied units lost refunds
// 1 TP, so a rough wave doesn't snowball into a run-ending spiral. Tracks
// fractional TP lost in G.catchupDebt across deaths.
function unitTPValue(u) {
  const p = PLACEABLES.find(pl => pl.key === u.type);
  return p ? placeableCost(p) : 0;
}

function trackAlliedLoss(u) {
  if (G.mode !== 'endless' || u.side !== 'us') return;
  G.catchupDebt += unitTPValue(u);
  let refunded = false;
  while (G.catchupDebt >= 5) {
    G.catchupDebt -= 5;
    earnTP(1, 'catchup');
    refunded = true;
  }
  if (refunded) SFX.cash();   // salvage pay ping when losses buy back some TP
}
