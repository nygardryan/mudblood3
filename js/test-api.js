/* Trenchworks: WW2 — in-page testing API (window.TEST).
   Part of a set of plain scripts sharing one global scope; load order is set in index.html.

   A small console/automation harness for driving the game headlessly. It exists
   because the real frame loop rides requestAnimationFrame, which browsers freeze
   in hidden/automated tabs — TEST.step() pumps update() directly instead. Every
   method returns plain JSON-serializable data (no live object refs), and every
   id/type argument is validated with an error that lists the valid keys, because
   startGame() itself silently falls back to endless on a bad level id.

   Two ways to put things on the field:
     deploy(type, x, y)  — FREE god-mode spawn. Places ANY placeable (units,
                           defenses, supports, even German test units) with no
                           TP charge and no placement restriction. For setting
                           up arbitrary board states.
     buy(type, x, y)     — the realistic player purchase: charges TP, honours
                           the officer cap and placement rules, drives the exact
                           in-game place() path (card hooks included). Use this
                           to gauge difficulty/economy the way a player feels it.

   Typical flows (from the devtools console or an automation driver):
     TEST.start('endless', 'easy'); TEST.buy('gunner', 0.5, 0.75); TEST.step(30);
     TEST.start('endless', 'easy'); TEST.autoplay({ seconds: 240 });
     TEST.start('endless', 'easy'); TEST.stepUntil(g => g.kills > 0, 60); TEST.reset();

   Inert unless called — nothing here runs on load. */
'use strict';

