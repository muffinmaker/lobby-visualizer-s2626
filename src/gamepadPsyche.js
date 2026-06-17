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

function getSpec(settings, key, global) {
  if (global || GLOBAL_UNIFORMS[key]) return GLOBAL_UNIFORMS[key];
  return settings.getSpecForKey(key) ?? getSpecMap(settings.state.shader)[key];
}

function clampValue(value, spec) {
  const min = spec.min ?? 0;
  const max = spec.max ?? 100;
  let next = Math.round(value);
  if (spec.step && spec.step > 0 && spec.step < 1) {
    next = Math.round(value / spec.step) * spec.step;
    next = parseFloat(next.toPrecision(12));
  }
  return Math.max(min, Math.min(max, next));
}

export function createGamepadPsyche({ settings, onToast }) {
  function getProfile(shaderId = settings.state.shader) {
    return PSYCHE_PROFILES[shaderId] ?? { horizontal: null };
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
    const controller = entry.global
      ? settings.gui.controllersRecursive().find((c) => c.property === entry.key)
      : settings.uniformControllers.get(entry.key);
    controller?.setValue(next);

    return { key: entry.key, label: entry.label, value: next };
  }

  function applyChanges(changes, rebuild) {
    if (!changes.length) return false;
    settings.handleValueChange(rebuild);
    return true;
  }

  function adjustVertical(delta) {
    const entry = getZoomEntry(settings.state.shader);
    const result = nudgeEntry(entry, delta);
    if (!result) return null;

    const spec = getSpec(settings, entry.key, entry.global);
    applyChanges([result], Boolean(spec?.rebuild));
    onToast?.(`${result.label} ${result.value}`);
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

  return {
    adjustVertical,
    adjustHorizontal,
    getProfile,
  };
}
