/* Trenchworks: WW2 — shooting.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

function fogMult() { return G.fog > 0 ? 0.6 : 1; }

// Brave uniques: a shotgunner (Point Blank) or flamer (Trial by Fire) with an
// enemy inside his own weapon's reach stands and fires rather than diving — a
// prone man of either can't use his short-range weapon, so ducking would just
// let the enemy close. Player units only, and only the type the card is tied to.
function braveStandsFast(u) {
  if (u.side !== 'us' || !G.cardsOwned) return false;
  const t = u.t;
  // fogMult, exactly as fireShotgun and flameSpray apply it: the reach tested
  // here has to be the reach he can actually SHOOT, or fog inverts the card —
  // it holds him on his feet against a man 77px out that his buckshot only
  // carries 58px to, which is the one situation ducking is for.
  if (t.shotgun && G.cardsOwned.has('pointblank')) {
    const slug = G.cardsOwned.has('rifledslugs');
    return !!nearestEnemyInRange(u, unitRange(u, t.shotgun.range) * fogMult() * (slug ? 1.6 : 1));
  }
  if (t.flame && G.cardsOwned.has('trialbyfire')) {
    return !!nearestEnemyInRange(u, unitRange(u, t.flame.range) * fogMult());
  }
  return false;
}

// infantry under fire hit the dirt: prone men can't shoot but dodge 60% of
// incoming rounds. Veterans get back up fast; green troops stay down a while.
function tryGoProne(u, chance) {
  if (!u || u.dead || !u.t || u.chute > 0) return;
  if (u.t.tank || u.t.vehicle || u.t.apc || u.t.bike || u.t.fixed) return;   // crews don't dive
  // Japanese infantry are fanatics: they never hit the dirt. Standing tall
  // costs them — but it means they never stall, they only close the distance.
  if (u.t.faction === 'jp') return;
  // bosses never dive — prone's 60% dodge would BUFF a damage sponge
  if (u.t.boss) return;
  if (u.prone > 0 || u.proneCd > 0 || u.moveTo) return;          // running men keep running
  if (braveStandsFast(u)) return;                                // brave-card men hold their ground
  // The dead flinch, but barely: a corpse has no self-preservation to appeal
  // to. Scaled rather than exempted outright — see the ZOM_PRONE_ constants.
  // The Horde takes no beaten-zone pin at all (suppress(), below), so this is
  // the only suppression-family effect that still touches it.
  const undead = u.t.faction === 'zo';
  if (Math.random() >= chance * (undead ? ZOM_PRONE_CHANCE_MULT : 1)) return;
  const rank = u.rank || 0;   // Germans carry no rank and eat dirt the longest
  u.prone = rand(2.5, 4.5) * (1 - rank * 0.15) * (undead ? ZOM_PRONE_TIME_MULT : 1);
}

// suppression proper: an MG's beaten zone, not a flinch. Unlike tryGoProne it
// REFRESHES a standing pin and ignores proneCd — that bypass is the mechanic
// (one near miss can't hold a man down; a gun that keeps firing can). Same
// men are exempt: crews, runners (moveTo clears prone anyway), brave-card
// holders. Tuning lives in the SUP_ block in constants.js.
// `hold` is how long the gun will keep firing this burst: a man stays down for
// that whole time plus a tail (SUP_PIN_MIN..MAX) before he dares lift his head.
// Tying the pin to burst LENGTH is what makes a long belt worth more than a
// short one — roll once, hold for as long as the gun talks.
// `mult` scales the resulting pin (Beaten Zone; 1 for everyone else).
function suppress(u, chance, hold, mult) {
  if (!u || u.dead || !u.t || u.chute > 0) return;
  if (u.t.tank || u.t.vehicle || u.t.apc || u.t.bike || u.t.fixed) return;
  // Two foes can't be pinned at all. Japanese fanatics don't take cover for a
  // machine gun any more than for a near miss (same rule as tryGoProne), and
  // the dead don't take cover for anything — the Horde's whole identity is
  // that it never stops closing, and a single BAR was freezing it solid.
  if (u.t.faction === 'jp' || u.t.faction === 'zo') return;
  // ...and an Italian for as long as the AVANTI order is running. A seven-second
  // set piece that a single machine gun can cancel isn't a set piece — the same
  // failure documented above for the Horde. Note this is suppression only: they
  // still go PRONE from a near miss (tryGoProne is untouched), so rifles keep
  // mattering against a charge.
  if (u.t.faction === 'it' && G.itCharge > 0) return;
  if (u.t.boss) return;   // a boss walks through the beaten zone
  if (u.moveTo) return;
  if (braveStandsFast(u)) return;
  // A German officer inside OFFICER_AURA_R steadies the men around him: they
  // still flinch from a beaten zone, but rarely and briefly. This is the fourth
  // and last army's answer to the pin, and the only one that isn't a blanket
  // exemption written above — see the DE_OFF_SUP_ constants for why it's scaled.
  const steady = deOfficerSteadies(u);
  if (Math.random() >= chance * (steady ? DE_OFF_SUP_CHANCE_MULT : 1)) return;
  const rank = u.rank || 0;   // veterans shrug off the pin faster (codex: cover)
  const pin = ((hold || 0) + rand(SUP_PIN_MIN, SUP_PIN_MAX)) * (mult || 1)
    * (steady ? DE_OFF_SUP_TIME_MULT : 1);
  u.prone = Math.max(u.prone, pin * (1 - rank * 0.15));
}

// a sup-flagged gun opening a burst beats the zone around its aim point: every
// man on the RECEIVING side inside SUP_RADIUS rolls a pin, and extra tracers
// walk the dirt so the player can read where the gun is holding. Runs off the
// burst's real target (see runWeapon), so a gun that smoke has blinded
// suppresses nothing — targeting never hands it a target to beat a zone around.
// Symmetric: the MG42/Nambu/Type 92 pin the player's line, the BAR gunner pins
// theirs, and both are read off the same flag.
function suppressArea(actor, target, hold) {
  const r2 = SUP_RADIUS * SUP_RADIUS;
  const receiving = actor.side === 'us' ? G.enemies : G.units;
  // Beaten Zone (gunner unique) stretches the pin every man in the zone takes;
  // 1 for every other gun on either side, so the enemy MGs are untouched.
  const mult = suppressionPinMult(actor);
  for (const u of receiving) {
    if (!u.dead && dist2(u, target) < r2) suppress(u, SUP_PIN_CHANCE, hold, mult);
  }
  actor.face = Math.atan2(target.y - actor.y, target.x - actor.x);
  const mx = actor.x + Math.cos(actor.face) * (actor.t.gun + 3);
  const my = actor.y + Math.sin(actor.face) * (actor.t.gun + 3);
  // All 3 tracers must leave from the actual muzzle tip (mx, my) — that's
  // where the sprite's barrel is drawn, so nudging the origin (as a prior
  // version of this fix did) makes rounds appear to float off the gun.
  // Scattering wide sideways offsets from one shared origin is what read as
  // a shotgun blast; instead walk the impacts long/short along the line of
  // fire (fx, fy) with only a narrow lateral wobble (px, py), like a real
  // burst's beaten zone rather than a fan of pellets.
  const fx = Math.cos(actor.face), fy = Math.sin(actor.face);
  const px = -Math.sin(actor.face), py = Math.cos(actor.face);
  for (let i = 0; i < SUP_FIRE_TRACERS; i++) {
    const along = rand(-SUP_FIRE_SPREAD, SUP_FIRE_SPREAD);
    const lateral = rand(-SUP_FIRE_SPREAD * 0.35, SUP_FIRE_SPREAD * 0.35);
    const hx = target.x + fx * along + px * lateral;
    const hy = target.y + fy * along + py * lateral;
    G.tracers.push({ x1: mx, y1: my, x2: hx, y2: hy, ttl: 0.09, life: 0.09 });
    G.particles.push({ x: hx, y: hy, vx: rand(-18, 18), vy: rand(-55, -15), ttl: 0.3, grav: 200, size: 1.3, color: '#6e6046' });
  }
}

// A garrisoned Italian's cover. O(1) — the man's garrison link already answers
// "which work is in front of him", so unlike the player-side scan below there is
// nothing to search. Chipping the work's HP on every stopped round is what lets
// rifles wear a work down even though they can't target one directly.
function italianCoverBlock(target) {
  if (!target.garrisoned) return false;
  const w = target.garrison;
  if (!w || w.hp <= 0) return false;
  const k = IT_WORK_KINDS[w.kind];
  const tier = emplacementTier(w);
  if (Math.random() >= k.dodge[tier]) return false;
  w.hp -= k.chip[tier];
  return true;
}

function coverBlock(target) {
  // crews buttoned into armour — and gunners stood at a staked trail — don't
  // duck, on either side
  if (isVehicleOrGun(target)) return false;
  // a scarecrow doesn't take cover — it just soaks the round (see damageDummy)
  if (target.isDummy) return false;
  // the enemy has its own works to hide behind, and its own way of resolving them
  if (target.side !== 'us') return italianCoverBlock(target);
  // bunker walls first: they stop more fire and barely notice small arms
  for (const b of G.bunkers) {
    const tier = emplacementTier(b);
    const r = BUNKER_COVER_R[tier];
    if (b.hp > 0 && dist2(b, target) < r * r) {
      if (Math.random() < BUNKER_COVER_DODGE[tier]) { b.hp -= BUNKER_COVER_CHIP[tier]; return true; }
    }
  }
  for (const s of G.sandbags) {
    // fortified bags stop more and shrug off hits better; hardened, more still
    const tier = emplacementTier(s);
    const r = SANDBAG_COVER_R[tier];
    if (s.hp > 0 && dist2(s, target) < r * r) {
      if (Math.random() < SANDBAG_COVER_DODGE[tier]) { s.hp -= SANDBAG_COVER_CHIP[tier]; return true; }
    }
  }
  // watch tower: spotters call out incoming fire, a flat 10% dodge for anyone under it
  for (const wt of G.watchtowers) {
    if (wt.hp > 0 && dist2(wt, target) < WATCHTOWER_AURA * WATCHTOWER_AURA) {
      if (Math.random() < 0.1) { wt.hp -= 3; return true; }
    }
  }
  return false;
}

// camo nest: allied infantry standing in its zone are invisible to enemy
// targeting until they open fire, then stay exposed for a few seconds after
// their last shot. Vehicles and fixed guns are too big to hide in one.
function camoNestAt(u) {
  for (const cn of G.camoNests) {
    if (cn.hp > 0 && dist2(cn, u) < CAMONEST_ZONE * CAMONEST_ZONE) return cn;
  }
  return null;
}

// isCamouflaged runs per enemy-vs-unit pair in targeting plus once per unit
// per draw, so the nest lookup rides the same 0.4s cache as the officer aura
// (G.buffFrame). camoExposed and nest HP stay live, so opening fire or losing
// the nest still reveals the man instantly.
function isCamouflaged(u) {
  if (u.side !== 'us' || u.dead || u.t.tank || u.t.vehicle || u.t.apc || u.t.bike || u.t.gunEmplacement) return false;
  if (u.camoExposed > 0) return false;
  const bf = G.buffFrame || 0;
  if (u._camoFrame !== bf) {
    u._camoFrame = bf;
    u._camoNest = camoNestAt(u);
  }
  const cn = u._camoNest;
  return !!(cn && cn.hp > 0);
}

function markCamoFired(u) {
  if (u.side !== 'us') return;
  const cn = camoNestAt(u);
  if (cn) u.camoExposed = CAMONEST_REVEAL_TIERS[emplacementTier(cn)];
}

function fireShot(shooter, target, opts) {
  // opts.weapon substitutes different gun stats (e.g. a tank's coaxial MG)
  const t = (opts && opts.weapon) || shooter.t;
  // Ambush (emplacement unique) — read BEFORE markCamoFired, which is the call
  // that breaks the concealment it tests. Spent by the SHOT, not the hit, like
  // Follow Through: the man has given his position away either way.
  const ambush = takeAmbushShot(shooter);
  shooter.face = Math.atan2(target.y - shooter.y, target.x - shooter.x);
  markCamoFired(shooter);
  const mx = shooter.x + Math.cos(shooter.face) * (t.gun + 3);
  const my = shooter.y + Math.sin(shooter.face) * (t.gun + 3);
  SFX[t.sfx]();
  G.flashes.push({ x: mx, y: my, r: 6, ttl: 0.07, max: 0.07, kind: 'muzzle', angle: shooter.face });
  if (shooter.side === 'us' && G.recap) G.recap.shotsFired++;

  let acc = t.acc * (opts && opts.accBonus ? 1 + opts.accBonus : 1);
  const d = dist(shooter, target);
  // the boss's hand cannon never misses its aim: acc 1 flat, with the range
  // falloff skipped so a shot at the edge of his reach is as sure as one at
  // arm's length. This is his AIM only, exactly like a lifted accMult below —
  // the prone-dodge and cover rolls further down can still take the round off
  // him, which is what keeps hitting the dirt worth doing under his advance.
  if (t.revolver) acc = 1;
  else acc *= clamp(1.15 - d / (unitRange(shooter, t.range) * 1.6), 0.35, 1);

  // card hooks (US shooters in endless only): Zeroed In lifts the base to-hit
  // before the roll; beforeShot may force a hit; afterShot sees the final
  // result. A lifted roll (accMult) still rolls prone-dodge and cover below —
  // it models the shooter's aim, not a promise. A beforeShot-forced hit is a
  // called sure shot (Crack Shot): it connects for real, so it skips the
  // prone-dodge and cover rolls that would otherwise eat the guaranteed round.
  const cardHooks = shooter.side === 'us' && G.cardHooks ? G.cardHooks[shooter.type] : null;
  if (cardHooks && cardHooks.accMult !== 1) acc = Math.min(0.98, acc * cardHooks.accMult);

  let hx = target.x, hy = target.y;
  let hit = Math.random() < acc;
  let forced = false;
  if (cardHooks) {
    for (const fn of cardHooks.beforeShot) if (fn(shooter)) { hit = true; forced = true; }
    for (const fn of cardHooks.afterShot) fn(shooter, hit);
  }
  if (!hit) { hx += rand(-22, 22); hy += rand(-16, 22); }

  G.tracers.push({
    x1: mx, y1: my, x2: hx, y2: hy, ttl: 0.09, life: 0.09,
    fromBar: shooter.type === 'gunner',
  });

  if (hit) {
    // a prone man is a small target: 60% of rounds kick dirt over him.
    // Rolled separately from sandbag cover, so the two stack multiplicatively.
    // A forced sure shot (Crack Shot) ignores both — it is guaranteed to land.
    if (!forced && target.prone > 0 && Math.random() < 0.6) {
      G.particles.push({ x: hx + rand(-6, 6), y: hy + 4, vx: rand(-25, 25), vy: rand(-55, -20), ttl: 0.3, grav: 200, size: 1.3, color: '#6e6046' });
      return;
    }
    if (!forced && coverBlock(target)) {
      G.particles.push({ x: hx, y: hy + 6, vx: rand(-20, 20), vy: -40, ttl: 0.3, grav: 150, size: 1.5, color: '#b8a878' });
      return;
    }
    let dmg = t.dmg * rand(0.75, 1.25) * (opts && opts.dmgMult ? opts.dmgMult : 1);
    if (t.revolver && target.t && (target.t.tank || target.t.apc || target.t.vehicle || target.t.gunEmplacement)) {
      // the boss's hand cannon: a flat anti-materiel round instead of the
      // smallarms armor scaling below — 49% of a Sherman's hull per hit
      dmg = t.revolver.armorDmg;
    } else if (target.t && target.t.tank) dmg *= 0.04;   // rifle rounds ping off armor
    else if (target.t && target.t.apc) dmg *= 0.3; // halftrack plate shrugs off most of it
    // Armor Piercing (gunner unique): AP belt punches through light armor,
    // so jeeps, halftracks and motorcycles take the multiplier on top
    dmg *= armorPiercingMult(shooter, target);
    // stacked on top of the armor scaling, so it doubles what actually lands
    if (ambush) dmg *= AMBUSH_DMG_MULT;
    // Headshot (sniper/rifleman unique): a connecting round finds the head.
    // Sent as overwhelming damage rather than a dead flag so damageEnemy's
    // normal death block runs — kill count, TP bounty, creditKill/onKill cards,
    // the recap and the corpse all fire, and this can never drift from the
    // ordinary death path. Rolled HERE, downstream of the accuracy roll, the
    // prone dodge and coverBlock, so only a round that genuinely landed can
    // proc. The bodyArmor term covers escalation rung VI's doubled plate, which
    // damageEnemy subtracts 1:1 before it touches HP.
    let headshot = false;
    if (target.side !== 'us' && headshotKills(shooter, target)) {
      dmg = target.hp + (target.bodyArmor || 0) + 1;
      headshot = true;
    }
    if (target.side === 'us') damageUnit(target, dmg, shooter, 'bullet');
    else damageEnemy(target, dmg, shooter, 'bullet');
    if (headshot) G.texts.push({ x: target.x, y: target.y - 24, text: 'HEADSHOT', ttl: 1.2 });
  } else {
    G.particles.push({ x: hx, y: hy, vx: rand(-15, 15), vy: rand(-50, -10), ttl: 0.25, grav: 200, size: 1.2, color: '#6e6046' });
    // a near miss is warning enough to hit the dirt
    tryGoProne(target, 0.4);
  }
}

// generic weapon logic shared by both sides
function runWeapon(actor, target, dt, buffs) {
  const t = actor.t;
  const rofMult = buffs && buffs.rofMult ? buffs.rofMult : 1;
  actor.cd -= dt;
  if (actor.burstLeft > 0) {
    actor.burstTimer -= dt;
    if (actor.burstTimer <= 0) {
      if (target) fireShot(actor, target, buffs);
      actor.burstLeft--;
      // veteran automatic gunners hold tighter, faster bursts too
      actor.burstTimer = t.burstGap * rofMult;
    }
    return;
  }
  if (target && actor.cd <= 0) {
    actor.cd = t.rof * rofMult * rand(0.85, 1.15);
    if (t.burst > 1) {
      actor.burstLeft = t.burst;
      actor.burstTimer = 0;
      // the pin runs as long as this burst will (see suppress)
      if (t.sup) suppressArea(actor, target, t.burst * t.burstGap * rofMult);
    } else {
      fireShot(actor, target, buffs);
    }
  }
}

// one tick of flame from `actor` toward its facing: burns EVERYTHING in the
// cone regardless of side — that's the deal you make with a flamethrower
// opts lets a non-flamer actor drive the stream: the Flame Tank passes its own
// flame spec, aims down the turret bearing, and offsets the nozzle to the
// barrel tip. Default behaviour (the M2 flamer) reads t.flame and faces face.
function flameSpray(actor, dt, opts) {
  const fl = (opts && opts.flame) || actor.t.flame;
  const bearing = (opts && opts.bearing !== undefined) ? opts.bearing : actor.face;
  const originDist = (opts && opts.originDist !== undefined) ? opts.originDist : actor.t.gun + 1.5;
  // fog shortens the stream the same way it shortens acquisition and the
  // drawn cone — otherwise men burn out past where the flame is rendered
  const range = unitRange(actor, fl.range) * fogMult();

  actor.flameT = 0.15;
  markCamoFired(actor);
  actor.flameSfx = (actor.flameSfx || 0) - dt;
  if (actor.flameSfx <= 0) { actor.flameSfx = 0.4; SFX.flame(); }

  const nx = actor.x + Math.cos(bearing) * originDist;
  const ny = actor.y + Math.sin(bearing) * originDist;
  if (Math.random() < 0.35) {
    G.flashes.push({ x: nx, y: ny, r: rand(5, 9), ttl: 0.06, max: 0.06 });
  }

  // roiling fire particles along the cone
  for (let i = 0; i < 9; i++) {
    const a = bearing + rand(-fl.arc, fl.arc) * 0.85;
    const d = rand(8, range * 0.95);
    const ttl = rand(0.12, 0.42);
    G.particles.push({
      x: actor.x + Math.cos(a) * d, y: actor.y + Math.sin(a) * d,
      vx: Math.cos(a) * rand(25, 75) + rand(-12, 12),
      vy: Math.sin(a) * rand(25, 75) - rand(10, 28),
      ttl, maxTtl: ttl, grav: -55, size: rand(2.5, 6),
      kind: 'flame', glow: rand(0.65, 1),
      color: pick(['#ffe070', '#ff9a2a', '#ffce4a', '#e05818', '#b83a10', '#3a3028']),
    });
  }
  // scorch the earth now and then
  if (Math.random() < 0.05) {
    const a = bearing + rand(-fl.arc, fl.arc) * 0.6;
    const d = rand(range * 0.4, range);
    gctx.fillStyle = 'rgba(30,26,18,0.28)';
    gctx.beginPath();
    gctx.ellipse(actor.x + Math.cos(a) * d, actor.y + Math.sin(a) * d,
      rand(4, 9), rand(3, 6), rand(0, 3), 0, 7);
    gctx.fill();
  }

  // a veteran keeps the stream on target: burn scales hard with rank
  const dps = fl.dps * (1 + (actor.rank || 0) * 0.35);
  const reach2 = (range + 8) * (range + 8);
  // Vampiric Flame: only the player's own flamer siphons, and only off actual
  // enemies — burning your own side for healing would reward friendly fire
  const vampiric = actor.side === 'us' && G.cardsOwned && G.cardsOwned.has('vampiricflame');
  const burn = (a2) => {
    if (a2 === actor || a2.dead) return;
    if (dist2(actor, a2) > reach2) return;
    if (Math.abs(angleDiff(Math.atan2(a2.y - actor.y, a2.x - actor.x), bearing)) > fl.arc) return;
    let dmg = dps * dt * rand(0.8, 1.2);
    // A flamethrower cannot touch a battleship's armor belt. This clause is not
    // flavour: burn is applied per-actor with no dedupe, and the Yamato's five
    // belt sections sit 62px apart, so 2-3 land inside the 78px cone and each
    // pours its full DPS into the same pool. At the ×0.6 tank floor that made one
    // veteran flamer worth ~120 dps against her (two, with Vampiric Flame, ~280
    // while healing) — comfortably the best anti-battleship weapon in the game,
    // from a man standing at FORWARD_X. The gun tubs are another matter: jymg
    // isn't `tank`, so it takes the whole stream, which is exactly the role we
    // want the flamer in — burn the crews, not the plate.
    if (a2.t.hullSection || a2.t.ship) dmg *= 0.06;
    else if (a2.t.tank) dmg *= 0.6;
    // creditKill ignores German shooters, so passing actor is always safe
    if (a2.side === 'us') {
      damageUnit(a2, dmg, actor, 'flame');   // flame bypasses body/flak armor
    } else {
      damageEnemy(a2, dmg, actor);
      if (vampiric) actor.hp = Math.min(actor.maxhp, actor.hp + dmg * VAMPIRIC_FLAME_LIFESTEAL);
    }
    // men dive under the fire stream within a second or so
    tryGoProne(a2, 1.5 * dt);
  };
  for (const u of G.units) burn(u);
  for (const e of G.enemies) burn(e);
}

// pump-action buckshot: one blast, every enemy caught in the cone takes
// pellet damage scaled by distance and how centered they are in the spread
function fireShotgun(actor, buffs) {
  const sg = actor.t.shotgun;
  // Rifled Slugs: one solid slug instead of a buckshot pattern — far greater
  // reach, almost no spread, and it drives the full pellet count into whatever
  // it lines up on.
  const slug = actor.side === 'us' && G.cardsOwned && G.cardsOwned.has('rifledslugs');
  const range = unitRange(actor, sg.range) * fogMult() * (slug ? 1.6 : 1);
  const baseArc = slug ? sg.arc * 0.75 : sg.arc;
  const arc = baseArc * (1 + (buffs && buffs.accBonus ? buffs.accBonus * 0.25 : 0));
  const mx = actor.x + Math.cos(actor.face) * (actor.t.gun + 2);
  const my = actor.y + Math.sin(actor.face) * (actor.t.gun + 2);

  SFX.shotgun();
  // as in fireShot: armed before the blast reveals him, one roll for the whole
  // pattern rather than per pellet
  const ambush = takeAmbushShot(actor);
  markCamoFired(actor);
  actor.shotgunBlastT = 0.12;
  G.flashes.push({ x: mx, y: my, r: 11, ttl: 0.09, max: 0.09, kind: 'muzzle', angle: actor.face });
  const spreadMult = rankSpreadMult(actor);
  if (slug) {
    // a single tight tracer punching out to full range
    G.tracers.push({
      x1: mx, y1: my,
      x2: actor.x + Math.cos(actor.face) * range, y2: actor.y + Math.sin(actor.face) * range,
      ttl: 0.08, life: 0.08, kind: 'buckshot',
    });
  } else {
    for (let i = 0; i < sg.pellets; i++) {
      const a = actor.face + rand(-sg.spread * spreadMult, sg.spread * spreadMult);
      const d = rand(25, range);
      G.tracers.push({
        x1: mx, y1: my,
        x2: actor.x + Math.cos(a) * d, y2: actor.y + Math.sin(a) * d,
        ttl: 0.07, life: 0.07, kind: 'buckshot',
      });
    }
  }
  for (let i = 0; i < 5; i++) {
    const a = actor.face + rand(-sg.spread * 0.6 * spreadMult, sg.spread * 0.6 * spreadMult);
    const ttl = rand(0.08, 0.2);
    G.particles.push({
      x: mx + Math.cos(a) * rand(4, 14), y: my + Math.sin(a) * rand(4, 14),
      vx: Math.cos(a) * rand(35, 70), vy: Math.sin(a) * rand(35, 70) - rand(5, 20),
      ttl, maxTtl: ttl, grav: 120, size: rand(1.2, 2.2),
      kind: 'smoke', color: pick(['#d8ccb0', '#c8b898', '#a89878', '#8a7a60']),
    });
  }
  G.particles.push({
    x: mx + Math.cos(actor.face) * 10, y: my + Math.sin(actor.face) * 10,
    vx: Math.cos(actor.face) * rand(30, 55), vy: Math.sin(actor.face) * rand(30, 55),
    ttl: 0.18, grav: 90, size: rand(1.5, 2.5), color: '#c8b898',
  });

  const rank = actor.rank || 0;
  // attackers (side 'de') hose defenders in G.units; friendlies hose G.enemies
  const foes = actor.side === 'de' ? G.units : G.enemies;
  const reach2 = (range + 8) * (range + 8);
  for (const e of foes) {
    if (!inTheFight(e) || isCamouflaged(e)) continue;
    const d2 = dist2(actor, e);
    if (d2 > reach2) continue;
    const d = Math.sqrt(d2);
    const ang = Math.atan2(e.y - actor.y, e.x - actor.x);
    const off = Math.abs(angleDiff(ang, actor.face));
    if (off > arc) continue;

    if (e.prone > 0 && Math.random() < 0.6) {
      G.particles.push({ x: e.x + rand(-6, 6), y: e.y + 4, vx: rand(-25, 25), vy: rand(-55, -20), ttl: 0.3, grav: 200, size: 1.3, color: '#6e6046' });
      continue;
    }
    if (coverBlock(e)) {
      G.particles.push({ x: e.x, y: e.y + 6, vx: rand(-20, 20), vy: -40, ttl: 0.3, grav: 150, size: 1.5, color: '#b8a878' });
      continue;
    }

    const centered = 1 - off / arc;
    // a slug barely bleeds off over distance and lands its whole mass on target;
    // buckshot loses half its punch at max range and only a few pellets connect
    const falloff = 1 - (d / range) * (slug ? 0.15 : 0.5);
    const pelletsHit = slug ? sg.pellets * 1.5 : Math.max(1, Math.round(centered * 2.5 + rand(0, sg.pellets * 0.35)));
    let dmg = sg.dmg * pelletsHit * falloff * (1 + rank * 0.09) * rand(0.9, 1.1);
    if (e.t.tank) dmg *= 0.06;
    else if (e.t.apc) dmg *= 0.2;
    if (ambush) dmg *= AMBUSH_DMG_MULT;
    if (e.side === 'us') damageUnit(e, dmg, actor, 'bullet');
    else damageEnemy(e, dmg, actor, 'bullet');
  }
}

// Canister Shot: the 57mm firing buckshot. There is no round in flight and
// nothing goes through scheduleShell — like fireShotgun this is one pass over
// the enemy list, and the tracers are cosmetic. `range` is the canister band
// updateATGun already resolved off the gun's live reach, passed in rather than
// recomputed so the overlay, the target scan and the damage all read one number.
// No side split: atgun exists only in UNIT_TYPES, so the foes are always
// G.enemies. No camo calls either — isCamouflaged returns false outright for a
// gunEmplacement, and e is always an enemy here.
function fireCanister(u, range) {
  const bearing = u.turret;
  const mx = u.x + Math.cos(bearing) * 24, my = u.y + Math.sin(bearing) * 24;

  SFX.boom(false);      // a cannon's report...
  SFX.shotgun();        // ...with a shot pattern riding on top of it
  // the SAME recoil timer the AP shell sets, so drawATGun kicks the barrel and
  // rocks the trails without knowing which round went out
  u.atgunFireT = 0.16;
  // a bigger, directional muzzle bloom than the AP shell's round r:8 flash
  G.flashes.push({ x: mx, y: my, r: 14, ttl: 0.09, max: 0.09, kind: 'muzzle', angle: bearing });

  // the pattern itself: a wall of buckshot tracers, the visual the whole card
  // rests on. Same kind:'buckshot' styling render.js gives the trench gun.
  for (let i = 0; i < CANISTER_PELLETS; i++) {
    const a = bearing + rand(-CANISTER_ARC, CANISTER_ARC);
    const d = rand(30, range);
    G.tracers.push({
      x1: mx, y1: my, x2: u.x + Math.cos(a) * d, y2: u.y + Math.sin(a) * d,
      ttl: 0.08, life: 0.08, kind: 'buckshot',
    });
  }
  // wad smoke off the muzzle — fireShotgun's, scaled up to a cannon
  for (let i = 0; i < 6; i++) {
    const a = bearing + rand(-CANISTER_ARC * 0.6, CANISTER_ARC * 0.6);
    const ttl = rand(0.1, 0.24);
    G.particles.push({
      x: mx + Math.cos(a) * rand(6, 18), y: my + Math.sin(a) * rand(6, 18),
      vx: Math.cos(a) * rand(40, 80), vy: Math.sin(a) * rand(40, 80) - rand(5, 20),
      ttl, maxTtl: ttl, grav: 120, size: rand(1.4, 2.6),
      kind: 'smoke', color: pick(['#d8ccb0', '#c8b898', '#a89878', '#8a7a60']),
    });
  }
  // and the trails kicking harder than they do on AP — 7 puffs, not 4
  for (let i = 0; i < 7; i++) {
    G.particles.push({
      x: u.x + rand(-8, 8), y: u.y + rand(-4, 6), vx: rand(-40, 40), vy: rand(-50, -12),
      ttl: rand(0.2, 0.45), grav: 200, size: rand(1.2, 2.4),
      color: pick(['#6e6046', '#57492f', '#8a7a5a']),
    });
  }

  const rank = u.rank || 0;
  const reach2 = (range + 8) * (range + 8);
  for (const e of G.enemies) {
    if (!inTheFight(e)) continue;
    if (!canisterHittable(e)) continue;   // armor is the AP shell's job, not this one's
    const d2 = dist2(u, e);
    if (d2 > reach2) continue;
    const off = Math.abs(angleDiff(Math.atan2(e.y - u.y, e.x - u.x), bearing));
    if (off > CANISTER_ARC) continue;

    // a man flat on his face eats mostly dirt
    if (e.prone > 0 && Math.random() < 0.6) {
      G.particles.push({ x: e.x + rand(-6, 6), y: e.y + 4, vx: rand(-25, 25), vy: rand(-55, -20), ttl: 0.3, grav: 200, size: 1.3, color: '#6e6046' });
      continue;
    }
    // and a parapet stops the balls dead
    if (coverBlock(e)) {
      G.particles.push({ x: e.x, y: e.y + 6, vx: rand(-20, 20), vy: -40, ttl: 0.3, grav: 150, size: 1.5, color: '#b8a878' });
      continue;
    }

    const d = Math.sqrt(d2);
    const centered = 1 - off / CANISTER_ARC;
    const falloff = 1 - (d / range) * CANISTER_FALLOFF;
    const hits = Math.max(2, Math.round(CANISTER_PELLETS * (0.3 + 0.5 * centered) * rand(0.85, 1.15)));
    // rank*0.06 is the AT gun's own veterancy curve, not the rifleman's 0.09
    damageEnemy(e, CANISTER_PELLET_DMG * hits * falloff * (1 + rank * 0.06), u, 'bullet');
  }
}
