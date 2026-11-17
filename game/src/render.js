'use strict';
/* LENTERA — render: everything the eye sees, in sumi-e ink style.
   Rice paper, black brush strokes with dry-brush edges, ink-wash
   clouds and mountains, and one vermilion seal red for the lantern,
   the power-ups and the key UI. The player is a round lantern with
   a red glow ring; the enemies are jagged ink blots — the two can
   never be confused at a glance. Nothing here loads anything: all
   art is drawn from code, and the paper grain is painted once onto
   an offscreen canvas and reused. */

LENT.render = {};

/** Bold serif stack: a calligraphy feel from system fonts only. */
LENT.render.serif = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif';

/** The paper grain, painted once and reused every frame. */
LENT.render.grain = null;

/** Paint the grain canvas: speckles, fibres and faint blotches. */
LENT.render.makeGrain = function () {
  const g = document.createElement('canvas');
  g.width = LENT.WIDTH;
  g.height = LENT.HEIGHT;
  const c = g.getContext('2d');
  for (let i = 0; i < 3600; i++) {
    const a = LENT.util.rand(0.02, 0.07);
    c.fillStyle = Math.random() < 0.5 ? `rgba(90, 75, 50, ${a})` : `rgba(60, 55, 45, ${a})`;
    c.fillRect(LENT.util.rand(0, LENT.WIDTH), LENT.util.rand(0, LENT.HEIGHT), LENT.util.rand(1, 2.4), LENT.util.rand(1, 2.4));
  }
  c.strokeStyle = 'rgba(90, 75, 50, 0.035)';
  c.lineWidth = 1;
  for (let i = 0; i < 70; i++) {
    const x = LENT.util.rand(0, LENT.WIDTH);
    const y = LENT.util.rand(0, LENT.HEIGHT);
    const len = LENT.util.rand(20, 90);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + len, y + LENT.util.rand(-3, 3));
    c.stroke();
  }
  for (let i = 0; i < 14; i++) {
    const x = LENT.util.rand(0, LENT.WIDTH);
    const y = LENT.util.rand(0, LENT.HEIGHT);
    const r = LENT.util.rand(40, 130);
    const grad = c.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(120, 100, 70, 0.03)');
    grad.addColorStop(1, 'rgba(120, 100, 70, 0)');
    c.fillStyle = grad;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  LENT.render.grain = g;
};

/** Two faint mountain ridges along the bottom, drawn once. */
LENT.render.ridges = null;
LENT.render.makeRidges = function () {
  const ridge = (base, amp, step) => {
    const pts = [];
    for (let x = -20; x <= LENT.WIDTH + 20; x += step) {
      pts.push([x, base - Math.abs(Math.sin(x * 0.004 + base)) * amp - LENT.util.rand(0, amp * 0.5)]);
    }
    return pts;
  };
  LENT.render.ridges = [ridge(LENT.HEIGHT + 6, 46, 46), ridge(LENT.HEIGHT + 6, 26, 30)];
};

/** Four slow ink-wash clouds. */
LENT.render.clouds = [
  { fx: 0.18, y: 110, rx: 220, ry: 46, speed: 6, alpha: 0.06 },
  { fx: 0.62, y: 190, rx: 280, ry: 58, speed: 4, alpha: 0.05 },
  { fx: 0.85, y: 80, rx: 180, ry: 38, speed: 8, alpha: 0.05 },
  { fx: 0.42, y: 300, rx: 240, ry: 44, speed: 5, alpha: 0.04 },
];

/** A jagged ink blot: a closed path from a blob's radius factors. */
LENT.render.blotPath = function (ctx, x, y, r, blob, wobble) {
  const n = blob.length;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const f = blob[i % n];
    const a = (i / n) * Math.PI * 2 + (wobble || 0);
    const rr = r * f;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
};

/** A brush stroke: a polyline drawn solid, then once more dashed and
    faint, for a dry-brush edge. */
