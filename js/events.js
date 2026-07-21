/* Dirt & Iron — random events.
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

// paratroopers drop into the top 2/3 of the field: 4 men minimum,
// growing steadily with the wave count (cut 75% as part of the unit-count reduction pass)
function paradropCount(w) {
  return Math.max(1, Math.round(Math.min(4 + Math.floor(w / 6), 12 + Math.floor(wavesPast99(w) / 10)) * 1.35 * enemySpawnMult(w)));
}

const PARA_POOL = ['erifle', 'erifle', 'esmg', 'esmg', 'egren'];

function triggerParadrop() {
  showBanner('FALLSCHIRMJÄGER! PARATROOPERS!');
  SFX.alarm();
  spawnTransportFlyby();
  const w = G.wave;
  const pool = PARA_POOL.slice();
  if (w >= 10) pool.push('emg');
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

// ---- air bombing raid: a line of bombers crosses from the north edge to the
// south. Each one only opens its bay when allied troops pass inside its attack
// radius, and the sticks it drops are anything but precise. Once a bomber
// clears the bottom of the screen it's gone — the raid ends when they all are.
function triggerAirRaid(w) {
  const cfg = raidForWave(w);
  showBanner(w >= 40 ? 'HEAVY BOMBER RAID!' : w >= 20 ? 'BOMBERS INBOUND!' : 'AIR RAID! TAKE COVER!');
  SFX.alarm();
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

function triggerEvent() {
  const w = G.wave;
  const events = ['fog', 'fng'];
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
  if (ev === 'airraid') {
    triggerAirRaid(w);
  } else if (ev === 'paradrop') {
    triggerParadrop();
  } else if (ev === 'fog') {
    showBanner('FOG ROLLS IN');
    SFX.event();
    G.fog = 25.3;
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
