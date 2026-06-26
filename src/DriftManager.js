import { randomizeUniform } from './randomize.js';
import { canDrift, isDiscreteDriftSpec } from './driftUtils.js';

const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

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
    this.shaderId = null;
    this.channels = new Map();
  }

  setShader(shaderId) {
    this.shaderId = shaderId ?? null;
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
    ch.to = enabled ? randomizeUniform(key, spec, { shaderId: this.shaderId }) ?? currentValue : currentValue;
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
    ch.to = randomizeUniform(key, ch.spec, { shaderId: this.shaderId }) ?? value;
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
          ch.to = randomizeUniform(key, ch.spec, { shaderId: this.shaderId }) ?? ch.from;
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
        ch.phase = 'wait';
        ch.elapsed = 0;
      }
    }

    return hasUpdate ? blended : null;
  }
}
