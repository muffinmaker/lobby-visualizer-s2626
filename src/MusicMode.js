import { getSpecMap, uiToShader } from './uniformMap.js';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;

const CHANNEL_KEY = 'lobby-music-channels';
const ASSIGN_KEY = 'lobby-music-assigns';

export const AUDIO_FEATURES = {
  Off: 'off',
  Kick: 'kick',
  'Hi-hat': 'hihat',
  Bass: 'bass',
  Mid: 'mid',
  High: 'high',
  Beat: 'beat',
  BPM: 'bpm',
};

const DEFAULT_CHANNELS = ['kick', 'hihat', 'bass', 'mid', 'high', 'beat', 'bpm', 'off', 'off', 'off'];
const SIGNED_SPIN_KEYS = new Set(['uRotate', 'uTwistAmount']);

const SHADER_MODS = {
  spiro: ['uPulse', 'uTwist', 'uZoom'],
  flow: ['uFieldScale', 'uNoiseScale', 'uTrailAlpha'],
  spocks: ['uRotate', 'uMyTime', 'uZoom'],
  kaleido: ['uWarp', 'uLineWidth', 'uShapeMorph', 'uCenterStrength'],
  metaballs: ['uEdgeGlow', 'uSoftness'],
  wormhole: ['uTunnelDepth', 'uSwirl', 'uHorizonGlow', 'uColorSpeed'],
  ribbons: ['uTwistAmount', 'uThickness'],
  layers: ['uMix', 'uSpeedOffset', 'uLayerScale'],
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
    this.smoothed = {
      bass: 0, mid: 0, treble: 0, high: 0, energy: 0, beat: 0, kick: 0, hihat: 0, bpm: 0,
    };
    this.beatHold = 0;
    this.peakEnergy = 0.08;
    this.clock = 0;
    this.beatTimes = [];
    this.bpm = 0;
    this.channels = this.loadChannels();
    this.assignments = this.loadAssignments();
    this.onDisabled = null;
  }

  loadChannels() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CHANNEL_KEY) || '');
      if (Array.isArray(parsed) && parsed.length === 10) return parsed.map((v) => v || 'off');
    } catch {
      /* ignore */
    }
    return [...DEFAULT_CHANNELS];
  }

  loadAssignments() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ASSIGN_KEY) || '');
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      /* ignore */
    }
    return {};
  }

  setChannelFeature(index, feature) {
    const next = Object.values(AUDIO_FEATURES).includes(feature) ? feature : 'off';
    this.channels[index] = next;
    try {
      localStorage.setItem(CHANNEL_KEY, JSON.stringify(this.channels));
    } catch {
      /* ignore */
    }
  }

  setAssignment(key, channel) {
    if (channel == null || channel === '' || channel === 'off') delete this.assignments[key];
    else this.assignments[key] = Number(channel);
    try {
      localStorage.setItem(ASSIGN_KEY, JSON.stringify(this.assignments));
    } catch {
      /* ignore */
    }
  }

  featureLevel(name) {
    if (!name || name === 'off') return 0;
    if (name === 'bpm') return clamp(this.bpm / 180, 0, 1);
    return this.smoothed[name] ?? 0;
  }

  spinSign(key, ui, spec) {
    if (!SIGNED_SPIN_KEYS.has(key) || !spec) return 1;
    const shader = uiToShader(ui ?? spec.value, spec);
    if (!Number.isFinite(shader) || Math.abs(shader) < 0.04) return 1;
    return Math.sign(shader);
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
    this.smoothed = {
      bass: 0, mid: 0, treble: 0, high: 0, energy: 0, beat: 0, kick: 0, hihat: 0, bpm: 0,
    };
    this.bpm = 0;
    this.beatTimes = [];
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
      return { bass: 0, mid: 0, treble: 0, high: 0, energy: 0, beat: 0, kick: 0, hihat: 0 };
    }

    this.analyser.getByteFrequencyData(this.freqData);
    const len = this.freqData.length;
    const nyquist = (this.audioContext?.sampleRate || 48000) / 2;
    const binHz = nyquist / len;
    const band = (lo, hi) => {
      const a = clamp(Math.floor(lo / binHz), 0, len - 1);
      const b = clamp(Math.ceil(hi / binHz), a + 1, len);
      let sum = 0;
      for (let i = a; i < b; i++) sum += this.freqData[i];
      return sum / (b - a) / 255;
    };

    const kick = band(20, 120);
    const bass = band(20, 250);
    const mid = band(250, 2000);
    const high = band(2000, 8000);
    const hihat = band(6000, 16000);
    const treble = high;
    let total = 0;
    for (let i = 0; i < len; i++) total += this.freqData[i];
    const energy = total / len / 255;

    this.peakEnergy = Math.max(energy * 1.05, this.peakEnergy * 0.9995);
    const norm = energy / Math.max(this.peakEnergy, 0.04);

    let beat = 0;
    if (norm > 0.72 && this.beatHold <= 0) {
      beat = 1;
      this.beatHold = 0.14;
    }
    if (this.beatHold > 0) this.beatHold -= 0.016;

    return { bass, mid, treble, high, energy: norm, beat, kick, hihat };
  }

  update(dt) {
    if (!this.enabled || !this.baseValues) return null;

    const raw = this.analyze();
    const k = 1 - Math.exp(-dt / (0.05 + (100 - this.response) / 200));
    this.clock += dt;
    if (raw.beat > 0.5) {
      this.beatTimes.push(this.clock);
      this.beatTimes = this.beatTimes.filter((t) => this.clock - t < 8);
      if (this.beatTimes.length >= 2) {
        let sum = 0;
        for (let i = 1; i < this.beatTimes.length; i++) sum += this.beatTimes[i] - this.beatTimes[i - 1];
        const avg = sum / (this.beatTimes.length - 1);
        if (avg > 0.22 && avg < 2) this.bpm = lerp(this.bpm || 60 / avg, 60 / avg, 0.35);
      }
    }

    for (const key of Object.keys(this.smoothed)) {
      const target = key === 'bpm' ? clamp(this.bpm / 180, 0, 1) : key === 'beat' ? raw.beat : raw[key] ?? 0;
      this.smoothed[key] = lerp(this.smoothed[key] ?? 0, target, k);
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
    const specs = getSpecMap(this.currentShader);
    const { bass, mid, treble, energy, beat } = this.smoothed;
    const s = this.sensitivity / 100;
    const out = { ...b };
    const signed = (key, amount) => amount * this.spinSign(key, b[key], specs[key]);

    out.uSpeed = clamp(Math.round(b.uSpeed + energy * 38 * s + beat * 22 * s), 0, 400);
    out.uScale = clamp(Math.round(b.uScale + bass * 28 * s - treble * 6 * s), 0, 400);
    const complexityMin = this.currentShader === 'spiro' ? -50 : 0;
    const complexityMax = this.currentShader === 'spiro' ? 20 : 100;
    out.uComplexity = clamp(
      Math.round(b.uComplexity + mid * 32 * s + treble * 10 * s),
      complexityMin,
      complexityMax,
    );
    out.uBrightness = clamp(Math.round(b.uBrightness + treble * 30 * s + energy * 12 * s), 0, 100);
    out.uSaturation = clamp(Math.round(b.uSaturation + mid * 22 * s + beat * 8 * s), 0, 100);
    out.uBloom = clamp(Math.round(b.uBloom + treble * 35 * s + beat * 28 * s), 0, 100);

    const shaderKeys = SHADER_MODS[this.currentShader] ?? [];
    for (const key of shaderKeys) {
      if (!(key in b)) continue;
      if (key.includes('Pulse') || key.includes('Edge') || key.includes('Warp')) {
        out[key] = clamp(Math.round(b[key] + bass * 30 * s + beat * 20 * s), 0, 100);
      } else if (key.includes('Twist') || key.includes('Rotate') || key.includes('Noise')) {
        const push = Math.abs(mid * 28 * s + energy * 10 * s);
        const spec = specs[key];
        out[key] = clamp(
          Math.round(b[key] + signed(key, push)),
          spec?.min ?? 0,
          spec?.max ?? 100,
        );
      } else if (key.includes('Zoom') || key.includes('Field') || key.includes('Scale')) {
        out[key] = clamp(Math.round(b[key] + bass * 24 * s - mid * 8 * s), 0, 400);
      } else if (key.includes('Trail') || key.includes('Alpha') || key.includes('Line')) {
        const lineMax = key === 'uLineWidth' && this.currentShader === 'kaleido' ? 400 : 100;
        out[key] = clamp(Math.round(b[key] + treble * 25 * s + energy * 15 * s), 0, lineMax);
      } else {
        out[key] = clamp(Math.round(b[key] + energy * 20 * s), 0, 100);
      }
    }

    for (const [key, channel] of Object.entries(this.assignments)) {
      const spec = specs[key];
      if (!spec || !(key in b) || channel == null || channel < 0) continue;
      const feature = this.channels[channel];
      if (!feature || feature === 'off') continue;
      const level = this.featureLevel(feature);
      const span = (spec.max - spec.min) * 0.4;
      out[key] = clamp(
        Math.round(b[key] + signed(key, level * span * s)),
        spec.min,
        spec.max,
      );
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
