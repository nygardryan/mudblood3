/* Trenchworks: WW2 — background music playlist.
   Drop audio files (.ogg/.mp3) into assets/music/ and list the filenames
   in TRACKS below. Tracks loop in order; missing files are skipped silently.
   Part of a set of plain scripts sharing one global scope; load order is set in index.html. */
'use strict';

const MUSIC = (() => {
  const BASE = 'assets/music/';
  const TRACKS = [
    'the-long-march-home.mp3',
    'the-last-march-home.mp3',
    'the-last-letter-home.mp3',
  ];

  let audio = null;
  let index = 0;
  let started = false;
  let muted = false;
  let volume = 60;
  let failures = 0; // consecutive load failures; stop after a full failed cycle

  function applyVolume() {
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, volume / 100));
    audio.muted = muted;
  }

  function playTrack(i) {
    index = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
    audio.src = BASE + TRACKS[index];
    audio.play().catch(() => { /* autoplay blocked or unsupported — stay silent */ });
  }

  function start() {
    if (started || TRACKS.length === 0) return;
    started = true;
    audio = new Audio();
    audio.preload = 'auto';
    applyVolume();
    audio.addEventListener('playing', () => { failures = 0; });
    audio.addEventListener('ended', () => playTrack(index + 1));
    audio.addEventListener('error', () => {
      failures++;
      if (failures >= TRACKS.length) return; // every track failed — give up quietly
      playTrack(index + 1);
    });
    playTrack(0);
  }

  return {
    start,
    setVolume(pct) { volume = Math.max(0, Math.min(100, Math.round(pct))); applyVolume(); return volume; },
    get volume() { return volume; },
    setMuted(on) { muted = !!on; applyVolume(); return muted; },
    get muted() { return muted; },
  };
})();

// Browsers block audio until the first user gesture — start on the first
// press anywhere (menu button or battlefield).
document.addEventListener('pointerdown', () => MUSIC.start(), { once: true, capture: true });
document.addEventListener('keydown', () => MUSIC.start(), { once: true, capture: true });
