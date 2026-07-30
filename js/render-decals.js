/* Trenchworks: WW2 — the ground decal layer.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html.

   Blood and craters are the single biggest cost in the frame, and the reason a
   long run gets slower the longer it lasts: `G.groundMarks` is uncapped, accrues
   at ~30 marks/s in a sustained fight and holds them for GROUND_MARK_TTL, so a
   12-minute endless run reaches ~1,500 decals and `draw()` climbs from 0.5 ms to
   26 ms tracking that count almost exactly. Each mark is only one or two ellipse
   fills — the cost is the ~2,500 separate draw CALLS, 70% of everything the frame
   issues, not what is inside them. (That is also why the sprite migration cannot
   fix it: a per-mark blit trades one ellipse for one drawImage and measured
   SLOWER. See the ground-marks-render-cost note.)

   So marks are stamped ONCE into an offscreen bitmap that is blitted whole, next
   to the ground bitmap it matches pixel for pixel. Marks never move, and
   `alpha = clamp(ttl / GROUND_MARK_FADE, 0, 1)` sits at 1.0 for 112 of a mark's
   120 s, so the layer is correct for long stretches with no work at all.

   Two things it has to get right, and they pull against each other:

   - A new mark must appear the frame it is made, or a hit stops drawing blood.
     Hence stampDecal() off addGroundMark(), rather than waiting for a rebuild.
   - Fading and expiry can only be applied by REDRAWING the layer, since a canvas
     cannot un-draw one stamp. A full rebuild is ~6 ms at 1,500 marks, and
     dropping that into one frame twice a second is a worse artefact than the
     cost this file removes — it is a dropped frame you can see, on a cadence.
     So the rebuild is double-buffered and PROGRESSIVE: DECAL_PASS_BUDGET marks
     per frame into a back canvas, swapped in when it is complete. Per-frame cost
     stays flat, which is the entire point.

   The layer is where sprite art for marks belongs, and the one place in the
   renderer where art is free: a pack's PNG is stamped once per mark like the
   procedural splat it replaces, so it costs nothing per frame. */
'use strict';

// Marks stamped per frame while a rebuild pass runs. ~150 is a quarter of a
// millisecond of stamping and clears a 3,000-mark field inside 20 frames, well
// under the interval below.
const DECAL_PASS_BUDGET = 150;
// Shortest gap between rebuild passes. The fade it is applying runs over
// GROUND_MARK_FADE seconds, so half-second steps in a mark's alpha are invisible.
const DECAL_PASS_INTERVAL = 0.5;

let decalFront = null, decalFrontCtx = null;   // blitted every frame
let decalBack = null, decalBackCtx = null;     // the rebuild in progress
let decalSS = 0;                 // display density both canvases were sized at
let decalPass = null;            // snapshot of G.groundMarks being stamped, or null
let decalPassI = 0;
let decalPassMinTtl = Infinity;  // lowest ttl seen this pass — schedules the next one
let decalNextPass = 0;           // G.time the next pass may start

function makeDecalCanvas(ss) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(W * ss));
  cv.height = Math.max(1, Math.round(H * ss));
  const c = cv.getContext('2d');
  // pre-scaled like paintGround's, so a mark stamps in plain world coordinates
  c.setTransform(ss, 0, 0, ss, 0, 0);
  return { cv, c };
}

function clearDecalCanvas(cv, c) {
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, cv.width, cv.height);
  c.restore();
}

// Size both canvases to the current display density. Returns true when they were
// (re)made, i.e. the front is blank and owes a full stamp. Mirrors the `ss` guard
// sprite() and drawCorpse's re-bake use: mobile zoom changes the density
// mid-run, and a bitmap baked at the old one would resample forever.
function ensureDecalCanvases() {
  const ss = groundRenderScale();
  if (decalFront && decalSS === ss) return false;
  const f = makeDecalCanvas(ss), b = makeDecalCanvas(ss);
  decalFront = f.cv; decalFrontCtx = f.c;
  decalBack = b.cv; decalBackCtx = b.c;
  decalSS = ss;
  return true;
}

