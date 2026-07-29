/* Trenchworks: WW2 — per-frame friendly unit logic.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

function officerBuff(u) {
  const officers = G.usOfficers || G.units;
  for (const o of officers) {
    if (o.dead || o === u) continue;
    if (!(o.type === 'officer' || o.type === 'eoff' || o.t.aura)) continue;
    if (dist2(o, u) < OFFICER_AURA * OFFICER_AURA) {
      // a veteran officer drives his men harder
      return { rofMult: 0.75 - (o.rank || 0) * 0.03, accBonus: 0.18 + (o.rank || 0) * 0.04 };
    }
  }
  return null;
}

// officer aura + veterancy: each rank is 8% faster, 8% straighter and 4%
// harder-hitting — a MSG puts out roughly 3.5x the fire of a green private
function unitBuffs(u) {
  if (u._buffsFrame === G.buffFrame) return u._buffs;
  const b = { rofMult: 1, accBonus: 0, dmgMult: 1 };
  const ob = officerBuff(u);
  if (ob) { b.rofMult *= ob.rofMult; b.accBonus += ob.accBonus; }
  b.rofMult *= ammoCrateRofMult(u);
  if (u.rank > 0) {
    b.rofMult *= 1 - u.rank * RANK_ROF_RATE;
    b.accBonus += u.rank * RANK_ACC_RATE;
    b.dmgMult *= 1 + u.rank * RANK_DMG_RATE;
  }
  // Cannibalize: +10% fire rate (lower rofMult = faster cycling) per
  // repairable object in the engineer's radius
  if (u.type === 'engineer' && u.side === 'us' && G.cardsOwned && G.cardsOwned.has('cannibalize')) {
    const n = engineerRepairCount(u);
    if (n > 0) b.rofMult *= Math.pow(0.9, n);
  }
  u._buffs = b;
  u._buffsFrame = G.buffFrame;
  return b;
}

// veterans hustle: each rank moves 4% quicker, so a MSG covers ground 24% faster
function unitSpeed(u) {
  let mult = 1 + (u.rank || 0) * RANK_SPD_RATE;
  // Double Time: shotgunner/flamer/medic/engineer close ground 30% faster
  if (u.side === 'us' && G.cardsOwned && G.cardsOwned.has('doubletime_' + u.type)) mult *= 1.3;
  return u.t.speed * mult;
}

// close-range specialists stretch their reach hardest as they rank up
function unitRangeRankRate(type) {
  if (type === 'mortarman') return 0.03;   // mortar crews stretch their reach 3% per rank
  return (type === 'shotgunner' || type === 'engineer' || type === 'officer' || type === 'flamer')
    ? 0.05 : 0.01;
}

// an ammo crate keeps nearby soldiers topped up: shorter reloads and quicker
// follow-up shots (lower rofMult = faster cycling). A fortified crate hands out
// more, a hardened one more still; a man in reach of several takes the best.
function ammoCrateRofMult(u) {
  if (u.side !== 'us' || !G.ammoCrates.length) return 1;
  let mult = 1;
  for (const ac of G.ammoCrates) {
    if (ac.hp > 0 && dist2(ac, u) < AMMOCRATE_AURA * AMMOCRATE_AURA) {
      const acMult = AMMOCRATE_ROF_MULT_TIERS[emplacementTier(ac)];
      if (acMult < mult) mult = acMult;
    }
  }
  return mult;
}

// a watch tower's raised vantage extends the sightline of nearby riflemen —
// but a mortar crew fires indirect and blind, so the tower does nothing for them.
// crews buttoned up in a vehicle or tank don't get the spotter's call either,
// nor does a gun crew staked to its trails (the AT and AA guns aim down their
// own sights, not the tower's) — only the ammo crate (a resupply) helps armor.
// an engineer-fortified tower (t.up) sees further and boosts the effect further.
// The Italian half of the same idea: a man up one of THEIR watch towers sees
// just as far. Read straight off his garrison link, so it costs nothing — the
// player-side version below has to scan every tower on the field.
function italianTowerRangeMult(u) {
  if (!u.garrisoned || u.t.mortar || isVehicleOrGun(u)) return 1;
  const w = u.garrison;
  if (!w || w.kind !== 'watchtower' || w.hp <= 0) return 1;
  return IT_WORK_KINDS.watchtower.rangeMult[emplacementTier(w)];
}

function watchtowerRangeMult(u) {
  if (u.side !== 'us') return italianTowerRangeMult(u);
  if (u.t.mortar || isVehicleOrGun(u) || !G.watchtowers.length) return 1;
  let mult = 1;
  for (const wt of G.watchtowers) {
    // a tower that has just been knocked down spots for nobody. compactDefenses
    // only sweeps hp <= 0 out at the END of update(), so without this the wreck
    // keeps extending everyone's reach for the rest of the frame it died in —
    // the same guard coverBlock and spotterSeesThrough already carry.
    if (wt.hp <= 0) continue;
    if (dist2(wt, u) < WATCHTOWER_AURA * WATCHTOWER_AURA) {
      const wtMult = WATCHTOWER_RANGE_MULT_TIERS[emplacementTier(wt)];
      if (wtMult > mult) mult = wtMult;
    }
  }
  return mult;
}

// Cannibalize: counts repairable objects (defense emplacements, plus vehicles
// and gun emplacements) inside the engineer's repair radius — cached per
// G.buffFrame since unitBuffs and unitRangeMult both need it every frame.
function engineerRepairCount(u) {
  if (u._repairCountFrame === G.buffFrame) return u._repairCount;
  const R2 = ENGINEER_RANGE * ENGINEER_RANGE;
  let n = 0;
  forEachDefense(s => { if (dist2(u, s) < R2) n++; });
  for (const a of G.units) {
    if (a === u || a.dead || !(a.t.tank || a.t.vehicle || a.t.gunEmplacement)) continue;
    if (dist2(u, a) < R2) n++;
  }
  u._repairCount = n;
  u._repairCountFrame = G.buffFrame;
  return n;
}

function unitRangeMult(u) {
  const rank = u.rank || 0;
  let mult = rank <= 0 ? 1 : 1 + rank * unitRangeRankRate(u.type);
  mult *= watchtowerRangeMult(u);
  // Rangefinders: a common per-type flag that stretches engagement range 25%.
  // Stamped for every US type but the medic; flag-only like Desperate Measures.
  if (u.side === 'us' && G.cardsOwned && G.cardsOwned.has('rangefinders_' + u.type)) {
    mult *= 1.25;
  }
  // Desperate Measures: a wounded flamethrower throws his stream farther. The
  // targeting scan, the burn in flameSpray, and the drawn cone all read this,
  // so they lengthen in lockstep.
  if (u.type === 'flamer' && u.side === 'us' && u.hp < u.maxhp * 0.5
      && G.cardsOwned && G.cardsOwned.has('desperatemeasures')) {
    mult *= 1.3;
  }
  // Follow Through: a kill arms the man's next shot with doubled reach. No card
  // or side check here — the flag is only ever set by the type-scoped onKill
  // hook, which buildCardHooks already restricts to US snipers and riflemen, so
  // one truthy read is all this hot path pays.
  if (u.longShot) mult *= LONG_SHOT_MULT;
  // Cannibalize: +10% range per repairable object in the engineer's radius
  if (u.type === 'engineer' && u.side === 'us' && G.cardsOwned && G.cardsOwned.has('cannibalize')) {
    const n = engineerRepairCount(u);
    if (n > 0) mult *= Math.pow(1.1, n);
  }
  return mult;
}

function unitRange(u, base) {
  return base * unitRangeMult(u);
}

// ---- rocket launchers ----
// TWO firers put a rocket in the air off the same rules: the bazooka man below,
// and the jeep's bazooka rider (fireJeepBazooka, js/cards.js), which was a
// line-for-line copy of both halves. They are split into a PICK and a LAUNCH
// rather than one call because that is exactly where the two differ — the rider
// stores his bearing and flash on his own fields so the .50 can keep swinging
// independently, and only the man on foot gives away a camo nest by firing.

// Tanks first, then soft vehicles, infantry only when there is nothing on
// wheels; never inside his own blast, and never over his own men. One pass.
function rocketTarget(u, rk, range) {
  const safeR2 = (rk.r + 20) * (rk.r + 20);
  const safe = e => dist2(u, e) > safeR2;
  const rt = tieredEnemyTarget(u, range, [
    e => e.t.tank && safe(e),
    e => (e.t.vehicle || e.t.bike) && safe(e),
    safe,
  ]);
  return rt && !friendlyNearPoint(rt.x, rt.y, 40, u) ? rt : null;
}

// Rockets scatter badly with distance; a tank is a big, slow target, and a
// veteran crew walks its shots in.
function launchRocket(u, rk, rt) {
  SFX.rocket();
  const d = dist(u, rt);
  let scatter = 8 + d * 0.11;
  if (rt.t.tank) scatter *= 0.45;
  scatter = Math.max(6, scatter * rankScatterMult(u));
  const tx = rt.x + rand(-scatter, scatter), ty = rt.y + rand(-scatter, scatter);
  G.rockets.push({
    sx: u.x, sy: u.y, x: u.x, y: u.y, tx, ty,
    t: 0, dur: Math.max(dist(u, { x: tx, y: ty }) / rk.speed, 0.15),
    r: rk.r, dmg: rk.dmg * (1 + u.rank * 0.04), by: u,
    kind: 'rocket',
  });
}

function updateUnit(u, dt) {
  // cosmetic/exposure timers, formerly separate full-array passes in update()
  if (u.flameT > 0) u.flameT -= dt;
  if (u.grenThrowT > 0) u.grenThrowT -= dt;
  if (u.shotgunBlastT > 0) u.shotgunBlastT -= dt;
  if (u.atgunFireT > 0) u.atgunFireT -= dt;
  if (u.mortarFireT > 0) u.mortarFireT -= dt;
  if (u.camoExposed > 0) u.camoExposed -= dt;
  // Morphine Syrette's guard. Never pre-initialized in makeUnit, like
  // emergencyRepairCd — `> 0` reads an unset field as "no dose" on its own.
  if (u.medicGuard > 0) u.medicGuard -= dt;

  // Horde infection: a bitten man keeps fighting but rots on a countdown; if it
  // runs out (or he's killed) he turns. tickInfection returns true once he's gone.
  if (u.infected > 0 && tickInfection(u, dt)) return;

  // Emergency Repair: a vehicle below 30% HP rapidly patches itself back up.
  // emergencyRepairCd is never pre-initialized in makeUnit, so it starts
  // undefined — `> 0` guards the countdown and `!(... > 0)` (not `<= 0`) gates
  // the trigger so a never-yet-set cooldown still reads as "ready".
  if (u.side === 'us' && (u.t.tank || u.t.vehicle)
      && G.cardsOwned && G.cardsOwned.has('emergencyrepair_' + u.type)) {
    if (u.emergencyRepairCd > 0) u.emergencyRepairCd -= dt;
    if (u.hp < u.maxhp * EMERGENCY_REPAIR_HP_THRESHOLD && !(u.emergencyRepairCd > 0)) {
      u.hp = Math.min(u.maxhp, u.hp + u.maxhp * EMERGENCY_REPAIR_HP_RESTORE);
      u.emergencyRepairCd = EMERGENCY_REPAIR_COOLDOWN;
    }
  }

  if (u.proneCd > 0) u.proneCd -= dt;
  if (u.prone > 0) {
    // a move order gets him up and running; otherwise he waits it out
    u.prone -= dt;
    // an officer in aura shouts him back onto his gun: the pin burns down
    // faster than real time, so a base of fire holds a rallied sector for a
    // fraction as long. This is the answer to massed MGs — see OFFICER_RALLY_MULT.
    if (officerBuff(u)) u.prone -= dt * OFFICER_RALLY_MULT;
    if (u.prone <= 0 || u.moveTo) {
      u.prone = 0;
      u.proneCd = rand(4, 6);
    } else {
      return; // pinned: no shooting, no grenades, no field work
    }
  }

  // the staked guns traverse and shoot, but never move
  if (u.t.atgun) {
    u.moveTo = null;
    updateATGun(u, dt);
    return;
  }
  if (u.t.aagun) {
    u.moveTo = null;
    updateAAGun(u, dt);
    return;
  }

  // a tank crew drives and fights at the same time
  if (u.t.tank) {
    if (u.moveTo) {
      const d = dist(u, u.moveTo);
      if (d < 4) {
        u.moveTo = null;
        u.face = vehicleHomeFace(u);
      } else {
        u.face = Math.atan2(u.moveTo.y - u.y, u.moveTo.x - u.x);
        const sp = unitSpeed(u);
        u.x += Math.cos(u.face) * sp * dt;
        u.y += Math.sin(u.face) * sp * dt;
      }
    }
    updateTankCombat(u, dt);
    return;
  }

  // the jeep's gunner keeps the .50 talking while the driver drives
  if (u.t.vehicle) {
    if (u.moveTo) {
      const d = dist(u, u.moveTo);
      if (d < 4) {
        u.moveTo = null;
        u.face = vehicleHomeFace(u);
      } else {
        const ang = Math.atan2(u.moveTo.y - u.y, u.moveTo.x - u.x);
        const sp = unitSpeed(u);
        u.x += Math.cos(ang) * sp * dt;
        u.y += Math.sin(ang) * sp * dt;
      }
    }
    const vt = primaryEnemyTarget(u, unitRange(u, u.t.range) * fogMult());
    // the .50's belt is long and its reload longer, so an empty stretch must
    // not drain it: hold the burst where it stands when nothing is in range.
    // the reload clock keeps running, or the gunner would owe the whole 24s
    // from the moment a target finally shows.
    if (!vt && u.burstLeft > 0) u.cd -= dt;
    else runWeapon(u, vt, dt, unitBuffs(u));
    // Bazooka Rider: the passenger works his own tube on a separate cooldown
    fireJeepBazooka(u, dt);
    return;
  }

  if (u.moveTo) {
    const d = dist(u, u.moveTo);
    if (d < 4) {
      u.moveTo = null;
    } else {
      u.face = Math.atan2(u.moveTo.y - u.y, u.moveTo.x - u.x);
      const sp = unitSpeed(u);
      u.x += Math.cos(u.face) * sp * dt;
      u.y += Math.sin(u.face) * sp * dt;
      return; // no shooting while running
    }
  }

  if (u.t.flame) {
    const ft = primaryEnemyTarget(u, unitRange(u, u.t.flame.range) * fogMult());
    if (ft) {
      u.face = Math.atan2(ft.y - u.y, ft.x - u.x);
      flameSpray(u, dt);
    }
    return;
  }

  if (u.t.shotgun) {
    const sg = u.t.shotgun;
    const st = primaryEnemyTarget(u, unitRange(u, sg.range) * fogMult());
    const buffs = unitBuffs(u);
    if (st) u.face = Math.atan2(st.y - u.y, st.x - u.x);
    u.cd -= dt;
    if (st && u.cd <= 0) {
      fireShotgun(u, buffs);
      const cycle = u.t.rof * buffs.rofMult * rand(0.85, 1.15);
      if (G.cardsOwned && G.cardsOwned.has('extendedtube')) {
        u.shellsLeft = (u.shellsLeft == null ? EXTENDED_TUBE_SHELLS : u.shellsLeft) - 1;
        if (u.shellsLeft <= 0) { u.cd = cycle * 3; u.shellsLeft = EXTENDED_TUBE_SHELLS; }
        else u.cd = cycle * 0.25;
      } else {
        u.cd = cycle;
      }
    }
    return;
  }

  const buffs = unitBuffs(u);
  const range = unitRange(u, u.t.range) * fogMult();
  let target = null;
  if (u.type === 'medic' && !u.armed) {
    // an unarmed medic never opens fire — only the Standard Issue rifle card
    // (which sets u.armed at spawn) gives him a weapon
  } else if (u.type === 'sniper') {
    target = sniperTarget(u, range);
  } else {
    target = primaryEnemyTarget(u, range);
  }
  runWeapon(u, target, dt, buffs);

  if (u.t.grenade) {
    // quick reflexes: a live German stick grenade landed close enough to
    // scoop up and heave back before the fuse runs out. Grenades already
    // caught, or thrown by a friendly (kind 'frag'), are never eligible.
    //
    // Keyed on the KIND, never on `by` being empty. Every grenade on the field
    // now carries its thrower — it has to, or explode() can't tell a German
    // stick from a friendly frag and the Escalation damage modifier silently
    // skips it — so "no firer" stopped meaning "enemy" the moment that was
    // fixed, and this loop would have started catching its own grenadier's frags.
    for (const g of G.grenades) {
      if (g.kind !== 'stick' || g.caught || !g.landed || g.fuse < 0.6) continue;
      const gdx = g.tx - u.x, gdy = g.ty - u.y;
      if (gdx * gdx + gdy * gdy > GRENADE_CATCH_RANGE * GRENADE_CATCH_RANGE) continue;
      g.caught = true;
      g.by = u;
      g.landed = false;
      g.t = 0;
      g.dur = 0.6;
      g.sx = u.x; g.sy = u.y;
      const back = nearestEnemyInRange(u, 260 * fogMult());
      const rx = back ? back.x : g.tx, ry = back ? back.y : g.ty - 160;
      const sc = 16;
      g.tx = rx + rand(-sc, sc);
      g.ty = ry + rand(-sc, sc);
      u.grenThrowT = 0.35;
      markCamoFired(u);
      G.texts.push({ x: u.x, y: u.y - 18, text: 'THROWN BACK!', ttl: 1.6 });
      break;
    }

    u.grenCd -= dt;
    if (u.grenCd <= 0) {
      // never inside his own blast, never onto a danger-close buddy
      const gt = nearestEnemyInRange(u, 200 * (1 + (u.rank || 0) * 0.10) * fogMult(), e => dist2(u, e) > 60 * 60);
      if (gt && !friendlyNearPoint(gt.x, gt.y, 55, u)) {
        // grenades are a rare, heavy punch — the carbine does the daily work.
        // Veterans throw more often, tighter and harder.
        u.grenCd = rand(9.6, 13.9) * rankCdMult(u);
        u.grenThrowT = 0.35;
        markCamoFired(u);
        const sc = 12 * rankScatterMult(u);
        G.grenades.push({
          x: u.x, y: u.y,
          tx: gt.x + rand(-sc, sc), ty: gt.y + rand(-sc, sc),
          t: 0, dur: 1.0, sx: u.x, sy: u.y, by: u,
          kind: 'frag',
          r: 46, dmg: 115 * (1 + u.rank * 0.05),
        });
      }
    }
  }

  if (u.t.rocket) {
    u.rocketCd -= dt;
    if (u.rocketCd <= 0) {
      const rk = u.t.rocket;
      const rt = rocketTarget(u, rk, unitRange(u, rk.range) * fogMult());
      if (rt) {
        // a veteran crew reloads faster
        u.rocketCd = rand(rk.cdMin, rk.cdMax) * rankCdMult(u);
        u.face = Math.atan2(rt.y - u.y, rt.x - u.x);
        markCamoFired(u);
        launchRocket(u, rk, rt);
      }
    }
  }

  if (u.t.mortar) {
    u.mortCd -= dt;
    if (u.mortCd <= 0) {
      const mt = u.t.mortar;
      const mr = unitRange(u, mt.range) * fogMult();
      const inRange = e => dist2(u, e) > mt.min * mt.min;
      // Heavy Shells widens the burst, so it has to widen the margin he keeps
      // off his own men by the same factor — otherwise the card quietly turns
      // his hold-fire check into a rule for dropping rounds inside the blast
      const blastMult = unitBlastMult(u);
      // counter-battery: friendly mortars drop on enemy mortar teams first
      let target = firstEnemyInRange(u, mr, e => inRange(e) && e.t.mortar);
      if (!target) target = firstEnemyInRange(u, mr, inRange);
      if (target && !friendlyNearPoint(target.x, target.y, 55 * blastMult, u)) {
        // veteran crews drop rounds faster, tighter and heavier
        u.mortCd = rand(mt.cdMin, mt.cdMax) * rankCdMult(u);
        u.face = Math.atan2(target.y - u.y, target.x - u.x);
        u.mortarFireT = 0.18;
        markCamoFired(u);
        G.flashes.push({ x: u.x, y: u.y - 6, r: 5, ttl: 0.07, max: 0.07 });
        // Cluster Rounds: a stick of shells rushed down the tube, each rolling
        // its own aim against the card's widened scatter and landing in sequence
        const cluster = u.side === 'us' && G.cardsOwned && G.cardsOwned.has('clusterrounds');
        const sc = mt.scatter * rankScatterMult(u) * (cluster ? CLUSTER_ROUNDS_SCATTER_MULT : 1);
        const shells = cluster ? Math.floor(rand(CLUSTER_ROUNDS_SHELLS_MIN, CLUSTER_ROUNDS_SHELLS_MAX + 1)) : 1;
        for (let i = 0; i < shells; i++) {
          // the `big` flag rides the card: explode() scales its crater, flash
          // and ring off r, but its particle COUNTS and shake are fixed, so a
          // doubled blast reads thin without it. Purely cosmetic and audio.
          scheduleShell(target.x + rand(-sc, sc), target.y + rand(-sc, sc),
            mt.flight + i * 0.15, mt.r * blastMult,
            mt.dmg * (1 + u.rank * 0.05), blastMult > 1, u);
        }
      }
    }
  }

  if (u.type === 'medic') {
    // vs the Horde a medic is a lifeline: he burns the infection out of anyone
    // rotting near him, faster than it spreads. Cure it before the man turns and
    // you keep a soldier instead of gaining a zombie. Runs every frame, not just
    // on the heal tick, so treatment is steady.
    if (infectionActive()) cureNearestInfected(u, dt);
    u.healTick -= dt;
    if (u.healTick <= 0) {
      u.healTick = 0.4;
      let worst = null, frac = 1;
      for (const a of G.units) {
        // no field-dressing machines: medics treat men, not metal
        if (a.dead || a === u || a.t.tank || a.t.vehicle || a.t.gunEmplacement || a.hp >= a.maxhp) continue;
        if (dist2(u, a) < MEDIC_RANGE * MEDIC_RANGE) {
          const f = a.hp / a.maxhp;
          if (f < frac) { frac = f; worst = a; }
        }
      }
      if (worst) {
        // experienced medics work far faster — a MSG patches at ~3.4x the rate
        const amt = Math.min(worst.maxhp - worst.hp, 3 + u.rank * 1.2);
        worst.hp += amt;
        // Morphine Syrette: the dose rides along with the patch-up. Re-stamped,
        // never added to, so it can't be stacked by piling medics on one man.
        if (G.cardsOwned && G.cardsOwned.has('morphinesyrette')) worst.medicGuard = MEDIC_GUARD_DURATION;
        u.healed += amt;
        SFX.heal();
        // 1 XP per 150 HP patched up — a slow road to sergeant
        if (u.healed >= 150) { u.healed -= 150; gainXP(u); }
        G.particles.push({ x: worst.x + rand(-6, 6), y: worst.y - 10, vx: 0, vy: -18, ttl: 0.5, grav: 0, size: 1.6, color: '#8fe08f' });
      }
    }
  }

  if (u.type === 'engineer') updateEngineer(u, dt);
}

// a medic tends the nearest infected man in range, draining his infection timer
// faster than real time (INFECT_CURE_PER_SEC on top of the natural tick). When it
// hits zero the infection is beaten and the man is saved — a rank-scaled MSG medic
// cures faster still, same as he heals faster.
function cureNearestInfected(u, dt) {
  let worst = null, best = 1e9;
  for (const a of G.units) {
    if (a.dead || a === u || !(a.infected > 0)) continue;
    if (a.t.tank || a.t.vehicle || a.t.gunEmplacement) continue;
    const d2 = dist2(u, a);
    if (d2 < MEDIC_RANGE * MEDIC_RANGE && a.infected < best) { best = a.infected; worst = a; }
  }
  if (!worst) return;
  worst.infected += INFECT_CURE_PER_SEC * (1 + u.rank * 0.25) * dt;   // push the turn back
  if (Math.random() < 0.4) {
    G.particles.push({ x: worst.x + rand(-6, 6), y: worst.y - 10, vx: 0, vy: -16, ttl: 0.5, grav: 0, size: 1.6, color: '#8fe08f' });
  }
  if (worst.infected >= worst.infectMax) {
    worst.infected = 0;
    u.healed += 40;   // curing counts toward the medic's promotion, like a big patch-up
    if (u.healed >= 150) { u.healed -= 150; gainXP(u); }
    SFX.heal();
    G.texts.push({ x: worst.x, y: worst.y - 22, text: 'CURED', ttl: 1.4, color: '#8fe08f' });
  }
}

// engineer work, one job at a time: repair emplacements, then repair
// damaged vehicles (slowly), then patch a man's battle-damaged armor plate
// (Field Armorer only), then fortify an intact emplacement he's standing next to
function updateEngineer(u, dt) {
  u.healTick -= dt;
  if (u.healTick > 0) return;
  u.healTick = 0.4;
  const R = ENGINEER_RANGE;
  const repairMult = (G.cardsOwned && G.cardsOwned.has('greasemonkey')) ? 2 : 1;

  const sparks = (x, y) => {
    if (Math.random() < 0.5) SFX.hammer();
    for (let i = 0; i < 3; i++) {
      G.particles.push({
        x: x + rand(-8, 8), y: y + rand(-6, 6), vx: rand(-25, 25), vy: rand(-45, -10),
        ttl: rand(0.15, 0.35), grav: 240, size: 1.4,
        color: pick(['#ffd94a', '#ffefa0', '#c8b872']),
      });
    }
  };
  const credit = (amt) => {
    u.healed += amt;
    if (u.healed >= 150) { u.healed -= 150; gainXP(u); }
  };

  // 1) restack damaged sandbags / patch bunker concrete / restring damaged wire / brace the watch tower
  let emp = null, empFrac = 1;
  const R2 = R * R;
  forEachDefense(s => {
    if (s.hp >= s.maxhp || dist2(u, s) > R2) return;
    const f = s.hp / s.maxhp;
    if (f < empFrac) { empFrac = f; emp = s; }
  });
  if (emp) {
    const amt = Math.min(emp.maxhp - emp.hp, (16 + u.rank * 5.4) * repairMult);
    emp.hp += amt;
    credit(amt * 0.5);
    sparks(emp.x, emp.y);
    return;
  }

  // 1.5) failing that, wrench on the most damaged vehicle or AT gun in range.
  // Armor and gun barrels are slow going by hand and barely teach a man
  // anything next to fortification work — a jeep, Sherman, or 57mm is
  // patched at a crawl.
  let veh = null, vehFrac = 1;
  for (const a of G.units) {
    if (a.dead || a === u || !(a.t.tank || a.t.vehicle || a.t.gunEmplacement) || a.hp >= a.maxhp) continue;
    if (dist2(u, a) > R2) continue;
    const f = a.hp / a.maxhp;
    if (f < vehFrac) { vehFrac = f; veh = a; }
  }
  if (veh) {
    const amt = Math.min(veh.maxhp - veh.hp, (0.5 + u.rank * 0.15) * 1.5 * repairMult);
    veh.hp += amt;
    credit(amt * 0.15);
    sparks(veh.x, veh.y);
    return;
  }

  // 1.75) Field Armorer: patch a nearby man's battle-damaged plate. Nothing else
  // in the game refills a Body/Flak Armor pool — without this card the only way
  // back is paying the 1 TP again — so an engineer parked with the squad trades
  // his attention for the plate instead. Rebuilding from a fully broken bar is
  // the point: the pool hits 0 but maxBodyArmor doesn't, so the plate is still
  // there to be patched (its bar simply hides while empty).
  if (G.cardsOwned && G.cardsOwned.has('fieldarmorer')) {
    // the worst single POOL on the field, not the worst man — he works one plate
    // per tick, like every other job here
    let man = null, flak = false, armFrac = 1;
    for (const a of G.units) {
      // armor is infantry kit (see nearestArmorableUnit); metal is pass 1.5's job
      if (a.dead || a === u || a.side !== 'us') continue;
      if (a.t.tank || a.t.vehicle || a.t.gunEmplacement) continue;
      if (dist2(u, a) > R2) continue;
      if (a.maxBodyArmor > 0 && a.bodyArmor < a.maxBodyArmor) {
        const f = a.bodyArmor / a.maxBodyArmor;
        if (f < armFrac) { armFrac = f; man = a; flak = false; }
      }
      if (a.maxFlakArmor > 0 && a.flakArmor < a.maxFlakArmor) {
        const f = a.flakArmor / a.maxFlakArmor;
        if (f < armFrac) { armFrac = f; man = a; flak = true; }
      }
    }
    if (man) {
      // deliberately the same crawl as the vehicle pass above, repairMult and
      // all: plate is metalwork. Grease Monkey doubling it is intended even
      // though that card's own text only names emplacements and vehicles —
      // don't "correct" one to match the other.
      const cur = flak ? man.flakArmor : man.bodyArmor;
      const max = flak ? man.maxFlakArmor : man.maxBodyArmor;
      const amt = Math.min(max - cur, (0.5 + u.rank * 0.15) * 1.5 * repairMult);
      if (flak) man.flakArmor += amt; else man.bodyArmor += amt;
      credit(amt * 0.15);
      sparks(man.x, man.y);
      return;
    }
  }

  // 2) fortify the nearest emplacement that still has work left (~6 s per tier).
  // Every intact piece earns a first fortification; with Hardened Works an
  // already-fortified piece can be pushed to a second, tougher tier.
  const hardened = G.cardsOwned && G.cardsOwned.has('hardenedworks');
  let target = null, td = R2;
  forEachDefense(s => {
    if (s.up2 || (s.up && !hardened)) return;
    const d = dist2(u, s);
    if (d < td) { td = d; target = s; }
  });
  if (target) {
    target.workProg += 0.4 * (1 + u.rank * 0.35);
    sparks(target.x, target.y);
    if (target.workProg >= 6) {
      target.workProg = 0;   // reset so a hardened second tier accrues fresh
      const tier = applyFortifyTier(target);   // helpers.js — shared with Pre-Hardened
      gainXP(u); gainXP(u); // a fortification is worth two points of pride
      G.texts.push({ x: target.x, y: target.y - 16,
        text: tier === 2 ? 'HARDENED' : 'FORTIFIED', ttl: 2.2 });
    }
  }
}

// ---- 57mm anti-tank gun: a dug-in direct-fire piece. It only answers to
// vehicles, and only inside the traverse cone its trails allow — unless it is
// carrying canister, which buys it the infantry that closed on it.
function updateATGun(u, dt) {
  const spec = u.t.atgun;
  const range = unitRange(u, u.t.range) * fogMult();
  const HOME = -Math.PI / 2;   // staked facing the German end of the field
  const arc = emplacementArc(u);
  const inCone = e => inFireCone(u, e, HOME, arc);
  // Canister Shot: the band is a FRACTION of the reach resolved just above, so
  // rank, a watch tower and Rangefinders stretch it with everything else.
  const canisterOn = canisterShotEnabled();
  const cRange = range * CANISTER_RANGE_FRAC;
  const cR2 = cRange * cRange;

  u.cd -= dt;

  // armor is the priority; soft vehicles after. Infantry is still not this gun's
  // job — canister only adds a THIRD tier under both of them, because a piece
  // that turns off a Panzer to blast the riflemen walking beside it is a piece
  // that stopped being an AT gun, and this ordering is the only thing stopping
  // that. The band check lives inside the predicate because tieredEnemyTarget
  // takes one range for every tier and this tier's is shorter.
  const tiers = [
    // the walker carries no `tank` flag (that would hand it the ×0.04 armor
    // multiplier this gun exists to bypass), so it is named here explicitly —
    // its codex entry already promises AT guns are one of the two things that
    // reach it. The Abomination is here for the same reason and one more: the
    // Horde fields no armour at all, so without it an AT gun has literally
    // nothing to shoot for a whole faction.
    e => (e.t.tank || e.t.awalker || e.type === 'zabom') && inCone(e),
    e => (e.t.vehicle || e.t.bike || e.t.v2) && inCone(e),
  ];
  if (canisterOn) tiers.push(e => canisterHittable(e) && dist2(u, e) <= cR2 && inCone(e));
  const target = tieredEnemyTarget(u, range, tiers);

  if (!target) {
    // crank the tube back to center
    u.turret += clamp(angleDiff(HOME, u.turret), -0.7 * dt, 0.7 * dt);
    u.face = u.turret;
    return;
  }

  // which round is up. The pick above can only ever reach a soft target through
  // the canister tier, so re-testing the winner is enough to know — no second
  // scan, and it stays correct when focus fire overrides the tier order.
  const canister = canisterOn && canisterHittable(target) && dist2(u, target) <= cR2;

  const want = Math.atan2(target.y - u.y, target.x - u.x);
  const diff = angleDiff(want, u.turret);
  u.turret += clamp(diff, -0.9 * dt, 0.9 * dt);
  u.face = u.turret;
  // a pattern this wide doesn't need the bore laid on the man an AP shell does
  if (u.cd > 0 || Math.abs(diff) > (canister ? CANISTER_LAY_TOL : 0.17)) return;

  if (canister) {
    fireCanister(u, cRange);
    u.cd = u.t.rof * CANISTER_RELOAD * rankCdMult(u) * rand(0.85, 1.15);
    return;
  }

  SFX.boom(false);
  u.atgunFireT = 0.16;
  G.flashes.push({
    x: u.x + Math.cos(u.turret) * 24, y: u.y + Math.sin(u.turret) * 24,
    r: 8, ttl: 0.07, max: 0.07,
  });
  // recoil kicks dust off the trails
  for (let i = 0; i < 4; i++) {
    G.particles.push({
      x: u.x + rand(-8, 8), y: u.y + rand(-4, 6), vx: rand(-30, 30), vy: rand(-40, -10),
      ttl: rand(0.2, 0.4), grav: 200, size: rand(1.2, 2.2),
      color: pick(['#6e6046', '#57492f', '#8a7a5a']),
    });
  }
  // AP shells drift at range; armor is a forgiving target but this isn't a laser
  const d = dist(u, target);
  let scatter = (24 + d * 0.11) * rankScatterMult(u);
  if (target.t.tank) scatter *= 0.80;
  else scatter *= 0.90;
  scatter = Math.max(11, scatter * 0.8 * (spec.scatterMult || 1));
  scheduleShell(
    target.x + rand(-scatter, scatter), target.y + rand(-scatter, scatter),
    0.45, spec.r, spec.shellDmg * (1 + u.rank * 0.06), false, u);
  u.cd = u.t.rof * rankCdMult(u) * rand(0.85, 1.15);
}

// ---- 40mm anti-aircraft gun: the same staked mount as the 57mm, but the
// barrels only elevate. It answers to enemy aircraft first — level bombers, or
// the kamikaze that replace them against the Imperial Japanese Army — and to
// paratroopers still hanging under canopy second, and it cannot touch anything
// on the ground.
// Nothing it fires is guaranteed to connect: it throws a fused shell at where
// it thinks the target will be, and the burst hits whatever is actually there.
function updateAAGun(u, dt) {
  const spec = u.t.aagun;
  const range = unitRange(u, u.t.range) * fogMult();
  const HOME = -Math.PI / 2;   // staked facing north, where the raids come from
  const arc = emplacementArc(u);
  const inRange = t => dist(u, t) <= range && inFireCone(u, t, HOME, arc);

  u.cd -= dt;

  // the raid is the reason this gun exists; a descending stick is a target of
  // opportunity while nothing is up
  let target = null, best = Infinity;
  for (const p of G.planes) {
    if (!isFlakTarget(p)) continue;
    const d = dist(u, p);
    if (d < best && inRange(p)) { best = d; target = p; }
  }
  if (!target) {
    for (const e of G.enemies) {
      if (e.dead || !(e.chute > 0)) continue;
      const d = dist(u, e);
      if (d < best && inRange(e)) { best = d; target = e; }
    }
  }

  // Level the Barrels: with nothing in the sky, the mount can depress onto the
  // nearest ground infantry that has closed inside its short direct-fire wedge
  let ground = false;
  if (!target && aaGroundFireEnabled()) {
    const gRange = AA_GROUND_RANGE * fogMult();
    const gt = nearestEnemyInRange(u, gRange, e => inFireCone(u, e, HOME, arc));
    if (gt) { target = gt; best = dist(u, gt); ground = true; }
  }

  if (!target) {
    // barrels crank back to center
    u.turret += clamp(angleDiff(HOME, u.turret), -0.9 * dt, 0.9 * dt);
    u.face = u.turret;
    return;
  }

  const want = Math.atan2(target.y - u.y, target.x - u.x);
  const diff = angleDiff(want, u.turret);
  // a flak mount traverses faster than an AT gun — it has to
  u.turret += clamp(diff, -1.5 * dt, 1.5 * dt);
  u.face = u.turret;
  if (u.cd > 0 || Math.abs(diff) > 0.2) return;

  if (ground) fireFlakGround(u, target, best);
  else fireFlakBurst(u, target, spec, best);
  u.cd = u.t.rof * rankCdMult(u) * rand(0.85, 1.15);
}

// Level the Barrels: a leveled 40mm round is a direct-fire HE shell, not a
// fused airburst — it lands on the ground and cracks a small blast where it
// hits, shredding the infantry that got too close.
function fireFlakGround(u, target, d) {
  SFX.boom(false);
  u.atgunFireT = 0.16;
  const mx = u.x + Math.cos(u.turret) * 20, my = u.y + Math.sin(u.turret) * 20;
  G.flashes.push({ x: mx, y: my, r: 7, ttl: 0.07, max: 0.07 });
  // recoil dust off the trails, same as the AT gun
  for (let i = 0; i < 3; i++) {
    G.particles.push({
      x: u.x + rand(-6, 6), y: u.y + rand(-4, 6), vx: rand(-24, 24), vy: rand(-34, -8),
      ttl: rand(0.2, 0.4), grav: 200, size: rand(1.1, 2),
      color: pick(['#6e6046', '#57492f', '#8a7a5a']),
    });
  }
  // barrel-flat fire is tight but not perfect; a slow-walking man barely leads
  const scatter = Math.max(6, (10 + d * 0.05) * rankScatterMult(u));
  const lead = 0.15;
  scheduleShell(
    target.x + (target.vx || 0) * lead + rand(-scatter, scatter),
    target.y + (target.vy || 0) * lead + rand(-scatter, scatter),
    0.15, AA_GROUND_HITR, AA_GROUND_DMG * (1 + (u.rank || 0) * 0.06), false, u);
}

function fireFlakBurst(u, target, spec, d) {
  SFX.boom(false);
  u.atgunFireT = 0.16;
  const mx = u.x + Math.cos(u.turret) * 20, my = u.y + Math.sin(u.turret) * 20;
  G.flashes.push({ x: mx, y: my, r: 7, ttl: 0.07, max: 0.07 });

  // lead the target over the shell's time of flight; a chuted man isn't going
  // anywhere, a bomber very much is
  const flight = Math.max(0.12, d / spec.shellSpeed);
  const tvx = target.vx || 0, tvy = target.vy || 0;
  // gunnery error grows with range and tightens with rank, but never vanishes
  const scatter = Math.max(9, (spec.scatter + d * 0.06) * rankScatterMult(u));

  G.flak.push({
    x: target.x + tvx * flight + rand(-scatter, scatter),
    y: target.y + tvy * flight + rand(-scatter, scatter),
    sx: mx, sy: my,
    timer: flight, dur: flight,
    hitR: spec.hitR, dmg: spec.planeDmg,
    by: u, done: false,
  });
}

// the fuse runs out and the shell throws a ball of steel wherever it happens
// to be. Anything airborne inside that ball takes it — including chutes, which
// ground ordnance passes harmlessly underneath.
function burstFlak(f) {
  SFX.boom(false);
  G.flashes.push({ x: f.x, y: f.y, r: f.hitR * 0.8, ttl: 0.18, max: 0.18 });
  for (let i = 0; i < 12; i++) {
    const ang = rand(0, Math.PI * 2);
    G.particles.push({
      x: f.x, y: f.y,
      vx: Math.cos(ang) * rand(20, 90), vy: Math.sin(ang) * rand(20, 90),
      ttl: rand(0.5, 1.2), grav: 12, size: rand(1.4, 3),
      color: pick(['#4a4a44', '#6a6a62', '#8c8c84', '#2e2e2a']),
    });
  }

  for (const p of G.planes) {
    if (!isFlakTarget(p)) continue;
    if (dist(p, f) > f.hitR) continue;
    p.hp -= f.dmg * rand(0.8, 1.2);
    for (let i = 0; i < 6; i++) {
      G.particles.push({
        x: p.x + rand(-8, 8), y: p.y + rand(-8, 8),
        vx: rand(-20, 20), vy: rand(-10, 30),
        ttl: rand(0.4, 0.9), grav: 40, size: rand(1.2, 2.4),
        color: pick(['#2a2318', '#4a3d28', '#6e6046']),
      });
    }
    if (p.hp <= 0) killPlane(p, f.by);
  }

  for (const e of G.enemies) {
    if (e.dead || !(e.chute > 0)) continue;
    if (dist(e, f) > f.hitR) continue;
    flakHitChute(e, f.by);
  }
}

// a man on silk has nothing to hide behind: a flak burst that finds him is
// almost always the end of it. This deliberately bypasses damageEnemy's chute
// guard — AA fire is the only thing on the field allowed through it.
function flakHitChute(e, by) {
  // occasionally he only catches a fragment and rides the rest of the way down
  if (Math.random() < 0.12) {
    e.hp -= rand(15, 30);
    bloodSplat(e.x, e.y, 4);
    if (e.hp > 0) return;
  }
  e.hp = 0;
  e.dead = true;
  e.chute = 0;   // canopy is gone; stop drawing him as a man still descending
  G.kills++;
  earnTP(e.t.reward);
  creditKill(by);
  bloodSplat(e.x, e.y, 10);
  spawnCorpse(e);
  // the collapsed canopy drifts down after him
  for (let i = 0; i < 9; i++) {
    G.particles.push({
      x: e.x + rand(-9, 9), y: e.y - rand(4, 16),
      vx: rand(-22, 22), vy: rand(10, 45),
      ttl: rand(0.9, 1.8), grav: -6, size: rand(1.8, 3.6),
      color: pick(['#c9c19a', '#b0a888', '#8a8668']),
    });
  }
  const si = G.selected.indexOf(e);
  if (si !== -1) G.selected.splice(si, 1);
}

// ---- shared tank gunnery: both sides alternate the main gun and coaxial MG,
// and keep shooting while the hull is moving

const TANK_SWAP_RELOAD = 2.0; // seconds between the cannon and the coax

// Flame Tank swaps a US Sherman's cannon for a hull flamethrower — returns the
// spec when the player owns the card, null otherwise.
function tankFlame(a) {
  // an enemy flame tankette (the Italian L3 Lf) carries its flame spec on its
  // type; the player's Sherman gets one from the Flame Tank card
  if (a.t.tankFlame) return a.t.tankFlame;
  return (a.side === 'us' && G.cardsOwned && G.cardsOwned.has('flametank'))
    ? FLAME_TANK_FLAME : null;
}

function tankTargets(a) {
  const fog = fogMult();
  const cannonRange = unitRange(a, a.t.range) * fog;
  const mgRange = unitRange(a, a.t.mg.range) * fog;
  const cone = a.t.fireCone;
  const inCone = e => !cone || inFireCone(a, e, a.turret, cone.arc);
  if (a.side === 'us') {
    const flame = tankFlame(a);
    if (flame) {
      // the flamethrower burns anything in its cone: infantry get shredded,
      // armor only scorched for chip damage at the same halved rate a flamer
      // manages (flameSpray applies the ×0.6 tank penalty). The coax still can't
      // touch armor, so it stays infantry-only like a stock Sherman's MG.
      const flameRange = unitRange(a, flame.range) * fog;
      return {
        cannon: nearestEnemyInRange(a, flameRange, inCone),
        mg: nearestEnemyInRange(a, mgRange, e => !e.t.tank && inCone(e)),
      };
    }
    return {
      // enemy armor is the cannon's priority target, inside the turret arc
      cannon: tieredEnemyTarget(a, cannonRange, [e => e.t.tank && inCone(e), inCone]),
      mg: nearestEnemyInRange(a, mgRange, e => !e.t.tank && inCone(e)),
    };
  }
  // enemy flame tankette: the "cannon" slot is its flame stream (infantry only —
  // the coax MG also can't touch armor), driven to short flame range
  const eflame = tankFlame(a);
  if (eflame) {
    const flameRange = unitRange(a, eflame.range) * fog;
    return {
      // Acquisition here is deliberately NOT cone-gated, unlike every other slot.
      // A flame tankette closes to ~90px, and at that range its own lateral drift
      // swings a target outside a 0.30 arc — which deadlocks it, because the
      // turret only traverses toward a target it cannot see until it has already
      // traversed. Measured: it halted at 91px and sat there indefinitely with a
      // rifleman in front of it. The hull turns onto what it is closing on; the
      // spray arc in flameSpray still decides who actually burns.
      cannon: nearestUnitInRange(a, flameRange),
      mg: nearestUnitInRange(a, mgRange, u2 => !u2.t.tank && inCone(u2)),
    };
  }
  return {
    cannon: nearestUnitInRange(a, cannonRange, inCone),
    mg: nearestUnitInRange(a, mgRange, u2 => !u2.t.tank && inCone(u2)),
  };
}

// one fixed beat between the two weapons: whatever just fired, the crew needs
// two seconds before the other one speaks. A veteran Sherman crew shaves it.
function tankReload(a) {
  return TANK_SWAP_RELOAD * rankCdMult(a);
}

function updateTankCombat(a, dt) {
  if (!a.wpn) a.wpn = 'cannon';
  a.cd -= dt;
  const mgSpec = a.t.mg;
  const TURRET_TRACK = 0.18; // rad/s — glacial traverse onto new targets
  const TURRET_HOME = 0.14;

  // an MG burst in progress finishes before anything else
  if (a.burstLeft > 0) {
    a.burstTimer -= dt;
    if (a.burstTimer <= 0) {
      const cone = a.t.fireCone;
      const inCone = t => !cone || inFireCone(a, t, a.turret, cone.arc);
      if (a.mgTarget && !a.mgTarget.dead && inCone(a.mgTarget)) {
        // a veteran crew keeps the coax on target too
        const r = a.rank || 0;
        fireShot(a, a.mgTarget, { weapon: mgSpec, accBonus: r * 0.08, dmgMult: 1 + r * 0.04 });
      }
      a.burstLeft--;
      a.burstTimer = mgSpec.burstGap;
      if (a.burstLeft <= 0) {
        a.wpn = 'cannon';
        a.cd = tankReload(a);
      }
    }
    return;
  }

  // a Flame Tank burst in progress: sustained spray from the turret each tick,
  // tracking the target so the cone stays on it, then swap to the coax
  if (a.flameLeft > 0) {
    a.flameLeft -= dt;
    const flame = tankFlame(a);
    if (flame && a.flameTarget && !a.flameTarget.dead) {
      const want = Math.atan2(a.flameTarget.y - a.y, a.flameTarget.x - a.x);
      a.turret += clamp(angleDiff(want, a.turret), -TURRET_TRACK * dt, TURRET_TRACK * dt);
    }
    if (flame) flameSpray(a, dt, { flame, bearing: a.turret, originDist: 24 });
    if (a.flameLeft <= 0 || !flame) {
      a.flameTarget = null;
      a.wpn = 'mg';
      a.cd = tankReload(a);
    }
    return;
  }

  const targets = tankTargets(a);
  // nothing for the weapon whose turn it is: the other one may take the shot,
  // but only once the swap reload has run out — the turn never gets skipped
  // early, so the tank can't lean on the cannon alone
  if (!targets[a.wpn] && a.cd <= 0) {
    const other = a.wpn === 'cannon' ? 'mg' : 'cannon';
    if (targets[other]) a.wpn = other;
  }
  const target = targets[a.wpn];
  // mid-reload the turret still follows whatever is out there, so the swap
  // isn't spent traversing from the parked heading
  const aim = target || targets[a.wpn === 'cannon' ? 'mg' : 'cannon'];

  if (!aim) {
    // park the turret facing the enemy side of the field
    const home = a.side === 'us' ? -Math.PI / 2 : Math.PI / 2;
    a.turret += clamp(angleDiff(home, a.turret), -TURRET_HOME * dt, TURRET_HOME * dt);
    return;
  }

  const want = Math.atan2(aim.y - a.y, aim.x - a.x);
  const diff = angleDiff(want, a.turret);
  a.turret += clamp(diff, -TURRET_TRACK * dt, TURRET_TRACK * dt);
  if (!target || a.cd > 0 || Math.abs(diff) > 0.15) return;

  if (a.wpn === 'cannon') {
    // Flame Tank: the cannon slot opens a sustained flame burst instead of
    // lobbing a shell — the spray itself runs in the a.flameLeft block above
    const flame = tankFlame(a);
    if (flame) {
      a.flameLeft = FLAME_TANK_BURST;
      a.flameTarget = target;
      return;
    }
    SFX.boom(false);
    G.flashes.push({
      x: a.x + Math.cos(a.turret) * 26, y: a.y + Math.sin(a.turret) * 26,
      r: 9, ttl: 0.08, max: 0.08,
    });
    const d = dist(a, target);
    // a veteran gunner lays shells on the mark and hits harder
    const scatter = Math.max(18, 16 + d * 0.055) * rankScatterMult(a);
    // High Explosive widens the burst — and unlike the mortarman, a tank has no
    // hold-fire check at all, so the wider splash lands on your own line too.
    // 1 for every enemy tank, which shares this block.
    const blastMult = unitBlastMult(a);
    scheduleShell(target.x + rand(-scatter, scatter), target.y + rand(-scatter, scatter),
      0.7, 45 * blastMult, a.t.shellDmg * (1 + (a.rank || 0) * 0.06), blastMult > 1, a);
    a.wpn = 'mg';
    a.cd = tankReload(a);
  } else {
    a.burstLeft = mgSpec.burst;
    a.burstTimer = 0;
    a.mgTarget = target;
  }
}
