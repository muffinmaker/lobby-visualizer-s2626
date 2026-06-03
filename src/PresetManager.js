import { randomizeSpecs } from './randomize.js';
import { SHADERS, SHADER_IDS, GLOBAL_UNIFORMS } from './shaders/index.js';
import { takePresetName } from './presetNames.js';
import { loadSavedPresets, writeSavedPresets, toStoredPreset } from './SavedPresetStore.js';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function pickRandom(arr, exclude) {
  const choices = exclude ? arr.filter((x) => x !== exclude) : arr;
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
    name: 'J04 Spocks',
    shader: 'spocks',
    values: {
      uSpeed: 8,
      uScale: 45,
      uComplexity: 40,
      uBrightness: 50,
      uSaturation: 67,
      uBloom: 40,
      uUp: 50,
      uDown: 50,
      uScaleY: 50,
      uScaleZ: 50,
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
      uSpeed: 7,
      uScale: 46,
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
      uZoom: 52,
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
      uSpeed: 5,
      uScale: 47,
      uComplexity: 32,
      uBrightness: 50,
      uSaturation: 67,
      uBloom: 45,
      uPointSize: 28,
      uTrailDecay: 72,
      uOrbitCount: 5,
      uTwist: 30,
      uPulse: 17,
      uZoom: 22,
      uPalette: 2,
      uHueShift: 42,
      uColorSpread: 58,
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
      uSpeed: 13,
      uScale: 42,
      uComplexity: 73,
      uBrightness: 60,
      uSaturation: 83,
      uBloom: 65,
      uPointSize: 28,
      uTrailDecay: 82,
      uOrbitCount: 9,
      uTwist: 70,
      uPulse: 47,
      uZoom: 38,
      uPalette: 3,
      uHueShift: 72,
      uColorSpread: 85,
      uTintRed: 255,
      uTintGreen: 120,
      uTintBlue: 220,
    },
  },
];

export class PresetManager {
  constructor() {
    this.presets = [...PRESETS];
    this.loadSavedPresets();
    this.currentIndex = 0;
    this.autoCycle = false;
    this.cycleInterval = 45;
    this.transitionDuration = 6;
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

  getPresetNames() {
    return this.presets.map((p) => p.name);
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

  createRandomPreset(options = {}) {
    const shader = options.shader ?? pickRandom(SHADER_IDS);
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

  saveCurrent({ name, shader, values }) {
    let presetName = name;
    const existingIndex = this.findIndexByName(name);
    const existing = existingIndex >= 0 ? this.presets[existingIndex] : null;

    if (this.isBuiltin(name) || !existing?.custom) {
      presetName = takePresetName(this.allNames());
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
    if (this.isTransitioning && this.fromState) {
      return this.transitionElapsed / this.transitionDuration < 0.5
        ? this.fromState.shader
        : this.toState.shader;
    }
    return this.currentPreset.shader;
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
    const base = { shader: preset.shader, values: { ...preset.values } };
    if (randomize) {
      base.values = randomizeUniforms(preset.shader, base.values);
    }
    return base;
  }

  goTo(index, { immediate = false, randomize = this.randomizeOnCycle } = {}) {
    const nextIndex = ((index % this.presets.length) + this.presets.length) % this.presets.length;
    if (nextIndex === this.currentIndex && !immediate) return;

    const targetPreset = this.presets[nextIndex];
    const toState = this.buildState(targetPreset, randomize);

    if (immediate) {
      this.currentIndex = nextIndex;
      this.isTransitioning = false;
      this.fromState = null;
      this.toState = null;
      this.elapsed = 0;
      this.notify('preset', {
        preset: targetPreset,
        values: toState.values,
        shader: toState.shader,
      });
      return;
    }

    const fromPreset = this.currentPreset;
    this.fromState = this.buildState(fromPreset, false);
    this.toState = toState;
    this.currentIndex = nextIndex;
    this.isTransitioning = true;
    this.transitionElapsed = 0;
    this.elapsed = 0;
    this.notify('transitionStart', {
      from: fromPreset,
      to: targetPreset,
      fromShader: this.fromState.shader,
      toShader: toState.shader,
      toState,
    });
  }

  next(options) {
    this.goTo(this.currentIndex + 1, options);
  }

  prev(options) {
    this.goTo(this.currentIndex - 1, options);
  }

  randomPreset(options = {}) {
    this.createRandomPreset(options);
  }

  goToByName(name, options = {}) {
    const index = this.findIndexByName(name);
    if (index >= 0) this.goTo(index, options);
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
        shader: this.currentPreset.shader,
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

    for (const key of keys) {
      const a = fromValues[key] ?? toValues[key];
      const b = toValues[key] ?? fromValues[key];
      blended[key] = Math.round(lerp(a, b, eased));
    }

    const shader =
      t < 0.5 ? this.fromState.shader : this.toState.shader;

    if (t >= 1) {
      this.isTransitioning = false;
      this.fromState = null;
      this.notify('transitionEnd', {
        preset: this.currentPreset,
        values: toValues,
        shader: this.toState.shader,
      });
      this.toState = null;
    }

    return { shader, values: blended, blend: eased };
  }
}

export { SHADER_IDS, SHADERS, GLOBAL_UNIFORMS, randomizeUniforms };
