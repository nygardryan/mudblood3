/* Mud & Blood — HTML5 remake of the classic Flash squad-defense game.
   Vanilla JS + Canvas. No build step, no assets. */
'use strict';

// ============================================================ constants

const W = 900, H = 620;
const DEPLOY_Y = 380;          // your side of the field starts here
const FORWARD_Y = H / 3;       // units may advance and mines/wire may be laid this far up
const MAX_BREACH = 7;
const MAX_OFFICERS = 5;

const UNIT_TYPES = {
  rifleman: {
    name: 'Rifleman', hp: 100, range: 230, dmg: 13, acc: 0.55,
    rof: 0.88, burst: 1, burstGap: 0, speed: 42,
    color: '#4a5d3a', gun: 7, sfx: 'rifle',
    desc: 'M1 Garand. The backbone of your line.',
  },
  gunner: {
    name: 'Gunner', hp: 100, range: 297, dmg: 9, acc: 0.4,
    rof: 1.36, burst: 6, burstGap: 0.09, speed: 36,
    color: '#3d5236', gun: 10, sfx: 'mg',
    desc: 'BAR automatic rifle. Suppressive bursts.',
  },
  grenadier: {
    // 50% more gun range than the rifleman (230): the better all-rounder
    name: 'Grenadier', hp: 100, range: 345, dmg: 10, acc: 0.5,
    rof: 1.2, burst: 1, burstGap: 0, speed: 42,
    color: '#44583c', gun: 6, sfx: 'rifle', grenade: true,
    desc: 'Carbine most of the time; a heavy frag now and then.',
  },
  shotgunner: {
    name: 'Shotgunner', hp: 145, range: 0, dmg: 0, acc: 0,
    rof: 1.5, burst: 1, burstGap: 0, speed: 34,
    color: '#424f38', gun: 9, sfx: 'shotgun',
    shotgun: { range: 130, arc: 0.52, pellets: 8, dmg: 11, spread: 0.45 },
    desc: 'M97 trench gun and steel plate. Buckshot shreds clusters up close.',
  },
  bazooka: {
    name: 'Bazooka', hp: 90, range: 120, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, speed: 40,
    color: '#3f5138', gun: 5, sfx: 'pistol',
    rocket: { range: 330, cdMin: 6.7, cdMax: 9.2, r: 30, dmg: 120, speed: 380 },
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
    desc: 'Patches up nearby wounded. Carries a sidearm.',
  },
  engineer: {
    name: 'Engineer', hp: 95, range: 110, dmg: 7, acc: 0.45,
    rof: 1.1, burst: 4, burstGap: 0.07, speed: 44,
    color: '#51603e', gun: 6, sfx: 'mg',
    desc: 'Repairs fortifications, upgrades emplacements. M3 grease gun up close.',
  },
  officer: {
    name: 'Officer', hp: 95, range: 150, dmg: 9, acc: 0.5,
    rof: 0.9, burst: 1, burstGap: 0, speed: 44,
    color: '#6b6d44', gun: 5, sfx: 'pistol',
    desc: 'Nearby men fire faster and straighter. Earns +1 TP / 30 s.',
  },
  flamer: {
    name: 'Flamethrower', hp: 100, range: 130, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, speed: 38,
    color: '#4f5c3a', gun: 8, sfx: 'rifle',
    flame: { range: 130, arc: 0.45, dps: 38 },
    desc: 'M2 flamethrower. Burns everything in the cone — friend or foe.',
  },
  jeep: {
    name: 'Jeep', hp: 250, range: 300, dmg: 13, acc: 0.42,
    rof: 2.1, burst: 8, burstGap: 0.07, speed: 55,
    color: '#4a5a3f', gun: 14, sfx: 'hmg', vehicle: true,
    desc: 'Willys jeep, pintle-mounted .50 cal. Fast and hard-hitting, but unarmored.',
  },
  sherman: {
    name: 'Sherman', hp: 1000, range: 360, dmg: 0, acc: 0,
    rof: 4.0, burst: 1, burstGap: 0, speed: 14, shellDmg: 80,
    color: '#4a5a3f', gun: 0, sfx: 'boom', tank: true,
    mg: { range: 240, dmg: 8, acc: 0.45, burst: 6, burstGap: 0.08, gun: 24, sfx: 'mg' },
    desc: 'M4 Sherman. 75mm cannon and thick armor. Medics can\'t fix steel.',
  },
};

const ENEMY_TYPES = {
  erifle: {
    name: 'Rifleman', hp: 60, speed: 22, range: 210, dmg: 10, acc: 0.42,
    rof: 1.5, burst: 1, burstGap: 0, reward: 2,
    color: '#6e6e5e', gun: 7, sfx: 'rifle', priority: 1,
  },
  esmg: {
    name: 'Stormtrooper', hp: 70, speed: 36, range: 130, dmg: 7, acc: 0.38,
    rof: 1.0, burst: 3, burstGap: 0.08, reward: 2,
    color: '#5f5f52', gun: 6, sfx: 'mg', priority: 1,
  },
  egren: {
    name: 'Grenadier', hp: 70, speed: 27, range: 150, dmg: 8, acc: 0.35,
    rof: 1.6, burst: 1, burstGap: 0, reward: 3,
    color: '#65655a', gun: 5, sfx: 'pistol', priority: 2, grenade: true,
  },
  emg: {
    name: 'MG Gunner', hp: 90, speed: 16, range: 275, dmg: 8, acc: 0.33,
    rof: 1.9, burst: 5, burstGap: 0.08, reward: 3,
    color: '#59594c', gun: 10, sfx: 'mg', priority: 3,
  },
  eoff: {
    name: 'Officer', hp: 80, speed: 24, range: 140, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, reward: 4,
    color: '#4f4f45', gun: 5, sfx: 'pistol', priority: 5, aura: true,
  },
  esniper: {
    name: 'Sniper', hp: 55, speed: 14, range: 312, dmg: 39, acc: 0.66,
    rof: 6.8, burst: 1, burstGap: 0, reward: 4,
    color: '#525244', gun: 12, sfx: 'sniper', priority: 4,
  },
  eflame: {
    name: 'Flamethrower', hp: 85, speed: 34, range: 120, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 4,
    color: '#5a5a48', gun: 8, sfx: 'rifle', priority: 3,
    flame: { range: 120, arc: 0.45, dps: 34 },
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
    mg: { range: 230, dmg: 7, acc: 0.4, burst: 6, burstGap: 0.08, gun: 24, sfx: 'mg' },
  },
};

const ENEMY_INFO = {
  erifle: 'Standard Wehrmacht infantry. Slow, steady, and expendable — but there are always more of them.',
  esmg: 'Assault troops with MP40s. Fast movers who shred your line in close bursts.',
  egren: 'Carries stick grenades into the fray. The blast ignores friend and foe.',
  emg: 'MG42 team. Pins your men down from long range with sustained fire.',
  eoff: 'Leutnant rallying nearby troops. Kill him first — his aura stiffens German morale.',
  esniper: 'Camouflaged sharpshooter. Picks off officers, medics, and gunners from afar.',
  eflame: 'Flammenwerfer operator. Burns through wire, sandbags, and flesh alike.',
  ebike: 'Kradschützen on motorcycles. Blazing speed — they breach before you can react.',
  ejeep: 'Kübelwagen with a mounted MG. Mobile fire support, lightly armored.',
  ehalftrack: 'Sd.Kfz. 251 halftrack. Heavy armor, bow MG, and a squad ready to dismount.',
  panzer: 'Panzer IV. Thick armor and a 75mm cannon. Your line\'s worst nightmare.',
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
    desc: 'M1 Garand rifleman. Cheap, reliable.' },
  { key: 'gunner', label: 'GUNNER', cost: 7, kind: 'unit', hotkey: '2',
    desc: 'BAR gunner. Long range automatic fire.' },
  { key: 'grenadier', label: 'GRENADIER', cost: 8, kind: 'unit', hotkey: '3',
    desc: 'Carbine rifleman who lobs a devastating frag every 11-16 s. Blast can hurt your own men.' },
  { key: 'shotgunner', label: 'SHOTGUN', cost: 6, kind: 'unit', hotkey: 'G',
    desc: 'M97 trench gun and body armor. High HP; each blast can hit every enemy in the cone.' },
  { key: 'bazooka', label: 'BAZOOKA', cost: 11, kind: 'unit', hotkey: 'B',
    desc: 'M1A1 rocket launcher. Wildly inaccurate at range, but armor is a big target. Splash hurts friends.' },
  { key: 'mortarman', label: 'MORTARMAN', cost: 14, kind: 'unit', hotkey: 'M',
    desc: 'Portable 60mm mortar. Long-range indirect fire; useless against close targets.' },
  { key: 'sniper', label: 'SNIPER', cost: 10, kind: 'unit', hotkey: '4',
    desc: 'Sees the whole field. Hunts officers, snipers and MGs.' },
  { key: 'medic', label: 'MEDIC', cost: 12, kind: 'unit', hotkey: '5',
    desc: 'Heals nearby soldiers over time.' },
  { key: 'engineer', label: 'ENGINEER', cost: 14, kind: 'unit', hotkey: 'E',
    desc: 'Repairs fortifications; fortifies nearby emplacements (better stats). SMG for close range only.' },
  { key: 'officer', label: 'OFFICER', cost: 15, kind: 'unit', hotkey: '6',
    desc: 'Buffs nearby men. Generates +1 TP every 30 s.' },
  { key: 'flamer', label: 'FLAMER', cost: 13, kind: 'unit', hotkey: 'F',
    desc: 'M2 flamethrower. Devastating cone of fire that burns friend and foe alike.' },
  { key: 'jeep', label: 'JEEP', cost: 20, kind: 'unit', hotkey: 'J',
    desc: 'Willys jeep with a .50 cal HMG. Fires on the move. Unarmored — no field repairs.' },
  { key: 'sherman', label: 'SHERMAN', cost: 80, kind: 'unit', hotkey: 'T',
    desc: 'M4 Sherman tank. 75mm HE cannon, shrugs off small arms. Medics cannot repair it.' },
  { key: 'wire', label: 'WIRE', cost: 4, kind: 'defense', hotkey: '7',
    desc: 'Barbed wire. Slows the German advance until it wears out.' },
  { key: 'sandbags', label: 'SANDBAGS', cost: 5, kind: 'defense', hotkey: '8',
    desc: 'Cover. Soldiers behind it dodge half of incoming fire.' },
  { key: 'mine', label: 'MINEFIELD', cost: 6, kind: 'defense', hotkey: '9',
    desc: 'Cluster of 3 anti-personnel mines. Hurts tanks too. Germans can\'t see them.' },
  { key: 'mortar', label: 'MORTAR STRIKE', cost: 8, kind: 'support', hotkey: '0',
    desc: '3 mortar shells on target. DANGER CLOSE — friendly fire is real.' },
  { key: 'artillery', label: 'ARTILLERY STRIKE', cost: 16, kind: 'support', hotkey: 'A',
    desc: '105mm barrage: 16 heavy shells, wide spread. Devastating. Indiscriminate.' },
];

