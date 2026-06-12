import { randomizeSpecs, getSpecsForScope, randomBetween } from './randomize.js';
import { getKeysForChaosMode } from './chaosModes.js';
import { getSpecMap } from './uniformMap.js';
import { BACKGROUND_UNIFORMS } from './uniformSpecs.js';
import { SHADERS, SHADER_IDS, GLOBAL_UNIFORMS } from './shaders/index.js';
import { takePresetName } from './presetNames.js';
import { loadSavedPresets, writeSavedPresets, toStoredPreset } from './SavedPresetStore.js';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const SMOOTH_TRANSITIONS_KEY = 'lobby-smooth-transitions';

function loadSmoothTransitionsPreference() {
  try {
    const stored = localStorage.getItem(SMOOTH_TRANSITIONS_KEY);
    if (stored !== null) return stored === 'true';
  } catch {
    /* ignore */
  }
  return true;
}

function saveSmoothTransitionsPreference(enabled) {
  try {
    localStorage.setItem(SMOOTH_TRANSITIONS_KEY, String(enabled));
  } catch {
    /* ignore */
  }
}

function isDiscreteUniform(spec) {
  return (
    spec?.kind === 'palette' ||
    spec?.kind === 'shape' ||
    spec?.kind === 'count' ||
    spec?.kind === 'toggle'
  );
}

function pickRandom(arr, exclude) {
  let choices = exclude ? arr.filter((x) => x !== exclude) : arr;
  if (!choices.length) choices = arr;
  return choices[Math.floor(Math.random() * choices.length)];
}

function randomizeUniforms(shaderId, target = {}) {
  const result = randomizeSpecs(GLOBAL_UNIFORMS, target);
  const shader = SHADERS[shaderId];
  if (shader) randomizeSpecs(shader.uniforms, result);
  result.uSpeed = clamp(Math.round(result.uSpeed * 0.7), GLOBAL_UNIFORMS.uSpeed.min, 35);
  result.uBrightness = clamp(result.uBrightness, 25, 80);
  return result;
}

