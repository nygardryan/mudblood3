/* Trenchworks: WW2 — ESCALATION, the endless difficulty ladder.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// Ten rungs, each ADDING one permanent modifier on top of every rung below it.
// Escalation 0 is the old EASY tier untouched, and the rung is unlocked one at a
// time by putting the wave-100 boss down (see unlockEscalation, called from
// bossVictory in js/flow.js). The old MEDIUM/HARD tiers left the menu when this
// shipped — they survive in ENDLESS_DIFFICULTIES only for TEST.start and the
// banked leaderboard boards.
//
// The whole ladder is expressed as ONE flat object of scalars (see
// defaultEscMods): every hook site in the sim reads a `G.esc.*` field and
// multiplies or adds. At level 0 every field is its identity value, so the
// ladder is a true no-op — sandbox, testing, tutorials and campaigns never take
// a branch. That is the reason modifiers are scalars rather than callbacks:
// a callback would have to run somewhere, and there is no "somewhere" that is
// free when the feature is off.
const ESC_MAX = 10;

// each rung pins the enemy faction, cycling in this order. A climb is therefore
// "prove it against every army", and it stops a modifier landing unevenly — the
// doubled plate of rung VI is brutal against the Regio Esercito and literally
// nothing against the Horde, which wears none.
const ESC_FACTION_CYCLE = ['de', 'jp', 'zo', 'it'];
const ESC_FACTION_NAME = {
  de: 'WEHRMACHT',
  jp: 'IMPERIAL JAPANESE ARMY',
  zo: 'THE HORDE',
  it: 'REGIO ESERCITO',
};
const ESC_ROMAN = ['—', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// events fire 30% more often, so the interval between them is 1/1.3
const ESC_EVENT_RATE = 1.3;

// THE PAY MODIFIER. Every rung also scales the medal payout, so the ladder is a
// reward curve as well as a difficulty one: the wave-10 milestone that banks 1
// medal at rung 0 banks 2 at rung X. This is deliberately NOT an eleventh rung —
// it is the continuous term that runs alongside the ten, which is why it is
// derived from the level in buildEscMods (like `faction`) rather than applied by
// one entry's apply(). +10% per rung: ×1.0 at 0, ×2.0 at X.
const ESC_MEDAL_STEP = 0.1;

function escMedalMult(level) {
  return 1 + ESC_MEDAL_STEP * clamp(Math.floor(level || 0), 0, ESC_MAX);
}

// '×1.3' — how the payout reads on the menu and in the dossier
function escMultLabel(level) {
  return '×' + escMedalMult(level).toFixed(1);
}

// { level, name, cat, desc, long, apply(m) } — `cat` is only the card's chip.
// Ordered rung 1..10; the array index is level - 1.
const ESCALATIONS = [
  {
    level: 1, name: 'HARDENED CADRE', cat: 'ENEMY',
    desc: 'Enemy troops toughen half again as fast as the war drags on.',
    long: 'The per-wave HP ramp climbs at 1.5× its normal rate. It still stops at the ' +
      'same ceiling, so this bites hardest in the first eighty waves — the stretch ' +
      'where you are still building a line rather than holding one.',
    apply: (m) => { m.hpRampMult = 1.5; },
  },
  {
    level: 2, name: 'RATIONED', cat: 'SUPPLY',
    desc: 'Every source of income pays a fifth less, and the supply trickle runs a second slower.',
    long: 'Income ×0.8 across kills, the trickle and officer pay; the trickle interval ' +
      'goes from three seconds to four. Roughly a third less TP over a long run once ' +
      'both compound.',
    apply: (m) => { m.incomeMult = 0.8; m.trickleAdd = 1; },
  },
  {
    level: 3, name: 'NO RESPITE', cat: 'TEMPO',
    desc: 'The breather between waves is gone.',
    long: 'The three-second pause added between waves is removed outright. The gap ' +
      'never widens again, so every reinforcement, repair and repositioning has to ' +
      'happen while the field is still hot.',
    apply: (m) => { m.waveBreather = 0; },
  },
  {
    level: 4, name: 'MURDEROUS INTENT', cat: 'ENEMY',
    desc: 'Every enemy round, blade, blast and bite lands ten percent harder.',
    long: 'A flat ×1.1 on all damage dealt to your men, applied at the single point ' +
      'every attack funnels through. It covers small arms, shells, mortars, rockets, ' +
      'mines, flame, melee and bile alike — and only enemy fire, so your own strays ' +
      'are unchanged.',
    apply: (m) => { m.enemyDmgMult = 1.1; },
  },
  {
    level: 5, name: 'EMPTY DEPOTS', cat: 'SUPPLY',
    desc: 'You deploy with nothing banked.',
    long: 'The opening 25 TP is gone; whatever meets the first wave was paid for by ' +
      'the trickle. The War Chest card still pays out in full — an earned counter is ' +
      'still allowed to counter.',
    apply: (m) => { m.startTPMult = 0; },
  },
  {
    level: 6, name: 'CASE-HARDENED', cat: 'ENEMY',
    desc: 'Enemy body and flak plate is issued twice as thick.',
    long: 'Armor here is a pool that soaks damage one-for-one until it breaks, not a ' +
      'percentage — so doubling it doubles how many rounds a plated man eats before ' +
      'anything reaches him. Bosses refill their plate at every rally, and theirs is ' +
      'doubled too.',
    apply: (m) => { m.enemyArmorMult = 2; },
  },
  {
    level: 7, name: 'NO PLAN SURVIVES', cat: 'TEMPO',
    desc: 'Fog, smoke, paradrops and air raids come thirty percent more often.',
    long: 'Only the cadence changes — which event fires is still rolled the same way, ' +
      'so the late-war weighting toward air raids is untouched. Smoke arriving more ' +
      'often is the sharp end: it blinds your line as readily as theirs.',
    apply: (m) => { m.eventIntervalMult = 1 / ESC_EVENT_RATE; },
  },
  {
    level: 8, name: 'CEASELESS', cat: 'TEMPO',
    desc: 'Waves stop spacing out — the floor between them drops from seven seconds to five.',
    long: 'The wave gap narrows as the war goes on and then holds at a floor. That ' +
      'floor moves down, so from roughly wave thirty onward the field never empties. ' +
      'Stacked on NO RESPITE this is a five-second gap where the base game gives ten.',
    apply: (m) => { m.spawnFloor = 5; },
  },
  {
    level: 9, name: 'NOTHING ON THE DEAD', cat: 'SUPPLY',
    desc: 'Kills pay nothing. Every TP you spend comes from the trickle and your officers.',
    long: 'Kill bounties go to zero — the whole reward column of the roster stops ' +
      'mattering. Income becomes a flat rate you cannot raise by fighting harder, ' +
      'only by keeping officers alive.',
    apply: (m) => { m.killIncome = 0; },
  },
  {
    level: 10, name: 'NO SURRENDER', cat: 'ENEMY',
    desc: 'Putting the boss down does not end it. He comes back, and you finish it there.',
    long: 'The wave-100 kill buys you nothing but the right to keep going. The run is ' +
      'only won when the boss falls a second time at wave 200 — at twice the HP, with ' +
      'every other rung of the ladder still stacked on top of you.',
    apply: (m) => { m.bossKills = 2; },
  },
];

// Every field is its identity value, so buildEscMods(0) leaves the sim exactly
// as it was before the ladder existed.
function defaultEscMods() {
  return {
    level: 0,
    faction: null,          // null = roll the enemy faction at random, as before
    hpRampMult: 1,          // I
    incomeMult: 1,          // II
    trickleAdd: 0,          // II
    waveBreather: WAVE_BREATHER,  // III
    enemyDmgMult: 1,        // IV
    startTPMult: 1,         // V
    enemyArmorMult: 1,      // VI
    eventIntervalMult: 1,   // VII
    spawnFloor: 7,          // VIII — matches the clamp floor in spawnIntervalForWave
    killIncome: 1,          // IX
    bossKills: 1,           // X — boss kills needed to win the run
    medalMult: 1,           // the pay modifier — see escMedalMult, set in buildEscMods
  };
}

// fold every rung from 1 to `level` into one mods object. Compounding is the
// whole point: rung N is rungs 1..N, never rung N alone.
function buildEscMods(level) {
  const m = defaultEscMods();
  const n = clamp(Math.floor(level || 0), 0, ESC_MAX);
  if (!n) return m;
  m.level = n;
  m.faction = escFactionFor(n);
  m.medalMult = escMedalMult(n);
  for (let i = 0; i < n; i++) ESCALATIONS[i].apply(m);
  return m;
}

function escFactionFor(level) {
  return ESC_FACTION_CYCLE[(level - 1) % ESC_FACTION_CYCLE.length];
}

// Escalation VI, read from three places: the wave spawner's armor roll and the
// two boss sites (a boss is skipped by armorEnemy and refills its own plate at
// every rally, so it would otherwise be the one man on the field wearing base
// armor at rung X). Guarded because the codex builds a stub G with no `esc`.
function escArmorMult() {
  return G && G.esc ? G.esc.enemyArmorMult : 1;
}

// "ESCALATION VII", or '' at level 0 — for the run summaries and the recap
function escLabel(level) {
  return level > 0 ? 'ESCALATION ' + ESC_ROMAN[level] : '';
}

// how a run's difficulty reads in the summaries and the after-action report.
// Once the ladder is on, the underlying tier is always EASY, so printing it
// would be noise — the rung is the difficulty.
function runPostureLabel() {
  if (G && G.esc && G.esc.level > 0) return escLabel(G.esc.level);
  return G && G.difficulty ? G.difficulty.name : '—';
}

// ---------------------------------------------------------------------------
// save state. Both fields ride the existing endlessCards blob (same domain as
// medals and shop width), normalized in loadEndlessCards — no version bump,
// because an additive field is exactly what that normalizer already backfills.

function escalationSelected() {
  return loadEndlessCards().escalation;
}

function escalationUnlocked() {
  return loadEndlessCards().escUnlocked;
}

function setEscalationLevel(n) {
  const data = loadEndlessCards();
  data.escalation = clamp(Math.floor(n), 0, data.escUnlocked);
  saveEndlessCards(data);
  return data.escalation;
}

// called on a boss victory that counts (see bossVictory in js/flow.js). max()
// rather than assignment because the boss returns at every hundredth wave, so
// this re-enters on wave 200/300 of a run that already unlocked its rung.
function unlockEscalation(n) {
  const data = loadEndlessCards();
  const next = clamp(Math.floor(n), 0, ESC_MAX);
  if (next <= data.escUnlocked) return false;
  data.escUnlocked = next;
  saveEndlessCards(data);
  return true;
}


// ---------------------------------------------------------------------------
// UI. The menu is three surfaces: a RUNG STRIP (every earned rung one tap away,
// so dropping from IX back to II isn't seven arrow presses), a READOUT that
// pairs the selected rung with what it PAYS, and a full-screen DOSSIER holding
// all ten modifiers. The ten `ee-card`s that used to sit under the stepper moved
// into that dossier: at rung X they pushed the deploy button a screen and a half
// down a panel whose whole job is to start a run.

// 'on' (this run has it) | 'idle' (earned, above the current pick) | 'locked'
function escStateFor(level, sel, unlocked) {
  return level <= sel ? 'on' : (level <= unlocked ? 'idle' : 'locked');
}

// the eleven chips, '—' plus I..X. A locked chip is drawn inert rather than
// omitted: the SHAPE of the ladder is the whole reason to climb it.
function buildEscRungs(sel, unlocked) {
  const row = el('esc-rungs');
  row.innerHTML = '';
  for (let i = 0; i <= ESC_MAX; i++) {
    const state = escStateFor(i, sel, unlocked);
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'esc-rung esc-rung--' + state;
    chip.textContent = ESC_ROMAN[i];
    chip.disabled = state === 'locked';
    chip.title = i === 0 ? 'No modifiers'
      : state === 'locked' ? 'Locked' : ESCALATIONS[i - 1].name;
    chip.setAttribute('aria-label', (i === 0 ? 'No escalation' : 'Escalation ' + ESC_ROMAN[i]) +
      ' — ' + escMultLabel(i) + ' medals');
    chip.addEventListener('click', () => pickEscalation(i));
    row.appendChild(chip);
  }
}

// the single card under the readout: the modifier the current rung just added.
// One card rather than the full stack, because the stack is what the dossier is.
function buildEscNewest(sel) {
  const host = el('esc-newest');
  const mod = sel > 0 ? ESCALATIONS[sel - 1] : null;
  host.classList.toggle('esc-newest--on', !!mod);
  host.innerHTML =
    '<div class="esc-newest__top">' +
      '<span class="esc-newest__cat">' + (mod ? mod.cat : 'BASELINE') + '</span>' +
      (mod ? '<span class="esc-newest__live">ACTIVE</span>' : '') +
      '<span class="esc-newest__lvl">' + (mod ? ESC_ROMAN[mod.level] : '—') + '</span>' +
    '</div>' +
    '<div class="esc-newest__name">' + (mod ? mod.name : 'CLEAN SECTOR') + '</div>' +
    '<div class="esc-newest__desc">' + (mod ? mod.desc :
      'Nothing stacked against you — and nothing extra in the pay packet. Every rung ' +
      'you take adds one permanent modifier, and banks more medals for it.') + '</div>';
}

// rebuild the whole escalation block from the save. Called when #endless-select
// opens and after every pick.
function buildEscalationUI() {
  const block = el('esc-block');
  if (!block) return;
  const data = loadEndlessCards();
  const level = data.escalation, unlocked = data.escUnlocked;

  el('esc-level').textContent = level > 0 ? 'ESCALATION ' + ESC_ROMAN[level] : 'NO ESCALATION';
  el('esc-count').textContent = level > 0
    ? level + ' MODIFIER' + (level === 1 ? '' : 'S') + ' IN EFFECT'
    : 'NO MODIFIERS';
  el('esc-foe').textContent = level > 0
    ? 'ENEMY: ' + ESC_FACTION_NAME[escFactionFor(level)]
    : 'ENEMY: ROLLED AT RANDOM';
  el('esc-mult').textContent = escMultLabel(level);
  el('esc-earned').textContent = 'EARNED: ' + ESC_ROMAN[unlocked];
  el('esc-topmult').textContent = escMultLabel(ESC_MAX) + ' MEDALS';
  el('esc-sel').textContent = level;
  el('esc-prev').disabled = level <= 0;
  el('esc-next').disabled = level >= unlocked;

  // one line carrying the whole climb: what the next rung is, or what it costs
  // to earn it, and what either pays
  const next = level < ESC_MAX ? ESCALATIONS[level] : null;
  const earned = level < unlocked;
  const line = el('esc-nextline');
  line.classList.toggle('esc-nextline--live', !!(next && earned));
  line.textContent = !next
    ? 'TOP OF THE LADDER · ' + escMultLabel(ESC_MAX) + ' MEDALS'
    : earned
      ? 'NEXT ▸ ' + ESC_ROMAN[next.level] + ' · ' + next.name + ' · ' + escMultLabel(next.level) + ' MEDALS'
      // rung 0 has no numeral to name, so it drops the "ON —" that would read
      // as a typo to the one player who most needs this line: a new one
      : 'LOCKED ▸ PUT THE BOSS DOWN' + (level > 0 ? ' ON ' + ESC_ROMAN[level] : '') +
        ' TO EARN ' + ESC_ROMAN[next.level] + ' · ' + escMultLabel(next.level) + ' MEDALS';

  buildEscRungs(level, unlocked);
  buildEscNewest(level);
}

// ---------------------------------------------------------------------------
// the dossier: all ten modifiers as one scrollable list. Rows are informational,
// not a second way to pick — the strip and the arrows own selection. Tapping a
// row expands the `long` briefing, the same detail gesture the shop cards use.

function buildEscDossier() {
  const data = loadEndlessCards();
  const sel = data.escalation, unlocked = data.escUnlocked;
  el('esc-dossier-sub').textContent = ESC_MAX + ' RUNGS · ' + sel + ' IN EFFECT · ' +
    (unlocked > 0 ? ESC_ROMAN[unlocked] + ' EARNED' : 'NONE EARNED') + ' · ' +
    escMultLabel(sel) + ' MEDALS';

  const host = el('esc-dossier-rows');
  host.innerHTML = '';
  for (const mod of ESCALATIONS) {
    const state = escStateFor(mod.level, sel, unlocked);
    const locked = state === 'locked';
    // a locked row has no briefing to expand, so it is not a button at all
    const row = document.createElement(locked ? 'div' : 'button');
    if (!locked) row.type = 'button';
    row.className = 'escd-row escd-row--' + state;
    row.innerHTML =
      '<span class="escd-row__num">' + ESC_ROMAN[mod.level] + '</span>' +
      '<span class="escd-row__copy">' +
        '<span class="escd-row__line">' +
          '<span class="escd-row__name">' + (locked ? 'CLASSIFIED' : mod.name) + '</span>' +
          '<span class="escd-row__cat">' + mod.cat + '</span>' +
        '</span>' +
        // rung I is earned off rung 0, which has no numeral — naming it would
        // print "on Escalation —"
        '<span class="escd-row__desc">' + (locked
          ? 'Put the boss down' + (mod.level > 1 ? ' on Escalation ' + ESC_ROMAN[mod.level - 1] : '') +
            ' to read these orders.'
          : mod.desc) + '</span>' +
        (locked ? '' :
          '<span class="escd-row__chev">▾ detail</span>' +
          '<span class="escd-row__full">' + mod.long + '</span>') +
      '</span>' +
      '<span class="escd-row__side">' +
        '<span class="escd-row__state">' +
          (state === 'on' ? 'IN EFFECT' : locked ? 'LOCKED' : 'AVAILABLE') + '</span>' +
        '<span class="escd-row__mult">' + escMultLabel(mod.level) + ' MEDALS</span>' +
      '</span>';
    if (!locked) {
      const chev = row.querySelector('.escd-row__chev');
      row.addEventListener('click', () => {
        chev.textContent = row.classList.toggle('escd-row--open') ? '▴ hide' : '▾ detail';
      });
    }
    host.appendChild(row);
  }
}

// the dossier LAYERS over #endless-select rather than swapping it out (the way
// the card shop and the leaderboards do) — it is a reference sheet you consult
// mid-decision, and the menu staying put underneath is what makes it read that
// way rather than as a place you navigated to.
function openEscalationDossier() {
  buildEscDossier();
  el('esc-dossier').classList.remove('hidden');
  SFX.click();
}

function closeEscalationDossier() {
  if (el('esc-dossier').classList.contains('hidden')) return;
  el('esc-dossier').classList.add('hidden');
  SFX.click();
}

function escDossierOpen() {
  return !el('esc-dossier').classList.contains('hidden');
}

// ---------------------------------------------------------------------------

// the one write path for the selection: both the strip and the arrows land
// here, so the clamp and the rebuild live in one place. The dossier needs no
// refresh from here — it covers the whole stage while it's up, so no chip or
// arrow is reachable behind it, and it rebuilds on every open.
function pickEscalation(n) {
  const data = loadEndlessCards();
  const next = clamp(Math.floor(n), 0, data.escUnlocked);
  if (next === data.escalation) return;
  setEscalationLevel(next);
  SFX.click();
  buildEscalationUI();
}

function stepEscalation(delta) {
  pickEscalation(loadEndlessCards().escalation + delta);
}
