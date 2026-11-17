'use strict';
/* LENTERA — world: the whole game state and its rules.
   Enemies, bullets, power-ups, particles, waves, the boss, the
   combo and the score all live here. Rendering lives in render.js;
   the loop lives in main.js. Nothing here touches the DOM or the
   canvas, only numbers and arrays, so the rules can be read alone. */

/** The live game state. */
LENT.world = {
  /** 'title' | 'playing' | 'paused' | 'gameover' */
  state: 'title',
  /** Seconds since the page loaded (drives background motion). */
  time: 0,
  /** Current wave number (1-based). */
  wave: 1,
  /** Points scored this game. */
  score: 0,
  /** Best score ever, from storage. */
  best: 0,
  /** Current combo multiplier (0 means no chain running). */
  combo: 0,
  /** Seconds left on the combo chain. */
  comboTimer: 0,
  /** Lanterns left. */
  lives: LENT.PLAYER.lives,
  /** The lantern spirit. */
  player: null,
  /** Light orbs flying upward. */
  bullets: [],
  /** Shadow bolts falling from the boss. */
  bolts: [],
  /** Shadow wisps on the field. */
  enemies: [],
  /** Falling power-ups. */
  powerups: [],
  /** Explosion sparks and embers. */
  particles: [],
  /** Floating "+100" score texts. */
  texts: [],
  /** Enemies still to spawn in this wave. */
  spawnLeft: 0,
  /** Enemies this wave holds in total (for the HUD progress bar). */
  waveTotal: 0,
  /** Seconds until the next spawn. */
  spawnTimer: 0,
  /** Seconds of banner time left between waves. */
  betweenTimer: 0,
  /** Banner text shown between waves ('' when none). */
  banner: '',
  /** The wave boss, or null when no boss is alive. */
  boss: null,
  /** Screen shake magnitude in pixels. */
  shake: 0,
  /** Whether the game over screen is showing a new best. */
  newBest: false,
};

try {
  LENT.world.best = Number(window.localStorage.getItem(LENT.BEST_KEY)) || 0;
} catch (err) {
  LENT.world.best = 0;
}

/** A fresh player, parked at the bottom centre of the sky. */
LENT.world.freshPlayer = function () {
  return {
    x: LENT.WIDTH / 2,
    y: LENT.HEIGHT - 110,
    fireTimer: 0,
    invulnerable: 0,
    shield: false,
    spreadTimer: 0,
    rapidTimer: 0,
  };
};

/** Reset everything for a new game and open wave 1. */
LENT.world.startGame = function () {
  const w = LENT.world;
  w.state = 'playing';
  w.wave = 1;
  w.score = 0;
  w.combo = 0;
  w.comboTimer = 0;
  w.lives = LENT.PLAYER.lives;
  w.player = LENT.world.freshPlayer();
  w.bullets = [];
  w.bolts = [];
  w.enemies = [];
  w.powerups = [];
  w.particles = [];
  w.texts = [];
  w.boss = null;
  w.shake = 0;
  w.newBest = false;
  w.banner = '';
  w.betweenTimer = 0;
  LENT.world.startWave(1);
};

/** Back to the title screen (after game over, or from a restart). */
LENT.world.toTitle = function () {
  LENT.world.state = 'title';
  LENT.world.boss = null;
  LENT.world.enemies = [];
  LENT.world.bullets = [];
  LENT.world.bolts = [];
  LENT.world.powerups = [];
  LENT.world.banner = '';
};

/** Pause or resume while playing. */
LENT.world.togglePause = function () {
  if (LENT.world.state === 'playing') LENT.world.state = 'paused';
  else if (LENT.world.state === 'paused') LENT.world.state = 'playing';
};

/** The enemy types a wave may send, by wave number. */
LENT.world.waveTypes = function (wave) {
  const types = ['drifter'];
  if (wave >= 2) types.push('darter');
  if (wave >= 3) types.push('moth');
  if (wave >= 4) types.push('beetle');
  return types;
};

/** Pick one enemy type for a wave, weighted toward the easy ones. */
LENT.world.pickType = function (wave) {
  const weights = { drifter: 0.46, darter: 0.24, moth: 0.18, beetle: 0.12 };
  const types = LENT.world.waveTypes(wave);
  let total = 0;
  for (const t of types) total += weights[t];
  let roll = Math.random() * total;
  for (const t of types) {
    roll -= weights[t];
    if (roll <= 0) return t;
  }
  return 'drifter';
};