export const PRESETS = [
  {
    name: 'Prism Gears',
    shader: 'spocks',
    values: {
      uSpeed: 8,
      uScale: 48,
      uComplexity: 42,
      uBrightness: 55,
      uSaturation: 78,
      uBloom: 48,
      uPointSize: 54,
      uTrailDecay: 92,
      uPenCount: 5,
      uGearRatio: 44,
      uPenDistance: 58,
      uWobble: 14,
      uZoom: 74,
      uPalette: 1,
      uHueShift: 48,
      uColorSpeed: 36,
      uColorSpread: 74,
      uTintRed: 120,
      uTintGreen: 180,
      uTintBlue: 255,
      uPenShape: 3,
      uShapeVariety: 25,
    },
  },
  {
    name: 'Neon Roseate',
    shader: 'spocks',
    values: {
      uSpeed: 7,
      uScale: 46,
      uComplexity: 38,
      uBrightness: 58,
      uSaturation: 82,
      uBloom: 52,
      uPointSize: 52,
      uTrailDecay: 94,
      uPenCount: 6,
      uGearRatio: 38,
      uPenDistance: 62,
      uWobble: 22,
      uZoom: 70,
      uPalette: 2,
      uHueShift: 62,
      uColorSpeed: 42,
      uColorSpread: 82,
      uTintRed: 255,
      uTintGreen: 120,
      uTintBlue: 210,
      uPenShape: 5,
      uShapeVariety: 50,
    },
  },
  {
    name: 'Calm Orbits',
    shader: 'spiro',
    values: {
      uSpeed: 11,
      uScale: 50,
      uComplexity: 36,
      uBrightness: 58,
      uSaturation: 72,
      uBloom: 32,
      uPointSize: 58,
      uTrailDecay: 90,
      uOrbitCount: 6,
      uTwist: 26,
      uPulse: 10,
      uZoom: 64,
      uPalette: 2,
      uHueShift: 42,
      uColorSpread: 48,
      uTintRed: 160,
      uTintGreen: 200,
      uTintBlue: 255,
    },
  },
  {
    name: 'Neon Kaleido',
    shader: 'kaleido',
    values: {
      uSpeed: 7,
      uScale: 48,
      uComplexity: 56,
      uBrightness: 65,
      uSaturation: 87,
      uBloom: 55,
      uSegments: 10,
      uRingCount: 7,
      uWarp: 40,
      uLineWidth: 33,
      uCenterShape: 5,
      uCenterSize: 48,
      uCenterStrength: 70,
      uShapeCount: 3,
      uShape2: 3,
      uShape3: 4,
      uShape4: 2,
      uShapeMorph: 28,
    },
  },
  {
    name: 'Deep Flow',
    shader: 'flow',
    values: {
      uSpeed: 6,
      uScale: 45,
      uComplexity: 64,
      uBrightness: 45,
      uSaturation: 73,
      uBloom: 50,
      uParticleCount: 35,
      uFieldScale: 40,
      uNoiseScale: 32,
      uTrailAlpha: 24,
      uPointSize: 28,
    },
  },
  {
    name: 'Liquid Merge',
    shader: 'metaballs',
    values: {
      uSpeed: 5,
      uScale: 47,
      uComplexity: 48,
      uBrightness: 55,
      uSaturation: 77,
      uBloom: 60,
      uBallCount: 8,
      uSoftness: 35,
      uEdgeGlow: 40,
      uZoom: 40,
    },
  },
  {
    name: 'Silk Ribbons',
    shader: 'ribbons',
    values: {
      uSpeed: 6,
      uScale: 47,
      uComplexity: 52,
      uBrightness: 58,
      uSaturation: 80,
      uBloom: 50,
      uRibbonCount: 6,
      uThickness: 30,
      uTwistAmount: 45,
    },
  },
  {
    name: 'Hyperspin',
    shader: 'spiro',
    values: {
      uSpeed: 16,
      uScale: 46,
      uComplexity: 68,
      uBrightness: 62,
      uSaturation: 83,
      uBloom: 48,
      uPointSize: 62,
      uTrailDecay: 88,
      uOrbitCount: 8,
      uTwist: 58,
      uPulse: 24,
      uZoom: 58,
      uPalette: 3,
      uHueShift: 72,
      uColorSpread: 85,
      uTintRed: 255,
      uTintGreen: 120,
      uTintBlue: 220,
    },
  },
  {
    name: 'Jade Lattice',
    shader: 'spocks',
    values: {
      uSpeed: 9,
      uScale: 44,
      uComplexity: 36,
      uBrightness: 54,
      uSaturation: 72,
      uBloom: 38,
      uPointSize: 50,
      uTrailDecay: 90,
      uPenCount: 7,
      uGearRatio: 52,
      uPenDistance: 52,
      uWobble: 10,
      uZoom: 72,
      uPalette: 5,
      uHueShift: 38,
      uColorSpeed: 28,
      uColorSpread: 68,
      uTintRed: 80,
      uTintGreen: 220,
      uTintBlue: 180,
      uPenShape: 4,
      uShapeVariety: 35,
    },
  },
  {
    name: 'Candy Spindle',
    shader: 'spocks',
    values: {
      uSpeed: 6,
      uScale: 50,
      uComplexity: 46,
      uBrightness: 60,
      uSaturation: 85,
      uBloom: 50,
      uPointSize: 56,
      uTrailDecay: 93,
      uPenCount: 6,
      uGearRatio: 36,
      uPenDistance: 66,
      uWobble: 26,
      uZoom: 68,
      uPalette: 4,
      uHueShift: 72,
      uColorSpeed: 48,
      uColorSpread: 88,
      uTintRed: 255,
      uTintGreen: 160,
      uTintBlue: 220,
      uPenShape: 2,
      uShapeVariety: 55,
    },
  },
  {
    name: 'Electric Orbit',
    shader: 'spocks',
    values: {
      uSpeed: 14,
      uScale: 42,
      uComplexity: 54,
      uBrightness: 62,
      uSaturation: 78,
      uBloom: 55,
      uPointSize: 48,
      uTrailDecay: 88,
      uPenCount: 8,
      uGearRatio: 48,
      uPenDistance: 54,
      uWobble: 18,
      uZoom: 64,
      uPalette: 3,
      uHueShift: 55,
      uColorSpeed: 52,
      uColorSpread: 80,
      uTintRed: 140,
      uTintGreen: 200,
      uTintBlue: 255,
      uPenShape: 1,
      uShapeVariety: 60,
    },
  },
  {
    name: 'Cobalt Lace',
    shader: 'spocks',
    values: {
      uSpeed: 5,
      uScale: 43,
      uComplexity: 34,
      uBrightness: 56,
      uSaturation: 68,
      uBloom: 32,
      uPointSize: 46,
      uTrailDecay: 86,
      uPenCount: 9,
      uGearRatio: 62,
      uPenDistance: 48,
      uWobble: 8,
      uZoom: 76,
      uPalette: 0,
      uHueShift: 42,
      uColorSpeed: 22,
      uColorSpread: 62,
      uTintRed: 90,
      uTintGreen: 150,
      uTintBlue: 255,
      uPenShape: 6,
      uShapeVariety: 20,
    },
  },
  {
    name: 'Ember Bloom',
    shader: 'spocks',
    values: {
      uSpeed: 5,
      uScale: 50,
      uComplexity: 40,
      uBrightness: 64,
      uSaturation: 80,
      uBloom: 68,
      uPointSize: 58,
      uTrailDecay: 96,
      uPenCount: 5,
      uGearRatio: 40,
      uPenDistance: 64,
      uWobble: 20,
      uZoom: 70,
      uPalette: 4,
      uHueShift: 28,
      uColorSpeed: 34,
      uColorSpread: 76,
      uTintRed: 255,
      uTintGreen: 150,
      uTintBlue: 60,
      uPenShape: 5,
      uShapeVariety: 70,
    },
  },
  {
    name: 'Vortex Prism',
    shader: 'spocks',
    values: {
      uSpeed: 18,
      uScale: 40,
      uComplexity: 56,
      uBrightness: 60,
      uSaturation: 74,
      uBloom: 46,
      uPointSize: 50,
      uTrailDecay: 84,
      uPenCount: 7,
      uGearRatio: 34,
      uPenDistance: 70,
      uWobble: 32,
      uZoom: 62,
      uPalette: 6,
      uHueShift: 68,
      uColorSpeed: 58,
      uColorSpread: 90,
      uTintRed: 200,
      uTintGreen: 180,
      uTintBlue: 255,
      uPenShape: 7,
      uShapeVariety: 45,
    },
  },
  {
    name: 'Syrax Bloom',
    shader: 'spocks',
    values: {
      uSpeed: 6,
      uScale: 52,
      uComplexity: 46,
      uBrightness: 56,
      uSaturation: 90,
      uBloom: 58,
      uPointSize: 55,
      uTrailDecay: 97,
      uPenCount: 6,
      uGearRatio: 42,
      uPenDistance: 60,
      uWobble: 24,
      uZoom: 72,
      uPalette: 2,
      uHueShift: 78,
      uColorSpeed: 44,
      uColorSpread: 92,
      uTintRed: 220,
      uTintGreen: 130,
      uTintBlue: 255,
      uPenShape: 1,
      uShapeVariety: 80,
    },
  },
  {
    name: 'Deep Ink',
    shader: 'spocks',
    values: {
      uSpeed: 4,
      uScale: 46,
      uComplexity: 28,
      uBrightness: 54,
      uSaturation: 48,
      uBloom: 34,
      uPointSize: 48,
      uTrailDecay: 88,
      uPenCount: 4,
      uGearRatio: 58,
      uPenDistance: 46,
      uWobble: 6,
      uZoom: 78,
      uPalette: 7,
      uHueShift: 32,
      uColorSpeed: 18,
      uColorSpread: 55,
      uTintRed: 40,
      uTintGreen: 120,
      uTintBlue: 160,
      uPenShape: 3,
      uShapeVariety: 15,
    },
  },
  {
    name: 'Lobby Safe',
    shader: 'spocks',
    display: {
      resolutionScale: 75,
    },
    values: {
      uSpeed: 5,
      uScale: 48,
      uComplexity: 26,
      uBrightness: 50,
      uSaturation: 58,
      uBloom: 24,
      uPointSize: 44,
      uTrailDecay: 86,
      uPenCount: 3,
      uGearRatio: 46,
      uPenDistance: 52,
      uWobble: 6,
      uZoom: 76,
      uPalette: 1,
      uHueShift: 45,
      uColorSpeed: 20,
      uColorSpread: 60,
      uTintRed: 100,
      uTintGreen: 180,
      uTintBlue: 220,
      uPenShape: 4,
      uShapeVariety: 30,
    },
  },
  {
    name: 'Rigel Trails',
    shader: 'spiro',
    values: {
      uSpeed: 8,
      uScale: 52,
      uComplexity: 32,
      uBrightness: 54,
      uSaturation: 68,
      uBloom: 38,
      uPointSize: 54,
      uTrailDecay: 95,
      uOrbitCount: 5,
      uTwist: 18,
      uPulse: 8,
      uZoom: 68,
      uPalette: 1,
      uHueShift: 28,
      uColorSpread: 55,
      uTintRed: 140,
      uTintGreen: 180,
      uTintBlue: 240,
    },
  },
  {
    name: 'Trill Bloom',
    shader: 'spiro',
    values: {
      uSpeed: 12,
      uScale: 44,
      uComplexity: 55,
      uBrightness: 65,
      uSaturation: 88,
      uBloom: 72,
      uPointSize: 66,
      uTrailDecay: 86,
      uOrbitCount: 9,
      uTwist: 42,
      uPulse: 18,
      uZoom: 62,
      uPalette: 4,
      uHueShift: 55,
      uColorSpread: 78,
      uTintRed: 255,
      uTintGreen: 200,
      uTintBlue: 255,
    },
  },
  {
    name: 'Andor Ink',
    shader: 'spiro',
    values: {
      uSpeed: 9,
      uScale: 50,
      uComplexity: 42,
      uBrightness: 48,
      uSaturation: 45,
      uBloom: 28,
      uPointSize: 60,
      uTrailDecay: 92,
      uOrbitCount: 7,
      uTwist: 22,
      uPulse: 5,
      uZoom: 60,
      uPalette: 0,
      uHueShift: 15,
      uColorSpread: 35,
      uTintRed: 180,
      uTintGreen: 185,
      uTintBlue: 195,
    },
  },
  {
    name: 'Mirror Six',
    shader: 'kaleido',
    values: {
      uSpeed: 5,
      uScale: 50,
      uComplexity: 40,
      uBrightness: 55,
      uSaturation: 72,
      uBloom: 38,
      uSegments: 6,
      uRingCount: 5,
      uWarp: 22,
      uLineWidth: 30,
      uCenterShape: 1,
      uCenterSize: 40,
      uCenterStrength: 55,
      uShapeCount: 1,
      uShape2: 1,
      uShape3: 1,
      uShape4: 1,
      uShapeMorph: 0,
    },
  },
  {
    name: 'Hex Morph',
    shader: 'kaleido',
    values: {
      uSpeed: 8,
      uScale: 46,
      uComplexity: 58,
      uBrightness: 60,
      uSaturation: 80,
      uBloom: 48,
      uSegments: 12,
      uRingCount: 8,
      uWarp: 35,
      uLineWidth: 32,
      uCenterShape: 4,
      uCenterSize: 44,
      uCenterStrength: 75,
      uShapeCount: 4,
      uShape2: 4,
      uShape3: 5,
      uShape4: 3,
      uShapeMorph: 45,
    },
  },
  {
    name: 'Star Chamber',
    shader: 'kaleido',
    values: {
      uSpeed: 10,
      uScale: 44,
      uComplexity: 62,
      uBrightness: 68,
      uSaturation: 85,
      uBloom: 62,
      uSegments: 8,
      uRingCount: 9,
      uWarp: 55,
      uLineWidth: 36,
      uCenterShape: 5,
      uCenterSize: 52,
      uCenterStrength: 85,
      uShapeCount: 2,
      uShape2: 5,
      uShape3: 5,
      uShape4: 2,
      uShapeMorph: 15,
    },
  },
  {
    name: 'Prism Drift',
    shader: 'kaleido',
    values: {
      uSpeed: 4,
      uScale: 52,
      uComplexity: 28,
      uBrightness: 42,
      uSaturation: 65,
      uBloom: 32,
      uSegments: 10,
      uRingCount: 4,
      uWarp: 18,
      uLineWidth: 28,
      uCenterShape: 2,
      uCenterSize: 36,
      uCenterStrength: 45,
      uShapeCount: 2,
      uShape2: 2,
      uShape3: 3,
      uShape4: 1,
      uShapeMorph: 8,
    },
  },
  {
    name: 'Jade Carousel',
    shader: 'kaleido',
    values: {
      uSpeed: 6,
      uScale: 50,
      uComplexity: 48,
      uBrightness: 52,
      uSaturation: 78,
      uBloom: 42,
      uSegments: 8,
      uRingCount: 6,
      uWarp: 28,
      uLineWidth: 30,
      uCenterShape: 4,
      uCenterSize: 46,
      uCenterStrength: 68,
      uShapeCount: 3,
      uShape2: 4,
      uShape3: 5,
      uShape4: 1,
      uShapeMorph: 52,
    },
  },
  {
    name: 'Ember Fold',
    shader: 'kaleido',
    values: {
      uSpeed: 7,
      uScale: 46,
      uComplexity: 55,
      uBrightness: 58,
      uSaturation: 90,
      uBloom: 58,
      uSegments: 12,
      uRingCount: 7,
      uWarp: 42,
      uLineWidth: 34,
      uCenterShape: 3,
      uCenterSize: 50,
      uCenterStrength: 72,
      uShapeCount: 4,
      uShape2: 3,
      uShape3: 5,
      uShape4: 6,
      uShapeMorph: 65,
    },
  },
  {
    name: 'Crystal Swap',
    shader: 'kaleido',
    values: {
      uSpeed: 5,
      uScale: 48,
      uComplexity: 38,
      uBrightness: 48,
      uSaturation: 42,
      uBloom: 55,
      uSegments: 10,
      uRingCount: 5,
      uWarp: 24,
      uLineWidth: 32,
      uCenterShape: 2,
      uCenterSize: 44,
      uCenterStrength: 62,
      uShapeCount: 2,
      uShape2: 2,
      uShape3: 4,
      uShape4: 6,
      uShapeMorph: 38,
    },
  },
  {
    name: 'Particle Storm',
    shader: 'flow',
    values: {
      uSpeed: 10,
      uScale: 48,
      uComplexity: 72,
      uBrightness: 58,
      uSaturation: 85,
      uBloom: 55,
      uParticleCount: 65,
      uFieldScale: 48,
      uNoiseScale: 45,
      uTrailAlpha: 18,
      uPointSize: 35,
    },
  },
  {
    name: 'Gentle Drift',
    shader: 'flow',
    values: {
      uSpeed: 4,
      uScale: 42,
      uComplexity: 35,
      uBrightness: 40,
      uSaturation: 60,
      uBloom: 35,
      uParticleCount: 22,
      uFieldScale: 35,
      uNoiseScale: 25,
      uTrailAlpha: 32,
      uPointSize: 22,
    },
  },
  {
    name: 'Lumis Stream',
    shader: 'flow',
    values: {
      uSpeed: 7,
      uScale: 50,
      uComplexity: 55,
      uBrightness: 52,
      uSaturation: 78,
      uBloom: 48,
      uParticleCount: 42,
      uFieldScale: 52,
      uNoiseScale: 38,
      uTrailAlpha: 28,
      uPointSize: 30,
    },
  },
  {
    name: 'Celix Wake',
    shader: 'flow',
    values: {
      uSpeed: 9,
      uScale: 46,
      uComplexity: 68,
      uBrightness: 55,
      uSaturation: 82,
      uBloom: 65,
      uParticleCount: 50,
      uFieldScale: 44,
      uNoiseScale: 42,
      uTrailAlpha: 22,
      uPointSize: 32,
    },
  },
  {
    name: 'Bubble Bath',
    shader: 'metaballs',
    values: {
      uSpeed: 6,
      uScale: 50,
      uComplexity: 55,
      uBrightness: 58,
      uSaturation: 80,
      uBloom: 55,
      uBallCount: 11,
      uSoftness: 45,
      uEdgeGlow: 35,
      uZoom: 35,
    },
  },
  {
    name: 'Mercury Pool',
    shader: 'metaballs',
    values: {
      uSpeed: 4,
      uScale: 44,
      uComplexity: 35,
      uBrightness: 62,
      uSaturation: 55,
      uBloom: 70,
      uBallCount: 5,
      uSoftness: 55,
      uEdgeGlow: 65,
      uZoom: 48,
    },
  },
  {
    name: 'Aurora Blobs',
    shader: 'metaballs',
    values: {
      uSpeed: 7,
      uScale: 52,
      uComplexity: 62,
      uBrightness: 60,
      uSaturation: 92,
      uBloom: 58,
      uBallCount: 9,
      uSoftness: 38,
      uEdgeGlow: 50,
      uZoom: 32,
    },
  },
  {
    name: 'Solix Pulse',
    shader: 'metaballs',
    values: {
      uSpeed: 9,
      uScale: 46,
      uComplexity: 50,
      uBrightness: 54,
      uSaturation: 75,
      uBloom: 62,
      uBallCount: 7,
      uSoftness: 32,
      uEdgeGlow: 72,
      uZoom: 42,
    },
  },
  {
    name: 'Stargate Transit',
    shader: 'wormhole',
    values: {
      uSpeed: 10,
      uScale: 48,
      uComplexity: 44,
      uBrightness: 58,
      uSaturation: 82,
      uBloom: 55,
      uChevrons: 9,
      uRingSize: 58,
      uRingWidth: 42,
      uTunnelDepth: 62,
      uSwirl: 48,
      uHorizonGlow: 72,
      uChevronGlow: 58,
      uTrailShape: 3,
      uZoom: 50,
      uPalette: 3,
      uHueShift: 48,
      uColorSpeed: 45,
      uColorSpread: 78,
      uTintRed: 100,
      uTintGreen: 180,
      uTintBlue: 255,
    },
  },
  {
    name: 'Contact Passage',
    shader: 'wormhole',
    values: {
      uSpeed: 7,
      uScale: 46,
      uComplexity: 56,
      uBrightness: 62,
      uSaturation: 88,
      uBloom: 62,
      uChevrons: 6,
      uRingSize: 62,
      uRingWidth: 52,
      uTunnelDepth: 55,
      uSwirl: 38,
      uHorizonGlow: 78,
      uChevronGlow: 42,
      uTrailShape: 1,
      uZoom: 46,
      uPalette: 2,
      uHueShift: 55,
      uColorSpeed: 38,
      uColorSpread: 85,
      uTintRed: 80,
      uTintGreen: 200,
      uTintBlue: 255,
    },
  },
  {
    name: 'Dial Home Run',
    shader: 'wormhole',
    values: {
      uSpeed: 12,
      uScale: 50,
      uComplexity: 40,
      uBrightness: 54,
      uSaturation: 75,
      uBloom: 48,
      uChevrons: 8,
      uRingSize: 55,
      uRingWidth: 38,
      uTunnelDepth: 68,
      uSwirl: 44,
      uHorizonGlow: 65,
      uChevronGlow: 52,
      uTrailShape: 10,
      uZoom: 52,
      uPalette: 3,
      uHueShift: 42,
      uColorSpeed: 55,
      uColorSpread: 72,
      uTintRed: 120,
      uTintGreen: 170,
      uTintBlue: 240,
    },
  },
  {
    name: 'Sliders Vortex',
    shader: 'wormhole',
    values: {
      uSpeed: 14,
      uScale: 44,
      uComplexity: 62,
      uBrightness: 60,
      uSaturation: 90,
      uBloom: 58,
      uChevrons: 12,
      uRingSize: 52,
      uRingWidth: 48,
      uTunnelDepth: 72,
      uSwirl: 78,
      uHorizonGlow: 82,
      uChevronGlow: 68,
      uTrailShape: 5,
      uZoom: 44,
      uPalette: 5,
      uHueShift: 62,
      uColorSpeed: 62,
      uColorSpread: 88,
      uTintRed: 140,
      uTintGreen: 210,
      uTintBlue: 255,
    },
  },
  {
    name: 'Slow Drift',
    shader: 'wormhole',
    values: {
      uSpeed: 4,
      uScale: 52,
      uComplexity: 32,
      uBrightness: 50,
      uSaturation: 68,
      uBloom: 42,
      uChevrons: 5,
      uRingSize: 65,
      uRingWidth: 55,
      uTunnelDepth: 40,
      uSwirl: 22,
      uHorizonGlow: 62,
      uChevronGlow: 35,
      uTrailShape: 0,
      uZoom: 54,
      uPalette: 1,
      uHueShift: 38,
      uColorSpeed: 28,
      uColorSpread: 65,
      uTintRed: 200,
      uTintGreen: 160,
      uTintBlue: 255,
    },
  },
  {
    name: 'Ribbon Dance',
    shader: 'ribbons',
    values: {
      uSpeed: 10,
      uScale: 48,
      uComplexity: 58,
      uBrightness: 62,
      uSaturation: 85,
      uBloom: 55,
      uRibbonCount: 7,
      uThickness: 28,
      uTwistAmount: 62,
    },
  },
  {
    name: 'Velara Weave',
    shader: 'ribbons',
    values: {
      uSpeed: 7,
      uScale: 50,
      uComplexity: 48,
      uBrightness: 55,
      uSaturation: 78,
      uBloom: 42,
      uRibbonCount: 9,
      uThickness: 22,
      uTwistAmount: 35,
    },
  },
  {
    name: 'Quiet Streams',
    shader: 'ribbons',
    values: {
      uSpeed: 4,
      uScale: 44,
      uComplexity: 32,
      uBrightness: 45,
      uSaturation: 65,
      uBloom: 35,
      uRibbonCount: 4,
      uThickness: 42,
      uTwistAmount: 22,
    },
  },
  {
    name: 'Nyxos Spiral',
    shader: 'ribbons',
    values: {
      uSpeed: 8,
      uScale: 46,
      uComplexity: 72,
      uBrightness: 58,
      uSaturation: 88,
      uBloom: 52,
      uRibbonCount: 6,
      uThickness: 26,
      uTwistAmount: 78,
    },
  },
];

