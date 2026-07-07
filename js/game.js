/* Mud & Blood — HTML5 remake of the classic Flash squad-defense game.
   Vanilla JS + Canvas. No build step, no assets. */
'use strict';

// ============================================================ constants

const W = 900, H = 620;
const DEPLOY_Y = 380;          // your side of the field starts here
const MAX_BREACH = 7;

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
    mortar: { range: 520, min: 220, cdMin: 5.5, cdMax: 7.5, r: 40, dmg: 75, flight: 1.6 },
    desc: 'Portable 60mm mortar. Indirect fire at range.',
  },
  sniper: {
    name: 'Sniper', hp: 85, range: 465, dmg: 46, acc: 0.72,
    rof: 2.6, burst: 1, burstGap: 0, speed: 38,
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
    desc: 'Repairs tanks and fortifications, upgrades emplacements. M3 grease gun up close.',
  },
  officer: {
    name: 'Officer', hp: 95, range: 150, dmg: 9, acc: 0.5,
    rof: 0.9, burst: 1, burstGap: 0, speed: 44,
    color: '#6b6d44', gun: 5, sfx: 'pistol',
    desc: 'Nearby men fire faster and straighter. Earns +1 TP / 10 s.',
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
    name: 'Sniper', hp: 55, speed: 14, range: 390, dmg: 39, acc: 0.66,
    rof: 3.4, burst: 1, burstGap: 0, reward: 4,
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
    name: 'Sd.Kfz. 251', hp: 500, speed: 30, range: 240, dmg: 7, acc: 0.38,
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

// promotion ladder: kills needed to reach each rank; every rank = faster, straighter fire
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
  { key: 'bazooka', label: 'BAZOOKA', cost: 11, kind: 'unit', hotkey: 'B',
    desc: 'M1A1 rocket launcher. Wildly inaccurate at range, but armor is a big target. Splash hurts friends.' },
  { key: 'mortarman', label: 'MORTARMAN', cost: 14, kind: 'unit', hotkey: 'M',
    desc: 'Portable 60mm mortar. Long-range indirect fire; useless against close targets.' },
  { key: 'sniper', label: 'SNIPER', cost: 10, kind: 'unit', hotkey: '4',
    desc: 'Sees the whole field. Hunts officers, snipers and MGs.' },
  { key: 'medic', label: 'MEDIC', cost: 12, kind: 'unit', hotkey: '5',
    desc: 'Heals nearby soldiers over time.' },
  { key: 'engineer', label: 'ENGINEER', cost: 14, kind: 'unit', hotkey: 'E',
    desc: 'Repairs tanks and fortifications; fortifies nearby emplacements (better stats). SMG for close range only.' },
  { key: 'officer', label: 'OFFICER', cost: 15, kind: 'unit', hotkey: '6',
    desc: 'Buffs nearby men. Generates +1 TP every 10 s.' },
  { key: 'flamer', label: 'FLAMER', cost: 13, kind: 'unit', hotkey: 'F',
    desc: 'M2 flamethrower. Devastating cone of fire that burns friend and foe alike.' },
  { key: 'jeep', label: 'JEEP', cost: 20, kind: 'unit', hotkey: 'J',
    desc: 'Willys jeep with a .50 cal HMG. Fires on the move. Unarmored — engineer repairs, medics can\'t.' },
  { key: 'sherman', label: 'SHERMAN', cost: 50, kind: 'unit', hotkey: 'T',
    desc: 'M4 Sherman tank. 75mm HE cannon, shrugs off small arms. Medics cannot repair it.' },
  { key: 'wire', label: 'WIRE', cost: 4, kind: 'defense', hotkey: '7',
    desc: 'Barbed wire. Slows the German advance until it wears out.' },
  { key: 'sandbags', label: 'SANDBAGS', cost: 5, kind: 'defense', hotkey: '8',
    desc: 'Cover. Soldiers behind it dodge half of incoming fire.' },
  { key: 'mine', label: 'MINE', cost: 6, kind: 'defense', hotkey: '9',
    desc: 'Anti-personnel mine. Hurts tanks too. Germans can\'t see it.' },
  { key: 'mortar', label: 'MORTAR', cost: 8, kind: 'support', hotkey: '0',
    desc: '3 mortar shells on target. DANGER CLOSE — friendly fire is real.' },
  { key: 'artillery', label: 'ARTY', cost: 16, kind: 'support', hotkey: 'A',
    desc: '105mm barrage: 8 heavy shells, wide spread. Devastating. Indiscriminate.' },
];

