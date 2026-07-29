/* Trenchworks: WW2 — menus & game flow.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

function syncSpeedButton() {
  const btn = el('speed-btn');
  if (!btn) return;
  btn.textContent = gameSpeed + 'x';
}

function cycleSpeed() {
  const idx = SPEED_STEPS.indexOf(gameSpeed);
  gameSpeed = SPEED_STEPS[(idx + 1) % SPEED_STEPS.length];
  syncSpeedButton();
  SFX.click();
}

// Freeze the field under an overlay: stop the sim, then drop every piece of
// in-progress input with it — a half-made placement, a drag, a pinch, the
// selection — because none of it survives the screen the player is about to
// look at, and a placement left armed lands the moment they dismiss it.
function freezeField() {
  paused = true;
  clearPlacing();
  drag = null;
  clearViewPan();
  placeTouch = null;
  mobileToolbarMinimized = false;
  G.selected = [];
}

// Every overlay that owns the whole screen. Menus don't stack, so arriving
// anywhere means clearing all of them — enumerated once, because a screen
// added to only three of the four hide-lists is a screen that reappears
// underneath the next one.
const FULL_SCREEN_OVERLAYS = [
  'pause', 'boss-victory', 'gameover', 'endless-endgame', 'recap', 'codex',
  'changelog', 'settings', 'endless-select', 'esc-dossier', 'leaderboard-select',
  'card-shop', 'tutorial-select', 'loadout-view',
];

function hideOverlays() {
  for (const id of FULL_SCREEN_OVERLAYS) el(id).classList.add('hidden');
}

// Screens reached FROM the pause menu, which they swap out rather than layer
// over. `paused` stays true underneath them, so the Escape ladder's plain
// `if (paused) resumeGame()` would restart the fight behind a screen that is
// still on top of it — the player ends up steering a live game they can't see.
// Each of these has to claim Escape first and hand back to PAUSE.
//
// Written as a list because it kept being got wrong one screen at a time: the
// codex has had this bug since it was reachable from pause, settings has had it
// since it was, and the loadout sheet would have shipped with it. A fourth is
// one row here, not another guard to remember.
//
// The entries are WRAPPED rather than bare references on purpose. These scripts
// share one global scope with no build step, so a bare reference is resolved
// while this file is still evaluating — and a name that isn't there yet (a typo,
// a reordered <script>, a file that failed to load) throws at that point and
// abandons the REST of flow.js. Everything below stays uninitialized while the
// hoisted function declarations keep working, so the game runs and then dies
// later somewhere unrelated: the first symptom of getting this wrong was the
// boss-victory screen failing on BOSS_COPY, 100 lines further down. Wrapped,
// the lookup happens when Escape is pressed and can't take the file with it.
const PAUSE_SUBSCREENS = [
  { open: () => codexOpen(), close: () => closeCodex() },
  { open: () => settingsOpen(), close: () => closeSettings() },
  { open: () => loadoutViewOpen(), close: () => closeLoadoutView() },
];

// close whichever pause sub-screen is up; true if one was. Also correct from the
// main menu, where these are reached from #intro and `paused` is false — they
// return to whichever screen opened them either way.
function closePauseSubscreen() {
  for (const s of PAUSE_SUBSCREENS) {
    if (s.open()) { s.close(); return true; }
  }
  return false;
}

function bossVictoryOpen() {
  return !el('boss-victory').classList.contains('hidden');
}

// leaving a run: no field, no pointer state, nothing half-issued
function clearRunState() {
  running = false;
  paused = false;
  placing = null;
  touchInspect = null;
  longPressFoe = null;
  mobileToolbarMinimized = false;
  activePointers.clear();
  viewGesture = null;
}

function pauseGame() {
  if (!running || !G || G.over || paused) return;
  freezeField();
  // G.cardsOwned is null outside endless, so tutorials have no loadout to show
  el('pause-loadout-btn').classList.toggle('hidden', !(G && G.cardsOwned));
  el('pause').classList.remove('hidden');
  refreshHUD();
}

function resumeGame() {
  if (!paused) return;
  paused = false;
  el('pause').classList.add('hidden');
  lastT = performance.now();
  refreshHUD();
}

// Copy for the shared boss-victory overlay. All four bosses come through the
// same screen, so the wording has to follow whichever one just fell — the Yamato
// is a ship and the Progenitor is a thing, so calling either "the executioner" or
// "him" would read as a bug. The stats line is one sentence in four dialects:
// what fell, and what pronoun it takes when it comes back.
//
// Note 'de' is the FALLTHROUGH: a faction added without an entry here silently
// claims Der Schlächter's death, so a fifth army needs a row in this table.
const BOSS_COPY = {
  de: {
    title: 'DER SCHLÄCHTER FALLS',
    lead: 'The executioner is down.',
    fallen: 'the executioner is down',
    them: 'him',
    recap: 'You cut down Der Schlächter',
    notDone: 'THEY ARE SENDING ANOTHER',
  },
  jp: {
    title: 'THE YAMATO BURNS',
    lead: 'The land battleship is a wreck.',
    fallen: 'the Yamato is burning',
    them: 'her',
    recap: 'You broke the Yamato',
    notDone: 'ANOTHER HULL IS STEAMING IN',
  },
  zo: {
    title: 'THE PROGENITOR IS STILL',
    lead: 'The flesh has stopped moving.',
    fallen: 'the mass that birthed the horde lies open and quiet,',
    them: 'it',
    recap: 'You put down the Progenitor',
    notDone: 'THE FLESH IS STILL TWITCHING',
  },
  it: {
    title: 'THE TRENO ARMATO IS DERAILED',
    lead: 'The armored train burns on its rails.',
    fallen: 'the armored train burns from engine to tail gun',
    them: 'it',
    recap: 'You derailed the Treno Armato',
    notDone: 'ANOTHER TRAIN IS COMING',
  },
};

function bossCopy() {
  return (G && BOSS_COPY[G.enemyFaction]) || BOSS_COPY.de;
}

function bossVictoryCopy() {
  const c = bossCopy();
  return Object.assign({}, c, {
    stats: `Wave ${G.wave} — ${c.fallen} and the sector is yours. ` +
      `Stand down with the win, or hold the line and meet ${c.them} again a hundred waves on.`,
  });
}

// Escalation X (NO SURRENDER): the first kill buys nothing but the right to
// keep going. Wording follows whichever boss just fell, same as the overlay.
function bossNotDoneCopy() {
  return bossCopy().notDone;
}

// the boss is down: freeze the field and offer the choice — take the win now
// (full recap flow, marked victorious) or fight on, in which case the run
// continues and the boss returns at the next hundredth wave
function bossVictory() {
  if (!running || !G || G.over) return;
  // Escalation X wants him down twice. Below the quota the run does NOT pause
  // and no overlay opens — a banner, and the field keeps moving.
  G.bossKills = (G.bossKills || 0) + 1;
  if (G.esc && G.bossKills < G.esc.bossKills) {
    showBanner(bossNotDoneCopy());
    return;
  }
  // the rung is earned here, gated on the same predicate medals use: a real
  // endless run, never sandbox or testing, so the boss can't be farmed for
  // rungs with unlimited TP. unlockEscalation() takes a max(), which is what
  // makes the wave-200/300 re-entry harmless.
  if (medalsEligible() && G.esc) unlockEscalation(G.esc.level + 1);
  freezeField();
  const copy = bossVictoryCopy();
  el('boss-victory-title').textContent = copy.title;
  el('boss-victory-stats').textContent = copy.stats;
  el('boss-victory').classList.remove('hidden');
  refreshHUD();
}

function bossFightOn() {
  el('boss-victory').classList.add('hidden');
  paused = false;
  lastT = performance.now();
  SFX.click();
  refreshHUD();
}

function bossEndRun() {
  el('boss-victory').classList.add('hidden');
  paused = false;
  const t = Math.floor(G.time);
  const diffPrefix = `${runPostureLabel()} — `;
  let stats = `${diffPrefix}${bossVictoryCopy().recap} and held for ${G.wave} waves ` +
    `and ${t} seconds. ${G.kills} ${factionPlural()} will not go home.`;
  if (G.medalsEarned > 0) {
    stats += ` +${G.medalsEarned} medal${G.medalsEarned === 1 ? '' : 's'} earned — ` +
      `${loadEndlessCards().medals} banked for the card shop.`;
  }
  endRun(true, 'SECTOR HELD', stats);
}

function returnToMenu() {
  clearRunState();
  clearField();   // the menu layers over the stage — don't leave a board behind it
  hideOverlays();
  el('intro').classList.remove('hidden');
  hideTutorialMsg();
  clearBanner();
  syncMobileViewUI();
  syncMobileChrome();
}

function openEndlessSelect() {
  el('intro').classList.add('hidden');
  buildEscalationUI();   // rebuild from the save: a boss kill may have unlocked a rung
  el('endless-select').classList.remove('hidden');
}

function closeEndlessSelect() {
  el('endless-select').classList.add('hidden');
  el('intro').classList.remove('hidden');
}

// the tutorial lessons, in order — beat each to unlock the next
const TUTORIAL_CAMPAIGN = ['tutorial1', 'tutorial2', 'tutorial3'];

function campaignForLevel(id) {
  if (TUTORIAL_CAMPAIGN.includes(id)) return TUTORIAL_CAMPAIGN;
  return null;
}

function getNextMissionId(id) {
  const campaign = campaignForLevel(id);
  if (!campaign) return null;
  const idx = campaign.indexOf(id);
  if (idx < 0 || idx >= campaign.length - 1) return null;
  return campaign[idx + 1];
}

function buildCampaignSelect(listId, campaignIds, onSelect) {
  const list = el(listId);
  if (!list) return;
  const launch = onSelect || startGame;
  list.replaceChildren();
  for (const id of campaignIds) {
    const lv = LEVELS[id];
    if (!lv) continue;
    const complete = isLevelComplete(id);
    const unlocked = isLevelUnlocked(id, campaignIds);
    const btn = document.createElement('button');
    if (!unlocked) {
      btn.disabled = true;
      btn.classList.add('locked');
    }
    if (complete) btn.classList.add('cleared');
    const title = document.createElement('span');
    title.className = 'mode-title';
    title.textContent = lv.menuName || lv.name;
    if (complete) {
      const badge = document.createElement('span');
      badge.className = 'cleared-badge';
      badge.textContent = 'CLEARED';
      title.appendChild(badge);
    }
    const desc = document.createElement('span');
    desc.className = 'mode-desc';
    desc.textContent = unlocked
      ? (lv.menuDesc || lv.briefing || '')
      : 'Locked — beat the previous level.';
    btn.appendChild(title);
    btn.appendChild(desc);
    if (unlocked) btn.addEventListener('click', () => launch(id));
    list.appendChild(btn);
  }
}

function buildTutorialSelect() {
  buildCampaignSelect('tutorial-list', TUTORIAL_CAMPAIGN);
}

function openTutorialSelect() {
  buildTutorialSelect();
  el('intro').classList.add('hidden');
  el('tutorial-select').classList.remove('hidden');
}

function closeTutorialSelect() {
  el('tutorial-select').classList.add('hidden');
  el('intro').classList.remove('hidden');
}

// a lesson is cleared: stop the game and show the completion screen instead of
// rolling into an endless defense
function finishTutorial() {
  running = false;
  paused = false;
  placing = null;
  hideTutorialMsg();
  const nextId = G ? getNextMissionId(G.level.id) : null;
  const nextLevel = nextId ? LEVELS[nextId] : null;
  const textEl = el('tutorial-complete-text');
  if (textEl) {
    textEl.textContent = nextLevel
      ? `Lesson cleared. ${nextLevel.menuName || nextLevel.name} is now unlocked.`
      : "Lesson cleared. You've finished every lesson available — you're ready for the real thing.";
  }
  el('pause').classList.add('hidden');
  el('gameover').classList.add('hidden');
  el('endless-endgame').classList.add('hidden');
  el('tutorial-complete').classList.remove('hidden');
  syncToolbarVisibility();
  syncMobileChrome();
}

// the completion screen's button: drop straight back into the lesson picker
function backToTutorialSelect() {
  clearRunState();
  clearField();
  el('tutorial-complete').classList.add('hidden');
  hideTutorialMsg();
  clearBanner();
  syncToolbarVisibility();
  syncMobileChrome();
  openTutorialSelect();
}

function startGame(levelId, difficultyId) {
  const level = LEVELS[levelId] || LEVELS.endless;
  const difficulty = ENDLESS_DIFFICULTIES[difficultyId] || ENDLESS_DIFFICULTIES.easy;
  SFX.resume();
  clearGhostBufCache();   // loadout/cards can change a ghost's silhouette between games
  newGame(level, difficulty);
  if (G.tutorial) {
    // each script names its opening focus differently; setup() already framed
    // the scene, so just re-snap onto whatever hero unit it exposes
    const hero = G.tutorial.rifle || G.tutorial.gunner || G.tutorial.bunker;
    if (hero) tutSetCam(2.6, hero.x, hero.y, true);
  } else resetViewCam(level.mode);
  placing = null;
  mobileToolbarMinimized = false;
  running = true;
  paused = false;
  gameSpeed = 1;
  syncSpeedButton();
  const placeables = difficulty && difficulty.testing
    ? [...level.placeables, ...TESTING_GERMAN_PLACEABLES, ...TESTING_JAPANESE_PLACEABLES,
       ...TESTING_ZOMBIE_PLACEABLES, ...TESTING_ITALIAN_PLACEABLES,
       ...TESTING_ABILITIES, ...TESTING_EVENTS]
    : level.placeables;
  buildToolbar(placeables);
  el('intro').classList.add('hidden');
  hideOverlays();
  hideTutorialMsg();   // clear any queued messages from a previous run
  clearBanner();       // and the previous run's last alert, still frozen on screen
  if (G.tutorial) tutEnterStep(G.tutorial.step);   // enter each script's opening step
  syncMobileViewUI();
  syncMobileChrome();
  const viewHint = mobileViewActive()
    ? ' Drag to pan; double-tap to zoom; pinch to zoom. Hold to cancel placement.'
    : '';
  el('tipbar').textContent = (difficulty && difficulty.testing
    ? touchUI()
      ? 'Testing: unlimited TP, no enemies spawn on their own. Open any enemy roster — GERMANS, JAPANESE, HORDE, ITALIAN — to place units, or EVENTS to summon one on demand.'
      : 'Testing: unlimited TP, no enemies spawn on their own. Open any enemy roster — GERMANS, JAPANESE, HORDE, ITALIAN — to place units, or EVENTS to summon one on demand; right-click / Esc cancels placement.'
    : difficulty && difficulty.sandbox
      ? touchUI()
        ? 'Sandbox: unlimited TP. Use +1 / +5 / +10 in the HUD to jump ahead in waves.'
        : 'Sandbox: unlimited TP. ] / Shift+] / Ctrl+] jump ahead 1 / 5 / 10 waves, or use the HUD buttons.'
      : touchUI()
        ? 'Tap a soldier to select him, tap ground to move. Open Units, Abilities, or Emplacements to deploy. Back returns to the list; tap the item again to cancel.'
        : 'Left-click a soldier to select him, click ground to move. Open Units, Abilities, or Emplacements to deploy. Right-click / Esc cancels placement.') + viewHint;
  if (level.tutorial) el('tipbar').textContent = '';
  lastT = performance.now();
  refreshHUD();
}
