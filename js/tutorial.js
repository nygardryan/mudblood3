/* Trenchworks: WW2 — tutorial scripts.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

function tutorialScriptActive() {
  return !!(G && G.tutorial && !G.tutorial.done);
}

function tutorialCamActive() {
  return !!(G && G.tutorial && G.tutorial.cam.active);
}

function setupTutorial1(G) {
  const rifle = makeUnit('rifleman', 300, 470);
  rifle.xp = 1;   // one kill away from PFC: the scripted duel promotes him
  G.units.push(rifle);
  usBunker(G, 150, 435);
  G.spawnTimer = 9999;   // no waves until the script hands off
  G.tutorial = {
    script: 't1',
    step: 'welcome',
    timer: 3,
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
  const BX = 150, BY = 435;
  const rifle = makeUnit('rifleman', BX, BY + 2);
  rifle.rank = 1;                 // the PFC he earned in Lesson 1
  G.units.push(rifle);
  const medic = makeUnit('medic', BX, BY + 62);   // dug in behind the bunker
  G.units.push(medic);
  usBunker(G, BX, BY);
  G.spawnTimer = 9999;            // no endless waves until the script hands off
  G.tutorial = {
    script: 't2',
    step: 'intro',
    timer: 3.5,
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

// how many fighting men the player has posted on the right flank (x > 300)
function tutRightUnitCount() {
  if (!G) return 0;
  return G.units.filter(u => !u.dead && u.x > 300).length;
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

// ---- Tutorial message box with a minimum on-screen time ----------------------
// A step that is entered and then quickly superseded used to have its message
// flash by. Messages are now queued: the flush (run every tutorial frame) only
// swaps in the next one once the current box has been up for TUT_MSG_MIN seconds,
// so every box reads before the next replaces it.
const TUT_MSG_MIN = 3;
let tutMsgCurrent = null;   // text in the box right now (null = hidden)
let tutMsgShownAt = 0;      // G.time when it went up
let tutMsgQueue = [];       // pending texts, in order

function applyTutorialMsg(text) {
  const m = el('tutorial-msg');
  if (!m) return;
  m.textContent = text || '';
  m.classList.toggle('hidden', !text);
}

// queue a message (or null to blank the box), deduped against whatever is
// already showing / last queued so re-entering a step won't restart the timer
function setTutorialMsg(text) {
  text = text || null;
  const last = tutMsgQueue.length ? tutMsgQueue[tutMsgQueue.length - 1] : tutMsgCurrent;
  if (text === last) return;
  tutMsgQueue.push(text);
}

// advance the queue once the current box has had its minimum time; a blank box
// has no minimum, so the next message can appear immediately after a clear
function flushTutorialMsg() {
  if (!tutMsgQueue.length) return;
  const ready = tutMsgCurrent == null || (G.time - tutMsgShownAt) >= TUT_MSG_MIN;
  if (!ready) return;
  tutMsgCurrent = tutMsgQueue.shift();
  tutMsgShownAt = G.time;
  applyTutorialMsg(tutMsgCurrent);
}

// hard reset: clear the box now and drop anything queued. Used at teardown and
// game start, where the min-time gate must not hold a stale message on screen.
function hideTutorialMsg() {
  tutMsgQueue.length = 0;
  tutMsgCurrent = null;
  tutMsgShownAt = 0;
  applyTutorialMsg(null);
}

function tutEnterStep(step) {
  const T = G.tutorial;
  T.step = step;
  // reset per-step interaction gating; each case re-enables only what it needs
  T.allowBuy = []; T.placeZone = null; T.pulseCat = null; T.pulseKey = null; T.ringTargets = null;
  if (T.script === 't2') { tutEnterStep2(T, step); return; }
  if (T.script === 't3') { tutEnterStep3(T, step); return; }
  switch (step) {
    case 'welcome':
      T.timer = 8;
      setTutorialMsg('Welcome to the war, soldier!');
      break;
    case 'select':
      setTutorialMsg('Click on a unit to select it.');
      break;
    case 'moveToBunker':
      tutSetCam(1.5, 225, 450);
      setTutorialMsg('Now click on the bunker to move a unit there. Units near bunkers and sandbags have a chance to block damage.');
      break;
    case 'fight':
      T.timer = 1.2;
      setTutorialMsg(null);
      break;
    case 'rankup':
      T.timer = 10.5;
      // the duel usually leaves him unscathed behind bunker cover — make sure
      // he carries a wound so the medic lesson has something to heal
      T.rifle.hp = Math.min(T.rifle.hp, T.rifle.maxhp - 35);
      setTutorialMsg('Your soldiers gain experience and rank up. Experienced soldiers are far superior to their green counterparts — try and keep them alive.');
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
        // the full map never fits a phone screen: release the cam and reset
        T.cam.active = false;
        resetViewCam(G.mode);
        T.timer = 1.5;
      } else {
        tutSetCam(1, W / 2, H / 2);
      }
      break;
    case 'handoff':
      setTutorialMsg('That\'s basic training, soldier — select, move, and reinforce your line. Well done.');
      showBanner('TUTORIAL COMPLETE');
      markLevelComplete(G.level.id);
      T.done = true;
      T.cam.active = false;
      T.timer = 4.5;        // let the message breathe before showing the completion screen
      break;
  }
}

// ---- Tutorial 2 step machine -------------------------------------------------

function tutEnterStep2(T, step) {
  switch (step) {
    case 'intro':
      T.timer = 5.5;
      setTutorialMsg("Dawn on the line, Sergeant. You held the bunker through the night — but the Germans aren't finished with you.");
      break;
    case 'spot':
      // reveal the threat: a flamethrower frozen at the top of the center lane
      T.timer = 6.5;
      T.foe = makeEnemy('eflame', 150, 44);
      T.foe.hp = T.foe.maxhp = 60;   // scripted duel: the wire + rifleman must win reliably
      T.foe.tutHold = true;
      G.enemies.push(T.foe);
      T.ringTargets = [T.foe];
      tutSetCam(1.0, W / 2, H / 2);
      setTutorialMsg("Contact — Flammenwerfer up the center! He closes fast and burns through everything. Your rifleman can't trade blows with that.");
      break;
    case 'wire':
      if (G.tp < 8) G.tp = 8;               // two wire, with a little to spare
      T.baseWires = G.wires.length;
      T.allowBuy = ['wire']; T.pulseCat = 'emplacements'; T.pulseKey = 'wire';
      T.placeZone = { x0: 95, y0: 270, x1: 210, y1: 362 };
      T.ringTargets = [T.foe];
      tutSetCam(1.0, W / 2, H / 2);
      setTutorialMsg("Barbed wire bogs down a charge. Lay two lines across his path in the marked zone — buy your rifleman time to shoot.");
      break;
    case 'charge':
      if (T.foe) T.foe.tutHold = false;     // release him; the wire does the rest
      setTutorialMsg("Here he comes — let the wire do its work.");
      break;
    case 'flankwarn':
      // a fresh squad masses on the undefended right flank
      T.timer = 6.5;
      T.flankFoes = [
        makeEnemy('erifle', 432, 205),
        makeEnemy('erifle', 476, 195),
      ];
      // scripted assault: they mass close to the line and carry trimmed HP, so a
      // single BAR gunner clears them at a snappy tutorial pace — no long grind
      for (const e of T.flankFoes) { e.hp = e.maxhp = 45; e.tutHold = true; G.enemies.push(e); }
      T.ringTargets = T.flankFoes.slice();
      tutSetCam(1.15, 410, 320);
      setTutorialMsg("More of them — massing on your right flank, and you've got nothing over there!");
      break;
    case 'sandbag':
      if (G.tp < 10) G.tp = 10;             // two sandbags, with a little to spare
      T.baseBags = G.sandbags.length;
      T.allowBuy = ['sandbags']; T.pulseCat = 'emplacements'; T.pulseKey = 'sandbags';
      T.placeZone = { x0: 345, y0: 408, x1: 508, y1: 532 };
      T.ringTargets = T.flankFoes.slice();
      tutSetCam(1.2, 400, 430);
      setTutorialMsg("Sandbags go up fast — not a bunker, but the men behind them dodge half the incoming fire. Throw one up on the right.");
      break;
    case 'buyunits':
      if (G.tp < 12) G.tp = 12;             // a couple of riflemen, or a gunner and a rifleman
      T.allowBuy = ['rifleman', 'gunner']; T.pulseCat = 'units'; T.pulseKey = 'rifleman';
      T.placeZone = { x0: 330, y0: 404, x1: 516, y1: 544 };
      T.ringTargets = T.flankFoes.slice();
      tutSetCam(1.2, 400, 430);
      setTutorialMsg("One man can't hold two fronts. Buy two men — a couple of riflemen will do — and post them both behind that sandbag.");
      break;
    case 'flankcharge':
      for (const e of T.flankFoes) e.tutHold = false;   // send them in
      setTutorialMsg("Hold them! Don't let them break through!");
      break;
    case 'handoff':
      setTutorialMsg("Good work, Sergeant. Fortify your weak points, stack your defenses, and pick the right man for the job.");
      showBanner('TUTORIAL COMPLETE');
      markLevelComplete(G.level.id);
      T.done = true;
      T.cam.active = false;
      resetViewCam(G.mode);
      T.timer = 4.5;        // let the message breathe before showing the completion screen
      break;
  }
}

function updateTutorial2(dt, T) {
  if (T.rifle.dead) { gameOver(); return; }   // the flamethrower got through
  switch (T.step) {
    case 'intro':
      T.timer -= dt;
      if (T.timer <= 0) tutEnterStep('spot');
      break;
    case 'spot':
      T.timer -= dt;
      if (T.timer <= 0) tutEnterStep('wire');
      break;
    case 'wire':
      if (G.wires.length - T.baseWires >= T.wiresWanted) tutEnterStep('charge');
      break;
    case 'charge':
      if (T.foe && T.foe.dead) tutEnterStep('flankwarn');
      break;
    case 'flankwarn':
      T.timer -= dt;
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
const TUT3_BX = 270, TUT3_BY = 455;   // the center bunker + gunner

function setupTutorial3(G) {
  const gunner = makeUnit('gunner', TUT3_BX, TUT3_BY);
  gunner.rank = 2;                 // the veteran the player carried through the lessons
  G.units.push(gunner);
  usBunker(G, TUT3_BX, TUT3_BY);
  G.spawnTimer = 9999;             // no endless waves until the script hands off
  // the battle is already joined: a green infantry squad walking into his gun
  const squad = [
    makeEnemy('erifle', TUT3_BX - 60, 268),
    makeEnemy('erifle', TUT3_BX, 258),
    makeEnemy('erifle', TUT3_BX + 60, 268),
  ];
  for (const e of squad) { e.hp = e.maxhp = 24; G.enemies.push(e); }
  G.tutorial = {
    script: 't3',
    step: 'intro',
    timer: 4,
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

const TUT3_ZONE = { x0: 70, y0: 400, x1: 470, y1: 566 };
// the bazooka's own AP damage is left completely real — the lesson is that
// explosives punch through armor. The tutorial tanks carry a little over half a
// real Panzer's HP so a couple of real rockets finish them (they still shrug off
// the first — no paper one-shot), keeping the exchange winnable for a small line
// instead of a full-strength Panzer that out-trades it. They're also pinned on
// this line once they arrive: they menace and shell, but never breach.
const TUT3_TANK_HP = 660;
// hold the tank here once it arrives. Chosen so a bazooka placed at the back of
// the build zone (y ~560) sits just outside the Panzer's 228px cannon reach but
// still inside the bazooka's 243px rocket range: the player can safely stand off
// and answer armor with explosives, exactly the lesson we're teaching.
const TUT3_TANK_HOLD_Y = 330;

function tutEnterStep3(T, step) {
  switch (step) {
    case 'intro':
      T.timer = 4;
      tutSetCam(1.0, W / 2, H / 2);
      setTutorialMsg('Hold the line, soldier. Your gunner has the center — watch his rifle work.');
      break;
    case 'won':
      T.timer = 2.6;
      setTutorialMsg('Bullets tear through infantry in the open — accurate and deadly. Easy work.');
      break;
    case 'flame':
      // a flamethrower charges the gun; heavy HP so he survives the gunner's
      // fire long enough to close the distance and make his point
      T.flame = makeEnemy('eflame', TUT3_BX, 40);
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
      tutSetCam(1.3, TUT3_BX, TUT3_BY - 30);
      setTutorialMsg('Bunkers and sandbags do not protect against fire. Nothing does — flame melts men behind cover or not.');
      T.timer = 5;
      break;
    case 'rebuild':
      G.tp = 30;
      T.baseUnits = tut3UnitCount();
      T.allowBuy = ['rifleman', 'gunner', 'grenadier', 'shotgunner', 'sniper', 'flamer'];
      // free-choice step: guide the player to the UNITS category, but don't
      // spotlight one man — the whole point is that any of them will do
      T.pulseCat = 'units'; T.pulseKey = null;
      T.placeZone = TUT3_ZONE;
      tutSetCam(1.25, W / 2, 470);
      setTutorialMsg('Rebuild your line — spend your requisition on any men you choose. Post at least two, then brace for the next attack.');
      break;
    case 'tank':
      // a Panzer rolls the center, shelling the men below it as it comes. A mild
      // speed bump keeps the approach watchable; it takes real bazooka rockets
      // (a couple) to kill — see TUT3_TANK_HP for why it isn't the full 1200.
      T.tank = makeEnemy('panzer', TUT3_BX, 30);
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
      setTutorialMsg('Bullets just bounce off armor. Explosives do bonus damage — buy bazookas, post them at the back, and pour rockets into that tank.');
      break;
    case 'armorFight':
      if (G.tp < 12) G.tp = 12;               // never leave the player unable to answer armor
      T.allowBuy = ['bazooka'];
      T.pulseCat = 'units'; T.pulseKey = 'bazooka';
      T.placeZone = TUT3_ZONE;
      T.ringTargets = [T.tank];
      setTutorialMsg('Armor-piercing rockets chew through even a Panzer — keep them coming until it burns. Add another bazooka if you have the men.');
      break;
    case 'mixIntro':
      T.timer = 4.5;
      tutSetCam(1.0, W / 2, H / 2);
      setTutorialMsg('Last push, soldier — infantry AND armor, together. Full requisition. Buy the right tool for each threat.');
      break;
    case 'mix': {
      G.tp = 60;
      T.mixFoes = [
        makeEnemy('erifle', TUT3_BX - 100, 60),
        makeEnemy('erifle', TUT3_BX - 40, 48),
        makeEnemy('erifle', TUT3_BX + 40, 48),
        makeEnemy('erifle', TUT3_BX + 100, 60),
      ];
      for (const e of T.mixFoes) { e.hp = e.maxhp = 30; e.tutHold = true; G.enemies.push(e); }
      const tank = makeEnemy('panzer', TUT3_BX, 24);
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
      setTutorialMsg('Riflemen for the infantry, a bazooka for the tank. Post your mix — a bazooka and at least one more — then hold.');
      break;
    }
    case 'mixCharge':
      for (const e of T.mixFoes) e.tutHold = false;   // send the whole force in
      T.allowBuy = ['rifleman', 'gunner', 'grenadier', 'shotgunner', 'sniper', 'flamer', 'bazooka'];
      T.placeZone = TUT3_ZONE;
      setTutorialMsg('Here they come — bullets for the infantry, rockets for the tank. Hold the line!');
      break;
    case 'handoff':
      setTutorialMsg('That is the trade, soldier: bullets for infantry, fire to burn out cover, explosives for armor. Choose the right weapon and the line holds.');
      showBanner('TUTORIAL COMPLETE');
      markLevelComplete(G.level.id);
      T.done = true;
      T.cam.active = false;
      resetViewCam(G.mode);
      T.timer = 4.5;        // let the message breathe before the completion screen
      break;
  }
}

function updateTutorial3(dt, T) {
  // pin any live tutorial tank on the hold line: it still traverses and shells
  // from there, but can never roll off the bottom and breach, so the player has
  // all the time they need to bring explosives to bear (no HP nerf required)
  for (const e of G.enemies) {
    if (!e.dead && e.t.tank && e.y > TUT3_TANK_HOLD_Y) e.y = TUT3_TANK_HOLD_Y;
  }
  switch (T.step) {
    case 'intro':
      T.timer -= dt;
      if (T.timer <= 0 && T.squad.every(e => e.dead)) tutEnterStep('won');
      break;
    case 'won':
      T.timer -= dt;
      if (T.timer <= 0) tutEnterStep('flame');
      break;
    case 'flame':
      // the flamethrower reaching the gunner and melting him is the whole lesson
      if (T.gunner.dead) tutEnterStep('flameLesson');
      break;
    case 'flameLesson':
      T.timer -= dt;
      if (T.timer <= 0) tutEnterStep('rebuild');
      break;
    case 'rebuild':
      if (tut3UnitCount() - T.baseUnits >= 2) tutEnterStep('tank');
      break;
    case 'tank':
      if (T.tank && (T.tank.dead || T.tank.y > H / 2)) tutEnterStep('armorLesson');
      break;
    case 'armorLesson':
      if (T.tank && T.tank.dead) { tutEnterStep('mixIntro'); break; }
      if (tut3HasBazooka()) tutEnterStep('armorFight');
      break;
    case 'armorFight':
      if (!T.tank || T.tank.dead) tutEnterStep('mixIntro');
      break;
    case 'mixIntro':
      T.timer -= dt;
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
  flushTutorialMsg();   // honor each box's minimum on-screen time before the next
  if (T.cam.active) tutCamLerp(dt);
  if (T.done) {
    if (T.step === 'handoff') {
      T.timer -= dt;
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
      T.timer -= dt;
      if (T.timer <= 0) tutEnterStep('select');
      break;
    case 'select':
      if (G.selected.includes(T.rifle)) tutEnterStep('moveToBunker');
      break;
    case 'moveToBunker':
      // spawn the enemy the instant the move-to-bunker order is issued, so he's
      // already closing in by the time our rifleman reaches cover — no dead air
      if (!T.foe && T.rifle.moveTo && dist(T.rifle.moveTo, T.bunker) < 40) {
        T.foe = makeEnemy('erifle', 165, -30);
        G.enemies.push(T.foe);
      }
      if (dist(T.rifle, T.bunker) < 26 && !T.rifle.moveTo) tutEnterStep('fight');
      break;
    case 'fight':
      if (T.foe && T.foe.dead) tutEnterStep('rankup');
      break;
    case 'rankup':
      T.timer -= dt;
      if (T.timer <= 0) tutEnterStep('buyMedic');
      break;
    case 'buyMedic':
      if (placing && placing.key === 'medic') tutEnterStep('placeMedic');
      break;
    case 'placeMedic':
      if (G.units.some(u => u.type === 'medic' && !u.dead)) tutEnterStep('breather');
      break;
    case 'breather':
      T.timer -= dt;
      if (T.timer <= 0) tutEnterStep('zoomOut');
      break;
    case 'zoomOut':
      if (mobileViewActive() || !T.cam.active) {
        T.timer -= dt;
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
