/* Trenchworks: WW2 — endless leaderboards.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// one board per real difficulty (sandbox/testing have unlimited TP and
// sandbox can jump straight to any wave, so they're excluded — "wave died
// at" wouldn't mean anything there). Stored as furthest-wave-reached, top 10.

const LEADERBOARD_KEY = 'endlessLeaderboard';
const LEADERBOARD_VERSION = 1;
const LEADERBOARD_MAX = 10;
const LEADERBOARD_DIFFICULTIES = ['easy', 'medium', 'hard'];

function defaultLeaderboards() {
  const boards = {};
  for (const id of LEADERBOARD_DIFFICULTIES) boards[id] = [];
  return { version: LEADERBOARD_VERSION, boards };
}

function loadLeaderboards() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return defaultLeaderboards();
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || data.version !== LEADERBOARD_VERSION || !data.boards) {
      return defaultLeaderboards();
    }
    const boards = {};
    for (const id of LEADERBOARD_DIFFICULTIES) {
      boards[id] = Array.isArray(data.boards[id]) ? data.boards[id] : [];
    }
    return { version: LEADERBOARD_VERSION, boards };
  } catch {
    return defaultLeaderboards();
  }
}

function saveLeaderboards(data) {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(data));
}

function leaderboardBoard(diffId) {
  return loadLeaderboards().boards[diffId] || [];
}

// Escalation ranks ABOVE wave: a wave-140 run at rung IX is a harder run than a
// wave-160 one at rung 0, and sorting on wave alone would bury it. Entries
// predating the ladder have no `esc` — they read as 0, which is what they were.
// Both the sort and the qualifies test have to use this, or a soft run could
// displace a hard one off the bottom of a full board.
function leaderboardScoreCmp(a, b) {
  return (b.esc || 0) - (a.esc || 0) || b.wave - a.wave || a.date - b.date;
}

function leaderboardQualifies(diffId, wave, esc = 0) {
  if (!LEADERBOARD_DIFFICULTIES.includes(diffId) || !(wave > 0)) return false;
  const board = leaderboardBoard(diffId);
  if (board.length < LEADERBOARD_MAX) return true;
  const last = board[board.length - 1];
  return leaderboardScoreCmp({ esc, wave, date: Date.now() }, last) < 0;
}

function addLeaderboardEntry(diffId, name, wave, esc = 0) {
  if (!LEADERBOARD_DIFFICULTIES.includes(diffId)) return -1;
  const data = loadLeaderboards();
  const board = data.boards[diffId];
  const entry = { name: (name || 'Anonymous').slice(0, 16), wave, esc, date: Date.now() };
  board.push(entry);
  board.sort(leaderboardScoreCmp);
  board.length = Math.min(board.length, LEADERBOARD_MAX);
  saveLeaderboards(data);
  return board.indexOf(entry);
}

// always renders LEADERBOARD_MAX slots; unfilled ranks show as dim placeholders
function renderLeaderboardList(listEl, diffId, highlightIndex = -1) {
  const board = leaderboardBoard(diffId);
  listEl.innerHTML = '';
  for (let i = 0; i < LEADERBOARD_MAX; i++) {
    const entry = board[i];
    const li = document.createElement('li');
    li.className = 'leaderboard-row';
    if (!entry) li.classList.add('lb-empty-row');
    else if (i < 3) li.classList.add('lb-top' + (i + 1));
    if (entry && i === highlightIndex) li.classList.add('lb-new');
    const rank = document.createElement('span');
    rank.className = 'lb-rank';
    rank.textContent = String(i + 1);
    const name = document.createElement('span');
    name.className = 'lb-name';
    name.textContent = entry ? entry.name : '—';
    const dots = document.createElement('span');
    dots.className = 'lb-dots';
    const wave = document.createElement('span');
    wave.className = 'lb-wave';
    if (entry) {
      const label = document.createElement('span');
      label.className = 'lb-wave-label';
      // the rung the run was set at, where it beat the base game; entries from
      // before the ladder carry no esc and read as plain waves
      label.textContent = (entry.esc > 0 ? 'ESC ' + ESC_ROMAN[entry.esc] + ' · ' : '') + 'WAVE ';
      wave.appendChild(label);
      wave.appendChild(document.createTextNode(String(entry.wave)));
    } else {
      wave.textContent = '—';
    }
    li.appendChild(rank);
    li.appendChild(name);
    li.appendChild(dots);
    li.appendChild(wave);
    listEl.appendChild(li);
  }
}

let leaderboardActiveDiff = 'easy';
let leaderboardReturnScreen = 'endless-select';

function openLeaderboardSelect(fromScreen, diffId) {
  leaderboardReturnScreen = fromScreen;
  el(fromScreen).classList.add('hidden');
  leaderboardActiveDiff = diffId || leaderboardActiveDiff;
  buildLeaderboardSelect();
  el('leaderboard-select').classList.remove('hidden');
}

function closeLeaderboardSelect() {
  el('leaderboard-select').classList.add('hidden');
  el(leaderboardReturnScreen).classList.remove('hidden');
}

function buildLeaderboardSelect() {
  for (const btn of document.querySelectorAll('.lb-tab')) {
    btn.classList.toggle('active', btn.dataset.lbDiff === leaderboardActiveDiff);
  }
  renderLeaderboardList(el('leaderboard-select-list'), leaderboardActiveDiff);
}

// called from endRun() after an endless defeat: shows the board for the
// difficulty just played, and a name-entry form if the run cracked the top 10
function updateGameOverLeaderboard(won) {
  const entryBox = el('go-leaderboard-entry');
  const boardBox = el('go-leaderboard');
  const diffId = G && G.mode === 'endless' && G.difficulty && !G.level.tutorial ? G.difficulty.id : null;
  // a boss victory used to record nothing at all, which was survivable when the
  // only way to end a run was losing. With ESCALATION the boss kill IS the
  // achievement, so a win now takes a score like any other run.
  if (!diffId || !LEADERBOARD_DIFFICULTIES.includes(diffId)) {
    entryBox.classList.add('hidden');
    boardBox.classList.add('hidden');
    return;
  }
  const wave = G.wave;
  const esc = G.esc ? G.esc.level : 0;
  boardBox.classList.remove('hidden');
  el('go-leaderboard-title').textContent = 'LEADERBOARD';
  renderLeaderboardList(el('go-leaderboard-list'), diffId);
  if (leaderboardQualifies(diffId, wave, esc)) {
    entryBox.classList.remove('hidden');
    entryBox.dataset.diff = diffId;
    entryBox.dataset.wave = String(wave);
    entryBox.dataset.esc = String(esc);
    el('go-name-input').value = '';
  } else {
    entryBox.classList.add('hidden');
  }
}

function saveGoLeaderboardScore() {
  const entryBox = el('go-leaderboard-entry');
  const diffId = entryBox.dataset.diff;
  const wave = parseInt(entryBox.dataset.wave, 10);
  const esc = parseInt(entryBox.dataset.esc, 10) || 0;
  if (!diffId || !Number.isFinite(wave)) return;
  // clear the pending score before writing so a second call (Enter key plus a
  // Save-button click, both wired to this handler) can't add a duplicate entry
  delete entryBox.dataset.diff;
  delete entryBox.dataset.wave;
  delete entryBox.dataset.esc;
  const name = el('go-name-input').value.trim();
  const rank = addLeaderboardEntry(diffId, name, wave, esc);
  entryBox.classList.add('hidden');
  renderLeaderboardList(el('go-leaderboard-list'), diffId, rank);
}
