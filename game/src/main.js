'use strict';
/* LENTERA — main: the game loop and the state machine.
   One animation frame per tick: read the input edges, move the
   world one step, draw it, clear the frame's edges. The loop never
   stops — the title screen, the pause veil and the game-over
   screen are all just states of the same world. */

LENT.main = {
  /** The canvas element. */
  canvas: null,
  /** Its 2D context. */
  ctx: null,
  /** Timestamp of the last frame, in milliseconds. */
  last: 0,
  /** Mouse button state last frame (for click edges). */
  prevMouseDown: false,
};

/** Start the game from the title or the game-over screen. */
LENT.main.start = function () {
  LENT.audio.unlock();
  LENT.world.startGame();
};

/** One key edge, by state. Returns nothing; the world changes. */
LENT.main.onKey = function (code) {
  const w = LENT.world;
  if (code === 'KeyM') {
    LENT.audio.toggleMute();
    return;
  }
  if (w.state === 'title') {
    if (code === 'Enter' || code === 'Space') LENT.main.start();
    return;
  }
  if (w.state === 'playing') {
    if (code === 'KeyP') LENT.world.togglePause();
    else if (code === 'KeyR') LENT.main.start();
    return;
  }
  if (w.state === 'paused') {
    if (code === 'KeyP') LENT.world.togglePause();
    else if (code === 'KeyR') LENT.main.start();
    return;
  }
  if (w.state === 'gameover') {
    if (code === 'KeyR' || code === 'Enter' || code === 'Space') LENT.main.start();
  }
};

/** One animation frame. */
LENT.main.frame = function (now) {
  const m = LENT.main;
  const w = LENT.world;
  const dt = Math.min(0.05, Math.max(0, (now - m.last) / 1000 || 0));
  m.last = now;

  // Key edges pressed since the last frame.
  for (const code of LENT.input.pressed) LENT.main.onKey(code);

  // A mouse click (rising edge) starts or restarts the game.
  const clicked = LENT.input.mouseDown && !m.prevMouseDown;
  m.prevMouseDown = LENT.input.mouseDown;
  if (clicked && (w.state === 'title' || w.state === 'gameover')) {
    LENT.main.start();
  }

  LENT.world.update(dt);
  LENT.render.draw(m.ctx, w, dt);
  LENT.input.endFrame();
  window.requestAnimationFrame(LENT.main.frame);
};

/** Boot: find the canvas, wire input, start the loop. */
LENT.main.boot = function () {
  const canvas = document.getElementById('game');
  LENT.main.canvas = canvas;
  LENT.main.ctx = canvas.getContext('2d');
  LENT.input.attach(canvas);
  // Leaving the tab pauses a game in progress; the night waits.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && LENT.world.state === 'playing') {
      LENT.world.togglePause();
    }
  });
  LENT.main.last = window.performance.now();
  window.requestAnimationFrame(LENT.main.frame);
};

LENT.main.boot();
