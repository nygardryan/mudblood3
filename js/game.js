/* Mud & Blood — HTML5 remake of the classic Flash squad-defense game.
   Vanilla JS + Canvas. No build step, no assets. */
'use strict';

// ============================================================ constants

const W = 900, H = 620;
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
const OFFICER_AURA = 130;
const WATCHTOWER_AURA = 30;
const WATCHTOWER_RANGE_MULT = 1.25;
const WATCHTOWER_RANGE_MULT_UPGRADED = 1.35;
const CAMONEST_ZONE = 36;               // same footprint as a bunker's cover radius
const CAMONEST_REVEAL = 4;              // seconds targetable after a shot, unfortified
const CAMONEST_REVEAL_FORTIFIED = 2;
const CAMONEST_EXPLOSIVE_MULT = 1.2;    // weak to explosives — no reduction like a bunker's concrete
const GRENADE_CATCH_RANGE = 34;         // how close a grenadier must be to a landed enemy grenade to heave it back
const V2_ROCKET_ARC = 90;               // peak height of the V2 warhead's visible flight arc

const UNIT_TYPES = {
  rifleman: {
    name: 'Rifleman', hp: 100, range: 230, dmg: 13, acc: 0.55,
    rof: 0.88, burst: 1, burstGap: 0, speed: 42,
    color: '#4a5d3a', gun: 7, sfx: 'rifle',
    desc: 'M1 Garand. The backbone of your line.',
  },
  gunner: {
    name: 'Gunner', hp: 100, range: 267, dmg: 9, acc: 0.32,
    rof: 1.36, burst: 6, burstGap: 0.09, speed: 36,
    color: '#3d5236', gun: 10, sfx: 'mg',
    desc: 'BAR automatic rifle. Suppressive bursts.',
  },
  grenadier: {
    // 50% more gun range than the rifleman (230): the better all-rounder
    name: 'Grenadier', hp: 100, range: 345, dmg: 10, acc: 0.55,
    rof: 1.2, burst: 1, burstGap: 0, speed: 42,
    color: '#44583c', gun: 6, sfx: 'rifle', grenade: true,
    desc: 'Carbine most of the time; a heavy frag now and then. Quick enough to catch a live German grenade and heave it back.',
  },
  shotgunner: {
    name: 'Shotgunner', hp: 145, range: 0, dmg: 0, acc: 0,
    rof: 1.5, burst: 1, burstGap: 0, speed: 34,
    color: '#424f38', gun: 9, sfx: 'shotgun',
    shotgun: { range: 143, arc: 0.52, pellets: 8, dmg: 11, spread: 0.45 },
    desc: 'M97 trench gun and steel plate. Buckshot shreds clusters up close.',
  },
  bazooka: {
    name: 'Bazooka', hp: 90, range: 120, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, speed: 40,
    color: '#3f5138', gun: 5, sfx: 'pistol',
    rocket: { range: 363, cdMin: 7.4, cdMax: 10.1, r: 30, dmg: 120, speed: 380, armorMult: 2.75 },
    desc: 'M1A1 rocket launcher. The answer to armor.',
  },
  mortarman: {
    name: 'Mortarman', hp: 90, range: 120, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, speed: 38,
    color: '#4c5a3f', gun: 5, sfx: 'pistol',
    mortar: { range: 520, min: 220, cdMin: 11, cdMax: 15, r: 40, dmg: 75, flight: 1.6, scatter: 52 },
    desc: 'Portable 60mm mortar. Indirect fire at range.',
  },
  sniper: {
    name: 'Sniper', hp: 85, range: 372, dmg: 46, acc: 0.72,
    rof: 5.2, burst: 1, burstGap: 0, speed: 38,
    color: '#38442e', gun: 12, sfx: 'sniper',
    desc: 'Springfield scoped rifle. Picks off officers and MGs first.',
  },
  medic: {
    name: 'Medic', hp: 90, range: 140, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, speed: 46,
    color: '#60744f', gun: 5, sfx: 'pistol',
    desc: 'Patches up the most wounded man in range, faster with rank. Carries a sidearm.',
  },
  engineer: {
    name: 'Engineer', hp: 95, range: 110, dmg: 7, acc: 0.45,
    rof: 1.1, burst: 4, burstGap: 0.07, speed: 44,
    color: '#51603e', gun: 6, sfx: 'mg',
    desc: 'Repairs fortifications, upgrades emplacements, and can wrench on damaged vehicles and AT guns (very slowly). M3 grease gun up close.',
  },
  officer: {
    name: 'Officer', hp: 95, range: 150, dmg: 9, acc: 0.5,
    rof: 0.9, burst: 1, burstGap: 0, speed: 44,
    color: '#6b6d44', gun: 5, sfx: 'pistol',
    desc: 'Nearby men fire faster and straighter, more so as he ranks up. Earns +1 TP / 30 s.',
  },
  flamer: {
    name: 'Flamethrower', hp: 130, range: 117, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, speed: 38,
    color: '#4f5c3a', gun: 8, sfx: 'rifle',
    flame: { range: 117, arc: 0.45, dps: 38 },
    blastResist: 0.5, rankHealMult: 3,
    desc: 'M2 flamethrower and flak vest. Burns everything in the cone — friend or foe.',
  },
  jeep: {
    name: 'Jeep', hp: 250, range: 300, dmg: 13, acc: 0.42,
    rof: 2.1, burst: 16, burstGap: 0.07, speed: 110,
    color: '#4a5a3f', gun: 14, sfx: 'hmg', vehicle: true, rankMult: 3,
    desc: 'Willys jeep, pintle-mounted .50 cal. Fast and hard-hitting, but unarmored.',
  },
  sherman: {
    name: 'Sherman', hp: 1000, range: 340, dmg: 0, acc: 0,
    rof: 4.0, burst: 1, burstGap: 0, speed: 14, shellDmg: 80,
    color: '#4a5a3f', gun: 0, sfx: 'boom', tank: true,
    fireCone: { arc: 0.275 },
    mg: { range: 240, dmg: 8, acc: 0.45, burst: 6, burstGap: 0.08, gun: 24, sfx: 'mg' },
    desc: 'M4 Sherman. 75mm cannon on a rotating turret and thick armor. Medics can\'t fix steel.',
  },
  atgun: {
    // trails are staked into the ground: it traverses inside its cone but never moves
    name: 'AT Gun', hp: 200, range: 918, dmg: 0, acc: 0,
    rof: 8, burst: 1, burstGap: 0, speed: 0,
    color: '#4a5a3f', gun: 0, sfx: 'boom', fixed: true,
    atgun: { arc: 0.6, shellDmg: 403, r: 27, scatterMult: 1.3 },
    desc: '57mm anti-tank gun. Immobile; direct-fire AP shells ruin any vehicle they find.',
  },
};

// TP paid to an Axis attacker for destroying each US defender (mirrors ENEMY_TYPES.reward)
{
  const UNIT_REWARDS = {
    rifleman: 2, gunner: 3, grenadier: 3, shotgunner: 3, bazooka: 4,
    mortarman: 5, sniper: 4, medic: 4, engineer: 4, officer: 5,
    flamer: 4, jeep: 6, sherman: 15, atgun: 8,
  };
  for (const [k, r] of Object.entries(UNIT_REWARDS)) UNIT_TYPES[k].reward = r;
}

const ENEMY_TYPES = {
  erifle: {
    name: 'Rifleman', hp: 60, speed: 22, range: 210, dmg: 10, acc: 0.42,
    rof: 1.5, burst: 1, burstGap: 0, reward: 2,
    color: '#5e5e52', gun: 7, sfx: 'rifle', priority: 1,
  },
  esmg: {
    name: 'Stormtrooper', hp: 70, speed: 36, range: 130, dmg: 7, acc: 0.42,
    rof: 1.0, burst: 3, burstGap: 0.08, reward: 2,
    color: '#46443a', gun: 6, sfx: 'mg', priority: 1,
  },
  egren: {
    name: 'Grenadier', hp: 70, speed: 27, range: 150, dmg: 8, acc: 0.385,
    rof: 1.6, burst: 1, burstGap: 0, reward: 3,
    color: '#524e3e', gun: 5, sfx: 'pistol', priority: 2, grenade: true,
  },
  emg: {
    name: 'MG Gunner', hp: 90, speed: 16, range: 275, dmg: 8, acc: 0.33,
    rof: 1.9, burst: 5, burstGap: 0.08, reward: 3,
    color: '#484640', gun: 10, sfx: 'mg', priority: 3,
  },
  eoff: {
    name: 'Officer', hp: 80, speed: 24, range: 140, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, reward: 4,
    color: '#4a4840', gun: 5, sfx: 'pistol', priority: 5, aura: true,
  },
  esniper: {
    name: 'Sniper', hp: 55, speed: 14, range: 312, dmg: 39, acc: 0.66,
    rof: 6.8, burst: 1, burstGap: 0, reward: 4,
    color: '#464438', gun: 12, sfx: 'sniper', priority: 4,
  },
  eflame: {
    name: 'Flamethrower', hp: 85, speed: 34, range: 120, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 4,
    color: '#4a4438', gun: 8, sfx: 'rifle', priority: 3,
    flame: { range: 120, arc: 0.45, dps: 34 },
    blastResist: 0.5,
  },
  emortar: {
    name: 'Granatwerfer', hp: 75, speed: 18, range: 120, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, reward: 5,
    color: '#504e44', gun: 5, sfx: 'pistol', priority: 3,
    mortar: { range: 520, min: 220, cdMin: 11, cdMax: 15, r: 40, dmg: 75, flight: 1.6, scatter: 52 },
  },
  ebazooka: {
    name: 'Panzerfaust', hp: 75, speed: 20, range: 120, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, reward: 5,
    color: '#545648', gun: 5, sfx: 'pistol', priority: 4,
    rocket: { range: 308, cdMin: 7.4, cdMax: 10.1, r: 30, dmg: 120, speed: 380, armorMult: 2.75 },
  },
  ebike: {
    name: 'Kradschützen', hp: 80, speed: 85, range: 0, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 5,
    color: '#55554a', gun: 0, sfx: 'rifle', priority: 2, bike: true,
  },
  ejeep: {
    name: 'Kübelwagen', hp: 220, speed: 45, range: 280, dmg: 11, acc: 0.38,
    rof: 2.3, burst: 8, burstGap: 0.07, reward: 8,
    color: '#57574a', gun: 14, sfx: 'hmg', priority: 3, vehicle: true,
  },
  ehalftrack: {
    name: 'Sd.Kfz. 251', hp: 1000, speed: 30, range: 240, dmg: 7, acc: 0.38,
    rof: 2.2, burst: 6, burstGap: 0.08, reward: 12,
    color: '#54544a', gun: 16, sfx: 'mg', priority: 3, vehicle: true, apc: true,
  },
  panzer: {
    name: 'Panzer IV', hp: 1200, speed: 8, range: 340, dmg: 0, acc: 0,
    rof: 4.5, burst: 1, burstGap: 0, reward: 15, shellDmg: 85,
    color: '#57574e', gun: 0, sfx: 'boom', priority: 0, tank: true,
    fireCone: { arc: 0.25 },
    mg: { range: 230, dmg: 7, acc: 0.4, burst: 6, burstGap: 0.08, gun: 24, sfx: 'mg' },
  },
  estug: {
    name: 'StuG III', hp: 800, speed: 12, range: 300, dmg: 0, acc: 0,
    rof: 3.8, burst: 1, burstGap: 0, reward: 12, shellDmg: 95,
    color: '#4a4a42', gun: 0, sfx: 'boom', priority: 0, tank: true, casemate: true,
    fireCone: { arc: 0.2 },
    mg: { range: 200, dmg: 6, acc: 0.38, burst: 4, burstGap: 0.08, gun: 20, sfx: 'mg' },
  },
  etiger: {
    name: 'Tiger I', hp: 1800, speed: 5, range: 360, dmg: 0, acc: 0,
    rof: 5.2, burst: 1, burstGap: 0, reward: 22, shellDmg: 110,
    color: '#3f3f38', gun: 0, sfx: 'boom', priority: 0, tank: true, heavy: true,
    fireCone: { arc: 0.22 },
    mg: { range: 240, dmg: 8, acc: 0.42, burst: 6, burstGap: 0.08, gun: 26, sfx: 'mg' },
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
    color: '#42463c', gun: 0, sfx: 'boom', priority: 5, fixed: true,
    // r halved from its original 130 — still levels anything close, but no
    // longer wipes out a whole line at once. dmg is 95% of a rifleman's 100
    // hp, so a near-direct hit maims rather than instantly kills, and
    // armorMult makes it brutal against anything on wheels or tracks.
    v2: { range: W * 0.75, min: 250, cdMin: 21, cdMax: 30, r: 65, dmg: 95, flight: 3.4, scatter: 70, armorMult: 6 },
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
    key: 'barrage',
    name: 'Enemy Barrage',
    wave: 4,
    desc: 'German artillery shells your sector. Shell count, blast radius, and damage escalate with each wave tier.',
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
    desc: 'Every 10th wave the Germans commit to a set-piece attack: a motorcycle blitz, a mass paradrop, a human wave, an armor column, or an assault under fog. The themes rotate, and each one returns bigger and meaner the next time around.',
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
    desc: 'Carbine rifleman who also lobs a frag grenade every 11-16 s (the blast can hit your own men) and can catch a live enemy grenade and throw it back. Ranking up means more frequent, more accurate, and harder-hitting grenades.' },
  { key: 'shotgunner', label: 'SHOTGUN', cost: 5, kind: 'unit', hotkey: 'G',
    desc: 'M97 trench gun and body armor. High HP; each blast can hit every enemy in the cone. Ranking up tightens his spread and extends his range faster than most units.' },
  { key: 'bazooka', label: 'BAZOOKA', cost: 12, kind: 'unit', hotkey: 'B',
    desc: 'M1A1 rocket launcher. Wildly inaccurate at range, and the splash can hurt nearby friendlies, but armor makes an easy target. Ranking up means faster reloads and tighter, harder-hitting rockets.' },
  { key: 'mortarman', label: 'MORTARMAN', cost: 14, kind: 'unit', hotkey: 'M',
    desc: 'Portable 60mm mortar. Long-range indirect fire; can\'t hit anything close. Ranking up means faster reloads and tighter, harder-hitting shells.' },
  { key: 'sniper', label: 'SNIPER', cost: 10, kind: 'unit', hotkey: '4',
    desc: 'Springfield scoped rifle. Sees the whole field and picks off officers, snipers, and gunners first. Ranking up makes him shoot faster, straighter, and harder.' },
  { key: 'medic', label: 'MEDIC', cost: 12, kind: 'unit', hotkey: '5',
    desc: 'Sidearm only, no real firepower. Automatically treats the most wounded soldier nearby, and heals faster with every rank. Can\'t patch vehicles, guns, or fortifications, and enemy snipers hunt him first.' },
  { key: 'engineer', label: 'ENGINEER', cost: 14, kind: 'unit', hotkey: 'E',
    desc: 'Repairs damaged fortifications and upgrades them to better stats, and can slowly patch up damaged jeeps, Shermans, and AT guns. SMG for close range only. Ranking up speeds up all his repair work and extends his own range faster than most units.' },
  { key: 'officer', label: 'OFFICER', cost: 15, kind: 'unit', hotkey: '6',
    desc: 'Sidearm only. His aura makes nearby soldiers shoot faster and straighter, and that bonus grows stronger with his own rank. Also earns bonus TP over time — up to 3x more once he reaches top rank. A high-value target enemy snipers will go after first.' },
  { key: 'flamer', label: 'FLAMER', cost: 7, kind: 'unit', hotkey: 'F',
    desc: 'M2 flamethrower and flak vest. Burns everything in the cone — friend and foe alike. Ranking up sharply raises burn damage and tightens his stream, and extends his range faster than most units.' },
  { key: 'jeep', label: 'JEEP', cost: 30, kind: 'unit', hotkey: 'J',
    desc: 'Willys jeep with a .50 cal HMG, firing on the move. Unarmored — medics can\'t touch it, but an engineer can patch it, slowly. Ranking up makes him faster and deadlier, though he needs more kills per promotion than the infantry.' },
  { key: 'sherman', label: 'SHERMAN', cost: 80, kind: 'unit', hotkey: 'T',
    desc: 'M4 Sherman tank. 75mm HE cannon on a rotating turret; shrugs off small arms. Medics cannot repair it, but an engineer can, slowly. Ranking up takes many kills, but sharpens his aim and speeds up reloads on both the cannon and the coaxial MG.' },
  { key: 'atgun', label: 'AT GUN', cost: 40, kind: 'unit', hotkey: 'P',
    desc: '57mm anti-tank gun. Cannot move; only engages vehicles inside its firing cone. AP shells wreck armor. An engineer can patch it, slowly. Ranking up widens its firing arc, speeds up reloads, and hits harder.' },
  { key: 'wire', label: 'WIRE', cost: 4, kind: 'defense', hotkey: '7',
    desc: 'Barbed wire. Slows the German advance until it wears out.' },
  { key: 'sandbags', label: 'SANDBAGS', cost: 5, kind: 'defense', hotkey: '8',
    desc: 'Cover. Soldiers behind it dodge half of incoming fire.' },
  { key: 'bunker', label: 'BUNKER', cost: 15, kind: 'defense', hotkey: 'K',
    desc: 'Concrete pillbox. Soldiers inside dodge 75% of incoming fire. Shrugs off shellfire.' },
  { key: 'watchtower', label: 'WATCH TOWER', cost: 12, kind: 'defense', hotkey: 'W',
    desc: 'Wooden lookout post. Extends the range of nearby soldiers by 25%, or 35% once an engineer fortifies it. Mortars ignore it — they already fire blind. Frail; falls fast under fire.' },
  { key: 'camonest', label: 'CAMO NEST', cost: 8, kind: 'defense', hotkey: 'C',
    desc: 'Concealed position, same footprint as a bunker. Soldiers inside stay hidden until they fire, then stay exposed for 4 s after their last shot — just 2 s once an engineer fortifies it, which also doubles its HP. No dodge bonus, and weak to explosives: 2 grenades will crack it open.' },
  { key: 'mine', label: 'MINEFIELD', cost: 6, kind: 'defense', hotkey: '9',
    desc: 'Cluster of 3 anti-personnel mines. Hurts tanks too. Germans can\'t see them.' },
  { key: 'mortar', label: 'MORTAR STRIKE', cost: 8, kind: 'support', hotkey: '0',
    desc: '6 mortar shells on target. DANGER CLOSE — friendly fire is real.' },
  { key: 'artillery', label: 'ARTILLERY STRIKE', cost: 16, kind: 'support', hotkey: 'A',
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
    desc: '81mm mortar team. Long-range indirect fire; blind inside 220 px.' },
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
  { key: 'mortar', label: 'MORTAR STRIKE', cost: 8, kind: 'support', hotkey: '0',
    desc: '6 mortar shells on target. Danger close — watch your own men.' },
  { key: 'artillery', label: 'ARTILLERY STRIKE', cost: 16, kind: 'support', hotkey: 'A',
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

// ============================================================ levels
// every mode is a level. endless is the classic open-ended defense; campaign
// levels script their own forces, waves and win conditions.

const ENDLESS_DIFFICULTIES = {
  sandbox: { id: 'sandbox', name: 'SANDBOX', incomeMult: 1, sandbox: true,
    desc: 'Unlimited TP. Experiment with any loadout.' },
  testing: { id: 'testing', name: 'TESTING', incomeMult: 1, sandbox: true, testing: true,
    desc: 'Unlimited TP. No Germans spawn on their own — build them yourself with the GERMANS button.' },
  easy: { id: 'easy', name: 'EASY', incomeMult: 1, sandbox: false,
    desc: 'Full supply rate. The classic experience.' },
  medium: { id: 'medium', name: 'MEDIUM', incomeMult: 0.66, sandbox: false,
    desc: '66% income. Tighter logistics.' },
  hard: { id: 'hard', name: 'HARD', incomeMult: 0.33, sandbox: false,
    desc: '33% income. Every TP counts.' },
};

// axis campaign: each build phase hands you a fresh, growing pile of TP.
// wave 1 pays `wavePayout`; every wave after that adds `wavePayoutStep` more,
// so a level's final assault always has the biggest budget. Unused TP never
// carries over — spend it or lose it.
const AXIS_TP_MULT = 1.50;
function axisWavePayout(level, wave) {
  const base = level.wavePayout + (level.wavePayoutStep || 0) * (wave - 1);
  return Math.round(base * AXIS_TP_MULT);
}

// US defender placement helpers for the Axis campaign setups (hoisted).
const SANDBAG_HP = 660;
const BUNKER_HP = 2040;
const WATCHTOWER_HP = 500;
const CAMONEST_HP = 140;
function usBag(G, x, y, hp = SANDBAG_HP)    { G.sandbags.push({ x, y, hp, maxhp: hp, up: false, workProg: 0 }); }
function usBunker(G, x, y, hp = BUNKER_HP){ G.bunkers.push({ x, y, hp, maxhp: hp, up: false, workProg: 0 }); }
function usWire(G, x, y, hp = 3750)  { G.wires.push({ x, y, hp, maxhp: hp, up: false, workProg: 0 }); }
function usMine(G, x, y)             { G.mines.push({ x, y, dead: false }); }
function usMan(G, type, x, y)        { G.units.push(makeUnit(type, x, y)); }
function usRow(G, type, y, xs)       { for (const x of xs) G.units.push(makeUnit(type, x, y)); }

// map US setup keys to German defender types for allied assault levels
const DE_DEFENDER_TYPES = {
  rifleman: 'erifle', gunner: 'emg', grenadier: 'egren', sniper: 'esniper',
  officer: 'eoff', flamer: 'eflame', mortarman: 'emortar', bazooka: 'ebazooka',
  sherman: 'panzer', jeep: 'ejeep', shotgunner: 'esmg',
};
function deMan(G, type, x, y) {
  const deType = DE_DEFENDER_TYPES[type] || type;
  if (!ENEMY_TYPES[deType]) return;
  G.units.push(makeDefender('de', deType, x, y));
}
function deRow(G, type, y, xs) {
  for (const x of xs) deMan(G, type, x, y);
}
function deFlankPicket(G, strength = 1) {
  const y = 428;
  for (const left of [true, false]) {
    const edge = left ? 90 : W - 90;
    const mid = left ? 165 : W - 165;
    const far = left ? 55 : W - 55;
    usBag(G, edge, y - 7);
    deMan(G, 'rifleman', edge, y);
    if (strength >= 2) {
      usWire(G, left ? 115 : W - 115, DEPLOY_Y - 42);
      deMan(G, 'rifleman', mid, y + 10);
      usBag(G, mid, y + 3);
    }
    if (strength >= 3) {
      usWire(G, left ? 75 : W - 75, DEPLOY_Y - 48);
      deMan(G, 'gunner', left ? 130 : W - 130, y + 38);
      deMan(G, 'rifleman', far, y - 5);
      usMine(G, left ? 100 : W - 100, H / 2 + 18);
    }
  }
}
// flank pickets — strength 1–3 scales from a lone sentry to wired gun teams
function usFlankPicket(G, strength = 1) {
  const y = 428;
  for (const left of [true, false]) {
    const edge = left ? 90 : W - 90;
    const mid = left ? 165 : W - 165;
    const far = left ? 55 : W - 55;
    usBag(G, edge, y - 7);
    usMan(G, 'rifleman', edge, y);
    if (strength >= 2) {
      usWire(G, left ? 115 : W - 115, DEPLOY_Y - 42);
      usMan(G, 'rifleman', mid, y + 10);
      usBag(G, mid, y + 3);
    }
    if (strength >= 3) {
      usWire(G, left ? 75 : W - 75, DEPLOY_Y - 48);
      usMan(G, 'gunner', left ? 130 : W - 130, y + 38);
      usMan(G, 'rifleman', far, y - 5);
      usMine(G, left ? 100 : W - 100, H / 2 + 18);
    }
  }
}

const LEVELS = {
  endless: {
    id: 'endless',
    name: 'ENDLESS',
    mode: 'endless',
    breachLimit: MAX_BREACH,
    events: true,
    placeables: PLACEABLES,
    startTP: 25,
    setup(G) {
      // you start with two riflemen already dug in
      G.units.push(makeUnit('rifleman', W / 2 - 70, 470));
      G.units.push(makeUnit('rifleman', W / 2 + 70, 470));
    },
  },

  // ---- Allied campaign: US assaults across Western Europe, then a defense finale.
  allied_dday: {
    id: 'allied_dday',
    name: 'ALLIED 1: OMAHA BEACH',
    menuName: 'LEVEL 1 — OMAHA BEACH',
    menuDesc: 'June 6, 1944. Load Higgins boats, hit the sand, and break through the Atlantic Wall.',
    mode: 'assault',
    attackerNation: 'us',
    defenderNation: 'de',
    landingCraft: true,
    winBreaches: 5,
    assaultWaves: 3,
    wavePayout: 32,
    wavePayoutStep: 12,
    events: false,
    placeables: ASSAULT_PLACEABLES,
    history: 'June 6, 1944. The US 1st and 29th Infantry hit Omaha under withering fire from the bluffs. Landing craft motor through the surf; when the ramps drop, the killing ground opens.',
    briefing: 'Deploy men only on the landing craft. Press START — the boats run in, ramps drop, and the Germans open fire. Get 5 men past the bottom edge, or wipe the beach defenses.',
    setup(G) {
      usBunker(G, W / 2 - 160, DEPLOY_Y + 60);
      usBunker(G, W / 2 + 160, DEPLOY_Y + 60);
      usBag(G, W / 2 - 200, 435); usBag(G, W / 2 - 80, 435);
      usBag(G, W / 2 + 80, 435); usBag(G, W / 2 + 200, 435);
      usWire(G, W / 2 - 140, DEPLOY_Y - 20); usWire(G, W / 2, DEPLOY_Y - 25); usWire(G, W / 2 + 140, DEPLOY_Y - 20);
      usMine(G, W / 2 - 100, H / 2 + 30); usMine(G, W / 2 + 100, H / 2 + 30);
      deRow(G, 'rifleman', 428, [W / 2 - 200, W / 2 - 80, W / 2 + 80, W / 2 + 200]);
      deMan(G, 'gunner', W / 2 - 160, DEPLOY_Y + 60);
      deMan(G, 'gunner', W / 2 + 160, DEPLOY_Y + 60);
      deMan(G, 'sniper', W / 2 - 40, H - 90);
      deMan(G, 'sniper', W / 2 + 40, H - 90);
      deMan(G, 'officer', W / 2, H - 70);
      deFlankPicket(G, 2);
    },
  },

  allied_carentan: {
    id: 'allied_carentan',
    name: 'ALLIED 2: CARENTAN',
    menuName: 'LEVEL 2 — CARENTAN',
    menuDesc: 'June 1944. Three waves through hedgerows to seize the crossroads town.',
    mode: 'assault',
    attackerNation: 'us',
    defenderNation: 'de',
    winBreaches: 5,
    assaultWaves: 3,
    wavePayout: 36,
    wavePayoutStep: 12,
    events: false,
    placeables: ASSAULT_PLACEABLES,
    history: 'June 10–14, 1944. The 101st Airborne fights house-to-house and hedge-to-hedge to link Utah and Omaha. Fallschirmjäger hold the approaches with MG nests and snipers.',
    briefing: 'Three waves into a hedgerow line. Stormtroopers and flamers will clear the wire — push 5 men through or wipe them out.',
    setup(G) {
      for (const x of [W / 2 - 220, W / 2 - 110, W / 2, W / 2 + 110, W / 2 + 220]) usBag(G, x, 435);
      usWire(G, W / 2 - 160, DEPLOY_Y - 40); usWire(G, W / 2, DEPLOY_Y - 45); usWire(G, W / 2 + 160, DEPLOY_Y - 40);
      usMine(G, W / 2 - 80, H / 2 + 20); usMine(G, W / 2 + 80, H / 2 + 20);
      deRow(G, 'rifleman', 428, [W / 2 - 220, W / 2 - 110, W / 2, W / 2 + 110, W / 2 + 220]);
      deMan(G, 'gunner', W / 2 - 60, 490); deMan(G, 'gunner', W / 2 + 60, 490);
      deMan(G, 'sniper', W / 2 + 100, H - 80);
      deFlankPicket(G, 2);
    },
  },

  allied_cobra: {
    id: 'allied_cobra',
    name: 'ALLIED 3: OPERATION COBRA',
    menuName: 'LEVEL 3 — ST-LÔ BREAKOUT',
    menuDesc: 'July 1944. Four waves to crack the bocage and punch into open country.',
    mode: 'assault',
    attackerNation: 'us',
    defenderNation: 'de',
    winBreaches: 6,
    assaultWaves: 4,
    wavePayout: 40,
    wavePayoutStep: 13,
    events: false,
    placeables: ASSAULT_PLACEABLES,
    history: 'July 25, 1944. After St-Lô falls, carpet bombing opens a corridor west of Saint-Lô. Armor and infantry pour through shattered hedgerows as German remnants dig in behind minefields.',
    briefing: 'A bunkered bocage line with mines. Bring Shermans and bazookas — four waves to break into the open.',
    setup(G) {
      usBunker(G, W / 2, DEPLOY_Y + 70);
      for (const x of [W / 2 - 240, W / 2 - 120, W / 2 + 120, W / 2 + 240]) usBag(G, x, 435);
      for (const wx of [W / 2 - 180, W / 2 - 60, W / 2 + 60, W / 2 + 180]) usWire(G, wx, DEPLOY_Y - 45);
      for (const mx of [W / 2 - 200, W / 2 - 70, W / 2 + 70, W / 2 + 200]) usMine(G, mx, H / 2 + 15);
      deRow(G, 'rifleman', 428, [W / 2 - 240, W / 2 - 120, W / 2 + 120, W / 2 + 240]);
      deMan(G, 'gunner', W / 2, DEPLOY_Y + 70);
      deMan(G, 'flamer', W / 2 - 40, 500); deMan(G, 'bazooka', W / 2 + 40, 500);
      deMan(G, 'officer', W / 2, H - 70);
      deFlankPicket(G, 2);
    },
  },

  allied_market: {
    id: 'allied_market',
    name: 'ALLIED 4: MARKET GARDEN — NIJMEGEN',
    menuName: 'LEVEL 4 — NIJMEGEN',
    menuDesc: 'September 1944. Five waves past mortar teams to seize the Waal bridge approaches.',
    mode: 'assault',
    attackerNation: 'us',
    defenderNation: 'de',
    winBreaches: 6,
    assaultWaves: 5,
    wavePayout: 48,
    wavePayoutStep: 14,
    events: false,
    placeables: ASSAULT_PLACEABLES,
    history: 'September 1944. While British paras fight at Arnhem, US forces storm the Nijmegen bridges. German mortars and MG nests own every approach across the open ground.',
    briefing: 'Mortar crews have the killing ground zeroed. Rush, spread out, and keep moving — five waves to crack the bridgehead.',
    setup(G) {
      usBunker(G, W / 2 - 160, DEPLOY_Y + 70); usBunker(G, W / 2 + 160, DEPLOY_Y + 70);
      for (const x of [W / 2 - 260, W / 2 - 130, W / 2, W / 2 + 130, W / 2 + 260]) usBag(G, x, 435);
      usWire(G, W / 2 - 180, DEPLOY_Y - 50); usWire(G, W / 2, DEPLOY_Y - 55); usWire(G, W / 2 + 180, DEPLOY_Y - 50);
      deRow(G, 'mortarman', H - 60, [W / 2 - 180, W / 2, W / 2 + 180]);
      deRow(G, 'rifleman', 428, [W / 2 - 260, W / 2 - 130, W / 2, W / 2 + 130, W / 2 + 260]);
      deRow(G, 'gunner', DEPLOY_Y + 70, [W / 2 - 160, W / 2 + 160]);
      deFlankPicket(G, 3);
    },
  },

  allied_hurtgen: {
    id: 'allied_hurtgen',
    name: 'ALLIED 5: HÜRTGEN FOREST',
    menuName: 'LEVEL 5 — HÜRTGEN FOREST',
    menuDesc: 'November 1944. Five waves through sniper-laced woods toward the West Wall.',
    mode: 'assault',
    attackerNation: 'us',
    defenderNation: 'de',
    winBreaches: 7,
    assaultWaves: 5,
    wavePayout: 54,
    wavePayoutStep: 15,
    events: false,
    placeables: ASSAULT_PLACEABLES,
    history: 'Autumn 1944. The Hürtgen Forest swallows divisions in mud and treeburst artillery. German marksmen and MG teams hold every firebreak — the longest battle on German soil.',
    briefing: 'Snipers behind every tree hunt your officers and gunners. Rush cheap riflemen through the gaps — never bunch up.',
    setup(G) {
      usWire(G, W / 2 - 220, DEPLOY_Y - 50); usWire(G, W / 2 - 80, DEPLOY_Y - 45);
      usWire(G, W / 2 + 80, DEPLOY_Y - 45); usWire(G, W / 2 + 220, DEPLOY_Y - 50);
      for (const x of [W / 2 - 280, W / 2 - 150, W / 2 + 150, W / 2 + 280]) usBag(G, x, 435);
      deRow(G, 'sniper', 470, [90, W / 2 - 250, W / 2 - 90, W / 2 + 90, W / 2 + 250, W - 90]);
      deMan(G, 'sniper', W / 2, H - 90);
      deRow(G, 'rifleman', 428, [W / 2 - 280, W / 2 - 150, W / 2 + 150, W / 2 + 280]);
      deMan(G, 'gunner', W / 2, 500);
      deFlankPicket(G, 2);
    },
  },

  allied_bulge: {
    id: 'allied_bulge',
    name: 'ALLIED 6: BASTOGNE',
    menuName: 'LEVEL 6 — BASTOGNE',
    menuDesc: 'December 1944. Hold Bastogne against 12 German assault waves. 7 breaches and the crossroads falls.',
    mode: 'allied',
    breachLimit: MAX_BREACH,
    events: false,
    placeables: PLACEABLES,
    startTP: 24,
    history: 'December 1944. The 101st Airborne holds Bastogne while the Ardennes offensive surges around them. "Nuts!" — hold until Patton breaks through.',
    briefing: 'Hold your sector against 12 German assault waves. Survive the final push and Bastogne is yours.',
    waves: [
      { delay: 8,  comp: ['erifle', 'erifle', 'erifle'], banner: 'HERE THEY COME' },
      { delay: 22, comp: ['erifle', 'erifle', 'erifle', 'erifle'] },
      { delay: 20, comp: ['erifle', 'erifle', 'esmg', 'esmg'] },
      { delay: 18, comp: ['esmg', 'esmg', 'erifle', 'erifle', 'erifle'] },
      { delay: 18, comp: ['erifle', 'erifle', 'egren', 'esmg', 'esmg'] },
      { delay: 16, comp: ['ebike', 'erifle', 'erifle', 'esmg'], banner: 'KRADSCHÜTZEN INBOUND' },
      { delay: 16, comp: ['emg', 'erifle', 'erifle', 'erifle', 'esmg', 'esmg'] },
      { delay: 16, comp: ['egren', 'egren', 'esmg', 'esmg', 'erifle', 'erifle'] },
      { delay: 15, comp: ['eoff', 'emg', 'erifle', 'erifle', 'erifle', 'esmg'], banner: 'OFFICER LEADING THE ASSAULT' },
      { delay: 15, comp: ['eflame', 'esmg', 'esmg', 'erifle', 'erifle'] },
      { delay: 14, comp: ['ebike', 'ebike', 'esmg', 'esmg', 'egren', 'erifle'] },
      { delay: 18, comp: ['ehalftrack', 'eoff', 'emg', 'egren', 'esmg', 'esmg', 'erifle', 'erifle'],
        banner: 'FINAL ASSAULT! HALFTRACK LEADING!' },
    ],
    setup(G) {
      G.units.push(makeUnit('rifleman', W / 2 - 70, 470));
      G.units.push(makeUnit('rifleman', W / 2 + 70, 470));
      G.sandbags.push({ x: W / 2, y: 455, hp: SANDBAG_HP, maxhp: SANDBAG_HP, up: false, workProg: 0 });
    },
  },

  // ---- Axis campaign: 13 escalating assaults on the American line.
  // Level 1 opens with two waves; wave counts, defenders, and per-wave TP all
  // climb from there. Every third level is a themed set-piece for flavor.
  axis1: {
    id: 'axis1',
    name: 'AXIS 1: BATTLE OF MOKRA',
    menuName: 'LEVEL 1 — BATTLE OF MOKRA',
    menuDesc: 'September 1939, Poland. Two waves against a thin cavalry screen. 38 TP the first wave, 53 the second.',
    mode: 'axis',
    winBreaches: 5,
    axisWaves: 2,
    wavePayout: 25,
    wavePayoutStep: 10,
    events: false,
    history: 'September 1, 1939. German panzer columns slam into Polish cavalry screens west of Łódź. At Mokra, lancers and riflemen hold the ridgeline — your first test of blitzkrieg against a stubborn picket.',
    briefing: 'Two assault waves against a thin defensive screen. Fresh TP each wave — spend it or lose it. Get 5 men past the bottom, or wipe the defenders.',
    setup(G) {
      usBag(G, W / 2 - 105, 435); usBag(G, W / 2 - 35, 435); usBag(G, W / 2 + 35, 435); usBag(G, W / 2 + 105, 435);
      usWire(G, W / 2 - 70, DEPLOY_Y - 30); usWire(G, W / 2 + 70, DEPLOY_Y - 30);
      usRow(G, 'rifleman', 428, [W / 2 - 105, W / 2 - 35, W / 2 + 35, W / 2 + 105]);
      usMan(G, 'gunner', W / 2, 485);
      usFlankPicket(G, 1);
    },
  },

  axis2: {
    id: 'axis2',
    name: 'AXIS 2: CROSSING THE MEUSE — SEDAN',
    menuName: 'LEVEL 2 — SEDAN',
    menuDesc: 'May 1940, France. Three waves through wire and mines toward the Meuse crossing. Budgets start at 45 TP.',
    mode: 'axis',
    winBreaches: 5,
    axisWaves: 3,
    wavePayout: 30,
    wavePayoutStep: 10,
    events: false,
    history: 'May 13, 1940. Guderian\'s panzer corps must force the Meuse at Sedan before the French can rally. The defenders have wired the approaches and posted marksmen on the heights.',
    briefing: 'Three waves to crack a reinforced picket guarding the river crossing. Stormtroopers and flammenwerfer will help clear the wire.',
    setup(G) {
      usBag(G, W / 2 - 180, 435); usBag(G, W / 2 - 90, 435); usBag(G, W / 2, 435);
      usBag(G, W / 2 + 90, 435); usBag(G, W / 2 + 180, 435);
      usWire(G, W / 2 - 140, DEPLOY_Y - 40); usWire(G, W / 2, DEPLOY_Y - 45); usWire(G, W / 2 + 140, DEPLOY_Y - 40);
      usMine(G, W / 2 - 60, H / 2 + 20); usMine(G, W / 2 + 60, H / 2 + 20);
      usRow(G, 'rifleman', 428, [W / 2 - 180, W / 2 - 90, W / 2, W / 2 + 90, W / 2 + 180]);
      usMan(G, 'gunner', W / 2 - 60, 490); usMan(G, 'gunner', W / 2 + 60, 490);
      usMan(G, 'sniper', W / 2 + 90, H - 80);
      usFlankPicket(G, 2);
    },
  },

  axis3: {
    id: 'axis3',
    name: 'AXIS 3: FALL OF MALEME — CRETE',
    menuName: 'LEVEL 3 — MALEME, CRETE',
    menuDesc: 'May 1941. Three waves to seize the airfield at Maleme. Paradrop deployment unlocks in research.',
    mode: 'axis',
    winBreaches: 5,
    axisWaves: 3,
    wavePayout: 32,
    wavePayoutStep: 12,
    events: false,
    history: 'May 20, 1941. Fallschirmjäger descend on Crete to seize airfields for the invasion fleet. At Maleme the garrison clusters around the runway while flank sentries watch the olive groves.',
    briefing: 'The defenders are bunched around the airfield with thin flanks. Research paradrop if you can — drop random infantry behind their line.',
    setup(G) {
      const cx = W / 2;
      usBag(G, cx - 40, 450); usBag(G, cx + 40, 450); usBag(G, cx, 505);
      usRow(G, 'rifleman', 470, [cx - 45, cx, cx + 45]);
      usMan(G, 'gunner', cx, 512);
      usMan(G, 'shotgunner', cx - 30, 522);
      usMan(G, 'medic', cx + 30, 522);
      usMan(G, 'rifleman', 110, 440);
      usMan(G, 'rifleman', W - 110, 440);
      usWire(G, 130, DEPLOY_Y - 38); usWire(G, W - 130, DEPLOY_Y - 38);
    },
  },

  axis4: {
    id: 'axis4',
    name: 'AXIS 4: BREST FORTRESS',
    menuName: 'LEVEL 4 — BREST FORTRESS',
    menuDesc: 'June 1941, USSR. Four waves against a bunkered Soviet strongpoint on the frontier.',
    mode: 'axis',
    winBreaches: 6,
    axisWaves: 4,
    wavePayout: 36,
    wavePayoutStep: 12,
    events: false,
    history: 'June 22, 1941. Operation Barbarossa opens with fortress cities on the border. Brest holds out in bunkers and trenches — a preview of the grinding fights ahead on the Eastern Front.',
    briefing: 'A bunkered fortress line with deep wire belts. Four waves to crack the citadel. Mortars and grenadiers will help dig them out.',
    setup(G) {
      for (const x of [W / 2 - 220, W / 2 - 110, W / 2, W / 2 + 110, W / 2 + 220]) usBag(G, x, 435);
      usBunker(G, W / 2, DEPLOY_Y + 80);
      usWire(G, W / 2 - 170, DEPLOY_Y - 45); usWire(G, W / 2 - 55, DEPLOY_Y - 50);
      usWire(G, W / 2 + 55, DEPLOY_Y - 50); usWire(G, W / 2 + 170, DEPLOY_Y - 45);
      usMine(G, W / 2 - 200, H / 2 + 15); usMine(G, W / 2 + 200, H / 2 + 15);
      usRow(G, 'rifleman', 428, [W / 2 - 220, W / 2 - 110, W / 2, W / 2 + 110, W / 2 + 220]);
      usMan(G, 'gunner', W / 2, DEPLOY_Y + 80);
      usMan(G, 'sniper', W / 2 - 120, H - 80); usMan(G, 'sniper', W / 2 + 120, H - 80);
      usFlankPicket(G, 2);
    },
  },

  axis5: {
    id: 'axis5',
    name: 'AXIS 5: KASSERINE PASS',
    menuName: 'LEVEL 5 — KASSERINE PASS',
    menuDesc: 'February 1943, Tunisia. Four waves through a deep American line with medics in support.',
    mode: 'axis',
    winBreaches: 6,
    axisWaves: 4,
    wavePayout: 40,
    wavePayoutStep: 13,
    events: false,
    history: 'February 19, 1943. Rommel\'s Afrika Korps punches through the inexperienced American II Corps at Kasserine Pass — the first major clash between US and German forces in North Africa.',
    briefing: 'A deep infantry line with medics keeping casualties on their feet. Outlast them wave by wave — motorcycles can race for the breach.',
    setup(G) {
      for (const x of [W / 2 - 280, W / 2 - 200, W / 2 - 100, W / 2, W / 2 + 100, W / 2 + 200, W / 2 + 280]) usBag(G, x, 435);
      usWire(G, W / 2 - 180, DEPLOY_Y - 45); usWire(G, W / 2 - 60, DEPLOY_Y - 55);
      usWire(G, W / 2 + 60, DEPLOY_Y - 55); usWire(G, W / 2 + 180, DEPLOY_Y - 45);
      usMine(G, W / 2 - 120, H / 2 + 20); usMine(G, W / 2, H / 2 + 20); usMine(G, W / 2 + 120, H / 2 + 20);
      usRow(G, 'rifleman', 428, [W / 2 - 280, W / 2 - 200, W / 2 - 100, W / 2, W / 2 + 100, W / 2 + 200, W / 2 + 280]);
      usRow(G, 'gunner', 495, [W / 2 - 140, W / 2, W / 2 + 140]);
      usMan(G, 'medic', W / 2 - 80, H - 70); usMan(G, 'medic', W / 2 + 80, H - 70);
      usMan(G, 'sniper', W / 2 - 200, H - 80); usMan(G, 'sniper', W / 2 + 200, H - 80);
      usFlankPicket(G, 2);
    },
  },

  axis6: {
    id: 'axis6',
    name: 'AXIS 6: KURSK — PROKHOROVKA',
    menuName: 'LEVEL 6 — PROKHOROVKA',
    menuDesc: 'July 1943, USSR. Sherman, AT guns and mines — StuG III now in research. Panzers feed the graveyard.',
    mode: 'axis',
    winBreaches: 6,
    axisWaves: 4,
    wavePayout: 44,
    wavePayoutStep: 14,
    events: false,
    history: 'July 12, 1943. The largest tank battle in history rages near Prokhorovka. Soviet armor and anti-tank guns wait behind minefields — heavy Panzers die here without support.',
    briefing: 'A Sherman and AT guns guard a minefield. Panzerfausts and StuG IIIs will serve you better than charging tanks into the killing ground.',
    setup(G) {
      usBunker(G, W / 2, DEPLOY_Y + 70);
      usMan(G, 'sherman', W / 2, 470);
      usMan(G, 'atgun', W / 2 - 260, 440); usMan(G, 'atgun', W / 2 + 260, 440);
      usBag(G, W / 2 - 180, 435); usBag(G, W / 2 - 60, 435); usBag(G, W / 2 + 60, 435); usBag(G, W / 2 + 180, 435);
      for (const mx of [W / 2 - 280, W / 2 - 140, W / 2, W / 2 + 140, W / 2 + 280]) usMine(G, mx, H / 2 + 10);
      usWire(G, W / 2 - 150, DEPLOY_Y - 45); usWire(G, W / 2, DEPLOY_Y - 50); usWire(G, W / 2 + 150, DEPLOY_Y - 45);
      usRow(G, 'rifleman', 428, [W / 2 - 180, W / 2 - 60, W / 2 + 60, W / 2 + 180]);
      usMan(G, 'gunner', W / 2 - 220, 445); usMan(G, 'gunner', W / 2 + 220, 445);
      usFlankPicket(G, 2);
    },
  },

  axis7: {
    id: 'axis7',
    name: 'AXIS 7: MONTE CASSINO',
    menuName: 'LEVEL 7 — MONTE CASSINO',
    menuDesc: 'February 1944, Italy. Five waves up the ridge against twin bunkers and MG nests.',
    mode: 'axis',
    winBreaches: 6,
    axisWaves: 5,
    wavePayout: 48,
    wavePayoutStep: 14,
    events: false,
    history: 'February 1944. The abbey on Monte Cassino commands the Liri Valley. Allied infantry and New Zealand gunners hold the slopes in bunkers — four assaults have already failed here.',
    briefing: 'Twin bunkers with machine-gun teams command the ridge. Five waves to storm the heights. Flammenwerfer and mortars clear dug-in positions.',
    setup(G) {
      usBunker(G, W / 2 - 180, DEPLOY_Y + 70); usBunker(G, W / 2 + 180, DEPLOY_Y + 70);
      for (const x of [W / 2 - 280, W / 2 - 180, W / 2 - 60, W / 2 + 60, W / 2 + 180, W / 2 + 280]) usBag(G, x, 435);
      usWire(G, W / 2 - 200, DEPLOY_Y - 50); usWire(G, W / 2 - 70, DEPLOY_Y - 55);
      usWire(G, W / 2 + 70, DEPLOY_Y - 55); usWire(G, W / 2 + 200, DEPLOY_Y - 50);
      usMine(G, W / 2 - 130, H / 2 + 20); usMine(G, W / 2 + 130, H / 2 + 20);
      usRow(G, 'rifleman', 428, [W / 2 - 280, W / 2 - 180, W / 2 - 60, W / 2 + 60, W / 2 + 180, W / 2 + 280]);
      usRow(G, 'gunner', DEPLOY_Y + 70, [W / 2 - 180, W / 2 + 180]);
      usMan(G, 'sniper', W / 2 - 100, H - 80); usMan(G, 'sniper', W / 2 + 100, H - 80);
      usMan(G, 'medic', W / 2 - 60, H - 70); usMan(G, 'medic', W / 2 + 60, H - 70);
      usFlankPicket(G, 3);
    },
  },

  axis8: {
    id: 'axis8',
    name: 'AXIS 8: OPERATION BAGRATION',
    menuName: 'LEVEL 8 — BELARUS',
    menuDesc: 'June 1944, Eastern Front. Five waves into a deep medic-backed Soviet line.',
    mode: 'axis',
    winBreaches: 7,
    axisWaves: 5,
    wavePayout: 52,
    wavePayoutStep: 15,
    events: false,
    history: 'June 1944. While the Allies land in Normandy, the Red Army unleashes Operation Bagration — shattering Army Group Centre. This is a desperate counterattack into a deep, layered Soviet defense.',
    briefing: 'A deep line with medics keeping everyone on their feet. Bleed them white across five waves — numbers and firepower decide this fight.',
    setup(G) {
      for (const x of [W / 2 - 300, W / 2 - 220, W / 2 - 110, W / 2, W / 2 + 110, W / 2 + 220, W / 2 + 300]) usBag(G, x, 435);
      usBunker(G, W / 2, DEPLOY_Y + 80);
      usWire(G, W / 2 - 200, DEPLOY_Y - 50); usWire(G, W / 2 - 70, DEPLOY_Y - 55);
      usWire(G, W / 2 + 70, DEPLOY_Y - 55); usWire(G, W / 2 + 200, DEPLOY_Y - 50);
      for (const mx of [W / 2 - 240, W / 2 - 80, W / 2 + 80, W / 2 + 240]) usMine(G, mx, H / 2 + 15);
      usRow(G, 'rifleman', 428, [W / 2 - 300, W / 2 - 220, W / 2 - 110, W / 2, W / 2 + 110, W / 2 + 220, W / 2 + 300]);
      usRow(G, 'gunner', 495, [W / 2 - 150, W / 2, W / 2 + 150]);
      usRow(G, 'medic', H - 70, [W / 2 - 180, W / 2 + 180]);
      usMan(G, 'sniper', W / 2 - 80, H - 90); usMan(G, 'sniper', W / 2 + 80, H - 90);
      usFlankPicket(G, 3);
    },
  },

  axis9: {
    id: 'axis9',
    name: 'AXIS 9: HÜRTGEN FOREST',
    menuName: 'LEVEL 9 — HÜRTGEN FOREST',
    menuDesc: 'September 1944, Germany. Five waves through sniper-laced hedgerows. Keep the assault moving.',
    mode: 'axis',
    winBreaches: 7,
    axisWaves: 5,
    wavePayout: 56,
    wavePayoutStep: 16,
    events: false,
    history: 'September 1944. The US 28th Infantry Division pushes into the Hürtgen Forest — dense woods, mud, and hidden marksmen. The longest battle on German soil begins in these dark trees.',
    briefing: 'Marksmen behind every hedgerow hunt your officers and gunners. Rush cheap riflemen through the gaps — never bunch up in the open.',
    setup(G) {
      usWire(G, W / 2 - 220, DEPLOY_Y - 50); usWire(G, W / 2 - 80, DEPLOY_Y - 45);
      usWire(G, W / 2 + 80, DEPLOY_Y - 45); usWire(G, W / 2 + 220, DEPLOY_Y - 50);
      for (const x of [W / 2 - 280, W / 2 - 150, W / 2 + 150, W / 2 + 280]) usBag(G, x, 435);
      usRow(G, 'sniper', 470, [90, W / 2 - 250, W / 2 - 90, W / 2 + 90, W / 2 + 250, W - 90]);
      usMan(G, 'sniper', W / 2, H - 90);
      usRow(G, 'rifleman', 428, [W / 2 - 280, W / 2 - 150, W / 2 + 150, W / 2 + 280]);
      usRow(G, 'rifleman', 500, [130, W - 130]);
      usMan(G, 'medic', W / 2, 520);
      usFlankPicket(G, 2);
    },
  },

  axis10: {
    id: 'axis10',
    name: 'AXIS 10: SIEGFRIED LINE — AACHEN',
    menuName: 'LEVEL 10 — AACHEN',
    menuDesc: 'October 1944. Six waves against the West Wall — three bunkers, wire, mines, and an engineer.',
    mode: 'axis',
    winBreaches: 7,
    axisWaves: 6,
    wavePayout: 60,
    wavePayoutStep: 16,
    events: false,
    history: 'October 1944. Aachen is the first German city to face direct assault. The Siegfried Line\'s bunkers and dragon\'s teeth slow every advance — the Americans have an engineer keeping the wall intact.',
    briefing: 'Three bunkers, layered wire, and an engineer patching the fortifications. Bring mortars, flammenwerfer, and armor to breach the West Wall.',
    setup(G) {
      usBunker(G, W / 2 - 220, DEPLOY_Y + 70); usBunker(G, W / 2, DEPLOY_Y + 80); usBunker(G, W / 2 + 220, DEPLOY_Y + 70);
      for (const x of [W / 2 - 300, W / 2 - 200, W / 2 - 100, W / 2 + 100, W / 2 + 200, W / 2 + 300]) usBag(G, x, 435);
      for (const wx of [W / 2 - 240, W / 2 - 120, W / 2, W / 2 + 120, W / 2 + 240]) usWire(G, wx, DEPLOY_Y - 50);
      for (const mx of [W / 2 - 280, W / 2 - 140, W / 2, W / 2 + 140, W / 2 + 280]) usMine(G, mx, H / 2 + 15);
      usRow(G, 'gunner', DEPLOY_Y + 72, [W / 2 - 220, W / 2, W / 2 + 220]);
      usRow(G, 'rifleman', 428, [W / 2 - 300, W / 2 - 200, W / 2 - 100, W / 2 + 100, W / 2 + 200, W / 2 + 300]);
      usMan(G, 'engineer', W / 2, 520);
      usMan(G, 'medic', W / 2 - 140, H - 70); usMan(G, 'medic', W / 2 + 140, H - 70);
      usMan(G, 'sniper', W / 2 - 80, H - 80); usMan(G, 'sniper', W / 2 + 80, H - 80);
      usFlankPicket(G, 3);
    },
  },

  axis11: {
    id: 'axis11',
    name: 'AXIS 11: MARKET GARDEN — ARNHEM',
    menuName: 'LEVEL 11 — ARNHEM',
    menuDesc: 'September 1944, Netherlands. Six waves past mortar teams that own the open ground.',
    mode: 'axis',
    winBreaches: 7,
    axisWaves: 6,
    wavePayout: 66,
    wavePayoutStep: 17,
    events: false,
    history: 'September 17, 1944. Operation Market Garden aims to seize the Rhine bridges. At Arnhem, British paratroopers hold the far bank while mortars zero every approach — a bridge too far.',
    briefing: 'Mortar crews have the killing ground zeroed. Rush across before the shells find you — spread out and keep moving.',
    setup(G) {
      for (const x of [W / 2 - 280, W / 2 - 180, W / 2 - 90, W / 2, W / 2 + 90, W / 2 + 180, W / 2 + 280]) usBag(G, x, 435);
      usBunker(G, W / 2, DEPLOY_Y + 80);
      usWire(G, W / 2 - 200, DEPLOY_Y - 50); usWire(G, W / 2 - 70, DEPLOY_Y - 55);
      usWire(G, W / 2 + 70, DEPLOY_Y - 55); usWire(G, W / 2 + 200, DEPLOY_Y - 50);
      usRow(G, 'mortarman', H - 60, [W / 2 - 200, W / 2, W / 2 + 200]);
      usRow(G, 'rifleman', 428, [W / 2 - 280, W / 2 - 180, W / 2 - 90, W / 2, W / 2 + 90, W / 2 + 180, W / 2 + 280]);
      usRow(G, 'gunner', 495, [W / 2 - 150, W / 2, W / 2 + 150]);
      usMan(G, 'medic', W / 2 - 220, H - 70); usMan(G, 'medic', W / 2 + 220, H - 70);
      usFlankPicket(G, 3);
    },
  },

  axis12: {
    id: 'axis12',
    name: 'AXIS 12: BULGE — ST. VITH',
    menuName: 'LEVEL 12 — ST. VITH',
    menuDesc: 'December 1944, Belgium. Six waves through American combined arms holding the road hub.',
    mode: 'axis',
    winBreaches: 7,
    axisWaves: 6,
    wavePayout: 72,
    wavePayoutStep: 18,
    events: false,
    history: 'December 16, 1944. The Ardennes offensive surges west. St. Vith is a critical road junction — the 7th Armored and scattered infantry throw everything they have into blocking the advance.',
    briefing: 'Combined arms defense: riflemen, armor, and support weapons in a disorganized but deadly line. Punch through before they rally.',
    setup(G) {
      usBunker(G, W / 2 - 120, DEPLOY_Y + 80); usBunker(G, W / 2 + 120, DEPLOY_Y + 80);
      usBag(G, W / 2 - 280, 435); usBag(G, W / 2 - 160, 435); usBag(G, W / 2 + 160, 435); usBag(G, W / 2 + 280, 435);
      usWire(G, W / 2 - 200, DEPLOY_Y - 50); usWire(G, W / 2, DEPLOY_Y - 55); usWire(G, W / 2 + 200, DEPLOY_Y - 50);
      usMine(G, W / 2 - 120, H / 2 + 15); usMine(G, W / 2 + 120, H / 2 + 15);
      usMan(G, 'rifleman', W / 2 - 300, 440); usMan(G, 'rifleman', W / 2 + 300, 440);
      usMan(G, 'gunner', W / 2 - 220, 460); usMan(G, 'gunner', W / 2 + 220, 460);
      usMan(G, 'grenadier', W / 2 - 140, 480); usMan(G, 'grenadier', W / 2 + 140, 480);
      usMan(G, 'shotgunner', W / 2 - 60, 500); usMan(G, 'bazooka', W / 2 + 60, 500);
      usMan(G, 'flamer', W / 2 - 20, 510); usMan(G, 'sniper', W / 2 + 20, 510);
      usMan(G, 'mortarman', W / 2 - 80, 455); usMan(G, 'mortarman', W / 2 + 80, 455);
      usMan(G, 'medic', W / 2 - 100, H - 70); usMan(G, 'engineer', W / 2 + 100, H - 70);
      usMan(G, 'officer', W / 2, H - 55);
      usMan(G, 'jeep', W / 2 - 260, 525); usMan(G, 'atgun', W / 2 + 260, 525);
      usFlankPicket(G, 2);
    },
  },

  axis13: {
    id: 'axis13',
    name: 'AXIS 13: BASTOGNE — WACHT AM RHEIN',
    menuName: 'LEVEL 13 — BASTOGNE',
    menuDesc: 'December 1944. Seven-wave finale. Twin Shermans, AT guns, bunkers — research the Tiger I here.',
    mode: 'axis',
    winBreaches: 7,
    axisWaves: 7,
    wavePayout: 80,
    wavePayoutStep: 22,
    events: false,
    history: 'December 1944. Bastogne is the hinge of the Bulge. The 101st Airborne and attached armor form a fortress ring — seven waves and every gun in the theater to break "Nuts!"',
    briefing: 'The final line: Shermans, AT guns, bunkers, and mortars under an officer. Seven waves and the fattest budgets of the war. Break Bastogne and the offensive lives.',
    setup(G) {
      usBunker(G, W / 2 - 240, DEPLOY_Y + 70); usBunker(G, W / 2, DEPLOY_Y + 85); usBunker(G, W / 2 + 240, DEPLOY_Y + 70);
      for (const x of [W / 2 - 320, W / 2 - 220, W / 2 - 110, W / 2 + 110, W / 2 + 220, W / 2 + 320]) usBag(G, x, 435);
      for (const wx of [W / 2 - 280, W / 2 - 150, W / 2 - 50, W / 2 + 50, W / 2 + 150, W / 2 + 280]) usWire(G, wx, DEPLOY_Y - 50);
      for (const mx of [W / 2 - 300, W / 2 - 160, W / 2, W / 2 + 160, W / 2 + 300]) usMine(G, mx, H / 2 + 12);
      usMan(G, 'sherman', W / 2 - 140, 500); usMan(G, 'sherman', W / 2 + 140, 500);
      usMan(G, 'atgun', W / 2 - 340, 460); usMan(G, 'atgun', W / 2 + 340, 460);
      usRow(G, 'gunner', DEPLOY_Y + 72, [W / 2 - 240, W / 2, W / 2 + 240]);
      usRow(G, 'rifleman', 428, [W / 2 - 320, W / 2 - 220, W / 2 - 110, W / 2 + 110, W / 2 + 220, W / 2 + 320]);
      usRow(G, 'sniper', H - 90, [W / 2 - 180, W / 2 + 180, 100, W - 100]);
      usRow(G, 'mortarman', H - 55, [W / 2 - 80, W / 2 + 80]);
      usRow(G, 'medic', H - 78, [W / 2 - 280, W / 2 + 280]);
      usMan(G, 'engineer', W / 2, H - 62);
      usMan(G, 'officer', W / 2, H - 40);
      usFlankPicket(G, 3);
    },
  },

  hitsquad: {
    id: 'hitsquad',
    name: 'COMMANDO 1: HIT SQUAD',
    menuName: 'LEVEL 1 — HIT SQUAD',
    menuDesc: 'A commando mission. Command six veterans directly — click to select, click to move. Kill the marked US officer in 5 minutes.',
    mode: 'hitsquad',
    timeLimit: 300,
    events: false,
    placeables: [],
    startTP: 0,
    briefing: 'Command your six-man squad. Kill the marked American officer before the clock runs out.',
    setup(G) {
      // your commando squad steps off from the north edge. These are
      // hand-picked veterans — six men against a dug-in platoon, so each one
      // is worth three line infantry: tougher, deadlier, longer-armed, and
      // quick back on their feet when pinned.
      const squad = [
        ['eoff', W / 2 - 100], ['esniper', W / 2 - 60], ['emg', W / 2 - 20],
        ['esmg', W / 2 + 20], ['esmg', W / 2 + 60], ['egren', W / 2 + 100],
      ];
      for (const [type, x] of squad) {
        const e = makeEnemy(type, x, 36);
        // per-man stat clone so ENEMY_TYPES stays untouched for other modes
        e.t = Object.assign({}, e.t, {
          hp: Math.round(e.t.hp * 2.2),
          dmg: Math.round(e.t.dmg * 1.25),
          acc: Math.min(0.9, e.t.acc * 1.15),
          range: Math.round(e.t.range * 1.15),
          speed: Math.round(e.t.speed * 1.1),
        });
        e.hp = e.maxhp = e.t.hp;
        e.rank = 4;   // shortens pin time in tryGoProne; Germans draw no chevrons
        G.enemies.push(e);
      }
      G.squadTotal = squad.length;

      // the target: a US officer well behind the line, marked for death
      const vip = makeUnit('officer', W / 2, H - 55);
      vip.vip = true;
      G.units.push(vip);

      // his security detail holds the center; the flanks are thinner —
      // a small detail on purpose: six commandos cannot win a stand-up fight
      // against a full platoon, so the mission is sized for maneuver
      const bag = (x, y) => G.sandbags.push({ x, y, hp: SANDBAG_HP, maxhp: SANDBAG_HP, up: false, workProg: 0 });
      bag(W / 2 - 60, DEPLOY_Y + 40);
      bag(W / 2 + 60, DEPLOY_Y + 40);
      G.units.push(makeUnit('gunner', W / 2, DEPLOY_Y + 45));
      G.units.push(makeUnit('rifleman', W / 2 - 60, DEPLOY_Y + 36));
      G.units.push(makeUnit('rifleman', W / 2 + 60, DEPLOY_Y + 36));
      G.units.push(makeUnit('rifleman', W / 2 - 260, DEPLOY_Y + 55));
      G.units.push(makeUnit('rifleman', W / 2 + 260, DEPLOY_Y + 55));
      G.units.push(makeUnit('shotgunner', W / 2 - 50, H - 85));
      // no mortar in the detail: indirect fire would punish the flanking
      // routes this mission is designed around

      // the direct approach is fortified: wire and mines down the middle
      for (const wx of [W / 2 - 110, W / 2, W / 2 + 110]) {
        G.wires.push({ x: wx, y: FORWARD_Y + 40, hp: 3750, maxhp: 3750, up: false, workProg: 0 });
      }
      for (const mx of [W / 2 - 60, W / 2, W / 2 + 60]) {
        G.mines.push({ x: mx, y: H / 2 + 10, dead: false });
      }
    },
  },
};

// ============================================================ helpers

const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const HUD_INTERVAL = 0.1;
const AURA_CACHE_INTERVAL = 0.4;
const PARTICLE_CAP = 250;

function compactInPlace(arr, keep) {
  let w = 0;
  for (let i = 0; i < arr.length; i++) {
    if (keep(arr[i])) arr[w++] = arr[i];
  }
  arr.length = w;
}

function compactDefenses(arr, onDestroy) {
  let w = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].hp > 0) arr[w++] = arr[i];
    else onDestroy(arr[i]);
  }
  arr.length = w;
}

const officerCount = () => {
  if (isAssaultMode()) {
    return G.enemies.filter(e => !e.dead && (e.type === 'officer' || e.type === 'eoff')).length;
  }
  if (G && G.usOfficers) return G.usOfficers.length;
  return G ? G.units.filter(u => !u.dead && u.type === 'officer').length : 0;
};

// ============================================================ state

let G = null;         // game state
let placing = null;   // placeable currently being placed
let mouse = { x: W / 2, y: H / 2, inside: false };
let drag = null;      // marquee selection in progress: { x0, y0, x1, y1, active }
let suppressClick = false; // eat the click that follows a completed drag-select or pointerup action
let placeTouch = null;  // touch placement drag: { active, moved, startX, startY }
let viewPan = null;     // one-finger camera pan on mobile
let placeHoldTimer = null;
let mobileToolbarMinimized = false;
let lastTap = { t: 0, x: 0, y: 0 };
let lastUnitClick = { t: 0, type: null };
let longPressTimer = null;
let longPressing = false;
let viewCam = { x: 0, y: 0, zoom: 1 };
let viewDirty = false;
let viewGesture = null;   // two-finger pinch/pan snapshot
const activePointers = new Map();
const VIEW_ZOOM_MAX_MUL = 2.5;
let lastCoverZoom = null;

function clearLongPress() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  longPressing = false;
}

let running = false;
let paused = false;
let gameSpeed = 1;
const SPEED_STEPS = [0.5, 1, 2, 3];
let codexReturnTo = 'intro';
let settingsReturnTo = 'intro';
let lastT = 0;
let hudAccum = 0;

function refreshHUD() {
  hudAccum = 0;
  if (G) updateHUD();
}

function isPlaying() {
  return running && G && !G.over && !paused;
}

function isAssaultMode() {
  return G && (G.mode === 'axis' || G.mode === 'assault');
}

function isAssaultModeLevel(level) {
  return level && (level.mode === 'axis' || level.mode === 'assault');
}

function inBuildPhase() {
  return isAssaultMode() && G.phase === 'build';
}

function inLandingPhase() {
  return isAssaultMode() && G.phase === 'landing';
}

function assaultWaves(level) {
  return level.axisWaves || level.assaultWaves || 1;
}

function levelAttackerNation(level) {
  return level.attackerNation || (level.mode === 'axis' ? 'de' : 'us');
}

function levelDefenderNation(level) {
  return level.defenderNation || (level.mode === 'axis' ? 'us' : 'de');
}

function defenderNationLabel(nation) {
  return nation === 'de' ? 'German' : 'American';
}

function syncMuteButtons() {
  const label = SFX.muted ? 'SND OFF' : 'SND ON';
  const btn = el('settings-mute-btn');
  if (btn) btn.textContent = label;
}

const canvas = document.getElementById('game');
let ctx = canvas.getContext('2d');

// persistent ground layer (wrecks, terrain — blood and craters are temporary overlays)
const groundCanvas = document.createElement('canvas');
groundCanvas.width = W; groundCanvas.height = H;
const gctx = groundCanvas.getContext('2d');

function newGame(level, difficulty) {
  G = {
    level,
    mode: level.mode,
    difficulty: level.mode === 'endless'
      ? (difficulty || ENDLESS_DIFFICULTIES.easy)
      : null,
    tp: isAssaultModeLevel(level)
      ? axisWavePayout(level, 1)
      : (level.startTP != null ? level.startTP : 15),
    wave: isAssaultModeLevel(level) ? 1 : 0,
    phase: isAssaultModeLevel(level) ? 'build' : 'combat',
    waveIdx: 0,        // allied campaign: next scripted wave
    kills: 0,
    breaches: 0,
    time: 0,
    over: false,

    units: [],
    enemies: [],
    sandbags: [],
    bunkers: [],
    wires: [],
    mines: [],
    watchtowers: [],
    camoNests: [],
    shells: [],      // incoming ordnance {x,y,timer,r,dmg,big}
    grenades: [],    // thrown grenades in flight
    rockets: [],     // bazooka rockets in flight
    planes: [],      // friendly aircraft making strafing passes
    tracers: [],
    particles: [],
    flashes: [],
    texts: [],       // floating notices (promotions)
    corpses: [],     // fallen soldiers, cleared away after CORPSE_TTL
    groundMarks: [], // blood stains and blast craters, fade after GROUND_MARK_TTL

    spawnTimer: level.mode === 'allied' ? level.waves[0].delay : 6,
    tpTrickle: 8,
    officerTick: 30,
    eventTimer: rand(40, 60),
    fog: 0,
    banner: null,
    selected: [],
    auraRefresh: 0,
    buffFrame: 0,
    usOfficers: [],
    deOfficers: [],
    paraFlybyPlayed: false,
    landingCraft: [],
    landingFire: true,
  };
  paintGround(level);
  level.setup(G);
  if (level.landingCraft) initLandingCraft(G);
}

function makeUnit(type, x, y, nation = 'us') {
  const t = UNIT_TYPES[type];
  return {
    side: 'us', nation, type, t, x, y,
    hp: t.hp, maxhp: t.hp,
    cd: rand(0.2, 1.0), burstLeft: 0, burstTimer: 0,
    face: -Math.PI / 2,
    turret: -Math.PI / 2,
    moveTo: null,
    healTick: 0,
    healed: 0,       // HP restored; medics rank up on this, slowly
    grenCd: rand(5, 9),
    rocketCd: rand(1, 2),
    mortCd: rand(4, 8),
    xp: 0, rank: 0,
    prone: 0, proneCd: 0,
  };
}

function makeEnemy(type, x, y, nation = 'de') {
  const t = ENEMY_TYPES[type];
  return {
    side: 'de', nation, type, t, x, y,
    hp: t.hp, maxhp: t.hp,
    cd: rand(0.5, 1.5), burstLeft: 0, burstTimer: 0,
    face: Math.PI / 2,
    wobble: rand(0, Math.PI * 2),
    grenCd: rand(2, 4),
    turret: Math.PI / 2,
    pushT: 0, pushCd: rand(2, 5),
    prone: 0, proneCd: 0,
    moveTo: null,   // hit-squad mode: player-issued destination
    rocketCd: rand(1, 2),
    mortCd: rand(4, 8),
    v2Cd: rand(8, 16),
    v2FireT: 0,
  };
}

function actorTypeCatalog(nation) {
  return nation === 'us' ? UNIT_TYPES : ENEMY_TYPES;
}

function makeAttacker(nation, type, x, y) {
  const t = actorTypeCatalog(nation)[type];
  if (!t) return null;
  const e = {
    side: 'de', nation, type, t, x, y,
    hp: t.hp, maxhp: t.hp,
    cd: rand(0.5, 1.5), burstLeft: 0, burstTimer: 0,
    face: Math.PI / 2,
    wobble: rand(0, Math.PI * 2),
    grenCd: rand(2, 4),
    turret: Math.PI / 2,
    pushT: 0, pushCd: rand(2, 5),
    prone: 0, proneCd: 0,
    moveTo: null,
    rocketCd: rand(1, 2),
    mortCd: rand(4, 8),
    onCraft: null,
  };
  if (nation === 'us') {
    e.xp = 0;
    e.rank = 0;
    e.healTick = 0;
    e.healed = 0;
  }
  return e;
}

function makeDefender(nation, type, x, y) {
  const t = actorTypeCatalog(nation)[type];
  if (!t) return null;
  const u = {
    side: 'us', nation, type, t, x, y,
    hp: t.hp, maxhp: t.hp,
    cd: rand(0.2, 1.0), burstLeft: 0, burstTimer: 0,
    face: -Math.PI / 2,
    turret: -Math.PI / 2,
    moveTo: null,
    healTick: 0,
    healed: 0,
    grenCd: nation === 'us' ? rand(5, 9) : rand(2, 4),
    rocketCd: rand(1, 2),
    mortCd: rand(4, 8),
    xp: 0, rank: 0,
    prone: 0, proneCd: 0,
  };
  return u;
}

// ============================================================ economy

// war economy attrition (endless only): each wave pays ~1% less than the one
// before, dropping to a hard 10% floor from wave 90 on. Campaign levels pay
// full rate. G.tp holds fractions; the HUD floors it.
// endless TP income is also cut 75% across the board (unit-count reduction pass).
function earnTP(amount) {
  let mult = G.mode === 'endless'
    ? (G.wave >= 90 ? 0.1 : Math.max(0.1, Math.pow(0.99, G.wave)))
    : 1;
  if (G.mode === 'endless' && G.difficulty) mult *= G.difficulty.incomeMult;
  if (G.mode === 'endless') mult *= 0.25;
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

// campaign levels can override toolbar costs so no single purchase type
// can cheese the mission; endless uses the base PLACEABLES prices.
function placeableCost(p) {
  const ov = G && G.level && G.level.costOverrides;
  return (ov && ov[p.key] != null) ? ov[p.key] : p.cost;
}

// ============================================================ waves & spawning

function wavesPast99(w) {
  return Math.max(0, w - 99);
}

function spawnIntervalForWave(w) {
  if (w <= 99) return clamp(16 - w * 0.2, 6, 16);
  return clamp(6 - wavesPast99(w) * 0.06, 3, 16);
}

// enemy volume is cut 75% across the board (unit-count reduction pass), but
// the first 10 waves felt too quiet at that rate, so they're bumped back up
// 50% off that floor (0.25 * 1.5 = 0.375) — still a net cut, just a smaller one early.
function enemySpawnMult(w) {
  return w <= 10 ? 0.375 : 0.25;
}

function waveComposition(w) {
  const late = wavesPast99(w);
  const mult = enemySpawnMult(w);
  const baseSize = Math.min(
    2 + Math.floor(w / 4) + (Math.random() < 0.35 ? 1 : 0) + Math.floor(late / 5),
    7 + Math.floor(late / 10),
  );
  const size = Math.max(1, Math.round(baseSize * mult));
  const pool = ['erifle', 'erifle', 'erifle'];
  if (w >= 4) pool.push('esmg', 'esmg');
  if (w >= 7) pool.push('egren');
  if (w >= 10) pool.push('emg');
  if (w >= 12) pool.push('eflame');
  if (w >= 14) pool.push('esniper');
  if (w >= 60) pool.push('emortar');
  if (w >= 80) pool.push('ebazooka');
  const out = [];
  for (let i = 0; i < size; i++) out.push(pick(pool));
  if (w >= 12 && Math.random() < (0.30 + late * 0.004) * mult) out.push('eoff');
  // a motorcycle team races ahead of some waves; as German logistics spin
  // up, bikes ramp from 20% at wave 9 to a 90% cap at wave 99, then keep climbing
  const bikeChance = (late > 0
    ? Math.min(1, 0.9 + late * 0.006)
    : Math.min(0.9, w >= 9 ? 0.2 + (w - 9) * (0.7 / 90) : 0)) * mult;
  if (w >= 9 && Math.random() < bikeChance) out.push('ebike');
  const vehChance = 0.11 * (1 + late * 0.04) * mult;
  // a Kübelwagen gun car rolls in occasionally — not until mid-game
  if (w >= 16 && Math.random() < vehChance) out.push('ejeep');
  // an armored halftrack hauls a full squad to the front
  if (w >= 18 && Math.random() < vehChance) out.push('ehalftrack');
  if (w >= 25 && Math.random() < vehChance) out.push('panzer');
  // V2 battery: one at a time, and only once the fighting is desperate. Not
  // scaled by `mult` — that's a general enemy-volume knob and was crushing
  // this down to a ~3% roll per wave even deep past 140; it's a rare
  // set-piece threat, not a regular trooper, so it gets its own odds.
  const v2Chance = Math.min(0.35, 0.10 + late * 0.004);
  if (w >= 140 && !G.enemies.some(e => !e.dead && e.type === 'ev2') && Math.random() < v2Chance) {
    out.push('ev2');
  }
  return out;
}

// ---- themed set-piece assaults: every 10th wave the Germans commit to a
// scripted attack. Themes cycle; the tier (wave/10) keeps climbing forever,
// so each theme returns bigger and meaner the next time around.

function spawnEnemyAt(type, x, y) {
  const e = makeEnemy(type, clamp(x, 30, W - 30), y);
  G.enemies.push(e);
  return e;
}

// special-wave tier t corresponds to wave t*10; reuses the same early-wave
// bump as waveComposition (1.3 base scale * enemySpawnMult).
function specialWaveMult(t) {
  return 1.3 * enemySpawnMult(t * 10);
}

const SPECIAL_WAVES = [
  {
    key: 'blitz',
    banner: 'BLITZKRIEG! KRADSCHÜTZEN SWARM!',
    // a torrent of motorcycles racing for your line, gun cars in the second echelon
    spawn(t) {
      const bikes = Math.floor(specialWaveMult(t) * (3 + t));
      for (let i = 0; i < bikes; i++) {
        spawnEnemyAt('ebike', rand(60, W - 60), -20 - i * rand(30, 70));
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * t / 2); i++) {
        spawnEnemyAt('ejeep', rand(100, W - 100), -80 - i * 100);
      }
    },
  },
  {
    key: 'parastorm',
    banner: 'FALLSCHIRMJÄGER ASSAULT!',
    // a mass drop behind your line while a ground element pins you frontally
    spawn(t) {
      spawnTransportFlyby();
      const pool = ['erifle', 'esmg', 'esmg', 'egren'];
      if (t >= 3) pool.push('emg');
      const count = Math.floor(specialWaveMult(t) * (6 + 2 * t));
      for (let i = 0; i < count; i++) {
        const e = spawnEnemyAt(pick(pool), rand(40, W - 40), rand(40, H * (2 / 3) - 10));
        e.chute = rand(2.8, 4.0) + i * 0.15;
        e.chuteMax = e.chute;
      }
      if (t >= 4) {
        const o = spawnEnemyAt('eoff', rand(120, W - 120), rand(60, H / 2));
        o.chute = rand(3, 4);
        o.chuteMax = o.chute;
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (3 + t / 2)); i++) {
        spawnEnemyAt(pick(['erifle', 'esmg']), rand(80, W - 80), rand(-70, -20));
      }
    },
  },
  {
    key: 'sturm',
    banner: 'STURMANGRIFF! HUMAN WAVE!',
    // a shoulder-to-shoulder line of shock infantry across the whole field
    spawn(t) {
      const count = Math.floor(specialWaveMult(t) * (8 + 2 * t));
      for (let i = 0; i < count; i++) {
        const x = (W / (count + 1)) * (i + 1) + rand(-25, 25);
        const roll = Math.random();
        const type = roll < 0.5 ? 'esmg' : roll < 0.65 && t >= 3 ? 'eflame' : 'erifle';
        spawnEnemyAt(type, x, rand(-90, -20));
      }
      const officers = Math.floor(specialWaveMult(t) * (1 + t / 5));
      for (let i = 0; i < officers; i++) {
        spawnEnemyAt('eoff', rand(120, W - 120), rand(-130, -90));
      }
    },
  },
  {
    key: 'panzerkeil',
    banner: 'PANZERKEIL! ARMOR COLUMN!',
    // tanks and halftracks in column with an infantry screen out front
    spawn(t) {
      const cx = rand(180, W - 180);
      const panzers = t < 6 ? 1 : Math.max(1, Math.floor(specialWaveMult(t) * t / 3));
      for (let i = 0; i < panzers; i++) {
        spawnEnemyAt('panzer', cx + rand(-120, 120), -40 - i * 150);
      }
      const tracks = t < 6 ? 0 : Math.floor(specialWaveMult(t) * (1 + (t - 6) / 5));
      for (let i = 0; i < tracks; i++) {
        spawnEnemyAt('ehalftrack', cx + rand(-160, 160), -110 - i * 130);
      }
      const jeeps = t < 5 ? 0 : Math.floor(specialWaveMult(t) * (t - 4) / 3);
      for (let i = 0; i < jeeps; i++) {
        spawnEnemyAt('ejeep', cx + rand(-200, 200), -70 - i * 100);
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (4 + t / 2)); i++) {
        spawnEnemyAt(pick(['erifle', 'esmg', 'egren']), cx + rand(-200, 200), rand(-60, -20));
      }
    },
  },
  {
    key: 'nebel',
    banner: 'NEBELSTURM! THEY COME IN THE FOG!',
    // fog blankets the field while marksmen and MGs creep in behind the infantry
    spawn(t) {
      G.fog = Math.max(G.fog, Math.round((24 + t) * 1.15));
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (2 + t / 4)); i++) {
        spawnEnemyAt('esniper', rand(60, W - 60), rand(-140, -60));
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (1 + t / 4)); i++) {
        spawnEnemyAt('emg', rand(80, W - 80), rand(-110, -40));
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (6 + t)); i++) {
        spawnEnemyAt(pick(['erifle', 'erifle', 'esmg']), rand(50, W - 50), rand(-90, -20));
      }
    },
  },
];

function spawnSpecialWave(w) {
  const tier = w / 10;
  const theme = SPECIAL_WAVES[(tier - 1) % SPECIAL_WAVES.length];
  showBanner(theme.banner);
  theme.spawn(tier);
  // a breather while you police up the aftermath
  G.spawnTimer = spawnIntervalForWave(w) + 6;
}

function launchWave(w) {
  if (w % 10 === 0) {
    spawnSpecialWave(w);
    return;
  }
  const comp = waveComposition(w);
  const cx = rand(100, W - 100);
  for (const type of comp) {
    const x = clamp(cx + rand(-90, 90), 30, W - 30);
    // the V2 battery holds position by default, so it's staked out in view
    // from the start instead of off the top edge with the rest of the wave
    const y = type === 'ev2' ? rand(30, 85) : rand(-70, -20);
    G.enemies.push(makeEnemy(type, x, y));
  }
  G.spawnTimer = spawnIntervalForWave(w);
}

function spawnWave() {
  G.wave++;
  launchWave(G.wave);
  if (G.wave === 1) showBanner('HERE THEY COME');
}

// sandbox only: skip ahead and spawn that wave's assault immediately. Not
// available in testing mode — that mode's whole point is that Germans never
// spawn on their own.
function jumpSandboxWave(steps) {
  if (!isSandbox() || isTestingMode() || !running || !G || G.over || steps <= 0) return;
  const target = Math.min(G.wave + steps, 999);
  if (target <= G.wave) return;
  G.wave = target;
  launchWave(G.wave);
  showBanner('SANDBOX — WAVE ' + G.wave);
  SFX.click();
}

// allied campaign: step through the level's scripted wave list. Once the last
// wave is launched, victory comes when the field is clear.
function updateAlliedWaves(dt) {
  const waves = G.level.waves;
  if (G.waveIdx >= waves.length) {
    if (G.enemies.length === 0) victory();
    return;
  }
  G.spawnTimer -= dt;
  if (G.spawnTimer > 0) return;
  const wv = waves[G.waveIdx++];
  G.wave++;
  if (wv.banner) showBanner(wv.banner);
  const cx = rand(100, W - 100);
  for (const type of wv.comp) {
    const x = clamp(cx + rand(-90, 90), 30, W - 30);
    G.enemies.push(makeEnemy(type, x, rand(-70, -20)));
  }
  const next = waves[G.waveIdx];
  if (next) G.spawnTimer = next.delay;
}

function clearAxisWaveEffects() {
  G.shells = [];
  G.grenades = [];
  G.rockets = [];
  G.planes = [];
  G.tracers = [];
  G.particles = [];
  G.flashes = [];
  G.paraFlybyPlayed = false;
  clearPlacing();
}

function isParaDropUnit(key) {
  return key === 'eparadrop';
}

function axisParadropPool() {
  const { unlocked } = loadAxisResearch();
  const pool = AXIS_PARA_POOL_BASE.slice();
  for (const k of AXIS_PARA_POOL_EXTRAS) {
    if (unlocked.includes(k)) pool.push(k);
  }
  return pool;
}

function resolveParadropLanding(e) {
  if (!e.paraRoll) return;
  const replacement = makeEnemy(e.paraRoll, e.x, e.y);
  replacement.face = e.face || Math.PI / 2;
  const idx = G.enemies.indexOf(e);
  if (idx !== -1) G.enemies[idx] = replacement;
}

function assaultDeployMaxY(p) {
  return isParaDropUnit(p.key) ? AXIS_PARA_DROP_MAX_Y : AXIS_DEPLOY_Y;
}

function axisDeployMaxY(p) {
  return assaultDeployMaxY(p);
}

function updateEnemyChute(e, dt) {
  if (!(e.chute > 0)) return;
  e.chute -= dt;
  e.sway = (e.sway || 0) + dt * 2.2;
  e.x = clamp(e.x + Math.sin(e.sway) * 9 * dt, 14, W - 14);
  if (e.chute <= 0) {
    e.chute = 0;
    for (let i = 0; i < 6; i++) {
      G.particles.push({
        x: e.x + rand(-6, 6), y: e.y + rand(-2, 4),
        vx: rand(-30, 30), vy: rand(-40, -10),
        ttl: rand(0.25, 0.5), grav: 160, size: rand(1.2, 2.4),
        color: pick(['#6e6046', '#57492f', '#8a7a5a']),
      });
    }
    if (e.paraRoll) resolveParadropLanding(e);
  }
}

function placeAxisParatrooper(x, y) {
  const e = makeEnemy('erifle', x, y);
  e.paraRoll = pick(axisParadropPool());
  const depth = clamp((y - 14) / Math.max(AXIS_PARA_DROP_MAX_Y - 14, 1), 0, 1);
  e.chute = rand(2.2, 3.0) + depth * 0.9;
  e.chuteMax = e.chute;
  e.sway = rand(0, Math.PI * 2);
  G.enemies.push(e);
  if (!G.paraFlybyPlayed) {
    G.paraFlybyPlayed = true;
    spawnTransportFlyby();
  }
}

function initLandingCraft(G) {
  const slots = [
    { x: W / 2 - 200, y: 42 },
    { x: W / 2 - 70, y: 36 },
    { x: W / 2 + 70, y: 36 },
    { x: W / 2 + 200, y: 42 },
  ];
  G.landingCraft = slots.map(s => ({
    x: s.x, y: s.y, w: 72, h: 34,
    state: 'waiting', rampT: 0, shoreY: LANDING_CRAFT_SHORE_Y,
    onDeck: [],
  }));
}

function landingCraftAt(x, y) {
  if (!G || !G.landingCraft) return null;
  for (const c of G.landingCraft) {
    if (c.state === 'done') continue;
    if (x >= c.x - c.w / 2 && x <= c.x + c.w / 2 &&
        y >= c.y - c.h / 2 && y <= c.y + c.h / 2) return c;
  }
  return null;
}

function onLandingCraftDeck(x, y) {
  return !!landingCraftAt(x, y);
}

function updateLandingCraft(dt) {
  if (!G.landingCraft || !G.landingCraft.length) return;
  let anyMoving = false;
  let anyRamping = false;
  for (const c of G.landingCraft) {
    if (c.state === 'approach') {
      anyMoving = true;
      c.y += LANDING_CRAFT_SPEED * dt;
      for (const u of c.onDeck) {
        if (!u.dead) {
          u.x = c.x + (u.deckOffX || 0);
          u.y = c.y + (u.deckOffY || 0);
        }
      }
      if (c.y >= c.shoreY) {
        c.y = c.shoreY;
        c.state = 'ramp';
        c.rampT = 0;
        SFX.brake();
      }
    } else if (c.state === 'ramp') {
      anyRamping = true;
      c.rampT = Math.min(1, c.rampT + dt * 1.8);
      if (c.rampT >= 1) {
        c.state = 'done';
        for (const u of c.onDeck) {
          if (!u.dead) {
            u.onCraft = null;
            u.deckOffX = 0;
            u.deckOffY = 0;
            u.y += rand(4, 14);
            u.x += rand(-10, 10);
          }
        }
        c.onDeck = [];
      }
    }
  }
  if (anyRamping && !G.landingFire) {
    G.landingFire = true;
    showBanner('RAMPS DOWN — TAKE FIRE!');
    SFX.mg();
  }
  if (!anyMoving && !anyRamping && G.phase === 'landing') {
    const active = G.landingCraft.filter(c => c.state !== 'waiting');
    if (active.length && active.every(c => c.state === 'done')) {
      G.phase = 'combat';
      showBanner('WAVE ' + G.wave);
    }
  }
}

function startLandingAssault() {
  if (!inBuildPhase()) return;
  if (!G.enemies.some(e => !e.dead)) return;
  G.phase = 'landing';
  G.landingFire = false;
  clearPlacing();
  showBanner('LANDING CRAFT INBOUND');
  SFX.click();
  for (const c of G.landingCraft) {
    if (c.state === 'waiting') c.state = 'approach';
  }
}

function startAssaultCombat() {
  if (!inBuildPhase()) return;
  if (!G.enemies.some(e => !e.dead)) return;
  if (G.level.landingCraft) {
    startLandingAssault();
    return;
  }
  G.phase = 'combat';
  clearPlacing();
  showBanner('WAVE ' + G.wave);
  SFX.click();
}

function startAxisCombat() {
  startAssaultCombat();
}

function updateAssaultCombat() {
  if (!G.units.some(u => !u.dead)) { victory(); return; }
  if (G.enemies.some(e => !e.dead)) return;
  if (G.breaches >= G.level.winBreaches) { victory(); return; }
  const waves = assaultWaves(G.level);
  if (G.wave >= waves) { gameOver(); return; }
  G.wave++;
  G.tp = axisWavePayout(G.level, G.wave);
  G.phase = 'build';
  G.landingFire = true;
  clearAxisWaveEffects();
  if (G.level.landingCraft) resetLandingCraftForWave(G);
  showBanner('WAVE ' + G.wave + ' - DEPLOY');
}

function resetLandingCraftForWave(G) {
  const slots = [
    { x: W / 2 - 200, y: 42 },
    { x: W / 2 - 70, y: 36 },
    { x: W / 2 + 70, y: 36 },
    { x: W / 2 + 200, y: 42 },
  ];
  G.landingCraft = slots.map(s => ({
    x: s.x, y: s.y, w: 72, h: 34,
    state: 'waiting', rampT: 0, shoreY: LANDING_CRAFT_SHORE_Y,
    onDeck: [],
  }));
}

function updateAxisCombat() {
  updateAssaultCombat();
}

// ============================================================ random events

function barrageForWave(w) {
  const t = clamp((w - 4) / 56, 0, 1); // ramps from wave 4 to ~60
  return {
    count: Math.round(6 + t * 6),
    r: Math.round(48 + t * 14),
    dmg: Math.round(80 + t * 35),
    dMin: 1.5 - t * 0.6,
    dMax: 4.5 - t * 1.8,
    big: w >= 36,
  };
}

// paratroopers drop into the top 2/3 of the field: 4 men minimum,
// growing steadily with the wave count (cut 75% as part of the unit-count reduction pass)
function paradropCount(w) {
  return Math.max(1, Math.round(Math.min(4 + Math.floor(w / 6), 12 + Math.floor(wavesPast99(w) / 10)) * 1.35 * enemySpawnMult(w)));
}

const PARA_POOL = ['erifle', 'erifle', 'esmg', 'esmg', 'egren'];

function triggerParadrop() {
  showBanner('FALLSCHIRMJÄGER! PARATROOPERS!');
  spawnTransportFlyby();
  const w = G.wave;
  const pool = PARA_POOL.slice();
  if (w >= 10) pool.push('emg');
  const count = paradropCount(w);
  const cx = rand(120, W - 120);
  for (let i = 0; i < count; i++) {
    const x = clamp(cx + rand(-120, 120), 20, W - 20);
    const y = rand(40, H * (2 / 3) - 10);
    const e = makeEnemy(pick(pool), x, y);
    // untouchable while the canopy is up; staggered so the stick lands in sequence
    e.chute = rand(2.8, 3.6) + i * 0.2;
    e.chuteMax = e.chute;
    G.enemies.push(e);
  }
}

function triggerEvent() {
  const w = G.wave;
  const events = ['fog', 'fng'];
  if (w >= 4) events.push('barrage');
  if (w >= 12) events.push('barrage');
  if (w >= 24) events.push('barrage');
  if (w >= 40) events.push('barrage');
  if (w >= 8) events.push('airstrike');
  if (w >= 6) events.push('paradrop');
  const ev = pick(events);

  if (ev === 'barrage') {
    const b = barrageForWave(w);
    showBanner(w >= 40 ? 'HEAVY BARRAGE!' : w >= 20 ? 'ARTILLERY INBOUND!' : 'INCOMING BARRAGE!');
    for (let i = 0; i < b.count; i++) {
      scheduleShell(rand(60, W - 60), rand(DEPLOY_Y - 30, H - 40),
        rand(b.dMin, b.dMax), b.r, b.dmg, b.big);
    }
  } else if (ev === 'paradrop') {
    triggerParadrop();
  } else if (ev === 'fog') {
    showBanner('FOG ROLLS IN');
    G.fog = 25.3;
  } else if (ev === 'fng') {
    showBanner('REINFORCEMENTS: FNG REPORTING');
    const u = makeUnit('rifleman', rand(100, W - 100), rand(H - 90, H - 40));
    G.units.push(u);
  } else if (ev === 'airstrike') {
    showBanner('P-47 STRAFING RUN!');
    spawnStrafeRun(rand(120, W - 120));
  }
}

function showBanner(text) {
  G.banner = { text, ttl: 3.2 };
}

// ============================================================ ordnance

function scheduleShell(x, y, delay, r, dmg, big, by, kind) {
  const s = { x, y, timer: delay, dur: delay, r, dmg, big, by, kind };
  G.shells.push(s);
  return s;
}

function explode(x, y, r, dmg, big, by) {
  SFX.boom(big);
  addGroundMark({ type: 'crater', x, y, r, rot1: rand(0, 3), rot2: rand(0, 3) });

  G.flashes.push({ x, y, r: r * 1.15, ttl: 0.22, max: 0.22 });
  for (let i = 0; i < 26; i++) {
    G.particles.push({
      x, y, vx: rand(-90, 90), vy: rand(-160, -20),
      ttl: rand(0.4, 1.1), grav: 220, size: rand(1.5, 3.5),
      color: pick(['#3c3325', '#57492f', '#6e6046', '#2a2318']),
    });
  }

  const hitArea = (e) => {
    const d = dist(e, { x, y });
    if (d > r) return 0;
    let hd = dmg * (1 - (d / r) * 0.7) * rand(0.8, 1.2);
    if (e.prone > 0) hd *= 0.5;   // flat on the ground, under most of the blast
    return hd;
  };
  // HE vs armor: anything that carries its own armorMult (bazooka rockets,
  // the V2 warhead) hits armored/wheeled targets far harder than it hits flesh
  const blastArmorMult = by && by.t && (by.t.rocket || by.t.v2) && (by.t.rocket || by.t.v2).armorMult;
  for (const e of G.enemies) {
    if (e.chute > 0) continue;   // blast passes under the descending stick
    let hd = hitArea(e);
    if (hd > 0) {
      if (e.t.tank) {
        hd *= blastArmorMult != null ? blastArmorMult : 2.2;
      } else if ((e.t.vehicle || e.t.apc) && blastArmorMult != null) {
        hd *= blastArmorMult;
      } else if (e.t.blastResist) hd *= (1 - e.t.blastResist);
      damageEnemy(e, hd, by || { x, y });
    }
  }
  for (const u of G.units) {
    let hd = hitArea(u);
    if (hd > 0) {
      if (u.t.tank) {
        if (blastArmorMult != null) hd *= blastArmorMult;
      } else if ((u.t.vehicle || u.t.apc) && blastArmorMult != null) {
        hd *= blastArmorMult;
      } else if (u.t.blastResist) hd *= (1 - u.t.blastResist);
      damageUnit(u, hd, { x, y });
    }
  }
  for (const s of G.sandbags) {
    if (dist(s, { x, y }) < r) s.hp -= dmg * 0.8;
  }
  for (const b of G.bunkers) {
    // reinforced concrete: blast does far less than it would to sandbags
    if (dist(b, { x, y }) < r) b.hp -= dmg * 0.4;
  }
  for (const wt of G.watchtowers) {
    if (dist(wt, { x, y }) < r) wt.hp -= dmg * 0.8;
  }
  for (const cn of G.camoNests) {
    // no concrete to absorb it — brush and dugout timber crack fast
    if (dist(cn, { x, y }) < r) cn.hp -= dmg * CAMONEST_EXPLOSIVE_MULT;
  }
  for (const wr of G.wires) {
    if (Math.abs(wr.x - x) < r + 35 && Math.abs(wr.y - y) < r) wr.hp -= dmg;
  }
  for (const m of G.mines) {
    if (!m.dead && dist(m, { x, y }) < r * 0.8) {
      m.dead = true;
      explode(m.x, m.y, 42, 120, false);
    }
  }
}

// the V2's warhead lands like any other shell, but it's a much bigger event:
// a second, wider flash ring and a churning debris column on top of the
// normal blast so it reads as something far worse than a mortar round
function explodeV2(x, y, r, dmg, by) {
  explode(x, y, r, dmg, true, by);
  G.flashes.push({ x, y, r: r * 1.7, ttl: 0.4, max: 0.4 });
  G.flashes.push({ x, y, r: r * 0.9, ttl: 0.55, max: 0.55 });
  for (let i = 0; i < 50; i++) {
    const ang = rand(0, Math.PI * 2);
    G.particles.push({
      x, y, vx: Math.cos(ang) * rand(40, 200), vy: Math.sin(ang) * rand(40, 200) - 40,
      ttl: rand(0.7, 1.6), grav: 160, size: rand(2, 5),
      color: pick(['#2a2318', '#4a3d28', '#6e6046', '#948564', '#1a1712']),
    });
  }
}

// P-47 pass: roars in from behind the friendly line and hoses the field
// with eight .50 cals on its way out, walking fire up its flight path

function spawnTransportFlyby() {
  const dir = Math.random() < 0.5 ? 1 : -1;
  G.planes.push({
    role: 'flyby',
    transport: true,
    x: dir > 0 ? -90 : W + 90,
    y: rand(70, H * 0.45),
    vx: dir * rand(240, 320),
    vy: rand(-12, 12),
    sfxT: 0,
    flybyPlayed: false,
    done: false,
  });
}

function spawnStrafeRun(x) {
  const speed = 380;
  const startY = H + 70;
  SFX.planeFlyby();
  G.planes.push({
    role: 'strafe',
    x, y: startY, speed,
    drift: rand(-10, 10),
    gunT: 0.4, sfxT: 0, gunSfxT: 0,
    flybyPlayed: true,
    done: false,
  });
  // a stick of bombs timed to burst right as the plane passes overhead
  for (let i = 0; i < 3; i++) {
    const by = 90 + i * 95;
    scheduleShell(x + rand(-22, 22), by, (startY - by) / speed + 0.12, 42, 90, false);
  }
}

function updatePlane(p, dt) {
  if (p.role === 'flyby') {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (!p.flybyPlayed) {
      p.flybyPlayed = true;
      SFX.planeFlyby();
    }
    p.sfxT -= dt;
    if (p.sfxT <= 0) { p.sfxT = 0.14; SFX.plane(); }
    if (p.vx > 0 && p.x > W + 100) p.done = true;
    if (p.vx < 0 && p.x < -100) p.done = true;
    return;
  }

  p.y -= p.speed * dt;
  p.x += p.drift * dt;

  p.sfxT -= dt;
  if (p.sfxT <= 0) { p.sfxT = 0.09; SFX.plane(); }

  // guns hold fire until the nose is past the trench line
  if (p.y < DEPLOY_Y + 40 && p.y > 40) {
    p.gunT -= dt;
    while (p.gunT <= 0) {
      p.gunT += 0.035;
      // rounds strike well ahead of the aircraft
      const ix = p.x + rand(-16, 16);
      const iy = p.y - rand(70, 150);
      if (iy < 0) continue;

      G.tracers.push({ x1: p.x + rand(-4, 4), y1: p.y - 20, x2: ix, y2: iy, ttl: 0.07 });
      G.particles.push({
        x: ix, y: iy, vx: rand(-25, 25), vy: rand(-70, -20),
        ttl: rand(0.2, 0.45), grav: 260, size: rand(1.2, 2.2),
        color: pick(['#6e6046', '#57492f', '#8a7a5a']),
      });

      p.gunSfxT = (p.gunSfxT || 0) - 0.035;
      if (p.gunSfxT <= 0) { p.gunSfxT = 0.09; SFX.hmg(); }

      for (const e of G.enemies) {
        if (e.dead) continue;
        if (dist(e, { x: ix, y: iy }) < 13) {
          let dmg = rand(14, 26);
          if (e.t.tank) dmg *= 0.15; // even .50 cal only chips a Panzer
          damageEnemy(e, dmg, { x: ix, y: iy });
        }
      }
    }
  }

  if (p.y < -90) p.done = true;
}

function drawPlane(p) {
  const c = ctx;
  const flyby = p.role === 'flyby';
  const facing = flyby ? (p.vx > 0 ? 1 : -1) : 0;

  // shadow racing along the ground
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.save();
  if (flyby) {
    c.translate(p.x, p.y + 28);
    c.beginPath(); c.ellipse(0, 0, 26, 8, 0, 0, 7); c.fill();
  } else {
    c.translate(p.x + 26, p.y + 34);
    c.beginPath(); c.ellipse(0, 0, 9, 20, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(0, -2, 22, 5, 0, 0, 7); c.fill();
  }
  c.restore();

  c.save();
  c.translate(p.x, p.y);
  if (flyby) c.rotate(facing > 0 ? Math.PI / 2 : -Math.PI / 2);

  const body = p.transport ? '#4a4840' : '#3f4a3a';
  const wing = p.transport ? '#535048' : '#46523f';

  // fuselage, nose pointed up-field (or along flyby heading after rotate)
  c.fillStyle = body;
  c.beginPath(); c.ellipse(0, 0, 6, 21, 0, 0, 7); c.fill();
  // wings
  c.fillStyle = wing;
  c.beginPath(); c.ellipse(0, -2, 30, 7, 0, 0, 7); c.fill();
  // tailplane
  c.beginPath(); c.ellipse(0, 16, 12, 4, 0, 0, 7); c.fill();
  // canopy
  c.fillStyle = '#20261e';
  c.beginPath(); c.ellipse(0, 2, 3, 6, 0, 0, 7); c.fill();
  // spinning prop disc
  c.fillStyle = 'rgba(200,200,180,0.25)';
  c.beginPath(); c.ellipse(0, -21, 11, 2.5, 0, 0, 7); c.fill();
  // US roundels on fighter strafers only
  if (!p.transport) {
    c.fillStyle = 'rgba(230,230,220,0.9)';
    c.beginPath(); c.arc(-20, -2, 3, 0, 7); c.fill();
    c.beginPath(); c.arc(20, -2, 3, 0, 7); c.fill();
  }

  // wing gun muzzle flashes while firing
  if (!flyby && p.y < DEPLOY_Y + 40 && p.y > 40) {
    c.fillStyle = 'rgba(255,220,120,0.9)';
    for (const gx of [-14, -8, 8, 14]) {
      if (Math.random() < 0.6) {
        c.beginPath(); c.arc(gx, -8 - rand(0, 3), rand(1, 2.2), 0, 7); c.fill();
      }
    }
  }
  c.restore();
}

// ============================================================ damage & death

function bloodSplat(x, y, amount) {
  for (let i = 0; i < amount; i++) {
    G.particles.push({
      x, y, vx: rand(-70, 70), vy: rand(-90, 10),
      ttl: rand(0.25, 0.7), grav: 260, size: rand(1, 2.5),
      color: pick(['#7a1410', '#95201a', '#5c0e0a']),
    });
  }
  addGroundMark({
    type: 'blood',
    x: x + rand(-6, 6), y: y + rand(-4, 8),
    rx: rand(3, 9), ry: rand(2, 6), rot: rand(0, 3),
    color: `rgba(${randi(90, 130)},${randi(10, 22)},${randi(8, 16)},${rand(0.25, 0.5)})`,
  });
}

const CORPSE_TTL = 120; // bodies are carried off after two minutes
const GROUND_MARK_TTL = 120; // blood stains and blast craters fade after two minutes

function addGroundMark(mark) {
  G.groundMarks.push({ ttl: GROUND_MARK_TTL, ...mark });
}

function drawGroundMark(m, c) {
  const alpha = clamp(m.ttl / 8, 0, 1);
  c.save();
  c.globalAlpha = alpha;
  if (m.type === 'blood') {
    c.fillStyle = m.color;
    c.beginPath();
    c.ellipse(m.x, m.y, m.rx, m.ry, m.rot, 0, 7);
    c.fill();
  } else if (m.type === 'bloodpool') {
    c.fillStyle = m.color;
    c.translate(m.x, m.y);
    c.rotate(m.rot);
    c.beginPath(); c.ellipse(0, 2, 13, 8, 0, 0, 7); c.fill();
  } else if (m.type === 'crater') {
    c.translate(m.x, m.y);
    c.fillStyle = 'rgba(30,26,18,0.55)';
    c.beginPath(); c.ellipse(0, 0, m.r * 0.55, m.r * 0.42, m.rot1, 0, 7); c.fill();
    c.fillStyle = 'rgba(20,17,12,0.6)';
    c.beginPath(); c.ellipse(0, 0, m.r * 0.3, m.r * 0.22, m.rot2, 0, 7); c.fill();
  }
  c.restore();
}

function spawnCorpse(a) {
  addGroundMark({
    type: 'bloodpool', x: a.x, y: a.y, rot: rand(0, Math.PI * 2),
    color: `rgba(${randi(90, 120)},${randi(10, 20)},10,0.45)`,
  });
  G.corpses.push({ x: a.x, y: a.y, rot: rand(0, Math.PI * 2), side: a.side, nation: a.nation, ttl: CORPSE_TTL });
}

function drawCorpse(cp) {
  const alpha = clamp(cp.ttl / 8, 0, 1); // fade out over the last seconds
  const us = (cp.nation || cp.side) === 'us';
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cp.x, cp.y);
  ctx.rotate(cp.rot);
  ctx.fillStyle = us ? '#33402c' : '#4a4a40';
  ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = us ? '#5b6b4a' : '#61615a';
  ctx.beginPath(); ctx.arc(7, 0, 3.4, 0, 7); ctx.fill();
  ctx.restore();
}

function stampWreck(e) {
  gctx.save();
  gctx.translate(e.x, e.y);
  gctx.fillStyle = '#2e2c26';
  gctx.fillRect(-20, -14, 40, 28);
  gctx.fillStyle = '#211f1a';
  gctx.beginPath(); gctx.arc(0, 0, 10, 0, 7); gctx.fill();
  gctx.restore();
}

function damageUnit(u, dmg, from) {
  u.hp -= dmg;
  if (u.t.tank || u.t.vehicle) {
    G.particles.push({
      x: u.x + rand(-10, 10), y: u.y + rand(-10, 10), vx: 0, vy: -20,
      ttl: 0.4, grav: 0, size: 2, color: '#c8b872',
    });
  } else {
    bloodSplat(u.x, u.y, 3);
  }
  if (u.hp <= 0 && !u.dead) {
    u.dead = true;
    // when the player fights as the Germans, downed US defenders are his kills
    if (isAssaultMode() || G.mode === 'hitsquad') {
      G.kills++;
    }
    if (u.t.tank) {
      stampWreck(u);
      explode(u.x, u.y, 50, 60, true);
    } else if (u.t.vehicle) {
      stampJeepWreck(u);
      explode(u.x, u.y, 30, 45, false);
    } else if (u.t.atgun) {
      stampATGunWreck(u);
      explode(u.x, u.y, 26, 35, false);
    } else {
      spawnCorpse(u);
      bloodSplat(u.x, u.y, 8);
    }
    const si = G.selected.indexOf(u);
    if (si !== -1) G.selected.splice(si, 1);
  }
  // taking real fire (bullets, shells) sends a man diving; flame's tiny
  // per-tick damage is handled in flameSpray with a time-scaled roll
  if (dmg >= 3) tryGoProne(u, 0.65);
}

function gainXP(u) {
  u.xp++;
  const next = RANKS[u.rank + 1];
  const rankMult = u.t.tank ? 5 : (u.t.rankMult || 1);
  const need = next && next.kills * rankMult;
  if (next && u.xp >= need) {
    u.rank++;
    const heal = 15 * (u.t.rankHealMult || 1);
    u.hp = Math.min(u.maxhp, u.hp + heal);   // a promotion is good for morale
    G.texts.push({ x: u.x, y: u.y - 22, text: 'PROMOTED: ' + next.name, ttl: 2.4 });
  }
}

function creditKill(u) {
  // only living friendly soldiers earn XP (explosions pass a plain {x,y})
  if (!u || u.side !== 'us' || u.dead) return;
  gainXP(u);
}

function damageEnemy(e, dmg, from) {
  if (e.chute > 0) return; // untouchable while the canopy is up
  e.hp -= dmg;
  if (e.t.tank || e.t.vehicle || e.t.v2) {
    G.particles.push({
      x: e.x + rand(-10, 10), y: e.y + rand(-10, 10), vx: 0, vy: -20,
      ttl: 0.4, grav: 0, size: 2, color: '#c8b872',
    });
  } else {
    bloodSplat(e.x, e.y, 3);
  }
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    // when attacking, dead Germans are your losses, not your payday —
    // but the US defenders who scored the kill still gain experience
    if (!isAssaultMode() && G.mode !== 'hitsquad') {
      G.kills++;
      earnTP(e.t.reward);
    }
    creditKill(from);
    if (e.t.tank) {
      stampWreck(e);
      explode(e.x, e.y, 50, 60, true);
    } else if (e.t.bike) {
      // bike shot out from under the crew: it crashes with both men aboard
      stampBike(e, true);
      bloodSplat(e.x, e.y, 10);
    } else if (e.t.apc) {
      stampHalftrackWreck(e);
      explode(e.x, e.y, 38, 55, false);
    } else if (e.t.vehicle) {
      stampJeepWreck(e);
      explode(e.x, e.y, 30, 45, false);
    } else if (e.t.v2) {
      // the battery itself going up is a big secondary explosion — the
      // warhead and fuel still on the pad don't go quietly
      stampV2Wreck(e);
      explode(e.x, e.y, 65, 100, true);
    } else {
      spawnCorpse(e);
      bloodSplat(e.x, e.y, 8);
    }
    // hit-squad mode: drop the fallen man from the player's selection
    const si = G.selected.indexOf(e);
    if (si !== -1) G.selected.splice(si, 1);
  }
  if (dmg >= 3) tryGoProne(e, 0.65);
}

// ============================================================ shooting

function fogMult() { return G.fog > 0 ? 0.6 : 1; }

// infantry under fire hit the dirt: prone men can't shoot but dodge 60% of
// incoming rounds. Veterans get back up fast; green troops stay down a while.
function tryGoProne(u, chance) {
  if (!u || u.dead || !u.t || u.chute > 0) return;
  if (u.t.tank || u.t.vehicle || u.t.apc || u.t.bike || u.t.fixed) return;   // crews don't dive
  if (u.prone > 0 || u.proneCd > 0 || u.moveTo) return;          // running men keep running
  if (Math.random() >= chance) return;
  const rank = u.rank || 0;   // Germans carry no rank and eat dirt the longest
  u.prone = rand(2.5, 4.5) * (1 - rank * 0.15);
}

function coverBlock(target) {
  // friendly units near sandbags dodge some incoming fire (vehicles don't duck)
  if (target.side !== 'us' || target.t.tank || target.t.vehicle) return false;
  // bunker walls first: they stop more fire and barely notice small arms
  for (const b of G.bunkers) {
    if (b.hp > 0 && dist(b, target) < (b.up ? 40 : 36)) {
      if (Math.random() < (b.up ? 0.85 : 0.75)) { b.hp -= b.up ? 1 : 2; return true; }
    }
  }
  for (const s of G.sandbags) {
    // fortified bags stop more and shrug off hits better
    if (s.hp > 0 && dist(s, target) < (s.up ? 36 : 32)) {
      if (Math.random() < (s.up ? 0.65 : 0.5)) { s.hp -= s.up ? 3 : 4; return true; }
    }
  }
  // watch tower: spotters call out incoming fire, a flat 10% dodge for anyone under it
  for (const wt of G.watchtowers) {
    if (wt.hp > 0 && dist(wt, target) < WATCHTOWER_AURA) {
      if (Math.random() < 0.1) { wt.hp -= 3; return true; }
    }
  }
  return false;
}

// camo nest: allied infantry standing in its zone are invisible to enemy
// targeting until they open fire, then stay exposed for a few seconds after
// their last shot. Vehicles and fixed guns are too big to hide in one.
function camoNestAt(u) {
  for (const cn of G.camoNests) {
    if (cn.hp > 0 && dist(cn, u) < CAMONEST_ZONE) return cn;
  }
  return null;
}

function isCamouflaged(u) {
  if (u.side !== 'us' || u.dead || u.t.tank || u.t.vehicle || u.t.apc || u.t.bike || u.t.atgun) return false;
  if (u.camoExposed > 0) return false;
  return !!camoNestAt(u);
}

function markCamoFired(u) {
  if (u.side !== 'us') return;
  const cn = camoNestAt(u);
  if (cn) u.camoExposed = cn.up ? CAMONEST_REVEAL_FORTIFIED : CAMONEST_REVEAL;
}

function fireShot(shooter, target, opts) {
  // opts.weapon substitutes different gun stats (e.g. a tank's coaxial MG)
  const t = (opts && opts.weapon) || shooter.t;
  shooter.face = Math.atan2(target.y - shooter.y, target.x - shooter.x);
  markCamoFired(shooter);
  const mx = shooter.x + Math.cos(shooter.face) * (t.gun + 3);
  const my = shooter.y + Math.sin(shooter.face) * (t.gun + 3);
  SFX[t.sfx]();
  G.flashes.push({ x: mx, y: my, r: 5, ttl: 0.05, max: 0.05 });

  let acc = t.acc * (opts && opts.accBonus ? 1 + opts.accBonus : 1);
  const d = dist(shooter, target);
  acc *= clamp(1.15 - d / (unitRange(shooter, t.range) * 1.6), 0.35, 1);

  let hx = target.x, hy = target.y;
  const hit = Math.random() < acc;
  if (!hit) { hx += rand(-22, 22); hy += rand(-16, 22); }

  G.tracers.push({
    x1: mx, y1: my, x2: hx, y2: hy, ttl: 0.06,
    fromBar: shooter.type === 'gunner',
  });

  if (hit) {
    // a prone man is a small target: 60% of rounds kick dirt over him.
    // Rolled separately from sandbag cover, so the two stack multiplicatively.
    if (target.prone > 0 && Math.random() < 0.6) {
      G.particles.push({ x: hx + rand(-6, 6), y: hy + 4, vx: rand(-25, 25), vy: rand(-55, -20), ttl: 0.3, grav: 200, size: 1.3, color: '#6e6046' });
      return;
    }
    if (coverBlock(target)) {
      G.particles.push({ x: hx, y: hy + 6, vx: rand(-20, 20), vy: -40, ttl: 0.3, grav: 150, size: 1.5, color: '#b8a878' });
      return;
    }
    let dmg = t.dmg * rand(0.75, 1.25) * (opts && opts.dmgMult ? opts.dmgMult : 1);
    if (target.t && target.t.tank) dmg *= 0.04;   // rifle rounds ping off armor
    else if (target.t && target.t.apc) dmg *= 0.3; // halftrack plate shrugs off most of it
    if (target.side === 'us') damageUnit(target, dmg, shooter);
    else damageEnemy(target, dmg, shooter);
  } else {
    G.particles.push({ x: hx, y: hy, vx: rand(-15, 15), vy: rand(-50, -10), ttl: 0.25, grav: 200, size: 1.2, color: '#6e6046' });
    // a near miss is warning enough to hit the dirt
    tryGoProne(target, 0.4);
  }
}

// generic weapon logic shared by both sides
function runWeapon(actor, target, dt, buffs) {
  const t = actor.t;
  const rofMult = buffs && buffs.rofMult ? buffs.rofMult : 1;
  actor.cd -= dt;
  if (actor.burstLeft > 0) {
    actor.burstTimer -= dt;
    if (actor.burstTimer <= 0) {
      if (target) fireShot(actor, target, buffs);
      actor.burstLeft--;
      // veteran automatic gunners hold tighter, faster bursts too
      actor.burstTimer = t.burstGap * rofMult;
    }
    return;
  }
  if (target && actor.cd <= 0) {
    actor.cd = t.rof * rofMult * rand(0.85, 1.15);
    if (t.burst > 1) {
      actor.burstLeft = t.burst;
      actor.burstTimer = 0;
    } else {
      fireShot(actor, target, buffs);
    }
  }
}

// ============================================================ targeting

function nearestEnemyInRange(u, range, pred) {
  let best = null, bd = range;
  for (const e of G.enemies) {
    if (e.dead || e.y < 0 || e.chute > 0) continue;
    if (pred && !pred(e)) continue;
    const d = dist(u, e);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function sniperTarget(u, range) {
  let best = null, bp = -1, bd = Infinity;
  for (const e of G.enemies) {
    if (e.dead || e.t.tank || e.y < 0 || e.chute > 0) continue;
    const d = dist(u, e);
    if (d > range) continue;
    if (e.t.priority > bp || (e.t.priority === bp && d < bd)) {
      bp = e.t.priority; bd = d; best = e;
    }
  }
  return best;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function vehicleHomeFace(a) {
  return a.side === 'us' ? -Math.PI / 2 : Math.PI / 2;
}

function vehicleHullAngle(a) {
  const home = vehicleHomeFace(a);
  return a.moveTo
    ? Math.atan2(a.moveTo.y - a.y, a.moveTo.x - a.x)
    : home;
}

function inFireCone(shooter, target, bearing, arc) {
  return Math.abs(angleDiff(Math.atan2(target.y - shooter.y, target.x - shooter.x), bearing)) <= arc;
}

function drawFireCone(x, y, bearing, arc, range, alpha) {
  ctx.strokeStyle = `rgba(255,255,255,${alpha != null ? alpha : 0.35})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, bearing - arc, bearing + arc);
  ctx.closePath();
  ctx.stroke();
}

// anti-tank traverse wedge — steel fill, bright arc edges
function drawATGunRangeCone(x, y, bearing, arc, range, alpha) {
  const a = alpha != null ? alpha : 0.35;
  const tipX = x + Math.cos(bearing) * range * 0.7;
  const tipY = y + Math.sin(bearing) * range * 0.7;
  const grad = ctx.createLinearGradient(x, y, tipX, tipY);
  grad.addColorStop(0, `rgba(200,210,230,${a * 0.48})`);
  grad.addColorStop(0.45, `rgba(160,175,200,${a * 0.3})`);
  grad.addColorStop(1, `rgba(80,90,110,${a * 0.07})`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, bearing - arc, bearing + arc);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(230,238,255,${Math.min(0.92, a * 1.25)})`;
  ctx.lineWidth = 1.35;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, bearing - arc, bearing + arc);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.88, a * 1.15)})`;
  ctx.lineWidth = 1;
  for (const ang of [bearing - arc, bearing + arc]) {
    const ox = x + Math.cos(ang) * range;
    const oy = y + Math.sin(ang) * range;
    const tx = Math.cos(ang + Math.PI / 2);
    const ty = Math.sin(ang + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(ox - tx * 5, oy - ty * 5);
    ctx.lineTo(ox + tx * 5, oy + ty * 5);
    ctx.stroke();
  }
}

// warm wedge for flamethrower reach — selection overlay and placement ghost
function drawFlameRangeCone(x, y, bearing, arc, range, alpha) {
  const a = alpha != null ? alpha : 0.35;
  const tipX = x + Math.cos(bearing) * range * 0.65;
  const tipY = y + Math.sin(bearing) * range * 0.65;
  const grad = ctx.createLinearGradient(x, y, tipX, tipY);
  grad.addColorStop(0, `rgba(255,210,90,${a * 0.55})`);
  grad.addColorStop(0.45, `rgba(255,120,30,${a * 0.35})`);
  grad.addColorStop(1, `rgba(180,50,15,${a * 0.08})`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, bearing - arc, bearing + arc);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(255,180,60,${a * 0.85})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
}

// buckshot spread wedge — selection overlay and placement ghost
function drawBuckshotCone(x, y, bearing, arc, range, alpha) {
  const a = alpha != null ? alpha : 0.35;
  const tipX = x + Math.cos(bearing) * range * 0.58;
  const tipY = y + Math.sin(bearing) * range * 0.58;
  const grad = ctx.createLinearGradient(x, y, tipX, tipY);
  grad.addColorStop(0, `rgba(210,200,170,${a * 0.52})`);
  grad.addColorStop(0.45, `rgba(170,160,130,${a * 0.32})`);
  grad.addColorStop(1, `rgba(90,85,70,${a * 0.07})`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, bearing - arc, bearing + arc);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(230,220,190,${a * 0.8})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, bearing - arc, bearing + arc);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
}

// long-range sight line — bright reticle ring with crosshair ticks
function drawSniperRangeRing(x, y, range, alpha) {
  const a = alpha != null ? alpha : 0.45;
  ctx.fillStyle = `rgba(210, 225, 255, ${a * 0.12})`;
  ctx.beginPath(); ctx.arc(x, y, range, 0, 7); ctx.fill();
  ctx.strokeStyle = `rgba(235, 245, 255, ${Math.min(0.92, a * 1.35)})`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([10, 5]);
  ctx.beginPath(); ctx.arc(x, y, range, 0, 7); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.95, a * 1.5)})`;
  ctx.lineWidth = 1.15;
  for (let i = 0; i < 8; i++) {
    const ang = i * Math.PI / 4;
    const ox = x + Math.cos(ang) * range;
    const oy = y + Math.sin(ang) * range;
    const tx = Math.cos(ang + Math.PI / 2);
    const ty = Math.sin(ang + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(ox - tx * 6, oy - ty * 6);
    ctx.lineTo(ox + tx * 6, oy + ty * 6);
    ctx.stroke();
  }
  ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.85, a * 1.25)})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y);
  ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7);
  ctx.stroke();
  ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.9, a * 1.4)})`;
  ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill();
}

// muzzle flash while the trench gun fires
function drawShotgunBlast(actor) {
  if (!actor.shotgunBlastT || actor.shotgunBlastT <= 0 || !actor.t.shotgun) return;
  const sg = actor.t.shotgun;
  const range = unitRange(actor, sg.range) * fogMult() * 0.38;
  const bearing = actor.face;
  const fx = Math.cos(bearing), fy = Math.sin(bearing);
  const nx = actor.x + fx * (actor.t.gun + 2);
  const ny = actor.y + fy * (actor.t.gun + 2);
  const alpha = clamp(actor.shotgunBlastT / 0.12, 0, 1);
  const tipX = nx + fx * range;
  const tipY = ny + fy * range;

  ctx.save();
  const grad = ctx.createLinearGradient(nx, ny, tipX, tipY);
  grad.addColorStop(0, `rgba(255,245,200,${0.7 * alpha})`);
  grad.addColorStop(0.35, `rgba(230,200,130,${0.45 * alpha})`);
  grad.addColorStop(1, 'rgba(140,120,90,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(nx, ny);
  ctx.arc(nx, ny, range, bearing - sg.arc * 0.72, bearing + sg.arc * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgba(255,230,160,${0.9 * alpha})`;
  ctx.beginPath(); ctx.arc(nx, ny, 3.2, 0, 7); ctx.fill();
  ctx.restore();
}

// indirect-fire annulus — max range ring plus inner dead zone
function drawMortarRangeRing(x, y, minR, maxR, alpha) {
  const a = alpha != null ? alpha : 0.35;
  ctx.fillStyle = `rgba(130,140,110,${a * 0.14})`;
  ctx.beginPath(); ctx.arc(x, y, maxR, 0, 7); ctx.fill();
  ctx.strokeStyle = `rgba(190,200,160,${a * 0.78})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.arc(x, y, maxR, 0, 7); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = `rgba(200,75,55,${a * 0.1})`;
  ctx.beginPath(); ctx.arc(x, y, minR, 0, 7); ctx.fill();
  ctx.strokeStyle = `rgba(210,90,65,${a * 0.7})`;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.arc(x, y, minR, 0, 7); ctx.stroke();
  ctx.setLineDash([]);
}

// 60mm mortar round — body, fuze, tail fins
function drawMortarRound(c, x, y, scale, rot) {
  scale = scale || 1;
  rot = rot != null ? rot : 0;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = '#3a4034';
  c.beginPath();
  c.ellipse(0, 0, 1.1 * scale, 2.4 * scale, 0, 0, 7);
  c.fill();
  c.strokeStyle = '#2a2e24';
  c.lineWidth = 0.55 * scale;
  c.stroke();
  c.fillStyle = '#c8a858';
  c.beginPath(); c.arc(0, -2.1 * scale, 0.75 * scale, 0, 7); c.fill();
  c.strokeStyle = '#5a5c48';
  c.lineWidth = 0.65 * scale;
  for (const off of [-0.55, 0, 0.55]) {
    c.beginPath();
    c.moveTo(off * scale, 1.8 * scale);
    c.lineTo(off * scale * 1.6, 3.4 * scale);
    c.stroke();
  }
  c.restore();
}

// M2 60mm mortar tube, baseplate, and bipod beside the crewman
function drawMortarTube(c, face, fx, fy, blastT) {
  const kick = blastT > 0 ? clamp(blastT / 0.18, 0, 1) : 0;
  const bx = -fx * 7.2 - fy * 2.8;
  const by = -fy * 7.2 + fx * 2.8;
  const tubeAng = face - 0.58 - kick * 0.12;
  const tubeLen = 10.5;
  const tx = bx + Math.cos(tubeAng) * tubeLen;
  const ty = by + Math.sin(tubeAng) * tubeLen;

  c.fillStyle = '#2f3328';
  c.beginPath(); c.ellipse(bx, by, 4.8, 3.1, face + 0.25, 0, 7); c.fill();
  c.strokeStyle = '#1e2018';
  c.lineWidth = 1;
  c.stroke();
  c.fillStyle = '#3a3c30';
  c.beginPath(); c.ellipse(bx, by, 2.8, 1.6, face + 0.25, 0, 7); c.fill();

  c.strokeStyle = '#5a5c42';
  c.lineWidth = 3.6;
  c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.stroke();
  c.strokeStyle = '#26261e';
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(bx + Math.cos(tubeAng) * 2, by + Math.sin(tubeAng) * 2);
  c.lineTo(tx, ty);
  c.stroke();

  const midX = bx + Math.cos(tubeAng) * 4.2;
  const midY = by + Math.sin(tubeAng) * 4.2;
  c.strokeStyle = '#4a4a3e';
  c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(midX, midY); c.lineTo(midX - fy * 4.5, midY + fx * 4.5); c.stroke();
  c.beginPath(); c.moveTo(midX, midY); c.lineTo(midX + fy * 3.5, midY - fx * 3.5); c.stroke();

  c.strokeStyle = '#3a3830';
  c.lineWidth = 2;
  c.beginPath(); c.arc(tx, ty, 1.9, 0, 7); c.stroke();
  c.fillStyle = '#1c1c16';
  c.beginPath(); c.arc(tx, ty, 0.9, 0, 7); c.fill();

  if (blastT > 0) {
    const alpha = clamp(blastT / 0.18, 0, 1);
    c.fillStyle = `rgba(255,225,150,${0.8 * alpha})`;
    c.beginPath(); c.arc(tx, ty, 2.2 + alpha * 2.5, 0, 7); c.fill();
    c.fillStyle = `rgba(255,160,60,${0.45 * alpha})`;
    c.beginPath(); c.arc(tx, ty, 4 + alpha * 3, 0, 7); c.fill();
  }
  return { tx, ty, bx, by };
}

// 8.1 cm Granatwerfer 34 — saddle yoke, wide baseplate, heavy bipod
function drawGranatwerferTube(c, face, fx, fy, blastT) {
  const kick = blastT > 0 ? clamp(blastT / 0.18, 0, 1) : 0;
  const bx = -fx * 7.5 - fy * 2.5;
  const by = -fy * 7.5 + fx * 2.5;
  const tubeAng = face - 0.55 - kick * 0.1;
  const tubeLen = 12.2;
  const tx = bx + Math.cos(tubeAng) * tubeLen;
  const ty = by + Math.sin(tubeAng) * tubeLen;

  c.fillStyle = '#2a2c24';
  c.beginPath(); c.ellipse(bx, by, 5.5, 3.4, face + 0.2, 0, 7); c.fill();
  c.strokeStyle = '#1a1c16';
  c.lineWidth = 1.1;
  c.stroke();
  c.fillStyle = '#3a3c32';
  c.beginPath(); c.ellipse(bx, by, 3.4, 1.9, face + 0.2, 0, 7); c.fill();
  c.strokeStyle = '#4a4c40';
  c.lineWidth = 0.75;
  c.beginPath();
  c.moveTo(bx - fy * 3.2, by + fx * 3.2);
  c.lineTo(bx + fy * 3.2, by - fx * 3.2);
  c.stroke();

  c.strokeStyle = '#4a4c42';
  c.lineWidth = 4.2;
  c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.stroke();
  c.strokeStyle = '#2e3028';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(bx + Math.cos(tubeAng) * 2.2, by + Math.sin(tubeAng) * 2.2);
  c.lineTo(tx, ty);
  c.stroke();

  const midX = bx + Math.cos(tubeAng) * 4.5;
  const midY = by + Math.sin(tubeAng) * 4.5;
  c.strokeStyle = '#3a3c34';
  c.lineWidth = 2.2;
  c.beginPath(); c.arc(midX, midY, 2.4, 0, 7); c.stroke();

  c.strokeStyle = '#3a3830';
  c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(midX, midY); c.lineTo(midX - fy * 5.2, midY + fx * 5.2); c.stroke();
  c.beginPath(); c.moveTo(midX, midY); c.lineTo(midX + fy * 4.2, midY - fx * 4.2); c.stroke();
  c.fillStyle = '#2a2820';
  c.beginPath(); c.arc(midX - fy * 5.2, midY + fx * 5.2, 1.1, 0, 7); c.fill();
  c.beginPath(); c.arc(midX + fy * 4.2, midY - fx * 4.2, 1.1, 0, 7); c.fill();

  c.strokeStyle = '#3a3830';
  c.lineWidth = 2.4;
  c.beginPath(); c.arc(tx, ty, 2.2, 0, 7); c.stroke();
  c.fillStyle = '#1c1c16';
  c.beginPath(); c.arc(tx, ty, 1.05, 0, 7); c.fill();

  c.strokeStyle = '#4a4840';
  c.lineWidth = 1.3;
  c.beginPath(); c.arc(bx - fx * 0.8, by - fy * 0.8, 1.4, 0, 7); c.stroke();

  if (blastT > 0) {
    const alpha = clamp(blastT / 0.18, 0, 1);
    c.fillStyle = `rgba(255,225,150,${0.85 * alpha})`;
    c.beginPath(); c.arc(tx, ty, 2.8 + alpha * 3, 0, 7); c.fill();
    c.fillStyle = `rgba(255,140,50,${0.5 * alpha})`;
    c.beginPath(); c.arc(tx, ty, 5 + alpha * 3.5, 0, 7); c.fill();
  }
  return { tx, ty, bx, by, midX, midY };
}

// 8.1 cm Wgr round — olive body, four tail fins, booster band
function drawGrw81Round(c, x, y, scale, rot) {
  scale = scale || 1;
  rot = rot != null ? rot : 0;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = '#4a4e3e';
  c.beginPath();
  c.ellipse(0, 0, 1.35 * scale, 2.8 * scale, 0, 0, 7);
  c.fill();
  c.strokeStyle = '#2a2e22';
  c.lineWidth = 0.6 * scale;
  c.stroke();
  c.fillStyle = '#6a6a58';
  c.fillRect(-0.9 * scale, -2.6 * scale, 1.8 * scale, 0.9 * scale);
  c.fillStyle = '#8a8878';
  c.beginPath(); c.arc(0, -2.9 * scale, 0.7 * scale, 0, 7); c.fill();
  c.strokeStyle = '#4a4a40';
  c.lineWidth = 0.7 * scale;
  for (let i = 0; i < 4; i++) {
    const ang = i * Math.PI / 2 + 0.2;
    c.beginPath();
    c.moveTo(Math.cos(ang) * 0.5 * scale, 2 * scale + Math.sin(ang) * 0.3 * scale);
    c.lineTo(Math.cos(ang) * 1.2 * scale, 3.6 * scale + Math.sin(ang) * 0.5 * scale);
    c.stroke();
  }
  c.restore();
}

function drawEmortarKit(c, fx, fy, face, tube) {
  c.fillStyle = '#4a4438';
  c.fillRect(tube.bx - 5, tube.by + 2.2, 6.2, 4.2);
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.85;
  c.strokeRect(tube.bx - 5, tube.by + 2.2, 6.2, 4.2);
  c.strokeStyle = '#6a6858';
  c.lineWidth = 0.55;
  c.beginPath(); c.moveTo(tube.bx - 4.5, tube.by + 3.8); c.lineTo(tube.bx + 0.5, tube.by + 3.8); c.stroke();
  c.strokeStyle = 'rgba(200,198,180,0.75)';
  c.lineWidth = 0.5;
  c.strokeRect(tube.bx - 4.5, tube.by + 2.7, 2.4, 1.5);
  drawGrw81Round(c, tube.bx - 3.5, tube.by + 3.4, 0.8, 0.15);
  drawGrw81Round(c, tube.bx - 1.2, tube.by + 3.6, 0.76, -0.1);
  drawGrw81Round(c, tube.bx + 0.5, tube.by + 3.2, 0.72, 0.35);
  c.strokeStyle = '#4a4840';
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(-6.5, -1.5); c.lineTo(-6.5, 3.5); c.lineTo(-4, 3.5); c.stroke();
  for (const off of [-5.8, -5.1, -4.4]) {
    drawGrw81Round(c, off, 1.2, 0.55, -0.3);
  }
  c.fillStyle = '#3a3c34';
  c.beginPath(); c.ellipse(fy * 3.2, -fx * 3.2, 2.2, 2.8, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2c24';
  c.lineWidth = 0.8;
  c.stroke();
  c.fillStyle = '#c8b898';
  c.beginPath(); c.ellipse(fy * 3.2, -fx * 3.2, 1.2, 1.5, face, 0, 7); c.fill();
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 0.45;
  for (let i = -2; i <= 2; i++) {
    c.beginPath();
    c.moveTo(fy * 3.2 + i * 0.4, -fx * 3.2 - 1);
    c.lineTo(fy * 3.2 + i * 0.4, -fx * 3.2 + 1);
    c.stroke();
  }
  c.strokeStyle = '#5a5a50';
  c.lineWidth = 1.3;
  c.beginPath(); c.moveTo(-fy * 4.5, fx * 4.5); c.lineTo(-fy * 5.8, fx * 5.8 + 1.5); c.stroke();
  c.fillStyle = '#6a5a42';
  c.fillRect(-0.8, 3.5, 1.5, 1.3);
}

// live flame jet while a flamethrower is spraying
function drawFlameStream(actor) {
  if (!actor.flameT || actor.flameT <= 0 || !actor.t.flame) return;
  const fl = actor.t.flame;
  const range = unitRange(actor, fl.range) * fogMult();
  const bearing = actor.face;
  const fx = Math.cos(bearing), fy = Math.sin(bearing);
  const nx = actor.x + fx * (actor.t.gun + 1.2);
  const ny = actor.y + fy * (actor.t.gun + 1.2);
  const pulse = 0.82 + Math.sin(G.time * 22) * 0.18;
  const alpha = clamp(actor.flameT / 0.15, 0, 1) * pulse;
  const reach = range * (0.68 + Math.sin(G.time * 14) * 0.06);

  ctx.save();
  const tipX = nx + fx * reach * 0.75;
  const tipY = ny + fy * reach * 0.75;
  const grad = ctx.createLinearGradient(nx, ny, tipX, tipY);
  grad.addColorStop(0, `rgba(255,248,180,${0.72 * alpha})`);
  grad.addColorStop(0.25, `rgba(255,170,50,${0.55 * alpha})`);
  grad.addColorStop(0.55, `rgba(240,80,20,${0.35 * alpha})`);
  grad.addColorStop(1, 'rgba(60,25,10,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(nx, ny);
  ctx.arc(nx, ny, reach, bearing - fl.arc * 0.88, bearing + fl.arc * 0.88);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = `rgba(255,110,25,${0.14 * alpha})`;
  ctx.beginPath();
  ctx.moveTo(nx, ny);
  ctx.arc(nx, ny, reach * 1.05, bearing - fl.arc, bearing + fl.arc);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = '#fff8c8';
  ctx.beginPath(); ctx.arc(nx, ny, 2.8, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// weapon reach overlay for selected units — scales with veterancy like combat range
function drawUnitWeaponRange(a, opts) {
  const t = a.t;
  const fog = fogMult();
  const alpha = opts && opts.alpha != null ? opts.alpha : 0.35;
  const bearing = opts && opts.bearing != null ? opts.bearing
    : a.turret != null ? a.turret : a.face;

  if (t.atgun) {
    drawATGunRangeCone(a.x, a.y, -Math.PI / 2, t.atgun.arc + (a.rank || 0) * 0.05236, unitRange(a, t.range) * fog, alpha);
    return;
  }
  if (t.fireCone) {
    drawFireCone(a.x, a.y, bearing, t.fireCone.arc, unitRange(a, t.range) * fog, alpha);
    return;
  }
  if (t.flame) {
    drawFlameRangeCone(a.x, a.y, bearing, t.flame.arc, unitRange(a, t.flame.range) * fog, alpha);
    return;
  }
  if (t.shotgun) {
    drawBuckshotCone(a.x, a.y, bearing, t.shotgun.arc * Math.max(0.4, 1 - (a.rank || 0) * 0.08), unitRange(a, t.shotgun.range) * fog, alpha);
    return;
  }
  if (t.mortar) {
    drawMortarRangeRing(a.x, a.y, unitRange(a, t.mortar.min) * fog, unitRange(a, t.mortar.range) * fog, alpha);
    return;
  }
  if (t.sfx === 'sniper' && t.range > 200) {
    drawSniperRangeRing(a.x, a.y, unitRange(a, t.range) * fog, alpha);
    return;
  }

  let r = t.range;
  if (t.rocket) r = t.rocket.range;
  if (r <= 0) return;

  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(a.x, a.y, unitRange(a, r) * fog, 0, 7); ctx.stroke();
}

// command aura — soft fill, dashed ring, inward chevrons
function drawOfficerAuraRing(x, y, range, alpha, us) {
  const a = alpha != null ? alpha : 0.45;
  const rgb = us ? [100, 160, 230] : [190, 130, 95];
  ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.14})`;
  ctx.beginPath(); ctx.arc(x, y, range, 0, 7); ctx.fill();
  ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.78})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([7, 5]);
  ctx.beginPath(); ctx.arc(x, y, range, 0, 7); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.9})`;
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const ang = i * Math.PI / 4;
    const ox = x + Math.cos(ang) * range;
    const oy = y + Math.sin(ang) * range;
    const ix = x + Math.cos(ang) * (range - 10);
    const iy = y + Math.sin(ang) * (range - 10);
    const tx = Math.cos(ang + Math.PI / 2);
    const ty = Math.sin(ang + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(ox - tx * 4, oy - ty * 4);
    ctx.lineTo(ix, iy);
    ctx.lineTo(ox + tx * 4, oy + ty * 4);
    ctx.stroke();
  }
}

function drawSpecialistRangeAt(x, y, type, side) {
  if (type === 'medic') {
    ctx.strokeStyle = 'rgba(120,210,100,0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(x, y, MEDIC_RANGE, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
  } else if (type === 'engineer') {
    ctx.strokeStyle = 'rgba(230,190,70,0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(x, y, ENGINEER_RANGE, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
  } else if (type === 'officer' || type === 'eoff') {
    const r = type === 'eoff' ? 140 : OFFICER_AURA;
    drawOfficerAuraRing(x, y, r, 0.45, type === 'officer' || side === 'us');
  }
}

function drawSpecialistRange(a) {
  drawSpecialistRangeAt(a.x, a.y, a.type, a.side);
}

// dashed area-of-effect indicator for defense-kind placement ghosts —
// cover radius for bunker/sandbags, blast radius for mines, slow zone for wire
function drawDefenseRangeIndicator(key, x, y) {
  if (key === 'bunker' || key === 'sandbags' || key === 'camonest') {
    const r = key === 'sandbags' ? 32 : CAMONEST_ZONE;
    ctx.strokeStyle = key === 'camonest' ? 'rgba(150,190,110,0.5)' : 'rgba(120,175,235,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
  } else if (key === 'mine') {
    ctx.strokeStyle = 'rgba(220,90,50,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(x, y, 44, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
  } else if (key === 'wire') {
    ctx.strokeStyle = 'rgba(220,190,90,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(x - 40, y - 14, 80, 28);
    ctx.setLineDash([]);
  } else if (key === 'watchtower') {
    drawOfficerAuraRing(x, y, WATCHTOWER_AURA, 0.45, true);
  }
}

// one tick of flame from `actor` toward its facing: burns EVERYTHING in the
// cone regardless of side — that's the deal you make with a flamethrower
function flameSpray(actor, dt) {
  const fl = actor.t.flame;
  const range = unitRange(actor, fl.range);

  actor.flameT = 0.15;
  markCamoFired(actor);
  actor.flameSfx = (actor.flameSfx || 0) - dt;
  if (actor.flameSfx <= 0) { actor.flameSfx = 0.4; SFX.flame(); }

  const nx = actor.x + Math.cos(actor.face) * (actor.t.gun + 1.5);
  const ny = actor.y + Math.sin(actor.face) * (actor.t.gun + 1.5);
  if (Math.random() < 0.35) {
    G.flashes.push({ x: nx, y: ny, r: rand(5, 9), ttl: 0.06, max: 0.06 });
  }

  // roiling fire particles along the cone
  for (let i = 0; i < 9; i++) {
    const a = actor.face + rand(-fl.arc, fl.arc) * 0.85;
    const d = rand(8, range * 0.95);
    const ttl = rand(0.12, 0.42);
    G.particles.push({
      x: actor.x + Math.cos(a) * d, y: actor.y + Math.sin(a) * d,
      vx: Math.cos(a) * rand(25, 75) + rand(-12, 12),
      vy: Math.sin(a) * rand(25, 75) - rand(10, 28),
      ttl, maxTtl: ttl, grav: -55, size: rand(2.5, 6),
      kind: 'flame', glow: rand(0.65, 1),
      color: pick(['#ffe070', '#ff9a2a', '#ffce4a', '#e05818', '#b83a10', '#3a3028']),
    });
  }
  // scorch the earth now and then
  if (Math.random() < 0.05) {
    const a = actor.face + rand(-fl.arc, fl.arc) * 0.6;
    const d = rand(range * 0.4, range);
    gctx.fillStyle = 'rgba(30,26,18,0.28)';
    gctx.beginPath();
    gctx.ellipse(actor.x + Math.cos(a) * d, actor.y + Math.sin(a) * d,
      rand(4, 9), rand(3, 6), rand(0, 3), 0, 7);
    gctx.fill();
  }

  // a veteran keeps the stream on target: burn scales hard with rank
  const dps = fl.dps * (1 + (actor.rank || 0) * 0.35);
  const burn = (a2) => {
    if (a2 === actor || a2.dead) return;
    const d = dist(actor, a2);
    if (d > range + 8) return;
    if (Math.abs(angleDiff(Math.atan2(a2.y - actor.y, a2.x - actor.x), actor.face)) > fl.arc) return;
    let dmg = dps * dt * rand(0.8, 1.2);
    if (a2.t.tank) dmg *= 0.6;
    // creditKill ignores German shooters, so passing actor is always safe
    if (a2.side === 'us') damageUnit(a2, dmg, actor);
    else damageEnemy(a2, dmg, actor);
    // men dive under the fire stream within a second or so
    tryGoProne(a2, 1.5 * dt);
  };
  for (const u of G.units) burn(u);
  for (const e of G.enemies) burn(e);
}

// pump-action buckshot: one blast, every enemy caught in the cone takes
// pellet damage scaled by distance and how centered they are in the spread
function fireShotgun(actor, buffs) {
  const sg = actor.t.shotgun;
  const range = unitRange(actor, sg.range) * fogMult();
  const arc = sg.arc * (1 + (buffs && buffs.accBonus ? buffs.accBonus * 0.25 : 0));
  const mx = actor.x + Math.cos(actor.face) * (actor.t.gun + 2);
  const my = actor.y + Math.sin(actor.face) * (actor.t.gun + 2);

  SFX.shotgun();
  markCamoFired(actor);
  actor.shotgunBlastT = 0.12;
  G.flashes.push({ x: mx, y: my, r: 10, ttl: 0.08, max: 0.08 });
  const spreadMult = Math.max(0.4, 1 - (actor.rank || 0) * 0.08);
  for (let i = 0; i < sg.pellets; i++) {
    const a = actor.face + rand(-sg.spread * spreadMult, sg.spread * spreadMult);
    const d = rand(25, range);
    G.tracers.push({
      x1: mx, y1: my,
      x2: actor.x + Math.cos(a) * d, y2: actor.y + Math.sin(a) * d,
      ttl: 0.05, kind: 'buckshot',
    });
  }
  for (let i = 0; i < 5; i++) {
    const a = actor.face + rand(-sg.spread * 0.6 * spreadMult, sg.spread * 0.6 * spreadMult);
    const ttl = rand(0.08, 0.2);
    G.particles.push({
      x: mx + Math.cos(a) * rand(4, 14), y: my + Math.sin(a) * rand(4, 14),
      vx: Math.cos(a) * rand(35, 70), vy: Math.sin(a) * rand(35, 70) - rand(5, 20),
      ttl, maxTtl: ttl, grav: 120, size: rand(1.2, 2.2),
      kind: 'smoke', color: pick(['#d8ccb0', '#c8b898', '#a89878', '#8a7a60']),
    });
  }
  G.particles.push({
    x: mx + Math.cos(actor.face) * 10, y: my + Math.sin(actor.face) * 10,
    vx: Math.cos(actor.face) * rand(30, 55), vy: Math.sin(actor.face) * rand(30, 55),
    ttl: 0.18, grav: 90, size: rand(1.5, 2.5), color: '#c8b898',
  });

  const rank = actor.rank || 0;
  // attackers (side 'de') hose defenders in G.units; friendlies hose G.enemies
  const foes = actor.side === 'de' ? G.units : G.enemies;
  for (const e of foes) {
    if (e.dead || e.y < 0 || e.chute > 0 || isCamouflaged(e)) continue;
    const d = dist(actor, e);
    if (d > range + 8) continue;
    const ang = Math.atan2(e.y - actor.y, e.x - actor.x);
    const off = Math.abs(angleDiff(ang, actor.face));
    if (off > arc) continue;

    if (e.prone > 0 && Math.random() < 0.6) {
      G.particles.push({ x: e.x + rand(-6, 6), y: e.y + 4, vx: rand(-25, 25), vy: rand(-55, -20), ttl: 0.3, grav: 200, size: 1.3, color: '#6e6046' });
      continue;
    }
    if (coverBlock(e)) {
      G.particles.push({ x: e.x, y: e.y + 6, vx: rand(-20, 20), vy: -40, ttl: 0.3, grav: 150, size: 1.5, color: '#b8a878' });
      continue;
    }

    const centered = 1 - off / arc;
    const falloff = 1 - (d / range) * 0.5;
    const pelletsHit = Math.max(1, Math.round(centered * 2.5 + rand(0, sg.pellets * 0.35)));
    let dmg = sg.dmg * pelletsHit * falloff * (1 + rank * 0.09) * rand(0.9, 1.1);
    if (e.t.tank) dmg *= 0.06;
    else if (e.t.apc) dmg *= 0.2;
    if (e.side === 'us') damageUnit(e, dmg, actor);
    else damageEnemy(e, dmg, actor);
  }
}

function friendlyNearPoint(x, y, r, except) {
  for (const u of G.units) {
    if (!u.dead && u !== except && dist(u, { x, y }) < r) return true;
  }
  return false;
}

function nearestUnitInRange(e, range, pred) {
  let best = null, bd = range;
  for (const u of G.units) {
    if (u.dead || isCamouflaged(u)) continue;
    if (pred && !pred(u)) continue;
    const d = dist(e, u);
    if (d < bd) { bd = d; best = u; }
  }
  return best;
}

// ============================================================ update: friendlies

function officerBuff(u) {
  const officers = G.usOfficers || G.units;
  for (const o of officers) {
    if (o.dead || o === u) continue;
    if (!(o.type === 'officer' || o.type === 'eoff' || o.t.aura)) continue;
    if (dist(o, u) < OFFICER_AURA) {
      // a veteran officer drives his men harder
      return { rofMult: 0.75 - (o.rank || 0) * 0.03, accBonus: 0.18 + (o.rank || 0) * 0.04 };
    }
  }
  return null;
}

// officer aura + veterancy: each rank is 8% faster, 8% straighter and 4%
// harder-hitting — a MSG puts out roughly 3.5x the fire of a green private
function unitBuffs(u) {
  if (u._buffsFrame === G.buffFrame) return u._buffs;
  const b = { rofMult: 1, accBonus: 0, dmgMult: 1 };
  const ob = officerBuff(u);
  if (ob) { b.rofMult *= ob.rofMult; b.accBonus += ob.accBonus; }
  if (u.rank > 0) {
    b.rofMult *= 1 - u.rank * 0.08;
    b.accBonus += u.rank * 0.08;
    b.dmgMult *= 1 + u.rank * 0.04;
  }
  u._buffs = b;
  u._buffsFrame = G.buffFrame;
  return b;
}

// veterans hustle: each rank moves 4% quicker, so a MSG covers ground 24% faster
function unitSpeed(u) {
  return u.t.speed * (1 + (u.rank || 0) * 0.04);
}

// close-range specialists stretch their reach hardest as they rank up
function unitRangeRankRate(type) {
  return (type === 'shotgunner' || type === 'engineer' || type === 'officer' || type === 'flamer')
    ? 0.05 : 0.01;
}

// a watch tower's raised vantage extends the sightline of nearby riflemen —
// but a mortar crew fires indirect and blind, so the tower does nothing for them.
// an engineer-fortified tower (t.up) sees further and boosts the effect further.
function watchtowerRangeMult(u) {
  if (u.side !== 'us' || u.t.mortar || !G.watchtowers.length) return 1;
  let mult = 1;
  for (const wt of G.watchtowers) {
    if (dist(wt, u) < WATCHTOWER_AURA) {
      const wtMult = wt.up ? WATCHTOWER_RANGE_MULT_UPGRADED : WATCHTOWER_RANGE_MULT;
      if (wtMult > mult) mult = wtMult;
    }
  }
  return mult;
}

function unitRangeMult(u) {
  const rank = u.rank || 0;
  let mult = rank <= 0 ? 1 : 1 + rank * unitRangeRankRate(u.type);
  mult *= watchtowerRangeMult(u);
  return mult;
}

function unitRange(u, base) {
  return base * unitRangeMult(u);
}

function updateUnit(u, dt) {
  if (u.proneCd > 0) u.proneCd -= dt;
  if (u.prone > 0) {
    // a move order gets him up and running; otherwise he waits it out
    u.prone -= dt;
    if (u.prone <= 0 || u.moveTo) {
      u.prone = 0;
      u.proneCd = rand(4, 6);
    } else {
      return; // pinned: no shooting, no grenades, no field work
    }
  }

  // the AT gun is staked in: it traverses and shoots, but never moves
  if (u.t.atgun) {
    u.moveTo = null;
    updateATGun(u, dt);
    return;
  }

  // a tank crew drives and fights at the same time
  if (u.t.tank) {
    if (u.moveTo) {
      const d = dist(u, u.moveTo);
      if (d < 4) {
        u.moveTo = null;
        u.face = vehicleHomeFace(u);
      } else {
        u.face = Math.atan2(u.moveTo.y - u.y, u.moveTo.x - u.x);
        const sp = unitSpeed(u);
        u.x += Math.cos(u.face) * sp * dt;
        u.y += Math.sin(u.face) * sp * dt;
      }
    }
    updateTankCombat(u, dt);
    return;
  }

  // the jeep's gunner keeps the .50 talking while the driver drives
  if (u.t.vehicle) {
    if (u.moveTo) {
      const d = dist(u, u.moveTo);
      if (d < 4) {
        u.moveTo = null;
        u.face = vehicleHomeFace(u);
      } else {
        const ang = Math.atan2(u.moveTo.y - u.y, u.moveTo.x - u.x);
        const sp = unitSpeed(u);
        u.x += Math.cos(ang) * sp * dt;
        u.y += Math.sin(ang) * sp * dt;
      }
    }
    const vt = nearestEnemyInRange(u, unitRange(u, u.t.range) * fogMult());
    runWeapon(u, vt, dt, unitBuffs(u));
    return;
  }

  if (u.moveTo) {
    const d = dist(u, u.moveTo);
    if (d < 4) {
      u.moveTo = null;
    } else {
      u.face = Math.atan2(u.moveTo.y - u.y, u.moveTo.x - u.x);
      const sp = unitSpeed(u);
      u.x += Math.cos(u.face) * sp * dt;
      u.y += Math.sin(u.face) * sp * dt;
      return; // no shooting while running
    }
  }

  if (u.t.flame) {
    const ft = nearestEnemyInRange(u, unitRange(u, u.t.flame.range) * fogMult());
    if (ft) {
      u.face = Math.atan2(ft.y - u.y, ft.x - u.x);
      flameSpray(u, dt);
    }
    return;
  }

  if (u.t.shotgun) {
    const sg = u.t.shotgun;
    const st = nearestEnemyInRange(u, unitRange(u, sg.range) * fogMult());
    const buffs = unitBuffs(u);
    if (st) u.face = Math.atan2(st.y - u.y, st.x - u.x);
    u.cd -= dt;
    if (st && u.cd <= 0) {
      fireShotgun(u, buffs);
      u.cd = u.t.rof * buffs.rofMult * rand(0.85, 1.15);
    }
    return;
  }

  const buffs = unitBuffs(u);
  const range = unitRange(u, u.t.range) * fogMult();
  let target;
  if (u.type === 'sniper') target = sniperTarget(u, range);
  else target = nearestEnemyInRange(u, range);
  runWeapon(u, target, dt, buffs);

  if (u.t.grenade) {
    // quick reflexes: a live German stick grenade landed close enough to
    // scoop up and heave back before the fuse runs out. Grenades already
    // caught, or thrown by a friendly (kind 'frag'), are never eligible.
    for (const g of G.grenades) {
      if (g.by || g.caught || !g.landed || g.fuse < 0.6) continue;
      if (dist(u, { x: g.tx, y: g.ty }) > GRENADE_CATCH_RANGE) continue;
      g.caught = true;
      g.by = u;
      g.landed = false;
      g.t = 0;
      g.dur = 0.6;
      g.sx = u.x; g.sy = u.y;
      const back = nearestEnemyInRange(u, 260 * fogMult());
      const rx = back ? back.x : g.tx, ry = back ? back.y : g.ty - 160;
      const sc = 16;
      g.tx = rx + rand(-sc, sc);
      g.ty = ry + rand(-sc, sc);
      u.grenThrowT = 0.35;
      markCamoFired(u);
      SFX.grenadeToss();
      G.texts.push({ x: u.x, y: u.y - 18, text: 'THROWN BACK!', ttl: 1.6 });
      break;
    }

    u.grenCd -= dt;
    if (u.grenCd <= 0) {
      // never inside his own blast, never onto a danger-close buddy
      const gt = nearestEnemyInRange(u, 200 * (1 + (u.rank || 0) * 0.10) * fogMult(), e => dist(u, e) > 60);
      if (gt && !friendlyNearPoint(gt.x, gt.y, 55, u)) {
        // grenades are a rare, heavy punch — the carbine does the daily work.
        // Veterans throw more often, tighter and harder.
        u.grenCd = rand(9.6, 13.9) * (1 - u.rank * 0.08);
        u.grenThrowT = 0.35;
        markCamoFired(u);
        SFX.grenadeToss();
        const sc = 12 * (1 - u.rank * 0.08);
        G.grenades.push({
          x: u.x, y: u.y,
          tx: gt.x + rand(-sc, sc), ty: gt.y + rand(-sc, sc),
          t: 0, dur: 1.0, sx: u.x, sy: u.y, by: u,
          kind: 'frag',
          r: 46, dmg: 115 * (1 + u.rank * 0.05),
        });
      }
    }
  }

  if (u.t.rocket) {
    u.rocketCd -= dt;
    if (u.rocketCd <= 0) {
      const rk = u.t.rocket;
      const rr = unitRange(u, rk.range) * fogMult();
      // tanks first, then soft vehicles, infantry only when there is nothing
      // on wheels; never inside his own blast
      const safe = e => dist(u, e) > rk.r + 20;
      const rt = nearestEnemyInRange(u, rr, e => e.t.tank && safe(e)) ||
                 nearestEnemyInRange(u, rr, e => (e.t.vehicle || e.t.bike) && safe(e)) ||
                 nearestEnemyInRange(u, rr, safe);
      if (rt && !friendlyNearPoint(rt.x, rt.y, 40, u)) {
        // a veteran crew reloads faster and walks his shots in
        u.rocketCd = rand(rk.cdMin, rk.cdMax) * (1 - u.rank * 0.08);
        u.face = Math.atan2(rt.y - u.y, rt.x - u.x);
        markCamoFired(u);
        SFX.rocket();
        // rockets scatter badly with distance; a tank is a big, slow target
        const d = dist(u, rt);
        let scatter = 8 + d * 0.11;
        if (rt.t.tank) scatter *= 0.45;
        scatter = Math.max(6, scatter * (1 - u.rank * 0.08));
        const tx = rt.x + rand(-scatter, scatter), ty = rt.y + rand(-scatter, scatter);
        G.rockets.push({
          sx: u.x, sy: u.y, x: u.x, y: u.y, tx, ty,
          t: 0, dur: Math.max(dist(u, { x: tx, y: ty }) / rk.speed, 0.15),
          r: rk.r, dmg: rk.dmg * (1 + u.rank * 0.04), by: u,
          kind: 'rocket',
        });
      }
    }
  }

  if (u.t.mortar) {
    u.mortCd -= dt;
    if (u.mortCd <= 0) {
      const mt = u.t.mortar;
      const mr = unitRange(u, mt.range) * fogMult();
      const target = nearestEnemyInRange(u, mr, e => dist(u, e) > mt.min);
      if (target && !friendlyNearPoint(target.x, target.y, 55, u)) {
        // veteran crews drop rounds faster, tighter and heavier
        u.mortCd = rand(mt.cdMin, mt.cdMax) * (1 - u.rank * 0.08);
        u.face = Math.atan2(target.y - u.y, target.x - u.x);
        u.mortarFireT = 0.18;
        markCamoFired(u);
        G.flashes.push({ x: u.x, y: u.y - 6, r: 5, ttl: 0.07, max: 0.07 });
        const sc = mt.scatter * (1 - u.rank * 0.08);
        scheduleShell(target.x + rand(-sc, sc), target.y + rand(-sc, sc),
          mt.flight, mt.r, mt.dmg * (1 + u.rank * 0.05), false, u);
      }
    }
  }

  if (u.type === 'medic') {
    u.healTick -= dt;
    if (u.healTick <= 0) {
      u.healTick = 0.4;
      let worst = null, frac = 1;
      for (const a of G.units) {
        // no field-dressing machines: medics treat men, not metal
        if (a.dead || a === u || a.t.tank || a.t.vehicle || a.t.atgun || a.hp >= a.maxhp) continue;
        if (dist(u, a) < MEDIC_RANGE) {
          const f = a.hp / a.maxhp;
          if (f < frac) { frac = f; worst = a; }
        }
      }
      if (worst) {
        // experienced medics work far faster — a MSG patches at ~3.4x the rate
        const amt = Math.min(worst.maxhp - worst.hp, 3 + u.rank * 1.2);
        worst.hp += amt;
        u.healed += amt;
        // 1 XP per 150 HP patched up — a slow road to sergeant
        if (u.healed >= 150) { u.healed -= 150; gainXP(u); }
        G.particles.push({ x: worst.x + rand(-6, 6), y: worst.y - 10, vx: 0, vy: -18, ttl: 0.5, grav: 0, size: 1.6, color: '#8fe08f' });
      }
    }
  }

  if (u.type === 'engineer') updateEngineer(u, dt);
}

// engineer work, one job at a time: repair emplacements, then repair
// damaged vehicles (slowly), then fortify an intact emplacement he's
// standing next to
function updateEngineer(u, dt) {
  u.healTick -= dt;
  if (u.healTick > 0) return;
  u.healTick = 0.4;
  const R = ENGINEER_RANGE;

  const sparks = (x, y) => {
    if (Math.random() < 0.5) SFX.hammer();
    for (let i = 0; i < 3; i++) {
      G.particles.push({
        x: x + rand(-8, 8), y: y + rand(-6, 6), vx: rand(-25, 25), vy: rand(-45, -10),
        ttl: rand(0.15, 0.35), grav: 240, size: 1.4,
        color: pick(['#ffd94a', '#ffefa0', '#c8b872']),
      });
    }
  };
  const credit = (amt) => {
    u.healed += amt;
    if (u.healed >= 150) { u.healed -= 150; gainXP(u); }
  };

  // 1) restack damaged sandbags / patch bunker concrete / restring damaged wire / brace the watch tower
  let emp = null, empFrac = 1;
  for (const s of [...G.sandbags, ...G.bunkers, ...G.wires, ...G.watchtowers, ...G.camoNests]) {
    if (s.hp >= s.maxhp || dist(u, s) > R) continue;
    const f = s.hp / s.maxhp;
    if (f < empFrac) { empFrac = f; emp = s; }
  }
  if (emp) {
    const amt = Math.min(emp.maxhp - emp.hp, 8 + u.rank * 2.7);
    emp.hp += amt;
    credit(amt * 0.5);
    sparks(emp.x, emp.y);
    return;
  }

  // 1.5) failing that, wrench on the most damaged vehicle or AT gun in range.
  // Armor and gun barrels are slow going by hand and barely teach a man
  // anything next to fortification work — a jeep, Sherman, or 57mm is
  // patched at a crawl.
  let veh = null, vehFrac = 1;
  for (const a of G.units) {
    if (a.dead || a === u || !(a.t.tank || a.t.vehicle || a.t.atgun) || a.hp >= a.maxhp) continue;
    if (dist(u, a) > R) continue;
    const f = a.hp / a.maxhp;
    if (f < vehFrac) { vehFrac = f; veh = a; }
  }
  if (veh) {
    const amt = Math.min(veh.maxhp - veh.hp, 0.25 + u.rank * 0.075);
    veh.hp += amt;
    credit(amt * 0.15);
    sparks(veh.x, veh.y);
    return;
  }

  // 2) fortify the nearest intact, un-upgraded emplacement (~6 s of work)
  let target = null, td = R;
  for (const s of [...G.sandbags, ...G.bunkers, ...G.wires, ...G.watchtowers, ...G.camoNests]) {
    if (s.up) continue;
    const d = dist(u, s);
    if (d < td) { td = d; target = s; }
  }
  if (target) {
    target.workProg += 0.4 * (1 + u.rank * 0.35);
    sparks(target.x, target.y);
    if (target.workProg >= 6) {
      target.up = true;
      // camo nests get double HP once fortified; everything else gets 1.5x
      target.maxhp = Math.round(target.maxhp * (target.fortifyMult || 1.5));
      target.hp = target.maxhp;
      gainXP(u); gainXP(u); // a fortification is worth two points of pride
      G.texts.push({ x: target.x, y: target.y - 16, text: 'FORTIFIED', ttl: 2.2 });
    }
  }
}

// ---- 57mm anti-tank gun: a dug-in direct-fire piece. It only answers to
// vehicles, and only inside the traverse cone its trails allow.
function updateATGun(u, dt) {
  const spec = u.t.atgun;
  const range = unitRange(u, u.t.range) * fogMult();
  const HOME = -Math.PI / 2;   // staked facing the German end of the field
  const arc = spec.arc + (u.rank || 0) * 0.05236;  // +3° per rank
  const inCone = e => inFireCone(u, e, HOME, arc);

  u.cd -= dt;

  // armor is the priority; soft vehicles after. Infantry is not this gun's job.
  const target =
    nearestEnemyInRange(u, range, e => e.t.tank && inCone(e)) ||
    nearestEnemyInRange(u, range, e => (e.t.vehicle || e.t.bike) && inCone(e));

  if (!target) {
    // crank the tube back to center
    u.turret += clamp(angleDiff(HOME, u.turret), -0.7 * dt, 0.7 * dt);
    u.face = u.turret;
    return;
  }

  const want = Math.atan2(target.y - u.y, target.x - u.x);
  const diff = angleDiff(want, u.turret);
  u.turret += clamp(diff, -0.9 * dt, 0.9 * dt);
  u.face = u.turret;
  if (u.cd > 0 || Math.abs(diff) > 0.17) return;

  SFX.boom(false);
  u.atgunFireT = 0.16;
  G.flashes.push({
    x: u.x + Math.cos(u.turret) * 24, y: u.y + Math.sin(u.turret) * 24,
    r: 8, ttl: 0.07, max: 0.07,
  });
  // recoil kicks dust off the trails
  for (let i = 0; i < 4; i++) {
    G.particles.push({
      x: u.x + rand(-8, 8), y: u.y + rand(-4, 6), vx: rand(-30, 30), vy: rand(-40, -10),
      ttl: rand(0.2, 0.4), grav: 200, size: rand(1.2, 2.2),
      color: pick(['#6e6046', '#57492f', '#8a7a5a']),
    });
  }
  // AP shells drift at range; armor is a forgiving target but this isn't a laser
  const d = dist(u, target);
  let scatter = (24 + d * 0.11) * (1 - u.rank * 0.08);
  if (target.t.tank) scatter *= 0.80;
  else scatter *= 0.90;
  scatter = Math.max(11, scatter * 0.8 * (spec.scatterMult || 1));
  scheduleShell(
    target.x + rand(-scatter, scatter), target.y + rand(-scatter, scatter),
    0.45, spec.r, spec.shellDmg * (1 + u.rank * 0.06), false, u);
  u.cd = u.t.rof * (1 - u.rank * 0.08) * rand(0.85, 1.15);
}

// ---- shared tank gunnery: both sides alternate the main gun and coaxial MG,
// and keep shooting while the hull is moving

function tankTargets(a) {
  const fog = fogMult();
  const cannonRange = unitRange(a, a.t.range) * fog;
  const mgRange = unitRange(a, a.t.mg.range) * fog;
  const cone = a.t.fireCone;
  const inCone = e => !cone || inFireCone(a, e, a.turret, cone.arc);
  if (a.side === 'us') {
    return {
      // enemy armor is the cannon's priority target, inside the turret arc
      cannon: nearestEnemyInRange(a, cannonRange, e => e.t.tank && inCone(e)) ||
              nearestEnemyInRange(a, cannonRange, inCone),
      mg: nearestEnemyInRange(a, mgRange, e => !e.t.tank && inCone(e)),
    };
  }
  return {
    cannon: nearestUnitInRange(a, cannonRange, inCone),
    mg: nearestUnitInRange(a, mgRange, u2 => !u2.t.tank && inCone(u2)),
  };
}

function updateTankCombat(a, dt) {
  if (!a.wpn) a.wpn = 'cannon';
  a.cd -= dt;
  const mgSpec = a.t.mg;
  const TURRET_TRACK = 0.18; // rad/s — glacial traverse onto new targets
  const TURRET_HOME = 0.14;

  // an MG burst in progress finishes before anything else
  if (a.burstLeft > 0) {
    a.burstTimer -= dt;
    if (a.burstTimer <= 0) {
      const cone = a.t.fireCone;
      const inCone = t => !cone || inFireCone(a, t, a.turret, cone.arc);
      if (a.mgTarget && !a.mgTarget.dead && inCone(a.mgTarget)) {
        // a veteran crew keeps the coax on target too
        const r = a.rank || 0;
        fireShot(a, a.mgTarget, { weapon: mgSpec, accBonus: r * 0.08, dmgMult: 1 + r * 0.04 });
      }
      a.burstLeft--;
      a.burstTimer = mgSpec.burstGap;
      if (a.burstLeft <= 0) {
        a.wpn = 'cannon';
        a.cd = Math.max(1.2, a.t.rof - 2.3) * (1 - (a.rank || 0) * 0.08) * rand(0.85, 1.15);
      }
    }
    return;
  }

  const targets = tankTargets(a);
  // nothing for the weapon whose turn it is: hand over to the other one
  if (!targets[a.wpn]) {
    const other = a.wpn === 'cannon' ? 'mg' : 'cannon';
    if (targets[other]) { a.wpn = other; a.cd = Math.max(a.cd, 0.4); }
  }
  const target = targets[a.wpn];

  if (!target) {
    // park the turret facing the enemy side of the field
    const home = a.side === 'us' ? -Math.PI / 2 : Math.PI / 2;
    a.turret += clamp(angleDiff(home, a.turret), -TURRET_HOME * dt, TURRET_HOME * dt);
    return;
  }

  const want = Math.atan2(target.y - a.y, target.x - a.x);
  const diff = angleDiff(want, a.turret);
  a.turret += clamp(diff, -TURRET_TRACK * dt, TURRET_TRACK * dt);
  if (a.cd > 0 || Math.abs(diff) > 0.15) return;

  if (a.wpn === 'cannon') {
    SFX.boom(false);
    G.flashes.push({
      x: a.x + Math.cos(a.turret) * 26, y: a.y + Math.sin(a.turret) * 26,
      r: 9, ttl: 0.08, max: 0.08,
    });
    const d = dist(a, target);
    // a veteran gunner lays shells on the mark and hits harder
    const scatter = Math.max(18, 16 + d * 0.055) * (1 - (a.rank || 0) * 0.08);
    scheduleShell(target.x + rand(-scatter, scatter), target.y + rand(-scatter, scatter),
      0.7, 45, a.t.shellDmg * (1 + (a.rank || 0) * 0.06), false, a);
    a.wpn = 'mg';
    // a veteran crew works the reload faster
    a.cd = 1.5 * (1 - (a.rank || 0) * 0.08) * rand(0.85, 1.15);
  } else {
    a.burstLeft = mgSpec.burst;
    a.burstTimer = 0;
    a.mgTarget = target;
  }
}

// ============================================================ update: enemies

function enemyOfficerNear(e) {
  const officers = G.deOfficers || G.enemies;
  for (const o of officers) {
    if (o.dead || o === e) continue;
    if (!(o.t.aura || o.type === 'officer' || o.type === 'eoff')) continue;
    if (dist(o, e) < 140) return true;
  }
  return false;
}

function updateEnemy(e, dt) {
  // still under canopy: drift down, sway in the wind, do nothing else
  if (e.chute > 0) {
    updateEnemyChute(e, dt);
    return;
  }
  if (e.onCraft) return;

  if (e.proneCd > 0) e.proneCd -= dt;
  if (e.prone > 0) {
    // a move order gets him up and running; otherwise he waits it out
    e.prone -= dt;
    if (e.prone <= 0 || e.moveTo) {
      e.prone = 0;
      e.proneCd = rand(4, 6);
    } else {
      return; // pinned: no shooting, no advancing
    }
  }

  const buffed = enemyOfficerNear(e);
  const range = unitRange(e, e.t.range) * fogMult();
  // hit-squad mode: the player commands the squad, so nobody advances on
  // his own — men move only on orders and fight from where they stand
  const command = G.mode === 'hitsquad';

  if (e.t.tank) { updateTank(e, dt); return; }
  if (e.t.bike) { updateBike(e, dt); return; }
  if (e.t.apc) { updateHalftrack(e, dt); return; }
  if (e.t.vehicle) { updateEnemyJeep(e, dt); return; }

  // player-ordered movement: run to the marker, no shooting on the move
  if (command) {
    if (e.moveTo) {
      const d = dist(e, e.moveTo);
      if (d < 4) {
        e.moveTo = null;
      } else {
        e.face = Math.atan2(e.moveTo.y - e.y, e.moveTo.x - e.x);
        let speed = e.t.speed * (buffed ? 1.25 : 1);
        // barbed wire drags commandos just like everyone else
        for (const wr of G.wires) {
          if (wr.hp > 0 && Math.abs(e.x - wr.x) < 40 && Math.abs(e.y - wr.y) < 14) {
            speed *= wr.up ? 0.05 : 0.12;
            wr.hp -= (wr.up ? 3 : 5) * dt;
            break;
          }
        }
        e.x = clamp(e.x + Math.cos(e.face) * speed * dt, 14, W - 14);
        e.y = clamp(e.y + Math.sin(e.face) * speed * dt, 14, H - 14);
        return;
      }
    }
  } else if (e.pushT > 0) {
    // discipline only goes so far: every German periodically stops shooting and
    // pushes up the field, so long-range shooters eventually close the distance
    e.pushT -= dt;
    advance(e, dt, buffed);
    return;
  }

  if (e.t.flame) {
    const ft = nearestUnitInRange(e, unitRange(e, e.t.flame.range));
    if (ft) {
      e.face = Math.atan2(ft.y - e.y, ft.x - e.x);
      flameSpray(e, dt);
    } else if (!command) {
      advance(e, dt, buffed);
    }
    return;
  }

  if (e.t.shotgun) {
    const sg = e.t.shotgun;
    const st = nearestUnitInRange(e, unitRange(e, sg.range) * fogMult());
    if (st) e.face = Math.atan2(st.y - e.y, st.x - e.x);
    e.cd -= dt;
    if (st && e.cd <= 0) {
      fireShotgun(e, { rofMult: 1, accBonus: 0, dmgMult: 1 });
      e.cd = e.t.rof * rand(0.85, 1.15);
    } else if (!st && !command) {
      advance(e, dt, buffed);
    }
    return;
  }

  const target = nearestUnitInRange(e, range);
  let rocketTarget = null;
  let mortarTarget = null;

  // grenadier lobs grenades
  if (e.t.grenade) {
    e.grenCd -= dt;
    const gt = nearestUnitInRange(e, 190);
    if (gt && e.grenCd <= 0) {
      e.grenCd = rand(4.5, 6.5);
      e.grenThrowT = 0.35;
      SFX.grenadeToss();
      G.grenades.push({
        x: e.x, y: e.y,
        tx: gt.x + rand(-14, 14), ty: gt.y + rand(-14, 14),
        t: 0, dur: 1.0, sx: e.x, sy: e.y,
        kind: 'stick',
      });
    }
  }

  if (e.t.rocket) {
    e.rocketCd -= dt;
    const rk = e.t.rocket;
    const rr = rk.range * fogMult();
    const safe = u => dist(e, u) > rk.r + 20;
    rocketTarget = nearestUnitInRange(e, rr, u => u.t.tank && safe(u)) ||
                   nearestUnitInRange(e, rr, u => (u.t.vehicle || u.t.atgun) && safe(u)) ||
                   nearestUnitInRange(e, rr, safe);
    if (e.rocketCd <= 0 && rocketTarget) {
      e.rocketCd = rand(rk.cdMin, rk.cdMax);
      e.face = Math.atan2(rocketTarget.y - e.y, rocketTarget.x - e.x);
      SFX.rocket();
      const d = dist(e, rocketTarget);
      let scatter = 8 + d * 0.11;
      if (rocketTarget.t.tank) scatter *= 0.45;
      scatter = Math.max(6, scatter);
      const tx = rocketTarget.x + rand(-scatter, scatter), ty = rocketTarget.y + rand(-scatter, scatter);
      G.rockets.push({
        sx: e.x, sy: e.y, x: e.x, y: e.y, tx, ty,
        t: 0, dur: Math.max(dist(e, { x: tx, y: ty }) / rk.speed, 0.15),
        r: rk.r, dmg: rk.dmg, by: e,
        kind: 'rocket',
      });
    }
  }

  if (e.t.mortar) {
    e.mortCd -= dt;
    const mt = e.t.mortar;
    const mr = mt.range * fogMult();
    mortarTarget = nearestUnitInRange(e, mr, u => dist(e, u) > mt.min);
    if (e.mortCd <= 0 && mortarTarget) {
      e.mortCd = rand(mt.cdMin, mt.cdMax);
      e.face = Math.atan2(mortarTarget.y - e.y, mortarTarget.x - e.x);
      e.mortarFireT = 0.18;
      G.flashes.push({ x: e.x, y: e.y - 6, r: 5, ttl: 0.07, max: 0.07 });
      scheduleShell(
        mortarTarget.x + rand(-mt.scatter, mt.scatter),
        mortarTarget.y + rand(-mt.scatter, mt.scatter),
        mt.flight, mt.r, mt.dmg, false, e);
    }
  }

  let v2Target = null;
  if (e.t.v2) {
    e.v2Cd -= dt;
    const vk = e.t.v2;
    const vr = vk.range * fogMult();
    // tanks first, then anything else on wheels, then whatever's left beyond
    // minimum range — a V2 battery has no reason to spare infantry, it's
    // just less interested in them than in armor
    const safe = u => dist(e, u) > vk.r + 60;
    v2Target = nearestUnitInRange(e, vr, u => u.t.tank && safe(u)) ||
               nearestUnitInRange(e, vr, u => (u.t.vehicle || u.t.atgun) && safe(u)) ||
               nearestUnitInRange(e, vr, u => dist(e, u) > vk.min && safe(u));
    if (e.v2Cd <= 0 && v2Target) {
      e.v2Cd = rand(vk.cdMin, vk.cdMax);
      e.face = Math.atan2(v2Target.y - e.y, v2Target.x - e.x);
      e.v2FireT = 1.1;
      fireV2Rocket(e, v2Target, vk);
    }
  }

  const engageTarget = target || rocketTarget || mortarTarget || v2Target;

  if (target) {
    rollEnemyPushUrge(e, engageTarget, dt, command);
    runWeapon(e, target, dt, buffed ? { rofMult: 0.8 } : null);
    // stormtroopers keep pushing even under fire
    if (!command && e.t.speed >= 30 && dist(e, target) > range * 0.5) {
      advance(e, dt, buffed);
    }
  } else if (engageTarget) {
    // rocket/mortar range but outside the sidearm — hold and engage, push only on urge
    rollEnemyPushUrge(e, engageTarget, dt, command);
  } else if (!command && e.t.speed > 0) {
    advance(e, dt, buffed);
  }
}

// the V2's launch: a big ignition plume at the pad, then a long, wildly
// scattered flight before the warhead comes down (see explodeV2)
function fireV2Rocket(e, target, vk) {
  SFX.rocket();
  G.flashes.push({ x: e.x, y: e.y + 10, r: 30, ttl: 0.4, max: 0.4 });
  for (let i = 0; i < 30; i++) {
    G.particles.push({
      x: e.x + rand(-6, 6), y: e.y + rand(4, 12),
      vx: rand(-40, 40), vy: rand(-140, -30),
      ttl: rand(0.6, 1.3), grav: 40, size: rand(2, 4.5),
      color: pick(['#d8d0c0', '#b8b0a0', '#e8e4d8', '#8a8478']),
    });
  }
  const d = dist(e, target);
  let scatter = vk.scatter + d * 0.14;
  if (target.t.tank) scatter *= 0.6;
  else if (target.t.vehicle || target.t.atgun) scatter *= 0.8;
  const tx = clamp(target.x + rand(-scatter, scatter), 20, W - 20);
  const ty = clamp(target.y + rand(-scatter, scatter), 20, H - 20);
  const s = scheduleShell(tx, ty, vk.flight, vk.r, vk.dmg, true, e, 'v2');
  s.sx = e.x; s.sy = e.y;   // launch point, so the warhead can be drawn flying in
}

// discipline only goes so far: periodically stop shooting and push upfield
function rollEnemyPushUrge(e, target, dt, command) {
  if (command || !target || e.t.speed === 0) return;   // fixed emplacements never push
  e.pushCd -= dt;
  if (e.pushCd <= 0) {
    e.pushCd = rand(3, 6);
    if (Math.random() < 0.4 && dist(e, target) > 70) {
      e.pushT = rand(1.2, 2.8);
    }
  }
}

function advance(e, dt, buffed) {
  e.wobble += dt * 3;
  let speed = e.t.speed * (buffed ? 1.25 : 1);
  // barbed wire drag; fortified wire grips harder and wears slower
  for (const wr of G.wires) {
    if (wr.hp > 0 && Math.abs(e.x - wr.x) < 40 && Math.abs(e.y - wr.y) < 14) {
      speed *= wr.up ? 0.05 : 0.12;
      wr.hp -= (wr.up ? 3 : 5) * dt;
      break;
    }
  }
  e.face = Math.PI / 2 + Math.sin(e.wobble) * 0.25;
  e.x += Math.cos(e.face) * speed * dt * 0.4;
  e.y += Math.sin(e.face) * speed * dt;
  e.x = clamp(e.x, 14, W - 14);
}

function updateTank(e, dt) {
  // grind forward, slower than infantry, ignores wire — and fires on the move
  const spd = e.t.speed * (e.t.heavy ? 0.85 : 1);
  e.y += spd * dt;
  updateTankCombat(e, dt);
}

// ---- motorcycle & sidecar: races down the field, then the crew dismounts

const BIKE_CREW_POOL = ['erifle', 'erifle', 'esmg', 'esmg', 'egren', 'emg', 'eflame'];

function updateBike(e, dt) {
  // barbed wire ends the ride on the spot
  let hitWire = false;
  for (const wr of G.wires) {
    if (wr.hp > 0 && Math.abs(e.x - wr.x) < 40 && Math.abs(e.y - wr.y) < 16) {
      hitWire = true;
      wr.hp -= 30;
      break;
    }
  }

  // dismount at rifle range of the defenders; if nobody contests the ride,
  // it keeps going deep into the backfield before dropping the crew
  if (hitWire || nearestUnitInRange(e, 230 * fogMult()) || e.y > H - 60) {
    dismountBike(e);
    return;
  }

  e.x = clamp(e.x + Math.sin(e.y * 0.02) * 22 * dt, 20, W - 20);
  e.y += e.t.speed * dt;
}

// Kübelwagen: drives at the line, halts in HMG range and hoses the defenders
function updateEnemyJeep(e, dt) {
  const command = G.mode === 'hitsquad';
  if (e.pushT > 0) {
    e.pushT -= dt;
    driveEnemyVehicle(e, dt, 0.08, 8, true);
    return;
  }
  const target = nearestUnitInRange(e, unitRange(e, e.t.range) * fogMult());
  if (target) {
    rollEnemyPushUrge(e, target, dt, command);
    runWeapon(e, target, dt, null);
    return;
  }
  driveEnemyVehicle(e, dt, 0.08, 8, true);
}

function driveEnemyVehicle(e, dt, wireDrag, wireDmg, wobble) {
  let speed = e.t.speed;
  for (const wr of G.wires) {
    if (wr.hp > 0 && Math.abs(e.x - wr.x) < 40 && Math.abs(e.y - wr.y) < 16) {
      speed *= wireDrag;
      wr.hp -= wireDmg * dt;
      break;
    }
  }
  if (wobble) e.x = clamp(e.x + Math.sin(e.y * 0.015) * 12 * dt, 20, W - 20);
  e.y += speed * dt;
  e.face = Math.PI / 2;
}

// Sd.Kfz. 251 halftrack: an armored bus for a full squad. At rifle distance
// of any defender it slams the brakes and the squad piles out at once.
// Afterward it fights on as a slow gun truck with its bow MG.

function updateHalftrack(e, dt) {
  if (!e.unloaded) {
    // rifle distance of a defender: halt and unload the whole squad
    if (nearestUnitInRange(e, 230 * fogMult())) {
      e.unloaded = true;
      SFX.brake();
      for (let i = 0; i < 6; i++) {
        const crew = makeEnemy(pick(BIKE_CREW_POOL),
          clamp(e.x + rand(-28, 28), 14, W - 14), e.y + rand(-18, 14));
        crew.cd = rand(0.4, 1.2);   // a beat to shake out into line
        G.enemies.push(crew);
      }
      return;
    }
  } else {
    const command = G.mode === 'hitsquad';
    if (e.pushT > 0) {
      e.pushT -= dt;
      driveEnemyVehicle(e, dt, 0.2, 15, false);
      return;
    }
    const target = nearestUnitInRange(e, unitRange(e, e.t.range) * fogMult());
    if (target) {
      rollEnemyPushUrge(e, target, dt, command);
      runWeapon(e, target, dt, null);
      return;
    }
  }

  // drive on; wire slows it but the tracks chew through fast
  driveEnemyVehicle(e, dt, 0.2, 15, false);
}

function dismountBike(e) {
  e.dead = true;            // the vehicle leaves play; not a kill, no reward
  stampBike(e, false);
  SFX.brake();
  // two-man crew, each a random trooper type
  for (const off of [-13, 13]) {
    const crew = makeEnemy(pick(BIKE_CREW_POOL),
      clamp(e.x + off, 14, W - 14), e.y + rand(-6, 6));
    crew.cd = rand(0.4, 1.0);   // a beat to shoulder their weapons
    G.enemies.push(crew);
  }
}

// parked (dismounted) or wrecked (shot up) bike left on the field
function stampBike(e, wrecked) {
  gctx.save();
  gctx.translate(e.x, e.y);
  gctx.rotate(wrecked ? rand(-0.9, 0.9) : rand(-0.15, 0.15));
  gctx.globalAlpha = 0.9;
  gctx.fillStyle = wrecked ? '#3a3831' : '#4a4a3f';
  gctx.fillRect(-5, -10, 4, 20);                 // bike frame
  gctx.fillRect(3, -5, 6, 11);                   // sidecar tub
  gctx.fillStyle = '#2c2b24';
  gctx.fillRect(-5.5, -11, 5, 4);                // front wheel
  gctx.fillRect(-5.5, 7, 5, 4);                  // rear wheel
  gctx.fillRect(3.5, 4, 5, 3);                   // sidecar wheel
  gctx.restore();
  gctx.globalAlpha = 1;
}

// ============================================================ main update

function update(dt) {
  G.time += dt;

  G.auraRefresh -= dt;
  if (G.auraRefresh <= 0) {
    G.auraRefresh = AURA_CACHE_INTERVAL;
    G.buffFrame = (G.buffFrame || 0) + 1;
    G.usOfficers = [];
    G.deOfficers = [];
    for (const u of G.units) {
      if (!u.dead && (u.type === 'officer' || u.t.aura)) G.usOfficers.push(u);
    }
    for (const e of G.enemies) {
      if (!e.dead && (e.t.aura || e.type === 'officer' || e.type === 'eoff')) G.deOfficers.push(e);
    }
  }

  // a hit squad has no supply line: no trickle, no officer income, nothing to buy.
  // assault modes get a fixed per-wave allocation only — no trickle or officer income.
  if (G.mode !== 'hitsquad' && !isAssaultMode()) {
    // TP trickle
    G.tpTrickle -= dt;
    if (G.tpTrickle <= 0) { G.tpTrickle = 8; earnTP(1); }

    // officer TP bonus
    G.officerTick -= dt;
    if (G.officerTick <= 0) {
      G.officerTick = 30;
      // rank pays: a MSG officer brings in 3 TP where a green one brings 1
      for (const u of G.units) if (!u.dead && u.type === 'officer') earnTP(1 + u.rank / 3);
    }
  }

  if (inBuildPhase()) {
    if (G.fog > 0) G.fog -= dt;
    for (const e of G.enemies) {
      if (!e.dead && e.chute > 0) updateEnemyChute(e, dt);
    }
    if (G.banner) { G.banner.ttl -= dt; if (G.banner.ttl <= 0) G.banner = null; }
    return;
  }

  if (inLandingPhase()) {
    updateLandingCraft(dt);
    if (G.fog > 0) G.fog -= dt;
    if (G.landingFire) {
      for (const u of G.units) if (!u.dead) updateUnit(u, dt);
      for (const e of G.enemies) if (!e.dead && !e.onCraft) updateEnemy(e, dt);
    }
    if (G.banner) { G.banner.ttl -= dt; if (G.banner.ttl <= 0) G.banner = null; }
    return;
  }

  // spawning: each mode has its own wave source
  if (G.mode === 'allied') {
    updateAlliedWaves(dt);
  } else if (isAssaultMode()) {
    updateAssaultCombat();
  } else if (G.mode === 'hitsquad') {
    // no waves: win when the target falls, lose on the clock or a wiped squad
    if (!G.units.some(u => !u.dead && u.vip)) { victory(); return; }
    if (G.time >= G.level.timeLimit) { gameOver(); return; }
    if (!G.enemies.some(e => !e.dead)) { gameOver(); return; }
  } else if (!isTestingMode()) {
    G.spawnTimer -= dt;
    if (G.spawnTimer <= 0) spawnWave();
  }

  // random events
  if (G.level.events && G.wave >= 3) {
    G.eventTimer -= dt;
    if (G.eventTimer <= 0) {
      const late = wavesPast99(G.wave);
      G.eventTimer = late > 0 ? rand(28, 52) : rand(40, 70);
      triggerEvent();
    }
  }
  if (G.fog > 0) G.fog -= dt;

  for (const u of G.units) if (!u.dead) updateUnit(u, dt);
  for (const e of G.enemies) if (!e.dead) updateEnemy(e, dt);
  for (const u of G.units) if (!u.dead && u.flameT > 0) u.flameT -= dt;
  for (const e of G.enemies) if (!e.dead && e.flameT > 0) e.flameT -= dt;
  for (const u of G.units) if (!u.dead && u.grenThrowT > 0) u.grenThrowT -= dt;
  for (const e of G.enemies) if (!e.dead && e.grenThrowT > 0) e.grenThrowT -= dt;
  for (const u of G.units) if (!u.dead && u.shotgunBlastT > 0) u.shotgunBlastT -= dt;
  for (const u of G.units) if (!u.dead && u.atgunFireT > 0) u.atgunFireT -= dt;
  for (const u of G.units) if (!u.dead && u.mortarFireT > 0) u.mortarFireT -= dt;
  for (const e of G.enemies) if (!e.dead && e.mortarFireT > 0) e.mortarFireT -= dt;
  for (const e of G.enemies) if (!e.dead && e.v2FireT > 0) e.v2FireT -= dt;
  for (const u of G.units) if (!u.dead && u.camoExposed > 0) u.camoExposed -= dt;

  // mines
  for (const m of G.mines) {
    if (m.dead) continue;
    for (const e of G.enemies) {
      if (e.dead || e.chute > 0) continue;
      const trig = e.t.tank ? 22 : e.t.apc ? 19 : e.t.vehicle ? 16 : 11;
      if (dist(m, e) < trig) {
        m.dead = true;
        explode(m.x, m.y, 44, 130, false);
        break;
      }
    }
  }

  // incoming shells
  for (const s of G.shells) {
    s.timer -= dt;
    // the V2 warhead is visibly in flight the whole way down — trail smoke
    // off its exhaust so it reads as a rocket, not a teleporting reticle
    if (s.kind === 'v2' && s.sx != null && s.timer > 0 && Math.random() < 0.75) {
      const f = clamp(1 - s.timer / s.dur, 0, 1);
      const gx = s.sx + (s.x - s.sx) * f, gy = s.sy + (s.y - s.sy) * f;
      const alt = Math.sin(f * Math.PI) * V2_ROCKET_ARC;
      G.particles.push({
        x: gx, y: gy - alt, vx: rand(-6, 6), vy: rand(-6, 6),
        ttl: rand(0.3, 0.6), grav: -8, size: rand(1.6, 3.2),
        color: pick(['#cfc6b0', '#a89f8a', '#8a8272']),
      });
    }
    if (s.timer <= 0) {
      s.done = true;
      if (s.kind === 'v2') explodeV2(s.x, s.y, s.r, s.dmg, s.by);
      else explode(s.x, s.y, s.r, s.dmg, s.big, s.by);
    }
  }

  // friendly aircraft on strafing passes
  for (const p of G.planes) updatePlane(p, dt);

  // rockets in flight
  for (const r of G.rockets) {
    r.t += dt;
    const f = Math.min(r.t / r.dur, 1);
    r.x = r.sx + (r.tx - r.sx) * f;
    r.y = r.sy + (r.ty - r.sy) * f;
    if (Math.random() < 0.7) {
      G.particles.push({
        x: r.x, y: r.y, vx: rand(-8, 8), vy: rand(-8, 8),
        ttl: rand(0.2, 0.45), grav: -30, size: rand(1.5, 2.5),
        color: pick(['#9a9384', '#7d766a', '#b0a898']),
      });
    }
    if (f >= 1) { r.done = true; explode(r.tx, r.ty, r.r, r.dmg, false, r.by); }
  }

  // grenades in flight, then a 3-second fuse once they hit the ground
  for (const g of G.grenades) {
    if (!g.landed) {
      g.t += dt;
      if (g.t >= g.dur) { g.landed = true; g.fuse = 3; }
    } else {
      g.fuse -= dt;
      if (g.fuse <= 0) { g.done = true; explode(g.tx, g.ty, g.r || 38, g.dmg || 60, false, g.by); }
    }
  }

  // breaches: a defeat marker when defending, the objective when attacking.
  // a hit squad has nowhere to breach to — its work is on the field.
  if (G.mode !== 'hitsquad') for (const e of G.enemies) {
    if (!e.dead && e.y > H + 10) {
      e.dead = true; e.breached = true;
      G.breaches++;
      if (isAssaultMode()) {
        showBanner('BREAKTHROUGH! (' + G.breaches + '/' + G.level.winBreaches + ')');
        if (G.breaches >= G.level.winBreaches) victory();
      } else {
        showBanner('GERMAN BREAKTHROUGH! (' + G.breaches + '/' + G.level.breachLimit + ')');
        if (G.breaches >= G.level.breachLimit) gameOver();
      }
    }
  }

  // particles / effects
  for (const p of G.particles) {
    p.ttl -= dt;
    p.vy += (p.grav || 0) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (const tr of G.tracers) tr.ttl -= dt;
  for (const f of G.flashes) f.ttl -= dt;
  for (const tx of G.texts) { tx.ttl -= dt; tx.y -= 14 * dt; }
  for (const cp of G.corpses) cp.ttl -= dt;
  for (const m of G.groundMarks) m.ttl -= dt;
  if (G.banner) { G.banner.ttl -= dt; if (G.banner.ttl <= 0) G.banner = null; }

  // cleanup
  compactInPlace(G.units, u => !u.dead);
  compactInPlace(G.enemies, e => !e.dead);
  compactDefenses(G.sandbags, stampSandbagRubble);
  compactDefenses(G.bunkers, stampBunkerRubble);
  compactDefenses(G.watchtowers, stampWatchtowerRubble);
  compactDefenses(G.camoNests, stampCamoNestRubble);
  compactInPlace(G.wires, w => w.hp > 0);
  compactInPlace(G.mines, m => !m.dead);
  compactInPlace(G.shells, s => !s.done);
  compactInPlace(G.grenades, g => !g.done);
  compactInPlace(G.rockets, r => !r.done);
  compactInPlace(G.planes, p => !p.done);
  compactInPlace(G.particles, p => p.ttl > 0);
  if (G.particles.length > PARTICLE_CAP) G.particles.splice(0, G.particles.length - PARTICLE_CAP);
  compactInPlace(G.tracers, t => t.ttl > 0);
  compactInPlace(G.flashes, f => f.ttl > 0);
  compactInPlace(G.texts, t => t.ttl > 0);
  compactInPlace(G.corpses, c => c.ttl > 0);
  compactInPlace(G.groundMarks, m => m.ttl > 0);
}

function stampSandbagRubble(s) {
  gctx.fillStyle = 'rgba(120,105,70,0.5)';
  gctx.beginPath();
  gctx.ellipse(s.x, s.y, 20, 9, 0, 0, 7);
  gctx.fill();
}

function stampBunkerRubble(b) {
  // shattered concrete slab plus scattered chunks
  gctx.fillStyle = 'rgba(105,102,92,0.6)';
  gctx.beginPath();
  gctx.ellipse(b.x, b.y, 26, 12, 0, 0, 7);
  gctx.fill();
  gctx.fillStyle = 'rgba(80,78,70,0.55)';
  for (let i = 0; i < 6; i++) {
    gctx.beginPath();
    gctx.ellipse(b.x + rand(-22, 22), b.y + rand(-9, 9), rand(3, 7), rand(2, 5), rand(0, 3), 0, 7);
    gctx.fill();
  }
}

function stampWatchtowerRubble(t) {
  // splintered timber frame collapsed in a heap
  gctx.fillStyle = 'rgba(80,66,44,0.55)';
  gctx.beginPath();
  gctx.ellipse(t.x, t.y, 18, 8, 0, 0, 7);
  gctx.fill();
  gctx.strokeStyle = 'rgba(60,48,30,0.6)';
  gctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const a = rand(0, Math.PI * 2), len = rand(8, 16);
    gctx.beginPath();
    gctx.moveTo(t.x, t.y);
    gctx.lineTo(t.x + Math.cos(a) * len, t.y + Math.sin(a) * len * 0.5);
    gctx.stroke();
  }
}

function stampCamoNestRubble(cn) {
  // scorched brush and torn netting
  gctx.fillStyle = 'rgba(45,42,30,0.55)';
  gctx.beginPath();
  gctx.ellipse(cn.x, cn.y, 24, 11, 0, 0, 7);
  gctx.fill();
  gctx.fillStyle = 'rgba(70,60,40,0.5)';
  for (let i = 0; i < 5; i++) {
    gctx.beginPath();
    gctx.ellipse(cn.x + rand(-18, 18), cn.y + rand(-8, 8), rand(3, 6), rand(2, 4), rand(0, 3), 0, 7);
    gctx.fill();
  }
}

function endRun(won, title, stats) {
  G.over = true;
  running = false;
  paused = false;
  const titleEl = document.getElementById('go-title');
  titleEl.textContent = title;
  titleEl.classList.toggle('victory', won);
  document.getElementById('go-stats').textContent = stats;
  const nextBtn = el('next-mission-btn');
  const nextId = won && G ? getNextMissionId(G.level.id) : null;
  if (nextBtn) {
    nextBtn.classList.toggle('hidden', !nextId);
    if (nextId) {
      const nextLevel = LEVELS[nextId];
      nextBtn.dataset.nextLevel = nextId;
      nextBtn.textContent = nextLevel
        ? 'NEXT: ' + (nextLevel.menuName || nextLevel.name)
        : 'NEXT MISSION';
    } else {
      delete nextBtn.dataset.nextLevel;
    }
  }
  document.getElementById('gameover').classList.remove('hidden');
  el('pause').classList.add('hidden');
  refreshHUD();
}

function gameOver() {
  const t = Math.floor(G.time);
  if (isAssaultMode()) {
    const waves = assaultWaves(G.level);
    const defLabel = defenderNationLabel(levelDefenderNation(G.level));
    endRun(false, 'ATTACK REPULSED',
      `All ${waves} waves spent. ${G.breaches}/${G.level.winBreaches} breakthroughs — ` +
      `the ${defLabel} line holds, and ${G.kills} defenders down was not enough.`);
  } else if (G.mode === 'hitsquad') {
    const wiped = !G.enemies.some(e => !e.dead);
    endRun(false, wiped ? 'SQUAD LOST' : 'MISSION FAILED',
      wiped
        ? `All six men are gone after ${t} seconds. The target lives; ${G.kills} Americans went with them.`
        : `Time ran out after ${t} seconds. The target lives. ${G.kills} Americans down for nothing.`);
  } else {
    const diffPrefix = G.mode === 'endless' && G.difficulty ? `${G.difficulty.name} — ` : '';
    endRun(false, 'LINE OVERRUN',
      `${diffPrefix}You held for ${G.wave} waves and ${t} seconds. ` +
      `${G.kills} Germans will not go home.`);
  }
}

function victory() {
  const t = Math.floor(G.time);
  if (isAssaultMode()) {
    const wiped = !G.units.some(u => !u.dead);
    let stats = wiped
      ? `Every defender is down after ${G.wave} waves. ${G.breaches} men through the breach, ${G.kills} eliminated.`
      : `The line collapses after ${G.wave} waves. ` +
        `${G.breaches} men through the breach, ${G.kills} defenders down.`;
    if (G.mode === 'axis') {
      const rpEarned = awardAxisRP(G.level, wiped, G.wave);
      if (rpEarned > 0) stats += ` +${rpEarned} Research Points earned.`;
    }
    endRun(true, 'LINE BROKEN', stats);
  } else if (G.mode === 'hitsquad') {
    const alive = G.enemies.filter(e => !e.dead).length;
    endRun(true, 'TARGET ELIMINATED',
      `The officer is dead after ${t} seconds. ` +
      `${alive}/${G.squadTotal} men walk away; ${G.kills} Americans do not.`);
  } else {
    endRun(true, 'SECTOR HELD',
      `You stopped all ${G.wave} waves in ${t} seconds. ` +
      `${G.kills} Germans will not go home. The line is yours.`);
  }
  if (campaignForLevel(G.level.id)) {
    markLevelComplete(G.level.id);
  }
}

// ============================================================ rendering

function paintGround(level) {
  // base mud/grass field, painted once per game
  gctx.fillStyle = '#5c5a3f';
  gctx.fillRect(0, 0, W, H);
  if (level && level.landingCraft) {
    gctx.fillStyle = '#2a4a6a';
    gctx.fillRect(0, 0, W, BEACH_Y - 8);
    gctx.fillStyle = '#8a7f5c';
    gctx.fillRect(0, BEACH_Y - 8, W, 52);
    for (let i = 0; i < 120; i++) {
      gctx.fillStyle = 'rgba(110,100,72,0.35)';
      gctx.beginPath();
      gctx.ellipse(rand(0, W), rand(BEACH_Y - 6, BEACH_Y + 40), rand(3, 10), rand(2, 5), rand(0, 3), 0, 7);
      gctx.fill();
    }
  }
  for (let i = 0; i < 700; i++) {
    gctx.fillStyle = pick([
      'rgba(90,88,60,0.25)', 'rgba(78,76,52,0.25)', 'rgba(104,100,66,0.2)',
      'rgba(70,66,46,0.22)', 'rgba(96,94,58,0.18)',
    ]);
    gctx.beginPath();
    gctx.ellipse(rand(0, W), rand(0, H), rand(4, 18), rand(3, 10), rand(0, 3), 0, 7);
    gctx.fill();
  }
  // grass tufts
  for (let i = 0; i < 240; i++) {
    gctx.strokeStyle = 'rgba(84,96,50,0.6)';
    gctx.lineWidth = 1;
    const x = rand(0, W), y = rand(0, H);
    gctx.beginPath();
    gctx.moveTo(x, y);
    gctx.lineTo(x + rand(-2, 2), y - rand(2, 5));
    gctx.stroke();
  }
  // the trench line marking your deploy zone
  gctx.fillStyle = 'rgba(46,42,28,0.85)';
  gctx.fillRect(0, DEPLOY_Y - 3, W, 14);
  gctx.fillStyle = 'rgba(30,27,18,0.9)';
  gctx.fillRect(0, DEPLOY_Y, W, 7);
  for (let x = 8; x < W; x += 26) {
    gctx.fillStyle = 'rgba(74,60,38,0.9)';
    gctx.fillRect(x, DEPLOY_Y - 5, 12, 4);
  }
}

// a man flat in the dirt: long low silhouette, rifle grounded beside him
function drawProneSoldier(a) {
  const c = ctx;
  const us = (a.nation || a.side) === 'us';
  const isBar = a.type === 'gunner';
  const isEmg = a.type === 'emg';
  const isMG = isBar || isEmg;
  c.save();
  c.translate(a.x, a.y);
  c.rotate(a.face);
  // ground shadow
  c.fillStyle = 'rgba(0,0,0,0.2)';
  c.beginPath(); c.ellipse(-1, 1.5, isMG ? 11.5 : 10.5, 4, 0, 0, 7); c.fill();
  const gunX = 3 + a.t.gun * 0.82;
  const isGren = a.type === 'grenadier' || a.type === 'egren';
  const isShot = a.type === 'shotgunner';
  const isSniper = a.type === 'sniper' || a.type === 'esniper';
  const isOfficer = a.type === 'officer' || a.type === 'eoff';
  const isRifle = a.type === 'rifleman' || a.type === 'erifle';
  // weapon laid out beside him, not shouldered
  if (a.type === 'eoff') {
    c.save();
    c.translate(3, 2.8);
    drawSidearm(c, 1, 0, gunX - 3, 0, false);
    c.restore();
  } else if (a.type === 'officer') {
    c.save();
    c.translate(3, 2.8);
    drawSidearm(c, 1, 0, gunX - 3, 0, true);
    c.restore();
  } else if (a.type === 'erifle') {
    c.save();
    c.translate(3, 2.8);
    drawKar98kRifleman(c, 1, 0, gunX - 3, 0);
    c.restore();
  } else if (isRifle) {
    c.save();
    c.translate(3, 2.8);
    drawM1Garand(c, 1, 0, gunX - 3, 0);
    c.restore();
  } else if (isGren && a.type === 'egren') {
    c.save();
    c.translate(3, 2.8);
    drawKar98kGrenadier(c, 1, 0, gunX - 3, 0);
    c.restore();
  } else if (a.type === 'esmg') {
    c.save();
    c.translate(3, 2.8);
    drawMP40(c, 1, 0, gunX - 3, 0);
    c.restore();
  } else if (a.type === 'eflame') {
    c.save();
    c.translate(3, 2.8);
    drawFlammenwerfer(c, 1, 0, gunX - 3, 0, false);
    c.restore();
  } else if (a.type === 'emg') {
    c.save();
    c.translate(3, 2.8);
    drawMG42(c, 1, 0, gunX - 3, 0);
    c.restore();
  } else if (a.type === 'bazooka') {
    c.save();
    c.translate(3, 2.8);
    drawBazooka(c, 1, 0, 0);
    c.restore();
    c.strokeStyle = '#4a4038';
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(2.5, 3.5); c.lineTo(2.5, 5.5); c.lineTo(3.8, 5.5); c.stroke();
  } else if (a.type === 'ebazooka') {
    c.save();
    c.translate(3, 2.8);
    drawPanzerfaust(c, 1, 0, 0);
    c.restore();
    c.fillStyle = '#4a4a42';
    c.beginPath(); c.arc(gunX + 1.5, 2.2, 1.6, 0, 7); c.fill();
  } else if (!isSniper) {
    c.strokeStyle = '#26261e';
    c.lineWidth = isEmg ? 2.6 : isBar ? 2.2 : isShot ? 2.8 : isGren ? 2 : 1.8;
    c.beginPath(); c.moveTo(3, 2.8); c.lineTo(gunX, 2.8); c.stroke();
  }
  if (isBar) {
    c.strokeStyle = '#4a3f2e';
    c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(2.5, 3.5); c.lineTo(2.5, 5.5); c.lineTo(3.8, 5.5); c.stroke();
    c.fillStyle = '#2a2a1e';
    c.fillRect(3 + a.t.gun * 0.32, 3.5, 3.4, 2.6);
    c.strokeStyle = '#26261e';
    c.lineWidth = 1.2;
    for (const dy of [5, 6.5]) {
      c.beginPath(); c.moveTo(gunX - 1.2, 2.8); c.lineTo(gunX - 0.3, dy); c.stroke();
    }
    drawBARMag(c, -2.5, 1.8, 0.7, 0.25);
    drawBARMag(c, -0.8, 2.8, 0.65, -0.2);
  }
  if (a.type === 'emg') {
    c.fillStyle = '#424038';
    c.beginPath(); c.ellipse(0, 0, 5.9, 3.2, 0, 0, 7); c.fill();
    c.fillStyle = '#4a4a3c';
    c.beginPath(); c.ellipse(-5.2, 2.8, 2.6, 3.2, 0.3, 0, 7); c.fill();
    drawMG42BeltLink(c, -3.5, 3.5, 0.52, 0.2);
    drawMG42BeltLink(c, 1.5, 4.2, 0.48, -0.15);
    c.strokeStyle = '#4a4840';
    c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(-4.5, 1.5); c.lineTo(2.5, 4.5); c.stroke();
    c.fillStyle = '#3a3428';
    c.beginPath(); c.ellipse(4.2, 2.5, 1.4, 2, 0.35, 0, 7); c.fill();
    c.fillStyle = '#3a3830';
    c.fillRect(-6.2, 3.5, 2.6, 2.2);
  }
  if (a.type === 'grenadier') {
    c.fillStyle = '#2a2a1e';
    c.fillRect(3 + a.t.gun * 0.28, 3.5, 2.5, 2.1);
  }
  if (a.type === 'egren') {
    c.fillStyle = '#3a3830';
    c.beginPath();
    c.moveTo(gunX + 0.2, 2); c.lineTo(gunX + 2.8, 1.6);
    c.lineTo(gunX + 2.5, 2.6); c.lineTo(gunX + 0.4, 2.8);
    c.closePath(); c.fill();
    c.fillStyle = '#2a2a22';
    c.beginPath(); c.arc(gunX + 1.8, 1.9, 0.85, 0, 7); c.fill();
  }
  if (isShot) {
    c.strokeStyle = '#4a3f2e';
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(3.5, 4.2); c.lineTo(gunX - 1, 4.2); c.stroke();
    c.fillStyle = '#5a4a38';
    c.fillRect(3 + a.t.gun * 0.28, 3.2, 3.5, 2);
    c.strokeStyle = '#4a4038';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(gunX - 0.5, 1.8); c.lineTo(gunX + 0.5, 4.2);
    c.lineTo(gunX + 1.8, 1.8);
    c.stroke();
  }
  if (a.type === 'esniper') {
    c.save();
    c.translate(3, 2.8);
    drawKar98kSniper(c, 1, 0, gunX - 3, 0);
    c.restore();
    c.strokeStyle = '#26261e';
    c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(gunX - 1, 2.8); c.lineTo(gunX + 0.2, 5.5); c.stroke();
    c.beginPath(); c.moveTo(gunX - 1, 2.8); c.lineTo(gunX + 0.2, 0.2); c.stroke();
  } else if (a.type === 'sniper') {
    c.save();
    c.translate(3, 2.8);
    drawScopedRifle(c, 1, 0, gunX - 3, 0, true);
    c.restore();
    c.strokeStyle = '#26261e';
    c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(gunX - 1, 2.8); c.lineTo(gunX + 0.2, 5.5); c.stroke();
    c.beginPath(); c.moveTo(gunX - 1, 2.8); c.lineTo(gunX + 0.2, 0.2); c.stroke();
  }
  // legs trailing behind
  c.strokeStyle = a.t.color;
  c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(-4, 0); c.lineTo(-10, -1.8); c.stroke();
  c.beginPath(); c.moveTo(-4, 0); c.lineTo(-10, 1.8); c.stroke();
  // torso stretched along the facing
  c.fillStyle = a.t.color;
  c.beginPath(); c.ellipse(-1, 0, isMG ? 7.2 : isShot ? 7 : isBar ? 7 : isSniper ? 6.8 : isOfficer ? 6.6 : isRifle ? 6.4 : 6.5, isMG ? 3.4 : isShot ? 3.5 : isBar ? 3.3 : isSniper ? 3.1 : isOfficer ? 3.3 : isRifle ? 3.05 : 3.2, 0, 0, 7); c.fill();
  if (isRifle) {
    if (us) {
      c.fillStyle = '#3a4034';
      c.fillRect(-5.2, 2.8, 2.4, 2.2);
      c.fillRect(-1.8, 3.2, 2.4, 2.2);
      c.fillRect(1.6, 3.2, 2.4, 2.2);
      c.fillStyle = '#4a5245';
      c.beginPath(); c.ellipse(-3.8, 1.6, 1.6, 2, 0.35, 0, 7); c.fill();
    } else {
      c.fillStyle = '#3a3428';
      c.fillRect(-5, 3, 2.6, 2.4);
      c.fillRect(2.4, 3, 2.6, 2.4);
      c.fillStyle = '#3a3a32';
      c.beginPath(); c.ellipse(-4.2, 1.2, 1.8, 2.4, 0.35, 0, 7); c.fill();
      c.fillStyle = '#5a5a48';
      c.beginPath(); c.ellipse(4.5, 1.8, 1.6, 2.2, 0.35, 0, 7); c.fill();
    }
  }
  if (a.type === 'eoff') {
    c.fillStyle = '#4a4840';
    c.beginPath(); c.ellipse(0, 0, 5.8, 2.9, 0, 0, 7); c.fill();
    c.fillStyle = '#8a8880';
    c.beginPath(); c.ellipse(2.8, -0.8, 1.4, 0.8, 0.3, 0, 7); c.fill();
    c.beginPath(); c.ellipse(2.8, 0.8, 1.4, 0.8, 0.3, 0, 7); c.fill();
    c.fillStyle = '#3a3428';
    c.beginPath(); c.ellipse(-3.5, 1.8, 1.8, 2.2, 0.35, 0, 7); c.fill();
    c.fillStyle = '#c8b898';
    c.fillRect(2.2, -1.5, 2.8, 3.5);
    c.strokeStyle = '#8a8880';
    c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(3.5, 1.5); c.lineTo(4.8, 3.2); c.stroke();
    c.fillStyle = '#6a5a42';
    c.fillRect(4.5, 2.8, 0.7, 1.5);
  } else if (a.type === 'officer') {
    c.fillStyle = '#5a6048';
    c.beginPath(); c.ellipse(0, 0, 5.8, 2.9, 0, 0, 7); c.fill();
    c.strokeStyle = '#6a5a40';
    c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(-3, -1.2); c.lineTo(2.5, 2.2); c.stroke();
    c.fillStyle = '#3a3028';
    c.beginPath(); c.ellipse(-3.5, 1.8, 1.8, 2.2, 0.35, 0, 7); c.fill();
    c.fillStyle = '#c8b898';
    c.fillRect(2.2, -1.5, 2.8, 3.5);
  }
  if (a.type === 'esniper') {
    c.fillStyle = 'rgba(42,38,28,0.5)';
    c.beginPath(); c.ellipse(0, 0, 5.8, 2.9, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(72,64,48,0.55)';
    c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(-2.5, 0.8); c.lineTo(-4, 2.5); c.stroke();
    c.beginPath(); c.moveTo(2, -0.8); c.lineTo(3.5, -2.2); c.stroke();
    c.fillStyle = '#3a3428';
    c.fillRect(-6, -0.5, 2.5, 3.5);
    drawStripperClip(c, -4.5, 2.5, 0.48, 0.2);
  } else if (a.type === 'sniper') {
    c.fillStyle = 'rgba(30,36,22,0.5)';
    c.beginPath(); c.ellipse(0, 0, 5.5, 2.8, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(45,55,30,0.6)';
    c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(-2, 1); c.lineTo(-3.5, 2.5); c.stroke();
    c.beginPath(); c.moveTo(1.5, -0.5); c.lineTo(3, -2); c.stroke();
  }
  if (isShot) {
    c.fillStyle = '#4a5245';
    c.beginPath(); c.ellipse(0.5, 0, 5.5, 3.2, 0, 0, 7); c.fill();
    drawShotgunShell(c, -3, 1.5, 0.7, 0.3);
    drawShotgunShell(c, -1, 2.5, 0.65, -0.2);
  }
  if (isBar) {
    c.fillStyle = '#4a5245';
    c.beginPath(); c.ellipse(0, 0, 5.8, 3, 0, 0, 7); c.fill();
    c.strokeStyle = '#8a7a48';
    c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-3, -1.5); c.lineTo(2, 2.5); c.stroke();
  }
  // headgear at the head end
  if (a.type === 'eoff') {
    c.save();
    c.translate(5, 0);
    drawEoffCap(c, 1, 0);
    c.restore();
  } else if (a.type === 'officer') {
    c.save();
    c.translate(5, 0);
    drawOfficerCap(c, 1, 0, true);
    c.restore();
  } else if (a.type === 'esniper') {
    c.fillStyle = '#3f3f34';
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.fill();
    c.fillStyle = 'rgba(58,52,40,0.55)';
    for (let i = 0; i < 5; i++) {
      const ang = i * Math.PI / 2.5 + 0.2;
      c.beginPath();
      c.ellipse(5 + Math.cos(ang) * 2.5, Math.sin(ang) * 2.5, 0.9, 1.3, ang, 0, 7);
      c.fill();
    }
    c.strokeStyle = 'rgba(200,198,180,0.65)';
    c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(4.2, -0.5); c.lineTo(5.8, -0.5); c.stroke();
    c.beginPath(); c.moveTo(5, -1.2); c.lineTo(5, 0.2); c.stroke();
  } else if (a.type === 'sniper') {
    c.fillStyle = '#2e3823';
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(48,58,32,0.7)';
    c.lineWidth = 0.65;
    for (let i = 0; i < 6; i++) {
      const ang = i * Math.PI / 3;
      c.beginPath();
      c.moveTo(5 + Math.cos(ang) * 2.8, Math.sin(ang) * 2.8);
      c.lineTo(5 + Math.cos(ang) * 4, Math.sin(ang) * 4);
      c.stroke();
    }
  } else if (a.type === 'erifle') {
    c.fillStyle = '#61615a';
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1;
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(30,36,22,0.38)';
    c.lineWidth = 0.6;
    for (const off of [-1.5, 0, 1.5]) {
      c.beginPath(); c.arc(5 + off, 0, 2.7, 0.2, 2.9); c.stroke();
    }
    c.fillStyle = 'rgba(200,198,180,0.78)';
    c.beginPath(); c.ellipse(3.5, -1.2, 0.85, 1.1, 0.3, 0, 7); c.fill();
    c.strokeStyle = 'rgba(50,48,40,0.72)';
    c.lineWidth = 0.55;
    c.beginPath();
    c.moveTo(3.1, -1.6); c.quadraticCurveTo(3.6, -2.2, 4.2, -1.5); c.stroke();
  } else if (a.type === 'esmg') {
    c.fillStyle = '#61615a';
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1;
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(230,228,210,0.9)';
    c.lineWidth = 0.85;
    c.beginPath();
    c.moveTo(4.4, -1.6); c.lineTo(5.2, -0.2); c.lineTo(4.7, -0.2); c.lineTo(5.4, 1.6); c.stroke();
    c.fillStyle = 'rgba(230,228,210,0.85)';
    c.beginPath(); c.arc(3.2, -1.2, 1.1, 0, 7); c.fill();
  } else if (a.type === 'eflame') {
    c.fillStyle = '#61615a';
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1;
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.stroke();
    c.fillStyle = 'rgba(255,120,40,0.88)';
    c.beginPath();
    c.moveTo(4.2, 1.2);
    c.quadraticCurveTo(4.8, -0.8, 5.4, -1.8);
    c.quadraticCurveTo(5.8, -0.4, 5.5, 1.4);
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(230,180,80,0.75)';
    c.lineWidth = 0.55;
    c.stroke();
  } else if (a.type === 'emg') {
    c.fillStyle = '#61615a';
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1;
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(230,228,210,0.88)';
    c.lineWidth = 0.75;
    c.beginPath();
    c.moveTo(3.8, -0.5); c.lineTo(5.8, -0.5);
    c.moveTo(3.8, 0.5); c.lineTo(5.8, 0.5);
    c.moveTo(4.2, -1.2); c.lineTo(4.2, 1.2);
    c.stroke();
    c.beginPath();
    c.moveTo(4.5, -1.5); c.lineTo(5.5, 1.5);
    c.moveTo(5.5, -1.5); c.lineTo(4.5, 1.5);
    c.stroke();
  } else if (isRifle) {
    c.fillStyle = '#5b6b4a';
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1;
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(30,36,22,0.38)';
    c.lineWidth = 0.6;
    for (const off of [-1.5, 0, 1.5]) {
      c.beginPath(); c.arc(5 + off, 0, 2.7, 0.2, 2.9); c.stroke();
    }
  } else {
    c.fillStyle = a.type === 'medic' ? '#ddd8c8' : us ? '#5b6b4a' : '#61615a';
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1;
    c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.stroke();
  }
  if (a.type === 'eflame') {
    c.fillStyle = '#3a3834';
    c.beginPath(); c.ellipse(0, 0, 5.9, 3.3, 0, 0, 7); c.fill();
    c.strokeStyle = '#5a5a50';
    c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(-2.5, -1.2); c.lineTo(2.5, 1.2); c.stroke();
    c.beginPath(); c.moveTo(-2.5, 1.2); c.lineTo(2.5, -1.2); c.stroke();
    c.fillStyle = '#6a6a58';
    c.beginPath(); c.ellipse(-5.5, -1.8, 3.6, 1.7, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(-5.5, 1.8, 3.6, 1.7, 0, 0, 7); c.fill();
    c.fillStyle = '#4a4a42';
    c.beginPath(); c.ellipse(-4.8, 0, 1.5, 1.1, 0, 0, 7); c.fill();
    c.strokeStyle = '#2a2820';
    c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(3, 2.8); c.quadraticCurveTo(-1.5, 1.2, -4.5, 0.2); c.stroke();
    c.fillStyle = '#3a3830';
    c.beginPath(); c.ellipse(3.5, 2.5, 1.2, 1.6, 0.35, 0, 7); c.fill();
  } else if (a.type === 'flamer') {
    c.fillStyle = '#7a4828';
    c.beginPath(); c.ellipse(-5.5, 0, 2.2, 3.8, 0, 0, 7); c.fill();
    c.fillStyle = '#3a3c30';
    c.beginPath(); c.ellipse(-5.5, 3.5, 2.2, 3.5, 0, 0, 7); c.fill();
    c.strokeStyle = '#2a2820';
    c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(3, 2.8); c.quadraticCurveTo(-1, 1.5, -4, 0.5); c.stroke();
  }
  if (a.type === 'grenadier') {
    drawFragGrenade(c, -3.5, 1.2, 0.75, { rot: 0.2 });
    drawFragGrenade(c, -1, 2.8, 0.7, { rot: -0.3 });
  }
  if (a.type === 'egren') {
    drawStickGrenade(c, -5.2, 0.2, 0.78, 0.35);
    drawStickGrenade(c, -2.5, 2.2, 0.72, 0.85);
    drawStickGrenade(c, 0.8, 1.5, 0.68, 1.1);
    c.fillStyle = '#4a4a3c';
    c.beginPath(); c.ellipse(-5.5, 3.2, 2.4, 2.8, 0.3, 0, 7); c.fill();
    c.strokeStyle = '#8a3830';
    c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(-1.5, 0.5); c.lineTo(1.5, 3.5); c.stroke();
    c.beginPath(); c.moveTo(1.5, 0.5); c.lineTo(-1.5, 3.5); c.stroke();
  }
  if (a.type === 'esmg') {
    c.fillStyle = '#3e3c34';
    c.beginPath(); c.ellipse(0, 0, 5.6, 3.1, 0, 0, 7); c.fill();
    drawMP40Mag(c, -4.8, 2.8, 0.55, 0.25);
    drawMP40Mag(c, 2.8, 3.5, 0.52, -0.15);
    drawStickGrenade(c, -5.5, 0.5, 0.7, 0.4);
    c.fillStyle = '#3a3428';
    c.beginPath(); c.ellipse(4.2, 2.2, 1.4, 2, 0.35, 0, 7); c.fill();
    c.fillStyle = '#b8261c';
    c.beginPath(); c.ellipse(2.5, 1.2, 1.2, 1.6, 0.3, 0, 7); c.fill();
  }
  if (a.type === 'erifle') {
    c.fillStyle = '#3a3a32';
    c.beginPath(); c.ellipse(-4.5, 1.2, 1.6, 2.2, 0.35, 0, 7); c.fill();
    c.fillStyle = '#5a5a48';
    c.beginPath(); c.ellipse(4.2, 2.2, 1.5, 2, 0.35, 0, 7); c.fill();
    drawStripperClip(c, -5, 3.5, 0.5, 0.2);
    drawStripperClip(c, 2.8, 3.5, 0.48, -0.1);
    c.strokeStyle = '#4a4038';
    c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(1.5, 2.5); c.lineTo(3.8, 4.2); c.stroke();
  }
  if (a.t.mortar && a.type === 'emortar') {
    c.fillStyle = '#2a2c24';
    c.beginPath(); c.ellipse(-5.2, 1.5, 4.5, 2.8, 0.3, 0, 7); c.fill();
    c.strokeStyle = '#4a4c42';
    c.lineWidth = 3.2;
    c.beginPath(); c.moveTo(-5.2, 1.5); c.lineTo(2.5, -4.5); c.stroke();
    c.strokeStyle = '#3a3c34';
    c.lineWidth = 1.4;
    c.beginPath(); c.arc(-1.5, -0.5, 1.8, 0, 7); c.stroke();
    c.fillStyle = '#4a4438';
    c.fillRect(-7.8, 2.5, 5, 3.5);
    drawGrw81Round(c, -6.8, 3.6, 0.68, 0.25);
    drawGrw81Round(c, -5.2, 3.9, 0.64, -0.1);
    drawGrw81Round(c, -3.8, 2.8, 0.6, 0.4);
    c.fillStyle = '#3a3c34';
    c.beginPath(); c.ellipse(2.5, 1.2, 1.6, 2.2, 0.35, 0, 7); c.fill();
  } else if (a.t.mortar) {
    c.fillStyle = '#2f3328';
    c.beginPath(); c.ellipse(-5, 1.5, 4, 2.5, 0.3, 0, 7); c.fill();
    c.strokeStyle = '#5a5c42';
    c.lineWidth = 2.8;
    c.beginPath(); c.moveTo(-5, 1.5); c.lineTo(2, -4); c.stroke();
    c.fillStyle = '#5a4a38';
    c.fillRect(-7.5, 2.5, 4.5, 3);
    drawMortarRound(c, -6.5, 3.5, 0.65, 0.25);
    drawMortarRound(c, -5, 3.8, 0.62, -0.1);
  }
  if (a.type === 'bazooka') {
    drawSpareRocketTube(c, -7.5, -2.5, 5, -5.5);
    c.fillStyle = '#3a3428';
    c.beginPath(); c.ellipse(2.5, 1.8, 1.5, 2, 0.35, 0, 7); c.fill();
  }
  if (a.type === 'ebazooka') {
    drawSpareRocketTube(c, -7, -2, 4.5, -5);
    drawSpareRocketTube(c, -6.5, 2.5, 5, 5.5);
    c.fillStyle = '#4a4a42';
    c.beginPath(); c.arc(4.5, -5, 1.4, 0, 7); c.fill();
    c.beginPath(); c.arc(5, 5.5, 1.2, 0, 7); c.fill();
    drawStickGrenade(c, -4.5, 3.5, 0.62, 0.2);
  }
  c.restore();
}

// a Fallschirmjäger under canopy, seen from directly above: a paneled
// disc overhead that shrinks and fades as the chute timer burns down,
// revealing the jumper beneath as he nears touchdown
function drawParatrooper(e) {
  const c = ctx;
  const p = clamp(e.chute / (e.chuteMax || 3), 0, 1);   // 1 = high, 0 = touchdown
  const wob = e.sway || 0;
  const wobX = Math.cos(wob) * p * 2.2;
  const wobY = Math.sin(wob * 1.3) * p * 1.4;

  // ground shadow sharpens and locks onto the touchdown point as he comes down
  c.fillStyle = `rgba(0,0,0,${0.08 + (1 - p) * 0.17})`;
  c.beginPath(); c.ellipse(e.x, e.y + 1, 4 + (1 - p) * 5, 3 + (1 - p) * 4, 0, 0, 7); c.fill();

  c.save();
  c.translate(e.x + wobX, e.y + wobY);

  const canopyR = 4.5 + p * 10.5;
  const canopyA = 0.3 + p * 0.6;
  const n = 8;

  // shroud lines: spokes from the jumper up to the canopy skirt
  c.strokeStyle = `rgba(60,58,48,${0.15 + canopyA * 0.4})`;
  c.lineWidth = 0.6;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + wob * 0.15;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(Math.cos(ang) * canopyR, Math.sin(ang) * canopyR);
    c.stroke();
  }

  // canopy: a paneled disc directly overhead
  c.fillStyle = `rgba(139,133,112,${canopyA})`;
  c.beginPath(); c.arc(0, 0, canopyR, 0, 7); c.fill();
  c.strokeStyle = `rgba(50,48,38,${canopyA * 0.6})`;
  c.lineWidth = 0.8;
  c.beginPath(); c.arc(0, 0, canopyR, 0, 7); c.stroke();
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + wob * 0.15;
    c.beginPath();
    c.moveTo(Math.cos(ang) * canopyR * 0.3, Math.sin(ang) * canopyR * 0.3);
    c.lineTo(Math.cos(ang) * canopyR, Math.sin(ang) * canopyR);
    c.stroke();
  }

  // the jumper below, seen from above: shoulders and helmet sharpening into focus as he drops
  c.globalAlpha = 0.35 + (1 - p) * 0.65;
  c.fillStyle = e.t.color;
  c.beginPath(); c.ellipse(0, 0.5, 3.3, 4, 0, 0, 7); c.fill();
  c.fillStyle = '#5a5a4c';
  c.beginPath(); c.arc(0, -0.5, 2.6, 0, 7); c.fill();
  c.globalAlpha = 1;

  c.restore();
}

// M2 fragmentation grenade — segmented body, spoon lever, pin ring
function drawFragGrenade(c, x, y, scale, opts) {
  scale = scale || 1;
  const ground = opts && opts.ground;
  const rot = opts && opts.rot != null ? opts.rot : 0;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = '#2a3228';
  c.beginPath(); c.arc(0, 0, 2.2 * scale, 0, 7); c.fill();
  c.strokeStyle = '#1a1e16';
  c.lineWidth = 0.65 * scale;
  for (let i = 0; i < 6; i++) {
    const ang = i * Math.PI / 3;
    c.beginPath();
    c.moveTo(Math.cos(ang) * 1.1 * scale, Math.sin(ang) * 1.1 * scale);
    c.lineTo(Math.cos(ang) * 2.1 * scale, Math.sin(ang) * 2.1 * scale);
    c.stroke();
  }
  if (!ground) {
    c.fillStyle = '#4a4a3e';
    c.fillRect(-0.55 * scale, -3.3 * scale, 1.1 * scale, 1.5 * scale);
    c.strokeStyle = '#8a7a48';
    c.lineWidth = 0.95 * scale;
    c.beginPath();
    c.arc(0, -3.9 * scale, 1.15 * scale, Math.PI * 0.12, Math.PI * 0.88);
    c.stroke();
    c.strokeStyle = '#c8b868';
    c.lineWidth = 0.55 * scale;
    c.beginPath(); c.arc(1.35 * scale, -3.6 * scale, 0.55 * scale, 0, 7); c.stroke();
  }
  c.restore();
}

// Stielhandgranate — steel can, porcelain cap, red warning band, wooden handle
function drawStickGrenade(c, x, y, scale, rot) {
  scale = scale || 1;
  rot = rot != null ? rot : 0;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.strokeStyle = '#6b5330';
  c.lineWidth = 1.55 * scale;
  c.beginPath(); c.moveTo(0, 0.5 * scale); c.lineTo(0, 6.2 * scale); c.stroke();
  c.strokeStyle = '#5a4828';
  c.lineWidth = 0.55 * scale;
  c.beginPath(); c.moveTo(-0.45 * scale, 1.2 * scale); c.lineTo(-0.45 * scale, 5.8 * scale); c.stroke();
  c.fillStyle = '#33332a';
  c.beginPath(); c.arc(0, -0.6 * scale, 2.05 * scale, 0, 7); c.fill();
  c.strokeStyle = '#1e1e18';
  c.lineWidth = 0.75 * scale;
  c.beginPath(); c.arc(0, -0.6 * scale, 2.05 * scale, 0, 7); c.stroke();
  c.fillStyle = '#c8c4b8';
  c.beginPath(); c.arc(0, -1.35 * scale, 1.45 * scale, Math.PI, 0); c.fill();
  c.strokeStyle = '#9a9690';
  c.lineWidth = 0.45 * scale;
  c.beginPath(); c.arc(0, -1.35 * scale, 1.45 * scale, Math.PI, 0); c.stroke();
  c.fillStyle = '#4a4a40';
  c.fillRect(-0.85 * scale, -2.7 * scale, 1.7 * scale, 1.15 * scale);
  c.strokeStyle = '#8a3028';
  c.lineWidth = 1.15 * scale;
  c.beginPath(); c.moveTo(0, 2.6 * scale); c.lineTo(0, 4.1 * scale); c.stroke();
  c.strokeStyle = '#4a4038';
  c.lineWidth = 0.5 * scale;
  c.beginPath(); c.arc(1.15 * scale, -2.4 * scale, 0.6 * scale, 0, 7); c.stroke();
  c.restore();
}

function drawGrenadeProjectile(g, x, y) {
  const spin = g.landed ? 0 : g.t * 9;
  if (g.kind === 'stick') {
    drawStickGrenade(ctx, x, y, 1.05, -Math.PI / 2 + spin * 0.3);
  } else {
    drawFragGrenade(ctx, x, y, 1.05, { rot: spin });
  }
  if (g.landed) {
    const blink = Math.sin(g.fuse * (14 - g.fuse * 2)) > 0;
    if (blink) {
      ctx.fillStyle = '#ff5a2a';
      ctx.beginPath(); ctx.arc(x, y - 4, 1.3, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,140,40,0.35)';
      ctx.beginPath(); ctx.arc(x, y - 4, 2.8, 0, 7); ctx.fill();
    }
  }
}

// 12-gauge shell on a bandolier loop
function drawShotgunShell(c, x, y, scale, rot) {
  scale = scale || 1;
  rot = rot != null ? rot : 0;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = '#8a3828';
  c.fillRect(-0.75 * scale, -2.1 * scale, 1.5 * scale, 2.6 * scale);
  c.fillStyle = '#c8a858';
  c.fillRect(-0.6 * scale, -2.4 * scale, 1.2 * scale, 0.95 * scale);
  c.strokeStyle = '#5a3020';
  c.lineWidth = 0.45 * scale;
  c.strokeRect(-0.75 * scale, -2.1 * scale, 1.5 * scale, 2.6 * scale);
  c.restore();
}

// BAR box magazine for bandolier loops
function drawBARMag(c, x, y, scale, rot) {
  scale = scale || 1;
  rot = rot != null ? rot : 0;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = '#2a2a1e';
  c.fillRect(-1.1 * scale, -1.8 * scale, 2.2 * scale, 3.6 * scale);
  c.strokeStyle = '#1a1a14';
  c.lineWidth = 0.5 * scale;
  c.strokeRect(-1.1 * scale, -1.8 * scale, 2.2 * scale, 3.6 * scale);
  c.fillStyle = '#c8a858';
  c.fillRect(-0.7 * scale, -2 * scale, 1.4 * scale, 0.7 * scale);
  c.restore();
}

// scoped bolt-action rifle — Springfield (US) or Gewehr 98 (Axis)
// M1911 (US) or Walther P38 (Axis) — officers and mortar crew sidearms
function drawSidearm(c, fx, fy, gunLen, face, us) {
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const px = -fy, py = fx;
  if (us) {
    c.strokeStyle = '#26261e';
    c.lineWidth = 1.85;
    c.beginPath();
    c.moveTo(fx * 2, fy * 2);
    c.lineTo(tipX, tipY);
    c.stroke();
    c.strokeStyle = '#3a3830';
    c.lineWidth = 2.3;
    c.beginPath();
    c.moveTo(fx * 2.1 + px * 0.7, fy * 2.1 + py * 0.7);
    c.lineTo(tipX + px * 0.55, tipY + py * 0.55);
    c.stroke();
    c.fillStyle = '#4a4038';
    c.beginPath();
    c.moveTo(fx * 3.2 + px * 1.5, fy * 3.2 + py * 1.5);
    c.lineTo(fx * 3.5 + px * 3.4, fy * 3.5 + py * 3.4);
    c.lineTo(fx * 2.7 + px * 3.1, fy * 2.7 + py * 3.1);
    c.lineTo(fx * 2.9 + px * 1.3, fy * 2.9 + py * 1.3);
    c.closePath(); c.fill();
    c.strokeStyle = '#3a3830';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(fx * 3.4 + px * 2.1, fy * 3.4 + py * 2.1, 1.35, face - 0.75, face + 0.55);
    c.stroke();
    c.fillStyle = '#2a2820';
    c.beginPath(); c.arc(fx * 2.5 + px * 0.5, fy * 2.5 + py * 0.5, 0.55, 0, 7); c.fill();
    c.fillStyle = '#1c1c16';
    c.beginPath(); c.arc(tipX, tipY, 0.85, 0, 7); c.fill();
  } else {
    c.strokeStyle = '#26261e';
    c.lineWidth = 1.75;
    c.beginPath();
    c.moveTo(fx * 2, fy * 2);
    c.lineTo(tipX, tipY);
    c.stroke();
    c.strokeStyle = '#3a3830';
    c.lineWidth = 2.1;
    c.beginPath();
    c.moveTo(fx * 2.2 + px * 0.55, fy * 2.2 + py * 0.55);
    c.lineTo(tipX + px * 0.45, tipY + py * 0.45);
    c.stroke();
    c.fillStyle = '#4a4038';
    c.beginPath();
    c.moveTo(fx * 3 + px * 1.4, fy * 3 + py * 1.4);
    c.lineTo(fx * 3.3 + px * 3.2, fy * 3.3 + py * 3.2);
    c.lineTo(fx * 2.6 + px * 2.9, fy * 2.6 + py * 2.9);
    c.lineTo(fx * 2.8 + px * 1.2, fy * 2.8 + py * 1.2);
    c.closePath(); c.fill();
    c.fillStyle = '#5a5a52';
    c.beginPath();
    c.moveTo(fx * 2.4 - px * 0.5, fy * 2.4 - py * 0.5);
    c.lineTo(fx * 2.8 - px * 0.3, fy * 2.8 - py * 0.3);
    c.lineTo(fx * 2.6 - px * 0.8, fy * 2.6 - py * 0.8);
    c.closePath(); c.fill();
    c.strokeStyle = '#3a3830';
    c.lineWidth = 0.95;
    c.beginPath();
    c.arc(fx * 3.2 + px * 1.9, fy * 3.2 + py * 1.9, 1.2, face - 0.7, face + 0.45);
    c.stroke();
    c.fillStyle = '#1c1c16';
    c.beginPath(); c.arc(tipX, tipY, 0.8, 0, 7); c.fill();
  }
}

function drawOfficerCap(c, fx, fy, us) {
  c.fillStyle = us ? '#3f4a2e' : '#4a4840';
  c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = 0.9;
  c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.stroke();
  c.fillStyle = us ? '#2f3824' : '#8a2820';
  c.fillRect(-4.1, 0.2, 8.2, 2);
  c.fillStyle = 'rgba(0,0,0,0.48)';
  c.beginPath();
  c.ellipse(fx * 3.5, -1 + fy * 3.5, 3.1, 1.55, Math.atan2(fy, fx), 0, 7);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.28)';
  c.lineWidth = 0.75;
  c.beginPath();
  c.ellipse(fx * 3.5, -1 + fy * 3.5, 3.1, 1.55, Math.atan2(fy, fx), 0, 7);
  c.stroke();
  if (us) {
    c.fillStyle = '#ffd94a';
    c.beginPath(); c.arc(0, -1.2, 1.7, 0, 7); c.fill();
    c.fillStyle = '#2a3820';
    c.fillRect(-0.55, -2.4, 1.1, 2.2);
    c.fillRect(-1.3, -0.6, 2.6, 0.55);
  } else {
    c.strokeStyle = '#c8c8c0';
    c.lineWidth = 1.15;
    c.beginPath(); c.arc(0, -1.3, 1.65, 0.35, 6); c.stroke();
    c.fillStyle = '#e8e0c0';
    c.beginPath(); c.arc(0, -1.3, 0.75, 0, 7); c.fill();
    c.fillStyle = '#2a2820';
    c.beginPath(); c.arc(0, -1.3, 0.35, 0, 7); c.fill();
  }
  c.strokeStyle = '#3a3028';
  c.lineWidth = 0.85;
  c.beginPath();
  c.moveTo(-3.4, 0.8);
  c.lineTo(-fx * 2.8, -1 + fy * 2.8);
  c.lineTo(3.4, 0.8);
  c.stroke();
}

// Schirmmütze peaked cap — silver cord, cockade, and oak leaves
function drawEoffCap(c, fx, fy) {
  c.fillStyle = '#4a4840';
  c.beginPath(); c.arc(0, -1.2, 4.0, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = 0.85;
  c.beginPath(); c.arc(0, -1.2, 4.0, 0, 7); c.stroke();
  c.fillStyle = '#8a2820';
  c.fillRect(-4.1, -0.2, 8.2, 1.8);
  c.fillStyle = '#3a3834';
  c.fillRect(-3.8, 0.6, 7.6, 2.2);
  c.fillStyle = 'rgba(0,0,0,0.5)';
  c.beginPath();
  c.ellipse(fx * 3.8, -1 + fy * 3.8, 3.4, 1.7, Math.atan2(fy, fx), 0, 7);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.28)';
  c.lineWidth = 0.7;
  c.beginPath();
  c.ellipse(fx * 3.8, -1 + fy * 3.8, 3.4, 1.7, Math.atan2(fy, fx), 0, 7);
  c.stroke();
  c.strokeStyle = '#c8c8c0';
  c.lineWidth = 0.85;
  c.beginPath();
  c.moveTo(-3.2, 0.3); c.quadraticCurveTo(0, 2.3, 3.2, 0.3); c.stroke();
  const cx = -fx * 1.8, cy = -1.2 + fy * 1.8;
  c.fillStyle = '#e8e0c0';
  c.beginPath(); c.arc(cx, cy, 0.85, 0, 7); c.fill();
  c.fillStyle = '#8a2820';
  c.beginPath(); c.arc(cx, cy, 0.45, 0, 7); c.fill();
  c.strokeStyle = '#c8c8c0';
  c.lineWidth = 1.15;
  c.beginPath(); c.arc(0, -1.4, 1.7, 0.2, 6); c.stroke();
  c.fillStyle = '#e8e0c0';
  c.beginPath(); c.arc(0, -1.4, 0.7, 0, 7); c.fill();
  c.fillStyle = '#2a2820';
  c.beginPath(); c.arc(0, -1.4, 0.32, 0, 7); c.fill();
  c.strokeStyle = '#3a3028';
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(-3.4, 0.9); c.lineTo(-fx * 2.8, -1 + fy * 2.8); c.lineTo(3.4, 0.9); c.stroke();
}

function drawEoffKit(c, fx, fy, face) {
  c.strokeStyle = '#6a5a42';
  c.lineWidth = 1.75;
  c.beginPath();
  c.moveTo(-fy * 4.8 - fx * 2.8, fx * 4.8 - fy * 2.8);
  c.lineTo(fy * 4.8 - fx * 2.8, -fx * 4.8 - fy * 2.8);
  c.stroke();
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(-5.5, 4.2); c.lineTo(5.5, 4.2); c.stroke();
  c.fillStyle = '#8a8a80';
  c.fillRect(-1.8, 3.4, 3.6, 2.2);
  c.strokeStyle = '#4a4030';
  c.lineWidth = 0.7;
  c.strokeRect(-1.8, 3.4, 3.6, 2.2);
  const rx = -fy * 1.8, ry = fx * 1.8;
  c.fillStyle = '#2a2820';
  c.fillRect(rx - 0.6, ry - 1.5, 1.2, 3);
  c.fillStyle = '#e8e0c0';
  c.beginPath(); c.arc(rx, ry, 0.65, 0, 7); c.fill();
  c.fillStyle = '#2a2820';
  c.fillRect(rx - 0.25, ry - 0.2, 0.5, 1.4);
  c.fillRect(rx - 0.7, ry + 0.1, 1.4, 0.5);
  c.fillStyle = '#3a3428';
  c.beginPath(); c.ellipse(-fy * 5.8, fx * 5.8, 2.3, 2.9, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.85;
  c.stroke();
  c.fillStyle = '#c8b898';
  c.fillRect(fy * 4.2 - 2, -fx * 4.2 - 2.2, 3.8, 4.8);
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 0.65;
  c.strokeRect(fy * 4.2 - 2, -fx * 4.2 - 2.2, 3.8, 4.8);
  c.strokeStyle = '#8a7a58';
  c.lineWidth = 0.5;
  c.beginPath();
  c.moveTo(fy * 4.2 - 1.4, -fx * 4.2 + 0.2);
  c.lineTo(fy * 4.2 + 1.2, -fx * 4.2 + 1.5);
  c.stroke();
  c.fillStyle = '#2a2a22';
  c.fillRect(-fy * 3.2 - 2.2, fx * 3.2 - 1.3, 4.4, 2.8);
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 0.75;
  c.strokeRect(-fy * 3.2 - 2.2, fx * 3.2 - 1.3, 4.4, 2.8);
  c.fillStyle = '#1a1a14';
  c.beginPath(); c.arc(-fy * 3.2 - 1.3, fx * 3.2, 0.9, 0, 7); c.fill();
  c.beginPath(); c.arc(-fy * 3.2 + 1.3, fx * 3.2, 0.9, 0, 7); c.fill();
  c.fillStyle = 'rgba(120,130,110,0.42)';
  c.beginPath(); c.arc(-fy * 3.2 - 1.3, fx * 3.2, 0.42, 0, 7); c.fill();
  c.beginPath(); c.arc(-fy * 3.2 + 1.3, fx * 3.2, 0.42, 0, 7); c.fill();
  c.strokeStyle = '#8a8880';
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(fy * 3.5, -fx * 3.5); c.lineTo(fy * 5.2, -fx * 5.2 + 0.5); c.stroke();
  c.fillStyle = '#3a3428';
  c.beginPath(); c.ellipse(fy * 5.4, -fx * 5.4 + 0.5, 0.8, 1.4, face + 0.6, 0, 7); c.fill();
  c.fillStyle = '#6a5a42';
  c.fillRect(fy * 4.8 - 0.4, -fx * 4.8 - 0.3, 0.8, 1.8);
  c.strokeStyle = '#8a7a58';
  c.lineWidth = 0.65;
  c.beginPath();
  c.moveTo(-fy * 2.5, fx * 2.5);
  c.quadraticCurveTo(-fy * 1.5, fx * 1.5 + 2, fy * 1, -fx * 1);
  c.stroke();
  c.fillStyle = '#6a5a48';
  c.beginPath(); c.ellipse(fy * 1.2, -fx * 1.2, 0.7, 1.1, face, 0, 7); c.fill();
}

function drawOfficerKit(c, fx, fy, face, us) {
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 1.75;
  c.beginPath();
  c.moveTo(-fy * 4.8 - fx * 2.8, fx * 4.8 - fy * 2.8);
  c.lineTo(fy * 4.8 - fx * 2.8, -fx * 4.8 - fy * 2.8);
  c.stroke();
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(-5.5, 4.2); c.lineTo(5.5, 4.2); c.stroke();
  c.fillStyle = us ? '#c8a858' : '#8a8a80';
  c.fillRect(-1.6, 3.4, 3.2, 2.2);
  c.strokeStyle = '#4a4030';
  c.lineWidth = 0.7;
  c.strokeRect(-1.6, 3.4, 3.2, 2.2);
  c.fillStyle = '#3a3028';
  c.beginPath(); c.ellipse(-fy * 5.8, fx * 5.8, 2.3, 2.9, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.85;
  c.stroke();
  c.fillStyle = '#c8b898';
  c.fillRect(fy * 4.2 - 2, -fx * 4.2 - 2.2, 3.8, 4.8);
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 0.65;
  c.strokeRect(fy * 4.2 - 2, -fx * 4.2 - 2.2, 3.8, 4.8);
  c.strokeStyle = '#8a7a58';
  c.lineWidth = 0.5;
  c.beginPath();
  c.moveTo(fy * 4.2 - 1.4, -fx * 4.2 + 0.2);
  c.lineTo(fy * 4.2 + 1.2, -fx * 4.2 + 1.5);
  c.stroke();
  c.fillStyle = '#2a2a22';
  c.fillRect(-fy * 3.2 - 2.2, fx * 3.2 - 1.3, 4.4, 2.8);
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 0.75;
  c.strokeRect(-fy * 3.2 - 2.2, fx * 3.2 - 1.3, 4.4, 2.8);
  c.fillStyle = '#1a1a14';
  c.beginPath(); c.arc(-fy * 3.2 - 1.3, fx * 3.2, 0.9, 0, 7); c.fill();
  c.beginPath(); c.arc(-fy * 3.2 + 1.3, fx * 3.2, 0.9, 0, 7); c.fill();
  c.fillStyle = 'rgba(120,150,170,0.42)';
  c.beginPath(); c.arc(-fy * 3.2 - 1.3, fx * 3.2, 0.42, 0, 7); c.fill();
  c.beginPath(); c.arc(-fy * 3.2 + 1.3, fx * 3.2, 0.42, 0, 7); c.fill();
  c.fillStyle = '#ffd94a';
  c.beginPath(); c.arc(fy * 2.5, -fx * 2.5, 0.85, 0, 7); c.fill();
  c.strokeStyle = '#3a3028';
  c.lineWidth = 0.6;
  c.beginPath(); c.arc(fy * 2.5, -fx * 2.5, 0.85, 0, 7); c.stroke();
}

function drawM1Garand(c, fx, fy, gunLen, face) {
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const px = -fy, py = fx;
  c.strokeStyle = '#26261e';
  c.lineWidth = 2.25;
  c.beginPath();
  c.moveTo(fx * 2, fy * 2);
  c.lineTo(tipX, tipY);
  c.stroke();
  c.strokeStyle = '#4a3f2e';
  c.lineWidth = 2.45;
  c.beginPath();
  c.moveTo(fx * 1.05 - px * 2.6, fy * 1.05 + py * 2.6);
  c.lineTo(fx * 1.05 + px * 2.4, fy * 1.05 - py * 2.4);
  c.stroke();
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 1.65;
  c.beginPath();
  c.moveTo(fx * 2.4 + px * 1.15, fy * 2.4 + py * 1.15);
  c.lineTo(fx * (gunLen * 0.8) + px * 1.15, fy * (gunLen * 0.8) + py * 1.15);
  c.stroke();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 1.05;
  c.beginPath();
  c.moveTo(fx * 2.6 - px * 0.85, fy * 2.6 - py * 0.85);
  c.lineTo(fx * (gunLen * 0.74) - px * 0.85, fy * (gunLen * 0.74) - py * 0.85);
  c.stroke();
  c.fillStyle = '#c8a858';
  c.beginPath();
  c.moveTo(fx * 3.1 - px * 0.55, fy * 3.1 - py * 0.55);
  c.lineTo(fx * 3.9 - px * 0.55, fy * 3.9 - py * 0.55);
  c.lineTo(fx * 3.9 + px * 0.55, fy * 3.9 + py * 0.55);
  c.lineTo(fx * 3.1 + px * 0.55, fy * 3.1 + py * 0.55);
  c.closePath(); c.fill();
  c.strokeStyle = '#8a7a48';
  c.lineWidth = 0.55;
  c.stroke();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 0.95;
  c.beginPath();
  c.arc(fx * 3.4 + px * 1.75, fy * 3.4 + py * 1.75, 1.15, face - 0.65, face + 0.55);
  c.stroke();
  c.strokeStyle = '#4a4038';
  c.lineWidth = 1.15;
  c.beginPath();
  c.moveTo(tipX - px * 1.6, tipY - py * 1.6);
  c.lineTo(tipX + px * 0.45, tipY + py * 0.45);
  c.stroke();
  c.fillStyle = '#1c1c16';
  c.beginPath(); c.arc(tipX, tipY, 0.95, 0, 7); c.fill();
}

function drawKar98k(c, fx, fy, gunLen, face, stickGrenade) {
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const px = -fy, py = fx;
  c.strokeStyle = '#26261e';
  c.lineWidth = 2.25;
  c.beginPath();
  c.moveTo(fx * 2, fy * 2);
  c.lineTo(tipX, tipY);
  c.stroke();
  c.strokeStyle = '#4a3f2e';
  c.lineWidth = 2.35;
  c.beginPath();
  c.moveTo(fx * 1.15 - px * 2.5, fy * 1.15 + py * 2.5);
  c.lineTo(fx * 1.15 + px * 2, fy * 1.15 - py * 2);
  c.stroke();
  c.fillStyle = '#3a3a30';
  c.beginPath();
  c.moveTo(fx * (gunLen - 1.4) - px * 0.85, fy * (gunLen - 1.4) + py * 0.85);
  c.lineTo(fx * (gunLen + 0.55) - px * 0.55, fy * (gunLen + 0.55) + py * 0.55);
  c.lineTo(fx * (gunLen + 0.55) + px * 0.55, fy * (gunLen + 0.55) - py * 0.55);
  c.lineTo(fx * (gunLen - 1.4) + px * 0.85, fy * (gunLen - 1.4) - py * 0.85);
  c.closePath(); c.fill();
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 1.55;
  c.beginPath();
  c.moveTo(fx * 2.2 + px * 1.05, fy * 2.2 + py * 1.05);
  c.lineTo(fx * (gunLen * 0.82) + px * 1.05, fy * (gunLen * 0.82) + py * 1.05);
  c.stroke();
  c.fillStyle = '#2a2a22';
  c.beginPath();
  c.arc(fx * 3.8 + px * 1.4, fy * 3.8 + py * 1.4, 0.85, 0, 7);
  c.fill();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 0.95;
  c.beginPath();
  c.arc(fx * 3.3 + px * 1.65, fy * 3.3 + py * 1.65, 1.05, face - 0.6, face + 0.5);
  c.stroke();
  c.strokeStyle = '#4a4038';
  c.lineWidth = 1.25;
  c.beginPath();
  c.moveTo(tipX - px * 1.35, tipY - py * 1.35);
  c.lineTo(tipX + px * 1.35, tipY + py * 1.35);
  c.stroke();
  c.fillStyle = '#1c1c16';
  c.beginPath(); c.arc(tipX, tipY, 0.9, 0, 7); c.fill();
  if (stickGrenade) {
    drawStickGrenade(c, fx * 1.8 + py * 3.5, fy * 1.8 - px * 3.5, 0.72, face + 0.55);
  }
}

// Kar98k with hooded sight and sling — standard Wehrmacht rifleman loadout
function drawKar98kRifleman(c, fx, fy, gunLen, face) {
  drawKar98k(c, fx, fy, gunLen, face, false);
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const px = -fy, py = fx;
  c.fillStyle = '#3a3830';
  c.beginPath(); c.arc(tipX + fx * 0.35, tipY + fy * 0.35, 1.05, 0, 7); c.fill();
  c.fillStyle = '#2a2820';
  c.beginPath();
  c.moveTo(tipX - px * 0.75, tipY - py * 0.75);
  c.lineTo(tipX + fx * 0.85 - px * 1.15, tipY + fy * 0.85 - py * 1.15);
  c.lineTo(tipX + fx * 0.85 + px * 0.45, tipY + fy * 0.85 + py * 0.45);
  c.closePath(); c.fill();
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(fx * 1.1 - px * 2.3, fy * 1.1 + py * 2.3);
  c.quadraticCurveTo(-px * 1.8, py * 1.8, fx * (gunLen * 0.62) + px * 1.1, fy * (gunLen * 0.62) + py * 1.1);
  c.stroke();
  c.strokeStyle = '#6a5a42';
  c.lineWidth = 0.55;
  c.beginPath(); c.arc(fx * 1.1 - px * 2.3, fy * 1.1 + py * 2.3, 0.55, 0, 7); c.stroke();
}

function drawStripperClip(c, x, y, scale, rot) {
  scale = scale || 1;
  rot = rot != null ? rot : 0;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = '#c8a858';
  c.fillRect(-0.5 * scale, -1.8 * scale, 1 * scale, 3.6 * scale);
  c.strokeStyle = '#8a7a48';
  c.lineWidth = 0.4 * scale;
  c.strokeRect(-0.5 * scale, -1.8 * scale, 1 * scale, 3.6 * scale);
  for (let i = -1; i <= 1; i++) {
    c.fillStyle = '#a08838';
    c.fillRect(-0.35 * scale, i * 0.85 * scale - 0.3 * scale, 0.7 * scale, 0.45 * scale);
  }
  c.restore();
}

function drawErifleKit(c, fx, fy, face) {
  c.strokeStyle = '#3c3c33';
  c.lineWidth = 1.3;
  c.beginPath(); c.moveTo(-3, -3.2); c.lineTo(0, 2); c.lineTo(3, -3.2); c.stroke();
  c.strokeStyle = '#6a5a42';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(-fy * 4.4 - fx * 1, fx * 4.4 - fy * 1);
  c.lineTo(fy * 4.4 - fx * 1, -fx * 4.4 - fy * 1);
  c.stroke();
  c.strokeStyle = '#4a4038';
  c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(-6, 4); c.lineTo(6, 4); c.stroke();
  c.fillStyle = '#6a5a42';
  c.fillRect(-0.7, 3.4, 1.4, 1.2);
  for (const off of [-4.2, 4.2]) {
    c.fillStyle = '#3a3428';
    c.fillRect(off - 1.5, 3.5, 3, 2.8);
    c.strokeStyle = '#2a2820';
    c.lineWidth = 0.7;
    c.strokeRect(off - 1.5, 3.5, 3, 2.8);
    c.fillStyle = '#4a4038';
    c.beginPath(); c.arc(off, 4.2, 0.55, 0, 7); c.fill();
    drawStripperClip(c, off, 4.5, 0.55, 0);
  }
  c.fillStyle = '#5a5a48';
  c.beginPath(); c.ellipse(fy * 5.2, -fx * 5.2, 2.2, 2.8, face, 0, 7); c.fill();
  c.strokeStyle = '#3a3a30';
  c.lineWidth = 0.75;
  c.stroke();
  c.strokeStyle = '#4a4038';
  c.lineWidth = 0.9;
  c.beginPath();
  c.moveTo(fy * 5.2 - 1, -fx * 5.2 - 1.8);
  c.lineTo(fy * 5.2 + 1, -fx * 5.2 + 1.8);
  c.stroke();
  c.fillStyle = '#4a4a40';
  c.beginPath(); c.ellipse(-fy * 5.4, fx * 5.4, 1.5, 2.2, face, 0, 7); c.fill();
  c.fillStyle = '#6a5a42';
  c.beginPath(); c.ellipse(-fy * 5.4, fx * 5.4 - 1.8, 1.1, 0.7, face, 0, 7); c.fill();
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(-fy * 5.4, fx * 5.4 - 2.5);
  c.lineTo(-fy * 4.2, fx * 4.2 - 1);
  c.stroke();
  c.fillStyle = '#3a3a32';
  c.beginPath(); c.ellipse(-fy * 4.8, fx * 4.8, 2, 2.6, face + 0.3, 0, 7); c.fill();
  c.strokeStyle = '#2a2a24';
  c.lineWidth = 0.85;
  c.stroke();
  c.fillStyle = '#4a4a40';
  c.beginPath(); c.ellipse(-fy * 4.8, fx * 4.8 - 2, 1.3, 0.8, face + 0.3, 0, 7); c.fill();
  c.strokeStyle = '#4a4038';
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(fy * 2.5, -fx * 2.5);
  c.lineTo(fy * 4.8, -fx * 4.8 + 1.5);
  c.stroke();
  c.fillStyle = '#3a3428';
  c.beginPath(); c.ellipse(fy * 5.5, -fx * 5.5 + 1.2, 0.7, 1.2, face + 0.5, 0, 7); c.fill();
}

// Kar98k with Schiessbecher rifle-grenade discharger — the Axis grenadier's signature
function drawKar98kGrenadier(c, fx, fy, gunLen, face) {
  drawKar98k(c, fx, fy, gunLen, face, false);
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const px = -fy, py = fx;
  c.strokeStyle = '#4a4840';
  c.lineWidth = 1.85;
  c.beginPath();
  c.moveTo(tipX - px * 1.7, tipY - py * 1.7);
  c.lineTo(tipX + fx * 2.6 - px * 2.1, tipY + fy * 2.6 - py * 2.1);
  c.lineTo(tipX + fx * 2.6 + px * 2.1, tipY + fy * 2.6 + py * 2.1);
  c.lineTo(tipX + px * 1.7, tipY + py * 1.7);
  c.closePath(); c.stroke();
  c.fillStyle = '#3a3830';
  c.beginPath();
  c.moveTo(tipX - px * 1.4, tipY - py * 1.4);
  c.lineTo(tipX + fx * 2.1 - px * 1.7, tipY + fy * 2.1 - py * 1.7);
  c.lineTo(tipX + fx * 2.1 + px * 1.7, tipY + fy * 2.1 + py * 1.7);
  c.lineTo(tipX + px * 1.4, tipY + py * 1.4);
  c.closePath(); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  for (let i = -1; i <= 1; i++) {
    const vx = tipX + fx * 1.3 + px * i * 0.85;
    const vy = tipY + fy * 1.3 + py * i * 0.85;
    c.beginPath();
    c.moveTo(vx - px * 0.45, vy - py * 0.45);
    c.lineTo(vx + px * 0.45, vy + py * 0.45);
    c.stroke();
  }
  c.fillStyle = '#2a2a22';
  c.beginPath();
  c.arc(tipX + fx * 1.8, tipY + fy * 1.8, 1.1, 0, 7);
  c.fill();
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 0.8;
  c.beginPath();
  c.arc(tipX + fx * 1.8, tipY + fy * 1.8, 1.1, 0, 7);
  c.stroke();
}

function drawEgrenKit(c, fx, fy, face) {
  c.strokeStyle = '#4a4438';
  c.lineWidth = 1.35;
  c.beginPath(); c.moveTo(-3.2, -3.5); c.lineTo(0, 2.2); c.lineTo(3.2, -3.5); c.stroke();
  c.strokeStyle = '#7a6848';
  c.lineWidth = 1.55;
  c.beginPath();
  c.moveTo(-fy * 5.5 - fx * 1.8, fx * 5.5 - fy * 1.8);
  c.lineTo(fy * 5.5 - fx * 1.8, -fx * 5.5 - fy * 1.8);
  c.stroke();
  c.fillStyle = '#4a4a3c';
  c.beginPath(); c.ellipse(fy * 5.2, -fx * 5.2, 2.8, 3.6, face, 0, 7); c.fill();
  c.strokeStyle = '#3a3a30';
  c.lineWidth = 0.85;
  c.stroke();
  drawStickGrenade(c, fy * 5.2 - 0.8, -fx * 5.2 - 1.5, 0.62, face - 0.2);
  drawStickGrenade(c, fy * 5.2 + 1.2, -fx * 5.2 + 0.5, 0.58, face + 0.35);
  drawStickGrenade(c, -6.2, 2.2, 0.88, face - 0.4);
  drawStickGrenade(c, -4, 5.2, 0.8, face + 0.1);
  drawStickGrenade(c, -0.8, 5.8, 0.76, face + 0.45);
  drawStickGrenade(c, 3.5, 4.8, 0.72, face + 0.75);
  c.strokeStyle = '#3c3830';
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(-6, 4.2); c.lineTo(6, 4.2); c.stroke();
  c.fillStyle = '#6a5a42';
  c.fillRect(-0.8, 3.5, 1.6, 1.4);
  c.fillStyle = '#3a3428';
  c.beginPath(); c.ellipse(-fy * 4.5, fx * 4.5, 1.6, 2.4, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.7;
  c.stroke();
  c.fillStyle = '#4a4a40';
  c.fillRect(-5.5, 3.8, 2.4, 2.2);
  c.fillRect(4.2, 3.8, 2.4, 2.2);
  c.strokeStyle = '#2a2e24';
  c.lineWidth = 0.65;
  c.strokeRect(-5.5, 3.8, 2.4, 2.2);
  c.strokeRect(4.2, 3.8, 2.4, 2.2);
}

function drawMP40Mag(c, x, y, scale, rot) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(scale, scale);
  c.fillStyle = '#3a3830';
  c.fillRect(-1.1, -2.4, 2.2, 4.8);
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  c.strokeRect(-1.1, -2.4, 2.2, 4.8);
  c.strokeStyle = '#4a4840';
  c.lineWidth = 0.45;
  for (const sy of [-1.4, -0.4, 0.6]) {
    c.beginPath(); c.moveTo(-0.85, sy); c.lineTo(0.85, sy); c.stroke();
  }
  c.fillStyle = '#2a2820';
  c.fillRect(-0.55, 2.2, 1.1, 0.55);
  c.restore();
}

// MP40 — perforated shroud, side mag, wire folding stock
function drawMP40(c, fx, fy, gunLen, face) {
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const px = -fy, py = fx;
  c.strokeStyle = '#26261e';
  c.lineWidth = 2.35;
  c.beginPath();
  c.moveTo(fx * 2, fy * 2);
  c.lineTo(tipX, tipY);
  c.stroke();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 0.75;
  for (let t = 0.22; t <= 0.88; t += 0.11) {
    const sx = fx * (gunLen * t), sy = fy * (gunLen * t);
    c.beginPath();
    c.moveTo(sx - px * 1.45, sy - py * 1.45);
    c.lineTo(sx + px * 1.45, sy + py * 1.45);
    c.stroke();
  }
  c.strokeStyle = '#4a4038';
  c.lineWidth = 1.85;
  c.beginPath();
  c.moveTo(fx * 2.2 + px * 1.35, fy * 2.2 + py * 1.35);
  c.lineTo(fx * (gunLen * 0.72) + px * 1.35, fy * (gunLen * 0.72) + py * 1.35);
  c.stroke();
  c.fillStyle = '#3a3830';
  c.beginPath();
  c.moveTo(fx * 2.8 - px * 1.55, fy * 2.8 - py * 1.55);
  c.lineTo(fx * 2.8 - px * 3.35, fy * 2.8 - py * 3.35);
  c.lineTo(fx * 3.6 - px * 3.35, fy * 3.6 - py * 3.35);
  c.lineTo(fx * 3.6 - px * 1.55, fy * 3.6 - py * 1.55);
  c.closePath(); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  c.stroke();
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 1.55;
  c.beginPath();
  c.moveTo(fx * 2.1 + px * 1.85, fy * 2.1 + py * 1.85);
  c.lineTo(fx * 2.1 + px * 4.2, fy * 2.1 + py * 4.2);
  c.stroke();
  c.strokeStyle = '#4a4038';
  c.lineWidth = 1.15;
  c.beginPath();
  c.moveTo(fx * 2.1 + px * 4.2, fy * 2.1 + py * 4.2);
  c.lineTo(fx * 0.4 + px * 4.2, fy * 0.4 + py * 4.2);
  c.stroke();
  c.beginPath();
  c.moveTo(fx * 0.4 + px * 4.2, fy * 0.4 + py * 4.2);
  c.lineTo(fx * 0.4 + px * 2.4, fy * 0.4 + py * 2.4);
  c.stroke();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 0.95;
  c.beginPath();
  c.arc(fx * 2.5 + px * 2.15, fy * 2.5 + py * 2.15, 1.05, face - 0.55, face + 0.45);
  c.stroke();
  c.fillStyle = '#1c1c16';
  c.beginPath(); c.arc(tipX, tipY, 0.85, 0, 7); c.fill();
}

function drawEsmgKit(c, fx, fy, face) {
  c.strokeStyle = '#3c3c33';
  c.lineWidth = 1.35;
  c.beginPath(); c.moveTo(-3.2, -3.5); c.lineTo(0, 2.2); c.lineTo(3.2, -3.5); c.stroke();
  c.strokeStyle = '#6a5a42';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(-fy * 4.8 - fx * 1.2, fx * 4.8 - fy * 1.2);
  c.lineTo(fy * 4.8 - fx * 1.2, -fx * 4.8 - fy * 1.2);
  c.stroke();
  c.fillStyle = '#4a4a3c';
  c.beginPath(); c.ellipse(fy * 4.5, -fx * 4.5, 2.6, 3.2, face, 0, 7); c.fill();
  c.strokeStyle = '#3a3a30';
  c.lineWidth = 0.8;
  c.stroke();
  drawMP40Mag(c, fy * 4.2, -fx * 4.2 - 1.2, 0.58, face - 0.15);
  drawMP40Mag(c, fy * 4.2 + 1.4, -fx * 4.2 + 0.6, 0.54, face + 0.25);
  for (const off of [-4.5, 4.5]) {
    c.fillStyle = '#3a3428';
    c.fillRect(off - 1.4, 3.6, 2.8, 2.6);
    c.strokeStyle = '#2a2820';
    c.lineWidth = 0.65;
    c.strokeRect(off - 1.4, 3.6, 2.8, 2.6);
    drawMP40Mag(c, off, 4.4, 0.52, 0);
  }
  drawStickGrenade(c, -fy * 5.2, fx * 5.2, 0.72, face + 0.55);
  drawStickGrenade(c, fy * 3.2, -fx * 3.2 + 1.5, 0.65, face - 0.35);
  c.strokeStyle = '#3c3830';
  c.lineWidth = 1.45;
  c.beginPath(); c.moveTo(-6, 4.2); c.lineTo(6, 4.2); c.stroke();
  c.fillStyle = '#6a5a42';
  c.fillRect(-0.8, 3.5, 1.6, 1.4);
  c.fillStyle = '#3a3428';
  c.beginPath(); c.ellipse(-fy * 4.8, fx * 4.8, 1.5, 2.2, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.7;
  c.stroke();
  c.fillStyle = '#4a4a40';
  c.fillRect(-5.8, 3.8, 2.2, 2);
  c.strokeStyle = '#2a2e24';
  c.lineWidth = 0.6;
  c.strokeRect(-5.8, 3.8, 2.2, 2);
}

// M1A1 bazooka — shoulder-mounted tube with grips, wire sight, and flare ring
function drawBazooka(c, fx, fy, face) {
  const px = -fy, py = fx;
  const shoulderX = fx * 2.5 + px * 2.2;
  const shoulderY = fy * 2.5 + py * 2.2;
  const tubeLen = 14;
  const tipX = shoulderX + fx * tubeLen;
  const tipY = shoulderY + fy * tubeLen;

  c.strokeStyle = '#4a4038';
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(shoulderX - fx * 2.8, shoulderY - fy * 2.8);
  c.lineTo(shoulderX - fx * 5.5 - px * 1.2, shoulderY - fy * 5.5 - py * 1.2);
  c.stroke();
  c.fillStyle = '#3a3830';
  c.beginPath();
  c.ellipse(shoulderX - fx * 4 + px * 0.5, shoulderY - fy * 4 + py * 0.5, 1.8, 2.2, face, 0, 7);
  c.fill();

  c.strokeStyle = '#4a5240';
  c.lineWidth = 5.2;
  c.beginPath();
  c.moveTo(shoulderX, shoulderY);
  c.lineTo(tipX, tipY);
  c.stroke();
  c.strokeStyle = '#3a4034';
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(shoulderX + fx * 1.5, shoulderY + fy * 1.5);
  c.lineTo(tipX - fx * 0.8, tipY - fy * 0.8);
  c.stroke();

  const grip1X = shoulderX + fx * 10;
  const grip1Y = shoulderY + fy * 10;
  c.strokeStyle = '#3a4034';
  c.lineWidth = 2.1;
  c.beginPath();
  c.moveTo(grip1X + px * 2.8, grip1Y + py * 2.8);
  c.lineTo(grip1X + px * 4.5, grip1Y + py * 4.5);
  c.stroke();
  const grip2X = shoulderX + fx * 5.5;
  const grip2Y = shoulderY + fy * 5.5;
  c.beginPath();
  c.moveTo(grip2X + px * 2.2, grip2Y + py * 2.2);
  c.lineTo(grip2X + px * 4, grip2Y + py * 4);
  c.stroke();

  c.strokeStyle = '#5a5c48';
  c.lineWidth = 1.3;
  const sightX = shoulderX + fx * 8;
  const sightY = shoulderY + fy * 8;
  c.beginPath();
  c.moveTo(sightX - px * 0.5, sightY - py * 0.5);
  c.lineTo(sightX - px * 0.5 - fx * 1.8, sightY - py * 0.5 - fy * 1.8);
  c.stroke();
  c.beginPath();
  c.moveTo(sightX + px * 0.8, sightY + py * 0.8);
  c.lineTo(sightX + px * 0.8 - fx * 1.2, sightY + py * 0.8 - fy * 1.2);
  c.stroke();
  c.beginPath();
  c.moveTo(sightX - px * 0.5 - fx * 1.8, sightY - py * 0.5 - fy * 1.8);
  c.lineTo(sightX + px * 0.8 - fx * 1.2, sightY + py * 0.8 - fy * 1.2);
  c.stroke();

  c.strokeStyle = '#5a5c48';
  c.lineWidth = 2.6;
  c.beginPath();
  c.moveTo(tipX - px * 2.2, tipY - py * 2.2);
  c.lineTo(tipX + fx * 0.5, tipY + fy * 0.5);
  c.lineTo(tipX + px * 2.2, tipY + py * 2.2);
  c.stroke();
  c.fillStyle = '#1c1c16';
  c.beginPath(); c.arc(tipX, tipY, 1.4, 0, 7); c.fill();
}

// Panzerfaust 60 — short tube, oversized warhead, flip-up sight
function drawPanzerfaust(c, fx, fy, face) {
  const px = -fy, py = fx;
  const shoulderX = fx * 2.5 + px * 2.2;
  const shoulderY = fy * 2.5 + py * 2.2;
  const tubeLen = 10;
  const tipX = shoulderX + fx * tubeLen;
  const tipY = shoulderY + fy * tubeLen;

  c.strokeStyle = '#5a4a38';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(shoulderX - fx * 2, shoulderY - fy * 2);
  c.lineTo(shoulderX - fx * 4.2 - px * 0.8, shoulderY - fy * 4.2 - py * 0.8);
  c.stroke();

  c.strokeStyle = '#4a4c42';
  c.lineWidth = 3.6;
  c.beginPath();
  c.moveTo(shoulderX, shoulderY);
  c.lineTo(tipX, tipY);
  c.stroke();
  c.strokeStyle = '#3a3c34';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(shoulderX + fx * 1, shoulderY + fy * 1);
  c.lineTo(tipX - fx * 0.5, tipY - fy * 0.5);
  c.stroke();

  const headX = tipX + fx * 2.2;
  const headY = tipY + fy * 2.2;
  c.fillStyle = '#4a4a42';
  c.beginPath();
  c.ellipse(headX, headY, 2.8, 4.2, face, 0, 7);
  c.fill();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 0.9;
  c.stroke();
  c.fillStyle = '#3a3830';
  c.beginPath();
  c.ellipse(headX + fx * 2.5, headY + fy * 2.5, 1.6, 2.4, face, 0, 7);
  c.fill();

  c.strokeStyle = '#5a5c48';
  c.lineWidth = 1.1;
  const sightX = shoulderX + fx * 5.5;
  const sightY = shoulderY + fy * 5.5;
  c.beginPath();
  c.moveTo(sightX - px * 0.4, sightY - py * 0.4);
  c.lineTo(sightX - px * 0.4 - fx * 1.4, sightY - py * 0.4 - fy * 1.4);
  c.stroke();
  c.beginPath();
  c.moveTo(sightX + px * 0.6, sightY + py * 0.6);
  c.lineTo(sightX + px * 0.6 - fx * 1, sightY + py * 0.6 - fy * 1);
  c.stroke();

  const gripX = shoulderX + fx * 4.5;
  const gripY = shoulderY + fy * 4.5;
  c.strokeStyle = '#3a3830';
  c.lineWidth = 1.85;
  c.beginPath();
  c.moveTo(gripX + px * 2, gripY + py * 2);
  c.lineTo(gripX + px * 3.6, gripY + py * 3.6);
  c.stroke();
}

function drawSpareRocketTube(c, x1, y1, x2, y2) {
  c.strokeStyle = '#5a5c42';
  c.lineWidth = 2.6;
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  c.fillStyle = '#1c1c16';
  c.beginPath(); c.arc(x2, y2, 1.4, 0, 7); c.fill();
}

function drawBazookaKit(c, fx, fy, face) {
  c.strokeStyle = '#8a7a48';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(-fy * 5.2 - fx * 1.2, fx * 5.2 - fy * 1.2);
  c.lineTo(fy * 5.2 - fx * 1.2, -fx * 5.2 - fy * 1.2);
  c.stroke();
  drawSpareRocketTube(c, -8, -4, 8, -6.5);
  c.strokeStyle = '#4a4a40';
  c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(-4, -5); c.lineTo(4, -5.8); c.stroke();
  c.fillStyle = '#3a4034';
  c.beginPath(); c.ellipse(-fy * 5, fx * 5, 2.4, 3, face, 0, 7); c.fill();
  c.strokeStyle = '#4a4a3e';
  c.lineWidth = 0.75;
  c.stroke();
  c.fillStyle = '#3a3428';
  c.beginPath(); c.ellipse(fy * 4.2, -fx * 4.2, 1.5, 2.2, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  c.stroke();
  c.fillStyle = '#2a2820';
  c.fillRect(-fy * 3.8 - 0.5, fx * 3.8 - 1.2, 1, 2.4);
}

function drawEbazookaKit(c, fx, fy, face) {
  c.fillStyle = '#46443c';
  c.beginPath(); c.ellipse(fx * 1.2, fy * 1.2, 6.4, 5.4, face, 0, 7); c.fill();
  c.strokeStyle = '#2e2c28';
  c.lineWidth = 0.9;
  c.stroke();
  c.fillStyle = '#4a4a42';
  c.beginPath(); c.ellipse(fx * 2.5, fy * 2.5, 1.8, 1.2, face, 0, 7); c.fill();
  c.beginPath(); c.ellipse(-fx * 2.5, fy * 2.5, 1.8, 1.2, face, 0, 7); c.fill();
  c.strokeStyle = '#6a5a42';
  c.lineWidth = 1.35;
  c.beginPath();
  c.moveTo(-fy * 5.5 - fx * 1.5, fx * 5.5 - fy * 1.5);
  c.lineTo(fy * 4.5 - fx * 1.5, -fx * 4.5 - fy * 1.5);
  c.stroke();
  c.beginPath();
  c.moveTo(-fy * 4.5 + fx * 1.5, fx * 4.5 + fy * 1.5);
  c.lineTo(fy * 5.5 + fx * 1.5, -fx * 5.5 + fy * 1.5);
  c.stroke();
  drawSpareRocketTube(c, -7.5, -3.5, 7, -7);
  drawSpareRocketTube(c, -6.5, 3.5, 6.5, 7);
  c.fillStyle = '#4a4a42';
  c.beginPath(); c.arc(7, -7, 1.8, 0, 7); c.fill();
  c.beginPath(); c.arc(6.5, 7, 1.6, 0, 7); c.fill();
  drawStickGrenade(c, fy * 4.2, -fx * 4.2, 0.68, face + 0.35);
  c.strokeStyle = '#3c3830';
  c.lineWidth = 1.45;
  c.beginPath(); c.moveTo(-6, 4.2); c.lineTo(6, 4.2); c.stroke();
  c.fillStyle = '#6a5a42';
  c.fillRect(-0.8, 3.5, 1.6, 1.4);
  c.fillStyle = '#3a3428';
  c.beginPath(); c.ellipse(-fy * 4.8, fx * 4.8, 1.5, 2.2, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.7;
  c.stroke();
}

// Flammenwerfer 41 lance — rifle stock, thin lance tube, igniter box, funnel nozzle
function drawFlammenwerfer(c, fx, fy, gunLen, face, lit) {
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const px = -fy, py = fx;
  c.strokeStyle = '#4a4030';
  c.lineWidth = 2.15;
  c.beginPath();
  c.moveTo(fx * 1.1 - px * 2.5, fy * 1.1 - py * 2.5);
  c.lineTo(fx * 2.6 - px * 2.2, fy * 2.6 - py * 2.2);
  c.stroke();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 2.65;
  c.beginPath();
  c.moveTo(fx * 2.4, fy * 2.4);
  c.lineTo(tipX, tipY);
  c.stroke();
  c.strokeStyle = '#2e2c24';
  c.lineWidth = 0.8;
  for (let t = 0.32; t <= 0.82; t += 0.14) {
    const sx = fx * (gunLen * t), sy = fy * (gunLen * t);
    c.beginPath();
    c.moveTo(sx - px * 1.05, sy - py * 1.05);
    c.lineTo(sx + px * 1.05, sy + py * 1.05);
    c.stroke();
  }
  const ignX = fx * (gunLen * 0.58), ignY = fy * (gunLen * 0.58);
  c.fillStyle = '#3a3830';
  c.beginPath();
  c.moveTo(ignX - px * 1.5 - fx * 0.8, ignY - py * 1.5 - fy * 0.8);
  c.lineTo(ignX + px * 1.5 - fx * 0.8, ignY + py * 1.5 - fy * 0.8);
  c.lineTo(ignX + px * 1.5 + fx * 0.8, ignY + py * 1.5 + fy * 0.8);
  c.lineTo(ignX - px * 1.5 + fx * 0.8, ignY - py * 1.5 + fy * 0.8);
  c.closePath(); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  c.stroke();
  c.strokeStyle = '#4a3f32';
  c.lineWidth = 1.85;
  c.beginPath();
  c.moveTo(fx * 3 + px * 1.35, fy * 3 + py * 1.35);
  c.lineTo(fx * 3 + px * 3.2, fy * 3 + py * 3.2);
  c.stroke();
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 2.35;
  c.beginPath();
  c.moveTo(tipX - px * 2.1, tipY - py * 2.1);
  c.lineTo(tipX + fx * 1.6, tipY + fy * 1.6);
  c.lineTo(tipX + px * 2.1, tipY + py * 2.1);
  c.stroke();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 1.85;
  c.beginPath();
  c.moveTo(-6, 0);
  c.quadraticCurveTo(-fy * 3.5 + fx * 0.8, fx * 3.5 + fy * 0.8, fx * 2.8, fy * 2.8);
  c.stroke();
  c.strokeStyle = '#1e1c18';
  c.lineWidth = 0.85;
  c.beginPath();
  c.moveTo(-6, 0);
  c.quadraticCurveTo(-fy * 3.5 + fx * 0.8, fx * 3.5 + fy * 0.8, fx * 2.8, fy * 2.8);
  c.stroke();
  const nozX = tipX + fx * 1.3, nozY = tipY + fy * 1.3;
  if (lit) {
    c.shadowColor = '#ff6820';
    c.shadowBlur = 10;
    c.fillStyle = '#fff4b0';
    c.beginPath(); c.arc(nozX, nozY, 2.8, 0, 7); c.fill();
    c.shadowBlur = 0;
    c.fillStyle = '#ff9a28';
    c.beginPath(); c.arc(nozX, nozY, 1.6, 0, 7); c.fill();
  } else {
    c.fillStyle = '#8a4020';
    c.beginPath(); c.arc(nozX, nozY, 1.35, 0, 7); c.fill();
    c.fillStyle = '#ff7020';
    c.beginPath(); c.arc(nozX, nozY, 0.65, 0, 7); c.fill();
  }
}

function drawEflameKit(c, fx, fy, face) {
  const tankX = -6.4;
  for (const ty of [-2.6, 2.6]) {
    c.fillStyle = '#6a6a58';
    c.beginPath(); c.ellipse(tankX, ty, 4.1, 2.15, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.42)';
    c.lineWidth = 0.85;
    c.stroke();
    c.fillStyle = '#5a5a4e';
    c.beginPath(); c.ellipse(tankX - 3.6, ty, 0.75, 1.1, 0, 0, 7); c.fill();
    c.strokeStyle = '#b8261c';
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(tankX - 1.8, ty - 0.35);
    c.lineTo(tankX + 0.4, ty - 0.35);
    c.lineTo(tankX + 0.4, ty + 0.35);
    c.lineTo(tankX - 1.8, ty + 0.35);
    c.stroke();
  }
  c.fillStyle = '#4a4a42';
  c.beginPath(); c.ellipse(tankX + 0.8, 0, 1.8, 1.35, 0, 0, 7); c.fill();
  c.strokeStyle = '#3a3a34';
  c.lineWidth = 0.75;
  c.stroke();
  c.strokeStyle = '#3c3830';
  c.lineWidth = 1.45;
  c.beginPath(); c.moveTo(tankX - 2.5, -5.2); c.lineTo(tankX + 2.5, 5.2); c.stroke();
  c.beginPath(); c.moveTo(tankX + 2.5, -5.2); c.lineTo(tankX - 2.5, 5.2); c.stroke();
  c.strokeStyle = '#4a4038';
  c.lineWidth = 1.15;
  c.beginPath();
  c.moveTo(tankX - 1.5, -4.5);
  c.quadraticCurveTo(-2, fy * 2.5, fx * 2.8, fy * 2.8);
  c.stroke();
  c.fillStyle = '#3a3830';
  c.beginPath(); c.ellipse(fy * 3.8, -fx * 3.8, 1.5, 2.1, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  c.stroke();
  c.fillStyle = '#4a4840';
  c.fillRect(fy * 3.4 - 0.9, -fx * 3.4 - 0.7, 1.8, 1.4);
  c.strokeStyle = '#6a5a42';
  c.lineWidth = 0.55;
  c.beginPath(); c.moveTo(fy * 3.4, -fx * 3.4); c.lineTo(fy * 4.2, -fx * 4.2 + 0.8); c.stroke();
  c.fillStyle = '#3a3428';
  c.beginPath(); c.ellipse(-fy * 4.6, fx * 4.6, 1.4, 2, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  c.stroke();
  c.fillStyle = '#5a5a50';
  c.beginPath(); c.ellipse(fx * 4.2, fy * 4.2, 1.6, 2.2, face, 0, 7); c.fill();
  c.beginPath(); c.ellipse(-fx * 3.8, fy * 3.8, 1.5, 2.1, face, 0, 7); c.fill();
  c.strokeStyle = '#4a4840';
  c.lineWidth = 0.6;
  c.beginPath();
  c.arc(fy * 5.2, -fx * 5.2, 1.1, face - 0.4, face + 0.9);
  c.stroke();
}

function drawMG42BeltLink(c, x, y, scale, rot) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(scale, scale);
  c.fillStyle = '#6a5a38';
  for (let i = 0; i < 3; i++) {
    const lx = i * 1.5 - 1.5;
    c.beginPath();
    c.moveTo(lx - 0.45, -0.35);
    c.lineTo(lx + 0.45, -0.35);
    c.lineTo(lx + 0.55, 0.35);
    c.lineTo(lx - 0.35, 0.35);
    c.closePath(); c.fill();
    c.strokeStyle = '#4a4030';
    c.lineWidth = 0.45;
    c.stroke();
    c.fillStyle = '#c8a858';
    c.beginPath(); c.arc(lx, 0, 0.22, 0, 7); c.fill();
    c.fillStyle = '#6a5a38';
  }
  c.restore();
}

// MG42 — ventilated barrel jacket, belt feed, Lafette bipod, booster muzzle
function drawMG42(c, fx, fy, gunLen, face) {
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const px = -fy, py = fx;
  c.strokeStyle = '#26261e';
  c.lineWidth = 3.15;
  c.beginPath();
  c.moveTo(fx * 2, fy * 2);
  c.lineTo(tipX, tipY);
  c.stroke();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 0.72;
  for (let t = 0.18; t <= 0.88; t += 0.07) {
    const sx = fx * (gunLen * t), sy = fy * (gunLen * t);
    c.beginPath();
    c.moveTo(sx - px * 1.55, sy - py * 1.55);
    c.lineTo(sx + px * 1.55, sy + py * 1.55);
    c.stroke();
  }
  c.strokeStyle = '#4a4030';
  c.lineWidth = 1.95;
  c.beginPath();
  c.moveTo(fx * 1.15 - px * 2.4, fy * 1.15 - py * 2.4);
  c.lineTo(fx * 2.4 - px * 2.2, fy * 2.4 - py * 2.2);
  c.stroke();
  c.strokeStyle = '#4a3f32';
  c.lineWidth = 1.85;
  c.beginPath();
  c.moveTo(fx * 3.1 + px * 1.45, fy * 3.1 + py * 1.45);
  c.lineTo(fx * 3.1 + px * 3.8, fy * 3.1 + py * 3.8);
  c.stroke();
  c.strokeStyle = '#6b5a38';
  c.lineWidth = 1.25;
  c.beginPath();
  c.moveTo(-fy * 7.2, fx * 7.2);
  c.quadraticCurveTo(fx * 2 - fy * 3.2, fy * 2 + fx * 3.2, fx * 3.1, fy * 3.1);
  c.stroke();
  c.fillStyle = '#3a3828';
  c.beginPath(); c.arc(-fy * 6.2, fx * 6.2, 2.15, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  c.stroke();
  drawMG42BeltLink(c, -fy * 5.8, fx * 5.8, 0.55, face + 0.4);
  c.strokeStyle = '#26261e';
  c.lineWidth = 1.25;
  for (const ang of [-0.85, 0, 0.85]) {
    c.beginPath();
    c.moveTo(tipX, tipY);
    c.lineTo(
      tipX + Math.cos(face + ang + 0.38) * 5.2,
      tipY + Math.sin(face + ang + 0.38) * 5.2,
    );
    c.stroke();
  }
  c.strokeStyle = '#4a4038';
  c.lineWidth = 2.15;
  c.beginPath();
  c.moveTo(tipX - px * 1.75, tipY - py * 1.75);
  c.lineTo(tipX + px * 0.55, tipY + py * 0.55);
  c.stroke();
  c.fillStyle = '#1c1c16';
  c.beginPath(); c.arc(tipX, tipY, 1.05, 0, 7); c.fill();
}

function drawEmgKit(c, fx, fy, face) {
  c.strokeStyle = '#3c3c33';
  c.lineWidth = 1.35;
  c.beginPath(); c.moveTo(-3.2, -3.5); c.lineTo(0, 2.2); c.lineTo(3.2, -3.5); c.stroke();
  c.fillStyle = '#4a4a3c';
  c.beginPath(); c.ellipse(-fy * 5.4, fx * 5.4, 3.1, 3.8, face, 0, 7); c.fill();
  c.strokeStyle = '#3a3a30';
  c.lineWidth = 0.85;
  c.stroke();
  c.strokeStyle = '#5a5a48';
  c.lineWidth = 0.75;
  c.beginPath();
  c.moveTo(-fy * 5.4 - 1.2, fx * 5.4 - 1.5);
  c.lineTo(-fy * 5.4 + 1.2, fx * 5.4 + 1.5);
  c.stroke();
  c.fillStyle = '#6a5a42';
  c.fillRect(-fy * 5.4 - 0.6, fx * 5.4 - 2.2, 1.2, 1.4);
  c.strokeStyle = '#6a5a42';
  c.lineWidth = 1.45;
  c.beginPath();
  c.moveTo(-fy * 5 - fx * 1.4, fx * 5 - fy * 1.4);
  c.lineTo(fy * 4.8 - fx * 1.4, -fx * 4.8 - fy * 1.4);
  c.stroke();
  drawMG42BeltLink(c, -fy * 4.2, fx * 4.2, 0.62, face - 0.2);
  drawMG42BeltLink(c, fy * 3.5, -fx * 3.5, 0.58, face + 0.45);
  drawMG42BeltLink(c, -2.5, 4.8, 0.54, 0.15);
  c.strokeStyle = '#4a4840';
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(-fy * 4.5, fx * 4.5);
  c.lineTo(fy * 3.8, -fx * 3.8 + 1.5);
  c.stroke();
  c.fillStyle = '#3a3830';
  c.beginPath();
  c.moveTo(fy * 3.2, -fx * 3.2 + 1.2);
  c.lineTo(fy * 4.8, -fx * 4.8 + 0.5);
  c.lineTo(fy * 4.5, -fx * 4.5 + 2.2);
  c.closePath(); c.fill();
  c.fillStyle = '#3a3428';
  c.beginPath(); c.ellipse(-fy * 4.6, fx * 4.6, 1.5, 2.2, face, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.7;
  c.stroke();
  c.fillStyle = '#4a4a40';
  c.fillRect(4.2, 3.8, 2.4, 2.2);
  c.strokeStyle = '#2a2e24';
  c.lineWidth = 0.6;
  c.strokeRect(4.2, 3.8, 2.4, 2.2);
  c.fillStyle = '#3a3830';
  c.fillRect(-6, 3.8, 2.8, 2.4);
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  c.strokeRect(-6, 3.8, 2.8, 2.4);
}

function drawRiflemanKit(c, fx, fy, face, us) {
  c.strokeStyle = '#8a7a48';
  c.lineWidth = 1.45;
  c.beginPath();
  c.moveTo(-fy * 4.6 - fx * 1.1, fx * 4.6 - fy * 1.1);
  c.lineTo(fy * 4.6 - fx * 1.1, -fx * 4.6 - fy * 1.1);
  c.stroke();
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 1.85;
  c.beginPath(); c.moveTo(-5.5, 4.1); c.lineTo(5.5, 4.1); c.stroke();
  for (const off of [-4.2, -1.4, 1.4, 4.2]) {
    c.fillStyle = us ? '#3a4034' : '#4a4a40';
    c.fillRect(off - 1.35, 3.7, 2.7, 2.5);
    c.strokeStyle = '#2a2e24';
    c.lineWidth = 0.65;
    c.strokeRect(off - 1.35, 3.7, 2.7, 2.5);
    if (us) {
      c.fillStyle = '#c8a858';
      c.fillRect(off - 0.9, 4.1, 0.55, 1.2);
      c.fillRect(off + 0.35, 4.1, 0.55, 1.2);
    }
  }
  c.fillStyle = us ? '#4a5245' : '#5a5a50';
  c.beginPath(); c.ellipse(-fy * 5.6, fx * 5.6, 1.85, 2.35, face, 0, 7); c.fill();
  c.strokeStyle = '#3a4034';
  c.lineWidth = 0.75;
  c.stroke();
  c.fillStyle = us ? '#6a5a40' : '#4a4a40';
  c.beginPath(); c.arc(-fy * 5.6, fx * 5.6, 0.55, 0, 7); c.fill();
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 1.25;
  c.beginPath();
  c.moveTo(fy * 5.1, -fx * 5.1);
  c.lineTo(fy * 6.4, -fx * 6.4);
  c.stroke();
  c.fillStyle = '#5a4a38';
  c.beginPath(); c.arc(fy * 6.4, -fx * 6.4, 0.75, 0, 7); c.fill();
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 1.15;
  c.beginPath();
  c.moveTo(-fy * 3.2, fx * 3.2);
  c.quadraticCurveTo(0, 5.8, fy * 3.2, -fx * 3.2);
  c.stroke();
}

function drawScopedRifle(c, fx, fy, gunLen, face, us) {
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const perpX = -fy, perpY = fx;
  c.strokeStyle = '#26261e';
  c.lineWidth = 1.7;
  c.beginPath();
  c.moveTo(fx * 2, fy * 2);
  c.lineTo(tipX, tipY);
  c.stroke();
  c.strokeStyle = us ? '#4a3f2e' : '#5a4a38';
  c.lineWidth = 2.1;
  c.beginPath();
  c.moveTo(fx * 1.1 - fy * 2.5, fy * 1.1 + fx * 2.5);
  c.lineTo(fx * 1.1 + fy * 2.2, fy * 1.1 - fx * 2.2);
  c.stroke();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(fx * 4.2 + fy * 1.6, fy * 4.2 - fx * 1.6);
  c.lineTo(fx * 5.4 + fy * 2.6, fy * 5.4 - fx * 2.6);
  c.stroke();
  const scBaseX = fx * (gunLen * 0.44) + perpX * 2.1;
  const scBaseY = fy * (gunLen * 0.44) + perpY * 2.1;
  c.strokeStyle = '#1a1a14';
  c.lineWidth = 2.3;
  c.beginPath();
  c.moveTo(scBaseX, scBaseY);
  c.lineTo(scBaseX + fx * 4.2, scBaseY + fy * 4.2);
  c.stroke();
  c.fillStyle = '#2a2a22';
  c.beginPath(); c.arc(scBaseX + fx * 4.4, scBaseY + fy * 4.4, 1.25, 0, 7); c.fill();
  c.beginPath(); c.arc(scBaseX - fx * 0.6, scBaseY - fy * 0.6, 0.95, 0, 7); c.fill();
  c.fillStyle = us ? 'rgba(130,170,190,0.5)' : 'rgba(150,150,140,0.42)';
  c.beginPath(); c.arc(scBaseX + fx * 3.8, scBaseY + fy * 3.8, 0.55, 0, 7); c.fill();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 0.85;
  for (const t of [0.32, 0.5]) {
    const mx = fx * (gunLen * t), my = fy * (gunLen * t);
    c.beginPath();
    c.moveTo(mx, my);
    c.lineTo(mx + perpX * 1.9, my + perpY * 1.9);
    c.stroke();
  }
  c.strokeStyle = '#4a4038';
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(tipX - fy * 1.1, tipY + fx * 1.1);
  c.lineTo(tipX + fy * 1.1, tipY - fx * 1.1);
  c.stroke();
  c.strokeStyle = '#26261e';
  c.lineWidth = 1.15;
  const bipX = fx * (gunLen * 0.7), bipY = fy * (gunLen * 0.7);
  for (const s of [0.85, -0.85]) {
    c.beginPath();
    c.moveTo(bipX, bipY);
    c.lineTo(bipX + Math.cos(face + s) * 3.8, bipY + Math.sin(face + s) * 3.8);
    c.stroke();
  }
}

// Kar98k with ZF39 high-mount scope — the German sniper's signature
function drawKar98kSniper(c, fx, fy, gunLen, face) {
  drawKar98k(c, fx, fy, gunLen, face, false);
  const px = -fy, py = fx;
  const tipX = fx * gunLen, tipY = fy * gunLen;
  const scBaseX = fx * (gunLen * 0.38) + px * 2.4;
  const scBaseY = fy * (gunLen * 0.38) + py * 2.4;
  c.fillStyle = '#3a3830';
  c.beginPath();
  c.moveTo(scBaseX - px * 0.55, scBaseY - py * 0.55);
  c.lineTo(scBaseX + fx * 0.85 + px * 0.45, scBaseY + fy * 0.85 + py * 0.45);
  c.lineTo(scBaseX + fx * 0.85 - px * 0.45, scBaseY + fy * 0.85 - py * 0.45);
  c.closePath(); c.fill();
  c.strokeStyle = '#1a1a14';
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(scBaseX, scBaseY);
  c.lineTo(scBaseX + fx * 5.2, scBaseY + fy * 5.2);
  c.stroke();
  c.fillStyle = '#2a2a22';
  c.beginPath(); c.arc(scBaseX + fx * 5.4, scBaseY + fy * 5.4, 1.35, 0, 7); c.fill();
  c.beginPath(); c.arc(scBaseX - fx * 0.45, scBaseY - fy * 0.45, 1.05, 0, 7); c.fill();
  c.fillStyle = 'rgba(140,150,130,0.45)';
  c.beginPath(); c.arc(scBaseX + fx * 4.6, scBaseY + fy * 4.6, 0.6, 0, 7); c.fill();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 0.75;
  c.beginPath();
  c.moveTo(scBaseX + fx * 2.2 + px * 0.35, scBaseY + fy * 2.2 + py * 0.35);
  c.lineTo(scBaseX + fx * 3.8 + px * 0.35, scBaseY + fy * 3.8 + py * 0.35);
  c.stroke();
  c.fillStyle = '#4a3f32';
  c.beginPath(); c.ellipse(fx * 2.8 + px * 1.8, fy * 2.8 + py * 1.8, 1.2, 2, face, 0, 7); c.fill();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 1.15;
  const bipX = fx * (gunLen * 0.74), bipY = fy * (gunLen * 0.74);
  c.beginPath(); c.moveTo(bipX, bipY); c.lineTo(bipX + px * 2.6, bipY + py * 2.6); c.stroke();
  c.fillStyle = '#3a3830';
  c.beginPath(); c.arc(tipX + fx * 0.3, tipY + fy * 0.3, 0.95, 0, 7); c.fill();
}

function drawEsniperKit(c, fx, fy, face) {
  c.fillStyle = 'rgba(42,38,28,0.55)';
  for (const [px, py, rx, ry, rot] of [[-2.5, 1.2, 2.6, 1.6, 0.4], [2.8, -0.8, 2.2, 1.4, -0.6], [0, 3.2, 1.9, 1.2, 0.15],
    [-3.8, -0.8, 1.7, 1.1, 0.25], [3.5, 2.2, 1.5, 1, -0.35]]) {
    c.beginPath(); c.ellipse(px, py, rx, ry, rot, 0, 7); c.fill();
  }
  c.fillStyle = 'rgba(58,52,40,0.45)';
  c.beginPath(); c.ellipse(0, 0, 6.5, 5.5, face, 0, 7); c.fill();
  c.strokeStyle = 'rgba(72,64,48,0.6)';
  c.lineWidth = 0.75;
  for (const [sx, sy, ex, ey] of [[-4.5, 1.5, -6, 3.5], [3.5, -1.5, 5, -2.5], [-1.5, 4.5, 0, 6], [4.5, 0.5, 5.5, 2]]) {
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
  }
  c.strokeStyle = '#4a4840';
  c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(-fy * 3.2, fx * 3.2); c.lineTo(-fy * 4.5, fx * 4.5); c.stroke();
  c.beginPath(); c.moveTo(-fy * 3.2, fx * 3.2); c.lineTo(-fy * 2.2, fx * 2.2 + 2); c.stroke();
  c.fillStyle = '#2a2a22';
  c.beginPath(); c.arc(-fy * 4.5, fx * 4.5, 1.1, 0, 7); c.fill();
  c.fillStyle = 'rgba(120,130,110,0.4)';
  c.beginPath(); c.arc(-fy * 4.5, fx * 4.5, 0.45, 0, 7); c.fill();
  c.fillStyle = '#3a3428';
  c.fillRect(-6.5, -1.5, 3.2, 4.5);
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.7;
  c.strokeRect(-6.5, -1.5, 3.2, 4.5);
  c.strokeStyle = '#5a4a38';
  c.lineWidth = 0.9;
  c.beginPath(); c.moveTo(-6.5, 0.5); c.lineTo(-3.3, 0.5); c.stroke();
  for (const off of [-4, 4]) {
    c.fillStyle = '#3a3428';
    c.fillRect(off - 1.4, 3.6, 2.8, 2.5);
    c.strokeStyle = '#2a2820';
    c.lineWidth = 0.65;
    c.strokeRect(off - 1.4, 3.6, 2.8, 2.5);
    drawStripperClip(c, off, 4.5, 0.52, 0);
  }
  c.fillStyle = '#4a4438';
  c.beginPath(); c.ellipse(fy * 4.8, -fx * 4.8, 1.8, 2.4, face, 0, 7); c.fill();
  c.fillStyle = '#c8b898';
  c.beginPath(); c.ellipse(fy * 4.8, -fx * 4.8, 1.1, 1.4, face, 0, 7); c.fill();
  c.strokeStyle = '#6a5a40';
  c.lineWidth = 0.55;
  c.beginPath(); c.moveTo(fy * 4.3, -fx * 4.3); c.lineTo(fy * 5.2, -fx * 5.2 + 0.8); c.stroke();
}

function drawSoldier(a) {
  if (a.prone > 0) {
    drawProneSoldier(a);
    drawSoldierOverlays(a);
    return;
  }
  const c = ctx;
  const type = a.type;
  const us = (a.nation || a.side) === 'us';
  const isSniper = type === 'sniper' || type === 'esniper';
  const isBar = type === 'gunner';
  const isEmg = type === 'emg';
  const isMG = isBar || isEmg;
  const isSMG = type === 'engineer' || type === 'esmg';
  const isShotgun = type === 'shotgunner';
  const isOfficer = type === 'officer' || type === 'eoff';
  const isGrenadier = type === 'grenadier' || type === 'egren';
  const isMortar = !!a.t.mortar;
  const isRifle = type === 'rifleman' || type === 'erifle';
  const fx = Math.cos(a.face), fy = Math.sin(a.face);
  c.save();
  c.translate(a.x, a.y);

  // shadow
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath(); c.ellipse(0, 3, 8, 4, 0, 0, 7); c.fill();

  // ---- weapon: silhouette varies by class
  const gunLen = a.t.gun;
  if (type === 'eflame') {
    drawFlammenwerfer(c, fx, fy, gunLen, a.face, a.flameT > 0);
  } else if (type === 'flamer') {
    // M2 flamethrower wand — heat shield, grip, bell nozzle, fuel hose
    const tipX = fx * gunLen, tipY = fy * gunLen;
    c.strokeStyle = '#3a3830';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(fx * 2, fy * 2);
    c.lineTo(tipX, tipY);
    c.stroke();
    c.strokeStyle = '#26261e';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(fx * 2.4, fy * 2.4);
    c.lineTo(fx * (gunLen - 0.6), fy * (gunLen - 0.6));
    c.stroke();
    // vent slots on the heat shield
    c.strokeStyle = '#2e2c24';
    c.lineWidth = 0.8;
    for (let t = 0.32; t <= 0.78; t += 0.12) {
      const sx = fx * (gunLen * t), sy = fy * (gunLen * t);
      c.beginPath();
      c.moveTo(sx - fy * 1.8, sy + fx * 1.8);
      c.lineTo(sx + fy * 1.8, sy - fx * 1.8);
      c.stroke();
    }
    // pistol grip
    c.strokeStyle = '#4a3f32';
    c.lineWidth = 2.3;
    c.beginPath();
    c.moveTo(fx * 3.8 + fy * 1.4, fy * 3.8 - fx * 1.4);
    c.lineTo(fx * 3.8 + fy * 4.8, fy * 3.8 - fx * 4.8);
    c.stroke();
    // nozzle bell
    c.strokeStyle = '#5a4a38';
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(tipX - fy * 2.4, tipY + fx * 2.4);
    c.lineTo(tipX + fx * 2, tipY + fy * 2);
    c.lineTo(tipX + fy * 2.4, tipY - fx * 2.4);
    c.stroke();
    // hose from backpack tanks to the wand
    c.strokeStyle = '#2a2820';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-6, 0);
    c.quadraticCurveTo(-fy * 4 + fx * 1, fx * 4 + fy * 1, fx * 3.2, fy * 3.2);
    c.stroke();
    c.strokeStyle = '#1e1c18';
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(-6, 0);
    c.quadraticCurveTo(-fy * 4 + fx * 1, fx * 4 + fy * 1, fx * 3.2, fy * 3.2);
    c.stroke();
    // pilot flame at the nozzle
    const lit = a.flameT > 0;
    const nozX = tipX + fx * 1.4, nozY = tipY + fy * 1.4;
    if (lit) {
      c.shadowColor = '#ff6820';
      c.shadowBlur = 10;
      c.fillStyle = '#fff4b0';
      c.beginPath(); c.arc(nozX, nozY, 3, 0, 7); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = '#ff9a28';
      c.beginPath(); c.arc(nozX, nozY, 1.8, 0, 7); c.fill();
    } else {
      c.fillStyle = '#8a4020';
      c.beginPath(); c.arc(nozX, nozY, 1.5, 0, 7); c.fill();
      c.fillStyle = '#ff7020';
      c.beginPath(); c.arc(nozX, nozY, 0.75, 0, 7); c.fill();
    }
  } else if (isBar) {
    // M1918 BAR — long barrel, wooden stock, box mag, bipod, carry handle
    const tipX = fx * gunLen, tipY = fy * gunLen;
    c.strokeStyle = '#26261e';
    c.lineWidth = 2.8;
    c.beginPath();
    c.moveTo(fx * 2, fy * 2);
    c.lineTo(tipX, tipY);
    c.stroke();
    // wooden stock and pistol grip
    c.strokeStyle = '#4a3f2e';
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(fx * 1.1 - fy * 2.6, fy * 1.1 + fx * 2.6);
    c.lineTo(fx * 1.1 + fy * 2.4, fy * 1.1 - fx * 2.4);
    c.stroke();
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(fx * 3.2 + fy * 1.5, fy * 3.2 - fx * 1.5);
    c.lineTo(fx * 3.2 + fy * 4.2, fy * 3.2 - fx * 4.2);
    c.stroke();
    // gas tube along the top
    c.strokeStyle = '#3a3830';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(fx * 2.5 - fy * 0.9, fy * 2.5 + fx * 0.9);
    c.lineTo(fx * (gunLen - 1) - fy * 0.9, fy * (gunLen - 1) + fx * 0.9);
    c.stroke();
    // box magazine
    const magX = fx * (gunLen * 0.42), magY = fy * (gunLen * 0.42);
    c.fillStyle = '#2a2a1e';
    c.fillRect(magX - fy * 2.2 - 1.2, magY + fx * 2.2 - 1.5, fy * 4.4 + 2.4, -fx * 4.4 + 3);
    c.strokeStyle = '#1a1a14';
    c.lineWidth = 0.7;
    c.strokeRect(magX - fy * 2.2 - 1.2, magY + fx * 2.2 - 1.5, fy * 4.4 + 2.4, -fx * 4.4 + 3);
    c.fillStyle = '#c8a858';
    c.fillRect(magX - fy * 1.2 - 0.6, magY + fx * 1.2 - 2, fy * 2.4 + 1.2, -fx * 2.4 + 1.2);
    // carry handle
    c.strokeStyle = '#3a3a30';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(fx * (gunLen * 0.34) + fy * 1.3, fy * (gunLen * 0.34) - fx * 1.3, 1.6, 0, 7);
    c.stroke();
    // bipod legs
    c.strokeStyle = '#26261e';
    c.lineWidth = 1.4;
    for (const s of [-0.72, 0.72]) {
      c.beginPath();
      c.moveTo(fx * (gunLen - 0.5), fy * (gunLen - 0.5));
      c.lineTo(
        fx * (gunLen + 1.5) + Math.cos(a.face + s + 0.45) * 4,
        fy * (gunLen + 1.5) + Math.sin(a.face + s + 0.45) * 4,
      );
      c.stroke();
    }
    // flash hider
    c.strokeStyle = '#4a4038';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(tipX - fy * 1.6, tipY + fx * 1.6);
    c.lineTo(tipX + fy * 1.6, tipY - fx * 1.6);
    c.stroke();
    c.fillStyle = '#1c1c16';
    c.beginPath(); c.arc(tipX, tipY, 1.1, 0, 7); c.fill();
    // sling loop on the stock
    c.strokeStyle = '#6a5a40';
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(fx * 1.5 - fy * 3, fy * 1.5 + fx * 3);
    c.quadraticCurveTo(-fy * 2, fx * 2, fx * 2.5 + fy * 2, fy * 2.5 - fx * 2);
    c.stroke();
  } else if (isShotgun) {
    // M97 trench gun — long barrel, pump forend, wide choke, wooden stock
    const tipX = fx * gunLen, tipY = fy * gunLen;
    const pumpT = a.shotgunBlastT > 0 ? clamp(a.shotgunBlastT / 0.12, 0, 1) : 0;
    const pumpOff = pumpT * 1.4;
    c.strokeStyle = '#26261e';
    c.lineWidth = 3.4;
    c.beginPath();
    c.moveTo(fx * 2, fy * 2);
    c.lineTo(tipX, tipY);
    c.stroke();
    c.strokeStyle = '#4a3f2e';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(fx * 1.5 - fy * 2.6, fy * 1.5 + fx * 2.6);
    c.lineTo(fx * 1.5 + fy * 2.2, fy * 1.5 - fx * 2.2);
    c.stroke();
    // magazine tube under the barrel
    c.strokeStyle = '#3a3830';
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(fx * 2.5 + fy * 1.5, fy * 2.5 - fx * 1.5);
    c.lineTo(fx * (gunLen - 1.2) + fy * 1.5, fy * (gunLen - 1.2) - fx * 1.5);
    c.stroke();
    // pump forend — slides back on recoil
    const px = fx * (gunLen * 0.38 - pumpOff), py = fy * (gunLen * 0.38 - pumpOff);
    c.fillStyle = '#5a4a38';
    c.beginPath();
    c.moveTo(px - fy * 2.2, py + fx * 2.2);
    c.lineTo(px + fx * 3.8, py + fy * 3.8);
    c.lineTo(px + fy * 2.2, py - fx * 2.2);
    c.lineTo(px - fx * 3.8, py - fy * 3.8);
    c.closePath(); c.fill();
    c.strokeStyle = '#3a3028';
    c.lineWidth = 0.9;
    c.stroke();
    // vent rib along the barrel
    c.strokeStyle = '#3a3830';
    c.lineWidth = 0.7;
    for (let t = 0.55; t <= 0.92; t += 0.1) {
      const sx = fx * (gunLen * t), sy = fy * (gunLen * t);
      c.beginPath();
      c.moveTo(sx - fy * 1.4, sy + fx * 1.4);
      c.lineTo(sx + fy * 1.4, sy - fx * 1.4);
      c.stroke();
    }
    // wide muzzle choke
    c.strokeStyle = '#4a4038';
    c.lineWidth = 2.8;
    c.beginPath();
    c.moveTo(tipX - fy * 2.8, tipY + fx * 2.8);
    c.lineTo(tipX + fx * 1.5, tipY + fy * 1.5);
    c.lineTo(tipX + fy * 2.8, tipY - fx * 2.8);
    c.stroke();
    c.fillStyle = '#1c1c16';
    c.beginPath(); c.arc(tipX, tipY, 1.2, 0, 7); c.fill();
  } else if (isGrenadier && us) {
    // M1 carbine — short barrel, side mag, curved stock
    c.strokeStyle = '#26261e';
    c.lineWidth = 2.1;
    c.beginPath();
    c.moveTo(fx * 2, fy * 2);
    c.lineTo(fx * gunLen, fy * gunLen);
    c.stroke();
    c.strokeStyle = '#4a3f2e';
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(fx * 1.4 - fy * 2, fy * 1.4 + fx * 2);
    c.lineTo(fx * 1.4 + fy * 2, fy * 1.4 - fx * 2);
    c.stroke();
    c.fillStyle = '#2a2a1e';
    const magX = fx * (gunLen * 0.42), magY = fy * (gunLen * 0.42);
    c.fillRect(magX - fy * 1.6 - 0.9, magY + fx * 1.6 - 1.1, fy * 3.2 + 1.8, -fx * 3.2 + 2.2);
    c.strokeStyle = '#3a3a30';
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(fx * (gunLen * 0.55) + fy * 1.5, fy * (gunLen * 0.55) - fx * 1.5);
    c.lineTo(fx * (gunLen * 0.55) + fy * 3.2, fy * (gunLen * 0.55) - fx * 3.2);
    c.stroke();
    c.fillStyle = '#1c1c16';
    c.beginPath(); c.arc(fx * (gunLen - 0.5), fy * (gunLen - 0.5), 1, 0, 7); c.fill();
  } else if (type === 'egren') {
    drawKar98kGrenadier(c, fx, fy, gunLen, a.face);
  } else if (type === 'erifle') {
    drawKar98kRifleman(c, fx, fy, gunLen, a.face);
  } else if (isRifle) {
    drawM1Garand(c, fx, fy, gunLen, a.face);
  } else if (type === 'esniper') {
    drawKar98kSniper(c, fx, fy, gunLen, a.face);
  } else if (type === 'esmg') {
    drawMP40(c, fx, fy, gunLen, a.face);
  } else if (type === 'sniper') {
    drawScopedRifle(c, fx, fy, gunLen, a.face, true);
  } else if (type === 'emg') {
    drawMG42(c, fx, fy, gunLen, a.face);
  } else if (type === 'bazooka') {
    drawBazooka(c, fx, fy, a.face);
  } else if (type === 'ebazooka') {
    drawPanzerfaust(c, fx, fy, a.face);
  } else if (type === 'eoff') {
    drawSidearm(c, fx, fy, gunLen, a.face, false);
  } else if (type === 'officer' || isMortar) {
    drawSidearm(c, fx, fy, gunLen, a.face, us);
  } else {
    c.strokeStyle = '#26261e';
    c.lineWidth = isSMG ? 2.6 : 2;
    c.beginPath();
    c.moveTo(fx * 2, fy * 2);
    c.lineTo(fx * gunLen, fy * gunLen);
    c.stroke();
  }
  if (type === 'engineer') {
    // M3 grease gun — box magazine hanging under the receiver
    c.strokeStyle = '#26261e';
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(fx * (a.t.gun * 0.55), fy * (a.t.gun * 0.55));
    c.lineTo(fx * (a.t.gun * 0.55) - fy * 3, fy * (a.t.gun * 0.55) + fx * 3);
    c.stroke();
  }

  // ---- body
  const isFlamer = !!a.t.flame;
  const bodyW = isShotgun ? 7.5 : isEmg ? 7.3 : isBar ? 7 : isFlamer ? 7.2 : isGrenadier ? 6.8 : isMortar ? 6.7 : isOfficer ? 6.6 : isRifle ? 6.4 : isSniper ? 6.2 : 6.5;
  const bodyH = isShotgun ? 5.8 : isEmg ? 4.7 : isBar ? 4.9 : isFlamer ? 5.4 : isGrenadier ? 5.2 : isMortar ? 5.1 : isOfficer ? 5.2 : isRifle ? 4.9 : isSniper ? 4.8 : 5;
  c.fillStyle = a.t.color;
  c.beginPath(); c.ellipse(0, 0, bodyW, bodyH, a.face, 0, 7); c.fill();
  if (isOfficer) {
    if (us) {
      c.fillStyle = '#5a6048';
      c.beginPath(); c.ellipse(fx * 0.8, fy * 0.8, bodyW - 0.8, bodyH - 0.4, a.face, 0, 7); c.fill();
      c.strokeStyle = '#7a8068';
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(-fy * 2.2, fx * 2.2);
      c.lineTo(fy * 2.2, -fx * 2.2);
      c.stroke();
    } else {
      c.fillStyle = '#4a4840';
      c.beginPath(); c.ellipse(fx * 0.8, fy * 0.8, bodyW - 0.8, bodyH - 0.4, a.face, 0, 7); c.fill();
      c.fillStyle = '#8a8880';
      c.beginPath(); c.ellipse(fx * 3.2, fy * 3.2, 2.2, 1.2, a.face, 0, 7); c.fill();
      c.beginPath(); c.ellipse(-fx * 3.2, fy * 3.2, 2.2, 1.2, a.face, 0, 7); c.fill();
      c.fillStyle = '#c8c8c0';
      c.fillRect(fx * 3.2 - 0.3, fy * 3.2 - 0.8, 0.6, 1.6);
      c.fillRect(-fx * 3.2 - 0.3, fy * 3.2 - 0.8, 0.6, 1.6);
      c.strokeStyle = '#6a6860';
      c.lineWidth = 0.65;
      c.beginPath();
      c.moveTo(-fy * 1.2, fx * 1.2 - 1);
      c.quadraticCurveTo(0, fx * 1.2 - 2, fy * 1.2, fx * 1.2 - 1);
      c.stroke();
      c.strokeStyle = '#5a5a52';
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(-fy * 2.2, fx * 2.2);
      c.lineTo(fy * 2.2, -fx * 2.2);
      c.stroke();
    }
  }
  if (isShotgun) {
    // steel chest plate, heavy pauldrons, riveted breastplate
    c.fillStyle = '#4a5245';
    c.beginPath(); c.ellipse(fx * 1.3, fy * 1.3, 6.2, 5.2, a.face, 0, 7); c.fill();
    c.strokeStyle = '#2e3328';
    c.lineWidth = 1.2;
    c.stroke();
    c.fillStyle = '#5a6450';
    c.beginPath(); c.ellipse(-fy * 5, fx * 5, 2.6, 3.2, a.face, 0, 7); c.fill();
    c.beginPath(); c.ellipse(fy * 5, -fx * 5, 2.6, 3.2, a.face, 0, 7); c.fill();
    c.fillStyle = '#3a4034';
    for (const [rx, ry] of [[fx * 0.5, fy * 0.5], [-fx * 1.2, -fy * 1.2], [fx * 2, fy * 2]]) {
      c.beginPath(); c.arc(rx, ry, 0.7, 0, 7); c.fill();
    }
    c.strokeStyle = '#6a6a58';
    c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(-fy * 2.5, fx * 2.5); c.lineTo(fy * 2.5, -fx * 2.5); c.stroke();
  }
  if (type === 'eflame') {
    // Flam Panzer — asbestos suit with segmented steel plates and scorch marks
    c.fillStyle = '#3a3834';
    c.beginPath(); c.ellipse(fx * 1.3, fy * 1.3, 6.4, 5.4, a.face, 0, 7); c.fill();
    c.strokeStyle = '#2a2824';
    c.lineWidth = 1;
    c.stroke();
    c.strokeStyle = '#5a5a50';
    c.lineWidth = 0.75;
    for (const off of [-1.6, 0, 1.6]) {
      c.beginPath();
      c.moveTo(-fy * 3.2 + off * fx * 0.25, fx * 3.2 + off * fy * 0.25);
      c.lineTo(fy * 2.4 + off * fx * 0.25, -fx * 2.4 + off * fy * 0.25);
      c.stroke();
    }
    c.fillStyle = '#4a4840';
    c.beginPath(); c.ellipse(fx * 0.6, fy * 0.6 - 3.2, 4.6, 2.1, a.face, 0, 7); c.fill();
    c.fillStyle = 'rgba(42,34,26,0.38)';
    c.beginPath(); c.ellipse(-fy * 4.6, fx * 4.6, 2.2, 2.8, a.face, 0, 7); c.fill();
    c.beginPath(); c.ellipse(fy * 4.6, -fx * 4.6, 2.2, 2.8, a.face, 0, 7); c.fill();
  } else if (type === 'flamer') {
    // flak vest — steel plate over the torso, heavier than a rifleman's kit
    c.fillStyle = '#4a4e42';
    c.beginPath(); c.ellipse(fx * 1.4, fy * 1.4, 6.2, 5.2, a.face, 0, 7); c.fill();
    c.strokeStyle = '#2a2e24';
    c.lineWidth = 1.1;
    c.stroke();
    c.fillStyle = '#5a5e50';
    c.beginPath(); c.ellipse(-fy * 4.8, fx * 4.8, 2.4, 3, a.face, 0, 7); c.fill();
    c.beginPath(); c.ellipse(fy * 4.8, -fx * 4.8, 2.4, 3, a.face, 0, 7); c.fill();
    c.strokeStyle = '#3a3e34';
    c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(-fy * 3, fx * 3); c.lineTo(fy * 3, -fx * 3); c.stroke();
  }
  if (type === 'emg') {
    // Hüftschützer belt apron and ammunition harness for the MG42 crew
    c.fillStyle = '#424038';
    c.beginPath(); c.ellipse(fx * 1.2, fy * 1.2, 6.5, 5.4, a.face, 0, 7); c.fill();
    c.strokeStyle = '#2e2c28';
    c.lineWidth = 0.9;
    c.stroke();
    c.strokeStyle = '#6a5a42';
    c.lineWidth = 1.35;
    c.beginPath();
    c.moveTo(-fy * 4.5 - fx * 1.2, fx * 4.5 - fy * 1.2);
    c.lineTo(fy * 4.5 - fx * 1.2, -fx * 4.5 - fy * 1.2);
    c.stroke();
    c.fillStyle = '#5a5a50';
    c.beginPath(); c.ellipse(-fy * 4.8, fx * 4.8, 2.4, 3, a.face, 0, 7); c.fill();
    c.beginPath(); c.ellipse(fy * 4.8, -fx * 4.8, 2.4, 3, a.face, 0, 7); c.fill();
    c.strokeStyle = '#3a3e34';
    c.lineWidth = 0.75;
    c.beginPath(); c.moveTo(-fy * 2.8, fx * 2.8); c.lineTo(fy * 2.8, -fx * 2.8); c.stroke();
  }
  if (type === 'sniper') {
    // ghillie scrim — burlap patches and grass tufts
    c.fillStyle = 'rgba(30,36,22,0.55)';
    for (const [px, py, rx, ry, rot] of [[-2, 1.5, 2.4, 1.5, 0.5], [2.5, -1, 2, 1.3, -0.7], [0.5, 3, 1.7, 1.1, 0.2],
      [-3.5, -0.5, 1.8, 1.2, 0.3], [3, 2.5, 1.6, 1, -0.4]]) {
      c.beginPath(); c.ellipse(px, py, rx, ry, rot, 0, 7); c.fill();
    }
    c.strokeStyle = 'rgba(45,55,30,0.65)';
    c.lineWidth = 0.8;
    for (const [sx, sy, ex, ey] of [[-4, 2, -5.5, 4], [3, -2, 4.5, -3.5], [-1, 4, 0.5, 5.5], [4, 1, 5, 2.5]]) {
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
    }
    // spotting binoculars on the chest
    c.fillStyle = '#2a2a22';
    c.fillRect(-fy * 3 - 2, fx * 3 - 1.2, 4, 2.6);
    c.strokeStyle = '#6a5a40';
    c.lineWidth = 0.8;
    c.strokeRect(-fy * 3 - 2, fx * 3 - 1.2, 4, 2.6);
    c.fillStyle = '#1a1a14';
    c.beginPath(); c.arc(-fy * 3 - 1.2, fx * 3, 0.85, 0, 7); c.fill();
    c.beginPath(); c.arc(-fy * 3 + 1.2, fx * 3, 0.85, 0, 7); c.fill();
    c.fillStyle = 'rgba(120,150,170,0.45)';
    c.beginPath(); c.arc(-fy * 3 - 1.2, fx * 3, 0.4, 0, 7); c.fill();
    c.beginPath(); c.arc(-fy * 3 + 1.2, fx * 3, 0.4, 0, 7); c.fill();
    // stripper clips on the belt
    c.fillStyle = '#c8a858';
    for (const off of [-3.5, 0, 3.5]) {
      c.fillRect(off - 0.6, 4.5, 1.2, 2.2);
    }
  }
  if (type === 'esniper') {
    drawEsniperKit(c, fx, fy, a.face);
  }
  if (isBar) {
    // ammo bandolier, spare BAR mags, and sling across the chest
    c.strokeStyle = '#8a7a48';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(-fy * 5.2 - fx * 2, fx * 5.2 - fy * 2);
    c.lineTo(fy * 5.2 - fx * 2, -fx * 5.2 - fy * 2);
    c.stroke();
    drawBARMag(c, -5, 3.5, 0.88, 0.3);
    drawBARMag(c, -2.2, 5.2, 0.85, -0.15);
    drawBARMag(c, 1.5, 4.8, 0.82, 0.5);
    c.fillStyle = '#2f3328';
    for (const off of [-4.5, -1.5, 1.5, 4.5]) {
      c.fillRect(off - 1.5, 4, 3, 2.4);
      c.strokeStyle = '#4a4a3e';
      c.lineWidth = 0.7;
      c.strokeRect(off - 1.5, 4, 3, 2.4);
    }
    c.strokeStyle = '#6a5a40';
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(-fy * 3.5, fx * 3.5);
    c.quadraticCurveTo(0, 5.5, fy * 3.5, -fx * 3.5);
    c.stroke();
  }
  if (type === 'esmg') {
    // assault smock and collar Litzen — close-quarters stormtrooper loadout
    c.fillStyle = '#3e3c34';
    c.beginPath(); c.ellipse(fx * 1.1, fy * 1.1, 6.8, 5.6, a.face, 0, 7); c.fill();
    c.strokeStyle = '#2e2c28';
    c.lineWidth = 0.85;
    c.stroke();
    c.fillStyle = '#4a4a42';
    c.beginPath(); c.ellipse(fx * 2.5, fy * 2.5, 1.7, 1.1, a.face, 0, 7); c.fill();
    c.beginPath(); c.ellipse(-fx * 2.5, fy * 2.5, 1.7, 1.1, a.face, 0, 7); c.fill();
    c.strokeStyle = '#b8261c';
    c.lineWidth = 0.85;
    c.beginPath();
    c.moveTo(-fy * 4.8, fx * 4.8 - 1.2);
    c.lineTo(-fy * 4.8, fx * 4.8 + 1.2);
    c.stroke();
  }
  if (type === 'erifle') {
    // collar Litzen tabs and tunic fold
    c.fillStyle = '#4a4a42';
    c.beginPath(); c.ellipse(fx * 2.5, fy * 2.5, 1.8, 1.2, a.face, 0, 7); c.fill();
    c.beginPath(); c.ellipse(-fx * 2.5, fy * 2.5, 1.8, 1.2, a.face, 0, 7); c.fill();
    c.strokeStyle = '#3a3a34';
    c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(-fy * 1.5, fx * 1.5); c.lineTo(fy * 1.5, -fx * 1.5); c.stroke();
  }
  if (type === 'erifle') {
    // loader's apron and heavy gloves for the GrW crew
    c.fillStyle = '#46443c';
    c.beginPath(); c.ellipse(fx * 1.2, fy * 1.2, 6.4, 5.4, a.face, 0, 7); c.fill();
    c.strokeStyle = '#2e2c28';
    c.lineWidth = 0.9;
    c.stroke();
    c.fillStyle = '#3a3830';
    c.beginPath(); c.ellipse(fx * 4.5, fy * 4.5, 1.8, 2.2, a.face, 0, 7); c.fill();
    c.beginPath(); c.ellipse(-fx * 3.5, fy * 3.5, 1.6, 2, a.face, 0, 7); c.fill();
  }
  if (type === 'egren') {
    // reinforced web vest and hazard cross — carries a heavy explosive load
    c.fillStyle = '#4a4e42';
    c.beginPath(); c.ellipse(fx * 1.2, fy * 1.2, 6.4, 5.4, a.face, 0, 7); c.fill();
    c.strokeStyle = '#2e3228';
    c.lineWidth = 1;
    c.stroke();
    c.strokeStyle = '#8a3830';
    c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(-fy * 2, fx * 2); c.lineTo(fy * 2, -fx * 2); c.stroke();
    c.beginPath(); c.moveTo(fy * 2, fx * 2); c.lineTo(-fy * 2, -fx * 2); c.stroke();
  }
  if (type === 'bazooka') {
    c.fillStyle = '#4a5245';
    c.beginPath(); c.ellipse(fx * 1.2, fy * 1.2, 6.5, 5.4, a.face, 0, 7); c.fill();
    c.strokeStyle = '#8a7a48';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(-fy * 4.8 - fx * 1.2, fx * 4.8 - fy * 1.2);
    c.lineTo(fy * 4.8 - fx * 1.2, -fx * 4.8 - fy * 1.2);
    c.stroke();
  }

  // ---- class kit
  if (type === 'rifleman') {
    drawRiflemanKit(c, fx, fy, a.face, true);
  }
  if (type === 'erifle') {
    drawErifleKit(c, fx, fy, a.face);
  }
  if (isShotgun) {
    // 12-gauge bandolier and shell loops on the belt
    c.strokeStyle = '#8a7a48';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(-fy * 5 - fx * 1.2, fx * 5 - fy * 1.2);
    c.lineTo(fy * 5 - fx * 1.2, -fx * 5 - fy * 1.2);
    c.stroke();
    drawShotgunShell(c, -5.2, 2.8, 0.9, 0.25);
    drawShotgunShell(c, -2.8, 4.5, 0.85, -0.15);
    drawShotgunShell(c, 0.2, 5.2, 0.82, 0.4);
    drawShotgunShell(c, 3.2, 4.2, 0.8, 0.65);
    c.fillStyle = '#3a4034';
    c.fillRect(-6.2, 4.5, 4.5, 2.8);
    c.strokeStyle = '#4a4a3e';
    c.lineWidth = 0.8;
    c.strokeRect(-6.2, 4.5, 4.5, 2.8);
    c.fillStyle = '#2f3328';
    c.fillRect(4.8, 3.8, 2.6, 2.2);
  }
  if (type === 'grenadier') {
    // M1 carbine bandolier and frags clipped to the harness
    c.strokeStyle = '#8a7a48';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(-fy * 4.5 - fx * 1.5, fx * 4.5 - fy * 1.5);
    c.lineTo(fy * 4.5 - fx * 1.5, -fx * 4.5 - fy * 1.5);
    c.stroke();
    c.fillStyle = '#3a4034';
    c.beginPath(); c.ellipse(-fy * 5.2, fx * 5.2, 2.4, 2.8, a.face, 0, 7); c.fill();
    c.beginPath(); c.ellipse(fy * 4.8, -fx * 4.8, 2.2, 2.5, a.face, 0, 7); c.fill();
    drawFragGrenade(c, -4.8, 3.2, 0.88, { rot: 0.35 });
    drawFragGrenade(c, -1.5, 5.2, 0.82, { rot: -0.2 });
    drawFragGrenade(c, 2.2, 4.6, 0.78, { rot: 0.55 });
    c.fillStyle = '#2f3328';
    c.fillRect(-5.8, 4.8, 3.2, 2.4);
    c.strokeStyle = '#4a4a3e';
    c.lineWidth = 0.8;
    c.strokeRect(-5.8, 4.8, 3.2, 2.4);
  }
  if (type === 'egren') {
    drawEgrenKit(c, fx, fy, a.face);
  }
  if (type === 'esmg') {
    drawEsmgKit(c, fx, fy, a.face);
  }
  if (type === 'emg') {
    drawEmgKit(c, fx, fy, a.face);
  }
  if (type === 'bazooka') drawBazookaKit(c, fx, fy, a.face);
  if (type === 'ebazooka') drawEbazookaKit(c, fx, fy, a.face);
  if (a.t.mortar && type === 'emortar') {
    const tube = drawGranatwerferTube(c, a.face, fx, fy, a.mortarFireT || 0);
    drawEmortarKit(c, fx, fy, a.face, tube);
  } else if (a.t.mortar) {
    const tube = drawMortarTube(c, a.face, fx, fy, a.mortarFireT || 0);
    // wooden ammo crate beside the baseplate
    c.fillStyle = '#5a4a38';
    c.fillRect(tube.bx - 4.5, tube.by + 2.5, 5.5, 3.8);
    c.strokeStyle = '#3a3028';
    c.lineWidth = 0.8;
    c.strokeRect(tube.bx - 4.5, tube.by + 2.5, 5.5, 3.8);
    c.strokeStyle = '#4a4030';
    c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(tube.bx - 4.5, tube.by + 4.4); c.lineTo(tube.bx + 1, tube.by + 4.4); c.stroke();
    drawMortarRound(c, tube.bx - 3.2, tube.by + 3.2, 0.75, 0.2);
    drawMortarRound(c, tube.bx - 1.5, tube.by + 3.5, 0.72, -0.15);
    drawMortarRound(c, tube.bx - 0.2, tube.by + 3.1, 0.7, 0.35);
    // shell carry bag on the chest
    c.fillStyle = '#3a4034';
    c.beginPath(); c.ellipse(fy * 3.5, -fx * 3.5, 2.8, 3.4, a.face, 0, 7); c.fill();
    c.strokeStyle = '#2a2e24';
    c.lineWidth = 0.9;
    c.stroke();
    drawMortarRound(c, fy * 3.2, -fx * 3.2, 0.65, a.face + 0.5);
    // range table / map board tucked under arm
    c.fillStyle = '#c8b898';
    c.fillRect(-fy * 4.8 - 2, fx * 4.8 - 1.5, 4, 3);
    c.strokeStyle = '#6a5a40';
    c.lineWidth = 0.6;
    c.strokeRect(-fy * 4.8 - 2, fx * 4.8 - 1.5, 4, 3);
    c.strokeStyle = '#8a7a58';
    c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(-fy * 4.8 - 1.5, fx * 4.8); c.lineTo(-fy * 4.8 + 1, fx * 4.8 + 1.2); c.stroke();
  }
  if (type === 'officer') {
    drawOfficerKit(c, fx, fy, a.face, true);
  }
  if (type === 'eoff') {
    drawEoffKit(c, fx, fy, a.face);
  }
  if (type === 'eflame') {
    drawEflameKit(c, fx, fy, a.face);
  } else if (type === 'flamer') {
    // twin fuel tanks on the back — metal cylinders, straps, warning stripe
    const tankX = -6.2;
    for (const [ty, fill, cap] of [[-2.2, '#7a4828', '#4a4038'], [2.8, '#3a3c30', '#323028']]) {
      c.fillStyle = fill;
      c.beginPath(); c.ellipse(tankX, ty, 2.3, 4, 0, 0, 7); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.4)';
      c.lineWidth = 0.9;
      c.beginPath(); c.ellipse(tankX, ty, 2.3, 4, 0, 0, 7); c.stroke();
      c.fillStyle = cap;
      c.beginPath(); c.ellipse(tankX, ty - 3.6, 1.6, 1.1, 0, 0, 7); c.fill();
    }
    c.strokeStyle = '#2a2820';
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(tankX - 2.5, -5.5); c.lineTo(tankX + 2.5, 5.5); c.stroke();
    c.beginPath(); c.moveTo(tankX + 2.5, -5.5); c.lineTo(tankX - 2.5, 5.5); c.stroke();
    c.fillStyle = '#e8c030';
    c.fillRect(tankX - 0.8, -1.2, 1.6, 4.8);
    c.strokeStyle = '#1a1814';
    c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(tankX - 2.3, 0); c.lineTo(-2, fy * 2); c.stroke();
  }

  // ---- headgear
  if (type === 'eoff') {
    drawEoffCap(c, fx, fy);
  } else if (type === 'officer') {
    drawOfficerCap(c, fx, fy, true);
  } else if (type === 'esniper') {
    // helmet with oak-leaf cover and foliage loops
    c.fillStyle = '#3f3f34';
    c.beginPath(); c.arc(0, -1, 4.0, 0, 7); c.fill();
    c.fillStyle = 'rgba(58,52,40,0.55)';
    for (let i = 0; i < 6; i++) {
      const ang = i * Math.PI / 3 + 0.15;
      c.beginPath();
      c.ellipse(Math.cos(ang) * 2.8, -1 + Math.sin(ang) * 2.8, 1.1, 1.6, ang, 0, 7);
      c.fill();
    }
    c.strokeStyle = 'rgba(72,64,48,0.65)';
    c.lineWidth = 0.65;
    for (let i = 0; i < 5; i++) {
      const ang = i * Math.PI / 2.5 + 0.3;
      c.beginPath();
      c.moveTo(Math.cos(ang) * 3, -1 + Math.sin(ang) * 3);
      c.lineTo(Math.cos(ang) * 4.5, -1 + Math.sin(ang) * 4.5);
      c.stroke();
    }
    const hx = -fx * 2.3, hy = -1 + fy * 2.3;
    c.strokeStyle = 'rgba(200,198,180,0.7)';
    c.lineWidth = 0.55;
    c.beginPath(); c.moveTo(hx - 1, hy); c.lineTo(hx + 1, hy); c.stroke();
    c.beginPath(); c.moveTo(hx, hy - 1); c.lineTo(hx, hy + 1); c.stroke();
  } else if (type === 'sniper') {
    // ghillie hood — dark scrim with leaf fringe
    c.fillStyle = '#2e3823';
    c.beginPath(); c.arc(0, -1, 4.0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(48,58,32,0.75)';
    c.lineWidth = 0.75;
    for (let i = 0; i < 8; i++) {
      const ang = i * Math.PI / 4 + 0.2;
      c.beginPath();
      c.moveTo(Math.cos(ang) * 3.2, -1 + Math.sin(ang) * 3.2);
      c.lineTo(Math.cos(ang) * 4.8, -1 + Math.sin(ang) * 4.8);
      c.stroke();
    }
    c.fillStyle = 'rgba(55,65,38,0.5)';
    c.beginPath(); c.ellipse(-fx * 2.5, -1 + fy * 2.5, 1.4, 1.8, a.face, 0, 7); c.fill();
  } else if (type === 'medic') {
    // white helmet with the red cross
    c.fillStyle = '#ddd8c8';
    c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)';
    c.lineWidth = 1;
    c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.stroke();
    c.fillStyle = '#b8261c';
    c.fillRect(-2.4, -1.7, 4.8, 1.4); c.fillRect(-0.7, -3.4, 1.4, 4.8);
  } else {
    c.fillStyle = us ? '#5b6b4a' : '#61615a';
    c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1;
    c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.stroke();
    if (type === 'grenadier') {
      // white assault stripe on the helmet back
      c.fillStyle = 'rgba(230,228,210,0.85)';
      c.beginPath(); c.arc(-fx * 2.8, -1 + fy * 2.8, 1.6, 0, 7); c.fill();
    }
    if (type === 'egren') {
      // white stick-grenade stencil on the helmet side
      const hx = -fx * 2.5, hy = -1 + fy * 2.5;
      c.strokeStyle = 'rgba(230,228,210,0.88)';
      c.lineWidth = 0.95;
      c.beginPath(); c.moveTo(hx, hy - 1.8); c.lineTo(hx, hy + 1.4); c.stroke();
      c.fillStyle = 'rgba(230,228,210,0.88)';
      c.beginPath(); c.arc(hx, hy - 2, 1.05, 0, 7); c.fill();
      c.strokeStyle = 'rgba(200,198,180,0.7)';
      c.lineWidth = 0.55;
      c.beginPath(); c.arc(hx, hy - 2, 1.05, 0, 7); c.stroke();
    }
    if (type === 'emg') {
      // white crossed cartridge belts — MG42 team stencil
      const mx = -fx * 2.35, my = -1 + fy * 2.35;
      c.strokeStyle = 'rgba(230,228,210,0.88)';
      c.lineWidth = 0.85;
      c.beginPath();
      c.moveTo(mx - 1.2, my - 1.2); c.lineTo(mx + 1.2, my + 1.2);
      c.moveTo(mx + 1.2, my - 1.2); c.lineTo(mx - 1.2, my + 1.2);
      c.stroke();
      c.beginPath();
      c.moveTo(mx - 0.8, my - 1.5); c.lineTo(mx - 0.8, my + 1.5);
      c.moveTo(mx + 0.8, my - 1.5); c.lineTo(mx + 0.8, my + 1.5);
      c.stroke();
    }
    if (type === 'eflame') {
      // orange flame stencil on the helmet — Flammenwerfer section
      const fx2 = -fx * 2.35, fy2 = -1 + fy * 2.35;
      c.fillStyle = 'rgba(255,120,40,0.9)';
      c.beginPath();
      c.moveTo(fx2 - 0.3, fy2 + 1.5);
      c.quadraticCurveTo(fx2 + 0.2, fy2 - 0.2, fx2 + 0.5, fy2 - 1.6);
      c.quadraticCurveTo(fx2 + 0.9, fy2 - 0.3, fx2 + 0.6, fy2 + 1.5);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(230,180,80,0.7)';
      c.lineWidth = 0.55;
      c.stroke();
    }
    if (type === 'esmg') {
      // white lightning bolt — assault stormtrooper stencil
      const lx = -fx * 2.4, ly = -1 + fy * 2.4;
      c.strokeStyle = 'rgba(230,228,210,0.9)';
      c.lineWidth = 1.05;
      c.beginPath();
      c.moveTo(lx - 0.4, ly - 1.8);
      c.lineTo(lx + 0.5, ly - 0.2);
      c.lineTo(lx - 0.1, ly - 0.2);
      c.lineTo(lx + 0.6, ly + 1.8);
      c.stroke();
      c.fillStyle = 'rgba(230,228,210,0.85)';
      c.beginPath(); c.arc(-fx * 2.8, -1 + fy * 2.8, 1.4, 0, 7); c.fill();
    }
    if (type === 'erifle') {
      // national shield decal and eagle on the helmet
      const sx = -fx * 2.2, sy = -1 + fy * 2.2;
      c.fillStyle = 'rgba(200,198,180,0.78)';
      c.beginPath(); c.ellipse(sx, sy, 1.05, 1.35, a.face, 0, 7); c.fill();
      c.strokeStyle = 'rgba(60,58,48,0.55)';
      c.lineWidth = 0.5;
      c.stroke();
      c.strokeStyle = 'rgba(50,48,40,0.72)';
      c.lineWidth = 0.65;
      c.beginPath();
      c.moveTo(sx - 0.6, sy - 0.8);
      c.quadraticCurveTo(sx + 0.2, sy - 1.4, sx + 0.9, sy - 0.5);
      c.stroke();
      c.beginPath();
      c.moveTo(sx - 0.3, sy - 0.6); c.lineTo(sx + 0.5, sy - 0.2); c.stroke();
    }
    if (isShotgun) {
      // steel chin strap — keeps the helmet on under recoil
      c.strokeStyle = '#4a4a40';
      c.lineWidth = 1.1;
      c.beginPath(); c.moveTo(-2.8, 1.5); c.lineTo(0, 3.8); c.lineTo(2.8, 1.5); c.stroke();
    }
    if (type === 'mortarman') {
      // red armband — mortar section identifier
      c.fillStyle = '#b8261c';
      c.beginPath(); c.ellipse(-fy * 4.2, fx * 4.2, 1.8, 2.4, a.face, 0, 7); c.fill();
    }
    if (type === 'emortar') {
      // white falling bomb stencil — Granatwerfer section
      const mx = -fx * 2.4, my = -1 + fy * 2.4;
      c.fillStyle = 'rgba(230,228,210,0.85)';
      c.beginPath(); c.arc(mx, my - 1.2, 0.9, 0, 7); c.fill();
      c.strokeStyle = 'rgba(230,228,210,0.85)';
      c.lineWidth = 0.85;
      c.beginPath(); c.moveTo(mx, my - 0.3); c.lineTo(mx, my + 1.6); c.stroke();
      c.beginPath();
      c.moveTo(mx - 0.7, my + 1.2); c.lineTo(mx, my + 1.8); c.lineTo(mx + 0.7, my + 1.2);
      c.stroke();
    }
    if (type === 'bazooka') {
      // white rocket stencil — bazooka section
      const rx = -fx * 2.35, ry = -1 + fy * 2.35;
      c.strokeStyle = 'rgba(230,228,210,0.9)';
      c.lineWidth = 0.95;
      c.beginPath();
      c.moveTo(rx - 0.3, ry + 1.2);
      c.lineTo(rx + 0.8, ry - 1.4);
      c.stroke();
      c.fillStyle = 'rgba(255,180,60,0.85)';
      c.beginPath(); c.arc(rx + 0.8, ry - 1.4, 0.55, 0, 7); c.fill();
    }
    if (type === 'ebazooka') {
      // white tank silhouette — Panzerfaust section
      const tx = -fx * 2.35, ty = -1 + fy * 2.35;
      c.strokeStyle = 'rgba(230,228,210,0.9)';
      c.lineWidth = 0.85;
      c.strokeRect(tx - 1.2, ty - 0.8, 2.4, 1.6);
      c.beginPath();
      c.moveTo(tx - 1.2, ty + 0.8); c.lineTo(tx - 1.8, ty + 1.4);
      c.moveTo(tx + 1.2, ty + 0.8); c.lineTo(tx + 1.8, ty + 1.4);
      c.stroke();
      c.beginPath();
      c.moveTo(tx - 0.5, ty - 0.8); c.lineTo(tx - 0.5, ty - 1.4);
      c.moveTo(tx + 0.5, ty - 0.8); c.lineTo(tx + 0.5, ty - 1.4);
      c.stroke();
    }
    if (isRifle) {
      c.strokeStyle = 'rgba(30,36,22,0.38)';
      c.lineWidth = 0.65;
      for (const off of [-2, 0, 2]) {
        c.beginPath(); c.arc(off, -1, 3.55, 0.18, 2.92); c.stroke();
      }
      c.strokeStyle = '#4a4a40';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(-2.7, 1.7); c.lineTo(0, 3.5); c.lineTo(2.7, 1.7); c.stroke();
    }
  }
  if (a.type === 'engineer') {
    // crossed-tools mark on the helmet
    c.strokeStyle = '#e8d98a';
    c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(-2.4, -3.4); c.lineTo(2.4, 1.4); c.stroke();
    c.beginPath(); c.moveTo(2.4, -3.4); c.lineTo(-2.4, 1.4); c.stroke();
  }
  if (isBar) {
    // helmet net, brass buckle, and cheek rest mark
    c.strokeStyle = 'rgba(30,36,22,0.45)';
    c.lineWidth = 0.7;
    for (const off of [-2.5, 0, 2.5]) {
      c.beginPath(); c.arc(off, -1, 3.6, 0.2, 2.9); c.stroke();
    }
    c.fillStyle = '#8a7a48';
    c.beginPath(); c.arc(fy * 3.2, -fx * 3.2, 1.2, 0, 7); c.fill();
    c.strokeStyle = '#5a4a38';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(-2.5, 0.5); c.lineTo(-3.5, 2.5); c.stroke();
  }
  if (type === 'emg') {
    // MG team y-straps and chin strap
    c.strokeStyle = '#3c3c33';
    c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(-2.8, -3.2); c.lineTo(0, 1.8); c.lineTo(2.8, -3.2); c.stroke();
    c.beginPath(); c.moveTo(-2.2, 2.2); c.lineTo(2.2, 2.2); c.stroke();
  }

  // wind-up pose while lobbing a grenade
  if (a.grenThrowT > 0) {
    const t = clamp(a.grenThrowT / 0.35, 0, 1);
    const arm = a.face - 0.55 + (1 - t) * 0.35;
    const ax = Math.cos(arm) * 5.5, ay = Math.sin(arm) * 5.5;
    c.strokeStyle = a.t.color;
    c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(ax, ay); c.stroke();
    if (type === 'egren') {
      drawStickGrenade(c, ax + Math.cos(arm) * 2.5, ay + Math.sin(arm) * 2.5, 0.9, arm + Math.PI / 2);
    } else {
      drawFragGrenade(c, ax + Math.cos(arm) * 2.2, ay + Math.sin(arm) * 2.2, 0.95, { rot: arm - 0.4 });
    }
  }
  // drop a round into the tube while firing
  if (a.mortarFireT > 0 && a.t.mortar) {
    const t = clamp(a.mortarFireT / 0.18, 0, 1);
    const arm = a.face - 0.35 - t * 0.5;
    const ax = Math.cos(arm) * 6, ay = Math.sin(arm) * 6;
    c.strokeStyle = a.t.color;
    c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(ax, ay); c.stroke();
    if (type === 'emortar') {
      drawGrw81Round(c, ax + Math.cos(arm) * 2, ay + Math.sin(arm) * 2, 0.9, arm + Math.PI / 2);
    } else {
      drawMortarRound(c, ax + Math.cos(arm) * 1.8, ay + Math.sin(arm) * 1.8, 0.85, arm + Math.PI / 2);
    }
  }

  c.restore();

  drawSoldierOverlays(a);
}

// health bar, rank chevrons, selection ring: drawn whether standing or prone
function drawSoldierOverlays(a) {
  if (a._ghost) return;
  if (a.hp < a.maxhp) {
    const f = clamp(a.hp / a.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(a.x - 9, a.y - 13, 18, 3);
    ctx.fillStyle = f > 0.5 ? '#7ec850' : f > 0.25 ? '#e0b040' : '#d04030';
    ctx.fillRect(a.x - 9, a.y - 13, 18 * f, 3);
  }

  // rank chevrons for veterans (visual nation — US kit only)
  if ((a.nation || a.side) === 'us' && a.rank > 0) {
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 1;
    let sx = a.x - (a.rank * 5 - 2) / 2;
    const sy = a.y - 17;
    for (let i = 0; i < a.rank; i++) {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 1.5, sy - 2.5);
      ctx.lineTo(sx + 3, sy);
      ctx.stroke();
      sx += 5;
    }
  }

  // the hit-squad target is marked for death: pulsing gold ring + crosshair ticks
  if (a.vip) {
    const pulse = 15 + Math.sin(G.time * 4) * 2;
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(a.x, a.y, pulse, 0, 7); ctx.stroke();
    ctx.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.moveTo(a.x + dx * (pulse - 3), a.y + dy * (pulse - 3));
      ctx.lineTo(a.x + dx * (pulse + 4), a.y + dy * (pulse + 4));
    }
    ctx.stroke();
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd94a';
    ctx.fillText('TARGET', a.x, a.y - pulse - 5);
  }

  // selection ring
  if (G.selected.includes(a)) {
    drawUnitWeaponRange(a, { bearing: a.face });
    drawSpecialistRange(a);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(a.x, a.y, 12, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    if (G.selected.length === 1) {
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      // German kit carries no rank or kill tally on the label
      const label = (a.nation || a.side) === 'us'
        ? RANKS[a.rank].name + ' ' + a.t.name.toUpperCase() + ' \u2014 ' +
          (a.type === 'medic' || a.type === 'engineer' ? a.xp + ' XP' : a.xp + ' KILLS')
        : a.t.name.toUpperCase();
      ctx.fillText(label, a.x + 1, a.y + 23);
      ctx.fillStyle = '#ffe98a';
      ctx.fillText(label, a.x, a.y + 22);
    }
  }
}

function drawTank(a) {
  const us = (a.nation || a.side) === 'us';
  const c = ctx;
  const home = vehicleHomeFace(a);
  const hullAng = vehicleHullAngle(a);
  const hullRot = hullAng - home;
  const heavy = !!a.t.heavy;
  const casemate = !!a.t.casemate;
  const hw = heavy ? 20 : 17;
  const hh = heavy ? 17 : 14;
  const trackW = heavy ? 9 : 8;
  const trackOff = heavy ? 27 : 24;
  c.save();
  c.translate(a.x, a.y);
  // shadow
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath(); c.ellipse(0, 4, heavy ? 30 : 26, heavy ? 21 : 18, 0, 0, 7); c.fill();
  if (a.moveTo) c.rotate(hullRot);
  // tracks
  c.fillStyle = '#2f2f28';
  c.fillRect(-trackOff, -16, trackW, 32);
  c.fillRect(trackOff - trackW, -16, trackW, 32);
  // hull
  c.fillStyle = a.t.color;
  c.fillRect(-hw, -hh, hw * 2, hh * 2);
  c.strokeStyle = us ? '#39462f' : '#3a3a32';
  c.lineWidth = 1.5;
  c.strokeRect(-hw, -hh, hw * 2, hh * 2);
  if (us) {
    // white US star on the hull
    c.strokeStyle = 'rgba(230,230,220,0.85)';
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI / 2 + i * (Math.PI * 4 / 5);
      const px = Math.cos(ang) * 5, py = 8 + Math.sin(ang) * 5;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
    c.stroke();
  }
  if (casemate) {
    c.fillStyle = '#3e3e36';
    c.fillRect(-4, -5, 28, 10);
    c.fillRect(20, -3, 18, 6);
  } else {
    // turret — compensate for hull rotation so barrel stays at world bearing a.turret
    c.rotate(a.turret - hullAng + home);
    c.fillStyle = us ? '#54634a' : (heavy ? '#353530' : '#4c4c43');
    c.fillRect(6, -2.5, heavy ? 28 : 24, heavy ? 6 : 5);          // barrel
    c.beginPath(); c.arc(0, 0, heavy ? 12 : 10, 0, 7); c.fill();
    c.strokeStyle = us ? '#39462f' : '#33332c';
    c.beginPath(); c.arc(0, 0, heavy ? 12 : 10, 0, 7); c.stroke();
  }
  c.restore();

  if (a.hp < a.maxhp) {
    const f = clamp(a.hp / a.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(a.x - 22, a.y - 26, 44, 4);
    ctx.fillStyle = us ? '#7ec850' : '#c0562e';
    ctx.fillRect(a.x - 22, a.y - 26, 44 * f, 4);
  }

  // crew veterancy chevrons
  if (us && a.rank > 0) {
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 1;
    let sx = a.x - (a.rank * 5 - 2) / 2;
    const sy = a.y - 30;
    for (let i = 0; i < a.rank; i++) {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 1.5, sy - 2.5);
      ctx.lineTo(sx + 3, sy);
      ctx.stroke();
      sx += 5;
    }
  }

  if (us && G.selected.includes(a)) {
    drawUnitWeaponRange(a, { alpha: 0.3, bearing: a.turret });
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(a.x, a.y, 30, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    if (G.selected.length === 1) {
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.textAlign = 'center';
      const label = RANKS[a.rank].name + ' ' + a.t.name.toUpperCase() + ' \u2014 ' + a.xp + ' KILLS';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(label, a.x + 1, a.y + 41);
      ctx.fillStyle = '#ffe98a';
      ctx.fillText(label, a.x, a.y + 40);
    }
  }
}

function stampATGunWreck(a) {
  gctx.save();
  gctx.translate(a.x, a.y);
  gctx.rotate(rand(-0.6, 0.6));
  gctx.fillStyle = '#3a4034';
  gctx.beginPath();
  gctx.moveTo(-10, -4); gctx.lineTo(8, -8); gctx.lineTo(10, 2); gctx.lineTo(-8, 4);
  gctx.closePath(); gctx.fill();
  gctx.strokeStyle = '#2a2820';
  gctx.lineWidth = 4;
  gctx.beginPath(); gctx.moveTo(2, 0); gctx.quadraticCurveTo(12, -6, 18, -14); gctx.stroke();
  gctx.fillStyle = '#211f1a';
  gctx.beginPath(); gctx.ellipse(-9, 5, 3.5, 5, 0.3, 0, 7); gctx.fill();
  gctx.beginPath(); gctx.ellipse(9, 4, 3.5, 5, -0.2, 0, 7); gctx.fill();
  gctx.strokeStyle = '#2f3a29';
  gctx.lineWidth = 2.5;
  gctx.beginPath(); gctx.moveTo(-2, 4); gctx.lineTo(-12, 14); gctx.stroke();
  gctx.beginPath(); gctx.moveTo(2, 4); gctx.lineTo(11, 13); gctx.stroke();
  gctx.restore();
}

function stampV2Wreck(a) {
  gctx.save();
  gctx.translate(a.x, a.y);
  gctx.fillStyle = '#2e2c26';
  gctx.fillRect(-22, -10, 44, 22);
  gctx.strokeStyle = '#1c1c16';
  gctx.lineWidth = 1.2;
  gctx.strokeRect(-22, -10, 44, 22);
  // snapped, scorched missile body lying across the wreckage
  gctx.strokeStyle = '#3a3830';
  gctx.lineWidth = 5;
  gctx.beginPath(); gctx.moveTo(-24, 6); gctx.lineTo(20, -8); gctx.stroke();
  gctx.strokeStyle = '#1c1c16';
  gctx.lineWidth = 1.4;
  gctx.beginPath(); gctx.moveTo(-24, 6); gctx.lineTo(20, -8); gctx.stroke();
  gctx.fillStyle = '#211f1a';
  gctx.beginPath(); gctx.arc(-6, 0, 9, 0, 7); gctx.fill();
  gctx.restore();
}

function drawJeepWheel(c, x, y) {
  c.fillStyle = '#26261e';
  c.beginPath(); c.ellipse(x, y, 3.2, 5.8, 0, 0, 7); c.fill();
  c.strokeStyle = '#3a3830';
  c.lineWidth = 1;
  c.stroke();
  c.fillStyle = '#4a4038';
  c.beginPath(); c.arc(x, y, 1.8, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 0.65;
  for (let i = 0; i < 4; i++) {
    const ang = i * Math.PI / 2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(ang) * 1.5, y + Math.sin(ang) * 1.5);
    c.stroke();
  }
}

function drawVehicleHMG(c, gunLen, us) {
  c.fillStyle = '#3a3830';
  c.beginPath(); c.arc(0, 0, 2.8, 0, 7); c.fill();
  c.strokeStyle = '#2a2820';
  c.lineWidth = 1;
  c.stroke();
  c.strokeStyle = '#26261e';
  c.lineWidth = us ? 2.8 : 2.5;
  c.beginPath(); c.moveTo(2.5, 0); c.lineTo(gunLen + 2, 0); c.stroke();
  if (us) {
    c.fillStyle = '#2a2a1e';
    c.fillRect(2.5 + gunLen * 0.22, -3, 8, 4.5);
    c.fillStyle = '#4a4038';
    c.fillRect(gunLen - 0.5, -2.5, 4.5, 5);
    c.strokeStyle = '#3a3830';
    c.lineWidth = 0.8;
    for (let t = 0.28; t <= 0.62; t += 0.12) {
      const sx = 2.5 + gunLen * t;
      c.beginPath(); c.moveTo(sx, -2); c.lineTo(sx, 2); c.stroke();
    }
  } else {
    c.strokeStyle = '#3a3830';
    c.lineWidth = 0.85;
    for (let t = 0.2; t <= 0.72; t += 0.14) {
      const sx = 2.5 + gunLen * t;
      c.beginPath(); c.moveTo(sx, -2.2); c.lineTo(sx, 2.2); c.stroke();
    }
    c.fillStyle = '#3a3828';
    c.beginPath(); c.arc(-2, 1.5, 2.2, 0, 7); c.fill();
  }
  c.fillStyle = '#3a4034';
  c.fillRect(-3.5, 2.8, 5, 3.2);
  c.strokeStyle = '#4a4a3e';
  c.lineWidth = 0.7;
  c.strokeRect(-3.5, 2.8, 5, 3.2);
}

function drawJeepBody(c, color, us) {
  const front = us ? -1 : 1;
  for (const sx of [-1, 1]) {
    c.fillStyle = color;
    c.beginPath(); c.ellipse(sx * 9, front * 9, 3.5, 5.5, 0, 0, 7); c.fill();
    c.strokeStyle = us ? '#39462f' : '#3c3c32';
    c.lineWidth = 0.9;
    c.stroke();
  }
  if (us) {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(-6, front * 12); c.lineTo(6, front * 12);
    c.lineTo(7, front * 4); c.lineTo(-7, front * 4);
    c.closePath(); c.fill();
    c.fillRect(-7, front * 2, 14, 12);
    c.strokeStyle = '#39462f';
    c.lineWidth = 1.2;
    c.stroke();
    c.strokeStyle = '#2e3828';
    c.lineWidth = 0.7;
    for (let i = -2; i <= 2; i++) {
      c.beginPath(); c.moveTo(i * 1.5, front * 11.5); c.lineTo(i * 1.5, front * 9); c.stroke();
    }
    c.fillStyle = 'rgba(20,22,18,0.52)';
    c.fillRect(-5, front * 3 - 1, 10, 2.2);
    c.strokeStyle = '#4a4038';
    c.lineWidth = 0.8;
    c.strokeRect(-5, front * 3 - 1, 10, 2.2);
    c.fillStyle = '#26261e';
    c.beginPath(); c.arc(0, -front * 10, 3.5, 0, 7); c.fill();
    c.strokeStyle = '#3a3830';
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = '#4a4038';
    c.beginPath(); c.arc(0, -front * 10, 1.5, 0, 7); c.fill();
    c.strokeStyle = 'rgba(230,230,220,0.85)';
    c.lineWidth = 0.9;
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI / 2 + i * (Math.PI * 4 / 5);
      const px = Math.cos(ang) * 3.5, py = front * 7 + Math.sin(ang) * 3.5;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath(); c.stroke();
    c.strokeStyle = '#4a4038';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(-8, front * 12.5); c.lineTo(8, front * 12.5); c.stroke();
    c.fillStyle = us ? '#5b6b4a' : '#61615a';
    c.beginPath(); c.arc(-3.5, front * 6, 2.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 0.8;
    c.stroke();
  } else {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(-8, front * 13);
    c.quadraticCurveTo(-9, front * 8, -8, front * 2);
    c.lineTo(-8, -front * 10);
    c.lineTo(8, -front * 10);
    c.lineTo(8, front * 2);
    c.quadraticCurveTo(9, front * 8, 8, front * 13);
    c.closePath(); c.fill();
    c.strokeStyle = '#3c3c32';
    c.lineWidth = 1.2;
    c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.3)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(-8, front * 2); c.lineTo(-8, -front * 6); c.stroke();
    c.beginPath(); c.moveTo(8, front * 2); c.lineTo(8, -front * 6); c.stroke();
    c.strokeStyle = '#4a4a40';
    c.lineWidth = 1.1;
    for (const bx of [-5, 0, 5]) {
      c.beginPath();
      c.moveTo(bx, front * 3);
      c.quadraticCurveTo(bx, front * 0.5, bx + (bx > 0 ? 2 : bx < 0 ? -2 : 0), front * 1);
      c.stroke();
    }
    c.fillStyle = '#3a3a32';
    c.beginPath(); c.arc(0, front * 12, 2.5, 0, 7); c.fill();
    c.fillStyle = '#61615a';
    c.beginPath(); c.arc(-3.5, front * 5, 2.2, 0, 7); c.fill();
    c.beginPath(); c.arc(3.5, front * 5, 2.2, 0, 7); c.fill();
  }
}

function stampJeepWreck(a) {
  gctx.save();
  gctx.translate(a.x, a.y);
  gctx.rotate(rand(-0.5, 0.5));
  gctx.fillStyle = '#33322a';
  gctx.beginPath();
  gctx.moveTo(-8, -10); gctx.lineTo(8, -12); gctx.lineTo(9, 8); gctx.lineTo(-9, 10);
  gctx.closePath(); gctx.fill();
  gctx.strokeStyle = '#26261e';
  gctx.lineWidth = 3;
  gctx.beginPath(); gctx.moveTo(2, 0); gctx.lineTo(14, rand(-4, 4)); gctx.stroke();
  gctx.fillStyle = '#211f1a';
  gctx.beginPath(); gctx.ellipse(-8, -6, 3, 5, 0.2, 0, 7); gctx.fill();
  gctx.beginPath(); gctx.ellipse(8, 6, 3, 5, -0.15, 0, 7); gctx.fill();
  gctx.fillStyle = 'rgba(40,30,20,0.35)';
  gctx.beginPath(); gctx.arc(0, 0, 5, 0, 7); gctx.fill();
  gctx.restore();
}

function drawJeep(a) {
  const us = (a.nation || a.side) === 'us';
  const c = ctx;
  const home = vehicleHomeFace(a);
  const hullAng = vehicleHullAngle(a);
  const hullRot = hullAng - home;
  c.save();
  c.translate(a.x, a.y);

  c.fillStyle = 'rgba(0,0,0,0.28)';
  c.beginPath(); c.ellipse(0, 4, 12, 15, 0, 0, 7); c.fill();

  c.rotate(hullRot);

  for (const [wx, wy] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) {
    drawJeepWheel(c, wx, wy);
  }

  drawJeepBody(c, a.t.color, us);

  c.rotate(a.face - hullAng + home);
  drawVehicleHMG(c, a.t.gun, us);
  c.fillStyle = us ? '#5b6b4a' : '#61615a';
  c.beginPath(); c.ellipse(-5.5, 0, 3.6, 4.8, 0, 0, 7); c.fill();
  c.fillStyle = us ? '#4a5a3f' : '#525244';
  c.beginPath(); c.ellipse(-5.5, 0, 3, 4, 0, 0, 7); c.fill();
  c.beginPath(); c.arc(-5.5, -2.8, 2.9, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = 0.85;
  c.beginPath(); c.arc(-5.5, -2.8, 2.9, 0, 7); c.stroke();
  c.restore();

  if (a.hp < a.maxhp) {
    const f = clamp(a.hp / a.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(a.x - 11, a.y - 19, 22, 3);
    ctx.fillStyle = us ? '#7ec850' : '#c0562e';
    ctx.fillRect(a.x - 11, a.y - 19, 22 * f, 3);
  }

  // crew chevrons / selection for our side
  if (us && a.rank > 0) {
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 1;
    let sx = a.x - (a.rank * 5 - 2) / 2;
    const sy = a.y - 23;
    for (let i = 0; i < a.rank; i++) {
      ctx.beginPath();
      ctx.moveTo(sx, sy); ctx.lineTo(sx + 1.5, sy - 2.5); ctx.lineTo(sx + 3, sy);
      ctx.stroke();
      sx += 5;
    }
  }
  if (us && G.selected.includes(a)) {
    drawUnitWeaponRange(a);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(a.x, a.y, 20, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    if (G.selected.length === 1) {
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.textAlign = 'center';
      const label = RANKS[a.rank].name + ' ' + a.t.name.toUpperCase() + ' \u2014 ' + a.xp + ' KILLS';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(label, a.x + 1, a.y + 31);
      ctx.fillStyle = '#ffe98a';
      ctx.fillText(label, a.x, a.y + 30);
    }
  }
}

function stampHalftrackWreck(a) {
  gctx.save();
  gctx.translate(a.x, a.y);
  gctx.rotate(rand(-0.4, 0.4));
  gctx.fillStyle = '#33322a';
  gctx.fillRect(-10, -17, 20, 34);
  gctx.fillStyle = '#211f1a';
  gctx.beginPath(); gctx.arc(0, -4, 6, 0, 7); gctx.fill();
  gctx.fillRect(-13, -16, 4, 16);
  gctx.fillRect(9, -16, 4, 16);
  gctx.restore();
}

function drawATGun(a) {
  const c = ctx;
  const recoil = a.atgunFireT > 0 ? clamp(a.atgunFireT / 0.16, 0, 1) : 0;
  const kick = recoil * 5;
  c.save();
  c.translate(a.x, a.y);

  c.fillStyle = 'rgba(0,0,0,0.28)';
  c.beginPath(); c.ellipse(0, 5, 18, 11, 0, 0, 7); c.fill();

  c.rotate(a.turret + Math.PI / 2);

  c.strokeStyle = '#3d4a34';
  c.lineWidth = 3.2;
  c.beginPath(); c.moveTo(-2.5, 5); c.lineTo(-13, 18); c.stroke();
  c.beginPath(); c.moveTo(2.5, 5); c.lineTo(13, 18); c.stroke();
  c.strokeStyle = '#2e3828';
  c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(-2, 7); c.lineTo(-11, 17); c.stroke();
  c.beginPath(); c.moveTo(2, 7); c.lineTo(11, 17); c.stroke();
  c.fillStyle = '#2f3a29';
  c.fillRect(-14, 16, 6, 4);
  c.fillRect(8, 16, 6, 4);
  c.strokeStyle = '#243020';
  c.lineWidth = 0.8;
  c.strokeRect(-14, 16, 6, 4);
  c.strokeRect(8, 16, 6, 4);
  c.fillStyle = '#4a4038';
  c.fillRect(-12, 19, 1.2, 3);
  c.fillRect(10, 19, 1.2, 3);

  for (const wx of [-10, 10]) {
    c.fillStyle = '#26261e';
    c.beginPath(); c.ellipse(wx, 2, 3.5, 5.5, 0, 0, 7); c.fill();
    c.strokeStyle = '#3a3830';
    c.lineWidth = 1.1;
    c.stroke();
    c.fillStyle = '#4a4038';
    c.beginPath(); c.arc(wx, 2, 2, 0, 7); c.fill();
    c.strokeStyle = '#2a2820';
    c.lineWidth = 0.7;
    for (let i = 0; i < 6; i++) {
      const ang = i * Math.PI / 3;
      c.beginPath();
      c.moveTo(wx, 2);
      c.lineTo(wx + Math.cos(ang) * 2, 2 + Math.sin(ang) * 2);
      c.stroke();
    }
  }

  c.fillStyle = '#5a4a38';
  c.fillRect(8, 6, 6, 4.5);
  c.strokeStyle = '#3a3028';
  c.lineWidth = 0.7;
  c.strokeRect(8, 6, 6, 4.5);
  c.fillStyle = '#c8a858';
  c.fillRect(9.2, 7.2, 1.4, 2.2);
  c.fillRect(11.2, 7.2, 1.4, 2.2);
  c.fillStyle = '#ffd94a';
  c.fillRect(9.5, 8.5, 3.2, 0.9);

  c.fillStyle = a.t.color;
  c.fillRect(-5, 0, 10, 9);
  c.strokeStyle = '#39462f';
  c.lineWidth = 1;
  c.strokeRect(-5, 0, 10, 9);
  c.fillStyle = '#3a4832';
  c.beginPath(); c.arc(0, 4, 2.8, 0, 7); c.fill();

  c.fillStyle = '#54634a';
  c.strokeStyle = '#39462f';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(-12, 0);
  c.lineTo(-4, -7 + kick * 0.3);
  c.lineTo(4, -7 + kick * 0.3);
  c.lineTo(12, 0);
  c.lineTo(12, 3);
  c.lineTo(-12, 3);
  c.closePath();
  c.fill(); c.stroke();
  c.fillStyle = '#ffd94a';
  c.fillRect(-2, -4 + kick * 0.3, 4, 1.2);
  c.fillStyle = 'rgba(30,36,22,0.35)';
  for (const [rx, ry] of [[-8, 0.5], [0, -2], [8, 0.5], [-4, 1.5], [4, 1.5]]) {
    c.beginPath(); c.arc(rx, ry + kick * 0.3, 0.55, 0, 7); c.fill();
  }

  const bTop = -24 + kick;
  c.fillStyle = '#3a3830';
  c.fillRect(-2, bTop, 4, 20);
  c.strokeStyle = '#26261e';
  c.lineWidth = 0.8;
  c.strokeRect(-2, bTop, 4, 20);
  c.fillStyle = '#4c5a42';
  c.fillRect(-3, bTop - 1, 6, 4);
  c.fillStyle = '#2a2820';
  c.beginPath(); c.arc(0, bTop + 3, 2.2, 0, 7); c.fill();
  c.fillStyle = '#4a4038';
  c.fillRect(-2.5, bTop - 4, 5, 3.5);
  c.strokeStyle = '#3a3830';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(-2.8, bTop - 2); c.lineTo(-2.8, bTop - 5);
  c.moveTo(2.8, bTop - 2); c.lineTo(2.8, bTop - 5);
  c.stroke();
  if (recoil > 0.2) {
    c.shadowColor = '#ff9040';
    c.shadowBlur = 8;
    c.fillStyle = `rgba(255,200,120,${recoil * 0.85})`;
    c.beginPath(); c.arc(0, bTop - 3, 3.5 * recoil, 0, 7); c.fill();
    c.shadowBlur = 0;
  }

  c.restore();

  const bx = a.x - Math.cos(a.turret) * 12;
  const by = a.y - Math.sin(a.turret) * 12;
  const fx = Math.cos(a.turret), fy = Math.sin(a.turret);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(bx + 1, by + 3, 5, 2.5, a.turret, 0, 7); ctx.fill();
  ctx.fillStyle = a.t.color;
  ctx.beginPath(); ctx.ellipse(bx, by, 4.2, 5.2, a.turret, 0, 7); ctx.fill();
  ctx.strokeStyle = '#4a4a3e';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + fx * 7, by + fy * 7);
  ctx.stroke();
  ctx.fillStyle = '#5b6b4a';
  ctx.beginPath(); ctx.arc(bx - fy * 2.5, by + fx * 2.5 - 1, 3.4, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.arc(bx - fy * 2.5, by + fx * 2.5 - 1, 3.4, 0, 7); ctx.stroke();

  if (a.hp < a.maxhp) {
    const f = clamp(a.hp / a.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(a.x - 14, a.y - 24, 28, 3.5);
    ctx.fillStyle = '#7ec850';
    ctx.fillRect(a.x - 14, a.y - 24, 28 * f, 3.5);
  }

  // crew veterancy chevrons
  if (a.rank > 0) {
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 1;
    let sx = a.x - (a.rank * 5 - 2) / 2;
    const sy = a.y - 28;
    for (let i = 0; i < a.rank; i++) {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 1.5, sy - 2.5);
      ctx.lineTo(sx + 3, sy);
      ctx.stroke();
      sx += 5;
    }
  }

  if (G.selected.includes(a)) {
    drawUnitWeaponRange(a, { alpha: 0.3 });
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(a.x, a.y, 22, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    if (G.selected.length === 1) {
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.textAlign = 'center';
      const label = RANKS[a.rank].name + ' ' + a.t.name.toUpperCase() + ' \u2014 ' + a.xp + ' KILLS';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(label, a.x + 1, a.y + 35);
      ctx.fillStyle = '#ffe98a';
      ctx.fillText(label, a.x, a.y + 34);
    }
  }
}

// Meillerwagen-style erector trailer: a flatbed truck (cab, chassis, six
// wheels) with the A20 raised upright on its cradle at the back — dark olive
// body, red/white recognition checker under the nose, four tail fins. During
// the ~1.1s launch window the missile itself vanishes into an ignition glow.
function drawV2Launcher(a) {
  const c = ctx;
  const fireT = a.v2FireT || 0;
  const launching = fireT > 0.55;
  c.save();
  c.translate(a.x, a.y);

  c.fillStyle = 'rgba(0,0,0,0.32)';
  c.beginPath(); c.ellipse(0, 14, 26, 16, 0, 0, 7); c.fill();

  // truck wheels — three pairs down the chassis
  c.fillStyle = '#201f1a';
  for (const wy of [-16, 4, 20]) {
    c.beginPath(); c.ellipse(-11, wy, 4, 5.5, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(11, wy, 4, 5.5, 0, 0, 7); c.fill();
  }
  c.fillStyle = '#3a3830';
  for (const wy of [-16, 4, 20]) {
    c.beginPath(); c.arc(-11, wy, 1.8, 0, 7); c.fill();
    c.beginPath(); c.arc(11, wy, 1.8, 0, 7); c.fill();
  }

  // flatbed chassis
  c.fillStyle = '#3a3a30';
  c.fillRect(-9, -6, 18, 32);
  c.strokeStyle = '#20201a';
  c.lineWidth = 1.2;
  c.strokeRect(-9, -6, 18, 32);
  // cradle bracing the missile against the bed
  c.strokeStyle = '#26261e';
  c.lineWidth = 2.2;
  c.beginPath(); c.moveTo(-7, 20); c.lineTo(-5, -30); c.stroke();
  c.beginPath(); c.moveTo(7, 20); c.lineTo(5, -30); c.stroke();

  // cab up front, ahead of the bed
  c.fillStyle = a.t.color;
  c.fillRect(-8, -22, 16, 17);
  c.strokeStyle = '#2a2a22';
  c.lineWidth = 1;
  c.strokeRect(-8, -22, 16, 17);
  c.fillStyle = 'rgba(150,170,180,0.55)';
  c.fillRect(-6, -19, 12, 5);
  c.fillStyle = '#242018';
  c.fillRect(-8, -7, 16, 2.5);

  if (!launching) {
    const bodyTop = -58, bodyBot = 20, bw = 6.4;
    c.fillStyle = a.t.color;
    c.fillRect(-bw, bodyTop + 8, bw * 2, bodyBot - bodyTop - 8);
    c.strokeStyle = '#1c1c16';
    c.lineWidth = 1;
    c.strokeRect(-bw, bodyTop + 8, bw * 2, bodyBot - bodyTop - 8);
    // recognition checker band
    c.fillStyle = '#8a2a20';
    c.fillRect(-bw, bodyTop + 8, bw, 7);
    c.fillRect(0, bodyTop + 15, bw, 7);
    c.fillStyle = '#d8d0c0';
    c.fillRect(0, bodyTop + 8, bw, 7);
    c.fillRect(-bw, bodyTop + 15, bw, 7);
    // nose cone
    c.fillStyle = '#2a2a22';
    c.beginPath();
    c.moveTo(-bw, bodyTop + 8);
    c.lineTo(0, bodyTop - 10);
    c.lineTo(bw, bodyTop + 8);
    c.closePath();
    c.fill();
    c.stroke();
    // tail fins, resting just above the cradle base
    c.fillStyle = '#242420';
    c.beginPath(); c.moveTo(-bw, bodyBot - 6); c.lineTo(-bw - 8, bodyBot + 2); c.lineTo(-bw, bodyBot - 2); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(bw, bodyBot - 6); c.lineTo(bw + 8, bodyBot + 2); c.lineTo(bw, bodyBot - 2); c.closePath(); c.fill();
  }

  // ignition glow through the launch window
  if (fireT > 0) {
    const a2 = clamp(fireT / 1.1, 0, 1);
    c.shadowColor = '#ff9040';
    c.shadowBlur = 16;
    c.fillStyle = `rgba(255,200,110,${0.85 * a2})`;
    c.beginPath(); c.arc(0, 18, 6 + a2 * 10, 0, 7); c.fill();
    c.fillStyle = `rgba(255,120,40,${0.5 * a2})`;
    c.beginPath(); c.arc(0, 18, 12 + a2 * 16, 0, 7); c.fill();
    c.shadowBlur = 0;
  }

  c.restore();

  if (a.hp < a.maxhp) {
    const f = clamp(a.hp / a.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(a.x - 24, a.y - 72, 48, 4.5);
    ctx.fillStyle = f > 0.5 ? '#c0562e' : '#8a2a20';
    ctx.fillRect(a.x - 24, a.y - 72, 48 * f, 4.5);
  }
}

// the V2 warhead in flight: climbs away from the battery, arcs over, then
// dives on the target — visibly closing the distance the whole time instead
// of just teleporting a warning reticle onto the impact point
function drawV2RocketInFlight(s) {
  const c = ctx;
  const f = clamp(1 - s.timer / s.dur, 0, 1);
  const gx = s.sx + (s.x - s.sx) * f, gy = s.sy + (s.y - s.sy) * f;
  const vertPhase = Math.cos(f * Math.PI);      // +1 climbing off the pad, 0 at apex, -1 diving in
  const alt = Math.sin(f * Math.PI) * V2_ROCKET_ARC;
  const rx = gx, ry = gy - alt;
  const groundAngle = Math.atan2(s.y - s.sy, s.x - s.sx);
  const nose = groundAngle - vertPhase * 0.8;

  // ground shadow tracks straight beneath it, sharpest at launch and impact
  c.fillStyle = `rgba(0,0,0,${0.05 + (1 - alt / V2_ROCKET_ARC) * 0.12})`;
  c.beginPath(); c.ellipse(gx, gy, 3 + (1 - alt / V2_ROCKET_ARC) * 3, 2, 0, 0, 7); c.fill();

  c.save();
  c.translate(rx, ry);
  c.rotate(nose);

  // exhaust flame trailing the tail
  c.shadowColor = '#ff9040';
  c.shadowBlur = 8;
  c.fillStyle = 'rgba(255,160,70,0.85)';
  c.beginPath(); c.moveTo(-6.5, -2); c.lineTo(-12 - Math.random() * 4, 0); c.lineTo(-6.5, 2); c.closePath(); c.fill();
  c.shadowBlur = 0;

  // body, nose cone, fins — same palette as the launcher's payload
  c.fillStyle = '#3a3a30';
  c.fillRect(-6.5, -2, 11, 4);
  c.fillStyle = '#8a2a20';
  c.fillRect(-1, -2, 3, 1.6);
  c.fillStyle = '#d8d0c0';
  c.fillRect(-1, 0.4, 3, 1.6);
  c.fillStyle = '#2a2a22';
  c.beginPath(); c.moveTo(4.5, -2); c.lineTo(9.5, 0); c.lineTo(4.5, 2); c.closePath(); c.fill();
  c.fillStyle = '#242420';
  c.beginPath(); c.moveTo(-6.5, -2); c.lineTo(-10.5, -4.5); c.lineTo(-6.5, -0.8); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-6.5, 2); c.lineTo(-10.5, 4.5); c.lineTo(-6.5, 0.8); c.closePath(); c.fill();

  c.restore();
}

function drawHalftrack(e) {
  const c = ctx;
  c.save();
  c.translate(e.x, e.y);

  // shadow
  c.fillStyle = 'rgba(0,0,0,0.28)';
  c.beginPath(); c.ellipse(0, 4, 14, 19, 0, 0, 7); c.fill();

  // rear tracks (the back half) and front wheels — it drives downfield
  c.fillStyle = '#2f2f28';
  c.fillRect(-12, -16, 5, 18);
  c.fillRect(7, -16, 5, 18);
  c.fillStyle = '#26251f';
  c.fillRect(-11, 8, 4, 7);
  c.fillRect(7, 8, 4, 7);

  // angular armored hull, tapering toward the nose
  c.fillStyle = e.t.color;
  c.beginPath();
  c.moveTo(-9, -17); c.lineTo(9, -17);
  c.lineTo(10, 4); c.lineTo(6, 16); c.lineTo(-6, 16); c.lineTo(-10, 4);
  c.closePath(); c.fill();
  c.strokeStyle = '#3a3a32';
  c.lineWidth = 1.2;
  c.stroke();
  // engine deck seam at the nose
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.moveTo(-8, 7); c.lineTo(8, 7); c.stroke();

  // open troop bay; helmets visible until the squad piles out
  c.fillStyle = '#3c3c33';
  c.fillRect(-7, -15, 14, 16);
  if (!e.unloaded) {
    c.fillStyle = '#61615a';
    for (const [hx, hy] of [[-3.5, -11], [3.5, -11], [-3.5, -5], [3.5, -5], [0, -8]]) {
      c.beginPath(); c.arc(hx, hy, 2.4, 0, 7); c.fill();
    }
  }

  // bow MG and gunner
  c.rotate(e.face);
  c.strokeStyle = '#1c1c16';
  c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(4, 0); c.lineTo(e.t.gun + 4, 0); c.stroke();
  c.rotate(-e.face);
  c.fillStyle = '#61615a';
  c.beginPath(); c.arc(0, 2.5, 2.8, 0, 7); c.fill();
  c.restore();

  if (e.hp < e.maxhp) {
    const f = clamp(e.hp / e.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - 14, e.y - 24, 28, 3.5);
    ctx.fillStyle = '#c0562e';
    ctx.fillRect(e.x - 14, e.y - 24, 28 * f, 3.5);
  }
}

function drawLandingCraft(c) {
  const ctx2 = ctx;
  ctx2.save();
  ctx2.translate(c.x, c.y);
  // shadow
  ctx2.fillStyle = 'rgba(0,0,0,0.22)';
  ctx2.beginPath(); ctx2.ellipse(0, 4, c.w / 2 - 4, c.h / 2 - 2, 0, 0, 7); ctx2.fill();
  // hull
  ctx2.fillStyle = '#5a5e52';
  ctx2.beginPath();
  ctx2.moveTo(-c.w / 2 + 4, -c.h / 2 + 2);
  ctx2.lineTo(c.w / 2 - 4, -c.h / 2 + 2);
  ctx2.lineTo(c.w / 2 - 2, c.h / 2 - 4);
  ctx2.lineTo(0, c.h / 2 + 2);
  ctx2.lineTo(-c.w / 2 + 2, c.h / 2 - 4);
  ctx2.closePath();
  ctx2.fill();
  ctx2.strokeStyle = '#3a3e36';
  ctx2.lineWidth = 1.2;
  ctx2.stroke();
  // deck well
  ctx2.fillStyle = '#6a6e60';
  ctx2.fillRect(-c.w / 2 + 10, -c.h / 2 + 6, c.w - 20, c.h - 16);
  // ramp (closed when waiting/approach; drops during ramp/done)
  const rampOpen = c.state === 'ramp' ? c.rampT : (c.state === 'done' ? 1 : 0);
  ctx2.save();
  ctx2.translate(0, c.h / 2 - 2);
  ctx2.rotate(rampOpen * 1.15);
  ctx2.fillStyle = '#7a7e70';
  ctx2.fillRect(-14, 0, 28, 16);
  ctx2.strokeStyle = '#4a4e46';
  ctx2.strokeRect(-14, 0, 28, 16);
  ctx2.restore();
  // bow gunwales
  ctx2.fillStyle = '#4a4e46';
  ctx2.fillRect(-c.w / 2 + 6, -c.h / 2 + 4, 4, c.h - 12);
  ctx2.fillRect(c.w / 2 - 10, -c.h / 2 + 4, 4, c.h - 12);
  ctx2.restore();
}

function drawBike(e) {
  const c = ctx;
  const lean = Math.sin(e.y * 0.02) * 0.12; // matches the weave
  c.save();
  c.translate(e.x, e.y);
  c.rotate(lean);
  // shadow
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath(); c.ellipse(1, 3, 10, 7, 0, 0, 7); c.fill();
  // wheels
  c.fillStyle = '#26251f';
  c.fillRect(-5.5, -11, 5, 4);
  c.fillRect(-5.5, 7, 5, 4);
  c.fillRect(3.5, 4, 5, 3);
  // frame and sidecar
  c.fillStyle = e.t.color;
  c.fillRect(-5, -10, 4, 20);
  c.fillRect(3, -5, 6, 11);
  c.strokeStyle = '#3a3a30';
  c.lineWidth = 1;
  c.strokeRect(3, -5, 6, 11);
  // rider and passenger helmets
  c.fillStyle = '#61615a';
  c.beginPath(); c.arc(-3, -1, 3, 0, 7); c.fill();
  c.beginPath(); c.arc(6, -1, 2.6, 0, 7); c.fill();
  c.restore();

  if (e.hp < e.maxhp) {
    const f = clamp(e.hp / e.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - 10, e.y - 17, 20, 3);
    ctx.fillStyle = '#c0562e';
    ctx.fillRect(e.x - 10, e.y - 17, 20 * f, 3);
  }
}

function drawWire(wr) {
  ctx.save();
  ctx.translate(wr.x, wr.y);
  ctx.strokeStyle = '#4b4438';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-34, 5); ctx.lineTo(-30, -7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(34, 5); ctx.lineTo(30, -7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, -7); ctx.stroke();
  ctx.strokeStyle = 'rgba(60,58,50,0.9)';
  ctx.lineWidth = 1;
  // fortified wire carries an extra strand
  const strands = wr.up ? [-8, -5, -1, 3] : [-5, -1, 3];
  for (const yy of strands) {
    ctx.beginPath();
    ctx.moveTo(-32, yy);
    for (let x = -32; x <= 32; x += 4) ctx.lineTo(x, yy + ((x / 4) % 2 ? 1.6 : -1.6));
    ctx.stroke();
  }
  ctx.restore();
}

function drawSandbag(s) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(0, 4, 24, 9, 0, 0, 7); ctx.fill();
  // fortified bags get a third row on top
  const rows = s.up ? 3 : 2;
  for (let r = 0; r < rows; r++) {
    for (let i = -1.5; i <= 1.5; i++) {
      ctx.fillStyle = r ? '#9a8a5e' : '#8a7a50';
      ctx.strokeStyle = '#6e6040';
      ctx.lineWidth = 1;
      const bx = i * 12 + (r % 2 ? 6 : 0), by = -r * 6;
      if (Math.abs(bx) > 20 || (r === 2 && Math.abs(bx) > 14)) continue;
      ctx.beginPath();
      ctx.ellipse(bx, by, 7, 4, 0, 0, 7);
      ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawDecorSandbag(cx, cy, rx, ry) {
  ctx.fillStyle = '#8a7a50';
  ctx.strokeStyle = '#6e6040';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, 7);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90,78,48,0.55)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.55, cy);
  ctx.lineTo(cx + rx * 0.55, cy);
  ctx.stroke();
}

function drawBunker(b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  if (b.up) {
    // breastwork bags sit in front; bunker draws on top
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.beginPath(); ctx.ellipse(0, -16, 14, 4, 0, 0, 7); ctx.fill();
    drawDecorSandbag(-9, -15, 7, 4);
    drawDecorSandbag(9, -15, 7, 4);
  }
  // drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 5, 30, 11, 0, 0, 7); ctx.fill();
  // concrete slab body
  ctx.fillStyle = b.up ? '#8d8b80' : '#7f7d72';
  ctx.strokeStyle = '#4e4c44';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-28, 8);
  ctx.lineTo(-28, -6);
  ctx.quadraticCurveTo(-28, -14, -18, -14);
  ctx.lineTo(18, -14);
  ctx.quadraticCurveTo(28, -14, 28, -6);
  ctx.lineTo(28, 8);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // roof highlight
  ctx.fillStyle = b.up ? '#a09e92' : '#93917f';
  ctx.beginPath();
  ctx.moveTo(-24, -2);
  ctx.lineTo(-24, -6);
  ctx.quadraticCurveTo(-24, -11, -17, -11);
  ctx.lineTo(17, -11);
  ctx.quadraticCurveTo(24, -11, 24, -6);
  ctx.lineTo(24, -2);
  ctx.closePath();
  ctx.fill();
  // firing slit facing the German line
  ctx.fillStyle = '#1e1c16';
  ctx.fillRect(-16, -9, 32, 4);
  // fortified bunkers get steel plating over the slit corners
  if (b.up) {
    ctx.fillStyle = '#5a5850';
    ctx.fillRect(-20, -10, 5, 6);
    ctx.fillRect(15, -10, 5, 6);
  }
  // battle damage: cracks appear as the concrete wears down
  const f = b.hp / b.maxhp;
  if (f < 0.66) {
    ctx.strokeStyle = 'rgba(30,28,22,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-12, -14); ctx.lineTo(-8, -4); ctx.lineTo(-11, 4); ctx.stroke();
  }
  if (f < 0.33) {
    ctx.strokeStyle = 'rgba(30,28,22,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(14, -14); ctx.lineTo(10, -2); ctx.lineTo(16, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-18, 2); ctx.stroke();
  }
  ctx.restore();
}

function drawMine(m) {
  ctx.fillStyle = '#38352a';
  ctx.beginPath(); ctx.arc(m.x, m.y, 5, 0, 7); ctx.fill();
  ctx.fillStyle = '#565040';
  ctx.beginPath(); ctx.arc(m.x, m.y, 2, 0, 7); ctx.fill();
}

function drawWatchtower(t) {
  ctx.save();
  ctx.translate(t.x, t.y);
  // drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 3, 15, 13, 0, 0, 7); ctx.fill();
  // four corner legs peeking out from under the platform, seen from above
  ctx.fillStyle = '#4a3c26';
  for (const [lx, ly] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
    ctx.beginPath(); ctx.arc(lx, ly, 2.6, 0, 7); ctx.fill();
  }
  // cross-bracing
  ctx.strokeStyle = '#4a3c26';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-12, -12); ctx.lineTo(12, 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12, -12); ctx.lineTo(-12, 12); ctx.stroke();
  // fortified towers get a braced perimeter
  if (t.up) {
    ctx.strokeStyle = '#6b5636';
    ctx.lineWidth = 2;
    ctx.strokeRect(-12, -12, 24, 24);
  }
  // square lookout platform roof, viewed straight down
  ctx.fillStyle = '#6b5636';
  ctx.strokeStyle = '#3d3220';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.rect(-9, -9, 18, 18); ctx.fill(); ctx.stroke();
  // roof ridge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-9, -9); ctx.lineTo(9, 9); ctx.stroke();
  // lookout figure, seen from above
  ctx.fillStyle = '#3a3428';
  ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, 7); ctx.fill();
  // battle damage: the frame splinters as it takes hits
  const f = t.hp / t.maxhp;
  if (f < 0.66) {
    ctx.strokeStyle = 'rgba(30,24,14,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-2, 3); ctx.stroke();
  }
  if (f < 0.33) {
    ctx.strokeStyle = 'rgba(30,24,14,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(3, 6); ctx.stroke();
  }
  ctx.restore();
}

function drawCamoNest(cn) {
  ctx.save();
  ctx.translate(cn.x, cn.y);
  // drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(0, 5, 30, 11, 0, 0, 7); ctx.fill();
  // dug-in earthwork, same footprint as the bunker slab
  ctx.fillStyle = '#4a5138';
  ctx.strokeStyle = '#33392a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-28, 8);
  ctx.lineTo(-28, -6);
  ctx.quadraticCurveTo(-28, -14, -18, -14);
  ctx.lineTo(18, -14);
  ctx.quadraticCurveTo(28, -14, 28, -6);
  ctx.lineTo(28, 8);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // scrim netting lattice over the top
  ctx.strokeStyle = 'rgba(60,68,42,0.7)';
  ctx.lineWidth = 1;
  for (let i = -20; i <= 20; i += 8) {
    ctx.beginPath(); ctx.moveTo(i, -13); ctx.lineTo(i + 10, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, 7); ctx.lineTo(i + 10, -13); ctx.stroke();
  }
  // foliage tufts break up the outline
  ctx.fillStyle = '#5c6b42';
  for (const [fx, fy, fr] of [[-20, -12, 5], [-4, -15, 6], [12, -13, 5], [22, -8, 4], [-24, 2, 4], [24, 3, 4]]) {
    ctx.beginPath(); ctx.arc(fx, fy, fr, 0, 7); ctx.fill();
  }
  // fortified nests dig in deeper: a denser net weave and thicker brush
  if (cn.up) {
    ctx.strokeStyle = 'rgba(40,48,28,0.75)';
    ctx.lineWidth = 1;
    for (let i = -22; i <= 22; i += 5) {
      ctx.beginPath(); ctx.moveTo(i, -13); ctx.lineTo(i + 6, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i, 7); ctx.lineTo(i + 6, -13); ctx.stroke();
    }
    ctx.fillStyle = '#465a34';
    for (const [fx, fy, fr] of [[-14, -16, 5], [4, -17, 5], [18, -14, 4], [-26, -4, 4], [26, -3, 4]]) {
      ctx.beginPath(); ctx.arc(fx, fy, fr, 0, 7); ctx.fill();
    }
  }
  // firing slit, screened by brush
  ctx.fillStyle = '#161810';
  ctx.fillRect(-16, -9, 32, 4);
  // battle damage: the earthworks crack and the brush burns off
  const f = cn.hp / cn.maxhp;
  if (f < 0.66) {
    ctx.strokeStyle = 'rgba(20,18,12,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-12, -14); ctx.lineTo(-8, -4); ctx.lineTo(-11, 4); ctx.stroke();
  }
  if (f < 0.33) {
    ctx.strokeStyle = 'rgba(20,18,12,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(14, -14); ctx.lineTo(10, -2); ctx.lineTo(16, 6); ctx.stroke();
  }
  ctx.restore();
}

function drawDefenses() {
  for (const wr of G.wires) drawWire(wr);
  for (const s of G.sandbags) drawSandbag(s);
  for (const b of G.bunkers) drawBunker(b);
  for (const t of G.watchtowers) drawWatchtower(t);
  for (const cn of G.camoNests) drawCamoNest(cn);
  for (const m of G.mines) drawMine(m);
}

function draw() {
  ctx.save();
  if (mobileViewActive()) {
    const s = viewScale();
    ctx.scale(s, s);
    ctx.translate(-viewCam.x, -viewCam.y);
  }
  ctx.drawImage(groundCanvas, 0, 0);
  for (const m of G.groundMarks) drawGroundMark(m, ctx);

  drawForwardLine();

  for (const cp of G.corpses) drawCorpse(cp);

  drawDefenses();

  if (G.landingCraft && G.landingCraft.length) {
    for (const craft of G.landingCraft) drawLandingCraft(craft);
  }

  // shell target markers
  for (const s of G.shells) {
    if (s.kind === 'v2') {
      if (s.sx != null) drawV2RocketInFlight(s);
      // a much bigger, angrier telegraph for the V2's warhead — long flight
      // time means the player has a real chance to clear vehicles off the mark
      const pulse = 16 + Math.sin(G.time * 6) * 6;
      ctx.strokeStyle = 'rgba(255,40,20,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, pulse, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(s.x, s.y, pulse * 0.55, 0, 7); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s.x - pulse - 7, s.y); ctx.lineTo(s.x + pulse + 7, s.y);
      ctx.moveTo(s.x, s.y - pulse - 7); ctx.lineTo(s.x, s.y + pulse + 7);
      ctx.stroke();
      ctx.font = 'bold 9px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,60,40,0.85)';
      ctx.fillText('INCOMING', s.x, s.y - pulse - 9);
    } else {
      ctx.strokeStyle = 'rgba(200,60,40,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(s.x, s.y, 6 + Math.sin(G.time * 10) * 2, 0, 7); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s.x - 9, s.y); ctx.lineTo(s.x + 9, s.y);
      ctx.moveTo(s.x, s.y - 9); ctx.lineTo(s.x, s.y + 9);
      ctx.stroke();
    }
  }

  // rockets in flight
  for (const r of G.rockets) {
    const ang = Math.atan2(r.ty - r.sy, r.tx - r.sx);
    ctx.strokeStyle = '#2e2c24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(r.x - Math.cos(ang) * 5, r.y - Math.sin(ang) * 5);
    ctx.lineTo(r.x + Math.cos(ang) * 5, r.y + Math.sin(ang) * 5);
    ctx.stroke();
    ctx.fillStyle = '#ffca5a';
    ctx.beginPath();
    ctx.arc(r.x - Math.cos(ang) * 6, r.y - Math.sin(ang) * 6, 2, 0, 7);
    ctx.fill();
  }

  // grenades in flight (arc via fake height), then resting on the ground
  for (const g of G.grenades) {
    if (g.landed) {
      drawGrenadeProjectile(g, g.tx, g.ty);
    } else {
      const f = g.t / g.dur;
      const x = g.sx + (g.tx - g.sx) * f;
      const y = g.sy + (g.ty - g.sy) * f - Math.sin(f * Math.PI) * 34;
      drawGrenadeProjectile(g, x, y);
    }
  }

  for (const e of G.enemies) {
    if (e.chute > 0) drawParatrooper(e);
    else if (e.t.tank) drawTank(e);
    else if (e.t.bike) drawBike(e);
    else if (e.t.apc) drawHalftrack(e);
    else if (e.t.vehicle) drawJeep(e);
    else if (e.t.v2) drawV2Launcher(e);
    else drawSoldier(e);
  }
  for (const u of G.units) {
    const hidden = isCamouflaged(u);
    if (hidden) { ctx.save(); ctx.globalAlpha *= 0.4; }
    if (u.t.tank) drawTank(u);
    else if (u.t.atgun) drawATGun(u);
    else if (u.t.vehicle) drawJeep(u);
    else drawSoldier(u);
    if (hidden) ctx.restore();
  }

  for (const e of G.enemies) {
    if (!e.dead && e.t.flame && e.flameT > 0) drawFlameStream(e);
  }
  for (const u of G.units) {
    if (!u.dead && u.t.flame && u.flameT > 0) drawFlameStream(u);
  }
  for (const u of G.units) {
    if (!u.dead && u.t.shotgun && u.shotgunBlastT > 0) drawShotgunBlast(u);
  }

  // tracers
  ctx.lineWidth = 1.2;
  for (const tr of G.tracers) {
    if (tr.kind === 'buckshot') {
      ctx.strokeStyle = 'rgba(220,200,150,0.75)';
      ctx.lineWidth = 2.2;
    } else if (tr.fromBar) {
      ctx.strokeStyle = 'rgba(255,230,160,0.85)';
      ctx.lineWidth = 1.6;
    } else {
      ctx.strokeStyle = 'rgba(255,235,170,0.8)';
      ctx.lineWidth = 1.2;
    }
    ctx.beginPath(); ctx.moveTo(tr.x1, tr.y1); ctx.lineTo(tr.x2, tr.y2); ctx.stroke();
  }

  // particles
  for (const p of G.particles) {
    if (p.kind === 'flame') {
      const life = p.maxTtl ? p.ttl / p.maxTtl : clamp(p.ttl / 0.3, 0, 1);
      const r = p.size * (0.75 + (1 - life) * 0.45);
      ctx.globalAlpha = life * (p.glow || 0.85);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, '#fff8c8');
      g.addColorStop(0.4, p.color);
      g.addColorStop(1, 'rgba(40,18,8,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
    } else if (p.kind === 'smoke') {
      const life = p.maxTtl ? p.ttl / p.maxTtl : clamp(p.ttl / 0.15, 0, 1);
      ctx.globalAlpha = life * 0.65;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.1 - life * 0.3), 0, 7); ctx.fill();
    } else {
      ctx.globalAlpha = 1;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
  ctx.globalAlpha = 1;

  // explosion flashes
  for (const f of G.flashes) {
    const a = f.ttl / f.max;
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = '#fff0b4';
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.35, 0, 7); ctx.fill();
    ctx.globalAlpha = a * 0.55;
    ctx.fillStyle = '#ff8c28';
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.7, 0, 7); ctx.fill();
    ctx.globalAlpha = a * 0.25;
    ctx.fillStyle = '#ff5014';
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // aircraft overhead, above every ground effect
  for (const p of G.planes) drawPlane(p);

  // floating notices
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.textAlign = 'center';
  for (const tx of G.texts) {
    const a = clamp(tx.ttl / 0.5, 0, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.75 * a})`;
    ctx.fillText(tx.text, tx.x + 1, tx.y + 1);
    ctx.fillStyle = `rgba(255,217,74,${a})`;
    ctx.fillText(tx.text, tx.x, tx.y);
  }

  // fog overlay
  if (G.fog > 0) {
    const a = clamp(G.fog / 4, 0, 1) * 0.35;
    ctx.fillStyle = `rgba(190,195,185,${a})`;
    ctx.fillRect(0, 0, W, H);
  }

  drawMoveDestinations();
  drawMoveRestrictedZone();
  drawMoveCursorPreview();
  drawPlacementGhost();
  drawDragBox();
  ctx.restore();
}

function drawDragBox() {
  if (!drag || !drag.active) return;
  const x = Math.min(drag.x0, drag.x1), y = Math.min(drag.y0, drag.y1);
  const w = Math.abs(drag.x1 - drag.x0), h = Math.abs(drag.y1 - drag.y0);
  ctx.fillStyle = 'rgba(180,220,140,0.10)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(220,240,190,0.85)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
}

function drawForwardLine() {
  if (!showForwardLine()) return;
  const y = FORWARD_Y;
  ctx.strokeStyle = 'rgba(110,100,75,0.55)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(W, y);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let x = 18; x < W; x += 36) {
    const off = ((x / 36) | 0) % 2 ? -2 : 2;
    const sy = y + off;
    ctx.fillStyle = 'rgba(90,72,48,0.85)';
    ctx.fillRect(x - 1, sy - 5, 2, 6);
    ctx.fillStyle = 'rgba(74,58,38,0.9)';
    ctx.fillRect(x - 3, sy - 6, 6, 2);
  }
  ctx.font = '9px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText('FORWARD LINE', 10, y - 6);
  ctx.fillStyle = 'rgba(200,190,150,0.55)';
  ctx.fillText('FORWARD LINE', 9, y - 7);
}

// red tint for zones where move orders cannot be issued (matches placement ghost style)
function drawMoveRestrictedZone() {
  if (!G || !G.selected.length || placing || isAssaultMode()) return;
  if (!G.selected.some(u => !u.t.fixed)) return;

  const minY = moveOrderMinY();
  const maxY = H - 14;
  ctx.fillStyle = 'rgba(200,50,40,0.12)';
  if (minY > 0) ctx.fillRect(0, 0, W, minY);
  ctx.fillRect(0, maxY, W, H - maxY);
  ctx.fillRect(0, minY, 16, maxY - minY);
  ctx.fillRect(W - 16, minY, 16, maxY - minY);
}

function drawMoveDestinations() {
  if (!G || isAssaultMode()) return;
  for (const u of commandRoster()) {
    if (u.dead || !u.moveTo) continue;
    const dest = u.moveTo;
    const pulse = 0.35 + Math.sin(G.time * 3) * 0.12;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = 'rgba(180,220,255,0.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(dest.x, dest.y, 10, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(180,220,255,0.08)';
    ctx.beginPath(); ctx.arc(dest.x, dest.y, 10, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawMoveCursorPreview() {
  if (!G || !G.selected.length || placing || !mouse.inside || isAssaultMode()) return;
  if (!canReceiveMoveOrders()) return;
  const x = mouse.x, y = mouse.y;
  const valid = moveOrderValid(x, y);
  const r = touchUI() ? 13 : 9;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = valid ? 'rgba(120,200,90,0.8)' : 'rgba(210,70,50,0.8)';
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
}

function withPlacementGhostFilter(valid, drawFn) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.filter = valid ? 'grayscale(1)' : 'grayscale(1) sepia(1) hue-rotate(320deg) saturate(5)';
  drawFn();
  ctx.restore();
}

function drawPlacementActor(a) {
  if (a.t.tank) drawTank(a);
  else if (a.t.atgun) drawATGun(a);
  else if (a.t.bike) drawBike(a);
  else if (a.t.apc) drawHalftrack(a);
  else if (a.t.vehicle) drawJeep(a);
  else drawSoldier(a);
}

function drawPlacementUnitGhost(p, x, y, valid) {
  const a = p.kind === 'aunit'
    ? makeAttacker(levelAttackerNation(G.level), p.key, x, y)
    : p.kind === 'eunit' ? makeEnemy(p.key, x, y)
    : p.kind === 'eparadrop' ? makeEnemy('erifle', x, y)
    : makeUnit(p.key, x, y);
  a._ghost = true;
  withPlacementGhostFilter(valid, () => drawPlacementActor(a));
}

function drawPlacementDefenseGhost(key, x, y, valid) {
  withPlacementGhostFilter(valid, () => {
    if (key === 'wire') drawWire({ x, y, up: false });
    else if (key === 'sandbags') drawSandbag({ x, y, up: false });
    else if (key === 'bunker') drawBunker({ x, y, up: false, hp: BUNKER_HP, maxhp: BUNKER_HP });
    else if (key === 'watchtower') drawWatchtower({ x, y, up: false, hp: WATCHTOWER_HP, maxhp: WATCHTOWER_HP });
    else if (key === 'camonest') drawCamoNest({ x, y, up: false, hp: CAMONEST_HP, maxhp: CAMONEST_HP });
    else if (key === 'mine') drawMine({ x, y, dead: false });
  });
}

function drawPlacementGhost() {
  if (!placing || !mouse.inside) return;
  const p = placing;
  const x = mouse.x, y = mouse.y;
  const valid = placementValid(p, x, y);
  ctx.globalAlpha = 0.55;

  if (p.kind === 'support') {
    ctx.strokeStyle = valid ? '#ffd94a' : '#d04030';
    ctx.lineWidth = 1.5;
    const r = p.key === 'artillery' ? 95 : p.key === 'ebarrage' ? 85 : 55;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10);
    ctx.stroke();
  } else if (p.kind === 'aunit' || p.kind === 'eunit' || p.kind === 'eparadrop') {
    if (G.level && G.level.landingCraft) {
      ctx.fillStyle = 'rgba(200,50,40,0.12)';
      ctx.fillRect(0, BEACH_Y, W, H - BEACH_Y);
      for (const craft of G.landingCraft) {
        if (craft.state === 'done') continue;
        ctx.fillStyle = 'rgba(80,160,220,0.18)';
        ctx.fillRect(craft.x - craft.w / 2, craft.y - craft.h / 2, craft.w, craft.h);
      }
    } else {
      const maxDeployY = assaultDeployMaxY(p);
      ctx.fillStyle = 'rgba(200,50,40,0.12)';
      ctx.fillRect(0, maxDeployY, W, H - maxDeployY);
    }
    drawPlacementUnitGhost(p, x, y, valid);
    const et = attackerTypeStats(p);
    const face = p.kind === 'aunit' ? Math.PI / 2 : Math.PI / 2;
    if (et && et.fireCone) {
      drawFireCone(x, y, face, et.fireCone.arc, et.range * fogMult(), 0.35);
    } else if (et && et.flame) {
      drawFlameRangeCone(x, y, face, et.flame.arc, et.flame.range * fogMult(), 0.35);
    } else if (et && et.mortar) {
      drawMortarRangeRing(x, y, et.mortar.min * fogMult(), et.mortar.range * fogMult(), 0.35);
    } else if (et && et.sfx === 'sniper' && et.range > 200) {
      drawSniperRangeRing(x, y, et.range * fogMult(), 0.5);
    } else if (et) {
      let r = et.range;
      if (et.rocket) r = et.rocket.range;
      if (r > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, r * fogMult(), 0, 7); ctx.stroke();
      }
    }
    drawSpecialistRangeAt(x, y, p.kind === 'eparadrop' ? 'erifle' : p.key, p.kind === 'aunit' ? 'us' : 'de');
  } else {
    // shade the invalid zone
    ctx.fillStyle = 'rgba(200,50,40,0.12)';
    ctx.fillRect(0, 0, W, placementMinY(p));
    const ghostPositions = p.key === 'mine' ? minefieldPositions(x, y) : [{ x, y }];
    for (const pos of ghostPositions) {
      if (p.kind === 'unit') {
        drawPlacementUnitGhost(p, pos.x, pos.y, valid);
      } else if (p.kind === 'defense') {
        drawPlacementDefenseGhost(p.key, pos.x, pos.y, valid);
        drawDefenseRangeIndicator(p.key, pos.x, pos.y);
      }
    }
    const ut = UNIT_TYPES[p.key];
    if (ut && ut.atgun) {
      drawATGunRangeCone(x, y, -Math.PI / 2, ut.atgun.arc, ut.range * fogMult(), 0.45);
    } else if (ut && ut.fireCone) {
      drawFireCone(x, y, -Math.PI / 2, ut.fireCone.arc, ut.range * fogMult(), 0.35);
    } else if (ut && ut.flame) {
      drawFlameRangeCone(x, y, -Math.PI / 2, ut.flame.arc, ut.flame.range * fogMult(), 0.35);
    } else if (ut && ut.shotgun) {
      drawBuckshotCone(x, y, -Math.PI / 2, ut.shotgun.arc, ut.shotgun.range * fogMult(), 0.35);
    } else if (ut && ut.mortar) {
      drawMortarRangeRing(x, y, ut.mortar.min * fogMult(), ut.mortar.range * fogMult(), 0.35);
    } else if (ut && ut.sfx === 'sniper' && ut.range > 200) {
      drawSniperRangeRing(x, y, ut.range * fogMult(), 0.5);
    } else if (ut) {
      // show the reach of his main weapon, not the sidearm
      let r = ut.range;
      if (ut.rocket) r = ut.rocket.range;
      if (ut.shotgun) r = ut.shotgun.range;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, r * fogMult(), 0, 7); ctx.stroke();
    }
    if (p.kind === 'unit') drawSpecialistRangeAt(x, y, p.key);
  }
  ctx.globalAlpha = 1;
}

// ============================================================ HUD / DOM

const el = id => document.getElementById(id);
const touchUI = () => window.matchMedia('(hover: none)').matches;
const tapSlop = () => touchUI() ? 14 : 6;

function touchHitRadius(base) {
  return touchUI() ? base * 1.35 : base;
}

function mobileVibrate(ms) {
  if (touchUI() && navigator.vibrate) navigator.vibrate(ms);
}

function unlockAudio() {
  if (typeof SFX !== 'undefined' && SFX.resume) SFX.resume();
}

function mobileViewActive() {
  return touchUI() && window.innerWidth <= 768;
}

function portraitMobile() {
  return mobileViewActive() && window.innerHeight > window.innerWidth;
}

function unitAtWorld(x, y) {
  if (!G || isAssaultMode()) return null;
  for (const u of commandRoster()) {
    const base = u.t.tank ? 26 : u.t.vehicle ? 20 : u.t.atgun ? 18 : 14;
    if (dist(u, { x, y }) < touchHitRadius(base)) return u;
  }
  return null;
}

function beginViewPan(clientX, clientY, worldX, worldY) {
  viewPan = {
    clientX0: clientX,
    clientY0: clientY,
    worldX0: worldX,
    worldY0: worldY,
    camX0: viewCam.x,
    camY0: viewCam.y,
    active: false,
  };
}

function applyViewPan(clientX, clientY) {
  if (!viewPan) return;
  const moved = Math.hypot(clientX - viewPan.clientX0, clientY - viewPan.clientY0);
  if (!viewPan.active && moved <= tapSlop()) return;
  viewPan.active = true;
  const r = canvas.getBoundingClientRect();
  const { viewW, viewH } = viewSize();
  viewCam.x = viewPan.camX0 - (clientX - viewPan.clientX0) / r.width * viewW;
  viewCam.y = viewPan.camY0 - (clientY - viewPan.clientY0) / r.height * viewH;
  clampCamera();
  viewDirty = true;
  syncViewStrip();
}

function clearViewPan() {
  viewPan = null;
}

function clearPlaceHold() {
  if (placeHoldTimer) {
    clearTimeout(placeHoldTimer);
    placeHoldTimer = null;
  }
}

function syncViewStrip() {
  const strip = el('view-strip');
  const win = el('view-strip-window');
  if (!strip || !win) return;
  const on = mobileViewActive() && isPlaying() && !paused;
  strip.classList.toggle('hidden', !on);
  if (!on) return;
  const { viewW } = viewSize();
  win.style.width = (viewW / W * 100) + '%';
  win.style.left = (viewCam.x / W * 100) + '%';
}

function syncSelectionMobile() {
  if (!touchUI() || !isPlaying()) {
    mobileToolbarMinimized = false;
  } else if (G?.selected.length && !placing) {
    mobileToolbarMinimized = true;
  } else if (!G?.selected.length && !placing) {
    mobileToolbarMinimized = false;
  }
  syncMobileChrome();
  syncToolbarVisibility();
}

function syncMobileChrome() {
  const stage = el('stage');
  const tip = el('tipbar');
  const actions = el('mobile-actions');
  const placeCancel = el('place-cancel');
  if (stage) {
    stage.classList.toggle('mobile-portrait', portraitMobile());
    stage.classList.toggle('placing-active', touchUI() && !!placing);
    stage.classList.toggle('units-selected', touchUI() && !!G?.selected.length && !placing);
  }
  if (tip) tip.classList.toggle('hidden', touchUI() && !!placing);
  if (actions) {
    actions.classList.toggle('hidden', !(touchUI() && isPlaying() && G?.selected.length && !placing));
  }
  if (placeCancel) {
    placeCancel.classList.toggle('hidden', !(touchUI() && placing && isPlaying()));
  }
  syncViewStrip();
}

function canvasAspect() {
  if (canvas.width > 0 && canvas.height > 0) return canvas.height / canvas.width;
  return H / W;
}

function coverZoom() {
  if (!mobileViewActive()) return 1;
  return Math.max(1, canvasAspect() * W / H);
}

function viewZoomMin() {
  return mobileViewActive() ? coverZoom() : 1;
}

function viewZoomMax() {
  return mobileViewActive() ? coverZoom() * VIEW_ZOOM_MAX_MUL : 1;
}

function viewSize(zoom = viewCam.zoom) {
  const viewW = W / zoom;
  const viewH = mobileViewActive() ? canvasAspect() * W / zoom : H / zoom;
  return { viewW, viewH };
}

function viewScale() {
  if (!mobileViewActive()) return 1;
  return canvas.width / viewSize().viewW;
}

function clampCamera() {
  const { viewW, viewH } = viewSize();
  viewCam.x = clamp(viewCam.x, 0, Math.max(0, W - viewW));
  viewCam.y = clamp(viewCam.y, 0, Math.max(0, H - viewH));
}

function resetViewCam(mode) {
  if (!mobileViewActive()) {
    viewCam.zoom = 1;
    viewCam.x = 0;
    viewCam.y = 0;
  } else {
    viewCam.zoom = coverZoom();
    viewCam.x = (W - W / viewCam.zoom) / 2;
    const { viewH } = viewSize();
    if (mode === 'axis' || mode === 'assault') viewCam.y = 0;
    else if (mode === 'hitsquad') viewCam.y = 120;
    else if (canvasAspect() < W / H) viewCam.y = clamp((H - viewH) * 0.38, 0, Math.max(0, H - viewH));
    else viewCam.y = DEPLOY_Y - viewH * 0.55;
  }
  clampCamera();
  viewDirty = true;
  syncViewStrip();
}

function zoomToward(wx, wy, targetZoom) {
  const oldZoom = viewCam.zoom;
  viewCam.zoom = clamp(targetZoom, viewZoomMin(), viewZoomMax());
  const { viewW: ow, viewH: oh } = viewSize(oldZoom);
  const nx = ow > 0 ? (wx - viewCam.x) / ow : 0.5;
  const ny = oh > 0 ? (wy - viewCam.y) / oh : 0.5;
  const { viewW: nw, viewH: nh } = viewSize();
  viewCam.x = wx - nx * nw;
  viewCam.y = wy - ny * nh;
  clampCamera();
  viewDirty = true;
  syncViewStrip();
}

function toggleZoomAt(wx, wy) {
  if (!mobileViewActive()) return;
  const mid = coverZoom() * 1.85;
  const target = viewCam.zoom <= coverZoom() * 1.08 ? mid : coverZoom();
  zoomToward(wx, wy, target);
  mobileVibrate(6);
}

function edgeAutoPan(clientX, clientY) {
  if (!mobileViewActive() || !isPlaying()) return;
  const r = canvas.getBoundingClientRect();
  const margin = 44;
  const speed = 10 / viewScale();
  let moved = false;
  const { viewW, viewH } = viewSize();
  if (viewW < W - 1) {
    if (clientX - r.left < margin) { viewCam.x -= speed; moved = true; }
    if (r.right - clientX < margin) { viewCam.x += speed; moved = true; }
  }
  if (viewH < H - 1) {
    const topMargin = margin + (portraitMobile() ? 36 : 0);
    const bottomMargin = margin + (portraitMobile() ? 56 : 0);
    if (clientY - r.top < topMargin) { viewCam.y -= speed; moved = true; }
    if (r.bottom - clientY < bottomMargin) { viewCam.y += speed; moved = true; }
  }
  if (moved) {
    clampCamera();
    viewDirty = true;
    syncViewStrip();
  }
}

function clientToWorld(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const nx = (clientX - r.left) / r.width;
  const ny = (clientY - r.top) / r.height;
  if (!mobileViewActive()) return { x: nx * W, y: ny * H };
  const { viewW, viewH } = viewSize();
  return { x: viewCam.x + nx * viewW, y: viewCam.y + ny * viewH };
}

function pointerMid() {
  const pts = [...activePointers.values()];
  if (pts.length < 2) return null;
  return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
}

function pointerDist() {
  const pts = [...activePointers.values()];
  if (pts.length < 2) return 0;
  return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
}

function beginViewGesture() {
  const mid = pointerMid();
  const d = pointerDist();
  if (!mid || d < 1) return;
  viewGesture = {
    active: true,
    d0: d,
    zoom0: viewCam.zoom,
    mid0: { x: mid.x, y: mid.y },
    camX0: viewCam.x,
    camY0: viewCam.y,
  };
  drag = null;
  placeTouch = null;
}

function applyViewGesture() {
  if (!viewGesture?.active) return;
  const mid = pointerMid();
  const d = pointerDist();
  if (!mid || viewGesture.d0 < 1) return;

  const r = canvas.getBoundingClientRect();
  const { viewW: vw0, viewH: vh0 } = viewSize(viewGesture.zoom0);
  const nx0 = (viewGesture.mid0.x - r.left) / r.width;
  const ny0 = (viewGesture.mid0.y - r.top) / r.height;
  const worldX = viewGesture.camX0 + nx0 * vw0;
  const worldY = viewGesture.camY0 + ny0 * vh0;

  viewCam.zoom = clamp(viewGesture.zoom0 * (d / viewGesture.d0), viewZoomMin(), viewZoomMax());
  const { viewW: vw, viewH: vh } = viewSize();
  const nx1 = (mid.x - r.left) / r.width;
  const ny1 = (mid.y - r.top) / r.height;
  viewCam.x = worldX - nx1 * vw;
  viewCam.y = worldY - ny1 * vh;
  clampCamera();
  viewDirty = true;
  syncViewStrip();
}

function syncMobileViewUI() {
  const stage = el('stage');
  const btn = el('view-reset');
  const on = mobileViewActive();
  if (stage) stage.classList.toggle('mobile-view', on);
  if (btn) btn.classList.toggle('hidden', !on || !running);
}

function framePadY() {
  const wrap = el('wrap');
  if (!wrap) return 0;
  const cs = getComputedStyle(wrap);
  return (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
}

function fitLayout() {
  const wrap = el('wrap');
  const stage = el('stage');
  const padY = framePadY();
  const maxW = window.innerWidth;
  const maxH = window.innerHeight - padY;
  const ratio = W / H;
  const mobile = mobileViewActive();

  let w, h;
  if (mobile) {
    w = maxW;
    h = maxH;
  } else {
    w = maxW;
    h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
  }

  w = Math.floor(w);
  h = Math.floor(h);

  wrap.style.width = w + 'px';
  wrap.style.height = (h + padY) + 'px';
  stage.style.width = '100%';
  stage.style.height = '100%';

  if (mobile) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
  } else {
    canvas.width = W;
    canvas.height = H;
  }

  const newCover = mobile ? coverZoom() : 1;
  if (mobile) {
    if (G && lastCoverZoom != null && Math.abs(newCover - lastCoverZoom) > 0.05) {
      resetViewCam(G.mode);
    } else {
      viewCam.zoom = clamp(viewCam.zoom, viewZoomMin(), viewZoomMax());
      clampCamera();
    }
  }
  lastCoverZoom = newCover;

  syncMobileViewUI();
  syncMobileChrome();
  syncToolbarLayout();
  viewDirty = true;
}

function syncToolbarLayout() {
  const hudEl = el('hud');
  const bar = el('toolbar');
  if (!hudEl || !bar) return;
  syncMobileChrome();
  if (portraitMobile()) {
    bar.style.top = 'auto';
    bar.style.bottom = '0';
    bar.style.left = '0';
    bar.style.right = '0';
    return;
  }
  bar.style.bottom = touchUI() ? '22px' : '28px';
  bar.style.left = touchUI() ? '3px' : '4px';
  bar.style.right = 'auto';
  // #hud is offset 6px from the stage top; keep a small gap below the wrapped HUD rows
  bar.style.top = (6 + hudEl.offsetHeight + 6) + 'px';
}

const hud = { tp: el('tp'), waveBox: el('wavebox'), kills: el('kills'), breachBox: el('breachbox') };
const bannerEl = el('banner');

function updateHUD() {
  hud.tp.textContent = isSandbox() ? '∞' : Math.floor(G.tp);
  hud.kills.textContent = G.kills;
  if (G.mode === 'axis' || G.mode === 'assault') {
    const phase = G.phase === 'build' ? 'BUILD' : G.phase === 'landing' ? 'LANDING' : 'FIGHT';
    const waves = assaultWaves(G.level);
    hud.waveBox.textContent = 'WAVE ' + G.wave + '/' + waves + ' ' + phase;
    hud.breachBox.textContent = 'BREAK ' + G.breaches + '/' + G.level.winBreaches;
  } else if (G.mode === 'hitsquad') {
    const left = Math.max(0, G.level.timeLimit - G.time);
    const m = Math.floor(left / 60), s = Math.floor(left % 60);
    hud.waveBox.textContent = 'TIME ' + m + ':' + String(s).padStart(2, '0');
    let alive = 0;
    for (const e of G.enemies) if (!e.dead) alive++;
    hud.breachBox.textContent = 'MEN ' + alive + '/' + G.squadTotal;
  } else if (G.mode === 'allied') {
    hud.waveBox.textContent = 'WAVE ' + G.wave + '/' + G.level.waves.length;
    hud.breachBox.textContent = 'BREACH ' + G.breaches + '/' + G.level.breachLimit;
  } else {
    hud.waveBox.textContent = 'WAVE ' + G.wave;
    hud.breachBox.textContent = 'BREACH ' + G.breaches + '/' + G.level.breachLimit;
  }

  el('sandbox-wave-skip').classList.toggle('hidden', !(isSandbox() && !isTestingMode() && isPlaying()));
  el('speed-btn').classList.toggle('hidden', !(running && G && !G.over));
  el('pause-btn').classList.toggle('hidden', !(running && G && !G.over));
  const startBtn = el('start-wave-btn');
  if (startBtn) {
    const showStart = inBuildPhase();
    startBtn.classList.toggle('hidden', !showStart);
    startBtn.disabled = !showStart || !G.enemies.some(e => !e.dead);
  }

  if (G.banner) {
    bannerEl.textContent = G.banner.text;
    bannerEl.classList.add('show');
  } else {
    bannerEl.classList.remove('show');
  }

  for (const btn of toolButtons) {
    const capped = btn.p.key === 'officer' && officerCount() >= MAX_OFFICERS;
    btn.el.disabled = !canAffordTP(placeableCost(btn.p)) || capped;
    btn.el.classList.toggle('active', placing === btn.p);
  }

  syncToolbarVisibility();
  syncToolbarLayout();
  syncViewStrip();
}

const TOOLBAR_CATEGORIES = [
  { id: 'units', label: 'UNITS', filter: p => p.kind === 'unit' || p.kind === 'eunit' || p.kind === 'aunit' || p.kind === 'eparadrop' },
  { id: 'abilities', label: 'ABILITIES', filter: p => p.kind === 'support' },
  { id: 'emplacements', label: 'EMPLACEMENTS', filter: p => p.kind === 'defense' },
  { id: 'germans', label: 'GERMANS', filter: p => p.kind === 'egerman' },
];

let toolButtons = [];
let toolbarPlaceables = [];
let toolbarView = 'categories';

function placeablesForCategory(categoryId) {
  const cat = TOOLBAR_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return [];
  return toolbarPlaceables
    .filter(cat.filter)
    .slice()
    .sort((a, b) => placeableCost(a) - placeableCost(b));
}

function categoryForPlaceable(p) {
  const cat = TOOLBAR_CATEGORIES.find(c => c.filter(p));
  return cat ? cat.id : 'categories';
}

function clearPlacing() {
  if (!placing) return;
  placing = null;
  clearPlaceHold();
  renderToolbar();
  syncMobileChrome();
}

function visibleToolbarCategories() {
  return TOOLBAR_CATEGORIES.filter(c => placeablesForCategory(c.id).length > 0);
}

function syncToolbarVisibility() {
  const bar = el('toolbar');
  if (!bar) return;
  const hideForSelection = touchUI() && mobileToolbarMinimized && G?.selected.length && !placing;
  const show = toolbarPlaceables.length > 0 && isPlaying() && !hideForSelection
    && !(isAssaultMode() && G.phase !== 'build');
  bar.classList.toggle('hidden', !show);
}

function renderToolbar() {
  const bar = el('toolbar');
  bar.innerHTML = '';
  toolButtons = [];

  if (!toolbarPlaceables.length) {
    bar.classList.add('hidden');
    bar.classList.remove('toolbar-placing');
    return;
  }

  if (touchUI() && placing) {
    bar.classList.add('toolbar-placing');
    const active = placing;
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'tool-btn tool-back-btn';
    back.textContent = '← BACK';
    back.addEventListener('click', () => {
      placing = null;
      if (toolbarView === 'categories') toolbarView = categoryForPlaceable(active);
      SFX.click();
      renderToolbar();
    });
    bar.appendChild(back);

    const cost = placeableCost(active);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tool-btn active';
    b.title = active.desc;
    const activeKey = active.hotkey ? `<span class="key">[${active.hotkey}]</span>` : '';
    b.innerHTML = `${activeKey}${active.label}<span class="cost">${cost} TP</span>`;
    b.addEventListener('click', () => selectPlaceable(active));
    bar.appendChild(b);
    toolButtons.push({ p: active, el: b });

    syncToolbarVisibility();
    syncToolbarLayout();
    return;
  }

  bar.classList.remove('toolbar-placing');

  if (toolbarView === 'categories') {
    for (const cat of visibleToolbarCategories()) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tool-btn tool-cat-btn';
      b.textContent = cat.label;
      b.addEventListener('click', () => {
        toolbarView = cat.id;
        SFX.click();
        renderToolbar();
        syncToolbarVisibility();
      });
      bar.appendChild(b);
    }
  } else {
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'tool-btn tool-back-btn';
    back.textContent = '← BACK';
    back.addEventListener('click', () => {
      placing = null;
      toolbarView = 'categories';
      SFX.click();
      renderToolbar();
      syncToolbarVisibility();
    });
    bar.appendChild(back);

    for (const p of placeablesForCategory(toolbarView)) {
      const cost = placeableCost(p);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tool-btn';
      b.title = p.desc;
      const key = p.hotkey ? `<span class="key">[${p.hotkey}]</span>` : '';
      b.innerHTML = `${key}${p.label}<span class="cost">${cost} TP</span>`;
      b.addEventListener('click', () => selectPlaceable(p));
      bar.appendChild(b);
      toolButtons.push({ p, el: b });
    }
  }

  syncToolbarVisibility();
  syncToolbarLayout();
}

function buildToolbar(placeables) {
  toolbarPlaceables = placeables;
  toolbarView = 'categories';
  renderToolbar();
  fitLayout();
}

function activePlaceables() {
  return (G && G.level) ? G.level.placeables : PLACEABLES;
}

function selectPlaceable(p) {
  if (!isPlaying()) return;
  if (isAssaultMode() && G.phase !== 'build') { SFX.error(); mobileVibrate(12); return; }
  if (!canAffordTP(placeableCost(p))) { SFX.error(); mobileVibrate(12); return; }
  if (p.key === 'officer' && officerCount() >= MAX_OFFICERS) { SFX.error(); mobileVibrate(12); return; }
  SFX.click();
  placing = (placing === p) ? null : p;
  if (placing) mobileToolbarMinimized = false;
  if (placing && touchUI() && toolbarView === 'categories') {
    toolbarView = categoryForPlaceable(p);
  }
  G.selected = [];
  renderToolbar();
  syncMobileChrome();
}

// ============================================================ placement & input

function minefieldPositions(cx, cy) {
  // keep mines beyond explode() chain radius (r * 0.8 ≈ 35 for mine blasts)
  return [
    { x: cx, y: cy },
    { x: cx + 48, y: cy - 14 },
    { x: cx - 48, y: cy + 14 },
  ];
}

function moveOrderMinY() {
  return G.mode === 'hitsquad' ? 20 : FORWARD_Y;
}

function moveOrderValid(x, y) {
  const minY = moveOrderMinY();
  return x >= 16 && x <= W - 16 && y > minY && y < H - 14;
}

function canReceiveMoveOrders() {
  return G && G.selected.some(u => !u.t.fixed);
}

function showForwardLine() {
  return G && G.mode !== 'hitsquad' && !isAssaultMode();
}

function attackerTypeStats(p) {
  if (p.kind === 'aunit') return UNIT_TYPES[p.key];
  if (p.kind === 'eparadrop') return ENEMY_TYPES.erifle;
  return ENEMY_TYPES[p.key];
}

function placementValid(p, x, y) {
  if (p.kind === 'support') return y > 20 && y < H - 10;
  if (p.kind === 'egerman') {
    // testing mode: German units go anywhere on the field, not confined to
    // the axis campaign's top deploy strip
    if (x < 16 || x > W - 16 || y < 14 || y > H - 14) return false;
    const t = attackerTypeStats(p);
    const bulk = t.heavy ? 40 : t.tank ? 34 : t.apc ? 30 : t.vehicle || t.bike ? 26 : 16;
    for (const e of G.enemies) {
      const gap = Math.max(bulk, e.t.heavy ? 40 : e.t.tank ? 34 : e.t.vehicle ? 26 : 16);
      if (dist(e, { x, y }) < gap) return false;
    }
    return true;
  }
  if (p.kind === 'aunit' || p.kind === 'eunit' || p.kind === 'eparadrop') {
    if (G.level && G.level.landingCraft) {
      const craft = landingCraftAt(x, y);
      if (!craft) return false;
      const t = attackerTypeStats(p);
      const bulk = t.heavy ? 40 : t.tank ? 34 : t.apc ? 30 : t.vehicle || t.bike ? 26 : 16;
      for (const u of craft.onDeck) {
        if (!u.dead && dist(u, { x, y }) < bulk) return false;
      }
      for (const e of G.enemies) {
        if (e.onCraft && e.onCraft !== craft) continue;
        const gap = Math.max(bulk, e.t.heavy ? 40 : e.t.tank ? 34 : e.t.vehicle ? 26 : 16);
        if (dist(e, { x, y }) < gap) return false;
      }
      return x >= 16 && x <= W - 16;
    }
    const maxY = assaultDeployMaxY(p);
    if (y < 14 || y > maxY || x < 16 || x > W - 16) return false;
    const t = attackerTypeStats(p);
    const bulk = t.heavy ? 40 : t.tank ? 34 : t.apc ? 30 : t.vehicle || t.bike ? 26 : 16;
    for (const e of G.enemies) {
      const gap = Math.max(bulk, e.t.heavy ? 40 : e.t.tank ? 34 : e.t.vehicle ? 26 : 16);
      if (dist(e, { x, y }) < gap) return false;
    }
    return true;
  }
  const positions = p.key === 'mine' ? minefieldPositions(x, y) : [{ x, y }];
  const minY = placementMinY(p);
  for (const pos of positions) {
    if (pos.y < minY || pos.y > H - 14 || pos.x < 16 || pos.x > W - 16) return false;
  }
  if (p.kind === 'unit') {
    const bulk = k => k === 'sherman' ? 34 : k === 'jeep' ? 26 : k === 'atgun' ? 24 : 16;
    for (const u of G.units) {
      const gap = Math.max(bulk(p.key), u.t.tank ? 34 : u.t.vehicle ? 26 : 16);
      if (dist(u, { x, y }) < gap) return false;
    }
  }
  return true;
}

function placementMinY(p) {
  return (p.key === 'mine' || p.key === 'wire') ? FORWARD_Y : DEPLOY_Y + 12;
}

function place(p, x, y) {
  if (isAssaultMode() && G.phase !== 'build') { SFX.error(); mobileVibrate(14); return; }
  if (!placementValid(p, x, y)) { SFX.error(); mobileVibrate(14); return; }
  const cost = placeableCost(p);
  if (!canAffordTP(cost)) { SFX.error(); clearPlacing(); return; }
  if (p.key === 'officer' && officerCount() >= MAX_OFFICERS) { SFX.error(); clearPlacing(); return; }
  spendTP(cost);
  SFX.click();
  mobileVibrate(8);

  if (p.kind === 'unit') {
    G.units.push(makeUnit(p.key, x, y));
  } else if (p.kind === 'eparadrop') {
    placeAxisParatrooper(x, y);
  } else if (p.kind === 'aunit') {
    const nation = levelAttackerNation(G.level);
    const u = makeAttacker(nation, p.key, x, y);
    if (G.level.landingCraft) {
      const craft = landingCraftAt(x, y);
      if (craft) {
        u.onCraft = craft;
        u.deckOffX = x - craft.x;
        u.deckOffY = y - craft.y;
        craft.onDeck.push(u);
      }
    }
    G.enemies.push(u);
  } else if (p.kind === 'eunit' || p.kind === 'egerman') {
    G.enemies.push(makeEnemy(p.key, x, y));
  } else if (p.key === 'ebarrage') {
    showBanner('DEUTSCHE ARTILLERIE!');
    for (let i = 0; i < 10; i++) {
      scheduleShell(x + rand(-80, 80), y + rand(-65, 65), 1.6 + i * 0.5, 50, 95, true);
    }
  } else if (p.key === 'sandbags') {
    G.sandbags.push({ x, y, hp: SANDBAG_HP, maxhp: SANDBAG_HP, up: false, workProg: 0 });
  } else if (p.key === 'bunker') {
    G.bunkers.push({ x, y, hp: BUNKER_HP, maxhp: BUNKER_HP, up: false, workProg: 0 });
  } else if (p.key === 'watchtower') {
    G.watchtowers.push({ x, y, hp: WATCHTOWER_HP, maxhp: WATCHTOWER_HP, up: false, workProg: 0 });
  } else if (p.key === 'camonest') {
    G.camoNests.push({ x, y, hp: CAMONEST_HP, maxhp: CAMONEST_HP, up: false, workProg: 0, fortifyMult: 2 });
  } else if (p.key === 'wire') {
    G.wires.push({ x, y, hp: 3750, maxhp: 3750, up: false, workProg: 0 });
  } else if (p.key === 'mine') {
    for (const pos of minefieldPositions(x, y)) {
      G.mines.push({ x: pos.x, y: pos.y, dead: false });
    }
  } else if (p.key === 'mortar') {
    showBanner('MORTAR FIRE MISSION');
    for (let i = 0; i < 6; i++) {
      scheduleShell(x + rand(-68, 68), y + rand(-57, 57), 2.4 + i * 1.0, 42, 90, false);
    }
  } else if (p.key === 'artillery') {
    showBanner('105mm BARRAGE INBOUND');
    for (let i = 0; i < 16; i++) {
      scheduleShell(x + rand(-90, 90), y + rand(-70, 70), 1.6 + i * 0.45, 55, 105, true);
    }
  }
  // keep placing defenses if affordable; supports are one-shot
  if (p.kind === 'support' || !canAffordTP(placeableCost(p)) || (p.key === 'officer' && officerCount() >= MAX_OFFICERS)) clearPlacing();
}

function updatePointer(e) {
  const pt = clientToWorld(e.clientX, e.clientY);
  mouse.x = pt.x;
  mouse.y = pt.y;
  mouse.inside = true;
}

// which soldiers answer to the player: your squad in hit-squad mode, US otherwise
function commandRoster() {
  return G.mode === 'hitsquad' ? G.enemies : G.units;
}

function handleCanvasTap(shiftKey = false) {
  if (!isPlaying()) return;
  const x = mouse.x, y = mouse.y;

  // assault attackers can't be selected or ordered; the toolbar is the whole game
  if (isAssaultMode()) return;

  // select own soldier (vehicles are a bigger click target)
  let picked = null;
  for (const u of commandRoster()) {
    const base = u.t.tank ? 26 : u.t.vehicle ? 20 : u.t.atgun ? 18 : 14;
    if (dist(u, { x, y }) < touchHitRadius(base)) { picked = u; break; }
  }
  if (picked) {
    if (shiftKey) {
      const si = G.selected.indexOf(picked);
      if (si !== -1) G.selected.splice(si, 1);
      else G.selected.push(picked);
    } else {
      // double-click on same unit type → select all of that type
      const now = performance.now();
      if (now - lastUnitClick.t < 400 && lastUnitClick.type === picked.type) {
        G.selected = commandRoster().filter(u => !u.dead && u.type === picked.type);
      } else {
        G.selected = [picked];
      }
      lastUnitClick = { t: now, type: picked.type };
    }
    SFX.click();
    mobileVibrate(5);
    syncSelectionMobile();
    return;
  }
  // move selected soldiers (the hit squad ranges the whole field)
  if (G.selected.length && moveOrderValid(x, y)) {
    issueMoveOrder(G.selected, x, y);
    SFX.click();
    mobileVibrate(5);
    return;
  }
  G.selected = [];
  lastUnitClick = { t: 0, type: null };
  syncSelectionMobile();
}

canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  unlockAudio();
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  clearPlaceHold();

  if (mobileViewActive() && activePointers.size >= 2) {
    beginViewGesture();
    clearViewPan();
    suppressClick = true;
    return;
  }

  canvas.setPointerCapture(e.pointerId);
  updatePointer(e);
  suppressClick = false;

  if (placing) {
    if (!isPlaying()) return;
    placeTouch = { active: true, moved: false, startX: mouse.x, startY: mouse.y };
    if (touchUI()) {
      placeHoldTimer = setTimeout(() => {
        if (placeTouch?.active && placing) {
          clearPlacing();
          placeTouch = null;
          SFX.click();
        }
      }, 500);
    }
    return;
  }

  if (mobileViewActive() && isPlaying()) {
    beginViewPan(e.clientX, e.clientY, mouse.x, mouse.y);
  }

  if (!isPlaying() || isAssaultMode()) return;
  drag = { x0: mouse.x, y0: mouse.y, x1: mouse.x, y1: mouse.y, active: false };

  // long-press on mobile → clear selection, enter multi-select drag mode
  if (touchUI() && !placing) {
    clearLongPress();
    longPressTimer = setTimeout(() => {
      if (placing) return;
      G.selected = [];
      longPressing = true;
      clearViewPan();
      syncSelectionMobile();
      mobileVibrate(10);
    }, 350);
  }
});

canvas.addEventListener('pointermove', e => {
  if (activePointers.has(e.pointerId)) {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  if (mobileViewActive() && activePointers.size >= 2 && viewGesture?.active) {
    applyViewGesture();
    return;
  }

  updatePointer(e);
  if (!canvas.hasPointerCapture(e.pointerId)) return;

  if (placeTouch?.active && placing && mobileViewActive()) {
    if (Math.hypot(mouse.x - placeTouch.startX, mouse.y - placeTouch.startY) > tapSlop()) {
      placeTouch.moved = true;
      clearPlaceHold();
      if (!viewPan) beginViewPan(e.clientX, e.clientY, placeTouch.startX, placeTouch.startY);
      applyViewPan(e.clientX, e.clientY);
    }
    edgeAutoPan(e.clientX, e.clientY);
    return;
  }

  if (placing && mobileViewActive()) {
    edgeAutoPan(e.clientX, e.clientY);
  }

  if (viewPan && mobileViewActive() && activePointers.size === 1) {
    // long-pressing → skip view pan, let drag marquee work instead
    if (!longPressing) {
      if (!viewPan.active) {
        const moved = Math.hypot(e.clientX - viewPan.clientX0, e.clientY - viewPan.clientY0);
        if (moved > tapSlop()) {
          if (!unitAtWorld(viewPan.worldX0, viewPan.worldY0)) {
            viewPan.active = true;
            drag = null;
          } else {
            clearViewPan();
          }
        }
      }
    }
    if (viewPan?.active) {
      applyViewPan(e.clientX, e.clientY);
      return;
    }
  }

  // cancel long-press timer if user started dragging before timer fired
  if (longPressTimer && drag && Math.hypot(drag.x1 - drag.x0, drag.y1 - drag.y0) > tapSlop()) {
    clearLongPress();
  }

  if (placeTouch?.active) {
    if (Math.hypot(mouse.x - placeTouch.startX, mouse.y - placeTouch.startY) > 6) placeTouch.moved = true;
  }
  if (drag) {
    drag.x1 = mouse.x;
    drag.y1 = mouse.y;
    if (!drag.active && Math.hypot(drag.x1 - drag.x0, drag.y1 - drag.y0) > tapSlop()) drag.active = true;
  }
});

canvas.addEventListener('pointerup', e => {
  if (e.button !== 0) return;
  activePointers.delete(e.pointerId);
  clearPlaceHold();
  // ensure the long-press timer doesn't fire after release
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }

  if (viewGesture?.active) {
    if (activePointers.size < 2) viewGesture = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    suppressClick = true;
    return;
  }

  if (canvas.hasPointerCapture(e.pointerId)) {
    updatePointer(e);
    canvas.releasePointerCapture(e.pointerId);
  }

  if (placeTouch?.active && placing) {
    if (!isPlaying()) { placeTouch = null; return; }
    if (placeTouch.moved) {
      placeTouch = null;
      clearViewPan();
      suppressClick = true;
      return;
    }
    place(placing, mouse.x, mouse.y);
    placeTouch = null;
    suppressClick = true;
    return;
  }
  placeTouch = null;

  if (viewPan?.active) {
    clearViewPan();
    suppressClick = true;
    drag = null;
    return;
  }
  clearViewPan();

  if (drag) {
    if (drag.active && isPlaying()) {
      const x0 = Math.min(drag.x0, drag.x1), x1 = Math.max(drag.x0, drag.x1);
      const y0 = Math.min(drag.y0, drag.y1), y1 = Math.max(drag.y0, drag.y1);
      const minDrag = tapSlop();
      if (x1 - x0 >= minDrag || y1 - y0 >= minDrag) {
        const picked = commandRoster().filter(u => u.x >= x0 && u.x <= x1 && u.y >= y0 && u.y <= y1);
        if (picked.length) {
          if (e.shiftKey) {
            for (const u of picked) {
              if (!G.selected.includes(u)) G.selected.push(u);
            }
          } else {
            G.selected = picked;
          }
          SFX.click();
          mobileVibrate(5);
          syncSelectionMobile();
          suppressClick = true;
        }
        // empty marquee: keep current selection and treat release as a tap
      }
    }
    drag = null;
  }

  // long-press held without dragging → suppress the tap (already deselected)
  if (longPressing) {
    suppressClick = true;
    longPressing = false;
  }

  if (!suppressClick && isPlaying() && !placing) {
    if (mobileViewActive() && !viewPan?.active && !(drag && drag.active)) {
      const now = performance.now();
      const dt = now - lastTap.t;
      const dd = Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y);
      if (dt < 320 && dd < 28) {
        // double-tap on a unit → select all of same type instead of zooming
        const hit = unitAtWorld(mouse.x, mouse.y);
        if (hit && !hit.dead) {
          G.selected = commandRoster().filter(u => !u.dead && u.type === hit.type);
          SFX.click();
          mobileVibrate(5);
          syncSelectionMobile();
          suppressClick = true;
          lastTap.t = 0;
          return;
        }
        toggleZoomAt(mouse.x, mouse.y);
        suppressClick = true;
        lastTap.t = 0;
        return;
      }
      lastTap = { t: now, x: e.clientX, y: e.clientY };
    }
    handleCanvasTap(e.shiftKey);
    suppressClick = true;
  }
});

canvas.addEventListener('pointercancel', e => {
  activePointers.delete(e.pointerId);
  if (activePointers.size < 2) viewGesture = null;
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  clearPlaceHold();
  clearViewPan();
  clearLongPress();
  placeTouch = null;
  drag = null;
  mouse.inside = false;
});

canvas.addEventListener('pointerleave', e => {
  if (!canvas.hasPointerCapture(e.pointerId)) {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) viewGesture = null;
    mouse.inside = false;
  }
});

// spread a group order into a tight grid around the target so men don't stack
function issueMoveOrder(units, x, y) {
  units = units.filter(u => !u.t.fixed);   // staked guns don't take march orders
  if (!units.length) return;
  // a hit squad ranges the whole field; US soldiers hold behind the forward line
  const minY = moveOrderMinY() + (G.mode === 'hitsquad' ? 0 : 2);
  const clampDest = (dx, dy) => ({
    x: clamp(dx, 16, W - 16),
    y: clamp(dy, minY, H - 14),
  });
  if (units.length === 1) {
    units[0].moveTo = clampDest(x, y);
    return;
  }
  const spacing = Math.max(...units.map(u => u.t.tank ? 44 : u.t.vehicle ? 32 : 22));
  const cols = Math.ceil(Math.sqrt(units.length));
  const rows = Math.ceil(units.length / cols);
  const slots = [];
  for (let i = 0; i < units.length; i++) {
    const row = Math.floor(i / cols);
    const inRow = (row === rows - 1) ? units.length - row * cols : cols;
    const col = i % cols;
    slots.push(clampDest(
      x + (col - (inRow - 1) / 2) * spacing,
      y + (row - (rows - 1) / 2) * spacing,
    ));
  }
  // hand each slot to the nearest remaining man so paths don't cross
  const pool = units.slice();
  for (const s of slots) {
    let bi = 0, bd = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const d = dist(pool[i], s);
      if (d < bd) { bd = d; bi = i; }
    }
    pool.splice(bi, 1)[0].moveTo = s;
  }
}

canvas.addEventListener('click', e => {
  if (suppressClick) { suppressClick = false; return; }
  if (!isPlaying()) return;
  updatePointer(e);

  if (placing) { place(placing, mouse.x, mouse.y); return; }

  handleCanvasTap(e.shiftKey);
});

canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  clearPlacing();
  placeTouch = null;
  drag = null;
  if (G) G.selected = [];
  syncSelectionMobile();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (paused) { resumeGame(); return; }
    if (placing) { clearPlacing(); return; }
    if (G && G.selected.length) { G.selected = []; syncSelectionMobile(); return; }
    if (drag) { drag = null; return; }
    if (running && G && !G.over) { pauseGame(); return; }
    clearPlacing(); drag = null; if (G) G.selected = [];
    return;
  }
  if (isSandbox() && isPlaying()) {
    if (e.key === ']') { jumpSandboxWave(e.shiftKey ? 5 : e.ctrlKey ? 10 : 1); return; }
  }
  if (inBuildPhase() && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    startAxisCombat();
    return;
  }
  const k = e.key.toUpperCase();
  const p = activePlaceables().find(pl => pl.hotkey === k);
  if (p) selectPlaceable(p);
});

for (const btn of document.querySelectorAll('[data-wave-skip]')) {
  btn.addEventListener('click', () => jumpSandboxWave(Number(btn.dataset.waveSkip)));
}

// ============================================================ codex

const CODEX_PW = 72, CODEX_PH = 72;
let codexTab = 'troops';

const SOUND_INFO = [
  { key: 'sfx-rifle', name: 'Rifle Shot', category: 'WEAPONS',
    desc: 'Rifle-class infantry fire — riflemen, grenadiers, flamers, and enemy rifles.',
    play: () => SFX.rifle() },
  { key: 'sfx-mg', name: 'Machine Gun', category: 'WEAPONS',
    desc: 'Automatic weapons — BAR gunners, engineers, tank coax MG, and enemy MGs.',
    play: () => SFX.mg() },
  { key: 'sfx-hmg', name: 'Heavy Machine Gun', category: 'WEAPONS',
    desc: 'Mounted .50 cal fire from jeeps, Kübelwagens, and P-47 strafing runs.',
    play: () => SFX.hmg() },
  { key: 'sfx-sniper', name: 'Sniper Shot', category: 'WEAPONS',
    desc: 'Long-range rifle fire from allied and enemy snipers.',
    play: () => SFX.sniper() },
  { key: 'sfx-pistol', name: 'Pistol Shot', category: 'WEAPONS',
    desc: 'Sidearm fire — medics, officers, bazooka backup, and enemy grenadiers.',
    play: () => SFX.pistol() },
  { key: 'sfx-shotgun', name: 'Shotgun Blast', category: 'WEAPONS',
    desc: 'Buckshot from the allied shotgunner at close range.',
    play: () => SFX.shotgun() },
  { key: 'sfx-flame', name: 'Flamethrower', category: 'WEAPONS',
    desc: 'Roaring flame spray while allied or enemy flamethrowers are active.',
    play: () => SFX.flame() },
  { key: 'sfx-grenade', name: 'Grenade Toss', category: 'EXPLOSIONS',
    desc: 'Grenade pin pull and throw from allied grenadiers and enemy stormtroopers.',
    play: () => SFX.grenadeToss() },
  { key: 'sfx-rocket', name: 'Rocket Launch', category: 'EXPLOSIONS',
    desc: 'Bazooka rocket ignition and launch.',
    play: () => SFX.rocket() },
  { key: 'sfx-boom-small', name: 'Small Explosion', category: 'EXPLOSIONS',
    desc: 'Light blasts — grenades, rockets, mines, AT gun, and tank cannon fire.',
    play: () => SFX.boom(false) },
  { key: 'sfx-boom-big', name: 'Big Explosion', category: 'EXPLOSIONS',
    desc: 'Heavy detonations — artillery barrages, tank wrecks, and large shell impacts.',
    play: () => SFX.boom(true) },
  { key: 'sfx-brake', name: 'Brake Screech', category: 'VEHICLES & AIR',
    desc: 'Hard stop when vehicles dismount troops — halftracks and motorcycles.',
    play: () => SFX.brake() },
  { key: 'sfx-plane', name: 'Plane Engine', category: 'VEHICLES & AIR',
    desc: 'Looping aircraft engine during strafing runs and transport flybys.',
    play: () => SFX.plane() },
  { key: 'sfx-planeflyby', name: 'Plane Flyby', category: 'VEHICLES & AIR',
    desc: 'Doppler pass at the start of airstrikes and paratrooper drops.',
    play: () => SFX.planeFlyby() },
  { key: 'sfx-hammer', name: 'Hammer', category: 'GAME EVENTS',
    desc: 'Engineer fortification and repair work on emplacements.',
    play: () => SFX.hammer() },
  { key: 'sfx-click', name: 'Click', category: 'UI',
    desc: 'Toolbar selection, unit placement, movement orders, and wave skip.',
    play: () => SFX.click() },
  { key: 'sfx-error', name: 'Error', category: 'UI',
    desc: 'Rejected action — insufficient TP, officer cap, or invalid placement.',
    play: () => SFX.error() },
  { key: 'sfx-thunk', name: 'Thunk', category: 'UI',
    desc: 'Dull impact tone — defined but not yet wired to a gameplay trigger.',
    play: () => SFX.thunk() },
];

const SOUND_CATEGORY_BY_KEY = Object.fromEntries(SOUND_INFO.map(s => [s.key, s.category]));

function drawCodexSoundIcon(category) {
  const c = ctx;
  const cx = CODEX_PW / 2, cy = CODEX_PH / 2;
  c.fillStyle = '#2a2a1e';
  c.fillRect(0, 0, CODEX_PW, CODEX_PH);

  if (category === 'WEAPONS') {
    c.fillStyle = '#ffd94a';
    c.beginPath();
    c.moveTo(cx - 4, cy + 6);
    c.lineTo(cx + 14, cy - 2);
    c.lineTo(cx + 10, cy + 2);
    c.lineTo(cx + 18, cy + 8);
    c.lineTo(cx + 6, cy + 10);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,180,60,0.45)';
    c.beginPath(); c.arc(cx + 8, cy, 12, 0, 7); c.fill();
  } else if (category === 'EXPLOSIONS') {
    c.fillStyle = 'rgba(255,120,40,0.55)';
    c.beginPath(); c.arc(cx, cy + 2, 18, 0, 7); c.fill();
    c.fillStyle = '#ffd94a';
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * 10, cy + 2 + Math.sin(a) * 10);
      c.lineTo(cx + Math.cos(a) * 20, cy + 2 + Math.sin(a) * 20);
      c.lineWidth = 2;
      c.strokeStyle = '#ffd94a';
      c.stroke();
    }
  } else if (category === 'VEHICLES & AIR') {
    c.fillStyle = '#4a5a3f';
    c.beginPath();
    c.ellipse(cx, cy + 4, 22, 6, 0, 0, 7);
    c.fill();
    c.strokeStyle = '#8a8668';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx, cy - 16);
    c.lineTo(cx, cy + 2);
    c.stroke();
    c.fillStyle = '#6a7a5a';
    c.beginPath();
    c.moveTo(cx - 16, cy - 8);
    c.lineTo(cx + 16, cy - 8);
    c.lineTo(cx + 12, cy - 14);
    c.lineTo(cx - 12, cy - 14);
    c.closePath();
    c.fill();
  } else if (category === 'GAME EVENTS') {
    c.fillStyle = '#b8443a';
    c.beginPath();
    c.moveTo(cx - 10, cy + 14);
    c.lineTo(cx - 10, cy - 6);
    c.quadraticCurveTo(cx - 10, cy - 18, cx, cy - 18);
    c.quadraticCurveTo(cx + 10, cy - 18, cx + 10, cy - 6);
    c.lineTo(cx + 10, cy + 14);
    c.closePath();
    c.fill();
    c.fillStyle = '#ffd94a';
    c.beginPath(); c.arc(cx, cy - 4, 5, 0, 7); c.fill();
  } else {
    c.fillStyle = '#4a4836';
    c.beginPath();
    c.moveTo(cx - 8, cy - 10);
    c.lineTo(cx - 8, cy + 10);
    c.quadraticCurveTo(cx - 8, cy + 18, cx, cy + 18);
    c.quadraticCurveTo(cx + 8, cy + 18, cx + 8, cy + 10);
    c.lineTo(cx + 8, cy - 10);
    c.closePath();
    c.fill();
    c.fillStyle = '#8a8668';
    c.beginPath();
    c.moveTo(cx + 8, cy - 4);
    c.lineTo(cx + 20, cy - 10);
    c.lineTo(cx + 20, cy + 2);
    c.closePath();
    c.fill();
    c.fillStyle = '#ffd94a';
    c.beginPath(); c.arc(cx, cy + 2, 3, 0, 7); c.fill();
  }
}

function drawCodexIcon(key) {
  if (SOUND_CATEGORY_BY_KEY[key]) {
    drawCodexSoundIcon(SOUND_CATEGORY_BY_KEY[key]);
    return;
  }
  const c = ctx;
  const cx = CODEX_PW / 2, cy = CODEX_PH / 2;
  c.fillStyle = '#2a2a1e';
  c.fillRect(0, 0, CODEX_PW, CODEX_PH);

  if (key === 'wire') {
    c.strokeStyle = '#6b6354';
    c.lineWidth = 1.5;
    for (const yy of [-6, 0, 6]) {
      c.beginPath();
      c.moveTo(10, cy + yy);
      for (let x = 10; x <= CODEX_PW - 10; x += 5) {
        c.lineTo(x, cy + yy + (x / 5 % 2 ? 2 : -2));
      }
      c.stroke();
    }
    c.strokeStyle = '#4b4438';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(14, cy + 8); c.lineTo(18, cy - 10); c.stroke();
    c.beginPath(); c.moveTo(CODEX_PW - 14, cy + 8); c.lineTo(CODEX_PW - 18, cy - 10); c.stroke();
  } else if (key === 'sandbags') {
    c.fillStyle = '#6a5a42';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        c.fillRect(14 + col * 12 + (row % 2 ? 4 : 0), 46 - row * 12, 11, 9);
      }
    }
    c.strokeStyle = '#4a4030';
    c.lineWidth = 1;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        c.strokeRect(14 + col * 12 + (row % 2 ? 4 : 0), 46 - row * 12, 11, 9);
      }
    }
  } else if (key === 'bunker') {
    // concrete pillbox, firing slit forward
    c.fillStyle = '#7f7d72';
    c.strokeStyle = '#4e4c44';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(12, 52);
    c.lineTo(12, 30);
    c.quadraticCurveTo(12, 20, 22, 20);
    c.lineTo(CODEX_PW - 22, 20);
    c.quadraticCurveTo(CODEX_PW - 12, 20, CODEX_PW - 12, 30);
    c.lineTo(CODEX_PW - 12, 52);
    c.closePath();
    c.fill(); c.stroke();
    c.fillStyle = '#93917f';
    c.fillRect(17, 25, CODEX_PW - 34, 8);
    c.fillStyle = '#1e1c16';
    c.fillRect(20, 28, CODEX_PW - 40, 5);
  } else if (key === 'camonest') {
    // dug-in mound, same footprint as the bunker, screened in foliage
    c.fillStyle = '#4a5138';
    c.strokeStyle = '#33392a';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(12, 52);
    c.lineTo(12, 30);
    c.quadraticCurveTo(12, 20, 22, 20);
    c.lineTo(CODEX_PW - 22, 20);
    c.quadraticCurveTo(CODEX_PW - 12, 20, CODEX_PW - 12, 30);
    c.lineTo(CODEX_PW - 12, 52);
    c.closePath();
    c.fill(); c.stroke();
    c.fillStyle = '#5c6b42';
    for (const [fx, fy, fr] of [[20, 24, 5], [cx, 20, 6], [CODEX_PW - 20, 25, 5], [16, 40, 4], [CODEX_PW - 16, 40, 4]]) {
      c.beginPath(); c.arc(fx, fy, fr, 0, 7); c.fill();
    }
    c.fillStyle = '#161810';
    c.fillRect(20, 28, CODEX_PW - 40, 5);
  } else if (key === 'watchtower') {
    // wooden lookout post: crossed legs, a small platform, up top
    c.strokeStyle = '#6b5a3e';
    c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(cx - 16, CODEX_PH - 10); c.lineTo(cx - 6, 18); c.stroke();
    c.beginPath(); c.moveTo(cx + 16, CODEX_PH - 10); c.lineTo(cx + 6, 18); c.stroke();
    c.lineWidth = 1.4;
    for (const yy of [26, 38, 50]) {
      c.beginPath();
      c.moveTo(cx - 16 + (CODEX_PH - 10 - yy) * 0.2, yy);
      c.lineTo(cx + 16 - (CODEX_PH - 10 - yy) * 0.2, yy);
      c.stroke();
    }
    c.fillStyle = '#7a684a';
    c.fillRect(cx - 13, 14, 26, 6);
    c.strokeStyle = '#4e4230';
    c.lineWidth = 1.5;
    c.strokeRect(cx - 13, 4, 26, 10);
  } else if (key === 'mine') {
    c.fillStyle = '#3a3828';
    c.beginPath(); c.arc(cx, cy + 4, 14, 0, 7); c.fill();
    c.strokeStyle = '#8a8668';
    c.lineWidth = 1.2;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * 10, cy + 4 + Math.sin(a) * 10);
      c.lineTo(cx + Math.cos(a) * 18, cy + 4 + Math.sin(a) * 18);
      c.stroke();
    }
    c.fillStyle = '#ffd94a';
    c.beginPath(); c.arc(cx, cy + 4, 4, 0, 7); c.fill();
  } else if (key === 'mortar') {
    c.strokeStyle = '#8a8668';
    c.lineWidth = 1.5;
    c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(16, CODEX_PH - 14); c.quadraticCurveTo(cx, 10, CODEX_PW - 16, CODEX_PH - 14);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#5a5c42';
    c.beginPath(); c.arc(CODEX_PW - 16, CODEX_PH - 14, 5, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,120,40,0.5)';
    c.beginPath(); c.arc(CODEX_PW - 16, CODEX_PH - 14, 10, 0, 7); c.fill();
  } else if (key === 'artillery') {
    for (const [ox, oy] of [[cx - 14, cy + 6], [cx + 10, cy - 4], [cx - 2, cy + 14]]) {
      c.fillStyle = 'rgba(255,100,30,0.35)';
      c.beginPath(); c.arc(ox, oy, 12, 0, 7); c.fill();
      c.fillStyle = '#ffd94a';
      c.beginPath(); c.arc(ox, oy, 4, 0, 7); c.fill();
    }
  } else if (key === 'fog') {
    c.fillStyle = 'rgba(140,140,130,0.35)';
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.ellipse(12 + i * 14, cy + Math.sin(i) * 8, 16, 10, 0, 0, 7);
      c.fill();
    }
  } else if (key === 'fng') {
    c.fillStyle = '#5b6b4a';
    c.beginPath(); c.arc(cx, cy + 2, 16, 0, 7); c.fill();
    c.fillStyle = '#4a5d3a';
    c.beginPath(); c.ellipse(cx, cy + 6, 12, 8, 0, 0, 7); c.fill();
    c.fillStyle = '#5b6b4a';
    c.beginPath(); c.arc(cx, cy - 6, 8, 0, 7); c.fill();
    c.strokeStyle = '#26261e';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx, cy + 2); c.lineTo(cx, cy - 18); c.stroke();
  } else if (key === 'barrage') {
    c.fillStyle = '#5a5a48';
    c.beginPath();
    c.moveTo(cx, 12);
    c.lineTo(cx + 7, 28);
    c.lineTo(cx + 3, 28);
    c.lineTo(cx + 5, CODEX_PH - 12);
    c.lineTo(cx - 5, CODEX_PH - 12);
    c.lineTo(cx - 3, 28);
    c.lineTo(cx - 7, 28);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,120,40,0.45)';
    c.beginPath(); c.arc(cx, CODEX_PH - 10, 14, 0, 7); c.fill();
  } else if (key === 'paradrop') {
    c.strokeStyle = '#c9c19a';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(cx - 18, cy - 16);
    c.quadraticCurveTo(cx, cy - 28, cx + 18, cy - 16);
    c.lineTo(cx + 18, cy - 16);
    c.quadraticCurveTo(cx, cy - 4, cx - 18, cy - 16);
    c.stroke();
    c.strokeStyle = '#8a8668';
    c.beginPath(); c.moveTo(cx, cy - 16); c.lineTo(cx, cy + 10); c.stroke();
    c.fillStyle = '#61615a';
    c.beginPath(); c.arc(cx, cy + 12, 5, 0, 7); c.fill();
  } else if (key === 'airstrike') {
    c.fillStyle = '#4a5a3f';
    c.beginPath();
    c.moveTo(10, cy + 4);
    c.lineTo(CODEX_PW - 10, cy - 2);
    c.lineTo(CODEX_PW - 14, cy + 2);
    c.lineTo(CODEX_PW - 10, cy + 6);
    c.lineTo(10, cy + 10);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,120,40,0.4)';
    for (const bx of [28, 40, 52]) {
      c.beginPath(); c.arc(bx, cy + 16, 5, 0, 7); c.fill();
    }
  } else if (key === 'special') {
    // military map symbol: stacked assault chevrons driving downfield
    c.strokeStyle = '#b8443a';
    c.lineWidth = 3.5;
    c.lineJoin = 'miter';
    for (let i = 0; i < 3; i++) {
      const y = 16 + i * 13;
      c.beginPath();
      c.moveTo(cx - 15, y);
      c.lineTo(cx, y + 9);
      c.lineTo(cx + 15, y);
      c.stroke();
    }
  }
}

function renderPortrait(typeKey, side) {
  const pc = document.createElement('canvas');
  pc.width = CODEX_PW;
  pc.height = CODEX_PH;
  const savedCtx = ctx;
  const savedG = G;
  ctx = pc.getContext('2d');
  G = { selected: [] };

  const defenseKeys = ['wire', 'sandbags', 'bunker', 'watchtower', 'camonest', 'mine', 'mortar', 'artillery'];
  const eventKeys = EVENT_INFO.map(e => e.key);
  const soundKeys = SOUND_INFO.map(s => s.key);
  if (defenseKeys.includes(typeKey) || eventKeys.includes(typeKey) || soundKeys.includes(typeKey)) {
    drawCodexIcon(typeKey);
  } else {
    ctx.fillStyle = '#2a2a1e';
    ctx.fillRect(0, 0, CODEX_PW, CODEX_PH);
    const actor = side === 'us'
      ? makeUnit(typeKey, CODEX_PW / 2, CODEX_PH / 2 + 6)
      : makeEnemy(typeKey, CODEX_PW / 2, CODEX_PH / 2 + 6);
    actor.hp = actor.maxhp;
    actor.face = side === 'us' ? -Math.PI / 2 : Math.PI / 2;
    actor.turret = actor.face;

    const t = actor.t;
    if (t.tank) {
      ctx.save();
      ctx.translate(CODEX_PW / 2, CODEX_PH / 2 + 4);
      ctx.scale(0.72, 0.72);
      ctx.translate(-CODEX_PW / 2, -(CODEX_PH / 2 + 4));
      drawTank(actor);
      ctx.restore();
    } else if (t.vehicle && t.apc) {
      ctx.save();
      ctx.translate(CODEX_PW / 2, CODEX_PH / 2 + 2);
      ctx.scale(0.8, 0.8);
      ctx.translate(-CODEX_PW / 2, -(CODEX_PH / 2 + 2));
      drawHalftrack(actor);
      ctx.restore();
    } else if (t.vehicle) {
      ctx.save();
      ctx.translate(CODEX_PW / 2, CODEX_PH / 2 + 2);
      ctx.scale(0.85, 0.85);
      ctx.translate(-CODEX_PW / 2, -(CODEX_PH / 2 + 2));
      drawJeep(actor);
      ctx.restore();
    } else if (t.bike) {
      drawBike(actor);
    } else if (t.atgun) {
      ctx.save();
      ctx.translate(CODEX_PW / 2, CODEX_PH / 2 + 2);
      ctx.scale(1.3, 1.3);
      ctx.translate(-CODEX_PW / 2, -(CODEX_PH / 2 + 2));
      drawATGun(actor);
      ctx.restore();
    } else if (t.v2) {
      // the erector trailer is taller than it is wide (missile raised well
      // above the truck cab), so it needs a smaller scale and a lower pivot
      // than the other vehicle portraits to avoid clipping the nose
      ctx.save();
      ctx.translate(CODEX_PW / 2, CODEX_PH / 2 + 19);
      ctx.scale(0.7, 0.7);
      ctx.translate(-CODEX_PW / 2, -(CODEX_PH / 2 + 19));
      drawV2Launcher(actor);
      ctx.restore();
    } else {
      drawSoldier(actor);
    }
  }

  ctx = savedCtx;
  G = savedG;
  return pc;
}

function formatUnitStats(p, ut) {
  const parts = [`${ut.hp} HP`];
  if (ut.dmg > 0) parts.push(`${ut.dmg} DMG`);
  if (ut.range > 0) parts.push(`${ut.range} RNG`);
  if (ut.shotgun) parts.push('BUCKSHOT');
  if (ut.flame) parts.push('FLAME');
  if (ut.rocket) parts.push('ROCKET');
  if (ut.mortar) parts.push('MORTAR');
  if (ut.atgun) parts.push('AP SHELL', 'VEHICLES ONLY', 'IMMOBILE');
  parts.push(`${p.cost} TP`, `[${p.hotkey}]`);
  return parts.join(' · ');
}

function codexEntries(tab) {
  if (tab === 'troops') {
    return PLACEABLES.filter(p => p.kind === 'unit').map(p => {
      const ut = UNIT_TYPES[p.key];
      return {
        key: p.key,
        side: 'us',
        name: ut.name,
        stats: formatUnitStats(p, ut),
        desc: p.desc,
      };
    });
  }
  if (tab === 'defenses') {
    return PLACEABLES.filter(p => p.kind !== 'unit').map(p => ({
      key: p.key,
      side: null,
      name: p.label,
      stats: `${p.cost} TP · [${p.hotkey}] · ${p.kind.toUpperCase()}`,
      desc: p.desc,
    }));
  }
  if (tab === 'enemies') {
    return Object.entries(ENEMY_TYPES).map(([key, t]) => {
      const parts = [`${t.hp} HP`, `${t.reward} TP REWARD`];
      if (t.dmg > 0) parts.splice(1, 0, `${t.dmg} DMG`);
      if (t.range > 0) parts.splice(t.dmg > 0 ? 2 : 1, 0, `${t.range} RNG`);
      if (t.flame) parts.push('FLAME');
      if (t.tank) parts.push('ARMOR');
      if (t.v2) parts.push('V2 ROCKET', 'HUGE BLAST', 'IMMOBILE');
      return {
        key,
        side: 'de',
        name: t.name,
        stats: parts.join(' · '),
        desc: ENEMY_INFO[key],
      };
    });
  }
  if (tab === 'sounds') {
    return SOUND_INFO.map(s => ({
      key: s.key,
      side: null,
      name: s.name,
      stats: s.category,
      desc: s.desc,
      play: s.play,
    }));
  }
  return EVENT_INFO.map(ev => ({
    key: ev.key,
    side: null,
    name: ev.name,
    stats: `FROM WAVE ${ev.wave}`,
    desc: ev.desc,
  }));
}

function buildCodex(tab) {
  codexTab = tab;
  for (const btn of document.querySelectorAll('.codex-tab')) {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  }
  const list = el('codex-list');
  list.innerHTML = '';
  for (const entry of codexEntries(tab)) {
    const card = document.createElement('div');
    card.className = 'codex-entry';

    const portrait = document.createElement('canvas');
    portrait.className = 'codex-portrait';
    portrait.width = CODEX_PW;
    portrait.height = CODEX_PH;
    const pctx = portrait.getContext('2d');
    pctx.drawImage(renderPortrait(entry.key, entry.side), 0, 0);

    const body = document.createElement('div');
    body.className = 'codex-body';
    body.innerHTML =
      `<div class="codex-name">${entry.name}</div>` +
      `<div class="codex-stats">${entry.stats}</div>` +
      `<div class="codex-desc">${entry.desc}</div>`;

    if (entry.play) {
      const playBtn = document.createElement('button');
      playBtn.className = 'codex-play-btn';
      playBtn.textContent = 'PLAY';
      playBtn.addEventListener('click', () => {
        SFX.resume();
        entry.play();
      });
      body.appendChild(playBtn);
    }

    card.appendChild(portrait);
    card.appendChild(body);
    list.appendChild(card);
  }
}

function openCodex() {
  codexReturnTo = 'intro';
  buildCodex(codexTab);
  el('intro').classList.add('hidden');
  el('codex').classList.remove('hidden');
}

function openCodexFromPause() {
  codexReturnTo = 'pause';
  buildCodex(codexTab);
  el('pause').classList.add('hidden');
  el('codex').classList.remove('hidden');
}

function closeCodex() {
  el('codex').classList.add('hidden');
  if (codexReturnTo === 'pause') {
    el('pause').classList.remove('hidden');
  } else {
    el('intro').classList.remove('hidden');
  }
}

el('codex-btn').addEventListener('click', openCodex);
el('codex-back-btn').addEventListener('click', closeCodex);
for (const btn of document.querySelectorAll('.codex-tab')) {
  btn.addEventListener('click', () => buildCodex(btn.dataset.tab));
}

// ============================================================ axis research

const RESEARCH_KEY = 'axisResearch';
const RESEARCH_VERSION = 1;

function defaultAxisResearch() {
  return { version: RESEARCH_VERSION, rp: 0, unlocked: AXIS_STARTER_UNITS.slice(), earned: {} };
}

function loadAxisResearch() {
  try {
    const raw = localStorage.getItem(RESEARCH_KEY);
    if (!raw) return migrateAxisResearch(defaultAxisResearch());
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || data.version !== RESEARCH_VERSION) {
      return migrateAxisResearch(defaultAxisResearch());
    }
    data.unlocked = Array.isArray(data.unlocked) ? data.unlocked : AXIS_STARTER_UNITS.slice();
    data.earned = data.earned && typeof data.earned === 'object' ? data.earned : {};
    data.rp = Number.isFinite(data.rp) ? data.rp : 0;
    return migrateAxisResearch(data);
  } catch {
    return migrateAxisResearch(defaultAxisResearch());
  }
}

function saveAxisResearch(data) {
  localStorage.setItem(RESEARCH_KEY, JSON.stringify(data));
}

function migrateAxisResearch(data) {
  const progress = loadProgress();
  let changed = false;
  if (data.unlocked.includes('efall')) {
    data.unlocked = data.unlocked.filter(k => k !== 'efall');
    if (!data.unlocked.includes('eparadrop')) data.unlocked.push('eparadrop');
    changed = true;
  }
  for (let i = 1; i <= 13; i++) {
    const id = 'axis' + i;
    if (progress.completed[id] && !data.earned[id]) {
      const level = LEVELS[id];
      if (level) {
        data.rp += 12 + i * 8;
        data.earned[id] = true;
        changed = true;
      }
    }
  }
  if (changed) saveAxisResearch(data);
  return data;
}

function axisLevelNum(id) {
  const m = /^axis(\d+)$/.exec(id);
  return m ? parseInt(m[1], 10) : 0;
}

function axisCampaignTierReached() {
  let tier = 1;
  for (let i = 1; i <= 13; i++) {
    if (isLevelUnlocked('axis' + i, AXIS_CAMPAIGN)) tier = i;
  }
  return tier;
}

function allAxisResearchEntries() {
  return [...AXIS_PLACEABLES, ...Object.values(AXIS_CAMPAIGN_EXTRA_ENTRIES)];
}

function axisResearchEntry(key) {
  return allAxisResearchEntries().find(p => p.key === key);
}

function axisResearchCost(key) {
  if (AXIS_STARTER_UNITS.includes(key)) return 0;
  return AXIS_RESEARCH_COSTS[key] != null ? AXIS_RESEARCH_COSTS[key] : null;
}

function axisResearchTierGate(key) {
  return AXIS_RESEARCH_TIERS[key] || 0;
}

function axisResearchVisible(key) {
  const tier = axisResearchTierGate(key);
  return !tier || axisCampaignTierReached() >= tier;
}

function axisPlaceablesForResearch() {
  const { unlocked } = loadAxisResearch();
  const set = new Set(unlocked);
  return allAxisResearchEntries().filter(p => set.has(p.key));
}

function calcAxisRPAward(level, wiped, wave, axisWaves) {
  const n = axisLevelNum(level.id);
  let rp = 12 + n * 8;
  if (wiped) rp += 8;
  const unused = Math.max(0, axisWaves - wave);
  if (unused >= 2) rp += unused * 4;
  return rp;
}

function awardAxisRP(level, wiped, wave) {
  const data = loadAxisResearch();
  if (data.earned[level.id]) return 0;
  const rp = calcAxisRPAward(level, wiped, wave, level.axisWaves);
  data.rp += rp;
  data.earned[level.id] = true;
  saveAxisResearch(data);
  return rp;
}

function buyAxisResearch(key) {
  const data = loadAxisResearch();
  if (data.unlocked.includes(key)) return false;
  if (!axisResearchVisible(key)) return false;
  const cost = axisResearchCost(key);
  if (cost == null || cost > data.rp) return false;
  data.rp -= cost;
  data.unlocked.push(key);
  saveAxisResearch(data);
  return true;
}

function syncAxisRPDisplays() {
  const data = loadAxisResearch();
  const text = data.rp + ' RP';
  const bal = el('axis-rp-balance');
  const briefBal = el('axis-briefing-rp');
  const researchBal = el('axis-research-rp');
  if (bal) bal.textContent = text;
  if (briefBal) briefBal.textContent = text;
  if (researchBal) researchBal.textContent = text;
}

function buildAxisResearchUI() {
  const grid = el('axis-research-grid');
  if (!grid) return;
  const data = loadAxisResearch();
  const unlocked = new Set(data.unlocked);
  grid.replaceChildren();
  const keys = [
    ...AXIS_PLACEABLES.map(p => p.key),
    ...Object.keys(AXIS_CAMPAIGN_EXTRA_ENTRIES),
  ];
  for (const key of keys) {
    const entry = axisResearchEntry(key);
    if (!entry) continue;
    const cost = axisResearchCost(key);
    const owned = unlocked.has(key);
    const visible = axisResearchVisible(key);
    const tier = axisResearchTierGate(key);
    const card = document.createElement('div');
    card.className = 'research-card';
    if (owned) card.classList.add('owned');
    if (!visible) card.classList.add('locked');
    const title = document.createElement('div');
    title.className = 'research-card-title';
    title.textContent = AXIS_RESEARCH_LABELS[key] || entry.label;
    const stats = document.createElement('div');
    stats.className = 'research-card-stats';
    stats.textContent = owned
      ? 'OWNED · ' + entry.cost + ' TP per deploy'
      : (cost === 0 ? 'STARTER' : cost + ' RP') + ' · ' + entry.cost + ' TP';
    const desc = document.createElement('div');
    desc.className = 'research-card-desc';
    desc.textContent = entry.desc;
    card.appendChild(title);
    card.appendChild(stats);
    card.appendChild(desc);
    if (!visible) {
      const lock = document.createElement('div');
      lock.className = 'research-card-lock';
      lock.textContent = 'Reach Level ' + tier;
      card.appendChild(lock);
    } else if (!owned && cost > 0) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'research-buy-btn';
      btn.textContent = 'BUY (' + cost + ' RP)';
      btn.disabled = data.rp < cost;
      btn.addEventListener('click', () => {
        if (buyAxisResearch(key)) {
          SFX.click();
          buildAxisResearchUI();
          syncAxisRPDisplays();
        }
      });
      card.appendChild(btn);
    } else if (owned) {
      const badge = document.createElement('div');
      badge.className = 'research-card-owned';
      badge.textContent = 'OWNED';
      card.appendChild(badge);
    }
    grid.appendChild(card);
  }
  syncAxisRPDisplays();
}

function openAxisResearch() {
  buildAxisResearchUI();
  el('intro').classList.add('hidden');
  el('axis-select').classList.add('hidden');
  el('axis-briefing').classList.add('hidden');
  el('axis-research').classList.remove('hidden');
}

function closeAxisResearch() {
  el('axis-research').classList.add('hidden');
  if (pendingAxisLevelId) {
    openAxisBriefing(pendingAxisLevelId);
  } else {
    buildAxisSelect();
    syncAxisRPDisplays();
    el('axis-select').classList.remove('hidden');
  }
}

// ============================================================ campaign progress

const PROGRESS_KEY = 'campaignProgress';
const PROGRESS_VERSION = 1;

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { version: PROGRESS_VERSION, completed: {} };
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || data.version !== PROGRESS_VERSION) {
      return { version: PROGRESS_VERSION, completed: {} };
    }
    return { version: PROGRESS_VERSION, completed: data.completed || {} };
  } catch {
    return { version: PROGRESS_VERSION, completed: {} };
  }
}

function saveProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function markLevelComplete(id) {
  const progress = loadProgress();
  progress.completed[id] = true;
  saveProgress(progress);
}

function isLevelComplete(id) {
  return !!loadProgress().completed[id];
}

function isLevelUnlocked(id, campaign) {
  const idx = campaign.indexOf(id);
  if (idx < 0) return false;
  if (idx === 0) return true;
  return isLevelComplete(campaign[idx - 1]);
}

// ============================================================ settings

const TOOLBAR_SIZE_KEY = 'toolbarSize';
const TOOLBAR_SIZE_MIN = 80;
const TOOLBAR_SIZE_MAX = 400;
const TOOLBAR_SIZE_DEFAULT = 100;
const SOUND_VOLUME_KEY = 'soundVolume';
const SOUND_VOLUME_DEFAULT = 100;
const SOUND_MUTED_KEY = 'soundMuted';

function clampToolbarSize(pct) {
  return Math.max(TOOLBAR_SIZE_MIN, Math.min(TOOLBAR_SIZE_MAX, Math.round(pct)));
}

function loadToolbarSize() {
  const saved = parseInt(localStorage.getItem(TOOLBAR_SIZE_KEY), 10);
  if (Number.isFinite(saved)) return clampToolbarSize(saved);
  return touchUI() ? 85 : TOOLBAR_SIZE_DEFAULT;
}

function applyToolbarSize(pct) {
  const size = clampToolbarSize(pct);
  const stage = el('stage');
  if (stage) stage.style.setProperty('--tool-scale', (size / 100).toString());
  const slider = el('toolbar-size-slider');
  const label = el('toolbar-size-label');
  if (slider) slider.value = size;
  if (label) label.textContent = size + '%';
  syncToolbarLayout();
  return size;
}

function saveToolbarSize(pct) {
  const size = applyToolbarSize(pct);
  localStorage.setItem(TOOLBAR_SIZE_KEY, String(size));
}

function clampSoundVolume(pct) {
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function loadSoundVolume() {
  const saved = parseInt(localStorage.getItem(SOUND_VOLUME_KEY), 10);
  return Number.isFinite(saved) ? clampSoundVolume(saved) : SOUND_VOLUME_DEFAULT;
}

function applySoundVolume(pct) {
  const vol = SFX.setVolume(clampSoundVolume(pct));
  const slider = el('sound-volume-slider');
  const label = el('sound-volume-label');
  if (slider) slider.value = vol;
  if (label) label.textContent = vol + '%';
  return vol;
}

function saveSoundVolume(pct) {
  const vol = applySoundVolume(pct);
  localStorage.setItem(SOUND_VOLUME_KEY, String(vol));
}

function loadSoundMuted() {
  const saved = localStorage.getItem(SOUND_MUTED_KEY);
  if (saved === 'true') return true;
  if (saved === 'false') return false;
  return false;
}

function applySoundMuted(muted) {
  SFX.setMuted(muted);
  syncMuteButtons();
  return muted;
}

function saveSoundMuted(muted) {
  const on = applySoundMuted(muted);
  localStorage.setItem(SOUND_MUTED_KEY, String(on));
}

function applySavedSettings() {
  applyToolbarSize(loadToolbarSize());
  applySoundVolume(loadSoundVolume());
  applySoundMuted(loadSoundMuted());
}

function openSettings(from) {
  settingsReturnTo = from;
  applySavedSettings();
  el('settings').classList.remove('hidden');
  if (from === 'pause') el('pause').classList.add('hidden');
  else el('intro').classList.add('hidden');
}

function closeSettings() {
  el('settings').classList.add('hidden');
  if (settingsReturnTo === 'pause') el('pause').classList.remove('hidden');
  else el('intro').classList.remove('hidden');
}

el('settings-btn').addEventListener('click', () => openSettings('intro'));
el('pause-settings-btn').addEventListener('click', () => openSettings('pause'));
el('settings-back-btn').addEventListener('click', closeSettings);
el('settings-mute-btn').addEventListener('click', () => {
  saveSoundMuted(!SFX.muted);
});
el('toolbar-size-slider').addEventListener('input', e => {
  saveToolbarSize(Number(e.target.value));
});
el('sound-volume-slider').addEventListener('input', e => {
  saveSoundVolume(Number(e.target.value));
});

function syncSpeedButton() {
  const btn = el('speed-btn');
  if (!btn) return;
  btn.textContent = gameSpeed + 'x';
}

function cycleSpeed() {
  const idx = SPEED_STEPS.indexOf(gameSpeed);
  gameSpeed = SPEED_STEPS[(idx + 1) % SPEED_STEPS.length];
  syncSpeedButton();
  SFX.click();
}

function pauseGame() {
  if (!running || !G || G.over || paused) return;
  paused = true;
  clearPlacing();
  drag = null;
  clearViewPan();
  placeTouch = null;
  mobileToolbarMinimized = false;
  G.selected = [];
  el('pause').classList.remove('hidden');
  refreshHUD();
}

function resumeGame() {
  if (!paused) return;
  paused = false;
  el('pause').classList.add('hidden');
  lastT = performance.now();
  refreshHUD();
}

function returnToMenu() {
  running = false;
  paused = false;
  placing = null;
  mobileToolbarMinimized = false;
  activePointers.clear();
  viewGesture = null;
  pendingAxisLevelId = null;
  pendingAlliedLevelId = null;
  el('pause').classList.add('hidden');
  el('gameover').classList.add('hidden');
  el('codex').classList.add('hidden');
  el('settings').classList.add('hidden');
  el('endless-select').classList.add('hidden');
  el('allied-select').classList.add('hidden');
  el('allied-briefing').classList.add('hidden');
  el('axis-select').classList.add('hidden');
  el('axis-briefing').classList.add('hidden');
  el('axis-research').classList.add('hidden');
  el('commando-select').classList.add('hidden');
  el('intro').classList.remove('hidden');
  syncMobileViewUI();
  syncMobileChrome();
}

function openEndlessSelect() {
  el('intro').classList.add('hidden');
  el('endless-select').classList.remove('hidden');
}

function closeEndlessSelect() {
  el('endless-select').classList.add('hidden');
  el('intro').classList.remove('hidden');
}

// the Axis campaign, in order — beat each level to unlock the next
const AXIS_CAMPAIGN = [
  'axis1', 'axis2', 'axis3', 'axis4', 'axis5', 'axis6', 'axis7',
  'axis8', 'axis9', 'axis10', 'axis11', 'axis12', 'axis13',
];

const ALLIED_CAMPAIGN = [
  'allied_dday', 'allied_carentan', 'allied_cobra',
  'allied_market', 'allied_hurtgen', 'allied_bulge',
];

const COMMANDO_CAMPAIGN = ['hitsquad'];

let pendingAxisLevelId = null;
let pendingAlliedLevelId = null;

function newResearchAtLevel(levelNum) {
  const out = [];
  for (const [key, tier] of Object.entries(AXIS_RESEARCH_TIERS)) {
    if (tier === levelNum) {
      out.push({
        key,
        name: AXIS_RESEARCH_LABELS[key] || key,
        cost: axisResearchCost(key),
      });
    }
  }
  return out;
}

function buildAxisBriefingStats(level) {
  const waves = assaultWaves(level);
  return {
    waves,
    winBreaches: level.winBreaches,
    wave1TP: axisWavePayout(level, 1),
    waveFinalTP: axisWavePayout(level, waves),
  };
}

function openAlliedBriefing(levelId) {
  const level = LEVELS[levelId];
  if (!level) return;
  pendingAlliedLevelId = levelId;
  const titleEl = el('allied-briefing-title');
  titleEl.textContent = level.menuName || level.name;
  const histEl = el('allied-briefing-history');
  if (histEl) histEl.textContent = level.history || '';
  el('allied-briefing-text').textContent = level.briefing || '';
  const objList = el('allied-briefing-objectives');
  objList.replaceChildren();
  if (level.mode === 'assault') {
    const stats = buildAxisBriefingStats(level);
    appendBriefingObjective(objList, 'Waves: ' + stats.waves + ' assault waves');
    appendBriefingObjective(objList,
      'Objective: ' + stats.winBreaches + ' breakthroughs past the bottom edge, or wipe every defender');
    appendBriefingObjective(objList,
      'Budget: ' + stats.wave1TP + ' TP (wave 1) → ' + stats.waveFinalTP + ' TP (final wave) — spend each wave or lose it');
    if (level.landingCraft) {
      appendBriefingObjective(objList,
        'Rules: Deploy only on landing craft decks, then START WAVE. Craft motor ashore, ramps drop, Germans open fire.');
    } else {
      appendBriefingObjective(objList,
        'Rules: Deploy in the top strip, then START WAVE. Defenders persist.');
    }
  } else {
    appendBriefingObjective(objList, 'Waves: ' + level.waves.length + ' German assault waves');
    appendBriefingObjective(objList,
      'Objective: Survive all waves. ' + level.breachLimit + ' breaches and the sector falls.');
    appendBriefingObjective(objList,
      'Rules: Deploy behind the trench line. Earn TP from kills and spend freely.');
  }
  el('intro').classList.add('hidden');
  el('allied-select').classList.add('hidden');
  el('gameover').classList.add('hidden');
  el('allied-briefing').classList.remove('hidden');
}

function closeAlliedBriefing() {
  pendingAlliedLevelId = null;
  el('allied-briefing').classList.add('hidden');
  buildAlliedSelect();
  el('allied-select').classList.remove('hidden');
}

function deployAlliedBriefing() {
  const id = pendingAlliedLevelId;
  pendingAlliedLevelId = null;
  if (id) startGame(id);
}

function appendBriefingObjective(list, text) {
  const colon = text.indexOf(':');
  const li = document.createElement('li');
  if (colon >= 0) {
    li.innerHTML = '<b>' + text.slice(0, colon + 1) + '</b>' + text.slice(colon + 1);
  } else {
    li.textContent = text;
  }
  list.appendChild(li);
}

function openAxisBriefing(levelId) {
  const level = LEVELS[levelId];
  if (!level) return;
  pendingAxisLevelId = levelId;
  const stats = buildAxisBriefingStats(level);
  const titleEl = el('axis-briefing-title');
  titleEl.textContent = level.menuName || level.name;
  titleEl.classList.remove('briefing-themed');
  const histEl = el('axis-briefing-history');
  if (histEl) histEl.textContent = level.history || '';
  el('axis-briefing-text').textContent = level.briefing || '';
  const objList = el('axis-briefing-objectives');
  objList.replaceChildren();
  const research = loadAxisResearch();
  appendBriefingObjective(objList, 'Research: ' + research.rp + ' RP banked · ' +
    research.unlocked.length + ' unit types unlocked');
  appendBriefingObjective(objList, 'Waves: ' + stats.waves + ' assault waves');
  appendBriefingObjective(objList,
    'Objective: ' + stats.winBreaches + ' breakthroughs past the bottom edge, or wipe every defender');
  appendBriefingObjective(objList,
    'Budget: ' + stats.wave1TP + ' TP (wave 1) → ' + stats.waveFinalTP + ' TP (final wave) — spend each wave or lose it');
  appendBriefingObjective(objList,
    'Rules: Deploy in the top strip, then START WAVE. Defenders persist.');
  const levelNum = axisLevelNum(levelId);
  for (const item of newResearchAtLevel(levelNum)) {
    appendBriefingObjective(objList,
      'New in research: ' + item.name + ' (' + item.cost + ' RP)');
  }
  syncAxisRPDisplays();
  el('intro').classList.add('hidden');
  el('axis-select').classList.add('hidden');
  el('axis-research').classList.add('hidden');
  el('gameover').classList.add('hidden');
  el('axis-briefing').classList.remove('hidden');
}

function closeAxisBriefing() {
  pendingAxisLevelId = null;
  el('axis-briefing').classList.add('hidden');
  buildAxisSelect();
  el('axis-select').classList.remove('hidden');
}

function deployAxisBriefing() {
  const id = pendingAxisLevelId;
  pendingAxisLevelId = null;
  if (id) startGame(id);
}

function campaignForLevel(id) {
  if (ALLIED_CAMPAIGN.includes(id)) return ALLIED_CAMPAIGN;
  if (AXIS_CAMPAIGN.includes(id)) return AXIS_CAMPAIGN;
  if (COMMANDO_CAMPAIGN.includes(id)) return COMMANDO_CAMPAIGN;
  return null;
}

function getNextMissionId(id) {
  const campaign = campaignForLevel(id);
  if (!campaign) return null;
  const idx = campaign.indexOf(id);
  if (idx < 0 || idx >= campaign.length - 1) return null;
  return campaign[idx + 1];
}

function buildCampaignSelect(listId, campaignIds, onSelect) {
  const list = el(listId);
  if (!list) return;
  const launch = onSelect || startGame;
  list.replaceChildren();
  for (const id of campaignIds) {
    const lv = LEVELS[id];
    if (!lv) continue;
    const complete = isLevelComplete(id);
    const unlocked = isLevelUnlocked(id, campaignIds);
    const btn = document.createElement('button');
    if (!unlocked) {
      btn.disabled = true;
      btn.classList.add('locked');
    }
    if (complete) btn.classList.add('cleared');
    const title = document.createElement('span');
    title.className = 'mode-title';
    title.textContent = lv.menuName || lv.name;
    if (complete) {
      const badge = document.createElement('span');
      badge.className = 'cleared-badge';
      badge.textContent = 'CLEARED';
      title.appendChild(badge);
    }
    const desc = document.createElement('span');
    desc.className = 'mode-desc';
    desc.textContent = unlocked
      ? (lv.menuDesc || lv.briefing || '')
      : 'Locked — beat the previous level.';
    btn.appendChild(title);
    btn.appendChild(desc);
    if (unlocked) btn.addEventListener('click', () => launch(id));
    list.appendChild(btn);
  }
}

function buildAlliedSelect() {
  buildCampaignSelect('allied-list', ALLIED_CAMPAIGN, openAlliedBriefing);
}

function buildAxisSelect() {
  buildCampaignSelect('axis-list', AXIS_CAMPAIGN, openAxisBriefing);
}

function buildCommandoSelect() {
  buildCampaignSelect('commando-list', COMMANDO_CAMPAIGN);
}

function openAlliedSelect() {
  buildAlliedSelect();
  el('intro').classList.add('hidden');
  el('axis-select').classList.add('hidden');
  el('commando-select').classList.add('hidden');
  el('allied-briefing').classList.add('hidden');
  el('allied-select').classList.remove('hidden');
}

function closeAlliedSelect() {
  el('allied-select').classList.add('hidden');
  el('intro').classList.remove('hidden');
}

function openAxisSelect() {
  loadAxisResearch();
  buildAxisSelect();
  syncAxisRPDisplays();
  el('intro').classList.add('hidden');
  el('commando-select').classList.add('hidden');
  el('allied-select').classList.add('hidden');
  el('allied-briefing').classList.add('hidden');
  el('axis-research').classList.add('hidden');
  el('axis-briefing').classList.add('hidden');
  el('axis-select').classList.remove('hidden');
}

function closeAxisSelect() {
  el('axis-select').classList.add('hidden');
  el('intro').classList.remove('hidden');
}

function openCommandoSelect() {
  buildCommandoSelect();
  el('intro').classList.add('hidden');
  el('axis-select').classList.add('hidden');
  el('allied-select').classList.add('hidden');
  el('allied-briefing').classList.add('hidden');
  el('commando-select').classList.remove('hidden');
}

function closeCommandoSelect() {
  el('commando-select').classList.add('hidden');
  el('intro').classList.remove('hidden');
}

function startGame(levelId, difficultyId) {
  const level = LEVELS[levelId] || LEVELS.endless;
  const difficulty = level.mode === 'endless'
    ? (ENDLESS_DIFFICULTIES[difficultyId] || ENDLESS_DIFFICULTIES.easy)
    : null;
  SFX.resume();
  newGame(level, difficulty);
  resetViewCam(level.mode);
  placing = null;
  mobileToolbarMinimized = false;
  running = true;
  paused = false;
  gameSpeed = 1;
  syncSpeedButton();
  const placeables = level.mode === 'axis'
    ? axisPlaceablesForResearch()
    : (level.mode === 'assault' ? (level.placeables || ASSAULT_PLACEABLES)
      : (difficulty && difficulty.testing ? [...level.placeables, ...TESTING_GERMAN_PLACEABLES] : level.placeables));
  buildToolbar(placeables);
  el('intro').classList.add('hidden');
  el('gameover').classList.add('hidden');
  el('codex').classList.add('hidden');
  el('settings').classList.add('hidden');
  el('endless-select').classList.add('hidden');
  el('allied-select').classList.add('hidden');
  el('allied-briefing').classList.add('hidden');
  el('axis-select').classList.add('hidden');
  el('axis-briefing').classList.add('hidden');
  el('axis-research').classList.add('hidden');
  el('commando-select').classList.add('hidden');
  el('pause').classList.add('hidden');
  syncMobileViewUI();
  syncMobileChrome();
  const viewHint = mobileViewActive()
    ? ' Drag to pan; double-tap to zoom; pinch to zoom. Hold to cancel placement.'
    : '';
  el('tipbar').textContent = (level.mode === 'axis' || level.mode === 'assault'
    ? touchUI()
      ? (level.landingCraft
        ? 'Deploy troops on landing craft decks, then tap START WAVE. Craft motor ashore and drop ramps under fire.'
        : 'Deploy troops in the top strip, then tap START WAVE. Tap Units or Abilities to buy; tap the field to place.')
      : (level.landingCraft
        ? 'Deploy troops only on landing craft decks, then hit START WAVE. Craft motor ashore; ramps drop under German fire.'
        : 'Deploy troops in the top strip, then hit START WAVE. Open Units or Abilities to buy; right-click / Esc cancels placement.')
    : level.mode === 'hitsquad'
      ? touchUI()
        ? 'Tap or drag to select your men, tap ground to move. Kill the marked officer.'
        : 'Click or drag-select your men, click ground to move them. Kill the marked officer. Right-click / Esc deselects.'
    : difficulty && difficulty.testing
      ? touchUI()
        ? 'Testing: unlimited TP, no Germans spawn on their own. Open GERMANS to build them for the enemy side.'
        : 'Testing: unlimited TP, no Germans spawn on their own. Open GERMANS to build them for the enemy side; right-click / Esc cancels placement.'
    : difficulty && difficulty.sandbox
      ? touchUI()
        ? 'Sandbox: unlimited TP. Use +1 / +5 / +10 in the HUD to jump ahead in waves.'
        : 'Sandbox: unlimited TP. ] / Shift+] / Ctrl+] jump ahead 1 / 5 / 10 waves, or use the HUD buttons.'
      : touchUI()
        ? 'Tap a soldier to select him, tap ground to move. Open Units, Abilities, or Emplacements to deploy. Back returns to the list; tap the item again to cancel.'
        : 'Left-click a soldier to select him, click ground to move. Open Units, Abilities, or Emplacements to deploy. Right-click / Esc cancels placement.') + viewHint;
  if (level.mode === 'axis' || level.mode === 'assault') showBanner('WAVE 1 - DEPLOY');
  else if (level.briefing) showBanner(level.name);
  lastT = performance.now();
  refreshHUD();
}

el('start-endless').addEventListener('click', openEndlessSelect);
el('endless-back-btn').addEventListener('click', closeEndlessSelect);
for (const btn of document.querySelectorAll('[data-endless-diff]')) {
  btn.addEventListener('click', () => startGame('endless', btn.dataset.endlessDiff));
}
el('start-allied').addEventListener('click', openAlliedSelect);
el('allied-back-btn').addEventListener('click', closeAlliedSelect);
el('allied-briefing-deploy').addEventListener('click', deployAlliedBriefing);
el('allied-briefing-back').addEventListener('click', closeAlliedBriefing);
el('start-axis').addEventListener('click', openAxisSelect);
el('axis-back-btn').addEventListener('click', closeAxisSelect);
el('axis-research-btn').addEventListener('click', openAxisResearch);
el('axis-research-back').addEventListener('click', closeAxisResearch);
el('axis-briefing-research').addEventListener('click', () => {
  el('axis-briefing').classList.add('hidden');
  buildAxisResearchUI();
  el('axis-research').classList.remove('hidden');
});
el('axis-briefing-deploy').addEventListener('click', deployAxisBriefing);
el('axis-briefing-back').addEventListener('click', closeAxisBriefing);
el('start-commando').addEventListener('click', openCommandoSelect);
el('commando-back-btn').addEventListener('click', closeCommandoSelect);
el('restart-btn').addEventListener('click', () => startGame(G ? G.level.id : 'endless', G?.difficulty?.id));
el('next-mission-btn').addEventListener('click', () => {
  const id = el('next-mission-btn')?.dataset.nextLevel;
  if (!id) return;
  if (AXIS_CAMPAIGN.includes(id)) openAxisBriefing(id);
  else if (ALLIED_CAMPAIGN.includes(id)) openAlliedBriefing(id);
  else startGame(id);
});
el('menu-btn').addEventListener('click', returnToMenu);
el('speed-btn').addEventListener('click', cycleSpeed);
el('pause-btn').addEventListener('click', pauseGame);
el('start-wave-btn').addEventListener('click', startAxisCombat);
el('pause-resume-btn').addEventListener('click', resumeGame);
el('pause-codex-btn').addEventListener('click', openCodexFromPause);
el('pause-menu-btn').addEventListener('click', returnToMenu);
el('view-reset').addEventListener('click', () => {
  if (!G || !mobileViewActive()) return;
  resetViewCam(G.mode);
});

el('mobile-deselect').addEventListener('click', () => {
  if (!G) return;
  G.selected = [];
  SFX.click();
  syncSelectionMobile();
});

el('mobile-shop').addEventListener('click', () => {
  mobileToolbarMinimized = false;
  SFX.click();
  syncMobileChrome();
  syncToolbarLayout();
});

el('place-cancel').addEventListener('click', () => {
  if (!placing) return;
  clearPlacing();
  SFX.click();
  mobileVibrate(8);
});

function frame(now) {
  requestAnimationFrame(frame);
  if (!G) return;
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;
  const playing = running && !G.over && !paused;
  if (playing) {
    let remaining = dt * gameSpeed;
    while (remaining > 0) {
      const step = Math.min(remaining, 0.05);
      update(step);
      remaining -= step;
    }
  }
  if (G && (playing || viewDirty)) {
    draw();
    viewDirty = false;
  }
  hudAccum += dt;
  if (hudAccum >= HUD_INTERVAL) {
    hudAccum = 0;
    updateHUD();
  }
}

buildToolbar(PLACEABLES);
applySavedSettings();
fitLayout();
const hudEl = el('hud');
if (hudEl && typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(() => syncToolbarLayout()).observe(hudEl);
}
window.addEventListener('resize', fitLayout);
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    fitLayout();
    if (G && mobileViewActive()) resetViewCam(G.mode);
  }, 100);
});
requestAnimationFrame(frame);
