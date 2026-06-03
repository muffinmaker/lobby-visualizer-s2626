import { GLOBAL_UNIFORMS, SHADER_UNIFORM_TEMPLATES } from '../uniformSpecs.js';

export const SHADERS = {
  spocks: {
    label: 'Spocks (Original)',
    uniforms: { ...SHADER_UNIFORM_TEMPLATES.spocks },
    vertex: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragment: /* glsl */ `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uScale;
      uniform float uBrightness;
      uniform float uSaturation;
      uniform float uUp;
      uniform float uDown;
      uniform float uScaleY;
      uniform float uScaleZ;
      uniform float uWidth;
      uniform float uHeight;
      uniform float uRotate;
      uniform float uMyTime;
      uniform float uZoom;
      uniform float uRed;
      uniform float uGreen;
      uniform float uBlue;
      uniform float uLineWidth;
      uniform float uIterations;
      uniform float uWidthRand;
      uniform float uHeightRand;
      uniform vec2 uResolution;
      uniform float uAspect;

      varying vec2 vUv;

      mat2 rot(float a) {
        float c = cos(a), s = sin(a);
        return mat2(c, -s, s, c);
      }

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float rectOutline(vec2 p, vec2 halfSize, float lw) {
        vec2 q = abs(p) - halfSize;
        float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
        return 1.0 - smoothstep(0.0, lw, abs(d));
      }

      void main() {
        float t = uTime;
        vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0) * uScale;
        uv *= exp(uZoom * 0.08);

        float minRes = min(uResolution.x, uResolution.y);
        float lw = uLineWidth / minRes;

        float nTime = t * 0.01;
        float w = uWidth;
        float h = uHeight;
        if (uWidthRand > 0.5) {
          w *= mix(0.55, 1.45, noise(vec2(t * 0.03, 17.0)));
        }
        if (uHeightRand > 0.5) {
          h *= mix(0.55, 1.45, noise(vec2(t * 0.03, 42.0)));
        }

        vec2 sx = vec2(uMyTime * uScaleZ, uMyTime * uScaleY);
        sx = max(abs(sx), vec2(0.001)) * sign(sx + vec2(0.0001));

        float ang = radians(t * uRotate * 57.2958);
        vec2 offset = vec2(uUp, uDown) * uScale;
        vec2 halfSize = vec2(w, h) * 0.5;

        float edge = 0.0;
        for (float i = 0.0; i < 120.0; i++) {
          if (i >= uIterations) break;

          vec2 scalePow = pow(sx, vec2(i));
          vec2 local = uv / scalePow;
          local = rot(-i * ang) * local;
          local -= offset;

          edge = max(edge, rectOutline(local, halfSize, lw));
          if (edge > 0.98) break;
        }

        float percent = cos(t * 0.5) * 0.5 + 0.5;
        vec3 light = vec3(uRed, uGreen, uBlue);
        vec3 dark = vec3(0.0);
        vec3 fg = mix(light, dark, percent);
        vec3 col = fg * edge * uBrightness;

        float gray = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(gray), col, uSaturation);

        gl_FragColor = vec4(col, edge);
      }
    `,
  },

  spiro: {
    label: 'Spiro Flow',
    uniforms: { ...SHADER_UNIFORM_TEMPLATES.spiro },
    vertex: /* glsl */ `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uScale;
      uniform float uComplexity;
      uniform float uOrbitCount;
      uniform float uTwist;
      uniform float uPulse;
      uniform float uPointSize;
      uniform float uAspect;
      uniform float uZoom;
      uniform float uPalette;
      uniform float uHueShift;
      uniform float uColorSpread;
      uniform float uTintRed;
      uniform float uTintGreen;
      uniform float uTintBlue;

      attribute float aIndex;
      attribute float aPhase;

      varying float vGlow;
      varying vec3 vColor;

      vec3 palette(float t) {
        float p = floor(uPalette + 0.5);
        vec3 offset;
        if (p < 0.5) offset = vec3(0.0, 0.33, 0.67);
        else if (p < 1.5) offset = vec3(0.05, 0.15, 0.25);
        else if (p < 2.5) offset = vec3(0.55, 0.65, 0.75);
        else if (p < 3.5) offset = vec3(0.0, 0.55, 0.85);
        else if (p < 4.5) offset = vec3(0.15, 0.35, 0.55);
        else if (p < 5.5) offset = vec3(0.0, 0.2, 0.45);
        else if (p < 6.5) offset = vec3(0.45, 0.55, 0.65);
        else offset = vec3(0.0, 0.0, 0.0);

        vec3 base = 0.5 + 0.5 * cos(6.28318 * (offset + t + uHueShift));
        base = mix(vec3(0.55), base, uColorSpread);
        vec3 tint = vec3(uTintRed, uTintGreen, uTintBlue);
        return clamp(base * (tint / 0.55), 0.0, 2.5);
      }

      void main() {
        float n = aIndex;
        float t = uTime + aPhase;
        float orbitCount = max(uOrbitCount, 1.0);
        float orbit = mod(n, orbitCount) + 1.0;
        float layer = n / orbitCount;

        float r1 = uScale * (0.25 + 0.75 * (layer / 80.0));
        float r2 = r1 * (0.35 + 0.15 * orbit);
        float r3 = r2 * (0.5 + 0.08 * uComplexity);

        float a1 = t * (0.4 + orbit * 0.07) + layer * 0.12;
        float a2 = -t * (0.9 + orbit * 0.11) * uTwist + n * 0.03;
        float a3 = t * (1.3 + orbit * 0.05) + sin(t * 0.3 + layer) * uComplexity;

        vec2 pos;
        pos.x = r1 * cos(a1) + r2 * cos(a2) + r3 * cos(a3);
        pos.y = r1 * sin(a1) + r2 * sin(a2) + r3 * sin(a3);

        float pulse = 1.0 + uPulse * sin(t * 2.0 + n * 0.08);
        pos *= pulse;
        pos /= max(uZoom, 0.0001);

        vGlow = 0.35 + 0.65 * sin(t * 1.5 + orbit + layer * 0.05);
        vColor = palette(n * 0.004 + t * 0.05 + layer * 0.02);

        vec4 mvPosition = modelViewMatrix * vec4(pos, 0.0, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float size = uPointSize * (120.0 / -mvPosition.z) * (0.5 + vGlow * 0.5);
        gl_PointSize = min(size, 48.0);
      }
    `,
    fragment: /* glsl */ `
      uniform float uBrightness;
      uniform float uSaturation;
      uniform float uBloom;

      varying float vGlow;
      varying vec3 vColor;

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float core = smoothstep(0.5, 0.0, d);
        float halo = exp(-d * d * 8.0) * uBloom;

        vec3 col = vColor * (core + halo * 0.5);
        float gray = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(gray), col, uSaturation);
        col *= uBrightness * (0.35 + vGlow * 0.45);

        float alpha = min((core + halo * 0.35) * 0.55, 0.35);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  },

  kaleido: {
    label: 'Kaleidoscope',
    uniforms: { ...SHADER_UNIFORM_TEMPLATES.kaleido },
    vertex: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragment: /* glsl */ `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uScale;
      uniform float uComplexity;
      uniform float uBrightness;
      uniform float uSaturation;
      uniform float uBloom;
      uniform float uSegments;
      uniform float uRingCount;
      uniform float uWarp;
      uniform float uLineWidth;
      uniform float uCenterShape;
      uniform float uCenterSize;
      uniform float uCenterStrength;
      uniform float uShapeCount;
      uniform float uShape2;
      uniform float uShape3;
      uniform float uShape4;
      uniform float uShapeMorph;
      uniform vec2 uResolution;
      uniform float uAspect;

      vec3 palette(float t) {
        return 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + t * 1.2));
      }

      mat2 rot(float a) {
        float c = cos(a), s = sin(a);
        return mat2(c, -s, s, c);
      }

      vec2 kaleidoscope(vec2 p, float seg) {
        float angle = atan(p.y, p.x);
        float radius = length(p);
        float slice = 6.28318 / max(seg, 3.0);
        angle = mod(angle, slice);
        angle = abs(angle - slice * 0.5);
        return vec2(cos(angle), sin(angle)) * radius;
      }

      float sdCircle(vec2 p, float r) {
        return length(p) - r;
      }

      float sdBox(vec2 p, vec2 b) {
        vec2 q = abs(p) - b;
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
      }

      float sdEquilateralTriangle(vec2 p, float r) {
        const float k = 1.732050808;
        p.x = abs(p.x) - r;
        p.y = p.y + r / k;
        if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
        p.x -= clamp(p.x, -2.0 * r, 0.0);
        return -length(p) * sign(p.y);
      }

      float sdHexagon(vec2 p, float r) {
        const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
        p = abs(p);
        p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
        p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
        return length(p) * sign(p.y);
      }

      float sdStar(vec2 p, float r) {
        float an = 6.28318 / 5.0;
        float en = 6.28318 / 10.0;
        vec2 acs = vec2(cos(an), sin(an));
        vec2 ecs = vec2(cos(en), sin(en));
        float bn = mod(atan(p.y, p.x), 2.0 * an) - an;
        p = length(p) * vec2(cos(bn), abs(sin(bn)));
        p -= r * acs;
        p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / ecs.y);
        return length(p) * sign(p.x);
      }

      float shapeDistance(vec2 p, float shapeId, float size) {
        if (shapeId < 0.5) return 1e3;
        if (shapeId < 1.5) return sdCircle(p, size);
        if (shapeId < 2.5) return sdEquilateralTriangle(p, size * 1.15);
        if (shapeId < 3.5) return sdBox(p, vec2(size));
        if (shapeId < 4.5) return sdHexagon(p, size);
        if (shapeId < 5.5) return sdStar(p, size);
        if (shapeId < 6.5) return sdBox(rot(0.785398) * p, vec2(size * 0.85));
        vec2 q = abs(p);
        float bar = min(sdBox(q - vec2(size * 0.55, 0.0), vec2(size * 0.18, size * 0.85)),
                        sdBox(q - vec2(0.0, size * 0.55), vec2(size * 0.85, size * 0.18)));
        return bar;
      }

      float shapeField(vec2 cp, float shapeId, float size) {
        shapeId = floor(shapeId + 0.5);
        if (shapeId < 0.5) return 0.0;
        float d = shapeDistance(cp, shapeId, size);
        float lw = max(uLineWidth * 40.0, 0.008);
        float outline = lw / max(abs(d), 0.001);
        float fill = smoothstep(0.025, -0.02, d);
        return outline + fill * 1.8;
      }

      float shapeBySlot(float slot, float shapeA, float shapeB, float shapeC, float shapeD) {
        if (slot < 0.5) return shapeA;
        if (slot < 1.5) return shapeB;
        if (slot < 2.5) return shapeC;
        return shapeD;
      }

      float centerShapeField(vec2 uv, float t) {
        float count = clamp(floor(uShapeCount + 0.5), 1.0, 4.0);
        float size = uCenterSize * 0.55;
        vec2 cp = rot(t * 0.35 * max(uComplexity, 0.2)) * uv;

        float morph = uShapeMorph;
        float shapeA = floor(uCenterShape + 0.5);
        float shapeB = floor(uShape2 + 0.5);
        float shapeC = floor(uShape3 + 0.5);
        float shapeD = floor(uShape4 + 0.5);

        float field = 0.0;

        if (morph < 0.001) {
          field = shapeField(cp, shapeA, size);
        } else {
          float phase = fract(t * morph * 1.25) * count;
          float idx0 = floor(phase);
          float idx1 = mod(idx0 + 1.0, count);
          float blend = smoothstep(0.0, 1.0, fract(phase));
          float type0 = shapeBySlot(idx0, shapeA, shapeB, shapeC, shapeD);
          float type1 = shapeBySlot(idx1, shapeA, shapeB, shapeC, shapeD);
          field = mix(shapeField(cp, type0, size), shapeField(cp, type1, size), blend);
        }

        return field * uCenterStrength;
      }

      float pattern(vec2 p, float t, float anim) {
        float tp = t * anim;
        float detail = max(uComplexity, 0.15);
        float ringScale = max(uScale, 0.15);

        float rings = 0.0;
        for (float i = 0.0; i < 14.0; i++) {
          if (i >= uRingCount) break;
          float fi = i + 1.0;
          float r = fi * 0.12 * ringScale;
          float wobble = sin(tp * (0.7 + fi * 0.1) + fi * 1.7) * uWarp * 0.05;
          rings += uLineWidth / abs(length(p) - r - wobble);
        }

        float spokes = 0.0;
        float spokeCount = floor(clamp(detail * 3.5, 2.0, 12.0));
        for (float j = 0.0; j < 12.0; j++) {
          if (j >= spokeCount) break;
          float fj = j + 1.0;
          float ang = fj * (0.35 + 0.08 * detail) + tp * 0.45 * detail;
          vec2 dir = vec2(cos(ang), sin(ang));
          spokes += uLineWidth * 0.5 / abs(dot(p, dir));
        }

        float field = sin(p.x * (8.0 + detail * 14.0) + tp)
                    * sin(p.y * (8.0 + detail * 14.0) - tp * 0.7);
        return rings + spokes + field * (0.05 + detail * 0.06);
      }

      void main() {
        vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0);
        float viewZoom = 2.4 / max(uScale, 0.2);
        uv *= viewZoom;

        float t = uTime;
        float anim = 1.0 + uSpeed * 2.0;
        float detail = max(uComplexity, 0.15);

        float center = centerShapeField(uv, t * anim);

        vec2 p = kaleidoscope(uv, floor(uSegments + 0.5));
        p *= 1.0 + 0.1 * sin(t * anim + length(uv) * (3.0 + detail * 2.0)) * uWarp;

        float patternVal = pattern(p, t, anim);
        float raw = patternVal + center;
        float intensity = tanh(raw * 0.14);

        vec3 col = palette(intensity * 4.0 + t * anim * 0.12 + length(uv) * 0.35 + center * 0.1);
        col *= intensity * uBrightness * 2.2;
        col += col * uBloom * (0.5 + intensity);
        col += palette(center * 0.25 + t * anim * 0.06) * center * 0.2 * uBloom * uBrightness;

        float gray = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(gray), col, uSaturation);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },

  flow: {
    label: 'Flow Field',
    uniforms: { ...SHADER_UNIFORM_TEMPLATES.flow },
    vertex: /* glsl */ `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uScale;
      uniform float uComplexity;
      uniform float uFieldScale;
      uniform float uNoiseScale;
      uniform float uPointSize;
      uniform float uAspect;

      attribute vec3 aSeed;

      varying vec3 vColor;
      varying float vAlpha;

      vec3 palette(float t) {
        return 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + t));
      }

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      vec2 flow(vec2 p, float t) {
        float n1 = noise(p * uNoiseScale + t * 0.15);
        float n2 = noise(p * uNoiseScale * 1.7 - t * 0.12);
        float angle = (n1 + n2) * 6.28318 * uComplexity;
        return vec2(cos(angle), sin(angle));
      }

      void main() {
        float t = uTime;
        vec2 seed = aSeed.xy;
        float life = aSeed.z;

        vec2 pos = seed * uScale * uFieldScale;
        for (int i = 0; i < 8; i++) {
          vec2 dir = flow(pos, t + float(i) * 0.02 + life * 10.0);
          pos += dir * 0.018 * uScale;
        }

        pos *= 1.0 + 0.1 * sin(t * 0.5 + life * 20.0);

        vColor = palette(life * 3.0 + t * 0.06 + length(pos) * 0.2);
        vAlpha = 0.4 + 0.6 * sin(t * 2.0 + life * 40.0);

        vec4 mvPosition = modelViewMatrix * vec4(pos, 0.0, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = uPointSize * (180.0 / -mvPosition.z);
      }
    `,
    fragment: /* glsl */ `
      uniform float uBrightness;
      uniform float uSaturation;
      uniform float uBloom;

      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float alpha = exp(-d * d * 10.0) * vAlpha;
        if (alpha < 0.01) discard;

        vec3 col = vColor * uBrightness;
        float gray = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(gray), col, uSaturation);
        col += col * uBloom * exp(-d * 4.0);

        gl_FragColor = vec4(col, alpha);
      }
    `,
  },

  metaballs: {
    label: 'Metaballs',
    uniforms: { ...SHADER_UNIFORM_TEMPLATES.metaballs },
    vertex: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragment: /* glsl */ `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uScale;
      uniform float uComplexity;
      uniform float uBrightness;
      uniform float uSaturation;
      uniform float uBloom;
      uniform float uBallCount;
      uniform float uSoftness;
      uniform float uEdgeGlow;
      uniform float uZoom;
      uniform vec2 uResolution;
      uniform float uAspect;

      vec3 palette(float t) {
        return 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + t));
      }

      void main() {
        vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0) * 2.0 / uZoom;
        float t = uTime;

        float field = 0.0;
        for (float i = 0.0; i < 12.0; i++) {
          if (i >= uBallCount) break;
          float fi = i + 1.0;
          float angle = t * (0.3 + fi * 0.07 * uComplexity) + fi * 2.094;
          float radius = uScale * (0.25 + 0.12 * sin(t * 0.5 + fi));
          vec2 center = vec2(cos(angle), sin(angle)) * radius;
          center += vec2(sin(t * 0.8 + fi * 1.3), cos(t * 0.6 + fi)) * 0.15 * uComplexity;
          float d = length(uv - center);
          field += uSoftness / (d * d + 0.002);
        }

        float edge = smoothstep(0.95, 1.05, field);
        float glow = exp(-abs(field - 1.0) * 3.0) * uEdgeGlow;

        vec3 col = palette(field * 0.08 + t * 0.05 + length(uv));
        col *= edge * uBrightness + glow * uBloom;
        col = mix(col, vec3(1.0), glow * 0.15);

        float gray = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(gray), col, uSaturation);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },
};

export const SHADER_IDS = Object.keys(SHADERS);

export function getShaderChoices() {
  const choices = {};
  for (const id of SHADER_IDS) {
    const shader = SHADERS[id];
    const label = shader?.label ?? id.charAt(0).toUpperCase() + id.slice(1);
    choices[label] = id;
  }
  return choices;
}

export { GLOBAL_UNIFORMS };

export const COMMON_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uScale;
  uniform float uComplexity;
  uniform vec2 uResolution;
  uniform float uAspect;
`;

export const COMMON_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uScale;
  uniform float uComplexity;
  uniform float uBrightness;
  uniform float uSaturation;
  uniform float uBloom;
  uniform vec2 uResolution;
  uniform float uAspect;
`;
