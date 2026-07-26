/* Trenchworks: WW2 — post-game After-Action Report.
   Tracks per-run battle statistics (fed by small hooks in damage/economy/
   shooting/events/input) and renders the "AFTER-ACTION REPORT" recap overlay
   that appears when a run ends, before the regular results / medal-ceremony
   screen. Part of a set of plain scripts sharing one global scope; load order
   is set in index.html. */
'use strict';

// honor-roll memory bound: very long endless runs can lose hundreds of men,
// so only the first N service records are kept (totals stay exact via lostByType)
const RECAP_FALLEN_CAP = 80;

function makeRecap() {
  return {
    killsByType: {},   // enemy type key -> confirmed kills
    killsByUs: {},     // friendly unit type -> kills it scored ('_indirect' = mines/strikes/unattributed)
    lostByType: {},    // friendly type key -> men lost
    lostTo: {},        // enemy type key -> our casualties it caused (attributed only)
    deployed: {},      // placeable key -> times placed through the real buy path
    fallen: [],        // service records of the dead: {name,type,label,rank,kills,healed,wave,turned}
    waveKills: [],     // kills per wave number (sparse; index = wave)
    events: {},        // event key -> times it fired
    tpEarned: 0,
    tpSpent: 0,
    shotsFired: 0,     // US rifle/MG rounds through fireShot
    firstBloodT: null, // sim time of the first kill
    prize: null,       // biggest bounty dropped: {type, reward, wave}
    usedNames: null,   // Set of surnames already issued this run
  };
}

/* ---- tracking hooks (each tolerates a missing recap so harness-built or
   mid-refactor states never throw) ---- */

function recapEnemyKilled(e, from) {
  const r = G && G.recap;
  if (!r) return;
  r.killsByType[e.type] = (r.killsByType[e.type] || 0) + 1;
  const w = Math.max(1, G.wave);
  r.waveKills[w] = (r.waveKills[w] || 0) + 1;
  if (r.firstBloodT == null) r.firstBloodT = G.time;
  if (!r.prize || (e.t.reward || 0) > r.prize.reward) {
    r.prize = { type: e.type, reward: e.t.reward || 0, wave: G.wave };
  }
  // per-man confirmed-kill tally for the MVP citation (kept separate from xp,
  // which the testing RANK UP ability can inflate), plus the per-type ledger.
  // Explosions from mines and support strikes pass a bare {x,y}, so anything
  // without a real US shooter goes to the '_indirect' bucket.
  if (from && from.side === 'us' && from.t) {
    if (!from.dead) from.recKills = (from.recKills || 0) + 1;
    r.killsByUs[from.type] = (r.killsByUs[from.type] || 0) + 1;
  } else {
    r.killsByUs._indirect = (r.killsByUs._indirect || 0) + 1;
  }
}

function recapUnitLost(u, from) {
  const r = G && G.recap;
  if (!r || u.side !== 'us' || u.isDummy) return;
  r.lostByType[u.type] = (r.lostByType[u.type] || 0) + 1;
  if (from && from.t && from.side !== 'us') {
    r.lostTo[from.type] = (r.lostTo[from.type] || 0) + 1;
  }
  if (r.fallen.length < RECAP_FALLEN_CAP) {
    r.fallen.push({
      name: recapName(u),
      type: u.type,
      label: u.t.name || u.type,
      rank: u.rank || 0,
      kills: u.recKills || 0,
      healed: u.healed || 0,
      wave: G.wave,
      turned: u.infected > 0,
    });
  }
}

function recapDeployed(p) {
  const r = G && G.recap;
  if (r) r.deployed[p.key] = (r.deployed[p.key] || 0) + 1;
}

function recapEvent(ev) {
  const r = G && G.recap;
  if (r) r.events[ev] = (r.events[ev] || 0) + 1;
}

/* ---- GI names: every soldier who earns a mention gets one, issued lazily
   and unique per run while the surname pool lasts ---- */

