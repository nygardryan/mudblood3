/* Trenchworks: WW2 — blit-based sprite layer.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html.

   The render path every cached bitmap flows through. Today a bitmap is produced
   by running a procedural draw function once into an offscreen canvas, then
   blitted every frame instead of re-tracing hundreds of vector ops. When real
   sprite-sheet art lands, ONLY the bitmap's source changes: makeSprite's renderFn
   becomes an <img>/atlas frame, while the sprite record shape ({img, w, h, ax,
   ay}), the (facing, frame) cache key, and every blitSprite() call site stay put.
   `img` is anything drawImage accepts — a <canvas> now, an <img> later. */
'use strict';

// Device pixels per world unit to bake cached sprites at — exactly the density
// the main canvas is backed at, so a blit neither loses nor wastes detail. That
// is the ground layer's density: desktop backs the world 1:1 (bake ×1, a pixel
// match to the live vector draw), mobile zoom upscales it (bake denser, 1..4,
// capped to bound memory). Baking finer than this only pays for a downscale the
// backing store immediately throws away.
function spriteSupersample() {
  return (typeof groundRenderScale === 'function') ? groundRenderScale() : 1;
}

// Build a sprite record from a procedural renderer. `w`,`h` are the bitmap's
// footprint in WORLD units; (ax,ay) is where the entity origin sits inside that
// box (a centred sprite uses ax=w/2, ay=h/2). renderFn(c) draws in world-local
// coordinates with the origin at (0,0); the context is pre-scaled by the
// supersample factor so it may draw exactly as it would straight to the main
// canvas. The whole footprint [-ax, w-ax] × [-ay, h-ay] must contain the art —
// anything outside is clipped away.
function makeSprite(w, h, ax, ay, renderFn) {
  const ss = spriteSupersample();
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(w * ss));
  cv.height = Math.max(1, Math.ceil(h * ss));
  const c = cv.getContext('2d');
  c.setTransform(ss, 0, 0, ss, ax * ss, ay * ss);
  renderFn(c);
  return { img: cv, w, h, ax, ay, ss };
}

// Draw a sprite record at world (x,y), rotated by `rot`, faded by `alpha`. This
// is the seam that stays byte-for-byte identical once art comes from image files.
// alpha multiplies the inherited globalAlpha so it composes with effects the
// caller already set up (e.g. a camouflaged unit drawn at 0.4).
function blitSprite(c, rec, x, y, rot, alpha) {
  c.save();
  if (alpha != null && alpha < 1) c.globalAlpha *= alpha;
  c.translate(x, y);
  if (rot) c.rotate(rot);
  c.drawImage(rec.img, -rec.ax, -rec.ay, rec.w, rec.h);
  c.restore();
}

// Shared cache for bitmaps many entities reuse — keyed by an identity string such
// as `type|facing|frame`. Per-entity one-off sprites (corpses) attach their record
// to the entity instead, so it's freed when the entity is. Cleared on a density
// change so bakes follow the current supersample factor.
const _spriteCache = new Map();

function sprite(key, w, h, ax, ay, renderFn) {
  let rec = _spriteCache.get(key);
  if (!rec || rec.ss !== spriteSupersample()) {
    rec = makeSprite(w, h, ax, ay, renderFn);
    _spriteCache.set(key, rec);
  }
  return rec;
}

function clearSpriteCache() {
  _spriteCache.clear();
}

// Snap a world angle to one of `n` evenly spaced facing buckets — for bodies that
// mix screen-fixed and facing-relative parts (so they can't just rotate at blit).
function faceBucket(angle, n) {
  return ((Math.round(angle / (Math.PI * 2) * n) % n) + n) % n;
}
