import * as THREE from 'three';
import { SHADERS, GLOBAL_UNIFORMS } from './shaders/index.js';
import { toShaderValues } from './uniformMap.js';
import { UniformSmoother } from './UniformSmoother.js';

const FULLSCREEN_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const TRAIL_FRAG = `
uniform sampler2D uPrev;
uniform float uDecay;
uniform vec3 uFadeColor;
uniform float uPreserveHue;
varying vec2 vUv;

void main() {
  vec4 prev = texture2D(uPrev, vUv);
  if (uPreserveHue > 0.5) {
    // Dim trails without pulling saturated strokes toward the background grey.
    float ink = max(
      max(abs(prev.r - uFadeColor.r), abs(prev.g - uFadeColor.g)),
      abs(prev.b - uFadeColor.b)
    );
    vec3 faded = prev.rgb * uDecay;
    prev.rgb = mix(uFadeColor, faded, smoothstep(0.008, 0.04, ink));
    float peak = max(max(prev.r, prev.g), prev.b);
    if (peak > 0.98) prev.rgb *= 0.98 / peak;
  } else {
    prev.rgb = mix(uFadeColor, prev.rgb, uDecay);
    // Additive strokes can clip to white — ease bright buildup back toward the fade tint.
    float lum = dot(prev.rgb, vec3(0.299, 0.587, 0.114));
    float wash = smoothstep(0.32, 0.88, lum);
    prev.rgb = mix(prev.rgb, mix(uFadeColor, prev.rgb, 0.42), wash * 0.82);
  }
  gl_FragColor = vec4(prev.rgb, 1.0);
}`;

function buildUniforms(shaderId, uiValues = {}) {
  const shader = SHADERS[shaderId];
  const specs = { ...GLOBAL_UNIFORMS, ...shader.uniforms };
  const mergedUi = {};

  for (const [key, spec] of Object.entries(specs)) {
    mergedUi[key] = uiValues[key] ?? spec.value;
  }

  const shaderValues = toShaderValues(mergedUi, shaderId);
  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uAspect: { value: 1 },
  };

  for (const [key] of Object.entries(specs)) {
    uniforms[key] = { value: shaderValues[key] };
  }

  return uniforms;
}

function isPointShader(id) {
  return id === 'spiro' || id === 'flow';
}

function usesFeedbackTrails(shaderId) {
  return isPointShader(shaderId) || shaderId === 'spocks';
}

function isTrailBlended(shaderId, points) {
  return points || shaderId === 'spocks';
}

function wrapFragment(source) {
  const body = source.replace(/\bvarying vec2 vUv;\s*/g, '');
  return `#include <common>\nvarying vec2 vUv;\n${body}`;
}

function createPointGeometry(count, extraAttributes = {}) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  for (const [name, data] of Object.entries(extraAttributes)) {
    geometry.setAttribute(name, new THREE.BufferAttribute(data.array, data.itemSize));
  }
  geometry.setDrawRange(0, count);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4);
  return geometry;
}

const SPIRO_MAX_ORBITS = 10;

function createSpiroGeometry(count = SPIRO_MAX_ORBITS) {
  const indices = new Float32Array(count);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    indices[i] = i;
    phases[i] = (i / Math.max(count, 1)) * Math.PI * 2;
  }
  const geometry = createPointGeometry(count, {
    aIndex: { array: indices, itemSize: 1 },
    aPhase: { array: phases, itemSize: 1 },
  });
  geometry.userData.maxOrbits = count;
  return geometry;
}

const FLOW_MAX_PARTICLES = 30000;
const FLOW_LITE_MAX_PARTICLES = 6000;
const FLOW_MIN_PARTICLES = 500;

function flowMaxParticles(liteMode = false) {
  return liteMode ? FLOW_LITE_MAX_PARTICLES : FLOW_MAX_PARTICLES;
}