export class PresetManager {
  constructor() {
    this.presets = [...PRESETS];
    this.loadSavedPresets();
    this.currentIndex = 0;
    this.activeShader = this.presets[0]?.shader ?? SHADER_IDS[0];
    this.getLiveValues = null;
    this.autoCycle = false;
    this.cycleInterval = 45;
    this.transitionDuration = 6;
    this.smoothTransitions = loadSmoothTransitionsPreference();
    this.randomizeOnCycle = true;
    this.elapsed = 0;
    this.transitionElapsed = 0;
    this.isTransitioning = false;
    this.fromState = null;
    this.toState = null;
    this.listeners = new Set();
  }

  loadSavedPresets() {
    const saved = loadSavedPresets();
    for (const entry of saved) {
      if (!entry?.name || !entry.shader) continue;
      if (this.presets.some((p) => p.name === entry.name)) continue;
      this.presets.push({
        id: entry.id ?? `saved-${entry.name}`,
        name: entry.name,
        shader: entry.shader,
        values: { ...entry.values },
        custom: true,
        saved: true,
      });
    }
  }

  setLiveValuesGetter(fn) {
    this.getLiveValues = fn;
  }

  setActiveShader(shaderId) {
    if (shaderId && shaderId !== this.activeShader) {
      this.activeShader = shaderId;
      this.notify('activeShaderChanged', { shader: shaderId });
    }
  }

