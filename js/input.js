/* Trenchworks: WW2 — placement & pointer/keyboard input.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// how far from a mobile long-press the game will reach to grab an enemy to
// inspect — generous, since a fingertip covers a small, moving target
const LONGPRESS_SNAP_R = 40;

// A dummy scarecrow is duck-typed enough to ride the enemy targeting and
// direct-fire damage paths (which read target.t and target.side): it looks like
// a fixed friendly with no weapon. Its real handling lives in damageDummy and
// the dummy branches of the target scans. A monotonic id tags each decoy so an
// enemy can permanently ignore the one it has seen through.
const DUMMY_T = { fixed: true, dummy: true };
let dummySeq = 0;

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

function moveOrderMinX() {
  return FORWARD_X;
}

function moveOrderValid(x, y) {
  const minX = moveOrderMinX();
  return y >= 16 && y <= H - 16 && x > minX && x < W - 14;
}

function canReceiveMoveOrders() {
  return G && G.selected.some(u => !u.t.fixed);
}

function showForwardLine() {
  return !!G;
}

function unitAtWorld(x, y) {
  if (!G) return null;
  for (const u of commandRoster()) {
    const base = u.t.tank ? 26 : u.t.vehicle ? 20 : u.t.gunEmplacement ? 18 : 14;
    if (dist(u, { x, y }) < touchHitRadius(base)) return u;
  }
  return null;
}

// nearest friendly INFANTRYMAN under a point — the target for the Body/Flak
// Armor abilities. Vehicles, tanks and gun emplacements can't be armored.
function nearestArmorableUnit(x, y) {
  if (!G) return null;
  let best = null, bd = Infinity;
  const pt = { x, y };
  for (const u of G.units) {
    if (u.dead || u.isDummy || u.t.tank || u.t.vehicle || u.t.gunEmplacement) continue;
    const d = dist(u, pt);
    if (d < touchHitRadius(16) && d < bd) { bd = d; best = u; }
  }
  return best;
}

// nearest live enemy under a tap, for focus-fire orders (normal defense modes)
function enemyAtWorld(x, y) {
  if (!G) return null;
  let best = null, bd = Infinity;
  for (const e of G.enemies) {
    if (!inTheFight(e)) continue;
    // the same radii the inspector hovers and rings with (js/helpers.js), grown
    // for a fingertip — so what the player can point at is what he can tap
    const d = dist(e, { x, y });
    if (d < touchHitRadius(actorHitRadius(e)) && d < bd) { bd = d; best = e; }
  }
  return best;
}

const officerCount = () => {
  // count live officers directly — G.usOfficers is a 0.4s aura cache that lags
  // behind fresh placements, which would let a placement burst slip past the cap
  return G ? G.units.filter(u => !u.dead && u.type === 'officer').length : 0;
};

const officerLimit = () => (G && G.cardsOwned && G.cardsOwned.has('officercorps')) ? 10 : MAX_OFFICERS;

function attackerTypeStats(p) {
  return ENEMY_TYPES[p.key];
}

function placementValid(p, x, y) {
  // armor abilities are only valid over an eligible infantryman — no wasted TP on empty ground
  if (p.key === 'bodyarmor' || p.key === 'flakarmor') return !!nearestArmorableUnit(x, y);
  if (p.kind === 'support') return x > 20 && x < W - 10;
  if (p.kind === 'egerman') {
    // testing mode: enemy units go anywhere on the field
    if (x < 16 || x > W - 16 || y < 14 || y > H - 14) return false;
    const t = attackerTypeStats(p);
    const bulk = t.awalker ? 40 : t.heavy ? 40 : t.tank ? 34 : t.apc ? 30 : t.vehicle || t.bike ? 26 : 16;
    for (const e of G.enemies) {
      const gap = Math.max(bulk, e.t.awalker ? 40 : e.t.heavy ? 40 : e.t.tank ? 34 : e.t.vehicle ? 26 : 16);
      if (dist(e, { x, y }) < gap) return false;
    }
    return true;
  }
  // enemy field works go anywhere on the field like enemy units, but still can't
  // be stacked on an existing emplacement (forEachEmplacement now walks them too)
  if (p.kind === 'itwork') {
    if (x < 16 || x > W - 16 || y < 14 || y > H - 14) return false;
    const nb = IT_WORK_KINDS[p.workKind].box;
    let clear = true;
    forEachEmplacement((obj, key) => {
      if (!clear) return;
      const ob = emplacementBox(key);
      if (Math.abs(obj.x - x) < nb.hw + ob.hw && Math.abs(obj.y - y) < nb.hh + ob.hh) clear = false;
    });
    return clear;
  }
  const positions = p.key === 'mine' ? minefieldPositions(x, y) : [{ x, y }];
  const minX = placementMinX(p);
  for (const pos of positions) {
    // engineers extend the build zone: an emplacement sited inside a friendly
    // engineer's work radius may be placed forward of the deploy line — but
    // never past the forward line.
    const posMin = (p.kind === 'defense' && minX > FORWARD_X && engineerBuildReach(pos.x, pos.y))
      ? FORWARD_X : minX;
    if (pos.x < posMin || pos.x > W - 14 || pos.y < 16 || pos.y > H - 16) return false;
  }
  if (p.kind === 'unit') {
    const bulk = k => k === 'sherman' ? 34 : k === 'jeep' ? 26 : (k === 'atgun' || k === 'aagun') ? 24 : 16;
    for (const u of G.units) {
      const gap = Math.max(bulk(p.key), u.t.tank ? 34 : u.t.vehicle ? 26 : 16);
      if (dist(u, { x, y }) < gap) return false;
    }
  }
  // emplacements can't be stacked on one another. They aren't uniform discs
  // like units — most are wide, shallow rectangles — so overlap is an
  // axis-aligned box test against every existing defense (each mine of a
  // minefield gets its own small box).
  if (p.kind === 'defense') {
    const nb = emplacementBox(p.key);
    let clear = true;
    forEachEmplacement((obj, key) => {
      if (!clear) return;
      const ob = emplacementBox(key);
      for (const pos of positions) {
        if (Math.abs(obj.x - pos.x) < nb.hw + ob.hw &&
            Math.abs(obj.y - pos.y) < nb.hh + ob.hh) { clear = false; return; }
      }
    });
    if (!clear) return false;
  }
  return true;
}

// half-extents of a placed emplacement's physical body (the drawn footprint,
// not its cover/effect zone), used to keep defenses from being dropped on top
// of one another. Values trace the shapes in js/render-defenses.js.
function emplacementBox(key) {
  // half-extents in the flipped frame: walls stand ACROSS the enemy's advance,
  // so their long axis is lateral (hh) and their shallow axis is depth (hw)
  switch (key) {
    case 'wire':       return { hw: 8,  hh: 34 };  // long, thin belt
    case 'bunker':     return { hw: 13, hh: 28 };  // concrete slab
    case 'camonest':   return { hw: 13, hh: 28 };  // same footprint as the bunker
    case 'sandbags':   return { hw: 12, hh: 22 };
    case 'dummy':      return { hw: 10, hh: 16 };  // a lone post — drawn upright, unrotated
    case 'ammocrate':  return { hw: 16, hh: 11 };  // crate stack — drawn as-is, unrotated
    case 'watchtower': return { hw: 15, hh: 15 };  // square platform
    case 'mine':       return { hw: 6,  hh: 6 };
    default:           return { hw: 12, hh: 16 };
  }
}

// walk every emplacement currently on the field, tagging each with its key so
// callers can resolve its footprint
function forEachEmplacement(fn) {
  for (const s of G.sandbags) fn(s, 'sandbags');
  for (const b of G.bunkers) fn(b, 'bunker');
  for (const w of G.watchtowers) fn(w, 'watchtower');
  for (const c of G.camoNests) fn(c, 'camonest');
  for (const a of G.ammoCrates) fn(a, 'ammocrate');
  for (const d of G.dummies) fn(d, 'dummy');
  for (const w of G.wires) fn(w, 'wire');
  for (const m of G.mines) { if (!m.dead) fn(m, 'mine'); }
  // enemy field works occupy ground too — the player can't drop a bunker on top
  // of an Italian one. Their `kind` already matches the box keys above.
  for (const w of G.itWorks) fn(w, w.kind);
}

// An engineer extends the build zone: an emplacement sited inside a friendly
// engineer's work radius may be placed forward of the deploy line (up to the
// forward line). Returns true if any live US engineer covers (x, y). Uses the
// same fixed ENGINEER_RANGE as the engineer's repair reach and its selection
// overlay, so the buildable pocket matches the ring the player sees.
function engineerBuildReach(x, y) {
  if (!G) return false;
  const R2 = ENGINEER_RANGE * ENGINEER_RANGE;
  const pt = { x, y };
  for (const u of G.units) {
    if (u.dead || u.type !== 'engineer' || u.side !== 'us') continue;
    if (dist2(u, pt) <= R2) return true;
  }
  return false;
}

function placementMinX(p) {
  // testing-mode enemy pieces (units and Italian works) go anywhere on the
  // field, so nothing up-field is out of bounds for them — without this the
  // ghost shades the whole enemy end of the map red while the placement still succeeds
  if (p.kind === 'egerman' || p.kind === 'itwork') return 0;
  // mines/wire lay up to the forward line; the camo nest and dummy are forward
  // pieces too (a hidden ambush position and a decoy to draw fire), so they get
  // the same reach — everything else holds behind the deploy line.
  return (p.key === 'mine' || p.key === 'wire'
          || p.key === 'camonest' || p.key === 'dummy') ? FORWARD_X : DEPLOY_X + 12;
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
  if (!placementValid(p, x, y)) {
    const fallback = (p.kind === 'unit' || p.kind === 'defense') ? findNearestValidRadial(p, x, y) : null;
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
  recapDeployed(p);
  SFX.click();
  mobileVibrate(8);

  applyPlacement(p, x, y);

  // keep placing defenses if affordable; strikes are one-shot, but the armor
  // abilities stay selected (like defenses) so the player can kit out several
  // men in a row and deselect when done.
  const oneShotSupport = p.kind === 'support' && p.key !== 'bodyarmor' && p.key !== 'flakarmor';
  if (oneShotSupport || !canAffordTP(placeableCost(p)) || (p.key === 'officer' && officerCount() >= officerLimit())) clearPlacing();
}

// The raw "what does placing item p at (x,y) create" switch, split out of
// place() so it can be reused by the test harness (js/test-api.js) without
// re-implementing — and drifting from — the game's own creation logic. This
// half is deliberately effect-only: it assumes the caller has already run
// validation, affordability, and TP spend (place() does; the harness charges
// or skips TP as appropriate). It never touches placing/UI state.
function applyPlacement(p, x, y) {
  if (p.kind === 'unit') {
    const u = makeUnit(p.key, x, y);
    G.units.push(u);
    maybeSpawnPassenger(u);   // Passenger card: a deployed jeep drops a free grunt
    return u;
  } else if (p.kind === 'egerman') {
    const e = makeEnemy(p.key, x, y);
    G.enemies.push(e);
    return e;
  } else if (p.key === 'dummy') {
    // decoy: fortifyAdd makes each engineer tier add a flat DUMMY_HP of
    // HP (495 -> 990 -> 1485) instead of the usual multiplier. isDummy routes
    // its damage through the scarecrow path (damageDummy) and its id lets an
    // enemy that has seen through the ruse ignore this specific decoy.
    G.dummies.push(prehardenDefense({ x, y, hp: DUMMY_HP, maxhp: DUMMY_HP, up: false, up2: false,
      workProg: 0, fortifyAdd: DUMMY_HP, isDummy: true, side: 'us', type: 'dummy',
      t: DUMMY_T, id: ++dummySeq }));
  } else if (p.kind === 'itwork') {
    // testing-mode only: stake out an enemy field work directly, so a board
    // state can be forced without waiting for a guastatore to build one
    const w = makeItalianWork(p.workKind, x, y);
    G.itWorks.push(w);
    return w;
  // every emplacement goes in through prehardenDefense (js/cards.js): with the
  // Pre-Hardened card it is placed already fortified, otherwise it passes straight
  } else if (p.key === 'sandbags') {
    G.sandbags.push(prehardenDefense({ x, y, hp: SANDBAG_HP, maxhp: SANDBAG_HP, up: false, workProg: 0 }));
  } else if (p.key === 'bunker') {
    G.bunkers.push(prehardenDefense({ x, y, hp: BUNKER_HP, maxhp: BUNKER_HP, up: false, workProg: 0 }));
  } else if (p.key === 'watchtower') {
    G.watchtowers.push(prehardenDefense({ x, y, hp: WATCHTOWER_HP, maxhp: WATCHTOWER_HP, up: false, workProg: 0 }));
  } else if (p.key === 'camonest') {
    G.camoNests.push(prehardenDefense({ x, y, hp: CAMONEST_HP, maxhp: CAMONEST_HP, up: false, workProg: 0, fortifyMult: 2 }));
  } else if (p.key === 'ammocrate') {
    G.ammoCrates.push(prehardenDefense({ x, y, hp: AMMOCRATE_HP, maxhp: AMMOCRATE_HP, up: false, workProg: 0 }));
  } else if (p.key === 'wire') {
    G.wires.push(prehardenDefense({ x, y, hp: 3750, maxhp: 3750, up: false, workProg: 0 }));
  } else if (p.key === 'mine') {
    for (const pos of minefieldPositions(x, y)) {
      G.mines.push({ x: pos.x, y: pos.y, dead: false });
    }
  } else if (p.key === 'mortar') {
    showBanner('MORTAR FIRE MISSION');
    for (let i = 0; i < 6; i++) {
      scheduleShell(x + rand(-57, 57), y + rand(-68, 68), 2.4 + i * 1.0, 42, 90, false);
    }
  } else if (p.key === 'artillery') {
    showBanner('105mm BARRAGE INBOUND');
    for (let i = 0; i < 16; i++) {
      scheduleShell(x + rand(-70, 70), y + rand(-90, 90), 1.6 + i * 0.45, 55, 105, true);
    }
  } else if (p.key === 'rankup') {
    showBanner('FIELD PROMOTIONS');
    const pt = { x, y };
    for (const a of G.units) {
      if (!a.dead && dist2(a, pt) < RANKUP_RADIUS * RANKUP_RADIUS) rankUpUnit(a);
    }
    for (const a of G.enemies) {
      if (!a.dead && dist2(a, pt) < RANKUP_RADIUS * RANKUP_RADIUS) rankUpUnit(a);
    }
  } else if (p.key === 'purge') {
    showBanner('AREA CLEARED');
    purgeRadius(x, y, PURGE_RADIUS);
  } else if (p.key === 'bodyarmor' || p.key === 'flakarmor') {
    // fit armor on the single infantryman under the cursor; re-buying refills
    // his bar. placementValid already guaranteed there's a man here.
    const u = nearestArmorableUnit(x, y);
    if (u) {
      const pts = armorPlatePoints();   // doubled by the Reinforced Plate card
      if (p.key === 'bodyarmor') { u.maxBodyArmor = pts; u.bodyArmor = pts; }
      else { u.maxFlakArmor = pts; u.flakArmor = pts; }
      G.texts.push({ x: u.x, y: u.y - 22, text: p.label, ttl: 2.0 });
    }
    return u;
  }
  return null;
}

function updatePointer(e) {
  const pt = clientToWorld(e.clientX, e.clientY);
  mouse.x = pt.x;
  mouse.y = pt.y;
  mouse.inside = true;
}

// which soldiers answer to the player
function commandRoster() {
  return G.units;
}

function handleCanvasTap(shiftKey = false) {
  if (!isPlaying()) return;
  const x = mouse.x, y = mouse.y;

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
      issueMoveOrder(G.selected, T.bunker.x + 2, T.bunker.y);
      SFX.click();
      mobileVibrate(5);
    }
    return;
  }
  // click an enemy → focus-fire: every troop in range concentrates on it.
  const foe = enemyAtWorld(x, y);
  if (foe) {
    G.focusTarget = (G.focusTarget === foe) ? null : foe;  // click again to release
    if (G.focusTarget) G.texts.push({ x: foe.x, y: foe.y - 18, text: 'FOCUS FIRE', ttl: 1.4 });
    SFX.click();
    mobileVibrate(5);
    return;
  }
  // move selected soldiers
  if (G.selected.length && moveOrderValid(x, y)) {
    issueMoveOrder(G.selected, x, y);
    SFX.click();
    mobileVibrate(5);
    return;
  }
  // tap an emplacement → pin its info panel. Touch has no hover, and this is the
  // whole mobile route to the emplacement inspector. It sits LAST on purpose:
  // with troops selected, a tap on your own bunker is a move order INTO its
  // cover, which is the more useful reading of that tap and must keep winning.
  // The piece is never put in G.selected — it is not an actor, and the marquee
  // that fills that array only ever walks commandRoster().
  if (touchUI()) {
    const emp = emplacementAt(x, y, EMP_TAP_SLOP);
    if (emp) {
      touchInspect = emp;
      SFX.click();
      mobileVibrate(5);
      return;
    }
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
  touchInspect = null;   // any new touch dismisses a pinned info panel

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
    // view panning moved to two-finger gestures; single-finger drag starts marquee
  }

  if (!isPlaying()) return;
  drag = { x0: mouse.x, y0: mouse.y, x1: mouse.x, y1: mouse.y, active: false };

  // long-press on mobile → inspect a nearby enemy, or (on empty ground) enter
  // multi-select marquee mode. Deliberately reaches for ENEMIES ONLY: they are
  // the one thing a tap can't already describe (a tap selects your own man and
  // the selection panel says the same things; a tap on an emplacement pins its
  // panel below). Letting it grab either of those would eat the marquee gesture
  // on exactly the crowded ground where a player wants to box-select.
  if (touchUI() && !placing) {
    clearLongPress();
    // lock the target now, at press time: the enemy may drift during the hold,
    // and the fingertip snaps to whatever hostile is nearest the press point
    longPressFoe = nearestHostile(mouse.x, mouse.y, LONGPRESS_SNAP_R);
    longPressTimer = setTimeout(() => {
      if (placing) return;
      // don't interfere with an active drag marquee
      if (drag?.active) return;
      if (longPressFoe && !longPressFoe.dead) {
        touchInspect = longPressFoe;   // pin its info panel (touch has no hover)
        longPressing = true;           // release is a hold, not a tap
        drag = null;                   // suppress the marquee box
        mobileVibrate(10);
        return;
      }
      G.selected = [];
      longPressing = true;
      syncSelectionMobile();
      mobileVibrate(10);
    }, 3000);
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
    // view panning is now two-finger only; this block only runs if beginViewPan
    // was called from a different path (e.g. placing while dragging)
    if (!longPressing) {
      if (!viewPan.active) {
        const moved = Math.hypot(e.clientX - viewPan.clientX0, e.clientY - viewPan.clientY0);
        if (moved > tapSlop()) {
          // a pending inspect hold owns the gesture — don't let it become a pan
          if (!unitAtWorld(viewPan.worldX0, viewPan.worldY0) && !longPressFoe) {
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

  // cancel long-press timer if the finger wanders before it fires. An inspect
  // hold (foe locked) gets a roomier tolerance so natural thumb jitter on a
  // small target doesn't abort it.
  if (longPressTimer && drag) {
    const wander = Math.hypot(drag.x1 - drag.x0, drag.y1 - drag.y0);
    if (wander > (longPressFoe ? 30 : tapSlop())) clearLongPress();
  }

  if (placeTouch?.active) {
    if (Math.hypot(mouse.x - placeTouch.startX, mouse.y - placeTouch.startY) > 6) placeTouch.moved = true;
  }
  if (drag) {
    drag.x1 = mouse.x;
    drag.y1 = mouse.y;
    // don't open a marquee while an inspect hold is pending on a locked enemy
    if (!drag.active && !longPressFoe && Math.hypot(drag.x1 - drag.x0, drag.y1 - drag.y0) > tapSlop()) {
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
  longPressFoe = null;

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

// how much elbow room a man needs where he ends up. Only ever used to keep
// march destinations apart — the sim itself has no collision, so two orders that
// resolve to the same point put two sprites on one spot for good.
function moveSpaceRadius(u) {
  return u.t.tank ? 22 : u.t.vehicle ? 16 : u.t.gunEmplacement ? 12 : 11;
}

// Nearest spot to (px,py) that is on the field AND clear of everything already
// standing there. Both stacking bugs are the same bug: an ideal slot that isn't
// a legal resting place used to be CLAMPED, and a clamp collapses — order a
// squad onto the edge of the forward line and every slot past the boundary
// lands on the identical boundary point, while a slot that happens to sit on a
// man who isn't marching with the group has never been checked at all. So the
// slot is redirected instead: spiral out until something fits.
function clearMoveSlot(px, py, selfR, taken, blockers, minX, toward) {
  const p = { x: 0, y: 0 };
  const fits = (cx, cy) => {
    if (cy < 16 || cy > H - 16 || cx < minX || cx > W - 14) return false;
    p.x = cx; p.y = cy;
    const own = selfR * 2;
    for (const s of taken) if (dist2(p, s) < own * own) return false;
    for (const b of blockers) {
      const rr = selfR + b.r;
      if (dist2(p, b) < rr * rr) return false;
    }
    return true;
  };
  if (fits(px, py)) return { x: px, y: py };
  const step = Math.max(8, selfR * 1.1);
  for (let ring = 1; ring <= 12; ring++) {
    const rad = ring * step;
    const n = 8 + ring * 4;
    let best = null, bd = Infinity;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const cx = px + Math.cos(a) * rad, cy = py + Math.sin(a) * rad;
      if (!fits(cx, cy)) continue;
      // every candidate on a ring is the same distance from the ideal slot, so
      // break the tie toward the order's own centre and keep the group tight
      p.x = cx; p.y = cy;
      const d = dist2(p, toward);
      if (d < bd) { bd = d; best = { x: cx, y: cy }; }
    }
    if (best) return best;
  }
  return null;
}

// spread a group order into a tight grid around the target so men don't stack
function issueMoveOrder(units, x, y) {
  units = units.filter(u => !u.t.fixed);   // staked guns don't take march orders
  if (!units.length) return;
  // US soldiers hold behind the forward line
  const minX = moveOrderMinX() + 2;
  const clampDest = (dx, dy) => ({
    x: clamp(dx, minX, W - 14),
    y: clamp(dy, 16, H - 16),
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
    slots.push({
      x: x + (col - (inRow - 1) / 2) * spacing,
      y: y + (row - (rows - 1) / 2) * spacing,
    });
  }
  // Everyone NOT marching with this group is ground the group can't have. A man
  // already under orders is read at his destination, not where he happens to be
  // standing — that's where he'll be when this group arrives.
  const marching = new Set(units);
  const blockers = [];
  for (const u of commandRoster()) {
    if (u.dead || marching.has(u)) continue;
    const at = u.moveTo || u;
    blockers.push({ x: at.x, y: at.y, r: moveSpaceRadius(u) });
  }
  // resolve the slots nearest the click first, so the ones that have to give
  // ground are the ones already out on the edge of the formation
  const centre = { x, y };
  const order = slots.map((s, i) => i).sort((a, b) => dist2(slots[a], centre) - dist2(slots[b], centre));
  const taken = [];
  for (const i of order) {
    const fixed = clearMoveSlot(slots[i].x, slots[i].y, spacing / 2, taken, blockers, minX, centre);
    // nowhere within reach fits (a genuinely packed field): fall back to the old
    // clamp rather than leaving a man with no order at all
    slots[i] = fixed || clampDest(slots[i].x, slots[i].y);
    taken.push(slots[i]);
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
    // the escalation dossier is the only overlay here that layers over another
    // one, so it gets first claim on Escape
    if (escDossierOpen()) { closeEscalationDossier(); return; }
    // the abandon-save prompt swaps out the screen that launched it; Escape means BACK,
    // never fall-through (the paused branch below would resume a hidden fight)
    if (abandonConfirmOpen()) { closeAbandonConfirm(); return; }
    // codex / settings / loadout — see PAUSE_SUBSCREENS (js/flow.js). They swap
    // #pause out but leave `paused` true, so they have to be closed here or the
    // line below resumes the fight behind a screen that's still on top of it.
    if (closePauseSubscreen()) return;
    // The boss-victory screen freezes the field to ask a FORCED question (FIGHT
    // ON / END RUN). Escape must not answer it for the player, and must not fall
    // through to resume — that leaves the run going under a modal they never
    // dismissed, and a second Escape then stacks #pause on top of it.
    if (bossVictoryOpen()) return;
    if (paused) { resumeGame(); return; }
    if (placing) { clearPlacing(); return; }
    if (G && G.focusTarget) { G.focusTarget = null; return; }
    if (G && G.selected.length) { G.selected = []; syncSelectionMobile(); return; }
    if (drag) { drag = null; return; }
    if (running && G && !G.over) { pauseGame(); return; }
    clearPlacing(); drag = null; if (G) G.selected = [];
    return;
  }
  // give up the rest of a tutorial box's read time (WCAG 2.2 SC 2.2.1). Space and
  // Enter are safe here: no placeable hotkey is either, and dismiss is a no-op
  // outside a running tutorial script.
  if (e.key === ' ' || e.key === 'Enter') {
    if (dismissTutorialMsg()) { e.preventDefault(); return; }
  }
  if (isSandbox() && isPlaying()) {
    if (e.key === ']') { jumpSandboxWave(e.shiftKey ? 5 : e.ctrlKey ? 10 : 1); return; }
  }
  const k = e.key.toUpperCase();
  const p = activePlaceables().find(pl => pl.hotkey === k);
  if (p) selectPlaceable(p);
});

// the tutorial box itself is the click target for skipping its read time
{
  const tutBox = el('tutorial-msg');
  if (tutBox) {
    tutBox.addEventListener('mousedown', e => { e.stopPropagation(); });
    tutBox.addEventListener('click', e => { e.stopPropagation(); dismissTutorialMsg(); });
  }
}

for (const btn of document.querySelectorAll('[data-wave-skip]')) {
  btn.addEventListener('click', () => jumpSandboxWave(Number(btn.dataset.waveSkip)));
}
