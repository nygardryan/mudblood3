/* Trenchworks: WW2 — the DEMO gate. Every demo restriction is defined here and
   consumed as a one-or-two-line call-site edit elsewhere; nothing outside this
   file decides WHAT is locked. The demo fights only the Wehrmacht
   (rollEnemyFaction, js/state.js), sells a subset of the toolbar
   (demoLockedPlaceable — hud.js/input.js/attract.js), sells a 17-card pool in
   the shop with everything else offered-but-banner-locked (demoDrawPool /
   demoLockedCard, js/cards.js), and caps ESCALATION at rung III
   (demoEscMax, js/escalation.js).

   THE ONE RULE: demo restrictions are READ-SIDE ONLY. On the web, ?demo=1
   shares its origin — and so its localStorage — with the full game, so the
   demo must never prune CARDS (MAX_COMMAND_CAP derives from it and
   loadEndlessCards drops unknown ids from the shared blob), never clamp the
   STORED escUnlocked, and never delete a non-'de' run save (js/save.js hides
   it instead). A demo build that wrote through any of those would corrupt a
   full-game player's data the first time they opened the demo URL. */
'use strict';

// TEST-only runtime override (TEST.demo(bool) sets it, null = follow the
// platform flag) so a full-game tab can exercise demo behaviour and back.
let TW_DEMO_OVERRIDE = null;

function demoActive() {
  return TW_DEMO_OVERRIDE !== null ? TW_DEMO_OVERRIDE : PLATFORM.isDemo;
}

// The buyable roster. Everything else in PLACEABLES stays ON the toolbar as a
// dead, bannered button — the demo advertises what it locks.
const DEMO_PLACEABLE_KEYS = new Set([
  // units
  'rifleman', 'shotgunner', 'bazooka', 'sniper', 'medic', 'engineer', 'jeep', 'aagun',
  // defenses
  'wire', 'sandbags', 'mine',
  // supports
  'mortar', 'artillery',
]);

// Identity set over the player-facing shop list. Membership, NOT `kind`, is
// what makes an item gateable: the testing rosters reuse the same kinds — the
// TESTING_ABILITIES entries RANK UP and PURGE are `kind: 'support'` — so a
// kind test locks two DEV TOOLS while claiming to lock game content. It also
// makes an allowlist safe to keep: anything added to PLACEABLES later is
// demo-locked by default, which is the right default for a demo.
const DEMO_SHOP_ITEMS = new Set(PLACEABLES);

function demoLockedPlaceable(p) {
  if (!demoActive()) return false;
  // Tutorials run verbatim: their own per-step allowBuy list already gates
  // purchases, and tutorial 3 teaches gunner/grenadier/flamer.
  if (G && G.level && G.level.tutorial) return false;
  if (!DEMO_SHOP_ITEMS.has(p)) return false;   // testing rosters/events are dev tools
  return !DEMO_PLACEABLE_KEYS.has(p.key);
}

// The purchasable card pool: one cheap generic per available placeable
// (seasonedvet_* is the cheapest no-excludes unit template; costcut_* are the
// only generics that exist for defenses/supports) plus exactly four uniques,
// each on a different available unit type.
const DEMO_CARD_IDS = new Set([
  ...['rifleman', 'shotgunner', 'bazooka', 'sniper', 'medic', 'engineer', 'jeep', 'aagun']
    .map(t => 'seasonedvet_' + t),
  ...['wire', 'sandbags', 'mine', 'mortar', 'artillery'].map(k => 'costcut_' + k),
  'rifledslugs',      // shotgunner
  'heatrounds',       // bazooka — the demo's anti-armor answer
  'crackshot',        // sniper
  'morphinesyrette',  // medic
]);

function demoLockedCard(id) {
  return demoActive() && !DEMO_CARD_IDS.has(id);
}

// Draw filter for the shop. While any demo-pool card is still drawable the
// deck is only those; once the pool is drained the FALLBACK lets locked cards
// flow into offer slots, where buildCardShopUI banners them and buyCard
// rejects them — that surfacing is the point, not a leak.
function demoDrawPool(pool) {
  if (!demoActive()) return pool;
  const d = pool.filter(id => DEMO_CARD_IDS.has(id));
  return d.length ? d : pool;
}

// A full-game jp/zo/it run save must not RESUME under the demo (three of the
// four armies don't exist here) but must never be deleted — the demo hides
// CONTINUE and blocks continueRun, nothing more. hasRunSave stays honest on
// purpose: the abandon-confirm prompt still fires before a demo start can
// overwrite the shared single slot, so the loss is always the player's
// explicit choice, exactly as in the full game.
function demoBlockedSave(blob) {
  return demoActive() && !!blob && !!blob.meta && blob.meta.faction !== 'de';
}

// ESCALATION cap: rungs 0–III playable in the demo, IV–X shown locked with
// full-game copy. Clamped at READ (buildEscMods and the pickers) — the stored
// escUnlocked is never written down, so a full-game ladder survives ?demo=1.
const DEMO_ESC_MAX = 3;

function demoEscMax() {
  return demoActive() ? DEMO_ESC_MAX : ESC_MAX;
}
