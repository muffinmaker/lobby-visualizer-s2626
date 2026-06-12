import { BACKGROUND_UNIFORMS, GLOBAL_UNIFORMS, SHADER_UNIFORM_TEMPLATES } from '../uniformSpecs.js';

export const SHADERS = {
  spocks: {
    label: 'Spirograph',
    uniforms: { ...SHADER_UNIFORM_TEMPLATES.spocks },
    vertex: /* glsl */ `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uScale;
      uniform float uComplexity;
      uniform float uPenCount;
      uniform float uGearRatio;
      uniform float uPenDistance;
      uniform float uWobble;
      uniform float uPenShape;
      uniform float uShapeVariety;
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
      varying float vShapeId;

      float hash1(float n) {
        return fract(sin(n) * 43758.5453);
      }

      vec3 palette(float t) {
        float p = floor(uPalette + 0.5);
        vec3 offset;
        if (p < 0.5) offset = vec3(0.0, 0.33, 0.67);
        else if (p < 1.5) offset = vec3(0.12, 0.42, 0.78);
        else if (p < 2.5) offset = vec3(0.55, 0.12, 0.72);
        else if (p < 3.5) offset = vec3(0.0, 0.62, 0.88);
        else if (p < 4.5) offset = vec3(0.82, 0.22, 0.08);
        else if (p < 5.5) offset = vec3(0.18, 0.72, 0.42);
        else if (p < 6.5) offset = vec3(0.68, 0.08, 0.55);
        else offset = vec3(0.05, 0.15, 0.35);

        vec3 base = 0.5 + 0.5 * cos(6.28318 * (offset + t + uHueShift));
        vec3 floorCol = vec3(0.32, 0.14, 0.42);
        base = mix(floorCol, base, uColorSpread);
        vec3 tint = vec3(uTintRed, uTintGreen, uTintBlue);
        return clamp(base * (tint / 0.58), 0.0, 2.2);
      }

      void main() {
        float pen = aIndex;
        float penCount = max(uPenCount, 1.0);
        if (pen >= penCount) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          gl_PointSize = 0.0;
          return;
        }

        float lane = (pen + 0.5) / penCount;
        float penSeed = pen * 12.9898 + aPhase * 78.233;
        float h1 = hash1(penSeed);
        float h2 = hash1(penSeed + 1.7);
        float h3 = hash1(penSeed + 3.1);
        float h4 = hash1(penSeed + 5.9);

        float t = uTime + aPhase * (0.55 + h1 * 1.4);
        float baseOmega = (0.7 + uSpeed * 0.42 + lane * 0.14) * (1.0 + uComplexity * 0.14);
        float penOmega = baseOmega * (0.55 + h1 * 1.1);
        float penOmega2 = baseOmega * (0.35 + h2 * 0.95) * (1.0 + uWobble * 0.6);
        float penOmega3 = baseOmega * (0.28 + h3 * 0.8) * (1.0 + uWobble * 0.45);
        float theta = t * penOmega;
        float theta2 = t * penOmega2 + h2 * 6.28318;
        float theta3 = t * -penOmega3 + h3 * 4.18879;

        float R = uScale * 2.04 * (0.38 + 0.62 * lane) * (0.82 + h1 * 0.36);
        float ratio = uGearRatio * (0.68 + lane * 0.26 + h2 * 0.18) + uComplexity * 0.05;
        ratio = clamp(ratio, 0.08, 0.94);
        float r = R * ratio * (0.78 + h3 * 0.44);
        float d = R * uPenDistance * (0.18 + 0.52 * lane) * (0.65 + h4 * 0.7);

        float k = ((R - r) / max(r, 0.001)) * (0.75 + h4 * 0.55);
        float wobble = 1.0 + uWobble * sin(t * (1.3 + h1 * 2.4) + pen * 2.1);

        vec2 pos = vec2(
          (R - r) * cos(theta) + d * cos(k * theta) * wobble,
          (R - r) * sin(theta) - d * sin(k * theta) * wobble
        );

        // Each pen gets its own epicycle drift so curves diverge over time.
        float driftAmp = R * (0.06 + uWobble * 0.14) * (0.45 + h2 * 0.85);
        pos += vec2(cos(theta2), sin(theta2)) * driftAmp * (0.55 + h3);
        pos += vec2(cos(theta3 * (1.1 + h4)), sin(theta3 * (0.9 + h1))) * driftAmp * 0.42;

        pos.x /= max(uAspect, 0.75);
        pos /= max(pow(uZoom, 0.42), 0.16);

        float dTheta = max(penOmega, 0.001);
        float c0 = cos(theta);
        float s0 = sin(theta);
        float ck = cos(k * theta);
        float sk = sin(k * theta);
        vec2 dPosDTheta = vec2(
          -(R - r) * s0 - d * k * sk * wobble,
          (R - r) * c0 - d * k * ck * wobble
        );
        vec2 vel = dPosDTheta * dTheta;
        vel += vec2(-sin(theta2), cos(theta2)) * driftAmp * (0.55 + h3) * penOmega2;
        vel += vec2(-sin(theta3 * (1.1 + h4)), cos(theta3 * (0.9 + h1)))
          * driftAmp * 0.42 * penOmega3 * vec2(1.1 + h4, 0.9 + h1);

        float radial = length(pos);
        float centerBias = smoothstep(0.55, 0.0, radial);
        float colorT = lane + t * uColorSpeed * 0.35 + pen * 0.11 + h1 * 0.35 + centerBias * 0.55;
        vColor = palette(colorT);
        vColor = mix(vColor, palette(colorT + 0.41 + h2 * 0.5), centerBias * 0.55);
        float gray = dot(vColor, vec3(0.299, 0.587, 0.114));
        vColor = mix(vec3(gray), vColor, 1.0 + centerBias * 0.35);

        vPenAngle = atan(vel.y, vel.x);
        vPenAspect = 0.42 + lane * 0.22 + h4 * 0.18;

        float baseShape = clamp(floor(uPenShape + 0.5), 1.0, 7.0);
        float altShape = floor(hash1(penSeed + 9.2) * 7.0) + 1.0;
        float variety = clamp(uShapeVariety, 0.0, 1.0);
        vShapeId = floor(mix(baseShape, altShape, variety) + 0.5);

        vec4 mvPosition = modelViewMatrix * vec4(pos, 0.0, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float size = uPointSize * (230.0 / -mvPosition.z) * (0.9 + lane * 0.2 + h1 * 0.15);
        gl_PointSize = clamp(size, 10.0, 120.0);
      }
    `,
    fragment: /* glsl */ `
      uniform float uBrightness;
      uniform float uSaturation;
      uniform float uBloom;

      varying vec3 vColor;
      varying float vPenAngle;
      varying float vPenAspect;
      varying float vShapeId;

      mat2 rot2(float a) {
        float c = cos(a), s = sin(a);
        return mat2(c, -s, s, c);
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
        if (shapeId < 2.5) return sdEquilateralTriangle(p, size * 1.12);
        if (shapeId < 3.5) return sdBox(p, vec2(size));
        if (shapeId < 4.5) return sdHexagon(p, size);
        if (shapeId < 5.5) return sdStar(p, size * 0.95);
        if (shapeId < 6.5) return sdBox(rot2(0.785398) * p, vec2(size * 0.82));
        vec2 q = abs(p);
        return min(
          sdBox(q - vec2(size * 0.52, 0.0), vec2(size * 0.16, size * 0.82)),
          sdBox(q - vec2(0.0, size * 0.52), vec2(size * 0.82, size * 0.16))
        );
      }

      float shapeOutline(vec2 uv, float shapeId, float size) {
        float d = shapeDistance(uv, floor(shapeId + 0.5), size);
        return 1.0 - smoothstep(0.0, 0.042, abs(d));
      }

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float c = cos(vPenAngle);
        float s = sin(vPenAngle);
        uv = mat2(c, -s, s, c) * uv;
        uv.x *= vPenAspect;

        float size = 0.34;
        float stamp = shapeOutline(uv, vShapeId, size);
        float d = shapeDistance(uv, vShapeId, size);
        float halo = exp(-d * d * 20.0) * uBloom * 0.22;

        vec3 col = vColor * stamp;
        float gray = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(gray), col, uSaturation);
        col *= uBrightness * (0.78 + stamp * 0.28);
        col += vColor * halo;

        float alpha = clamp(stamp * 0.95 + halo * 0.12, 0.0, 0.92);
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col, alpha);
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
