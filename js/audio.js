/* Sample-based WW2 sound effects with WebAudio synthesis fallback. */
'use strict';

const SFX = (() => {
  const BASE = 'assets/sounds/';
  const CLIPS = {
    rifle:        ['rifle_1.ogg', 'rifle_2.ogg', 'rifle_3.ogg'],
    mg:           ['mg_1.ogg', 'mg_2.ogg', 'mg_3.ogg'],
    hmg:          ['hmg_1.ogg', 'hmg_2.ogg', 'hmg_3.ogg'],
    pistol:       ['pistol_1.ogg', 'pistol_2.ogg', 'pistol_3.ogg'],
    shotgun:      ['shotgun_1.ogg', 'shotgun_2.ogg', 'shotgun_3.ogg'],
    boomSmall:    ['boom_small_1.ogg', 'boom_small_2.ogg', 'boom_small_3.ogg'],
    boomBig:      ['boom_big_1.ogg', 'boom_big_2.ogg'],
    grenadeToss:  ['grenade_toss_1.ogg', 'grenade_toss_2.ogg', 'grenade_toss_3.ogg'],
    rocket:       ['rocket_1.ogg', 'rocket_2.ogg', 'rocket_3.ogg'],
    plane:        ['plane_1.ogg', 'plane_2.ogg'],
    planeFlyby:   ['plane_flyby_1.ogg', 'plane_flyby_2.ogg'],
    brake:        ['brake_1.ogg'],
    flame:        ['flame_1.ogg', 'flame_2.ogg'],
    thunk:        ['thunk_1.ogg'],
    click:        ['click_1.ogg', 'click_2.ogg'],
    error:        ['error_1.ogg'],
    hammer:       ['hammer_1.ogg'],
  };
  let master = null;
  let noiseBuf = null;
  let muted = false;
  let volume = 100;
  let ready = false;
  let loading = null;
  const buffers = new Map();
  const BASE_GAIN = 0.55;

  function applyMasterGain() {
    if (!master) return;
    master.gain.value = muted ? 0 : BASE_GAIN * (volume / 100);
  }

  function setVolume(pct) {
    volume = Math.max(0, Math.min(100, Math.round(pct)));
    applyMasterGain();
    return volume;
  }

  let audioCtx = null;

  function init() {
    if (audioCtx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
    master = audioCtx.createGain();
    applyMasterGain();
    master.connect(audioCtx.destination);

    const len = audioCtx.sampleRate * 1.5;
    noiseBuf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  async function loadSamples() {
    if (ready || loading) return loading;
    init();
    if (!audioCtx) return Promise.resolve(false);

    const files = new Set();
    for (const list of Object.values(CLIPS)) {
      for (const file of list) files.add(file);
    }

    loading = Promise.all([...files].map(async (file) => {
      try {
        const res = await fetch(BASE + file);
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.arrayBuffer();
        buffers.set(file, await audioCtx.decodeAudioData(data));
      } catch (_) {
        /* missing clip falls back to synthesis where available */
      }
    })).then(() => {
      ready = true;
      return buffers.size > 0;
    });

    return loading;
  }

  function resume() {
    init();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    loadSamples();
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function playClip(group, opts = {}) {
    if (!audioCtx || muted) return false;
    const list = CLIPS[group];
    if (!list) return false;
    const file = pick(list);
    const buf = buffers.get(file);
    if (!buf) return false;

    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const rate = (opts.rate || 1) * (opts.jitter ? 0.94 + Math.random() * 0.12 : 1);
    src.playbackRate.value = rate;

    const g = audioCtx.createGain();
    g.gain.value = opts.vol ?? 1;
    src.connect(g).connect(master);
    src.start();
    return true;
  }

  /* --- synthesis fallback for any unloaded clip --- */

  function noise(dur, vol, filterType, freq, q, decay) {
    if (!audioCtx || muted) return;
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = audioCtx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    f.Q.value = q || 1;
    const g = audioCtx.createGain();
    const t = audioCtx.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (decay || dur));
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random(), dur);
  }

  function tone(freq, dur, vol, type, slideTo) {
    if (!audioCtx || muted) return;
    const o = audioCtx.createOscillator();
    o.type = type || 'sine';
    const t = audioCtx.currentTime;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur);
  }

  function synthGun(kind) {
    const map = {
      rifle:  () => noise(0.09, 0.5, 'bandpass', 1800 + Math.random() * 600, 2, 0.11),
      mg:     () => noise(0.06, 0.4, 'bandpass', 1400 + Math.random() * 500, 2, 0.07),
      hmg:    () => { noise(0.09, 0.55, 'bandpass', 800 + Math.random() * 300, 2, 0.11); tone(120, 0.07, 0.12, 'triangle', 70); },
      sniper: () => { noise(0.14, 0.65, 'bandpass', 1100, 1.5, 0.22); tone(220, 0.18, 0.1, 'triangle', 60); },
      pistol: () => noise(0.06, 0.3, 'bandpass', 2400, 3, 0.07),
      shotgun: () => { noise(0.12, 0.55, 'lowpass', 500 + Math.random() * 200, 0.8, 0.18); tone(90, 0.15, 0.2, 'sine', 45); },
    };
    (map[kind] || map.rifle)();
  }

  function playOrSynth(group, synthFn, opts = {}) {
    if (!playClip(group, opts)) synthFn();
  }

  return {
    resume,
    setMuted(on) { muted = !!on; applyMasterGain(); return muted; },
    toggleMute() { muted = !muted; applyMasterGain(); return muted; },
    get muted() { return muted; },
    setVolume,
    get volume() { return volume; },

    click()   { playOrSynth('click', () => tone(900, 0.05, 0.12, 'square')); },
    error()   { playOrSynth('error', () => tone(160, 0.14, 0.15, 'square')); },

    rifle()   { playOrSynth('rifle', () => synthGun('rifle'), { jitter: true, vol: 0.85 }); },
    mg()      { playOrSynth('mg', () => synthGun('mg'), { jitter: true, vol: 0.8 }); },
    hmg()     { playOrSynth('hmg', () => synthGun('hmg'), { jitter: true, vol: 0.85 }); },
    sniper()  {
      if (!playClip('rifle', { jitter: true, vol: 0.9, rate: 0.82 })) synthGun('sniper');
    },
    pistol()  { playOrSynth('pistol', () => synthGun('pistol'), { jitter: true, vol: 0.75 }); },
    shotgun() { playOrSynth('shotgun', () => synthGun('shotgun'), { jitter: true, vol: 0.85 }); },

    boom(big) {
      const group = big ? 'boomBig' : 'boomSmall';
      playOrSynth(group, () => {
        const v = big ? 0.9 : 0.65;
        noise(0.6, v, 'lowpass', big ? 260 : 380, 0.7, big ? 0.8 : 0.5);
        tone(big ? 55 : 75, big ? 0.7 : 0.45, v * 0.6, 'sine', 30);
      }, { vol: big ? 1 : 0.85, jitter: true });
    },
    grenadeToss() { playOrSynth('grenadeToss', () => tone(500, 0.1, 0.06, 'triangle', 700), { vol: 0.7, jitter: true }); },
    rocket() {
      playOrSynth('rocket', () => { noise(0.35, 0.4, 'bandpass', 900, 1, 0.4); tone(300, 0.35, 0.1, 'sawtooth', 90); }, { vol: 0.8, jitter: true });
    },
    flame() {
      playOrSynth('flame', () => {
        noise(0.45, 0.3, 'lowpass', 700, 0.8, 0.5);
        noise(0.3, 0.12, 'bandpass', 2600, 1.5, 0.35);
      }, { vol: 0.58, jitter: true });
    },
    thunk() {
      playOrSynth('thunk', () => { tone(180, 0.13, 0.28, 'sine', 85); noise(0.08, 0.2, 'lowpass', 600, 1, 0.1); }, { vol: 0.9 });
    },

    plane() {
      playOrSynth('plane', () => {
        tone(110 + Math.random() * 20, 0.12, 0.1, 'sawtooth', 95);
        tone(220 + Math.random() * 40, 0.1, 0.04, 'square', 190);
      }, { vol: 0.42, jitter: true });
    },
    planeFlyby() {
      playOrSynth('planeFlyby', () => {
        tone(90 + Math.random() * 15, 1.8, 0.14, 'sawtooth', 55);
        noise(1.2, 0.1, 'bandpass', 400 + Math.random() * 200, 1, 1.1);
      }, { vol: 0.72, jitter: true });
    },
    brake() {
      playOrSynth('brake', () => { tone(900, 0.25, 0.07, 'sawtooth', 250); noise(0.2, 0.12, 'bandpass', 1800, 2, 0.22); }, { vol: 0.55 });
    },
    hammer() { playOrSynth('hammer', () => { tone(1100 + Math.random() * 300, 0.04, 0.08, 'square'); noise(0.03, 0.1, 'highpass', 3000, 1, 0.04); }, { vol: 0.7 }); },
  };
})();