// ============================================================ helpers

const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const officerCount = () => G.units.filter(u => !u.dead && u.type === 'officer').length;

// ============================================================ state

let G = null;         // game state
let placing = null;   // placeable currently being placed
let mouse = { x: W / 2, y: H / 2, inside: false };
let running = false;
let lastT = 0;

const canvas = document.getElementById('game');
let ctx = canvas.getContext('2d');

// persistent ground layer (wrecks, terrain — blood and craters are temporary overlays)
const groundCanvas = document.createElement('canvas');
groundCanvas.width = W; groundCanvas.height = H;
const gctx = groundCanvas.getContext('2d');

function newGame() {
  G = {
    tp: 15,
    wave: 0,
    kills: 0,
    breaches: 0,
    time: 0,
    over: false,

    units: [],
    enemies: [],
    sandbags: [],
    wires: [],
    mines: [],
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

    spawnTimer: 6,
    tpTrickle: 8,
    officerTick: 30,
    eventTimer: rand(40, 60),
    fog: 0,
    banner: null,
    selected: null,
  };
  paintGround();
  // you start with two riflemen already dug in
  G.units.push(makeUnit('rifleman', W / 2 - 70, 470));
  G.units.push(makeUnit('rifleman', W / 2 + 70, 470));
}

function makeUnit(type, x, y) {
  const t = UNIT_TYPES[type];
  return {
    side: 'us', type, t, x, y,
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

function makeEnemy(type, x, y) {
  const t = ENEMY_TYPES[type];
  return {
    side: 'de', type, t, x, y,
    hp: t.hp, maxhp: t.hp,
    cd: rand(0.5, 1.5), burstLeft: 0, burstTimer: 0,
    face: Math.PI / 2,
    wobble: rand(0, Math.PI * 2),
    grenCd: rand(2, 4),
    turret: Math.PI / 2,
    pushT: 0, pushCd: rand(2, 5),
    prone: 0, proneCd: 0,
  };
}

// ============================================================ economy

// war economy attrition: each wave pays ~1% less than the one before,
// dropping to a hard 10% floor from wave 90 on. G.tp holds fractions; the HUD floors it.
function earnTP(amount) {
  const mult = G.wave >= 90 ? 0.1 : Math.max(0.1, Math.pow(0.99, G.wave));
  G.tp += amount * mult;
}

// ============================================================ waves & spawning

function wavesPast99(w) {
  return Math.max(0, w - 99);
}

function spawnIntervalForWave(w) {
  if (w <= 99) return clamp(16 - w * 0.2, 6, 16);
  return clamp(6 - wavesPast99(w) * 0.06, 3, 16);
}

function waveComposition(w) {
  const late = wavesPast99(w);
  const size = Math.min(
    2 + Math.floor(w / 4) + (Math.random() < 0.35 ? 1 : 0) + Math.floor(late / 5),
    7 + Math.floor(late / 10),
  );
  const pool = ['erifle', 'erifle', 'erifle'];
  if (w >= 4) pool.push('esmg', 'esmg');
  if (w >= 7) pool.push('egren');
  if (w >= 10) pool.push('emg');
  if (w >= 12) pool.push('eflame');
  if (w >= 14) pool.push('esniper');
  const out = [];
  for (let i = 0; i < size; i++) out.push(pick(pool));
  if (w >= 12 && Math.random() < 0.30 + late * 0.004) out.push('eoff');
  // a motorcycle team races ahead of some waves; as German logistics spin
  // up, bikes ramp from 20% at wave 9 to a 90% cap at wave 99, then keep climbing
  const bikeChance = late > 0
    ? Math.min(1, 0.9 + late * 0.006)
    : Math.min(0.9, w >= 9 ? 0.2 + (w - 9) * (0.7 / 90) : 0);
  if (w >= 9 && Math.random() < bikeChance) out.push('ebike');
  const vehChance = 0.10 * (1 + late * 0.04);
  // a Kübelwagen gun car rolls in occasionally — not until mid-game
  if (w >= 16 && Math.random() < vehChance) out.push('ejeep');
  // an armored halftrack hauls a full squad to the front
  if (w >= 18 && Math.random() < vehChance) out.push('ehalftrack');
  if (w >= 25 && Math.random() < vehChance) out.push('panzer');
  return out;
}

function spawnWave() {
  G.wave++;
  const comp = waveComposition(G.wave);
  const cx = rand(100, W - 100);
  for (const type of comp) {
    const x = clamp(cx + rand(-90, 90), 30, W - 30);
    G.enemies.push(makeEnemy(type, x, rand(-70, -20)));
  }
  G.spawnTimer = spawnIntervalForWave(G.wave);
  if (G.wave === 1) showBanner('HERE THEY COME');
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
// growing steadily with the wave count
function paradropCount(w) {
  return Math.min(4 + Math.floor(w / 6), 12 + Math.floor(wavesPast99(w) / 10));
}

const PARA_POOL = ['erifle', 'erifle', 'esmg', 'esmg', 'egren'];

function triggerParadrop() {
  showBanner('FALLSCHIRMJÄGER! PARATROOPERS!');
  SFX.alarm();
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
  SFX.event();

  if (ev === 'barrage') {
    const b = barrageForWave(w);
    showBanner(w >= 40 ? 'HEAVY BARRAGE!' : w >= 20 ? 'ARTILLERY INBOUND!' : 'INCOMING BARRAGE!');
    SFX.alarm();
    for (let i = 0; i < b.count; i++) {
      scheduleShell(rand(60, W - 60), rand(DEPLOY_Y - 30, H - 40),
        rand(b.dMin, b.dMax), b.r, b.dmg, b.big);
    }
  } else if (ev === 'paradrop') {
    triggerParadrop();
  } else if (ev === 'fog') {
    showBanner('FOG ROLLS IN');
    G.fog = 22;
  } else if (ev === 'fng') {
    showBanner('REINFORCEMENTS: FNG REPORTING');
    const u = makeUnit('rifleman', rand(100, W - 100), rand(H - 90, H - 40));
    G.units.push(u);
  } else if (ev === 'airstrike') {
    showBanner('P-47 STRAFING RUN!');
    const x = rand(120, W - 120);
    const speed = 380;
    const startY = H + 70;
    const plane = {
      x, y: startY, speed,
      drift: rand(-10, 10),
      gunT: 0.4, sfxT: 0, gunSfxT: 0,
      done: false,
    };
    G.planes.push(plane);
    // a stick of bombs timed to burst right as the plane passes overhead
    for (let i = 0; i < 3; i++) {
      const by = 90 + i * 95;
      scheduleShell(x + rand(-22, 22), by, (startY - by) / speed + 0.12, 42, 90, false);
    }
  }
}

function showBanner(text) {
  G.banner = { text, ttl: 3.2 };
}

// ============================================================ ordnance

function scheduleShell(x, y, delay, r, dmg, big, by) {
  G.shells.push({ x, y, timer: delay, r, dmg, big, by, whistled: false });
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
  for (const e of G.enemies) {
    if (e.chute > 0) continue;   // blast passes under the descending stick
    let hd = hitArea(e);
    if (hd > 0) {
      if (e.t.tank) hd *= 2.2;                    // HE vs armor: effective
      damageEnemy(e, hd, by || { x, y });
    }
  }
  for (const u of G.units) {
    const hd = hitArea(u);
    if (hd > 0) damageUnit(u, hd, { x, y });
  }
  for (const s of G.sandbags) {
    if (dist(s, { x, y }) < r) s.hp -= dmg * 0.8;
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

// P-47 pass: roars in from behind the friendly line and hoses the field
// with eight .50 cals on its way out, walking fire up its flight path
function updatePlane(p, dt) {
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

  // shadow racing along the ground, offset to the side
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.save();
  c.translate(p.x + 26, p.y + 34);
  c.beginPath(); c.ellipse(0, 0, 9, 20, 0, 0, 7); c.fill();
  c.beginPath(); c.ellipse(0, -2, 22, 5, 0, 0, 7); c.fill();
  c.restore();

  c.save();
  c.translate(p.x, p.y);

  // fuselage, nose pointed up-field
  c.fillStyle = '#3f4a3a';
  c.beginPath(); c.ellipse(0, 0, 6, 21, 0, 0, 7); c.fill();
  // wings
  c.fillStyle = '#46523f';
  c.beginPath(); c.ellipse(0, -2, 30, 7, 0, 0, 7); c.fill();
  // tailplane
  c.beginPath(); c.ellipse(0, 16, 12, 4, 0, 0, 7); c.fill();
  // canopy
  c.fillStyle = '#20261e';
  c.beginPath(); c.ellipse(0, 2, 3, 6, 0, 0, 7); c.fill();
  // spinning prop disc
  c.fillStyle = 'rgba(200,200,180,0.25)';
  c.beginPath(); c.ellipse(0, -21, 11, 2.5, 0, 0, 7); c.fill();
  // US roundels on the wings
  c.fillStyle = 'rgba(230,230,220,0.9)';
  c.beginPath(); c.arc(-20, -2, 3, 0, 7); c.fill();
  c.beginPath(); c.arc(20, -2, 3, 0, 7); c.fill();

  // wing gun muzzle flashes while firing
  if (p.y < DEPLOY_Y + 40 && p.y > 40) {
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
  G.corpses.push({ x: a.x, y: a.y, rot: rand(0, Math.PI * 2), side: a.side, ttl: CORPSE_TTL });
}

function drawCorpse(cp) {
  const alpha = clamp(cp.ttl / 8, 0, 1); // fade out over the last seconds
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cp.x, cp.y);
  ctx.rotate(cp.rot);
  ctx.fillStyle = cp.side === 'us' ? '#33402c' : '#4a4a40';
  ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = cp.side === 'us' ? '#5b6b4a' : '#61615a';
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
    if (u.t.tank) {
      stampWreck(u);
      explode(u.x, u.y, 50, 60, true);
    } else if (u.t.vehicle) {
      stampJeepWreck(u);
      explode(u.x, u.y, 30, 45, false);
    } else {
      spawnCorpse(u);
      bloodSplat(u.x, u.y, 8);
      SFX.scream();
    }
    if (G.selected === u) G.selected = null;
  }
  // taking real fire (bullets, shells) sends a man diving; flame's tiny
  // per-tick damage is handled in flameSpray with a time-scaled roll
  if (dmg >= 3) tryGoProne(u, 0.65);
}

function gainXP(u) {
  u.xp++;
  const next = RANKS[u.rank + 1];
  const need = next && (u.t.tank ? next.kills * 5 : next.kills);
  if (next && u.xp >= need) {
    u.rank++;
    u.hp = Math.min(u.maxhp, u.hp + 15);   // a promotion is good for morale
    SFX.promote();
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
  if (e.t.tank || e.t.vehicle) {
    G.particles.push({
      x: e.x + rand(-10, 10), y: e.y + rand(-10, 10), vx: 0, vy: -20,
      ttl: 0.4, grav: 0, size: 2, color: '#c8b872',
    });
  } else {
    bloodSplat(e.x, e.y, 3);
  }
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    G.kills++;
    earnTP(e.t.reward);
    SFX.cash();
    creditKill(from);
    if (e.t.tank) {
      stampWreck(e);
      explode(e.x, e.y, 50, 60, true);
    } else if (e.t.bike) {
      // bike shot out from under the crew: it crashes with both men aboard
      stampBike(e, true);
      bloodSplat(e.x, e.y, 10);
      SFX.scream();
    } else if (e.t.apc) {
      stampHalftrackWreck(e);
      explode(e.x, e.y, 38, 55, false);
    } else if (e.t.vehicle) {
      stampJeepWreck(e);
      explode(e.x, e.y, 30, 45, false);
    } else {
      spawnCorpse(e);
      bloodSplat(e.x, e.y, 8);
      if (Math.random() < 0.4) SFX.scream();
    }
  }
  if (dmg >= 3) tryGoProne(e, 0.65);
}

// ============================================================ shooting

function fogMult() { return G.fog > 0 ? 0.6 : 1; }

// infantry under fire hit the dirt: prone men can't shoot but dodge 60% of
// incoming rounds. Veterans get back up fast; green troops stay down a while.
function tryGoProne(u, chance) {
  if (!u || u.dead || !u.t || u.chute > 0) return;
  if (u.t.tank || u.t.vehicle || u.t.apc || u.t.bike) return;   // crews don't dive
  if (u.prone > 0 || u.proneCd > 0 || u.moveTo) return;          // running men keep running
  if (Math.random() >= chance) return;
  const rank = u.rank || 0;   // Germans carry no rank and eat dirt the longest
  u.prone = rand(2.5, 4.5) * (1 - rank * 0.15);
}

function coverBlock(target) {
  // friendly units near sandbags dodge some incoming fire (vehicles don't duck)
  if (target.side !== 'us' || target.t.tank || target.t.vehicle) return false;
  for (const s of G.sandbags) {
    // fortified bags stop more and shrug off hits better
    if (s.hp > 0 && dist(s, target) < (s.up ? 36 : 32)) {
      if (Math.random() < (s.up ? 0.65 : 0.5)) { s.hp -= s.up ? 3 : 4; return true; }
    }
  }
  return false;
}

function fireShot(shooter, target, opts) {
  // opts.weapon substitutes different gun stats (e.g. a tank's coaxial MG)
  const t = (opts && opts.weapon) || shooter.t;
  shooter.face = Math.atan2(target.y - shooter.y, target.x - shooter.x);
  const mx = shooter.x + Math.cos(shooter.face) * (t.gun + 3);
  const my = shooter.y + Math.sin(shooter.face) * (t.gun + 3);
  SFX[t.sfx]();
  G.flashes.push({ x: mx, y: my, r: 5, ttl: 0.05, max: 0.05 });

  let acc = t.acc * (opts && opts.accBonus ? 1 + opts.accBonus : 1);
  const d = dist(shooter, target);
  acc *= clamp(1.15 - d / (t.range * 1.6), 0.35, 1);

  let hx = target.x, hy = target.y;
  const hit = Math.random() < acc;
  if (!hit) { hx += rand(-22, 22); hy += rand(-16, 22); }

  G.tracers.push({ x1: mx, y1: my, x2: hx, y2: hy, ttl: 0.06 });

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

// one tick of flame from `actor` toward its facing: burns EVERYTHING in the
// cone regardless of side — that's the deal you make with a flamethrower
function flameSpray(actor, dt) {
  const fl = actor.t.flame;

  actor.flameSfx = (actor.flameSfx || 0) - dt;
  if (actor.flameSfx <= 0) { actor.flameSfx = 0.4; SFX.flame(); }

  // roiling fire particles along the cone
  for (let i = 0; i < 7; i++) {
    const a = actor.face + rand(-fl.arc, fl.arc) * 0.8;
    const d = rand(10, fl.range);
    G.particles.push({
      x: actor.x + Math.cos(a) * d, y: actor.y + Math.sin(a) * d,
      vx: Math.cos(a) * rand(20, 60), vy: Math.sin(a) * rand(20, 60) - 15,
      ttl: rand(0.15, 0.45), grav: -40, size: rand(2, 4.5),
      color: pick(['#ff9a2a', '#ffce4a', '#e05818', '#b83a10', '#3a352c']),
    });
  }
  // scorch the earth now and then
  if (Math.random() < 0.05) {
    const a = actor.face + rand(-fl.arc, fl.arc) * 0.6;
    const d = rand(fl.range * 0.4, fl.range);
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
    if (d > fl.range + 8) return;
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
  const range = sg.range * fogMult();
  const arc = sg.arc * (1 + (buffs && buffs.accBonus ? buffs.accBonus * 0.25 : 0));
  const mx = actor.x + Math.cos(actor.face) * (actor.t.gun + 2);
  const my = actor.y + Math.sin(actor.face) * (actor.t.gun + 2);

  SFX.shotgun();
  G.flashes.push({ x: mx, y: my, r: 8, ttl: 0.07, max: 0.07 });
  for (let i = 0; i < sg.pellets; i++) {
    const a = actor.face + rand(-sg.spread, sg.spread);
    const d = rand(25, range);
    G.tracers.push({
      x1: mx, y1: my,
      x2: actor.x + Math.cos(a) * d, y2: actor.y + Math.sin(a) * d,
      ttl: 0.05,
    });
  }
  G.particles.push({
    x: mx + Math.cos(actor.face) * 10, y: my + Math.sin(actor.face) * 10,
    vx: Math.cos(actor.face) * rand(30, 55), vy: Math.sin(actor.face) * rand(30, 55),
    ttl: 0.18, grav: 90, size: rand(1.5, 2.5), color: '#c8b898',
  });

  const rank = actor.rank || 0;
  for (const e of G.enemies) {
    if (e.dead || e.y < 0 || e.chute > 0) continue;
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
    damageEnemy(e, dmg, actor);
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
    if (u.dead) continue;
    if (pred && !pred(u)) continue;
    const d = dist(e, u);
    if (d < bd) { bd = d; best = u; }
  }
  return best;
}

// ============================================================ update: friendlies

function officerBuff(u) {
  for (const o of G.units) {
    if (!o.dead && o.type === 'officer' && o !== u && dist(o, u) < 130) {
      // a veteran officer drives his men harder
      return { rofMult: 0.75 - o.rank * 0.03, accBonus: 0.18 + o.rank * 0.04 };
    }
  }
  return null;
}

// officer aura + veterancy: each rank is 8% faster, 8% straighter and 4%
// harder-hitting — a MSG puts out roughly 3.5x the fire of a green private
function unitBuffs(u) {
  const b = { rofMult: 1, accBonus: 0, dmgMult: 1 };
  const ob = officerBuff(u);
  if (ob) { b.rofMult *= ob.rofMult; b.accBonus += ob.accBonus; }
  if (u.rank > 0) {
    b.rofMult *= 1 - u.rank * 0.08;
    b.accBonus += u.rank * 0.08;
    b.dmgMult *= 1 + u.rank * 0.04;
  }
  return b;
}

// veterans hustle: each rank moves 4% quicker, so a MSG covers ground 24% faster
function unitSpeed(u) {
  return u.t.speed * (1 + (u.rank || 0) * 0.04);
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

  // a tank crew drives and fights at the same time
  if (u.t.tank) {
    if (u.moveTo) {
      const d = dist(u, u.moveTo);
      if (d < 4) {
        u.moveTo = null;
      } else {
        const ang = Math.atan2(u.moveTo.y - u.y, u.moveTo.x - u.x);
        const sp = unitSpeed(u);
        u.x += Math.cos(ang) * sp * dt;
        u.y += Math.sin(ang) * sp * dt;
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
      } else {
        const ang = Math.atan2(u.moveTo.y - u.y, u.moveTo.x - u.x);
        const sp = unitSpeed(u);
        u.x += Math.cos(ang) * sp * dt;
        u.y += Math.sin(ang) * sp * dt;
      }
    }
    const vt = nearestEnemyInRange(u, u.t.range * fogMult());
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
    const ft = nearestEnemyInRange(u, u.t.flame.range * fogMult());
    if (ft) {
      u.face = Math.atan2(ft.y - u.y, ft.x - u.x);
      flameSpray(u, dt);
    }
    return;
  }

  if (u.t.shotgun) {
    const sg = u.t.shotgun;
    const st = nearestEnemyInRange(u, sg.range * fogMult());
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
  const range = u.t.range * fogMult();
  let target;
  if (u.type === 'sniper') target = sniperTarget(u, range);
  else target = nearestEnemyInRange(u, range);
  runWeapon(u, target, dt, buffs);

  if (u.t.grenade) {
    u.grenCd -= dt;
    if (u.grenCd <= 0) {
      // never inside his own blast, never onto a danger-close buddy
      const gt = nearestEnemyInRange(u, 200 * fogMult(), e => dist(u, e) > 60);
      if (gt && !friendlyNearPoint(gt.x, gt.y, 55, u)) {
        // grenades are a rare, heavy punch — the carbine does the daily work.
        // Veterans throw more often, tighter and harder.
        u.grenCd = rand(11, 16) * (1 - u.rank * 0.08);
        SFX.grenadeToss();
        const sc = 12 * (1 - u.rank * 0.08);
        G.grenades.push({
          x: u.x, y: u.y,
          tx: gt.x + rand(-sc, sc), ty: gt.y + rand(-sc, sc),
          t: 0, dur: 1.0, sx: u.x, sy: u.y, by: u,
          r: 46, dmg: 115 * (1 + u.rank * 0.05),
        });
      }
    }
  }

  if (u.t.rocket) {
    u.rocketCd -= dt;
    if (u.rocketCd <= 0) {
      const rk = u.t.rocket;
      const rr = rk.range * fogMult();
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
        });
      }
    }
  }

  if (u.t.mortar) {
    u.mortCd -= dt;
    if (u.mortCd <= 0) {
      const mt = u.t.mortar;
      const mr = mt.range * fogMult();
      const target = nearestEnemyInRange(u, mr, e => dist(u, e) > mt.min);
      if (target && !friendlyNearPoint(target.x, target.y, 55, u)) {
        // veteran crews drop rounds faster, tighter and heavier
        u.mortCd = rand(mt.cdMin, mt.cdMax) * (1 - u.rank * 0.08);
        u.face = Math.atan2(target.y - u.y, target.x - u.x);
        SFX.thunk();
        G.flashes.push({ x: u.x, y: u.y - 6, r: 4, ttl: 0.06, max: 0.06 });
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
        if (a.dead || a === u || a.t.tank || a.t.vehicle || a.hp >= a.maxhp) continue;
        if (dist(u, a) < 95) {
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
        if (Math.random() < 0.12) SFX.heal();
        G.particles.push({ x: worst.x + rand(-6, 6), y: worst.y - 10, vx: 0, vy: -18, ttl: 0.5, grav: 0, size: 1.6, color: '#8fe08f' });
      }
    }
  }

  if (u.type === 'engineer') updateEngineer(u, dt);
}

// engineer work, one job at a time: repair emplacements, then fortify
// an intact one he's standing next to
function updateEngineer(u, dt) {
  u.healTick -= dt;
  if (u.healTick > 0) return;
  u.healTick = 0.4;
  const R = 95;

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

  // 1) restack damaged sandbags / restring damaged wire
  let emp = null, empFrac = 1;
  for (const s of [...G.sandbags, ...G.wires]) {
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

  // 2) fortify the nearest intact, un-upgraded emplacement (~6 s of work)
  let target = null, td = R;
  for (const s of [...G.sandbags, ...G.wires]) {
    if (s.up) continue;
    const d = dist(u, s);
    if (d < td) { td = d; target = s; }
  }
  if (target) {
    target.workProg += 0.4 * (1 + u.rank * 0.35);
    sparks(target.x, target.y);
    if (target.workProg >= 6) {
      target.up = true;
      target.maxhp = Math.round(target.maxhp * 1.5);
      target.hp = target.maxhp;
      gainXP(u); gainXP(u); // a fortification is worth two points of pride
      SFX.promote();
      G.texts.push({ x: target.x, y: target.y - 16, text: 'FORTIFIED', ttl: 2.2 });
    }
  }
}

// ---- shared tank gunnery: both sides alternate the main gun and coaxial MG,
// and keep shooting while the hull is moving

function tankTargets(a) {
  const fog = fogMult();
  const cannonRange = a.t.range * fog;
  const mgRange = a.t.mg.range * fog;
  if (a.side === 'us') {
    return {
      // enemy armor is the cannon's priority target
      cannon: nearestEnemyInRange(a, cannonRange, e => e.t.tank) ||
              nearestEnemyInRange(a, cannonRange),
      mg: nearestEnemyInRange(a, mgRange, e => !e.t.tank),
    };
  }
  return {
    cannon: nearestUnitInRange(a, cannonRange),
    mg: nearestUnitInRange(a, mgRange, u2 => !u2.t.tank),
  };
}

function updateTankCombat(a, dt) {
  if (!a.wpn) a.wpn = 'cannon';
  a.cd -= dt;
  const mgSpec = a.t.mg;

  // an MG burst in progress finishes before anything else
  if (a.burstLeft > 0) {
    a.burstTimer -= dt;
    if (a.burstTimer <= 0) {
      if (a.mgTarget && !a.mgTarget.dead) {
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
    a.turret += clamp(angleDiff(home, a.turret), -0.8 * dt, 0.8 * dt);
    return;
  }

  const want = Math.atan2(target.y - a.y, target.x - a.x);
  const diff = angleDiff(want, a.turret);
  a.turret += clamp(diff, -1.2 * dt, 1.2 * dt);
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
  for (const o of G.enemies) {
    if (!o.dead && o.t.aura && o !== e && dist(o, e) < 140) return true;
  }
  return false;
}

function updateEnemy(e, dt) {
  // still under canopy: drift down, sway in the wind, do nothing else
  if (e.chute > 0) {
    e.chute -= dt;
    e.sway = (e.sway || 0) + dt * 2.2;
    e.x = clamp(e.x + Math.sin(e.sway) * 9 * dt, 14, W - 14);
    if (e.chute <= 0) {
      e.chute = 0;
      // boots hit the dirt: kick up a little dust
      for (let i = 0; i < 6; i++) {
        G.particles.push({
          x: e.x + rand(-6, 6), y: e.y + rand(-2, 4),
          vx: rand(-30, 30), vy: rand(-40, -10),
          ttl: rand(0.25, 0.5), grav: 160, size: rand(1.2, 2.4),
          color: pick(['#6e6046', '#57492f', '#8a7a5a']),
        });
      }
    }
    return;
  }

  if (e.proneCd > 0) e.proneCd -= dt;
  if (e.prone > 0) {
    e.prone -= dt;
    if (e.prone <= 0) {
      e.prone = 0;
      e.proneCd = rand(4, 6);
    } else {
      return; // pinned: no shooting, no advancing
    }
  }

  const buffed = enemyOfficerNear(e);
  const range = e.t.range * fogMult();

  if (e.t.tank) { updateTank(e, dt); return; }
  if (e.t.bike) { updateBike(e, dt); return; }
  if (e.t.apc) { updateHalftrack(e, dt); return; }
  if (e.t.vehicle) { updateEnemyJeep(e, dt); return; }

  // discipline only goes so far: every German periodically stops shooting and
  // pushes up the field, so long-range shooters eventually close the distance
  if (e.pushT > 0) {
    e.pushT -= dt;
    advance(e, dt, buffed);
    return;
  }

  if (e.t.flame) {
    const ft = nearestUnitInRange(e, e.t.flame.range);
    if (ft) {
      e.face = Math.atan2(ft.y - e.y, ft.x - e.x);
      flameSpray(e, dt);
    } else {
      advance(e, dt, buffed);
    }
    return;
  }

  const target = nearestUnitInRange(e, range);

  // grenadier lobs grenades
  if (e.t.grenade) {
    e.grenCd -= dt;
    const gt = nearestUnitInRange(e, 190);
    if (gt && e.grenCd <= 0) {
      e.grenCd = rand(4.5, 6.5);
      SFX.grenadeToss();
      G.grenades.push({
        x: e.x, y: e.y,
        tx: gt.x + rand(-14, 14), ty: gt.y + rand(-14, 14),
        t: 0, dur: 1.0, sx: e.x, sy: e.y,
      });
    }
  }

  if (target) {
    // roll the urge to advance; never when already on top of the target
    e.pushCd -= dt;
    if (e.pushCd <= 0) {
      e.pushCd = rand(3, 6);
      if (Math.random() < 0.4 && dist(e, target) > 70) {
        e.pushT = rand(1.2, 2.8);
      }
    }
    runWeapon(e, target, dt, buffed ? { rofMult: 0.8 } : null);
    // stormtroopers keep pushing even under fire
    if (e.t.speed >= 30 && dist(e, target) > range * 0.5) {
      advance(e, dt, buffed);
    }
  } else {
    advance(e, dt, buffed);
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
  e.y += e.t.speed * dt;
  updateTankCombat(e, dt);
}

// ---- motorcycle & sidecar: races down the field, then the crew dismounts

const BIKE_CREW_POOL = ['erifle', 'erifle', 'esmg', 'esmg', 'egren', 'emg', 'eflame'];

function updateBike(e, dt) {
  e.sfxT = (e.sfxT || 0) - dt;
  if (e.sfxT <= 0) { e.sfxT = 0.5; SFX.motor(); }

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
  e.sfxT = (e.sfxT || 0) - dt;
  const target = nearestUnitInRange(e, e.t.range * fogMult());
  if (target) {
    runWeapon(e, target, dt, null);
    return;
  }
  if (e.sfxT <= 0) { e.sfxT = 0.6; SFX.motor(); }
  let speed = e.t.speed;
  for (const wr of G.wires) {
    if (wr.hp > 0 && Math.abs(e.x - wr.x) < 40 && Math.abs(e.y - wr.y) < 16) {
      speed *= 0.08;
      wr.hp -= 8 * dt;
      break;
    }
  }
  e.x = clamp(e.x + Math.sin(e.y * 0.015) * 12 * dt, 20, W - 20);
  e.y += speed * dt;
  e.face = Math.PI / 2;
}

// Sd.Kfz. 251 halftrack: an armored bus for a full squad. At rifle distance
// of any defender it slams the brakes and the squad piles out at once.
// Afterward it fights on as a slow gun truck with its bow MG.

function updateHalftrack(e, dt) {
  e.sfxT = (e.sfxT || 0) - dt;
  if (e.sfxT <= 0) { e.sfxT = 0.55; SFX.motor(); }

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
    const target = nearestUnitInRange(e, e.t.range * fogMult());
    if (target) { runWeapon(e, target, dt, null); return; }
  }

  // drive on; wire slows it but the tracks chew through fast
  let speed = e.t.speed;
  for (const wr of G.wires) {
    if (wr.hp > 0 && Math.abs(e.x - wr.x) < 40 && Math.abs(e.y - wr.y) < 16) {
      speed *= 0.2;
      wr.hp -= 15 * dt;
      break;
    }
  }
  e.y += speed * dt;
  e.face = Math.PI / 2;
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

  // spawning
  G.spawnTimer -= dt;
  if (G.spawnTimer <= 0) spawnWave();

  // random events
  if (G.wave >= 3) {
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
    if (!s.whistled && s.timer < 0.9) { s.whistled = true; SFX.whistle(); }
    s.timer -= dt;
    if (s.timer <= 0) { s.done = true; explode(s.x, s.y, s.r, s.dmg, s.big, s.by); }
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

  // breaches
  for (const e of G.enemies) {
    if (!e.dead && e.y > H + 10) {
      e.dead = true; e.breached = true;
      G.breaches++;
      SFX.alarm();
      showBanner('GERMAN BREAKTHROUGH! (' + G.breaches + '/' + MAX_BREACH + ')');
      if (G.breaches >= MAX_BREACH) gameOver();
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
  G.units = G.units.filter(u => !u.dead);
  G.enemies = G.enemies.filter(e => !e.dead);
  G.sandbags = G.sandbags.filter(s => { if (s.hp <= 0) stampSandbagRubble(s); return s.hp > 0; });
  G.wires = G.wires.filter(w => w.hp > 0);
  G.mines = G.mines.filter(m => !m.dead);
  G.shells = G.shells.filter(s => !s.done);
  G.grenades = G.grenades.filter(g => !g.done);
  G.rockets = G.rockets.filter(r => !r.done);
  G.planes = G.planes.filter(p => !p.done);
  G.particles = G.particles.filter(p => p.ttl > 0);
  if (G.particles.length > 400) G.particles.splice(0, G.particles.length - 400);
  G.tracers = G.tracers.filter(t => t.ttl > 0);
  G.flashes = G.flashes.filter(f => f.ttl > 0);
  G.texts = G.texts.filter(t => t.ttl > 0);
  G.corpses = G.corpses.filter(c => c.ttl > 0);
  G.groundMarks = G.groundMarks.filter(m => m.ttl > 0);
}

function stampSandbagRubble(s) {
  gctx.fillStyle = 'rgba(120,105,70,0.5)';
  gctx.beginPath();
  gctx.ellipse(s.x, s.y, 20, 9, 0, 0, 7);
  gctx.fill();
}

function gameOver() {
  G.over = true;
  running = false;
  document.getElementById('go-stats').textContent =
    `You held for ${G.wave} waves and ${Math.floor(G.time)} seconds. ` +
    `${G.kills} Germans will not go home.`;
  document.getElementById('gameover').classList.remove('hidden');
}

// ============================================================ rendering

function paintGround() {
  // base mud/grass field, painted once per game
  gctx.fillStyle = '#5c5a3f';
  gctx.fillRect(0, 0, W, H);
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
  const us = a.side === 'us';
  c.save();
  c.translate(a.x, a.y);
  c.rotate(a.face);
  // ground shadow
  c.fillStyle = 'rgba(0,0,0,0.2)';
  c.beginPath(); c.ellipse(-1, 1.5, 10.5, 4, 0, 0, 7); c.fill();
  // weapon laid out beside him, not shouldered
  c.strokeStyle = '#26261e';
  c.lineWidth = 1.8;
  c.beginPath(); c.moveTo(3, 2.8); c.lineTo(3 + a.t.gun * 0.8, 2.8); c.stroke();
  // legs trailing behind
  c.strokeStyle = a.t.color;
  c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(-4, 0); c.lineTo(-10, -1.8); c.stroke();
  c.beginPath(); c.moveTo(-4, 0); c.lineTo(-10, 1.8); c.stroke();
  // torso stretched along the facing
  c.fillStyle = a.t.color;
  c.beginPath(); c.ellipse(-1, 0, 6.5, 3.2, 0, 0, 7); c.fill();
  // helmet at the head end
  c.fillStyle = a.type === 'medic' ? '#ddd8c8' : us ? '#5b6b4a' : '#61615a';
  c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = 1;
  c.beginPath(); c.arc(5, 0, 3.2, 0, 7); c.stroke();
  c.restore();
}

// a Fallschirmjäger under canopy: shadow on the deck, man swinging below
// the silk, descending from altitude as the chute timer burns down
function drawParatrooper(e) {
  const c = ctx;
  const p = clamp(e.chute / (e.chuteMax || 3), 0, 1);   // 1 = high, 0 = touchdown
  const alt = p * 130;
  const sway = Math.sin(e.sway || 0) * (3 + p * 5);

  // ground shadow sharpens and grows as he comes down
  c.fillStyle = `rgba(0,0,0,${0.08 + (1 - p) * 0.17})`;
  c.beginPath(); c.ellipse(e.x, e.y + 2, 4 + (1 - p) * 5, 2 + (1 - p) * 2.5, 0, 0, 7); c.fill();

  const mx = e.x + sway;          // man, pendulum under the canopy
  const my = e.y - alt;
  const cx = e.x + sway * 0.35;   // canopy lags the swing
  const cy = my - 22;

  c.save();

  // shroud lines
  c.strokeStyle = 'rgba(60,58,48,0.85)';
  c.lineWidth = 0.7;
  for (const off of [-13, -6, 6, 13]) {
    c.beginPath();
    c.moveTo(cx + off, cy + 3);
    c.lineTo(mx, my - 4);
    c.stroke();
  }

  // canopy dome with gore seams
  c.fillStyle = '#8b8570';
  c.beginPath();
  c.moveTo(cx - 15, cy + 3);
  c.quadraticCurveTo(cx, cy - 14, cx + 15, cy + 3);
  c.quadraticCurveTo(cx, cy + 7, cx - 15, cy + 3);
  c.fill();
  c.strokeStyle = 'rgba(50,48,38,0.6)';
  c.lineWidth = 0.8;
  for (const gx of [-7.5, 0, 7.5]) {
    c.beginPath();
    c.moveTo(cx + gx, cy + (Math.abs(gx) > 5 ? 3.6 : 4.8));
    c.quadraticCurveTo(cx + gx * 0.4, cy - 8, cx, cy - 12);
    c.stroke();
  }

  // the jumper: body, dangling legs, helmet
  c.strokeStyle = '#4a4a40';
  c.lineWidth = 1.6;
  for (const lx of [-1.6, 1.6]) {
    c.beginPath();
    c.moveTo(mx + lx, my + 1);
    c.lineTo(mx + lx + sway * 0.15, my + 6);
    c.stroke();
  }
  c.fillStyle = e.t.color;
  c.beginPath(); c.ellipse(mx, my - 1, 3.4, 4.6, 0, 0, 7); c.fill();
  c.fillStyle = '#5a5a4c';
  c.beginPath(); c.arc(mx, my - 6, 2.6, 0, 7); c.fill();

  c.restore();
}

function drawSoldier(a) {
  if (a.prone > 0) {
    drawProneSoldier(a);
    drawSoldierOverlays(a);
    return;
  }
  const c = ctx;
  const type = a.type;
  const us = a.side === 'us';
  const isSniper = type === 'sniper' || type === 'esniper';
  const isMG = type === 'gunner' || type === 'emg';
  const isSMG = type === 'engineer' || type === 'esmg';
  const isShotgun = type === 'shotgunner';
  const isOfficer = type === 'officer' || type === 'eoff';
  const fx = Math.cos(a.face), fy = Math.sin(a.face);
  c.save();
  c.translate(a.x, a.y);

  // shadow
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath(); c.ellipse(0, 3, 8, 4, 0, 0, 7); c.fill();

  // ---- weapon: silhouette varies by class
  c.strokeStyle = '#26261e';
  c.lineWidth = isMG ? 3 : isSMG ? 2.6 : isSniper ? 1.6 : isShotgun ? 3.2 : 2;
  c.beginPath();
  c.moveTo(fx * 2, fy * 2);
  c.lineTo(fx * a.t.gun, fy * a.t.gun);
  c.stroke();
  if (isShotgun) {
    // wide muzzle on the trench gun
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(fx * (a.t.gun - 1.5) - fy * 1.2, fy * (a.t.gun - 1.5) + fx * 1.2);
    c.lineTo(fx * (a.t.gun - 1.5) + fy * 1.2, fy * (a.t.gun - 1.5) - fx * 1.2);
    c.stroke();
    // pump grip under the barrel
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(fx * (a.t.gun * 0.45), fy * (a.t.gun * 0.45));
    c.lineTo(fx * (a.t.gun * 0.45) - fy * 3.5, fy * (a.t.gun * 0.45) + fx * 3.5);
    c.stroke();
  }
  if (isMG) {
    // bipod prongs at the muzzle
    c.lineWidth = 1.2;
    for (const s of [-0.55, 0.55]) {
      c.beginPath();
      c.moveTo(fx * a.t.gun, fy * a.t.gun);
      c.lineTo(Math.cos(a.face + s) * (a.t.gun + 3.5), Math.sin(a.face + s) * (a.t.gun + 3.5));
      c.stroke();
    }
  }
  if (isSMG) {
    // box magazine hanging under the gun
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(fx * (a.t.gun * 0.55), fy * (a.t.gun * 0.55));
    c.lineTo(fx * (a.t.gun * 0.55) - fy * 3, fy * (a.t.gun * 0.55) + fx * 3);
    c.stroke();
  }
  if (isSniper) {
    // scope block midway down the barrel
    c.fillStyle = '#1c1c16';
    c.beginPath(); c.arc(fx * (a.t.gun * 0.5), fy * (a.t.gun * 0.5), 1.7, 0, 7); c.fill();
  }
  if (a.t.flame) {
    // orange pilot light at the nozzle
    c.fillStyle = '#ff9a2a';
    c.beginPath(); c.arc(fx * (a.t.gun + 1), fy * (a.t.gun + 1), 1.5, 0, 7); c.fill();
  }

  // ---- body
  c.fillStyle = a.t.color;
  c.beginPath(); c.ellipse(0, 0, isShotgun ? 7.5 : 6.5, isShotgun ? 5.8 : 5, a.face, 0, 7); c.fill();
  if (isShotgun) {
    // steel chest plate and pauldrons
    c.fillStyle = '#4a5245';
    c.beginPath(); c.ellipse(fx * 1.2, fy * 1.2, 5.8, 4.8, a.face, 0, 7); c.fill();
    c.strokeStyle = '#2e3328';
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = '#555f4a';
    c.beginPath(); c.ellipse(-fy * 4.5, fx * 4.5, 2.2, 2.8, a.face, 0, 7); c.fill();
    c.beginPath(); c.ellipse(fy * 4.5, -fx * 4.5, 2.2, 2.8, a.face, 0, 7); c.fill();
  }
  if (isSniper) {
    // ghillie mottle
    c.fillStyle = 'rgba(30,36,22,0.55)';
    c.beginPath(); c.ellipse(-2, 1.5, 2.4, 1.5, 0.5, 0, 7); c.fill();
    c.beginPath(); c.ellipse(2.5, -1, 2, 1.3, -0.7, 0, 7); c.fill();
    c.beginPath(); c.ellipse(0.5, 3, 1.7, 1.1, 0.2, 0, 7); c.fill();
  }
  if (isMG) {
    // ammo bandolier slung across the chest
    c.strokeStyle = us ? '#8a7a48' : '#4a4a3e';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(-fy * 5 - fx * 2, fx * 5 - fy * 2);
    c.lineTo(fy * 5 - fx * 2, -fx * 5 - fy * 2);
    c.stroke();
  }
  if (type === 'esmg') {
    // stormtrooper y-straps
    c.strokeStyle = '#3c3c33';
    c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-3, -3); c.lineTo(0, 2); c.lineTo(3, -3); c.stroke();
  }

  // ---- class kit
  if (us && a.t.grenade) {
    // frags clipped to his webbing
    c.fillStyle = '#232920';
    c.beginPath(); c.arc(-4.5, 3, 1.9, 0, 7); c.fill();
    c.beginPath(); c.arc(-1.2, 4.7, 1.9, 0, 7); c.fill();
    c.strokeStyle = '#111';
    c.lineWidth = 0.7;
    c.beginPath(); c.arc(-4.5, 3, 1.9, 0, 7); c.stroke();
  }
  if (type === 'egren') {
    // stick grenade at the belt
    c.strokeStyle = '#6b5330';
    c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-6, 2); c.lineTo(-2, 5.5); c.stroke();
    c.fillStyle = '#33332a';
    c.beginPath(); c.arc(-6.5, 1.5, 1.8, 0, 7); c.fill();
  }
  if (a.t.rocket) {
    // launcher tube across the shoulders, open ends visible
    c.strokeStyle = '#5a5c42';
    c.lineWidth = 3.2;
    c.beginPath(); c.moveTo(-8, -4); c.lineTo(8, -6.5); c.stroke();
    c.fillStyle = '#1c1c16';
    c.beginPath(); c.arc(8, -6.5, 1.6, 0, 7); c.fill();
  }
  if (a.t.mortar) {
    // baseplate and angled tube beside him
    c.fillStyle = '#2f3328';
    c.beginPath(); c.ellipse(-7.5, 4.5, 4, 2.3, 0, 0, 7); c.fill();
    c.strokeStyle = '#5a5c42';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(-7.5, 4.5); c.lineTo(-4, -6); c.stroke();
    c.fillStyle = '#1c1c16';
    c.beginPath(); c.arc(-4, -6, 1.5, 0, 7); c.fill();
  }
  if (a.t.flame) {
    // twin fuel tanks on his back
    c.fillStyle = '#6b3d20';
    c.beginPath(); c.ellipse(-6, -2, 2.1, 3.8, 0, 0, 7); c.fill();
    c.fillStyle = '#38392c';
    c.beginPath(); c.ellipse(-6, 3, 2.1, 3.8, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 0.8;
    c.beginPath(); c.ellipse(-6, -2, 2.1, 3.8, 0, 0, 7); c.stroke();
    c.beginPath(); c.ellipse(-6, 3, 2.1, 3.8, 0, 0, 7); c.stroke();
  }

  // ---- headgear
  if (isOfficer) {
    // peaked cap with a brim toward the facing
    c.fillStyle = us ? '#3f4a2e' : '#3c3c33';
    c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.beginPath();
    c.ellipse(fx * 3.2, -1 + fy * 3.2, 2.6, 1.4, a.face, 0, 7);
    c.fill();
    c.fillStyle = '#ffd94a';
    c.beginPath(); c.arc(0, -1, 1.5, 0, 7); c.fill();
  } else if (isSniper) {
    // hood, no shine, no outline — he doesn't want to be seen
    c.fillStyle = us ? '#2e3823' : '#3f3f34';
    c.beginPath(); c.arc(0, -1, 4.0, 0, 7); c.fill();
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
  }
  if (a.type === 'engineer') {
    // crossed-tools mark on the helmet
    c.strokeStyle = '#e8d98a';
    c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(-2.4, -3.4); c.lineTo(2.4, 1.4); c.stroke();
    c.beginPath(); c.moveTo(2.4, -3.4); c.lineTo(-2.4, 1.4); c.stroke();
  }

  c.restore();

  drawSoldierOverlays(a);
}

// health bar, rank chevrons, selection ring: drawn whether standing or prone
function drawSoldierOverlays(a) {
  // health bar when wounded
  if (a.hp < a.maxhp) {
    const f = clamp(a.hp / a.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(a.x - 9, a.y - 13, 18, 3);
    ctx.fillStyle = f > 0.5 ? '#7ec850' : f > 0.25 ? '#e0b040' : '#d04030';
    ctx.fillRect(a.x - 9, a.y - 13, 18 * f, 3);
  }

  // rank chevrons for veterans
  if (a.side === 'us' && a.rank > 0) {
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

  // selection ring
  if (G.selected === a) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(a.x, a.y, 12, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    const label = RANKS[a.rank].name + ' ' + a.t.name.toUpperCase() + ' \u2014 ' +
      (a.type === 'medic' || a.type === 'engineer' ? a.xp + ' XP' : a.xp + ' KILLS');
    ctx.fillText(label, a.x + 1, a.y + 23);
    ctx.fillStyle = '#ffe98a';
    ctx.fillText(label, a.x, a.y + 22);
  }
}

function drawTank(a) {
  const us = a.side === 'us';
  const c = ctx;
  c.save();
  c.translate(a.x, a.y);
  // shadow
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath(); c.ellipse(0, 4, 26, 18, 0, 0, 7); c.fill();
  // tracks
  c.fillStyle = '#2f2f28';
  c.fillRect(-24, -16, 8, 32);
  c.fillRect(16, -16, 8, 32);
  // hull
  c.fillStyle = a.t.color;
  c.fillRect(-17, -14, 34, 28);
  c.strokeStyle = us ? '#39462f' : '#3a3a32';
  c.lineWidth = 1.5;
  c.strokeRect(-17, -14, 34, 28);
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
  // turret
  c.rotate(a.turret);
  c.fillStyle = us ? '#54634a' : '#4c4c43';
  c.fillRect(6, -2.5, 24, 5);          // barrel
  c.beginPath(); c.arc(0, 0, 10, 0, 7); c.fill();
  c.strokeStyle = us ? '#39462f' : '#33332c';
  c.beginPath(); c.arc(0, 0, 10, 0, 7); c.stroke();
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

  if (us && G.selected === a) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(a.x, a.y, 30, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    const label = RANKS[a.rank].name + ' ' + a.t.name.toUpperCase() + ' \u2014 ' + a.xp + ' KILLS';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(label, a.x + 1, a.y + 41);
    ctx.fillStyle = '#ffe98a';
    ctx.fillText(label, a.x, a.y + 40);
  }
}

function stampJeepWreck(a) {
  gctx.save();
  gctx.translate(a.x, a.y);
  gctx.rotate(rand(-0.5, 0.5));
  gctx.fillStyle = '#33322a';
  gctx.fillRect(-7, -12, 14, 24);
  gctx.fillStyle = '#211f1a';
  gctx.beginPath(); gctx.arc(0, -2, 5, 0, 7); gctx.fill();
  gctx.restore();
}

function drawJeep(a) {
  const us = a.side === 'us';
  const c = ctx;
  c.save();
  c.translate(a.x, a.y);
  // shadow
  c.fillStyle = 'rgba(0,0,0,0.28)';
  c.beginPath(); c.ellipse(0, 3, 11, 14, 0, 0, 7); c.fill();
  // wheels
  c.fillStyle = '#26251f';
  for (const [wx, wy] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) c.fillRect(wx - 1.5, wy - 3, 3, 6);
  // hull
  c.fillStyle = a.t.color;
  c.fillRect(-7, -12, 14, 24);
  c.strokeStyle = us ? '#39462f' : '#3c3c32';
  c.lineWidth = 1.2;
  c.strokeRect(-7, -12, 14, 24);
  // hood seam + windshield (front faces the enemy for us, downfield for them)
  const front = us ? -1 : 1;
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.moveTo(-7, front * 5); c.lineTo(7, front * 5); c.stroke();
  c.fillStyle = 'rgba(20,22,18,0.5)';
  c.fillRect(-5.5, front * 3 - 1, 11, 2);
  if (us) {
    c.fillStyle = 'rgba(230,230,220,0.85)';
    c.beginPath(); c.arc(0, 7, 2, 0, 7); c.fill();
  }
  // pintle .50 cal and gunner
  c.rotate(a.face);
  c.strokeStyle = '#1c1c16';
  c.lineWidth = 2.6;
  c.beginPath(); c.moveTo(2, 0); c.lineTo(a.t.gun + 2, 0); c.stroke();
  c.rotate(-a.face);
  c.fillStyle = us ? '#5b6b4a' : '#61615a';
  c.beginPath(); c.arc(0, 0, 3.2, 0, 7); c.fill();
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
  if (us && G.selected === a) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.arc(a.x, a.y, 20, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    const label = RANKS[a.rank].name + ' ' + a.t.name.toUpperCase() + ' \u2014 ' + a.xp + ' KILLS';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(label, a.x + 1, a.y + 31);
    ctx.fillStyle = '#ffe98a';
    ctx.fillText(label, a.x, a.y + 30);
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

function drawDefenses() {
  for (const wr of G.wires) {
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

  for (const s of G.sandbags) {
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

  for (const m of G.mines) {
    ctx.fillStyle = '#38352a';
    ctx.beginPath(); ctx.arc(m.x, m.y, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#565040';
    ctx.beginPath(); ctx.arc(m.x, m.y, 2, 0, 7); ctx.fill();
  }
}

function draw() {
  ctx.drawImage(groundCanvas, 0, 0);
  for (const m of G.groundMarks) drawGroundMark(m, ctx);

  for (const cp of G.corpses) drawCorpse(cp);

  drawDefenses();

  // shell target markers
  for (const s of G.shells) {
    ctx.strokeStyle = 'rgba(200,60,40,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(s.x, s.y, 6 + Math.sin(G.time * 10) * 2, 0, 7); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x - 9, s.y); ctx.lineTo(s.x + 9, s.y);
    ctx.moveTo(s.x, s.y - 9); ctx.lineTo(s.x, s.y + 9);
    ctx.stroke();
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
      // sitting on the ground, blinking faster as the fuse burns down
      const blink = Math.sin(g.fuse * (14 - g.fuse * 2)) > 0;
      ctx.fillStyle = '#2e3226';
      ctx.beginPath(); ctx.arc(g.tx, g.ty, 2.5, 0, 7); ctx.fill();
      if (blink) {
        ctx.fillStyle = '#ff5a2a';
        ctx.beginPath(); ctx.arc(g.tx, g.ty - 3, 1.2, 0, 7); ctx.fill();
      }
    } else {
      const f = g.t / g.dur;
      const x = g.sx + (g.tx - g.sx) * f;
      const y = g.sy + (g.ty - g.sy) * f - Math.sin(f * Math.PI) * 34;
      ctx.fillStyle = '#2e3226';
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill();
    }
  }

  for (const e of G.enemies) {
    if (e.chute > 0) drawParatrooper(e);
    else if (e.t.tank) drawTank(e);
    else if (e.t.bike) drawBike(e);
    else if (e.t.apc) drawHalftrack(e);
    else if (e.t.vehicle) drawJeep(e);
    else drawSoldier(e);
  }
  for (const u of G.units) {
    if (u.t.tank) drawTank(u);
    else if (u.t.vehicle) drawJeep(u);
    else drawSoldier(u);
  }

  // tracers
  ctx.lineWidth = 1.2;
  for (const tr of G.tracers) {
    ctx.strokeStyle = 'rgba(255,235,170,0.8)';
    ctx.beginPath(); ctx.moveTo(tr.x1, tr.y1); ctx.lineTo(tr.x2, tr.y2); ctx.stroke();
  }

  // particles
  for (const p of G.particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }

  // explosion flashes
  for (const f of G.flashes) {
    const a = f.ttl / f.max;
    const grd = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
    grd.addColorStop(0, `rgba(255,240,180,${0.9 * a})`);
    grd.addColorStop(0.5, `rgba(255,140,40,${0.5 * a})`);
    grd.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
  }

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

  drawPlacementGhost();
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
    const r = p.key === 'artillery' ? 95 : 55;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10);
    ctx.stroke();
  } else {
    // shade the invalid zone
    ctx.fillStyle = 'rgba(200,50,40,0.12)';
    ctx.fillRect(0, 0, W, placementMinY(p));
    const ghostPositions = p.key === 'mine' ? minefieldPositions(x, y) : [{ x, y }];
    ctx.fillStyle = valid ? 'rgba(120,200,90,0.8)' : 'rgba(210,70,50,0.8)';
    for (const pos of ghostPositions) {
      ctx.beginPath(); ctx.arc(pos.x, pos.y, p.key === 'mine' ? 5 : 9, 0, 7); ctx.fill();
    }
    const ut = UNIT_TYPES[p.key];
    if (ut) {
      // show the reach of his main weapon, not the sidearm
      let r = ut.range;
      if (ut.rocket) r = ut.rocket.range;
      if (ut.mortar) r = ut.mortar.range;
      if (ut.shotgun) r = ut.shotgun.range;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, r * fogMult(), 0, 7); ctx.stroke();
      if (ut.mortar) {
        // dead zone he cannot drop shells into
        ctx.strokeStyle = 'rgba(210,80,50,0.5)';
        ctx.beginPath(); ctx.arc(x, y, ut.mortar.min, 0, 7); ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ============================================================ HUD / DOM

const el = id => document.getElementById(id);
const hud = { tp: el('tp'), wave: el('wave'), kills: el('kills'), breach: el('breach') };
const bannerEl = el('banner');

function updateHUD() {
  hud.tp.textContent = Math.floor(G.tp);
  hud.wave.textContent = G.wave;
  hud.kills.textContent = G.kills;
  hud.breach.textContent = G.breaches + '/' + MAX_BREACH;

  if (G.banner) {
    bannerEl.textContent = G.banner.text;
    bannerEl.classList.add('show');
  } else {
    bannerEl.classList.remove('show');
  }

  for (const btn of toolButtons) {
    const capped = btn.p.key === 'officer' && officerCount() >= MAX_OFFICERS;
    btn.el.disabled = G.tp < btn.p.cost || capped;
    btn.el.classList.toggle('active', placing === btn.p);
  }
}

const toolButtons = [];
function buildToolbar() {
  const bar = el('toolbar');
  PLACEABLES.forEach((p) => {
    const b = document.createElement('button');
    b.className = 'tool-btn';
    b.title = p.desc;
    b.innerHTML = `<span class="key">[${p.hotkey}]</span>${p.label}<span class="cost">${p.cost} TP</span>`;
    b.addEventListener('click', () => selectPlaceable(p));
    bar.appendChild(b);
    toolButtons.push({ p, el: b });
  });
}

function selectPlaceable(p) {
  if (!running) return;
  if (G.tp < p.cost) { SFX.error(); return; }
  if (p.key === 'officer' && officerCount() >= MAX_OFFICERS) { SFX.error(); return; }
  SFX.click();
  placing = (placing === p) ? null : p;
  G.selected = null;
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

function placementMinY(p) {
  return (p.key === 'mine' || p.key === 'wire') ? FORWARD_Y : DEPLOY_Y + 12;
}

function placementValid(p, x, y) {
  if (p.kind === 'support') return y > 20 && y < H - 10;
  const positions = p.key === 'mine' ? minefieldPositions(x, y) : [{ x, y }];
  const minY = placementMinY(p);
  for (const pos of positions) {
    if (pos.y < minY || pos.y > H - 14 || pos.x < 16 || pos.x > W - 16) return false;
  }
  if (p.kind === 'unit') {
    const bulk = k => k === 'sherman' ? 34 : k === 'jeep' ? 26 : 16;
    for (const u of G.units) {
      const gap = Math.max(bulk(p.key), u.t.tank ? 34 : u.t.vehicle ? 26 : 16);
      if (dist(u, { x, y }) < gap) return false;
    }
  }
  return true;
}

function place(p, x, y) {
  if (!placementValid(p, x, y)) { SFX.error(); return; }
  if (G.tp < p.cost) { SFX.error(); placing = null; return; }
  if (p.key === 'officer' && officerCount() >= MAX_OFFICERS) { SFX.error(); placing = null; return; }
  G.tp -= p.cost;
  SFX.click();

  if (p.kind === 'unit') {
    G.units.push(makeUnit(p.key, x, y));
  } else if (p.key === 'sandbags') {
    G.sandbags.push({ x, y, hp: 300, maxhp: 300, up: false, workProg: 0 });
  } else if (p.key === 'wire') {
    G.wires.push({ x, y, hp: 3750, maxhp: 3750, up: false, workProg: 0 });
  } else if (p.key === 'mine') {
    for (const pos of minefieldPositions(x, y)) {
      G.mines.push({ x: pos.x, y: pos.y, dead: false });
    }
  } else if (p.key === 'mortar') {
    showBanner('MORTAR FIRE MISSION');
    for (let i = 0; i < 3; i++) {
      scheduleShell(x + rand(-68, 68), y + rand(-57, 57), 2.4 + i * 1.0, 42, 90, false);
    }
  } else if (p.key === 'artillery') {
    showBanner('105mm BARRAGE INBOUND');
    for (let i = 0; i < 16; i++) {
      scheduleShell(x + rand(-90, 90), y + rand(-70, 70), 1.6 + i * 0.45, 55, 105, true);
    }
  }
  // keep placing defenses if affordable; supports are one-shot
  if (p.kind === 'support' || G.tp < p.cost || (p.key === 'officer' && officerCount() >= MAX_OFFICERS)) placing = null;
}

canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (W / r.width);
  mouse.y = (e.clientY - r.top) * (H / r.height);
  mouse.inside = true;
});
canvas.addEventListener('mouseleave', () => { mouse.inside = false; });

canvas.addEventListener('click', e => {
  if (!running) return;
  const x = mouse.x, y = mouse.y;

  if (placing) { place(placing, x, y); return; }

  // select own soldier (vehicles are a bigger click target)
  let picked = null;
  for (const u of G.units) {
    if (dist(u, { x, y }) < (u.t.tank ? 26 : u.t.vehicle ? 20 : 14)) { picked = u; break; }
  }
  if (picked) {
    G.selected = picked;
    SFX.click();
    return;
  }
  // move selected soldier
  if (G.selected && y > FORWARD_Y && y < H - 14) {
    G.selected.moveTo = { x: clamp(x, 16, W - 16), y };
    SFX.click();
    return;
  }
  G.selected = null;
});

canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  placing = null;
  G && (G.selected = null);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { placing = null; if (G) G.selected = null; return; }
  const k = e.key.toUpperCase();
  const p = PLACEABLES.find(pl => pl.hotkey === k);
  if (p) selectPlaceable(p);
});

el('mute').addEventListener('click', () => {
  const m = SFX.toggleMute();
  el('mute').textContent = m ? 'SND OFF' : 'SND ON';
});

// ============================================================ codex

const CODEX_PW = 72, CODEX_PH = 72;
let codexTab = 'troops';

function drawCodexIcon(key) {
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
  }
}

function renderPortrait(typeKey, side) {
  const pc = document.createElement('canvas');
  pc.width = CODEX_PW;
  pc.height = CODEX_PH;
  const savedCtx = ctx;
  const savedG = G;
  ctx = pc.getContext('2d');
  G = { selected: null };

  const defenseKeys = ['wire', 'sandbags', 'mine', 'mortar', 'artillery'];
  const eventKeys = EVENT_INFO.map(e => e.key);
  if (defenseKeys.includes(typeKey) || eventKeys.includes(typeKey)) {
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
      return {
        key,
        side: 'de',
        name: t.name,
        stats: parts.join(' · '),
        desc: ENEMY_INFO[key],
      };
    });
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

    card.appendChild(portrait);
    card.appendChild(body);
    list.appendChild(card);
  }
}

function openCodex() {
  buildCodex(codexTab);
  el('intro').classList.add('hidden');
  el('codex').classList.remove('hidden');
}

function closeCodex() {
  el('codex').classList.add('hidden');
  el('intro').classList.remove('hidden');
}

el('codex-btn').addEventListener('click', openCodex);
el('codex-back-btn').addEventListener('click', closeCodex);
for (const btn of document.querySelectorAll('.codex-tab')) {
  btn.addEventListener('click', () => buildCodex(btn.dataset.tab));
}

// ============================================================ game flow

function startGame() {
  SFX.resume();
  newGame();
  placing = null;
  running = true;
  el('intro').classList.add('hidden');
  el('gameover').classList.add('hidden');
  el('codex').classList.add('hidden');
  lastT = performance.now();
}

el('start-btn').addEventListener('click', startGame);
el('restart-btn').addEventListener('click', startGame);

function frame(now) {
  requestAnimationFrame(frame);
  if (!G) return;
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;
  if (running && !G.over) update(dt);
  draw();
  updateHUD();
}

buildToolbar();
requestAnimationFrame(frame);
