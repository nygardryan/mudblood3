/* Synthesized WW2 sound effects via WebAudio — no external assets needed. */
'use strict';

const SFX = (() => {
  let ctx = null;
  let master = null;
  let noiseBuf = null;
  let muted = false;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);

    const len = ctx.sampleRate * 1.5;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  function resume() {
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function noise(dur, vol, filterType, freq, q, decay) {
    if (!ctx || muted) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    f.Q.value = q || 1;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (decay || dur));
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random(), dur);
  }

  function tone(freq, dur, vol, type, slideTo) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    o.type = type || 'sine';
    const t = ctx.currentTime;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur);
  }

  return {
    resume,
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },

    click()   { tone(900, 0.05, 0.12, 'square'); },
    error()   { tone(160, 0.14, 0.15, 'square'); },

    rifle()   { noise(0.09, 0.5, 'bandpass', 1800 + Math.random() * 600, 2, 0.11); },
    mg()      { noise(0.06, 0.4, 'bandpass', 1400 + Math.random() * 500, 2, 0.07); },
    hmg()     {
      noise(0.09, 0.55, 'bandpass', 800 + Math.random() * 300, 2, 0.11);
      tone(120, 0.07, 0.12, 'triangle', 70);
    },
    sniper()  {
      noise(0.14, 0.65, 'bandpass', 1100, 1.5, 0.22);
      tone(220, 0.18, 0.1, 'triangle', 60);
    },
    pistol()  { noise(0.06, 0.3, 'bandpass', 2400, 3, 0.07); },

    boom(big) {
      const v = big ? 0.9 : 0.65;
      noise(0.6, v, 'lowpass', big ? 260 : 380, 0.7, big ? 0.8 : 0.5);
      tone(big ? 55 : 75, big ? 0.7 : 0.45, v * 0.6, 'sine', 30);
    },
    whistle() { tone(1600, 1.0, 0.09, 'sine', 350); },
    grenadeToss() { tone(500, 0.1, 0.06, 'triangle', 700); },
    rocket() {
      noise(0.35, 0.4, 'bandpass', 900, 1, 0.4);
      tone(300, 0.35, 0.1, 'sawtooth', 90);
    },
    flame() {
      noise(0.45, 0.3, 'lowpass', 700, 0.8, 0.5);
      noise(0.3, 0.12, 'bandpass', 2600, 1.5, 0.35);
    },
    thunk() {
      tone(180, 0.13, 0.28, 'sine', 85);
      noise(0.08, 0.2, 'lowpass', 600, 1, 0.1);
    },

    motor() {
      tone(80 + Math.random() * 25, 0.14, 0.06, 'sawtooth', 55);
    },
    plane() {
      // big radial engine: low sawtooth growl with a rough overtone
      tone(110 + Math.random() * 20, 0.12, 0.1, 'sawtooth', 95);
      tone(220 + Math.random() * 40, 0.1, 0.04, 'square', 190);
    },
    brake() {
      tone(900, 0.25, 0.07, 'sawtooth', 250);
      noise(0.2, 0.12, 'bandpass', 1800, 2, 0.22);
    },
    alarm() {
      tone(660, 0.16, 0.2, 'square');
      setTimeout(() => tone(520, 0.2, 0.2, 'square'), 170);
    },
    scream() { tone(700 + Math.random() * 300, 0.28, 0.07, 'sawtooth', 200); },
    heal()   { tone(880, 0.09, 0.06, 'sine', 1320); },
    hammer() {
      tone(1100 + Math.random() * 300, 0.04, 0.08, 'square');
      noise(0.03, 0.1, 'highpass', 3000, 1, 0.04);
    },
    cash()   { tone(1200, 0.06, 0.08, 'square'); },
    event()  {
      tone(440, 0.12, 0.15, 'square');
      setTimeout(() => tone(660, 0.18, 0.15, 'square'), 130);
    },
    promote() {
      tone(523, 0.1, 0.13, 'square');
      setTimeout(() => tone(659, 0.1, 0.13, 'square'), 110);
      setTimeout(() => tone(784, 0.18, 0.13, 'square'), 220);
    },
  };
})();
