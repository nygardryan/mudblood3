/* Dirt & Iron — main update loop.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

function update(dt) {
  G.time += dt;
  if (G.tutorial) updateTutorial(dt);

  G.auraRefresh -= dt;
  if (G.auraRefresh <= 0) {
    G.auraRefresh = AURA_CACHE_INTERVAL;
    G.buffFrame = (G.buffFrame || 0) + 1;
    G.usOfficers = [];
    G.deOfficers = [];
    for (const u of G.units) {
      if (!u.dead && (u.type === 'officer' || u.t.aura)) G.usOfficers.push(u);
    }
    for (const e of G.enemies) {
      if (!e.dead && (e.t.aura || e.type === 'officer' || e.type === 'eoff')) G.deOfficers.push(e);
    }
  }

  // a hit squad has no supply line: no trickle, no officer income, nothing to buy.
  // assault modes get a fixed per-wave allocation only — no trickle or officer income.
  if (G.mode !== 'hitsquad' && !isAssaultMode()) {
    // TP trickle
    G.tpTrickle -= dt;
    if (G.tpTrickle <= 0) { G.tpTrickle = 4; earnTP(1, 'steady'); }

    // officer TP bonus
    G.officerTick -= dt;
    if (G.officerTick <= 0) {
      G.officerTick = (G.cardsOwned && G.cardsOwned.has('rushorder')) ? 15 : 30;
      // rank pays: a MSG officer brings in 3 TP where a green one brings 1
      for (const u of G.units) if (!u.dead && u.type === 'officer') earnTP(1 + u.rank / 3, 'steady');
    }
  }

  if (inBuildPhase()) {
    if (G.fog > 0) G.fog -= dt;
    for (const e of G.enemies) {
      if (!e.dead && e.chute > 0) updateEnemyChute(e, dt);
    }
    if (G.banner) { G.banner.ttl -= dt; if (G.banner.ttl <= 0) G.banner = null; }
    return;
  }

  if (inLandingPhase()) {
    updateLandingCraft(dt);
    if (G.fog > 0) G.fog -= dt;
    if (G.landingFire) {
      for (const u of G.units) if (!u.dead) updateUnit(u, dt);
      for (const e of G.enemies) if (!e.dead && !e.onCraft) updateEnemy(e, dt);
    }
    if (G.banner) { G.banner.ttl -= dt; if (G.banner.ttl <= 0) G.banner = null; }
    return;
  }

  // spawning: each mode has its own wave source
  if (G.mode === 'allied') {
    updateAlliedWaves(dt);
  } else if (isAssaultMode()) {
    updateAssaultCombat();
  } else if (G.mode === 'hitsquad') {
    // no waves: win when the target falls, lose on the clock or a wiped squad
    if (!G.units.some(u => !u.dead && u.vip)) { victory(); return; }
    if (G.time >= G.level.timeLimit) { gameOver(); return; }
    if (!G.enemies.some(e => !e.dead)) { gameOver(); return; }
  } else if (!isTestingMode() && !tutorialScriptActive()) {
    G.spawnTimer -= dt;
    if (G.spawnTimer <= 0) spawnWave();
  }

  // random events
  if (G.level.events && G.wave >= 3) {
    G.eventTimer -= dt;
    if (G.eventTimer <= 0) {
      const late = wavesPast99(G.wave);
      G.eventTimer = late > 0 ? rand(28, 52) : rand(40, 70);
      triggerEvent();
    }
  }
  if (G.fog > 0) G.fog -= dt;

  // drop a focus-fire mark once its target is dead or off the field
  if (G.focusTarget && (G.focusTarget.dead || G.focusTarget.y < 0)) G.focusTarget = null;

  for (const u of G.units) if (!u.dead) updateUnit(u, dt);
  for (const e of G.enemies) if (!e.dead) updateEnemy(e, dt);
  for (const u of G.units) if (!u.dead && u.flameT > 0) u.flameT -= dt;
  for (const e of G.enemies) if (!e.dead && e.flameT > 0) e.flameT -= dt;
  for (const u of G.units) if (!u.dead && u.grenThrowT > 0) u.grenThrowT -= dt;
  for (const e of G.enemies) if (!e.dead && e.grenThrowT > 0) e.grenThrowT -= dt;
  for (const u of G.units) if (!u.dead && u.shotgunBlastT > 0) u.shotgunBlastT -= dt;
  for (const u of G.units) if (!u.dead && u.atgunFireT > 0) u.atgunFireT -= dt;
  for (const u of G.units) if (!u.dead && u.mortarFireT > 0) u.mortarFireT -= dt;
  for (const e of G.enemies) if (!e.dead && e.mortarFireT > 0) e.mortarFireT -= dt;
  for (const e of G.enemies) if (!e.dead && e.v2FireT > 0) e.v2FireT -= dt;
  for (const u of G.units) if (!u.dead && u.camoExposed > 0) u.camoExposed -= dt;

  // mines
  for (const m of G.mines) {
    if (m.dead) continue;
    for (const e of G.enemies) {
      if (e.dead || e.chute > 0) continue;
      const trig = e.t.tank ? 22 : e.t.apc ? 19 : e.t.vehicle ? 16 : 11;
      if (dist(m, e) < trig) {
        m.dead = true;
        explode(m.x, m.y, 44, 130, false);
        break;
      }
    }
  }

  // incoming shells
  for (const s of G.shells) {
    s.timer -= dt;
    // the V2 warhead trails exhaust its whole flight: a fat billowing column
    // during the boost climb, a thin high contrail across the coast leg, and
    // sparse dark streaks once the motor's spent and it's diving in
    if (s.kind === 'v2' && s.sx != null && s.timer > 0) {
      const st = v2FlightState(s);
      if (st.phase === 'boost' && Math.random() < 0.9) {
        const ttl = rand(0.5, 1.0);
        G.particles.push({
          x: st.x + rand(-3, 3), y: st.y + rand(-2, 4),
          vx: rand(-16, 16), vy: rand(4, 22),
          ttl, maxTtl: ttl, grav: -6, size: rand(2.5, 5),
          kind: 'smoke', color: pick(['#e8e2d2', '#cfc6b0', '#a89f8a']),
        });
      } else if (st.phase === 'coast' && Math.random() < 0.55) {
        const ttl = rand(0.6, 1.1);
        G.particles.push({
          x: st.x, y: st.y, vx: rand(-4, 4), vy: rand(-3, 3),
          ttl, maxTtl: ttl, grav: 0, size: rand(1.2, 2.2),
          kind: 'smoke', color: pick(['#e8e2d2', '#d8d0c0']),
        });
      } else if (st.phase === 'dive' && Math.random() < 0.4) {
        G.particles.push({
          x: st.x + rand(-2, 2), y: st.y - rand(2, 8),
          vx: rand(-8, 8), vy: rand(-14, -4),
          ttl: rand(0.25, 0.5), grav: 0, size: rand(1.4, 2.6),
          color: pick(['#4e4536', '#6a6152', '#3a342a']),
        });
      }
    }
    if (s.timer <= 0) {
      s.done = true;
      if (s.kind === 'v2') explodeV2(s.x, s.y, s.r, s.dmg, s.by);
      else explode(s.x, s.y, s.r, s.dmg, s.big, s.by);
    }
  }

  // AA shells running out their fuses on the way up
  for (const f of G.flak) {
    f.timer -= dt;
    if (f.timer <= 0) {
      f.done = true;
      burstFlak(f);
    }
  }

  // aircraft: friendly strafing passes, transports, and enemy bombers
  for (const p of G.planes) updatePlane(p, dt);

  // rockets in flight
  for (const r of G.rockets) {
    r.t += dt;
    const f = Math.min(r.t / r.dur, 1);
    r.x = r.sx + (r.tx - r.sx) * f;
    r.y = r.sy + (r.ty - r.sy) * f;
    if (Math.random() < 0.7) {
      G.particles.push({
        x: r.x, y: r.y, vx: rand(-8, 8), vy: rand(-8, 8),
        ttl: rand(0.2, 0.45), grav: -30, size: rand(1.5, 2.5),
        color: pick(['#9a9384', '#7d766a', '#b0a898']),
      });
    }
    if (f >= 1) { r.done = true; explode(r.tx, r.ty, r.r, r.dmg, false, r.by); }
  }

  // grenades in flight, then a 3-second fuse once they hit the ground —
  // unless the grenadier's thrown ones (self- or catch-and-return) carry
  // Impact Fuze, in which case they go off the instant they land
  for (const g of G.grenades) {
    if (!g.landed) {
      g.t += dt;
      if (g.t >= g.dur) {
        g.landed = true;
        const impactFuze = g.by && g.by.type === 'grenadier' && G.cardsOwned && G.cardsOwned.has('impactfuze');
        if (impactFuze) { g.done = true; explode(g.tx, g.ty, g.r || 38, g.dmg || 60, false, g.by); }
        else g.fuse = 3;
      }
    } else {
      g.fuse -= dt;
      if (g.fuse <= 0) { g.done = true; explode(g.tx, g.ty, g.r || 38, g.dmg || 60, false, g.by); }
    }
  }

  // breaches: a defeat marker when defending, the objective when attacking.
  // a hit squad has nowhere to breach to — its work is on the field.
  if (G.mode !== 'hitsquad') for (const e of G.enemies) {
    if (!e.dead && e.y > H + 10) {
      e.dead = true; e.breached = true;
      G.breaches++;
      if (isAssaultMode()) {
        showBanner('BREAKTHROUGH! (' + G.breaches + '/' + G.level.winBreaches + ')');
        if (G.breaches >= G.level.winBreaches) victory();
      } else {
        showBanner('GERMAN BREAKTHROUGH! (' + G.breaches + '/' + G.level.breachLimit + ')');
        if (G.breaches >= G.level.breachLimit) gameOver();
      }
    }
  }

  // particles / effects
  for (const p of G.particles) {
    p.ttl -= dt;
    p.vy += (p.grav || 0) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (const tr of G.tracers) tr.ttl -= dt;
  for (const f of G.flashes) f.ttl -= dt;
  for (const tx of G.texts) { tx.ttl -= dt; tx.y -= 14 * dt; }
  for (const cp of G.corpses) cp.ttl -= dt;
  for (const m of G.groundMarks) m.ttl -= dt;
  if (G.banner) { G.banner.ttl -= dt; if (G.banner.ttl <= 0) G.banner = null; }

  // cleanup
  compactInPlace(G.units, u => !u.dead);
  compactInPlace(G.enemies, e => !e.dead);
  compactDefenses(G.sandbags, stampSandbagRubble);
  compactDefenses(G.bunkers, stampBunkerRubble);
  compactDefenses(G.watchtowers, stampWatchtowerRubble);
  compactDefenses(G.camoNests, stampCamoNestRubble);
  compactInPlace(G.wires, w => w.hp > 0);
  compactInPlace(G.mines, m => !m.dead);
  compactInPlace(G.shells, s => !s.done);
  compactInPlace(G.grenades, g => !g.done);
  compactInPlace(G.rockets, r => !r.done);
  compactInPlace(G.planes, p => !p.done);
  compactInPlace(G.flak, f => !f.done);
  compactInPlace(G.particles, p => p.ttl > 0);
  if (G.particles.length > PARTICLE_CAP) G.particles.splice(0, G.particles.length - PARTICLE_CAP);
  compactInPlace(G.tracers, t => t.ttl > 0);
  compactInPlace(G.flashes, f => f.ttl > 0);
  compactInPlace(G.texts, t => t.ttl > 0);
  compactInPlace(G.corpses, c => c.ttl > 0);
  compactInPlace(G.groundMarks, m => m.ttl > 0);
}

function stampSandbagRubble(s) {
  gctx.fillStyle = 'rgba(120,105,70,0.5)';
  gctx.beginPath();
  gctx.ellipse(s.x, s.y, 20, 9, 0, 0, 7);
  gctx.fill();
}

function stampBunkerRubble(b) {
  // shattered concrete slab plus scattered chunks
  gctx.fillStyle = 'rgba(105,102,92,0.6)';
  gctx.beginPath();
  gctx.ellipse(b.x, b.y, 26, 12, 0, 0, 7);
  gctx.fill();
  gctx.fillStyle = 'rgba(80,78,70,0.55)';
  for (let i = 0; i < 6; i++) {
    gctx.beginPath();
    gctx.ellipse(b.x + rand(-22, 22), b.y + rand(-9, 9), rand(3, 7), rand(2, 5), rand(0, 3), 0, 7);
    gctx.fill();
  }
}

function stampWatchtowerRubble(t) {
  // splintered timber frame collapsed in a heap
  gctx.fillStyle = 'rgba(80,66,44,0.55)';
  gctx.beginPath();
  gctx.ellipse(t.x, t.y, 18, 8, 0, 0, 7);
  gctx.fill();
  gctx.strokeStyle = 'rgba(60,48,30,0.6)';
  gctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const a = rand(0, Math.PI * 2), len = rand(8, 16);
    gctx.beginPath();
    gctx.moveTo(t.x, t.y);
    gctx.lineTo(t.x + Math.cos(a) * len, t.y + Math.sin(a) * len * 0.5);
    gctx.stroke();
  }
}

function stampCamoNestRubble(cn) {
  // scorched brush and torn netting
  gctx.fillStyle = 'rgba(45,42,30,0.55)';
  gctx.beginPath();
  gctx.ellipse(cn.x, cn.y, 24, 11, 0, 0, 7);
  gctx.fill();
  gctx.fillStyle = 'rgba(70,60,40,0.5)';
  for (let i = 0; i < 5; i++) {
    gctx.beginPath();
    gctx.ellipse(cn.x + rand(-18, 18), cn.y + rand(-8, 8), rand(3, 6), rand(2, 4), rand(0, 3), 0, 7);
    gctx.fill();
  }
}

function endRun(won, title, stats) {
  G.over = true;
  running = false;
  paused = false;
  hideTutorialMsg();
  const titleEl = document.getElementById('go-title');
  titleEl.textContent = title;
  titleEl.classList.toggle('victory', won);
  document.getElementById('go-stats').textContent = stats;
  const nextBtn = el('next-mission-btn');
  const nextId = won && G ? getNextMissionId(G.level.id) : null;
  if (nextBtn) {
    nextBtn.classList.toggle('hidden', !nextId);
    if (nextId) {
      const nextLevel = LEVELS[nextId];
      nextBtn.dataset.nextLevel = nextId;
      nextBtn.textContent = nextLevel
        ? 'NEXT: ' + (nextLevel.menuName || nextLevel.name)
        : 'NEXT MISSION';
    } else {
      delete nextBtn.dataset.nextLevel;
    }
  }
  document.getElementById('gameover').classList.remove('hidden');
  el('pause').classList.add('hidden');
  updateGameOverLeaderboard(won);
  refreshHUD();
}

function gameOver() {
  const t = Math.floor(G.time);
  if (isAssaultMode()) {
    const waves = assaultWaves(G.level);
    const defLabel = defenderNationLabel(levelDefenderNation(G.level));
    endRun(false, 'ATTACK REPULSED',
      `All ${waves} waves spent. ${G.breaches}/${G.level.winBreaches} breakthroughs — ` +
      `the ${defLabel} line holds, and ${G.kills} defenders down was not enough.`);
  } else if (G.mode === 'hitsquad') {
    const wiped = !G.enemies.some(e => !e.dead);
    endRun(false, wiped ? 'SQUAD LOST' : 'MISSION FAILED',
      wiped
        ? `All six men are gone after ${t} seconds. The target lives; ${G.kills} Americans went with them.`
        : `Time ran out after ${t} seconds. The target lives. ${G.kills} Americans down for nothing.`);
  } else {
    const diffPrefix = G.mode === 'endless' && G.difficulty ? `${G.difficulty.name} — ` : '';
    let stats = `${diffPrefix}You held for ${G.wave} waves and ${t} seconds. ` +
      `${G.kills} Germans will not go home.`;
    if (G.medalsEarned > 0) {
      stats += ` +${G.medalsEarned} medal${G.medalsEarned === 1 ? '' : 's'} earned — ` +
        `${loadEndlessCards().medals} banked for the card shop.`;
    }
    endRun(false, 'LINE OVERRUN', stats);
  }
}

function victory() {
  const t = Math.floor(G.time);
  if (isAssaultMode()) {
    const wiped = !G.units.some(u => !u.dead);
    let stats = wiped
      ? `Every defender is down after ${G.wave} waves. ${G.breaches} men through the breach, ${G.kills} eliminated.`
      : `The line collapses after ${G.wave} waves. ` +
        `${G.breaches} men through the breach, ${G.kills} defenders down.`;
    if (G.mode === 'axis') {
      const rpEarned = awardAxisRP(G.level, wiped, G.wave);
      if (rpEarned > 0) stats += ` +${rpEarned} Research Points earned.`;
    }
    endRun(true, 'LINE BROKEN', stats);
  } else if (G.mode === 'hitsquad') {
    const alive = G.enemies.filter(e => !e.dead).length;
    endRun(true, 'TARGET ELIMINATED',
      `The officer is dead after ${t} seconds. ` +
      `${alive}/${G.squadTotal} men walk away; ${G.kills} Americans do not.`);
  } else {
    endRun(true, 'SECTOR HELD',
      `You stopped all ${G.wave} waves in ${t} seconds. ` +
      `${G.kills} Germans will not go home. The line is yours.`);
  }
  if (campaignForLevel(G.level.id)) {
    markLevelComplete(G.level.id);
  }
}
