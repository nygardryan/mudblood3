/* Trenchworks: WW2 — the fog bank.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html.

   The fog event is one countdown (G.fog) that cuts every acquisition range in
   the game to 60% (fogMult, js/shooting.js) and one thing to look at. The look
   was a flat grey fillRect over the whole field at a fixed alpha: it snapped on
   the frame the banner fired, sat perfectly still for twenty-five seconds and
   faded out. That reads as a tint laid over the SCREEN, not as weather on the
   field, and it is the only event in the game that never moves.

   What it is now is a bank of drifting cloud composed on its own offscreen and
   blitted once. Cost is a handful of full-field fills however thick the fog
   gets — there is no per-puff anything to cap the way the smokescreen has to —
   and nothing at all while no fog is up. Two things carry the read, and each is
   there because the flat wash lacked it:

   - It DRIFTS on G.wind — the same one vector per run the smokescreen rides, so
     a run's weather is one weather. The three layers scroll at different
     fractions of it and shear a few degrees off it, which is what churns them
     against each other: one layer at one speed is moving wallpaper, and reads as
     the camera sliding rather than as air.
   - It has DEPTH. Near-solid at the enemy treeline, thin over the player's own
     trench, because the whole point of the event is that the far end of the
     field is where sight is lost. It also keeps the men the player is actually
     commanding legible while the ground they are shooting at dissolves.

   Two notes for anyone tuning it. The layer is composed at FOG_LAYER_DIV of
   field resolution and never at groundRenderScale(), because the six full-field
   fills that build it are the entire cost of the effect: at 1:1 they measured
   +26.6 ms a frame under software rasterization (interleaved ablation, median
   of 11), which is the whole frame budget spent on weather. There is nothing on
   the layer but soft gradients, so a quarter-scale buffer loses none of it —
   shot side by side, the two are indistinguishable — and the same six fills
   measure +1.0 ms. Nothing else in the renderer may follow this example: it
   works here only because every edge on the layer is already blurrier than four
   pixels. And the drift phase runs off the bank's OWN age rather than G.time,
   which is what lets the settling gust decay smoothly: a speed factor applied
   to a G.time phase shifts the pattern by the whole run's length the instant
   the factor changes.

   The bank does NOT sweep in across the field — it was built that way first,
   with the front coming down out of the enemy's treeline, and the sweep was cut
   deliberately. It arrives by fading up in place over FOG_FADE_IN. */
'use strict';

const FOG_FADE_IN = 3;        // seconds the bank takes to come up to full weight
const FOG_LIFT = 4;           // seconds it thins away over at the end
const FOG_ALPHA = 0.84;       // ceiling on the thickest part of the thickest layer
const FOG_DEPTH_NEAR = 0.36;  // share of that left over the deploy trench
const FOG_BREATHE = 0.05;     // slow swell, so a settled bank is never quite still
const FOG_GUST = 1.6;         // extra wind, decaying to none as the bank settles
const FOG_REBAKE_TURN = 0.12; // radians the wind may back before the tiles are re-cut
// The bank is composed at a fraction of field resolution and blitted back up.
// Everything on the layer is a soft gradient, so there is nothing in it a
// quarter-scale buffer can lose — and it is the difference between the effect
// costing a frame and costing nothing. See the note at the top of the file.
const FOG_LAYER_DIV = 4;

// Three cloud layers, coarse to fine. `tile` is the pattern's repeat period —
// they are deliberately different and share no common factor, so the layers
// never line up into a visible grid however long the fog stands. `base` is a
// flat wash under the blobs: only the coarsest layer has one, so the bank has no
// holes torn in it, while the two above are pure texture. `stretch` draws each
// blob out along the drift, which is most of what separates fog from a mottle —
// a field of round blobs reads as camouflage, the same trap the biome ground
// hit (see the GROUND_BIOMES notes in CLAUDE.md).
const FOG_LAYERS = [
  { tile: 296, base: 0.22, blobs: 9,  r0: 74, r1: 132, a: 0.18, stretch: 2.1, speed: 0.28, shear: -0.28, alpha: 1.00 },
  { tile: 232, base: 0,    blobs: 13, r0: 40, r1: 82,  a: 0.17, stretch: 2.6, speed: 0.60, shear:  0.18, alpha: 0.80 },
  { tile: 168, base: 0,    blobs: 18, r0: 20, r1: 44,  a: 0.13, stretch: 3.4, speed: 1.18, shear: -0.12, alpha: 0.55 },
];

let fogCanvas = null, fogCtx = null;
let fogPatterns = null;              // one CanvasPattern per layer
let fogTileDir = null;               // the wind the patterns were cut against
let fogDepth = null, fogTint = null; // the two full-field gradients, built with the canvas

