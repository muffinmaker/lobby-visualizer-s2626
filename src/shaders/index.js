import { BACKGROUND_UNIFORMS, GLOBAL_UNIFORMS, SHADER_UNIFORM_TEMPLATES } from '../uniformSpecs.js';

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
      uniform float uRed;
      uniform float uGreen;
      uniform float uBlue;
      uniform float uLineWidth;
      uniform float uIterations;
      uniform float uWidthRand;
      uniform float uHeightRand;
      uniform float uDepthPulse;
      uniform float uColorSpeed;
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

      vec3 neonPalette(float hue) {
        vec3 base = 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + hue * 1.65));
        return pow(clamp(base, 0.0, 1.0), vec3(0.82)) * 1.35;
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
        vec2 halfSize = vec2(w, h) * 0.5;

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
          vec3 layerCol = applyTint(neonPalette(hueT));

          accCol += layerCol * layerEdge;
          accW += layerEdge;
          edge = max(edge, layerEdge);
        }

        vec3 col = accW > 1e-5 ? (accCol / accW) * edge * uBrightness : vec3(0.0);

        if (uDepthPulse > 0.5) {
          float percent = cos(t * 0.5) * 0.5 + 0.5;
          col = mix(col, vec3(0.0), percent);
          edge *= 1.0 - percent;
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
      uniform float uAspect;
      uniform float uZoom;
      uniform float uPalette;
      uniform float uHueShift;
      uniform float uColorSpeed;
      uniform float uColorSpread;
      uniform float uTintRed;
      uniform float uTintGreen;
      uniform float uTintBlue;

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
        vec3 offset = vec3(0.0, 0.33, 0.67);
        float chroma = 1.65;
        float gain = 1.35;

        if (p < 0.5) {
          // Classic rainbow
        } else if (p < 1.5) {
          offset = vec3(0.05, 0.12, 0.22);
          chroma = 1.15;
        } else if (p < 2.5) {
          offset = vec3(0.52, 0.62, 0.72);
          chroma = 1.35;
        } else if (p < 3.5) {
          chroma = 2.1;
        } else if (p < 4.5) {
          offset = vec3(0.12, 0.28, 0.42);
          chroma = 0.95;
          gain = 1.12;
        } else if (p < 5.5) {
          offset = vec3(0.0, 0.18, 0.38);
          chroma = 1.25;
        } else if (p < 6.5) {
          offset = vec3(0.42, 0.54, 0.66);
          chroma = 1.4;
        } else if (p < 7.5) {
          vec3 vivid = neonPalette(hue, 1.65, vec3(0.0, 0.33, 0.67), 1.35);
          float mono = dot(vivid, vec3(0.299, 0.587, 0.114));
          return applyTint(mix(vec3(0.5), vec3(mono), uColorSpread));
        } else if (p < 8.5) {
          chroma = 2.45;
          hue *= 1.35;
        } else if (p < 9.5) {
          offset = vec3(0.35, 0.55, 0.75);
          chroma = 1.9;
          hue += sin(t * 0.55 + lane * 4.2) * 0.1;
        } else if (p < 10.5) {
          offset = vec3(0.0, 0.08, 0.18);
          chroma = 1.55;
        } else {
          chroma = 2.25;
          hue += sin(t * 0.42 + radial * 3.0) * 0.14;
        }

        vec3 col = neonPalette(hue, chroma, offset, gain);
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
        float radial = clamp(length(pos) / max(uScale * 0.45, 0.12), 0.0, 1.35);
        pos.x /= max(uAspect, 0.75);
        pos /= max(pow(uZoom, 0.65) * 0.25, 0.09);

        vec2 vel = vec2(
          -R * sin(a) * omega - r * sin(b) * (-k * twist),
          R * cos(a) * omega + r * cos(b) * (-k * twist)
        );
        vPenAngle = atan(vel.y, vel.x);
        vPenAspect = 0.55 + lane * 0.25;
        float laneHue = orbit / max(orbitCount - 1.0, 1.0);
        vColor = palette(laneHue, radial + sin(t * 0.65 + orbit * 0.35) * 0.12, t);

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
        float stamp = max(edge, fill * 0.92);
        float halo = exp(-d * d * 14.0) * uBloom * 0.72;

        vec3 col = vColor * stamp;
        float gray = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(gray), col, uSaturation);
        col *= uBrightness * (0.88 + stamp * 0.42);
        col += vColor * halo * 0.55;

        float alpha = clamp(stamp * 0.98 + halo * 0.48, 0.0, 1.0);
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
      uniform float uZoom;
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
        float viewZoom = 2.4 / max(uZoom, 0.2);
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
      uniform float uZoom;
      uniform float uPointSize;
      uniform float uParticleCount;
      uniform float uAspect;
      uniform float uLogoCollider;
      uniform float uLogoColliderBounce;
      uniform float uLogoColliderVisible;
      uniform vec2 uLogoColliderHalfExtents;
      uniform float uLogoColliderShape;

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

        vec2 pos = seed * uScale * uFieldScale;
        for (int i = 0; i < 8; i++) {
          vec2 dir = flow(pos, t + float(i) * 0.02 + life * 10.0);
          pos += dir * 0.018 * uScale;
        }

        pos *= 1.0 + 0.1 * sin(t * 0.5 + life * 20.0);
        pos.x /= aspect;
        float zoom = max(pow(uZoom, 0.55), 0.25);
        pos /= zoom;

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
      uniform float uTrailShape;
      uniform float uZoom;
      uniform float uPalette;
      uniform float uHueShift;
      uniform float uColorSpeed;
      uniform float uColorSpread;
      uniform float uTintRed;
      uniform float uTintGreen;
      uniform float uTintBlue;
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

      vec3 paletteBase(float t) {
        float p = floor(uPalette + 0.5);
        vec3 offset;
        if (p < 0.5) offset = vec3(0.55, 0.12, 0.72);
        else if (p < 1.5) offset = vec3(0.0, 0.42, 0.78);
        else if (p < 2.5) offset = vec3(0.12, 0.55, 0.82);
        else if (p < 3.5) offset = vec3(0.0, 0.33, 0.67);
        else if (p < 4.5) offset = vec3(0.82, 0.35, 0.08);
        else if (p < 5.5) offset = vec3(0.18, 0.62, 0.88);
        else if (p < 6.5) offset = vec3(0.68, 0.08, 0.55);
        else offset = vec3(0.05, 0.15, 0.35);
        vec3 base = 0.5 + 0.5 * cos(6.28318 * (offset + t));
        vec3 floorCol = vec3(0.06, 0.07, 0.12);
        return mix(floorCol, base, uColorSpread);
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
        float density = 0.34 + uRingWidth * 0.1;

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
        float ribWave = 0.5 + 0.5 * cos(ribs * (tdir.x * 3.05 + tdir.y * 1.85));
        float rib = smoothstep(0.52 - uRingWidth * 0.12, 0.98, ribWave);

        float flow = sin(depth * (4.5 + uComplexity * 1.8) + tdir.x * ribs * 0.35);
        flow = pow(flow * 0.5 + 0.5, 1.2 + uRingWidth * 0.35);

        float rings = (sin(depth * (2.8 + ribs * 0.15) - t * 0.4) * 0.5 + 0.5) * 0.1 * uRingWidth;

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
        col *= 0.2 + structure * 1.45 * wallShade;
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
