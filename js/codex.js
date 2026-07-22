/* Trenchworks: WW2 — codex.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

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
    desc: 'Sidearm fire — officers, bazooka backup, and enemy grenadiers.',
    play: () => SFX.pistol() },
  { key: 'sfx-shotgun', name: 'Shotgun Blast', category: 'WEAPONS',
    desc: 'Buckshot from the allied shotgunner at close range.',
    play: () => SFX.shotgun() },
  { key: 'sfx-flame', name: 'Flamethrower', category: 'WEAPONS',
    desc: 'Roaring flame spray while allied or enemy flamethrowers are active.',
    play: () => SFX.flame() },
  { key: 'sfx-rocket', name: 'Rocket Launch', category: 'EXPLOSIONS',
    desc: 'Bazooka rocket ignition and launch.',
    play: () => SFX.rocket() },
  { key: 'sfx-boom-small', name: 'Small Explosion', category: 'EXPLOSIONS',
    desc: 'Light blasts — grenades, rockets, mines, AT gun, and tank cannon fire.',
    play: () => SFX.boom(false) },
  { key: 'sfx-boom-big', name: 'Big Explosion', category: 'EXPLOSIONS',
    desc: 'Heavy detonations — artillery barrages, tank wrecks, and large shell impacts.',
    play: () => SFX.boom(true) },
  { key: 'sfx-whistle', name: 'Incoming Whistle', category: 'EXPLOSIONS',
    desc: 'Arcing shell whistle as mortars, artillery, and the V2 warhead fall toward the field.',
    play: () => SFX.whistle() },
  { key: 'sfx-motor', name: 'Engine Start', category: 'VEHICLES & AIR',
    desc: 'Engine turn-over when a Sherman or jeep rolls onto the field.',
    play: () => SFX.motor() },
  { key: 'sfx-plane', name: 'Plane Engine', category: 'VEHICLES & AIR',
    desc: 'Looping aircraft engine during strafing runs and transport flybys.',
    play: () => SFX.plane() },
  { key: 'sfx-planeflyby', name: 'Plane Flyby', category: 'VEHICLES & AIR',
    desc: 'Doppler pass at the start of airstrikes and paratrooper drops.',
    play: () => SFX.planeFlyby() },
  { key: 'sfx-hammer', name: 'Hammer', category: 'GAME EVENTS',
    desc: 'Engineer fortification and repair work on emplacements.',
    play: () => SFX.hammer() },
  { key: 'sfx-scream', name: 'Casualty Cry', category: 'GAME EVENTS',
    desc: 'Pained cry when an infantryman is cut down — allied or enemy.',
    play: () => SFX.scream() },
  { key: 'sfx-heal', name: 'Medic Treat', category: 'GAME EVENTS',
    desc: 'Soft chime as a medic patches up a wounded man in range.',
    play: () => SFX.heal() },
  { key: 'sfx-promote', name: 'Promotion', category: 'GAME EVENTS',
    desc: 'Short fanfare when an allied unit earns a new rank.',
    play: () => SFX.promote() },
  { key: 'sfx-cash', name: 'Payout', category: 'GAME EVENTS',
    desc: 'Points ping for a payout — research purchases and catch-up salvage refunds.',
    play: () => SFX.cash() },
  { key: 'sfx-alarm', name: 'Alarm Klaxon', category: 'GAME EVENTS',
    desc: 'Warning klaxon for a major inbound threat — air raids and paratrooper drops.',
    play: () => SFX.alarm() },
  { key: 'sfx-event', name: 'Event Stinger', category: 'GAME EVENTS',
    desc: 'Cue for a battlefield event — fog, reinforcements, and strafing runs.',
    play: () => SFX.event() },
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

// stamp a real field-art draw call into the codex tile, centred and scaled to
// fill it — emplacement entries use the same art the player sees on the field
function codexStamp(scale, ox, oy, draw) {
  ctx.save();
  ctx.translate(CODEX_PW / 2 + ox, CODEX_PH / 2 + oy);
  ctx.scale(scale, scale);
  draw();
  ctx.restore();
}

// scuffed earth under a dug-in emplacement, so it reads as placed ground
// rather than floating on the tile background
function codexGroundPatch(oy, rx, ry) {
  ctx.fillStyle = '#332f22';
  ctx.beginPath();
  ctx.ellipse(CODEX_PW / 2, CODEX_PH / 2 + oy, rx, ry, 0, 0, 7);
  ctx.fill();
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
    // two staggered runs of the field wire, the way a belt of it lays out
    codexStamp(0.88, -2, -12, () => drawWire({ x: 0, y: 0, up: false }));
    codexStamp(0.88, 2, 12, () => drawWire({ x: 0, y: 0, up: false }));
  } else if (key === 'sandbags') {
    codexGroundPatch(10, 30, 8);
    codexStamp(1.25, 0, 4, () => drawSandbag({ x: 0, y: 0, up: false }));
  } else if (key === 'bunker') {
    codexStamp(1.15, 0, 4, () =>
      drawBunker({ x: 0, y: 0, up: false, hp: BUNKER_HP, maxhp: BUNKER_HP }));
  } else if (key === 'camonest') {
    codexStamp(1.15, 0, 4, () =>
      drawCamoNest({ x: 0, y: 0, up: false, hp: CAMONEST_HP, maxhp: CAMONEST_HP }));
  } else if (key === 'watchtower') {
    codexStamp(2.1, 0, 0, () =>
      drawWatchtower({ x: 0, y: 0, up: false, hp: WATCHTOWER_HP, maxhp: WATCHTOWER_HP }));
  } else if (key === 'ammocrate') {
    codexStamp(1.7, 0, 2, () =>
      drawAmmoCrate({ x: 0, y: 0, up: false, hp: AMMOCRATE_HP, maxhp: AMMOCRATE_HP }));
  } else if (key === 'mine') {
    // the five-mine X scatter a single minefield drop actually lays down
    for (const [mx, my] of [[0, 2], [20, -16], [-20, -16], [20, 20], [-20, 20]]) {
      c.fillStyle = 'rgba(50,46,34,0.55)';
      c.beginPath(); c.arc(cx + mx, cy + my, 12, 0, 7); c.fill();
      codexStamp(2.2, mx, my, () => drawMine({ x: 0, y: 0, dead: false }));
    }
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
  } else if (key === 'airraid') {
    // bomber shadow crossing south, bombs falling away beneath it
    c.fillStyle = 'rgba(0,0,0,0.42)';
    c.beginPath(); c.ellipse(cx, cy - 6, 4.5, 17, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(cx, cy - 9, 26, 5.5, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(cx, cy + 8, 10, 3, 0, 0, 7); c.fill();
    for (const ex of [-12, 12]) {
      c.beginPath(); c.ellipse(cx + ex, cy - 10, 3, 7.5, 0, 0, 7); c.fill();
    }
    c.fillStyle = '#4a4840';
    for (const [bx, byo] of [[-7, 14], [0, 18], [7, 14]]) {
      c.beginPath(); c.ellipse(cx + bx, cy + byo, 2, 4, 0, 0, 7); c.fill();
    }
    c.fillStyle = 'rgba(255,120,40,0.4)';
    c.beginPath(); c.arc(cx, CODEX_PH - 8, 12, 0, 7); c.fill();
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

  const defenseKeys = ['wire', 'sandbags', 'bunker', 'watchtower', 'camonest', 'ammocrate', 'mine', 'mortar', 'artillery'];
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
    } else if (t.aagun) {
      ctx.save();
      ctx.translate(CODEX_PW / 2, CODEX_PH / 2 + 2);
      ctx.scale(1.3, 1.3);
      ctx.translate(-CODEX_PW / 2, -(CODEX_PH / 2 + 2));
      drawAAGun(actor);
      ctx.restore();
    } else if (t.v2) {
      // show the crawler with a round on the rail, not mid-reload
      actor.v2Cd = 0;
      ctx.save();
      ctx.translate(CODEX_PW / 2, CODEX_PH / 2 - 2);
      ctx.scale(1.1, 1.1);
      ctx.translate(-CODEX_PW / 2, -(CODEX_PH / 2 - 2));
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

// ---- Veterancy: what each unit actually gains as it climbs the rank ladder.
// Numbers mirror the live formulas in update-friendlies.js / shooting.js /
// targeting.js so the codex never lies about a promotion's payoff.
// Shared benefit lines (the universal small-arms buffs from unitBuffs()):
const RB = {
  rof:   { label: 'Rate of fire',   per: '+8% / rank',  max: '+48%' },
  acc:   { label: 'Accuracy',       per: '+8% / rank',  max: '+48%' },
  dmg:   { label: 'Damage',         per: '+4% / rank',  max: '+24%' },
  spd:   { label: 'Movement speed', per: '+4% / rank',  max: '+24%' },
  reach: { label: 'Weapon reach',   per: '+1% / rank',  max: '+6%'  },
  cover: { label: 'Shrugs off suppression', per: 'up faster each rank', max: 'back in the fight fast' },
};

const UNIT_RANK_PERKS = {
  rifleman:   [RB.rof, RB.acc, RB.dmg, RB.reach, RB.spd, RB.cover],
  gunner:     [RB.rof, RB.acc, RB.dmg, RB.reach, RB.spd, RB.cover],
  sniper:     [RB.rof, RB.acc, RB.dmg, RB.reach, RB.spd, RB.cover],
  grenadier:  [
    RB.rof, RB.acc, RB.dmg,
    { label: 'Grenade frequency', per: '+8% / rank',  max: 'thrown far more often' },
    { label: 'Throwing range',    per: '+10% / rank', max: '+60%' },
    { label: 'Grenade accuracy',  per: '+8% / rank',  max: '+48%' },
    { label: 'Grenade damage',    per: '+5% / rank',  max: '+30%' },
    RB.spd,
  ],
  shotgunner: [
    { label: 'Buckshot reach', per: '+5% / rank', max: '+30%' },
    { label: 'Tighter spread', per: '+8% / rank', max: '+48%' },
    RB.rof, RB.spd, RB.cover,
  ],
  bazooka:    [
    { label: 'Reload speed',     per: '+8% / rank', max: 'nearly 2× as fast' },
    { label: 'Rocket accuracy',  per: '+8% / rank', max: 'much tighter' },
    { label: 'Rocket damage',    per: '+4% / rank', max: '+24%' },
    RB.spd,
  ],
  mortarman:  [
    { label: 'Reload speed',    per: '+8% / rank', max: 'nearly 2× as fast' },
    { label: 'Shell accuracy',  per: '+8% / rank', max: 'tighter grouping' },
    { label: 'Shell damage',    per: '+5% / rank', max: '+30%' },
    RB.spd,
  ],
  medic:      [
    { label: 'Healing per pulse', per: '+1.2 HP / rank', max: '3 → 10 HP' },
    { label: 'Aid range',         per: '+1% / rank',     max: '+6%' },
    RB.spd, RB.cover,
  ],
  engineer:   [
    { label: 'Repair & fortify rate', per: '+35% / rank', max: 'over 3× faster' },
    { label: 'Work reach',            per: '+5% / rank',  max: '+30%' },
    RB.rof, RB.spd,
  ],
  officer:    [
    { label: 'Aura: allied fire rate', per: '+3% / rank',   max: 'men fire much faster' },
    { label: 'Aura: allied accuracy',  per: '+4% / rank',   max: '+24% straighter' },
    { label: 'TP income',              per: '+⅓ TP / rank', max: '1 → 3 TP / 30s' },
    { label: 'Command reach',          per: '+5% / rank',   max: '+30%' },
  ],
  flamer:     [
    { label: 'Burn damage',    per: '+35% / rank', max: '+210%' },
    { label: 'Flame reach',    per: '+5% / rank',  max: '+30%' },
    { label: 'Promotion heal', per: '+45 HP',      max: 'flak vest patched up' },
    RB.spd,
  ],
  jeep:       [RB.rof, RB.acc, RB.dmg, RB.spd],
  sherman:    [
    { label: 'Reload speed',      per: '+8% / rank', max: 'nearly 2× as fast' },
    { label: 'Gunnery accuracy',  per: '+8% / rank', max: '+48%' },
    { label: 'Shell damage',      per: '+6% / rank', max: '+36%' },
    RB.spd,
  ],
  atgun:      [
    { label: 'Traverse arc',    per: '+3° / rank', max: '+18°' },
    { label: 'Reload speed',    per: '+8% / rank', max: 'nearly 2× as fast' },
    { label: 'Shell accuracy',  per: '+8% / rank', max: '+48%' },
    { label: 'Shell damage',    per: '+6% / rank', max: '+36%' },
  ],
  aagun:      [
    { label: 'Traverse arc',  per: '+3° / rank', max: '+18°' },
    { label: 'Reload speed',  per: '+8% / rank', max: 'nearly 2× as fast' },
    { label: 'Flak accuracy', per: '+8% / rank', max: '+48%' },
    { label: 'Flak damage',   per: '+6% / rank', max: '+36%' },
  ],
};

// each unit type's signature veterancy trait: a unique drawn badge pinned to the
// benefit that defines how ranking up transforms it. `on` names the perk row it
// marks (its unique specialty for specialists, its defining stat for generalists).
const UNIT_SIGNATURE = {
  rifleman:   { on: 'Damage' },
  gunner:     { on: 'Rate of fire' },
  sniper:     { on: 'Accuracy' },
  grenadier:  { on: 'Grenade damage' },
  shotgunner: { on: 'Buckshot reach' },
  bazooka:    { on: 'Rocket damage' },
  mortarman:  { on: 'Shell damage' },
  medic:      { on: 'Healing per pulse' },
  engineer:   { on: 'Repair & fortify rate' },
  officer:    { on: 'Aura: allied fire rate' },
  flamer:     { on: 'Burn damage' },
  jeep:       { on: 'Movement speed' },
  sherman:    { on: 'Shell damage' },
  atgun:      { on: 'Shell damage' },
  aagun:      { on: 'Flak damage' },
};

// a unique 16px insignia per unit type: dark gold-rimmed disc + a distinct
// gold glyph. Drawn at 2× for crispness; displayed at 16px by the codex CSS.
function makeSignatureBadge(key) {
  const S = 16, R = 2;
  const cv = document.createElement('canvas');
  cv.width = S * R; cv.height = S * R;
  const c = cv.getContext('2d');
  c.scale(R, R);
  c.lineCap = 'round';
  c.lineJoin = 'round';

  // badge disc
  c.fillStyle = '#1c1a10';
  c.beginPath(); c.arc(8, 8, 7.4, 0, 7); c.fill();
  c.strokeStyle = '#ffd94a'; c.lineWidth = 1;
  c.beginPath(); c.arc(8, 8, 7, 0, 7); c.stroke();

  const gold = '#ffd94a';
  c.strokeStyle = gold; c.fillStyle = gold; c.lineWidth = 1.3;

  const line = (x1, y1, x2, y2) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
  const dot = (x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
  const ring = (x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); };
  const star = (cx, cy, outer, inner) => {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? inner : outer;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.closePath(); c.fill();
  };

  switch (key) {
    case 'rifleman':   // rifle
      c.lineWidth = 1.5; line(4, 11, 13, 5); line(4, 11, 5.5, 12.2); break;
    case 'gunner':     // automatic burst
      c.lineWidth = 1.4;
      for (const yo of [-2.6, 0, 2.6]) { line(3.5, 8 + yo, 9, 8 + yo); dot(11, 8 + yo, 1); }
      break;
    case 'sniper':     // crosshair
      ring(8, 8, 3.4); line(8, 2.6, 8, 13.4); line(2.6, 8, 13.4, 8); break;
    case 'grenadier':  // frag grenade
      dot(8, 9.5, 3.3); c.fillRect(7, 3.6, 2, 2.2); c.fillRect(6, 4.2, 4, 1.2); break;
    case 'shotgunner': // buckshot spread
      c.lineWidth = 1.3; line(4, 8, 13, 4); line(4, 8, 13.5, 8); line(4, 8, 13, 12); break;
    case 'bazooka':    // rocket
      c.fillRect(5, 7, 4.5, 2);
      c.beginPath(); c.moveTo(9.5, 6.4); c.lineTo(13, 8); c.lineTo(9.5, 9.6); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(5, 6); c.lineTo(3.4, 5); c.lineTo(5, 7); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(5, 10); c.lineTo(3.4, 11); c.lineTo(5, 9); c.closePath(); c.fill();
      break;
    case 'mortarman':  // lobbed arc
      c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(3, 13); c.quadraticCurveTo(8, 0.5, 13, 13); c.stroke();
      dot(13, 12, 1.4); break;
    case 'medic':      // red cross
      c.fillStyle = '#e2453a'; c.fillRect(7, 4, 2, 8); c.fillRect(4, 7, 8, 2); break;
    case 'engineer':   // cog
      ring(8, 8, 2.7);
      c.lineWidth = 1.4;
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        line(8 + Math.cos(a) * 3.2, 8 + Math.sin(a) * 3.2, 8 + Math.cos(a) * 5.4, 8 + Math.sin(a) * 5.4);
      }
      dot(8, 8, 1); break;
    case 'officer':    // command star
      star(8, 8, 5.6, 2.4); break;
    case 'flamer':     // flame
      c.beginPath();
      c.moveTo(8, 2.8);
      c.quadraticCurveTo(12.5, 8, 8, 13.2);
      c.quadraticCurveTo(3.5, 8, 8, 2.8);
      c.fill(); break;
    case 'jeep':       // wheel + speed lines
      ring(9.5, 8, 3.2); dot(9.5, 8, 1);
      c.lineWidth = 1.3; line(1.6, 6, 4.6, 6); line(1.2, 9, 4, 9); break;
    case 'sherman':    // tank
      c.fillRect(3, 9, 10, 3); c.fillRect(6, 6, 4, 3); c.fillRect(10, 7, 3.6, 1.4); break;
    case 'atgun':      // AP shell
      c.beginPath();
      c.moveTo(4, 6); c.lineTo(10, 6); c.lineTo(13, 8); c.lineTo(10, 10); c.lineTo(4, 10);
      c.closePath(); c.fill(); break;
    case 'aagun':      // flak burst
      c.lineWidth = 1.2;
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        line(8 + Math.cos(a) * 1.8, 8 + Math.sin(a) * 1.8, 8 + Math.cos(a) * 5.4, 8 + Math.sin(a) * 5.4);
      }
      dot(8, 8, 1.5); break;
  }
  return cv;
}

// kills needed to reach each rank, scaled by the unit's rankMult (a Sherman
// grinds 2.5× the kills of a rifleman, a jeep 3×) — matches gainXP().
function unitRankLadder(ut) {
  const rankMult = ut.tank ? 2.5 : (ut.rankMult || 1);
  return RANKS.map((r, i) => ({ name: r.name, tier: i, kills: Math.ceil(r.kills * rankMult) }));
}

// a single rank badge: the game's gold chevrons over the rank name + kill gate
function makeRankBadge(tier, kills, isMax) {
  const cv = document.createElement('canvas');
  const W = 34, H = 15;
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  if (tier === 0) {
    c.strokeStyle = '#6f6c52';
    c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(W / 2 - 5, H / 2); c.lineTo(W / 2 + 5, H / 2); c.stroke();
  } else {
    c.strokeStyle = isMax ? '#ffe98a' : '#ffd94a';
    c.lineWidth = 1.4;
    c.lineJoin = 'round';
    const step = 5;
    let sx = W / 2 - (tier * step - 2) / 2;
    const sy = H / 2 + 2;
    for (let i = 0; i < tier; i++) {
      c.beginPath();
      c.moveTo(sx, sy);
      c.lineTo(sx + 1.6, sy - 3.4);
      c.lineTo(sx + 3.2, sy);
      c.stroke();
      sx += step;
    }
  }
  return cv;
}

function buildVeterancyPanel(key, ut) {
  const perks = UNIT_RANK_PERKS[key];
  if (!perks) return null;

  const panel = document.createElement('div');
  panel.className = 'codex-vet';

  // rank ladder strip
  const ladder = document.createElement('div');
  ladder.className = 'vet-ladder';
  for (const step of unitRankLadder(ut)) {
    const cell = document.createElement('div');
    cell.className = 'vet-rank' + (step.tier === RANKS.length - 1 ? ' vet-rank-max' : '');
    const badge = makeRankBadge(step.tier, step.kills, step.tier === RANKS.length - 1);
    cell.appendChild(badge);
    const nm = document.createElement('div');
    nm.className = 'vet-rank-name';
    nm.textContent = step.name;
    const kl = document.createElement('div');
    kl.className = 'vet-rank-kills';
    kl.textContent = step.tier === 0 ? 'start' : step.kills + (key === 'medic' ? ' heals' : ' kills');
    cell.appendChild(nm);
    cell.appendChild(kl);
    ladder.appendChild(cell);
  }
  panel.appendChild(ladder);

  // per-rank benefit list; the unit's signature trait is flagged with its badge
  const sig = UNIT_SIGNATURE[key];
  const gains = document.createElement('div');
  gains.className = 'vet-gains';
  for (const perk of perks) {
    const isSig = sig && sig.on === perk.label;
    const row = document.createElement('div');
    row.className = 'vet-gain' + (isSig ? ' vet-gain-sig' : '');

    const label = document.createElement('span');
    label.className = 'vet-gain-label';
    label.appendChild(document.createTextNode(perk.label));
    if (isSig) {
      const badge = makeSignatureBadge(key);
      badge.className = 'vet-gain-badge';
      badge.title = 'Signature trait';
      label.appendChild(badge);
    }

    const per = document.createElement('span');
    per.className = 'vet-gain-per';
    per.textContent = perk.per;
    const max = document.createElement('span');
    max.className = 'vet-gain-max';
    max.textContent = perk.max;

    row.appendChild(label);
    row.appendChild(per);
    row.appendChild(max);
    gains.appendChild(row);
  }
  panel.appendChild(gains);
  return panel;
}

// ---- Fortification tiers: what an engineer's work buys each emplacement.
// Standard (as placed) → Fortified (engineer, ~6s) → Hardened (needs the
// Hardened Works card). Values mirror shooting.js, update-enemies.js, and the
// WATCHTOWER/CAMONEST constants; HP compounds by the piece's fortifyMult.
const FORT_TIERS = {
  wire: {
    rows: [
      { label: 'HP',              v: ['3,750', '5,625', '8,438'] },
      { label: 'Slows enemy to',  v: ['12% speed', '5% speed', '2% speed'] },
      { label: 'Wears out',       v: ['fast', 'slower', 'slowest'] },
    ],
  },
  sandbags: {
    rows: [
      { label: 'HP',           v: ['660', '990', '1,485'] },
      { label: 'Dodge chance', v: ['50%', '65%', '78%'] },
      { label: 'Cover radius', v: ['26', '30', '33'] },
    ],
  },
  bunker: {
    rows: [
      { label: 'HP',           v: ['2,040', '3,060', '4,590'] },
      { label: 'Dodge chance', v: ['75%', '85%', '92%'] },
      { label: 'Cover radius', v: ['30', '34', '38'] },
    ],
  },
  watchtower: {
    rows: [
      { label: 'HP',          v: ['500', '750', '1,125'] },
      { label: 'Range boost', v: ['+25%', '+35%', '+50%'] },
    ],
  },
  camonest: {
    rows: [
      { label: 'HP',                   v: ['280', '560', '1,120'] },
      { label: 'Exposed after firing', v: ['4 s', '2 s', '1 s'] },
    ],
  },
  ammocrate: {
    rows: [
      { label: 'HP',                   v: ['320', '480', '720'] },
      { label: 'Fire & reload speed',  v: ['+10%', '+20%', '+30%'] },
    ],
  },
};

const FORT_TIER_META = [
  { name: 'STANDARD',  how: 'as placed' },
  { name: 'FORTIFIED', how: 'engineer' },
  { name: 'HARDENED',  how: 'Hardened Works' },
];

// a small stacked-layer badge: filled bars grow with the fortification tier
function makeFortBadge(tier) {
  const cv = document.createElement('canvas');
  const W = 30, H = 15;
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const fill = ['#6f6c52', '#c9b25a', '#ffd94a'][tier - 1];
  const bw = 18, x = (W - bw) / 2;
  for (let i = 0; i < 3; i++) {
    const y = H - 2 - i * 4;
    c.fillStyle = i < tier ? fill : 'rgba(90,88,66,0.25)';
    c.fillRect(x, y - 3, bw, 3);
  }
  return cv;
}

function buildFortPanel(key) {
  const spec = FORT_TIERS[key];
  if (!spec) return null;

  const panel = document.createElement('div');
  panel.className = 'codex-vet codex-fort';

  const grid = document.createElement('div');
  grid.className = 'fort-grid';

  // header: empty corner, then one column per tier
  const corner = document.createElement('div');
  corner.className = 'fort-corner';
  grid.appendChild(corner);
  FORT_TIER_META.forEach((meta, i) => {
    const head = document.createElement('div');
    head.className = 'fort-head' + (i === 2 ? ' fort-head-max' : '');
    head.appendChild(makeFortBadge(i + 1));
    const nm = document.createElement('div');
    nm.className = 'fort-head-name';
    nm.textContent = meta.name;
    const how = document.createElement('div');
    how.className = 'fort-head-how';
    how.textContent = meta.how;
    head.appendChild(nm);
    head.appendChild(how);
    grid.appendChild(head);
  });

  // one row per benefit, three tier values across
  for (const row of spec.rows) {
    const label = document.createElement('div');
    label.className = 'fort-rowlabel';
    label.textContent = row.label;
    grid.appendChild(label);
    row.v.forEach((val, i) => {
      const cell = document.createElement('div');
      cell.className = 'fort-val' + (i === 2 ? ' fort-val-max' : '');
      cell.textContent = val;
      grid.appendChild(cell);
    });
  }

  panel.appendChild(grid);
  return panel;
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
  if (ut.aagun) parts.push('FLAK', 'AIRCRAFT ONLY', 'IMMOBILE');
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

// shared expandable section: a labelled button that shows/hides an info panel.
// no-op when there's no panel (e.g. a mine or strike, which never upgrades).
function addCodexCollapsible(body, label, panel) {
  if (!panel) return;
  const toggle = document.createElement('button');
  toggle.className = 'codex-vet-toggle';
  toggle.innerHTML = `<span class="chev">▸</span> ${label}`;
  toggle.setAttribute('aria-expanded', 'false');
  panel.classList.add('hidden');
  toggle.addEventListener('click', () => {
    const open = panel.classList.toggle('hidden') === false;
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  body.appendChild(toggle);
  body.appendChild(panel);
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
    if (entry.side) card.classList.add('codex-entry-' + entry.side);

    const frame = document.createElement('div');
    frame.className = 'codex-frame';
    const portrait = document.createElement('canvas');
    portrait.className = 'codex-portrait';
    portrait.width = CODEX_PW;
    portrait.height = CODEX_PH;
    const pctx = portrait.getContext('2d');
    pctx.drawImage(renderPortrait(entry.key, entry.side), 0, 0);
    frame.appendChild(portrait);

    const body = document.createElement('div');
    body.className = 'codex-body';

    const name = document.createElement('div');
    name.className = 'codex-name';
    name.textContent = entry.name;
    body.appendChild(name);

    const stats = document.createElement('div');
    stats.className = 'codex-stats';
    for (const part of String(entry.stats).split(' · ')) {
      const chip = document.createElement('span');
      chip.className = 'codex-chip';
      chip.textContent = part;
      stats.appendChild(chip);
    }
    body.appendChild(stats);

    const desc = document.createElement('div');
    desc.className = 'codex-desc';
    desc.textContent = entry.desc;
    body.appendChild(desc);

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

    // troops earn veterancy; emplacements earn fortification tiers — either way
    // let players preview exactly what the upgrade buys before committing TP
    if (tab === 'troops') {
      addCodexCollapsible(body, 'VETERANCY',
        buildVeterancyPanel(entry.key, UNIT_TYPES[entry.key]));
    } else if (tab === 'defenses') {
      addCodexCollapsible(body, 'FORTIFICATION', buildFortPanel(entry.key));
    }

    card.appendChild(frame);
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
