/* Trenchworks: WW2 — in-page testing API (window.TEST).
   Part of a set of plain scripts sharing one global scope; load order is set in index.html.

   A small console/automation harness for driving the game headlessly. It exists
   because the real frame loop rides requestAnimationFrame, which browsers freeze
   in hidden/automated tabs — TEST.step() pumps update() directly instead. Every
   method returns plain JSON-serializable data (no live object refs), and every
   id/type argument is validated with an error that lists the valid keys, because
   startGame() itself silently falls back to endless on a bad level id.

   Typical flows (from the devtools console or an automation driver):
     TEST.start('endless', 'easy'); TEST.deploy('gunner', 0.5, 0.75); TEST.step(30);
     TEST.start('axis1'); TEST.deploy('erifle', 0.5, 0.05); TEST.startWave();
     TEST.stepUntil(g => g.kills > 0, 60); TEST.reset();

   Inert unless called — nothing here runs on load. */
'use strict';

const TEST = {
  // step size matches the real loop's clamp (main.js)
  DT: 0.05,

  help() {
    return {
      api: {
        'start(levelId, difficulty?)': 'validated startGame; throws on unknown ids; returns state()',
        'state()': 'compact JSON snapshot of the current game',
        'step(seconds=1)': 'advance the sim (rAF is frozen in hidden tabs); redraws; returns {ok, simSeconds, error?, state}',
        'stepUntil(predFn, maxSeconds=60)': 'step until predFn(G) is truthy or timeout; returns {ok, met, simSeconds, state}',
        'deploy(type, x, y)': 'place a unit for the player side (defense: G.units; assault/axis build: attacker into G.enemies). Coords in (0..1] are fractions of W/H, larger values are px. Free — no TP charged. Returns offField:true (+warning) if placed off the playable field.',
        'spawnEnemy(type, x, y)': 'defense modes only: push a German attacker into G.enemies. Returns offField:true if off-field (negative y above the top edge is valid staging).',
        'startWave()': 'assault/axis build phase: launch the wave, or explain why it cannot start',
        'reset()': 'stop the game and return to the main menu',
      },
      levels: Object.keys(LEVELS),
      difficulties: Object.keys(ENDLESS_DIFFICULTIES),
      unitTypes: Object.keys(UNIT_TYPES),
      enemyTypes: Object.keys(ENEMY_TYPES),
    };
  },

  start(levelId, difficultyId) {
    if (!LEVELS[levelId]) {
      throw new Error('unknown level id "' + levelId + '" — valid: ' + Object.keys(LEVELS).join(', '));
    }
    if (difficultyId != null && !ENDLESS_DIFFICULTIES[difficultyId]) {
      throw new Error('unknown difficulty "' + difficultyId + '" — valid: ' + Object.keys(ENDLESS_DIFFICULTIES).join(', '));
    }
    startGame(levelId, difficultyId);
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
      phase: G.phase,
      wave: G.wave,
      tp: G.tp,
      kills: G.kills,
      breaches: G.breaches,
      over: G.over,
      time: +G.time.toFixed(1),
      medals: G.medalsEarned,
      units: tally(G.units),
      enemies: tally(G.enemies),
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

  deploy(type, x, y) {
    if (!G) return { ok: false, error: 'no game in progress — call TEST.start()' };
    const px = this._coord(x, W), py = this._coord(y, H);
    // assault/axis build phase: the player's men are attackers and live in
    // G.enemies (sides are inverted there — see input.js placement)
    if (isAssaultModeLevel(G.level) && inBuildPhase()) {
      const nation = levelAttackerNation(G.level);
      const catalog = actorTypeCatalog(nation);
      if (!catalog[type]) {
        return { ok: false, error: 'unknown attacker type "' + type + '" for nation "' + nation +
          '" — valid: ' + Object.keys(catalog).join(', ') };
      }
      const u = makeAttacker(nation, type, px, py);
      if (G.level.landingCraft) {
        const craft = landingCraftAt(px, py);
        if (craft) {
          u.onCraft = craft;
          u.deckOffX = px - craft.x;
          u.deckOffY = py - craft.y;
          craft.onDeck.push(u);
        }
      }
      G.enemies.push(u);
      // attackers deploy in the top strip; on-craft placements are exempt (the
      // craft carries them onto the field)
      const b = u.onCraft ? null : this._bounds(px, py, 0);
      return { ok: true, side: 'attacker', nation, type, x: Math.round(px), y: Math.round(py),
        onCraft: !!u.onCraft, offField: !!b, ...(b || {}) };
    }
    // defense modes: normal US units
    if (!UNIT_TYPES[type]) {
      return { ok: false, error: 'unknown unit type "' + type + '" — valid: ' + Object.keys(UNIT_TYPES).join(', ') };
    }
    G.units.push(makeUnit(type, px, py));
    const b = this._bounds(px, py, 0);
    return { ok: true, side: 'defender', type, x: Math.round(px), y: Math.round(py),
      offField: !!b, ...(b || {}) };
  },

  spawnEnemy(type, x, y) {
    if (!G) return { ok: false, error: 'no game in progress — call TEST.start()' };
    if (isAssaultModeLevel(G.level)) {
      return { ok: false, error: 'not available in assault/axis modes — G.enemies holds YOUR attackers there; use TEST.deploy() instead' };
    }
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

  startWave() {
    if (!G) return { ok: false, reason: 'no game in progress — call TEST.start()' };
    if (!isAssaultModeLevel(G.level)) return { ok: false, reason: 'not an assault/axis level' };
    if (!inBuildPhase()) return { ok: false, reason: 'not in build phase (phase: ' + G.phase + ')' };
    if (!G.enemies.some(e => !e.dead)) {
      return { ok: false, reason: 'no attackers deployed — place at least one with TEST.deploy(type, x, y) first' };
    }
    startAssaultCombat();
    return { ok: G.phase !== 'build', phase: G.phase, state: this.state() };
  },

  reset() {
    if (running || G) returnToMenu();
    G = null;
    return { ok: true, at: 'main menu' };
  },
};
window.TEST = TEST;
