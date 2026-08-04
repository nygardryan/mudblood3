/* Trenchworks: WW2 — single-slot run save (SAVE AND EXIT / CONTINUE).
   Part of a set of plain scripts sharing one global scope; load order is set in index.html.

   One localStorage slot (RUN_SAVE_KEY), own version constant — deliberately NOT
   riding the endlessCards blob, which is re-parsed on every newGame and every
   medal award; a run snapshot is orders of magnitude bigger.

   Why this is a whitelist serializer and not JSON.stringify(G): the boss
   parent/part links are true cycles (p.shipOf / trainOf / bossOf point back at
   an actor that lists them — stringify THROWS), every actor carries its whole
   `t` type record, Sets (cardsOwned, dummyBlind, awHit, recap.usedNames)
   silently round-trip as {}, a corpse's baked _sprite keeps a valid-looking
   `ss` so the rebake guard passes and drawImage({}) throws at render, and
   G.level holds a setup() function plus the entire PLACEABLES array. So:
   actors are packed with refs re-encoded as indices, and the load path
   re-links them — object identity restored, so e.parts[n] IS G.enemies[m]
   again, which everything from syncTrainParts to damage redirects relies on.

   Corruption stance (the loadEndlessCards pattern, js/cards.js): parse under
   try/catch, blanket-discard on version mismatch, and deserializeRun() THROWS
   on any structural failure — unknown type key, out-of-range index, orphaned
   boss part. The thrower builds into a local `g`; the global G is assigned
   only after every check passes, so a bad save can never leave a half-linked
   field. Every discard is silent to the player: the CONTINUE card just isn't
   there. Non-structural data (scalars, card ids, stamp records) is tolerated
   per-field with defaults/filters instead. */
'use strict';

const RUN_SAVE_KEY = 'twRunSave';
// v2: the landscape flip — every saved coordinate's axes changed meaning
// (x = depth, y = lateral), so v1 blobs are discarded wholesale on load.
// v3: the field grew from 620x540 to 880x460 — old positions (especially
// lateral ones, now scaled against a shorter H) would resume into nonsense,
// so v2 blobs discard the same way v1 does.
// v4: DEPLOY_X/FORWARD_X moved from 380/207 to 587/293 for the even-thirds
// zone rebalance — a v3 save's defense line would resume sitting in the
// middle of the new no-man's-land instead of the deploy zone, so v3 blobs
// discard the same way.
// v5: DEPLOY_X/FORWARD_X moved again, to 502/251, widening the deploy zone
// to ~43% of the field — same reasoning as v4, discard the same way.
// v6: H shrank from 460 to 406 (the cover-zoom phone-ratio fit — see the W/H
// comment in constants.js). Saved lateral positions up to 460 would resume
// off the bottom of the new field, so v5 blobs discard the same way.
const RUN_SAVE_VERSION = 6;

// undefined = not read yet, null = no (or discarded) save, object = parsed blob.
// The menu reads this cache — never re-parses the full blob per refresh.
let runSaveCache;

// ---- what a run save is allowed to contain -------------------------------

// Per-actor fields that never ride a save. An explicit list, NOT an
// underscore-prefix rule: e._burst (the bloater's died-once guard) is
// load-bearing state and must survive the round trip. Everything here is
// either a frame-keyed cache that self-heals (_tgt, _buffs, _spotted...), a
// live actor ref that the next tick re-picks (flameTarget, mgTarget), a baked
// canvas (_sprite), or a ref/Set re-encoded separately below.
const SAVE_STRIP = new Set([
  't', '_sprite',
  '_tgt', '_tgtUntil', '_laserTgt', '_camoNest', '_camoFrame', '_buffs', '_buffsFrame',
  '_spotted', '_spotFrame', '_repairCount', '_repairCountFrame',
  'flameTarget', 'mgTarget', 'awHit',
  // the Charger's once-per-charge trample Set — live unit refs, rebuilt lazily
  // by stepChargerRam on resume (a mid-charge save may clip a man twice)
  'ramHit',
  // boss parent/part links and work links — re-encoded as indices
  'parts', 'turrets', 'mounts', 'pods', 'wagon', 'arty',
  'shipOf', 'trainOf', 'bossOf', 'garrison', 'work',
  // Sets of dummy ids — re-encoded as arrays
  'dummySeen', 'dummyBlind',
]);