// One layer's cloud, baked seamless so it can tile forever. `ang` is the
// direction the layer will drift: blobs are drawn out along it, so a wisp is
// stretched the way it is travelling rather than across it.
function bakeFogTile(spec, ang) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = spec.tile;
  const c = cv.getContext('2d');
  if (spec.base > 0) {
    c.fillStyle = `rgba(255,255,255,${spec.base})`;
    c.fillRect(0, 0, spec.tile, spec.tile);
  }
  // 'lighter' so overlapping blobs BUILD density instead of the last one drawn
  // deciding it — a bank has to have thick and thin in it or it is a flat wash
  // with a pattern printed on it, which is what it is replacing.
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < spec.blobs; i++) {
    const x = rand(0, spec.tile), y = rand(0, spec.tile), r = rand(spec.r0, spec.r1);
    const reach = r * spec.stretch;
    // nine copies: whatever runs off one edge comes back on the opposite one, so
    // the tile repeats with no seam. Wisps are wider than the tile is, so this
    // is what makes the period invisible rather than merely hiding the join.
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const bx = x + ox * spec.tile, by = y + oy * spec.tile;
        if (bx + reach < 0 || bx - reach > spec.tile || by + reach < 0 || by - reach > spec.tile) continue;
        c.save();
        c.translate(bx, by);
        c.rotate(ang);
        c.scale(spec.stretch, 1);
        // the gradient is built AFTER the transform, so it stretches with it
        const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, `rgba(255,255,255,${spec.a})`);
        g.addColorStop(0.5, `rgba(255,255,255,${spec.a * 0.42})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g;
        c.fillRect(-r, -r, r * 2, r * 2);
        c.restore();
      }
    }
  }
  return cv;
}

// The patterns are cut against the wind rather than rotated at draw time: the
// wind only turns between waves (shiftWindForWave), so a bank is baked once and
// then stands, and every frame stays one axis-aligned fill per layer instead of
// a rotated one covering the field's diagonal.
function ensureFogTiles(dir) {
  if (fogTileDir !== null && Math.abs(normalizeAngle(dir - fogTileDir + Math.PI) - Math.PI) < FOG_REBAKE_TURN) return;
  fogTileDir = dir;
  fogPatterns = FOG_LAYERS.map(s => fogCtx.createPattern(bakeFogTile(s, dir + s.shear), 'repeat'));
}

function ensureFogLayer() {
  if (fogCanvas) return;
  fogCanvas = document.createElement('canvas');
  fogCanvas.width = Math.ceil(W / FOG_LAYER_DIV);
  fogCanvas.height = Math.ceil(H / FOG_LAYER_DIV);
  fogCtx = fogCanvas.getContext('2d');
  // Everything below is written in plain world coordinates and scaled on the way
  // in, so the buffer's size is one constant and not a term in the tuning.
  fogCtx.scale(1 / FOG_LAYER_DIV, 1 / FOG_LAYER_DIV);

  // depth: full weight at the treeline (the left edge), thinning to
  // FOG_DEPTH_NEAR over the player's own trench on the right. Applied as
  // destination-in, so it scales the cloud's own alpha rather than adding a
  // second wash of its own.
  fogDepth = fogCtx.createLinearGradient(0, 0, W, 0);
  fogDepth.addColorStop(0, 'rgba(255,255,255,1)');
  fogDepth.addColorStop(FORWARD_X / W, 'rgba(255,255,255,0.88)');
  fogDepth.addColorStop(DEPLOY_X / W, `rgba(255,255,255,${FOG_DEPTH_NEAR + 0.1})`);
  fogDepth.addColorStop(1, `rgba(255,255,255,${FOG_DEPTH_NEAR})`);

  // light: cold and flat at the far end where it is all sky, warmer down-field
  // where the ground is lit through it. Opaque colours under source-atop, which
  // tints what is already there without touching its alpha.
  fogTint = fogCtx.createLinearGradient(0, 0, W, 0);
  fogTint.addColorStop(0, '#c2cdd0');
  fogTint.addColorStop(0.55, '#cdd2c9');
  fogTint.addColorStop(1, '#d8d4c3');
}

function fogWrap(v, period) {
  return ((v % period) + period) % period;
}

// How far this bank has drifted, in seconds of wind. The gust is the arrival:
// extra wind decaying linearly to none as the bank settles, integrated here so
// the result is a DISTANCE and the pattern never lurches when the rate changes.
function fogTravel(age) {
  const gust = age < FOG_FADE_IN
    ? FOG_GUST * (age - age * age / (2 * FOG_FADE_IN))
    : FOG_GUST * FOG_FADE_IN / 2;
  return age + gust;
}

// Build the bank on its own buffer, at the age it has reached.
function fogCompose(age) {
  const wind = G.wind || { dir: 0, speed: WIND_SPEED_MIN };
  ensureFogTiles(wind.dir);
  const travel = fogTravel(age);
  const c = fogCtx;
  const k = 1 / FOG_LAYER_DIV;
  c.setTransform(k, 0, 0, k, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, W, H);
  for (let i = 0; i < FOG_LAYERS.length; i++) {
    const s = FOG_LAYERS[i];
    const d = wind.dir + s.shear, v = wind.speed * s.speed * travel;
    // wrapped into one period: the pattern is identical either way, and it keeps
    // the offsets small however long a run goes on
    const ox = fogWrap(Math.cos(d) * v, s.tile);
    const oy = fogWrap(Math.sin(d) * v, s.tile);
    c.globalAlpha = s.alpha;
    c.setTransform(k, 0, 0, k, ox * k, oy * k);  // a pattern is anchored to the transform
    c.fillStyle = fogPatterns[i];
    c.fillRect(-ox, -oy, W, H);
  }
  c.setTransform(k, 0, 0, k, 0, 0);
  c.globalAlpha = 1;

  c.globalCompositeOperation = 'destination-in';
  c.fillStyle = fogDepth;
  c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = fogTint;
  c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-over';
}

function drawFog() {
  if (!G || !(G.fog > 0)) return;
  ensureFogLayer();

  const age = G.fogAge || 0;
  // The whole arrival is this ramp — smoothstepped, since a linear fade in and
  // out of nothing is exactly what the flat wash's snap-on read as.
  const rise = clamp(age / FOG_FADE_IN, 0, 1);
  const out = clamp(G.fog / FOG_LIFT, 0, 1);
  const alpha = FOG_ALPHA * (rise * rise * (3 - 2 * rise)) * out
    * (1 + Math.sin(G.time * 0.31) * FOG_BREATHE);
  if (alpha <= 0.004) return;

  fogCompose(age);
  ctx.globalAlpha = alpha;
  ctx.drawImage(fogCanvas, 0, 0, W, H);
  ctx.globalAlpha = 1;
}
