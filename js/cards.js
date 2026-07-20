/* Mud & Blood — endless cards & battle plans.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// Roguelite meta-progression for Endless: reaching wave 10·N banks N ribbons
// (so a run to wave 46 earns 1+2+3+4). Between runs the card shop sells
// permanent per-unit-type upgrades into a collection, and the battle-plan
// screen decides which of them actually deploy. Card effects run through
// per-type hook tables built once per run in newGame() — the hot combat paths
// pay a single property lookup, and only for cards actually equipped.

const ENDLESS_CARDS_KEY = 'endlessCards';
const ENDLESS_CARDS_VERSION = 2;
// the shop starts offering three cards at once and can be widened a slot at a
// time up to six (two rows of three); each extra slot costs 10 ribbons, then
// doubles (10, 20, 40). The current width lives in the save as data.shopSlots.
const BASE_SHOP_SLOTS = 3;
const MAX_SHOP_SLOTS = 6;
const SHOP_SLOT_BASE_COST = 10;
// rerolling the shop offer costs ribbons and doubles each time (1, 2, 4, ...);
// the price resets to the base whenever the player starts another endless run
const REROLL_BASE_COST = 1;

// Battle plans: owning a card banks it in the collection, but only cards
// slotted into the active plan deploy. Every card weighs 1-6 command by how
// hard it warps a run; the player's command capacity starts at 6 and can be
// raised a point at a time for ribbons (5, then +20% compounding, rounded up).
const PLAN_SLOTS = 3;
const PLAN_NAMES = ['PLAN A', 'PLAN B', 'PLAN C'];
const BASE_COMMAND_CAP = 6;
const COMMAND_UPGRADE_BASE_COST = 5;

// frenzy resets whichever cooldown gates each type's killing weapon — the
// specialists reload the tube or the frag pouch, not just the sidearm
const FRENZY_EXTRA_CD = { bazooka: 'rocketCd', mortarman: 'mortCd', grenadier: 'grenCd' };

// Extended Tube: shots within the magazine cycle fast, then the tube runs
// dry and the shotgunner eats a long reload
const EXTENDED_TUBE_SHELLS = 7;

function frenzyReload(type) {
  const extra = FRENZY_EXTRA_CD[type];
  return u => {
    u.cd = 0;
    if (extra) u[extra] = 0;
  };
}

// Busted Down: called from damageUnit right as a unit would die. A unit with
// no rank left to lose has nothing to bust down to, so it dies normally.
function cheatDeath(u) {
  if (!u.rank) return false;
  const rankMult = u.t.tank ? 2.5 : (u.t.rankMult || 1);
  u.rank = Math.max(0, u.rank - 2);
  u.xp = Math.min(u.xp, RANKS[u.rank].kills * rankMult);
  u.hp = u.maxhp;
  G.texts.push({ x: u.x, y: u.y - 22, text: 'BUSTED DOWN — SURVIVED', ttl: 2.4 });
  return true;
}

// base TP cost of every buyable US unit, keyed by PLACEABLES key — used by
// War Surplus to compute both its own ribbon price and its discounted result
const PLACEABLE_COST_BY_TYPE = {};
for (const p of PLACEABLES) if (p.kind === 'unit') PLACEABLE_COST_BY_TYPE[p.key] = p.cost;

// an instant reload is worth whatever the cooldown it erases is worth:
// near-nothing on fast-cycling rifles, a run-warping 6 on the bazooka, whose
// long rocket cooldown vanishes entirely against massed waves
const FRENZY_WEIGHTS = {
  shotgunner: 2, sniper: 3, jeep: 2, aagun: 2, sherman: 4, atgun: 4,
  mortarman: 5, bazooka: 6,
};

// commons: stamped out once per eligible unit type. `excludes` drops types
// the effect can't touch (the flamethrower has no cooldown to reset).
// `weight` is the card's command weight, 1-6 by impact.
const CARD_COMMON_TEMPLATES = {
  frenzy: {
    name: 'Frenzy', cost: 5, excludes: ['flamer'],
    weight: type => FRENZY_WEIGHTS[type] || 1,
    desc: t => `A kill instantly reloads the ${t.name.toLowerCase()}'s weapon.`,
    hooks: type => ({ onKill: frenzyReload(type) }),
  },
  busteddown: {
    name: 'Busted Down', cost: 6,
    // cheating death matters most on the units a run can't afford to replace
    weight: type => ({ jeep: 3, atgun: 3, aagun: 3, sherman: 5 }[type] || 2),
    desc: t => `instead of dying your ${t.name.toLowerCase()} loses 2 ranks`,
    hooks: type => ({ beforeDeath: cheatDeath }),
  },
  // small-arms accuracy only — the units whose to-hit runs through fireShot.
  // shotgun/flamer spray and the vehicle/emplacement main guns don't roll it.
  zeroedin: {
    name: 'Zeroed In', cost: 6, excludes: ['shotgunner', 'flamer', 'sherman', 'atgun', 'aagun'],
    weight: type => ({ sniper: 3 }[type] || 2),
    desc: t => `${t.name} lands 25% more of their shots.`,
    hooks: type => ({ accMult: 1.25 }),
  },
  flakarmor: {
    name: 'Flak Armor', cost: 6, excludes: ['jeep', 'sherman', 'atgun', 'aagun'],
    // the flamer already halves blast damage on his own vest
    weight: type => type === 'flamer' ? 1 : 2,
    desc: t => `${t.name} takes 30% less damage from explosions.`,
    hooks: type => ({}),
  },
  // support units carry weak short-range sidearms; this trades one for a
  // full M1 rifle. Restricted to the three support types via `excludes` so
  // the common stamps out exactly one card each for officer/engineer/medic.
  // Flag-only, like Flak Armor: makeUnit reads `riflearm_<type>` at spawn.
  riflearm: {
    name: 'Standard Issue', cost: 6, weight: 2,
    excludes: ['rifleman', 'gunner', 'grenadier', 'shotgunner', 'bazooka',
      'mortarman', 'sniper', 'flamer', 'jeep', 'sherman', 'atgun', 'aagun'],
    desc: t => `Arms the ${t.name.toLowerCase()} with a full M1 rifle in place of their weak sidearm — longer range, harder hits.`,
    hooks: type => ({}),
  },
  // ribbon price runs opposite the unit's TP cost: a discount on a 3 TP
  // rifleman is worth far more over a run than one on a 60 TP Sherman
  costcut: {
    name: 'War Surplus', excludes: ['erifle', 'esmg', 'egren', 'emg', 'eoff', 'esniper', 'eflame'],
    cost: type => clamp(Math.round(60 / PLACEABLE_COST_BY_TYPE[type]), 5, 20),
    // command weight follows the same curve as the price: discounts on the
    // cheap units you spam all run weigh the most
    weight: type => clamp(Math.round(15 / PLACEABLE_COST_BY_TYPE[type]), 1, 5),
    desc: (t, type) => {
      const tp = PLACEABLE_COST_BY_TYPE[type];
      return `Cuts the ${t.name.toLowerCase()}'s TP cost by 25%, from ${tp} to ${warSurplusCost(tp)}.`;
    },
    hooks: type => ({}),
  },
};

// uniques: one-off cards tied to a single unit type
const CARD_UNIQUES = {
  deadmansswitch: {
    unit: 'rifleman', name: "Dead Man's Switch", cost: 9, weight: 3,
    desc: 'A dying rifleman pulls the pin — a live frag drops on the nearest enemy.',
    hooks: {
      // fires from the death block after the man is down; the corpse still
      // gets credited as the thrower so grenadiers won't scoop it back
      onDeath: u => {
        const gt = nearestEnemyInRange(u, 220 * fogMult());
        if (!gt) return;
        SFX.grenadeToss();
        G.grenades.push({
          x: u.x, y: u.y,
          tx: gt.x + rand(-14, 14), ty: gt.y + rand(-14, 14),
          t: 0, dur: 0.85, sx: u.x, sy: u.y, by: u,
          kind: 'frag', r: 44, dmg: 110,
        });
      },
    },
  },
  rifledslugs: {
    unit: 'shotgunner', name: 'Rifled Slugs', cost: 9, weight: 3,
    // flag-only: fireShotgun reads G.cardsOwned directly, like Extended Tube
    desc: 'Load slugs, not buckshot: one hard, long-range round with almost no spread.',
    hooks: {},
  },
  crackshot: {
    unit: 'sniper', name: 'Crack Shot', cost: 8, weight: 3,
    desc: 'Every miss guarantees the sniper\'s next shot connects.',
    hooks: {
      // beforeShot may return true to force the shot to hit; afterShot sees
      // the final result and is where the card arms itself on a miss
      beforeShot: u => { if (u.sureShot) { u.sureShot = false; return true; } return false; },
      afterShot: (u, hit) => { if (!hit) u.sureShot = true; },
    },
  },
  // these three don't gate on a per-shot/per-kill event, so they carry no
  // hooks — updateEngineer, the officer TP tick, and officerLimit() check
  // G.cardsOwned directly instead
  greasemonkey: {
    unit: 'engineer', name: 'Grease Monkey', cost: 8, weight: 2,
    desc: 'Engineers repair everything — emplacements and vehicles alike — twice as fast.',
    hooks: {},
  },
  hardenedworks: {
    unit: 'engineer', name: 'Hardened Works', cost: 12, weight: 4,
    // flag-only: updateEngineer reads G.cardsOwned directly, like Grease Monkey.
    // Lets an engineer push an already-fortified emplacement to a second tier —
    // tougher, deeper cover, longer range, harder wire.
    desc: 'Engineers push fortifications to a second tier: hardened emplacements with even more HP, cover, and range.',
    hooks: {},
  },
  rushorder: {
    unit: 'officer', name: 'Rush Order', cost: 10, weight: 4,
    desc: 'Officers draw TP every 15 seconds instead of 30.',
    hooks: {},
  },
  officercorps: {
    unit: 'officer', name: 'Officer Corps', cost: 12, weight: 5,
    desc: 'Raises the officer limit from 5 to 15.',
    hooks: {},
  },
  impactfuze: {
    unit: 'grenadier', name: 'Impact Fuze', cost: 10, weight: 3,
    desc: 'Grenadier frags detonate the instant they land instead of cooking off after a fuse.',
    hooks: {},
  },
  extendedtube: {
    unit: 'shotgunner', name: 'Extended Tube', cost: 9, weight: 3,
    desc: `${EXTENDED_TUBE_SHELLS} shells per clip; reload takes 3x after emptying.`,
    hooks: {},
  },
  warbonds: {
    unit: 'officer', name: 'War Bonds', cost: 14, weight: 5,
    desc: 'Kill bounty income decays toward its 10% floor over 400 waves instead of 200.',
    hooks: {},
  },
  // not tied to a unit type: carries a `label` so its chip reads EMPLACEMENTS
  // rather than a UNIT_TYPES name. Flag-only, like Flak Armor — explode() reads
  // G.cardsOwned directly and skips every defense structure's blast damage.
  blastshelter: {
    unit: 'emplacement', label: 'EMPLACEMENTS', name: 'Blast Shelter', cost: 16, weight: 6,
    desc: 'Overhead cover makes every emplacement immune to explosions — sandbags, bunkers, watch towers, camo nests, wire and mines take no blast damage.',
    hooks: {},
  },
  // like Blast Shelter, an emplacement card with no per-unit hook: the enemy
  // movers in update-enemies read G.cardsOwned directly to bite men in the wire.
  razorwire: {
    unit: 'emplacement', label: 'EMPLACEMENTS', name: 'Razor Wire', cost: 10, weight: 3,
    desc: 'Barbed wire is strung with razor tape — enemy infantry dragging through it have a chance to take light cuts every moment they struggle.',
    hooks: {},
  },
};

// War Surplus also covers the things the player buys off the toolbar that
// aren't soldiers: the emplacements (fortifications) and abilities (fire-
// support strikes). These have no UNIT_TYPES entry, so they get their own
// generation pass below rather than riding the per-unit-type template loop.
// A card here carries an explicit `label` for its shop/plan chip; the 25% cut
// is applied by placeableCost() reading the same costcut_<key> flag.
const COSTCUT_PLACEABLE_KINDS = ['defense', 'support'];

// flat catalog: id → { id, name, unitType, label?, unique, desc, cost, weight, hooks }
const CARDS = {};
{
  for (const [tid, tpl] of Object.entries(CARD_COMMON_TEMPLATES)) {
    for (const [type, t] of Object.entries(UNIT_TYPES)) {
      if (tpl.excludes && tpl.excludes.includes(type)) continue;
      const id = tid + '_' + type;
      const cost = typeof tpl.cost === 'function' ? tpl.cost(type) : tpl.cost;
      const weight = typeof tpl.weight === 'function' ? tpl.weight(type) : tpl.weight;
      CARDS[id] = { id, name: tpl.name, unitType: type, unique: false, desc: tpl.desc(t, type), cost, weight, hooks: tpl.hooks(type) };
    }
  }
  // one War Surplus per emplacement/ability, priced off its TP cost on the
  // same curves as the unit version (cheap, spammed placeables weigh most)
  for (const p of PLACEABLES) {
    if (!COSTCUT_PLACEABLE_KINDS.includes(p.kind)) continue;
    const id = 'costcut_' + p.key;
    const cost = clamp(Math.round(60 / p.cost), 5, 20);
    // emplacement/ability discounts are capped at 2 command regardless of price
    const weight = clamp(Math.round(15 / p.cost), 1, 2);
    const desc = `Cuts the ${p.label.toLowerCase()}'s TP cost by 25%, from ${p.cost} to ${warSurplusCost(p.cost)}.`;
    CARDS[id] = { id, name: 'War Surplus', unitType: p.key, label: p.label, unique: false, desc, cost, weight, hooks: {} };
  }
  for (const [id, c] of Object.entries(CARD_UNIQUES)) {
    CARDS[id] = { id, name: c.name, unitType: c.unit, label: c.label, unique: true, desc: c.desc, cost: c.cost, weight: c.weight, hooks: c.hooks };
  }
}

// Standard Issue: at spawn, a support unit with the card for its type trades
// its sidearm for the rifleman's M1 weapon profile. The shared UNIT_TYPES
// entry is cloned so only this man's gun changes — his aura, healing, or
// repair job and body stats (HP, speed) stay intact.
const RIFLE_SWAP_TYPES = ['officer', 'engineer', 'medic'];
function maybeSwapToRifle(u) {
  if (!G.cardsOwned || !RIFLE_SWAP_TYPES.includes(u.type)) return;
  if (!G.cardsOwned.has('riflearm_' + u.type)) return;
  const r = UNIT_TYPES.rifleman;
  u.t = {
    ...u.t,
    range: r.range, dmg: r.dmg, acc: r.acc, rof: r.rof,
    burst: r.burst, burstGap: r.burstGap, gun: r.gun, sfx: r.sfx,
  };
}

function defaultEndlessCards() {
  return {
    version: ENDLESS_CARDS_VERSION, ribbons: 0, owned: [], offer: [],
    capacity: BASE_COMMAND_CAP, plans: [[], [], []], activePlan: 0,
    rerollCost: REROLL_BASE_COST, shopSlots: BASE_SHOP_SLOTS,
  };
}

// total command weight a plan's cards occupy
function planCommandUsed(plan) {
  return plan.reduce((sum, id) => sum + CARDS[id].weight, 0);
}

function loadEndlessCards() {
  let data = null;
  try {
    const raw = localStorage.getItem(ENDLESS_CARDS_KEY);
    if (raw) data = JSON.parse(raw);
  } catch { data = null; }
  // v1 predates battle plans (every owned card was always live) — carry the
  // collection forward rather than wiping it
  const fromV1 = !!data && typeof data === 'object' && data.version === 1;
  if (fromV1) data.version = ENDLESS_CARDS_VERSION;
  if (!data || typeof data !== 'object' || data.version !== ENDLESS_CARDS_VERSION) {
    data = defaultEndlessCards();
  }
  data.ribbons = Number.isFinite(data.ribbons) ? Math.max(0, Math.floor(data.ribbons)) : 0;
  data.owned = Array.isArray(data.owned) ? data.owned.filter(id => CARDS[id]) : [];
  const offer = Array.isArray(data.offer) ? data.offer : [];
  data.offer = offer.filter(id => CARDS[id] && !data.owned.includes(id));
  data.capacity = Number.isFinite(data.capacity)
    ? Math.max(BASE_COMMAND_CAP, Math.floor(data.capacity)) : BASE_COMMAND_CAP;
  data.activePlan = Number.isInteger(data.activePlan)
    ? clamp(data.activePlan, 0, PLAN_SLOTS - 1) : 0;
  // reroll price is always a power-of-two multiple of the base; a missing or
  // tampered value falls back to the base cost
  data.rerollCost = Number.isFinite(data.rerollCost)
    ? Math.max(REROLL_BASE_COST, Math.floor(data.rerollCost)) : REROLL_BASE_COST;
  // shop width is clamped to its buyable range; older saves default to three
  data.shopSlots = Number.isFinite(data.shopSlots)
    ? clamp(Math.floor(data.shopSlots), BASE_SHOP_SLOTS, MAX_SHOP_SLOTS) : BASE_SHOP_SLOTS;
  const rawPlans = Array.isArray(data.plans) ? data.plans : [];
  data.plans = [];
  for (let i = 0; i < PLAN_SLOTS; i++) {
    const seen = new Set();
    const plan = (Array.isArray(rawPlans[i]) ? rawPlans[i] : [])
      .filter(id => CARDS[id] && data.owned.includes(id) && !seen.has(id) && !!seen.add(id));
    // a tampered save could pack a plan past capacity — shed from the back
    while (planCommandUsed(plan) > data.capacity) plan.pop();
    data.plans.push(plan);
  }
  if (fromV1) {
    // slot as much of the old always-on collection into Plan A as fits
    const plan = data.plans[0];
    for (const id of data.owned) {
      if (planCommandUsed(plan) + CARDS[id].weight <= data.capacity) plan.push(id);
    }
  }
  // keep the shop stocked; the offer lives in the save so a reload never
  // rerolls it — slots only change when a card is bought
  const before = data.offer.join();
  while (data.offer.length < data.shopSlots) {
    const pick = drawUnofferedCard(data);
    if (!pick) break;
    data.offer.push(pick);
  }
  if (data.offer.join() !== before || fromV1) saveEndlessCards(data);
  return data;
}

function saveEndlessCards(data) {
  localStorage.setItem(ENDLESS_CARDS_KEY, JSON.stringify(data));
}

// a random card the player neither owns nor is currently being offered
function drawUnofferedCard(data) {
  const taken = new Set([...data.owned, ...data.offer]);
  const pool = Object.keys(CARDS).filter(id => !taken.has(id));
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function buyCard(id) {
  const data = loadEndlessCards();
  const card = CARDS[id];
  const slot = data.offer.indexOf(id);
  if (!card || slot === -1 || data.owned.includes(id) || card.cost > data.ribbons) return false;
  data.ribbons -= card.cost;
  data.owned.push(id);
  // a fresh purchase slots straight into the active plan when the command fits
  const plan = data.plans[data.activePlan];
  if (planCommandUsed(plan) + card.weight <= data.capacity) plan.push(id);
  data.offer.splice(slot, 1);
  const repl = drawUnofferedCard(data);
  if (repl) data.offer.splice(slot, 0, repl);   // replacement takes the same slot
  saveEndlessCards(data);
  return true;
}

// ribbon price of the next +1 command point: 5 for the first, then each
// subsequent point costs 20% more than the last, rounded up
// (5, 6, 8, 10, 12, 15, 18, 22, ...)
function commandUpgradeCost(capacity) {
  let cost = COMMAND_UPGRADE_BASE_COST;
  for (let c = BASE_COMMAND_CAP; c < capacity; c++) cost = Math.ceil(cost * 1.2);
  return cost;
}

function buyCommandCapacity() {
  const data = loadEndlessCards();
  const cost = commandUpgradeCost(data.capacity);
  if (cost > data.ribbons) return false;
  data.ribbons -= cost;
  data.capacity += 1;
  saveEndlessCards(data);
  return true;
}

// ribbon price of the next card slot: 10 for the fourth, doubling for each
// after (10, 20, 40). Null once the shop is already at its six-slot maximum.
function shopSlotUpgradeCost(shopSlots) {
  if (shopSlots >= MAX_SHOP_SLOTS) return null;
  return SHOP_SLOT_BASE_COST * Math.pow(2, shopSlots - BASE_SHOP_SLOTS);
}

function buyShopSlot() {
  const data = loadEndlessCards();
  const cost = shopSlotUpgradeCost(data.shopSlots);
  if (cost === null || cost > data.ribbons) return false;
  data.ribbons -= cost;
  data.shopSlots += 1;
  // stock the freshly opened slot so it isn't a "SOLD OUT" placeholder
  const pick = drawUnofferedCard(data);
  if (pick) data.offer.push(pick);
  saveEndlessCards(data);
  return true;
}

// draw a fresh shop offer for ribbons; each reroll costs twice the last
// (2, 4, 8, ...), and the new cards avoid both the collection and the ones
// currently on display so a reroll always turns the slots over
function rerollShop() {
  const data = loadEndlessCards();
  if (data.rerollCost > data.ribbons) return false;
  data.ribbons -= data.rerollCost;
  const avoid = new Set([...data.owned, ...data.offer]);
  data.offer = [];
  for (let i = 0; i < data.shopSlots; i++) {
    let pool = Object.keys(CARDS).filter(id => !avoid.has(id) && !data.offer.includes(id));
    // if the deck is too thin to fill every slot with brand-new cards, allow
    // the just-replaced ones back in rather than leaving a slot empty
    if (!pool.length) pool = Object.keys(CARDS).filter(id => !data.owned.includes(id) && !data.offer.includes(id));
    if (!pool.length) break;
    data.offer.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  data.rerollCost *= 2;
  saveEndlessCards(data);
  return true;
}

// the reroll price returns to the base every time a new endless run begins
function resetRerollCost() {
  const data = loadEndlessCards();
  if (data.rerollCost !== REROLL_BASE_COST) {
    data.rerollCost = REROLL_BASE_COST;
    saveEndlessCards(data);
  }
}

// equip/unequip an owned card in the active plan; equipping fails when the
// plan lacks the command room for the card's weight
function togglePlanCard(id) {
  const data = loadEndlessCards();
  const card = CARDS[id];
  if (!card || !data.owned.includes(id)) return false;
  const plan = data.plans[data.activePlan];
  const at = plan.indexOf(id);
  if (at !== -1) plan.splice(at, 1);
  else if (planCommandUsed(plan) + card.weight <= data.capacity) plan.push(id);
  else return false;
  saveEndlessCards(data);
  return true;
}

function setActivePlan(i) {
  const data = loadEndlessCards();
  data.activePlan = clamp(i, 0, PLAN_SLOTS - 1);
  saveEndlessCards(data);
}

// the cards that actually deploy: the active battle plan, not the collection
function equippedEndlessCards() {
  const data = loadEndlessCards();
  return data.plans[data.activePlan];
}

// per-run hook table: { unitType: { onKill: [fns], beforeShot: [fns], afterShot: [fns],
// beforeDeath: [fns], onDeath: [fns], accMult: number } }
// Built once in newGame(); null when no cards are equipped or outside endless.
// `accMult` is a scalar the shot roll multiplies by; every other key is a list
// of hook fns. A card supplies accMult as a plain number in its hooks object.
function buildCardHooks() {
  const owned = equippedEndlessCards();
  if (!owned.length) return null;
  const table = {};
  for (const id of owned) {
    const card = CARDS[id];
    const slot = table[card.unitType] ||
      (table[card.unitType] = { onKill: [], beforeShot: [], afterShot: [], beforeDeath: [], onDeath: [], accMult: 1 });
    for (const [ev, fn] of Object.entries(card.hooks)) {
      if (ev === 'accMult') slot.accMult *= fn;
      else slot[ev].push(fn);
    }
  }
  return table;
}

// ribbons only accrue where the leaderboard counts: real endless runs on
// easy/medium/hard. Sandbox and testing (unlimited TP) and the tutorial pay
// nothing, so wave-jumping can't farm the shop.
function ribbonsEligible() {
  return G && G.level.id === 'endless' && G.difficulty && !G.difficulty.sandbox;
}

function awardWaveRibbons() {
  if (!ribbonsEligible() || G.wave % 10 !== 0) return;
  const n = G.wave / 10;
  const data = loadEndlessCards();
  data.ribbons += n;
  saveEndlessCards(data);
  G.ribbonsEarned += n;
  // floating notice instead of a banner: every 10th wave is a themed
  // set-piece whose banner must not be stomped
  G.texts.push({ x: W / 2, y: H * 0.62, text: `+${n} RIBBON${n === 1 ? '' : 'S'} EARNED`, ttl: 3.2 });
}

// ---- card shop UI

let cardShopReturnScreen = 'endless-select';

function openCardShop(fromScreen) {
  cardShopReturnScreen = fromScreen || 'endless-select';
  el(cardShopReturnScreen).classList.add('hidden');
  buildCardShopUI();
  el('card-shop').classList.remove('hidden');
}

function closeCardShop() {
  el('card-shop').classList.add('hidden');
  el(cardShopReturnScreen).classList.remove('hidden');
}

function ribbonLabel(n) {
  return n + (n === 1 ? ' RIBBON' : ' RIBBONS');
}

// the chip above a card's name: a unit card names its unit type; an
// emplacement/ability card carries its own label (no UNIT_TYPES entry)
function cardUnitLabel(card) {
  return (card.label != null ? card.label : UNIT_TYPES[card.unitType].name).toUpperCase();
}

function syncCardShopButton() {
  const btn = el('card-shop-btn');
  if (btn) btn.textContent = 'CARDS — ' + ribbonLabel(loadEndlessCards().ribbons);
}

function buildCardShopUI() {
  const data = loadEndlessCards();
  el('card-shop-ribbons').textContent = ribbonLabel(data.ribbons);
  el('card-shop-owned').textContent = data.owned.length + ' / ' + Object.keys(CARDS).length + ' COLLECTED';
  const row = el('card-shop-row');
  row.innerHTML = '';
  for (let i = 0; i < data.shopSlots; i++) {
    const card = CARDS[data.offer[i]];
    if (!card) {
      const empty = document.createElement('div');
      empty.className = 'shop-card shop-card-empty';
      empty.textContent = 'SOLD OUT';
      row.appendChild(empty);
      continue;
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'shop-card' + (card.unique ? ' shop-card-unique' : '');
    btn.disabled = card.cost > data.ribbons;
    const unit = document.createElement('span');
    unit.className = 'shop-card-unit';
    unit.textContent = cardUnitLabel(card) + (card.unique ? ' · UNIQUE' : '');
    const name = document.createElement('span');
    name.className = 'shop-card-name';
    name.textContent = card.name.toUpperCase();
    const desc = document.createElement('span');
    desc.className = 'shop-card-desc';
    desc.textContent = card.desc;
    const cmd = document.createElement('span');
    cmd.className = 'shop-card-command';
    cmd.textContent = 'COMMAND ' + card.weight;
    const cost = document.createElement('span');
    cost.className = 'shop-card-cost';
    cost.textContent = ribbonLabel(card.cost);
    btn.append(unit, name, desc, cmd, cost);
    btn.addEventListener('click', () => {
      if (buyCard(card.id)) {
        SFX.click();
        buildCardShopUI();
      }
    });
    row.appendChild(btn);
  }
  const reroll = el('card-shop-reroll');
  if (reroll) {
    reroll.textContent = 'REROLL — ' + ribbonLabel(data.rerollCost);
    reroll.disabled = data.rerollCost > data.ribbons;
  }
  const slotBtn = el('card-shop-slot');
  if (slotBtn) {
    const slotCost = shopSlotUpgradeCost(data.shopSlots);
    if (slotCost === null) {
      slotBtn.textContent = 'CARD SLOTS — MAX (6)';
      slotBtn.disabled = true;
    } else {
      slotBtn.textContent = '+1 CARD SLOT — ' + ribbonLabel(slotCost);
      slotBtn.disabled = slotCost > data.ribbons;
    }
  }
  buildBattlePlanUI();
  syncCardShopButton();
}

// ---- battle plan UI: the collection grid + plan tabs under the shop row

function buildBattlePlanUI() {
  const data = loadEndlessCards();
  const tabs = el('plan-tabs');
  tabs.replaceChildren();
  for (let i = 0; i < PLAN_SLOTS; i++) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'codex-tab plan-tab' + (i === data.activePlan ? ' active' : '');
    tab.textContent = `${PLAN_NAMES[i]} · ${planCommandUsed(data.plans[i])}/${data.capacity}`;
    tab.addEventListener('click', () => {
      if (i === data.activePlan) return;
      setActivePlan(i);
      SFX.click();
      buildBattlePlanUI();
    });
    tabs.appendChild(tab);
  }
  const plan = data.plans[data.activePlan];
  const used = planCommandUsed(plan);
  el('plan-command').textContent = `${used} / ${data.capacity} COMMAND`;
  const upBtn = el('plan-upgrade');
  const upCost = commandUpgradeCost(data.capacity);
  upBtn.textContent = `+1 COMMAND — ${ribbonLabel(upCost)}`;
  upBtn.disabled = upCost > data.ribbons;
  const grid = el('plan-collection');
  grid.replaceChildren();
  if (!data.owned.length) {
    const none = document.createElement('div');
    none.className = 'plan-empty';
    none.textContent = 'NO CARDS IN THE COLLECTION YET — BUY SOME ABOVE.';
    grid.appendChild(none);
    return;
  }
  for (const id of data.owned) {
    const card = CARDS[id];
    const equipped = plan.includes(id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'plan-card' + (equipped ? ' plan-card-equipped' : '')
      + (card.unique ? ' plan-card-unique' : '');
    // a reserve card that can't fit the remaining command stays visible but dead
    btn.disabled = !equipped && used + card.weight > data.capacity;
    btn.title = card.desc;
    const unit = document.createElement('span');
    unit.className = 'shop-card-unit';
    unit.textContent = cardUnitLabel(card);
    const name = document.createElement('span');
    name.className = 'plan-card-name';
    name.textContent = card.name.toUpperCase();
    const state = document.createElement('span');
    state.className = 'plan-card-state';
    state.textContent = (equipped ? 'DEPLOYED' : 'RESERVE') + ' · ' + card.weight + ' CMD';
    btn.append(unit, name, state);
    btn.addEventListener('click', () => {
      if (togglePlanCard(id)) {
        SFX.click();
        buildBattlePlanUI();
      }
    });
    grid.appendChild(btn);
  }
}