// G scalars that ride the save, with the default a non-finite value falls
// back to on load (the per-field tolerance of loadEndlessCards).
const SAVE_SCALARS = {
  tp: 15, wave: 0, kills: 0, medalsEarned: 0, breaches: 0, time: 0,
  bossKills: 0, spawnTimer: 6, tpTrickle: TP_TRICKLE_INTERVAL, officerTick: 30,
  eventTimer: 50, fog: 0, fogAge: 0, itFrontX: IT_FRONT_X_START, itTick: 0, itCharge: 0,
  itAvantiCd: 30, itLastAvanti: -999, buffFrame: 0,
};

// the projectile arrays whose entries carry a `by` firer ref
const SAVE_PROJECTILES = ['shells', 'grenades', 'rockets', 'biles', 'flak'];
// emplacement/effect arrays that are already plain JSON literals
const SAVE_PLAIN_ARRAYS = ['sandbags', 'bunkers', 'wires', 'mines', 'watchtowers',
  'camoNests', 'ammoCrates', 'itWorks', 'smoke', 'smokePots', 'groundMarks'];

const SAVE_FACTIONS = ['de', 'jp', 'zo', 'it'];

function saveableRun() {
  return running && G && !G.over && G.level.id === 'endless';
}

// ---- serialize -----------------------------------------------------------

function packActor(a) {
  const rec = {};
  for (const k in a) {
    if (!SAVE_STRIP.has(k)) rec[k] = a[k];
  }
  if (a.dummySeen) rec.dummySeen = [...a.dummySeen];
  if (a.dummyBlind) rec.dummyBlind = [...a.dummyBlind];
  return rec;
}

// `by` on a projectile: kept as a live ref where the firer is still on the
// field, otherwise a stub carrying what the consumers actually read —
// ESCALATION rung IV keys on by.side, rocket armorMult on by.t, the frag
// shrapnel gate on by.type. Dropping it instead would silently exempt every
// in-flight enemy shell from rung IV (the exact bug the explode() fix closed).
function packBy(by, unitIdx, enemyIdx) {
  if (!by) return null;
  let i = unitIdx.get(by);
  if (i != null) return { u: i };
  i = enemyIdx.get(by);
  if (i != null) return { e: i };
  return { stub: { side: by.side || null, x: by.x, y: by.y, type: by.type || null } };
}

