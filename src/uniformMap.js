import { SHADERS, GLOBAL_UNIFORMS } from './shaders/index.js';
import { SHADER_UNIFORM_TEMPLATES, SPIRO_COMPLEXITY } from './uniformSpecs.js';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function uiToT(ui, spec) {
  let t = (ui - spec.min) / (spec.max - spec.min || 1);
  t = clamp(t, 0, 1);
  if (spec.invert) t = 1 - t;
  return t;
}

function tToUi(t, spec) {
  t = clamp(t, 0, 1);
  if (spec.invert) t = 1 - t;
  return Math.round(spec.min + t * (spec.max - spec.min));
}

export function uiToShader(ui, spec) {
  if (spec.kind === 'rgb') return ui / 255;
  if (spec.kind === 'toggle') return ui > 0 ? 1 : 0;
  if (spec.kind === 'count' || spec.kind === 'palette' || spec.kind === 'shape' || spec.kind === 'trailShape' || spec.kind === 'stampShape' || spec.kind === 'pointShape' || spec.kind === 'symmetry' || spec.kind === 'spacingMode') {
    return Math.round(Number(ui));
  }
  if (spec.kind === 'speed') {
    const t = uiToT(ui, spec);
    const eased = Math.pow(t, 1.75);
    return (spec.shaderMin ?? 0) + eased * ((spec.shaderMax ?? 1) - (spec.shaderMin ?? 0));
  }
  if (spec.kind === 'zoom') {
    const t = uiToT(ui, spec);
    const exp = spec.shaderMin + t * (spec.shaderMax - spec.shaderMin);
    return Math.pow(2, exp);
  }
  if (spec.kind === 'particles') {
    const t = (ui - spec.min) / (spec.max - spec.min || 1);
    const raw = spec.shaderMin + clamp(t, 0, 1) * (spec.shaderMax - spec.shaderMin);
    return Math.round(raw / 1000) * 1000;
  }

  const t = uiToT(ui, spec);
  if (spec.shaderMin !== undefined && spec.shaderMax !== undefined) {
    return spec.shaderMin + t * (spec.shaderMax - spec.shaderMin);
  }

  return ui / 100;
}

export function shaderToUi(shader, spec) {
  if (spec.kind === 'rgb') return Math.round(clamp(shader, 0, 1) * 255);
  if (spec.kind === 'toggle') return shader > 0.5 ? 1 : 0;
  if (spec.kind === 'count' || spec.kind === 'palette' || spec.kind === 'shape' || spec.kind === 'trailShape' || spec.kind === 'stampShape' || spec.kind === 'pointShape' || spec.kind === 'symmetry' || spec.kind === 'spacingMode') {
    return Math.round(clamp(shader, spec.min, spec.max));
  }
  if (spec.kind === 'particles') {
    const t = (shader - spec.shaderMin) / (spec.shaderMax - spec.shaderMin || 1);
    return Math.round(spec.min + clamp(t, 0, 1) * (spec.max - spec.min));
  }
  if (spec.kind === 'speed') {
    const span = (spec.shaderMax ?? 1) - (spec.shaderMin ?? 0) || 1;
    const eased = Math.max(0, (shader - (spec.shaderMin ?? 0)) / span);
    const t = Math.pow(eased, 1 / 1.75);
    return tToUi(t, spec);
  }
  if (spec.kind === 'zoom') {
    const exp = Math.log2(Math.max(shader, 1e-6));
    const t = (exp - spec.shaderMin) / (spec.shaderMax - spec.shaderMin || 1);
    return tToUi(t, spec);
  }

  if (spec.shaderMin !== undefined && spec.shaderMax !== undefined) {
    const t = (shader - spec.shaderMin) / (spec.shaderMax - spec.shaderMin || 1);
    return tToUi(t, spec);
  }

  return Math.round(clamp(shader, 0, 1) * 100);
}

export function getSpecMap(shaderId) {
  const specs = {
    ...GLOBAL_UNIFORMS,
    ...(SHADERS[shaderId]?.uniforms ?? SHADER_UNIFORM_TEMPLATES[shaderId] ?? {}),
  };
  if (shaderId === 'spiro') specs.uComplexity = SPIRO_COMPLEXITY;
  return specs;
}

export function mergeShaderDefaults(state, shaderId) {
  const specs = getSpecMap(shaderId);
  for (const [key, spec] of Object.entries(specs)) {
    if (state[key] === undefined) {
      state[key] = spec.value;
    }
  }
  return state;
}

const RIBBON_GLOBAL_KEYS = new Set([
  'uSpeed',
  'uScale',
  'uZoom',
  'uPanX',
  'uPanY',
  'uComplexity',
  'uBrightness',
  'uSaturation',
  'uBloom',
]);

export function toShaderValues(uiValues, shaderId) {
  const specs = getSpecMap(shaderId);
  const out = {};

  for (const [key, spec] of Object.entries(specs)) {
    const ui = key in uiValues ? uiValues[key] : spec.value;
    let value = uiToShader(ui, spec);
    if (shaderId === 'ribbons' && RIBBON_GLOBAL_KEYS.has(key)) value *= 10;
    out[key] = value;
  }

  return out;
}

export function roundUiValue(value, spec) {
  if (spec.step >= 1) return Math.round(value);
  return Math.round(value);
}

export function normalizeUiValues(values, shaderId) {
  const specs = getSpecMap(shaderId);
  const out = { ...values };

  for (const [key, spec] of Object.entries(specs)) {
    if (key in out) {
      out[key] = roundUiValue(clamp(out[key], spec.min, spec.max), spec);
    }
  }

  return out;
}
