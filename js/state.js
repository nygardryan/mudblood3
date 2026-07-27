/* Trenchworks: WW2 — canvas setup & global game state.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

let G = null;         // game state
let G_forceFaction = null; // test harness: pin the endless enemy faction roll ('de' | 'jp' | 'zo' | 'it')
let placing = null;   // placeable currently being placed
let mouse = { x: W / 2, y: H / 2, inside: false };
let drag = null;      // marquee selection in progress: { x0, y0, x1, y1, active }
let hoverActor = null; // hostile under the cursor, described in a panel while hovered
let touchInspect = null; // hostile pinned by a mobile long-press, so its info panel shows on touch
let suppressClick = false; // eat the click that follows a completed drag-select or pointerup action
let placeTouch = null;  // touch placement drag: { active, moved, startX, startY }
let viewPan = null;     // one-finger camera pan on mobile
let placeHoldTimer = null;
let mobileToolbarMinimized = false;
let lastTap = { t: 0, x: 0, y: 0 };
let lastUnitClick = { t: 0, type: null };
let longPressTimer = null;
let longPressing = false;
let longPressFoe = null; // enemy locked at press-time for the inspect long-press (survives the target moving)
let viewCam = { x: 0, y: 0, zoom: 1 };
let viewDirty = false;
let viewGesture = null;   // two-finger pinch/pan snapshot
const activePointers = new Map();
const VIEW_ZOOM_MAX_MUL = 2.5;
let lastFitZoom = null;

function clearLongPress() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  longPressing = false;
  longPressFoe = null;
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

// the endless enemy faction, and the words the HUD/banners/results use for it
function enemyFaction() {
  return (G && G.enemyFaction) || 'de';
}
function factionAdjUpper() {
  const f = enemyFaction();
  return f === 'jp' ? 'JAPANESE' : f === 'zo' ? 'HORDE' : f === 'it' ? 'ITALIAN' : 'GERMAN';
}
function factionPlural() {
  const f = enemyFaction();
  return f === 'jp' ? 'Japanese' : f === 'zo' ? 'undead' : f === 'it' ? 'Italians' : 'Germans';
}

// is the infection mechanic live this run? Normally that's just the 'zo' roll,
// but the testing toolbar's HORDE tab drops zombies into a run of ANY faction,
// and a bite there has to rot, cure and reanimate exactly as it would in a real
// Horde run. Sites that already test u.infected don't need this — a man can only
// be infected if something bit him; it's for the medic, who has no such signal.
function infectionActive() {
  return enemyFaction() === 'zo' || !!(G && G.difficulty && G.difficulty.testing);
}

function syncMuteButtons() {
  const muted = SFX.muted;
  const btn = el('settings-mute-btn');
  if (btn) {
    btn.textContent = muted ? 'SND OFF' : 'SND ON';
    btn.dataset.on = String(!muted);
  }
  const mbtn = el('settings-music-btn');
  if (mbtn) {
    const mm = MUSIC.muted;
    mbtn.textContent = mm ? 'MUS OFF' : 'MUS ON';
    mbtn.dataset.on = String(!mm);
  }
}

const canvas = document.getElementById('game');
let ctx = canvas.getContext('2d');

// persistent ground layer (wrecks, terrain — blood and craters are temporary overlays)
const groundCanvas = document.createElement('canvas');
groundCanvas.width = W; groundCanvas.height = H;
const gctx = groundCanvas.getContext('2d');

function newGame(level, difficulty) {
  // ESCALATION (js/escalation.js): the endless difficulty ladder, read out of
  // the save the same way the card loadout is rather than threaded through
  // startGame — that keeps every startGame call site (menu, restart buttons,
  // TEST.start) unchanged. Sandbox and testing are exempt, so the ladder can
  // never distort the unlimited-TP tiers. Built BEFORE the object literal
  // because the literal reads it for the opening TP and two timer seeds.
  const escLevel = (level.id === 'endless' && difficulty && !difficulty.sandbox)
    ? loadEndlessCards().escalation : 0;
  const esc = buildEscMods(escLevel);
  G = {
    level,
    mode: level.mode,
    difficulty: difficulty || ENDLESS_DIFFICULTIES.easy,
    esc,
    bossKills: 0,   // Escalation X wants the boss down twice before the run is won
    tp: (level.startTP != null ? level.startTP : 15) * esc.startTPMult,
    wave: 0,
    phase: 'combat',
    kills: 0,
    medalsEarned: 0,  // endless: medals banked this run (wave-10 milestones)
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
    itWorks: [],     // Regio Esercito field works — enemy-built, and they outlive the wave
    itFrontY: IT_FRONT_Y_START,   // deepest live work: what new sites are measured from
    itTick: 0,                    // countdown to the next works-cache rebuild
    // AVANTI: one signed clock. NEGATIVE counts up through the telegraph, POSITIVE
    // counts down through the surge, 0 is idle — so a single comparison answers
    // both "is a charge coming" and "is one running".
    itCharge: 0,
    itAvantiCd: rand(IT_AVANTI_CD_MIN, IT_AVANTI_CD_MAX),
    itLastAvanti: -999,           // G.time of the last charge, for the minimum gap
    camoNests: [],
    ammoCrates: [],
    dummies: [],     // decoy scarecrows: enemies waste fire on them, then may wise up
    shells: [],      // incoming ordnance {x,y,timer,r,dmg,big}
    grenades: [],    // thrown grenades in flight
    shrapnel: [],    // Frag Grenades card: fragments flung from a grenadier blast
    rockets: [],     // bazooka rockets in flight
    biles: [],       // Spitter corrosive-bile globs in flight (Horde faction)
    smoke: [],       // drifting smokescreen puffs — visible cloud AND line-of-sight blockers
    smokePots: [],   // burning smoke canisters still pumping the screen out
    smokeBox: null,  // bbox over every blocking puff, rebuilt per frame (js/smoke.js)
    planes: [],      // aircraft: friendly strafing runs, transports, enemy bombers
    flak: [],        // AA shells fused to burst in mid-air {x,y,timer,...}
    tracers: [],
    particles: [],
    flashes: [],
    shake: 0,        // current screen-shake amplitude in px, decays each frame
    texts: [],       // floating notices (promotions)
    corpses: [],     // fallen soldiers, cleared away after CORPSE_TTL
    gibs: [],        // detached body parts mid-flight, then settled on the ground
    groundMarks: [], // blood stains and blast craters, fade after GROUND_MARK_TTL

    spawnTimer: 6,
    tpTrickle: TP_TRICKLE_INTERVAL + esc.trickleAdd,
    officerTick: (level.id === 'endless' && equippedEndlessCards().includes('rushorder')) ? 15 : 30,
    eventTimer: rand(40, 60) * esc.eventIntervalMult,
    fog: 0,
    wind: rollWind(),    // smoke rides this; it veers a little every wave (js/smoke.js)
    banner: null,
    selected: [],
    focusTarget: null,   // an enemy the player clicked: troops in range prefer it
    auraRefresh: 0,
    buffFrame: 0,
    usOfficers: [],
    deOfficers: [],

    recap: makeRecap(),  // after-action report stats (js/recap.js)
  };
  // roguelite cards apply to every true endless run (any difficulty —
  // sandbox/testing double as the card test bed), never to campaigns
  G.cardHooks = level.id === 'endless' ? buildCardHooks() : null;
  G.cardsOwned = level.id === 'endless' ? new Set(equippedEndlessCards()) : null;
  // War Chest front-loads the run's opening TP balance
  if (G.cardsOwned && G.cardsOwned.has('warchest')) G.tp += WAR_CHEST_TP;
  // endless-only: each run rolls which enemy the sector faces — the Wehrmacht,
  // the Imperial Japanese Army, the Regio Esercito, or The Horde (undead). Every
  // other mode (tutorials, campaigns) stays German so their scripted enemy types
  // keep working. A caller (test harness) may pre-set G_forceFaction to lock the
  // roll — it wins over the escalation pin so TEST.start's third argument keeps
  // working at any rung.
  G.enemyFaction = level.id === 'endless'
    ? (G_forceFaction || esc.faction || pick(['de', 'jp', 'zo', 'it']))
    : 'de';
  // starting an endless run refreshes the shop's reroll price back to base
  if (level.id === 'endless') resetRerollCost();
  paintGround(level);
  level.setup(G);
}

function makeUnit(type, x, y, nation = 'us') {
  const t = UNIT_TYPES[type];
  const u = {
    side: 'us', nation, type, t, x, y,
    hp: t.hp, maxhp: t.hp,
    // Body/Flak Armor abilities: separate depleting pools, 0 until purchased
    bodyArmor: 0, maxBodyArmor: 0, flakArmor: 0, maxFlakArmor: 0,
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
  // Standard Issue card: give support units a rifle in place of their sidearm
  maybeSwapToRifle(u);
  // a medic carries no weapon of his own — only the Standard Issue rifle arms him
  if (u.type === 'medic') u.armed = !!(G.cardsOwned && G.cardsOwned.has('riflearm_medic'));
  // Seasoned Veteran card: muster this type in one rank higher
  maybeSeasonVeteran(u);
  // Field Hardened card: muster this type with 30% more HP
  maybeHarden(u);
  return u;
}

// how much tougher than his catalog HP a man spawning THIS wave is. Read at
// spawn only, so a ramp change never heals or wounds anyone already on the
// field. Endless only — the tutorials script their own HP.
function enemyHpRamp() {
  if (!G || G.mode !== 'endless' || !G.difficulty) return 1;
  // Escalation I steepens the climb; the ceiling is deliberately left alone, so
  // the rung bites in the mid game rather than raising the late-game plateau
  const ramp = (G.difficulty.hpRamp || 0) * G.esc.hpRampMult;
  if (!ramp) return 1;
  return Math.min(ENEMY_HP_RAMP_CAP, 1 + ramp * (G.wave || 0));
}

function makeEnemy(type, x, y, nation) {
  const t = ENEMY_TYPES[type];
  // noRamp (the boss): his HP is a hand-set multiple of a tank's, not a
  // trooper's — the difficulty ramp would silently triple it on hard
  const hp = Math.round(t.hp * (t.noRamp ? 1 : enemyHpRamp()));
  // an enemy's nation follows its type unless a caller forces one: alternate
  // rosters carry their own faction ('jp'/'zo'/'it'), everything else is Wehrmacht ('de')
  if (nation == null) nation = t.faction || 'de';
  return {
    side: 'de', nation, type, t, x, y,
    hp, maxhp: hp,
    // Body/Flak Armor pools: 0 unless the endless spawner plates this man (see
    // armorEnemy in waves.js). Bullets chip body armor, explosions chip flak.
    bodyArmor: 0, maxBodyArmor: 0, flakArmor: 0, maxFlakArmor: 0,
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

// A Regio Esercito field work. Deliberately NOT an actor: it has no `t`, no
// `side: 'de'`, and never enters G.enemies — it's inert scenery that the
// garrison AI and the cover check read. `frac` lets a builder stake one out at
// partial strength, so a work under construction can be shelled before it's
// finished (see updateGuastatore). `occ` is a per-tick rebuilt count of how many
// men are in it, never a list of refs: compactInPlace splices the dead out the
// frame they fall, so a stored crew array would leak dead actors immediately.
function makeItalianWork(kind, x, y, frac = 1) {
  const k = IT_WORK_KINDS[kind];
  if (!k) throw new Error('unknown Italian work kind "' + kind + '" — valid: ' + Object.keys(IT_WORK_KINDS).join(', '));
  const maxhp = k.hp;
  return {
    kind, side: 'it', x, y,
    hp: Math.max(1, Math.round(maxhp * frac)), maxhp,
    up: false, up2: false, workProg: 0,
    cap: k.cap, occ: 0,
  };
}

