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
    rof: 1.1, burst: 1, burstGap: 0, speed: 42,
    color: '#4a5d3a', gun: 7, sfx: 'rifle',
    desc: 'M1 Garand. The backbone of your line.',
  },
  gunner: {
    name: 'Gunner', hp: 100, range: 270, dmg: 9, acc: 0.4,
    rof: 1.7, burst: 6, burstGap: 0.09, speed: 36,
    color: '#3d5236', gun: 10, sfx: 'mg',
    desc: 'BAR automatic rifle. Suppressive bursts.',
  },
  grenadier: {
    name: 'Grenadier', hp: 100, range: 170, dmg: 10, acc: 0.5,
    rof: 1.2, burst: 1, burstGap: 0, speed: 42,
    color: '#44583c', gun: 6, sfx: 'rifle', grenade: true,
    desc: 'Carbine most of the time; a heavy frag now and then.',
  },
  bazooka: {
    name: 'Bazooka', hp: 90, range: 120, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, speed: 40,
    color: '#3f5138', gun: 5, sfx: 'pistol',
    rocket: { range: 330, cdMin: 4, cdMax: 5.5, r: 30, dmg: 120, speed: 380 },
    desc: 'M1A1 rocket launcher. The answer to armor.',
  },
  mortarman: {
    name: 'Mortarman', hp: 90, range: 120, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, speed: 38,
    color: '#4c5a3f', gun: 5, sfx: 'pistol',
    mortar: { range: 520, min: 160, cdMin: 5.5, cdMax: 7.5, r: 40, dmg: 75, flight: 1.6 },
    desc: 'Portable 60mm mortar. Indirect fire at range.',
  },
  sniper: {
    name: 'Sniper', hp: 85, range: 620, dmg: 65, acc: 0.85,
    rof: 2.6, burst: 1, burstGap: 0, speed: 38,
    color: '#38442e', gun: 12, sfx: 'sniper',
    desc: 'Springfield scoped rifle. Picks off officers and MGs first.',
  },
  medic: {
    name: 'Medic', hp: 90, range: 140, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, speed: 46,
    color: '#55684a', gun: 5, sfx: 'pistol',
    desc: 'Patches up nearby wounded. Carries a sidearm.',
  },
  officer: {
    name: 'Officer', hp: 95, range: 150, dmg: 9, acc: 0.5,
    rof: 0.9, burst: 1, burstGap: 0, speed: 44,
    color: '#5d6b42', gun: 5, sfx: 'pistol',
    desc: 'Nearby men fire faster and straighter. Earns +1 TP / 10 s.',
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
    name: 'Sniper', hp: 55, speed: 14, range: 520, dmg: 55, acc: 0.78,
    rof: 3.4, burst: 1, burstGap: 0, reward: 4,
    color: '#525244', gun: 12, sfx: 'sniper', priority: 4,
  },
  panzer: {
    name: 'Panzer IV', hp: 1200, speed: 8, range: 340, dmg: 0, acc: 0,
    rof: 4.5, burst: 1, burstGap: 0, reward: 15,
    color: '#57574e', gun: 0, sfx: 'boom', priority: 0, tank: true,
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
  { key: 'rifleman', label: 'RIFLEMAN', cost: 4, kind: 'unit', hotkey: '1',
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
  { key: 'officer', label: 'OFFICER', cost: 15, kind: 'unit', hotkey: '6',
    desc: 'Buffs nearby men. Generates +1 TP every 10 s.' },
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
  };
}

// ============================================================ waves & spawning