const TEST = {
  // step size matches the real loop's clamp (main.js)
  DT: 0.05,

  help() {
    return {
      api: {
        'start(levelId, difficulty?, faction?)': "validated startGame; throws on unknown ids; returns state(). faction ('de'|'jp'|'zo'|'it') pins the endless enemy roll",
        'state()': 'compact JSON snapshot of the current game',
        'roster()': 'detailed per-actor lists {units, enemies}: type, pos, hp, rank, kills',
        'works()': 'Regio Esercito field works: kind, pos, hp, fortify tier, occupancy',
        'catalog()': 'what the current mode can buy: {key, label, kind, cost, affordable, atCap}',
        'costs()': 'map of buyable key -> resolved TP cost (honours difficulty/cards/overrides)',
        'inspect(x, y)': 'hover-style blurb for the actor at a point: name, hp, rank, stats, desc',
        'step(seconds=1)': 'advance the sim (rAF is frozen in hidden tabs); redraws; returns {ok, simSeconds, error?, state}',
        'stepUntil(predFn, maxSeconds=60)': 'step until predFn(G) is truthy or timeout; returns {ok, met, simSeconds, state}',
        'buy(type, x, y)': 'realistic purchase: charges TP, checks cap/placement, runs the in-game place() path. Returns {ok, placed, cost, tpBefore, tpAfter, reason?}',
        'deploy(type, x, y)': 'FREE god-mode spawn of ANY placeable (units, defenses, supports, German test units) — no TP, no placement limit. (0..1] coords are field fractions; larger are px.',
        'spawnEnemy(type, x, y)': 'defense modes only: push a German attacker into G.enemies. Negative y above the top edge is valid staging.',
        'event(name)': "fire a random-event on demand regardless of wave gating — name in: random, fog, smokescreen, fng, paradrop, airraid, airstrike",
        'escalation(n?)': 'ESCALATION ladder: with no arg, reports {level, unlocked, faction, mods, ladder}. With 0..10 it UNLOCKS and selects that rung (write to the save) so a run can start there without grinding boss kills. Takes effect at the next TEST.start; TEST.start\'s faction arg still overrides the rung\'s pin.',
        'setTP(n) / addTP(n)': 'set or add tactical points, for scripting test scenarios',
        'autoplay(opts?)': 'autonomous endless player: spends TP on a scaling build every `every`s and steps for `seconds`. opts {seconds=120, every=15, plan?}. Returns {over, waves, log, final}',
        'reset()': 'stop the game and return to the main menu',
        'sprites()': 'sprite-pack loader state: {enabled, state, listed, count, loaded[]}. `state` is none when no pack is installed in assets/sprites/',
        'exportSprites(opts?)': 'render every drawable to a transparent PNG. opts {download=true} — pass {download:false} to render and report without a file. Returns {ok, count, bytes, ids, blank, errors}',
        'spriteRoundtrip(id)': 'bake one sprite, encode it as PNG, load it back and diff against the procedural draw. Returns {litPixels, meanChannelDiff, ...} — a large diff means a wrong anchor or a clipped box',
      },
      levels: Object.keys(LEVELS),
      // 'medium'/'hard' left the menu when ESCALATION shipped but still start
      // from here — the ladder stacks on 'easy'
      difficulties: Object.keys(ENDLESS_DIFFICULTIES),
      escalations: ESCALATIONS.map(m => m.level + ': ' + m.name + ' — ' + m.desc),
      unitTypes: Object.keys(UNIT_TYPES),
      enemyTypes: Object.keys(ENEMY_TYPES),
      buyableNow: G ? Object.keys(this._toolbarMap()) : '(start a game first)',
    };
  },

  start(levelId, difficultyId, faction) {
    if (!LEVELS[levelId]) {
      throw new Error('unknown level id "' + levelId + '" — valid: ' + Object.keys(LEVELS).join(', '));
    }
    if (difficultyId != null && !ENDLESS_DIFFICULTIES[difficultyId]) {
      throw new Error('unknown difficulty "' + difficultyId + '" — valid: ' + Object.keys(ENDLESS_DIFFICULTIES).join(', '));
    }
    if (faction != null && faction !== 'de' && faction !== 'jp' && faction !== 'zo' && faction !== 'it') {
      throw new Error('unknown faction "' + faction + '" — valid: de, jp, zo, it');
    }
    // pin the endless enemy-faction roll for a deterministic test, then release
    G_forceFaction = faction || null;
    try { startGame(levelId, difficultyId); }
    finally { G_forceFaction = null; }
    return this.state();
  },

  state() {
    if (!G) return { running: false, note: 'no game in progress — call TEST.start()' };
    const tally = (list) => {
      const byType = {};
      let hp = 0;
      for (const a of list) {
        if (a.dead) continue;
        byType[a.type] = (byType[a.type] || 0) + 1;
        hp += a.hp;
      }
      return { total: Object.values(byType).reduce((s, n) => s + n, 0), byType, hp: Math.round(hp) };
    };
    return {
      running, paused,
      mode: G.mode,
      levelId: G.level.id,
      difficulty: G.difficulty ? G.difficulty.id : null,
      // ESCALATION: the rung this run was started at, plus the resolved mods
      esc: G.esc ? { level: G.esc.level, faction: G.esc.faction, bossKills: G.bossKills, mods: G.esc } : null,
      phase: G.phase,
      enemyFaction: G.enemyFaction,
      wave: G.wave,
      tp: G.tp,
      kills: G.kills,
      breaches: G.breaches,
      over: G.over,
      time: +G.time.toFixed(1),
      medals: G.medalsEarned,
      // smokescreen: live puffs, pots still burning, and the wind carrying them
      smoke: { puffs: G.smoke.length, pots: G.smokePots.length,
        windDeg: Math.round(G.wind.dir * 180 / Math.PI),
        windSpeed: +G.wind.speed.toFixed(1) },
      units: tally(G.units),
      enemies: tally(G.enemies),
      // Regio Esercito: the field works and (from the garrison phase) who's in
      // them. frontY is the deepest live work — the number that proves the enemy
      // line is creeping rather than just churning.
      it: {
        works: G.itWorks.length,
        worksHp: Math.round(G.itWorks.reduce((s, w) => s + Math.max(0, w.hp), 0)),
        frontY: G.itWorks.length ? Math.round(Math.max(...G.itWorks.map(w => w.y))) : null,
        garrisoned: G.enemies.filter(e => !e.dead && e.garrisoned).length,
        // AVANTI: negative = telegraphed and winding up, positive = surging, 0 = idle
        charge: +G.itCharge.toFixed(2),
        avantiCd: +G.itAvantiCd.toFixed(1),
        charging: G.enemies.filter(e => !e.dead && e.t.faction === 'it' && e.chargeT > 0).length,
      },
    };
  },

  // Per-work detail for the Italian faction. Separate from state() because a
  // works assertion usually needs positions and occupancy, not just a count.
  works() {
    if (!G) return { note: 'no game in progress — call TEST.start()' };
    return G.itWorks.map(w => ({
      kind: w.kind, x: Math.round(w.x), y: Math.round(w.y),
      hp: Math.max(0, Math.ceil(w.hp)), maxhp: w.maxhp,
      up: !!w.up, up2: !!w.up2, occ: w.occ, cap: w.cap,
    }));
  },

  // Per-actor detail — coarser tally() hides rank/kills/HP that a test needs to
  // assert on (e.g. "did my sergeant survive", "is that panzer dead yet").
  roster() {
    if (!G) return { units: [], enemies: [], note: 'no game in progress — call TEST.start()' };
    const one = (a) => {
      const o = { type: a.type, x: Math.round(a.x), y: Math.round(a.y),
        hp: Math.max(0, Math.ceil(a.hp)), maxhp: a.maxhp };
      if (a.rank != null && typeof RANKS !== 'undefined' && RANKS[a.rank]) {
        o.rank = RANKS[a.rank].name;
        o.kills = a.xp;   // xp == kills for fighters, healing/repair points for support
      }
      if (a.dead) o.dead = true;
      // Regio Esercito: what a sapper is currently doing, and (from the garrison
      // phase) whether a man is in a work
      if (a.buildState) { o.buildState = a.buildState; o.buildsDone = a.buildsDone; }
      if (a.garrisoned) o.garrisoned = true;
      return o;
    };
    return {
      units: G.units.filter(a => !a.dead).map(one),
      enemies: G.enemies.filter(a => !a.dead).map(one),
    };
  },

  step(seconds = 1) {
    if (!G) return { ok: false, error: 'no game in progress — call TEST.start()' };
    const steps = Math.max(1, Math.round(seconds / this.DT));
    let done = 0;
    try {
      for (; done < steps; done++) {
        if (G.over) break;
        update(this.DT);
      }
      draw();   // rAF is frozen in hidden tabs; refresh the canvas ourselves
      return { ok: true, simSeconds: +(done * this.DT).toFixed(2), state: this.state() };
    } catch (e) {
      return { ok: false, simSeconds: +(done * this.DT).toFixed(2),
        error: e.message, stack: (e.stack || '').split('\n').slice(0, 5), state: this.state() };
    }
  },

  stepUntil(predFn, maxSeconds = 60) {
    if (!G) return { ok: false, error: 'no game in progress — call TEST.start()' };
    const steps = Math.max(1, Math.round(maxSeconds / this.DT));
    let done = 0, met = false;
    try {
      for (; done < steps; done++) {
        if (G.over || (met = !!predFn(G))) break;
        update(this.DT);
      }
      met = met || !!predFn(G);
      draw();
      return { ok: true, met, simSeconds: +(done * this.DT).toFixed(2), state: this.state() };
    } catch (e) {
      return { ok: false, met, simSeconds: +(done * this.DT).toFixed(2),
        error: e.message, stack: (e.stack || '').split('\n').slice(0, 5), state: this.state() };
    }
  },

  // coords in (0..1] are fractions of the field; anything larger is absolute px
  _coord(v, span) { return v > 0 && v <= 1 ? v * span : v; },

  // Bounds feedback: a placement outside the playable field is accepted but
  // flagged, because such a unit is off-screen and usually never participates —
  // a silent typo otherwise costs a whole test run. topMargin allows the top
  // staging area above the field (negative y) for units that march in from off
  // the top edge (enemies/attackers); defenders must land on the field itself.
  _bounds(px, py, topMargin) {
    if (px >= 0 && px <= W && py >= topMargin && py <= H) return null;
    return { offField: true,
      warning: 'placed outside the playable field (valid x 0–' + W + ', y ' +
        topMargin + '–' + H + ') — this unit is off-screen and may never participate' };
  },

  // Everything the god-mode deploy() can spawn, keyed by placeable key. This is
  // deliberately broader than what the live toolbar offers (it always includes
  // defenses, supports, and the German test roster) so a test can build any
  // board state regardless of mode/difficulty. buy() uses the narrower live
  // toolbar instead, because it models what a player can actually purchase.
  _deployMap() {
    if (this.__deployMap) return this.__deployMap;
    const m = {};
    const add = (list) => { for (const p of (list || [])) if (!m[p.key]) m[p.key] = p; };
    add(typeof PLACEABLES !== 'undefined' && PLACEABLES);
    add(typeof TESTING_GERMAN_PLACEABLES !== 'undefined' && TESTING_GERMAN_PLACEABLES);
    add(typeof TESTING_JAPANESE_PLACEABLES !== 'undefined' && TESTING_JAPANESE_PLACEABLES);
    add(typeof TESTING_ZOMBIE_PLACEABLES !== 'undefined' && TESTING_ZOMBIE_PLACEABLES);
    add(typeof TESTING_ITALIAN_PLACEABLES !== 'undefined' && TESTING_ITALIAN_PLACEABLES);
    add(typeof TESTING_ABILITIES !== 'undefined' && TESTING_ABILITIES);
    this.__deployMap = m;
    return m;
  },

  // The live purchasable toolbar for the current mode, keyed by key. buildToolbar
  // stashes the active list in the global `toolbarPlaceables`.
  _toolbarMap() {
    const m = {};
    const list = (typeof toolbarPlaceables !== 'undefined' && toolbarPlaceables) || [];
    for (const p of list) m[p.key] = p;
    return m;
  },

  deploy(type, x, y) {
    if (!G) return { ok: false, error: 'no game in progress — call TEST.start()' };
    const px = this._coord(x, W), py = this._coord(y, H);
    // any placeable — units, defenses, supports, German test
    // units. Routed through the game's own applyPlacement() so what gets
    // created never drifts from what the toolbar would build. FREE: no TP.
    const p = this._deployMap()[type];
    if (!p) {
      return { ok: false, error: 'unknown placeable "' + type + '" — valid: ' +
        Object.keys(this._deployMap()).join(', ') };
    }
    applyPlacement(p, px, py);
    // supports/events have no lingering position to sit off-field, so only
    // flag the placed kinds (units, defenses, German test units)
    const positional = p.kind === 'unit' || p.kind === 'defense' || p.kind === 'egerman';
    const b = positional ? this._bounds(px, py, 0) : null;
    return { ok: true, side: p.kind === 'egerman' ? 'attacker' : 'defender',
      type, kind: p.kind, x: Math.round(px), y: Math.round(py), offField: !!b, ...(b || {}) };
  },

  // The purchase a real player makes: costs TP, obeys the officer cap and the
  // field's placement rules (units get the same radial-fallback search the mouse
  // does), and drives the exact in-game place() path — card hooks and all. Use
  // this, not deploy(), when the question is "how does the economy actually feel".
  buy(type, x, y) {
    if (!G) return { ok: false, reason: 'no game in progress — call TEST.start()' };
    const p = this._toolbarMap()[type];
    if (!p) {
      return { ok: false, reason: 'not buyable in this mode "' + type + '" — valid: ' +
        Object.keys(this._toolbarMap()).join(', ') };
    }
    const px = this._coord(x, W), py = this._coord(y, H);
    // events fire in place — no placement, no cost
    if (p.kind === 'event') {
      if (p.key === 'random') triggerEvent(); else runEvent(p.key, G.wave);
      return { ok: true, fired: p.key, kind: 'event' };
    }
    const cost = placeableCost(p);
    if (!canAffordTP(cost)) return { ok: false, reason: 'insufficient tp', tp: G.tp, cost };
    if (p.key === 'officer' && officerCount() >= officerLimit()) {
      return { ok: false, reason: 'officer cap reached (' + officerLimit() + ')' };
    }
    const sigBefore = this._sig();
    const tpBefore = G.tp;
    place(p, px, py);   // real path: validation, radial fallback, spendTP, creation
    const placed = this._sig() > sigBefore;
    if (!placed) {
      return { ok: false, reason: 'no valid spot at/near target — placement blocked', type, cost };
    }
    return { ok: true, placed: true, type, kind: p.kind, cost,
      tpBefore: +tpBefore.toFixed(2), tpAfter: +G.tp.toFixed(2), spent: +(tpBefore - G.tp).toFixed(2) };
  },

  // count of everything a purchase can add to the field — the ground truth for
  // "did that buy actually land something" across units, defenses and supports
  _sig() {
    if (!G) return 0;
    let n = 0;
    for (const k of ['units', 'enemies', 'sandbags', 'bunkers', 'wires', 'mines',
      'watchtowers', 'camoNests', 'ammoCrates', 'dummies', 'shells']) {
      if (G[k]) n += G[k].length;
    }
    return n;
  },

  // resolved TP price of every currently-buyable item
  costs() {
    if (!G) return { note: 'no game in progress — call TEST.start()' };
    const out = {};
    for (const p of Object.values(this._toolbarMap())) out[p.key] = placeableCost(p);
    return out;
  },

  // what the toolbar offers right now, with live affordability — the shopping
  // list an autonomous player reasons over
  catalog() {
    if (!G) return [];
    return Object.values(this._toolbarMap()).map(p => {
      const cost = placeableCost(p);
      const atCap = p.key === 'officer' && officerCount() >= officerLimit();
      return { key: p.key, label: p.label, kind: p.kind, cost,
        affordable: canAffordTP(cost), ...(atCap ? { atCap: true } : {}) };
    });
  },

  // Hover-panel data for whatever actor sits under a point — the same name, HP,
  // rank, weapon stats and codex blurb the mouse-over tooltip shows in-game,
  // without a real cursor (the accessibility tree can't see canvas actors).
  inspect(x, y) {
    if (!G) return { hit: false, note: 'no game in progress — call TEST.start()' };
    const px = this._coord(x, W), py = this._coord(y, H);
    let best = null, bestD = Infinity;
    const scan = (list, own) => {
      for (const a of list) {
        if (a.dead) continue;
        const r = (typeof actorHitRadius === 'function') ? actorHitRadius(a) : 16;
        const d = Math.hypot(a.x - px, a.y - py);
        if (d <= r && d < bestD) { best = a; bestD = d; best.__own = own; }
      }
    };
    scan(G.units, true);
    scan(G.enemies, false);
    if (!best) return { hit: false, x: Math.round(px), y: Math.round(py) };
    const own = best.side === 'us' || best.nation === 'us';
    const stats = (typeof hoverStats === 'function') ? hoverStats(best, own) : [];
    return { hit: true, side: best.side, type: best.type,
      name: best.t && best.t.name, x: Math.round(best.x), y: Math.round(best.y),
      stats, desc: best.t && best.t.desc };
  },

  spawnEnemy(type, x, y) {
    if (!G) return { ok: false, error: 'no game in progress — call TEST.start()' };
    if (!ENEMY_TYPES[type]) {
      return { ok: false, error: 'unknown enemy type "' + type + '" — valid: ' + Object.keys(ENEMY_TYPES).join(', ') };
    }
    const px = this._coord(x, W), py = this._coord(y, H);
    G.enemies.push(makeEnemy(type, px, py));
    // enemies normally stage above the top edge and march in, so negative y down
    // to the spawn band is on-field; below the bottom means already past the line
    const b = this._bounds(px, py, -120);
    return { ok: true, type, x: Math.round(px), y: Math.round(py), offField: !!b, ...(b || {}) };
  },

  // Fire a random battlefield event on demand, skipping the wave gate that
  // normally holds each one back (events.js). Defense modes only.
  event(name) {
    if (!G) return { ok: false, error: 'no game in progress — call TEST.start()' };
    const valid = ['random', 'fog', 'smokescreen', 'fng', 'paradrop', 'airraid', 'airstrike'];
    if (!valid.includes(name)) {
      return { ok: false, error: 'unknown event "' + name + '" — valid: ' + valid.join(', ') };
    }
    if (name === 'random') triggerEvent(); else runEvent(name, G.wave);
    return { ok: true, fired: name, wave: G.wave };
  },

  // ESCALATION (js/escalation.js). Called bare it reports; called with a rung it
  // UNLOCKS that rung as well as selecting it, because the real unlock costs a
  // wave-100 boss kill per rung and no test is going to pay that ten times.
  // Writes the save, so it only lands on the NEXT TEST.start.
  escalation(n) {
    if (n != null) {
      const lvl = clamp(Math.floor(+n) || 0, 0, ESC_MAX);
      const data = loadEndlessCards();
      data.escUnlocked = Math.max(data.escUnlocked, lvl);
      data.escalation = lvl;
      saveEndlessCards(data);
    }
    const data = loadEndlessCards();
    return {
      ok: true,
      level: data.escalation,
      unlocked: data.escUnlocked,
      faction: data.escalation > 0 ? escFactionFor(data.escalation) : '(random)',
      mods: buildEscMods(data.escalation),
      active: ESCALATIONS.slice(0, data.escalation).map(m => m.name),
      note: n != null ? 'takes effect on the next TEST.start()' : undefined,
    };
  },

  setTP(n) {
    if (!G) return { ok: false, error: 'no game in progress — call TEST.start()' };
    G.tp = Math.max(0, +n || 0);
    return { ok: true, tp: G.tp };
  },

  addTP(n) {
    if (!G) return { ok: false, error: 'no game in progress — call TEST.start()' };
    G.tp = Math.max(0, G.tp + (+n || 0));
    return { ok: true, tp: G.tp };
  },

  // Default endless build order for autoplay(): target counts scale with the
  // wave, cheap bodies up front, specialists and armour as the economy allows.
  // Returns an ordered purchase queue (most-wanted first) of {type, x, y}.
  _defaultPlan(g) {
    const w = g.wave;
    const have = {};
    for (const u of g.units) if (!u.dead) have[u.type] = (have[u.type] || 0) + 1;
    const want = {
      rifleman: Math.min(12, 5 + Math.floor(w / 2)),
      gunner: Math.min(6, 1 + Math.floor(w / 3)),
      sniper: w >= 4 ? (w >= 20 ? 2 : 1) : 0,
      officer: Math.min(officerLimit(), w >= 12 ? 2 : 1),
      medic: w >= 8 ? 1 : 0,
      mortarman: w >= 12 ? 1 : 0,
      bazooka: w >= 16 ? (w >= 26 ? 3 : 1) : 0,
      atgun: w >= 24 ? 1 : 0,
      engineer: w >= 15 ? 1 : 0,
    };
    const xs = [0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 0.22, 0.68];
    const back = ['sniper', 'mortarman', 'bazooka', 'atgun'];
    const queue = [];
    let i = 0;
    for (const type of ['rifleman', 'gunner', 'sniper', 'officer', 'medic', 'mortarman', 'bazooka', 'atgun', 'engineer']) {
      let deficit = (want[type] || 0) - (have[type] || 0);
      while (deficit-- > 0) {
        queue.push({ type, x: xs[i % xs.length], y: back.includes(type) ? 0.92 : 0.8 });
        i++;
      }
    }
    return queue;
  },

  // Autonomous endless player: every `every` sim-seconds it runs a spend pass
  // (buy down the plan's queue until TP or the queue runs out), then advances
  // the sim, logging a snapshot each interval. Purely simulated — it pumps
  // update() like step(), it does not wait on wall-clock time. `plan` may be a
  // custom (g) => [{type,x,y}, ...] purchase queue; omit for the default build.
  autoplay(opts = {}) {
    if (!G) return { ok: false, error: 'no game in progress — call TEST.start()' };
    const seconds = opts.seconds != null ? opts.seconds : 120;
    const every = Math.max(1, opts.every != null ? opts.every : 15);
    const plan = typeof opts.plan === 'function' ? opts.plan : (g) => this._defaultPlan(g);
    const log = [];
    let elapsed = 0;
    const spendPass = () => {
      const queue = plan(G) || [];
      const bought = [];
      let guard = 0;
      for (const order of queue) {
        if (++guard > 200) break;
        const r = this.buy(order.type, order.x, order.y);
        if (r.ok && r.placed) bought.push(order.type);
        else if (r.reason === 'insufficient tp') break;   // can't afford the rest either
      }
      return bought;
    };
    try {
      while (elapsed < seconds && !G.over) {
        const bought = spendPass();
        const chunk = Math.min(every, seconds - elapsed);
        const res = this.step(chunk);
        elapsed += res.simSeconds;
        log.push({ t: +elapsed.toFixed(0), wave: G.wave, tp: +G.tp.toFixed(1),
          kills: G.kills, breaches: G.breaches,
          units: G.units.filter(u => !u.dead).length,
          enemies: G.enemies.filter(e => !e.dead).length,
          bought });
        if (!res.ok) break;   // sim threw — stop and surface it in the final state
      }
    } catch (e) {
      return { ok: false, error: e.message, log, final: this.state() };
    }
    return { ok: true, over: G.over, waves: G.wave, breaches: G.breaches,
      kills: G.kills, simSeconds: +elapsed.toFixed(1), log, final: this.state() };
  },

  reset() {
    if (running || G) returnToMenu();
    G = null;
    return { ok: true, at: 'main menu' };
  },

  sprites() {
    return SPRITES.status();
  },

  // async, unlike everything else here: encoding a PNG goes through
  // canvas.toBlob. Await it, or the promise is all you'll see.
  exportSprites(opts) {
    return exportSpritePack(opts || {});
  },

  spriteRoundtrip(id) {
    return spriteRoundtrip(id);
  },
};
window.TEST = TEST;
