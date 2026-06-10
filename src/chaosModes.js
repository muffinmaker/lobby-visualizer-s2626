import { getSpecMap } from './uniformMap.js';

/** Face-button chaos modes — each button randomizes one slice (party = motion + color + structure). */
export const CHAOS_MODES = {
  motion: { id: 'motion', label: 'Random motion' },
  color: { id: 'color', label: 'Random colors' },
  structure: { id: 'structure', label: 'Random shapes' },
  party: { id: 'party', label: 'Party burst' },
  preset: { id: 'preset', label: 'Random preset' },
};

const PARTY_MODES = ['motion', 'color', 'structure'];

function isColorKey(key, spec) {
  if (spec.kind === 'palette') return true;
  if (spec.kind === 'rgb') return true;
  if (key === 'uHueShift' || key === 'uColorSpread' || key === 'uSaturation') return true;
  return false;
}

function isStructureKey(key, spec) {
  if (spec.kind === 'shape') return true;
  if (
    key === 'uZoom' ||
    key === 'uSegments' ||
    key === 'uShapeMorph' ||
    key === 'uPenShape' ||
    key === 'uShapeVariety' ||
    key === 'uGearRatio' ||
    key === 'uPenDistance' ||
    key === 'uParticleCount'
  ) {
    return true;
  }
  if (/^uCenter/.test(key)) return true;
  if (/^uShape/.test(key)) return true;
  if (spec.kind === 'count' && /Segment|Shape|Ring|Ball|Ribbon|Orbit|Mirror|Pen/i.test(key)) {
    return true;
  }
  return false;
}

const MOTION_GLOBAL_KEYS = new Set(['uSpeed', 'uScale', 'uComplexity', 'uBrightness', 'uBloom']);

function isMotionKey(key, spec) {
  if (spec.rebuild) return false;
  if (isColorKey(key, spec) || isStructureKey(key, spec)) return false;
  if (key === 'uWarp' || key === 'uTwistAmount' || key === 'uThickness') return true;
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
  if (modeId === 'party') {
    const keys = new Set();
    for (const sub of PARTY_MODES) {
      for (const key of getKeysForChaosMode(sub, shaderId)) {
        keys.add(key);
      }
    }
    return [...keys];
  }

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
