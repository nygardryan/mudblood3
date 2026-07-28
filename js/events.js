/* Trenchworks: WW2 — random events.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// air raid scaling: more bombers, heavier sticks, and tougher airframes as the
// waves grind on. Ramps from wave 4 to ~60, same envelope the old barrage used.
function raidForWave(w) {
  const t = clamp((w - 4) / 56, 0, 1);
  return {
    planes: Math.round(1 + t * 2),          // 1 -> 3 bombers
    bombsMin: 1,
    bombsMax: t < 0.5 ? 3 : 4,              // late raids drop the full stick
    r: Math.round(42 + t * 16),             // blast radius
    dmg: Math.round(47 + t * 20),           // bombs bite much harder later
    hp: Math.round(65 + t * 65),            // airframe toughness vs. flak
    attackR: Math.round(120 + t * 34),      // how far off the flight path they'll bomb
    big: w >= 36,
  };
}

// kamikaze scaling: the Japanese answer to the bombing raid. Every plane is
// exactly one explosion instead of a stick, so the formation is DOUBLE the
// bomber count, and the airframes grow with the wave — a light fighter early, a
// heavy aircraft late, with the blast scaling to match. Same wave 4 -> ~60
// envelope as raidForWave so the two events ramp together.
function kamiForWave(w) {
  const t = clamp((w - 4) / 56, 0, 1);
  return {
    planes: Math.round(2 + t * 4),          // 2 -> 6, twice a bombing raid's formation
    r: Math.round(38 + t * 30),             // blast radius: bigger plane, bigger fireball
    dmg: Math.round(42 + t * 36),           // a centered late hit maims a rifleman, rarely one-shots him
    // markedly softer than a bomber (65->130), and that is the AA gun's whole
    // deal here: a flak burst does 51-77, so this is one burst early and two
    // late. Twice the aircraft at half the airframe leaves the same SHARE of an
    // attack broken, so doubling the formation isn't a silent nerf to the one
    // unit that exists to answer it — and a kamikaze that has turned hard onto
    // a flank target spends less time inside the mount's ±19° wedge than a
    // bomber flying straight down through it does.
    hp: Math.round(44 + t * 44),
    size: 0.72 + t * 0.55,                  // airframe draw scale
    aim: Math.round(34 - t * 10),           // ± px the aim point sits off the man. Precise, never perfect.
    big: w >= 30,
  };
}

// paratroopers drop into the top 2/3 of the field: 4 men minimum,
// growing steadily with the wave count (cut 75% as part of the unit-count reduction pass)
function paradropCount(w) {
  return Math.max(1, Math.round(Math.min(4 + Math.floor(w / 6), 12 + Math.floor(wavesPast99(w) / 10)) * 1.35 * enemySpawnMult(w)));
}

const PARA_POOL = ['erifle', 'erifle', 'esmg', 'esmg', 'egren'];
// Imperial airborne (Teishin Shudan) equivalent for the Japanese faction
const PARA_POOL_JP = ['jrifle', 'jrifle', 'jbanzai', 'jbanzai'];
// Folgore paracadutisti for the Regio Esercito — the actual airborne arm, so it
// leans on the two types that never dig in rather than on the line infantry
const PARA_POOL_IT = ['ifolgore', 'ifolgore', 'ibersa', 'imosch'];

// Airborne per faction: the drop pool, the banner, and the heavy weapon that
// joins the stick from wave 10. A table rather than a chain of ternaries — the
// three-way version was already unreadable and a fourth faction reaching the
// German fallthrough is exactly how German paratroopers ended up landing in an
// Italian run. The Horde is absent on purpose: it has no aircraft, so
// triggerParadrop hands it to triggerHordeRising before it ever reads this.
const PARADROPS = {
  de: { pool: PARA_POOL, banner: 'FALLSCHIRMJÄGER! PARATROOPERS!', heavy: 'emg' },
  jp: { pool: PARA_POOL_JP, banner: 'TEISHIN PARATROOPERS!', heavy: 'jlmg' },
  it: { pool: PARA_POOL_IT, banner: 'FOLGORE PARACADUTISTI!', heavy: 'ibreda' },
};

function triggerParadrop() {
  const f = enemyFaction();
  // The Horde doesn't drop from the sky — the dead claw their way up out of the
  // ground behind your line. Same "behind you" pressure, no transport, no canopy.
  if (f === 'zo') { triggerHordeRising(); return; }
  const drop = PARADROPS[f] || PARADROPS.de;
  showBanner(drop.banner);
  spawnTransportFlyby();
  const w = G.wave;
  const pool = drop.pool.slice();
  if (w >= 10) pool.push(drop.heavy);
  const count = paradropCount(w);
  const cx = rand(120, W - 120);
  for (let i = 0; i < count; i++) {
    const x = clamp(cx + rand(-120, 120), 20, W - 20);
    const y = rand(40, H * (2 / 3) - 10);
    const e = makeEnemy(pick(pool), x, y);
    // untouchable while the canopy is up; staggered so the stick lands in sequence
    e.chute = rand(2.8, 3.6) + i * 0.2;
    e.chuteMax = e.chute;
    G.enemies.push(e);
  }
}

// The Horde's "paradrop": the buried dead tear up through the dirt behind the
// line and are on you at once — no descent, no grace period. A dirt-burst marks
// each one as it surfaces.
const RISING_POOL = ['zshambler', 'zshambler', 'zcrawler', 'zrunner'];
function triggerHordeRising() {
  showBanner('THE DEAD RISE BEHIND YOU!');
  const w = G.wave;
  const pool = RISING_POOL.slice();
  if (w >= 12) pool.push('zbloater');
  const count = paradropCount(w);
  const cx = rand(120, W - 120);
  for (let i = 0; i < count; i++) {
    const x = clamp(cx + rand(-140, 140), 20, W - 20);
    const y = rand(60, H * (2 / 3));
    const e = makeEnemy(pick(pool), x, y);
    G.enemies.push(e);
    // a spray of turned earth and gore as it breaks the surface
    addGroundMark({ type: 'blood', x, y, r: 10, rot1: rand(0, 3), rot2: rand(0, 3) });
    for (let k = 0; k < 8; k++) {
      G.particles.push({
        x: x + rand(-6, 6), y: y + rand(-4, 4), vx: rand(-24, 24), vy: rand(-50, -12),
        ttl: rand(0.3, 0.7), grav: 120, size: rand(1.4, 3), color: pick(['#4a3c28', '#5a4a30', '#3a2f1f']),
      });
    }
  }
  SFX.scream();
}

// ---- air bombing raid: a line of bombers crosses from the north edge to the
// south. Each one only opens its bay when allied troops pass inside its attack
// radius, and the sticks it drops are anything but precise. Once a bomber
// clears the bottom of the screen it's gone — the raid ends when they all are.
function triggerAirRaid(w) {
  // The Imperial Japanese Army doesn't bomb — it flies the aircraft into you.
  // Whole-function replacement rather than a table like PARADROPS, because
  // nothing about a kamikaze shares the bomber's shape: no bomb bay, no attack
  // radius, no overflight. Same door, entirely different mechanic.
  if (enemyFaction() === 'jp') { triggerKamikaze(w); return; }

  const cfg = raidForWave(w);
  showBanner(w >= 40 ? 'HEAVY BOMBER RAID!' : w >= 20 ? 'BOMBERS INBOUND!' : 'AIR RAID! TAKE COVER!');
  SFX.planeFlyby();

  // spread the formation across the field in lanes, then jitter so it doesn't
  // read as a parade; stagger the start heights so they arrive in sequence
  const lane = W / (cfg.planes + 1);
  for (let i = 0; i < cfg.planes; i++) {
    G.planes.push({
      role: 'bomber',
      x: clamp(lane * (i + 1) + rand(-34, 34), 40, W - 40),
      y: -70 - i * rand(70, 130),
      vx: rand(-14, 14),
      vy: rand(86, 112),
      hp: cfg.hp,
      maxhp: cfg.hp,
      attackR: cfg.attackR,
      bombsMin: cfg.bombsMin,
      bombsMax: cfg.bombsMax,
      bombR: cfg.r,
      bombDmg: cfg.dmg,
      bombBig: cfg.big,
      bombCd: rand(0, 0.6),
      sfxT: 0,
      flybyPlayed: true,
      done: false,
    });
  }
}

// ---- kamikaze attack: the Japanese variant of the air raid. Each pilot picks a
// man at random — not the nearest, so nowhere on the field is safe — and flies
// his aircraft into him. He tracks his man until he commits, and after that he
// flies the line he has, so a defender who moves late is missed by roughly the
// width of the pilot's aiming error. Twice the formation of a bombing raid,
// one explosion each, and flak is the only thing that can stop any of it.
function triggerKamikaze(w) {
  const cfg = kamiForWave(w);
  showBanner(w >= 40 ? 'TOKKŌTAI! THEY\'RE DIVING ON US!' : w >= 20 ? 'KAMIKAZE ATTACK!' : 'SUICIDE PLANES INBOUND!');
  SFX.planeFlyby();

  // same lane spread and staggered entry heights as the bomber formation, so a
  // raid arrives as a wave rather than all at once
  const lane = W / (cfg.planes + 1);
  for (let i = 0; i < cfg.planes; i++) {
    const speed = rand(150, 185);   // a dive: ~1.7× a bomber's cruise
    const y0 = -50 - i * rand(40, 90);
    G.planes.push({
      role: 'kamikaze',
      x: clamp(lane * (i + 1) + rand(-34, 34), 40, W - 40),
      y: y0,
      vx: rand(-18, 18),
      vy: speed,
      speed,
      hp: cfg.hp,
      maxhp: cfg.hp,
      blastR: cfg.r,
      blastDmg: cfg.dmg,
      big: cfg.big,
      // shot down, the wreck still goes off — but a warhead cooking off in a
      // tumbling airframe is not one driven into the dirt on purpose, and it
      // goes off short of where it was aimed. That shortfall is the whole
      // payoff for owning an AA gun.
      wreckR: Math.round(cfg.r * 0.7),
      wreckDmg: Math.round(cfg.dmg * 0.6),
      size: cfg.size,
      aim: cfg.aim,
      entryY: y0,        // where the dive started, so the renderer can read its altitude
      target: null,
      aimX: 0, aimY: 0,
      locked: false,
      dive: 0,
      sfxT: 0,
      flybyPlayed: true,
      done: false,
    });
  }
}

function triggerEvent() {
  const w = G.wave;
  const events = ['fog', 'fng', 'smokescreen'];
  if (w >= 4) events.push('airraid');
  if (w >= 12) events.push('airraid');
  if (w >= 24) events.push('airraid');
  if (w >= 40) events.push('airraid');
  if (w >= 8) events.push('airstrike');
  if (w >= 6) events.push('paradrop');
  runEvent(pick(events), w);
}

// fires one named random event. Split out of triggerEvent so testing mode can
// summon a specific one on demand instead of waiting on the wave-gated roll.
function runEvent(ev, w) {
  recapEvent(ev);
  if (ev === 'airraid') {
    triggerAirRaid(w);
  } else if (ev === 'kamikaze') {
    // testing only, and never rolled: 'airraid' already becomes this against the
    // Imperial Japanese Army. This key forces the Japanese half regardless of
    // who is actually across the field, which is the whole point of the testing
    // toolbar — see any event at any wave, against anyone.
    triggerKamikaze(w);
  } else if (ev === 'paradrop') {
    triggerParadrop();
  } else if (ev === 'fog') {
    showBanner('FOG ROLLS IN');
    SFX.event();
    G.fog = 25.3;
  } else if (ev === 'smokescreen') {
    triggerSmokescreen();
  } else if (ev === 'fng') {
    showBanner('REINFORCEMENTS: FNG REPORTING');
    SFX.event();
    const u = makeUnit('rifleman', rand(100, W - 100), rand(H - 90, H - 40));
    G.units.push(u);
  } else if (ev === 'airstrike') {
    showBanner('P-47 STRAFING RUN!');
    SFX.event();
    spawnStrafeRun(rand(120, W - 120));
  }
}

function showBanner(text) {
  G.banner = { text, ttl: 3.2 };
}
