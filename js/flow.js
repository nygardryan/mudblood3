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

function pauseGame() {
  if (!running || !G || G.over || paused) return;
  paused = true;
  clearPlacing();
  drag = null;
  clearViewPan();
  placeTouch = null;
  mobileToolbarMinimized = false;
  G.selected = [];
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

function returnToMenu() {
  running = false;
  paused = false;
  placing = null;
  touchInspect = null;
  longPressFoe = null;
  mobileToolbarMinimized = false;
  activePointers.clear();
  viewGesture = null;
  el('pause').classList.add('hidden');
  el('gameover').classList.add('hidden');
  el('endless-endgame').classList.add('hidden');
  el('recap').classList.add('hidden');
  el('codex').classList.add('hidden');
  el('changelog').classList.add('hidden');
  el('settings').classList.add('hidden');
  el('endless-select').classList.add('hidden');
  el('leaderboard-select').classList.add('hidden');
  el('card-shop').classList.add('hidden');
  el('tutorial-select').classList.add('hidden');
  el('intro').classList.remove('hidden');
  hideTutorialMsg();
  syncMobileViewUI();
  syncMobileChrome();
}

function openEndlessSelect() {
  el('intro').classList.add('hidden');
  syncCardShopButton();
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
  running = false;
  paused = false;
  placing = null;
  touchInspect = null;
  longPressFoe = null;
  mobileToolbarMinimized = false;
  activePointers.clear();
  el('tutorial-complete').classList.add('hidden');
  hideTutorialMsg();
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
    ? [...level.placeables, ...TESTING_GERMAN_PLACEABLES, ...TESTING_JAPANESE_PLACEABLES, ...TESTING_ABILITIES, ...TESTING_EVENTS]
    : level.placeables;
  buildToolbar(placeables);
  el('intro').classList.add('hidden');
  el('gameover').classList.add('hidden');
  el('endless-endgame').classList.add('hidden');
  el('recap').classList.add('hidden');
  el('codex').classList.add('hidden');
  el('changelog').classList.add('hidden');
  el('settings').classList.add('hidden');
  el('endless-select').classList.add('hidden');
  el('leaderboard-select').classList.add('hidden');
  el('card-shop').classList.add('hidden');
  el('tutorial-select').classList.add('hidden');
  el('pause').classList.add('hidden');
  hideTutorialMsg();   // clear any queued messages from a previous run
  if (G.tutorial) tutEnterStep(G.tutorial.step);   // enter each script's opening step
  syncMobileViewUI();
  syncMobileChrome();
  const viewHint = mobileViewActive()
    ? ' Drag to pan; double-tap to zoom; pinch to zoom. Hold to cancel placement.'
    : '';
  el('tipbar').textContent = (difficulty && difficulty.testing
    ? touchUI()
      ? 'Testing: unlimited TP, no enemies spawn on their own. Open GERMANS or JAPANESE to place enemy units, or EVENTS to summon one on demand.'
      : 'Testing: unlimited TP, no enemies spawn on their own. Open GERMANS or JAPANESE to place enemy units, or EVENTS to summon one on demand; right-click / Esc cancels placement.'
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
