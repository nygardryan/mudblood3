/* Trenchworks: WW2 — ESCALATION, the endless difficulty ladder.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// Ten rungs, each ADDING one permanent modifier on top of every rung below it.
// Escalation 0 is the old EASY tier untouched, and the rung is unlocked one at a
// time by putting the wave-100 boss down (see unlockEscalation, called from
// bossVictory in js/flow.js). The old MEDIUM/HARD tiers left the menu when this
// shipped — they survive in ENDLESS_DIFFICULTIES only for TEST.start. The
// leaderboards followed later: they are keyed on the RUNG now, one board each
// (js/leaderboards.js), because the rung is what a difficulty is here.
//
// The whole ladder is expressed as ONE flat object of scalars (see
// defaultEscMods): every hook site in the sim reads a `G.esc.*` field and
// multiplies or adds. At level 0 every field is its identity value, so the
// ladder is a true no-op — sandbox, testing, tutorials and campaigns never take
// a branch. That is the reason modifiers are scalars rather than callbacks:
// a callback would have to run somewhere, and there is no "somewhere" that is
// free when the feature is off.
const ESC_MAX = 10;

// THE LADDER DOES NOT PICK THE ENEMY. Every rung rolls the faction the same way
// rung 0 always did (rollEnemyFaction in js/state.js) — no pin, no cycle.
//
// It shipped pinned, one army per rung, on the theory that a climb should be
// "prove it against every army". The cost of that is paid by the player who is
// STUCK: a rung is only cleared by putting a wave-100 boss down, so a hard rung
// is dozens of runs, and a pin makes every one of them the same army on the same
// ground — the same opening, the same counters, learnable to the point of
// tedium. Rotation is the thing that keeps those attempts distinct, and it is
// worth more than the tidiness of the cycle, even though a lucky roll lets a
// player farm his best matchup for the unlock.
//
// What the pin bought and this gives up: a modifier now lands unevenly by roll.
// Rung VI's doubled plate is brutal against the Regio Esercito and literally
// nothing against the Horde, which wears none. That is accepted — the ladder is
// a difficulty curve, not a fairness guarantee, and the no-repeat rule on the
// roll means the uneven ones come around soon enough.
const ESC_ROMAN = ['—', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// events fire 30% more often, so the interval between them is 1/1.3
const ESC_EVENT_RATE = 1.3;

// THE PAY MODIFIER. Every rung also scales the medal payout, so the ladder is a
// reward curve as well as a difficulty one: the wave-10 milestone that banks 1
// medal at rung 0 banks 2 at rung X. This is deliberately NOT an eleventh rung —
// it is the continuous term that runs alongside the ten, which is why it is
// derived from the level in buildEscMods rather than applied by one entry's
// apply(). +10% per rung: ×1.0 at 0, ×2.0 at X.
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

// The rungs the current build can actually stand on. In the demo the ladder
// tops out at DEMO_ESC_MAX; clamped at READ everywhere (here and the pickers),
// never written down — the stored escUnlocked is shared with the full game.
function escEffectiveUnlocked(data) {
  return Math.min(data.escUnlocked, demoEscMax());
}

// fold every rung from 1 to `level` into one mods object. Compounding is the
// whole point: rung N is rungs 1..N, never rung N alone.
function buildEscMods(level) {
  const m = defaultEscMods();
  // demo cap applies to the RUN even if a full-game blob has a higher rung
  // selected — read-side clamp, zero writes
  const n = clamp(Math.floor(level || 0), 0, demoEscMax());
  if (!n) return m;
  m.level = n;
  m.medalMult = escMedalMult(n);
  for (let i = 0; i < n; i++) ESCALATIONS[i].apply(m);
  return m;
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
  // demoEscMax caps what a demo boss kill can bank; it never lowers what the
  // full game already banked (the <= guard below returns false instead)
  const next = clamp(Math.floor(n), 0, demoEscMax());
  if (next <= data.escUnlocked) return false;
  data.escUnlocked = next;
  saveEndlessCards(data);
  return true;
}


// ---------------------------------------------------------------------------
// UI. Two surfaces now that the menu is one screen: the PLAY SLAB on the front
// page — a single welded control with EASIER / HARDER recessed into its ends and
// the rung it deploys at printed inside it — and the full-screen DOSSIER holding
// all ten modifiers.
//
// The eleven-chip RUNG STRIP moved INTO the dossier, and the dossier's rows
// became selectable with it. The strip has to live somewhere: the slab's arrows
// walk one rung at a time, so dropping from IX back to II is seven presses
// without it, and that is exactly the move a player stuck on a rung makes. What
// the front page gives up by not carrying it is a row of eleven chips competing
// with the one control the screen exists for — which is the whole point of the
// redesign. So the dossier stopped being purely informational: it is the place
// you go to READ the ladder, and reading it is when you decide where to stand on
// it. Selection is still one write path (pickEscalation), and the strip and the
// rows are two spellings of the same tap.

// 'on' (this run has it) | 'idle' (earned, above the current pick) | 'locked'
function escStateFor(level, sel, unlocked) {
  return level <= sel ? 'on' : (level <= unlocked ? 'idle' : 'locked');
}

// the eleven chips, '—' plus I..X. A locked chip is drawn inert rather than
// omitted: the SHAPE of the ladder is the whole reason to climb it.
// `hostId` because the leaderboard screen builds the same strip over its own
// boards (js/leaderboards.js has its own copy — it selects a BOARD, not a rung).
//
// A strip that is already standing is REPAINTED, never rebuilt — the same rule
// refreshEscDossierStates() follows for the rows below, and for the same reason
// one step further in: every repaint here is triggered BY a tap on one of these
// chips, so an innerHTML rebuild throws away the element that is mid-activation.
// The visible cost is keyboard focus, which falls back to <body> when the
// focused node leaves the document, so Tab restarts from the top of the page and
// the strip can't be walked with the keyboard at all. Only the state class, the
// disabled flag and the tooltip can differ between two paints; the label, the
// aria-label and the handler's captured rung index cannot, so the nodes are
// reusable exactly as they stand.
function buildEscRungs(sel, unlocked, hostId) {
  const row = el(hostId || 'esc-dossier-rungs');
  if (!row) return;
  const standing = row.children.length === ESC_MAX + 1;
  if (!standing) row.innerHTML = '';
  for (let i = 0; i <= ESC_MAX; i++) {
    const state = escStateFor(i, sel, unlocked);
    const chip = standing ? row.children[i] : document.createElement('button');
    chip.className = 'esc-rung esc-rung--' + state;
    chip.disabled = state === 'locked';
    chip.title = i === 0 ? 'No modifiers'
      : state === 'locked'
        ? (demoActive() && i > demoEscMax() ? 'Full game' : 'Locked')
        : ESCALATIONS[i - 1].name;
    if (standing) continue;
    chip.type = 'button';
    chip.textContent = ESC_ROMAN[i];
    chip.setAttribute('aria-label', (i === 0 ? 'No escalation' : 'Escalation ' + ESC_ROMAN[i]) +
      ' — ' + escMultLabel(i) + ' medals');
    chip.addEventListener('click', () => pickEscalation(i));
    row.appendChild(chip);
  }
}

// rebuild the front page's escalation half from the save. Called from
// returnToMenu and on page load (the menu is the first thing up), and after
// every pick.
function buildEscalationUI() {
  const slab = el('esc-deploy');
  if (!slab) return;
  const data = loadEndlessCards();
  const unlocked = escEffectiveUnlocked(data);
  const level = Math.min(data.escalation, unlocked);
  const mod = level > 0 ? ESCALATIONS[level - 1] : null;

  // what PLAY deploys at, printed inside the button
  el('esc-level').textContent = level > 0 ? 'ESCALATION ' + ESC_ROMAN[level] : 'NO ESCALATION';
  el('esc-mult').textContent = escMultLabel(level) + ' MEDALS';
  el('esc-prev').disabled = level <= 0;
  el('esc-next').disabled = level >= unlocked;

  // the status line: the modifier this rung just added, then how far up the
  // ladder you have actually earned. One card's worth of copy on one line —
  // the other nine are what the dossier is for.
  el('esc-newest-name').textContent = mod ? mod.name : 'CLEAN SECTOR';
  el('esc-newest-desc').textContent = mod ? mod.desc.toLowerCase()
    : 'nothing stacked against you, and nothing extra in the pay packet.';
  // the denominator is the ladder THIS BUILD can climb: printing / X under the
  // demo cap sends a capped player back to farm boss kills for a rung that
  // will never unlock. The dossier's FULL GAME rows carry the rest of it.
  el('esc-earned').textContent = 'EARNED ' + (unlocked > 0 ? ESC_ROMAN[unlocked] : '—') +
    ' / ' + ESC_ROMAN[demoEscMax()];
}

// ---------------------------------------------------------------------------
// the dossier: the rung strip, then all ten modifiers as one scrollable list.
// Rows both EXPAND the `long` briefing (the same detail gesture the shop cards
// use) and SELECT their rung, which is why the side of an unselected row reads
// `SET ▸` rather than `AVAILABLE` — a label that describes a fact, on a control
// that performs an action, is how a player learns the row is inert.

// the header line under THE LADDER. It carries what the front page's status line
// hasn't room for: the whole climb, either the next rung you can take or what it
// costs to earn it, and the standing note that the ladder never picks your enemy.
function escDossierSubText(sel, unlocked) {
  const next = sel < ESC_MAX ? ESCALATIONS[sel] : null;
  const climb = !next
    ? 'TOP OF THE LADDER'
    // demo: the rung past the cap isn't earnable here, so "put the boss down
    // to earn IV" would be a lie — name where the rest of the ladder lives
    : demoActive() && next.level > demoEscMax()
      ? 'RUNGS ' + ESC_ROMAN[demoEscMax() + 1] + '–' + ESC_ROMAN[ESC_MAX] + ' IN THE FULL GAME'
    : sel < unlocked
      ? 'NEXT ▸ ' + ESC_ROMAN[next.level] + ' · ' + next.name
      // rung 0 has no numeral to name, so it drops the "ON —" that would read
      // as a typo to the one player who most needs this line: a new one
      : 'LOCKED ▸ PUT THE BOSS DOWN' + (sel > 0 ? ' ON ' + ESC_ROMAN[sel] : '') +
        ' TO EARN ' + ESC_ROMAN[next.level];
  // the standing note that the ladder never picks your enemy. The DEMO pins the
  // roll to the Wehrmacht (rollEnemyFaction, js/state.js), so "rolled at random"
  // there promises three armies this build does not ship — and it is the only
  // line in the game that makes a claim about the roll.
  const enemy = demoActive() ? 'ENEMY: WEHRMACHT' : 'ENEMY: ROLLED AT RANDOM';
  return ESC_MAX + ' RUNGS · ' + sel + ' IN EFFECT · ' +
    (unlocked > 0 ? ESC_ROMAN[unlocked] + ' EARNED' : 'NONE EARNED') + ' · ' +
    escMultLabel(sel) + ' MEDALS\n' + climb + ' · ' + enemy;
}

// what the side of a row says. The rung you are set to is IN EFFECT; anything
// below it is in effect too but tapping DROPS you to it, and saying so is the
// whole reason a IX→II move is one tap here.
function escRowStateLabel(level, sel, state) {
  if (state === 'locked') {
    return demoActive() && level > demoEscMax() ? 'FULL GAME' : 'LOCKED';
  }
  if (level === sel) return 'IN EFFECT';
  return state === 'on' ? 'IN EFFECT · SET ▸' : 'SET ▸';
}

function buildEscDossier() {
  const data = loadEndlessCards();
  const unlocked = escEffectiveUnlocked(data);
  const sel = Math.min(data.escalation, unlocked);
  el('esc-dossier-sub').textContent = escDossierSubText(sel, unlocked);
  buildEscRungs(sel, unlocked, 'esc-dossier-rungs');

  const host = el('esc-dossier-rows');
  host.innerHTML = '';
  for (const mod of ESCALATIONS) {
    const state = escStateFor(mod.level, sel, unlocked);
    const locked = state === 'locked';
    // demo: rungs past the cap aren't CLASSIFIED (that promises they can be
    // earned here) — they name the full game instead
    const fgLocked = locked && demoActive() && mod.level > demoEscMax();
    // a locked row has no briefing to expand and no rung to set, so it is not a
    // button at all
    const row = document.createElement(locked ? 'div' : 'button');
    if (!locked) row.type = 'button';
    row.className = 'escd-row escd-row--' + state;
    row.dataset.rung = String(mod.level);
    row.innerHTML =
      '<span class="escd-row__num">' + ESC_ROMAN[mod.level] + '</span>' +
      '<span class="escd-row__copy">' +
        '<span class="escd-row__line">' +
          '<span class="escd-row__name">' + (fgLocked ? 'FULL GAME' : locked ? 'CLASSIFIED' : mod.name) + '</span>' +
          '<span class="escd-row__cat">' + mod.cat + '</span>' +
        '</span>' +
        // rung I is earned off rung 0, which has no numeral — naming it would
        // print "on Escalation —"
        '<span class="escd-row__desc">' + (fgLocked
          ? 'This rung is available in the full version.'
          : locked
          ? 'Put the boss down' + (mod.level > 1 ? ' on Escalation ' + ESC_ROMAN[mod.level - 1] : '') +
            ' to read these orders.'
          : mod.desc) + '</span>' +
        (locked ? '' :
          '<span class="escd-row__chev">▾ detail</span>' +
          '<span class="escd-row__full">' + mod.long + '</span>') +
      '</span>' +
      '<span class="escd-row__side">' +
        '<span class="escd-row__state">' + escRowStateLabel(mod.level, sel, state) + '</span>' +
        '<span class="escd-row__mult">' + escMultLabel(mod.level) + ' MEDALS</span>' +
      '</span>';
    if (!locked) {
      const chev = row.querySelector('.escd-row__chev');
      row.addEventListener('click', () => {
        chev.textContent = row.classList.toggle('escd-row--open') ? '▴ hide' : '▾ detail';
        pickEscalation(mod.level);
      });
    }
    host.appendChild(row);
  }
}

// A pick made from inside the dossier REPAINTS it rather than rebuilding it.
// Rebuilding would innerHTML the rows out from under the finger that just tapped
// one — the briefing the same tap opened would vanish, and every other expanded
// row would collapse. Nothing here changes the SHAPE of the list (a rung can't
// be earned from this screen), so only the state classes and labels can differ.
function refreshEscDossierStates() {
  const data = loadEndlessCards();
  const unlocked = escEffectiveUnlocked(data);
  const sel = Math.min(data.escalation, unlocked);
  el('esc-dossier-sub').textContent = escDossierSubText(sel, unlocked);
  buildEscRungs(sel, unlocked, 'esc-dossier-rungs');
  for (const row of el('esc-dossier-rows').children) {
    const level = Number(row.dataset.rung);
    const state = escStateFor(level, sel, unlocked);
    row.className = 'escd-row escd-row--' + state +
      (row.classList.contains('escd-row--open') ? ' escd-row--open' : '');
    row.querySelector('.escd-row__state').textContent = escRowStateLabel(level, sel, state);
  }
}

// the dossier LAYERS over the menu rather than swapping it out (the way the card
// shop and the leaderboards do) — it is a reference sheet you consult
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

// the one write path for the selection: the slab's arrows, the dossier's strip
// and its rows all land here, so the clamp and the rebuild live in one place.
// The menu underneath is repainted even though the dossier covers it, because
// closing the dossier is not a refresh — and the dossier is repainted (never
// rebuilt) whenever it is the thing that made the pick.
function pickEscalation(n) {
  const data = loadEndlessCards();
  const unlocked = escEffectiveUnlocked(data);
  const next = clamp(Math.floor(n), 0, unlocked);
  // The no-op test compares the rung the screen is SHOWING, not the stored one —
  // the same distinction stepEscalation makes below, and the last place the demo
  // clamp could escape READ-side. Under the cap a full-game blob still stores IX
  // while every surface reads III, so a tap on the III row (labelled IN EFFECT)
  // or the III chip (drawn --on) was `3 !== 9` and wrote the clamp straight
  // through to a blob ?demo=1 shares with the full game: one tap that changes
  // nothing on screen, and the full-game player comes back set to III. Picking a
  // DIFFERENT rung still writes — that is a choice the player made. In the full
  // game the two spellings are identical (the normalizer already clamps
  // escalation to escUnlocked), so this is a demo branch with no full-game term.
  if (next === Math.min(data.escalation, unlocked)) return;
  setEscalationLevel(next);
  SFX.click();
  buildEscalationUI();
  if (escDossierOpen()) refreshEscDossierStates();
}

function stepEscalation(delta) {
  // step from the rung the slab is SHOWING, which under the demo cap is not
  // necessarily the stored one — stepping from a stored IX under a III cap
  // clamps straight back to III and swallows the press
  const data = loadEndlessCards();
  pickEscalation(Math.min(data.escalation, escEffectiveUnlocked(data)) + delta);
}
