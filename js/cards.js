/* Trenchworks: WW2 — endless cards & battle plans.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// Roguelite meta-progression for Endless: reaching wave 10·N banks N medals
// (so a run to wave 46 earns 1+2+3+4). Between runs the card shop sells
// permanent per-unit-type upgrades into a collection, and the battle-plan
// screen decides which of them actually deploy. Card effects run through
// per-type hook tables built once per run in newGame() — the hot combat paths
// pay a single property lookup, and only for cards actually equipped.

const ENDLESS_CARDS_KEY = 'endlessCards';
const ENDLESS_CARDS_VERSION = 2;
// the shop starts offering three cards at once and can be widened a slot at a
// time up to six (two rows of three); each extra slot costs 10 medals, then
// doubles (10, 20, 40). The current width lives in the save as data.shopSlots.
const BASE_SHOP_SLOTS = 3;
const MAX_SHOP_SLOTS = 6;
const SHOP_SLOT_BASE_COST = 10;
// rerolling the shop offer costs medals and doubles each time (1, 2, 4, ...);
// the price resets to the base whenever the player starts another endless run
const REROLL_BASE_COST = 1;

// Battle plans: owning a card banks it in the collection, but only cards
// slotted into the active plan deploy. Every card weighs 1-6 command by how
// hard it warps a run; the player's command capacity starts at 6 and can be
// raised a point at a time for medals (5, then +20% compounding, rounded up).
const PLAN_SLOTS = 3;
const PLAN_NAMES = ['LOADOUT A', 'LOADOUT B', 'LOADOUT C'];

// collection grid filter: a UNIT_TYPES key, 'other' for cards with no unit
// tie, or null to show everything. Reset whenever the card shop is (re)opened.
let collectionFilter = null;
const BASE_COMMAND_CAP = 6;
const COMMAND_UPGRADE_BASE_COST = 5;

// frenzy resets whichever cooldown gates each type's killing weapon — the
// specialists reload the tube or the frag pouch, not just the sidearm
const FRENZY_EXTRA_CD = { bazooka: 'rocketCd', mortarman: 'mortCd', grenadier: 'grenCd' };

// Extended Tube: shots within the magazine cycle fast, then the tube runs
// dry and the shotgunner eats a long reload
const EXTENDED_TUBE_SHELLS = 7;

// War Chest: extra TP front-loaded onto the run's starting balance in newGame()
const WAR_CHEST_TP = 25;

// Emergency Repair: triggers when vehicle HP drops below 30% to regenerate 30% HP
const EMERGENCY_REPAIR_HP_THRESHOLD = 0.3;
const EMERGENCY_REPAIR_HP_RESTORE = 0.3;
const EMERGENCY_REPAIR_COOLDOWN = 60;

// Field Hardened: the spawn-time HP multiplier. Applied to hp AND maxhp in
// makeUnit, so every ratio the game reads (bars, medic triage, Emergency
// Repair's 30% threshold) scales with it rather than against it.
const HARDENED_HP_MULT = 1.3;

// Cluster Rounds: the mortarman drops a stick of shells per fire order instead
// of one, but rushing the tube costs precision — every shell in the stick rolls
// its scatter against the widened spread. The mortar fire block reads both.
const CLUSTER_ROUNDS_SHELLS_MIN = 1;
const CLUSTER_ROUNDS_SHELLS_MAX = 3;
const CLUSTER_ROUNDS_SCATTER_MULT = 1.6;

// Frag Grenades: a grenadier's frag now sprays fragments on detonation. Each
// pellet flies out in a random direction, punches through anyone in its path
// (friend or foe — this is unaimed shrapnel), and burns off over shotgun-ish
// reach. spawnShrapnel (ordnance.js) reads these; the card is flag-only, gated
// on G.cardsOwned.has('fraggrenades') at the grenade's explosion in update.js.
const FRAG_SHRAPNEL_COUNT = 20;
const FRAG_SHRAPNEL_RANGE = 200;   // px a fragment travels before it spends out
const FRAG_SHRAPNEL_SPEED = 340;   // px/s
const FRAG_SHRAPNEL_DMG = 15;      // per pellet, at point blank; falls off with range
const FRAG_SHRAPNEL_HITR = 9;      // px radius a fragment sweeps for bodies

// Shell Shocked: a unique mortarman card. Any enemy that survives a hit credited
// to a US mortarman is dazed — frozen in place for a beat, no shooting or
// advancing. Flag-only, read straight from G.cardsOwned; damageEnemy calls the
// helper below and updateEnemy runs down the timer like it does prone.
const SHELLSHOCK_DURATION = 1;   // seconds an enemy is stunned per hit

function maybeShellShock(e, from) {
  if (e.dead || !from || from.side !== 'us' || from.type !== 'mortarman') return;
  // No boss ever reads its stun timer — every one of them dispatches ABOVE the
  // stun block in updateEnemy, and nothing ticks a part's timer down at all. So
  // skip the daze outright: a stun set here would latch on forever, unread,
  // while the battery kept firing, and the floating text would be a lie.
  // The Alien Walker belongs here for exactly that reason and no other — it is
  // none of the four faction bosses and killing it ends nothing, but it
  // dispatches up there WITH them. Its `boss` flag can't carry the test, since
  // the faction bosses' own parts don't have one.
  if (isFinalBoss(e.t) || isBossPart(e.t) || e.t.awalker) return;
  if (!(G.cardsOwned && G.cardsOwned.has('shellshocked'))) return;
  e.stun = Math.max(e.stun || 0, SHELLSHOCK_DURATION);
  G.texts.push({ x: e.x, y: e.y - 24, text: 'SHELL SHOCKED', ttl: 1.2 });
}

// Vampiric Flame: a slow-burn siphon that returns some of the flamer's own
// damage on enemies as healing. flameSpray reads this fraction directly.
const VAMPIRIC_FLAME_LIFESTEAL = 0.18;

// Flame Tank: rips the Sherman's 75mm out for a hull flamethrower. A short,
// wide cone that shreds infantry but can't crack armor. tankTargets and
// updateTankCombat read G.cardsOwned to swap the cannon for a flame burst,
// and render.js draws the turret stream. flameSpray takes the spec directly.
const FLAME_TANK_FLAME = { range: 150, arc: 0.42, dps: 92 };
const FLAME_TANK_BURST = 1.1; // seconds of sustained spray before the coax swap

// Sloped Armor: a unique Sherman card. Angled plate deflects the two AT threats
// that actually kill a tank — enemy cannon shells and rocket/AT launchers — for
// half damage. Flag-only, read straight from G.cardsOwned: explode()'s unit
// loop (ordnance.js) halves the blast when the Sherman is hit and the shot came
// from a tank shell (by.t.tank) or a rocket/AT weapon (by.t.rocket). It does
// nothing against flame (which flows over armor) or small arms.
const SLOPED_ARMOR_REDUCTION = 0.5;

// true when the given blast should be softened by Sloped Armor: the target is a
// tank carrying the card and the shot came off an enemy cannon or rocket tube.
function slopedArmorSoftens(u, by) {
  if (!u.t.tank || !by || !by.t) return false;
  if (!(G.cardsOwned && G.cardsOwned.has('slopedarmor'))) return false;
  return !!(by.t.tank || by.t.rocket);
}

// Heavy Shells / High Explosive: two unique cards, one for the mortarman and one
// for the Sherman, both doubling the blast radius of the round the unit lobs.
// The shell's damage is untouched — but explode()'s falloff is linear only down
// to 30% at the rim, so twice the radius is four times the ground covered AND
// roughly twice the damage to everything standing at the old edge. Flag-only,
// like Cluster Rounds: the mortar fire block and the tank cannon block in
// update-friendlies.js read G.cardsOwned through unitBlastMult() and scale the
// r they hand to scheduleShell. explode() itself is unchanged — every visual it
// draws (crater, flash, shockwave ring, fire and smoke spread) already derives
// from that r.
const BIG_BLAST_MULT = 2;

// blast-radius multiplier for the shell this unit is about to fire. US only:
// both fire blocks are shared with every enemy mortar team and every German,
// Japanese and Italian tank, so the side/type check is what keeps the card off
// them. Returns 1 for everyone else, so no call site takes a branch.
function unitBlastMult(u) {
  if (!u || u.side !== 'us' || !G.cardsOwned) return 1;
  if (u.type === 'mortarman' && G.cardsOwned.has('heavyshells')) return BIG_BLAST_MULT;
  if (u.type === 'sherman' && G.cardsOwned.has('heshells')) return BIG_BLAST_MULT;
  return 1;
}

// Morphine Syrette: a unique medic card. Every heal pulse a medic lands stamps a
// short guard on the man he patched, so he shrugs off part of whatever hits him
// next. Flag-only, like Rifled Slugs: the medic's heal tick
// (update-friendlies.js) sets the timer, updateUnit runs it down, and damageUnit
// scales the incoming hit while it holds.
//
// The duration is deliberately LONGER than the medic's 0.4s heal pulse and
// shorter than the walk out of MEDIC_RANGE: a wounded man standing in the aid
// post keeps the guard up continuously, and one who leaves loses it inside a
// second. The stamp re-arms rather than accumulating, so a pile of medics on one
// casualty can't stack it into permanence.
const MEDIC_GUARD_DURATION = 1;     // seconds the guard holds after a patch-up
const MEDIC_GUARD_REDUCTION = 0.2;  // fraction of incoming damage it eats

// Counterattack: a unique HQ card, and the only one that touches the run's own
// loss counter rather than a unit. Between assaults the reserve company moves up
// and takes back a stretch of the line, so one breach comes off G.breaches.
// Flag-only, read straight from G.cardsOwned: spawnWave (js/waves.js) calls the
// helper below once per wave, before launchWave puts the next assault on the
// field.
//
// It heals the LIVE tally and nothing else, which is the whole safety argument:
// the breach loop in update.js calls gameOver() the instant G.breaches reaches
// breachLimit, inside the same frame, so a wave that cracks the line past the
// limit still ends the run. The card buys ground back between waves; it can
// never resurrect one. Recovering to 0 also un-hots the HUD's breach plate for
// free — hud.js reads G.breaches every frame and owns no state of its own.
const BREACH_HEAL_PER_WAVE = 1;

function healBreachesBetweenWaves() {
  if (!(G.cardsOwned && G.cardsOwned.has('counterattack'))) return;
  if (G.breaches <= 0) return;
  G.breaches = Math.max(0, G.breaches - BREACH_HEAL_PER_WAVE);
  // a floating notice rather than a banner, for awardWaveMedals' reason: this
  // fires on the same tick a special wave announces itself, and that banner
  // must not be stomped
  G.texts.push({ x: W / 2, y: H * 0.56, text: 'GROUND RETAKEN — BREACH RECOVERED', ttl: 3.2 });
}

// Fire Mission: a unique OFFICER card, and the second per-wave hook — spawnWave
// (js/waves.js) calls the helper below next to healBreachesBetweenWaves, before
// launchWave puts the next assault on the field. Flag-only, read straight from
// G.cardsOwned like every other officer card.
//
// Three things about it:
// - It needs an OFFICER ALIVE to fire. The officer is the only unit in the game
//   who never shoots at anything, and this is the one card that gives him an
//   offensive job; without the check it would be an HQ card wearing his chip,
//   paying out on a field with no officer on it.
// - It shells a random enemy ON THE FIELD, and that is three conditions, not one.
//   A wave stages above the top edge at negative y, so an unfiltered pick would
//   drop most fire missions on ground the player can't see, against men who
//   haven't arrived. But `y > 0` alone is NOT "on the field" — it is one term of
//   inTheFight (js/helpers.js), and this scan is hand-rolled rather than routed
//   through targeting.js, so it went without the others until that predicate was
//   extracted. The two it was missing are why the helper exists: `entering` (the
//   Yamato rolls in from a FLANK, so her y is on-field while her x is hundreds of
//   pixels off the edge — measured x -170 on a 540-wide field, all ELEVEN of her
//   actors admitted here and none by any other scan), and `chute > 0` (a
//   paradropped stick hangs at an on-field y for seconds before it lands —
//   measured 3 admitted here, 0 anywhere else). Both are untouchable: damageEnemy
//   returns early on each, so a mission called onto one spent the proc to shell
//   empty ground the player mostly cannot even see.
//   Called before launchWave, the pool is exactly the previous wave's survivors.
// - The salvo is the toolbar MORTAR STRIKE's WEIGHT — 6 rounds, the same 42
//   radius and 90 damage, and it credits nobody, exactly like the bought strike.
//   What it does NOT inherit is that strike's pattern, and the difference is the
//   whole reason the card works. The toolbar spread (±68/±57, rounds walking in
//   one a second out to 7.4s) is sized for a player dropping rounds on a map
//   square he picked himself, usually AHEAD of an advance; called automatically
//   onto a man's own position it mostly lands around him. Measured on 16
//   autoplayed boards, four per army, both patterns aimed at the same man on the
//   same board and scored by enemies inside the blast at each round's impact:
//   the toolbar spread caught 35, the tighter corrected one below caught 66.
//   It is worse on exactly one army — Japanese chargers outrun a tight pattern,
//   7 against 4 — and that is accepted, since the wide version's edge there is
//   just a bigger box around men who have left it.
// A floating notice over the caller rather than a banner, for the reason
// Counterattack documents above: a special wave announces itself on this tick and
// its banner must not be stomped. Over the officer, so it reads as HIS call.
const FIRE_MISSION_CHANCE = 0.05;   // per wave, on top of a live officer
const FIRE_MISSION_SHELLS = 6;
const FIRE_MISSION_SPREAD_X = 38;   // observed fire, not a map square: about half
const FIRE_MISSION_SPREAD_Y = 32;   // the toolbar strike's box
const FIRE_MISSION_DELAY = 2.0;     // first round down
const FIRE_MISSION_GAP = 0.55;      // and the rest inside three more seconds, so
                                    // a walking target is still in the pattern

function maybeOfficerFireMission() {
  if (!(G.cardsOwned && G.cardsOwned.has('firemission'))) return;
  const officers = G.units.filter(u => !u.dead && u.type === 'officer');
  if (!officers.length) return;
  const targets = G.enemies.filter(inTheFight);
  if (!targets.length) return;
  if (Math.random() >= FIRE_MISSION_CHANCE) return;
  const caller = pick(officers);
  const tgt = pick(targets);
  for (let i = 0; i < FIRE_MISSION_SHELLS; i++) {
    scheduleShell(tgt.x + rand(-FIRE_MISSION_SPREAD_X, FIRE_MISSION_SPREAD_X),
      tgt.y + rand(-FIRE_MISSION_SPREAD_Y, FIRE_MISSION_SPREAD_Y),
      FIRE_MISSION_DELAY + i * FIRE_MISSION_GAP, 42, 90, false);
  }
  G.texts.push({ x: caller.x, y: caller.y - 22, text: 'FIRE MISSION — SHOT OUT', ttl: 2.6 });
}

// Level the Barrels: the flak mount learns to depress. It keeps its full air
// role, but anything that closes inside this range on the ground catches a
// 40mm HE round. Deliberately short — this is a last-ditch self-defence wedge,
// not a second AT gun. updateAAGun and the range overlay both read it.
const AA_GROUND_RANGE = 200;
const AA_GROUND_HITR = 20;
const AA_GROUND_DMG = 55;

// flag-only card: true when this run deployed Level the Barrels, so the AA gun
// may swing its wedge down onto ground infantry inside AA_GROUND_RANGE
function aaGroundFireEnabled() {
  return !!(G.cardsOwned && G.cardsOwned.has('leveltbarrels'));
}

// Canister Shot: the 57mm's tin of lead balls. The gun keeps its AP round and
// the whole anti-armor job — this is only the answer to the infantry that walked
// up to a piece that could not touch them. It is a CONE SWEEP, not a shell:
// fireCanister resolves it in one pass over G.enemies exactly the way
// fireShotgun resolves buckshot. Nothing is in flight and nothing goes through
// scheduleShell.
//
// The range is a FRACTION of the gun's live resolved range, not a flat number
// like AA_GROUND_RANGE. Deliberate: rank, a watch tower and Rangefinders already
// stretch the AP reach, and the canister band stretches with them off the same
// one number, so updateATGun and both range overlays stay in lockstep without
// any of the three knowing what the others did.
const CANISTER_RANGE_FRAC = 0.30;   // 156px off the 519 base — the gun's own front porch
const CANISTER_ARC = 0.5;           // half-angle of the pattern (the trench gun's is 0.52)
const CANISTER_PELLETS = 27;        // balls in the tin; how many CONNECT is rolled per man
const CANISTER_PELLET_DMG = 13;     // per ball that connects
const CANISTER_FALLOFF = 0.5;       // fraction of the punch shed across the band (buckshot's)
const CANISTER_RELOAD = 0.65;       // canister is a fixed round with no fuze to set
const CANISTER_LAY_TOL = 0.35;      // a pattern this wide doesn't need the bore on the man

// flag-only card: true when this run deployed Canister Shot, so the AT gun may
// load a tin for the infantry inside CANISTER_RANGE_FRAC of its own reach
function canisterShotEnabled() {
  return !!(G.cardsOwned && G.cardsOwned.has('canistershot'));
}

// what a tin of lead balls can actually hurt. Everything armored is skipped
// OUTRIGHT rather than scaled the way fireShotgun scales buckshot on a tank
// (x0.06) or an APC (x0.2): the gun already carries a 403-point AP shell for
// those, so a multiplier here would only ever be a worse version of the round it
// already has. Dropping them whole is also what keeps a pattern off the Yamato's
// armor belt — FIVE actors on ONE HP pool, which a cone sweep would otherwise
// resolve against five times over. Every other multi-actor part (her gun tubs,
// the train's gun posts, the Progenitor's pods) owns its HP, so catching several
// in one pattern is the same legitimate reward that shelling the cluster pays.
// The Abomination carries no armour flag but IS a tier-one AP target in
// updateATGun, so the same rule applies to it by name: it walks straight into
// the canister band, and without this the gun would swap its 403-point shell for
// a tin of buckshot at exactly the moment the thing arrived.
function canisterHittable(e) {
  const t = e.t;
  return !(t.tank || t.apc || t.vehicle || t.bike || t.v2 || e.type === 'zabom');
}

// Reinforced Plate: a unique card on the two armor abilities, and the only one
// that upgrades a thing the player BUYS rather than a man. Both plate carriers
// come off the same ARMOR_POINTS number, so one multiplier covers both.
//
// Flag-only, like Rifled Slugs: the armor branch of applyPlacement (js/input.js)
// asks armorPlatePoints() for the bar it fits. It stamps maxBodyArmor/
// maxFlakArmor, so everything downstream that reads a fraction of the max — the
// armor bars, the engineer's Field Armorer repair, the medic triage sort —
// scales with the card rather than against it, exactly like Field Hardened's HP.
// Plate already on a man is untouched; the card is read at the moment of
// purchase, and re-buying refills to the new bar.
const ARMOR_PLATE_MULT = 2;

// how many points of plate one armor purchase fits on a man
function armorPlatePoints() {
  if (G.cardsOwned && G.cardsOwned.has('reinforcedplate')) return ARMOR_POINTS * ARMOR_PLATE_MULT;
  return ARMOR_POINTS;
}

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
// War Surplus to compute both its own medal price and its discounted result
const PLACEABLE_COST_BY_TYPE = {};
for (const p of PLACEABLES) if (p.kind === 'unit') PLACEABLE_COST_BY_TYPE[p.key] = p.cost;

// Passenger: a jeep deployed with this card rolls in carrying one free
// infantryman. The foot soldiers only — no second vehicle or emplacement rides
// shotgun. Each type's odds run inverse to its TP cost, so the 3 TP rifleman
// hops out far more often than a 15 TP officer. maybeSpawnPassenger fires from
// the unit-placement block in input.js right after the jeep is pushed.
const PASSENGER_INFANTRY = ['rifleman', 'gunner', 'grenadier', 'shotgunner',
  'bazooka', 'mortarman', 'sniper', 'medic', 'engineer', 'officer', 'flamer'];

function rollPassengerType(pool) {
  if (!pool.length) return null;
  let total = 0;
  const weights = pool.map(k => {
    const w = 1 / PLACEABLE_COST_BY_TYPE[k];
    total += w;
    return w;
  });
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[0];
}

// The officer cap is a RULE, not a price, and this is the one seat in the game
// that doesn't pay a price. Every purchase path enforces it — place(), the
// mobile toolbar, TEST.buy, and the toolbar's own greyed-out chip — but a
// passenger is pushed straight into G.units, so before this the card was a way
// to field an eleventh officer, and then a twelfth. Measured: a field already
// holding the full 10 took 22 more from 400 jeeps.
//
// Dropped from the POOL rather than rerolled after the fact, so the remaining
// types renormalize and a jeep bought at the cap still carries someone. The
// officer is the priciest type on the list and so the rarest seat anyway
// (weights run 1/cost), which is why this went unnoticed.
function passengerPool() {
  if (officerCount() < officerLimit()) return PASSENGER_INFANTRY;
  return PASSENGER_INFANTRY.filter(k => k !== 'officer');
}

function maybeSpawnPassenger(jeep) {
  if (!G.cardsOwned || !G.cardsOwned.has('passenger')) return;
  if (jeep.type !== 'jeep') return;
  const type = rollPassengerType(passengerPool());
  if (!type) return;
  // drop the passenger just behind the jeep so he doesn't spawn on the .50 cal
  const u = makeUnit(type, jeep.x + rand(-22, 22), jeep.y + rand(18, 34));
  G.units.push(u);
  G.texts.push({ x: u.x, y: u.y - 22, text: 'PASSENGER: ' + UNIT_TYPES[type].name.toUpperCase(), ttl: 2 });
}

// Bazooka Rider: a unique jeep card that straps a rocket gunner into the
// passenger seat. The jeep keeps its pintle .50 (runWeapon in the vehicle
// branch of updateFriendly) and the rider adds rocket fire on the move —
// armor-piercing punch riding a fast, unarmored chassis. Its own cooldown and
// aim live on the jeep instance (jbazCd / jbazFace / jbazFlash) so the drawn
// tube tracks whatever the rider is shooting at, independent of the .50's swing.
// Flag-only, like Rifled Slugs: fireJeepBazooka runs from updateFriendly and
// drawJeep paints the rider, both reading G.cardsOwned.
const JEEP_BAZOOKA = { range: 220, cdMin: 4.6, cdMax: 6.4, r: 30, dmg: 120, speed: 380 };

function jeepHasBazookaRider() {
  return !!(G.cardsOwned && G.cardsOwned.has('bazookarider'));
}

function fireJeepBazooka(u, dt) {
  if (u.type !== 'jeep' || !jeepHasBazookaRider()) return;
  if (u.jbazFlash > 0) u.jbazFlash -= dt;
  if (u.jbazCd == null) u.jbazCd = rand(JEEP_BAZOOKA.cdMin, JEEP_BAZOOKA.cdMax);
  u.jbazCd -= dt;
  if (u.jbazCd > 0) return;
  const rk = JEEP_BAZOOKA;
  // same pick and same launch as the man on foot (js/update-friendlies.js) —
  // all that differs is where the rider keeps his bearing, since the tube tracks
  // independently of the .50's swing, and that he has no camo nest to give away
  const rt = rocketTarget(u, rk, unitRange(u, rk.range) * fogMult());
  if (!rt) return;
  // a veteran jeep crew reloads the tube faster
  u.jbazCd = rand(rk.cdMin, rk.cdMax) * rankCdMult(u);
  u.jbazFace = Math.atan2(rt.y - u.y, rt.x - u.x);
  u.jbazFlash = 0.08;
  launchRocket(u, rk, rt);
}

// Armor Piercing: a unique gunner card. His BAR loads an AP belt that chews
// through armor — enemy jeeps (Kübelwagen), halftracks/amtracks and motorcycles
// take extra damage per round, and even tanks feel it. The tank multiplier is
// larger because armored rounds start from the 0.04 armor floor in fireShot,
// so a small factor there would vanish; even at this rate the gunner only chips
// a tank down, never cracks one like the bazooka does. Flag-only, like Rifled
// Slugs: fireShot reads G.cardsOwned when a gunner's round lands on a vehicle.
const ARMOR_PIERCING_MULT = 3;        // jeeps, halftracks, motorcycles
const ARMOR_PIERCING_TANK_MULT = 6;   // tanks, on top of their heavy armor floor

function armorPiercingMult(shooter, target) {
  if (shooter.side !== 'us' || shooter.type !== 'gunner') return 1;
  if (!target.t) return 1;
  if (!(G.cardsOwned && G.cardsOwned.has('armorpiercing'))) return 1;
  if (target.t.tank) return ARMOR_PIERCING_TANK_MULT;
  if (target.t.bike || target.t.vehicle) return ARMOR_PIERCING_MULT;
  return 1;
}

// Beaten Zone: the gunner's second unique. His bursts pin for twice as long.
//
// DURATION IS THE AXIS, not SUP_RADIUS, and that choice is the card. A pin's
// length is the thing the suppression block in constants.js is built around —
// the pin runs for the burst plus a tail precisely so that a longer belt holds
// a sector down for longer — so doubling it is what "twice the suppression"
// means here. Doubling the radius instead would be FOUR times the ground for a
// card that claims two, and would quietly turn the gunner into the answer to
// massed infantry rather than a man who holds one lane.
//
// It multiplies the whole pin (burst length + tail), applied in suppress()
// before the veteran shrug — so a rank-3 enemy still recovers 45% faster than a
// green one, and an officer's rally still burns it down at OFFICER_RALLY_MULT.
// The counter-play survives; it just costs the enemy twice as much of it.
//
// Only reaches men suppression already reaches. Japanese fanatics, the Horde,
// a charging Italian, bosses and crews are all exempt inside suppress(), and
// twice nothing is nothing — the card is worth the most against the Wehrmacht,
// which is the only army that takes cover for a machine gun at all.
const BEATEN_ZONE_MULT = 2;

// the pin multiplier for a gun that just beat a zone. Flag-only, like Armor
// Piercing: suppressArea reads G.cardsOwned through here on every burst.
function suppressionPinMult(actor) {
  if (!actor || actor.side !== 'us' || actor.type !== 'gunner') return 1;
  if (!(G.cardsOwned && G.cardsOwned.has('beatenzone'))) return 1;
  return BEATEN_ZONE_MULT;
}

// HEAT Rounds: the bazooka's unique. A shaped charge does not grind a plate
// down, it burns a hole through it — so his blast SKIPS the flak pool entirely
// and lands on the man still wearing the vest.
//
// A POOL BYPASS, not a multiplier, and that distinction is the whole card.
// Armor here is a bar that soaks damage 1:1 until it breaks (see armorEnemy),
// and explode's falloff means a 120-damage rocket delivers only ~36 at the rim
// of its own crater — less than a wave-40 flak plate absorbs. So a vest used to
// eat the entire splash ring, which is exactly where a bazooka kills groups
// rather than single tanks. It is also the one clean answer to Escalation VI,
// whose only effect is doubling every pool at spawn.
//
// Tanks are deliberately untouched. Nothing with a hull is ever issued a pool
// (armorEnemy returns early on tank/vehicle/apc/bike/v2), and the rocket
// already multiplies against armor by its own armorMult of 2.75 — layering a
// bonus there would just be a bigger number on the unit whose entire job is
// already killing tanks, and would tell the player nothing new.
//
// SIDE-BLIND ON PURPOSE: the same jet goes through your own men's flak armor
// too. That friendly-fire hole is what the card pays with, in the same shape as
// High Explosive and Cluster Rounds, and it is stated on the card.
//
// The bazooka UNIT only. A jeep running Bazooka Rider fires under type 'jeep',
// so this gate leaves it out — exactly as its shop chip (BAZOOKA) promises.
// explode() may pass a bare {x,y} with no firer, which reads through as false.
function heatPierces(from, kind) {
  if (kind !== 'blast' || !from || from.side !== 'us' || from.type !== 'bazooka') return false;
  return !!(G.cardsOwned && G.cardsOwned.has('heatrounds'));
}

// the copper jet punching the plate — hotter and fewer than armorPing's cold
// metallic spatter, so a pierce reads differently from a plate that held
function heatPierceSpark(a) {
  for (let i = 0; i < 4; i++) {
    G.particles.push({
      x: a.x + rand(-5, 5), y: a.y + rand(-10, 4), vx: rand(-30, 30), vy: rand(-55, -10),
      ttl: rand(0.16, 0.34), grav: 160, size: rand(1.2, 2.2),
      color: pick(['#fff2c0', '#ffb347', '#ff7a2a']),
    });
  }
}

// Headshot: a unique card the sniper and the rifleman each get their own copy
// of. A round that genuinely connects has a chance to find the head and drop
// the man outright, however much he had left. Flag-only, like Armor Piercing:
// fireShot reads G.cardsOwned through the helper below, at the same point in
// the damage block.
//
// The two rates are wildly apart ON PURPOSE, because the honest unit of a
// per-shot proc is procs per SECOND, not the percentage on the card. The
// sniper cycles one round every 5.2s at 0.72 accuracy (~0.055 kills/s at 40%);
// the rifleman cycles every 0.88s at 0.55 accuracy (~0.031 kills/s at 5%). A
// flat rate across both would have been worth roughly six times more to the
// rifleman — the cheapest unit in the game, fielded in dozens — and would have
// read as a sniper card that the sniper was the wrong unit for.
const HEADSHOT_CHANCE = { sniper: 0.40, rifleman: 0.05 };
const HEADSHOT_CARD = { sniper: 'headshotsniper', rifleman: 'headshotrifleman' };

// Follow Through (the other sniper/rifleman pair, defined in CARD_UNIQUES): a
// kill arms the man's next shot with this range multiplier. Lives here rather
// than in constants.js because card tuning does — update-friendlies.js already
// reaches across for EMERGENCY_REPAIR_HP_THRESHOLD the same way. Read by
// unitRangeMult, so the targeting scan, the accuracy falloff and the drawn
// range ring all lengthen together.
const LONG_SHOT_MULT = 2;

// true when this round should kill outright. Infantry only: a headshot on a
// tank, a halftrack, a jeep, a motorcycle, a rocket battery or a dug-in gun is
// not a thing, and small arms already ping off armor at the 0.04 floor.
function headshotKills(shooter, target) {
  if (shooter.side !== 'us' || !target.t || target.dead) return false;
  const card = HEADSHOT_CARD[shooter.type];
  if (!card) return false;
  if (!(G.cardsOwned && G.cardsOwned.has(card))) return false;
  const t = target.t;
  if (t.tank || t.apc || t.vehicle || t.bike || t.v2 || t.gunEmplacement) return false;
  // and never a boss or one of its child part actors — a 40% instant kill on a
  // battery or a pus module would end every wave-100 fight in a magazine.
  //
  // `boss` carries the parent half, and it is deliberately NOT the per-faction
  // flag list maybeShellShock above uses. Naming the four faction bosses and the
  // Alien Walker catches every actor that arrives at wave 100 or 666 — and
  // silently lets the round through on the ABOMINATION, a mid-run zombie whose
  // whole design is "enormous HP standing in for armor" and which this card's
  // own text ("bosses are unaffected") already promises to spare.
  // Measured before this line: 775 procs in 2000 rolls on a zabom, against 0 on
  // the Progenitor beside it. It is boss:true like the other five, so one flag
  // covers all of them and a fifth faction's boss for free. canisterHittable
  // reaches for `e.type === 'zabom'` by name instead only because it must ALSO
  // reject things that are not bosses at all.
  //
  // The two lists therefore diverge on purpose, and must: a daze on the
  // Abomination is a real effect that its own dispatch reads, so adding `boss`
  // to maybeShellShock would delete a working card rather than fix one.
  if (t.boss) return false;
  // the child part actors, which carry no `boss` of their own
  if (isBossPart(t)) return false;
  return Math.random() < HEADSHOT_CHANCE[shooter.type];
}

// Ricochet: the decoy's own unique card. A round that hits the scarecrow has a
// chance to deflect straight back down the path it came in on and strike the man
// who fired it. Flag-only, like Shell Shocked: damageDummy reads G.cardsOwned
// through the helper below.
//
// SMALL ARMS ONLY, and the `kind` gate is the whole of it. Flame flows over the
// straw and a bayonet is not a round, so neither carries a `kind` down to
// damageUnit; blasts never reach damageDummy at all (explode() subtracts from
// d.hp directly). So one `kind === 'bullet'` test covers all three exclusions
// with no list to keep in sync.
const DUMMY_RICOCHET_CHANCE = 0.15;

// A hit on the decoy that deflects back at the shooter. Returns the FULL damage
// the decoy just took, so the card scales itself off whatever gun fired — a
// Kar98 round stings, an MG42 burst mauls the crew firing it — and there is no
// second number to tune against every weapon in the game.
function dummyRicochet(d, dmg, from, kind) {
  if (kind !== 'bullet') return;
  if (!(G.cardsOwned && G.cardsOwned.has('ricochet'))) return;
  // an attributed hit from a live enemy: a deflection needs somewhere to go
  if (!from || !from.t || from.side !== 'de' || from.dead) return;
  if (Math.random() >= DUMMY_RICOCHET_CHANCE) return;
  // the round leaving the straw, drawn back up its own flight path
  G.tracers.push({ x1: d.x, y1: d.y - 8, x2: from.x, y2: from.y, ttl: 0.09, life: 0.09 });
  for (let i = 0; i < 2; i++) {
    G.particles.push({
      x: d.x + rand(-4, 4), y: d.y + rand(-12, 2), vx: rand(-60, 60), vy: rand(-80, -20),
      ttl: rand(0.12, 0.28), grav: 200, size: rand(1, 1.6),
      color: pick(['#f0e8b0', '#d8e0ea', '#aab4c0']),
    });
  }
  // No firer credited ON PURPOSE. damageEnemy hands `from` to creditKill, which
  // calls gainXP — passing the dummy would give a scarecrow a rank, a PROMOTED
  // banner and the promotion jingle. null short-circuits creditKill and files
  // the kill in recapEnemyKilled's existing '_indirect' bucket, which is what a
  // bullet nobody aimed is. The kill count and the TP bounty still land.
  damageEnemy(from, dmg, null, 'bullet');
}

// Ambush: the camo nest's own card, and the only one in the game that pays a
// man for NOT having fired. A round loosed while the enemy still cannot see him
// lands for double; markCamoFired then reveals him and the bonus is gone until
// the nest hides him again. Flag-only, like Ricochet above — fireShot and
// fireShotgun read G.cardsOwned through takeAmbushShot.
//
// DIRECT FIRE ONLY, and that is a balance rule rather than a plumbing one.
// isCamouflaged is the entire precondition, so the nest's own reveal timer is
// also the card's rate limit: 3s standard, 1.5s fortified, 0.5s hardened. A man
// in a firefight is exposed the whole time and only ever ambushes out of a lull,
// which is the loop the card is for. Every heavy tube cycles SLOWER than any of
// those windows (7-14s), so a grenade, rocket or mortar shell would qualify on
// every single shot and the card would read as a flat +100% damage for three
// unit types. Flame is worse still: flameSpray calls markCamoFired every tick,
// so its "first shot" is one 1/60s slice of burn.
const AMBUSH_DMG_MULT = 2;

// Fires the ambush if this man is shooting from concealment: reports whether the
// round is doubled and throws the floating text, since the proc condition is
// otherwise invisible to the player. NOT a pure predicate, and the name says so.
// It must be called BEFORE markCamoFired — that is the call that breaks the
// concealment this tests. isCamouflaged covers side, unit type, the exposure
// timer and a live nest in one, so a Sherman parked on a nest is never hidden
// and never ambushes.
function takeAmbushShot(u) {
  if (!(G.cardsOwned && G.cardsOwned.has('ambush'))) return false;
  if (!isCamouflaged(u)) return false;
  G.texts.push({ x: u.x, y: u.y - 20, text: 'AMBUSH', ttl: 1.2 });
  return true;
}

// Forward Observer: a spotter works from the top of every watch tower, and the
// men in the sector below him pick targets through smoke that would otherwise
// have them firing blind. The tower's SECOND footprint, and deliberately a much
// wider one than WATCHTOWER_AURA — the aura is who is close enough to shoot
// further off the tower's height, this is how much ground the man up it can
// SEE. One radius per fortification tier, like BUNKER_COVER_R, so an engineer
// widens the sector rather than only hardening the ladder he climbs.
//
// Sized against a rifle: 130 is about a rifleman's own reach, so one tower
// covers roughly one sector of the line and never the field. That bound is the
// point — the smokescreen event has to keep working everywhere else, or a
// 10 TP tower switches an entire mechanic off.
const WATCHTOWER_SPOT_R = [130, 155, 180];

// true when this shooter is being spotted from a tower and so sees through
// smoke. Read by smokeBlocksLOS on the OBSERVER only, so it can never hand an
// enemy vision of a man standing under the tower.
//
// The 0.4s G.buffFrame cache the officer aura and Cannibalize use, and it is
// tested FIRST — ahead of even the cards check. This is the one card helper
// read per candidate PAIR rather than per shot, so a bare Set lookup at the top
// measured 0.15us on every one of them (0.9 of 6.7ms across a 40v150 board);
// behind the cache the repeat cost is one property compare and the lookup runs
// at most once per actor per 0.4s. Enemies get stamped too, which is the point
// — they are the `a` argument on half the calls in targeting.js. Same staleness
// deal as isCamouflaged's nest lookup: a man who walks over the sector line is
// spotted (or not) up to a beat late. The tower's own death is NOT deferred
// that way, since hp is tested live below.
function spotterSeesThrough(u) {
  if (!u) return false;
  const bf = G.buffFrame || 0;
  if (u._spotFrame === bf) return u._spotted;
  u._spotFrame = bf;
  u._spotted = false;
  if (u.side !== 'us' || !G.watchtowers.length) return false;
  // the tower's other benefits stop at the infantry (coverBlock,
  // watchtowerRangeMult); its sector does too, or armour and the staked guns
  // would still be shooting through smoke off a platform they never climbed
  if (isVehicleOrGun(u)) return false;
  if (!(G.cardsOwned && G.cardsOwned.has('forwardobserver'))) return false;
  for (const wt of G.watchtowers) {
    if (wt.hp <= 0) continue;
    const r = WATCHTOWER_SPOT_R[emplacementTier(wt)];
    if (dist2(wt, u) < r * r) { u._spotted = true; break; }
  }
  return u._spotted;
}

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
    name: 'Frenzy', cost: 5, excludes: ['flamer', 'medic'],
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
    name: 'Zeroed In', cost: 6, excludes: ['shotgunner', 'flamer', 'sherman', 'atgun', 'aagun', 'medic'],
    weight: type => ({ sniper: 3 }[type] || 2),
    desc: t => `${t.name} lands 25% more of their shots.`,
    hooks: type => ({ accMult: 1.25 }),
  },
  // stretches every unit's engagement range by 25% — the one type it can't help
  // is the medic, whose reach is a heal radius, not a gun. Flag-only, like
  // Desperate Measures: unitRangeMult reads `rangefinders_<type>` off
  // G.cardsOwned so the targeting scan and the drawn range ring lengthen together.
  rangefinders: {
    name: 'Rangefinders', cost: 6, weight: 2, excludes: ['medic'],
    desc: t => `${t.name} engages targets 25% farther out.`,
    hooks: type => ({}),
  },
  shrapnelvest: {
    name: 'Shrapnel Vest', cost: 6, excludes: ['jeep', 'sherman', 'atgun', 'aagun'],
    // the flamer already halves blast damage on his own vest
    weight: type => type === 'flamer' ? 1 : 2,
    desc: t => `${t.name} takes 30% less damage from explosions.`,
    hooks: type => ({}),
  },
  // 30% more HP on every unit type — no excludes, since every placeable soldier,
  // gun and vehicle has an hp entry. Flag-only, like Seasoned Veteran: makeUnit
  // reads `hardened_<type>` at spawn, so it never heals a man already fielded.
  hardened: {
    name: 'Field Hardened', cost: 7,
    // survivability is worth most on what a run can least afford to re-buy
    weight: type => ({ jeep: 3, atgun: 3, aagun: 3, sherman: 4 }[type] || 2),
    desc: (t, type) => `${t.name} musters with 30% more HP — ${t.hp} up to ${hardenedHp(type)}.`,
    hooks: type => ({}),
  },
  // one free promotion at spawn. Every unit type carries a rank, so this stamps
  // out a card for each. Flag-only, like Standard Issue: makeUnit reads
  // `seasonedvet_<type>` at spawn.
  seasonedvet: {
    name: 'Seasoned Veteran', cost: 5, weight: 2,
    desc: t => `Every ${t.name.toLowerCase()} musters in one rank higher — a free promotion.`,
    hooks: type => ({}),
  },
  // support units carry weak short-range sidearms; this trades one for a
  // full M1 rifle. Restricted to the three support types via `excludes` so
  // the common stamps out exactly one card each for officer/engineer/medic.
  // Flag-only, like Shrapnel Vest: makeUnit reads `riflearm_<type>` at spawn.
  riflearm: {
    name: 'Standard Issue', cost: 6, weight: 2,
    excludes: ['rifleman', 'gunner', 'grenadier', 'shotgunner', 'bazooka',
      'mortarman', 'sniper', 'flamer', 'jeep', 'sherman', 'atgun', 'aagun'],
    desc: (t, type) => type === 'medic'
      ? `Arms the medic with a full M1 rifle — a healer who can fight back.`
      : `Arms the ${t.name.toLowerCase()} with a full M1 rifle in place of their weak sidearm — longer range, harder hits.`,
    hooks: type => ({}),
  },
  // the four close-in specialists spend most of a fight walking into or out of
  // range rather than shooting — a shotgunner closing to buckshot distance, a
  // flamer hunting his cone, a medic and engineer chasing the front line.
  // Flag-only, like Desperate Measures: unitSpeed reads G.cardsOwned directly.
  doubletime: {
    name: 'Double Time', cost: 6, weight: 2,
    excludes: ['rifleman', 'gunner', 'grenadier', 'bazooka', 'mortarman',
      'sniper', 'officer', 'jeep', 'sherman', 'atgun', 'aagun'],
    desc: t => `${t.name} moves 30% faster.`,
    hooks: type => ({}),
  },
  // emergency repair only applies to vehicles: those with tank or vehicle flags.
  // Flag-only: updateUnit checks G.cardsOwned directly to trigger repairs.
  emergencyrepair: {
    name: 'Emergency Repair', cost: 8, weight: 3,
    excludes: ['rifleman', 'gunner', 'grenadier', 'shotgunner', 'bazooka',
      'mortarman', 'sniper', 'flamer', 'medic', 'engineer', 'officer', 'atgun', 'aagun'],
    desc: t => `Once ${t.name.toLowerCase()} drops below 30% HP, rapidly regenerate 30% HP. Cooldown: ${EMERGENCY_REPAIR_COOLDOWN}s.`,
    hooks: type => ({}),
  },
  // medal price runs opposite the unit's TP cost: a discount on a 3 TP
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
    desc: 'Load slugs, not buckshot: one hard, long-range round, but a wider cone than the buckshot pattern gave up.',
    hooks: {},
  },
  // flag-only, like Rifled Slugs: unitRangeMult reads G.cardsOwned to stretch a
  // wounded flamer's reach, so the targeting scan, the burn, and the drawn cone
  // all lengthen together
  desperatemeasures: {
    unit: 'flamer', name: 'Desperate Measures', cost: 9, weight: 3,
    desc: 'A flamer below half health throws his stream 30% farther — a glass-cannon gamble.',
    hooks: {},
  },
  // flag-only, like Desperate Measures/Rifled Slugs: flameSpray reads
  // G.cardsOwned directly since flame damage never touches fireShot's
  // beforeShot/afterShot hooks — the flamer siphons a slow trickle of HP back
  // from every enemy his stream burns, a vampire's deal with the fire.
  vampiricflame: {
    unit: 'flamer', name: 'Vampiric Flame', cost: 9, weight: 3,
    desc: `The flamer siphons ${Math.round(VAMPIRIC_FLAME_LIFESTEAL * 100)}% of the damage his stream deals to enemies back as slow healing.`,
    hooks: {},
  },
  // flag-only, like Rifled Slugs: tankTargets/updateTankCombat read
  // G.cardsOwned to trade the 75mm for a flamethrower, and render.js paints
  // the turret's flame stream. flameSpray's tank branch already halves burn
  // damage to armor, so this genuinely can't crack a Tiger.
  flametank: {
    unit: 'sherman', name: 'Flame Tank', cost: 14, weight: 5,
    desc: `Rip out the 75mm for a hull flamethrower: a wide cone of fire torches infantry — friend or foe — at close range. It still scorches armor, but only for chip damage, never the cannon's punch.`,
    hooks: {},
  },
  // flag-only, like Flame Tank: explode() reads G.cardsOwned via
  // slopedArmorSoftens and halves the blast when an enemy shell or rocket lands
  // on the Sherman
  slopedarmor: {
    unit: 'sherman', name: 'Sloped Armor', cost: 12, weight: 5,
    desc: `Angled plate deflects the tank's real killers: the Sherman takes ${Math.round(SLOPED_ARMOR_REDUCTION * 100)}% less damage from enemy tank shells and rocket launchers.`,
    hooks: {},
  },
  // flag-only, like Sloped Armor: the tank cannon block in updateTankCombat
  // reads G.cardsOwned via unitBlastMult and doubles the r it hands the shell
  heshells: {
    unit: 'sherman', name: 'High Explosive', cost: 13, weight: 5,
    desc: `The 75mm loads HE: every cannon shell bursts across ${BIG_BLAST_MULT}x the radius. The tank fires it at whatever it is aimed at, with no regard for how close your own men are standing.`,
    hooks: {},
  },
  // flag-only: maybeSpawnPassenger (called from input.js placement) reads
  // G.cardsOwned when a jeep deploys and rolls a free rider off rollPassengerType
  passenger: {
    unit: 'jeep', name: 'Passenger', cost: 10, weight: 3,
    desc: 'Every jeep rolls in carrying one free infantryman — cheap grunts far likelier than pricey specialists, so a rifleman rides most often.',
    hooks: {},
  },
  // flag-only, like Rifled Slugs: fireJeepBazooka (called from the vehicle
  // branch of updateFriendly) reads G.cardsOwned to launch rockets, and drawJeep
  // paints the rider in the passenger seat
  bazookarider: {
    unit: 'jeep', name: 'Bazooka Rider', cost: 12, weight: 4,
    desc: 'A bazooka gunner rides shotgun in every jeep, launching armor-piercing rockets on the move — the .50 keeps talking while he hunts tanks.',
    hooks: {},
  },
  // flag-only, like Rifled Slugs: fireShot reads G.cardsOwned via
  // armorPiercingMult and boosts a gunner's damage against light enemy vehicles
  armorpiercing: {
    unit: 'gunner', name: 'Armor Piercing', cost: 9, weight: 3,
    desc: `The gunner loads AP rounds: his BAR deals ${ARMOR_PIERCING_MULT}x damage to enemy jeeps, halftracks, and motorcycles, and ${ARMOR_PIERCING_TANK_MULT}x against tanks — enough to chip armor, not to crack it like a bazooka.`,
    hooks: {},
  },
  // flag-only, like Armor Piercing: suppressArea reads G.cardsOwned via
  // suppressionPinMult on every burst a US gunner opens
  beatenzone: {
    unit: 'gunner', name: 'Beaten Zone', cost: 10, weight: 4,
    desc: `The gunner walks his fire like a man who means to keep the ground: every burst pins the enemies around his aim point for ${BEATEN_ZONE_MULT}x as long, and a pinned man neither advances nor fires. Only what a machine gun can pin at all — fanatics, the dead and a charging Italian ignore a beaten zone as they always did.`,
    hooks: {},
  },
  // flag-only, like Armor Piercing: damageEnemy and damageUnit read
  // G.cardsOwned through heatPierces at the exact point the flak pool would
  // otherwise have soaked the blast.
  heatrounds: {
    unit: 'bazooka', name: 'HEAT Rounds', cost: 10, weight: 3,
    desc: 'Shaped-charge warheads: the rocket burns straight through flak plate instead of grinding it down, so armored infantry take the whole blast with their vests still on — and the deeper the run, the more of them are wearing one. The jet does not ask whose vest it is: your own men\'s flak armor stops none of it either.',
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
  // the two Headshot cards: flag-only, like Armor Piercing — fireShot reads
  // G.cardsOwned via headshotKills on any round that lands. Same name on both,
  // since cardUnitLabel chips them SNIPER and RIFLEMAN; see the note on
  // HEADSHOT_CHANCE for why the two rates are so far apart.
  headshotsniper: {
    unit: 'sniper', name: 'Headshot', cost: 12, weight: 4,
    desc: `Every sniper round that connects has a ${Math.round(HEADSHOT_CHANCE.sniper * 100)}% chance to find the head and kill outright, no matter how much health the man had left. Enemy infantry only — armor, vehicles and bosses are unaffected.`,
    hooks: {},
  },
  headshotrifleman: {
    unit: 'rifleman', name: 'Headshot', cost: 11, weight: 4,
    desc: `Every rifle round that connects has a ${Math.round(HEADSHOT_CHANCE.rifleman * 100)}% chance to find the head and kill outright, no matter how much health the man had left. A slim chance, but every rifleman on the field is rolling it. Enemy infantry only — armor, vehicles and bosses are unaffected.`,
    hooks: {},
  },
  // Follow Through: the one card built on kill momentum, and the second pair
  // the sniper and the rifleman each get their own copy of. onKill arms a flag
  // that unitRangeMult reads; afterShot spends it on the next round, hit or
  // miss — its `hit` argument is ignored ON PURPOSE, that is the spend rule.
  // The order inside fireShot makes the chain work for free: afterShot fires
  // BEFORE the damage dispatch that reaches creditKill, so a kill made with the
  // armed shot clears the flag and then immediately re-arms it. Clearing
  // _tgtUntil drops the 0.12s retarget cache so the longer reach is scanned on
  // the very next tick rather than a frame and a bit later.
  followthroughsniper: {
    unit: 'sniper', name: 'Follow Through', cost: 12, weight: 4,
    desc: `A confirmed kill steadies the sniper: his next shot reaches ${LONG_SHOT_MULT}x as far — far enough to cover the whole sector. Kill with it and it arms again. A miss spends it.`,
    hooks: {
      onKill: u => { u.longShot = true; u._tgtUntil = 0; },
      afterShot: u => { u.longShot = false; },
    },
  },
  followthroughrifleman: {
    unit: 'rifleman', name: 'Follow Through', cost: 9, weight: 3,
    desc: `A confirmed kill steadies the rifleman: his next shot reaches ${LONG_SHOT_MULT}x as far. Kill with it and it arms again. A miss spends it.`,
    hooks: {
      onKill: u => { u.longShot = true; u._tgtUntil = 0; },
      afterShot: u => { u.longShot = false; },
    },
  },
  // these four don't gate on a per-shot/per-kill event, so they carry no
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
  fieldarmorer: {
    unit: 'engineer', name: 'Field Armorer', cost: 10, weight: 3,
    // flag-only, like Grease Monkey: updateEngineer reads G.cardsOwned directly
    desc: 'Engineers patch battle-damaged body and flak armor on nearby infantry, slowly refilling a broken plate at the same crawling rate they wrench on a tank.',
    hooks: {},
  },
  cannibalize: {
    unit: 'engineer', name: 'Cannibalize', cost: 9, weight: 3,
    // flag-only: unitBuffs and unitRangeMult read G.cardsOwned directly and
    // count repairable objects (via engineerRepairCount) inside ENGINEER_RANGE.
    desc: 'Each repairable object in his repair radius gives the engineer +10% fire rate and range.',
    hooks: {},
  },
  // flag-only, like Grease Monkey: the medic's heal tick reads G.cardsOwned and
  // stamps u.medicGuard on the man he just patched; damageUnit reads the timer.
  morphinesyrette: {
    unit: 'medic', name: 'Morphine Syrette', cost: 11, weight: 4,
    desc: `A man the medic patches up shrugs off the pain: he takes ${Math.round(MEDIC_GUARD_REDUCTION * 100)}% less damage from everything while the dose holds.`,
    hooks: {},
  },
  rushorder: {
    unit: 'officer', name: 'Rush Order', cost: 10, weight: 4,
    desc: 'Officers draw TP every 15 seconds instead of 30.',
    hooks: {},
  },
  officercorps: {
    unit: 'officer', name: 'Officer Corps', cost: 12, weight: 5,
    desc: 'Raises the officer limit from 5 to 10.',
    hooks: {},
  },
  // flag-only, like the two officer cards above it: spawnWave calls
  // maybeOfficerFireMission() once per wave.
  firemission: {
    unit: 'officer', name: 'Fire Mission', cost: 14, weight: 4,
    desc: `Every wave, a ${Math.round(FIRE_MISSION_CHANCE * 100)}% chance an officer gets a battery on the radio: ${FIRE_MISSION_SHELLS} rounds of 60mm come down on a random enemy out on the field, free — the same weight of shell as a MORTAR STRIKE off the toolbar, in a tighter pattern because he is looking at the target. It takes an officer alive to make the call, and the rounds land where the man stood when he made it.`,
    hooks: {},
  },
  // flag-only: the grenade explosion in update.js reads
  // G.cardsOwned and calls spawnShrapnel when a grenadier's frag goes off.
  fraggrenades: {
    unit: 'grenadier', name: 'Frag Grenades', cost: 11, weight: 4,
    desc: `Grenadier frags burst into ${FRAG_SHRAPNEL_COUNT} fragments flying in every direction — they tear through anything in their path, so mind your own men.`,
    hooks: {},
  },
  extendedtube: {
    unit: 'shotgunner', name: 'Extended Tube', cost: 9, weight: 3,
    desc: `${EXTENDED_TUBE_SHELLS} shells per clip; reload takes 3x after emptying.`,
    hooks: {},
  },
  // flag-only, like Rifled Slugs: braveStandsFast (in tryGoProne) reads
  // G.cardsOwned directly so a shotgunner with a target in buckshot range never
  // hits the dirt.
  pointblank: {
    unit: 'shotgunner', name: 'Point Blank', cost: 8, weight: 3,
    desc: 'The shotgunner refuses to go prone while any enemy stands within his buckshot range — he stays up and keeps blasting.',
    hooks: {},
  },
  // flag-only, like Point Blank: braveStandsFast keeps a flamer on his feet
  // whenever an enemy is inside flame range.
  trialbyfire: {
    unit: 'flamer', name: 'Trial by Fire', cost: 8, weight: 3,
    desc: 'The flamer never hits the dirt while an enemy is within reach of his stream — he stands his ground and keeps burning.',
    hooks: {},
  },
  // flag-only, like Rifled Slugs: the mortar fire block in updateFriendly reads
  // G.cardsOwned directly to swap the single shell for a wider, wilder stick
  clusterrounds: {
    unit: 'mortarman', name: 'Cluster Rounds', cost: 12, weight: 5,
    desc: `The mortarman rushes ${CLUSTER_ROUNDS_SHELLS_MIN}-${CLUSTER_ROUNDS_SHELLS_MAX} shells down the tube per fire order — but hurried crews scatter ${Math.round((CLUSTER_ROUNDS_SCATTER_MULT - 1) * 100)}% wider.`,
    hooks: {},
  },
  // flag-only, like Cluster Rounds: damageEnemy calls maybeShellShock whenever a
  // hit is credited to a mortarman, and updateEnemy freezes stunned enemies.
  shellshocked: {
    unit: 'mortarman', name: 'Shell Shocked', cost: 11, weight: 4,
    desc: `Any enemy that survives a hit from the mortarman is stunned for ${SHELLSHOCK_DURATION} second${SHELLSHOCK_DURATION === 1 ? '' : 's'} — no moving, no firing.`,
    hooks: {},
  },
  // flag-only, like Cluster Rounds: the mortar fire block in updateFriendly
  // reads G.cardsOwned via unitBlastMult, doubling both the shell's r and the
  // margin he keeps off your own men before he'll drop a round
  heavyshells: {
    unit: 'mortarman', name: 'Heavy Shells', cost: 13, weight: 5,
    desc: `Heavier 60mm rounds: every shell the mortarman drops bursts across ${BIG_BLAST_MULT}x the radius. He holds fire at a proportionally wider margin from your own men — the blast is far too big to drop on a contact fight.`,
    hooks: {},
  },
  warbonds: {
    unit: 'officer', name: 'War Bonds', cost: 14, weight: 5,
    desc: 'Kill bounty income decays toward its 10% floor over 400 waves instead of 200.',
    hooks: {},
  },
  // not tied to a unit type: carries a `label` so its chip reads EMPLACEMENTS
  // rather than a UNIT_TYPES name. Flag-only, like Shrapnel Vest — explode() reads
  // G.cardsOwned directly and skips every defense structure's blast damage.
  blastshelter: {
    unit: 'emplacement', label: 'EMPLACEMENTS', name: 'Blast Shelter', cost: 16, weight: 6,
    desc: 'Overhead cover makes every emplacement immune to explosions — sandbags, bunkers, watch towers, camo nests, ammo crates, wire and mines take no blast damage.',
    hooks: {},
  },
  // a third emplacement card, flag-only like the two around it: applyPlacement
  // (js/input.js) runs every structure it creates through prehardenDefense.
  prehardened: {
    unit: 'emplacement', label: 'EMPLACEMENTS', name: 'Pre-Hardened', cost: 13, weight: 5,
    desc: 'Emplacements are dug in reinforced from the start — everything you place arrives at the FORTIFIED tier, with the extra HP, cover, range and holding power an engineer would have spent six seconds on. Engineers skip straight to repairs, or push a piece to HARDENED if you also carry Hardened Works. Minefields have no tier and are unaffected.',
    hooks: {},
  },
  // like Blast Shelter, an emplacement card with no per-unit hook: the enemy
  // movers in update-enemies read G.cardsOwned directly to bite men in the wire.
  razorwire: {
    unit: 'emplacement', label: 'EMPLACEMENTS', name: 'Razor Wire', cost: 10, weight: 3,
    desc: 'Barbed wire is strung with razor tape — enemy infantry dragging through it have a chance to take light cuts every moment they struggle.',
    hooks: {},
  },
  // the fourth emplacement card, and the camo nest's own. Flag-only like the
  // three above it: fireShot and fireShotgun read G.cardsOwned through
  // takeAmbushShot, which is also where the scope of the bonus is argued.
  ambush: {
    unit: 'emplacement', label: 'EMPLACEMENTS', name: 'Ambush', cost: 9, weight: 3,
    desc: `A man who opens fire out of a camo nest while the enemy still cannot see him hits for ${AMBUSH_DMG_MULT}x damage. The shot gives his position away, so the bonus only comes back once the nest hides him again — ${CAMONEST_REVEAL}s after his last shot, ${CAMONEST_REVEAL_FORTIFIED}s fortified, ${CAMONEST_REVEAL_HARDENED}s hardened. Aimed fire and buckshot only: grenades, rockets, mortar shells and flame break cover without the ambush.`,
    hooks: {},
  },
  // the fifth emplacement card, and the watch tower's own. Flag-only like the
  // rest: smokeBlocksLOS (js/smoke.js) reads G.cardsOwned through
  // spotterSeesThrough, so every target pick in the game honours it at once.
  forwardobserver: {
    unit: 'emplacement', label: 'EMPLACEMENTS', name: 'Forward Observer', cost: 11, weight: 4,
    desc: `A spotter works the top of every WATCH TOWER and calls targets for the sector below him: your infantry within ${WATCHTOWER_SPOT_R[0]} of a tower pick targets straight through smoke instead of standing blind in it — riflemen, machine guns and the mortar crew alike. Fortifying the tower widens the sector it watches to ${WATCHTOWER_SPOT_R[1]}, hardening it to ${WATCHTOWER_SPOT_R[2]}. Not armour and not the staked guns: a buttoned-up crew and a gunner at his own sights never climbed the ladder. It sees for your side only — the smoke still hides your men from them, and a tower that falls takes its sector's eyes with it.`,
    hooks: {},
  },
  // flag-only, like Rifled Slugs: updateAAGun reads G.cardsOwned directly to
  // decide it may engage ground infantry, and drawUnitWeaponRange paints the
  // close-range wedge red to mark the depression zone
  leveltbarrels: {
    unit: 'aagun', name: 'Level the Barrels', cost: 11, weight: 4,
    desc: `The flak mount can depress: enemies on the ground within short range catch a 40mm HE round. It still engages aircraft at full range — the red wedge marks its ground reach.`,
    hooks: {},
  },
  // flag-only, like Level the Barrels above it: updateATGun reads G.cardsOwned
  // through canisterShotEnabled() to add a third, last-priority target tier, and
  // both range overlays paint the near band in buckshot cream to mark it.
  canistershot: {
    unit: 'atgun', name: 'Canister Shot', cost: 12, weight: 5,
    desc: `The 57mm carries a tin of lead balls that comes apart the moment it clears the muzzle. Enemy infantry that closes inside ${Math.round(CANISTER_RANGE_FRAC * 100)}% of the gun's reach catches the whole pattern, and canister rams faster than an AP round. Armor is still the first thing the gun answers and the shot does nothing to it — the pale wedge marks the ground the pattern covers.`,
    hooks: {},
  },
  // not tied to a unit type either: `armor` is a pseudo-key covering BOTH armor
  // abilities, since one plate number (ARMOR_POINTS) feeds both. Flag-only — the
  // armor branch of applyPlacement reads G.cardsOwned through armorPlatePoints().
  reinforcedplate: {
    unit: 'armor', label: 'ARMOR', name: 'Reinforced Plate', cost: 11, weight: 4,
    desc: `Heavier steel in the carrier: both BODY ARMOR and FLAK ARMOR fit ${ARMOR_PLATE_MULT}x the plate, ${ARMOR_POINTS * ARMOR_PLATE_MULT} points instead of ${ARMOR_POINTS}, for the same 1 TP. Plate already on a man is unchanged until you re-buy it, and an engineer with Field Armorer patches the thicker bar back to full.`,
    hooks: {},
  },
  // not tied to a unit type: carries a `label` so its chip reads HQ. Flag-only —
  // newGame() reads G.cardsOwned once when the run starts and front-loads the TP.
  warchest: {
    unit: 'hq', label: 'HQ', name: 'War Chest', cost: 10, weight: 2,
    desc: `Requisition a reserve of supplies: begin every endless run with ${WAR_CHEST_TP} extra TP.`,
    hooks: {},
  },
  // the other HQ card, and the only one anywhere that heals the run itself
  // rather than a man. Flag-only: spawnWave calls healBreachesBetweenWaves().
  counterattack: {
    unit: 'hq', label: 'HQ', name: 'Counterattack', cost: 14, weight: 1,
    desc: `Reserves move up between assaults and take back the ground you lost: every new wave scrubs ${BREACH_HEAL_PER_WAVE} breach off the tally, down to none. It cannot save a line that breaks past the limit mid-wave — the run ends the moment the last breach lands.`,
    hooks: {},
  },
  // not a unit type either: `dummy` is a PLACEABLES key, so it carries a label
  // like the emplacement and HQ cards above. The collection already has a bucket
  // for it — the auto-generated War Surplus card uses the same unitType.
  // Flag-only: damageDummy reads G.cardsOwned through dummyRicochet.
  ricochet: {
    unit: 'dummy', label: 'DUMMY', name: 'Ricochet', cost: 9, weight: 3,
    desc: `Something hard under the burlap: every bullet that strikes a decoy has a ${Math.round(DUMMY_RICOCHET_CHANCE * 100)}% chance to deflect straight back at the man who fired it, for the full damage the round did. Small arms only — flame, bayonets and shells don't come back.`,
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

// the command ceiling: the summed weight of the whole catalog, which is what a
// plan holding literally every card would occupy. A point past it can never be
// spent on anything, so it is where buyCommandCapacity stops selling.
//
// It is also a SAFETY RAIL, and that is the reason it is enforced on load and
// not only at the till. Three sites walk the capacity one step at a time — the
// upgrade price (a loop from BASE_COMMAND_CAP), the segmented budget bar (one
// DOM node per point), and the plan shed in loadEndlessCards — so a capacity
// that arrives absurd from a corrupted or hand-edited save doesn't render
// wrong, it hangs the tab on the menu with no way back out. Derived rather than
// written down so it can't drift as cards are added.
const MAX_COMMAND_CAP = Object.keys(CARDS).reduce((sum, id) => sum + CARDS[id].weight, 0);

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

// true when a support type will muster with Standard Issue's M1 in the current
// run. The placement-time range ring reads this so it previews the longer rifle
// reach the unit will actually field, not the sidearm the card replaces.
function riflemanSwapActive(type) {
  return !!(G && G.cardsOwned && RIFLE_SWAP_TYPES.includes(type)
    && G.cardsOwned.has('riflearm_' + type));
}

// Seasoned Veteran: a unit whose type carries the card musters in already
// blooded — one free promotion at spawn. xp is set to the rank-1 threshold so
// his next kill counts toward rank 2 exactly as a normally-promoted man's
// would. Flag-only, like Standard Issue: makeUnit reads `seasonedvet_<type>`.
const SEASONED_VET_RANK = 1;
function maybeSeasonVeteran(u) {
  if (!G.cardsOwned || !G.cardsOwned.has('seasonedvet_' + u.type)) return;
  const rk = RANKS[SEASONED_VET_RANK];
  if (!rk) return;
  u.rank = SEASONED_VET_RANK;
  const rankMult = u.t.tank ? 2.5 : (u.t.rankMult || 1);
  u.xp = rk.kills * rankMult;
}

// Field Hardened: a unit whose type carries the card musters tougher. hp is
// raised alongside maxhp so he arrives at full strength, and the rounding lives
// here so the shop text and the spawned man can never disagree.
function hardenedHp(type) {
  return Math.round(UNIT_TYPES[type].hp * HARDENED_HP_MULT);
}
function maybeHarden(u) {
  if (!G.cardsOwned || !G.cardsOwned.has('hardened_' + u.type)) return;
  u.maxhp = hardenedHp(u.type);
  u.hp = u.maxhp;
}

// Pre-Hardened: an emplacement comes out of the ground already carrying the
// engineer's first tier. applyPlacement pipes every structure it creates
// through here on its way into the array, so the harness's deploy/buy get the
// card too. The tier itself is applyFortifyTier (helpers.js) — shared with the
// engineer, so a pre-hardened piece and a hand-built one are the same piece.
// Minefields never reach this: a mine has no HP, no `up`, and no tier.
function prehardenDefense(s) {
  if (G.cardsOwned && G.cardsOwned.has('prehardened')) applyFortifyTier(s);
  return s;
}

function defaultEndlessCards() {
  return {
    version: ENDLESS_CARDS_VERSION, medals: 0, owned: [], offer: [],
    capacity: BASE_COMMAND_CAP, plans: [[], [], []], activePlan: 0,
    rerollCost: REROLL_BASE_COST, shopSlots: BASE_SHOP_SLOTS,
    // ESCALATION (js/escalation.js): the rung the player has earned, and the
    // one they've selected for the next run
    escUnlocked: 0, escalation: 0,
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
  // migrate: the banked currency 'ribbons' was renamed to 'medals' — carry an
  // existing balance forward so no one loses what they earned
  if (data && typeof data === 'object' && data.medals == null && Number.isFinite(data.ribbons)) {
    data.medals = data.ribbons;
    delete data.ribbons;
  }
  // v1 predates battle plans (every owned card was always live) — carry the
  // collection forward rather than wiping it
  const fromV1 = !!data && typeof data === 'object' && data.version === 1;
  if (fromV1) data.version = ENDLESS_CARDS_VERSION;
  if (!data || typeof data !== 'object' || data.version !== ENDLESS_CARDS_VERSION) {
    data = defaultEndlessCards();
  }
  data.medals = Number.isFinite(data.medals) ? Math.max(0, Math.floor(data.medals)) : 0;
  data.owned = Array.isArray(data.owned) ? data.owned.filter(id => CARDS[id]) : [];
  const offer = Array.isArray(data.offer) ? data.offer : [];
  data.offer = offer.filter(id => CARDS[id] && !data.owned.includes(id));
  data.capacity = Number.isFinite(data.capacity)
    ? clamp(Math.floor(data.capacity), BASE_COMMAND_CAP, MAX_COMMAND_CAP) : BASE_COMMAND_CAP;
  data.activePlan = Number.isInteger(data.activePlan)
    ? clamp(data.activePlan, 0, PLAN_SLOTS - 1) : 0;
  // reroll price is always a power-of-two multiple of the base; a missing or
  // tampered value falls back to the base cost
  data.rerollCost = Number.isFinite(data.rerollCost)
    ? Math.max(REROLL_BASE_COST, Math.floor(data.rerollCost)) : REROLL_BASE_COST;
  // shop width is clamped to its buyable range; older saves default to three
  data.shopSlots = Number.isFinite(data.shopSlots)
    ? clamp(Math.floor(data.shopSlots), BASE_SHOP_SLOTS, MAX_SHOP_SLOTS) : BASE_SHOP_SLOTS;
  // escalation rides this same normalizer rather than a version bump — an
  // additive field is exactly what it already backfills onto older saves (as
  // shopSlots, rerollCost and capacity all did). The selection is clamped to
  // what's unlocked, so a tampered save can't skip the ladder.
  data.escUnlocked = Number.isFinite(data.escUnlocked)
    ? clamp(Math.floor(data.escUnlocked), 0, ESC_MAX) : 0;
  data.escalation = Number.isFinite(data.escalation)
    ? clamp(Math.floor(data.escalation), 0, data.escUnlocked) : 0;
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

// how many cards are neither owned nor already on display — the deck the shop
// still has left to draw from. Both medal sinks that PROMISE a new card gate on
// this: a reroll that can't turn a single slot over, and a slot that would open
// onto SOLD OUT, are purchases of nothing, and a completionist would otherwise
// pay for them (and double the reroll price) with the deck empty.
function undrawnCardCount(data) {
  const taken = new Set([...data.owned, ...data.offer]);
  return Object.keys(CARDS).filter(id => !taken.has(id)).length;
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
  if (!card || slot === -1 || data.owned.includes(id) || card.cost > data.medals) return false;
  data.medals -= card.cost;
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

// medal price of the next +1 command point: 5 for the first, then each
// subsequent point costs 20% more than the last, rounded up
// (5, 6, 8, 10, 12, 15, 18, 22, ...)
function commandUpgradeCost(capacity) {
  let cost = COMMAND_UPGRADE_BASE_COST;
  for (let c = BASE_COMMAND_CAP; c < capacity; c++) cost = Math.ceil(cost * 1.2);
  return cost;
}

function buyCommandCapacity() {
  const data = loadEndlessCards();
  if (data.capacity >= MAX_COMMAND_CAP) return false;
  const cost = commandUpgradeCost(data.capacity);
  if (cost > data.medals) return false;
  data.medals -= cost;
  data.capacity += 1;
  saveEndlessCards(data);
  return true;
}

// medal price of the next card slot: 10 for the fourth, doubling for each
// after (10, 20, 40). Null once the shop is already at its six-slot maximum.
function shopSlotUpgradeCost(shopSlots) {
  if (shopSlots >= MAX_SHOP_SLOTS) return null;
  return SHOP_SLOT_BASE_COST * Math.pow(2, shopSlots - BASE_SHOP_SLOTS);
}

function buyShopSlot() {
  const data = loadEndlessCards();
  const cost = shopSlotUpgradeCost(data.shopSlots);
  if (cost === null || cost > data.medals) return false;
  // a slot with nothing to put in it is a SOLD OUT placeholder bought at full
  // price, and the deck never refills — nothing un-owns a card
  if (!undrawnCardCount(data)) return false;
  data.medals -= cost;
  data.shopSlots += 1;
  // stock the freshly opened slot so it isn't a "SOLD OUT" placeholder
  const pick = drawUnofferedCard(data);
  if (pick) data.offer.push(pick);
  saveEndlessCards(data);
  return true;
}

// draw a fresh shop offer for medals; each reroll costs twice the last
// (1, 2, 4, ...), and the new cards avoid both the collection and the ones
// currently on display so a reroll always turns the slots over
function rerollShop() {
  const data = loadEndlessCards();
  if (data.rerollCost > data.medals) return false;
  // with every remaining card already on display there is nothing a reroll can
  // turn over: it would charge the medals, double its own price, and hand back
  // the same row (or, with the deck fully collected, an empty one)
  if (!undrawnCardCount(data)) return false;
  data.medals -= data.rerollCost;
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

// medals only accrue where the leaderboard counts: real endless runs on
// easy/medium/hard. Sandbox and testing (unlimited TP) and the tutorial pay
// nothing, so wave-jumping can't farm the shop.
function medalsEligible() {
  return G && G.level.id === 'endless' && G.difficulty && !G.difficulty.sandbox;
}

function awardWaveMedals() {
  if (!medalsEligible() || G.wave % 10 !== 0) return;
  // the ESCALATION pay modifier (js/escalation.js) scales the milestone. Rounded
  // and floored at the base rate, so a rung can only ever pay MORE than no rung —
  // at ×1.1 the early milestones round back down to the base, which is right:
  // ten percent of one medal is not a medal.
  const base = G.wave / 10;
  const n = Math.max(base, Math.round(base * (G.esc ? G.esc.medalMult : 1)));
  const data = loadEndlessCards();
  data.medals += n;
  saveEndlessCards(data);
  G.medalsEarned += n;
  // floating notice instead of a banner: every 10th wave is a themed
  // set-piece whose banner must not be stomped
  G.texts.push({ x: W / 2, y: H * 0.62, text: `+${n} MEDAL${n === 1 ? '' : 'S'} EARNED`, ttl: 3.2 });
}

// ---- card shop UI

let cardShopReturnScreen = 'endless-select';
// 'shop' = the full card shop reached from the menu; 'loadout' = the same screen
// opened when an endless run starts, stripped to just the battle plans (no
// purchasing) with a DEPLOY button that launches the run
let cardShopMode = 'shop';
// the chosen endless difficulty waiting on the loadout screen's DEPLOY button
let pendingLoadoutDiff = null;

function applyCardShopMode() {
  const loadout = cardShopMode === 'loadout';
  el('card-shop').classList.toggle('cs--loadout', loadout);
  const title = el('card-shop-title');
  if (title) title.textContent = loadout ? 'SELECT LOADOUT' : 'CARD SHOP';
}

function openCardShop(fromScreen) {
  cardShopMode = 'shop';
  pendingLoadoutDiff = null;
  collectionFilter = null;
  cardShopReturnScreen = fromScreen || 'endless-select';
  el(cardShopReturnScreen).classList.add('hidden');
  applyCardShopMode();
  buildCardShopUI();
  el('card-shop').classList.remove('hidden');
}

// starting an endless run first drops the player onto the card shop with the
// buying half hidden, so they can pick and swap a battle plan before deploying.
// With an empty collection there's nothing to arrange, so skip straight in.
function openEndlessLoadout(difficultyId) {
  if (!loadEndlessCards().owned.length) {
    startGame('endless', difficultyId);
    return;
  }
  cardShopMode = 'loadout';
  pendingLoadoutDiff = difficultyId;
  collectionFilter = null;
  cardShopReturnScreen = 'endless-select';
  el('endless-select').classList.add('hidden');
  applyCardShopMode();
  buildCardShopUI();
  el('card-shop').classList.remove('hidden');
}

// the loadout screen's DEPLOY button: launch the endless run with the plan the
// player just set
function deployEndlessLoadout() {
  const diff = pendingLoadoutDiff;
  pendingLoadoutDiff = null;
  startGame('endless', diff);
}

function closeCardShop() {
  el('card-shop').classList.add('hidden');
  el(cardShopReturnScreen).classList.remove('hidden');
  // coming back to the endgame ceremony, resync its offer/banked with anything
  // bought or rerolled inside the full shop
  if (cardShopReturnScreen === 'endless-endgame') {
    renderEndgameCards();
    syncEndgameBanked();
  }
}

function medalLabel(n) {
  return n + (n === 1 ? ' MEDAL' : ' MEDALS');
}

// the chip above a card's name: a unit card names its unit type; an
// emplacement/ability card carries its own label (no UNIT_TYPES entry)
function cardUnitLabel(card) {
  return (card.label != null ? card.label : UNIT_TYPES[card.unitType].name).toUpperCase();
}

// collection filter bucket: real soldiers/vehicles group by their unit type,
// everything else (emplacements, HQ, war surplus on placeables) is 'other'
function cardFilterKey(card) {
  return UNIT_TYPES[card.unitType] ? card.unitType : 'other';
}

// six command pips, the first `w` of them lit — a card's loadout weight read
// at a glance instead of as buried text
function commandPips(w) {
  let html = '';
  for (let i = 0; i < 6; i++) html += '<span class="cs-pip' + (i < w ? ' cs-pip--on' : '') + '"></span>';
  return html;
}

function buildCardShopUI() {
  const data = loadEndlessCards();
  el('card-shop-medals').textContent = data.medals;
  el('card-shop-owned').textContent = data.owned.length + ' / ' + Object.keys(CARDS).length + ' COLLECTED';
  const row = el('card-shop-row');
  row.innerHTML = '';
  for (let i = 0; i < data.shopSlots; i++) {
    const card = CARDS[data.offer[i]];
    if (!card) {
      const empty = document.createElement('div');
      empty.className = 'cs-card cs-card--empty';
      empty.textContent = 'SOLD OUT';
      row.appendChild(empty);
      continue;
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cs-card' + (card.unique ? ' cs-card--unique' : '');
    btn.disabled = card.cost > data.medals;
    const afford = card.cost <= data.medals;
    btn.innerHTML =
      '<div class="cs-card__top">' +
        '<span class="cs-chip">' + cardUnitLabel(card) + '</span>' +
        '<span class="cs-rarity ' + (card.unique ? 'cs-rarity--uni">UNIQUE' : 'cs-rarity--std">STANDARD') + '</span>' +
      '</div>' +
      '<span class="cs-card__name">' + card.name.toUpperCase() + '</span>' +
      '<span class="cs-card__effect">' + card.desc + '</span>' +
      '<div class="cs-card__foot">' +
        '<span class="cs-cmd"><span class="cs-cmd__lab">COMMAND</span>' +
          '<span class="cs-pips">' + commandPips(card.weight) + '</span></span>' +
        '<span class="cs-cost">' + card.cost + '<span class="cs-cost__u">' + (afford ? 'MED' : 'NEED') + '</span></span>' +
      '</div>';
    btn.addEventListener('click', () => {
      if (buyCard(card.id)) {
        SFX.click();
        buildCardShopUI();
      }
    });
    row.appendChild(btn);
  }
  // both medal sinks below sell a card the shop hasn't shown yet, so both go
  // dead when the deck runs out — and SAY so, or they read as a broken button
  const undrawn = undrawnCardCount(data);
  const reroll = el('card-shop-reroll');
  if (reroll) {
    reroll.textContent = undrawn ? 'REROLL — ' + medalLabel(data.rerollCost) : 'REROLL — DECK EMPTY';
    reroll.disabled = !undrawn || data.rerollCost > data.medals;
  }
  const slotBtn = el('card-shop-slot');
  if (slotBtn) {
    const slotCost = shopSlotUpgradeCost(data.shopSlots);
    if (slotCost === null) {
      slotBtn.textContent = 'CARD SLOTS — MAX (6)';
      slotBtn.disabled = true;
    } else if (!undrawn) {
      slotBtn.textContent = '+1 CARD SLOT — DECK EMPTY';
      slotBtn.disabled = true;
    } else {
      slotBtn.textContent = '+1 CARD SLOT — ' + medalLabel(slotCost);
      slotBtn.disabled = slotCost > data.medals;
    }
  }
  buildBattlePlanUI();
}

// ---- battle plan UI: the collection grid + plan tabs under the shop row

function buildBattlePlanUI() {
  const data = loadEndlessCards();
  const tabs = el('plan-tabs');
  tabs.replaceChildren();
  for (let i = 0; i < PLAN_SLOTS; i++) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'cs-ptab' + (i === data.activePlan ? ' cs-ptab--active' : '');
    tab.innerHTML = '<span class="cs-ptab__n">' + PLAN_NAMES[i] + '</span>' +
      '<span class="cs-ptab__c">' + planCommandUsed(data.plans[i]) + ' / ' + data.capacity + ' CMD</span>';
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
  el('plan-command').textContent = `${used} / ${data.capacity}`;
  // command budget as a segmented bar: `used` of `capacity` cells lit
  const segs = el('plan-segs');
  segs.replaceChildren();
  for (let s = 0; s < data.capacity; s++) {
    const seg = document.createElement('span');
    seg.className = 'cs-seg' + (s < used ? ' cs-seg--fill' : '');
    segs.appendChild(seg);
  }
  const upBtn = el('plan-upgrade');
  if (data.capacity >= MAX_COMMAND_CAP) {
    upBtn.textContent = `COMMAND — MAX (${MAX_COMMAND_CAP})`;
    upBtn.disabled = true;
  } else {
    const upCost = commandUpgradeCost(data.capacity);
    upBtn.textContent = `+1 COMMAND — ${medalLabel(upCost)}`;
    upBtn.disabled = upCost > data.medals;
  }
  const grid = el('plan-collection');
  const filterRow = el('plan-filter');
  grid.replaceChildren();
  filterRow.replaceChildren();
  if (!data.owned.length) {
    const none = document.createElement('div');
    none.className = 'cs-chit cs-chit--empty';
    none.textContent = 'NO CARDS IN THE COLLECTION YET — BUY SOME ABOVE.';
    grid.appendChild(none);
    return;
  }
  // one chip per unit type actually owned, plus ALL to clear and OTHER for
  // cards with no unit tie; skip the row entirely when there's nothing to split
  const cats = new Map();
  for (const id of data.owned) {
    const key = cardFilterKey(CARDS[id]);
    if (!cats.has(key)) cats.set(key, key === 'other' ? 'OTHER' : UNIT_TYPES[key].name.toUpperCase());
  }
  if (cats.size > 1) {
    const entries = [...cats.entries()].sort((a, b) =>
      a[0] === 'other' ? 1 : b[0] === 'other' ? -1 : a[1].localeCompare(b[1]));
    entries.unshift([null, 'ALL']);
    for (const [key, label] of entries) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'cs-filter' + (collectionFilter === key ? ' cs-filter--active' : '');
      chip.textContent = label;
      chip.addEventListener('click', () => {
        if (collectionFilter === key) return;
        collectionFilter = key;
        SFX.click();
        buildBattlePlanUI();
      });
      filterRow.appendChild(chip);
    }
  } else {
    collectionFilter = null;
  }
  const visible = data.owned.filter(id => collectionFilter === null || cardFilterKey(CARDS[id]) === collectionFilter);
  if (!visible.length) {
    const none = document.createElement('div');
    none.className = 'cs-chit cs-chit--empty';
    none.textContent = 'NO CARDS MATCH THIS FILTER.';
    grid.appendChild(none);
    return;
  }
  for (const id of visible) {
    const card = CARDS[id];
    const equipped = plan.includes(id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cs-chit' + (equipped ? ' cs-chit--deployed' : '')
      + (card.unique ? ' cs-chit--unique' : '');
    // a reserve card that can't fit the remaining command stays visible but dead
    btn.disabled = !equipped && used + card.weight > data.capacity;
    btn.innerHTML = '<span class="cs-chip">' + cardUnitLabel(card) + '</span>' +
      '<span class="cs-chit__name">' + card.name.toUpperCase() + '</span>' +
      '<span class="cs-chit__desc">' + card.desc + '</span>' +
      '<span class="cs-chit__state"><span class="cs-dot"></span>' +
        (equipped ? 'DEPLOYED' : 'RESERVE') + ' · ' + card.weight + ' CMD</span>';
    btn.addEventListener('click', () => {
      if (togglePlanCard(id)) {
        SFX.click();
        buildBattlePlanUI();
      }
    });
    grid.appendChild(btn);
  }
}

// ---- endless endgame: the "Spotlight Locker" medal ceremony (design 2b)

// count the hero medal number up from zero for a bit of ceremony
function animateMedalCount(node, to, prefix) {
  if (!node) return;
  const dur = 700;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / dur);
    // ease-out so it decelerates onto the final figure
    const val = Math.round((1 - Math.pow(1 - p, 3)) * to);
    node.textContent = prefix + val;
    if (p < 1) requestAnimationFrame(tick);
    else node.textContent = prefix + to;
  }
  node.textContent = prefix + '0';
  requestAnimationFrame(tick);
}

// one tap-to-expand requisition card for the endgame footlocker
function buildEndgameCard(card, medals) {
  const afford = card.cost <= medals;
  const btn = document.createElement('div');
  btn.className = 'ee-card' + (card.unique ? ' ee-card--uni' : '');
  btn.innerHTML =
    '<div class="ee-card__top">' +
      '<span class="ee-card__unit">' + cardUnitLabel(card) + '</span>' +
      '<span class="ee-card__rar ' + (card.unique ? 'ee-card__rar--uni">UNIQUE' : 'ee-card__rar--std">STANDARD') + '</span>' +
      '<span class="ee-card__cost' + (afford ? '' : ' ee-card__cost--need') + '">' + card.cost +
        '<u>' + (afford ? 'MED' : 'NEED') + '</u></span>' +
    '</div>' +
    '<div class="ee-card__name">' + card.name.toUpperCase() + '</div>' +
    '<div class="ee-card__desc">' + card.desc + '</div>' +
    '<div class="ee-card__foot">' +
      '<span class="ee-pips">' + endgamePips(card.weight) + '</span>' +
      '<span class="ee-card__chev">▾ requisition</span>' +
    '</div>' +
    '<div class="ee-card__body">' +
      '<div class="ee-card__full">Costs ' + card.weight + ' command in your loadout.</div>' +
      '<button class="ee-buy"' + (afford ? '' : ' disabled') + '>Requisition — ' + medalLabel(card.cost) + '</button>' +
    '</div>';
  // tapping the card body toggles the detail drawer; the chevron flips with it
  const chev = btn.querySelector('.ee-card__chev');
  btn.addEventListener('click', () => {
    const open = btn.classList.toggle('ee-card--open');
    chev.textContent = open ? '▴ hide' : '▾ requisition';
  });
  const buy = btn.querySelector('.ee-buy');
  buy.addEventListener('click', (e) => {
    e.stopPropagation();
    if (buyCard(card.id)) {
      SFX.click();
      renderEndgameCards();
      syncEndgameBanked();
    }
  });
  return btn;
}

// six command pips, first `w` lit — a card's plan weight at a glance
function endgamePips(w) {
  let html = '';
  for (let i = 0; i < 6; i++) html += '<span class="ee-pip' + (i < w ? ' ee-pip--on' : '') + '"></span>';
  return html;
}

// (re)draw the offer cards; called on open and after every purchase so a bought
// card is swapped for its replacement and affordability restyles across the row
function renderEndgameCards() {
  const data = loadEndlessCards();
  const row = el('ee-cards');
  if (!row) return;
  row.replaceChildren();
  for (let i = 0; i < data.shopSlots; i++) {
    const card = CARDS[data.offer[i]];
    if (!card) continue;   // an exhausted deck just leaves the slot out
    row.appendChild(buildEndgameCard(card, data.medals));
  }
}

// keep the "you hold N medals" line in step with the banked balance
function syncEndgameBanked() {
  const node = el('ee-banked');
  if (node) node.textContent = loadEndlessCards().medals;
}

function showEndlessEndgame() {
  const earned = G ? G.medalsEarned : 0;
  const banked = loadEndlessCards().medals;
  const sub = el('ee-sub');
  // endRun routes EVERY endless finish here, win or lose (it branches on mode,
  // not outcome), so a boss victory used to be captioned "SECTOR COLLAPSED"
  const held = !!(G && G.over && G.bossKills > 0);
  const posture = G && G.esc && G.esc.level > 0 ? escLabel(G.esc.level) + ' · ' : '';
  if (sub) sub.textContent = `${posture}WAVE ${G ? G.wave : 0} · ${held ? 'SECTOR HELD' : 'SECTOR COLLAPSED'}`;
  const head = el('ee-head');
  const count = el('ee-count');
  const text = el('ee-text');
  if (earned > 0) {
    if (head) head.textContent = earned === 1 ? 'MEDAL AWARDED' : 'MEDALS AWARDED';
    animateMedalCount(count, earned, '+');
    if (text) text.innerHTML = `Every 10th wave banks a medal. You hold ` +
      `<b id="ee-banked">${banked}</b> — the footlocker's open. Tap a card to read it before you buy.`;
  } else {
    if (head) head.textContent = 'MEDALS BANKED';
    animateMedalCount(count, banked, '');
    if (text) text.innerHTML = `No milestone reached this run. You hold ` +
      `<b id="ee-banked">${banked}</b> to spend. Tap a card to read it before you buy.`;
  }
  // the leaderboard elements were populated by updateGameOverLeaderboard(); show
  // the wrapper only when there's actually a board or a score-entry form in it
  const lb = el('ee-lb');
  if (lb) {
    const board = el('go-leaderboard');
    const entry = el('go-leaderboard-entry');
    const anyLb = (board && !board.classList.contains('hidden')) ||
                  (entry && !entry.classList.contains('hidden'));
    lb.classList.toggle('hidden', !anyLb);
  }
  renderEndgameCards();
}
