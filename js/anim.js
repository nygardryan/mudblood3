/* Trenchworks: WW2 — the actor animation layer.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html.

   Every actor on the field now moves. The system is deliberately split in two,
   because the two halves have opposite costs and mixing them is what makes an
   animation system in a game like this unaffordable:

     STANCE — a discrete steady pose (stand / kneel / cover). BAKED, as a fourth
     component of the soldier sprite key, beside type / nation / facing. Free per
     frame; paid once per combination actually seen.

     MOTION — continuous: gait sway, idle breathing, recoil. A TRANSFORM PUSHED
     AT BLIT TIME, never baked. The soldier cache already holds 48 facings per
     type; a baked frame per animation step would multiply that by the cycle
     length and put the cache into the hundreds of megabytes. A transform costs
     one matrix concat and adds NO draw calls — which is the constraint the
     ground-decal work established (js/render-decals.js): in this renderer the
     frame is priced in draw CALLS, not in vector ops.

   Nothing in here moves an actor. The stance offset that tucks a man behind a
   parapet is applied to his BODY, not to (x, y): targeting, cover rolls, the
   mouse-pick box, his HP bar and the inspector all keep reading the position the
   sim gave him. That is why the offset is capped at a few world units — a
   visual lie big enough to notice is a lie the player can click on.

   The one place the offset is honoured outside the renderer is the muzzle:
   animMuzzleOffset is added to the flash/tracer origin in js/shooting.js, so a
   man firing over sandbags throws his tracer from over the sandbags. */
'use strict';

// Per-actor animation state. Lazily created — actors are made in a dozen places
// (waves, events, paradrops, the Progenitor's brood, TEST.deploy) and none of
// them should have to know this file exists.
function initAnim(a) {
  const s = {
    gait: Math.random() * Math.PI * 2,    // phase, advanced by distance moved
    breathe: Math.random() * Math.PI * 2, // ...and this one by time; desynced per man
    moving: 0,                            // smoothed 0..1 "am I under way"
    px: a.x, py: a.y,                     // last tick's position: the gait's only input
    stance: 'stand',
    hold: rand(0, ANIM_STANCE_HOLD_MAX),  // stagger the first re-roll across the roster
    cover: null,                          // the wall he is tucked behind, if any
    engaged: 0,                           // counts down from the last shot he fired
    recoil: 0,                            // 0..1, decayed; set by animRecoil
    kick: 1,                              // how hard, scaled off the weapon
  };
  a.anim = s;
  return s;
}

// ---------------------------------------------------------------------------
// the tick
// ---------------------------------------------------------------------------

// One pass over both rosters, from update(). Deliberately NOT folded into
// updateUnit/updateEnemy: updateEnemy dispatches through a dozen per-faction AI
// paths that each return early, and half the actors on the field (parts, pods,
// wagons, garrisoned men) never reach the bottom of it. A separate pass covers
// every actor of every faction without knowing anything about any of them.
function updateAnims(dt) {
  if (dt <= 0) return;
  for (const u of G.units) if (!u.dead) tickAnim(u, dt);
  for (const e of G.enemies) if (!e.dead) tickAnim(e, dt);
}

function tickAnim(a, dt) {
  if (!a.t) return;
  const s = a.anim || initAnim(a);

  if (s.recoil > 0) s.recoil -= dt / ANIM_RECOIL_TIME;
  if (s.engaged > 0) s.engaged -= dt;

  // The gait phase advances by GROUND COVERED, not by dt. Same rule the Alien
  // Walker's legs are built on and for the same reason: a man slowed by wire, or
  // hurried by a charge order, must take the same length of stride either way —
  // a dt-driven phase makes his feet skate.
  const dx = a.x - s.px, dy = a.y - s.py;
  const moved = Math.hypot(dx, dy);
  s.px = a.x; s.py = a.y;
  s.gait += moved / ANIM_STRIDE * Math.PI * 2;
  s.breathe += dt * ANIM_BREATHE_RATE;

  // "moving" is smoothed rather than a bare test, so the sway eases in and out
  // instead of snapping on the frame a man takes his first step.
  const want = moved / dt > ANIM_MOVE_EPS ? 1 : 0;
  s.moving += (want - s.moving) * Math.min(1, dt * ANIM_MOVE_BLEND);

  if (animStanced(a)) tickStance(a, s, dt);
  else { s.stance = 'stand'; s.cover = null; }
}