function serializeRun() {
  // The enemy UNION list: G.enemies in order, then any dead boss parts that
  // live only in a parent's parts/pods (compactInPlace splices the dead out of
  // G.enemies, but the Yamato's damage control revives from e.parts and dead
  // train wagons stay coupled and drawn). Every cross-ref below is an index
  // into this union, which is what lets the load path restore object identity.
  const union = [...G.enemies];
  const enemyIdx = new Map();
  union.forEach((e, i) => enemyIdx.set(e, i));
  for (const e of G.enemies) {
    for (const list of [e.parts, e.pods]) {
      if (!list) continue;
      for (const p of list) {
        if (!enemyIdx.has(p)) { enemyIdx.set(p, union.length); union.push(p); }
      }
    }
  }
  const unitIdx = new Map();
  G.units.forEach((u, i) => unitIdx.set(u, i));

  const packEnemy = (e, inField) => {
    const rec = packActor(e);
    if (!inField) rec.inField = false;
    if (e.parts) rec.parts = e.parts.map(p => enemyIdx.get(p));
    if (e.turrets) rec.turrets = e.turrets.map(p => enemyIdx.get(p));
    if (e.mounts) rec.mounts = e.mounts.map(p => enemyIdx.get(p));
    if (e.pods) rec.pods = e.pods.map(p => enemyIdx.get(p));
    if (e.wagon) rec.wagon = enemyIdx.get(e.wagon);
    if (e.arty) rec.arty = enemyIdx.get(e.arty);
    if (e.shipOf) rec.shipOf = enemyIdx.get(e.shipOf);
    if (e.trainOf) rec.trainOf = enemyIdx.get(e.trainOf);
    if (e.bossOf) rec.bossOf = enemyIdx.get(e.bossOf);
    // a link to a work no longer in the array (shouldn't happen — release
    // clears it) is dropped rather than saved as -1 and rejected at resume
    const gi = e.garrison ? G.itWorks.indexOf(e.garrison) : -1;
    if (gi >= 0) rec.garrison = gi;
    const wi = e.work ? G.itWorks.indexOf(e.work) : -1;
    if (wi >= 0) rec.work = wi;
    return rec;
  };

  const run = {
    levelId: G.level.id,
    difficultyId: G.difficulty.id,
    escLevel: G.esc.level || 0,
    enemyFaction: G.enemyFaction,
    cards: G.cardsOwned ? [...G.cardsOwned] : [],
    dummySeq,
    scalars: {},
    wind: { dir: G.wind.dir, speed: G.wind.speed },
    units: G.units.map(packActor),
    enemies: union.map((e, i) => packEnemy(e, i < G.enemies.length)),
    dummies: G.dummies.map(packActor),
    planes: G.planes.map(p => { const rec = packActor(p); delete rec.target; return rec; }),
    corpses: G.corpses.map(packActor),
    recap: { ...G.recap, usedNames: G.recap.usedNames ? [...G.recap.usedNames] : null },
    groundStamps: G.groundStamps || [],
  };
  for (const k of Object.keys(SAVE_SCALARS)) run.scalars[k] = G[k];
  for (const k of SAVE_PLAIN_ARRAYS) run[k] = G[k];
  for (const k of SAVE_PROJECTILES) {
    run[k] = G[k].map(s => {
      const rec = packActor(s);
      rec.by = packBy(s.by, unitIdx, enemyIdx);
      return rec;
    });
  }
  return {
    version: RUN_SAVE_VERSION,
    meta: {
      wave: G.wave, faction: G.enemyFaction, escLevel: G.esc.level || 0,
      difficultyId: G.difficulty.id, time: Math.floor(G.time), savedAt: Date.now(),
    },
    run,
  };
}

// ---- slot read/write -----------------------------------------------------

function writeRunSave() {
  try {
    // storage.set swallows the quota throw itself and reports it as false —
    // it must be checked here, or SAVE AND EXIT walks off a run it never saved
    if (!PLATFORM.storage.set(RUN_SAVE_KEY, JSON.stringify(serializeRun()))) {
      console.warn('run save failed: storage write rejected (quota/unavailable)');
      return false;
    }
    // drop the cache rather than keep the blob: its plain arrays alias live
    // game objects, and a cached alias would drift if the run keeps going
    runSaveCache = undefined;
    return true;
  } catch (err) {
    // serialization bug — the run must not exit on this either
    console.warn('run save failed:', err);
    return false;
  }
}

function clearRunSave() {
  PLATFORM.storage.remove(RUN_SAVE_KEY);
  runSaveCache = null;
}

