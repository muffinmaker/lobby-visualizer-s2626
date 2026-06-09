const DEBOUNCE_MS = 250;

/** Menu mode: hold ◀ ▶ to keep adjusting; interval shrinks while held. */
const MENU_ADJUST_HOLD = {
  INITIAL_DELAY_MS: 320,
  START_INTERVAL_MS: 130,
  MIN_INTERVAL_MS: 34,
  RAMP_MS: 950,
};

/** Standard Gamepad face buttons (SNES-style USB clones). */
const FACE_BUTTONS = {
  b: 0,
  a: 1,
  y: 2,
  x: 3,
  select: 8,
  start: 9,
};

/** Standard Gamepad API D-pad button indices (not shoulder L/R). */
const DPAD_BUTTONS = { up: 12, down: 13, left: 14, right: 15 };

/** SNES-style USB pads: L/R are usually 4/5; some clones use 6/7 or 4/6. */
const SHOULDER_BUTTONS = { left: 4, right: 5, altLeft: 6, altRight: 7 };

const ACTIONS = {
  presetPrev: 'presetPrev',
  presetNext: 'presetNext',
  shaderPrev: 'shaderPrev',
  shaderNext: 'shaderNext',
  toggleSettings: 'toggleSettings',
  menuNavigateUp: 'menuNavigateUp',
  menuNavigateDown: 'menuNavigateDown',
  menuAdjustLeft: 'menuAdjustLeft',
  menuAdjustRight: 'menuAdjustRight',
  menuRandom: 'menuRandom',
  toggleFullscreen: 'toggleFullscreen',
  chaosNewPreset: 'chaosNewPreset',
  chaosFullShuffle: 'chaosFullShuffle',
  chaosJumpPreset: 'chaosJumpPreset',
  chaosRandomizeSliders: 'chaosRandomizeSliders',
};

const INPUT_TO_ACTION = {
  shoulderLeft: ACTIONS.shaderPrev,
  shoulderRight: ACTIONS.shaderNext,
  dpadLeft: ACTIONS.shaderPrev,
  dpadRight: ACTIONS.shaderNext,
  dpadUp: ACTIONS.presetPrev,
  dpadDown: ACTIONS.presetNext,
  start: ACTIONS.toggleFullscreen,
  select: ACTIONS.toggleSettings,
  a: ACTIONS.chaosNewPreset,
  b: ACTIONS.chaosRandomizeSliders,
  x: ACTIONS.chaosJumpPreset,
  y: ACTIONS.chaosFullShuffle,
};

const MENU_INPUT_TO_ACTION = {
  dpadUp: ACTIONS.menuNavigateUp,
  dpadDown: ACTIONS.menuNavigateDown,
  dpadLeft: ACTIONS.menuAdjustLeft,
  dpadRight: ACTIONS.menuAdjustRight,
  start: ACTIONS.toggleFullscreen,
  select: ACTIONS.toggleSettings,
  a: ACTIONS.chaosNewPreset,
  b: ACTIONS.menuRandom,
  x: ACTIONS.chaosJumpPreset,
  y: ACTIONS.chaosFullShuffle,
};

function ensureToast() {
  let el = document.getElementById('gamepad-toast');
  if (el) return el;

  el = document.createElement('div');
  el.id = 'gamepad-toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  Object.assign(el.style, {
    position: 'fixed',
    top: '1rem',
    left: '1rem',
    transform: 'translateY(-0.5rem)',
    padding: '0.45rem 0.9rem',
    borderRadius: '6px',
    background: 'rgba(20, 20, 20, 0.88)',
    color: 'rgba(255, 255, 255, 0.9)',
    font: '0.8rem/1.3 system-ui, -apple-system, sans-serif',
    letterSpacing: '0.02em',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.25s ease, transform 0.25s ease',
    zIndex: '30',
  });
  document.body.appendChild(el);
  return el;
}

export function showGamepadToast(message, durationMs = 2200) {
  const el = ensureToast();
  el.textContent = message;
  el.style.opacity = '1';
  el.style.transform = 'translateY(0)';
  clearTimeout(showGamepadToast._timer);
  showGamepadToast._timer = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-0.5rem)';
  }, durationMs);
}

