/* Mud & Blood — settings.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

const TOOLBAR_SIZE_KEY = 'toolbarSize';
const TOOLBAR_SIZE_MIN = 80;
const TOOLBAR_SIZE_MAX = 400;
const TOOLBAR_SIZE_DEFAULT = 100;
const SOUND_VOLUME_KEY = 'soundVolume';
const SOUND_VOLUME_DEFAULT = 100;
const SOUND_MUTED_KEY = 'soundMuted';

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

function applySavedSettings() {
  applyToolbarSize(loadToolbarSize());
  applySoundVolume(loadSoundVolume());
  applySoundMuted(loadSoundMuted());
}

function openSettings(from) {
  settingsReturnTo = from;
  applySavedSettings();
  el('settings').classList.remove('hidden');
  if (from === 'pause') el('pause').classList.add('hidden');
  else el('intro').classList.add('hidden');
}

function closeSettings() {
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
