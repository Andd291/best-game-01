'use strict';
/* LENTERA — audio: every sound is synthesized with WebAudio, no files.
   The context is created on the first user gesture (browsers block
   sound before one), every call is guarded so a missing audio device
   can never break the game, and M toggles mute at any time. */

LENT.audio = {
  /** The AudioContext, or null until the first gesture creates it. */
  ctx: null,
  /** Master gain node, or null until the context exists. */
  master: null,
  /** Whether sound is silenced (M toggles it; remembered in storage). */
  muted: false,
};

try {
  LENT.audio.muted = window.localStorage.getItem('lentera.muted') === '1';
} catch (err) {
  LENT.audio.muted = false;
}

/** Create the context (on first gesture) and resume it if suspended. */
LENT.audio.unlock = function () {
  try {
    if (!LENT.audio.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      LENT.audio.ctx = new AC();
      LENT.audio.master = LENT.audio.ctx.createGain();
      LENT.audio.master.gain.value = 0.32;
      LENT.audio.master.connect(LENT.audio.ctx.destination);
    }
    if (LENT.audio.ctx.state === 'suspended') void LENT.audio.ctx.resume();
  } catch (err) {
    LENT.audio.ctx = null;
  }
};

/** Flip mute and remember the choice. */
LENT.audio.toggleMute = function () {
  LENT.audio.muted = !LENT.audio.muted;
  try {
    window.localStorage.setItem('lentera.muted', LENT.audio.muted ? '1' : '0');
  } catch (err) {
    /* storage is a nicety; the game plays on without it */
  }
  return LENT.audio.muted;
};

/** One oscillator note: frequency slides from `from` to `to` over `dur`. */
LENT.audio.tone = function (from, to, dur, type, volume, when) {
  if (!LENT.audio.ctx || LENT.audio.muted) return;
  try {
    const t0 = LENT.audio.ctx.currentTime + (when || 0);
    const osc = LENT.audio.ctx.createOscillator();
    const g = LENT.audio.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, from), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    g.gain.setValueAtTime(volume, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(LENT.audio.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch (err) {
    /* a failed note is never worth breaking the frame */
  }
};

/** A burst of filtered noise, for explosions. */
LENT.audio.noise = function (dur, volume, cutoff) {
  if (!LENT.audio.ctx || LENT.audio.muted) return;
  try {
    const t0 = LENT.audio.ctx.currentTime;
    const len = Math.max(1, Math.floor(LENT.audio.ctx.sampleRate * dur));
    const buffer = LENT.audio.ctx.createBuffer(1, len, LENT.audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = LENT.audio.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = LENT.audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t0);
    filter.frequency.exponentialRampToValueAtTime(120, t0 + dur);
    const g = LENT.audio.ctx.createGain();
    g.gain.setValueAtTime(volume, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(LENT.audio.master);
    src.start(t0);
  } catch (err) {
    /* silence is better than a crash */
  }
};

/** The player's light orb leaving the lantern. */
LENT.audio.shoot = function () {
  LENT.audio.tone(920, 480, 0.07, 'square', 0.05);
};

/** A wisp popping. `big` is the boss dying. */
LENT.audio.explosion = function (big) {
  if (big) {
    LENT.audio.noise(0.7, 0.5, 2400);
    LENT.audio.tone(220, 40, 0.6, 'sawtooth', 0.22);
    LENT.audio.tone(440, 90, 0.5, 'triangle', 0.14, 0.05);
  } else {
    LENT.audio.noise(0.22, 0.22, 3200);
    LENT.audio.tone(320, 90, 0.18, 'triangle', 0.12);
  }
};

/** A shadow bolt hitting the lantern. */
LENT.audio.hit = function () {
  LENT.audio.noise(0.3, 0.3, 1800);
  LENT.audio.tone(180, 55, 0.3, 'sawtooth', 0.18);
};

/** A power-up collected. */
LENT.audio.powerup = function () {
  LENT.audio.tone(660, 660, 0.09, 'sine', 0.14);
  LENT.audio.tone(880, 880, 0.09, 'sine', 0.14, 0.08);
  LENT.audio.tone(1320, 1320, 0.14, 'sine', 0.12, 0.16);
};

/** A wave cleared: a small rising arpeggio. */
LENT.audio.waveClear = function () {
  const notes = [523, 659, 784, 1047];
  for (let i = 0; i < notes.length; i++) {
    LENT.audio.tone(notes[i], notes[i], 0.12, 'triangle', 0.12, i * 0.09);
  }
};

/** The boss appearing: a low warning. */
LENT.audio.bossWarn = function () {
  LENT.audio.tone(110, 110, 0.35, 'sawtooth', 0.16);
  LENT.audio.tone(165, 165, 0.35, 'sawtooth', 0.12, 0.18);
};

/** The night going dark: game over. */
LENT.audio.gameOver = function () {
  const notes = [392, 330, 262, 196];
  for (let i = 0; i < notes.length; i++) {
    LENT.audio.tone(notes[i], notes[i] * 0.94, 0.28, 'triangle', 0.15, i * 0.22);
  }
};
