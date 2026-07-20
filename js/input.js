/* Mud & Blood — placement & pointer/keyboard input.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

function minefieldPositions(cx, cy) {
  // Tight X pattern: center mine plus one on each diagonal. Mines are immune
  // to explosives now, so there's no chain radius to space them around.
  return [
    { x: cx, y: cy },
    { x: cx + 26, y: cy - 22 },
    { x: cx - 26, y: cy - 22 },
    { x: cx + 26, y: cy + 22 },
    { x: cx - 26, y: cy + 22 },
  ];
}

function moveOrderMinY() {
  return G.mode === 'hitsquad' ? 20 : FORWARD_Y;
}

function moveOrderValid(x, y) {
  const minY = moveOrderMinY();
  return x >= 16 && x <= W - 16 && y > minY && y < H - 14;
}

function canReceiveMoveOrders() {
  return G && G.selected.some(u => !u.t.fixed);
}

function showForwardLine() {
  return G && G.mode !== 'hitsquad' && !isAssaultMode();
}

function attackerTypeStats(p) {
  if (p.kind === 'aunit') return UNIT_TYPES[p.key];
  if (p.kind === 'eparadrop') return ENEMY_TYPES.erifle;
  return ENEMY_TYPES[p.key];
}

function placementValid(p, x, y) {
  if (p.kind === 'support') return y > 20 && y < H - 10;
  if (p.kind === 'egerman') {
    // testing mode: German units go anywhere on the field, not confined to
    // the axis campaign's top deploy strip
    if (x < 16 || x > W - 16 || y < 14 || y > H - 14) return false;
    const t = attackerTypeStats(p);
    const bulk = t.heavy ? 40 : t.tank ? 34 : t.apc ? 30 : t.vehicle || t.bike ? 26 : 16;
    for (const e of G.enemies) {
      const gap = Math.max(bulk, e.t.heavy ? 40 : e.t.tank ? 34 : e.t.vehicle ? 26 : 16);
      if (dist(e, { x, y }) < gap) return false;
    }
    return true;
  }
  if (p.kind === 'aunit' || p.kind === 'eunit' || p.kind === 'eparadrop') {
    if (G.level && G.level.landingCraft) {
      const craft = landingCraftAt(x, y);
      if (!craft) return false;
      const t = attackerTypeStats(p);
      const bulk = t.heavy ? 40 : t.tank ? 34 : t.apc ? 30 : t.vehicle || t.bike ? 26 : 16;
      for (const u of craft.onDeck) {
        if (!u.dead && dist(u, { x, y }) < bulk) return false;
      }
      for (const e of G.enemies) {
        if (e.onCraft && e.onCraft !== craft) continue;
        const gap = Math.max(bulk, e.t.heavy ? 40 : e.t.tank ? 34 : e.t.vehicle ? 26 : 16);
        if (dist(e, { x, y }) < gap) return false;
      }
      return x >= 16 && x <= W - 16;
    }
    const maxY = assaultDeployMaxY(p);
    if (y < 14 || y > maxY || x < 16 || x > W - 16) return false;
    const t = attackerTypeStats(p);
    const bulk = t.heavy ? 40 : t.tank ? 34 : t.apc ? 30 : t.vehicle || t.bike ? 26 : 16;
    for (const e of G.enemies) {
      const gap = Math.max(bulk, e.t.heavy ? 40 : e.t.tank ? 34 : e.t.vehicle ? 26 : 16);
      if (dist(e, { x, y }) < gap) return false;
    }
    return true;
  }
  const positions = p.key === 'mine' ? minefieldPositions(x, y) : [{ x, y }];
  const minY = placementMinY(p);
  for (const pos of positions) {
    if (pos.y < minY || pos.y > H - 14 || pos.x < 16 || pos.x > W - 16) return false;
  }
  if (p.kind === 'unit') {
    const bulk = k => k === 'sherman' ? 34 : k === 'jeep' ? 26 : (k === 'atgun' || k === 'aagun') ? 24 : 16;
    for (const u of G.units) {
      const gap = Math.max(bulk(p.key), u.t.tank ? 34 : u.t.vehicle ? 26 : 16);
      if (dist(u, { x, y }) < gap) return false;
    }
  }
  return true;
}

function placementMinY(p) {
  return (p.key === 'mine' || p.key === 'wire') ? FORWARD_Y : DEPLOY_Y + 12;
}

// units search outward in expanding rings for the closest open spot in any direction
function findNearestValidRadial(p, x, y) {
  const maxR = 240, rStep = 6;
  for (let r = rStep; r <= maxR; r += rStep) {
    const steps = Math.max(8, Math.round(r / 2));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (placementValid(p, px, py)) return { x: px, y: py };
    }
  }
  return null;
}

function place(p, x, y) {
  if (isAssaultMode() && G.phase !== 'build') { SFX.error(); mobileVibrate(14); return; }
  if (!placementValid(p, x, y)) {
    const fallback = p.kind === 'unit' ? findNearestValidRadial(p, x, y) : null;
    if (!fallback) { SFX.error(); mobileVibrate(14); return; }
    x = fallback.x;
    y = fallback.y;
  }
  // tutorial script: the medic has to go down next to the wounded rifleman
  if (tutorialScriptActive() && G.tutorial.step === 'placeMedic'
      && dist({ x, y }, G.tutorial.rifle) > 130) {
    SFX.error();
    mobileVibrate(14);
    G.texts.push({ x, y: y - 12, text: 'CLOSER TO YOUR MAN', ttl: 1.6 });
    return;
  }
  // tutorial script: some steps confine placement to a highlighted zone
  if (tutorialScriptActive() && G.tutorial.placeZone) {
    const z = G.tutorial.placeZone;
    if (x < z.x0 || x > z.x1 || y < z.y0 || y > z.y1) {
      SFX.error();
      mobileVibrate(14);
      G.texts.push({ x, y: y - 12, text: 'PLACE IN THE ZONE', ttl: 1.6 });
      return;
    }
  }
  const cost = placeableCost(p);
  if (!canAffordTP(cost)) { SFX.error(); clearPlacing(); return; }
  if (p.key === 'officer' && officerCount() >= officerLimit()) { SFX.error(); clearPlacing(); return; }
  spendTP(cost);
  SFX.click();
  mobileVibrate(8);

  if (p.kind === 'unit') {
    G.units.push(makeUnit(p.key, x, y));
  } else if (p.kind === 'eparadrop') {
    placeAxisParatrooper(x, y);
  } else if (p.kind === 'aunit') {
    const nation = levelAttackerNation(G.level);
    const u = makeAttacker(nation, p.key, x, y);
    if (G.level.landingCraft) {
      const craft = landingCraftAt(x, y);
      if (craft) {
        u.onCraft = craft;
        u.deckOffX = x - craft.x;
        u.deckOffY = y - craft.y;
        craft.onDeck.push(u);
      }
    }
    G.enemies.push(u);
  } else if (p.kind === 'eunit' || p.kind === 'egerman') {
    G.enemies.push(makeEnemy(p.key, x, y));
  } else if (p.key === 'ebarrage') {
    showBanner('DEUTSCHE ARTILLERIE!');
    for (let i = 0; i < 10; i++) {
      scheduleShell(x + rand(-80, 80), y + rand(-65, 65), 1.6 + i * 0.5, 50, 95, true);
    }
  } else if (p.key === 'sandbags') {
    G.sandbags.push({ x, y, hp: SANDBAG_HP, maxhp: SANDBAG_HP, up: false, workProg: 0 });
  } else if (p.key === 'bunker') {
    G.bunkers.push({ x, y, hp: BUNKER_HP, maxhp: BUNKER_HP, up: false, workProg: 0 });
  } else if (p.key === 'watchtower') {
    G.watchtowers.push({ x, y, hp: WATCHTOWER_HP, maxhp: WATCHTOWER_HP, up: false, workProg: 0 });
  } else if (p.key === 'camonest') {
    G.camoNests.push({ x, y, hp: CAMONEST_HP, maxhp: CAMONEST_HP, up: false, workProg: 0, fortifyMult: 2 });
  } else if (p.key === 'wire') {
    G.wires.push({ x, y, hp: 3750, maxhp: 3750, up: false, workProg: 0 });
  } else if (p.key === 'mine') {
    for (const pos of minefieldPositions(x, y)) {
      G.mines.push({ x: pos.x, y: pos.y, dead: false });
    }
  } else if (p.key === 'mortar') {
    showBanner('MORTAR FIRE MISSION');
    for (let i = 0; i < 6; i++) {
      scheduleShell(x + rand(-68, 68), y + rand(-57, 57), 2.4 + i * 1.0, 42, 90, false);
    }
  } else if (p.key === 'artillery') {
    showBanner('105mm BARRAGE INBOUND');
    for (let i = 0; i < 16; i++) {
      scheduleShell(x + rand(-90, 90), y + rand(-70, 70), 1.6 + i * 0.45, 55, 105, true);
    }
  } else if (p.key === 'rankup') {
    showBanner('FIELD PROMOTIONS');
    for (const a of [...G.units, ...G.enemies]) {
      if (!a.dead && dist(a, { x, y }) < RANKUP_RADIUS) rankUpUnit(a);
    }
  } else if (p.key === 'purge') {
    showBanner('AREA CLEARED');
    purgeRadius(x, y, PURGE_RADIUS);
  }
  // keep placing defenses if affordable; supports are one-shot
  if (p.kind === 'support' || !canAffordTP(placeableCost(p)) || (p.key === 'officer' && officerCount() >= officerLimit())) clearPlacing();
}

function updatePointer(e) {
  const pt = clientToWorld(e.clientX, e.clientY);
  mouse.x = pt.x;
  mouse.y = pt.y;
  mouse.inside = true;
}

// which soldiers answer to the player: your squad in hit-squad mode, US otherwise
function commandRoster() {
  return G.mode === 'hitsquad' ? G.enemies : G.units;
}

function handleCanvasTap(shiftKey = false) {
  if (!isPlaying()) return;
  const x = mouse.x, y = mouse.y;

  // assault attackers can't be selected or ordered; the toolbar is the whole game
  if (isAssaultMode()) return;

  // select own soldier (vehicles are a bigger click target)
  let picked = null;
  for (const u of commandRoster()) {
    const base = u.t.tank ? 26 : u.t.vehicle ? 20 : u.t.gunEmplacement ? 18 : 14;
    if (dist(u, { x, y }) < touchHitRadius(base)) { picked = u; break; }
  }
  if (picked) {
    if (shiftKey) {
      const si = G.selected.indexOf(picked);
      if (si !== -1) G.selected.splice(si, 1);
      else G.selected.push(picked);
    } else {
      // double-click on same unit type → select all of that type
      const now = performance.now();
      if (now - lastUnitClick.t < 400 && lastUnitClick.type === picked.type) {
        G.selected = commandRoster().filter(u => !u.dead && u.type === picked.type);
      } else {
        G.selected = [picked];
      }
      lastUnitClick = { t: now, type: picked.type };
    }
    SFX.click();
    mobileVibrate(5);
    syncSelectionMobile();
    return;
  }
  // tutorial script: ground clicks only move a unit onto the highlighted bunker
  if (tutorialScriptActive()) {
    const T = G.tutorial;
    if (T.step === 'moveToBunker' && G.selected.length && dist(T.bunker, { x, y }) < 34) {
      // land him inside the bunker's cover radius
      issueMoveOrder(G.selected, T.bunker.x, T.bunker.y + 2);
      SFX.click();
      mobileVibrate(5);
    }
    return;
  }
  // click an enemy → focus-fire: every troop in range concentrates on it.
  // (hit squad players command the Germans, whose targeting is separate.)
  if (G.mode !== 'hitsquad') {
    const foe = enemyAtWorld(x, y);
    if (foe) {
      G.focusTarget = (G.focusTarget === foe) ? null : foe;  // click again to release
      if (G.focusTarget) G.texts.push({ x: foe.x, y: foe.y - 18, text: 'FOCUS FIRE', ttl: 1.4 });
      SFX.click();
      mobileVibrate(5);
      return;
    }
  }
  // move selected soldiers (the hit squad ranges the whole field)
  if (G.selected.length && moveOrderValid(x, y)) {
    issueMoveOrder(G.selected, x, y);
    SFX.click();
    mobileVibrate(5);
    return;
  }
  G.selected = [];
  lastUnitClick = { t: 0, type: null };
  syncSelectionMobile();
}

canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  unlockAudio();
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  clearPlaceHold();

  if (mobileViewActive() && activePointers.size >= 2) {
    beginViewGesture();
    clearViewPan();
    suppressClick = true;
    return;
  }

  canvas.setPointerCapture(e.pointerId);
  updatePointer(e);
  suppressClick = false;

  if (placing) {
    if (!isPlaying()) return;
    placeTouch = { active: true, moved: false, startX: mouse.x, startY: mouse.y };
    if (touchUI()) {
      placeHoldTimer = setTimeout(() => {
        if (placeTouch?.active && placing) {
          clearPlacing();
          placeTouch = null;
          SFX.click();
        }
      }, 500);
    }
    return;
  }

  if (mobileViewActive() && isPlaying()) {
    beginViewPan(e.clientX, e.clientY, mouse.x, mouse.y);
  }

  if (!isPlaying() || isAssaultMode()) return;
  drag = { x0: mouse.x, y0: mouse.y, x1: mouse.x, y1: mouse.y, active: false };

  // long-press on mobile → clear selection, enter multi-select drag mode
  if (touchUI() && !placing) {
    clearLongPress();
    longPressTimer = setTimeout(() => {
      if (placing) return;
      G.selected = [];
      longPressing = true;
      clearViewPan();
      syncSelectionMobile();
      mobileVibrate(10);
    }, 350);
  }
});

canvas.addEventListener('pointermove', e => {
  if (activePointers.has(e.pointerId)) {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  if (mobileViewActive() && activePointers.size >= 2 && viewGesture?.active) {
    applyViewGesture();
    return;
  }

  updatePointer(e);
  if (!canvas.hasPointerCapture(e.pointerId)) return;

  if (placeTouch?.active && placing && mobileViewActive()) {
    if (Math.hypot(mouse.x - placeTouch.startX, mouse.y - placeTouch.startY) > tapSlop()) {
      placeTouch.moved = true;
      clearPlaceHold();
      if (!viewPan) beginViewPan(e.clientX, e.clientY, placeTouch.startX, placeTouch.startY);
      applyViewPan(e.clientX, e.clientY);
    }
    edgeAutoPan(e.clientX, e.clientY);
    return;
  }

  if (placing && mobileViewActive()) {
    edgeAutoPan(e.clientX, e.clientY);
  }

  if (viewPan && mobileViewActive() && activePointers.size === 1) {
    // long-pressing → skip view pan, let drag marquee work instead
    if (!longPressing) {
      if (!viewPan.active) {
        const moved = Math.hypot(e.clientX - viewPan.clientX0, e.clientY - viewPan.clientY0);
        if (moved > tapSlop()) {
          if (!unitAtWorld(viewPan.worldX0, viewPan.worldY0)) {
            viewPan.active = true;
            drag = null;
          } else {
            clearViewPan();
          }
        }
      }
    }
    if (viewPan?.active) {
      applyViewPan(e.clientX, e.clientY);
      return;
    }
  }

  // cancel long-press timer if user started dragging before timer fired
  if (longPressTimer && drag && Math.hypot(drag.x1 - drag.x0, drag.y1 - drag.y0) > tapSlop()) {
    clearLongPress();
  }

  if (placeTouch?.active) {
    if (Math.hypot(mouse.x - placeTouch.startX, mouse.y - placeTouch.startY) > 6) placeTouch.moved = true;
  }
  if (drag) {
    drag.x1 = mouse.x;
    drag.y1 = mouse.y;
    if (!drag.active && Math.hypot(drag.x1 - drag.x0, drag.y1 - drag.y0) > tapSlop()) {
      drag.active = true;
      syncToolbarVisibility();
    }
  }
});

canvas.addEventListener('pointerup', e => {
  if (e.button !== 0) return;
  activePointers.delete(e.pointerId);
  clearPlaceHold();
  // ensure the long-press timer doesn't fire after release
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }

  if (viewGesture?.active) {
    if (activePointers.size < 2) viewGesture = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    suppressClick = true;
    return;
  }

  if (canvas.hasPointerCapture(e.pointerId)) {
    updatePointer(e);
    canvas.releasePointerCapture(e.pointerId);
  }

  if (placeTouch?.active && placing) {
    if (!isPlaying()) { placeTouch = null; return; }
    if (placeTouch.moved) {
      placeTouch = null;
      clearViewPan();
      suppressClick = true;
      return;
    }
    place(placing, mouse.x, mouse.y);
    placeTouch = null;
    suppressClick = true;
    return;
  }
  placeTouch = null;

  if (viewPan?.active) {
    clearViewPan();
    suppressClick = true;
    drag = null;
    return;
  }
  clearViewPan();

  if (drag) {
    if (drag.active && isPlaying()) {
      const x0 = Math.min(drag.x0, drag.x1), x1 = Math.max(drag.x0, drag.x1);
      const y0 = Math.min(drag.y0, drag.y1), y1 = Math.max(drag.y0, drag.y1);
      const minDrag = tapSlop();
      if (x1 - x0 >= minDrag || y1 - y0 >= minDrag) {
        const picked = commandRoster().filter(u => u.x >= x0 && u.x <= x1 && u.y >= y0 && u.y <= y1);
        if (picked.length) {
          if (e.shiftKey) {
            for (const u of picked) {
              if (!G.selected.includes(u)) G.selected.push(u);
            }
          } else {
            G.selected = picked;
          }
          SFX.click();
          mobileVibrate(5);
          syncSelectionMobile();
          suppressClick = true;
        }
        // empty marquee: keep current selection and treat release as a tap
      }
    }
    const wasActive = drag.active;
    drag = null;
    // drag over: bring the menu back to whatever view it was on
    if (wasActive) syncToolbarVisibility();
  }

  // long-press held without dragging → suppress the tap (already deselected)
  if (longPressing) {
    suppressClick = true;
    longPressing = false;
  }

  if (!suppressClick && isPlaying() && !placing) {
    if (mobileViewActive() && !viewPan?.active && !(drag && drag.active)) {
      const now = performance.now();
      const dt = now - lastTap.t;
      const dd = Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y);
      if (dt < 320 && dd < 28) {
        // double-tap on a unit → select all of same type instead of zooming
        const hit = unitAtWorld(mouse.x, mouse.y);
        if (hit && !hit.dead) {
          G.selected = commandRoster().filter(u => !u.dead && u.type === hit.type);
          SFX.click();
          mobileVibrate(5);
          syncSelectionMobile();
          suppressClick = true;
          lastTap.t = 0;
          return;
        }
        toggleZoomAt(mouse.x, mouse.y);
        suppressClick = true;
        lastTap.t = 0;
        return;
      }
      lastTap = { t: now, x: e.clientX, y: e.clientY };
    }
    handleCanvasTap(e.shiftKey);
    suppressClick = true;
  }
});

canvas.addEventListener('pointercancel', e => {
  activePointers.delete(e.pointerId);
  if (activePointers.size < 2) viewGesture = null;
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  clearPlaceHold();
  clearViewPan();
  clearLongPress();
  placeTouch = null;
  const wasActive = drag && drag.active;
  drag = null;
  if (wasActive) syncToolbarVisibility();
  mouse.inside = false;
});

canvas.addEventListener('pointerleave', e => {
  if (!canvas.hasPointerCapture(e.pointerId)) {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) viewGesture = null;
    mouse.inside = false;
  }
});

// spread a group order into a tight grid around the target so men don't stack
function issueMoveOrder(units, x, y) {
  units = units.filter(u => !u.t.fixed);   // staked guns don't take march orders
  if (!units.length) return;
  // a hit squad ranges the whole field; US soldiers hold behind the forward line
  const minY = moveOrderMinY() + (G.mode === 'hitsquad' ? 0 : 2);
  const clampDest = (dx, dy) => ({
    x: clamp(dx, 16, W - 16),
    y: clamp(dy, minY, H - 14),
  });
  if (units.length === 1) {
    units[0].moveTo = clampDest(x, y);
    return;
  }
  const spacing = Math.max(...units.map(u => u.t.tank ? 44 : u.t.vehicle ? 32 : 22));
  const cols = Math.ceil(Math.sqrt(units.length));
  const rows = Math.ceil(units.length / cols);
  const slots = [];
  for (let i = 0; i < units.length; i++) {
    const row = Math.floor(i / cols);
    const inRow = (row === rows - 1) ? units.length - row * cols : cols;
    const col = i % cols;
    slots.push(clampDest(
      x + (col - (inRow - 1) / 2) * spacing,
      y + (row - (rows - 1) / 2) * spacing,
    ));
  }
  // hand each slot to the nearest remaining man so paths don't cross
  const pool = units.slice();
  for (const s of slots) {
    let bi = 0, bd = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const d = dist(pool[i], s);
      if (d < bd) { bd = d; bi = i; }
    }
    pool.splice(bi, 1)[0].moveTo = s;
  }
}

canvas.addEventListener('click', e => {
  if (suppressClick) { suppressClick = false; return; }
  if (!isPlaying()) return;
  updatePointer(e);

  if (placing) { place(placing, mouse.x, mouse.y); return; }

  handleCanvasTap(e.shiftKey);
});

canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  clearPlacing();
  placeTouch = null;
  drag = null;
  if (G) { G.selected = []; G.focusTarget = null; }
  syncSelectionMobile();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (paused) { resumeGame(); return; }
    if (placing) { clearPlacing(); return; }
    if (G && G.focusTarget) { G.focusTarget = null; return; }
    if (G && G.selected.length) { G.selected = []; syncSelectionMobile(); return; }
    if (drag) { drag = null; return; }
    if (running && G && !G.over) { pauseGame(); return; }
    clearPlacing(); drag = null; if (G) G.selected = [];
    return;
  }
  if (isSandbox() && isPlaying()) {
    if (e.key === ']') { jumpSandboxWave(e.shiftKey ? 5 : e.ctrlKey ? 10 : 1); return; }
  }
  if (inBuildPhase() && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    startAxisCombat();
    return;
  }
  const k = e.key.toUpperCase();
  const p = activePlaceables().find(pl => pl.hotkey === k);
  if (p) selectPlaceable(p);
});

for (const btn of document.querySelectorAll('[data-wave-skip]')) {
  btn.addEventListener('click', () => jumpSandboxWave(Number(btn.dataset.waveSkip)));
}
