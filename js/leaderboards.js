/* Trenchworks: WW2 — endless leaderboards.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// ONE BOARD PER ESCALATION RUNG — eleven of them, '—' plus I..X. The three
// difficulty boards this replaced were a relic: medium and hard left the menu
// when the ladder shipped, so two of the three tabs recorded a run nobody could
// start any more, while every run a player actually plays lands on the third.
//
// The rung is the difficulty now, so it is the thing a board is keyed on, and
// that also retires the mixed-board comparator: a board holds one rung, so
// entries inside it compare on wave alone. Sandbox and testing are still
// excluded (unlimited TP, and sandbox can jump straight to any wave, so "wave
// died at" means nothing there) — via medalsEligible(), the same gate the rung
// unlock itself uses. Stored as furthest-wave-reached, top 10 per rung.

const LEADERBOARD_KEY = 'endlessLeaderboard';
const LEADERBOARD_VERSION = 2;
const LEADERBOARD_MAX = 10;
// the tiers the v1 boards were keyed on, kept only so the migration below can
// find them. Nothing else in this file knows difficulties exist.
const LEADERBOARD_V1_DIFFICULTIES = ['easy', 'medium', 'hard'];

// board keys are the rung as a string, because that is what a JSON object round
// -trips them as either way
function leaderboardRungKey(level) {
  return String(clamp(Math.floor(level || 0), 0, ESC_MAX));
}

function emptyLeaderboardBoards() {
  const boards = {};
  for (let i = 0; i <= ESC_MAX; i++) boards[String(i)] = [];
  return boards;
}

function defaultLeaderboards() {
  return { version: LEADERBOARD_VERSION, boards: emptyLeaderboardBoards() };
}

// one row, defensive about every field, so a hand-edited blob or a migrated v1
// entry can't put `undefined` on the board
function normalizeEntry(e) {
  if (!e || typeof e !== 'object' || !(e.wave > 0)) return null;
  return {
    name: String(e.name || 'Anonymous').slice(0, 16),
    wave: Math.floor(e.wave),
    date: Number.isFinite(e.date) ? e.date : 0,
  };
}

function sortAndTrim(board) {
  board.sort(leaderboardScoreCmp);
  board.length = Math.min(board.length, LEADERBOARD_MAX);
  return board;
}

// v1 → v2. The old blob banked runs under a difficulty and carried the rung as
// a field on the entry, which is exactly the pair of things being swapped, so
// every entry re-homes onto the board its own `esc` names. Entries from the
// medium and hard boards come across too, folded in by their `esc` like the
// rest: those tiers were harder than the rung they land on, so the migration
// UNDER-credits them and can never invent a score a rung didn't earn. Dropping
// them outright would be the only alternative, and a local high-score table is
// the player's own history.
function migrateLeaderboardsV1(data) {
  const boards = emptyLeaderboardBoards();
  for (const diff of LEADERBOARD_V1_DIFFICULTIES) {
    const old = data.boards[diff];
    if (!Array.isArray(old)) continue;
    for (const raw of old) {
      const entry = normalizeEntry(raw);
      if (entry) boards[leaderboardRungKey(raw.esc)].push(entry);
    }
  }
  for (const key in boards) sortAndTrim(boards[key]);
  const migrated = { version: LEADERBOARD_VERSION, boards };
  saveLeaderboards(migrated);
  return migrated;
}

function loadLeaderboards() {
  try {
    const raw = PLATFORM.storage.get(LEADERBOARD_KEY);
    if (!raw) return defaultLeaderboards();
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !data.boards) return defaultLeaderboards();
    if (data.version === 1) return migrateLeaderboardsV1(data);
    if (data.version !== LEADERBOARD_VERSION) return defaultLeaderboards();
    const boards = emptyLeaderboardBoards();
    for (const key in boards) {
      const list = data.boards[key];
      if (!Array.isArray(list)) continue;
      for (const raw of list) {
        const entry = normalizeEntry(raw);
        if (entry) boards[key].push(entry);
      }
      sortAndTrim(boards[key]);
    }
    return { version: LEADERBOARD_VERSION, boards };
  } catch {
    return defaultLeaderboards();
  }
}

function saveLeaderboards(data) {
  PLATFORM.storage.set(LEADERBOARD_KEY, JSON.stringify(data));
}

function leaderboardBoard(rung) {
  return loadLeaderboards().boards[leaderboardRungKey(rung)] || [];
}

// the deepest wave on ANY board — "has this player ever finished a run that
// counted". The menu uses it as one of the three first-launch signals
// (refreshFrontMenu, js/flow.js); a save slot and a medal balance are both
// things a returning player can be holding none of.
function bestWaveEver() {
  let best = 0;
  const boards = loadLeaderboards().boards;
  for (const key in boards) {
    for (const e of boards[key]) if (e.wave > best) best = e.wave;
  }
  return best;
}

// a board is one rung, so the rung is not part of the comparison any more —
// deeper wave first, and the earlier run holds the tie.
function leaderboardScoreCmp(a, b) {
  return b.wave - a.wave || a.date - b.date;
}

function leaderboardQualifies(rung, wave) {
  if (!(wave > 0)) return false;
  const board = leaderboardBoard(rung);
  if (board.length < LEADERBOARD_MAX) return true;
  return leaderboardScoreCmp({ wave, date: Date.now() }, board[board.length - 1]) < 0;
}

function addLeaderboardEntry(rung, name, wave) {
  const data = loadLeaderboards();
  const board = data.boards[leaderboardRungKey(rung)];
  const entry = { name: (name || 'Anonymous').slice(0, 16), wave, date: Date.now() };
  board.push(entry);
  sortAndTrim(board);
  saveLeaderboards(data);
  return board.indexOf(entry);
}

// always renders LEADERBOARD_MAX slots; unfilled ranks show as dim placeholders
function renderLeaderboardList(listEl, rung, highlightIndex = -1) {
  const board = leaderboardBoard(rung);
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
      // no rung on the row: the board IS one rung, and it's named in the header
      // above the list rather than repeated ten times down it
      label.textContent = 'WAVE ';
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

let leaderboardActiveRung = 0;
let leaderboardReturnScreen = 'intro';

// opens on the rung you are set to play, not on rung 0 — the board you care
// about is the one your next run lands on. An explicit rung wins (the game-over
// path hands in the rung just played).
function openLeaderboardSelect(fromScreen, rung) {
  leaderboardReturnScreen = fromScreen;
  el(fromScreen).classList.add('hidden');
  // no explicit rung means "the board your next run lands on" — under the demo
  // cap that is the effective rung, not whatever the shared blob still stores.
  // An explicit rung (the game-over path) is passed through: it is a rung just
  // played. Boards above the cap stay READABLE if they hold entries — a board
  // is a record, and the demo does not un-write the full game's history.
  const data = loadEndlessCards();
  leaderboardActiveRung = clamp(Math.floor(rung != null ? rung
    : Math.min(data.escalation, escEffectiveUnlocked(data))), 0, ESC_MAX);
  buildLeaderboardSelect();
  el('leaderboard-select').classList.remove('hidden');
}

function closeLeaderboardSelect() {
  el('leaderboard-select').classList.add('hidden');
  el(leaderboardReturnScreen).classList.remove('hidden');
}

// A rung you have never earned still has a board on the strip, drawn inert —
// same reasoning as the strip on the menu, where the shape of the ladder is the
// reason to climb it. It stays REACHABLE if it holds entries, though, because a
// board is a record: TEST.escalation() and the v1 migration can both put a score
// on a rung this save no longer counts as earned, and it must not become
// unreadable.
function leaderboardRungState(level, unlocked) {
  if (level === leaderboardActiveRung) return 'on';
  if (level <= unlocked || leaderboardBoard(level).length) return 'idle';
  return 'locked';
}

// A standing strip is repainted rather than rebuilt, for the reason buildEscRungs
// (js/escalation.js) spells out: switching boards is itself a tap on one of these
// chips, and an innerHTML rebuild deletes the element mid-activation, dropping
// keyboard focus to <body>. Only the state class and the disabled flag can differ
// between two paints — a board's rung, label and handler never change.
function buildLeaderboardRungs() {
  const unlocked = loadEndlessCards().escUnlocked;
  const row = el('leaderboard-tabs');
  const standing = row.children.length === ESC_MAX + 1;
  if (!standing) row.innerHTML = '';
  for (let i = 0; i <= ESC_MAX; i++) {
    const state = leaderboardRungState(i, unlocked);
    const chip = standing ? row.children[i] : document.createElement('button');
    chip.className = 'esc-rung esc-rung--' + state;
    chip.disabled = state === 'locked';
    if (standing) continue;
    chip.type = 'button';
    chip.textContent = ESC_ROMAN[i];
    chip.title = i === 0 ? 'No escalation' : ESCALATIONS[i - 1].name;
    chip.setAttribute('aria-label', (i === 0 ? 'No escalation' : 'Escalation ' + ESC_ROMAN[i]) +
      ' leaderboard');
    chip.addEventListener('click', () => {
      if (i === leaderboardActiveRung) return;
      leaderboardActiveRung = i;
      SFX.click();
      buildLeaderboardSelect();
    });
    row.appendChild(chip);
  }
}

// names the board under the strip, so the rows below don't have to repeat the
// rung ten times. Rung 0 borrows the menu's own wording for the clean sector.
function buildLeaderboardHead(rung) {
  const mod = rung > 0 ? ESCALATIONS[rung - 1] : null;
  el('lb-board-rung').textContent = mod ? 'ESCALATION ' + ESC_ROMAN[rung] : 'NO ESCALATION';
  el('lb-board-name').textContent = mod ? mod.name : 'CLEAN SECTOR';
  el('lb-board-mult').textContent = escMultLabel(rung) + ' MEDALS';
}

function buildLeaderboardSelect() {
  buildLeaderboardRungs();
  buildLeaderboardHead(leaderboardActiveRung);
  renderLeaderboardList(el('leaderboard-select-list'), leaderboardActiveRung);
}

// called from endRun() after an endless run ends: shows the board for the RUNG
// just played, and a name-entry form if the run cracked its top 10.
// medalsEligible() is the gate, reused verbatim rather than restated — it is
// already the "this run counts" test the rung unlock and the medal payout use,
// and it excludes sandbox, testing and the tutorials in one place.
function updateGameOverLeaderboard(won) {
  const entryBox = el('go-leaderboard-entry');
  const boardBox = el('go-leaderboard');
  // a boss victory used to record nothing at all, which was survivable when the
  // only way to end a run was losing. With ESCALATION the boss kill IS the
  // achievement, so a win now takes a score like any other run.
  if (!medalsEligible()) {
    entryBox.classList.add('hidden');
    boardBox.classList.add('hidden');
    return;
  }
  const wave = G.wave;
  const rung = G.esc ? G.esc.level : 0;
  boardBox.classList.remove('hidden');
  el('go-leaderboard-title').textContent = 'LEADERBOARD · ' +
    (rung > 0 ? 'ESCALATION ' + ESC_ROMAN[rung] : 'NO ESCALATION');
  renderLeaderboardList(el('go-leaderboard-list'), rung);
  if (leaderboardQualifies(rung, wave)) {
    entryBox.classList.remove('hidden');
    entryBox.dataset.rung = String(rung);
    entryBox.dataset.wave = String(wave);
    el('go-name-input').value = '';
  } else {
    entryBox.classList.add('hidden');
  }
}

function saveGoLeaderboardScore() {
  const entryBox = el('go-leaderboard-entry');
  const rung = parseInt(entryBox.dataset.rung, 10);
  const wave = parseInt(entryBox.dataset.wave, 10);
  if (!Number.isFinite(rung) || !Number.isFinite(wave)) return;
  // clear the pending score before writing so a second call (Enter key plus a
  // Save-button click, both wired to this handler) can't add a duplicate entry
  delete entryBox.dataset.rung;
  delete entryBox.dataset.wave;
  const name = el('go-name-input').value.trim();
  const rank = addLeaderboardEntry(rung, name, wave);
  entryBox.classList.add('hidden');
  renderLeaderboardList(el('go-leaderboard-list'), rung, rank);
}
