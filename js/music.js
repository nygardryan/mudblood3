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
    'the-long-campaign.mp3',
    'the-front-lines.mp3',
    'the-ash-and-iron.mp3',
    'the-final-stand.mp3',
  ];

  let audio = null;
  let index = 0;
  let started = false;
  let muted = false;
  let volume = 60;
  let failures = 0; // consecutive load failures; stop after a full failed cycle
  let dead = false; // a whole cycle failed — nothing is playing and nothing will
  const listeners = []; // settings' NOW PLAYING line; see onChange below

  // Words a title keeps lowercase unless they open it. Only 'and' occurs in the
  // shipped playlist, but a title-caser that writes "The Ash And Iron" is the
  // kind of thing nobody notices until it is on screen.
  const MINOR = new Set(['a', 'an', 'and', 'the', 'of', 'or', 'in', 'on', 'at',
    'to', 'for', 'from', 'with', 'vs']);

  // Display name DERIVED from the filename, so dropping a track into
  // assets/music/ and listing it above is still the whole job — a parallel
  // table of titles is one more thing to forget to update.
  function titleOf(file) {
    return file.replace(/\.[^.]*$/, '').split(/[-_\s]+/).filter(Boolean)
      .map((w, i) => (i > 0 && MINOR.has(w.toLowerCase()))
        ? w.toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // Fired whenever the answer to "what is playing" changes. Listeners must not
  // throw into the playback path: a broken UI is not worth silencing the music.
  function emit() {
    for (const fn of listeners) { try { fn(); } catch (e) { /* keep playing */ } }
  }

  function applyVolume() {
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, volume / 100));
    audio.muted = muted;
  }

  function playTrack(i) {
    index = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
    audio.src = BASE + TRACKS[index];
    audio.play().catch(() => { /* autoplay blocked or unsupported — stay silent */ });
    emit();
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
      if (failures >= TRACKS.length) { dead = true; emit(); return; } // all failed — give up quietly
      playTrack(index + 1);
    });
    playTrack(0);
  }

  // Pause while the tab is hidden or the window is minimized; resume on return.
  document.addEventListener('visibilitychange', () => {
    if (!started || !audio) return;
    if (document.hidden) audio.pause();
    else audio.play().catch(() => { /* resume blocked — stay silent */ });
  });

  return {
    start,
    // Settings' NEXT button. The gesture listeners at the bottom of this file
    // run on capture, so the press that opened Settings has already called
    // start() and there is an `audio` by the time this can be reached — the
    // guard is for the empty-TRACKS build, where start() returns without ever
    // making one. `failures` resets because a deliberate skip is a fresh
    // attempt, not another entry in the run of load errors that gives up.
    next() {
      if (!started) start();
      if (!audio) return index;
      failures = 0;
      dead = false;
      playTrack(index + 1);
      return index;
    },
    // The current track's display title, or null when there is nothing to name —
    // no gesture yet (start() hasn't run), an empty playlist, or a whole cycle of
    // load failures. The caller owns the copy for that case; this reports state.
    get track() {
      if (!started || !audio || dead || TRACKS.length === 0) return null;
      return titleOf(TRACKS[index]);
    },
    // Subscribe to track changes. Playback advances on its own (the `ended`
    // handler) while Settings sits open, so a panel that only read `track` when
    // it opened would go stale about four minutes in.
    onChange(fn) { if (typeof fn === 'function') listeners.push(fn); },
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