/** Open a wave: fill its spawn queue, or wake the boss. */
LENT.world.startWave = function (wave) {
  const w = LENT.world;
  w.wave = wave;
  w.spawnTimer = 0.6;
  w.banner = '';
  if (wave % 3 === 0) {
    // A boss wave: the great wisp plus a small escort.
    w.waveTotal = Math.floor((LENT.WAVES.baseCount + LENT.WAVES.perWave * wave) / 3);
    w.spawnLeft = w.waveTotal;
    LENT.world.spawnBoss();
    LENT.audio.bossWarn();
    w.banner = 'A GREAT SHADOW STIRS…';
  } else {
    w.waveTotal = LENT.WAVES.baseCount + LENT.WAVES.perWave * wave;
    w.spawnLeft = w.waveTotal;
  }
};

/** Seconds between spawns at this wave. */
LENT.world.spawnInterval = function () {
  const w = LENT.world.wave;
  return Math.max(
    LENT.WAVES.spawnFloor,
    LENT.WAVES.spawnInterval - LENT.WAVES.spawnStep * (w - 1),
  );
};

/** Enemy speed multiplier at this wave. */
LENT.world.speedMultiplier = function () {
  return 1 + LENT.WAVES.speedGrowth * (LENT.world.wave - 1);
};

/** A jagged blot outline: radius factors around a circle, one per
    vertex, so each wisp keeps its own ink-blot silhouette. */
LENT.world.blobShape = function (n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(LENT.util.rand(0.7, 1.3));
  return out;
};

/** Spawn one wisp of the given type at a random x above the sky. */
LENT.world.spawnEnemy = function (type, x, y) {
  const def = LENT.ENEMY_TYPES[type];
  const w = LENT.world;
  w.enemies.push({
    type,
    isBoss: false,
    x: x !== undefined ? x : LENT.util.rand(40, LENT.WIDTH - 40),
    y: y !== undefined ? y : -30,
    baseX: 0,
    t: LENT.util.rand(0, 6),
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed * LENT.world.speedMultiplier(),
    radius: def.radius,
    score: def.score,
    sway: def.sway,
    swayRate: def.swayRate,
    home: def.home || 0,
    flash: 0,
    seed: Math.random() * 100,
    blob: LENT.world.blobShape(9),
    dead: false,
  });
  const e = w.enemies[w.enemies.length - 1];
  e.baseX = e.x;
  return e;
};

/** Spawn the wave boss at the top centre of the sky. */
LENT.world.spawnBoss = function () {
  const hp = LENT.BOSS.hpBase + LENT.BOSS.hpPerWave * (LENT.world.wave / 3 - 1);
  const boss = {
    type: 'boss',
    isBoss: true,
    x: LENT.WIDTH / 2,
    y: 120,
    baseX: LENT.WIDTH / 2,
    t: 0,
    hp,
    maxHp: hp,
    speed: LENT.BOSS.speed,
    radius: LENT.BOSS.radius,
    score: LENT.BOSS.score,
    sway: 0,
    swayRate: 0,
    home: 0,
    flash: 0,
    seed: Math.random() * 100,
    blob: LENT.world.blobShape(11),
    dead: false,
    boltTimer: 1.2,
    minionTimer: LENT.BOSS.minionInterval,
  };
  LENT.world.enemies.push(boss);
  LENT.world.boss = boss;
};

/** Add points, multiplied by the current combo. */
LENT.world.addScore = function (base, x, y) {
  const w = LENT.world;
  const mult = Math.max(1, w.combo);
  const gained = base * mult;
  w.score += gained;
  if (x !== undefined) {
    w.texts.push({
      x,
      y,
      str: `+${gained}`,
      color: mult > 1 ? LENT.COLORS.seal : LENT.COLORS.ink,
      life: 0.9,
      maxLife: 0.9,
    });
  }
};

/** Chain a kill into the combo and refresh its window. */
LENT.world.chainKill = function () {
  const w = LENT.world;
  w.combo = Math.min(LENT.COMBO.max, w.combo + 1);
  w.comboTimer = LENT.COMBO.window;
};

/** Burst of sparks at a point. */
LENT.world.burst = function (x, y, color, count, speed) {
  const w = LENT.world;
  for (let i = 0; i < count; i++) {
    const a = LENT.util.rand(0, Math.PI * 2);
    const s = LENT.util.rand(speed * 0.3, speed);
    w.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 40,
      life: LENT.util.rand(0.35, 0.8),
      maxLife: 0.8,
      size: LENT.util.rand(2, 5),
      color,
    });
  }
  if (w.particles.length > 420) w.particles.splice(0, w.particles.length - 420);
};

