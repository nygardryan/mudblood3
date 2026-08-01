/* Trenchworks: WW2 — ATTRACT MODE: the live demo behind the main menu.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html.

   ---------------------------------------------------------------------------
   HOW TO DELETE THIS FEATURE
   ---------------------------------------------------------------------------
   It is built to be reversible, because "a game playing itself behind the menu"
   is a thing you only know is right once you have looked at it for a week.
   Everything it needs from the rest of the codebase is SIX call sites, each one
   tagged `// ATTRACT`, and every one of them is a single statement:

     index.html   the <script> tag for this file
     js/main.js   the `attracting` branch in frame(), and startAttract() at boot
     js/flow.js   startAttract() at the end of returnToMenu(), stopAttract() at
                  the top of enterField()
     js/cards.js  `&& !attractRunning()` in medalsEligible()
     js/update.js the early-out at the top of endRun()

   Delete this file, those six, and put `#intro` back in the opaque-menu list in
   css/style.css (the demo is the only reason the menu became see-through). No
   other file knows the feature exists.

   ---------------------------------------------------------------------------
   WHY IT IS NOT A RUN
   ---------------------------------------------------------------------------
   The demo drives the REAL sim — same update(), same draw(), same waves — but it
   deliberately never sets `running`. That one restraint is what makes the whole
   thing cheap: `isPlaying()` is `running && G && !G.over && !paused`, and the
   HUD, the toolbar, the tipbar, the speed and pause buttons, every canvas
   handler and every hotkey already gate on it. So none of them needed a guard,
   and none of them can be forgotten later. The frame loop runs this instead of
   the `playing` branch, and that is the only place `running` is worked around.

   What it CANNOT be allowed to do is touch anything the player owns. The sim it
   runs is a real endless run and will happily hit wave 10, bank a medal, put a
   boss down, take a leaderboard score and — the one that actually costs
   something — reach endRun(), which deletes the single-slot run save. Three
   guards cover all of it, and two of them are one predicate:

     medalsEligible()  excludes the demo, and IT is already the gate on medals
                       (awardWaveMedals), on the ESCALATION rung unlock
                       (bossVictory) and on recording a score
                       (updateGameOverLeaderboard). One line, three hazards.
     endRun()          early-outs into restartAttract() ABOVE its clearRunSave()
     bossVictory()     early-outs, so a demo boss can't freeze the board under an
                       overlay the player never asked for

   Nothing here writes localStorage, and that is the invariant to preserve: if a
   new demo behaviour ever needs to, it is wrong. */
'use strict';

// the demo owns G while this is true. It is NOT `running` — see the header.
let attractOn = false;
let attractSpendT = 0;

// how often the autoplayer goes shopping. Slow on purpose: the demo should look
// like a defence being built up, not like a board being conjured.
const ATTRACT_SPEND_INTERVAL = 4;
// the run is torn down and restarted this long after it collapses, so the menu
// never sits on a dead field
const ATTRACT_RESTART_DELAY = 2.5;
let attractDeadT = 0;

function attractRunning() {
  return attractOn;
}

// The demo is only worth stepping while the menu is actually the thing on
// screen. Every other menu screen (card shop, codex, settings, leaderboards) is
// opaque, so a frame spent simulating under one buys nothing — and the dossier,
// which is NOT opaque, covers the stage anyway.
//
// The class test is how "the menu is up" is asked, and the DEMO PITCH
// (js/demo.js) is the one screen it cannot see: it is opaque like the list
// above, but it LAYERS over #intro instead of swapping it out, hiding it with
// `visibility` from CSS rather than the class. So it read as "the menu is up"
// and every demo launch ran the full sim AND a full draw() behind a page
// nobody could see through, for as long as it took to read two screens of it —
// the first thing a demo does, on the platform (a phone) that can least afford
// it. Asked explicitly, since visibility is not something this predicate can
// derive without a per-frame getComputedStyle.
function attractStepping() {
  if (demoPitchOpen()) return false;
  return attractOn && !el('intro').classList.contains('hidden');
}

