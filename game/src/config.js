'use strict';
/* LENTERA — configuration: every tunable number of the game lives here.
   The other modules read these values; nothing else hard-codes a balance
   number. All lengths are in canvas pixels (the playfield is 1280 x 720). */

/** The single shared namespace. Every module attaches to LENT. */
const LENT = {};

/** Playfield size in canvas pixels. */
LENT.WIDTH = 1280;
LENT.HEIGHT = 720;

/** The player: a lantern spirit, a glowing orb with a small flame. */
LENT.PLAYER = {
  radius: 16, // collision radius of the orb
  speed: 460, // pixels per second on keyboard movement
  fireInterval: 0.16, // seconds between light orbs at base fire rate
  lives: 3, // lanterns the player starts with
  invulnerableTime: 2.0, // seconds of mercy after being hit
  follow: 14, // how fast the orb eases toward the mouse (per second)
};

/** A light orb fired by the player. */
LENT.BULLET = {
  speed: 760,
  radius: 6,
};

/** A shadow bolt fired by a boss. */
LENT.BOLT = {
  speed: 260,
  radius: 8,
};

/** Enemy types. hp is hits to destroy; score is the base points. */
LENT.ENEMY_TYPES = {
  // Slow, swaying wisp. The first thing the night sends.
  drifter: { hp: 1, speed: 62, radius: 16, score: 100, sway: 46, swayRate: 1.6 },
  // Fast wisp that leans toward the lantern's x as it falls.
  darter: { hp: 1, speed: 185, radius: 13, score: 150, sway: 12, swayRate: 2.4, home: 60 },
  // Weaving moth with a wide sine path and two hits to kill.
  moth: { hp: 2, speed: 118, radius: 18, score: 200, sway: 110, swayRate: 2.0 },
  // Armored beetle: slow, big, three hits, worth the most of the small fry.
  beetle: { hp: 3, speed: 48, radius: 25, score: 300, sway: 18, swayRate: 0.9 },
};

/** The wave boss: a great shadow wisp, every third wave. */
LENT.BOSS = {
  radius: 62,
  score: 2000,
  hpBase: 34, // plus hpPerWave for each wave beyond the first boss
  hpPerWave: 8,
  speed: 90, // horizontal drift speed at the top of the sky
  boltInterval: 1.6, // seconds between shadow bolts
  minionInterval: 5.0, // seconds between minion spawns
};

/** How waves are built. count = baseCount + perWave * wave. */
LENT.WAVES = {
  baseCount: 8,
  perWave: 3,
  spawnInterval: 1.05, // seconds between spawns at wave 1
  spawnFloor: 0.32, // fastest the spawn interval ever gets
  spawnStep: 0.055, // seconds shaved off the interval per wave
  speedGrowth: 0.045, // enemy speed multiplier added per wave
  betweenWaves: 3.0, // seconds of banner time after a wave is cleared
  clearBonus: 150, // points per wave number on clearing a wave
};

/** Power-ups: kind, drop weight and effect length in seconds. */
LENT.POWERUPS = {
  dropChance: 0.13, // chance a destroyed enemy leaves a power-up
  fallSpeed: 90,
  radius: 15,
  spreadTime: 12, // three-way shot
  rapidTime: 10, // double fire rate
  kinds: ['spread', 'rapid', 'shield', 'bomb'],
};

/** The combo: kills chained inside the window raise the multiplier. */
LENT.COMBO = {
  window: 3.0, // seconds a kill stays "chained" to the last one
  max: 5, // highest multiplier
};

/** Particles, floating text and screen shake. */
LENT.FX = {
  explosionSparks: 26,
  hitSparks: 10,
  shakeHit: 9, // pixels of shake when the lantern is hit
  shakeBoss: 14, // pixels when the boss dies
  shakeDecay: 26, // shake lost per second
};

/** The ink palette: black sumi ink on rice paper, one vermilion seal red.
   Every colour the game uses comes from here; world.js and render.js
   only name these keys, so the whole look pivots in this one block. */
LENT.COLORS = {
  paperTop: '#f5f0e2',
  paperBottom: '#e6dcc4',
  paperEdge: '#efe8d3',
  ink: '#1c1a17',
  inkSoft: '#453f36',
  inkWash: '#8a8172',
  gray: '#a39a86',
  seal: '#c13b2a',
  sealDark: '#93291d',
  sealWash: 'rgba(193, 59, 42, 0.16)',
};

/** Best score storage key. */
LENT.BEST_KEY = 'lentera.best';

/** Small math helpers, shared by every module. */
LENT.util = {
  clamp: (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v),
  rand: (lo, hi) => lo + Math.random() * (hi - lo),
  randInt: (lo, hi) => Math.floor(LENT.util.rand(lo, hi + 1)),
  choice: (arr) => arr[Math.floor(Math.random() * arr.length)],
  /** Squared distance between two points (avoids a square root). */
  dist2: (ax, ay, bx, by) => {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  },
};
