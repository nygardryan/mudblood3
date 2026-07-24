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

// Regio Esercito composition. Same size/tempo curve as the others, but its own
// character: a brittle line of Fanti stiffened by Bersaglieri and led by the
// all-important officer, plenty of automatic weapons and mortars, and — instead
// of the German halftrack/bike or the Japanese banzai/lunge — a swarm of thin,
// fast light tankettes that arrive early and in numbers.
function itaWaveComposition(w) {
  const late = wavesPast99(w);
  const mult = enemySpawnMult(w);
  const baseSize = Math.min(
    2 + Math.floor(w / 2.5) + (Math.random() < 0.35 ? 1 : 0) + Math.floor(late / 4),
    9 + Math.floor(w / 14) + Math.floor(late / 6),
  );
  const minSize = w > 4 ? 3 : 1;
  const size = Math.max(minSize, Math.round(baseSize * mult));
  const pool = ['irifle', 'irifle', 'irifle'];
  if (w >= 3) pool.push('ibersa');               // elite skirmishers stiffen the line early
  if (w >= 4) pool.push('imab', 'imab');
  if (w >= 6) pool.push('ibreda');
  if (w >= 7) pool.push('igren');
  if (w >= 8) pool.push('ibrixia');
  if (w >= 9) pool.push('ifiat');
  if (w >= 11) pool.push('iflame');
  if (w >= 13) pool.push('icecc');
  if (w >= 15) pool.push('ifolgore');            // more elites as it scales
  if (w >= 16) pool.push('imortaio');
  const out = [];
  for (let i = 0; i < size; i++) out.push(pick(pool));
  // the officer is the linchpin of this faction — he shows a touch more often
  // than the others, because without him the wave breaks itself
  if (w >= 10 && Math.random() < (0.40 + late * 0.004) * mult) out.push('iuff');
  // light-armor swarm: the L3 tankette arrives early and comes several at a time,
  // the M13 medium from the mid game, and the Semovente assault gun late
  const armorChance = (0.12 + Math.max(0, w - 11) * 0.0025) * (1 + late * 0.05) * mult;
  if (w >= 11 && Math.random() < armorChance) out.push('il3');
  if (w >= 16 && Math.random() < armorChance * 0.8) out.push('il3');   // they hunt in packs
  if (w >= 24 && Math.random() < armorChance) out.push('im13');
  if (w >= 42 && Math.random() < armorChance * 0.7) out.push('isemo');
  if (late > 0) {
    const armorShare = Math.min(0.45, late * 0.014);
    const armorPool = ['il3', 'il3', 'il3', 'im13', 'isemo'];   // tankette-heavy
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

// ---- themed set-piece assaults: every 10th wave the enemy commits to a
// scripted attack. Themes cycle; the tier (wave/10) keeps climbing forever,
// so each theme returns bigger and meaner the next time around.

function spawnEnemyAt(type, x, y) {
  const e = makeEnemy(type, clamp(x, 30, W - 30), y);
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

// Regio Esercito set-piece assaults — their own rotation, leaning on the
// Bersaglieri spearhead, a tankette swarm, a massed mortar bombardment, and a
// combined-arms push held together by officers.
const ITA_SPECIAL_WAVES = [
  {
    key: 'avanti',
    banner: 'AVANTI SAVOIA! BERSAGLIERI CHARGE!',
    // a running line of elite skirmishers across the field, officers in support
    spawn(t) {
      const count = Math.floor(specialWaveMult(t) * (8 + 2 * t));
      for (let i = 0; i < count; i++) {
        const x = (W / (count + 1)) * (i + 1) + rand(-24, 24);
        const roll = Math.random();
        const type = roll < 0.6 ? 'ibersa' : roll < 0.78 ? 'imab' : 'irifle';
        spawnEnemyAt(type, x, rand(-90, -20));
      }
      const officers = Math.floor(specialWaveMult(t) * (1 + t / 4));
      for (let i = 0; i < officers; i++) {
        spawnEnemyAt('iuff', rand(120, W - 120), rand(-120, -80));
      }
    },
  },
  {
    key: 'carristi',
    banner: 'CARRISTI! TANKETTE SWARM!',
    // a rush of thin fast L3 tankettes with an M13 or two in the second echelon,
    // a rifle screen out front — the Italian answer to the Panzerkeil
    spawn(t) {
      const cx = rand(140, W - 140);
      const tankettes = Math.floor(specialWaveMult(t) * (3 + t));
      for (let i = 0; i < tankettes; i++) {
        spawnEnemyAt('il3', cx + rand(-180, 180), -30 - i * rand(40, 90));
      }
      const mediums = t < 4 ? 0 : Math.floor(specialWaveMult(t) * (t - 3) / 3);
      for (let i = 0; i < mediums; i++) {
        spawnEnemyAt('im13', cx + rand(-160, 160), -90 - i * 120);
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (4 + t / 2)); i++) {
        spawnEnemyAt(pick(['irifle', 'imab', 'ibersa']), cx + rand(-200, 200), rand(-60, -20));
      }
    },
  },
  {
    key: 'sbarramento',
    banner: 'SBARRAMENTO! MORTAR BOMBARDMENT!',
    // a cluster of Brixia and 81mm teams lobbing shells behind an automatic screen
    spawn(t) {
      const mortars = Math.floor(specialWaveMult(t) * (3 + t / 2));
      for (let i = 0; i < mortars; i++) {
        spawnEnemyAt(Math.random() < 0.6 ? 'ibrixia' : 'imortaio', rand(70, W - 70), rand(-120, -50));
      }
      for (let i = 0; i < Math.floor(specialWaveMult(t) * (5 + t)); i++) {
        spawnEnemyAt(pick(['irifle', 'irifle', 'ibreda', 'ifiat']), rand(50, W - 50), rand(-80, -20));
      }
      const officers = Math.floor(specialWaveMult(t) * (0.5 + t / 6));
      for (let i = 0; i < officers; i++) {
        spawnEnemyAt('iuff', rand(120, W - 120), rand(-110, -70));
      }
    },
  },
  {
    key: 'folgore',
    banner: 'FOLGORE! THE STEADY ONES COME!',
    // everything at once: elite Folgore and flamers behind an armored spearhead,
    // officers everywhere to hold the whole assault together
    spawn(t) {
      const count = Math.floor(specialWaveMult(t) * (9 + 2 * t));
      for (let i = 0; i < count; i++) {
        const x = (W / (count + 1)) * (i + 1) + rand(-24, 24);
        const roll = Math.random();
        const type = roll < 0.5 ? 'ifolgore' : roll < 0.68 ? 'ibersa' : roll < 0.82 && t >= 3 ? 'iflame' : 'irifle';
        spawnEnemyAt(type, x, rand(-100, -20));
      }
      const tankettes = Math.floor(specialWaveMult(t) * (1 + t / 3));
      for (let i = 0; i < tankettes; i++) {
        spawnEnemyAt('il3', rand(100, W - 100), -40 - i * 90);
      }
      const officers = Math.floor(specialWaveMult(t) * (1 + t / 4));
      for (let i = 0; i < officers; i++) {
        spawnEnemyAt('iuff', rand(120, W - 120), rand(-130, -90));
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
  const tier = w / 10;
  const f = enemyFaction();
  const set = f === 'jp' ? JP_SPECIAL_WAVES : f === 'it' ? ITA_SPECIAL_WAVES : f === 'zo' ? ZOM_SPECIAL_WAVES : SPECIAL_WAVES;
  const theme = set[(tier - 1) % set.length];
  showBanner(theme.banner);
  theme.spawn(tier);
  // a breather while you police up the aftermath
  G.spawnTimer = spawnIntervalForWave(w) + 6;
}

function launchWave(w) {
  if (w % 10 === 0) {
    spawnSpecialWave(w);
    return;
  }
  const f = enemyFaction();
  const comp = f === 'jp' ? japWaveComposition(w) : f === 'it' ? itaWaveComposition(w)
    : f === 'zo' ? zomWaveComposition(w) : waveComposition(w);
  const cx = rand(100, W - 100);
  for (const type of comp) {
    const x = clamp(cx + rand(-90, 90), 30, W - 30);
    // tighter vertical spawn band (was -70..-20) so a wave crosses the top
    // edge as one group instead of stringing out into a trickle
    // the V2 battery holds position by default, so it's staked out in view
    // from the start instead of off the top edge with the rest of the wave
    const y = type === 'ev2' ? rand(30, 85) : rand(-52, -20);
    G.enemies.push(makeEnemy(type, x, y));
  }
  G.spawnTimer = spawnIntervalForWave(w);
}

function spawnWave() {
  G.wave++;
  awardWaveMedals();
  launchWave(G.wave);
  if (G.wave === 1) {
    const f = enemyFaction();
    showBanner(f === 'jp' ? 'THE IMPERIAL ARMY ATTACKS'
      : f === 'it' ? 'THE REGIO ESERCITO ATTACKS'
      : f === 'zo' ? 'THE DEAD ARE RISING'
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

// allied campaign: step through the level's scripted wave list. Once the last
// wave is launched, victory comes when the field is clear.
function updateAlliedWaves(dt) {
  const waves = G.level.waves;
  if (G.waveIdx >= waves.length) {
    if (G.enemies.length === 0) victory();
    return;
  }
  G.spawnTimer -= dt;
  if (G.spawnTimer > 0) return;
  const wv = waves[G.waveIdx++];
  G.wave++;
  if (wv.banner) showBanner(wv.banner);
  const cx = rand(100, W - 100);
  for (const type of wv.comp) {
    const x = clamp(cx + rand(-90, 90), 30, W - 30);
    G.enemies.push(makeEnemy(type, x, rand(-70, -20)));
  }
  const next = waves[G.waveIdx];
  if (next) G.spawnTimer = next.delay;
}

function clearAxisWaveEffects() {
  G.shells = [];
  G.grenades = [];
  G.rockets = [];
  G.planes = [];
  G.flak = [];
  G.tracers = [];
  G.particles = [];
  G.flashes = [];
  G.paraFlybyPlayed = false;
  clearPlacing();
}

function isParaDropUnit(key) {
  return key === 'eparadrop';
}

function axisParadropPool() {
  const { unlocked } = loadAxisResearch();
  const pool = AXIS_PARA_POOL_BASE.slice();
  for (const k of AXIS_PARA_POOL_EXTRAS) {
    if (unlocked.includes(k)) pool.push(k);
  }
  return pool;
}

function resolveParadropLanding(e) {
  if (!e.paraRoll) return;
  const replacement = makeEnemy(e.paraRoll, e.x, e.y);
  replacement.face = e.face || Math.PI / 2;
  const idx = G.enemies.indexOf(e);
  if (idx !== -1) G.enemies[idx] = replacement;
}

function assaultDeployMaxY(p) {
  return isParaDropUnit(p.key) ? AXIS_PARA_DROP_MAX_Y : AXIS_DEPLOY_Y;
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
    if (e.paraRoll) resolveParadropLanding(e);
  }
}

function placeAxisParatrooper(x, y) {
  const e = makeEnemy('erifle', x, y);
  e.paraRoll = pick(axisParadropPool());
  const depth = clamp((y - 14) / Math.max(AXIS_PARA_DROP_MAX_Y - 14, 1), 0, 1);
  e.chute = rand(2.2, 3.0) + depth * 0.9;
  e.chuteMax = e.chute;
  e.sway = rand(0, Math.PI * 2);
  G.enemies.push(e);
  if (!G.paraFlybyPlayed) {
    G.paraFlybyPlayed = true;
    spawnTransportFlyby();
  }
}

function initLandingCraft(G) {
  const slots = [
    { x: lx(-200), y: 42 },
    { x: lx(-70), y: 36 },
    { x: lx(70), y: 36 },
    { x: lx(200), y: 42 },
  ];
  G.landingCraft = slots.map(s => ({
    x: s.x, y: s.y, w: 72, h: 34,
    state: 'waiting', rampT: 0, shoreY: LANDING_CRAFT_SHORE_Y,
    onDeck: [],
  }));
}

function landingCraftAt(x, y) {
  if (!G || !G.landingCraft) return null;
  for (const c of G.landingCraft) {
    if (c.state === 'done') continue;
    if (x >= c.x - c.w / 2 && x <= c.x + c.w / 2 &&
        y >= c.y - c.h / 2 && y <= c.y + c.h / 2) return c;
  }
  return null;
}

function updateLandingCraft(dt) {
  if (!G.landingCraft || !G.landingCraft.length) return;
  let anyMoving = false;
  let anyRamping = false;
  for (const c of G.landingCraft) {
    if (c.state === 'approach') {
      anyMoving = true;
      c.y += LANDING_CRAFT_SPEED * dt;
      for (const u of c.onDeck) {
        if (!u.dead) {
          u.x = c.x + (u.deckOffX || 0);
          u.y = c.y + (u.deckOffY || 0);
        }
      }
      if (c.y >= c.shoreY) {
        c.y = c.shoreY;
        c.state = 'ramp';
        c.rampT = 0;
      }
    } else if (c.state === 'ramp') {
      anyRamping = true;
      c.rampT = Math.min(1, c.rampT + dt * 1.8);
      if (c.rampT >= 1) {
        c.state = 'done';
        for (const u of c.onDeck) {
          if (!u.dead) {
            u.onCraft = null;
            u.deckOffX = 0;
            u.deckOffY = 0;
            u.y += rand(4, 14);
            u.x += rand(-10, 10);
          }
        }
        c.onDeck = [];
      }
    }
  }
  if (anyRamping && !G.landingFire) {
    G.landingFire = true;
    showBanner('RAMPS DOWN — TAKE FIRE!');
    SFX.mg();
  }
  if (!anyMoving && !anyRamping && G.phase === 'landing') {
    const active = G.landingCraft.filter(c => c.state !== 'waiting');
    if (active.length && active.every(c => c.state === 'done')) {
      G.phase = 'combat';
      showBanner('WAVE ' + G.wave);
    }
  }
}

function startLandingAssault() {
  if (!inBuildPhase()) return;
  if (!G.enemies.some(e => !e.dead)) return;
  G.phase = 'landing';
  G.landingFire = false;
  clearPlacing();
  showBanner('LANDING CRAFT INBOUND');
  SFX.click();
  for (const c of G.landingCraft) {
    if (c.state === 'waiting') c.state = 'approach';
  }
}

function startAssaultCombat() {
  if (!inBuildPhase()) return;
  if (!G.enemies.some(e => !e.dead)) return;
  if (G.level.landingCraft) {
    startLandingAssault();
    return;
  }
  G.phase = 'combat';
  clearPlacing();
  showBanner('WAVE ' + G.wave);
  SFX.click();
}

function updateAssaultCombat() {
  if (!G.units.some(u => !u.dead)) { victory(); return; }
  if (G.enemies.some(e => !e.dead)) return;
  if (G.breaches >= G.level.winBreaches) { victory(); return; }
  const waves = assaultWaves(G.level);
  if (G.wave >= waves) { gameOver(); return; }
  G.wave++;
  G.tp = axisWavePayout(G.level, G.wave);
  G.phase = 'build';
  G.landingFire = true;
  clearAxisWaveEffects();
  if (G.level.landingCraft) initLandingCraft(G);
  showBanner('WAVE ' + G.wave + ' - DEPLOY');
}