// The demo's build order. Deliberately a flat wish list walked top to bottom
// rather than anything clever: it is spent against whatever TP has accumulated,
// so the shape of the defence emerges from the income curve the same way a
// player's does. Positions are jittered so two restarts don't lay the same
// board down twice.
function attractWishlist() {
  const w = G.wave;
  const list = [];
  const push = (key, x, y) => list.push({ key, x: x + rand(-14, 14), y: y + rand(-10, 10) });

  // a line of riflemen first, then the automatics that hold it. Positions past
  // the forward line are hardcoded rather than DEPLOY_X-relative, so they carry
  // the SAME running total offset DEPLOY_X itself has accumulated across every
  // rebalance (currently +122, 380 -> 502 — see the note on it in
  // constants.js) — placementMinX would otherwise strand every one of these
  // short of the deploy zone and silently reshuffle them via the radial fallback.
  push('rifleman', 592, ly(-90));
  push('rifleman', 592, ly(90));
  push('sandbags', 552, ly(-70));
  push('sandbags', 552, ly(70));
  if (w >= 2) push('gunner', 584, ly(0));
  if (w >= 3) push('rifleman', 608, ly(0));
  if (w >= 4) push('medic', 622, ly(-30));
  if (w >= 5) push('wire', FORWARD_X + 60, ly(-60));
  if (w >= 5) push('wire', FORWARD_X + 60, ly(60));
  if (w >= 6) push('gunner', 584, ly(-110));
  if (w >= 7) push('mine', FORWARD_X + 40, ly(0));
  if (w >= 8) push('officer', 627, ly(20));
  if (w >= 9) push('bunker', 542, ly(-40));
  if (w >= 11) push('grenadier', 592, ly(40));
  if (w >= 13) push('bazooka', 600, ly(-20));
  if (w >= 15) push('watchtower', 552, ly(110));
  if (w >= 17) push('mortarman', 622, ly(70));
  if (w >= 20) push('sherman', 562, ly(0));
  if (w >= 24) push('atgun', 562, ly(-120));
  // past the scripted opening it just keeps reinforcing — the demo is a
  // background, so it never has to win
  if (w >= 26) {
    push('rifleman', 592, ly(rand(-130, 130)));
    push('sandbags', 550, ly(rand(-120, 120)));
    if (w % 3 === 0) push('gunner', 582, ly(rand(-110, 110)));
  }
  return list;
}

// One shopping pass. This does NOT go through place() (js/input.js): that path
// plays a click and buzzes the phone on every purchase, which on a menu that
// buys something every few seconds is a rattle with no player behind it. It
// takes the two halves place() is made of instead — the affordability check and
// applyPlacement(), the game's own creation switch — so the demo can never
// create a unit differently from the way a real purchase does.
function attractSpendPass() {
  for (const order of attractWishlist()) {
    // demo: eight of the orders above name types this build doesn't sell, and
    // each is FOLDED onto the nearest thing it does (demoStandIn, js/demo.js)
    // rather than skipped. Skipping is what shipped, and it does not merely
    // field a thinner line: the dropped orders are the ones the income curve was
    // sized against, so the TP piles up unspent and the board collapses — on the
    // first thing a demo player looks at. The POSITION is the wish list's whole
    // content, so a fold keeps it. Returns the key unchanged in the full game.
    const key = demoStandIn(order.key);
    const p = key && PLACEABLES.find(pl => pl.key === key);
    if (!p) continue;
    const cost = placeableCost(p);
    if (!canAffordTP(cost)) return;   // the rest of the list is dearer or equal
    if (!placementValid(p, order.x, order.y)) continue;
    if (p.key === 'officer' && officerCount() >= officerLimit()) continue;
    spendTP(cost);
    applyPlacement(p, order.x, order.y);
  }
}

function startAttract() {
  if (attractOn) return;
  // the demo runs at whatever rung the player is set to, so the board behind the
  // menu is the board the PLAY button is offering
  newGame(LEVELS.endless, ENDLESS_DIFFICULTIES.easy);
  resetViewCam(G.mode);
  // no pointer is over the field — the menu is on top of it — so make sure a
  // previous run's hover state doesn't leave an inspector ring on the demo
  mouse.inside = false;
  G.selected = [];
  attractOn = true;
  attractSpendT = 0;
  attractDeadT = 0;
}

function stopAttract() {
  attractOn = false;
  attractDeadT = 0;
}

// the collapse path: endRun() hands here instead of running (see the header), so
// the demo folds and stands a fresh one up rather than dropping the menu onto a
// results screen
function restartAttract() {
  attractDeadT = ATTRACT_RESTART_DELAY;
}

function stepAttract(dt) {
  // the fold-and-restart timer. G.over is never set — endRun early-outs above
  // it — so this is the only thing that ends a demo run.
  if (attractDeadT > 0) {
    attractDeadT -= dt;
    if (attractDeadT <= 0) {
      attractOn = false;   // startAttract() no-ops while the flag is up
      startAttract();
    }
    return;
  }
  attractSpendT -= dt;
  if (attractSpendT <= 0) {
    attractSpendT = ATTRACT_SPEND_INTERVAL;
    attractSpendPass();
  }
  update(dt);
}
