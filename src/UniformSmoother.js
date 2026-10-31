const SNAP_KEYS = new Set(['uResolution', 'uAspect', 'uTime']);

const DISCRETE_KEYS = new Set([
  'uSegments',
  'uRingCount',
  'uShapeCount',
  'uCenterShape',
  'uShape2',
  'uShape3',
  'uShape4',
  'uPalette',
  'uPenShape',
  'uTrailShape',
  'uStampShape',
  'uPointShape',
  'uSymmetry',
  'uSpacingMode',
  'uPatternA',
  'uPatternB',
  'uPatternC',
  'uPolygonSides',
  'uIterations',
  'uOrbitCount',
  'uPenCount',
  'uBallCount',
  'uRibbonCount',
  'uChevrons',
]);

export class UniformSmoother {
  constructor(smoothTime = 1.4) {
    this.smoothTime = smoothTime;
    this.current = {};
    this.targets = {};
  }

  setEaseSeconds(seconds) {
    const next = Number(seconds);
    this.easeSeconds = Number.isFinite(next) ? Math.max(0, Math.min(10, next)) : 0.8;
  }

  smoothTimeFor() {
    if (this.easeSeconds != null) return this.easeSeconds;
    return this.smoothTime;
  }

  setTargets(values) {
    for (const [key, value] of Object.entries(values)) {
      if (SNAP_KEYS.has(key)) continue;
      this.targets[key] = value;
      if (!(key in this.current)) {
        this.current[key] = value;
      }
    }
  }

  syncCurrent(values) {
    for (const [key, value] of Object.entries(values)) {
      if (SNAP_KEYS.has(key)) continue;
      this.current[key] = value;
      this.targets[key] = value;
    }
  }

  snap(values = this.targets) {
    this.current = {};
    this.targets = {};
    for (const [key, value] of Object.entries(values)) {
      if (SNAP_KEYS.has(key)) continue;
      this.current[key] = value;
      this.targets[key] = value;
    }
  }

  update(dt) {
    for (const key of Object.keys(this.targets)) {
      const target = this.targets[key];
      if (DISCRETE_KEYS.has(key)) {
        this.current[key] = target;
        continue;
      }
      const current = this.current[key] ?? target;
      const delta = target - current;
      const smoothTime = this.smoothTimeFor();
      if (smoothTime <= 0.02) {
        this.current[key] = target;
        continue;
      }
      const k = 1 - Math.exp(-dt / smoothTime);
      if (Math.abs(delta) < 1e-5) {
        this.current[key] = target;
      } else {
        this.current[key] = current + delta * k;
      }
    }
    return this.current;
  }

  getSpeed() {
    return this.current.uSpeed ?? this.targets.uSpeed ?? 0;
  }
}