function readRunSave() {
  if (runSaveCache !== undefined) return runSaveCache;
  let blob = null;
  try {
    const raw = PLATFORM.storage.get(RUN_SAVE_KEY);
    blob = raw ? JSON.parse(raw) : null;
  } catch (err) { blob = null; }
  // blanket discard on any unknown version or malformed top level — an old
  // save after an update is exactly the corruption this feature must shrug off
  if (!blob || typeof blob !== 'object' || blob.version !== RUN_SAVE_VERSION ||
      !blob.meta || typeof blob.meta !== 'object' ||
      !blob.run || typeof blob.run !== 'object') {
    if (blob !== null || PLATFORM.storage.get(RUN_SAVE_KEY) != null) {
      console.warn('run save discarded (version/shape mismatch)');
      clearRunSave();
    }
    blob = null;
  }
  runSaveCache = blob;
  return blob;
}

function hasRunSave() {
  return readRunSave() !== null;
}

// ---- deserialize / re-link / validate ------------------------------------

// Throws on ANY structural failure; the caller ditches the whole save. Builds
// into a local `g` — the global G is only assigned after this returns.
function deserializeRun(run) {
  const fail = (msg) => { throw new Error('run save rejected: ' + msg); };
  const num = (v, def) => Number.isFinite(v) ? v : def;
  // tolerant: for per-actor optionals that are absent in the ordinary case
  const arr = (v) => Array.isArray(v) ? v : [];
  // STRUCTURAL: serializeRun always writes these, and they hold the run itself
  // (several are index targets). A field that isn't an array — or a missing
  // scalars block — is corruption, not an absent optional, and defaulting it
  // would resume a wave-40 board with no enemies, or at wave 0. That is a worse
  // outcome than ditching, which is the whole promise of this feature.
  const reqArr = (v, what) => { if (!Array.isArray(v)) fail(what + ' is not an array'); return v; };

  if (run.levelId !== 'endless' || !LEVELS.endless) fail('unknown level ' + run.levelId);
  const level = LEVELS.endless;
  const difficulty = ENDLESS_DIFFICULTIES[run.difficultyId];
  if (!difficulty) fail('unknown difficulty ' + run.difficultyId);
  if (!SAVE_FACTIONS.includes(run.enemyFaction)) fail('unknown faction ' + run.enemyFaction);
  if (!run.scalars || typeof run.scalars !== 'object') fail('scalars block missing');

  // -- actors: type must resolve, core numbers must be finite --
  const unpack = (rec, table, what) => {
    if (!rec || typeof rec !== 'object') fail('malformed ' + what + ' record');
    const t = table[rec.type];
    if (!t) fail('unknown ' + what + ' type ' + rec.type);
    if (!Number.isFinite(rec.x) || !Number.isFinite(rec.y) || !Number.isFinite(rec.hp)) {
      fail(what + ' ' + rec.type + ' has non-finite position/hp');
    }
    const a = { ...rec, t };
    if (rec.dummySeen) a.dummySeen = new Set(arr(rec.dummySeen));
    if (rec.dummyBlind) a.dummyBlind = new Set(arr(rec.dummyBlind));
    // the walker's once-per-sweep Set is created in initAlienWalker and read
    // unguarded mid-sweep — a resumed mid-sweep walker needs it back
    if (rec.type === 'awalker') a.awHit = new Set();
    return a;
  };

  const units = reqArr(run.units, 'units').map(r => unpack(r, UNIT_TYPES, 'unit'));
  const unionRecs = reqArr(run.enemies, 'enemies');
  const union = unionRecs.map(r => unpack(r, ENEMY_TYPES, 'enemy'));

  // strict, not filtered: garrison/work links are saved as INDICES into this
  // array, so silently dropping a malformed row would shift every link after it
  const itWorks = reqArr(run.itWorks, 'itWorks').map(w => {
    if (!w || typeof w !== 'object' || !IT_WORK_KINDS[w.kind] ||
        !Number.isFinite(w.x) || !Number.isFinite(w.y) || !Number.isFinite(w.hp)) {
      fail('malformed work record');
    }
    return { ...w };
  });

  // -- re-link the enemy graph; every index must resolve --
  const atUnion = (i) => {
    if (!Number.isInteger(i) || i < 0 || i >= union.length) fail('bad enemy index ' + i);
    return union[i];
  };
  const atWork = (i) => {
    if (!Number.isInteger(i) || i < 0 || i >= itWorks.length) fail('bad work index ' + i);
    return itWorks[i];
  };
  union.forEach((e, i) => {
    const rec = unionRecs[i];
    if (rec.parts) e.parts = arr(rec.parts).map(atUnion);
    if (rec.turrets) e.turrets = arr(rec.turrets).map(atUnion);
    if (rec.mounts) e.mounts = arr(rec.mounts).map(atUnion);
    if (rec.pods) e.pods = arr(rec.pods).map(atUnion);
    if (rec.wagon != null) e.wagon = atUnion(rec.wagon);
    if (rec.arty != null) e.arty = atUnion(rec.arty);
    if (rec.shipOf != null) e.shipOf = atUnion(rec.shipOf);
    if (rec.trainOf != null) e.trainOf = atUnion(rec.trainOf);
    if (rec.bossOf != null) e.bossOf = atUnion(rec.bossOf);
    if (rec.garrison != null) e.garrison = atWork(rec.garrison);
    if (rec.work != null) e.work = atWork(rec.work);
  });

  // -- part-link verification, both directions: a parent's children must
  // back-ref exactly it, its named part lists must be members of e.parts, and
  // no isBossPart actor may be an orphan. A half-linked boss is the one state
  // this game can never recover from mid-run — ditch the save instead.
  for (const e of union) {
    if (e.parts || e.pods) {
      const children = e.parts || e.pods;
      if (!children.length) fail('boss ' + e.type + ' has no parts');
      // one actor listed twice would be driven and drawn twice from one sync
      if (new Set(children).size !== children.length) fail('duplicate part on ' + e.type);
      for (const p of children) {
        if ((p.shipOf || p.trainOf || p.bossOf) !== e) fail('part back-ref mismatch on ' + e.type);
      }
      const inParts = (p) => { if (!children.includes(p)) fail('named part outside parts list on ' + e.type); };
      for (const p of e.turrets || []) inParts(p);
      for (const p of e.mounts || []) inParts(p);
      if (e.wagon) inParts(e.wagon);
      if (e.arty) inParts(e.arty);
    }
    if (isBossPart(e.t) && !(e.shipOf || e.trainOf || e.bossOf)) {
      fail('orphaned boss part ' + e.type);
    }
  }

  // only actors that were actually on the field re-enter G.enemies; the rest
  // (dead boss parts) live on solely through their parent's parts/pods lists
  const enemies = union.filter((e, i) => unionRecs[i].inField !== false);

  const dummies = reqArr(run.dummies, 'dummies').map(r => {
    if (!r || !Number.isFinite(r.x) || !Number.isFinite(r.y) || !Number.isFinite(r.id)) {
      fail('malformed dummy record');
    }
    return { ...r, t: DUMMY_T };
  });

  const unpackBy = (code) => {
    if (code == null) return null;
    if (code.u != null) {
      if (!Number.isInteger(code.u) || code.u < 0 || code.u >= units.length) fail('bad by-unit index');
      return units[code.u];
    }
    if (code.e != null) return atUnion(code.e);
    if (code.stub && typeof code.stub === 'object') {
      const s = code.stub;
      return { side: s.side, x: num(s.x, 0), y: num(s.y, 0), type: s.type,
               t: UNIT_TYPES[s.type] || ENEMY_TYPES[s.type] || undefined };
    }
    fail('malformed projectile firer');
  };

  // -- assemble G, mirroring the newGame literal --
  const esc = buildEscMods(num(run.escLevel, 0));
  // demo: the run's own loadout, minus anything this build doesn't sell. A
  // full-game 'de' save IS resumable here (only the other three armies are
  // blocked), so without this the whole card gate is one SAVE AND EXIT away
  // from being bypassed — the same reason the rung above resumes clamped
  // rather than at whatever the blob stored.
  const cards = demoOwnedCards(arr(run.cards).filter(id => CARDS[id]));
  const recapIn = (run.recap && typeof run.recap === 'object') ? run.recap : {};
  const g = {
    level, mode: level.mode, difficulty, esc,
    over: false,
    units, enemies, itWorks, dummies,
    // planes are ad-hoc records (no type table), not actors — plain data
    planes: reqArr(run.planes, 'planes').filter(p => p && typeof p === 'object' &&
      Number.isFinite(p.x) && Number.isFinite(p.y)),
    corpses: reqArr(run.corpses, 'corpses').filter(c => c && typeof c === 'object' &&
      Number.isFinite(c.x) && Number.isFinite(c.y)),
    wind: (run.wind && Number.isFinite(run.wind.dir) && Number.isFinite(run.wind.speed))
      ? { dir: run.wind.dir, speed: run.wind.speed } : rollWind(),
    // ephemera dropped at save time
    shrapnel: [], tracers: [], particles: [], flashes: [], texts: [], gibs: [],
    smokeBox: null, banner: null, shake: 0,
    selected: [], focusTarget: null, usOfficers: [], deOfficers: [],
    auraRefresh: 0,   // force the officer-aura recount on the first tick
    recap: Object.assign(makeRecap(), recapIn, {
      usedNames: recapIn.usedNames ? new Set(arr(recapIn.usedNames)) : null,
    }),
    groundStamps: arr(run.groundStamps).filter(r => r && GROUND_STAMP_REPLAY[r.k] &&
      Number.isFinite(r.x) && Number.isFinite(r.y)),
  };
  for (const [k, def] of Object.entries(SAVE_SCALARS)) g[k] = num(run.scalars && run.scalars[k], def);
  g.phase = 'combat';
  for (const k of SAVE_PLAIN_ARRAYS) {
    if (k === 'itWorks') continue;
    g[k] = reqArr(run[k], k).filter(o => o && typeof o === 'object' &&
      Number.isFinite(o.x) && Number.isFinite(o.y));
  }
  for (const k of SAVE_PROJECTILES) {
    g[k] = reqArr(run[k], k).map(r => {
      if (!r || !Number.isFinite(r.x) || !Number.isFinite(r.y)) fail('malformed ' + k + ' record');
      return { ...r, by: unpackBy(r.by) };
    });
  }
  g.enemyFaction = run.enemyFaction;
  // the run's own loadout, not whatever plan is equipped in the menu now
  g.cardsOwned = new Set(cards);
  g.cardHooks = buildCardHooks(cards);

  // decoy ids key every enemy's dummyBlind Set — new decoys must not collide
  let maxDummyId = num(run.dummySeq, 0);
  for (const d of g.dummies) maxDummyId = Math.max(maxDummyId, d.id);
  dummySeq = maxDummyId;

  return g;
}