  getPresetsForShader(shaderId = this.activeShader) {
    return this.presets.filter((p) => p.shader === shaderId);
  }

  getShaderPresetIndices(shaderId = this.activeShader) {
    return this.presets
      .map((p, i) => (p.shader === shaderId ? i : -1))
      .filter((i) => i >= 0);
  }

  getPresetNames(shaderId = this.activeShader) {
    return this.getPresetsForShader(shaderId).map((p) => p.name);
  }

  getPresetPosition(shaderId = this.activeShader) {
    const indices = this.getShaderPresetIndices(shaderId);
    if (!indices.length) return { current: 0, total: 0 };
    const pos = indices.indexOf(this.currentIndex);
    return {
      current: pos >= 0 ? pos + 1 : 1,
      total: indices.length,
    };
  }

  allNames() {
    return new Set(this.presets.map((p) => p.name));
  }

  findIndexByName(name) {
    return this.presets.findIndex((p) => p.name === name);
  }

  isBuiltin(name) {
    return PRESETS.some((p) => p.name === name);
  }

  getBuiltinOriginal(name, shaderId = this.activeShader) {
    return PRESETS.find((p) => p.name === name && p.shader === shaderId);
  }

  canResetToOriginals() {
    const preset = this.currentPreset;
    return Boolean(this.getBuiltinOriginal(preset.name, preset.shader));
  }

