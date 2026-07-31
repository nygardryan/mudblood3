/* Trenchworks: WW2 — event wiring, frame loop & bootstrap.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

// sandbox / testing now live in Settings under DEV TOOLS — the selector is
// unchanged, it just finds them there
for (const btn of document.querySelectorAll('[data-endless-diff]')) {
  btn.addEventListener('click', () => openEndlessLoadout(btn.dataset.endlessDiff, 'settings'));
}
// the two ends of the PLAY slab. They walk one rung; the dossier's strip and
// rows are the way to jump (buildEscRungs / buildEscDossier wire their own).
el('esc-prev').addEventListener('click', () => stepEscalation(-1));
el('esc-next').addEventListener('click', () => stepEscalation(1));
// PLAY is the deploy control, and the only one — it starts a run at whatever
// rung the slab is showing, which is why the menu has no mode picker at all.
el('esc-deploy').addEventListener('click', () => openEndlessLoadout('easy'));
el('esc-dossier-open').addEventListener('click', openEscalationDossier);
el('esc-dossier-close').addEventListener('click', closeEscalationDossier);
// it layers over the menu, so it closes the way a layer does — click the
// backdrop (never a row, hence the target check) or press Escape (js/input.js)
el('esc-dossier').addEventListener('click', e => {
  if (e.target === el('esc-dossier')) closeEscalationDossier();
});
// no rung argument: it opens on the one you're set to play (see openLeaderboardSelect)
el('endless-leaderboard-btn').addEventListener('click', () => openLeaderboardSelect('intro'));
el('card-shop-btn').addEventListener('click', () => openCardShop('intro'));
el('card-shop-deploy').addEventListener('click', deployEndlessLoadout);
el('card-shop-back').addEventListener('click', closeCardShop);
// spending medals on capacity changes what the shop row can afford too,
// so rebuild the whole screen, not just the plan section
el('plan-upgrade').addEventListener('click', () => {
  if (buyCommandCapacity()) {
    SFX.click();
    buildCardShopUI();
  }
});
el('card-shop-reroll').addEventListener('click', () => {
  if (rerollShop()) {
    SFX.click();
    buildCardShopUI();
  }
});
// widening the shop adds a card slot and can change what's affordable, so
// rebuild the whole screen
el('card-shop-slot').addEventListener('click', () => {
  if (buyShopSlot()) {
    SFX.click();
    buildCardShopUI();
  }
});
el('leaderboard-back-btn').addEventListener('click', closeLeaderboardSelect);
// the rung chips are built per open by buildLeaderboardRungs() and carry their
// own handlers — there's nothing static to wire here
el('go-save-score-btn').addEventListener('click', saveGoLeaderboardScore);
el('go-name-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveGoLeaderboardScore();
});
el('start-tutorial').addEventListener('click', openTutorialSelect);
el('tutorial-back-btn').addEventListener('click', closeTutorialSelect);
el('restart-btn').addEventListener('click', () => startGame(G ? G.level.id : 'endless', G?.difficulty?.id));
el('go-shop-btn').addEventListener('click', () => openCardShop('gameover'));
el('ee-shop-btn').addEventListener('click', () => openCardShop('endless-endgame'));
el('ee-restart').addEventListener('click', () => startGame(G ? G.level.id : 'endless', G?.difficulty?.id));
el('ee-menu').addEventListener('click', returnToMenu);
el('menu-btn').addEventListener('click', returnToMenu);
el('tutorial-complete-btn').addEventListener('click', backToTutorialSelect);
el('speed-btn').addEventListener('click', cycleSpeed);
el('pause-btn').addEventListener('click', pauseGame);
el('pause-resume-btn').addEventListener('click', resumeGame);
el('pause-codex-btn').addEventListener('click', openCodexFromPause);
el('pause-loadout-btn').addEventListener('click', openLoadoutView);
el('loadout-view-close').addEventListener('click', closeLoadoutView);
el('pause-save-btn').addEventListener('click', saveAndExit);
el('pause-menu-btn').addEventListener('click', returnToMenu);
el('continue-run').addEventListener('click', continueRun);
el('abandon-confirm-btn').addEventListener('click', confirmAbandonRun);
el('abandon-cancel-btn').addEventListener('click', closeAbandonConfirm);
el('boss-fight-on-btn').addEventListener('click', bossFightOn);
el('boss-end-run-btn').addEventListener('click', bossEndRun);
el('mobile-deselect').addEventListener('click', () => {
  if (!G) return;
  G.selected = [];
  SFX.click();
  syncSelectionMobile();
});

el('mobile-shop').addEventListener('click', () => {
  mobileToolbarMinimized = false;
  SFX.click();
  syncMobileChrome();
  syncToolbarLayout();
});

el('place-cancel').addEventListener('click', () => {
  if (!placing) return;
  clearPlacing();
  SFX.click();
  mobileVibrate(8);
});

function frame(now) {
  requestAnimationFrame(frame);
  if (!G) return;
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;
  const playing = running && !G.over && !paused;
  if (playing) {
    let remaining = dt * gameSpeed;
    while (remaining > 0) {
      const step = Math.min(remaining, 0.05);
      update(step);
      remaining -= step;
    }
  }
  // ATTRACT: the menu's live background (js/attract.js). It is deliberately NOT
  // `playing` — it never sets `running`, so the HUD, the toolbar, the tipbar and
  // every input handler stay inert with no guards of their own. Sub-stepped the
  // same way a real run is, because the sim is the same sim.
  const attracting = !playing && attractStepping();
  if (attracting) {
    let remaining = dt;
    while (remaining > 0) {
      const step = Math.min(remaining, 0.05);
      stepAttract(step);
      remaining -= step;
    }
  }
  if (G && (playing || attracting || viewDirty)) {
    // G outlives the run, so a redraw request that arrives while we're back on
    // the menu would put the old board back under the panel — re-wipe instead
    // (see clearField). A live run always draws; so does the attract demo, which
    // IS the board behind the menu; nothing else does.
    if (fieldBlank && !playing && !attracting) clearField();
    else draw();
    viewDirty = false;
  }
  hudAccum += dt;
  if (hudAccum >= HUD_INTERVAL) {
    hudAccum = 0;
    updateHUD();
  }
}

// PLATFORM.onReady runs inline on web/desktop (identical boot to before the
// shim existed); on mobile it waits for the durable-save restore, so nothing
// below reads storage before the mirror has been folded back in.
PLATFORM.onReady(() => {
  buildToolbar(PLACEABLES);
  applySavedSettings();
  refreshMenu();   // surface the save, the rung and the medal count from page load
  fitLayout();
  startAttract();   // ATTRACT: the menu is the first thing up (js/attract.js)
  const hudEl = el('hud');
  if (hudEl && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => syncToolbarLayout()).observe(hudEl);
  }
  window.addEventListener('resize', fitLayout);
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      fitLayout();
      if (G && mobileViewActive()) resetViewCam(G.mode);
    }, 100);
  });
  requestAnimationFrame(frame);
});