function isPressed(button) {
  return Boolean(button && (button.pressed || button.value > 0.5));
}

const EMPTY_DPAD = {
  dpadUp: false,
  dpadDown: false,
  dpadLeft: false,
  dpadRight: false,
};

function readDpadButtons(gamepad) {
  return {
    dpadUp: isPressed(gamepad.buttons[DPAD_BUTTONS.up]),
    dpadDown: isPressed(gamepad.buttons[DPAD_BUTTONS.down]),
    dpadLeft: isPressed(gamepad.buttons[DPAD_BUTTONS.left]),
    dpadRight: isPressed(gamepad.buttons[DPAD_BUTTONS.right]),
  };
}

function isButtonPressed(gamepad, index) {
  return isPressed(gamepad.buttons[index]);
}

function readShoulders(gamepad) {
  const { left, right, altLeft, altRight } = SHOULDER_BUTTONS;
  const onLeft = isButtonPressed(gamepad, left);
  const onRight = isButtonPressed(gamepad, right);
  const onAltLeft = isButtonPressed(gamepad, altLeft);
  const onAltRight = isButtonPressed(gamepad, altRight);

  // Standard 4/5 pair — prefer R when both ghost-press (clone quirk).
  if (onLeft || onRight) {
    if (onRight) return { shoulderLeft: false, shoulderRight: true };
    return { shoulderLeft: true, shoulderRight: false };
  }

  // Full alternate pair: 6 = L, 7 = R.
  if (onAltLeft || onAltRight) {
    if (onAltRight) return { shoulderLeft: false, shoulderRight: true };
    return { shoulderLeft: true, shoulderRight: false };
  }

  return { shoulderLeft: false, shoulderRight: false };
}

function readDpadAxes(indices, gamepad, threshold = 0.55) {
  const horizontal = gamepad.axes[indices[0]];
  const vertical = gamepad.axes[indices[1]];

  if (horizontal == null && vertical == null) {
    return EMPTY_DPAD;
  }

  return {
    dpadLeft: horizontal != null && horizontal < -threshold,
    dpadRight: horizontal != null && horizontal > threshold,
    dpadUp: vertical != null && vertical < -threshold,
    dpadDown: vertical != null && vertical > threshold,
  };
}

function readDpadHat(gamepad) {
  const hat = gamepad.axes[9] ?? gamepad.axes[10];
  if (hat == null || hat < 0) return EMPTY_DPAD;

  const sector = Math.round(hat);
  if (sector < 0 || sector > 7) return EMPTY_DPAD;

  return {
    dpadUp: sector === 0 || sector === 1 || sector === 7,
    dpadRight: sector === 1 || sector === 2 || sector === 3,
    dpadDown: sector === 3 || sector === 4 || sector === 5,
    dpadLeft: sector === 5 || sector === 6 || sector === 7,
  };
}

function hasStandardDpadButtons(gamepad) {
  return gamepad.buttons.length > 15;
}

function shouldUsePrimaryAxesAsDpad(gamepad) {
  if (hasStandardDpadButtons(gamepad)) return false;
  if (gamepad.axes[6] != null || gamepad.axes[7] != null) return false;
  return gamepad.axes.length <= 2;
}

function hasButtonDpad(gamepad) {
  return gamepad.buttons.length > DPAD_BUTTONS.right;
}

function readDpad(gamepad) {
  const fromButtons = readDpadButtons(gamepad);
  if (Object.values(fromButtons).some(Boolean)) return fromButtons;

  // Axes 6/7 are shoulder triggers on many pads — not the D-pad.
  if (!hasButtonDpad(gamepad)) {
    const fromStandardAxes = readDpadAxes([6, 7], gamepad);
    if (Object.values(fromStandardAxes).some(Boolean)) return fromStandardAxes;
  }

  const fromHat = readDpadHat(gamepad);
  if (Object.values(fromHat).some(Boolean)) return fromHat;

  if (shouldUsePrimaryAxesAsDpad(gamepad)) {
    return readDpadAxes([0, 1], gamepad, 0.72);
  }

  return EMPTY_DPAD;
}