  resetToOriginals({ immediate = false } = {}) {
    immediate = this.resolveImmediate(immediate);
    const preset = this.currentPreset;
    const original = this.getBuiltinOriginal(preset.name, preset.shader);
    if (!original) return false;

    const originalValues = this.mergePresetValues(original.values, {});
    Object.assign(preset.values, originalValues);
    preset.display = original.display ? { ...original.display } : undefined;

    const live = this.getLiveValues?.() ?? { ...preset.values };
    const toState = {
      shader: this.activeShader,
      values: originalValues,
      display: preset.display,
    };

    if (immediate) {
      this.isTransitioning = false;
      this.fromState = null;
      this.toState = null;
      this.transitionElapsed = 0;
      this.notify('preset', {
        preset,
        values: originalValues,
        display: preset.display,
        shader: this.activeShader,
      });
      return true;
    }

    this.fromState = { shader: this.activeShader, values: { ...live } };
    this.toState = toState;
    this.isTransitioning = true;
    this.transitionElapsed = 0;
    this.elapsed = 0;
    this.notify('transitionStart', {
      from: preset,
      to: preset,
      toState,
      reset: true,
    });
    return true;
  }

  mergePresetValues(presetValues, baseValues = {}) {
    const specs = getSpecMap(this.activeShader);
    const merged = { ...baseValues };
    for (const key of Object.keys(specs)) {
      if (key in presetValues) merged[key] = presetValues[key];
    }
    for (const [key, spec] of Object.entries(BACKGROUND_UNIFORMS)) {
      if (key in presetValues) merged[key] = presetValues[key];
      else if (!(key in merged)) merged[key] = spec.value;
    }
    return merged;
  }

