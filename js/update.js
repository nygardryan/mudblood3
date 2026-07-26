/* Trenchworks: WW2 — main update loop.
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

  // TP trickle
  G.tpTrickle -= dt;
  if (G.tpTrickle <= 0) { G.tpTrickle = TP_TRICKLE_INTERVAL; earnTP(1, 'steady'); }

  // officer TP bonus
  G.officerTick -= dt;
  if (G.officerTick <= 0) {
    G.officerTick = (G.cardsOwned && G.cardsOwned.has('rushorder')) ? 15 : 30;
    // rank pays: a MSG officer brings in 3 TP where a green one brings 1
    for (const u of G.units) if (!u.dead && u.type === 'officer') earnTP(1 + u.rank / 3, 'steady');
  }

  // Regio Esercito: works bookkeeping (front line, occupancy) on its own slow tick
  updateItalians(dt);

  // spawning: waves march in until the line breaks (paused in testing mode and
  // while a tutorial script is running the show)
  if (!isTestingMode() && !tutorialScriptActive()) {
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
  // smokescreen: burning pots, drifting puffs, and the sight-line bbox the
  // targeting scans reject against — must run before anyone picks a target
  updateSmoke(dt);

  // drop a focus-fire mark once its target is dead or off the field
  if (G.focusTarget && (G.focusTarget.dead || G.focusTarget.y < 0)) G.focusTarget = null;

  // per-unit cosmetic/exposure timers tick inside updateUnit/updateEnemy —
  // one pass over each roster instead of a dozen
  for (const u of G.units) if (!u.dead) updateUnit(u, dt);
  for (const e of G.enemies) if (!e.dead) updateEnemy(e, dt);

  // mines
  for (const m of G.mines) {
    if (m.dead) continue;
    for (const e of G.enemies) {
      if (e.dead || e.chute > 0) continue;
      const trig = e.t.tank ? 22 : e.t.apc ? 19 : e.t.vehicle ? 16 : 11;
      if (dist2(m, e) < trig * trig) {
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
      // a smoke round carries no charge: it cracks open into a burning pot
      else if (s.kind === 'smoke') plantSmokePot(s.x, s.y, s.burn);
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

  // Spitter bile globs: a lobbed corrosive shot that bursts where it lands. `arc`
  // is the parabolic lift the renderer draws the glob at; the shadow tracks the
  // ground point (b.x, b.y).
  for (const b of G.biles) {
    b.t += dt;
    const f = Math.min(b.t / b.dur, 1);
    b.x = b.sx + (b.tx - b.sx) * f;
    b.y = b.sy + (b.ty - b.sy) * f;
    b.arc = Math.sin(f * Math.PI) * (18 + b.dur * 34);
    if (Math.random() < 0.55) {
      G.particles.push({
        x: b.x, y: b.y - b.arc, vx: rand(-6, 6), vy: rand(0, 12),
        ttl: rand(0.2, 0.45), grav: 40, size: rand(1, 2), color: pick(['#7fbf4a', '#9fd66a']),
      });
    }
    if (f >= 1) { b.done = true; bileBurst(b.tx, b.ty, b.r, b.dmg, b.infect, b.by); }
  }

  // grenades in flight, then a 3-second fuse once they hit the ground
  for (const g of G.grenades) {
    if (!g.landed) {
      g.t += dt;
      if (g.t >= g.dur) {
        g.landed = true;
        g.fuse = 3;
      }
    } else {
      g.fuse -= dt;
      if (g.fuse <= 0) { g.done = true; explode(g.tx, g.ty, g.r || 38, g.dmg || 60, false, g.by); maybeFragShrapnel(g); }
    }
  }

  // Frag Grenades shrapnel: unaimed fragments streaking out of a grenadier's
  // blast. Each pellet advances along its heading, peppering any body it
  // sweeps over — friendly or enemy, once each — until it spends its reach.
  for (const sh of G.shrapnel) {
    const step = FRAG_SHRAPNEL_SPEED * dt;
    sh.x += sh.vx * dt;
    sh.y += sh.vy * dt;
    sh.dist += step;
    if (sh.dist >= sh.maxDist) { sh.done = true; continue; }
    if (Math.random() < 0.5) {
      G.particles.push({
        x: sh.x, y: sh.y, vx: rand(-6, 6), vy: rand(-6, 6),
        ttl: rand(0.1, 0.25), grav: 0, size: rand(0.8, 1.6), color: '#8a7d64',
      });
    }
    // pellets fade over their travel, so a graze at the fringe barely stings
    const falloff = 1 - (sh.dist / sh.maxDist) * 0.7;
    const r2 = FRAG_SHRAPNEL_HITR * FRAG_SHRAPNEL_HITR;
    for (const e of G.enemies) {
      if (e.dead || e.chute > 0 || e.y < 0) continue;
      const dx = e.x - sh.x, dy = e.y - sh.y;
      if (dx * dx + dy * dy > r2) continue;
      if (!sh.hit) sh.hit = new Set();
      if (sh.hit.has(e)) continue;
      sh.hit.add(e);
      let dmg = FRAG_SHRAPNEL_DMG * falloff * rand(0.85, 1.15);
      if (e.t.tank) dmg *= 0.05;
      else if (e.t.vehicle || e.t.apc) dmg *= 0.3;
      damageEnemy(e, dmg, sh.by || { x: sh.x, y: sh.y }, 'blast');   // frag shrapnel → flak armor
    }
    for (const u of G.units) {
      if (u.dead) continue;
      const dx = u.x - sh.x, dy = u.y - sh.y;
      if (dx * dx + dy * dy > r2) continue;
      if (!sh.hit) sh.hit = new Set();
      if (sh.hit.has(u)) continue;
      sh.hit.add(u);
      let dmg = FRAG_SHRAPNEL_DMG * falloff * rand(0.85, 1.15);
      if (u.t.tank) dmg *= 0.05;
      else if (u.t.vehicle || u.t.apc) dmg *= 0.3;
      damageUnit(u, dmg, { x: sh.x, y: sh.y }, 'blast');   // frag shrapnel → flak armor
    }
  }

  // breaches: an enemy that reaches the bottom edge cracks the line
  for (const e of G.enemies) {
    // The Yamato is clamped to YAM_SAFE_Y and can never get here — but this loop
    // has no break, so if that clamp ever regressed all twelve of her actors
    // would breach in the SAME frame, blowing straight past breachLimit into an
    // instant gameOver(). Cheap insurance against a one-line tuning mistake.
    if (e.t.ship || e.t.shipPart) continue;
    // Same insurance for the Progenitor: it is clamped to PROG_SAFE_Y, but if
    // that clamp regressed all six of its actors would breach in one frame.
    if (e.t.hordeBoss || e.t.bossPart) continue;
    // And the Treno Armato: it PARKS at TRAIN_STOP_Y by design — reaching the
    // bottom is its whole act, not a breakthrough, and a regressed stop constant
    // would otherwise end the run with all eight of its actors in one frame.
    if (e.t.itaBoss || e.t.trainPart) continue;
    if (!e.dead && e.y > H + 10) {
      e.dead = true; e.breached = true;
      G.breaches++;
      showBanner(factionAdjUpper() + ' BREAKTHROUGH! (' + G.breaches + '/' + G.level.breachLimit + ')');
      if (G.breaches >= G.level.breachLimit) gameOver();
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
  if (G.shake > 0) G.shake = Math.max(0, G.shake - 26 * dt);
  for (const tx of G.texts) { tx.ttl -= dt; tx.y -= 14 * dt; }
  for (const cp of G.corpses) cp.ttl -= dt;
  for (const g of G.gibs) updateGib(g, dt);
  for (const m of G.groundMarks) m.ttl -= dt;
  if (G.banner) { G.banner.ttl -= dt; if (G.banner.ttl <= 0) G.banner = null; }

  // cleanup
  compactInPlace(G.units, u => !u.dead);
  compactInPlace(G.enemies, e => !e.dead);
  compactDefenses(G.sandbags, stampSandbagRubble);
  compactDefenses(G.bunkers, stampBunkerRubble);
  compactDefenses(G.watchtowers, stampWatchtowerRubble);
  compactDefenses(G.camoNests, stampCamoNestRubble);
  compactDefenses(G.ammoCrates, stampAmmoCrateRubble);
  compactDefenses(G.dummies, stampDummyRubble);
  compactDefenses(G.itWorks, stampItalianWorkRubble);
  compactInPlace(G.wires, w => w.hp > 0);
  compactInPlace(G.mines, m => !m.dead);
  compactInPlace(G.shells, s => !s.done);
  compactInPlace(G.grenades, g => !g.done);
  compactInPlace(G.shrapnel, sh => !sh.done);
  compactInPlace(G.rockets, r => !r.done);
  compactInPlace(G.biles, b => !b.done);
  compactInPlace(G.smoke, s => s.ttl > 0);
  compactInPlace(G.smokePots, p => p.ttl > 0);
  compactInPlace(G.planes, p => !p.done);
  compactInPlace(G.flak, f => !f.done);
  compactInPlace(G.particles, p => p.ttl > 0);
  if (G.particles.length > PARTICLE_CAP) G.particles.splice(0, G.particles.length - PARTICLE_CAP);
  compactInPlace(G.tracers, t => t.ttl > 0);
  compactInPlace(G.flashes, f => f.ttl > 0);
  compactInPlace(G.texts, t => t.ttl > 0);
  compactInPlace(G.corpses, c => c.ttl > 0);
  compactInPlace(G.gibs, g => g.ttl > 0);
  compactInPlace(G.groundMarks, m => m.ttl > 0);
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
  // an endless run banks medals for the card shop, so offer a shortcut straight
  // there from the results screen instead of routing back through the menu
  const shopBtn = el('go-shop-btn');
  if (shopBtn) shopBtn.classList.toggle('hidden', !(G && G.mode === 'endless'));
  el('pause').classList.add('hidden');
  // every run ends on the After-Action Report first (js/recap.js). Its
  // CONTINUE button hands off to the mode's real results screen: an endless
  // defeat gets the medal-ceremony endgame ("Spotlight Locker") — the payoff
  // is the medals earned and the card shop they unlock — every other mode
  // the standard #gameover. Both stay hidden until the recap is dismissed;
  // the leaderboard elements are prepared now so the recap handoff finds them.
  const endless = G && G.mode === 'endless';
  document.getElementById('gameover').classList.add('hidden');
  document.getElementById('endless-endgame').classList.add('hidden');
  updateGameOverLeaderboard(won);
  showRecap(won, endless ? 'endless-endgame' : 'gameover');
  refreshHUD();
}

function gameOver() {
  const t = Math.floor(G.time);
  const diffPrefix = G.difficulty ? `${G.difficulty.name} — ` : '';
  let stats = `${diffPrefix}You held for ${G.wave} waves and ${t} seconds. ` +
    `${G.kills} ${factionPlural()} will not go home.`;
  if (G.medalsEarned > 0) {
    stats += ` +${G.medalsEarned} medal${G.medalsEarned === 1 ? '' : 's'} earned — ` +
      `${loadEndlessCards().medals} banked for the card shop.`;
  }
  endRun(false, 'LINE OVERRUN', stats);
}

function victory() {
  const t = Math.floor(G.time);
  endRun(true, 'SECTOR HELD',
    `You stopped all ${G.wave} waves in ${t} seconds. ` +
    `${G.kills} ${factionPlural()} will not go home. The line is yours.`);
}