function waveComposition(w) {
  const size = Math.min(2 + Math.floor(w / 3) + (Math.random() < 0.4 ? 1 : 0), 8);
  const pool = ['erifle', 'erifle', 'erifle'];
  if (w >= 4) pool.push('esmg', 'esmg');
  if (w >= 6) pool.push('egren');
  if (w >= 8) pool.push('emg');
  if (w >= 12) pool.push('esniper');
  const out = [];
  for (let i = 0; i < size; i++) out.push(pick(pool));
  if (w >= 10 && Math.random() < 0.35) out.push('eoff');
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

function triggerEvent() {
  const w = G.wave;
  const events = [];
  if (w >= 4) events.push('barrage');
  events.push('fog', 'fng');
  if (w >= 8) events.push('airstrike');
  const ev = pick(events);
  SFX.event();

  if (ev === 'barrage') {
    showBanner('INCOMING BARRAGE!');
    SFX.alarm();
    for (let i = 0; i < 6; i++) {
      scheduleShell(rand(60, W - 60), rand(DEPLOY_Y - 30, H - 40),
        rand(1.5, 4.5), 48, 80, false);
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
    for (let i = 0; i < 5; i++) {
      scheduleShell(x + rand(-35, 35), 60 + i * 70, 0.6 + i * 0.18, 40, 90, false);
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
  bloodSplat(u.x, u.y, 3);
  if (u.hp <= 0 && !u.dead) {
    u.dead = true;
    spawnCorpse(u);
    bloodSplat(u.x, u.y, 8);
    SFX.scream();
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
  if (e.t.tank) {
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
    G.tp += e.t.reward;
    SFX.cash();
    creditKill(from);
    if (e.t.tank) {
      stampWreck(e);
      explode(e.x, e.y, 50, 60, true);
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
  // friendly units near sandbags dodge some incoming fire
  if (target.side !== 'us') return false;
  for (const s of G.sandbags) {
    if (s.hp > 0 && dist(s, target) < 32) {
      if (Math.random() < 0.5) { s.hp -= 4; return true; }
    }
  }
  return false;
}

function fireShot(shooter, target, opts) {
  const t = shooter.t;
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

function friendlyNearPoint(x, y, r, except) {
  for (const u of G.units) {
    if (!u.dead && u !== except && dist(u, { x, y }) < r) return true;
  }
  return false;
}

function nearestUnitInRange(e, range) {
  let best = null, bd = range;
  for (const u of G.units) {
    if (u.dead) continue;
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
        if (a.dead || a === u || a.hp >= a.maxhp) continue;
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

  if (e.t.tank) { updateTank(e, dt, range); return; }

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
  // barbed wire drag
  for (const wr of G.wires) {
    if (wr.hp > 0 && Math.abs(e.x - wr.x) < 40 && Math.abs(e.y - wr.y) < 14) {
      speed *= 0.3;
      wr.hp -= 5 * dt;
      break;
    }
  }
  e.face = Math.PI / 2 + Math.sin(e.wobble) * 0.25;
  e.x += Math.cos(e.face) * speed * dt * 0.4;
  e.y += Math.sin(e.face) * speed * dt;
  e.x = clamp(e.x, 14, W - 14);
}

function updateTank(e, dt, range) {
  // grind forward, slower than infantry, ignores wire
  e.y += e.t.speed * dt;
  e.cd -= dt;
  const target = nearestUnitInRange(e, range);
  if (target) {
    const want = Math.atan2(target.y - e.y, target.x - e.x);
    let diff = want - e.turret;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    e.turret += clamp(diff, -1.2 * dt, 1.2 * dt);
    if (e.cd <= 0 && Math.abs(diff) < 0.15) {
      e.cd = e.t.rof * rand(0.9, 1.1);
      SFX.boom(false);
      G.flashes.push({
        x: e.x + Math.cos(e.turret) * 26, y: e.y + Math.sin(e.turret) * 26,
        r: 9, ttl: 0.08, max: 0.08,
      });
      scheduleShell(target.x + rand(-12, 12), target.y + rand(-12, 12), 0.7, 45, 85, false);
    }
  } else {
    e.turret += clamp(Math.PI / 2 - e.turret, -0.8 * dt, 0.8 * dt);
  }
}

// ============================================================ main update

function update(dt) {
  G.time += dt;

  // TP trickle
  G.tpTrickle -= dt;
  if (G.tpTrickle <= 0) { G.tpTrickle = 8; G.tp++; }

  // officer TP bonus
  G.officerTick -= dt;
  if (G.officerTick <= 0) {
    G.officerTick = 10;
    for (const u of G.units) if (!u.dead && u.type === 'officer') G.tp++;
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
      const trig = e.t.tank ? 22 : 11;
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
  c.save();
  c.translate(a.x, a.y);

  // shadow
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath(); c.ellipse(0, 3, 8, 4, 0, 0, 7); c.fill();

  // gun
  c.strokeStyle = '#2a2a22';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(Math.cos(a.face) * 2, Math.sin(a.face) * 2);
  c.lineTo(Math.cos(a.face) * a.t.gun, Math.sin(a.face) * a.t.gun);
  c.stroke();

  // body
  c.fillStyle = a.t.color;
  c.beginPath(); c.ellipse(0, 0, 6.5, 5, a.face, 0, 7); c.fill();

  // helmet
  c.fillStyle = a.side === 'us' ? '#5b6b4a' : '#61615a';
  c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = 1;
  c.beginPath(); c.arc(0, -1, 4.2, 0, 7); c.stroke();

  // medic cross / officer cap dot
  if (a.type === 'medic') {
    c.fillStyle = '#fff';
    c.fillRect(-3, -2.2, 6, 2.2); c.fillRect(-1.2, -4, 2.4, 6);
    c.fillStyle = '#c22';
    c.fillRect(-2.4, -1.7, 4.8, 1.2); c.fillRect(-0.7, -3.4, 1.4, 4.6);
  }
  if (a.type === 'officer' || (a.t && a.t.aura)) {
    c.fillStyle = '#ffd94a';
    c.beginPath(); c.arc(0, -1, 1.6, 0, 7); c.fill();
  }
  if (a.side === 'us' && a.t.grenade) {
    // grenades clipped to his webbing
    c.fillStyle = '#232920';
    c.beginPath(); c.arc(-4.5, 3, 1.7, 0, 7); c.fill();
    c.beginPath(); c.arc(-1.5, 4.5, 1.7, 0, 7); c.fill();
  }
  if (a.t.rocket) {
    // launcher tube across the shoulders
    c.strokeStyle = '#3a3d2e';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(-7, -4); c.lineTo(7, -6); c.stroke();
  }
  if (a.t.mortar) {
    // baseplate and tube beside him
    c.fillStyle = '#2f3328';
    c.beginPath(); c.ellipse(-7, 4, 3.5, 2, 0, 0, 7); c.fill();
    c.strokeStyle = '#3a3d2e';
    c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(-7, 4); c.lineTo(-4, -5); c.stroke();
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
      (a.type === 'medic' ? a.xp + ' XP' : a.xp + ' KILLS');
    ctx.fillText(label, a.x + 1, a.y + 23);
    ctx.fillStyle = '#ffe98a';
    ctx.fillText(label, a.x, a.y + 22);
  }
}

function drawTank(e) {
  const c = ctx;
  c.save();
  c.translate(e.x, e.y);
  // shadow
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath(); c.ellipse(0, 4, 26, 18, 0, 0, 7); c.fill();
  // tracks
  c.fillStyle = '#2f2f28';
  c.fillRect(-24, -16, 8, 32);
  c.fillRect(16, -16, 8, 32);
  // hull
  c.fillStyle = e.t.color;
  c.fillRect(-17, -14, 34, 28);
  c.strokeStyle = '#3a3a32';
  c.lineWidth = 1.5;
  c.strokeRect(-17, -14, 34, 28);
  // turret
  c.rotate(e.turret);
  c.fillStyle = '#4c4c43';
  c.fillRect(6, -2.5, 24, 5);          // barrel
  c.beginPath(); c.arc(0, 0, 10, 0, 7); c.fill();
  c.strokeStyle = '#33332c';
  c.beginPath(); c.arc(0, 0, 10, 0, 7); c.stroke();
  c.restore();

  if (e.hp < e.maxhp) {
    const f = clamp(e.hp / e.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - 22, e.y - 26, 44, 4);
    ctx.fillStyle = '#c0562e';
    ctx.fillRect(e.x - 22, e.y - 26, 44 * f, 4);
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
    for (const yy of [-5, -1, 3]) {
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
    for (let r = 0; r < 2; r++) {
      for (let i = -1.5; i <= 1.5; i++) {
        ctx.fillStyle = r ? '#9a8a5e' : '#8a7a50';
        ctx.strokeStyle = '#6e6040';
        ctx.lineWidth = 1;
        const bx = i * 12 + (r ? 6 : 0), by = -r * 6;
        if (Math.abs(bx) > 20) continue;
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
    else drawSoldier(e);
  }
  for (const u of G.units) drawSoldier(u);

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
  hud.tp.textContent = G.tp;
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
    for (const u of G.units) if (dist(u, { x, y }) < 16) return false;
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
    G.sandbags.push({ x, y, hp: 300 });
  } else if (p.key === 'wire') {
    G.wires.push({ x, y, hp: 250 });
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

  // select own soldier
  let picked = null;
  for (const u of G.units) {
    if (dist(u, { x, y }) < 14) { picked = u; break; }
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
