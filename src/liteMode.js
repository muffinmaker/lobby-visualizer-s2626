import { getSpecMap } from './uniformMap.js';

export const LITE_MODE_KEY = 'lobby-visualizer-lite-mode';

export const LITE_LIMITS = {
  resolutionScale: 50,
  pixelRatioCap: 1,
  flowParticleCap: 6000,
  flowParticleUiMax: 22,
  penCountMax: 4,
  orbitCountMax: 4,
  bloomMax: 45,
  pointSizeMax: 52,
  complexityMax: 40,
};

export function loadLiteMode() {
  try {
    return localStorage.getItem(LITE_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveLiteMode(enabled) {
  try {
    localStorage.setItem(LITE_MODE_KEY, String(Boolean(enabled)));
  } catch {
    /* ignore */
  }
}

const clamp = (value, max, min = 0) => Math.max(min, Math.min(max, Math.round(value)));

/** Clamp UI values for stable framerate on weak / multi-screen GPUs. */
export function applyLiteLimits(shaderId, values) {
  const next = { ...values };
  next.resolutionScale = clamp(next.resolutionScale ?? 100, LITE_LIMITS.resolutionScale, 25);
  next.motionTrails = 0;
  next.trailsNeverDecay = false;

  if (next.uIterations !== undefined) {
    next.uIterations = clamp(next.uIterations, 45, 20);
  }
  if (next.uOrbitCount !== undefined) {
    next.uOrbitCount = clamp(next.uOrbitCount, LITE_LIMITS.orbitCountMax, 2);
  }
  if (next.uParticleCount !== undefined) {
    next.uParticleCount = clamp(next.uParticleCount, LITE_LIMITS.flowParticleUiMax, 5);
  }
  if (next.uBloom !== undefined) {
    next.uBloom = clamp(next.uBloom, LITE_LIMITS.bloomMax);
  }
  if (next.uPointSize !== undefined) {
    next.uPointSize = clamp(next.uPointSize, LITE_LIMITS.pointSizeMax);
  }
  if (next.uComplexity !== undefined && shaderId !== 'spiro') {
    next.uComplexity = clamp(next.uComplexity, LITE_LIMITS.complexityMax);
  }
  if (next.uBrightness !== undefined) {
    next.uBrightness = clamp(next.uBrightness, 58);
  }

  const specs = getSpecMap(shaderId);
  for (const key of ['uSegments', 'uRingCount', 'uBallCount', 'uRibbonCount', 'uChevrons', 'uLayerCount']) {
    if (next[key] === undefined || !specs[key]) continue;
    const max = Math.min(specs[key].max, specs[key].max <= 6 ? specs[key].max : 6);
    next[key] = clamp(next[key], max, specs[key].min ?? 2);
  }

  return next;
}

/** Short, mode-aware note about what is costing the GPU right now. */
export function describeModeLoad(shaderId, state = {}) {
  const bits = [];
  if (shaderId === 'spiro') bits.push(`${state.uOrbitCount ?? 0} orbits`);
  if (shaderId === 'flow') bits.push(`particle level ${state.uParticleCount ?? 0}`);
  if (shaderId === 'kaleido') bits.push(`${state.uRingCount ?? 0} rings`);
  if (shaderId === 'spocks') bits.push(`${state.uIterations ?? 0} layers`);
  if (shaderId === 'metaballs') bits.push(`${state.uBallCount ?? 0} blobs`);
  if (shaderId === 'wormhole') bits.push(`${state.uChevrons ?? 0} ribs`);
  if (shaderId === 'ribbons') bits.push(`${state.uRibbonCount ?? 0} ribbons · shared controls ×10`);
  if (shaderId === 'layers') bits.push(`${state.uLayerCount ?? 0} stacked patterns`);
  if ((state.motionTrails ?? 0) > 0 && !state.liteMode) bits.push('motion trails');
  if ((state.uBloom ?? 0) > 55) bits.push('high bloom');
  bits.push(`${Math.round(state.resolutionScale ?? 100)}% resolution`);
  if (state.liteMode) bits.push('lite caps');
  return bits.join(' · ');
}

export function snapshotLiteRestoreFields(values) {
  return {
    resolutionScale: values.resolutionScale,
    motionTrails: values.motionTrails,
    trailsNeverDecay: values.trailsNeverDecay,
  };
}
