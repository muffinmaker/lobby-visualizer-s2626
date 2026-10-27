import { BACKGROUND_UNIFORMS, GLOBAL_UNIFORMS, SHADER_UNIFORM_TEMPLATES } from '../uniformSpecs.js';
import { PALETTE_FN, PALETTE_UNIFORMS } from '../paletteGlsl.js';

export const SHADERS = {
  spocks: {
    label: 'Spirograph',
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
      uniform float uBloom;
      uniform float uUp;
      uniform float uDown;
      uniform float uScaleY;
      uniform float uScaleZ;
      uniform float uWidth;
      uniform float uHeight;
      uniform float uStampShape;
      uniform float uPolygonSides;
      uniform float uRotate;
      uniform float uMyTime;
      uniform float uZoom;
      uniform float uPanX;
      uniform float uPanY;
      uniform float uRed;
      uniform float uGreen;
      uniform float uBlue;
      uniform float uLineWidth;
      uniform float uIterations;
      uniform float uWidthRand;
      uniform float uHeightRand;
      uniform float uDepthPulse;
      uniform float uColorSpeed;
      uniform float uObjectScale;
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

      float sdCircle(vec2 p, float r) {
        return length(p) - r;
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

      float sdPolygon(vec2 p, float r, float n) {
        float sides = max(n, 3.0);
        float an = 6.2831853 / sides;
        vec2 q = vec2(cos(an * 0.5), sin(an * 0.5));
        float bn = mod(atan(p.y, p.x), an) - an * 0.5;
        return cos(bn) * length(p) - q.x * r;
      }

      float shapeDistance(vec2 p, float shapeId, vec2 halfSize, float sides) {
        float r = max(min(halfSize.x, halfSize.y), 0.015);
        float rMax = max(max(halfSize.x, halfSize.y), 0.015);
        shapeId = floor(shapeId + 0.5);
        if (shapeId < 0.5) return sdBox(p, halfSize);
        if (shapeId < 1.5) return sdPolygon(p, r, sides);
        if (shapeId < 2.5) return sdCircle(p, r);
        if (shapeId < 3.5) return sdEquilateralTriangle(p, r * 1.15);
        if (shapeId < 4.5) return sdBox(p, vec2(r));
        if (shapeId < 5.5) return sdHexagon(p, r);
        if (shapeId < 6.5) return sdStar(p, r);
        if (shapeId < 7.5) return sdBox(rot(0.785398) * p, vec2(r * 0.85));
        vec2 q = abs(p);
        return min(
          sdBox(q - vec2(rMax * 0.55, 0.0), vec2(rMax * 0.18, rMax * 0.85)),
          sdBox(q - vec2(0.0, rMax * 0.55), vec2(rMax * 0.85, rMax * 0.18))
        );
      }

      float stampOutline(vec2 p, float shapeId, vec2 halfSize, float sides, float lw) {
        float d = abs(shapeDistance(p, shapeId, halfSize, sides));
        return 1.0 - smoothstep(lw * 0.35, lw * 0.35 + lw, d);
      }

      uniform float uPalette;
      ${PALETTE_UNIFORMS}
      ${PALETTE_FN}
      vec3 neonPalette(float hue) {
        return namedPalette(hue, uPalette);
      }

      vec3 applyTint(vec3 col) {
        vec3 tint = vec3(uRed, uGreen, uBlue);
        float tintAmt = max(tint.r, max(tint.g, tint.b));
        if (tintAmt < 0.01) return col;
        return col * mix(vec3(1.0), tint / tintAmt, 0.35);
      }

      void main() {
        float t = uTime;
        vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0) * uScale;
        uv -= vec2(uPanX, uPanY) * max(uScale, 0.2);
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
        vec2 sx = max(abs(vec2(uMyTime * uScaleZ, uMyTime * uScaleY)), vec2(1e-4));

        // ofRotateDeg(time * rotate) — rotate is in degrees per second per layer.
        float ang = radians(t * uRotate);
        vec2 offset = vec2(uUp, uDown) * uScale;
        vec2 halfSize = vec2(w, h) * 0.5 * max(uObjectScale, 0.05);

        float edge = 0.0;
        vec3 accCol = vec3(0.0);
        float accW = 0.0;
        float radial = clamp(length(uv) / max(uScale * 0.9, 0.15), 0.0, 1.35);
        float iterDenom = max(uIterations - 1.0, 1.0);

        for (float i = 0.0; i < 220.0; i++) {
          if (i >= uIterations) break;

          vec2 scalePow = vec2(pow(sx.x, i), pow(sx.y, i));
          vec2 local = uv / scalePow;
          local = rot(-i * ang) * local;
          local -= offset;

          float layerEdge = stampOutline(local, uStampShape, halfSize, uPolygonSides, lw);
          if (layerEdge < 0.001) continue;

          float layerDepth = i / iterDenom;
          float localRadial = clamp(length(local) * scalePow.x / max(uScale * 0.75, 0.15), 0.0, 1.35);
          float hueT = layerDepth * 1.45 + radial * 0.55 + localRadial * 0.35
            + t * uColorSpeed * 0.55;
          vec3 layerCol = applyTint(neonPalette(hueT + layerDepth * 0.8));

          accCol += layerCol * layerEdge;
          accW += layerEdge;
          edge = max(edge, layerEdge);
        }

        vec3 col = accW > 1e-5 ? (accCol / accW) * edge * uBrightness * 1.35 : vec3(0.0);
        col += accW > 1e-5 ? (accCol / accW) * edge * uBloom * 0.35 : vec3(0.0);

        if (uDepthPulse > 0.5) {
          float percent = cos(t * 0.7) * 0.5 + 0.5;
          col = mix(col, col * 0.25, percent * 0.65);
          edge *= 1.0 - percent * 0.45;
        }

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
      uniform float uScale;
      uniform float uComplexity;
      uniform float uOrbitCount;
      uniform float uTwist;
      uniform float uPulse;
      uniform float uPointSize;
      uniform float uPointRotation;
      uniform float uAspect;
      uniform float uZoom;
      uniform float uPanX;
      uniform float uPanY;
      uniform float uPalette;
      uniform float uHueShift;
      uniform float uColorSpeed;
      uniform float uColorSpread;
      uniform float uTintRed;
      uniform float uTintGreen;
      uniform float uTintBlue;
      uniform float uObjectScale;
      uniform float uGravity;
      uniform float uGravityAngle;
      ${PALETTE_UNIFORMS}
      ${PALETTE_FN}

      attribute float aIndex;
      attribute float aPhase;

      varying vec3 vColor;
      varying float vPenAngle;
      varying float vPenAspect;

      vec3 neonPalette(float hue, float chroma, vec3 offset, float gain) {
        vec3 base = 0.5 + 0.5 * cos(6.28318 * (offset + hue * chroma));
        return pow(clamp(base, 0.0, 1.0), vec3(0.82)) * gain;
      }

      vec3 applyTint(vec3 col) {
        vec3 tint = vec3(uTintRed, uTintGreen, uTintBlue);
        float tintAmt = max(tint.r, max(tint.g, tint.b));
        if (tintAmt < 0.01) return col;
        return col * mix(vec3(1.0), tint / tintAmt, 0.32);
      }

      vec3 palette(float lane, float radial, float t) {
        float p = floor(uPalette + 0.5);
        float hue = lane * 1.45 + radial * 0.65 + t * uColorSpeed * 0.55 + uHueShift;
        vec3 col = namedPalette(hue, uPalette);
        if (p > 6.5 && p < 7.5) return applyTint(col);
        col = mix(vec3(0.55), col, uColorSpread);
        return applyTint(col);
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

        float orbitScale = clamp(uPointSize, 0.2, 3.2);
        float complexity = clamp(uComplexity, -50.0, 20.0);
        float R = uScale * 0.5 * (0.45 + 0.55 * lane) * orbitScale;
        float r = R * max(0.04, 0.14 + 0.1 * lane + complexity * 0.004);
        float k = 1.15 + orbit * 0.28 + complexity * 0.035;
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
        vec2 gdir = vec2(cos(uGravityAngle), sin(uGravityAngle));
        float pull = uGravity * (0.72 + 0.28 * sin(t * 0.31 + orbit * 0.2));
        pos += gdir * pull * (0.85 + lane * 0.45);
        pos += gdir * uGravity * sin(a) * 0.22;
        float radial = clamp(length(pos) / max(uScale * 0.45, 0.12), 0.0, 1.35);
        pos.x /= max(uAspect, 0.75);
        pos /= max(pow(uZoom, 0.65) * 0.25, 0.09);
        pos -= vec2(uPanX, uPanY);

        vec2 vel = vec2(
          -R * sin(a) * omega - r * sin(b) * (-k * twist),
          R * cos(a) * omega + r * cos(b) * (-k * twist)
        );
        vPenAngle = atan(vel.y, vel.x) + uPointRotation;
        vPenAspect = 0.55 + lane * 0.25;
        float laneHue = orbit / max(orbitCount - 1.0, 1.0);
        vColor = palette(laneHue, radial + sin(t * 0.65 + orbit * 0.35) * 0.12, t);

        vec4 mvPosition = modelViewMatrix * vec4(pos, 0.0, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float size = 34.0 * (220.0 / -mvPosition.z) * (0.85 + lane * 0.15) / 55.0;
        gl_PointSize = clamp(size * max(uObjectScale, 0.05), 8.0, 90.0);
      }
    `,
    fragment: /* glsl */ `
      uniform float uBrightness;
      uniform float uSaturation;
      uniform float uBloom;
      uniform float uPointShape;
      uniform float uTransparency;

      varying vec3 vColor;
      varying float vPenAngle;
      varying float vPenAspect;

      float sdBox(vec2 p, vec2 b) {
        vec2 q = abs(p) - b;
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
      }

      float sdEquilateral(vec2 p, float r) {
        const float k = 1.7320508;
        p.x = abs(p.x) - r;
        p.y = p.y + r / k;
        if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
        p.x -= clamp(p.x, -2.0 * r, 0.0);
        return -length(p) * sign(p.y);
      }

      float sdHex(vec2 p, float r) {
        const vec3 k = vec3(-0.8660254, 0.5, 0.5773503);
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

      float shapeField(vec2 p, float shapeId) {
        float id = floor(shapeId + 0.5);
        float d;
        if (id < 0.5) d = length(p) - 0.32;
        else if (id < 1.5) d = sdBox(p, vec2(0.28));
        else if (id < 2.5) d = sdEquilateral(p, 0.34);
        else if (id < 3.5) d = sdBox(mat2(0.7071, -0.7071, 0.7071, 0.7071) * p, vec2(0.24));
        else if (id < 4.5) d = sdStar(p, 0.36);
        else if (id < 5.5) d = sdHex(p, 0.32);
        else if (id < 6.5) d = abs(length(p) - 0.24) - 0.07;
        else if (id < 7.5) d = min(sdBox(p, vec2(0.28, 0.08)), sdBox(p, vec2(0.08, 0.28)));
        else if (id < 8.5) d = max(sdBox(p - vec2(0.0, 0.06), vec2(0.26, 0.1)), -p.y);
        else d = length(p * vec2(1.15, 0.72)) - 0.28;
        return 1.0 - smoothstep(0.0, 0.035, d);
      }

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float c = cos(vPenAngle);
        float s = sin(vPenAngle);
        uv = mat2(c, -s, s, c) * uv;
        uv.x *= vPenAspect;

        float stamp = shapeField(uv, uPointShape);
        if (stamp < 0.02) discard;

        vec3 col = vColor;
        float gray = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(gray), col, uSaturation);
        float peak = max(max(col.r, col.g), col.b);
        if (peak > 0.92) col *= 0.92 / peak;
        col *= uBrightness * 1.15;
        col += vColor * stamp * uBloom * 0.35;

        float alpha = clamp(stamp * uTransparency, 0.0, 1.0);
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
      uniform float uLineSpacing;
      uniform float uSpacingMode;
      uniform float uWarp;
      uniform float uLineWidth;
      uniform float uMirrorAngle;
      uniform float uSymmetry;
      uniform float uCenterShape;
      uniform float uCenterSize;
      uniform float uCenterStrength;
      uniform float uShapeCount;
      uniform float uShape2;
      uniform float uShape3;
      uniform float uShape4;
      uniform float uShapeMorph;
      uniform float uZoom;
      uniform float uPanX;
      uniform float uPanY;
      uniform vec2 uResolution;
      uniform float uAspect;
      uniform float uObjectScale;
      uniform float uPalette;

      ${PALETTE_UNIFORMS}
      ${PALETTE_FN}
      vec3 palette(float t) {
        vec3 ink = namedPalette(0.02, uPalette);
        vec3 varied = namedPalette(t, uPalette);
        return mix(ink, varied, 0.72);
      }

      mat2 rot(float a) {
        float c = cos(a), s = sin(a);
        return mat2(c, -s, s, c);
      }

      vec2 kaleidoscope(vec2 p, float seg, float angleOffset, float symmetry) {
        if (symmetry > 2.5) {
          // Triangular mirror chamber, then a tighter wedge so the array reads as a toy kaleidoscope.
          p = rot(angleOffset) * p;
          float wedge = 3.14159265 / max(seg, 3.0);
          vec2 n = vec2(sin(wedge), cos(wedge));
          for (int k = 0; k < 6; k++) {
            p.x = abs(p.x);
            p -= n * min(dot(p, n), 0.0) * 2.0;
            p = rot(wedge * 2.0) * p;
          }
          p.x = abs(p.x);
          return p;
        }
        float angle = atan(p.y, p.x) + angleOffset;
        float radius = length(p);
        float slice = 6.28318 / max(seg, 3.0);
        angle = mod(angle, slice);
        if (symmetry > 0.5) angle = abs(angle - slice * 0.5);
        if (symmetry > 1.5) angle = abs(angle - slice * 0.25);
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
        float size = uCenterSize * 0.55 * max(uObjectScale, 0.05);
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
        float originFade = smoothstep(0.0, 0.02 + uLineWidth * 0.4, origin);
        float thick = max(uLineWidth * 18.0, 0.004);

        float rings = 0.0;
        float spacingMode = floor(uSpacingMode + 0.5);
        float gap = max(uLineSpacing, 0.01) * ringScale * 1.35;
        float ringTotal = max(uRingCount, 1.0);
        for (float i = 0.0; i < 14.0; i++) {
          if (i >= uRingCount) break;
          float fi = i + 1.0;
          float along = fi / ringTotal;
          float spread = fi;
          if (spacingMode < 0.5) {
            spread = fi;
          } else if (spacingMode < 1.5) {
            spread = (exp(along * 2.4) - 1.0) / (exp(2.4) - 1.0) * ringTotal;
          } else if (spacingMode < 2.5) {
            spread = log(1.0 + along * 9.0) / log(10.0) * ringTotal;
          } else if (spacingMode < 3.5) {
            spread = sqrt(along) * ringTotal;
          } else {
            spread = fi * (0.45 + 0.9 * (0.5 + 0.5 * sin(fi * 1.7 + tp * 0.6)));
          }
          float r = spread * gap;
          float wobble = sin(tp * (0.9 + fi * 0.15) + fi) * uWarp * 0.12;
          float ringDist = abs(length(p) - r - wobble);
          rings += thick / max(ringDist, 0.004);
          float bead = smoothstep(0.045, 0.0, length(p - vec2(cos(fi + tp), sin(fi * 1.3 - tp)) * r * 0.55));
          rings += bead * (1.4 + uWarp);
        }

        float ang = atan(p.y, p.x);
        float spokes = pow(abs(sin(ang * max(detail, 1.0) * 3.0 + tp * 0.8)), 10.0) * thick * 40.0;
        float petals = smoothstep(0.08, 0.0, abs(length(p) - 0.35 * ringScale - 0.08 * sin(ang * 5.0 + tp)));
        float lattice = sin(p.x * (10.0 + detail * 8.0) + tp) * sin(p.y * (10.0 + detail * 6.0) - tp * 0.8);
        lattice = pow(abs(lattice), 1.4);
        return (rings * 0.55 + spokes + petals * 2.2 + lattice * 1.6) * originFade;
      }

      void main() {
        vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0);
        uv -= vec2(uPanX, uPanY);
        float viewZoom = 2.4 / max(uZoom, 0.2);
        uv *= viewZoom;

        float t = uTime;
        float anim = 1.0 + uSpeed * 2.0;
        float detail = max(uComplexity, 0.15);

        float centerField = centerShapeField(uv, t * anim);
        float centerAmt = clamp(centerField / max(uCenterStrength, 0.35), 0.0, 1.0);

        vec2 p = kaleidoscope(uv, floor(uSegments + 0.5), uMirrorAngle, uSymmetry);
        p *= 1.0 + 0.22 * sin(t * anim * 0.7 + length(uv) * 4.0) * max(uWarp, 0.15);

        float patternVal = pattern(p, t, anim);
        float soft = patternVal * 0.45;
        float intensity = soft / (1.0 + abs(soft));

        float hue = atan(p.y, p.x) * 0.4 + length(p) * 1.6 + intensity * 1.4 + t * anim * 0.2;
        vec3 col = palette(hue);
        col *= (0.18 + intensity) * uBrightness * 2.4;

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
      uniform float uZoom;
      uniform float uPanX;
      uniform float uPanY;
      uniform float uPointSize;
      uniform float uSizeSpread;
      uniform float uFieldShape;
      uniform float uShapeSize;
      uniform float uMotion;
      uniform float uParticleCount;
      uniform float uAspect;
      uniform float uLogoCollider;
      uniform float uLogoColliderBounce;
      uniform float uLogoColliderVisible;
      uniform vec2 uLogoColliderHalfExtents;
      uniform float uLogoColliderShape;
      uniform float uObjectScale;
      uniform float uPalette;
      ${PALETTE_UNIFORMS}
      ${PALETTE_FN}

      attribute vec3 aSeed;

      varying vec3 vColor;
      varying float vAlpha;
      varying float vCover;

      vec3 palette(float t) {
        return namedPalette(t, uPalette);
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

      vec2 squareToDisk(vec2 p) {
        vec2 a = abs(p);
        float m = max(max(a.x, a.y), 1e-4);
        return p * (m / max(length(p), 1e-4));
      }

      vec2 toPolygon(vec2 p, float sides) {
        vec2 d = squareToDisk(p);
        float ang = atan(d.y, d.x);
        float sector = 6.2831853 / sides;
        float local = mod(ang + sector * 0.5, sector) - sector * 0.5;
        float edge = cos(3.14159265 / sides) / max(cos(local), 0.08);
        return d * edge;
      }

      float heartRadius(float a) {
        float s = -sin(a);
        float c = cos(a);
        return 0.25 * (2.0 - 2.0 * s + s * sqrt(abs(c)) / (s + 1.4));
      }

      vec2 fieldShape(vec2 seed, float shapeId) {
        float id = floor(shapeId + 0.5);
        if (id < 0.5) return seed;
        if (id < 1.5) return squareToDisk(seed);
        if (id < 2.5) return toPolygon(seed, 3.0);
        if (id < 3.5) return toPolygon(seed, 4.0);
        if (id < 4.5) return toPolygon(seed, 6.0);
        if (id < 5.5) {
          vec2 d = squareToDisk(seed);
          float ang = atan(d.y, d.x);
          float sector = 6.2831853 / 5.0;
          float spoke = abs(fract(ang / sector + 0.5) - 0.5) * 2.0;
          return d * mix(1.0, 0.42, spoke);
        }
        if (id < 6.5) {
          vec2 d = squareToDisk(seed);
          float r = mix(0.58, 1.0, length(d));
          return normalize(d + vec2(1e-4, 1e-4)) * r;
        }
        if (id < 7.5) {
          vec2 d = squareToDisk(seed);
          float a = atan(d.y, d.x);
          float hr = heartRadius(a) / max(heartRadius(1.5707963), 0.05);
          return normalize(d + vec2(1e-4, 1e-4)) * length(d) * hr;
        }
        vec2 a = abs(seed);
        vec2 c = seed;
        if (a.x > 0.38 && a.y > 0.38) {
          if (a.x < a.y) c.x = sign(seed.x) * 0.38 * (0.38 / max(a.x, 1e-4));
          else c.y = sign(seed.y) * 0.38 * (0.38 / max(a.y, 1e-4));
        }
        return c;
      }

      vec2 moveParticles(vec2 base, vec2 seed, float life, float t) {
        float motion = floor(uMotion + 0.5);
        float travel = t * (0.55 + uSpeed * 0.35) + life * 6.2831853;
        float amp = (0.28 + uComplexity * 0.22) * max(uShapeSize, 0.2);
        if (motion < 0.5) {
          vec2 pos = base;
          for (int i = 0; i < 8; i++) {
            vec2 dir = flow(pos, t + float(i) * 0.02 + life * 10.0);
            pos += dir * 0.018 * uScale;
          }
          pos *= 1.0 + 0.1 * sin(t * 0.5 + life * 20.0);
          return pos;
        }
        if (motion < 1.5) {
          return base + vec2(
            sin(travel + seed.y * 8.0),
            sin(travel * 0.73 + seed.x * 6.0)
          ) * amp;
        }
        if (motion < 2.5) {
          float s = fract(travel * 0.12 + life) * 2.0 - 1.0;
          return base * 0.35 + vec2(s, seed.y * 0.85) * length(base);
        }
        if (motion < 3.5) {
          float sx = abs(fract(travel * 0.12 + life) * 2.0 - 1.0) * 2.0 - 1.0;
          float sy = abs(fract(travel * 0.07 + seed.x) * 2.0 - 1.0) * 2.0 - 1.0;
          return base + vec2(sx, sy * 0.65) * amp;
        }
        if (motion < 4.5) {
          float phase = fract(travel * 0.1 + life);
          vec2 corner = vec2(step(0.5, fract(phase * 2.0)) * 2.0 - 1.0, step(0.5, phase) * 2.0 - 1.0);
          return base * 0.2 + corner * abs(base);
        }
        if (motion < 5.5) {
          float p = 0.28 + 0.72 * (0.5 + 0.5 * sin(travel));
          return base * p;
        }
        if (motion < 6.5) {
          float ang = travel + atan(base.y, base.x);
          return vec2(cos(ang), sin(ang)) * max(length(base), 0.04);
        }
        if (motion < 7.5) {
          float a = travel + life * 4.0;
          float b = travel * (1.35 + uComplexity * 0.45) + seed.x * 3.0;
          return vec2(sin(a), sin(b)) * max(length(base), 0.08);
        }
        float turns = travel * 1.5 + life * 6.2831853;
        float rad = fract(travel * 0.08 + life) * max(length(base), 0.08);
        return vec2(cos(turns), sin(turns)) * rad;
      }

      float heartField(vec2 p) {
        p *= 2.0;
        p.y += 0.25;
        float x = p.x;
        float y = p.y;
        return pow(x * x + y * y - 1.0, 3.0) - x * x * y * y * y;
      }

      float logoColliderDistance(vec2 p, float shape, vec2 halfExt) {
        halfExt = max(halfExt, vec2(0.02));
        vec2 pn = p / halfExt;

        if (shape < 0.5) {
          float k0 = length(pn);
          return (k0 - 1.0) * min(halfExt.x, halfExt.y);
        }

        if (shape < 1.5) {
          vec2 hp = pn * vec2(1.05, 0.95) + vec2(0.0, -0.08);
          float h = heartField(hp);
          float eps = 0.004;
          float hx1 = heartField(hp + vec2(eps, 0.0));
          float hx2 = heartField(hp - vec2(eps, 0.0));
          float hy1 = heartField(hp + vec2(0.0, eps));
          float hy2 = heartField(hp - vec2(0.0, eps));
          vec2 grad = vec2(hx1 - hx2, hy1 - hy2);
          float g = max(length(grad), 1e-4);
          return (h / g) * min(halfExt.x, halfExt.y) * 0.55;
        }

        vec2 tp = pn;
        tp.y = -tp.y;
        tp = abs(tp);
        float tri = max(tp.x * 0.866025 + tp.y * 0.5, -tp.y) - 0.58;
        return tri * min(halfExt.x, halfExt.y);
      }

      vec2 logoColliderNormal(vec2 p, float shape, vec2 halfExt) {
        float eps = 0.0035;
        float d0 = logoColliderDistance(p, shape, halfExt);
        float dx = logoColliderDistance(p + vec2(eps, 0.0), shape, halfExt) - d0;
        float dy = logoColliderDistance(p + vec2(0.0, eps), shape, halfExt) - d0;
        return normalize(vec2(dx, dy) + vec2(1e-5, 1e-5));
      }

      void main() {
        float t = uTime;
        vec2 seed = aSeed.xy;
        float life = aSeed.z;
        float aspect = max(uAspect, 0.75);

        vec2 base = fieldShape(seed, uFieldShape) * uScale * uFieldScale * uShapeSize;
        vec2 pos = moveParticles(base, seed, life, t);
        pos.x /= aspect;
        float zoom = max(pow(uZoom, 0.55), 0.25);
        pos /= zoom;
        pos -= vec2(uPanX, uPanY);

        float colliderActive = step(0.5, uLogoCollider) * step(0.5, uLogoColliderVisible);
        vec2 halfExt = max(uLogoColliderHalfExtents, vec2(0.02));
        float shape = floor(uLogoColliderShape + 0.5);

        if (colliderActive > 0.5) {
          vec2 screenPos = pos;
          float d = logoColliderDistance(screenPos, shape, halfExt);
          if (d < 0.0) {
            vec2 n = logoColliderNormal(screenPos, shape, halfExt);
            screenPos -= n * d;
            vec2 fieldPos = vec2(screenPos.x * aspect, screenPos.y) * zoom;
            vec2 dir = flow(fieldPos, t + life * 10.0);
            vec2 dirScreen = normalize(vec2(dir.x / aspect, dir.y) + vec2(1e-5, 1e-5));
            dirScreen = reflect(dirScreen, n);
            screenPos += dirScreen * 0.02 * (0.35 + uLogoColliderBounce * 0.65);
            pos = screenPos;
          }
        }

        float density = sqrt(3200.0 / max(uParticleCount, 800.0));
        vCover = clamp(density, 0.22, 1.35);

        vColor = palette(life * 3.0 + t * 0.06 + length(pos) * 0.2);
        vAlpha = (0.35 + 0.45 * sin(t * 2.0 + life * 40.0)) * vCover;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 0.0, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float sizeMix = mix(1.0, 0.22 + life * 1.9, clamp(uSizeSpread, 0.0, 1.0));
        float size = uPointSize * sizeMix * (140.0 / -mvPosition.z) * (0.55 + vCover * 0.25);
        gl_PointSize = clamp(size * max(uObjectScale, 0.05), 1.5, 480.0);
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
        col *= uBrightness * (0.85 + stamp * 0.55) * vCover;

        float halo = exp(-d * d * 6.0) * uBloom * 0.45 * vCover;
        col += vColor * halo;

        alpha = clamp(alpha * 0.95 + halo * 0.25, 0.0, 0.9);
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
      uniform float uPanX;
      uniform float uPanY;
      uniform vec2 uResolution;
      uniform float uAspect;
      uniform float uObjectScale;
      uniform float uPalette;
      ${PALETTE_UNIFORMS}
      ${PALETTE_FN}
      vec3 palette(float t) {
        return namedPalette(t, uPalette);
      }

      void main() {
        vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0) * 2.0 / uZoom;
        uv -= vec2(uPanX, uPanY);
        float t = uTime;

        float field = 0.0;
        for (float i = 0.0; i < 12.0; i++) {
          if (i >= uBallCount) break;
          float fi = i + 1.0;
          float angle = t * (0.55 + fi * 0.09 * uComplexity) + fi * 2.094;
          float radius = uScale * uObjectScale * (0.22 + 0.2 * sin(t * 0.9 + fi));
          vec2 center = vec2(cos(angle), sin(angle)) * radius;
          center += vec2(sin(t * 1.3 + fi * 1.3), cos(t * 1.1 + fi)) * 0.22 * uComplexity;
          float d = length(uv - center);
          field += uSoftness / (d * d + 0.002);
        }

        float edge = smoothstep(0.95, 1.05, field);
        float glow = exp(-abs(field - 1.0) * 3.0) * uEdgeGlow;

        vec3 col = palette(field * 0.22 + t * 0.18 + length(uv) * 0.8);
        col *= edge * uBrightness * 1.3 + glow * uBloom * 1.4;
        col += palette(field * 0.1 + 0.35) * glow * 0.45;

        float gray = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(gray), col, uSaturation);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },

  wormhole: {
    label: 'Wormhole',
    uniforms: { ...SHADER_UNIFORM_TEMPLATES.wormhole },
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
      uniform float uChevrons;
      uniform float uRingSize;
      uniform float uRingWidth;
      uniform float uTunnelDepth;
      uniform float uSwirl;
      uniform float uHorizonGlow;
      uniform float uChevronGlow;
      uniform float uLineThickness;
      uniform float uTrailShape;
      uniform float uZoom;
      uniform float uPanX;
      uniform float uPanY;
      uniform float uPalette;
      uniform float uHueShift;
      uniform float uColorSpeed;
      uniform float uColorSpread;
      uniform float uTintRed;
      uniform float uTintGreen;
      uniform float uTintBlue;
      uniform float uObjectScale;
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

      float fbm(vec2 p) {
        float v = 0.0;
        float amp = 0.55;
        for (int i = 0; i < 4; i++) {
          v += amp * noise(p);
          p = rot(0.55) * p * 2.05 + 1.7;
          amp *= 0.5;
        }
        return v;
      }

      ${PALETTE_UNIFORMS}
      ${PALETTE_FN}
      vec3 paletteBase(float t) {
        return namedPalette(t + uHueShift, uPalette);
      }

      vec3 palette(float t) {
        vec3 tint = vec3(uTintRed, uTintGreen, uTintBlue);
        return clamp(paletteBase(t) * (tint / 0.58), 0.0, 2.2);
      }

      float cellRand(vec2 id) {
        return hash(id * 17.3 + vec2(3.7, 9.1));
      }

      float sdCircle(vec2 p, float r) {
        return length(p) - r;
      }

      float sdBox(vec2 p, vec2 b) {
        vec2 q = abs(p) - b;
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
      }

      float sdTri(vec2 p, float r) {
        p.y += r * 0.32;
        return max(abs(p.x) * 0.866025 + p.y * 0.5, -p.y * 1.05) - r;
      }

      float sdHex(vec2 p, float r) {
        vec2 q = abs(p);
        return max(q.x * 0.866025 + q.y * 0.5, q.y) - r;
      }

      float sdDiamond(vec2 p, float r) {
        return sdBox(rot(0.785398) * p, vec2(r * 0.82));
      }

      float sdCross(vec2 p, float r) {
        p = abs(p);
        return min(sdBox(p, vec2(r * 0.18, r * 0.82)), sdBox(p, vec2(r * 0.82, r * 0.18)));
      }

      float sdStar(vec2 p, float r) {
        float a = atan(p.y, p.x);
        float s = r * (0.52 + 0.48 * cos(a * 5.0));
        return length(p) - s;
      }

      float softStamp(float d, float edge, float soft) {
        return smoothstep(edge, -soft, d);
      }

      float shapeStamp(vec2 p, float sid, float rnd) {
        p = rot(rnd * 6.28318) * p;
        float sz = 0.1 + rnd * 0.11;

        if (sid < 0.5) {
          float d = sdCircle(p, sz);
          d = min(d, sdCircle(p - vec2(sz * 0.55, 0.0), sz * 0.62));
          d = min(d, sdCircle(p + vec2(sz * 0.3, sz * 0.35), sz * 0.5));
          return softStamp(d, 0.1, 0.08);
        }
        if (sid < 1.5) {
          return softStamp(sdCircle(p, sz * 0.95), 0.05, 0.04);
        }
        if (sid < 2.5) {
          float d = sdCircle(p, sz * 0.35);
          d = min(d, sdTri(p, sz * 0.9));
          d = min(d, sdCircle(p + vec2(sz * 0.45, -sz * 0.2), sz * 0.22));
          return softStamp(d, 0.06, 0.04);
        }
        if (sid < 3.5) {
          return softStamp(sdTri(p, sz * 1.05), 0.05, 0.03);
        }
        if (sid < 4.5) {
          return softStamp(sdHex(p, sz * 0.88), 0.05, 0.03);
        }
        if (sid < 5.5) {
          float spiral = sin(atan(p.y, p.x) * 3.0 + length(p) * 14.0);
          float d = sdCircle(p, sz * 0.55 + spiral * sz * 0.08);
          d = min(d, sdCircle(p, sz * 0.2));
          return softStamp(d, 0.05, 0.035);
        }
        if (sid < 6.5) {
          vec2 q = floor(p / (sz * 0.42)) * (sz * 0.42);
          vec2 lp = p - q - sz * 0.21;
          return softStamp(sdBox(lp, vec2(sz * 0.2)), 0.02, 0.01);
        }
        if (sid < 7.5) {
          vec2 q = p;
          q.x += step(0.0, sin(p.y * 40.0 + rnd * 12.0)) * sz * 0.15;
          float d = sdBox(q, vec2(sz * 0.75, sz * 0.22));
          d = min(d, sdBox(rot(1.1) * q, vec2(sz * 0.35, sz * 0.12)));
          return softStamp(d, 0.03, 0.015);
        }
        if (sid < 8.5) {
          float d = min(sdBox(p, vec2(sz * 1.1, sz * 0.07)), sdBox(p, vec2(sz * 0.07, sz * 1.1)));
          d = min(d, sdCircle(p, sz * 0.16));
          return softStamp(d, 0.025, 0.012);
        }
        if (sid < 9.5) {
          return softStamp(sdDiamond(p, sz * 0.95), 0.04, 0.02);
        }
        if (sid < 10.5) {
          return softStamp(sdStar(p, sz * 0.92), 0.04, 0.025);
        }
        float smear = sdCircle(p, sz * 0.75);
        smear = min(smear, sdCircle(p - vec2(sz * 0.5, 0.0), sz * 0.45));
        return softStamp(smear, 0.12, 0.09);
      }

      float organicField(vec2 tdir, float z) {
        vec2 gv = vec2(tdir.x * 3.4 + tdir.y * 2.0, z * 0.38) * 1.35;
        vec2 id = floor(gv);
        vec2 f = fract(gv);
        float md = 1.0;
        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = vec2(cellRand(id + g), cellRand(id + g + 2.7));
            float d = length(g + o - f);
            md = min(md, d);
          }
        }
        float web = smoothstep(0.38, 0.06, md);
        float mist = pow(fbm(vec2(tdir.x * 2.2 + z * 0.15, z * 0.55)), 1.6);
        return max(web * 0.55, mist * 0.45);
      }

      float stampField(vec2 tdir, float z, float sid, float density) {
        vec2 gv = vec2(tdir.x * 4.0 + tdir.y * 2.5, z * density);
        float m = 0.0;
        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 id = floor(gv) + g;
            vec2 f = gv - id - 0.5;
            vec2 off = vec2(cellRand(id), cellRand(id + 3.3)) - 0.5;
            vec2 p = (f - off * 0.34) * 2.1;
            float rnd = cellRand(id + 9.9);
            m = max(m, shapeStamp(p, sid, rnd));
          }
        }
        return m;
      }

      float trailMask(vec2 tdir, float depth, float travel, float shapeId) {
        float sid = floor(shapeId + 0.5);
        float z = depth * 9.0 - travel * 1.5;
        float density = (0.34 + uRingWidth * 0.1) * max(uObjectScale, 0.05);

        if (sid < 0.5) {
          return organicField(tdir, z);
        }
        if (sid < 1.5) {
          float mist = fbm(vec2(tdir.x * 2.8 + z * 0.2, z * 0.62));
          mist += fbm(vec2(tdir.y * 3.2 - z * 0.18, z * 0.48)) * 0.65;
          return pow(mist, 1.35) * 0.85;
        }
        return stampField(tdir, z, sid, density);
      }

      void main() {
        vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0) * 2.0 / max(uZoom, 0.2);
        uv -= vec2(uPanX, uPanY);
        float t = uTime * (0.3 + uSpeed * 0.65);
        float travel = t * (0.55 + uTunnelDepth * 0.45);
        float wander = 0.16 + uHorizonGlow * 0.14 + uSwirl * 0.04;

        vec2 starPos = vec2(
          sin(t * 0.62) * wander + sin(t * 1.43 + 1.1) * wander * 0.5,
          cos(t * 0.53) * wander * 0.9 + cos(t * 1.17 + 0.6) * wander * 0.45
        );

        float roll = t * 0.22 + sin(t * 0.71) * 0.55 * uSwirl;
        float bend = sin(t * 0.41) * 0.22 * uSwirl + cos(t * 0.88) * 0.12 * uSwirl;

        vec2 rel = uv - starPos;
        rel = rot(roll) * rel;
        rel.x += rel.y * bend;
        rel.y += rel.y * rel.y * sin(t * 0.57) * 0.1 * uSwirl;

        float r = length(rel) + 0.001;
        vec2 dir = rel / r;
        float depth = travel - log(r + 0.06) * (0.85 + uRingSize * uScale * 0.55);

        float twistPhase = depth * uSwirl * 0.28 + t * uSwirl * 0.12;
        vec2 tdir = rot(twistPhase) * dir;
        float ribs = clamp(floor(uChevrons + 0.5), 4.0, 16.0);
        float stroke = max(uLineThickness, 0.05);
        float ribWave = 0.5 + 0.5 * cos(ribs * (tdir.x * 3.05 + tdir.y * 1.85));
        float rib = smoothstep(0.52 - uRingWidth * 0.12 * stroke, 0.98, ribWave);

        float flow = sin(depth * (4.5 + uComplexity * 1.8) + tdir.x * ribs * 0.35);
        flow = pow(flow * 0.5 + 0.5, 1.2 + uRingWidth * 0.35);

        float rings = (sin(depth * (2.8 + ribs * 0.15) - t * 0.4) * 0.5 + 0.5) * 0.1 * uRingWidth * stroke;

        vec2 np = vec2(tdir.x * (1.8 + uComplexity * 0.35), depth * (1.6 + uRingWidth * 0.4));
        float surface = fbm(np);
        float structure = mix(surface, rib, clamp(uChevronGlow * 0.6, 0.0, 1.0));
        structure = structure * flow + rings;

        float wallShade = 0.22 + smoothstep(0.03, 1.25, r) * 0.78;
        float distStar = length(uv - starPos);
        float centerGlow = exp(-distStar * (2.0 - uHorizonGlow * 0.32));
        float endLight = exp(-distStar * 10.0) * uHorizonGlow;

        float colorDrift = travel * 0.08 * (0.35 + uColorSpeed)
          + sin(t * (0.55 + uColorSpeed * 1.4) + tdir.x * 2.4 + tdir.y * 1.6) * 0.14 * uColorSpread;
        float colorPhase = depth * 0.24 + structure * 0.72 + r * 0.38 + colorDrift + uHueShift;

        vec3 col = palette(colorPhase);
        col *= 0.28 + structure * 1.85 * wallShade;
        col = mix(col, palette(colorPhase + 0.38 + rib * 0.15), rib * uChevronGlow * 0.62 * flow);

        vec3 starCol = palette(travel * 0.1 + uHueShift + sin(t * 0.48) * 0.1);
        col += starCol * centerGlow * uHorizonGlow * 0.72;
        col += starCol * 1.25 * endLight * 0.55;

        float streak = trailMask(tdir, depth, travel, uTrailShape);
        vec3 trailCol = palette(colorPhase + 0.22 + streak * 0.18);
        col += trailCol * streak * centerGlow * uBloom * 0.58;
        col += palette(colorPhase + 0.42) * pow(streak, 2.2) * centerGlow * uBloom * 0.28;

        float vignette = smoothstep(1.45, 0.25, r);
        col *= 0.32 + vignette * 0.68;

        float gray = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(gray), col, uSaturation);
        col *= uBrightness;
        col += palette(colorPhase + 0.5) * structure * uBloom * 0.14;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  },

  layers: {
    label: 'Ripple Layers',
    uniforms: { ...SHADER_UNIFORM_TEMPLATES.layers },
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
      uniform float uPatternA;
      uniform float uPatternB;
      uniform float uPatternC;
      uniform float uLayerCount;
      uniform float uMix;
      uniform float uLayerScale;
      uniform float uSpeedOffset;
      uniform float uZoom;
      uniform float uPanX;
      uniform float uPanY;
      uniform float uAspect;
      uniform float uObjectScale;
      uniform float uPalette;
      ${PALETTE_UNIFORMS}
      ${PALETTE_FN}

      varying vec2 vUv;

      float ripple(vec2 p, float t) {
        return sin(length(p) * 16.0 - t * 2.6);
      }

      float interference(vec2 p, float t) {
        vec2 a = p - vec2(0.32, 0.05);
        vec2 b = p + vec2(0.28, -0.08);
        return 0.5 * (sin(length(a) * 20.0 - t * 2.2) + sin(length(b) * 20.0 - t * 1.7));
      }

      float moire(vec2 p, float t) {
        return sin(p.x * 26.0 + t * 1.1) * sin(p.y * 24.0 - t * 0.9);
      }

      float spokes(vec2 p, float t) {
        float ang = atan(p.y, p.x);
        return sin(ang * 7.0 + t * 0.8) * sin(length(p) * 12.0 - t * 1.4);
      }

      float doubleSlit(vec2 p, float t) {
        float x = p.x * 22.0;
        float sinc = sin(x) / max(abs(x), 0.18);
        float envelope = sinc * sinc;
        float fringes = pow(cos(x * 1.65 + sin(t * 0.35) * 0.4), 2.0);
        float along = 0.55 + 0.45 * sin(p.y * 6.0 - t * 0.6);
        return envelope * fringes * along;
      }

      float singleSlit(vec2 p, float t) {
        float x = p.x * 14.0 + sin(t * 0.25) * 0.4;
        float sinc = sin(x) / max(abs(x), 0.16);
        return sinc * sinc * (0.6 + 0.4 * sin(p.y * 5.0 + t * 0.4));
      }

      float patternSignal(vec2 p, float t, float id) {
        float kind = floor(id + 0.5);
        if (kind < 0.5) return ripple(p, t);
        if (kind < 1.5) return doubleSlit(p, t) * 2.0 - 1.0;
        if (kind < 2.5) return singleSlit(p, t) * 2.0 - 1.0;
        if (kind < 3.5) return moire(p, t);
        if (kind < 4.5) return interference(p, t);
        return spokes(p, t);
      }

      void main() {
        vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0);
        uv -= vec2(uPanX, uPanY);
        uv *= (2.1 / max(uZoom, 0.2)) / max(uScale * max(uObjectScale, 0.2), 0.15);
        float t = uTime;
        float count = clamp(floor(uLayerCount + 0.5), 2.0, 6.0);
        vec3 acc = vec3(0.0);
        float weightSum = 0.0;
        for (float i = 0.0; i < 6.0; i++) {
          if (i >= count) break;
          float fi = i;
          float lt = t * (1.0 + (0.15 + uSpeedOffset) * fi);
          vec2 lp = uv * (1.0 + uLayerScale * fi);
          float slot = mod(fi, 3.0);
          float patternId = uPatternA;
          if (slot > 0.5 && slot < 1.5) patternId = uPatternB;
          else if (slot > 1.5) patternId = uPatternC;
          float sig = patternSignal(lp, lt, patternId);
          float band = smoothstep(0.05, 0.82, sig * 0.5 + 0.5);
          vec3 ink = namedPalette(fi * 0.37 + band * 0.9 + lt * 0.08 + uComplexity * 0.05, uPalette);
          float fade = mix(1.0, 1.0 / (fi + 1.0), clamp(uMix, 0.0, 1.0));
          acc += ink * (0.15 + band * 1.35) * fade;
          weightSum += fade;
        }
        vec3 col = acc / max(weightSum, 0.001);
        float gray = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(gray), col, uSaturation);
        col *= uBrightness;
        col += col * uBloom * 0.22;
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
