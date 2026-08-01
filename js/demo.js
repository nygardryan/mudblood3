/* Trenchworks: WW2 — the DEMO gate. Every demo restriction is defined here and
   consumed as a one-or-two-line call-site edit elsewhere; nothing outside this
   file decides WHAT is locked. The demo fights only the Wehrmacht
   (rollEnemyFaction, js/state.js), sells a subset of the toolbar
   (demoLockedPlaceable — hud.js/input.js/attract.js; demoBuildLockedPlaceable
   is the same question asked of the BUILD, for the codex's mark), sells a 17-card pool in
   the shop with everything else offered-but-banner-locked (demoDrawPool /
   demoLockedCard, js/cards.js), DEPLOYS only that pool even when a shared
   full-game collection says otherwise (demoOwnedCards, js/cards.js +
   js/save.js), stops selling command points once that pool could not spend
   another (demoMaxCommandCap, js/cards.js), and caps
   ESCALATION at rung III (demoEscMax, js/escalation.js). Two restrictions take
   demoActive() bare rather than a predicate of their own, because they REMOVE a
   whole control instead of gating an item, and both live in js/settings.js:
   the DEV TOOLS section (SANDBOX, TESTING and CHANGELOG each reach past this
   gate rather than through it, TESTING most of all, since it puts the three
   hidden enemy rosters on the toolbar) and the sprite-pack EXPORT row, whose
   ZIP is those same hidden rosters, bosses and biomes as PNGs. Below the fence at the
   bottom it also OPENS THE PITCH at boot (openDemoPitch) — the value-
   proposition screen, whose every figure is derived from the sets above.

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

// Is this item full-game-only IN THIS BUILD? A statement about the product, so
// it knows nothing about the run standing behind it.
function demoBuildLockedPlaceable(p) {
  if (!demoActive()) return false;
  if (!DEMO_SHOP_ITEMS.has(p)) return false;   // testing rosters/events are dev tools
  return !DEMO_PLACEABLE_KEYS.has(p.key);
}

// ...and is it locked for THIS RUN? Every purchase path asks this one. A
// surface that DESCRIBES the build rather than gating a buy must ask the one
// above instead: the codex opens off the pause menu, so a dossier read during
// tutorial 3 would otherwise drop every FULL GAME mark off it (and the pitch,
// which is a claim about the build even when TEST raises it in a full-game
// tab, reads DEMO_PLACEABLE_KEYS more directly still).
function demoLockedPlaceable(p) {
  if (!demoActive()) return false;
  // Tutorials run verbatim: their own per-step allowBuy list already gates
  // purchases, and tutorial 3 teaches gunner/grenadier/flamer.
  if (G && G.level && G.level.tutorial) return false;
  return demoBuildLockedPlaceable(p);
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

// Read filter for a list of cards the player already HOLDS — his collection,
// the battle plan built out of it, and a resumed run's own loadout. It is the
// counterpart to demoDrawPool, which gates the shop's OFFER, and it has no
// fallback: there is nothing to surface here, only cards to keep out of the
// fight. buyCard refuses to sell a locked card, but that is the only way in
// the demo can see — on the web ?demo=1 shares its origin, and so its
// localStorage, with the full game, so a full-game collection and the plan
// built out of it arrive in the demo ALREADY OWNED. Without this they deploy:
// newGame stamps G.cardsOwned straight off equippedEndlessCards, so the build
// whose pitch reads "17 OF 172 CARDS" ran all 172, War Chest's opening TP
// included. Read-side like every other gate here — the stored collection and
// the stored plans are never rewritten, so a full-game loadout survives a visit
// to the demo URL untouched.
function demoOwnedCards(list) {
  if (!demoActive()) return list;
  return list.filter(id => DEMO_CARD_IDS.has(id));
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

// The command ceiling this build's deck can actually fill. MAX_COMMAND_CAP is
// summed over the whole catalog, which the demo never sells, so a point bought
// past the demo pool's own weight can never be spent on anything — the same
// "purchase of nothing" the REROLL and +1 CARD SLOT gates already refuse via
// undrawnCardCount, and the third medal sink is the one that was missed.
// DERIVED from the pool rather than written down, exactly as MAX_COMMAND_CAP is
// derived from CARDS; memoized because CARDS does not exist yet when this file
// loads (constants.js is the last thing before it). Read-side only: the stored
// capacity is still clamped against MAX_COMMAND_CAP in loadEndlessCards, so a
// full-game blob opened under ?demo=1 keeps every point it paid for.
let _demoPool = null;

// The pool as the CATALOG actually has it: {size, weight}. One memo for both,
// because the two must never disagree — a card id CARDS no longer generates
// (see checkDemoSets) is skipped by the weight, so a size read off
// DEMO_CARD_IDS.size directly would leave the shop counting toward a card it
// can never draw ("16 / 17 COLLECTED", forever) and the pitch advertising a
// deck one card larger than the ceiling printed beside it. Derived from CARDS,
// the drift costs the pool a card and nothing else lies about it.
//
// Summed into a LOCAL and published only on a clean pass, and unknown ids are
// SKIPPED rather than dereferenced — both because the memo LATCHES. A stale id
// threw part-way through the loop, which left the partial sum latched and every
// later call quietly answering a ceiling that was too low, with nothing anywhere
// saying so. The throw itself mattered too: the first caller at boot is the
// pitch, so it was a black screen in demo builds only. Skipping is the same
// stance loadEndlessCards takes on a stale card id — it may cost the pool a
// card, never the screen that prints it.
function demoPool() {
  if (!_demoPool) {
    let size = 0, weight = 0;
    for (const id of DEMO_CARD_IDS) if (CARDS[id]) { size++; weight += CARDS[id].weight; }
    _demoPool = { size, weight };
  }
  return _demoPool;
}

// Kept SEPARATE from demoMaxCommandCap so the pitch below can print the demo's
// real ceiling in a full-game tab too (TEST.demoPitch), where the gate correctly
// answers MAX_COMMAND_CAP and the screen would otherwise read "432 to 432".
function demoPoolCommandWeight() {
  return demoPool().weight;
}

// ...and how many cards that is — the denominator on the shop's COLLECTED line
// and the pitch's card row. Same reason it is not DEMO_CARD_IDS.size.
function demoPoolSize() {
  return demoPool().size;
}

function demoMaxCommandCap() {
  return demoActive() ? demoPoolCommandWeight() : MAX_COMMAND_CAP;
}

// The two sets above are hand-written ids over catalogs that are GENERATED —
// CARDS from the card templates, PLACEABLES from the toolbar list — and nothing
// else checks either coupling. A renamed card id silently shrinks the demo deck
// and its command ceiling; a renamed placeable key silently demo-LOCKS that
// item, since DEMO_PLACEABLE_KEYS is an allowlist. Neither shows up as a fault:
// the pitch derives its figures from these same sets, so a demo that lost a
// card still advertises exactly what it now ships. That is precisely the "no
// error anywhere" failure PLATFORM's checkDurableKeys exists to catch, so this
// is the same reconciliation, on DOMContentLoaded for the same reason —
// demo.js is script #6 and neither catalog exists yet at file eval.
function checkDemoSets() {
  const lostCards = [...DEMO_CARD_IDS].filter(id => !CARDS[id]);
  const lostKeys = [...DEMO_PLACEABLE_KEYS].filter(k => !PLACEABLES.some(p => p.key === k));
  if (lostCards.length) {
    console.error('DEMO_CARD_IDS names ' + lostCards.length + ' card id(s) CARDS does not ' +
      'generate — the demo pool and its command ceiling are short by that many: ' + lostCards.join(', '));
  }
  if (lostKeys.length) {
    console.error('DEMO_PLACEABLE_KEYS names key(s) that are not in PLACEABLES — whatever they ' +
      'were renamed to is now demo-locked with no other symptom: ' + lostKeys.join(', '));
  }
}
document.addEventListener('DOMContentLoaded', checkDemoSets);

// ===========================================================================
// THE PITCH (#demo-pitch) — the only DOM in this file, and the only part of it
// that is not a gate. Everything above tells the player what this build WON'T
// sell him, one banner at a time; this is the one screen that says what the
// full game adds. It opens at boot in a demo build, layered over the menu, and
// closes on one button (or Escape / Android back). Shown EVERY launch: nothing
// is persisted, there is no "don't show again", and there is deliberately NO
// STORE LINK — this repo has no outbound links at all, and the store differs
// per shell anyway.
//
// Every figure on it is DERIVED from the sets above and never written down.
// That is the whole reason it lives in this file rather than its own: the
// person who retunes DEMO_CARD_IDS scrolls past the screen that advertises it.
//
// LOAD ORDER: demo.js is script #6 (index.html), before helpers.js, state.js,
// hud.js, escalation.js and save.js. `el`, `SFX`, `CARDS`, `MAX_COMMAND_CAP`,
// `ESC_ROMAN`, `ESC_MAX`, `ESCALATIONS`, `escMultLabel`, `ENEMY_FACTIONS`,
// `ENEMY_TYPES`, `isFinalBoss` and `SAVE_FACTION_NAMES` are all resolved at
// CALL time. Nothing below may run at file eval — a top-level `el(...)` here
// black-screens the demo at parse. Same trap the memo above documents.
//
// TO DELETE: this fence, the #demo-pitch block in index.html, its CSS block
// (plus `#demo-pitch` in the opaque menu-screen list), and six call sites —
// main.js (the button + showDemoPitchAtBoot), input.js (the Escape rung),
// flow.js (FULL_SCREEN_OVERLAYS + handleAndroidBack), attract.js
// (attractStepping — this screen is opaque but layers over #intro rather than
// swapping it out, so the class test there cannot see it), test-api.js.
// ===========================================================================

// The locked half of the toolbar, off DEMO_PLACEABLE_KEYS DIRECTLY rather than
// through demoLockedPlaceable: that one early-outs inside tutorials and reads
// the live G, and this screen is a statement about the BUILD, not about
// whatever run happens to be loaded behind it (at boot, the attract demo).
function demoPitchLockedPlaceables() {
  return PLACEABLES.filter(p => !DEMO_PLACEABLE_KEYS.has(p.key));
}

// [{f, name, boss}] in ENEMY_FACTIONS order. The boss is FOUND by walking
// ENEMY_TYPES for isFinalBoss rather than written down, so a fifth army lands
// here for free; `t.faction || 'de'` because eboss carries no faction field —
// the same fallthrough BOSS_COPY documents in js/flow.js.
function demoPitchArmies() {
  const boss = {};
  for (const t of Object.values(ENEMY_TYPES)) {
    if (isFinalBoss(t)) boss[t.faction || 'de'] = t.name;
  }
  return ENEMY_FACTIONS.map(f => ({
    f,
    name: SAVE_FACTION_NAMES[f] || f.toUpperCase(),
    boss: boss[f] || '',
  }));
}

function buildDemoPitch() {
  const locked = demoPitchLockedPlaceables();
  const sold = PLACEABLES.length - locked.length;
  const armies = demoPitchArmies();
  const deck = Object.keys(CARDS).length;
  // rungs past the cap are NAMED here, unlike the dossier, which prints
  // FULL GAME and withholds them (escRowStateLabel / buildEscDossier). There
  // the name is the reward for earning the rung; here the screen's whole job is
  // to say what the product contains, and a page headed THE FULL GAME can't
  // send anyone off to farm for a rung this build will never unlock.
  const rungs = ESCALATIONS.filter(m => m.level > DEMO_ESC_MAX);

  // ONE ROW SHAPE, and it is the whole redesign: every row is a `have of total`,
  // so all four say the same thing in the same place instead of four unrelated
  // magnitudes (+14, +3, +155, +7) the reader has to weigh against each other.
  //
  //   o.have / o.total  drive the METER, so the four rows are comparable at a
  //                     glance — a tenth of a bar and half a bar are the pitch.
  //   o.haveTxt/totalTxt is the printed ratio, which is NOT always the number
  //                     (ESCALATION counts in roman numerals).
  //   the +N gain glyph is kept but DERIVED here rather than passed: it is
  //                     total - have by definition, and passing it separately is
  //                     how a row ends up advertising a gain its own meter
  //                     contradicts.
  //
  // The meter is filled by the FULL GAME and the demo's share is the dark inset
  // over it, not the other way round: the lit part has to be the part being sold
  // or the bar argues against the page it is on.
  const row = (o) => {
    const gain = o.total - o.have;
    const pct = o.total > 0 ? (o.have / o.total) * 100 : 0;
    return '<div class="dp-row">' +
      '<div class="dp-row__head">' +
        '<span class="dp-row__name">' + o.name + '</span>' +
        '<span class="dp-row__ratio">' +
          '<b>' + (o.haveTxt || o.have) + '</b>/' + (o.totalTxt || o.total) +
          ' <i>' + o.unit + '</i>' +
        '</span>' +
        '<span class="dp-row__gain">+' + gain + '</span>' +
      '</div>' +
      // aria-label because the meter is the row's headline figure and a bar of
      // two divs says nothing to a screen reader
      '<div class="dp-meter" role="img" aria-label="' + (o.haveTxt || o.have) +
        ' of ' + (o.totalTxt || o.total) + ' ' + o.unit + ' in the demo">' +
        '<span class="dp-meter__have" style="width:' + pct.toFixed(1) + '%"></span>' +
      '</div>' +
      '<div class="dp-row__desc">' + o.desc + '</div>' +
      (o.list ? '<div class="dp-row__list ' + (o.listClass || '') + '">' + o.list + '</div>' : '') +
    '</div>';
  };

  // THE ARMIES leads. It shipped third-of-four behind the arsenal, on the
  // smallest gain figure on the page (+3), and it is the largest thing the demo
  // does not contain — three rosters, three biomes, three wave-100 bosses, none
  // of which this build can ever roll. The pitch opens at BOOT, before the
  // player has touched a toolbar, so the first row is what frames the product.
  //
  // "TOOLBAR ITEMS", never "EMPLACEMENTS": that word is the name of ONE of the
  // toolbar's three categories (TOOLBAR_CATEGORIES, js/hud.js — units,
  // abilities, emplacements), and this figure counts all of PLACEABLES. It
  // shipped as EMPLACEMENTS, which put GUNNER, MORTARMAN and SHERMAN under the
  // heading the toolbar files them away from, on the first screen of the demo.
  el('demo-pitch-rows').innerHTML =
    row({
      have: 1, total: armies.length, unit: 'ARMIES', name: 'THE ARMIES',
      desc: 'The demo fights the Wehrmacht and nothing else. The full game rolls a different ' +
        'army every run — its own roster, its own ground, its own wave-100 boss:',
      // TWO CELLS PER ARMY and never a wrapper: the list is a two-column grid
      // so the bosses line up under each other, which only works if each army
      // contributes exactly the two cells (a fifth faction fielding no wave-100
      // boss still emits its empty boss cell rather than shunting the column).
      listClass: 'dp-row__list--armies',
      list: armies.map(a => {
        const dim = a.f === 'de' ? ' dp-army--have' : '';   // the army you already have, dimmed
        return '<b class="dp-army__name' + dim + '">' + a.name + '</b>' +
          '<span class="dp-army__boss' + dim + '">' + a.boss +
          (a.f === 'de' ? ' <i>IN THE DEMO</i>' : '') + '</span>';
      }).join(''),
    }) +

    row({
      have: sold, total: PLACEABLES.length, unit: 'ITEMS', name: 'THE ARSENAL',
      desc: sold + ' of ' + PLACEABLES.length + ' toolbar items are buyable in the demo. ' +
        'The other ' + locked.length + ' stay on the toolbar under a FULL GAME banner:',
      list: locked.map(p => '<span class="dp-tag">' + p.label + '</span>').join(''),
    }) +

    row({
      have: demoPoolSize(), total: deck, unit: 'CARDS', name: 'THE CARD SHOP',
      desc: demoPoolSize() + ' cards in the demo, ' + deck + ' in the full game — and the ' +
        'command a loadout can carry goes from ' + demoPoolCommandWeight() + ' to ' +
        MAX_COMMAND_CAP + '. Medals, battle plans and the shop itself work the same in both.',
    }) +

    row({
      have: DEMO_ESC_MAX, total: ESC_MAX, unit: 'RUNGS', name: 'ESCALATION',
      haveTxt: ESC_ROMAN[DEMO_ESC_MAX], totalTxt: ESC_ROMAN[ESC_MAX],
      desc: 'Ten stacking modifiers, each earned by putting a wave-100 boss down, each raising ' +
        'the pay. The demo stops at ' + ESC_ROMAN[DEMO_ESC_MAX] + ', worth ' +
        escMultLabel(DEMO_ESC_MAX) + ' medals. The ' + rungs.length + ' rungs above it run to ' +
        escMultLabel(ESC_MAX) + ':',
      list: rungs.map(m => '<span class="dp-tag"><b>' + ESC_ROMAN[m.level] + '</b> ' +
        m.name + '</span>').join(''),
    });
}

// No SFX here — nothing the player did opened this, and audio is gesture-gated
// anyway. The dismissal click is both the sound and the unlock gesture.
function openDemoPitch() {
  buildDemoPitch();
  el('demo-pitch').classList.remove('hidden');
  // .overlay is the scrollport and it keeps its offset across a hide, so a
  // screen reopened after being read to the end comes back at the end — it
  // opens at its own headline or the pitch does not make one. AFTER the class,
  // never before: a display:none element has no scrollport, so the write is
  // silently dropped and the old offset comes back with the screen.
  el('demo-pitch').scrollTop = 0;
}

function closeDemoPitch() {
  if (el('demo-pitch').classList.contains('hidden')) return;   // idempotent, as closeEscalationDossier is
  el('demo-pitch').classList.add('hidden');
  SFX.click();
}

function demoPitchOpen() {
  return !el('demo-pitch').classList.contains('hidden');
}

// the boot hook (js/main.js). Called on every launch and inert in the full
// game, so main.js needs no demo branch of its own.
function showDemoPitchAtBoot() {
  if (!demoActive()) return;
  openDemoPitch();
}
