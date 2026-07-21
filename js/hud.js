/* Dirt & Iron — HUD / DOM panels.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

const el = id => document.getElementById(id);
const touchUI = () => window.matchMedia('(hover: none)').matches;
const tapSlop = () => touchUI() ? 14 : 6;

function touchHitRadius(base) {
  return touchUI() ? base * 1.35 : base;
}

function mobileVibrate(ms) {
  if (touchUI() && navigator.vibrate) navigator.vibrate(ms);
}

function unlockAudio() {
  if (typeof SFX !== 'undefined' && SFX.resume) SFX.resume();
}

function mobileViewActive() {
  return touchUI() && window.innerWidth <= 768;
}

function tutorialCamActive() {
  return !!(G && G.tutorial && G.tutorial.cam.active);
}

// the world->screen transform applies on mobile, and everywhere while the
// tutorial is driving the camera
function viewTransformActive() {
  return mobileViewActive() || tutorialCamActive();
}

function tutorialScriptActive() {
  return !!(G && G.tutorial && !G.tutorial.done);
}

function portraitMobile() {
  return mobileViewActive() && window.innerHeight > window.innerWidth;
}

function unitAtWorld(x, y) {
  if (!G || isAssaultMode()) return null;
  for (const u of commandRoster()) {
    const base = u.t.tank ? 26 : u.t.vehicle ? 20 : u.t.gunEmplacement ? 18 : 14;
    if (dist(u, { x, y }) < touchHitRadius(base)) return u;
  }
  return null;
}

// nearest live enemy under a tap, for focus-fire orders (normal defense modes)
function enemyAtWorld(x, y) {
  if (!G || isAssaultMode()) return null;
  let best = null, bd = Infinity;
  for (const e of G.enemies) {
    if (e.dead || e.y < 0 || e.chute > 0) continue;
    const base = e.t.tank ? 26 : e.t.apc ? 22 : e.t.vehicle || e.t.bike ? 20
               : e.t.v2 ? 24 : 14;
    const d = dist(e, { x, y });
    if (d < touchHitRadius(base) && d < bd) { bd = d; best = e; }
  }
  return best;
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

function clearPlaceHold() {
  if (placeHoldTimer) {
    clearTimeout(placeHoldTimer);
    placeHoldTimer = null;
  }
}

function syncViewStrip() {
  const strip = el('view-strip');
  const win = el('view-strip-window');
  if (!strip || !win) return;
  const on = mobileViewActive() && isPlaying() && !paused;
  strip.classList.toggle('hidden', !on);
  if (!on) return;
  const { viewW } = viewSize();
  win.style.width = (viewW / W * 100) + '%';
  win.style.left = (viewCam.x / W * 100) + '%';
}

function syncSelectionMobile() {
  if (!touchUI() || !isPlaying()) {
    mobileToolbarMinimized = false;
  } else if (G?.selected.length && !placing) {
    mobileToolbarMinimized = true;
  } else if (!G?.selected.length && !placing) {
    mobileToolbarMinimized = false;
  }
  // the collapsed-for-selection bar has different contents, so it needs a
  // rebuild rather than just a visibility pass
  if (toolbarSelectionCollapsed() !== toolbarCollapsedForSelection) {
    renderToolbar();
  }
  syncMobileChrome();
  syncToolbarVisibility();
}

function syncMobileChrome() {
  const stage = el('stage');
  const hudEl = el('hud');
  const tip = el('tipbar');
  // the TP / wave / kills / breach readouts only make sense mid-game; hide them
  // on the menus (running stays true while paused, so they persist through pause)
  if (hudEl) hudEl.classList.toggle('playing', !!running);
  const actions = el('mobile-actions');
  const placeCancel = el('place-cancel');
  if (stage) {
    stage.classList.toggle('mobile-portrait', portraitMobile());
    stage.classList.toggle('placing-active', touchUI() && !!placing);
    stage.classList.toggle('units-selected', touchUI() && !!G?.selected.length && !placing);
  }
  if (tip) tip.classList.toggle('hidden', touchUI() && !!placing);
  if (actions) {
    actions.classList.toggle('hidden', !(touchUI() && isPlaying() && G?.selected.length && !placing));
  }
  if (placeCancel) {
    placeCancel.classList.toggle('hidden', !(touchUI() && placing && isPlaying()));
  }
  syncViewStrip();
}

function canvasAspect() {
  if (canvas.width > 0 && canvas.height > 0) return canvas.height / canvas.width;
  return H / W;
}

function coverZoom() {
  if (!mobileViewActive()) return 1;
  return Math.max(1, canvasAspect() * W / H);
}

function viewZoomMin() {
  return mobileViewActive() ? coverZoom() : 1;
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
  viewCam.x = clamp(viewCam.x, 0, Math.max(0, W - viewW));
  viewCam.y = clamp(viewCam.y, 0, Math.max(0, H - viewH));
}

function resetViewCam(mode) {
  if (!mobileViewActive()) {
    viewCam.zoom = 1;
    viewCam.x = 0;
    viewCam.y = 0;
  } else {
    viewCam.zoom = coverZoom();
    viewCam.x = (W - W / viewCam.zoom) / 2;
    const { viewH } = viewSize();
    if (mode === 'axis' || mode === 'assault') viewCam.y = 0;
    else if (mode === 'hitsquad') viewCam.y = 120;
    else if (canvasAspect() < W / H) viewCam.y = clamp((H - viewH) * 0.38, 0, Math.max(0, H - viewH));
    else viewCam.y = DEPLOY_Y - viewH * 0.55;
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
  const mid = coverZoom() * 1.85;
  const target = viewCam.zoom <= coverZoom() * 1.08 ? mid : coverZoom();
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

function syncMobileViewUI() {
  const stage = el('stage');
  const btn = el('view-reset');
  const on = mobileViewActive();
  if (stage) stage.classList.toggle('mobile-view', on);
  if (btn) btn.classList.toggle('hidden', !on || !running);
}

function framePadY() {
  const wrap = el('wrap');
  if (!wrap) return 0;
  const cs = getComputedStyle(wrap);
  return (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
}

function safeAreaInset() {
  const cs = getComputedStyle(document.body);
  return {
    top: parseFloat(cs.paddingTop) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
  };
}

function fitLayout() {
  const wrap = el('wrap');
  const stage = el('stage');
  const padY = framePadY();
  const maxW = window.innerWidth;
  const maxH = window.innerHeight - padY;
  const ratio = W / H;
  const mobile = mobileViewActive();

  let w, h;
  if (mobile) {
    const safe = safeAreaInset();
    w = maxW;
    h = Math.max(1, maxH - safe.top - safe.bottom);
  } else {
    w = maxW;
    h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
  }

  w = Math.floor(w);
  h = Math.floor(h);

  wrap.style.width = w + 'px';
  wrap.style.height = (h + padY) + 'px';
  stage.style.width = '100%';
  stage.style.height = '100%';

  if (mobile) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
  } else {
    canvas.width = W;
    canvas.height = H;
  }

  const newCover = mobile ? coverZoom() : 1;
  if (mobile) {
    if (G && lastCoverZoom != null && Math.abs(newCover - lastCoverZoom) > 0.05) {
      resetViewCam(G.mode);
    } else {
      viewCam.zoom = clamp(viewCam.zoom, viewZoomMin(), viewZoomMax());
      clampCamera();
    }
  }
  lastCoverZoom = newCover;

  syncMobileViewUI();
  syncMobileChrome();
  syncToolbarLayout();
  viewDirty = true;
}

function syncToolbarLayout() {
  const hudEl = el('hud');
  const bar = el('toolbar');
  if (!hudEl || !bar) return;
  syncMobileChrome();
  if (portraitMobile()) {
    bar.style.top = 'auto';
    bar.style.bottom = '0';
    bar.style.left = '0';
    bar.style.right = '0';
    bar.style.maxHeight = '';
    return;
  }
  bar.style.left = touchUI() ? '3px' : '4px';
  bar.style.right = 'auto';
  // #hud is offset 6px from the stage top; keep a small gap below the wrapped HUD rows
  const top = 6 + hudEl.offsetHeight + 6;
  bar.style.top = top + 'px';
  // shrink-wrap to the buttons instead of spanning to the bottom edge — the empty
  // column below the last button would otherwise swallow clicks meant for the map
  bar.style.bottom = 'auto';
  bar.style.maxHeight = `calc(100% - ${top + (touchUI() ? 22 : 28)}px)`;
}

const hud = { tp: el('tp'), waveBox: el('wavebox'), kills: el('kills'), breachBox: el('breachbox') };
const bannerEl = el('banner');

function updateHUD() {
  hud.tp.textContent = isSandbox() ? '∞' : Math.floor(G.tp);
  hud.kills.textContent = G.kills;
  if (G.mode === 'axis' || G.mode === 'assault') {
    const phase = G.phase === 'build' ? 'BUILD' : G.phase === 'landing' ? 'LANDING' : 'FIGHT';
    const waves = assaultWaves(G.level);
    hud.waveBox.textContent = 'WAVE ' + G.wave + '/' + waves + ' ' + phase;
    hud.breachBox.textContent = 'BREAK ' + G.breaches + '/' + G.level.winBreaches;
  } else if (G.mode === 'hitsquad') {
    const left = Math.max(0, G.level.timeLimit - G.time);
    const m = Math.floor(left / 60), s = Math.floor(left % 60);
    hud.waveBox.textContent = 'TIME ' + m + ':' + String(s).padStart(2, '0');
    let alive = 0;
    for (const e of G.enemies) if (!e.dead) alive++;
    hud.breachBox.textContent = 'MEN ' + alive + '/' + G.squadTotal;
  } else if (G.mode === 'allied') {
    hud.waveBox.textContent = 'WAVE ' + G.wave + '/' + G.level.waves.length;
    hud.breachBox.textContent = 'BREACH ' + G.breaches + '/' + G.level.breachLimit;
  } else {
    hud.waveBox.textContent = 'WAVE ' + G.wave;
    hud.breachBox.textContent = 'BREACH ' + G.breaches + '/' + G.level.breachLimit;
  }

  // selection also empties without a click — a selected man dying splices
  // himself out — so reconcile the collapsed bar here rather than only in the
  // input handlers
  if (toolbarSelectionCollapsed() !== toolbarCollapsedForSelection) syncSelectionMobile();

  el('sandbox-wave-skip').classList.toggle('hidden', !(isSandbox() && !isTestingMode() && isPlaying()));
  el('speed-btn').classList.toggle('hidden', !(running && G && !G.over));
  el('pause-btn').classList.toggle('hidden', !(running && G && !G.over));
  const startBtn = el('start-wave-btn');
  if (startBtn) {
    const showStart = inBuildPhase();
    startBtn.classList.toggle('hidden', !showStart);
    startBtn.disabled = !showStart || !G.enemies.some(e => !e.dead);
  }

  if (G.banner) {
    bannerEl.textContent = G.banner.text;
    bannerEl.classList.add('show');
  } else {
    bannerEl.classList.remove('show');
  }

  for (const btn of toolButtons) {
    const capped = btn.p.key === 'officer' && officerCount() >= officerLimit();
    btn.el.disabled = !canAffordTP(placeableCost(btn.p)) || capped;
    btn.el.classList.toggle('active', placing === btn.p);
  }

  syncToolbarVisibility();
  syncToolbarLayout();
  syncViewStrip();
  syncTutorialPulse();
}

const TOOLBAR_CATEGORIES = [
  { id: 'units', label: 'UNITS', filter: p => p.kind === 'unit' || p.kind === 'eunit' || p.kind === 'aunit' || p.kind === 'eparadrop' },
  { id: 'abilities', label: 'ABILITIES', filter: p => p.kind === 'support' },
  { id: 'emplacements', label: 'EMPLACEMENTS', filter: p => p.kind === 'defense' },
  { id: 'germans', label: 'GERMANS', filter: p => p.kind === 'egerman' },
  { id: 'events', label: 'EVENTS', filter: p => p.kind === 'event' },
];

let toolButtons = [];
let toolbarPlaceables = [];
let toolbarView = 'categories';
let toolbarCollapsedForSelection = false;

function placeablesForCategory(categoryId) {
  const cat = TOOLBAR_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return [];
  return toolbarPlaceables
    .filter(cat.filter)
    .slice()
    .sort((a, b) => placeableCost(a) - placeableCost(b));
}

function categoryForPlaceable(p) {
  const cat = TOOLBAR_CATEGORIES.find(c => c.filter(p));
  return cat ? cat.id : 'categories';
}

function clearPlacing() {
  if (!placing) return;
  placing = null;
  clearPlaceHold();
  renderToolbar();
  syncMobileChrome();
}

function visibleToolbarCategories() {
  return TOOLBAR_CATEGORIES.filter(c => placeablesForCategory(c.id).length > 0);
}

// while the user is dragging the marquee box to pick units, keep the toolbar out
// of the way. toolbarView is left untouched, so if the drag ends with nothing
// selected the same menu simply reappears.
function marqueeSelecting() {
  return !!(drag && drag.active) && isPlaying();
}

function syncToolbarVisibility() {
  const bar = el('toolbar');
  if (!bar) return;
  const hideForSelection = touchUI() && mobileToolbarMinimized && G?.selected.length && !placing;
  const show = toolbarPlaceables.length > 0 && isPlaying() && !hideForSelection
    && !marqueeSelecting()
    && !(isAssaultMode() && G.phase !== 'build');
  bar.classList.toggle('hidden', !show);
}

// with units selected the bar is only in the way — collapse it to a single
// button that drops the selection. Touch hides the bar outright instead and
// offers deselect in #mobile-actions.
function toolbarSelectionCollapsed() {
  return !touchUI() && isPlaying() && !placing && !!G?.selected.length;
}

function renderToolbar() {
  const bar = el('toolbar');
  bar.innerHTML = '';
  toolButtons = [];
  toolbarCollapsedForSelection = toolbarSelectionCollapsed();

  if (!toolbarPlaceables.length) {
    bar.classList.add('hidden');
    bar.classList.remove('toolbar-placing', 'toolbar-collapsed');
    return;
  }

  bar.classList.remove('toolbar-collapsed');

  if (toolbarCollapsedForSelection) {
    bar.classList.remove('toolbar-placing');
    bar.classList.add('toolbar-collapsed');
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'tool-btn tool-back-btn';
    back.textContent = '← BACK';
    back.title = 'Deselect';
    back.addEventListener('click', () => {
      G.selected = [];
      SFX.click();
      syncSelectionMobile();
    });
    bar.appendChild(back);

    syncToolbarVisibility();
    syncToolbarLayout();
    return;
  }

  if (placing) {
    bar.classList.add('toolbar-placing');
    const active = placing;
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'tool-btn tool-back-btn';
    back.textContent = '← BACK';
    back.addEventListener('click', () => {
      placing = null;
      if (toolbarView === 'categories') toolbarView = categoryForPlaceable(active);
      SFX.click();
      renderToolbar();
    });
    bar.appendChild(back);

    const cost = placeableCost(active);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tool-btn active';
    b.title = active.desc;
    const activeKey = active.hotkey ? `<span class="key">[${active.hotkey}]</span>` : '';
    b.innerHTML = `${activeKey}${active.label}<span class="cost">${cost} TP</span>`;
    b.addEventListener('click', () => selectPlaceable(active));
    bar.appendChild(b);
    toolButtons.push({ p: active, el: b });

    syncToolbarVisibility();
    syncToolbarLayout();
    return;
  }

  bar.classList.remove('toolbar-placing');

  if (toolbarView === 'categories') {
    for (const cat of visibleToolbarCategories()) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tool-btn tool-cat-btn';
      b.dataset.catId = cat.id;
      b.textContent = cat.label;
      b.addEventListener('click', () => {
        toolbarView = cat.id;
        SFX.click();
        renderToolbar();
        syncToolbarVisibility();
      });
      bar.appendChild(b);
    }
  } else {
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'tool-btn tool-back-btn';
    back.textContent = '← BACK';
    back.addEventListener('click', () => {
      placing = null;
      toolbarView = 'categories';
      SFX.click();
      renderToolbar();
      syncToolbarVisibility();
    });
    bar.appendChild(back);

    for (const p of placeablesForCategory(toolbarView)) {
      const cost = placeableCost(p);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tool-btn';
      b.title = p.desc;
      const key = p.hotkey ? `<span class="key">[${p.hotkey}]</span>` : '';
      // events are free and instant — a "0 TP" tag would just be noise
      const costTag = p.kind === 'event' ? '' : `<span class="cost">${cost} TP</span>`;
      b.innerHTML = `${key}${p.label}${costTag}`;
      b.addEventListener('click', () => selectPlaceable(p));
      bar.appendChild(b);
      toolButtons.push({ p, el: b });
    }
  }

  syncToolbarVisibility();
  syncToolbarLayout();
  syncTutorialPulse();
}

// tutorial: pulse the button the player should press next (category, then medic)
function syncTutorialPulse() {
  const bar = el('toolbar');
  if (!bar) return;
  for (const b of bar.querySelectorAll('.tut-pulse')) b.classList.remove('tut-pulse');
  const T = G && G.tutorial;
  if (!T || T.done || placing) return;
  if (!T.pulseCat && !T.pulseKey) return;
  if (toolbarView === 'categories') {
    if (T.pulseCat) {
      const catBtn = bar.querySelector(`[data-cat-id="${T.pulseCat}"]`);
      if (catBtn) catBtn.classList.add('tut-pulse');
    }
  } else if (toolbarView === T.pulseCat) {
    if (T.pulseKey) {
      const item = toolButtons.find(t => t.p.key === T.pulseKey);
      if (item) item.el.classList.add('tut-pulse');
    }
  }
}

function buildToolbar(placeables) {
  toolbarPlaceables = placeables;
  toolbarView = 'categories';
  renderToolbar();
  fitLayout();
}

function activePlaceables() {
  return (G && G.level) ? G.level.placeables : PLACEABLES;
}

function selectPlaceable(p) {
  if (!isPlaying()) return;
  if (isAssaultMode() && G.phase !== 'build') { SFX.error(); mobileVibrate(12); return; }
  // during the tutorial script only the currently-taught items are buyable
  // (covers hotkeys too) — each step publishes its own allow-list
  if (tutorialScriptActive()) {
    const allow = G.tutorial.allowBuy || [];
    if (!allow.includes(p.key)) { SFX.error(); mobileVibrate(12); return; }
  }
  // events have no placement step — they fire where they fire, right away
  if (p.kind === 'event') {
    SFX.click();
    if (p.key === 'random') triggerEvent();
    else runEvent(p.key, G.wave);
    return;
  }
  if (!canAffordTP(placeableCost(p))) { SFX.error(); mobileVibrate(12); return; }
  if (p.key === 'officer' && officerCount() >= officerLimit()) { SFX.error(); mobileVibrate(12); return; }
  SFX.click();
  placing = (placing === p) ? null : p;
  if (placing) mobileToolbarMinimized = false;
  if (placing && toolbarView === 'categories') {
    toolbarView = categoryForPlaceable(p);
  }
  G.selected = [];
  renderToolbar();
  syncMobileChrome();
}