// ---- entry points --------------------------------------------------------

// The mobile lifecycle autosave. A backgrounded app can be killed by the OS
// at any moment with no further notice — iOS especially — and SAVE AND EXIT
// is a menu the OS never opens, so before this existed a phone call mid-run
// lost the run. platform.js's mobile shell wires Capacitor's
// appStateChange(isActive:false) here (typeof-guarded, the handleAndroidBack
// pattern); it fires on iOS willResignActive / Android onStop, early enough
// that the synchronous localStorage write always lands and the async
// Preferences mirror almost always does.
//
// saveableRun() is the whole gate: menus, tutorials, ended runs and ATTRACT
// MODE (which never sets `running` — its no-localStorage invariant must hold)
// all fall through without a write. The pause is not just courtesy — the
// webview's rAF is about to be throttled to a standstill anyway, so pausing
// makes the freeze honest and the player returns to PAUSED instead of to
// mid-combat; it is a no-op when already paused (the boss-victory freeze
// included, which sets `paused` via freezeField).
//
// This deliberately does NOT delete the slot on foreground return. The slot
// already outlives a resumed run (continueRun never deletes it; only endRun
// and the abandon prompt do), so its contract is "the latest checkpoint" —
// an OS-initiated write is the same contract with a fresher blob. A failed
// write stays a console.warn: nobody is looking at a backgrounded screen,
// and the run itself is still live.
function handleAppBackground() {
  // pause first and unconditionally: pauseGame guards itself (no-op unless a
  // live, unpaused fight), so tutorials get the courtesy pause too even
  // though only endless runs pass the save gate below
  pauseGame();
  if (!saveableRun()) return;
  writeRunSave();
}