LENT.render.brushStroke = function (ctx, pts, width, color, alpha) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.globalAlpha = alpha * 0.45;
  ctx.setLineDash([2, 5]);
  ctx.lineWidth = width * 0.55;
  ctx.stroke();
  ctx.restore();
};

/** A hand-drawn circle: two slightly offset arcs, never mechanical. */
LENT.render.brushCircle = function (ctx, x, y, r, width, color, alpha) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  for (const [dx, dy, rr, a0, a1] of [[0, 0, r, 0, Math.PI * 2], [1.5, -1, r * 0.96, 0.4, Math.PI * 2 + 0.4]]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, rr, a0, a1);
    ctx.stroke();
  }
  ctx.restore();
};

/** A vermilion seal stamp: a red square with a paper-coloured mark. */
LENT.render.sealStamp = function (ctx, x, y, size, mark) {
  ctx.save();
  ctx.fillStyle = LENT.COLORS.seal;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = LENT.COLORS.paperTop;
  ctx.font = `700 ${Math.floor(size * 0.62)}px ${LENT.render.serif}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(mark, x + size / 2, y + size / 2 + size * 0.03);
  ctx.restore();
};

/** One line of text in the brush serif. */
LENT.render.text = function (ctx, str, x, y, px, color, align, alpha, weight) {
  ctx.save();
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  ctx.fillStyle = color;
  ctx.font = `${weight || 700} ${px}px ${LENT.render.serif}`;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
  ctx.restore();
};

/** The rice-paper background: gradient, grain, wash clouds, ridges. */
LENT.render.drawBackground = function (ctx, time) {
  const grad = ctx.createLinearGradient(0, 0, 0, LENT.HEIGHT);
  grad.addColorStop(0, LENT.COLORS.paperTop);
  grad.addColorStop(1, LENT.COLORS.paperBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, LENT.WIDTH, LENT.HEIGHT);
  if (!LENT.render.grain) LENT.render.makeGrain();
  ctx.drawImage(LENT.render.grain, 0, 0);
  // Drifting ink-wash clouds.
  for (const c of LENT.render.clouds) {
    const x = (((c.fx * LENT.WIDTH + time * c.speed) % (LENT.WIDTH + 560)) + LENT.WIDTH + 560) % (LENT.WIDTH + 560) - 280;
    const g = ctx.createRadialGradient(x, c.y, 0, x, c.y, c.rx);
    g.addColorStop(0, `rgba(70, 60, 45, ${c.alpha})`);
    g.addColorStop(1, 'rgba(70, 60, 45, 0)');
    ctx.save();
    ctx.translate(x, c.y);
    ctx.scale(1, c.ry / c.rx);
    ctx.translate(-x, -c.y);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, c.y, c.rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Faint mountain ridges along the bottom edge.
  if (!LENT.render.ridges) LENT.render.makeRidges();
  const alphas = [0.07, 0.11];
  for (let k = 0; k < LENT.render.ridges.length; k++) {
    const pts = LENT.render.ridges[k];
    ctx.save();
    ctx.globalAlpha = alphas[k];
    ctx.fillStyle = LENT.COLORS.inkSoft;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], LENT.HEIGHT);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.lineTo(LENT.WIDTH + 20, LENT.HEIGHT);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};

/** The lantern spirit: a red glow ring, an ink ring, a paper disc
    and a vermilion flame. It blinks while invulnerable. */
LENT.render.drawPlayer = function (ctx, p, time) {
  const blink = p.invulnerable > 0 && Math.floor(time * 14) % 2 === 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;
  // The glow: a soft seal-red wash around the lantern.
  const glow = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 64);
  glow.addColorStop(0, 'rgba(193, 59, 42, 0.30)');
  glow.addColorStop(0.55, 'rgba(193, 59, 42, 0.10)');
  glow.addColorStop(1, 'rgba(193, 59, 42, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 64, 0, Math.PI * 2);
  ctx.fill();
  // The lantern body: paper disc, ink brush ring.
  ctx.fillStyle = LENT.COLORS.paperTop;
  ctx.beginPath();
  ctx.arc(p.x, p.y, LENT.PLAYER.radius, 0, Math.PI * 2);
  ctx.fill();
  LENT.render.brushCircle(ctx, p.x, p.y, LENT.PLAYER.radius, 4, LENT.COLORS.ink, 0.95);
  // The flame: a vermilion teardrop that flickers.
  const flick = 1 + Math.sin(time * 11) * 0.12;
  ctx.fillStyle = LENT.COLORS.seal;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 11 * flick);
  ctx.quadraticCurveTo(p.x + 6, p.y + 1, p.x, p.y + 7);
  ctx.quadraticCurveTo(p.x - 6, p.y + 1, p.x, p.y - 11 * flick);
  ctx.fill();
  // A small ink wick dot under the flame.
  ctx.fillStyle = LENT.COLORS.ink;
  ctx.beginPath();
  ctx.arc(p.x, p.y + 8, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // The shield, while it lasts: a second ring in seal red.
  if (p.shield) {
    LENT.render.brushCircle(ctx, p.x, p.y, LENT.PLAYER.radius + 9, 3, LENT.COLORS.seal, 0.85);
  }
  ctx.restore();
};

/** Pale eyes on a blot, so a wisp reads as a creature. */
LENT.render.drawEyes = function (ctx, x, y, r, red) {
  const ex = r * 0.34;
  const ey = -r * 0.12;
  const er = Math.max(2.5, r * 0.16);
  ctx.save();
  ctx.fillStyle = red ? LENT.COLORS.seal : LENT.COLORS.paperTop;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + sx * ex, y + ey, er, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = LENT.COLORS.ink;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + sx * ex, y + ey + er * 0.2, er * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

/** One shadow wisp, drawn as a jagged ink blot, shaped by its kind. */
LENT.render.drawEnemy = function (ctx, e, time) {
  ctx.save();
  if (e.isBoss) {
    // The great shadow: a huge blot, crown spikes, red eyes.
    ctx.translate(e.x, e.y);
    ctx.fillStyle = LENT.COLORS.ink;
    ctx.globalAlpha = 0.92;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + e.t * 0.2;
      const bx = Math.cos(a) * e.radius * 1.05;
      const by = Math.sin(a) * e.radius * 1.05 - 8;
      ctx.beginPath();
      ctx.moveTo(bx - 12, by + 10);
      ctx.lineTo(bx, by - 26);
      ctx.lineTo(bx + 12, by + 10);
      ctx.closePath();
      ctx.fill();
    }
    LENT.render.blotPath(ctx, 0, 0, e.radius, e.blob, e.t * 0.15);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    LENT.render.blotPath(ctx, 0, 0, e.radius * 0.62, e.blob, -e.t * 0.1);
    ctx.fillStyle = LENT.COLORS.inkSoft;
    ctx.fill();
    ctx.restore();
    LENT.render.drawEyes(ctx, e.x, e.y, e.radius, true);
    if (e.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, e.flash * 6) * 0.5;
      LENT.render.blotPath(ctx, e.x, e.y, e.radius, e.blob, e.t * 0.15);
      ctx.fillStyle = LENT.COLORS.paperTop;
      ctx.fill();
      ctx.restore();
    }
    return;
  }
  ctx.translate(e.x, e.y);
  if (e.type === 'darter') ctx.scale(0.82, 1.32);
  else if (e.type === 'moth') ctx.scale(1.3, 0.9);
  ctx.fillStyle = LENT.COLORS.ink;
  ctx.globalAlpha = 0.92;
  LENT.render.blotPath(ctx, 0, 0, e.radius, e.blob, e.seed);
  ctx.fill();
  ctx.globalAlpha = 0.45;
  LENT.render.blotPath(ctx, 0, 0, e.radius * 0.6, e.blob, -e.seed);
  ctx.fillStyle = LENT.COLORS.inkSoft;
  ctx.fill();
  ctx.restore();
  // A beetle wears a hard shell ring; a moth wears wing lobes.
  if (e.type === 'beetle') {
    LENT.render.brushCircle(ctx, e.x, e.y, e.radius + 5, 3, LENT.COLORS.ink, 0.8);
  } else if (e.type === 'moth') {
    ctx.save();
    ctx.fillStyle = LENT.COLORS.ink;
    ctx.globalAlpha = 0.75;
    for (const sx of [-1, 1]) {
      LENT.render.blotPath(ctx, e.x + sx * e.radius * 0.95, e.y, e.radius * 0.55, e.blob, e.seed + sx);
      ctx.fill();
    }
    ctx.restore();
  }
  LENT.render.drawEyes(ctx, e.x, e.y, e.radius, false);
  if (e.flash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, e.flash * 6) * 0.55;
    LENT.render.blotPath(ctx, e.x, e.y, e.radius, e.blob, e.seed);
    ctx.fillStyle = LENT.COLORS.paperTop;
    ctx.fill();
    ctx.restore();
  }
};

/** Light orbs: ink droplets with a trailing brush stroke. */
LENT.render.drawBullets = function (ctx, bullets) {
  ctx.save();
  ctx.strokeStyle = LENT.COLORS.ink;
  ctx.fillStyle = LENT.COLORS.ink;
  for (const b of bullets) {
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = LENT.COLORS.paperTop;
    ctx.fill();
    ctx.fillStyle = LENT.COLORS.ink;
  }
  ctx.restore();
};

/** Shadow bolts: small jagged ink drops falling from the boss. */
LENT.render.drawBolts = function (ctx, bolts) {
  ctx.save();
  for (const b of bolts) {
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = LENT.COLORS.inkSoft;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y - b.radius - 4);
    ctx.quadraticCurveTo(b.x + b.radius, b.y, b.x, b.y + b.radius);
    ctx.quadraticCurveTo(b.x - b.radius, b.y, b.x, b.y - b.radius - 4);
    ctx.fill();
  }
  ctx.restore();
};

/** Power-ups: a paper disc in an ink ring, with a seal-red mark. */
LENT.render.drawPowerups = function (ctx, powerups, time) {
  for (const u of powerups) {
    const bob = Math.sin(u.t * 3) * 3;
    const y = u.y + bob;
    ctx.save();
    ctx.fillStyle = LENT.COLORS.paperTop;
    ctx.beginPath();
    ctx.arc(u.x, y, u.radius, 0, Math.PI * 2);
    ctx.fill();
    LENT.render.brushCircle(ctx, u.x, y, u.radius, 3, LENT.COLORS.ink, 0.9);
    ctx.fillStyle = LENT.COLORS.seal;
    ctx.strokeStyle = LENT.COLORS.seal;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    if (u.kind === 'spread') {
      for (const dx of [-6, 0, 6]) {
        ctx.beginPath();
        ctx.arc(u.x + dx, y + 2, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(u.x, y - 8);
      ctx.lineTo(u.x, y - 2);
      ctx.stroke();
    } else if (u.kind === 'rapid') {
      ctx.beginPath();
      ctx.moveTo(u.x + 2, y - 9);
      ctx.lineTo(u.x - 4, y + 1);
      ctx.lineTo(u.x + 1, y + 1);
      ctx.lineTo(u.x - 2, y + 9);
      ctx.lineTo(u.x + 5, y - 1);
      ctx.lineTo(u.x, y - 1);
      ctx.closePath();
      ctx.fill();
    } else if (u.kind === 'shield') {
      LENT.render.brushCircle(ctx, u.x, y, 7, 3, LENT.COLORS.seal, 0.95);
    } else {
      // bomb: a seal-red disc with a sparking fuse.
      ctx.beginPath();
      ctx.arc(u.x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(u.x + 4, y - 6);
      ctx.quadraticCurveTo(u.x + 9, y - 11, u.x + 7, y - 13);
      ctx.stroke();
    }
    ctx.restore();
  }
};

/** Ink-splash particles: a dark drop with satellite specks. */
LENT.render.drawParticles = function (ctx, particles) {
  ctx.save();
  for (const pt of particles) {
    const a = Math.max(0, pt.life / pt.maxLife);
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size * (0.5 + a * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = a * 0.5;
    ctx.beginPath();
    ctx.arc(pt.x + pt.size * 1.6, pt.y - pt.size, pt.size * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

/** Floating score texts in the brush serif. */
LENT.render.drawTexts = function (ctx, texts) {
  for (const t of texts) {
    const a = Math.max(0, t.life / t.maxLife);
    LENT.render.text(ctx, t.str, t.x, t.y, t.str.length > 8 ? 18 : 22, t.color, 'center', a);
  }
};

/** A thin ink rule with a seal-red fill: progress and boss health. */
LENT.render.bar = function (ctx, x, y, w, h, frac, fill) {
  ctx.save();
  ctx.strokeStyle = LENT.COLORS.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 2, y + 2, Math.max(0, (w - 4) * LENT.util.clamp(frac, 0, 1)), h - 4);
  ctx.restore();
};

/** The HUD: score, combo, lanterns, wave, boss bar, power-up timers. */
LENT.render.drawHUD = function (ctx, w) {
  const C = LENT.COLORS;
  // Score, top left, with a seal stamp beside it.
  LENT.render.sealStamp(ctx, 28, 22, 34, 'L');
  LENT.render.text(ctx, String(w.score).padStart(6, '0'), 72, 40, 30, C.ink, 'left', 1);
  LENT.render.text(ctx, 'SCORE', 72, 62, 12, C.inkWash, 'left', 1);
  if (w.combo > 1) {
    LENT.render.text(ctx, `COMBO x${w.combo}`, 72, 88, 20, C.seal, 'left', 1);
    LENT.render.bar(ctx, 72, 98, 90 * (w.comboTimer / LENT.COMBO.window), 5, 1, C.seal);
  }
  // Lanterns left, top right: small red discs in ink rings.
  for (let i = 0; i < LENT.PLAYER.lives; i++) {
    const x = LENT.WIDTH - 40 - i * 34;
    const y = 40;
    ctx.save();
    ctx.globalAlpha = i < w.lives ? 1 : 0.25;
    ctx.fillStyle = C.seal;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
    LENT.render.brushCircle(ctx, x, y, 11, 2.5, C.ink, 0.9);
    ctx.restore();
  }
  LENT.render.text(ctx, 'LANTERNS', LENT.WIDTH - 40 - (LENT.PLAYER.lives - 1) * 34, 62, 12, C.inkWash, 'right', 1);
  // Wave and progress, top centre.
  LENT.render.text(ctx, `WAVE ${w.wave}`, LENT.WIDTH / 2, 36, 22, C.ink, 'center', 1);
  const alive = w.enemies.filter((e) => !e.dead && !e.isBoss).length;
  const total = Math.max(1, w.waveTotal + (w.boss ? 1 : 0));
  const done = total - w.spawnLeft - alive - (w.boss ? 0 : 0);
  LENT.render.bar(ctx, LENT.WIDTH / 2 - 110, 52, 220, 7, done / total, C.ink);
  // Boss health, under the wave bar.
  if (w.boss) {
    LENT.render.text(ctx, 'GREAT SHADOW', LENT.WIDTH / 2, 82, 13, C.seal, 'center', 1);
    LENT.render.bar(ctx, LENT.WIDTH / 2 - 160, 94, 320, 10, w.boss.hp / w.boss.maxHp, C.seal);
  }
  // Active power-up timers, bottom left.
  let ty = LENT.HEIGHT - 30;
  const p = w.player;
  if (p) {
    if (p.spreadTimer > 0) {
      LENT.render.text(ctx, `SPREAD ${Math.ceil(p.spreadTimer)}s`, 28, ty, 15, C.seal, 'left', 1);
      ty -= 22;
    }
    if (p.rapidTimer > 0) {
      LENT.render.text(ctx, `RAPID ${Math.ceil(p.rapidTimer)}s`, 28, ty, 15, C.seal, 'left', 1);
      ty -= 22;
    }
    if (p.shield) {
      LENT.render.text(ctx, 'SHIELD', 28, ty, 15, C.seal, 'left', 1);
    }
  }
  // Keys, bottom right.
  const mute = LENT.audio.muted ? 'MUTED' : 'SOUND ON';
  LENT.render.text(ctx, `P pause · M ${mute.toLowerCase()}`, LENT.WIDTH - 28, LENT.HEIGHT - 30, 13, C.inkWash, 'right', 1);
  // Wave banner, centre of the sky.
  if (w.banner && w.betweenTimer > 0) {
    const a = Math.min(1, w.betweenTimer / 0.6);
    LENT.render.text(ctx, w.banner, LENT.WIDTH / 2, LENT.HEIGHT / 2 - 60, 44, C.ink, 'center', a);
    LENT.render.brushStroke(ctx, [[LENT.WIDTH / 2 - 190, LENT.HEIGHT / 2 - 28], [LENT.WIDTH / 2 + 190, LENT.HEIGHT / 2 - 28]], 3, C.seal, a);
  }
};

/** The title screen: red sun, big brush title, seal, instructions. */
LENT.render.drawTitle = function (ctx, w, time) {
  const C = LENT.COLORS;
  // A seal-red sun, low and round, like a woodblock print.
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = C.seal;
  ctx.beginPath();
  ctx.arc(LENT.WIDTH - 210, 150, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Three decorative wisps drifting across the sky.
  for (let i = 0; i < 3; i++) {
    const x = ((time * (18 + i * 7) + i * 430) % (LENT.WIDTH + 200)) - 100;
    const y = 210 + i * 90 + Math.sin(time * 0.9 + i * 2) * 22;
    const r = 20 + i * 5;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = C.ink;
    const blob = [1, 0.8, 1.15, 0.85, 1.1, 0.75, 1.2, 0.9, 1];
    LENT.render.blotPath(ctx, x, y, r, blob, i);
    ctx.fill();
    ctx.restore();
    LENT.render.drawEyes(ctx, x, y, r, false);
  }
  // The seal stamp and the title.
  LENT.render.sealStamp(ctx, LENT.WIDTH / 2 - 262, 238, 74, 'L');
  LENT.render.text(ctx, 'LENTERA', LENT.WIDTH / 2 + 30, 278, 92, C.ink, 'center', 1);
  LENT.render.brushStroke(ctx, [[LENT.WIDTH / 2 - 250, 332], [LENT.WIDTH / 2 + 250, 332]], 3, C.seal, 0.9);
  LENT.render.text(ctx, 'a lantern spirit defends the night sky', LENT.WIDTH / 2, 362, 22, C.inkSoft, 'center', 1);
  // Instructions.
  const lines = [
    'Move — mouse or WASD / arrow keys',
    'Fire — hold click or SPACE',
    'Do not let the wisps reach the bottom of the sky',
    'A boss rises every third wave',
  ];
  lines.forEach((line, i) => {
    LENT.render.text(ctx, line, LENT.WIDTH / 2, 420 + i * 30, 18, C.inkSoft, 'center', 1);
  });
  // Best score.
  if (w.best > 0) {
    LENT.render.text(ctx, `BEST  ${String(w.best).padStart(6, '0')}`, LENT.WIDTH / 2, 556, 20, C.seal, 'center', 1);
  }
  // The call to start, gently blinking.
  const blink = 0.68 + 0.32 * Math.sin(time * 3.2);
  LENT.render.text(ctx, 'CLICK OR PRESS ENTER TO LIGHT THE LANTERN', LENT.WIDTH / 2, 606, 20, C.ink, 'center', blink);
};

/** The pause veil. */
LENT.render.drawPaused = function (ctx) {
  const C = LENT.COLORS;
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = C.paperTop;
  ctx.fillRect(0, 0, LENT.WIDTH, LENT.HEIGHT);
  ctx.restore();
  LENT.render.text(ctx, 'PAUSED', LENT.WIDTH / 2, LENT.HEIGHT / 2 - 20, 64, C.ink, 'center', 1);
  LENT.render.brushStroke(ctx, [[LENT.WIDTH / 2 - 130, LENT.HEIGHT / 2 + 22], [LENT.WIDTH / 2 + 130, LENT.HEIGHT / 2 + 22]], 3, C.seal, 0.9);
  LENT.render.text(ctx, 'press P to keep playing', LENT.WIDTH / 2, LENT.HEIGHT / 2 + 56, 18, C.inkSoft, 'center', 1);
};

/** The game-over screen: the light fades, the score stays. */
LENT.render.drawGameOver = function (ctx, w) {
  const C = LENT.COLORS;
  LENT.render.text(ctx, 'THE LIGHT FADES', LENT.WIDTH / 2, 220, 62, C.ink, 'center', 1);
  LENT.render.brushStroke(ctx, [[LENT.WIDTH / 2 - 210, 262], [LENT.WIDTH / 2 + 210, 262]], 3, C.seal, 0.9);
  LENT.render.text(ctx, 'FINAL SCORE', LENT.WIDTH / 2, 318, 18, C.inkWash, 'center', 1);
  LENT.render.text(ctx, String(w.score).padStart(6, '0'), LENT.WIDTH / 2, 366, 56, C.ink, 'center', 1);
  LENT.render.text(ctx, `WAVE ${w.wave}  ·  BEST ${String(w.best).padStart(6, '0')}`, LENT.WIDTH / 2, 424, 20, C.inkSoft, 'center', 1);
  if (w.newBest) {
    LENT.render.sealStamp(ctx, LENT.WIDTH / 2 + 190, 392, 64, 'L');
    LENT.render.text(ctx, 'NEW BEST', LENT.WIDTH / 2 + 222, 470, 16, C.seal, 'center', 1);
  }
  const blink = 0.68 + 0.32 * Math.sin(w.time * 3.2);
  LENT.render.text(ctx, 'PRESS R OR CLICK TO LIGHT AGAIN', LENT.WIDTH / 2, 520, 20, C.ink, 'center', blink);
  LENT.render.text(ctx, 'the wisps keep the night — for now', LENT.WIDTH / 2, 566, 16, C.inkWash, 'center', 1);
};

/** One frame: background, entities, HUD, and the state screens. */
LENT.render.draw = function (ctx, w, dt) {
  ctx.save();
  ctx.clearRect(0, 0, LENT.WIDTH, LENT.HEIGHT);
  if (w.shake > 0.3) {
    ctx.translate(LENT.util.rand(-w.shake, w.shake), LENT.util.rand(-w.shake, w.shake));
  }
  LENT.render.drawBackground(ctx, w.time);
  if (w.state === 'title') {
    LENT.render.drawTitle(ctx, w, w.time);
  } else {
    if (w.player) LENT.render.drawPlayer(ctx, w.player, w.time);
    for (const e of w.enemies) LENT.render.drawEnemy(ctx, e, w.time);
    LENT.render.drawBullets(ctx, w.bullets);
    LENT.render.drawBolts(ctx, w.bolts);
    LENT.render.drawPowerups(ctx, w.powerups, w.time);
    LENT.render.drawParticles(ctx, w.particles);
    LENT.render.drawTexts(ctx, w.texts);
    if (w.state === 'playing' || w.state === 'paused') LENT.render.drawHUD(ctx, w);
    if (w.state === 'paused') LENT.render.drawPaused(ctx);
    if (w.state === 'gameover') LENT.render.drawGameOver(ctx, w);
  }
  ctx.restore();
};
