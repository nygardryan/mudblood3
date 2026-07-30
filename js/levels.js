/* Trenchworks: WW2 — level definitions.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// every mode is a level. endless is the classic open-ended defense; campaign
// levels script their own forces, waves and win conditions.

const ENDLESS_DIFFICULTIES = {
  // hpRamp: extra enemy HP per wave, applied at spawn (see makeEnemy in
  // js/state.js) and capped at ENEMY_HP_RAMP_CAP. Income alone made the tiers
  // indistinguishable past the opening minutes — this is what makes a harder
  // setting a harder WAR rather than just a slower start. The sandboxes hold
  // enemies at their catalog HP so test results stay readable.
  sandbox: { id: 'sandbox', name: 'SANDBOX', incomeMult: 1, hpRamp: 0, sandbox: true,
    desc: 'Unlimited TP. Experiment with any loadout.' },
  testing: { id: 'testing', name: 'TESTING', incomeMult: 1, hpRamp: 0, sandbox: true, testing: true,
    desc: 'Unlimited TP. No Germans spawn on their own — build them yourself with the GERMANS button.' },
  easy: { id: 'easy', name: 'EASY', incomeMult: 1, hpRamp: 0.00625, sandbox: false,
    desc: 'Full supply rate. The classic experience.' },
  medium: { id: 'medium', name: 'MEDIUM', incomeMult: 0.66, hpRamp: 0.01, sandbox: false,
    desc: '66% income, and the enemy hardens as the war drags on.' },
  hard: { id: 'hard', name: 'HARD', incomeMult: 0.33, hpRamp: 0.0125, sandbox: false,
    desc: '33% income. Every TP counts, and every German is tougher than the last.' },
};

// Emplacement HP constants (hoisted) — read by input.js placement, the codex,
// and the inspector's ghost previews. usBunker is used by the tutorial setups.
const SANDBAG_HP = 660;
const DUMMY_HP = 495;          // decoy scarecrow: 3/4 of a sandbag wall, +this per fortify tier
const BUNKER_HP = 2040;
const WATCHTOWER_HP = 500;
const CAMONEST_HP = 280;
const AMMOCRATE_HP = 320;
function usBunker(G, x, y, hp = BUNKER_HP){ G.bunkers.push({ x, y, hp, maxhp: hp, up: false, workProg: 0 }); }

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
      G.units.push(makeUnit('rifleman', 470, ly(-70)));
      G.units.push(makeUnit('rifleman', 470, ly(70)));
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
};
