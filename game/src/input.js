'use strict';
/* LENTERA — input: keyboard and mouse, in canvas coordinates.
   The game reads LENT.input every frame. Keys held are in `keys`;
   keys pressed since the last frame are in `pressed` (main.js clears
   it at the end of each frame). Mouse position is converted from the
   page into the 1280x720 playfield, whatever the canvas's CSS size. */

LENT.input = {
  /** Keyboard codes held down right now (e.g. 'KeyW', 'Space'). */
  keys: new Set(),
  /** Keyboard codes pressed since the last frame ended. */
  pressed: new Set(),
  /** Mouse position in canvas pixels. */
  mouseX: LENT.WIDTH / 2,
  mouseY: LENT.HEIGHT - 120,
  /** Whether the mouse button (or a touch) is held down. */
  mouseDown: false,
  /** Whether the mouse has moved at all yet (the lantern waits for it). */
  mouseSeen: false,
};

/** Whether a movement or fire key is held. */
LENT.input.isDown = function (code) {
  return LENT.input.keys.has(code);
};

/** True while the player is asking to fire (mouse held or Space). */
LENT.input.firing = function () {
  return LENT.input.mouseDown || LENT.input.keys.has('Space');
};

/** True while the player asks to move left / right / up / down. */
LENT.input.moveX = function () {
  let x = 0;
  if (LENT.input.keys.has('KeyA') || LENT.input.keys.has('ArrowLeft')) x -= 1;
  if (LENT.input.keys.has('KeyD') || LENT.input.keys.has('ArrowRight')) x += 1;
  return x;
};
LENT.input.moveY = function () {
  let y = 0;
  if (LENT.input.keys.has('KeyW') || LENT.input.keys.has('ArrowUp')) y -= 1;
  if (LENT.input.keys.has('KeyS') || LENT.input.keys.has('ArrowDown')) y += 1;
  return y;
};

/** Called by main.js at the end of every frame. */
LENT.input.endFrame = function () {
  LENT.input.pressed.clear();
};

/** Wire the listeners onto the canvas and the window. */
LENT.input.attach = function (canvas) {
  const toCanvas = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * LENT.WIDTH,
      y: ((clientY - rect.top) / rect.height) * LENT.HEIGHT,
    };
  };

  canvas.addEventListener('pointermove', (e) => {
    const p = toCanvas(e.clientX, e.clientY);
    LENT.input.mouseX = p.x;
    LENT.input.mouseY = p.y;
    LENT.input.mouseSeen = true;
  });
  canvas.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e.clientX, e.clientY);
    LENT.input.mouseX = p.x;
    LENT.input.mouseY = p.y;
    LENT.input.mouseSeen = true;
    LENT.input.mouseDown = true;
    LENT.audio.unlock();
    e.preventDefault();
  });
  window.addEventListener('pointerup', () => {
    LENT.input.mouseDown = false;
  });
  window.addEventListener('pointercancel', () => {
    LENT.input.mouseDown = false;
  });
  window.addEventListener('blur', () => {
    LENT.input.mouseDown = false;
    LENT.input.keys.clear();
  });

  window.addEventListener('keydown', (e) => {
    // Space and the arrows would scroll the page; the game owns them.
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (!e.repeat) LENT.input.pressed.add(e.code);
    LENT.input.keys.add(e.code);
    LENT.audio.unlock();
  });
  window.addEventListener('keyup', (e) => {
    LENT.input.keys.delete(e.code);
  });
  // Keep the context menu away from a right-click hold.
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
};