function readFaceXY(gamepad) {
  const on2 = isButtonPressed(gamepad, 2);
  const on3 = isButtonPressed(gamepad, 3);
  if (on2 && on3) return { x: true, y: true };
  if (on2) return { x: false, y: true };
  if (on3) return { x: true, y: false };
  return { x: false, y: false };
}

function readInputs(gamepad) {
  const shoulders = readShoulders(gamepad);
  const dpad = readDpad(gamepad);
  const faceXY = readFaceXY(gamepad);

  // Shoulder presses must not also count as D-pad ◀ (axis 6 bleed on clones).
  const dpadWithoutShoulderBleed =
    shoulders.shoulderLeft || shoulders.shoulderRight
      ? { ...dpad, dpadLeft: false, dpadRight: false }
      : dpad;

  return {
    ...dpadWithoutShoulderBleed,
    ...shoulders,
    ...faceXY,
    select: isButtonPressed(gamepad, FACE_BUTTONS.select),
    start: isButtonPressed(gamepad, FACE_BUTTONS.start),
    a: isButtonPressed(gamepad, FACE_BUTTONS.a),
    b: isButtonPressed(gamepad, FACE_BUTTONS.b),
  };
}

function createEmptyInputState() {
  return Object.fromEntries(Object.keys(INPUT_TO_ACTION).map((key) => [key, false]));
}

