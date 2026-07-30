/* Trenchworks: WW2 — tutorial scripts.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

function tutorialScriptActive() {
  return !!(G && G.tutorial && !G.tutorial.done);
}

function tutorialCamActive() {
  return !!(G && G.tutorial && G.tutorial.cam.active);
}

// All three scripts below were staged against a 540-unit-tall field and hardcode
// their lateral (y) positions and offsets in that reference frame. tuY() rescales
// any of those numbers to whatever H actually is, so a field resize doesn't leave
// a flank squad massed past the bottom edge or a build zone hanging off it. Being
// linear (a pure multiply, no added offset) is what lets it apply to a raw
// position (tuY(150)) and to a delta off one (BY - tuY(60)) with the same
// function and get a consistent answer either way.
const TUT_REF_H = 540;
function tuY(y) { return y * H / TUT_REF_H; }

// Depth (x) positions are a flat hand-shift, not a tuY()-style helper: they
// were all staged relative to the original DEPLOY_X (380), and every one of
// these bunkers, build zones and camera targets carries the SAME running total
// offset DEPLOY_X itself has accumulated across every rebalance since (see the
// note on it in constants.js) — currently +122 (380 -> 502). Reproduce that
// arithmetic by hand for each literal below if DEPLOY_X moves again; don't
// just add the latest delta to what's already here, since a couple of these
// (the ones noted inline) track FORWARD_X's own, different running total
// instead. Enemy spawns staged near the treeline (x < ~70) were deliberately
// left alone — they were never calibrated against DEPLOY_X, only their march
// got longer, which is a pacing change, not a broken one.

function setupTutorial1(G) {
  const rifle = makeUnit('rifleman', 592, tuY(300));
  rifle.xp = 1;   // one kill away from PFC: the scripted duel promotes him
  G.units.push(rifle);
  usBunker(G, 557, tuY(150));
  G.spawnTimer = 9999;   // no waves until the script hands off
  G.tutorial = {
    script: 't1',
    step: 'welcome',
    timer: 0,        // set from the step's own text on entry (flow.js enters it)
    rifle,
    bunker: G.bunkers[0],
    foe: null,
    done: false,
    cam: { active: true, tx: 0, ty: 0, tzoom: 1 },
    // per-step interaction gating (shared by both tutorial scripts)
    allowBuy: [], placeZone: null, pulseCat: null, pulseKey: null, ringTargets: null,
  };
  tutSetCam(2.6, rifle.x, rifle.y, true);
}

// ---- Tutorial 2: a two-front crisis that teaches wire, sandbags, and unit choice.
// The scene picks up where Tutorial 1 left off — one bunker, a PFC rifleman, and
// a medic behind. A flamethrower charges the center; the player wires the lane to
// win the duel, then fortifies an open right flank against a fresh squad.
function setupTutorial2(G) {
  const BX = 557, BY = tuY(150);   // BX is the bunker's depth (x), BY its lateral (y)
  const rifle = makeUnit('rifleman', BX + 2, BY);
  rifle.rank = 1;                 // the PFC he earned in Lesson 1
  G.units.push(rifle);
  const medic = makeUnit('medic', BX + 62, BY);   // dug in behind the bunker
  G.units.push(medic);
  usBunker(G, BX, BY);
  G.spawnTimer = 9999;            // no endless waves until the script hands off
  G.tutorial = {
    script: 't2',
    step: 'intro',
    timer: 0,        // set from the step's own text on entry (flow.js enters it)
    rifle,
    medic,
    bunker: G.bunkers[0],
    foe: null,                    // the center flamethrower
    flankFoes: [],                // the right-flank squad
    baseWires: 0, baseBags: 0,
    wiresWanted: 2, bagsWanted: 1, unitsWanted: 2,
    done: false,
    cam: { active: true, tx: 0, ty: 0, tzoom: 1 },
    allowBuy: [], placeZone: null, pulseCat: null, pulseKey: null, ringTargets: null,
  };
  tutSetCam(2.0, BX, BY, true);
}

// how many fighting men the player has posted on the far flank (y > 300 in the
// 540-tall reference frame the tutorial was staged against)
function tutRightUnitCount() {
  if (!G) return 0;
  return G.units.filter(u => !u.dead && u.y > tuY(300)).length;
}

// aim the tutorial camera at a world point; snap jumps there instantly,
// otherwise tutCamLerp eases toward it each frame
function tutSetCam(zoom, cx, cy, snap) {
  const c = G.tutorial.cam;
  c.zoomReq = zoom; c.cx = cx; c.cy = cy;
  tutCamRetarget();
  if (snap) {
    viewCam.zoom = c.tzoom;
    viewCam.x = c.tx;
    viewCam.y = c.ty;
    clampCamera();
    viewDirty = true;
  }
}

// scripted zooms are authored for the desktop canvas; on phones the world never
// fits below coverZoom, so hold the target to the same limits player pinch gets
function tutCamRetarget() {
  const c = G.tutorial.cam;
  let zoom = c.zoomReq;
  if (mobileViewActive()) zoom = clamp(zoom, viewZoomMin(), viewZoomMax());
  const { viewW, viewH } = viewSize(zoom);
  c.tzoom = zoom;
  c.tx = clamp(c.cx - viewW / 2, 0, Math.max(0, W - viewW));
  c.ty = clamp(c.cy - viewH / 2, 0, Math.max(0, H - viewH));
}

function tutCamLerp(dt) {
  const c = G.tutorial.cam;
  tutCamRetarget();   // screen size may have changed since the step began
  const k = Math.min(1, dt * 2.5);
  viewCam.zoom += (c.tzoom - viewCam.zoom) * k;
  viewCam.x += (c.tx - viewCam.x) * k;
  viewCam.y += (c.ty - viewCam.y) * k;
  clampCamera();
  viewDirty = true;
}

function tutCamArrived() {
  const c = G.tutorial.cam;
  return Math.abs(viewCam.zoom - c.tzoom) < 0.02 &&
         Math.hypot(viewCam.x - c.tx, viewCam.y - c.ty) < 3;
}

// ---- Tutorial message box with a per-message on-screen time -------------------
// A step that is entered and then quickly superseded used to have its message
// flash by. Messages are queued: the flush (run every tutorial frame) only swaps
// in the next one once the current box has had ITS OWN read time, so every box
// reads before the next replaces it.
//
// Read time is derived from the text rather than typed per step. 0.4s to notice
// the box and get gaze onto it, then ~210 wpm (3.5 words/s — Brysbaert 2019 puts
// silent non-fiction reading at 238 wpm, derated the way subtitle standards
// derate it for text read over moving action: BBC 160-180 wpm, Netflix ~200),
// times a 1.4 comprehension buffer because this is unfamiliar vocabulary read
// under divided attention. Floored at 3s so a two-word box survives a glance
// away (Netflix's own floor is 5/6s for a viewer already looking at the text),
// capped at 10s (Material's snackbar max) because anything needing longer than
// that should be a panel, not a transient message.
const TUT_READ_MIN = 3;
const TUT_READ_MAX = 10;
function tutReadTime(text) {
  if (!text) return 0;   // a blank box has no minimum
  const words = text.trim().split(/\s+/).length;
  return clamp(0.4 + (words / 3.5) * 1.4, TUT_READ_MIN, TUT_READ_MAX);
}

let tutMsgCurrent = null;   // text in the box right now (null = hidden)
let tutMsgShownAt = 0;      // G.time when it went up
let tutMsgHold = 0;         // its read time — how long before the next may replace it
let tutMsgQueue = [];       // pending texts, in order

function applyTutorialMsg(text) {
  const m = el('tutorial-msg');
  if (!m) return;
  m.textContent = text || '';
  m.classList.toggle('hidden', !text);
  if (!text) m.classList.remove('can-skip');
}

// show the "click to continue" tail only while a timed step is counting down;
// an action-gated box advances on the world and has nothing to skip
function syncTutorialSkipHint() {
  const m = el('tutorial-msg');
  if (!m) return;
  m.classList.toggle('can-skip', !!(tutMsgCurrent && G && G.tutorial && G.tutorial.timer > 0));
}

// queue a message (or null to blank the box), deduped against whatever is
// already showing / last queued so re-entering a step won't restart the timer
function setTutorialMsg(text) {
  text = text || null;
  const last = tutMsgQueue.length ? tutMsgQueue[tutMsgQueue.length - 1] : tutMsgCurrent;
  if (text === last) return;
  tutMsgQueue.push(text);
}

// advance the queue once the current box has had its read time; a blank box has
// no minimum, so the next message can appear immediately after a clear
function flushTutorialMsg() {
  if (!tutMsgQueue.length) return;
  const ready = tutMsgCurrent == null || (G.time - tutMsgShownAt) >= tutMsgHold;
  if (!ready) return;
  tutMsgCurrent = tutMsgQueue.shift();
  tutMsgShownAt = G.time;
  tutMsgHold = tutReadTime(tutMsgCurrent);
  applyTutorialMsg(tutMsgCurrent);
}

// hard reset: clear the box now and drop anything queued. Used at teardown and
// game start, where the read-time gate must not hold a stale message on screen.
function hideTutorialMsg() {
  tutMsgQueue.length = 0;
  tutMsgCurrent = null;
  tutMsgShownAt = 0;
  tutMsgHold = 0;
  applyTutorialMsg(null);
}

// Is the box behind the script? True while any message is still waiting its turn.
// A timed step must not burn its clock down while its own text is still queued
// behind the previous box, or the step expires before the player ever sees it.
function tutMsgPending() {
  return tutMsgQueue.length > 0;
}

// Set the step's message AND its timer from the same string, so a step's read
// time can never drift from the text it is giving the player.
function tutMsg(T, text) {
  setTutorialMsg(text);
  T.timer = tutReadTime(text);
}

// Timer-only steps hold while the box catches up (see tutMsgPending).
function tutStepDt(dt) {
  return tutMsgPending() ? 0 : dt;
}

// WCAG 2.2 SC 2.2.1 (Timing Adjustable): auto-advancing text must be dismissable.
// Click or key gives up the rest of the current box's read time — and, if the
// box is caught up with the script, the rest of a timed step with it. Steps that
// gate on a world condition ignore T.timer, so this can never skip a lesson.
function dismissTutorialMsg() {
  if (!tutorialScriptActive() || tutMsgCurrent == null) return false;
  tutMsgHold = 0;
  if (!tutMsgPending() && G.tutorial.timer > 0) G.tutorial.timer = 0;
  flushTutorialMsg();
  return true;
}

function tutEnterStep(step) {
  const T = G.tutorial;
  T.step = step;
  // reset per-step interaction gating; each case re-enables only what it needs
  T.allowBuy = []; T.placeZone = null; T.pulseCat = null; T.pulseKey = null; T.ringTargets = null;
  // and the clock: an action-gated case sets no timer, and a leftover positive
  // one from the previous step would light the "click to continue" hint on a box
  // that has nothing to skip
  T.timer = 0;
  if (T.script === 't2') { tutEnterStep2(T, step); return; }
  if (T.script === 't3') { tutEnterStep3(T, step); return; }
  switch (step) {
    case 'welcome':
      tutMsg(T, 'Welcome to the war, soldier!');
      break;
    case 'select':
      setTutorialMsg('Click on a unit to select it.');
      break;
    case 'moveToBunker':
      tutSetCam(1.5, 572, tuY(225));
      setTutorialMsg('Now click the bunker to move him there — men in cover can block damage.');
      break;
    case 'fight':
      T.timer = 1.2;
      setTutorialMsg(null);
      break;
    case 'rankup':
      // the duel usually leaves him unscathed behind bunker cover — make sure
      // he carries a wound so the medic lesson has something to heal
      T.rifle.hp = Math.min(T.rifle.hp, T.rifle.maxhp - 35);
      tutMsg(T, 'Your soldiers gain experience and rank up. Veterans far outfight green troops — keep them alive.');
      break;
    case 'buyMedic':
      if (G.tp < 12) G.tp = 12;   // exactly enough for the medic
      T.allowBuy = ['medic']; T.pulseCat = 'units'; T.pulseKey = 'medic';
      setTutorialMsg('Purchase a medic to heal your wounded soldier.');
      break;
    case 'placeMedic':
      T.allowBuy = ['medic']; T.pulseCat = 'units'; T.pulseKey = 'medic';
      setTutorialMsg('After selecting the medic, place him down near your soldier to heal him.');
      break;
    case 'breather':
      T.timer = 3;
      setTutorialMsg(null);
      break;
    case 'zoomOut':
      if (mobileViewActive()) {
        // the full map never fits a phone screen: release the cam and snap to
        // the widest available view. NOT resetViewCam — its normal gameplay
        // default is cover (deliberately MORE zoomed in, to fill the screen),
        // which would defeat the entire point of a step called "zoom out".
        T.cam.active = false;
        tutSetCam(containZoom(), W / 2, H / 2, true);
        T.timer = 1.5;
      } else {
        tutSetCam(1, W / 2, H / 2);
      }
      break;
    case 'handoff':
      // tutMsg sets the timer from the text: the completion screen waits out the
      // handoff's own read time rather than a guessed 4.5s
      tutMsg(T, 'That\'s basic training, soldier — select, move, and reinforce your line. Well done.');
      showBanner('TUTORIAL COMPLETE');
      markLevelComplete(G.level.id);
      T.done = true;
      T.cam.active = false;
      break;
  }
}

// ---- Tutorial 2 step machine -------------------------------------------------

function tutEnterStep2(T, step) {
  switch (step) {
    case 'intro':
      tutMsg(T, "Dawn on the line, Sergeant. You held through the night — the Germans aren't finished.");
      break;
    case 'spot':
      // reveal the threat: a flamethrower frozen at the top of the center lane
      T.foe = makeEnemy('eflame', 44, tuY(150));
      T.foe.hp = T.foe.maxhp = 60;   // scripted duel: the wire + rifleman must win reliably
      T.foe.tutHold = true;
      G.enemies.push(T.foe);
      T.ringTargets = [T.foe];
      tutSetCam(1.0, W / 2, H / 2);
      tutMsg(T, "Contact — Flammenwerfer up the center! He closes fast and burns through anything your rifleman has.");
      break;
    case 'wire':
      if (G.tp < 8) G.tp = 8;               // two wire, with a little to spare
      T.baseWires = G.wires.length;
      T.allowBuy = ['wire']; T.pulseCat = 'emplacements'; T.pulseKey = 'wire';
      T.placeZone = { x0: 392, y0: tuY(95), x1: 484, y1: tuY(210) };
      T.ringTargets = [T.foe];
      tutSetCam(1.0, W / 2, H / 2);
      setTutorialMsg("Barbed wire bogs down a charge. Lay two lines across his path in the marked zone.");
      break;
    case 'charge':
      if (T.foe) T.foe.tutHold = false;     // release him; the wire does the rest
      setTutorialMsg("Here he comes — let the wire do its work.");
      break;
    case 'flankwarn':
      // a fresh squad masses on the undefended right flank, deliberately staged
      // at the edge of no-man's-land — these two x's and the camera below track
      // FORWARD_X's own running total (+44, 207 -> 251), not DEPLOY_X's
      T.flankFoes = [
        makeEnemy('erifle', 249, tuY(432)),
        makeEnemy('erifle', 239, tuY(476)),
      ];
      // scripted assault: they mass close to the line and carry trimmed HP, so a
      // single BAR gunner clears them at a snappy tutorial pace — no long grind
      for (const e of T.flankFoes) { e.hp = e.maxhp = 45; e.tutHold = true; G.enemies.push(e); }
      T.ringTargets = T.flankFoes.slice();
      tutSetCam(1.15, 364, tuY(410));
      tutMsg(T, "More of them — massing on your lower flank, and you've got nothing over there!");
      break;
    case 'sandbag':
      if (G.tp < 10) G.tp = 10;             // two sandbags, with a little to spare
      T.baseBags = G.sandbags.length;
      T.allowBuy = ['sandbags']; T.pulseCat = 'emplacements'; T.pulseKey = 'sandbags';
      T.placeZone = { x0: 530, y0: tuY(345), x1: 654, y1: tuY(508) };
      T.ringTargets = T.flankFoes.slice();
      tutSetCam(1.2, 552, tuY(400));
      setTutorialMsg("Sandbags go up fast — men behind them dodge half the incoming fire. Cover that flank.");
      break;
    case 'buyunits':
      if (G.tp < 12) G.tp = 12;             // a couple of riflemen, or a gunner and a rifleman
      T.allowBuy = ['rifleman', 'gunner']; T.pulseCat = 'units'; T.pulseKey = 'rifleman';
      T.placeZone = { x0: 526, y0: tuY(330), x1: 666, y1: tuY(516) };
      T.ringTargets = T.flankFoes.slice();
      tutSetCam(1.2, 552, tuY(400));
      setTutorialMsg("One man can't hold two fronts. Buy two riflemen and post them both behind that sandbag.");
      break;
    case 'flankcharge':
      for (const e of T.flankFoes) e.tutHold = false;   // send them in
      setTutorialMsg("Hold them! Don't let them break through!");
      break;
    case 'handoff':
      tutMsg(T, "Good work, Sergeant. Fortify your weak points and pick the right man for the job.");
      showBanner('TUTORIAL COMPLETE');
      markLevelComplete(G.level.id);
      T.done = true;
      T.cam.active = false;
      resetViewCam(G.mode);
      break;
  }
}

function updateTutorial2(dt, T) {
  if (T.rifle.dead) { gameOver(); return; }   // the flamethrower got through
  switch (T.step) {
    case 'intro':
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0) tutEnterStep('spot');
      break;
    case 'spot':
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0) tutEnterStep('wire');
      break;
    case 'wire':
      if (G.wires.length - T.baseWires >= T.wiresWanted) tutEnterStep('charge');
      break;
    case 'charge':
      if (T.foe && T.foe.dead) tutEnterStep('flankwarn');
      break;
    case 'flankwarn':
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0) tutEnterStep('sandbag');
      break;
    case 'sandbag':
      if (G.sandbags.length - T.baseBags >= T.bagsWanted) tutEnterStep('buyunits');
      break;
    case 'buyunits':
      if (tutRightUnitCount() >= T.unitsWanted) tutEnterStep('flankcharge');
      break;
    case 'flankcharge':
      if (T.flankFoes.every(e => e.dead)) tutEnterStep('handoff');
      break;
  }
}

// ---- Tutorial 3: the three damage types --------------------------------------
// A gunner easily clears infantry with bullets, then a flamethrower melts him
// through his bunker (fire ignores cover). The player rebuilds a rifle line —
// which a tank shrugs off (bullets don't hurt armor) — learns that explosives
// punish armor, then fights a mixed infantry+armor push with the full toolbox.
const TUT3_BX = 577, TUT3_BY = tuY(270);   // the center bunker + gunner (BX depth, BY lateral)

function setupTutorial3(G) {
  const gunner = makeUnit('gunner', TUT3_BX, TUT3_BY);
  gunner.rank = 2;                 // the veteran the player carried through the lessons
  G.units.push(gunner);
  usBunker(G, TUT3_BX, TUT3_BY);
  G.spawnTimer = 9999;             // no endless waves until the script hands off
  // the battle is already joined: a green infantry squad walking into his gun
  const squad = [
    makeEnemy('erifle', 390, TUT3_BY - tuY(60)),
    makeEnemy('erifle', 380, TUT3_BY),
    makeEnemy('erifle', 390, TUT3_BY + tuY(60)),
  ];
  for (const e of squad) { e.hp = e.maxhp = 24; G.enemies.push(e); }
  G.tutorial = {
    script: 't3',
    step: 'intro',
    timer: 0,        // set from the step's own text on entry (flow.js enters it)
    gunner,
    bunker: G.bunkers[0],
    squad,
    flame: null,
    tank: null,
    mixFoes: [],
    baseUnits: 0,                  // alive-unit baseline for the build gates
    done: false,
    cam: { active: true, tx: 0, ty: 0, tzoom: 1 },
    allowBuy: [], placeZone: null, pulseCat: null, pulseKey: null, ringTargets: null,
  };
  tutSetCam(1.0, W / 2, H / 2, true);
}

// alive US fighting men the player has posted (the dead scripted gunner excluded)
function tut3UnitCount() {
  return G ? G.units.filter(u => !u.dead).length : 0;
}
function tut3HasBazooka() {
  return !!(G && G.units.some(u => u.type === 'bazooka' && !u.dead));
}

const TUT3_ZONE = { x0: 522, y0: tuY(70), x1: 688, y1: tuY(470) };
// the bazooka's own AP damage is left completely real — the lesson is that
// explosives punch through armor. The tutorial tanks carry a little over half a
// real Panzer's HP so a couple of real rockets finish them (they still shrug off
// the first — no paper one-shot), keeping the exchange winnable for a small line
// instead of a full-strength Panzer that out-trades it. They're also pinned on
// this line once they arrive: they menace and shell, but never breach.
const TUT3_TANK_HP = 660;
// hold the tank here once it arrives. Chosen so a bazooka placed at the back of
// the build zone (x ~688) sits just outside the Panzer's 228px cannon reach but
// still inside the bazooka's 243px rocket range: the player can safely stand off
// and answer armor with explosives, exactly the lesson we're teaching. (Translated
// alongside TUT3_ZONE and every move of DEPLOY_X — same two margins.)
const TUT3_TANK_HOLD_X = 452;

function tutEnterStep3(T, step) {
  switch (step) {
    case 'intro':
      tutSetCam(1.0, W / 2, H / 2);
      tutMsg(T, 'Hold the line, soldier. Your gunner has the center — watch his rifle work.');
      break;
    case 'won':
      tutMsg(T, 'Bullets tear through infantry in the open — accurate and deadly. Easy work.');
      break;
    case 'flame':
      // a flamethrower charges the gun; heavy HP so he survives the gunner's
      // fire long enough to close the distance and make his point
      T.flame = makeEnemy('eflame', 40, TUT3_BY);
      T.flame.t = Object.assign({}, T.flame.t, { hp: 520 });
      T.flame.hp = T.flame.maxhp = 520;
      G.enemies.push(T.flame);
      T.ringTargets = [T.flame];
      tutSetCam(1.0, W / 2, H / 2);
      setTutorialMsg('Flammenwerfer up the center — and he is coming straight for your gun!');
      break;
    case 'flameLesson':
      if (T.flame) { T.flame.dead = true; }   // his point is made; pull him off the field
      T.ringTargets = null;
      tutSetCam(1.3, TUT3_BX - 30, TUT3_BY);
      tutMsg(T, 'Bunkers and sandbags do not stop fire. Nothing does — flame melts men in cover.');
      break;
    case 'rebuild':
      G.tp = 30;
      T.baseUnits = tut3UnitCount();
      T.allowBuy = ['rifleman', 'gunner', 'grenadier', 'shotgunner', 'sniper', 'flamer'];
      // free-choice step: guide the player to the UNITS category, but don't
      // spotlight one man — the whole point is that any of them will do
      T.pulseCat = 'units'; T.pulseKey = null;
      T.placeZone = TUT3_ZONE;
      tutSetCam(1.25, 592, H / 2);
      setTutorialMsg('Rebuild your line — spend your requisition on any men you choose. Post at least two.');
      break;
    case 'tank':
      // a Panzer rolls the center, shelling the men below it as it comes. A mild
      // speed bump keeps the approach watchable; it takes real bazooka rockets
      // (a couple) to kill — see TUT3_TANK_HP for why it isn't the full 1200.
      T.tank = makeEnemy('panzer', 30, TUT3_BY);
      T.tank.t = Object.assign({}, T.tank.t, { hp: TUT3_TANK_HP, speed: 16 });
      T.tank.hp = T.tank.maxhp = TUT3_TANK_HP;
      G.enemies.push(T.tank);
      T.ringTargets = [T.tank];
      tutSetCam(1.0, W / 2, H / 2);
      setTutorialMsg('Armor! A Panzer is rolling up the center — throw everything you have at it!');
      break;
    case 'armorLesson':
      if (G.tp < 36) G.tp = 36;               // enough to field a few bazookas
      T.allowBuy = ['bazooka'];
      T.pulseCat = 'units'; T.pulseKey = 'bazooka';
      T.placeZone = TUT3_ZONE;
      T.ringTargets = [T.tank];
      setTutorialMsg('Bullets bounce off armor. Explosives do bonus damage — buy a bazooka, post it at the back.');
      break;
    case 'armorFight':
      if (G.tp < 12) G.tp = 12;               // never leave the player unable to answer armor
      T.allowBuy = ['bazooka'];
      T.pulseCat = 'units'; T.pulseKey = 'bazooka';
      T.placeZone = TUT3_ZONE;
      T.ringTargets = [T.tank];
      setTutorialMsg('Rockets chew through even a Panzer — keep them coming until it burns.');
      break;
    case 'mixIntro':
      tutSetCam(1.0, W / 2, H / 2);
      tutMsg(T, 'Last push, soldier — infantry AND armor together. Buy the right tool for each threat.');
      break;
    case 'mix': {
      G.tp = 60;
      T.mixFoes = [
        makeEnemy('erifle', 60, TUT3_BY - tuY(100)),
        makeEnemy('erifle', 48, TUT3_BY - tuY(40)),
        makeEnemy('erifle', 48, TUT3_BY + tuY(40)),
        makeEnemy('erifle', 60, TUT3_BY + tuY(100)),
      ];
      for (const e of T.mixFoes) { e.hp = e.maxhp = 30; e.tutHold = true; G.enemies.push(e); }
      const tank = makeEnemy('panzer', 24, TUT3_BY);
      tank.t = Object.assign({}, tank.t, { hp: TUT3_TANK_HP, speed: 16 });
      tank.hp = tank.maxhp = TUT3_TANK_HP;
      tank.tutHold = true;
      G.enemies.push(tank);
      T.mixFoes.push(tank);
      T.baseUnits = tut3UnitCount();
      T.allowBuy = ['rifleman', 'gunner', 'grenadier', 'shotgunner', 'sniper', 'flamer', 'bazooka'];
      T.pulseCat = 'units'; T.pulseKey = 'bazooka';
      T.placeZone = TUT3_ZONE;
      T.ringTargets = T.mixFoes.slice();
      tutSetCam(1.0, W / 2, H / 2);
      setTutorialMsg('Riflemen for the infantry, a bazooka for the tank. Post a bazooka and one more man.');
      break;
    }
    case 'mixCharge':
      for (const e of T.mixFoes) e.tutHold = false;   // send the whole force in
      T.allowBuy = ['rifleman', 'gunner', 'grenadier', 'shotgunner', 'sniper', 'flamer', 'bazooka'];
      T.placeZone = TUT3_ZONE;
      setTutorialMsg('Here they come — bullets for the infantry, rockets for the tank. Hold the line!');
      break;
    case 'handoff':
      tutMsg(T, 'That is the trade, soldier: bullets for infantry, fire for cover, explosives for armor.');
      showBanner('TUTORIAL COMPLETE');
      markLevelComplete(G.level.id);
      T.done = true;
      T.cam.active = false;
      resetViewCam(G.mode);
      break;
  }
}

function updateTutorial3(dt, T) {
  // pin any live tutorial tank on the hold line: it still traverses and shells
  // from there, but can never roll through the line and breach, so the player has
  // all the time they need to bring explosives to bear (no HP nerf required)
  for (const e of G.enemies) {
    if (!e.dead && e.t.tank && e.x > TUT3_TANK_HOLD_X) e.x = TUT3_TANK_HOLD_X;
  }
  switch (T.step) {
    case 'intro':
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0 && T.squad.every(e => e.dead)) tutEnterStep('won');
      break;
    case 'won':
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0) tutEnterStep('flame');
      break;
    case 'flame':
      // the flamethrower reaching the gunner and melting him is the whole lesson
      if (T.gunner.dead) tutEnterStep('flameLesson');
      break;
    case 'flameLesson':
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0) tutEnterStep('rebuild');
      break;
    case 'rebuild':
      if (tut3UnitCount() - T.baseUnits >= 2) tutEnterStep('tank');
      break;
    case 'tank':
      // the fallback that moves the lesson on even if the player never fires a
      // shot: it isn't "halfway across the field" (W/2 only coincided with the
      // tank's own hold line by accident of the old, narrower field, and broke
      // outright once W grew for the wide-screen resize — the tank is clamped
      // at TUT3_TANK_HOLD_X and W/2 moved past it), it's "the tank has arrived
      // and is sitting at its hold point," so it's pinned to that line instead.
      if (T.tank && (T.tank.dead || T.tank.x > TUT3_TANK_HOLD_X - 5)) tutEnterStep('armorLesson');
      break;
    case 'armorLesson':
      if (T.tank && T.tank.dead) { tutEnterStep('mixIntro'); break; }
      if (tut3HasBazooka()) tutEnterStep('armorFight');
      break;
    case 'armorFight':
      if (!T.tank || T.tank.dead) tutEnterStep('mixIntro');
      break;
    case 'mixIntro':
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0) tutEnterStep('mix');
      break;
    case 'mix':
      if (tut3HasBazooka() && tut3UnitCount() - T.baseUnits >= 2) tutEnterStep('mixCharge');
      break;
    case 'mixCharge':
      if (T.mixFoes.every(e => e.dead)) tutEnterStep('handoff');
      break;
  }
}

function updateTutorial(dt) {
  const T = G.tutorial;
  flushTutorialMsg();   // honor each box's read time before the next replaces it
  syncTutorialSkipHint();
  if (T.cam.active) tutCamLerp(dt);
  if (T.done) {
    if (T.step === 'handoff') {
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0) {
        T.step = 'over';
        setTutorialMsg(null);
        finishTutorial();      // stop the game, show the completion screen
      }
    }
    return;
  }
  if (T.script === 't2') { updateTutorial2(dt, T); return; }
  if (T.script === 't3') { updateTutorial3(dt, T); return; }
  if (T.rifle.dead) { gameOver(); return; }   // trainee lost the scripted duel
  switch (T.step) {
    case 'welcome':
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0) tutEnterStep('select');
      break;
    case 'select':
      if (G.selected.includes(T.rifle)) tutEnterStep('moveToBunker');
      break;
    case 'moveToBunker':
      // spawn the enemy the instant the move-to-bunker order is issued, so he's
      // already closing in by the time our rifleman reaches cover — no dead air
      if (!T.foe && T.rifle.moveTo && dist(T.rifle.moveTo, T.bunker) < 40) {
        T.foe = makeEnemy('erifle', -30, tuY(165));
        G.enemies.push(T.foe);
      }
      if (dist(T.rifle, T.bunker) < 26 && !T.rifle.moveTo) tutEnterStep('fight');
      break;
    case 'fight':
      if (T.foe && T.foe.dead) tutEnterStep('rankup');
      break;
    case 'rankup':
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0) tutEnterStep('buyMedic');
      break;
    case 'buyMedic':
      if (placing && placing.key === 'medic') tutEnterStep('placeMedic');
      break;
    case 'placeMedic':
      if (G.units.some(u => u.type === 'medic' && !u.dead)) tutEnterStep('breather');
      break;
    case 'breather':
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0) tutEnterStep('zoomOut');
      break;
    case 'zoomOut':
      if (mobileViewActive() || !T.cam.active) {
        T.timer -= tutStepDt(dt);
        if (T.timer <= 0) tutEnterStep('handoff');
      } else if (tutCamArrived()) {
        viewCam.zoom = T.cam.tzoom;
        viewCam.x = T.cam.tx;
        viewCam.y = T.cam.ty;
        tutEnterStep('handoff');
      }
      break;
  }
}