const RECAP_INITIALS = ['J.', 'R.', 'W.', 'E.', 'H.', 'T.', 'A.', 'F.', 'C.', 'D.', 'M.', 'G.', 'L.', 'P.', 'S.', 'V.', 'N.', 'B.'];
const RECAP_SURNAMES = [
  'Kowalski', 'Miller', "O'Rourke", 'Sullivan', 'Baker', 'Delgado', 'Novak',
  'Wysocki', 'Greco', 'Lindqvist', 'Callahan', 'Hayes', 'Brubaker', 'Costello',
  'Marsh', 'Whitfield', 'Dombrowski', 'Vance', 'Petersen', 'Ruiz', 'Napier',
  'Holt', 'McAllister', 'Sikorski', 'Boone', 'Tate', 'Farrell', 'Quigley',
  'Mercer', 'Ashby', 'Giordano', 'Fletcher', 'Okafor', 'Reyes', 'Stanton',
  'Pulaski', 'Webb', 'Donahue', 'Kaminski', 'Ford',
];

function recapName(u) {
  if (u.recName) return u.recName;
  const r = G && G.recap;
  const used = r ? (r.usedNames || (r.usedNames = new Set())) : new Set();
  let surname = pick(RECAP_SURNAMES);
  for (let i = 0; i < 12 && used.has(surname); i++) surname = pick(RECAP_SURNAMES);
  used.add(surname);
  u.recName = pick(RECAP_INITIALS) + ' ' + surname;
  return u.recName;
}

/* ---- rendering ---- */

// where CONTINUE leads: the endless medal ceremony or the plain results card
let recapNext = null;

function recapEsc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function recapTime(secs) {
  const t = Math.max(0, Math.floor(secs));
  return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
}

function recapPlaceableLabel(key) {
  const p = PLACEABLES.find(pl => pl.key === key);
  return p ? p.label.toLowerCase() : key;
}

function recapEnemyLabel(key) {
  const t = ENEMY_TYPES[key];
  return t ? t.name : key;
}

function recapUsLabel(key) {
  if (key === '_indirect') return 'Mines & strikes';
  const t = UNIT_TYPES[key];
  return t ? t.name : key;
}

function recapOppositionName() {
  const f = enemyFaction();
  return f === 'jp' ? 'Imperial Japanese Army'
    : f === 'zo' ? 'The Horde (undead)'
    : 'German Wehrmacht';
}

const RECAP_EVENT_LABELS = {
  fog: 'Fog bank', fng: 'FNG reinforcement', airraid: 'Air raid',
  smokescreen: 'Smokescreen',
  airstrike: 'P-47 strafing run', paradrop: 'Paradrop behind the line',
};

function recapEventLabel(ev) {
  if (ev === 'paradrop' && enemyFaction() === 'zo') return 'The dead rose behind the line';
  return RECAP_EVENT_LABELS[ev] || ev;
}

// the MVP pool: living soldiers with confirmed kills plus the honored dead
function recapMvp(r) {
  let best = null;
  const consider = (rec) => {
    if (rec.kills <= 0) return;
    if (!best || rec.kills > best.kills || (rec.kills === best.kills && rec.rank > best.rank)) best = rec;
  };
  for (const u of G.units) {
    if (u.dead || u.isDummy || !u.recKills) continue;
    consider({ name: recapName(u), label: u.t.name || u.type, rank: u.rank || 0,
      kills: u.recKills, dead: false });
  }
  for (const f of r.fallen) consider({ ...f, dead: true });
  return best;
}

// best medic by HP restored, dead or alive
function recapTopMedic(r) {
  let best = null;
  const consider = (rec) => {
    if (rec.healed < 100) return;
    if (!best || rec.healed > best.healed) best = rec;
  };
  for (const u of G.units) {
    if (u.dead || !u.healed) continue;
    consider({ name: recapName(u), label: u.t.name || u.type, healed: u.healed, dead: false });
  }
  for (const f of r.fallen) consider({ ...f, dead: true });
  return best;
}

