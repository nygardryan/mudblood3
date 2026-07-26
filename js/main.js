/* Trenchworks: WW2 — event wiring, frame loop & bootstrap.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

el('start-endless').addEventListener('click', openEndlessSelect);
el('endless-back-btn').addEventListener('click', closeEndlessSelect);
for (const btn of document.querySelectorAll('[data-endless-diff]')) {
  btn.addEventListener('click', () => openEndlessLoadout(btn.dataset.endlessDiff));
}
el('endless-leaderboard-btn').addEventListener('click', () => openLeaderboardSelect('endless-select', 'easy'));
el('card-shop-btn').addEventListener('click', () => openCardShop('endless-select'));
el('card-shop-deploy').addEventListener('click', deployEndlessLoadout);
el('card-shop-deploy-top').addEventListener('click', deployEndlessLoadout);
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
for (const btn of document.querySelectorAll('.lb-tab')) {
  btn.addEventListener('click', () => { leaderboardActiveDiff = btn.dataset.lbDiff; buildLeaderboardSelect(); });
}
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
el('pause-menu-btn').addEventListener('click', returnToMenu);
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
  if (G && (playing || viewDirty)) {
    draw();
    viewDirty = false;
  }
  hudAccum += dt;
  if (hudAccum >= HUD_INTERVAL) {
    hudAccum = 0;
    updateHUD();
  }
}

buildToolbar(PLACEABLES);
applySavedSettings();
fitLayout();
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