// Stamp every live mark at once. For the cases where the layer has to be right
// THIS frame rather than within a pass: a new game (where the list is empty, so
// it costs nothing) and a density change (where a progressive pass would leave a
// half-built field on screen for a few frames).
function stampAllDecals() {
  clearDecalCanvas(decalFront, decalFrontCtx);
  decalPass = null;
  if (!G || !G.groundMarks) return;
  for (const m of G.groundMarks) drawGroundMark(m, decalFrontCtx);
  decalNextPass = G.time + DECAL_PASS_INTERVAL;
}

function resetDecals() {
  decalFront = null;             // force a resize against the new game's density
  decalPass = null;
  decalPassI = 0;
  decalNextPass = 0;
  ensureDecalCanvases();
  stampAllDecals();
}

// One new mark, stamped the frame it is made so a hit draws blood immediately
// instead of on the next rebuild. It goes onto the back canvas as well while a
// pass is in flight — the pass works from a snapshot taken before this mark
// existed, so without this the swap would drop every mark made during it.
function stampDecal(m) {
  if (!decalFront) ensureDecalCanvases();
  drawGroundMark(m, decalFrontCtx);
  if (decalPass) drawGroundMark(m, decalBackCtx);
  // The schedule below sleeps until the OLDEST mark on the field starts to fade,
  // which assumes every mark outlives the ones before it. addGroundMark defaults
  // them all to GROUND_MARK_TTL so that holds today — but the ttl is spread from
  // the caller's object and therefore overridable, and a shorter-lived mark would
  // sit on the layer long past its own expiry. One compare keeps the horizon honest.
  const due = G.time + Math.max(0, m.ttl - GROUND_MARK_FADE);
  if (due < decalNextPass) decalNextPass = due;
}

// The layer holds baked pixels, so it is the one consumer in the renderer that
// cannot notice art changing under it — a sprite pack finishing its async load,
// or the player toggling one off, has to say so.
function invalidateDecals() {
  decalPass = null;
  decalNextPass = 0;
}

// Called at the end of update(), AFTER compaction, so a pass never stamps a mark
// the same frame's cleanup has just spliced out.
function updateDecals() {
  if (ensureDecalCanvases()) { stampAllDecals(); return; }
  if (!decalPass) {
    if (G.time < decalNextPass) return;
    // a snapshot, not the live array: compaction splices expired marks out
    // mid-pass, and walking a shifting array by index would skip marks
    decalPass = G.groundMarks.slice();
    decalPassI = 0;
    decalPassMinTtl = Infinity;
    clearDecalCanvas(decalBack, decalBackCtx);
  }
  const end = Math.min(decalPass.length, decalPassI + DECAL_PASS_BUDGET);
  for (; decalPassI < end; decalPassI++) {
    const m = decalPass[decalPassI];
    if (m.ttl <= 0) continue;    // expired since the snapshot; it is at alpha 0 anyway
    if (m.ttl < decalPassMinTtl) decalPassMinTtl = m.ttl;
    drawGroundMark(m, decalBackCtx);
  }
  if (decalPassI < decalPass.length) return;

  const cv = decalFront, c = decalFrontCtx;
  decalFront = decalBack; decalFrontCtx = decalBackCtx;
  decalBack = cv; decalBackCtx = c;
  decalPass = null;
  // Nothing on the layer can change until the oldest mark starts to fade, so
  // sleep until then rather than rebuilding a field that cannot have moved.
  // Once anything IS fading this floors at the interval and the layer rebuilds
  // on that cadence, which is what the progressive pass exists to make cheap.
  const idle = decalPassMinTtl === Infinity ? 0 : decalPassMinTtl - GROUND_MARK_FADE;
  decalNextPass = G.time + Math.max(DECAL_PASS_INTERVAL, idle);
}

// Blitted in world space exactly like groundCanvas, immediately after it — so
// the camera transform clips it the same way and no per-mark cull is needed.
function drawDecalLayer() {
  if (ensureDecalCanvases()) stampAllDecals();
  ctx.drawImage(decalFront, 0, 0, W, H);
}
