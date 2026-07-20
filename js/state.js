/* Mud & Blood — canvas setup & global game state.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

let G = null;         // game state
let placing = null;   // placeable currently being placed
let mouse = { x: W / 2, y: H / 2, inside: false };
let drag = null;      // marquee selection in progress: { x0, y0, x1, y1, active }
let hoverActor = null; // hostile under the cursor, described in a panel while hovered
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
    ribbonsEarned: 0,  // endless: ribbons banked this run (wave-10 milestones)
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
    planes: [],      // aircraft: friendly strafing runs, transports, enemy bombers
    flak: [],        // AA shells fused to burst in mid-air {x,y,timer,...}
    tracers: [],
    particles: [],
    flashes: [],
    texts: [],       // floating notices (promotions)
    corpses: [],     // fallen soldiers, cleared away after CORPSE_TTL
    groundMarks: [], // blood stains and blast craters, fade after GROUND_MARK_TTL

    spawnTimer: level.mode === 'allied' ? level.waves[0].delay : 6,
    tpTrickle: 6,
    catchupDebt: 0,   // endless: fractional TP-value of allied units lost, not yet refunded
    officerTick: (level.id === 'endless' && equippedEndlessCards().includes('rushorder')) ? 15 : 30,
    eventTimer: rand(40, 60),
    fog: 0,
    banner: null,
    selected: [],
    focusTarget: null,   // an enemy the player clicked: troops in range prefer it
    auraRefresh: 0,
    buffFrame: 0,
    usOfficers: [],
    deOfficers: [],
    paraFlybyPlayed: false,
    landingCraft: [],
    landingFire: true,
  };
  // roguelite cards apply to every true endless run (any difficulty —
  // sandbox/testing double as the card test bed), never to campaigns
  G.cardHooks = level.id === 'endless' ? buildCardHooks() : null;
  G.cardsOwned = level.id === 'endless' ? new Set(equippedEndlessCards()) : null;
  // starting an endless run refreshes the shop's reroll price back to base
  if (level.id === 'endless') resetRerollCost();
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
