/* Trenchworks: WW2 — waves & spawning.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

function wavesPast99(w) {
  return Math.max(0, w - 99);
}

function spawnIntervalForWave(w) {
  // steep ramp (0.32/wave) reaches the 7 s cadence floor by ~wave 28,
  // so the Germans hit full tempo early in a run
  const base = w <= 99
    ? clamp(16 - w * 0.32, 7, 16)
    : clamp(7 - wavesPast99(w) * 0.06, 4, 16);
  // WAVE_BREATHER guarantees a fixed pause between every wave
  return base + WAVE_BREATHER;
}

// enemy volume is cut 75% across the board (unit-count reduction pass), but
// the first 10 waves felt too quiet at that rate, so they're bumped back up
// toward 0.42 and then taper smoothly down to the 0.25 floor by wave 15 —
// no sudden difficulty step at wave 11.
function enemySpawnMult(w) {
  if (w <= 10) return 0.60;
  // ~1.5x the old band so each wave arrives as a bigger clump instead of a
  // steady dribble of pairs; the wider gaps in spawnIntervalForWave keep the
  // net volume in check
  return Math.max(0.46, 0.60 - (w - 10) * 0.024);
}

function waveComposition(w) {
  const late = wavesPast99(w);
  const mult = enemySpawnMult(w);
  // batches grow one man every 2.5 waves and the cap climbs fast (9 + w/14
  // pre-99, plus late growth), so wave size ramps up sharply through the
  // early-mid game instead of easing in
  const baseSize = Math.min(
    2 + Math.floor(w / 2.5) + (Math.random() < 0.35 ? 1 : 0) + Math.floor(late / 4),
    9 + Math.floor(w / 14) + Math.floor(late / 6),
  );
  // after wave 4, every wave fields at least 3 Germans so the assault never
  // thins to a token dribble as the run scales up
  const minSize = w > 4 ? 3 : 1;
  const size = Math.max(minSize, Math.round(baseSize * mult));
  const pool = ['erifle', 'erifle', 'erifle'];
  // tougher types unlock earlier so the threat mix escalates faster
  if (w >= 4) pool.push('esmg', 'esmg');
  if (w >= 7) pool.push('egren');
  if (w >= 9) pool.push('emg');
  if (w >= 11) pool.push('eflame');
  if (w >= 13) pool.push('esniper');
  if (w >= 32) pool.push('emortar');
  if (w >= 45) pool.push('ebazooka');
  const out = [];
  for (let i = 0; i < size; i++) out.push(pick(pool));
  if (w >= 12 && Math.random() < (0.30 + late * 0.004) * mult) out.push('eoff');
  // a motorcycle team races ahead of some waves; as German logistics spin
  // up, bikes ramp from 20% at wave 9 to a 90% cap at wave 99, then keep climbing
  const bikeChance = (late > 0
    ? Math.min(1, 0.9 + late * 0.006)
    : Math.min(0.9, w >= 9 ? 0.2 + (w - 9) * (0.7 / 90) : 0)) * mult;
  if (w >= 9 && Math.random() < bikeChance) out.push('ebike');
  // vehicle odds now climb with the wave too (from 0.13 at w20 upward), so
  // gun cars, halftracks and armor show up sooner and more often as it scales
  const vehChance = (0.13 + Math.max(0, w - 20) * 0.002) * (1 + late * 0.04) * mult;
  // a Kübelwagen gun car rolls in occasionally — armor arrives earlier now
  if (w >= 13 && Math.random() < vehChance) out.push('ejeep');
  // an armored halftrack hauls a full squad to the front
  if (w >= 14 && Math.random() < vehChance) out.push('ehalftrack');
  if (w >= 30 && Math.random() < vehChance) out.push('panzer');
  // past wave 100 the assault mechanizes: on top of the `size` infantry (which
  // is always spawned, so the wave never becomes pure armor) a growing share of
  // vehicles rolls in. vehShare climbs 1.5%/wave past 99 up to a 0.5 cap, so
  // vehicles top out at ~1/3 of the wave while infantry keeps the majority.
  if (late > 0) {
    const vehShare = Math.min(0.5, late * 0.015);
    const vehPool = ['ejeep', 'ehalftrack', 'ehalftrack', 'panzer'];
    const vehCount = Math.round(size * vehShare);
    for (let i = 0; i < vehCount; i++) out.push(pick(vehPool));
  }
  // V2 battery: one at a time, and only once the fighting is desperate. Not
  // scaled by `mult` — that's a general enemy-volume knob and was crushing
  // this down to a ~3% roll per wave even deep past 140; it's a rare
  // set-piece threat, not a regular trooper, so it gets its own odds.
  const v2Chance = Math.min(0.35, 0.10 + late * 0.004);
  if (w >= 140 && !G.enemies.some(e => !e.dead && e.type === 'ev2') && Math.random() < v2Chance) {
    out.push('ev2');
  }
  return out;
}

// Imperial Japanese Army composition. Same size/tempo curve as the Wehrmacht,
// but a wholly different roster: banzai chargers arrive early and define the
// threat, there are no bikes/halftracks/gun cars, and suicide lunge-mine men
// scale up sharply once the player has armor or emplacements to hunt.
function japWaveComposition(w) {
  const late = wavesPast99(w);
  const mult = enemySpawnMult(w);
  const baseSize = Math.min(
    2 + Math.floor(w / 2.5) + (Math.random() < 0.35 ? 1 : 0) + Math.floor(late / 4),
    9 + Math.floor(w / 14) + Math.floor(late / 6),
  );
  const minSize = w > 4 ? 3 : 1;
  const size = Math.max(minSize, Math.round(baseSize * mult));
  const pool = ['jrifle', 'jrifle', 'jrifle'];
  if (w >= 3) pool.push('jbanzai', 'jbanzai');   // chargers early — the signature threat
  if (w >= 4) pool.push('jsmg', 'jsmg');         // naval assault troops
  if (w >= 6) pool.push('jlmg');
  if (w >= 7) pool.push('jgren');
  if (w >= 8) pool.push('jknee');
  if (w >= 9) pool.push('jhmg');
  if (w >= 11) pool.push('jflame');
  if (w >= 13) pool.push('jsniper');
  if (w >= 16) pool.push('jmortar');
  const out = [];
  for (let i = 0; i < size; i++) out.push(pick(pool));
  if (w >= 12 && Math.random() < (0.30 + late * 0.004) * mult) out.push('joff');
  // lunge-mine suicide men: they only make sense against something worth ramming,
  // so they show from wave 18 and come thicker when the player fields armor or guns
  if (w >= 18) {
    const hasArmor = G.units.some(u => !u.dead && (u.t.tank || u.t.vehicle || u.t.gunEmplacement));
    const lungeChance = (hasArmor ? 0.55 : 0.22) * (1 + late * 0.03) * mult;
    if (Math.random() < lungeChance) out.push('jlunge');
    if (hasArmor && w >= 40 && Math.random() < lungeChance * 0.7) out.push('jlunge');
  }
  // armor arrives in tiers: the fast Ha-Go light tank first, the Chi-Ha from
  // the mid game, and the heavy Chi-Nu only once the fighting is desperate
  const armorChance = (0.10 + Math.max(0, w - 13) * 0.002) * (1 + late * 0.05) * mult;
  if (w >= 13 && Math.random() < armorChance) out.push('jhago');
  if (w >= 25 && Math.random() < armorChance) out.push('jtank');
  if (w >= 45 && Math.random() < armorChance * 0.7) out.push('jchinu');
  if (late > 0) {
    const armorShare = Math.min(0.4, late * 0.012);
    const armorPool = ['jhago', 'jtank', 'jtank', 'jchinu'];
    const armorCount = Math.round(size * armorShare);
    for (let i = 0; i < armorCount; i++) out.push(pick(armorPool));
  }
  return out;
}

// The Horde composition. Same size/tempo curve as the others, but denser — the
// dead come in bigger clumps than a disciplined army — and its own character: no
// armor, no vehicles, almost no ranged fire. Shamblers are the backbone, runners
// and crawlers swarm early, hounds streak ahead of the pack, and the heavier
// specials (spitter, bloater, brute, screamer, abomination) escalate the threat as
// the run drags on. What makes it dangerous isn't any one unit — it's that your
// own casualties keep rising against you (see infection handling elsewhere).
function zomWaveComposition(w) {
  const late = wavesPast99(w);
  const mult = enemySpawnMult(w);
  // the horde fields ~25% more bodies per wave than an army — attrition is the point
  const baseSize = Math.min(
    3 + Math.floor(w / 2.2) + (Math.random() < 0.4 ? 1 : 0) + Math.floor(late / 3.5),
    11 + Math.floor(w / 12) + Math.floor(late / 5),
  );
  const minSize = w > 3 ? 4 : 2;
  const size = Math.max(minSize, Math.round(baseSize * mult));
  const pool = ['zshambler', 'zshambler', 'zshambler'];
  if (w >= 2) pool.push('zrunner', 'zrunner');      // fresh runners from the start
  if (w >= 3) pool.push('zcrawler');
  if (w >= 5) pool.push('zhound');
  if (w >= 7) pool.push('zrevenant');               // the odd gunman
  if (w >= 9) pool.push('zbloater');
  if (w >= 12) pool.push('zspitter');
  if (w >= 14) pool.push('zbrute');
  const out = [];
  for (let i = 0; i < size; i++) out.push(pick(pool));
  // the screamer drives the pack — like the Italian officer it shows a touch more
  // often, because it makes every zombie around it faster
  if (w >= 8 && Math.random() < (0.35 + late * 0.004) * mult) out.push('zscreamer');
  // a stray pack of hounds races ahead of some waves
  if (w >= 5) {
    const houndChance = Math.min(0.7, 0.2 + (w - 5) * 0.01) * mult;
    if (Math.random() < houndChance) { out.push('zhound'); out.push('zhound'); }
  }
  // brutes lumber in from the mid game, more of them as it scales
  const bruteChance = (0.10 + Math.max(0, w - 14) * 0.003) * (1 + late * 0.04) * mult;
  if (w >= 14 && Math.random() < bruteChance) out.push('zbrute');
  // the Abomination is the horde's boss — rare, and only once it's already grim
  const abomChance = Math.min(0.4, 0.08 + late * 0.006);
  if (w >= 30 && !G.enemies.some(e => !e.dead && e.type === 'zabom') && Math.random() < abomChance) {
    out.push('zabom');
  }
  // deep into a run the horde just keeps thickening: extra shamblers/runners piled on
  if (late > 0) {
    const extra = Math.round(size * Math.min(0.5, late * 0.02));
    const swarmPool = ['zshambler', 'zrunner', 'zrunner', 'zcrawler', 'zbrute'];
    for (let i = 0; i < extra; i++) out.push(pick(swarmPool));
  }
  return out;
}

// Regio Esercito composition. Same size/tempo curve as the others; its own
// character is the DIGGER/CHARGER split — most of the line garrisons the works
// the sappers put up, and a smaller share of assault troops exists to come back
// out of them. (Phase 0: the roster is still three types deep, so the split is
// only sketched here — the engineer trickle and the depth-shifting charger share
// land with the full roster.)
function itaWaveComposition(w) {
  const late = wavesPast99(w);
  const mult = enemySpawnMult(w);
  const baseSize = Math.min(
    2 + Math.floor(w / 2.5) + (Math.random() < 0.35 ? 1 : 0) + Math.floor(late / 4),
    9 + Math.floor(w / 14) + Math.floor(late / 6),
  );
  const minSize = w > 4 ? 3 : 1;
  const size = Math.max(minSize, Math.round(baseSize * mult));
  // The roster splits in two, and the split IS the faction. DIGGERS garrison the
  // works and fight from them; CHARGERS never dig and exist for the AVANTI. Early
  // waves are mostly diggers — the player grinds against a line that keeps
  // creeping — and the charger share climbs with depth, so by the time the works
  // are thick the surge coming out of them is genuinely dangerous.
  const diggers = ['ifante', 'ifante', 'ifante'];
  if (w >= 3) diggers.push('imosch');
  if (w >= 6) diggers.push('ibreda');
  if (w >= 8) diggers.push('ibrixia');
  if (w >= 9) diggers.push('ifiat');
  if (w >= 13) diggers.push('icecc');
  if (w >= 16) diggers.push('imortaio');

  const chargers = ['ibersa'];
  if (w >= 11) chargers.push('iflame');
  if (w >= 15) chargers.push('ifolgore');
  if (w >= 17) chargers.push('iardito');

  // 15% chargers early, climbing to half the wave by the late game
  const chargerShare = Math.min(0.5, 0.15 + Math.max(0, w - 6) * 0.012);
  const out = [];
  for (let i = 0; i < size; i++) {
    const useCharger = w >= 7 && Math.random() < chargerShare;
    out.push(pick(useCharger ? chargers : diggers));
  }

  // Sappers ride OUTSIDE the pool, as a guaranteed trickle — the dig is the
  // faction, so it can't be left to a random draw that might not come up for
  // three waves. Suppressed once the field is full: a builder with nowhere to
  // build is just a bad rifleman.
  if (w >= 4 && G.itWorks.length < IT_WORK_CAP) {
    out.push('iguast');
    if (w >= 12 && Math.random() < 0.45 * mult) out.push('iguast');
  }
  // the officer runs the AVANTI clock, so he turns up a touch more often than
  // the other factions' leaders
  if (w >= 10 && Math.random() < (0.40 + late * 0.004) * mult) out.push('iuff');

  // Armour is tankette-heavy: the L3 flame tankette is the signature threat and
  // it swarms early, with the mediums arriving late as a second echelon.
  const armorChance = (0.10 + Math.max(0, w - 11) * 0.002) * (1 + late * 0.05) * mult;
  if (w >= 11 && Math.random() < armorChance) out.push('il3');
  if (w >= 16 && Math.random() < armorChance) out.push('il3');
  if (w >= 24 && Math.random() < armorChance) out.push('im13');
  if (w >= 42 && Math.random() < armorChance * 0.7) out.push('isemo');
  if (late > 0) {
    const armorShare = Math.min(0.4, late * 0.012);
    const armorPool = ['il3', 'im13', 'im13', 'isemo'];
    for (let i = 0; i < Math.round(size * armorShare); i++) out.push(pick(armorPool));
  }
  return out;
}

// ---- themed set-piece assaults: every 10th wave the enemy commits to a
// scripted attack. Themes cycle; the tier (wave/10) keeps climbing forever,
// so each theme returns bigger and meaner the next time around.

// Endless: how likely a freshly spawned man is to be wearing armor this wave.
// Linear ramp from ENEMY_ARMOR_MIN_CHANCE at wave 1 to ENEMY_ARMOR_MAX_CHANCE by
// ENEMY_ARMOR_FULL_WAVE. Body and flak share this exact curve — see armorEnemy.
function enemyArmorChance(w) {
  const frac = clamp((w - 1) / (ENEMY_ARMOR_FULL_WAVE - 1), 0, 1);
  return ENEMY_ARMOR_MIN_CHANCE + (ENEMY_ARMOR_MAX_CHANCE - ENEMY_ARMOR_MIN_CHANCE) * frac;
}

// Roll body/flak armor onto an endless enemy. Only plain foot soldiers qualify:
// vehicles/tanks already have a hull, and the undead don't wear vests. The plate
// grows a little as the waves climb, on top of the growing odds of getting one.
function armorEnemy(e, w) {
  if (!e || G.mode !== 'endless') return;
  const t = e.t;
  if (t.tank || t.vehicle || t.apc || t.bike || t.v2) return; // already armored hulls
  if (t.boss) return;                                         // bosses already sponge damage via HP
  if (t.shipPart) return;                                     // a gun tub doesn't wear a flak vest
  if (t.bossPart) return;                                     // nor does a sac of pus
  if (t.trainPart) return;                                    // nor does a wagon or its gun crew
  // Foot soldiers of every faction qualify, the undead included — reanimated
  // men still wear the plate they died in.
  const chance = enemyArmorChance(w);
  const frac = clamp((w - 1) / (ENEMY_ARMOR_FULL_WAVE - 1), 0, 1);
  // Two independent rolls: a man may get just body, just flak, both, or neither.
  if (Math.random() < chance) {
    const body = Math.round(ENEMY_ARMOR_BODY_MIN + (ENEMY_ARMOR_BODY_MAX - ENEMY_ARMOR_BODY_MIN) * frac);
    e.maxBodyArmor = e.bodyArmor = body;
  }
  if (Math.random() < chance) {
    const flak = Math.round(ENEMY_ARMOR_FLAK_MIN + (ENEMY_ARMOR_FLAK_MAX - ENEMY_ARMOR_FLAK_MIN) * frac);
    e.maxFlakArmor = e.flakArmor = flak;
  }
}

function spawnEnemyAt(type, x, y) {
  const e = makeEnemy(type, clamp(x, 30, W - 30), y);
  armorEnemy(e, G.wave);
  G.enemies.push(e);
  return e;
}

// special-wave tier t corresponds to wave t*10; reuses the same early-wave
// bump as waveComposition (1.3 base scale * enemySpawnMult).
function specialWaveMult(t) {
  return 1.3 * enemySpawnMult(t * 10);
}

const SPECIAL_WAVES = [
  {
    key: 'blitz',
    banner: 'BLITZKRIEG! KRADSCHÜTZEN SWARM!',
    // a torrent of motorcycles racing for your line, gun cars in the second echelon
    spawn(t) {
      const bikes = Math.floor(specialWaveMult(t) * (3 + t));
      for (let i = 0; i < bikes; i++) {
        spawnEnemyAt('ebike', rand(60, W - 60), -20 - i * rand(30, 70));
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * t / 2); i++) {
        spawnEnemyAt('ejeep', rand(100, W - 100), -80 - i * 100);
      }
    },
  },
  {
    key: 'parastorm',
    banner: 'FALLSCHIRMJÄGER ASSAULT!',
    // a mass drop behind your line while a ground element pins you frontally
    spawn(t) {
      spawnTransportFlyby();
      const pool = ['erifle', 'esmg', 'esmg', 'egren'];
      if (t >= 3) pool.push('emg');
      const count = Math.floor(specialWaveMult(t) * (6 + 2 * t));
      for (let i = 0; i < count; i++) {
        const e = spawnEnemyAt(pick(pool), rand(40, W - 40), rand(40, H * (2 / 3) - 10));
        e.chute = rand(2.8, 4.0) + i * 0.15;
        e.chuteMax = e.chute;
      }
      if (t >= 4) {
        const o = spawnEnemyAt('eoff', rand(120, W - 120), rand(60, H / 2));
        o.chute = rand(3, 4);
        o.chuteMax = o.chute;
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (3 + t / 2)); i++) {
        spawnEnemyAt(pick(['erifle', 'esmg']), rand(80, W - 80), rand(-70, -20));
      }
    },
  },
  {
    key: 'sturm',
    banner: 'STURMANGRIFF! HUMAN WAVE!',
    // a shoulder-to-shoulder line of shock infantry across the whole field
    spawn(t) {
      const count = Math.floor(specialWaveMult(t) * (8 + 2 * t));
      for (let i = 0; i < count; i++) {
        const x = (W / (count + 1)) * (i + 1) + rand(-25, 25);
        const roll = Math.random();
        const type = roll < 0.5 ? 'esmg' : roll < 0.65 && t >= 3 ? 'eflame' : 'erifle';
        spawnEnemyAt(type, x, rand(-90, -20));
      }
      const officers = Math.floor(specialWaveMult(t) * (1 + t / 5));
      for (let i = 0; i < officers; i++) {
        spawnEnemyAt('eoff', rand(120, W - 120), rand(-130, -90));
      }
    },
  },
  {
    key: 'nebel',
    banner: 'NEBELSTURM! THEY COME IN THE FOG!',
    // fog blankets the field while marksmen and MGs creep in behind the infantry
    spawn(t) {
      G.fog = Math.max(G.fog, Math.round((24 + t) * 1.15));
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (2 + t / 4)); i++) {
        spawnEnemyAt('esniper', rand(60, W - 60), rand(-140, -60));
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (1 + t / 4)); i++) {
        spawnEnemyAt('emg', rand(80, W - 80), rand(-110, -40));
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (6 + t)); i++) {
        spawnEnemyAt(pick(['erifle', 'erifle', 'esmg']), rand(50, W - 50), rand(-90, -20));
      }
    },
  },
  // panzerkeil sits last in the rotation so the first guaranteed armor column
  // doesn't hit until wave 50 — late enough to have saved for an AT answer
  {
    key: 'panzerkeil',
    banner: 'PANZERKEIL! ARMOR COLUMN!',
    // tanks and halftracks in column with an infantry screen out front
    spawn(t) {
      const cx = rand(180, W - 180);
      const panzers = t < 6 ? 1 : Math.max(1, Math.floor(specialWaveMult(t) * t / 3));
      for (let i = 0; i < panzers; i++) {
        spawnEnemyAt('panzer', cx + rand(-120, 120), -40 - i * 150);
      }
      const tracks = t < 6 ? 0 : Math.floor(specialWaveMult(t) * (1 + (t - 6) / 5));
      for (let i = 0; i < tracks; i++) {
        spawnEnemyAt('ehalftrack', cx + rand(-160, 160), -110 - i * 130);
      }
      const jeeps = t < 5 ? 0 : Math.floor(specialWaveMult(t) * (t - 4) / 3);
      for (let i = 0; i < jeeps; i++) {
        spawnEnemyAt('ejeep', cx + rand(-200, 200), -70 - i * 100);
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (4 + t / 2)); i++) {
        spawnEnemyAt(pick(['erifle', 'esmg', 'egren']), cx + rand(-200, 200), rand(-60, -20));
      }
    },
  },
];

// Imperial Japanese set-piece assaults — their own rotation of themed waves,
// leaning on banzai charges, night infiltration, and knee-mortar bombardment.
// Regio Esercito set pieces, cycling on the faction's own pulse: they dig, they
// grind you from cover, they come out all at once, and their armour cleans up.
const ITA_SPECIAL_WAVES = [
  {
    key: 'genio',
    banner: 'IL GENIO! THE SAPPERS DIG IN!',
    // The build wave. Deliberately LOW direct threat — the danger isn't this
    // wave, it's what's still standing on the field during the next four.
    spawn(t) {
      const sappers = Math.floor(specialWaveMult(t) * (3 + t / 2));
      for (let i = 0; i < sappers; i++) {
        const g = spawnEnemyAt('iguast', rand(60, W - 60), rand(-90, -20));
        g.buildState = 'seek';
        g.buildsDone = 0;
        g.t = Object.assign({}, g.t, { builder: Object.assign({}, g.t.builder, { per: 3 }) });
      }
      // a covering party so the player can't just walk up and shoot the diggers
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (3 + t)); i++) {
        spawnEnemyAt(pick(['ifante', 'ifante', 'ibreda', 'ifiat']), rand(50, W - 50), rand(-110, -30));
      }
      if (t >= 3) spawnEnemyAt('isemo', rand(120, W - 120), rand(-120, -80));
    },
  },
  {
    key: 'avanti',
    banner: 'AVANTI SAVOIA! THE WHOLE LINE COMES!',
    // The payoff wave: assault troops arrive AND the order goes out immediately,
    // so the new force and every man already sitting in a work surge together.
    spawn(t) {
      const count = Math.floor(specialWaveMult(t) * (8 + 2 * t));
      for (let i = 0; i < count; i++) {
        const x = (W / (count + 1)) * (i + 1) + rand(-24, 24);
        spawnEnemyAt(pick(['ibersa', 'ibersa', 'ibersa', 'imosch', 'ifolgore']), x, rand(-90, -20));
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (1 + t / 4)); i++) {
        spawnEnemyAt('iuff', rand(120, W - 120), rand(-120, -80));
      }
      // arm the charge: the telegraph fires on the next tick of updateAvanti
      G.itCharge = -IT_AVANTI_TELEGRAPH;
      G.itLastAvanti = G.time;
    },
  },
  {
    key: 'sbarramento',
    banner: 'SBARRAMENTO! MORTAR BOMBARDMENT!',
    // Massed tubes that arrive garrison-hungry: they make straight for the works
    // and shell the line from inside cover. The wave that makes you buy a mortar.
    spawn(t) {
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (2 + t / 3)); i++) {
        spawnEnemyAt('imortaio', rand(60, W - 60), rand(-130, -70));
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (2 + t / 2)); i++) {
        spawnEnemyAt('ibrixia', rand(60, W - 60), rand(-110, -50));
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (3 + t / 2)); i++) {
        spawnEnemyAt(pick(['ifiat', 'ibreda', 'icecc']), rand(50, W - 50), rand(-100, -30));
      }
    },
  },
  {
    key: 'carristi',
    banner: 'CARRISTI! TANKETTE SWARM!',
    // Punishes a player who has over-invested in anti-infantry: a wall of flame
    // on tracks, with the mediums coming in behind it.
    spawn(t) {
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (3 + t)); i++) {
        spawnEnemyAt('il3', rand(60, W - 60), rand(-110, -30));
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (t / 2)); i++) {
        spawnEnemyAt('im13', rand(80, W - 80), rand(-150, -90));
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (2 + t / 2)); i++) {
        spawnEnemyAt(pick(['imosch', 'ifante']), rand(50, W - 50), rand(-90, -30));
      }
    },
  },
];

const JP_SPECIAL_WAVES = [
  {
    key: 'banzai',
    banner: 'BANZAI! MASS CHARGE!',
    // a shoulder-to-shoulder wall of chargers across the whole field, led by officers
    spawn(t) {
      const count = Math.floor(specialWaveMult(t) * (9 + 2 * t));
      for (let i = 0; i < count; i++) {
        const x = (W / (count + 1)) * (i + 1) + rand(-22, 22);
        spawnEnemyAt(Math.random() < 0.75 ? 'jbanzai' : 'jrifle', x, rand(-90, -20));
      }
      const officers = Math.floor(specialWaveMult(t) * (1 + t / 4));
      for (let i = 0; i < officers; i++) {
        spawnEnemyAt('joff', rand(120, W - 120), rand(-120, -80));
      }
    },
  },
  {
    key: 'infiltrate',
    banner: 'NIGHT INFILTRATION — THEY COME IN THE FOG!',
    // fog blankets the field while snipers and machine guns creep in with the riflemen
    spawn(t) {
      G.fog = Math.max(G.fog, Math.round((24 + t) * 1.15));
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (2 + t / 4)); i++) {
        spawnEnemyAt('jsniper', rand(60, W - 60), rand(-140, -60));
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (1 + t / 4)); i++) {
        spawnEnemyAt('jlmg', rand(80, W - 80), rand(-110, -40));
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (6 + t)); i++) {
        spawnEnemyAt(pick(['jrifle', 'jrifle', 'jbanzai']), rand(50, W - 50), rand(-90, -20));
      }
    },
  },
  {
    key: 'bombard',
    banner: 'KNEE-MORTAR BOMBARDMENT!',
    // a cluster of grenade-discharger teams lobbing shells behind a rifle screen
    spawn(t) {
      const mortars = Math.floor(specialWaveMult(t) * (3 + t / 2));
      for (let i = 0; i < mortars; i++) {
        spawnEnemyAt('jknee', rand(70, W - 70), rand(-120, -50));
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (5 + t)); i++) {
        spawnEnemyAt(pick(['jrifle', 'jrifle', 'jlmg']), rand(50, W - 50), rand(-80, -20));
      }
    },
  },
  {
    key: 'gyokusai',
    banner: 'GYOKUSAI! LAST CHARGE — NO SURRENDER!',
    // everything at once: a screaming human wave with lunge mines mixed in
    spawn(t) {
      const count = Math.floor(specialWaveMult(t) * (10 + 2 * t));
      for (let i = 0; i < count; i++) {
        const x = (W / (count + 1)) * (i + 1) + rand(-24, 24);
        const roll = Math.random();
        const type = roll < 0.55 ? 'jbanzai' : roll < 0.7 ? 'jlunge' : roll < 0.85 && t >= 3 ? 'jflame' : 'jrifle';
        spawnEnemyAt(type, x, rand(-100, -20));
      }
      const officers = Math.floor(specialWaveMult(t) * (1 + t / 4));
      for (let i = 0; i < officers; i++) {
        spawnEnemyAt('joff', rand(120, W - 120), rand(-130, -90));
      }
    },
  },
];

// The Horde set-piece assaults — its own rotation: a wall of shamblers, a hound
// pack, a bile bombardment, and an all-out surge led by screamers and a boss.
const ZOM_SPECIAL_WAVES = [
  {
    key: 'swarm',
    banner: 'THE DEAD RISE — HORDE SURGE!',
    // a shoulder-to-shoulder wall of the walking dead across the whole field
    spawn(t) {
      const count = Math.floor(specialWaveMult(t) * (12 + 3 * t));
      for (let i = 0; i < count; i++) {
        const x = (W / (count + 1)) * (i + 1) + rand(-22, 22);
        const roll = Math.random();
        const type = roll < 0.55 ? 'zshambler' : roll < 0.8 ? 'zrunner' : 'zcrawler';
        spawnEnemyAt(type, x, rand(-90, -20));
      }
      const screamers = Math.floor(specialWaveMult(t) * (1 + t / 4));
      for (let i = 0; i < screamers; i++) {
        spawnEnemyAt('zscreamer', rand(120, W - 120), rand(-120, -80));
      }
    },
  },
  {
    key: 'pack',
    banner: 'THE PACK! INFECTED HOUNDS!',
    // a streaking pack of hounds and runners, screamers driving them on
    spawn(t) {
      const hounds = Math.floor(specialWaveMult(t) * (6 + 2 * t));
      for (let i = 0; i < hounds; i++) {
        spawnEnemyAt(Math.random() < 0.7 ? 'zhound' : 'zrunner', rand(50, W - 50), -20 - i * rand(20, 55));
      }
      const screamers = Math.floor(specialWaveMult(t) * (1 + t / 5));
      for (let i = 0; i < screamers; i++) {
        spawnEnemyAt('zscreamer', rand(120, W - 120), rand(-110, -70));
      }
    },
  },
  {
    key: 'rot',
    banner: 'ROTSTORM! THE BILE FALLS!',
    // spitters and bloaters lob and burst behind a shambling screen
    spawn(t) {
      const spitters = Math.floor(specialWaveMult(t) * (2 + t / 3));
      for (let i = 0; i < spitters; i++) {
        spawnEnemyAt('zspitter', rand(70, W - 70), rand(-130, -60));
      }
      const bloaters = Math.floor(specialWaveMult(t) * (2 + t / 4));
      for (let i = 0; i < bloaters; i++) {
        spawnEnemyAt('zbloater', rand(70, W - 70), rand(-110, -40));
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (6 + t)); i++) {
        spawnEnemyAt(pick(['zshambler', 'zshambler', 'zrunner']), rand(50, W - 50), rand(-90, -20));
      }
    },
  },
  {
    key: 'abomination',
    banner: 'ABOMINATION! IT COMES FOR THE LINE!',
    // the boss rolls in behind a brute vanguard and a screaming human wave
    spawn(t) {
      const cx = rand(160, W - 160);
      const aboms = Math.max(1, Math.floor(specialWaveMult(t) * (0.5 + t / 4)));
      for (let i = 0; i < aboms; i++) {
        spawnEnemyAt('zabom', cx + rand(-140, 140), -40 - i * 150);
      }
      const brutes = Math.floor(specialWaveMult(t) * (1 + t / 3));
      for (let i = 0; i < brutes; i++) {
        spawnEnemyAt('zbrute', cx + rand(-180, 180), -80 - i * 70);
      }
      const count = Math.floor(specialWaveMult(t) * (8 + 2 * t));
      for (let i = 0; i < count; i++) {
        const x = (W / (count + 1)) * (i + 1) + rand(-24, 24);
        spawnEnemyAt(pick(['zshambler', 'zrunner', 'zcrawler']), x, rand(-100, -20));
      }
      const screamers = Math.floor(specialWaveMult(t) * (1 + t / 4));
      for (let i = 0; i < screamers; i++) {
        spawnEnemyAt('zscreamer', rand(120, W - 120), rand(-130, -90));
      }
    },
  },
];

function spawnSpecialWave(w) {
  const f = enemyFaction();
  // every 100th German wave belongs to the boss. He REPLACES that wave's
  // special (his first rally summons a set piece within ~30s anyway); if the
  // last one is somehow still alive at the next hundred, the wave falls
  // through to its normal themed assault instead of doubling him up.
  if (f === 'de' && w % BOSS_WAVE_INTERVAL === 0
      && !G.enemies.some(e => !e.dead && e.type === 'eboss')) {
    spawnGermanBoss(w);
    G.spawnTimer = spawnIntervalForWave(w) + 6;
    return;
  }
  // and every 100th Japanese wave belongs to the Yamato, on the same terms
  if (f === 'jp' && w % YAM_WAVE_INTERVAL === 0
      && !G.enemies.some(e => !e.dead && e.type === 'jyamato')) {
    spawnJapaneseBoss(w);
    G.spawnTimer = spawnIntervalForWave(w) + 6;
    return;
  }
  // and every 100th Horde wave belongs to the Progenitor, on the same terms
  if (f === 'zo' && w % PROG_WAVE_INTERVAL === 0
      && !G.enemies.some(e => !e.dead && e.type === 'zprogen')) {
    spawnHordeBoss(w);
    G.spawnTimer = spawnIntervalForWave(w) + 6;
    return;
  }
  // and every 100th Italian wave belongs to the Treno Armato, on the same terms
  if (f === 'it' && w % TRAIN_WAVE_INTERVAL === 0
      && !G.enemies.some(e => !e.dead && e.type === 'itrain')) {
    spawnItalianBoss(w);
    G.spawnTimer = spawnIntervalForWave(w) + 6;
    return;
  }
  const tier = w / 10;
  const set = f === 'jp' ? JP_SPECIAL_WAVES : f === 'zo' ? ZOM_SPECIAL_WAVES
    : f === 'it' ? ITA_SPECIAL_WAVES : SPECIAL_WAVES;
  const theme = set[(tier - 1) % set.length];
  showBanner(theme.banner);
  theme.spawn(tier);
  // a breather while you police up the aftermath
  G.spawnTimer = spawnIntervalForWave(w) + 6;
}

// the boss walks on from staging at centre field with a modest rifle screen.
// armorEnemy skips boss:true, so his plate comes from initGermanBoss (he
// refills it himself at every rally). Each hundredth-wave return is tougher:
// wave 200 fields him at 2x HP, wave 300 at 3x, and so on — noRamp keeps the
// difficulty HP ramp from compounding on top of that.
function spawnGermanBoss(w) {
  showBanner('DER SCHLÄCHTER — HE COMES FOR THE LINE!');
  SFX.event();
  const b = spawnEnemyAt('eboss', W / 2, -40);
  const mult = w / BOSS_WAVE_INTERVAL;
  if (mult > 1) b.hp = b.maxhp = Math.round(ENEMY_TYPES.eboss.hp * mult);
  const n = Math.floor(specialWaveMult(w / 10) * 6);
  for (let i = 0; i < n; i++) {
    spawnEnemyAt(pick(['erifle', 'esmg', 'esmg', 'egren']),
      clamp(W / 2 + rand(-140, 140), 30, W - 30), rand(-90, -20));
  }
}

// She drives on already ON the field, unlike every other spawn: her parts have to
// be on-field to be targetable at all (every US scan skips y < 0), and a hull that
// long would have half its length in the staging strip anyway. Same idea as the
// ev2 spawn-Y override in launchWave. Escorts come on from staging as normal.
// Each hundredth-wave return is tougher — wave 200 fields her at 2x HP — and the
// belt sections have to be re-mirrored after the scaling or they'd advertise the
// base pool on a ship carrying double.
function spawnJapaneseBoss(w) {
  showBanner('YAMATO — THE LAND BATTLESHIP ROLLS IN!');
  SFX.event();
  const b = spawnEnemyAt('jyamato', W / 2, (YAM_Y_MIN + YAM_Y_MAX) / 2);
  const mult = w / YAM_WAVE_INTERVAL;
  if (mult > 1) b.hp = b.maxhp = Math.round(ENEMY_TYPES.jyamato.hp * mult);
  // build her parts now rather than waiting for the first tick, so the HP mirror
  // below has something to write to
  if (!b.yamInit) initYamato(b);
  syncYamatoParts(b);
  const n = Math.floor(specialWaveMult(w / 10) * 6);
  for (let i = 0; i < n; i++) {
    spawnEnemyAt(pick(['jrifle', 'jsmg', 'jsmg', 'jbanzai']),
      clamp(W / 2 + rand(-160, 160), 30, W - 30), rand(-90, -20));
  }
}

// The Progenitor walks on from staging like the German boss rather than starting
// on-field like the Yamato: it's a point actor with a 26px pod fan, not a 300px
// hull, so nothing of it is stranded above the top edge. Its pods are built by
// initProgenitor on the first tick and deliberately NOT forced here — unlike the
// ship there is no HP mirror to prime, and leaving it lazy keeps this hook and
// TEST.deploy('zprogen') on one identical code path. Each hundredth-wave return
// is tougher: wave 200 fields it at 2x HP.
function spawnHordeBoss(w) {
  showBanner('THE PROGENITOR — THE FLESH THAT BIRTHS THE DEAD!');
  SFX.event();
  const b = spawnEnemyAt('zprogen', W / 2, -40);
  const mult = w / PROG_WAVE_INTERVAL;
  if (mult > 1) b.hp = b.maxhp = Math.round(ENEMY_TYPES.zprogen.hp * mult);
  const n = Math.floor(specialWaveMult(w / 10) * 6);
  for (let i = 0; i < n; i++) {
    spawnEnemyAt(pick(['zshambler', 'zrunner', 'zrunner', 'zbrute']),
      clamp(W / 2 + rand(-150, 150), 30, W - 30), rand(-90, -20));
  }
}

// The train rolls on from staging like the German boss — it's a column, not a
// broadside, so only its engine pokes below the top edge at first and the rest
// of the consist follows it down the rails. Its parts are built by initWarTrain
// on the first tick and deliberately NOT forced here — like the Progenitor there
// is no HP mirror to prime, and leaving it lazy keeps this hook and
// TEST.deploy('itrain') on one identical code path. Each hundredth-wave return
// is tougher: wave 200 fields it at 2x HP (the engine only; wagons stay base,
// same rule as the Yamato's turrets).
function spawnItalianBoss(w) {
  showBanner('TRENO ARMATO — THE ARMORED TRAIN ROLLS DOWN THE LINE!');
  SFX.event();
  const b = spawnEnemyAt('itrain', rand(TRAIN_LANE_MARGIN, W - TRAIN_LANE_MARGIN), -30);
  const mult = w / TRAIN_WAVE_INTERVAL;
  if (mult > 1) b.hp = b.maxhp = Math.round(ENEMY_TYPES.itrain.hp * mult);
  const n = Math.floor(specialWaveMult(w / 10) * 6);
  for (let i = 0; i < n; i++) {
    spawnEnemyAt(pick(['ifante', 'imosch', 'ibersa', 'iguast']),
      clamp(b.x + rand(-150, 150), 30, W - 30), rand(-90, -20));
  }
}

function launchWave(w) {
  if (w % 10 === 0) {
    spawnSpecialWave(w);
    return;
  }
  const f = enemyFaction();
  const comp = f === 'jp' ? japWaveComposition(w)
    : f === 'zo' ? zomWaveComposition(w)
    : f === 'it' ? itaWaveComposition(w) : waveComposition(w);
  const cx = rand(100, W - 100);
  for (const type of comp) {
    const x = clamp(cx + rand(-90, 90), 30, W - 30);
    // tighter vertical spawn band (was -70..-20) so a wave crosses the top
    // edge as one group instead of stringing out into a trickle
    // the V2 battery holds position by default, so it's staked out in view
    // from the start instead of off the top edge with the rest of the wave
    const y = type === 'ev2' ? rand(30, 85) : rand(-52, -20);
    const e = makeEnemy(type, x, y);
    armorEnemy(e, w);
    G.enemies.push(e);
  }
  G.spawnTimer = spawnIntervalForWave(w);
}

function spawnWave() {
  G.wave++;
  shiftWindForWave();
  decayItalianWorks();   // the enemy line weathers between waves; abandoned works go
  awardWaveMedals();
  launchWave(G.wave);
  if (G.wave === 1) {
    const f = enemyFaction();
    showBanner(f === 'jp' ? 'THE IMPERIAL ARMY ATTACKS'
      : f === 'zo' ? 'THE DEAD ARE RISING'
      : f === 'it' ? 'THE REGIO ESERCITO ATTACKS'
      : 'HERE THEY COME');
  }
}

// sandbox only: skip ahead and spawn that wave's assault immediately. Not
// available in testing mode — that mode's whole point is that Germans never
// spawn on their own.
function jumpSandboxWave(steps) {
  if (!isSandbox() || isTestingMode() || !running || !G || G.over || steps <= 0) return;
  const target = Math.min(G.wave + steps, 999);
  if (target <= G.wave) return;
  G.wave = target;
  launchWave(G.wave);
  showBanner('SANDBOX — WAVE ' + G.wave);
  SFX.click();
}

function updateEnemyChute(e, dt) {
  if (!(e.chute > 0)) return;
  e.chute -= dt;
  e.sway = (e.sway || 0) + dt * 2.2;
  e.x = clamp(e.x + Math.sin(e.sway) * 9 * dt, 14, W - 14);
  if (e.chute <= 0) {
    e.chute = 0;
    for (let i = 0; i < 6; i++) {
      G.particles.push({
        x: e.x + rand(-6, 6), y: e.y + rand(-2, 4),
        vx: rand(-30, 30), vy: rand(-40, -10),
        ttl: rand(0.25, 0.5), grav: 160, size: rand(1.2, 2.4),
        color: pick(['#6e6046', '#57492f', '#8a7a5a']),
      });
    }
  }
}
