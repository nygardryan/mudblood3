/* Trenchworks: WW2 — campaign progress.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

const PROGRESS_KEY = 'campaignProgress';
const PROGRESS_VERSION = 1;

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { version: PROGRESS_VERSION, completed: {} };
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || data.version !== PROGRESS_VERSION) {
      return { version: PROGRESS_VERSION, completed: {} };
    }
    return { version: PROGRESS_VERSION, completed: data.completed || {} };
  } catch {
    return { version: PROGRESS_VERSION, completed: {} };
  }
}

function saveProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function markLevelComplete(id) {
  const progress = loadProgress();
  progress.completed[id] = true;
  saveProgress(progress);
}

function isLevelComplete(id) {
  return !!loadProgress().completed[id];
}

function isLevelUnlocked(id, campaign) {
  const idx = campaign.indexOf(id);
  if (idx < 0) return false;
  if (idx === 0) return true;
  return isLevelComplete(campaign[idx - 1]);
}
