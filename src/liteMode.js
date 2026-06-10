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

  if (next.uPenCount !== undefined) {
    next.uPenCount = clamp(next.uPenCount, LITE_LIMITS.penCountMax, 2);
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
  if (next.uComplexity !== undefined) {
    next.uComplexity = clamp(next.uComplexity, LITE_LIMITS.complexityMax);
  }
  if (next.uBrightness !== undefined) {
    next.uBrightness = clamp(next.uBrightness, 58);
  }

  const specs = getSpecMap(shaderId);
  for (const key of ['uSegments', 'uRingCount', 'uBallCount', 'uRibbonCount']) {
    if (next[key] === undefined || !specs[key]) continue;
    const max = Math.min(specs[key].max, specs[key].max <= 6 ? specs[key].max : 6);
    next[key] = clamp(next[key], max, specs[key].min ?? 2);
  }

  return next;
}

export function snapshotLiteRestoreFields(values) {
  return {
    resolutionScale: values.resolutionScale,
    motionTrails: values.motionTrails,
    trailsNeverDecay: values.trailsNeverDecay,
  };
}
