/* Trenchworks: WW2 — HUD / DOM panels.
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

function clearPlaceHold() {
  if (placeHoldTimer) {
    clearTimeout(placeHoldTimer);
    placeHoldTimer = null;
  }
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
  const tip = el('tipbar');
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

function framePadY() {
  const wrap = el('wrap');
  if (!wrap) return 0;
  const cs = getComputedStyle(wrap);
  return (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
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
    w = maxW;
    // safe area is handled by CSS env() on positioned elements — don't
    // subtract it here or it gets double-accounted, shrinking the stage
    // below what the toolbar and mobile-actions need to be visible
    h = Math.max(200, maxH);
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

  const newFit = mobile ? containZoom() : 1;
  if (mobile) {
    if (G && lastFitZoom != null && Math.abs(newFit - lastFitZoom) > 0.05) {
      resetViewCam(G.mode);
    } else {
      viewCam.zoom = clamp(viewCam.zoom, viewZoomMin(), viewZoomMax());
      clampCamera();
    }
  }
  lastFitZoom = newFit;

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

// the wave/breach plates carry a static micro-label span + a dynamic value span
// so the readout styles the label and value apart. Both label and value change
// by mode (WAVE/TIME/MEN, BREACH/BREAK/MEN), so the updater sets each.
const hud = {
  tp: el('tp'), kills: el('kills'),
  waveLabel: el('wave-label'), waveVal: el('wave-val'),
  breachBox: el('breachbox'), breachLabel: el('breach-label'), breachVal: el('breach-val'),
};
const bannerEl = el('banner');

// alerts that mean incoming fire or a broken line read red; everything else
// (a wave starting, promotions, fog) reads in the neutral signal orange
const BANNER_DANGER = /BREAKTHROUGH|AIR RAID|TAKE (COVER|FIRE)|ARTILLERIE|BOMBER|RAMPS DOWN|PARATROOPER|FALLSCHIRM|BARRAGE|MORTAR FIRE|STRAFING|INBOUND/i;

// a banner belongs to the run that raised it, and OUTLIVES it: its ttl is ticked
// in update(), which stops the moment the run does, so the last alert of a lost
// run stays frozen over the game-over screen and the menu and is still up when
// the next run starts. Entering or leaving a run wipes both halves — the state
// and the element — which is why this is not just `G.banner = null`. The hide is
// forced through without the .3s opacity fade, since the point is that the new
// run opens on a clean field rather than on the old run's last words fading out.
// Deliberately NOT called when a run merely ENDS: finishTutorial leaves the
// 'TUTORIAL COMPLETE' banner up on purpose.
function clearBanner() {
  if (G) G.banner = null;
  bannerEl.classList.remove('show', 'banner--danger');
  bannerEl.style.transition = 'none';
  void bannerEl.offsetWidth;   // commit opacity 0 before the transition comes back
  bannerEl.style.transition = '';
  bannerEl.textContent = '';
  bannerEl.dataset.txt = '';
}

function setStat(labelEl, valEl, label, val) {
  labelEl.textContent = label;
  valEl.textContent = val;
}

function updateHUD() {
  hud.tp.textContent = isSandbox() ? '∞' : Math.floor(G.tp);
  hud.kills.textContent = G.kills;
  setStat(hud.waveLabel, hud.waveVal, 'WAVE', String(G.wave));
  setStat(hud.breachLabel, hud.breachVal, 'BREACH', G.breaches + '/' + G.level.breachLimit);
  // the breach plate runs hot the moment the line is first cracked
  hud.breachBox.classList.toggle('stat--hot', G.breaches > 0);

  // selection also empties without a click — a selected man dying splices
  // himself out — so reconcile the collapsed bar here rather than only in the
  // input handlers
  if (toolbarSelectionCollapsed() !== toolbarCollapsedForSelection) syncSelectionMobile();

  el('sandbox-wave-skip').classList.toggle('hidden', !(isSandbox() && !isTestingMode() && isPlaying()));
  el('speed-btn').classList.toggle('hidden', !(running && G && !G.over));
  el('pause-btn').classList.toggle('hidden', !(running && G && !G.over));

  if (G.banner) {
    // re-arm the slam-in animation only when the alert text actually changes,
    // so a held banner doesn't restart every frame
    if (bannerEl.dataset.txt !== G.banner.text) {
      bannerEl.textContent = G.banner.text;
      bannerEl.dataset.txt = G.banner.text;
      bannerEl.classList.toggle('banner--danger', BANNER_DANGER.test(G.banner.text));
      bannerEl.classList.remove('show');
      void bannerEl.offsetWidth;   // force reflow to replay the entrance
    }
    bannerEl.classList.add('show');
  } else {
    bannerEl.classList.remove('show');
    bannerEl.dataset.txt = '';
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

// which enemy roster a testing-mode placeable belongs in. All three testing
// rosters share kind 'egerman' (it just routes placement through makeEnemy), so
// the split has to come from the type itself — ENEMY_TYPES carries faction 'jp'
// / 'zo' and leaves the Wehrmacht unmarked. Keying off the key's first letter
// instead looks equivalent and isn't: 'panzer' starts with neither 'e' nor 'j',
// so the Panzer IV fell through every category and was unreachable.
function enemyPlaceableFaction(p) {
  // the Italian field works aren't units and route through their own kind, but
  // they belong on the Italian roster tab rather than falling out of every one
  if (p.kind === 'itwork') return 'it';
  if (p.kind !== 'egerman') return null;
  const t = ENEMY_TYPES[p.key];
  return (t && t.faction) || 'de';
}

const TOOLBAR_CATEGORIES = [
  { id: 'units', label: 'UNITS', filter: p => p.kind === 'unit' },
  { id: 'abilities', label: 'ABILITIES', filter: p => p.kind === 'support' },
  { id: 'emplacements', label: 'EMPLACEMENTS', filter: p => p.kind === 'defense' },
  { id: 'germans', label: 'GERMANS', filter: p => enemyPlaceableFaction(p) === 'de' },
  { id: 'japanese', label: 'JAPANESE', filter: p => enemyPlaceableFaction(p) === 'jp' },
  { id: 'horde', label: 'HORDE', filter: p => enemyPlaceableFaction(p) === 'zo' },
  { id: 'italian', label: 'ITALIAN', filter: p => enemyPlaceableFaction(p) === 'it' },
  { id: 'events', label: 'EVENTS', filter: p => p.kind === 'event' },
];

let toolButtons = [];
let toolbarPlaceables = [];
let toolbarView = 'categories';
let toolbarCollapsedForSelection = false;
// remembers scroll position per category so the user picks up where they left off
const _catScrollPos = {};

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
    && !marqueeSelecting();
  bar.classList.toggle('hidden', !show);
}

// with units selected the bar is only in the way — collapse it to a single
// button that drops the selection. Touch hides the bar outright instead and
// offers deselect in #mobile-actions.
function toolbarSelectionCollapsed() {
  return !touchUI() && isPlaying() && !placing && !!G?.selected.length;
}

// The toolbar grows a ← BACK button in three different states — deselect, cancel
// a placement, leave a category — and all three built the same five lines by
// hand. Only the click and the tooltip ever differed.
function appendToolbarBack(bar, onClick, title) {
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'tool-btn tool-back-btn';
  back.textContent = '← BACK';
  if (title) back.title = title;
  back.addEventListener('click', onClick);
  bar.appendChild(back);
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
    appendToolbarBack(bar, () => {
      G.selected = [];
      SFX.click();
      syncSelectionMobile();
    }, 'Deselect');

    syncToolbarVisibility();
    syncToolbarLayout();
    return;
  }

  if (placing) {
    bar.classList.add('toolbar-placing');
    const active = placing;
    appendToolbarBack(bar, () => {
      placing = null;
      if (toolbarView === 'categories') toolbarView = categoryForPlaceable(active);
      SFX.click();
      renderToolbar();
    });

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
    appendToolbarBack(bar, () => {
      placing = null;
      toolbarView = 'categories';
      SFX.click();
      renderToolbar();
      syncToolbarVisibility();
    });

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
    // restore scroll position where the user left off
    const saved = _catScrollPos[toolbarView];
    if (saved) {
      requestAnimationFrame(() => {
        bar.scrollLeft = saved.x;
        bar.scrollTop = saved.y;
      });
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
  // save scroll position before the toolbar rebuilds into placement mode
  if (toolbarView !== 'categories') {
    const bar = el('toolbar');
    if (bar) _catScrollPos[toolbarView] = { x: bar.scrollLeft, y: bar.scrollTop };
  }
  placing = (placing === p) ? null : p;
  if (placing) mobileToolbarMinimized = false;
  if (placing && toolbarView === 'categories') {
    toolbarView = categoryForPlaceable(p);
  }
  G.selected = [];
  renderToolbar();
  syncMobileChrome();
}
