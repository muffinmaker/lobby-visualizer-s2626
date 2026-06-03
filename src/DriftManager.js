import { randomizeUniform } from './randomize.js';

const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

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
    this.channels = new Map();
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
    ch.to = enabled ? randomizeUniform(key, spec) ?? currentValue : currentValue;
    ch.phase = enabled ? 'blend' : 'wait';
    ch.elapsed = 0;
  }

  setEnabledMany(entries, enabled, currentValues) {
    for (const [key, spec] of entries) {
      if (spec.rebuild) continue;
      this.setEnabled(key, spec, enabled, currentValues[key] ?? spec.value);
    }
  }

  resetFrom(key, value) {
    const ch = this.channels.get(key);
    if (!ch || !ch.enabled) return;
    ch.from = value;
    ch.to = randomizeUniform(key, ch.spec) ?? value;
    ch.phase = 'blend';
    ch.elapsed = 0;
  }

  update(dt, currentValues) {
    const blended = {};
    let hasUpdate = false;
    const step = dt * this.getSpeedFactor();

    for (const [key, ch] of this.channels) {
      if (!ch.enabled || !ch.spec || ch.spec.rebuild) continue;

      if (ch.phase === 'wait') {
        ch.elapsed += step;
        blended[key] = Math.round(ch.from);
        hasUpdate = true;
        if (ch.elapsed >= this.interval) {
          ch.from = currentValues[key] ?? ch.from;
          ch.to = randomizeUniform(key, ch.spec) ?? ch.from;
          ch.phase = 'blend';
          ch.elapsed = 0;
        }
        continue;
      }

      ch.elapsed += step;
      const t = Math.min(ch.elapsed / this.duration, 1);
      blended[key] = Math.round(lerp(ch.from, ch.to, easeInOut(t)));
      hasUpdate = true;

      if (t >= 1) {
        ch.from = ch.to;
        ch.phase = 'wait';
        ch.elapsed = 0;
      }
    }

    return hasUpdate ? blended : null;
  }
}
