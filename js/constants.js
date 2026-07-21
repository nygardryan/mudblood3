/* Mud & Blood — tuning constants & placeable catalog.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

const W = 540, H = 620;
// layouts below were authored against the original 900px-wide field; lx()
// rescales an offset-from-center so those formations keep their proportions
const LAYOUT_REF_W = 900;
function lx(off) { return W / 2 + off * (W / LAYOUT_REF_W); }
const DEPLOY_Y = 380;          // your side of the field starts here
const FORWARD_Y = H / 3;       // units may advance and mines/wire may be laid this far up
const AXIS_DEPLOY_Y = 90;      // axis campaign: attackers step off from this top strip
const AXIS_PARA_DROP_MAX_Y = DEPLOY_Y - 25; // paradrops may land almost to the US line
const AXIS_PARA_POOL_BASE = ['erifle', 'erifle', 'esmg', 'esmg', 'egren'];
const AXIS_PARA_POOL_EXTRAS = ['emg', 'esniper', 'eflame', 'eoff', 'emortar', 'ebazooka'];
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
const CAMONEST_ZONE = 30;               // same footprint as a bunker's cover radius
const CAMONEST_REVEAL = 4;              // seconds targetable after a shot, unfortified
const CAMONEST_REVEAL_FORTIFIED = 2;
const CAMONEST_REVEAL_HARDENED = 1;     // second-tier fortification (Hardened Works)
const CAMONEST_EXPLOSIVE_MULT = 1.2;    // weak to explosives — no reduction like a bunker's concrete
const GRENADE_CATCH_RANGE = 34;         // how close a grenadier must be to a landed enemy grenade to heave it back
const V2_ROCKET_ARC = 130;              // cruise altitude of the V2 warhead between boost and terminal dive

const UNIT_TYPES = {
  rifleman: {
    name: 'Rifleman', hp: 100, range: 154, dmg: 13, acc: 0.55,
    rof: 0.88, burst: 1, burstGap: 0, speed: 42,
    color: '#4a5d3a', gun: 7, sfx: 'rifle',
    desc: 'M1 Garand. The backbone of your line.',
  },
  gunner: {
    name: 'Gunner', hp: 100, range: 179, dmg: 9, acc: 0.32,
    rof: 1.36, burst: 6, burstGap: 0.09, speed: 36,
    color: '#3d5236', gun: 10, sfx: 'mg',
    desc: 'BAR automatic rifle. Suppressive bursts.',
  },
  grenadier: {
    // 50% more gun range than the rifleman (154): the better all-rounder
    name: 'Grenadier', hp: 100, range: 231, dmg: 10, acc: 0.55,
    rof: 1.2, burst: 1, burstGap: 0, speed: 42,
    color: '#44583c', gun: 6, sfx: 'rifle', grenade: true,
    desc: 'Carbine most of the time; a heavy frag now and then. Quick enough to catch a live German grenade and heave it back.',
  },
  shotgunner: {
    name: 'Shotgunner', hp: 145, range: 0, dmg: 0, acc: 0,
    rof: 1.5, burst: 1, burstGap: 0, speed: 34,
    color: '#424f38', gun: 9, sfx: 'shotgun',
    shotgun: { range: 96, arc: 0.52, pellets: 8, dmg: 11, spread: 0.45 },
    desc: 'M97 trench gun and steel plate. Buckshot shreds clusters up close.',
  },
  bazooka: {
    name: 'Bazooka', hp: 90, range: 80, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, speed: 40,
    color: '#3f5138', gun: 5, sfx: 'pistol',
    rocket: { range: 243, cdMin: 7.4, cdMax: 10.1, r: 30, dmg: 120, speed: 380, armorMult: 2.75 },
    desc: 'M1A1 rocket launcher. The answer to armor.',
  },
  mortarman: {
    name: 'Mortarman', hp: 90, range: 88, dmg: 8, acc: 0.47,
    rof: 1.0, burst: 1, burstGap: 0, speed: 38,
    color: '#4c5a3f', gun: 5, sfx: 'pistol',
    mortar: { range: 348, min: 118, cdMin: 9, cdMax: 12, r: 40, dmg: 75, flight: 1.6, scatter: 52 },
    desc: 'Portable 60mm mortar. Indirect fire at range.',
  },
  sniper: {
    name: 'Sniper', hp: 85, range: 249, dmg: 46, acc: 0.72,
    rof: 5.2, burst: 1, burstGap: 0, speed: 38,
    color: '#38442e', gun: 12, sfx: 'sniper',
    desc: 'Springfield scoped rifle. Picks off officers and MGs first.',
  },
  medic: {
    name: 'Medic', hp: 90, range: 94, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, speed: 46,
    color: '#60744f', gun: 5, sfx: 'pistol',
    desc: 'Patches up the most wounded man in range, faster with rank. Carries no weapon.',
  },
  engineer: {
    name: 'Engineer', hp: 95, range: 74, dmg: 7, acc: 0.45,
    rof: 1.1, burst: 4, burstGap: 0.07, speed: 44,
    color: '#51603e', gun: 6, sfx: 'mg',
    desc: 'Repairs fortifications, upgrades emplacements, and can wrench on damaged vehicles and AT guns (very slowly). M3 grease gun up close.',
  },
  officer: {
    name: 'Officer', hp: 95, range: 101, dmg: 9, acc: 0.5,
    rof: 0.9, burst: 1, burstGap: 0, speed: 44,
    color: '#6b6d44', gun: 5, sfx: 'pistol',
    desc: 'Nearby men fire faster and straighter, more so as he ranks up. Earns +1 TP / 30 s.',
  },
  flamer: {
    name: 'Flamethrower', hp: 130, range: 78, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, speed: 38,
    color: '#4f5c3a', gun: 8, sfx: 'rifle',
    flame: { range: 78, arc: 0.45, dps: 38 },
    blastResist: 0.5, rankHealMult: 3,
    desc: 'M2 flamethrower and flak vest. Burns everything in the cone — friend or foe.',
  },
  jeep: {
    name: 'Jeep', hp: 250, range: 201, dmg: 13, acc: 0.42,
    rof: 2.1, burst: 16, burstGap: 0.07, speed: 110,
    color: '#4a5a3f', gun: 14, sfx: 'hmg', vehicle: true, rankMult: 3,
    desc: 'Willys jeep, pintle-mounted .50 cal. Fast and hard-hitting, but unarmored.',
  },
  sherman: {
    name: 'Sherman', hp: 1000, range: 262, dmg: 0, acc: 0,
    rof: 4.0, burst: 1, burstGap: 0, speed: 14, shellDmg: 80,
    color: '#4a5a3f', gun: 0, sfx: 'boom', tank: true,
    fireCone: { arc: 0.275 },
    mg: { range: 161, dmg: 8, acc: 0.45, burst: 6, burstGap: 0.08, gun: 24, sfx: 'mg' },
    desc: 'M4 Sherman. 75mm cannon on a rotating turret and thick armor. Medics can\'t fix steel.',
  },
  atgun: {
    // trails are staked into the ground: it traverses inside its cone but never moves
    name: 'AT Gun', hp: 200, range: 519, dmg: 0, acc: 0,
    rof: 8.8, burst: 1, burstGap: 0, speed: 0,
    color: '#4a5a3f', gun: 0, sfx: 'boom', fixed: true, gunEmplacement: true,
    atgun: { arc: 0.338, shellDmg: 403, r: 27, scatterMult: 1.100 },
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
    color: '#4a5a3f', gun: 0, sfx: 'boom', fixed: true, gunEmplacement: true,
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
  // Axis infantry are rebased to their Allied counterpart's stats with a 10%
  // edge in the favorable direction (hp/dmg/acc/range/speed up, rof/burstGap
  // down). Stormtrooper has no direct Allied pair, so it takes a flat +10% over
  // its old numbers. See docs/axis-units.md.
  erifle: {
    name: 'Rifleman', hp: 110, speed: 46, range: 169, dmg: 14, acc: 0.6,
    rof: 0.79, burst: 1, burstGap: 0, reward: 2,
    color: '#5e5e52', gun: 7, sfx: 'rifle', priority: 1,
  },
  esmg: {
    name: 'Stormtrooper', hp: 77, speed: 40, range: 96, dmg: 8, acc: 0.46,
    rof: 0.9, burst: 3, burstGap: 0.07, reward: 2,
    color: '#46443a', gun: 6, sfx: 'mg', priority: 1,
  },
  egren: {
    name: 'Grenadier', hp: 110, speed: 46, range: 254, dmg: 11, acc: 0.6,
    rof: 1.08, burst: 1, burstGap: 0, reward: 3,
    color: '#524e3e', gun: 5, sfx: 'pistol', priority: 2, grenade: true,
  },
  emg: {
    name: 'MG Gunner', hp: 110, speed: 40, range: 197, dmg: 10, acc: 0.35,
    rof: 1.22, burst: 7, burstGap: 0.08, reward: 3,
    color: '#484640', gun: 10, sfx: 'mg', priority: 3,
  },
  eoff: {
    name: 'Officer', hp: 105, speed: 48, range: 111, dmg: 10, acc: 0.55,
    rof: 0.81, burst: 1, burstGap: 0, reward: 4,
    color: '#4a4840', gun: 5, sfx: 'pistol', priority: 5, aura: true,
  },
  esniper: {
    name: 'Sniper', hp: 94, speed: 42, range: 274, dmg: 51, acc: 0.79,
    rof: 4.68, burst: 1, burstGap: 0, reward: 4,
    color: '#464438', gun: 12, sfx: 'sniper', priority: 4,
  },
  eflame: {
    name: 'Flamethrower', hp: 143, speed: 42, range: 86, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 4,
    color: '#4a4438', gun: 8, sfx: 'rifle', priority: 3,
    flame: { range: 86, arc: 0.45, dps: 42 },
    blastResist: 0.5,
  },
  emortar: {
    name: 'Granatwerfer', hp: 99, speed: 42, range: 97, dmg: 9, acc: 0.52,
    rof: 0.9, burst: 1, burstGap: 0, reward: 5,
    color: '#504e44', gun: 5, sfx: 'pistol', priority: 3,
    mortar: { range: 383, min: 106, cdMin: 8.1, cdMax: 10.8, r: 44, dmg: 83, flight: 1.4, scatter: 47 },
  },
  ebazooka: {
    name: 'Panzerfaust', hp: 99, speed: 44, range: 88, dmg: 9, acc: 0.5,
    rof: 0.9, burst: 1, burstGap: 0, reward: 5,
    color: '#545648', gun: 5, sfx: 'pistol', priority: 4,
    rocket: { range: 267, cdMin: 6.7, cdMax: 9.1, r: 33, dmg: 132, speed: 380, armorMult: 3.0 },
  },
  ebike: {
    name: 'Kradschützen', hp: 88, speed: 94, range: 0, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 5,
    color: '#55554a', gun: 0, sfx: 'rifle', priority: 2, bike: true,
  },
  ejeep: {
    name: 'Kübelwagen', hp: 275, speed: 121, range: 221, dmg: 14, acc: 0.46,
    rof: 1.89, burst: 18, burstGap: 0.06, reward: 8,
    color: '#57574a', gun: 14, sfx: 'hmg', priority: 3, vehicle: true,
  },
  ehalftrack: {
    name: 'Sd.Kfz. 251', hp: 1100, speed: 33, range: 177, dmg: 8, acc: 0.42,
    rof: 2.0, burst: 7, burstGap: 0.07, reward: 12,
    color: '#54544a', gun: 16, sfx: 'mg', priority: 3, vehicle: true, apc: true,
  },
  panzer: {
    name: 'Panzer IV', hp: 1320, speed: 9, range: 251, dmg: 0, acc: 0,
    rof: 4.05, burst: 1, burstGap: 0, reward: 15, shellDmg: 94,
    color: '#57574e', gun: 0, sfx: 'boom', priority: 0, tank: true,
    fireCone: { arc: 0.25 },
    mg: { range: 169, dmg: 8, acc: 0.44, burst: 7, burstGap: 0.08, gun: 24, sfx: 'mg' },
  },
  estug: {
    name: 'StuG III', hp: 880, speed: 13, range: 221, dmg: 0, acc: 0,
    rof: 3.42, burst: 1, burstGap: 0, reward: 12, shellDmg: 105,
    color: '#4a4a42', gun: 0, sfx: 'boom', priority: 0, tank: true, casemate: true,
    fireCone: { arc: 0.2 },
    mg: { range: 147, dmg: 7, acc: 0.42, burst: 4, burstGap: 0.08, gun: 20, sfx: 'mg' },
  },
  etiger: {
    name: 'Tiger I', hp: 1980, speed: 6, range: 265, dmg: 0, acc: 0,
    rof: 4.68, burst: 1, burstGap: 0, reward: 22, shellDmg: 121,
    color: '#3f3f38', gun: 0, sfx: 'boom', priority: 0, tank: true, heavy: true,
    fireCone: { arc: 0.22 },
    mg: { range: 177, dmg: 9, acc: 0.46, burst: 7, burstGap: 0.08, gun: 26, sfx: 'mg' },
  },
  // A20 "V2" battery — a rear-echelon siege weapon, not a soldier. It stakes
  // itself out near the top of the field the instant it spawns and mostly
  // holds position, but pushes forward on the same discipline-break urge as
  // any German infantry; the counter is to reach out and kill it (AT gun,
  // artillery, a bazooka that gets lucky) before its next launch window
  // comes up.
  ev2: {
    name: 'V2 Rocket Battery', hp: 590, speed: 20, range: 0, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 60,
    color: '#42463c', gun: 0, sfx: 'boom', priority: 5, fixed: true,
    // +10% pass over its old numbers: dmg (105) now edges just past a rifleman's
    // 100 hp, so a near-direct hit is lethal to fresh infantry rather than merely
    // maiming. The r still levels a cluster without wiping a whole line, and
    // armorMult makes it brutal against anything on wheels or tracks.
    v2: { range: W * 0.625, min: 151, cdMin: 19, cdMax: 27, r: 72, dmg: 105, flight: 3.1, scatter: 63, armorMult: 6.6 },
  },
};

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
};

const EVENT_INFO = [
  {
    key: 'fog',
    name: 'Fog Rolls In',
    wave: 3,
    desc: 'Battlefield visibility drops. Your men and the enemy fight blind until the fog lifts.',
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
      desc: 'Springfield scoped rifle. Picks officers, snipers, and gunners first. Rank: faster, straighter, harder.' },
    { key: 'medic', label: 'MEDIC', cost: 12, kind: 'unit', hotkey: '5',
      desc: 'Unarmed. Heals the most wounded nearby soldier. Faster with rank. Snipers hunt him. Can\'t repair vehicles or fortifications.' },
    { key: 'engineer', label: 'ENGINEER', cost: 14, kind: 'unit', hotkey: 'E',
      desc: 'Repairs and upgrades fortifications. Slowly patches vehicles and AT guns. SMG close range. Rank: faster repairs, extended range.' },
    { key: 'officer', label: 'OFFICER', cost: 15, kind: 'unit', hotkey: '6',
      desc: 'Sidearm. Aura boosts nearby soldiers\' fire. Bonus grows with rank. Earns bonus TP. Snipers hunt him.' },
    { key: 'flamer', label: 'FLAMER', cost: 7, kind: 'unit', hotkey: 'F',
      desc: 'M2 flamethrower. Burns everything in the cone — friend and foe. Rank: more burn damage, tighter stream.' },
    { key: 'jeep', label: 'JEEP', cost: 30, kind: 'unit', hotkey: 'J',
      desc: 'Willys jeep, .50 cal HMG, fires on the move. Unarmored. Engineer patches slowly. Rank: faster, deadlier.' },
    { key: 'sherman', label: 'SHERMAN', cost: 60, kind: 'unit', hotkey: 'T',
      desc: 'M4 Sherman. 75mm turret cannon. Shrugs off small arms. Engineer repairs slowly. Rank: sharper aim, faster reloads.' },
    { key: 'atgun', label: 'AT GUN', cost: 20, kind: 'unit', hotkey: 'P',
      desc: '57mm AT gun. Immobile; fires only at vehicles in its cone. Engineer repairs slowly. Rank: wider arc, faster reloads, more damage.' },
    { key: 'aagun', label: 'AA GUN', cost: 20, kind: 'unit', hotkey: 'V',
      desc: '40mm Bofors flak gun. Immobile; anti-air only. Shoots bombers and paratroopers. Engineer repairs slowly. Rank: wider arc, faster reloads, tighter aim.' },
  { key: 'wire', label: 'WIRE', cost: 3, kind: 'defense', hotkey: '7',
    desc: 'Barbed wire. Slows the German advance until it wears out.' },
  { key: 'sandbags', label: 'SANDBAGS', cost: 4, kind: 'defense', hotkey: '8',
    desc: 'Cover. Soldiers behind it dodge half of incoming fire.' },
  { key: 'bunker', label: 'BUNKER', cost: 15, kind: 'defense', hotkey: 'K',
    desc: 'Concrete pillbox. Soldiers inside dodge 75% of incoming fire. Shrugs off shellfire.' },
  { key: 'watchtower', label: 'WATCH TOWER', cost: 10, kind: 'defense', hotkey: 'W',
    desc: 'Wooden lookout. +25% range for nearby soldiers (+35% fortified). Mortars ignore it. Frail.' },
  { key: 'camonest', label: 'CAMO NEST', cost: 6, kind: 'defense', hotkey: 'C',
    desc: 'Concealed position. Hidden until firing; exposed 4 s after last shot (2 s fortified). No dodge bonus. Weak to explosives.' },
  { key: 'mine', label: 'MINEFIELD', cost: 6, kind: 'defense', hotkey: '9',
    desc: 'Cluster of 3 anti-personnel mines. Hurts tanks too. Germans can\'t see them.' },
  { key: 'mortar', label: 'MORTAR STRIKE', cost: 5, kind: 'support', hotkey: '0',
    desc: '6 mortar shells on target. DANGER CLOSE — friendly fire is real.' },
  { key: 'artillery', label: 'ARTILLERY STRIKE', cost: 12, kind: 'support', hotkey: 'A',
    desc: '105mm barrage: 16 heavy shells, wide spread. Devastating. Indiscriminate.' },
];

// axis campaign toolbar: you buy German units, drop them in the top strip,
// and their standard attack AI carries them south. kind 'eunit' routes
// placement through makeEnemy instead of makeUnit.
// costs mirror the closest allied PLACEABLES counterpart (rifleman, gunner,
// grenadier, shotgunner, sniper, flamer, officer, jeep, sherman, artillery).
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

// endless testing mode: the same German roster as the axis toolbar, but
// dropped in freely anywhere on the field (kind 'egerman') instead of being
// confined to the axis campaign's top deploy strip. No hotkeys — this list
// is merged onto the endless toolbar alongside PLACEABLES, and reusing
// those hotkeys would just shadow the US units that already claim them.
const TESTING_GERMAN_PLACEABLES = [
  ...AXIS_PLACEABLES.filter(p => p.kind === 'eunit').map(p => ({ ...p, kind: 'egerman', hotkey: '' })),
  // ev2 never appears on the axis campaign roster — it's an endless-only
  // set piece that otherwise doesn't show up until wave 140. Testing mode
  // is exactly where you'd want to drop one in on demand.
  { key: 'ev2', label: 'V2 BATTERY', cost: 100, kind: 'egerman', hotkey: '',
    desc: 'A20 rocket battery. Normally locked behind wave 140 in endless — testing mode lets you place one immediately.' },
];

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
  { key: 'fng', label: 'FNG', cost: 0, kind: 'event', hotkey: '',
    desc: 'A replacement rifleman reports to the back line.' },
  { key: 'paradrop', label: 'PARADROP', cost: 0, kind: 'event', hotkey: '',
    desc: 'Fallschirmjäger drop into the field. Stick size scales with the current wave.' },
  { key: 'airraid', label: 'AIR RAID', cost: 0, kind: 'event', hotkey: '',
    desc: 'German bombers cross the field north to south. Formation and payload scale with the current wave.' },
  { key: 'airstrike', label: 'STRAFING RUN', cost: 0, kind: 'event', hotkey: '',
    desc: 'A P-47 strafes a lane of the field.' },
];

// allied assault toolbar: US attackers deploy in the top strip, then assault south.
const ASSAULT_PLACEABLES = [
  { key: 'rifleman', label: 'RIFLEMAN', cost: 3, kind: 'aunit', hotkey: '1',
    desc: 'M1 Garand rifleman. The backbone of the assault.' },
  { key: 'gunner', label: 'GUNNER', cost: 9, kind: 'aunit', hotkey: '2',
    desc: 'BAR gunner. Suppressive fire on the advance.' },
  { key: 'grenadier', label: 'GRENADIER', cost: 7, kind: 'aunit', hotkey: '3',
    desc: 'Carbine and frag grenades. Clears bunkers and wire. Throws back live German grenades that land nearby.' },
  { key: 'shotgunner', label: 'SHOTGUN', cost: 5, kind: 'aunit', hotkey: 'G',
    desc: 'Trench gun for close work on the beach and in the bocage.' },
  { key: 'bazooka', label: 'BAZOOKA', cost: 12, kind: 'aunit', hotkey: 'B',
    desc: 'M1A1 rocket launcher. The answer to bunkers and armor.' },
  { key: 'sniper', label: 'SNIPER', cost: 10, kind: 'aunit', hotkey: '4',
    desc: 'Springfield marksman. Picks off MG teams and officers.' },
  { key: 'flamer', label: 'FLAMER', cost: 7, kind: 'aunit', hotkey: 'F',
    desc: 'M2 flamethrower. Burns out pillboxes and hedgerows.' },
  { key: 'officer', label: 'OFFICER', cost: 15, kind: 'aunit', hotkey: '6',
    desc: 'Lieutenant. Nearby men fight harder; earns +1 TP every 30 s.' },
  { key: 'jeep', label: 'JEEP', cost: 30, kind: 'aunit', hotkey: 'J',
    desc: 'Willys jeep with a .50 cal. Fast breakthrough vehicle.' },
  { key: 'sherman', label: 'SHERMAN', cost: 80, kind: 'aunit', hotkey: 'T',
    desc: 'M4 Sherman. Breaks the West Wall and German armor.' },
  { key: 'mortar', label: 'MORTAR STRIKE', cost: 5, kind: 'support', hotkey: '0',
    desc: '6 mortar shells on target. Danger close — watch your own men.' },
  { key: 'artillery', label: 'ARTILLERY STRIKE', cost: 12, kind: 'support', hotkey: 'A',
    desc: '105mm barrage: 16 heavy shells. Indiscriminate.' },
];

// D-Day landing craft layout
const BEACH_Y = 210;
const LANDING_CRAFT_SPEED = 38;
const LANDING_CRAFT_SHORE_Y = BEACH_Y + 18;

// campaign-exclusive axis units — merged into research tree when tier gate met
const AXIS_CAMPAIGN_EXTRA_ENTRIES = {
  eparadrop: { key: 'eparadrop', label: 'PARADROP', cost: 7, kind: 'eparadrop', hotkey: 'P',
    desc: 'Paradrop behind the US line. Unit type is random on landing from your researched infantry.' },
  estug: { key: 'estug', label: 'STU G III', cost: 55, kind: 'eunit', hotkey: 'S',
    desc: 'StuG III assault gun. Faster than a Panzer IV; casemate 75mm hunts strongpoints.' },
  etiger: { key: 'etiger', label: 'TIGER I', cost: 120, kind: 'eunit', hotkey: 'G',
    desc: 'Tiger I heavy tank. Slow, armored, and ruinous — the breakthrough weapon.' },
};

const AXIS_STARTER_UNITS = ['erifle', 'esmg', 'egren'];

const AXIS_RESEARCH_COSTS = {
  emg: 15, eflame: 12, esniper: 18, emortar: 22, ebazooka: 20, eoff: 28,
  ebike: 35, ejeep: 38, ebarrage: 30, ehalftrack: 55, panzer: 60,
  eparadrop: 25, estug: 45, etiger: 90,
};

const AXIS_RESEARCH_TIERS = { eparadrop: 3, estug: 6, etiger: 13 };

const AXIS_RESEARCH_LABELS = {
  erifle: 'Rifleman', esmg: 'Stormtrooper', egren: 'Grenadier', emg: 'MG42 Team',
  esniper: 'Sniper', eflame: 'Flammenwerfer', eoff: 'Officer', emortar: 'Granatwerfer',
  ebazooka: 'Panzerfaust', ebike: 'Kradschützen', ejeep: 'Kübelwagen',
  ehalftrack: 'Halftrack', panzer: 'Panzer IV', ebarrage: 'Artillery Barrage',
  eparadrop: 'Paradrop', estug: 'StuG III', etiger: 'Tiger I',
};
