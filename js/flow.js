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

// Copy for the shared boss-victory overlay. All three bosses come through the
// same screen, so the wording has to follow whichever one just fell — the Yamato
// is a ship and the Progenitor is a thing, so calling either "the executioner" or
// "him" would read as a bug. Note the German branch is the FALLTHROUGH: a new
// faction added without a branch here silently claims Der Schlächter's death.
function bossVictoryCopy() {
  if (G && G.enemyFaction === 'zo') {
    return {
      title: 'THE PROGENITOR IS STILL',
      lead: 'The flesh has stopped moving.',
      stats: `Wave ${G.wave} — the mass that birthed the horde lies open and quiet, ` +
        `and the sector is yours. Stand down with the win, or hold the line and meet ` +
        `it again a hundred waves on.`,
      recap: 'You put down the Progenitor',
    };
  }
  if (G && G.enemyFaction === 'it') {
    return {
      title: 'THE TRENO ARMATO IS DERAILED',
      lead: 'The armored train burns on its rails.',
      stats: `Wave ${G.wave} — the armored train burns from engine to rear turret ` +
        `and the sector is yours. Stand down with the win, or hold the line and meet ` +
        `it again a hundred waves on.`,
      recap: 'You derailed the Treno Armato',
    };
  }
  if (G && G.enemyFaction === 'jp') {
    return {
      title: 'THE YAMATO BURNS',
      lead: 'The land battleship is a wreck.',
      stats: `Wave ${G.wave} — the Yamato is burning and the sector is yours. ` +
        `Stand down with the win, or hold the line and meet her again a hundred waves on.`,
      recap: 'You broke the Yamato',
    };
  }
  return {
    title: 'DER SCHLÄCHTER FALLS',
    lead: 'The executioner is down.',
    stats: `Wave ${G.wave} — the executioner is down and the sector is yours. ` +
      `Stand down with the win, or hold the line and meet him again a hundred waves on.`,
    recap: 'You cut down Der Schlächter',
  };
}

// Escalation X (NO SURRENDER): the first kill buys nothing but the right to
// keep going. Wording follows whichever boss just fell, same as the overlay.
function bossNotDoneCopy() {
  if (G && G.enemyFaction === 'zo') return 'THE FLESH IS STILL TWITCHING';
  if (G && G.enemyFaction === 'it') return 'ANOTHER TRAIN IS COMING';
  if (G && G.enemyFaction === 'jp') return 'ANOTHER HULL IS STEAMING IN';
  return 'THEY ARE SENDING ANOTHER';
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
  paused = true;
  clearPlacing();
  drag = null;
  clearViewPan();
  placeTouch = null;
  mobileToolbarMinimized = false;
  G.selected = [];
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
  running = false;
  paused = false;
  placing = null;
  touchInspect = null;
  longPressFoe = null;
  mobileToolbarMinimized = false;
  activePointers.clear();
  viewGesture = null;
  el('pause').classList.add('hidden');
  el('boss-victory').classList.add('hidden');
  el('gameover').classList.add('hidden');
  el('endless-endgame').classList.add('hidden');
  el('recap').classList.add('hidden');
  el('codex').classList.add('hidden');
  el('changelog').classList.add('hidden');
  el('settings').classList.add('hidden');
  el('endless-select').classList.add('hidden');
  el('esc-dossier').classList.add('hidden');
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
    ? [...level.placeables, ...TESTING_GERMAN_PLACEABLES, ...TESTING_JAPANESE_PLACEABLES,
       ...TESTING_ZOMBIE_PLACEABLES, ...TESTING_ITALIAN_PLACEABLES,
       ...TESTING_ABILITIES, ...TESTING_EVENTS]
    : level.placeables;
  buildToolbar(placeables);
  el('intro').classList.add('hidden');
  el('boss-victory').classList.add('hidden');
  el('gameover').classList.add('hidden');
  el('endless-endgame').classList.add('hidden');
  el('recap').classList.add('hidden');
  el('codex').classList.add('hidden');
  el('changelog').classList.add('hidden');
  el('settings').classList.add('hidden');
  el('endless-select').classList.add('hidden');
  el('esc-dossier').classList.add('hidden');
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