// Stamp a recoil shove. Called from the fire paths rather than derived from a
// cooldown, because a cooldown says when the next round is due, not when this
// one went off — and a burst weapon's cooldown doesn't move between rounds.
// `mult` scales the shove; fireShot derives it from the round's damage, so a
// Springfield kicks harder than a grease gun with no per-type table.
function animRecoil(a, mult) {
  if (!a || a.dead) return;
  const s = a.anim || initAnim(a);
  s.recoil = 1;
  s.kick = mult == null ? 1 : mult;
  s.engaged = ANIM_ENGAGED_FOR;
}

// ---------------------------------------------------------------------------
// stance
// ---------------------------------------------------------------------------

// Who gets a firing stance at all. Everything excluded here is excluded because
// it has no knees: crews are buttoned into their vehicle, the staked guns are
// bolted to the ground, boss parts are hitboxes, and a mortarman is already
// crouched over his baseplate — his art draws the tube and the crate around him,
// and shrinking him would shrink those with him.
function animStanced(a) {
  const t = a.t;
  if (t.tank || t.vehicle || t.apc || t.bike || t.atgun || t.aagun || t.fixed) return false;
  if (t.boss || t.shipPart || t.bossPart || t.trainPart || t.ship || t.awalker || t.v2) return false;
  if (t.mortar) return false;
  if (a.chute > 0 || a.prone > 0) return false;   // a man under canopy or in the dirt has his own pose
  return true;
}

// How often a man of this type chooses to go down on one knee when he opens up.
// Rolled fresh each time the stance spell lapses, not fixed at spawn: the ask is
// that units SOMETIMES fire kneeling, and a per-man constant gives a field of
// permanent kneelers and permanent standers instead of a line that settles and
// shifts. Keyed on flags, not on a list of type keys, so a new type inherits a
// sensible value without anyone remembering this file exists.
function animKneelChance(a) {
  const t = a.t;
  if (t.faction === 'zo') return 0;          // the dead do not adopt a firing position
  if (t.flame) return 0.18;                  // a flamer has to close, so he stays on his feet
  if (t.aura || a.type === 'officer' || a.type === 'eoff') return 0.15;  // an officer stays up to be seen
  if (a.type === 'medic') return 0.3;
  // marksmen before automatics: a sniper carries a single-shot rifle, so he'd
  // otherwise fall past the burst test to the default and kneel least of the
  // three men who most want a steady platform
  if (a.type === 'sniper' || a.type === 'esniper' || a.type === 'jsniper') return 0.85;
  if (t.burst > 1) return 0.72;              // an automatic wants one too
  return 0.5;
}

function tickStance(a, s, dt) {
  s.hold -= dt;

  // A man under way is up and running, whatever the spell says — and the spell
  // is cleared so he re-picks the moment he halts, rather than standing in the
  // open for the remainder of a stance he chose two positions ago.
  if (s.moving > 0.3 || a.moveTo) {
    s.stance = 'stand';
    s.cover = null;
    s.hold = 0;
    return;
  }

  if (s.hold > 0) {
    // ...but a wall shot out from in front of him drops him at once. Holding a
    // cover pose against a wall that is no longer there is the one way this
    // could draw a man tucked behind nothing.
    if (s.stance !== 'cover' || (s.cover && s.cover.hp > 0)) return;
    s.hold = 0;
  }

  s.hold = rand(ANIM_STANCE_HOLD_MIN, ANIM_STANCE_HOLD_MAX);

  // Stance is a FIRING posture: a man with nothing to shoot at stands easy. That
  // is what makes the line visibly drop as a wave comes into range instead of
  // spending the whole breather on one knee.
  if (s.engaged <= 0) { s.stance = 'stand'; s.cover = null; return; }

  const w = animCoverWall(a);
  if (w) { s.stance = 'cover'; s.cover = w; return; }
  s.cover = null;
  s.stance = Math.random() < animKneelChance(a) ? 'kneel' : 'stand';
}

// The wall a man tucks behind. These are deliberately the SAME emplacements
// coverBlock rolls against (js/shooting.js) — if the pose showed a man behind a
// parapet that wasn't stopping rounds for him, the animation would be lying
// about a mechanic. The radii here are tighter than coverBlock's, though: cover
// reaches 26-38px, and a man at the outer edge of that is getting the dodge
// while standing nowhere near the bags. Inside ANIM_COVER_R he is AT the wall
// and gets the tucked pose; between that and coverBlock's radius he just kneels.
const ANIM_COVER_R = { bunker: 26, sandbags: 22 };