// ============================================================ helpers

const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ============================================================ state

let G = null;         // game state
let placing = null;   // placeable currently being placed
let mouse = { x: W / 2, y: H / 2, inside: false };
let running = false;
let lastT = 0;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// persistent ground layer (blood, craters, corpses get stamped here)
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

    spawnTimer: 5,
    tpTrickle: 8,
    officerTick: 10,
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
    mortCd: rand(2, 4),
    xp: 0, rank: 0,
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

function waveComposition(w) {
  const size = Math.min(2 + Math.floor(w / 3) + (Math.random() < 0.4 ? 1 : 0), 8);
  const pool = ['erifle', 'erifle', 'erifle'];
  if (w >= 4) pool.push('esmg', 'esmg');
  if (w >= 6) pool.push('egren');
  if (w >= 8) pool.push('emg');
  if (w >= 9) pool.push('eflame');
  const out = [];
  for (let i = 0; i < size; i++) out.push(pick(pool));
  if (w >= 10 && Math.random() < 0.35) out.push('eoff');
  // a motorcycle team races ahead of some waves; as German logistics spin
  // up, bikes ramp from 20% at wave 7 to a 90% cap at wave 99
  const bikeChance = Math.min(0.9, 0.2 + (w - 7) * (0.7 / 92));
  if (w >= 7 && Math.random() < bikeChance) out.push('ebike');
  // a Kübelwagen gun car rolls in occasionally
  if (w >= 8 && Math.random() < 0.15) out.push('ejeep');
  // an armored halftrack hauls a full squad to the front
  if (w >= 11 && Math.random() < 0.12) out.push('ehalftrack');
  // snipers are a rare menace: one at most, and not often
  if (w >= 12 && Math.random() < 0.12) out.push('esniper');
  if (w >= 15 && Math.random() < 0.12) out.push('panzer');
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
  G.spawnTimer = clamp(14 - G.wave * 0.25, 6, 14);
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

function triggerEvent() {
  const w = G.wave;
  const events = ['fog', 'fng'];
  if (w >= 4) events.push('barrage');
  if (w >= 12) events.push('barrage');
  if (w >= 24) events.push('barrage');
  if (w >= 40) events.push('barrage');
  if (w >= 8) events.push('airstrike');
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
  // crater on ground layer
  gctx.save();
  gctx.translate(x, y);
  gctx.fillStyle = 'rgba(30,26,18,0.55)';
  gctx.beginPath(); gctx.ellipse(0, 0, r * 0.55, r * 0.42, rand(0, 3), 0, 7); gctx.fill();
  gctx.fillStyle = 'rgba(20,17,12,0.6)';
  gctx.beginPath(); gctx.ellipse(0, 0, r * 0.3, r * 0.22, rand(0, 3), 0, 7); gctx.fill();
  gctx.restore();

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
    return dmg * (1 - (d / r) * 0.7) * rand(0.8, 1.2);
  };
  for (const e of G.enemies) {
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
  gctx.fillStyle = `rgba(${randi(90, 130)},${randi(10, 22)},${randi(8, 16)},${rand(0.25, 0.5)})`;
  gctx.beginPath();
  gctx.ellipse(x + rand(-6, 6), y + rand(-4, 8), rand(3, 9), rand(2, 6), rand(0, 3), 0, 7);
  gctx.fill();
}

const CORPSE_TTL = 120; // bodies are carried off after two minutes

function spawnCorpse(a) {
  // the blood pool soaks into the ground for good; the body itself is temporary
  gctx.fillStyle = `rgba(${randi(90, 120)},${randi(10, 20)},10,0.45)`;
  gctx.save();
  gctx.translate(a.x, a.y);
  gctx.rotate(rand(0, Math.PI * 2));
  gctx.beginPath(); gctx.ellipse(0, 2, 13, 8, 0, 0, 7); gctx.fill();
  gctx.restore();
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
}

function gainXP(u) {
  u.xp++;
  const next = RANKS[u.rank + 1];
  if (next && u.xp >= next.kills) {
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
}

// ============================================================ shooting

function fogMult() { return G.fog > 0 ? 0.6 : 1; }

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
    if (coverBlock(target)) {
      G.particles.push({ x: hx, y: hy + 6, vx: rand(-20, 20), vy: -40, ttl: 0.3, grav: 150, size: 1.5, color: '#b8a878' });
      return;
    }
    let dmg = t.dmg * rand(0.75, 1.25);
    if (target.t && target.t.tank) dmg *= 0.04;   // rifle rounds ping off armor
    else if (target.t && target.t.apc) dmg *= 0.3; // halftrack plate shrugs off most of it
    if (target.side === 'us') damageUnit(target, dmg, shooter);
    else damageEnemy(target, dmg, shooter);
  } else {
    G.particles.push({ x: hx, y: hy, vx: rand(-15, 15), vy: rand(-50, -10), ttl: 0.25, grav: 200, size: 1.2, color: '#6e6046' });
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
      actor.burstTimer = t.burstGap;
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
    if (e.dead || e.y < 0) continue;
    if (pred && !pred(e)) continue;
    const d = dist(u, e);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function sniperTarget(u, range) {
  let best = null, bp = -1, bd = Infinity;
  for (const e of G.enemies) {
    if (e.dead || e.t.tank || e.y < 0) continue;
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

  const dps = fl.dps * (1 + (actor.rank || 0) * 0.04);
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
  };
  for (const u of G.units) burn(u);
  for (const e of G.enemies) burn(e);
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
      return { rofMult: 0.75, accBonus: 0.18 };
    }
  }
  return null;
}

