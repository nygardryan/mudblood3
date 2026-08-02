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
  G.units.push(rifle);
  usSandbag(G, 557, tuY(150));
  G.spawnTimer = 9999;   // no waves — this lesson is controls only, no combat
  G.tutorial = {
    script: 't1',
    step: 'welcome',
    timer: 0,        // set from the step's own text on entry (flow.js enters it)
    rifle,
    sandbag: G.sandbags[0],
    buddy: null,      // second rifleman bought in 'buildUnit'; grabbed with `rifle` in 'multiselect'
    moveStart: null,  // rifle's position when 'move' was entered, to prove he actually moved
    baseWires: 0,
    baseShells: 0,
    done: false,
    cam: { active: true, tx: 0, ty: 0, tzoom: 1 },
    // per-step interaction gating (shared by both tutorial scripts)
    allowBuy: [], placeZone: null, pulseCat: null, pulseKey: null, ringTargets: null,
  };
  tutSetCam(2.6, rifle.x, rifle.y, true);
}

// ---- Tutorial 2: the big picture — what this war is, why the TP economy
// exists, and what winning actually means (reach wave 100, kill the boss,
// then choose whether to keep going). The scene still picks up where Tutorial 1
// left off — one sandbag wall, a PFC rifleman, and a medic behind — and the
// original two-threat scaffolding (a flamethrower duel taught with wire, then
// a flank rush answered with sandbags and a defender) survives as the
// hands-on middle act, but it's now bracketed by narration rather than being
// the whole lesson. It opens on sandbags rather than a bunker on purpose: the
// center threat is a flamethrower, and flame bypasses cover entirely
// (flameSpray's burn() calls damageUnit directly, never coverBlock — the
// same rule Lesson 3 states outright: "Bunkers and sandbags do not stop
// fire"), so a bunker here would only be a prop implying a defense that does
// nothing against the one threat in the scene.
function setupTutorial2(G) {
  const BX = 557, BY = tuY(150);   // BX is the sandbags' depth (x), lateral (y)
  const rifle = makeUnit('rifleman', BX + 2, BY);
  rifle.rank = 1;                 // the PFC he earned in Lesson 1
  G.units.push(rifle);
  const medic = makeUnit('medic', BX + 62, BY);   // dug in behind the sandbags
  G.units.push(medic);
  usSandbag(G, BX, BY);
  G.spawnTimer = 9999;            // no endless waves until the script hands off
  G.tutorial = {
    script: 't2',
    step: 'orientation',
    timer: 0,        // set from the step's own text on entry (flow.js enters it)
    rifle,
    medic,
    sandbag: G.sandbags[0],
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
// times a comprehension buffer widened to 1.8x (was 1.4x) after playtest
// feedback that boxes were disappearing before a first-time reader finished
// them — a tutorial box competes with the player's attention on the field
// itself in a way ordinary subtitles don't. Floored at 4s (was 3s) so even a
// two-word box survives a glance away, capped at 15s (was Material's snackbar
// max of 10s — deliberately exceeded here, since these are instructional
// panels a player is meant to finish reading, not a transient toast).
const TUT_READ_MIN = 4;
const TUT_READ_MAX = 15;
function tutReadTime(text) {
  if (!text) return 0;   // a blank box has no minimum
  const words = text.trim().split(/\s+/).length;
  return clamp(0.4 + (words / 3.5) * 1.8, TUT_READ_MIN, TUT_READ_MAX);
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
      setTutorialMsg(mobileViewActive()
        ? 'Tap your rifleman to select him.'
        : 'Click on your rifleman to select him.');
      break;
    case 'move':
      T.moveStart = { x: T.rifle.x, y: T.rifle.y };
      tutSetCam(1.3, T.rifle.x, T.rifle.y);
      setTutorialMsg(mobileViewActive()
        ? 'Now tap anywhere on the field to move him there.'
        : 'Now click anywhere on the field to move him there.');
      break;
    case 'deselect':
      setTutorialMsg(mobileViewActive()
        ? 'Your rifleman is still selected, and the shop hides while anyone is — tap DESELECT to clear him.'
        : 'Your rifleman is still selected, and the shop hides while anyone is — press Escape (or click BACK) to deselect him.');
      // the collapsed-for-selection bar/button was already up before this step
      // became active, so it needs a forced refresh to pick up the new pulse
      renderToolbar();
      syncMobileChrome();
      break;
    case 'buildUnit':
      if (G.tp < 3) G.tp = 3;   // exactly enough for a rifleman
      T.allowBuy = ['rifleman']; T.pulseCat = 'units'; T.pulseKey = 'rifleman';
      // 'move' just sent the rifleman to a free-choice spot the player picked,
      // possibly far from his spawn — pull all the way out (zoom 1 = the whole
      // field, and camera clamping pins it there regardless of center) so he
      // and this zone are both guaranteed on screen, whatever he clicked
      tutSetCam(1, W / 2, H / 2);
      // kept clear of the sandbag on purpose: it sits almost dead-center of the
      // OLD zone (28px from center, inside groupMove's 30px capture radius), so
      // a rifleman placed there could already satisfy groupMove's arrival gate
      // before that lesson even starts — this y-range is >45px further from it
      T.placeZone = { x0: 520, y0: tuY(230), x1: 650, y1: tuY(340) };
      setTutorialMsg(mobileViewActive()
        ? 'Open UNITS and tap RIFLEMAN, then tap the field to post a second man.'
        : 'Open the UNITS tab, click RIFLEMAN, then click the field to post a second man.');
      break;
    case 'multiselect':
      // the rifleman just bought in 'buildUnit' is still the active tool (a
      // defense/unit purchase doesn't auto-close the shop) — left alone, every
      // field click here would buy another rifleman instead of selecting one,
      // since place() intercepts canvas clicks ahead of selection whenever
      // something is actively being placed. Unlike buildAbility this isn't a
      // shop-to-shop hop worth teaching — it's just incidental leftover state
      // from an unrelated lesson, so close it silently instead of asking the
      // player to click BACK for no reason connected to selecting units.
      clearPlacing();
      setTutorialMsg(mobileViewActive()
        ? 'Drag a box across both riflemen to select them together — or double-tap one to grab every rifleman you own.'
        : 'Drag a box around both riflemen — or click one, then shift-click the other — to select them together.');
      break;
    case 'groupMove':
      // both units could be almost anywhere by now (rifle from the free-choice
      // 'move', buddy from wherever he was placed in 'buildUnit') — same
      // full-field guarantee as 'buildUnit', so neither can end up off-camera
      tutSetCam(1, W / 2, H / 2);
      setTutorialMsg(mobileViewActive()
        ? 'With both selected, tap the sandbags to move the whole group there together — men in cover dodge some incoming fire.'
        : 'With both selected, click the sandbags to move the whole group there together — men in cover dodge some incoming fire.');
      break;
    case 'deselect2':
      setTutorialMsg(mobileViewActive()
        ? 'Deselect again — tap DESELECT — to bring the shop back.'
        : 'Deselect again — press Escape, or click BACK — to bring the shop back.');
      renderToolbar();
      syncMobileChrome();
      break;
    case 'buildEmplacement':
      if (G.tp < 3) G.tp = 3;
      T.baseWires = G.wires.length;
      T.allowBuy = ['wire']; T.pulseCat = 'emplacements'; T.pulseKey = 'wire';
      // out in no-man's-land, well forward of DEPLOY_X (502) — wire's job is
      // bogging a charge down before it reaches the line, not sitting behind it
      T.placeZone = { x0: 370, y0: tuY(60), x1: 460, y1: tuY(260) };
      tutSetCam(1.4, 415, tuY(160));
      setTutorialMsg(mobileViewActive()
        ? 'Open EMPLACEMENTS and tap WIRE, then tap out in no-man\'s-land to lay it — wire bogs down a charge before it reaches your line.'
        : 'Open the EMPLACEMENTS tab, click WIRE, then click out in no-man\'s-land to lay it — wire bogs down a charge before it reaches your line.');
      break;
    case 'buildAbility':
      if (G.tp < 5) G.tp = 5;
      T.baseShells = G.shells.length;
      T.allowBuy = ['mortar']; T.pulseCat = 'abilities'; T.pulseKey = 'mortar';
      T.placeZone = null;   // mortar's own placementValid range is the only constraint
      // WIRE is still the active tool from the last step (buying a defense
      // doesn't auto-close the shop the way a one-shot support does) — the
      // player has to back out of it before the ABILITIES tab is even visible
      setTutorialMsg(mobileViewActive()
        ? 'Tap BACK twice to leave WIRE and reach the shop tabs, then open ABILITIES and tap MORTAR STRIKE, then tap anywhere on the field to call it in.'
        : 'Click BACK twice to leave WIRE and reach the shop tabs, then open the ABILITIES tab, click MORTAR STRIKE, then click anywhere on the field to call it in.');
      break;
    case 'controls':
      // no combat has happened anywhere in this lesson — "the fight" would be
      // an odd thing to reference before the player has seen one
      tutMsg(T, 'PAUSE freezes everything anytime you need a break; SPEED fast-forwards once the real fighting starts.');
      break;
    case 'zoomOut':
      if (mobileViewActive()) {
        // the full map never fits a phone screen: release the cam and snap to
        // the widest available view. NOT resetViewCam — its normal gameplay
        // default is cover (deliberately MORE zoomed in, to fill the screen),
        // which would defeat the entire point of a step called "zoom out".
        T.cam.active = false;
        tutSetCam(containZoom(), W / 2, H / 2, true);
        tutMsg(T, 'Pinch to zoom, and drag with two fingers to look around the battlefield.');
      } else {
        // no desktop camera gesture exists (fixed zoom, no pan) — nothing to
        // teach, but the view still visibly pulls back, so it still gets a
        // line rather than moving on its own with no explanation
        tutSetCam(1, W / 2, H / 2);
        tutMsg(T, 'Pulling back for a full view of the field before you take command.');
      }
      break;
    case 'handoff':
      // tutMsg sets the timer from the text: the completion screen waits out the
      // handoff's own read time rather than a guessed 4.5s
      tutMsg(T, 'That\'s basic training, soldier — select, move alone or as a group, and build your force. Well done.');
      showBanner('TUTORIAL COMPLETE');
      markLevelComplete(G.level.id);
      T.done = true;
      T.cam.active = false;
      resetViewCam(G.mode);
      break;
  }
}

// ---- Tutorial 2 step machine -------------------------------------------------

function tutEnterStep2(T, step) {
  switch (step) {
    case 'orientation':
      tutMsg(T, "This war has no finish line, Sergeant. There's no ground to take out there — only this trench, and whether it's still yours by nightfall.");
      break;
    case 'mission':
      // pull back off the tight close-up 'orientation' opened on — "no
      // ground to take" should show the whole field, not one man's foxhole
      tutSetCam(1.0, W / 2, H / 2);
      tutMsg(T, "Your only job is to keep this line intact, wave after wave, for as long as you can. There's no capital to burn, no enemy HQ to storm — just the next push, and the one after it.");
      break;
    case 'economy':
      tutMsg(T, "You'll earn Troop Points on your own, every second you hold. Spend them on men, wire, and fire support — shore up your weak points before the next push finds them.");
      break;
    case 'intro':
      tutMsg(T, "First light, Sergeant. Drills are over — let's see if they hold up for real.");
      break;
    case 'spot':
      // reveal the threat: a flamethrower frozen at the top of the center lane
      T.foe = makeEnemy('eflame', 44, tuY(150));
      T.foe.hp = T.foe.maxhp = 60;   // scripted duel: trimmed HP so wire + rifleman can close it out
      // clone t rather than mutate it — e.t is the shared ENEMY_TYPES.eflame
      // record, read by every flamethrower in the game. At his real 40 dps
      // (78 range) a rifleman who eats a bad accuracy streak on the approach
      // can still be caught at flame range with the foe near full HP, and a
      // ~2.5s kill window at 40 dps outright kills a 100hp rifleman — measured
      // a 10% rifleman-death rate over 20 scripted trials of the real duel,
      // which breaks the "must win reliably" promise this scene depends on.
      // Halving it keeps the burn a visible, felt threat without the coin-flip.
      T.foe.t = Object.assign({}, T.foe.t, { flame: Object.assign({}, T.foe.t.flame, { dps: 20 }) });
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
    case 'breach':
      tutMsg(T, "That's a wave, Sergeant. They press out of the tree line, and if too many of them reach this trench, the line breaks — that's the only way you lose this war.");
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
      if (G.tp < 13) G.tp = 13;             // two riflemen, or a sniper and a rifleman
      // a sniper's high per-shot damage gets more out of a held position than a
      // gunner's sustained close fire, so it's the flank's suggested second man
      T.allowBuy = ['rifleman', 'sniper']; T.pulseCat = 'units'; T.pulseKey = 'rifleman';
      T.placeZone = { x0: 526, y0: tuY(330), x1: 666, y1: tuY(516) };
      T.ringTargets = T.flankFoes.slice();
      tutSetCam(1.2, 552, tuY(400));
      setTutorialMsg("One man can't hold two fronts. Buy two riflemen and post them both behind that sandbag.");
      break;
    case 'flankcharge':
      for (const e of T.flankFoes) e.tutHold = false;   // send them in
      setTutorialMsg("Hold them! Don't let them break through!");
      break;
    case 'veterancy':
      // the fight just resolved on the flank corner (zoom 1.2, off-center) —
      // pull back out for the debrief the same way 'mission' opened the lesson,
      // so "there's no victory screen" etc. isn't delivered over a tight shot
      // of a sandbag pile
      tutSetCam(1.0, W / 2, H / 2);
      tutMsg(T, "Every man who survives a fight gets sharper. A green private who lives becomes a veteran who outshoots the replacements coming up behind him — protect the ones who've earned it.");
      break;
    case 'pace':
      tutMsg(T, "It doesn't stay this gentle. Every wave hits harder than the last, and every tenth brings something built for the occasion.");
      break;
    case 'boss':
      // deliberately faction-agnostic — outside the tutorials the wave-100
      // threat isn't always a man: a battleship, an armored train, a mass of
      // rotting flesh. "Break it" reads for all four.
      tutMsg(T, "Survive to the hundredth wave, and they send something built to end it outright. Break it, and you've won, Sergeant — this war has an ending, if you can reach it.");
      break;
    case 'goal':
      tutMsg(T, "But nothing says you have to stop there. Break it and the choice is yours — call it a victory, or stay in this trench and see how much further you can push it.");
      break;
    case 'handoff':
      tutMsg(T, "Now you know the shape of this war. Next, you'll learn how to answer everything they throw at you.");
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
    case 'orientation':
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0) tutEnterStep('mission');
      break;
    case 'mission':
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0) tutEnterStep('economy');
      break;
    case 'economy':
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0) tutEnterStep('intro');
      break;
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
      if (T.foe && T.foe.dead) tutEnterStep('breach');
      break;
    case 'breach':
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0) tutEnterStep('flankwarn');
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
      if (T.flankFoes.every(e => e.dead)) tutEnterStep('veterancy');
      break;
    case 'veterancy':
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0) tutEnterStep('pace');
      break;
    case 'pace':
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0) tutEnterStep('boss');
      break;
    case 'boss':
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0) tutEnterStep('goal');
      break;
    case 'goal':
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0) tutEnterStep('handoff');
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
  if (T.rifle.dead) { gameOver(); return; }   // defensive: no enemies exist in this lesson normally
  switch (T.step) {
    case 'welcome':
      T.timer -= tutStepDt(dt);
      if (T.timer <= 0) tutEnterStep('select');
      break;
    case 'select':
      if (G.selected.includes(T.rifle)) tutEnterStep('move');
      break;
    case 'move':
      if (!T.rifle.moveTo && dist(T.rifle, T.moveStart) > 40) tutEnterStep('deselect');
      break;
    case 'deselect':
      if (!G.selected.length) tutEnterStep('buildUnit');
      break;
    case 'buildUnit': {
      const mates = G.units.filter(u => u.type === 'rifleman' && !u.dead);
      if (mates.length >= 2) {
        T.buddy = mates.find(u => u !== T.rifle) || mates[mates.length - 1];
        tutEnterStep('multiselect');
      }
      break;
    }
    case 'multiselect':
      if (G.selected.includes(T.rifle) && T.buddy && G.selected.includes(T.buddy)) tutEnterStep('groupMove');
      break;
    case 'groupMove':
      if (!T.rifle.moveTo && !T.buddy.moveTo && dist(T.rifle, T.sandbag) < 30 && dist(T.buddy, T.sandbag) < 30) tutEnterStep('deselect2');
      break;
    case 'deselect2':
      if (!G.selected.length) tutEnterStep('buildEmplacement');
      break;
    case 'buildEmplacement':
      if (G.wires.length - T.baseWires >= 1) tutEnterStep('buildAbility');
      break;
    case 'buildAbility':
      if (G.shells.length - T.baseShells >= 1) tutEnterStep('controls');
      break;
    case 'controls':
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