function animCoverWall(a) {
  if (a.side !== 'us') {
    // The Regio Esercito has its own works and its own way of resolving them
    // (js/update-enemies.js). A garrisoned man already carries the link to the
    // work he mans, so there is nothing to search — and no other faction builds.
    const w = a.work;
    return (w && w.hp > 0 && animWallAhead(a, w)) ? w : null;
  }
  for (const b of G.bunkers) {
    if (b.hp > 0 && dist2(b, a) < ANIM_COVER_R.bunker * ANIM_COVER_R.bunker
        && animWallAhead(a, b)) { a.anim.coverKind = 'bunker'; return b; }
  }
  for (const s of G.sandbags) {
    if (s.hp > 0 && dist2(s, a) < ANIM_COVER_R.sandbags * ANIM_COVER_R.sandbags
        && animWallAhead(a, s)) { a.anim.coverKind = 'sandbags'; return s; }
  }
  return null;
}

// Firing OVER a wall means the wall is between the man and what he is aiming at.
// Without this a man standing on the friendly side of his own parapet, shooting
// back down the field, would hunker against a wall at his back.
function animWallAhead(a, w) {
  return (w.x - a.x) * Math.cos(a.face) + (w.y - a.y) * Math.sin(a.face) > -2;
}

// ---------------------------------------------------------------------------
// the blit-time transform
// ---------------------------------------------------------------------------

// Where the cover pose slides a man's BODY: back along his own facing until he
// is just clear of the parapet's rear face, capped hard. Returns 0 for every
// other stance. Kept as a scalar along the facing axis rather than a free vector
// so the weapon, which is drawn out along that same axis, stays on the aim line.
function animCoverShift(a) {
  const s = a.anim;
  if (!s || s.stance !== 'cover' || !s.cover || s.cover.hp <= 0) return 0;
  const w = s.cover;
  const fx = Math.cos(a.face), fy = Math.sin(a.face);
  // how far the wall is AHEAD of him along his own aim line — so this is also
  // how far behind it he is standing, which is where he wants to be
  const d = (w.x - a.x) * fx + (w.y - a.y) * fy;
  const box = animWallBox(w, s.coverKind);
  // How deep the wall is along that same line: where a ray from its centre
  // leaves the box. NOT the box's support function (|fx|*hw + |fy|*hh) — that
  // measures the distance to a CORNER, and a sandbag wall is 44 long by 24 deep,
  // so a man firing obliquely across one would be told to stand 24 behind a
  // parapet only 12 thick, and every oblique shooter pegged the cap.
  const ext = Math.min(box.hw / Math.max(1e-4, Math.abs(fx)),
    box.hh / Math.max(1e-4, Math.abs(fy)));
  // he wants to sit just clear of its rear face. Positive = shove him back.
  return clamp(ext + ANIM_COVER_CLEAR - d, -ANIM_COVER_HUG, ANIM_COVER_HUG);
}

// A wall's footprint. The Regio Esercito's works carry a `kind` and their box on
// the kind table; the player's emplacements are told apart by which array they
// came out of, which animCoverWall recorded, and measure theirs in input.js
// beside the mouse-pick code. Both resolve to the same {hw, hh}.
function animWallBox(w, kind) {
  if (w.kind) {
    const k = IT_WORK_KINDS[w.kind];
    if (k && k.box) return k.box;
  }
  return emplacementBox(kind || 'sandbags');
}

// The offset the muzzle has to follow, so the flash and tracer leave the barrel
// the sprite is actually drawing rather than the one the sim imagines. Only the
// stance shift is included — the gait sway and the recoil kick are momentary and
// a flash that jittered with them would read as bad aim, not as animation.
function animMuzzleOffset(a) {
  if (!a || !a.anim) return null;
  const sh = animCoverShift(a);
  if (!sh) return null;
  return { x: -Math.cos(a.face) * sh, y: -Math.sin(a.face) * sh };
}

