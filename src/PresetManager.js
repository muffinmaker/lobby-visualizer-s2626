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
// Extra-gentle easing for motion-driving sliders during preset cross-fades.
const easeInOutQuint = (t) =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

const MOTION_BLEND_KEYS = new Set([
  'uSpeed',
  'uComplexity',
  'uWarp',
  'uTwist',
  'uTwistAmount',
  'uSwirl',
  'uTunnelDepth',
  'uRingSize',
]);

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
    spec?.kind === 'stampShape' ||
    spec?.kind === 'pointShape' ||
    spec?.kind === 'symmetry' ||
    spec?.kind === 'spacingMode' ||
    spec?.kind === 'patternType' ||
    spec?.kind === 'trailShape' ||
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
  result.uSpeed = clamp(Math.round(result.uSpeed * 0.7), GLOBAL_UNIFORMS.uSpeed.min, 9);
  result.uBrightness = clamp(result.uBrightness, 25, 80);
  return result;
}

const PRESET_LIST = [
  {
    name: 'J04 Spocks',
    shader: 'spocks',
    values: {
      uSpeed: 2,
      uScale: 11,
      uComplexity: 40,
      uBrightness: 50,
      uSaturation: 67,
      uBloom: 40,
      uUp: 50,
      uDown: 50,
      uScaleY: 49,
      uScaleZ: 51,
      uWidth: 41,
      uHeight: 41,
      uRotate: 62,
      uMyTime: 45,
      uZoom: 50,
      uRed: 0,
      uGreen: 0,
      uBlue: 155,
      uLineWidth: 36,
      uIterations: 65,
      uTrailDecay: 92,
      uWidthRand: 0,
      uHeightRand: 0,
    },
  },
  {
    name: 'Spocks Drift',
    shader: 'spocks',
    values: {
      uSpeed: 2,
      uScale: 12,
      uComplexity: 40,
      uBrightness: 55,
      uSaturation: 77,
      uBloom: 40,
      uUp: 52,
      uDown: 48,
      uScaleY: 51,
      uScaleZ: 49,
      uWidth: 38,
      uHeight: 44,
      uRotate: 68,
      uMyTime: 47,
      uZoom: 48,
      uRed: 38,
      uGreen: 89,
      uBlue: 217,
      uLineWidth: 32,
      uIterations: 65,
      uTrailDecay: 94,
      uWidthRand: 1,
      uHeightRand: 1,
    },
  },
{
    name: 'Calm Orbits',
    shader: 'spiro',
    values: {
      uSpeed: 8,
      uScale: 22,
      uComplexity: 72,
      uBrightness: 62,
      uSaturation: 72,
      uBloom: 32,
      uPointSize: 42,
      uPointShape: 0,
      uTransparency: 12,
      uTrailDecay: 70,
      uOrbitCount: 8,
      uTwist: 26,
      uPulse: 10,
      uZoom: 42,
      uPalette: 2,
      uHueShift: 42,
      uColorSpread: 48,
      uGravity: 0,
    },
  },
{
    name: 'Neon Kaleido',
    shader: 'kaleido',
    values: {
      uSpeed: 2,
      uScale: 12,
      uComplexity: 56,
      uBrightness: 65,
      uSaturation: 87,
      uBloom: 55,
      uSegments: 10,
      uRingCount: 7,
      uWarp: 40,
      uLineWidth: 8,
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
      uSpeed: 2,
      uScale: 11,
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
      uSpeed: 1,
      uScale: 12,
      uComplexity: 48,
      uBrightness: 55,
      uSaturation: 77,
      uBloom: 60,
      uBallCount: 8,
      uSoftness: 35,
      uEdgeGlow: 40,
      uZoom: 10,
    },
  },
{
    name: 'Silk Ribbons',
    shader: 'ribbons',
    values: {
      uSpeed: 2,
      uScale: 12,
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
      uScale: 20,
      uComplexity: 84,
      uBrightness: 66,
      uSaturation: 83,
      uBloom: 40,
      uPointSize: 36,
      uPointShape: 4,
      uTransparency: 10,
      uTrailDecay: 55,
      uOrbitCount: 12,
      uTwist: 70,
      uPulse: 18,
      uZoom: 40,
      uPalette: 3,
      uHueShift: 72,
      uColorSpread: 85,
      uGravity: 0,
    },
  },
  {
    name: 'Vulcan Grid',
    shader: 'spocks',
    values: {
      uSpeed: 2,
      uScale: 11,
      uComplexity: 38,
      uBrightness: 52,
      uSaturation: 70,
      uBloom: 35,
      uUp: 50,
      uDown: 50,
      uScaleY: 48,
      uScaleZ: 52,
      uWidth: 36,
      uHeight: 36,
      uRotate: 45,
      uMyTime: 42,
      uZoom: 52,
      uRed: 0,
      uGreen: 180,
      uBlue: 200,
      uLineWidth: 34,
      uIterations: 72,
      uTrailDecay: 90,
      uWidthRand: 0,
      uHeightRand: 0,
    },
  },
  {
    name: 'Nebula Boxes',
    shader: 'spocks',
    values: {
      uSpeed: 2,
      uScale: 12,
      uComplexity: 45,
      uBrightness: 58,
      uSaturation: 82,
      uBloom: 45,
      uUp: 54,
      uDown: 46,
      uScaleY: 55,
      uScaleZ: 45,
      uWidth: 42,
      uHeight: 38,
      uRotate: 55,
      uMyTime: 50,
      uZoom: 46,
      uRed: 220,
      uGreen: 90,
      uBlue: 140,
      uLineWidth: 30,
      uIterations: 58,
      uTrailDecay: 93,
      uWidthRand: 1,
      uHeightRand: 1,
    },
  },
  {
    name: 'Warp Tunnel',
    shader: 'spocks',
    values: {
      uSpeed: 4,
      uScale: 11,
      uComplexity: 52,
      uBrightness: 60,
      uSaturation: 75,
      uBloom: 50,
      uUp: 48,
      uDown: 52,
      uScaleY: 58,
      uScaleZ: 62,
      uWidth: 34,
      uHeight: 34,
      uRotate: 78,
      uMyTime: 55,
      uZoom: 38,
      uRed: 100,
      uGreen: 140,
      uBlue: 255,
      uLineWidth: 28,
      uIterations: 70,
      uTrailDecay: 88,
      uWidthRand: 0,
      uHeightRand: 0,
    },
  },
  {
    name: 'Korax Lattice',
    shader: 'spocks',
    values: {
      uSpeed: 1,
      uScale: 11,
      uComplexity: 35,
      uBrightness: 54,
      uSaturation: 62,
      uBloom: 28,
      uUp: 50,
      uDown: 50,
      uScaleY: 46,
      uScaleZ: 54,
      uWidth: 28,
      uHeight: 28,
      uRotate: 35,
      uMyTime: 38,
      uZoom: 56,
      uRed: 80,
      uGreen: 140,
      uBlue: 200,
      uLineWidth: 38,
      uIterations: 78,
      uTrailDecay: 85,
      uWidthRand: 0,
      uHeightRand: 0,
    },
  },
  {
    name: 'Tellar Ember',
    shader: 'spocks',
    values: {
      uSpeed: 1,
      uScale: 13,
      uComplexity: 42,
      uBrightness: 62,
      uSaturation: 78,
      uBloom: 65,
      uUp: 52,
      uDown: 48,
      uScaleY: 49,
      uScaleZ: 51,
      uWidth: 48,
      uHeight: 46,
      uRotate: 40,
      uMyTime: 42,
      uZoom: 62,
      uRed: 255,
      uGreen: 140,
      uBlue: 40,
      uLineWidth: 34,
      uIterations: 60,
      uTrailDecay: 96,
      uWidthRand: 0,
      uHeightRand: 1,
    },
  },
  {
    name: 'Proxus Vortex',
    shader: 'spocks',
    values: {
      uSpeed: 5,
      uScale: 10,
      uComplexity: 58,
      uBrightness: 58,
      uSaturation: 70,
      uBloom: 42,
      uUp: 48,
      uDown: 52,
      uScaleY: 62,
      uScaleZ: 68,
      uWidth: 32,
      uHeight: 32,
      uRotate: 85,
      uMyTime: 65,
      uZoom: 30,
      uRed: 180,
      uGreen: 200,
      uBlue: 255,
      uLineWidth: 22,
      uIterations: 55,
      uTrailDecay: 82,
      uWidthRand: 0,
      uHeightRand: 0,
    },
  },
  {
    name: 'Syrax Bloom',
    shader: 'spocks',
    values: {
      uSpeed: 2,
      uScale: 13,
      uComplexity: 48,
      uBrightness: 42,
      uSaturation: 88,
      uBloom: 55,
      uUp: 56,
      uDown: 44,
      uScaleY: 62,
      uScaleZ: 38,
      uWidth: 46,
      uHeight: 50,
      uRotate: 52,
      uMyTime: 48,
      uZoom: 54,
      uRed: 200,
      uGreen: 120,
      uBlue: 255,
      uLineWidth: 26,
      uIterations: 62,
      uTrailDecay: 97,
      uWidthRand: 1,
      uHeightRand: 1,
    },
  },
  {
    name: 'Zephon Void',
    shader: 'spocks',
    values: {
      uSpeed: 1,
      uScale: 12,
      uComplexity: 30,
      uBrightness: 38,
      uSaturation: 45,
      uBloom: 32,
      uUp: 50,
      uDown: 50,
      uScaleY: 48,
      uScaleZ: 52,
      uWidth: 52,
      uHeight: 52,
      uRotate: 28,
      uMyTime: 35,
      uZoom: 65,
      uRed: 0,
      uGreen: 90,
      uBlue: 70,
      uLineWidth: 42,
      uIterations: 45,
      uTrailDecay: 88,
      uWidthRand: 1,
      uHeightRand: 0,
    },
  },
  {
    name: 'Lobby Safe',
    shader: 'spocks',
    display: {
      motionTrails: 0,
      resolutionScale: 75,
    },
    values: {
      uSpeed: 1,
      uScale: 12,
      uComplexity: 28,
      uBrightness: 42,
      uSaturation: 52,
      uBloom: 22,
      uUp: 50,
      uDown: 50,
      uScaleY: 49,
      uScaleZ: 51,
      uWidth: 40,
      uHeight: 40,
      uRotate: 40,
      uMyTime: 38,
      uZoom: 55,
      uRed: 0,
      uGreen: 100,
      uBlue: 140,
      uLineWidth: 34,
      uIterations: 28,
      uTrailDecay: 55,
      uWidthRand: 0,
      uHeightRand: 0,
    },
  },
{
    name: 'Rigel Trails',
    shader: 'spiro',
    values: {
      uSpeed: 6,
      uScale: 24,
      uComplexity: 68,
      uBrightness: 58,
      uSaturation: 68,
      uBloom: 28,
      uPointSize: 40,
      uPointShape: 1,
      uTransparency: 8,
      uTrailDecay: 100,
      uOrbitCount: 5,
      uTwist: 18,
      uPulse: 6,
      uZoom: 44,
      uPalette: 1,
      uHueShift: 28,
      uColorSpread: 55,
      uGravity: 0,
    },
  },
{
    name: 'Trill Bloom',
    shader: 'spiro',
    values: {
      uSpeed: 7,
      uScale: 18,
      uComplexity: 76,
      uBrightness: 70,
      uSaturation: 80,
      uBloom: 55,
      uPointSize: 48,
      uPointShape: 9,
      uTransparency: 14,
      uTrailDecay: 62,
      uOrbitCount: 10,
      uTwist: 34,
      uPulse: 22,
      uZoom: 38,
      uPalette: 4,
      uHueShift: 55,
      uColorSpread: 78,
      uGravity: 0,
    },
  },
{
    name: 'Andor Ink',
    shader: 'spiro',
    values: {
      uSpeed: 5,
      uScale: 26,
      uComplexity: 64,
      uBrightness: 56,
      uSaturation: 40,
      uBloom: 22,
      uPointSize: 34,
      uPointShape: 6,
      uTransparency: 6,
      uTrailDecay: 96,
      uOrbitCount: 7,
      uTwist: 14,
      uPulse: 4,
      uZoom: 46,
      uPalette: 7,
      uHueShift: 15,
      uColorSpread: 35,
      uGravity: 0,
    },
  },
  {
    name: 'Gravity Arc',
    shader: 'spiro',
    values: {
      uSpeed: 9,
      uScale: 20,
      uComplexity: 70,
      uBrightness: 64,
      uSaturation: 76,
      uBloom: 30,
      uPointSize: 38,
      uPointShape: 2,
      uTransparency: 10,
      uTrailDecay: 88,
      uOrbitCount: 6,
      uTwist: 20,
      uPulse: 8,
      uZoom: 43,
      uPalette: 5,
      uHueShift: 20,
      uColorSpread: 70,
      uGravity: 62,
      uGravityAngle: 18,
    },
  },
  {
    name: 'Wide Petals',
    shader: 'spiro',
    values: {
      uSpeed: 6,
      uScale: 28,
      uComplexity: 74,
      uBrightness: 60,
      uSaturation: 78,
      uBloom: 36,
      uPointSize: 52,
      uPointShape: 9,
      uTransparency: 16,
      uTrailDecay: 48,
      uOrbitCount: 14,
      uTwist: 30,
      uPulse: 12,
      uZoom: 36,
      uPalette: 16,
      uHueShift: 48,
      uColorSpread: 82,
      uGravity: 0,
    },
  },
  {
    name: 'Slow Ink',
    shader: 'spiro',
    values: {
      uSpeed: 3,
      uScale: 22,
      uComplexity: 66,
      uBrightness: 58,
      uSaturation: 55,
      uBloom: 24,
      uPointSize: 44,
      uPointShape: 3,
      uTransparency: 8,
      uTrailDecay: 100,
      uOrbitCount: 4,
      uTwist: 10,
      uPulse: 2,
      uZoom: 45,
      uPalette: 14,
      uHueShift: 10,
      uColorSpread: 50,
      uGravity: 0,
    },
  },
  {
    name: 'Neon Rings',
    shader: 'spiro',
    values: {
      uSpeed: 11,
      uScale: 18,
      uComplexity: 80,
      uBrightness: 72,
      uSaturation: 90,
      uBloom: 48,
      uPointSize: 32,
      uPointShape: 6,
      uTransparency: 12,
      uTrailDecay: 40,
      uOrbitCount: 16,
      uTwist: 48,
      uPulse: 16,
      uZoom: 41,
      uPalette: 20,
      uHueShift: 60,
      uColorSpread: 90,
      uGravity: 0,
    },
  },
  {
    name: 'Dense Weave',
    shader: 'spiro',
    values: {
      uSpeed: 10,
      uScale: 16,
      uComplexity: 78,
      uBrightness: 64,
      uSaturation: 74,
      uBloom: 26,
      uPointSize: 28,
      uPointShape: 5,
      uTransparency: 18,
      uTrailDecay: 34,
      uOrbitCount: 24,
      uTwist: 55,
      uPulse: 8,
      uZoom: 39,
      uPalette: 8,
      uHueShift: 36,
      uColorSpread: 66,
      uGravity: 28,
      uGravityAngle: 62,
    },
  },
{
    name: 'Mirror Six',
    shader: 'kaleido',
    values: {
      uSpeed: 1,
      uScale: 13,
      uComplexity: 40,
      uBrightness: 55,
      uSaturation: 72,
      uBloom: 38,
      uSegments: 6,
      uRingCount: 5,
      uWarp: 22,
      uLineWidth: 8,
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
      uSpeed: 2,
      uScale: 12,
      uComplexity: 58,
      uBrightness: 60,
      uSaturation: 80,
      uBloom: 48,
      uSegments: 12,
      uRingCount: 8,
      uWarp: 35,
      uLineWidth: 8,
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
      uSpeed: 3,
      uScale: 11,
      uComplexity: 62,
      uBrightness: 68,
      uSaturation: 85,
      uBloom: 62,
      uSegments: 8,
      uRingCount: 9,
      uWarp: 55,
      uLineWidth: 9,
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
      uSpeed: 1,
      uScale: 13,
      uComplexity: 28,
      uBrightness: 42,
      uSaturation: 65,
      uBloom: 32,
      uSegments: 10,
      uRingCount: 4,
      uWarp: 18,
      uLineWidth: 7,
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
      uSpeed: 2,
      uScale: 13,
      uComplexity: 48,
      uBrightness: 52,
      uSaturation: 78,
      uBloom: 42,
      uSegments: 8,
      uRingCount: 6,
      uWarp: 28,
      uLineWidth: 8,
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
      uSpeed: 2,
      uScale: 12,
      uComplexity: 55,
      uBrightness: 58,
      uSaturation: 90,
      uBloom: 58,
      uSegments: 12,
      uRingCount: 7,
      uWarp: 42,
      uLineWidth: 9,
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
      uSpeed: 1,
      uScale: 12,
      uComplexity: 38,
      uBrightness: 48,
      uSaturation: 42,
      uBloom: 55,
      uSegments: 10,
      uRingCount: 5,
      uWarp: 24,
      uLineWidth: 8,
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
      uSpeed: 3,
      uScale: 12,
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
      uSpeed: 1,
      uScale: 11,
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
      uSpeed: 2,
      uScale: 13,
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
      uSpeed: 2,
      uScale: 12,
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
      uSpeed: 2,
      uScale: 13,
      uComplexity: 55,
      uBrightness: 58,
      uSaturation: 80,
      uBloom: 55,
      uBallCount: 11,
      uSoftness: 45,
      uEdgeGlow: 35,
      uZoom: 9,
    },
  },
{
    name: 'Mercury Pool',
    shader: 'metaballs',
    values: {
      uSpeed: 1,
      uScale: 11,
      uComplexity: 35,
      uBrightness: 62,
      uSaturation: 55,
      uBloom: 70,
      uBallCount: 5,
      uSoftness: 55,
      uEdgeGlow: 65,
      uZoom: 12,
    },
  },
{
    name: 'Aurora Blobs',
    shader: 'metaballs',
    values: {
      uSpeed: 2,
      uScale: 13,
      uComplexity: 62,
      uBrightness: 60,
      uSaturation: 92,
      uBloom: 58,
      uBallCount: 9,
      uSoftness: 38,
      uEdgeGlow: 50,
      uZoom: 8,
    },
  },
{
    name: 'Solix Pulse',
    shader: 'metaballs',
    values: {
      uSpeed: 2,
      uScale: 12,
      uComplexity: 50,
      uBrightness: 54,
      uSaturation: 75,
      uBloom: 62,
      uBallCount: 7,
      uSoftness: 32,
      uEdgeGlow: 72,
      uZoom: 11,
    },
  },
{
    name: 'Stargate Transit',
    shader: 'wormhole',
    values: {
      uSpeed: 3,
      uScale: 12,
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
      uZoom: 13,
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
      uSpeed: 2,
      uScale: 12,
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
      uZoom: 12,
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
      uSpeed: 3,
      uScale: 13,
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
      uZoom: 13,
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
      uSpeed: 4,
      uScale: 11,
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
      uZoom: 11,
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
      uSpeed: 1,
      uScale: 13,
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
      uZoom: 14,
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
      uSpeed: 3,
      uScale: 12,
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
      uSpeed: 2,
      uScale: 13,
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
      uSpeed: 1,
      uScale: 11,
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
      uSpeed: 2,
      uScale: 12,
      uComplexity: 72,
      uBrightness: 58,
      uSaturation: 88,
      uBloom: 52,
      uRibbonCount: 6,
      uThickness: 26,
      uTwistAmount: 78,
    },
  },
  {
    name: 'Pond Cross',
    shader: 'layers',
    values: {
      uSpeed: 2,
      uScale: 12,
      uComplexity: 40,
      uBrightness: 58,
      uSaturation: 80,
      uBloom: 36,
      uPalette: 11,
      uLayerCount: 4,
      uMix: 55,
      uLayerScale: 40,
      uSpeedOffset: 35,
      uZoom: 13,
    },
  },
  {
    name: 'Dense Moire',
    shader: 'layers',
    values: {
      uSpeed: 3,
      uScale: 11,
      uComplexity: 62,
      uBrightness: 64,
      uSaturation: 90,
      uBloom: 48,
      uPalette: 20,
      uLayerCount: 6,
      uMix: 30,
      uLayerScale: 62,
      uSpeedOffset: 70,
      uZoom: 12,
    },
  },
  {
    name: 'Ink Field',
    shader: 'flow',
    values: {
      uSpeed: 3, uScale: 16, uComplexity: 42, uBrightness: 48, uSaturation: 42, uBloom: 18,
      uParticleCount: 22, uFieldScale: 60, uNoiseScale: 18, uTrailAlpha: 36, uPointSize: 16,
      uFieldShape: 7, uMotion: 1, uShapeSize: 40,
    },
  },
  {
    name: 'Neon Dust',
    shader: 'flow',
    values: {
      uSpeed: 8, uScale: 14, uComplexity: 70, uBrightness: 70, uSaturation: 92, uBloom: 48,
      uParticleCount: 40, uFieldScale: 30, uNoiseScale: 55, uTrailAlpha: 14, uPointSize: 22,
      uFieldShape: 5, uMotion: 7, uShapeSize: 55,
    },
  },
  {
    name: 'Mint Merge',
    shader: 'metaballs',
    values: {
      uSpeed: 3, uScale: 16, uComplexity: 40, uBrightness: 62, uSaturation: 70, uBloom: 40,
      uBallCount: 6, uSoftness: 55, uEdgeGlow: 28, uZoom: 48,
    },
  },
  {
    name: 'Violet Pool',
    shader: 'metaballs',
    values: {
      uSpeed: 6, uScale: 12, uComplexity: 66, uBrightness: 58, uSaturation: 86, uBloom: 52,
      uBallCount: 10, uSoftness: 22, uEdgeGlow: 70, uZoom: 55,
    },
  },
  {
    name: 'Copper Lines',
    shader: 'ribbons',
    values: {
      uSpeed: 4, uScale: 18, uComplexity: 36, uBrightness: 54, uSaturation: 60, uBloom: 30,
      uRibbonCount: 4, uThickness: 48, uTwistAmount: 20, uZoom: 58,
    },
  },
  {
    name: 'Ice Threads',
    shader: 'ribbons',
    values: {
      uSpeed: 7, uScale: 10, uComplexity: 74, uBrightness: 68, uSaturation: 80, uBloom: 55,
      uRibbonCount: 8, uThickness: 16, uTwistAmount: 72, uZoom: 42,
    },
  },
  {
    name: 'Violet Gate',
    shader: 'wormhole',
    values: {
      uSpeed: 5, uScale: 14, uComplexity: 58, uBrightness: 60, uSaturation: 84, uBloom: 46,
      uChevrons: 10, uRingSize: 48, uRingWidth: 30, uTunnelDepth: 70, uSwirl: 62, uZoom: 52,
    },
  },
  {
    name: 'Gold Tunnel',
    shader: 'wormhole',
    values: {
      uSpeed: 2, uScale: 18, uComplexity: 30, uBrightness: 66, uSaturation: 72, uBloom: 34,
      uChevrons: 6, uRingSize: 70, uRingWidth: 55, uTunnelDepth: 40, uSwirl: 18, uZoom: 60,
    },
  },
  {
    name: 'Forest Ripple',
    shader: 'layers',
    values: {
      uSpeed: 3, uScale: 16, uComplexity: 36, uBrightness: 56, uSaturation: 64, uBloom: 28,
      uLayerCount: 3, uMix: 48, uLayerScale: 55, uSpeedOffset: 22, uZoom: 50, uPatternA: 0, uPatternB: 4, uPatternC: 2,
    },
  },
  {
    name: 'Candy Grid',
    shader: 'layers',
    values: {
      uSpeed: 6, uScale: 12, uComplexity: 70, uBrightness: 70, uSaturation: 88, uBloom: 50,
      uLayerCount: 5, uMix: 62, uLayerScale: 34, uSpeedOffset: 58, uZoom: 46, uPatternA: 3, uPatternB: 1, uPatternC: 5,
    },
  },
  {
    name: 'Glass Orb',
    shader: 'orb',
    values: {
      uSpeed: 6, uScale: 20, uComplexity: 40, uBrightness: 70, uSaturation: 78, uBloom: 48,
      uSpin: 35, uDetail: 30, uZoom: 58,
    },
  },
  {
    name: 'Ember Orb',
    shader: 'orb',
    values: {
      uSpeed: 9, uScale: 16, uComplexity: 62, uBrightness: 64, uSaturation: 88, uBloom: 62,
      uSpin: 70, uDetail: 78, uZoom: 46,
    },
  },
  {
    name: 'Ice Spokes',
    shader: 'layers',
    values: {
      uSpeed: 4, uScale: 14, uComplexity: 48, uBrightness: 64, uSaturation: 58, uBloom: 36,
      uLayerCount: 4, uMix: 40, uLayerScale: 46, uSpeedOffset: 30, uZoom: 54, uPatternA: 5, uPatternB: 0, uPatternC: 4,
    },
  },
];

