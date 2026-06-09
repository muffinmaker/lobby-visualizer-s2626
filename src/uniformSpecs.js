// UI specs: integers 0–100 unless noted. Mapped to shader ranges in uniformMap.js

const pct = (value, shaderMin, shaderMax) => ({
  value,
  min: 0,
  max: 100,
  step: 1,
  shaderMin,
  shaderMax,
});

const center = (value, shaderMin, shaderMax) => ({
  value,
  min: 0,
  max: 100,
  step: 1,
  shaderMin,
  shaderMax,
});

const rgb = (value) => ({ value, min: 0, max: 255, step: 1, kind: 'rgb' });
const toggle = (value = 0) => ({ value, min: 0, max: 1, step: 1, kind: 'toggle' });
const count = (value, min, max) => ({ value, min, max, step: 1, kind: 'count' });

export const BACKGROUND_UNIFORMS = {
  uBgRed: rgb(2),
  uBgGreen: rgb(2),
  uBgBlue: rgb(8),
};

export const GLOBAL_UNIFORMS = {
  ...BACKGROUND_UNIFORMS,
  uSpeed: pct(10, 0, 1.2),
  uScale: pct(45, 0.3, 2.5),
  uComplexity: pct(40, 0.2, 3),
  uBrightness: pct(50, 0.2, 2.5),
  uSaturation: pct(67, 0, 1.5),
  uBloom: pct(40, 0, 2),
};

export const SHADER_UNIFORM_TEMPLATES = {
  spocks: {
    uPointSize: pct(58, 2, 14),
    uTrailDecay: pct(92, 0.85, 0.995),
    uPenCount: count(5, 2, 10),
    uGearRatio: pct(44, 0.12, 0.9),
    uPenDistance: pct(58, 0.08, 1.05),
    uWobble: pct(16, 0, 0.55),
    uPenShape: { value: 3, min: 0, max: 7, step: 1, kind: 'shape' },
    uShapeVariety: pct(40, 0, 1),
    uZoom: { value: 74, min: 0, max: 100, step: 1, kind: 'zoom', shaderMin: -2.4, shaderMax: 2.2, invert: true },
    uPalette: { value: 1, min: 0, max: 7, step: 1, kind: 'palette' },
    uHueShift: pct(50, 0, 1),
    uColorSpeed: pct(38, 0, 1.6),
    uColorSpread: pct(72, 0.2, 1.5),
    uTintRed: rgb(210),
    uTintGreen: rgb(175),
    uTintBlue: rgb(255),
  },
  spiro: {
    uPointSize: pct(58, 2, 14),
    uTrailDecay: pct(90, 0.82, 0.985),
    uOrbitCount: count(6, 2, 10),
    uTwist: pct(28, 0, 3),
    uPulse: pct(12, 0, 0.8),
    uZoom: { value: 64, min: 0, max: 100, step: 1, kind: 'zoom', shaderMin: -1.5, shaderMax: 3, invert: true },
    uPalette: { value: 0, min: 0, max: 7, step: 1, kind: 'palette' },
    uHueShift: pct(50, 0, 1),
    uColorSpread: pct(65, 0.2, 1.5),
    uTintRed: rgb(200),
    uTintGreen: rgb(180),
    uTintBlue: rgb(255),
  },
  kaleido: {
    uSegments: count(8, 3, 32),
    uRingCount: count(6, 2, 14),
    uWarp: pct(30, 0.05, 2),
    uLineWidth: pct(33, 0.002, 0.05),
    uCenterShape: { value: 1, min: 0, max: 7, step: 1, kind: 'shape' },
    uCenterSize: pct(42, 0.1, 0.75),
    uCenterStrength: pct(65, 0.3, 3),
    uShapeCount: count(2, 1, 4),
    uShape2: { value: 3, min: 0, max: 7, step: 1, kind: 'shape' },
    uShape3: { value: 5, min: 0, max: 7, step: 1, kind: 'shape' },
    uShape4: { value: 4, min: 0, max: 7, step: 1, kind: 'shape' },
    uShapeMorph: pct(22, 0, 1.5),
  },
  flow: {
    uPointSize: pct(28, 0.5, 8),
    uParticleCount: {
      value: 35,
      min: 5,
      max: 100,
      step: 1,
      kind: 'particles',
      shaderMin: 2000,
      shaderMax: 30000,
      rebuild: true,
    },
    uFieldScale: pct(40, 0.5, 6),
    uNoiseScale: pct(32, 0.3, 5),
    uTrailAlpha: pct(24, 0.02, 0.25),
  },
  metaballs: {
    uBallCount: count(7, 3, 12),
    uSoftness: pct(35, 0.2, 1.2),
    uEdgeGlow: pct(40, 0, 3),
    uZoom: pct(40, 0.4, 2.5),
  },
  ribbons: {
    uRibbonCount: count(5, 2, 10),
    uThickness: pct(30, 0.01, 0.12),
    uTwistAmount: pct(38, 0, 4),
  },
};
