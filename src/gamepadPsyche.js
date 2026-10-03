import { GLOBAL_UNIFORMS } from './shaders/index.js';
import { getSpecMap } from './uniformMap.js';

/** Per-shader D-pad: ▲▼ zoom, ◀▶ element counts. */
const PSYCHE_PROFILES = {
  spocks: {
    horizontal: { key: 'uRotate', label: 'Rotate' },
  },
  spiro: {
    horizontal: { key: 'uOrbitCount', label: 'Orbits' },
  },
  kaleido: {
    horizontal: { key: 'uSegments', label: 'Mirrors' },
  },
  flow: {
    horizontal: { key: 'uParticleCount', label: 'Particles' },
  },
  metaballs: {
    horizontal: { key: 'uBallCount', label: 'Blobs' },
  },
  wormhole: {
    horizontal: { key: 'uChevrons', label: 'Ribs' },
  },
  ribbons: {
    horizontal: { key: 'uRibbonCount', label: 'Ribbons' },
  },
};

function getZoomEntry(shaderId) {
  const specs = getSpecMap(shaderId);
  if (specs.uZoom) {
    return { key: 'uZoom', label: 'Zoom' };
  }
  return { key: 'uScale', label: 'Zoom', global: true };
}

function getSlideHorizontalEntry(shaderId) {
  const specs = getSpecMap(shaderId);
  if (specs.uRotate) {
    return { key: 'uRotate', label: 'Rotate' };
  }
  return { key: 'uSpeed', label: 'Speed', global: true };
}

function getSlideVerticalEntry() {
  return { key: 'uSpeed', label: 'Speed', global: true };
}

function getSpec(settings, key, global) {
  if (global || GLOBAL_UNIFORMS[key]) return GLOBAL_UNIFORMS[key];
  return settings.getSpecForKey(key) ?? getSpecMap(settings.state.shader)[key];
}

function clampValue(value, spec) {
  const min = spec.min ?? 0;
  const max = spec.max ?? 100;
  let next = value;
  if (spec.step && spec.step >= 1) {
    next = Math.round(value);
  } else if (spec.step && spec.step > 0 && spec.step < 1) {
    next = Math.round(value / spec.step) * spec.step;
    next = parseFloat(next.toPrecision(12));
  } else {
    next = Math.round(value);
  }
  return Math.max(min, Math.min(max, next));
}

export function createGamepadPsyche({ settings, onToast }) {
  const dragCarryX = { value: 0 };
  const dragCarryY = { value: 0 };
  const panCarryX = { value: 0 };
  const panCarryY = { value: 0 };
  let lastGestureLabel = '';

  function getProfile(shaderId = settings.state.shader) {
    return PSYCHE_PROFILES[shaderId] ?? { horizontal: null };
  }

  function setControllerValue(entry, next) {
    const controller = entry.global
      ? settings.gui.controllersRecursive().find((c) => c.property === entry.key)
      : settings.uniformControllers.get(entry.key);
    controller?.setValue(next);
  }

  function nudgeEntry(entry, delta) {
    const spec = getSpec(settings, entry.key, entry.global);
    if (!spec) return null;

    const stepScale = entry.stepScale ?? 1;
    const step = (spec.step ?? 1) * stepScale;
    const current = settings.state[entry.key] ?? spec.value;
    const next = clampValue(current + delta * step, spec);
    if (next === current) return null;

    settings.state[entry.key] = next;
    setControllerValue(entry, next);
    return { key: entry.key, label: entry.label, value: next };
  }

  function applyChanges(changes, rebuild) {
    if (!changes.length) return false;
    settings.handleValueChange(rebuild);
    return true;
  }

  function adjustVertical(delta, { silent = false } = {}) {
    const entry = getZoomEntry(settings.state.shader);
    const result = nudgeEntry(entry, delta);
    if (!result) return null;

    const spec = getSpec(settings, entry.key, entry.global);
    applyChanges([result], Boolean(spec?.rebuild));
    if (!silent) onToast?.(`${result.label} ${result.value}`);
    return [result];
  }

  function adjustHorizontal(delta) {
    const profile = getProfile();
    const entry = profile.horizontal;
    if (!entry) {
      onToast?.('No element control for this shader');
      return null;
    }

    const result = nudgeEntry(entry, delta);
    if (!result) return null;

    const spec = getSpec(settings, entry.key, entry.global);
    applyChanges([result], Boolean(spec?.rebuild));
    onToast?.(`${result.label} ${result.value}`);
    return [result];
  }

  function consumeAxis(carry, amount, pixelsPerStep) {
    carry.value += amount / pixelsPerStep;
    const steps = Math.trunc(carry.value);
    carry.value -= steps;
    return steps;
  }

  function adjustSlideDrag(dx, dy) {
    const horizontal = getSlideHorizontalEntry(settings.state.shader);
    const vertical = getSlideVerticalEntry();
    const changes = [];
    let rebuild = false;

    const xSteps = consumeAxis(dragCarryX, dx, horizontal.key === 'uRotate' ? 10 : 14);
    const ySteps = consumeAxis(dragCarryY, -dy, 16);

    if (xSteps) {
      const result = nudgeEntry(horizontal, xSteps);
      if (result) {
        changes.push(result);
        rebuild = rebuild || Boolean(getSpec(settings, horizontal.key, horizontal.global)?.rebuild);
        lastGestureLabel = `${result.label} ${result.value}`;
      }
    }

    if (ySteps && vertical.key !== horizontal.key) {
      const result = nudgeEntry(vertical, ySteps);
      if (result) {
        changes.push(result);
        rebuild = rebuild || Boolean(getSpec(settings, vertical.key, vertical.global)?.rebuild);
        lastGestureLabel = `${result.label} ${result.value}`;
      }
    } else if (ySteps && vertical.key === horizontal.key && !xSteps) {
      const result = nudgeEntry(vertical, ySteps);
      if (result) {
        changes.push(result);
        lastGestureLabel = `${result.label} ${result.value}`;
      }
    }

    applyChanges(changes, rebuild);
    return changes;
  }

  function adjustPan(dx, dy) {
    const xEntry = { key: 'uPanX', label: 'Look X', global: true };
    const yEntry = { key: 'uPanY', label: 'Look Y', global: true };
    const changes = [];

    const xSteps = consumeAxis(panCarryX, dx, 12);
    const ySteps = consumeAxis(panCarryY, -dy, 12);

    if (xSteps) {
      const result = nudgeEntry(xEntry, xSteps);
      if (result) changes.push(result);
    }
    if (ySteps) {
      const result = nudgeEntry(yEntry, ySteps);
      if (result) changes.push(result);
    }
    if (changes.length) {
      lastGestureLabel = `Look ${settings.state.uPanX},${settings.state.uPanY}`;
    }

    applyChanges(changes, false);
    return changes;
  }

  function resetGestureCarry() {
    dragCarryX.value = 0;
    dragCarryY.value = 0;
    panCarryX.value = 0;
    panCarryY.value = 0;
  }

  function toastLastGesture() {
    if (lastGestureLabel) onToast?.(lastGestureLabel);
    lastGestureLabel = '';
  }

  return {
    adjustVertical,
    adjustHorizontal,
    adjustSlideDrag,
    adjustPan,
    resetGestureCarry,
    toastLastGesture,
    getProfile,
  };
}