function createFlowGeometry(count = FLOW_MAX_PARTICLES) {
  const seeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    seeds[i * 3] = (Math.random() - 0.5) * 2;
    seeds[i * 3 + 1] = (Math.random() - 0.5) * 2;
    seeds[i * 3 + 2] = Math.random();
  }
  const geometry = createPointGeometry(count, {
    aSeed: { array: seeds, itemSize: 3 },
  });
  geometry.userData.maxParticles = count;
  return geometry;
}

function flowDrawCount(shaderParticleCount, maxParticles = FLOW_MAX_PARTICLES) {
  return Math.max(
    FLOW_MIN_PARTICLES,
    Math.min(maxParticles, Math.floor(shaderParticleCount)),
  );
}

function setFlowParticleDrawRange(geometry, shaderParticleCount, maxParticles = FLOW_MAX_PARTICLES) {
  geometry.setDrawRange(0, flowDrawCount(shaderParticleCount, maxParticles));
}

function ensureFlowGeometryCapacity(geometry, liteMode = false) {
  const max = flowMaxParticles(liteMode);
  const capacity = geometry?.attributes?.position?.count ?? 0;
  if (capacity >= max) return geometry;
  geometry?.dispose();
  return createFlowGeometry(max);
}

function createFullscreenQuad() {
  return new THREE.PlaneGeometry(2, 2);
}

function feedbackScale(shaderId, resolutionScale = 100, liteMode = false) {
  const base = shaderId === 'spocks' ? (liteMode ? 0.42 : 0.55) : liteMode ? 0.42 : 0.7;
  return base * (resolutionScale / 100);
}

function shaderPixelRatioCap(shaderId, liteMode = false) {
  if (shaderId === 'spocks') return 1;
  return liteMode ? 1 : 1.5;
}

// Shaders that multiply accumulated uTime by a speed-dependent factor in the fragment shader.
const TIME_SPEED_FACTORS = {
  kaleido: (speed) => 1 + 2 * speed,
  wormhole: (speed) => 0.3 + 0.65 * speed,
};

function compensateAnimPhase(animPhase, shaderId, prevSpeed, nextSpeed) {
  const factor = TIME_SPEED_FACTORS[shaderId];
  if (!factor) return animPhase;
  const oldFactor = factor(prevSpeed);
  const newFactor = factor(nextSpeed);
  if (newFactor < 1e-7 || Math.abs(oldFactor - newFactor) < 1e-8) return animPhase;
  return animPhase * (oldFactor / newFactor);
}

export function defaultResolutionScale() {
  if (/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)) return 75;
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) return 85;
  return 100;
}

export class Visualizer {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.currentShaderId = 'spocks';
    this.values = {};
    this.motionTrails = 100;
    this.trailsNeverDecay = false;
    this.resolutionScale = defaultResolutionScale();
    this.liteMode = false;
    this.backgroundColor = new THREE.Color(0x020208);
    this.uniformSmoother = new UniformSmoother(1.4);
    this.animPhase = 0;
    this.lastAnimSpeed = null;

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(this.effectivePixelRatio());
    this.renderer.setClearColor(this.backgroundColor, 1);
    container.appendChild(this.renderer.domElement);

