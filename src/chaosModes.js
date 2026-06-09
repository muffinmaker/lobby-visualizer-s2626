import { getSpecMap } from './uniformMap.js';

/** Four face-button chaos modes — each only touches one category so repeats feel consistent. */
export const CHAOS_MODES = {
  motion: { id: 'motion', label: 'Random motion' },
  color: { id: 'color', label: 'Random colors' },
  structure: { id: 'structure', label: 'Random shapes' },
  preset: { id: 'preset', label: 'Random preset' },
};

function isColorKey(key, spec) {
  if (spec.kind === 'palette') return true;
  if (spec.kind === 'rgb') return true;
  if (key === 'uHueShift' || key === 'uColorSpread' || key === 'uSaturation') return true;
  return false;
}

function isStructureKey(key, spec) {
  if (spec.kind === 'shape') return true;
  if (key === 'uZoom' || key === 'uSegments' || key === 'uShapeMorph') return true;
  if (/^uCenter/.test(key)) return true;
  if (/^uShape/.test(key)) return true;
  if (spec.kind === 'count' && /Segment|Shape|Ring|Ball|Ribbon|Orbit|Mirror/i.test(key)) {
    return true;
  }
  return false;
}

const MOTION_GLOBAL_KEYS = new Set(['uSpeed', 'uScale', 'uComplexity', 'uBrightness', 'uBloom']);

function isMotionKey(key, spec) {
  if (spec.rebuild) return false;
  if (isColorKey(key, spec) || isStructureKey(key, spec)) return false;
  if (MOTION_GLOBAL_KEYS.has(key)) return true;
  if (/Speed|Scale|Bright|Bloom|Complex|Trail|Point|Pulse|Twist|Rotate|Time|Field|Noise|Width|Height|Decay|Alpha|Softness|Glow|Thickness|Iteration|Orbit|Ribbon|Ball|Particle|Rand/i.test(key)) {
    return true;
  }
  return false;
}

const MODE_MATCHERS = {
  motion: isMotionKey,
  color: isColorKey,
  structure: isStructureKey,
};

export function getKeysForChaosMode(modeId, shaderId) {
  if (modeId === 'preset') return [];
  const matcher = MODE_MATCHERS[modeId];
  if (!matcher) return [];

  const specs = getSpecMap(shaderId);
  const keys = Object.entries(specs)
    .filter(([key, spec]) => matcher(key, spec))
    .map(([key]) => key);

  if (modeId === 'motion') {
    keys.push('motionTrails');
  }

  return keys;
}