function saveAndExit() {
  if (!paused || !saveableRun()) return;
  if (writeRunSave()) {
    returnToMenu();
  } else {
    // stay on the pause menu: silently losing the run is worse than an ugly
    // button. pauseGame resets the label next time it opens.
    el('pause-save-btn').textContent = 'SAVE FAILED';
  }
}

function continueRun() {
  const blob = readRunSave();
  if (!blob) { refreshContinueUI(); return; }
  // demo: a non-'de' save is hidden, not resumable — and never deleted
  if (demoBlockedSave(blob)) { refreshContinueUI(); return; }
  let g;
  try {
    g = deserializeRun(blob.run);
  } catch (err) {
    console.warn('run save discarded:', err);
    clearRunSave();
    refreshContinueUI();
    return;
  }
  // the resumed run now mutates objects the parsed blob still references —
  // drop the cache so a later read reparses the canonical stored string
  runSaveCache = undefined;
  SFX.resume();
  clearGhostBufCache();   // the run's loadout may differ from the last one drawn
  G = g;
  // same ordering as newGame (js/state.js): ground first (the biome keys off
  // G.enemyFaction, already in G), then the baked wreck/rubble history, then
  // the decal layer — resetDecals reads G.groundMarks and G.time.
  paintGround(G.level);
  replayGroundStamps(G.groundStamps);
  resetDecals();
  resetViewCam(G.mode);
  enterField(G.level, G.difficulty);
}