// Push an actor's motion transform. Everything drawn until the matching restore
// is displaced and scaled about the actor's own origin, so a call site keeps
// passing the world (x, y) it always passed. Returns false and pushes NOTHING
// when the actor has no animation state yet (the frame it spawns) — a
// save/restore pair for nothing is exactly the per-actor cost this layer exists
// to avoid.
//
// THE TRANSFORM MUST STAY AXIS-ALIGNED: translation and scale only, never a
// rotation. A soldier's facing is baked into 48 buckets (js/render-soldier.js)
// precisely so his blit goes down as an upright rectangle, and the rasteriser
// has a fast path for exactly that. A gait ROLL is the first thing anyone
// reaches for to sell a walk seen from above, and it throws that away for every
// moving man on the field. Measured interleaved on a 158-actor board, all of
// them actually drawn: this layer as it ships costs LESS than the frame's own
// run-to-run spread (medians 5.80 ms against 6.17 ms with it stubbed out — the
// difference is noise, the arms overlap), while adding a roll of a twentieth of
// a radian takes it to 8.57 ms. Three boards, three measurements, same
// direction. The footfall below is a NON-UNIFORM scale instead: it still
// rasterises as an upright rectangle, so it stays in the free tier, and from
// directly above a body widening and narrowing under its own weight reads as a
// step just as well as a roll would.
//
// Two traps if you re-run that measurement. Swapping this function out for a
// stub makes the call site megamorphic and deopts one arm, which produced
// contradictory numbers (a bare save/restore "costing" more than a save plus a
// scale); read a mode flag INSIDE one implementation instead. And staging the
// enemies at negative y leaves them culled by inView before drawSoldier is ever
// reached, so a "150-actor" board is really forty.
//
// Note what is NOT here: the stance's hunker. That is baked into the frame
// (js/render-soldier.js), so it costs nothing and — because a sprite pack ships
// one fixed image per man that this could only shrink — a pack's soldier keeps
// his full silhouette and still tucks in behind the wall, which is the same
// trade the pack seam makes everywhere: art bought with animation.
function pushActorAnim(a, c) {
  const s = a.anim;
  if (!s) return false;

  const fx = Math.cos(a.face), fy = Math.sin(a.face);
  let ox = 0, oy = 0, sx = 1, sy = 1;

  // the tucked-behind-the-parapet shift
  const sh = animCoverShift(a);
  if (sh) { ox -= fx * sh; oy -= fy * sh; }

  // gait: a lateral rock at the stride rate, a fore/aft surge at twice it (two
  // footfalls to a cycle), and the footfall squash those two hang off.
  const m = s.moving;
  if (m > 0.01) {
    const sw = Math.sin(s.gait) * m;
    ox += -fy * sw * ANIM_GAIT_SWAY;
    oy += fx * sw * ANIM_GAIT_SWAY;
    const su = Math.cos(s.gait * 2) * m * ANIM_GAIT_SURGE;
    ox += fx * su; oy += fy * su;
    const bob = Math.cos(s.gait * 2) * m * ANIM_GAIT_BOB;
    sx *= 1 - bob; sy *= 1 + bob;
  }

  // ...and the chest, while he is still. Cross-faded against the gait so the two
  // never sum into a wobble.
  if (m < 0.99) {
    const br = 1 + Math.sin(s.breathe) * ANIM_BREATHE * (1 - m);
    sx *= br; sy *= br;
  }

  // recoil, hardest on the frame the muzzle flashes
  if (s.recoil > 0) {
    const k = s.recoil * s.kick * ANIM_RECOIL_KICK;
    ox -= fx * k; oy -= fy * k;
  }

  if (!ox && !oy && sx === 1 && sy === 1) return false;
  c.save();
  c.translate(a.x + ox, a.y + oy);
  if (sx !== 1 || sy !== 1) c.scale(sx, sy);
  c.translate(-a.x, -a.y);
  return true;
}

// The vehicle flavour: an engine tremble so a parked tank is never a dead block
// of pixels, a suspension pitch while it rolls, and the main gun's shove. All of
// it an order of magnitude under a soldier's gait — thirty tons does not bob.
function pushVehicleAnim(a, c) {
  const s = a.anim;
  if (!s) return false;
  const idle = Math.sin(s.breathe * ANIM_VEH_IDLE_RATE) * ANIM_VEH_IDLE;
  let ox = idle * 0.6, oy = idle;
  let sx = 1, sy = 1;
  if (s.moving > 0.01) {
    // pitch: the hull squats and rises over the ground it is crossing
    const p = Math.sin(s.gait * 0.5) * s.moving * ANIM_VEH_PITCH;
    sx = 1 + p; sy = 1 - p;
  }
  if (s.recoil > 0) {
    const k = s.recoil * s.kick * ANIM_RECOIL_VEH;
    const b = a.turret != null ? a.turret : a.face;
    ox -= Math.cos(b) * k; oy -= Math.sin(b) * k;
  }
  c.save();
  c.translate(a.x + ox, a.y + oy);
  if (sx !== 1 || sy !== 1) c.scale(sx, sy);
  c.translate(-a.x, -a.y);
  return true;
}