/** One obvious palette per preset so cycling looks different. */
const PRESET_COLOR_PROFILES = {
  'J04 Spocks': { uPalette: 0, uHueShift: 8, uColorSpeed: 30 },
  'Spocks Drift': { uPalette: 5, uHueShift: 70, uColorSpeed: 55 },
  'Vulcan Grid': { uPalette: 1, uHueShift: 20, uColorSpeed: 40 },
  'Nebula Boxes': { uPalette: 12, uHueShift: 80, uColorSpeed: 62 },
  'Warp Tunnel': { uPalette: 6, uHueShift: 35, uColorSpeed: 48 },
  'Korax Lattice': { uPalette: 9, uHueShift: 50, uColorSpeed: 36 },
  'Tellar Ember': { uPalette: 10, uHueShift: 15, uColorSpeed: 58 },
  'Proxus Vortex': { uPalette: 20, uHueShift: 88, uColorSpeed: 70 },
  'Syrax Bloom': { uPalette: 16, uHueShift: 42, uColorSpeed: 44 },
  'Zephon Void': { uPalette: 7, uHueShift: 5, uColorSpeed: 22, uSaturation: 28 },
  'Lobby Safe': { uPalette: 2, uHueShift: 60, uColorSpeed: 25 },
  'Calm Orbits': { uPalette: 2, uHueShift: 42 },
  Hyperspin: { uPalette: 3, uHueShift: 72 },
  'Rigel Trails': { uPalette: 1, uHueShift: 28 },
  'Trill Bloom': { uPalette: 4, uHueShift: 55 },
  'Andor Ink': { uPalette: 7, uHueShift: 15 },
  'Gravity Arc': { uPalette: 5, uHueShift: 20 },
  'Wide Petals': { uPalette: 16, uHueShift: 48 },
  'Slow Ink': { uPalette: 14, uHueShift: 10 },
  'Neon Rings': { uPalette: 20, uHueShift: 60 },
  'Dense Weave': { uPalette: 8, uHueShift: 36 },
  'Neon Kaleido': { uPalette: 3, uHueShift: 78, uColorSpeed: 60 },
  'Mirror Six': { uPalette: 6, uHueShift: 18, uColorSpeed: 32 },
  'Hex Morph': { uPalette: 11, uHueShift: 40, uColorSpeed: 50 },
  'Star Chamber': { uPalette: 14, uHueShift: 66, uColorSpeed: 44 },
  'Prism Drift': { uPalette: 8, uHueShift: 12, uColorSpeed: 70 },
  'Jade Carousel': { uPalette: 17, uHueShift: 30, uColorSpeed: 28 },
  'Ember Fold': { uPalette: 5, uHueShift: 82, uColorSpeed: 55 },
  'Crystal Swap': { uPalette: 21, uHueShift: 48, uColorSpeed: 36 },
  'Deep Flow': { uPalette: 6, uHueShift: 22 },
  'Particle Storm': { uPalette: 20, uHueShift: 75 },
  'Gentle Drift': { uPalette: 4, uHueShift: 15 },
  'Lumis Stream': { uPalette: 9, uHueShift: 50 },
  'Celix Wake': { uPalette: 23, uHueShift: 40 },
  'Liquid Merge': { uPalette: 2, uHueShift: 30 },
  'Bubble Bath': { uPalette: 16, uHueShift: 62 },
  'Mercury Pool': { uPalette: 7, uHueShift: 8, uSaturation: 35 },
  'Aurora Blobs': { uPalette: 9, uHueShift: 55 },
  'Solix Pulse': { uPalette: 10, uHueShift: 18 },
  'Stargate Transit': { uPalette: 3, uHueShift: 48 },
  'Contact Passage': { uPalette: 2, uHueShift: 55 },
  'Dial Home Run': { uPalette: 13, uHueShift: 70 },
  'Sliders Vortex': { uPalette: 5, uHueShift: 62 },
  'Slow Drift': { uPalette: 1, uHueShift: 38 },
  'Silk Ribbons': { uPalette: 12, uHueShift: 20 },
  'Ribbon Dance': { uPalette: 3, uHueShift: 80 },
  'Velara Weave': { uPalette: 17, uHueShift: 28 },
  'Quiet Streams': { uPalette: 6, uHueShift: 12 },
  'Nyxos Spiral': { uPalette: 24, uHueShift: 64 },
  'Pond Cross': { uPalette: 11, uHueShift: 24 },
  'Dense Moire': { uPalette: 20, uHueShift: 77 },
  'Ink Field': { uPalette: 18, uHueShift: 12 },
  'Neon Dust': { uPalette: 22, uHueShift: 68 },
  'Mint Merge': { uPalette: 22, uHueShift: 24 },
  'Violet Pool': { uPalette: 19, uHueShift: 80 },
  'Copper Lines': { uPalette: 18, uHueShift: 16 },
  'Ice Threads': { uPalette: 15, uHueShift: 44 },
  'Violet Gate': { uPalette: 19, uHueShift: 72 },
  'Gold Tunnel': { uPalette: 14, uHueShift: 18 },
  'Forest Ripple': { uPalette: 17, uHueShift: 26 },
  'Candy Grid': { uPalette: 16, uHueShift: 58 },
  'Ice Spokes': { uPalette: 15, uHueShift: 40 },
  'Glass Orb': { uPalette: 21, uHueShift: 30 },
  'Ember Orb': { uPalette: 5, uHueShift: 18 },
};

export const PRESETS = PRESET_LIST.map((preset) => {
  const colors = PRESET_COLOR_PROFILES[preset.name];
  if (!colors) return preset;
  return { ...preset, values: { ...preset.values, ...colors } };
});

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
    values.uPanX = 50;
    values.uPanY = 50;
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
        // Hold counts/shapes until the cross-fade finishes — mid-blend snaps read as violent spins.
        blended[key] = a;
      } else if (MOTION_BLEND_KEYS.has(key)) {
        blended[key] = lerp(a, b, easeInOutQuint(eased));
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
