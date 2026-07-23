/* Trenchworks: WW2 — view camera: mobile pan/zoom/pinch, world<->screen transforms.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

function mobileViewActive() {
  return touchUI() && window.innerWidth <= 768;
}

// the world->screen transform applies on mobile, and everywhere while the
// tutorial is driving the camera
function viewTransformActive() {
  return mobileViewActive() || tutorialCamActive();
}

function portraitMobile() {
  return mobileViewActive() && window.innerHeight > window.innerWidth;
}

function canvasAspect() {
  if (canvas.width > 0 && canvas.height > 0) return canvas.height / canvas.width;
  return H / W;
}

function coverZoom() {
  if (!mobileViewActive()) return 1;
  return Math.max(1, canvasAspect() * W / H);
}

// zoom at which the ENTIRE field fits on screen: cover fills the screen and
// crops the field's wider axis (leaving a sliver to pan across); contain zooms
// out just enough to show it all, letterboxing the axis that comes up short.
function containZoom() {
  if (!mobileViewActive()) return 1;
  return Math.min(1, canvasAspect() * W / H);
}

function viewZoomMin() {
  return mobileViewActive() ? containZoom() : 1;
}

function viewZoomMax() {
  return mobileViewActive() ? coverZoom() * VIEW_ZOOM_MAX_MUL : 1;
}

function viewSize(zoom = viewCam.zoom) {
  const viewW = W / zoom;
  const viewH = mobileViewActive() ? canvasAspect() * W / zoom : H / zoom;
  return { viewW, viewH };
}

function viewScale() {
  if (!viewTransformActive()) return 1;
  return canvas.width / viewSize().viewW;
}

function clampCamera() {
  const { viewW, viewH } = viewSize();
  // when the view is wider/taller than the field (zoomed out to fit), centre
  // the field so it sits in the middle of the letterbox instead of the corner
  viewCam.x = viewW >= W ? (W - viewW) / 2 : clamp(viewCam.x, 0, W - viewW);
  viewCam.y = viewH >= H ? (H - viewH) / 2 : clamp(viewCam.y, 0, H - viewH);
}

function resetViewCam(mode) {
  if (!mobileViewActive()) {
    viewCam.zoom = 1;
    viewCam.x = 0;
    viewCam.y = 0;
  } else {
    // fit the whole field on screen, centred — clampCamera handles the
    // letterbox centring for whichever axis the view overshoots
    viewCam.zoom = containZoom();
    const { viewW, viewH } = viewSize();
    viewCam.x = (W - viewW) / 2;
    viewCam.y = (H - viewH) / 2;
  }
  clampCamera();
  viewDirty = true;
  syncViewStrip();
}

function zoomToward(wx, wy, targetZoom) {
  const oldZoom = viewCam.zoom;
  viewCam.zoom = clamp(targetZoom, viewZoomMin(), viewZoomMax());
  const { viewW: ow, viewH: oh } = viewSize(oldZoom);
  const nx = ow > 0 ? (wx - viewCam.x) / ow : 0.5;
  const ny = oh > 0 ? (wy - viewCam.y) / oh : 0.5;
  const { viewW: nw, viewH: nh } = viewSize();
  viewCam.x = wx - nx * nw;
  viewCam.y = wy - ny * nh;
  clampCamera();
  viewDirty = true;
  syncViewStrip();
}

function toggleZoomAt(wx, wy) {
  if (!mobileViewActive() || tutorialScriptActive()) return;
  const out = containZoom();
  const mid = coverZoom() * 1.85;
  const target = viewCam.zoom <= out * 1.08 ? mid : out;
  zoomToward(wx, wy, target);
  mobileVibrate(6);
}

function edgeAutoPan(clientX, clientY) {
  if (!mobileViewActive() || !isPlaying() || tutorialScriptActive()) return;
  const r = canvas.getBoundingClientRect();
  const margin = 44;
  const speed = 10 / viewScale();
  let moved = false;
  const { viewW, viewH } = viewSize();
  if (viewW < W - 1) {
    if (clientX - r.left < margin) { viewCam.x -= speed; moved = true; }
    if (r.right - clientX < margin) { viewCam.x += speed; moved = true; }
  }
  if (viewH < H - 1) {
    const topMargin = margin + (portraitMobile() ? 36 : 0);
    const bottomMargin = margin + (portraitMobile() ? 56 : 0);
    if (clientY - r.top < topMargin) { viewCam.y -= speed; moved = true; }
    if (r.bottom - clientY < bottomMargin) { viewCam.y += speed; moved = true; }
  }
  if (moved) {
    clampCamera();
    viewDirty = true;
    syncViewStrip();
  }
}

function clientToWorld(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const nx = (clientX - r.left) / r.width;
  const ny = (clientY - r.top) / r.height;
  if (!viewTransformActive()) return { x: nx * W, y: ny * H };
  const { viewW, viewH } = viewSize();
  return { x: viewCam.x + nx * viewW, y: viewCam.y + ny * viewH };
}

function beginViewPan(clientX, clientY, worldX, worldY) {
  if (tutorialScriptActive()) return;
  viewPan = {
    clientX0: clientX,
    clientY0: clientY,
    worldX0: worldX,
    worldY0: worldY,
    camX0: viewCam.x,
    camY0: viewCam.y,
    active: false,
  };
}

function applyViewPan(clientX, clientY) {
  if (!viewPan) return;
  const moved = Math.hypot(clientX - viewPan.clientX0, clientY - viewPan.clientY0);
  if (!viewPan.active && moved <= tapSlop()) return;
  viewPan.active = true;
  const r = canvas.getBoundingClientRect();
  const { viewW, viewH } = viewSize();
  viewCam.x = viewPan.camX0 - (clientX - viewPan.clientX0) / r.width * viewW;
  viewCam.y = viewPan.camY0 - (clientY - viewPan.clientY0) / r.height * viewH;
  clampCamera();
  viewDirty = true;
  syncViewStrip();
}

function clearViewPan() {
  viewPan = null;
}

function pointerMid() {
  const pts = [...activePointers.values()];
  if (pts.length < 2) return null;
  return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
}

function pointerDist() {
  const pts = [...activePointers.values()];
  if (pts.length < 2) return 0;
  return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
}

function beginViewGesture() {
  if (tutorialScriptActive()) return;
  const mid = pointerMid();
  const d = pointerDist();
  if (!mid || d < 1) return;
  viewGesture = {
    active: true,
    d0: d,
    zoom0: viewCam.zoom,
    mid0: { x: mid.x, y: mid.y },
    camX0: viewCam.x,
    camY0: viewCam.y,
  };
  drag = null;
  placeTouch = null;
}

function applyViewGesture() {
  if (!viewGesture?.active) return;
  const mid = pointerMid();
  const d = pointerDist();
  if (!mid || viewGesture.d0 < 1) return;

  const r = canvas.getBoundingClientRect();
  const { viewW: vw0, viewH: vh0 } = viewSize(viewGesture.zoom0);
  const nx0 = (viewGesture.mid0.x - r.left) / r.width;
  const ny0 = (viewGesture.mid0.y - r.top) / r.height;
  const worldX = viewGesture.camX0 + nx0 * vw0;
  const worldY = viewGesture.camY0 + ny0 * vh0;

  viewCam.zoom = clamp(viewGesture.zoom0 * (d / viewGesture.d0), viewZoomMin(), viewZoomMax());
  const { viewW: vw, viewH: vh } = viewSize();
  const nx1 = (mid.x - r.left) / r.width;
  const ny1 = (mid.y - r.top) / r.height;
  viewCam.x = worldX - nx1 * vw;
  viewCam.y = worldY - ny1 * vh;
  clampCamera();
  viewDirty = true;
  syncViewStrip();
}

// mini-map strip showing which slice of the field the mobile camera covers
function syncViewStrip() {
  const strip = el('view-strip');
  const win = el('view-strip-window');
  if (!strip || !win) return;
  const { viewW } = viewSize();
  // only meaningful when the field is wider than the view — if it all fits,
  // there's nothing to pan to, so the strip would just be a dead full-width bar
  const on = mobileViewActive() && isPlaying() && !paused && viewW < W - 1;
  strip.classList.toggle('hidden', !on);
  if (!on) return;
  win.style.width = (viewW / W * 100) + '%';
  win.style.left = (viewCam.x / W * 100) + '%';
}

function syncMobileViewUI() {
  const stage = el('stage');
  const on = mobileViewActive();
  if (stage) stage.classList.toggle('mobile-view', on);
}
