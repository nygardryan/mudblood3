/* Mud & Blood — codex.
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