    this.pointScene = new THREE.Scene();
    this.pointCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    this.pointCamera.position.z = 4;

    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.trailTargets = [];
    this.trailScene = new THREE.Scene();
    this.trailMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPrev: { value: null },
        uDecay: { value: 0.92 },
        uFadeColor: { value: new THREE.Color(0x020208) },
        uPreserveHue: { value: 0 },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: wrapFragment(TRAIL_FRAG),
      depthTest: false,
      depthWrite: false,
    });
    this.trailScene.add(new THREE.Mesh(createFullscreenQuad(), this.trailMaterial));

    this.compositeScene = new THREE.Scene();
    this.compositeMaterial = new THREE.MeshBasicMaterial({ map: null, depthTest: false, depthWrite: false });
    this.compositeScene.add(new THREE.Mesh(createFullscreenQuad(), this.compositeMaterial));

    this.meshes = {};
    this.materials = {};
    this.geometries = {
      spiro: createSpiroGeometry(),
      flow: createFlowGeometry(),
    };
    this.geometries.spiro.setDrawRange(0, 6);

    this.initPasses();
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
    this.onResize();
  }

  initPasses() {
    for (const id of Object.keys(SHADERS)) {
      this.addShaderPass(id);
    }
  }

  addShaderPass(id) {
    if (this.meshes[id]) return;

    const shader = SHADERS[id];
    const points = isPointShader(id);
    const geometry = points
      ? id === 'flow'
        ? this.geometries.flow
        : this.geometries.spiro
      : createFullscreenQuad();

    const trailBlended = isTrailBlended(id, points);
    const material = new THREE.ShaderMaterial({
      uniforms: buildUniforms(id, this.values),
      vertexShader: points ? shader.vertex : shader.vertex || FULLSCREEN_VERT,
      fragmentShader: wrapFragment(shader.fragment),
      transparent: trailBlended,
      depthTest: false,
      depthWrite: false,
      blending: points ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    const mesh = points
      ? new THREE.Points(geometry, material)
      : new THREE.Mesh(geometry, material);

    if (points) mesh.frustumCulled = false;
    mesh.visible = id === this.currentShaderId;
    (points ? this.pointScene : this.quadScene).add(mesh);
    this.meshes[id] = mesh;
    this.materials[id] = material;
  }

  registerShader(id) {
    this.addShaderPass(id);
  }

  effectivePixelRatio() {
    const cap = shaderPixelRatioCap(this.currentShaderId, this.liteMode);
    return Math.min(window.devicePixelRatio, cap) * (this.resolutionScale / 100);
  }

  recreateTrailBuffers() {
    const scale = feedbackScale(this.currentShaderId, this.resolutionScale, this.liteMode);
    const w = Math.max(1, Math.floor(this.renderer.domElement.width * scale));
    const h = Math.max(1, Math.floor(this.renderer.domElement.height * scale));
    this.trailTargets.forEach((rt) => rt.dispose());
    this.trailTargets = [];

    for (let i = 0; i < 2; i++) {
      this.trailTargets.push(
        new THREE.WebGLRenderTarget(w, h, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
        }),
      );
    }
  }

  usesTrails(shaderId) {
    if (this.liteMode || this.motionTrails <= 0) return false;
    return usesFeedbackTrails(shaderId);
  }

  setLiteMode(enabled) {
    const next = Boolean(enabled);
    if (next === this.liteMode) return;
    this.liteMode = next;

    if (next && this.geometries.flow) {
      const cap = flowMaxParticles(true);
      const current = this.geometries.flow.attributes?.position?.count ?? 0;
      if (current > cap) {
        this.geometries.flow.dispose();
        this.geometries.flow = createFlowGeometry(cap);
        if (this.meshes.flow) this.meshes.flow.geometry = this.geometries.flow;
      }
    }

    this.clearTrailBuffers();
    this.renderer.setPixelRatio(this.effectivePixelRatio());
    this.onResize();
  }

  clearTrailBuffers() {
    if (!this.trailTargets.length) return;
    for (const rt of this.trailTargets) {
      this.renderer.setRenderTarget(rt);
      this.renderer.setClearColor(this.backgroundColor, 1);
      this.renderer.clear();
    }
    this.renderer.setRenderTarget(null);
  }

  setShader(shaderId, uiValues = this.values) {
    if (!SHADERS[shaderId]) return;
    const prev = this.currentShaderId;
    this.currentShaderId = shaderId;
    for (const [id, mesh] of Object.entries(this.meshes)) {
      mesh.visible = id === shaderId;
    }

    if (prev !== shaderId) {
      const shaderValues = toShaderValues(uiValues, shaderId);
      this.ensureMaterialUniforms(shaderId, shaderValues);
      this.uniformSmoother.snap(shaderValues);
      this.lastAnimSpeed = null;
      this.clearTrailBuffers();
      if (shaderId === 'spiro' && shaderValues.uOrbitCount !== undefined) {
        const pens = Math.min(
          SPIRO_MAX_ORBITS,
          Math.max(1, Math.floor(shaderValues.uOrbitCount)),
        );
        this.geometries.spiro.setDrawRange(0, pens);
      }
      if (shaderId === 'flow') {
        this.geometries.flow = ensureFlowGeometryCapacity(this.geometries.flow, this.liteMode);
        this.meshes.flow.geometry = this.geometries.flow;
        if (shaderValues.uParticleCount !== undefined) {
          setFlowParticleDrawRange(
            this.geometries.flow,
            shaderValues.uParticleCount,
            flowMaxParticles(this.liteMode),
          );
        }
      }
    }

    const dpr = this.effectivePixelRatio();
    if (prev !== shaderId || this.renderer.getPixelRatio() !== dpr) {
      this.renderer.setPixelRatio(dpr);
      this.onResize();
    } else if (
      feedbackScale(prev, this.resolutionScale, this.liteMode)
      !== feedbackScale(shaderId, this.resolutionScale, this.liteMode)
    ) {
      this.recreateTrailBuffers();
    }
  }

  setResolutionScale(scale) {
    const next = Math.max(25, Math.min(100, Math.round(scale)));
    if (next === this.resolutionScale) return;
    this.resolutionScale = next;
    this.renderer.setPixelRatio(this.effectivePixelRatio());
    this.onResize();
  }

  applySmoothedUniforms(material, values) {
    for (const [key, uniform] of Object.entries(material.uniforms)) {
      if (key in values && key !== 'uTime') {
        uniform.value = values[key];
      }
    }

    this.applyTrailDecay(values);

    if (values.uBgRed !== undefined) {
      this.backgroundColor.setRGB(
        values.uBgRed,
        values.uBgGreen ?? this.backgroundColor.g,
        values.uBgBlue ?? this.backgroundColor.b,
      );
      this.renderer.setClearColor(this.backgroundColor, 1);
      this.trailMaterial.uniforms.uFadeColor.value.copy(this.backgroundColor);
    }
  }

  ensureMaterialUniforms(shaderId, shaderValues) {
    const material = this.materials[shaderId];
    if (!material) return;
    for (const [key, value] of Object.entries(shaderValues)) {
      if (!material.uniforms[key]) {
        material.uniforms[key] = { value };
      }
    }
  }

  applyTrailDecay(values) {
    if (!this.usesTrails(this.currentShaderId)) return;

    let baseDecay;
    if (values.uTrailDecay !== undefined) {
      baseDecay = values.uTrailDecay;
    } else if (values.uTrailAlpha !== undefined) {
      baseDecay = 1 - values.uTrailAlpha;
    } else {
      baseDecay = 0.9;
    }

    const minDecay = 0.68;
    let decay = minDecay + (baseDecay - minDecay);
    if (this.trailsNeverDecay) {
      decay = Math.min(decay, 0.93);
    } else {
      decay = Math.min(decay, 0.96);
    }
    this.trailMaterial.uniforms.uDecay.value = decay;
  }

  applyValues(uiValues, { syncSmooth = false, deferRebuild = false } = {}) {
    if (uiValues.motionTrails !== undefined) {
      const trails = Math.max(0, Math.min(100, Math.round(uiValues.motionTrails)));
      this.motionTrails = this.liteMode ? 0 : trails;
    }
    if (uiValues.trailsNeverDecay !== undefined) {
      this.trailsNeverDecay = Boolean(uiValues.trailsNeverDecay);
    }
    this.values = { ...uiValues };
    const shaderValues = toShaderValues(uiValues, this.currentShaderId);
    this.ensureMaterialUniforms(this.currentShaderId, shaderValues);
    this.uniformSmoother.setTargets(shaderValues);
    if (syncSmooth) {
      this.uniformSmoother.syncCurrent(shaderValues);
    }

    if (deferRebuild) return;

    if (this.currentShaderId === 'spiro' && shaderValues.uOrbitCount !== undefined) {
      const pens = Math.min(
        SPIRO_MAX_ORBITS,
        Math.max(1, Math.floor(shaderValues.uOrbitCount)),
      );
      this.geometries.spiro.setDrawRange(0, pens);
    }

    if (this.currentShaderId === 'flow' && shaderValues.uParticleCount !== undefined) {
      const flowMax = flowMaxParticles(this.liteMode);
      this.geometries.flow = ensureFlowGeometryCapacity(this.geometries.flow, this.liteMode);
      if (this.meshes.flow) this.meshes.flow.geometry = this.geometries.flow;
      setFlowParticleDrawRange(this.geometries.flow, shaderValues.uParticleCount, flowMax);
    }
  }

  onResize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(this.effectivePixelRatio());
    this.renderer.setSize(w, h, false);

    const rw = this.renderer.domElement.width;
    const rh = this.renderer.domElement.height;
    this.pointCamera.aspect = w / h;
    this.pointCamera.updateProjectionMatrix();

    for (const material of Object.values(this.materials)) {
      material.uniforms.uResolution.value.set(rw, rh);
      material.uniforms.uAspect.value = w / h;
    }

    this.recreateTrailBuffers();
  }

  renderScene(target = null) {
    const shaderId = this.currentShaderId;
    this.renderer.setRenderTarget(target);
    if (isPointShader(shaderId)) {
      this.renderer.render(this.pointScene, this.pointCamera);
    } else {
      this.renderer.render(this.quadScene, this.quadCamera);
    }
  }

  render() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const shaderId = this.currentShaderId;
    const material = this.materials[shaderId];
    if (!material) return dt;

    const smoothed = this.uniformSmoother.update(dt);
    this.applySmoothedUniforms(material, smoothed);

    if (shaderId === 'flow' && smoothed.uParticleCount !== undefined) {
      setFlowParticleDrawRange(
        this.geometries.flow,
        smoothed.uParticleCount,
        flowMaxParticles(this.liteMode),
      );
    }
    const nextSpeed = Math.max(smoothed.uSpeed ?? 0.05, 0.001);
    const prevSpeed = this.lastAnimSpeed ?? nextSpeed;
    this.animPhase = compensateAnimPhase(this.animPhase, shaderId, prevSpeed, nextSpeed);
    this.animPhase += dt * (prevSpeed + nextSpeed) * 0.5;
    this.lastAnimSpeed = nextSpeed;
    material.uniforms.uTime.value = this.animPhase;

    const useTrails = this.usesTrails(shaderId);

    if (useTrails && this.trailTargets.length >= 2) {
      const [prev, next] = this.trailTargets;

      this.trailMaterial.uniforms.uPrev.value = prev.texture;
      this.renderer.setRenderTarget(next);
      this.renderer.setClearColor(this.backgroundColor, 1);
      this.renderer.clear();
      this.renderer.render(this.trailScene, this.quadCamera);

      this.renderer.autoClear = false;
      this.renderScene(next);

      this.renderer.setRenderTarget(null);
      this.renderer.autoClear = true;
      this.renderer.setClearColor(this.backgroundColor, 1);
      this.renderer.clear();
      this.compositeMaterial.map = next.texture;
      this.compositeMaterial.needsUpdate = true;
      this.renderer.render(this.compositeScene, this.quadCamera);

      this.trailTargets.reverse();
    } else {
      this.renderer.setRenderTarget(null);
      this.renderer.setClearColor(this.backgroundColor, 1);
      this.renderer.clear();
      this.renderScene(null);
    }

    return dt;
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    for (const rt of this.trailTargets) rt.dispose();
    for (const geo of Object.values(this.geometries)) geo.dispose();
    for (const mat of Object.values(this.materials)) mat.dispose();
    this.trailMaterial.dispose();
    this.compositeMaterial.dispose();
    this.renderer.dispose();
  }
}
