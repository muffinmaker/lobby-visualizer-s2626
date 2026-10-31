import { randomizeUniform } from './randomize.js';
import { canDrift, isDiscreteDriftSpec } from './driftUtils.js';

const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export const DRIFT_MODES = {
  Random: 'random',
  'Left to right': 'ltr',
  'Right to left': 'rtl',
  'Ping-pong': 'pingpong',
};

const LIMIT_INSET = {
  1: 0.06,
  2: 0.12,
  3: 0.2,
  4: 0.28,
  5: 0.38,
};

function blendDriftValue(from, to, t, spec) {
  const eased = easeInOut(t);
  if (isDiscreteDriftSpec(spec)) {
    return Math.round(lerp(from, to, eased));
  }
  return Math.round(lerp(from, to, eased));
}

function createChannel(spec, value) {
  return {
    enabled: false,
    spec,
    from: value,
    to: value,
    phase: 'wait',
    elapsed: 0,
  };
}

export class DriftManager {
  constructor() {
    this.interval = 90;
    this.duration = 55;
    this.speed = 30;
    this.speedAuto = true;
    this.mode = 'random';
    this.limit = 2;
    this.shaderId = null;
    this.channels = new Map();
  }

  setShader(shaderId) {
    this.shaderId = shaderId ?? null;
  }

  setMode(mode) {
    if (DRIFT_MODES[mode]) this.mode = DRIFT_MODES[mode];
    else if (Object.values(DRIFT_MODES).includes(mode)) this.mode = mode;
    else this.mode = 'random';
  }

  setLimit(level) {
    const next = Math.round(Number(level));
    this.limit = Math.max(1, Math.min(5, Number.isFinite(next) ? next : 2));
  }

  boundsFor(spec) {
    const min = spec?.min ?? 0;
    const max = spec?.max ?? 100;
    const inset = (LIMIT_INSET[this.limit] ?? 0.12) * (max - min);
    const lo = min + inset;
    const hi = Math.max(lo, max - inset);
    return { min: lo, max: hi };
  }

  clampToLimit(value, spec) {
    const { min, max } = this.boundsFor(spec);
    return Math.round(Math.max(min, Math.min(max, value)));
  }

  pickTarget(key, spec, current, direction) {
    const { min, max } = this.boundsFor(spec);
    if (this.mode === 'ltr') return Math.round(direction === 'low' ? min : max);
    if (this.mode === 'rtl') return Math.round(direction === 'high' ? max : min);
    if (this.mode === 'pingpong') return Math.round(direction === 'high' ? max : min);
    const rolled = randomizeUniform(key, spec, { shaderId: this.shaderId });
    return this.clampToLimit(rolled ?? current, spec);
  }

  nextDirection(ch, arrived) {
    if (this.mode === 'ltr') return 'high';
    if (this.mode === 'rtl') return 'low';
    if (this.mode === 'pingpong') return arrived >= (this.boundsFor(ch.spec).min + this.boundsFor(ch.spec).max) / 2 ? 'low' : 'high';
    return 'high';
  }

  getSpeedFactor() {
    if (this.speedAuto) return 1;
    // 1 = very slow, 50 = normal, 100 = fast
    return 0.12 + (this.speed / 100) * 2.88;
  }

  register(key, spec, value) {
    if (!this.channels.has(key)) {
      this.channels.set(key, createChannel(spec, value));
    } else {
      const ch = this.channels.get(key);
      ch.spec = spec;
    }
  }

  unregister(key) {
    this.channels.delete(key);
  }

  isEnabled(key) {
    return this.channels.get(key)?.enabled ?? false;
  }

  setEnabled(key, spec, enabled, currentValue) {
    let ch = this.channels.get(key);
    if (!ch) {
      ch = createChannel(spec, currentValue);
      this.channels.set(key, ch);
    }

    ch.enabled = enabled;
    ch.spec = spec;
    ch.from = currentValue;
    ch.dir = this.mode === 'rtl' ? 'low' : 'high';
    ch.to = enabled ? this.pickTarget(key, spec, currentValue, ch.dir) : currentValue;
    ch.phase = enabled ? 'blend' : 'wait';
    ch.elapsed = 0;
  }

  setEnabledMany(entries, enabled, currentValues) {
    for (const [key, spec] of entries) {
      if (!canDrift(spec)) continue;
      this.setEnabled(key, spec, enabled, currentValues[key] ?? spec.value);
    }
  }

  resetFrom(key, value) {
    const ch = this.channels.get(key);
    if (!ch || !ch.enabled) return;
    ch.from = value;
    ch.dir = this.mode === 'rtl' ? 'low' : 'high';
    ch.to = this.pickTarget(key, ch.spec, value, ch.dir) ?? value;
    ch.phase = 'blend';
    ch.elapsed = 0;
  }

  update(dt, currentValues) {
    const blended = {};
    let hasUpdate = false;
    const step = dt * this.getSpeedFactor();

    for (const [key, ch] of this.channels) {
      if (!ch.enabled || !ch.spec || !canDrift(ch.spec)) continue;

      if (ch.phase === 'wait') {
        ch.elapsed += step;
        blended[key] = Math.round(ch.from);
        hasUpdate = true;
        if (ch.elapsed >= this.interval) {
          ch.from = currentValues[key] ?? ch.from;
          if (this.mode === 'ltr') {
            ch.from = Math.round(this.boundsFor(ch.spec).min);
            ch.dir = 'high';
          } else if (this.mode === 'rtl') {
            ch.from = Math.round(this.boundsFor(ch.spec).max);
            ch.dir = 'low';
          } else if (this.mode === 'pingpong') {
            ch.dir = this.nextDirection(ch, ch.from);
          }
          ch.to = this.pickTarget(key, ch.spec, ch.from, ch.dir) ?? ch.from;
          ch.phase = 'blend';
          ch.elapsed = 0;
        }
        continue;
      }

      ch.elapsed += step;
      const t = Math.min(ch.elapsed / this.duration, 1);
      blended[key] = blendDriftValue(ch.from, ch.to, t, ch.spec);
      hasUpdate = true;

      if (t >= 1) {
        ch.from = ch.to;
        if (this.mode === 'pingpong') ch.dir = ch.dir === 'high' ? 'low' : 'high';
        ch.phase = 'wait';
        ch.elapsed = 0;
      }
    }

    return hasUpdate ? blended : null;
  }
}
