/* Trenchworks: WW2 — the Alien Walker, the wave-666 easter egg.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// This file holds the first WALK CYCLE in the game. Everything else that
// "animates" here is a countdown timer decremented in the AI and read by a
// renderer (fireT, dropT, slashT); the closest thing to a gait anywhere else is
// the zombie hound's four legs, which are a static hard-coded mid-stride pose
// with no time term in them at all.
//
// Two rules make this read as walking rather than as wiggling, and both are in
// awLeg below. The phase is advanced by DISTANCE MOVED (in updateAlienWalker),
// not by dt; and during stance the foot slides straight BACKWARD in body
// coordinates at exactly the body's forward rate, so it is motionless in world
// space — guaranteed by arithmetic rather than tuned. Stop the walker and the
// phase stops and the feet just sit there, for free.
//
// paintAlienWalker must stay free of G reads: the codex builds a bare
// makeEnemy() with a stubbed-out G to shoot its portrait (the paintYamatoHull
// rule). The gait phase therefore lives on the actor and takes a `|| 0`.

// Cold, near-black chitin under a cyan emissive. Deliberately NOT olive, khaki,
// grey or field-green: it has to sit against Western Front mud, Pacific ash,
// blighted earth AND North African desert without reading as either army's kit,
// and the two light biomes are what rule out anything mid-value.
const AWK_SHELL = '#242a33';
const AWK_SHELL_DK = '#13161c';
const AWK_SHELL_LT = '#39424f';
const AWK_LIMB = '#39424f';
const AWK_LIMB_DK = '#161a20';
const AWK_GLOW = '#6ff0ff';
const AWK_GLOW_DIM = '#2b7f8c';
const AWK_HOT = '#eafeff';

// One leg, in the walker's local frame: origin under the hull, +y down the
// screen, +x the direction of travel via `fwd`. `phase` is this leg's point in
// the cycle, 0..1.
//
// The stance branch is the whole trick. walkT advances by (distance moved /
// AW_STRIDE), and stance occupies AW_DUTY of the cycle against AW_DUTY *
// AW_STRIDE of ground covered — so sliding the foot back by that excursion
// exactly cancels the body's motion and the foot does not move in the world.
// There is no sine in the stance at all: a sine here is precisely what makes
// every attempt at a walk cycle look like a table jiggling its legs.
function awLeg(c, hx, hy, gy, phase, fwd) {
  const ex = AW_STRIDE * AW_DUTY;                 // stance excursion
  let fx, fy;
  if (phase < AW_DUTY) {
    const s = phase / AW_DUTY;                    // 0..1 through the plant
    fx = hx + fwd * ex * (0.5 - s);
    fy = gy;                                      // no lift: it is ON the ground
  } else {
    const s = (phase - AW_DUTY) / (1 - AW_DUTY);
    // smoothstep, so the foot snaps forward and SETTLES. A linear recovery
    // reads as a drift rather than as a step being taken.
    const k = s * s * (3 - 2 * s);
    fx = hx + fwd * ex * (k - 0.5);
    fy = gy - Math.sin(s * Math.PI) * AW_LIFT;
  }

  // Two-bone IK, law of cosines. `base + bend * fwd` forces the knee BACKWARD
  // and up every time: a reverse knee is the single thing separating a walker
  // from a table with legs, and picking the elbow solution by sign means it can
  // never flip mid-stride the way a min-y comparison between the two would.
  const dx = fx - hx, dy = fy - hy;
  const d = Math.max(0.01, Math.min(Math.hypot(dx, dy), AW_THIGH + AW_SHIN - 0.01));
  const base = Math.atan2(dy, dx);
  const bend = Math.acos(clamp(
    (d * d + AW_THIGH * AW_THIGH - AW_SHIN * AW_SHIN) / (2 * d * AW_THIGH), -1, 1));
  const ka = base + bend * fwd;
  const kx = hx + Math.cos(ka) * AW_THIGH;
  const ky = hy + Math.sin(ka) * AW_THIGH;

  c.lineCap = 'round';
  c.strokeStyle = AWK_LIMB_DK; c.lineWidth = 4.4;
  c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.lineTo(fx, fy); c.stroke();
  c.strokeStyle = AWK_LIMB; c.lineWidth = 1.9;
  c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.lineTo(fx, fy); c.stroke();
  c.fillStyle = AWK_LIMB_DK;
  c.beginPath(); c.arc(kx, ky, 2.7, 0, 7); c.fill();
  c.beginPath(); c.ellipse(fx, fy, 4, 1.7, 0, 0, 7); c.fill();
  c.lineCap = 'butt';
}

// The carapace and the emitter, slung high on the legs. Local space, no G reads.
//
// Two things here are corrections of a first draft that read as a flying
// saucer. The body is a HUNCHED shape — a narrow crown over a wider haunch,
// with a hip yoke bridging to the legs — not a symmetrical disc, because a wide
// smooth ellipse is the one silhouette the eye will always call a saucer. And
// the emitter is slung out FRONT on a stalk rather than sitting at the hull
// centre: the muzzle bloom is bright enough to erase whatever is behind it, and
// at the centre it erased the entire walker every time it fired.
function awHull(c, bob, charge) {
  const hy = AW_HULL_Y + bob;

  // hip yoke: the legs visibly hang off something
  c.fillStyle = AWK_SHELL_DK;
  c.beginPath(); c.ellipse(0, hy + 9, 12, 5.5, 0, 0, 7); c.fill();

  // haunch, then the narrower crown above it — a hunched body, not a disc
  c.fillStyle = AWK_SHELL;
  c.strokeStyle = AWK_SHELL_DK;
  c.lineWidth = 1.4;
  c.beginPath(); c.ellipse(0, hy + 2, 15, 9.5, 0, 0, 7); c.fill(); c.stroke();
  c.fillStyle = AWK_SHELL_LT;
  c.beginPath(); c.ellipse(-1, hy - 5, 9.5, 6.5, -0.12, 0, 7); c.fill();
  c.strokeStyle = AWK_SHELL_DK;
  c.lineWidth = 1;
  c.beginPath(); c.ellipse(-1, hy - 5, 9.5, 6.5, -0.12, 0, 7); c.stroke();
  // plating seams down the haunch
  c.lineWidth = 0.9;
  for (const sx of [-7.5, 0, 7.5]) {
    c.beginPath(); c.moveTo(sx, hy - 3); c.lineTo(sx, hy + 10); c.stroke();
  }

  // the emitter stalk, out the front and below the crown
  const eyeX = 0, eyeY = hy + 11;
  c.strokeStyle = AWK_LIMB_DK;
  c.lineWidth = 3.2;
  c.beginPath(); c.moveTo(0, hy + 3); c.lineTo(eyeX, eyeY); c.stroke();

  // `charge` is 0..1 through the telegraph, so the eye visibly spools up before
  // the sweep. Glow is stacked translucent arcs — there is no ctx.shadowBlur
  // anywhere in this codebase, and the flame stream blooms the same way.
  const gr = 2.6 + charge * 2.2;
  const a0 = c.globalAlpha;
  for (const [rr, aa] of [[gr * 2.4, 0.10], [gr * 1.6, 0.18], [gr * 1.1, 0.32]]) {
    c.globalAlpha = a0 * aa;
    c.fillStyle = AWK_GLOW;
    c.beginPath(); c.arc(eyeX, eyeY, rr, 0, 7); c.fill();
  }
  c.globalAlpha = a0;
  c.fillStyle = charge > 0 ? AWK_HOT : AWK_GLOW;
  c.beginPath(); c.arc(eyeX, eyeY, gr * 0.66, 0, 7); c.fill();
  c.fillStyle = AWK_GLOW_DIM;
  c.beginPath(); c.arc(eyeX, eyeY, gr * 0.3, 0, 7); c.fill();
}

// PURE: local space, origin at the hull centre, reads nothing but the actor's
// own fields. The codex portrait swaps G out for a stub, so a G.time read here
// would be an undefined feeding straight into a transform.
function paintAlienWalker(c, a) {
  const walk = a.walkT || 0;
  const fwd = (a.awLane || 1) >= 0 ? 1 : -1;
  const charge = a.awPhase === 'charge'
    ? clamp(1 - (a.awT || 0) / AW_CHARGE_T, 0, 1)
    : a.awPhase === 'sweep' ? 1 : 0;
  const gy = AW_GROUND_Y;

  c.save();
  // ground shadow first, wide and soft — it is what anchors the feet visually
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.beginPath(); c.ellipse(0, gy - 1, 24, 5.5, 0, 0, 7); c.fill();

  // three footfalls per cycle, so the hull rides at 3x the stride frequency.
  // Kept to AW_BOB — any more and the body reads as bouncing.
  const bob = -Math.sin(walk * Math.PI * 6) * AW_BOB;

  // Far leg FIRST, so it reads as being on the other side of the hull. The
  // offsets are 1/3 apart, which against AW_DUTY = 2/3 puts exactly one foot in
  // the air at every instant — the gait never has a moment of ambiguity.
  awLeg(c, 0, AW_HULL_Y + bob + 6, gy, (walk + 1 / 3) % 1, fwd);
  awHull(c, bob, charge);
  awLeg(c, -AW_HIP_R, AW_HULL_Y + bob + 9, gy, (walk + 2 / 3) % 1, fwd);
  awLeg(c, AW_HIP_R, AW_HULL_Y + bob + 9, gy, walk, fwd);
  c.restore();
}

// wide HP bar + a state read-out, in the multi-segment bosses' idiom but with
// one bar: this thing has no phases to break through.
function drawAlienWalkerOverlays(a) {
  const c = ctx;
  const bw = 76;
  const x0 = a.x - bw / 2, y0 = a.y + AW_GROUND_Y + 8;
  const f = clamp(a.hp / a.maxhp, 0, 1);
  c.fillStyle = 'rgba(0,0,0,0.62)';
  c.fillRect(x0 - 1, y0 - 1, bw + 2, 7);
  c.fillStyle = f > 0.5 ? '#5fd0c0' : f > 0.25 ? '#c07a2e' : '#d04030';
  c.fillRect(x0, y0, bw * f, 5);
  c.fillStyle = 'rgba(228,224,208,0.9)';
  c.font = '7px monospace';
  c.textAlign = 'center';
  c.fillText('ALIEN WALKER', a.x, y0 + 14);
  c.textAlign = 'left';   // ctx.textAlign is global state, always put it back
}

function drawAlienWalkerPass() {
  for (const e of G.enemies) {
    if (!e.t.awalker || e.dead) continue;
    if (!inView(e.x, e.y, 90)) continue;
    // a pack ships one neutral-stance frame; the walk cycle is procedural
    const ext = SPRITES.get('walker_awalker');
    if (ext) {
      blitSprite(ctx, ext, e.x, e.y, 0, 1);
    } else {
      ctx.save();
      ctx.translate(e.x, e.y);
      paintAlienWalker(ctx, e);
      ctx.restore();
    }
    drawAlienWalkerOverlays(e);
  }
}

// The lance itself, and the aiming line that precedes it. Drawn in the EFFECTS
// layer rather than in the pass above, so it paints over the troops it is
// cutting through instead of under them.
//
// Only a narrow TRAILING wedge is drawn behind the beam, not the whole swept
// sector: a 527px sector at any visible alpha is a full-screen overdraw every
// frame and it washes the entire battlefield out.
function drawAlienBeams() {
  for (const e of G.enemies) {
    if (!e.t.awalker || e.dead) continue;
    // the lance leaves the emitter on the stalk, not the actor's own point —
    // these must stay in step with awHull's eyeY or the beam floats free
    const ex = e.x, ey = e.y + AW_HULL_Y + 11;

    if (e.awPhase === 'charge') {
      // the telegraph: a thin line down the bearing the sweep will open on.
      // This is the player's window to walk men out of the arc.
      const k = clamp(1 - (e.awT || 0) / AW_CHARGE_T, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.25 + k * 0.45;
      ctx.strokeStyle = AWK_GLOW;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(e.awFrom) * AW_BEAM_RANGE, ey + Math.sin(e.awFrom) * AW_BEAM_RANGE);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      continue;
    }
    if (e.awPhase !== 'sweep') continue;

    const tx = ex + Math.cos(e.awAng) * AW_BEAM_RANGE;
    const ty = ey + Math.sin(e.awAng) * AW_BEAM_RANGE;
    ctx.save();
    // the burn trailing the beam
    const trail = e.awAng - e.awDir * 0.35;
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = AWK_GLOW_DIM;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.arc(ex, ey, AW_BEAM_RANGE, Math.min(trail, e.awAng), Math.max(trail, e.awAng));
    ctx.closePath();
    ctx.fill();
    // the lance: stacked strokes, widest and faintest first
    for (const [lw, al, col] of [[16, 0.10, AWK_GLOW], [9, 0.20, AWK_GLOW],
      [4.5, 0.55, AWK_GLOW], [1.6, 0.95, AWK_HOT]]) {
      ctx.globalAlpha = al;
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(tx, ty); ctx.stroke();
    }
    // muzzle bloom at the emitter
    for (const [rr, aa] of [[13, 0.16], [8, 0.3], [4, 0.7]]) {
      ctx.globalAlpha = aa;
      ctx.fillStyle = AWK_HOT;
      ctx.beginPath(); ctx.arc(ex, ey, rr, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
