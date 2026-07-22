/* Trenchworks: WW2 — menus, briefings & game flow.
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
  pendingAxisLevelId = null;
  pendingAlliedLevelId = null;
  el('pause').classList.add('hidden');
  el('gameover').classList.add('hidden');
  el('codex').classList.add('hidden');
  el('changelog').classList.add('hidden');
  el('settings').classList.add('hidden');
  el('endless-select').classList.add('hidden');
  el('leaderboard-select').classList.add('hidden');
  el('card-shop').classList.add('hidden');
  el('allied-select').classList.add('hidden');
  el('allied-briefing').classList.add('hidden');
  el('axis-select').classList.add('hidden');
  el('axis-briefing').classList.add('hidden');
  el('axis-research').classList.add('hidden');
  el('commando-select').classList.add('hidden');
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

// the Axis campaign, in order — beat each level to unlock the next
const AXIS_CAMPAIGN = [
  'axis1', 'axis2', 'axis3', 'axis4', 'axis5', 'axis6', 'axis7',
  'axis8', 'axis9', 'axis10', 'axis11', 'axis12', 'axis13',
];

const ALLIED_CAMPAIGN = [
  'allied_dday', 'allied_carentan', 'allied_cobra',
  'allied_market', 'allied_hurtgen', 'allied_bulge',
];

const COMMANDO_CAMPAIGN = ['hitsquad'];

const TUTORIAL_CAMPAIGN = ['tutorial1', 'tutorial2', 'tutorial3'];

let pendingAxisLevelId = null;
let pendingAlliedLevelId = null;

function newResearchAtLevel(levelNum) {
  const out = [];
  for (const [key, tier] of Object.entries(AXIS_RESEARCH_TIERS)) {
    if (tier === levelNum) {
      out.push({
        key,
        name: AXIS_RESEARCH_LABELS[key] || key,
        cost: axisResearchCost(key),
      });
    }
  }
  return out;
}

function buildAxisBriefingStats(level) {
  return {
    waves: assaultWaves(level),
    winBreaches: level.winBreaches,
  };
}

function openAlliedBriefing(levelId) {
  const level = LEVELS[levelId];
  if (!level) return;
  pendingAlliedLevelId = levelId;
  const titleEl = el('allied-briefing-title');
  titleEl.textContent = level.menuName || level.name;
  const histEl = el('allied-briefing-history');
  if (histEl) histEl.textContent = level.history || '';
  el('allied-briefing-text').textContent = level.briefing || '';
  const objList = el('allied-briefing-objectives');
  objList.replaceChildren();
  if (level.mode === 'assault') {
    const stats = buildAxisBriefingStats(level);
    appendBriefingObjective(objList, 'Waves: ' + stats.waves + ' assault waves');
    appendBriefingObjective(objList,
      'Objective: ' + stats.winBreaches + ' breakthroughs past the bottom edge, or wipe every defender');
    appendBriefingObjective(objList,
      'Budget: Fresh TP each wave — spend it or lose it');
    if (level.landingCraft) {
      appendBriefingObjective(objList,
        'Rules: Deploy only on landing craft decks, then START WAVE. Craft motor ashore, ramps drop, Germans open fire.');
    } else {
      appendBriefingObjective(objList,
        'Rules: Deploy in the top strip, then START WAVE. Defenders persist.');
    }
  } else {
    appendBriefingObjective(objList, 'Waves: ' + level.waves.length + ' German assault waves');
    appendBriefingObjective(objList,
      'Objective: Survive all waves. ' + level.breachLimit + ' breaches and the sector falls.');
    appendBriefingObjective(objList,
      'Rules: Deploy behind the trench line. Earn TP from kills and spend freely.');
  }
  el('intro').classList.add('hidden');
  el('allied-select').classList.add('hidden');
  el('gameover').classList.add('hidden');
  el('allied-briefing').classList.remove('hidden');
}

function closeAlliedBriefing() {
  pendingAlliedLevelId = null;
  el('allied-briefing').classList.add('hidden');
  buildAlliedSelect();
  el('allied-select').classList.remove('hidden');
}

function deployAlliedBriefing() {
  const id = pendingAlliedLevelId;
  pendingAlliedLevelId = null;
  if (id) startGame(id);
}

function appendBriefingObjective(list, text) {
  const colon = text.indexOf(':');
  const li = document.createElement('li');
  if (colon >= 0) {
    li.innerHTML = '<b>' + text.slice(0, colon + 1) + '</b>' + text.slice(colon + 1);
  } else {
    li.textContent = text;
  }
  list.appendChild(li);
}

function openAxisBriefing(levelId) {
  const level = LEVELS[levelId];
  if (!level) return;
  pendingAxisLevelId = levelId;
  const stats = buildAxisBriefingStats(level);
  const titleEl = el('axis-briefing-title');
  titleEl.textContent = level.menuName || level.name;
  titleEl.classList.remove('briefing-themed');
  const histEl = el('axis-briefing-history');
  if (histEl) histEl.textContent = level.history || '';
  el('axis-briefing-text').textContent = level.briefing || '';
  const objList = el('axis-briefing-objectives');
  objList.replaceChildren();
  const research = loadAxisResearch();
  appendBriefingObjective(objList, 'Research: ' + research.rp + ' RP banked · ' +
    research.unlocked.length + ' unit types unlocked');
  appendBriefingObjective(objList, 'Waves: ' + stats.waves + ' assault waves');
  appendBriefingObjective(objList,
    'Objective: ' + stats.winBreaches + ' breakthroughs past the bottom edge, or wipe every defender');
  appendBriefingObjective(objList,
    'Budget: Fresh TP each wave — spend it or lose it');
  appendBriefingObjective(objList,
    'Rules: Deploy in the top strip, then START WAVE. Defenders persist.');
  const levelNum = axisLevelNum(levelId);
  for (const item of newResearchAtLevel(levelNum)) {
    appendBriefingObjective(objList,
      'New in research: ' + item.name + ' (' + item.cost + ' RP)');
  }
  syncAxisRPDisplays();
  el('intro').classList.add('hidden');
  el('axis-select').classList.add('hidden');
  el('axis-research').classList.add('hidden');
  el('gameover').classList.add('hidden');
  el('axis-briefing').classList.remove('hidden');
}

function closeAxisBriefing() {
  pendingAxisLevelId = null;
  el('axis-briefing').classList.add('hidden');
  buildAxisSelect();
  el('axis-select').classList.remove('hidden');
}

function deployAxisBriefing() {
  const id = pendingAxisLevelId;
  pendingAxisLevelId = null;
  if (id) startGame(id);
}

function campaignForLevel(id) {
  if (ALLIED_CAMPAIGN.includes(id)) return ALLIED_CAMPAIGN;
  if (AXIS_CAMPAIGN.includes(id)) return AXIS_CAMPAIGN;
  if (COMMANDO_CAMPAIGN.includes(id)) return COMMANDO_CAMPAIGN;
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

function buildAlliedSelect() {
  buildCampaignSelect('allied-list', ALLIED_CAMPAIGN, openAlliedBriefing);
}

function buildAxisSelect() {
  buildCampaignSelect('axis-list', AXIS_CAMPAIGN, openAxisBriefing);
}

function buildCommandoSelect() {
  buildCampaignSelect('commando-list', COMMANDO_CAMPAIGN);
}

function buildTutorialSelect() {
  buildCampaignSelect('tutorial-list', TUTORIAL_CAMPAIGN);
}

function openAlliedSelect() {
  buildAlliedSelect();
  el('intro').classList.add('hidden');
  el('axis-select').classList.add('hidden');
  el('commando-select').classList.add('hidden');
  el('allied-briefing').classList.add('hidden');
  el('allied-select').classList.remove('hidden');
}

function closeAlliedSelect() {
  el('allied-select').classList.add('hidden');
  el('intro').classList.remove('hidden');
}

function openAxisSelect() {
  loadAxisResearch();
  buildAxisSelect();
  syncAxisRPDisplays();
  el('intro').classList.add('hidden');
  el('commando-select').classList.add('hidden');
  el('allied-select').classList.add('hidden');
  el('allied-briefing').classList.add('hidden');
  el('axis-research').classList.add('hidden');
  el('axis-briefing').classList.add('hidden');
  el('axis-select').classList.remove('hidden');
}

function closeAxisSelect() {
  el('axis-select').classList.add('hidden');
  el('intro').classList.remove('hidden');
}

function openCommandoSelect() {
  buildCommandoSelect();
  el('intro').classList.add('hidden');
  el('axis-select').classList.add('hidden');
  el('allied-select').classList.add('hidden');
  el('allied-briefing').classList.add('hidden');
  el('commando-select').classList.remove('hidden');
}

function closeCommandoSelect() {
  el('commando-select').classList.add('hidden');
  el('intro').classList.remove('hidden');
}

function openTutorialSelect() {
  buildTutorialSelect();
  el('intro').classList.add('hidden');
  el('axis-select').classList.add('hidden');
  el('allied-select').classList.add('hidden');
  el('allied-briefing').classList.add('hidden');
  el('commando-select').classList.add('hidden');
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
  const difficulty = level.mode === 'endless'
    ? (ENDLESS_DIFFICULTIES[difficultyId] || ENDLESS_DIFFICULTIES.easy)
    : null;
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
  const placeables = level.mode === 'axis'
    ? axisPlaceablesForResearch()
    : (level.mode === 'assault' ? (level.placeables || ASSAULT_PLACEABLES)
      : (difficulty && difficulty.testing
        ? [...level.placeables, ...TESTING_GERMAN_PLACEABLES, ...TESTING_ABILITIES, ...TESTING_EVENTS]
        : level.placeables));
  buildToolbar(placeables);
  el('intro').classList.add('hidden');
  el('gameover').classList.add('hidden');
  el('codex').classList.add('hidden');
  el('changelog').classList.add('hidden');
  el('settings').classList.add('hidden');
  el('endless-select').classList.add('hidden');
  el('leaderboard-select').classList.add('hidden');
  el('card-shop').classList.add('hidden');
  el('allied-select').classList.add('hidden');
  el('allied-briefing').classList.add('hidden');
  el('axis-select').classList.add('hidden');
  el('axis-briefing').classList.add('hidden');
  el('axis-research').classList.add('hidden');
  el('commando-select').classList.add('hidden');
  el('tutorial-select').classList.add('hidden');
  el('pause').classList.add('hidden');
  hideTutorialMsg();   // clear any queued messages from a previous run
  if (G.tutorial) tutEnterStep(G.tutorial.step);   // enter each script's opening step
  syncMobileViewUI();
  syncMobileChrome();
  const viewHint = mobileViewActive()
    ? ' Drag to pan; double-tap to zoom; pinch to zoom. Hold to cancel placement.'
    : '';
  el('tipbar').textContent = (level.mode === 'axis' || level.mode === 'assault'
    ? touchUI()
      ? (level.landingCraft
        ? 'Deploy troops on landing craft decks, then tap START WAVE. Craft motor ashore and drop ramps under fire.'
        : 'Deploy troops in the top strip, then tap START WAVE. Tap Units or Abilities to buy; tap the field to place.')
      : (level.landingCraft
        ? 'Deploy troops only on landing craft decks, then hit START WAVE. Craft motor ashore; ramps drop under German fire.'
        : 'Deploy troops in the top strip, then hit START WAVE. Open Units or Abilities to buy; right-click / Esc cancels placement.')
    : level.mode === 'hitsquad'
      ? touchUI()
        ? 'Tap or drag to select your men, tap ground to move. Kill the marked officer.'
        : 'Click or drag-select your men, click ground to move them. Kill the marked officer. Right-click / Esc deselects.'
    : difficulty && difficulty.testing
      ? touchUI()
        ? 'Testing: unlimited TP, no Germans spawn on their own. Open GERMANS to build them for the enemy side, or EVENTS to summon one on demand.'
        : 'Testing: unlimited TP, no Germans spawn on their own. Open GERMANS to build them for the enemy side, or EVENTS to summon one on demand; right-click / Esc cancels placement.'
    : difficulty && difficulty.sandbox
      ? touchUI()
        ? 'Sandbox: unlimited TP. Use +1 / +5 / +10 in the HUD to jump ahead in waves.'
        : 'Sandbox: unlimited TP. ] / Shift+] / Ctrl+] jump ahead 1 / 5 / 10 waves, or use the HUD buttons.'
      : touchUI()
        ? 'Tap a soldier to select him, tap ground to move. Open Units, Abilities, or Emplacements to deploy. Back returns to the list; tap the item again to cancel.'
        : 'Left-click a soldier to select him, click ground to move. Open Units, Abilities, or Emplacements to deploy. Right-click / Esc cancels placement.') + viewHint;
  if (level.tutorial) el('tipbar').textContent = '';
  if (level.mode === 'axis' || level.mode === 'assault') showBanner('WAVE 1 - DEPLOY');
  else if (level.briefing) showBanner(level.name);
  lastT = performance.now();
  refreshHUD();
}
