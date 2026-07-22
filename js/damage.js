/* Trenchworks: WW2 — damage & death.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

function bloodSplat(x, y, amount) {
  for (let i = 0; i < amount; i++) {
    G.particles.push({
      x, y, vx: rand(-70, 70), vy: rand(-90, 10),
      ttl: rand(0.25, 0.7), grav: 260, size: rand(1, 2.5),
      color: pick(['#7a1410', '#95201a', '#5c0e0a']),
    });
  }
  addGroundMark({
    type: 'blood',
    x: x + rand(-6, 6), y: y + rand(-4, 8),
    rx: rand(3, 9), ry: rand(2, 6), rot: rand(0, 3),
    color: `rgba(${randi(90, 130)},${randi(10, 22)},${randi(8, 16)},${rand(0.25, 0.5)})`,
  });
}

const CORPSE_TTL = 120; // bodies are carried off after two minutes
const GROUND_MARK_TTL = 120; // blood stains and blast craters fade after two minutes

function addGroundMark(mark) {
  G.groundMarks.push({ ttl: GROUND_MARK_TTL, ...mark });
}

function drawGroundMark(m, c) {
  const alpha = clamp(m.ttl / 8, 0, 1);
  c.save();
  c.globalAlpha = alpha;
  if (m.type === 'blood') {
    c.fillStyle = m.color;
    c.beginPath();
    c.ellipse(m.x, m.y, m.rx, m.ry, m.rot, 0, 7);
    c.fill();
  } else if (m.type === 'bloodpool') {
    c.fillStyle = m.color;
    c.translate(m.x, m.y);
    c.rotate(m.rot);
    c.beginPath(); c.ellipse(0, 2, 13, 8, 0, 0, 7); c.fill();
  } else if (m.type === 'crater') {
    c.translate(m.x, m.y);
    c.fillStyle = 'rgba(30,26,18,0.55)';
    c.beginPath(); c.ellipse(0, 0, m.r * 0.55, m.r * 0.42, m.rot1, 0, 7); c.fill();
    c.fillStyle = 'rgba(20,17,12,0.6)';
    c.beginPath(); c.ellipse(0, 0, m.r * 0.3, m.r * 0.22, m.rot2, 0, 7); c.fill();
  }
  c.restore();
}

function spawnCorpse(a) {
  addGroundMark({
    type: 'bloodpool', x: a.x, y: a.y, rot: rand(0, Math.PI * 2),
    color: `rgba(${randi(90, 120)},${randi(10, 20)},10,0.45)`,
  });
  G.corpses.push({ x: a.x, y: a.y, rot: rand(0, Math.PI * 2), side: a.side, nation: a.nation, ttl: CORPSE_TTL });
}

function drawCorpse(cp) {
  const alpha = clamp(cp.ttl / 8, 0, 1); // fade out over the last seconds
  const us = (cp.nation || cp.side) === 'us';
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cp.x, cp.y);
  ctx.rotate(cp.rot);
  ctx.fillStyle = us ? '#33402c' : '#4a4a40';
  ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = us ? '#5b6b4a' : '#61615a';
  ctx.beginPath(); ctx.arc(7, 0, 3.4, 0, 7); ctx.fill();
  ctx.restore();
}

function stampWreck(e) {
  gctx.save();
  gctx.translate(e.x, e.y);
  gctx.fillStyle = '#2e2c26';
  gctx.fillRect(-20, -14, 40, 28);
  gctx.fillStyle = '#211f1a';
  gctx.beginPath(); gctx.arc(0, 0, 10, 0, 7); gctx.fill();
  gctx.restore();
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

function stampAmmoCrateRubble(t) {
  // shattered crates and scattered boards
  gctx.fillStyle = 'rgba(70,58,34,0.5)';
  gctx.beginPath();
  gctx.ellipse(t.x, t.y, 15, 8, 0, 0, 7);
  gctx.fill();
  gctx.strokeStyle = 'rgba(50,40,22,0.6)';
  gctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const a = rand(0, Math.PI * 2), len = rand(6, 13);
    gctx.beginPath();
    gctx.moveTo(t.x, t.y);
    gctx.lineTo(t.x + Math.cos(a) * len, t.y + Math.sin(a) * len * 0.5);
    gctx.stroke();
  }
}

function damageUnit(u, dmg, from) {
  u.hp -= dmg;
  if (u.t.tank || u.t.vehicle || u.t.gunEmplacement) {
    G.particles.push({
      x: u.x + rand(-10, 10), y: u.y + rand(-10, 10), vx: 0, vy: -20,
      ttl: 0.4, grav: 0, size: 2, color: '#c8b872',
    });
  } else {
    bloodSplat(u.x, u.y, 3);
  }
  if (u.hp <= 0 && !u.dead) {
    const hooks = G.cardHooks && G.cardHooks[u.type];
    const saved = hooks && hooks.beforeDeath.length && hooks.beforeDeath.some(fn => fn(u));
    if (!saved) {
      u.dead = true;
      // when the player fights as the Germans, downed US defenders are his kills
      if (isAssaultMode() || G.mode === 'hitsquad') {
        G.kills++;
      }
      trackAlliedLoss(u);
      if (u.t.tank) {
        stampWreck(u);
        explode(u.x, u.y, 50, 60, true);
      } else if (u.t.vehicle) {
        stampJeepWreck(u);
        explode(u.x, u.y, 30, 45, false);
      } else if (u.t.gunEmplacement) {
        stampATGunWreck(u);
        explode(u.x, u.y, 26, 35, false);
      } else {
        spawnCorpse(u);
        bloodSplat(u.x, u.y, 8);
        SFX.scream();
      }
      const si = G.selected.indexOf(u);
      if (si !== -1) G.selected.splice(si, 1);
      // last acts: cards that fire when the man goes down (Dead Man's Switch)
      if (hooks && hooks.onDeath.length) for (const fn of hooks.onDeath) fn(u);
    }
  }
  // taking real fire (bullets, shells) sends a man diving; flame's tiny
  // per-tick damage is handled in flameSpray with a time-scaled roll
  if (dmg >= 3) tryGoProne(u, 0.65);
}

function gainXP(u) {
  u.xp++;
  const next = RANKS[u.rank + 1];
  const rankMult = u.t.tank ? 2.5 : (u.t.rankMult || 1);
  const need = next && next.kills * rankMult;
  if (next && u.xp >= need) {
    u.rank++;
    const heal = 15 * (u.t.rankHealMult || 1);
    u.hp = Math.min(u.maxhp, u.hp + heal);   // a promotion is good for morale
    if (u.side === 'us') SFX.promote();
    G.texts.push({ x: u.x, y: u.y - 22, text: 'PROMOTED: ' + next.name, ttl: 2.4 });
  }
}

// testing-mode RANK UP ability: promotes a unit by exactly one grade,
// regardless of side. Germans are never given xp/rank fields on spawn (they
// don't earn kills), so those default to 0 the first time one is touched
// here — same as a fresh US recruit.
function rankUpUnit(u) {
  u.rank = u.rank || 0;
  u.xp = u.xp || 0;
  const next = RANKS[u.rank + 1];
  if (!next) return;
  u.rank++;
  const rankMult = u.t.tank ? 2.5 : (u.t.rankMult || 1);
  u.xp = Math.max(u.xp, next.kills * rankMult);
  const heal = 15 * (u.t.rankHealMult || 1);
  u.hp = Math.min(u.maxhp, u.hp + heal);
  SFX.promote();
  G.texts.push({ x: u.x, y: u.y - 22, text: 'PROMOTED: ' + next.name, ttl: 2.4 });
}

// testing-mode PURGE ability: instantly destroys every unit and emplacement
// — American and German alike — inside the radius. Routes kills through
// damageUnit/damageEnemy so tanks and vehicles still leave their proper
// wreck and secondary blast instead of just vanishing; emplacements and
// mines are dropped straight to 0/dead and swept up by the normal cleanup
// pass in update().
function purgeRadius(x, y, r) {
  const at = { x, y };
  for (const u of G.units) if (!u.dead && dist(u, at) < r) damageUnit(u, 99999, at);
  for (const e of G.enemies) if (!e.dead && dist(e, at) < r) damageEnemy(e, 99999, at);
  for (const s of G.sandbags) if (dist(s, at) < r) s.hp = 0;
  for (const b of G.bunkers) if (dist(b, at) < r) b.hp = 0;
  for (const wt of G.watchtowers) if (dist(wt, at) < r) wt.hp = 0;
  for (const cn of G.camoNests) if (dist(cn, at) < r) cn.hp = 0;
  for (const ac of G.ammoCrates) if (dist(ac, at) < r) ac.hp = 0;
  for (const wr of G.wires) if (Math.abs(wr.x - x) < r + 35 && Math.abs(wr.y - y) < r) wr.hp = 0;
  for (const m of G.mines) if (!m.dead && dist(m, at) < r) m.dead = true;
}

function creditKill(u) {
  // only living friendly soldiers earn XP (explosions pass a plain {x,y})
  if (!u || u.side !== 'us' || u.dead) return;
  gainXP(u);
  // every kill in the game funnels through here with the true shooter, so
  // this is the one dispatch point for on-kill card effects
  const hooks = G.cardHooks && G.cardHooks[u.type];
  if (hooks) for (const fn of hooks.onKill) fn(u);
}

function damageEnemy(e, dmg, from) {
  if (e.chute > 0) return; // untouchable while the canopy is up
  e.hp -= dmg;
  if (e.t.tank || e.t.vehicle || e.t.v2) {
    G.particles.push({
      x: e.x + rand(-10, 10), y: e.y + rand(-10, 10), vx: 0, vy: -20,
      ttl: 0.4, grav: 0, size: 2, color: '#c8b872',
    });
  } else {
    bloodSplat(e.x, e.y, 3);
  }
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    // when attacking, dead Germans are your losses, not your payday —
    // but the US defenders who scored the kill still gain experience
    if (!isAssaultMode() && G.mode !== 'hitsquad') {
      G.kills++;
      earnTP(e.t.reward);
    }
    creditKill(from);
    if (e.t.tank) {
      stampWreck(e);
      explode(e.x, e.y, 50, 60, true);
    } else if (e.t.bike) {
      // bike shot out from under the crew: it crashes with both men aboard
      stampBike(e, true);
      bloodSplat(e.x, e.y, 10);
    } else if (e.t.apc) {
      stampHalftrackWreck(e);
      explode(e.x, e.y, 38, 55, false);
    } else if (e.t.vehicle) {
      stampJeepWreck(e);
      explode(e.x, e.y, 30, 45, false);
    } else if (e.t.v2) {
      // the battery itself going up is a big secondary explosion — the
      // warhead and fuel still on the pad don't go quietly
      stampV2Wreck(e);
      explode(e.x, e.y, 65, 100, true);
    } else {
      spawnCorpse(e);
      bloodSplat(e.x, e.y, 8);
      SFX.scream();
    }
    // hit-squad mode: drop the fallen man from the player's selection
    const si = G.selected.indexOf(e);
    if (si !== -1) G.selected.splice(si, 1);
  }
  if (dmg >= 3) tryGoProne(e, 0.65);
}