  createRandomPreset(options = {}) {
    const shader = options.shader ?? this.activeShader;
    const name = takePresetName(this.allNames());
    const values = randomizeUniforms(shader, {});
    const preset = {
      id: `session-${crypto.randomUUID()}`,
      name,
      shader,
      values,
      custom: true,
      saved: false,
    };
    this.presets.push(preset);
    this.notify('presetsChanged', { preset });
    this.goTo(this.presets.length - 1, {
      immediate: options.immediate ?? false,
      randomize: false,
    });
    return preset;
  }

  suggestSaveName() {
    const current = this.currentPreset;
    if (current?.custom && current.saved) return current.name;
    return takePresetName(this.allNames());
  }

  saveCurrent({ name, shader, values, overwrite = false }) {
    const presetName = (name ?? '').trim();
    if (!presetName) return null;

    if (this.isBuiltin(presetName)) {
      return { error: 'builtin', name: presetName };
    }

    const existingIndex = this.findIndexByName(presetName);
    const existing = existingIndex >= 0 ? this.presets[existingIndex] : null;

    if (existing?.custom && existing.saved && !overwrite) {
      return { conflict: true, existing };
    }

    if (existing && !existing.custom) {
      return { conflict: true, existing };
    }

    const preset = {
      id: existing?.id ?? `saved-${crypto.randomUUID()}`,
      name: presetName,
      shader,
      values: { ...values },
      custom: true,
      saved: true,
      savedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      this.presets[existingIndex] = preset;
      this.currentIndex = existingIndex;
    } else {
      this.presets.push(preset);
      this.currentIndex = this.presets.length - 1;
    }

    this.persistSavedPresets();
    this.notify('presetsChanged', { preset });
    this.notify('presetSaved', { preset });
    return preset;
  }

  persistSavedPresets() {
    const savable = this.presets
      .filter((p) => p.custom && p.saved)
      .map((p) => toStoredPreset(p));
    writeSavedPresets(savable);
  }

  get currentPreset() {
    return this.presets[this.currentIndex];
  }