export function createGamepadController(handlers = {}, { isMenuMode = () => false } = {}) {
  const prevPressed = createEmptyInputState();
  const lastFireAt = new Map();
  let connectedIndex = null;
  let announced = false;
  let prevMenuMode = false;
  let menuAdjustHold = null;

  function resetMenuAdjustHold() {
    menuAdjustHold = null;
  }

  function menuAdjustIntervalMs(holdMs) {
    if (holdMs < MENU_ADJUST_HOLD.INITIAL_DELAY_MS) return null;
    const rampT = Math.min(
      1,
      (holdMs - MENU_ADJUST_HOLD.INITIAL_DELAY_MS) / MENU_ADJUST_HOLD.RAMP_MS,
    );
    return (
      MENU_ADJUST_HOLD.START_INTERVAL_MS -
      (MENU_ADJUST_HOLD.START_INTERVAL_MS - MENU_ADJUST_HOLD.MIN_INTERVAL_MS) * rampT
    );
  }

  function fireMenuAdjust(action, repeating) {
    handlers[action]?.(repeating);
  }

  function pollMenuAdjustHold(inputs, now) {
    const left = inputs.dpadLeft;
    const right = inputs.dpadRight;

    if ((left && right) || (!left && !right)) {
      resetMenuAdjustHold();
      return;
    }

    const inputKey = left ? 'dpadLeft' : 'dpadRight';
    const action = left ? ACTIONS.menuAdjustLeft : ACTIONS.menuAdjustRight;

    if (!menuAdjustHold || menuAdjustHold.inputKey !== inputKey) {
      menuAdjustHold = { inputKey, action, startedAt: now, lastFireAt: now };
      fireMenuAdjust(action, false);
      return;
    }

    const holdMs = now - menuAdjustHold.startedAt;
    const interval = menuAdjustIntervalMs(holdMs);
    if (interval == null) return;

    const elapsed = now - menuAdjustHold.lastFireAt;
    if (elapsed < interval) return;

    const steps = Math.max(1, Math.floor(elapsed / interval));
    for (let i = 0; i < steps; i += 1) {
      fireMenuAdjust(action, true);
    }
    menuAdjustHold.lastFireAt = now;
  }

  function adoptGamepad(pad) {
    if (!pad?.connected) return false;
    if (connectedIndex !== pad.index) {
      connectedIndex = pad.index;
      announced = false;
      Object.assign(prevPressed, createEmptyInputState());
      resetMenuAdjustHold();
    }
    return true;
  }

  function scanConnectedGamepads() {
    const pads = navigator.getGamepads?.();
    if (!pads) return null;

    if (connectedIndex != null && pads[connectedIndex]?.connected) {
      return pads[connectedIndex];
    }

    for (const pad of pads) {
      if (adoptGamepad(pad)) return pad;
    }

    return null;
  }

  function wakeGamepadApi() {
    scanConnectedGamepads();
  }

  function handleConnect(event) {
    adoptGamepad(event?.gamepad);
  }

  function handleDisconnect(event) {
    if (connectedIndex == null || event?.gamepad?.index === connectedIndex) {
      connectedIndex = null;
      announced = false;
      Object.assign(prevPressed, createEmptyInputState());
      resetMenuAdjustHold();
      showGamepadToast('Gamepad disconnected');
    }
  }

  window.addEventListener('gamepadconnected', handleConnect);
  window.addEventListener('gamepaddisconnected', handleDisconnect);
  window.addEventListener('pointerdown', wakeGamepadApi);
  window.addEventListener('keydown', wakeGamepadApi);

  function fireAction(action) {
    const now = performance.now();
    const last = lastFireAt.get(action) ?? 0;
    if (now - last < DEBOUNCE_MS) return;
    lastFireAt.set(action, now);
    handlers[action]?.();
  }

  function pollGamepad(gamepad) {
    if (!announced) {
      announced = true;
      const label = gamepad.id?.trim() || 'Gamepad';
      showGamepadToast(`${label} connected`);
    }

    const inputs = readInputs(gamepad);
    const now = performance.now();
    const menuMode = isMenuMode();
    if (menuMode !== prevMenuMode) {
      Object.assign(prevPressed, createEmptyInputState());
      resetMenuAdjustHold();
      prevMenuMode = menuMode;
    }
    const mapping = menuMode ? MENU_INPUT_TO_ACTION : INPUT_TO_ACTION;

    if (menuMode) {
      pollMenuAdjustHold(inputs, now);
    } else {
      resetMenuAdjustHold();
    }

    for (const [inputKey, action] of Object.entries(mapping)) {
      if (menuMode && (inputKey === 'dpadLeft' || inputKey === 'dpadRight')) {
        prevPressed[inputKey] = inputs[inputKey];
        continue;
      }
      const pressed = inputs[inputKey];
      if (pressed && !prevPressed[inputKey]) {
        fireAction(action);
      }
      prevPressed[inputKey] = pressed;
    }
  }

  function update() {
    const active = scanConnectedGamepads();
    if (!active) return;
    pollGamepad(active);
  }

  function destroy() {
    window.removeEventListener('gamepadconnected', handleConnect);
    window.removeEventListener('gamepaddisconnected', handleDisconnect);
    window.removeEventListener('pointerdown', wakeGamepadApi);
    window.removeEventListener('keydown', wakeGamepadApi);
  }

  wakeGamepadApi();

  return { update, destroy, ACTIONS };
}

export const GAMEPAD_BUTTON_MAP = [
  { input: 'L shoulder', action: 'Previous shader' },
  { input: 'R shoulder', action: 'Next shader' },
  { input: 'D-pad Left / Right', action: 'Previous / next shader' },
  { input: 'D-pad Up', action: 'Previous preset' },
  { input: 'D-pad Down', action: 'Next preset' },
  { input: 'Start', action: 'Toggle fullscreen' },
  { input: 'Select', action: 'Toolbar → options → hidden (cycle)' },
  { input: 'A', action: 'Random motion (speed, bloom, trails…)' },
  { input: 'B', action: 'Random colors (palette, tints, hues…)' },
  { input: 'X', action: 'Random shapes (segments, morph, zoom…)' },
  { input: 'Y', action: 'Random preset (same shader)' },
];

export const GAMEPAD_MENU_BUTTON_MAP = [
  { input: 'D-pad Up / Down', action: 'Move highlight between settings' },
  { input: 'D-pad Left / Right', action: 'Adjust highlighted setting (hold to slide faster)' },
  { input: 'B', action: 'Random value for highlighted setting' },
  { input: 'Select', action: 'Toolbar → options → hidden (cycle)' },
  { input: 'A / X / Y', action: 'Same random actions as normal mode' },
  { input: 'Start', action: 'Toggle fullscreen' },
];