// ---- menu surfaces -------------------------------------------------------

// menu-safe faction names: factionAdjUpper reads the live G, which is stale or
// null while the menu is up
const SAVE_FACTION_NAMES = { de: 'GERMANS', jp: 'JAPANESE', zo: 'THE HORDE', it: 'ITALIANS' };

function refreshContinueUI() {
  const btn = el('continue-run');
  if (!btn) return;
  const blob = readRunSave();   // a corrupt blob discards right here, hiding the card
  const hidden = !blob || demoBlockedSave(blob);   // demo hides (never deletes) a non-'de' save
  btn.classList.toggle('hidden', hidden);
  if (hidden) return;
  const m = blob.meta;
  const bits = ['WAVE ' + (Number.isFinite(m.wave) ? m.wave : '?'),
    'vs ' + (SAVE_FACTION_NAMES[m.faction] || '???')];
  // the rung the resume will actually RUN at, not the one the blob stores:
  // deserializeRun rebuilds the mods through buildEscMods, which clamps to
  // demoEscMax(). A full-game 'de' save is resumable under the demo (only the
  // other three armies are blocked), so printing its stored IX here would name
  // a rung this build cannot stand on — the read-clamp rule, on this surface.
  const escLevel = Number.isFinite(m.escLevel) ? Math.min(m.escLevel, demoEscMax()) : 0;
  if (escLevel > 0) bits.push('ESC ' + ESC_ROMAN[escLevel]);
  el('continue-meta').textContent = bits.join(' · ');
}

// -- abandon confirm: gates every menu-driven endless start while a save
// exists (see openEndlessLoadout). Swaps the launching screen out the way the
// card shop does; confirm re-enters openEndlessLoadout, which now finds no save.
// The screen it came from rides along, because the sandbox and testing buttons
// launch from Settings and only the menu launches from #intro.
let pendingAbandonDiff = null;
let pendingAbandonFrom = 'intro';

