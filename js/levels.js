/* Trenchworks: WW2 — level definitions.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// every mode is a level. endless is the classic open-ended defense; campaign
// levels script their own forces, waves and win conditions.

const ENDLESS_DIFFICULTIES = {
  sandbox: { id: 'sandbox', name: 'SANDBOX', incomeMult: 1, sandbox: true,
    desc: 'Unlimited TP. Experiment with any loadout.' },
  testing: { id: 'testing', name: 'TESTING', incomeMult: 1, sandbox: true, testing: true,
    desc: 'Unlimited TP. No Germans spawn on their own — build them yourself with the GERMANS button.' },
  easy: { id: 'easy', name: 'EASY', incomeMult: 1, sandbox: false,
    desc: 'Full supply rate. The classic experience.' },
  medium: { id: 'medium', name: 'MEDIUM', incomeMult: 0.66, sandbox: false,
    desc: '66% income. Tighter logistics.' },
  hard: { id: 'hard', name: 'HARD', incomeMult: 0.33, sandbox: false,
    desc: '33% income. Every TP counts.' },
};

// axis campaign: each build phase hands you a fresh, growing pile of TP.
// wave 1 pays `wavePayout`; every wave after that adds `wavePayoutStep` more,
// so a level's final assault always has the biggest budget. Unused TP never
// carries over — spend it or lose it.
const AXIS_TP_MULT = 1.50;
function axisWavePayout(level, wave) {
  const base = level.wavePayout + (level.wavePayoutStep || 0) * (wave - 1);
  return Math.round(base * AXIS_TP_MULT);
}

// US defender placement helpers for the Axis campaign setups (hoisted).
const SANDBAG_HP = 660;
const BUNKER_HP = 2040;
const WATCHTOWER_HP = 500;
const CAMONEST_HP = 280;
function usBag(G, x, y, hp = SANDBAG_HP)    { G.sandbags.push({ x, y, hp, maxhp: hp, up: false, workProg: 0 }); }
function usBunker(G, x, y, hp = BUNKER_HP){ G.bunkers.push({ x, y, hp, maxhp: hp, up: false, workProg: 0 }); }
function usWire(G, x, y, hp = 3750)  { G.wires.push({ x, y, hp, maxhp: hp, up: false, workProg: 0 }); }
function usMine(G, x, y)             { G.mines.push({ x, y, dead: false }); }
function usMan(G, type, x, y)        { G.units.push(makeUnit(type, x, y)); }
function usRow(G, type, y, xs)       { for (const x of xs) G.units.push(makeUnit(type, x, y)); }

// map US setup keys to German defender types for allied assault levels
const DE_DEFENDER_TYPES = {
  rifleman: 'erifle', gunner: 'emg', grenadier: 'egren', sniper: 'esniper',
  officer: 'eoff', flamer: 'eflame', mortarman: 'emortar', bazooka: 'ebazooka',
  sherman: 'panzer', jeep: 'ejeep', shotgunner: 'esmg',
};
function deMan(G, type, x, y) {
  const deType = DE_DEFENDER_TYPES[type] || type;
  if (!ENEMY_TYPES[deType]) return;
  G.units.push(makeDefender('de', deType, x, y));
}
function deRow(G, type, y, xs) {
  for (const x of xs) deMan(G, type, x, y);
}
function deFlankPicket(G, strength = 1) {
  const y = 428;
  for (const left of [true, false]) {
    const edge = left ? 90 : W - 90;
    const mid = left ? 165 : W - 165;
    const far = left ? 55 : W - 55;
    usBag(G, edge, y - 7);
    deMan(G, 'rifleman', edge, y);
    if (strength >= 2) {
      usWire(G, left ? 115 : W - 115, DEPLOY_Y - 42);
      deMan(G, 'rifleman', mid, y + 10);
      usBag(G, mid, y + 3);
    }
    if (strength >= 3) {
      usWire(G, left ? 75 : W - 75, DEPLOY_Y - 48);
      deMan(G, 'gunner', left ? 130 : W - 130, y + 38);
      deMan(G, 'rifleman', far, y - 5);
      usMine(G, left ? 100 : W - 100, H / 2 + 18);
    }
  }
}
// flank pickets — strength 1–3 scales from a lone sentry to wired gun teams
function usFlankPicket(G, strength = 1) {
  const y = 428;
  for (const left of [true, false]) {
    const edge = left ? 90 : W - 90;
    const mid = left ? 165 : W - 165;
    const far = left ? 55 : W - 55;
    usBag(G, edge, y - 7);
    usMan(G, 'rifleman', edge, y);
    if (strength >= 2) {
      usWire(G, left ? 115 : W - 115, DEPLOY_Y - 42);
      usMan(G, 'rifleman', mid, y + 10);
      usBag(G, mid, y + 3);
    }
    if (strength >= 3) {
      usWire(G, left ? 75 : W - 75, DEPLOY_Y - 48);
      usMan(G, 'gunner', left ? 130 : W - 130, y + 38);
      usMan(G, 'rifleman', far, y - 5);
      usMine(G, left ? 100 : W - 100, H / 2 + 18);
    }
  }
}

const LEVELS = {
  endless: {
    id: 'endless',
    name: 'ENDLESS',
    mode: 'endless',
    breachLimit: MAX_BREACH,
    events: true,
    placeables: PLACEABLES,
    startTP: 25,
    setup(G) {
      // you start with two riflemen already dug in
      G.units.push(makeUnit('rifleman', lx(-70), 470));
      G.units.push(makeUnit('rifleman', lx(70), 470));
    },
  },

  // ---- Tutorial campaign: scripted lessons, then endless defense.
  tutorial1: {
    id: 'tutorial1',
    name: 'TUTORIAL 1: BASIC TRAINING',
    menuName: 'LESSON 1 — BASIC TRAINING',
    menuDesc: 'Select, move, and buy units.',
    mode: 'endless',
    tutorial: true,
    breachLimit: MAX_BREACH,
    events: true,
    placeables: PLACEABLES,
    startTP: 0,
    setup(G) { setupTutorial1(G); },
  },

  tutorial2: {
    id: 'tutorial2',
    name: 'TUTORIAL 2: UNDER ATTACK',
    menuName: 'LESSON 2 — UNDER ATTACK',
    menuDesc: 'Fortify a weak flank under fire.',
    mode: 'endless',
    tutorial: true,
    breachLimit: MAX_BREACH,
    events: true,
    placeables: PLACEABLES,
    startTP: 0,
    setup(G) { setupTutorial2(G); },
  },

  tutorial3: {
    id: 'tutorial3',
    name: 'TUTORIAL 3: DAMAGE TYPES',
    menuName: 'LESSON 3 — DAMAGE TYPES',
    menuDesc: 'Bullets, fire, and explosives.',
    mode: 'endless',
    tutorial: true,
    breachLimit: MAX_BREACH,
    events: true,
    placeables: PLACEABLES,
    startTP: 0,
    setup(G) { setupTutorial3(G); },
  },

  // ---- Allied campaign: US assaults across Western Europe, then a defense finale.
  allied_dday: {
    id: 'allied_dday',
    name: 'ALLIED 1: OMAHA BEACH',
    menuName: 'LEVEL 1 — OMAHA BEACH',
    menuDesc: 'June 6, 1944 — storm the Atlantic Wall.',
    mode: 'assault',
    attackerNation: 'us',
    defenderNation: 'de',
    landingCraft: true,
    winBreaches: 5,
    assaultWaves: 3,
    wavePayout: 32,
    wavePayoutStep: 12,
    events: false,
    placeables: ASSAULT_PLACEABLES,
    history: 'June 6, 1944. The US 1st and 29th Infantry hit Omaha under withering fire from the bluffs. Landing craft motor through the surf; when the ramps drop, the killing ground opens.',
    briefing: 'Deploy men only on the landing craft. Press START — the boats run in, ramps drop, and the Germans open fire. Get 5 men past the bottom edge, or wipe the beach defenses.',
    setup(G) {
      usBunker(G, lx(-160), DEPLOY_Y + 60);
      usBunker(G, lx(160), DEPLOY_Y + 60);
      usBag(G, lx(-200), 435); usBag(G, lx(-80), 435);
      usBag(G, lx(80), 435); usBag(G, lx(200), 435);
      usWire(G, lx(-140), DEPLOY_Y - 20); usWire(G, W / 2, DEPLOY_Y - 25); usWire(G, lx(140), DEPLOY_Y - 20);
      usMine(G, lx(-100), H / 2 + 30); usMine(G, lx(100), H / 2 + 30);
      deRow(G, 'rifleman', 428, [lx(-200), lx(-80), lx(80), lx(200)]);
      deMan(G, 'gunner', lx(-160), DEPLOY_Y + 60);
      deMan(G, 'gunner', lx(160), DEPLOY_Y + 60);
      deMan(G, 'sniper', lx(-40), H - 90);
      deMan(G, 'sniper', lx(40), H - 90);
      deMan(G, 'officer', W / 2, H - 70);
      deFlankPicket(G, 2);
    },
  },

  allied_carentan: {
    id: 'allied_carentan',
    name: 'ALLIED 2: CARENTAN',
    menuName: 'LEVEL 2 — CARENTAN',
    menuDesc: 'June 1944 — seize the crossroads town.',
    mode: 'assault',
    attackerNation: 'us',
    defenderNation: 'de',
    winBreaches: 5,
    assaultWaves: 3,
    wavePayout: 36,
    wavePayoutStep: 12,
    events: false,
    placeables: ASSAULT_PLACEABLES,
    history: 'June 10–14, 1944. The 101st Airborne fights house-to-house and hedge-to-hedge to link Utah and Omaha. Fallschirmjäger hold the approaches with MG nests and snipers.',
    briefing: 'Three waves into a hedgerow line. Stormtroopers and flamers will clear the wire — push 5 men through or wipe them out.',
    setup(G) {
      for (const x of [lx(-220), lx(-110), W / 2, lx(110), lx(220)]) usBag(G, x, 435);
      usWire(G, lx(-160), DEPLOY_Y - 40); usWire(G, W / 2, DEPLOY_Y - 45); usWire(G, lx(160), DEPLOY_Y - 40);
      usMine(G, lx(-80), H / 2 + 20); usMine(G, lx(80), H / 2 + 20);
      deRow(G, 'rifleman', 428, [lx(-220), lx(-110), W / 2, lx(110), lx(220)]);
      deMan(G, 'gunner', lx(-60), 490); deMan(G, 'gunner', lx(60), 490);
      deMan(G, 'sniper', lx(100), H - 80);
      deFlankPicket(G, 2);
    },
  },

  allied_cobra: {
    id: 'allied_cobra',
    name: 'ALLIED 3: OPERATION COBRA',
    menuName: 'LEVEL 3 — ST-LÔ BREAKOUT',
    menuDesc: 'July 1944 — crack the bocage.',
    mode: 'assault',
    attackerNation: 'us',
    defenderNation: 'de',
    winBreaches: 6,
    assaultWaves: 4,
    wavePayout: 40,
    wavePayoutStep: 13,
    events: false,
    placeables: ASSAULT_PLACEABLES,
    history: 'July 25, 1944. After St-Lô falls, carpet bombing opens a corridor west of Saint-Lô. Armor and infantry pour through shattered hedgerows as German remnants dig in behind minefields.',
    briefing: 'A bunkered bocage line with mines. Bring Shermans and bazookas — four waves to break into the open.',
    setup(G) {
      usBunker(G, W / 2, DEPLOY_Y + 70);
      for (const x of [lx(-240), lx(-120), lx(120), lx(240)]) usBag(G, x, 435);
      for (const wx of [lx(-180), lx(-60), lx(60), lx(180)]) usWire(G, wx, DEPLOY_Y - 45);
      for (const mx of [lx(-200), lx(-70), lx(70), lx(200)]) usMine(G, mx, H / 2 + 15);
      deRow(G, 'rifleman', 428, [lx(-240), lx(-120), lx(120), lx(240)]);
      deMan(G, 'gunner', W / 2, DEPLOY_Y + 70);
      deMan(G, 'flamer', lx(-40), 500); deMan(G, 'bazooka', lx(40), 500);
      deMan(G, 'officer', W / 2, H - 70);
      deFlankPicket(G, 2);
    },
  },

  allied_market: {
    id: 'allied_market',
    name: 'ALLIED 4: MARKET GARDEN — NIJMEGEN',
    menuName: 'LEVEL 4 — NIJMEGEN',
    menuDesc: 'September 1944 — seize the Waal bridge.',
    mode: 'assault',
    attackerNation: 'us',
    defenderNation: 'de',
    winBreaches: 6,
    assaultWaves: 5,
    wavePayout: 48,
    wavePayoutStep: 14,
    events: false,
    placeables: ASSAULT_PLACEABLES,
    history: 'September 1944. While British paras fight at Arnhem, US forces storm the Nijmegen bridges. German mortars and MG nests own every approach across the open ground.',
    briefing: 'Mortar crews have the killing ground zeroed. Rush, spread out, and keep moving — five waves to crack the bridgehead.',
    setup(G) {
      usBunker(G, lx(-160), DEPLOY_Y + 70); usBunker(G, lx(160), DEPLOY_Y + 70);
      for (const x of [lx(-260), lx(-130), W / 2, lx(130), lx(260)]) usBag(G, x, 435);
      usWire(G, lx(-180), DEPLOY_Y - 50); usWire(G, W / 2, DEPLOY_Y - 55); usWire(G, lx(180), DEPLOY_Y - 50);
      deRow(G, 'mortarman', H - 60, [lx(-180), W / 2, lx(180)]);
      deRow(G, 'rifleman', 428, [lx(-260), lx(-130), W / 2, lx(130), lx(260)]);
      deRow(G, 'gunner', DEPLOY_Y + 70, [lx(-160), lx(160)]);
      deFlankPicket(G, 3);
    },
  },

  allied_hurtgen: {
    id: 'allied_hurtgen',
    name: 'ALLIED 5: HÜRTGEN FOREST',
    menuName: 'LEVEL 5 — HÜRTGEN FOREST',
    menuDesc: 'November 1944 — push toward the West Wall.',
    mode: 'assault',
    attackerNation: 'us',
    defenderNation: 'de',
    winBreaches: 7,
    assaultWaves: 5,
    wavePayout: 54,
    wavePayoutStep: 15,
    events: false,
    placeables: ASSAULT_PLACEABLES,
    history: 'Autumn 1944. The Hürtgen Forest swallows divisions in mud and treeburst artillery. German marksmen and MG teams hold every firebreak — the longest battle on German soil.',
    briefing: 'Snipers behind every tree hunt your officers and gunners. Rush cheap riflemen through the gaps — never bunch up.',
    setup(G) {
      usWire(G, lx(-220), DEPLOY_Y - 50); usWire(G, lx(-80), DEPLOY_Y - 45);
      usWire(G, lx(80), DEPLOY_Y - 45); usWire(G, lx(220), DEPLOY_Y - 50);
      for (const x of [lx(-280), lx(-150), lx(150), lx(280)]) usBag(G, x, 435);
      deRow(G, 'sniper', 470, [90, lx(-250), lx(-90), lx(90), lx(250), W - 90]);
      deMan(G, 'sniper', W / 2, H - 90);
      deRow(G, 'rifleman', 428, [lx(-280), lx(-150), lx(150), lx(280)]);
      deMan(G, 'gunner', W / 2, 500);
      deFlankPicket(G, 2);
    },
  },

  allied_bulge: {
    id: 'allied_bulge',
    name: 'ALLIED 6: BASTOGNE',
    menuName: 'LEVEL 6 — BASTOGNE',
    menuDesc: 'December 1944 — hold the crossroads.',
    mode: 'allied',
    breachLimit: MAX_BREACH,
    events: false,
    placeables: PLACEABLES,
    startTP: 24,
    history: 'December 1944. The 101st Airborne holds Bastogne while the Ardennes offensive surges around them. "Nuts!" — hold until Patton breaks through.',
    briefing: 'Hold your sector against 12 German assault waves. Survive the final push and Bastogne is yours.',
    waves: [
      { delay: 8,  comp: ['erifle', 'erifle', 'erifle'], banner: 'HERE THEY COME' },
      { delay: 22, comp: ['erifle', 'erifle', 'erifle', 'erifle'] },
      { delay: 20, comp: ['erifle', 'erifle', 'esmg', 'esmg'] },
      { delay: 18, comp: ['esmg', 'esmg', 'erifle', 'erifle', 'erifle'] },
      { delay: 18, comp: ['erifle', 'erifle', 'egren', 'esmg', 'esmg'] },
      { delay: 16, comp: ['ebike', 'erifle', 'erifle', 'esmg'], banner: 'KRADSCHÜTZEN INBOUND' },
      { delay: 16, comp: ['emg', 'erifle', 'erifle', 'erifle', 'esmg', 'esmg'] },
      { delay: 16, comp: ['egren', 'egren', 'esmg', 'esmg', 'erifle', 'erifle'] },
      { delay: 15, comp: ['eoff', 'emg', 'erifle', 'erifle', 'erifle', 'esmg'], banner: 'OFFICER LEADING THE ASSAULT' },
      { delay: 15, comp: ['eflame', 'esmg', 'esmg', 'erifle', 'erifle'] },
      { delay: 14, comp: ['ebike', 'ebike', 'esmg', 'esmg', 'egren', 'erifle'] },
      { delay: 18, comp: ['ehalftrack', 'eoff', 'emg', 'egren', 'esmg', 'esmg', 'erifle', 'erifle'],
        banner: 'FINAL ASSAULT! HALFTRACK LEADING!' },
    ],
    setup(G) {
      G.units.push(makeUnit('rifleman', lx(-70), 470));
      G.units.push(makeUnit('rifleman', lx(70), 470));
      G.sandbags.push({ x: W / 2, y: 455, hp: SANDBAG_HP, maxhp: SANDBAG_HP, up: false, workProg: 0 });
    },
  },

  // ---- Axis campaign: 13 escalating assaults on the American line.
  // Level 1 opens with two waves; wave counts, defenders, and per-wave TP all
  // climb from there. Every third level is a themed set-piece for flavor.
  axis1: {
    id: 'axis1',
    name: 'AXIS 1: BATTLE OF MOKRA',
    menuName: 'LEVEL 1 — BATTLE OF MOKRA',
    menuDesc: 'September 1939, Poland — break the cavalry screen.',
    mode: 'axis',
    winBreaches: 5,
    axisWaves: 2,
    wavePayout: 25,
    wavePayoutStep: 10,
    events: false,
    history: 'September 1, 1939. German panzer columns slam into Polish cavalry screens west of Łódź. At Mokra, lancers and riflemen hold the ridgeline — your first test of blitzkrieg against a stubborn picket.',
    briefing: 'Two assault waves against a thin defensive screen. Fresh TP each wave — spend it or lose it. Get 5 men past the bottom, or wipe the defenders.',
    setup(G) {
      usBag(G, lx(-105), 435); usBag(G, lx(-35), 435); usBag(G, lx(35), 435); usBag(G, lx(105), 435);
      usWire(G, lx(-70), DEPLOY_Y - 30); usWire(G, lx(70), DEPLOY_Y - 30);
      usRow(G, 'rifleman', 428, [lx(-105), lx(-35), lx(35), lx(105)]);
      usMan(G, 'gunner', W / 2, 485);
      usFlankPicket(G, 1);
    },
  },

  axis2: {
    id: 'axis2',
    name: 'AXIS 2: CROSSING THE MEUSE — SEDAN',
    menuName: 'LEVEL 2 — SEDAN',
    menuDesc: 'May 1940, France — cross the Meuse.',
    mode: 'axis',
    winBreaches: 5,
    axisWaves: 3,
    wavePayout: 30,
    wavePayoutStep: 10,
    events: false,
    history: 'May 13, 1940. Guderian\'s panzer corps must force the Meuse at Sedan before the French can rally. The defenders have wired the approaches and posted marksmen on the heights.',
    briefing: 'Three waves to crack a reinforced picket guarding the river crossing. Stormtroopers and flammenwerfer will help clear the wire.',
    setup(G) {
      usBag(G, lx(-180), 435); usBag(G, lx(-90), 435); usBag(G, W / 2, 435);
      usBag(G, lx(90), 435); usBag(G, lx(180), 435);
      usWire(G, lx(-140), DEPLOY_Y - 40); usWire(G, W / 2, DEPLOY_Y - 45); usWire(G, lx(140), DEPLOY_Y - 40);
      usMine(G, lx(-60), H / 2 + 20); usMine(G, lx(60), H / 2 + 20);
      usRow(G, 'rifleman', 428, [lx(-180), lx(-90), W / 2, lx(90), lx(180)]);
      usMan(G, 'gunner', lx(-60), 490); usMan(G, 'gunner', lx(60), 490);
      usMan(G, 'sniper', lx(90), H - 80);
      usFlankPicket(G, 2);
    },
  },

  axis3: {
    id: 'axis3',
    name: 'AXIS 3: FALL OF MALEME — CRETE',
    menuName: 'LEVEL 3 — MALEME, CRETE',
    menuDesc: 'May 1941, Crete — seize the airfield.',
    mode: 'axis',
    winBreaches: 5,
    axisWaves: 3,
    wavePayout: 32,
    wavePayoutStep: 12,
    events: false,
    history: 'May 20, 1941. Fallschirmjäger descend on Crete to seize airfields for the invasion fleet. At Maleme the garrison clusters around the runway while flank sentries watch the olive groves.',
    briefing: 'The defenders are bunched around the airfield with thin flanks. Research paradrop if you can — drop random infantry behind their line.',
    setup(G) {
      const cx = W / 2;
      usBag(G, cx - 40, 450); usBag(G, cx + 40, 450); usBag(G, cx, 505);
      usRow(G, 'rifleman', 470, [cx - 45, cx, cx + 45]);
      usMan(G, 'gunner', cx, 512);
      usMan(G, 'shotgunner', cx - 30, 522);
      usMan(G, 'medic', cx + 30, 522);
      usMan(G, 'rifleman', 110, 440);
      usMan(G, 'rifleman', W - 110, 440);
      usWire(G, 130, DEPLOY_Y - 38); usWire(G, W - 130, DEPLOY_Y - 38);
    },
  },

  axis4: {
    id: 'axis4',
    name: 'AXIS 4: BREST FORTRESS',
    menuName: 'LEVEL 4 — BREST FORTRESS',
    menuDesc: 'June 1941, USSR — storm the strongpoint.',
    mode: 'axis',
    winBreaches: 6,
    axisWaves: 4,
    wavePayout: 36,
    wavePayoutStep: 12,
    events: false,
    history: 'June 22, 1941. Operation Barbarossa opens with fortress cities on the border. Brest holds out in bunkers and trenches — a preview of the grinding fights ahead on the Eastern Front.',
    briefing: 'A bunkered fortress line with deep wire belts. Four waves to crack the citadel. Mortars and grenadiers will help dig them out.',
    setup(G) {
      for (const x of [lx(-220), lx(-110), W / 2, lx(110), lx(220)]) usBag(G, x, 435);
      usBunker(G, W / 2, DEPLOY_Y + 80);
      usWire(G, lx(-170), DEPLOY_Y - 45); usWire(G, lx(-55), DEPLOY_Y - 50);
      usWire(G, lx(55), DEPLOY_Y - 50); usWire(G, lx(170), DEPLOY_Y - 45);
      usMine(G, lx(-200), H / 2 + 15); usMine(G, lx(200), H / 2 + 15);
      usRow(G, 'rifleman', 428, [lx(-220), lx(-110), W / 2, lx(110), lx(220)]);
      usMan(G, 'gunner', W / 2, DEPLOY_Y + 80);
      usMan(G, 'sniper', lx(-120), H - 80); usMan(G, 'sniper', lx(120), H - 80);
      usFlankPicket(G, 2);
    },
  },

  axis5: {
    id: 'axis5',
    name: 'AXIS 5: KASSERINE PASS',
    menuName: 'LEVEL 5 — KASSERINE PASS',
    menuDesc: 'February 1943, Tunisia — break the US line.',
    mode: 'axis',
    winBreaches: 6,
    axisWaves: 4,
    wavePayout: 40,
    wavePayoutStep: 13,
    events: false,
    history: 'February 19, 1943. Rommel\'s Afrika Korps punches through the inexperienced American II Corps at Kasserine Pass — the first major clash between US and German forces in North Africa.',
    briefing: 'A deep infantry line with medics keeping casualties on their feet. Outlast them wave by wave — motorcycles can race for the breach.',
    setup(G) {
      for (const x of [lx(-280), lx(-200), lx(-100), W / 2, lx(100), lx(200), lx(280)]) usBag(G, x, 435);
      usWire(G, lx(-180), DEPLOY_Y - 45); usWire(G, lx(-60), DEPLOY_Y - 55);
      usWire(G, lx(60), DEPLOY_Y - 55); usWire(G, lx(180), DEPLOY_Y - 45);
      usMine(G, lx(-120), H / 2 + 20); usMine(G, W / 2, H / 2 + 20); usMine(G, lx(120), H / 2 + 20);
      usRow(G, 'rifleman', 428, [lx(-280), lx(-200), lx(-100), W / 2, lx(100), lx(200), lx(280)]);
      usRow(G, 'gunner', 495, [lx(-140), W / 2, lx(140)]);
      usMan(G, 'medic', lx(-80), H - 70); usMan(G, 'medic', lx(80), H - 70);
      usMan(G, 'sniper', lx(-200), H - 80); usMan(G, 'sniper', lx(200), H - 80);
      usFlankPicket(G, 2);
    },
  },

  axis6: {
    id: 'axis6',
    name: 'AXIS 6: KURSK — PROKHOROVKA',
    menuName: 'LEVEL 6 — PROKHOROVKA',
    menuDesc: 'July 1943, USSR — the armored graveyard.',
    mode: 'axis',
    winBreaches: 6,
    axisWaves: 4,
    wavePayout: 44,
    wavePayoutStep: 14,
    events: false,
    history: 'July 12, 1943. The largest tank battle in history rages near Prokhorovka. Soviet armor and anti-tank guns wait behind minefields — heavy Panzers die here without support.',
    briefing: 'A Sherman and AT guns guard a minefield. Panzerfausts and StuG IIIs will serve you better than charging tanks into the killing ground.',
    setup(G) {
      usBunker(G, W / 2, DEPLOY_Y + 70);
      usMan(G, 'sherman', W / 2, 470);
      usMan(G, 'atgun', lx(-260), 440); usMan(G, 'atgun', lx(260), 440);
      usBag(G, lx(-180), 435); usBag(G, lx(-60), 435); usBag(G, lx(60), 435); usBag(G, lx(180), 435);
      for (const mx of [lx(-280), lx(-140), W / 2, lx(140), lx(280)]) usMine(G, mx, H / 2 + 10);
      usWire(G, lx(-150), DEPLOY_Y - 45); usWire(G, W / 2, DEPLOY_Y - 50); usWire(G, lx(150), DEPLOY_Y - 45);
      usRow(G, 'rifleman', 428, [lx(-180), lx(-60), lx(60), lx(180)]);
      usMan(G, 'gunner', lx(-220), 445); usMan(G, 'gunner', lx(220), 445);
      usFlankPicket(G, 2);
    },
  },

  axis7: {
    id: 'axis7',
    name: 'AXIS 7: MONTE CASSINO',
    menuName: 'LEVEL 7 — MONTE CASSINO',
    menuDesc: 'February 1944, Italy — take the ridge.',
    mode: 'axis',
    winBreaches: 6,
    axisWaves: 5,
    wavePayout: 48,
    wavePayoutStep: 14,
    events: false,
    history: 'February 1944. The abbey on Monte Cassino commands the Liri Valley. Allied infantry and New Zealand gunners hold the slopes in bunkers — four assaults have already failed here.',
    briefing: 'Twin bunkers with machine-gun teams command the ridge. Five waves to storm the heights. Flammenwerfer and mortars clear dug-in positions.',
    setup(G) {
      usBunker(G, lx(-180), DEPLOY_Y + 70); usBunker(G, lx(180), DEPLOY_Y + 70);
      for (const x of [lx(-280), lx(-180), lx(-60), lx(60), lx(180), lx(280)]) usBag(G, x, 435);
      usWire(G, lx(-200), DEPLOY_Y - 50); usWire(G, lx(-70), DEPLOY_Y - 55);
      usWire(G, lx(70), DEPLOY_Y - 55); usWire(G, lx(200), DEPLOY_Y - 50);
      usMine(G, lx(-130), H / 2 + 20); usMine(G, lx(130), H / 2 + 20);
      usRow(G, 'rifleman', 428, [lx(-280), lx(-180), lx(-60), lx(60), lx(180), lx(280)]);
      usRow(G, 'gunner', DEPLOY_Y + 70, [lx(-180), lx(180)]);
      usMan(G, 'sniper', lx(-100), H - 80); usMan(G, 'sniper', lx(100), H - 80);
      usMan(G, 'medic', lx(-60), H - 70); usMan(G, 'medic', lx(60), H - 70);
      usFlankPicket(G, 3);
    },
  },

  axis8: {
    id: 'axis8',
    name: 'AXIS 8: OPERATION BAGRATION',
    menuName: 'LEVEL 8 — BELARUS',
    menuDesc: 'June 1944, Eastern Front — pierce the Soviet line.',
    mode: 'axis',
    winBreaches: 7,
    axisWaves: 5,
    wavePayout: 52,
    wavePayoutStep: 15,
    events: false,
    history: 'June 1944. While the Allies land in Normandy, the Red Army unleashes Operation Bagration — shattering Army Group Centre. This is a desperate counterattack into a deep, layered Soviet defense.',
    briefing: 'A deep line with medics keeping everyone on their feet. Bleed them white across five waves — numbers and firepower decide this fight.',
    setup(G) {
      for (const x of [lx(-300), lx(-220), lx(-110), W / 2, lx(110), lx(220), lx(300)]) usBag(G, x, 435);
      usBunker(G, W / 2, DEPLOY_Y + 80);
      usWire(G, lx(-200), DEPLOY_Y - 50); usWire(G, lx(-70), DEPLOY_Y - 55);
      usWire(G, lx(70), DEPLOY_Y - 55); usWire(G, lx(200), DEPLOY_Y - 50);
      for (const mx of [lx(-240), lx(-80), lx(80), lx(240)]) usMine(G, mx, H / 2 + 15);
      usRow(G, 'rifleman', 428, [lx(-300), lx(-220), lx(-110), W / 2, lx(110), lx(220), lx(300)]);
      usRow(G, 'gunner', 495, [lx(-150), W / 2, lx(150)]);
      usRow(G, 'medic', H - 70, [lx(-180), lx(180)]);
      usMan(G, 'sniper', lx(-80), H - 90); usMan(G, 'sniper', lx(80), H - 90);
      usFlankPicket(G, 3);
    },
  },

  axis9: {
    id: 'axis9',
    name: 'AXIS 9: HÜRTGEN FOREST',
    menuName: 'LEVEL 9 — HÜRTGEN FOREST',
    menuDesc: 'September 1944, Germany — push the hedgerows.',
    mode: 'axis',
    winBreaches: 7,
    axisWaves: 5,
    wavePayout: 56,
    wavePayoutStep: 16,
    events: false,
    history: 'September 1944. The US 28th Infantry Division pushes into the Hürtgen Forest — dense woods, mud, and hidden marksmen. The longest battle on German soil begins in these dark trees.',
    briefing: 'Marksmen behind every hedgerow hunt your officers and gunners. Rush cheap riflemen through the gaps — never bunch up in the open.',
    setup(G) {
      usWire(G, lx(-220), DEPLOY_Y - 50); usWire(G, lx(-80), DEPLOY_Y - 45);
      usWire(G, lx(80), DEPLOY_Y - 45); usWire(G, lx(220), DEPLOY_Y - 50);
      for (const x of [lx(-280), lx(-150), lx(150), lx(280)]) usBag(G, x, 435);
      usRow(G, 'sniper', 470, [90, lx(-250), lx(-90), lx(90), lx(250), W - 90]);
      usMan(G, 'sniper', W / 2, H - 90);
      usRow(G, 'rifleman', 428, [lx(-280), lx(-150), lx(150), lx(280)]);
      usRow(G, 'rifleman', 500, [130, W - 130]);
      usMan(G, 'medic', W / 2, 520);
      usFlankPicket(G, 2);
    },
  },

  axis10: {
    id: 'axis10',
    name: 'AXIS 10: SIEGFRIED LINE — AACHEN',
    menuName: 'LEVEL 10 — AACHEN',
    menuDesc: 'October 1944 — breach the West Wall.',
    mode: 'axis',
    winBreaches: 7,
    axisWaves: 6,
    wavePayout: 60,
    wavePayoutStep: 16,
    events: false,
    history: 'October 1944. Aachen is the first German city to face direct assault. The Siegfried Line\'s bunkers and dragon\'s teeth slow every advance — the Americans have an engineer keeping the wall intact.',
    briefing: 'Three bunkers, layered wire, and an engineer patching the fortifications. Bring mortars, flammenwerfer, and armor to breach the West Wall.',
    setup(G) {
      usBunker(G, lx(-220), DEPLOY_Y + 70); usBunker(G, W / 2, DEPLOY_Y + 80); usBunker(G, lx(220), DEPLOY_Y + 70);
      for (const x of [lx(-300), lx(-200), lx(-100), lx(100), lx(200), lx(300)]) usBag(G, x, 435);
      for (const wx of [lx(-240), lx(-120), W / 2, lx(120), lx(240)]) usWire(G, wx, DEPLOY_Y - 50);
      for (const mx of [lx(-280), lx(-140), W / 2, lx(140), lx(280)]) usMine(G, mx, H / 2 + 15);
      usRow(G, 'gunner', DEPLOY_Y + 72, [lx(-220), W / 2, lx(220)]);
      usRow(G, 'rifleman', 428, [lx(-300), lx(-200), lx(-100), lx(100), lx(200), lx(300)]);
      usMan(G, 'engineer', W / 2, 520);
      usMan(G, 'medic', lx(-140), H - 70); usMan(G, 'medic', lx(140), H - 70);
      usMan(G, 'sniper', lx(-80), H - 80); usMan(G, 'sniper', lx(80), H - 80);
      usFlankPicket(G, 3);
    },
  },

  axis11: {
    id: 'axis11',
    name: 'AXIS 11: MARKET GARDEN — ARNHEM',
    menuName: 'LEVEL 11 — ARNHEM',
    menuDesc: 'September 1944, Netherlands — cross the open ground.',
    mode: 'axis',
    winBreaches: 7,
    axisWaves: 6,
    wavePayout: 66,
    wavePayoutStep: 17,
    events: false,
    history: 'September 17, 1944. Operation Market Garden aims to seize the Rhine bridges. At Arnhem, British paratroopers hold the far bank while mortars zero every approach — a bridge too far.',
    briefing: 'Mortar crews have the killing ground zeroed. Rush across before the shells find you — spread out and keep moving.',
    setup(G) {
      for (const x of [lx(-280), lx(-180), lx(-90), W / 2, lx(90), lx(180), lx(280)]) usBag(G, x, 435);
      usBunker(G, W / 2, DEPLOY_Y + 80);
      usWire(G, lx(-200), DEPLOY_Y - 50); usWire(G, lx(-70), DEPLOY_Y - 55);
      usWire(G, lx(70), DEPLOY_Y - 55); usWire(G, lx(200), DEPLOY_Y - 50);
      usRow(G, 'mortarman', H - 60, [lx(-200), W / 2, lx(200)]);
      usRow(G, 'rifleman', 428, [lx(-280), lx(-180), lx(-90), W / 2, lx(90), lx(180), lx(280)]);
      usRow(G, 'gunner', 495, [lx(-150), W / 2, lx(150)]);
      usMan(G, 'medic', lx(-220), H - 70); usMan(G, 'medic', lx(220), H - 70);
      usFlankPicket(G, 3);
    },
  },

  axis12: {
    id: 'axis12',
    name: 'AXIS 12: BULGE — ST. VITH',
    menuName: 'LEVEL 12 — ST. VITH',
    menuDesc: 'December 1944, Belgium — take the road hub.',
    mode: 'axis',
    winBreaches: 7,
    axisWaves: 6,
    wavePayout: 72,
    wavePayoutStep: 18,
    events: false,
    history: 'December 16, 1944. The Ardennes offensive surges west. St. Vith is a critical road junction — the 7th Armored and scattered infantry throw everything they have into blocking the advance.',
    briefing: 'Combined arms defense: riflemen, armor, and support weapons in a disorganized but deadly line. Punch through before they rally.',
    setup(G) {
      usBunker(G, lx(-120), DEPLOY_Y + 80); usBunker(G, lx(120), DEPLOY_Y + 80);
      usBag(G, lx(-280), 435); usBag(G, lx(-160), 435); usBag(G, lx(160), 435); usBag(G, lx(280), 435);
      usWire(G, lx(-200), DEPLOY_Y - 50); usWire(G, W / 2, DEPLOY_Y - 55); usWire(G, lx(200), DEPLOY_Y - 50);
      usMine(G, lx(-120), H / 2 + 15); usMine(G, lx(120), H / 2 + 15);
      usMan(G, 'rifleman', lx(-300), 440); usMan(G, 'rifleman', lx(300), 440);
      usMan(G, 'gunner', lx(-220), 460); usMan(G, 'gunner', lx(220), 460);
      usMan(G, 'grenadier', lx(-140), 480); usMan(G, 'grenadier', lx(140), 480);
      usMan(G, 'shotgunner', lx(-60), 500); usMan(G, 'bazooka', lx(60), 500);
      usMan(G, 'flamer', lx(-20), 510); usMan(G, 'sniper', lx(20), 510);
      usMan(G, 'mortarman', lx(-80), 455); usMan(G, 'mortarman', lx(80), 455);
      usMan(G, 'medic', lx(-100), H - 70); usMan(G, 'engineer', lx(100), H - 70);
      usMan(G, 'officer', W / 2, H - 55);
      usMan(G, 'jeep', lx(-260), 525); usMan(G, 'atgun', lx(260), 525);
      usFlankPicket(G, 2);
    },
  },

  axis13: {
    id: 'axis13',
    name: 'AXIS 13: BASTOGNE — WACHT AM RHEIN',
    menuName: 'LEVEL 13 — BASTOGNE',
    menuDesc: 'December 1944 — the seven-wave finale.',
    mode: 'axis',
    winBreaches: 7,
    axisWaves: 7,
    wavePayout: 80,
    wavePayoutStep: 22,
    events: false,
    history: 'December 1944. Bastogne is the hinge of the Bulge. The 101st Airborne and attached armor form a fortress ring — seven waves and every gun in the theater to break "Nuts!"',
    briefing: 'The final line: Shermans, AT guns, bunkers, and mortars under an officer. Seven waves and the fattest budgets of the war. Break Bastogne and the offensive lives.',
    setup(G) {
      usBunker(G, lx(-240), DEPLOY_Y + 70); usBunker(G, W / 2, DEPLOY_Y + 85); usBunker(G, lx(240), DEPLOY_Y + 70);
      for (const x of [lx(-320), lx(-220), lx(-110), lx(110), lx(220), lx(320)]) usBag(G, x, 435);
      for (const wx of [lx(-280), lx(-150), lx(-50), lx(50), lx(150), lx(280)]) usWire(G, wx, DEPLOY_Y - 50);
      for (const mx of [lx(-300), lx(-160), W / 2, lx(160), lx(300)]) usMine(G, mx, H / 2 + 12);
      usMan(G, 'sherman', lx(-140), 500); usMan(G, 'sherman', lx(140), 500);
      usMan(G, 'atgun', lx(-340), 460); usMan(G, 'atgun', lx(340), 460);
      usRow(G, 'gunner', DEPLOY_Y + 72, [lx(-240), W / 2, lx(240)]);
      usRow(G, 'rifleman', 428, [lx(-320), lx(-220), lx(-110), lx(110), lx(220), lx(320)]);
      usRow(G, 'sniper', H - 90, [lx(-180), lx(180), 100, W - 100]);
      usRow(G, 'mortarman', H - 55, [lx(-80), lx(80)]);
      usRow(G, 'medic', H - 78, [lx(-280), lx(280)]);
      usMan(G, 'engineer', W / 2, H - 62);
      usMan(G, 'officer', W / 2, H - 40);
      usFlankPicket(G, 3);
    },
  },

  hitsquad: {
    id: 'hitsquad',
    name: 'COMMANDO 1: HIT SQUAD',
    menuName: 'LEVEL 1 — HIT SQUAD',
    menuDesc: 'Kill the marked US officer in 5 minutes.',
    mode: 'hitsquad',
    timeLimit: 300,
    events: false,
    placeables: [],
    startTP: 0,
    briefing: 'Command your six-man squad. Kill the marked American officer before the clock runs out.',
    setup(G) {
      // your commando squad steps off from the north edge. These are
      // hand-picked veterans — six men against a dug-in platoon, so each one
      // is worth three line infantry: tougher, deadlier, longer-armed, and
      // quick back on their feet when pinned.
      const squad = [
        ['eoff', lx(-100)], ['esniper', lx(-60)], ['emg', lx(-20)],
        ['esmg', lx(20)], ['esmg', lx(60)], ['egren', lx(100)],
      ];
      for (const [type, x] of squad) {
        const e = makeEnemy(type, x, 36);
        // per-man stat clone so ENEMY_TYPES stays untouched for other modes
        e.t = Object.assign({}, e.t, {
          hp: Math.round(e.t.hp * 2.2),
          dmg: Math.round(e.t.dmg * 1.25),
          acc: Math.min(0.9, e.t.acc * 1.15),
          range: Math.round(e.t.range * 1.15),
          speed: Math.round(e.t.speed * 1.1),
        });
        e.hp = e.maxhp = e.t.hp;
        e.rank = 4;   // shortens pin time in tryGoProne; Germans draw no chevrons
        G.enemies.push(e);
      }
      G.squadTotal = squad.length;

      // the target: a US officer well behind the line, marked for death
      const vip = makeUnit('officer', W / 2, H - 55);
      vip.vip = true;
      G.units.push(vip);

      // his security detail holds the center; the flanks are thinner —
      // a small detail on purpose: six commandos cannot win a stand-up fight
      // against a full platoon, so the mission is sized for maneuver
      const bag = (x, y) => G.sandbags.push({ x, y, hp: SANDBAG_HP, maxhp: SANDBAG_HP, up: false, workProg: 0 });
      bag(lx(-60), DEPLOY_Y + 40);
      bag(lx(60), DEPLOY_Y + 40);
      G.units.push(makeUnit('gunner', W / 2, DEPLOY_Y + 45));
      G.units.push(makeUnit('rifleman', lx(-60), DEPLOY_Y + 36));
      G.units.push(makeUnit('rifleman', lx(60), DEPLOY_Y + 36));
      G.units.push(makeUnit('rifleman', lx(-260), DEPLOY_Y + 55));
      G.units.push(makeUnit('rifleman', lx(260), DEPLOY_Y + 55));
      G.units.push(makeUnit('shotgunner', lx(-50), H - 85));
      // no mortar in the detail: indirect fire would punish the flanking
      // routes this mission is designed around

      // the direct approach is fortified: wire and mines down the middle
      for (const wx of [lx(-110), W / 2, lx(110)]) {
        G.wires.push({ x: wx, y: FORWARD_Y + 40, hp: 3750, maxhp: 3750, up: false, workProg: 0 });
      }
      for (const mx of [lx(-60), W / 2, lx(60)]) {
        G.mines.push({ x: mx, y: H / 2 + 10, dead: false });
      }
    },
  },
};