/** Destroy an enemy: score, chain, sparks, maybe a power-up. */
LENT.world.killEnemy = function (e, silent) {
  const w = LENT.world;
  if (e.dead) return;
  e.dead = true;
  if (!silent) {
    LENT.world.chainKill();
    LENT.world.addScore(e.score, e.x, e.y);
    const color = e.isBoss ? LENT.COLORS.seal : LENT.COLORS.ink;
    LENT.world.burst(e.x, e.y, color, e.isBoss ? 90 : LENT.FX.explosionSparks, e.isBoss ? 340 : 220);
    LENT.audio.explosion(e.isBoss);
    if (e.isBoss) {
      w.shake = Math.max(w.shake, LENT.FX.shakeBoss);
      // The boss's fall scatters its escort: they burst with it.
      for (const other of w.enemies) {
        if (!other.dead && !other.isBoss) {
          other.dead = true;
          LENT.world.burst(other.x, other.y, LENT.COLORS.ink, 12, 160);
        }
      }
      w.boss = null;
    } else if (Math.random() < LENT.POWERUPS.dropChance) {
      LENT.world.dropPowerup(e.x, e.y);
    }
  }
};

/** Leave a random power-up floating down from a point. */
LENT.world.dropPowerup = function (x, y) {
  LENT.world.powerups.push({
    kind: LENT.util.choice(LENT.POWERUPS.kinds),
    x: LENT.util.clamp(x, 30, LENT.WIDTH - 30),
    y,
    t: 0,
    dead: false,
  });
};

/** The bomb: every wisp on the field bursts at once. */
LENT.world.detonateBomb = function () {
  const w = LENT.world;
  LENT.world.burst(w.player.x, w.player.y, LENT.COLORS.seal, 60, 420);
  w.shake = Math.max(w.shake, 10);
  LENT.audio.explosion(true);
  for (const e of w.enemies) {
    if (e.isBoss) {
      e.hp -= 15;
      e.flash = 0.15;
      if (e.hp <= 0) LENT.world.killEnemy(e);
    } else {
      LENT.world.killEnemy(e);
    }
  }
};

/** Apply a collected power-up. */
LENT.world.applyPowerup = function (kind) {
  const p = LENT.world.player;
  if (kind === 'spread') p.spreadTimer = LENT.POWERUPS.spreadTime;
  else if (kind === 'rapid') p.rapidTimer = LENT.POWERUPS.rapidTime;
  else if (kind === 'shield') p.shield = true;
  else if (kind === 'bomb') LENT.world.detonateBomb();
  LENT.audio.powerup();
  LENT.world.texts.push({
    x: p.x,
    y: p.y - 34,
    str: kind === 'spread' ? 'SPREAD SHOT!' : kind === 'rapid' ? 'RAPID FIRE!' : kind === 'shield' ? 'SHIELD!' : 'LUMEN BOMB!',
    color: LENT.COLORS.seal,
    life: 1.1,
    maxLife: 1.1,
  });
};

/** The lantern is hit (by a wisp, a bolt, or one slipping past). */
LENT.world.damagePlayer = function (reason) {
  const w = LENT.world;
  const p = w.player;
  if (!p || p.invulnerable > 0 || w.state !== 'playing') return;
  if (p.shield) {
    // The shield eats the hit and shatters.
    p.shield = false;
    p.invulnerable = 1.0;
    LENT.world.burst(p.x, p.y, LENT.COLORS.seal, LENT.FX.hitSparks, 200);
    LENT.audio.hit();
    w.texts.push({ x: p.x, y: p.y - 34, str: 'SHIELD DOWN', color: LENT.COLORS.seal, life: 1.0, maxLife: 1.0 });
    return;
  }
  w.lives -= 1;
  w.combo = 0;
  w.comboTimer = 0;
  p.invulnerable = LENT.PLAYER.invulnerableTime;
  p.spreadTimer = 0;
  p.rapidTimer = 0;
  w.shake = Math.max(w.shake, LENT.FX.shakeHit);
  LENT.world.burst(p.x, p.y, LENT.COLORS.seal, LENT.FX.explosionSparks, 260);
  LENT.audio.hit();
  if (reason === 'slip') {
    w.texts.push({ x: p.x, y: p.y - 40, str: 'A WISP SLIPPED PAST!', color: LENT.COLORS.seal, life: 1.2, maxLife: 1.2 });
  }
  if (w.lives <= 0) LENT.world.gameOver();
};

