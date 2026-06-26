import { SHADERS, GLOBAL_UNIFORMS } from './shaders/index.js';

export function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function randomValue(spec) {
  return Math.round(randomBetween(spec.min, spec.max));
}

const SPOCKS_DRIFT_UI_RANGES = {
  uUp: [44, 56],
  uDown: [44, 56],
  uWidth: [32, 50],
  uHeight: [32, 50],
  uZoom: [40, 60],
  uRotate: [38, 85],
  uMyTime: [36, 62],
  uIterations: [50, 100],
  uLineWidth: [26, 44],
};

const SPIRO_DRIFT_UI_RANGES = {
  uOrbitCount: [3, 8],
  uTwist: [12, 55],
  uPulse: [4, 45],
  uZoom: [48, 78],
};

export function randomizeUniform(key, spec, { allowRebuild = false, shaderId = null } = {}) {
  if (spec.rebuild && !allowRebuild) return null;
  if (spec.kind === 'toggle') {
    return Math.random() > 0.5 ? 1 : 0;
  }
  if (shaderId === 'spocks' && key in SPOCKS_DRIFT_UI_RANGES) {
    const [min, max] = SPOCKS_DRIFT_UI_RANGES[key];
    return Math.round(randomBetween(min, max));
  }
  if (shaderId === 'spiro' && key in SPIRO_DRIFT_UI_RANGES) {
    const [min, max] = SPIRO_DRIFT_UI_RANGES[key];
    return Math.round(randomBetween(min, max));
  }
  return randomValue(spec);
}

export function randomizeSpecs(specs, target = {}, keys = null, { allowRebuild = false } = {}) {
  const result = { ...target };
  const entries = keys
    ? keys.filter((key) => specs[key]).map((key) => [key, specs[key]])
    : Object.entries(specs);

  for (const [key, spec] of entries) {
    const value = randomizeUniform(key, spec, { allowRebuild });
    if (value !== null) result[key] = value;
  }

  return result;
}

export function randomizeGlobal(state = {}) {
  return randomizeSpecs(GLOBAL_UNIFORMS, state);
}

export function randomizeShader(shaderId, state = {}) {
  const shader = SHADERS[shaderId];
  if (!shader) return state;
  return randomizeSpecs(shader.uniforms, state);
}

export function randomizeAll(shaderId, state = {}) {
  return randomizeShader(shaderId, randomizeGlobal(state));
}

export function getSpecsForScope(scope, shaderId) {
  if (scope === 'global') return { ...GLOBAL_UNIFORMS };
  if (scope === 'shader') return { ...(SHADERS[shaderId]?.uniforms ?? {}) };
  return {
    ...GLOBAL_UNIFORMS,
    ...(SHADERS[shaderId]?.uniforms ?? {}),
  };
}
