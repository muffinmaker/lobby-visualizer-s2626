import { BACKGROUND_UNIFORMS, GLOBAL_UNIFORMS, SHADER_UNIFORM_TEMPLATES } from '../uniformSpecs.js';

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

      float sdBox(vec2 p, vec2 halfSize) {
        vec2 q = abs(p) - halfSize;
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
      }

      // Ring around the square edge only (avoids interior cross artifacts).
      float rectOutline(vec2 p, vec2 halfSize, float lw) {
        float d = abs(sdBox(p, halfSize));
        return 1.0 - smoothstep(lw * 0.35, lw * 0.35 + lw, d);
      }

      void main() {
        float t = uTime;
        vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0) * uScale;
        uv *= exp(uZoom * 0.08);

        float minRes = min(uResolution.x, uResolution.y);
        float lw = max(uLineWidth / minRes, 0.0015);

        float w = uWidth;
        float h = uHeight;
        if (uWidthRand > 0.5) {
          w *= mix(0.55, 1.45, noise(vec2(t * 0.03, 17.0)));
        }
        if (uHeightRand > 0.5) {
          h *= mix(0.55, 1.45, noise(vec2(t * 0.03, 42.0)));
        }

        // Match J04: cumulative ofScale(mytime*z, mytime*y) per iteration.
        vec2 sx = vec2(uMyTime * uScaleZ, uMyTime * uScaleY);
        sx = vec2(
          abs(sx.x) < 1e-4 ? sign(sx.x) * 1e-4 : sx.x,
          abs(sx.y) < 1e-4 ? sign(sx.y) * 1e-4 : sx.y
        );

        // ofRotateDeg(time * rotate) — rotate is in degrees per second per layer.
        float ang = radians(t * uRotate);
        vec2 offset = vec2(uUp, uDown) * uScale;
        vec2 halfSize = vec2(w, h) * 0.5;

        float edge = 0.0;
        for (float i = 0.0; i < 120.0; i++) {
          if (i >= uIterations) break;

          vec2 scalePow = vec2(pow(sx.x, i), pow(sx.y, i));
          vec2 local = uv / scalePow;
          local = rot(-i * ang) * local;
          local -= offset;

          edge = max(edge, rectOutline(local, halfSize, lw));
        }

        float percent = cos(t * 0.5) * 0.5 + 0.5;
        vec3 light = vec3(uRed, uGreen, uBlue);
        vec3 dark = vec3(0.0);
        vec3 fg = mix(light, dark, percent);
        vec3 col = fg * edge * uBrightness;

        float gray = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(gray), col, uSaturation);

        gl_FragColor = vec4(col * edge, edge);
      }
    `,
  },

  spiro: {
    label: 'Spiro Flow',
    uniforms: { ...SHADER_UNIFORM_TEMPLATES.spiro },
    vertex: /* glsl */ `
      uniform float uTime;
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

      varying vec3 vColor;
      varying float vPenAngle;
      varying float vPenAspect;

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
        float orbit = aIndex;
        float orbitCount = max(uOrbitCount, 1.0);
        if (orbit >= orbitCount) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          gl_PointSize = 0.0;
          return;
        }

        float t = uTime + aPhase * 0.15;
        float lane = (orbit + 0.5) / orbitCount;

        float R = uScale * 0.5 * (0.45 + 0.55 * lane);
        float r = R * (0.14 + 0.1 * lane + uComplexity * 0.04);
        float k = 1.15 + orbit * 0.28 + uComplexity * 0.18;
        float twist = 1.0 + uTwist * 0.45;

        float omega = 1.35 + orbit * 0.12;
        float a = t * omega;
        float b = -t * k * twist + orbit * 1.5707963;

        vec2 pos = vec2(
          R * cos(a) + r * cos(b),
          R * sin(a) + r * sin(b)
        );

        float pulse = 1.0 + uPulse * 0.08 * sin(t * 1.4 + orbit);
        pos *= pulse;
        pos.x /= max(uAspect, 0.75);
        pos /= max(pow(uZoom, 0.65), 0.35);

        vec2 vel = vec2(
          -R * sin(a) * omega - r * sin(b) * (-k * twist),
          R * cos(a) * omega + r * cos(b) * (-k * twist)
        );
        vPenAngle = atan(vel.y, vel.x);
        vPenAspect = 0.55 + lane * 0.25;
        vColor = palette(orbit / max(orbitCount - 1.0, 1.0));

        vec4 mvPosition = modelViewMatrix * vec4(pos, 0.0, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float size = uPointSize * (220.0 / -mvPosition.z) * (0.85 + lane * 0.2);
        gl_PointSize = clamp(size, 12.0, 120.0);
      }
    `,
    fragment: /* glsl */ `
      uniform float uBrightness;
      uniform float uSaturation;
      uniform float uBloom;

      varying vec3 vColor;
      varying float vPenAngle;
      varying float vPenAspect;

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float c = cos(vPenAngle);
        float s = sin(vPenAngle);
        uv = mat2(c, -s, s, c) * uv;
        uv.x *= vPenAspect;

        vec2 halfSize = vec2(0.34, 0.2);
        vec2 q = abs(uv) - halfSize;
        float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
        float edge = 1.0 - smoothstep(0.0, 0.04, abs(d));
        float fill = 1.0 - smoothstep(0.0, 0.02, d);
        float stamp = max(edge, fill * 0.85);
        float halo = exp(-d * d * 18.0) * uBloom * 0.35;

        vec3 col = vColor * stamp;
        float gray = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(gray), col, uSaturation);
        col *= uBrightness * (0.75 + stamp * 0.35);
        col += col * halo;

        float alpha = clamp(stamp * 0.92 + halo * 0.2, 0.0, 0.95);
        if (alpha < 0.02) discard;
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
        float lw = max(uLineWidth * 35.0, 0.006);
        float outline = 1.0 - smoothstep(0.0, lw, abs(d));
        float fill = smoothstep(0.02, -0.025, d);
        return max(outline, fill * 0.85);
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
        float origin = length(p);
        float originFade = smoothstep(0.0, 0.04 + uLineWidth * 1.5, origin);

        float rings = 0.0;
        for (float i = 0.0; i < 14.0; i++) {
          if (i >= uRingCount) break;
          float fi = i + 1.0;
          float r = fi * 0.12 * ringScale;
          float wobble = sin(tp * (0.7 + fi * 0.1) + fi * 1.7) * uWarp * 0.05;
          float ringDist = max(abs(length(p) - r - wobble), 0.012);
          rings += uLineWidth / ringDist;
        }

        float spokes = 0.0;
        float spokeCount = floor(clamp(detail * 3.5, 2.0, 12.0));
        for (float j = 0.0; j < 12.0; j++) {
          if (j >= spokeCount) break;
          float fj = j + 1.0;
          float ang = fj * (0.35 + 0.08 * detail) + tp * 0.45 * detail;
          vec2 dir = vec2(cos(ang), sin(ang));
          float spokeDist = max(abs(dot(p, dir)), 0.01);
          spokes += uLineWidth * 0.5 / spokeDist;
        }

        float field = sin(p.x * (8.0 + detail * 14.0) + tp)
                    * sin(p.y * (8.0 + detail * 14.0) - tp * 0.7);
        return (rings + spokes) * originFade + field * (0.05 + detail * 0.06);
      }

      void main() {
        vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0);
        float viewZoom = 2.4 / max(uScale, 0.2);
        uv *= viewZoom;

        float t = uTime;
        float anim = 1.0 + uSpeed * 2.0;
        float detail = max(uComplexity, 0.15);

        float centerField = centerShapeField(uv, t * anim);
        float centerAmt = clamp(centerField / max(uCenterStrength, 0.35), 0.0, 1.0);

        vec2 p = kaleidoscope(uv, floor(uSegments + 0.5));
        p *= 1.0 + 0.1 * sin(t * anim + length(uv) * (3.0 + detail * 2.0)) * uWarp;

        float patternVal = pattern(p, t, anim);
        float intensity = tanh(patternVal * 0.14);

        float hue = intensity * 4.0 + t * anim * 0.12 + length(uv) * 0.35;
        vec3 col = palette(hue);
        col *= intensity * uBrightness * 2.2;

        float centerHue = t * anim * 0.18 + uCenterShape * 0.42 + centerAmt * 0.35;
        vec3 centerCol = palette(centerHue);
        centerCol = mix(centerCol, palette(centerHue + 0.55), smoothstep(0.15, 0.85, centerAmt));
        float centerBright = (0.42 + centerAmt * 0.58) * uBrightness;
        col = mix(col, centerCol * centerBright, centerAmt * 0.82);

        vec3 bloomTint = palette(hue + 0.2);
        col += bloomTint * uBloom * (0.22 + intensity * 0.28) * uBrightness * 0.35;
        col += palette(centerHue + 0.35) * centerAmt * uBloom * uBrightness * 0.16;

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
      uniform float uParticleCount;
      uniform float uAspect;

      attribute vec3 aSeed;

      varying vec3 vColor;
      varying float vAlpha;
      varying float vCover;

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
        pos.x /= max(uAspect, 0.75);

        float density = sqrt(3200.0 / max(uParticleCount, 800.0));
        vCover = clamp(density, 0.22, 1.35);

        vColor = palette(life * 3.0 + t * 0.06 + length(pos) * 0.2);
        vAlpha = (0.35 + 0.45 * sin(t * 2.0 + life * 40.0)) * vCover;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 0.0, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float size = uPointSize * (140.0 / -mvPosition.z) * (0.55 + vCover * 0.25);
        gl_PointSize = clamp(size, 1.5, 14.0);
      }
    `,
    fragment: /* glsl */ `
      uniform float uBrightness;
      uniform float uSaturation;
      uniform float uBloom;

      varying vec3 vColor;
      varying float vAlpha;
      varying float vCover;

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float stamp = exp(-d * d * 14.0);
        float alpha = stamp * vAlpha;
        if (alpha < 0.008) discard;

        vec3 col = vColor * stamp;
        float gray = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(gray), col, uSaturation);
        col *= uBrightness * (0.55 + stamp * 0.35) * vCover;

        float halo = exp(-d * d * 8.0) * uBloom * 0.18 * vCover;
        col += col * halo;

        alpha = clamp(alpha * 0.72, 0.0, 0.55);
        if (alpha < 0.01) discard;
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

export function getShaderLabel(shaderId) {
  if (!shaderId) return 'Shader';
  const shader = SHADERS[shaderId];
  return shader?.label ?? shaderId.charAt(0).toUpperCase() + shaderId.slice(1);
}

export function getShaderChoices() {
  const choices = {};
  for (const id of SHADER_IDS) {
    choices[getShaderLabel(id)] = id;
  }
  return choices;
}

export { BACKGROUND_UNIFORMS, GLOBAL_UNIFORMS };

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