  get currentShader() {
    return this.activeShader;
  }

  setAutoCycle(enabled) {
    const next = Boolean(enabled);
    if (this.autoCycle === next) return;
    this.autoCycle = next;
    if (next) this.elapsed = 0;
    this.notify('autoCycleChanged', { enabled: next });
  }

  setSmoothTransitions(enabled) {
    const next = Boolean(enabled);
    if (this.smoothTransitions === next) return;
    this.smoothTransitions = next;
    saveSmoothTransitionsPreference(next);
    if (!next && this.isTransitioning && this.toState) {
      const preset = this.currentPreset;
      const values = this.toState.values;
      this.isTransitioning = false;
      this.fromState = null;
      this.toState = null;
      this.transitionElapsed = 0;
      this.notify('preset', {
        preset,
        values,
        shader: this.activeShader,
      });
    }
    this.notify('smoothTransitionsChanged', { enabled: next });
  }

  resolveImmediate(immediate = false) {
    return immediate || !this.smoothTransitions;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify(event, detail = {}) {
    for (const fn of this.listeners) {
      fn(event, detail);
    }
  }

  buildState(preset, randomize = false) {
    const live = this.getLiveValues?.() ?? {};
    let values = this.mergePresetValues(preset.values, live);
    if (randomize) {
      values = randomizeUniforms(this.activeShader, values);
    }
    return {
      shader: this.activeShader,
      values,
      display: preset.display ? { ...preset.display } : undefined,
    };
  }

  transitionToValues(values, { immediate = false, preset = this.currentPreset, display } = {}) {
    immediate = this.resolveImmediate(immediate);
    const live = this.getLiveValues?.() ?? {};
    const toState = {
      shader: this.activeShader,
      values,
      display: display ?? (preset.display ? { ...preset.display } : undefined),
    };

    for (const [key, value] of Object.entries(values)) {
      if (key.startsWith('u')) preset.values[key] = value;
    }

    if (immediate) {
      this.isTransitioning = false;
      this.fromState = null;
      this.toState = null;
      this.transitionElapsed = 0;
      this.notify('preset', {
        preset,
        values,
        display: toState.display,
        shader: this.activeShader,
      });
      return true;
    }

    this.fromState = { shader: this.activeShader, values: { ...live } };
    this.toState = toState;
    this.isTransitioning = true;
    this.transitionElapsed = 0;
    this.elapsed = 0;
    this.notify('transitionStart', {
      from: preset,
      to: preset,
      toState,
    });
    return true;
  }

  randomizeCurrent({ immediate } = {}) {
    const live = this.getLiveValues?.() ?? {};
    const values = randomizeUniforms(this.activeShader, live);
    return this.transitionToValues(values, { immediate });
  }

  randomizeScope(scope, { immediate } = {}) {
    const specs = getSpecsForScope(scope, this.activeShader);
    const live = this.getLiveValues?.() ?? {};
    const values = randomizeSpecs(specs, live);
    return this.transitionToValues(values, { immediate });
  }

  randomizeMode(modeId, { immediate, shader, presetName: syncPreset } = {}) {
    const presetName = this.currentPreset?.name ?? '';

    if (shader && shader !== this.activeShader) {
      this.setActiveShader(shader);
    }
    if (syncPreset) {
      this.syncCurrentIndexForShader(syncPreset);
    }

    if (modeId === 'preset') {
      const jumped = this.jumpRandomPreset({ randomize: false, immediate });
      if (!jumped) return { ok: false, mode: modeId };
      return {
        ok: true,
        mode: modeId,
        presetName: jumped.name,
        reRolled: jumped.reRolled,
        previousPreset: presetName,
      };
    }

    const keys = getKeysForChaosMode(modeId, this.activeShader);
    if (!keys.length) return { ok: false, mode: modeId, presetName };

    const specs = getSpecMap(this.activeShader);
    const live = this.getLiveValues?.() ?? {};
    const allowRebuild = modeId === 'party';
    const values = randomizeSpecs(specs, live, keys, { allowRebuild });

    if (modeId === 'motion' || modeId === 'party') {
      values.motionTrails = Math.round(randomBetween(0, 100));
    }

    const ok = this.transitionToValues(values, { immediate });
    return { ok, mode: modeId, presetName, keyCount: keys.length };
  }

  jumpRandomPreset({ randomize = true, immediate } = {}) {
    this.syncCurrentIndexForShader(this.currentPreset?.name);

    const indices = this.getShaderPresetIndices(this.activeShader);
    if (!indices.length) {
      const created = this.createRandomPreset({ immediate });
      return created?.name ?? null;
    }

    const others = indices.filter((i) => i !== this.currentIndex);
    const pool = others.length ? others : indices;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const targetPreset = this.presets[pick];
    const reRolled = pick === this.currentIndex && !randomize;
    const changed = this.goTo(pick, {
      randomize: reRolled || randomize,
      immediate: immediate ?? false,
    });
    if (!changed) return null;
    return { name: targetPreset?.name ?? null, reRolled };
  }

  randomShader({ randomize = true, immediate } = {}) {
    const shader = pickRandom(SHADER_IDS, this.activeShader);
    this.setActiveShader(shader);
    const indices = this.getShaderPresetIndices(shader);
    if (indices.length) {
      const pick = indices[Math.floor(Math.random() * indices.length)];
      this.goTo(pick, { randomize, immediate: immediate ?? false });
    } else {
      this.createRandomPreset({ shader, immediate });
    }
    return true;
  }

  chaosFullShuffle({ immediate } = {}) {
    const shader = pickRandom(SHADER_IDS, null);
    this.setActiveShader(shader);
    const indices = this.getShaderPresetIndices(shader);
    if (indices.length) {
      const pick = indices[Math.floor(Math.random() * indices.length)];
      this.goTo(pick, { randomize: true, immediate: immediate ?? false });
    } else {
      this.createRandomPreset({ shader, immediate });
    }
    return true;
  }

  goTo(index, { immediate = false, randomize = this.randomizeOnCycle } = {}) {
    immediate = this.resolveImmediate(immediate);
    const nextIndex = ((index % this.presets.length) + this.presets.length) % this.presets.length;
    if (nextIndex === this.currentIndex && !immediate && !randomize) return false;

    const targetPreset = this.presets[nextIndex];
    const toState = this.buildState(targetPreset, randomize);
    const live = this.getLiveValues?.() ?? { ...this.currentPreset.values };

    if (immediate) {
      this.currentIndex = nextIndex;
      this.isTransitioning = false;
      this.fromState = null;
      this.toState = null;
      this.elapsed = 0;
      this.notify('preset', {
        preset: targetPreset,
        values: toState.values,
        display: toState.display,
        shader: this.activeShader,
      });
      return true;
    }

    this.fromState = { shader: this.activeShader, values: { ...live } };
    this.toState = toState;
    this.currentIndex = nextIndex;
    this.isTransitioning = true;
    this.transitionElapsed = 0;
    this.elapsed = 0;
    this.notify('transitionStart', {
      from: this.currentPreset,
      to: targetPreset,
      toState,
    });
    return true;
  }

  syncCurrentIndexForShader(presetName) {
    const indices = this.getShaderPresetIndices();
    if (!indices.length) return;

    if (presetName) {
      const byName = this.presets.findIndex(
        (p) => p.name === presetName && p.shader === this.activeShader,
      );
      if (byName >= 0) {
        this.currentIndex = byName;
        return;
      }
    }

    if (indices.includes(this.currentIndex)) return;

    const resolved = this.resolvePresetIndexForShader(this.activeShader);
    this.currentIndex = indices.includes(resolved) ? resolved : indices[0];
  }

  goToRelative(delta, options = {}) {
    const indices = this.getShaderPresetIndices();
    if (!indices.length) return;
    this.syncCurrentIndexForShader(options.presetName);

    const pos = indices.indexOf(this.currentIndex);
    if (pos < 0) return;

    const nextPos = (pos + delta + indices.length) % indices.length;
    this.goTo(indices[nextPos], options);
  }

  next(options) {
    this.goToRelative(1, options);
  }

  prev(options) {
    this.goToRelative(-1, options);
  }

  randomPreset(options = {}) {
    this.createRandomPreset(options);
  }

  goToByName(name, options = {}) {
    const shader = options.shader ?? this.activeShader;
    if (shader && shader !== this.activeShader) {
      this.setActiveShader(shader);
    }
    const index = this.presets.findIndex((p) => p.name === name && p.shader === shader);
    if (index >= 0) this.goTo(index, options);
  }

  resolvePresetIndexForShader(shaderId) {
    const currentName = this.currentPreset.name;
    const byName = this.presets.findIndex((p) => p.name === currentName && p.shader === shaderId);
    if (byName >= 0) return byName;
    const indices = this.getShaderPresetIndices(shaderId);
    return indices[0] ?? this.currentIndex;
  }

  switchToShader(shaderId, { immediate = true } = {}) {
    if (!shaderId || !SHADER_IDS.includes(shaderId)) return;
    this.setActiveShader(shaderId);
    const targetIndex = this.resolvePresetIndexForShader(shaderId);
    this.goTo(targetIndex, { immediate, randomize: false });
  }

  cycleShader(delta, options = {}) {
    const idx = SHADER_IDS.indexOf(this.activeShader);
    if (idx < 0) return;
    const nextIdx = (idx + delta + SHADER_IDS.length) % SHADER_IDS.length;
    this.switchToShader(SHADER_IDS[nextIdx], options);
  }

  update(dt, getLiveValues) {
    if (this.autoCycle) {
      this.elapsed += dt;
      if (!this.isTransitioning && this.elapsed >= this.cycleInterval) {
        this.next();
      }
    }

    if (!this.isTransitioning) {
      return {
        shader: this.activeShader,
        values: getLiveValues ? getLiveValues() : { ...this.currentPreset.values },
        blend: 1,
      };
    }

    this.transitionElapsed += dt;
    const t = clamp(this.transitionElapsed / this.transitionDuration, 0, 1);
    const eased = easeInOutCubic(t);

    const blended = {};
    const fromValues = this.fromState.values;
    const toValues = this.toState.values;
    const keys = new Set([...Object.keys(fromValues), ...Object.keys(toValues)]);
    const specs = getSpecMap(this.activeShader);

    for (const key of keys) {
      const a = fromValues[key] ?? toValues[key];
      const b = toValues[key] ?? fromValues[key];
      const spec = specs[key];
      if (isDiscreteUniform(spec)) {
        blended[key] = eased < 0.5 ? a : b;
      } else {
        blended[key] = lerp(a, b, eased);
      }
    }

    if (t >= 1) {
      this.isTransitioning = false;
      this.fromState = null;
      this.notify('transitionEnd', {
        preset: this.currentPreset,
        values: toValues,
        shader: this.activeShader,
      });
      this.toState = null;
    }

    return { shader: this.activeShader, values: blended, blend: eased };
  }
}

export { SHADER_IDS, SHADERS, GLOBAL_UNIFORMS, randomizeUniforms };
