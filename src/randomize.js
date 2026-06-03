import { SHADERS, GLOBAL_UNIFORMS } from './shaders/index.js';

export function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function randomValue(spec) {
  return Math.round(randomBetween(spec.min, spec.max));
}

export function randomizeUniform(key, spec) {
  if (spec.rebuild) return null;
  if (spec.kind === 'toggle') {
    return Math.random() > 0.5 ? 1 : 0;
  }
  return randomValue(spec);
}

export function randomizeSpecs(specs, target = {}, keys = null) {
  const result = { ...target };
  const entries = keys
    ? keys.filter((key) => specs[key]).map((key) => [key, specs[key]])
    : Object.entries(specs);

  for (const [key, spec] of entries) {
    const value = randomizeUniform(key, spec);
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
