const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;

const SHADER_MODS = {
  spiro: ['uPulse', 'uTwist', 'uZoom'],
  flow: ['uFieldScale', 'uNoiseScale', 'uTrailAlpha'],
  spocks: ['uColorSpeed', 'uWobble', 'uZoom'],
  kaleido: ['uWarp', 'uLineWidth', 'uShapeMorph', 'uCenterStrength'],
  metaballs: ['uEdgeGlow', 'uSoftness'],
  ribbons: ['uTwistAmount', 'uThickness'],
};

function statusFromError(err, source) {
  if (!err) return 'Capture failed';
  if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
    return source === 'tab' ? 'Share cancelled or denied' : 'Mic permission denied';
  }
  if (err.name === 'AbortError') return 'Cancelled';
  if (err.name === 'NotFoundError') return 'No microphone found';
  if (err.name === 'NotReadableError') return 'Audio device busy';
  if (err.name === 'NotSupportedError' || err.name === 'SecurityError') {
    return 'Needs HTTPS or localhost';
  }
  if (err.message?.includes('audio')) return 'No audio — enable tab audio';
  return err.message || 'Capture failed';
}

export class MusicMode {
  constructor() {
    this.enabled = false;
    this.source = 'mic';
    this.sensitivity = 65;
    this.response = 55;
    this.level = 0;
    this.status = 'Off';

    this.audioContext = null;
    this.analyser = null;
    this.gainNode = null;
    this.stream = null;
    this.sourceNode = null;
    this.freqData = null;
    this.videoTracks = [];

    this.baseValues = null;
    this.smoothed = { bass: 0, mid: 0, treble: 0, energy: 0, beat: 0 };
    this.beatHold = 0;
    this.peakEnergy = 0.08;
    this.onDisabled = null;
  }

  captureBaseline(values) {
    this.baseValues = { ...values };
  }

  async setEnabled(enabled, getBaseValues) {
    if (enabled) {
      this.captureBaseline(getBaseValues());
      try {
        await this.startCapture();
        this.enabled = true;
      } catch {
        this.enabled = false;
        this.baseValues = null;
      }
      return this.enabled;
    }

    await this.stopCapture();
    this.enabled = false;
    this.baseValues = null;
    this.level = 0;
    this.status = 'Off';
    this.smoothed = { bass: 0, mid: 0, treble: 0, energy: 0, beat: 0 };
    return false;
  }

  async setSource(source, getBaseValues) {
    this.source = source;
    if (!this.enabled) return;
    this.captureBaseline(getBaseValues());
    try {
      await this.startCapture();
    } catch {
      this.enabled = false;
      this.onDisabled?.();
    }
  }

