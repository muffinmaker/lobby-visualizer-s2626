import { PALETTE_FN, PALETTE_UNIFORMS } from '../../paletteGlsl.js';

export default {
  id: 'ribbons',
  label: 'Ribbons',
  uniforms: {},
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
    uniform float uRibbonCount;
    uniform float uThickness;
    uniform float uTwistAmount;
    uniform float uWave;
    uniform float uGlow;
    uniform float uSpread;
    uniform float uAngle;
    uniform float uRibbonShape;
    uniform float uSpinPattern;
    uniform float uNoise;
    uniform float uZoom;
    uniform float uPanX;
    uniform float uPanY;
    uniform float uAspect;
    uniform float uPalette;
    ${PALETTE_UNIFORMS}
    ${PALETTE_FN}

    varying vec2 vUv;

    mat2 rot(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
    }

    float stroke(float d) {
      float line = uThickness / (abs(d) + 0.002);
      float glow = exp(-abs(d) * (18.0 + (1.0 - uGlow) * 16.0)) * (0.25 + uGlow * 0.55);
      return line + glow;
    }

    float ribbon(vec2 p, float phase, float t, float shapeId) {
      float wave = sin(p.x * 4.0 * uComplexity + t * 1.6 + phase * 3.0);
      wave += sin(p.x * 11.0 + t * 2.4 + phase) * uNoise * 0.65;
      float amp = (0.18 + uWave * 0.45) * max(uScale, 0.2);
      float shape = floor(shapeId + 0.5);
      if (shape < 0.5) {
        return stroke(p.y - wave * amp);
      }
      if (shape < 1.5) {
        float radius = 0.28 + 0.22 * sin(phase) + wave * amp * 0.35;
        return stroke(length(p) - radius);
      }
      if (shape < 2.5) {
        return stroke(abs(p.y) - abs(p.x) * (0.25 + uWave * 0.35) - wave * amp * 0.2);
      }
      if (shape < 3.5) {
        float a = stroke(p.y - wave * amp);
        float b = stroke(p.y - sin(p.x * 4.0 * uComplexity + t * 1.6 + phase * 3.0 + 1.7) * amp);
        return max(a, b);
      }
      float along = fract(p.x * (2.0 + uComplexity) + t * 0.35 + phase);
      float bead = length(vec2(along - 0.5, p.y - wave * amp * 0.45));
      return stroke(bead - (0.04 + uThickness));
    }

    void main() {
      vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0) * clamp(2.4 / max(uZoom, 0.04), 0.24, 32.5);
      uv -= vec2(uPanX, uPanY);
      float t = uTime;
      vec3 col = vec3(0.0);
      float count = max(uRibbonCount, 1.0);
      float spinMode = floor(uSpinPattern + 0.5);

      for (float i = 0.0; i < 10.0; i++) {
        if (i >= uRibbonCount) break;
        float fi = i + 1.0;
        float phase = fi * 1.618;
        float spin = t * (0.15 + uTwistAmount * 0.22);
        float ang = (fi - (count + 1.0) * 0.5) * uAngle;
        vec2 p = uv;
        float breathe = 1.0;
        if (spinMode < 0.5) {
          ang += spin + phase * 0.2;
        } else if (spinMode < 1.5) {
          ang += spin * (mod(fi, 2.0) < 0.5 ? 1.0 : -1.2);
        } else if (spinMode < 2.5) {
          ang += spin + length(uv) * (0.4 + uTwistAmount);
        } else if (spinMode < 3.5) {
          breathe = 0.72 + 0.38 * sin(t * (0.6 + uSpeed * 0.15) + phase);
          ang += spin * 0.35;
        } else {
          ang += spin;
          ang = abs(mod(ang + 3.14159, 6.28318) - 3.14159);
        }
        p = rot(ang) * p;
        p *= breathe;
        p.x += sin(t * 0.55 + fi) * 0.22 * (spinMode < 2.5 ? 1.0 : 0.35);
        p.y += (fi - (count + 1.0) * 0.5) * uSpread * 0.16;
        float r = ribbon(p, phase, t, uRibbonShape);
        col += namedPalette(colorLook(fi / 10.0, p, t * 0.2, fi * 0.17 + t * 0.16), uPalette) * r;
      }

      col *= uBrightness * 1.15;
      col += col * uBloom * 0.4;
      float gray = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(gray), col, uSaturation);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