function abandonConfirmOpen() {
  return !el('abandon-confirm').classList.contains('hidden');
}

function openAbandonConfirm(difficultyId, fromScreen) {
  pendingAbandonDiff = difficultyId;
  pendingAbandonFrom = fromScreen || 'intro';
  const blob = readRunSave();
  // demo: a non-'de' save is HIDDEN on the menu — no CONTINUE card, no resume —
  // so describing it here contradicts the screen the player just came from AND
  // names an army this build doesn't ship, the same lie the dossier's enemy line
  // used to tell. The prompt still fires unchanged: the slot is still about to
  // be overwritten, and that guard is what makes the loss the player's choice.
  const m = blob && !demoBlockedSave(blob) ? blob.meta : null;
  el('abandon-meta').textContent = m
    ? 'Your saved run — wave ' + (Number.isFinite(m.wave) ? m.wave : '?') + ' vs ' +
      (SAVE_FACTION_NAMES[m.faction] || '???').toLowerCase() + ' — will be lost.'
    : 'Your saved run will be lost.';
  el(pendingAbandonFrom).classList.add('hidden');
  el('abandon-confirm').classList.remove('hidden');
}

function closeAbandonConfirm() {
  pendingAbandonDiff = null;
  el('abandon-confirm').classList.add('hidden');
  el(pendingAbandonFrom).classList.remove('hidden');
}

function confirmAbandonRun() {
  const diff = pendingAbandonDiff;
  const from = pendingAbandonFrom;
  pendingAbandonDiff = null;
  clearRunSave();
  refreshContinueUI();
  el('abandon-confirm').classList.add('hidden');
  openEndlessLoadout(diff, from);   // no save left, so this proceeds for real
}

// ---- ground-stamp log ----------------------------------------------------

// Wrecks, rubble and blast scorch are baked into groundCanvas and recorded
// nowhere else, so a resumed run would otherwise come back to a clean field.
// Every stamp writer logs a tiny record here; the load path repaints the
// ground and replays them. Rotation/scatter inside a stamp is rand() and
// re-rolls on replay — cosmetic by design.
let replayingStamps = false;

function logGroundStamp(k, x, y, extra) {
  if (!G || !G.groundStamps || replayingStamps) return;
  const rec = extra ? { k, x, y, ...extra } : { k, x, y };
  G.groundStamps.push(rec);
  // bikes alone can pile up hundreds over a long run — cap, oldest first
  if (G.groundStamps.length > 1000) G.groundStamps.shift();
}

const GROUND_STAMP_REPLAY = {
  wreck: r => stampWreck(r),
  sandbag: r => stampSandbagRubble(r),
  dummy: r => stampDummyRubble(r),
  // unknown work kind = one cosmetic record skipped, never a discarded save
  itwork: r => { if (IT_WORK_KINDS[r.kind]) stampItalianWorkRubble(r); },
  bunker: r => stampBunkerRubble(r),
  watchtower: r => stampWatchtowerRubble(r),
  camonest: r => stampCamoNestRubble(r),
  ammocrate: r => stampAmmoCrateRubble(r),
  atgun: r => stampATGunWreck(r),
  v2: r => stampV2Wreck(r),
  jeep: r => stampJeepWreck(r),
  halftrack: r => stampHalftrackWreck(r),
  bike: r => stampBike(r, !!r.wrecked),
};

function replayGroundStamps(list) {
  if (!Array.isArray(list)) return;
  replayingStamps = true;
  try {
    for (const r of list) {
      const fn = r && GROUND_STAMP_REPLAY[r.k];
      if (fn && Number.isFinite(r.x) && Number.isFinite(r.y)) fn(r);
    }
  } finally {
    replayingStamps = false;
  }
}