/** End the game: record the best score and show the results. */
LENT.world.gameOver = function () {
  const w = LENT.world;
  w.state = 'gameover';
  w.newBest = w.score > w.best;
  if (w.newBest) {
    w.best = w.score;
    try {
      window.localStorage.setItem(LENT.BEST_KEY, String(w.best));
    } catch (err) {
      /* the score is kept for this session either way */
    }
  }
  LENT.audio.gameOver();
};

/** Fire the player's light orbs (one, or three while spread lasts). */
LENT.world.fireBullets = function () {
  const w = LENT.world;
  const p = w.player;
  const angles = p.spreadTimer > 0 ? [-0.17, 0, 0.17] : [0];
  for (const a of angles) {
    w.bullets.push({
      x: p.x,
      y: p.y - 20,
      vx: Math.sin(a) * LENT.BULLET.speed,
      vy: -Math.cos(a) * LENT.BULLET.speed,
      radius: LENT.BULLET.radius,
      dead: false,
    });
  }
  LENT.audio.shoot();
};

/** One frame of the playing state. */
LENT.world.updatePlaying = function (dt) {
  const w = LENT.world;
  const p = w.player;
  const input = LENT.input;

  // --- the lantern moves: keys drive it, otherwise it eases to the mouse.
  const mx = input.moveX();
  const my = input.moveY();
  if (mx !== 0 || my !== 0) {
    p.x = LENT.util.clamp(p.x + mx * LENT.PLAYER.speed * dt, 24, LENT.WIDTH - 24);
    p.y = LENT.util.clamp(p.y + my * LENT.PLAYER.speed * dt, 70, LENT.HEIGHT - 30);
    input.mouseX = p.x;
    input.mouseY = p.y;
  } else if (input.mouseSeen) {
    const k = Math.min(1, LENT.PLAYER.follow * dt);
    p.x += (LENT.util.clamp(input.mouseX, 24, LENT.WIDTH - 24) - p.x) * k;
    p.y += (LENT.util.clamp(input.mouseY, 70, LENT.HEIGHT - 30) - p.y) * k;
  }
  if (p.invulnerable > 0) p.invulnerable -= dt;
  if (p.spreadTimer > 0) p.spreadTimer -= dt;
  if (p.rapidTimer > 0) p.rapidTimer -= dt;

  // --- firing.
  p.fireTimer -= dt;
  if (input.firing() && p.fireTimer <= 0) {
    LENT.world.fireBullets();
    p.fireTimer = LENT.PLAYER.fireInterval * (p.rapidTimer > 0 ? 0.5 : 1);
  }

  // --- spawning.
  if (w.spawnLeft > 0) {
    w.spawnTimer -= dt;
    if (w.spawnTimer <= 0) {
      LENT.world.spawnEnemy(LENT.world.pickType(w.wave));
      w.spawnLeft -= 1;
      w.spawnTimer = LENT.world.spawnInterval();
    }
  }

  // --- enemies drift down; the boss strafes and shoots.
  for (const e of w.enemies) {
    if (e.dead) continue;
    e.t += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.isBoss) {
      e.x = LENT.WIDTH / 2 + Math.sin(e.t * 0.55) * 380;
      e.y = 120 + Math.sin(e.t * 0.9) * 26;
      e.boltTimer -= dt;
      if (e.boltTimer <= 0) {
        e.boltTimer = LENT.BOSS.boltInterval;
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        w.bolts.push({
          x: e.x,
          y: e.y + e.radius * 0.6,
          vx: (dx / len) * LENT.BOLT.speed,
          vy: (dy / len) * LENT.BOLT.speed,
          radius: LENT.BOLT.radius,
          dead: false,
        });
        LENT.audio.tone(140, 90, 0.16, 'sawtooth', 0.08);
      }
      e.minionTimer -= dt;
      if (e.minionTimer <= 0) {
        e.minionTimer = LENT.BOSS.minionInterval;
        LENT.world.spawnEnemy(LENT.util.choice(['drifter', 'darter']), e.x, e.y + 40);
      }
      continue;
    }
    e.y += e.speed * dt;
    e.x = e.baseX + Math.sin(e.t * e.swayRate) * e.sway;
    if (e.home > 0) e.baseX += LENT.util.clamp(p.x - e.baseX, -e.home * dt, e.home * dt);
    e.x = LENT.util.clamp(e.x, e.radius, LENT.WIDTH - e.radius);
    if (e.y - e.radius > LENT.HEIGHT) {
      // A wisp reached the bottom of the sky: it slips past the light.
      e.dead = true;
      LENT.world.damagePlayer('slip');
    }
  }

  // --- bullets fly up and pop wisps.
  for (const b of w.bullets) {
    if (b.dead) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y < -20 || b.x < -20 || b.x > LENT.WIDTH + 20) {
      b.dead = true;
      continue;
    }
    for (const e of w.enemies) {
      if (e.dead) continue;
      if (LENT.util.dist2(b.x, b.y, e.x, e.y) < (b.radius + e.radius) * (b.radius + e.radius)) {
        b.dead = true;
        e.hp -= 1;
        e.flash = 0.09;
        LENT.world.burst(b.x, b.y, LENT.COLORS.inkSoft, 5, 120);
        if (e.hp <= 0) LENT.world.killEnemy(e);
        break;
      }
    }
  }

  // --- shadow bolts fall toward the lantern.
  for (const b of w.bolts) {
    if (b.dead) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y > LENT.HEIGHT + 20 || b.x < -20 || b.x > LENT.WIDTH + 20) {
      b.dead = true;
      continue;
    }
    if (LENT.util.dist2(b.x, b.y, p.x, p.y) < (b.radius + LENT.PLAYER.radius) * (b.radius + LENT.PLAYER.radius)) {
      b.dead = true;
      LENT.world.damagePlayer('bolt');
      if (w.state !== 'playing') return;
    }
  }

  // --- a wisp touching the lantern burns them both.
  for (const e of w.enemies) {
    if (e.dead || e.isBoss) continue;
    if (LENT.util.dist2(e.x, e.y, p.x, p.y) < (e.radius + LENT.PLAYER.radius - 4) * (e.radius + LENT.PLAYER.radius - 4)) {
      LENT.world.killEnemy(e, true);
      LENT.world.burst(e.x, e.y, LENT.COLORS.ink, LENT.FX.explosionSparks, 200);
      LENT.world.damagePlayer('touch');
      if (w.state !== 'playing') return;
    }
  }

  // --- power-ups drift down and are collected on touch.
  for (const u of w.powerups) {
    if (u.dead) continue;
    u.t += dt;
    u.y += LENT.POWERUPS.fallSpeed * dt;
    u.x += Math.sin(u.t * 2.2) * 18 * dt;
    if (u.y > LENT.HEIGHT + 24) {
      u.dead = true;
      continue;
    }
    if (LENT.util.dist2(u.x, u.y, p.x, p.y) < (u.radius + LENT.PLAYER.radius + 6) * (u.radius + LENT.PLAYER.radius + 6)) {
      u.dead = true;
      LENT.world.applyPowerup(u.kind);
    }
  }

  // --- the combo chain ticks down.
  if (w.comboTimer > 0) {
    w.comboTimer -= dt;
    if (w.comboTimer <= 0) w.combo = 0;
  }

  // --- wave cleared? (all spawned, all gone, no boss alive)
  if (w.spawnLeft === 0 && w.enemies.every((e) => e.dead) && w.boss === null && w.betweenTimer <= 0) {
    const bonus = LENT.WAVES.clearBonus * w.wave;
    w.score += bonus;
    w.banner = `WAVE ${w.wave} CLEARED  +${bonus}`;
    w.betweenTimer = LENT.WAVES.betweenWaves;
    LENT.audio.waveClear();
  }
  if (w.betweenTimer > 0) {
    w.betweenTimer -= dt;
    if (w.betweenTimer <= 0) LENT.world.startWave(w.wave + 1);
  }

  // --- sweep the dead and age the sparks and texts.
  w.enemies = w.enemies.filter((e) => !e.dead);
  w.bullets = w.bullets.filter((b) => !b.dead);
  w.bolts = w.bolts.filter((b) => !b.dead);
  w.powerups = w.powerups.filter((u) => !u.dead);
  LENT.world.ageFx(dt);
};

/** Age particles and floating texts (runs in every live state). */
LENT.world.ageFx = function (dt) {
  const w = LENT.world;
  for (const pt of w.particles) {
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 1 - 2.2 * dt;
    pt.vy *= 1 - 2.2 * dt;
    pt.vy += 60 * dt;
  }
  w.particles = w.particles.filter((pt) => pt.life > 0);
  for (const t of w.texts) {
    t.life -= dt;
    t.y -= 42 * dt;
  }
  w.texts = w.texts.filter((t) => t.life > 0);
  if (w.shake > 0) w.shake = Math.max(0, w.shake - LENT.FX.shakeDecay * dt);
};

/** One frame of the whole world. */
LENT.world.update = function (dt) {
  const w = LENT.world;
  w.time += dt;
  if (w.state === 'playing') LENT.world.updatePlaying(dt);
  else if (w.state === 'title' || w.state === 'gameover') LENT.world.ageFx(dt);
};