// officer aura + veterancy: each rank is 5% faster and 6% straighter fire
function unitBuffs(u) {
  const b = { rofMult: 1, accBonus: 0 };
  const ob = officerBuff(u);
  if (ob) { b.rofMult *= ob.rofMult; b.accBonus += ob.accBonus; }
  if (u.rank > 0) {
    b.rofMult *= 1 - u.rank * 0.05;
    b.accBonus += u.rank * 0.06;
  }
  return b;
}

function updateUnit(u, dt) {
  // a tank crew drives and fights at the same time
  if (u.t.tank) {
    if (u.moveTo) {
      const d = dist(u, u.moveTo);
      if (d < 4) {
        u.moveTo = null;
      } else {
        const ang = Math.atan2(u.moveTo.y - u.y, u.moveTo.x - u.x);
        u.x += Math.cos(ang) * u.t.speed * dt;
        u.y += Math.sin(ang) * u.t.speed * dt;
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
        u.x += Math.cos(ang) * u.t.speed * dt;
        u.y += Math.sin(ang) * u.t.speed * dt;
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
      u.x += Math.cos(u.face) * u.t.speed * dt;
      u.y += Math.sin(u.face) * u.t.speed * dt;
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
        // grenades are a rare, heavy punch — the carbine does the daily work
        u.grenCd = rand(11, 16);
        SFX.grenadeToss();
        G.grenades.push({
          x: u.x, y: u.y,
          tx: gt.x + rand(-12, 12), ty: gt.y + rand(-12, 12),
          t: 0, dur: 1.0, sx: u.x, sy: u.y, by: u,
          r: 46, dmg: 115,
        });
      }
    }
  }

  if (u.t.rocket) {
    u.rocketCd -= dt;
    if (u.rocketCd <= 0) {
      const rk = u.t.rocket;
      const rr = rk.range * fogMult();
      // armor first, infantry when there is none; never inside his own blast
      const safe = e => dist(u, e) > rk.r + 20;
      const rt = nearestEnemyInRange(u, rr, e => e.t.tank && safe(e)) ||
                 nearestEnemyInRange(u, rr, safe);
      if (rt && !friendlyNearPoint(rt.x, rt.y, 40, u)) {
        u.rocketCd = rand(rk.cdMin, rk.cdMax);
        u.face = Math.atan2(rt.y - u.y, rt.x - u.x);
        SFX.rocket();
        // rockets scatter badly with distance; a tank is a big, slow target,
        // and a veteran gunner walks his shots in
        const d = dist(u, rt);
        let scatter = 8 + d * 0.11;
        if (rt.t.tank) scatter *= 0.45;
        scatter = Math.max(6, scatter * (1 - u.rank * 0.06));
        const tx = rt.x + rand(-scatter, scatter), ty = rt.y + rand(-scatter, scatter);
        G.rockets.push({
          sx: u.x, sy: u.y, x: u.x, y: u.y, tx, ty,
          t: 0, dur: Math.max(dist(u, { x: tx, y: ty }) / rk.speed, 0.15),
          r: rk.r, dmg: rk.dmg, by: u,
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
        u.mortCd = rand(mt.cdMin, mt.cdMax);
        u.face = Math.atan2(target.y - u.y, target.x - u.x);
        SFX.thunk();
        G.flashes.push({ x: u.x, y: u.y - 6, r: 4, ttl: 0.06, max: 0.06 });
        scheduleShell(target.x + rand(-24, 24), target.y + rand(-24, 24),
          mt.flight, mt.r, mt.dmg, false, u);
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
        // experienced medics work a little faster
        const amt = Math.min(worst.maxhp - worst.hp, 3 + u.rank * 0.3);
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

// engineer work, one job at a time: patch tanks first, then repair
// emplacements, then fortify an intact one he's standing next to
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

  // 1) welding a vehicle back together beats everything else
  let tank = null;
  for (const a of G.units) {
    if (a.dead || !(a.t.tank || a.t.vehicle) || a.hp >= a.maxhp) continue;
    if (dist(u, a) < R + 15 && (!tank || a.hp / a.maxhp < tank.hp / tank.maxhp)) tank = a;
  }
  if (tank) {
    const amt = Math.min(tank.maxhp - tank.hp, 6 + u.rank * 0.5);
    tank.hp += amt;
    credit(amt);
    sparks(tank.x, tank.y);
    return;
  }

  // 2) restack damaged sandbags / restring damaged wire
  let emp = null, empFrac = 1;
  for (const s of [...G.sandbags, ...G.wires]) {
    if (s.hp >= s.maxhp || dist(u, s) > R) continue;
    const f = s.hp / s.maxhp;
    if (f < empFrac) { empFrac = f; emp = s; }
  }
  if (emp) {
    const amt = Math.min(emp.maxhp - emp.hp, 8 + u.rank * 0.6);
    emp.hp += amt;
    credit(amt * 0.5); // lighter work than armor plate
    sparks(emp.x, emp.y);
    return;
  }

  // 3) fortify the nearest intact, un-upgraded emplacement (~6 s of work)
  let target = null, td = R;
  for (const s of [...G.sandbags, ...G.wires]) {
    if (s.up) continue;
    const d = dist(u, s);
    if (d < td) { td = d; target = s; }
  }
  if (target) {
    target.workProg += 0.4 * (1 + u.rank * 0.05);
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
      if (a.mgTarget && !a.mgTarget.dead) fireShot(a, a.mgTarget, { weapon: mgSpec });
      a.burstLeft--;
      a.burstTimer = mgSpec.burstGap;
      if (a.burstLeft <= 0) {
        a.wpn = 'cannon';
        a.cd = Math.max(1.2, a.t.rof - 2.3) * rand(0.85, 1.15);
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
    scheduleShell(target.x + rand(-12, 12), target.y + rand(-12, 12),
      0.7, 45, a.t.shellDmg, false, a);
    a.wpn = 'mg';
    // a veteran crew works the reload faster
    a.cd = 1.5 * (1 - (a.rank || 0) * 0.04) * rand(0.85, 1.15);
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
      speed *= wr.up ? 0.15 : 0.3;
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
      speed *= 0.25;
      wr.hp -= 8 * dt;
      break;
    }
  }
  e.x = clamp(e.x + Math.sin(e.y * 0.015) * 12 * dt, 20, W - 20);
  e.y += speed * dt;
  e.face = Math.PI / 2;
}

// Sd.Kfz. 251 halftrack: an armored bus for a full squad. Troopers hop off
// the tailgate one per second on the drive in; at rifle distance of any
// defender it slams the brakes and the remaining six pile out at once.
// Afterward it fights on as a slow gun truck with its bow MG.
const APC_TRICKLE_POOL = ['erifle', 'erifle', 'esmg'];

function updateHalftrack(e, dt) {
  e.sfxT = (e.sfxT || 0) - dt;
  if (e.sfxT <= 0) { e.sfxT = 0.55; SFX.motor(); }

  if (!e.unloaded) {
    // one man off the tailgate every second while rolling
    e.dropT = (e.dropT === undefined ? 1 : e.dropT) - dt;
    if (e.dropT <= 0) {
      e.dropT = 1;
      const inf = makeEnemy(pick(APC_TRICKLE_POOL),
        clamp(e.x + rand(-10, 10), 14, W - 14), e.y - 24);
      G.enemies.push(inf);
    }
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
      speed *= 0.5;
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
    G.officerTick = 10;
    for (const u of G.units) if (!u.dead && u.type === 'officer') earnTP(1);
  }

  // spawning
  G.spawnTimer -= dt;
  if (G.spawnTimer <= 0) spawnWave();

  // random events
  if (G.wave >= 3) {
    G.eventTimer -= dt;
    if (G.eventTimer <= 0) {
      G.eventTimer = rand(40, 70);
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
      if (e.dead) continue;
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

  // grenades in flight
  for (const g of G.grenades) {
    g.t += dt;
    if (g.t >= g.dur) { g.done = true; explode(g.tx, g.ty, g.r || 38, g.dmg || 60, false, g.by); }
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

function drawSoldier(a) {
  const c = ctx;
  const type = a.type;
  const us = a.side === 'us';
  const isSniper = type === 'sniper' || type === 'esniper';
  const isMG = type === 'gunner' || type === 'emg';
  const isSMG = type === 'engineer' || type === 'esmg';
  const isOfficer = type === 'officer' || type === 'eoff';
  const fx = Math.cos(a.face), fy = Math.sin(a.face);
  c.save();
  c.translate(a.x, a.y);

  // shadow
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath(); c.ellipse(0, 3, 8, 4, 0, 0, 7); c.fill();

  // ---- weapon: silhouette varies by class
  c.strokeStyle = '#26261e';
  c.lineWidth = isMG ? 3 : isSMG ? 2.6 : isSniper ? 1.6 : 2;
  c.beginPath();
  c.moveTo(fx * 2, fy * 2);
  c.lineTo(fx * a.t.gun, fy * a.t.gun);
  c.stroke();
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
  c.beginPath(); c.ellipse(0, 0, 6.5, 5, a.face, 0, 7); c.fill();
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

  // grenades in flight (arc via fake height)
  for (const g of G.grenades) {
    const f = g.t / g.dur;
    const x = g.sx + (g.tx - g.sx) * f;
    const y = g.sy + (g.ty - g.sy) * f - Math.sin(f * Math.PI) * 34;
    ctx.fillStyle = '#2e3226';
    ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill();
  }

  for (const e of G.enemies) {
    if (e.t.tank) drawTank(e);
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
    ctx.fillRect(0, 0, W, DEPLOY_Y);
    ctx.fillStyle = valid ? 'rgba(120,200,90,0.8)' : 'rgba(210,70,50,0.8)';
    ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill();
    const ut = UNIT_TYPES[p.key];
    if (ut) {
      // show the reach of his main weapon, not the sidearm
      let r = ut.range;
      if (ut.rocket) r = ut.rocket.range;
      if (ut.mortar) r = ut.mortar.range;
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
    btn.el.disabled = G.tp < btn.p.cost;
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
  SFX.click();
  placing = (placing === p) ? null : p;
  G.selected = null;
}

// ============================================================ placement & input

function placementValid(p, x, y) {
  if (p.kind === 'support') return y > 20 && y < H - 10;
  if (y < DEPLOY_Y + 12 || y > H - 14 || x < 16 || x > W - 16) return false;
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
  G.tp -= p.cost;
  SFX.click();

  if (p.kind === 'unit') {
    G.units.push(makeUnit(p.key, x, y));
  } else if (p.key === 'sandbags') {
    G.sandbags.push({ x, y, hp: 300, maxhp: 300, up: false, workProg: 0 });
  } else if (p.key === 'wire') {
    G.wires.push({ x, y, hp: 250, maxhp: 250, up: false, workProg: 0 });
  } else if (p.key === 'mine') {
    G.mines.push({ x, y, dead: false });
  } else if (p.key === 'mortar') {
    showBanner('MORTAR FIRE MISSION');
    for (let i = 0; i < 3; i++) {
      scheduleShell(x + rand(-32, 32), y + rand(-26, 26), 1.2 + i * 0.5, 42, 90, false);
    }
  } else if (p.key === 'artillery') {
    showBanner('105mm BARRAGE INBOUND');
    for (let i = 0; i < 8; i++) {
      scheduleShell(x + rand(-90, 90), y + rand(-70, 70), 1.6 + i * 0.45, 55, 105, true);
    }
  }
  // keep placing defenses if affordable; supports are one-shot
  if (p.kind === 'support' || G.tp < p.cost) placing = null;
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
  if (G.selected && y > DEPLOY_Y + 12 && y < H - 14) {
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

// ============================================================ game flow

function startGame() {
  SFX.resume();
  newGame();
  placing = null;
  running = true;
  el('intro').classList.add('hidden');
  el('gameover').classList.add('hidden');
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
