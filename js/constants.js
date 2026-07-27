/* Trenchworks: WW2 — tuning constants & placeable catalog.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

const W = 540, H = 620;
// layouts below were authored against the original 900px-wide field; lx()
// rescales an offset-from-center so those formations keep their proportions
const LAYOUT_REF_W = 900;
function lx(off) { return W / 2 + off * (W / LAYOUT_REF_W); }
const DEPLOY_Y = 380;          // your side of the field starts here
const FORWARD_Y = H / 3;       // units may advance and mines/wire may be laid this far up
const MAX_BREACH = 7;
const MAX_OFFICERS = 5;
const MEDIC_RANGE = 95;
const ENGINEER_RANGE = 95;
const OFFICER_AURA = 78;
const WATCHTOWER_AURA = 22;
const RANKUP_RADIUS = 140;  // testing-mode-only field-promotion ability
const PURGE_RADIUS = 150;   // testing-mode-only kill-everything ability
const WATCHTOWER_RANGE_MULT = 1.25;
const WATCHTOWER_RANGE_MULT_UPGRADED = 1.35;
const WATCHTOWER_RANGE_MULT_HARDENED = 1.5;    // second-tier fortification (Hardened Works)
const AMMOCRATE_AURA = 60;                      // radius that shares out its ammunition
// lower rofMult = faster cycling: nearby soldiers fire and reload quicker.
// a fresh crate is +10%, an engineer-fortified one +20%, a hardened one +30%.
const AMMOCRATE_ROF_MULT = 0.9;
const AMMOCRATE_ROF_MULT_UPGRADED = 0.8;
const AMMOCRATE_ROF_MULT_HARDENED = 0.7;       // second-tier fortification (Hardened Works)
const CAMONEST_ZONE = 30;               // same footprint as a bunker's cover radius
const CAMONEST_REVEAL = 3;              // seconds targetable after a shot, unfortified
const CAMONEST_REVEAL_FORTIFIED = 1.5;
const CAMONEST_REVEAL_HARDENED = 0.5;   // second-tier fortification (Hardened Works)
const CAMONEST_EXPLOSIVE_MULT = 1.2;    // weak to explosives — no reduction like a bunker's concrete
const GRENADE_CATCH_RANGE = 34;         // how close a grenadier must be to a landed enemy grenade to heave it back
const V2_ROCKET_ARC = 130;              // cruise altitude of the V2 warhead between boost and terminal dive
const BOMB_FALL_ARC = 300;              // apparent release altitude of a bomber's stick as it falls onto the field

// --- suppression ----------------------------------------------------------
// A sup-flagged MG (MG42, Type 99, Type 92) doesn't just shoot its target —
// each burst beats a ZONE. Every defender near the aim point risks being
// pinned, and unlike the near-miss flinch in fireShot a pin REFRESHES and
// ignores proneCd: sustained fire holds a sector down (a prone man doesn't
// shoot, see tryGoProne) while the assault crosses. The gun suppresses only
// what its normal target pick can see, so smoke that blinds the gun silences
// the beaten zone with it — no firing at ghosts through the murk.
const SUP_RADIUS = 30;          // beaten-zone radius around the aim point
const SUP_PIN_CHANCE = 0.9;     // per burst, per man in the zone
// the pin lasts the burst's whole length plus this tail, so a longer belt
// holds a sector down for longer — see suppress() in js/shooting.js
const SUP_PIN_MIN = 1.3;        // seconds a man stays down AFTER the gun lifts
const SUP_PIN_MAX = 2.4;
const SUP_FIRE_SPREAD = 26;     // px of scatter on where a suppressive burst walks
const SUP_FIRE_TRACERS = 3;     // rounds drawn per suppressive burst
// an officer in aura drags his men back onto their guns: a pin burns down this
// much FASTER than real time on top of it, so 1s of cover clears 4s of pin.
// The counter-play to a base of fire — mirrors the medic vs infection. Tuned
// against a dug-in MG42: unrallied men sit pinned ~100% of the time and never
// fire a shot, so anything gentler than this doesn't read as an answer at all.
const OFFICER_RALLY_MULT = 3;

// --- difficulty: enemy toughness ramp ---------------------------------------
// Difficulty used to be income-only (ENDLESS_DIFFICULTIES in js/levels.js), so
// "hard" meant a slower start rather than a harder war — measurably, it did not
// survive fewer waves than easy. Each tier now also grows enemy HP per wave.
// Deliberately shallow (hard reaches +25% at wave 20) and capped, so the late
// game scales on wave VOLUME and composition rather than on bullet sponges.
const ENEMY_HP_RAMP_CAP = 3;    // hard reaches this ceiling around wave 160

// economy: seconds between +1 TP supply-trickle ticks. Lower = the player
// banks TP faster to place more units and experiment with defenses.
const TP_TRICKLE_INTERVAL = 3;
// breather added between waves (endless) so the line has time to reset
const WAVE_BREATHER = 3;

// engine pacing
const HUD_INTERVAL = 0.1;         // seconds between DOM HUD refreshes
const AURA_CACHE_INTERVAL = 0.4;  // seconds between officer/watchtower aura cache rebuilds
const PARTICLE_CAP = 250;

const UNIT_TYPES = {
  rifleman: {
    name: 'Rifleman', hp: 100, range: 154, dmg: 13, acc: 0.55,
    rof: 0.88, burst: 1, burstGap: 0, speed: 42,
    color: '#55763c', gun: 7, sfx: 'rifle',
    desc: 'M1 Garand. The backbone of your line.',
  },
  gunner: {
    name: 'Gunner', hp: 100, range: 179, dmg: 9, acc: 0.32,
    rof: 1.36, burst: 6, burstGap: 0.09, speed: 36, sup: true,
    color: '#476837', gun: 10, sfx: 'mg',
    desc: 'BAR automatic rifle. Long bursts beat the ground around whatever he fires on, pinning everything near it.',
  },
  grenadier: {
    // 50% more gun range than the rifleman (154): the better all-rounder
    name: 'Grenadier', hp: 100, range: 231, dmg: 10, acc: 0.55,
    rof: 1.2, burst: 1, burstGap: 0, speed: 42,
    color: '#4f7040', gun: 6, sfx: 'rifle', grenade: true,
    desc: 'Carbine most of the time; a heavy frag now and then. Quick enough to catch a live German grenade and heave it back.',
  },
  shotgunner: {
    name: 'Shotgunner', hp: 145, range: 0, dmg: 0, acc: 0,
    rof: 1.5, burst: 1, burstGap: 0, speed: 34,
    color: '#4a6438', gun: 9, sfx: 'shotgun',
    shotgun: { range: 96, arc: 0.52, pellets: 8, dmg: 11, spread: 0.45 },
    desc: 'M97 trench gun and steel plate. Buckshot shreds clusters up close.',
  },
  bazooka: {
    name: 'Bazooka', hp: 90, range: 80, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, speed: 40,
    color: '#476237', gun: 5, sfx: 'pistol',
    rocket: { range: 243, cdMin: 7.4, cdMax: 10.1, r: 30, dmg: 120, speed: 380, armorMult: 2.75 },
    desc: 'M1A1 rocket launcher. The answer to armor.',
  },
  mortarman: {
    name: 'Mortarman', hp: 90, range: 88, dmg: 8, acc: 0.47,
    rof: 1.0, burst: 1, burstGap: 0, speed: 38,
    color: '#587244', gun: 5, sfx: 'pistol',
    mortar: { range: 348, min: 118, cdMin: 9, cdMax: 12, r: 40, dmg: 75, flight: 1.6, scatter: 52 },
    desc: 'Portable 60mm mortar. Indirect fire at range.',
  },
  sniper: {
    name: 'Sniper', hp: 85, range: 249, dmg: 46, acc: 0.72,
    rof: 5.2, burst: 1, burstGap: 0, speed: 38,
    color: '#3f5730', gun: 12, sfx: 'sniper',
    desc: 'Springfield scoped rifle. Picks off officers, snipers, bazookas, and mortar teams first.',
  },
  medic: {
    name: 'Medic', hp: 90, range: 94, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, speed: 46,
    color: '#71905a', gun: 5, sfx: 'pistol',
    desc: 'Patches up the most wounded man in range, faster with rank. Carries no weapon.',
  },
  engineer: {
    name: 'Engineer', hp: 95, range: 74, dmg: 7, acc: 0.45,
    rof: 1.1, burst: 4, burstGap: 0.07, speed: 44,
    color: '#5d7a44', gun: 6, sfx: 'mg',
    desc: 'Repairs fortifications, upgrades emplacements, extends the build zone forward within his radius, and can wrench on damaged vehicles and AT guns (very slowly). M3 grease gun up close.',
  },
  officer: {
    name: 'Officer', hp: 95, range: 101, dmg: 9, acc: 0.5,
    rof: 0.9, burst: 1, burstGap: 0, speed: 44,
    color: '#80814a', gun: 5, sfx: 'pistol',
    desc: 'Nearby men fire faster and straighter, more so as he ranks up. Earns +1 TP / 30 s.',
  },
  flamer: {
    name: 'Flamethrower', hp: 130, range: 78, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, speed: 38,
    color: '#5a723c', gun: 8, sfx: 'rifle',
    flame: { range: 78, arc: 0.45, dps: 38 },
    blastResist: 0.5, rankHealMult: 3,
    desc: 'M2 flamethrower and flak vest. Burns everything in the cone — friend or foe.',
  },
  jeep: {
    name: 'Jeep', hp: 250, range: 221, dmg: 13, acc: 0.42,
    rof: 12.0, burst: 64, burstGap: 0.07, speed: 110,
    color: '#566f44', gun: 14, sfx: 'hmg', vehicle: true, rankMult: 3,
    desc: 'Willys jeep, pintle-mounted .50 cal. Fast and hard-hitting, but unarmored.',
  },
  sherman: {
    name: 'Sherman', hp: 1000, range: 262, dmg: 0, acc: 0,
    rof: 4.0, burst: 1, burstGap: 0, speed: 14, shellDmg: 80,
    color: '#566f44', gun: 0, sfx: 'boom', tank: true,
    fireCone: { arc: 0.275 },
    mg: { range: 161, dmg: 8, acc: 0.45, burst: 6, burstGap: 0.08, gun: 24, sfx: 'mg' },
    desc: 'M4 Sherman. 75mm cannon on a rotating turret and thick armor. Medics can\'t fix steel.',
  },
  atgun: {
    // trails are staked into the ground: it traverses inside its cone but never moves
    name: 'AT Gun', hp: 200, range: 519, dmg: 0, acc: 0,
    rof: 8.8, burst: 1, burstGap: 0, speed: 0,
    color: '#566f44', gun: 0, sfx: 'boom', fixed: true, gunEmplacement: true,
    atgun: { arc: 0.338, shellDmg: 403, r: 27, scatterMult: 0.950 },
    desc: '57mm anti-tank gun. Immobile; direct-fire AP shells ruin any vehicle they find.',
  },
  aagun: {
    // same staked trails as the 57mm, but the mount elevates: the barrels only
    // point up. Bombers and men under canopy are the whole target list — it
    // cannot depress onto anything standing on the ground.
    // tuned so one green gun downs about a bomber per raid and a veteran crew
    // breaks a raid outright. The narrow traverse wedge means it only gets a
    // handful of shots per pass, so the cyclic rate and burst weight — not the
    // aim — are what make it worth its cost; scatter stays deliberately wide.
    name: 'AA Gun', hp: 200, range: 623, dmg: 0, acc: 0,
    rof: 0.55, burst: 1, burstGap: 0, speed: 0,
    color: '#566f44', gun: 0, sfx: 'boom', fixed: true, gunEmplacement: true,
    aagun: {
      arc: 0.338,        // identical traverse wedge to the AT gun
      hitR: 23,          // flak burst lethal radius
      scatter: 15,       // base aim error, grows with range — only ~30% connect
      shellSpeed: 660,   // used to lead a moving bomber
      planeDmg: 64,
    },
    desc: '40mm Bofors. Immobile; elevated barrels engage aircraft and descending paratroopers only.',
  },
};

// Body/Flak Armor abilities: each grants a depleting armor bar worth a
// rifleman's HP (bullets chip Body Armor, explosions chip Flak Armor).
const ARMOR_POINTS = UNIT_TYPES.rifleman.hp;

// Endless only: enemy infantry increasingly turn up wearing body/flak armor as
// the waves climb. The chance ramps on a linear curve from ENEMY_ARMOR_MIN_CHANCE
// at wave 1 to a near-certainty by ENEMY_ARMOR_FULL_WAVE, so plated troops are
// already a real threat early and the norm well before a run gets deep. The
// plate itself also grows a little with the wave (heavier late-war kit).
// Body and flak armor are rolled INDEPENDENTLY, so a man can turn up with just
// body, just flak, both, or neither — but they share the same odds curve, so
// neither kind is rarer than the other.
const ENEMY_ARMOR_FULL_WAVE = 120;   // wave by which body/flak armor is near-guaranteed
const ENEMY_ARMOR_MIN_CHANCE = 0.05; // floor odds even at wave 1
const ENEMY_ARMOR_MAX_CHANCE = 0.98; // "nearing 100%", never a dead certainty
const ENEMY_ARMOR_BODY_MIN = 30, ENEMY_ARMOR_BODY_MAX = 75; // body plate points (lerp'd by wave)
const ENEMY_ARMOR_FLAK_MIN = 25, ENEMY_ARMOR_FLAK_MAX = 55; // flak plate points (lerp'd by wave)

// ---- German final boss (eboss, "Der Schlächter"). He cycles: advance down a
// lane firing six revolver shots, fall back to the backline, refit his plate
// and call in two reinforcement plays, then come again down a DIFFERENT lane.
// The rally point must sit ON-field (y > 0) — every US targeting scan skips
// staged enemies at y < 0 — and, more importantly, inside the reach of the
// player's indirect fire, because shelling the refit is the whole counterplay.
// It sat at 54 first, which LOOKED right and was useless: a mortar (range 348)
// placed anywhere sane is ~446px away from there, so nothing could touch him
// and the fight had no punish window at all. A mortar (range 348) staked at the
// back of the deploy zone sits at y~558, so the rally point has to be at least
// 210 for a shell to reach it — 200 was still 10px short and measured zero
// damage taken during rally. 220 gives margin: any mortar up to y=568 can
// range him, and he's still pulled 250px back off his engage line.
const BOSS_WAVE_INTERVAL = 100;      // arrives at wave 100, 200, 300...
const BOSS_REVOLVER_SHOTS = 6;       // cylinder capacity per advance
// Plate refilled at every backline rally. These have to stay BELOW what a line
// can put into him in one advance, or the refill silently makes him immortal:
// at 600/450 the armor ate every round the player landed and his HP never moved
// at all (measured: 244 damage in an hour against a 23-man line that could not
// die). A plated trooper carries 75/55, so 240/180 still reads as boss-grade
// kit while leaving real damage to spill through onto HP every cycle.
const BOSS_BODY_ARMOR = 240;
const BOSS_FLAK_ARMOR = 180;
const BOSS_LANES = [0.12, 0.31, 0.5, 0.69, 0.88];  // × W — advance corridors
const BOSS_ENGAGE_Y = H - 150;       // deepest he pushes hunting a target
const BOSS_SAFE_Y = H - 80;          // hard clamp — the boss can never breach
const BOSS_BACKLINE_Y = 220;         // rally point (see note above)
const BOSS_RETREAT_SPEED_MULT = 1.5; // he jogs back, doesn't stroll
const BOSS_RALLY_TIME = 3.5;         // seconds standing at the backline
const BOSS_LOITER_TIME = 4;          // shots left but no target: wait, then fall back

// ---- The Yamato (jyamato) — an Imperial LAND battleship, the Japanese wave-100
// boss. She drives across the field broadside-on, working two triple main
// batteries and four light MG mounts that each pick their own target.
//
// She is the first actor in this game that needs more than one hitbox, and the
// engine has no such concept: every actor is a bare (x,y) point, and the size
// ternaries scattered around input/inspector/mines are never read by the combat
// sim. So the ship is a PARENT actor plus eleven child part actors, all real
// entries in G.enemies, whose world positions are recomputed from the hull's
// x/y/heading every tick (syncYamatoParts). Parts are still points, so targeting,
// fireShot, explode splash, mouse-pick, focus-fire and the inspector all work on
// her unchanged — no hot loop in targeting.js is touched.
//
// The five belt sections are pure hitboxes: a hit on any of them redirects into
// the hull's single pool (see the top of damageEnemy). The turrets and gun tubs
// carry their own HP and can be silenced. That split is the whole fight.
const YAM_WAVE_INTERVAL = 100;       // arrives at wave 100, 200, 300... (mirrors the eboss)
const YAM_LEN = 300, YAM_HALF_BEAM = 23;
const YAM_SPR_W = 320, YAM_SPR_H = 104;   // hull bitmap footprint; makeSprite clips outside it
// Priced off a measurement, not an estimate, and originally anchored to Der
// Schlächter's then-9000 (he has since been cut to 3150; her number stands on the
// measurement below, not on his). The paper figure said a strong line puts
// ~206 dps into her; measured, it is ~65, because that estimate quietly assumed
// every weapon was in range and still alive. Most of a line's nominal damage is
// riflemen doing x0.04 to an armor belt, and the few heavy weapons that actually
// bite are also the ones her batteries hunt first. 30000 took 463s (a chore, not a
// set piece); 14000 still outlasted the line. 11000 is a little above the German
// boss because her turrets and tubs soak damage he doesn't have. (11000 with a
// 44-damage shell overshot the other way — she died in 70-110s losing every gun.)
const YAM_HULL_HP = 14000;
const YAM_TURRET_HP = 1400;          // per battery — killing one silences three guns
const YAM_MG_HP = 320;               // per mount; jymg is NOT `tank`, so rifles work on it
// Part offsets in the ship's own frame: sOff along the keel (bow positive),
// bOff abeam. Stored on the part instances so one loop places all eleven.
// No section at 0: the hull core actor already sits amidships and is a hitbox in
// its own right, so putting one there stacked two hitboxes on one point.
const YAM_BELT_S = [-124, -62, 62, 124];
const YAM_TURRET_S = [86, -86];      // forward and aft battery
const YAM_MG_S = [44, -44];
// This offset is a MECHANIC, not decoration. Every US scan picks by raw distance
// and nothing in the engine can express "deprioritise this actor", so whether
// riflemen shoot the gun crews or uselessly ping the ×0.04 armor belt is purely
// a function of this number. It has to exceed the 23px half-beam: for a defender
// 250px down-field of a ship steaming east the engaged tub sits 220 away against
// 250.6 for the nearest belt section — so the tub always wins, and the off-side
// tub (280) is never nearest. Drop it to 0 and small arms have nothing to shoot.
const YAM_MG_B = 30;                 // tubs read as sponsons overhanging the belt
const YAM_SPEED = 14;
const YAM_TURN_RATE = 0.25;          // rad/s — a 180° reversal takes ~12s: the punish window
// The band she patrols decides which of the player's weapons can reach her at
// all. From the deploy line (y~392) to a hull at 240 is 152px, so bazooka (243),
// Sherman (262) and mortarman (348) all engage. Lift the band above y~130 and
// bazookas fall out entirely, leaving an AT-gun-and-artillery-only problem.
const YAM_Y_MIN = 160, YAM_Y_MAX = 240;
// A bound on every PART, not on the hull centre — which is the distinction that
// matters, because a part sits up to 124px along the keel and swings 95px of that
// into y on a steep diagonal. Clamping the centre to 240 alone let her stern reach
// y=364, 124px deeper than intended. updateYamato subtracts the current y-reach
// from the centre clamp, so she can only push to YAM_Y_MAX while she's flat and
// has to pull back as she angles — DEPLOY_Y is 380, so the line is never in reach.
const YAM_SAFE_Y = 300;
const YAM_X_MARGIN = 140;            // hull-centre clamp; keeps every section on screen
// Steepest diagonal leg. Note this caps the leg's TARGET heading, not the heading
// she passes through: reversing 0 -> pi eases through pi/2, where she is bow-on,
// cos(heading) is ~0 and NEITHER broadside bears. That is correct and it is the
// punish window — but it does mean `playerSide` is degenerate for a moment mid-turn,
// so nothing may depend on it being stable within a leg.
const YAM_LEG_ANGLE = 0.6;           // rad — steepest diagonal leg
const YAM_LEG_MIN = 4, YAM_LEG_MAX = 9;    // seconds per leg
const YAM_SHELL_COUNT = 3, YAM_SHELL_GAP = 0.22;   // three guns ripple, not a single crack
// Her main batteries were the whole problem in playtest, twice. Measured against a
// 21-man line with two AT guns and a Sherman, with her escorts and the wave clock
// switched off so she was the ONLY thing on the field: at the first tuning
// (190 dmg / r58 / 7.5s) she wiped the line in 60s and took 3% damage; at the
// second (82 / r44 / 9s) she still wiped it in 120s and took 25%. A source
// breakdown settled where it was coming from — over 60s her shells did 3082
// damage to the player and her four gun tubs did 142. The salvo IS the fight, and
// the tubs and her suppression were never the problem.
//
// The shell budget is now ~32 dmg/s against ~152 at the first pass. She has to be
// a siege, not a lawnmower: a salvo should wound and scatter a line — leaving work
// for a medic — not delete it, because a line that dies in the first minute can
// never put the damage into her that the fight is priced around.
//
// Worth knowing while tuning these: cover does NOT answer her. coverBlock is only
// consulted in fireShot, so sandbags and bunkers do nothing against blast — the
// only mitigations her shelling has are men going prone (x0.5 in explode's
// hitArea), flak armor, and a medic. That makes shell output an unusually blunt
// dial: it moves the fight faster than any other number here, so change it in
// small steps and re-measure, and prefer moving her HP if you want a longer fight.
const YAM_SHELL_DMG = 75;
const YAM_SHELL_R = 44;
const YAM_SHELL_FLIGHT = 1.5, YAM_SHELL_SCATTER = 34;
const YAM_TURRET_ROF = 14, YAM_TURRET_TRACK = 0.22;
const YAM_TURRET_ARC = 1.35;         // traverse wedge off the beam — she can't fire through herself
const YAM_TURRET_FIRE_TOL = 0.14;    // laid on target within this and the battery speaks
const YAM_MG_ARC = 1.05;             // ~60° broadside cone per mount
// Landing parties come ashore in real strength — this multiplier is the fight's
// economy, since killing escorts is what funds the artillery that kills her.
const YAM_LAND_MULT = 24;
const YAM_LAND_CD_MIN = 22, YAM_LAND_CD_MAX = 32;
const YAM_LAND_POOL = ['jsmg', 'jsmg', 'jbanzai', 'jbanzai', 'jflame', 'joff'];
// Fast, because the fight has a tipping point: the moment the player strips her
// guns her output collapses and the rest is a grind against a helpless hull — at
// 26-38s she never got a battery back and died in 70-110s with the line barely
// scratched. Damage control has to contest the strip, so knocking a gun out buys
// a window rather than settling the matter.
const YAM_REPAIR_CD_MIN = 12, YAM_REPAIR_CD_MAX = 18;
const YAM_REPAIR_FRAC = 0.55;        // damage control brings a part back part-worn, not new

// ---- The Progenitor: the Horde's wave-100 boss ------------------------------
// A slab of fused flesh the size of a bunker, crawling down the field with five
// pus modules swollen out of its hide. It is the SECOND multi-actor boss and the
// second consumer of the parent+parts pattern the Yamato introduced: a core
// actor plus five child pod actors, all real entries in G.enemies, repositioned
// from the core every tick by syncProgenitorPods.
//
// The difference from the Yamato is the whole reason the tuning below looks
// nothing like hers, and it is the single easiest thing to get backwards:
// her armor belt is FIVE ACTORS SHARING ONE HP POOL, which is why explode()
// de-dupes it and flameSpray scales it to x0.06. Both of those fixes are about a
// SHARED POOL, not about parts. Every Progenitor pod owns its HP — like her
// turrets and gun tubs, which are deliberately NOT de-duped — so neither fix
// applies here and neither file needs a clause for this boss. A shell landing in
// the cluster legitimately hits the core once and each pod once, into six
// independent pools; that is the reward for shelling it. If the core turns out
// to melt too fast, move PROG_HP, never the flame multiplier — otherwise flamers
// become the anti-boss weapon by accident, which is the exact bug that line in
// shooting.js was written to fix.
const PROG_WAVE_INTERVAL = 100;
// Sits between Der Schlächter (3150 plus 240+180 of self-plated armor he refits
// on every rally) and the Yamato (14000, but behind tank scaling that puts small
// arms at x0.04 — so her real pool against a rifle line is enormous). The
// Progenitor is soft flesh: no armor roll, no tank flag, so a rifle line's
// NOMINAL dps is very close to its real dps here, and the raw number has to carry
// the whole fight on its own. Counting the five 260-HP sacs the player also has
// to chew through, its true pool is ~7300.
// MEASURED, as artillery strikes centred on a parked boss with no brood pressure:
//   Yamato   14000 HP, ~1097/strike (the x2.2 tank multiplier) -> 10 strikes
//   this at   6000 HP,   ~275/strike                           -> 21 strikes
//   this at   3500 HP                                          -> 10 strikes
// 6000 made a sack of flesh twice the artillery grind of an actual battleship on
// 43% of her HP. 3500 puts it level with her and just above Der Schlächter's
// 3150 — and its TRUE pool is 4800, since the player also has to chew through
// five 260-HP sacs to shut the bile off.
// If the fight needs moving again, move THIS. See the flame note above for the
// one knob not to reach for instead.
const PROG_HP = 3500;
const PROG_SEGMENTS = 3;             // ONE pool, drawn as three bars (see drawProgenitorOverlays)
// Requirement, not flavour: the player must always be able to walk away from it.
// Rifleman 42, medic 46, Sherman 14, the Abomination 9 — at 7 it is the slowest
// thing on the field and repositioning is always an answer to it.
const PROG_SPEED = 7;
const PROG_SAFE_Y = H - 80;          // hard clamp, mirrors BOSS_SAFE_Y: it can never breach
// NOTE: it deliberately carries NO blastResist. A 0.25 was tried and removed: the
// brood screens the mass so completely that small arms almost never reach it (a
// 20-man line fired for 55s and took it to 97.5%), which makes explosives the one
// counter that lands — and the Yamato, actual naval armor, gets a x2.2 blast
// MULTIPLIER from the tank branch in explode(). Taxing blast on a sack of soft
// flesh was both backwards thematically and a tax on the only workable answer.

// The maw. Contact is not a bite, it is a swallow: PROG_DEVOUR_DMG goes through
// damageUnit (the route purgeRadius already takes) rather than setting u.dead, so
// card beforeDeath hooks, the recap, the selection splice, the corpse and the
// infected short-circuit all still run. It heals the boss NOTHING — its HP is the
// fight's clock and a swallow must not rewind it.
const PROG_DEVOUR_REACH = 22;
const PROG_DEVOUR_CD = 1.5;
const PROG_DEVOUR_DMG = 99999;

// Pus modules. PROG_POD_R is a MECHANIC, not decoration, for exactly the reason
// YAM_MG_B is: every US target scan picks by RAW DISTANCE and nothing in the
// engine can express "deprioritise this actor". The pods are fanned across the
// DOWN-FIELD semicircle in world space (every angle has sin > 0) and deliberately
// NOT rotated with the core's facing, so the two or three nearest a defender are
// always closer than the core itself and small arms strip the pods before they
// ever touch the mass. Set this to 0 and rifles shoot the core instead, and the
// modules become undamageable decoration.
const PROG_POD_HP = 260;
// 34, not 26: the sacs are ~7.5px across and five of them across a 130° arc are
// exactly touching at 26, which reads as a bunch of grapes rather than five
// modules grown out of the hide. 34 also puts them clear of the 26px body edge
// and a little nearer the player, which only sharpens the targeting behaviour
// this offset exists for.
const PROG_POD_R = 34;
const PROG_POD_ANGLES = [0.14, 0.32, 0.5, 0.68, 0.86].map(a => a * Math.PI);
// Same shape as the Spitter's `spit` spec, field for field and on purpose:
// fireBile/bileBurst read it unchanged, so a pod is a Spitter that can't walk.
const PROG_POD_SPIT = { range: 260, min: 0, cdMin: 4.0, cdMax: 6.5, r: 34,
                        dmg: 24, flight: 1.3, scatter: 30, infect: 0.45 };

// The birthing cycle: the mass splits open and vomits a brood. specialWaveMult
// keeps it scaling on return visits, and the clamp is the design brief — never
// fewer than 5, never more than 20, however deep the run is.
const PROG_SPAWN_CD_MIN = 9, PROG_SPAWN_CD_MAX = 11;
const PROG_SPAWN_MIN = 5, PROG_SPAWN_MAX = 20;
const PROG_SPAWN_POOL = ['zshambler', 'zshambler', 'zrunner', 'zcrawler', 'zhound'];

// Resurrection, fired when a health SEGMENT empties (at 2/3 and 1/3). Every
// corpse inside the radius stands up — the horde's own dead AND the player's
// fallen men alike, sorted by reanimateAsUndead's light/heavy rule. The cap is a
// frame-rate and a fairness bound: a long grind can leave 100+ bodies lying on
// the line, and raising all of them at once is neither survivable nor smooth.
const PROG_RAISE_R = 200;
const PROG_RAISE_CAP = 40;

// both staked guns share a traverse cone, a crew that never goes prone, and
// the engineer-repairs-but-medics-don't rule; this returns whichever spec a
// given emplacement carries
function emplacementSpec(t) {
  return t.atgun || t.aagun;
}

// TP paid to an Axis attacker for destroying each US defender (mirrors ENEMY_TYPES.reward)
{
  const UNIT_REWARDS = {
    rifleman: 2, gunner: 3, grenadier: 3, shotgunner: 3, bazooka: 4,
    mortarman: 5, sniper: 4, medic: 4, engineer: 4, officer: 5,
    flamer: 4, jeep: 6, sherman: 15, atgun: 8, aagun: 8,
  };
  for (const [k, r] of Object.entries(UNIT_REWARDS)) UNIT_TYPES[k].reward = r;
}

const ENEMY_TYPES = {
  // German roster buffed for post-card difficulty. Rule held throughout:
  // range and speed never exceed the allied counterpart (see comments);
  // HP, damage, accuracy and rate of fire are the buffable stats.
  erifle: {
    // counterpart: rifleman (range 154, speed 42)
    name: 'Rifleman', hp: 75, speed: 22, range: 141, dmg: 12, acc: 0.46,
    rof: 1.35, burst: 1, burstGap: 0, reward: 2,
    color: '#5f6470', gun: 7, sfx: 'rifle', priority: 1,
  },
  esmg: {
    // counterpart: gunner (range 179, speed 36)
    name: 'Stormtrooper', hp: 85, speed: 36, range: 87, dmg: 9, acc: 0.46,
    rof: 0.9, burst: 3, burstGap: 0.08, reward: 2,
    color: '#4b515c', gun: 6, sfx: 'mg', priority: 1,
  },
  egren: {
    // counterpart: grenadier (range 231, speed 42)
    name: 'Grenadier', hp: 85, speed: 27, range: 101, dmg: 10, acc: 0.42,
    rof: 1.45, burst: 1, burstGap: 0, reward: 3,
    color: '#555c68', gun: 5, sfx: 'pistol', priority: 2, grenade: true,
  },
  emg: {
    // counterpart: gunner (range 179, speed 36) — range capped to 179
    // long belt-fed bursts: fires ~3x as long as a rifle-calibre burst but at
    // half the cyclic rate, and gets back on the gun in half the time
    name: 'MG Gunner', hp: 110, speed: 16, range: 179, dmg: 10, acc: 0.37,
    rof: 0.85, burst: 8, burstGap: 0.16, reward: 3, sup: true,
    color: '#4d545f', gun: 10, sfx: 'mg', priority: 3,
  },
  eoff: {
    // counterpart: officer (range 101, speed 44)
    name: 'Officer', hp: 95, speed: 24, range: 94, dmg: 9, acc: 0.48,
    rof: 0.92, burst: 1, burstGap: 0, reward: 4,
    color: '#4f5661', gun: 5, sfx: 'pistol', priority: 5, aura: true,
  },
  esniper: {
    // counterpart: sniper (range 249, speed 38)
    name: 'Sniper', hp: 70, speed: 14, range: 209, dmg: 44, acc: 0.70,
    rof: 6.0, burst: 1, burstGap: 0, reward: 4,
    color: '#4a515c', gun: 12, sfx: 'sniper', priority: 4,
  },
  eflame: {
    // counterpart: flamer (flame range 78, speed 38) — flame range capped to 78
    name: 'Flamethrower', hp: 105, speed: 34, range: 78, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 4,
    color: '#4d5560', gun: 8, sfx: 'rifle', priority: 3,
    flame: { range: 78, arc: 0.45, dps: 40 },
    blastResist: 0.5,
  },
  emortar: {
    // counterpart: mortarman (mortar range 348, speed 38) — range held equal
    name: 'Granatwerfer', hp: 90, speed: 18, range: 80, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, reward: 5,
    color: '#545b66', gun: 5, sfx: 'pistol', priority: 4,
    mortar: { range: 348, min: 118, cdMin: 9, cdMax: 12, r: 40, dmg: 82, flight: 1.6, scatter: 52 },
  },
  ebazooka: {
    // counterpart: bazooka (rocket range 243, speed 40)
    name: 'Panzerfaust', hp: 90, speed: 20, range: 80, dmg: 8, acc: 0.45,
    rof: 1.0, burst: 1, burstGap: 0, reward: 5,
    color: '#585f6a', gun: 5, sfx: 'pistol', priority: 4,
    rocket: { range: 206, cdMin: 7.4, cdMax: 10.1, r: 30, dmg: 120, speed: 380, armorMult: 2.75 },
  },
  ebike: {
    // counterpart: jeep (speed 110) — melee breach unit, HP only
    name: 'Kradschützen', hp: 95, speed: 85, range: 0, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 5,
    color: '#596069', gun: 0, sfx: 'rifle', priority: 2, bike: true,
  },
  ejeep: {
    // counterpart: jeep (range 201, speed 110)
    name: 'Kübelwagen', hp: 250, speed: 45, range: 188, dmg: 13, acc: 0.42,
    rof: 2.2, burst: 8, burstGap: 0.07, reward: 8,
    color: '#585f69', gun: 14, sfx: 'hmg', priority: 3, vehicle: true,
  },
  ehalftrack: {
    // no allied counterpart (APC) — range/speed left as authored
    name: 'Sd.Kfz. 251', hp: 1150, speed: 30, range: 161, dmg: 9, acc: 0.42,
    rof: 2.2, burst: 6, burstGap: 0.08, reward: 12,
    color: '#565d67', gun: 16, sfx: 'mg', priority: 3, vehicle: true, apc: true,
  },
  panzer: {
    // counterpart: sherman (range 262, speed 14)
    name: 'Panzer IV', hp: 1400, speed: 8, range: 228, dmg: 0, acc: 0,
    rof: 4.2, burst: 1, burstGap: 0, reward: 15, shellDmg: 95,
    color: '#586069', gun: 0, sfx: 'boom', priority: 0, tank: true,
    fireCone: { arc: 0.25 },
    mg: { range: 154, dmg: 8, acc: 0.4, burst: 6, burstGap: 0.08, gun: 24, sfx: 'mg' },
  },
  estug: {
    // counterpart: sherman (range 262, speed 14)
    name: 'StuG III', hp: 950, speed: 12, range: 201, dmg: 0, acc: 0,
    rof: 3.6, burst: 1, burstGap: 0, reward: 12, shellDmg: 105,
    color: '#4e555f', gun: 0, sfx: 'boom', priority: 0, tank: true, casemate: true,
    fireCone: { arc: 0.2 },
    mg: { range: 134, dmg: 6, acc: 0.38, burst: 4, burstGap: 0.08, gun: 20, sfx: 'mg' },
  },
  etiger: {
    // counterpart: sherman (range 262, speed 14)
    name: 'Tiger I', hp: 2050, speed: 5, range: 241, dmg: 0, acc: 0,
    rof: 4.9, burst: 1, burstGap: 0, reward: 22, shellDmg: 120,
    color: '#44454f', gun: 0, sfx: 'boom', priority: 0, tank: true, heavy: true,
    fireCone: { arc: 0.22 },
    mg: { range: 161, dmg: 8, acc: 0.42, burst: 6, burstGap: 0.08, gun: 26, sfx: 'mg' },
  },
  // A20 "V2" battery — a rear-echelon siege weapon, not a soldier. It stakes
  // itself out near the top of the field the instant it spawns and mostly
  // holds position, but pushes forward on the same discipline-break urge as
  // any German infantry; the counter is to reach out and kill it (AT gun,
  // artillery, a bazooka that gets lucky) before its next launch window
  // comes up.
  ev2: {
    name: 'V2 Rocket Battery', hp: 536, speed: 18, range: 0, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 60,
    color: '#474e58', gun: 0, sfx: 'boom', priority: 5, fixed: true,
    // r halved from its original 130 — still levels anything close, but no
    // longer wipes out a whole line at once. dmg is 95% of a rifleman's 100
    // hp, so a near-direct hit maims rather than instantly kills, and
    // armorMult makes it brutal against anything on wheels or tracks.
    v2: { range: W * 0.625, min: 168, cdMin: 21, cdMax: 30, r: 65, dmg: 95, flight: 3.4, scatter: 70, armorMult: 6 },
  },
  // "Der Schlächter" — the German final boss (see the BOSS_ block above for the
  // cycle tuning). The range/speed-never-exceeds-the-counterpart rule is waived:
  // he has no counterpart, and he's the exception the rule exists for.
  // 3150 HP — ~2.2x a Panzer IV, a few advances against a good line. (Was 9000,
  // cut 65%: a dozen advances read as a slog, not a set piece.)
  // noRamp keeps enemyHpRamp from tripling it on hard. fireShot rolls dmg
  // 0.75-1.25, so 190 one-shots any infantryman on the roster;
  // revolver.armorDmg replaces the smallarms 0.04 tank scaling with a flat 490
  // (49% of a Sherman's 1000) per round on anything armored.
  eboss: {
    name: 'Der Schlächter', hp: 3150, speed: 30, range: 120, dmg: 190, acc: 0.85,
    rof: 1.6, burst: 1, burstGap: 0, reward: 200,
    // gun 14: long enough that the barrel clears his greatcoat at the 1.35x
    // sprite scale — at 10 the revolver drew entirely under the coat ellipse
    color: '#3a3b45', gun: 14, sfx: 'sniper', priority: 5,
    germanBoss: true, boss: true, noRamp: true,
    revolver: { armorDmg: 490 },
  },
};

// ---- Imperial Japanese Army roster: the alternate endless-mode foe. Every
// type carries faction:'jp', which routes it through makeEnemy's nation pick,
// the Japanese soldier renderer, and the fanatic no-prone rule (they never hit
// the dirt under fire — they close the distance instead). Two behaviours are
// unique to this faction: the banzai charger (melee shock trooper, no gun) and
// the lunge-mine man (a suicide anti-tank charge).
Object.assign(ENEMY_TYPES, {
  jrifle: {
    // counterpart: rifleman (range 154, speed 42). Type 38 Arisaka + long bayonet.
    name: 'Arisaka Rifleman', hp: 72, speed: 26, range: 138, dmg: 12, acc: 0.45,
    rof: 1.4, burst: 1, burstGap: 0, reward: 2,
    color: '#6b6a3c', gun: 9, sfx: 'rifle', priority: 1, faction: 'jp',
  },
  jbanzai: {
    // NO allied counterpart — a melee shock trooper. Sprints straight at the
    // nearest defender and cuts him down with the bayonet. No ranged attack;
    // `dmg` is the slash. Fast and fragile — they come in numbers.
    name: 'Banzai Charger', hp: 62, speed: 54, range: 0, dmg: 26, acc: 0,
    rof: 1.0, burst: 1, burstGap: 0, reward: 2,
    color: '#77712f', gun: 11, sfx: 'rifle', priority: 1, faction: 'jp',
    banzai: true,
  },
  jsmg: {
    // counterpart: gunner (range 179, speed 36) — Special Naval Landing Force
    // trooper with a Type 100 SMG. Fast close-assault, deadly in short bursts.
    name: 'SNLF Trooper', hp: 84, speed: 38, range: 90, dmg: 9, acc: 0.44,
    rof: 0.9, burst: 3, burstGap: 0.08, reward: 2,
    color: '#4f5a34', gun: 6, sfx: 'mg', priority: 1, faction: 'jp',
  },
  jgren: {
    // counterpart: grenadier (range 231, speed 42) — carries Type 97 frags.
    name: 'Grenadier', hp: 85, speed: 25, range: 101, dmg: 10, acc: 0.42,
    rof: 1.45, burst: 1, burstGap: 0, reward: 3,
    color: '#6a683a', gun: 8, sfx: 'rifle', priority: 2, faction: 'jp', grenade: true,
  },
  jlmg: {
    // counterpart: gunner (range 179, speed 36) — Type 99 light machine gun.
    name: 'Nambu Gunner', hp: 105, speed: 15, range: 172, dmg: 10, acc: 0.36,
    rof: 0.85, burst: 8, burstGap: 0.16, reward: 3, sup: true,
    color: '#5f5f34', gun: 10, sfx: 'mg', priority: 3, faction: 'jp',
  },
  jhmg: {
    // counterpart: gunner (range 179, speed 36) — Type 92 "Woodpecker" HMG on a
    // tripod. Slow to reposition and long-legged; pins a line with heavy fire.
    name: 'Type 92 HMG', hp: 122, speed: 11, range: 178, dmg: 11, acc: 0.38,
    rof: 0.95, burst: 8, burstGap: 0.18, reward: 4, sup: true,
    color: '#5c5c33', gun: 11, sfx: 'mg', priority: 3, faction: 'jp',
  },
  jsniper: {
    // counterpart: sniper (range 249, speed 38) — Type 97 in the treeline.
    name: 'Nest Sniper', hp: 68, speed: 13, range: 205, dmg: 44, acc: 0.70,
    rof: 6.0, burst: 1, burstGap: 0, reward: 4,
    color: '#565a30', gun: 12, sfx: 'sniper', priority: 4, faction: 'jp',
  },
  jknee: {
    // Type 89 grenade discharger. Deliberately short-legged: its lob range is
    // 20% under the Nest Sniper's reach (205 -> 164), so a sniper outranges it —
    // but it fires far more often than a Granatwerfer to make up for it.
    name: 'Knee Mortar', hp: 82, speed: 18, range: 78, dmg: 7, acc: 0.42,
    rof: 1.1, burst: 1, burstGap: 0, reward: 4,
    color: '#63633a', gun: 5, sfx: 'pistol', priority: 4, faction: 'jp',
    mortar: { range: 164, min: 70, cdMin: 5, cdMax: 7, r: 30, dmg: 55, flight: 1.3, scatter: 46 },
  },
  jmortar: {
    // counterpart: mortarman (mortar range 348) — a real Type 97 81mm mortar
    // team. Far longer reach and a heavier shell than the knee mortar, but slow
    // to fire; blind up close.
    name: 'Mortar Team', hp: 90, speed: 16, range: 78, dmg: 7, acc: 0.44,
    rof: 1.0, burst: 1, burstGap: 0, reward: 5,
    color: '#5f6036', gun: 5, sfx: 'pistol', priority: 4, faction: 'jp',
    mortar: { range: 330, min: 120, cdMin: 9, cdMax: 12, r: 40, dmg: 80, flight: 1.6, scatter: 52 },
  },
  jlunge: {
    // NO allied counterpart — a suicide anti-tank charge (Type 99 lunge mine).
    // Runs down the nearest vehicle, emplacement, or (failing that) defender
    // and rams the pole charge home, detonating on contact. One-shot: it never
    // fires and never survives its own attack, so it pays no reward.
    name: 'Lunge Mine', hp: 84, speed: 46, range: 0, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 5,
    color: '#6e6a34', gun: 13, sfx: 'rifle', priority: 4, faction: 'jp',
    lunge: { r: 42, dmg: 130, armorMult: 6 },
  },
  joff: {
    // counterpart: officer (range 101, speed 44) — shin gunto sabre. His aura
    // stiffens nearby troops, and on a cooldown he screams the banzai order,
    // surging every Japanese soldier around him into a headlong charge.
    name: 'Officer', hp: 92, speed: 24, range: 92, dmg: 10, acc: 0.5,
    rof: 0.9, burst: 1, burstGap: 0, reward: 5,
    color: '#7a763f', gun: 9, sfx: 'pistol', priority: 5, faction: 'jp',
    aura: true, banzaiCmd: true,
  },
  jflame: {
    // counterpart: flamer (flame range 78, speed 38) — Type 100 flamethrower.
    name: 'Flamethrower', hp: 100, speed: 33, range: 76, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 4,
    color: '#66642f', gun: 8, sfx: 'rifle', priority: 3, faction: 'jp',
    flame: { range: 76, arc: 0.45, dps: 40 }, blastResist: 0.5,
  },
  jhago: {
    // counterpart: sherman (range 262, speed 14) — Type 95 Ha-Go light tank.
    // Thin armor and a small 37mm gun, but fast and it turns up early.
    name: 'Ha-Go', hp: 520, speed: 18, range: 175, dmg: 0, acc: 0,
    rof: 3.8, burst: 1, burstGap: 0, reward: 10, shellDmg: 58,
    color: '#6a6a3e', gun: 0, sfx: 'boom', priority: 0, tank: true, light: true, faction: 'jp',
    fireCone: { arc: 0.28 },
    mg: { range: 138, dmg: 6, acc: 0.4, burst: 5, burstGap: 0.08, gun: 20, sfx: 'mg' },
  },
  jtank: {
    // counterpart: sherman (range 262, speed 14) — Type 97 Chi-Ha. Lighter and
    // quicker than a Panzer IV, with a stubbier 57mm gun.
    name: 'Chi-Ha', hp: 900, speed: 12, range: 205, dmg: 0, acc: 0,
    rof: 4.4, burst: 1, burstGap: 0, reward: 14, shellDmg: 82,
    color: '#6d6a3c', gun: 0, sfx: 'boom', priority: 0, tank: true, faction: 'jp',
    fireCone: { arc: 0.25 },
    mg: { range: 150, dmg: 7, acc: 0.4, burst: 5, burstGap: 0.08, gun: 22, sfx: 'mg' },
  },
  jchinu: {
    // counterpart: sherman (range 262, speed 14) — Type 3 Chi-Nu. The heaviest
    // thing Japan fielded: a 75mm gun and real armor, but slow and it only
    // shows up late.
    name: 'Chi-Nu', hp: 1250, speed: 10, range: 220, dmg: 0, acc: 0,
    rof: 4.6, burst: 1, burstGap: 0, reward: 18, shellDmg: 100,
    color: '#63612f', gun: 0, sfx: 'boom', priority: 0, tank: true, faction: 'jp',
    fireCone: { arc: 0.24 },
    mg: { range: 155, dmg: 8, acc: 0.42, burst: 6, burstGap: 0.08, gun: 24, sfx: 'mg' },
  },
});

// +20% HP across the Japanese infantry — every foot soldier, tanks excluded —
// so they hold up a little longer under fire while they close the distance.
for (const t of Object.values(ENEMY_TYPES)) {
  if (t.faction === 'jp' && !t.tank) t.hp = Math.round(t.hp * 1.2);
}

// ---- The Yamato and her parts. Declared AFTER the +20% pass above on purpose:
// jymg is Japanese and isn't `tank`, so that loop would silently inflate it and
// the numbers in the YAM_ block would stop being the numbers in play.
//
// Every one of these carries noRamp — makeEnemy multiplies t.hp by enemyHpRamp(),
// capped at 3x, so at wave 100 on hard the hull would quietly become 90000.
// `fixed` goes on the PARTS only: it's already the prone/suppression exemption,
// and it keeps them out of isJapaneseInfantry so an escorting officer can't hand
// a banzai charge order to a gun tub. The hull deliberately omits it so the
// inspector doesn't print IMMOBILE over a ship that is visibly driving.
Object.assign(ENEMY_TYPES, {
  jyamato: {
    name: 'Yamato', hp: YAM_HULL_HP, speed: YAM_SPEED, range: 0, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 400,
    color: '#5d5f52', gun: 0, sfx: 'boom', priority: 5,
    // tank: small arms ping off at x0.04 and HE bites at x2.2 — the counter-play
    // is artillery, AT guns and bazookas, which is right for an armor belt
    tank: true, heavy: true, boss: true, japBoss: true, ship: true,
    noRamp: true, faction: 'jp',
  },
  jyhull: {
    // an armor-belt section: a hitbox, not a target. damageEnemy redirects
    // everything that lands here into the hull's own pool, so its hp is only ever
    // a mirror of the ship's (kept in sync by syncYamatoParts for the readouts).
    name: 'Yamato — Armor Belt', hp: YAM_HULL_HP, speed: 0, range: 0, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 0,
    color: '#5d5f52', gun: 0, sfx: 'boom', priority: 0,
    tank: true, heavy: true, shipPart: true, hullSection: true,
    fixed: true, noRamp: true, faction: 'jp',
  },
  jyturret: {
    // a triple 18.1" battery. Picks its own target and lays its own bearing;
    // killing it silences three guns until damage control gets to it.
    // range 330, not the 470 a real main battery would suggest: at 470 she shelled
    // the entire field from her patrol band while the player's AT guns and mortars
    // were the only things that could answer, so the counter-play was "own the
    // right two units or lose". 330 still covers the deploy line from her band and
    // still out-ranges a bazooka — but she has to be closed with.
    name: 'Yamato — Main Battery', hp: YAM_TURRET_HP, speed: 0, range: 330, dmg: 0, acc: 0,
    rof: YAM_TURRET_ROF, burst: 1, burstGap: 0, reward: 60, shellDmg: YAM_SHELL_DMG,
    color: '#63655a', gun: 0, sfx: 'boom', priority: 5,
    tank: true, shipPart: true, shipTurret: true, fixed: true, noRamp: true, faction: 'jp',
  },
  jymg: {
    // an open 25mm tub on a sponson. NOT `tank` — this is the one part of the
    // ship a rifleman can hurt, and sniperTarget skips t.tank outright, so the
    // high priority here quietly gets snipers picking off the gun crews.
    // Stats live on the type (not in an mg:{} spec) so runWeapon can drive it,
    // which is what buys bursts AND suppressArea pinning.
    // range 247: reaches ~90px past the deploy line from the near edge of her
    // patrol band, so the tubs engage a line standing where a line normally stands
    // instead of only punishing men who push up
    name: 'Yamato — Gun Tub', hp: YAM_MG_HP, speed: 0, range: 247, dmg: 9, acc: 0.42,
    rof: 0.95, burst: 7, burstGap: 0.09, reward: 14,
    color: '#6b6a3c', gun: 9, sfx: 'mg', priority: 4, sup: true,
    shipPart: true, shipMg: true, fixed: true, noRamp: true, faction: 'jp',
  },
});

// ---- The Horde roster: the fourth alternate endless-mode foe, and the only one
// that isn't a national army. Every type carries faction:'zo', routing it through
// makeEnemy's nation pick and the zombie renderer (js/render-zombie.js). The whole
// faction is built around ONE signature mechanic that no army has: the BITE. Most
// of the roster is melee (`zombie:true`), and a bite doesn't just wound — it may
// INFECT the defender (`infect`, a per-bite probability). An infected man rots on
// a timer and, if he isn't cured by a medic first, dies and RISES as a zombie that
// turns on your own line (see infection handling in js/damage.js / update-*.js).
// So the horde grows itself out of your casualties. There is no armor and almost
// no ranged fire; the threat is numbers, speed, and attrition that recruits.
Object.assign(ENEMY_TYPES, {
  zshambler: {
    // the backbone: a slow, relentless walking corpse. Cheap, numerous, and the
    // default thing a bitten defender reanimates into. No gun — it claws and bites.
    name: 'Shambler', hp: 74, speed: 15, range: 0, dmg: 16, acc: 0,
    rof: 1.1, burst: 1, burstGap: 0, reward: 2,
    color: '#5f6b4a', gun: 4, sfx: 'scream', priority: 1, faction: 'zo',
    zombie: true, infect: 0.28,
  },
  zrunner: {
    // a fresh kill, still fast on its feet — sprints the field and lunges at the
    // nearest man. Low HP, but it closes before you can thin the pack. What a
    // fast/light defender reanimates into.
    name: 'Runner', hp: 54, speed: 52, range: 0, dmg: 13, acc: 0,
    rof: 1.0, burst: 1, burstGap: 0, reward: 2,
    color: '#6b7048', gun: 4, sfx: 'scream', priority: 1, faction: 'zo',
    zombie: true, infect: 0.22,
  },
  zcrawler: {
    // torn in half and dragging itself along low to the ground — small, quick, and
    // it comes in swarms. Weak bite, but there are always more of them.
    name: 'Crawler', hp: 32, speed: 38, range: 0, dmg: 9, acc: 0,
    rof: 0.9, burst: 1, burstGap: 0, reward: 1,
    color: '#596341', gun: 3, sfx: 'scream', priority: 1, faction: 'zo',
    zombie: true, infect: 0.16, crawler: true,
  },
  zhound: {
    // an infected war dog — blazing fast, almost no mass, and a savage bite that
    // takes hold easily. Shoot the pack before it reaches the wire.
    name: 'Infected Hound', hp: 30, speed: 72, range: 0, dmg: 12, acc: 0,
    rof: 0.85, burst: 1, burstGap: 0, reward: 2,
    color: '#5a5238', gun: 0, sfx: 'scream', priority: 1, faction: 'zo',
    zombie: true, infect: 0.30, hound: true,
  },
  zbrute: {
    // a swollen, muscle-bound corpse: high HP, slow, and it hits like a truck.
    // A heavy bite with a high chance to infect — and it soaks a lot of lead.
    name: 'Brute', hp: 300, speed: 12, range: 0, dmg: 40, acc: 0,
    rof: 1.5, burst: 1, burstGap: 0, reward: 8,
    color: '#556040', gun: 6, sfx: 'scream', priority: 3, faction: 'zo',
    zombie: true, infect: 0.35, big: true,
  },
  zspitter: {
    // the faction's only real ranged threat: it hangs back and lobs a glob of
    // corrosive bile that bursts on impact, burning everyone nearby AND carrying
    // the infection through the splash. Blind up close — it shambles if you get in.
    name: 'Spitter', hp: 88, speed: 18, range: 0, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 5,
    color: '#6e7a3e', gun: 4, sfx: 'scream', priority: 4, faction: 'zo',
    zombie: true, infect: 0.18,
    spit: { range: 230, min: 70, cdMin: 3.5, cdMax: 5.5, r: 34, dmg: 26, flight: 1.2, scatter: 26, infect: 0.5 },
  },
  zbloater: {
    // a gas-swollen corpse that bursts when it dies (or reaches you), venting a
    // cloud of infectious rot: area damage plus a high infect chance to everyone
    // caught in it. A walking mine — kill it at a distance or share the cloud.
    name: 'Bloater', hp: 130, speed: 13, range: 0, dmg: 10, acc: 0,
    rof: 1.4, burst: 1, burstGap: 0, reward: 5,
    color: '#6a7a4e', gun: 4, sfx: 'scream', priority: 3, faction: 'zo',
    zombie: true, infect: 0.2, bloat: { r: 56, dmg: 34, infect: 0.55 },
  },
  zscreamer: {
    // the horde's "officer": a shrieking corpse whose presence enrages the dead
    // around it (aura → they move faster) and who, on a cadence, looses a scream
    // that hurls every nearby zombie into a frenzied sprint. Kill it to slow the
    // whole pack. It bites too, but its danger is what it does to the others.
    name: 'Screamer', hp: 96, speed: 20, range: 0, dmg: 10, acc: 0,
    rof: 1.2, burst: 1, burstGap: 0, reward: 6,
    color: '#79764a', gun: 4, sfx: 'scream', priority: 5, faction: 'zo',
    zombie: true, infect: 0.2, aura: true, frenzyCmd: true,
  },
  zrevenant: {
    // a reanimated Wehrmacht soldier that never let go of his Kar98 — the horde's
    // one gunman. Undead hands aim poorly and it fires slowly, but a shambling
    // corpse that still shoots back is a nasty surprise in a melee faction.
    name: 'Revenant', hp: 82, speed: 22, range: 148, dmg: 9, acc: 0.30,
    rof: 1.9, burst: 1, burstGap: 0, reward: 3,
    color: '#5c6242', gun: 9, sfx: 'rifle', priority: 2, faction: 'zo',
  },
  zabom: {
    // the Abomination: a towering mound of fused corpses, the horde's boss-tier
    // threat that stands in for armor. Enormous HP, ground-shaking slow, and a
    // sweeping blow that flattens men and smashes emplacements — and near-certain
    // infection on anyone it doesn't kill outright. Shows up only when it's already
    // desperate. Small arms just annoy it; burn it, shell it, or mine it.
    name: 'Abomination', hp: 920, speed: 9, range: 0, dmg: 70, acc: 0,
    rof: 1.7, burst: 1, burstGap: 0, reward: 16,
    color: '#4f5a3a', gun: 8, sfx: 'scream', priority: 4, faction: 'zo',
    zombie: true, infect: 0.5, boss: true,
  },
  zprogen: {
    // The Progenitor: the horde's wave-100 boss and the thing every other corpse
    // on the field came out of. A crawling mass that swallows men whole, births a
    // brood every ten seconds, and calls the dead back up each time a third of it
    // dies. Tuning lives in the PROG_ block above; AI in js/update-enemies.js.
    //
    // hordeBoss is the "killing this ends the fight" flag (mirror of germanBoss /
    // japBoss); boss:true separately buys the prone/suppression/armor-roll
    // exemptions every boss gets. NO zombie flag — that would route it to
    // updateZombie before the dispatch ever reached updateProgenitor.
    // `dmg` is the MAUL, not the swallow: men are devoured outright (no damage
    // number involved), but armor and emplacements aren't food, so they get
    // zombieBite'd with this instead. 0 here would make that branch a no-op.
    name: 'The Progenitor', hp: PROG_HP, speed: PROG_SPEED, range: 0,
    dmg: 90, acc: 0, rof: PROG_DEVOUR_CD, burst: 1, burstGap: 0, reward: 300,
    color: '#4a5834', gun: 0, sfx: 'scream', priority: 5,
    hordeBoss: true, boss: true, noRamp: true, faction: 'zo',
  },
  zpod: {
    // A pus module: one of the five swollen sacs ringing the Progenitor. Its own
    // HP pool, so shooting it off permanently cuts the boss's ranged output.
    //
    // bossPart is the child-actor flag (the equivalent of shipPart, kept separate
    // so the Yamato's nine touchpoints keep meaning what their comments say).
    // `fixed` earns the prone exemption and keeps pods out of isZombie, so a
    // Screamer's frenzy can't rouse a sac — the same reason jymg carries it. No
    // zombie flag: it would route them to updateZombie and it is what the +15%
    // melee-horde HP pass below keys on.
    name: 'Pus Module', hp: PROG_POD_HP, speed: 0, range: 0, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 12,
    color: '#7d8a44', gun: 0, sfx: 'scream', priority: 4,
    bossPart: true, fixed: true, noRamp: true, faction: 'zo',
    spit: PROG_POD_SPIT,
  },
});

// The dead don't tire: a flat HP bump across the melee horde (gunmen excluded) so
// they soak a little more fire while they close the distance. Mirrors the +20% the
// Japanese infantry get, but applied by the `zombie` flag instead of by faction so
// the ranged Revenant stays brittle.
for (const t of Object.values(ENEMY_TYPES)) {
  if (t.zombie && !t.big && !t.boss) t.hp = Math.round(t.hp * 1.15);
}

// ---- Regio Esercito field works -------------------------------------------
// The Italians build the same three fortifications the player can, but they live
// in their OWN array (G.itWorks) instead of G.sandbags/G.bunkers/G.watchtowers.
// That separation is the whole design: every player-side consumer of those arrays
// walks the array with no notion of a side — updateEngineer's repair and fortify
// passes, watchtowerRangeMult, engineerRepairCount, the Blast Shelter card — so
// sharing them would quietly have a US engineer hardening an Italian bunker, or
// an enemy watch tower extending your riflemen's range. A separate array can't
// leak: forgetting a site means the works don't participate in something, never
// that the player buffs the enemy.
//
// One array with a `kind` tag rather than three, because works need whole-
// collection passes (draw, cover, compaction, the garrison claim, the cap) and
// one loop each is cheaper and easier to audit than three.
//
// HP sits below the player's equivalents (660 / 2040 / 500) on purpose: rifles
// can't target a work at all — only explosives, and the chip a work takes when it
// actually stops a round — so the player has fewer tools to break one than the
// enemy has to break his.
// `dodge`/`chip` are indexed by fortification tier (base / up / up2) and mirror
// the player's own numbers in coverBlock. `chip` is the crucial half: a work
// loses HP every time it stops a round, so rifles that can't target a work still
// grind one down — slowly, and only while it is actually sheltering somebody.
// That is what keeps "explosives are the answer" from meaning "rifles are useless".
//
// The watch tower is the odd one out. It barely stops anything; what it does is
// LENGTHEN the reach of the man up it, mirroring watchtowerRangeMult on the
// player's side. A marksman in a hardened tower outranges most of the line, which
// is what makes a tower worth shelling ahead of a bunker.
const IT_WORK_KINDS = {
  sandbags:   { label: 'Sandbag Parapet', hp: 430,  cap: 2, box: { hw: 22, hh: 12 },
                dodge: [0.50, 0.65, 0.78], chip: [4, 3, 2] },
  bunker:     { label: 'Bunker',          hp: 1240, cap: 3, box: { hw: 28, hh: 13 },
                dodge: [0.75, 0.85, 0.92], chip: [2, 1, 1] },
  watchtower: { label: 'Watch Tower',     hp: 340,  cap: 1, box: { hw: 15, hh: 15 },
                dodge: [0.10, 0.10, 0.10], chip: [3, 3, 3],
                rangeMult: [1.25, 1.35, 1.5] },
};

// AVANTI SAVOIA — the other half of the faction's pulse. Entrenching alone makes
// a turtle: men who sit in works shoot instead of advancing, and the line stops
// being a threat. So on a cadence the WHOLE force turns out of cover at once and
// comes at the line together. Wave-level, not a radius command like the banzai or
// frenzy orders — every Italian on the field goes, wherever he is.
const IT_AVANTI_CD_MIN = 45;      // seconds between charges, before officers hurry it
const IT_AVANTI_CD_MAX = 70;
const IT_AVANTI_TELEGRAPH = 1.6;  // banner up, nobody moving yet — the player's window
                                  // to drop a mortar on a line that is still bunched up
const IT_AVANTI_DUR = 7;          // how long the surge runs
const IT_AVANTI_MIN_WAVE = 5;     // no charges before the player has anything to charge
const IT_AVANTI_MIN_FORCE = 5;    // a two-man charge is sad, not frightening
const IT_AVANTI_PRESSURE_FORCE = 10;  // ...and how many it takes for the "can't dig any
                                      // further, so go" urge to apply
// Both of these HURRY the clock rather than firing it. Keep their sum modest: if
// acceleration can drive the period below IT_AVANTI_MIN_GAP, the floor becomes the
// cadence and every constant above stops meaning anything.
const IT_AVANTI_OFFICER_URGE = 0.3;   // per officer, up to two — so at most x1.6
const IT_AVANTI_PRESSURE_URGE = 0.25; // dug out to the wall with a crowd behind it
const IT_AVANTI_MIN_GAP = 20;     // true safety floor: should rarely be what binds

const GARRISON_STANDOFF = 8;   // how far north of the work a man stands — the work
                               // ends up between him and the player, which is the
                               // whole point of standing there
const GARRISON_SLOT_W = 13;    // lateral spacing between men sharing one work
const GARRISON_REACH = 5;      // close enough to count as manning it
const GARRISON_BACKSTEP = 40;  // he'll step this far back into cover, no further:
                               // without it men slosh back up-field to old works
                               // and the line stops moving forward

// How the front creeps, and the four independent limits that stop it running
// away. Persistent structures are the one thing in this game that accumulate
// across waves, so each limit guards a different failure: the field filling up,
// the enemy line reaching the player's own build pocket, one sapper digging
// forever, and a rear line of abandoned works never going away.
const IT_WORK_CAP = 24;              // hard ceiling on works alive at once
const IT_WORK_MIN_Y = 50;            // no closer to the top edge than this
const IT_WORK_MAX_Y = FORWARD_Y - 24;  // ~182: the DEPTH WALL. The creep stops here,
                                     // short of FORWARD_Y, so the enemy line can never
                                     // enter the ground the player's own units contest.
const IT_FRONT_Y_START = 64;         // where the first line goes up, and where the
                                     // front resets to if the player levels every work
const IT_CREEP_MIN = 26;             // how much further down each new work is sited
const IT_CREEP_MAX = 46;             // than the current deepest one — 3-4 steps to the wall
const IT_WORK_SPACING = 46;          // minimum gap between two works
const IT_SITE_CLEAR = 40;            // and how far a site keeps off the player's emplacements
const IT_BUILDS_PER_MAN = 2;         // works one guastatore will raise before he picks up his rifle
const IT_WORK_START_FRAC = 0.25;     // a freshly staked work stands at this much of its HP —
                                     // the window in which the player can cheaply shell it flat
const IT_BUILD_RATE = 46;            // HP raised per 0.4s build tick
const IT_FORTIFY_RATE = 0.4;         // fortification progress per build tick (6 completes a tier)
const IT_TEND_RANGE = 260;           // how far a sapper will walk to tend an existing work
const IT_TICK = 0.5;                 // seconds between works-cache rebuilds
const IT_WAVE_DECAY = 0.04;          // fraction of max HP every work loses each wave
const IT_ABANDON_HP = 0.35;          // an unmanned work below this at a wave boundary is abandoned

// ---- Regio Esercito roster: the fourth endless-mode foe. Every type carries
// faction:'it', routing it through makeEnemy's nation pick and the Italian
// soldier renderer (js/render-italian.js). Their signature is that they BUILD:
// engineers throw up sandbags, bunkers and watch towers out on the open field,
// the line infantry GARRISONS them, and the works persist between waves so the
// enemy front creeps down the map. Periodically the whole force pours back out
// of cover in an AVANTI charge. Range/speed never exceed the allied counterpart,
// same discipline as the other rosters.
Object.assign(ENEMY_TYPES, {
  ifante: {
    // counterpart: rifleman (range 154, speed 42). Carcano M91 + folding bayonet.
    // The backbone: he is unremarkable in the open and hard to shift once he has
    // a parapet in front of him.
    name: 'Fante', hp: 74, speed: 24, range: 140, dmg: 12, acc: 0.44,
    rof: 1.4, burst: 1, burstGap: 0, reward: 2,
    color: '#74775a', gun: 8, sfx: 'rifle', priority: 1, faction: 'it',
    garrison: true,
  },
  iuff: {
    // counterpart: officer (range 101, speed 44) — the linchpin. His aura
    // stiffens the troops the same way every officer's does; his real weight is
    // on the AVANTI clock, which runs faster for every one of him still alive.
    name: 'Ufficiale', hp: 92, speed: 26, range: 96, dmg: 10, acc: 0.5,
    rof: 0.9, burst: 1, burstGap: 0, reward: 6,
    color: '#828763', gun: 6, sfx: 'pistol', priority: 5, faction: 'it',
    aura: true, garrison: true, avantiUrge: true,
  },
  iguast: {
    // NO allied counterpart — the faction's engine. A Guastatore walks out into
    // no-man's-land and RAISES the works the rest of the line fights from, each
    // one a little further down the field than the last. He is deliberately a
    // poor soldier: killing him is how the player stops the front creeping, so
    // he has to be worth the bullet while he's digging and not much after.
    // `per` is his budget — once he's spent it he shoulders his rifle for good
    // (updateGuastatore's 'fight' state), which bounds the dig per wave rather
    // than per lifetime.
    name: 'Guastatore', hp: 90, speed: 26, range: 96, dmg: 10, acc: 0.40,
    rof: 1.5, burst: 1, burstGap: 0, reward: 5,
    color: '#6d7052', gun: 8, sfx: 'rifle', priority: 2, faction: 'it',
    builder: { kinds: ['sandbags', 'sandbags', 'sandbags', 'bunker', 'watchtower'],
               per: IT_BUILDS_PER_MAN },
  },
  imosch: {
    // counterpart: gunner (range 179, speed 36) — Beretta MAB 38. Fast enough to
    // reach a forward work before the line does and hold it.
    name: 'Moschettiere', hp: 82, speed: 34, range: 92, dmg: 9, acc: 0.45,
    rof: 0.9, burst: 3, burstGap: 0.08, reward: 2,
    color: '#6b6f52', gun: 6, sfx: 'mg', priority: 1, faction: 'it',
    garrison: true,
  },
  ibreda: {
    // counterpart: gunner (range 179, speed 36) — Breda 30 light machine gun.
    // Slow on his feet and useless in the open; the whole point of him is that he
    // reaches a parapet and then rakes the field from behind it.
    name: 'Breda Gunner', hp: 100, speed: 15, range: 168, dmg: 10, acc: 0.34,
    rof: 1.8, burst: 4, burstGap: 0.10, reward: 3,
    color: '#6a6e50', gun: 10, sfx: 'mg', priority: 3, faction: 'it',
    garrison: true,
  },
  ifiat: {
    // counterpart: gunner (range 179, speed 36) — Fiat-Revelli M35 on a tripod.
    // The bunker gun: he heads for concrete by preference and pins a whole line
    // from inside it, where a 92% dodge means rifles barely touch him.
    name: 'Fiat HMG', hp: 120, speed: 10, range: 176, dmg: 11, acc: 0.37,
    rof: 1.9, burst: 5, burstGap: 0.09, reward: 4, sup: true,
    color: '#666a4c', gun: 11, sfx: 'mg', priority: 3, faction: 'it',
    garrison: true, garrisonPrefer: 'bunker',
  },
  icecc: {
    // counterpart: sniper (range 249, speed 38) — scoped Carcano. He makes for a
    // watch tower, and from a hardened one his 200 reach becomes 300: further
    // than most of the player's line can answer. Shell the tower.
    name: 'Cecchino', hp: 66, speed: 12, range: 200, dmg: 44, acc: 0.70,
    rof: 6.0, burst: 1, burstGap: 0, reward: 4,
    color: '#5c6046', gun: 12, sfx: 'sniper', priority: 4, faction: 'it',
    garrison: true, garrisonPrefer: 'watchtower',
  },
  ibrixia: {
    // Brixia Model 35 45mm — the light mortar. Short reach (20% under the
    // Cecchino's, so a sniper outranges it) but it fires often, from cover.
    name: 'Brixia Mortar', hp: 80, speed: 16, range: 78, dmg: 7, acc: 0.42,
    rof: 1.1, burst: 1, burstGap: 0, reward: 4,
    color: '#717555', gun: 5, sfx: 'pistol', priority: 4, faction: 'it',
    garrison: true,
    mortar: { range: 160, min: 70, cdMin: 5, cdMax: 7, r: 30, dmg: 55, flight: 1.3, scatter: 46 },
  },
  imortaio: {
    // counterpart: mortarman (mortar range 348) — Mortaio da 81. Long reach and a
    // heavy shell from behind the works; blind up close.
    name: 'Mortaio 81', hp: 88, speed: 15, range: 78, dmg: 7, acc: 0.44,
    rof: 1.0, burst: 1, burstGap: 0, reward: 5,
    color: '#6d7153', gun: 5, sfx: 'pistol', priority: 4, faction: 'it',
    garrison: true,
    mortar: { range: 330, min: 120, cdMin: 9, cdMax: 12, r: 40, dmg: 80, flight: 1.6, scatter: 52 },
  },
  ifolgore: {
    // NO true counterpart — elite paratrooper. Tough, fast and grenade-armed, and
    // he never digs in: he is the spearhead of the AVANTI, not part of the line.
    name: 'Folgore', hp: 112, speed: 36, range: 112, dmg: 11, acc: 0.46,
    rof: 1.1, burst: 1, burstGap: 0, reward: 5,
    color: '#565a40', gun: 9, sfx: 'rifle', priority: 3, faction: 'it',
    grenade: true,
  },
  iardito: {
    // NO allied counterpart, and the thematic keystone: the mirror of the
    // guastatore. Where the sapper builds a line forward, the Arditi tears the
    // player's down — he hunts EMPLACEMENTS by preference and plants a demolition
    // charge on them. Unlike the Japanese lunge-mine man he does not die for it:
    // the charge is on a fuse, he backs off, and he does it again on a cooldown.
    // The fuse is the player's counter-play — the marker is visible, so men can
    // be walked out of the blast.
    name: 'Arditi', hp: 100, speed: 34, range: 108, dmg: 11, acc: 0.45,
    rof: 1.2, burst: 1, burstGap: 0, reward: 5,
    color: '#5e6244', gun: 9, sfx: 'rifle', priority: 4, faction: 'it',
    grenade: true, blastResist: 0.4,
    demo: { r: 42, dmg: 175, fuse: 2.2, reach: 20, cdMin: 9, cdMax: 14, hunt: 200 },
  },
  iflame: {
    // counterpart: flamer (flame range 78, speed 38) — Lanciafiamme Modello 40.
    // The tool for cracking the player's OWN works open, and a charger by nature.
    name: 'Lanciafiamme', hp: 100, speed: 32, range: 76, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 4,
    color: '#6f7350', gun: 8, sfx: 'rifle', priority: 3, faction: 'it',
    flame: { range: 76, arc: 0.45, dps: 40 }, blastResist: 0.5,
  },
  il3: {
    // counterpart: sherman (range 262, speed 14) — L3/35 Lf flame tankette. The
    // ONLY flame-throwing armour any faction fields, and it costs no new code:
    // `tankFlame` plumbing has been live and callerless in update-friendlies.js
    // and update-enemies.js since the faction was first cut. Tiny, thin-skinned
    // and early — a wall of fire on tracks.
    name: 'L3 Lf Tankette', hp: 360, speed: 20, range: 112, dmg: 0, acc: 0,
    rof: 3.4, burst: 1, burstGap: 0, reward: 8,
    color: '#7e7a5a', gun: 0, sfx: 'boom', priority: 0, tank: true, light: true, faction: 'it',
    fireCone: { arc: 0.30 },
    tankFlame: { range: 112, arc: 0.40, dps: 46 },
    mg: { range: 128, dmg: 6, acc: 0.4, burst: 6, burstGap: 0.07, gun: 20, sfx: 'mg' },
  },
  im13: {
    // counterpart: sherman (range 262, speed 14) — M13/40 medium. Riveted, slow,
    // and the heaviest thing Italy fielded in numbers.
    name: 'M13/40', hp: 850, speed: 12, range: 200, dmg: 0, acc: 0,
    rof: 4.4, burst: 1, burstGap: 0, reward: 14, shellDmg: 80,
    color: '#847f5c', gun: 0, sfx: 'boom', priority: 0, tank: true, faction: 'it',
    fireCone: { arc: 0.25 },
    mg: { range: 150, dmg: 7, acc: 0.4, burst: 5, burstGap: 0.08, gun: 22, sfx: 'mg' },
  },
  isemo: {
    // counterpart: sherman (range 262, speed 14) — Semovente 75/18. A casemate
    // assault gun: the answer to a PLAYER bunker, standing off and shelling it.
    name: 'Semovente', hp: 780, speed: 12, range: 210, dmg: 0, acc: 0,
    rof: 4.0, burst: 1, burstGap: 0, reward: 13, shellDmg: 108,
    color: '#787454', gun: 0, sfx: 'boom', priority: 0, tank: true, casemate: true, faction: 'it',
    fireCone: { arc: 0.20 },
    mg: { range: 134, dmg: 6, acc: 0.38, burst: 4, burstGap: 0.08, gun: 20, sfx: 'mg' },
  },
  ibersa: {
    // NO true counterpart — an elite close-assault shotgunner (Bersaglieri,
    // plumed helmet). He runs the open ground to get inside buckshot range, then
    // stops and fights: the enemy shotgun AI holds ground while a target is in
    // range. Tough enough to cross the field, and he never digs in.
    name: 'Bersagliere', hp: 120, speed: 38, range: 0, dmg: 0, acc: 0,
    rof: 1.4, burst: 1, burstGap: 0, reward: 4,
    color: '#5f6347', gun: 8, sfx: 'shotgun', priority: 2, faction: 'it',
    shotgun: { range: 90, arc: 0.5, pellets: 8, dmg: 11, spread: 0.46 },
  },
});

// ---- The Treno Armato: the Regio Esercito's wave-100 boss ------------------
// An armored war train that rolls straight down a rail lane from the north and
// PARKS at the bottom of the field — it never breaches, it just sits there as a
// fortress inside your lines until it's killed. The third multi-actor boss: an
// engine (the parent, and the boss's whole HP pool) plus seven wagon/crew part
// actors, all real entries in G.enemies, repositioned each tick by
// syncTrainParts. Unlike the Yamato's belt there is NO shared pool — every part
// owns its HP (the Progenitor rule), so explode/flameSpray need no de-dupe
// clause and adding one would be a bug. AI in js/update-enemies.js
// (updateWarTrain); art in js/render-train.js.
const TRAIN_WAVE_INTERVAL = 100;     // arrives at wave 100, 200... (mirrors the others)
const TRAIN_HP = 10000;              // the ENGINE pool — killing it ends the fight
const TRAIN_SEGMENTS = 3;            // ONE pool, drawn as three bars; each break sounds the AVANTI
const TRAIN_SPEED = 9;               // px/s down the lane: ~70s from the top to the stop
const TRAIN_STOP_Y = H - 70;         // "the bottom of the screen": it parks here, short of a breach
const TRAIN_SPACING = 46;            // wagon-to-wagon centre distance along the rails
const TRAIN_LANE_MARGIN = 110;       // lane-centre clamp keeps every wagon + MG post on screen
// consist, engine first: engine / turret wagon / infantry wagon / gun wagon / turret wagon
const TRAIN_TURRET_S = [-TRAIN_SPACING, -TRAIN_SPACING * 4];
const TRAIN_WAGON_S = -TRAIN_SPACING * 2;
const TRAIN_GUNWAGON_S = -TRAIN_SPACING * 3;
// the gun wagon's four posts: two per side, paired fore and aft. The abeam
// offset is a MECHANIC for exactly the reason YAM_MG_B is: every US scan picks
// by raw distance, so this offset is the only reason riflemen shoot the crews
// instead of pinging an armored wagon at x0.04.
const TRAIN_MG_B = 22;
const TRAIN_MG_S = 9;
const TRAIN_TURRET_HP = 1200;        // per wagon — killing one silences its gun for good
const TRAIN_WAGON_HP = 1400;         // the infantry wagon: kill it and the squads stop coming
const TRAIN_MG_HP = 300;             // per post; itmg is NOT `tank`, so rifles work on it
const TRAIN_TURRET_ROF = 9;
const TRAIN_TURRET_TRACK = 0.35;     // rad/s traverse
const TRAIN_TURRET_ARC = 2.0;        // wedge off straight down-field: can't fire back up its own train
const TRAIN_TURRET_FIRE_TOL = 0.14;
const TRAIN_SHELL_DMG = 70;
const TRAIN_SHELL_R = 40;
const TRAIN_SHELL_FLIGHT = 1.4, TRAIN_SHELL_SCATTER = 30;
// the infantry wagon's squads are the fight's economy, same as the Yamato's
// landing parties: killing them pays for the artillery that kills the train
const TRAIN_DROP_CD_MIN = 16, TRAIN_DROP_CD_MAX = 24;
const TRAIN_DROP_MULT = 8;
const TRAIN_DROP_POOL = ['ifante', 'ifante', 'imosch', 'ibersa', 'ifolgore', 'iuff'];
// anything the player built on the rails is so much kindling under the wheels
const TRAIN_CRUSH_R = 20;
const TRAIN_CRUSH_DPS = 500;

// Every type carries noRamp (the difficulty HP ramp would silently triple the
// engine on hard) and the parts carry `fixed`: it's the prone exemption, and it
// keeps them out of isItalianFoot so the AVANTI order the train itself sounds
// can never hand a charge to a bolted-down gun post.
Object.assign(ENEMY_TYPES, {
  itrain: {
    // the engine: very tanky, no weapons. The whole boss pool lives here —
    // itaBoss is the "killing this ends the fight" flag (mirror of germanBoss /
    // japBoss / hordeBoss); boss:true separately buys the prone/suppression/
    // armor-roll exemptions every boss gets.
    name: 'Treno Armato', hp: TRAIN_HP, speed: TRAIN_SPEED, range: 0, dmg: 0, acc: 0,
    rof: 1, burst: 1, burstGap: 0, reward: 400,
    color: '#6f6b4e', gun: 0, sfx: 'boom', priority: 5,
    tank: true, heavy: true, boss: true, itaBoss: true, noRamp: true, faction: 'it',
  },
  ittur: {
    // a turret wagon: its own HP (NOT a hitbox into the engine's pool), so
    // shooting one off permanently silences its gun — there is no damage control
    // on this boss. trainPart is the child-actor flag, kept separate from
    // shipPart/bossPart so all three sets of touchpoints keep meaning what their
    // comments say.
    name: 'Treno Armato — Turret Wagon', hp: TRAIN_TURRET_HP, speed: 0, range: 290,
    dmg: 0, acc: 0, rof: TRAIN_TURRET_ROF, burst: 1, burstGap: 0, reward: 50,
    shellDmg: TRAIN_SHELL_DMG,
    color: '#787454', gun: 0, sfx: 'boom', priority: 5,
    tank: true, trainPart: true, trainTurret: true, fixed: true, noRamp: true, faction: 'it',
  },
  itwag: {
    // the infantry wagon: an armored boxcar that unloads squads beside the track
    // on a cadence. No weapon — killing it is how the player turns the tap off.
    name: 'Treno Armato — Infantry Wagon', hp: TRAIN_WAGON_HP, speed: 0, range: 0,
    dmg: 0, acc: 0, rof: 1, burst: 1, burstGap: 0, reward: 60,
    color: '#7a765a', gun: 0, sfx: 'boom', priority: 4,
    tank: true, trainPart: true, fixed: true, noRamp: true, faction: 'it',
  },
  itmg: {
    // an open gun post on the gun wagon, two per side. NOT `tank` — this is the
    // one part of the train a rifleman can hurt, same role as the Yamato's tubs.
    // Stats live on the type so runWeapon can drive it: bursts AND suppression.
    name: 'Treno Armato — Gun Post', hp: TRAIN_MG_HP, speed: 0, range: 240,
    dmg: 8, acc: 0.4, rof: 1.0, burst: 7, burstGap: 0.09, reward: 12,
    color: '#6b6a44', gun: 9, sfx: 'mg', priority: 4, sup: true,
    trainPart: true, trainMg: true, fixed: true, noRamp: true, faction: 'it',
  },
});

// ---- The Alien Walker (awalker) — the easter egg that ends the run ---------
// A striding tripod that walks out of the treeline at wave 666 and starts
// sweeping a laser lance across the field. It exists because endless has no
// ceiling: a mature line (or a cheated one) can sit at wave 800 forever, and
// nothing in the game says stop. This says stop.
//
// It is deliberately NOT one of the four faction bosses. No `faction` field —
// it appears whoever you're fighting, G.enemyFaction is never consulted. It is
// a SINGLE actor: no parts, no shared pool, none of the parent+child plumbing
// the Yamato/Progenitor/Treno need, because that pattern exists to give a
// 10,000 HP target several things worth shooting and 3000 doesn't need it. And
// killing it fires no bossVictory() — damage.js keys that on the four faction
// flags, so boss:true here is free.
//
// The one tuning decision worth writing down: it deliberately does NOT carry
// `tank`. At x0.04 vs small arms, 3000 HP would take a rifle line ~937 seconds
// and a prepared AT battery 3.4 shells — simultaneously impossible and trivial,
// one answer, no decision. Instead it is hard to REACH: standing at y 92..128
// it sits 252-288px off DEPLOY_Y (380), outside rifleman (154), gunner (179),
// grenadier (231) and bazooka (243) range, so the artillery answer falls out of
// geometry for free with the 3000 intact — while a player who walks his men up
// to FORWARD_Y can close inside rifle range and trade, standing in the open
// inside a beam that reaches past the bottom edge. If it dies too fast, push
// AW_STAND_Y_MIN back (out of mortar range too), never add an armor multiplier.
const AW_FIRST_WAVE = 666;
const AW_HP = 3000;                  // 3x a Sherman (UNIT_TYPES.sherman.hp = 1000)
const AW_SWEEP_DMG = 800;            // 80% of a Sherman, ONCE per actor per sweep
const AW_BEAM_RANGE = Math.round(H * 0.85);   // 527 — "85% of the battlefield"
const AW_SWEEP_T = 2.0;              // the two-second sweep
const AW_SWEEP_ARC = 2.4;            // ~137deg, centred on the defenders' mass
const AW_CHARGE_T = 1.4;             // telegraph: a thin aiming line, time to walk men clear
const AW_CD_MIN = 4.5, AW_CD_MAX = 7.0;
// The beam's hit test is the angular WEDGE swept since last tick, not a line
// segment — dt is hard-clamped to 0.05 (main.js; the gameSpeed loop sub-steps,
// TEST.DT is 0.05), so at 1.2 rad/s the beam advances at most 0.06 rad, which
// is a 31.6px tangential jump out at the 527px tip. A segment test with any
// half-width you'd actually draw steps clean over a man standing out there.
// The pad below is a PHYSICAL half-width converted to an angle at the actor's
// own radius, so the hitbox matches the drawn beam at every distance, and down
// by the feet (where the sweep's tangential speed is only ~12px/s and a running
// man could otherwise stay ahead of it for the whole two seconds) it opens up.
const AW_BEAM_HALFW = 7;
const AW_BEAM_MIN_R = 10;            // radius floor for that conversion
const AW_WIRE_HALFW = 35;            // wire is a belt, not a point (mirrors purgeRadius)
const AW_STAND_Y_MIN = 92, AW_STAND_Y_MAX = 128;  // its standing band; it never closes
const AW_APPROACH_SPEED = 22, AW_PATROL_SPEED = 13;
// The spawn roll: wave 666 is one, guaranteed. From 667 the chance climbs
// linearly — linear because it's the only shape you can reason about three
// hundred waves from the origin — and the falloff loop lets one roll produce
// several. E[walkers/wave] = 0.36 at 667, 0.45 at 700, 0.78 at 800, 1.61 at
// 1000 (where P(two or more) is ~50%).
const AW_P0 = 0.30, AW_P_SLOPE = 0.0020, AW_P_MAX = 0.95;
const AW_MULTI_FALLOFF = 0.55, AW_MAX_PER_WAVE = 4;
// A walker outlives the wave that spawned it; uncapped, wave 1000 settles at
// six or seven alive and the field is a light show rather than a fight.
const AW_ALIVE_CAP = 3;
// Gait. NOT the YAM_LEG_* idiom — those are nautical course legs, these are
// limbs. Three of them: at this sprite scale a quadruped's off-side pair
// overlaps the near pair and the silhouette turns to mush, and at duty 2/3 with
// phases 1/3 apart exactly one foot is airborne at every instant, which is what
// makes the gait read as deliberate rather than as wiggling.
// The proportions are the whole silhouette, and the first draft got them wrong
// in an instructive way: a 15x10 hull sitting 16px off the ground with 33px of
// leg reach rendered as a FLYING SAUCER — the wide ellipse dominated and the
// legs barely cleared it. A walker has to be mostly LEG. The hull now rides
// AW_HULL_Y above a foot plane AW_GROUND_Y below it, a 50px drop against 52px
// of reach, so the limbs are long, visibly bent, and carry the shape.
const AW_STRIDE = 30;                // ground covered per full cycle
const AW_DUTY = 2 / 3;               // fraction of the cycle a foot is planted
const AW_LIFT = 11;                  // peak foot lift during the swing
const AW_BOB = 1.8;                  // hull rise/fall; more reads as bouncing
const AW_THIGH = 26, AW_SHIN = 26;   // two-bone IK segment lengths
const AW_HIP_R = 10;                 // lateral offset of the two near hips
const AW_HULL_Y = -20;               // hull centre, above the actor's own point
const AW_GROUND_Y = 30;              // where the feet meet the ground, in local space

Object.assign(ENEMY_TYPES, {
  awalker: {
    // `awalker` is the dispatch/render/spawn key, owned by this feature.
    //
    // boss:true is bought for the exemptions only — the armorEnemy skip (it is
    // not issuing an alien a Wehrmacht flak vest), prone immunity and
    // suppression immunity. It does NOT end the run: damage.js keys
    // bossVictory() on germanBoss||japBoss||hordeBoss||itaBoss, and this is
    // none of them, by design.
    //
    // noRamp is MANDATORY, not decoration: makeEnemy multiplies t.hp by
    // enemyHpRamp() without it, and ENEMY_HP_RAMP_CAP (3) is long since maxed
    // out by wave 666 — the 3000 below would silently ship as 9000.
    //
    // range/dmg are here for the inspector and the codex; the beam is driven
    // entirely from updateAlienWalker and reads the AW_ constants directly.
    name: 'Alien Walker', hp: AW_HP, speed: AW_APPROACH_SPEED, range: AW_BEAM_RANGE,
    dmg: AW_SWEEP_DMG, acc: 0, rof: AW_SWEEP_T, burst: 1, burstGap: 0, reward: 250,
    color: '#2b3138', gun: 0, sfx: 'boom', priority: 5,
    awalker: true, boss: true, noRamp: true,
  },
});

const ENEMY_INFO = {
  erifle: 'Standard Wehrmacht infantry. Slow, steady, and expendable — but there are always more of them.',
  esmg: 'Assault troops with MP40s. Fast movers who shred your line in close bursts.',
  egren: 'Carries stick grenades into the fray. The blast ignores friend and foe.',
  emg: 'MG42 team. Pins your men down from long range with sustained fire.',
  eoff: 'Leutnant rallying nearby troops. Kill him first — his aura stiffens German morale.',
  esniper: 'Camouflaged sharpshooter. Picks off officers, medics, and gunners from afar.',
  eflame: 'Flammenwerfer operator in a flak vest. Burns through wire, sandbags, and flesh alike.',
  emortar: 'Granatwerfer team. Lobs 81mm shells into your backfield from beyond rifle range.',
  ebazooka: 'Panzerfaust operator. Hunts Shermans and gun emplacements; wildly inaccurate at distance.',
  ebike: 'Kradschützen on motorcycles. Blazing speed — they breach before you can react.',
  ejeep: 'Kübelwagen with a mounted MG. Mobile fire support, lightly armored.',
  ehalftrack: 'Sd.Kfz. 251 halftrack. Heavy armor, bow MG, and a squad ready to dismount.',
  panzer: 'Panzer IV. Thick armor and a 75mm cannon. Your line\'s worst nightmare.',
  estug: 'StuG III assault gun. Low-profile casemate mount; hunts bunkers and armor from range.',
  etiger: 'Tiger I heavy tank. Nearly impenetrable frontal armor and a devastating 88mm.',
  ev2: 'A20 rocket battery. Mostly holds position but pushes forward under fire like any infantry, covers most of the map, and hits hard where it lands — wildly inaccurate, but it hunts vehicles first and wrecks them fast. Doesn\'t show up until the fighting gets desperate.',
  eboss: 'Der Schlächter — the dark-haired executioner who takes the field every hundredth wave. Six revolver shots, each one a kill, and enough of a punch to hole a Sherman. When the cylinder runs dry he falls back to the top of the field, refits his plate and calls in reinforcements, then comes again down a different lane. Shell him while he reloads.',
  // Imperial Japanese Army — the alternate endless foe. All of them are
  // fanatics: they never hit the dirt, closing the distance instead of pinning.
  jrifle: 'Imperial infantry with a Type 38 Arisaka and a long bayonet. Fanatical — never goes to ground, just keeps coming.',
  jbanzai: 'Screaming shock trooper. No rifle fire — he sprints straight into your line and cuts men down with the bayonet. Kill him before he closes.',
  jsmg: 'Special Naval Landing Force trooper with a Type 100 SMG. A fast mover who shreds your line in close bursts.',
  jgren: 'Carries Type 97 fragmentation grenades into the fray. The blast ignores friend and foe alike.',
  jlmg: 'Type 99 light machine gun. Rakes your line from range and never flinches under return fire.',
  jhmg: 'Type 92 "Woodpecker" heavy machine gun on a tripod. Slow to move, but its long-range fire pins a whole line.',
  jmortar: 'Type 97 81mm mortar team. Drops shells into your backfield from well beyond rifle range; blind up close.',
  jsniper: 'Marksman lashed into the treeline. Stays hidden until he fires, then picks off officers, medics, and gunners.',
  jknee: 'Type 89 grenade discharger — a "knee mortar." Short-ranged and light, but it lobs shells far faster than a Granatwerfer.',
  jlunge: 'Suicide anti-tank man with a Type 99 lunge mine. Charges your armor and emplacements and rams the charge home. Shoot him off before he connects.',
  joff: 'Sword-wielding officer. His presence hardens the troops, and on command he hurls every soldier around him into a banzai charge.',
  jflame: 'Type 100 flamethrower operator. Burns through wire, sandbags, and flesh — and his own men if they\'re in the way.',
  jhago: 'Type 95 Ha-Go light tank. Thin-skinned and armed with only a 37mm gun, but fast — and it shows up long before the heavier armor.',
  jtank: 'Type 97 Chi-Ha. Lighter and faster than a Panzer, with a stubby 57mm gun and a hull MG. Small arms still bounce off it.',
  jchinu: 'Type 3 Chi-Nu. The heaviest tank Japan fielded — a 75mm gun and thick armor. Slow, late, and ruinous. Use AT weapons.',
  jyamato: 'The Yamato — a battleship put on treads and driven inland. Arrives every hundredth wave and never reaches your line. Rifle fire simply rings off the armor belt: bring artillery, AT guns and bazookas. Her two triple batteries and four gun tubs each hunt their own target, and the tubs ARE soft — strip them and the broadside goes quiet. Damage control patches what you break, and her landing parties keep coming ashore.',
  jyhull: 'A section of the Yamato\'s armor belt. Not a target in itself — everything that lands here goes straight into the ship.',
  jyturret: 'A triple 18.1" main battery. Lays its own bearing and picks its own target. Wreck it and three guns fall silent — until damage control reaches it.',
  jymg: 'An open 25mm gun tub on a sponson. The one part of the Yamato with no armor over it, and the one thing your riflemen and snipers can actually kill.',
  // The Horde — the undead endless foe. No army, no discipline: just a rising tide
  // of the dead. Their bite can INFECT your men, who then turn against you.
  zshambler: 'A slow, relentless walking corpse. No weapon — it claws its way to your line and bites. Its bite can infect; an infected man who dies rises against you. Cheap and endless.',
  zrunner: 'A fresh corpse still fast on its feet. Sprints the field and lunges — low HP, but it closes before you can thin the pack. Its bite spreads the infection.',
  zcrawler: 'Half a body dragging itself along the dirt. Small, quick, and it swarms. A weak bite, but there are always more of them, and every bite can infect.',
  zhound: 'An infected war dog. Blazing fast and almost no mass, with a savage bite that takes hold easily. Shoot the pack before it reaches the wire.',
  zbrute: 'A swollen, muscle-bound corpse. High HP, slow, and it hits like a truck — a heavy bite with a strong chance to infect. Soaks a lot of lead.',
  zspitter: 'The horde\'s one ranged threat. Hangs back and lobs a glob of corrosive bile that bursts on impact — area damage plus a high chance to infect everyone in the splash. Blind up close.',
  zbloater: 'A gas-swollen corpse that bursts when it dies or reaches you, venting a cloud of infectious rot: area damage and a high infect chance to all caught in it. A walking mine — kill it at range.',
  zscreamer: 'The horde\'s driving force. Its presence enrages the dead around it, and on a cadence it looses a scream that hurls every nearby zombie into a frenzied sprint. Kill it to slow the whole pack.',
  zrevenant: 'A reanimated Wehrmacht soldier that never let go of his Kar98 — the horde\'s only gunman. Undead hands aim poorly and it fires slowly, but a corpse that shoots back is a nasty surprise.',
  zabom: 'The Abomination — a towering mound of fused corpses, the horde\'s boss. Enormous HP, ground-shaking slow, a sweeping blow that flattens men and smashes emplacements, and near-certain infection on survivors. Burn it, shell it, or mine it.',
  zprogen: 'The Progenitor — the mass the whole horde came out of, and the thing waiting at wave 100. It crawls slower than anything on the field and swallows whole any man it reaches. Five pus modules ring its hide, lobbing infectious bile; shoot them off and its reach dies with them. It splits open every few seconds to birth a fresh brood, and every time a third of it dies it calls every corpse nearby back onto its feet — yours included. Do not let bodies pile up around it.',
  zpod: 'A pus module swollen out of the Progenitor\'s hide. Its own flesh, its own HP: burst it and that sac stops spitting bile for good. They sit between you and the mass, so rifles chew through them first.',
  // The Regio Esercito — the entrenching foe. They dig in where they stop, and
  // the works they leave behind are still there next wave.
  iguast: 'Guastatore — the assault sapper, and the reason the Italian line moves. He walks into the open and digs: a parapet, a bunker, a watch tower, each one a little further down the field than the last, and they are all still standing next wave. He raises two, then shoulders his rifle and fights like anyone else. Shoot him while he is digging or you will be fighting his work for the rest of the run.',
  ifante: 'Carcano rifleman — the backbone of the line. Ordinary in the open; a different problem entirely once he has a parapet in front of him.',
  iuff: 'Ufficiale. His presence stiffens the troops like any officer\'s — but he is also the clock: every one of him alive on the field brings the AVANTI charge sooner. Kill the officers and you buy yourself digging time.',
  imosch: 'Moschettiere with a Beretta MAB 38. Quick enough to reach a forward work ahead of the line and hold it, and deadly in short bursts once he is in one.',
  ibreda: 'Breda 30 light machine gun. Slow on his feet and unremarkable in the open — the whole point of him is that he reaches a parapet and rakes your line from behind it.',
  ifiat: 'Fiat-Revelli M35 heavy machine gun. He makes for a bunker by preference and pins a whole line from inside it, where rifle fire barely touches him. Shell the bunker, or bring a flamethrower.',
  icecc: 'Cecchino with a scoped Carcano. He climbs a watch tower, and from a hardened one his reach stretches from 200 to 300 — further than most of your line can answer. Bring the tower down.',
  ibrixia: 'Brixia Model 35 45mm light mortar. Short-legged — a sniper outranges it — but it fires fast and it fires from cover.',
  imortaio: 'Mortaio da 81 team. Long reach and a heavy shell, dropped on your backfield from behind the works. Blind up close.',
  ifolgore: 'Folgore paratrooper. Tough, fast and grenade-armed, and he never digs in — he is the spearhead of the AVANTI, not part of the line.',
  iardito: 'Arditi demolition man — the mirror of the sapper. Where the Guastatore builds a line forward, the Arditi tears yours down: he hunts your emplacements and plants a charge on them, then backs off and does it again. The fuse is your warning — walk your men clear.',
  iflame: 'Lanciafiamme Modello 40. The tool for cracking a dug-in line open, and he burns through wire, sandbags and flesh alike — his own men included.',
  il3: 'L3/35 Lf flame tankette. The only flame-throwing armour on any front: no cannon, it drives into short range and washes your line in fire. Thin-skinned and tiny, and it arrives early and in numbers.',
  im13: 'M13/40 medium tank. Riveted, slow, and armed with a 47mm — the heaviest thing Italy fielded in numbers. Small arms bounce off it.',
  isemo: 'Semovente 75/18 assault gun. A low casemate mount with no turret and the best anti-tank punch the Italians bring; it stands off and shells your bunkers and armour.',
  ibersa: 'Bersagliere close-assault trooper in a plumed helmet. Elite and quick — he runs the open ground to get inside buckshot range, then stops and shreds your line at point-blank. He never digs in; he is what comes out of the works at you.',
  awalker: 'No army fields this. It walks out of the treeline on three legs some time after the six hundred and sixty-sixth wave, plants itself beyond every rifle you own, and sweeps a lance of light across the whole sector — enough in one pass to gut a Sherman, and it does not care whose men are underneath. It comes whoever you are fighting, and the longer you last the more of them come. Artillery and anti-tank guns are the only things that reach it.',
  itrain: 'The Italian final boss: an armored war train that rolls straight down its rails and PARKS at the bottom of your sector. Two turret wagons shell your line, four gun posts rake it, and an infantry wagon unloads fanteria beside the track. Small arms only reach the gun crews — bring explosives. Every third of the engine\'s health you strip away, the whole army answers with an AVANTI charge.',
};

const EVENT_INFO = [
  {
    key: 'fog',
    name: 'Fog Rolls In',
    wave: 3,
    desc: 'Battlefield visibility drops. Your men and the enemy fight blind until the fog lifts.',
  },
  {
    key: 'smokescreen',
    name: 'Smokescreen',
    wave: 3,
    desc: 'A smoke round lands on the field and pumps out a screen that rides the wind. Nobody can see through it: troops on either side cannot target each other at all until they are almost touching. Lasts 20-60 seconds, and the wind shifts every wave.',
  },
  {
    key: 'fng',
    name: 'FNG Reinforcements',
    wave: 3,
    desc: 'A green rifleman reports for duty — free of charge. He\'s untested, but every body counts.',
  },
  {
    key: 'airraid',
    name: 'Air Bombing Raid',
    wave: 4,
    desc: 'Luftwaffe bombers cross the field from north to south. Bombers near your men drop 1-4 inaccurate bombs. Numbers, bombs, and damage escalate per wave tier. Only AA guns can reach them.',
  },
  {
    key: 'paradrop',
    name: 'Fallschirmjäger Paradrop',
    wave: 6,
    desc: 'Enemy paratroopers drift in behind your line. They are vulnerable under canopy — shoot them before they land.',
  },
  {
    key: 'airstrike',
    name: 'P-47 Strafing Run',
    wave: 8,
    desc: 'Allied Thunderbolts strafe the field and drop bombs. Helps your cause, but ordnance is indiscriminate.',
  },
  {
    key: 'special',
    name: 'Themed Assaults',
    wave: 10,
    desc: 'Every 10th wave: a motorcycle blitz, mass paradrop, human wave, armor column, or assault under fog. Themes rotate and grow bigger.',
  },
];

// promotion ladder: kills needed to reach each rank. Veterancy bites hard:
// a max-rank man is roughly 3-4x the soldier a green private is.
const RANKS = [
  { name: 'PVT', kills: 0 },
  { name: 'PFC', kills: 2 },
  { name: 'CPL', kills: 5 },
  { name: 'SGT', kills: 9 },
  { name: 'SSG', kills: 14 },
  { name: 'SFC', kills: 20 },
  { name: 'MSG', kills: 27 },
];

const PLACEABLES = [
  { key: 'rifleman', label: 'RIFLEMAN', cost: 3, kind: 'unit', hotkey: '1',
    desc: 'M1 Garand rifleman. Cheap and reliable. Ranking up makes him shoot faster, straighter, and harder.' },
  { key: 'gunner', label: 'GUNNER', cost: 9, kind: 'unit', hotkey: '2',
    desc: 'BAR gunner. Long-range automatic fire. Ranking up makes him shoot faster, straighter, and harder.' },
  { key: 'grenadier', label: 'GRENADIER', cost: 7, kind: 'unit', hotkey: '3',
      desc: 'Carbine + frag grenades. Blast can hit your men. Can catch and return enemy grenades. Rank: more frequent, accurate, harder grenades.' },
    { key: 'shotgunner', label: 'SHOTGUN', cost: 5, kind: 'unit', hotkey: 'G',
      desc: 'M97 trench gun and body armor. High HP; each blast hits every enemy in the cone. Rank: tighter spread, extended range.' },
    { key: 'bazooka', label: 'BAZOOKA', cost: 13, kind: 'unit', hotkey: 'B',
      desc: 'M1A1 rocket launcher. Inaccurate at range; splash hurts friendlies. Excels vs armor. Rank: faster reloads, tighter rockets.' },
    { key: 'mortarman', label: 'MORTARMAN', cost: 11, kind: 'unit', hotkey: 'M',
      desc: 'Portable 60mm mortar. Long-range indirect fire; useless up close. Rank: faster reloads, tighter shells.' },
    { key: 'sniper', label: 'SNIPER', cost: 10, kind: 'unit', hotkey: '4',
      desc: 'Springfield scoped rifle. Picks officers, snipers, bazookas, and mortar teams first. Rank: faster, straighter, harder.' },
    { key: 'medic', label: 'MEDIC', cost: 12, kind: 'unit', hotkey: '5',
      desc: 'Unarmed. Heals the most wounded nearby soldier. Faster with rank. Snipers hunt him. Can\'t repair vehicles or fortifications.' },
    { key: 'engineer', label: 'ENGINEER', cost: 14, kind: 'unit', hotkey: 'E',
      desc: 'Repairs and upgrades fortifications, and lets you build emplacements forward of the deploy line within his radius. Slowly patches vehicles and AT guns. SMG close range. Rank: faster repairs, extended range.' },
    { key: 'officer', label: 'OFFICER', cost: 15, kind: 'unit', hotkey: '6',
      desc: 'Sidearm. Aura boosts nearby soldiers\' fire. Bonus grows with rank. Earns bonus TP. Snipers hunt him.' },
    { key: 'flamer', label: 'FLAMER', cost: 7, kind: 'unit', hotkey: 'F',
      desc: 'M2 flamethrower. Burns everything in the cone — friend and foe. Rank: more burn damage, tighter stream.' },
    { key: 'jeep', label: 'JEEP', cost: 26, kind: 'unit', hotkey: 'J',
      desc: 'Willys jeep, .50 cal HMG, fires on the move. Unarmored. Engineer patches slowly. Rank: faster, deadlier.' },
    { key: 'sherman', label: 'SHERMAN', cost: 50, kind: 'unit', hotkey: 'T',
      desc: 'M4 Sherman. 75mm turret cannon. Shrugs off small arms. Engineer repairs slowly. Rank: sharper aim, faster reloads.' },
    { key: 'atgun', label: 'AT GUN', cost: 21, kind: 'unit', hotkey: 'P',
      desc: '57mm AT gun. Immobile; fires at vehicles in its cone. Engineer repairs slowly. Rank: wider arc, faster reloads, more damage.' },
    { key: 'aagun', label: 'AA GUN', cost: 21, kind: 'unit', hotkey: 'V',
      desc: '40mm Bofors flak gun. Immobile; shoots bombers and paratroopers. Engineer repairs slowly. Rank: wider arc, faster reloads, tighter aim.' },
  { key: 'wire', label: 'WIRE', cost: 3, kind: 'defense', hotkey: '7',
    desc: 'Barbed wire. Slows the German advance until it wears out.' },
  { key: 'sandbags', label: 'SANDBAGS', cost: 4, kind: 'defense', hotkey: '8',
    desc: 'Cover. Soldiers behind it dodge half of incoming fire.' },
  { key: 'dummy', label: 'DUMMY', cost: 5, kind: 'defense', hotkey: 'D',
    desc: 'Straw decoy. Enemies waste fire on it, but each hit they may see the ruse and move on (40%). Fortify for a helmet, harden for body armor — a better disguise holds their attention longer (30%/20%) and each tier adds another decoy\'s worth of HP.' },
  { key: 'bunker', label: 'BUNKER', cost: 15, kind: 'defense', hotkey: 'K',
    desc: 'Concrete pillbox. Soldiers inside dodge 75% of incoming fire. Shrugs off shellfire.' },
  { key: 'watchtower', label: 'WATCH TOWER', cost: 10, kind: 'defense', hotkey: 'W',
    desc: 'Wooden lookout. +25% range for nearby soldiers (+35% fortified). Mortars ignore it. Frail.' },
  { key: 'camonest', label: 'CAMO NEST', cost: 4, kind: 'defense', hotkey: 'C',
    desc: 'Concealed position. Hidden until firing; exposed 3 s after last shot (1.5 s fortified). No dodge bonus. Weak to explosives.' },
  { key: 'ammocrate', label: 'AMMO CRATE', cost: 8, kind: 'defense', hotkey: 'X',
    desc: 'Ammunition cache. Nearby soldiers fire and reload 10% faster (+20% fortified, +30% hardened). Frail.' },
  { key: 'mine', label: 'MINEFIELD', cost: 6, kind: 'defense', hotkey: '9',
    desc: 'Cluster of 3 anti-personnel mines. Hurts tanks too. Germans can\'t see them.' },
  { key: 'mortar', label: 'MORTAR STRIKE', cost: 5, kind: 'support', hotkey: '0',
    desc: '6 mortar shells on target. DANGER CLOSE — friendly fire is real.' },
  { key: 'artillery', label: 'ARTILLERY STRIKE', cost: 12, kind: 'support', hotkey: 'A',
    desc: '105mm barrage: 16 heavy shells, wide spread. Devastating. Indiscriminate.' },
  { key: 'bodyarmor', label: 'BODY ARMOR', cost: 1, kind: 'support', hotkey: '',
    desc: 'Straps a plate carrier on one infantryman. Its own bar soaks up bullet damage until it breaks — HP is untouched while it holds. Re-buy to refill.' },
  { key: 'flakarmor', label: 'FLAK ARMOR', cost: 1, kind: 'support', hotkey: '',
    desc: 'Fits a flak vest on one infantryman. Its own bar soaks up explosion damage until it breaks — HP is untouched while it holds. Re-buy to refill.' },
];

// German roster, kept as the source the endless TESTING toolbar derives its
// GERMANS category from (see TESTING_GERMAN_PLACEABLES below). costs mirror the
// closest allied PLACEABLES counterpart (rifleman, gunner, grenadier,
// shotgunner, sniper, flamer, officer, jeep, sherman, artillery).
const AXIS_PLACEABLES = [
  { key: 'erifle', label: 'RIFLEMAN', cost: 4, kind: 'eunit', hotkey: '1',
    desc: 'Wehrmacht rifleman. Slow, steady, expendable.' },
  { key: 'esmg', label: 'STORMTROOP', cost: 4, kind: 'eunit', hotkey: '2',
    desc: 'MP40 assault trooper. Fast mover, deadly up close.' },
  { key: 'egren', label: 'GRENADIER', cost: 10, kind: 'eunit', hotkey: '3',
    desc: 'Carries stick grenades into the fray. Blast ignores friend and foe.' },
  { key: 'emg', label: 'MG42 TEAM', cost: 9, kind: 'eunit', hotkey: '4',
    desc: 'MG42 gunner. Pins the Americans down from long range.' },
  { key: 'esniper', label: 'SNIPER', cost: 10, kind: 'eunit', hotkey: '5',
    desc: 'Camouflaged marksman. Picks off gunners and medics from afar.' },
  { key: 'eflame', label: 'FLAMMEN', cost: 6, kind: 'eunit', hotkey: 'F',
    desc: 'Flammenwerfer operator in a flak vest. Burns through wire, sandbags and flesh alike.' },
  { key: 'eoff', label: 'OFFICER', cost: 15, kind: 'eunit', hotkey: '6',
    desc: 'Leutnant. Nearby troops fight harder; earns +1 TP every 30 s while alive.' },
  { key: 'emortar', label: 'GRANATWERFER', cost: 14, kind: 'eunit', hotkey: 'M',
    desc: '81mm mortar team. Long-range indirect fire; blind inside 147 px.' },
  { key: 'ebazooka', label: 'PANZERFAUST', cost: 18, kind: 'eunit', hotkey: 'B',
    desc: 'Panzerfaust operator. Prioritizes armor; scatter is brutal at range.' },
  { key: 'ebike', label: 'KRAD', cost: 15, kind: 'eunit', hotkey: 'K',
    desc: 'Kradschützen motorcycle team. Blazing speed — races for the breach.' },
  { key: 'ejeep', label: 'KÜBELWAGEN', cost: 30, kind: 'eunit', hotkey: 'J',
    desc: 'Gun car with a mounted MG. Mobile fire support, lightly armored.' },
  { key: 'ehalftrack', label: 'HALFTRACK', cost: 80, kind: 'eunit', hotkey: 'H',
    desc: 'Sd.Kfz. 251. Heavy armor, bow MG, and a squad that dismounts at the line.' },
  { key: 'panzer', label: 'PANZER IV', cost: 80, kind: 'eunit', hotkey: 'T',
    desc: '75mm cannon and thick armor. The American line\'s worst nightmare.' },
  { key: 'ebarrage', label: 'ARTILLERY', cost: 16, kind: 'support', hotkey: 'A',
    desc: 'German 105mm barrage: 10 heavy shells on target. Indiscriminate.' },
];

// endless testing mode: the German roster dropped in freely anywhere on the
// field (kind 'egerman'). No hotkeys — this list is merged onto the endless
// toolbar alongside PLACEABLES, and reusing those hotkeys would just shadow
// the US units that already claim them.
const TESTING_GERMAN_PLACEABLES = [
  ...AXIS_PLACEABLES.filter(p => p.kind === 'eunit').map(p => ({ ...p, kind: 'egerman', hotkey: '' })),
  // ev2 is an endless-only set piece that otherwise doesn't show up until wave
  // 140. Testing mode is exactly where you'd want to drop one in on demand.
  { key: 'ev2', label: 'V2 BATTERY', cost: 100, kind: 'egerman', hotkey: '',
    desc: 'A20 rocket battery. Normally locked behind wave 140 in endless — testing mode lets you place one immediately.' },
  { key: 'eboss', label: 'SCHLÄCHTER', cost: 200, kind: 'egerman', hotkey: '',
    desc: 'The German final boss. Normally arrives at wave 100 — testing mode drops him in on demand.' },
  // The Alien Walker isn't German — it belongs to no faction at all. It lives
  // on this list anyway because a fifth TESTING_*_PLACEABLES array would cost
  // edits in test-api.js's _deployMap, flow.js's testing-toolbar merge AND a
  // hud.js toolbar category, all to move one entry between tabs on a test-only
  // surface. With no `faction` field enemyPlaceableFaction falls back to 'de',
  // so it shows under GERMANS. TEST.deploy('awalker', ...) is what this is for.
  { key: 'awalker', label: 'ALIEN WALKER', cost: 250, kind: 'egerman', hotkey: '',
    desc: 'The wave-666 easter egg: a striding tripod with a sweeping laser lance. Belongs to no faction and appears against all of them — testing mode walks one on early.' },
];

// endless testing/deploy roster for the Imperial Japanese Army. Reuses the
// 'egerman' kind (which just routes placement through makeEnemy as an attacker);
// makeEnemy reads each type's faction:'jp', so these spawn as Japanese units.
const TESTING_JAPANESE_PLACEABLES = [
  { key: 'jrifle', label: 'ARISAKA', cost: 4, kind: 'egerman', hotkey: '',
    desc: 'Imperial rifleman with an Arisaka and long bayonet. Fanatical — never goes prone.' },
  { key: 'jbanzai', label: 'BANZAI', cost: 4, kind: 'egerman', hotkey: '',
    desc: 'Melee shock trooper. Sprints in and bayonets defenders — no ranged attack.' },
  { key: 'jsmg', label: 'SNLF SMG', cost: 4, kind: 'egerman', hotkey: '',
    desc: 'Naval landing trooper with a Type 100 SMG. Fast close-assault.' },
  { key: 'jgren', label: 'JP GREN', cost: 10, kind: 'egerman', hotkey: '',
    desc: 'Grenadier. Lobs Type 97 frags; the blast ignores friend and foe.' },
  { key: 'jlmg', label: 'NAMBU LMG', cost: 9, kind: 'egerman', hotkey: '',
    desc: 'Type 99 light machine gun. Long-range suppressive fire.' },
  { key: 'jhmg', label: 'TYPE 92 HMG', cost: 9, kind: 'egerman', hotkey: '',
    desc: 'Type 92 heavy MG on a tripod. Slow, long-range, heavy suppression.' },
  { key: 'jsniper', label: 'NEST SNIPER', cost: 10, kind: 'egerman', hotkey: '',
    desc: 'Camouflaged marksman lashed into the treeline.' },
  { key: 'jknee', label: 'KNEE MORTAR', cost: 14, kind: 'egerman', hotkey: '',
    desc: 'Type 89 grenade discharger. Short-ranged but very fast-firing.' },
  { key: 'jmortar', label: 'MORTAR TEAM', cost: 14, kind: 'egerman', hotkey: '',
    desc: 'Type 97 81mm mortar. Long-range indirect fire; blind up close.' },
  { key: 'jlunge', label: 'LUNGE MINE', cost: 18, kind: 'egerman', hotkey: '',
    desc: 'Suicide anti-tank charge. Rams armor and emplacements, detonating on contact.' },
  { key: 'joff', label: 'JP OFFICER', cost: 15, kind: 'egerman', hotkey: '',
    desc: 'Sword officer. Aura buff plus a banzai-charge command.' },
  { key: 'jflame', label: 'JP FLAMER', cost: 6, kind: 'egerman', hotkey: '',
    desc: 'Type 100 flamethrower. Burns everything in the cone.' },
  { key: 'jhago', label: 'HA-GO', cost: 55, kind: 'egerman', hotkey: '',
    desc: 'Type 95 Ha-Go light tank. Fast, thin-skinned, 37mm gun.' },
  { key: 'jtank', label: 'CHI-HA', cost: 80, kind: 'egerman', hotkey: '',
    desc: 'Type 97 Chi-Ha. Lighter, quicker armor with a 57mm gun.' },
  { key: 'jchinu', label: 'CHI-NU', cost: 120, kind: 'egerman', hotkey: '',
    desc: 'Type 3 Chi-Nu. Heavy armor and a 75mm gun. Slow and late.' },
  // the hull only — her eleven parts are built by initYamato on the first tick,
  // so deploying the ship deploys the whole thing
  { key: 'jyamato', label: 'YAMATO', cost: 400, kind: 'egerman', hotkey: '',
    desc: 'The Japanese final boss: a land battleship. Normally arrives at wave 100 — testing mode drives one in on demand.' },
];

// endless testing/deploy roster for The Horde. Same 'egerman' routing as the other
// alternate factions (makeEnemy reads faction:'zo' off each type).
const TESTING_ZOMBIE_PLACEABLES = [
  { key: 'zshambler', label: 'SHAMBLER', cost: 3, kind: 'egerman', hotkey: '',
    desc: 'Slow walking corpse. Claws to the line and bites — the bite can infect.' },
  { key: 'zrunner', label: 'RUNNER', cost: 3, kind: 'egerman', hotkey: '',
    desc: 'Fast fresh corpse. Sprints and lunges; low HP. Bite spreads infection.' },
  { key: 'zcrawler', label: 'CRAWLER', cost: 3, kind: 'egerman', hotkey: '',
    desc: 'Half a body dragging along the dirt. Small, quick, swarms.' },
  { key: 'zhound', label: 'HOUND', cost: 4, kind: 'egerman', hotkey: '',
    desc: 'Infected war dog. Blazing fast, tiny HP, a bite that takes hold easily.' },
  { key: 'zbrute', label: 'BRUTE', cost: 12, kind: 'egerman', hotkey: '',
    desc: 'Swollen bruiser. High HP, slow, heavy bite with a strong infect chance.' },
  { key: 'zspitter', label: 'SPITTER', cost: 10, kind: 'egerman', hotkey: '',
    desc: 'Lobs corrosive bile — area damage plus infection in the splash. Blind up close.' },
  { key: 'zbloater', label: 'BLOATER', cost: 9, kind: 'egerman', hotkey: '',
    desc: 'Bursts on death into a cloud of infectious rot. A walking mine.' },
  { key: 'zscreamer', label: 'SCREAMER', cost: 15, kind: 'egerman', hotkey: '',
    desc: 'Enrages the dead around it and screams to hurl them into a frenzied sprint.' },
  { key: 'zrevenant', label: 'REVENANT', cost: 5, kind: 'egerman', hotkey: '',
    desc: 'Reanimated soldier with a Kar98. The horde\'s only gunman — poor aim, slow fire.' },
  { key: 'zabom', label: 'ABOMINATION', cost: 90, kind: 'egerman', hotkey: '',
    desc: 'Boss mound of fused corpses. Enormous HP, smashes emplacements, near-certain infection.' },
  // the core only — its five pus modules are built by initProgenitor on the first
  // tick, so deploying the boss deploys the whole thing
  { key: 'zprogen', label: 'PROGENITOR', cost: 300, kind: 'egerman', hotkey: '',
    desc: 'The Horde final boss: a crawling mass that devours men, births broods, and raises the dead. Normally arrives at wave 100 — testing mode drags one in on demand.' },
];

// endless testing/deploy roster for the Regio Esercito. Same 'egerman' routing as
// the other alternate factions (makeEnemy reads faction:'it' off each type). Costs
// mirror the closest allied counterpart named in each type's comment — rifleman,
// officer, shotgunner — the same rule AXIS_PLACEABLES follows.
const TESTING_ITALIAN_PLACEABLES = [
  { key: 'iguast', label: 'GUASTATORE', cost: 5, kind: 'egerman', hotkey: '',
    desc: 'Assault sapper. Digs sandbags, bunkers and watch towers further down the field each time, then picks up his rifle.' },
  { key: 'ifante', label: 'FANTE', cost: 4, kind: 'egerman', hotkey: '',
    desc: 'Line infantryman with a Carcano and folding bayonet. Unremarkable in the open, stubborn once he has a parapet in front of him.' },
  { key: 'ibersa', label: 'BERSAGLIERE', cost: 5, kind: 'egerman', hotkey: '',
    desc: 'Plumed close-assault shotgunner. Runs the open ground to get inside buckshot range, then holds and fights. Never digs in.' },
  { key: 'imosch', label: 'MOSCHETTIERE', cost: 5, kind: 'egerman', hotkey: '',
    desc: 'MAB 38 SMG. Fast enough to reach a forward work before the line does, deadly in short bursts.' },
  { key: 'ibreda', label: 'BREDA GUNNER', cost: 6, kind: 'egerman', hotkey: '',
    desc: 'Breda 30 LMG. Slow and unremarkable in the open; rakes the field from behind a parapet.' },
  { key: 'ifiat', label: 'FIAT HMG', cost: 8, kind: 'egerman', hotkey: '',
    desc: 'Fiat-Revelli M35. Heads for a bunker and pins a line from inside it.' },
  { key: 'icecc', label: 'CECCHINO', cost: 9, kind: 'egerman', hotkey: '',
    desc: 'Sniper. Climbs a watch tower; from a hardened one he reaches 300 and outranges your line.' },
  { key: 'ibrixia', label: 'BRIXIA MORTAR', cost: 8, kind: 'egerman', hotkey: '',
    desc: 'Light 45mm mortar. Short reach, fires often, and it fires from cover.' },
  { key: 'imortaio', label: 'MORTAIO 81', cost: 10, kind: 'egerman', hotkey: '',
    desc: '81mm mortar team. Long reach and a heavy shell from behind the works.' },
  { key: 'ifolgore', label: 'FOLGORE', cost: 9, kind: 'egerman', hotkey: '',
    desc: 'Elite paratrooper. Tough, fast, grenade-armed, and never digs in — the spearhead of the AVANTI.' },
  { key: 'iardito', label: 'ARDITI', cost: 10, kind: 'egerman', hotkey: '',
    desc: 'Demolition man. Hunts YOUR emplacements and plants a fused charge on them, then does it again.' },
  { key: 'iflame', label: 'LANCIAFIAMME', cost: 9, kind: 'egerman', hotkey: '',
    desc: 'Flamethrower. Cracks a dug-in line open; burns wire, sandbags and men alike.' },
  { key: 'il3', label: 'L3 LF TANKETTE', cost: 16, kind: 'egerman', hotkey: '',
    desc: 'Flame tankette — the only flame-throwing armour anywhere. Thin, fast, early, and it swarms.' },
  { key: 'im13', label: 'M13/40', cost: 24, kind: 'egerman', hotkey: '',
    desc: 'Medium tank. Riveted and slow, with a 47mm gun and a hull MG.' },
  { key: 'isemo', label: 'SEMOVENTE', cost: 24, kind: 'egerman', hotkey: '',
    desc: 'Casemate assault gun. Stands off and shells bunkers and armour with a 75mm.' },
  { key: 'iuff', label: 'UFFICIALE', cost: 15, kind: 'egerman', hotkey: '',
    desc: 'Officer. Aura stiffens nearby troops, and every one of him alive brings the AVANTI charge sooner.' },
  // the engine only — its seven wagon/crew parts are built by initWarTrain on
  // the first tick, so deploying the boss deploys the whole consist
  { key: 'itrain', label: 'TRENO ARMATO', cost: 400, kind: 'egerman', hotkey: '',
    desc: 'The Italian final boss: an armored war train that parks at the bottom of the field. Normally arrives at wave 100 — testing mode rolls one in on demand.' },
  // The field works. Their own kind ('itwork') because they aren't units — they
  // route through applyPlacement's G.itWorks branch, not makeEnemy. `workKind`
  // indexes IT_WORK_KINDS; the key only has to be unique in the toolbar.
  { key: 'itwork_sandbags', workKind: 'sandbags', label: 'IT PARAPET', cost: 4, kind: 'itwork', hotkey: '',
    desc: 'An Italian sandbag parapet. Rifles can\'t touch it — shell it, or grind it down by making it stop rounds.' },
  { key: 'itwork_bunker', workKind: 'bunker', label: 'IT BUNKER', cost: 15, kind: 'itwork', hotkey: '',
    desc: 'An Italian bunker. The toughest thing the sappers put up, and it holds three men.' },
  { key: 'itwork_watchtower', workKind: 'watchtower', label: 'IT TOWER', cost: 10, kind: 'itwork', hotkey: '',
    desc: 'An Italian watch tower. Holds one man and lengthens his reach — a Cecchino up one outranges your line.' },
];

// ---- Infection: the Horde's signature mechanic. A zombie bite (and bile/gas
// splash) may plant the infection in a defender; he rots on a countdown and, if a
// medic doesn't cure him first, dies and RISES as a zombie on the enemy side. Read
// by the bite/spit/bloat code (update-enemies.js), the per-frame rot tick
// (update-friendlies.js), the reanimation on death (damage.js) and the medic cure.
const INFECT_TURN_MIN = 9;     // seconds from bite to fully turning, if untreated
const INFECT_TURN_MAX = 15;
const INFECT_DOT = 3;          // HP lost per rot tick
const INFECT_DOT_INTERVAL = 1.5;
const INFECT_CURE_PER_SEC = 4; // a tending medic burns down this much infection timer per second (on top of real time)

// ---- Wind & the smokescreen event (js/smoke.js). One wind vector per run
// carries every puff a smoke round throws off; each wave the wind backs or
// veers a little, so where a screen ends up is never quite the same twice.
const WIND_SPEED_MIN = 19.25;  // px/sec a puff drifts at (a screen carries 75% further than it first shipped: +25%, then +40%)
const WIND_SPEED_MAX = 45.5;
const WIND_SHIFT_MAX = 0.2;    // per wave, the direction turns by up to this fraction of a full circle

const SMOKE_DUR_MIN = 20;      // seconds a screen stands, start to last wisp
const SMOKE_DUR_MAX = 60;
const SMOKE_ROUND_FLIGHT = 1.6; // fuse on the incoming canister — a moment's warning
// Puffs are laid by DISTANCE, not on a fixed clock: the pot drops one every
// SMOKE_EMIT_SPACING px of drift, so a stiff wind can't stretch the plume into a
// dotted line with holes shooters can see through. The clamps keep a dead calm
// from spamming puffs and a gale from outrunning the emitter.
const SMOKE_EMIT_SPACING = 13; // px of drift between puffs
const SMOKE_EMIT_MIN = 0.2;    // seconds — floor on the emit interval
const SMOKE_EMIT_MAX = 0.6;    // seconds — ceiling, for very light winds
const SMOKE_PUFF_TTL = 11;     // seconds one puff lives after it leaves the pot
const SMOKE_PUFF_CAP = 52;     // live puffs, oldest dropped — bounds draw AND line-of-sight cost
const SMOKE_PUFF_R0 = 16;      // radius fresh off the pot
const SMOKE_PUFF_R = 44;       // radius once it's fully bloomed
const SMOKE_SWIRL = 7;         // px/sec of cross-wind wander, so the plume isn't a ruler
// Enemy mortars keep a few smoke rounds in the rack: this fraction of shells
// cracks open into a pot instead of bursting (see the mortar block in
// js/update-enemies.js). A round's pot burns far shorter than the event
// canister's (9-49s) — a patch of blindness the wind drags around, not a wall.
const MORTAR_SMOKE_CHANCE = 0.07;
const MORTAR_SMOKE_BURN_MIN = 10;
const MORTAR_SMOKE_BURN_MAX = 18;
const SMOKE_ALPHA = 0.85;      // draw opacity of a puff at full density
// How deep into smoke a man can see, in px of smoke ON the sight line (NOT the
// gap between the two men — see smokeBlocksLOS). Men in contact have almost no
// smoke between them and always find each other; men with a bank of it between
// them never do, however close they're standing.
const SMOKE_SEE_THROUGH = 26;
// the puff art is inset inside its bitmap; blit at this multiple of the blocking
// radius so what the player sees is the volume that actually screens
const SMOKE_SPRITE_FIT = 2.06;

// testing-mode-only ability: an instant field promotion for every unit —
// American and German alike — caught inside the blast-style radius.
const TESTING_ABILITIES = [
  { key: 'rankup', label: 'RANK UP', cost: 10, kind: 'support', hotkey: '',
    desc: 'Instantly promotes every unit — American and German alike — within a wide radius by one rank. Testing mode only.' },
  { key: 'purge', label: 'PURGE', cost: 5, kind: 'support', hotkey: '',
    desc: 'Instantly destroys every unit and emplacement — American and German alike — within a wide radius. Testing mode only.' },
];

// testing-mode-only: the random-event roster, summoned on demand. These fire
// the instant the button is clicked — there's nothing to place, so kind
// 'event' skips placement mode entirely. Wave-gating is ignored: the whole
// point is to see any event at any wave.
const TESTING_EVENTS = [
  { key: 'random', label: 'RANDOM', cost: 0, kind: 'event', hotkey: '',
    desc: 'Rolls the wave-appropriate random event, exactly as the game would.' },
  { key: 'fog', label: 'FOG', cost: 0, kind: 'event', hotkey: '',
    desc: 'Rolls fog across the field — everyone shoots worse until it lifts.' },
  { key: 'smokescreen', label: 'SMOKE', cost: 0, kind: 'event', hotkey: '',
    desc: 'Drops a smoke round that screens the field downwind — nobody can target through it.' },
  { key: 'fng', label: 'FNG', cost: 0, kind: 'event', hotkey: '',
    desc: 'A replacement rifleman reports to the back line.' },
  { key: 'paradrop', label: 'PARADROP', cost: 0, kind: 'event', hotkey: '',
    desc: 'Fallschirmjäger drop into the field. Stick size scales with the current wave.' },
  { key: 'airraid', label: 'AIR RAID', cost: 0, kind: 'event', hotkey: '',
    desc: 'German bombers cross the field north to south. Formation and payload scale with the current wave.' },
  { key: 'airstrike', label: 'STRAFING RUN', cost: 0, kind: 'event', hotkey: '',
    desc: 'A P-47 strafes a lane of the field.' },
];
