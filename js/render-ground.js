/* Trenchworks: WW2 — soldier, kit & weapon drawing.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// device pixels per world unit to back the ground bitmap with. The ground is a
// W×H world-space layer composited under the camera zoom; on mobile that zoom
// upscales it, so we render it at enough real pixels to stay crisp at the
// resting (cover) zoom. Pinching in further softens it gracefully. Desktop
// draws 1:1, and the factor is capped to bound the bitmap's memory.
function groundRenderScale() {
  if (!mobileViewActive()) return 1;
  const displayDensity = canvas.width * coverZoom() / W;
  return clamp(Math.ceil(displayDensity), 1, 4);
}

function paintGround(level) {
  // (re)size the ground bitmap for the current display density, then pre-scale
  // the context so all world-coordinate drawing — here and the runtime wrecks,
  // craters and blood painted into gctx later — lands at the higher resolution
  const scale = groundRenderScale();
  groundCanvas.width = Math.round(W * scale);
  groundCanvas.height = Math.round(H * scale);
  gctx.setTransform(scale, 0, 0, scale, 0, 0);
  // base mud/grass field, painted once per game
  gctx.fillStyle = '#5c5a3f';
  gctx.fillRect(0, 0, W, H);
  if (level && level.landingCraft) {
    gctx.fillStyle = '#2a4a6a';
    gctx.fillRect(0, 0, W, BEACH_Y - 8);
    gctx.fillStyle = '#8a7f5c';
    gctx.fillRect(0, BEACH_Y - 8, W, 52);
    for (let i = 0; i < 120; i++) {
      gctx.fillStyle = 'rgba(110,100,72,0.35)';
      gctx.beginPath();
      gctx.ellipse(rand(0, W), rand(BEACH_Y - 6, BEACH_Y + 40), rand(3, 10), rand(2, 5), rand(0, 3), 0, 7);
      gctx.fill();
    }
  }
  for (let i = 0; i < 700; i++) {
    gctx.fillStyle = pick([
      'rgba(90,88,60,0.25)', 'rgba(78,76,52,0.25)', 'rgba(104,100,66,0.2)',
      'rgba(70,66,46,0.22)', 'rgba(96,94,58,0.18)',
    ]);
    gctx.beginPath();
    gctx.ellipse(rand(0, W), rand(0, H), rand(4, 18), rand(3, 10), rand(0, 3), 0, 7);
    gctx.fill();
  }
  // grass tufts
  for (let i = 0; i < 240; i++) {
    gctx.strokeStyle = 'rgba(84,96,50,0.6)';
    gctx.lineWidth = 1;
    const x = rand(0, W), y = rand(0, H);
    gctx.beginPath();
    gctx.moveTo(x, y);
    gctx.lineTo(x + rand(-2, 2), y - rand(2, 5));
    gctx.stroke();
  }
  // the trench line marking your deploy zone
  gctx.fillStyle = 'rgba(46,42,28,0.85)';
  gctx.fillRect(0, DEPLOY_Y - 3, W, 14);
  gctx.fillStyle = 'rgba(30,27,18,0.9)';
  gctx.fillRect(0, DEPLOY_Y, W, 7);
  for (let x = 8; x < W; x += 26) {
    gctx.fillStyle = 'rgba(74,60,38,0.9)';
    gctx.fillRect(x, DEPLOY_Y - 5, 12, 4);
  }
}

