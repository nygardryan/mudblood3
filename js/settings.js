/* Trenchworks: WW2 — settings.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

const TOOLBAR_SIZE_KEY = 'toolbarSize';
const TOOLBAR_SIZE_MIN = 80;
const TOOLBAR_SIZE_MAX = 400;
const TOOLBAR_SIZE_DEFAULT = 100;
const SOUND_VOLUME_KEY = 'soundVolume';
const SOUND_VOLUME_DEFAULT = 100;
const SOUND_MUTED_KEY = 'soundMuted';
const MUSIC_VOLUME_KEY = 'musicVolume';
const MUSIC_VOLUME_DEFAULT = 10;
const MUSIC_MUTED_KEY = 'musicMuted';
const SHAKE_AMOUNT_KEY = 'shakeAmount';
const SHAKE_AMOUNT_DEFAULT = 50;
let shakeScale = 1; // 0-1 multiplier applied to every addShake() call

function clampToolbarSize(pct) {
  return Math.max(TOOLBAR_SIZE_MIN, Math.min(TOOLBAR_SIZE_MAX, Math.round(pct)));
}

function loadToolbarSize() {
  const saved = parseInt(localStorage.getItem(TOOLBAR_SIZE_KEY), 10);
  if (Number.isFinite(saved)) return clampToolbarSize(saved);
  return touchUI() ? 85 : TOOLBAR_SIZE_DEFAULT;
}

function applyToolbarSize(pct) {
  const size = clampToolbarSize(pct);
  const stage = el('stage');
  if (stage) stage.style.setProperty('--tool-scale', (size / 100).toString());
  const slider = el('toolbar-size-slider');
  const label = el('toolbar-size-label');
  if (slider) slider.value = size;
  if (label) label.textContent = size + '%';
  syncToolbarLayout();
  return size;
}

function saveToolbarSize(pct) {
  const size = applyToolbarSize(pct);
  localStorage.setItem(TOOLBAR_SIZE_KEY, String(size));
}

function clampSoundVolume(pct) {
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function loadSoundVolume() {
  const saved = parseInt(localStorage.getItem(SOUND_VOLUME_KEY), 10);
  return Number.isFinite(saved) ? clampSoundVolume(saved) : SOUND_VOLUME_DEFAULT;
}

function applySoundVolume(pct) {
  const vol = SFX.setVolume(clampSoundVolume(pct));
  const slider = el('sound-volume-slider');
  const label = el('sound-volume-label');
  if (slider) slider.value = vol;
  if (label) label.textContent = vol + '%';
  return vol;
}

function saveSoundVolume(pct) {
  const vol = applySoundVolume(pct);
  localStorage.setItem(SOUND_VOLUME_KEY, String(vol));
}

function loadSoundMuted() {
  const saved = localStorage.getItem(SOUND_MUTED_KEY);
  if (saved === 'true') return true;
  if (saved === 'false') return false;
  return false;
}

function applySoundMuted(muted) {
  SFX.setMuted(muted);
  syncMuteButtons();
  return muted;
}

function saveSoundMuted(muted) {
  const on = applySoundMuted(muted);
  localStorage.setItem(SOUND_MUTED_KEY, String(on));
}

function clampMusicVolume(pct) {
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function loadMusicVolume() {
  const saved = parseInt(localStorage.getItem(MUSIC_VOLUME_KEY), 10);
  return Number.isFinite(saved) ? clampMusicVolume(saved) : MUSIC_VOLUME_DEFAULT;
}

function applyMusicVolume(pct) {
  const vol = MUSIC.setVolume(clampMusicVolume(pct));
  const slider = el('music-volume-slider');
  const label = el('music-volume-label');
  if (slider) slider.value = vol;
  if (label) label.textContent = vol + '%';
  return vol;
}

function saveMusicVolume(pct) {
  const vol = applyMusicVolume(pct);
  localStorage.setItem(MUSIC_VOLUME_KEY, String(vol));
}

function loadMusicMuted() {
  const saved = localStorage.getItem(MUSIC_MUTED_KEY);
  if (saved === 'true') return true;
  if (saved === 'false') return false;
  return false;
}

function applyMusicMuted(muted) {
  MUSIC.setMuted(muted);
  syncMuteButtons();
  return muted;
}

function saveMusicMuted(muted) {
  const on = applyMusicMuted(muted);
  localStorage.setItem(MUSIC_MUTED_KEY, String(on));
}

function clampShakeAmount(pct) {
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function loadShakeAmount() {
  const saved = parseInt(localStorage.getItem(SHAKE_AMOUNT_KEY), 10);
  return Number.isFinite(saved) ? clampShakeAmount(saved) : SHAKE_AMOUNT_DEFAULT;
}

function applyShakeAmount(pct) {
  const amount = clampShakeAmount(pct);
  shakeScale = amount / 100;
  const slider = el('shake-amount-slider');
  const label = el('shake-amount-label');
  if (slider) slider.value = amount;
  if (label) label.textContent = amount + '%';
  return amount;
}

function saveShakeAmount(pct) {
  const amount = applyShakeAmount(pct);
  localStorage.setItem(SHAKE_AMOUNT_KEY, String(amount));
}

// Whether an installed sprite pack is drawn at all. The pack's own loader owns
// the localStorage key, so this only mirrors the state into the panel.
function applyCustomSprites() {
  const on = SPRITES.isEnabled();
  const label = el('custom-sprites-label');
  const btn = el('settings-custom-sprites-btn');
  if (label) label.textContent = on ? 'ON' : 'OFF';
  if (btn) btn.textContent = on ? 'ART OFF' : 'ART ON';
  return on;
}

function applySavedSettings() {
  applyToolbarSize(loadToolbarSize());
  applyCustomSprites();
  applySoundVolume(loadSoundVolume());
  applySoundMuted(loadSoundMuted());
  applyMusicVolume(loadMusicVolume());
  applyMusicMuted(loadMusicMuted());
  applyShakeAmount(loadShakeAmount());
}

function openSettings(from) {
  settingsReturnTo = from;
  applySavedSettings();
  el('settings').classList.remove('hidden');
  if (from === 'pause') el('pause').classList.add('hidden');
  else el('intro').classList.add('hidden');
}

function settingsOpen() {
  return !el('settings').classList.contains('hidden');
}

function closeSettings() {
  if (!settingsOpen()) return;
  el('settings').classList.add('hidden');
  if (settingsReturnTo === 'pause') el('pause').classList.remove('hidden');
  else el('intro').classList.remove('hidden');
}

el('settings-btn').addEventListener('click', () => openSettings('intro'));
el('pause-settings-btn').addEventListener('click', () => openSettings('pause'));
el('settings-back-btn').addEventListener('click', closeSettings);
el('settings-mute-btn').addEventListener('click', () => {
  saveSoundMuted(!SFX.muted);
});
el('toolbar-size-slider').addEventListener('input', e => {
  saveToolbarSize(Number(e.target.value));
});
el('sound-volume-slider').addEventListener('input', e => {
  saveSoundVolume(Number(e.target.value));
});
el('settings-music-btn').addEventListener('click', () => {
  saveMusicMuted(!MUSIC.muted);
});
el('settings-music-next').addEventListener('click', () => {
  MUSIC.next();
});
el('music-volume-slider').addEventListener('input', e => {
  saveMusicVolume(Number(e.target.value));
});
el('shake-amount-slider').addEventListener('input', e => {
  saveShakeAmount(Number(e.target.value));
});
el('settings-custom-sprites-btn').addEventListener('click', () => {
  SPRITES.setEnabled(!SPRITES.isEnabled());
  applyCustomSprites();
});
// Both halves of the sprite-pack workflow need a filesystem the player can
// reach, and mobile has none: the export hands its ZIP back through an
// <a download> on a blob: URL, which neither WKWebView nor the Android WebView
// acts on — the button would bake all 183 drawables and then silently produce
// nothing — and installing a pack means dropping a folder beside index.html,
// which there is inside the app bundle. So the control is never created,
// exactly as PLATFORM.isDesktop never creates the desktop section below. ART
// OFF/ON stays: a pack can still be shipped baked into the build.
if (PLATFORM.isMobile) {
  el('sprite-export-row').remove();
  el('sprite-export-hint').textContent =
    'This build draws the artwork it ships with. Sprite packs are installed ' +
    'into the app bundle when the game is built, not from here.';
} else {
  // on desktop that folder is inside the installed game rather than beside a
  // page you are serving, and an AppImage's copy is read-only
  if (PLATFORM.isDesktop) {
    el('sprite-export-hint').insertAdjacentHTML('beforeend',
      ' On desktop <code>assets/sprites/</code> lives in the installed game\'s ' +
      'resources folder; the AppImage build is read-only and can\'t take one.');
  }
  el('settings-export-sprites').addEventListener('click', async () => {
    const btn = el('settings-export-sprites');
    const out = el('sprite-export-status');
    // it renders every drawable in the roster, which takes a few seconds
    btn.disabled = true;
    btn.textContent = 'RENDERING…';
    out.textContent = '';
    try {
      const r = await exportSpritePack();
      out.textContent = r.count + ' sprites, ' + Math.round(r.bytes / 1024) + ' KB'
        + (r.errors.length ? ' — ' + r.errors.length + ' failed' : '');
    } catch (e) {
      out.textContent = 'Export failed: ' + ((e && e.message) || e);
    } finally {
      btn.disabled = false;
      btn.textContent = 'EXPORT SPRITE PACK';
    }
  });
}

// Desktop shell only: an in-game way out (Steam expects one) plus a fullscreen
// toggle. Web and mobile never create the section, so their settings screen is
// byte-identical to before the shells existed.
if (PLATFORM.isDesktop) {
  const section = document.createElement('div');
  section.className = 'settings-section';
  section.innerHTML =
    '<div class="settings-section-title">Desktop</div>' +
    '<div class="settings-devrow">' +
    '<button type="button" class="secondary" id="settings-fullscreen-btn" title="F11 or Alt+Enter">FULLSCREEN</button>' +
    '<button type="button" class="secondary" id="settings-quit-btn">QUIT GAME</button>' +
    '</div>';
  el('changelog-btn').closest('.settings-section').insertAdjacentElement('beforebegin', section);
  el('settings-fullscreen-btn').addEventListener('click', () => PLATFORM.toggleFullscreen());
  el('settings-quit-btn').addEventListener('click', () => PLATFORM.quit());
}