// one dry line from the war correspondent, picked from whatever the numbers earned
function recapRemark(r, won, totals) {
  const spk = totals.kills > 0 ? r.shotsFired / totals.kills : 0;
  if (totals.kills === 0) return 'No confirmed kills. The report is short because the battle was.';
  if (totals.lost === 0 && totals.kills >= 20) return 'Not one man lost. The quartermaster wants to know how.';
  if (totals.turned > 0) {
    return totals.turned === 1
      ? 'One name on this roll finished the battle on the other side of it.'
      : `${totals.turned} names on this roll finished the battle on the other side of it.`;
  }
  if (spk > 150) return 'Ammunition was treated as a renewable resource.';
  if (G.breaches >= 10) return 'The wire needs work. So does everything behind it.';
  if (won) return 'The line held. The paperwork, as always, survived everything.';
  if (G.wave >= 30) return `${G.wave} waves is a number the replacements will hear about.`;
  return 'The sector changed hands. The mud did not notice.';
}

function recapSection(html, delay) {
  return `<div class="aar-reveal" style="animation-delay:${delay}s">${html}</div>`;
}

function showRecap(won, nextId) {
  recapNext = nextId;
  const r = G.recap || makeRecap();

  const totals = {
    kills: G.kills,
    lost: Object.values(r.lostByType).reduce((a, b) => a + b, 0),
    turned: r.fallen.filter(f => f.turned).length,
  };
  const survivors = G.units.filter(u => !u.dead && !u.isDummy).length;
  let d = 0.15;                 // rolling reveal delay
  const next = (step = 0.18) => (d += step) - step;
  const parts = [];

  // -- letterhead + verdict stamp. The stamp shares a flex row with the
  //    masthead rather than floating over it, so long strip text can't collide.
  const fileNo = '2/' + String(Math.max(1, G.wave)).padStart(2, '0') + '/' +
    String(Math.floor(G.time) % 1000).padStart(3, '0');
  parts.push(recapSection(
    `<div class="aar-strip">FIELD COPY · HQ 2ND BATTALION · NOT FOR CIRCULATION</div>
     <div class="aar-head">
       <div class="aar-head-main">
         <h1 class="aar-title">AFTER-ACTION REPORT</h1>
         <div class="aar-file">FILE No. ${fileNo} · TYPED IN THE FIELD · 1 OF 1</div>
       </div>
       <div class="aar-stamp ${won ? 'held' : 'lost'}">${won ? 'SECTOR HELD' : 'OVERRUN'}</div>
     </div>`,
    next()));

  // -- typed meta block --
  const diffName = G.difficulty ? G.difficulty.name : '—';
  parts.push(recapSection(
    `<div class="aar-meta">
       <div><span>SECTOR</span>${recapEsc(G.level.name || 'Forward line')}</div>
       <div><span>OPPOSITION</span>${recapEsc(recapOppositionName())}</div>
       <div><span>POSTURE</span>${recapEsc(diffName)}</div>
       <div><span>ENGAGEMENT</span>${won ? 'All waves repelled' : `Line overrun, wave ${G.wave}`}</div>
     </div>`,
    next()));

  // -- headline numbers --
  const spk = totals.kills > 0 && r.shotsFired > 0 ? Math.round(r.shotsFired / totals.kills) : null;
  // third field tints the tile: the four headline figures carry the verdict,
  // the four ledger figures stay neutral
  const tiles = [
    ['WAVES HELD', G.wave, 'hero'],
    ['TIME IN ACTION', recapTime(G.time), 'hero'],
    ['CONFIRMED KILLS', totals.kills, 'good'],
    ['MEN LOST', totals.lost, totals.lost ? 'bad' : 'good'],
    ['ROUNDS EXPENDED', r.shotsFired, ''],
    ['ROUNDS / KILL', spk == null ? '—' : spk, ''],
    ['TP RAISED', Math.floor(r.tpEarned), ''],
    ['TP SPENT', Math.floor(r.tpSpent), ''],
  ];
  parts.push(recapSection(
    `<div class="aar-tiles">` + tiles.map(([k, v, tone]) =>
      `<div class="aar-tile ${tone}"><b>${recapEsc(v)}</b><span>${k}</span></div>`).join('') + `</div>`,
    next()));

  // -- the two kill ledgers, side by side: what we shot vs who did the shooting --
  const barList = (entries, labelFn, cls, emptyMsg) => {
    if (!entries.length) return `<p class="aar-none">${emptyMsg}</p>`;
    const max = entries[0][1];
    return entries.map(([key, n]) =>
      `<div class="aar-bar-row"><i>${recapEsc(labelFn(key))}</i>
         <div class="aar-bar"><div class="aar-bar-fill${cls}" style="width:${Math.max(4, Math.round(n / max * 100))}%"></div></div>
         <b>${n}</b></div>`).join('');
  };
  const lossHtml = barList(
    Object.entries(r.killsByType).sort((a, b) => b[1] - a[1]).slice(0, 7),
    recapEnemyLabel, '', 'No enemy losses recorded.');
  const gunsHtml = barList(
    Object.entries(r.killsByUs || {}).sort((a, b) => b[1] - a[1]).slice(0, 7),
    recapUsLabel, ' us', 'No kills credited.');

  const lastWave = Math.max(1, G.wave);
  const firstWave = Math.max(1, lastWave - 29);
  let tempoHtml = '';
  let maxTempo = 1;
  let peakWave = firstWave;
  for (let w = firstWave; w <= lastWave; w++) {
    if ((r.waveKills[w] || 0) > maxTempo) { maxTempo = r.waveKills[w]; peakWave = w; }
  }
  for (let w = firstWave; w <= lastWave; w++) {
    const n = r.waveKills[w] || 0;
    const hp = Math.max(4, Math.round(n / maxTempo * 100));
    // the busiest wave is called out in gold so the chart has a reading anchor
    tempoHtml += `<div class="aar-tempo-bar${w === peakWave && n > 0 ? ' peak' : ''}" style="height:${hp}%" title="wave ${w}: ${n} kill${n === 1 ? '' : 's'}"></div>`;
  }
  const tempoAxis = `<div class="aar-tempo-axis"><span>WAVE ${firstWave}</span>` +
    (maxTempo > 1 ? `<span class="peak">HEAVIEST: WAVE ${peakWave}, ${maxTempo} KILLS</span>` : '<span></span>') +
    `<span>WAVE ${lastWave}</span></div>`;
  parts.push(recapSection(
    `<div class="aar-cols">
       <div class="aar-col"><h3>ENEMY LOSSES BY TYPE</h3>${lossHtml}</div>
       <div class="aar-col"><h3>KILLS BY OUR GUNS</h3>${gunsHtml}</div>
     </div>`,
    next()));
  parts.push(recapSection(
    `<div class="aar-tempo-wrap"><h3>TEMPO OF BATTLE <small>kills/wave${firstWave > 1 ? ', last 30' : ''}</small></h3>
       <div class="aar-tempo">${tempoHtml}</div>${tempoAxis}</div>`,
    next()));

  // -- citations --
  const cits = [];
  const mvp = recapMvp(r);
  if (mvp && mvp.kills >= 3) {
    const rank = RANKS[Math.min(mvp.rank, RANKS.length - 1)].name;
    cits.push(`<div class="aar-cit"><span>DISTINGUISHED SERVICE</span>
      ${rank} ${recapEsc(mvp.name)}, ${recapEsc(mvp.label)} — ${mvp.kills} confirmed kills.
      ${mvp.dead ? `Killed in action, wave ${mvp.wave}. Citation awarded posthumously.` : 'Still standing with the line.'}</div>`);
  }
  const medic = recapTopMedic(r);
  if (medic) {
    cits.push(`<div class="aar-cit"><span>MEDICAL CORPS CITATION</span>
      Doc ${recapEsc(medic.name)} — ${Math.round(medic.healed)} HP patched, plasma bag by plasma bag.
      ${medic.dead ? 'Did not make it out.' : 'Still making rounds.'}</div>`);
  }
  if (r.prize && r.prize.reward >= 8) {
    cits.push(`<div class="aar-cit"><span>PRIZE KILL</span>
      ${recapEsc(recapEnemyLabel(r.prize.type))} destroyed, wave ${r.prize.wave} — the biggest bounty of the day.</div>`);
  }
  const nemesis = Object.entries(r.lostTo).sort((a, b) => b[1] - a[1])[0];
  if (nemesis && nemesis[1] >= 3) {
    cits.push(`<div class="aar-cit threat"><span>CHIEF THREAT</span>
      Enemy ${recapEsc(recapEnemyLabel(nemesis[0]))} — responsible for ${nemesis[1]} of our casualties.</div>`);
  }
  if (cits.length) {
    parts.push(recapSection(`<div class="aar-cits"><h3>CITATIONS & ASSESSMENTS</h3>${cits.slice(0, 3).join('')}</div>`, next()));
  }

  // -- honor roll --
  const shown = r.fallen.slice(0, 12);
  const extra = totals.lost - shown.length;
  const honorHtml = totals.lost === 0
    ? `<p class="aar-none">No men lost. Every name that marched out marched back.</p>`
    : `<div class="aar-honor-list">` + shown.map(f => {
        const rank = RANKS[Math.min(f.rank, RANKS.length - 1)].name;
        return `<div class="aar-honor-name${f.turned ? ' turned' : ''}">${rank} ${recapEsc(f.name)}<small>${recapEsc(f.label)}, wave ${f.wave}${f.turned ? ' — turned' : ''}</small></div>`;
      }).join('') + `</div>` +
      (extra > 0 ? `<p class="aar-none">…and ${extra} more. The full roll is with Graves Registration.</p>` : '');
  parts.push(recapSection(
    `<div class="aar-honor"><h3>HONOR ROLL</h3>${honorHtml}
     <p class="aar-none">Survivors on the line at end of action: ${survivors}.</p></div>`,
    next()));

  // -- logistics & events footnote --
  const depRows = Object.entries(r.deployed).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([k, n]) => `${n}× ${recapPlaceableLabel(k)}`).join(' · ');
  const evRows = Object.entries(r.events)
    .map(([k, n]) => recapEventLabel(k) + (n > 1 ? ` ×${n}` : '')).join(' · ');
  parts.push(recapSection(
    `<div class="aar-foot-notes">
       <div><span>REQUISITIONS</span>${depRows ? recapEsc(depRows) : 'none logged'}</div>
       <div><span>EVENTS LOGGED</span>${evRows ? recapEsc(evRows) : 'no unusual activity'}</div>
     </div>
     <blockquote class="aar-remark">${recapEsc(recapRemark(r, won, totals))}
       <cite>war correspondent, attached 2nd Battalion</cite></blockquote>`,
    next()));

  // -- continue --
  parts.push(recapSection(
    `<button id="aar-continue">${nextId === 'endless-endgame' ? 'CONTINUE TO DEBRIEF ▸' : 'CONTINUE ▸'}</button>`,
    next(0.1)));

  const doc = el('aar-doc');
  doc.innerHTML = parts.join('');
  el('aar-continue').addEventListener('click', recapContinue);
  const ov = el('recap');
  ov.scrollTop = 0;
  ov.classList.remove('hidden');
}

// hand off to the screen this run's mode actually ends on: the endless medal
// ceremony (shown now so its count-up plays on screen) or the plain results card
function recapContinue() {
  SFX.click();
  el('recap').classList.add('hidden');
  if (recapNext === 'endless-endgame') showEndlessEndgame();
  el(recapNext || 'gameover').classList.remove('hidden');
  recapNext = null;
}
