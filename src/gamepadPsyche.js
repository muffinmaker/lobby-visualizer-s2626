import { GLOBAL_UNIFORMS } from './shaders/index.js';
import { getSpecMap } from './uniformMap.js';

/** Per-shader D-pad tuning: ▲▼ zoom / psychedelic motion, ◀▶ element counts. */
const PSYCHE_PROFILES = {
  spocks: {
    vertical: [
      { key: 'uZoom', label: 'Zoom' },
      { key: 'uColorSpeed', label: 'Color drift', stepScale: 0.45 },
      { key: 'uWobble', label: 'Wobble', stepScale: 0.4 },
      { key: 'uSpeed', label: 'Speed', stepScale: 0.25, global: true },
    ],
    horizontal: { key: 'uGearRatio', label: 'Gear ratio' },
  },
  spiro: {
    vertical: [
      { key: 'uZoom', label: 'Zoom' },
      { key: 'uTwist', label: 'Twist', stepScale: 0.5 },
      { key: 'uPulse', label: 'Pulse', stepScale: 0.45 },
      { key: 'uSpeed', label: 'Speed', stepScale: 0.2, global: true },
    ],
    horizontal: { key: 'uOrbitCount', label: 'Orbits' },
  },
  kaleido: {
    vertical: [
      { key: 'uWarp', label: 'Warp' },
      { key: 'uShapeMorph', label: 'Morph', stepScale: 0.5 },
      { key: 'uScale', label: 'Scale', stepScale: 0.35, global: true },
      { key: 'uSpeed', label: 'Speed', stepScale: 0.2, global: true },
    ],
    horizontal: { key: 'uSegments', label: 'Mirrors' },
  },
  flow: {
    vertical: [
      { key: 'uFieldScale', label: 'Field scale' },
      { key: 'uNoiseScale', label: 'Noise', stepScale: 0.45 },
      { key: 'uSpeed', label: 'Speed', stepScale: 0.3, global: true },
      { key: 'uComplexity', label: 'Complexity', stepScale: 0.25, global: true },
    ],
    horizontal: { key: 'uParticleCount', label: 'Particles' },
  },
  metaballs: {
    vertical: [
      { key: 'uZoom', label: 'Zoom' },
      { key: 'uEdgeGlow', label: 'Glow', stepScale: 0.45 },
      { key: 'uSpeed', label: 'Speed', stepScale: 0.25, global: true },
    ],
    horizontal: { key: 'uBallCount', label: 'Blobs' },
  },
  ribbons: {
    vertical: [
      { key: 'uTwistAmount', label: 'Twist' },
      { key: 'uScale', label: 'Scale', stepScale: 0.35, global: true },
      { key: 'uSpeed', label: 'Speed', stepScale: 0.3, global: true },
    ],
    horizontal: { key: 'uRibbonCount', label: 'Ribbons' },
  },
};

const FALLBACK_VERTICAL = [
  { key: 'uScale', label: 'Scale', global: true },
  { key: 'uSpeed', label: 'Speed', stepScale: 0.35, global: true },
  { key: 'uComplexity', label: 'Complexity', stepScale: 0.3, global: true },
];

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
    return PSYCHE_PROFILES[shaderId] ?? {
      vertical: FALLBACK_VERTICAL,
      horizontal: null,
    };
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
    const profile = getProfile();
    const changes = [];
    let rebuild = false;

    for (const entry of profile.vertical) {
      const result = nudgeEntry(entry, delta);
      if (!result) continue;
      changes.push(result);
      const spec = getSpec(settings, entry.key, entry.global);
      if (spec?.rebuild) rebuild = true;
    }

    if (!applyChanges(changes, rebuild)) return null;

    const lead = changes[0];
    const extra = changes.length > 1 ? ` +${changes.length - 1}` : '';
    onToast?.(`${lead.label} ${lead.value}${extra}`);
    return changes;
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