  async requestStream() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw Object.assign(new Error('Not supported'), { name: 'NotSupportedError' });
    }

    if (this.source === 'tab') {
      if (!navigator.mediaDevices.getDisplayMedia) {
        throw Object.assign(new Error('Tab capture unavailable'), { name: 'NotSupportedError' });
      }
      return navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
    }

    return navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
  }

  async startCapture() {
    await this.stopCapture();

    let stream;
    try {
      stream = await this.requestStream();
    } catch (err) {
      this.status = statusFromError(err, this.source);
      throw err;
    }

    if (!stream.getAudioTracks().length) {
      stream.getTracks().forEach((t) => t.stop());
      this.status =
        this.source === 'tab'
          ? 'No audio — check Share tab audio'
          : 'No audio input found';
      throw new Error(this.status);
    }

    try {
      this.stream = stream;
      this.videoTracks = stream.getVideoTracks();

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      await this.audioContext.resume();

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.35;
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0;

      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.status = this.source === 'tab' ? 'Tab audio' : 'Microphone';

      const audioTrack = stream.getAudioTracks()[0];
      audioTrack.addEventListener('ended', () => {
        this.enabled = false;
        this.stopCapture();
        this.status = 'Capture ended';
        this.onDisabled?.();
      });

      for (const track of this.videoTracks) {
        track.enabled = false;
      }
    } catch (err) {
      stream.getTracks().forEach((t) => t.stop());
      this.status = statusFromError(err, this.source);
      throw err;
    }
  }

  async stopCapture() {
    this.sourceNode?.disconnect();
    this.analyser?.disconnect();
    this.gainNode?.disconnect();
    this.sourceNode = null;
    this.analyser = null;
    this.gainNode = null;
    this.freqData = null;

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.videoTracks = [];

    if (this.audioContext) {
      await this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  analyze() {
    if (!this.analyser || !this.freqData) {
      return { bass: 0, mid: 0, treble: 0, energy: 0, beat: 0 };
    }

    this.analyser.getByteFrequencyData(this.freqData);
    const len = this.freqData.length;
    const bassEnd = Math.max(1, Math.floor(len * 0.07));
    const midEnd = Math.max(bassEnd + 1, Math.floor(len * 0.42));

    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;
    let total = 0;

    for (let i = 0; i < bassEnd; i++) bassSum += this.freqData[i];
    for (let i = bassEnd; i < midEnd; i++) midSum += this.freqData[i];
    for (let i = midEnd; i < len; i++) trebleSum += this.freqData[i];
    for (let i = 0; i < len; i++) total += this.freqData[i];

    const bass = bassSum / bassEnd / 255;
    const mid = midSum / (midEnd - bassEnd) / 255;
    const treble = trebleSum / (len - midEnd) / 255;
    const energy = total / len / 255;

    this.peakEnergy = Math.max(energy * 1.05, this.peakEnergy * 0.9995);
    const norm = energy / Math.max(this.peakEnergy, 0.04);

    let beat = 0;
    if (norm > 0.72 && this.beatHold <= 0) {
      beat = 1;
      this.beatHold = 0.14;
    }
    if (this.beatHold > 0) this.beatHold -= 0.016;

    return { bass, mid, treble, energy: norm, beat };
  }

  update(dt) {
    if (!this.enabled || !this.baseValues) return null;

    const raw = this.analyze();
    const k = 1 - Math.exp(-dt / (0.05 + (100 - this.response) / 200));

    for (const key of Object.keys(this.smoothed)) {
      const target = key === 'beat' ? raw.beat : raw[key];
      this.smoothed[key] = lerp(this.smoothed[key], target, k);
      if (key === 'beat' && this.smoothed.beat < 0.02) this.smoothed.beat = 0;
    }

    this.level = Math.round(
      clamp((this.smoothed.energy * 0.5 + this.smoothed.bass * 0.3 + this.smoothed.beat * 0.2) * 100, 0, 100),
    );

    return this.getModulatedValues();
  }

  getModulatedValues() {
    if (!this.enabled || !this.baseValues) return null;

    const b = this.baseValues;
    const { bass, mid, treble, energy, beat } = this.smoothed;
    const s = this.sensitivity / 100;
    const out = { ...b };

    out.uSpeed = clamp(Math.round(b.uSpeed + energy * 38 * s + beat * 22 * s), 0, 100);
    out.uScale = clamp(Math.round(b.uScale + bass * 28 * s - treble * 6 * s), 0, 100);
    out.uComplexity = clamp(Math.round(b.uComplexity + mid * 32 * s + treble * 10 * s), 0, 100);
    out.uBrightness = clamp(Math.round(b.uBrightness + treble * 30 * s + energy * 12 * s), 0, 100);
    out.uSaturation = clamp(Math.round(b.uSaturation + mid * 22 * s + beat * 8 * s), 0, 100);
    out.uBloom = clamp(Math.round(b.uBloom + treble * 35 * s + beat * 28 * s), 0, 100);

    const shaderKeys = SHADER_MODS[this.currentShader] ?? [];
    for (const key of shaderKeys) {
      if (!(key in b)) continue;
      if (key.includes('Pulse') || key.includes('Edge') || key.includes('Warp')) {
        out[key] = clamp(Math.round(b[key] + bass * 30 * s + beat * 20 * s), 0, 100);
      } else if (key.includes('Twist') || key.includes('Rotate') || key.includes('Noise')) {
        out[key] = clamp(Math.round(b[key] + mid * 28 * s + energy * 10 * s), 0, 100);
      } else if (key.includes('Zoom') || key.includes('Field') || key.includes('Scale')) {
        out[key] = clamp(Math.round(b[key] + bass * 24 * s - mid * 8 * s), 0, 100);
      } else if (key.includes('Trail') || key.includes('Alpha') || key.includes('Line')) {
        out[key] = clamp(Math.round(b[key] + treble * 25 * s + energy * 15 * s), 0, 100);
      } else {
        out[key] = clamp(Math.round(b[key] + energy * 20 * s), 0, 100);
      }
    }

    return out;
  }

  set currentShader(id) {
    this._shaderId = id;
  }

  get currentShader() {
    return this._shaderId ?? 'spocks';
  }
}
