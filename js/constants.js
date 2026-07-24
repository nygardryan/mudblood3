/* Trenchworks: WW2 — tuning constants & placeable catalog.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

const W = 540, H = 620;
// layouts below were authored against the original 900px-wide field; lx()
// rescales an offset-from-center so those formations keep their proportions
const LAYOUT_REF_W = 900;
function lx(off) { return W / 2 + off * (W / LAYOUT_REF_W); }
const DEPLOY_Y = 380;          // your side of the field starts here
const FORWARD_Y = H / 3;       // units may advance and mines/wire may be laid this far up
const MAX_BREACH = 7;
const MAX_OFFICERS = 5;
const MEDIC_RANGE = 95;
const ENGINEER_RANGE = 95;
const OFFICER_AURA = 78;
const WATCHTOWER_AURA = 22;
const RANKUP_RADIUS = 140;  // testing-mode-only field-promotion ability
const PURGE_RADIUS = 150;   // testing-mode-only kill-everything ability
const WATCHTOWER_RANGE_MULT = 1.25;
const WATCHTOWER_RANGE_MULT_UPGRADED = 1.35;
const WATCHTOWER_RANGE_MULT_HARDENED = 1.5;    // second-tier fortification (Hardened Works)
const AMMOCRATE_AURA = 60;                      // radius that shares out its ammunition
// lower rofMult = faster cycling: nearby soldiers fire and reload quicker.
// a fresh crate is +10%, an engineer-fortified one +20%, a hardened one +30%.
const AMMOCRATE_ROF_MULT = 0.9;
const AMMOCRATE_ROF_MULT_UPGRADED = 0.8;
const AMMOCRATE_ROF_MULT_HARDENED = 0.7;       // second-tier fortification (Hardened Works)
const CAMONEST_ZONE = 30;               // same footprint as a bunker's cover radius
const CAMONEST_REVEAL = 3;              // seconds targetable after a shot, unfortified
const CAMONEST_REVEAL_FORTIFIED = 1.5;
const CAMONEST_REVEAL_HARDENED = 0.5;   // second-tier fortification (Hardened Works)
const CAMONEST_EXPLOSIVE_MULT = 1.2;    // weak to explosives — no reduction like a bunker's concrete
const GRENADE_CATCH_RANGE = 34;         // how close a grenadier must be to a landed enemy grenade to heave it back
const V2_ROCKET_ARC = 130;              // cruise altitude of the V2 warhead between boost and terminal dive
const BOMB_FALL_ARC = 300;              // apparent release altitude of a bomber's stick as it falls onto the field

// economy: seconds between +1 TP supply-trickle ticks. Lower = the player
// banks TP faster to place more units and experiment with defenses.
const TP_TRICKLE_INTERVAL = 3;
// breather added between waves (endless) so the line has time to reset
const WAVE_BREATHER = 3;

// engine pacing
const HUD_INTERVAL = 0.1;         // seconds between DOM HUD refreshes
const AURA_CACHE_INTERVAL = 0.4;  // seconds between officer/watchtower aura cache rebuilds
const PARTICLE_CAP = 250;

const UNIT_TYPES = {
  rifleman: {
    name: 'Rifleman', hp: 100, range: 154, dmg: 13, acc: 0.55,
    rof: 0.88, burst: 1, burstGap: 0, speed: 42,
    color: '#55763c', gun: 7, sfx: 'rifle',
    desc: 'M1 Garand. The backbone of your line.',
  },
  gunner: {
    name: 'Gunner', hp: 100, range: 179, dmg: 9, acc: 0.32,
    rof: 1.36, burst: 6, burstGap: 0.09, speed: 36,
    color: '#476837', gun: 10, sfx: 'mg',
    desc: 'BAR automatic rifle. Suppressive bursts.',
  },
  grenadier: {
    // 50% more gun range than the rifleman (154): the better all-rounder
    name: 'Grenadier', hp: 100, range: 231, dmg: 10, acc: 0.55,
    rof: 1.2, burst: 1, burstGap: 0, speed: 42,
    color: '#4f7040', gun: 6, sfx: 'rifle', grenade: true,
    desc: 'Carbine most of the time; a heavy frag now and then. Quick enough to catch a live German grenade and heave it back.',
  },
  shotgunner: {
    name: 'Shotgunner', hp: 145, range: 0, dmg: 0, acc: 0,
    rof: 1.5, burst: 1, burstGap: 0, speed: 34,
    color: '#4a6438', gun: 9, sfx: 'shotgun',
    shotgun: { range: 96, arc: 0.52, pellets: 8, dmg: 11, spread: 0.45 },
    desc: 'M97 trench gun and steel plate. Buckshot shreds clusters up close.',
  },
  bazooka: {
    name: 'Bazooka', hp: 90, range: 80, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, speed: 40,
    color: '#476237', gun: 5, sfx: 'pistol',
    rocket: { range: 243, cdMin: 7.4, cdMax: 10.1, r: 30, dmg: 120, speed: 380, armorMult: 2.75 },
    desc: 'M1A1 rocket launcher. The answer to armor.',
  },
  mortarman: {
    name: 'Mortarman', hp: 90, range: 88, dmg: 8, acc: 0.47,
    rof: 1.0, burst: 1, burstGap: 0, speed: 38,
    color: '#587244', gun: 5, sfx: 'pistol',
    mortar: { range: 348, min: 118, cdMin: 9, cdMax: 12, r: 40, dmg: 75, flight: 1.6, scatter: 52 },
    desc: 'Portable 60mm mortar. Indirect fire at range.',
  },
  sniper: {
    name: 'Sniper', hp: 85, range: 249, dmg: 46, acc: 0.72,
    rof: 5.2, burst: 1, burstGap: 0, speed: 38,
    color: '#3f5730', gun: 12, sfx: 'sniper',
    desc: 'Springfield scoped rifle. Picks off officers, snipers, bazookas, and mortar teams first.',
  },
  medic: {
    name: 'Medic', hp: 90, range: 94, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, speed: 46,
    color: '#71905a', gun: 5, sfx: 'pistol',
    desc: 'Patches up the most wounded man in range, faster with rank. Carries no weapon.',
  },
  engineer: {
    name: 'Engineer', hp: 95, range: 74, dmg: 7, acc: 0.45,
    rof: 1.1, burst: 4, burstGap: 0.07, speed: 44,
    color: '#5d7a44', gun: 6, sfx: 'mg',
    desc: 'Repairs fortifications, upgrades emplacements, extends the build zone forward within his radius, and can wrench on damaged vehicles and AT guns (very slowly). M3 grease gun up close.',
  },
  officer: {
    name: 'Officer', hp: 95, range: 101, dmg: 9, acc: 0.5,
    rof: 0.9, burst: 1, burstGap: 0, speed: 44,
    color: '#80814a', gun: 5, sfx: 'pistol',
    desc: 'Nearby men fire faster and straighter, more so as he ranks up. Earns +1 TP / 30 s.',
  },
  flamer: {
    name: 'Flamethrower', hp: 130, range: 78, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, speed: 38,
    color: '#5a723c', gun: 8, sfx: 'rifle',
    flame: { range: 78, arc: 0.45, dps: 38 },
    blastResist: 0.5, rankHealMult: 3,
    desc: 'M2 flamethrower and flak vest. Burns everything in the cone — friend or foe.',
  },
  jeep: {
    name: 'Jeep', hp: 250, range: 221, dmg: 13, acc: 0.42,
    rof: 12.0, burst: 64, burstGap: 0.07, speed: 110,
    color: '#566f44', gun: 14, sfx: 'hmg', vehicle: true, rankMult: 3,
    desc: 'Willys jeep, pintle-mounted .50 cal. Fast and hard-hitting, but unarmored.',
  },
  sherman: {
    name: 'Sherman', hp: 1000, range: 262, dmg: 0, acc: 0,
    rof: 4.0, burst: 1, burstGap: 0, speed: 14, shellDmg: 80,
    color: '#566f44', gun: 0, sfx: 'boom', tank: true,
    fireCone: { arc: 0.275 },
    mg: { range: 161, dmg: 8, acc: 0.45, burst: 6, burstGap: 0.08, gun: 24, sfx: 'mg' },
    desc: 'M4 Sherman. 75mm cannon on a rotating turret and thick armor. Medics can\'t fix steel.',
  },
  atgun: {
    // trails are staked into the ground: it traverses inside its cone but never moves
    name: 'AT Gun', hp: 200, range: 519, dmg: 0, acc: 0,
    rof: 8.8, burst: 1, burstGap: 0, speed: 0,
    color: '#566f44', gun: 0, sfx: 'boom', fixed: true, gunEmplacement: true,
    atgun: { arc: 0.338, shellDmg: 403, r: 27, scatterMult: 0.950 },
    desc: '57mm anti-tank gun. Immobile; direct-fire AP shells ruin any vehicle they find.',
  },
  aagun: {
    // same staked trails as the 57mm, but the mount elevates: the barrels only
    // point up. Bombers and men under canopy are the whole target list — it
    // cannot depress onto anything standing on the ground.
    // tuned so one green gun downs about a bomber per raid and a veteran crew
    // breaks a raid outright. The narrow traverse wedge means it only gets a
    // handful of shots per pass, so the cyclic rate and burst weight — not the
    // aim — are what make it worth its cost; scatter stays deliberately wide.
    name: 'AA Gun', hp: 200, range: 623, dmg: 0, acc: 0,
    rof: 0.55, burst: 1, burstGap: 0, speed: 0,
    color: '#566f44', gun: 0, sfx: 'boom', fixed: true, gunEmplacement: true,
    aagun: {
      arc: 0.338,        // identical traverse wedge to the AT gun
      hitR: 23,          // flak burst lethal radius
      scatter: 15,       // base aim error, grows with range — only ~30% connect
      shellSpeed: 660,   // used to lead a moving bomber
      planeDmg: 64,
    },
    desc: '40mm Bofors. Immobile; elevated barrels engage aircraft and descending paratroopers only.',
  },
};

// Body/Flak Armor abilities: each grants a depleting armor bar worth a
// rifleman's HP (bullets chip Body Armor, explosions chip Flak Armor).
const ARMOR_POINTS = UNIT_TYPES.rifleman.hp;

// Endless only: enemy infantry increasingly turn up wearing body/flak armor as
// the waves climb. The chance ramps on a squared curve from ~0% at wave 1 to a
// near-certainty by ENEMY_ARMOR_FULL_WAVE, so the early game stays clean and
// plated troops only become the norm deep into a run. The plate itself also
// grows a little with the wave (heavier late-war kit).
// Body and flak armor are rolled INDEPENDENTLY, so a man can turn up with just
// body, just flak, both, or neither. Body armor follows the full wave curve;
// flak is the rarer, more specialised kit, so its odds are that curve scaled by
// ENEMY_ARMOR_FLAK_RATIO.
const ENEMY_ARMOR_FULL_WAVE = 400;   // wave by which body armor is near-guaranteed
const ENEMY_ARMOR_MAX_CHANCE = 0.98; // "nearing 100%", never a dead certainty
const ENEMY_ARMOR_BODY_MIN = 30, ENEMY_ARMOR_BODY_MAX = 75; // body plate points (lerp'd by wave)
const ENEMY_ARMOR_FLAK_RATIO = 0.35; // flak odds relative to the body-armor curve
const ENEMY_ARMOR_FLAK_MIN = 25, ENEMY_ARMOR_FLAK_MAX = 55; // flak plate points (lerp'd by wave)

// both staked guns share a traverse cone, a crew that never goes prone, and
// the engineer-repairs-but-medics-don't rule; this returns whichever spec a
// given emplacement carries
function emplacementSpec(t) {
  return t.atgun || t.aagun;
}

// TP paid to an Axis attacker for destroying each US defender (mirrors ENEMY_TYPES.reward)
{
  const UNIT_REWARDS = {
    rifleman: 2, gunner: 3, grenadier: 3, shotgunner: 3, bazooka: 4,
    mortarman: 5, sniper: 4, medic: 4, engineer: 4, officer: 5,
    flamer: 4, jeep: 6, sherman: 15, atgun: 8, aagun: 8,
  };
  for (const [k, r] of Object.entries(UNIT_REWARDS)) UNIT_TYPES[k].reward = r;
}

const ENEMY_TYPES = {
  // German roster buffed for post-card difficulty. Rule held throughout:
  // range and speed never exceed the allied counterpart (see comments);
  // HP, damage, accuracy and rate of fire are the buffable stats.
  erifle: {
    // counterpart: rifleman (range 154, speed 42)
    name: 'Rifleman', hp: 75, speed: 22, range: 141, dmg: 12, acc: 0.46,
    rof: 1.35, burst: 1, burstGap: 0, reward: 2,
    color: '#5f6470', gun: 7, sfx: 'rifle', priority: 1,
  },
  esmg: {
    // counterpart: gunner (range 179, speed 36)
    name: 'Stormtrooper', hp: 85, speed: 36, range: 87, dmg: 9, acc: 0.46,
    rof: 0.9, burst: 3, burstGap: 0.08, reward: 2,
    color: '#4b515c', gun: 6, sfx: 'mg', priority: 1,
  },
  egren: {
    // counterpart: grenadier (range 231, speed 42)
    name: 'Grenadier', hp: 85, speed: 27, range: 101, dmg: 10, acc: 0.42,
    rof: 1.45, burst: 1, burstGap: 0, reward: 3,
    color: '#555c68', gun: 5, sfx: 'pistol', priority: 2, grenade: true,
  },
  emg: {
    // counterpart: gunner (range 179, speed 36) — range capped to 179
    name: 'MG Gunner', hp: 110, speed: 16, range: 179, dmg: 10, acc: 0.37,
    rof: 1.7, burst: 5, burstGap: 0.08, reward: 3,
    color: '#4d545f', gun: 10, sfx: 'mg', priority: 3,
  },
  eoff: {
    // counterpart: officer (range 101, speed 44)
    name: 'Officer', hp: 95, speed: 24, range: 94, dmg: 9, acc: 0.48,
    rof: 0.92, burst: 1, burstGap: 0, reward: 4,
    color: '#4f5661', gun: 5, sfx: 'pistol', priority: 5, aura: true,
  },
  esniper: {
    // counterpart: sniper (range 249, speed 38)
    name: 'Sniper', hp: 70, speed: 14, range: 209, dmg: 44, acc: 0.70,
    rof: 6.0, burst: 1, burstGap: 0, reward: 4,
    color: '#4a515c', gun: 12, sfx: 'sniper', priority: 4,
  },
  eflame: {
    // counterpart: flamer (flame range 78, speed 38) — flame range capped to 78
    name: 'Flamethrower', hp: 105, speed: 34, range: 78, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 4,
    color: '#4d5560', gun: 8, sfx: 'rifle', priority: 3,
    flame: { range: 78, arc: 0.45, dps: 40 },
    blastResist: 0.5,
  },
  emortar: {
    // counterpart: mortarman (mortar range 348, speed 38) — range held equal
    name: 'Granatwerfer', hp: 90, speed: 18, range: 80, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, reward: 5,
    color: '#545b66', gun: 5, sfx: 'pistol', priority: 4,
    mortar: { range: 348, min: 118, cdMin: 9, cdMax: 12, r: 40, dmg: 82, flight: 1.6, scatter: 52 },
  },
  ebazooka: {
    // counterpart: bazooka (rocket range 243, speed 40)
    name: 'Panzerfaust', hp: 90, speed: 20, range: 80, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, reward: 5,
    color: '#585f6a', gun: 5, sfx: 'pistol', priority: 4,
    rocket: { range: 206, cdMin: 7.4, cdMax: 10.1, r: 30, dmg: 120, speed: 380, armorMult: 2.75 },
  },
  ebike: {
    // counterpart: jeep (speed 110) — melee breach unit, HP only
    name: 'Kradschützen', hp: 95, speed: 85, range: 0, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 5,
    color: '#596069', gun: 0, sfx: 'rifle', priority: 2, bike: true,
  },
  ejeep: {
    // counterpart: jeep (range 201, speed 110)
    name: 'Kübelwagen', hp: 250, speed: 45, range: 188, dmg: 13, acc: 0.42,
    rof: 2.2, burst: 8, burstGap: 0.07, reward: 8,
    color: '#585f69', gun: 14, sfx: 'hmg', priority: 3, vehicle: true,
  },
  ehalftrack: {
    // no allied counterpart (APC) — range/speed left as authored
    name: 'Sd.Kfz. 251', hp: 1150, speed: 30, range: 161, dmg: 9, acc: 0.42,
    rof: 2.2, burst: 6, burstGap: 0.08, reward: 12,
    color: '#565d67', gun: 16, sfx: 'mg', priority: 3, vehicle: true, apc: true,
  },
  panzer: {
    // counterpart: sherman (range 262, speed 14)
    name: 'Panzer IV', hp: 1400, speed: 8, range: 228, dmg: 0, acc: 0,
    rof: 4.2, burst: 1, burstGap: 0, reward: 15, shellDmg: 95,
    color: '#586069', gun: 0, sfx: 'boom', priority: 0, tank: true,
    fireCone: { arc: 0.25 },
    mg: { range: 154, dmg: 8, acc: 0.4, burst: 6, burstGap: 0.08, gun: 24, sfx: 'mg' },
  },
  estug: {
    // counterpart: sherman (range 262, speed 14)
    name: 'StuG III', hp: 950, speed: 12, range: 201, dmg: 0, acc: 0,
    rof: 3.6, burst: 1, burstGap: 0, reward: 12, shellDmg: 105,
    color: '#4e555f', gun: 0, sfx: 'boom', priority: 0, tank: true, casemate: true,
    fireCone: { arc: 0.2 },
    mg: { range: 134, dmg: 6, acc: 0.38, burst: 4, burstGap: 0.08, gun: 20, sfx: 'mg' },
  },
  etiger: {
    // counterpart: sherman (range 262, speed 14)
    name: 'Tiger I', hp: 2050, speed: 5, range: 241, dmg: 0, acc: 0,
    rof: 4.9, burst: 1, burstGap: 0, reward: 22, shellDmg: 120,
    color: '#44454f', gun: 0, sfx: 'boom', priority: 0, tank: true, heavy: true,
    fireCone: { arc: 0.22 },
    mg: { range: 161, dmg: 8, acc: 0.42, burst: 6, burstGap: 0.08, gun: 26, sfx: 'mg' },
  },
  // A20 "V2" battery — a rear-echelon siege weapon, not a soldier. It stakes
  // itself out near the top of the field the instant it spawns and mostly
  // holds position, but pushes forward on the same discipline-break urge as
  // any German infantry; the counter is to reach out and kill it (AT gun,
  // artillery, a bazooka that gets lucky) before its next launch window
  // comes up.
  ev2: {
    name: 'V2 Rocket Battery', hp: 536, speed: 18, range: 0, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 60,
    color: '#474e58', gun: 0, sfx: 'boom', priority: 5, fixed: true,
    // r halved from its original 130 — still levels anything close, but no
    // longer wipes out a whole line at once. dmg is 95% of a rifleman's 100
    // hp, so a near-direct hit maims rather than instantly kills, and
    // armorMult makes it brutal against anything on wheels or tracks.
    v2: { range: W * 0.625, min: 168, cdMin: 21, cdMax: 30, r: 65, dmg: 95, flight: 3.4, scatter: 70, armorMult: 6 },
  },
};

// ---- Imperial Japanese Army roster: the alternate endless-mode foe. Every
// type carries faction:'jp', which routes it through makeEnemy's nation pick,
// the Japanese soldier renderer, and the fanatic no-prone rule (they never hit
// the dirt under fire — they close the distance instead). Two behaviours are
// unique to this faction: the banzai charger (melee shock trooper, no gun) and
// the lunge-mine man (a suicide anti-tank charge).
Object.assign(ENEMY_TYPES, {
  jrifle: {
    // counterpart: rifleman (range 154, speed 42). Type 38 Arisaka + long bayonet.
    name: 'Arisaka Rifleman', hp: 72, speed: 26, range: 138, dmg: 12, acc: 0.45,
    rof: 1.4, burst: 1, burstGap: 0, reward: 2,
    color: '#6b6a3c', gun: 9, sfx: 'rifle', priority: 1, faction: 'jp',
  },
  jbanzai: {
    // NO allied counterpart — a melee shock trooper. Sprints straight at the
    // nearest defender and cuts him down with the bayonet. No ranged attack;
    // `dmg` is the slash. Fast and fragile — they come in numbers.
    name: 'Banzai Charger', hp: 62, speed: 54, range: 0, dmg: 26, acc: 0,
    rof: 1.0, burst: 1, burstGap: 0, reward: 2,
    color: '#77712f', gun: 11, sfx: 'rifle', priority: 1, faction: 'jp',
    banzai: true,
  },
  jsmg: {
    // counterpart: gunner (range 179, speed 36) — Special Naval Landing Force
    // trooper with a Type 100 SMG. Fast close-assault, deadly in short bursts.
    name: 'SNLF Trooper', hp: 84, speed: 38, range: 90, dmg: 9, acc: 0.44,
    rof: 0.9, burst: 3, burstGap: 0.08, reward: 2,
    color: '#4f5a34', gun: 6, sfx: 'mg', priority: 1, faction: 'jp',
  },
  jgren: {
    // counterpart: grenadier (range 231, speed 42) — carries Type 97 frags.
    name: 'Grenadier', hp: 85, speed: 25, range: 101, dmg: 10, acc: 0.42,
    rof: 1.45, burst: 1, burstGap: 0, reward: 3,
    color: '#6a683a', gun: 8, sfx: 'rifle', priority: 2, faction: 'jp', grenade: true,
  },
  jlmg: {
    // counterpart: gunner (range 179, speed 36) — Type 99 light machine gun.
    name: 'Nambu Gunner', hp: 105, speed: 15, range: 172, dmg: 10, acc: 0.36,
    rof: 1.7, burst: 5, burstGap: 0.08, reward: 3,
    color: '#5f5f34', gun: 10, sfx: 'mg', priority: 3, faction: 'jp',
  },
  jhmg: {
    // counterpart: gunner (range 179, speed 36) — Type 92 "Woodpecker" HMG on a
    // tripod. Slow to reposition and long-legged; pins a line with heavy fire.
    name: 'Type 92 HMG', hp: 122, speed: 11, range: 178, dmg: 11, acc: 0.38,
    rof: 1.9, burst: 5, burstGap: 0.09, reward: 4,
    color: '#5c5c33', gun: 11, sfx: 'mg', priority: 3, faction: 'jp',
  },
  jsniper: {
    // counterpart: sniper (range 249, speed 38) — Type 97 in the treeline.
    name: 'Nest Sniper', hp: 68, speed: 13, range: 205, dmg: 44, acc: 0.70,
    rof: 6.0, burst: 1, burstGap: 0, reward: 4,
    color: '#565a30', gun: 12, sfx: 'sniper', priority: 4, faction: 'jp',
  },
  jknee: {
    // Type 89 grenade discharger. Deliberately short-legged: its lob range is
    // 20% under the Nest Sniper's reach (205 -> 164), so a sniper outranges it —
    // but it fires far more often than a Granatwerfer to make up for it.
    name: 'Knee Mortar', hp: 82, speed: 18, range: 78, dmg: 7, acc: 0.42,
    rof: 1.1, burst: 1, burstGap: 0, reward: 4,
    color: '#63633a', gun: 5, sfx: 'pistol', priority: 4, faction: 'jp',
    mortar: { range: 164, min: 70, cdMin: 5, cdMax: 7, r: 30, dmg: 55, flight: 1.3, scatter: 46 },
  },
  jmortar: {
    // counterpart: mortarman (mortar range 348) — a real Type 97 81mm mortar
    // team. Far longer reach and a heavier shell than the knee mortar, but slow
    // to fire; blind up close.
    name: 'Mortar Team', hp: 90, speed: 16, range: 78, dmg: 7, acc: 0.44,
    rof: 1.0, burst: 1, burstGap: 0, reward: 5,
    color: '#5f6036', gun: 5, sfx: 'pistol', priority: 4, faction: 'jp',
    mortar: { range: 330, min: 120, cdMin: 9, cdMax: 12, r: 40, dmg: 80, flight: 1.6, scatter: 52 },
  },
  jlunge: {
    // NO allied counterpart — a suicide anti-tank charge (Type 99 lunge mine).
    // Runs down the nearest vehicle, emplacement, or (failing that) defender
    // and rams the pole charge home, detonating on contact. One-shot: it never
    // fires and never survives its own attack, so it pays no reward.
    name: 'Lunge Mine', hp: 84, speed: 46, range: 0, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 5,
    color: '#6e6a34', gun: 13, sfx: 'rifle', priority: 4, faction: 'jp',
    lunge: { r: 42, dmg: 130, armorMult: 6 },
  },
  joff: {
    // counterpart: officer (range 101, speed 44) — shin gunto sabre. His aura
    // stiffens nearby troops, and on a cooldown he screams the banzai order,
    // surging every Japanese soldier around him into a headlong charge.
    name: 'Officer', hp: 92, speed: 24, range: 92, dmg: 10, acc: 0.5,
    rof: 0.9, burst: 1, burstGap: 0, reward: 5,
    color: '#7a763f', gun: 9, sfx: 'pistol', priority: 5, faction: 'jp',
    aura: true, banzaiCmd: true,
  },
  jflame: {
    // counterpart: flamer (flame range 78, speed 38) — Type 100 flamethrower.
    name: 'Flamethrower', hp: 100, speed: 33, range: 76, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 4,
    color: '#66642f', gun: 8, sfx: 'rifle', priority: 3, faction: 'jp',
    flame: { range: 76, arc: 0.45, dps: 40 }, blastResist: 0.5,
  },
  jhago: {
    // counterpart: sherman (range 262, speed 14) — Type 95 Ha-Go light tank.
    // Thin armor and a small 37mm gun, but fast and it turns up early.
    name: 'Ha-Go', hp: 520, speed: 18, range: 175, dmg: 0, acc: 0,
    rof: 3.8, burst: 1, burstGap: 0, reward: 10, shellDmg: 58,
    color: '#6a6a3e', gun: 0, sfx: 'boom', priority: 0, tank: true, light: true, faction: 'jp',
    fireCone: { arc: 0.28 },
    mg: { range: 138, dmg: 6, acc: 0.4, burst: 5, burstGap: 0.08, gun: 20, sfx: 'mg' },
  },
  jtank: {
    // counterpart: sherman (range 262, speed 14) — Type 97 Chi-Ha. Lighter and
    // quicker than a Panzer IV, with a stubbier 57mm gun.
    name: 'Chi-Ha', hp: 900, speed: 12, range: 205, dmg: 0, acc: 0,
    rof: 4.4, burst: 1, burstGap: 0, reward: 14, shellDmg: 82,
    color: '#6d6a3c', gun: 0, sfx: 'boom', priority: 0, tank: true, faction: 'jp',
    fireCone: { arc: 0.25 },
    mg: { range: 150, dmg: 7, acc: 0.4, burst: 5, burstGap: 0.08, gun: 22, sfx: 'mg' },
  },
  jchinu: {
    // counterpart: sherman (range 262, speed 14) — Type 3 Chi-Nu. The heaviest
    // thing Japan fielded: a 75mm gun and real armor, but slow and it only
    // shows up late.
    name: 'Chi-Nu', hp: 1250, speed: 10, range: 220, dmg: 0, acc: 0,
    rof: 4.6, burst: 1, burstGap: 0, reward: 18, shellDmg: 100,
    color: '#63612f', gun: 0, sfx: 'boom', priority: 0, tank: true, faction: 'jp',
    fireCone: { arc: 0.24 },
    mg: { range: 155, dmg: 8, acc: 0.42, burst: 6, burstGap: 0.08, gun: 24, sfx: 'mg' },
  },
});

// +20% HP across the Japanese infantry — every foot soldier, tanks excluded —
// so they hold up a little longer under fire while they close the distance.
for (const t of Object.values(ENEMY_TYPES)) {
  if (t.faction === 'jp' && !t.tank) t.hp = Math.round(t.hp * 1.2);
}

// ---- The Horde roster: the fourth alternate endless-mode foe, and the only one
// that isn't a national army. Every type carries faction:'zo', routing it through
// makeEnemy's nation pick and the zombie renderer (js/render-zombie.js). The whole
// faction is built around ONE signature mechanic that no army has: the BITE. Most
// of the roster is melee (`zombie:true`), and a bite doesn't just wound — it may
// INFECT the defender (`infect`, a per-bite probability). An infected man rots on
// a timer and, if he isn't cured by a medic first, dies and RISES as a zombie that
// turns on your own line (see infection handling in js/damage.js / update-*.js).
// So the horde grows itself out of your casualties. There is no armor and almost
// no ranged fire; the threat is numbers, speed, and attrition that recruits.
Object.assign(ENEMY_TYPES, {
  zshambler: {
    // the backbone: a slow, relentless walking corpse. Cheap, numerous, and the
    // default thing a bitten defender reanimates into. No gun — it claws and bites.
    name: 'Shambler', hp: 74, speed: 15, range: 0, dmg: 16, acc: 0,
    rof: 1.1, burst: 1, burstGap: 0, reward: 2,
    color: '#5f6b4a', gun: 4, sfx: 'scream', priority: 1, faction: 'zo',
    zombie: true, infect: 0.28,
  },
  zrunner: {
    // a fresh kill, still fast on its feet — sprints the field and lunges at the
    // nearest man. Low HP, but it closes before you can thin the pack. What a
    // fast/light defender reanimates into.
    name: 'Runner', hp: 54, speed: 52, range: 0, dmg: 13, acc: 0,
    rof: 1.0, burst: 1, burstGap: 0, reward: 2,
    color: '#6b7048', gun: 4, sfx: 'scream', priority: 1, faction: 'zo',
    zombie: true, infect: 0.22,
  },
  zcrawler: {
    // torn in half and dragging itself along low to the ground — small, quick, and
    // it comes in swarms. Weak bite, but there are always more of them.
    name: 'Crawler', hp: 32, speed: 38, range: 0, dmg: 9, acc: 0,
    rof: 0.9, burst: 1, burstGap: 0, reward: 1,
    color: '#596341', gun: 3, sfx: 'scream', priority: 1, faction: 'zo',
    zombie: true, infect: 0.16, crawler: true,
  },
  zhound: {
    // an infected war dog — blazing fast, almost no mass, and a savage bite that
    // takes hold easily. Shoot the pack before it reaches the wire.
    name: 'Infected Hound', hp: 30, speed: 72, range: 0, dmg: 12, acc: 0,
    rof: 0.85, burst: 1, burstGap: 0, reward: 2,
    color: '#5a5238', gun: 0, sfx: 'scream', priority: 1, faction: 'zo',
    zombie: true, infect: 0.30, hound: true,
  },
  zbrute: {
    // a swollen, muscle-bound corpse: high HP, slow, and it hits like a truck.
    // A heavy bite with a high chance to infect — and it soaks a lot of lead.
    name: 'Brute', hp: 300, speed: 12, range: 0, dmg: 40, acc: 0,
    rof: 1.5, burst: 1, burstGap: 0, reward: 8,
    color: '#556040', gun: 6, sfx: 'scream', priority: 3, faction: 'zo',
    zombie: true, infect: 0.35, big: true,
  },
  zspitter: {
    // the faction's only real ranged threat: it hangs back and lobs a glob of
    // corrosive bile that bursts on impact, burning everyone nearby AND carrying
    // the infection through the splash. Blind up close — it shambles if you get in.
    name: 'Spitter', hp: 88, speed: 18, range: 0, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 5,
    color: '#6e7a3e', gun: 4, sfx: 'scream', priority: 4, faction: 'zo',
    zombie: true, infect: 0.18,
    spit: { range: 230, min: 70, cdMin: 3.5, cdMax: 5.5, r: 34, dmg: 26, flight: 1.2, scatter: 26, infect: 0.5 },
  },
  zbloater: {
    // a gas-swollen corpse that bursts when it dies (or reaches you), venting a
    // cloud of infectious rot: area damage plus a high infect chance to everyone
    // caught in it. A walking mine — kill it at a distance or share the cloud.
    name: 'Bloater', hp: 130, speed: 13, range: 0, dmg: 10, acc: 0,
    rof: 1.4, burst: 1, burstGap: 0, reward: 5,
    color: '#6a7a4e', gun: 4, sfx: 'scream', priority: 3, faction: 'zo',
    zombie: true, infect: 0.2, bloat: { r: 56, dmg: 34, infect: 0.55 },
  },
  zscreamer: {
    // the horde's "officer": a shrieking corpse whose presence enrages the dead
    // around it (aura → they move faster) and who, on a cadence, looses a scream
    // that hurls every nearby zombie into a frenzied sprint. Kill it to slow the
    // whole pack. It bites too, but its danger is what it does to the others.
    name: 'Screamer', hp: 96, speed: 20, range: 0, dmg: 10, acc: 0,
    rof: 1.2, burst: 1, burstGap: 0, reward: 6,
    color: '#79764a', gun: 4, sfx: 'scream', priority: 5, faction: 'zo',
    zombie: true, infect: 0.2, aura: true, frenzyCmd: true,
  },
  zrevenant: {
    // a reanimated Wehrmacht soldier that never let go of his Kar98 — the horde's
    // one gunman. Undead hands aim poorly and it fires slowly, but a shambling
    // corpse that still shoots back is a nasty surprise in a melee faction.
    name: 'Revenant', hp: 82, speed: 22, range: 148, dmg: 9, acc: 0.30,
    rof: 1.9, burst: 1, burstGap: 0, reward: 3,
    color: '#5c6242', gun: 9, sfx: 'rifle', priority: 2, faction: 'zo',
  },
  zabom: {
    // the Abomination: a towering mound of fused corpses, the horde's boss-tier
    // threat that stands in for armor. Enormous HP, ground-shaking slow, and a
    // sweeping blow that flattens men and smashes emplacements — and near-certain
    // infection on anyone it doesn't kill outright. Shows up only when it's already
    // desperate. Small arms just annoy it; burn it, shell it, or mine it.
    name: 'Abomination', hp: 920, speed: 9, range: 0, dmg: 70, acc: 0,
    rof: 1.7, burst: 1, burstGap: 0, reward: 16,
    color: '#4f5a3a', gun: 8, sfx: 'scream', priority: 4, faction: 'zo',
    zombie: true, infect: 0.5, boss: true,
  },
});

// The dead don't tire: a flat HP bump across the melee horde (gunmen excluded) so
// they soak a little more fire while they close the distance. Mirrors the +20% the
// Japanese infantry get, but applied by the `zombie` flag instead of by faction so
// the ranged Revenant stays brittle.
for (const t of Object.values(ENEMY_TYPES)) {
  if (t.zombie && !t.big && !t.boss) t.hp = Math.round(t.hp * 1.15);
}

const ENEMY_INFO = {
  erifle: 'Standard Wehrmacht infantry. Slow, steady, and expendable — but there are always more of them.',
  esmg: 'Assault troops with MP40s. Fast movers who shred your line in close bursts.',
  egren: 'Carries stick grenades into the fray. The blast ignores friend and foe.',
  emg: 'MG42 team. Pins your men down from long range with sustained fire.',
  eoff: 'Leutnant rallying nearby troops. Kill him first — his aura stiffens German morale.',
  esniper: 'Camouflaged sharpshooter. Picks off officers, medics, and gunners from afar.',
  eflame: 'Flammenwerfer operator in a flak vest. Burns through wire, sandbags, and flesh alike.',
  emortar: 'Granatwerfer team. Lobs 81mm shells into your backfield from beyond rifle range.',
  ebazooka: 'Panzerfaust operator. Hunts Shermans and gun emplacements; wildly inaccurate at distance.',
  ebike: 'Kradschützen on motorcycles. Blazing speed — they breach before you can react.',
  ejeep: 'Kübelwagen with a mounted MG. Mobile fire support, lightly armored.',
  ehalftrack: 'Sd.Kfz. 251 halftrack. Heavy armor, bow MG, and a squad ready to dismount.',
  panzer: 'Panzer IV. Thick armor and a 75mm cannon. Your line\'s worst nightmare.',
  estug: 'StuG III assault gun. Low-profile casemate mount; hunts bunkers and armor from range.',
  etiger: 'Tiger I heavy tank. Nearly impenetrable frontal armor and a devastating 88mm.',
  ev2: 'A20 rocket battery. Mostly holds position but pushes forward under fire like any infantry, covers most of the map, and hits hard where it lands — wildly inaccurate, but it hunts vehicles first and wrecks them fast. Doesn\'t show up until the fighting gets desperate.',
  // Imperial Japanese Army — the alternate endless foe. All of them are
  // fanatics: they never hit the dirt, closing the distance instead of pinning.
  jrifle: 'Imperial infantry with a Type 38 Arisaka and a long bayonet. Fanatical — never goes to ground, just keeps coming.',
  jbanzai: 'Screaming shock trooper. No rifle fire — he sprints straight into your line and cuts men down with the bayonet. Kill him before he closes.',
  jsmg: 'Special Naval Landing Force trooper with a Type 100 SMG. A fast mover who shreds your line in close bursts.',
  jgren: 'Carries Type 97 fragmentation grenades into the fray. The blast ignores friend and foe alike.',
  jlmg: 'Type 99 light machine gun. Rakes your line from range and never flinches under return fire.',
  jhmg: 'Type 92 "Woodpecker" heavy machine gun on a tripod. Slow to move, but its long-range fire pins a whole line.',
  jmortar: 'Type 97 81mm mortar team. Drops shells into your backfield from well beyond rifle range; blind up close.',
  jsniper: 'Marksman lashed into the treeline. Stays hidden until he fires, then picks off officers, medics, and gunners.',
  jknee: 'Type 89 grenade discharger — a "knee mortar." Short-ranged and light, but it lobs shells far faster than a Granatwerfer.',
  jlunge: 'Suicide anti-tank man with a Type 99 lunge mine. Charges your armor and emplacements and rams the charge home. Shoot him off before he connects.',
  joff: 'Sword-wielding officer. His presence hardens the troops, and on command he hurls every soldier around him into a banzai charge.',
  jflame: 'Type 100 flamethrower operator. Burns through wire, sandbags, and flesh — and his own men if they\'re in the way.',
  jhago: 'Type 95 Ha-Go light tank. Thin-skinned and armed with only a 37mm gun, but fast — and it shows up long before the heavier armor.',
  jtank: 'Type 97 Chi-Ha. Lighter and faster than a Panzer, with a stubby 57mm gun and a hull MG. Small arms still bounce off it.',
  jchinu: 'Type 3 Chi-Nu. The heaviest tank Japan fielded — a 75mm gun and thick armor. Slow, late, and ruinous. Use AT weapons.',
  // The Horde — the undead endless foe. No army, no discipline: just a rising tide
  // of the dead. Their bite can INFECT your men, who then turn against you.
  zshambler: 'A slow, relentless walking corpse. No weapon — it claws its way to your line and bites. Its bite can infect; an infected man who dies rises against you. Cheap and endless.',
  zrunner: 'A fresh corpse still fast on its feet. Sprints the field and lunges — low HP, but it closes before you can thin the pack. Its bite spreads the infection.',
  zcrawler: 'Half a body dragging itself along the dirt. Small, quick, and it swarms. A weak bite, but there are always more of them, and every bite can infect.',
  zhound: 'An infected war dog. Blazing fast and almost no mass, with a savage bite that takes hold easily. Shoot the pack before it reaches the wire.',
  zbrute: 'A swollen, muscle-bound corpse. High HP, slow, and it hits like a truck — a heavy bite with a strong chance to infect. Soaks a lot of lead.',
  zspitter: 'The horde\'s one ranged threat. Hangs back and lobs a glob of corrosive bile that bursts on impact — area damage plus a high chance to infect everyone in the splash. Blind up close.',
  zbloater: 'A gas-swollen corpse that bursts when it dies or reaches you, venting a cloud of infectious rot: area damage and a high infect chance to all caught in it. A walking mine — kill it at range.',
  zscreamer: 'The horde\'s driving force. Its presence enrages the dead around it, and on a cadence it looses a scream that hurls every nearby zombie into a frenzied sprint. Kill it to slow the whole pack.',
  zrevenant: 'A reanimated Wehrmacht soldier that never let go of his Kar98 — the horde\'s only gunman. Undead hands aim poorly and it fires slowly, but a corpse that shoots back is a nasty surprise.',
  zabom: 'The Abomination — a towering mound of fused corpses, the horde\'s boss. Enormous HP, ground-shaking slow, a sweeping blow that flattens men and smashes emplacements, and near-certain infection on survivors. Burn it, shell it, or mine it.',
};

const EVENT_INFO = [
  {
    key: 'fog',
    name: 'Fog Rolls In',
    wave: 3,
    desc: 'Battlefield visibility drops. Your men and the enemy fight blind until the fog lifts.',
  },
  {
    key: 'smokescreen',
    name: 'Smokescreen',
    wave: 3,
    desc: 'A smoke round lands on the field and pumps out a screen that rides the wind. Nobody can see through it: troops on either side cannot target each other at all until they are almost touching. Lasts 20-60 seconds, and the wind shifts every wave.',
  },
  {
    key: 'fng',
    name: 'FNG Reinforcements',
    wave: 3,
    desc: 'A green rifleman reports for duty — free of charge. He\'s untested, but every body counts.',
  },
  {
    key: 'airraid',
    name: 'Air Bombing Raid',
    wave: 4,
    desc: 'Luftwaffe bombers cross the field from north to south. Bombers near your men drop 1-4 inaccurate bombs. Numbers, bombs, and damage escalate per wave tier. Only AA guns can reach them.',
  },
  {
    key: 'paradrop',
    name: 'Fallschirmjäger Paradrop',
    wave: 6,
    desc: 'Enemy paratroopers drift in behind your line. They are vulnerable under canopy — shoot them before they land.',
  },
  {
    key: 'airstrike',
    name: 'P-47 Strafing Run',
    wave: 8,
    desc: 'Allied Thunderbolts strafe the field and drop bombs. Helps your cause, but ordnance is indiscriminate.',
  },
  {
    key: 'special',
    name: 'Themed Assaults',
    wave: 10,
    desc: 'Every 10th wave: a motorcycle blitz, mass paradrop, human wave, armor column, or assault under fog. Themes rotate and grow bigger.',
  },
];

// promotion ladder: kills needed to reach each rank. Veterancy bites hard:
// a max-rank man is roughly 3-4x the soldier a green private is.
const RANKS = [
  { name: 'PVT', kills: 0 },
  { name: 'PFC', kills: 2 },
  { name: 'CPL', kills: 5 },
  { name: 'SGT', kills: 9 },
  { name: 'SSG', kills: 14 },
  { name: 'SFC', kills: 20 },
  { name: 'MSG', kills: 27 },
];

const PLACEABLES = [
  { key: 'rifleman', label: 'RIFLEMAN', cost: 3, kind: 'unit', hotkey: '1',
    desc: 'M1 Garand rifleman. Cheap and reliable. Ranking up makes him shoot faster, straighter, and harder.' },
  { key: 'gunner', label: 'GUNNER', cost: 9, kind: 'unit', hotkey: '2',
    desc: 'BAR gunner. Long-range automatic fire. Ranking up makes him shoot faster, straighter, and harder.' },
  { key: 'grenadier', label: 'GRENADIER', cost: 7, kind: 'unit', hotkey: '3',
      desc: 'Carbine + frag grenades. Blast can hit your men. Can catch and return enemy grenades. Rank: more frequent, accurate, harder grenades.' },
    { key: 'shotgunner', label: 'SHOTGUN', cost: 5, kind: 'unit', hotkey: 'G',
      desc: 'M97 trench gun and body armor. High HP; each blast hits every enemy in the cone. Rank: tighter spread, extended range.' },
    { key: 'bazooka', label: 'BAZOOKA', cost: 12, kind: 'unit', hotkey: 'B',
      desc: 'M1A1 rocket launcher. Inaccurate at range; splash hurts friendlies. Excels vs armor. Rank: faster reloads, tighter rockets.' },
    { key: 'mortarman', label: 'MORTARMAN', cost: 13, kind: 'unit', hotkey: 'M',
      desc: 'Portable 60mm mortar. Long-range indirect fire; useless up close. Rank: faster reloads, tighter shells.' },
    { key: 'sniper', label: 'SNIPER', cost: 10, kind: 'unit', hotkey: '4',
      desc: 'Springfield scoped rifle. Picks officers, snipers, bazookas, and mortar teams first. Rank: faster, straighter, harder.' },
    { key: 'medic', label: 'MEDIC', cost: 12, kind: 'unit', hotkey: '5',
      desc: 'Unarmed. Heals the most wounded nearby soldier. Faster with rank. Snipers hunt him. Can\'t repair vehicles or fortifications.' },
    { key: 'engineer', label: 'ENGINEER', cost: 14, kind: 'unit', hotkey: 'E',
      desc: 'Repairs and upgrades fortifications, and lets you build emplacements forward of the deploy line within his radius. Slowly patches vehicles and AT guns. SMG close range. Rank: faster repairs, extended range.' },
    { key: 'officer', label: 'OFFICER', cost: 15, kind: 'unit', hotkey: '6',
      desc: 'Sidearm. Aura boosts nearby soldiers\' fire. Bonus grows with rank. Earns bonus TP. Snipers hunt him.' },
    { key: 'flamer', label: 'FLAMER', cost: 7, kind: 'unit', hotkey: 'F',
      desc: 'M2 flamethrower. Burns everything in the cone — friend and foe. Rank: more burn damage, tighter stream.' },
    { key: 'jeep', label: 'JEEP', cost: 26, kind: 'unit', hotkey: 'J',
      desc: 'Willys jeep, .50 cal HMG, fires on the move. Unarmored. Engineer patches slowly. Rank: faster, deadlier.' },
    { key: 'sherman', label: 'SHERMAN', cost: 50, kind: 'unit', hotkey: 'T',
      desc: 'M4 Sherman. 75mm turret cannon. Shrugs off small arms. Engineer repairs slowly. Rank: sharper aim, faster reloads.' },
    { key: 'atgun', label: 'AT GUN', cost: 20, kind: 'unit', hotkey: 'P',
      desc: '57mm AT gun. Immobile; fires only at vehicles in its cone. Engineer repairs slowly. Rank: wider arc, faster reloads, more damage.' },
    { key: 'aagun', label: 'AA GUN', cost: 20, kind: 'unit', hotkey: 'V',
      desc: '40mm Bofors flak gun. Immobile; anti-air only. Shoots bombers and paratroopers. Engineer repairs slowly. Rank: wider arc, faster reloads, tighter aim.' },
  { key: 'wire', label: 'WIRE', cost: 3, kind: 'defense', hotkey: '7',
    desc: 'Barbed wire. Slows the German advance until it wears out.' },
  { key: 'sandbags', label: 'SANDBAGS', cost: 4, kind: 'defense', hotkey: '8',
    desc: 'Cover. Soldiers behind it dodge half of incoming fire.' },
  { key: 'dummy', label: 'DUMMY', cost: 3, kind: 'defense', hotkey: 'D',
    desc: 'Straw decoy. Enemies waste fire on it, but each hit they may see the ruse and move on (40%). Fortify for a helmet, harden for body armor — a better disguise holds their attention longer (30%/20%) and each tier adds a sandbag\'s worth of HP.' },
  { key: 'bunker', label: 'BUNKER', cost: 15, kind: 'defense', hotkey: 'K',
    desc: 'Concrete pillbox. Soldiers inside dodge 75% of incoming fire. Shrugs off shellfire.' },
  { key: 'watchtower', label: 'WATCH TOWER', cost: 10, kind: 'defense', hotkey: 'W',
    desc: 'Wooden lookout. +25% range for nearby soldiers (+35% fortified). Mortars ignore it. Frail.' },
  { key: 'camonest', label: 'CAMO NEST', cost: 4, kind: 'defense', hotkey: 'C',
    desc: 'Concealed position. Hidden until firing; exposed 3 s after last shot (1.5 s fortified). No dodge bonus. Weak to explosives.' },
  { key: 'ammocrate', label: 'AMMO CRATE', cost: 8, kind: 'defense', hotkey: 'X',
    desc: 'Ammunition cache. Nearby soldiers fire and reload 10% faster (+20% fortified, +30% hardened). Frail.' },
  { key: 'mine', label: 'MINEFIELD', cost: 6, kind: 'defense', hotkey: '9',
    desc: 'Cluster of 3 anti-personnel mines. Hurts tanks too. Germans can\'t see them.' },
  { key: 'mortar', label: 'MORTAR STRIKE', cost: 5, kind: 'support', hotkey: '0',
    desc: '6 mortar shells on target. DANGER CLOSE — friendly fire is real.' },
  { key: 'artillery', label: 'ARTILLERY STRIKE', cost: 12, kind: 'support', hotkey: 'A',
    desc: '105mm barrage: 16 heavy shells, wide spread. Devastating. Indiscriminate.' },
  { key: 'bodyarmor', label: 'BODY ARMOR', cost: 1, kind: 'support', hotkey: '',
    desc: 'Straps a plate carrier on one infantryman. Its own bar soaks up bullet damage until it breaks — HP is untouched while it holds. Re-buy to refill.' },
  { key: 'flakarmor', label: 'FLAK ARMOR', cost: 1, kind: 'support', hotkey: '',
    desc: 'Fits a flak vest on one infantryman. Its own bar soaks up explosion damage until it breaks — HP is untouched while it holds. Re-buy to refill.' },
];

// German roster, kept as the source the endless TESTING toolbar derives its
// GERMANS category from (see TESTING_GERMAN_PLACEABLES below). costs mirror the
// closest allied PLACEABLES counterpart (rifleman, gunner, grenadier,
// shotgunner, sniper, flamer, officer, jeep, sherman, artillery).
const AXIS_PLACEABLES = [
  { key: 'erifle', label: 'RIFLEMAN', cost: 4, kind: 'eunit', hotkey: '1',
    desc: 'Wehrmacht rifleman. Slow, steady, expendable.' },
  { key: 'esmg', label: 'STORMTROOP', cost: 4, kind: 'eunit', hotkey: '2',
    desc: 'MP40 assault trooper. Fast mover, deadly up close.' },
  { key: 'egren', label: 'GRENADIER', cost: 10, kind: 'eunit', hotkey: '3',
    desc: 'Carries stick grenades into the fray. Blast ignores friend and foe.' },
  { key: 'emg', label: 'MG42 TEAM', cost: 9, kind: 'eunit', hotkey: '4',
    desc: 'MG42 gunner. Pins the Americans down from long range.' },
  { key: 'esniper', label: 'SNIPER', cost: 10, kind: 'eunit', hotkey: '5',
    desc: 'Camouflaged marksman. Picks off gunners and medics from afar.' },
  { key: 'eflame', label: 'FLAMMEN', cost: 6, kind: 'eunit', hotkey: 'F',
    desc: 'Flammenwerfer operator in a flak vest. Burns through wire, sandbags and flesh alike.' },
  { key: 'eoff', label: 'OFFICER', cost: 15, kind: 'eunit', hotkey: '6',
    desc: 'Leutnant. Nearby troops fight harder; earns +1 TP every 30 s while alive.' },
  { key: 'emortar', label: 'GRANATWERFER', cost: 14, kind: 'eunit', hotkey: 'M',
    desc: '81mm mortar team. Long-range indirect fire; blind inside 147 px.' },
  { key: 'ebazooka', label: 'PANZERFAUST', cost: 18, kind: 'eunit', hotkey: 'B',
    desc: 'Panzerfaust operator. Prioritizes armor; scatter is brutal at range.' },
  { key: 'ebike', label: 'KRAD', cost: 15, kind: 'eunit', hotkey: 'K',
    desc: 'Kradschützen motorcycle team. Blazing speed — races for the breach.' },
  { key: 'ejeep', label: 'KÜBELWAGEN', cost: 30, kind: 'eunit', hotkey: 'J',
    desc: 'Gun car with a mounted MG. Mobile fire support, lightly armored.' },
  { key: 'ehalftrack', label: 'HALFTRACK', cost: 80, kind: 'eunit', hotkey: 'H',
    desc: 'Sd.Kfz. 251. Heavy armor, bow MG, and a squad that dismounts at the line.' },
  { key: 'panzer', label: 'PANZER IV', cost: 80, kind: 'eunit', hotkey: 'T',
    desc: '75mm cannon and thick armor. The American line\'s worst nightmare.' },
  { key: 'ebarrage', label: 'ARTILLERY', cost: 16, kind: 'support', hotkey: 'A',
    desc: 'German 105mm barrage: 10 heavy shells on target. Indiscriminate.' },
];

// endless testing mode: the German roster dropped in freely anywhere on the
// field (kind 'egerman'). No hotkeys — this list is merged onto the endless
// toolbar alongside PLACEABLES, and reusing those hotkeys would just shadow
// the US units that already claim them.
const TESTING_GERMAN_PLACEABLES = [
  ...AXIS_PLACEABLES.filter(p => p.kind === 'eunit').map(p => ({ ...p, kind: 'egerman', hotkey: '' })),
  // ev2 is an endless-only set piece that otherwise doesn't show up until wave
  // 140. Testing mode is exactly where you'd want to drop one in on demand.
  { key: 'ev2', label: 'V2 BATTERY', cost: 100, kind: 'egerman', hotkey: '',
    desc: 'A20 rocket battery. Normally locked behind wave 140 in endless — testing mode lets you place one immediately.' },
];

// endless testing/deploy roster for the Imperial Japanese Army. Reuses the
// 'egerman' kind (which just routes placement through makeEnemy as an attacker);
// makeEnemy reads each type's faction:'jp', so these spawn as Japanese units.
const TESTING_JAPANESE_PLACEABLES = [
  { key: 'jrifle', label: 'ARISAKA', cost: 4, kind: 'egerman', hotkey: '',
    desc: 'Imperial rifleman with an Arisaka and long bayonet. Fanatical — never goes prone.' },
  { key: 'jbanzai', label: 'BANZAI', cost: 4, kind: 'egerman', hotkey: '',
    desc: 'Melee shock trooper. Sprints in and bayonets defenders — no ranged attack.' },
  { key: 'jsmg', label: 'SNLF SMG', cost: 4, kind: 'egerman', hotkey: '',
    desc: 'Naval landing trooper with a Type 100 SMG. Fast close-assault.' },
  { key: 'jgren', label: 'JP GREN', cost: 10, kind: 'egerman', hotkey: '',
    desc: 'Grenadier. Lobs Type 97 frags; the blast ignores friend and foe.' },
  { key: 'jlmg', label: 'NAMBU LMG', cost: 9, kind: 'egerman', hotkey: '',
    desc: 'Type 99 light machine gun. Long-range suppressive fire.' },
  { key: 'jhmg', label: 'TYPE 92 HMG', cost: 9, kind: 'egerman', hotkey: '',
    desc: 'Type 92 heavy MG on a tripod. Slow, long-range, heavy suppression.' },
  { key: 'jsniper', label: 'NEST SNIPER', cost: 10, kind: 'egerman', hotkey: '',
    desc: 'Camouflaged marksman lashed into the treeline.' },
  { key: 'jknee', label: 'KNEE MORTAR', cost: 14, kind: 'egerman', hotkey: '',
    desc: 'Type 89 grenade discharger. Short-ranged but very fast-firing.' },
  { key: 'jmortar', label: 'MORTAR TEAM', cost: 14, kind: 'egerman', hotkey: '',
    desc: 'Type 97 81mm mortar. Long-range indirect fire; blind up close.' },
  { key: 'jlunge', label: 'LUNGE MINE', cost: 18, kind: 'egerman', hotkey: '',
    desc: 'Suicide anti-tank charge. Rams armor and emplacements, detonating on contact.' },
  { key: 'joff', label: 'JP OFFICER', cost: 15, kind: 'egerman', hotkey: '',
    desc: 'Sword officer. Aura buff plus a banzai-charge command.' },
  { key: 'jflame', label: 'JP FLAMER', cost: 6, kind: 'egerman', hotkey: '',
    desc: 'Type 100 flamethrower. Burns everything in the cone.' },
  { key: 'jhago', label: 'HA-GO', cost: 55, kind: 'egerman', hotkey: '',
    desc: 'Type 95 Ha-Go light tank. Fast, thin-skinned, 37mm gun.' },
  { key: 'jtank', label: 'CHI-HA', cost: 80, kind: 'egerman', hotkey: '',
    desc: 'Type 97 Chi-Ha. Lighter, quicker armor with a 57mm gun.' },
  { key: 'jchinu', label: 'CHI-NU', cost: 120, kind: 'egerman', hotkey: '',
    desc: 'Type 3 Chi-Nu. Heavy armor and a 75mm gun. Slow and late.' },
];

// endless testing/deploy roster for The Horde. Same 'egerman' routing as the other
// alternate factions (makeEnemy reads faction:'zo' off each type).
const TESTING_ZOMBIE_PLACEABLES = [
  { key: 'zshambler', label: 'SHAMBLER', cost: 3, kind: 'egerman', hotkey: '',
    desc: 'Slow walking corpse. Claws to the line and bites — the bite can infect.' },
  { key: 'zrunner', label: 'RUNNER', cost: 3, kind: 'egerman', hotkey: '',
    desc: 'Fast fresh corpse. Sprints and lunges; low HP. Bite spreads infection.' },
  { key: 'zcrawler', label: 'CRAWLER', cost: 3, kind: 'egerman', hotkey: '',
    desc: 'Half a body dragging along the dirt. Small, quick, swarms.' },
  { key: 'zhound', label: 'HOUND', cost: 4, kind: 'egerman', hotkey: '',
    desc: 'Infected war dog. Blazing fast, tiny HP, a bite that takes hold easily.' },
  { key: 'zbrute', label: 'BRUTE', cost: 12, kind: 'egerman', hotkey: '',
    desc: 'Swollen bruiser. High HP, slow, heavy bite with a strong infect chance.' },
  { key: 'zspitter', label: 'SPITTER', cost: 10, kind: 'egerman', hotkey: '',
    desc: 'Lobs corrosive bile — area damage plus infection in the splash. Blind up close.' },
  { key: 'zbloater', label: 'BLOATER', cost: 9, kind: 'egerman', hotkey: '',
    desc: 'Bursts on death into a cloud of infectious rot. A walking mine.' },
  { key: 'zscreamer', label: 'SCREAMER', cost: 15, kind: 'egerman', hotkey: '',
    desc: 'Enrages the dead around it and screams to hurl them into a frenzied sprint.' },
  { key: 'zrevenant', label: 'REVENANT', cost: 5, kind: 'egerman', hotkey: '',
    desc: 'Reanimated soldier with a Kar98. The horde\'s only gunman — poor aim, slow fire.' },
  { key: 'zabom', label: 'ABOMINATION', cost: 90, kind: 'egerman', hotkey: '',
    desc: 'Boss mound of fused corpses. Enormous HP, smashes emplacements, near-certain infection.' },
];

// ---- Infection: the Horde's signature mechanic. A zombie bite (and bile/gas
// splash) may plant the infection in a defender; he rots on a countdown and, if a
// medic doesn't cure him first, dies and RISES as a zombie on the enemy side. Read
// by the bite/spit/bloat code (update-enemies.js), the per-frame rot tick
// (update-friendlies.js), the reanimation on death (damage.js) and the medic cure.
const INFECT_TURN_MIN = 9;     // seconds from bite to fully turning, if untreated
const INFECT_TURN_MAX = 15;
const INFECT_DOT = 3;          // HP lost per rot tick
const INFECT_DOT_INTERVAL = 1.5;
const INFECT_CURE_PER_SEC = 4; // a tending medic burns down this much infection timer per second (on top of real time)

// ---- Wind & the smokescreen event (js/smoke.js). One wind vector per run
// carries every puff a smoke round throws off; each wave the wind backs or
// veers a little, so where a screen ends up is never quite the same twice.
const WIND_SPEED_MIN = 19.25;  // px/sec a puff drifts at (a screen carries 75% further than it first shipped: +25%, then +40%)
const WIND_SPEED_MAX = 45.5;
const WIND_SHIFT_MAX = 0.2;    // per wave, the direction turns by up to this fraction of a full circle

const SMOKE_DUR_MIN = 20;      // seconds a screen stands, start to last wisp
const SMOKE_DUR_MAX = 60;
const SMOKE_ROUND_FLIGHT = 1.6; // fuse on the incoming canister — a moment's warning
// Puffs are laid by DISTANCE, not on a fixed clock: the pot drops one every
// SMOKE_EMIT_SPACING px of drift, so a stiff wind can't stretch the plume into a
// dotted line with holes shooters can see through. The clamps keep a dead calm
// from spamming puffs and a gale from outrunning the emitter.
const SMOKE_EMIT_SPACING = 13; // px of drift between puffs
const SMOKE_EMIT_MIN = 0.2;    // seconds — floor on the emit interval
const SMOKE_EMIT_MAX = 0.6;    // seconds — ceiling, for very light winds
const SMOKE_PUFF_TTL = 11;     // seconds one puff lives after it leaves the pot
const SMOKE_PUFF_CAP = 52;     // live puffs, oldest dropped — bounds draw AND line-of-sight cost
const SMOKE_PUFF_R0 = 16;      // radius fresh off the pot
const SMOKE_PUFF_R = 44;       // radius once it's fully bloomed
const SMOKE_SWIRL = 7;         // px/sec of cross-wind wander, so the plume isn't a ruler
const SMOKE_ALPHA = 0.85;      // draw opacity of a puff at full density
// How deep into smoke a man can see, in px of smoke ON the sight line (NOT the
// gap between the two men — see smokeBlocksLOS). Men in contact have almost no
// smoke between them and always find each other; men with a bank of it between
// them never do, however close they're standing.
const SMOKE_SEE_THROUGH = 26;
// the puff art is inset inside its bitmap; blit at this multiple of the blocking
// radius so what the player sees is the volume that actually screens
const SMOKE_SPRITE_FIT = 2.06;

// testing-mode-only ability: an instant field promotion for every unit —
// American and German alike — caught inside the blast-style radius.
const TESTING_ABILITIES = [
  { key: 'rankup', label: 'RANK UP', cost: 10, kind: 'support', hotkey: '',
    desc: 'Instantly promotes every unit — American and German alike — within a wide radius by one rank. Testing mode only.' },
  { key: 'purge', label: 'PURGE', cost: 5, kind: 'support', hotkey: '',
    desc: 'Instantly destroys every unit and emplacement — American and German alike — within a wide radius. Testing mode only.' },
];

// testing-mode-only: the random-event roster, summoned on demand. These fire
// the instant the button is clicked — there's nothing to place, so kind
// 'event' skips placement mode entirely. Wave-gating is ignored: the whole
// point is to see any event at any wave.
const TESTING_EVENTS = [
  { key: 'random', label: 'RANDOM', cost: 0, kind: 'event', hotkey: '',
    desc: 'Rolls the wave-appropriate random event, exactly as the game would.' },
  { key: 'fog', label: 'FOG', cost: 0, kind: 'event', hotkey: '',
    desc: 'Rolls fog across the field — everyone shoots worse until it lifts.' },
  { key: 'smokescreen', label: 'SMOKE', cost: 0, kind: 'event', hotkey: '',
    desc: 'Drops a smoke round that screens the field downwind — nobody can target through it.' },
  { key: 'fng', label: 'FNG', cost: 0, kind: 'event', hotkey: '',
    desc: 'A replacement rifleman reports to the back line.' },
  { key: 'paradrop', label: 'PARADROP', cost: 0, kind: 'event', hotkey: '',
    desc: 'Fallschirmjäger drop into the field. Stick size scales with the current wave.' },
  { key: 'airraid', label: 'AIR RAID', cost: 0, kind: 'event', hotkey: '',
    desc: 'German bombers cross the field north to south. Formation and payload scale with the current wave.' },
  { key: 'airstrike', label: 'STRAFING RUN', cost: 0, kind: 'event', hotkey: '',
    desc: 'A P-47 strafes a lane of the field.' },
];
